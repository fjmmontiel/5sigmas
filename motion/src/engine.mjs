import {cueState,motionValue} from './cues.mjs';
import {validateSpec,sceneAt,totalDuration} from './schema.mjs';
import {resolveTheme} from './theme.mjs';
import {clamp,phase,Paint} from './render/paint.mjs';
import {sceneLayout,drawHeader,drawText} from './render/layout.mjs';
import {intro,pipeline,steps,duration,allocation} from './render/mechanisms/common.mjs';
import {candidates,syncedCandidates,tree,evidenceComparison} from './render/mechanisms/reasoning.mjs';

const cache=new WeakMap();
const layoutCache=new WeakMap();
export const REGISTRY=Object.freeze({intro,pipeline,steps,candidates,tree,duration,allocation});

/** Render at any time to horizontal OR vertically recomposed artwork. No pixel stretching. */
export function renderFrame(canvas,spec,time,baseTheme,{portrait=false,reducedMotion=false,allText=false,validate=true}={}){
  if(validate&&!cache.has(spec)){validateSpec(spec);cache.set(spec,true);}
  const theme=resolveTheme(baseTheme,spec);
  const total=totalDuration(spec);time=clamp(time,0,total-0.000001);
  const item=sceneAt(spec,time),s=item.scene;
  const ctx=canvas.getContext('2d',{alpha:false}),issues=[];
  const W=portrait?1080:1920,H=portrait?1920:1080;
  if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=theme.background;ctx.fillRect(0,0,W,H);
  const P=new Paint(ctx,theme,issues,spec.locale,spec.labels||{});
  const key=JSON.stringify([portrait,theme.bodyFont,theme.headlineFont]);
  let layouts=layoutCache.get(s);if(!layouts){layouts=new Map();layoutCache.set(s,layouts);}
  if(!layouts.has(key)){const es=[];const LP=new Paint(ctx,theme,es,spec.locale,spec.labels||{});layouts.set(key,{layout:sceneLayout(LP,s,portrait),issues:es});}
  const saved=layouts.get(key),L=saved.layout;issues.push(...saved.issues);
  drawHeader(P,spec,item.index,time,total,L);
  const local=reducedMotion?s.duration:time-item.start;
  const attention=cueState(s,local,{allText,reducedMotion});
  const alpha=reducedMotion?1:phase(local,0,theme.motion.enter)*(1-phase(local,s.duration-theme.motion.exit,theme.motion.exit));
  drawText(P,s,L,alpha,attention);
  ctx.save();ctx.globalAlpha*=alpha;
  const m=L.mechanism;ctx.translate(m.x+(m.w-1000*m.scale)/2,m.y);ctx.scale(m.scale,m.scale);
  const evidence=s.data.evidenceComparison?motionValue(s,local,'evidence.comparison'):0;
  ctx.save();ctx.globalAlpha*=1-phase(evidence,0,.18);
  (s.cues&&s.type==='candidates'?syncedCandidates:REGISTRY[s.type])(P,s,local);ctx.restore();
  if(evidence>0)evidenceComparison(P,s,local,evidence);
  ctx.restore();
  return {scene:s.id,index:item.index,time:local,layout:L,issues,attention,visualIdentity:spec.visualIdentity};
}

export function validateLayouts(canvas,spec,theme,portrait=false){
  let time=0;const results=[];
  for(const s of spec.scenes){for(const q of [.1,.35,.7,.94]){const r=renderFrame(canvas,spec,time+s.duration*q,theme,{portrait});results.push({scene:s.id,fraction:q,issues:r.issues,bodyBottom:r.layout.bodyBottom,mechanismScale:r.layout.mechanism.scale});}time+=s.duration;}
  return results;
}
