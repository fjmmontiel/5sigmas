"""Generate a machine-readable knowledge graph from the pages MkDocs actually deploys.

The graph is intentionally derived from rendered output instead of a manually maintained
manifest. This keeps WebMCP coverage aligned with the public site: pages, meaningful
images/SVGs, animation shells, videos, internal relationships and external evidence links
are indexed only when they are part of the built locale.
"""

from __future__ import annotations

from collections import Counter
from hashlib import sha1
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from typing import Any
from urllib.parse import urljoin, urlsplit, urlunsplit

_PAGES: list[dict[str, Any]] = []

_SKIP_TAGS = {"script", "style", "noscript", "template"}
_IMAGE_EXCLUSIONS = (
    "/assets/logo",
    "/assets/favicon",
    "/assets/images/social/",
    "material/",
)


def _text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _locale(config: Any) -> str:
    extra = config.get("extra") or {}
    configured = _text(extra.get("content_language")).lower()
    if configured:
        return configured
    theme = config.get("theme")
    language = getattr(theme, "language", None)
    if language:
        return _text(language).lower()
    if isinstance(theme, dict):
        return _text(theme.get("language") or "es").lower()
    return "es"


def _without_fragment(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))


def _normal_route(url: str) -> str:
    path = urlsplit(url).path or "/"
    path = re.sub(r"/index\.html$", "/", path)
    path = re.sub(r"/{2,}", "/", path)
    if not Path(path).suffix and not path.endswith("/"):
        path += "/"
    return path


def _slug(value: str) -> str:
    clean = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return clean[:72] or "item"


def _stable_id(prefix: str, locale: str, page_url: str, discriminator: str = "") -> str:
    route = _normal_route(page_url).strip("/") or "home"
    digest = sha1(f"{locale}|{route}|{prefix}|{discriminator}".encode("utf-8")).hexdigest()[:10]
    return f"{prefix}:{locale}:{_slug(route)}:{digest}"


def _classify_page(path: str) -> str:
    route = _normal_route(path)
    parts = [part for part in route.strip("/").split("/") if part]
    if parts and parts[0] == "en":
        parts = parts[1:]
    if not parts:
        return "home"
    if parts[0] in {"herramientas", "tools"}:
        return "tool" if len(parts) > 1 else "tool-hub"
    if parts[0] == "series":
        if len(parts) >= 3 and parts[-1] == "00_presentacion_serie":
            return "series"
        return "series-chapter" if len(parts) >= 3 else "series-hub"
    if parts[0] == "temas":
        return "concept" if len(parts) > 1 else "concept-hub"
    if parts[0] == "articulos-tecnicos":
        return "engineering" if len(parts) > 1 else "engineering-hub"
    if parts[0] == "videos":
        return "video-page" if len(parts) > 1 else "video-hub"
    if parts[0] == "visuales":
        return "visual-hub" if len(parts) == 1 else "visual-page"
    if parts[0] == "meta":
        return "meta"
    return "page"


def _is_external(url: str, site_host: str) -> bool:
    parsed = urlsplit(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc) and parsed.netloc != site_host


def _is_meaningful_image(url: str) -> bool:
    lower = url.lower()
    return not any(marker in lower for marker in _IMAGE_EXCLUSIONS)


