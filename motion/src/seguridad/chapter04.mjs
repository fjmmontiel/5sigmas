/** Chapter-specific red-teaming mechanisms with semantic state changes. No QA self-approval. */
import {Paint,clamp,lerp} from '../render/paint.mjs';
import {sceneLayout,drawHeader,drawText} from '../render/layout.mjs';
import {beatState,expectedBeatEvents} from './semantic-beats.mjs';
import {CHAPTER04} from './chapter04-data.mjs';

export const CHAPTER04_THEME=Object.freeze({
 background:'#FFFFFF',ink:'#191817',muted:'#66615D',rule:'#DDD8D3',
 bodyFont:'Arial',headlineFont:'Georgia',
 accent:'#B44B31',accentText:'#7F3525',accentSurface:'#F7ECE8',
 guideSurface:'#D9A99A',guideText:'#4A1A12'
});
const tx=(s,k,l)=>{const v=s.labels[k]?.[l];if(typeof v!=='string')throw Error(`MISSING_LABEL:${s.id}/${k}/${l}`);return v;};
function label(P,text,x,y,w,size=38,strong=false,align='center'){const lines=P.lines(text,w,size,strong?650:450);lines.forEach((line,i)=>P.text(line,x,y+i*size*1.15,size,strong?P.T.accentText:P.T.ink,strong?650:450,align,w));return lines.length*size*1.15;}
function box(P,text,x,y,w,h,size=34,strong=false){P.rect(x,y,w,h,strong?P.T.accentSurface:P.T.background,strong?P.T.accent:P.T.rule,15,strong?4:2.5);const lines=P.lines(text,w-24,size,strong?650:450),yy=y+(h-lines.length*size*1.15)/2;label(P,text,x+w/2,yy,w-24,size,strong);}
function arrow(P,a,b,q=1,strong=false){if(q<=0)return;const e=clamp(q),x=lerp(a[0],b[0],e),y=lerp(a[1],b[1],e);P.path([a,[x,y]],strong?P.T.accentText:P.T.accent,strong?6:4);if(e<.995)P.circle(x,y,strong?9:7,strong?P.T.accentText:P.T.accent);else{const t=Math.atan2(b[1]-a[1],b[0]-a[0]),r=16;P.path([[b[0]-Math.cos(t-.55)*r,b[1]-Math.sin(t-.55)*r],b,[b[0]-Math.cos(t+.55)*r,b[1]-Math.sin(t+.55)*r]],strong?P.T.accentText:P.T.accent,4);}}
function focus(P,x,y,q,r=56,strong=false){if(q<=0)return;const e=clamp(q);P.circle(x,y,r+18*(1-e),null,strong?P.T.accentText:P.T.accent,strong?6:4);if(e>.55)P.circle(x,y,7+(e-.55)*7,strong?P.T.accentText:P.T.accent);}
function check(P,x,y,q=1){if(q>.7)P.check(x,y,P.T.accentText,1.25);}
function cross(P,x,y,r=13){P.path([[x-r,y-r],[x+r,y+r]],P.T.accentText,5);P.path([[x-r,y+r],[x+r,y-r]],P.T.accentText,5);}

