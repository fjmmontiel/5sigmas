import {areaPartition,budgetAllocation,topicMap,tradeoffMap,algebraProof,learningPhases,evaluationMatrix} from './rich-foundations.mjs';
import {counterfactual,framingShift,objectiveBypass,errorPropagation,verificationMatrix} from './rich-failures.mjs';
import {computeStrategies,tokenExtension,tokenDependency,computePlane} from './rich-compute.mjs';
import {latencyScale,dualTimeline,progressiveDelivery,routingFork,deadlineStates} from './rich-latency.mjs';
import {complexityRegimes,trustBoundary,retrievalSubstitution,stoppingRegions,defenseLayers} from './rich-risk.mjs';
import {syncedCandidates,tree} from './reasoning.mjs';

/** Families group perceptually related choreography, NOT arbitrary component names. */
export const MECHANISMS=Object.freeze({
 area:{family:'area-partition',render:areaPartition,topology:'cell-grid -> two exact subareas -> equality'},
 budget:{family:'resource-allocation',render:budgetAllocation,topology:'conserved resource tokens -> three sinks'},
 topics:{family:'relationship-map',render:topicMap,topology:'stable central concept with satellite relations'},
 tradeoffs:{family:'relationship-map',render:tradeoffMap,topology:'stable named vertices with relations'},
 proof:{family:'symbolic-rewrite',render:algebraProof,topology:'expression -> factorization -> checked equality'},
 training:{family:'phase-comparison',render:learningPhases,topology:'mutable weight grid vs frozen weight grid'},
 experiment:{family:'evaluation-matrix',render:evaluationMatrix,topology:'conditions x probes with unknown outcomes'},
 counterfactual:{family:'controlled-contrast',render:counterfactual,topology:'fixed shape, changed irrelevant background, contrasted outcomes'},
 framing:{family:'controlled-contrast',render:framingShift,topology:'fixed document, opposed framing, qualitative outcome shift'},
 proxy:{family:'objective-bypass',render:objectiveBypass,topology:'unchanged board, legal path vs bypassed win flag'},
 propagation:{family:'symbolic-rewrite',render:errorPropagation,topology:'wrong intermediate value -> wrong result -> corrected dependency'},
 verification:{family:'evaluation-matrix',render:verificationMatrix,topology:'test variants x responses with external verification'},
 levers:{family:'compute-comparison',render:computeStrategies,topology:'serial, parallel and branching compute side by side'},
 extension:{family:'token-sequence',render:tokenExtension,topology:'token sequence -> end suppressed -> continuation inserted'},
 candidates:{family:'candidate-aggregation',render:syncedCandidates,topology:'fan-out -> evaluation and vote -> separate sourced evidence'},
 search:{family:'branching-search',render:tree,topology:'expand -> evaluate -> prune branches -> select'},
 dependency:{family:'token-sequence',render:tokenDependency,topology:'serial token readiness -> duration from rate'},
 computePlane:{family:'allocation-plane',render:computePlane,topology:'model size x per-query compute conceptual decision plane'},
 scale:{family:'log-time-scale',render:latencyScale,topology:'logarithmic time thresholds -> interaction behavior'},
 clocks:{family:'parallel-timeline',render:dualTimeline,topology:'two first-token onsets, shared final endpoint'},
 delivery:{family:'progressive-delivery',render:progressiveDelivery,topology:'hidden work -> progressively delivered visible response'},
 router:{family:'branching-search',render:routingFork,topology:'query -> decision -> distinct capacity routes'},
 deadline:{family:'deadline-state-machine',render:deadlineStates,topology:'running -> completion or timeout -> explicit fallback'},
 regimes:{family:'qualitative-regimes',render:complexityRegimes,topology:'low, medium, high complexity with qualitative trends'},
 injection:{family:'trust-boundary',render:trustBoundary,topology:'untrusted document crosses authority boundary -> API effect'},
 retrieval:{family:'retrieval-substitution',render:retrievalSubstitution,topology:'retrieved document substitution -> refusal -> availability impact'},
 stopping:{family:'stopping-regions',render:stoppingRegions,topology:'continue between boundaries -> stop above/below'},
 barriers:{family:'trust-boundary',render:defenseLayers,topology:'distinct permission/context/action boundaries bound consequences'},
});

