export const FUNDAMENTOS_TIMELINE_VERSION='fundamentos-cue-timeline-v2';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function invariant(condition,message){if(!condition)throw new Error(`fundamentos timeline: ${message}`);}

export function compileFundamentosCueTimeline(concept,locale,{localSeconds=0,durationSeconds=15,reducedMotion=false}={}){
  invariant(concept&&typeof concept.id==='string','concept id missing');
  invariant(['es','en'].includes(locale),`unsupported locale ${locale}`);
  invariant(Number.isFinite(localSeconds)&&Number.isFinite(durationSeconds)&&durationSeconds>0,'invalid time');
  invariant(Array.isArray(concept.cues)&&concept.cues.length>=2,`${concept.id} needs at least two authored cues`);
  const copy=concept.copy?.[locale];
  invariant(copy&&typeof copy.title==='string'&&copy.title.trim(),`${concept.id}/${locale} title missing`);
  invariant(typeof copy.body==='string'&&copy.body.trim(),`${concept.id}/${locale} body missing`);
  const t=reducedMotion?durationSeconds:clamp(localSeconds,0,durationSeconds);
  const bodyRevealAt=concept.cues[1];
  const titleSentenceId=`${concept.id}:${locale}:title`;
  const bodySentenceId=`${concept.id}:${locale}:body`;
  const events=concept.cues.map((at,index)=>Object.freeze({
    cue_id:`${concept.id}:${locale}:cue-${index}`,
    sentence_id:index===0?titleSentenceId:bodySentenceId,
    concept_id:concept.id,
    visual_target_id:`cue-${index}`,
    action:index===0?'establish-concept':index===concept.cues.length-1?'complete-mechanism':'advance-mechanism',
    semantic_action:concept.choreography,
    planned_start_seconds:at,
    planned_end_seconds:concept.cues[index+1]??durationSeconds,
    active:t>=at
  }));
  const activeEvents=events.filter(event=>event.active);
  return Object.freeze({
    version:FUNDAMENTOS_TIMELINE_VERSION,
    concept_id:concept.id,
    locale,
    local_seconds:Number(t.toFixed(6)),
    duration_seconds:durationSeconds,
    reduced_motion:reducedMotion,
    body_reveal_at_seconds:bodyRevealAt,
    visible_body:t>=bodyRevealAt?copy.body:'',
    visible_sentence_ids:Object.freeze(t>=bodyRevealAt?[titleSentenceId,bodySentenceId]:[titleSentenceId]),
    current_cue_id:activeEvents.length?activeEvents[activeEvents.length-1].cue_id:null,
    events:Object.freeze(events)
  });
}

export function validateFundamentosCueBinding(timeline,mechanism){
  invariant(timeline?.version===FUNDAMENTOS_TIMELINE_VERSION,'timeline version mismatch');
  invariant(Array.isArray(timeline.events),'events missing');
  invariant(Array.isArray(mechanism?.nodes),'mechanism nodes missing');
  invariant(timeline.events.length===mechanism.nodes.length,`event/node count mismatch ${timeline.events.length}/${mechanism.nodes.length}`);
  for(let index=0;index<timeline.events.length;index++){
    const event=timeline.events[index],node=mechanism.nodes[index];
    invariant(event.visual_target_id===node.id,`${timeline.concept_id} cue ${index} target mismatch`);
    invariant(Math.abs(event.planned_start_seconds-node.cue)<1e-9,`${timeline.concept_id} cue ${index} timing mismatch`);
    invariant(event.concept_id===timeline.concept_id,`${timeline.concept_id} cue ${index} concept mismatch`);
  }
  return true;
}
