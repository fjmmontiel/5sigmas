(() => {
  'use strict';

  const SERIES = new Set([
    'seguridad-ia',
    'agentes-ia',
    'agentes-voz-tiempo-real',
    'coding-agents-agent-harnesses',
    'context-engineering-memory-mcp',
    'llm-inference-engineering-economics',
    'evaluating-ai-systems-production',
  ]);

  const ROOT_SELECTOR = [
    '.ctxmix','.aix-loop','.aix-eval','.aix-sec',
    '.defsim','.jbsearch','.jbbudget','.jbladder','.memlife','.memgov','.memprop','.memlayers',
    '.threatbuild','.uplift3','.causalrt','.regloop','.proddef','.mcpbound','.killpath','.releasegate',
    '.s5v',
  ].join(',');

  const stateAttributes = new Set([
    'data-state','data-step','data-round','data-focus','data-mode','data-stage','data-tab','aria-pressed','aria-selected'
  ]);

  const slugFromPath = () => {
    const match = location.pathname.match(/\/(?:en\/)?series\/([^/]+)\//);
    return match && SERIES.has(match[1]) ? match[1] : null;
  };

  let observer;
  const ensureObserver = () => {
    if (observer || !('IntersectionObserver' in window)) return observer;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });
    return observer;
  };

  const pulse = (root) => {
    root.classList.remove('s5g-state-pulse');
    void root.offsetWidth;
    root.classList.add('s5g-state-pulse');
  };

  const bindRoot = (root) => {
    if (root.dataset.s5GoldenBound === '1') return;
    root.dataset.s5GoldenBound = '1';
    root.classList.add('s5g-visual');

    const io = ensureObserver();
    if (io) io.observe(root);
    else root.classList.add('is-inview');

    const mutations = new MutationObserver((records) => {
      if (records.some((record) => stateAttributes.has(record.attributeName))) pulse(root);
    });
    mutations.observe(root, { attributes: true, subtree: true, attributeFilter: [...stateAttributes] });
  };

  const initialize = () => {
    const slug = slugFromPath();
    document.body.classList.toggle('s5-advanced-series', Boolean(slug));
    [...document.body.classList].filter((name) => name.startsWith('s5-series-')).forEach((name) => document.body.classList.remove(name));
    if (!slug) return;
    document.body.classList.add('s5-series-' + slug);
    document.querySelectorAll(ROOT_SELECTOR).forEach(bindRoot);
  };

  if (typeof document$ !== 'undefined' && document$?.subscribe) document$.subscribe(initialize);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
