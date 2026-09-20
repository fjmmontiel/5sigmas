export const FUNDAMENTOS_RENDER_CONTRACT = Object.freeze({
  unit: 'fundamentos-ia-iag',
  chapters: 5,
  conceptsPerChapter: 5,
  locales: Object.freeze(['es', 'en']),
  orientations: Object.freeze(['horizontal', 'vertical']),
  horizontal: Object.freeze({width: 1920, height: 1080}),
  vertical: Object.freeze({width: 1080, height: 1920}),
  fps: 60,
  durationSeconds: 75,
  sceneDurationSeconds: 15,
  familyRepeatCap: 2,
  theme: Object.freeze({base:'#FAFAF8', accent:'#2D6A9F', accentText:'#1F4E75', accentSurface:'#E8F1F7'})
});

function invariant(condition, message) {
  if (!condition) throw new Error(`fundamentos schema: ${message}`);
}

export function validateFundamentosRegister(register) {
  const c = FUNDAMENTOS_RENDER_CONTRACT;
  invariant(register?.schema_version === 1 && register?.unit === c.unit, 'register identity mismatch');
  invariant(register?.technical_golden === false && register?.published === false, 'authoring register cannot pre-certify release');
  invariant(JSON.stringify(register?.render_contract?.languages) === JSON.stringify(c.locales), 'expected ES/EN language order');
  invariant(JSON.stringify(register?.render_contract?.orientations) === JSON.stringify(c.orientations), 'expected H/V orientation order');
  invariant(register?.render_contract?.fps === c.fps, 'fps drift');
  invariant(register?.render_contract?.target_duration_seconds === c.durationSeconds, 'duration drift');
  invariant(register?.render_contract?.scene_seconds === c.sceneDurationSeconds, 'scene duration drift');
  invariant(register?.theme_lock?.accent === c.theme.accent, 'accent drift');
  invariant(register?.theme_lock?.accent_dark === c.theme.accentText, 'accent text drift');
  invariant(register?.theme_lock?.accent_surface === c.theme.accentSurface, 'accent surface drift');
  invariant(Array.isArray(register?.source_bindings) && register.source_bindings.length === c.chapters, 'five source-bound chapters required');
  invariant(Array.isArray(register?.concepts) && register.concepts.length === c.chapters*c.conceptsPerChapter, '25 canonical concepts required');

  const chapterCounts = new Map();
  const conceptIds = new Set();
  const mechanisms = new Set();
  const families = new Map();
  for (const binding of register.source_bindings) {
    invariant(typeof binding?.chapter === 'string' && binding.chapter.length > 0, 'source chapter missing');
    for (const locale of c.locales) {
      invariant(typeof binding?.[locale]?.path === 'string' && binding[locale].path.length > 0, `${binding.chapter}/${locale} path missing`);
      invariant(/^[0-9a-f]{40}$/.test(binding?.[locale]?.blob_sha ?? ''), `${binding.chapter}/${locale} blob SHA invalid`);
    }
  }
  const sourceChapters = new Set(register.source_bindings.map(binding=>binding.chapter));
  invariant(sourceChapters.size === c.chapters, 'duplicate source chapter binding');

  for (const concept of register.concepts) {
    invariant(sourceChapters.has(concept?.chapter), `${concept?.id} chapter not source-bound`);
    invariant(typeof concept?.id === 'string' && concept.id.length > 0, 'concept id missing');
    invariant(!conceptIds.has(concept.id), `duplicate concept ${concept.id}`);
    conceptIds.add(concept.id);
    for (const key of ['question','evidence','mechanism','semantic_rationale','perceptual_family','topology','choreography','composition']) {
      invariant(typeof concept?.[key] === 'string' && concept[key].trim().length > 0, `${concept.id}/${key} missing`);
    }
    invariant(Array.isArray(concept.cues) && concept.cues.length >= 3, `${concept.id} requires >=3 cues`);
    invariant(concept.cues.every((cue,i,a)=>Number.isFinite(cue) && cue>=0 && cue<c.sceneDurationSeconds && (i===0 || cue>a[i-1])), `${concept.id} cues must be sorted and within scene`);
    for (const locale of c.locales) {
      invariant(typeof concept?.copy?.[locale]?.title === 'string' && concept.copy[locale].title.trim(), `${concept.id}/${locale} title missing`);
      invariant(typeof concept?.copy?.[locale]?.body === 'string' && concept.copy[locale].body.trim(), `${concept.id}/${locale} body missing`);
    }
    chapterCounts.set(concept.chapter,(chapterCounts.get(concept.chapter)??0)+1);
    invariant(!mechanisms.has(concept.mechanism), `mechanism reused: ${concept.mechanism}`);
    mechanisms.add(concept.mechanism);
    families.set(concept.perceptual_family,(families.get(concept.perceptual_family)??0)+1);
  }
  for (const chapter of sourceChapters) invariant(chapterCounts.get(chapter)===c.conceptsPerChapter, `${chapter} must contain five concepts`);
  const maxFamilyUse=Math.max(...families.values());
  invariant(maxFamilyUse<=c.familyRepeatCap, `perceptual family repeat cap exceeded: ${maxFamilyUse}`);
  invariant(mechanisms.size===25, `expected 25 explicit mechanisms, got ${mechanisms.size}`);
  return Object.freeze({chapters:sourceChapters.size,concepts:conceptIds.size,mechanisms:mechanisms.size,families:families.size,maxFamilyUse});
}

export function buildFundamentosRenderJobs(register) {
  validateFundamentosRegister(register);
  const c=FUNDAMENTOS_RENDER_CONTRACT;
  const jobs=[];
  for (const binding of register.source_bindings) {
    for (const locale of c.locales) {
      for (const orientation of c.orientations) {
        const dims=c[orientation];
        jobs.push(Object.freeze({
          id:`${c.unit}-${binding.chapter}-${locale}-${orientation}`,
          unit:c.unit,chapter:binding.chapter,locale,orientation,width:dims.width,height:dims.height,
          fps:c.fps,durationSeconds:c.durationSeconds,sourcePath:binding[locale].path,sourceBlobSha:binding[locale].blob_sha,
          nativeVerticalRequired:true,reducedMotionRequired:true,silent:true
        }));
      }
    }
  }
  invariant(jobs.length===20,`render matrix must contain 20 native jobs, got ${jobs.length}`);
  return Object.freeze(jobs);
}
