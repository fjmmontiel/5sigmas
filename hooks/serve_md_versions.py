"""
Hook: serve_md_versions.py
GEO optimization: serve clean Markdown versions of articles at {page_url}index.html.md
per the llms.txt spec (https://llmstxt.org/).

This allows AI crawlers to access: https://5sigmas.com/series/foo/01-bar/index.html.md
and get the clean Markdown source without HTML noise.
"""

import shutil
from pathlib import Path


# Files and directories to skip
_SKIP_DIRS = {"includes", "assets", "javascripts", "stylesheets", "snippets", "meta"}
_SKIP_PREFIXES = ("_", "abbreviations")


def on_post_build(config, **kwargs) -> None:
    docs_dir = Path(config["docs_dir"])
    site_dir = Path(config["site_dir"])

    for md_file in docs_dir.rglob("*.md"):
        # Skip files in excluded directories
        parts = md_file.relative_to(docs_dir).parts
        if any(p in _SKIP_DIRS for p in parts):
            continue
        if any(md_file.name.startswith(prefix) for prefix in _SKIP_PREFIXES):
            continue

        rel = md_file.relative_to(docs_dir)

        # Map source .md to site URL path:
        # index.md  -> site/<dir>/index.html.md
        # 01-foo.md -> site/<dir>/01-foo/index.html.md
        if md_file.stem in ("index", "README"):
            target = site_dir / rel.parent / "index.html.md"
        else:
            target = site_dir / rel.parent / md_file.stem / "index.html.md"

        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(md_file, target)
