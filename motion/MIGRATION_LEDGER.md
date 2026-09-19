# 5sigmas video motion migration ledger

Last updated: 2026-09-19

Durable source of truth for the code-driven video migration. A release unit may open exactly one PR only after every video/localization in that unit is **Technical GOLDEN**. **Golden Example** is a separate curated status and always requires explicit user approval after review.

## Release unit — `modelos-razonadores`

**Release state:** TECHNICAL GOLDEN — complete-series PR open; user review package delivered.

**Technical GOLDEN:** 12/12 localized outputs.

**Golden Examples:** 0/12 approved. Explicit owner approval is still required; silence is never approval.

### Locked visual identity

Series accent is **Teal reasoning**:

- primary accent: `#26A69A`;
- accent text: `#00776F`;
- accent surface: `#E7F4F0`;
- semantic use: active nodes/paths, key metrics, selected results, progression and result emphasis;
- allowed secondary colors: only subordinate semantic warning/error/success colors when they encode necessary meaning;
- forbidden: decorative gradients, ornamental glow, arbitrary multicolor palettes, per-video/per-scene accent drift, accent-as-decoration;
- contrast: `accentText` must clear WCAG AA against the neutral editorial base.

This identity is locked across videos, posters, thumbnails, diagrams and related assets in both locales.

## Inventory and consumers

Spanish videos:

1. `00_presentacion_serie`
2. `01-que-es-razonar`
3. `02-fallos`
4. `03-test-time-compute`
5. `04-latencia-streaming`
6. `05-riesgos`

English mirrors the same six chapters. The release unit therefore contains **12 localized public outputs**.

Consumer surfaces validated in scope: ES/EN article embeds, generated ES/EN watch pages, video library/catalog/schema/sitemap outputs, home-page Test-Time-Compute feature, ES/EN visual hubs, localized metadata, posters, captions/transcripts/chapters where declared, same-origin delivery and R2 staging.

## Per-output gate state

| Locale | Video | Framework | Sync | Source | Layout | Delivery | Accessibility | Visual QA | Technical GOLDEN | Golden Example |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ES | 00 presentación | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| ES | 01 qué es razonar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| ES | 02 fallos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| ES | 03 test-time compute | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| ES | 04 latencia/streaming | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| ES | 05 riesgos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| EN | 00 series intro | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| EN | 01 what reasoning is | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| EN | 02 failures | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| EN | 03 test-time compute | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| EN | 04 latency/streaming | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |
| EN | 05 risks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | YES | NO |

## Implementation / synchronization

Implementation version: **motion framework v4**.

Persisted reusable runtime:

- `motion/src/engine.mjs`: deterministic shared timeline / render clock;
- reusable semantic mechanisms and layout primitives under `motion/src/render/`;
- `motion/src/player.mjs`: browser player using the same `renderFrame` clock as export;
- `motion/scripts/render.py`: Playwright/Canvas → H.264 exporter;
- poster, chapters, transcript/captions and validation-report generation from the same source system;
- horizontal/portrait recomposition from the same specs;
- content/theme/motion/metadata separation and runtime contract tests.

Text fragments and their explanatory visual operations share one deterministic timeline for browser playback, seek, pause/resume, replay and export. Previously introduced text is kept spatially stable where possible and important operations retain observation time.

## QA and evidence

Machine ledger: `motion/migration/modelos-razonadores-status.json`.

- layout: **24/24** horizontal + portrait composition checks passed (`35382435443`);
- accessibility/player QA: Chromium + WebKit passed across all 12 localized outputs (`35385714663`), including localized controls, keyboard/accessibility names, reduced motion and 390×844 portrait behavior;
- deterministic render: **24/24** H/V 60 fps render-package jobs passed (`35383323465`);
- metadata: six durations synchronized from v4 specs into ES/EN metadata (`35386145253`);
- visual QA: all 12 outputs passed representative-frame review in H/V for hierarchy, locked accent identity, semantic diagrams, progressive reveal, text stability, transitions, footer/source legibility, clipping/overlap and gradient/palette drift;
- final delivery: workflow `35408957666` completed **success**;
- final delivery validates canonical ES/EN media, captions, article embeds, watch pages, catalog/schema/sitemaps, strict ES/EN builds, same-origin/R2 contract and removal of the legacy English TTC one-off injection;
- validated current `main`: `2d453e473fdf56fcb82ac83ba66730ce0db3bb89`; it remained current when the complete-series PR was opened;
- promotion commit: `c870b44fb7686620a5d987d5719ea00a614d5fc8`.

Factual/source review, synchronization, responsive layout, automated QA, accessibility and final visual QA have no unresolved blocker for this release unit.

## Release

Exactly one complete-series PR was created after 12/12 reached Technical GOLDEN:

- PR: **#332**
- URL: https://github.com/fjmmontiel/5sigmas/pull/332
- base at creation: `main@2d453e473fdf56fcb82ac83ba66730ce0db3bb89`
- head at creation: `c870b44fb7686620a5d987d5719ea00a614d5fc8`
- no partial release PR was created.

## User review package

A dedicated Google Drive review package now exists:

- root: https://drive.google.com/drive/folders/1RmRG45Y_MaGTbEFrttNIw6KAfq3oQCzR
- ES: https://drive.google.com/drive/folders/1R_t-pw6t6Jcg5YI-TOrKHhR4rxxYoJKZ
- EN: https://drive.google.com/drive/folders/1wZzzqtFUHZyHTxiNHHhOWxLTWaD2mevq

Read-back verified **6 directly viewable MP4s in ES + 6 directly viewable MP4s in EN**. The root also contains a review README and SHA-256 manifest.

Review email sent to the authenticated owner account. Gmail message id: `1a0b740df6b0f124`.

`user_review_status=awaiting_user_review`.

No video has been promoted to Golden Examples. After explicit approval, promote only the approved subset and record approval date/source and registry location.

## Historical delivery blocker resolution

Earlier integration attempts hit a 30-minute integration timeout and a legacy English TTC one-off delivery path. The final path retained every Golden gate while raising the integration budget, reducing redundant file copies, validating same-origin/R2 without duplicative corpus copies, and removing the TTC legacy injection. The successful final delivery run is `35408957666`; no criterion was waived.

## Remaining global migration coverage

`modelos-razonadores` is technically complete as a release unit and now awaits only owner review for optional **Golden Example** curation plus normal PR lifecycle.

The overall site migration is **not complete**. On the next run, derive the remaining public-video inventory from current public `main`, video catalog/schema/sitemaps/article embeds/watch pages and select exactly the next unfinished complete series/coherent block. Lock one accent for that complete unit before migration and continue the same fail-closed Technical GOLDEN process.

Do not modify `modelos-razonadores` further unless PR/review feedback reveals a regression or the owner requests changes.
