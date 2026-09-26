import {buildFromCaveRenderJobs, validateFromCaveInputs, FROM_CAVE_RENDER_CONTRACT} from './schema.mjs';
import {compileFromCaveMechanism, SUPPORTED_FROM_CAVE_TOPOLOGIES} from './mechanisms.mjs';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function indexFromCaveConcepts(chapters){
  const concepts=new Map();
  for(const chapter of chapters){
    for(const concept of chapter.concepts){
      if(concepts.has(concept.concept_id)) throw new Error(`from-cave engine: duplicate concept ${concept.concept_id}`);
      concepts.set(concept.concept_id,concept);
    }
  }
  if(concepts.size!==30) throw new Error(`from-cave engine: expected 30 concepts, got ${concepts.size}`);
  return concepts;
}

export function fromCaveRenderMatrix(localeBindings,chapters){
  validateFromCaveInputs(localeBindings,chapters);
  return buildFromCaveRenderJobs(localeBindings,chapters);
}

function resolveJob(localeBindings,chapters,jobOrId){
  const jobs=fromCaveRenderMatrix(localeBindings,chapters);
  const id=typeof jobOrId==='string'?jobOrId:jobOrId?.id;
  const job=jobs.find(candidate=>candidate.id===id);
  if(!job) throw new Error(`from-cave engine: unknown render job ${id}`);
  return job;
}

export function compileFromCaveChapter(localeBindings,chapters,jobOrId,{reducedMotion=false}={}){
  const job=resolveJob(localeBindings,chapters,jobOrId);
  const concepts=indexFromCaveConcepts(chapters);
  const chapter=chapters.find(item=>item.chapter===job.chapter);
  const scenes=chapter.concepts.map((concept,index)=>{
    if(!SUPPORTED_FROM_CAVE_TOPOLOGIES.includes(concept.topology)) throw new Error(`from-cave engine: unsupported topology ${concept.topology}`);
    const start=index*FROM_CAVE_RENDER_CONTRACT.sceneDurationSeconds;
    const end=(index+1)*FROM_CAVE_RENDER_CONTRACT.sceneDurationSeconds;
    return Object.freeze({
      index,conceptId:concept.concept_id,start,end,durationSeconds:end-start,
      evidence:concept.evidence,semanticRationale:concept.semantic_rationale,
      perceptualFamily:concept.perceptual_family,topology:concept.topology,
      choreography:concept.choreography,composition:concept.composition,
      mechanism:compileFromCaveMechanism(concept,{orientation:job.orientation,localSeconds:reducedMotion?end-start:0,durationSeconds:end-start,reducedMotion})
    });
  });
  return Object.freeze({job,question:chapter.question,scenes:Object.freeze(scenes)});
}

export function fromCaveFrameState(localeBindings,chapters,jobOrId,timeSeconds,{reducedMotion=false}={}){
  if(!Number.isFinite(timeSeconds)) throw new Error('from-cave engine: timeSeconds must be finite');
  const plan=compileFromCaveChapter(localeBindings,chapters,jobOrId,{reducedMotion});
  const duration=FROM_CAVE_RENDER_CONTRACT.durationSeconds;
  const t=clamp(timeSeconds,0,duration);
  const seekT=t===duration?duration-Number.EPSILON*duration:t;
  const sceneIndex=Math.min(plan.scenes.length-1,Math.floor(seekT/FROM_CAVE_RENDER_CONTRACT.sceneDurationSeconds));
  const scene=plan.scenes[sceneIndex];
  const localSeconds=reducedMotion?scene.durationSeconds:clamp(t-scene.start,0,scene.durationSeconds);
  const concept=indexFromCaveConcepts(chapters).get(scene.conceptId);
  return Object.freeze({
    job:plan.job,timeSeconds:t,sceneIndex,localSeconds,progress:t/duration,reducedMotion,
    scene:Object.freeze({...scene,mechanism:compileFromCaveMechanism(concept,{orientation:plan.job.orientation,localSeconds,durationSeconds:scene.durationSeconds,reducedMotion})})
  });
}

export function validateFromCaveMechanismCoverage(localeBindings,chapters){
  const structural=validateFromCaveInputs(localeBindings,chapters);
  const concepts=indexFromCaveConcepts(chapters);
  const missing=[]; const mechanismIds=new Set();
  for(const concept of concepts.values()){
    if(!SUPPORTED_FROM_CAVE_TOPOLOGIES.includes(concept.topology)) missing.push({id:concept.concept_id,topology:concept.topology});
    for(const orientation of FROM_CAVE_RENDER_CONTRACT.orientations){
      const mid=compileFromCaveMechanism(concept,{orientation,localSeconds:7.5,durationSeconds:15});
      const still=compileFromCaveMechanism(concept,{orientation,localSeconds:15,durationSeconds:15,reducedMotion:true});
      mechanismIds.add(mid.mechanismId); mechanismIds.add(still.mechanismId);
    }
  }
  if(missing.length) throw new Error(`from-cave engine: uncovered topology ${JSON.stringify(missing)}`);
  if(mechanismIds.size!==30) throw new Error(`from-cave engine: expected 30 explicit mechanisms, got ${mechanismIds.size}`);
  return Object.freeze({...structural,mechanisms:mechanismIds.size,supportedTopologies:SUPPORTED_FROM_CAVE_TOPOLOGIES.length});
}
