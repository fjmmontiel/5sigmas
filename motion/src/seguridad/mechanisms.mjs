const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };

const point = (x, y, role, label = null) => Object.freeze({ x, y, role, label });
const edge = (from, to, role = 'flow') => Object.freeze({ from, to, role });
const zone = (x, y, w, h, role, label = null) => Object.freeze({ x, y, w, h, role, label });

function splitCueProgress(cues, localSeconds, durationSeconds, reducedMotion = false) {
  if (reducedMotion) return Object.freeze(cues.map((cue, index) => ({ cue, index, progress: 1, active: false })));
  const span = durationSeconds / Math.max(1, cues.length);
  return Object.freeze(cues.map((cue, index) => {
    const progress = ease((localSeconds - index * span) / Math.max(0.45, span * 0.58));
    return Object.freeze({ cue, index, progress, active: localSeconds >= index * span && localSeconds < (index + 1) * span });
  }));
}

const ORIENT = Object.freeze({
  horizontal: Object.freeze({ w: 1000, h: 800, pad: 64, axis: 'x' }),
  vertical: Object.freeze({ w: 1000, h: 800, pad: 72, axis: 'y' })
});

function layout(orientation) {
  const value = ORIENT[orientation];
  if (!value) throw new Error(`seguridad mechanism: unsupported orientation ${orientation}`);
  return value;
}

function mkPlan(concept, orientation, localSeconds, durationSeconds, reducedMotion, geometry) {
  const cueProgress = splitCueProgress(concept.cues, localSeconds, durationSeconds, reducedMotion);
  return Object.freeze({
    conceptId: concept.id,
    family: concept.perceptual_family,
    topology: concept.topology,
    choreography: concept.choreography,
    composition: concept.composition,
    orientation,
    reducedMotion,
    cueProgress,
    geometry: Object.freeze(geometry)
  });
}

function twoToOne(concept, o) {
  if (o === 'vertical') return {
    nodes: [point(300, 140, 'input', concept.cues[0]), point(700, 140, 'input', concept.cues[1]), point(500, 430, 'context', concept.cues[2]), point(500, 680, 'decision')],
    edges: [edge(0, 2), edge(1, 2), edge(2, 3)]
  };
  return {
    nodes: [point(150, 250, 'input', concept.cues[0]), point(150, 550, 'input', concept.cues[1]), point(500, 400, 'context', concept.cues[2]), point(850, 400, 'decision')],
    edges: [edge(0, 2), edge(1, 2), edge(2, 3)]
  };
}

function directedPath(concept, o) {
  const n = Math.max(3, concept.cues.length + 1);
  const nodes = [];
  if (o === 'vertical') {
    for (let i = 0; i < n; i += 1) nodes.push(point(500, 120 + i * (560 / (n - 1)), i === 0 ? 'source' : i === n - 1 ? 'effect' : 'state', concept.cues[i] ?? null));
  } else {
    for (let i = 0; i < n; i += 1) nodes.push(point(120 + i * (760 / (n - 1)), 400, i === 0 ? 'source' : i === n - 1 ? 'effect' : 'state', concept.cues[i] ?? null));
  }
  return { nodes, edges: nodes.slice(1).map((_, i) => edge(i, i + 1)) };
}

function orderedLevels(concept, o) {
  const levels = Math.max(3, concept.cues.length);
  const nodes = [];
  for (let i = 0; i < levels; i += 1) {
    const x = o === 'vertical' ? 500 : 190 + i * (620 / Math.max(1, levels - 1));
    const y = o === 'vertical' ? 660 - i * (480 / Math.max(1, levels - 1)) : 620 - i * 110;
    nodes.push(point(x, y, i === levels - 1 ? 'high_privilege' : 'level', concept.cues[i] ?? null));
  }
  return { nodes, edges: nodes.slice(1).map((_, i) => edge(i, i + 1, 'evidence_required')) };
}

function branchAndRejoin(concept, o) {
  const source = point(o === 'vertical' ? 500 : 120, o === 'vertical' ? 110 : 400, 'source');
  const effect = point(o === 'vertical' ? 500 : 880, o === 'vertical' ? 700 : 400, 'effect');
  const branches = concept.cues.slice(0, 3).map((cue, i) => o === 'vertical' ? point(240 + i * 260, 400, 'branch', cue) : point(500, 170 + i * 230, 'branch', cue));
  const nodes = [source, ...branches, effect];
  const edges = branches.flatMap((_, i) => [edge(0, i + 1, 'branch'), edge(i + 1, nodes.length - 1, 'rejoin')]);
  return { nodes, edges };
}

