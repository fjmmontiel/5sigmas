import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {certify,relevantFiles} from '../scripts/certify_relevant_source.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const specPath=fileURLToPath(new URL('../content/modelos-razonadores/02-fallos.es.json',import.meta.url));
const spec=JSON.parse(fs.readFileSync(specPath,'utf8'));
const rel=path.relative(ROOT,specPath).split(path.sep).join('/');

test('failure chapter relevant source excludes unrelated risk and generic fallback modules',()=>{
 const files=relevantFiles(spec,rel);
 assert.ok(files.includes('src/render/mechanisms/rich-failures.mjs'));
 assert.ok(files.includes('src/render/mechanisms/rich-core.mjs'));
 assert.equal(files.includes('src/render/mechanisms/rich-risk.mjs'),false);
 assert.equal(files.includes('src/render/mechanisms/common.mjs'),false);
});

test('relevant source certification ignores unrelated imported module drift but fails relevant drift',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'5sigmas-source-cert-'));
 const assetPath=path.join(dir,'asset.mp4');fs.writeFileSync(assetPath,'deterministic-test-asset');
 const assetHash=createHash('sha256').update(fs.readFileSync(assetPath)).digest('hex');
 const files={};for(const f of relevantFiles(spec,rel))files[f]=hash(path.join(ROOT,f));
 files['src/render/mechanisms/rich-risk.mjs']='0'.repeat(64);
 const validation={spec:spec.id,variant:'horizontal',sha256:assetHash,source:{sha256:'coarse-full-graph-stale',files}};
 const validationPath=path.join(dir,'validation.json');fs.writeFileSync(validationPath,JSON.stringify(validation));
 assert.equal(certify({validationPath,assetPath,specPath}).status,'PASS');
 const broken=JSON.parse(fs.readFileSync(validationPath));broken.source.files['src/render/mechanisms/rich-failures.mjs']='f'.repeat(64);fs.writeFileSync(validationPath,JSON.stringify(broken));
 const result=certify({validationPath,assetPath,specPath});assert.equal(result.status,'FAIL');assert.deepEqual(result.relevantMismatches.map(x=>x.file),['src/render/mechanisms/rich-failures.mjs']);
});
