/** Chapter-specific mechanisms on the shared Paint/layout/semantic-beat engine.
 * All visible content comes from CHAPTER01. Render telemetry is not encoded QA.
 */
import {Paint,clamp,lerp} from '../render/paint.mjs';
import {sceneLayout,drawHeader,drawText} from '../render/layout.mjs';
import {beatState,expectedBeatEvents} from './semantic-beats.mjs';
import {CHAPTER01} from './chapter01-data.mjs';
export const CHAPTER01_THEME=Object.freeze({background:'#FFFFFF',ink:'#191817',muted:'#66615D',rule:'#DDD8D3',bodyFont:'Arial',headlineFont:'Georgia',accent:'#B44B31',accentText:'#7F3525',accentSurface:'#F7ECE8',guideSurface:'#D9A99A',guideText:'#4A1A12'});
const text=(s,key,l)=>{const v=s.labels[key]?.[l];if(typeof v!=='string')throw Error(`MISSING_LABEL:${s.id}/${key}/${l}`);return v;};
function label(P,t,x,y,w,size=40,strong=false,align='center'){
 const lines=P.lines(t,w,size,strong?600:400);
 lines.forEach((line,i)=>P.text(line,x,y+i*size*1.2,size,strong?P.T.accentText:P.T.ink,strong?600:400,align,w));
 return lines.length*size*1.2;
}
function arrow(P,points,q=1,color=P.T.accent,width=4){
 if(q<=0)return;P.path(points,color,width,q);
 if(q>=.995){const b=points.at(-1),a=points.at(-2),theta=Math.atan2(b[1]-a[1],b[0]-a[0]);P.path([[b[0]-15*Math.cos(theta-.5),b[1]-15*Math.sin(theta-.5)],b,[b[0]-15*Math.cos(theta+.5),b[1]-15*Math.sin(theta+.5)]],color,width);}
}
function cross(P,x,y,r=11){P.path([[x-r,y-r],[x+r,y+r]],P.T.accentText,4);P.path([[x-r,y+r],[x+r,y-r]],P.T.accentText,4);}
function paper(P,x,y,w,h,active=false){
 P.c.save();P.c.fillStyle=P.T.background;P.c.fillRect(x,y,w,h);P.c.restore();
 P.path([[x,y+h],[x,y],[x+w-24,y],[x+w,y+24],[x+w,y+h],[x,y+h]],active?P.T.accent:P.T.rule,3);
 P.path([[x+w-24,y],[x+w-24,y+24],[x+w,y+24]],P.T.rule,2);
}
function cell(P,t,x,y,w,h,size,strong=false){P.rect(x,y,w,h,strong?P.T.accentSurface:P.T.background,strong?P.T.accent:P.T.rule,3,2);const lines=P.lines(t,w-30,size,500);label(P,t,x+w/2,y+(h-lines.length*size*1.2)/2,w-30,size,strong);}
function footer(P,s,l,v,y=754){if(s.labels.example)label(P,text(s,'example',l),500,y,950,v?34:27,false);}

// The source-role column never changes when the instruction attempts to cross it.
function roleLedger(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?46:40;
 const ys=[116,282,448],keys=['system','user','retrieved'],copy=['task','user_task','external'];
 P.path([[40,88],[900,88],[900,635],[40,635]],P.T.rule,2);
 P.path([[325,88],[325,635]],P.T.rule,2);
 for(let i=0;i<3;i++){
  if(!(i<2?on[0]:on[1]))continue;
  const t=i<2?q[0]:q[1];
  P.rect(42,ys[i]-5,282,128,i===2?P.T.accentSurface:null,null,0);
  label(P,text(s,keys[i],l),181,ys[i]+31,276,fs,i===2);
  P.c.save();P.c.beginPath();P.c.rect(337,ys[i]-10,548,150);P.c.clip();
  label(P,text(s,copy[i],l),610+25*(1-t),ys[i]+24,528,fs,i===2);P.c.restore();
  P.path([[40,ys[i]+146],[900,ys[i]+146]],P.T.rule,2);
 }
 if(on[2]){arrow(P,[[934,530],[974,530],[974,176],[915,176]],q[2]);label(P,text(s,'attempt',l),500,657,900,v?43:37,true);}
 if(on[3]){P.rect(40,733,860,58,P.T.accentSurface,null,2);label(P,text(s,'warning',l),470,740,832,v?39:35,true);}
 return {rows:on[0]?['system','user']:[],external:on[1]?'retrieved_instruction':'absent',attempt:on[2]?'data_to_control':'absent',origin:on[1]?'external':'absent',authority:on[3]?'not_granted':'undetermined'};
}

