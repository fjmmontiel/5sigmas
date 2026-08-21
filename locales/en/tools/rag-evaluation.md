---
title: RAG Evaluation — context, faithfulness, correctness and coverage
description: Evaluate a RAG pipeline by separating context relevance, answer faithfulness, correctness against a reference and coverage, with visible weights and uncertainty intervals.
keywords: RAG evaluation, RAGAS, RAG faithfulness, context relevance, answer correctness, RAG hallucination, LLM evaluation
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-rag-evaluation.css" />
<script src="/assets/javascripts/tools/rag-evaluation-core.js" defer></script>
<script src="/assets/javascripts/tools/rag-evaluation.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "RAG Evaluation — 5sigmas",
  "url": "https://5sigmas.com/en/tools/rag-evaluation/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive playground for separating retrieval, faithfulness, correctness and coverage when evaluating a RAG system.",
  "featureList": ["Context relevance", "Claim-level faithfulness", "Correctness against a reference", "Reference coverage", "Visible weights", "Wilson intervals", "Shareable scenario and JSON"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-rag-evaluation data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · RAG · 08</div>
  <h1>Locate the failure: retrieval, faithfulness, correctness or coverage.</h1>
  <p>Label a synthetic set of contexts and claims to see each evaluation dimension change independently. The goal is not a single magic number; it is to distinguish poor evidence retrieval from unsupported generation, incorrect answers and missing reference facts.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Evaluation dimensions">
  <div><small>Context</small><strong>is the retrieved evidence relevant?</strong></div>
  <div><small>Faithfulness</small><strong>is each answer claim supported?</strong></div>
  <div><small>Answer</small><strong>is it correct and sufficiently complete?</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="RAG evaluation scenario" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Reference and coverage</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-rag-eval-en-ref">Facts in reference</label><input id="s5-rag-eval-en-ref" data-field="referenceFacts" type="number" min="1" max="100" step="1" value="4" /></div>
        <div class="s5-tool-field"><label for="s5-rag-eval-en-covered">Reference facts covered by answer</label><input id="s5-rag-eval-en-covered" data-field="coveredFacts" type="number" min="0" max="100" step="1" value="3" /><small>Coverage measures completeness, not faithfulness.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Composite-score weights</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-rag-eval-en-wc">Context</label><input id="s5-rag-eval-en-wc" data-field="wContext" type="number" min="0" max="100" step="5" value="25" /></div>
        <div class="s5-tool-field"><label for="s5-rag-eval-en-wf">Faithfulness</label><input id="s5-rag-eval-en-wf" data-field="wFaithfulness" type="number" min="0" max="100" step="5" value="30" /></div>
        <div class="s5-tool-field"><label for="s5-rag-eval-en-wa">Correctness</label><input id="s5-rag-eval-en-wa" data-field="wCorrectness" type="number" min="0" max="100" step="5" value="30" /></div>
        <div class="s5-tool-field"><label for="s5-rag-eval-en-wv">Coverage</label><input id="s5-rag-eval-en-wv" data-field="wCoverage" type="number" min="0" max="100" step="5" value="15" /></div>
      </div>
      <p class="s5-rag-eval-weight-note">Weights are normalized automatically. The composite score is a configurable decision aid, not a standard metric or a reproduction of RAGAS/ARES.</p>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="RAG evaluation results" aria-live="polite">
    <div class="s5-tool-kpis s5-rag-eval-metrics">
      <div class="s5-tool-kpi"><small>Context relevance</small><strong data-output="contextRelevance">—</strong><span data-output="contextRelevanceInterval">—</span></div>
      <div class="s5-tool-kpi"><small>Faithfulness</small><strong data-output="faithfulness">—</strong><span data-output="faithfulnessInterval">—</span></div>
      <div class="s5-tool-kpi"><small>Correctness</small><strong data-output="answerCorrectness">—</strong><span data-output="answerCorrectnessInterval">—</span></div>
      <div class="s5-tool-kpi"><small>Reference coverage</small><strong data-output="referenceCoverage">—</strong><span data-output="referenceCoverageInterval">—</span></div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Evaluation counts">
      <div><small>Relevant contexts</small><strong data-output="contextCount">—</strong></div>
      <div><small>Supported claims</small><strong data-output="supportCount">—</strong></div>
      <div><small>Correct claims</small><strong data-output="correctCount">—</strong></div>
      <div><small>Reference facts covered</small><strong data-output="coverageCount">—</strong></div>
      <div><small>Weighted score</small><strong data-output="weightedScore">—</strong></div>
    </div>

    <div class="s5-rag-eval-diagnosis">
      <div><small>Diagnosis</small><strong data-output="diagnosis">—</strong></div>
      <div><small>What to inspect next</small><p data-output="diagnosisText">—</p></div>
    </div>
    <p class="s5-rag-eval-weight-note" data-output="weightedRead">—</p>

    <div class="s5-rag-eval-section-head"><div><small>Retrieved evidence</small><h3>Mark whether each passage is relevant to the question.</h3></div><span>6 synthetic passages</span></div>
    <div class="s5-rag-eval-list" data-contexts aria-label="Retrieved contexts"></div>

    <div class="s5-rag-eval-section-head"><div><small>Generated answer</small><h3>Keep evidence support separate from correctness against a reference.</h3></div><span>5 synthetic claims</span></div>
    <div class="s5-rag-eval-list" data-claims aria-label="Answer claims"></div>

    <aside class="s5-tool-source" aria-label="Method provenance">
      <div class="s5-tool-source__head"><a href="https://aclanthology.org/2024.eacl-demo.16/" target="_blank" rel="noopener noreferrer">RAGAS · EACL 2024</a><span>Sources reviewed 2026-08-21</span></div>
      <p>RAGAS separates retrieval and generation dimensions. This playground keeps that separation but uses transparent manual labels instead of an LLM judge so every numerator and denominator remains visible.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-rag-eval-method">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-rag-eval-method">Do not collapse “good answer” into a single cause.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Context relevance</strong> is a deterministic proportion of retrieved passages manually labelled relevant. It isolates the quality of the material that reaches the generator.</p>
    <div class="s5-tool-method__formula">context_relevance = relevant_contexts / retrieved_contexts</div>
    <p><strong>Faithfulness</strong> measures the proportion of answer claims supported by retrieved context. A claim may be true in the world and still be unfaithful to the supplied context if that evidence does not support it.</p>
    <div class="s5-tool-method__formula">faithfulness = supported_claims / answer_claims</div>
    <p><strong>Correctness</strong> uses a separate judgment against a reference or external criterion. This prevents “supported by context” and “correct” from becoming synonyms.</p>
    <div class="s5-tool-method__formula">answer_correctness = correct_claims / answer_claims</div>
    <p><strong>Coverage</strong> measures the fraction of reference facts represented in the answer. A short answer can be perfectly faithful and correct while still being incomplete.</p>
    <div class="s5-tool-method__formula">reference_coverage = covered_reference_facts / reference_facts</div>
    <p><strong>Uncertainty.</strong> Each proportion shows a 95% Wilson interval over the labelled units. An 80% score from five claims is not as stable as 80% from thousands. The interval reflects binomial sample size; it does not calibrate annotator or judge errors.</p>
    <p><strong>Composite score.</strong> If you must rank configurations, combine the four dimensions with explicit weights. The playground normalizes those weights and never presents the resulting score as a standard. If your product requires near-perfect faithfulness, encode that in the weights or, preferably, as a hard gate.</p>
    <div class="s5-rag-eval-caveat"><p><strong>This is not an LLM judge.</strong> RAGAS and ARES automate parts of RAG evaluation with models/judges. Here labels are visible and manipulable so you can study which dimension changes. Production evaluation still requires a representative dataset, annotation criteria, evaluator calibration and human validation.</p></div>
    <p class="s5-tool-method__notes">Sources: <a href="https://aclanthology.org/2024.eacl-demo.16/">Es et al., RAGAS (EACL 2024)</a> and <a href="https://arxiv.org/abs/2311.09476">Saad-Falcon et al., ARES (2023/2024)</a>. Both separate dimensions such as context relevance and faithfulness; ARES also emphasizes calibration with human annotations.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-rag-eval-related">
  <div class="s5-section-head"><h2 id="s5-rag-eval-related">Connect the failure mode to the metric</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/en/tools/rag-retrieval-lab/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">RAG Retrieval Lab</span><span class="s5-list-row__desc">Measure ranking quality with Precision@k, Recall@k, MRR and nDCG before evaluating generation.</span><span class="s5-list-row__meta">Tool</span></a>
    <a class="s5-list-row" href="/en/tools/context-budget/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Context budget</span><span class="s5-list-row__desc">Check how much retrieved context actually fits beside the rest of the prompt.</span><span class="s5-list-row__meta">Tool</span></a>
    <a class="s5-list-row" href="/en/topics/model-evaluation/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Model evaluation</span><span class="s5-list-row__desc">Design the metric from the decision you need to make, not the other way around.</span><span class="s5-list-row__meta">Concept</span></a>
  </div>
</section>

</div>
