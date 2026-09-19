# Modelos Razonadores — Review round 2

## Current authority

Round 1 is `SUPERSEDED`. The owner's later explicit decision approves the exact final Review Round 2 collection that was presented. That approval is durable for those exact reviewed bytes and is independent from technical release certification.

The active release ledger is `migration/modelos-razonadores-round2.json`; older status material is historical evidence only. PR #332 / `migration/video-golden-modelos-razonadores` remains the single complete-unit release path while open.

Do **not** revoke Review Round 2 approval because a later renderer/layout default exists. Do **not** rerender approved media merely to move it to a newer source head. Do **not** request approval again for identical bytes. A materially changed visible asset is a new approval scope; a technical delivery/integration repair that preserves the frozen bytes is not.

`owner_visual_approval=APPROVED` and `technical_golden` are separate acceptances. The former is already satisfied for the exact presented Review Round 2 asset collection; the latter remains false until the frozen snapshot passes the full technical release gate and is actually published.

## Frozen approved snapshot

The public state records SHA-256 identities, media profiles and technical status without publishing private Drive or email identifiers. The immutable byte-binding evidence is in `migration/checkpoints/2026-09-19-modelos-approved-snapshot-byte-binding.json`.

Directly owner-confirmed Spanish horizontal references include:

- intro: `e45db8339e97972c672f1d13aa5705bc9f6b25c5fcebfb28556d1c42d40487d6`
- fallos: `d7496cea7bc0b5889f64cca5b60f59506963c7125f4cb2eb9b166e79d26562ed`
- test-time-compute: `e9c6c081bb19d2953777b3d37642e5a718de8dd16ce7b6f73ff9dc252dca8710`
- riesgos: `f594dde47114da817416d0a6b37089cdec34eb607005fe452d5fc22f5b2df381`

The broader collection approval is recorded by exact asset hash only for files that were part of the presented final Round 2 collection. It is not a claim that the owner individually played every file, and it does not extend by resemblance to later unpresented renders.

Comparison/contact-sheet material is review support, not a primary exemplar and not a substitute for the approved MP4 identity.

## Design baseline retained for future units

The Review 2 implementation established the approved editorial direction: neutral flat base, strong typographic hierarchy, important body text kept visibly readable, restrained functional accent, informative semantic diagrams and purposeful motion. Modelos uses `#26A69A / #00776F / #E7F4F0`.

The 33px horizontal body was replaced by measured 42–64px explanatory text and portrait body starts at 44px in the Review 2 development line. Layouts reserve complete text in advance so sentence reveals do not move previous lines. Dense copy is recomposed rather than shrunk or deleted. These development metrics remain useful diagnostics for future work; they do not retrospectively invalidate an already approved encoded asset absent a demonstrated readability/accessibility defect.

The 30 conceptual scenes select registered semantic mechanisms. Twenty-one perceptual families group 28 concrete renderers; no family exceeded two uses at the recorded Review 2 checkpoint. ES/EN and H/V adaptations of one concept count once. Renaming/recoloring/rotation/mirroring cannot manufacture a new family.

## Recorded Review 2 validation

At the Review 2 implementation checkpoint, `node --test tests/review-round2.test.mjs` covered the original 12-spec schema/cue contracts, deterministic seeking, palette/contrast, unknown-mechanism rejection, family-reuse negative cases, text-size/spatial diagnostics, stale-evidence rejection and independent Golden gates.

Real layout preflight sampled 1,520 frames across 24 H/V compositions, including sentence boundaries. It caught dense-copy overflow that was repaired by recomposition. Pixel review also caught a counterfactual annotation overlap and a premature arithmetic correctness tick; both were repaired before the final reviewed collection.

Those checks are evidence about the development line, not permission to label current delivery Technical GOLDEN without binding the frozen approved bytes to current technical evidence.

## Source and render identity

The release must recover the truthful source/spec/theme/timeline profile for each frozen approved asset. A historical source hint is not certification. If re-rendering a candidate revision fails to reproduce the approved encoded hash or trustworthy visual/timeline fingerprints, that revision stays `NOT_VERIFIED`.

A successful renderer process, a green workflow whose assertions do not fail closed, or a later source head must never be described as provenance proof. Source evidence is accepted only when its asserted match criteria actually pass and are bound to the frozen asset identity.

## Technical release gate

The complete approved block can be published without another owner review only after actual evidence covers the frozen release snapshot: factual/source integrity, schema/framework, accent/contrast, body readability/spatial balance, purposeful motion, deterministic sync/seek/export, semantic diagrams and series diversity, ES/EN parity, duration/chapters/posters/transcripts/captions where declared, playback/mobile/HV, accessibility/reduced-motion, media integrity, and current-main consumer integration across catalog/schema/sitemaps/article/watch/library/hub.

Missing, stale or unrun evidence is `NOT_VERIFIED`, never PASS. A genuine factual, playback, security, accessibility or delivery defect may reopen only the affected technical checks. If a required fix materially changes visible content/motion/timing, that changed version is a new approval scope while all unrelated exact approvals remain intact.

## Current release procedure

1. Preserve the exact approved Review Round 2 bytes; no discretionary redesign or default rerender.
2. Recover and record truthful per-asset source/render provenance without inventing a match.
3. Replace the canonical ES/EN public horizontal consumers with the exact approved hashes and verify them after staging.
4. Run the complete technical release gate against those frozen bytes and current main.
5. Keep `technical_golden=false` for every missing/stale/unverified check.
6. Once the complete block passes, merge/publish through the existing PR, verify the live consumers serve the exact validated assets, and record promotion separately from owner approval.
7. Only after observed live publication send publication confirmation; never send another approval request for the unchanged Round 2 collection.

Historical instructions that required rerendering all Review 2 assets from the newest HEAD, uploading a replacement round, or requesting approval again are superseded by the owner-approved frozen-snapshot policy above.
