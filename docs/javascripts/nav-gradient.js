/**
 * nav-gradient.js
 * Assigns gradient colors to series section headers in the left nav.
 * Add a new series to mkdocs.yml → it automatically gets the next color.
 * Edit PALETTE to change the progression.
 */

(function () {
  // Brand gradient: teal → blue → indigo → purple → amber → gold
  // All colors are desaturated ~50% so they read as tints, not loud labels.
  var PALETTE = [
    "#5AACA4", // teal
    "#5B8FC9", // sky-blue
    "#6B74CC", // periwinkle
    "#8F6BCC", // indigo-purple
    "#B8804A", // amber-terracotta
    "#B89A4A", // warm gold
  ];

  function applyColors() {
    var sections = document.querySelectorAll(
      ".md-nav--primary .md-nav__item--section > .md-nav__link"
    );
    sections.forEach(function (link, i) {
      // Loop through the palette if there are more series than colors
      link.style.color = PALETTE[i % PALETTE.length];
    });
  }

  // Run immediately if DOM is ready, otherwise wait
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyColors);
  } else {
    applyColors();
  }

  // MkDocs Material uses client-side navigation (instant loading).
  // Re-apply colors after each page transition.
  document.addEventListener("DOMContentSwitch", applyColors);
})();
