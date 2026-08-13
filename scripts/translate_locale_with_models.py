#!/usr/bin/env python3
"""Generate draft locale sources with GitHub Models while preserving site structure.

This tool is intentionally unable to publish anything. It writes only under
``locales/<locale>/`` and never edits the locale manifest, MkDocs nav, media
metadata, workflows, or canonical Spanish sources. Promotion remains a separate
review/QA step.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LOCALES = ROOT / "locales"
MODEL_ENDPOINT = "https://models.github.ai/inference/chat/completions"
MODEL = os.environ.get("S5_TRANSLATION_MODEL", "openai/gpt-4.1")
API_VERSION = "2026-03-10"
INCLUDE_RE = re.compile(r'include_html\(\s*["\']([^"\']+)["\']')
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", re.DOTALL)
MEDIA_FRONTMATTER_KEYS = {"video", "video_duration", "video_poster", "video_captions", "audio", "audio_file"}


def model_call(system: str, user: str, max_tokens: int = 32768) -> str:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN is required for GitHub Models inference")
    payload = json.dumps({
        "model": MODEL,
        "temperature": 0.1,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }).encode("utf-8")
    request = urllib.request.Request(
        MODEL_ENDPOINT,
        data=payload,
        method="POST",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": API_VERSION,
            "Content-Type": "application/json",
        },
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                data = json.loads(response.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            if not isinstance(content, str) or not content.strip():
                raise RuntimeError("GitHub Models returned an empty translation")
            return strip_outer_fence(content.strip())
        except urllib.error.HTTPError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or attempt == 4:
                body = exc.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"GitHub Models HTTP {exc.code}: {body[:1000]}") from exc
            time.sleep(2 ** attempt)
        except urllib.error.URLError:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def strip_outer_fence(text: str) -> str:
    match = re.fullmatch(r"```(?:markdown|md|html|yaml)?\s*\n([\s\S]*?)\n```", text)
    return match.group(1) if match else text


def includes(text: str) -> list[str]:
    return INCLUDE_RE.findall(text)


def code_fences(text: str) -> list[str]:
    return re.findall(r"```[^\n]*\n[\s\S]*?```", text)


def markdown_links(text: str) -> list[str]:
    return re.findall(r"\]\(([^)]+)\)", text)


def reference_targets(text: str) -> dict[str, str]:
    return dict(re.findall(r"(?m)^\[([^\]]+)\]:\s+(\S+)", text))


def sanitize_frontmatter_media(text: str) -> str:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return text
    lines = match.group(1).splitlines()
    kept: list[str] = []
    skip_indented = False
    for line in lines:
        if re.match(r"^[A-Za-z0-9_-]+:\s*", line):
            key = line.split(":", 1)[0].strip()
            skip_indented = key in MEDIA_FRONTMATTER_KEYS
            if skip_indented:
                continue
        elif skip_indented and (line.startswith(" ") or line.startswith("\t")):
            continue
        else:
            skip_indented = False
        kept.append(line)
    rest = text[match.end():]
    return "---\n" + "\n".join(kept).rstrip() + "\n---\n\n" + rest.lstrip("\n")


def translate_markdown(source_path: Path, locale: str) -> str:
    source = source_path.read_text(encoding="utf-8")
    system = """You are localizing a technical educational website from Spanish to native professional English.