function threatModel(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?36:32;
 const asset=[175,170],entry=[175,560],test=[500,365],success=[835,190],recovery=[835,550];
 if(on[0]){
  box(P,tx(s,'asset',l),45,120,260,100,fs,true);box(P,tx(s,'entry',l),45,510,260,100,fs,false);
  arrow(P,[305,170],[425,330],q[0]);arrow(P,[305,560],[425,400],q[0]);focus(P,asset[0],asset[1],q[0],68);focus(P,entry[0],entry[1],q[0],68);
  P.circle(test[0],test[1],72,P.T.background,P.T.rule,4);label(P,'TEST',test[0],test[1]-17,130,34,true);
 }
 if(on[1]){
  const constraints=[[380,80,'budget'],[620,80,'permissions'],[500,650,'environment']];
  for(const [x,y,k] of constraints){box(P,tx(s,k,l),x-120,y-42,240,84,fs-3,false);arrow(P,[x,y],test,q[1],false);}
 }
 if(on[2]){
  box(P,tx(s,'success',l),705,135,260,100,fs,true);box(P,tx(s,'recovery',l),705,500,260,100,fs,true);
  arrow(P,[572,345],[705,185],q[2],true);arrow(P,[572,385],[705,550],q[2],true);
  if(q[2]>.55){P.path([[360,730],[640,730]],P.T.accent,6,q[2]);label(P,tx(s,'path',l),500,675,600,fs,true);}
 }
 return {
  defined:on[0]?['asset','attacker_entry']:[],
  constraints:on[1]?['budget','permissions','environment']:[],
  trajectory:on[2]?'measurable':'open',
  success:on[2]?'defined':'undefined',
  recovery:on[2]?'defined':'undefined'
 };
}
function evidenceLanes(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?35:31;
 const rows=[[100,'model','output'],[330,'uplift','person'],[560,'product','effect']];
 for(let i=0;i<3;i++){
  if(!on[i])continue;
  const [y,a,b]=rows[i];box(P,tx(s,a,l),40,y,250,105,fs,true);arrow(P,[300,y+52],[520,y+52],q[i]);box(P,tx(s,b,l),535,y,400,105,fs,false);
  check(P,910,y+52,q[i]);
 }
 if(on[2]){P.path([[52,718],[948,718]],P.T.accentText,5,q[2]);label(P,tx(s,'evidence',l),500,738,900,fs,true);}
 return {
  lanes:on[2]?['model_capability','human_uplift','product_execution']:on[1]?['model_capability','human_uplift']:on[0]?['model_capability']:[],
  evidence:on[2]?'per_lane':on[1]?'partial':'absent',
  equivalence:on[2]?'forbidden':'unresolved'
 };
}
function graderLoop(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?36:32;
 const attacker=[250,300],grader=[750,300],effect=[750,590],audit=[250,590];
 if(on[0]){
  P.circle(attacker[0],attacker[1],88,P.T.background,P.T.accent,4);label(P,tx(s,'attacker',l),attacker[0],attacker[1]-20,170,fs,true);
  P.circle(grader[0],grader[1],88,P.T.background,P.T.accent,4);label(P,tx(s,'grader',l),grader[0],grader[1]-20,170,fs,true);
  arrow(P,[338,285],[662,285],q[0]);arrow(P,[662,330],[338,330],q[0]);focus(P,grader[0],grader[1],q[0],102);
 }
 if(on[1]){
  box(P,tx(s,'score',l),610,60,280,100,fs,true);arrow(P,[750,212],[750,165],q[1]);
  P.circle(effect[0],effect[1],76,P.T.background,P.T.rule,4);label(P,tx(s,'effect',l),effect[0],effect[1]-18,190,fs,false);arrow(P,[750,388],[750,514],q[1]);
  if(q[1]>.75)cross(P,effect[0],effect[1],17);
 }
 if(on[2]){
  box(P,tx(s,'audit',l),85,535,330,110,fs,true);arrow(P,[415,590],[674,590],q[2],true);arrow(P,[250,535],[250,388],q[2],true);
  label(P,tx(s,'warning',l),500,704,900,fs-2,true);focus(P,audit[0],audit[1],q[2],76,true);
 }
 return {
  feedback:on[0],
  score:on[1]?'optimized':'unoptimized',
  real_effect:on[1]?'unverified':'unknown',
  audit:on[2]?'external_validated':'absent',
  rubric_gaming:on[2]?'detectable':'unknown'
 };
}
function causalTrace(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?29:25;
 const keys=['input','context','decision','proposal','policy','effect','recovery'];
 const xs=[70,215,360,505,650,795,930],y=390;
 const activeCount=on[2]?7:on[1]?5:on[0]?2:0;
 for(let i=0;i<activeCount;i++){
  const x=xs[i];P.circle(x,y,42,i>=5?P.T.accentSurface:P.T.background,i>=5?P.T.accentText:P.T.accent,4);
  label(P,tx(s,keys[i],l),x,y+58,130,fs,i>=4);
  if(i>0){const phase=i<2?q[0]:i<5?q[1]:q[2];arrow(P,[xs[i-1]+44,y],[x-44,y],phase,i>=5);}
  const pinY=i%2?180:620;P.path([[x,y+(pinY<y?-44:44)],[x,pinY+(pinY<y?35:-35)]],P.T.rule,3);
  P.circle(x,pinY,18,P.T.background,P.T.rule,3);if((i<2&&q[0]>.7)||(i>=2&&i<5&&q[1]>.7)||(i>=5&&q[2]>.7))P.check(x,pinY,P.T.accentText,.8);
 }
 if(on[2]&&q[2]>.75){P.path([[58,735],[942,735]],P.T.accentText,5);label(P,'TRACE VERIFIED',500,746,420,fs,true);}
 return {
  trace:on[2]?['input','context','decision','tool_proposal','policy','effect','recovery']:on[1]?['input','context','decision','tool_proposal','policy']:on[0]?['input','context']:[],
  terminal:on[2]?'verified':'unknown'
 };
}
function regressionContract(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?34:30;
 if(on[0]){
  box(P,tx(s,'finding',l),60,280,260,150,fs,true);P.path([[90,245],[290,245]],P.T.accent,5,q[0]);focus(P,190,355,q[0],92);
 }
 if(on[1]){
  arrow(P,[330,355],[430,355],q[1]);
  const fields=[['fixture',480,100],['initial',690,100],['scopes',480,270],['budget',690,270],['criterion',585,455]];
  for(const [k,x,y] of fields)box(P,tx(s,k,l),x-95,y,190,86,fs-4,k==='fixture');
  if(q[1]>.8){for(const [,x,y] of fields)check(P,x,y+43,1);}
 }
 if(on[2]){
  P.path([[450,610],[820,610]],P.T.accentText,6,q[2]);box(P,tx(s,'expected',l),430,635,280,90,fs,true);box(P,tx(s,'gate',l),735,635,220,90,fs,true);
  if(q[2]>.75){P.check(690,680,P.T.accentText,1.2);P.check(925,680,P.T.accentText,1.2);}
 }
 return {
  finding:on[0]?'captured':'absent',
  fixture:on[1]?['input','initial_state','scopes','budget','success_criterion']:[],
  expected_state:on[2]?'locked':'unlocked',
  release_gate:on[2]?'reproducible':'open'
 };
}

