"""
Hook: sitemap_noindex.py
Elimina del sitemap.xml generado las páginas que tienen robots=noindex en su front matter.
Complementa a wip_series.py, que ya elimina las series WIP completas.
"""

import os
import re

_noindex_urls: set = set()


def on_config(config, **kwargs):
    _noindex_urls.clear()
    return config


def on_page_context(context, page, config, nav, **kwargs):
    robots = (page.meta or {}).get("robots", "")
    if "noindex" in robots:
        _noindex_urls.add(page.canonical_url)
    return context


def on_post_build(config, **kwargs):
    sitemap_path = os.path.join(config["site_dir"], "sitemap.xml")
    if not os.path.exists(sitemap_path) or not _noindex_urls:
        return

    with open(sitemap_path, encoding="utf-8") as f:
        content = f.read()

    for url in _noindex_urls:
        escaped = re.escape(url)
        block_re = re.compile(
            r"\s*<url>\s*<loc>" + escaped + r"</loc>.*?</url>",
            re.DOTALL,
        )
        content = block_re.sub("", content)

    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write(content)
