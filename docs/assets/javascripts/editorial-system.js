(() => {
  const install = () => {
    document.querySelectorAll('.s5-progress').forEach((node) => node.remove());

    if (!document.querySelector('.s5-landing')) {
      const progress = document.createElement('div');
      progress.className = 's5-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.appendChild(progress);

      const updateProgress = () => {
        const root = document.documentElement;
        const distance = root.scrollHeight - root.clientHeight;
        const ratio = distance > 0 ? root.scrollTop / distance : 0;
        progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
      };

      updateProgress();
      window.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress, { passive: true });
    }

    document.querySelectorAll('.s5-observatory').forEach((panel) => {
      const chart = panel.querySelector('.s5-observatory__chart');
      if (!chart) return;

      panel.addEventListener('pointermove', (event) => {
        const bounds = panel.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
        chart.style.transform = `translate(${x * 0.35}px, ${y * 0.35}px)`;
      });

      panel.addEventListener('pointerleave', () => {
        chart.style.transform = '';
      });
    });
  };

  if (typeof document$ !== 'undefined' && document$.subscribe) {
    document$.subscribe(install);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
