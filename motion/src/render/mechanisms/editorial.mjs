import {clamp,phase,smooth,number} from '../paint.mjs';
import {motionValue} from '../../cues.mjs';

const FAMILY_BY_SPEC=Object.freeze({
  'modelos-razonadores-intro': Object.freeze({
    process:'concept-orbit', budget:'budget-balance', roadmap:'chapter-map', tradeoff:'tradeoff-triangle',
  }),
  'que-es-razonar': Object.freeze({
    definition:'reasoning-lenses', training:'training-vs-inference', benchmark:'candidate-evidence', limits:'evaluation-axes',
  }),
  'fallos-modelos-razonadores': Object.freeze({
    shortcut:'spurious-vs-robust', 'systematic-bias':'bias-compass', gaming:'proxy-mismatch', propagation:'contamination-cascade', verification:'verification-ring',
  }),
  'test-time-compute': Object.freeze({
    intro:'compute-levers', pipeline:'training-vs-inference', steps:'thinking-ribbon', candidates:'candidate-evidence', tree:'search-tree', duration:'token-clock', allocation:'adaptive-compute-matrix',
  }),
  'latencia-streaming': Object.freeze({
    thresholds:'latency-scale', ttft:'dual-clock-timeline', streaming:'stream-wave', routing:'router-fork', policy:'latency-control-loop',
  }),
  'riesgos-modelos-razonadores': Object.freeze({
    overthinking:'complexity-curve', 'indirect-injection':'trust-boundary-flow', taborag:'retrieval-poison-split', 'risk-control':'confidence-band', guardrails:'defense-layers',
  }),
});

const CUSTOM=Object.freeze({
  'concept-orbit':conceptOrbit,
  'budget-balance':budgetBalance,
  'chapter-map':chapterMap,
  'tradeoff-triangle':tradeoffTriangle,
  'reasoning-lenses':reasoningLenses,
  'training-vs-inference':trainingVsInference,
  'evaluation-axes':evaluationAxes,
  'spurious-vs-robust':spuriousVsRobust,
  'bias-compass':biasCompass,
  'proxy-mismatch':proxyMismatch,
  'contamination-cascade':contaminationCascade,
  'verification-ring':verificationRing,
  'compute-levers':computeLevers,
  'thinking-ribbon':thinkingRibbon,
  'adaptive-compute-matrix':adaptiveComputeMatrix,
  'latency-scale':latencyScale,
  'dual-clock-timeline':dualClockTimeline,
  'stream-wave':streamWave,
  'router-fork':routerFork,
  'latency-control-loop':latencyControlLoop,
  'complexity-curve':complexityCurve,
  'trust-boundary-flow':trustBoundaryFlow,
  'retrieval-poison-split':retrievalPoisonSplit,
  'confidence-band':confidenceBand,
  'defense-layers':defenseLayers,
});

function specKey(spec){return String(spec.id||'').replace(/-(?:es|en)$/,'');}
export function visualFamilyForScene(spec,scene){return FAMILY_BY_SPEC[specKey(spec)]?.[scene.id]||null;}
export function visualFamilyInventory(spec){return spec.scenes.map(scene=>({scene:scene.id,family:visualFamilyForScene(spec,scene)}));}
export function selectEditorialRenderer(spec,scene){const family=visualFamilyForScene(spec,scene);return family?CUSTOM[family]||null:null;}

function mv(s,t,target,fallback=.66){return s.cues?motionValue(s,t,target):phase(t,.7,Math.max(2,s.duration*fallback));}
function alpha(P,q,draw){if(q<=0)return;P.c.save();P.c.globalAlpha*=smooth(clamp(q));draw();P.c.restore();}
function label(P,text,x,y,w,size=24,color=nullECB1äADEHM