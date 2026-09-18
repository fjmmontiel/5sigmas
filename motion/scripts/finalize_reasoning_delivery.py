#!/usr/bin/env python3
"""Stage and verify the Modelos Razonadores v4 release against real site consumers.

This is intentionally specific to the first complete migration unit. It converts
validated renderer packages into the canonical ES/EN media paths, wires captions,
removes the historical one-off English TTC injection, verifies built consumers,
and only then allows the machine ledger to become technically GOLDEN.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SERIES = "modelos-razonadores"
DOCS = ROOT / "docs" / "series" / SERIES
EN = ROOT / "locales" / "en" / "series" / SERIES
STATUS = ROOT / "motion" / "migration" / "modelos-razonadores-status.json"
MIGRATION = ROOT / "motion" / "migration" / "modelos-razonadores.json"
EN_MEDIA = ROOT / "locales" / "en" / "media.yml"
MKDOCS_EN = ROOT / "mkdocs.en.yml"

ROWS = [
    ("00_presentacion_serie", "00_presentacion_serie.md", "PT1M15S"),
    ("01-que-es-razonar", "01-que-es-razonar.md", "PT1M22S"),
    ("02-fallos", "02-fallos.md", "PT1M48S"),
    ("03-test-time-compute", "03-test-time-compute.md", "PT2M9S"),
    ("04-latencia-streaming", "04-latencia-streaming.md", "PT1M55S"),
    ("05-riesgos", "05-riesgos.md", "PT2M1S"),
]

LEGACY_TTC_STEPS = {
    "Restore reviewed English TTC media",
    "Seed reviewed English TTC media from verified PR artifact",
    "Verify and stage reviewed English TTC media",
    "Verify and stage reviewed English TTC media for browser QA",
    "Save reviewed English TTC media cache",
}


def install_artifact(src: Path, dst: Path) -> None:
    """Materialize a validated artifact without needlessly recopying huge MP4s."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        dst.unlink(missing_ok=True)
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def replace_or_add_frontmatter_field(path: Path, key: str, value: str, *, after: str = "video") -> None:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{path}: missing frontmatter")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise ValueError(f"{path}: malformed frontmatter")
    head, tail = text[:end], text[end:]
    pattern = re.compile(rf'(?m)^{re.escape(key)}:[ \t]*.*$')
    line = f'{key}: "{value}"'
    if pattern.search(head):
        head = pattern.sub(line, head, count=1)
    else:
        anchor = re.compile(rf'(?m)^({re.escape(after)}:[ \t]*.*)$')
        if not anchor.search(head):
            raise ValueError(f"{path}: missing {after} anchor")
        head = anchor.sub(rf'\1\n{line}', head, count=1)
    path.write_text(head + tail, encoding="utf-8")


def update_en_media_caption(text: str, doc: str, caption: str) -> str:
    key = f"series/{SERIES}/{doc}:"
    start = text.find(key)
    if start < 0:
        raise ValueError(f"{EN_MEDIA}: missing {key}")
    next_block = re.search(r"(?m)^\S.*:[ \t]*$", text[start + len(key):])
    end = len(text) if not next_block else start + len(key) + next_block.start()
    block = text[start:end]
    expected_duration = dict((d, dur) for _, d, dur in ROWS)[doc]
    if f"  video_duration: {expected_duration}" not in block:
        raise ValueError(f"{key}: duration is not synchronized to {expected_duration}")
    line = f"  video_captions: {caption}"
    pattern = re.compile(r"(?m)^  video_captions:[ \t]*.*$")
    if pattern.search(block):
        block = pattern.sub(line, block, count=1)
    else:
        poster = re.compile(r"(?m)^(  video_poster:[ \t]*.*)$")
        if not poster.search(block):
            raise ValueError(f"{key}: missing video_poster")
        block = poster.sub(rf"\1\n{line}", block, count=1)
    return text[:start] + block + text[end:]


