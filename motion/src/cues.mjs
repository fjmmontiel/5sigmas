/** One deterministic clock for sentence emphasis and diagram actions.
 * All seconds are local to the scene. No timers or frame-history mutations.
 * Text is kept verbatim in paragraphs; cues refer to contiguous exact substrings.
 */
export const CUE_TARGETS = Object.freeze({
  intro:['intro.reveal'], pipeline:['pipeline.train','pipeline.infer'],
  steps:['steps.progress'], candidates:['candidates.generate','candidates.evaluate','candidates.vote'],
  tree:['tree.expand','tree.prune','tree.select'], duration:['duration.accumulate','duration.formula'],
  allocation:['allocation.simple','allocation.complex']
});
const cueAssert=(v,m)=>{if(!v)throw new Error(m);};
const cueClamp=v=>Math.max(0,Math.min(1,v));
const cueEase=v=>{v=cueClamp(v);return v*v*v*(v*(v*6-15)+10);};
const cueCache=new WeakMap();

export function compileCues(scene) {
  if(!scene.cues)return [];
  const positions=scene.paragraphs.map(()=>0);
  return scene.cues.map(c=>{
    const text=scene.paragraphs[c.paragraph];let start=positions[c.paragraph];
    while(start<text.length && /\s/.test(text[start]))start++;
    const end=start+c.text.length;positions[c.paragraph]=end;
    return {...c,range:{start,end}};
  });
}
export function validateCues(scene) {
  if(!scene.cues)return;
  const at=`Scene ${scene.id}: cues`;
  cueAssert(Array.isArray(scene.cues)&&scene.cues.length>0,`${at}: non-empty list required`);
  const ids=new Set(),used=new Map(),progress=new Map();let previousEnd=0,previousParagraph=0;
  for(const c of scene.cues){
    cueAssert(typeof c.id==='string'&&!ids.has(c.id),`${at}: unique cue ids required`);ids.add(c.id);
    cueAssert(Number.isFinite(c.at)&&Number.isFinite(c.end)&&c.at>=0&&c.end>c.at&&c.end<=scene.duration,`${at}: invalid cue interval`);
    cueAssert(c.at>=previousEnd-1e-7,`${at}: overlapping or out-of-order cues`);previousEnd=c.end;
    cueAssert(Number.isInteger(c.paragraph)&&c.paragraph>=previousParagraph&&c.paragraph<scene.paragraphs.length,`${at}: paragraph order/reference invalid`);previousParagraph=c.paragraph;
    cueAssert(typeof c.text==='string'&&c.text.trim()===c.text&&c.text.length>0,`${at}: exact text required`);
    const words=c.text.split(/\s+/).length;
    cueAssert(words/(c.end-c.at)*60<=240.001,`${at}: cue reading speed exceeds 240 words/minute`);
    cueAssert(typeof c.focus==='string'&&c.focus.length>0,`${at}: semantic focus required`);
    cueAssert(Array.isArray(c.actions),`${at}: actions must be an array (may be empty for reading holds)`);
    for(const a of c.actions){
      cueAssert((CUE_TARGETS[scene.type]?.includes(a.target)||(a.target==='evidence.comparison'&&scene.data?.evidenceComparison)),`${at}: unknown target ${a.target}`);
      cueAssert(Number.isFinite(a.to)&&a.to>=0&&a.to<=1,`${at}: target value must be 0..1`);
      cueAssert(Number.isFinite(a.offset)&&a.offset>=0&&Number.isFinite(a.duration)&&a.duration>0,`${at}: action timing invalid`);
      const begin=c.at+a.offset,end=begin+a.duration;
      cueAssert(end<=c.end+1e-7,`${at}: action extends beyond its cue`);
      cueAssert(begin>=(used.get(a.target)||0)-1e-7,`${at}: overlapping actions on ${a.target}`);
      cueAssert(a.to>=(progress.get(a.target)||0),`${at}: non-monotonic action on ${a.target}`);
      used.set(a.target,end);progress.set(a.target,a.to);
    }
  }
  if(scene.data?.evidenceComparison){
    const d=scene.data.evidenceComparison;
    cueAssert(Array.isArray(d.values)&&d.values.length===2&&Number.isFinite(d.max)&&d.max>0,`${at}: evidence comparison needs two values and a positive scale`);
    cueAssert(d.values.every(x=>typeof x.label==='string'&&Number.isFinite(x.value)&&x.value>=0&&x.value<=d.max),`${at}: invalid evidence comparison values`);
    cueAssert(typeof d.title==='string'&&typeof d.unit==='string'&&typeof d.note==='string',`${at}: evidence comparison labels required`);
    cueAssert(scene.evidence.kind==='sourced'&&scene.evidence.urls.includes(d.source),`${at}: evidence chart must reference a declared source`);
    cueAssert(progress.get('evidence.comparison')===1,`${at}: evidence comparison must finish`);
  }
  for(const c of scene.cues)for(const a of c.actions){
    if(['candidates.evaluate','candidates.vote'].includes(a.target))cueAssert(motionValue(scene,c.at+a.offset,'candidates.generate')===1,`${at}: selection before generation completes`);
  }
  const compiled=compileCues(scene);
  for(const c of compiled)cueAssert(scene.paragraphs[c.paragraph].slice(c.range.start,c.range.end)===c.text,`${at}: cue text does not match paragraph verbatim`);
  for(const [p,text] of scene.paragraphs.entries()){
    const chunks=compiled.filter(c=>c.paragraph===p).map(c=>c.text).join(' ');
    cueAssert(chunks===text,`${at}: every paragraph must be covered exactly once without changing text`);
  }
  for(const target of CUE_TARGETS[scene.type]||[]){
    if(target==='duration.formula'&&!scene.data.rate)continue;
    cueAssert(progress.get(target)===1,`${at}: ${target} must finish at 1`);
  }
}
export function cueState(scene,t,{allText=false,reducedMotion=false}={}) {
  if(!scene.cues)return null;
  let cs=cueCache.get(scene);if(!cs){cs=compileCues(scene);cueCache.set(scene,cs);}
  const local=reducedMotion?scene.duration:t;
  const active=reducedMotion?null:cs.find(c=>local>=c.at&&local<c.end)||null;
  return {
    activeId:active?.id||null,focus:active?.focus||'overview',
    cues:cs.map(c=>({...c,
      visible:allText||local>=c.at,
      alpha:(allText||reducedMotion)?1:cueEase((local-c.at)/.28),
      emphasis:reducedMotion?0:cueEase((local-c.at)/.24)*(1-cueEase((local-c.end)/.22)),
      status:local<c.at?'future':local<c.end?'active':'read'
    }))
  };
}
export function motionValue(scene,t,target,{reducedMotion=false}={}) {
  if(reducedMotion)return 1;
  let value=0;
  for(const c of scene.cues||[])for(const a of c.actions||[])if(a.target===target){
    const start=c.at+a.offset;
    if(t<start)continue;
    if(t>=start+a.duration)value=a.to;
    else return value+(a.to-value)*cueEase((t-start)/a.duration);
  }
  return value;
}
export function cueTimeline(spec) {
  let offset=0;const rows=[];
  for(const s of spec.scenes){for(const c of s.cues||[])rows.push({...c,scene:s.id,at:c.at+offset,end:c.end+offset});offset+=s.duration;}
  return rows;
}
