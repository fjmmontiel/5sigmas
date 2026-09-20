export const FROM_CAVE_RENDER_CONTRACT = Object.freeze({
  unit: 'from-cave-to-agi',
  chapters: 6,
  conceptsPerChapter: 5,
  locales: Object.freeze(['es', 'en']),
  orientations: Object.freeze(['horizontal', 'vertical']),
  horizontal: Object.freeze({width: 1920, height: 1080}),
  vertical: Object.freeze({width: 1080, height: 1920}),
  fps: 60,
  durationSeconds: 75,
  sceneDurationSeconds: 15,
  familyRepeatCap: 2,
  theme: Object.freeze({accent: '#26A69A', accentText: '#00776F', accentSurface: '#E7F4F0'})
});

function invariant(condition, message) {
  if (!condition) throw new Error(`from-cave schema: ${message}`);
}

export function validateFromCaveInputs(localeBindings, chapters) {
  const c = FROM_CAVE_RENDER_CONTRACT;
  invariant(localeBindings?.schema_version === 1 && localeBindings?.unit === c.unit, 'locale binding identity mismatch');
  invariant(JSON.stringify(localeBindings?.locales) === JSON.stringify(c.locales), 'expected ES/EN locale order');
  invariant(Array.isArray(localeBindings?.chapters) && localeBindings.chapters.length === c.chapters, 'six locale-bound chapters required');
  invariant(Array.isArray(chapters) && chapters.length === c.chapters, 'six semantic chapters required');

  const chapterIds = chapters.map(chapter => chapter.chapter);
  invariant(new Set(chapterIds).size === c.chapters, 'duplicate semantic chapter id');
  const conceptIds = [];
  const familyCounts = new Map();
  for (let i = 0; i < c.chapters; i += 1) {
    const chapterId = String(i).padStart(2, '0');
    const chapter = chapters.find(item => item.chapter === chapterId);
    invariant(chapter, `missing semantic chapter ${chapterId}`);
    invariant(Array.isArray(chapter.concepts) && chapter.concepts.length === c.conceptsPerChapter, `${chapterId} must contain five concepts`);
    invariant(typeof chapter.source_es === 'string' && chapter.source_es.length > 0, `${chapterId} source_es missing`);
    const binding = localeBindings.chapters[i];
    invariant(binding?.chapter === chapterId, `locale binding order mismatch at ${chapterId}`);
    invariant(binding.es === chapter.source_es, `ES source binding drift at ${chapterId}`);
    for (const key of ['es', 'en', 'output_es', 'output_en']) invariant(typeof binding[key] === 'string' && binding[key].length > 0, `${chapterId}/${key} missing`);

    for (const concept of chapter.concepts) {
      invariant(typeof concept.concept_id === 'string' && concept.concept_id.length > 0, `${chapterId} concept id missing`);
      for (const key of ['evidence','mechanism','semantic_rationale','perceptual_family','topology','choreography','composition']) {
        invariant(typeof concept[key] === 'string' && concept[key].trim(), `${concept.concept_id} ${key} missing`);
      }
      invariant(Array.isArray(concept.cues) && concept.cues.length >= 4, `${concept.concept_id} needs >=4 semantic cues`);
      invariant(!conceptIds.includes(concept.concept_id), `duplicate concept ${concept.concept_id}`);
      conceptIds.push(concept.concept_id);
      familyCounts.set(concept.perceptual_family, (familyCounts.get(concept.perceptual_family) ?? 0) + 1);
    }
  }
  invariant(conceptIds.length === c.chapters * c.conceptsPerChapter, `expected 30 concepts, got ${conceptIds.length}`);
  const maxFamilyUse = Math.max(...familyCounts.values());
  invariant(maxFamilyUse <= c.familyRepeatCap, `perceptual family repeat cap exceeded: ${maxFamilyUse}`);
  return Object.freeze({chapters: c.chapters, concepts: conceptIds.length, families: familyCounts.size, maxFamilyUse});
}

export function buildFromCaveRenderJobs(localeBindings, chapters) {
  validateFromCaveInputs(localeBindings, chapters);
  const c = FROM_CAVE_RENDER_CONTRACT;
  const jobs = [];
  for (const chapter of localeBindings.chapters) {
    for (const locale of c.locales) {
      for (const orientation of c.orientations) {
        const dims = c[orientation];
        jobs.push(Object.freeze({
          id: `${c.unit}-${chapter.chapter}-${locale}-${orientation}`,
          unit: c.unit,
          chapter: chapter.chapter,
          locale,
          orientation,
          width: dims.width,
          height: dims.height,
          fps: c.fps,
          durationSeconds: c.durationSeconds,
          sourcePath: chapter[locale],
          canonicalHorizontalOutput: chapter[`output_${locale}`],
          nativeVerticalRequired: true,
          reducedMotionRequired: true
        }));
      }
    }
  }
  invariant(jobs.length === 24, `render matrix must contain 24 native jobs, got ${jobs.length}`);
  return Object.freeze(jobs);
}
