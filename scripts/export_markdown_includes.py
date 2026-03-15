import argparse
import json
from pathlib import Path

import export_tabs

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


def _resolve_markdown_path(markdown_path):
    candidate = Path(markdown_path).expanduser()
    if not candidate.is_absolute():
        candidate = (Path.cwd() / candidate).resolve()
    else:
        candidate = candidate.resolve()
    if not candidate.is_file():
        raise ValueError(f"Markdown file not found: {candidate}")
    return candidate


def _markdown_output_dir(output_root, markdown_path):
    output_root = Path(output_root)
    try:
        rel = markdown_path.relative_to(DOCS)
        rel_no_suffix = rel.with_suffix("")
    except ValueError:
        rel_no_suffix = Path(markdown_path.stem)
    target = output_root / rel_no_suffix
    target.mkdir(parents=True, exist_ok=True)
    return target


def _slugify(text):
    raw = "".join(ch.lower() if ch.isalnum() else "_" for ch in text or "")
    return "_".join(part for part in raw.split("_") if part) or "snippet"


def _snippet_export_dir(base_dir, index, snippet_ref):
    basename = Path(snippet_ref).stem
    target = base_dir / f"{index:02d}_{_slugify(basename)}"
    target.mkdir(parents=True, exist_ok=True)
    return target


def _linkedin_export_width(frame_width, frame_padding):
    return max(720, int(frame_width) - int(frame_padding) * 2)


def _parse_ratio(text):
    raw = str(text or "").strip()
    if ":" not in raw:
        raise ValueError(f"Invalid ratio '{text}'. Use W:H, for example 4:5.")
    left, right = raw.split(":", 1)
    width = int(left)
    height = int(right)
    if width <= 0 or height <= 0:
        raise ValueError(f"Invalid ratio '{text}'. Both numbers must be positive.")
    return width, height


def collect_markdown_snippets(markdown_path):
    text = Path(markdown_path).read_text(encoding="utf-8")
    return export_tabs.extract_include_html_refs(text)


def export_markdown_includes(
    markdown_path,
    output_root,
    themes,
    wait_ms=1600,
    export_width=1800,
    linkedin=False,
    linkedin_ratio=(4, 5),
    linkedin_frame_width=1080,
    linkedin_padding=24,
    renderer_bin=None,
):
    markdown_path = _resolve_markdown_path(markdown_path)
    snippets = collect_markdown_snippets(markdown_path)
    if not snippets:
        raise ValueError(f"No include_html(...) snippets found in {markdown_path}")

    output_dir = _markdown_output_dir(output_root, markdown_path)
    manifest = {
        "markdown": str(markdown_path),
        "output_dir": str(output_dir),
        "themes": list(themes),
        "linkedin": bool(linkedin),
        "snippets": [],
    }

    for theme in themes:
        for index, snippet_ref in enumerate(snippets, 1):
            snippet_dir = _snippet_export_dir(output_dir, index, snippet_ref)
            output_path = snippet_dir / f"{theme}.png"
            print(f"[export-md] {index:02d}/{len(snippets)} {theme} -> {snippet_ref}")
            export_tabs.export_primary_png(
                snippet_ref,
                output_path,
                theme=theme,
                wait_ms=wait_ms,
                export_width=export_width,
                renderer_bin=renderer_bin,
            )
            manifest["snippets"].append(
                {
                    "index": index,
                    "snippet": snippet_ref,
                    "theme": theme,
                    "variant": "default",
                    "output": str(output_path),
                }
            )
            if linkedin:
                ratio_w, ratio_h = linkedin_ratio
                linkedin_height = int(round(linkedin_frame_width * ratio_h / ratio_w))
                linkedin_export_width = _linkedin_export_width(linkedin_frame_width, linkedin_padding)
                linkedin_output = snippet_dir / export_tabs.build_variant_filename(theme, "linkedin")
                export_tabs.export_primary_png(
                    snippet_ref,
                    linkedin_output,
                    theme=theme,
                    wait_ms=wait_ms,
                    export_width=linkedin_export_width,
                    frame={
                        "width": linkedin_frame_width,
                        "height": linkedin_height,
                        "padding": linkedin_padding,
                    },
                    renderer_bin=renderer_bin,
                )
                manifest["snippets"].append(
                    {
                        "index": index,
                        "snippet": snippet_ref,
                        "theme": theme,
                        "variant": "linkedin",
                        "output": str(linkedin_output),
                        "ratio": f"{ratio_w}:{ratio_h}",
                    }
                )

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[export-md] done: {markdown_path} -> {output_dir}")
    print(f"[export-md] manifest: {manifest_path}")
    return output_dir


def main_cli():
    parser = argparse.ArgumentParser(description="Export all include_html(...) snippets from a Markdown file to PNG.")
    parser.add_argument("markdown_path", help="Markdown file to scan for include_html(...) snippets.")
    parser.add_argument("--output", "-o", default="output/markdown_exports", help="Output directory root.")
    parser.add_argument(
        "--themes",
        nargs="+",
        choices=["light", "dark"],
        default=["light", "dark"],
        help="Themes to export.",
    )
    parser.add_argument("--wait-ms", type=int, default=1600, help="Extra wait after render before export.")
    parser.add_argument("--export-width", type=int, default=1800, help="Target shell width in CSS pixels.")
    parser.add_argument("--linkedin", action="store_true", help="Also export a fixed-ratio variant for LinkedIn.")
    parser.add_argument("--linkedin-ratio", default="4:5", help="LinkedIn variant ratio as W:H. Default: 4:5.")
    parser.add_argument("--linkedin-frame-width", type=int, default=1080, help="LinkedIn frame width in CSS pixels.")
    parser.add_argument("--linkedin-padding", type=int, default=24, help="Inner padding for the LinkedIn frame.")
    parser.add_argument("--renderer-bin", default=None, help="Path to wkhtmltoimage binary.")
    args = parser.parse_args()
    linkedin_ratio = _parse_ratio(args.linkedin_ratio)
    export_markdown_includes(
        args.markdown_path,
        args.output,
        args.themes,
        wait_ms=args.wait_ms,
        export_width=args.export_width,
        linkedin=args.linkedin,
        linkedin_ratio=linkedin_ratio,
        linkedin_frame_width=args.linkedin_frame_width,
        linkedin_padding=args.linkedin_padding,
        renderer_bin=args.renderer_bin,
    )


if __name__ == "__main__":
    main_cli()
