import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSeguridadRenderJobs, SEGURIDAD_RENDER_CONTRACT, validateSeguridadSpec } from '../src/seguridad/schema.mjs';

const spec = JSON.parse(readFileSync(new URL('../migration/seguridad-ia-content-v1.json', import.meta.url), 'utf8'));
const register = JSON.parse(readFileSync(new URL('../migration/seguridad-ia-series-register.json', import.meta.url), 'utf8'));

function clone(value) {
  return structuredClone(value);
}

test('Seguridad authored content and semantic register satisfy the deterministic schema', () => {
  const result = validateSeguridadSpec(spec, register);
  assert.equal(result.chapters, 6);
  assert.equal(result.concepts, 30);
  assert.ok(result.families >= 15, `expected a diversified semantic register, got ${result.families} families`);
  assert.ok(result.maxFamilyUse <= SEGURIDAD_RENDER_CONTRACT.familyRepeatCap);
});

test('Seguridad render matrix is complete across ES/EN and native H/V', () => {
  const jobs = buildSeguridadRenderJobs(spec, register);
  assert.equal(jobs.length, 24);
  assert.equal(new Set(jobs.map(job => job.id)).size, 24);
  assert.equal(jobs.filter(job => job.locale === 'es').length, 12);
  assert.equal(jobs.filter(job => job.locale === 'en').length, 12);
  assert.equal(jobs.filter(job => job.orientation === 'horizontal').length, 12);
  assert.equal(jobs.filter(job => job.orientation === 'vertical').length, 12);
  for (const job of jobs) {
    const expected = SEGURIDAD_RENDER_CONTRACT[job.orientation];
    assert.equal(job.width, expected.width);
    assert.equal(job.height, expected.height);
    assert.equal(job.fps, 60);
    assert.equal(job.durationSeconds, 60);
    assert.equal(job.reducedMotionRequired, true);
    assert.match(job.sourceBlobSha, /^[0-9a-f]{40}$/u);
  }
});

test('negative regression: a third use of one perceptual family fails closed', () => {
  const bad = clone(register);
  const c = bad.chapters[0].concepts[0];
  const d = bad.chapters[0].concepts[1];
  const e = bad.chapters[0].concepts[2];
  d.reuse_key = c.reuse_key;
  e.reuse_key = c.reuse_key;
  assert.throws(() => validateSeguridadSpec(spec, bad), /family repeat cap exceeded/u);
});

test('negative regression: shrinking vertical composition into horizontal dimensions fails', () => {
  const bad = clone(spec);
  bad.render_contract.width_vertical = 1920;
  bad.render_contract.height_vertical = 1080;
  assert.throws(() => validateSeguridadSpec(bad, register), /vertical dimensions regressed/u);
});

test('negative regression: non-deterministic cue boundary fails', () => {
  const bad = clone(spec);
  bad.chapters[2].scenes[3].start = 35;
  assert.throws(() => validateSeguridadSpec(bad, register), /start is not deterministic/u);
});

test('negative regression: source binding without immutable blob SHA fails', () => {
  const bad = clone(spec);
  bad.source_bindings[4].en.blob_sha = 'latest';
  assert.throws(() => validateSeguridadSpec(bad, register), /source blob sha missing\/invalid/u);
});

test('negative regression: authored spec cannot self-certify owner approval or Technical GOLDEN', () => {
  const badApproval = clone(spec);
  badApproval.owner_visual_approval = 'APPROVED';
  assert.throws(() => validateSeguridadSpec(badApproval, register), /cannot claim owner approval/u);

  const badGolden = clone(spec);
  badGolden.technical_golden = true;
  assert.throws(() => validateSeguridadSpec(badGolden, register), /cannot self-certify Technical GOLDEN/u);
});
