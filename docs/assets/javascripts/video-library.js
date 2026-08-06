(() => {
  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const parseTimestamp = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
    if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) return null;
    const parts = text.split(':').map((item) => Number.parseInt(item, 10));
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  };

  const initializeLibrary = (root) => {
    if (root.dataset.s5VideoLibraryReady === 'true') return;
    root.dataset.s5VideoLibraryReady = 'true';

    const search = root.querySelector('[data-s5-video-search]');
    const filters = [...root.querySelectorAll('[data-s5-video-filter]')];
    const cards = [...root.querySelectorAll('[data-s5-video-card]')];
    const status = root.querySelector('[data-s5-video-status]');
    const empty = root.querySelector('[data-s5-video-empty]');
    if (!search || filters.length === 0 || cards.length === 0) return;

    let activeTopic = 'all';

    const apply = () => {
      const query = normalize(search.value);
      let visible = 0;

      for (const card of cards) {
        const topicMatches = activeTopic === 'all' || card.dataset.topic === activeTopic;
        const textMatches = !query || normalize(card.dataset.search || card.textContent).includes(query);
        card.hidden = !(topicMatches && textMatches);
        if (!card.hidden) visible += 1;
      }

      if (status) {
        status.textContent = `${visible} ${visible === 1 ? 'vídeo disponible' : 'vídeos disponibles'}`;
      }
      if (empty) empty.hidden = visible !== 0;
    };

    for (const filter of filters) {
      filter.addEventListener('click', () => {
        activeTopic = filter.dataset.s5VideoFilter || 'all';
        for (const candidate of filters) {
          candidate.setAttribute('aria-pressed', String(candidate === filter));
        }
        apply();
      });
    }

    search.addEventListener('input', apply);
    apply();
  };

  const initializeWatchPage = (root) => {
    if (root.dataset.s5VideoWatchReady === 'true') return;
    root.dataset.s5VideoWatchReady = 'true';

    const player = root.querySelector('[data-s5-watch-player]');
    if (!player) return;

    const seek = (seconds, { play = false } = {}) => {
      if (!Number.isFinite(seconds) || seconds < 0) return;
      const apply = () => {
        const target = Number.isFinite(player.duration)
          ? Math.min(seconds, Math.max(0, player.duration - 0.25))
          : seconds;
        player.currentTime = target;
        if (play) player.play().catch(() => {});
      };

      if (player.readyState >= 1) apply();
      else player.addEventListener('loadedmetadata', apply, { once: true });
    };

    const initial = parseTimestamp(new URL(window.location.href).searchParams.get('t'));
    if (initial !== null) seek(initial);

    for (const link of root.querySelectorAll('[data-s5-video-seek]')) {
      link.addEventListener('click', (event) => {
        const seconds = parseTimestamp(link.dataset.s5VideoSeek);
        if (seconds === null) return;
        event.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set('t', String(seconds));
        window.history.replaceState({}, '', url);
        seek(seconds, { play: true });
        player.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const initialize = () => {
    for (const root of document.querySelectorAll('[data-s5-video-library]')) {
      initializeLibrary(root);
    }
    for (const root of document.querySelectorAll('[data-s5-video-watch]')) {
      initializeWatchPage(root);
    }
  };

  if (typeof document$ !== 'undefined') {
    document$.subscribe(initialize);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
