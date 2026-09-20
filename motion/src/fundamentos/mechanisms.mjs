const RECIPES=Object.freeze({
  'capability-lattice':'lattice',
  'nested-containment':'containment',
  'three-axis-diagnostic':'axes',
  'equation-transform':'transform',
  'learning-roadmap':'roadmap',
  'input-objective-output-loop':'control-loop',
  'teacher-source-switchboard':'switchboard',
  'closed-feedback-cycle':'cycle',
  'parameter-mechanism-comparison':'comparison-grid',
  'distribution-shift':'distribution',
  'semantic-vector-space':'vector-space',
  'token-attention-web':'attention-web',
  'compute-data-parameter-budget':'budget-surface',
  'foundation-hub-capabilities':'hub',
  'llm-rag-agent-capability-stack':'capability-stack',
  'finite-open-output-space':'output-space',
  'probability-fanout':'fanout-tree',
  'traceability-spectrum':'spectrum',
  'evaluation-pipeline':'parallel-pipeline',
  'operational-decision-routing':'decision-tree',
  'definition-conflict-map':'overlap-map',
  'capability-ladder':'ladder',
  'capability-boundary-radar':'boundary-radar',
  'parallel-impact-paths':'parallel-lanes',
  'objective-gap':'trajectory-gap'
});
export const SUPPORTED_FUNDAMENTOS_MECHANISMS=Object.freeze(Object.keys(RECIPES));
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
const point=(x,y)=>Object.freeze({x:Number(x.toFixed(4)),y:Number(y.toFixed(4))});
function slots(style,count,portrait){
  if(['hub','attention-web','overlap-map','boundary-radar','lattice'].includes(style)){
    const rx=portrait?0.28:0.36,ry=portrait?0.30:0.27;
    return Array.from({length:count},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/count;return point(.5+Math.cos(a)*rx,.5+Math.sin(a)*ry);});
  }
  if(['comparison-grid','parallel-pipeline','parallel-lanes','output-space','trajectory-gap','distribution'].includes(style)){
    return Array.from({length:count},(_,i)=>{const side=i%2,row=Math.floor(i/2);return portrait?point(.29+side*.42,.22+row*.22):point(.22+side*.56,.28+row*.22);});
  }
  if(['axes','budget-surface','vector-space','switchboard'].includes(style)){
    const cols=portrait?2:3;return Array.from({length:count},(_,i)=>point(.2+(i%cols)*(.6/Math.max(1,cols-1)),.24+Math.floor(i/cols)*.26));
  }
  return Array.from({length:count},(_,i)=>portrait?point(.5,.14+i*(.72/Math.max(1,count-1))):point(.14+i*(.72/Math.max(1,count-1)),.5));
}
export function compileFundamentosMechanism(concept,{orientation='horizontal',localSeconds=0,durationSeconds=15,reducedMotion=false}={}){
  const style=RECIPES[concept?.mechanism];
  if(!style) throw new Error(`fundamentos mechanism: unsupported mechanism ${concept?.mechanism}`);
  if(!['horizontal','vertical'].includes(orientation)) throw new Error(`fundamentos mechanism: invalid orientation ${orientation}`);
  if(!Number.isFinite(localSeconds)||!Number.isFinite(durationSeconds)||durationSeconds<=0) throw new Error('fundamentos mechanism: invalid time');
  const progress=reducedMotion?1:clamp(localSeconds/durationSeconds);
  const positions=slots(style,concept.cues.length,orientation==='vertical');
  const nodes=concept.cues.map((cue,index)=>{const reveal=reducedMotion?1:smooth((localSeconds-cue)/1.2);return Object.freeze({id:`cue-${index}`,cue,position:positions[index],reveal:Number(reveal.toFixed(4)),active:reducedMotion||reveal>0})});
  const edges=[];
  if(['hub','attention-web','overlap-map','boundary-radar','lattice'].includes(style)){
    for(let i=0;i<nodes.length;i++)edges.push(Object.freeze({from:'core',to:nodes[i].id,reveal:nodes[i].reveal,active:reducedMotion||nodes[i].active}));
  } else if(['comparison-grid','parallel-pipeline','parallel-lanes','output-space','trajectory-gap','distribution'].includes(style)){
    for(let i=0;i+1<nodes.length;i+=2)edges.push(Object.freeze({from:nodes[i].id,to:nodes[i+1].id,reveal:nodes[i+1].reveal,active:reducedMotion||nodes[i+1].active}));
  } else {
    for(let i=0;i<nodes.length-1;i++)edges.push(Object.freeze({from:nodes[i].id,to:nodes[i+1].id,reveal:nodes[i+1].reveal,active:reducedMotion||nodes[i+1].active}));
  }
  return Object.freeze({mechanismId:concept.mechanism,style,topology:concept.topology,perceptualFamily:concept.perceptual_family,orientation,progress,reducedMotion,core:Object.freeze({id:'core',position:point(.5,.5)}),nodes:Object.freeze(nodes),edges:Object.freeze(edges),choreography:concept.choreography,composition:concept.composition});
}
