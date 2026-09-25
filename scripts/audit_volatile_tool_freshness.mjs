#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const now = new Date(process.env.S5_NOW || new Date().toISOString());
const dayMs = 86_400_000;
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const ageDays = (value) => {
  assert.match(String(value || ''), /^\d{4}-\d{2}-\d{2}$/, `invalid snapshot date: ${value}`);
  return (now.getTime() - Date.parse(`${value}T23:59:59Z`)) / dayMs;
};
const checks = [
  { id:'llm-cost-latency', file:'docs/assets/data/tools/llm-pricing.json', date:(d)=>d.updated_at, max:7 },
  { id:'model-price-performance', file:'docs/assets/data/tools/model-price-performance.json', date:(d)=>d.updated_at, max:8 },
  { id:'voice-cost-capacity', file:'docs/assets/data/tools/voice-cost-capacity-presets.json', date:(d)=>d.updated_at, max:7 },
  { id:'model-capability-timeline', file:'docs/assets/data/tools/model-capability-timeline.json', date:(d)=>d.updated, max:30 },
  { id:'global-ai-ecosystem', file:'docs/assets/data/tools/global-ai-ecosystem.json', date:(d)=>d.snapshot_date, max:30 },
  { id:'inference-vram', file:'docs/assets/data/tools/inference-vram-presets.json', date:(d)=>d.updated, max:90 },
  { id:'kv-cache-context', file:'docs/assets/data/tools/inference-vram-presets.json', date:(d)=>d.updated, max:90 },
  { id:'training-compute-energy', file:'docs/assets/data/tools/training-compute-energy.json', date:(d)=>d.updated, max:90 },
  { id:'datacenter-ai-capacity', file:'docs/assets/data/tools/datacenter-ai-capacity.json', date:(d)=>d.updated, max:90 },
];

const failures=[];
for(const check of checks){
  const data=read(check.file);
  const snapshot=check.date(data);
  const age=ageDays(snapshot);
  if(age < -1 || age > check.max) failures.push(`${check.id}: snapshot ${snapshot} is ${age.toFixed(1)} days old (max ${check.max})`);
  console.log(`${check.id}: snapshot=${snapshot} age=${age.toFixed(1)}d max=${check.max}d`);
}

const pricing=read('docs/assets/data/tools/llm-pricing.json');
for(const preset of pricing.presets || []){
  if(preset.source?.verified_on !== pricing.updated_at) failures.push(`llm-cost-latency: ${preset.id} verified_on ${preset.source?.verified_on} != ${pricing.updated_at}`);
}
const voice=read('docs/assets/data/tools/voice-cost-capacity-presets.json');
for(const preset of voice.presets || []) for(const source of preset.sources || []){
  if(source.verified_on !== voice.updated_at) failures.push(`voice-cost-capacity: ${source.component} verified_on ${source.verified_on} != ${voice.updated_at}`);
}
const vram=read('docs/assets/data/tools/inference-vram-presets.json');
for(const source of vram.sources || []){
  if(source.verified_on !== vram.updated) failures.push(`inference-vram: ${source.id} verified_on ${source.verified_on} != ${vram.updated}`);
}
for(const file of ['docs/assets/data/tools/training-compute-energy.json','docs/assets/data/tools/datacenter-ai-capacity.json']){
  const data=read(file);
  for(const [id,source] of Object.entries(data.sources || {})){
    if(source.reviewed && source.reviewed !== data.updated) failures.push(`${file}: ${id} reviewed ${source.reviewed} != ${data.updated}`);
  }
}
const eco=read('docs/assets/data/tools/global-ai-ecosystem.json');
for(const source of eco.sources || []){
  if(source.retrieved !== eco.snapshot_date) failures.push(`global-ai-ecosystem: ${source.id} retrieved ${source.retrieved} != ${eco.snapshot_date}`);
}

if(failures.length){
  console.error('Volatile tool freshness audit failed:');
  for(const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`Volatile tool freshness audit passed: ${checks.length} time-sensitive tool surfaces are inside their freshness windows.`);
