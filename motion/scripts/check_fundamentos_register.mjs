import {readFile} from 'node:fs/promises';
import {validateFundamentosMechanismCoverage,fundamentosRenderMatrix} from '../src/fundamentos/engine.mjs';
const path=new URL('../migration/fundamentos-ia-iag/series-semantic-register.json',import.meta.url);
const register=JSON.parse(await readFile(path,'utf8'));
const result=validateFundamentosMechanismCoverage(register);
const jobs=fundamentosRenderMatrix(register);
console.log(JSON.stringify({status:'PASS',...result,jobs:jobs.length,nativeHorizontal:jobs.filter(j=>j.orientation==='horizontal').length,nativeVertical:jobs.filter(j=>j.orientation==='vertical').length},null,2));
