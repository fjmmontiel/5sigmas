# Modelos Razonadores — Review round 2

## Current authority

The owner's rejection of round one overrides every previous visual certificate. The active release ledger is `migration/modelos-razonadores-round2.json`; `modelos-razonadores-status.json` is retained as historical evidence and must not re-certify a changed render. PR #332 remains draft. Do not start another series or promote a Golden Example until the applicable current gates and owner decisions permit it.

The hourly task has been updated. This is a real execution checkpoint, not merely a plan: the complete canonical ES/EN specs were recovered and their Git blob identities verified, actual Chromium renders were sampled, semantic renderers were implemented, and full 60fps exports were started locally. No Actions render was dispatched just for cadence.

## Design corrections

The 33px horizontal body is replaced by measured 42–64px explanatory text. Portrait body starts at 44px. Layouts reserve the complete text in advance, so sentence reveals do not move previous lines. Dense copy gets a full-span title and wider body region instead of shrinking below the minimum or deleting words. The source follows the body, rather than anchoring a small isolated paragraph far above the footer.

These are editorial design budgets, not universal accessibility guarantees. Actual 390px delivery and the full player must still be reviewed; source canvas font size alone is not mobile certification.

The 30 conceptual scenes now select registered semantic mechanisms. Twenty-one perceptual families group 28 concrete renderers; no family currently exceeds two uses. The common numbered-descending template is not used by any current Modelos scene. ES/EN and H/V of one concept count once. A third use requires explicit current semantic and visual-review evidence; four is always blocked. Renaming a renderer cannot evade its family.

The register lives in `src/render/mechanisms/editorial.mjs`. `scripts/check_visual_variety.mjs` emits scene IDs, rationale, topology, cue references and renderer fingerprints. This structural preflight does NOT grant visual approval; a complete-series encoded motion review remains independent.

## Actual validation and remaining gates

Run `node --test tests/review-round2.test.mjs`: 65 tests at this checkpoint. They include full original 12-spec schema/cue checks, deterministic seeking, palette/contrast, unknown mechanism rejection, third/fourth-use and renamed-family negative cases, 33px text, permanent blank region, missing metrics, stale evidence and independent Golden gates.

Real layout preflight sampled 1,520 frames across 24 H/V compositions, including sentence boundaries. It caught dense-copy overflow, which was repaired by recomposition. Pixel review also caught a counterfactual annotation overlap and a premature arithmetic correctness tick; those were fixed before the full export batch.

No current output is Technical GOLDEN solely from these checks. Revalidate final encoded motion, actual player/accessibility, current-main integration and delivery/consumers. Bind each passing gate to the actual source/render hashes. Old seven-boolean certificates are insufficient after this amendment.

## Reproduction

Install repository Python requirements, Chromium, FFmpeg and the required Inter / Noto Serif Display fonts in the rendering environment. Fonts are external dependencies and must not be included in downloadable source/review bundles.

```sh
node --test tests/review-round2.test.mjs
node scripts/check_visual_variety.mjs
python scripts/render.py content/modelos-razonadores/02-fallos.es.json --check-only
python scripts/render.py content/modelos-razonadores/02-fallos.es.json --review-sheet
python scripts/render.py content/modelos-razonadores/02-fallos.es.json --out dist/review-2
python scripts/render.py content/modelos-razonadores/02-fallos.es.json --out dist/review-2 --portrait
```

The renderer loads separate ESM modules with an offline import map, preserving scopes and resolving new dependencies rather than concatenating a hardcoded file list. It refuses page errors, font substitution and detected layout issues. MP4s are H.264/yuv420p/fast-start; frames, duration and SHA-256 are measured after encoding. Sidecars describe the unchanged visual text; no narration was generated.

## Continuation

1. Finish/reconcile actual current exports; never label a partial MP4 as ready.
2. Inspect encoded frames and motion for every chapter and both locales. Review 390px V and desktop H; do not certify only full-size screenshots.
3. Re-run canonical repository tests and actual player tests, preserving existing quality contracts.
4. Reconcile current main and canonical delivery; unchanged filenames/old metadata must not point to old review bytes.
5. Save bound evidence in the round-two ledger; keep unverified gates false.
6. Once the complete unit passes, make the SAME PR ready, upload the complete Review 2 package, read back Drive file metadata and send one verified email. Keep private email identities/decisions out of public source.
7. Golden Examples requires explicit approval of the exact version. Silence and earlier praise of the prototype are not approval.
