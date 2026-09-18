#!/usr/bin/env python3
"""Independent coverage/render/media audit; NEVER an automatic GOLDEN certificate.

The baseline is a scope floor, not a discovery filter. Navigation and on-disk
chapters are reconciled with it, so deleting a presentation, video declaration,
or navigation entry cannot silently make a published lesson disappear.

This gate deliberately treats a video *declaration* as weaker evidence than a
complete learning-media contract. A page can only clear the source-media layer
when its native locale has a video, poster, duration, title/summary, captions,
transcript, an editorially reviewed chapter/key-moment map, and an explicit
mapping from every H2 curriculum section to one of those key moments. Several
sections may map to the same key moment; this gate does NOT require one MP4 per
H2. Binary codec, duration and playback are separate runtime checks and are
never inferred here.
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
from urllib.parse import urlparse

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
ISO_DURATION = re.compile(r"^PT(?:(?P<h>\d+)H)?(?:(?P<m>\d+)M)?(?:(?P<s>\d+(?:\.\d+)?)S)?$")


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


def is_support_markdown(path: Path) -> bool:
    """Return True for Markdown assets that are not standalone lesson routes.

    Video transcripts intentionally live beside their article media and use the
    documented ``*-transcript.md`` convention. They must be required as media,
    but must never inflate the page inventory or create phantom locale routes.
    ``index.md``/README files are likewise support/redirect surfaces rather than
    lessons. Any other orphan Markdown file remains discoverable and therefore
    fail-closed, including non-numbered appendix/glossary pages.
    """
    stem = path.stem.lower()
    return (
        path.name.lower() in {"index.md", "readme.md"}
        or path.name.startswith("_")
        or stem == "transcript"
        or stem.endswith("-transcript")
        or stem.endswith("_transcript")
    )


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
                if is_support_markdown(p):
                    continue
                discovered.append(p.relative_to(source_root).as_posix())
    return list(dict.fromkeys(discovered)), findings


def _is_url(value: str) -> bool:
    try:
        return urlparse(value).scheme in {"http", "https"}
    except ValueError:
        return False


def _duration_seconds(value: str) -> float | None:
    match = ISO_DURATION.match(value.strip())
    if not match:
        return None
    return float(match.group("h") or 0) * 3600 + float(match.group("m") or 0) * 60 + float(match.group("s") or 0)


def _local_media_exists(source: Path, value: str) -> bool:
    return bool(value) and (_is_url(value) or (source.parent / value).is_file())


def _video_section_map_findings(sections: list[str], chapters: list[dict], section_map: Any) -> tuple[list[dict], list[dict]]:
    """Require every article H2 to map to a curated video key moment.

    Mapping is locale-native and uses exact H2 text plus a key-moment name from
    ``video_chapters``. Multiple H2s may map to one key moment, so this proves
    curriculum coverage without imposing one media file or one timeline chapter
    per section.
    """
    if not sections:
        return [], []
    if len(set(sections)) != len(sections):
        return [{"code": "VIDEO_SECTION_HEADINGS_DUPLICATED", "detail": sections}], []
    if not isinstance(section_map, list) or not section_map:
        return [{"code": "VIDEO_SECTION_MAP_MISSING"}], []

    findings: list[dict] = []
    normalized: list[dict] = []
    known_sections = set(sections)
    known_moments = {str(chapter.get("name") or "").strip() for chapter in chapters if isinstance(chapter, dict)}
    mapped_sections: list[str] = []

    for index, item in enumerate(section_map):
        if not isinstance(item, dict):
            findings.append({"code": "VIDEO_SECTION_MAP_INVALID", "detail": f"index {index}: not a mapping"})
            continue
        section = str(item.get("section") or "").strip()
        key_moment = str(item.get("key_moment") or "").strip()
        if not section or not key_moment:
            findings.append({"code": "VIDEO_SECTION_MAP_INVALID", "detail": f"index {index}: section/key_moment required"})
            continue
        if section not in known_sections:
            findings.append({"code": "VIDEO_SECTION_MAP_UNKNOWN_SECTION", "detail": section})
            continue
        if key_moment not in known_moments:
            findings.append({"code": "VIDEO_SECTION_MAP_UNKNOWN_KEY_MOMENT", "detail": key_moment})
            continue
        if section in mapped_sections:
            findings.append({"code": "VIDEO_SECTION_MAP_DUPLICATE_SECTION", "detail": section})
            continue
        mapped_sections.append(section)
        normalized.append({"section": section, "key_moment": key_moment})

    missing = [section for section in sections if section not in mapped_sections]
    if missing:
        findings.append({"code": "VIDEO_SECTION_UNMAPPED", "detail": missing})
    return findings, normalized


def media_findings(source: Path, meta: dict, sections: list[str]) -> tuple[list[dict], dict]:
    """Check source-level learning-media completeness without pretending playback QA."""
    findings: list[dict] = []
    video = str(meta.get("video") or "").strip()
    if not video:
        return [{"code": "VIDEO_DECLARATION_MISSING"}], {}

    poster = str(meta.get("video_poster") or Path(video).with_suffix(".jpg").name).strip()
    duration = str(meta.get("video_duration") or "").strip()
    title = str(meta.get("video_title") or "").strip()
    summary = str(meta.get("video_summary") or "").strip()
    captions = str(meta.get("video_captions") or "").strip()
    transcript = str(meta.get("video_transcript") or "").strip()
    chapters = meta.get("video_chapters")
    section_map = meta.get("video_section_map")

    if not _local_media_exists(source, video):
        findings.append({"code": "VIDEO_FILE_MISSING", "detail": video})
    if not poster:
        findings.append({"code": "VIDEO_POSTER_MISSING"})
    elif not _local_media_exists(source, poster):
        findings.append({"code": "VIDEO_POSTER_FILE_MISSING", "detail": poster})
    if not duration:
        findings.append({"code": "VIDEO_DURATION_MISSING"})
        duration_seconds = None
    else:
        duration_seconds = _duration_seconds(duration)
        if duration_seconds is None or duration_seconds <= 0:
            findings.append({"code": "VIDEO_DURATION_INVALID", "detail": duration})
    if not title:
        findings.append({"code": "VIDEO_TITLE_MISSING"})
    if not summary:
        findings.append({"code": "VIDEO_SUMMARY_MISSING"})
    if not captions:
        findings.append({"code": "VIDEO_CAPTIONS_MISSING"})
    elif not _local_media_exists(source, captions):
        findings.append({"code": "VIDEO_CAPTIONS_FILE_MISSING", "detail": captions})
    if not transcript:
        findings.append({"code": "VIDEO_TRANSCRIPT_MISSING"})
    elif not _local_media_exists(source, transcript):
        findings.append({"code": "VIDEO_TRANSCRIPT_FILE_MISSING", "detail": transcript})

    normalized_chapters: list[dict] = []
    if not isinstance(chapters, list) or not chapters:
        findings.append({"code": "VIDEO_CHAPTERS_MISSING"})
    else:
        last_start = -1.0
        for index, chapter in enumerate(chapters):
            if not isinstance(chapter, dict):
                findings.append({"code": "VIDEO_CHAPTER_INVALID", "detail": f"index {index}: not a mapping"})
                continue
            name = str(chapter.get("name") or "").strip()
            start = chapter.get("start")
            end = chapter.get("end")
            if not name or not isinstance(start, (int, float)) or start < 0 or start <= last_start:
                findings.append({"code": "VIDEO_CHAPTER_INVALID", "detail": f"index {index}: name/start/order"})
                continue
            if duration_seconds is not None and start >= duration_seconds:
                findings.append({"code": "VIDEO_CHAPTER_INVALID", "detail": f"index {index}: start outside duration"})
            if end is not None and (not isinstance(end, (int, float)) or end <= start or (duration_seconds is not None and end > duration_seconds + 0.01)):
                findings.append({"code": "VIDEO_CHAPTER_INVALID", "detail": f"index {index}: invalid end"})
            last_start = float(start)
            normalized_chapters.append({"name": name, "start": start, **({"end": end} if end is not None else {})})

    section_findings, normalized_section_map = _video_section_map_findings(sections, normalized_chapters, section_map)
    findings.extend(section_findings)

    return findings, {
        "video": video,
        "video_poster": poster,
        "video_duration": duration,
        "video_title": title,
        "video_summary": summary,
        "video_captions": captions,
        "video_transcript": transcript,
        "video_chapters": normalized_chapters,
        "curriculum_sections": sections,
        "video_section_map": normalized_section_map,
        "binary_playback_review": "PENDING",
        "content_alignment_review": "PENDING",
    }


class ArticleHTML(HTMLParser):
    """Extract actual article text while distinguishing code and protected math."""
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, set[str]]] = []
        self.article_depth = 0
        self.prose: list[str] = []
        self.code: list[str] = []
        self.videos = 0
        self.math = 0
        self.arithmatex = 0
        self.lang = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        classes = set((attr.get("class") or "").split())
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
        if "arithmatex" in classes:
            self.arithmatex += 1
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append((tag, classes))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        tags = [item[0] for item in self.stack]
        if tag in tags:
            i = len(tags) - 1 - tags[::-1].index(tag)
            self.stack = self.stack[:i]
        if tag == "article":
            self.article_depth = max(0, self.article_depth - 1)

    def handle_data(self, data: str) -> None:
        tags = {tag for tag, _ in self.stack}
        classes = {name for _, item_classes in self.stack for name in item_classes}
        if (
            not self.article_depth
            or any(t in tags for t in ("script", "style", "math", "annotation"))
            or "arithmatex" in classes
        ):
            return
        (self.code if any(t in tags for t in ("pre", "code")) else self.prose).append(data)


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
    return findings, {
        "video_elements": parsed.videos,
        "native_math_elements": parsed.math,
        "arithmatex_wrappers": parsed.arithmatex,
    }


def audit(root: Path, scope: dict, site: Path | None = None) -> dict:
    configs = {"es": load_yaml(root / "mkdocs.yml"), "en": load_yaml(root / "mkdocs.en.yml")}
    manifest = load_yaml(root / "locales/en/manifest.yml")
    published_en = set(manifest.get("published_routes", []))
    paths, findings = discover(root, scope, configs, published_en)
    entries: list[dict] = []
    media_cache: dict[str, dict] = {}
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
            sections = re.findall(r"(?m)^##\s+(.+)$", body)
            entry["sections"] = sections
            entry["tex_source_markers"] = dict(Counter(TEX.findall(strip_code(body))))
            entry["snippets"] = list(dict.fromkeys(INCLUDE.findall(body)))
            media_path = root / "locales" / locale / "media.yml"
            media_key = str(media_path)
            if media_key not in media_cache:
                media_cache[media_key] = load_yaml(media_path) if media_path.is_file() else {}
            media = media_cache[media_key]
            configured = (configs[locale].get("extra") or {}).get("locale_video_pages", {}) or {}
            for data in (configured.get(rel, {}), media.get(rel, {})):
                if isinstance(data, dict):
                    for key, value in data.items():
                        meta.setdefault(key, value)
            media_issues, media_contract = media_findings(source, meta, sections)
            issues.extend(media_issues)
            entry["video"] = media_contract
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
        "schema_version": 3,
        "scope": "post-datacenters-exclusive",
        "status": "TECHNICAL_FAIL" if counts else "TECHNICAL_PASS_ONLY",
        "golden": "NOT_CERTIFIED",
        "rendered_html": "AUDITED" if site else "NOT_RUN",
        "browser": "NOT_RUN",
        "media": "SOURCE_FAIL" if any(code.startswith("VIDEO_") for code in counts) else "SOURCE_PASS_BINARY_PENDING",
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