function graphCut(concept, o) {
  const base = directedPath({...concept, cues: ['origin', 'influence', 'authorization', 'effect']}, o);
  const zones = o === 'vertical'
    ? [zone(100, 300, 800, 70, 'cut', concept.cues[0]), zone(100, 530, 800, 70, 'cut', concept.cues[1])]
    : [zone(345, 90, 55, 620, 'cut', concept.cues[0]), zone(650, 90, 55, 620, 'cut', concept.cues[1])];
  return {...base, zones};
}

function stackedInfluences(concept, o) {
  const count = Math.max(3, concept.cues.length);
  const zones = [];
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    if (o === 'vertical') zones.push(zone(150, 130 + i * 145, 700, 105, 'context_layer', concept.cues[i] ?? `layer_${i + 1}`));
    else zones.push(zone(100, 135 + i * 150, 560, 105, 'context_layer', concept.cues[i] ?? `layer_${i + 1}`));
  }
  nodes.push(point(o === 'vertical' ? 500 : 820, o === 'vertical' ? 680 : 400, 'decision_axis'));
  return { zones, nodes };
}

function rankedCandidates(concept, o) {
  const nodes = [];
  const selected = [];
  for (let i = 0; i < 6; i += 1) {
    const x = o === 'vertical' ? 260 + (i % 2) * 480 : 170 + (i % 3) * 270;
    const y = o === 'vertical' ? 150 + Math.floor(i / 2) * 150 : 190 + Math.floor(i / 3) * 250;
    nodes.push(point(x, y, i === 4 ? 'hostile_candidate' : 'candidate', `d${i + 1}`));
    if (i < 3) selected.push(i);
  }
  return { nodes, selected, zones: [zone(o === 'vertical' ? 160 : 90, o === 'vertical' ? 610 : 590, o === 'vertical' ? 680 : 820, 100, 'top_k', concept.cues[1] ?? 'top_k')] };
}

function manyFormsOneIntent(concept, o) {
  const leftX = o === 'vertical' ? 210 : 110;
  const filterX = o === 'vertical' ? 500 : 500;
  const rightX = o === 'vertical' ? 790 : 880;
  const nodes = concept.cues.slice(0, 3).map((cue, i) => point(leftX, 210 + i * 180, 'variant', cue));
  nodes.push(point(filterX, 400, 'surface_filter'), point(rightX, 400, 'intent'));
  return { nodes, edges: concept.cues.slice(0, 3).flatMap((_, i) => [edge(i, 3, 'rewrite'), edge(3, 4, 'semantic_intent')]) };
}

function twoDomainsBridge(concept, o) {
  if (o === 'vertical') return {
    zones: [zone(140, 110, 720, 220, 'untrusted_domain', concept.cues[0]), zone(140, 500, 720, 220, 'privileged_domain', concept.cues.at(-1))],
    nodes: [point(500, 410, 'validated_contract', concept.cues[1])],
    edges: [edge('untrusted_domain', 0, 'validated_only'), edge(0, 'privileged_domain', 'authorized_only')]
  };
  return {
    zones: [zone(80, 180, 330, 440, 'untrusted_domain', concept.cues[0]), zone(590, 180, 330, 440, 'privileged_domain', concept.cues.at(-1))],
    nodes: [point(500, 400, 'validated_contract', concept.cues[1])],
    edges: [edge('untrusted_domain', 0, 'validated_only'), edge(0, 'privileged_domain', 'authorized_only')]
  };
}

function stateSpace(concept, o) {
  const nodes = [point(o === 'vertical' ? 500 : 130, o === 'vertical' ? 120 : 400, 'origin', concept.cues[0])];
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const rx = o === 'vertical' ? 300 : 330, ry = o === 'vertical' ? 235 : 270;
    nodes.push(point(500 + Math.cos(angle) * rx, 430 + Math.sin(angle) * ry, i === 3 ? 'boundary_candidate' : 'candidate', i < concept.cues.length ? concept.cues[i] : null));
  }
  return { nodes, edges: nodes.slice(1).map((_, i) => edge(0, i + 1, 'explore')) };
}

function sourceOptimizeFanout(concept, o) {
  const src = point(o === 'vertical' ? 500 : 110, o === 'vertical' ? 110 : 400, 'source');
  const opt = point(o === 'vertical' ? 500 : 450, o === 'vertical' ? 360 : 400, 'optimizer', concept.cues[0]);
  const targets = [0,1,2].map(i => o === 'vertical' ? point(240 + i * 260, 680, 'target', concept.cues[i + 1] ?? `target_${i + 1}`) : point(820, 210 + i * 190, 'target', concept.cues[i + 1] ?? `target_${i + 1}`));
  const nodes = [src, opt, ...targets];
  return { nodes, edges: [edge(0,1,'optimize'), ...targets.map((_,i)=>edge(1,i+2,'transfer'))] };
}

