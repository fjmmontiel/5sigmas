# 5sigmas video motion migration ledger

Last updated: 2026-09-19

Durable public technical source of truth for the code-driven video migration. Private Drive identifiers, email addresses/message IDs and private review-routing details remain outside this repository. Exact operational queues and approval binding are machine-readable in `motion/migration/program-state.json`.

## Program invariants

- A release unit is one **complete series/coherent block**. No partial-video release PRs.
- `owner_visual_approval` and `technical_golden` are independent states.
- Owner approval is durable for the exact reviewed bytes. A later renderer/layout default does not revoke it.
- Technical GOLDEN requires current engineering/editorial/visual/accessibility/integration evidence bound to the exact frozen release snapshot.
- Missing, stale or unrun evidence is `NOT_VERIFIED`, never PASS.
- Silence is never owner approval, but already explicit approval must not be requested again for identical bytes.
- A finished/frozen unit may wait in review or technical-release queues without blocking safe work on the next complete unit.
- Publication is recorded only after the complete unit is merged/deployed and current live consumers are observed serving the exact validated assets.
- Golden Registry entries are immutable references by exact asset hash plus truthful source/render profile and separate promotion/release state.

## Owner visual-quality amendment — mandatory for future work

The first `modelos-razonadores` review exposed systemic defects that prior automated QA did not reject. These remain hard design gates for new or materially changed units:

1. **Text prominence / composition balance.** Explanatory body copy remains materially readable at real embed sizes. Recompose or split beats rather than shrinking useful explanation into dead space.
2. **Series-level motion diversity.** Renaming/recoloring/mirroring/timing changes do not create a new animation. Target at most two uses of a perceptual family per complete series; a third is exceptional and requires semantic justification plus current whole-series visual acceptance; four or more fails.
3. **Semantic motion.** Geometry must explain the mechanism. Generic numbered lists are not the default renderer.
4. **Whole-series perceptual review.** Structural family counts do not replace encoded-motion review.
5. **Feedback reopens only affected evidence.** Demonstrated factual/playback/security/accessibility/delivery defects reopen their technical checks. A material visible change creates a new approval scope only for the changed asset/version.

These metrics are diagnostics and development contracts. They are not retrospective permission to redesign already owner-approved encoded media absent a demonstrated defect.

## Active release unit — `modelos-razonadores` · Review Round 2

**PR:** #332 (`migration/video-golden-modelos-razonadores`)  
**Review v1:** `SUPERSEDED`.  
**Owner visual approval:** **APPROVED** for the exact final Review Round 2 collection that was presented.  
**Technical GOLDEN:** **false / 0 of 12 canonical localized public outputs** until the exact approved horizontal bytes are staged and all mandatory technical evidence is current.  
**Publication:** **not published**.  
**Release strategy:** validate and publish the frozen approved snapshot; do not rerender it from newest HEAD by default.

The comparison montage/contact sheets remain review support, not primary Golden exemplars. Broader collection approval is bound only to the exact hashes recorded for the presented final Round 2 assets and is not a claim of individual playback of every file or approval of later unpresented renders.

### Locked visual identity

**Teal reasoning**: primary `#26A69A`, text `#00776F`, surface `#E7F4F0`. Accent is functional for active nodes/paths, key metrics, selected results and progression. Secondary colors are allowed only for necessary labeled semantics. Gradients, ornamental glow, arbitrary multicolor, decorative accent use and per-scene palette drift are forbidden.

### Complete frozen inventory

Six Spanish chapters and six English mirrors: `00_presentacion_serie`, `01-que-es-razonar`, `02-fallos`, `03-test-time-compute`, `04-latencia-streaming`, `05-riesgos` = **12 localized canonical public horizontal outputs**, with native portrait/HV review counterparts in the frozen collection.

The byte-binding checkpoint `motion/migration/checkpoints/2026-09-19-modelos-approved-snapshot-byte-binding.json` records **24/24** frozen Review Round 2 MP4 identities (ES/EN × H/V) and media profiles. Directly owner-confirmed Spanish horizontal hashes include:

- intro `e45db8339e97972c672f1d13aa5705bc9f6b25c5fcebfb28556d1c42d40487d6`
- fallos `d7496cea7bc0b5889f64cca5b60f59506963c7125f4cb2eb9b166e79d26562ed`
- test-time-compute `e9c6c081bb19d2953777b3d37642e5a718de8dd16ce7b6f73ff9dc252dca8710`
- riesgos `f594dde47114da817416d0a6b37089cdec34eb607005fe452d5fc22f5b2df381`

Consumer scope includes ES/EN article embeds, watch pages, video library/catalog, schema/sitemaps, the home-page Test-Time-Compute feature, visual hubs, localized media metadata, posters, chapters/captions/transcripts where declared, same-origin delivery and staging/review surfaces.

### Recorded Review 2 development evidence

The Review 2 development line recorded:

- focused review contract tests: **65/65 PASS** at the recorded checkpoint;
- H/V layout preflight: **24/24 compositions**, **1,520 sampled frames**, **0 layout issues** after fixes;
- structural series diversity: **30 conceptual scenes**, **21 perceptual families**, **maximum family use 2**;
- frozen review inventory: **24/24 MP4s** (12 ES + 12 EN, H/V complete);
- recorded media profile: H.264 / 60 fps / expected orientation and durations / fast-start for the frozen collection.

