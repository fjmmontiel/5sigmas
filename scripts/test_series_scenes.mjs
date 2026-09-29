// Run the pure scene function against all authored cases without a browser or network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const curriculum=JSON.parse(fs.readFileSync('hooks/series_curriculum.json','utf8'));
let code=fs.readFileSync('docs/assets/javascripts/series-experience.js','utf8');
code=code.replace('  function initializeGuide(root) {','  globalThis.sceneForTest = sceneFor;\n  function initializeGuide(root) {');
const sandbox={window:{matchMedia:()=>({matches:true})},document:{readyState:'loading',addEventListener:()=>{}},console};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const kinds={'seguridad-ia':'security','agentes-ia':'agent','agentes-voz-tiempo-real':'voice','coding-agents-agent-harnesses':'coding','context-engineering-memory-mcp':'context','llm-inference-engineering-economics':'inference','evaluating-ai-systems-production':'evaluation'};
let count=0;
for(const [slug,series] of Object.entries(curriculum.series)) for(const lesson of series.lessons) for(const locale of ['es','en']){
 const data={kind:kinds[slug],view:lesson.view,locale};
 const initial=sandbox.sceneForTest(data,0,0), final=sandbox.sceneForTest(data,3,0), alternative=sandbox.sceneForTest(data,3,1);
 assert.notEqual(initial,final,`${lesson.view}: stages must produce a visible change`);
 assert.notEqual(final,alternative,`${lesson.view}: scenarios must change a visible result`);
 assert.equal(final,sandbox.sceneForTest(data,3,0),`${lesson.view}: deterministic reset`);
 for(let s=0;s<4;s++)for(let a=0;a<2;a++){
  const html=sandbox.sceneForTest(data,s,a);
  assert(!html.includes('undefined')&&!html.includes('NaN'),`${lesson.view}: invalid state`);
 }
 count++;
}
assert.equal(count,80);
console.log(JSON.stringify({status:'PASS',cases:count,states:count*8}));
