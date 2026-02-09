// theme-sync.js
// Syncs Material for MkDocs theme changes to animations
// Observes the html[data-md-color-scheme] attribute and propagates changes

(function () {
    'use strict';

    // Update all animation containers with current theme
    function syncTheme(scheme) {
        const isDark = scheme === 'slate';

        // Update all .ta-demo containers
        document.querySelectorAll('.ta-demo').forEach(demo => {
            demo.setAttribute('data-ta-theme', isDark ? 'dark' : 'light');
        });

        // Update all .mlops-walkthrough containers
        document.querySelectorAll('.mlops-walkthrough').forEach(mlops => {
            mlops.setAttribute('data-ta-theme', isDark ? 'dark' : 'light');
        });

        // Dispatch custom event for animations that need to react
        document.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { scheme, isDark }
        }));
    }

    // Initialize theme sync
    function init() {
        const html = document.documentElement;
        const currentScheme = html.getAttribute('data-md-color-scheme') || 'default';

        // Sync immediately
        syncTheme(currentScheme);

        // Watch for theme changes using MutationObserver
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-md-color-scheme') {
                    const newScheme = html.getAttribute('data-md-color-scheme') || 'default';
                    syncTheme(newScheme);
                }
            });
        });

        observer.observe(html, {
            attributes: true,
            attributeFilter: ['data-md-color-scheme']
        });
    }

    // Run on DOM ready and on MkDocs instant navigation
    function onReady() {
        init();
    }

    // Support MkDocs Material instant navigation
    if (typeof document$ !== 'undefined' && document$.subscribe) {
        document$.subscribe(onReady);
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }
})();
