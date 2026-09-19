import {clamp,mixHex,number} from './paint.mjs';
export const EDITORIAL_LAYOUT_CONTRACT=Object.freeze({horizontalTextWidth:760,horizontalBodyMin:46,horizontalBodyTarget:52,horizontalBodyMax:60,portraitBodyMin:46,portraitBodyTarget:50,horizontalSourceGapMax:64,horizontalBodyBottomTarget:865,animationFamilyRepeatCap:2});

function compose(P,s,w,y,titleSize,bodySize,lh,gap){
 const titleLines=s.title.flatMap((line,index)=>P.lines(line,w,titleSize,600,P.T.headlineFont).map(text=>({text,accent:index===s.accentLine})));
 let bodyY=y+titleLines.length*titleSize*1.11+30;
 const paragraphs=s.paragraphs.map(text=>{const lines=P.lines(text,w,bodySize),p={text,lines,y:bodyY};bodyY+=lines.length*bodySize*lh+gap;return p;});
 return {titleLines,paragraphs,bodyBottom:bodyY-gap};
}
/** Fit the real copy into a stable measured box, not one arbitrary small font. */
export function sceneLayout(P,s,portrait,design={}){
 const width=portrait?1080:1920,height=portrait?1920:1080,mode=portrait?'portrait':design.layout||'split';
 let left=portrait?58:mode==='reverse'?1050:72,textWidth=portrait?964:760; const top=163;
 const limit=portrait?1080:930,min=46,max=portrait?56:60,bodyLH=1.22,gap=20;
 const options=[];
 for(let titleSize=84;titleSize>=60;titleSize-=2){for(let bodySize=max;bodySize>=min;bodySize--){
  if(titleSize<bodySize*1.12)continue;const built=compose(P,s,textWidth,top,titleSize,bodySize,bodyLH,gap);
  if(built.bodyBottom<=limit)options.push({...built,titleSize,bodySize,score:bodySize*7-Math.abs(built.bodyBottom-(portrait?1010:865))*.045+(titleSize-70)*.08});
 }}
 options.sort((a,b)=>b.score-a.score);let best=options[0],banner=false;
 // Dense explanations receive a genuinely different composition, never a smaller body.
 if(!best&&!portrait){
  textWidth=940;left=mode==='reverse'?908:72;
  const wholeTitle=s.title.join(' '),font=68,segments=[];let tx=72;
  if(P.measure(wholeTitle,font,600,P.T.headlineFont)<=1776){
   s.title.forEach((text,i)=>{segments.push({text,x:tx,accent:i===s.accentLine});tx+=P.measure(text+' ',font,600,P.T.headlineFont);});
   for(let size=54;size>=46;size--){let y=270;const ps=s.paragraphs.map(text=>{const lines=P.lines(text,textWidth,size),p={text,lines,y};y+=lines.length*size*bodyLH+gap;return p;});
    if(y-gap<=limit){best={titleLines:[],titleSegments:segments,titleSize:font,bodySize:size,paragraphs:ps,bodyBottom:y-gap};banner=true;break;}
   }
  }
 }

 if(!best){banner=false;best={...compose(P,s,textWidth,top,60,min,bodyLH,gap),titleSize:60,bodySize:min};P.issues.push({type:'copy-needs-recomposition',scene:s.id,bottom:best.bodyBottom});}
 const {titleSize,bodySize,paragraphs,bodyBottom,titleLines,titleSegments}=best;
 const mechanism=portrait?{x:55,y:Math.max(720,bodyBottom+45),w:970,h:0}:banner?{x:mode==='reverse'?72:1088,y:270,w:760,h:665}:{x:mode==='reverse'?65:925,y:176,w:925,h:757};
 if(portrait)mechanism.h=1780-mechanism.y;
 mechanism.scale=Math.min(mechanism.w/1000,mechanism.h/800);
 const sourceY=portrait?1818:Math.min(956,bodyBottom+38);
 const permanentLowerGap=Math.max(0,915-bodyBottom);
 if(mechanism.scale<.70)P.issues.push({type:'mechanism-too-small',scale:mechanism.scale,scene:s.id});
 if(bodyBottom>limit)P.issues.push({type:'body-overflow',bottom:bodyBottom,scene:s.id});
 if(!portrait&&bodySize<46)P.issues.push({type:'body-copy-too-small',size:bodySize,scene:s.id});
 if(!portrait&&permanentLowerGap>260&&bodySize<52)P.issues.push({type:'underfilled-editorial-column',gap:permanentLowerGap,size:bodySize,scene:s.id});
 if(sourceY-bodyBottom>(portrait?950:64)&&!portrait)P.issues.push({type:'left-dead-space',gap:sourceY-bodyBottom,scene:s.id});
 const metrics={bodySize,bodyBottom,bodyRegionHeight:bodyBottom-paragraphs[0]?.y,sourceGap:sourceY-bodyBottom,permanentLowerGap,intendedEmbedBodyPixels:bodySize*(portrait?390/1080:1100/1920)};
 return {width,height,left,top,textWidth,titleSize,titleLines,titleSegments,banner,bodySize,bodyLH,paragraphs,bodyBottom,sourceY,mechanism,portrait,mode,metrics};
}
export function drawHeader(P,spec,index,time,total,L){const T=P.T,margin=L.portrait?58:72,w=L.width;
 P.text(spec.brand||'5sigmas',margin,49,36,T.ink,650);P.path([[margin+181,46],[margin+181,90]],T.rule,1.5);P.text(spec.series,margin+211,57,L.portrait?17:19,T.muted,500,'left',L.portrait?530:720);
 P.text(`${String(index+1).padStart(2,'0')} / ${String(spec.scenes.length).padStart(2,'0')}`,w-margin,58,18,T.muted,500,'right',150);P.path([[margin,117],[w-margin,117]],T.rule,1.5);
 P.text(spec.scenes[index].kicker,margin,L.height-55,19,T.muted,450,'left',L.portrait?830:1590);
 const gap=8,stepW=(w-2*margin-gap*(spec.scenes.length-1))/spec.scenes.length;let start=0;
 for(let i=0;i<spec.scenes.length;i++){const d=spec.scenes[i].duration,q=clamp((time-start)/d);P.rect(margin+i*(stepW+gap),L.height-20,stepW,3,T.rule);if(q>0)P.rect(margin+i*(stepW+gap),L.height-20,stepW*q,3,T.accent);start+=d;}
}
export function drawText(P,s,L,alpha,state=null){const c=P.c,T=P.T;c.save();c.globalAlpha*=alpha;
 if(L.banner&&L.titleSegments){for(const line of L.titleSegments)P.text(line.text,line.x,L.top,L.titleSize,line.accent?T.accentText:T.ink,600,'left',1776,T.headlineFont);}
 L.titleLines.forEach((line,i)=>P.text(line.text,L.left,L.top+i*L.titleSize*1.11,L.titleSize,line.accent?T.accentText:T.ink,600,'left',L.textWidth,T.headlineFont));
 for(const [pi,p] of L.paragraphs.entries()){let lineStart=0;for(const [i,line] of p.lines.entries()){
  const y=p.y+i*L.bodySize*L.bodyLH;if(!state){P.text(line,L.left,y,L.bodySize,T.ink,400,'left',L.textWidth);continue;}
  lineStart=p.text.indexOf(line,lineStart);const lineEnd=lineStart+line.length;
  for(const q of state.cues){if(q.paragraph!==pi||!q.visible)continue;const from=Math.max(lineStart,q.range.start),to=Math.min(lineEnd,q.range.end);if(from>=to)continue;
   const prefix=p.text.slice(lineStart,from),run=p.text.slice(from,to),x=L.left+P.measure(prefix,L.bodySize),w=P.measure(run,L.bodySize);c.save();c.globalAlpha*=q.alpha;
   if(q.emphasis>0){c.save();c.globalAlpha*=q.emphasis;P.rect(x-3,y-3,w+6,L.bodySize*1.19,T.accentSurface,null,3);if(from===q.range.start)P.rect(L.left-16,y,4,L.bodySize*1.02,T.accent,null,2);c.restore();}
   P.text(run,x,y,L.bodySize,mixHex(T.ink,T.accentText,q.emphasis),400,'left',L.textWidth);c.restore();
  }lineStart=lineEnd;
 }}
 if(s.source){const y=L.sourceY;P.path([[L.left,y-10],[L.left+Math.min(L.textWidth,650),y-10]],T.rule,1);const lines=P.lines(s.source,L.textWidth,L.portrait?22:23);lines.forEach((line,i)=>P.text(line,L.left,y+i*28,L.portrait?22:23,T.muted,400,'left',L.textWidth));if(y+lines.length*28>L.height-64)P.issues.push({type:'source-footer-collision',scene:s.id});}
 c.restore();
}
