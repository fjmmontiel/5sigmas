# Visual, animation and video QA

5sigmas treats rendered output as a release contract. A successful Markdown build is necessary but not sufficient.

## Release topology

Both pull requests and `main` deployments call `.github/workflows/visual-qa.yml`.

The reusable gate validates:

- strict MkDocs build and search/publication/video contracts;
- binary media signatures, so a `.jpg` containing MP4 bytes fails before browser QA;
- cache-safe/versioned filenames whenever already-declared public video media changes;
- browser resource loading and responsive screenshots;
- a discriminative animation-density review queue;
- a hard animation regression contract against the PR/release base build;
- Seguridad en IA interactions, reader continuation and voice microlabs;
- the complete video hub/watch/article poster-to-player lifecycle on desktop and mobile;
- all eight P0 compact-video routes as permanent canaries;
- direct navigation, reader-header isolation and responsive interaction polish.

The output always contains a self-contained `artifacts/visual-review/5sigmas.html`. It embeds the most useful screenshots and representative video frames so review does not require a local checkout.

## Production proof

A release is not considered verified merely because the PR preview passed.

`deploy-pages.yml` now:

1. runs the same reusable visual gate;
2. publishes/validates changed R2 media before the Pages build when `S5_VIDEO_MEDIA_ORIGIN` is configured;
3. stamps `/build.json` with the exact Git commit SHA;
4. deploys Pages;
5. waits until `https://5sigmas.com/build.json` exposes that exact SHA;
6. re-runs P0 video lifecycle checks, Agentes poster decoding, animation contract checks and responsive captures against production;
7. uploads a second self-contained `5sigmas-production-review` artifact.

That sequence makes `main == production` observable rather than inferred.

## Video media identity and caching

`publish-video-media.yml` selects media objects from the release diff. Every selected object is uploaded with its source SHA-256 in R2 object metadata, then verified with `head-object` for both SHA-256 and byte length before public delivery checks run.

Changed declared media must use one of these filename forms:

```text
03-test-time-compute-v2.mp4
03-test-time-compute-a1b2c3d4.mp4
```

Legacy mutable names are grandfathered while unchanged. Once changed, they must be renamed. Versioned/content-addressed objects receive:

```text
Cache-Control: public,max-age=31536000,immutable
```

Legacy objects retain the one-day cache until they are migrated.

## Animation contracts

There are deliberately two different mechanisms.

### Review queue

`capture_animation_density_review.mjs` identifies unusually dense visuals using thresholds intended to produce a small review queue, not mark the whole catalogue as defective. Current signals include high word count, many visible labels, small text, excessive controls and extreme height.

Run the full catalogue on demand:

```bash
node scripts/capture_animation_density_review.mjs
```

### Hard regression gate

`validate_animation_contract.mjs` compares affected pages with a separately built copy of the base commit at desktop and mobile widths. It fails on real regressions such as:

- horizontal overflow;
- >20% text/label growth beyond a small absolute allowance;
- smaller minimum text;
- >15% unexplained shell-height growth;
- large increases in controls;
- changed/new demos using text below 11 px;
- changed/new static demos exposing fullscreen instead of `data-anim-fullscreen="off"`;
- interactions that introduce overflow.

Because the comparison uses the actual base build, historical dense visuals are not made permanently red. Only new regressions are blocked.

## Animation authoring standard

Use a static infographic when the reader does not need to change a variable or state. Use interaction for causality, comparison or progressive disclosure.

For interactive visuals:

- one visual thesis per state;
- one dominant diagram per state;
- reveal detail progressively rather than showing all evidence simultaneously;
- keep visible copy readable at article width and mobile width;
- disable fullscreen when enlargement adds no analytical value;
- support `prefers-reduced-motion`;
- keep the article narrative outside the animation so the visual is not forced to carry every caveat.

## P0 compact-video replacement

The eight compact videos introduced on 2026-08-09 remain permanent release canaries:

1. `series/ia-pib-bienestar-energia/04-ia-pib-hoy`
2. `series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica`
3. `series/ia-pib-bienestar-energia/03-pib-vs-bienestar`
4. `series/multimodalidad-iag/02-alineamiento`
5. `series/multimodalidad-iag/03-arquitecturas`
6. `series/multimodalidad-iag/05-riesgos`
7. `series/datacenters-espacio/02-energia-calor-conectividad`
8. `series/datacenters-espacio/04-huella-real-datacenter`

When any public MP4 changes, CI still extracts representative frames at 8%, 34%, 62% and 88% of its duration.
