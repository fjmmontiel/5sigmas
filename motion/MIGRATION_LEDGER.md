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
| ES | 02 fallos | pending | pending | locked | source article inventoried | pending | pending | NO |
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
- 61 Node tests pass after the v4 extension; the cue clock remains deterministic and text/diagram state derive from the same timeline.
- Test-Time Compute v4 passes renderer layout validation in both 1920×1080 and recomposed 1080×1920 modes.
- ES series intro v4: 75 s, 13 synchronized cues, H/V layout validation clean. Representative frames show the locked teal identity, stable phrase highlighting and semantically meaningful roadmap/allocation diagrams.
- ES chapter 1 v4: 82 s, 16 synchronized cues, H/V layout validation clean. Representative frames cover the operational definition and sourced AIME comparison.
- Visual QA caught a framework-level semantic-copy defect: generic intro mechanisms displayed the old Test-Time-Compute heading/end-note on unrelated scenes. The local renderer was generalized to accept per-scene `heading`/`endNote`; both new specs now declare semantic copy explicitly. This fix must be persisted with the renderer before either video can become GOLDEN.

### Current blockers

1. ES `02-fallos`, `04-latencia-streaming` and `05-riesgos` still need authored semantic scene specs and cue timelines.
2. All six English variants still need localization/review; English TTC must preserve its special localized-media deployment path.
3. The complete renderer/exporter/web-player/test harness must be persisted under `motion/` on this branch; the branch currently contains the durable contracts/specs but not yet the entire local v4 runtime.
4. Final MP4/poster generation and site metadata updates must wait for the entire series so release remains atomic.
5. Full consumer-page regression, Safari/iOS playback, accessibility review and final visual review remain release gates.

### Next work

Persist the full v4 renderer/export/test harness, then author ES `02-fallos` with mechanisms that expose shortcut learning, systematic bias/specification gaming, error propagation and verification rather than generic decoration. Continue through ES 04/05, localize all six videos, run full delivery QA, and open no PR until all 12 localized outputs are GOLDEN.
