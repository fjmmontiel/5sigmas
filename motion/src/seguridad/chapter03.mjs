/** Chapter-specific poisoning mechanisms with mechanism-bound motion. No QA self-approval. */
import {Paint,clamp,lerp} from '../render/paint.mjs';
import {sceneLayout,drawHeader,drawText} from '../render/layout.mjs';
import {beatState,expectedBeatEvents} from './semantic-beats.mjs';
import {CHAPTER03} from './chapter03-data.mjs';

export const CHAPTER03_THEME=Object.freeze({
 background:'#FFFFFF',ink:'#191817',muted:'#66615D',rule:'#DDD8D3',
 bodyFont:'Arial',headlineFont:'Georgia',
 accent:'#B44B31',accentText:'#7F3525',accentSurface:'#F7ECE8',
 guideSurface:'#E8C8BE',guideText:'#5B2418'
});
const tr=(s,k,l)=>{const v=s.labels[k]?.[l];if(typeof v!=='string')throw Error(`MISSING_LABEL:${s.id}/${k}/${l}`);return v;};
function label(P,text,x,y,w,size=40,strong=false,align='center'){const lines=P.lines(text,w,size,strong?650:450);lines.forEach((line,i)=>P.text(line,x,y+i*size*1.16,size,strong?P.T.accentText:P.T.ink,strong?650:450,align,w));return lines.length*size*1.16;}
function card(P,text,x,y,w,h,size=36,strong=false){P.rect(x,y,w,h,strong?P.T.accentSurface:P.T.background,strong?P.T.accent:P.T.rule,14,strong?4:2.5);const lines=P.lines(text,w-26,size,strong?650:450);const yy=y+(h-lines.length*size*1.16)/2;label(P,text,x+w/2,yy,w-26,size,strong);}
function arrow(P,a,b,q=1,strong=false){if(q<=0)return;const e=clamp(q),x=lerp(a[0],b[0],e),y=lerp(a[1],b[1],e);P.path([a,[x,y]],strong?P.T.accentText:P.T.accent,strong?6:4);if(e<.995)P.circle(x,y,strong?9:7,strong?P.T.accentText:P.T.accent);else{const t=Math.atan2(b[1]-a[1],b[0]-a[0]),r=16;P.path([[b[0]-Math.cos(t-.55)*r,b[1]-Math.sin(t-.55)*r],b,[b[0]-Math.cos(t+.55)*r,b[1]-Math.sin(t+.55)*r]],strong?P.T.accentText:P.T.accent,4);}}
function focus(P,x,y,q,r=54,strong=false){if(q<=0)return;const e=clamp(q);P.circle(x,y,r+18*(1-e),null,strong?P.T.accentText:P.T.accent,strong?6:4);if(e>.55)P.circle(x,y,7+(e-.55)*7,strong?P.T.accentText:P.T.accent);}
function cross(P,x,y,r=12){P.path([[x-r,y-r],[x+r,y+r]],P.T.accentText,5);P.path([[x-r,y+r],[x+r,y-r]],P.T.accentText,5);}

