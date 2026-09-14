#!/usr/bin/env python3
"""Fail-closed binary/media validation for Security 00/01 requalification.

This gate is intentionally narrower than the global source/media audit. It uses
ffprobe against the four native ES/EN Security presentation/Prompt Injection
videos and reconciles binary facts with their declared duration metadata.

It NEVER creates narration, captions, transcripts, or key moments. A silent
video is a hard media failure under the 2026-09-13 requalification contract.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
ISO_DURATION = re.compile(
    r"^PT(?:(?P<h>\d+)H)?(?:(?P<m>\d+)M)?(?:(?P<s>\d+(?:\.\d+)?)S)?$"
)
DURATION_TOLERANCE_SECONDS = 1.0


@dataclass(frozen=True)
class Target:
    locale: str
    route: str
    source: Path
    video: Path
    declared_duration: str


def parse_iso_duration(value: str) -> float | None:
    match = ISO_DURATION.fullmatch(str(value or "").strip())
    if not match:
        return None
    seconds = (
        float(match.group("h") or 0) * 3600
        + float(match.group("m") or 0) * 60
        + float(match.group("s") or 0)
    )
    return seconds if seconds > 0 else None


def frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.S)
    if not match:
        raise ValueError(f"frontmatter missing: {path}")
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        raise ValueError(f"frontmatter must be a mapping: {path}")
    return data


def load_targets(root: Path) -> list[Target]:
    es_root = root / "docs/series/seguridad-ia"
    en_root = root / "locales/en/series/seguridad-ia"
    en_media_path = root / "locales/en/media.yml"
    en_media = yaml.safe_load(en_media_path.read_text(encoding="utf-8")) or {}
    if not isinstance(en_media, dict):
        raise ValueError("locales/en/media.yml must be a mapping")

    targets: list[Target] = []
    for name in ("00_presentacion_serie.md", "01-prompt-injection.md"):
        source = es_root / name
        meta = frontmatter(source)
        video_name = str(meta.get("video") or "").strip()
        duration = str(meta.get("video_duration") or "").strip()
        if not video_name:
            raise ValueError(f"video declaration missing: {source}")
        targets.append(
            Target(
                locale="es",
                route=f"series/seguridad-ia/{name}",
                source=source,
                video=source.parent / video_name,
                declared_duration=duration,
            )
        )

        en_key = f"series/seguridad-ia/{name}"
        en_meta = en_media.get(en_key) or {}
        if not isinstance(en_meta, dict):
            raise ValueError(f"English media entry invalid: {en_key}")
        en_video_name = str(en_meta.get("video") or "").strip()
        en_duration = str(en_meta.get("video_duration") or "").strip()
        if not en_video_name:
            raise ValueError(f"English video declaration missing: {en_key}")
        targets.append(
            Target(
                locale="en",
                route=en_key,
                source=en_root / name,
                video=en_root / en_video_name,
                declared_duration=en_duration,
            )
        )
    return targets


def ffprobe(path: Path) -> dict[str, Any]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration,format_name:"
            "stream=index,codec_type,codec_name,width,height,pix_fmt,channels,sample_rate",
            "-of",
            "json",
            str(path),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise RuntimeError(
            f"ffprobe failed for {path}: {result.stderr.strip() or result.stdout.strip()}"
        )
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"ffprobe returned invalid JSON for {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise RuntimeError(f"ffprobe returned unexpected payload for {path}")
    return data


def validate_probe(
    probe: dict[str, Any],
    *,
    declared_duration: str,
    path_label: str,
) -> tuple[list[dict[str, str]], dict[str, Any]]:
    failures: list[dict[str, str]] = []
    streams = probe.get("streams") or []
    if not isinstance(streams, list):
        streams = []
    videos = [stream for stream in streams if stream.get("codec_type") == "video"]
    audios = [stream for stream in streams if stream.get("codec_type") == "audio"]

    if len(videos) != 1:
        failures.append(
            {"code": "VIDEO_STREAM_COUNT_INVALID", "detail": f"{path_label}: {len(videos)}"}
        )
    video = videos[0] if videos else {}
    if video:
        if video.get("codec_name") != "h264":
            failures.append(
                {"code": "VIDEO_CODEC_INVALID", "detail": f"{path_label}: {video.get('codec_name')}"}
            )
        if (video.get("width"), video.get("height")) != (1920, 1080):
            failures.append(
                {
                    "code": "VIDEO_DIMENSIONS_INVALID",
                    "detail": f"{path_label}: {video.get('width')}x{video.get('height')}",
                }
            )
        if video.get("pix_fmt") != "yuv420p":
            failures.append(
                {"code": "VIDEO_PIXEL_FORMAT_INVALID", "detail": f"{path_label}: {video.get('pix_fmt')}"}
            )

    if not audios:
        failures.append({"code": "VIDEO_AUDIO_STREAM_MISSING", "detail": path_label})

    declared_seconds = parse_iso_duration(declared_duration)
    if declared_seconds is None:
        failures.append(
            {"code": "VIDEO_DURATION_DECLARATION_INVALID", "detail": f"{path_label}: {declared_duration!r}"}
        )

    raw_duration = (probe.get("format") or {}).get("duration")
    try:
        actual_seconds = float(raw_duration)
    except (TypeError, ValueError):
        actual_seconds = 0.0
        failures.append(
            {"code": "VIDEO_DURATION_PROBE_INVALID", "detail": f"{path_label}: {raw_duration!r}"}
        )

    if declared_seconds is not None and actual_seconds > 0:
        delta = abs(actual_seconds - declared_seconds)
        if delta > DURATION_TOLERANCE_SECONDS:
            failures.append(
                {
                    "code": "VIDEO_DURATION_METADATA_DRIFT",
                    "detail": (
                        f"{path_label}: declared={declared_seconds:.3f}s "
                        f"actual={actual_seconds:.3f}s delta={delta:.3f}s"
                    ),
                }
            )

    summary = {
        "format_name": (probe.get("format") or {}).get("format_name"),
        "actual_duration_seconds": actual_seconds,
        "declared_duration": declared_duration,
        "declared_duration_seconds": declared_seconds,
        "video_stream": {
            key: video.get(key)
            for key in ("codec_name", "width", "height", "pix_fmt")
        }
        if video
        else None,
        "audio_streams": [
            {key: stream.get(key) for key in ("codec_name", "channels", "sample_rate")}
            for stream in audios
        ],
    }
    return failures, summary


def run_self_test() -> None:
    valid_probe = {
        "format": {"duration": "60.333", "format_name": "mov,mp4,m4a,3gp,3g2,mj2"},
        "streams": [
            {
                "codec_type": "video",
                "codec_name": "h264",
                "width": 1920,
                "height": 1080,
                "pix_fmt": "yuv420p",
            },
            {
                "codec_type": "audio",
                "codec_name": "aac",
                "channels": 2,
                "sample_rate": "48000",
            },
        ],
    }
    failures, _ = validate_probe(
        valid_probe, declared_duration="PT1M0S", path_label="fixture-valid"
    )
    if failures:
        raise AssertionError(f"valid fixture unexpectedly failed: {failures}")

    silent_probe = {
        "format": {"duration": "47.567", "format_name": "mov,mp4,m4a,3gp,3g2,mj2"},
        "streams": [
            {
                "codec_type": "video",
                "codec_name": "h264",
                "width": 1920,
                "height": 1080,
                "pix_fmt": "yuv420p",
            }
        ],
    }
    failures, _ = validate_probe(
        silent_probe, declared_duration="PT48S", path_label="fixture-silent"
    )
    codes = {item["code"] for item in failures}
    if "VIDEO_AUDIO_STREAM_MISSING" not in codes:
        raise AssertionError("silent fixture must fail with VIDEO_AUDIO_STREAM_MISSING")

    drift_probe = {
        "format": {"duration": "60.333", "format_name": "mov,mp4,m4a,3gp,3g2,mj2"},
        "streams": valid_probe["streams"],
    }
    failures, _ = validate_probe(
        drift_probe, declared_duration="PT48S", path_label="fixture-drift"
    )
    codes = {item["code"] for item in failures}
    if "VIDEO_DURATION_METADATA_DRIFT" not in codes:
        raise AssertionError("duration-drift fixture must fail closed")

    print("security video media self-test PASS")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("artifacts/security-requalification/media-report.json"),
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return 0

    root = args.root.resolve()
    output = args.output if args.output.is_absolute() else root / args.output
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []

    try:
        targets = load_targets(root)
    except (OSError, ValueError, yaml.YAMLError) as exc:
        print(f"SECURITY_MEDIA_CONFIG_ERROR: {exc}", file=sys.stderr)
        return 2

    for target in targets:
        if not target.video.is_file() or target.video.stat().st_size <= 0:
            failures.append(
                {"code": "VIDEO_BINARY_MISSING", "detail": target.video.relative_to(root).as_posix()}
            )
            continue
        label = target.video.relative_to(root).as_posix()
        try:
            probe = ffprobe(target.video)
        except RuntimeError as exc:
            failures.append({"code": "VIDEO_FFPROBE_FAILED", "detail": str(exc)})
            continue
        item_failures, summary = validate_probe(
            probe,
            declared_duration=target.declared_duration,
            path_label=label,
        )
        failures.extend(item_failures)
        results.append(
            {
                "locale": target.locale,
                "route": target.route,
                "video": label,
                **summary,
                "failures": item_failures,
            }
        )

    report = {
        "schema_version": 1,
        "scope": "security-00-01",
        "status": "FAIL" if failures else "PASS",
        "golden": "NOT_CERTIFIED",
        "voice_policy": (
            "An audio stream is mandatory for the final learning video. "
            "This gate never generates, clones, or substitutes Francisco's voice."
        ),
        "failures": failures,
        "results": results,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
