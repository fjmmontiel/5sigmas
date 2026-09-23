/** Golden-editorial Jailbreak mechanisms; shared low-level paint/timeline only, no QA self-approval. */
import {Paint,clamp,lerp} from '../render/paint.mjs';
import {drawHeader,drawText} from '../render/layout.mjs';
import {beatState,expectedBeatEvents} from './semantic-beats.mjs';
import {SEGURIDAD_THEME as THEME} from './theme.mjs';
import {CHAPTER02} from './chapter02-data.mjs';
const t=(s,k,l)=>{const v=s.labels[k]?.[l];if(typeof v!=='string')throw Error(`MISSING_LABEL:${s.id}/${k}/${l}`);return v;};
function label(P,text,x,y,w,size=40,strong=false,align='center'){const lines=P.lines(text,w,size,strong?600:400);lines.forEach((v,i)=>P.text(v,x,y+i*size*1.16,size,strong?P.T.accentText:P.T.ink,strong?600:400,align,w));return lines.length*size*1.16;}
function card(P,text,x,y,w,h,size=37,strong=false){const n=P.lines(text,w-28,size,strong?600:400).length;P.rect(x,y,w,h,strong?P.T.accentSurface:P.T.background,strong?P.T.accent:P.T.rule,4,2);label(P,text,x+w/2,y+(h-n*size*1.16)/2,w-28,size,strong);}
function arrow(P,points,q=1,color=P.T.accent,width=4){if(q<=0)return;P.path(points,color,width,q);if(q>.995){const a=points.at(-2),b=points.at(-1),r=Math.atan2(b[1]-a[1],b[0]-a[0]);P.path([[b[0]-14*Math.cos(r-.5),b[1]-14*Math.sin(r-.5)],b,[b[0]-14*Math.cos(r+.5),b[1]-14*Math.sin(r+.5)]],color,width);}}
function cross(P,x,y,r=12){P.path([[x-r,y-r],[x+r,y+r]],P.T.accentText,4);P.path([[x-r,y+r],[x+r,y-r]],P.T.accentText,4);}
function observation(P,S,s,l,v){const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?43:38;
 if(on[0]){card(P,t(s,'request',l),32,287,270,112,fs,true);arrow(P,[[316,343],[416,343]],q[0]);P.circle(500,343,72,P.T.background,P.T.rule,3);label(P,t(s,'model',l),500,321,150,28,true);arrow(P,[[584,343],[684,343]],q[0]);card(P,t(s,'refusal',l),699,287,270,112,fs,true);}
 if(on[1]){P.path([[34,472],[34,528],[968,528],[968,472]],P.T.rule,3,q[1]);label(P,t(s,'one',l),500,544,900,v?45:40,true);}
 if(on[2]){P.path([[144,657],[856,657]],P.T.accent,4,q[2]);label(P,t(s,'notall',l),500,681,900,v?43:37,false);}
 return {tested:on[0]?['original']:[],result:on[0]?'refused':'unobserved',scope:on[1]?'one_input':'unbound',claim:on[2]?'one_observation_only':'unspecified'};}
function variants(P,S,s,l,v){const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?42:37,keys=['wording','language','format'];
 if(on[0]){card(P,t(s,'objective',l),335,52,330,100,fs,true);for(let i=0;i<3;i++){const x=80+i*310;arrow(P,[[500,164],[500,185],[x+135,185],[x+135,210]],q[0]);card(P,t(s,keys[i],l),x,225,270,110,fs,false);}}
 if(on[1])for(let i=0;i<3;i++){const x=80+i*310;arrow(P,[[x+135,347],[x+135,390]],q[1],P.T.rule,3);card(P,t(s,'test',l),x,405,270,90,fs,true);P.circle(x+135,540,12,null,P.T.rule,3);}
 if(on[2]){P.path([[61,604],[939,604]],P.T.accent,4,q[2]);label(P,t(s,'family',l),500,633,930,v?46:40,true);}
 return {variants:on[0]?keys:[],untested:on[1]?keys:[],surface:on[2]?'family':'single'};}
