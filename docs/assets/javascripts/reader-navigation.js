(() => {
  const initializeReaderNavigation = () => {
    for (const root of document.querySelectorAll('[data-s5-reader-nav]')) {
      if (root.dataset.s5ReaderReady === 'true') continue;
      root.dataset.s5ReaderReady = 'true';

      const dialog = root.querySelector('[data-s5-reader-library]');
      const openButton = root.querySelector('[data-s5-reader-open]');
      const closeButton = root.querySelector('[data-s5-reader-close]');
      if (!dialog || !openButton || !closeButton) continue;

      const close = () => {
        if (dialog.open) dialog.close();
      };

      openButton.addEventListener('click', () => {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      });
      closeButton.addEventListener('click', close);
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
