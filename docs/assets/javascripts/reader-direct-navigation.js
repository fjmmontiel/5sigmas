(() => {
  const fixedTop = () => {
    if (window.matchMedia('(max-width: 800px)').matches) return 116;
    if (window.matchMedia('(max-width: 960px)').matches) return 122;
    return 170;
  };

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

      const placeholder = document.createElement('div');
      placeholder.className = 's5-reader-direct-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      root.before(placeholder);

      let scheduled = false;
      const sync = () => {
        scheduled = false;
        const rect = placeholder.getBoundingClientRect();
        const shouldFix = rect.top <= fixedTop();

        if (shouldFix) {
          const height = root.offsetHeight;
          placeholder.style.setProperty('--s5-reader-placeholder-height', `${height}px`);
          placeholder.classList.add('is-active');
          root.style.setProperty('--s5-reader-fixed-left', `${rect.left}px`);
          root.style.setProperty('--s5-reader-fixed-width', `${rect.width}px`);
          root.classList.add('is-fixed');
        } else {
          placeholder.classList.remove('is-active');
          root.classList.remove('is-fixed');
          root.style.removeProperty('--s5-reader-fixed-left');
          root.style.removeProperty('--s5-reader-fixed-width');
        }
      };

      const scheduleSync = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(sync);
      };

      window.addEventListener('scroll', scheduleSync, { passive: true });
      window.addEventListener('resize', scheduleSync, { passive: true });
      requestAnimationFrame(sync);
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
