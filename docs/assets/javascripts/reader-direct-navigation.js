(() => {
  const initializeDirectReaderNavigation = () => {
    for (const root of document.querySelectorAll('[data-s5-reader-direct]')) {
      if (root.dataset.s5DirectReady === 'true') continue;
      root.dataset.s5DirectReady = 'true';

      for (const select of root.querySelectorAll('[data-s5-reader-jump]')) {
        select.addEventListener('change', () => {
          const target = select.value;
          if (!target || target === window.location.pathname) return;
          window.location.assign(target);
        });
      }
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
