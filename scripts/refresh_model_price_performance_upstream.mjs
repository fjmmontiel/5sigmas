#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const releaseSlugs = [];
for (const match of releaseHtml.matchAll(/href=["'](?:https:\/\/artificialanalysis\.ai)?\/models\/releases\/([^"'?#/]+)(?:[?#][^"']*)?["']/gi)) {
  const slug = match[1];
  if (slug === 'comparisons' || releaseSlugs.includes(slug)) continue;
  releaseSlugs.push(slug);
}
assert.ok(releaseSlugs.length > 0, 'release feed yielded no model release links');
if (releaseSlugs[0] !== expectedLatestRelease) {
  throw new Error(`NEW_RELEASE_DETECTED: expected latest ${expectedLatestRelease}, found ${releaseSlugs[0]}. Review pricing/specs before charting it.`);
}

const updates = [];
for (const model of data.models || []) {
  const url = model.sources?.benchmark?.url;
  assert.match(url || '', /^https:\/\/artificialanalysis\.ai\/models\//, `${model.id}: benchmark must use an Artificial Analysis model page`);
  const html = await fetchHtml(url);
  const text = decode(html);
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

const ageDays = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${data.updated_at}T00:00:00Z`)) / 86_400_000);
const checkpointDue = ageDays >= Number(data.freshness_policy?.review_interval_days || 7);

if (!updates.length && !checkpointDue) {
  console.log(`Model upstream check passed: ${data.models.length} model pages match the ${data.updated_at} snapshot; latest release remains ${expectedLatestRelease}.`);
  process.exit(0);
}

if (!write) {
  console.error(`Model explorer refresh required: ${updates.length} metric changes; checkpointDue=${checkpointDue}.`);
  process.exit(2);
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
