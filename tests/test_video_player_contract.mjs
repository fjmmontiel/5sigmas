/** Execute the actual player module with controlled DOM/media stubs.
 * Unit tests only: these do NOT certify native/browser/live playback.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(process.argv[2] || path.join(root,'docs/assets/javascripts/video-library.js'),'utf8');
function run({timestamp=null, reduced=false, metadata=true, chapter='15.5'}={}) {
  const log={seeks:[],plays:0,scroll:[],history:[],listeners:{},click:null};
  const player={duration:75,readyState:metadata?4:0,play(){log.plays++;return Promise.resolve()},scrollIntoView(value){log.scroll.push(value)},addEventListener(name,fn){log.listeners[name]=fn},set currentTime(value){log.seeks.push(value)}};
  const link={dataset:{s5VideoSeek:chapter},addEventListener(name,fn){if(name==='click')log.click=fn}};
  const rootElement={dataset:{},querySelector(){return player},querySelectorAll(){return [link]}};
  const url='https://5sigmas.com/videos/example/'+(timestamp!==null?'?t='+encodeURIComponent(timestamp):'');
  const context={URL,Number,String,Map,window:{location:{href:url},matchMedia(){return {matches:reduced}},history:{replaceState(_state,_unused,next){log.history.push(String(next))}}},document:{documentElement:{lang:'es'},readyState:'complete',querySelectorAll(selector){return selector==='[data-s5-video-watch]'?[rootElement]:[]}},requestAnimationFrame(fn){fn()}};
  vm.runInNewContext(source,context,{timeout:1000});
  return log;
}
const tests=[];
function test(name,fn){try{fn();tests.push({name,pass:true})}catch(e){tests.push({name,pass:false,error:e.message})}}
test('integer deep link',()=>assert.deepEqual(run({timestamp:'35'}).seeks,[35]));
test('fractional deep link',()=>assert.deepEqual(run({timestamp:'15.5'}).seeks,[15.5]));
test('millisecond deep link',()=>assert.deepEqual(run({timestamp:'15.123'}).seeks,[15.123]));
test('invalid negative timestamp',()=>assert.deepEqual(run({timestamp:'-1'}).seeks,[]));
test('invalid NaN timestamp',()=>assert.deepEqual(run({timestamp:'NaN'}).seeks,[]));
test('invalid Infinity timestamp',()=>assert.deepEqual(run({timestamp:'Infinity'}).seeks,[]));
test('overflow timestamp',()=>assert.deepEqual(run({timestamp:'9'.repeat(400)}).seeks,[]));
test('invalid colon field',()=>assert.deepEqual(run({timestamp:'1:99'}).seeks,[]));
test('valid colon field',()=>assert.deepEqual(run({timestamp:'0:35'}).seeks,[35]));
test('no unrequested autoplay',()=>assert.equal(run({timestamp:'35'}).plays,0));
test('wait for native metadata',()=>{const r=run({timestamp:'35',metadata:false});assert.deepEqual(r.seeks,[]);r.listeners.loadedmetadata();assert.deepEqual(r.seeks,[35])});
test('oversized user link clamps to safe end',()=>assert.deepEqual(run({timestamp:'999'}).seeks,[74.75]));
test('fractional chapter click updates URL and seeks',()=>{const r=run();r.click({preventDefault(){}});assert.deepEqual(r.seeks,[15.5]);assert.equal(new URL(r.history[0]).searchParams.get('t'),'15.5');assert.equal(r.plays,1)});
test('reduced motion avoids smooth scrolling',()=>{const r=run({reduced:true,chapter:'15'});r.click({preventDefault(){}});assert.equal(r.scroll[0].behavior,'auto')});
test('standard motion retains smooth scroll',()=>{const r=run({chapter:'15'});r.click({preventDefault(){}});assert.equal(r.scroll[0].behavior,'smooth')});
console.log(JSON.stringify({scope:'Node unit behavior with DOM/media stubs; not native playback',passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests},null,2));
process.exitCode=tests.some(t=>!t.pass)?1:0;
