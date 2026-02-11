(() => {
  "use strict";

  const state = {
    overlay: null,
    body: null,
    isOpen: false,
  };

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
    state.overlay.classList.remove("is-open");
    state.overlay.setAttribute("aria-hidden", "true");
    if (state.body) state.body.innerHTML = "";
    document.body.classList.remove("anim-shell-modal-open");
    state.isOpen = false;
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

    const viewport = shell.querySelector(".anim-brand-shell__viewport");
    if (!viewport || !state.body) return;

    state.body.innerHTML = "";
    state.body.dataset.animContrast = shell.getAttribute("data-anim-contrast") || "force";
    const clone = viewport.cloneNode(true);
    clone.querySelectorAll("[data-anim-shell-open]").forEach((btn) => btn.remove());
    state.body.appendChild(clone);

    state.overlay.classList.add("is-open");
    state.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("anim-shell-modal-open");
    state.isOpen = true;

    if (window.TabbedAnimations && typeof window.TabbedAnimations.initAll === "function") {
      window.TabbedAnimations.initAll();
    }
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
    bindShells(document);
  }

  onReady(init);
})();
