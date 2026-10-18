#!/usr/bin/env python3
"""Build the finite analytics identifier vocabulary from public source files.

This reads filenames and static HTML attributes only, never a browser input value.
The same vocabulary is bundled into the Worker and loaded before measurement.js.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

TOKEN = re.compile(r"[A-Za-z0-9_.:-]{1,100}\Z")
ATTRIBUTE = re.compile(r'''\b(data-field|data-s5-tool|data-s5-video-id)\s*=\s*(["'])(.*?)\2''')
VIDEO = re.compile(r"<video\b[^>]*>", re.IGNORECASE)
VIDEO_ID = re.compile(r'''\bid\s*=\s*(["'])(.*?)\1''')


def route(relative: Path, prefix: str) -> str:
    name = relative.with_suffix("").as_posix()
    if name == "index":
        name = ""
    elif name.endswith("/index"):
        name = name[:-6]
    return prefix + (name + "/" if name else "")


def build(source_root: Path) -> dict:
    paths, fields, tool_ids, video_ids = set(), set(), set(), set()
    texts: dict[str, str] = {}
    # Sparse Worker checkouts need only tracked media *names*, not video bytes.
    tracked = subprocess.run(["git", "-C", str(source_root), "ls-files", "-z", "--", "docs", "locales/en"], capture_output=True, check=False)
    if tracked.returncode == 0:
        for raw in tracked.stdout.decode("utf-8").split("\0"):
            relative = Path(raw)
            if relative.suffix.lower() not in {".mp4", ".webm"} or not TOKEN.fullmatch(relative.name):
                continue
            video_ids.add(relative.name)
            prefix, directory = ("/en/", "locales/en") if raw.startswith("locales/en/") else ("/", "docs")
            if relative.suffix.lower() == ".mp4":
                paths.add(prefix + "videos/" + relative.relative_to(directory).with_suffix("").as_posix() + "/")
    for directory, prefix in ((source_root / "docs", "/"), (source_root / "locales/en", "/en/")):
        if not directory.is_dir():
            raise ValueError(f"Missing source directory: {directory}")
        for file in sorted(directory.rglob("*")):
            if not file.is_file():
                continue
            if file.suffix.lower() in {".mp4", ".webm"} and TOKEN.fullmatch(file.name):
                video_ids.add(file.name)
                if file.suffix.lower() == ".mp4":
                    # video_embed._watch_url derives watch pages from this exact
                    # static media path (generated pages have no Markdown file).
                    paths.add(prefix + "videos/" + file.relative_to(directory).with_suffix("").as_posix() + "/")
            if file.suffix.lower() not in {".md", ".html"}:
                continue
            text = file.read_text(encoding="utf-8")
            if file.suffix == ".md" and not any(part in {"includes", "snippets"} for part in file.relative_to(directory).parts):
                path = route(file.relative_to(directory), prefix)
                paths.add(path)
                texts[path] = text
                dom_token = re.sub(r"[^a-z0-9]+", "-", file.relative_to(directory).as_posix().lower()).strip("-")
                video_ids.add("s5-video-" + dom_token)
            for attribute, _, value in ATTRIBUTE.findall(text):
                if TOKEN.fullmatch(value):
                    {"data-field": fields, "data-s5-tool": tool_ids, "data-s5-video-id": video_ids}[attribute].add(value)
            for video in VIDEO.findall(text):
                match = VIDEO_ID.search(video)
                if match and TOKEN.fullmatch(match[2]):
                    video_ids.add(match[2])

    manifest = json.loads((source_root / "docs/agent-tools.json").read_text(encoding="utf-8"))
    tool_paths, tool_fields = {}, {}
    for tool in manifest["tools"]:
        identifier = tool["id"]
        if not TOKEN.fullmatch(identifier):
            raise ValueError("Invalid static tool id")
        tool_ids.add(identifier)
        named_fields = set()
        for path in tool["paths"].values():
            if path not in texts:
                raise ValueError(f"Tool source missing for {path}")
            tool_paths[path] = identifier
            for attribute, _, value in ATTRIBUTE.findall(texts[path]):
                if attribute == "data-field" and TOKEN.fullmatch(value):
                    named_fields.add(value)
        tool_fields[identifier] = sorted(named_fields)

    return {
        "schema_version": 1,
        "paths": sorted(paths),
        "tool_ids": sorted(tool_ids),
        "fields": sorted(fields),
        "video_ids": sorted(video_ids),
        "tool_paths": dict(sorted(tool_paths.items())),
        "tool_fields": dict(sorted(tool_fields.items())),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    root = Path(__file__).resolve().parents[1]
    parser.add_argument("--source-root", type=Path, default=root)
    parser.add_argument("--output-root", type=Path, default=root)
    args = parser.parse_args()
    catalog = build(args.source_root)
    serialized = json.dumps(catalog, ensure_ascii=True, separators=(",", ":"), sort_keys=True)
    outputs = {
        "mcp-worker/src/measurement-catalog.json": serialized + "\n",
        "docs/assets/javascripts/measurement-catalog.js": (
            "// Generated by scripts/build_measurement_catalog.py; public identifiers only.\n"
            "window.__S5_MEASUREMENT_CATALOG__ = Object.freeze(" + serialized + ");\n"
        ),
    }
    for relative, content in outputs.items():
        target = args.output_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    print(f"Measurement vocabulary: {len(catalog['paths'])} paths, {len(catalog['tool_ids'])} tools")


if __name__ == "__main__":
    main()
