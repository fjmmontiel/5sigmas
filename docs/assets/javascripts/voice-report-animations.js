(() => {
  "use strict";

  const ROOT_SELECTOR = ".anim-brand-shell__viewport > :is(.vrpv, .varch)";
  let activeShells = new Set();
  let observer = null;

  function syncBodyState() {
    const focused = [...activeShells].some((shell) => shell.isConnected);
    document.body.classList.toggle("s5-voice-animation-focus", focused);
  }

  function bind(root = document) {
    const shells = [...root.querySelectorAll("[data-anim-shell]")].filter((shell) =>
      shell.querySelector(ROOT_SELECTOR)
    );

    if (!shells.length) {
      activeShells.clear();
      syncBodyState();
      return;
    }

    if (observer) observer.disconnect();
    activeShells = new Set();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
            activeShells.add(entry.target);
          } else {
            activeShells.delete(entry.target);
          }
        }
        syncBodyState();
      },
      { threshold: [0, 0.12, 0.35], rootMargin: "-5% 0px -5% 0px" }
    );

    for (const shell of shells) {
      observer.observe(shell);
      shell.addEventListener("focusin", () => {
        activeShells.add(shell);
        syncBodyState();
      });
      shell.addEventListener("pointerdown", () => {
        activeShells.add(shell);
        syncBodyState();
      }, { passive: true });
    }
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(() => bind(document));
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bind(document), { once: true });
  } else {
    bind(document);
  }
})();
