# 5sigmas video motion migration ledger

Last updated: 2026-09-18

Durable source of truth for the code-driven video migration. A release unit may open exactly one PR only after every video/localization in that unit is **Technical GOLDEN**. **Golden Example** is a separate curated status and always requires explicit user approval after review.

## Active release unit — `modelos-razonadores`

**State:** IN PROGRESS — no release PR allowed yet.

**Locked visual identity:** Teal reasoning. `accent=#26A69A`, `accentText=#00776F`, `accentSurface=#E7F4F0`. The accent is fixed for the complete series in Spanish and English. Functional uses: key words/metrics, active nodes/paths, selected results and progress. Decorative gradients, per-scene palette changes and ornamental multicolor fills are forbidden. `accentText` must clear WCAG AA against the neutral base.

### Review / exemplar policy

- `technical_golden`: all engineering, editorial, visual and delivery gates pass.
- `golden_example_approved`: curated showcase status; never automatic and never inferred from Technical GOLDEN.
- After the complete release unit is Technical GOLDEN and its single PR/review package exists, present all finished videos to the user for review. Prefer a dedicated Google Drive folder when writable Drive access exists; otherwise use stable direct links.
- Promote only explicitly approved videos to Golden Examples. Silence is not approval.
- Current review state: `not_ready`; no review package or review email because the release unit is not Technical GOLDEN.

### Inventory

Spanish: `00_presentacion_serie`, `01-que-es-razonar`, `02-fallos`, `03-test-time-compute`, `04-latencia-streaming`, `05-riesgos`.

English mirrors the same six chapters. All 12 ES/EN v4 specs are authored. Consumer surfaces in scope: ES/EN article embeds, generated ES/EN watch pages, video library/catalog/schema/sitemap outputs, home-page Test-Time-Compute feature, ES/EN visual hubs, locale metadata, captions, posters and deployment/R2 staging.

### Current per-output status

All 12 localized outputs have passed framework, synchronization, source, layout, accessibility and final visual-QA gates. **Delivery is the only remaining false gate for every output.**

| Locale | Video | Framework | Sync | Source | Layout | Delivery | Accessibility | Visual QA | Technical GOLDEN | Golden Example |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ES | 00 presentación | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| ES | 01 qué es razonar | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| ES | 02 fallos | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| ES | 03 test-time compute | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| ES | 04 latencia/streaming | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| ES | 05 riesgos | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| EN | 00 series intro | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| EN | 01 what reasoning is | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| EN | 02 failures | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| EN | 03 test-time compute | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| EN | 04 latency/streaming | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |
| EN | 05 risks | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | NO | NO |

Technical GOLDEN remains **0/12** by design until canonical delivery integration passes.

## Durable runtime and evidence

The complete v4 runtime is persisted on the migration branch:

- deterministic `motion/src/engine.mjs`;
- modular rendering primitives/layouts and semantic mechanisms under `motion/src/render/`;
- accessible deterministic `motion/src/player.mjs` using the same `renderFrame` clock as export;
- Playwright/Canvas → H.264 exporter at `motion/scripts/render.py`;
- poster, chapters, transcript/captions and validation-report generation;
- horizontal/portrait recomposition from the same spec;
- runtime contract tests and dependency documentation.

Machine evidence in `motion/migration/modelos-razonadores-status.json` currently records:

- layout: **24/24 horizontal + portrait checks passed**;
- accessibility: Chromium + WebKit success over all 12 localized outputs, including localized controls, transcript/evidence links, keyboard/accessibility names, reduced motion and 390×844 portrait behavior;
- deterministic final render: **24/24** horizontal/vertical render-package jobs passed;
- metadata sync: all six durations synchronized from v4 specs into ES/EN metadata;
- visual review: all 12 ES/EN outputs passed representative-frame review in horizontal and portrait, including hierarchy, locked teal identity, semantic diagrams, progressive reveal, text stability, source/footer legibility, clipping/overlap and gradient/palette-drift checks.

## Delivery gate incident and remediation

Delivery workflow run `35391283137` rendered all 12 final horizontal packages successfully. Its `integrate-and-gate` job was then cancelled by the job-level **30 minute timeout** while executing `Stage canonical ES/EN media and remove TTC one-off delivery path`; the job reached the timeout before any downstream delivery checks could run. This was a capacity/runtime timeout, not a Technical GOLDEN failure and not a reason to weaken the gate.

Remediation commit `f1002160b3688aed63cedb996f3ab1ee8e192353` increases only the integration job budget from 30 to **120 minutes**, preserving every delivery, build, browser, checksum and Golden check unchanged. The replacement delivery workflow run is `35395812427`.

The release policy remains fail-closed: `delivery=true` and `technical_golden=true` may only be persisted after the same validated renderer packages are staged into the canonical ES/EN trees, metadata stays derived from v4 specs, R2/same-origin contracts pass, strict ES and EN builds pass, native EN video hub/watch-page QA passes, and every built consumer is byte-verified against the validated package.

## Branch freshness risk

The migration branch has accumulated substantial divergence from `main` while other 5sigmas work continued. Before the single release PR can be treated as releasable, the complete unit must also be reconciled and revalidated against current `main`; Technical GOLDEN evidence obtained solely against an obsolete base is insufficient for final merge confidence. Do not solve this by opening partial or temporary release PRs.

## Current blockers

1. Let the replacement delivery gate complete with the corrected integration runtime budget.
2. Fix any real delivery/integration defect surfaced after staging; do not convert a failing delivery check into a waiver.
3. Reconcile the complete migration unit with current `main` and rerun the relevant release gates on the combined state before opening the single series PR.
4. Only after **12/12 Technical GOLDEN**: create exactly one PR for the complete series, assemble the complete user review package, place it in Google Drive when writable Drive access is available, and send the review email through Gmail.
5. Golden Example promotion remains blocked until explicit user approval of the reviewed videos.

## Next work

Do not author more copy or alter the visual identity. The next iteration should inspect workflow run `35395812427`. If delivery passes, verify the machine ledger was atomically promoted to 12/12 Technical GOLDEN and that the review artifact exists; then reconcile against current `main` before creating the single release PR. If delivery fails, repair the exact failing integration contract and rerun without relaxing any Golden criterion.
