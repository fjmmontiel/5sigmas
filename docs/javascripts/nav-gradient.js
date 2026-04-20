/**
 * nav-gradient.js
 * Single source of truth for series colors across the site.
 * Colors are keyed by series slug, never by nav position.
 */

(function () {
  "use strict";

  var SERIES_THEME = {
    "fundamentos-ia-iag": {
      accent: "#324AB2",
      ink: "#324AB2",
      glow: "rgba(50, 74, 178, 0.24)",
    },
    "from-cave-to-agi": {
      accent: "#26A69A",
      ink: "#1F857C",
      glow: "rgba(38, 166, 154, 0.26)",
    },
    "multimodalidad-iag": {
      accent: "#59B0EA",
      ink: "#2D7FB8",
      glow: "rgba(89, 176, 234, 0.28)",
    },
    "modelos-razonadores": {
      accent: "#FFB343",
      ink: "#A96A09",
      glow: "rgba(255, 179, 67, 0.28)",
    },
    "ia-pib-bienestar-energia": {
      accent: "#4D87D9",
      ink: "#335FA8",
      glow: "rgba(77, 135, 217, 0.26)",
    },
    "datacenters-espacio": {
      accent: "#2F8FA8",
      ink: "#23677A",
      glow: "rgba(47, 143, 168, 0.24)",
    },
  };

  function onReady(fn) {
    if (
      typeof window.document$ !== "undefined" &&
      window.document$ &&
      typeof window.document$.subscribe === "function"
    ) {
      window.document$.subscribe(function () {
        fn();
      });
      return;
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function normalizePath(href) {
    try {
      return new URL(href, window.location.href).pathname || "";
    } catch (_) {
      return String(href || "");
    }
  }

  function extractSeriesSlugFromHref(href) {
    var pathname = normalizePath(href);
    var match = pathname.match(/\/series\/([^/]+)\//);
    return match ? match[1] : null;
  }

  function applySeriesTheme(element, slug) {
    var theme = SERIES_THEME[slug];
    if (!element || !theme) return;

    element.dataset.seriesSlug = slug;
    element.style.setProperty("--series-accent", theme.accent);
    element.style.setProperty("--series-ink", theme.ink);
    element.style.setProperty("--series-glow", theme.glow);
    element.style.setProperty("--sc", theme.accent);
  }

  function resolveSectionSlug(section) {
    if (!section) return null;

    var links = section.querySelectorAll("a.md-nav__link[href]");
    for (var i = 0; i < links.length; i += 1) {
      var slug = extractSeriesSlugFromHref(links[i].getAttribute("href"));
      if (slug && SERIES_THEME[slug]) return slug;
    }

    return null;
  }

  function applyNavThemes() {
    var sections = document.querySelectorAll(
      ".md-nav--primary .md-nav[data-md-level='1'] > .md-nav__list > .md-nav__item--section"
    );

    sections.forEach(function (section) {
      var slug = resolveSectionSlug(section);
      if (!slug) return;

      applySeriesTheme(section, slug);

      section.querySelectorAll(".md-nav .md-nav__link[href]").forEach(function (link) {
        applySeriesTheme(link, slug);
      });
    });
  }

  function applySeriesCardThemes() {
    document.querySelectorAll(".si-card, .sc-card, .scat-card").forEach(function (card) {
      var slug = extractSeriesSlugFromHref(card.getAttribute("href"));
      if (!slug || !SERIES_THEME[slug]) return;
      applySeriesTheme(card, slug);
    });
  }

  function applyColors() {
    applyNavThemes();
    applySeriesCardThemes();
  }

  onReady(applyColors);
  document.addEventListener("DOMContentSwitch", applyColors);
})();
