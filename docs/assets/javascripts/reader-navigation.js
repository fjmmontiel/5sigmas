(() => {
  const LAST_READING_KEY = 's5:last-reading:v1';

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
      // Reading remains fully functional when storage is restricted.
    }
  };

  const initializeReaderNavigation = () => {
    for (const root of document.querySelectorAll('[data-s5-reader-nav]')) {
      if (root.dataset.s5ReaderReady === 'true') continue;
      root.dataset.s5ReaderReady = 'true';
      rememberCurrentPage(root);

      const dialog = root.querySelector('[data-s5-reader-library]');
      const openButton = root.querySelector('[data-s5-reader-open]');
      const closeButton = root.querySelector('[data-s5-reader-close]');
      const search = root.querySelector('[data-s5-reader-search]');
      const empty = root.querySelector('[data-s5-reader-empty]');
      const collections = [...root.querySelectorAll('[data-s5-reader-collection]')];
      if (!dialog || !openButton || !closeButton) continue;

      const restoreDefaultState = () => {
        for (const collection of collections) {
          collection.hidden = false;
          collection.open = collection.classList.contains('is-current');
          for (const entry of collection.querySelectorAll('[data-s5-reader-entry]')) {
            entry.hidden = false;
          }
        }
        if (empty) empty.hidden = true;
      };

      const filterLibrary = () => {
        const query = normalize(search?.value);
        if (!query) {
          restoreDefaultState();
          return;
        }

        let visibleCollections = 0;
        for (const collection of collections) {
          const summaryText = normalize(collection.querySelector('summary')?.textContent);
          const collectionMatches = summaryText.includes(query);
          let visibleEntries = 0;

          for (const entry of collection.querySelectorAll('[data-s5-reader-entry]')) {
            const matches = collectionMatches || normalize(entry.dataset.search || entry.textContent).includes(query);
            entry.hidden = !matches;
            if (matches) visibleEntries += 1;
          }

          const visible = visibleEntries > 0;
          collection.hidden = !visible;
          collection.open = visible;
          if (visible) visibleCollections += 1;
        }
        if (empty) empty.hidden = visibleCollections > 0;
      };

      const close = () => {
        if (dialog.open) dialog.close();
        else dialog.removeAttribute('open');
      };

      openButton.addEventListener('click', () => {
        restoreDefaultState();
        if (search) search.value = '';
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        requestAnimationFrame(() => search?.focus());
      });
      closeButton.addEventListener('click', close);
      search?.addEventListener('input', filterLibrary);
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) close();
      });
      dialog.addEventListener('close', () => openButton.focus());
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
