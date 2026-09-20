#!/usr/bin/env python3
"""Compile and independently audit byte-bound video discovery content.

The source JSON is authoritative for text and timing, not for render provenance
or owner approval. Export generation is NOT release admission. Serving a legacy
approved video does not require proving its old renderer reproducible.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit
from xml.etree import ElementTree as ET

VERSION = 1
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
SAFE_ID = re.compile(r"[a-z0-9][a-z0-9-]*\Z")
REQUIRED_RELEASE_CHECKS = frozenset({
    "ASSET_BINDING", "TIMING_CONTENT_REVIEW", "VTT", "RENDERED_HTML",
    "VIDEO_SCHEMA", "VIDEO_SITEMAP", "ARTICLE_LINKS", "INDEXABILITY", "PLAYBACK",
})
REQUIRED_ARTIFACT_BINDINGS = frozenset({
    "html_sha256", "vtt_sha256", "player_sha256", "layout_sha256",
    "poster_sha256", "video_sitemap_sha256", "normal_sitemap_sha256", "article_html_sha256",
})
UI = {
    "es": {
        "transcript": "Texto del vídeo y descripción visual",
        "notice": "Este vídeo no contiene voz. La pista de texto reproduce el contenido escrito; las descripciones siguientes explican los elementos visuales.",
        "moments": "Momentos clave", "visual": "Descripción visual", "track": "Español · texto en pantalla (sin voz)",
    },
    "en": {
        "transcript": "Video text and visual description",
        "notice": "This video has no speech. The text track reproduces the written content; the descriptions below explain the visuals.",
        "moments": "Key moments", "visual": "Visual description", "track": "English · on-screen text (no speech)",
    },
}


class ContractError(ValueError):
    """Invalid, missing or inconsistent discovery evidence."""


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ContractError(message)


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")


def digest(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_digest(path: Path) -> str:
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def seconds(milliseconds: int) -> int | float:
    return milliseconds // 1000 if milliseconds % 1000 == 0 else milliseconds / 1000


def clock(milliseconds: int, *, vtt: bool = False) -> str:
    secs, ms = divmod(milliseconds, 1000)
    minutes, sec = divmod(secs, 60)
    hours, minute = divmod(minutes, 60)
    if vtt:
        return f"{hours:02}:{minute:02}:{sec:02}.{ms:03}"
    return f"{hours}:{minute:02}:{sec:02}" if hours else f"{minute}:{sec:02}"


def duration_iso(milliseconds: int) -> str:
    return f"PT{seconds(milliseconds)}S"


def _url(value: Any, field_name: str) -> None:
    require(isinstance(value, str), f"{field_name}: string required")
    p = urlsplit(value)
    require(p.scheme == "https" and bool(p.netloc) and not p.username and not p.password and not p.query and not p.fragment, f"{field_name}: stable HTTPS URL required")


def _text(value: Any, field_name: str) -> None:
    require(isinstance(value, str) and bool(value.strip()), f"{field_name}: nonempty text required")
    require("\x00" not in value and "\r" not in value, f"{field_name}: invalid control character")


def validate_source(source: dict) -> None:
    """Reject rather than trim, sort or discard malformed authored content."""
    require(isinstance(source, dict) and type(source.get("schema_version")) is int and source.get("schema_version") == VERSION, "schema_version")
    require(source.get("locale") in UI, "locale")
    require(isinstance(source.get("id"), str) and bool(SAFE_ID.fullmatch(source["id"])), "id")
    for key in ("title", "description"):
        _text(source.get(key), key)
    for key in ("watch_url", "article_url", "video_url", "poster_url", "vtt_url"):
        _url(source.get(key), key)
    require(len({source[k] for k in ("watch_url", "article_url", "video_url", "poster_url", "vtt_url")}) == 5, "distinct resource URLs required")
    require(source["video_url"].endswith(".mp4") and source["vtt_url"].endswith(".vtt"), "media extensions")
    prefix = "/en/" if source["locale"] == "en" else "/"
    for key in ("watch_url", "article_url", "video_url", "poster_url", "vtt_url"):
        path = urlsplit(source[key]).path
        require(path.startswith(prefix) and (source["locale"] == "en" or not path.startswith("/en/")), f"locale mismatch: {key}")
    require(bool(SHA256.fullmatch(str(source.get("video_sha256", "")))), "video_sha256")
    require(type(source.get("video_bytes")) is int and source["video_bytes"] > 0, "video_bytes")
    for key in ("width", "height"):
        require(type(source.get(key)) is int and source[key] > 0, key)
    duration = source.get("duration_ms")
    require(type(duration) is int and duration > 0, "duration_ms")
    require(source.get("caption_contract") == "silent-visual-text-v1", "explicit silent visual-text caption contract required")
    stamp = source.get("upload_date")
    require(isinstance(stamp, str), "upload_date")
    try:
        dt = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
        require(dt.tzinfo is not None, "upload_date timezone required")
    except ValueError as exc:
        raise ContractError("upload_date must be a recorded timezone-aware release timestamp") from exc
    chapters = source.get("chapters")
    require(isinstance(chapters, list) and bool(chapters), "missing chapters")
    last_end = 0
    identifiers: set[str] = set()
    cue_identifiers: set[str] = set()
    for chapter in chapters:
        require(isinstance(chapter, dict), "chapter object")
        cid = chapter.get("id")
        require(isinstance(cid, str) and bool(SAFE_ID.fullmatch(cid)) and cid not in identifiers, "duplicate/invalid chapter id")
        identifiers.add(cid)
        _text(chapter.get("name"), f"{cid}.name")
        start, end = chapter.get("start_ms"), chapter.get("end_ms")
        require(type(start) is int and type(end) is int, f"{cid}: integer milliseconds required")
        require(start == last_end and start < end <= duration, f"{cid}: unordered, overlapping, missing or out-of-duration chapter")
        last_end = end
        cues = chapter.get("cues")
        require(isinstance(cues, list) and bool(cues), f"{cid}: missing textual cues")
        previous_end = start
        for cue in cues:
            require(isinstance(cue, dict), f"{cid}: cue object")
            qid = cue.get("id")
            require(isinstance(qid, str) and bool(SAFE_ID.fullmatch(qid)) and qid not in cue_identifiers, "duplicate/invalid cue id")
            cue_identifiers.add(qid)
            _text(cue.get("text"), f"{qid}.text")
            a, b = cue.get("start_ms"), cue.get("end_ms")
            require(type(a) is int and type(b) is int and previous_end <= a < b <= end, f"{qid}: invalid/overlapping cue time")
            previous_end = b
        visuals = chapter.get("visual_description")
        require(isinstance(visuals, list) and bool(visuals), f"{cid}: missing substantive visual description")
        for text in visuals:
            _text(text, f"{cid}.visual_description")
    require(last_end == duration, "chapters do not cover complete duration")


def compile_source(source: dict) -> dict[str, Any]:
    """Deterministic derived content; this function never grants review/release."""
    validate_source(source)
    locale = source["locale"]
    ui = UI[locale]
    sha = digest(source)
    vtt = ["WEBVTT", "", f"NOTE source-sha256={sha} video-sha256={source['video_sha256']}", "This is on-screen written content, not a speech transcript.", ""]
    transcript = [f'<section id="video-transcript" lang="{locale}" data-discovery-source-sha256="{sha}" data-video-sha256="{source["video_sha256"]}">', f'<h2>{escape(ui["transcript"])}</h2>', f'<p>{escape(ui["notice"])}</p>']
    moments = [f'<nav aria-label="{escape(ui["moments"], quote=True)}" data-discovery-source-sha256="{sha}"><ol>']
    clips = []
    chapters = []
    for chapter in source["chapters"]:
        start, end = seconds(chapter["start_ms"]), seconds(chapter["end_ms"])
        temporal = f"{source['watch_url']}?t={start}"
        chapters.append({"name": chapter["name"], "start": start, "end": end})
        clips.append({"@type": "Clip", "name": chapter["name"], "startOffset": start, "endOffset": end, "url": temporal})
        moments.append(f'<li><a href="{escape(temporal, quote=True)}" data-s5-video-seek="{start}"><time>{clock(chapter["start_ms"])}</time> <span>{escape(chapter["name"])}</span></a></li>')
        transcript.append(f'<section data-chapter-id="{chapter["id"]}"><h3><a href="{escape(temporal, quote=True)}">{clock(chapter["start_ms"])} — {escape(chapter["name"])}</a></h3>')
        transcript.append('<p>' + ' '.join(escape(cue["text"]) for cue in chapter["cues"]) + '</p>')
        for text in chapter["visual_description"]:
            transcript.append(f'<p><strong>{escape(ui["visual"])}:</strong> {escape(text)}</p>')
        transcript.append('</section>')
        for cue in chapter["cues"]:
            # Escape VTT markup and prevent blank lines from creating new cues.
            text = escape(" ".join(cue["text"].split()), quote=False)
            vtt.extend([cue["id"], f'{clock(cue["start_ms"], vtt=True)} --> {clock(cue["end_ms"], vtt=True)}', text, ""])
    moments.append('</ol></nav>')
    transcript.append('</section>')
    schema = {"@context": "https://schema.org", "@type": "VideoObject", "@id": source["watch_url"] + "#video", "name": source["title"], "description": source["description"], "thumbnailUrl": [source["poster_url"]], "uploadDate": source["upload_date"], "duration": duration_iso(source["duration_ms"]), "contentUrl": source["video_url"], "inLanguage": locale, "mainEntityOfPage": {"@id": source["watch_url"]}, "isBasedOn": {"@id": source["article_url"]}, "hasPart": clips}
    return {"source_sha256": sha, "vtt": "\n".join(vtt), "transcript_html": "\n".join(transcript), "chapters_html": "\n".join(moments), "chapters": chapters, "schema": schema, "track_label": ui["track"]}


def inspect_asset(source: dict, path: Path) -> dict:
    validate_source(source)
    require(path.is_file(), "MP4 missing; a ZIP is not an MP4 delivery")
    require(path.stat().st_size == source["video_bytes"] and file_digest(path) == source["video_sha256"], "MP4 byte/hash mismatch")
    try:
        info = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)], timeout=30))
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        raise ContractError("ffprobe could not verify the exact MP4") from exc
    video = [s for s in info.get("streams", []) if s.get("codec_type") == "video"]
    audio = [s for s in info.get("streams", []) if s.get("codec_type") == "audio"]
    require(len(video) == 1 and video[0].get("codec_name") == "h264", "expected one H.264 video stream")
    require(not audio, "silent visual-text contract cannot silently absorb an audio track")
    # Millisecond rounding accommodates container timebase representation, not visual drift.
    require(round(float(info["format"]["duration"]) * 1000) == source["duration_ms"], "duration mismatch")
    require(video[0].get("width") == source["width"] and video[0].get("height") == source["height"], "dimensions mismatch")
    return {"sha256": source["video_sha256"], "bytes": source["video_bytes"], "duration_ms": source["duration_ms"], "codec": video[0]["codec_name"], "width": video[0]["width"], "height": video[0]["height"], "audio_streams": len(audio)}


@dataclass
class Element:
    tag: str
    attrs: dict[str, str | None] = field(default_factory=dict)
    children: list[Any] = field(default_factory=list)
    parent: Any = field(default=None, repr=False)

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.walk()

    def text(self, visible: bool = True) -> str:
        style = (self.attrs.get("style") or "").replace(" ", "").lower()
        invisible = self.tag in {"script", "style", "template"} or "hidden" in self.attrs or self.attrs.get("aria-hidden") == "true" or "display:none" in style or "visibility:hidden" in style or (self.tag == "details" and "open" not in self.attrs)
        ancestor = self.parent
        while visible and ancestor is not None:
            parent_style = (ancestor.attrs.get("style") or "").replace(" ", "").lower()
            invisible = invisible or ancestor.tag in {"script", "style", "template"} or "hidden" in ancestor.attrs or ancestor.attrs.get("aria-hidden") == "true" or "display:none" in parent_style or "visibility:hidden" in parent_style or (ancestor.tag == "details" and "open" not in ancestor.attrs)
            ancestor = ancestor.parent
        if visible and invisible:
            return ""
        return " ".join(c.text(visible) if isinstance(c, Element) else c for c in self.children)


class Document(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self, html: str):
        super().__init__(convert_charrefs=True)
        self.root = Element("document")
        self.stack = [self.root]
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        element = Element(tag, dict(attrs), parent=self.stack[-1])
        self.stack[-1].children.append(element)
        if tag not in self.VOID:
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def normalized(text: str) -> str:
    return " ".join(unescape(text).split())


def audit_rendered(source: dict, html: str, vtt: str, video_sitemap: str, normal_sitemap: str, article_html: str, *, status: int, headers: dict[str, str]) -> dict:
    """Read real rendered artefacts, rather than trusting generator flags.

