import {
  clean, normalizePrefix, dotAt, expandKnowledgeFragments, sourceLanguageMatches, rankLexical,
  topVectorMatches, uniqueMatches, safeSourceUrl, bestSectionPassage, groundedMessages,
} from './semantic-search-core.mjs';

// The full EmbeddingGemma 2 index is optional until its offline publisher
// has generated it. The browser-local fallback embeds a bounded set of
// canonical knowledge-graph records, never uploads the user's query.
const ORIGIN = 'https://5sigmas.com';
const MEDIA_MODEL = 'https://huggingface.co/litert-community/embeddinggemma-2-text-270m-litert-lm/resolve/main/embeddinggemma-2-text-270m.litertlm';
const MEDIA_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-retrieval@1.1.0/wasm';
const MEDIA_MODULE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-retrieval@1.1.0/retrieval_bundle.mjs';
const LLM_MODULE = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm';
const LLM_ID = 'onnx-community/Qwen3-0.6B-ONNX';
const MAX_CANDIDATES = 14;
const MAX_RESULTS = 7;
const root = document.querySelector('#s5-semantic-search');

if (root) {
  // Browser route, not a user-entered query or editorial field, owns the language.
  const lang = location.pathname === '/en' || location.pathname.startsWith('/en/')
    ? 'en' : 'es';
  const en = lang === 'en';
  const text = en ? {
    question: 'Your question', search: 'Find sources', answer: 'Generate local answer (WebGPU)',
    placeholder: 'Why does continuous batching improve LLM inference?',
    initializing: 'Reading the public 5sigmas knowledge graph…',
    sourceMode: 'Metadata index · semantic reranking on-device',
    fullMode: 'Full precomputed multimodal index',
    indexReady: 'Public source index ready. Models load only when requested.',
    embedding: 'Loading EmbeddingGemma 2 on this device; first download can be large…',
    searching: 'Computing local semantic matches…',
    enriching: 'Selecting cited passages…',
    zero: 'No reliable source match. Try a more specific question.',
    results: 'Retrieved sources', local: 'On-device retrieval',
    noGpu: 'WebGPU is unavailable in this browser. Source retrieval still works.',
    llmLoading: 'Loading Qwen3 0.6B into WebGPU. First download is approximately 570 MB…',
    llmWorking: 'Generating from the cited 5sigmas passages…',
    llmError: 'Local generation unavailable; the cited sources remain accessible.',
    loadError: 'Cannot load the canonical knowledge graph or search index.',
    source: 'Open source', video: 'Open video moment', animation: 'Open animation',
    caveat: 'AI-generated text can be inaccurate. Verify every claim in the linked sources.',
    pending: 'Search first to retrieve verifiable sources.',
    status: 'Status',
  } : {
    question: 'Tu pregunta', search: 'Buscar fuentes', answer: 'Generar respuesta local (WebGPU)',
    placeholder: '¿Por qué continuous batching mejora el rendimiento de inferencia?',
    initializing: 'Leyendo el grafo de conocimiento público de 5sigmas…',
    sourceMode: 'Índice de metadatos · reranking semántico en el dispositivo',
    fullMode: 'Índice multimodal completo precalculado',
    indexReady: 'Fuentes listas. Los modelos solo se cargan al solicitarlos.',
    embedding: 'Cargando EmbeddingGemma 2 en este dispositivo; la primera descarga puede ser grande…',
    searching: 'Calculando coincidencias semánticas localmente…',
    enriching: 'Seleccionando fragmentos y citas…',
    zero: 'No hay fuentes suficientemente relacionadas. Prueba una pregunta más concreta.',
    results: 'Fuentes recuperadas', local: 'Búsqueda en tu dispositivo',
    noGpu: 'Este navegador no dispone de WebGPU. La recuperación de fuentes sigue disponible.',
    llmLoading: 'Cargando Qwen3 0.6B en WebGPU. La primera descarga ronda los 570 MB…',
    llmWorking: 'Generando a partir de los fragmentos citados de 5sigmas…',
    llmError: 'Generación local no disponible. Puedes consultar las fuentes recuperadas.',
    loadError: 'No se ha podido cargar el grafo canónico ni el índice de búsqueda.',
    source: 'Abrir fuente', video: 'Abrir momento del vídeo', animation: 'Abrir animación',
    caveat: 'La respuesta generada puede contener errores. Comprueba las afirmaciones en las fuentes.',
    pending: 'Busca primero para recuperar fuentes verificables.',
    status: 'Estado',
  };

  const form = root.querySelector('form'), input = root.querySelector('input');
  const submit = root.querySelector('[data-action=search]');
  const generate = root.querySelector('[data-action=generate]');
  const status = root.querySelector('[data-role=status]');
  const mode = root.querySelector('[data-role=mode]');
  const results = root.querySelector('[data-role=results]');
  const answer = root.querySelector('[data-role=answer]');
  const answerText = root.querySelector('[data-role=answer-text]');

  const localState = { records: [], vectors: null, manifest: null, matches: [],
    embedCache: new Map(), embedderPromise: null, generatorPromise: null, busy: false };

  input.placeholder = text.placeholder;
  root.querySelector('[data-role=question-label]').textContent = text.question;
  root.querySelector('[data-role=results-title]').textContent = text.results;
  submit.textContent = text.search;
  generate.textContent = text.answer;
  answerText.textContent = text.pending;
  status.textContent = text.initializing;
  generate.disabled = true;

  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content != null) element.textContent = String(content);
    return element;
  }

  async function sha256(buffer) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function precomputedIndex() {
    const response = await fetch('/semantic-search/index/manifest.json', { cache: 'no-cache' });
    if (!response.ok) return null;
    const manifest = await response.json();
    if (manifest.schema_version !== 1 || manifest.model !== 'google/embeddinggemma-2' ||
        manifest.query_model !== 'litert-community/embeddinggemma-2-text-270m-litert-lm' ||
        ![128, 256, 512, 768].includes(manifest.dimension) || !manifest.normalized ||
        !Number.isInteger(manifest.count) || manifest.count < 1 || manifest.count > 100000 ||
        !/^[a-z0-9.-]+$/i.test(manifest.records_file) ||
        !/^[a-z0-9.-]+$/i.test(manifest.vectors_file)) {
      throw new Error('Invalid EmbeddingGemma 2 index manifest');
    }
    const base = '/semantic-search/index/';
    const [recordResponse, vectorResponse] = await Promise.all([
      fetch(base + manifest.records_file), fetch(base + manifest.vectors_file),
    ]);
    if (!recordResponse.ok || !vectorResponse.ok) throw new Error('Incomplete semantic index');
    const [recordBuffer, vectorBuffer] = await Promise.all([
      recordResponse.arrayBuffer(), vectorResponse.arrayBuffer(),
    ]);
    if (manifest.records_sha256 && await sha256(recordBuffer) !== manifest.records_sha256) {
      throw new Error('Indexed records checksum mismatch');
    }
    if (manifest.vectors_sha256 && await sha256(vectorBuffer) !== manifest.vectors_sha256) {
      throw new Error('Indexed vectors checksum mismatch');
    }
    const records = JSON.parse(new TextDecoder().decode(recordBuffer));
    if (!Array.isArray(records) || records.length !== manifest.count ||
        vectorBuffer.byteLength !== manifest.count * manifest.dimension * 4) {
      throw new Error('Record/vector matrix size mismatch');
    }
    for (const record of records) {
      if (!safeSourceUrl(record.url, ORIGIN) || !sourceLanguageMatches(record, record.locale, ORIGIN)) {
        throw new Error('Invalid source provenance or mixed locale');
      }
    }
    return { manifest, records, vectors: new Float32Array(vectorBuffer) };
  }

  function addVideoRecords(records, catalog, moments) {
    const clips = new Map((moments?.videos || []).filter((item) => item?.watch_url)
      .map((item) => [item.watch_url, item.key_moments?.clips || []]));
    for (const video of catalog?.videos || []) {
      if (!video || !safeSourceUrl(video.watch_url, ORIGIN)) continue;
      const key = clean(video.watch_url);
      const videoClips = clips.get(key);
      const segments = Array.isArray(videoClips) && videoClips.length
        ? videoClips.slice(0, 6).map((c) => ({ start: Number(c.start || 0), name: clean(c.name || '') }))
        : [{ start: 0, name: '' }];
      for (const segment of segments) {
        if (!Number.isFinite(segment.start) || segment.start < 0) continue;
        const rawUrl = key + (key.includes('?') ? '&' : '?') + 't=' + segment.start;
        const url = safeSourceUrl(rawUrl, ORIGIN);
        if (!url) continue;
        const title = clean(video.title), snippet = clean(video.description);
        records.push({ id: 'video:' + lang + ':' + url, locale: lang, kind: 'video_moment',
          source_kind: 'video', title, heading: segment.name, text: snippet,
          search_text: [title, segment.name, snippet].join('. '), url,
          asset_url: clean(video.video_url), poster_url: clean(video.thumb_url),
          start_seconds: segment.start, embedding_modalities: ['text'] });
      }
    }
  }

  async function metadataIndex() {
    const prefix = lang === 'en' ? '/en' : '';
    const json = async (path, optional = false) => {
      try {
        const response = await fetch(prefix + path, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
      } catch (error) {
        if (optional) return null;
        throw error;
      }
    };
    const [graph, catalog, moments] = await Promise.all([
      json('/agent/knowledge.json'), json('/videos/catalog.json', true),
      json('/videos/key-moments.json', true),
    ]);
    if (graph.schema_version !== 2 || !Array.isArray(graph.items) || graph.locale !== lang) {
      throw new Error('Invalid 5sigmas knowledge graph');
    }
    const records = graph.items.flatMap((item) => expandKnowledgeFragments(item, lang, ORIGIN))
      .filter((item) => sourceLanguageMatches(item, lang, ORIGIN));
    addVideoRecords(records, catalog, moments);
    const wrongLanguage = records.filter((r) => !sourceLanguageMatches(r, lang, ORIGIN));
    if (wrongLanguage.length) throw new Error('Knowledge records point to the wrong locale');
    if (!records.length) throw new Error('No eligible source records');
    return { records, vectors: null, manifest: null };
  }

  async function initialize() {
    try {
      let snapshot;
      try {
        snapshot = await precomputedIndex();
      } catch (error) {
        console.warn('[5sigmas local search] full index unavailable:', error);
      }
      snapshot ||= await metadataIndex();
      Object.assign(localState, snapshot);
      mode.textContent = snapshot.manifest ? text.fullMode : text.sourceMode;
      status.textContent = text.indexReady + ' ' + snapshot.records.length + ' items.';
      submit.disabled = false;
    } catch (error) {
      status.textContent = text.loadError + ' ' + (error?.message || '');
      submit.disabled = true;
    }
  }

  async function getEmbedder() {
    if (!localState.embedderPromise) {
      status.textContent = text.embedding;
      localState.embedderPromise = (async () => {
        const { FilesetResolver, UniversalEmbedder } = await import(MEDIA_MODULE);
        const runtime = await FilesetResolver.forRetrievalTasks(MEDIA_WASM);
        return UniversalEmbedder.createFromOptions(runtime, {
          baseOptions: { modelAssetPath: MEDIA_MODEL }, l2Normalize: true,
        });
      })().catch((error) => { localState.embedderPromise = null; throw error; });
    }
    return localState.embedderPromise;
  }

  async function embedding(engine, content, dim) {
    const response = await engine.embedText(content);
    const vector = response?.embeddings?.[0]?.floatEmbedding;
    return normalizePrefix(vector, dim);
  }

  async function rerankMetadata(question, engine, queryVector) {
    const candidates = rankLexical(localState.records, question, MAX_CANDIDATES);
    const ranked = [];
    for (const { record, score: lexical } of candidates) {
      const cacheKey = record.id + '|' + record.locale;
      let vector = localState.embedCache.get(cacheKey);
      if (!vector) {
        vector = await embedding(engine,
          'title: ' + record.title + ' | text: ' + clean(record.search_text || record.text).slice(0, 1450),
          queryVector.length);
        localState.embedCache.set(cacheKey, vector);
      }
      ranked.push({ record, score: dotAt(vector, 0, queryVector, queryVector.length) +
        Math.min(0.045, lexical * 0.0005) });
    }
    return uniqueMatches(ranked.sort((a, b) => b.score - a.score), MAX_RESULTS);
  }

  async function enrichPassages(matches, question) {
    await Promise.all(matches.slice(0, 4).map(async (match) => {
      const url = safeSourceUrl(match.record.markdown_url, ORIGIN);
      if (!url || match.record.kind !== 'text') return;
      try {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) return;
        const markdown = await response.text();
        const excerpt = bestSectionPassage(markdown.slice(0, 50000), match.record.heading, question, 850);
        if (excerpt) match.record = { ...match.record, text: excerpt };
      } catch {
        // Canonical metadata is still available if a Markdown mirror is offline.
      }
    }));
  }

  function renderMatches(matches) {
    results.replaceChildren();
    if (!matches.length) {
      results.append(node('p', 's5-search-empty', text.zero));
      return;
    }
    for (const { record, score } of matches) {
      const valid = safeSourceUrl(record.url, ORIGIN);
      if (!valid) continue;
      const card = node('article', 's5-search-card');
      const info = node('div', 's5-search-card-body');
      const kind = record.kind === 'video_moment' ? 'VIDEO' :
        record.kind === 'animation' ? 'ANIMATION' : record.kind === 'svg' ? 'DIAGRAM' :
        record.kind === 'image' ? 'IMAGE' : 'TEXT';
      info.append(node('span', 's5-search-kind', kind + ' · ' + lang.toUpperCase() +
        ' · ' + score.toFixed(3)));
      info.append(node('h3', '', record.title));
      if (record.heading) info.append(node('p', 's5-search-heading', record.heading));
      if (record.text) info.append(node('p', 's5-search-excerpt', record.text.slice(0, 570)));
      const link = node('a', 's5-search-link', record.kind === 'video_moment' ? text.video :
        record.kind === 'animation' ? text.animation : text.source);
      link.href = valid;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      info.append(link);

      const visual = record.asset_url;
      if (visual && /^https?:\/\//i.test(new URL(visual, ORIGIN).href)) {
        const asset = new URL(visual, ORIGIN);
        if (asset.protocol === 'https:' || (asset.origin === location.origin && asset.protocol === 'http:')) {
          if (record.kind === 'video_moment') {
            const video = node('video', 's5-search-media');
            video.controls = true;
            video.preload = 'none';
            if (record.poster_url) {
              const poster = new URL(record.poster_url, ORIGIN);
              if (poster.protocol === 'https:') video.poster = poster.href;
            }
            video.src = asset.href + '#t=' + (Number(record.start_seconds) || 0);
            card.append(video);
          } else if (record.kind === 'image' || record.kind === 'animation') {
            const image = node('img', 's5-search-media');
            image.loading = 'lazy';
            image.alt = record.title;
            image.src = asset.href;
            card.append(image);
          }
        }
      }
      card.append(info);
      results.append(card);
    }
  }

  async function retrieve(question) {
    // Render grounded same-locale sources immediately. The large embedding
    // model only reranks these results when available, never blocks opening
    // canonical fragments during a first download or on an unsupported device.
    const immediate = uniqueMatches(rankLexical(localState.records, question, MAX_RESULTS), MAX_RESULTS);
    localState.matches = immediate;
    renderMatches(immediate);
    status.textContent = immediate.length
      ? (en ? 'Source links ready · refining with EmbeddingGemma 2…'
        : 'Enlaces listos · afinando con EmbeddingGemma 2…')
      : text.embedding;
    let matches;
    let lexicalFallback = false;
    try {
      const engine = await getEmbedder();
      const dimension = localState.manifest?.dimension || 256;
      const queryVector = await embedding(engine, 'task: search result | query: ' + question, dimension);
      status.textContent = text.searching;
      matches = localState.manifest
        ? topVectorMatches(localState.records, localState.vectors, queryVector,
          localState.manifest.dimension, MAX_RESULTS, lang)
        : await rerankMetadata(question, engine, queryVector);
    } catch (error) {
      // Retrieval must stay functional when a large device model/CDN is
      // unavailable, including low-memory mobile and restricted networks.
      console.warn('[5sigmas local search] embedding unavailable; using lexical sources', error);
      matches = uniqueMatches(rankLexical(localState.records, question, MAX_RESULTS), MAX_RESULTS);
      lexicalFallback = true;
      mode.textContent = en ? 'Keyword source search (embedding model unavailable)'
        : 'Búsqueda textual de fuentes (modelo de embeddings no disponible)';
    }
    status.textContent = text.enriching;
    await enrichPassages(matches, question);
    localState.matches = matches;
    renderMatches(matches);
    status.textContent = matches.length + ' · ' + (lexicalFallback
      ? (en ? 'Keyword fallback · no inference' : 'Recuperación textual · sin inferencia')
      : text.local);
    generate.disabled = !matches.length || !('gpu' in navigator);
    if (!('gpu' in navigator)) answerText.textContent = text.noGpu;
    return matches;
  }

  async function getGenerator() {
    if (!('gpu' in navigator)) throw new Error(text.noGpu);
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error(text.noGpu);
    if (!localState.generatorPromise) {
      status.textContent = text.llmLoading;
      localState.generatorPromise = (async () => {
        const { pipeline } = await import(LLM_MODULE);
        return pipeline('text-generation', LLM_ID, { device: 'webgpu', dtype: 'q4f16' });
      })().catch((error) => { localState.generatorPromise = null; throw error; });
    }
    return localState.generatorPromise;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (localState.busy || !localState.records.length) return;
    const question = clean(input.value).slice(0, 400);
    if (!question) return;
    localState.busy = true;
    submit.disabled = true;
    generate.disabled = true;
    answerText.textContent = text.pending;
    try {
      await retrieve(question);
    } catch (error) {
      localState.matches = [];
      results.replaceChildren();
      status.textContent = (error?.message || String(error));
    } finally {
      submit.disabled = false;
      localState.busy = false;
    }
  });

  generate.addEventListener('click', async () => {
    if (localState.busy || !localState.matches.length) return;
    localState.busy = true;
    generate.disabled = true;
    submit.disabled = true;
    answerText.textContent = text.llmLoading;
    try {
      const engine = await getGenerator();
      const messages = groundedMessages(input.value, localState.matches, lang, ORIGIN);
      status.textContent = text.llmWorking;
      const response = await engine(messages, { max_new_tokens: 280, do_sample: false });
      const generation = response?.[0]?.generated_text;
      const output = Array.isArray(generation) ? generation.at(-1)?.content : generation;
      if (!clean(output)) throw new Error('Empty model response');
      answerText.textContent = clean(output) + '\n\n' + text.caveat;
      status.textContent = text.local + ' · WebGPU';
    } catch (error) {
      answerText.textContent = text.llmError + ' ' + (error?.message || '');
      status.textContent = text.llmError;
    } finally {
      localState.busy = false;
      submit.disabled = false;
      generate.disabled = localState.matches.length === 0 || !('gpu' in navigator);
    }
  });

  initialize();
}
