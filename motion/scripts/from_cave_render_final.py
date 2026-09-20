#!/usr/bin/env python3
"""Render one final From Cave to AGI review candidate from the exact browser renderer.

This exporter is intentionally one-output-per-process so GitHub Actions can render the
24 ES/EN × H/V outputs in bounded parallel workers without weakening any gate.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright
from from_cave_render_check import bundled_page, load_semantic_chapters

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "migration/from-cave-to-agi-content-v1.json"
BINDINGS = ROOT / "content/from-cave-to-agi/locale-bindings.json"
OUT = ROOT / "dist/from-cave-to-agi-final"
FPS = 60
DURATION = 75.0
TOTAL_FRAMES = int(FPS * DURATION)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ffmpeg_cmd(path: Path, width: int, height: int) -> list[str]:
    return [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", str(FPS),
        "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium",
        "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-movflags", "+faststart", "-vf", f"scale={width}:{height}:flags=lanczos",
        str(path),
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chapter", required=True, choices=[f"{i:02d}" for i in range(6)])
    parser.add_argument("--locale", required=True, choices=["es", "en"])
    parser.add_argument("--orientation", required=True, choices=["horizontal", "vertical"])
    args = parser.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise SystemExit("ffmpeg and ffprobe are required")
    browser_exe = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not browser_exe:
        raise SystemExit("system Chromium/Chrome is required")

    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    bindings = json.loads(BINDINGS.read_text(encoding="utf-8"))
    semantic_chapters = load_semantic_chapters()
    chapter_index = int(args.chapter)
    chapter_spec = spec["chapters"][chapter_index]
    binding = bindings["chapters"][chapter_index]
    width, height = (1920, 1080) if args.orientation == "horizontal" else (1080, 1920)
    job_id = f"from-cave-to-agi-{args.chapter}-{args.locale}-{args.orientation}"
    source_path = binding[args.locale]
    canonical_horizontal = binding[f"output_{args.locale}"]

    OUT.mkdir(parents=True, exist_ok=True)
    mp4_path = OUT / f"{args.chapter}-{args.locale}-{args.orientation}.mp4"
    report_path = OUT / f"{args.chapter}-{args.locale}-{args.orientation}.json"
    proc = subprocess.Popen(ffmpeg_cmd(mp4_path, width, height), stdin=subprocess.PIPE)
    browser_errors: list[str] = []
    issues_seen: list[dict] = []
    scene_families: list[dict] = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=browser_exe, headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            page = browser.new_page(viewport={"width": 1920, "height": 1920}, device_scale_factor=1)
            page.on("pageerror", lambda e: browser_errors.append(str(e)))
            page.set_content(bundled_page())
            page.wait_for_function("window.ready===true", timeout=15000)
            setup = page.evaluate(
                "(a)=>window.setup(a.spec,a.bindings,a.chapters)",
                {"spec": spec, "bindings": bindings, "chapters": semantic_chapters},
            )

            # Verify this exact job exists in the source-bound 24-job matrix before rendering.
            matching = [j for j in setup["jobs"] if j["id"] == job_id]
            if len(matching) != 1:
                raise RuntimeError(f"expected exactly one source-bound job for {job_id}, got {len(matching)}")

            observed_scene: dict[int, dict] = {}
            for frame in range(TOTAL_FRAMES):
                t = frame / FPS
                item = page.evaluate("(a)=>window.frame(a.job,a.t)", {"job": job_id, "t": t})
                result = item["result"]
                if result["issues"]:
                    issues_seen.append({"frame": frame, "seconds": t, "issues": result["issues"]})
                    raise RuntimeError(f"render issues at {job_id} frame={frame} t={t:.6f}: {result['issues']}")
                scene_index = min(4, int(t // 15.0))
                observed_scene.setdefault(scene_index, {
                    "concept_id": chapter_spec["scenes"][scene_index]["concept_id"],
                    "family": result["family"],
                    "topology": result["topology"],
                    "visual_style": result["visualStyle"],
                })
                jpeg = base64.b64decode(item["jpeg"])
                assert proc.stdin is not None
                proc.stdin.write(jpeg)
            browser.close()
    finally:
        if proc.stdin:
            proc.stdin.close()
        rc = proc.wait()

    if rc != 0:
        raise SystemExit(f"ffmpeg failed for {job_id}: {rc}")
    if browser_errors:
        raise SystemExit(f"browser errors for {job_id}: {browser_errors}")
    if issues_seen:
        raise SystemExit(f"layout/render issues for {job_id}: {issues_seen[:3]}")
    if len(scene_families) != 0:
        raise AssertionError("internal scene collection invariant")
    scene_families = [observed_scene[i] for i in range(5)]

    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,duration,nb_frames",
        "-of", "json", str(mp4_path),
    ], text=True))["streams"][0]
    subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4_path), "-f", "null", "-"], check=True)

    expected_width, expected_height = width, height
    if probe.get("codec_name") != "h264" or int(probe["width"]) != expected_width or int(probe["height"]) != expected_height:
        raise SystemExit(f"unexpected media profile for {job_id}: {probe}")
    if probe.get("r_frame_rate") != "60/1" or probe.get("avg_frame_rate") != "60/1":
        raise SystemExit(f"unexpected frame rate for {job_id}: {probe}")
    if int(probe.get("nb_frames") or 0) != TOTAL_FRAMES:
        raise SystemExit(f"unexpected frame count for {job_id}: {probe}")
    if abs(float(probe.get("duration") or 0.0) - DURATION) > 0.02:
        raise SystemExit(f"unexpected duration for {job_id}: {probe}")

    report = {
        "schema_version": 1,
        "unit": "from-cave-to-agi",
        "scope": "final review candidate output; owner approval and Technical GOLDEN are separate gates",
        "source_head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT.parent, text=True).strip(),
        "job_id": job_id,
        "chapter": args.chapter,
        "locale": args.locale,
        "orientation": args.orientation,
        "source_path": source_path,
        "canonical_horizontal_output": canonical_horizontal,
        "native_vertical": args.orientation == "vertical",
        "reduced_motion_required": True,
        "fps": FPS,
        "duration_seconds": DURATION,
        "frames": TOTAL_FRAMES,
        "mp4": mp4_path.name,
        "sha256": sha256(mp4_path),
        "size_bytes": mp4_path.stat().st_size,
        "ffprobe": probe,
        "full_decode": "PASS",
        "browser_errors": browser_errors,
        "render_issues": issues_seen,
        "scenes": scene_families,
        "owner_visual_approval": "NOT_REQUESTED",
        "technical_golden": False,
        "published": False,
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "job_id": job_id,
        "sha256": report["sha256"],
        "size_bytes": report["size_bytes"],
        "frames": TOTAL_FRAMES,
        "full_decode": "PASS",
        "scenes": len(scene_families),
    }))


if __name__ == "__main__":
    main()
