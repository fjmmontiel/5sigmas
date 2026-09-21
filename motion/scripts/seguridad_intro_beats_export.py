#!/usr/bin/env python3
"""Export the authored intro profile through the existing browser module bundler.

This entrypoint produces INTERNAL_ONLY candidates. It does not waive independent
encoded review, Drive verification, approval or the complete-series release gate.
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
from seguridad_render_check import bundled_page

ROOT = Path(__file__).resolve().parents[1]

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', choices=('es', 'en'), required=True)
    parser.add_argument('--orientation', choices=('horizontal', 'vertical'), required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--source-head', required=True)
    parser.add_argument('--probe-only', action='store_true')
    args = parser.parse_args()
    chrome = shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('chromium-browser')
    if not chrome or not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise SystemExit('Chromium, ffmpeg and ffprobe are required')
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=chrome, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1920, 'height': 1920}, device_scale_factor=1)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(bundled_page())
        page.wait_for_function('window.ready === true', timeout=15000)
        profile = page.evaluate('''async () => {
            const {renderIntroV3} = await import('@5sigmas/src/seguridad/intro-v3.mjs');
            const {INTRO_V3} = await import('@5sigmas/src/seguridad/intro-v3-data.mjs');
            const {expectedBeatEvents} = await import('@5sigmas/src/seguridad/semantic-beats.mjs');
            const canvas = document.querySelector('canvas');
            window.introFrame = (locale, orientation, t) => {
                const result = renderIntroV3(canvas, locale, orientation, t);
                return {result, jpeg: canvas.toDataURL('image/jpeg', .98).split(',')[1]};
            };
            return {version: INTRO_V3.version, duration: INTRO_V3.duration,
                cues: INTRO_V3.scenes.flatMap(s => expectedBeatEvents(s, s.start))};
        }''')
        if args.probe_only:
            for cue in profile['cues']:
                for t in (max(0, cue['text_at']-1/60), cue['text_at']+.1, cue['settled_at']+.1):
                    sample = page.evaluate('(a) => window.introFrame(...a)', [args.locale, args.orientation, t])
                    if sample['result']['issues']:
                        raise RuntimeError(sample['result']['issues'])
            if errors:
                raise RuntimeError(errors)
            print(json.dumps({'state': 'CANVAS_PROBE_ONLY_NOT_ENCODED_QA', 'profile': profile, 'browser_errors': errors}))
            browser.close()
            return
        args.out.mkdir(parents=True, exist_ok=True)
        target = args.out / f'00-seguridad-96s-{args.locale}-{args.orientation}.mp4'
        if target.exists():
            raise SystemExit('Refusing to overwrite a retained candidate; reconcile it or choose a new output directory')
        fps = 60
        count = round(profile['duration'] * fps)
        process = subprocess.Popen(['ffmpeg', '-v', 'error', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', str(fps), '-i', '-', '-an', '-c:v', 'libx264', '-threads', '4', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', str(fps), '-movflags', '+faststart', str(target)], stdin=subprocess.PIPE)
        completed = 0
        try:
            for frame in range(count):
                sample = page.evaluate('(a) => window.introFrame(...a)', [args.locale, args.orientation, frame/fps])
                if sample['result']['issues']:
                    raise RuntimeError(sample['result']['issues'])
                if process.stdin is None:
                    raise RuntimeError('Encoder stdin is unavailable')
                process.stdin.write(base64.b64decode(sample['jpeg']))
                completed += 1
                if completed % 300 == 0:
                    print(json.dumps({'frames': completed, 'required': count}), flush=True)
        finally:
            if process.stdin:
                process.stdin.close()
            status = process.wait()
            browser.close()
        if status or completed != count or errors:
            raise RuntimeError({'encoder_status': status, 'frames': completed, 'expected': count, 'browser_errors': errors})
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(target)], text=True))
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(target), '-f', 'null', '-'], check=True)
    record = {'state': 'INTERNAL_ONLY_PENDING_INDEPENDENT_QA', 'source_head': args.source_head,
              'profile': profile, 'mp4': target.name, 'sha256': sha256(target), 'size_bytes': target.stat().st_size,
              'fps': fps, 'frames': count, 'probe': probe, 'full_decode': 'PASS', 'browser_errors': errors,
              'source_hashes': {p.relative_to(ROOT).as_posix(): sha256(p) for p in sorted((ROOT/'src').rglob('*.mjs'))},
              'owner_visual_approval': 'NOT_REQUESTED', 'review_ready': False, 'published': False}
    target.with_suffix('.metadata.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'state': record['state'], 'file': target.name, 'sha256': record['sha256']}))

if __name__ == '__main__':
    main()
