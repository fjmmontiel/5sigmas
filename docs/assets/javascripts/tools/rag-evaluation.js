(() => {
  'use strict';

  const root = document.querySelector('[data-s5-rag-evaluation]');
  if (!root || !window.S5RagEvaluationCore) return;
  const core = window.S5RagEvaluationCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';

  const copy = {
    es: {
      copied: 'Enlace copiado.', copyFailed: 'No se pudo copiar automáticamente. Copia la URL del navegador.', reset: 'Escenario restablecido.', downloaded: 'JSON generado.',
      relevant: 'relevante', irrelevant: 'no relevante', supported: 'respaldada', unsupported: 'sin respaldo', correct: 'correcta', incorrect: 'incorrecta',
      diagnosis: {
        retrieval: ['Cuello de botella: recuperación', 'Antes de ajustar el generador, revisa si el contexto recuperado contiene suficiente evidencia relevante.'],
        grounding: ['Cuello de botella: fidelidad', 'El contexto parece razonable, pero demasiadas afirmaciones de la respuesta no están respaldadas por la evidencia recuperada.'],
        correctness: ['Cuello de botella: corrección', 'La respuesta usa el contexto, pero demasiadas afirmaciones no coinciden con la referencia o el juicio de corrección.'],
        coverage: ['Cuello de botella: cobertura', 'La respuesta evita muchos errores, pero deja hechos de referencia sin cubrir.'],
        balanced: ['Perfil equilibrado', 'No aparece un cuello de botella dominante con los umbrales didácticos actuales; revisa los intervalos y los casos individuales antes de concluir.']
      },
      interval: (low, high) => `IC Wilson 95% sobre las unidades etiquetadas: ${pct(low)}–${pct(high)}`,
      weighted: (score) => `Score ponderado: ${pct(score)}. Los pesos son visibles y editables; no es una métrica estándar de RAGAS o ARES.`
    },
    en: {
      copied: 'Link copied.', copyFailed: 'Automatic copy failed. Copy the browser URL instead.', reset: 'Scenario reset.', downloaded: 'JSON generated.',
      relevant: 'relevant', irrelevant: 'not relevant', supported: 'supported', unsupported: 'unsupported', correct: 'correct', incorrect: 'incorrect',
      diagnosis: {
        retrieval: ['Bottleneck: retrieval', 'Before tuning generation, check whether retrieved context contains enough relevant evidence.'],
        grounding: ['Bottleneck: faithfulness', 'Context looks reasonable, but too many answer claims are unsupported by the retrieved evidence.'],
        correctness: ['Bottleneck: correctness', 'The answer uses the context, but too many claims disagree with the reference or correctness judgment.'],
        coverage: ['Bottleneck: coverage', 'The answer avoids many errors but leaves reference facts uncovered.'],
        balanced: ['Balanced profile', 'No single bottleneck dominates under the current teaching thresholds; inspect intervals and individual labels before concluding.']
      },
      interval: (low, high) => `95% Wilson interval over labelled units: ${pct(low)}–${pct(high)}`,
      weighted: (score) => `Weighted score: ${pct(score)}. Weights are visible and editable; this is not a standard RAGAS or ARES metric.`
    }
  }[locale];

  const contextLabels = locale === 'es' ? {
    A: ['Reranking y orden', 'Un reranker puede mejorar el orden de los candidatos recuperados y añade coste.'],
    B: ['Límite del candidate set', 'Un reranker no puede rescatar un documento que nunca llegó al conjunto de candidatos.'],
    C: ['Solape de chunks', 'El solape aumenta los tokens indexados, pero no describe el coste del reranker.'],
    D: ['Cross-encoder', 'Puntuar más candidatos con un cross-encoder suele aumentar latencia y cómputo.'],
    E: ['Temperatura del LLM', 'La temperatura controla sampling del generador y no es evidencia directa sobre reranking.'],
    F: ['Profundidad de reranking', 'Una profundidad mayor evalúa más candidatos antes de construir el contexto final.']
  } : {
    A: ['Reranking and order', 'A reranker can improve candidate ordering while adding compute cost.'],
    B: ['Candidate-set limit', 'A reranker cannot recover a document that never entered the candidate set.'],
    C: ['Chunk overlap', 'Overlap increases indexed tokens but does not describe reranker cost.'],
    D: ['Cross-encoder', 'Scoring more candidates with a cross-encoder usually adds latency and compute.'],
    E: ['LLM temperature', 'Temperature controls generator sampling and is not direct evidence about reranking.'],
    F: ['Reranking depth', 'A deeper rerank evaluates more candidates before final context construction.']
  };

  const claimLabels = locale === 'es' ? {
    '1': 'El reranking puede mejorar el orden de los pasajes recuperados.',
    '2': 'Evaluar más candidatos puede aumentar latencia y cómputo.',
    '3': 'El reranker puede recuperar documentos que el retriever no devolvió.',
    '4': 'La profundidad de reranking controla cuántos candidatos se vuelven a puntuar.',
    '5': 'Usar reranking garantiza que la respuesta final sea factual.'
  } : {
    '1': 'Reranking can improve the order of retrieved passages.',
    '2': 'Evaluating more candidates can add latency and compute.',
    '3': 'A reranker can recover documents the retriever never returned.',
    '4': 'Reranking depth controls how many candidates are rescored.',
    '5': 'Using reranking guarantees a factual final answer.'
  };

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map((el) => [el.dataset.output, el]));
  const contextsEl = root.querySelector('[data-contexts]');
  const claimsEl = root.querySelector('[data-claims]');
  const feedback = root.querySelector('[data-s5-tool-feedback]');

  let contexts = core.DEFAULT_CONTEXTS.map((item) => ({ ...item }));
  let claims = core.DEFAULT_CLAIMS.map((item) => ({ ...item }));

  function pct(value, digits = 0) {
    return `${new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: digits }).format(value * 100)}%`;
  }

  function number(name, fallback) {
    const value = Number(fields[name]?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function weights() {
    return {
      contextRelevance: number('wContext', 25),
      faithfulness: number('wFaithfulness', 30),
      answerCorrectness: number('wCorrectness', 30),
      referenceCoverage: number('wCoverage', 15)
    };
  }

  function currentInput() {
    const referenceFacts = Math.max(1, Math.round(number('referenceFacts', 4)));
    const coveredFacts = Math.min(referenceFacts, Math.max(0, Math.round(number('coveredFacts', 3))));
    if (fields.coveredFacts) fields.coveredFacts.value = String(coveredFacts);
    return { contexts, claims, referenceFacts, coveredFacts, weights: weights() };
  }

  function setFeedback(text) {
    feedback.textContent = text;
    feedback.hidden = false;
    clearTimeout(setFeedback.timer);
    setFeedback.timer = setTimeout(() => { feedback.hidden = true; }, 2500);
  }

  function makeToggle(text, active, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 's5-rag-eval-toggle';
    button.dataset.active = active ? 'true' : 'false';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderContexts() {
    contextsEl.replaceChildren();
    contexts.forEach((item) => {
      const card = document.createElement('article');
      card.className = 's5-rag-eval-card';
      card.dataset.state = item.relevant ? 'positive' : 'negative';
      const body = document.createElement('div');
      const title = document.createElement('strong');
      const text = document.createElement('p');
      title.textContent = `${item.id} · ${contextLabels[item.id][0]}`;
      text.textContent = contextLabels[item.id][1];
      body.append(title, text);
      const toggle = makeToggle(item.relevant ? copy.relevant : copy.irrelevant, item.relevant, () => {
        item.relevant = !item.relevant;
        render();
      });
      card.append(body, toggle);
      contextsEl.append(card);
    });
  }

  function renderClaims() {
    claimsEl.replaceChildren();
    claims.forEach((item) => {
      const card = document.createElement('article');
      card.className = 's5-rag-eval-claim';
      const heading = document.createElement('div');
      const n = document.createElement('small');
      const text = document.createElement('strong');
      n.textContent = `#${item.id}`;
      text.textContent = claimLabels[item.id];
      heading.append(n, text);
      const actions = document.createElement('div');
      actions.className = 's5-rag-eval-claim__actions';
      actions.append(
        makeToggle(item.supported ? copy.supported : copy.unsupported, item.supported, () => { item.supported = !item.supported; render(); }),
        makeToggle(item.correct ? copy.correct : copy.incorrect, item.correct, () => { item.correct = !item.correct; render(); })
      );
      card.append(heading, actions);
      claimsEl.append(card);
    });
  }

  function renderMetric(name, value, interval) {
    outputs[name].textContent = pct(value);
    const intervalEl = outputs[`${name}Interval`];
    if (intervalEl) intervalEl.textContent = copy.interval(interval.low, interval.high);
  }

  function render() {
    const result = core.evaluate(currentInput());
    renderMetric('contextRelevance', result.metrics.contextRelevance, result.intervals.contextRelevance);
    renderMetric('faithfulness', result.metrics.faithfulness, result.intervals.faithfulness);
    renderMetric('answerCorrectness', result.metrics.answerCorrectness, result.intervals.answerCorrectness);
    renderMetric('referenceCoverage', result.metrics.referenceCoverage, result.intervals.referenceCoverage);
    outputs.contextCount.textContent = `${result.counts.relevantContexts}/${result.counts.contexts}`;
    outputs.supportCount.textContent = `${result.counts.supportedClaims}/${result.counts.claims}`;
    outputs.correctCount.textContent = `${result.counts.correctClaims}/${result.counts.claims}`;
    outputs.coverageCount.textContent = `${result.counts.coveredFacts}/${result.counts.referenceFacts}`;
    outputs.weightedScore.textContent = pct(result.weightedScore);
    outputs.weightedRead.textContent = copy.weighted(result.weightedScore);
    const [diagnosisTitle, diagnosisText] = copy.diagnosis[result.diagnosis];
    outputs.diagnosis.textContent = diagnosisTitle;
    outputs.diagnosisText.textContent = diagnosisText;
    renderContexts();
    renderClaims();
  }

  function shareUrl() {
    const input = currentInput();
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('ctx', core.encodeFlags(contexts, ['relevant']));
    url.searchParams.set('clm', core.encodeFlags(claims, ['supported', 'correct']));
    url.searchParams.set('rf', String(input.referenceFacts));
    url.searchParams.set('cf', String(input.coveredFacts));
    url.searchParams.set('w', [input.weights.contextRelevance, input.weights.faithfulness, input.weights.answerCorrectness, input.weights.referenceCoverage].join(','));
    return url.toString();
  }

  function readUrlState() {
    const params = new URLSearchParams(location.search);
    if (params.has('ctx')) contexts = core.decodeFlags(params.get('ctx'), core.DEFAULT_CONTEXTS, ['relevant']);
    if (params.has('clm')) claims = core.decodeFlags(params.get('clm'), core.DEFAULT_CLAIMS, ['supported', 'correct']);
    if (params.has('rf')) fields.referenceFacts.value = String(Number(params.get('rf')) || 4);
    if (params.has('cf')) fields.coveredFacts.value = String(Number(params.get('cf')) || 0);
    if (params.has('w')) {
      const w = params.get('w').split(',').map(Number);
      if (w.length === 4 && w.every(Number.isFinite)) {
        fields.wContext.value = String(w[0]); fields.wFaithfulness.value = String(w[1]); fields.wCorrectness.value = String(w[2]); fields.wCoverage.value = String(w[3]);
      }
    }
  }

  function exportJson() {
    const result = core.evaluate(currentInput());
    const payload = {
      schema: '5sigmas.rag-evaluation.v1',
      locale,
      methodology: 'transparent_manual_labels_not_llm_judge',
      inputs: currentInput(),
      outputs: {
        metrics: result.metrics,
        intervals95Wilson: result.intervals,
        weightedScore: result.weightedScore,
        diagnosis: result.diagnosis
      },
      provenance: [
        'https://aclanthology.org/2024.eacl-demo.16/',
        'https://arxiv.org/abs/2311.09476'
      ]
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = locale === 'es' ? '5sigmas-evaluacion-rag.json' : '5sigmas-rag-evaluation.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setFeedback(copy.downloaded);
  }

  root.querySelector('[data-s5-tool-form]').addEventListener('input', render);
  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    contexts = core.DEFAULT_CONTEXTS.map((item) => ({ ...item }));
    claims = core.DEFAULT_CLAIMS.map((item) => ({ ...item }));
    fields.referenceFacts.value = '4'; fields.coveredFacts.value = '3';
    fields.wContext.value = '25'; fields.wFaithfulness.value = '30'; fields.wCorrectness.value = '30'; fields.wCoverage.value = '15';
    history.replaceState({}, '', location.pathname); render(); setFeedback(copy.reset);
  });
  root.querySelector('[data-action="share"]').addEventListener('click', async () => {
    const url = shareUrl(); history.replaceState({}, '', url);
    try { await navigator.clipboard.writeText(url); setFeedback(copy.copied); } catch { setFeedback(copy.copyFailed); }
  });
  root.querySelector('[data-action="export"]').addEventListener('click', exportJson);

  readUrlState();
  render();
})();