function budget(P,S,s,l,v){const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),n=s.budget,fs=v?42:37,x0=107,step=157;
 if(on[0]){label(P,t(s,'available',l),500,42,900,fs,true);for(let i=0;i<n;i++)P.circle(x0+i*step,185,27,P.T.accentSurface,P.T.accent,2);}
 if(on[1]){label(P,t(s,'used',l),500,360,900,fs,true);for(let i=0;i<n;i++){const p=clamp(q[1]*3-i);P.circle(x0+i*step,185,27,p>=1?P.T.background:P.T.accentSurface,p>=1?P.T.rule:P.T.accent,2);P.circle(x0+i*step,475,27,p>=1?P.T.accentSurface:P.T.background,p>=1?P.T.accent:P.T.rule,2);}}
 if(on[0]){const used=on[1]?Math.min(3,Math.floor(q[1]*3)):0;P.rect(400,225,200,72,P.T.background);P.text(`${used} / ${n}`,500,250,v?62:58,P.T.accentText,600,'center',500);}
 if(on[2]){card(P,t(s,'spec',l),180,615,260,95,fs,true);arrow(P,[[455,662],[548,662]],q[2]);card(P,t(s,'n',l),563,615,270,95,fs,false);label(P,t(s,'unit',l),500,742,900,v?34:29,false);}
 return {available:on[0]?n:0,used:on[1]?3:0,spec:on[2]?'N=6':'missing'};}
/** Connect card edges, never their labels. The gap is in mechanism coordinates. */
export function cardEdgeSegment(a,b,halfWidth=125,halfHeight=48,gap=12){
 if(![...a,...b,halfWidth,halfHeight,gap].every(Number.isFinite)||halfWidth<=0||halfHeight<=0||gap<0)throw Error('INVALID_CARD_EDGE_GEOMETRY');
 const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
 if(!length)throw Error('COINCIDENT_CARD_CENTERS');
 const edge=Math.min(dx?halfWidth/Math.abs(dx):Infinity,dy?halfHeight/Math.abs(dy):Infinity),offset=edge+gap/length;
 if(offset>=.5)throw Error('OVERLAPPING_CARD_CONNECTOR');
 return [[a[0]+dx*offset,a[1]+dy*offset],[b[0]-dx*offset,b[1]-dy*offset]];
}
function feedback(P,S,s,l,v){const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?40:35,pts=[[500,115],[815,340],[500,565],[185,340]],keys=['input','model','answer','adapt'];
 if(on[0]){for(let i=0;i<4;i++)arrow(P,cardEdgeSegment(pts[i],pts[(i+1)%4]),q[0],i===3?P.T.accent:P.T.rule,3);for(let i=0;i<4;i++){const [x,y]=pts[i];card(P,t(s,keys[i],l),x-125,y-48,250,96,fs,i===3);}}
 if(on[1]){label(P,t(s,'budget',l),500,662,420,fs,true);P.path([[275,730],[725,730]],P.T.rule,8);P.path([[275,730],[lerp(725,275,q[1]),730]],P.T.accent,8);P.text(String(Math.max(0,6-Math.floor(q[1]*6))),760,700,46,P.T.accentText,600,'left',120);}
 if(on[2]){P.rect(136,274,728,132,P.T.background);label(P,t(s,'stop',l),500,293,700,v?48:42,true);cross(P,500,385,15);label(P,t(s,'warning',l),500,449,850,v?40:35,false);}
 return {feedback:on[0],remaining:on[1]?0:6,next:on[2]?'blocked_by_budget':'possible',claim:on[2]?'not_invulnerable':'unspecified'};}
function transfer(P,S,s,l,v){const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?41:36;
 if(on[0]){P.rect(20,102,440,330,null,P.T.rule,4,3);label(P,t(s,'source',l),240,24,430,fs,true);label(P,t(s,'gradients',l),240,132,390,fs,false);arrow(P,[[240,220],[240,267]],q[0]);if(!on[1])card(P,t(s,'optimize',l),55,285,370,110,fs,true);}
 if(on[2])P.rect(540,102,440,330,null,P.T.rule,4,3);
 if(on[1]){let x=55,y=285;if(on[2]){const z=q[2];x=lerp(55,575,Math.min(1,z*1.15));y=285;}card(P,t(s,'suffix',l),x,y,370,110,fs,true);}
 if(on[2]){label(P,t(s,'target',l),760,24,430,fs,true);label(P,t(s,'blackbox',l),760,132,390,fs,false);label(P,t(s,'same',l),500,545,900,v?43:38,true);P.path([[250,522],[750,522]],P.T.accent,4,q[2]);}
 if(on[3]){card(P,t(s,'test',l),590,650,320,92,fs,true);label(P,t(s,'warning',l),500,760,950,v?36:31,false);}
 return {access:on[0]?'model_gradients':'unspecified',suffix:on[1]?'selected':'candidate',target_input:on[2]?'same_suffix':'absent',target_result:on[3]?'requires_measurement':'unspecified'};}
