#!/usr/bin/env python3
"""Exhaustive live SEO/GEO/video audit for the public 5sigmas site.

The audit intentionally consumes production artefacts instead of trusting source
metadata. It checks every public ES/EN video watch page and its parent article,
plus the machine-readable surfaces used by search engines and LLM agents.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse

ORIGIN = "https://5sigmas.com"
UA = "ChatGPT-User"
NS = {
    "s": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "v": "http://www.google.com/schemas/sitemap-video/1.1",
    "xhtml": "http://www.w3.org/1999/xhtml",
}

AI_USER_AGENTS = (
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "Googlebot",
)


class AuditError(RuntimeError):
    pass


@dataclass
class HtmlFacts:
    canonical: list[str] = field(default_factory=list)
    robots: list[str] = field(default_factory=list)
    alternates: dict[str, str] = field(default_factory=dict)
    markdown_alternate: list[str] = field(default_factory=list)
    links: set[str] = field(default_factory=set)
    tracks: list[dict[str, str]] = field(default_factory=list)
    jsonld: list[Any] = field(default_factory=list)
    h1: list[str] = field(default_factory=list)
    transcript_blocks: list[str] = field(default_factory=list)
    text: str = ""


class PageParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.facts = HtmlFacts()
        self._data: list[str] = []
        self._json_depth = 0
        self._json_data: list[str] = []
        self._h1_depth = 0
        self._h1_data: list[str] = []
        self._transcript_depth = 0
        self._transcript_data: list[str] = []

    @staticmethod
    def _attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {k.lower(): (v or "") for k, v in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = self._attrs(attrs)
        t = tag.lower()
        rel = {part.lower() for part in a.get("rel", "").split()}

        if t == "link":
            href = a.get("href", "")
            if "canonical" in rel and href:
                self.facts.canonical.append(urljoin(self.base_url, href))
            if "alternate" in rel and href:
                if a.get("hreflang"):
                    self.facts.alternates[a["hreflang"].lower()] = urljoin(self.base_url, href)
                if a.get("type", "").lower() == "text/markdown":
                    self.facts.markdown_alternate.append(urljoin(self.base_url, href))

        if t == "meta" and a.get("content"):
            if a.get("name", "").lower() in {"robots", "googlebot", "bingbot"}:
                self.facts.robots.append(a["content"].lower())

        if t == "a" and a.get("href"):
            self.facts.links.add(urljoin(self.base_url, a["href"]))

        if t == "track":
            item = dict(a)
            if item.get("src"):
                item["src"] = urljoin(self.base_url, item["src"])
            self.facts.tracks.append(item)

        if t == "script" and a.get("type", "").lower() == "application/ld+json":
            self._json_depth = 1
            self._json_data = []
        elif self._json_depth:
            self._json_depth += 1

        if t == "h1":
            self._h1_depth = 1
            self._h1_data = []
        elif self._h1_depth:
            self._h1_depth += 1

        classes = set(a.get("class", "").split())
        if (
            "s5-video-watch__transcript" in classes
            or "s5-video-watch__machine-context" in classes
            or a.get("id") == "video-transcript"
        ):
            self._transcript_depth = 1
            self._transcript_data = []
        elif self._transcript_depth:
            self._transcript_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if self._json_depth:
            self._json_depth -= 1
            if self._json_depth == 0:
                raw = "".join(self._json_data).strip()
                if raw:
                    try:
                        self.facts.jsonld.append(json.loads(raw))
                    except json.JSONDecodeError as exc:
                        self.facts.jsonld.append({"__invalid_jsonld__": str(exc), "__raw__": raw[:500]})
        if self._h1_depth:
            self._h1_depth -= 1
            if self._h1_depth == 0:
                self.facts.h1.append(norm(" ".join(self._h1_data)))
        if self._transcript_depth:
            self._transcript_depth -= 1
            if self._transcript_depth == 0:
                self.facts.transcript_blocks.append(norm(" ".join(self._transcript_data)))

    def handle_data(self, data: str) -> None:
        self._data.append(data)
        if self._json_depth:
            self._json_data.append(data)
        if self._h1_depth:
            self._h1_data.append(data)
        if self._transcript_depth:
            self._transcript_data.append(data)

    def close(self) -> None:
        super().close()
        self.facts.text = norm(" ".join(self._data))


def norm(value: Any) -> str:
    return " ".join(str(value or "").split())


def http(
    url: str,
    *,
    user_agent: str = UA,
    accept: str = "*/*",
    method: str = "GET",
    range_header: str | None = None,
    retries: int = 3,
) -> tuple[int, bytes, dict[str, str]]:
    headers = {
        "User-Agent": user_agent,
        "Accept": accept,
        "Cache-Control": "no-cache",
    }
    if range_header:
        headers["Range"] = range_header

    last: Exception | None = None
    for attempt in range(retries):
        req = urllib.request.Request(url, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=35) as response:
                body = b"" if method == "HEAD" else response.read()
                return response.status, body, {k.lower(): v for k, v in response.headers.items()}
        except urllib.error.HTTPError as exc:
            if exc.code in {429, 500, 502, 503, 504} and attempt + 1 < retries:
                time.sleep(1.0 + attempt)
                last = exc
                continue
            body = exc.read()
            raise AuditError(f"{method} {url}: HTTP {exc.code}: {body[:300]!r}") from exc
        except urllib.error.URLError as exc:
            last = exc
            if attempt + 1 < retries:
                time.sleep(1.0 + attempt)
                continue
            raise AuditError(f"{method} {url}: network error: {exc}") from exc
    raise AuditError(f"{method} {url}: {last}")


def get_text(url: str, *, user_agent: str = UA, accept: str = "*/*") -> tuple[str, dict[str, str]]:
    status, body, headers = http(url, user_agent=user_agent, accept=accept)
    if status != 200:
        raise AuditError(f"GET {url}: expected 200, got {status}")
    if not body:
        raise AuditError(f"GET {url}: empty body")
    return body.decode("utf-8", errors="replace"), headers


def get_json(url: str, *, user_agent: str = UA) -> dict[str, Any]:
    text, _ = get_text(url, user_agent=user_agent, accept="application/json")
    data = json.loads(text)
    if not isinstance(data, dict):
        raise AuditError(f"{url}: JSON root is not an object")
    return data


def html_facts(url: str, *, user_agent: str = UA) -> tuple[HtmlFacts, dict[str, str], str]:
    text, headers = get_text(url, user_agent=user_agent, accept="text/html")
    parser = PageParser(url)
    parser.feed(text)
    parser.close()
    return parser.facts, headers, text


def iter_dicts(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_dicts(child)


def schema_nodes(facts: HtmlFacts, schema_type: str) -> list[dict[str, Any]]:
    rows = []
    for payload in facts.jsonld:
        for node in iter_dicts(payload):
            node_type = node.get("@type")
            if node_type == schema_type or (isinstance(node_type, list) and schema_type in node_type):
                rows.append(node)
    return rows


def sitemap_locs(xml_text: str) -> set[str]:
    root = ET.fromstring(xml_text)
    return {norm(node.text) for node in root.findall(".//s:loc", NS) if norm(node.text)}


def sitemap_alternates(xml_text: str) -> dict[str, dict[str, str]]:
    root = ET.fromstring(xml_text)
    result: dict[str, dict[str, str]] = {}
    for url_node in root.findall(".//s:url", NS):
        loc = norm(url_node.findtext("s:loc", namespaces=NS))
        if not loc:
            continue
        result[loc] = {
            norm(link.attrib.get("hreflang")).lower(): norm(link.attrib.get("href"))
            for link in url_node.findall("xhtml:link", NS)
            if norm(link.attrib.get("rel")).lower() == "alternate"
            and norm(link.attrib.get("hreflang"))
            and norm(link.attrib.get("href"))
        }
    return result


def video_sitemap_records(xml_text: str) -> dict[str, dict[str, str]]:
    root = ET.fromstring(xml_text)
    records: dict[str, dict[str, str]] = {}
    for url_node in root.findall(".//s:url", NS):
        loc = norm(url_node.findtext("s:loc", namespaces=NS))
        video = url_node.find("v:video", NS)
        if not loc or video is None:
            continue
        records[loc] = {
            "thumbnail_loc": norm(video.findtext("v:thumbnail_loc", namespaces=NS)),
            "title": norm(video.findtext("v:title", namespaces=NS)),
            "description": norm(video.findtext("v:description", namespaces=NS)),
            "content_loc": norm(video.findtext("v:content_loc", namespaces=NS)),
            "duration": norm(video.findtext("v:duration", namespaces=NS)),
            "publication_date": norm(video.findtext("v:publication_date", namespaces=NS)),
        }
    return records


def safe_https(url: str, *, allow_hosts: set[str]) -> bool:
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    return parsed.scheme == "https" and parsed.hostname in allow_hosts


def normalized_pair_key(watch_url: str) -> str:
    path = urlparse(watch_url).path
    if path.startswith("/en/"):
        path = path[3:]
    return path.rstrip("/") + "/"


def media_probe(url: str, expected_prefix: str) -> dict[str, Any]:
    try:
        status, _, headers = http(url, method="HEAD", user_agent="Googlebot")
    except AuditError:
        status, _, headers = http(
            url,
            method="GET",
            range_header="bytes=0-0",
            user_agent="Googlebot",
        )
    content_type = headers.get("content-type", "").lower()
    if status not in {200, 206}:
        raise AuditError(f"{url}: media status {status}")
    if expected_prefix and not content_type.startswith(expected_prefix):
        raise AuditError(f"{url}: expected content-type {expected_prefix}*, got {content_type!r}")
    return {
        "status": status,
        "content_type": content_type,
        "content_length": headers.get("content-length", ""),
        "accept_ranges": headers.get("accept-ranges", ""),
    }


def iso_seconds(value: str) -> float | None:
    match = re.fullmatch(
        r"PT(?:(?P<h>\d+(?:\.\d+)?)H)?(?:(?P<m>\d+(?:\.\d+)?)M)?(?:(?P<s>\d+(?:\.\d+)?)S)?",
        norm(value),
    )
    if not match:
        return None
    hours = float(match.group("h") or 0)
    minutes = float(match.group("m") or 0)
    seconds = float(match.group("s") or 0)
    return hours * 3600 + minutes * 60 + seconds


def add_failure(failures: list[dict[str, str]], scope: str, url: str, code: str, detail: str = "") -> None:
    failures.append({"scope": scope, "url": url, "code": code, "detail": detail})


def audit_watch(
    *,
    locale: str,
    entry: dict[str, Any],
    normal_locs: set[str],
    normal_alternates: dict[str, dict[str, str]],
    video_records: dict[str, dict[str, str]],
    graph_urls: set[str],
    pair_url: str | None,
    failures: list[dict[str, str]],
    media_cache: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    watch = norm(entry.get("watch_url"))
    article = norm(entry.get("source_url"))
    title = norm(entry.get("title"))
    video_url = norm(entry.get("video_url"))
    thumb_url = norm(entry.get("thumb_url"))
    captions_url = norm(entry.get("captions_url"))
    duration_iso = norm(entry.get("duration_iso"))
    publication_date = norm(entry.get("publication_date"))
    chapters = entry.get("chapters") if isinstance(entry.get("chapters"), list) else []

    result = {"locale": locale, "watch_url": watch, "article_url": article, "title": title}

    if not safe_https(watch, allow_hosts={"5sigmas.com"}):
        add_failure(failures, "video", watch, "WATCH_URL_INVALID")
        return result
    if not safe_https(article, allow_hosts={"5sigmas.com"}):
        add_failure(failures, "video", watch, "ARTICLE_URL_INVALID", article)
    for label, url in (("VIDEO", video_url), ("THUMB", thumb_url)):
        if not url:
            add_failure(failures, "video", watch, f"{label}_URL_MISSING")
            continue
        if not safe_https(url, allow_hosts={"5sigmas.com", "media.5sigmas.com"}):
            add_failure(failures, "video", watch, f"{label}_URL_INVALID", url)
    if captions_url and not safe_https(captions_url, allow_hosts={"5sigmas.com", "media.5sigmas.com"}):
        add_failure(failures, "video", watch, "CAPTIONS_URL_INVALID", captions_url)

    if watch not in normal_locs:
        add_failure(failures, "sitemap", watch, "WATCH_MISSING_NORMAL_SITEMAP")
    if article not in normal_locs:
        add_failure(failures, "sitemap", article, "ARTICLE_MISSING_NORMAL_SITEMAP")
    if watch not in video_records:
        add_failure(failures, "sitemap", watch, "WATCH_MISSING_VIDEO_SITEMAP")
    if watch not in graph_urls:
        add_failure(failures, "agent-graph", watch, "WATCH_MISSING_AGENT_GRAPH")
    if article not in graph_urls:
        add_failure(failures, "agent-graph", article, "ARTICLE_MISSING_AGENT_GRAPH")

    try:
        facts, headers, _ = html_facts(watch)
    except Exception as exc:
        add_failure(failures, "watch", watch, "HTTP_OR_PARSE", str(exc))
        return result

    x_robots = headers.get("x-robots-tag", "").lower()
    directives = " ".join(facts.robots) + " " + x_robots
    if re.search(r"\b(noindex|none)\b", directives):
        add_failure(failures, "watch", watch, "NOINDEX", directives)
    if facts.canonical != [watch]:
        add_failure(failures, "watch", watch, "CANONICAL", repr(facts.canonical))
    if not any(norm(value) for value in facts.h1):
        add_failure(failures, "watch", watch, "H1_MISSING")
    if article not in facts.links:
        add_failure(failures, "watch", watch, "ARTICLE_BACKLINK_MISSING", article)

    md_expected = watch.rstrip("/") + "/index.html.md"
    if facts.markdown_alternate != [md_expected]:
        add_failure(failures, "watch", watch, "MARKDOWN_ALTERNATE", repr(facts.markdown_alternate))

    expected_es = watch if locale == "es" else pair_url
    expected_en = watch if locale == "en" else pair_url
    sitemap_langs = normal_alternates.get(watch, {})
    if expected_es and sitemap_langs.get("es") != expected_es:
        add_failure(failures, "hreflang", watch, "SITEMAP_HREFLANG_ES", repr(sitemap_langs.get("es")))
    if expected_en and sitemap_langs.get("en") != expected_en:
        add_failure(failures, "hreflang", watch, "SITEMAP_HREFLANG_EN", repr(sitemap_langs.get("en")))

    video_nodes = schema_nodes(facts, "VideoObject")
    if len(video_nodes) != 1:
        add_failure(failures, "schema", watch, "VIDEOOBJECT_COUNT", str(len(video_nodes)))
    else:
        node = video_nodes[0]
        required = ("name", "description", "thumbnailUrl", "contentUrl", "uploadDate", "duration", "mainEntityOfPage")
        for field_name in required:
            if not node.get(field_name):
                add_failure(failures, "schema", watch, "VIDEOOBJECT_FIELD_MISSING", field_name)
        if norm(node.get("name")) != title:
            add_failure(failures, "schema", watch, "VIDEOOBJECT_TITLE")
        if norm(node.get("contentUrl")) != video_url:
            add_failure(failures, "schema", watch, "VIDEOOBJECT_CONTENT_URL", norm(node.get("contentUrl")))
        thumbs = node.get("thumbnailUrl")
        schema_thumb = norm(thumbs[0] if isinstance(thumbs, list) and thumbs else thumbs)
        if schema_thumb != thumb_url:
            add_failure(failures, "schema", watch, "VIDEOOBJECT_THUMBNAIL", schema_thumb)
        if duration_iso:
            expected_seconds = iso_seconds(duration_iso)
            schema_seconds = iso_seconds(norm(node.get("duration")))
            if expected_seconds is None or schema_seconds is None or abs(expected_seconds - schema_seconds) > 0.01:
                add_failure(
                    failures,
                    "schema",
                    watch,
                    "VIDEOOBJECT_DURATION",
                    f"{norm(node.get('duration'))} != {duration_iso}",
                )
        if publication_date and not norm(node.get("uploadDate")).startswith(publication_date[:10]):
            add_failure(failures, "schema", watch, "VIDEOOBJECT_UPLOAD_DATE", norm(node.get("uploadDate")))

        parts = node.get("hasPart")
        action = node.get("potentialAction")
        if chapters:
            if not isinstance(parts, list) or len(parts) != len(chapters):
                add_failure(failures, "schema", watch, "CLIP_COUNT", f"{len(parts) if isinstance(parts, list) else 0} != {len(chapters)}")
            if action:
                add_failure(failures, "schema", watch, "DOUBLE_KEY_MOMENT_CONTRACT")
        else:
            if not isinstance(action, dict) or action.get("@type") != "SeekToAction":
                add_failure(failures, "schema", watch, "KEY_MOMENT_CONTRACT_MISSING")

    matching_tracks = [
        track for track in facts.tracks
        if track.get("kind", "").lower() in {"captions", "subtitles"}
    ]
    if captions_url and not matching_tracks:
        add_failure(failures, "accessibility", watch, "DECLARED_CAPTION_TRACK_MISSING")
    elif captions_url and not any(track.get("src") == captions_url for track in matching_tracks):
        # Same media can be routed through a relative playback URL. Fall back to filename parity.
        cap_name = urlparse(captions_url).path.rsplit("/", 1)[-1]
        if not any(urlparse(track.get("src", "")).path.endswith("/" + cap_name) for track in matching_tracks):
            add_failure(failures, "accessibility", watch, "CAPTION_TRACK_MISMATCH", repr(matching_tracks))

    transcript_text = max(facts.transcript_blocks, key=len, default="")
    if len(transcript_text) < 120:
        add_failure(failures, "llm-video", watch, "VISIBLE_TRANSCRIPT_MISSING_OR_THIN", str(len(transcript_text)))

    try:
        md_text, md_headers = get_text(md_expected, user_agent="Claude-User", accept="text/markdown,text/plain")
        if len(md_text) < 250:
            add_failure(failures, "markdown", md_expected, "MARKDOWN_TOO_THIN", str(len(md_text)))
        if not (re.search(r"(?im)^#\s+\S", md_text) or re.search(r"(?is)<h1\b[^>]*>.*?</h1>", md_text)):
            add_failure(failures, "markdown", md_expected, "MARKDOWN_H1_MISSING")
        if "noindex" in md_headers.get("x-robots-tag", "").lower():
            add_failure(failures, "markdown", md_expected, "MARKDOWN_NOINDEX")
    except Exception as exc:
        add_failure(failures, "markdown", md_expected, "MARKDOWN_HTTP", str(exc))

    try:
        article_facts, _, _ = html_facts(article)
        if watch not in article_facts.links:
            add_failure(failures, "article", article, "WATCH_LINK_MISSING", watch)
        if article_facts.canonical != [article]:
            add_failure(failures, "article", article, "CANONICAL", repr(article_facts.canonical))
    except Exception as exc:
        add_failure(failures, "article", article, "HTTP_OR_PARSE", str(exc))

    record = video_records.get(watch)
    if record:
        comparisons = {
            "content_loc": video_url,
            "thumbnail_loc": thumb_url,
            "title": title,
        }
        for key, expected in comparisons.items():
            if norm(record.get(key)) != expected:
                add_failure(failures, "video-sitemap", watch, f"{key.upper()}_MISMATCH", norm(record.get(key)))
        if not record.get("description"):
            add_failure(failures, "video-sitemap", watch, "DESCRIPTION_MISSING")
        if not record.get("duration"):
            add_failure(failures, "video-sitemap", watch, "DURATION_MISSING")
        if not record.get("publication_date"):
            add_failure(failures, "video-sitemap", watch, "PUBLICATION_DATE_MISSING")

    for media_url, prefix in ((video_url, "video/"), (thumb_url, "image/"), (captions_url, "text/")):
        if not media_url:
            continue
        cache_key = (media_url, prefix)
        if cache_key not in media_cache:
            try:
                media_cache[cache_key] = media_probe(media_url, prefix)
            except Exception as exc:
                media_cache[cache_key] = {"error": str(exc)}
        if "error" in media_cache[cache_key]:
            add_failure(failures, "asset", media_url, "ASSET_PROBE", str(media_cache[cache_key]["error"]))

    result["transcript_chars"] = len(transcript_text)
    result["chapters"] = len(chapters)
    result["has_captions"] = bool(captions_url)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default=ORIGIN)
    args = parser.parse_args()
    origin = args.origin.rstrip("/")

    failures: list[dict[str, str]] = []
    media_cache: dict[tuple[str, str], dict[str, Any]] = {}

    # Make sure UA-specific delivery is not blocked by CDN/WAF policy.
    ua_receipt: dict[str, int] = {}
    for agent in AI_USER_AGENTS:
        try:
            status, body, headers = http(origin + "/", user_agent=agent, accept="text/html")
            if status != 200 or b"<html" not in body[:12000].lower():
                raise AuditError(f"unexpected homepage response status={status}")
            if re.search(r"\b(noindex|none)\b", headers.get("x-robots-tag", ""), re.I):
                raise AuditError(f"blocking x-robots-tag={headers.get('x-robots-tag')!r}")
            ua_receipt[agent] = len(body)
        except Exception as exc:
            add_failure(failures, "crawler", origin + "/", "USER_AGENT_BLOCKED", f"{agent}: {exc}")

    normal_xml = {
        "es": get_text(origin + "/sitemap.xml", accept="application/xml")[0],
        "en": get_text(origin + "/en/sitemap.xml", accept="application/xml")[0],
    }
    video_xml = {
        "es": get_text(origin + "/video-sitemap.xml", accept="application/xml")[0],
        "en": get_text(origin + "/en/video-sitemap.xml", accept="application/xml")[0],
    }
    normal_locs = {locale: sitemap_locs(text) for locale, text in normal_xml.items()}
    normal_alternates = {locale: sitemap_alternates(text) for locale, text in normal_xml.items()}
    video_records = {locale: video_sitemap_records(text) for locale, text in video_xml.items()}

    catalogs = {
        "es": get_json(origin + "/videos/catalog.json"),
        "en": get_json(origin + "/en/videos/catalog.json"),
    }

    graph_payloads = {
        "es": get_json(origin + "/agent/knowledge.json"),
        "en": get_json(origin + "/en/agent/knowledge.json"),
    }
    graph_urls: dict[str, set[str]] = {}
    for locale, graph in graph_payloads.items():
        items = graph.get("items")
        if graph.get("schema_version") != 2 or not isinstance(items, list):
            add_failure(failures, "agent-graph", locale, "INVALID_GRAPH")
            graph_urls[locale] = set()
        else:
            graph_urls[locale] = {
                norm(item.get("url"))
                for item in items
                if isinstance(item, dict) and norm(item.get("url"))
            }

    for locale, catalog in catalogs.items():
        videos = catalog.get("videos")
        if not isinstance(videos, list):
            add_failure(failures, "catalog", locale, "VIDEOS_NOT_LIST")
            videos = []
        if catalog.get("count") != len(videos):
            add_failure(failures, "catalog", locale, "COUNT_MISMATCH", f"{catalog.get('count')} != {len(videos)}")
        watch_urls = [norm(row.get("watch_url")) for row in videos if isinstance(row, dict)]
        if len(watch_urls) != len(set(watch_urls)):
            add_failure(failures, "catalog", locale, "DUPLICATE_WATCH_URLS")

    pair_maps: dict[str, dict[str, str]] = {}
    for locale, catalog in catalogs.items():
        pair_maps[locale] = {
            normalized_pair_key(norm(row.get("watch_url"))): norm(row.get("watch_url"))
            for row in catalog.get("videos", [])
            if isinstance(row, dict) and norm(row.get("watch_url"))
        }

    es_keys = set(pair_maps["es"])
    en_keys = set(pair_maps["en"])
    for key in sorted(es_keys - en_keys):
        add_failure(failures, "locale-parity", key, "MISSING_EN_VIDEO")
    for key in sorted(en_keys - es_keys):
        add_failure(failures, "locale-parity", key, "MISSING_ES_VIDEO")

    audited: list[dict[str, Any]] = []
    for locale in ("es", "en"):
        other = "en" if locale == "es" else "es"
        for entry in catalogs[locale].get("videos", []):
            if not isinstance(entry, dict):
                add_failure(failures, "catalog", locale, "INVALID_ENTRY")
                continue
            key = normalized_pair_key(norm(entry.get("watch_url")))
            pair_url = pair_maps[other].get(key)
            audited.append(
                audit_watch(
                    locale=locale,
                    entry=entry,
                    normal_locs=normal_locs[locale],
                    normal_alternates=normal_alternates[locale],
                    video_records=video_records[locale],
                    graph_urls=graph_urls[locale],
                    pair_url=pair_url,
                    failures=failures,
                    media_cache=media_cache,
                )
            )

    # Global machine-readable discovery surfaces.
    llms_receipt = {}
    for locale, path in (("es", "/llms.txt"), ("en", "/en/llms.txt")):
        try:
            text, _ = get_text(origin + path, user_agent="Claude-User", accept="text/plain,text/markdown")
            expected_hub = origin + ("/videos/index.html.md" if locale == "es" else "/en/videos/index.html.md")
            if expected_hub not in text:
                add_failure(failures, "llms", origin + path, "VIDEO_HUB_MISSING", expected_hub)
            llms_receipt[locale] = len(text)
        except Exception as exc:
            add_failure(failures, "llms", origin + path, "HTTP", str(exc))

    try:
        health = get_json(origin + "/mcp/health")
        if health.get("ok") is not True or health.get("service") != "5sigmas-mcp":
            add_failure(failures, "mcp", origin + "/mcp/health", "HEALTH_INVALID", json.dumps(health)[:300])
    except Exception as exc:
        add_failure(failures, "mcp", origin + "/mcp/health", "HEALTH_HTTP", str(exc))

    failure_counts = Counter(row["code"] for row in failures)
    report = {
        "status": "PASS" if not failures else "FAIL",
        "origin": origin,
        "crawler_user_agents": ua_receipt,
        "catalog_counts": {
            locale: len(catalogs[locale].get("videos", []))
            for locale in ("es", "en")
        },
        "normal_sitemap_counts": {locale: len(normal_locs[locale]) for locale in ("es", "en")},
        "video_sitemap_counts": {locale: len(video_records[locale]) for locale in ("es", "en")},
        "agent_graph_counts": {
            locale: len(graph_payloads[locale].get("items", []))
            for locale in ("es", "en")
        },
        "llms_bytes": llms_receipt,
        "videos_audited": len(audited),
        "assets_probed": len(media_cache),
        "transcript_chars_min": min((row.get("transcript_chars", 0) for row in audited), default=0),
        "videos_with_curated_chapters": sum(1 for row in audited if row.get("chapters", 0) > 0),
        "videos_with_caption_tracks": sum(1 for row in audited if row.get("has_captions")),
        "videos_using_editorial_text_fallback": sum(1 for row in audited if not row.get("has_captions")),
        "failure_count": len(failures),
        "failure_codes": dict(sorted(failure_counts.items())),
        "failures": failures,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"status": "ERROR", "error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        raise
