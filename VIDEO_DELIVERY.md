# Video delivery for 5sigmas

The public site can serve video in two modes without changing article URLs:

1. **Same-origin fallback:** media stays under `https://5sigmas.com/series/...` and is included in the GitHub Pages artifact.
2. **Production media origin:** the same relative paths are published to Cloudflare R2 and pages use `https://media.5sigmas.com/...`.

The build selects the second mode only when `S5_VIDEO_MEDIA_ORIGIN` is set. Removing that variable and redeploying returns the site to the same-origin fallback.

## Resulting architecture

```text
Article frontmatter
        │
        ├── article embed
        ├── /videos/ library card
        ├── /videos/.../ dedicated watch page
        ├── VideoObject + Clip or SeekToAction
        ├── video-sitemap.xml
        ├── videos/catalog.json
        └── R2 staging manifest

R2 object key
series/modelos-razonadores/03-test-time-compute.mp4

Public URL
https://media.5sigmas.com/series/modelos-razonadores/03-test-time-compute.mp4
```

`hooks/video_sitemap.py`, `hooks/video_embed.py` and `scripts/prepare_video_media.py` deliberately use the same path mapping.

## 1. Create the R2 bucket

Create a Standard R2 bucket, for example `5sigmas-media`. Keep its `r2.dev` URL disabled for production and connect the bucket to the custom domain:

```text
media.5sigmas.com
```

Cloudflare documents custom-domain public buckets at:

- https://developers.cloudflare.com/r2/buckets/public-buckets/
- https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/

A custom domain is required for the normal Cloudflare cache and production controls. The managed `r2.dev` endpoint is intended for development traffic.

## 2. Configure read-only browser CORS

Add this policy under **R2 → bucket → Settings → CORS Policy**:

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

Cloudflare's current CORS reference is:

- https://developers.cloudflare.com/r2/buckets/cors/

The public `<video>` elements use `crossorigin="anonymous"`. This is intentional: the production media domain is a different origin and the same CORS contract must cover MP4 playback, posters and optional WebVTT captions. Do not switch to credentialed browser requests.

After changing CORS on an already-cached custom domain, purge the custom-domain cache so old responses do not retain the previous headers.

## 3. Create restricted S3 credentials

In **R2 → Manage API Tokens**, create an Object Read & Write token restricted to this bucket. Save the generated Access Key ID and Secret Access Key. The S3-compatible endpoint is:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Reference:

- https://developers.cloudflare.com/r2/get-started/s3/

## 4. Configure GitHub

Add these repository secrets:

| Type | Name | Value |
|---|---|---|
| Secret | `R2_ACCESS_KEY_ID` | Bucket-scoped access key |
| Secret | `R2_SECRET_ACCESS_KEY` | Bucket-scoped secret key |
| Secret | `R2_ACCOUNT_ID` | Cloudflare account ID |

Add these repository variables:

| Type | Name | Example |
|---|---|---|
| Variable | `R2_BUCKET_NAME` | `5sigmas-media` |
| Variable | `S5_VIDEO_MEDIA_ORIGIN` | `https://media.5sigmas.com` |

Do not add a trailing slash to `S5_VIDEO_MEDIA_ORIGIN`.

## 5. Validate before publishing

Run locally or in CI:

```bash
python scripts/prepare_video_media.py --check
python scripts/test_video_schema_contract.py
```

The media command validates every **public** article that declares `video`:

- MP4 exists and is non-empty.
- Poster exists and is non-empty.
- Optional captions are WebVTT.
- `video_duration` is ISO 8601.
- No media path escapes `docs/`.
- No two source files collide on one R2 key.
- SHA-256, byte size and MIME type can be recorded deterministically.

The schema contract additionally verifies that:

- `VideoObject.contentUrl` points to the actual media object.
- A watch page is never misrepresented as `embedUrl`.
- Curated chapters publish `Clip` key moments.
- Videos without curated chapters publish `SeekToAction` against the watch-page `?t=` contract.
- Article and watch-page players are compatible with the cross-origin R2 setup.

To inspect the exact upload set:

```bash
python scripts/prepare_video_media.py --output .video-media
cat .video-media/manifest.json
```

## 6. Publish through GitHub Actions

Run **Publish video media to Cloudflare R2** manually.

First use:

```text
publish = false
```

This validates and uploads only the deterministic manifest as a workflow artifact. Then run:

```text
publish = true
```

The workflow:

1. Stages only media explicitly declared by public article frontmatter.
2. Uploads objects without deleting unrelated bucket contents.
3. Applies `Cache-Control: public,max-age=86400`.
4. Publishes the manifest at `manifests/video-manifest.json`.
5. Requests public sample objects with `Range: bytes=0-0`.
6. Requires valid CORS, byte-range playback and cache headers.

The one-day cache is intentional while existing filenames remain mutable. For newly generated media, prefer versioned filenames such as:

```text
03-test-time-compute-v2.mp4
03-test-time-compute-v2.jpg
```

After all published media uses versioned or content-addressed names, change the workflow to:

```text
Cache-Control: public,max-age=31536000,immutable
```

## 7. Activate the media origin in production

Once the publish workflow is green and the custom domain is active, the normal Pages deployment reads `S5_VIDEO_MEDIA_ORIGIN` and emits R2 URLs for:

- Article players.
- Dedicated watch pages.
- `VideoObject.contentUrl`.
- Thumbnails.
- Captions.
- `video-sitemap.xml`.
- `videos/catalog.json`.

Do not use expiring signed URLs for public indexed videos. Search engines and social crawlers need stable fetchable media and thumbnail URLs.

## 8. Authoring metadata

Existing public videos need no frontmatter migration when their MP4 and poster already satisfy the media gate. A fully curated entry can add:

```yaml
video: "03-test-time-compute-v2.mp4"
video_poster: "03-test-time-compute-v2.jpg"
video_duration: "PT1M29S"
video_title: "Test-time compute: más cómputo antes de responder"
video_summary: "Qué cambia cuando un modelo dedica más inferencia a una respuesta."
video_captions: "03-test-time-compute-es.vtt"
video_transcript: "03-test-time-compute-transcript.md"
video_takeaways:
  - "Más cómputo de inferencia puede mejorar la respuesta sin cambiar los pesos."
  - "La mejora se paga en coste y latencia."
  - "La estrategia de búsqueda importa tanto como el presupuesto."
video_chapters:
  - name: "Qué es test-time compute"
    start: 0
    end: 28
  - name: "Calidad, coste y latencia"
    start: 28
    end: 89
```

Without curated takeaways, the generator extracts up to three useful section summaries from the source article. Without curated chapters, the page publishes `SeekToAction` so Google can infer key moments from the same `?t=` watch-page contract. When chapters are curated manually, the generator publishes `Clip` entries instead; it does not advertise both key-moment mechanisms at once.

A series that has videos but does not yet have complete posters or release metadata must remain excluded from the public MkDocs build until that release is ready. Do not add placeholder posters solely to satisfy CI.

## 9. Media preparation standard

Recommended MP4 output:

```bash
ffmpeg -i input.mov \
  -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 160k -ar 48000 \
  output.mp4
```

Use a 16:9 poster, preferably 1280×720 or larger. Review captions manually before declaring the `.vtt` file in frontmatter.

## 10. Rollback

A media-origin rollback does not require URL migrations:

1. Clear or remove the `S5_VIDEO_MEDIA_ORIGIN` repository variable.
2. Redeploy GitHub Pages.
3. The build returns all players, schema and sitemaps to same-origin media paths.

Do not delete R2 objects during the rollback. Existing crawler and cache requests may still reference them temporarily.
