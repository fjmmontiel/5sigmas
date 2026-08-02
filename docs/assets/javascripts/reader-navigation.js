(() => {
  const LAST_READING_KEY = 's5:last-reading:v2';

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const rememberCurrentPage = (root) => {
    try {
      localStorage.setItem(LAST_READING_KEY, JSON.stringify({
        series: root.dataset.series || '',
        page: root.dataset.page || '',
        url: root.dataset.url || window.location.pathname,
        updatedAt: Date.now(),
      }));
    } catch {
      // Navigation remains fully functional when storage is restricted.
    }
  };

  const initializeReaderNavigation = () => {
    for (const root of document.querySelectorAll('[data-s5-reader-nav]')) {
      if (root.dataset.s5ReaderReady === 'true') continue;
      root.dataset.s5ReaderReady = 'true';
      rememberCurrentPage(root);

      const dialog = root.querySelector('[data-s5-reader-library]');
      const openButtons = [...document.querySelectorAll('[data-s5-reader-open]')];
      const closeButton = root.querySelector('[data-s5-reader-close]');
      const search = root.querySelector('[data-s5-reader-search]');
      const empty = root.querySelector('[data-s5-reader-empty]');
      const tabs = [...root.querySelectorAll('[data-s5-series-tab]')];
      const panels = [...root.querySelectorAll('[data-s5-series-panel]')];
      const entries = [...root.querySelectorAll('[data-s5-reader-entry]')];
      const currentRail = root.querySelector('.s5-reader-rail a[aria-current="page"]');
      if (!dialog || openButtons.length === 0 || !closeButton || tabs.length === 0 || panels.length === 0) continue;

      const currentTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
      const currentId = currentTab.dataset.s5SeriesTab;
      let activeId = currentId;

      const activate = (id, { focus = false, scroll = false } = {}) => {
        activeId = id;
        for (const tab of tabs) {
          const selected = tab.dataset.s5SeriesTab === id;
          tab.setAttribute('aria-selected', String(selected));
          tab.tabIndex = selected ? 0 : -1;
          if (selected && focus) tab.focus();
          if (selected && scroll) tab.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
        for (const panel of panels) {
          panel.hidden = panel.dataset.s5SeriesPanel !== id;
        }
      };

      const restore = () => {
        for (const tab of tabs) tab.hidden = false;
        for (const entry of entries) entry.hidden = false;
        if (empty) empty.hidden = true;
        activate(currentId, { scroll: true });
      };

      const filter = () => {
        const query = normalize(search?.value);
        if (!query) {
          restore();
          return;
        }

        const matchingTabs = [];
        for (const tab of tabs) {
          const id = tab.dataset.s5SeriesTab;
          const panel = panels.find((candidate) => candidate.dataset.s5SeriesPanel === id);
          const tabMatches = normalize(tab.dataset.search || tab.textContent).includes(query);
          let visibleEntries = 0;

          for (const entry of panel?.querySelectorAll('[data-s5-reader-entry]') || []) {
            const matches = tabMatches || normalize(entry.dataset.search || entry.textContent).includes(query);
            entry.hidden = !matches;
            if (matches) visibleEntries += 1;
          }

          const visible = tabMatches || visibleEntries > 0;
          tab.hidden = !visible;
          if (visible) matchingTabs.push(tab);
        }

        if (empty) empty.hidden = matchingTabs.length > 0;
        if (matchingTabs.length > 0) {
          const stillVisible = matchingTabs.some((tab) => tab.dataset.s5SeriesTab === activeId);
          activate(stillVisible ? activeId : matchingTabs[0].dataset.s5SeriesTab, { scroll: true });
        } else {
          for (const panel of panels) panel.hidden = true;
        }
      };

      const open = () => {
        if (search) search.value = '';
        restore();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        requestAnimationFrame(() => currentTab.scrollIntoView({ block: 'nearest', inline: 'center' }));
      };

      const close = () => {
        if (dialog.open) dialog.close();
        else dialog.removeAttribute('open');
      };

      for (const button of openButtons) button.addEventListener('click', open);
      closeButton.addEventListener('click', close);
      search?.addEventListener('input', filter);

      for (const tab of tabs) {
        tab.addEventListener('click', () => activate(tab.dataset.s5SeriesTab, { focus: true }));
        tab.addEventListener('keydown', (event) => {
          if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          const visibleTabs = tabs.filter((candidate) => !candidate.hidden);
          const index = visibleTabs.indexOf(tab);
          const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
          const next = visibleTabs[(index + direction + visibleTabs.length) % visibleTabs.length];
          activate(next.dataset.s5SeriesTab, { focus: true, scroll: true });
        });
      }

      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) close();
      });
      dialog.addEventListener('close', () => root.querySelector('[data-s5-reader-open]')?.focus());

      requestAnimationFrame(() => currentRail?.scrollIntoView({ block: 'nearest', inline: 'center' }));
    }
  };

  if (typeof document$ !== 'undefined') {
    document$.subscribe(initializeReaderNavigation);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReaderNavigation, { once: true });
  } else {
    initializeReaderNavigation();
  }
})();