class _RenderedPageParser(HTMLParser):
    def __init__(self, page_url: str, site_host: str):
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.site_host = site_host
        self.stack: list[dict[str, Any]] = []
        self.body_text: list[str] = []
        self.headings: list[dict[str, str]] = []
        self.last_heading = ""
        self.links: list[dict[str, str]] = []
        self.visuals: list[dict[str, Any]] = []
        self._heading: dict[str, Any] | None = None
        self._anchor: dict[str, Any] | None = None
        self._animation: dict[str, Any] | None = None
        self._figure_caption: dict[str, Any] | None = None
        self._video_stack: list[dict[str, Any]] = []

    def _in_content(self) -> bool:
        return bool(self.stack and self.stack[-1]["content"])

    def _skipped(self) -> bool:
        return bool(self.stack and self.stack[-1]["skip"])

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: (value or "") for key, value in attrs_list}
        classes = set(attrs.get("class", "").split())
        parent_content = self.stack[-1]["content"] if self.stack else False
        parent_skip = self.stack[-1]["skip"] if self.stack else False
        content = parent_content or "md-content" in classes or "md-content__inner" in classes
        skip = parent_skip or tag in _SKIP_TAGS
        self.stack.append({"tag": tag, "content": content, "skip": skip})

        if not content or skip:
            return

        depth = len(self.stack)
        if tag in {"h1", "h2", "h3"}:
            self._heading = {"depth": depth, "level": tag, "id": attrs.get("id", ""), "text": []}

        if tag == "a" and attrs.get("href"):
            self._anchor = {"depth": depth, "href": attrs["href"], "text": []}

        if tag == "figcaption":
            self._figure_caption = {"depth": depth, "text": []}

        is_animation = "data-anim-shell" in attrs or "anim-brand-shell" in classes
        if is_animation and self._animation is None:
            self._animation = {
                "depth": depth,
                "id": attrs.get("id", ""),
                "variant": attrs.get("data-anim-variant", ""),
                "fullscreen": attrs.get("data-anim-fullscreen", ""),
                "heading": self.last_heading,
                "text": [],
                "assets": [],
            }

        if tag == "img" and attrs.get("src"):
            src = urljoin(self.page_url, attrs["src"])
            if _is_meaningful_image(src):
                record = {
                    "kind": "image",
                    "asset_url": src,
                    "alt": _text(attrs.get("alt")),
                    "title": _text(attrs.get("title")) or self.last_heading,
                    "heading": self.last_heading,
                }
                self.visuals.append(record)
                if self._animation is not None:
                    self._animation["assets"].append(src)

        if tag == "svg" and self._animation is None:
            self.visuals.append(
                {
                    "kind": "svg",
                    "asset_url": "",
                    "fragment": attrs.get("id", ""),
                    "title": _text(attrs.get("aria-label")) or self.last_heading,
                    "heading": self.last_heading,
                }
            )

        if tag == "video":
            video = {
                "depth": depth,
                "kind": "video",
                "asset_url": urljoin(self.page_url, attrs["src"]) if attrs.get("src") else "",
                "poster_url": urljoin(self.page_url, attrs["poster"]) if attrs.get("poster") else "",
                "title": _text(attrs.get("title") or attrs.get("aria-label")) or self.last_heading,
                "heading": self.last_heading,
                "sources": [],
            }
            self._video_stack.append(video)

        if tag == "source" and self._video_stack and attrs.get("src"):
            self._video_stack[-1]["sources"].append(
                {
                    "url": urljoin(self.page_url, attrs["src"]),
                    "type": _text(attrs.get("type")),
                }
            )

    def handle_startendtag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs_list)
        self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if not self._in_content() or self._skipped():
            return
        value = _text(data)
        if not value:
            return
        self.body_text.append(value)
        if self._heading is not None:
            self._heading["text"].append(value)
        if self._anchor is not None:
            self._anchor["text"].append(value)
        if self._animation is not None:
            self._animation["text"].append(value)
        if self._figure_caption is not None:
            self._figure_caption["text"].append(value)

    def handle_endtag(self, tag: str) -> None:
        if not self.stack:
            return
        depth = len(self.stack)

        if self._heading is not None and self._heading["depth"] == depth and tag == self._heading["level"]:
            value = _text(" ".join(self._heading["text"]))
            if value:
                self.last_heading = value
                self.headings.append({"level": self._heading["level"], "id": self._heading["id"], "text": value})
            self._heading = None

        if self._anchor is not None and self._anchor["depth"] == depth and tag == "a":
            href = urljoin(self.page_url, self._anchor["href"])
            label = _text(" ".join(self._anchor["text"])) or href
            if href.startswith(("http://", "https://")):
                self.links.append({"url": href, "label": label})
            self._anchor = None

        if self._figure_caption is not None and self._figure_caption["depth"] == depth and tag == "figcaption":
            caption = _text(" ".join(self._figure_caption["text"]))
            if caption and self.visuals:
                self.visuals[-1]["caption"] = caption
                if not self.visuals[-1].get("title"):
                    self.visuals[-1]["title"] = caption
            self._figure_caption = None

        if self._animation is not None and self._animation["depth"] == depth:
            animation = self._animation
            self.visuals.append(
                {
                    "kind": "animation",
                    "asset_url": "",
                    "fragment": animation["id"],
                    "title": animation["heading"] or "Interactive visual",
                    "heading": animation["heading"],
                    "variant": animation["variant"],
                    "fullscreen": animation["fullscreen"],
                    "text": _text(" ".join(animation["text"]))[:4000],
                    "assets": sorted(set(animation["assets"])),
                }
            )
            self._animation = None

        if self._video_stack and self._video_stack[-1]["depth"] == depth and tag == "video":
            video = self._video_stack.pop()
            if not video["asset_url"] and video["sources"]:
                video["asset_url"] = video["sources"][0]["url"]
            self.visuals.append({key: value for key, value in video.items() if key != "depth"})

        self.stack.pop()