def remove_reasoning_override() -> None:
    text = MKDOCS_EN.read_text(encoding="utf-8")
    pattern = re.compile(
        r"(?ms)^  locale_video_pages:\s*\n"
        r"    series/modelos-razonadores/03-test-time-compute\.md:\s*\n"
        r"(?:      .*\n)+?(?=^  [A-Za-z_][A-Za-z0-9_-]*:)",
    )
    updated, count = pattern.subn("", text, count=1)
    if count == 0 and "series/modelos-razonadores/03-test-time-compute.md:" in text:
        raise ValueError("mkdocs.en.yml still contains an unrecognized reasoning locale_video_pages override")
    MKDOCS_EN.write_text(updated, encoding="utf-8")


def remove_named_steps(path: Path) -> None:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    out: list[str] = []
    i = 0
    while i < len(lines):
        match = re.match(r"^      - name: (.*?)\s*$", lines[i].rstrip("\n"))
        if match and match.group(1) in LEGACY_TTC_STEPS:
            i += 1
            while i < len(lines) and not re.match(r"^      - (?:name:|uses:)", lines[i]):
                i += 1
            while out and not out[-1].strip():
                out.pop()
            out.append("\n")
            continue
        out.append(lines[i])
        i += 1
    path.write_text("".join(out), encoding="utf-8")


