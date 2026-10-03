(() => {
  'use strict';

  const STORAGE_KEY = 's5:floating-video:v1';
  const MOBILE_QUERY = '(max-width: 760px)';
  const EDGE = 10;
  const MIN_WIDTH = 176;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const mobile = () => window.matchMedia(MOBILE_QUERY).matches;
  const english = () => (document.documentElement.lang || '').toLowerCase().startsWith('en');

  const labels = () => english()
    ? {
        move: 'Move floating video',
        resize: 'Resize floating video',
      }
    : {
        move: 'Mover vídeo flotante',
        resize: 'Redimensionar vídeo flotante',
      };

  const readState = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  };

  const writeState = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A restricted storage context must not affect playback or manipulation.
    }
  };

  const attach = (container) => {
    if (!container) return null;
    if (container.__s5FloatingVideo) return container.__s5FloatingVideo;

    let active = false;
    let drag = null;
    let resize = null;
    let gesture = null;

    const viewport = () => ({
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
    });

    const persist = () => {
      if (!active || !mobile()) return;
      const box = container.getBoundingClientRect();
      const view = viewport();
      writeState({
        width: Math.round(box.width),
        x: Math.round(box.left),
        y: Math.round(box.top),
        viewportWidth: view.width,
        viewportHeight: view.height,
      });
    };

    const constrain = ({ persistState = false } = {}) => {
      if (!active || !mobile()) return;
      const view = viewport();
      let box = container.getBoundingClientRect();

      const maxWidth = Math.max(MIN_WIDTH, view.width - EDGE * 2);
      if (box.width > maxWidth) {
        container.style.width = maxWidth + 'px';
        box = container.getBoundingClientRect();
      }
      const maxHeight = Math.max(96, view.height - EDGE * 2);
      if (box.height > maxHeight) {
        const heightSafeWidth = Math.max(MIN_WIDTH, box.width * (maxHeight / box.height));
        container.style.width = Math.min(maxWidth, heightSafeWidth) + 'px';
        box = container.getBoundingClientRect();
      }

      const maxX = view.width - box.width - EDGE;
      const maxY = view.height - box.height - EDGE;
      const x = clamp(box.left, EDGE, maxX);
      const y = clamp(box.top, EDGE, maxY);
      container.style.left = x + 'px';
      container.style.top = y + 'px';

      if (persistState) persist();
    };

    const applySavedGeometry = () => {
      if (!mobile()) return;
      const view = viewport();
      const saved = readState();
      const maxWidth = Math.max(MIN_WIDTH, view.width - EDGE * 2);
      const defaultWidth = Math.min(300, maxWidth);
      const width = clamp(Number(saved?.width) || defaultWidth, MIN_WIDTH, maxWidth);

      container.style.right = 'auto';
      container.style.bottom = 'auto';
      container.style.width = width + 'px';
      container.style.left = EDGE + 'px';
      container.style.top = EDGE + 'px';

      requestAnimationFrame(() => {
        const box = container.getBoundingClientRect();
        const scaleX = saved?.viewportWidth ? view.width / saved.viewportWidth : 1;
        const scaleY = saved?.viewportHeight ? view.height / saved.viewportHeight : 1;
        const desiredX = Number.isFinite(saved?.x) ? saved.x * scaleX : view.width - box.width - 12;
        const desiredY = Number.isFinite(saved?.y) ? saved.y * scaleY : view.height - box.height - 12;
        container.style.left = clamp(desiredX, EDGE, view.width - box.width - EDGE) + 'px';
        container.style.top = clamp(desiredY, EDGE, view.height - box.height - EDGE) + 'px';
        constrain();
      });
    };

    const endGesture = (event) => {
      if (!gesture) return;
      const target = gesture.target;
      gesture = null;
      try {
        if (event && target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already have been released by the browser.
      }
      persist();
    };

    const beginMove = (event) => {
      if (!active || !mobile() || event.button > 0) return;
      event.preventDefault();
      const box = container.getBoundingClientRect();
      gesture = {
        kind: 'move',
        target: event.currentTarget,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: box.left,
        top: box.top,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const beginResize = (event) => {
      if (!active || !mobile() || event.button > 0) return;
      event.preventDefault();
      const box = container.getBoundingClientRect();
      gesture = {
        kind: 'resize',
        target: event.currentTarget,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: box.width,
        left: box.left,
        top: box.top,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!gesture || event.pointerId !== gesture.pointerId || !active || !mobile()) return;
      event.preventDefault();
      const view = viewport();

      if (gesture.kind === 'move') {
        const box = container.getBoundingClientRect();
        const x = gesture.left + event.clientX - gesture.startX;
        const y = gesture.top + event.clientY - gesture.startY;
        container.style.left = clamp(x, EDGE, view.width - box.width - EDGE) + 'px';
        container.style.top = clamp(y, EDGE, view.height - box.height - EDGE) + 'px';
        return;
      }

      const requested = gesture.width + event.clientX - gesture.startX;
      const maxByRight = view.width - gesture.left - EDGE;
      const maxByHeight = Math.max(MIN_WIDTH, (view.height - gesture.top - EDGE) * (16 / 9));
      const maxWidth = Math.max(MIN_WIDTH, Math.min(view.width - EDGE * 2, maxByRight, maxByHeight));
      container.style.width = clamp(requested, MIN_WIDTH, maxWidth) + 'px';
      constrain();
    };

    const nudgeMove = (event) => {
      if (!active || !mobile() || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 24 : 10;
      const box = container.getBoundingClientRect();
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      container.style.left = (box.left + dx) + 'px';
      container.style.top = (box.top + dy) + 'px';
      constrain({ persistState: true });
    };

    const nudgeResize = (event) => {
      if (!active || !mobile() || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 32 : 16;
      const box = container.getBoundingClientRect();
      const grow = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      const view = viewport();
      const maxByHeight = Math.max(MIN_WIDTH, (view.height - box.top - EDGE) * (16 / 9));
      const maxWidth = Math.max(MIN_WIDTH, Math.min(view.width - box.left - EDGE, maxByHeight));
      container.style.width = clamp(box.width + (grow ? step : -step), MIN_WIDTH, maxWidth) + 'px';
      constrain({ persistState: true });
    };

    const ensureControls = () => {
      if (drag && resize) return;
      const copy = labels();

      drag = document.createElement('button');
      drag.type = 'button';
      drag.className = 's5-floating-drag';
      drag.setAttribute('aria-label', copy.move);
      drag.title = copy.move;
      drag.innerHTML = '<span aria-hidden="true">⠿</span>';

      resize = document.createElement('button');
      resize.type = 'button';
      resize.className = 's5-floating-resize';
      resize.setAttribute('aria-label', copy.resize);
      resize.title = copy.resize;
      resize.innerHTML = '<span aria-hidden="true">↘</span>';

      container.append(drag, resize);

      drag.addEventListener('pointerdown', beginMove);
      resize.addEventListener('pointerdown', beginResize);
      drag.addEventListener('keydown', nudgeMove);
      resize.addEventListener('keydown', nudgeResize);
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', endGesture, { passive: true });
      window.addEventListener('pointercancel', endGesture, { passive: true });
    };

    const activate = () => {
      if (!mobile()) return;
      ensureControls();
      active = true;
      container.classList.add('s5-floating-custom');
      drag.hidden = false;
      resize.hidden = false;
      applySavedGeometry();
    };

    const deactivate = () => {
      if (!active && !container.classList.contains('s5-floating-custom')) return;
      endGesture();
      active = false;
      container.classList.remove('s5-floating-custom');
      container.style.removeProperty('left');
      container.style.removeProperty('top');
      container.style.removeProperty('width');
      container.style.removeProperty('right');
      container.style.removeProperty('bottom');
      if (drag) drag.hidden = true;
      if (resize) resize.hidden = true;
    };

    const onViewportChange = () => {
      if (!container.classList.contains('is-following')) return;
      if (!mobile()) {
        if (active) deactivate();
        return;
      }
      if (!active) {
        activate();
        return;
      }
      constrain({ persistState: true });
    };

    window.addEventListener('resize', onViewportChange, { passive: true });
    window.visualViewport?.addEventListener('resize', onViewportChange, { passive: true });

    const api = { activate, deactivate, constrain };
    container.__s5FloatingVideo = api;
    return api;
  };

  window.S5FloatingVideo = { attach };
})();
