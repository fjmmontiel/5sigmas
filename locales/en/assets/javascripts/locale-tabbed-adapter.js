(() => {
  const adapt = () => {
    document
      .querySelectorAll('[data-ttc-tabs], [data-bon], [data-levers], [data-scale2d]')
      .forEach((root) => root.setAttribute('data-anim-tabs', ''));
    window.TabbedAnimations?.initAll?.();
  };

  if (typeof window.document$ !== 'undefined' && window.document$?.subscribe) {
    window.document$.subscribe(adapt);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', adapt, { once: true });
  } else {
    adapt();
  }
})();
