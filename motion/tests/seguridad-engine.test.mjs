import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { seguridadRenderMatrix, seguridadFrameState, validateSeguridadMechanismCoverage, indexSeguridadRegister } from '../src/seguridad/engine.mjs';
import { compileSeguridadMechanism, SUPPORTED_SEGURIDAD_TOPOLOGIES } from '../src/seguridad/mechanisms.mjs';

const spec = JSON.parse(fs.readFileSync('motion/migration/seguridad-ia-content-v1.json', 'utf8'));
const register = JSON.parse(fs.readFileSync('motion/migration/seguridad-ia-series-register.json', 'utf8'));

function numericGeometry(plan) {
  const values = [];
  for (const node of plan.geometry.nodes ?? []) values.push(['node', node.x, node.y]);
  for (const zone of plan.geometry.zones ?? []) values.push(['zone', zone.x, zone.y, zone.w, zone.h]);
  for (const path of plan.geometry.paths ?? []) for (const p of path) values.push(['point', p[0], p[1]]);
  return values;
}

test('render matrix is exactly six chapters x two locales x two native orientations', () => {
  const jobs = seguridadRenderMatrix(spec, register);
  assert.equal(jobs.length, 24);
  assert.equal(new Set(jobs.map(job => job.id)).size, 24);
  assert.equal(jobs.filter(job => job.orientation === 'horizontal').length, 12);
  assert.equal(jobs.filter(job => job.orientation === 'vertical').length, 12);
  for (const job of jobs) {
    assert.equal(job.fps, 60);
    assert.equal(job.durationSeconds, 60);
    if (job.orientation === 'horizontal') assert.deepEqual([job.width, job.height], [1920, 1080]);
    else assert.deepEqual([job.width, job.height], [1080, 1920]);
  }
});

test('all 30 semantic concepts compile H/V and diversity counts real handlers rather than labels', () => {
  const evidence = validateSeguridadMechanismCoverage(spec, register);
  assert.equal(evidence.concepts, 30);
  assert.equal(evidence.declaredFamilies, 27);
  assert.equal(evidence.effectiveHandlerFamilies, 25);
  assert.equal(evidence.maxDeclaredFamilyUse, 2);
  assert.equal(evidence.maxHandlerUse, 2);
  assert.deepEqual(evidence.aliasedDeclaredFamilies, [
    {handler:'orderedLevels', declaredFamilies:['outcome_ladder','privilege_ladder'], uses:2},
    {handler:'parallelLanes', declaredFamilies:['parallel_evidence_lanes','parallel_mechanism_compare'], uses:2}
  ]);

  const concepts = indexSeguridadRegister(register);
  for (const concept of concepts.values()) {
    assert.ok(SUPPORTED_SEGURIDAD_TOPOLOGIES.includes(concept.topology), `${concept.id}: ${concept.topology}`);
    for (const orientation of ['horizontal', 'vertical']) {
      for (const t of [0, 3, 6, 9, 11.999]) {
        const plan = compileSeguridadMechanism(concept, { orientation, localSeconds: t, durationSeconds: 12 });
        assert.equal(plan.conceptId, concept.id);
        assert.equal(plan.family, concept.perceptual_family);
        assert.equal(plan.topology, concept.topology);
        assert.equal(plan.orientation, orientation);
        for (const item of numericGeometry(plan)) {
          for (const value of item.slice(1)) assert.ok(Number.isFinite(value), `${concept.id}/${orientation}: non-finite geometry`);
          if (item[0] === 'node' || item[0] === 'point') {
            assert.ok(item[1] >= 0 && item[1] <= 1000, `${concept.id}/${orientation}: x=${item[1]}`);
            assert.ok(item[2] >= 0 && item[2] <= 800, `${concept.id}/${orientation}: y=${item[2]}`);
          }
          if (item[0] === 'zone') {
            assert.ok(item[1] >= 0 && item[2] >= 0 && item[3] > 0 && item[4] > 0);
            assert.ok(item[1] + item[3] <= 1000, `${concept.id}/${orientation}: zone width overflow`);
            assert.ok(item[2] + item[4] <= 800, `${concept.id}/${orientation}: zone height overflow`);
          }
        }
      }
    }
  }
});

