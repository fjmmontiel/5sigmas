/** Jailbreak evaluation mechanisms; shared renderer components, no QA self-approval. */
import {Paint,clamp,lerp} from '../render/paint.mjs';
import {sceneLayout,drawHeader,drawText} from '../render/layout.mjs';
import {beatState,expectedBeatEvents} from './semantic-beats.mjs';
import {CHAPTER01_THEME as THEME} from './chapter01.mjs';
import {CHAPTER02} from './chapter02-data.mjs';
const t=(s,k,l)=>{const v=s.labels[k]?.[l];if(typeof v!=='string')throw Error(`MISSING_LABEL:${s.id}/${k}/${l}`);return v;};
function label(P,text,x,y,w,size=40,strong=false){const lines=P.lines(text,w,size,strong?600:400);lines.forEach((v,i)=>P.text(v,x,y+i*size*1.2,size,strong?P.T.accentText:P.T.ink,strong?600:400,'center',w));return lines.length*size*1.2;}
function cell(P,text,x,y,w,h,size=40,strong=false){const n=P.lines(text,w-24,size,strong?600:400).length;P.rect(x,y,w,h,strong?P.T.accentSurface:P.T.background,strong?P.T.accent:P.T.rule,4,2);label(P,text,x+w/2,y+(h-n*size*1.2)/2,w-24,size,strong);}
function arrow(P,points,q=1,color=P.T.accent){if(q<=0)return;P.path(points,color,4,q);if(q>.995){const a=points.at(-2),b=points.at(-1),r=Math.atan2(b[1]-a[1],b[0]-a[0]);P.path([[b[0]-14*Math.cos(r-.5),b[1]-14*Math.sin(r-.5)],b,[b[0]-14*Math.cos(r+.5),b[1]-14*Math.sin(r+.5)]],color,4);}}
function cross(P,x,y,r=13){P.path([[x-r,y-r],[x+r,y+r]],P.T.accentText,4);P.path([[x-r,y+r],[x+r,y-r]],P.T.accentText,4);}
function measuredVariants(P,S,s,l,v){
 const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?44:38,ys=[107,278,449,620],keys=['original','wording','language','format'];
 for(let i=0;i<4;i++){
  if(!(i===0?on[0]:on[1]))continue;
  cell(P,t(s,keys[i],l),18,ys[i],408,105,fs,i===0);const prog=i===0?q[0]:q[1];
  arrow(P,[[439,ys[i]+52],[571,ys[i]+52]],prog,i===0?P.T.accent:P.T.rule);
  if(i===0){label(P,t(s,'refusal',l),791,ys[i]+5,386,fs,true);if(q[0]>.9)P.check(596,ys[i]+55,P.T.accentText,1.3);}
  else if(on[2]){label(P,t(s,'unknown',l),787,ys[i]+23,356,fs,false);P.circle(596,ys[i]+51,12,null,P.T.rule,3);}
 }
 if(on[1])P.path([[9,246],[3,246],[3,731],[14,731]],P.T.rule,3,q[1]);
 if(on[3])label(P,t(s,'claim',l),500,757,970,v?37:34,true);
 return {tested:on[0]?['original']:[],result:on[0]?'refused':'unobserved',variants:on[1]?keys.slice(1):[],untested:on[2]?keys.slice(1):[],claim:on[3]?'one_test_not_universal':'unspecified'};
}
function budget(P,S,s,l,v){
 const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),n=s.budget,fs=v?43:37;
 const ps=Array.from({length:n},(_,i)=>i===0?q[1]:i===1?q[2]:clamp(q[3]*(n-2)-(i-2)));
 if(on[0]){
  label(P,t(s,'available',l),500,21,950,fs,true);label(P,t(s,'used',l),500,347,950,fs,true);
  for(let i=0;i<n;i++){
   const x=107+i*157,p=ps[i];P.circle(x,153,28,null,P.T.rule,3);P.circle(x,443,28,null,P.T.rule,3);
   if(p<=0)P.circle(x,153,20,P.T.accentSurface,P.T.accent,2);
   else if(p>=1)P.circle(x,443,20,P.T.accentSurface,P.T.accent,2);
   else P.circle(x,lerp(153,443,p),20,P.T.accentSurface,P.T.accent,2);
  }
  const used=ps.filter(x=>x>=1).length;P.text(`${used} / ${n}`,500,247,v?60:58,P.T.accentText,600,'center',600);
 }
 if(on[2]){cell(P,t(s,'answer',l),18,551,445,106,fs,false);cell(P,t(s,'input',l),609,551,375,106,fs,true);arrow(P,[[474,604],[597,604]],q[2]);label(P,t(s,'feedback',l),500,680,945,v?42:37,false);}
 if(on[4]){P.rect(5,729,990,70,P.T.background);label(P,t(s,'stop',l),500,740,960,v?45:43,true);cross(P,964,771,14);}
 return {budget:n,used:ps.filter(x=>x>=1).length,feedback:on[2],next:on[4]?'blocked_by_budget':'possible'};
}
function transfer(P,S,s,l,v){
 const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?43:38;
 if(on[0]){
  P.rect(20,99,445,333,null,P.T.rule,4,3);label(P,t(s,'source',l),242,18,453,fs,true);label(P,t(s,'gradients',l),242,123,406,fs,false);
  arrow(P,[[242,231],[242,268]],q[0]);
  if(!on[1])cell(P,t(s,'optimize',l),47,280,390,116,fs,true);
 }
 // Draw the destination before the opaque moving packet and its text.
 if(on[2])P.path([[523,99],[982,99],[982,430],[523,430],[523,99]],P.T.rule,3);
 if(on[1]){
  let x=47,y=lerp(280,519,q[1]);
  if(on[2]){const z=q[2];if(z<.45){x=lerp(47,547,z/.45);y=519;}else{x=547;y=lerp(519,280,(z-.45)/.55);}}
  cell(P,t(s,'suffix',l),x,y,390,116,fs,true);
 }
 if(on[2]){
  label(P,t(s,'target',l),747,18,458,fs,true);label(P,t(s,'blackbox',l),747,120,420,fs,false);
  P.path([[251,662],[747,662]],P.T.accent,3,q[2]);label(P,t(s,'same',l),500,679,920,v?43:39,true);
 }
 if(on[3]){label(P,t(s,'test',l),753,441,434,fs,true);label(P,t(s,'warning',l),500,754,970,v?36:33,true);}
 return {access:on[0]?'model_gradients':'unspecified',suffix:on[1]?'selected':'candidate',target_input:on[2]?'same_suffix':'absent',target_result:on[3]?'requires_measurement':'unspecified'};
}
function outcomes(P,S,s,l,v){
 const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?43:38,keys=['bypass','capability','reachability','execution'],xs=[122,372,622,872],ys=[716,585,454,323];
 for(let i=0;i<4;i++){
  if(!on[i])continue;
  const x=xs[i],y=ys[i];P.path([[x-116,y],[x+116,y],[x+116,733]],P.T.rule,3);
  P.path([[x-111,y],[x-111+222*q[i],y]],P.T.accent,5);
  label(P,t(s,keys[i],l),x,y-185,237,fs,true);
  label(P,t(s,keys[i]+'_detail',l),x,y-107,237,v?40:34,false);
 }
 if(on[3])label(P,t(s,'warning',l),500,754,970,v?35:32,true);
 return {bypass:on[0]?'conversation_boundary':'undefined',capability:on[1]?'usable_content':'undefined',reachability:on[2]?'proposal_available':'undefined',execution:on[3]?'observed_external_effect_required':'undefined'};
}
function channels(P,S,s,l,v){
 const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?44:39;
 if(on[0]){
  P.circle(136,412,111,null,P.T.rule,3);label(P,t(s,'model',l),136,355,209,fs,false);
  P.path([[251,412],[351,212],[955,212]],P.T.rule,3,q[0]);P.path([[251,412],[351,605],[955,605]],P.T.rule,3,q[0]);
  label(P,t(s,'text',l),380,143,230,fs,true);label(P,t(s,'action',l),450,536,230,fs,true);
 }
 if(on[1]){
  P.path([[602,156],[602,268]],P.T.accentText,5);cross(P,602,212,17);
  P.circle(lerp(374,544,q[1]),212,18,P.T.accentSurface,P.T.accent,3);
  label(P,t(s,'content',l),683,17,586,fs,true);label(P,t(s,'blocked',l),743,259,390,fs,true);
 }
 if(on[2]){
  P.path([[602,549],[602,661]],P.T.accentText,5);cross(P,602,605,17);
  P.rect(lerp(356,526,q[2]),587,36,36,P.T.accentSurface,P.T.accent,4,3);
  label(P,t(s,'policy',l),704,435,528,fs,true);label(P,t(s,'denied',l),765,652,366,fs,true);
 }
 if(on[3]){
  P.circle(955,212,15,null,P.T.rule,3);P.circle(955,605,15,null,P.T.rule,3);
  label(P,t(s,'no_text',l),715,335,550,v?41:36,false);label(P,t(s,'no_effect',l),716,728,550,v?41:36,false);
 }
 return {channels:on[0]?['text','action']:[],text:on[1]?'blocked':'pending',action:on[2]?'denied':'pending',record:on[3]?'text_blocked_action_denied':'incomplete'};
}
const DRAWERS=[measuredVariants,budget,transfer,outcomes,channels],CACHE=new Map();
export function renderChapter02(canvas,locale,orientation,timeSeconds,{reducedMotion=false}={}){
 if(!['es','en'].includes(locale)||!['horizontal','vertical'].includes(orientation)||!Number.isFinite(timeSeconds))throw Error('INVALID_RENDER_REQUEST');
 const v=orientation==='vertical',time=clamp(timeSeconds,0,CHAPTER02.duration),index=Math.max(0,CHAPTER02.scenes.findLastIndex(s=>time>=s.start)),spec=CHAPTER02.scenes[index],local=Math.min(spec.duration,time-spec.start),state=beatState(spec,locale,local,reducedMotion),W=v?1080:1920,H=v?1920:1080;
 if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
 const c=canvas.getContext('2d',{alpha:false});c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=THEME.background;c.fillRect(0,0,W,H);
 const issues=[],P=new Paint(c,THEME,issues,locale,{}),scene={id:spec.id,title:[spec.title[locale]],accentLine:-1,paragraphs:[spec.text[locale]],source:null},key=`${CHAPTER02.version}/${locale}/${orientation}/${index}`;
 if(!CACHE.has(key)){const L=sceneLayout(P,scene,v,{layout:spec.layout});CACHE.set(key,{L,issues:[...issues]});}else issues.push(...CACHE.get(key).issues);
 const L=CACHE.get(key).L,header={brand:'5sigmas',series:CHAPTER02.series[locale],scenes:CHAPTER02.scenes.map((s,i)=>({duration:s.duration,kicker:`${String(i+1).padStart(2,'0')} · ${CHAPTER02.title[locale]}`}))};
 drawHeader(P,header,index,time,CHAPTER02.duration,L);drawText(P,scene,L,1,state);
 c.save();const M=L.mechanism;c.translate(M.x,M.y);c.scale(M.scale,M.scale);const mechanismState=DRAWERS[index](P,state,spec,locale,v);c.restore();
 return {jobId:`seguridad-ia-02-${locale}-${orientation}`,scene:spec.id,sceneIndex:index,timeSeconds:time,duration:CHAPTER02.duration,bodySize:L.bodySize,mechanismScale:M.scale,issues,family:spec.family,layout:L,semanticTimeline:{version:CHAPTER02.version,events:expectedBeatEvents(spec,spec.start)},textCue:{activeId:state.activeId,cues:state.cues},mechanismState,reducedMotion};
}