def _dedupe_records(records: list[dict[str, Any]], key_fields: tuple[str, ...]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    seen: set[tuple[object, ...]] = set()
    for record in records:
        key = tuple(record.get(field) for field in key_fields)
        if key in seen:
            continue
        seen.add(key)
        result.append(record)
    return result


def on_config(config, **kwargs):
    _PAGES.clear()
    return config


def on_post_page(output: str, page, config, **kwargs) -> str:
    locale = _locale(config)
    canonical = getattr(page, "canonical_url", None) or urljoin(str(config.get("site_url") or "https://5sigmas.com/"), page.url)
    canonical = _without_fragment(canonical)
    host = urlsplit(str(config.get("site_url") or canonical)).netloc or "5sigmas.com"
    parser = _RenderedPageParser(canonical, host)
    parser.feed(output)
    parser.close()

    meta = page.meta or {}
    keywords = meta.get("keywords") or []
    if isinstance(keywords, str):
        keywords = [part.strip() for part in keywords.split(",") if part.strip()]
    tags = meta.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]

    links = _dedupe_records(parser.links, ("url",))
    external = [record for record in links if _is_external(record["url"], host)]
    internal = [record for record in links if not _is_external(record["url"], host)]
    visuals = _dedupe_records(parser.visuals, ("kind", "asset_url", "fragment", "title"))

    page_id = _stable_id("page", locale, canonical)
    _PAGES.append(
        {
            "id": page_id,
            "kind": _classify_page(canonical),
            "locale": locale,
            "title": _text(page.title),
            "description": _text(meta.get("description")),
            "url": canonical,
            "route": _normal_route(canonical),
            "markdown_url": canonical.rstrip("/") + "/index.html.md" if canonical.rstrip("/") else canonical + "index.html.md",
            "source_path": _text(getattr(page.file, "src_path", "")),
            "keywords": keywords,
            "tags": tags,
            "headings": parser.headings[:80],
            "text_excerpt": _text(" ".join(parser.body_text))[:12000],
            "internal_links": internal[:200],
            "external_sources": external[:200],
            "visuals": visuals[:200],
        }
    )
    return output


def on_post_build(config, **kwargs) -> None:
    locale = _locale(config)
    site_dir = Path(config["site_dir"])
    output_dir = site_dir / "agent"
    output_dir.mkdir(parents=True, exist_ok=True)

    pages = [page for page in _PAGES if page["locale"] == locale]
    route_to_page = {page["route"]: page["id"] for page in pages}
    items: list[dict[str, Any]] = []

    for page in pages:
        page_copy = {key: value for key, value in page.items() if key not in {"visuals", "external_sources", "internal_links"}}
        related_ids: list[str] = []
        for link in page["internal_links"]:
            route = _normal_route(link["url"])
            target = route_to_page.get(route)
            if target and target != page["id"] and target not in related_ids:
                related_ids.append(target)
        page_copy["related_item_ids"] = related_ids[:80]
        page_copy["visual_item_ids"] = []
        page_copy["evidence_item_ids"] = []
        items.append(page_copy)

        for index, visual in enumerate(page["visuals"], start=1):
            discriminator = f"{index}|{visual.get('kind')}|{visual.get('asset_url')}|{visual.get('fragment')}|{visual.get('title')}"
            item_id = _stable_id("visual", locale, page["url"], discriminator)
            visual_item = {
                "id": item_id,
                "kind": visual.get("kind") or "visual",
                "locale": locale,
                "title": _text(visual.get("title")) or _text(visual.get("alt")) or f"Visual from {page['title']}",
                "description": _text(visual.get("caption") or visual.get("alt") or visual.get("text"))[:4000],
                "url": page["url"] + (f"#{visual['fragment']}" if visual.get("fragment") else ""),
                "asset_url": visual.get("asset_url") or "",
                "poster_url": visual.get("poster_url") or "",
                "assets": visual.get("assets") or [],
                "sources": visual.get("sources") or [],
                "heading": _text(visual.get("heading")),
                "parent_id": page["id"],
                "parent_title": page["title"],
                "parent_url": page["url"],
                "markdown_url": page["markdown_url"],
                "keywords": page["keywords"],
                "tags": page["tags"],
            }
            items.append(visual_item)
            page_copy["visual_item_ids"].append(item_id)

        for index, source in enumerate(page["external_sources"], start=1):
            discriminator = f"{index}|{source['url']}"
            item_id = _stable_id("evidence", locale, page["url"], discriminator)
            evidence_item = {
                "id": item_id,
                "kind": "evidence",
                "locale": locale,
                "title": _text(source["label"]) or urlsplit(source["url"]).netloc,
                "description": f"External source referenced by {page['title']}",
                "url": source["url"],
                "domain": urlsplit(source["url"]).netloc,
                "parent_id": page["id"],
                "parent_title": page["title"],
                "parent_url": page["url"],
            }
            items.append(evidence_item)
            page_copy["evidence_item_ids"].append(item_id)

    counts = Counter(item["kind"] for item in items)
    payload = {
        "schema_version": 2,
        "locale": locale,
        "site": _text(config.get("site_name") or "5sigmas"),
        "site_url": _text(config.get("site_url") or "https://5sigmas.com"),
        "description": "Machine-readable graph of the 5sigmas knowledge actually deployed in this locale.",
        "counts": dict(sorted(counts.items())),
        "total_items": len(items),
        "items": items,
    }
    (output_dir / "knowledge.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
