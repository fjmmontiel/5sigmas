import { buildSeguridadRenderJobs, validateSeguridadSpec, SEGURIDAD_RENDER_CONTRACT } from './schema.mjs';
import { compileSeguridadMechanism, SUPPORTED_SEGURIDAD_TOPOLOGIES } from './mechanisms.mjs';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function indexSeguridadRegister(register) {
  const concepts = new Map();
  for (const chapter of register?.chapters ?? []) {
    for (const concept of chapter?.concepts ?? []) {
      if (concepts.has(concept.id)) throw new Error(`seguridad engine: duplicate concept ${concept.id}`);
      concepts.set(concept.id, concept);
    }
  }
  if (concepts.size !== 30) throw new Error(`seguridad engine: expected 30 concepts, got ${concepts.size}`);
  return concepts;
}

export function seguridadRenderMatrix(spec, register) {
  validateSeguridadSpec(spec, register);
  return buildSeguridadRenderJobs(spec, register);
}

function resolveJob(spec, register, jobOrId) {
  const jobs = seguridadRenderMatrix(spec, register);
  const id = typeof jobOrId === 'string' ? jobOrId : jobOrId?.id;
  const job = jobs.find(candidate => candidate.id === id);
  if (!job) throw new Error(`seguridad engine: unknown render job ${id}`);
  return job;
}

export function compileSeguridadChapter(spec, register, jobOrId, { reducedMotion = false } = {}) {
  const job = resolveJob(spec, register, jobOrId);
  const concepts = indexSeguridadRegister(register);
  const chapter = spec.chapters.find(item => item.chapter === job.chapter);
  if (!chapter) throw new Error(`seguridad engine: missing chapter ${job.chapter}`);

  const scenes = chapter.scenes.map((scene, index) => {
    const concept = concepts.get(scene.concept_id);
    if (!concept) throw new Error(`seguridad engine: register missing ${scene.concept_id}`);
    if (!SUPPORTED_SEGURIDAD_TOPOLOGIES.includes(concept.topology)) throw new Error(`seguridad engine: unsupported topology ${concept.topology}`);
    const mechanism = compileSeguridadMechanism(concept, {
      orientation: job.orientation,
      localSeconds: reducedMotion ? SEGURIDAD_RENDER_CONTRACT.sceneDurationSeconds : 0,
      durationSeconds: SEGURIDAD_RENDER_CONTRACT.sceneDurationSeconds,
      reducedMotion
    });
    return Object.freeze({
      index,
      conceptId: scene.concept_id,
      start: scene.start,
      end: scene.end,
      durationSeconds: scene.end - scene.start,
      text: scene.text[job.locale],
      evidence: concept.evidence,
      semanticRationale: concept.semantic_rationale,
      perceptualFamily: concept.perceptual_family,
      topology: concept.topology,
      choreography: concept.choreography,
      composition: concept.composition,
      mechanism
    });
  });

  return Object.freeze({
    job,
    title: chapter.title[job.locale],
    summary: chapter.summary[job.locale],
    articleChapters: Object.freeze(chapter.article_chapters.map(item => Object.freeze({start:item.start,end:item.end,name:item.name[job.locale]}))),
    scenes: Object.freeze(scenes)
  });
}

export function seguridadFrameState(spec, register, jobOrId, timeSeconds, { reducedMotion = false } = {}) {
  if (!Number.isFinite(timeSeconds)) throw new Error('seguridad engine: timeSeconds must be finite');
  const chapterPlan = compileSeguridadChapter(spec, register, jobOrId, { reducedMotion });
  const duration = SEGURIDAD_RENDER_CONTRACT.durationSeconds;
  const t = clamp(timeSeconds, 0, duration);
  const seekT = t === duration ? duration - Number.EPSILON * duration : t;
  const sceneIndex = Math.min(chapterPlan.scenes.length - 1, Math.floor(seekT / SEGURIDAD_RENDER_CONTRACT.sceneDurationSeconds));
  const scene = chapterPlan.scenes[sceneIndex];
  const localSeconds = reducedMotion ? scene.durationSeconds : clamp(t - scene.start, 0, scene.durationSeconds);
  const concepts = indexSeguridadRegister(register);
  const concept = concepts.get(scene.conceptId);
  const mechanism = compileSeguridadMechanism(concept, {
    orientation: chapterPlan.job.orientation,
    localSeconds,
    durationSeconds: scene.durationSeconds,
    reducedMotion
  });

  return Object.freeze({
    job: chapterPlan.job,
    timeSeconds: t,
    sceneIndex,
    localSeconds,
    progress: t / duration,
    title: chapterPlan.title,
    summary: chapterPlan.summary,
    scene: Object.freeze({ ...scene, mechanism }),
    reducedMotion
  });
}

export function validateSeguridadMechanismCoverage(spec, register) {
  validateSeguridadSpec(spec, register);
  const concepts = indexSeguridadRegister(register);
  const missing = [];
  const counts = new Map();
  for (const concept of concepts.values()) {
    if (!SUPPORTED_SEGURIDAD_TOPOLOGIES.includes(concept.topology)) missing.push({ id: concept.id, topology: concept.topology });
    counts.set(concept.perceptual_family, (counts.get(concept.perceptual_family) ?? 0) + 1);
    for (const orientation of SEGURIDAD_RENDER_CONTRACT.orientations) {
      compileSeguridadMechanism(concept, { orientation, localSeconds: 6, durationSeconds: 12 });
      compileSeguridadMechanism(concept, { orientation, localSeconds: 12, durationSeconds: 12, reducedMotion: true });
    }
  }
  if (missing.length) throw new Error(`seguridad engine: uncovered topology ${JSON.stringify(missing)}`);
  const maxFamilyUse = Math.max(...counts.values());
  if (maxFamilyUse > SEGURIDAD_RENDER_CONTRACT.familyRepeatCap) throw new Error(`seguridad engine: family repeat ${maxFamilyUse} exceeds cap`);
  return Object.freeze({ concepts: concepts.size, families: counts.size, maxFamilyUse, supportedTopologies: SUPPORTED_SEGURIDAD_TOPOLOGIES.length });
}
