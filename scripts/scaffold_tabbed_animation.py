#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import argparse
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = {
    "tabs": ROOT / "docs" / "assets" / "templates" / "animation_boilerplate_tabs.html",
    "generic": ROOT / "docs" / "assets" / "templates" / "animation_boilerplate_generic.html",
}
DEFAULT_OUT_DIR = ROOT / "docs" / "snippets" / "animaciones"


def _slug(value: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9_-]", "-", value.strip().lower())
    clean = re.sub(r"-+", "-", clean).strip("-")
    if not clean:
        raise ValueError("--name must contain at least one alphanumeric character")
    return clean


def _load_template(kind: str) -> str:
    template_path = TEMPLATES[kind]
    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_path}")
    return template_path.read_text(encoding="utf-8")


def _write(path: Path, content: str, force: bool) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"{path} already exists (use --force to overwrite)")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _render(template: str, slug: str, title: str) -> str:
    return (
        template
        .replace("Titulo de la animacion", title)
        .replace("Título de la Animación", title)
        .replace("snippets/<path>.html", f"snippets/animaciones/{slug}.html")
    )


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Scaffold a new animation snippet from shared templates.")
    parser.add_argument("--name", required=True, help="Animation name (used for filename and default title).")
    parser.add_argument("--kind", choices=("tabs", "generic"), default="tabs", help="Template kind.")
    parser.add_argument("--title", default=None, help="Optional visible title in the template.")
    parser.add_argument("--output", default=None, help="Optional full output path.")
    parser.add_argument("--force", action="store_true", help="Overwrite file if it already exists.")
    args = parser.parse_args(argv)

    slug = _slug(args.name)
    title = args.title.strip() if args.title else args.name.strip()
    output = Path(args.output).resolve() if args.output else (DEFAULT_OUT_DIR / f"{slug}.html")

    template = _load_template(args.kind)
    content = _render(template, slug, title)
    _write(output, content, args.force)

    print(f"[scaffold-animations] created {output} (kind={args.kind})")
    print("[scaffold-animations] include with:")
    print(f"{{{{ include_html(\"snippets/animaciones/{slug}.html\") }}}}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