function lifecycle(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),pts=v?[[500,115],[800,330],[500,555],[200,330]]:[[500,100],[820,315],[500,615],[180,315]],keys=['write','retrieve','influence','forget'],fs=v?38:34;
 for(let i=0;i<4;i++){
  if(on[Math.min(i,1)]){const [x,y]=pts[i];P.circle(x,y,72,i===3?P.T.accentSurface:P.T.background,i===3?P.T.accentText:P.T.accent,4);label(P,tr(s,keys[i],l),x,y-17,180,fs,i===3);}
 }
 if(on[1])for(let i=0;i<4;i++)arrow(P,pts[i],pts[(i+1)%4],q[1],false);
 if(on[0])focus(P,pts[0][0],pts[0][1],q[0],80,false);
 if(on[1])focus(P,pts[2][0],pts[2][1],q[1],82,false);
 if(on[2]){arrow(P,pts[3],[v?500:760,v?735:740],q[2],true);card(P,tr(s,'verify',l),v?310:635,v?735:690,v?380:300,96,fs,true);if(q[2]>.82)P.check(v?700:955,v?785:738,P.T.accentText,1.35);}
 return {memory:on[0]?'persisted_untrusted':'absent',stages:on[1]?['write','retrieve','influence_execute','forget']:['write'],influence:on[2]?'absent_after_retrieval':'reappears'};
}
function axes(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),x0=150,y0=650,x1=890,y1=120,fs=v?35:31;
 if(on[0]){P.path([[x0,y0],[x1,y0]],P.T.rule,4,q[0]);label(P,tr(s,'relevance',l),520,690,700,fs,true);}
 if(on[1]){P.path([[x0,y0],[x0,y1]],P.T.rule,4,q[1]);label(P,tr(s,'trust',l),110,70,430,fs,true,'left');const px=770,py=505;P.circle(px,py,40,P.T.accentSurface,P.T.accent,4);focus(P,px,py,q[1],58,true);label(P,tr(s,'memory',l),px,py+58,300,fs,false);}
 if(on[2]){const bx=v?500:520;P.path([[bx,130],[bx,640]],P.T.accentText,7,q[2]);card(P,tr(s,'barrier',l),v?260:660,250,v?480:300,120,fs,true);}
 return {axes:on[0]?['relevance']:[],item:on[1]?{relevance:'high',trust:'low'}:'unplaced',authority:on[2]?'requires_policy':'implicit'};
}
function propagation(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),source=[160,390],targets=v?[[560,150],[820,310],[560,570],[820,700]]:[[520,150],[830,280],[520,520],[830,650]],keys=['index','cache','summary','agent'],fs=v?34:30;
 if(on[0]){card(P,tr(s,'source',l),40,330,240,115,fs,true);for(let i=0;i<targets.length;i++){arrow(P,[280,388],targets[i],q[0],false);card(P,tr(s,keys[i],l),targets[i][0]-105,targets[i][1]-48,210,96,fs,false);}}
 if(on[1]){cross(P,160,388,24);P.path([[52,470],[270,470]],P.T.accentText,6,q[1]);for(const t of targets)focus(P,t[0],t[1],q[1],56,false);}
 if(on[2]){const x=360+(v?420:500)*q[2];P.path([[x,85],[x,735]],P.T.accentText,8);label(P,tr(s,'revoke',l),620,745,720,fs,true);if(q[2]>.82)for(const t of targets)cross(P,t[0],t[1],16);}
 return {derivatives:on[0]?keys:[],source:on[1]?'deleted':'present',derived_influence:on[2]?'revoked':'reachable'};
}
function compare(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?35:31;
 const left={x:55,y:100,w:410,h:540},right={x:535,y:100,w:410,h:540};
 if(on[0]){P.rect(left.x,left.y,left.w,left.h,P.T.background,P.T.rule,18,3);label(P,tr(s,'weights',l),left.x+left.w/2,130,left.w-30,fs,true);P.circle(left.x+left.w/2,320,78,P.T.accentSurface,P.T.accent,4);label(P,tr(s,'trigger',l),left.x+left.w/2,420,left.w-40,fs,false);focus(P,left.x+left.w/2,320,q[0],90,false);}
 if(on[1]){P.rect(right.x,right.y,right.w,right.h,P.T.background,P.T.rule,18,3);label(P,tr(s,'runtime',l),right.x+right.w/2,130,right.w-30,fs,true);P.rect(right.x+90,265,230,110,P.T.accentSurface,P.T.accent,16,4);label(P,tr(s,'state',l),right.x+right.w/2,295,210,fs,false);focus(P,right.x+right.w/2,320,q[1],90,true);}
 if(on[2]){P.path([[500,125],[500,620]],P.T.accentText,7,q[2]);card(P,tr(s,'controls',l),300,680,400,100,fs,true);}
 return {weights_surface:on[0]?'latent_behavior':'unmarked',runtime_surface:on[1]?'persistent_state':'unmarked',controls:on[2]?['model_training_eval','runtime_memory_governance']:'conflated'};
}
function authority(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?34:30,attrs=v?[[130,120],[560,120],[130,330],[560,330]]:[[80,140],[80,300],[80,460],[80,620]],keys=['provenance','scope','expiry','trust'],decision=v?[500,665]:[760,390];
 if(on[0])for(let i=0;i<attrs.length;i++){const [x,y]=attrs[i];card(P,tr(s,keys[i],l),x,y,310,105,fs,i===0);arrow(P,[x+310,y+52],decision,q[0],false);}
 if(on[1]){card(P,tr(s,'revoke',l),v?330:395,v?515:630,v?340:270,90,fs,true);if(q[1]>.72)cross(P,v?690:675,v?560:675,15);}
 if(on[2]){P.circle(decision[0],decision[1],86,P.T.accentSurface,P.T.accentText,6);focus(P,decision[0],decision[1],q[2],104,true);label(P,tr(s,'decision',l),decision[0],decision[1]-28,v?360:290,fs,true);}
 return {validated:on[0]?keys:[],derivatives:on[1]?'revoked':'authorized',action_authority:on[2]?'policy_decided':'unknown'};
}
const DRAWERS=[lifecycle,axes,propagation,compare,authority],CACHE=new Map();