This is a structural/content audit. It does not replace a real browser or the
encoded-video timing/content review; admission requires those separate results.
"""
    validate_source(source)
    errors: list[str] = []
    def check(ok: bool, code: str) -> None:
        if not ok:
            errors.append(code)
    doc = Document(html).root
    nodes = list(doc.walk())
    html_nodes = [e for e in nodes if e.tag == "html"]
    check(len(html_nodes) == 1 and html_nodes[0].attrs.get("lang", "").split("-")[0] == source["locale"], "HTML_LOCALE")
    check(status == 200, "HTTP_STATUS")
    directives = " ".join(str(e.attrs.get("content", "")) for e in nodes if e.tag == "meta" and str(e.attrs.get("name", "")).lower() in {"robots", "googlebot", "bingbot"})
    directives += " " + " ".join(v for k, v in headers.items() if k.lower() == "x-robots-tag")
    check(not re.search(r"\b(noindex|none)\b", directives, re.I), "NOINDEX")
    canonicals = [e.attrs.get("href") for e in nodes if e.tag == "link" and e.attrs.get("rel") == "canonical"]
    check(canonicals == [source["watch_url"]], "CANONICAL")
    check(any(e.tag == "h1" and normalized(e.text()) == normalized(source["title"]) for e in nodes), "TITLE_H1")
    check(any(e.tag == "source" and urljoin(source["watch_url"], e.attrs.get("src") or "") == source["video_url"] for e in nodes), "VIDEO_URL")
    check(any(e.tag == "track" and urljoin(source["watch_url"], e.attrs.get("src") or "") == source["vtt_url"] and e.attrs.get("srclang") == source["locale"] for e in nodes), "VTT_TRACK")
    transcripts = [e for e in nodes if e.attrs.get("id") == "video-transcript"]
    check(len(transcripts) == 1, "TRANSCRIPT_MISSING")
    visible_document = normalized(doc.text())
    if len(transcripts) == 1:
        tr = transcripts[0]
        check(tr.attrs.get("data-discovery-source-sha256") == digest(source) and tr.attrs.get("data-video-sha256") == source["video_sha256"], "TRANSCRIPT_STALE")
        check(tr.attrs.get("lang") == source["locale"], "TRANSCRIPT_LOCALE")
        for chapter in source["chapters"]:
            for passage in [c["text"] for c in chapter["cues"]] + chapter["visual_description"]:
                check(normalized(passage) in normalized(tr.text()) and normalized(passage) in visible_document, "TRANSCRIPT_CONTENT_OR_VISIBILITY")
    links = [e for e in nodes if e.tag == "a" and "data-s5-video-seek" in e.attrs]
    check(len(links) == len(source["chapters"]), "MISSING_KEY_MOMENT")
    for link, chapter in zip(links, source["chapters"]):
        start = seconds(chapter["start_ms"])
        check(link.attrs.get("data-s5-video-seek") == str(start) and urljoin(source["watch_url"], link.attrs.get("href") or "") == source["watch_url"] + f"?t={start}" and normalized(chapter["name"]) in normalized(link.text()), "CHAPTER_LINK")
    video_objects = []
    def objects(value):
        if isinstance(value, dict):
            if value.get("@type") == "VideoObject":
                video_objects.append(value)
            for child in value.values():
                objects(child)
        elif isinstance(value, list):
            for child in value:
                objects(child)
    for node in nodes:
        if node.tag == "script" and node.attrs.get("type") == "application/ld+json":
            try:
                objects(json.loads(node.text(visible=False)))
            except ValueError:
                errors.append("JSONLD_INVALID")
    check(len(video_objects) == 1, "VIDEOOBJECT_COUNT")
    if len(video_objects) == 1:
        obj = video_objects[0]
        for key, expected in {"name": source["title"], "description": source["description"], "contentUrl": source["video_url"], "duration": duration_iso(source["duration_ms"]), "uploadDate": source["upload_date"], "inLanguage": source["locale"]}.items():
            check(obj.get(key) == expected, "SCHEMA_" + key.upper())
        thumbs = obj.get("thumbnailUrl")
        check(thumbs == source["poster_url"] or thumbs == [source["poster_url"]], "SCHEMA_THUMBNAIL")
        clips = obj.get("hasPart", [])
        check(isinstance(clips, list) and len(clips) == len(source["chapters"]), "CLIP_COUNT")
        if isinstance(clips, list):
            for clip, chapter in zip(clips, source["chapters"]):
                expected = {"@type": "Clip", "name": chapter["name"], "startOffset": seconds(chapter["start_ms"]), "endOffset": seconds(chapter["end_ms"]), "url": source["watch_url"] + f'?t={seconds(chapter["start_ms"])}'}
                check(isinstance(clip, dict) and all(clip.get(k) == v for k, v in expected.items()), "CLIP_MISMATCH")
    # Independent VTT parser: compare actual cue intervals and content, not strings in code.
    actual_cues = []
    for block in re.split(r"\n\s*\n", vtt.replace("\r\n", "\n").strip()):
        lines = block.splitlines()
        if not lines or lines[0] == "WEBVTT" or lines[0].startswith("NOTE"):
            continue
        if len(lines) < 3:
            errors.append("VTT_INVALID")
            continue
        m = re.fullmatch(r"(\d{2,}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2,}):(\d{2}):(\d{2})\.(\d{3})", lines[1])
        if not m:
            errors.append("VTT_INVALID")
            continue
        parts = list(map(int, m.groups()))
        if parts[1] >= 60 or parts[2] >= 60 or parts[5] >= 60 or parts[6] >= 60:
            errors.append("VTT_INVALID")
        a = ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000 + parts[3]
        b = ((parts[4] * 60 + parts[5]) * 60 + parts[6]) * 1000 + parts[7]
        actual_cues.append((lines[0], a, b, normalized(" ".join(lines[2:]))))
    expected_cues = [(c["id"], c["start_ms"], c["end_ms"], normalized(c["text"])) for ch in source["chapters"] for c in ch["cues"]]
    check(vtt.startswith("WEBVTT\n") and actual_cues == expected_cues, "VTT_STALE_OR_CONTENT")
    check(f"source-sha256={digest(source)}" in vtt and f"video-sha256={source['video_sha256']}" in vtt, "VTT_BINDING")
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9", "v": "http://www.google.com/schemas/sitemap-video/1.1"}
    try:
        urls = ET.fromstring(video_sitemap).findall("s:url", ns)
        matches = [n for n in urls if n.findtext("s:loc", namespaces=ns) == source["watch_url"]]
        check(len(matches) == 1, "VIDEO_SITEMAP_ENTRY")
        if len(matches) == 1:
            videos = matches[0].findall("v:video", ns)
            check(len(videos) == 1, "VIDEO_SITEMAP_COUNT")
            if len(videos) == 1:
                for key, expected in {"title": source["title"], "description": source["description"], "thumbnail_loc": source["poster_url"], "content_loc": source["video_url"], "duration": str(seconds(source["duration_ms"])), "publication_date": source["upload_date"]}.items():
                    check(videos[0].findtext("v:" + key, namespaces=ns) == expected, "VIDEO_SITEMAP_" + key.upper())
        normal = [n.text for n in ET.fromstring(normal_sitemap).findall("s:url/s:loc", ns)]
        check(normal.count(source["watch_url"]) == 1, "NORMAL_SITEMAP_ENTRY")
    except ET.ParseError:
        errors.append("SITEMAP_INVALID_XML")
    article_links = [urljoin(source["article_url"], n.attrs.get("href") or "") for n in Document(article_html).root.walk() if n.tag == "a"]
    watch_links = [urljoin(source["watch_url"], n.attrs.get("href") or "") for n in nodes if n.tag == "a"]
    check(source["watch_url"] in article_links and source["article_url"] in watch_links, "ARTICLE_WATCH_LINKS")
    return {"status": "FAIL" if errors else "PASS", "errors": sorted(set(errors)), "source_sha256": digest(source), "video_sha256": source["video_sha256"], "html_sha256": hashlib.sha256(html.encode()).hexdigest(), "scope": "structural-content-only; browser, crawler policy and encoded timing review are separate"}


def release_admission(source: dict, receipts: dict[str, dict], observed_bindings: dict[str, str], evidence_root: Path | None = None) -> dict:
    """Consume trusted evaluator receipts; never trust renderer-written flags.

    Receipts and their files must be held outside renderer write access. This
    validates freshness and evidence presence, not the identity of an untrusted
    writer. Protect that boundary in the execution environment.
    """
    validate_source(source)
    required_bindings = {"source_sha256": digest(source), "video_sha256": source["video_sha256"], "evaluator_sha256": file_digest(Path(__file__))}
    require(not (required_bindings.keys() & observed_bindings.keys()), "reserved binding override")
    missing_artifacts = REQUIRED_ARTIFACT_BINDINGS - observed_bindings.keys()
    invalid_artifacts = {name for name, value in observed_bindings.items() if not SHA256.fullmatch(str(value))}
    required_bindings.update(observed_bindings)
    expected_producers = {"ASSET_BINDING": "ffprobe", "TIMING_CONTENT_REVIEW": "independent-encoded-review", "PLAYBACK": "playwright", "INDEXABILITY": "http-crawler"}
    missing = REQUIRED_RELEASE_CHECKS - receipts.keys()
    blocked = {name: "MISSING" for name in sorted(missing)}
    if missing_artifacts or invalid_artifacts:
        blocked["ARTIFACT_BINDINGS"] = {"missing": sorted(missing_artifacts), "invalid": sorted(invalid_artifacts)}
    for name in sorted(REQUIRED_RELEASE_CHECKS & receipts.keys()):
        receipt = receipts[name]
        if not isinstance(receipt, dict):
            blocked[name] = "INVALID_RECEIPT"
        elif receipt.get("status") != "PASS":
            blocked[name] = receipt.get("status", "UNKNOWN")
        elif not isinstance(receipt.get("bindings"), dict) or any(receipt["bindings"].get(k) != v for k, v in required_bindings.items()):
            blocked[name] = "STALE"
        elif receipt.get("producer") != expected_producers.get(name, "discovery-auditor"):
            blocked[name] = "INDEPENDENT_EVALUATOR_REQUIRED"
        else:
            evidence = receipt.get("evidence")
            if evidence_root is None or not isinstance(evidence, list) or not evidence:
                blocked[name] = "EVIDENCE_MISSING"
                continue
            root = evidence_root.resolve()
            for item in evidence:
                if not isinstance(item, dict) or not isinstance(item.get("path"), str):
                    blocked[name] = "INVALID_EVIDENCE"
                    break
                path = (root / item["path"]).resolve()
                if not path.is_relative_to(root) or not path.is_file() or not SHA256.fullmatch(str(item.get("sha256", ""))) or file_digest(path) != item["sha256"]:
                    blocked[name] = "EVIDENCE_STALE_OR_MISSING"
                    break
    return {"release_ready": not blocked, "blocked": blocked, "owner_approval": "UNMODIFIED", "render_provenance": "NOT_REEVALUATED"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--asset", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        source = json.loads(args.source.read_text(encoding="utf-8"))
        exported = compile_source(source)
        media = inspect_asset(source, args.asset) if args.asset else None
        if args.output:
            args.output.mkdir(parents=True, exist_ok=True)
            for key, filename in [("vtt", "visual-text.vtt"), ("transcript_html", "transcript.html"), ("chapters_html", "chapters.html")]:
                (args.output / filename).write_text(exported[key], encoding="utf-8")
            (args.output / "metadata.json").write_text(json.dumps({k: v for k, v in exported.items() if k not in {"vtt", "transcript_html", "chapters_html"}}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"source_sha256": exported["source_sha256"], "chapters": len(source["chapters"]), "cues": sum(len(c["cues"]) for c in source["chapters"]), "asset": media, "release_admission": release_admission(source, {}, {})}, ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
