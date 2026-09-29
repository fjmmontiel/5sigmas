# Series experience v2 — review only

Do not merge or deploy without owner visual approval. This revision replaces the rejected v1 gallery/guides, not the original editorial articles or approved video files.

## Scope

- Build-derived catalogue of all 13 series / 67 chapters, in Spanish and English.
- Mechanism-only SVG cover compositions instead of tiny title slides.
- Four explicit learning paths, optional prerequisites and reasoned next-series recommendations.
- In-page series presentation, native playback of approved media and chapter selection without leaving the series.
- Forty causal teaching scenes: one for every substantive chapter in series 7–13, in both locales. Each has four stages and two explicit reproducible scenarios.
- An original-diagram tab preserves the existing leading technical visualization rather than stacking two large panels. All original prose and remaining diagrams stay in the page.
- Clear parent-series and next-chapter links; last-reading state is not labelled completion.
- Existing site header, font families, theme palettes, original media and URLs are retained. The existing top-level Learn label now directly identifies Series.

## Scientific boundary

These are deterministic educational scenarios, not live agents, security guarantees or vendor benchmarks. Latencies, costs, sample datasets and simplified context blocks are labelled synthetic. The diagrams and primary-source explanations remain accessible. Different metrics inspect the same execution rather than altering its underlying facts.

## Validation

`node scripts/test_series_scenes.mjs` covers 80 bilingual scene cases / 640 states, meaningful stage/scenario changes, determinism and invalid values.

`python scripts/test_series_experience.py` checks the built inventories, real media/links, prerequisites, original-diagram preservation, controls, locales and reader navigation.

`python scripts/capture_series_ui_review.py` uses two local HTTP servers for the exact production baseline and candidate, then records the catalogue, 13 series and all 40 advanced chapters on desktop/mobile. It checks English, narrow widths, scenario changes, reset, original-diagram tabs, keyboard, fullscreen, history, actual video playback and no-JavaScript access. Live production captures are separate references. Every screenshot has URL, source SHA, viewport and checksum provenance.

Captures are actual browser pixels. Component crops do not replace page content, hide the header or change styles. Static comparisons use reduced motion; a separate recording demonstrates motion and state changes. A browser PASS is not proof of learning outcomes or owner approval.

The one-day `series-ui-real-browser-evidence` artifact is the existing owner-authorized visual-review exception. It contains no built-site archive or font files. New evidence and CI status are recorded in PR #378 after execution.
