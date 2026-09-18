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
| ES | 00 presentación | pending | pending | locked | pending | pending | pending | NO |
| ES | 01 qué es razonar | pending | pending | locked | pending | pending | pending | NO |
| ES | 02 fallos | pending | pending | locked | pending | pending | pending | NO |
| ES | 03 test-time compute | v4 candidate | 37 authored cues | locked | candidate reviewed | horizontal + vertical checks pass | pending final site integration | NO |
| ES | 04 latencia/streaming | pending | pending | locked | pending | pending | pending | NO |
| ES | 05 riesgos | pending | pending | locked | pending | pending | pending | NO |
| EN | 00 series intro | pending | pending | locked | pending | pending | pending | NO |
| EN | 01 what reasoning is | pending | pending | locked | pending | pending | pending | NO |
| EN | 02 failures | pending | pending | locked | pending | pending | pending | NO |
| EN | 03 test-time compute | pending localization | pending | locked | pending | pending | pending localized-media integration | NO |
| EN | 04 latency/streaming | pending | pending | locked | pending | pending | pending | NO |
| EN | 05 risks | pending | pending | locked | pending | pending | pending | NO |

### Golden evidence accumulated

- Motion framework v4 adds a mandatory release-unit `visualIdentity` contract and runtime theme resolution.
- The runtime rejects a missing accent identity, missing documented functional uses, palette policy that no longer forbids decorative gradients, and low-contrast accent text.
- 61 Node tests pass after the v4 extension.
- Test-Time Compute v4 passes renderer layout validation in both 1920×1080 and recomposed 1080×1920 modes.
- Existing shared-clock cue behavior remains deterministic; text and diagram state are still derived from the same timeline.

### Current blockers

1. Five Spanish chapter videos and all six English variants still need authored semantic scene specs and cue timelines.
2. Final MP4/poster generation and site metadata updates must wait for the entire series so release remains atomic.
3. Full consumer-page regression, Safari/iOS playback, accessibility review and final visual review remain release gates.

### Next work

Author the semantic/synchronized v4 specs for `00_presentacion_serie` and `01-que-es-razonar`, extend components only where the subject requires a new mechanism, then run horizontal/vertical layout + visual QA. Do not open a PR until all 12 localized outputs are GOLDEN.
