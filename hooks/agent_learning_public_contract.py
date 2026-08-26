"""Enforce the public-only contract for generated semantic learning paths.

The semantic generator may use internal source identifiers while building. This final
post-build boundary strips them before deployment and fails if repository metadata or
GitHub-family hosts reach the public JSON. It also verifies that the same crawlable
links materially increase related-item coverage in the public knowledge graph.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


_PRIVATE_KEYS = {
    "src_key",
    "src_uri",
    "source_path",
    "repository",
    "repository_url",
    "repo",
    "branch",
    "commit",
    "commit_sha",
}
_FORBIDDEN_HOST_SUFFIXES = (
    "github.com",
    "githubusercontent.com",
    "github.io",
    "githubassets.com",
)
_PAGE_KINDS = {
    "home",
    "concept",
    "concept-hub",
    "engineering",
    "engineering-hub",
    "meta",
    "page",
    "series",
    "series-chapter",
    "series-hub",
    "tool",
    "tool-hub",
    "video-hub",
    "video-page",
    "visual-hub",
}


def _forbidden_url(value: str) -> bool:
    try:
        host = (urlsplit(str(value or "")).hostname or "").lower().rstrip(".")
    except ValueError:
        return False
    return any(host == suffix or host.endswith(f".{suffix}") for suffix in _FORBIDDEN_HOST_SUFFIXES)


def _sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, child in value.items():
            if key in _PRIVATE_KEYS:
                continue
            sanitized = _sanitize(child)
            if sanitized is not None:
                cleaned[key] = sanitized
        return cleaned
    if isinstance(value, list):
        return [item for item in (_sanitize(child) for child in value) if item is not None]
    if isinstance(value, str) and _forbidden_url(value):
        return None
    return value


def _assert_public(value: Any, location: str = "learning_paths") -> None:
    if isinstance(value, dict):
        leaked = _PRIVATE_KEYS.intersection(value)
        if leaked:
            raise RuntimeError(f"Public learning paths expose implementation metadata at {location}: {sorted(leaked)}")
        for key, child in value.items():
            _assert_public(child, f"{location}.{key}")
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            _assert_public(child, f"{location}[{index}]")
        return
    if isinstance(value, str) and _forbidden_url(value):
        raise RuntimeError(f"Public learning paths expose a repository host at {location}")


def _assert_graph_relationships(site_dir: Path) -> tuple[int, int]:
    graph_path = site_dir / "agent" / "knowledge.json"
    if not graph_path.is_file():
        raise RuntimeError(f"Knowledge graph missing before semantic coverage validation: {graph_path}")
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    pages = [
        item
        for item in (graph.get("items") or [])
        if isinstance(item, dict) and item.get("kind") in _PAGE_KINDS
    ]
    if len(pages) < 100:
        raise RuntimeError(f"Knowledge graph has too few page-like items for semantic validation: {len(pages)}")
    with_three = sum(1 for item in pages if len(item.get("related_item_ids") or []) >= 3)
    ratio = with_three / len(pages)
    if ratio < 0.90:
        raise RuntimeError(
            "Semantic navigation did not materially increase knowledge-graph relationships: "
            f"only {with_three}/{len(pages)} page-like items have >=3 related IDs"
        )
    return with_three, len(pages)


def on_post_build(config, **kwargs) -> None:
    site_dir = Path(config["site_dir"])
    path = site_dir / "agent" / "learning-paths.json"
    if not path.is_file():
        raise RuntimeError(f"Semantic navigation did not emit {path}")
    payload = _sanitize(json.loads(path.read_text(encoding="utf-8")))
    _assert_public(payload)
    paths = payload.get("paths") or []
    coverage = payload.get("coverage") or {}
    if not isinstance(paths, list) or len(paths) < 100:
        raise RuntimeError(f"Public learning-path graph is unexpectedly small: {len(paths)}")
    if int(coverage.get("pages_with_paths") or 0) != len(paths):
        raise RuntimeError("Not every public semantic page has a learning path")
    recommendations = int(coverage.get("total_internal_recommendations") or 0)
    if recommendations < len(paths) * 3:
        raise RuntimeError("Semantic navigation averages fewer than three internal recommendations per public page")

    with_three, graph_pages = _assert_graph_relationships(site_dir)
    coverage["knowledge_graph_pages_with_3plus_related"] = with_three
    coverage["knowledge_graph_page_count"] = graph_pages
    coverage["knowledge_graph_3plus_related_ratio"] = round(with_three / graph_pages, 4)
    payload["coverage"] = coverage
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
