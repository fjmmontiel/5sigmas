const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const FUNDAMENTOS_LAYOUT_CONTRACT=Object.freeze({bodyMin:46,bodyTarget:52,portraitBodyMin:46,embedWidthDesktop:1100,embedWidthMobile:390});
function font(ctx,size,weight=400,family='Arial'){ctx.font=`${weight} ${size}px "${family}", ${family==='Georgia'?'Georgia, serif':'Arial, sans-serif'}`}
function measure(ctx,text,size,weight=400,family='Arial'){font(ctx,size,weight,family);return ctx.measureText(String(text)).width}
function lines(ctx,text,maxWidth,size,weight=400,family='Arial'){
  const out=[];let line='';for(const word of String(text).split(/\s+/).filter(Boolean)){const next=line?`${line} ${word}`:word;if(line&&measure(ctx,next,size,weight,family)>maxWidth){out.push(line);line=word}else line=next}if(line)out.push(line);return out;
}
export function computeFundamentosLayout(ctx,{title,body,orientation}){
  const portrait=orientation==='vertical',W=portrait?1080:1920,H=portrait?1920:1080;
  const margin=portrait?60:72,top=portrait?176:166,textWidth=portrait?960:760;
  const mechanism=portrait?{x:60,y:900,w:960,h:850}:{x:930,y:170,w:918,h:760};
  let best=null;
  for(let titleSize=portrait?78:82;titleSize>=60;titleSize-=2){for(let bodySize=portrait?54:58;bodySize>=46;bodySize--){
    const tl=lines(ctx,title,textWidth,titleSize,600,'Georgia');const bl=lines(ctx,body,textWidth,bodySize,400,'Arial');
    const bodyY=top+tl.length*titleSize*1.08+34;const bodyBottom=bodyY+bl.length*bodySize*1.25;
    const limit=portrait?820:930;if(bodyBottom<=limit){const score=bodySize*8-Math.abs(bodyBottom-(portrait?700:770))*.05+titleSize*.05;if(!best||score>best.score)best={score,titleSize,bodySize,titleLines:tl,bodyLines:bl,bodyY,bodyBottom};}
  }}
  if(!best){const titleSize=60,bodySize=46,tl=lines(ctx,title,textWidth,titleSize,600,'Georgia'),bl=lines(ctx,body,textWidth,bodySize);const bodyY=top+tl.length*titleSize*1.08+34;best={score:0,titleSize,bodySize,titleLines:tl,bodyLines:bl,bodyY,bodyBottom:bodyY+bl.length*bodySize*1.25};}
  const scale=Math.min(mechanism.w/1000,mechanism.h/800);
  return {W,H,portrait,margin,top,textWidth,mechanism:{...mechanism,scale},...best,
    metrics:{bodySize:best.bodySize,bodyBottom:best.bodyBottom,mechanismScale:scale,intendedEmbedBodyPixels:best.bodySize*(portrait?390/1080:1100/1920),permanentLowerLeftGap:Math.max(0,(portrait?820:930)-best.bodyBottom)}};
}
export function drawFundamentosEditorial(ctx,T,layout,{series,title,body,visibleBody=body,sceneIndex,sceneCount,timeSeconds,totalSeconds,family}){
  const {W,H,margin,top,textWidth,titleSize,bodySize,titleLines,bodyY,portrait}=layout;
  const visibleBodyLines=lines(ctx,visibleBody,textWidth,bodySize,400,'Arial');
  ctx.fillStyle=T.background;ctx.fillRect(0,0,W,H);ctx.textBaseline='top';ctx.textAlign='left';
  font(ctx,36,650,'Arial');ctx.fillStyle=T.ink;ctx.fillText('5sigmas',margin,48);
  ctx.strokeStyle=T.rule;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(margin+178,46);ctx.lineTo(margin+178,90);ctx.stroke();
  font(ctx,portrait?17:19,500,'Arial');ctx.fillStyle=T.muted;ctx.fillText(series,margin+208,57);
  font(ctx,18,500,'Arial');ctx.textAlign='right';ctx.fillText(`${String(sceneIndex+1).padStart(2,'0')} / ${String(sceneCount).padStart(2,'0')}`,W-margin,58);ctx.textAlign='left';
  ctx.strokeStyle=T.rule;ctx.beginPath();ctx.moveTo(margin,117);ctx.lineTo(W-margin,117);ctx.stroke();
  font(ctx,titleSize,600,'Georgia');ctx.fillStyle=T.ink;titleLines.forEach((line,i)=>ctx.fillText(line,margin,top+i*titleSize*1.08));
  font(ctx,bodySize,400,'Arial');visibleBodyLines.forEach((line,i)=>ctx.fillText(line,margin,bodyY+i*bodySize*1.25));
  font(ctx,19,450,'Arial');ctx.fillStyle=T.muted;ctx.fillText(family,margin,H-55);
  const gap=8,stepW=(W-2*margin-gap*(sceneCount-1))/sceneCount;for(let i=0;i<sceneCount;i++){const x=margin+i*(stepW+gap);ctx.fillStyle=T.rule;ctx.fillRect(x,H-20,stepW,3);const q=clamp((timeSeconds-i*(totalSeconds/sceneCount))/(totalSeconds/sceneCount));if(q>0){ctx.fillStyle=T.accent;ctx.fillRect(x,H-20,stepW*q,3);}}
}
export function validateFundamentosLayout(layout,sceneId){
  const issues=[];if(layout.bodySize<46)issues.push({type:'body-copy-too-small',scene:sceneId,size:layout.bodySize});
  if(layout.bodyBottom>(layout.portrait?820:930))issues.push({type:'body-overflow',scene:sceneId,bottom:layout.bodyBottom});
  if(layout.mechanism.scale<.72)issues.push({type:'mechanism-too-small',scene:sceneId,scale:layout.mechanism.scale});
  if(layout.metrics.intendedEmbedBodyPixels<18)issues.push({type:'embed-body-too-small',scene:sceneId,pixels:layout.metrics.intendedEmbedBodyPixels});
  return issues;
}
