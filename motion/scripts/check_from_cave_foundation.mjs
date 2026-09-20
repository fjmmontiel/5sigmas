import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROM_CAVE_THEME, contrastRatio, validateFromCaveTheme } from '../src/from-cave/theme.mjs';
import { EDITORIAL_LAYOUT_CONTRACT } from '../src/render/layout.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const checked = [
  'motion/src/from-cave/theme.mjs',
  'motion/src/render/paint.mjs',
  'motion/src/render/layout.mjs'
];
for (const rel of checked) {
  const bytes = fs.readFileSync(path.join(repoRoot, rel));
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error(`${rel}: invalid UTF-8`);
  if (/\x00|[\x01-\x08\x0B\x0C\x0E-\x1F]/.test(text)) throw new Error(`${rel}: control byte`);
  if (/gradient|glow|texture/i.test(text)) throw new Error(`${rel}: forbidden decorative effect`);
}
const themeIssues = validateFromCaveTheme();
if (themeIssues.length) throw new Error(`Theme issues: ${themeIssues.join(', ')}`);
if (EDITORIAL_LAYOUT_CONTRACT.horizontalBodyMin < 46) throw new Error('Horizontal body floor below 46px');
if (EDITORIAL_LAYOUT_CONTRACT.portraitBodyMin < 46) throw new Error('Portrait body floor below 46px');
if (EDITORIAL_LAYOUT_CONTRACT.animationFamilyRepeatCap > 2) throw new Error('Animation family repeat cap exceeds 2');

console.log(JSON.stringify({
  result: 'PASS_FOUNDATION_CONTRACT',
  files: checked,
  identity: {
    accent: FROM_CAVE_THEME.accent,
    accentText: FROM_CAVE_THEME.accentText,
    accentSurface: FROM_CAVE_THEME.accentSurface
  },
  contrast: {
    body: Number(contrastRatio(FROM_CAVE_THEME.ink, FROM_CAVE_THEME.background).toFixed(2)),
    muted: Number(contrastRatio(FROM_CAVE_THEME.muted, FROM_CAVE_THEME.background).toFixed(2)),
    accentText: Number(contrastRatio(FROM_CAVE_THEME.accentText, FROM_CAVE_THEME.background).toFixed(2))
  },
  bodyFloor: {
    horizontal: EDITORIAL_LAYOUT_CONTRACT.horizontalBodyMin,
    portrait: EDITORIAL_LAYOUT_CONTRACT.portraitBodyMin
  },
  familyRepeatCap: EDITORIAL_LAYOUT_CONTRACT.animationFamilyRepeatCap
}, null, 2));