// Retrieval copies only a selected subset; original candidates retain their places.
function retrieval(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?45:38;
 label(P,text(s,'pool',l),214,14,420,fs,true);
 if(on[1])label(P,text(s,'selected',l),741,14,485,fs,true);
 const names=['manual','email','wiki','note'],ys=[109,262,415,568];
 if(on[0])for(let i=0;i<4;i++){
  const y=ys[i];paper(P,25,y,390,116,i===1&&on[1]);label(P,text(s,names[i],l),220,y+31,340,fs,i===1&&on[1]);
 }
 if(on[1])for(let i=0;i<2;i++){
  const x=548,y=ys[i];arrow(P,[[430,y+58],[532,y+58]],q[1]);paper(P,x,y,390,116,i===1);label(P,text(s,names[i],l),x+195,y+31,340,fs,i===1);
 }
 if(on[2]){
  label(P,text(s,'context',l),744,663,470,fs,true);P.rect(518,481,450,177,null,P.T.rule,4,3);
  const y=lerp(418,561,q[2]);cell(P,text(s,'payload',l),548,y-55,390,110,fs,true);
 }
 if(on[3]){P.path([[518,730],[968,730]],P.T.accent,4);label(P,text(s,'warning',l),744,746,485,v?41:37,true);}
 return {candidates:on[0]?names:[],selected:on[1]?['manual','email']:[],context:on[2]?'selected_email_instruction':'empty',trust:on[3]?'not_established_by_rank':'implicit'};
}

