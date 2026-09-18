#!/usr/bin/env python3
"""Extract bounded visual evidence from the native Security00/01 ES/EN MP4s.

This script deliberately samples VIDEO CONTENT only. It does not infer narration,
transcript, captions, or narration timing. The retained frames are manual review
evidence for non-voice key-moment curation under owner amendment 5716685049.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

OUT = Path("artifacts/security-requalification/security-00-01-video-frames")
VIDEOS = [
    ("00", "es", Path("docs/series/seguridad-ia/00_presentacion_serie.mp4")),
    ("01", "es", Path("docs/series/seguridad-ia/01-prompt-injection.mp4")),
    ("00", "en", Path("locales/en/series/seguridad-ia/00_presentacion_serie.mp4")),
    ("01", "en", Path("locales/en/series/seguridad-ia/01-prompt-injection.mp4")),
]
FRACTIONS = (0.0, 0.2, 0.4, 0.6, 0.8, 0.98)


def run(*args: str) -> str:
    result = subprocess.run(args, check=True, text=True, capture_output=True)
    return result.stdout


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def probe(path: Path) -> dict:
    payload = json.loads(
        run(
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=index,codec_type,codec_name,width,height,pix_fmt",
            "-of",
            "json",
            str(path),
        )
    )
    duration = float(payload["format"]["duration"])
    video_streams = [s for s in payload.get("streams", []) if s.get("codec_type") == "video"]
    if len(video_streams) != 1:
        raise RuntimeError(f"{path}: expected exactly one video stream, got {len(video_streams)}")
    return {"duration_seconds": duration, "streams": payload.get("streams", [])}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    failures: list[dict] = []
    for chapter, locale, path in VIDEOS:
        try:
            if not path.is_file():
                raise FileNotFoundError(path)
            meta = probe(path)
            duration = meta["duration_seconds"]
            sample_seconds = [round(duration * fraction, 3) for fraction in FRACTIONS]
            frames: list[dict] = []
            for index, second in enumerate(sample_seconds):
                frame = OUT / f"security{chapter}-{locale}-{index:02d}-{second:07.3f}s.jpg"
                subprocess.run(
                    [
                        "ffmpeg",
                        "-hide_banner",
                        "-loglevel",
                        "error",
                        "-y",
                        "-ss",
                        f"{second:.3f}",
                        "-i",
                        str(path),
                        "-frames:v",
                        "1",
                        "-vf",
                        "scale=960:-2:flags=lanczos",
                        "-q:v",
                        "2",
                        str(frame),
                    ],
                    check=True,
                )
                if not frame.is_file() or frame.stat().st_size == 0:
                    raise RuntimeError(f"empty frame for {path} at {second}s")
                frames.append(
                    {
                        "sample_second": second,
                        "path": str(frame),
                        "size_bytes": frame.stat().st_size,
                        "sha256": sha256(frame),
                    }
                )
            records.append(
                {
                    "chapter": chapter,
                    "locale": locale,
                    "video": str(path),
                    "video_sha256": sha256(path),
                    "duration_seconds": duration,
                    "streams": meta["streams"],
                    "frames": frames,
                }
            )
        except Exception as exc:  # evidence capture must fail closed
            failures.append({"chapter": chapter, "locale": locale, "video": str(path), "error": repr(exc)})

    report = {
        "contract": "OWNER_AMENDMENT_5716685049_NONVOICE_VIDEO_EVIDENCE",
        "purpose": "MANUAL_VIDEO_CONTENT_AND_KEY_MOMENT_EVIDENCE_ONLY",
        "voice_enhancement": "DEFERRED_OWNER_LOCAL",
        "narration_or_transcript_inference": False,
        "samples_per_video": len(FRACTIONS),
        "expected_videos": len(VIDEOS),
        "observed_videos": len(records),
        "records": records,
        "failures": failures,
    }
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"SECURITY00_01_VIDEO_FRAME_EVIDENCE videos={len(records)}/{len(VIDEOS)} "
        f"frames={sum(len(r['frames']) for r in records)} failures={len(failures)}"
    )
    if failures or len(records) != len(VIDEOS):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
