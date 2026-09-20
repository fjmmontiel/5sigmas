const RECIPES = Object.freeze({
  'single temporal spine with regime transitions': ['historical-lineage','sequence'],
  'dependency stack': ['capability-stack','stack'],
  'two alternative learning channels': ['paradigm-channel-switch','split'],
  'converging resource vectors': ['multi-factor-convergence','converge'],
  'central model with typed external loops': ['frontier-system-constellation','radial-loop'],
  'many-to-one abstraction': ['symbol-substitution','converge'],
  'ordered positional lattice': ['place-value-grid','grid'],
  'equivalence-preserving transformation': ['algebra-transform','transform'],
  'directed acyclic proof graph': ['deduction-dependency','dag'],
  'continuous curve with coupled local/global measures': ['rate-accumulation-dual','dual-curve'],
  'bounded operation set': ['capability-envelope','boundary'],
  'fixed executor with interchangeable program stream': ['instruction-stream','stream'],
  'expression-to-gate-network mapping': ['logic-circuit-translation','mapping'],
  'state machine plus self-reference loop': ['state-tape-counterexample','counterexample-loop'],
  'shared memory cyclic dataflow': ['stored-program-cycle','cycle'],
  'fact-rule inference network': ['rule-activation-network','dag'],
  'coverage versus maintenance burden': ['maintenance-complexity-growth','dual-growth'],
  'train/test distribution split': ['generalization-split','split'],
  'closed-loop parameter update with validation side-channel': ['optimization-feedback-loop','cycle-sidechannel'],
  'non-separable space remapped by hidden representation': ['xor-space-remap','remap'],
  'fixed benchmark with measured gap': ['benchmark-gap-reveal','benchmark'],
  'serial dependency chain versus parallel interaction matrix': ['parallel-attention-race','race'],
  'shared pretrained hub with adaptation branches': ['pretraining-adaptation-hub','hub'],
  'constrained resource surface': ['compute-budget-allocation','surface'],
  'shared base across tasks and modalities': ['foundation-reuse-lattice','lattice'],
  'three independent constraint axes': ['constraint-triangle','constraint-field'],
  'branching search tree with evaluator feedback': ['search-prune-verify','tree-feedback'],
  'multi-timescale memory hierarchy': ['memory-tier-flow','tiers'],
  'branching latent dynamics under actions': ['latent-world-rollout','rollout'],
  'closed-loop agent-environment control': ['embodied-sense-plan-act','control-loop']
});

export const SUPPORTED_FROM_CAVE_TOPOLOGIES = Object.freeze(Object.keys(RECIPES));
const clamp = value => Math.max(0, Math.min(1, value));
const point = (x,y) => Object.freeze({x:Number(x.toFixed(4)), y:Number(y.toFixed(4))});

function linearSlots(count, portrait) {
  return Array.from({length:count}, (_,i) => portrait ? point(0.5, 0.12 + i * (0.76 / Math.max(1,count-1))) : point(0.12 + i * (0.76 / Math.max(1,count-1)), 0.5));
}
function radialSlots(count, portrait) {
  const rx = portrait ? 0.30 : 0.36, ry = portrait ? 0.31 : 0.28;
  return Array.from({length:count}, (_,i) => {const a=-Math.PI/2 + i*2*Math.PI/count; return point(0.5+Math.cos(a)*rx,0.5+Math.sin(a)*ry);});
}
function splitSlots(count, portrait) {
  return Array.from({length:count}, (_,i) => {const side=i%2, row=Math.floor(i/2); return portrait ? point(0.28+side*0.44,0.23+row*0.24) : point(0.22+side*0.56,0.27+row*0.23);});
}
function gridSlots(count, portrait) {
  const cols=portrait?2:3; return Array.from({length:count},(_,i)=>point(0.2+(i%cols)*(0.6/Math.max(1,cols-1)),0.25+Math.floor(i/cols)*0.28));
}
function slotsFor(style,count,portrait){
  if(['radial-loop','converge','hub','constraint-field'].includes(style)) return radialSlots(count,portrait);
  if(['split','race','dual-curve','dual-growth','cycle-sidechannel','remap','mapping'].includes(style)) return splitSlots(count,portrait);
  if(['grid','surface','lattice','benchmark'].includes(style)) return gridSlots(count,portrait);
  return linearSlots(count,portrait);
}

export function compileFromCaveMechanism(concept, {orientation='horizontal',localSeconds=0,durationSeconds=15,reducedMotion=false}={}) {
  const recipe = RECIPES[concept?.topology];
  if (!recipe) throw new Error(`from-cave mechanism: unsupported topology ${concept?.topology}`);
  if (!['horizontal','vertical'].includes(orientation)) throw new Error(`from-cave mechanism: invalid orientation ${orientation}`);
  if (!Number.isFinite(localSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('from-cave mechanism: invalid time');
  const portrait = orientation === 'vertical';
  const progress = reducedMotion ? 1 : clamp(localSeconds / durationSeconds);
  const cues = concept.cues.map(String);
  const positions = slotsFor(recipe[1], cues.length, portrait);
  const nodes = cues.map((label,index)=>Object.freeze({id:`cue-${index}`,label,position:positions[index],active:reducedMotion || progress >= index / Math.max(1,cues.length)}));
  const edges = [];
  if (['radial-loop','hub','converge','constraint-field'].includes(recipe[1])) {
    for (let i=0;i<nodes.length;i++) edges.push(Object.freeze({from:nodes[i].id,to:'core',active:reducedMotion||progress>=(i+1)/nodes.length}));
  } else if (['split','race','dual-curve','dual-growth','cycle-sidechannel','remap','mapping'].includes(recipe[1])) {
    for (let i=0;i+2<nodes.length;i+=2) edges.push(Object.freeze({from:nodes[i].id,to:nodes[i+1].id,active:reducedMotion||progress>=(i+2)/nodes.length}));
  } else {
    for (let i=0;i<nodes.length-1;i++) edges.push(Object.freeze({from:nodes[i].id,to:nodes[i+1].id,active:reducedMotion||progress>=(i+1)/(nodes.length-1)}));
  }
  return Object.freeze({
    mechanismId: recipe[0],
    topology: concept.topology,
    perceptualFamily: concept.perceptual_family,
    style: recipe[1],
    orientation,
    progress,
    reducedMotion,
    core: Object.freeze({id:'core',position:point(0.5,0.5)}),
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    choreography: concept.choreography,
    composition: concept.composition
  });
}
