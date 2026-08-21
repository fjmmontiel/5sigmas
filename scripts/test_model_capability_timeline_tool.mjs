import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../docs/assets/javascripts/tools/model-capability-timeline-core.js');
const dataset = JSON.parse(fs.readFileSync(new URL('../docs/assets/data/tools/model-capability-timeline.json', import.meta.url), 'utf8'));

Core.assertDataset(dataset);
assert.equal(dataset.series.length, 6, 'Expected six distinct benchmark series in v1');
assert.equal(dataset.updated, '2026-08-21');

const gpqa = Core.seriesById(dataset, 'gpqa-diamond');
const gpqaStats = Core.stats(gpqa);
assert.equal(gpqaStats.first.model, 'GPT-4.1');
assert.equal(gpqaStats.first.score, 66.3);
assert.equal(gpqaStats.latest.model, 'GPT-5.6 Sol');
assert.equal(gpqaStats.latest.score, 94.6);
assert.ok(Math.abs(gpqaStats.gain - 28.3) < 1e-9);
assert.ok(gpqaStats.months > 14 && gpqaStats.months < 16);
assert.ok(Math.abs(gpqaStats.headroom - 5.4) < 1e-9);

const swe = Core.seriesById(dataset, 'swe-bench-verified');
const sweStats = Core.stats(swe);
assert.equal(sweStats.protocolCount, 2, 'SWE-bench Verified must expose the 477/500 protocol split');
assert.equal(sweStats.protocolBreaks, 1);
assert.equal(sweStats.duplicateModelCount, 1, 'GPT-5 should appear twice under different protocols');
assert.equal(sweStats.duplicateReports[0].model, 'GPT-5');
assert.ok(Math.abs(sweStats.duplicateReports[0].spread - 2.1) < 1e-9);

const mmmu = Core.seriesById(dataset, 'mmmu-pro-no-tools');
assert.ok(mmmu.points.every((point) => !/python|with tools/i.test(point.conditions)), 'MMMU-Pro series must stay no-tools');
const arc = Core.seriesById(dataset, 'arc-agi-2');
assert.equal(arc.points.at(-1).model, 'GPT-5.4', 'ARC-AGI-2 must stop before GPT-5.6 rather than mixing ARC-AGI-3');

for (const series of dataset.series) {
  const sources = Core.sourceCoverage(dataset, series);
  assert.ok(sources.length >= 1);
  for (const source of sources) {
    assert.match(source.url, /^https:\/\/openai\.com\//);
    assert.match(source.published, /^20\d{2}-\d{2}-\d{2}$/);
  }
  const csv = Core.toCsv(dataset, series);
  assert.ok(csv.startsWith('"date","model","score"'));
  assert.equal(csv.split('\n').length, series.points.length + 1);
  const exported = Core.exportPayload(dataset, series);
  assert.equal(exported.methodologyVersion, '1.0.0');
  assert.equal(exported.sourceReviewDate, '2026-08-21');
  assert.equal(exported.series.id, series.id);
}

assert.equal(Core.queryState('?series=toolathlon', dataset).series, 'toolathlon');
assert.equal(Core.queryState('?series=does-not-exist', dataset).series, 'gpqa-diamond');
const domain = Core.chartDomain(gpqa);
assert.ok(domain.min <= 66.3 && domain.max >= 94.6 && domain.min >= 0 && domain.max <= 100);

console.log('model capability timeline: numerical, protocol, export and provenance gates passed');
