---
title: Evaluación RAG — contexto, fidelidad, corrección y cobertura
description: Evalúa un pipeline RAG separando relevancia del contexto, fidelidad de la respuesta, corrección frente a referencia y cobertura, con pesos visibles e intervalos de incertidumbre.
keywords: evaluación RAG, RAGAS, faithfulness RAG, context relevance, answer correctness, hallucination RAG, evaluación LLM
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
  "name": "Evaluación RAG — 5sigmas",
  "url": "https://5sigmas.com/herramientas/evaluacion-rag/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Playground interactivo para separar recuperación, fidelidad, corrección y cobertura al evaluar un sistema RAG.",
  "featureList": ["Relevancia del contexto", "Fidelidad por afirmaciones", "Corrección frente a referencia", "Cobertura de hechos", "Pesos visibles", "Intervalos Wilson", "Escenario compartible y JSON"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-rag-evaluation data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · RAG · 08</div>
  <h1>Localiza el fallo: recuperación, fidelidad, corrección o cobertura.</h1>
  <p>Etiqueta un conjunto sintético de contextos y afirmaciones para ver cómo cambia cada dimensión de evaluación por separado. El objetivo no es producir un único número mágico, sino distinguir si el sistema recupera mala evidencia, inventa sobre evidencia buena, responde incorrectamente o deja hechos importantes fuera.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Dimensiones de evaluación">
  <div><small>Contexto</small><strong>¿la evidencia recuperada es relevante?</strong></div>
  <div><small>Fidelidad</small><strong>¿cada afirmación está respaldada?</strong></div>
  <div><small>Respuesta</small><strong>¿es correcta y cubre la referencia?</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Escenario de evaluación RAG" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Referencia y cobertura</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-rag-eval-es-ref">Hechos en la referencia</label><input id="s5-rag-eval-es-ref" data-field="referenceFacts" type="number" min="1" max="100" step="1" value="4" /></div>
        <div class="s5-tool-field"><label for="s5-rag-eval-es-covered">Hechos cubiertos por la respuesta</label><input id="s5-rag-eval-es-covered" data-field="coveredFacts" type="number" min="0" max="100" step="1" value="3" /><small>La cobertura mide completitud, no fidelidad.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Pesos del score compuesto</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-rag-eval-es-wc">Contexto</label><input id="s5-rag-eval-es-wc" data-field="wContext" type="number" min="0" max="100" step="5" value="25" /></div>
        <div class="s5-tool-field"><label for="s5-rag-eval-es-wf">Fidelidad</label><input id="s5-rag-eval-es-wf" data-field="wFaithfulness" type="number" min="0" max="100" step="5" value="30" /></div>
        <div class="s5-tool-field"><label for="s5-rag-eval-es-wa">Corrección</label><input id="s5-rag-eval-es-wa" data-field="wCorrectness" type="number" min="0" max="100" step="5" value="30" /></div>
        <div class="s5-tool-field"><label for="s5-rag-eval-es-wv">Cobertura</label><input id="s5-rag-eval-es-wv" data-field="wCoverage" type="number" min="0" max="100" step="5" value="15" /></div>
      </div>
      <p class="s5-rag-eval-weight-note">Los pesos se normalizan automáticamente. El score compuesto es una ayuda de decisión configurable, no una métrica estándar ni una reproducción de RAGAS/ARES.</p>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Resultados de evaluación RAG" aria-live="polite">
    <div class="s5-tool-kpis s5-rag-eval-metrics">
      <div class="s5-tool-kpi"><small>Relevancia del contexto</small><strong data-output="contextRelevance">—</strong><span data-output="contextRelevanceInterval">—</span></div>
      <div class="s5-tool-kpi"><small>Fidelidad</small><strong data-output="faithfulness">—</strong><span data-output="faithfulnessInterval">—</span></div>
      <div class="s5-tool-kpi"><small>Corrección</small><strong data-output="answerCorrectness">—</strong><span data-output="answerCorrectnessInterval">—</span></div>
      <div class="s5-tool-kpi"><small>Cobertura de referencia</small><strong data-output="referenceCoverage">—</strong><span data-output="referenceCoverageInterval">—</span></div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Conteos de evaluación">
      <div><small>Contextos relevantes</small><strong data-output="contextCount">—</strong></div>
      <div><small>Afirmaciones respaldadas</small><strong data-output="supportCount">—</strong></div>
      <div><small>Afirmaciones correctas</small><strong data-output="correctCount">—</strong></div>
      <div><small>Hechos cubiertos</small><strong data-output="coverageCount">—</strong></div>
      <div><small>Score ponderado</small><strong data-output="weightedScore">—</strong></div>
    </div>

    <div class="s5-rag-eval-diagnosis">
      <div><small>Diagnóstico</small><strong data-output="diagnosis">—</strong></div>
      <div><small>Qué mirar después</small><p data-output="diagnosisText">—</p></div>
    </div>
    <p class="s5-rag-eval-weight-note" data-output="weightedRead">—</p>

    <div class="s5-rag-eval-section-head"><div><small>Evidencia recuperada</small><h3>Marca si cada pasaje es relevante para la pregunta.</h3></div><span>6 pasajes sintéticos</span></div>
    <div class="s5-rag-eval-list" data-contexts aria-label="Contextos recuperados"></div>

    <div class="s5-rag-eval-section-head"><div><small>Respuesta generada</small><h3>Separa respaldo por evidencia de corrección frente a referencia.</h3></div><span>5 afirmaciones sintéticas</span></div>
    <div class="s5-rag-eval-list" data-claims aria-label="Afirmaciones de la respuesta"></div>

    <aside class="s5-tool-source" aria-label="Procedencia metodológica">
      <div class="s5-tool-source__head"><a href="https://aclanthology.org/2024.eacl-demo.16/" target="_blank" rel="noopener noreferrer">RAGAS · EACL 2024</a><span>Fuentes revisadas 21-08-2026</span></div>
      <p>RAGAS separa dimensiones de recuperación y generación. Este playground conserva esa separación, pero usa etiquetas manuales transparentes en lugar de un LLM judge para que cada numerador y denominador sea visible.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-rag-eval-method">
  <div><div class="s5-eyebrow">Método</div><h2 id="s5-rag-eval-method">No confundas “respuesta buena” con una única causa.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Relevancia del contexto</strong> es aquí una proporción determinista de pasajes manualmente etiquetados como relevantes. Sirve para aislar la calidad del material que llega al generador.</p>
    <div class="s5-tool-method__formula">context_relevance = contextos_relevantes / contextos_recuperados</div>
    <p><strong>Fidelidad</strong> cuenta qué proporción de afirmaciones de la respuesta está respaldada por el contexto recuperado. Una afirmación puede ser verdadera en el mundo y aun así ser infiel al contexto si la evidencia suministrada no la soporta.</p>
    <div class="s5-tool-method__formula">faithfulness = afirmaciones_respaldadas / afirmaciones_de_la_respuesta</div>
    <p><strong>Corrección</strong> usa un juicio separado frente a una referencia o criterio externo. Eso evita tratar “está respaldado por el contexto” y “es correcto” como sinónimos.</p>
    <div class="s5-tool-method__formula">answer_correctness = afirmaciones_correctas / afirmaciones_de_la_respuesta</div>
    <p><strong>Cobertura</strong> mide qué fracción de los hechos de referencia aparece en la respuesta. Una respuesta corta puede ser totalmente fiel y correcta, pero incompleta.</p>
    <div class="s5-tool-method__formula">reference_coverage = hechos_cubiertos / hechos_de_referencia</div>
    <p><strong>Incertidumbre.</strong> Cada proporción muestra un intervalo Wilson del 95% sobre las unidades etiquetadas. Con cinco afirmaciones, un 80% no tiene la misma estabilidad que un 80% calculado sobre miles. El intervalo describe tamaño muestral binomial; no calibra errores del anotador ni de un judge.</p>
    <p><strong>Score compuesto.</strong> Si necesitas ordenar configuraciones, puedes combinar las cuatro dimensiones con pesos explícitos. El playground normaliza los pesos y nunca presenta ese score como estándar. Si el objetivo de negocio exige fidelidad casi perfecta, debes reflejarlo en el peso o, mejor, usar un gate duro.</p>
    <div class="s5-rag-eval-caveat"><p><strong>No es un LLM judge.</strong> RAGAS y ARES automatizan parte de la evaluación mediante modelos/jueces. Aquí las etiquetas son visibles y manipulables para estudiar causalmente qué dimensión cambia. Para evaluar producción necesitas un dataset representativo, criterios de anotación, calibración del evaluador y validación humana.</p></div>
    <p class="s5-tool-method__notes">Fuentes: <a href="https://aclanthology.org/2024.eacl-demo.16/">Es et al., RAGAS (EACL 2024)</a> y <a href="https://arxiv.org/abs/2311.09476">Saad-Falcon et al., ARES (2023/2024)</a>. Ambos trabajos separan dimensiones como relevancia del contexto y fidelidad; ARES además enfatiza evaluación calibrada con anotaciones humanas.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-rag-eval-related">
  <div class="s5-section-head"><h2 id="s5-rag-eval-related">Conecta la causa con la métrica</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/herramientas/laboratorio-recuperacion-rag/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Laboratorio de recuperación RAG</span><span class="s5-list-row__desc">Mide el ranking con Precision@k, Recall@k, MRR y nDCG antes de evaluar la respuesta.</span><span class="s5-list-row__meta">Herramienta</span></a>
    <a class="s5-list-row" href="/herramientas/presupuesto-contexto/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Presupuesto de contexto</span><span class="s5-list-row__desc">Comprueba cuánto contexto RAG cabe realmente junto al resto del prompt.</span><span class="s5-list-row__meta">Herramienta</span></a>
    <a class="s5-list-row" href="/temas/evaluacion-modelos/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Evaluación de modelos</span><span class="s5-list-row__desc">Diseña una métrica desde la decisión que necesitas tomar, no al revés.</span><span class="s5-list-row__meta">Concepto</span></a>
  </div>
</section>

</div>