def stage(artifacts: Path) -> None:
    for locale, destination in (("es", DOCS), ("en", EN)):
        source = artifacts / locale
        if not source.is_dir():
            raise FileNotFoundError(f"missing artifact locale directory: {source}")
        destination.mkdir(parents=True, exist_ok=True)
        for stem, doc, _ in ROWS:
            for ext in (".mp4", ".jpg", ".vtt"):
                src = source / f"{stem}{ext}"
                if not src.is_file() or src.stat().st_size == 0:
                    raise FileNotFoundError(f"missing final {locale} artifact: {src}")
                install_artifact(src, destination / src.name)
            if locale == "es":
                replace_or_add_frontmatter_field(destination / doc, "video_poster", f"{stem}.jpg")
                replace_or_add_frontmatter_field(destination / doc, "video_captions", f"{stem}.vtt", after="video_poster")

    media = EN_MEDIA.read_text(encoding="utf-8")
    for stem, doc, _ in ROWS:
        media = update_en_media_caption(media, doc, f"{stem}.vtt")
    EN_MEDIA.write_text(media, encoding="utf-8")

    remove_reasoning_override()

    for workflow in (
        ROOT / ".github" / "workflows" / "deploy-pages.yml",
        ROOT / ".github" / "workflows" / "pr-visual-review.yml",
    ):
        remove_named_steps(workflow)

    migration = json.loads(MIGRATION.read_text(encoding="utf-8"))
    migration.pop("localizedMediaTargets", None)
    notes = [
        note for note in migration.get("notes", [])
        if "deployment-injected localized media" not in note
    ]
    migration["notes"] = notes + [
        "All twelve ES/EN v4 motion specs are authored and final horizontal media is staged through the normal ES/EN locale trees.",
        "English reasoning media no longer uses a one-off TTC artifact injection; locales/en/media.yml is the explicit metadata authority for all six videos.",
        "Technical GOLDEN remains machine-gated until delivery integration passes for every ES/EN consumer surface.",
    ]
    MIGRATION.write_text(json.dumps(migration, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _assert_contains(path: Path, tokens: list[str]) -> None:
    if not path.is_file():
        raise FileNotFoundError(path)
    text = path.read_text(encoding="utf-8", errors="replace")
    missing = [token for token in tokens if token not in text]
    if missing:
        raise ValueError(f"{path}: missing {missing}")


def verify(artifacts: Path) -> None:
    for locale, source_root, built_root in (
        ("es", DOCS, ROOT / "site" / "series" / SERIES),
        ("en", EN, ROOT / "site" / "en" / "series" / SERIES),
    ):
        for stem, doc, duration in ROWS:
            for ext in (".mp4", ".jpg", ".vtt"):
                expected = artifacts / locale / f"{stem}{ext}"
                source = source_root / f"{stem}{ext}"
                built = built_root / f"{stem}{ext}"
                if expected.read_bytes() != source.read_bytes():
                    raise ValueError(f"{locale}:{stem}{ext}: canonical source differs from validated render")
                if expected.read_bytes() != built.read_bytes():
                    raise ValueError(f"{locale}:{stem}{ext}: built media differs from validated render")

            article = built_root / stem / "index.html"
            if stem == "00_presentacion_serie":
                article = built_root / "00_presentacion_serie" / "index.html"
            _assert_contains(article, [f"{stem}.mp4", f"{stem}.jpg", f"{stem}.vtt"])

            watch_prefix = ROOT / "site" / ("videos" if locale == "es" else "en/videos") / "series" / SERIES / stem
            _assert_contains(watch_prefix / "index.html", [f"{stem}.mp4", f"{stem}.jpg", duration])

    mkdocs_text = MKDOCS_EN.read_text(encoding="utf-8")
    if "locale_video_pages:" in mkdocs_text and "series/modelos-razonadores/03-test-time-compute.md:" in mkdocs_text:
        raise ValueError("stale English TTC config override remains")
    for path in (
        ROOT / ".github" / "workflows" / "deploy-pages.yml",
        ROOT / ".github" / "workflows" / "pr-visual-review.yml",
    ):
        workflow = path.read_text(encoding="utf-8")
        if ".localized-media/en/ttc-v1" in workflow or "english-ttc-reviewed-seed" in workflow:
            raise ValueError(f"{path}: stale TTC one-off media injection remains")


def mark_golden(run_id: str, sha: str, main_sha: str | None = None) -> None:
    status = json.loads(STATUS.read_text(encoding="utf-8"))
    for row in status["outputs"].values():
        row["delivery"] = True
        all_gates = all(bool(row[gate]) for gate in status["requiredGates"])
        row["technical_golden"] = all_gates
        row["golden"] = all_gates
    delivery_evidence: dict[str, Any] = {
        "workflow_run": int(run_id) if str(run_id).isdigit() else run_id,
        "head_sha_before_delivery_commit": sha,
        "scope": "12 localized outputs with canonical ES/EN media, captions, article embeds, watch pages, catalog/schema/sitemaps and strict ES/EN builds",
        "result": "delivery integration passed; legacy English TTC one-off injection removed",
    }
    if main_sha:
        delivery_evidence["validated_main_sha"] = main_sha
        delivery_evidence["freshness"] = "current main was merged before rendering and remained unchanged through delivery validation"
    status.setdefault("evidence", {})["delivery"] = delivery_evidence
    if not all(row["technical_golden"] for row in status["outputs"].values()):
        blocked = [key for key, row in status["outputs"].items() if not row["technical_golden"]]
        raise ValueError(f"cannot mark unit golden; outputs still blocked: {blocked}")
    status["review"]["user_review_status"] = "awaiting_release_package"
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    migration = json.loads(MIGRATION.read_text(encoding="utf-8"))
    migration["status"] = "golden"
    if main_sha:
        migration["validatedMainSha"] = main_sha
    MIGRATION.write_text(json.dumps(migration, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    stage_parser = sub.add_parser("stage")
    stage_parser.add_argument("--artifacts", type=Path, required=True)
    verify_parser = sub.add_parser("verify")
    verify_parser.add_argument("--artifacts", type=Path, required=True)
    golden_parser = sub.add_parser("mark-golden")
    golden_parser.add_argument("--run-id", required=True)
    golden_parser.add_argument("--sha", required=True)
    golden_parser.add_argument("--main-sha")
    args = parser.parse_args()

    if args.command == "stage":
        stage(args.artifacts.resolve())
    elif args.command == "verify":
        verify(args.artifacts.resolve())
    else:
        mark_golden(args.run_id, args.sha, args.main_sha)


if __name__ == "__main__":
    main()
