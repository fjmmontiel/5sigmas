(() => {
  const MOBILE_QUERY = '(max-width: 1319px)';

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const initializeDirectReaderNavigation = () => {
    for (const root of document.querySelectorAll('[data-s5-reader-direct]')) {
      if (root.dataset.s5DirectReady === 'true') continue;
      root.dataset.s5DirectReady = 'true';

      const search = root.querySelector('[data-s5-reader-direct-search]');
      const collections = [...root.querySelectorAll('[data-s5-reader-collection]')];
      const entries = [...root.querySelectorAll('[data-s5-direct-entry]')];
      const empty = root.querySelector('[data-s5-reader-direct-empty]');
      const collectionScroller = root.querySelector('.s5-reader-direct__collections');
      const current = root.querySelector('a[aria-current="page"]');
      const toggle = document.querySelector('[data-s5-reader-direct-open]');
      const closeButton = root.querySelector('[data-s5-reader-direct-close]');
      const overlay = document.querySelector('[data-s5-reader-direct-overlay]');
      if (!search || collections.length === 0 || !toggle || !closeButton || !overlay) continue;

      let openBeforeSearch = null;

      const resetHorizontalScroll = () => {
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;
      };

      const scrollCurrentIntoView = () => {
        requestAnimationFrame(() => {
          if (!current || !collectionScroller) return;
          const currentCollection = current.closest('[data-s5-reader-collection]');
          if (currentCollection) currentCollection.open = true;
          const targetTop = current.getBoundingClientRect().top;
          const scrollerTop = collectionScroller.getBoundingClientRect().top;
          collectionScroller.scrollTop += targetTop - scrollerTop - 28;
        });
      };

      const snapshotOpenState = () => new Set(
        collections.filter((collection) => collection.open).map((collection) => collection.id),
      );

      const restore = ({ restoreOpenState = true } = {}) => {
        for (const collection of collections) collection.hidden = false;
        for (const entry of entries) entry.hidden = false;
        if (restoreOpenState && openBeforeSearch) {
          for (const collection of collections) {
            collection.open = openBeforeSearch.has(collection.id);
          }
          openBeforeSearch = null;
        }
        if (empty) empty.hidden = true;
      };

      const filter = () => {
        const query = normalize(search.value);
        if (!query) {
          restore();
          return;
        }

        if (openBeforeSearch === null) openBeforeSearch = snapshotOpenState();

        let visibleCollections = 0;
        for (const collection of collections) {
          const collectionMatches = normalize(collection.dataset.search || '').includes(query);
          let visibleEntries = 0;

          for (const entry of collection.querySelectorAll('[data-s5-direct-entry]')) {
            const matches = collectionMatches || normalize(entry.dataset.search || entry.textContent).includes(query);
            entry.hidden = !matches;
            if (matches) visibleEntries += 1;
          }

          collection.hidden = visibleEntries === 0;
          collection.open = !collection.hidden;
          if (!collection.hidden) visibleCollections += 1;
        }

        if (empty) empty.hidden = visibleCollections > 0;
        if (collectionScroller) collectionScroller.scrollTop = 0;
      };

      const open = () => {
        if (!window.matchMedia(MOBILE_QUERY).matches) return;
        root.classList.add('is-open');
        overlay.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('s5-reader-direct-open');
        resetHorizontalScroll();
        scrollCurrentIntoView();
        requestAnimationFrame(() => search.focus({ preventScroll: true }));
      };

      const close = ({ restoreFocus = true } = {}) => {
        root.classList.remove('is-open');
        overlay.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('s5-reader-direct-open');
        resetHorizontalScroll();
        if (restoreFocus) toggle.focus({ preventScroll: true });
      };

      search.addEventListener('input', filter);
      toggle.addEventListener('click', open);
      closeButton.addEventListener('click', () => close());
      overlay.addEventListener('click', () => close());

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && root.classList.contains('is-open')) close();
      });

      const media = window.matchMedia(MOBILE_QUERY);
      media.addEventListener('change', (event) => {
        if (!event.matches) close({ restoreFocus: false });
      });

      restore({ restoreOpenState: false });
      scrollCurrentIntoView();
    }
  };

  if (typeof document$ !== 'undefined') {
    document$.subscribe(initializeDirectReaderNavigation);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDirectReaderNavigation, { once: true });
  } else {
    initializeDirectReaderNavigation();
  }
})();