function outcomes(P,S,s,l,v){const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=31,keys=['bypass','capability','proposal','execution'],details=['bypass_detail','capability_detail','proposal_detail','execution_detail'],x0=22,w=226,gap=20;
 // Portrait uses stable full-width rows rather than shrinking four desktop columns.
 if(v){
  for(let i=0;i<4;i++){
   const y=10+i*162;
   if(on[0]){card(P,t(s,keys[i],l),20,y+5,290,144,42,true);label(P,t(s,details[i],l),382,y+10,580,44,false,'left');}
   if(on[1]){arrow(P,[[324,y+123],[364,y+123]],q[1],P.T.rule,3);label(P,t(s,'evidence',l),382,y+102,580,40,true,'left');}
  }
  if(on[2]){P.path([[34,678],[966,678]],P.T.accent,4,q[2]);label(P,t(s,'warning',l),500,699,950,40,true);}
  return {outcomes:on[0]?keys:[],evidence:on[1]?'per_outcome':'missing',inference:on[2]?'forbidden':'implicit'};
 }
 if(on[0])for(let i=0;i<4;i++){const x=x0+i*(w+gap);card(P,t(s,keys[i],l),x,155,w,105,fs,true);label(P,t(s,details[i],l),x+w/2,292,w-8,fs,false);}
 if(on[1])for(let i=0;i<4;i++){const x=x0+i*(w+gap);arrow(P,[[x+w/2,398],[x+w/2,477]],q[1],P.T.rule,3);card(P,t(s,'evidence',l),x,495,w,95,fs,false);}
 if(on[2]){P.path([[34,665],[966,665]],P.T.accent,4,q[2]);label(P,t(s,'warning',l),500,694,950,v?38:33,true);}
 return {outcomes:on[0]?keys:[],evidence:on[1]?'per_outcome':'missing',inference:on[2]?'forbidden':'implicit'};}
function channels(P,S,s,l,v){const q=S.cues.map(x=>x.progress),on=S.cues.map(x=>x.visible),fs=v?41:36;
 if(on[0]){P.circle(142,395,108,P.T.background,P.T.rule,3);label(P,t(s,'model',l),142,350,195,fs,false);P.path([[258,395],[360,215],[955,215]],P.T.rule,3,q[0]);P.path([[258,395],[360,595],[955,595]],P.T.rule,3,q[0]);label(P,t(s,'text',l),410,148,210,fs,true);label(P,t(s,'action',l),410,528,210,fs,true);}
 if(on[1]){label(P,t(s,'content',l),720,53,520,fs,true);P.circle(lerp(390,588,q[1]),215,17,P.T.accentSurface,P.T.accent,3);P.path([[638,162],[638,268]],P.T.accentText,5);cross(P,638,215,16);label(P,t(s,'blocked',l),785,272,330,fs,true);}
 if(on[2]){label(P,t(s,'policy',l),720,435,520,fs,true);P.rect(lerp(390,588,q[2]),578,34,34,P.T.accentSurface,P.T.accent,4,3);P.path([[638,542],[638,648]],P.T.accentText,5);cross(P,638,595,16);label(P,t(s,'denied',l),785,650,330,fs,true);}
 if(on[3]){label(P,t(s,'no_text',l),770,335,410,v?37:32,false);label(P,t(s,'no_effect',l),770,716,410,v?37:32,false);label(P,t(s,'warning',l),500,766,930,v?35:30,true);}
 return {channels:on[0]?['text','action']:[],text:on[1]?'blocked':'pending',action:on[2]?'denied':'pending',record:on[3]?'text_blocked_action_denied':'incomplete'};}
