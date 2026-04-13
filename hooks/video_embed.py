"""
hooks/video_embed.py — MkDocs hook

Injects a <video> embed and VideoObject JSON-LD on pages that declare:

    video: "01-representar.mp4"

in their frontmatter. Both the .mp4 and the poster (.jpg, same base name)
must live alongside the .md file — they'll be copied to the site by MkDocs.

Optional frontmatter fields:
    video_duration: "PT4M20S"   ISO 8601, used in VideoObject (omitted if missing)

The video title and description are taken from the page's own title/description.
"""

import re

# ── URL helpers ───────────────────────────────────────────────────────────────

def _parent_url(canonical: str) -> str:
    """Return the parent directory URL of the canonical page URL.

    MkDocs pages render as /slug/index.html (use_directory_urls=True), so:
      https://5sigmas.com/series/from-cave-to-agi/01-representar/
      → https://5sigmas.com/series/from-cave-to-agi/
    """
    url = canonical.rstrip("/")
    return url.rsplit("/", 1)[0] + "/"


def _esc(s: str) -> str:
    return str(s).replace('"', '\\"').replace("\n", " ").strip()


# ── Hook ──────────────────────────────────────────────────────────────────────

def on_post_page(output: str, page, config, **kwargs) -> str:
    video_file = (page.meta or {}).get("video")
    if not video_file:
        return output

    # Derive poster filename from mp4 basename
    base        = video_file.rsplit(".", 1)[0]   # "01-representar"
    poster_file = base + ".jpg"

    # Relative paths used inside <video> — one level up from the slug/ directory
    rel_video  = f"../{video_file}"
    rel_poster = f"../{poster_file}"

    # Absolute paths for VideoObject (Google requires absolute contentUrl)
    canonical  = page.canonical_url or ""
    parent     = _parent_url(canonical) if canonical else ""
    abs_video  = parent + video_file  if parent else ""
    abs_poster = parent + poster_file if parent else ""

    # Metadata from page frontmatter / config
    meta        = page.meta or {}
    title       = _esc(meta.get("video_title") or page.title or "")
    description = _esc(meta.get("description") or "")
    date        = str(meta.get("date") or "")
    duration    = str(meta.get("video_duration") or "")
    site_url    = (config.site_url or "").rstrip("/")

    # ── VideoObject JSON-LD ───────────────────────────────────────────────────
    opt_fields = ""
    if date:
        opt_fields += f'\n    "uploadDate": "{date}",'
    if duration:
        opt_fields += f'\n    "duration": "{duration}",'

    jsonld = (
        '<script type="application/ld+json">\n'
        "{\n"
        '  "@context": "https://schema.org",\n'
        '  "@type": "VideoObject",\n'
        f'  "name": "{title}",\n'
        f'  "description": "{description}",\n'
        f'  "thumbnailUrl": "{abs_poster}",\n'
        f'  "contentUrl": "{abs_video}",\n'
        f'  "embedUrl": "{canonical}",'
        f"{opt_fields}\n"
        '  "inLanguage": "es",\n'
        '  "author": {\n'
        '    "@type": "Person",\n'
        '    "name": "Francisco Maldonado",\n'
        f'    "url": "{site_url}/meta/about/"\n'
        "  },\n"
        '  "publisher": {\n'
        '    "@type": "Organization",\n'
        '    "name": "5sigmas",\n'
        f'    "url": "{site_url}/"\n'
        "  }\n"
        "}\n"
        "</script>"
    )

    # ── <video> embed ─────────────────────────────────────────────────────────
    video_html = (
        '<div class="s5-video-embed">\n'
        "  <video\n"
        "    controls\n"
        '    controlsList="nodownload"\n'
        '    oncontextmenu="return false"\n'
        '    preload="none"\n'
        f'    poster="{rel_poster}"\n'
        "    playsinline\n"
        f'    aria-label="{title}"\n'
        "  >\n"
        f'    <source src="{rel_video}" type="video/mp4">\n'
        "  </video>\n"
        "</div>"
    )

    # Inject video after the first </h1> in the page
    output = re.sub(r"(</h1>)", r"\1\n" + video_html, output, count=1)

    # Inject VideoObject JSON-LD into <head>
    output = output.replace("</head>", jsonld + "\n</head>", 1)

    return output
