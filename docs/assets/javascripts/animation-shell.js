(() => {
  "use strict";

  const state = {
    overlay: null,
    body: null,
    isOpen: false,
    activeShell: null,
    placeholder: null,
    _resizeObserver: null,
    _scaleRaf: null,
    _tabClickHandler: null,
  };

  // ---- Scale-to-fit logic ----
  // Wraps the animation root in a sized container and applies transform:scale
  // so the animation fills the viewport proportionally (aspect-ratio preserved).
  // Only scales UP (never shrinks). Safe-guard: scale <= 1.01 → skip.

  function applyScaleToFit(shell) {
    const viewport = shell && shell.querySelector(".anim-brand-shell__viewport");
    if (!viewport) return;
    const animRoot = viewport.firstElementChild;
    if (!animRoot || animRoot.classList.contains("anim-scale-wrapper")) return;

    // Clear previous rAF if still pending
    if (state._scaleRaf) { cancelAnimationFrame(state._scaleRaf); state._scaleRaf = null; }

    state._scaleRaf = requestAnimationFrame(() => {
      state._scaleRaf = null;

      // Measure natural dimensions (before any scaling wrapper)
      const natW = animRoot.offsetWidth;
      const natH = animRoot.offsetHeight;
      if (!natW || !natH) return;

      const vpStyle = getComputedStyle(viewport);
      const padW = (parseFloat(vpStyle.paddingLeft) || 0) + (parseFloat(vpStyle.paddingRight) || 0);
      const padH = (parseFloat(vpStyle.paddingTop) || 0) + (parseFloat(vpStyle.paddingBottom) || 0);
      const availW = viewport.clientWidth - padW;
      const availH = viewport.clientHeight - padH;
      if (!availW || !availH) return;

      const scale = Math.min(availW / natW, availH / natH);
      if (scale <= 1.01) return; // already fits — no scaling needed

      // Build wrapper sized to the available space so the viewport's layout is correct
      const wrapper = document.createElement("div");
      wrapper.className = "anim-scale-wrapper";
      wrapper.style.width = availW + "px";
      wrapper.style.height = availH + "px";

      viewport.insertBefore(wrapper, animRoot);
      wrapper.appendChild(animRoot);

      // Fix the animRoot width so flex centering doesn't re-stretch it
      animRoot.style.width = natW + "px";
      animRoot.style.flexShrink = "0";
      animRoot.style.transformOrigin = "center center";
      animRoot.style.transform = "scale(" + scale + ")";
    });
  }

  function clearScale(shell) {
    if (!shell) return;
    const viewport = shell.querySelector(".anim-brand-shell__viewport");
    if (!viewport) return;
    const wrapper = viewport.querySelector(".anim-scale-wrapper");
    if (!wrapper) return;

    const animRoot = wrapper.firstElementChild;
    if (animRoot) {
      animRoot.style.transform = "";
      animRoot.style.transformOrigin = "";
      animRoot.style.width = "";
      animRoot.style.flexShrink = "";
      viewport.insertBefore(animRoot, wrapper);
    }
    wrapper.remove();
  }

  function scheduleResize() {
    if (!state.isOpen || !state.activeShell) return;
    clearScale(state.activeShell);
    applyScaleToFit(state.activeShell);
  }

  function onReady(fn) {
    if (typeof window.document$ !== "undefined" &&
        window.document$ && typeof window.document$.subscribe === "function") {
      window.document$.subscribe(() => fn());
    } else if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function closeModal() {
    if (!state.overlay) return;
    if (state._scaleRaf) { cancelAnimationFrame(state._scaleRaf); state._scaleRaf = null; }
    if (state._resizeObserver) { state._resizeObserver.disconnect(); }
    if (state._tabClickHandler && state.activeShell) {
      state.activeShell.removeEventListener("click", state._tabClickHandler);
      state._tabClickHandler = null;
    }
    clearScale(state.activeShell);
    state.overlay.classList.remove("is-open");
    state.overlay.setAttribute("aria-hidden", "true");
    if (state.activeShell && state.placeholder && state.placeholder.parentNode) {
      state.activeShell.removeAttribute("data-anim-shell-live");
      state.placeholder.replaceWith(state.activeShell);
    }
    if (state.body) state.body.innerHTML = "";
    document.body.classList.remove("anim-shell-modal-open");
    state.isOpen = false;
    state.activeShell = null;
    state.placeholder = null;
  }

  function ensureModal() {
    if (state.overlay) return;

    const overlay = document.createElement("div");
    overlay.className = "anim-shell-modal";
    overlay.setAttribute("aria-hidden", "true");

    const backdrop = document.createElement("div");
    backdrop.className = "anim-shell-modal__backdrop";
    backdrop.addEventListener("click", closeModal);

    const dialog = document.createElement("div");
    dialog.className = "anim-shell-modal__dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const head = document.createElement("div");
    head.className = "anim-shell-modal__head";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "anim-shell-modal__close";
    closeBtn.textContent = "Cerrar";
    closeBtn.setAttribute("aria-label", "Cerrar vista ampliada");
    closeBtn.addEventListener("click", closeModal);

    const body = document.createElement("div");
    body.className = "anim-shell-modal__body";

    head.appendChild(closeBtn);
    dialog.appendChild(head);
    dialog.appendChild(body);
    overlay.appendChild(backdrop);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && state.isOpen) closeModal();
    });

    state.overlay = overlay;
    state.body = body;
  }

  function openModalFromShell(shell) {
    if (!shell) return;
    ensureModal();
    if (state.isOpen) closeModal();

    if (!state.body) return;

    state.body.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.hidden = true;
    shell.after(placeholder);
    shell.setAttribute("data-anim-shell-live", "modal");
    state.body.appendChild(shell);
    state.body.dataset.animContrast = shell.getAttribute("data-anim-contrast") || "force";
    state.activeShell = shell;
    state.placeholder = placeholder;

    state.overlay.classList.add("is-open");
    state.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("anim-shell-modal-open");
    state.isOpen = true;

    if (window.TabbedAnimations && typeof window.TabbedAnimations.initAll === "function") {
      window.TabbedAnimations.initAll();
    }

    // Scale animation to fill the modal viewport
    applyScaleToFit(shell);

    // Re-scale on window/dialog resize
    if (typeof ResizeObserver !== "undefined") {
      if (state._resizeObserver) state._resizeObserver.disconnect();
      state._resizeObserver = new ResizeObserver(scheduleResize);
      const vp = shell.querySelector(".anim-brand-shell__viewport");
      if (vp) state._resizeObserver.observe(vp);
    }

    // Re-scale when user switches tabs (different panels may have different heights)
    const tabHandler = (ev) => {
      const btn = ev.target && typeof ev.target.closest === "function"
        ? ev.target.closest("[data-tab], .num-tab, [role='tab']")
        : null;
      if (!btn) return;
      setTimeout(() => {
        if (state.isOpen && state.activeShell) {
          clearScale(state.activeShell);
          applyScaleToFit(state.activeShell);
        }
      }, 50);
    };
    shell.addEventListener("click", tabHandler);
    state._tabClickHandler = tabHandler;
  }

  function bindShells(root) {
    (root || document).querySelectorAll('[data-anim-shell][data-anim-fullscreen="on"]').forEach((shell) => {
      if (shell.dataset.animShellBound === "1") return;
      shell.dataset.animShellBound = "1";

      const btn = shell.querySelector("[data-anim-shell-open]");
      if (!btn) return;
      btn.hidden = false;
      btn.addEventListener("click", () => openModalFromShell(shell));

      const viewport = shell.querySelector(".anim-brand-shell__viewport");
      if (viewport) {
        viewport.addEventListener("dblclick", (ev) => {
          const target = ev.target;
          if (target && typeof target.closest === "function" && target.closest("a,button,input,select,textarea,label")) {
            return;
          }
          openModalFromShell(shell);
        });
      }
    });
  }

  function init() {
    if (state.isOpen) closeModal();
    bindShells(document);
  }

  onReady(init);
})();
