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

English mirrors the same six chapters. **All 12 ES/EN v4 specs are now authored on the migration branch.** English `03-test-time-compute` preserves the existing localized-media deployment contract at `.localized-media/en/ttc-v1/03-test-time-compute.mp4` plus its paired poster; the eventual new render must replace the media and the workflow checksum/size contract atomically.

Consumer surfaces in scope: ES/EN article embeds, generated ES/EN watch pages, video library/catalog/schema/sitemap outputs, home-page Test-Time-Compute feature, ES/EN visual hubs, localized-media metadata, posters and deployment staging. No consumer is complete until final media is revalidated through the delivery pipeline.

### Per-output status

| Locale | Video | Framework | Sync | Source | Layout | Delivery | Accessibility | Visual QA | Technical GOLDEN | Golden Example |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ES | 00 presentación | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | NO | NO |
| ES | 01 qué es razonar | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | NO | NO |
| ES | 02 fallos | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| ES | 03 test-time compute | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | NO | NO |
| ES | 04 latencia/streaming | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| ES | 05 riesgos | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 00 series intro | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 01 what reasoning is | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 02 failures | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 03 test-time compute | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 04 latency/streaming | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 05 risks | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | NO | NO |

Technical GOLDEN remains **0/12**. This is intentional: authoring/spec validation does not satisfy layout, delivery, accessibility or final visual-QA gates.

## Durable runtime status

The complete v4 runtime is persisted on the migration branch:

- deterministic `motion/src/engine.mjs`;
- modular rendering primitives/layouts and semantic mechanisms under `motion/src/render/`;
- accessible deterministic `motion/src/player.mjs` using the same `renderFrame` clock as export;
- offline Playwright/Canvas → H.264 exporter at `motion/scripts/render.py`;
- poster, chapters, transcript and validation-report generation;
- horizontal/portrait recomposition from the same spec;
- runtime contract tests and dependency documentation.

The renderer resolves the locked `visualIdentity` at runtime. Generic intro mechanisms use scene-owned `data.heading` / `data.endNote`, preventing semantic-copy leakage between topics. There is no decorative fallback mechanism: all schema mechanism types must have an explicit renderer.

The machine ledger separates `technical_golden` from `golden_example_approved`, records runtime persistence and review-package/email state, and the release checker enforces that Technical GOLDEN is exactly the conjunction of all required gates. Golden Example approval cannot be true unless Technical GOLDEN is already true.

## Bilingual authoring completed in this phase

- EN 00 series introduction: authored in v4 with the same 75 s / 13-cue structural contract as ES.
- EN 01 reasoning definition: authored and source-scoped to the same evidence as ES.
- EN 02 failures: authored with the same five semantic mechanisms as ES (`shortcut`, `systematic-bias`, `gaming`, `propagation`, `verification`).
- EN 03 Test-Time Compute: authored with the same seven semantic mechanisms and 37 cues as ES; AIME evidence remains 74% single-sample vs 83% 64-sample consensus, sourced to OpenAI. Localized-media deployment remains special-cased and pinned in `motion/migration/modelos-razonadores.json`.
- EN 04 latency/streaming: authored with five mechanisms and 23 cues; Nielsen thresholds remain design references, TTFT examples remain explicitly illustrative, and RouteLLM's >2× cost reduction remains scoped to its evaluation.
- EN 05 risks: authored with five mechanisms and 22 cues; Apple effort-collapse evidence, indirect prompt injection, TabooRAG and Conformal Thinking remain distinct from illustrative defense-in-depth controls.

Regression tests now require **exactly 12 localized specs**, six ES and six EN, all schema-valid under v4 and all locked to `Teal reasoning #26A69A`. They also enforce bilingual mechanism parity for failures, TTC, latency and risks, plus the relevant evidence URLs and cue/duration contracts.

Commits in this phase include English risks authoring `259d1cabf2024e3a2fa6fc42c3592747da127fd3`, English TTC authoring `d06d95f5eb935584e315588837f5078e56d09c78`, bilingual regression gate `77d9035028f8e24e9d6c0024b2f1ee64356d4c65`, and pinned localized-media contract `c5d5ada0bca8e7364982d17d471c692cac0a9d36`.

## Golden evidence accumulated

- v4 `visualIdentity` contract and runtime theme resolution are mandatory.
- Missing accent identity, undocumented functional uses, missing gradient prohibition and low-contrast accent text are rejected.
- All twelve Spanish/English chapters are checked in as v4 specs and share the same locked Teal reasoning identity.
- Semantic mechanism IDs, cue counts and durations are regression-gated for the higher-risk mechanism-heavy chapters.
- ES 00: 75 s, 13 synchronized cues; H/V layout review previously clean.
- ES 01: 82 s, 16 synchronized cues; H/V layout review previously clean.
- ES 02: 108 s, 5 semantic scenes, 19 cues.
- ES 03: 7 semantic scenes, 37 cues; H/V layout review previously clean.
- ES 04: 115 s, 5 semantic scenes, 23 cues.
- ES 05: 121 s, 5 semantic scenes, 22 cues.
- Source review corrected inherited overgeneralizations: Bondarenko's 88% applies to o3 baseline hacking attempts, not a shared o3/DeepSeek R1 rate; Sharma's 85% is not a universal aggregate sycophancy rate.

### Source-review references

- Nielsen Norman Group — response-time limits: `https://www.nngroup.com/articles/response-times-3-important-limits/`
- Ong et al. — RouteLLM: `https://arxiv.org/abs/2406.18665`
- Shojaee et al. — The Illusion of Thinking: `https://machinelearning.apple.com/research/illusion-of-thinking`
- Greshake et al. — Indirect Prompt Injection: `https://arxiv.org/abs/2302.12173`
- Li et al. — TabooRAG: `https://arxiv.org/abs/2603.03919`
- Wang et al. — Conformal Thinking: `https://machinelearning.apple.com/research/conformal-thinking-risk-control`
- OpenAI — Learning to Reason with LLMs: `https://openai.com/index/learning-to-reason-with-llms/`
- Snell et al. — Scaling LLM Test-Time Compute Optimally: `https://arxiv.org/abs/2408.03314`

## Current blockers

1. Execute the persisted renderer in the full browser/font/ffmpeg environment and complete H/V layout + representative-frame visual QA for ES 02/04/05 and all six EN outputs.
2. Fix any visual defects found by that render review without relaxing the shared framework or locked color identity.
3. Generate final MP4/poster/chapter/transcript assets only after all 12 localized outputs are visually ready enough for atomic release.
4. Replace the English TTC localized-media payload and its checksum/size deployment contract atomically with the new render.
5. Run final delivery integration across embeds, watch pages, catalog/schema/sitemap, visual hubs and localized-media staging.
6. Complete reduced-motion/accessibility and Safari/iOS playback validation.
7. Run final publication-grade visual review for every localized output.

## Next work

The content-authoring bottleneck is now closed. The next iteration should focus on **rendered QA rather than more copy**: execute the v4 exporter for the unresolved ES and all EN specs, inspect horizontal/portrait representative frames, repair layout/motion defects, and only then advance layout/visual-QA gates. Do not open a PR until all 12 outputs are Technical GOLDEN. Once the complete unit is released, assemble the user review package; Golden Example promotion remains user-approved only.
