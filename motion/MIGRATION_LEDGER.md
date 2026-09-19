# 5sigmas video motion migration ledger

Last updated: 2026-09-19

Durable public technical source of truth for the code-driven video migration. Private email/account/review-recipient details remain outside this repository. Exact operational queues and approval binding are machine-readable in `motion/migration/program-state.json`.

## Program invariants

- A release unit is one **complete series/coherent block**. No partial-video release PRs.
- `technical_golden` and `golden_example_approved` are independent states.
- Technical GOLDEN requires every current engineering/editorial/visual/accessibility/integration gate on exact current evidence.
- Golden Example requires explicit owner approval of the exact reviewed bytes. Silence is never approval.
- Owner approval can be recorded before final technical certification only as `APPROVED_PRESENTED_EXAMPLES_PENDING_EXACT_TECHNICAL_BINDING`; promotion happens only when the approved asset hash exactly matches the Technical GOLDEN asset.
- A technically GOLDEN unit waiting for owner review **does not block throughput**. It moves to `awaiting_user_review`, and migration starts the next unfinished complete unit. Multiple complete units may accumulate for review.
- At the start of each run, pending approvals/rejections are reconciled first. Exact approved Technical GOLDEN units become publish-ready, are safely released and verified live, then approved exact assets enter the Golden Registry.
- Golden Registry entries are immutable references by exact asset hash and source/renderer/theme revisions.

## Owner visual-quality amendment — mandatory for every current/future unit

The first `modelos-razonadores` review exposed two systemic defects that prior automated QA did not reject. These are now hard gates for all series:

1. **Text prominence / composition balance.** Explanatory body copy must remain materially readable at real embed sizes. Reject small left-column text floating over unexplained permanent lower-left dead space. Recompose or split beats rather than shrinking useful explanation.
2. **Series-level motion diversity.** Renaming/recoloring/mirroring/timing changes do not create a new animation. The target is at most **two** uses of one perceptual family per complete series; a third is exceptional and requires scene-specific semantic justification plus current whole-series visual acceptance; four or more always fails.
3. **Semantic motion.** Geometry must explain the mechanism. Generic numbered descending lists are not a default renderer.
4. **Whole-series perceptual review.** Structural family counts alone cannot certify visual quality. Inspect encoded motion and fail interchangeable/template-looking scenes.
5. **Feedback reopens affected evidence.** Real owner quality feedback invalidates affected Technical GOLDEN evidence and requires a new exact-version review package.

The current code enforces these contracts through the shared layout, semantic mechanism registry, review policy, diversity audit and release gate.

## Active release unit — `modelos-razonadores` · Review Round 2

**PR:** #332 (`migration/video-golden-modelos-razonadores`)  
**Release state:** current-source rerender required; PR remains draft.  
**Technical GOLDEN:** **0/12** until strengthened-current-source encoded visual/accessibility/delivery/integration evidence is fully bound.  
**Review v1:** SUPERSEDED.  
**Owner approval:** the owner explicitly approved all final Review Round 2 examples already presented. Directly presented assets are bound by exact SHA-256 in `program-state.json`; additional presented examples are approved by scope. That approval remains valid for the exact reviewed candidate bytes, but it does not transfer to materially changed final bytes. The comparison montage is review evidence, not a primary Golden Example.  
**Golden Registry promotion:** pending exact Technical GOLDEN/hash binding and, where final bytes differ materially, exact owner review of those changed bytes.

### Locked visual identity

**Teal reasoning**: primary `#26A69A`, text `#00776F`, surface `#E7F4F0`. Accent is functional for active nodes/paths, key metrics, selected results and progression. Secondary colors are allowed only for necessary semantic warning/error/success states. Gradients, ornamental glow, arbitrary multicolor, decorative accent use and per-scene palette drift are forbidden.

### Complete inventory

Six Spanish chapters and six English mirrors: `00_presentacion_serie`, `01-que-es-razonar`, `02-fallos`, `03-test-time-compute`, `04-latencia-streaming`, `05-riesgos` = **12 localized public outputs**, with horizontal/portrait compositions where required.

Consumer scope includes ES/EN article embeds, watch pages, video library/catalog, schema/sitemaps, home-page Test-Time-Compute feature, visual hubs, localized media metadata, posters, chapters/captions/transcripts where declared, same-origin delivery and staging/review surfaces.

### Current verified Round 2 checkpoints

Current deterministic/layout evidence remains in `motion/migration/checkpoints/2026-09-19-modelos-round2-run5.json`; the source-binding correction is recorded in `motion/migration/checkpoints/2026-09-19-modelos-round2-run6.json`.

