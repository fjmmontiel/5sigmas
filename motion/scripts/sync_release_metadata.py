#!/usr/bin/env python3
"""Synchronize Modelos Razonadores site duration metadata from v4 motion specs.

The motion specs are the single source of truth for duration. This script keeps
Spanish article frontmatter and English localized-media metadata aligned with
exact rendered duration. It intentionally does not publish media or mark any
Golden gate; it only removes hand-maintained duration drift.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "motion/content/modelos-razonadores"
EN_MEDIA = ROOT / "locales/en/media.yml"
DOCS = ROOT / "docs/series/modelos-razonadores"

ROWS = [
    ("00-presentacion", "00_presentacion_serie.md"),
    ("01-que-es-razonar", "01-que-es-razonar.md"),
    ("02-fallos", "02-fallos.md"),
    ("03-test-time-compute", "03-test-time-compute.md"),
    ("04-latencia-streaming", "04-latencia-streaming.md"),
    ("05-riesgos", "05-riesgos.md"),
]


def iso8601(seconds: float) -> str:
    total = round(seconds)
    if abs(seconds - total) > 1e-7:
        raise ValueError(f"site metadata currently requires whole-second duration, got {seconds}")
    minutes, secs = divmod(total, 60)
    if minutes:
        return f"PT{minutes}M{secs}S"
    return f"PT{secs}S"


def spec_duration(path: Path) -> float:
    spec = json.loads(path.read_text(encoding="utf-8"))
    if spec.get("version") != 4:
        raise ValueError(f"{path}: expected v4 spec")
    return sum(float(scene["duration"]) for scene in spec["scenes"])


def expected() -> dict[str, str]:
    result: dict[str, str] = {}
    for stem, doc in ROWS:
        es = spec_duration(CONTENT / f"{stem}.es.json")
        en = spec_duration(CONTENT / f"{stem}.en.json")
        if abs(es - en) > 1e-7:
            raise ValueError(f"{stem}: ES/EN duration drift ({es} vs {en}); timing must remain locale-deterministic")
        result[doc] = iso8601(es)
    return result


def sync_frontmatter(path: Path, duration: str) -> tuple[str, bool]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{path}: missing YAML frontmatter")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise ValueError(f"{path}: malformed YAML frontmatter")
    head, tail = text[:end], text[end:]
    pattern = re.compile(r'(?m)^video_duration:[ \t]*["\']?[^\n"\']+["\']?[ \t]*$')
    if not pattern.search(head):
        raise ValueError(f"{path}: video_duration missing")
    updated_head = pattern.sub(f'video_duration: "{duration}"', head, count=1)
    updated = updated_head + tail
    return updated, updated != text


def repair_block_separators(text: str) -> str:
    """Repair only the historical malformed joins produced by the first sync run.

    The bad pattern joined an ISO duration directly to the following top-level key,
    e.g. ``PT1M15Sseries/...``. Normal YAML never has a top-level key immediately
    after a duration scalar, so this normalization is narrow and deterministic.
    """
    return re.sub(
        r"(video_duration:[ \t]*PT(?:\d+M)?\d+S)(?=series/)",
        r"\1\n\n",
        text,
    )


def sync_en_media(text: str, doc: str, duration: str) -> tuple[str, bool]:
    key = f"series/modelos-razonadores/{doc}:"
    start = text.find(key)
    if start < 0:
        raise ValueError(f"locales/en/media.yml: missing {key}")
    next_block = re.search(r"(?m)^\S.*:[ \t]*$", text[start + len(key):])
    end = len(text) if not next_block else start + len(key) + next_block.start()
    block = text[start:end]
    pattern = re.compile(r"(?m)^  video_duration:[ \t]*\S+[ \t]*$")
    if not pattern.search(block):
        raise ValueError(f"locales/en/media.yml: video_duration missing in {key}")
    new_block = pattern.sub(f"  video_duration: {duration}", block, count=1)
    updated = text[:start] + new_block + text[end:]
    return updated, updated != text


def validate_reasoning_blocks(text: str) -> None:
    for _, doc in ROWS:
        key = f"series/modelos-razonadores/{doc}:"
        if not re.search(rf"(?m)^{re.escape(key)}$", text):
            raise ValueError(f"locales/en/media.yml: {key} is not a standalone top-level YAML key")
    if re.search(r"PT(?:\d+M)?\d+Sseries/", text):
        raise ValueError("locales/en/media.yml: malformed duration/key join remains")


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    args = parser.parse_args()

    durations = expected()
    changes: list[str] = []
    pending_docs: dict[Path, str] = {}

    for doc, duration in durations.items():
        path = DOCS / doc
        updated, changed = sync_frontmatter(path, duration)
        if changed:
            changes.append(str(path.relative_to(ROOT)))
            pending_docs[path] = updated

    media_text = EN_MEDIA.read_text(encoding="utf-8")
    updated_media = repair_block_separators(media_text)
    for doc, duration in durations.items():
        updated_media, _ = sync_en_media(updated_media, doc, duration)
    validate_reasoning_blocks(updated_media)
    if updated_media != media_text:
        changes.append(str(EN_MEDIA.relative_to(ROOT)))

    report = {
        "unit": "modelos-razonadores",
        "source_of_truth": "motion/content/modelos-razonadores/*.json",
        "durations": durations,
        "changes": changes,
        "status": "drift" if changes else "aligned",
    }

    if args.write:
        for path, updated in pending_docs.items():
            path.write_text(updated, encoding="utf-8")
        if updated_media != media_text:
            EN_MEDIA.write_text(updated_media, encoding="utf-8")
        report["status"] = "updated" if changes else "aligned"
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if changes:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
