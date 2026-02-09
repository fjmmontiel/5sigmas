// tabbed-animations.js
// Shared tab host + demo lifecycle runtime for MkDocs Material embeds.
// - Supports multiple instances per page.
// - Stops demos in hidden tabs by default.
// - Compatible with MkDocs Material "instant navigation" via document$.subscribe.
//
// Contract:
//   - Tabs container: [data-tabs] (recommended). Back-compat: .nn-tabs, .ml-tabs
//   - Tab buttons:   [data-tab] (aria-selected handled)
//   - Panels:        [data-panel] (hidden toggled)
//   - Demo roots:    [data-demo]  (supports "ns:kind" or "kind")
// Optional demo attrs:
//   - data-demo-ns / data-demo-kind / data-demo-key (overrides parsing)

(() => {
  "use strict";

  // ---------- MkDocs / DOM ready ----------
  function onReady(fn) {
    if (typeof window.document$ !== "undefined" &&
      window.document$ && typeof window.document$.subscribe === "function") {
      window.document$.subscribe(() => fn());
    } else {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
      else fn();
    }
  }

  // ---------- Parsing ----------
  function parseDemoMeta(el) {
    const keyAttr = (el.dataset.demoKey || "").trim();
    if (keyAttr) {
      const idx = keyAttr.indexOf(":");
      return { key: keyAttr, ns: idx >= 0 ? keyAttr.slice(0, idx) : "", kind: idx >= 0 ? keyAttr.slice(idx + 1) : keyAttr };
    }

    const nsAttr = (el.dataset.demoNs || "").trim();
    const kindAttr = (el.dataset.demoKind || "").trim();
    if (nsAttr || kindAttr) {
      const ns = nsAttr;
      const kind = kindAttr || "";
      const key = ns ? `${ns}:${kind}` : kind;
      return { key, ns, kind };
    }

    const raw = (el.dataset.demo || "").trim();
    const idx = raw.indexOf(":");
    if (idx >= 0) return { key: raw, ns: raw.slice(0, idx), kind: raw.slice(idx + 1) };
    return { key: raw, ns: "", kind: raw };
  }

  // ---------- Demo registry ----------
  const initByKey = new Map();       // "ns:kind" or "kind" -> (el, meta) => instance
  const initByNs = new Map();       // "ns" -> (el, meta) => instance
  const instByEl = new WeakMap();   // el -> instance
  const liveEls = new Set();       // strong refs for cleanup iteration

  function register(key, initFn) {
    initByKey.set(String(key), initFn);
  }
  function registerNamespace(ns, initFn) {
    initByNs.set(String(ns), initFn);
  }

  function ensureDemo(el) {
    const existing = instByEl.get(el);
    if (existing && existing.__inited) return existing;

    const meta = parseDemoMeta(el);
    if (!meta.key) return null;

    const initFn = initByKey.get(meta.key) || (meta.ns ? initByNs.get(meta.ns) : null);
    if (!initFn) return null;

    const inst = initFn(el, meta) || null;
    if (inst) {
      instByEl.set(el, inst);
      liveEls.add(el);
      // also expose on element for debugging / manual calls
      el.__tabbedDemo = inst;
    }
    return inst;
  }

  function stopDemo(el) {
    const inst = instByEl.get(el) || el.__tabbedDemo;
    try { inst?.stop?.(); } catch (_) { }
  }

  function repaintDemo(el) {
    const inst = instByEl.get(el) || el.__tabbedDemo;
    try { inst?.repaint?.(); } catch (_) { }
  }

  function switchPanel(container, key) {
    const tabs = Array.from(container.querySelectorAll("[data-tab]"));
    const panels = Array.from(container.querySelectorAll("[data-panel]"));

    if (tabs.length === 0 || panels.length === 0) return;

    tabs.forEach(t => {
      const isSelected = t.dataset.tab === key;
      t.classList.toggle("active", isSelected);
      t.setAttribute("aria-selected", isSelected);
    });

    panels.forEach(p => {
      const isVisible = p.dataset.panel === key;
      p.hidden = !isVisible;
      if (isVisible) p.style.display = "";
      else p.style.display = "none";
    });
  }

  function destroyDemo(el) {
    const inst = instByEl.get(el) || el.__tabbedDemo;
    try { inst?.destroy?.(); } catch (_) { }
    try { instByEl.delete?.(el); } catch (_) { } // WeakMap doesn't have delete in some older engines (but in modern it does)
    try { delete el.__tabbedDemo; } catch (_) { }
    liveEls.delete(el);
  }

  function cleanupDetached() {
    for (const el of Array.from(liveEls)) {
      if (!el.isConnected) destroyDemo(el);
    }
  }

  // ---------- Tabs host ----------
  function initTabs(container) {
    if (!container || container.__taInited) return;
    container.__taInited = true;

    const tabs = Array.from(container.querySelectorAll("[data-tab]"));
    const panels = Array.from(container.querySelectorAll("[data-panel]"));

    if (tabs.length === 0) return;

    const defaultKey = (container.dataset.default || tabs[0]?.dataset.tab || "").trim();

    const shouldPauseHidden = container.dataset.tabsPauseHidden !== "false";

    function pauseHidden(exceptKey) {
      if (!shouldPauseHidden) return;
      panels.forEach(p => {
        if (p.dataset.panel === exceptKey) return;
        p.querySelectorAll("[data-demo]").forEach(stopDemo);
      });
    }

    function show(key) {
      tabs.forEach(t => t.setAttribute("aria-selected", (t.dataset.tab === key) ? "true" : "false"));
      panels.forEach(p => (p.dataset.panel === key) ? p.removeAttribute("hidden") : p.setAttribute("hidden", ""));

      pauseHidden(key);

      const panel = panels.find(p => p.dataset.panel === key);
      if (panel) {
        panel.querySelectorAll("[data-demo]").forEach(el => {
          ensureDemo(el);
          requestAnimationFrame(() => repaintDemo(el));
        });
      }

      container.dispatchEvent(new CustomEvent("tabs:change", { detail: { key } }));
    }

    // Click delegation
    container.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-tab]");
      if (!btn || !container.contains(btn)) return;
      show(btn.dataset.tab);
    });

    // Basic keyboard nav (ArrowLeft/ArrowRight/Home/End)
    container.addEventListener("keydown", (ev) => {
      const btn = ev.target.closest("[data-tab]");
      if (!btn || !container.contains(btn)) return;
      const i = tabs.indexOf(btn);
      if (i < 0) return;

      let j = -1;
      if (ev.key === "ArrowRight") j = (i + 1) % tabs.length;
      else if (ev.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (ev.key === "Home") j = 0;
      else if (ev.key === "End") j = tabs.length - 1;
      else return;

      ev.preventDefault();
      tabs[j]?.focus?.();
      show(tabs[j]?.dataset.tab);
    });

    show(defaultKey);
  }

  function flushQueue() {
    const q = window.__TAQ__;
    if (!Array.isArray(q) || q.length === 0) return;
    window.__TAQ__ = [];
    for (const fn of q) {
      try { fn(api); } catch (e) { /* ignore */ }
    }
  }

  function initAll() {
    flushQueue();
    cleanupDetached();

    // Explicit opt-in recommended: [data-tabs]
    document.querySelectorAll("[data-tabs], .nn-tabs, .ml-tabs").forEach(initTabs);
  }

  // Listen for color palette changes
  if (typeof window.palette$ !== "undefined" && window.palette$.subscribe) {
    window.palette$.subscribe(() => {
      // Re-repaint all live demos
      for (const el of Array.from(liveEls)) {
        if (el.isConnected) repaintDemo(el);
      }
    });
  }

  const api = {
    register,
    registerNamespace,
    ensureDemo,
    initAll,
    cleanupDetached,
    parseDemoMeta,
  };

  window.TabbedAnimations = api;

  onReady(initAll);
})();
