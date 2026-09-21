#!/usr/bin/env python3
"""Rebuild Chapter 1 ES/EN visual media with a mobile-safe throughput gate.

The canonical generator remains the source for every scene and rendering primitive.
This focused repair only widens the final THROUGHPUT node so its >=68 px material
label fits without clipping. VOICE remains deferred to the owner-local lane.
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
spec = importlib.util.spec_from_file_location('inference_media_base_ch1', GEN_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError('cannot load inference visual-media generator')
gen = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = gen
spec.loader.exec_module(gen)

SLUG = '01-prefill-vs-decode-ttft-tpot-throughput-latency-budget'
THROUGHPUT_NODE_WIDTH = 620


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def install_override() -> None:
    original = gen.base.node

    def node_with_throughput_budget(draw, center, value, **kwargs):
        if str(value).strip().upper() == 'THROUGHPUT':
            kwargs['w'] = max(int(kwargs.get('w', 440)), THROUGHPUT_NODE_WIDTH)
        return original(draw, center, value, **kwargs)

    gen.base.node = node_with_throughput_budget


def render(root: Path) -> None:
    install_override()
    chapter = gen.CHAPTERS[0]
    with tempfile.TemporaryDirectory(prefix='s5-inference-ch1-frames-') as tmp:
        tmp_root = Path(tmp)
        es = root / 'es'
        en = root / 'en'
        es.mkdir(parents=True, exist_ok=True)
        en.mkdir(parents=True, exist_ok=True)
        gen.render_video(0, chapter, 'es', es, tmp_root)
        gen.render_video(0, chapter, 'en', en, tmp_root)


def repo_targets() -> dict[str, Path]:
    return {
        'es_jpg': ROOT / 'docs/series/llm-inference-engineering-economics' / f'{SLUG}.jpg',
        'es_mp4': ROOT / 'docs/series/llm-inference-engineering-economics' / f'{SLUG}.mp4',
        'en_jpg': ROOT / 'locales/en/series/llm-inference-engineering-economics' / f'{SLUG}.jpg',
        'en_mp4': ROOT / 'locales/en/series/llm-inference-engineering-economics' / f'{SLUG}.mp4',
    }


def generated_targets(root: Path) -> dict[str, Path]:
    return {
        'es_jpg': root / 'es' / f'{SLUG}.jpg',
        'es_mp4': root / 'es' / f'{SLUG}.mp4',
        'en_jpg': root / 'en' / f'{SLUG}.jpg',
        'en_mp4': root / 'en' / f'{SLUG}.mp4',
    }


def emit(root: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for key, source in generated_targets(root).items():
        target = destination / f'{key}-{source.name}'
        shutil.copy2(source, target)
    print(f'PASS: emitted Ch1 ES/EN visual MP4+poster candidate to {destination}; no voice generated.')


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--write', action='store_true')
    group.add_argument('--check', action='store_true')
    group.add_argument('--emit', type=Path)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='s5-inference-ch1-media-') as tmp:
        out = Path(tmp)
        render(out)
        generated = generated_targets(out)
        targets = repo_targets()
        if args.emit is not None:
            emit(out, args.emit)
            return 0
        if args.write:
            for key, target in targets.items():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(generated[key], target)
            print('PASS: regenerated Ch1 ES/EN visual MP4+poster with a 620 px throughput node; no voice generated.')
            return 0
        mismatches = [key for key in targets if not targets[key].is_file() or sha(targets[key]) != sha(generated[key])]
        if mismatches:
            print('FAIL: Ch1 media diverges from throughput-safe repair source: ' + ', '.join(mismatches), file=sys.stderr)
            return 1
        print('PASS: Ch1 ES/EN MP4+poster exactly match the throughput-safe repair source; no voice generated.')
        return 0


if __name__ == '__main__':
    raise SystemExit(main())
