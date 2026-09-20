import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const contentRoot = path.join(repoRoot, 'motion', 'content', 'from-cave-to-agi');
const index = JSON.parse(fs.readFileSync(path.join(contentRoot, 'series-register.json'), 'utf8'));
const partial = JSON.parse(fs.readFileSync(path.join(contentRoot, 'series-register.partial.json'), 'utf8'));

const required = [
  'concept_id', 'evidence', 'mechanism', 'semantic_rationale', 'perceptual_family',
  'topology', 'choreography', 'composition', 'cues'
];

const chapters = [];
for (const entry of index.chapter_sources) {
  let chapter;
  if (entry.selector) {
    chapter = partial.chapters.find((candidate) => candidate.chapter === entry.selector);
  } else {
    chapter = JSON.parse(fs.readFileSync(path.join(repoRoot, entry.path), 'utf8'));
  }
  if (!chapter) throw new Error(`Missing chapter ${entry.chapter}`);
  if (chapter.chapter !== entry.chapter) throw new Error(`Chapter mismatch ${entry.chapter} != ${chapter.chapter}`);
  if (!fs.existsSync(path.join(repoRoot, chapter.source_es))) throw new Error(`Missing source ${chapter.source_es}`);
  chapters.push(chapter);
}

if (chapters.length !== 6) throw new Error(`Expected 6 chapters, got ${chapters.length}`);
const chapterIds = chapters.map((chapter) => chapter.chapter);
if (new Set(chapterIds).size !== chapterIds.length) throw new Error('Duplicate chapter IDs');

const concepts = chapters.flatMap((chapter) => chapter.concepts ?? []);
if (concepts.length !== 30) throw new Error(`Expected 30 authored concepts, got ${concepts.length}`);

const conceptIds = new Set();
const familyCounts = new Map();
for (const concept of concepts) {
  for (const key of required) {
    if (concept[key] == null || concept[key] === '' || (Array.isArray(concept[key]) && concept[key].length === 0)) {
      throw new Error(`Concept ${concept.concept_id ?? '<unknown>'} missing ${key}`);
    }
  }
  if (conceptIds.has(concept.concept_id)) throw new Error(`Duplicate concept ${concept.concept_id}`);
  conceptIds.add(concept.concept_id);
  if (!Array.isArray(concept.cues) || concept.cues.length < 4) throw new Error(`Concept ${concept.concept_id} has fewer than 4 cues`);
  familyCounts.set(concept.perceptual_family, (familyCounts.get(concept.perceptual_family) ?? 0) + 1);
}

const maxFamilyUses = Math.max(...familyCounts.values());
if (maxFamilyUses > index.authoring_policy.max_perceptual_family_uses_target) {
  throw new Error(`Perceptual family reuse ${maxFamilyUses} exceeds target ${index.authoring_policy.max_perceptual_family_uses_target}`);
}
if (index.series_register.authored_concepts !== concepts.length) throw new Error('Index concept count is stale');
if (index.series_register.authored_chapters !== chapters.length) throw new Error('Index chapter count is stale');
if (index.series_register.distinct_perceptual_families !== familyCounts.size) throw new Error('Index family count is stale');
if (index.series_register.max_family_uses !== maxFamilyUses) throw new Error('Index max family use is stale');

console.log(JSON.stringify({
  state: index.state,
  chapters: chapters.length,
  concepts: concepts.length,
  perceptual_families: familyCounts.size,
  max_family_uses: maxFamilyUses,
  source_bindings: chapters.map((chapter) => chapter.source_es),
  result: 'PASS_STRUCTURAL_SOURCE_BOUND_REGISTER'
}, null, 2));
