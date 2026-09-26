#!/usr/bin/env python3
"""Encode bounded Seguridad IA H/V motion probes from the actual deterministic browser renderer."""
from __future__ import annotations
import base64, hashlib, io, json, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright
from seguridad_render_check import bundled_page

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'migration/seguridad-ia-content-v1.json'
REGISTER = ROOT / 'migration/seguridad-ia-series-register.json'
OUT = ROOT / 'dist/seguridad-ia-encoded-motion'
FPS = 60
WINDOW_SECONDS = 0.60
FRAMES_PER_WINDOW = round(FPS * WINDOW_SECONDS)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def image_delta(a: bytes, b: bytes) -> float:
    ia = Image.open(io.BytesIO(a)).convert('RGB').resize((320, 180))
    ib = Image.open(io.BytesIO(b)).convert('RGB').resize((320, 180))
    diff = ImageChops.difference(ia, ib)
    return round(sum(ImageStat.Stat(diff).mean) / 3.0, 4)


def ffmpeg_cmd(path: Path, width: int, height: int) -> list[str]:
    return [
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', str(FPS), '-i', '-',
        '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart',
        '-vf', f'scale={width}:{height}:flags=lanczos', str(path)
    ]


def encode_orientation(page, spec: dict, register: dict, orientation: str) -> dict:
    width, height = ((1920, 1080) if orientation == 'horizontal' else (1080, 1920))
    out_path = OUT / f'seguridad-ia-es-{orientation}-motion-probe.mp4'
    proc = subprocess.Popen(ffmpeg_cmd(out_path, width, height), stdin=subprocess.PIPE)
    concepts = {c['id']: c for ch in register['chapters'] for c in ch['concepts']}
    windows = []
    total_frames = 0
    try:
        for chapter in range(6):
            job = f'seguridad-ia-{chapter:02d}-es-{orientation}'
            chapter_spec = spec['chapters'][chapter]
            for scene_index, scene in enumerate(chapter_spec['scenes']):
                concept = concepts[scene['concept_id']]
                cue_count = max(1, len(concept.get('cues', [])))
                span = 12.0 / cue_count
                cue_indices = sorted(set([0, cue_count - 1]))
                scene_windows = []
                for cue_index in cue_indices:
                    start_local = min(11.2, cue_index * span + 0.05)
                    first_jpeg = last_jpeg = None
                    hashes = set()
                    observed = None
                    for fi in range(FRAMES_PER_WINDOW):
                        local = min(11.95, start_local + fi / FPS)
                        t = scene_index * 12.0 + local
                        item = page.evaluate('(a)=>window.frame(a.job,a.t)', {'job': job, 't': t})
                        observed = item['result']
                        if observed['issues']:
                            raise RuntimeError(f"render issues {job} {scene['concept_id']} {t}: {observed['issues']}")
                        jpeg = base64.b64decode(item['jpeg'])
                        hashes.add(hashlib.sha256(jpeg).hexdigest())
                        if first_jpeg is None:
                            first_jpeg = jpeg
                        last_jpeg = jpeg
                        assert proc.stdin is not None
                        proc.stdin.write(jpeg)
                        total_frames += 1
                    delta = image_delta(first_jpeg, last_jpeg)
                    scene_windows.append({
                        'cue_index': cue_index,
                        'start_local_seconds': round(start_local, 3),
                        'duration_seconds': WINDOW_SECONDS,
                        'unique_encoded_source_frames': len(hashes),
                        'first_to_last_mean_rgb_delta': delta,
                    })
                moving = [w for w in scene_windows if w['unique_encoded_source_frames'] > 2 and w['first_to_last_mean_rgb_delta'] > 0.02]
                windows.append({
                    'job_id': job,
                    'concept_id': scene['concept_id'],
                    'family': observed['family'],
                    'topology': observed['topology'],
                    'windows': scene_windows,
                    'motion_windows_pass': len(moving),
                })
    finally:
        if proc.stdin:
            proc.stdin.close()
        rc = proc.wait()
    if rc != 0:
        raise SystemExit(f'ffmpeg failed for {orientation}: {rc}')
    static_concepts = [w['concept_id'] for w in windows if w['motion_windows_pass'] == 0]
    if static_concepts:
        raise SystemExit(f'no observed encoded-source motion for {orientation}: {static_concepts}')
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,duration,nb_frames',
        '-of', 'json', str(out_path)
    ], text=True))['streams'][0]
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(out_path), '-f', 'null', '-'], check=True)
    return {
        'orientation': orientation,
        'path': out_path.name,
        'sha256': sha256(out_path),
        'size_bytes': out_path.stat().st_size,
        'frames_written': total_frames,
        'concepts': len(windows),
        'static_concepts': static_concepts,
        'ffprobe': probe,
        'full_decode': 'PASS',
        'motion_windows': windows,
    }


def main() -> None:
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise SystemExit('ffmpeg and ffprobe are required')
    exe = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    if not exe:
        raise SystemExit('system Chromium/Chrome is required')
    OUT.mkdir(parents=True, exist_ok=True)
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    register = json.loads(REGISTER.read_text(encoding='utf-8'))
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1920, 'height': 1920}, device_scale_factor=1)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(bundled_page())
        page.wait_for_function('window.ready===true', timeout=15000)
        setup = page.evaluate('(a)=>window.setup(a.spec,a.register)', {'spec': spec, 'register': register})
        reports = [encode_orientation(page, spec, register, o) for o in ('horizontal', 'vertical')]
        browser.close()
    if errors:
        raise SystemExit(f'browser errors: {errors}')
    result = {
        'unit': 'seguridad-ia',
        'scope': 'bounded encoded H/V motion probe across all 30 canonical concepts; diagnostic evidence, not final outputs or Technical GOLDEN',
        'fps': FPS,
        'window_seconds': WINDOW_SECONDS,
        'setup': setup,
        'browser_errors': errors,
        'outputs': reports,
    }
    (OUT / 'seguridad-encoded-motion-report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'outputs': len(reports),
        'concepts_per_orientation': reports[0]['concepts'],
        'frames_total': sum(r['frames_written'] for r in reports),
        'full_decode': [r['full_decode'] for r in reports],
        'static_concepts': [r['static_concepts'] for r in reports],
        'sha256': [r['sha256'] for r in reports],
    }))


if __name__ == '__main__':
    main()