Translate faithfully; do not summarize, simplify, update facts, add claims, remove sections, redesign structure, or change technical meaning.
Preserve Markdown structure exactly enough for MkDocs: YAML keys, heading levels, admonition syntax, HTML, code fences, equations, tables, reference labels, URLs, relative paths, macros, include_html() calls and file names.
Translate human-facing prose, titles, descriptions, keywords, table prose and accessibility-visible copy. Keep product/model/paper names verbatim unless they have a standard English form.
Do not add video/audio frontmatter. Do not wrap the output in a Markdown code fence. Output only the complete translated file."""
    user = f"Source path: {source_path.relative_to(ROOT).as_posix()}\nTarget locale: {locale}\n\n{source}"
    translated = sanitize_frontmatter_media(model_call(system, user))
    validate_markdown(source_path, source, translated)
    return translated


def validate_markdown(path: Path, source: str, translated: str) -> None:
    errors: list[str] = []
    if includes(source) != includes(translated):
        errors.append("include_html dependency list changed")
    if markdown_links(source) != markdown_links(translated):
        errors.append("inline Markdown link targets changed")
    if reference_targets(source) != reference_targets(translated):
        errors.append("reference link targets changed")
    source_fences = code_fences(source)
    translated_fences = code_fences(translated)
    if len(source_fences) != len(translated_fences):
        errors.append("code fence count changed")
    else:
        for index, (before, after) in enumerate(zip(source_fences, translated_fences), 1):
            if before != after:
                errors.append(f"code fence {index} changed")
    source_headings = [len(m.group(1)) for m in re.finditer(r"(?m)^(#+)\s+", source)]
    translated_headings = [len(m.group(1)) for m in re.finditer(r"(?m)^(#+)\s+", translated)]
    if source_headings != translated_headings:
        errors.append("heading-level sequence changed")
    if errors:
        raise RuntimeError(f"{path}: structural translation validation failed: {'; '.join(errors)}")


def html_signature(text: str) -> dict[str, object]:
    tags = re.findall(r"</?([A-Za-z][A-Za-z0-9:-]*)\b", text)
    classes = sorted(re.findall(r'class=["\']([^"\']+)["\']', text))
    ids = sorted(re.findall(r'id=["\']([^"\']+)["\']', text))
    data_attrs = sorted(re.findall(r"\b(data-[A-Za-z0-9_-]+)=", text))
    css_vars = sorted(set(re.findall(r"--[A-Za-z0-9_-]+", text)))
    return {"tags": tags, "classes": classes, "ids": ids, "data_attrs": data_attrs, "css_vars": css_vars}


def translate_html(source_path: Path, locale: str) -> str:
    source = source_path.read_text(encoding="utf-8")
    system = """You are localizing one self-contained HTML/CSS/JavaScript educational visual from Spanish to native professional English.
Preserve the implementation and visual behavior. Do not redesign, simplify, add/remove elements, rename CSS classes, IDs, data-* attributes, custom properties, selectors, event names, URLs, numeric evidence, SVG geometry, or JavaScript logic.
Translate only human-facing strings: visible text, titles, labels, buttons, legends, explanatory copy, aria-label/title text and human-visible JavaScript string literals.
Keep technical identifiers, model names and paper names unless a standard English phrase exists. Do not add external dependencies. Do not wrap the output in a code fence. Output only the complete localized HTML file."""
    user = f"Source path: {source_path.relative_to(ROOT).as_posix()}\nTarget locale: {locale}\n\n{source}"
    translated = model_call(system, user)
    if html_signature(source) != html_signature(translated):
        raise RuntimeError(f"{source_path}: HTML implementation signature changed during translation")
    return translated


def resolve_series_files(series: str) -> tuple[list[Path], list[Path]]:
    base = DOCS / "series" / series
    if not base.is_dir():
        raise SystemExit(f"Unknown canonical series: {base}")
    pages = sorted(base.glob("*.md"))
    deps: set[Path] = set()
    for page in pages:
        for rel in includes(page.read_text(encoding="utf-8")):
            candidate = DOCS / rel
            if not candidate.is_file():
                raise SystemExit(f"Missing canonical snippet referenced by {page}: {candidate}")
            deps.add(candidate)
    return pages, sorted(deps)


def output_path(source_path: Path, locale: str) -> Path:
    return LOCALES / locale / source_path.relative_to(DOCS)


def translate_one(path: Path, locale: str, overwrite: bool) -> bool:
    target = output_path(path, locale)
    if target.exists() and not overwrite:
        print(f"skip existing {target.relative_to(ROOT)}")
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    print(f"translate {path.relative_to(ROOT)} -> {target.relative_to(ROOT)}", flush=True)
    if path.suffix.lower() == ".md":
        value = translate_markdown(path, locale)
    elif path.suffix.lower() == ".html":
        value = translate_html(path, locale)
    else:
        raise RuntimeError(f"Unsupported translation type: {path}")
    target.write_text(value.rstrip() + "\n", encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", default="en")
    parser.add_argument("--series", required=True)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--pages-only", action="store_true")
    parser.add_argument("--snippets-only", action="store_true")
    args = parser.parse_args()
    if args.pages_only and args.snippets_only:
        raise SystemExit("Choose at most one of --pages-only/--snippets-only")

    pages, snippets = resolve_series_files(args.series)
    targets: list[Path] = []
    if not args.snippets_only:
        targets.extend(pages)
    if not args.pages_only:
        targets.extend(snippets)

    changed = 0
    for path in targets:
        changed += int(translate_one(path, args.locale, args.overwrite))
    print(f"Generated {changed} draft locale files for series/{args.series}. No publication metadata was changed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"translation failed: {exc}", file=sys.stderr)
        raise
