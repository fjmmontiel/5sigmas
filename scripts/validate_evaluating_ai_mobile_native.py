#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
VISUALS={
"01":(ROOT/"docs/snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html","s5v-eval-boundary__scroll",["change->diagnostic-boundary","boundary->diagnose","trial->trajectory->outcome","outcome->confirm"]),
"02":(ROOT/"docs/snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html","s5v-eval-dataset__scroll",["sources->provenance->grouping","grouping->banks","banks->release","hard-pair->boundary","leakage->trust","production-failure->next-version"]),
"03":(ROOT/"docs/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html","jc-scroll",["construct->rubric->calibration->judge","item->blind->independent-ratings","probes->llm","labels->diagnostics","diagnostics->scope"]),
"04":(ROOT/"docs/snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html","at-scroll",["task->observation->decision","decision->policy-gate","tool-result->state-or-failure","failure->recovery","state->stop->outcome","trajectory+outcome->release"]),
"05":(ROOT/"docs/snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html","oe-scroll",["candidate->offline->shadow","shadow->canary","canary->ab->rollout","evidence+guardrails->gate","gate->decision"]),
"06":(ROOT/"docs/snippets/articulos-tecnicos/eval-production-feedback-loop.html","fb-scroll",["signals->reconstruct->taxonomy","insufficient->instrumentation->signals","reproducible->eval","eval->repair->release","deploy->verify->signals","failure+eval+release->receipts"])}
def inspect(text,scroller,rels):
 f=[]
 if 'data-mobile-native="true"' not in text:f.append("MOBILE_NATIVE_PROJECTION_MISSING")
 if 'data-series5-mobile-native-style="true"' not in text:f.append("MOBILE_NATIVE_STYLE_MISSING")
 if 'data-mobile-node=' not in text or 'data-mobile-edge=' not in text:f.append("MOBILE_DIRECTED_TOPOLOGY_MISSING")
 if 's5v-mobile-native__index' in text or 'grid-template-columns:1.7rem' in text:f.append("MOBILE_CARD_LIST_FALLBACK_FORBIDDEN")
 if f".{scroller}" not in text or "display:none!important" not in text:f.append("MOBILE_LEGACY_CANVAS_NOT_HIDDEN")
 if 's5v-locale-es' not in text or 's5v-locale-en' not in text or 'html[lang^="en"]' not in text:f.append("MOBILE_LOCALE_PARITY_MISSING")
 for rel in rels:
  if text.count(f'data-mobile-relationship="{rel}"')!=1:f.append(f"RELATIONSHIP_MISSING_OR_DUPLICATED:{rel}")
 if text.count("data-mobile-node=")<len(rels)*2:f.append("MOBILE_NODE_COVERAGE_TOO_LOW")
 if text.count("data-mobile-edge=")<len(rels):f.append("MOBILE_EDGE_COVERAGE_TOO_LOW")
 return f
def self_test():
 old='<style>.old-scroll{display:none!important}</style><div data-mobile-native="true"><span class="s5v-mobile-native__index">1</span></div>'
 f=inspect(old,"old-scroll",["a->b"])
 assert "MOBILE_CARD_LIST_FALLBACK_FORBIDDEN" in f and "MOBILE_DIRECTED_TOPOLOGY_MISSING" in f
def main():
 ap=argparse.ArgumentParser();ap.add_argument("--self-test",action="store_true");a=ap.parse_args()
 if a.self_test:self_test();print("mobile-native topology gate self-test: PASS");return 0
 bad=False
 for ch,(path,scroll,rels) in VISUALS.items():
  findings=inspect(path.read_text(encoding="utf-8"),scroll,rels)
  if findings:
   bad=True
   for x in findings:print(f"CH{ch} {x}")
  else:print(f"CH{ch} MOBILE_NATIVE_DIRECTED_RELATIONSHIPS_PASS")
 print(f"MOBILE_NATIVE_SOURCE_PASS={'false' if bad else 'true'}")
 return 1 if bad else 0
if __name__=="__main__":raise SystemExit(main())
