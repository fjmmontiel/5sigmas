# Series UI review — real source, not generated mockups

Review-only branch. Do not merge or deploy before the owner's visual approval.

Baseline: `6209a852b804338e31b95f06bdf604baeb04cf40` (exact source archive tree verified locally).

## Implemented scope

- A build-derived, bilingual gallery: all 13 series and 67 substantive chapters; no invented title/count/media inventory.
- Search and discovery facets, direct-addressable in-page series presentations, real chapter cards and verified watch links.
- Back/history navigation, retained filters, optional existing last-reading state; no login or invented completion progress.
- Contextual discovery for the seven advanced series and the existing visual/video hubs.
- Seven additive, user-controlled educational guides, one at the opening substantive chapter of each series 7–13. They preserve the existing complete diagrams and article prose. This is not a claim that all 40 advanced chapters received bespoke new simulations.
- No video regeneration or modification; no typography, header, logo, global palette or production infrastructure redesign.

## Browser evidence

`Series UI real browser review` strictly builds the pinned baseline and candidate in ES/EN, serves them on separate local HTTP ports, and takes real Chromium screenshots. It also tries two clearly separated live-production reference captures.

The artifact includes PNGs, a native browser screen recording, an HTML contact sheet and a manifest with candidate/base SHA, URL, viewport, selector, capture hash, computed typography/header style, checks and errors. No synthetic image generation is used. A screenshot cannot establish learning outcomes.

Local-container Chromium forbids even localhost/file navigation. Source edits and strict builds happen locally; the real browser runs on a GitHub Actions runner against the same source. The workflow does not publish the site.

Run locally:

```sh
pip install -r requirements.txt
pip install playwright==1.55.0 beautifulsoup4==4.13.5 lxml==6.0.2
playwright install chromium
mkdocs build --clean --strict
python scripts/prepare_locale.py --locale en
S5_LOCALE=en mkdocs build -f mkdocs.en.yml --clean --strict
python scripts/test_series_experience.py
```

Use `scripts/capture_series_ui_review.py` with separate `--before` and `--after` local servers to reproduce browser evidence.

## Intentional boundaries

The original scientific Markdown, media, source diagrams and routes stay unchanged. Existing SEO experiments are not evaluated or declared successful. A global navigation change should be logged as an intervention before any future production rollout. All new calculated values/scenarios are explicitly labelled educational/synthetic, not live model execution, security guarantees or benchmarks.

The new gallery is generated at build time. Without JavaScript its server-rendered details and chapter links remain accessible. Existing reader/library components are retained. The one-day screenshot artifact has a single explicit storage-policy exception for the owner's requested pixel review; it contains no built-site archive or fonts.
