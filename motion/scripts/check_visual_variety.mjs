#!/usr/bin/env node
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {auditSeries} from '../src/review-policy.mjs';
export function validateVisualVariety(){const dir=fileURLToPath(new URL('../content/modelos-razonadores/',import.meta.url));const specs=readdirSync(dir).filter(n=>/\.(es|en)\.json$/.test(n)).sort().map(n=>JSON.parse(readFileSync(dir+n,'utf8')));return auditSeries(specs);}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))console.log(JSON.stringify(validateVisualVariety(),null,2));
