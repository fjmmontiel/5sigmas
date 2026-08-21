(() => {
  'use strict';

  const root = document.querySelector('[data-s5-rag-retrieval]');
  if (!root || !window.S5RagRetrievalCore) return;
  const core = window.S5RagRetrievalCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';

  const copy = {
    es: {
      copied: 'Enlace copiado.',
      copyFailed: 'No se pudo copiar automáticamente. Copia la URL del navegador.',
      reset: 'Escenario restablecido.',
      downloaded: 'CSV generado.',
      statusBase: 'Ranking inicial del retriever',
      statusRerank: (d) => `Reranking aplicado a los primeros ${d} candidatos`,
      relevant: 'relevante',
      notRelevant: 'no relevante',
      grade: 'grado',
      score: 'score',
      rank: 'posición',
      synthetic: 'Ejemplo sintético',
      chunkRead: ({ chunks, duplicationRatio, stride }) => `${chunks.toLocaleString('es-ES')} chunks · stride ${stride.toLocaleString('es-ES')} · ${(duplicationRatio * 100).toFixed(1)}% de tokens duplicados por solape`,
      metricRead: ({ k, precision, recall, mrr, ndcg }) => `A k=${k}: precisión ${fmtPct(precision)}, recall ${fmtPct(recall, 1)}, MRR ${mrr.toFixed(2)} y nDCG ${ndcg.toFixed(2)}.`,
      titles: {
        A: 'Búsqueda vectorial y recuperación densa', B: 'Arquitectura RAG', C: 'Notas de prompt engineering', D: 'Recuperación híbrida sparse+dense', E: 'Estrategias de chunking', F: 'Parámetros de sampling del LLM', G: 'Reranking con cross-encoder', H: 'Dimensionalidad de embeddings', I: 'Métricas de evaluación RAG', J: 'UX genérica de chatbot', K: 'Reescritura de consultas', L: 'Checklist de despliegue no relacionado'
      }
    },
    en: {
      copied: 'Link copied.',
      copyFailed: 'Automatic copy failed. Copy the browser URL instead.',
      reset: 'Scenario reset.',
      downloaded: 'CSV generated.',
      statusBase: 'Initial retriever ranking',
      statusRerank: (d) => `Reranking applied to the first ${d} candidates`,
      relevant: 'relevant',
      notRelevant: 'not relevant',
      grade: 'grade',
      score: 'score',
      rank: 'rank',
      synthetic: 'Synthetic example',
      chunkRead: ({ chunks, duplicationRatio, stride }) => `${chunks.toLocaleString('en-US')} chunks · stride ${stride.toLocaleString('en-US')} · ${(duplicationRatio * 100).toFixed(1)}% duplicate indexed tokens from overlap`,
      metricRead: ({ k, precision, recall, mrr, ndcg }) => `At k=${k}: precision ${fmtPct(precision)}, recall ${fmtPct(recall, 1)}, MRR ${mrr.toFixed(2)}, and nDCG ${ndcg.toFixed(2)}.`,
      titles: Object.fromEntries(core.DEFAULT_RESULTS.map((item) => [item.id, item.title]))
    }
  }[locale];

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map((el) => [el.dataset.output, el]));
  const rankingEl = root.querySelector('[data-ranking]');
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  const DEFAULTS = { corpusTokens: 120000, chunkSize: 500, overlap: 100, k: 5, rerankDepth: 0, relevanceThreshold: 1, totalRelevant: 8 };
  const PARAMS = { corpusTokens: 'c', chunkSize: 's', overlap: 'o', k: 'k', rerankDepth: 'r', relevanceThreshold: 't', totalRelevant: 'q' };

  function number(name) {
    const value = Number(fields[name]?.value);
    return Number.isFinite(value) ? value : DEFAULTS[name];
  }

  function readState() {
    return Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, number(key)]));
  }

  function applyState(state) {
    Object.entries(state).forEach(([key, value]) => {
      if (fields[key] && Number.isFinite(Number(value))) fields[key].value = String(value);
    });
  }

  function readUrlState() {
    const params = new URLSearchParams(location.search);
    const state = {};
    Object.entries(PARAMS).forEach(([key, param]) => {
      if (params.has(param)) state[key] = Number(params.get(param));
    });
    return state;
  }

  function shareUrl() {
    const url = new URL(location.href);
    url.search = '';
    const state = readState();
    Object.entries(PARAMS).forEach(([key, param]) => url.searchParams.set(param, String(state[key])));
    return url.toString();
  }

  function fmtInt(value) {
    return Math.round(value).toLocaleString(locale === 'es' ? 'es-ES' : 'en-US');
  }

  function fmtPct(value, digits = 0) {
    const formatter = new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    });
    return `${formatter.format(value * 100)}%`;
  }

  function setFeedback(text) {
    feedback.textContent = text;
    feedback.hidden = false;
    clearTimeout(setFeedback.timer);
    setFeedback.timer = setTimeout(() => { feedback.hidden = true; }, 2600);
  }

  function renderRanking(scenario) {
    rankingEl.replaceChildren();
    scenario.ranking.slice(0, 10).forEach((item, idx) => {
      const row = document.createElement('article');
      row.className = 's5-rag-result';
      if (idx < scenario.metrics.k) row.dataset.inK = 'true';
      const relevant = item.grade >= scenario.metrics.threshold;
      row.innerHTML = `
        <div class="s5-rag-result__rank"><small>${copy.rank}</small><strong>${idx + 1}</strong></div>
        <div class="s5-rag-result__body"><strong>${copy.titles[item.id]}</strong><span>${copy.synthetic} · ${copy.grade} ${item.grade}/3 · ${copy.score} ${(scenario.rerankDepth > 0 && idx < scenario.rerankDepth ? item.reranker : item.retriever).toFixed(2)}</span></div>
        <div class="s5-rag-result__grade" data-relevant="${relevant ? 'true' : 'false'}"><strong>${item.grade}</strong><small>${relevant ? copy.relevant : copy.notRelevant}</small></div>`;
      rankingEl.append(row);
    });
  }

  function render() {
    const input = readState();
    if (input.overlap >= input.chunkSize) {
      fields.overlap.value = String(Math.max(0, input.chunkSize - 1));
      input.overlap = Number(fields.overlap.value);
    }
    const scenario = core.scenario(input);
    const m = scenario.metrics;
    const c = scenario.chunking;
    outputs.precision.textContent = fmtPct(m.precision);
    outputs.recall.textContent = fmtPct(m.recall, 1);
    outputs.mrr.textContent = m.mrr.toFixed(2);
    outputs.ndcg.textContent = m.ndcg.toFixed(2);
    outputs.relevant.textContent = `${m.relevantRetrieved}/${m.k}`;
    outputs.chunks.textContent = fmtInt(c.chunks);
    outputs.indexedTokens.textContent = fmtInt(c.indexedTokens);
    outputs.duplication.textContent = fmtPct(c.duplicationRatio, 1);
    outputs.stride.textContent = fmtInt(c.stride);
    outputs.rankingMode.textContent = scenario.rerankDepth > 0 ? copy.statusRerank(scenario.rerankDepth) : copy.statusBase;
    outputs.metricRead.textContent = copy.metricRead(m);
    outputs.chunkRead.textContent = copy.chunkRead(c);
    renderRanking(scenario);
  }

  function exportCsv() {
    const state = readState();
    const scenario = core.scenario(state);
    const rows = [
      ['rank','id','title','relevance_grade','binary_relevant','retriever_score','reranker_score','within_k'],
      ...scenario.ranking.map((item, idx) => [idx + 1, item.id, copy.titles[item.id], item.grade, item.grade >= scenario.metrics.threshold ? 1 : 0, item.retriever, item.reranker, idx < scenario.metrics.k ? 1 : 0])
    ];
    rows.push([]);
    rows.push(['metric','value']);
    rows.push(['precision_at_k', scenario.metrics.precision]);
    rows.push(['recall_at_k', scenario.metrics.recall]);
    rows.push(['mrr_at_k', scenario.metrics.mrr]);
    rows.push(['ndcg_at_k', scenario.metrics.ndcg]);
    rows.push(['chunks', scenario.chunking.chunks]);
    rows.push(['indexed_tokens', scenario.chunking.indexedTokens]);
    rows.push(['duplication_ratio', scenario.chunking.duplicationRatio]);
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = locale === 'es' ? '5sigmas-laboratorio-rag.csv' : '5sigmas-rag-retrieval-lab.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    setFeedback(copy.downloaded);
  }

  root.querySelector('[data-s5-tool-form]').addEventListener('input', render);
  root.querySelector('[data-action="reset"]').addEventListener('click', () => { applyState(DEFAULTS); history.replaceState({}, '', location.pathname); render(); setFeedback(copy.reset); });
  root.querySelector('[data-action="share"]').addEventListener('click', async () => {
    const url = shareUrl();
    history.replaceState({}, '', url);
    try { await navigator.clipboard.writeText(url); setFeedback(copy.copied); }
    catch { setFeedback(copy.copyFailed); }
  });
  root.querySelector('[data-action="export"]').addEventListener('click', exportCsv);

  applyState({ ...DEFAULTS, ...readUrlState() });
  render();
})();
