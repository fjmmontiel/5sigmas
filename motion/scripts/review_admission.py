#!/usr/bin/env python3
"""Fail-closed admission of exact, independently inspected MP4s to owner review.

A successful render/decode is NOT review approval. This module validates evidence
and delivery, not aesthetics by itself. The independent critic must actually
inspect the encoded media; renderer-emitted PASS fields are never consumed.
Private QA/delivery receipts are runtime inputs, never committed to public git.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
import sys
import zipfile

RUBRIC = '5sigmas-review-admission-v2'
GATES = ('factual_sources', 'schema', 'text_visual_sync', 'palette_style',
         'readability_layout', 'semantic_motion', 'intra_video_diversity',
         'series_diversity', 'localization_hv', 'accessibility', 'encoded_visual_review')
# Concrete dispatcher aliases, not author-assigned perceptual-family names.
FUNDAMENTOS_HANDLERS = {
    'lattice':'drawGraph', 'hub':'drawGraph',
    'comparison-grid':'drawGrid', 'output-space':'drawGrid',
    'control-loop':'drawLoop', 'cycle':'drawLoop',
    'parallel-pipeline':'drawPipeline', 'parallel-lanes':'drawPipeline',
}
# Seguridad has several distinct topology labels backed by the same concrete
# mechanism implementation. Count the implementation, not the label.
SEGURIDAD_HANDLERS = {
    'directed_path':'directedPath',
    'ordered_levels':'orderedLevels',
    'two_domains_single_validated_bridge':'twoDomainsBridge',
    'finite_state_machine':'finiteStateMachine',
    'two_parallel_lanes':'parallelLanes',
    'three_parallel_lanes':'parallelLanes',
}
SHA = re.compile(r'^[0-9a-f]{64}$')


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b''): h.update(data)
    return h.hexdigest()


def digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'),
                                     ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def asset_binding(manifest: dict) -> str:
    return digest({k: manifest.get(k) for k in ('unit', 'source_head', 'inventory')})


def safe_file(root: Path, name: str) -> Path:
    root = root.resolve()
    path = (root / name).resolve()
    if not path.is_relative_to(root): raise ValueError('path outside evidence root')
    return path


def numbered(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _seguridad_handler_checks(inventory: list[dict], fail) -> None:
    """Structural anti-gaming checks; not a substitute for encoded visual review."""
    per_chapter: dict[str, set[tuple]] = {}
    for row in inventory:
        scenes = row.get('scenes', [])
        if not isinstance(scenes, list) or len(scenes) != 5:
            fail('MISSING_SEGURIDAD_SCENE_MECHANISM_BINDING', row.get('mp4'))
            continue
        signature = tuple((s.get('concept_id'), s.get('declared_family'), s.get('topology')) for s in scenes)
        if any(not all(item) for item in signature):
            fail('INCOMPLETE_SEGURIDAD_SCENE_MECHANISM_BINDING', row.get('mp4'))
            continue
        per_chapter.setdefault(str(row.get('chapter')), set()).add(signature)
    for chapter, signatures in per_chapter.items():
        if len(signatures) != 1:
            fail('SEGURIDAD_SCENE_MECHANISM_PARITY_MISMATCH', chapter)

    canonical = [row for row in inventory if row.get('locale') == 'es' and row.get('orientation') == 'horizontal']
    handlers = Counter()
    for row in canonical:
        for scene in row.get('scenes', []):
            topology = scene.get('topology')
            if topology:
                handlers[SEGURIDAD_HANDLERS.get(topology, topology)] += 1
    if not handlers:
        fail('MISSING_SEGURIDAD_HANDLER_EVIDENCE')
        return
    for handler, uses in sorted(handlers.items()):
        if uses >= 3:
            fail('EXCESSIVE_SEGURIDAD_HANDLER_REUSE', f'{handler}/{uses}')


def assess(manifest: dict, media_root: Path, qa: dict | None = None,
           delivery: dict | None = None, evidence_root: Path | None = None) -> dict:
    """Assess a complete package. Missing/invalid inputs cannot become a pass.

    Content and Drive delivery are independent phases: content_ready permits
    staging MP4s; only review_ready permits announcing them to the owner.
    Caller must also retain the existing source-derived chapter/matrix checks.
    """
    errors: list[str] = []
    def fail(code, detail=''):
        errors.append(code + (':' + str(detail) if detail else ''))
    inventory = manifest.get('inventory', [])
    if not isinstance(inventory, list) or not inventory:
        return {'rubric':RUBRIC, 'content_ready':False, 'review_ready':False,
                'errors':['EMPTY_INVENTORY'], 'state':'CHANGES_REQUIRED'}
    keys = [(r.get('chapter'), r.get('locale'), r.get('orientation')) for r in inventory]
    if len(set(keys)) != len(keys): fail('DUPLICATE_OUTPUT_IDENTITY')
    expected = {(c, l, o) for c in {r.get('chapter') for r in inventory}
                for l in ('es', 'en') for o in ('horizontal', 'vertical')}
    if set(keys) != expected: fail('INCOMPLETE_ES_EN_HV_MATRIX')
    if manifest.get('outputs') != len(inventory): fail('OUTPUT_COUNT_MISMATCH')
    names = [r.get('mp4') for r in inventory]
    if len(set(names)) != len(names): fail('DUPLICATE_MP4_NAME')
    for r in inventory:
        name = r.get('mp4', '')
        try:
            path = safe_file(media_root, name)
            if path.suffix.lower() != '.mp4' or not path.is_file():
                fail('MISSING_MP4', name); continue
            if sha256(path) != r.get('sha256'): fail('STALE_MEDIA_HASH', name)
            if path.stat().st_size != r.get('size_bytes'): fail('SIZE_MISMATCH', name)
        except (ValueError, OSError, TypeError): fail('INVALID_MEDIA_PATH', name)
    bound = asset_binding(manifest)
    qa = qa or {}
    if qa.get('rubric') != RUBRIC: fail('MISSING_CURRENT_QA_RUBRIC')
    if qa.get('asset_binding_sha256') != bound: fail('STALE_QA_BINDING')
    critic = qa.get('critic', {})
    if (critic.get('role') != 'independent_encoded_media_review'
        or not critic.get('run_id') or not critic.get('generator_run_id')
        or critic.get('run_id') == critic.get('generator_run_id')
        or not critic.get('evaluator_revision')): fail('NO_INDEPENDENT_CRITIC')
    for gate in GATES:
        proof = qa.get('gates', {}).get(gate, {})
        if proof.get('status') != 'PASS': fail('GATE_NOT_PASS', gate)
        if not proof.get('findings') or proof.get('method') in (None, '', 'renderer-self-report', 'pixel-delta-only', 'contact-sheet-only'):
            fail('INSUFFICIENT_GATE_EVIDENCE', gate)
        receipt = proof.get('receipt', {})
        try:
            if evidence_root is None: raise ValueError('missing evidence root')
            p = safe_file(evidence_root, receipt.get('path', ''))
            if not p.is_file() or not SHA.fullmatch(receipt.get('sha256', '')) or sha256(p) != receipt['sha256']:
                raise ValueError('missing/stale receipt')
        except (OSError, TypeError, ValueError): fail('MISSING_OR_STALE_RECEIPT', gate)
    observations = qa.get('outputs', [])
    if not isinstance(observations, list): observations = []
    if len(observations) != len(inventory) or len({x.get('mp4') for x in observations}) != len(observations):
        fail('INCOMPLETE_OUTPUT_REVIEW')
    by_name = {x.get('mp4'):x for x in observations}
    for r in inventory:
        proof = by_name.get(r['mp4'], {})
        if proof.get('sha256') != r['sha256']: fail('OUTPUT_REVIEW_HASH_MISMATCH', r['mp4'])
        cues = r.get('text_visual_cues', [])
        seen = proof.get('cue_observations', [])
        if not cues or len({x.get('id') for x in cues}) != len(cues):
            fail('MISSING_OR_DUPLICATE_AUTHORED_CUES', r['mp4']); continue
        if len(seen) != len(cues) or {x.get('id') for x in seen} != {x.get('id') for x in cues}:
            fail('INCOMPLETE_CUE_REVIEW', r['mp4']); continue
        fps = r.get('fps', r.get('frames', 0) / max(r.get('duration_seconds', 1), .001))
        if not numbered(fps) or fps <= 0: fail('INVALID_FPS', r['mp4']); continue
        observed = {x['id']:x for x in seen}
        for cue in cues:
            obs = observed[cue['id']]
            if not cue.get('sentence_id') or not cue.get('visual_target_id'):
                fail('UNBOUND_SEMANTIC_CUE', cue['id'])
            for channel in ('text', 'visual'):
                exp, actual = cue.get(channel + '_at'), obs.get(channel + '_at')
                if not numbered(exp) or not numbered(actual) or abs(exp-actual) > 1/fps + 1e-6:
                    fail('CUE_TIMING_MISMATCH', cue['id'] + '/' + channel)
            if obs.get('semantics_match') is not True or obs.get('reading_hold_verified') is not True:
                fail('CUE_SEMANTICS_OR_READING_FAILED', cue['id'])
            if obs.get('sample_phases') != ['before', 'during', 'after']:
                fail('INCOMPLETE_ENCODED_CUE_SAMPLING', cue['id'])
    if manifest.get('unit') == 'fundamentos-ia-iag':
        canonical = [s for r in inventory if r.get('locale') == 'es' and r.get('orientation') == 'horizontal' for s in r.get('scenes', [])]
        groups = {}
        for scene in canonical:
            style = scene.get('visual_style', '')
            handler = FUNDAMENTOS_HANDLERS.get(style, style)
            groups.setdefault(handler, []).append(scene)
        for handler, scenes in groups.items():
            if len({s.get('family') for s in scenes}) > 1:
                fail('ALIASED_HANDLER_COUNTED_AS_DISTINCT_FAMILIES', handler)
            if len(scenes) >= 4: fail('EXCESSIVE_HANDLER_REUSE', handler)
    if manifest.get('unit') == 'seguridad-ia':
        _seguridad_handler_checks(inventory, fail)
    content_ready = not errors
    delivery = delivery or {}
    if delivery.get('asset_binding_sha256') != bound: fail('STALE_OR_MISSING_DELIVERY_BINDING')
    files = delivery.get('files', [])
    if not isinstance(files, list): files = []
    mapped = {f.get('mp4'):f for f in files}
    if len(files) != len(inventory) or len(mapped) != len(files) or len({f.get('file_id') for f in files}) != len(files):
        fail('INCOMPLETE_INDIVIDUAL_MP4_DELIVERY')
    for r in inventory:
        f = mapped.get(r['mp4'], {})
        if (f.get('mime_type') != 'video/mp4' or f.get('sha256_readback') != r['sha256']
            or f.get('size_bytes') != r['size_bytes'] or not f.get('file_id')
            or not str(f.get('playback_url', '')).startswith('https://drive.google.com/file/d/')
            or f.get('playback_verified') is not True or f.get('parent_verified') is not True):
            fail('MP4_NOT_READY_IN_DRIVE', r['mp4'])
    return {'rubric':RUBRIC, 'asset_binding_sha256':bound, 'content_ready':content_ready,
            'review_ready':not errors, 'state':'REVIEW_READY' if not errors else 'CHANGES_REQUIRED',
            'errors':errors}


def finalize_package(package: Path, media: Path, *, internal_only=False) -> dict:
    """Called by packagers before returning success. Rewrites embedded states too.

    Internal diagnostic packaging may succeed explicitly, but cannot produce a
    REVIEW_READY state, even when legacy validators reported PASS.
    """
    manifest_path = package / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    def load(name):
        p = package / name
        return json.loads(p.read_text()) if p.is_file() else None
    decision = assess(manifest, media, load('independent-qa.json'), load('drive-delivery.json'), package)
    manifest.update(state=decision['state'], review_ready=decision['review_ready'],
                    review_admission=decision, technical_golden=False, published=False)
    if not decision['review_ready']: manifest['owner_visual_approval'] = 'NOT_REQUESTED'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    (package/'review-admission.json').write_text(json.dumps(decision, indent=2)+'\n')
    for archive in package.glob('*review-candidate.zip'):
        replacement = archive.with_suffix('.tmp')
        with zipfile.ZipFile(archive) as src, zipfile.ZipFile(replacement, 'w', zipfile.ZIP_DEFLATED) as dst:
            for item in src.infolist():
                if item.filename not in ('manifest.json', 'review-admission.json'):
                    dst.writestr(item, src.read(item.filename))
            dst.write(manifest_path, 'manifest.json')
            dst.write(package/'review-admission.json', 'review-admission.json')
        replacement.replace(archive)
        summary_path = package/'summary.json'
        summary = load('summary.json') or {}
        summary.update(state=decision['state'], review_ready=decision['review_ready'],
                       package_sha256=sha256(archive), package_size_bytes=archive.stat().st_size)
        summary_path.write_text(json.dumps(summary, indent=2)+'\n')
    print(json.dumps(decision))
    if not decision['review_ready'] and not internal_only:
        raise SystemExit('REVIEW BLOCKED: inspect review-admission.json; --internal-only is diagnostic, never owner review')
    return decision


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package', type=Path)
    parser.add_argument('media', type=Path)
    parser.add_argument('--internal-only', action='store_true')
    args = parser.parse_args()
    finalize_package(args.package, args.media, internal_only=args.internal_only)
