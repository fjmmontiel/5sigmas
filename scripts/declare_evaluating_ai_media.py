#!/usr/bin/env python3
"""Declare generated Evaluating AI Systems visual media without touching VOICE debt."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
SERIES = "evaluating-ai-systems-production"
GENERATOR = ROOT / "scripts/generate_evaluating_ai_visual_media.py"
MANIFEST = ROOT / "locales/en/manifest.yml"
EN_MEDIA = ROOT / "locales/en/media.yml"

spec = importlib.util.spec_from_file_location("evaluating_ai_media_generator", GENERATOR)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load evaluating AI media generator")
gen = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = gen
spec.loader.exec_module(gen)


def quoted(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def expected(chapter, locale: str) -> dict:
    slug = Path(chapter.filename).stem
    title = chapter.title_es if locale == "es" else chapter.title_en
    summary = chapter.summary_es if locale == "es" else chapter.summary_en
    moments = chapter.moments_es if locale == "es" else chapter.moments_en
    return {
        "video": f"{slug}.mp4",
        "video_poster": f"{slug}.jpg",
        "video_title": title,
        "video_summary": summary,
        "video_duration": "PT36S",
        "video_chapters": [
            {"name": moments[0], "start": 0, "end": 12},
            {"name": moments[1], "start": 12, "end": 24},
            {"name": moments[2], "start": 24, "end": 36},
        ],
    }


def media_block(chapter, locale: str, indent: str = "") -> str:
    contract = expected(chapter, locale)
    chapters = contract["video_chapters"]
    return (
        f"{indent}video: {contract['video']}\n"
        f"{indent}video_poster: {contract['video_poster']}\n"
        f"{indent}video_title: {quoted(contract['video_title'])}\n"
        f"{indent}video_summary: {quoted(contract['video_summary'])}\n"
        f"{indent}video_duration: PT36S\n"
        f"{indent}video_chapters:\n"
        f"{indent}  - name: {quoted(chapters[0]['name'])}\n{indent}    start: 0\n{indent}    end: 12\n"
        f"{indent}  - name: {quoted(chapters[1]['name'])}\n{indent}    start: 12\n{indent}    end: 24\n"
        f"{indent}  - name: {quoted(chapters[2]['name'])}\n{indent}    start: 24\n{indent}    end: 36\n"
    )


def update_es_frontmatter(chapter) -> bool:
    path = ROOT / "docs" / "series" / SERIES / chapter.filename
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---\n"):
        raise RuntimeError(f"missing frontmatter: {path}")
    end = raw.find("\n---\n", 4)
    if end < 0:
        raise RuntimeError(f"unterminated frontmatter: {path}")
    front_raw = raw[4:end]
    front = yaml.safe_load(front_raw) or {}
    exp = expected(chapter, "es")
    existing = {key: front.get(key) for key in exp if key in front}
    if existing:
        if existing != exp:
            raise RuntimeError(f"refusing to overwrite non-matching ES media declaration in {path}: {existing!r}")
        return False
    marker = "# GOLDEN visual media; VOICE_ENHANCEMENT remains DEFERRED_OWNER_LOCAL\n"
    new_front = front_raw.rstrip() + "\n" + marker + media_block(chapter, "es").rstrip() + "\n"
    path.write_text("---\n" + new_front + "---\n" + raw[end + 5 :], encoding="utf-8")
    return True


def update_en_media() -> int:
    raw = EN_MEDIA.read_text(encoding="utf-8")
    data = yaml.safe_load(raw) or {}
    additions: list[str] = []
    for chapter in gen.CHAPTERS:
        route = f"series/{SERIES}/{chapter.filename}"
        exp = expected(chapter, "en")
        if route in data:
            current = data[route]
            if any(current.get(key) != value for key, value in exp.items()):
                raise RuntimeError(f"refusing to overwrite non-matching EN media declaration for {route}")
            continue
        additions.append(route + ":\n" + media_block(chapter, "en", indent="  ").rstrip())
    if additions:
        EN_MEDIA.write_text(raw.rstrip() + "\n\n" + "\n\n".join(additions) + "\n", encoding="utf-8")
    return len(additions)


def update_manifest() -> int:
    raw = MANIFEST.read_text(encoding="utf-8")
    data = yaml.safe_load(raw) or {}
    published = data.get("published_files")
    if not isinstance(published, list):
        raise RuntimeError("locales/en/manifest.yml published_files must be a list")
    required = [
        f"series/{SERIES}/{Path(chapter.filename).stem}.{ext}"
        for chapter in gen.CHAPTERS
        for ext in ("mp4", "jpg")
    ]
    missing = [entry for entry in required if entry not in published]
    if not missing:
        return 0
    lines = raw.splitlines()
    start = next((i for i, line in enumerate(lines) if line.strip() == "published_files:"), None)
    if start is None:
        raise RuntimeError("published_files section missing from EN manifest")
    end = start + 1
    while end < len(lines):
        line = lines[end]
        if line and not line.startswith((" ", "\t")):
            break
        end += 1
    lines[end:end] = [f"  - {entry}" for entry in missing]
    MANIFEST.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(missing)


def main() -> int:
    es_changed = sum(1 for chapter in gen.CHAPTERS if update_es_frontmatter(chapter))
    en_changed = update_en_media()
    manifest_added = update_manifest()
    print(
        json.dumps(
            {
                "PASS": True,
                "series": SERIES,
                "es_frontmatter_changed": es_changed,
                "en_media_blocks_added": en_changed,
                "en_manifest_files_added": manifest_added,
                "voice_enhancement": "DEFERRED_OWNER_LOCAL",
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
