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

English mirrors the same six chapters. English `03-test-time-compute` must preserve the existing localized-media deployment path rather than assuming a normal locale MP4 path.

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
| EN | 00 series intro | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 01 what reasoning is | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 02 failures | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 03 test-time compute | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 04 latency/streaming | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NO | NO |
| EN | 05 risks | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NO | NO |

Technical GOLDEN remains **0/12**. This is intentional: no gate is being waived to manufacture progress.

## Durable runtime status

The complete v4 runtime is now persisted on the migration branch. Commit `2628fdc0919af0401a98477742e1832038d0f283` adds:

- deterministic `motion/src/engine.mjs`;
- modular rendering primitives/layouts and semantic mechanisms under `motion/src/render/`;
- accessible deterministic `motion/src/player.mjs` using the same `renderFrame` clock as export;
- offline Playwright/Canvas → H.264 exporter at `motion/scripts/render.py`;
- poster, chapters, transcript and validation-report generation;
- horizontal/portrait recomposition from the same spec;
- runtime contract tests and dependency documentation.

The renderer resolves the locked `visualIdentity` at runtime. Generic intro mechanisms use scene-owned `data.heading` / `data.endNote`, fixing the previously discovered semantic-copy leakage from Test-Time Compute. There is no decorative fallback mechanism: all schema mechanism types must have an explicit renderer.

The machine ledger now separates `technical_golden` from `golden_example_approved`, records runtime persistence and review-package/email state, and the release checker enforces that Technical GOLDEN is exactly the conjunction of all required gates. Golden Example approval cannot be true unless Technical GOLDEN is already true.

GitHub Actions run `35379851232` completed successfully after these changes: deterministic motion contract tests passed and the complete-series machine ledger validator passed.

## Golden evidence accumulated

- v4 `visualIdentity` contract and runtime theme resolution are mandatory.
- Missing accent identity, undocumented functional uses, missing gradient prohibition and low-contrast accent text are rejected.
- All six Spanish chapters are checked in as v4 specs and validated against the same locked Teal reasoning identity.
- Semantic mechanism IDs, cue counts and durations for ES 02/04/05 are regression-gated.
- ES 00: 75 s, 13 synchronized cues; H/V layout review previously clean.
- ES 01: 82 s, 16 synchronized cues; H/V layout review previously clean.
- ES 02: 108 s, 5 semantic scenes, 19 cues. Shortcut learning, systematic bias, specification gaming, propagation and verification are represented as distinct mechanisms.
- ES 03: 7 semantic scenes, 37 cues; H/V layout review previously clean.
- ES 04: 115 s, 5 semantic scenes, 23 cues. Nielsen interaction thresholds are design references, TTFT/streaming numbers are explicitly illustrative, and RouteLLM's >2× cost reduction remains scoped to its evaluation.
- ES 05: 121 s, 5 semantic scenes, 22 cues. Apple effort-collapse evidence, indirect prompt injection, TabooRAG, Conformal Thinking and illustrative guardrails remain semantically separated.
- Source review corrected inherited overgeneralizations: Bondarenko's 88% applies to o3 baseline hacking attempts, not a shared o3/DeepSeek R1 rate; Sharma's 85% is not a universal aggregate sycophancy rate.

### Source-review references

- Nielsen Norman Group — response-time limits: `https://www.nngroup.com/articles/response-times-3-important-limits/`
- Ong et al. — RouteLLM: `https://arxiv.org/abs/2406.18665`
- Shojaee et al. — The Illusion of Thinking: `https://machinelearning.apple.com/research/illusion-of-thinking`
- Greshake et al. — Indirect Prompt Injection: `https://arxiv.org/abs/2302.12173`
- Li et al. — TabooRAG: `https://arxiv.org/abs/2603.03919`
- Wang et al. — Conformal Thinking: `https://machinelearning.apple.com/research/conformal-thinking-risk-control`

## Current blockers

1. Execute the newly persisted renderer in the full browser/font/ffmpeg environment and complete H/V layout + representative-frame visual QA for ES 02, 04 and 05. Persistence is solved; rendered QA is not yet claimed.
2. Author/localize and source-review all six English v4 specs, maintaining the exact Teal reasoning identity and the special localized-media path for English TTC.
3. Generate final MP4/poster/chapter/transcript assets only after all 12 localized outputs are ready enough for atomic release.
4. Run final delivery integration across embeds, watch pages, catalog/schema/sitemap, visual hubs and localized-media staging.
5. Complete reduced-motion/accessibility and Safari/iOS playback validation.
6. Run final publication-grade visual review for every localized output.

## Next work

Use the persisted runtime to render/check ES 02/04/05 in both horizontal and portrait compositions, fix any visual defects, then build the six EN specs without changing factual scope or the locked series identity. Do not open a PR until all 12 outputs are Technical GOLDEN. Once the unit is released, assemble the user review package; Golden Example promotion remains user-approved only.
