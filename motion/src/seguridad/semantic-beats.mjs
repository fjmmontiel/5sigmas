/** Whole-clause timing and state transitions. No independent QA is claimed here. */
export const BEAT_VERSION='seguridad-semantic-beats-v3';
const clamp=n=>Math.max(0,Math.min(1,n));
export const ease=n=>{const t=clamp(n);return t*t*t*(t*(t*6-15)+10);};
const required=['id','text','at','settledAt','target','action'];
export function validateBeatScene(scene,locale) {
 if(!scene||!Array.isArray(scene.beats)||scene.beats.length<2)throw Error('MULTI_IDEA_SCENE_REQUIRES_AUTHORED_BEATS');
 if(!Number.isFinite(scene.duration)||scene.duration<=0)throw Error('INVALID_DURATION');
 let previous=-1;const ids=new Set();
 for(const [i,b] of scene.beats.entries()) {
  if(required.some(k=>b[k]===undefined)||ids.has(b.id))throw Error('MISSING_OR_DUPLICATE_BEAT');ids.add(b.id);
  if(typeof b.text?.[locale]!=='string'||!b.text[locale].trim())throw Error('MISSING_LOCALE');
  if(!Number.isFinite(b.at)||!Number.isFinite(b.settledAt)||b.at<=previous||b.at<0||b.settledAt<=b.at||b.settledAt>scene.duration)throw Error('INVALID_BEAT_ORDER');
  const next=scene.beats[i+1]?.at??scene.duration;
  if(next-b.at<b.text[locale].split(/\s+/).length/3.5)throw Error('INSUFFICIENT_READING_TIME');
  if(next-b.settledAt<.8)throw Error('MISSING_OBSERVATION_HOLD');
  if(['fade','opacity','reveal','cursor','generic_motion'].includes(b.action))throw Error('NO_SEMANTIC_ACTION');
  if(!b.expected?.before||!b.expected?.after||JSON.stringify(b.expected.before)===JSON.stringify(b.expected.after))throw Error('NO_STATE_TRANSITION');
  previous=b.at;
 }
 if(scene.beats.map(b=>b.text[locale]).join(' ')!==scene.text[locale])throw Error('TEXT_DRIFT');
 return true;
}
export function beatState(scene,locale,seconds,reducedMotion=false) {
 validateBeatScene(scene,locale);
 if(!Number.isFinite(seconds))throw Error('INVALID_TIME');
 const t=reducedMotion?scene.duration:Math.max(0,Math.min(scene.duration,seconds));let offset=0;
 const cues=scene.beats.map((b,i)=>{
  const text=b.text[locale],start=offset;offset+=text.length+1;
  const next=scene.beats[i+1]?.at??scene.duration;
  const visible=t>=b.at,visualAt=Math.min(b.settledAt-.35,b.at+Math.min(.85,Math.max(.45,(b.settledAt-b.at)*.28)));
  return {id:b.id,sentence_id:b.id,concept_id:scene.id,visual_target_id:b.target,action:b.action,paragraph:0,range:{start,end:start+text.length},visible,alpha:visible?1:0,guideStrong:true,guideAlpha:(visible&&t<next)?0.82:0,emphasis:(visible&&t<next)?0.78:0,status:!visible?'future':t<next?'active':'read',text_at:b.at,visual_at:visualAt,progress:reducedMotion?1:ease((t-visualAt)/(b.settledAt-visualAt))};
 });
 return {version:BEAT_VERSION,activeId:cues.find(c=>c.status==='active')?.id??null,cues,t,reducedMotion};
}
export function expectedBeatEvents(scene,start=0) {
 return scene.beats.map(b=>{const visualAt=Math.min(b.settledAt-.35,b.at+Math.min(.85,Math.max(.45,(b.settledAt-b.at)*.28)));return {id:b.id,sentence_id:b.id,concept_id:scene.id,visual_target_id:b.target,action:b.action,text_at:start+b.at,visual_at:start+visualAt,settled_at:start+b.settledAt,scene_end_at:start+scene.duration,expected:b.expected};});
}