This development evidence does not by itself grant current Technical GOLDEN. Technical evidence must be bound to the frozen approved release bytes and current-main consumers.

### Source/render provenance status

The historical candidate hint `e7155f70920ef2669853b800c887dd53c1c8d1ee` is **not** an automatic source certificate. Upload timestamps overlap several source changes, including later layout/render fixes, so provenance must be recovered per asset/profile rather than invented as one uniform revision.

Historical exact-source probes that render a candidate revision are admissible only when their match assertions actually pass. A workflow/job concluding green merely because rendering completed is not provenance evidence. The exhaustive probe has been changed to fail closed unless the approved encoded hash **and** the approved visual fingerprints both match.

Until a matching source/spec/theme/timeline profile is demonstrated and recorded, source binding remains `NOT_VERIFIED`. This does **not** revoke owner approval of the frozen media bytes.

### Canonical exact-byte delivery status

The current release gate correctly fails before later checks because all **12/12 canonical ES/EN horizontal repository MP4 paths differ from the frozen approved hashes**. The canonical mismatch checkpoint records this as a delivery defect, not a visual-approval defect.

The exact approved horizontal media has been recovered and independently validated in the execution runtime, but it is not Technical GOLDEN or published until those same bytes are actually committed at the canonical paths, read back, gated against current main and observed live.

## Review 2 visual system

Every canonical scene maps to a semantic design with rationale and perceptual family. The recorded plan covers area/resource allocation, relationship maps, symbolic rewrites, phase comparisons, candidate aggregation, evaluation matrices, controlled contrasts, objective bypass, compute comparison, token sequence/dependency, branching search, allocation plane, logarithmic latency scale, parallel timelines, progressive delivery, deadline state machine, qualitative regimes, trust boundaries, retrieval substitution and stopping regions. No recorded family exceeds two canonical uses.

The deterministic timeline remains the single clock for text reveal, visual operations, seek/pause/replay and MP4 export. Horizontal and portrait are recompositions rather than pixel stretching. Body-text/dead-space metrics and cue-boundary checks remain required for new/materially changed outputs, while the frozen approved bytes remain the visual baseline for this release.

## Release / review / publish queues

Machine-readable queues live in `motion/migration/program-state.json`:

- `active_migration_units`: one complete unit being authored/implemented at a time;
- `awaiting_user_review_units`: genuinely new complete units delivered for owner review;
- `approved_pending_technical_units`: owner-approved exact snapshots still completing technical release evidence;
- `publish_ready_units`: exact owner-approved units whose complete technical gate has passed;
- `golden_registry`: immutable approved exact references with separate technical/published state.

`modelos-razonadores` belongs in `approved_pending_technical_units` while its exact delivery/provenance/integration checks are incomplete. It must **not** be sent back to `awaiting_user_review_units` for the unchanged Round 2 bytes.

Once Modelos is actually publish-ready, the existing PR is merged/published without another approval round, current live consumers are verified against the validated hashes, and promotion/release state is recorded separately. Migration then continues with `seguridad-ia`, whose current public inventory and consumers must be re-derived from current `main` before editing and whose own accent identity must be locked before scene work.

## Historical source-rerender instruction — superseded

An earlier ledger revision required rerendering all 24 Review Round 2 assets from a later strengthened source because global layout defaults had changed. That instruction is now **superseded** by the owner's explicit frozen-snapshot amendment.

A newer renderer/layout source does not invalidate an existing human approval and is not itself a defect in already encoded media. The release must recover the truthful matching source profile for the approved snapshot and validate that snapshot against current site integration. Only a demonstrated factual, playback, security, accessibility or delivery defect may force a minimal technical fix; if such a fix materially changes visible content/motion/timing, only the changed version requires new owner approval.

## Current remaining work for Modelos

1. Stage the **exact approved 12 canonical horizontal ES/EN MP4 bytes** at their current public repository paths; do not substitute a later rerender.
2. Read back and verify all 12 SHA-256 values after staging.
3. Recover truthful per-asset source/spec/theme/timeline provenance; keep unresolved source binding `NOT_VERIFIED` rather than guessing.
4. Run complete frozen-snapshot media/playback/mobile/HV/accessibility/reduced-motion/metadata/consumer integration and current-main-compatible release checks.
5. Persist exact evidence for every mandatory gate; only then set `technical_golden=true` / 12-of-12.
6. Merge/publish through PR #332 as one complete block, verify live consumers serve the exact validated assets, and record release separately from owner approval.
7. Send publication confirmation only after observed live release; never request owner approval again for the unchanged Review Round 2 collection.
8. Continue `seguridad-ia` implementation independently when safe rather than idling behind a frozen unit's technical queue.

## Global finish condition

The migration is complete only after a fresh whole-site inventory proves every intended public video/localized output has migrated, every complete unit has valid technical release evidence, each unique complete-unit release is reconciled, and live consumers serve the exact validated approved media. Golden Registry remains the explicit owner-approved reference set and never substitutes for technical certification.
