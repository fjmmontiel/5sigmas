#!/usr/bin/env python3
"""Render Seguridad IA through its actual browser ESM graph and inspect H/V layouts."""
from __future__ import annotations
import base64, io, json, re, shutil
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'migration/seguridad-ia-content-v1.json'
REGISTER = ROOT / 'migration/seguridad-ia-series-register.json'
HTML = ROOT / 'web/seguridad-render.html'
OUT = ROOT / 'dist/seguridad-ia-check'


def bundled_page() -> str:
    def rewrite(js: str, parent: Path) -> str:
        def replace(match):
            target = (parent / match.group(2)).resolve()
            if not target.is_relative_to(ROOT):
                raise ValueError(f'module escapes motion root: {target}')
            return match.group(1) + '"@5sigmas/' + target.relative_to(ROOT).as_posix() + '"'
        return re.sub(r'(from\s+|import\s+)[\"\'](\.[^\"\']+)[\"\']', replace, js)

    modules = {
        '@5sigmas/' + path.relative_to(ROOT).as_posix(): rewrite(path.read_text(encoding='utf-8'), path.parent)
        for path in sorted((ROOT / 'src').rglob('*.mjs'))
    }
    html = HTML.read_text(encoding='utf-8')
    init = re.search(r'<script type="module">(.*?)</script>', html, re.S).group(1)
    init = rewrite(init, HTML.parent)
    payload = json.dumps(modules, ensure_ascii=False).replace('</', '<\\/')
    init_payload = json.dumps(init, ensure_ascii=False).replace('</', '<\\/')
    boot = """<script>
    const modules=__MODULES__; const imports={};
    for(const [id,source] of Object.entries(modules)) imports[id]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
    const start=document.createElement('script');start.type='module';start.textContent=__INIT__;document.body.append(start);
    </script>""".replace('__MODULES__', payload).replace('__INIT__', init_payload)
    return re.sub(r'<script type="module">.*?</script>', lambda _: boot, html, flags=re.S)


