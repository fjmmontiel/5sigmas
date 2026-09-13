#!/usr/bin/env python3
"""Independent coverage/render audit; NEVER an automatic GOLDEN certificate.

The baseline is a scope floor, not a discovery filter. Navigation and on-disk
chapters are reconciled with it, so deleting a presentation, video declaration,
or navigation entry cannot silently make a published lesson disappear.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import yaml


class InertLoader(yaml.SafeLoader):
    """Read MkDocs custom tags as data, never execute Python YAML tags."""


def _unknown_tag(loader: InertLoader, node: yaml.Node) -> Any:
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    return loader.construct_mapping(node)


InertLoader.add_constructor(None, _unknown_tag)
TEX = re.compile(r"\\(?:frac|text|tau|pi|Delta|sum|prod|begin|end|lambda|mathbb|mathrm|mathbf|subseteq|land|min|max|mid|theta|sigma|alpha|beta)\b|\\[\[\]]|\$\$")
INCLUDE = re.compile(r'include_html\(\s*[\"\x27]([^\"\x27]+)[\"\x27]')
RAW_SNIPPET = re.compile(r'include_html\(|<\s*(?:section|svg|style)\b[^\n]*(?:s5v|anim-|viewBox|data-anim)', re.I)


def load_yaml(path: Path) -> dict:
    data = yaml.load(path.read_text(encoding="utf-8"), Loader=InertLoader)
    if not isinstance(data, dict):
        raise ValueError(f"Expected YAML mapping: {path}")
    return data


def nav_paths(node: Any) -> list[str]:
    if isinstance(node, str):
        return [node] if node.startswith("series/") and node.endswith(".md") else []
    children = node.values() if isinstance(node, dict) else node if isinstance(node, list) else []
    return [path for child in children for path in nav_paths(child)]


def metadata(text: str) -> tuple[dict, str]:
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.S)
    if not match:
        return {}, text
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        raise ValueError("Article frontmatter must be a mapping")
    return data, text[match.end():]


def strip_code(text: str) -> str:
    text = re.sub(r"(?ms)^(`{3,}|~{3,})[^\n]*\n.*?^\1\s*$", "", text)
    return re.sub(r"`+[^`\n]*`+", "", text)


def discover(root: Path, scope: dict, configs: dict, published_en: set[str]) -> tuple[list[str], list[dict]]:
    findings: list[dict] = []
    targets = scope["series"]
    if not isinstance(targets, dict) or not targets or any(not names for names in targets.values()):
        raise ValueError("Scope must contain nonempty series and baseline paths")
    es_nav = nav_paths(configs["es"].get("nav", []))
    order = list(dict.fromkeys(p.split("/")[1] for p in es_nav if len(p.split("/")) > 2))
    cutoff = scope["excluded_through"]
    if cutoff not in order:
        findings.append({"code": "CUTOFF_MISSING", "detail": cutoff})
    elif order[order.index(cutoff) + 1:] != list(targets):
        findings.append({"code": "SCOPE_NAV_DRIFT", "detail": order[order.index(cutoff) + 1:]})
    baseline = [f"series/{slug}/{name}" for slug, names in targets.items() for name in names]
    discovered = list(baseline)
    for locale in ("es", "en"):
        for p in nav_paths(configs[locale].get("nav", [])):
            if p.split("/")[1] in targets:
                discovered.append(p)
    for p in sorted(published_en):
        if p.startswith("series/") and len(p.split("/")) > 2 and p.split("/")[1] in targets:
            discovered.append(p)
    for source_root in (root / "docs", root / "locales/en"):
        for slug in targets:
            for p in sorted((source_root / "series" / slug).glob("*.md")):
                discovered.append(p.relative_to(source_root).as_posix())
    return list(dict.fromkeys(discovered)), findings


class ArticleHTML(HTMLParser):
    """Extract actual article text while distinguishing code from prose."""
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.article_depth = 0
        self.prose: list[str] = []
        self.code: list[str] = []
        self.videos = 0
        self.math = 0
        self.lang = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        if tag == "html":
            self.lang = attr.get("lang") or ""
        if tag == "article":
            self.article_depth += 1
        if not self.article_depth:
            return
        if tag == "video":
            self.videos += 1
        if tag == "math":
            self.math += 1
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in self.stack:
            i = len(self.stack) - 1 - self.stack[::-1].index(tag)
            self.stack = self.stack[:i]
        if tag == "article":
            self.article_depth = max(0, self.article_depth - 1)

    def handle_data(self, data: str) -> None:
        if not self.article_depth or any(t in self.stack for t in ("script", "style", "math", "annotation")):
            return
        (self.code if any(t in self.stack for t in ("pre", "code")) else self.prose).append(data)


def rendered_findings(html: str, locale: str) -> tuple[list[dict], dict]:
    parsed = ArticleHTML()
    parsed.feed(html)
    text = " ".join(parsed.prose)
    findings: list[dict] = []
    if not parsed.prose:
        findings.append({"code": "ARTICLE_BODY_MISSING"})
    if not parsed.lang.lower().startswith(locale):
        findings.append({"code": "WRONG_HTML_LOCALE", "detail": parsed.lang})
    matches = TEX.findall(text)
    if matches:
        findings.append({"code": "RAW_TEX_RENDERED", "detail": dict(Counter(matches))})
    if RAW_SNIPPET.search(text) or RAW_SNIPPET.search(" ".join(parsed.code)):
        findings.append({"code": "SNIPPET_OR_MACRO_RENDERED_AS_TEXT"})
    if not parsed.videos:
        findings.append({"code": "VIDEO_NOT_RENDERED"})
    return findings, {"video_elements": parsed.videos, "native_math_elements": parsed.math}


def audit(root: Path, scope: dict, site: Path | None = None) -> dict:
    configs = {"es": load_yaml(root / "mkdocs.yml"), "en": load_yaml(root / "mkdocs.en.yml")}
    manifest = load_yaml(root / "locales/en/manifest.yml")
    published_en = set(manifest.get("published_routes", []))
    paths, findings = discover(root, scope, configs, published_en)
    entries: list[dict] = []
    for rel in paths:
        for locale in ("es", "en"):
            source_root = root / ("docs" if locale == "es" else "locales/en")
            source = source_root / rel
            issues: list[dict] = []
            url = "/" + ("en/" if locale == "en" else "") + rel[:-3] + "/"
            entry: dict = {"locale": locale, "source": source.relative_to(root).as_posix(), "route": url, "findings": issues}
            entries.append(entry)
            if rel not in nav_paths(configs[locale].get("nav", [])):
                issues.append({"code": "NAV_ROUTE_MISSING"})
            if locale == "en" and rel not in published_en:
                issues.append({"code": "EN_MANIFEST_ROUTE_MISSING"})
            if not source.is_file():
                issues.append({"code": "LOCALE_SOURCE_MISSING"})
                continue
            content = source.read_text(encoding="utf-8")
            meta, body = metadata(content)
            entry["source_sha256"] = hashlib.sha256(content.encode()).hexdigest()
            entry["sections"] = re.findall(r"(?m)^##\s+(.+)$", body)
            entry["tex_source_markers"] = dict(Counter(TEX.findall(strip_code(body))))
            entry["snippets"] = list(dict.fromkeys(INCLUDE.findall(body)))
            media_path = root / "locales" / locale / "media.yml"
            media = load_yaml(media_path) if media_path.is_file() else {}
            configured = (configs[locale].get("extra") or {}).get("locale_video_pages", {}) or {}
            for data in (configured.get(rel, {}), media.get(rel, {})):
                if isinstance(data, dict):
                    for key, value in data.items():
                        meta.setdefault(key, value)
            entry["video"] = {k: meta[k] for k in ("video", "video_poster", "video_captions", "video_duration") if meta.get(k)}
            if not meta.get("video"):
                issues.append({"code": "VIDEO_DECLARATION_MISSING"})
            for snippet in entry["snippets"]:
                if not (source_root / snippet).is_file():
                    issues.append({"code": "LOCALE_SNIPPET_SOURCE_MISSING", "detail": snippet})
            if site is not None:
                built = site / url.strip("/") / "index.html"
                if not built.is_file():
                    issues.append({"code": "BUILT_ROUTE_MISSING"})
                else:
                    html = built.read_text(encoding="utf-8")
                    errors, counts = rendered_findings(html, locale)
                    issues.extend(errors)
                    entry["rendered"] = counts
                    entry["html_sha256"] = hashlib.sha256(html.encode()).hexdigest()
            entry["pixel_review"] = "PENDING"
            entry["pedagogy_review"] = "PENDING"
            entry["playback_review"] = "PENDING"
    counts = Counter(f["code"] for f in findings)
    counts.update(f["code"] for entry in entries for f in entry["findings"])
    return {
        "schema_version": 1,
        "scope": "post-datacenters-exclusive",
        "status": "TECHNICAL_FAIL" if counts else "TECHNICAL_PASS_ONLY",
        "golden": "NOT_CERTIFIED",
        "rendered_html": "AUDITED" if site else "NOT_RUN",
        "browser": "NOT_RUN",
        "pixel_review": "PENDING",
        "pedagogy_review": "PENDING",
        "summary": {"series": len(scope["series"]), "pages_per_locale": len(paths), "locale_pages": len(entries), "findings": dict(sorted(counts.items()))},
        "findings": findings,
        "pages": entries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--scope", type=Path, default=Path("quality/series-requalification/scope.json"))
    parser.add_argument("--site", type=Path)
    parser.add_argument("--output", type=Path, default=Path("artifacts/series-experience/report.json"))
    args = parser.parse_args()
    root = args.root.resolve()
    scope_path = args.scope if args.scope.is_absolute() else root / args.scope
    try:
        report = audit(root, json.loads(scope_path.read_text()), args.site.resolve() if args.site else None)
    except (OSError, ValueError, yaml.YAMLError) as exc:
        print(f"EXPERIENCE_AUDIT_ERROR: {exc}")
        return 2
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "pages"}, ensure_ascii=False, indent=2))
    for page in report["pages"]:
        codes = sorted({f["code"] for f in page["findings"]})
        if codes:
            print(f"{page['route']}: {', '.join(codes)}")
    return 1 if report["status"] == "TECHNICAL_FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
