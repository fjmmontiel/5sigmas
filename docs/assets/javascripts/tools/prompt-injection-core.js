(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5PromptInjectionCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULTS = Object.freeze({
    preset: 'web-agent',
    vector: 'indirect',
    untrustedContent: true,
    privilegedModel: true,
    toolsEnabled: true,
    writeTools: true,
    sensitiveContext: true,
    externalEgress: true,
    persistentMemory: true,
    quarantineReader: false,
    leastPrivilege: true,
    actionIntentValidation: true,
    humanApproval: true,
    egressRestriction: false,
    memoryWriteValidation: true,
    outputSecretFilter: true
  });

  const PRESETS = Object.freeze({
    'chat-only': Object.freeze({
      preset: 'chat-only', vector: 'direct', untrustedContent: true, privilegedModel: true,
      toolsEnabled: false, writeTools: false, sensitiveContext: false, externalEgress: false,
      persistentMemory: false, quarantineReader: false, leastPrivilege: true,
      actionIntentValidation: true, humanApproval: true, egressRestriction: true,
      memoryWriteValidation: true, outputSecretFilter: true
    }),
    'rag-assistant': Object.freeze({
      preset: 'rag-assistant', vector: 'indirect', untrustedContent: true, privilegedModel: true,
      toolsEnabled: false, writeTools: false, sensitiveContext: true, externalEgress: false,
      persistentMemory: false, quarantineReader: false, leastPrivilege: true,
      actionIntentValidation: true, humanApproval: true, egressRestriction: true,
      memoryWriteValidation: true, outputSecretFilter: true
    }),
    'web-agent': Object.freeze({ ...DEFAULTS }),
    'privileged-agent': Object.freeze({
      preset: 'privileged-agent', vector: 'indirect', untrustedContent: true, privilegedModel: true,
      toolsEnabled: true, writeTools: true, sensitiveContext: true, externalEgress: true,
      persistentMemory: true, quarantineReader: false, leastPrivilege: false,
      actionIntentValidation: false, humanApproval: false, egressRestriction: false,
      memoryWriteValidation: false, outputSecretFilter: false
    })
  });

  function bool(value, fallback) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'string') return !['0', 'false', 'off', 'no'].includes(value.toLowerCase());
    return Boolean(value);
  }

  function normalize(raw = {}) {
    const presetName = PRESETS[raw.preset] ? raw.preset : DEFAULTS.preset;
    const base = PRESETS[presetName] || DEFAULTS;
    const vector = ['direct', 'indirect', 'multimodal'].includes(raw.vector) ? raw.vector : base.vector;
    const out = { preset: presetName, vector };
    for (const key of Object.keys(DEFAULTS)) {
      if (key === 'preset' || key === 'vector') continue;
      out[key] = bool(raw[key], base[key]);
    }
    return out;
  }

  function path(id, reachable, impact, why, mitigations) {
    return { id, reachable: Boolean(reachable), impact, why, mitigations };
  }

  function evaluate(raw = {}) {
    const input = normalize(raw);
    const injectionSurface = input.untrustedContent && input.privilegedModel;
    const quarantineBlocksPrivilegePath = input.vector !== 'direct' && input.quarantineReader;
    const privilegedInfluence = injectionSurface && !quarantineBlocksPrivilegePath;

    const paths = [
      path('instruction-steering', privilegedInfluence, 'behavior', privilegedInfluence ? 'Untrusted content can influence the privileged model.' : 'No direct path from untrusted content to the privileged model was modeled.', ['quarantineReader']),
      path('sensitive-disclosure', privilegedInfluence && input.sensitiveContext && !input.outputSecretFilter, 'confidentiality', !input.sensitiveContext ? 'No sensitive context is modeled.' : input.outputSecretFilter ? 'A deterministic filter for known secret classes blocks this modeled rendered-output path.' : 'Sensitive context can reach rendered output without the modeled known-secret filter.', ['outputSecretFilter', 'quarantineReader']),
      path('unauthorized-action', privilegedInfluence && input.toolsEnabled && input.writeTools && !input.actionIntentValidation && !input.humanApproval, 'integrity', !input.toolsEnabled || !input.writeTools ? 'No consequential write-capable tool is modeled.' : (input.actionIntentValidation || input.humanApproval) ? 'An independent intent check or approval boundary blocks the modeled automatic-action path.' : 'The model can reach write-capable tools without an independent intent or approval boundary.', ['leastPrivilege', 'actionIntentValidation', 'humanApproval', 'quarantineReader']),
      path('data-exfiltration', privilegedInfluence && input.sensitiveContext && input.externalEgress && !input.egressRestriction, 'confidentiality', !input.sensitiveContext ? 'No sensitive context is modeled.' : !input.externalEgress ? 'No external egress channel is modeled.' : input.egressRestriction ? 'Egress policy blocks the modeled external destination.' : 'Sensitive context and an unrestricted external egress path coexist.', ['leastPrivilege', 'egressRestriction', 'quarantineReader']),
      path('persistent-poisoning', privilegedInfluence && input.persistentMemory && !input.memoryWriteValidation, 'persistence', !input.persistentMemory ? 'No persistent memory write is modeled.' : input.memoryWriteValidation ? 'Memory writes require validation before persistence.' : 'Untrusted influence can reach persistent memory without an independent write check.', ['memoryWriteValidation', 'quarantineReader'])
    ];

    const controls = [
      { id: 'quarantineReader', enabled: input.quarantineReader, class: 'isolation', note: input.vector === 'direct' ? 'Does not isolate a direct user instruction from the privileged model.' : 'Separates untrusted-content reading from privileged action.' },
      { id: 'leastPrivilege', enabled: input.leastPrivilege, class: 'impact', note: 'Reduces what a compromised agent can access; it does not prevent model steering or act as a binary path blocker by itself.' },
      { id: 'actionIntentValidation', enabled: input.actionIntentValidation, class: 'action', note: 'Checks proposed tool actions against the original user intent outside the untrusted content path.' },
      { id: 'humanApproval', enabled: input.humanApproval, class: 'action', note: 'Requires an independent confirmation before consequential actions.' },
      { id: 'egressRestriction', enabled: input.egressRestriction, class: 'egress', note: 'Restricts destinations/channels available for external data transfer.' },
      { id: 'memoryWriteValidation', enabled: input.memoryWriteValidation, class: 'persistence', note: 'Validates what may be committed to persistent memory.' },
      { id: 'outputSecretFilter', enabled: input.outputSecretFilter, class: 'output', note: 'Blocks modeled known secret classes from rendered output; it does not make all sensitive data detectable.' }
    ];

    const reachable = paths.filter((item) => item.reachable);
    const blocked = paths.filter((item) => !item.reachable);
    const highImpact = reachable.filter((item) => ['confidentiality', 'integrity', 'persistence'].includes(item.impact));

    return {
      input, paths, controls,
      summary: {
        injectionSurface,
        privilegedInfluence,
        reachablePaths: reachable.length,
        blockedPaths: blocked.length,
        highImpactPaths: highImpact.length,
        posture: highImpact.length === 0 ? (reachable.length === 0 ? 'contained' : 'steering-only') : 'actionable-impact'
      },
      caveat: 'This is deterministic reachability modeling that assumes enabled controls are enforced correctly, not a probability of compromise. Real prompt-injection resistance depends on model behavior, implementation details, adversarial adaptation and the exact trust boundaries.'
    };
  }

  return { DEFAULTS, PRESETS, normalize, evaluate };
});
