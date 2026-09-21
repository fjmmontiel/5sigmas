#!/usr/bin/env python3
"""Render one complete Seguridad IA localized H/V chapter from the deterministic browser timeline."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright
from seguridad_render_check import bundled_page

ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = ROOT / "migration/seguridad-ia-content-v1.json"
REGISTER_PATH = ROOT / "migration/seguridad-ia-series-register.json"
FPS = 60
DURATION = 60


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ffmpeg_encoder(path: Path, width: int, height: int) -> list[str]:
    return [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart",
        "-vf", f"scale={width}:{height}:flags=lanczos", str(path),
    ]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chapter", type=int, required=True, choices=range(6))
    ap.add_argument("--locale", required=True, choices=("es", "en"))
    ap.add_argument("--orientation", required=True, choices=("horizontal", "vertical"))
    ap.add_argument("--source-head", default=os.getenv("GITHUB_SHA", "LOCAL"))
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise SystemExit("ffmpeg and ffprobe are required")
    chrome = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        raise SystemExit("system Chromium/Chrome is required")

    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    register = json.loads(REGISTER_PATH.read_text(encoding="utf-8"))
    chapter = spec["chapters"][args.chapter]
    width, height = ((1920, 1080) if args.orientation == "horizontal" else (1080, 1920))
    slug = chapter["slug"]
    stem = f"{args.chapter:02d}-{slug}-{args.locale}-{args.orientation}"
    args.out.mkdir(parents=True, exist_ok=True)
    mp4 = args.out / f"{stem}.mp4"
    poster = args.out / f"{stem}.poster.jpg"
    transcript = args.out / f"{stem}.visual-transcript.json"
    metadata = args.out / f"{stem}.metadata.json"
    job = f"seguridad-ia-{args.chapter:02d}-{args.locale}-{args.orientation}"

    browser_errors: list[str] = []
    proc = subprocess.Popen(ffmpeg_encoder(mp4, width, height), stdin=subprocess.PIPE)
    frame_count = 0
    observed_families: set[str] = set()
    observed_topologies: set[str] = set()
    scene_mechanisms: dict[str, dict[str, str]] = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=chrome, headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            page = browser.new_page(viewport={"width": 1920, "height": 1920}, device_scale_factor=1)
            page.on("pageerror", lambda e: browser_errors.append(str(e)))
            page.set_content(bundled_page())
            page.wait_for_function("window.ready===true", timeout=15000)
            page.evaluate("(a)=>window.setup(a.spec,a.register)", {"spec": spec, "register": register})
            for i in range(FPS * DURATION):
                t = i / FPS
                item = page.evaluate("(a)=>window.frame(a.job,a.t)", {"job": job, "t": t})
                result = item["result"]
                if result["issues"]:
                    raise RuntimeError(f"render issues {job} t={t}: {result['issues']}")
                observed_families.add(result["family"])
                observed_topologies.add(result["topology"])
                scene_mechanisms[result["scene"]] = {
                    "concept_id": result["scene"],
                    "declared_family": result["family"],
                    "topology": result["topology"],
                }
                jpeg = base64.b64decode(item["jpeg"])
                assert proc.stdin is not None
                proc.stdin.write(jpeg)
                frame_count += 1
            browser.close()
    finally:
        if proc.stdin:
            proc.stdin.close()
        rc = proc.wait()
    if rc != 0:
        raise SystemExit(f"ffmpeg encode failed: {rc}")
    if browser_errors:
        raise SystemExit(f"browser errors: {browser_errors}")
    if frame_count != FPS * DURATION:
        raise SystemExit(f"frame count mismatch: {frame_count}")
    if len(scene_mechanisms) != 5:
        raise SystemExit(f"expected five bound scene mechanisms, got {len(scene_mechanisms)}")

    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,duration,nb_frames",
        "-of", "json", str(mp4)
    ], text=True))["streams"][0]
    subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-f", "null", "-"], check=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", "6", "-i", str(mp4),
        "-frames:v", "1", "-q:v", "2", str(poster)
    ], check=True)

    transcript_data = {
        "schema_version": 1,
        "unit": "seguridad-ia",
        "chapter": chapter["chapter"],
        "locale": args.locale,
        "orientation": args.orientation,
        "audio": "silent",
        "title": chapter["title"][args.locale],
        "summary": chapter["summary"][args.locale],
        "article_chapters": [
            {"start": x["start"], "end": x["end"], "name": x["name"][args.locale]}
            for x in chapter["article_chapters"]
        ],
        "scenes": [
            {
                "concept_id": s["concept_id"],
                "start": s["start"],
                "end": s["end"],
                "text": s["text"][args.locale],
            }
            for s in chapter["scenes"]
        ],
    }
    transcript.write_text(json.dumps(transcript_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    source_binding = spec["source_bindings"][args.chapter][args.locale]
    ordered_scene_mechanisms = [scene_mechanisms[s["concept_id"]] for s in chapter["scenes"]]
    meta = {
        "schema_version": 1,
        "unit": "seguridad-ia",
        "spec_id": spec["spec_id"],
        "source_head": args.source_head,
        "chapter": chapter["chapter"],
        "slug": slug,
        "locale": args.locale,
        "orientation": args.orientation,
        "job_id": job,
        "source_binding": source_binding,
        "render_contract": spec["render_contract"],
        "theme": spec["theme"],
        "mp4": {
            "file": mp4.name,
            "sha256": sha256(mp4),
            "size_bytes": mp4.stat().st_size,
            "ffprobe": probe,
            "full_decode": "PASS",
            "frame_count_written": frame_count,
        },
        "poster": {
            "file": poster.name,
            "sha256": sha256(poster),
            "size_bytes": poster.stat().st_size,
        },
        "visual_transcript": {
            "file": transcript.name,
            "sha256": sha256(transcript),
            "size_bytes": transcript.stat().st_size,
        },
        "browser_errors": browser_errors,
        "scene_mechanisms": ordered_scene_mechanisms,
        "observed_families": sorted(observed_families),
        "observed_topologies": sorted(observed_topologies),
        "technical_golden": False,
        "owner_visual_approval": "NOT_REQUESTED",
    }
    metadata.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "state": "FINAL_OUTPUT_ENCODED_NOT_GOLDEN",
        "job": job,
        "sha256": meta["mp4"]["sha256"],
        "size_bytes": meta["mp4"]["size_bytes"],
        "frames": frame_count,
        "full_decode": "PASS",
        "scene_mechanisms": ordered_scene_mechanisms,
    }))


if __name__ == "__main__":
    main()
