#!/usr/bin/env python3
"""Publish complete English reasoning media and paired ES/EN accessibility assets.

The v4 renderer already emits a validated Markdown transcript together with each WebVTT
file. Delivery must preserve that pair: publishing captions without the corresponding
transcript violates the site accessibility contract. This script runs after renderer
artifacts are staged, promotes the validated transcripts into the canonical locale trees,
wires their metadata, and keeps the English published-file manifest complete.
"""
from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "locales" / "en" / "manifest.yml"
EN_MEDIA = ROOT / "locales" / "en" / "media.yml"
DOCS_ROOT = ROOT / "docs" / "series" / "modelos-razonadores"
EN_ROOT = ROOT / "locales" / "en" / "series" / "modelos-razonadores"
REVIEW_ROOT = ROOT / ".delivery-artifacts" / "review"
SERIES = "series/modelos-razonadores"
ROWS = (
    ("00_presentacion_serie", "00_presentacion_serie.md"),
    ("01-que-es-razonar", "01-que-es-razonar.md"),
    ("02-fallos", "02-fallos.md"),
    ("03-test-time-compute", "03-test-time-compute.md"),
    ("04-latencia-streaming", "04-latencia-streaming.md"),
    ("05-riesgos", "05-riesgos.md"),
)
STEMS = tuple(stem for stem, _ in ROWS)


def _replace_or_add_frontmatter_field(
    path: Path,
    key: str,
    value: str,
    *,
    after: str,
) -> None:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise SystemExit(f"{path}: missing frontmatter")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise SystemExit(f"{path}: malformed frontmatter")
    head, tail = text[:end], text[end:]
    pattern = re.compile(rf'(?m)^{re.escape(key)}:[ \t]*.*$')
    line = f'{key}: "{value}"'
    if pattern.search(head):
        head = pattern.sub(line, head, count=1)
    else:
        anchor = re.compile(rf'(?m)^({re.escape(after)}:[ \t]*.*)$')
        if not anchor.search(head):
            raise SystemExit(f"{path}: missing {after} anchor")
        head = anchor.sub(rf'\1\n{line}', head, count=1)
    path.write_text(head + tail, encoding="utf-8")


def _update_en_media_transcript(text: str, doc: str, transcript: str) -> str:
    key = f"{SERIES}/{doc}:"
    start = text.find(key)
    if start < 0:
        raise SystemExit(f"{EN_MEDIA}: missing {key}")
    next_block = re.search(r"(?m)^\S.*:[ \t]*$", text[start + len(key):])
    end = len(text) if not next_block else start + len(key) + next_block.start()
    block = text[start:end]
    if "  video_captions:" not in block:
        raise SystemExit(f"{key}: transcript cannot be declared without captions")
    line = f"  video_transcript: {transcript}"
    pattern = re.compile(r"(?m)^  video_transcript:[ \t]*.*$")
    if pattern.search(block):
        block = pattern.sub(line, block, count=1)
    else:
        captions = re.compile(r"(?m)^(  video_captions:[ \t]*.*)$")
        block = captions.sub(rf"\1\n{line}", block, count=1)
    return text[:start] + block + text[end:]


def _validated_transcript(locale: str, stem: str) -> Path:
    review_dir = REVIEW_ROOT / locale / stem
    matches = sorted(review_dir.glob("*-horizontal-transcript.md"))
    if len(matches) != 1:
        raise SystemExit(
            f"{locale}:{stem}: expected exactly one validated horizontal transcript in "
            f"{review_dir}, found {len(matches)}"
        )
    transcript = matches[0]
    if transcript.stat().st_size == 0:
        raise SystemExit(f"{locale}:{stem}: validated transcript is empty")
    return transcript


def _stage_transcript_pairs() -> None:
    en_media = EN_MEDIA.read_text(encoding="utf-8")
    for locale, destination in (("es", DOCS_ROOT), ("en", EN_ROOT)):
        destination.mkdir(parents=True, exist_ok=True)
        for stem, doc in ROWS:
            source = _validated_transcript(locale, stem)
            transcript_name = f"{stem}-transcript.md"
            target = destination / transcript_name
            shutil.copy2(source, target)
            if locale == "es":
                _replace_or_add_frontmatter_field(
                    destination / doc,
                    "video_transcript",
                    transcript_name,
                    after="video_captions",
                )
            else:
                en_media = _update_en_media_transcript(en_media, doc, transcript_name)
    EN_MEDIA.write_text(en_media, encoding="utf-8")
    print("Staged paired ES/EN reasoning transcripts for 12 localized outputs")


def _update_english_manifest() -> None:
    text = MANIFEST.read_text(encoding="utf-8")
    marker = "published_files:\n"
    start = text.find(marker)
    if start < 0:
        raise SystemExit("English locale manifest has no published_files section")
    body_start = start + len(marker)
    next_key = re.search(r"(?m)^[A-Za-z_][A-Za-z0-9_-]*:\s*(?:\n|$)", text[body_start:])
    end = len(text) if not next_key else body_start + next_key.start()
    body = text[body_start:end]

    required = [
        f"{SERIES}/{stem}{ext}"
        for stem in STEMS
        for ext in (".mp4", ".jpg", ".vtt")
    ] + [f"{SERIES}/{stem}-transcript.md" for stem in STEMS]
    existing = set(re.findall(r"(?m)^  -\s+(.+?)\s*$", body))
    missing = [item for item in required if item not in existing]
    if missing:
        if body and not body.endswith("\n"):
            body += "\n"
        body += "".join(f"  - {item}\n" for item in missing)
        text = text[:body_start] + body + text[end:]
        MANIFEST.write_text(text, encoding="utf-8")

    final = MANIFEST.read_text(encoding="utf-8")
    absent = [item for item in required if f"  - {item}" not in final]
    if absent:
        raise SystemExit(f"English reasoning media still absent from manifest: {absent}")
    print(f"English reasoning release manifest complete: {len(required)}/{len(required)} files")


def main() -> None:
    _stage_transcript_pairs()
    _update_english_manifest()


if __name__ == "__main__":
    main()
