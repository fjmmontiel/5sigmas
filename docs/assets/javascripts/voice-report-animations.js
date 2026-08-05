(() => {
  "use strict";

  const ROOT_SELECTOR = ".anim-brand-shell__viewport > :is(.vrpv, .varch)";
  const COMPACT_WIDTH = 760;
  let activeShells = new Set();
  let observer = null;

  function isCompact(shell) {
    const viewport = shell.querySelector(".anim-brand-shell__viewport");
    return Boolean(viewport && viewport.getBoundingClientRect().width <= COMPACT_WIDTH);
  }

  function syncBodyState() {
    const focused = [...activeShells].some((shell) => shell.isConnected && isCompact(shell));
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
          if (entry.isIntersecting && entry.intersectionRatio >= 0.18) {
            activeShells.add(entry.target);
          } else {
            activeShells.delete(entry.target);
          }
        }
        syncBodyState();
      },
      { threshold: [0, 0.18, 0.5], rootMargin: "-8% 0px -8% 0px" }
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

    window.addEventListener("resize", syncBodyState, { passive: true });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(() => bind(document));
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bind(document), { once: true });
  } else {
    bind(document);
  }
})();
