const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};

export const SEGURIDAD_SYNC_PROFILE=Object.freeze({
  version:'seguridad-semantic-sync-v3',
  legacyOrientationLeadSeconds:.55,
  legacyTextRevealSeconds:.35,
  legacyReadingHoldEndSeconds:4,
  legacyMotionStartSeconds:4,
  finalObservationHoldSeconds:1.5,
  storyTextStarts:Object.freeze([.55,3.5,6.45]),
  storyVisualStarts:Object.freeze([1.25,4.2,7.15]),
  storyVisualEndSeconds:10.25,
  storyTextRevealSeconds:.28
});

const STORY_CUTS=Object.freeze({
  'S00-C1':Object.freeze({es:[5,7],en:[5,7]}),
  'S00-C2':Object.freeze({es:[4,7],en:[3,7]}),
  'S00-C3':Object.freeze({es:[9,5],en:[6,4]}),
  'S00-C4':Object.freeze({es:[2,1],en:[2,1]}),
  'S00-C5':Object.freeze({es:[3,4],en:[3,3]})
});
function storyRanges(text,conceptId,locale){
  const cuts=STORY_CUTS[conceptId]?.[locale];if(!cuts)return [{start:0,end:text.length}];
  const words=[...text.matchAll(/\S+/gu)];if(words.length<3)return [{start:0,end:text.length}];
  let n=0;const points=[0];for(const count of cuts){n+=count;if(n<words.length)points.push(words[n].index);}points.push(text.length);
  return points.slice(0,-1).map((start,i)=>({start,end:points[i+1]}));
}
function legacyMotionEnd(duration){const end=duration-SEGURIDAD_SYNC_PROFILE.finalObservationHoldSeconds;if(end<=SEGURIDAD_SYNC_PROFILE.legacyMotionStartSeconds)throw new Error('seguridad timeline: no semantic motion window');return end;}

export function seguridadSemanticTimeline(conceptId,durationSeconds){
  if(typeof conceptId!=='string'||!conceptId)throw new Error('seguridad timeline: concept id required');
  const story=conceptId.startsWith('S00-');const visualStart=story?SEGURIDAD_SYNC_PROFILE.storyVisualStarts[0]:SEGURIDAD_SYNC_PROFILE.legacyMotionStartSeconds;const visualEnd=story?SEGURIDAD_SYNC_PROFILE.storyVisualEndSeconds:legacyMotionEnd(durationSeconds);
  return Object.freeze({version:SEGURIDAD_SYNC_PROFILE.version,sentence_id:`${conceptId}.sentence-01`,concept_id:conceptId,visual_target_id:`${conceptId}.mechanism`,action:story?'three_beat_text_visual_story':'read_then_explain',orientation_lead_start_seconds:0,text_start_seconds:story?SEGURIDAD_SYNC_PROFILE.storyTextStarts[0]:SEGURIDAD_SYNC_PROFILE.legacyOrientationLeadSeconds,text_reveal_end_seconds:(story?SEGURIDAD_SYNC_PROFILE.storyTextStarts[0]:SEGURIDAD_SYNC_PROFILE.legacyOrientationLeadSeconds)+(story?SEGURIDAD_SYNC_PROFILE.storyTextRevealSeconds:SEGURIDAD_SYNC_PROFILE.legacyTextRevealSeconds),reading_hold_end_seconds:story?SEGURIDAD_SYNC_PROFILE.storyTextStarts[1]:SEGURIDAD_SYNC_PROFILE.legacyReadingHoldEndSeconds,visual_start_seconds:visualStart,visual_end_seconds:visualEnd,final_hold_start_seconds:visualEnd,end_seconds:durationSeconds});
}

export function seguridadMechanismSeconds(localSeconds,durationSeconds,{reducedMotion=false,storyMode=false}={}){
  if(reducedMotion)return durationSeconds;const local=clamp(localSeconds,0,durationSeconds);
  if(!storyMode){const start=SEGURIDAD_SYNC_PROFILE.legacyMotionStartSeconds,end=legacyMotionEnd(durationSeconds);if(local<=start)return 0;if(local>=end)return durationSeconds;return ((local-start)/(end-start))*durationSeconds;}
  const starts=SEGURIDAD_SYNC_PROFILE.storyVisualStarts;
  if(local<=starts[0])return 0;if(local>=SEGURIDAD_SYNC_PROFILE.storyVisualEndSeconds)return durationSeconds;
  if(local<starts[1])return ((local-starts[0])/(starts[1]-starts[0]))*4;
  if(local<starts[2])return 4+((local-starts[1])/(starts[2]-starts[1]))*4;
  return 8+((local-starts[2])/(SEGURIDAD_SYNC_PROFILE.storyVisualEndSeconds-starts[2]))*4;
}

export function seguridadTextState(text,conceptId,localSeconds,durationSeconds,{reducedMotion=false,locale='es'}={}){
  if(typeof text!=='string'||!text.length)throw new Error('seguridad timeline: scene text required');
  const story=conceptId.startsWith('S00-');const local=reducedMotion?durationSeconds:clamp(localSeconds,0,durationSeconds);const ranges=story?storyRanges(text,conceptId,locale):[{start:0,end:text.length}];
  const cues=ranges.map((range,index)=>{
    const start=story?SEGURIDAD_SYNC_PROFILE.storyTextStarts[index]:SEGURIDAD_SYNC_PROFILE.legacyOrientationLeadSeconds;
    const next=story?(SEGURIDAD_SYNC_PROFILE.storyTextStarts[index+1]??10.5):SEGURIDAD_SYNC_PROFILE.legacyReadingHoldEndSeconds;
    const visualAt=story?SEGURIDAD_SYNC_PROFILE.storyVisualStarts[index]:SEGURIDAD_SYNC_PROFILE.legacyMotionStartSeconds;
    const reveal=story?SEGURIDAD_SYNC_PROFILE.storyTextRevealSeconds:SEGURIDAD_SYNC_PROFILE.legacyTextRevealSeconds;
    const visible=reducedMotion||local>=start,alpha=reducedMotion?1:ease((local-start)/reveal);
    const emphasisIn=reducedMotion?0:ease((local-start)/.22),emphasisOut=reducedMotion?1:ease((local-(next-.3))/.28);
    return Object.freeze({id:`${conceptId}.beat-${String(index+1).padStart(2,'0')}`,sentence_id:`${conceptId}.beat-${String(index+1).padStart(2,'0')}`,concept_id:conceptId,visual_target_id:`${conceptId}.phase-${index+1}`,action:'read_then_show_corresponding_phase',paragraph:0,range:Object.freeze(range),visible,alpha,guideStrong:true,guideAlpha:reducedMotion?0:.82*emphasisIn*(1-emphasisOut),emphasis:reducedMotion?0:.78*emphasisIn*(1-emphasisOut),status:local<start?'future':local<next?'active':'read',text_at:start,visual_at:visualAt,locale});
  });
  return Object.freeze({activeId:cues.find(c=>c.status==='active')?.id??null,focus:conceptId,timeline:seguridadSemanticTimeline(conceptId,durationSeconds),cues:Object.freeze(cues)});
}
