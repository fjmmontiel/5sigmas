# Visual and video QA

This repository treats visual quality as a release contract, not only as a build check.

## PR checks

`pr-visual-review.yml` validates:

- strict MkDocs build and search/publication/video contracts;
- binary media signatures, so a `.jpg` containing non-JPEG bytes fails before browser QA;
- browser resource loading and responsive screenshots;
- animation-density review for pages affected by the PR;
- Seguridad en IA visual interactions end-to-end;
- reader continuation and voice microlabs;
- the complete video library/watch/article poster-to-player lifecycle on desktop and mobile;
- navigation, reader-header isolation and responsive interaction polish.

When a public MP4 changes, CI also extracts representative frames at 8%, 34%, 62% and 88% of its duration.

## 2026-08-09 P0 compact-video replacement

The full-catalogue review identified eight P0 videos where paragraphs, supporting numbers, conclusions and diagrams competed within the same beat. They were replaced with reproducible compact renders generated from `scripts/p0_video_storyboards.json` and `scripts/regenerate_p0_compact_videos.py`.

The replacement contract is:

- 1920×1080 H.264;
- `PT52S` article metadata and ~51.9 s encoded duration;
- five content beats per video;
- one thesis per beat;
- one dominant diagram per beat;
- short supporting copy instead of multiple simultaneous evidence blocks.

The eight changed MP4s are:

1. `series/ia-pib-bienestar-energia/04-ia-pib-hoy.mp4`
2. `series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica.mp4`
3. `series/ia-pib-bienestar-energia/03-pib-vs-bienestar.mp4`
4. `series/multimodalidad-iag/02-alineamiento.mp4`
5. `series/multimodalidad-iag/03-arquitecturas.mp4`
6. `series/multimodalidad-iag/05-riesgos.mp4`
7. `series/datacenters-espacio/02-energia-calor-conectividad.mp4`
8. `series/datacenters-espacio/04-huella-real-datacenter.mp4`

A PR containing those eight videos must therefore emit **32 representative review frames** from the changed-video gate before merge.

## Full audits on demand

Run the animation reviewer without `S5_CHANGED_FILES_FILE` to inspect the full site rather than only PR-affected pages:

```bash
node scripts/capture_animation_density_review.mjs
```

Run the video reviewer without explicit paths to sample every public MP4:

```bash
python scripts/capture_video_density_review.py
```

The density reports are prioritisation evidence, not automatic aesthetic scores. A flagged visual must still be inspected in context before it is simplified or replaced.
