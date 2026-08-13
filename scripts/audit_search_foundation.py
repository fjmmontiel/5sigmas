#!/usr/bin/env python3
"""Audit the built 5sigmas search and machine-readable discovery surface.

The script intentionally checks properties we control at build time:
- indexability, canonical URLs and sitemap consistency
- titles, descriptions and duplicate search titles
- JSON-LD syntax and page-type alignment
- Markdown alternates and llms.txt targets
- internal links and known historical redirects

It does not attempt to predict rankings or emulate Search Console.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit

SITE_ORIGIN = "https://5sigmas.com"
SITE_ROOT = f"{SITE_ORIGIN}/"
SKIP_PREFIXES = ("assets/", "snippets/", "includes/", "search/", "videos/")
REQUIRED_INDEXABLE_PATHS = (
    "temas/index.html",
    "temas/llms/index.html",
    "temas/transformer/index.html",
    "temas/razonamiento/index.html",
    "temas/evaluacion-modelos/index.html",
    "temas/agentes-ia/index.html",
    "temas/prompt-injection/index.html",
)
REQUIRED_HOMEPAGE_TOPIC_PATHS = REQUIRED_INDEXABLE_PATHS[1:]
REQUIRED_MARKDOWN_PATHS = tuple(
    path.removesuffix("index.html") + "index.html.md" for path in REQUIRED_INDEXABLE_PATHS
)


def collapse_space(value: str) -> str:
    return " ".join(value.split())


def normalize_url(value: str) -> str:
    parts = urlsplit(value.strip())
    scheme = parts.scheme.lower()
    netloc = parts.netloc.lower()
    path = re.sub(r"/{2,}", "/", parts.path or "/")
    if path.endswith("/index.html"):
        path = path[: -len("index.html")]
    if not Path(path).suffix and not path.endswith("/"):
        path += "/"
    return urlunsplit((scheme, netloc, path, "", ""))


def is_same_site(url: str) -> bool:
    parts = urlsplit(url)
    return parts.scheme in {"http", "https"} and parts.netloc.lower() == "5sigmas.com"


def local_candidates(site_dir: Path, url: str) -> list[Path]:
    parts = urlsplit(url)
    path = unquote(parts.path).lstrip("/")
    if not path:
        return [site_dir / "index.html"]

    raw = site_dir / path
    candidates = [raw]
    if path.endswith("/"):
        candidates.append(raw / "index.html")
    elif not Path(path).suffix:
        candidates.extend([raw / "index.html", site_dir / f"{path}.html"])
    return candidates


def local_target_exists(site_dir: Path, url: str) -> bool:
    return any(candidate.is_file() for candidate in local_candidates(site_dir, url))


@dataclass
class ParsedPage:
    source: Path
    relative_path: str
    title_chunks: list[str] = field(default_factory=list)
    h1_chunks: list[str] = field(default_factory=list)
    meta: list[dict[str, str]] = field(default_factory=list)
    links: list[dict[str, str]] = field(default_factory=list)
    anchors: list[str] = field(default_factory=list)
    jsonld_texts: list[str] = field(default_factory=list)
    classes: set[str] = field(default_factory=set)
    has_html: bool = False
    has_head: bool = False

    @property
    def title(self) -> str:
        return collapse_space("".join(self.title_chunks))

    @property
    def h1(self) -> str:
        return collapse_space("".join(self.h1_chunks))

    def meta_values(self, key: str, *, attr: str = "name") -> list[str]:
        key = key.lower()
        values: list[str] = []
        for item in self.meta:
            if item.get(attr, "").lower() == key and item.get("content"):
                values.append(item["content"].strip())
        return values

    @property
    def generator(self) -> str:
        values = self.meta_values("generator")
        return values[0] if values else ""

    @property
    def is_material_page(self) -> bool:
        return self.has_html and self.has_head and (
            "mkdocs" in self.generator.lower()
            or "md-content" in self.classes
            or "md-container" in self.classes
        )

    @property
    def is_redirect(self) -> bool:
        for item in self.meta:
            if item.get("http-equiv", "").lower() == "refresh":
                return True
        return False

    @property
    def robots(self) -> str:
        values = self.meta_values("robots")
        return ",".join(values).lower()

    @property
    def noindex(self) -> bool:
        return "noindex" in self.robots

    @property
    def descriptions(self) -> list[str]:
        return self.meta_values("description")

    @property
    def canonicals(self) -> list[str]:
        values: list[str] = []
        for item in self.links:
            rel = set(item.get("rel", "").lower().split())
            if "canonical" in rel and item.get("href"):
                values.append(item["href"].strip())
        return values

    @property
    def markdown_alternates(self) -> list[str]:
        values: list[str] = []
        for item in self.links:
            rel = set(item.get("rel", "").lower().split())
            if (
                "alternate" in rel
                and item.get("type", "").lower() == "text/markdown"
                and item.get("href")
            ):
                values.append(item["href"].strip())
        return values


class PageParser(HTMLParser):
    def __init__(self, source: Path, relative_path: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page = ParsedPage(source=source, relative_path=relative_path)
        self._in_title = False
        self._h1_depth = 0
        self._jsonld_depth = 0
        self._jsonld_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        classes = values.get("class", "").split()
        self.page.classes.update(classes)

        if tag == "html":
            self.page.has_html = True
        elif tag == "head":
            self.page.has_head = True
        elif tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._h1_depth += 1
        elif tag == "meta":
            self.page.meta.append(values)
        elif tag == "link":
            self.page.links.append(values)
        elif tag == "a" and values.get("href"):
            self.page.anchors.append(values["href"])
        elif tag == "script" and values.get("type", "").lower() == "application/ld+json":
            self._jsonld_depth += 1
            self._jsonld_chunks = []

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title":
            self._in_title = False
        elif tag == "h1" and self._h1_depth:
            self._h1_depth -= 1
        elif tag == "script" and self._jsonld_depth:
            self._jsonld_depth -= 1
            self.page.jsonld_texts.append("".join(self._jsonld_chunks).strip())
            self._jsonld_chunks = []

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.page.title_chunks.append(data)
        if self._h1_depth:
            self.page.h1_chunks.append(data)
        if self._jsonld_depth:
            self._jsonld_chunks.append(data)


def parse_page(path: Path, site_dir: Path) -> ParsedPage:
    relative = path.relative_to(site_dir).as_posix()
    parser = PageParser(path, relative)
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    parser.close()
    return parser.page


def read_sitemap(site_dir: Path) -> tuple[set[str], list[str]]:
    path = site_dir / "sitemap.xml"
    if not path.is_file():
        return set(), ["Missing site/sitemap.xml"]
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        return set(), [f"Invalid sitemap.xml: {exc}"]
    locations = {
        normalize_url(node.text or "")
        for node in root.findall(".//{*}loc")
        if (node.text or "").strip()
    }
    return locations, []


def collect_schema_types(value: Any) -> set[str]:
    result: set[str] = set()
    if isinstance(value, dict):
        schema_type = value.get("@type")
        if isinstance(schema_type, str):
            result.add(schema_type)
        elif isinstance(schema_type, list):
            result.update(item for item in schema_type if isinstance(item, str))
        for child in value.values():
            result.update(collect_schema_types(child))
    elif isinstance(value, list):
        for child in value:
            result.update(collect_schema_types(child))
    return result


def iter_dicts(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_dicts(child)


def expected_schema_types(canonical: str) -> set[str]:
    path = urlsplit(canonical).path
    if path == "/":
        return {"WebSite", "Organization", "Person"}
    if path == "/meta/about/":
        return {"ProfilePage", "Person"}
    if path in {"/series/", "/articulos-tecnicos/", "/temas/", "/visuales/"}:
        return {"CollectionPage"}
    if re.fullmatch(r"/series/[^/]+/00_presentacion_serie/", path):
        return {"CollectionPage", "CreativeWorkSeries"}
    if path.startswith(("/series/", "/articulos-tecnicos/", "/temas/")):
        return {"TechArticle"}
    return {"WebPage"}


def resolve_internal(base_url: str, href: str) -> str | None:
    href = href.strip()
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    absolute = urljoin(base_url, href)
    parts = urlsplit(absolute)
    if parts.scheme not in {"http", "https"} or parts.netloc.lower() != "5sigmas.com":
        return None
    return urlunsplit(("https", "5sigmas.com", parts.path or "/", "", ""))


def audit(site_dir: Path) -> tuple[list[str], list[str], dict[str, int]]:
    errors: list[str] = []
    warnings: list[str] = []
    stats: Counter[str] = Counter()

    if not site_dir.is_dir():
        return [f"Build directory does not exist: {site_dir}"], [], {}

    sitemap, sitemap_errors = read_sitemap(site_dir)
    errors.extend(sitemap_errors)

    pages: list[ParsedPage] = []
    for path in site_dir.rglob("*.html"):
        relative = path.relative_to(site_dir).as_posix()
        if relative == "404.html" or relative.startswith(SKIP_PREFIXES):
            continue
        page = parse_page(path, site_dir)
        if page.is_material_page:
            pages.append(page)

    stats["material_pages"] = len(pages)
    indexable_pages: list[ParsedPage] = []
    titles: defaultdict[str, list[str]] = defaultdict(list)
    descriptions: defaultdict[str, list[str]] = defaultdict(list)
    canonical_to_page: dict[str, ParsedPage] = {}
    outgoing: defaultdict[str, set[str]] = defaultdict(set)

    for page in pages:
        if page.is_redirect:
            stats["redirect_pages"] += 1
            continue

        if len(page.canonicals) != 1:
            errors.append(
                f"{page.relative_path}: expected exactly one canonical, found {len(page.canonicals)}"
            )
            continue

        canonical = normalize_url(page.canonicals[0])
        if not is_same_site(canonical):
            errors.append(f"{page.relative_path}: canonical is not on {SITE_ORIGIN}: {canonical}")
            continue
        canonical_to_page[canonical] = page

        if page.noindex:
            stats["noindex_pages"] += 1
            if canonical in sitemap:
                errors.append(f"{page.relative_path}: noindex URL is still present in sitemap: {canonical}")
            continue

        stats["indexable_pages"] += 1
        indexable_pages.append(page)

        if not page.title:
            errors.append(f"{page.relative_path}: missing non-empty <title>")
        else:
            titles[page.title.casefold()].append(page.relative_path)
            if len(page.title) < 25:
                warnings.append(f"{page.relative_path}: search title is short ({len(page.title)} chars): {page.title}")
            elif len(page.title) > 75:
                warnings.append(f"{page.relative_path}: search title is long ({len(page.title)} chars): {page.title}")

        if not page.h1:
            errors.append(f"{page.relative_path}: missing non-empty <h1>")

        if len(page.descriptions) != 1 or not page.descriptions[0].strip():
            errors.append(
                f"{page.relative_path}: expected exactly one non-empty meta description, found {len(page.descriptions)}"
            )
        else:
            description = collapse_space(page.descriptions[0])
            descriptions[description.casefold()].append(page.relative_path)
            if len(description) < 70:
                warnings.append(
                    f"{page.relative_path}: meta description is short ({len(description)} chars)"
                )
            elif len(description) > 180:
                warnings.append(
                    f"{page.relative_path}: meta description is long ({len(description)} chars)"
                )

        if "nosnippet" in page.robots or re.search(r"max-snippet\s*:\s*0", page.robots):
            errors.append(f"{page.relative_path}: indexable page blocks snippets: {page.robots}")
        if "max-image-preview:large" not in page.robots:
            warnings.append(f"{page.relative_path}: robots metadata does not request large image previews")

        legacy_article_properties = [
            item.get("property", "")
            for item in page.meta
            if item.get("property", "").lower().startswith("og:article:")
        ]
        if legacy_article_properties:
            errors.append(
                f"{page.relative_path}: invalid Open Graph article property prefix: "
                f"{', '.join(legacy_article_properties)}"
            )
        expected_og_type = "article" if "TechArticle" in expected_schema_types(canonical) else "website"
        og_types = [value.lower() for value in page.meta_values("og:type", attr="property")]
        if og_types != [expected_og_type]:
            errors.append(
                f"{page.relative_path}: expected og:type={expected_og_type}, found {og_types or 'none'}"
            )

        if canonical not in sitemap:
            errors.append(f"{page.relative_path}: indexable canonical missing from sitemap: {canonical}")

        if len(page.markdown_alternates) != 1:
            errors.append(
                f"{page.relative_path}: expected one text/markdown alternate, found {len(page.markdown_alternates)}"
            )
        else:
            markdown_url = page.markdown_alternates[0]
            if not is_same_site(markdown_url):
                errors.append(f"{page.relative_path}: Markdown alternate is off-site: {markdown_url}")
            elif not local_target_exists(site_dir, markdown_url):
                errors.append(f"{page.relative_path}: Markdown alternate does not exist: {markdown_url}")

        if not page.jsonld_texts:
            errors.append(f"{page.relative_path}: missing JSON-LD")
        schema_objects: list[Any] = []
        for index, payload in enumerate(page.jsonld_texts, start=1):
            try:
                schema_objects.append(json.loads(payload))
            except json.JSONDecodeError as exc:
                errors.append(f"{page.relative_path}: invalid JSON-LD block {index}: {exc}")
        schema_types: set[str] = set()
        for payload in schema_objects:
            schema_types.update(collect_schema_types(payload))
        missing_types = expected_schema_types(canonical) - schema_types
        if missing_types:
            errors.append(
                f"{page.relative_path}: JSON-LD missing expected type(s): {', '.join(sorted(missing_types))}"
            )

        for payload in schema_objects:
            for node in iter_dicts(payload):
                if node.get("@type") != "TechArticle":
                    continue
                image = node.get("image")
                image_url = image.get("url") if isinstance(image, dict) else image
                if not isinstance(image_url, str) or not image_url.startswith(f"{SITE_ORIGIN}/assets/images/social/"):
                    errors.append(
                        f"{page.relative_path}: TechArticle image URL is missing or malformed: {image_url!r}"
                    )
                elif not local_target_exists(site_dir, image_url):
                    errors.append(
                        f"{page.relative_path}: TechArticle image does not exist in the build: {image_url}"
                    )

        for href in page.anchors:
            target = resolve_internal(canonical, href)
            if target is None:
                continue
            normalized_target = normalize_url(target)
            outgoing[canonical].add(normalized_target)
            if not local_target_exists(site_dir, target):
                errors.append(f"{page.relative_path}: broken internal link: {href} -> {target}")

    for title, paths in sorted(titles.items()):
        if len(paths) > 1:
            errors.append(f"Duplicate indexable <title> across {', '.join(paths)}: {title}")

    for description, paths in sorted(descriptions.items()):
        if len(paths) > 1:
            warnings.append(
                f"Duplicate meta description across {', '.join(paths)}: {description[:100]}"
            )

    incoming: Counter[str] = Counter()
    for targets in outgoing.values():
        incoming.update(targets)
    for relative in REQUIRED_INDEXABLE_PATHS:
        path = site_dir / relative
        if not path.is_file():
            errors.append(f"Missing required organic-search page: {relative}")
            continue
        canonical_path = "/" + relative.removesuffix("index.html")
        canonical = normalize_url(f"{SITE_ORIGIN}{canonical_path}")
        page = canonical_to_page.get(canonical)
        if page is None or page.noindex:
            errors.append(f"Required organic-search page is not indexable: {canonical}")
        if canonical != SITE_ROOT and incoming[canonical] == 0:
            errors.append(f"Required organic-search page has no internal incoming links: {canonical}")

    homepage_links = outgoing.get(SITE_ROOT, set())
    for relative in REQUIRED_HOMEPAGE_TOPIC_PATHS:
        canonical = normalize_url(f"{SITE_ORIGIN}/{relative.removesuffix('index.html')}")
        if canonical not in homepage_links:
            errors.append(f"Homepage is missing a direct crawlable link to: {canonical}")

    for relative in REQUIRED_MARKDOWN_PATHS:
        if not (site_dir / relative).is_file():
            errors.append(f"Missing required Markdown mirror: {relative}")

    markdown_mirrors = list(site_dir.rglob("*.html.md"))
    stats["markdown_mirrors"] = len(markdown_mirrors)
    for mirror in markdown_mirrors:
        html_peer = Path(str(mirror)[: -len(".md")])
        if not html_peer.is_file():
            errors.append(
                f"Markdown mirror has no public HTML peer and may expose excluded content: "
                f"{mirror.relative_to(site_dir).as_posix()}"
            )

    llms_path = site_dir / "llms.txt"
    if not llms_path.is_file():
        errors.append("Missing /llms.txt")
    else:
        stats["llms_links"] = 0
        llms_text = llms_path.read_text(encoding="utf-8")
        links = re.findall(r"\[[^\]]+\]\((https://5sigmas\.com/[^)]+)\)", llms_text)
        stats["llms_links"] = len(links)
        if len(links) < 10:
            errors.append(f"llms.txt exposes too few first-party links: {len(links)}")
        for link in links:
            if not local_target_exists(site_dir, link):
                errors.append(f"llms.txt points to a missing build target: {link}")

    robots_path = site_dir / "robots.txt"
    if not robots_path.is_file():
        errors.append("Missing /robots.txt")
    else:
        robots_text = robots_path.read_text(encoding="utf-8")
        if re.search(r"(?im)^\s*Disallow:\s*/\s*$", robots_text):
            errors.append("robots.txt blocks the entire site")
        if "Sitemap: https://5sigmas.com/sitemap.xml" not in robots_text:
            errors.append("robots.txt does not advertise the canonical sitemap")

    roadmaps_candidates = [
        site_dir / "roadmaps" / "index.html",
        site_dir / "roadmaps.html",
    ]
    roadmaps = next((path for path in roadmaps_candidates if path.is_file()), None)
    if roadmaps is None:
        errors.append("Missing historical /roadmaps/ redirect")
    else:
        redirect_text = roadmaps.read_text(encoding="utf-8", errors="replace")
        if "series/" not in redirect_text or "refresh" not in redirect_text.lower():
            errors.append("Historical /roadmaps/ page does not redirect to /series/")

    sitemap_without_page = sorted(
        url for url in sitemap if url != SITE_ROOT and not local_target_exists(site_dir, url)
    )
    for url in sitemap_without_page:
        errors.append(f"Sitemap URL has no built target: {url}")

    stats["sitemap_urls"] = len(sitemap)
    stats["errors"] = len(errors)
    stats["warnings"] = len(warnings)
    return errors, warnings, dict(stats)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "site_dir",
        nargs="?",
        default="site",
        type=Path,
        help="MkDocs build directory (default: site)",
    )
    args = parser.parse_args()

    errors, warnings, stats = audit(args.site_dir)

    print("Search foundation audit")
    for key in sorted(stats):
        print(f"  {key}: {stats[key]}")

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if errors:
        print("\nErrors:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("\nSearch foundation audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
