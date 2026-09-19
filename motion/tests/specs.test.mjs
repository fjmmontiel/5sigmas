import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateSpec} from '../src/schema.mjs';

const dir=fileURLToPath(new URL('../content/modelos-razonadores/',import.meta.url));
const allFiles=readdirSync(dir).filter(name=>name.endsWith('.json')).sort();
const allSpecs=allFiles.map(name=>({name,spec:JSON.parse(readFileSync(`${dir}/${name}`,'utf8'))}));
const spanish=allSpecs.filter(row=>row.name.endsWith('.es.json'));
const english=allSpecs.filter(row=>row.name.endsWith('.en.json'));
const byName=name=>allSpecs.find(row=>row.name===name);
const cueCount=spec=>spec.scenes.reduce((sum,scene)=>sum+(scene.cues?.length||0),0);
const duration=spec=>spec.scenes.reduce((sum,scene)=>sum+scene.duration,0);

function assertIdentity(name,spec){
  assert.equal(spec.visualIdentity?.unit,'modelos-razonadores',`${name}: wrong release unit`);
  assert.equal(spec.visualIdentity?.accentName,'Teal reasoning',`${name}: accent name drift`);
  assert.equal(spec.visualIdentity?.accent,'#26A69A',`${name}: accent drift`);
  assert.equal(spec.visualIdentity?.accentText,'#00776F',`${name}: accent text drift`);
  assert.equal(spec.visualIdentity?.accentSurface,'#E7F4F0',`${name}: accent surface drift`);
  assert.ok(spec.visualIdentity?.forbidden?.some(rule=>/gradient/i.test(rule)),`${name}: gradients must remain forbidden`);
}

test('all twelve localized modelos-razonadores specs satisfy deterministic v4',()=>{
  assert.equal(allSpecs.length,12,'the complete bilingual release unit must contain exactly 12 specs');
  for(const {name,spec} of allSpecs){
    assert.equal(spec.version,4,`${name}: must use v4`);
    assert.doesNotThrow(()=>validateSpec(spec),`${name}: invalid motion spec`);
    assertIdentity(name,spec);
  }
});

test('the release unit contains all six Spanish and six English chapters',()=>{
  assert.equal(spanish.length,6);
  assert.equal(english.length,6);
  for(const stem of ['00-presentacion','01-que-es-razonar','02-fallos','03-test-time-compute','04-latencia-streaming','05-riesgos']){
    assert.ok(byName(`${stem}.es.json`),`${stem}.es.json missing`);
    assert.ok(byName(`${stem}.en.json`),`${stem}.en.json missing`);
  }
});

test('English mirrors use English locale and localized article surfaces',()=>{
  for(const {name,spec} of english){
    assert.equal(spec.locale,'en',`${name}: wrong locale`);
    assert.match(spec.articlePath,/^locales\/en\/series\/modelos-razonadores\//,`${name}: wrong English article path`);
  }
});

test('the complete authored surface cannot drift from the locked Teal reasoning identity',()=>{for(const {name,spec} of allSpecs)assertIdentity(name,spec);});

test('series introductions preserve synchronized structure in both languages',()=>{
  for(const name of ['00-presentacion.es.json','00-presentacion.en.json']){
    const spec=byName(name).spec;
    assert.equal(cueCount(spec),13);
    assert.equal(duration(spec),75);
  }
});

test('failure chapter exposes the intended mechanisms instead of decorative fallback scenes',()=>{
  for(const name of ['02-fallos.es.json','02-fallos.en.json']){
    const row=byName(name);assert.ok(row,`${name} must be present`);
    assert.deepEqual(row.spec.scenes.map(scene=>scene.id),['shortcut','systematic-bias','gaming','propagation','verification']);
    assert.equal(cueCount(row.spec),19);
    assert.equal(duration(row.spec),108);
  }
});

test('test-time compute preserves the same seven semantic mechanisms and sourced benchmark in both languages',()=>{
  for(const name of ['03-test-time-compute.es.json','03-test-time-compute.en.json']){
    const row=byName(name);assert.ok(row,`${name} must be present`);
    assert.deepEqual(row.spec.scenes.map(scene=>scene.id),['intro','pipeline','steps','candidates','tree','duration','allocation']);
    assert.equal(cueCount(row.spec),37);
    const candidates=row.spec.scenes.find(scene=>scene.id==='candidates');
    assert.ok(candidates.evidence.urls.includes('https://openai.com/index/learning-to-reason-with-llms/'));
    assert.deepEqual(candidates.data.evidenceComparison.values.map(v=>v.value),[74,83]);
  }
});

test('latency chapter has five semantic mechanisms and source-faithful timing claims in both languages',()=>{
  for(const name of ['04-latencia-streaming.es.json','04-latencia-streaming.en.json']){
    const row=byName(name);assert.ok(row,`${name} must be present`);
    assert.deepEqual(row.spec.scenes.map(scene=>scene.id),['thresholds','ttft','streaming','routing','policy']);
    assert.equal(cueCount(row.spec),23);
    assert.equal(duration(row.spec),115);
    const thresholds=row.spec.scenes.find(scene=>scene.id==='thresholds');
    assert.ok(thresholds.evidence.urls.includes('https://www.nngroup.com/articles/response-times-3-important-limits/'));
    const routing=row.spec.scenes.find(scene=>scene.id==='routing');
    assert.ok(routing.evidence.urls.includes('https://arxiv.org/abs/2406.18665'));
  }
});

test('risk chapter keeps sourced attack mechanisms distinct from illustrative controls in both languages',()=>{
  for(const name of ['05-riesgos.es.json','05-riesgos.en.json']){
    const row=byName(name);assert.ok(row,`${name} must be present`);
    assert.deepEqual(row.spec.scenes.map(scene=>scene.id),['overthinking','indirect-injection','taborag','risk-control','guardrails']);
    assert.equal(cueCount(row.spec),22);
    assert.equal(duration(row.spec),121);
    const overthinking=row.spec.scenes.find(scene=>scene.id==='overthinking');
    assert.ok(overthinking.evidence.urls.includes('https://machinelearning.apple.com/research/illusion-of-thinking'));
    const injection=row.spec.scenes.find(scene=>scene.id==='indirect-injection');
    assert.ok(injection.evidence.urls.includes('https://arxiv.org/abs/2302.12173'));
    const taborag=row.spec.scenes.find(scene=>scene.id==='taborag');
    assert.ok(taborag.evidence.urls.includes('https://arxiv.org/abs/2603.03919'));
    const risk=row.spec.scenes.find(scene=>scene.id==='risk-control');
    assert.ok(risk.evidence.urls.includes('https://machinelearning.apple.com/research/conformal-thinking-risk-control'));
    const guardrails=row.spec.scenes.find(scene=>scene.id==='guardrails');
    assert.equal(guardrails.evidence.kind,'illustrative');
  }
});
