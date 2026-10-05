#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseLinks = (html) => {
  // Single-variant releases use /models/<slug>; grouped releases use
  // /models/releases/<slug>. Navigation and embedded scripts are not feed rows.
  const clean = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const main = clean.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || clean;
  const slugs = [];
  const pattern = /href\s*=\s*["'](?:https:\/\/artificialanalysis\.ai)?\/models\/(?:releases\/)?([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/)?(?:[?#][^"']*)?["']/gi;
  for (const match of main.matchAll(pattern)) {
    const slug = match[1];
    if (['releases', 'comparisons', 'providers'].includes(slug) || slugs.includes(slug)) continue;
    slugs.push(slug);
  }
  return slugs;
};

const assertReviewedLatest = (slugs, expected) => {
  assert.ok(slugs.length > 0, 'release feed yielded no model release links');
  if (slugs[0] !== expected) {
    throw new Error(`NEW_RELEASE_DETECTED: expected latest ${expected}, found ${slugs[0]}. Review pricing/specs before charting it.`);
  }
};

// Run deterministic parser regressions before every live audit. These fixtures
// never supply live metrics or bypass the real upstream check below.
{
  const fixture = `<header><a href="/models/releases/gpt-6-1-sol">navigation</a></header>
<main><nav><a href="/models/wrong-nav">navigation</a></nav>
<script>const hidden = '<a href="/models/wrong-script">not a feed row</a>';</script>
<a href="/models/releases">Index</a><a href="/models/comparisons">Compare</a>
<a href="/models/ling-3-1-flash">Ling 3.1 Flash</a>
<a href='https://artificialanalysis.ai/models/gemini-4-argon/?x=1'>Gemini 4 Argon</a>
<a href="/models/releases/gpt-6-1-sol">GPT-6.1 Sol</a>
<a href="/models/ling-3-1-flash#details">duplicate</a>
<a href="https://other.example/models/false-model">external</a></main>`;
  const slugs = releaseLinks(fixture);
  assert.deepEqual(slugs, ['ling-3-1-flash', 'gemini-4-argon', 'gpt-6-1-sol']);
  assert.doesNotThrow(() => assertReviewedLatest(slugs, 'ling-3-1-flash'));
  assert.throws(() => assertReviewedLatest(releaseLinks('<main><a href="/models/new-unreviewed">New</a></main>'), 'ling-3-1-flash'), /NEW_RELEASE_DETECTED/);
  assert.throws(() => assertReviewedLatest(releaseLinks('<main><a href="/models/releases/new-unreviewed">New</a></main>'), 'ling-3-1-flash'), /NEW_RELEASE_DETECTED/);
  assert.throws(() => assertReviewedLatest(releaseLinks('<main>No releases</main>'), 'ling-3-1-flash'), /no model release links/);
  assert.deepEqual(releaseLinks('<a href="/models/releases/old-group/">Old</a>'), ['old-group']);
  assert.throws(() => assertReviewedLatest(slugs, 'gpt-6-1-sol'), /NEW_RELEASE_DETECTED/);
}
if (process.argv.includes('--test-release-feed')) {
  console.log('Release feed parser: 7 positive/negative regression groups passed; no network calls.');
  process.exit(0);
}

