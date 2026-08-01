(() => {
  const STORAGE_KEY = 's5:visual-progress:v1';

  const ensureStyles = () => {
    const stylesheets = [
      ['s5-learning-discovery', '/stylesheets/learning-discovery.css'],
      ['s5-learning-discovery-fixes', '/stylesheets/learning-discovery-fixes.css'],
    ];
    for (const [key, href] of stylesheets) {
      if (document.querySelector(`link[data-${key}]`)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute(`data-${key}`, 'true');
      document.head.append(link);
    }
  };

  const readProgress = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  };

  const writeProgress = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  };

  const clearProgress = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore restricted storage contexts.
    }
  };

  const formatTime = (seconds) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
    const minutes = Math.floor(safe / 60);
    const remainder = String(safe % 60).padStart(2, '0');
    return `${minutes}:${remainder}`;
  };

  const setupFilters = (root) => {
    const buttons = [...root.querySelectorAll('[data-s5-topic]')];
    const cards = [...root.querySelectorAll('.s5-watch-grid [data-s5-topic-card]')];
    const status = root.querySelector('[data-s5-filter-status]');
    if (buttons.length === 0 || cards.length === 0) return;

    const apply = (topic) => {
      let visible = 0;
      for (const card of cards) {
        const match = topic === 'all' || card.dataset.s5TopicCard === topic;
        card.hidden = !match;
        if (match) visible += 1;
      }
      for (const button of buttons) {
        button.setAttribute('aria-pressed', String(button.dataset.s5Topic === topic));
      }
      if (status) {
        status.textContent = `${visible} ${visible === 1 ? 'explicación disponible' : 'explicaciones disponibles'}`;
      }
    };

    for (const button of buttons) {
      button.addEventListener('click', () => apply(button.dataset.s5Topic || 'all'));
    }
    apply('all');
  };

  const setupResume = (root, videos) => {
    const banner = root.querySelector('[data-s5-resume]');
    if (!banner) return;

    const title = banner.querySelector('[data-s5-resume-title]');
    const progressText = banner.querySelector('[data-s5-resume-progress]');
    const action = banner.querySelector('[data-s5-resume-action]');
    const chapter = banner.querySelector('[data-s5-resume-chapter]');
    const dismiss = banner.querySelector('[data-s5-resume-dismiss]');

    const refresh = () => {
      const progress = readProgress();
      const video = progress?.id
        ? videos.find((candidate) => candidate.dataset.s5VideoId === progress.id)
        : null;
      const resumable = video && progress.currentTime > 4 && progress.duration > 0 && progress.currentTime < progress.duration - 4;
      if (!resumable) {
        banner.hidden = true;
        return;
      }

      banner.hidden = false;
      if (title) title.textContent = progress.title || video.dataset.s5VideoTitle || 'Vídeo';
      if (progressText) {
        const percent = Math.max(1, Math.min(99, Math.round((progress.currentTime / progress.duration) * 100)));
        progressText.textContent = `${formatTime(progress.currentTime)} de ${formatTime(progress.duration)} · ${percent}% completado`;
      }
      if (chapter) chapter.href = progress.chapter || video.dataset.s5VideoChapter || '#';

      action?.addEventListener('click', async () => {
        const seekAndPlay = async () => {
          video.currentTime = Math.min(progress.currentTime, Math.max(0, video.duration - 1));
          video.scrollIntoView({ behavior: 'smooth', block: 'center' });
          try {
            await video.play();
          } catch {
            // Native controls remain available when autoplay policies block playback.
          }
        };
        if (video.readyState >= 1) await seekAndPlay();
        else video.addEventListener('loadedmetadata', seekAndPlay, { once: true });
      }, { once: true });
    };

    dismiss?.addEventListener('click', () => {
      clearProgress();
      banner.hidden = true;
    });
    refresh();
  };

  const initializeVisualHub = () => {
    ensureStyles();
    const root = document.querySelector('.s5-visual-hub');
    const videos = [...document.querySelectorAll('.s5-inline-video')];

    if (root && root.dataset.s5VisualHubReady !== 'true') {
      root.dataset.s5VisualHubReady = 'true';
      setupFilters(root);
      setupResume(root, videos);
    }

    for (const video of videos) {
      if (video.dataset.s5VideoReady === 'true') continue;
      video.dataset.s5VideoReady = 'true';
      let lastSavedSecond = -1;

      video.addEventListener('play', () => {
        for (const other of videos) {
          if (other !== video && !other.paused) other.pause();
        }
      });

      video.addEventListener('timeupdate', () => {
        if (!video.duration || !video.dataset.s5VideoId) return;
        const currentSecond = Math.floor(video.currentTime);
        if (currentSecond === lastSavedSecond || currentSecond % 3 !== 0) return;
        lastSavedSecond = currentSecond;
        writeProgress({
          id: video.dataset.s5VideoId,
          title: video.dataset.s5VideoTitle || video.getAttribute('aria-label') || 'Vídeo',
          chapter: video.dataset.s5VideoChapter || '',
          currentTime: video.currentTime,
          duration: video.duration,
          updatedAt: Date.now(),
        });
      });

      video.addEventListener('ended', () => {
        const progress = readProgress();
        if (progress?.id === video.dataset.s5VideoId) clearProgress();
      });
    }
  };

  ensureStyles();
  if (typeof document$ !== 'undefined') {
    document$.subscribe(initializeVisualHub);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVisualHub, { once: true });
  } else {
    initializeVisualHub();
  }
})();
