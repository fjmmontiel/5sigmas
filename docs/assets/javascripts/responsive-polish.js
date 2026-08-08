(() => {
  const alignReaderTab = (dialog) => {
    if (!dialog || !window.matchMedia('(max-width: 800px)').matches) return;
    const selected = dialog.querySelector('[data-s5-series-tab][aria-selected="true"]');
    if (!selected) return;
    selected.scrollIntoView({ block: 'nearest', inline: 'start' });
  };

  const initializeReaderLibraryPolish = () => {
    for (const dialog of document.querySelectorAll('[data-s5-reader-library]')) {
      if (dialog.dataset.s5ResponsivePolish === 'true') continue;
      dialog.dataset.s5ResponsivePolish = 'true';

      const observer = new MutationObserver(() => {
        if (!dialog.hasAttribute('open')) return;
        requestAnimationFrame(() => requestAnimationFrame(() => alignReaderTab(dialog)));
      });
      observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });

      for (const tab of dialog.querySelectorAll('[data-s5-series-tab]')) {
        tab.addEventListener('click', () => {
          requestAnimationFrame(() => alignReaderTab(dialog));
        });
      }
    }
  };

  const initializeVideoFilterPolish = () => {
    for (const filters of document.querySelectorAll('.s5-video-library__filters')) {
      if (filters.dataset.s5ResponsivePolish === 'true') continue;
      filters.dataset.s5ResponsivePolish = 'true';
      filters.addEventListener('click', (event) => {
        const button = event.target.closest('[data-s5-video-filter]');
        if (!button || !filters.contains(button)) return;
        requestAnimationFrame(() => {
          button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
      });
    }
  };

  const initializeInlineVideos = () => {
    for (const root of document.querySelectorAll('[data-s5-inline-video]')) {
      if (root.dataset.s5InlineVideoReady === 'true') continue;
      root.dataset.s5InlineVideoReady = 'true';

      const player = root.querySelector('[data-s5-inline-video-player]');
      const start = root.querySelector('[data-s5-inline-video-start]');
      if (!player || !start) continue;

      start.addEventListener('click', () => {
        root.classList.add('is-playing');
        player.controls = true;
        player.load();
        const promise = player.play();
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      });

      player.addEventListener('ended', () => {
        root.classList.remove('is-playing');
        player.currentTime = 0;
      });
    }
  };

  const initialize = () => {
    initializeReaderLibraryPolish();
    initializeVideoFilterPolish();
    initializeInlineVideos();
  };

  if (typeof document$ !== 'undefined') {
    document$.subscribe(initialize);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
