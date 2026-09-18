# 5sigmas video motion migration ledger

Last updated: 2026-09-18

This file is the durable source of truth for the code-driven video migration. A release unit may open exactly one PR only after every video/localization in that unit is GOLDEN.

## Active release unit — `modelos-razonadores`

**State:** IN PROGRESS — no release PR allowed yet.

**Locked visual identity:** Teal reasoning. `accent=#26A69A`, `accentText=#00776F`, `accentSurface=#E7F4F0`. The accent is fixed for the complete series in Spanish and English. It is functional only: key words/metrics, active nodes/paths, selected results and progress. Decorative gradients, per-scene palette changes and ornamental multicolor fills are forbidden. `accentText` is required to clear WCAG AA against the neutral base background.

### Inventory

The Spanish checked-in series has six MP4/poster/article triplets: `00_presentacion_serie`, `01-que-es-razonar`, `02-fallos`, `03-test-time-compute`, `04-latencia-streaming`, `05-riesgos`. The English locale mirrors the same six chapters; English `03-test-time-compute` is injected through the localized-media deployment path instead of being a normal locale MP4 in the directory.

Consumer surfaces in scope for the unit: ES/EN series article embeds, generated ES/EN watch pages, video library/catalog/schema/sitemap outputs, the home-page feature for Test-Time Compute, the ES/EN visual hubs, localized media metadata, poster assets and deployment staging. No consumer is considered complete until the generated delivery pipeline is revalidated with final media.

### Per-video status

| Locale | Video | Framework | Text↔motion sync | Locked accent | Factual/source review | Layout QA | Delivery integration | GOLDEN |
|---|---|---|---|---|---|---|---|---|
| ES | 00 presentación | v4 candidate · 4 semantic scenes | 13 authored cues | locked | article + Snell source mapped | H/V layout checks pass; representative frames reviewed | pending final site integration | NO |
| ES | 01 qué es razonar | v4 candidate · 4 semantic scenes | 16 authored cues | locked | article + DeepSeek/OpenAI/Apple sources mapped | H/V layout checks pass; representative frames reviewed | pending final site integration | NO |
| ES | 02 fallos | v4 candidate · 5 semantic scenes · 108 s | 19 authored cues | locked | primary sources rechecked; article + video corrected to source-faithful o3 and sycophancy wording | renderer/layout visual QA pending | pending final site integration | NO |
| ES | 03 test-time compute | v4 candidate · 7 semantic scenes | 37 authored cues | locked | candidate reviewed | H/V layout checks pass | pending final site integration | NO |
| ES | 04 latencia/streaming | v4 candidate · 5 semantic scenes · 115 s | 23 authored cues | locked | Nielsen + RouteLLM claims rechecked; illustrative TTFT/streaming claims explicitly non-benchmark | renderer/layout visual QA pending | pending final site integration | NO |
| ES | 05 riesgos | v4 candidate · 5 semantic scenes · 121 s | 22 authored cues | locked | Apple, Greshake, TabooRAG and Conformal Thinking primary sources rechecked | renderer/layout visual QA pending | pending final site integration | NO |
| EN | 00 series intro | pending localization | pending | locked | pending | pending | pending | NO |
| EN | 01 what reasoning is | pending localization | pending | locked | pending | pending | pending | NO |
| EN | 02 failures | pending localization | pending | locked | pending | pending | pending | NO |
| EN | 03 test-time compute | pending localization | pending | locked | pending | pending | pending localized-media integration | NO |
| EN | 04 latency/streaming | pending localization | pending | locked | pending | pending | pending | NO |
| EN | 05 risks | pending localization | pending | locked | pending | pending | pending | NO |

### Golden evidence accumulated