const entry=(mechanism,layout,rationale)=>Object.freeze({mechanism,layout,rationale});
export const SERIES_SCENES=Object.freeze({
 'modelos-razonadores-intro':{
  process:entry('area','split','A distributive area makes decomposition concrete; arithmetic is exact and marked illustrative.'),
  budget:entry('budget','reverse','A finite pool visibly goes to operations rather than an invented quality curve.'),
  roadmap:entry('topics','split','An editorial map presents related questions without implying a causal order.'),
  tradeoff:entry('tradeoffs','reverse','Named qualitative relations show simultaneous constraints without invented metrics.')},
 'que-es-razonar':{
  definition:entry('proof','split','Checkable algebra demonstrates transformations without asserting human cognition.'),
  training:entry('training','reverse','Contrasting mutable and frozen weights distinguishes training from per-query work.'),
  benchmark:entry('candidates','split','Sampling and voting are operations; the benchmark appears only with its evidence cue.'),
  limits:entry('experiment','reverse','An experiment matrix keeps task, budget and verification distinct; unknowns stay unknown.')},
 'fallos-modelos-razonadores':{
  shortcut:entry('counterfactual','split','Hold the shape fixed and change the background to expose a superficial cue.'),
  'systematic-bias':entry('framing','reverse','Hold the evaluated document fixed while framing changes the qualitative feedback direction.'),
  gaming:entry('proxy','split','The board stays unchanged while the proxy win flag changes, exposing objective mismatch.'),
  propagation:entry('propagation','reverse','Correcting an arithmetic premise changes the dependent result, not just a colored status.'),
  verification:entry('verification','split','Crossing perturbations with outputs reveals disagreement and unverified conditions.')},
 'test-time-compute':{
  intro:entry('levers','split','Compare serial, parallel and structured compute geometrically.'),
  pipeline:entry('training','reverse','Reuse is justified: this chapter explicitly compares training and inference budgets.'),
  steps:entry('extension','split','Show end suppression and continuation as operations on a token stream.'),
  candidates:entry('candidates','split','Reuse is justified: the mechanism is explicitly best-of-N vs majority voting.'),
  tree:entry('search','reverse','Branch expansion and pruning are the mechanism itself, not a decorative list.'),
  duration:entry('dependency','split','Token readiness expresses serial dependency; duration is computed from tokens and rate.'),
  allocation:entry('computePlane','reverse','Independent model-size and inference-budget decisions occupy different axes.')},
 'latencia-streaming':{
  thresholds:entry('scale','split','A labeled logarithmic time axis represents the stated orders of magnitude honestly.'),
  ttft:entry('clocks','reverse','Parallel timelines keep total time constant while first-token onset differs.'),
  streaming:entry('delivery','split','A response panel becomes readable during generation, showing perceptual progress.'),
  routing:entry('router','reverse','A branching decision routes a query to different capacity choices.'),
  policy:entry('deadline','split','Completion and timeout are explicit alternate states with recovery, not another checklist.')},
 'riesgos-modelos-razonadores':{
  overthinking:entry('regimes','reverse','Separate qualitative regimes without inventing numerical experiment results.'),
  'indirect-injection':entry('injection','split','Content crossing an authority boundary explains the failure route without an attack payload.'),
  taborag:entry('retrieval','reverse','Substitution of retrieved context changes availability for a benign query.'),
  'risk-control':entry('stopping','split','Upper/lower stopping regions explain why neither endless continuation nor blanket stopping works.'),
  guardrails:entry('barriers','reverse','Different boundaries constrain different actions and failure consequences.')},
});
const CANONICAL_ARTICLES=Object.freeze({'00_presentacion_serie':'modelos-razonadores-intro','01-que-es-razonar':'que-es-razonar','02-fallos':'fallos-modelos-razonadores','03-test-time-compute':'test-time-compute','04-latencia-streaming':'latencia-streaming','05-riesgos':'riesgos-modelos-razonadores'});
export function canonicalVideoKey(spec){const path=String(spec.articlePath||'');const stem=path.split('/').at(-1)?.replace(/\.md$/,'');return CANONICAL_ARTICLES[stem]||String(spec.id||'').replace(/-(es|en)$/,'');}
export function designForScene(spec,scene){const key=canonicalVideoKey(spec);const plan=scene.visualDesign||SERIES_SCENES[key]?.[scene.id];if(!plan){if(spec.visualIdentity?.unit==='modelos-razonadores')throw new Error(`Missing semantic design: ${key}/${scene.id}`);return null;}const mechanism=MECHANISMS[plan.mechanism];if(!mechanism)throw new Error(`Missing registered mechanism: ${plan.mechanism}`);return {...plan,family:mechanism.family,topology:mechanism.topology,concept:`${key}/${scene.id}`};}
export function visualFamilyForScene(spec,scene){return designForScene(spec,scene)?.family||null;}
export function visualFamilyInventory(spec){return spec.scenes.map(scene=>({scene:scene.id,...designForScene(spec,scene)}));}
export function selectEditorialRenderer(spec,scene){const design=designForScene(spec,scene);return design?MECHANISMS[design.mechanism].render:null;}
