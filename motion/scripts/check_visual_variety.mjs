#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {visualFamilyInventory,selectEditorialRenderer,editorialFamilyNames} from '../src/render/mechanisms/editorial.mjs';
import {EDITORIAL_LAYOUT_CONTRACT} from '../src/render/layout.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));

export function validateVisualVariety(){
  const dir=`${root}/content/modelos-razonadores`;
  const files=readdirSync(dir).filter(name=>name.endsWith('.es.json')).sort();
  assert.equal(files.length,6,'visual diversity gate requires all six canonical Spanish specs');
  const counts=new Map(),inventory=[];
  for(const file of files){
    const spec=JSON.parse(readFileSync(`${dir}/${file}`,'utf8'));
    for(const row of visualFamilyInventory(spec)){
      assert.ok(row.family,`${file}:${row.scene} must declare a semantic visual family`);
      counts.set(row.family,(counts.get(row.family)||0)+1);
      const scene=spec.scenes.find(item=>item.id===row.scene);
      assert.equal(typeof selectEditorialRenderer(spec,scene),'function',`${file}:${row.scene}:${row.family} must resolve to a real semantic renderer; registry labels alone cannot pass`);
      inventory.push({spec:file,scene:row.scene,family:row.family});
    }
  }
  const implemented=new Set(editorialFamilyNames());
  for(const family of counts.keys())assert.ok(implemented.has(family),`${family} is declared but has no implementation`);
  const repeatCap=EDITORIAL_LAYOUT_CONTRACT.animationFamilyRepeatCap;
  assert.equal(repeatCap,2,'owner feedback requires the normal animation-family cap to be two per complete series');
  for(const [family,count] of counts)assert.ok(count<=repeatCap,`${family} repeats ${count} times; cap=${repeatCap}`);
  assert.ok(EDITORIAL_LAYOUT_CONTRACT.horizontalBodyMin>=36,'horizontal body copy may not regress to small review-v1 sizing');
  assert.ok(EDITORIAL_LAYOUT_CONTRACT.horizontalBodyTarget>=40,'horizontal body copy target must remain visually prominent');
  assert.ok(EDITORIAL_LAYOUT_CONTRACT.horizontalTextWidth<=800,'left copy must wrap enough to use its vertical area');
  assert.ok(EDITORIAL_LAYOUT_CONTRACT.horizontalSourceGapMax<=90,'excess bottom-left dead space is forbidden');
  return {series:'modelos-razonadores',sceneCount:inventory.length,repeatCap,families:Object.fromEntries([...counts].sort()),implementedFamilies:implemented.size,inventory,layout:EDITORIAL_LAYOUT_CONTRACT};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))console.log(JSON.stringify(validateVisualVariety(),null,2));
