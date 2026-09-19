# 5sigmas video motion migration ledger

Last updated: 2026-09-19

Durable source of truth for the code-driven video migration. A release unit may open exactly one PR only after every video/localization in that unit is **Technical GOLDEN**. **Golden Example** is a separate curated status and always requires explicit user approval after review.

## OWNER VISUAL QUALITY AMENDMENT — 2026-09-19

The first complete `modelos-razonadores` review exposed two systemic defects that previous automated visual QA did not reject. This amendment is mandatory for **all current and future series**, not only this release unit.

1. **Text prominence / composition balance.** Horizontal body copy must remain clearly readable and visually important. The layout may not leave a small text block floating at the top-left with unexplained lower-left dead space. The shared layout now targets materially larger body copy, narrower wrapping and a bounded source gap. A regression to review-v1 sizing/balance is a Technical GOLDEN failure.
2. **Series-level motion diversity.** Changing labels or timing does not create a different animation. Each scene receives a semantic visual family based on the mechanism it explains. The normal hard gate is **maximum two uses of one animation family across the complete canonical series**. A third use is only an exceptional semantic ceiling requiring explicit justification and review evidence; the automated default remains two.
3. **Semantic motion, not template motion.** Geometry must explain the concept: a latency threshold should look like a time scale, routing like a fork, trust boundaries like trust boundaries, propagation like propagation, confidence stopping like a band/threshold decision, etc. Generic numbered descending lists are not a default renderer.
4. **Whole-series stranger review.** Before Technical GOLDEN, inspect the complete series together. Fail if scenes feel interchangeable, if one animation grammar dominates, or if multiple videos look like the same template with different copy.
5. **Feedback reopens certification.** Explicit owner feedback identifying a real visual defect invalidates the affected Technical GOLDEN evidence. The release unit returns to revision, the old review package becomes superseded, and a replacement package is required.

These rules are enforced in code by `motion/scripts/check_visual_variety.mjs`, the release gate, the shared layout contract, and the scene-specific semantic renderer registry.

## Release unit — `modelos-razonadores`

**Release state:** REVISION REQUIRED — owner review v1 reopened the complete series.

**Technical GOLDEN:** 0/12 current outputs. The previous 12/12 certification is historical evidence only and is superseded until review v2 is rebuilt and revalidated.

**Golden Examples:** 0/12 approved. Explicit owner approval is still required; silence is never approval.

### Locked visual identity

Series accent remains **Teal reasoning**:

- primary accent: `#26A69A`;
- accent text: `#00776F`;
- accent surface: `#E7F4F0`;
- semantic use: active nodes/paths, key metrics, selected results, progression and result emphasis;
- allowed secondary colors: only subordinate semantic warning/error/success colors when they encode necessary meaning;
- forbidden: decorative gradients, ornamental glow, arbitrary multicolor palettes, per-video/per-scene accent drift, accent-as-decoration;
- contrast: `accentText` must clear WCAG AA against the neutral editorial base.

### Inventory and consumers

Spanish videos:

1. `00_presentacion_serie`
2. `01-que-es-razonar`
3. `02-fallos`
4. `03-test-time-compute`
5. `04-latencia-streaming`
6. `05-riesgos`

English mirrors the same six chapters. The release unit therefore contains **12 localized public outputs**.

Consumer surfaces remain in scope: ES/EN article embeds, generated ES/EN watch pages, video library/catalog/schema/sitemap outputs, home-page Test-Time-Compute feature, ES/EN visual hubs, localized metadata, posters, captions/transcripts/chapters where declared, same-origin delivery and R2 staging.

### Review-v1 feedback and replacement plan

The owner reviewed the complete Drive package and rejected the current visual closure because:

- body text in the left editorial column is repeatedly too small;
- large unused lower-left space weakens hierarchy and density;
- the numbered/descending sequence grammar is reused so frequently that different videos feel like the same template;
- the migration objective requires substantially richer visual vocabulary with scene geometry justified by the mechanism.

Therefore:

- PR #332 is draft again and must not merge from the v1 visual evidence;
- review-v1 Drive package remains preserved only as superseded evidence;
- all 12 localized outputs must be regenerated from the revised shared runtime;
- a **review-v2** Drive package and new review email are required after the complete delivery gate passes;
- no Golden Example promotion is allowed before explicit approval of the replacement package.

### Review-v2 semantic motion plan

The canonical Spanish scenes now map to explicit visual families; EN mirrors the same geometry with localized copy. Examples include:

- concept orbit, budget balance, chapter map and trade-off triangle for the series introduction;
- reasoning lenses, train-vs-inference split, candidate evidence and evaluation axes for chapter 1;
- spurious-vs-robust paths, bias compass, proxy mismatch, contamination cascade and verification ring for chapter 2;
- compute levers, thinking ribbon, candidate evidence, search tree, token clock and adaptive compute matrix for chapter 3;
- latency scale, dual-clock timeline, streaming wave, routing fork and latency control loop for chapter 4;
- complexity curve, trust-boundary flow, retrieval-poison split, confidence band and defense layers for chapter 5.

No visual family exceeds the default complete-series repeat cap of two.

## Historical v1 evidence — superseded for visual release

The following remains useful engineering history but no longer certifies the current release after owner feedback:

- layout: 24/24 horizontal + portrait composition checks passed (`35382435443`);
- accessibility/player QA: Chromium + WebKit passed (`35385714663`);
- deterministic render: 24/24 H/V 60 fps render-package jobs passed (`35383323465`);
- metadata synchronization passed (`35386145253`);
- delivery workflow `35408957666` passed canonical ES/EN media, captions, article/watch consumers, schema/sitemaps, strict builds and same-origin/R2 delivery;
- old review package: https://drive.google.com/drive/folders/1RmRG45Y_MaGTbEFrttNIw6KAfq3oQCzR;
- old review email id: `1a0b740df6b0f124`.

Passing deterministic checks did not prevent the series-level visual repetition identified by the owner, so v2 adds the missing gate rather than treating the feedback as subjective polish.

## Current implementation

Implementation version: **motion framework v4.1 visual-diversity revision**.

Shared runtime remains deterministic:

- `motion/src/engine.mjs`: one render clock for browser playback/export;
- `motion/src/render/layout.mjs`: shared editorial layout with explicit body-size/dead-space contract;
- `motion/src/render/mechanisms/editorial.mjs`: scene-specific semantic visual families;
- `motion/scripts/check_visual_variety.mjs`: complete-series family repetition and typography/layout contract gate;
- `motion/src/player.mjs`: browser player using the same timeline;
- `motion/scripts/render.py`: Playwright/Canvas → H.264 exporter;
- poster, chapters, transcript/captions and validation outputs continue to derive from the same source system;
- horizontal/portrait remain true recompositions, not pixel stretching.

## Release / review state

- PR: **#332** — https://github.com/fjmmontiel/5sigmas/pull/332
- PR state: **draft — reopened by owner visual feedback**
- review v1: **SUPERSEDED**
- review v2: **pending regenerated 12/12 package**
- current `user_review_status`: `revision_required_v2`
- Golden Examples: **0/12**

## Remaining global migration coverage

The overall site migration is **not complete**. `modelos-razonadores` remains the only active release unit until review v2 reaches Technical GOLDEN and its replacement review package is delivered. Do not start or release another series while this complete unit is reopened.

After Modelos closes, derive the next public-video unit from current `main`, catalog/schema/sitemaps/article embeds/watch pages, lock one series accent, and apply this amended visual-diversity gate from the first scene rather than retrofitting it after review.
