#!/usr/bin/env python3
"""Current-owner MEDIA_VISUAL gate for Security 02-04.

This gate deliberately separates visual-video quality from Francisco's deferred
owner-local narration. It reuses the raw media validator primitives to inspect
metadata, local assets and ffprobe facts, then classifies narration-dependent
findings with owner amendment #305 comment 5716685049.

Audio streams, captions and transcripts remain visible as VOICE_ENHANCEMENT
technical debt but cannot fail MEDIA_VISUAL_PASS. Posters, native video binary,
codec/dimensions/pixel format/duration, titles/summaries and curated chapters /
key moments remain current blockers.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml

from classify_requalification_media import classify
from validate_security_video_media import (
    ROOT,
    Target,
    _asset_path,
    _string,
    ffprobe,
    frontmatter,
    validate_metadata,
    validate_probe,
)

ARTICLES = ("02-jailbreaks.md", "03-envenenamiento.md", "04-red-teaming.md")


def load_targets(root: Path) -> list[Target]:
    es_root = root / "docs/series/seguridad-ia"
    en_root = root / "locales/en/series/seguridad-ia"
    en_media = yaml.safe_load((root / "locales/en/media.yml").read_text(encoding="utf-8")) or {}
    if not isinstance(en_media, dict):
        raise ValueError("locales/en/media.yml must be a mapping")

    targets: list[Target] = []
    for name in ARTICLES:
        es_source = es_root / name
        targets.append(
            Target(
                locale="es",
                route=f"series/seguridad-ia/{name}",
                source=es_source,
                asset_root=es_root,
                meta=frontmatter(es_source),
            )
        )
        key = f"series/seguridad-ia/{name}"
        en_meta = en_media.get(key) or {}
        if not isinstance(en_meta, dict):
            raise ValueError(f"English media entry invalid: {key}")
        targets.append(
            Target(
                locale="en",
                route=key,
                source=en_root / name,
                asset_root=en_root,
                meta=dict(en_meta),
            )
        )
    return targets


def inspect_target(root: Path, target: Target) -> dict[str, Any]:
    metadata_failures, metadata_summary = validate_metadata(target)
    probe_failures: list[dict[str, str]] = []
    probe_summary: dict[str, Any] | None = None
    video_name = _string(target.meta, "video")
    if video_name:
        video_path = _asset_path(target.asset_root, video_name)
        if video_path.is_file() and video_path.stat().st_size > 0:
            label = video_path.relative_to(root).as_posix()
            try:
                probe = ffprobe(video_path)
            except RuntimeError as exc:
                probe_failures.append({"code": "VIDEO_FFPROBE_FAILED", "detail": str(exc)})
            else:
                probe_failures, probe_summary = validate_probe(
                    probe,
                    declared_duration=_string(target.meta, "video_duration"),
                    path_label=label,
                )
    raw = metadata_failures + probe_failures
    classified = classify(raw)
    return {
        "locale": target.locale,
        "route": target.route,
        "metadata": metadata_summary,
        "probe": probe_summary,
        "media_visual_blockers": classified["media_visual_blockers"],
        "voice_enhancement_debt": classified["voice_enhancement_debt"],
    }


def self_test() -> None:
    fixture = [
        {"code": "VIDEO_AUDIO_STREAM_MISSING", "detail": "voice"},
        {"code": "VIDEO_CAPTIONS_MISSING", "detail": "voice"},
        {"code": "VIDEO_TRANSCRIPT_MISSING", "detail": "voice"},
        {"code": "VIDEO_CHAPTERS_MISSING", "detail": "visual"},
        {"code": "VIDEO_POSTER_MISSING", "detail": "visual"},
        {"code": "VIDEO_SUMMARY_MISSING", "detail": "visual"},
        {"code": "VIDEO_CODEC_INVALID", "detail": "visual"},
    ]
    result = classify(fixture)
    deferred = {item["code"] for item in result["voice_enhancement_debt"]}
    blocking = {item["code"] for item in result["media_visual_blockers"]}
    assert deferred == {
        "VIDEO_AUDIO_STREAM_MISSING",
        "VIDEO_CAPTIONS_MISSING",
        "VIDEO_TRANSCRIPT_MISSING",
    }
    assert {
        "VIDEO_CHAPTERS_MISSING",
        "VIDEO_POSTER_MISSING",
        "VIDEO_SUMMARY_MISSING",
        "VIDEO_CODEC_INVALID",
    }.issubset(blocking)
    print("PASS Security02-04 MEDIA_VISUAL/VOICE split mutation fixture")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("artifacts/security-requalification/security-02-04-media-visual.json"),
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    root = args.root.resolve()
    output = args.output if args.output.is_absolute() else root / args.output
    try:
        results = [inspect_target(root, target) for target in load_targets(root)]
    except (OSError, ValueError, yaml.YAMLError) as exc:
        print(f"SECURITY_02_04_MEDIA_CONFIG_ERROR: {exc}", file=sys.stderr)
        return 2

    visual = [item for result in results for item in result["media_visual_blockers"]]
    voice = [item for result in results for item in result["voice_enhancement_debt"]]
    report = {
        "schema_version": 1,
        "owner_amendment_comment": 5716685049,
        "scope": "security-02-04",
        "MEDIA_VISUAL_PASS": not visual,
        "VOICE_ENHANCEMENT": "DEFERRED_OWNER_LOCAL" if voice else "READY",
        "media_visual_blockers": visual,
        "voice_enhancement_debt": voice,
        "results": results,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if visual else 0


if __name__ == "__main__":
    raise SystemExit(main())
