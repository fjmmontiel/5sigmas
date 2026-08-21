---
title: RAG Retrieval Lab — Precision@k, Recall@k, MRR and nDCG
description: Explore Precision@k, Recall@k, MRR and nDCG on a visible ranking; test reranking and keep retrieval quality separate from chunking and overlap cost.
keywords: RAG retrieval, precision recall RAG, MRR, nDCG, reranking, RAG chunking, chunk overlap, retrieval evaluation
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-rag-retrieval.css" />
<script src="/assets/javascripts/tools/rag-retrieval-core.js" defer></script>
<script src="/assets/javascripts/tools/rag-retrieval.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "RAG Retrieval Lab — 5sigmas",
  "url": "https://5sigmas.com/en/tools/rag-retrieval-lab/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive lab for understanding retrieval metrics, reranking and the indexing cost of chunk overlap in RAG systems.",
  "featureList": ["Precision@k and Recall@k", "MRR@k and nDCG@k", "Reranking depth", "Chunking and overlap cost", "Shareable scenario and CSV"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-rag-retrieval data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · RAG · 07</div>
  <h1>Measure the ranking you retrieve, not only the final answer.</h1>
  <p>Change <em>k</em>, the relevance threshold and reranking depth on a visible synthetic ranking. Separately, change chunk size and overlap to see how much text you duplicate in the index without pretending that this storage cost predicts semantic retrieval quality.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Key relationships">
  <div><small>Precision@k</small><strong>relevant retrieved ÷ k</strong></div>
  <div><small>Recall@k</small><strong>relevant retrieved ÷ total relevant</strong></div>
  <div><small>nDCG@k</small><strong>graded gain discounted by rank</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="RAG retrieval scenario" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Ranking evaluation</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-rag-en-k">Evaluation k</label><input id="s5-rag-en-k" data-field="k" type="number" min="1" max="12" step="1" value="5" /></div>
        <div class="s5-tool-field"><label for="s5-rag-en-rerank">Candidates reranked</label><input id="s5-rag-en-rerank" data-field="rerankDepth" type="number" min="0" max="12" step="1" value="0" /><small>0 keeps the initial ranking; a larger value reranks only that prefix.</small></div>
        <div class="s5-tool-field"><label for="s5-rag-en-threshold">Minimum grade counted as relevant</label><input id="s5-rag-en-threshold" data-field="relevanceThreshold" type="number" min="1" max="3" step="1" value="1" /></div>
        <div class="s5-tool-field"><label for="s5-rag-en-total">Total relevant items in the qrels</label><input id="s5-rag-en-total" data-field="totalRelevant" type="number" min="1" max="1000" step="1" value="8" /><small>Recall needs a denominator outside the top-k. Use the known relevant count for your query.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Chunking footprint</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-rag-en-corpus">Corpus · tokens</label><input id="s5-rag-en-corpus" data-field="corpusTokens" type="number" min="1" step="1000" value="120000" /></div>
        <div class="s5-tool-field"><label for="s5-rag-en-size">Chunk size · tokens</label><input id="s5-rag-en-size" data-field="chunkSize" type="number" min="1" step="25" value="500" /></div>
        <div class="s5-tool-field"><label for="s5-rag-en-overlap">Overlap · tokens</label><input id="s5-rag-en-overlap" data-field="overlap" type="number" min="0" step="25" value="100" /><small>Must stay below the chunk size.</small></div>
      </div>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export CSV</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Retrieval results" aria-live="polite">
    <div class="s5-tool-kpis s5-rag-metrics">
      <div class="s5-tool-kpi"><small>Precision@k</small><strong data-output="precision">—</strong><span>purity of the top-k</span></div>
      <div class="s5-tool-kpi"><small>Recall@k</small><strong data-output="recall">—</strong><span>coverage of known relevant items</span></div>
      <div class="s5-tool-kpi"><small>MRR@k</small><strong data-output="mrr">—</strong><span>rank of the first relevant item</span></div>
      <div class="s5-tool-kpi"><small>nDCG@k</small><strong data-output="ndcg">—</strong><span>ordering + graded relevance</span></div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Ranking details">
      <div><small>Relevant inside k</small><strong data-output="relevant">—</strong></div>
      <div><small>Estimated chunks</small><strong data-output="chunks">—</strong></div>
      <div><small>Indexed tokens</small><strong data-output="indexedTokens">—</strong></div>
      <div><small>Overlap duplication</small><strong data-output="duplication">—</strong></div>
      <div><small>Stride</small><strong data-output="stride">—</strong></div>
    </div>

    <div class="s5-rag-readout">
      <div><small>Metric reading</small><strong data-output="metricRead">—</strong></div>
      <div><small>Chunking reading</small><strong data-output="chunkRead">—</strong></div>
    </div>

    <div class="s5-rag-separation-note"><p><strong>Deliberate separation:</strong> the chunking panel computes index size and textual duplication. It does not turn chunk size or overlap into a supposed relevance gain. Demonstrating a gain requires running the retriever against real qrels.</p></div>

    <div class="s5-tool-breakdown__head"><strong data-output="rankingMode">—</strong><span>results inside k are highlighted</span></div>
    <div class="s5-rag-ranking" data-ranking aria-label="Synthetic retrieval ranking"></div>

    <aside class="s5-tool-source" aria-label="Method provenance">
      <div class="s5-tool-source__head"><a href="https://arxiv.org/abs/2104.08663" target="_blank" rel="noopener noreferrer">BEIR · retrieval evaluation</a><span>Sources reviewed 2026-08-21</span></div>
      <p>The ranking is synthetic and visible. Formulas follow standard IR metrics; the scores are never presented as measurements from a real model.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-rag-method">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-rag-method">Each metric answers a different question.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Precision@k</strong> asks what proportion of the first <em>k</em> results clears your relevance threshold. <strong>Recall@k</strong> asks what fraction of all known relevant items that top-k managed to recover.</p>
    <div class="s5-tool-method__formula">Precision@k = relevant_in_top_k / k · Recall@k = relevant_in_top_k / total_relevant</div>
    <p><strong>MRR@k</strong> depends only on the rank of the first relevant result. It is useful when finding one good piece of evidence early is enough, but it cannot distinguish an excellent ranking from a mediocre one after that first hit.</p>
    <div class="s5-tool-method__formula">MRR@k = 1 / rank_of_first_relevant</div>
    <p><strong>nDCG@k</strong> supports graded relevance. This lab uses gain <code>2^rel − 1</code> with logarithmic rank discount, divided by the ideal DCG for the same judgments.</p>
    <div class="s5-tool-method__formula">DCG@k = Σ (2^relᵢ − 1) / log₂(i + 1) · nDCG@k = DCG@k / IDCG@k</div>
    <p><strong>Reranking.</strong> The lab applies a second score only to the prefix you select. This makes a common pattern explicit: a cheap retriever generates candidates, then a more expensive reranker tries to improve their order without rescuing documents that never entered the candidate set.</p>
    <p><strong>Chunking.</strong> Stride is <code>chunk_size − overlap</code>. Overlapping windows increase indexed tokens; that redundancy can reduce boundary cuts, but it also increases storage and redundant candidates. The lab computes that footprint exactly for the configured corpus and leaves quality as a separate measurement.</p>
    <p><strong>Incomplete judgments.</strong> Recall requires knowing how many relevant results exist. If your qrels are partial, the denominator is partial too; do not read a high score as absolute coverage of the knowledge base.</p>
    <p class="s5-tool-method__notes">Sources: <a href="https://aclanthology.org/2020.emnlp-main.550/">Karpukhin et al. (DPR, EMNLP 2020)</a>, <a href="https://arxiv.org/abs/2005.11401">Lewis et al. (RAG, 2020)</a>, <a href="https://arxiv.org/abs/2104.08663">Thakur et al. (BEIR, 2021)</a>, and <a href="https://dl.acm.org/doi/10.1145/582415.582418">Järvelin & Kekäläinen (2002)</a>.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-rag-related">
  <div class="s5-section-head"><h2 id="s5-rag-related">Connect retrieval, context and evaluation</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/en/tools/context-budget/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Context budget</span><span class="s5-list-row__desc">Turn retrieved chunks into an explicit token budget.</span><span class="s5-list-row__meta">Tool</span></a>
    <a class="s5-list-row" href="/en/temas/evaluacion-modelos/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Model evaluation</span><span class="s5-list-row__desc">Keep the metric separate from the decision you are trying to make.</span><span class="s5-list-row__meta">Concept</span></a>
    <a class="s5-list-row" href="/en/articulos-tecnicos/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Engineering notes</span><span class="s5-list-row__desc">Architecture and operation of production AI systems.</span><span class="s5-list-row__meta">Engineering</span></a>
  </div>
</section>

</div>
