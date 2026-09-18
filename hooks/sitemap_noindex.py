"""
Hook: sitemap_noindex.py
Elimina del sitemap.xml generado las páginas que tienen robots=noindex en su front matter.
Complementa a wip_series.py, que ya elimina las series WIP completas.

This hook also delegates to agent_knowledge.py so the machine-readable knowledge graph
is generated for every configured locale without duplicating the hook list between the
Spanish and English MkDocs configurations. MkDocs replaces inherited hook lists, so the
English build also delegates the shared article Open Graph metadata hook here; Spanish
already runs that hook directly from mkdocs.yml.
"""

import importlib.util
import os
from pathlib import Path
import re

_noindex_urls: set = set()


def _load_hook(module_name: str):
    path = Path(__file__).with_name(f"{module_name}.py")
    spec = importlib.util.spec_from_file_location(f"s5_{module_name}", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_agent_knowledge = _load_hook("agent_knowledge")
_article_metadata = _load_hook("jsonld_article")


def _content_language(config) -> str:
    extra = config.get("extra") or {}
    configured = str(extra.get("content_language") or extra.get("locale_code") or "").strip().lower()
    if configured:
        return configured
    site_url = str(config.get("site_url") or "")
    return "en" if "/en/" in site_url else "es"


def on_config(config, **kwargs):
    _noindex_urls.clear()
    _agent_knowledge.on_config(config, **kwargs)
    return config


def on_page_context(context, page, config, nav, **kwargs):
    robots = (page.meta or {}).get("robots", "")
    if "noindex" in robots:
        _noindex_urls.add(page.canonical_url)
    return context


def on_post_page(output, page, config, **kwargs):
    if _content_language(config).startswith("en"):
        output = _article_metadata.on_post_page(output, page, config, **kwargs)
    return _agent_knowledge.on_post_page(output, page, config, **kwargs)


def on_post_build(config, **kwargs):
    sitemap_path = os.path.join(config["site_dir"], "sitemap.xml")
    if os.path.exists(sitemap_path) and _noindex_urls:
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

    _agent_knowledge.on_post_build(config, **kwargs)