function continuousAxis(concept, o) {
  const axis = o === 'vertical' ? [[170,650],[830,650]] : [[130,560],[870,560]];
  const markers = [0.08,0.5,0.92].map((q,i)=>point(axis[0][0]+(axis[1][0]-axis[0][0])*q, axis[0][1], 'budget_marker', concept.cues[i] ?? null));
  return { paths: [axis], nodes: markers, zones: [zone(160,180,680,230,'coverage_region')] };
}

function finiteStateMachine(concept, o) {
  const labels = concept.cues.length >= 4 ? concept.cues.slice(0,4) : [...concept.cues, 'terminal'].slice(0,4);
  const nodes = labels.map((label,i)=>o==='vertical'?point(500,120+i*185,i===3?'terminal':'state',label):point(140+i*240,400,i===3?'terminal':'state',label));
  return { nodes, edges: nodes.slice(1).map((_,i)=>edge(i,i+1,i===1?'external_control':'transition')) };
}

function cycleWithExit(concept, o) {
  const center = [500,390], r = o === 'vertical' ? 250 : 255;
  const nodes = concept.cues.slice(0,4).map((cue,i)=>{const a=-Math.PI/2+i*Math.PI/2;return point(center[0]+Math.cos(a)*r,center[1]+Math.sin(a)*r,'lifecycle',cue);});
  nodes.push(point(o==='vertical'?500:860,o==='vertical'?730:660,'revocation_exit'));
  return {nodes,edges:[edge(0,1),edge(1,2),edge(2,3),edge(3,0),edge(3,4,'revoke')]};
}

function twoDimensionalSpace(concept) {
  return {
    paths: [[[160,650],[840,650]],[[160,650],[160,150]]],
    nodes: [point(700,250,'high_relevance_low_trust',concept.cues[2]), point(360,360,'reference'), point(650,500,'candidate')],
    axes: Object.freeze({ x: concept.cues[0], y: concept.cues[1] })
  };
}

function oneToManyDag(concept, o) {
  const src=point(o==='vertical'?500:140,o==='vertical'?120:400,'origin',concept.cues[0]);
  const children=[0,1,2,3].map(i=>o==='vertical'?point(180+(i%2)*640,380+Math.floor(i/2)*250,'derived',concept.cues[1]??'derived'):point(500+(i%2)*330,230+Math.floor(i/2)*330,'derived',concept.cues[1]??'derived'));
  return {nodes:[src,...children],edges:children.map((_,i)=>edge(0,i+1,'propagate')),zones:[zone(o==='vertical'?150:760,o==='vertical'?690:120,o==='vertical'?700:170,o==='vertical'?70:560,'revocation',concept.cues[2])]};
}

function parallelLanes(concept, o, laneCount=2) {
  const zones=[];
  for(let i=0;i<laneCount;i+=1){
    if(o==='vertical') zones.push(zone(120,130+i*(560/laneCount),760,(500/laneCount)-25,'lane',concept.cues[i]??`lane_${i+1}`));
    else zones.push(zone(120,140+i*(520/laneCount),760,(460/laneCount)-25,'lane',concept.cues[i]??`lane_${i+1}`));
  }
  return {zones};
}

function attributesToDecision(concept, o) {
  const attrs=concept.cues.slice(0,4).map((cue,i)=>o==='vertical'?point(220+(i%2)*560,180+Math.floor(i/2)*180,'attribute',cue):point(180,180+i*145,'attribute',cue));
  const decision=point(o==='vertical'?500:780,o==='vertical'?650:400,'authorization_result');
  return {nodes:[...attrs,decision],edges:attrs.map((_,i)=>edge(i,attrs.length,'project'))};
}

function constraintsToPath(concept, o) {
  const center=point(500,400,'test_path');
  const ring=concept.cues.slice(0,4).map((cue,i)=>{const a=-Math.PI/2+i*Math.PI/2;return point(500+Math.cos(a)*(o==='vertical'?290:330),400+Math.sin(a)*250,'constraint',cue);});
  return {nodes:[center,...ring],edges:ring.map((_,i)=>edge(i+1,0,'bind'))};
}

function feedbackLoopAudit(concept, o) {
  const attacker=point(o==='vertical'?330:280,o==='vertical'?360:390,'attacker',concept.cues[0]);
  const grader=point(o==='vertical'?670:640,o==='vertical'?360:390,'grader',concept.cues[1]);
  const audit=point(500,o==='vertical'?680:650,'audit',concept.cues[2]);
  return {nodes:[attacker,grader,audit],edges:[edge(0,1,'optimize'),edge(1,0,'feedback'),edge(1,2,'audit')]};
}

