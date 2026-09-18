import {validateCues} from './cues.mjs';
import {validateVisualIdentity} from './theme.mjs';
/** Pure data contract. No dependency on DOM, wall clock, or a rendering engine. */
export const TYPES = Object.freeze(['intro','pipeline','steps','candidates','tree','duration','allocation']);
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const finitePositive = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
export function majority(candidates) {
  const counts = new Map();
  for (const c of candidates) counts.set(String(c.value), (counts.get(String(c.value)) || 0) + 1);
  const entries = [...counts].sort((a,b) => b[1]-a[1]);
  const tied = entries.length > 1 && entries[0][1] === entries[1][1];
  return {value: tied ? null : entries[0]?.[0], count: entries[0]?.[1] || 0, total: candidates.length, tied};
}
export function evaluated(candidates) {
  fail(candidates.every(c => Number.isFinite(c.score)), 'Every evaluated candidate needs a finite score');
  return candidates.reduce((best,c) => c.score > best.score ? c : best, candidates[0]);
}
export function timeline(spec) {
  let start=0;
  return spec.scenes.map((scene,index) => {
    const item={index,id:scene.id,start,end:start+scene.duration,scene}; start=item.end; return item;
  });
}
export function totalDuration(spec) { return spec.scenes.reduce((a,s)=>a+s.duration,0); }
export function sceneAt(spec,t) {
  const items=timeline(spec);
  return items.find(item=>t < item.end) || items.at(-1);
}
export function validateSpec(spec) {
  fail(spec && [2,3,4].includes(spec.version), 'Spec version must be 2, 3 or 4');
  fail(typeof spec.id==='string' && /^[a-z0-9][a-z0-9-]*$/.test(spec.id), 'Invalid stable video id');
  fail(typeof spec.locale==='string' && spec.locale.length>=2, 'Missing locale');
  fail(typeof spec.title==='string' && spec.title.length>0, 'Missing video title');
  fail(Array.isArray(spec.scenes) && spec.scenes.length>0, 'Missing scenes');
  if(spec.version>=4) validateVisualIdentity(spec.visualIdentity,{background:'#FCFBF8'});
  const ids=new Set();
  for (const [i,s] of spec.scenes.entries()) {
    const at=`Scene ${i+1} (${s.id})`;
    fail(typeof s.id==='string' && !ids.has(s.id), `${at}: scene ids must be unique`);ids.add(s.id);
    fail(TYPES.includes(s.type), `${at}: unknown mechanism ${s.type}; no decorative fallback`);
    fail(finitePositive(s.duration) && s.duration>=4,`${at}: duration must be at least four seconds`);
    fail(Array.isArray(s.title) && s.title.every(x=>typeof x==='string'),`${at}: title must contain text lines`);
    fail(Array.isArray(s.paragraphs) && s.paragraphs.every(x=>typeof x==='string'),`${at}: paragraphs required`);
    fail(s.evidence && ['illustrative','sourced','calculated'].includes(s.evidence.kind),`${at}: evidence kind required`);
    if(s.evidence.kind==='sourced') fail(Array.isArray(s.evidence.urls)&&s.evidence.urls.every(u=>/^https:\/\//.test(u))&&s.evidence.urls.length>0,`${at}: sources required`);
    if(s.evidence.kind!=='sourced') fail(typeof s.evidence.note==='string'&&s.evidence.note.length>10,`${at}: disclose illustrative/calculated data`);
    const d=s.data||{};
    if(['pipeline','intro','steps','allocation'].includes(s.type)) fail(Array.isArray(d.items)&&d.items.length>=2&&d.items.length<=6,`${at}: requires 2–6 meaningful items`);
    if(s.type==='candidates') {
      fail(typeof d.question==='string',`${at}: question required`);
      fail(Array.isArray(d.candidates)&&d.candidates.length>=2&&d.candidates.length<=6,`${at}: requires 2–6 candidates`);
      fail(new Set(d.candidates.map(c=>c.id)).size===d.candidates.length,`${at}: duplicate candidates`);
      fail(d.candidates.every(c=>typeof c.label==='string'&&c.value!==undefined),`${at}: candidate labels/values required`);
      fail(typeof d.criterion==='string' && d.criterion.length>5,`${at}: evaluation criterion required`);
      fail(typeof d.caveat==='string' && d.caveat.length>5,`${at}: majority limitation required`);
      evaluated(d.candidates);
    }
    if(s.type==='tree') {
      fail(Array.isArray(d.nodes)&&d.nodes.length>=3,`${at}: nodes required`);
      const nids=new Set(d.nodes.map(n=>n.id));
      fail(nids.size===d.nodes.length,`${at}: duplicate nodes`);
      fail(d.nodes.filter(n=>!n.parent).length===1,`${at}: one root required`);
      for(const n of d.nodes) {
        fail(!n.parent||nids.has(n.parent),`${at}: unknown parent`);
        fail(typeof n.label==='string' && ['open','selected','pruned'].includes(n.state),`${at}: node meaning/state required`);
        let p=n;const seen=new Set();
        while(p){fail(!seen.has(p.id),`${at}: tree cycle`);seen.add(p.id);p=d.nodes.find(x=>x.id===p.parent);}
      }
    }
    if(s.type==='duration') {
      fail(Array.isArray(d.stages)&&d.stages.length>0&&d.stages.length<=6,`${at}: duration stages required`);
      fail(d.stages.every(x=>typeof x.label==='string' && finitePositive(x.amount)),`${at}: finite positive amounts required`);
      fail(typeof d.unit==='string'&&typeof d.totalLabel==='string',`${at}: units and labels required`);
      if(d.rate!==undefined) fail(finitePositive(d.rate),`${at}: rate must be positive`);
    }
    if(spec.version>=3) fail(Array.isArray(s.cues),`${at}: version 3 requires cues`);
    validateCues(s);
    const words=s.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
    fail(s.duration>=Math.max(4,words/4),`${at}: excessive reading speed (>240 body words/minute)`);
  }
  return {valid:true,id:spec.id,scenes:spec.scenes.length,duration:totalDuration(spec)};
}
