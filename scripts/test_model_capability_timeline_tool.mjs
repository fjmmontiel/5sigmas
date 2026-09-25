import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../docs/assets/javascripts/tools/model-capability-timeline-core.js');
const dataset = JSON.parse(fs.readFileSync(new URL('../docs/assets/data/tools/model-capability-timeline.json', import.meta.url), 'utf8'));

Core.assertDataset(dataset);
assert.equal(dataset.series.length, 7, 'Expected seven distinct benchmark series after GPT-6 refresh');
assert.match(dataset.updated, /^\d{4}-\d{2}-\d{2}$/);
const ageDays = (Date.now() - Date.parse(`${dataset.updated}T23:59:59Z`)) / 86_400_000;
assert.ok(ageDays >= -1 && ageDays <= 30, `timeline dataset is stale: ${dataset.updated}`);
assert.equal(dataset.release_coverage.reviewed_through, dataset.updated);
assert.ok(dataset.release_coverage.reviewed_not_charted.some((x) => x.model === 'GPT-6 Sol' && /no value is fabricated/i.test(x.reason)));
assert.ok(dataset.release_coverage.reviewed_not_charted.some((x) => x.model === 'GPT-6 Luna' && /no value is fabricated/i.test(x.reason)));

const gpqa = Core.seriesById(dataset, 'gpqa-diamond');
const gpqaStats = Core.stats(gpqa);
assert.equal(gpqaStats.first.model, 'GPT-4.1');
assert.equal(gpqaStats.first.score, 66.3);
assert.equal(gpqaStats.latest.model, 'GPT-6 Astra');
assert.equal(gpqaStats.latest.score, 96.0);
assert.ok(Math.abs(gpqaStats.gain - 29.7) < 1e-9);
assert.ok(Math.abs(gpqaStats.headroom - 4.0) < 1e-9);

const swe = Core.seriesById(dataset, 'swe-bench-verified');
const sweStats = Core.stats(swe);
assert.equal(sweStats.protocolCount, 2);
assert.equal(sweStats.protocolBreaks, 1);
assert.equal(sweStats.duplicateModelCount, 1);
assert.equal(sweStats.duplicateReports[0].model, 'GPT-5');
assert.ok(Math.abs(sweStats.duplicateReports[0].spread - 2.1) < 1e-9);

const mmmu = Core.seriesById(dataset, 'mmmu-pro-no-tools');
assert.ok(mmmu.points.every((point) => !/python|with tools/i.test(point.conditions)), 'MMMU-Pro series must stay no-tools');
const arc = Core.seriesById(dataset, 'arc-agi-2');
assert.equal(arc.points.at(-1).model, 'GPT-6 Astra');
assert.equal(arc.points.at(-1).score, 95.0);
assert.equal(arc.points.at(-2).model, 'GPT-5.6 Sol');
assert.equal(arc.points.at(-2).score, 92.5);
const terminal = Core.seriesById(dataset, 'terminal-bench-4');
assert.deepEqual(terminal.points.map((p) => [p.model,p.score]), [['GPT-5.6 Sol',37.3],['GPT-6 Astra',57.9]]);

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
  assert.equal(exported.sourceReviewDate, dataset.updated);
  assert.equal(exported.series.id, series.id);
}

assert.equal(Core.queryState('?series=toolathlon', dataset).series, 'toolathlon');
assert.equal(Core.queryState('?series=does-not-exist', dataset).series, 'gpqa-diamond');
const domain = Core.chartDomain(gpqa);
assert.ok(domain.min <= 66.3 && domain.max >= 96 && domain.min >= 0 && domain.max <= 100);

console.log('model capability timeline: GPT-6 release coverage, numerical, protocol, export and freshness gates passed');