export function renderChapter03(canvas,locale,orientation,timeSeconds,{reducedMotion=false}={}){
 if(!['es','en'].includes(locale)||!['horizontal','vertical'].includes(orientation)||!Number.isFinite(timeSeconds))throw Error('INVALID_RENDER_REQUEST');
 const portrait=orientation==='vertical',time=clamp(timeSeconds,0,CHAPTER03.duration),index=Math.max(0,CHAPTER03.scenes.findLastIndex(s=>time>=s.start)),spec=CHAPTER03.scenes[index],local=Math.min(spec.duration,time-spec.start),state=beatState(spec,locale,local,reducedMotion),W=portrait?1080:1920,H=portrait?1920:1080;
 if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
 const c=canvas.getContext('2d',{alpha:false});c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=CHAPTER03_THEME.background;c.fillRect(0,0,W,H);
 const issues=[],P=new Paint(c,CHAPTER03_THEME,issues,locale,{}),scene={id:spec.id,title:[spec.title[locale]],accentLine:-1,paragraphs:[spec.text[locale]],source:spec.source?.[locale]??null},key=`${CHAPTER03.version}/${locale}/${orientation}/${index}`;
 if(!CACHE.has(key)){const L=sceneLayout(P,scene,portrait,{layout:spec.layout});CACHE.set(key,{L,issues:[...issues]});}else issues.push(...CACHE.get(key).issues);
 const L=CACHE.get(key).L,header={brand:'5sigmas',series:CHAPTER03.series[locale],scenes:CHAPTER03.scenes.map(s=>({duration:s.duration,kicker:s.kicker[locale]}))};
 drawHeader(P,header,index,time,CHAPTER03.duration,L);drawText(P,scene,L,1,state);
 c.save();const M=L.mechanism;c.translate(M.x+(M.w-1000*M.scale)/2,M.y);c.scale(M.scale,M.scale);const mechanismState=DRAWERS[index](P,state,spec,locale,portrait);c.restore();
 return {jobId:`seguridad-ia-03-${locale}-${orientation}`,scene:spec.id,sceneIndex:index,timeSeconds:time,duration:CHAPTER03.duration,bodySize:L.bodySize,mechanismScale:M.scale,issues,family:spec.family,topology:spec.family,choreography:spec.family,layout:L,semanticTimeline:{version:CHAPTER03.version,events:expectedBeatEvents(spec,spec.start)},textCue:{activeId:state.activeId,cues:state.cues},mechanismState,reducedMotion};
}