- current-source syntax checks for semantic renderer modules: PASS;
- focused review contract tests: **65/65 PASS** at the recorded current-source checkpoint;
- current-source H/V layout preflight: **24/24 compositions**, **1,520 sampled frames**, **0 layout issues**;
- structural series diversity: **30 conceptual scenes**, **21 perceptual families**, **maximum family use 2**;
- candidate Drive inventory: **24/24 MP4s** (12 ES + 12 EN, H/V complete);
- candidate media-profile QA: **24/24 PASS** for H.264/yuv420p/60 fps/resolution/faststart/expected sidecars;
- structural diversity deliberately reports `full_series_visual_approval=false` until encoded whole-series perceptual inspection is completed.

### Source-binding correction — mandatory rerender

The existing 24 candidate MP4s were produced from the earlier Review Round 2 render generation matching commit `e7155f70920ef2669853b800c887dd53c1c8d1ee`, not the later strengthened render source `f13d94ce62d6548d8519d8d80f4827696f722fc9`.

The strengthened source materially changes a **global rendering dependency**:

- horizontal text width `800 → 760`;
- horizontal body minimum `42 → 46 px`;
- horizontal body target `50 → 52 px`;
- portrait body minimum `44 → 46 px`;
- maximum source/body gap `86 → 64 px`;
- plus `rich-risk.mjs` fixes and a canonical Spanish intro-spec correction.

Therefore the existing encoded candidate files are **source-stale for Technical GOLDEN** even though their own media-profile and representative visual reviews remain useful historical candidate evidence. Output-relevant dependency narrowing cannot exclude a global `layout.mjs` change. All 12 localized outputs in both H/V must be rerendered from the strengthened current source before exact Technical GOLDEN binding.

This correction explicitly invalidates any prior wording that described the existing 24 candidate MP4s as exact `f13d94...` current-source renders. It does not erase the owner's exact-byte approval of the versions actually reviewed.

### Review Round 2 visual system

Every canonical scene maps to a semantic design with rationale and perceptual family. The current plan covers area/resource allocation, relationship maps, symbolic rewrites, phase comparisons, candidate aggregation, evaluation matrices, controlled contrasts, objective bypass, compute comparison, token sequence/dependency, branching search, allocation plane, logarithmic latency scale, parallel timelines, progressive delivery, deadline state machine, qualitative regimes, trust boundaries, retrieval substitution and stopping regions. No family exceeds two canonical uses.

The shared deterministic timeline remains the single clock for text reveal, visual operations, seek/pause/replay and MP4 export. Horizontal and portrait are recompositions rather than pixel stretching. Body text/dead-space metrics and cue-boundary layout checks are required, but metrics do not replace encoded-pixel review.

## Release / review / publish queues

Machine-readable queues live in `motion/migration/program-state.json`:

- `active_migration_units`: currently `modelos-razonadores` with `CURRENT_SOURCE_RERENDER_REQUIRED`;
- `awaiting_user_review_units`: complete Technical GOLDEN units whose verified review package/email has been delivered;
- `publish_ready_units`: exact Technical GOLDEN units with explicit exact-version approval;
- `golden_registry`: published immutable approved reference assets keyed by exact hash.

Once Modelos reaches 12/12 Technical GOLDEN, its complete current-source Review Round 2 package is verified and delivered. Exact reviewed hashes may promote immediately only when the final Technical GOLDEN bytes are identical. Any materially changed final bytes require exact review rather than inheriting approval by similarity. The unit releases only after exact-head/current-main checks and live verification. Migration then continues with the next complete public-video unit even if prior technically-complete units remain in review.

The next candidate after Modelos is `seguridad-ia`; its current public inventory and consumers must be re-derived from current `main` before editing, then one accent identity is locked before scene work.

## Historical v1 evidence — superseded for visual release

Historical Round 1 evidence remains in Git history for engineering traceability: prior H/V layout, browser/accessibility, deterministic render, metadata and delivery checks passed at that time. Those receipts do not certify Review Round 2 and must never be reused as current visual acceptance.

## Current remaining work for Modelos

1. Synchronize the render workspace to `f13d94...` / current branch source.
2. Rerender **all 12 localized outputs in both H/V** because the global layout dependency changed materially.
3. Bind exact current-source asset hashes and rerun media-profile/sidecar verification.
4. Complete current encoded whole-series ES/EN motion review, text prominence/spatial balance, mobile/portrait, accessibility/reduced-motion/player and delivery/consumer integration.
5. Persist bound evidence for every required gate and reach 12/12 Technical GOLDEN or iterate only failing outputs.
6. Replace/verify the final Round 2 Drive package and send one review email only when the final manifest is exact; any changed bytes require exact user review before Golden Registry promotion.
7. Release/publish only after exact-head/current-main checks remain valid and live consumers serve the validated assets.
8. Immediately begin the next unfinished complete unit after this unit leaves active migration, without waiting idly for reviews of already-packaged units.

## Global finish condition

The migration is complete only after a fresh whole-site inventory proves every intended public video/localized output has migrated, every complete unit is Technical GOLDEN, its unique release is reconciled, and live consumers serve the exact validated assets. Golden Registry remains the explicit owner-approved subset and never substitutes for technical certification.
