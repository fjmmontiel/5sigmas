import { Paint, clamp } from '../render/paint.mjs';
import { sceneLayout, drawHeader, drawText } from '../render/layout.mjs';
import { seguridadFrameState, seguridadRenderMatrix, indexSeguridadRegister } from './engine.mjs';
import { seguridadTextState } from './timeline.mjs';

export const SEGURIDAD_THEME = Object.freeze({
  background: '#FFFFFF',
  ink: '#191817',
  muted: '#66615D',
  rule: '#DDD8D3',
  bodyFont: 'Arial',
  headlineFont: 'Georgia',
  accent: '#B44B31',
  accentText: '#7F3525',
  accentSurface: '#F7ECE8'
});

const pretty = value => String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

function centerOf(ref, plan) {
  if (Number.isInteger(ref)) {
    const node = plan.geometry.nodes?.[ref];
    return node ? [node.x, node.y] : null;
  }
  if (typeof ref === 'string') {
    const zone = plan.geometry.zones?.find(item => item.role === ref);
    if (zone) return [zone.x + zone.w / 2, zone.y + zone.h / 2];
  }
  return null;
}

function progressFor(plan, index) {
  const cues = plan.cueProgress;
  if (!cues.length) return 1;
  return cues[Math.min(index, cues.length - 1)].progress;
}

function drawArrow(P, from, to, progress, role='flow') {
  if (!from || !to || progress <= 0) return;
  const q = clamp(progress);
  const x = from[0] + (to[0] - from[0]) * q;
  const y = from[1] + (to[1] - from[1]) * q;
  P.path([from, [x, y]], role === 'revoke' || role === 'external_control' ? P.T.accentText : P.T.muted, role === 'revoke' ? 5 : 3);
  if (q < .98) return;
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const r = 14;
  P.path([[to[0] - Math.cos(a-.55)*r,to[1]-Math.sin(a-.55)*r],to,[to[0]-Math.cos(a+.55)*r,to[1]-Math.sin(a+.55)*r]], role === 'revoke' ? P.T.accentText : P.T.muted, 3);
}

function drawZone(P, zone, q) {
  if (q <= 0) return;
  const c=P.c;c.save();c.globalAlpha*=.25+.75*q;
  const strong = ['cut','revocation','top_k'].includes(zone.role);
  P.rect(zone.x, zone.y, zone.w, zone.h, strong ? P.T.accentSurface : '#FBFAF9', strong ? P.T.accent : P.T.rule, 18, strong ? 3 : 2);
  if (zone.label) {
    const label=pretty(zone.label);
    if(zone.w<160 && zone.h>220){
      P.text(label,zone.x+zone.w/2,Math.max(48,zone.y-38),21,strong?P.T.accentText:P.T.muted,650,'center',300);
    } else if(zone.w<160){
      P.text(label,Math.min(960,zone.x+zone.w+12),zone.y+Math.max(0,(zone.h-24)/2),23,strong?P.T.accentText:P.T.muted,650,'left',300);
    } else {
      const size=zone.w<240?22:27;
      P.text(label,zone.x+15,zone.y+Math.max(12,(zone.h-size)/2),size,strong?P.T.accentText:P.T.muted,650,'left',Math.max(80,zone.w-30));
    }
  }
  c.restore();
}

function drawNode(P, node, q, {selected=false}={}) {
  if (q <= 0) return;
  const c=P.c;c.save();c.globalAlpha*=.2+.8*q;
  const strong=selected || ['effect','decision','authorization_result','release_state','terminal','high_privilege'].includes(node.role);
  const radius=selected?32:strong?34:28;
  P.circle(node.x,node.y,radius,strong?P.T.accentSurface:'#FFFFFF',strong?P.T.accentText:P.T.accent,strong?4:3);
  if(selected) P.circle(node.x,node.y,7,P.T.accentText,null,0);
  const label=node.label || node.role;
  if(label) P.text(pretty(label),node.x,node.y+44,23,strong?P.T.accentText:P.T.muted,strong?650:500,'center',320);
  c.restore();
}

function drawAxes(P, plan) {
  const axes=plan.geometry.axes;
  if(!axes) return;
  const q=Math.max(0,...plan.cueProgress.map(item=>item.progress));
  if(q<=0)return;
  const c=P.c;c.save();c.globalAlpha*=.35+.65*q;
  if(axes.x) P.text(pretty(axes.x),500,690,22,P.T.muted,650,'center',520);
  if(axes.y) P.text(pretty(axes.y),160,105,22,P.T.muted,650,'center',360);
  c.restore();
}

