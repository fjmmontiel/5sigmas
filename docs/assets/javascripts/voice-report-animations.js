(() => {
  "use strict";

  const ROOT_SELECTOR = ".anim-brand-shell__viewport > .s5v";
  const timers = new WeakMap();
  let focusObserver = null;
  let activeShells = new Set();

  function syncBodyState() {
    const active = [...activeShells].some((shell) => shell.isConnected);
    document.body.classList.toggle("s5-voice-animation-focus", active);
  }

  function setStep(root, step, { user = false } = {}) {
    const max = Number(root.dataset.s5vSteps || 1);
    const next = Math.min(max, Math.max(1, Number(step) || 1));
    root.dataset.step = String(next);
    root.style.setProperty("--s5v-step", String(next));

    root.querySelectorAll("[data-s5v-step]").forEach((button) => {
      const selected = Number(button.dataset.s5vStep) === next;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      if (selected) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    const value = root.querySelector("[data-s5v-step-value]");
    if (value) value.textContent = String(next);

    if (root.classList.contains("s5v-batch")) {
      const count = root.querySelector(".s5v-batch__progress b");
      if (count) count.textContent = next >= 4 ? "3/3" : `${Math.max(0, next - 1)}/3`;
    }

    if (user) {
      root.dataset.s5vPaused = "true";
      const timer = timers.get(root);
      if (timer) window.clearInterval(timer);
    }
  }

  function bindStepper(root) {
    if (root.dataset.s5vBound === "true") return;
    root.dataset.s5vBound = "true";

    setStep(root, root.dataset.step || 1);

    root.querySelectorAll("[data-s5v-step]").forEach((button) => {
      button.addEventListener("click", () => setStep(root, button.dataset.s5vStep, { user: true }));
    });

    const interval = Number(root.dataset.s5vAutoplay || 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!interval || reduced) return;

    const timer = window.setInterval(() => {
      if (root.dataset.s5vPaused === "true" || document.hidden || !root.isConnected) return;
      const max = Number(root.dataset.s5vSteps || 1);
      const current = Number(root.dataset.step || 1);
      setStep(root, current >= max ? 1 : current + 1);
    }, interval);
    timers.set(root, timer);
  }

  function bindSpeechPlan(root) {
    if (root.dataset.s5vSpeechBound === "true") return;
    root.dataset.s5vSpeechBound = "true";

    root.querySelectorAll("input[data-s5v-var]").forEach((input) => {
      const output = input.parentElement?.querySelector("output");
      const sync = () => {
        const key = input.dataset.s5vVar;
        const value = Number(input.value);
        if (key === "pace") {
          root.style.setProperty("--pace", String(value / 100));
          if (output) output.textContent = `${(value / 100).toFixed(2)}×`;
        } else if (key === "energy") {
          root.style.setProperty("--energy", String(value / 100));
          if (output) output.textContent = `${value}%`;
        } else if (key === "pause") {
          root.style.setProperty("--pause", String(value));
          if (output) output.textContent = `${value} ms`;
        }
      };
      input.addEventListener("input", sync);
      sync();
    });
  }

  function bindFocus(shells) {
    if (focusObserver) focusObserver.disconnect();
    activeShells = new Set();

    focusObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.28) activeShells.add(entry.target);
          else activeShells.delete(entry.target);
        }
        syncBodyState();
      },
      { threshold: [0, .28, .55], rootMargin: "-8% 0px -8% 0px" }
    );

    shells.forEach((shell) => {
      focusObserver.observe(shell);
      shell.addEventListener("focusin", () => {
        activeShells.add(shell);
        syncBodyState();
      });
      shell.addEventListener("pointerdown", () => {
        activeShells.add(shell);
        syncBodyState();
      }, { passive: true });
    });
  }

  function bind(root = document) {
    const roots = [...root.querySelectorAll(ROOT_SELECTOR)];
    roots.forEach((animation) => {
      if (animation.matches("[data-s5v-stepper]")) bindStepper(animation);
      if (animation.matches("[data-s5v-speech-plan]")) bindSpeechPlan(animation);
    });

    const shells = roots
      .map((animation) => animation.closest("[data-anim-shell]"))
      .filter(Boolean);
    bindFocus([...new Set(shells)]);
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(() => bind(document));
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bind(document), { once: true });
  } else {
    bind(document);
  }
})();
