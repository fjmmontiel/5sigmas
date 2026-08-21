(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.S5TransformerAttention = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const HEADS = ['local', 'previous', 'repeat'];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function tokenize(text, maxTokens = 8) {
    return String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, Math.max(1, Math.floor(maxTokens || 8)));
  }

  function normalizeToken(token) {
    return String(token || '')
      .toLocaleLowerCase()
      .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
  }

  function baseLogits(tokens, head = 'local', queryIndex = 0) {
    const safeHead = HEADS.includes(head) ? head : 'local';
    const n = tokens.length;
    const i = clamp(Math.floor(queryIndex || 0), 0, Math.max(0, n - 1));
    const queryNorm = normalizeToken(tokens[i]);

    return tokens.map((token, j) => {
      const distance = Math.abs(i - j);
      if (safeHead === 'previous') {
        const target = Math.max(0, i - 1);
        return 2.8 - 1.25 * Math.abs(j - target) - (j === i && i > 0 ? 0.35 : 0);
      }
      if (safeHead === 'repeat') {
        const keyNorm = normalizeToken(token);
        const repeatBonus = queryNorm && keyNorm === queryNorm ? 2.6 : 0;
        const selfAdjustment = j === i ? -1.4 : 0;
        return repeatBonus + selfAdjustment - 0.22 * distance;
      }
      return 2.2 - 0.85 * distance + (j === i ? 0.55 : 0);
    });
  }

  function maskLogits(logits, queryIndex, causal = true) {
    return logits.map((score, j) => (causal && j > queryIndex ? -Infinity : Number(score)));
  }

  function softmax(logits, temperature = 1) {
    const t = clamp(Number(temperature) || 1, 0.05, 20);
    const finite = logits.filter(Number.isFinite);
    if (!finite.length) return logits.map(() => 0);
    const max = Math.max(...finite.map((value) => value / t));
    const exps = logits.map((value) => (Number.isFinite(value) ? Math.exp(value / t - max) : 0));
    const denom = exps.reduce((sum, value) => sum + value, 0);
    return denom > 0 ? exps.map((value) => value / denom) : logits.map(() => 0);
  }

  function entropy(weights) {
    return weights.reduce((sum, weight) => (weight > 0 ? sum - weight * Math.log(weight) : sum), 0);
  }

  function defaultValues(count) {
    if (count <= 1) return [0];
    return Array.from({ length: count }, (_, index) => -1 + (2 * index) / (count - 1));
  }

  function analyze(raw = {}) {
    const tokens = Array.isArray(raw.tokens) ? raw.tokens.slice(0, 8).map(String) : tokenize(raw.text, 8);
    const safeTokens = tokens.length ? tokens : ['attention'];
    const queryIndex = clamp(Math.floor(Number(raw.queryIndex) || 0), 0, safeTokens.length - 1);
    const head = HEADS.includes(raw.head) ? raw.head : 'local';
    const causal = raw.causal !== false;
    const temperature = clamp(Number(raw.temperature) || 1, 0.25, 4);
    const preset = baseLogits(safeTokens, head, queryIndex);
    const customLogits = Array.isArray(raw.logits) && raw.logits.length === safeTokens.length
      ? raw.logits.map((value, index) => Number.isFinite(Number(value)) ? Number(value) : preset[index])
      : preset;
    const defaults = defaultValues(safeTokens.length);
    const values = Array.isArray(raw.values) && raw.values.length === safeTokens.length
      ? raw.values.map((value, index) => Number.isFinite(Number(value)) ? Number(value) : defaults[index])
      : defaults;
    const maskedLogits = maskLogits(customLogits, queryIndex, causal);
    const weights = softmax(maskedLogits, temperature);
    const contributions = weights.map((weight, index) => weight * values[index]);
    const output = contributions.reduce((sum, value) => sum + value, 0);
    const H = entropy(weights);
    let topIndex = 0;
    for (let index = 1; index < weights.length; index += 1) {
      if (weights[index] > weights[topIndex]) topIndex = index;
    }

    return {
      version: VERSION,
      tokens: safeTokens,
      head,
      queryIndex,
      causal,
      temperature,
      logits: customLogits,
      maskedLogits,
      weights,
      values,
      contributions,
      output,
      topIndex,
      entropy: H,
      effectiveTokens: Math.exp(H),
      allowedKeys: weights.filter((weight) => weight > 0).length
    };
  }

  function matrix(raw = {}) {
    const tokens = Array.isArray(raw.tokens) ? raw.tokens.slice(0, 8).map(String) : tokenize(raw.text, 8);
    const safeTokens = tokens.length ? tokens : ['attention'];
    return safeTokens.map((_, queryIndex) => analyze({
      tokens: safeTokens,
      head: raw.head,
      queryIndex,
      causal: raw.causal,
      temperature: raw.temperature
    }).weights);
  }

  function compareHeads(raw = {}) {
    const tokens = Array.isArray(raw.tokens) ? raw.tokens.slice(0, 8).map(String) : tokenize(raw.text, 8);
    const safeTokens = tokens.length ? tokens : ['attention'];
    return HEADS.map((head) => {
      const result = analyze({
        tokens: safeTokens,
        head,
        queryIndex: raw.queryIndex,
        causal: raw.causal,
        temperature: raw.temperature
      });
      return {
        head,
        topIndex: result.topIndex,
        topWeight: result.weights[result.topIndex],
        entropy: result.entropy,
        effectiveTokens: result.effectiveTokens
      };
    });
  }

  return {
    VERSION,
    HEADS,
    tokenize,
    normalizeToken,
    baseLogits,
    maskLogits,
    softmax,
    entropy,
    defaultValues,
    analyze,
    matrix,
    compareHeads
  };
});
