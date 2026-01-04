/**
 * Simple Mermaid initialization for MkDocs.
 */
function initMermaid() {
  if (typeof mermaid !== "undefined") {
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      securityLevel: 'loose'
    });
    // For manual rendering if startOnLoad fails
    if (mermaid.contentLoaded) {
      mermaid.contentLoaded();
    }
  }
}

document.addEventListener("DOMContentLoaded", initMermaid);

// Support for Material for MkDocs instant navigation
if (window.app && window.app.document$) {
  window.app.document$.subscribe(() => {
    if (typeof mermaid !== "undefined") {
      mermaid.init();
    }
  });
}