test('renaming families cannot hide a repeated real handler', () => {
  const mutated = structuredClone(register);
  const aliases = [
    ['S00-C3','fake_family_a'],
    ['S02-C4','fake_family_b']
  ];
  for (const [id, family] of aliases) {
    for (const chapter of mutated.chapters) {
      const concept = chapter.concepts.find(item => item.id === id);
      if (concept) concept.perceptual_family = family;
    }
  }
  const evidence = validateSeguridadMechanismCoverage(spec, mutated);
  assert.equal(evidence.maxHandlerUse, 2);
  assert.ok(evidence.aliasedDeclaredFamilies.some(row => row.handler === 'orderedLevels' && row.uses === 2));
});

test('a third topology alias to the same real handler fails the family cap', () => {
  const mutated = structuredClone(register);
  const concept = mutated.chapters[0].concepts[0];
  concept.topology = 'three_parallel_lanes';
  concept.perceptual_family = 'totally_new_name';
  assert.throws(() => validateSeguridadMechanismCoverage(spec, mutated), /real handler repeat 3 exceeds cap/);
});

test('seek/replay is deterministic and independent of call order', () => {
  const id = 'seguridad-ia-01-es-horizontal';
  const forward = [0, 5, 12, 23.5, 37, 59.999].map(t => seguridadFrameState(spec, register, id, t));
  const reverse = [59.999, 37, 23.5, 12, 5, 0].map(t => seguridadFrameState(spec, register, id, t)).reverse();
  assert.deepEqual(forward, reverse);
  const replay = seguridadFrameState(spec, register, id, 23.5);
  assert.deepEqual(replay, forward[3]);
  assert.equal(replay.scene.conceptId, 'S01-C2');
  assert.equal(replay.sceneIndex, 1);
});

test('native vertical is recomposed rather than scaled horizontal geometry', () => {
  const horizontal = seguridadFrameState(spec, register, 'seguridad-ia-00-es-horizontal', 6);
  const vertical = seguridadFrameState(spec, register, 'seguridad-ia-00-es-vertical', 6);
  assert.deepEqual([horizontal.job.width, horizontal.job.height], [1920, 1080]);
  assert.deepEqual([vertical.job.width, vertical.job.height], [1080, 1920]);
  assert.notDeepEqual(horizontal.scene.mechanism.geometry, vertical.scene.mechanism.geometry);
});

test('reduced motion resolves semantic state without transitional choreography', () => {
  const state = seguridadFrameState(spec, register, 'seguridad-ia-03-en-vertical', 0, { reducedMotion: true });
  assert.equal(state.reducedMotion, true);
  for (const cue of state.scene.mechanism.cueProgress) {
    assert.equal(cue.progress, 1);
    assert.equal(cue.active, false);
  }
});

test('unsupported topology fails closed', () => {
  const concept = structuredClone(register.chapters[0].concepts[0]);
  concept.topology = 'generic_boxes_and_arrows';
  assert.throws(() => compileSeguridadMechanism(concept), /no semantic builder/);
});

test('time bounds select stable first/last scenes', () => {
  const first = seguridadFrameState(spec, register, 'seguridad-ia-05-en-horizontal', -10);
  const last = seguridadFrameState(spec, register, 'seguridad-ia-05-en-horizontal', 999);
  assert.equal(first.scene.conceptId, 'S05-C1');
  assert.equal(first.timeSeconds, 0);
  assert.equal(last.scene.conceptId, 'S05-C5');
  assert.equal(last.timeSeconds, 60);
  assert.equal(last.localSeconds, 12);
});
