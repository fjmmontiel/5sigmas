(() => {
  'use strict';

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();

  function init(root) {
    if (!root || root.dataset.toolsDiscoveryReady === 'true') return;
    const input = root.querySelector('[data-s5-tool-search]');
    const buttons = [...root.querySelectorAll('[data-s5-tool-filter]')];
    const cards = [...root.querySelectorAll('[data-s5-tool-card]')];
    const count = root.querySelector('[data-s5-tool-count]');
    const countLabel = root.querySelector('[data-s5-tool-count-label]');
    const grid = root.querySelector('.s5-tool-index-grid');
    if (!input || !buttons.length || !cards.length || !count || !countLabel || !grid) return;

    root.dataset.toolsDiscoveryReady = 'true';
    const english = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    let active = 'all';

    const empty = document.createElement('p');
    empty.className = 's5-tool-discovery__empty';
    empty.hidden = true;
    empty.textContent = english
      ? 'No tools match that search. Try another term or clear the filter.'
      : 'Ninguna herramienta coincide. Prueba otro término o elimina el filtro.';
    grid.insertAdjacentElement('afterend', empty);

    const update = () => {
      const query = normalize(input.value);
      let visible = 0;

      for (const card of cards) {
        const groupMatch = active === 'all' || card.dataset.group === active;
        const queryMatch = !query || normalize(card.textContent).includes(query);
        const show = groupMatch && queryMatch;
        card.hidden = !show;
        if (show) visible += 1;
      }

      count.textContent = String(visible);
      countLabel.textContent = english
        ? (visible === 1 ? 'tool visible' : 'tools visible')
        : (visible === 1 ? 'herramienta visible' : 'herramientas visibles');
      empty.hidden = visible !== 0;
    };

    for (const button of buttons) {
      button.addEventListener('click', () => {
        active = button.dataset.s5ToolFilter || 'all';
        for (const candidate of buttons) {
          candidate.setAttribute('aria-pressed', String(candidate === button));
        }
        update();
      });
    }

    input.addEventListener('input', update);
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !input.value) return;
      input.value = '';
      update();
    });

    update();
  }

  const boot = () => document.querySelectorAll('[data-s5-tools-hub]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
