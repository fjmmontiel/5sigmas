#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const motionDir = resolve(fileURLToPath(new URL('..', import.meta.url)), '..');
const repoRoot = resolve(motionDir, '..');

// Exact owner-approved Round 2 horizontal delivery bytes. These hashes bind the
// release consumer files; owner visual approval and technical certification remain
// independent. Do not update these values when renderer defaults change.
const APPROVED = [
  ['docs/series/modelos-razonadores/00-presentacion-serie.mp4', 'e45db8339e97972c672f1d13aa5705bc9f6b25c5fcebfb28556d1c42d40487d6'],
  ['docs/series/modelos-razonadores/01-que-es-razonar.mp4', 'a357ab3df54ff2d8344a362307a5d4625201797d86f534fb840ae03817c48807'],
  ['docs/series/modelos-razonadores/02-fallos.mp4', 'd7496cea7bc0b5889f64cca5b60f59506963c7125f4cb2eb9b166e79d26562ed'],
  ['docs/series/modelos-razonadores/03-test-time-compute.mp4', 'e9c6c081bb19d2953777b3d37642e5a718de8dd16ce7b6f73ff9dc252dca8710'],
  ['docs/series/modelos-razonadores/04-latencia-streaming.mp4', '1ba074bafc897e818ef1015bfa4c3597d8c80f16f58496c3cb5345eca49c020f'],
  ['docs/series/modelos-razonadores/05-riesgos.mp4', 'f594dde47114da817416d0a6b37089cdec34eb607005fe452d5fc22f5b2df381'],
  ['locales/en/series/modelos-razonadores/00-presentacion-serie.mp4', 'f26ac17cb5b4fa077b5175b00256ac6eaffb414e85fa0b51a4e878efc6d9a730'],
  ['locales/en/series/modelos-razonadores/01-que-es-razonar.mp4', 'b4e13a927f4485c3fa372bbf5fa53c2d8452107431a66e38cb1e692c4c72ffcc'],
  ['locales/en/series/modelos-razonadores/02-fallos.mp4', '3f5f6fe9ec604b06ce448092e0f66ffb0fc543998cb9ba0f4583f3f3575c52b2'],
  ['locales/en/series/modelos-razonadores/03-test-time-compute.mp4', '27860f4c8304a3215dc5e29894e071df10f2b276fa1ddc5cbc6ea69c7f81e400'],
  ['locales/en/series/modelos-razonadores/04-latencia-streaming.mp4', '3d8cb7f28b0a0ded5eb1b048a5f4d38b533948ee5181d2ea899507bc38dcc5a0'],
  ['locales/en/series/modelos-razonadores/05-riesgos.mp4', 'ef27ccf56d3112214286d5eab4a34bcf4b55c1bf2bc108abe4e074eb0c29beec'],
];

let failures = 0;

for (const [relativePath, expected] of APPROVED) {
  const path = resolve(repoRoot, relativePath);
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch (error) {
    failures += 1;
    console.error(`MISSING ${relativePath}: ${error.message}`);
    continue;
  }

  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) {
    failures += 1;
    console.error(`MISMATCH ${relativePath}`);
    console.error(`  expected ${expected}`);
    console.error(`  actual   ${actual}`);
  } else {
    console.log(`PASS ${relativePath} ${actual}`);
  }
}

if (failures) {
  console.error(`Approved snapshot exact-byte gate: FAIL (${failures}/${APPROVED.length} mismatched or missing).`);
  process.exit(1);
}

console.log(`Approved snapshot exact-byte gate: PASS (${APPROVED.length}/${APPROVED.length}).`);