// Performance is a dated daily snapshot, not an invariant against live sampling.
// Release, price, deprecation, schema and methodology checks still run on every audit.
const snapshotAge = (value, today) => {
  assert.match(value || '', /^\d{4}-\d{2}-\d{2}$/, 'snapshot date missing or malformed');
  assert.match(today || '', /^\d{4}-\d{2}-\d{2}$/, 'audit date missing or malformed');
  const date = Date.parse(`${value}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  assert.ok(Number.isFinite(date) && Number.isFinite(now), 'invalid snapshot/audit date');
  assert.equal(new Date(date).toISOString().slice(0, 10), value, 'invalid calendar snapshot date');
  assert.equal(new Date(now).toISOString().slice(0, 10), today, 'invalid calendar audit date');
  assert.ok(date <= now, 'snapshot date must not be in the future');
  return (now - date) / 86_400_000;
};

const refreshDecision = (data, updates, today) => {
  const interval = Number(data.freshness_policy?.performance_review_interval_days ?? 1);
  const reviewInterval = Number(data.freshness_policy?.review_interval_days ?? 7);
  assert.ok(Number.isInteger(interval) && interval > 0, 'invalid performance review interval');
  assert.ok(Number.isInteger(reviewInterval) && reviewInterval >= interval, 'invalid general review interval');
  assert.ok(Array.isArray(data.models) && data.models.length > 0, 'no charted models to verify');
  const checkpointDue = snapshotAge(data.updated_at, today) >= reviewInterval;
  const performanceDue = data.models.some(model =>
    snapshotAge(model.sources?.benchmark?.performance_snapshot_on, today) >= interval);
  const byId = new Map(data.models.map(model => [model.id, model]));
  const intelligenceChanged = updates.some(update => {
    const stored = byId.get(update.id);
    assert.ok(stored, `unknown model in upstream result: ${update.id}`);
    return update.intelligence !== Number(stored.intelligence_index);
  });
  return { checkpointDue, performanceDue, intelligenceChanged,
    required: checkpointDue || performanceDue || intelligenceChanged };
};

// Deterministic regression for the observed intraday speed/TTFT failure. These
// tests cannot supply upstream responses or satisfy a real freshness audit.
{
  const fixture = { updated_at: '2026-10-04', freshness_policy: {
    review_interval_days: 7, performance_review_interval_days: 1 }, models: [{
    id: 'fixture', intelligence_index: 56, sources: { benchmark: {
      performance_snapshot_on: '2026-10-04' } } }] };
  const variation = [{ id: 'fixture', intelligence: 56, speed: 77.8, ttft: 128.38 }];
  assert.equal(refreshDecision(fixture, variation, '2026-10-04').required, false);
  assert.equal(refreshDecision(fixture, [], '2026-10-04').required, false);
  assert.equal(refreshDecision(fixture, variation, '2026-10-05').performanceDue, true);
  assert.equal(refreshDecision(fixture, [], '2026-10-05').required, true);
  assert.equal(refreshDecision(fixture, [{ ...variation[0], intelligence: 57 }], '2026-10-04').required, true);
  assert.equal(refreshDecision(fixture, [], '2026-10-11').checkpointDue, true);
  assert.throws(() => refreshDecision(fixture, [], '2026-10-03'), /future/);
  for (const invalid of ['', '2026-02-30', 'not-a-date']) {
    const bad = structuredClone(fixture);
    bad.models[0].sources.benchmark.performance_snapshot_on = invalid;
    assert.throws(() => refreshDecision(bad, [], '2026-10-04'));
  }
  const badInterval = structuredClone(fixture);
  badInterval.freshness_policy.performance_review_interval_days = 0;
  assert.throws(() => refreshDecision(badInterval, [], '2026-10-04'), /interval/);
  assert.throws(() => refreshDecision(fixture, [{ ...variation[0], id: 'other' }], '2026-10-04'), /unknown model/);
}
if (process.argv.includes('--test-refresh-policy')) {
  console.log('Refresh policy: 12 freshness, drift and invalid-input assertions passed; no network calls.');
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'docs/assets/data/tools/model-price-performance.json');
const write = process.argv.includes('--write');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const today = (process.env.S5_TODAY || new Date().toISOString().slice(0, 10));
const releaseUrl = data.release_coverage?.source?.url;
const expectedLatestRelease = data.release_coverage?.latest_release_slug;
const benchmarkVersion = String(data.methodology?.benchmark || '').match(/Intelligence Index (v\d+(?:\.\d+)+)/)?.[1];

assert.match(today, /^\d{4}-\d{2}-\d{2}$/, 'S5_TODAY must be YYYY-MM-DD');
assert.ok(releaseUrl, 'release feed URL missing');
assert.ok(expectedLatestRelease, 'release_coverage.latest_release_slug missing');
assert.ok(benchmarkVersion, 'benchmark version missing from methodology');

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': '5sigmas-model-freshness/1.0 (+https://5sigmas.com)',
      accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
};

const decode = (value) => String(value)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim();

const number = (match, label, url) => {
  if (!match) throw new Error(`${url}: could not parse ${label}`);
  const value = Number(match[1]);
  if (!Number.isFinite(value)) throw new Error(`${url}: invalid ${label}`);
  return value;
};

const releaseHtml = await fetchHtml(releaseUrl);
const releaseSlugs = releaseLinks(releaseHtml);
assertReviewedLatest(releaseSlugs, expectedLatestRelease);

const updates = [];
for (const model of data.models || []) {
  const url = model.sources?.benchmark?.url;
  assert.match(url || '', /^https:\/\/artificialanalysis\.ai\/models\//, `${model.id}: benchmark must use an Artificial Analysis model page`);
  const html = await fetchHtml(url);
  const text = decode(html);
  if (/\bThis model is deprecated\b/i.test(text)) {
    throw new Error(`${model.id}: MODEL_DEPRECATED on Artificial Analysis; review provider lineage and remove or replace the chart row before refreshing metrics.`);
  }
  if (!text.includes(`Artificial Analysis Intelligence Index ${benchmarkVersion}`)) {
    throw new Error(`${model.id}: benchmark methodology drift; expected ${benchmarkVersion}`);
  }

  const intelligence = number(text.match(/\bscores\s+([0-9]+(?:\.[0-9]+)?)\s+on the Artificial Analysis Intelligence Index\b/i), 'Intelligence Index', url);
  const speed = number(text.match(/\bgenerates output at\s+([0-9]+(?:\.[0-9]+)?)\s+tokens per second\b/i), 'output speed', url);
  const ttft = number(text.match(/\bhas a time to first token \(TTFT\) of\s+([0-9]+(?:\.[0-9]+)?)s\b/i), 'TTFT', url);
  const price = text.match(/\bcosts\s+\$([0-9]+(?:\.[0-9]+)?)\s+per 1M input tokens[\s\S]{0,220}?\band\s+\$([0-9]+(?:\.[0-9]+)?)\s+per 1M output tokens\b/i);
  if (!price) throw new Error(`${model.id}: could not parse AA input/output price for drift detection`);
  const observedInput = Number(price[1]);
  const observedOutput = Number(price[2]);
  const priceTolerance = (stored) => Math.max(0.011, Math.abs(stored) * 0.025);
  if (Math.abs(observedInput - Number(model.input_usd_per_million)) > priceTolerance(Number(model.input_usd_per_million)) ||
      Math.abs(observedOutput - Number(model.output_usd_per_million)) > priceTolerance(Number(model.output_usd_per_million))) {
    throw new Error(`${model.id}: PRICE_DRIFT requires primary-source review (stored ${model.input_usd_per_million}/${model.output_usd_per_million}, AA ${observedInput}/${observedOutput})`);
  }

  const changed = intelligence !== Number(model.intelligence_index)
    || speed !== Number(model.output_tokens_per_second)
    || ttft !== Number(model.ttft_seconds);
  if (changed) updates.push({ id: model.id, intelligence, speed, ttft });
}

const decision = refreshDecision(data, updates, today);

if (!write) {
  for (const update of updates) {
    const stored = data.models.find((model) => model.id === update.id);
    console.log(`UPSTREAM_METRIC_OBSERVATION ${update.id}: intelligence ${stored.intelligence_index} -> ${update.intelligence}; speed ${stored.output_tokens_per_second} -> ${update.speed}; TTFT ${stored.ttft_seconds} -> ${update.ttft}`);
  }
  if (decision.required) {
    console.error(`Model explorer refresh required: ${JSON.stringify(decision)}. Run the authorized daily refresh and commit the verified snapshot.`);
    process.exit(2);
  }
  console.log(`Model upstream audit passed: releases, methodology and pricing verified across ${data.models.length} model pages. Retained dated ${data.updated_at} performance snapshot; ${updates.length} intraday metric variations observed, not claimed identical. Daily performance review remains mandatory.`);
  process.exit(0);
}

if (!updates.length && !decision.required) {
  console.log(`Model upstream check passed: ${data.models.length} model pages match the ${data.updated_at} snapshot; latest release remains ${expectedLatestRelease}.`);
  process.exit(0);
}

const updateById = new Map(updates.map((entry) => [entry.id, entry]));
for (const model of data.models) {
  const update = updateById.get(model.id);
  if (update) {
    model.intelligence_index = update.intelligence;
    model.output_tokens_per_second = update.speed;
    model.ttft_seconds = update.ttft;
  }
  model.sources.benchmark.verified_on = today;
  model.sources.benchmark.performance_snapshot_on = today;
}
data.updated_at = today;
data.release_coverage.reviewed_through = today;
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Refreshed model explorer for ${today}: ${updates.length} metric changes across ${data.models.length} charted configurations; latest release ${expectedLatestRelease}.`);
