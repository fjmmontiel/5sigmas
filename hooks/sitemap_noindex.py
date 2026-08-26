"""
Hook: sitemap_noindex.py
Elimina del sitemap.xml generado las páginas que tienen robots=noindex en su front matter.
Complementa a wip_series.py, que ya elimina las series WIP completas.

This hook also delegates to agent_knowledge.py so the machine-readable knowledge graph
is generated for every configured locale without duplicating the hook list between the
Spanish and English MkDocs configurations.
"""

import importlib.util
import os
from pathlib import Path
import re

_noindex_urls: set = set()

_agent_spec = importlib.util.spec_from_file_location(
    "s5_agent_knowledge", Path(__file__).with_name("agent_knowledge.py")
)
if _agent_spec is None or _agent_spec.loader is None:
    raise RuntimeError("Unable to load hooks/agent_knowledge.py")
_agent_knowledge = importlib.util.module_from_spec(_agent_spec)
_agent_spec.loader.exec_module(_agent_knowledge)


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
