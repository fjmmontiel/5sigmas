import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateSpec} from '../src/schema.mjs';

const dir=fileURLToPath(new URL('../content/modelos-razonadores/',import.meta.url));
const allFiles=readdirSync(dir).filter(name=>name.endsWith('.json')).sort();
const allSpecs=allFiles.map(name=>({name,spec:JSON.parse(readFileSync(`${dir}/${name}`,'utf8'))}));
const specs=allSpecs.filter(row=>row.name.endsWith('.es.json'));
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

test('every authored localized modelos-razonadores spec satisfies deterministic v4',()=>{
  assert.ok(allSpecs.length>=7,'six Spanish chapters plus at least one English localization must exist');
  for(const {name,spec} of allSpecs){assert.equal(spec.version,4,`${name}: must use v4`);assert.doesNotThrow(()=>validateSpec(spec),`${name}: invalid motion spec`);assertIdentity(name,spec);}
});

test('all six Spanish modelos-razonadores specs remain authored',()=>{assert.equal(specs.length,6,'the release unit must contain exactly the six authored Spanish chapters');});

test('English localization has started from the canonical series introduction',()=>{
  assert.ok(english.some(row=>row.name==='00-presentacion.en.json'));
  const intro=byName('00-presentacion.en.json').spec;
  assert.equal(intro.locale,'en');
  assert.equal(intro.articlePath,'locales/en/series/modelos-razonadores/00_presentacion_serie.md');
  assert.equal(cueCount(intro),13);
  assert.equal(duration(intro),75);
});

test('the complete authored surface cannot drift from the locked Teal reasoning identity',()=>{for(const {name,spec} of allSpecs)assertIdentity(name,spec);});

test('failure chapter exposes the intended mechanisms instead of decorative fallback scenes',()=>{
  const row=byName('02-fallos.es.json');assert.ok(row,'02-fallos.es.json must be present');assert.deepEqual(row.spec.scenes.map(scene=>scene.id),['shortcut','systematic-bias','gaming','propagation','verification']);assert.equal(cueCount(row.spec),19);assert.equal(duration(row.spec),108);
});

test('latency chapter has five semantic mechanisms and source-faithful timing claims',()=>{
  const row=byName('04-latencia-streaming.es.json');assert.ok(row,'04-latencia-streaming.es.json must be present');assert.deepEqual(row.spec.scenes.map(scene=>scene.id),['thresholds','ttft','streaming','routing','policy']);assert.equal(cueCount(row.spec),23);assert.equal(duration(row.spec),115);const thresholds=row.spec.scenes.find(scene=>scene.id==='thresholds');assert.ok(thresholds.evidence.urls.includes('https://www.nngroup.com/articles/response-times-3-important-limits/'));const routing=row.spec.scenes.find(scene=>scene.id==='routing');assert.ok(routing.evidence.urls.includes('https://arxiv.org/abs/2406.18665'));assert.match(routing.paragraphs.join(' '),/más de dos veces sin degradar la calidad medida/i);
});

test('risk chapter keeps sourced attack mechanisms distinct from illustrative controls',()=>{
  const row=byName('05-riesgos.es.json');assert.ok(row,'05-riesgos.es.json must be present');assert.deepEqual(row.spec.scenes.map(scene=>scene.id),['overthinking','indirect-injection','taborag','risk-control','guardrails']);assert.equal(cueCount(row.spec),22);assert.equal(duration(row.spec),121);const overthinking=row.spec.scenes.find(scene=>scene.id==='overthinking');assert.ok(overthinking.evidence.urls.includes('https://machinelearning.apple.com/research/illusion-of-thinking'));const injection=row.spec.scenes.find(scene=>scene.id==='indirect-injection');assert.ok(injection.evidence.urls.includes('https://arxiv.org/abs/2302.12173'));const taborag=row.spec.scenes.find(scene=>scene.id==='taborag');assert.ok(taborag.evidence.urls.includes('https://arxiv.org/abs/2603.03919'));const risk=row.spec.scenes.find(scene=>scene.id==='risk-control');assert.ok(risk.evidence.urls.includes('https://machinelearning.apple.com/research/conformal-thinking-risk-control'));const guardrails=row.spec.scenes.find(scene=>scene.id==='guardrails');assert.equal(guardrails.evidence.kind,'illustrative');
});