def authored_chapter(chapter: int) -> dict | None:
    path = ROOT / 'src' / 'seguridad' / f'chapter{chapter:02d}-data.mjs'
    if not path.is_file():
        return None
    text = path.read_text(encoding='utf-8')
    match = re.search(r'export const CHAPTER\d+ = (\{.*\});\s*
    tiles = []
    samples = []
    for chapter in range(6):
        job = f'seguridad-ia-{chapter:02d}-es-{orientation}'
        for scene in range(5):
            t = scene * 12 + 6
            item = page.evaluate('(a)=>window.frame(a.job,a.t)', {'job': job, 't': t})
            im = Image.open(io.BytesIO(base64.b64decode(item['jpeg']))).convert('RGB')
            if orientation == 'horizontal':
                im.thumbnail((420, 250))
            else:
                im.thumbnail((250, 420))
            tiles.append((job, scene + 1, t, im.copy(), item['result']))
            samples.append({
                'job': job,
                'scene': scene + 1,
                'time': t,
                'family': item['result']['family'],
                'topology': item['result']['topology'],
                'choreography_profile': item['result']['choreographyProfile'],
                'mechanism_label_embed_px': item['result']['mechanismLabelEmbedPx'],
            })

    cols = 5
    tile_w = max(im.width for *_, im, _ in tiles)
    tile_h = max(im.height for *_, im, _ in tiles) + 72
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tile_w + 40, rows * tile_h + 30), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, (job, scene, t, im, result) in enumerate(tiles):
        x = 20 + (i % cols) * tile_w
        y = 15 + (i // cols) * tile_h
        label = f'{job.split("-")[2]} · S{scene} · {result["family"]}'
        draw.text((x, y), label, fill='black')
        draw.text((x, y + 20), f'{result["topology"]} · {result["choreographyProfile"]}', fill='black')
        draw.text((x, y + 40), f'{t:.0f}s · label {result["mechanismLabelEmbedPx"]:.1f}px', fill='black')
        sheet.paste(im, (x, y + 64))
    sheet.save(target, quality=91)
    return samples


def main() -> None:
    if not (shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')):
        raise SystemExit('system Chromium/Chrome is required')
    OUT.mkdir(parents=True, exist_ok=True)
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    register = json.loads(REGISTER.read_text(encoding='utf-8'))
    errors: list[str] = []
    with sync_playwright() as p:
        exe = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
        browser = p.chromium.launch(executable_path=exe, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1920, 'height': 1920}, device_scale_factor=1)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(bundled_page())
        page.wait_for_function('window.ready===true', timeout=15000)
        setup = page.evaluate('(a)=>window.setup(a.spec,a.register)', {'spec': spec, 'register': register})
        sampled = []
        issues = []
        profiles = set()
        body_sizes = []
        mechanism_scales = []
        mechanism_label_sizes = []
        for chapter in range(6):
            for locale in ('es', 'en'):
                for orientation in ('horizontal', 'vertical'):
                    job = f'seguridad-ia-{chapter:02d}-{locale}-{orientation}'
                    for scene_index, t in chapter_scene_samples(chapter):
                        row = page.evaluate('(a)=>window.draw(a.job,a.t)', {'job': job, 't': t})
                        sampled.append(row)
                        for issue in row.get('issues', []):
                            issues.append({'jobId': job, 'scene': row.get('scene', scene_index), 'timeSeconds': t, 'issue': issue})
                        profile = row.get('choreographyProfile', row.get('choreography', row.get('family')))
                        if profile:
                            profiles.add(profile)
                        if isinstance(row.get('bodySize'), (int, float)):
                            body_sizes.append(row['bodySize'])
                        if isinstance(row.get('mechanismScale'), (int, float)):
                            mechanism_scales.append(row['mechanismScale'])
                        if isinstance(row.get('mechanismLabelEmbedPx'), (int, float)):
                            mechanism_label_sizes.append(row['mechanismLabelEmbedPx'])
        profiles = sorted(profiles)
        report = {
            'unit': 'seguridad-ia',
            'scope': 'actual browser/canvas cue-level H/V preflight across generic and specialized renderers; not encoded MP4 or Technical GOLDEN',
            'browser': browser.version,
            'jobs': len({row['jobId'] for row in sampled}),
            'frames_sampled': len(sampled),
            'setup': setup,
            'minimum_body_px': min(body_sizes),
            'minimum_mechanism_scale': min(mechanism_scales),
            'minimum_mechanism_label_embed_px': min(mechanism_label_sizes) if mechanism_label_sizes else None,
            'choreography_profiles': profiles,
            'choreography_profile_count': len(profiles),
            'issue_count': len(issues),
            'issues': issues,
            'browser_errors': errors,
        }
        if len(profiles) < 15:
            issues.append({'jobId':'series','scene':'all','timeSeconds':0,'issue':{'type':'insufficient-choreography-profile-diversity','profiles':profiles}})
            report['issue_count'] = len(issues)
        report['horizontal_contact_sheet'] = contact_sheet(page, 'horizontal', OUT / 'seguridad-es-horizontal-contact-sheet.jpg')
        report['vertical_contact_sheet'] = contact_sheet(page, 'vertical', OUT / 'seguridad-es-vertical-contact-sheet.jpg')
        reduced = page.evaluate("()=>window.draw('seguridad-ia-05-en-vertical',54,true)")
        report['reduced_motion_sample'] = {'jobId': reduced['jobId'], 'scene': reduced['scene'], 'issues': reduced['issues']}
        (OUT / 'seguridad-render-preflight.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        browser.close()
    if errors or issues or report['reduced_motion_sample']['issues']:
        raise SystemExit(json.dumps({'browser_errors': errors, 'layout_issues': issues[:20], 'reduced_motion_issues': report['reduced_motion_sample']['issues']}, ensure_ascii=False))
    print(json.dumps({
        'jobs': report['jobs'],
        'frames_sampled': report['frames_sampled'],
        'layout_issues': 0,
        'browser_errors': 0,
        'minimum_body_px': report['minimum_body_px'],
        'minimum_mechanism_scale': report['minimum_mechanism_scale'],
        'minimum_mechanism_label_embed_px': report['minimum_mechanism_label_embed_px'],
        'choreography_profile_count': report['choreography_profile_count'],
        'contact_sheets': 2,
    }))


if __name__ == '__main__':
    main()
, text, re.S)
    if not match:
        raise RuntimeError(f'cannot parse authored chapter: {path}')
    return json.loads(match.group(1))


def chapter_scene_samples(chapter: int) -> list[tuple[int, float]]:
    authored = authored_chapter(chapter)
    if authored:
        rows = []
        for index, scene in enumerate(authored['scenes']):
            beats = scene.get('beats') or []
            if beats:
                for beat in beats:
                    at = float(scene['start']) + float(beat['at'])
                    settled = float(scene['start']) + float(beat['settledAt'])
                    rows.extend([
                        (index, max(float(scene['start']), at - 0.12)),
                        (index, at + 0.12),
                        (index, min(float(scene['end']) - 0.08, settled + 0.12)),
                    ])
            else:
                rows.append((index, (float(scene['start']) + float(scene['end'])) / 2))
        return rows
    return [(scene, scene * 12 + fraction * 12) for scene in range(5) for fraction in (.08, .45, .92)]


def result_field(result: dict, key: str, fallback=None):
    value = result.get(key, fallback)
    return fallback if value is None else value


def contact_sheet(page, orientation: str, target: Path) -> list[dict]:
    tiles = []
    samples = []
    for chapter in range(6):
        job = f'seguridad-ia-{chapter:02d}-es-{orientation}'
        seen_scene = set()
        for scene, t in chapter_scene_samples(chapter):
            item = page.evaluate('(a)=>window.frame(a.job,a.t)', {'job': job, 't': t})
            result = item['result']
            if result.get('issues'):
                raise RuntimeError(f'{job} t={t}: {result["issues"]}')
            samples.append({
                'job': job,
                'scene': result.get('scene', scene),
                'scene_index': result.get('sceneIndex', scene),
                'time': t,
                'family': result.get('family'),
                'topology': result.get('topology', result.get('family')),
                'choreography_profile': result.get('choreographyProfile', result.get('choreography', result.get('family'))),
                'mechanism_label_embed_px': result.get('mechanismLabelEmbedPx'),
                'body_size': result.get('bodySize'),
                'mechanism_scale': result.get('mechanismScale'),
            })
            # One representative visual tile per scene; cue samples remain in the report.
            scene_key = result.get('sceneIndex', scene)
            if scene_key in seen_scene:
                continue
            seen_scene.add(scene_key)
            im = Image.open(io.BytesIO(base64.b64decode(item['jpeg']))).convert('RGB')
            if orientation == 'horizontal':
                im.thumbnail((420, 250))
            else:
                im.thumbnail((250, 420))
            tiles.append((job, scene_key + 1, t, im.copy(), result))

    cols = 5
    tile_w = max(im.width for *_, im, _ in tiles)
    tile_h = max(im.height for *_, im, _ in tiles) + 72
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tile_w + 40, rows * tile_h + 30), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, (job, scene, t, im, result) in enumerate(tiles):
        x = 20 + (i % cols) * tile_w
        y = 15 + (i // cols) * tile_h
        family = result.get('family', 'unknown')
        topology = result.get('topology', family)
        choreography = result.get('choreographyProfile', result.get('choreography', family))
        label_px = result.get('mechanismLabelEmbedPx')
        label_text = f'label {label_px:.1f}px' if isinstance(label_px, (int, float)) else 'specialized'
        draw.text((x, y), f'{job.split("-")[2]} · S{scene} · {family}', fill='black')
        draw.text((x, y + 20), f'{topology} · {choreography}', fill='black')
        draw.text((x, y + 40), f'{t:.1f}s · {label_text}', fill='black')
        sheet.paste(im, (x, y + 64))
    sheet.save(target, quality=91)
    return samples


def main() -> None:
    if not (shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')):
        raise SystemExit('system Chromium/Chrome is required')
    OUT.mkdir(parents=True, exist_ok=True)
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    register = json.loads(REGISTER.read_text(encoding='utf-8'))
    errors: list[str] = []
    with sync_playwright() as p:
        exe = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
        browser = p.chromium.launch(executable_path=exe, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1920, 'height': 1920}, device_scale_factor=1)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(bundled_page())
        page.wait_for_function('window.ready===true', timeout=15000)
        setup = page.evaluate('(a)=>window.setup(a.spec,a.register)', {'spec': spec, 'register': register})
        rows = page.evaluate('window.layoutCheck()')
        issues = [{'jobId': row['jobId'], 'scene': row['scene'], 'timeSeconds': row['timeSeconds'], 'issue': issue} for row in rows for issue in row['issues']]
        profiles = sorted({row['choreographyProfile'] for row in rows})
        report = {
            'unit': 'seguridad-ia',
            'scope': 'actual browser/canvas layout and semantic-motion preflight; not encoded MP4 or Technical GOLDEN',
            'browser': browser.version,
            'jobs': len(set(row['jobId'] for row in rows)),
            'frames_sampled': len(rows),
            'setup': setup,
            'minimum_body_px': min(row['bodySize'] for row in rows),
            'minimum_mechanism_scale': min(row['mechanismScale'] for row in rows),
            'minimum_mechanism_label_embed_px': min(row['mechanismLabelEmbedPx'] for row in rows),
            'choreography_profiles': profiles,
            'choreography_profile_count': len(profiles),
            'issue_count': len(issues),
            'issues': issues,
            'browser_errors': errors,
        }
        if len(profiles) < 15:
            issues.append({'jobId':'series','scene':'all','timeSeconds':0,'issue':{'type':'insufficient-choreography-profile-diversity','profiles':profiles}})
            report['issue_count'] = len(issues)
        report['horizontal_contact_sheet'] = contact_sheet(page, 'horizontal', OUT / 'seguridad-es-horizontal-contact-sheet.jpg')
        report['vertical_contact_sheet'] = contact_sheet(page, 'vertical', OUT / 'seguridad-es-vertical-contact-sheet.jpg')
        reduced = page.evaluate("()=>window.draw('seguridad-ia-05-en-vertical',54,true)")
        report['reduced_motion_sample'] = {'jobId': reduced['jobId'], 'scene': reduced['scene'], 'issues': reduced['issues']}
        (OUT / 'seguridad-render-preflight.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        browser.close()
    if errors or issues or report['reduced_motion_sample']['issues']:
        raise SystemExit(json.dumps({'browser_errors': errors, 'layout_issues': issues[:20], 'reduced_motion_issues': report['reduced_motion_sample']['issues']}, ensure_ascii=False))
    print(json.dumps({
        'jobs': report['jobs'],
        'frames_sampled': report['frames_sampled'],
        'layout_issues': 0,
        'browser_errors': 0,
        'minimum_body_px': report['minimum_body_px'],
        'minimum_mechanism_scale': report['minimum_mechanism_scale'],
        'minimum_mechanism_label_embed_px': report['minimum_mechanism_label_embed_px'],
        'choreography_profile_count': report['choreography_profile_count'],
        'contact_sheets': 2,
    }))


if __name__ == '__main__':
    main()
