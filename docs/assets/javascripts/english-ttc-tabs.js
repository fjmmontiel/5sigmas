(() => {
  'use strict';

  const ROOTS = ['[data-ttc-tabs]', '[data-bon]', '[data-levers]', '[data-scale2d]'];

  function initialize(root) {
    if (root.dataset.s5EnglishTtcTabsReady === 'true') return;
    root.dataset.s5EnglishTtcTabsReady = 'true';
    const tabs = [...root.querySelectorAll('button[data-tab]')];
    const panels = [...root.querySelectorAll('[data-panel]')];
    if (!tabs.length || !panels.length) return;

    const activate = (key) => {
      tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === key)));
      panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== key; });
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => activate(tab.dataset.tab)));
    activate(root.dataset.default || tabs[0].dataset.tab);
  }

  function boot() {
    ROOTS.forEach((selector) => document.querySelectorAll(selector).forEach(initialize));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  if (window.document$?.subscribe) window.document$.subscribe(boot);
})();
