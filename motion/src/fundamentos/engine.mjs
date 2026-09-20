import {FUNDAMENTOS_RENDER_CONTRACT,buildFundamentosRenderJobs,validateFundamentosRegister} from './schema.mjs';
import {SUPPORTED_FUNDAMENTOS_MECHANISMS,compileFundamentosMechanism} from './mechanisms.mjs';
import {compileFundamentosCueTimeline,validateFundamentosCueBinding} from './timeline.mjs';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function indexFundamentosConcepts(register){
  validateFundamentosRegister(register);
  return new Map(register.concepts.map(concept=>[concept.id,concept]));
}
export function fundamentosRenderMatrix(register){return buildFundamentosRenderJobs(register);}
function resolveJob(register,jobOrId){
  const id=typeof jobOrId==='string'?jobOrId:jobOrId?.id;
  const job=fundamentosRenderMatrix(register).find(candidate=>candidate.id===id);
  if(!job) throw new Error(`fundamentos engine: unknown render job ${id}`);
  return job;
}
export function compileFundamentosChapter(register,jobOrId,{reducedMotion=false}={}){
  const job=resolveJob(register,jobOrId);
  const concepts=register.concepts.filter(concept=>concept.chapter===job.chapter);
  if(concepts.length!==FUNDAMENTOS_RENDER_CONTRACT.conceptsPerChapter) throw new Error(`fundamentos engine: ${job.chapter} must contain five concepts`);
  const scenes=concepts.map((concept,index)=>{
    if(!SUPPORTED_FUNDAMENTOS_MECHANISMS.includes(concept.mechanism)) throw new Error(`fundamentos engine: unsupported mechanism ${concept.mechanism}`);
    const start=index*FUNDAMENTOS_RENDER_CONTRACT.sceneDurationSeconds,end=(index+1)*FUNDAMENTOS_RENDER_CONTRACT.sceneDurationSeconds,durationSeconds=end-start;
    const localSeconds=reducedMotion?durationSeconds:0;
    const mechanism=compileFundamentosMechanism(concept,{orientation:job.orientation,localSeconds,durationSeconds,reducedMotion});
    const timeline=compileFundamentosCueTimeline(concept,job.locale,{localSeconds,durationSeconds,reducedMotion});
    validateFundamentosCueBinding(timeline,mechanism);
    return Object.freeze({index,conceptId:concept.id,start,end,durationSeconds,title:concept.copy[job.locale].title,body:concept.copy[job.locale].body,evidence:concept.evidence,semanticRationale:concept.semantic_rationale,perceptualFamily:concept.perceptual_family,topology:concept.topology,choreography:concept.choreography,composition:concept.composition,mechanism,timeline});
  });
  return Object.freeze({job,scenes:Object.freeze(scenes)});
}
export function fundamentosFrameState(register,jobOrId,timeSeconds,{reducedMotion=false}={}){
  if(!Number.isFinite(timeSeconds)) throw new Error('fundamentos engine: timeSeconds must be finite');
  const plan=compileFundamentosChapter(register,jobOrId,{reducedMotion});
  const duration=FUNDAMENTOS_RENDER_CONTRACT.durationSeconds,t=clamp(timeSeconds,0,duration),seekT=t===duration?duration-Number.EPSILON*duration:t;
  const sceneIndex=Math.min(plan.scenes.length-1,Math.floor(seekT/FUNDAMENTOS_RENDER_CONTRACT.sceneDurationSeconds));
  const scene=plan.scenes[sceneIndex],localSeconds=reducedMotion?scene.durationSeconds:clamp(t-scene.start,0,scene.durationSeconds);
  const concept=register.concepts.find(item=>item.id===scene.conceptId);
  const mechanism=compileFundamentosMechanism(concept,{orientation:plan.job.orientation,localSeconds,durationSeconds:scene.durationSeconds,reducedMotion});
  const timeline=compileFundamentosCueTimeline(concept,plan.job.locale,{localSeconds,durationSeconds:scene.durationSeconds,reducedMotion});
  validateFundamentosCueBinding(timeline,mechanism);
  return Object.freeze({job:plan.job,timeSeconds:t,sceneIndex,localSeconds,progress:t/duration,reducedMotion,scene:Object.freeze({...scene,mechanism,timeline})});
}
export function validateFundamentosMechanismCoverage(register){
  const structural=validateFundamentosRegister(register),missing=[],mechanismIds=new Set();
  for(const concept of register.concepts){
    if(!SUPPORTED_FUNDAMENTOS_MECHANISMS.includes(concept.mechanism))missing.push({id:concept.id,mechanism:concept.mechanism});
    for(const orientation of FUNDAMENTOS_RENDER_CONTRACT.orientations){
      const moving=compileFundamentosMechanism(concept,{orientation,localSeconds:7.5,durationSeconds:15});
      const still=compileFundamentosMechanism(concept,{orientation,localSeconds:15,durationSeconds:15,reducedMotion:true});
      mechanismIds.add(moving.mechanismId);mechanismIds.add(still.mechanismId);
    }
  }
  if(missing.length)throw new Error(`fundamentos engine: uncovered mechanism ${JSON.stringify(missing)}`);
  if(mechanismIds.size!==25)throw new Error(`fundamentos engine: expected 25 explicit mechanisms, got ${mechanismIds.size}`);
  return Object.freeze({...structural,mechanisms:mechanismIds.size,supportedMechanisms:SUPPORTED_FUNDAMENTOS_MECHANISMS.length,jobs:buildFundamentosRenderJobs(register).length});
}
