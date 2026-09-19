const HEX = /^#[0-9A-F]{6}$/u;

export const SEGURIDAD_RENDER_CONTRACT = Object.freeze({
  unit: 'seguridad-ia',
  chapters: 6,
  conceptsPerChapter: 5,
  durationSeconds: 60,
  sceneDurationSeconds: 12,
  fps: 60,
  horizontal: Object.freeze({ width: 1920, height: 1080 }),
  vertical: Object.freeze({ width: 1080, height: 1920 }),
  locales: Object.freeze(['es', 'en']),
  orientations: Object.freeze(['horizontal', 'vertical']),
  familyRepeatCap: 2,
  theme: Object.freeze({ accent: '#B44B31', accentDark: '#7F3525', accentSurface: '#F7ECE8' })
});

function invariant(condition, message) {
  if (!condition) throw new Error(`seguridad-ia schema: ${message}`);
}

function exactKeys(obj, expected, label) {
  invariant(obj && typeof obj === 'object' && !Array.isArray(obj), `${label} must be an object`);
  const actual = Object.keys(obj).sort();
  const wanted = [...expected].sort();
  invariant(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys ${JSON.stringify(actual)} != ${JSON.stringify(wanted)}`);
}

export function validateSeguridadSpec(spec, register) {
  const c = SEGURIDAD_RENDER_CONTRACT;
  invariant(spec?.schema_version === 1, 'spec schema_version must be 1');
  invariant(spec?.unit === c.unit, `spec unit must be ${c.unit}`);
  invariant(spec?.status === 'AUTHORED_NOT_RENDERED' || spec?.status === 'RENDERED_REVIEW_PENDING', 'unexpected spec status');
  invariant(spec?.technical_golden === false, 'authored/review-pending spec cannot self-certify Technical GOLDEN');
  invariant(spec?.owner_visual_approval === 'NOT_REQUESTED' || spec?.owner_visual_approval === 'PENDING', 'unreviewed Seguridad spec cannot claim owner approval');

  exactKeys(spec.theme, ['base', 'accent', 'accent_dark', 'accent_surface'], 'theme');
  invariant(spec.theme.base === 'neutral_flat_editorial', 'theme base must stay neutral_flat_editorial');
  invariant(HEX.test(spec.theme.accent) && HEX.test(spec.theme.accent_dark) && HEX.test(spec.theme.accent_surface), 'theme colors must be uppercase six-digit hex');
  invariant(spec.theme.accent === c.theme.accent, `accent must be ${c.theme.accent}`);
  invariant(spec.theme.accent_dark === c.theme.accentDark, `accent_dark must be ${c.theme.accentDark}`);
  invariant(spec.theme.accent_surface === c.theme.accentSurface, `accent_surface must be ${c.theme.accentSurface}`);

  const rc = spec.render_contract;
  invariant(rc?.width_horizontal === c.horizontal.width && rc?.height_horizontal === c.horizontal.height, 'horizontal dimensions regressed');
  invariant(rc?.width_vertical === c.vertical.width && rc?.height_vertical === c.vertical.height, 'vertical dimensions regressed');
  invariant(rc?.fps === c.fps, 'fps must be 60');
  invariant(rc?.duration_seconds_per_chapter === c.durationSeconds, 'chapter duration must be 60 seconds');
  invariant(rc?.scene_duration_seconds === c.sceneDurationSeconds, 'scene duration must be 12 seconds');
  invariant(rc?.audio === 'silent', 'baseline render contract is silent');
  invariant(rc?.deterministic_seek === true, 'deterministic seek is required');
  invariant(rc?.native_vertical_recomposition === true, 'native vertical recomposition is required');
  invariant(rc?.reduced_motion_variant === true, 'reduced-motion variant is required');
  invariant(rc?.text_reveal === 'whole_chunk', 'text reveal must be whole_chunk');
  invariant(rc?.unseen_text_prelaid_out === true, 'unseen text must be pre-laid out');

  invariant(Array.isArray(spec.source_bindings) && spec.source_bindings.length === c.chapters, 'six bilingual source bindings required');
  for (let i = 0; i < c.chapters; i += 1) {
    const chapter = String(i).padStart(2, '0');
    const binding = spec.source_bindings[i];
    invariant(binding?.chapter === chapter, `source binding order mismatch at ${chapter}`);
    for (const locale of c.locales) {
      invariant(typeof binding?.[locale]?.path === 'string' && binding[locale].path.length > 0, `${chapter}/${locale} source path missing`);
      invariant(/^[0-9a-f]{40}$/u.test(binding?.[locale]?.blob_sha ?? ''), `${chapter}/${locale} source blob sha missing/invalid`);
    }
  }

  invariant(Array.isArray(spec.chapters) && spec.chapters.length === c.chapters, 'six chapters required');
  const conceptIds = [];
  for (let i = 0; i < c.chapters; i += 1) {
    const chapterId = String(i).padStart(2, '0');
    const chapter = spec.chapters[i];
    invariant(chapter?.chapter === chapterId, `chapter order mismatch at ${chapterId}`);
    invariant(typeof chapter?.slug === 'string' && chapter.slug.length > 0, `${chapterId} slug missing`);
    for (const locale of c.locales) {
      invariant(typeof chapter?.title?.[locale] === 'string' && chapter.title[locale].trim(), `${chapterId}/${locale} title missing`);
      invariant(typeof chapter?.summary?.[locale] === 'string' && chapter.summary[locale].trim(), `${chapterId}/${locale} summary missing`);
    }
    invariant(Array.isArray(chapter.scenes) && chapter.scenes.length === c.conceptsPerChapter, `${chapterId} must contain five scenes`);
    chapter.scenes.forEach((scene, index) => {
      const expectedId = `S${chapterId}-C${index + 1}`;
      invariant(scene?.concept_id === expectedId, `${chapterId} concept id ${scene?.concept_id} != ${expectedId}`);
      invariant(scene?.start === index * c.sceneDurationSeconds, `${expectedId} start is not deterministic`);
      invariant(scene?.end === (index + 1) * c.sceneDurationSeconds, `${expectedId} end is not deterministic`);
      for (const locale of c.locales) invariant(typeof scene?.text?.[locale] === 'string' && scene.text[locale].trim(), `${expectedId}/${locale} text missing`);
      conceptIds.push(expectedId);
    });
  }

  invariant(register?.schema_version === 1 && register?.unit === c.unit, 'series register identity mismatch');
  invariant(register?.design_contract?.motion === 'purposeful_semantic_only', 'purposeful semantic motion contract missing');
  invariant(register?.design_contract?.mobile === 'native_vertical_recomposition_not_shrunk_horizontal', 'native mobile contract missing');
  const prohibited = new Set(register?.design_contract?.prohibited ?? []);
  for (const required of ['gradients', 'glow', 'textures', 'decorative_multicolor', 'pseudo_technical_graphics', 'typing_gimmicks']) invariant(prohibited.has(required), `prohibited visual ${required} missing`);

  const registerConcepts = [];
  const familyCounts = new Map();
  for (const chapter of register?.chapters ?? []) {
    for (const concept of chapter?.concepts ?? []) {
      invariant(typeof concept?.id === 'string', 'register concept id missing');
      for (const key of ['evidence', 'visual_mechanism', 'semantic_rationale', 'perceptual_family', 'topology', 'choreography', 'composition', 'reuse_key']) invariant(typeof concept?.[key] === 'string' && concept[key].trim(), `${concept.id} ${key} missing`);
      invariant(Array.isArray(concept.cues) && concept.cues.length >= 2, `${concept.id} needs semantic cues`);
      registerConcepts.push(concept.id);
      familyCounts.set(concept.reuse_key, (familyCounts.get(concept.reuse_key) ?? 0) + 1);
    }
  }
  invariant(registerConcepts.length === c.chapters * c.conceptsPerChapter, 'series register must contain 30 canonical concepts');
  invariant(JSON.stringify(registerConcepts) === JSON.stringify(conceptIds), 'spec/register concept identities diverge');
  const maxFamilyUse = Math.max(...familyCounts.values());
  invariant(maxFamilyUse <= c.familyRepeatCap, `perceptual family repeat cap exceeded: ${maxFamilyUse} > ${c.familyRepeatCap}`);

  return Object.freeze({ chapters: c.chapters, concepts: conceptIds.length, families: familyCounts.size, maxFamilyUse });
}

export function buildSeguridadRenderJobs(spec, register) {
  validateSeguridadSpec(spec, register);
  const jobs = [];
  for (const chapter of spec.chapters) {
    for (const locale of SEGURIDAD_RENDER_CONTRACT.locales) {
      for (const orientation of SEGURIDAD_RENDER_CONTRACT.orientations) {
        const dims = SEGURIDAD_RENDER_CONTRACT[orientation];
        jobs.push(Object.freeze({
          id: `seguridad-ia-${chapter.chapter}-${locale}-${orientation}`,
          unit: SEGURIDAD_RENDER_CONTRACT.unit,
          chapter: chapter.chapter,
          slug: chapter.slug,
          locale,
          orientation,
          width: dims.width,
          height: dims.height,
          fps: SEGURIDAD_RENDER_CONTRACT.fps,
          durationSeconds: SEGURIDAD_RENDER_CONTRACT.durationSeconds,
          reducedMotionRequired: true,
          sourceBlobSha: spec.source_bindings[Number(chapter.chapter)][locale].blob_sha
        }));
      }
    }
  }
  invariant(jobs.length === 24, `render matrix must contain 24 native jobs, got ${jobs.length}`);
  return Object.freeze(jobs);
}
