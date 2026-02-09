#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import argparse
import sys

LIBRARY = Path("library")
SOURCES = LIBRARY / "sources"
ANIM_COMPONENTS = LIBRARY / "components" / "animations"
BASE_FILES = {
    "all_animations": SOURCES / "all_animations.html",
    "all_animations_extended": SOURCES / "all_animations_extended.html",
    "nn": SOURCES / "all_animations.html",
    "ml": SOURCES / "all_animations_extended.html",
}

ROOT_SNIPPETS = {
    "ia_ml_dl": "ia_ml_dl.html",
    "tipos_aprendizaje": "tipos_aprendizaje.html",
}


def _log(msg: str) -> None:
    print(f"[scaffold-animations] {msg}")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _write_if_changed(path: Path, content: str, force: bool) -> bool:
    if path.exists() and not force:
        raise FileExistsError(f"{path} already exists (use --force to overwrite)")
    if path.exists() and _read(path) == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def _split_sections(content: str, label: str):
    style_start = content.find("<style>")
    if style_start == -1:
        raise ValueError(f"{label}: missing <style> tag")
    style_end = content.find("</style>", style_start)
    if style_end == -1:
        raise ValueError(f"{label}: missing </style> tag")

    script_start = content.find("<script>", style_end)
    if script_start == -1:
        raise ValueError(f"{label}: missing <script> tag")
    script_end = content.find("</script>", script_start)
    if script_end == -1:
        raise ValueError(f"{label}: missing </script> tag")

    markup = content[:style_start].rstrip() + "\n"
    style = content[style_start : style_end + len("</style>")].strip() + "\n"
    script = content[script_start : script_end + len("</script>")].strip() + "\n"

    tail = content[script_end + len("</script>") :].strip()
    if tail:
        raise ValueError(f"{label}: unexpected content after </script>")

    return markup, style, script


def transform_content(content: str, base_prefix: str, base_ns: str, new_prefix: str, new_ns: str) -> str:
    updated = content
    updated = updated.replace(f"{base_prefix}-", f"{new_prefix}-")
    updated = updated.replace(f"{base_ns}:", f"{new_ns}:")
    updated = updated.replace(f'registerNamespace("{base_ns}"', f'registerNamespace("{new_ns}"')
    updated = updated.replace(f"registerNamespace('{base_ns}'", f"registerNamespace('{new_ns}'")
    return updated


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Scaffold a new tabbed animation HTML from base templates.")
    parser.add_argument("--name", required=True, help="Name for the new animation set (used for file/component names).")
    parser.add_argument(
        "--base",
        choices=("all_animations", "all_animations_extended", "nn", "ml"),
        default="all_animations",
        help="Base template to copy from.",
    )
    parser.add_argument("--namespace", default=None, help="Namespace for data-demo (default: --name).")
    parser.add_argument("--prefix", default=None, help="CSS class prefix (default: --name).")
    parser.add_argument("--force", action="store_true", help="Overwrite files if they already exist.")
    parser.add_argument("--sync-components", action="store_true", help="Generate components/<name>/ from the scaffolded HTML.")
    args = parser.parse_args(argv)

    name = args.name.strip()
    if not name:
        raise ValueError("--name cannot be empty")

    namespace = (args.namespace or name).strip()
    prefix = (args.prefix or name).strip()

    base_path = BASE_FILES[args.base]
    if args.base in ("all_animations", "nn"):
        base_prefix = "nn"
        base_ns = "nn"
    else:
        base_prefix = "ml"
        base_ns = "ml"

    content = _read(base_path)
    updated = transform_content(content, base_prefix, base_ns, prefix, namespace)

    dest_path = SOURCES / f"{name}.html"
    wrote = _write_if_changed(dest_path, updated, args.force)
    if wrote:
        _log(f"created {dest_path}")
    else:
        _log(f"no changes for {dest_path}")

    if args.sync_components:
        markup, style, script = _split_sections(updated, name)
        comp_dir = ANIM_COMPONENTS / name
        wrote_any = False
        wrote_any |= _write_if_changed(comp_dir / "markup.html", markup, args.force)
        wrote_any |= _write_if_changed(comp_dir / "style.html", style, args.force)
        wrote_any |= _write_if_changed(comp_dir / "script.html", script, args.force)
        if wrote_any:
            _log(f"wrote components to {comp_dir}")
        else:
            _log(f"components already up to date in {comp_dir}")

    print("\nOutput path after compose:\n")
    root_snippet = ROOT_SNIPPETS.get(name)
    if root_snippet:
        print(f"  docs/snippets/{root_snippet}")
    else:
        print(f"  docs/snippets/animaciones/{name}.html")
    print("\nNo manual registry update is needed; compose auto-discovers animations.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
