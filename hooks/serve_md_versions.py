"""Serve clean Markdown mirrors next to pages that were actually built.

Each public MkDocs page gets a sibling ending in ``index.html.md``. The
existence check against the generated HTML is deliberate: source files excluded
from the public build must never become reachable only through the Markdown
mirror layer.
"""

from pathlib import Path
import shutil


_SKIP_DIRS = {"includes", "assets", "javascripts", "stylesheets", "snippets"}
_SKIP_PREFIXES = ("_", "abbreviations")


def _html_target(source: Path, docs_dir: Path, site_dir: Path, use_directory_urls: bool) -> Path:
    relative = source.relative_to(docs_dir)
    if source.stem in {"index", "README"}:
        return site_dir / relative.parent / "index.html"
    if use_directory_urls:
        return site_dir / relative.parent / source.stem / "index.html"
    return site_dir / relative.parent / f"{source.stem}.html"


def on_post_build(config, **kwargs) -> None:
    docs_dir = Path(config["docs_dir"])
    site_dir = Path(config["site_dir"])
    use_directory_urls = bool(config.get("use_directory_urls", True))

    for source in docs_dir.rglob("*.md"):
        parts = source.relative_to(docs_dir).parts
        if any(part in _SKIP_DIRS for part in parts):
            continue
        if any(source.name.startswith(prefix) for prefix in _SKIP_PREFIXES):
            continue

        html_target = _html_target(source, docs_dir, site_dir, use_directory_urls)
        if not html_target.is_file():
            continue

        markdown_target = Path(f"{html_target}.md")
        markdown_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, markdown_target)
