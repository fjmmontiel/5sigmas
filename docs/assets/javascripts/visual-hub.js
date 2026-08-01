(() => {
  const initializeVisualHub = () => {
    const videos = [...document.querySelectorAll('.s5-inline-video')];
    if (videos.length === 0) return;

    for (const video of videos) {
      if (video.dataset.s5VisualHubReady === 'true') continue;
      video.dataset.s5VisualHubReady = 'true';

      video.addEventListener('play', () => {
        for (const other of videos) {
          if (other !== video && !other.paused) other.pause();
        }
      });
    }
  };

  if (typeof document$ !== 'undefined') {
    document$.subscribe(initializeVisualHub);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVisualHub, { once: true });
  } else {
    initializeVisualHub();
  }
})();
