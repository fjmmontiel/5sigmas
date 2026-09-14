#!/usr/bin/env python3
"""Fail-closed media validation for Security 00/01 requalification.

This focused gate validates the four native ES/EN Security presentation and
Prompt Injection learning videos. It separates two independent contracts:

1. Source/media metadata completeness: video, poster, title, summary, captions,
   transcript and curated key moments must all be declared and their local
   assets must exist.
2. Binary facts from ffprobe: one H.264 1920x1080 yuv420p video stream, an audio
   stream, and duration consistent with the declared ISO-8601 duration.

The gate NEVER creates narration, captions, transcripts or key moments. Missing
authorized Francisco narration remains a hard media blocker rather than being
silently substituted.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
ISO_DURATION = re.compile(
    r"^PT(?:(?P<h>\d+)H)?(?:(?P<m>\d+)M)?(?:(?P<s>\d+(?:\.\d+)?)S)?$"
)
DURATION_TOLERANCE_SECONDS = 1.0
MEDIA_KEYS = (
    "video",
    "video_poster",
    "video_title",
    "video_summary",
    "video_duration",
    "video_captions",
    "video_transcript",
)


@dataclass(frozen=True)
class Target:
    locale: str
    route: str
    source: Path
    asset_root: Path
    meta: dict[str, Any]


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
        targets.append(
            Target(
                locale="es",
                route=f"series/seguridad-ia/{name}",
                source=source,
                asset_root=source.parent,
                meta=frontmatter(source),
            )
        )

        en_key = f"series/seguridad-ia/{name}"
        en_meta = en_media.get(en_key) or {}
        if not isinstance(en_meta, dict):
            raise ValueError(f"English media entry invalid: {en_key}")
        targets.append(
            Target(
                locale="en",
                route=en_key,
                source=en_root / name,
                asset_root=en_root,
                meta=dict(en_meta),
            )
        )
    return targets


def _string(meta: dict[str, Any], key: str) -> str:
    value = meta.get(key)
    return str(value).strip() if value is not None else ""


def _asset_path(asset_root: Path, value: str) -> Path:
    return asset_root / value.strip().lstrip("/")


def validate_metadata(
    target: Target,
) -> tuple[list[dict[str, str]], dict[str, Any]]:
    failures: list[dict[str, str]] = []
    label = f"{target.locale}:{target.route}"
    meta = target.meta

    for key in MEDIA_KEYS:
        if not _string(meta, key):
            failures.append(
                {"code": f"{key.upper()}_MISSING", "detail": label}
            )

    duration_text = _string(meta, "video_duration")
    duration_seconds = parse_iso_duration(duration_text)
    if duration_text and duration_seconds is None:
        failures.append(
            {
                "code": "VIDEO_DURATION_DECLARATION_INVALID",
                "detail": f"{label}: {duration_text!r}",
            }
        )

    file_contract = (
        ("video", "VIDEO_BINARY_MISSING"),
        ("video_poster", "VIDEO_POSTER_MISSING"),
        ("video_captions", "VIDEO_CAPTIONS_FILE_MISSING"),
        ("video_transcript", "VIDEO_TRANSCRIPT_FILE_MISSING"),
    )
    resolved: dict[str, str | None] = {}
    for key, code in file_contract:
        value = _string(meta, key)
        if not value:
            resolved[key] = None
            continue
        path = _asset_path(target.asset_root, value)
        resolved[key] = path.as_posix()
        if not path.is_file() or path.stat().st_size <= 0:
            failures.append({"code": code, "detail": f"{label}: {value}"})

    captions = _string(meta, "video_captions")
    if captions and Path(captions).suffix.lower() != ".vtt":
        failures.append(
            {"code": "VIDEO_CAPTIONS_FORMAT_INVALID", "detail": f"{label}: {captions}"}
        )
    transcript = _string(meta, "video_transcript")
    if transcript and Path(transcript).suffix.lower() not in {".md", ".txt"}:
        failures.append(
            {
                "code": "VIDEO_TRANSCRIPT_FORMAT_INVALID",
                "detail": f"{label}: {transcript}",
            }
        )

    chapters_raw = meta.get("video_chapters")
    chapters: list[dict[str, Any]] = (
        chapters_raw if isinstance(chapters_raw, list) else []
    )
    if not chapters:
        failures.append({"code": "VIDEO_CHAPTERS_MISSING", "detail": label})
    else:
        previous_end: float | None = None
        for index, chapter in enumerate(chapters):
            chapter_label = f"{label}:chapter[{index}]"
            if not isinstance(chapter, dict):
                failures.append(
                    {"code": "VIDEO_CHAPTER_INVALID", "detail": chapter_label}
                )
                continue
            name = str(chapter.get("name") or "").strip()
            if not name:
                failures.append(
                    {"code": "VIDEO_CHAPTER_NAME_MISSING", "detail": chapter_label}
                )
            try:
                start = float(chapter.get("start"))
                end = float(chapter.get("end"))
            except (TypeError, ValueError):
                failures.append(
                    {"code": "VIDEO_CHAPTER_TIME_INVALID", "detail": chapter_label}
                )
                continue
            if start < 0 or end <= start:
                failures.append(
                    {
                        "code": "VIDEO_CHAPTER_RANGE_INVALID",
                        "detail": f"{chapter_label}: start={start:g} end={end:g}",
                    }
                )
            if index == 0 and abs(start) > DURATION_TOLERANCE_SECONDS:
                failures.append(
                    {
                        "code": "VIDEO_CHAPTERS_DO_NOT_START_AT_ZERO",
                        "detail": f"{chapter_label}: start={start:g}",
                    }
                )
            if previous_end is not None and start < previous_end - 0.05:
                failures.append(
                    {
                        "code": "VIDEO_CHAPTERS_OVERLAP",
                        "detail": (
                            f"{chapter_label}: previous_end={previous_end:g} "
                            f"start={start:g}"
                        ),
                    }
                )
            if duration_seconds is not None and end > duration_seconds + DURATION_TOLERANCE_SECONDS:
                failures.append(
                    {
                        "code": "VIDEO_CHAPTER_EXCEEDS_DURATION",
                        "detail": (
                            f"{chapter_label}: end={end:g} "
                            f"duration={duration_seconds:g}"
                        ),
                    }
                )
            previous_end = end
        if (
            previous_end is not None
            and duration_seconds is not None
            and abs(previous_end - duration_seconds) > DURATION_TOLERANCE_SECONDS
        ):
            failures.append(
                {
                    "code": "VIDEO_CHAPTERS_DO_NOT_COVER_DURATION",
                    "detail": (
                        f"{label}: last_end={previous_end:g} "
                        f"duration={duration_seconds:g}"
                    ),
                }
            )

    summary = {
        "title": _string(meta, "video_title"),
        "summary": _string(meta, "video_summary"),
        "duration": duration_text,
        "poster": _string(meta, "video_poster"),
        "captions": _string(meta, "video_captions"),
        "transcript": _string(meta, "video_transcript"),
        "chapter_count": len(chapters),
        "resolved_assets": resolved,
    }
    return failures, summary


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


def _write_fixture_assets(root: Path) -> None:
    root.mkdir(parents=True, exist_ok=True)
    for name, content in (
        ("video.mp4", b"fixture"),
        ("poster.jpg", b"fixture"),
        ("captions.vtt", b"WEBVTT\n"),
        ("transcript.md", b"# Transcript\n"),
    ):
        (root / name).write_bytes(content)


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
        raise AssertionError(f"valid probe fixture unexpectedly failed: {failures}")

    silent_probe = {
        "format": {"duration": "47.567", "format_name": "mov,mp4,m4a,3gp,3g2,mj2"},
        "streams": [valid_probe["streams"][0]],
    }
    failures, _ = validate_probe(
        silent_probe, declared_duration="PT48S", path_label="fixture-silent"
    )
    if "VIDEO_AUDIO_STREAM_MISSING" not in {item["code"] for item in failures}:
        raise AssertionError("silent fixture must fail with VIDEO_AUDIO_STREAM_MISSING")

    drift_probe = {
        "format": {"duration": "60.333", "format_name": "mov,mp4,m4a,3gp,3g2,mj2"},
        "streams": valid_probe["streams"],
    }
    failures, _ = validate_probe(
        drift_probe, declared_duration="PT48S", path_label="fixture-drift"
    )
    if "VIDEO_DURATION_METADATA_DRIFT" not in {item["code"] for item in failures}:
        raise AssertionError("duration-drift fixture must fail closed")

    with tempfile.TemporaryDirectory() as temp:
        asset_root = Path(temp)
        _write_fixture_assets(asset_root)
        valid_meta = {
            "video": "video.mp4",
            "video_poster": "poster.jpg",
            "video_title": "A useful title",
            "video_summary": "A useful summary of what this video teaches.",
            "video_duration": "PT1M0S",
            "video_captions": "captions.vtt",
            "video_transcript": "transcript.md",
            "video_chapters": [
                {"name": "Setup", "start": 0, "end": 30},
                {"name": "Mechanism", "start": 30, "end": 60},
            ],
        }
        target = Target(
            locale="es",
            route="fixture",
            source=asset_root / "article.md",
            asset_root=asset_root,
            meta=valid_meta,
        )
        failures, _ = validate_metadata(target)
        if failures:
            raise AssertionError(f"valid metadata fixture unexpectedly failed: {failures}")

        missing = dict(valid_meta)
        missing.pop("video_captions")
        missing.pop("video_transcript")
        missing.pop("video_chapters")
        failures, _ = validate_metadata(
            Target("es", "missing", target.source, asset_root, missing)
        )
        codes = {item["code"] for item in failures}
        expected = {
            "VIDEO_CAPTIONS_MISSING",
            "VIDEO_TRANSCRIPT_MISSING",
            "VIDEO_CHAPTERS_MISSING",
        }
        if not expected.issubset(codes):
            raise AssertionError(
                f"missing metadata fixture did not fail closed: {sorted(codes)}"
            )

        bad_chapters = dict(valid_meta)
        bad_chapters["video_chapters"] = [
            {"name": "Bad", "start": 5, "end": 65}
        ]
        failures, _ = validate_metadata(
            Target("en", "bad-chapters", target.source, asset_root, bad_chapters)
        )
        codes = {item["code"] for item in failures}
        if not {
            "VIDEO_CHAPTERS_DO_NOT_START_AT_ZERO",
            "VIDEO_CHAPTER_EXCEEDS_DURATION",
            "VIDEO_CHAPTERS_DO_NOT_COVER_DURATION",
        }.issubset(codes):
            raise AssertionError(
                f"bad chapter fixture did not fail closed: {sorted(codes)}"
            )

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
        metadata_failures, metadata_summary = validate_metadata(target)
        failures.extend(metadata_failures)

        video_name = _string(target.meta, "video")
        probe_summary: dict[str, Any] | None = None
        probe_failures: list[dict[str, str]] = []
        if video_name:
            video_path = _asset_path(target.asset_root, video_name)
            label = video_path.relative_to(root).as_posix()
            if video_path.is_file() and video_path.stat().st_size > 0:
                try:
                    probe = ffprobe(video_path)
                except RuntimeError as exc:
                    probe_failures.append(
                        {"code": "VIDEO_FFPROBE_FAILED", "detail": str(exc)}
                    )
                else:
                    probe_failures, probe_summary = validate_probe(
                        probe,
                        declared_duration=_string(target.meta, "video_duration"),
                        path_label=label,
                    )
                    failures.extend(probe_failures)
            # Missing binary already reported by validate_metadata.

        results.append(
            {
                "locale": target.locale,
                "route": target.route,
                "metadata": metadata_summary,
                "probe": probe_summary,
                "failures": metadata_failures + probe_failures,
            }
        )

    report = {
        "schema_version": 2,
        "scope": "security-00-01",
        "status": "FAIL" if failures else "PASS",
        "golden": "NOT_CERTIFIED",
        "voice_policy": (
            "An authorized narration/audio stream is mandatory for the final "
            "learning video. This gate never generates, clones or substitutes "
            "Francisco's voice."
        ),
        "contract": {
            "metadata": [
                "video",
                "video_poster",
                "video_title",
                "video_summary",
                "video_duration",
                "video_captions",
                "video_transcript",
                "video_chapters",
            ],
            "binary": [
                "h264",
                "1920x1080",
                "yuv420p",
                "audio-stream",
                "declared-vs-probed-duration",
            ],
        },
        "failures": failures,
        "results": results,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