const DRAWERS=[observation,variants,budget,feedback,transfer,outcomes,channels],CACHE=new Map();
function editorialLayout(P,scene,portrait,mode='split'){
 const width=portrait?1080:1920,height=portrait?1920:1080,left=portrait?58:(mode==='reverse'?1040:72),textWidth=portrait?964:808,top=portrait?158:154,titleSize=portrait?86:80,bodySize=portrait?52:50,bodyLH=1.18;
 const titleLines=scene.title.flatMap((line,index)=>P.lines(line,textWidth,titleSize,600,P.T.headlineFont).map(text=>({text,accent:index===scene.accentLine})));
 const bodyY=top+titleLines.length*titleSize*1.03+28;const lines=P.lines(scene.paragraphs[0],textWidth,bodySize),paragraphs=[{text:scene.paragraphs[0],lines,y:bodyY}],bodyBottom=bodyY+lines.length*bodySize*bodyLH;
 const sourceY=portrait?1810:920,mechanism=portrait?{x:55,y:Math.max(755,bodyBottom+52),w:970,h:0}:{x:mode==='reverse'?62:914,y:176,w:944,h:700};if(portrait)mechanism.h=1750-mechanism.y;mechanism.scale=Math.min(mechanism.w/1000,mechanism.h/800);
 if(bodyBottom>(portrait?1025:890))P.issues.push({type:'editorial-body-overflow',scene:scene.id,bottom:bodyBottom});if(mechanism.scale<.76)P.issues.push({type:'editorial-mechanism-too-small',scene:scene.id,scale:mechanism.scale});
 return {width,height,left,top,textWidth,titleSize,titleLines,titleSegments:null,banner:false,bodySize,bodyLH,paragraphs,bodyBottom,sourceY,mechanism,portrait,mode,metrics:{bodySize,bodyBottom,sourceGap:sourceY-bodyBottom,intendedEmbedBodyPixels:bodySize*(portrait?390/1080:1100/1920)}};
}
export function renderChapter02(canvas,locale,orientation,timeSeconds,{reducedMotion=false}={}){
 if(!['es','en'].includes(locale)||!['horizontal','vertical'].includes(orientation)||!Number.isFinite(timeSeconds))throw Error('INVALID_RENDER_REQUEST');
 const v=orientation==='vertical',time=clamp(timeSeconds,0,CHAPTER02.duration),index=Math.max(0,CHAPTER02.scenes.findLastIndex(s=>time>=s.start)),spec=CHAPTER02.scenes[index],local=Math.min(spec.duration,time-spec.start),state=beatState(spec,locale,local,reducedMotion),W=v?1080:1920,H=v?1920:1080;if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
 const c=canvas.getContext('2d',{alpha:false});c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=THEME.background;c.fillRect(0,0,W,H);const issues=[],P=new Paint(c,THEME,issues,locale,{}),scene={id:spec.id,title:[spec.title[locale]],accentLine:-1,paragraphs:[spec.text[locale]],source:spec.source?.[locale]??null},key=`${CHAPTER02.version}/${locale}/${orientation}/${index}`;
 if(!CACHE.has(key)){const L=editorialLayout(P,scene,v,spec.layout);CACHE.set(key,{L,issues:[...issues]});}else issues.push(...CACHE.get(key).issues);const L=CACHE.get(key).L,header={brand:'5sigmas',series:CHAPTER02.series[locale],scenes:CHAPTER02.scenes.map(s=>({duration:s.duration,kicker:s.kicker?.[locale]??CHAPTER02.title[locale]}))};drawHeader(P,header,index,time,CHAPTER02.duration,L);drawText(P,scene,L,1,state);c.save();const M=L.mechanism;c.translate(M.x,M.y);c.scale(M.scale,M.scale);const mechanismState=DRAWERS[index](P,state,spec,locale,v);c.restore();return {jobId:`seguridad-ia-02-${locale}-${orientation}`,scene:spec.id,sceneIndex:index,timeSeconds:time,duration:CHAPTER02.duration,bodySize:L.bodySize,mechanismScale:M.scale,issues,family:spec.family,layout:L,semanticTimeline:{version:CHAPTER02.version,events:expectedBeatEvents(spec,spec.start)},textCue:{activeId:state.activeId,cues:state.cues},mechanismState,reducedMotion};
}