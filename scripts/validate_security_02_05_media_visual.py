#!/usr/bin/env python3
"""Current-owner MEDIA_VISUAL gate for Security 02-05.

Owner amendment #305 comment 5716685049 decouples Francisco's future
owner-local narration from the current GOLDEN gate. Audio streams, captions and
transcripts remain visible as VOICE_ENHANCEMENT debt but cannot fail this gate.
Native video presence, poster, codec/dimensions/pixel format/duration,
locale-specific metadata and curated non-voice chapters/key moments remain
current MEDIA_VISUAL blockers.

The gate also captures deterministic visual samples from the exact MP4 bytes.
Those frames are evidence for manual pixel/content review and chapter curation;
they never auto-certify PIXEL_REVIEW or PEDAGOGY_REVIEW.
"""
from __future__ import annotations

import argparse
import json
import subprocess
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

ARTICLES = (
    "02-jailbreaks.md",
    "03-envenenamiento.md",
    "04-red-teaming.md",
    "05-controles-produccion.md",
)


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


def sample_timestamps(duration: float) -> list[float]:
    """Six stable samples spanning the exact video without inventing chapters."""
    if duration <= 0:
        raise ValueError("video duration must be positive")
    fractions = (0.0, 0.2, 0.4, 0.6, 0.8, 0.98)
    return [round(min(duration - 0.05, max(0.0, duration * fraction)), 3) for fraction in fractions]


def capture_visual_samples(
    video_path: Path,
    *,
    duration: float,
    output_dir: Path,
) -> list[dict[str, Any]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    samples: list[dict[str, Any]] = []
    for index, timestamp in enumerate(sample_timestamps(duration)):
        output = output_dir / f"frame-{index:02d}-{timestamp:07.3f}s.jpg"
        result = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                f"{timestamp:.3f}",
                "-i",
                str(video_path),
                "-frames:v",
                "1",
                "-vf",
                "scale=960:-2",
                "-q:v",
                "4",
                "-y",
                str(output),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode or not output.is_file() or output.stat().st_size <= 0:
            detail = result.stderr.strip() or result.stdout.strip() or "frame not produced"
            raise RuntimeError(
                f"ffmpeg visual sample failed for {video_path} at {timestamp:.3f}s: {detail}"
            )
        samples.append(
            {
                "timestamp_seconds": timestamp,
                "path": output.as_posix(),
                "bytes": output.stat().st_size,
            }
        )
    return samples


def inspect_target(root: Path, target: Target, *, samples_root: Path) -> dict[str, Any]:
    metadata_failures, metadata_summary = validate_metadata(target)
    probe_failures: list[dict[str, str]] = []
    probe_summary: dict[str, Any] | None = None
    visual_samples: list[dict[str, Any]] = []
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
                actual_duration = float(probe_summary.get("actual_duration_seconds") or 0)
                if actual_duration > 0:
                    slug = Path(target.route).stem
                    visual_samples = capture_visual_samples(
                        video_path,
                        duration=actual_duration,
                        output_dir=samples_root / target.locale / slug,
                    )
    raw = metadata_failures + probe_failures
    classified = classify(raw)
    return {
        "locale": target.locale,
        "route": target.route,
        "metadata": metadata_summary,
        "probe": probe_summary,
        "visual_samples": visual_samples,
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
    assert len(ARTICLES) == 4 and ARTICLES[-1] == "05-controles-produccion.md"
    assert sample_timestamps(60.0) == [0.0, 12.0, 24.0, 36.0, 48.0, 58.8]
    assert sample_timestamps(48.0) == [0.0, 9.6, 19.2, 28.8, 38.4, 47.04]
    print("PASS Security02-05 MEDIA_VISUAL/VOICE split + visual sampling fixture")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("artifacts/security-requalification/security-02-05-media-visual.json"),
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    root = args.root.resolve()
    output = args.output if args.output.is_absolute() else root / args.output
    samples_root = output.parent / "security-02-05-video-frames"
    try:
        results = [
            inspect_target(root, target, samples_root=samples_root)
            for target in load_targets(root)
        ]
    except (OSError, RuntimeError, ValueError, yaml.YAMLError) as exc:
        print(f"SECURITY_02_05_MEDIA_CONFIG_ERROR: {exc}", file=sys.stderr)
        return 2

    visual = [item for result in results for item in result["media_visual_blockers"]]
    voice = [item for result in results for item in result["voice_enhancement_debt"]]
    report = {
        "schema_version": 2,
        "owner_amendment_comment": 5716685049,
        "scope": "security-02-05",
        "MEDIA_VISUAL_PASS": not visual,
        "VOICE_ENHANCEMENT": "DEFERRED_OWNER_LOCAL" if voice else "READY",
        "PIXEL_REVIEW": "MANUAL_REVIEW_REQUIRED",
        "visual_sample_policy": "six deterministic frames per exact native MP4; evidence only, never automatic certification",
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
