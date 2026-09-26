import { Paint, clamp, smooth } from '../render/paint.mjs';
import { sceneLayout, drawHeader, drawText } from '../render/layout.mjs';
import { seguridadFrameState, seguridadRenderMatrix, indexSeguridadRegister } from './engine.mjs';
import { seguridadTextState } from './timeline.mjs';
import { seguridadChoreographyProfile, seguridadElementProgress } from './choreography.mjs';

export const SEGURIDAD_THEME=Object.freeze({background:'#FFFFFF',ink:'#191817',muted:'#66615D',rule:'#DDD8D3',bodyFont:'Arial',headlineFont:'Georgia',accent:'#B44B31',accentText:'#7F3525',accentSurface:'#F7ECE8',guideSurface:'#D9A99A',guideText:'#4A1A12'});
export const SEGURIDAD_MECHANISM_TEXT_CONTRACT=Object.freeze({horizontalNodeLabelPx:34,verticalNodeLabelPx:38,horizontalZoneLabelPx:32,verticalZoneLabelPx:36,horizontalAxisLabelPx:32,verticalAxisLabelPx:36,minimumHorizontalEmbedPx:16,minimumVerticalEmbedPx:12});
const localized=(value,locale)=>typeof value==='object'&&value!==null?value[locale]:value;
const pretty=value=>String(value??'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());

function centerOf(ref,plan){if(Number.isInteger(ref)){const node=plan.geometry.nodes?.[ref];return node?[node.x,node.y]:null;}if(typeof ref==='string'){const zone=plan.geometry.zones?.find(item=>item.role===ref);if(zone)return[zone.x+zone.w/2,zone.y+zone.h/2];}return null;}
function progressFor(plan,kind,index,total=1,element=null){if(element&&Number.isInteger(element.phase)){const cue=plan.cueProgress[element.phase];if(!cue)throw new Error(`seguridad: unknown authored phase ${element.phase}`);return cue.progress;}return seguridadElementProgress(plan,kind,index,total);}
function eased(q){return smooth(clamp(q));}

function semanticFocus(plan){
  const values=(plan?.cueProgress??[]).map(item=>clamp(item?.progress??0));
  if(!values.length)return {index:0,progress:0,settled:false};
  let index=values.findIndex(value=>value>0.001&&value<0.999);
  if(index<0){
    const completed=values.map((value,i)=>value>.001?i:-1).filter(i=>i>=0);
    index=completed.length?completed.at(-1):0;
  }
  return {index,progress:values[index]??0,settled:values[index]>=.999};
}
function focusRing(P,x,y,q,{radius=54,strong=false}={}){
  if(!Number.isFinite(x)||!Number.isFinite(y)||q<=0)return;
  const e=eased(q),r=radius+18*(1-e),c=P.c;c.save();c.globalAlpha*=.18+.72*e;
  P.circle(x,y,r,null,strong?P.T.accentText:P.T.accent,strong?6:4);
  if(e>.55)P.circle(x,y,Math.max(6,10*(e-.55)/.45),strong?P.T.accentText:P.T.accent,null,0);
  c.restore();
}
function sweepLine(P,x1,y1,x2,y2,q,{strong=false,width=5}={}){
  if(q<=0)return;const e=eased(q),x=x1+(x2-x1)*e,y=y1+(y2-y1)*e;
  P.path([[x1,y1],[x,y]],strong?P.T.accentText:P.T.accent,width);
  if(e<.995)P.circle(x,y,strong?9:7,strong?P.T.accentText:P.T.accent);
}
function drawSemanticMotionOverlay(P,plan){
  const profile=seguridadChoreographyProfile(plan.choreography),focus=semanticFocus(plan),nodes=plan.geometry.nodes??[],zones=plan.geometry.zones??[],edges=plan.geometry.edges??[],q=focus.progress;
  if(q<=0)return;
  switch(profile){
    case 'cycle': {
      const cycleNodes=nodes.slice(0,Math.min(4,nodes.length));if(cycleNodes.length){
        const node=cycleNodes[focus.index%cycleNodes.length];focusRing(P,node.x,node.y,q,{radius:58,strong:focus.index>=3});
        const next=cycleNodes[(focus.index+1)%cycleNodes.length];sweepLine(P,node.x,node.y,next.x,next.y,q,{strong:false,width:5});
      }
      if((plan.cueProgress?.at(-1)?.progress??0)>.02&&nodes.length>cycleNodes.length){
        const exit=nodes.at(-1),last=clamp(plan.cueProgress.at(-1).progress);focusRing(P,exit.x,exit.y,last,{radius:64,strong:true});
      }
      break;
    }
    case 'plot': {
      const target=nodes[0]??nodes.at(-1);if(target){
        const e=eased(q);P.path([[160,target.y],[160+(target.x-160)*e,target.y]],P.T.accent,4);
        P.path([[target.x,650],[target.x,650+(target.y-650)*e]],P.T.accent,4);focusRing(P,target.x,target.y,q,{radius:50,strong:true});
      }
      break;
    }
    case 'fanout_revoke': {
      if(nodes.length){const source=nodes[0];focusRing(P,source.x,source.y,clamp(plan.cueProgress?.[0]?.progress??q),{radius:52});
        for(const node of nodes.slice(1))sweepLine(P,source.x,source.y,node.x,node.y,clamp(plan.cueProgress?.[1]?.progress??q),{width:4});
      }
      const revoke=clamp(plan.cueProgress?.at(-1)?.progress??0);if(revoke>.01&&zones.length){
        const z=zones.at(-1),vertical=z.h>z.w;
        if(vertical)sweepLine(P,z.x+z.w/2,z.y,z.x+z.w/2,z.y+z.h,revoke,{strong:true,width:7});
        else sweepLine(P,z.x,z.y+z.h/2,z.x+z.w,z.y+z.h/2,revoke,{strong:true,width:7});
      }
      break;
    }
    case 'parallel_compare': {
      if(zones.length>=2){
        const a=zones[0],b=zones[1],qa=clamp(plan.cueProgress?.[0]?.progress??q),qb=clamp(plan.cueProgress?.[1]?.progress??0);
        focusRing(P,a.x+a.w/2,a.y+a.h/2,qa,{radius:Math.min(86,Math.max(54,a.h*.22))});
        if(qb>.01)focusRing(P,b.x+b.w/2,b.y+b.h/2,qb,{radius:Math.min(86,Math.max(54,b.h*.22)),strong:true});
        const final=clamp(plan.cueProgress?.at(-1)?.progress??0);if(final>.01)sweepLine(P,a.x+a.w/2,a.y+a.h/2,b.x+b.w/2,b.y+b.h/2,final,{strong:true,width:5});
      }
      break;
    }
    case 'projection': {
      if(nodes.length>1){
        const decision=nodes.at(-1),attrs=nodes.slice(0,-1);
        const qi=clamp(plan.cueProgress?.[Math.min(focus.index,Math.max(0,(plan.cueProgress?.length??1)-2))]?.progress??q);
        for(const attr of attrs)sweepLine(P,attr.x,attr.y,decision.x,decision.y,qi,{width:4});
        focusRing(P,decision.x,decision.y,clamp(plan.cueProgress?.at(-1)?.progress??0),{radius:66,strong:true});
      }
      break;
    }
    case 'cut': {
      for(const z of zones){
        const zi=zones.indexOf(z),zq=clamp(plan.cueProgress?.[Math.min(zi+1,(plan.cueProgress?.length??1)-1)]?.progress??q);
        if(z.w<z.h)sweepLine(P,z.x+z.w/2,z.y,z.x+z.w/2,z.y+z.h,zq,{strong:true,width:7});
        else sweepLine(P,z.x,z.y+z.h/2,z.x+z.w,z.y+z.h/2,zq,{strong:true,width:7});
      }
      break;
    }
    case 'handoff':
    case 'trace':
    case 'gated':
    case 'audit_loop':
    case 'trace_evidence':
    case 'contract': {
      const edge=edges[Math.min(focus.index,Math.max(0,edges.length-1))];
      if(edge){const a=centerOf(edge.from,plan),b=centerOf(edge.to,plan);if(a&&b)sweepLine(P,a[0],a[1],b[0],b[1],q,{strong:profile==='gated',width:5});}
      const node=nodes[Math.min(focus.index,Math.max(0,nodes.length-1))];if(node)focusRing(P,node.x,node.y,q,{radius:52,strong:profile==='gated'});
      break;
    }
    default: {
      const node=nodes[Math.min(focus.index,Math.max(0,nodes.length-1))];if(node)focusRing(P,node.x,node.y,q,{radius:50});
    }
  }
}

function drawAuthoredBox(P,node,q,plan){
  if(q<=0)return;const e=eased(q),c=P.c;c.save();c.globalAlpha*=.12+.88*e;const cx=node.x+node.w/2,cy=node.y+node.h/2,scale=.94+.06*e;c.translate(cx,cy+(1-e)*18);c.scale(scale,scale);c.translate(-cx,-cy);
  const strong=node.style==='accent',denied=node.style==='blocked',status=node.style==='status';
  if(status){const negative=/sin permiso|not allowed|bloque|blocked|reject/i.test(localized(node.label,P.locale)??'');P.rect(node.x,node.y,node.w,node.h,negative?'#FFFFFF':P.T.accentSurface,negative?P.T.rule:P.T.accent,999,negative?2:3);if(negative){P.path([[node.x+34,node.y+node.h/2-10],[node.x+54,node.y+node.h/2+10]],P.T.accentText,4);P.path([[node.x+34,node.y+node.h/2+10],[node.x+54,node.y+node.h/2-10]],P.T.accentText,4);}else P.check(node.x+45,node.y+node.h/2,P.T.accentText,1.05);}
  else P.rect(node.x,node.y,node.w,node.h,strong?P.T.accentSurface:'#FFFFFF',strong?P.T.accent:P.T.rule,16,strong?4:2.5);
  const vertical=plan.orientation==='vertical',size=vertical?43:38,subSize=vertical?35:32,max=node.w-(status?100:40);const text=localized(node.label,P.locale);if(typeof text!=='string')throw new Error('seguridad: missing localized box label');const lines=P.lines(text,max,size,650),sub=localized(node.sublabel,P.locale),subLines=sub?P.lines(sub,max,subSize):[],height=lines.length*size*1.15+(subLines.length?18+subLines.length*subSize*1.2:0);if(height>node.h-20)P.issues.push({type:'authored-box-overflow',text,height,available:node.h-20});let y=node.y+(node.h-height)/2;
  const x=status?node.x+node.w/2+24:node.x+node.w/2;
  for(const line of lines){P.text(line,x,y,size,strong||denied?P.T.accentText:P.T.ink,650,'center',max);y+=size*1.15;}if(subLines.length)y+=18;for(const line of subLines){P.text(line,node.x+node.w/2,y,subSize,P.T.muted,400,'center',max);y+=subSize*1.2;}c.restore();
}
function drawAuthoredEdge(P,edge,q){if(q<=0)return;const e=eased(q),points=edge.points;P.path(points,P.T.accent,5,e);if(e>.08&&e<.97)P.traveler(points,e,P.T.accentText,8);if(e<.985)return;const a=points.at(-2),b=points.at(-1);if(edge.blocked){const pop=clamp((e-.985)/.015);P.path([[b[0]-11*pop,b[1]-11*pop],[b[0]+11*pop,b[1]+11*pop]],P.T.accentText,5);P.path([[b[0]-11*pop,b[1]+11*pop],[b[0]+11*pop,b[1]-11*pop]],P.T.accentText,5);}else{const t=Math.atan2(b[1]-a[1],b[0]-a[0]),r=16;P.path([[b[0]-Math.cos(t-.55)*r,b[1]-Math.sin(t-.55)*r],b,[b[0]-Math.cos(t+.55)*r,b[1]-Math.sin(t+.55)*r]],P.T.accent,4);}}
function drawAuthoredAnnotation(P,a,q){if(q<=0)return;const e=eased(q),text=localized(a.label,P.locale);if(typeof text!=='string')throw new Error('seguridad: missing localized annotation');const width=a.width??Math.min(920,2*Math.min(a.x,1000-a.x)-20),lines=P.lines(text,width,a.size,a.strong?650:400),c=P.c;c.save();c.globalAlpha*=e;c.translate(0,(1-e)*15);for(const [i,line] of lines.entries())P.text(line,a.x,a.y+i*a.size*1.22,a.size,a.strong?P.T.accentText:P.T.muted,a.strong?650:400,a.align??'center',width);c.restore();}
function mechanismLabelSize(plan,kind){const v=plan.orientation==='vertical';if(kind==='node')return v?38:34;if(kind==='axis')return v?36:32;return v?36:32;}
function drawArrow(P,from,to,progress,role='flow'){if(!from||!to||progress<=0)return;const q=eased(progress),x=from[0]+(to[0]-from[0])*q,y=from[1]+(to[1]-from[1])*q,strong=role==='revoke'||role==='external_control';P.path([from,[x,y]],strong?P.T.accentText:P.T.muted,role==='revoke'?6:4);if(q>.08&&q<.97)P.circle(x,y,7,strong?P.T.accentText:P.T.accent);if(q<.98)return;const a=Math.atan2(to[1]-from[1],to[0]-from[0]),r=18;P.path([[to[0]-Math.cos(a-.55)*r,to[1]-Math.sin(a-.55)*r],to,[to[0]-Math.cos(a+.55)*r,to[1]-Math.sin(a+.55)*r]],strong?P.T.accentText:P.T.muted,4);}
function drawZone(P,zone,q,plan){if(q<=0)return;const e=eased(q),c=P.c;c.save();c.globalAlpha*=.18+.82*e;c.translate(0,(1-e)*14);const strong=['cut','revocation','top_k'].includes(zone.role);P.rect(zone.x,zone.y,zone.w,zone.h,strong?P.T.accentSurface:'#FBFAF9',strong?P.T.accent:P.T.rule,18,strong?4:2.5);if(zone.label){const label=pretty(zone.label),base=mechanismLabelSize(plan,'zone');if(zone.w<220&&zone.h>220)P.text(label,zone.x+zone.w/2,Math.max(48,zone.y-base-16),base,strong?P.T.accentText:P.T.muted,650,'center',430);else if(zone.w<160)P.text(label,Math.min(955,zone.x+zone.w+14),zone.y+Math.max(0,(zone.h-base)/2),base,strong?P.T.accentText:P.T.muted,650,'left',390);else{const size=zone.w<240?Math.max(30,base-2):base;P.text(label,zone.x+16,zone.y+Math.max(12,(zone.h-size)/2),size,strong?P.T.accentText:P.T.muted,650,'left',Math.max(110,zone.w-32));}}c.restore();}
function drawNode(P,node,q,plan,{selected=false}={}){
  const e=eased(q);if(['document','storage','boundary'].includes(node.shape)){if(q<=0)return;const c=P.c;c.save();c.globalAlpha*=e;c.translate(0,(1-e)*16);if(node.shape==='document'){P.rect(node.x,node.y,node.w,node.h,'#FFFFFF',P.T.accent,5,3);for(let i=0;i<3;i++){const p=clamp(e*1.35-i*.18);if(p>0)P.path([[node.x+18,node.y+30+i*25],[node.x+18+(node.w-36)*p,node.y+30+i*25]],P.T.muted,3);}}else if(node.shape==='storage'){P.rect(node.x,node.y,node.w,node.h,P.T.accentSurface,P.T.accent,18,3);for(let i=0;i<2;i++){const p=clamp(e*1.25-i*.22);if(p>0)P.path([[node.x+15,node.y+30+i*35],[node.x+15+(node.w-30)*p,node.y+30+i*35]],P.T.accent,3);}}else{P.path([[node.x,node.y],[node.x+node.w*e,node.y]],P.T.accentText,6);if(e>.55)P.text(localized(node.label,P.locale),node.x+node.w/2,node.y+28,36,P.T.muted,500,'center',180);}c.restore();return;}
  if(node.shape==='box')return drawAuthoredBox(P,node,q,plan);if(q<=0)return;const c=P.c;c.save();c.globalAlpha*=.15+.85*e;c.translate(0,(1-e)*14);const strong=selected||['effect','decision','authorization_result','release_state','terminal','high_privilege'].includes(node.role),radius=(selected?40:strong?42:36)*(.8+.2*e);P.circle(node.x,node.y,radius,strong?P.T.accentSurface:'#FFFFFF',strong?P.T.accentText:P.T.accent,strong?5:4);if(selected)P.circle(node.x,node.y,8*e,P.T.accentText,null,0);const label=node.label===''?'':localized(node.label,P.locale)||node.role;if(label&&e>.3){const size=mechanismLabelSize(plan,'node');P.text(pretty(label),node.x,node.y+52,size,strong?P.T.accentText:P.T.muted,strong?650:500,'center',420);}c.restore();
}
function drawAxes(P,plan){const axes=plan.geometry.axes;if(!axes)return;const q=progressFor(plan,'axis',0,1);if(q<=0)return;const e=eased(q),c=P.c;c.save();c.globalAlpha*=e;const size=mechanismLabelSize(plan,'axis');if(axes.x)P.text(pretty(axes.x),500,690,size,P.T.muted,650,'center',620);if(axes.y)P.text(pretty(axes.y),160,105,size,P.T.muted,650,'center',460);c.restore();}
function drawMechanism(P,plan){const c=P.c;c.save();const zones=plan.geometry.zones??[],paths=plan.geometry.paths??[],edges=plan.geometry.edges??[],nodes=plan.geometry.nodes??[];for(const [i,z] of zones.entries())drawZone(P,z,progressFor(plan,'zone',i,zones.length,z),plan);for(const [i,path] of paths.entries())P.path(path,P.T.muted,4,eased(progressFor(plan,'path',i,paths.length)));drawAxes(P,plan);for(const [i,edge] of edges.entries()){const q=progressFor(plan,'edge',i,edges.length,edge);if(edge.points)drawAuthoredEdge(P,edge,q);else drawArrow(P,centerOf(edge.from,plan),centerOf(edge.to,plan),q,edge.role);}const selected=new Set(plan.geometry.selected??[]);for(const [i,node] of nodes.entries())drawNode(P,node,progressFor(plan,'node',i,nodes.length,node),plan,{selected:selected.has(i)});for(const [i,a] of (plan.geometry.annotations??[]).entries())drawAuthoredAnnotation(P,a,progressFor(plan,'annotation',i,1,a));drawSemanticMotionOverlay(P,plan);c.restore();}
function renderSpecForChapter(spec,register,frame){const chapter=spec.chapters.find(item=>item.chapter===frame.job.chapter),concepts=indexSeguridadRegister(register);return{brand:'5sigmas',series:frame.job.locale==='es'?'Seguridad en IA':'AI Security',locale:frame.job.locale,scenes:chapter.scenes.map((scene,index)=>({id:scene.concept_id,duration:scene.end-scene.start,kicker:localized(concepts.get(scene.concept_id).presentation?.footer,frame.job.locale)??`${String(index+1).padStart(2,'0')} · ${concepts.get(scene.concept_id).perceptual_family}`}))};}
function sceneTransition(local,reduced){if(reduced)return{alpha:1,y:0};const enter=clamp(local/.42),leave=clamp((12-local)/.38),q=Math.min(eased(enter),eased(leave));return{alpha:.08+.92*q,y:(1-q)*18};}

export function renderSeguridadFrame(canvas,spec,register,jobId,timeSeconds,{reducedMotion=false}={}){
  const frame=seguridadFrameState(spec,register,jobId,timeSeconds,{reducedMotion}),portrait=frame.job.orientation==='vertical',W=frame.job.width,H=frame.job.height;if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=SEGURIDAD_THEME.background;ctx.fillRect(0,0,W,H);const issues=[],P=new Paint(ctx,SEGURIDAD_THEME,issues,frame.job.locale,{}),presentation=indexSeguridadRegister(register).get(frame.scene.conceptId).presentation,scene={id:frame.scene.conceptId,title:[localized(presentation?.title,frame.job.locale)??frame.title],accentLine:-1,paragraphs:[frame.scene.text],source:null},layout=sceneLayout(P,scene,portrait,{layout:presentation?.editorial_layout??'split'}),headerSpec=renderSpecForChapter(spec,register,frame),textState=seguridadTextState(frame.scene.text,frame.scene.conceptId,frame.localSeconds,frame.scene.durationSeconds,{reducedMotion,locale:frame.job.locale});
  drawHeader(P,headerSpec,frame.sceneIndex,frame.timeSeconds,60,layout);const transition=sceneTransition(frame.localSeconds,reducedMotion);ctx.save();ctx.globalAlpha*=transition.alpha;ctx.translate(0,transition.y);drawText(P,scene,layout,1,textState);ctx.save();const m=layout.mechanism;ctx.translate(m.x+(m.w-1000*m.scale)/2,m.y);ctx.scale(m.scale,m.scale);drawMechanism(P,frame.scene.mechanism);ctx.restore();ctx.restore();
  const labelSourcePx=portrait?38:34,embedScale=portrait?390/1080:1100/1920,mechanismLabelEmbedPx=labelSourcePx*layout.mechanism.scale*embedScale,requiredEmbedPx=portrait?12:16;if(mechanismLabelEmbedPx+1e-6<requiredEmbedPx)issues.push({type:'mechanism-label-too-small',size:mechanismLabelEmbedPx,required:requiredEmbedPx,scene:scene.id});
  return Object.freeze({jobId:frame.job.id,scene:frame.scene.conceptId,sceneIndex:frame.sceneIndex,timeSeconds:frame.timeSeconds,localSeconds:frame.localSeconds,mechanismLocalSeconds:frame.mechanismLocalSeconds,bodySize:layout.bodySize,mechanismScale:layout.mechanism.scale,mechanismLabelEmbedPx,metrics:layout.metrics,issues:Object.freeze(issues),family:frame.scene.perceptualFamily,topology:frame.scene.topology,choreography:frame.scene.choreography,choreographyProfile:seguridadChoreographyProfile(frame.scene.choreography),semanticTimeline:frame.scene.semanticTimeline,textCues:textState.cues.map(c=>({id:c.id,status:c.status,visible:c.visible,text_at:c.text_at,visual_at:c.visual_at,range:c.range})),textCue:Object.freeze({activeId:textState.activeId,status:textState.cues.find(c=>c.id===textState.activeId)?.status??'none',visible:textState.cues.some(c=>c.visible)}),semanticAnnotations:Object.freeze({axes:Boolean(frame.scene.mechanism.geometry.axes),selectedCount:(frame.scene.mechanism.geometry.selected??[]).length}),reducedMotion});
}
export function validateSeguridadLayouts(canvas,spec,register){const rows=[];for(const job of seguridadRenderMatrix(spec,register))for(let scene=0;scene<5;scene++)for(const fraction of [.08,.45,.92])rows.push(renderSeguridadFrame(canvas,spec,register,job.id,scene*12+fraction*12));return rows;}
