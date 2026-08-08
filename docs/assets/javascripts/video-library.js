(() => {
  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
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

  const searchScore = (card, query, tokens) => {
    const title = normalize(card.querySelector('h2')?.textContent);
    const haystack = normalize(card.dataset.search || card.textContent);
    if (!tokens.every((token) => haystack.includes(token))) return null;
    if (title === query) return 0;
    if (title.startsWith(query)) return 1;
    if (title.includes(query)) return 2;
    if (tokens.every((token) => title.includes(token))) return 3;
    if (haystack.includes(query)) return 4;
    return 5;
  };

  const initializeLibrary = (root) => {
    if (root.dataset.s5VideoLibraryReady === 'true') return;
    root.dataset.s5VideoLibraryReady = 'true';

    const search = root.querySelector('[data-s5-video-search]');
    const filters = [...root.querySelectorAll('[data-s5-video-filter]')];
    const filterStrip = root.querySelector('.s5-video-library__filters');
    const cards = [...root.querySelectorAll('[data-s5-video-card]')];
    const grid = root.querySelector('[data-s5-video-grid]');
    const status = root.querySelector('[data-s5-video-status]');
    const empty = root.querySelector('[data-s5-video-empty]');
    if (!search || filters.length === 0 || cards.length === 0) return;

    const originalOrder = new Map(cards.map((card, index) => [card, index]));
    let activeTopic = 'all';

    const syncFilterStrip = () => {
      if (!filterStrip) return;
      const maxScroll = Math.max(0, filterStrip.scrollWidth - filterStrip.clientWidth);
      const scrolled = filterStrip.scrollLeft > 2;
      const atEnd = maxScroll > 2 && filterStrip.scrollLeft >= maxScroll - 2;
      filterStrip.classList.toggle('is-scrolled', scrolled);
      filterStrip.classList.toggle('is-at-end', atEnd);

      if (!window.matchMedia('(max-width: 800px)').matches || maxScroll <= 2) {
        filterStrip.style.maskImage = '';
        filterStrip.style.webkitMaskImage = '';
        return;
      }

      const right = 'linear-gradient(to right, #000 0, #000 calc(100% - 24px), transparent 100%)';
      const both = 'linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)';
      const left = 'linear-gradient(to right, transparent 0, #000 24px, #000 100%)';
      const mask = atEnd ? left : (scrolled ? both : right);
      filterStrip.style.maskImage = mask;
      filterStrip.style.webkitMaskImage = mask;
    };

    const apply = () => {
      const query = normalize(search.value);
      const tokens = query ? query.split(' ') : [];
      let visible = 0;

      for (const card of cards) {
        const topicMatches = activeTopic === 'all' || card.dataset.topic === activeTopic;
        const score = query ? searchScore(card, query, tokens) : 0;
        const textMatches = !query || score !== null;
        card.hidden = !(topicMatches && textMatches);
        card.dataset.s5VideoSearchScore = String(score ?? 999);
        if (!card.hidden) visible += 1;
      }

      if (grid) {
        const ordered = [...cards].sort((left, right) => {
          if (query && left.hidden !== right.hidden) return left.hidden ? 1 : -1;
          if (query && !left.hidden && !right.hidden) {
            const scoreDifference = Number(left.dataset.s5VideoSearchScore)
              - Number(right.dataset.s5VideoSearchScore);
            if (scoreDifference !== 0) return scoreDifference;
          }
          return originalOrder.get(left) - originalOrder.get(right);
        });
        for (const card of ordered) grid.append(card);
      }

      if (status) {
        status.textContent = `${visible} ${visible === 1 ? 'vídeo disponible' : 'vídeos disponibles'}`;
      }
      if (empty) empty.hidden = visible !== 0;
    };

    filterStrip?.addEventListener('scroll', syncFilterStrip, { passive: true });

    for (const filter of filters) {
      filter.addEventListener('click', () => {
        activeTopic = filter.dataset.s5VideoFilter || 'all';
        for (const candidate of filters) {
          candidate.setAttribute('aria-pressed', String(candidate === filter));
        }
        apply();
        requestAnimationFrame(() => {
          filter.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          requestAnimationFrame(syncFilterStrip);
        });
      });
    }

    search.addEventListener('input', apply);
    apply();
    requestAnimationFrame(syncFilterStrip);
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

  const initializeInlineVideo = (root) => {
    if (root.dataset.s5InlineVideoReady === 'true') return;
    root.dataset.s5InlineVideoReady = 'true';

    const player = root.querySelector('[data-s5-inline-video-player]');
    const start = root.querySelector('[data-s5-inline-video-start]');
    if (!player || !start) return;

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
  };

  const initialize = () => {
    for (const root of document.querySelectorAll('[data-s5-video-library]')) {
      initializeLibrary(root);
    }
    for (const root of document.querySelectorAll('[data-s5-video-watch]')) {
      initializeWatchPage(root);
    }
    for (const root of document.querySelectorAll('[data-s5-inline-video]')) {
      initializeInlineVideo(root);
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