const DRAWERS=[threatModel,evidenceLanes,graderLoop,causalTrace,regressionContract],CACHE=new Map();
export function renderChapter04(canvas,locale,orientation,timeSeconds,{reducedMotion=false}={}){
 if(!['es','en'].includes(locale)||!['horizontal','vertical'].includes(orientation)||!Number.isFinite(timeSeconds))throw Error('INVALID_RENDER_REQUEST');
 const portrait=orientation==='vertical',time=clamp(timeSeconds,0,CHAPTER04.duration),index=Math.max(0,CHAPTER04.scenes.findLastIndex(s=>time>=s.start)),spec=CHAPTER04.scenes[index],local=Math.min(spec.duration,time-spec.start),state=beatState(spec,locale,local,reducedMotion),W=portrait?1080:1920,H=portrait?1920:1080;
 if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
 const c=canvas.getContext('2d',{alpha:false});c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=CHAPTER04_THEME.background;c.fillRect(0,0,W,H);
 const issues=[],P=new Paint(c,CHAPTER04_THEME,issues,locale,{}),scene={id:spec.id,title:[spec.title[locale]],accentLine:-1,paragraphs:[spec.text[locale]],source:spec.source?.[locale]??null},key=`${CHAPTER04.version}/${locale}/${orientation}/${index}`;
 if(!CACHE.has(key)){const L=sceneLayout(P,scene,portrait,{layout:spec.layout});CACHE.set(key,{L,issues:[...issues]});}else issues.push(...CACHE.get(key).issues);
 const L=CACHE.get(key).L,header={brand:'5sigmas',series:CHAPTER04.series[locale],scenes:CHAPTER04.scenes.map(s=>({duration:s.duration,kicker:s.kicker[locale]}))};
 drawHeader(P,header,index,time,CHAPTER04.duration,L);drawText(P,scene,L,1,state);
 c.save();const M=L.mechanism;c.translate(M.x+(M.w-1000*M.scale)/2,M.y);c.scale(M.scale,M.scale);const mechanismState=DRAWERS[index](P,state,spec,locale,portrait);c.restore();
 return {jobId:`seguridad-ia-04-${locale}-${orientation}`,scene:spec.id,sceneIndex:index,timeSeconds:time,duration:CHAPTER04.duration,bodySize:L.bodySize,mechanismScale:M.scale,issues,family:spec.family,topology:spec.family,choreography:spec.family,layout:L,semanticTimeline:{version:CHAPTER04.version,events:expectedBeatEvents(spec,spec.start)},textCue:{activeId:state.activeId,cues:state.cues},mechanismState,reducedMotion};
}
