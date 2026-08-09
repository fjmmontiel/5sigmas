# Visual and video QA

This repository treats visual quality as a release contract, not only as a build check.

## PR checks

`pr-visual-review.yml` validates:

- strict MkDocs build and search/publication/video contracts;
- browser resource loading and responsive screenshots;
- animation-density review for pages affected by the PR;
- Seguridad en IA visual interactions end-to-end;
- reader continuation and voice microlabs;
- the complete video library/watch/article experience;
- navigation, reader-header isolation and responsive interaction polish.

When a public MP4 changes, CI also extracts representative frames at 8%, 34%, 62% and 88% of its duration.

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
