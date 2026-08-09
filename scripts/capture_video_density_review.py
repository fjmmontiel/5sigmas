#!/usr/bin/env python3
"""Create representative-frame artifacts for public MP4s.

With no positional arguments the script audits every public video. When paths are
provided it audits only those MP4s, which lets CI review changed media without
re-extracting the complete catalogue on every unrelated PR.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUT = ROOT / "artifacts" / "visual-review" / "video-density"
FRACTIONS = (0.08, 0.34, 0.62, 0.88)


def run(*args: str) -> str:
    result = subprocess.run(args, check=True, text=True, capture_output=True)
    return result.stdout.strip()


def probe(path: Path) -> dict:
    raw = run(
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=width,height,r_frame_rate",
        "-select_streams", "v:0", "-of", "json", str(path),
    )
    data = json.loads(raw)
    stream = (data.get("streams") or [{}])[0]
    return {
        "duration": float((data.get("format") or {}).get("duration") or 0),
        "width": int(stream.get("width") or 0),
        "height": int(stream.get("height") or 0),
        "fps": stream.get("r_frame_rate") or "",
    }


def is_public_video(path: Path) -> bool:
    try:
        rel = path.resolve().relative_to(DOCS.resolve()).as_posix()
    except ValueError:
        return False
    return rel.startswith(("series/", "articulos-tecnicos/")) and path.suffix.lower() == ".mp4"


def discover_videos(raw_paths: list[str]) -> list[Path]:
    if not raw_paths:
        return sorted(path for path in DOCS.rglob("*.mp4") if is_public_video(path))

    videos: list[Path] = []
    for raw in raw_paths:
        candidate = (ROOT / raw).resolve() if not Path(raw).is_absolute() else Path(raw).resolve()
        if not candidate.is_file():
            raise ValueError(f"video path does not exist: {raw}")
        if not is_public_video(candidate):
            raise ValueError(f"not a public article/series MP4: {raw}")
        videos.append(candidate)
    return sorted(set(videos))


def main() -> int:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("ffmpeg/ffprobe are required for media review", file=sys.stderr)
        return 1

    try:
        videos = discover_videos(sys.argv[1:])
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)

    report = {"video_count": len(videos), "fractions": FRACTIONS, "videos": []}

    for video in videos:
        meta = probe(video)
        duration = meta["duration"]
        rel = video.resolve().relative_to(DOCS.resolve()).as_posix()
        safe = rel.replace("/", "__").removesuffix(".mp4")
        frames = []
        if duration <= 0:
            report["videos"].append({"path": rel, **meta, "error": "zero duration"})
            continue

        for index, fraction in enumerate(FRACTIONS, start=1):
            timestamp = max(0.0, min(duration - 0.05, duration * fraction))
            dest = OUT / f"{safe}__{index:02d}-{round(fraction * 100):02d}pct.jpg"
            subprocess.run(
                [
                    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-ss", f"{timestamp:.3f}", "-i", str(video),
                    "-frames:v", "1", "-vf",
                    "scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2",
                    "-q:v", "3", str(dest),
                ],
                check=True,
            )
            frames.append({"file": dest.name, "timestamp": round(timestamp, 3), "fraction": fraction})

        report["videos"].append({"path": rel, **meta, "frames": frames})

    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Captured {sum(len(v.get('frames', [])) for v in report['videos'])} frames from {len(videos)} videos at {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
