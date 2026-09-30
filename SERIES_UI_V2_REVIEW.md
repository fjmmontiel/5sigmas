# Series UI V2 — owner review, not a publication

PR #378, branch `ui/series-discovery-review-20260929`.

## Scope

The explorer covers the 13 canonical series and 67 substantive chapters. The
advanced series (7–13) have 40 chapter-specific deterministic teaching scenes in
Spanish and English. Each scene exposes four stages and two declared scenarios;
it does not call an LLM or claim to reproduce a benchmark. Original article prose,
primary-source links and approved video bytes remain in place. The first original
technical visual is accessible through a visible reference tab rather than being
stacked beneath the guided scene. One chapter has no integrated first visual and
links to its technical explanation instead. No automatic completion is inferred
from opening a chapter.

The catalog provides a complete browsable inventory, search, learning-goal
filters, four explicit pathways, series details and original inline video
playback. Returning to the catalog preserves the in-session filter and position.
Last-reading recovery uses existing local state; there is no new analytics
collector, user account, payment, subscription service or production deployment.

## Review evidence

The `Series UI real browser review` job checks out the candidate SHA and the
exact pull-request base SHA. Both SHAs are recorded in the evidence manifest. It builds both in ES/EN,
serves them on separate local HTTP ports inside the Actions runner, and uses real
Chromium for screenshots and MP4 interaction recording. The manifest retains
source SHA, viewport, route, crop bounds and SHA-256 for each original PNG.
Crops are real pixels from the rendered page, never replacement DOM or generated
mockups. Live production references have separate timestamps and are not silently
substituted for the pinned baseline. Screenshots do not prove learning outcomes.

## Validation boundaries

- The new default guided view is tested by the complete browser capture matrix,
  the deterministic 80-case/640-state scene tests and explicit controls checks.
- Existing original-diagram geometry/accessibility tests run with an explicit
  per-step `NODE_OPTIONS` navigation fixture. It clicks the real visible
  `Diagrama original` / `Original diagram` tab and verifies its selected and
  visible state before unchanged original assertions execute. It never forces
  CSS visibility, edits diagrams, removes assertions, swallows errors or changes
  viewport/motion settings. Generic navigation, SEO, media and default-view
  capture jobs do not use this fixture.
- Locale discovery checks follow a series card and verify the visible chapter
  link. They do not count hidden anchors as successful discovery.
- Fullscreen checks enter through the real control, exit with Escape and with
  the button, and verify focus return and accessible labels in both languages.
- Navigation checks preserve selected series across locale switches and open
  existing original-diagram fragments through the correct tab.

## Owner decision

Keep this PR in draft and do not merge or deploy without the owner's review of
the actual before/after evidence. Test results belong to their exact execution
SHA; a pending or failed general gate must be reported, not presented as green.
The model-price comparator's external fresh-release gate is independent of this
UI work; its data/thresholds must not be changed solely to make this PR pass.
