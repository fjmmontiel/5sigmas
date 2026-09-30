(() => {
  const MOBILE_QUERY = '(max-width: 1319px)';

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Gallery cards already link to their article. Expose the parent series
  // without changing the player, artwork, article URL, or anchor-card markup.
  const initializeGallerySeriesLinks = () => {
    if (!document.querySelector('.sx-series-entry, .sx-discovery-banner')) return;
    const en = document.documentElement.lang?.startsWith('en');
    for (const card of document.querySelectorAll('.s5-watch-card, .s5-media-card')) {
      if (card.matches('a') || card.dataset.sxParent) continue;
      const chapter = [...card.querySelectorAll('a[href]')].find((link) =>
        link.origin === location.origin && /\/(?:videos\/)?series\/[^/]+\/[^/]+\//.test(link.pathname),
      );
      if (!chapter) continue;
      const slug = chapter.pathname.match(/\/(?:videos\/)?series\/([^/]+)\//)[1];
      const parent = document.createElement('a');
      parent.className = 'sx-parent-series';
      parent.href = `${en ? '/en' : ''}/series/#serie-${slug}`;
      parent.textContent = en ? 'Explore this series →' : 'Explorar esta serie →';
      card.appendChild(parent);
      card.dataset.sxParent = 'true';
    }
  };

  // Fullscreen belongs to the current learning scene. Escape must also work in
  // embedded/kiosk browsers, without depending on browser-chrome key handling.
  // One delegated listener survives document$ navigation; native video fullscreen
  // remains owned by the browser and is deliberately not intercepted.
  let fullscreenNavigationBound = false;
  let expandedMechanism = null;
  const initializeMechanismFullscreenNavigation = () => {
    const synchronize = () => {
      const current = document.fullscreenElement;
      const previous = expandedMechanism;
      expandedMechanism = current?.matches('[data-sx-guide]') ? current : null;
      for (const button of document.querySelectorAll('[data-sx-fullscreen]')) {
        const root = button.closest('[data-sx-guide]');
        const expanded = root === expandedMechanism;
        const en = (root?.dataset.locale || document.documentElement.lang || 'es').startsWith('en');
        const label = expanded
          ? (en ? 'Exit fullscreen' : 'Salir de pantalla completa')
          : (en ? 'Expand mechanism' : 'Ampliar mecanismo');
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-pressed', String(expanded));
        button.title = label;
      }
      if (previous && !current && previous.isConnected) {
        previous.querySelector('[data-sx-fullscreen]')?.focus({ preventScroll: true });
      }
    };
    if (!fullscreenNavigationBound) {
      fullscreenNavigationBound = true;
      document.addEventListener('fullscreenchange', synchronize);
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !document.fullscreenElement?.matches('[data-sx-guide]')) return;
        event.preventDefault();
        // The existing button still provides an exit if a browser rejects the API.
        document.exitFullscreen().catch(synchronize);
      });
    }
    synchronize();
  };

  // A saved link must still reach a diagram after it moves into the reference
  // tab. A locale switch must preserve the selected series, not reset the hub.
  let seriesDeepLinksBound = false;
  const initializeSeriesDeepLinks = () => {
    const synchronize = () => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      if (document.querySelector('[data-sx-hub]')) {
        const shared = /^(?:serie-[a-z0-9-]+|mapa|catalogo)$/.test(id) ? '#' + id : '';
        for (const link of document.querySelectorAll('.md-select a[href]')) {
          const target = new URL(link.href, location.href);
          if (/^\/(?:en\/)?series\/$/.test(target.pathname)) {
            target.hash = shared;
            link.href = target.href;
          }
        }
      }
      const target = id ? document.getElementById(id) : null;
      const panel = target?.closest('[data-sx-panel="original"]');
      const guide = panel?.closest('[data-sx-guide]');
      if (guide?.dataset.ready === 'true' && panel.hidden) {
        guide.querySelector('[data-sx-tab="original"]')?.click();
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    };
    if (!seriesDeepLinksBound) {
      seriesDeepLinksBound = true;
      window.addEventListener('hashchange', () => requestAnimationFrame(synchronize));
      document.addEventListener('click', (event) => {
        const link = event.target.closest?.('a[href]');
        if (!link) return;
        const target = new URL(link.href, location.href);
        if (target.origin === location.origin && target.pathname === location.pathname && target.hash) {
          requestAnimationFrame(synchronize);
        }
      });
    }
    // The series module is loaded after reader navigation; its initial render
    // must finish before selecting the reference tab for an incoming fragment.
    requestAnimationFrame(synchronize);
  };

  const initializeDirectReaderNavigation = () => {
    initializeGallerySeriesLinks();
    initializeMechanismFullscreenNavigation();
    initializeSeriesDeepLinks();
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
