#!/usr/bin/env python3
"""Rebuild the Chapter 6 ES/EN visual media with mobile-safe labels.

The base generator remains the source of rendering primitives. This focused repair closes
an observed EN single-token overflow (`Measurements`) and the awkward `Tokens / s` wrap
without changing voice/audio: VOICE remains deferred to the owner-local lane.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN_PATH = ROOT / 'scripts/generate_inference_engineering_visual_media.py'
spec = importlib.util.spec_from_file_location('inference_media_base', GEN_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError('cannot load inference visual-media generator')
gen = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = gen
spec.loader.exec_module(gen)

SLUG = '06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints'
GEN_FLOWS = {
    'es': (('flow', ('Workload', 'Servidor', 'Mediciones')), ('merge', ('Latencia', 'Tokens/s', 'Energía')), ('gates', ('p95 SLO', 'Coste / task', 'ACCEPT'))),
    'en': (('flow', ('Workload', 'Server', 'Metrics')), ('merge', ('Latency', 'Tokens/s', 'Energy')), ('gates', ('p95 SLO', 'Cost / task', 'ACCEPT'))),
}

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def install_override() -> None:
    gen.FLOWS[5] = GEN_FLOWS

def render(root: Path) -> None:
    install_override()
    chapter = gen.CHAPTERS[5]
    with tempfile.TemporaryDirectory(prefix='s5-inference-ch6-frames-') as tmp:
        tmp_root = Path(tmp)
        es = root / 'es'; en = root / 'en'; es.mkdir(parents=True, exist_ok=True); en.mkdir(parents=True, exist_ok=True)
        gen.render_video(5, chapter, 'es', es, tmp_root)
        gen.render_video(5, chapter, 'en', en, tmp_root)

def repo_targets() -> dict[str, Path]:
    return {
        'es_jpg': ROOT / 'docs/series/llm-inference-engineering-economics' / f'{SLUG}.jpg',
        'es_mp4': ROOT / 'docs/series/llm-inference-engineering-economics' / f'{SLUG}.mp4',
        'en_jpg': ROOT / 'locales/en/series/llm-inference-engineering-economics' / f'{SLUG}.jpg',
        'en_mp4': ROOT / 'locales/en/series/llm-inference-engineering-economics' / f'{SLUG}.mp4',
    }

def generated_targets(root: Path) -> dict[str, Path]:
    return {
        'es_jpg': root / 'es' / f'{SLUG}.jpg', 'es_mp4': root / 'es' / f'{SLUG}.mp4',
        'en_jpg': root / 'en' / f'{SLUG}.jpg', 'en_mp4': root / 'en' / f'{SLUG}.mp4',
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.write == args.check:
        parser.error('choose exactly one of --write or --check')
    with tempfile.TemporaryDirectory(prefix='s5-inference-ch6-media-') as tmp:
        out = Path(tmp); render(out); generated = generated_targets(out); targets = repo_targets()
        if args.write:
            for key, target in targets.items(): target.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(generated[key], target)
            print('PASS: regenerated Ch6 ES/EN visual MP4+poster with mobile-safe labels; no voice generated.')
            return 0
        mismatches = [key for key in targets if not targets[key].is_file() or sha(targets[key]) != sha(generated[key])]
        if mismatches:
            print('FAIL: Ch6 media diverges from mobile-safe repair source: ' + ', '.join(mismatches), file=sys.stderr)
            return 1
        print('PASS: Ch6 ES/EN MP4+poster exactly match the mobile-safe repair source; no voice generated.')
        return 0

if __name__ == '__main__':
    raise SystemExit(main())