function linearTraceEvidence(concept, o) {
  const n=Math.max(5,concept.cues.length);
  const nodes=[];const evidence=[];
  for(let i=0;i<n;i+=1){
    const x=o==='vertical'?360:120+i*(760/Math.max(1,n-1));
    const y=o==='vertical'?120+i*(560/Math.max(1,n-1)):360;
    nodes.push(point(x,y,'trace',concept.cues[i]??`step_${i+1}`));
    evidence.push(point(o==='vertical'?690:x,o==='vertical'?y:y+180,'evidence_pin'));
  }
  return {nodes:[...nodes,...evidence],edges:nodes.slice(1).map((_,i)=>edge(i,i+1,'trace'))};
}

function manyObservationsContract(concept,o){
  const obs=[0,1,2].map(i=>o==='vertical'?point(220+i*280,190,'observation',concept.cues[0]):point(140,210+i*190,'observation',concept.cues[0]));
  const normalize=point(500,420,'normalize',concept.cues[1]);
  const contract=point(o==='vertical'?500:850,o==='vertical'?690:420,'fixture',concept.cues[2]);
  return {nodes:[...obs,normalize,contract],edges:[...obs.map((_,i)=>edge(i,3,'capture')),edge(3,4,'lock')]};
}

function setAllocation(concept,o){
  const tools=[0,1,2].map(i=>o==='vertical'?zone(150,150+i*180,700,120,'tool',`tool_${i+1}`):zone(120,170+i*170,760,110,'tool',`tool_${i+1}`));
  const scopes=concept.cues.slice(0,3).map((cue,i)=>point(o==='vertical'?760:760,o==='vertical'?210+i*180:225+i*170,'scope',cue));
  return {zones:tools,nodes:scopes};
}

function sequentialGates(concept,o){
  const nodes=[];
  for(let i=0;i<concept.cues.length;i+=1)nodes.push(o==='vertical'?point(500,140+i*(520/Math.max(1,concept.cues.length-1)),'gate',concept.cues[i]):point(140+i*(720/Math.max(1,concept.cues.length-1)),400,'gate',concept.cues[i]));
  return {nodes,edges:nodes.slice(1).map((_,i)=>edge(i,i+1,'validate'))};
}

function controlsArtifactsMatrix(concept,o){
  const rows=Math.max(3,concept.cues.length), cols=3, cells=[];
  const x0=o==='vertical'?180:180,y0=180,cw=o==='vertical'?210:215,ch=105;
  for(let r=0;r<rows;r+=1)for(let c=0;c<cols;c+=1)cells.push(zone(x0+c*cw,y0+r*ch,cw-14,ch-14,'evidence_cell',r===0?concept.cues[c]??null:null));
  return {zones:cells,nodes:[point(o==='vertical'?500:860,o==='vertical'?700:690,'release_state',concept.cues.at(-1))]};
}

const BUILDERS = Object.freeze({
  two_to_one_merge: twoToOne,
  directed_path: directedPath,
  ordered_levels: orderedLevels,
  branch_and_rejoin: branchAndRejoin,
  graph_cut: graphCut,
  stacked_influences: stackedInfluences,
  ranked_candidates_to_top_k: rankedCandidates,
  many_forms_one_intent: manyFormsOneIntent,
  two_domains_single_validated_bridge: twoDomainsBridge,
  state_space: stateSpace,
  source_optimize_then_fanout: sourceOptimizeFanout,
  continuous_axis: continuousAxis,
  finite_state_machine: finiteStateMachine,
  cycle_with_exit: cycleWithExit,
  two_dimensional_space: twoDimensionalSpace,
  one_to_many_dag: oneToManyDag,
  two_parallel_lanes: (c,o)=>parallelLanes(c,o,2),
  attributes_to_decision: attributesToDecision,
  constraints_to_path: constraintsToPath,
  three_parallel_lanes: (c,o)=>parallelLanes(c,o,3),
  feedback_loop_with_external_audit: feedbackLoopAudit,
  linear_trace_with_evidence_nodes: linearTraceEvidence,
  many_observations_to_contract: manyObservationsContract,
  set_allocation: setAllocation,
  sequential_gates: sequentialGates,
  controls_by_artifacts_matrix: controlsArtifactsMatrix
});

export const SUPPORTED_SEGURIDAD_TOPOLOGIES = Object.freeze(Object.keys(BUILDERS).sort());

export function compileSeguridadMechanism(concept, {orientation='horizontal', localSeconds=0, durationSeconds=12, reducedMotion=false}={}) {
  layout(orientation);
  if (!concept || typeof concept.id !== 'string') throw new Error('seguridad mechanism: concept id required');
  if (!Array.isArray(concept.cues) || concept.cues.length < 2) throw new Error(`seguridad mechanism: ${concept.id} requires semantic cues`);
  const builder = BUILDERS[concept.topology];
  if (!builder) throw new Error(`seguridad mechanism: no semantic builder for ${concept.id} topology=${concept.topology}`);
  const geometry = builder(concept, orientation);
  return mkPlan(concept, orientation, localSeconds, durationSeconds, reducedMotion, geometry);
}