function drawMechanism(P, plan) {
  const c=P.c;
  c.save();
  for (const [i,zone] of (plan.geometry.zones ?? []).entries()) drawZone(P,zone,progressFor(plan,i));
  for (const [i,path] of (plan.geometry.paths ?? []).entries()) P.path(path,P.T.muted,3,progressFor(plan,i));
  drawAxes(P,plan);
  for (const [i,edge] of (plan.geometry.edges ?? []).entries()) drawArrow(P,centerOf(edge.from,plan),centerOf(edge.to,plan),progressFor(plan,i),edge.role);
  const selected=new Set(plan.geometry.selected ?? []);
  for (const [i,node] of (plan.geometry.nodes ?? []).entries()) drawNode(P,node,progressFor(plan,i),{selected:selected.has(i)});
  c.restore();
}

function renderSpecForChapter(spec, register, frame) {
  const chapter=spec.chapters.find(item=>item.chapter===frame.job.chapter);
  const concepts=indexSeguridadRegister(register);
  return {
    brand:'5sigmas',
    series:frame.job.locale==='es'?'Seguridad en IA':'AI Security',
    locale:frame.job.locale,
    scenes:chapter.scenes.map((scene,index)=>({
      id:scene.concept_id,
      duration:scene.end-scene.start,
      kicker:`${String(index+1).padStart(2,'0')} · ${concepts.get(scene.concept_id).perceptual_family}`
    }))
  };
}

export function renderSeguridadFrame(canvas, spec, register, jobId, timeSeconds, { reducedMotion=false }={}) {
  const frame=seguridadFrameState(spec,register,jobId,timeSeconds,{reducedMotion});
  const portrait=frame.job.orientation==='vertical';
  const W=frame.job.width,H=frame.job.height;
  if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=SEGURIDAD_THEME.background;ctx.fillRect(0,0,W,H);
  const issues=[];const P=new Paint(ctx,SEGURIDAD_THEME,issues,frame.job.locale,{});
  const scene={id:frame.scene.conceptId,title:[frame.title],accentLine:-1,paragraphs:[frame.scene.text],source:null};
  const layout=sceneLayout(P,scene,portrait,{layout:'split'});
  const headerSpec=renderSpecForChapter(spec,register,frame);
  const textState=seguridadTextState(frame.scene.text,frame.scene.conceptId,frame.localSeconds,frame.scene.durationSeconds,{reducedMotion});
  drawHeader(P,headerSpec,frame.sceneIndex,frame.timeSeconds,60,layout);
  drawText(P,scene,layout,1,textState);
  ctx.save();const m=layout.mechanism;ctx.translate(m.x+(m.w-1000*m.scale)/2,m.y);ctx.scale(m.scale,m.scale);drawMechanism(P,frame.scene.mechanism);ctx.restore();
  return Object.freeze({
    jobId:frame.job.id,
    scene:frame.scene.conceptId,
    sceneIndex:frame.sceneIndex,
    timeSeconds:frame.timeSeconds,
    localSeconds:frame.localSeconds,
    mechanismLocalSeconds:frame.mechanismLocalSeconds,
    bodySize:layout.bodySize,
    mechanismScale:layout.mechanism.scale,
    metrics:layout.metrics,
    issues:Object.freeze(issues),
    family:frame.scene.perceptualFamily,
    topology:frame.scene.topology,
    semanticTimeline:frame.scene.semanticTimeline,
    textCue:Object.freeze({activeId:textState.activeId,status:textState.cues[0].status,visible:textState.cues[0].visible}),
    semanticAnnotations:Object.freeze({
      axes:Boolean(frame.scene.mechanism.geometry.axes),
      selectedCount:(frame.scene.mechanism.geometry.selected ?? []).length
    }),
    reducedMotion
  });
}

export function validateSeguridadLayouts(canvas,spec,register) {
  const rows=[];
  for(const job of seguridadRenderMatrix(spec,register)) {
    for(let scene=0;scene<5;scene+=1) {
      for(const fraction of [.08,.45,.92]) {
        const time=scene*12+fraction*12;
        rows.push(renderSeguridadFrame(canvas,spec,register,job.id,time));
      }
    }
  }
  return rows;
}
