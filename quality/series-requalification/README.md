# Post-Datacenters experience requalification

Owner contract: public #305, PROGRAM AMENDMENT comment 5655569434 (2026-09-13).

All seven scoped series are PUBLISHED_UNCERTIFIED. No published pages are removed.
Datacenters and earlier series are read-only references. The source base for this
initial diagnosis is recorded in audit-request.json; the diagnostic branch adds
only auditing code, tests and this contract, not editorial fixes.

## Scope is a floor, not a filter

scope.json preserves the 42 known source paths per language, including two
presentations. Discovery additionally uses ES/EN navigation and every Markdown
source page in both locales plus manifest-only entries in those seven directories. A missing presentation, video or nav
entry cannot delete a lesson from validation. EN manifest coverage is independent.

The scope also carries the independent curriculum-media expectation: every one
of those 42 target routes requires a native video in both ES and EN, for **84
expected locale/video obligations**. There is no video opt-out in this program.
This expectation is validated separately from frontmatter/media discovery, so a
future renderer or hook cannot turn "video absent in ES and EN" into parity or a
pass. Media integrity, narration, captions, transcript, key moments, playback and
pixel/pedagogy review remain separate fail-closed gates.

## Run locally

    python scripts/test_series_experience_audit.py -v
    python scripts/audit_video_curriculum_expectation.py
    python scripts/audit_series_experience.py
    mkdocs build --clean --strict
    python scripts/prepare_locale.py --locale en
    S5_LOCALE=en mkdocs build -f mkdocs.en.yml --clean --strict
    python scripts/audit_series_experience.py --site site
    python -m http.server 8000 --directory site
    node scripts/audit_series_experience_browser.mjs

During diagnosis, expected failures must not prevent collecting the next layer.
They still make the final workflow fail. The workflow runs on an explicit change
to audit-request.json on this one branch, not hourly and not on every code edit.
No publisher, issue writer, media uploader or deploy is invoked.

## What this initial audit proves — and what it does not

Source: route/locale/manifest coverage, required video declaration presence,
source snippet existence, section and source-math inventory with source hashes.
HTML: every inventoried built page, article body, native mathematical nodes,
raw TeX/macro/snippet leakage, video element presence and html locale.
Browser: all pages at 1440 and 390, normal and reduced motion, complete-page
lazy-load traversal, retained runtime/all-origin resource listeners, raw TeX,
page overflow, broken images, actual SVG label sizes, internal pan inventory.

Small font and internal pan are review candidates, not universal accessibility
thresholds or a claim to measure teaching quality. The browser captures a bounded
sample of viewport evidence, not a fake claim of every pixel being reviewed.

The initial browser diagnostic does NOT test actual touch/keyboard transitions,
causal controls, playback/seek/ended, section-to-key-moment coverage, content
correctness or pixel/pedagogical review. It records these as NOT_RUN/PENDING.
A technical PASS MUST NOT mark a page GOLDEN. Full source/math/browser/media/
pixel/pedagogy gates under #305 remain mandatory before recertification.

## Repair order

First close shared coverage/render defects; then Seguridad, Agentes, Realtime
Voice, Coding Harnesses, Context/Memory/MCP, Inference, Production Evaluation.
Review existing draft PR #34 before duplicating its media/animation hardening.
Keep material #310 changes and the separate 72-hour LinkedIn release contract
isolated. Other series changes do not reset that article's clock.

The first lesson to requalify is Seguridad's presentation and chapter 1, not
another new series. Preserve working content. Replace weak mechanism visuals,
not just their colours, and provide native ES/EN chapter videos and section
key moments. Missing authorised voice inputs are a recorded blocker, never an
excuse to claim full completion or to synthesize the owner's voice.
