(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5RagRetrievalCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_RESULTS = [
    { id: 'A', title: 'Vector search and dense retrieval', grade: 3, retriever: 0.92, reranker: 0.96 },
    { id: 'B', title: 'RAG architecture overview', grade: 2, retriever: 0.89, reranker: 0.84 },
    { id: 'C', title: 'Prompt engineering notes', grade: 0, retriever: 0.86, reranker: 0.31 },
    { id: 'D', title: 'Hybrid sparse+dense retrieval', grade: 3, retriever: 0.82, reranker: 0.94 },
    { id: 'E', title: 'Chunking strategies for retrieval', grade: 2, retriever: 0.78, reranker: 0.88 },
    { id: 'F', title: 'LLM sampling parameters', grade: 0, retriever: 0.75, reranker: 0.22 },
    { id: 'G', title: 'Cross-encoder reranking', grade: 3, retriever: 0.71, reranker: 0.91 },
    { id: 'H', title: 'Embedding dimensionality', grade: 1, retriever: 0.69, reranker: 0.72 },
    { id: 'I', title: 'RAG evaluation metrics', grade: 2, retriever: 0.64, reranker: 0.86 },
    { id: 'J', title: 'Generic chatbot UX', grade: 0, retriever: 0.61, reranker: 0.18 },
    { id: 'K', title: 'Query rewriting for retrieval', grade: 1, retriever: 0.57, reranker: 0.68 },
    { id: 'L', title: 'Unrelated deployment checklist', grade: 0, retriever: 0.43, reranker: 0.09 }
  ];

  function clampInt(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function chunkStats(corpusTokens, chunkSize, overlap) {
    const total = clampInt(corpusTokens, 1, 1000000000);
    const size = clampInt(chunkSize, 1, total);
    const safeOverlap = clampInt(overlap, 0, Math.max(0, size - 1));
    const stride = size - safeOverlap;
    const starts = [];
    for (let start = 0; start < total; start += stride) {
      starts.push(start);
      if (start + size >= total) break;
    }
    const chunkLengths = starts.map((start) => Math.min(size, total - start));
    const indexedTokens = chunkLengths.reduce((sum, length) => sum + length, 0);
    const duplicatedTokens = Math.max(0, indexedTokens - total);
    return {
      corpusTokens: total,
      chunkSize: size,
      overlap: safeOverlap,
      stride,
      chunks: chunkLengths.length,
      indexedTokens,
      duplicatedTokens,
      duplicationRatio: duplicatedTokens / total
    };
  }

  function rerank(results, depth) {
    const clean = results.map((item) => ({ ...item }));
    const d = clampInt(depth, 0, clean.length);
    if (d <= 1) return clean;
    const prefix = clean.slice(0, d).sort((a, b) => b.reranker - a.reranker || b.retriever - a.retriever);
    return prefix.concat(clean.slice(d));
  }

  function precisionAtK(results, k, threshold) {
    const kk = clampInt(k, 1, results.length);
    const relevant = results.slice(0, kk).filter((item) => item.grade >= threshold).length;
    return relevant / kk;
  }

  function recallAtK(results, k, totalRelevant, threshold) {
    const denom = clampInt(totalRelevant, 0, 1000000);
    if (denom === 0) return 0;
    const kk = clampInt(k, 1, results.length);
    const relevant = results.slice(0, kk).filter((item) => item.grade >= threshold).length;
    return Math.min(1, relevant / denom);
  }

  function mrrAtK(results, k, threshold) {
    const kk = clampInt(k, 1, results.length);
    const index = results.slice(0, kk).findIndex((item) => item.grade >= threshold);
    return index === -1 ? 0 : 1 / (index + 1);
  }

  function dcgAtK(results, k) {
    const kk = clampInt(k, 1, results.length);
    return results.slice(0, kk).reduce((sum, item, idx) => {
      const gain = Math.pow(2, Math.max(0, Number(item.grade) || 0)) - 1;
      return sum + gain / Math.log2(idx + 2);
    }, 0);
  }

  function ndcgAtK(results, k) {
    const kk = clampInt(k, 1, results.length);
    const ideal = results.slice().sort((a, b) => b.grade - a.grade);
    const idcg = dcgAtK(ideal, kk);
    return idcg === 0 ? 0 : dcgAtK(results, kk) / idcg;
  }

  function evaluate(results, options) {
    const threshold = clampInt(options.relevanceThreshold ?? 1, 1, 3);
    const k = clampInt(options.k ?? 5, 1, results.length);
    const totalRelevant = options.totalRelevant == null
      ? results.filter((item) => item.grade >= threshold).length
      : clampInt(options.totalRelevant, 0, 1000000);
    return {
      k,
      threshold,
      totalRelevant,
      precision: precisionAtK(results, k, threshold),
      recall: recallAtK(results, k, totalRelevant, threshold),
      mrr: mrrAtK(results, k, threshold),
      ndcg: ndcgAtK(results, k),
      relevantRetrieved: results.slice(0, k).filter((item) => item.grade >= threshold).length
    };
  }

  function scenario(input) {
    const base = (input.results || DEFAULT_RESULTS).map((item) => ({ ...item }));
    const depth = clampInt(input.rerankDepth ?? 0, 0, base.length);
    const ranking = depth > 0 ? rerank(base, depth) : base;
    const metrics = evaluate(ranking, {
      k: input.k ?? 5,
      relevanceThreshold: input.relevanceThreshold ?? 1,
      totalRelevant: input.totalRelevant
    });
    return {
      ranking,
      metrics,
      chunking: chunkStats(input.corpusTokens ?? 120000, input.chunkSize ?? 500, input.overlap ?? 100),
      rerankDepth: depth
    };
  }

  return {
    DEFAULT_RESULTS,
    chunkStats,
    rerank,
    precisionAtK,
    recallAtK,
    mrrAtK,
    dcgAtK,
    ndcgAtK,
    evaluate,
    scenario
  };
});
