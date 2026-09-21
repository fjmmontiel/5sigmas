import { Paint, clamp, mixHex } from '../render/paint.mjs';
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

const localized = (value, locale) => typeof value === 'object' && value !== null ? value[locale] : value;
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

function progressFor(plan, kind, index, total=1, element=null) {
  if (element && Number.isInteger(element.phase)) {
    const cue = plan.cueProgress[element.phase];
    if (!cue) throw new Error(`seguridad: unknown authored phase ${element.phase}`);
    return cue.progress;
  }
  return seguridadElementProgress(plan, kind, index, total);
}

function drawAuthoredBox(P,node,q,plan) {
  if(q<=0)return;
  const c=P.c;c.save();c.globalAlpha*=.25+.75*q;
  const strong=node.style==='accent';const denied=node.style==='blocked';
  let highlight=0;
  if(node.highlightPhase!==undefined){
    if(!Number.isInteger(node.highlightPhase)||!plan.cueProgress[node.highlightPhase])throw new Error('seguridad: invalid highlight phase');
    highlight=plan.cueProgress[node.highlightPhase].progress;
  }
  const fill=strong?P.T.accentSurface:mixHex('#FFFFFF',P.T.accentSurface,highlight);
  const stroke=strong?P.T.accent:mixHex(P.T.rule,P.T.accent,highlight);
  if(node.style!=='status')P.rect(node.x,node.y,node.w,node.h,fill,stroke,12,strong?3:2+highlight);
  const vertical=plan.orientation==='vertical';
  const size=vertical?43:38, subSize=vertical?35:32, max=node.w-40;
  const text=localized(node.label,P.locale);
  if(typeof text!=='string')throw new Error('seguridad: missing localized box label');
  const lines=P.lines(text,max,size,650);
  const sub=localized(node.sublabel,P.locale);
  const subLines=sub?P.lines(sub,max,subSize):[];
  const height=lines.length*size*1.15+(subLines.length?18+subLines.length*subSize*1.2:0);
  if(height>node.h-20)P.issues.push({type:'authored-box-overflow',text,height,available:node.h-20});
  let y=node.y+(node.h-height)/2;
  for(const line of lines){P.text(line,node.x+node.w/2,y,size,strong||denied?P.T.accentText:P.T.ink,650,'center',max);y+=size*1.15;}
  if(subLines.length)y+=18;
  for(const line of subLines){P.text(line,node.x+node.w/2,y,subSize,P.T.muted,400,'center',max);y+=subSize*1.2;}
  c.restore();
}

function drawAuthoredEdge(P,edge,q) {
  if(q<=0)return;
  const points=edge.points;P.path(points,P.T.accent,4,q);
  if(q<.98)return;
  const a=points.at(-2),b=points.at(-1);
  if(edge.blocked){
    P.path([[b[0]-10,b[1]-10],[b[0]+10,b[1]+10]],P.T.accentText,5);
    P.path([[b[0]-10,b[1]+10],[b[0]+10,b[1]-10]],P.T.accentText,5);
  }else{
    const t=Math.atan2(b[1]-a[1],b[0]-a[0]),r=15;
    P.path([[b[0]-Math.cos(t-.55)*r,b[1]-Math.sin(t-.55)*r],b,[b[0]-Math.cos(t+.55)*r,b[1]-Math.sin(t+.55)*r]],P.T.accent,4);
  }
}

function drawAuthoredAnnotation(P,a,q) {
  if(q<=0)return;
  const text=localized(a.label,P.locale);
  if(typeof text!=='string')throw new Error('seguridad: missing localized annotation');
  const width=a.width??Math.min(920,2*Math.min(a.x,1000-a.x)-20);
  const lines=P.lines(text,width,a.size,a.strong?650:400);
  const c=P.c;c.save();c.globalAlpha*=q;
  for(const [i,line]of lines.entries())P.text(line,a.x,a.y+i*a.size*1.22,a.size,a.strong?P.T.accentText:P.T.muted,a.strong?650:400,a.align??'center',width);
  c.restore();
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
  if(['document','storage','boundary'].includes(node.shape)) {
    if(q<=0)return;const c=P.c;c.save();c.globalAlpha*=q;
    if(node.shape==='document') {
      P.rect(node.x,node.y,node.w,node.h,'#FFFFFF',P.T.accent,4,3);
      for(let i=0;i<3;i++)P.path([[node.x+18,node.y+30+i*25],[node.x+node.w-18,node.y+30+i*25]],P.T.muted,3);
    }else if(node.shape==='storage'){
      P.rect(node.x,node.y,node.w,node.h,P.T.accentSurface,P.T.accent,18,3);
      P.path([[node.x+15,node.y+30],[node.x+node.w-15,node.y+30]],P.T.accent,3);
      P.path([[node.x+15,node.y+65],[node.x+node.w-15,node.y+65]],P.T.accent,3);
    }else{
      P.path([[node.x,node.y],[node.x+node.w,node.y]],P.T.accentText,5);
      P.text(localized(node.label,P.locale),node.x+node.w/2,node.y+28,36,P.T.muted,500,'center',180);
    }c.restore();return;
  }
  if (node.shape === 'box') return drawAuthoredBox(P,node,q,plan);
  if (q <= 0) return;
  const c=P.c;c.save();c.globalAlpha*=.2+.8*q;
  const strong=selected || ['effect','decision','authorization_result','release_state','terminal','high_privilege'].includes(node.role);
  const radius=selected?40:strong?42:36;
  P.circle(node.x,node.y,radius,strong?P.T.accentSurface:'#FFFFFF',strong?P.T.accentText:P.T.accent,strong?5:4);
  if(selected) P.circle(node.x,node.y,8,P.T.accentText,null,0);
  const label=node.label === '' ? '' : localized(node.label,P.locale) || node.role;
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
  for (const [i,edge] of edges.entries()) {const q=progressFor(plan,'edge',i,edges.length,edge);if(edge.points)drawAuthoredEdge(P,edge,q);else drawArrow(P,centerOf(edge.from,plan),centerOf(edge.to,plan),q,edge.role);}
  const selected=new Set(plan.geometry.selected ?? []);
  for (const [i,node] of nodes.entries()) drawNode(P,node,progressFor(plan,'node',i,nodes.length,node),plan,{selected:selected.has(i)});
  for(const [i,a] of (plan.geometry.annotations??[]).entries()) drawAuthoredAnnotation(P,a,progressFor(plan,'annotation',i,1,a));
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
      kicker:localized(concepts.get(scene.concept_id).presentation?.footer,frame.job.locale)??`${String(index+1).padStart(2,'0')} · ${concepts.get(scene.concept_id).perceptual_family}`
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
  const presentation=indexSeguridadRegister(register).get(frame.scene.conceptId).presentation;
  const scene={id:frame.scene.conceptId,title:[localized(presentation?.title,frame.job.locale)??frame.title],accentLine:-1,paragraphs:[frame.scene.text],source:null};
  const layout=sceneLayout(P,scene,portrait,{layout:presentation?.editorial_layout??'split'});
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
