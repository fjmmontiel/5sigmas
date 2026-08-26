"""Enforce the public-only contract for generated semantic learning paths.

The semantic generator may use internal source identifiers while building. This final
post-build boundary strips them before deployment and fails if repository metadata or
GitHub-family hosts reach the public JSON.
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


def on_post_build(config, **kwargs) -> None:
    path = Path(config["site_dir"]) / "agent" / "learning-paths.json"
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
    if int(coverage.get("total_internal_recommendations") or 0) < len(paths) * 3:
        raise RuntimeError("Semantic navigation averages fewer than three internal recommendations per public page")
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