// A literal scan marks the same matching word, rather than claiming a universal filter.
function literalFilter(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?46:40;
 if(on[0]){label(P,text(s,'literal',l),280,10,520,fs,true);cell(P,text(s,'signature',l),612,0,340,75,fs,true);}
 const ys=[165,404];
 for(let i=0;i<2;i++){
  if(!on[i])continue;
  const y=ys[i],words=text(s,i?'form2':'form1',l);paper(P,36,y,646,150,false);
  if(on[2]&&!i){
   const needle=text(s,'signature',l).replace(/[«»“”"]/g,'').toLocaleLowerCase(l);
   for(const [li,line] of P.lines(words,590,fs).entries()){
    const index=line.toLocaleLowerCase(l).indexOf(needle);if(index<0)continue;
    const x=359-P.measure(line,fs)/2+P.measure(line.slice(0,index),fs),w=P.measure(line.slice(index,index+needle.length),fs),yy=y+24+li*fs*1.2;
    P.rect(x-3,yy-2,w+6,fs*1.12,P.T.accentSurface,null,2);
    P.path([[x,yy+fs*1.13],[x+w,yy+fs*1.13]],P.T.accent,3,q[2]);
   }
  }
  label(P,words,359,y+24,590,fs,false);
  if(on[1]&&i===1){P.path([[720,520],[960,520]],P.T.accent,4,q[1]);label(P,text(s,'action',l),840,536,300,v?34:30,true);}
  if(on[2]&&q[2]>.85){
   const value=text(s,i?'no_match':'match',l),size=v?43:40,iconX=842-P.measure(value,size,!i?600:400)/2-18;
   label(P,value,842,y+44,284,size,!i);if(!i)P.check(iconX,y+64,P.T.accentText,1.1);else P.circle(iconX,y+64,10,null,P.T.rule,3);
  }
 }
 if(on[3]){
  P.path([[31,332],[16,332],[16,600],[305,600]],P.T.accent,3,q[3]);
  arrow(P,[[354,568],[354,618],[500,618],[500,631]],q[3]);
  label(P,text(s,'action',l),500,652,960,v?39:34,true);label(P,text(s,'send',l),500,710,930,v?46:43,true);
 }
 return {signature:on[0]?'ignore':'absent',forms:on[1]?2:on[0]?1:0,objective:on[1]?'send_copy':'unresolved',matches:on[2]?['first']:[],not_matched:on[2]?['second']:[],meaning:on[3]?'same_requested_action':'unresolved',authority:'not_granted'};
}

// Append-only event evidence distinguishes a proposed call from the performed effect.
function evidenceTrace(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?45:40;
 const ys=[100,270,440,610],head=['proposal','scope_heading','policy','execution'],values=['send','read','denied','none'];
 P.path([[58,115],[58,737]],P.T.rule,3);
 for(let i=0;i<4;i++){
  if(!on[i])continue;
  P.circle(58,ys[i]+37,13,i===2?P.T.accent:P.T.background,P.T.accent,3);
  P.path([[77,ys[i]+37],[90+q[i]*30,ys[i]+37]],P.T.accent,3);
  label(P,text(s,head[i],l),302,ys[i]+8,352,v?38:31,true);
  cell(P,text(s,values[i],l),510,ys[i]-3,445,118,fs,i===2);
  if(i===1&&q[i]>.72){P.check(948,ys[i]+56,P.T.accentText,1.05);label(P,text(s,'evidence',l),500,747,900,v?31:27,true);}
  if(i===2&&q[i]>.85)cross(P,971,ys[i]+55,10);
  if(i===3&&q[i]>.85){P.path([[523,ys[i]+124],[941,ys[i]+124]],P.T.accentText,4);}
 }
 return {proposal:on[0]?'send_report':'absent',scope:on[1]?'read_only':'unrecorded',evidence:on[1]?'recorded':'missing',decision:on[2]?'deny_send':'pending',execution:on[3]?false:'unknown',result:on[3]?'no_external_send':'unverified'};
}

// Two compartments and one typed bridge, not a chain of unrestricted model calls.
function quarantine(P,S,s,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible);
 if(v){
  if(on[0]){
   P.rect(32,32,936,223,null,P.T.rule,6,3);label(P,text(s,'untrusted',l),500,48,880,43,true);
   paper(P,65,115,375,120,false);label(P,text(s,'document',l),252,126,341,42,false);
   arrow(P,[[452,166],[581,166]],q[0]);cell(P,text(s,'reader',l),600,115,315,100,47,true);
   label(P,text(s,'no_tools',l),500,269,930,43,false);
  }
  if(on[1]){
   arrow(P,[[745,315],[745,374],[500,374],[500,410]],q[1]);
   cell(P,text(s,'fields',l),50,420,900,80,44,true);label(P,text(s,'contract',l),500,516,920,42,true);
   P.rect(35,579,930,145,null,P.T.rule,5,3);cell(P,text(s,'executor',l),63,607,302,80,44,false);label(P,'?',577,622,120,54,true);
  }
  if(on[2]){
   P.rect(35,579,930,145,null,P.T.rule,5,3);cell(P,text(s,'executor',l),63,607,302,80,44,false);
   label(P,text(s,'policy',l),577,590,350,40,true);P.check(571,711,P.T.accentText,1.3);
   arrow(P,[[767,690],[846,690]],q[2]);label(P,text(s,'tool',l),852,632,254,38,false);arrow(P,[[212,504],[212,595]],q[2]);
  }
  if(on[3])label(P,text(s,'warning',l),500,750,960,44,true);
 }else{
  if(on[0]){
   P.rect(10,35,345,200,null,P.T.rule,3,2);label(P,text(s,'untrusted',l),182,44,322,24,true);
   paper(P,27,105,143,93);label(P,text(s,'document',l),98,135,128,22,false);
   arrow(P,[[180,150],[210,150]],q[0]);cell(P,text(s,'reader',l),219,117,119,70,25,true);
   label(P,text(s,'no_tools',l),182,209,322,20,false);
  }
  if(on[1]){
   arrow(P,[[363,155],[418,155]],q[1]);cell(P,text(s,'fields',l),431,90,166,126,24,true);
   label(P,text(s,'contract',l),514,36,230,22,true);
   P.rect(667,35,320,200,null,P.T.rule,3,2);label(P,text(s,'trusted',l),827,47,294,24,true);cell(P,text(s,'executor',l),689,115,141,70,25,false);label(P,'?',827,204,80,26,true);
  }
  if(on[2]){
   P.rect(667,35,320,200,null,P.T.rule,3,2);label(P,text(s,'trusted',l),827,47,294,24,true);
   arrow(P,[[605,155],[658,155]],q[2]);cell(P,text(s,'executor',l),689,115,141,70,25,false);
   label(P,text(s,'tool',l),914,122,146,24,false);arrow(P,[[840,164],[862,164]],q[2]);
   label(P,text(s,'policy',l),828,206,290,21,true);
  }
  if(on[3])label(P,text(s,'warning',l),500,265,930,28,true);
 }
 return {reader:on[0]?'untrusted_content':'absent',sensitive_tools:false,handoff:on[1]?'limited_validated_fields':'unvalidated',executor:on[2]?'independently_authorized':on[1]?'uncontrolled':'not_active',claim:on[3]?'reduced_routes_not_immunity':'unspecified'};
}
const DRAWERS=[roleLedger,retrieval,literalFilter,evidenceTrace,quarantine],LAYOUT_CACHE=new Map();
function wideLayout(P,scene,L){
 const width=1776,titleSize=74,bodySize=48,bodyY=671;
 const titleLines=P.lines(scene.title[0],width,titleSize,600,P.T.headlineFont).map(text=>({text,accent:false}));
 const lines=P.lines(scene.paragraphs[0],width,bodySize),bottom=bodyY+lines.length*bodySize*1.22;
 if(bottom>952)P.issues.push({type:'wide-body-overflow',bottom});
 return {...L,left:72,top:163,textWidth:width,titleSize,titleLines,titleSegments:null,banner:false,bodySize,bodyLH:1.22,paragraphs:[{text:scene.paragraphs[0],lines,y:bodyY}],bodyBottom:bottom,sourceY:955,mode:'diagram-first',mechanism:{x:260,y:245,w:1400,h:418,scale:1.4},metrics:{...L.metrics,bodySize,bodyBottom:bottom,intendedEmbedBodyPixels:bodySize*1100/1920}};
}
export function renderChapter01(canvas,locale,orientation,timeSeconds,{reducedMotion=false}={}){
 if(!['es','en'].includes(locale)||!['horizontal','vertical'].includes(orientation)||!Number.isFinite(timeSeconds))throw Error('INVALID_RENDER_REQUEST');
 const v=orientation==='vertical',time=clamp(timeSeconds,0,CHAPTER01.duration),index=Math.max(0,CHAPTER01.scenes.findLastIndex(s=>time>=s.start)),spec=CHAPTER01.scenes[index],local=Math.min(spec.duration,time-spec.start),state=beatState(spec,locale,local,reducedMotion),W=v?1080:1920,H=v?1920:1080;
 if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
 const c=canvas.getContext('2d',{alpha:false});c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=CHAPTER01_THEME.background;c.fillRect(0,0,W,H);
 const issues=[],P=new Paint(c,CHAPTER01_THEME,issues,locale,{}),scene={id:spec.id,title:[spec.title[locale]],accentLine:-1,paragraphs:[spec.text[locale]],source:null};
 const key=`${CHAPTER01.version}/${locale}/${orientation}/${index}`;
 if(!LAYOUT_CACHE.has(key)){let L=sceneLayout(P,scene,v,{layout:spec.layout});if(!v&&index===4)L=wideLayout(P,scene,L);LAYOUT_CACHE.set(key,{L,issues:[...issues]});}else issues.push(...LAYOUT_CACHE.get(key).issues);
 const L=LAYOUT_CACHE.get(key).L;
 const header={brand:'5sigmas',series:CHAPTER01.series[locale],scenes:CHAPTER01.scenes.map((s,i)=>({duration:s.duration,kicker:`${String(i+1).padStart(2,'0')} · ${CHAPTER01.title[locale]}`}))};
 drawHeader(P,header,index,time,CHAPTER01.duration,L);drawText(P,scene,L,1,state);
 c.save();const M=L.mechanism;c.translate(M.x,M.y);c.scale(M.scale,M.scale);const mechanismState=DRAWERS[index](P,state,spec,locale,v);c.restore();
 return {jobId:`seguridad-ia-01-${locale}-${orientation}`,scene:spec.id,sceneIndex:index,timeSeconds:time,duration:CHAPTER01.duration,bodySize:L.bodySize,mechanismScale:M.scale,issues,family:spec.family,layout:L,semanticTimeline:{version:CHAPTER01.version,events:expectedBeatEvents(spec,spec.start)},textCue:{activeId:state.activeId,cues:state.cues},mechanismState,reducedMotion};
}