- Motion framework v4 adds a mandatory release-unit `visualIdentity` contract and runtime theme resolution.
- The runtime rejects a missing accent identity, missing documented functional uses, palette policy that no longer forbids decorative gradients, and low-contrast accent text.
- A branch CI workflow now runs the deterministic motion contract on every `motion/**` update for this migration branch. It is a pre-GOLDEN safety net, not a substitute for visual QA.
- Repository tests now require **all six Spanish chapters** to exist as v4 specs and validate against the same locked Teal reasoning identity; they no longer accept a partial authored subset.
- Repository tests explicitly gate the semantic mechanisms, cue counts and durations of chapters 02, 04 and 05 so later edits cannot silently collapse them into generic/decorative scenes.
- Test-Time Compute v4 passes renderer layout validation in both 1920×1080 and recomposed 1080×1920 modes.
- ES series intro v4: 75 s, 13 synchronized cues, H/V layout validation clean. Representative frames show the locked teal identity, stable phrase highlighting and semantically meaningful roadmap/allocation diagrams.
- ES chapter 1 v4: 82 s, 16 synchronized cues, H/V layout validation clean. Representative frames cover the operational definition and sourced AIME comparison.
- ES chapter 2 v4 candidate: 108 s, five semantic scenes and 19 synchronized cues. Shortcut learning is represented as a spurious-vs-robust path; systematic biases as repeatable directional failure modes; specification gaming explicitly separates objective from proxy; propagation exposes an early false premise and recovery path; verification combines perturbation, intermediate checks, multiple sampling, OOD testing and external blocking.
- ES chapter 4 v4 candidate: 115 s, five semantic scenes and 23 synchronized cues. Nielsen's 0.1/1/10-second interaction thresholds are represented as design references rather than universal laws; TTFT vs total latency and streaming are explicitly illustrative; RouteLLM's paper-backed >2× cost reduction claim is kept scoped to its evaluation.
- ES chapter 5 v4 candidate: 121 s, five semantic scenes and 22 synchronized cues. The three-regime/effort-collapse description is source-faithful to Apple; indirect prompt injection is tied to Greshake et al.; TabooRAG is represented as an availability/blocking attack; Conformal Thinking is represented as budgeted risk control with upper/lower stopping thresholds. The final guardrail scene is explicitly marked illustrative synthesis.
- Primary-source review caught two factual overgeneralizations inherited from chapter 2. Bondarenko et al. report **o3** hacking in 88% of baseline runs, not a shared 88% rate for o3 and DeepSeek R1. Sharma et al.'s 85% describes what a feedback-positivity value means for a particular prompt, not a universal aggregate sycophancy rate. Both the chapter-2 video candidate and its source article are corrected to source-faithful wording.
- Visual QA previously caught a framework-level semantic-copy defect: generic intro mechanisms displayed the old Test-Time-Compute heading/end-note on unrelated scenes. The local renderer was generalized to accept per-scene `heading`/`endNote`; both new specs declare semantic copy explicitly. This fix still must be persisted with the renderer before any video can become GOLDEN.

### Source-review references used in the current gate

- Nielsen Norman Group — response-time limits: `https://www.nngroup.com/articles/response-times-3-important-limits/`
- Ong et al. — RouteLLM: `https://arxiv.org/abs/2406.18665`
- Shojaee et al. — The Illusion of Thinking: `https://machinelearning.apple.com/research/illusion-of-thinking`
- Greshake et al. — Indirect Prompt Injection: `https://arxiv.org/abs/2302.12173`
- Li et al. — TabooRAG: `https://arxiv.org/abs/2603.03919`
- Wang et al. — Conformal Thinking: `https://machinelearning.apple.com/research/conformal-thinking-risk-control`

### Current blockers

1. All six English variants still need localization/review; English TTC must preserve its special localized-media deployment path.
2. The complete renderer/exporter/web-player/test harness must be persisted under `motion/` on this branch; the branch currently contains durable contracts/specs and spec-level tests but not yet the entire local v4 runtime required for visual rendering.
3. ES chapters 02, 04 and 05 still need renderer/layout visual QA once the full runtime is persisted.
4. Final MP4/poster generation and site metadata updates must wait for the entire series so release remains atomic.
5. Full consumer-page regression, Safari/iOS playback, accessibility review and final visual review remain release gates.

### Next work

Persist the full v4 renderer/export/test harness needed to render all six checked-in Spanish semantic specs. Run H/V visual QA for chapters 02/04/05, then localize and review all six English videos, re-run delivery QA, and open no PR until all 12 localized outputs are GOLDEN.
