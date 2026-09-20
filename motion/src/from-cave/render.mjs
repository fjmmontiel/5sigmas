import {Paint} from '../render/paint.mjs';
import {sceneLayout,drawHeader,drawText} from '../render/layout.mjs';
import {fromCaveFrameState,fromCaveRenderMatrix,validateFromCaveMechanismCoverage,indexFromCaveConcepts} from './engine.mjs';
import {FROM_CAVE_THEME} from './theme.mjs';

const pretty=value=>String(value??'').replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const xy=p=>[120+p.x*760,92+p.y*616];

function localizedScene(spec,frame){
  const chapter=spec.chapters.find(item=>item.chapter===frame.job.chapter);
  if(!chapter) throw new Error(`from-cave render: missing spec chapter ${frame.job.chapter}`);
  const scene=chapter.scenes.find(item=>item.concept_id===frame.scene.conceptId);
  if(!scene) throw new Error(`from-cave render: missing localized scene ${frame.scene.conceptId}`);
  return {chapter,scene,title:scene.title[frame.job.locale],text:scene.text[frame.job.locale]};
}

function endpoint(ref,mechanism){
  if(ref==='core') return xy(mechanism.core.position);
  const node=mechanism.nodes.find(item=>item.id===ref);
  return node?xy(node.position):null;
}

function drawArrow(P,a,b,active){
  if(!a||!b) return;
  P.path([a,b],active?P.T.accentText:P.T.rule,active?4:2,active?1:.35);
  if(!active) return;
  const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),r=13;
  P.path([[b[0]-Math.cos(angle-.55)*r,b[1]-Math.sin(angle-.55)*r],b,[b[0]-Math.cos(angle+.55)*r,b[1]-Math.sin(angle+.55)*r]],P.T.accentText,3);
}

function drawNode(P,node){
  const [x,y]=xy(node.position);const active=node.active;
  P.circle(x,y,active?31:25,active?P.T.accentSurface:P.T.surface,active?P.T.accentText:P.T.rule,active?4:2);
  if(active) P.circle(x,y,7,P.T.accentText,null,0);
  const lines=P.lines(pretty(node.label),190,19,active?650:500);
  const start=y+42;
  lines.slice(0,2).forEach((line,i)=>P.text(line,x,start+i*24,19,active?P.T.accentText:P.T.muted,active?650:500,'center',190));
}

function drawMechanism(P,mechanism){
  const hasCore=mechanism.edges.some(edge=>edge.from==='core'||edge.to==='core');
  if(hasCore){
    const [cx,cy]=xy(mechanism.core.position);
    P.circle(cx,cy,46,P.T.accentSurface,P.T.accentText,4);
    P.text('CORE',cx,cy-12,22,P.T.accentText,700,'center',120);
  }
  for(const edge of mechanism.edges) drawArrow(P,endpoint(edge.from,mechanism),endpoint(edge.to,mechanism),edge.active);
  for(const node of mechanism.nodes) drawNode(P,node);
  P.text(pretty(mechanism.style),500,724,20,P.T.muted,600,'center',640);
}

function headerSpec(spec,frame,localized,concepts){
  const chapter=localized.chapter;
  return {
    brand:'5sigmas',
    series:frame.job.locale==='es'?'De la cueva a la AGI':'From Cave to AGI',
    locale:frame.job.locale,
    scenes:chapter.scenes.map((scene,index)=>({
      id:scene.concept_id,
      duration:15,
      kicker:`${String(index+1).padStart(2,'0')} · ${concepts.get(scene.concept_id).perceptual_family}`
    }))
  };
}

export function renderFromCaveFrame(canvas,spec,localeBindings,chapters,jobId,timeSeconds,{reducedMotion=false}={}){
  const frame=fromCaveFrameState(localeBindings,chapters,jobId,timeSeconds,{reducedMotion});
  const localized=localizedScene(spec,frame);const concepts=indexFromCaveConcepts(chapters);
  const portrait=frame.job.orientation==='vertical';const W=frame.job.width,H=frame.job.height;
  if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=FROM_CAVE_THEME.background;ctx.fillRect(0,0,W,H);
  const issues=[];const P=new Paint(ctx,FROM_CAVE_THEME,issues,frame.job.locale,{});
  const scene={id:frame.scene.conceptId,title:[localized.title],accentLine:-1,paragraphs:[localized.text],source:null};
  const layout=sceneLayout(P,scene,portrait,{layout:'split'});
  drawHeader(P,headerSpec(spec,frame,localized,concepts),frame.sceneIndex,frame.timeSeconds,75,layout);
  drawText(P,scene,layout,1,null);
  ctx.save();const m=layout.mechanism;ctx.translate(m.x+(m.w-1000*m.scale)/2,m.y);ctx.scale(m.scale,m.scale);drawMechanism(P,frame.scene.mechanism);ctx.restore();
  return Object.freeze({
    jobId:frame.job.id,locale:frame.job.locale,orientation:frame.job.orientation,scene:frame.scene.conceptId,sceneIndex:frame.sceneIndex,
    timeSeconds:frame.timeSeconds,localSeconds:frame.localSeconds,bodySize:layout.bodySize,mechanismScale:layout.mechanism.scale,
    metrics:layout.metrics,issues:Object.freeze(issues),family:frame.scene.perceptualFamily,topology:frame.scene.topology,
    mechanismId:frame.scene.mechanism.mechanismId,reducedMotion
  });
}

export function validateFromCaveLayouts(canvas,spec,localeBindings,chapters){
  const rows=[];
  for(const job of fromCaveRenderMatrix(localeBindings,chapters)){
    for(let scene=0;scene<5;scene+=1){
      for(const fraction of [.08,.45,.92]){
        rows.push(renderFromCaveFrame(canvas,spec,localeBindings,chapters,job.id,scene*15+fraction*15));
      }
    }
  }
  return rows;
}

export function validateFromCaveBrowserInputs(spec,localeBindings,chapters){
  if(spec?.schema_version!==1||spec?.unit!=='from-cave-to-agi') throw new Error('from-cave render: invalid spec identity');
  if(spec.chapters?.length!==6) throw new Error('from-cave render: six localized chapters required');
  const seen=new Set();
  for(const chapter of spec.chapters){
    if(chapter.scenes?.length!==5) throw new Error(`from-cave render: ${chapter.chapter} requires five localized scenes`);
    for(const scene of chapter.scenes){
      if(seen.has(scene.concept_id)) throw new Error(`from-cave render: duplicate localized concept ${scene.concept_id}`);seen.add(scene.concept_id);
      for(const locale of ['es','en']) if(!scene.title?.[locale]||!scene.text?.[locale]) throw new Error(`from-cave render: localized copy missing ${scene.concept_id}/${locale}`);
    }
  }
  if(seen.size!==30) throw new Error(`from-cave render: expected 30 localized concepts, got ${seen.size}`);
  const coverage=validateFromCaveMechanismCoverage(localeBindings,chapters);
  return Object.freeze({localizedConcepts:seen.size,...coverage});
}
