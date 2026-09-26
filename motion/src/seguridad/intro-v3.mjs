/** Chapter 00 repair on the retained Paint/layout/semantic-beat engine.
 * These functions render candidate pixels. They never issue a QA PASS or approval.
 */
import {Paint,clamp,lerp} from '../render/paint.mjs';
import {sceneLayout,drawHeader,drawText} from '../render/layout.mjs';
import {INTRO_V3,INTRO_TIMELINE} from './intro-v3-data.mjs';
import {beatState,expectedBeatEvents,ease} from './semantic-beats.mjs';
export const INTRO_THEME=Object.freeze({background:'#FCFAF7',ink:'#191817',muted:'#66615D',rule:'#DDD8D3',bodyFont:'Inter',headlineFont:'GFS Didot',accent:'#B44B31',accentText:'#843822',accentSurface:'#F6E9E2'});
const loc=(es,en,l)=>l==='es'?es:en;
const LAYOUT_CACHE=new Map();
function label(P,text,x,y,width=960,size=40,strong=false,align='center'){
 const lines=P.lines(text,width,size,strong?600:400);
 for(const [i,line] of lines.entries())P.text(line,x,y+i*size*1.2,size,strong?P.T.accentText:P.T.ink,strong?600:400,align,width);
 return lines.length*size*1.2;
}
function line(P,points,q=1,color=P.T.rule,width=3,dash=[]){if(q>0)P.path(points,color,width,q,dash);}
function arrow(P,points,q=1,color=P.T.accent,width=3){
 if(q<=0)return;P.path(points,color,width,q);
 if(q<.999)return;
 const a=points.at(-2),b=points.at(-1),t=Math.atan2(b[1]-a[1],b[0]-a[0]);
 P.path([[b[0]-14*Math.cos(t-.5),b[1]-14*Math.sin(t-.5)],b,[b[0]-14*Math.cos(t+.5),b[1]-14*Math.sin(t+.5)]],color,width);
}
function cross(P,x,y,r=13){P.path([[x-r,y-r],[x+r,y+r]],P.T.accentText,4);P.path([[x-r,y+r],[x+r,y-r]],P.T.accentText,4);}
function marker(P,id,x,y,{radius=24,strong=true}={}){
 P.circle(x,y,radius,strong?P.T.accentSurface:P.T.background,strong?P.T.accent:P.T.rule,2);
 P.text(id,x,y-15,28,strong?P.T.accentText:P.T.ink,600,'center',radius*2-6);
}
function travel(P,id,points,q,opts={}){
 const lengths=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1]));
 let remaining=lengths.reduce((a,b)=>a+b,0)*clamp(q);
 for(let i=0;i<lengths.length;i++){
  if(remaining<=lengths[i]||i===lengths.length-1){const f=clamp(remaining/lengths[i]);marker(P,id,lerp(points[i][0],points[i+1][0],f),lerp(points[i][1],points[i+1][1],f),opts);return;}
  remaining-=lengths[i];
 }
}
function documentOutline(P,x,y,w,h,color=P.T.rule){
 const fold=Math.min(28,w*.13);
 P.path([[x,y+h],[x,y],[x+w-fold,y],[x+w,y+fold],[x+w,y+h],[x,y+h]],color,2.5);
 P.path([[x+w-fold,y],[x+w-fold,y+fold],[x+w,y+fold]],color,2.5);
}
function note(P,x,y,w,h,text,number='01',strong=false,size=39){
 P.rect(x,y,w,h,P.T.background,strong?P.T.accent:P.T.rule,3,2.5);
 marker(P,number,x+40,y+h/2,{radius:27,strong});
 label(P,text,x+80+(w-96)/2,y+(h-size*1.2)/2,w-100,size,strong);
}
function cylinder(P,x,y,w,h){
 const c=P.c,ry=20;
 c.save();c.lineWidth=2.5;c.strokeStyle=P.T.rule;c.fillStyle=P.T.background;
 c.beginPath();c.moveTo(x,y);c.lineTo(x,y+h);c.ellipse(x+w/2,y+h,w/2,ry,0,Math.PI,0,true);c.lineTo(x+w,y);c.stroke();
 c.beginPath();c.ellipse(x+w/2,y,w/2,ry,0,0,Math.PI*2);c.stroke();c.restore();
}
function contextLedger(P,l){
 label(P,loc('CONTEXTO DEL MODELO','MODEL CONTEXT',l),500,360,950,35,true);
 P.rect(42,421,872,187,null,P.T.rule,3,2);
 P.path([[42,514],[914,514]],P.T.rule,2);
 label(P,loc('Sistema','System',l),145,443,180,33,false);
 label(P,loc('Externo','External',l),145,541,180,33,true);
}
function channel(P,S,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?44:39;
 label(P,loc('DOS ORÍGENES · UN CONTEXTO','TWO ORIGINS · ONE CONTEXT',l),500,5,960,v?36:30,false);
 if(on[0]){
  label(P,loc('Sistema','System',l),228,78,420,fs,true);
  P.rect(40,142,382,140,null,P.T.rule,3,2.5);
  const taskY=lerp(319,177,q[0]);
  P.rect(62,taskY-5,340,100,P.T.background,null,0);
  label(P,loc('Resume el informe','Summarize the report',l),231,taskY,330,v?40:37,false);
 }
 if(on[1]){
  label(P,loc('Informe externo','External report',l),752,78,470,fs,false);
  documentOutline(P,535,139,440,169);
  const instructionY=lerp(323,206,q[1]);
  P.rect(577,instructionY-8,357,64,P.T.background,null,0);
  label(P,loc('Pide acceso','Request access',l),755,instructionY,350,v?43:40,true);
 }
 if(on[2]){
  contextLedger(P,l);
  const a=ease(clamp(q[2]*1.5)),b=ease(clamp((q[2]-.15)/.85));
  const routeA=[[230,315],[230,392],[276,392],[276,470]];
  const routeB=[[753,335],[964,335],[964,565],[878,565]];
  line(P,routeA,a,P.T.accent,2.5);line(P,routeB,b,P.T.accent,2.5);
  if(a<1)travel(P,'1',routeA,a);else{
   marker(P,'1',276,470,{radius:22,strong:false});
   label(P,loc('Resume el informe','Summarize the report',l),600,444,540,v?41:39,false);
  }
  if(b<1)travel(P,'2',routeB,b);else{
   marker(P,'2',878,565,{radius:22});
   label(P,loc('Pide acceso','Request access',l),600,541,540,v?41:39,true);
  }
 }
 if(on[3]){
  arrow(P,[[510,611],[510,654],[315,654],[315,683]],q[3]);
  if(q[3]>.58){
   label(P,loc('Propuesta posible','Possible proposal',l),285,697,475,v?42:38,true);
   label(P,loc('Pide acceso','Request access',l),285,751,470,v?40:37,false);
  }
  P.text('0',779,645,88,P.T.accentText,600,'center',200,P.T.headlineFont);
  label(P,loc('permisos nuevos','new permissions',l),778,750,395,v?40:36,false);
 }
 return {task:q[0]>=1?'summarize':'absent',data:q[1]>=1?'embedded_instruction':'report',context:q[2]>=1?'trusted_and_external_text':'empty',proposal:q[3]>=1?'possible':'absent',authority:'not_granted'};
}
function memory(P,S,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?44:40;
 label(P,loc('GUARDAR ≠ VALIDAR','STORAGE ≠ VALIDATION',l),550,5,840,v?37:31,false);
 P.path([[197,110],[197,780]],P.T.rule,2);
 marker(P,'1',197,216,{radius:24,strong:false});marker(P,'2',197,565,{radius:24,strong:false});
 label(P,loc('Turno 1','Turn 1',l),89,120,172,fs,true);
 label(P,loc('Turno 2','Turn 2',l),89,470,172,fs,true);
 if(on[0]){
  cylinder(P,310,156,645,205);
  label(P,loc('Memoria','Memory',l),103,331,204,v?38:35,false);
  const y=lerp(70,220,q[0]);
  note(P,350,y,563,90,loc('Pide acceso','Request access',l),'01',true,fs);
  if(q[0]>.98)label(P,loc('Externa','External',l),754,321,230,v?34:30,true);
 }
 if(on[1]){
  const route=[[965,269],[980,269],[980,575],[938,575]];
  line(P,route,q[1],P.T.accent,3, [8,6]);
  if(q[1]<1)travel(P,'01',route,q[1],{radius:27});
  if(q[1]>=1){
   const y=on[3]?lerp(538,656,q[3]):538;
   note(P,350,y,563,90,loc('Pide acceso','Request access',l),'01',true,fs);
   if(!on[3])label(P,loc('Copia recuperada','Retrieved copy',l),625,665,650,fs,false);
  }
 }
 if(on[2]){
  const provenanceRoute=[[975,338],[975,428],[285,428]];
  if(q[2]<1){line(P,provenanceRoute,q[2],P.T.accent,2.5);travel(P,'!',provenanceRoute,q[2]);}
  else{marker(P,'!',285,428,{radius:23});label(P,loc('Origen externo · no validado','External origin · not validated',l),635,408,695,v?38:35,true);}
 }
 if(on[3]){
  P.rect(315,636,635,131,null,P.T.rule,3,2.5);
  if(q[3]>.95)label(P,loc('Contexto del modelo','Model context',l),630,582,665,fs,true);
 }
 return {note:q[0]>=1?'stored':'external',copy:q[1]>=1?'next_turn':'absent',original:'retained',source_badge:q[2]>=1?'external_not_verified':'hidden',context:q[3]>=1?'exposed_to_same_note':'not_exposed'};
}
function permissions(P,S,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?44:40,ys=[225,405,585];
 const names=l==='es'?['Leer','Modificar','Ejecutar']:['Read','Write','Execute'];
 label(P,loc('PROPUESTA','PROPOSAL',l),180,15,355,v?37:31,false);
 label(P,loc('PERMISO','PERMISSION',l),519,15,305,v?37:31,true);
 label(P,loc('EFECTO','EFFECT',l),853,15,270,v?37:31,false);
 for(const [i,y] of ys.entries()){
  P.path([[82,y],[925,y]],P.T.rule,2);
  if(on[0]){
   label(P,names[i],183,y-76,315,fs,false);
  }
 }
 if(on[1]){
  P.rect(498,145,42,487,P.T.accentSurface,null,0);
  P.path([[519,145],[519,145+487*q[1]]],P.T.accent,3);
  if(q[1]>.25)P.check(519,225,P.T.accentText,1.9);
  if(q[1]>.60)cross(P,519,405,15);
  if(q[1]>.95)cross(P,519,585,15);
  label(P,loc('Sólo lectura','Read only',l),523,81,450,v?42:37,true);
 }
 // Moving request tokens are above the permission mask so their IDs stay readable while crossing.
 if(on[0])for(const [i,y]of ys.entries()){
  const endpoint=on[2]?(i===0?866:422):280;
  const x=on[2]?lerp(280,endpoint,q[2]):lerp(95,280,q[0]);
  marker(P,String(i+1),x,y,{radius:v?28:25,strong:true});
 }
 if(on[2]&&q[2]>.95){
  label(P,loc('Permitida','Allowed',l),847,279,285,fs,true);
  label(P,loc('Bloqueada','Blocked',l),830,439,325,fs,true);
  label(P,loc('Bloqueada','Blocked',l),830,619,325,fs,true);
 }
 if(on[3]){
  P.circle(924,225,19,P.T.accentSurface,P.T.accent,3);
  if(q[3]>.55)P.check(924,225,P.T.accentText,1.2);
  P.path([[85,710],[85+841*q[3],710]],P.T.accent,2.5);
  label(P,loc('3 propuestas → 1 acción permitida','3 proposals → 1 permitted action',l),502,749,970,v?42:38,true);
 }
 return {requests:q[0]>=1?['read','write','execute']:[],scope:q[1]>=1?['read']:[],allowed:q[2]>=1?['read']:[],denied:q[2]>=1?['write','execute']:[],effect:q[3]>=1?'read_only':'pending'};
}
function surfaceDocument(P,x,y,w,h,q,l,size){
 documentOutline(P,x,y,w,h);
 const nativeVertical=size>35,tx=nativeVertical?x+w/2:lerp(x-w*.3,x+w/2,q),ty=nativeVertical?lerp(y-65,y+h*.34,q):y+h*.34;
 P.rect(tx-(w-24)/2,ty-4,w-24,size*1.3,P.T.background,null,0);
 label(P,loc('Orden','Instruction',l),tx,ty,w-24,size,true);
}
function surfaceBoundary(P,x,y,r,q,l,size,showEntry=true){
 P.circle(x,y,r,null,P.T.rule,3);
 if(showEntry)arrow(P,[[x-r-67,y],[x-r-9,y]],q);
 const a=-Math.PI*.4,b=a+q*Math.PI*.8;
 P.c.save();P.c.beginPath();P.c.arc(x,y,r,a,b);P.c.strokeStyle=P.T.accent;P.c.lineWidth=5;P.c.stroke();P.c.restore();
 label(P,loc('Límite','Boundary',l),x,y-size*.55,2*r-13,size,false);
}
function surfacePersistence(P,x,y,w,h,q,l,size){
 const gap=w*.18,cx1=x+w*.20,cx2=x+w*.80,cy=y+h*.48;
 P.path([[cx1+30,cy],[cx2-30,cy]],P.T.rule,2.5);
 P.circle(cx1,cy,28,P.T.accentSurface,P.T.accent,2.5);
 P.circle(cx2,cy,28,q>=.98?P.T.accentSurface:P.T.background,q>=.98?P.T.accent:P.T.rule,2.5);
 if(q>0&&q<1){const xx=lerp(cx1,cx2,q);P.circle(xx,cy,9,P.T.accent);}
 label(P,'t₁',cx1,y+h*.77,gap*2,size,false);label(P,'t₂',cx2,y+h*.77,gap*2,size,false);
 P.text('1',cx1,cy-12,24,P.T.accentText,600,'center',45);
 if(q>=.98)P.text('1',cx2,cy-12,24,P.T.accentText,600,'center',45);
}
function surfaces(P,S,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible);
 const titles=[loc('Inyección indirecta','Indirect injection',l),'Jailbreak',loc('Persistencia','Persistence',l)];
 const subtitles=[loc('Datos externos','External data',l),loc('Restricción del modelo','Model restriction',l),loc('Entre interacciones','Across interactions',l)];
 if(v){
  const ys=[0,285,570];
  for(let i=0;i<3;i++){
   if(!on[i])continue;
   label(P,titles[i],230,ys[i]+34,430,44,true);
   label(P,subtitles[i],230,ys[i]+150,430,41,false);
   if(i===0)surfaceDocument(P,576,ys[i]+20,305,184,q[i],l,44);
   if(i===1)surfaceBoundary(P,737,ys[i]+121,99,q[i],l,37);
   if(i===2)surfacePersistence(P,555,ys[i]+22,365,177,q[i],l,44);
  }
  if(on[3]){
   P.path([[916,125],[970,125],[970,710],[916,710]],P.T.accent,3,q[3]);
   label(P,loc('Una cadena posible. No una equivalencia.','A possible chain. Not an equivalence.',l),500,847,935,43,true);
  }
 }else{
  const xs=[150,500,850];
  for(let i=0;i<3;i++){
   if(!on[i])continue;
   label(P,titles[i],xs[i],0,320,27,true);
   label(P,subtitles[i],xs[i],222,310,23,false);
   if(i===0)surfaceDocument(P,39,78,222,123,q[i],l,28);
   if(i===1)surfaceBoundary(P,500,145,60,q[i],l,23,!on[3]);
   if(i===2)surfacePersistence(P,735,80,230,126,q[i],l,27);
  }
  if(on[3]){
   arrow(P,[[277,146],[431,146]],q[3]);arrow(P,[[595,146],[751,146]],q[3]);
   label(P,loc('Una cadena posible. No una equivalencia.','A possible chain. Not an equivalence.',l),500,257,950,27,true);
  }
 }
 return {document:q[0]>=1?'instruction_in_data':'data',boundary:q[1]>=1?'under_attempt':'untested',memory:q[2]>=1?'signal_retained':'empty',route:q[3]>=1?'possible_chain':'separate'};
}
function enforcement(P,S,l,v){
 const q=S.cues.map(c=>c.progress),on=S.cues.map(c=>c.visible),fs=v?44:39;
 label(P,loc('EJEMPLO · DEFENSA EN PROFUNDIDAD','EXAMPLE · DEFENSE IN DEPTH',l),500,0,970,v?37:31,false);
 P.path([[54,418],[947,418]],P.T.rule,2.5);
 P.circle(250,418,58,null,P.T.rule,3);
 P.circle(490,418,79,null,P.T.rule,3);
 label(P,loc('Modelo','Model',l),491,295,180,v?35:32,false);
 documentOutline(P,874,348,109,151);
 label(P,loc('Recurso','Resource',l),906,281,180,v?38:33,false);
 label(P,loc('Control de entrada','Input control',l),237,175,455,fs,false);
 if(on[0]){
  const x=on[1]?lerp(250,490,q[1]):lerp(65,250,q[0]);
  if(!on[3])marker(P,'1',x,418,{radius:25});
  if(q[0]>.95&&!on[1])P.path([[208,354],[232,338],[266,337],[290,354]],P.T.accent,3);
 }
 if(on[1]){
  P.path([[282,358],[301,382]],P.T.accent,4,q[1]);
  label(P,loc('En este caso, falla','In this case, it fails',l),248,559,454,v?42:36,true);
 }
 if(on[2]){
  label(P,loc('Política de la aplicación','Application policy',l),738,95,468,v?42:36,true);
  arrow(P,[[735,202],[735,316]],q[2]);
  P.rect(715,322,40,193,P.T.accentSurface,null,0);
  P.path([[735,322],[735,322+193*q[2]]],P.T.accentText,4);
  label(P,loc('Autorización externa','External authorization',l),756,547,430,v?42:36,true);
 }
 if(on[3]){
  marker(P,'1',lerp(490,668,q[3]),418,{radius:25});
  if(q[3]>.95){
   cross(P,735,418,20);
   label(P,loc('DENEGADA','DENIED',l),640,668,520,v?45:40,true);
   label(P,loc('Sin cambios','Unchanged',l),900,647,240,v?38:33,false);
  }
  P.path([[70,750],[70+886*q[3],750]],P.T.accent,2.5);
  label(P,loc('Sin permiso → sin efecto externo','No permission → no external effect',l),510,780,965,v?43:37,true);
 }
 return {signal:q[0]>=1?'checked':'unfiltered',input:q[1]>=1?'past_guard':'at_guard',policy:q[2]>=1?'independent_no_execute':'not_applied',proposal:q[3]>=1?'denied':'pending',external_effect:false};
}
const DRAWERS=[channel,memory,permissions,surfaces,enforcement];
function wideLayout(P,scene,L){
 const titleSize=78,bodySize=50,top=163,textWidth=1776,segments=[];let x=72;
 for(const [i,text] of scene.title.entries()){
  segments.push({text,x,accent:i===scene.accentLine});x+=P.measure(text+' ',titleSize,600,P.T.headlineFont);
 }
 if(x>1850)P.issues.push({type:'wide-title-overflow',right:x});
 const lines=P.lines(scene.paragraphs[0],textWidth,bodySize),y=705,bodyBottom=y+lines.length*bodySize*1.22;
 if(bodyBottom>952)P.issues.push({type:'wide-body-overflow',bodyBottom});
 return {...L,left:72,top,textWidth,titleSize,titleLines:[],titleSegments:segments,banner:true,bodySize,bodyLH:1.22,paragraphs:[{text:scene.paragraphs[0],lines,y}],bodyBottom,sourceY:Math.min(970,bodyBottom+38),mode:'triptych',mechanism:{x:260,y:276,w:1400,h:450,scale:1.4},metrics:{...L.metrics,bodySize,bodyBottom,intendedEmbedBodyPixels:bodySize*1100/1920}};
}
function composedLayout(P,scene,v,index){
 const key=JSON.stringify([P.locale,v,index,scene.title,scene.paragraphs,INTRO_THEME]);
 if(LAYOUT_CACHE.has(key))return LAYOUT_CACHE.get(key);
 let L=sceneLayout(P,scene,v,{layout:[1,4].includes(index)?'reverse':'split'});
 if(index!==3||v){
  const width=v?964:760,left=v?58:[1,4].includes(index)?1050:72,top=163;
  const limit=v?895:927,choices=[];
  for(let titleSize=v?108:104;titleSize>=(v?88:88);titleSize-=2){
   const titleLines=scene.title.flatMap((s,i)=>P.lines(s,width,titleSize,600,P.T.headlineFont).map(text=>({text,accent:i===scene.accentLine})));
   if(titleLines.length>3)continue;
   const y=top+titleLines.length*titleSize*1.04+29;
   for(let bodySize=60;bodySize>=(v?52:52);bodySize--){
    const lines=P.lines(scene.paragraphs[0],width,bodySize),bottom=y+lines.length*bodySize*1.22;
    if(bottom<=limit)choices.push({titleSize,titleLines,bodySize,lines,y,bottom,score:bodySize*4+titleSize*.9-(titleLines.length-2)*32});
   }
  }
  choices.sort((a,b)=>b.score-a.score);const fit=choices[0];
  if(!fit)P.issues.push({type:'golden-headline-recomposition-required',scene:scene.id});
  else L={...L,left,top,textWidth:width,titleSize:fit.titleSize,titleLines:fit.titleLines,titleSegments:null,banner:false,bodySize:fit.bodySize,bodyLH:1.22,paragraphs:[{text:scene.paragraphs[0],lines:fit.lines,y:fit.y}],bodyBottom:fit.bottom,sourceY:v?1818:Math.min(965,fit.bottom+38),metrics:{...L.metrics,bodySize:fit.bodySize,bodyBottom:fit.bottom,intendedEmbedBodyPixels:fit.bodySize*(v?390/1080:1100/1920)}};
 }
 if(!v&&index===3)L=wideLayout(P,scene,L);
 if(v){
  const baseHeight=index===3?970:index===4?855:830;
  L.mechanism.y=L.bodyBottom+54;
  L.mechanism.h=1775-L.mechanism.y;
  L.mechanism.scale=Math.min(L.mechanism.w/1000,L.mechanism.h/baseHeight);
  if(L.mechanism.scale<.88)P.issues.push({type:'portrait-needs-recomposition',scene:scene.id,scale:L.mechanism.scale});
 }else if(index===4){L.mechanism.y=163;L.mechanism.scale=Math.min(L.mechanism.w/1000,780/840);}
 if(!P.issues.length)LAYOUT_CACHE.set(key,L);
 return L;
}
export function renderIntroV3(canvas,locale,orientation,timeSeconds,{reducedMotion=false}={}){
 if(!['es','en'].includes(locale)||!['horizontal','vertical'].includes(orientation)||!Number.isFinite(timeSeconds))throw Error('INVALID_RENDER_REQUEST');
 const v=orientation==='vertical',time=clamp(timeSeconds,0,INTRO_V3.duration),index=Math.max(0,INTRO_V3.scenes.findLastIndex(s=>time>=s.start)),spec=INTRO_V3.scenes[index],local=Math.min(spec.duration,time-spec.start);
 const rawState=beatState(spec,locale,local,reducedMotion);
 // Whole clauses remain anchored. Only the active clause receives the single functional accent.
 const state={...rawState,cues:rawState.cues.map(c=>({...c,emphasis:c.status==='active'?1:0}))};
 const W=v?1080:1920,H=v?1920:1080;
 if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
 const c=canvas.getContext('2d',{alpha:false});c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=INTRO_THEME.background;c.fillRect(0,0,W,H);
 const issues=[],P=new Paint(c,INTRO_THEME,issues,locale,{});
 const scene={id:spec.id,title:spec.titleLines[locale],accentLine:spec.accentLine,paragraphs:[spec.text[locale]],source:spec.sourceLabel[locale]};
 P.portrait=v;
 const L=composedLayout(P,scene,v,index);
 const header={brand:'5sigmas',series:loc('SEGURIDAD EN IA','AI SECURITY',locale),scenes:INTRO_V3.scenes.map((s,i)=>({duration:s.duration,kicker:loc(['DOS ORÍGENES','MEMORIA ENTRE TURNOS','MÍNIMO PRIVILEGIO','SUPERFICIES DE ATAQUE','CONTENER EL EFECTO'][i],['TWO ORIGINS','MEMORY ACROSS TURNS','LEAST PRIVILEGE','ATTACK SURFACES','CONTAIN THE EFFECT'][i],locale)}))};
 const headerPaint=Object.create(P);
 if(v)headerPaint.text=(text,x,y,size,...rest)=>P.text(text,x,y>=H-60?y-6:y,Math.max(size,29),...rest);
 drawHeader(headerPaint,header,index,time,INTRO_V3.duration,L);drawText(P,scene,L,1,state);
 c.save();const M=L.mechanism;c.translate(M.x,M.y);c.scale(M.scale,M.scale);const semanticState=DRAWERS[index](P,state,locale,v);c.restore();
 return {jobId:`seguridad-ia-00-${locale}-${orientation}`,scene:spec.id,sceneIndex:index,timeSeconds:time,localSeconds:local,duration:INTRO_V3.duration,bodySize:L.bodySize,mechanismScale:M.scale,issues,family:spec.family,topology:spec.family,metrics:L.metrics,layout:{left:L.left,textWidth:L.textWidth,bodySize:L.bodySize,bodyBottom:L.bodyBottom,sourceY:L.sourceY,mechanism:M,paragraphs:L.paragraphs},semanticTimeline:{version:INTRO_V3.version,events:INTRO_TIMELINE.filter(e=>e.concept_id===spec.id)},textCue:{activeId:state.activeId,cues:state.cues},semanticState,reducedMotion,qaApproval:null};
}
