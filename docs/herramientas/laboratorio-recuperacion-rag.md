---
title: Laboratorio de recuperación RAG — Precision@k, Recall@k, MRR y nDCG
description: Explora Precision@k, Recall@k, MRR y nDCG sobre un ranking visible; prueba reranking y separa calidad de recuperación del coste de chunking y solape.
keywords: RAG retrieval, precision recall RAG, MRR, nDCG, reranking, chunking RAG, overlap chunks, evaluación recuperación
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
  "name": "Laboratorio de recuperación RAG — 5sigmas",
  "url": "https://5sigmas.com/herramientas/laboratorio-recuperacion-rag/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Laboratorio interactivo para entender métricas de recuperación, reranking y el coste de chunking en sistemas RAG.",
  "featureList": ["Precision@k y Recall@k", "MRR@k y nDCG@k", "Reranking por profundidad", "Chunking y coste de solape", "Escenario compartible y CSV"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-rag-retrieval data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · RAG · 07</div>
  <h1>Mide el ranking que recuperas, no solo la respuesta final.</h1>
  <p>Manipula <em>k</em>, el umbral de relevancia y la profundidad de reranking sobre un ranking sintético visible. En paralelo, cambia chunk size y solape para ver cuánto material duplicas en el índice sin fingir que ese coste predice por sí solo la calidad semántica.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Relaciones principales">
  <div><small>Precision@k</small><strong>relevantes recuperados ÷ k</strong></div>
  <div><small>Recall@k</small><strong>relevantes recuperados ÷ relevantes totales</strong></div>
  <div><small>nDCG@k</small><strong>ganancia graduada con descuento por posición</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Escenario de recuperación RAG" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Evaluación del ranking</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-rag-es-k">k evaluado</label><input id="s5-rag-es-k" data-field="k" type="number" min="1" max="12" step="1" value="5" /></div>
        <div class="s5-tool-field"><label for="s5-rag-es-rerank">Candidatos rerankeados</label><input id="s5-rag-es-rerank" data-field="rerankDepth" type="number" min="0" max="12" step="1" value="0" /><small>0 mantiene el ranking inicial; un valor mayor reordena solo ese prefijo.</small></div>
        <div class="s5-tool-field"><label for="s5-rag-es-threshold">Grado mínimo para contar como relevante</label><input id="s5-rag-es-threshold" data-field="relevanceThreshold" type="number" min="1" max="3" step="1" value="1" /></div>
        <div class="s5-tool-field"><label for="s5-rag-es-total">Relevantes totales en los qrels</label><input id="s5-rag-es-total" data-field="totalRelevant" type="number" min="1" max="1000" step="1" value="8" /><small>Recall necesita un denominador externo al top-k. Usa el total conocido para tu consulta.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Huella del chunking</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-rag-es-corpus">Corpus · tokens</label><input id="s5-rag-es-corpus" data-field="corpusTokens" type="number" min="1" step="1000" value="120000" /></div>
        <div class="s5-tool-field"><label for="s5-rag-es-size">Chunk size · tokens</label><input id="s5-rag-es-size" data-field="chunkSize" type="number" min="1" step="25" value="500" /></div>
        <div class="s5-tool-field"><label for="s5-rag-es-overlap">Solape · tokens</label><input id="s5-rag-es-overlap" data-field="overlap" type="number" min="0" step="25" value="100" /><small>Debe ser menor que el tamaño del chunk.</small></div>
      </div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar CSV</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Resultados de recuperación" aria-live="polite">
    <div class="s5-tool-kpis s5-rag-metrics">
      <div class="s5-tool-kpi"><small>Precision@k</small><strong data-output="precision">—</strong><span>pureza del top-k</span></div>
      <div class="s5-tool-kpi"><small>Recall@k</small><strong data-output="recall">—</strong><span>cobertura de relevantes conocidos</span></div>
      <div class="s5-tool-kpi"><small>MRR@k</small><strong data-output="mrr">—</strong><span>posición del primer relevante</span></div>
      <div class="s5-tool-kpi"><small>nDCG@k</small><strong data-output="ndcg">—</strong><span>orden + relevancia graduada</span></div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Detalles del ranking">
      <div><small>Relevantes dentro de k</small><strong data-output="relevant">—</strong></div>
      <div><small>Chunks estimados</small><strong data-output="chunks">—</strong></div>
      <div><small>Tokens indexados</small><strong data-output="indexedTokens">—</strong></div>
      <div><small>Duplicación por solape</small><strong data-output="duplication">—</strong></div>
      <div><small>Stride</small><strong data-output="stride">—</strong></div>
    </div>

    <div class="s5-rag-readout">
      <div><small>Lectura de métricas</small><strong data-output="metricRead">—</strong></div>
      <div><small>Lectura de chunking</small><strong data-output="chunkRead">—</strong></div>
    </div>

    <div class="s5-rag-separation-note"><p><strong>Separación deliberada:</strong> el panel de chunking calcula tamaño del índice y duplicación textual. No convierte chunk size u overlap en una supuesta mejora de relevancia. Para demostrar una mejora necesitas ejecutar el retriever sobre qrels reales.</p></div>

    <div class="s5-tool-breakdown__head"><strong data-output="rankingMode">—</strong><span>los resultados dentro de k quedan resaltados</span></div>
    <div class="s5-rag-ranking" data-ranking aria-label="Ranking sintético de recuperación"></div>

    <aside class="s5-tool-source" aria-label="Procedencia metodológica">
      <div class="s5-tool-source__head"><a href="https://arxiv.org/abs/2104.08663" target="_blank" rel="noopener noreferrer">BEIR · evaluación de recuperación</a><span>Fuentes revisadas 21-08-2026</span></div>
      <p>El ranking es sintético y visible. Las fórmulas siguen métricas estándar de IR; los scores no se presentan como resultados de un modelo real.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-rag-method">
  <div><div class="s5-eyebrow">Método</div><h2 id="s5-rag-method">Cada métrica responde una pregunta distinta.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Precision@k</strong> pregunta qué proporción de los primeros <em>k</em> resultados supera tu umbral de relevancia. <strong>Recall@k</strong> pregunta qué fracción de todos los relevantes conocidos consiguió recuperar ese top-k.</p>
    <div class="s5-tool-method__formula">Precision@k = relevantes_en_top_k / k · Recall@k = relevantes_en_top_k / relevantes_totales</div>
    <p><strong>MRR@k</strong> solo depende de la posición del primer resultado relevante. Es útil cuando basta con encontrar una buena evidencia pronto, pero no distingue entre rankings excelentes y mediocres después de ese primer acierto.</p>
    <div class="s5-tool-method__formula">MRR@k = 1 / rank_del_primer_relevante</div>
    <p><strong>nDCG@k</strong> admite relevancia graduada. Aquí se usa ganancia <code>2^rel − 1</code> y descuento logarítmico por posición, dividido por el DCG ideal del mismo conjunto de juicios.</p>
    <div class="s5-tool-method__formula">DCG@k = Σ (2^relᵢ − 1) / log₂(i + 1) · nDCG@k = DCG@k / IDCG@k</div>
    <p><strong>Reranking.</strong> El laboratorio aplica un segundo score únicamente al prefijo que marques. Eso hace visible un patrón habitual: un retriever barato genera candidatos y un reranker más caro intenta mejorar el orden sin rescatar documentos que quedaron fuera del candidate set.</p>
    <p><strong>Chunking.</strong> El stride es <code>chunk_size − overlap</code>. Las ventanas solapadas aumentan el número de tokens indexados; esa redundancia puede ayudar a no cortar evidencia en un borde, pero también aumenta almacenamiento y candidatos redundantes. El laboratorio calcula esa huella exactamente para el corpus configurado y deja la calidad como una medición separada.</p>
    <p><strong>Juicios incompletos.</strong> Recall requiere conocer cuántos resultados relevantes existen. Si tus qrels son parciales, el denominador también lo es; no interpretes una cifra alta como cobertura absoluta del conocimiento.</p>
    <p class="s5-tool-method__notes">Fuentes: <a href="https://aclanthology.org/2020.emnlp-main.550/">Karpukhin et al. (DPR, EMNLP 2020)</a>, <a href="https://arxiv.org/abs/2005.11401">Lewis et al. (RAG, 2020)</a>, <a href="https://arxiv.org/abs/2104.08663">Thakur et al. (BEIR, 2021)</a> y <a href="https://dl.acm.org/doi/10.1145/582415.582418">Järvelin & Kekäläinen (2002)</a>.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-rag-related">
  <div class="s5-section-head"><h2 id="s5-rag-related">Conecta recuperación, contexto y evaluación</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/herramientas/presupuesto-contexto/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Presupuesto de contexto</span><span class="s5-list-row__desc">Convierte los chunks recuperados en un presupuesto explícito de tokens.</span><span class="s5-list-row__meta">Herramienta</span></a>
    <a class="s5-list-row" href="/temas/evaluacion-modelos/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Evaluación de modelos</span><span class="s5-list-row__desc">Separa la métrica de la decisión que realmente quieres tomar.</span><span class="s5-list-row__meta">Concepto</span></a>
    <a class="s5-list-row" href="/articulos-tecnicos/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Notas técnicas</span><span class="s5-list-row__desc">Arquitectura y operación de sistemas de IA en producción.</span><span class="s5-list-row__meta">Ingeniería</span></a>
  </div>
</section>

</div>
