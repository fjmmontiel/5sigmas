# Video delivery for 5sigmas

5sigmas supports two delivery modes without changing article routes:

1. **Same-origin fallback** — media is included in the GitHub Pages artifact and served below `https://5sigmas.com/series/...`.
2. **Production media origin** — declared media is published to Cloudflare R2 and generated pages use `S5_VIDEO_MEDIA_ORIGIN` (normally `https://media.5sigmas.com`).

If `S5_VIDEO_MEDIA_ORIGIN` is empty, the release remains fully functional in same-origin mode.

## Release order

Media publication is part of the production release graph, not an independent best-effort step:

```text
PR / push
   ↓
reusable visual + media QA
   ↓
publish changed R2 objects (when configured)
   ↓
verify remote SHA-256 + byte length + public Range/CORS
   ↓
build Pages with the selected media origin
   ↓
stamp /build.json with exact Git SHA
   ↓
deploy Pages
   ↓
wait until production exposes that SHA
   ↓
production browser smoke + review artifact
```

The manual **Publish video media to Cloudflare R2** workflow remains available for operational recovery or a deliberate full-catalogue republish. Normal `main` releases invoke the same workflow automatically.

## Source of truth

Article frontmatter remains the single declaration point:

```yaml
video: "03-test-time-compute-v2.mp4"
video_poster: "03-test-time-compute-v2.jpg"
video_duration: "PT1M29S"
video_title: "Test-time compute: más cómputo antes de responder"
video_summary: "Qué cambia cuando un modelo dedica más inferencia a una respuesta."
video_captions: "03-test-time-compute-es.vtt"
```

`hooks/video_sitemap.py`, `hooks/video_embed.py` and `scripts/prepare_video_media.py` share the same `docs/`-relative object mapping. The declaration drives:

- the article embed;
- `/videos/` cards;
- dedicated watch pages;
- `VideoObject` structured data;
- `video-sitemap.xml`;
- `videos/catalog.json`;
- the deterministic R2 manifest.

## R2 configuration

Create a Standard R2 bucket and attach a production custom domain such as:

```text
media.5sigmas.com
```

Keep the development `r2.dev` endpoint disabled for production traffic.

Repository secrets:

```text
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ACCOUNT_ID
```

Repository variables:

```text
R2_BUCKET_NAME
S5_VIDEO_MEDIA_ORIGIN=https://media.5sigmas.com
```

Do not include a trailing slash in `S5_VIDEO_MEDIA_ORIGIN`.

### Browser CORS

The public player uses anonymous cross-origin requests. R2 must allow read-only browser access from 5sigmas and expose Range metadata:

```json
[
  {
    "AllowedOrigins": ["https://5sigmas.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "If-Range"],
    "ExposeHeaders": [
      "Accept-Ranges",
      "Cache-Control",
      "Content-Length",
      "Content-Range",
      "ETag"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

After changing CORS on an already cached custom domain, purge the custom-domain cache.

## Deterministic media manifest

Run locally:

```bash
python scripts/prepare_video_media.py --check
python scripts/test_video_schema_contract.py
python scripts/prepare_video_media.py --output .video-media
```

The generated manifest records each declared object's:

- R2 key;
- source path;
- media kind;
- byte length;
- SHA-256;
- MIME type.

The release workflow selects only source files changed relative to the previous release SHA. Each selected R2 object is uploaded with its SHA-256 in object metadata and is then verified with `head-object` for exact SHA-256 and exact `ContentLength`.

Public verification subsequently checks:

- stable HTTPS URL;
- CORS origin;
- byte-range playback for MP4;
- `Content-Range` total size against the manifest;
- cache metadata.

This means a successful release proves object identity rather than merely proving that a URL returns HTTP 200.

## Cache-safe filenames

Already-published legacy files may keep their current names while unchanged. **Once declared public video media changes, its filename must be versioned or content-addressed.** CI enforces this rule.

Accepted forms include:

```text
03-test-time-compute-v2.mp4
03-test-time-compute-a1b2c3d4.mp4
03-test-time-compute-v2.jpg
```

Versioned/content-addressed objects are published with:

```text
Cache-Control: public,max-age=31536000,immutable
```

Unchanged legacy objects retain:

```text
Cache-Control: public,max-age=86400
```

Do not overwrite a versioned object with different bytes. Create the next version instead.

## Media preparation standard

Recommended MP4 encoding:

```bash
ffmpeg -i input.mov \
  -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 160k -ar 48000 \
  output-v2.mp4
```

Use a 16:9 poster, preferably 1280×720 or larger. Review captions manually before declaring a `.vtt` file.

## Production proof

The Pages artifact contains:

```text
/build.json
```

with the exact Git SHA used to build it. The post-deploy job waits until `https://5sigmas.com/build.json` reports the current release SHA before running browser QA against production.

The production smoke verifies:

- all eight compact P0 article/watch video routes;
- poster visible before Play;
- player hidden before Play and playing after interaction;
- stable geometry before/after Play;
- Range delivery;
- desktop/mobile overflow and sizing;
- the six rebuilt Agentes JPEG posters by both binary magic and browser decode;
- changed animation contracts and responsive layouts.

It uploads `5sigmas-production-review`, including a self-contained `5sigmas.html` reviewer.

## Rollback

A media-origin rollback does not require article URL migration:

1. clear `S5_VIDEO_MEDIA_ORIGIN`;
2. redeploy `main`;
3. the build returns players, schema, sitemaps and catalog entries to same-origin paths.

Do not delete R2 objects during rollback. Existing crawler or edge requests may still reference them temporarily.
