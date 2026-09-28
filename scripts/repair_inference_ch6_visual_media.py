#!/usr/bin/env python3
"""Verify exact approved I1 media, or repair legacy Chapter 6 before I1 approval.

The base generator remains the source of rendering primitives. This focused repair closes
an observed EN single-token overflow (`Measurements`) and the awkward `Tokens / s` wrap
without changing voice/audio: VOICE remains deferred to the owner-local lane.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import importlib.util
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN_PATH = ROOT / 'scripts/generate_inference_engineering_visual_media.py'

SLUG = '06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints'
GEN_FLOWS = {
    'es': (('flow', ('Workload', 'Servidor', 'Mediciones')), ('merge', ('Latencia', 'Tokens/s', 'Energía')), ('gates', ('p95 SLO', 'Coste / task', 'ACCEPT'))),
    'en': (('flow', ('Workload', 'Server', 'Metrics')), ('merge', ('Latency', 'Tokens/s', 'Energy')), ('gates', ('p95 SLO', 'Cost / task', 'ACCEPT'))),
}

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# These are the exact twelve owner-approved I1 originals, not a render-equivalence claim.
I1_PINS = {'series/llm-inference-engineering-economics/01-prefill-vs-decode-ttft-tpot-throughput-latency-budget.mp4': {'sha256': 'b5ed464edc06af5088689bd9cb2d07919f00722caf85dc10c6b01d99a12761f5', 'poster_sha256': '1f6649568ade3489bc72fb0a6e54dddaee38adec3d619e32e89feaf336c83a0b', 'bytes': 13237157}, 'en/series/llm-inference-engineering-economics/01-prefill-vs-decode-ttft-tpot-throughput-latency-budget.mp4': {'sha256': 'f377739334044a25501a798f7b69afada1e4a0268eda17d38ef96bd3729a8d56', 'poster_sha256': '08f857c38efb35336ac65872e5cb03e06411549efaf113b2f0bc53286f6db096', 'bytes': 12839504}, 'series/llm-inference-engineering-economics/02-kv-cache-memory-hierarchy-continuous-batching-pagedattention.mp4': {'sha256': '9a22cf35fc937fbd57ad9586df8138ccdf0a1edb495a3395e475408dcef49992', 'poster_sha256': 'ddefcba639d321654e094cb63c1365d174d62980a53e2f9f68febfa2bc96d2ff', 'bytes': 12388363}, 'en/series/llm-inference-engineering-economics/02-kv-cache-memory-hierarchy-continuous-batching-pagedattention.mp4': {'sha256': '8c19772423b4da469f31ef0acd77a009804e5d7fa21974dea24030020540b834', 'poster_sha256': '6e7c64767d4298a742c960885eeacbaf267654d5caf1e69bc800b6320c5447fe', 'bytes': 11970405}, 'series/llm-inference-engineering-economics/03-quantization-parallelism-memory-quality-tradeoffs.mp4': {'sha256': '95ca73d8e12a33c1212dbb298bd4631b25ebf993b9b8e0fdf7338084f97b1dac', 'poster_sha256': 'e25046eafc1cc93d5e4e52f725294cbc95cd912c8d4085008cbbfa3c67b94433', 'bytes': 12668244}, 'en/series/llm-inference-engineering-economics/03-quantization-parallelism-memory-quality-tradeoffs.mp4': {'sha256': '2dad72e318d58c4525c661a6f03eb55efe178dc764fdd2f42a4a354027682c54', 'poster_sha256': '63caaab6558823e0c6de11d9c0c229a476600a8434e71508564325db525a1473', 'bytes': 12262000}, 'series/llm-inference-engineering-economics/04-speculative-decoding-prefix-caching-latency-optimisations.mp4': {'sha256': 'b8eb6675538d66ab596036d120546fbee9352da805794687d9193489df1a390d', 'poster_sha256': 'cfcbe375f813c490ccb21b24409599d05bc1adadf8ef69a8ed81918b436b699a', 'bytes': 13039812}, 'en/series/llm-inference-engineering-economics/04-speculative-decoding-prefix-caching-latency-optimisations.mp4': {'sha256': 'b051afb88eaf0dc4fcfc2f159cc672c0ea899be1d3860fbfbb187e77bf8f0d8e', 'poster_sha256': 'd3118d66c10cb9a021768b1d2395931d156da0b8196cc71d2419c16fd4149e7d', 'bytes': 12355424}, 'series/llm-inference-engineering-economics/05-model-routing-fallback-caching-workload-aware-serving.mp4': {'sha256': '9de4903860392aa7110c179e0cb348dfa1747061942abf55b3491883c88df987', 'poster_sha256': '4c56a77f629987984bf3b7185d308388f702333a6a2881e833037d34caf24474', 'bytes': 12495213}, 'en/series/llm-inference-engineering-economics/05-model-routing-fallback-caching-workload-aware-serving.mp4': {'sha256': '04139ffce6f89650294ea767a76449ae5fb1efa7a104b06a7b7afba2a342cf53', 'poster_sha256': '528e3125950366bd01c2e1a7bcb6053b0b8c233f827b48f885b2fdca3fd2edab', 'bytes': 11980630}, 'series/llm-inference-engineering-economics/06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints.mp4': {'sha256': 'b96afa3325839af49b80de807a21401a8ed93ecbf5a3de2b8b02317f47567eab', 'poster_sha256': 'f28f6b5357bac630a83ddbe816f782815871e56afde6ffe53d5839b03b3592c4', 'bytes': 12603282}, 'en/series/llm-inference-engineering-economics/06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints.mp4': {'sha256': '899fa0e538ce9b303f8e744e46370f44c851177d51b3ed16c192c73e8a49a988', 'poster_sha256': '8164b0f671d186ed7886c8ca66f4cd5406d4f99fcf94d6c34073d45b9fc935cd', 'bytes': 12139762}}

def approved_i1_check(write_requested: bool) -> int | None:
    manifest_path = ROOT / 'docs/approved-video-batch-20260928-release.json'
    if not manifest_path.exists():
        return None
    manifest = json.loads(manifest_path.read_text())
    collections = [c for c in manifest['collections'] if c['series'] == 'llm-inference-engineering-economics']
    if not collections:
        return None
    if len(collections) != 1 or collections[0]['round'] != 'I1' or collections[0]['approved_on'] != '2026-09-27':
        raise AssertionError('Unexpected inference approval; reconcile the pinned contract explicitly')
    rows = [r for r in manifest['objects'] if r['series'] == 'llm-inference-engineering-economics']
    assert len(rows) == 12 and {r['path'] for r in rows} == set(I1_PINS)
    if write_requested:
        raise RuntimeError('I1_APPROVED_ORIGINALS_IMMUTABLE: the legacy renderer may not overwrite this release')
    for row in rows:
        pin = I1_PINS[row['path']]
        assert row['round'] == 'I1' and row['owner_approved_on'] == '2026-09-27'
        assert all(row[k] == v for k, v in pin.items()), row['path']
        media = ROOT / ('locales/' + row['path'] if row['locale'] == 'en' else 'docs/' + row['path'])
        poster = media.with_suffix('.jpg')
        assert media.stat().st_size == pin['bytes'] and sha(media) == pin['sha256'], str(media)
        assert sha(poster) == pin['poster_sha256'], str(poster)
    print('PASS: 12 exact approved I1 MP4s and 12 pinned posters; legacy regeneration prohibited.')
    return 0

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
    approved = approved_i1_check(args.write)
    if approved is not None:
        return approved
    global gen
    spec = importlib.util.spec_from_file_location('inference_media_base', GEN_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError('cannot load inference visual-media generator')
    gen = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = gen
    spec.loader.exec_module(gen)
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
