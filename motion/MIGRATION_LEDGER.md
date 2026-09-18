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
| ES | 04 latencia/streaming | pending | pending | locked | pending | pending | pending | NO |
| ES | 05 riesgos | pending | pending | locked | pending | pending | pending | NO |
| EN | 00 series intro | pending localization | pending | locked | pending | pending | pending | NO |
| EN | 01 what reasoning is | pending localization | pending | locked | pending | pending | pending | NO |
| EN | 02 failures | pending | pending | locked | pending | pending | pending | NO |
| EN | 03 test-time compute | pending localization | pending | locked | pending | pending | pending localized-media integration | NO |
| EN | 04 latency/streaming | pending | pending | locked | pending | pending | pending | NO |
| EN | 05 risks | pending | pending | locked | pending | pending | pending | NO |

### Golden evidence accumulated

- Motion framework v4 adds a mandatory release-unit `visualIdentity` contract and runtime theme resolution.
- The runtime rejects a missing accent identity, missing documented functional uses, palette policy that no longer forbids decorative gradients, and low-contrast accent text.
- 61 Node tests passed after the original v4 extension; the cue clock remains deterministic and text/diagram state derive from the same timeline.
- A repository test now validates every checked-in `modelos-razonadores` motion spec against the v4 contract, locks the complete series to the same Teal reasoning identity, and asserts the failure chapter contains the intended five mechanisms rather than a decorative fallback.
- Test-Time Compute v4 passes renderer layout validation in both 1920×1080 and recomposed 1080×1920 modes.
- ES series intro v4: 75 s, 13 synchronized cues, H/V layout validation clean. Representative frames show the locked teal identity, stable phrase highlighting and semantically meaningful roadmap/allocation diagrams.
- ES chapter 1 v4: 82 s, 16 synchronized cues, H/V layout validation clean. Representative frames cover the operational definition and sourced AIME comparison.
- ES chapter 2 v4 candidate: 108 s, five semantic scenes and 19 synchronized cues. Shortcut learning is represented as a spurious-vs-robust path; systematic biases as repeatable directional failure modes; specification gaming explicitly separates objective from proxy; propagation exposes an early false premise and recovery path; verification combines perturbation, intermediate checks, multiple sampling, OOD testing and external blocking.
- Authoring validation for chapter 2 passes the committed v4 schema/cue invariants: complete verbatim paragraph coverage, <=240 WPM cue speed, monotonic deterministic actions, all mechanism targets finishing at 1, tree integrity and locked-identity validation.
- Primary-source review caught two factual overgeneralizations inherited from the article draft. Bondarenko et al. report **o3** hacking in 88% of baseline runs, not a shared 88% rate for o3 and DeepSeek R1. Sharma et al.'s 85% describes what a feedback-positivity value means for a particular prompt, not a universal aggregate sycophancy rate. Both the chapter-2 video candidate and its source article are now corrected to source-faithful wording.
- Visual QA previously caught a framework-level semantic-copy defect: generic intro mechanisms displayed the old Test-Time-Compute heading/end-note on unrelated scenes. The local renderer was generalized to accept per-scene `heading`/`endNote`; both new specs declare semantic copy explicitly. This fix must be persisted with the renderer before either video can become GOLDEN.

### Current blockers

1. ES `04-latencia-streaming` and `05-riesgos` still need authored semantic scene specs and cue timelines.
2. All six English variants still need localization/review; English TTC must preserve its special localized-media deployment path.
3. The complete renderer/exporter/web-player/test harness must be persisted under `motion/` on this branch; the branch currently contains durable contracts/specs and spec-level tests but not yet the entire local v4 runtime required for visual rendering.
4. Final MP4/poster generation and site metadata updates must wait for the entire series so release remains atomic.
5. Full consumer-page regression, Safari/iOS playback, accessibility review and final visual review remain release gates.

### Next work

Persist the full v4 renderer/export/test harness needed to render the checked-in semantic specs, then author ES `04-latencia-streaming` and `05-riesgos`. Localize all six videos, run full delivery QA, and open no PR until all 12 localized outputs are GOLDEN.
