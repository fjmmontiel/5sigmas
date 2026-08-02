(() => {
  const MOBILE_QUERY = '(max-width: 1319px)';

  const initializeDirectReaderNavigation = () => {
    for (const root of document.querySelectorAll('[data-s5-reader-direct]')) {
      if (root.dataset.s5DirectReady === 'true') continue;
      root.dataset.s5DirectReady = 'true';

      const picker = root.querySelector('[data-s5-reader-series-picker]');
      const collections = [...root.querySelectorAll('[data-s5-reader-collection]')];
      const toggle = document.querySelector('[data-s5-reader-direct-open]');
      const closeButton = root.querySelector('[data-s5-reader-direct-close]');
      const overlay = document.querySelector('[data-s5-reader-direct-overlay]');
      const mapButton = root.querySelector('[data-s5-reader-open]');
      if (!picker || collections.length === 0 || !toggle || !closeButton || !overlay) continue;

      const activate = (id, { focusCurrent = false } = {}) => {
        picker.value = id;
        for (const collection of collections) {
          const active = collection.dataset.s5ReaderCollection === id;
          collection.hidden = !active;
          if (active && focusCurrent) {
            const target = collection.querySelector('a[aria-current="page"]') || collection.querySelector('a');
            requestAnimationFrame(() => target?.scrollIntoView({ block: 'nearest' }));
          }
        }
      };

      const open = () => {
        if (!window.matchMedia(MOBILE_QUERY).matches) return;
        root.classList.add('is-open');
        overlay.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('s5-reader-direct-open');
        requestAnimationFrame(() => picker.focus());
      };

      const close = ({ restoreFocus = true } = {}) => {
        root.classList.remove('is-open');
        overlay.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('s5-reader-direct-open');
        if (restoreFocus) toggle.focus();
      };

      picker.addEventListener('change', () => activate(picker.value, { focusCurrent: true }));
      toggle.addEventListener('click', open);
      closeButton.addEventListener('click', () => close());
      overlay.addEventListener('click', () => close());
      mapButton?.addEventListener('click', () => close({ restoreFocus: false }));

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && root.classList.contains('is-open')) close();
      });

      const media = window.matchMedia(MOBILE_QUERY);
      media.addEventListener('change', (event) => {
        if (!event.matches) close({ restoreFocus: false });
      });

      activate(picker.value, { focusCurrent: true });
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
