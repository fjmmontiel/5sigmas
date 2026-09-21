import { Paint, clamp } from '../render/paint.mjs';
import { sceneLayout, drawHeader, drawText } from '../render/layout.mjs';
import { seguridadFrameState, seguridadRenderMatrix, indexSeguridadRegister } from './engine.mjs';
import { seguridadTextState } from './timeline.mjs';
import { seguridadChoreographyProfile, seguridadElementProgress } from './choreography.mjs';

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

export const SEGURIDAD_MECHANISM_TEXT_CONTRACT = Object.freeze({
  horizontalNodeLabelPx: 34,
  verticalNodeLabelPx: 38,
  horizontalZoneLabelPx: 32,
  verticalZoneLabelPx: 36,
  horizontalAxisLabelPx: 32,
  verticalAxisLabelPx: 36,
  minimumHorizontalEmbedPx: 16,
  minimumVerticalEmbedPx: 12
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

function progressFor(plan, kind, index, total=1) {
  return seguridadElementProgress(plan, kind, index, total);
}

function mechanismLabelSize(plan, kind) {
  const vertical = plan.orientation === 'vertical';
  if (kind === 'node') return vertical ? SEGURIDAD_MECHANISM_TEXT_CONTRACT.verticalNodeLabelPx : SEGURIDAD_MECHANISM_TEXT_CONTRACT.horizontalNodeLabelPx;
  if (kind === 'axis') return vertical ? SEGURIDAD_MECHANISM_TEXT_CONTRACT.verticalAxisLabelPx : SEGURIDAD_MECHANISM_TEXT_CONTRACT.horizontalAxisLabelPx;
  return vertical ? SEGURIDAD_MECHANISM_TEXT_CONTRACT.verticalZoneLabelPx : SEGURIDAD_MECHANISM_TEXT_CONTRACT.horizontalZoneLabelPx;
}

function drawArrow(P, from, to, progress, role='flow') {
  if (!from || !to || progress <= 0) return;
  const q = clamp(progress);
  const x = from[0] + (to[0] - from[0]) * q;
  const y = from[1] + (to[1] - from[1]) * q;
  const strong = role === 'revoke' || role === 'external_control';
  P.path([from, [x, y]], strong ? P.T.accentText : P.T.muted, role === 'revoke' ? 6 : 4);
  if (q < .98) return;
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const r = 18;
  P.path([[to[0] - Math.cos(a-.55)*r,to[1]-Math.sin(a-.55)*r],to,[to[0]-Math.cos(a+.55)*r,to[1]-Math.sin(a+.55)*r]], strong ? P.T.accentText : P.T.muted, 4);
}

function drawZone(P, zone, q, plan) {
  if (q <= 0) return;
  const c=P.c;c.save();c.globalAlpha*=.25+.75*q;
  const strong = ['cut','revocation','top_k'].includes(zone.role);
  P.rect(zone.x, zone.y, zone.w, zone.h, strong ? P.T.accentSurface : '#FBFAF9', strong ? P.T.accent : P.T.rule, 18, strong ? 4 : 2.5);
  if (zone.label) {
    const label=pretty(zone.label);
    const base=mechanismLabelSize(plan,'zone');
    if(zone.w<220 && zone.h>220){
      P.text(label,zone.x+zone.w/2,Math.max(48,zone.y-base-16),base,strong?P.T.accentText:P.T.muted,650,'center',430);
    } else if(zone.w<160){
      P.text(label,Math.min(955,zone.x+zone.w+14),zone.y+Math.max(0,(zone.h-base)/2),base,strong?P.T.accentText:P.T.muted,650,'left',390);
    } else {
      const size=zone.w<240?Math.max(30,base-2):base;
      P.text(label,zone.x+16,zone.y+Math.max(12,(zone.h-size)/2),size,strong?P.T.accentText:P.T.muted,650,'left',Math.max(110,zone.w-32));
    }
  }
  c.restore();
}

function drawNode(P, node, q, plan, {selected=false}={}) {
  if (q <= 0) return;
  const c=P.c;c.save();c.globalAlpha*=.2+.8*q;
  const strong=selected || ['effect','decision','authorization_result','release_state','terminal','high_privilege'].includes(node.role);
  const radius=selected?40:strong?42:36;
  P.circle(node.x,node.y,radius,strong?P.T.accentSurface:'#FFFFFF',strong?P.T.accentText:P.T.accent,strong?5:4);
  if(selected) P.circle(node.x,node.y,8,P.T.accentText,null,0);
  const label=node.label || node.role;
  if(label) {
    const size=mechanismLabelSize(plan,'node');
    P.text(pretty(label),node.x,node.y+52,size,strong?P.T.accentText:P.T.muted,strong?650:500,'center',420);
  }
  c.restore();
}

function drawAxes(P, plan) {
  const axes=plan.geometry.axes;
  if(!axes) return;
  const q=progressFor(plan,'axis',0,1);
  if(q<=0)return;
  const c=P.c;c.save();c.globalAlpha*=.35+.65*q;
  const size=mechanismLabelSize(plan,'axis');
  if(axes.x) P.text(pretty(axes.x),500,690,size,P.T.muted,650,'center',620);
  if(axes.y) P.text(pretty(axes.y),160,105,size,P.T.muted,650,'center',460);
  c.restore();
}

function drawMechanism(P, plan) {
  const c=P.c;
  c.save();
  const zones=plan.geometry.zones ?? [];
  const paths=plan.geometry.paths ?? [];
  const edges=plan.geometry.edges ?? [];
  const nodes=plan.geometry.nodes ?? [];
  for (const [i,zone] of zones.entries()) drawZone(P,zone,progressFor(plan,'zone',i,zones.length),plan);
  for (const [i,path] of paths.entries()) P.path(path,P.T.muted,4,progressFor(plan,'path',i,paths.length));
  drawAxes(P,plan);
  for (const [i,edge] of edges.entries()) drawArrow(P,centerOf(edge.from,plan),centerOf(edge.to,plan),progressFor(plan,'edge',i,edges.length),edge.role);
  const selected=new Set(plan.geometry.selected ?? []);
  for (const [i,node] of nodes.entries()) drawNode(P,node,progressFor(plan,'node',i,nodes.length),plan,{selected:selected.has(i)});
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
  const labelSourcePx=portrait?SEGURIDAD_MECHANISM_TEXT_CONTRACT.verticalNodeLabelPx:SEGURIDAD_MECHANISM_TEXT_CONTRACT.horizontalNodeLabelPx;
  const embedScale=portrait?390/1080:1100/1920;
  const mechanismLabelEmbedPx=labelSourcePx*m.scale*embedScale;
  const requiredEmbedPx=portrait?SEGURIDAD_MECHANISM_TEXT_CONTRACT.minimumVerticalEmbedPx:SEGURIDAD_MECHANISM_TEXT_CONTRACT.minimumHorizontalEmbedPx;
  if(mechanismLabelEmbedPx+1e-6<requiredEmbedPx) issues.push({type:'mechanism-label-too-small',size:mechanismLabelEmbedPx,required:requiredEmbedPx,scene:scene.id});
  return Object.freeze({
    jobId:frame.job.id,
    scene:frame.scene.conceptId,
    sceneIndex:frame.sceneIndex,
    timeSeconds:frame.timeSeconds,
    localSeconds:frame.localSeconds,
    mechanismLocalSeconds:frame.mechanismLocalSeconds,
    bodySize:layout.bodySize,
    mechanismScale:layout.mechanism.scale,
    mechanismLabelEmbedPx,
    metrics:layout.metrics,
    issues:Object.freeze(issues),
    family:frame.scene.perceptualFamily,
    topology:frame.scene.topology,
    choreography:frame.scene.choreography,
    choreographyProfile:seguridadChoreographyProfile(frame.scene.choreography),
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
