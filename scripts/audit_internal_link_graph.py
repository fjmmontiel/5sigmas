#!/usr/bin/env python3
"""Audit the built bilingual internal-link graph without Search Console data.

The audit separates three link surfaces instead of treating every <a> equally:

- ``navigation``: global/header/footer/locale/navigation chrome;
- ``body``: links inside the rendered article/page content;
- ``semantic``: the generated ``data-s5-semantic-nav`` learning-path block.

This gives SEO/product QA two different signals:

1. a hard crawl-orphan regression gate for important public surfaces, and
2. a review-only contextual-underlink queue for pages that are technically reachable
   but receive no body/semantic inbound relationship.

The script is intentionally public-data-only. It consumes the already-built ES/EN
site, learning-path manifests and public route contracts; it never reads or infers
Search Console state.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from typing import Any
from urllib.parse import urljoin, urlsplit, urlunsplit

import yaml


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
ORIGIN = "https://5sigmas.com"

IMPORTANT_KINDS = {
    "concept",
    "engineering",
    "series",
    "series-chapter",
    "tool",
    "video-page",
}
GENERIC_ANCHORS = {
    "aqui",
    "aquí",
    "click here",
    "here",
    "learn more",
    "leer mas",
    "leer más",
    "more",
    "read more",
    "ver mas",
    "ver más",
}


def normalize_url(value: str) -> str:
    parsed = urlsplit(str(value or "").strip())
    host = parsed.netloc.lower()
    if host == "www.5sigmas.com":
        host = "5sigmas.com"
    scheme = "https" if host == "5sigmas.com" else parsed.scheme.lower()
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    if path.endswith("/index.html"):
        path = path[: -len("index.html")]
    if not Path(path).suffix and not path.endswith("/"):
        path += "/"
    return urlunsplit((scheme, host, path, "", ""))


def local_html(site_root: Path, locale_prefix: str, url: str) -> Path:
    path = urlsplit(url).path
    if locale_prefix and path.startswith(locale_prefix + "/"):
        path = path[len(locale_prefix) :]
    rel = path.strip("/")
    return site_root / rel / "index.html" if rel else site_root / "index.html"


class LinkSurfaceParser(HTMLParser):
    """Extract anchors and retain whether they belong to body or semantic content."""

    def __init__(self, page_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.stack: list[tuple[bool, bool]] = []
        self.links: list[dict[str, str]] = []
        self.anchor: dict[str, Any] | None = None

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attrs_list}
        classes = set(attrs.get("class", "").split())
        parent_content = self.stack[-1][0] if self.stack else False
        parent_semantic = self.stack[-1][1] if self.stack else False
        content = parent_content or "md-content" in classes or "md-content__inner" in classes
        semantic = parent_semantic or "data-s5-semantic-nav" in attrs
        self.stack.append((content, semantic))

        if tag == "a" and attrs.get("href"):
            self.anchor = {
                "depth": len(self.stack),
                "href": attrs["href"],
                "content": content,
                "semantic": semantic,
                "text": [],
            }

        if tag in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if self.anchor is not None:
            value = re.sub(r"\s+", " ", data).strip()
            if value:
                self.anchor["text"].append(value)

    def handle_endtag(self, tag: str) -> None:
        if not self.stack:
            return
        depth = len(self.stack)
        if tag == "a" and self.anchor is not None and self.anchor["depth"] == depth:
            href = normalize_url(urljoin(self.page_url, self.anchor["href"]))
            surface = "semantic" if self.anchor["semantic"] else ("body" if self.anchor["content"] else "navigation")
            self.links.append(
                {
                    "url": href,
                    "surface": surface,
                    "text": re.sub(r"\s+", " ", " ".join(self.anchor["text"])).strip(),
                }
            )
            self.anchor = None
        self.stack.pop()


@dataclass
class PageMetrics:
    url: str
    kind: str
    inbound_all: int
    inbound_navigation: int
    inbound_body: int
    inbound_semantic: int

    @property
    def inbound_contextual(self) -> int:
        return self.inbound_body + self.inbound_semantic

    def payload(self) -> dict[str, Any]:
        value = asdict(self)
        value["inbound_contextual"] = self.inbound_contextual
        return value


def load_paths(site_root: Path, locale: str) -> dict[str, Any]:
    path = site_root / "agent" / "learning-paths.json"
    if not path.is_file():
        raise AssertionError(f"{locale}: missing semantic path manifest: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("locale") != locale:
        raise AssertionError(f"{locale}: semantic path manifest locale mismatch")
    rows = payload.get("paths") or []
    if not isinstance(rows, list) or len(rows) < 100:
        raise AssertionError(f"{locale}: semantic path manifest unexpectedly small: {len(rows)}")
    return payload


def page_index(paths: dict[str, Any], locale: str) -> dict[str, str]:
    pages: dict[str, str] = {}
    for row in paths.get("paths") or []:
        current = row.get("current") or {}
        url = normalize_url(current.get("url") or "")
        kind = str(current.get("kind") or "page")
        if not url or urlsplit(url).hostname != "5sigmas.com":
            raise AssertionError(f"{locale}: invalid current page URL in semantic graph: {url!r}")
        if url in pages:
            raise AssertionError(f"{locale}: duplicate current page in semantic graph: {url}")
        pages[url] = kind
    return pages


def graph_metrics(site_root: Path, locale: str, locale_prefix: str) -> tuple[list[PageMetrics], dict[str, Any]]:
    paths = load_paths(site_root, locale)
    pages = page_index(paths, locale)
    inbound: dict[str, dict[str, set[str]]] = {
        url: {"navigation": set(), "body": set(), "semantic": set()} for url in pages
    }
    generic_contextual: list[dict[str, str]] = []

    for source_url in sorted(pages):
        html_path = local_html(site_root, locale_prefix, source_url)
        if not html_path.is_file():
            raise AssertionError(f"{locale}: built semantic page missing: {source_url}")
        parser = LinkSurfaceParser(source_url)
        parser.feed(html_path.read_text(encoding="utf-8", errors="replace"))
        parser.close()
        for link in parser.links:
            target = link["url"]
            if target == source_url or target not in pages:
                continue
            inbound[target][link["surface"]].add(source_url)
            if link["surface"] in {"body", "semantic"}:
                anchor = re.sub(r"\s+", " ", link["text"]).strip().casefold()
                if anchor in GENERIC_ANCHORS:
                    generic_contextual.append({"source": source_url, "target": target, "anchor": link["text"]})

    metrics: list[PageMetrics] = []
    for url, kind in sorted(pages.items()):
        surfaces = inbound[url]
        all_sources = surfaces["navigation"] | surfaces["body"] | surfaces["semantic"]
        metrics.append(
            PageMetrics(
                url=url,
                kind=kind,
                inbound_all=len(all_sources),
                inbound_navigation=len(surfaces["navigation"]),
                inbound_body=len(surfaces["body"]),
                inbound_semantic=len(surfaces["semantic"]),
            )
        )

    important = [row for row in metrics if row.kind in IMPORTANT_KINDS]
    crawl_orphans = [row for row in important if row.inbound_all == 0]
    contextual_underlinked = [row for row in important if row.inbound_contextual == 0]
    contextual_single = [row for row in important if row.inbound_contextual == 1]
    by_kind = Counter(row.kind for row in metrics)
    contextual_by_kind = Counter(row.kind for row in important if row.inbound_contextual > 0)

    report = {
        "locale": locale,
        "pages": len(metrics),
        "important_pages": len(important),
        "crawl_orphans": [row.url for row in crawl_orphans],
        "contextual_underlinked": [row.url for row in contextual_underlinked],
        "contextual_single_inbound": [row.url for row in contextual_single],
        "generic_contextual_anchors": generic_contextual,
        "page_kinds": dict(sorted(by_kind.items())),
        "important_with_contextual_inbound": sum(1 for row in important if row.inbound_contextual > 0),
        "contextual_coverage_ratio": round(
            sum(1 for row in important if row.inbound_contextual > 0) / len(important), 4
        ) if important else 1.0,
        "contextual_coverage_by_kind": {
            kind: {
                "covered": contextual_by_kind.get(kind, 0),
                "total": by_kind.get(kind, 0),
            }
            for kind in sorted(IMPORTANT_KINDS)
            if by_kind.get(kind, 0)
        },
        "metrics": [row.payload() for row in metrics],
    }
    return metrics, report


def source_to_route(source: str) -> str:
    path = Path(source)
    if path.name == "index.md":
        rel = path.parent.as_posix().strip(".")
    else:
        rel = path.with_suffix("").as_posix()
    return "/" + rel.strip("/") + ("/" if rel else "")


def english_tool_route_map() -> dict[str, str]:
    path = ROOT / "tools" / "locale-en.yml"
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    mapping: dict[str, str] = {}
    for row in data.get("routes") or []:
        canonical = source_to_route(str(row.get("canonical") or ""))
        localized = source_to_route(str(row.get("localized") or ""))
        mapping["/en" + localized] = canonical
    return mapping


def canonical_es_route(en_url: str, tool_map: dict[str, str]) -> str:
    path = urlsplit(en_url).path
    if path in tool_map:
        return tool_map[path]
    if path == "/en/":
        return "/"
    if path.startswith("/en/"):
        return path[len("/en") :]
    return path


def parity_report(es_metrics: list[PageMetrics], en_metrics: list[PageMetrics]) -> dict[str, Any]:
    es_by_path = {urlsplit(row.url).path: row for row in es_metrics}
    tool_map = english_tool_route_map()
    pairs: list[tuple[PageMetrics, PageMetrics]] = []
    missing: list[dict[str, str]] = []
    kind_mismatches: list[dict[str, str]] = []
    contextual_mismatches: list[dict[str, Any]] = []

    for en_row in en_metrics:
        expected_es = canonical_es_route(en_row.url, tool_map)
        es_row = es_by_path.get(expected_es)
        if es_row is None:
            missing.append({"en": en_row.url, "expected_es_path": expected_es})
            continue
        pairs.append((es_row, en_row))
        if es_row.kind != en_row.kind:
            kind_mismatches.append({"es": es_row.url, "en": en_row.url, "es_kind": es_row.kind, "en_kind": en_row.kind})
        if (es_row.inbound_contextual > 0) != (en_row.inbound_contextual > 0):
            contextual_mismatches.append(
                {
                    "es": es_row.url,
                    "en": en_row.url,
                    "es_contextual_inbound": es_row.inbound_contextual,
                    "en_contextual_inbound": en_row.inbound_contextual,
                }
            )

    pair_ratio = len(pairs) / len(en_metrics) if en_metrics else 1.0
    return {
        "en_pages": len(en_metrics),
        "paired_pages": len(pairs),
        "pair_ratio": round(pair_ratio, 4),
        "missing_es_equivalent": missing,
        "kind_mismatches": kind_mismatches,
        "contextual_presence_mismatches": contextual_mismatches,
    }


def audit(site: Path = SITE) -> tuple[dict[str, Any], list[str]]:
    es_metrics, es_report = graph_metrics(site, "es", "")
    en_metrics, en_report = graph_metrics(site / "en", "en", "/en")
    parity = parity_report(es_metrics, en_metrics)

    failures: list[str] = []
    for report in (es_report, en_report):
        locale = report["locale"]
        if report["crawl_orphans"]:
            failures.append(
                f"{locale}: important pages have zero crawlable inbound links: "
                + ", ".join(report["crawl_orphans"][:10])
            )
        if report["generic_contextual_anchors"]:
            failures.append(
                f"{locale}: body/semantic links use non-descriptive generic anchors: "
                f"{len(report['generic_contextual_anchors'])}"
            )

    if parity["pair_ratio"] < 0.98:
        failures.append(
            "ES/EN graph pairing fell below 98%: "
            f"{parity['paired_pages']}/{parity['en_pages']}"
        )
    if parity["kind_mismatches"]:
        failures.append(f"ES/EN graph kind mismatches: {len(parity['kind_mismatches'])}")

    report = {
        "schema_version": 1,
        "definition": {
            "crawl_orphan": "important built page with zero inbound links from any built semantic-page source",
            "contextual_underlinked": "important built page reachable only through navigation/chrome, with zero body or semantic inbound sources",
            "contextual_policy": "underlinked pages are review-only; public Search Console state is not inferred",
        },
        "es": es_report,
        "en": en_report,
        "parity": parity,
        "failures": failures,
    }
    return report, failures


def main() -> int:
    report, failures = audit()
    output = ROOT / "seo-audit" / "internal-link-graph.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for locale in ("es", "en"):
        row = report[locale]
        print(
            f"Internal-link graph {locale}: {row['pages']} pages; "
            f"crawl orphans={len(row['crawl_orphans'])}; "
            f"contextual underlinked={len(row['contextual_underlinked'])}; "
            f"contextual coverage={row['contextual_coverage_ratio']:.1%}."
        )
    parity = report["parity"]
    print(
        "Internal-link graph parity: "
        f"{parity['paired_pages']}/{parity['en_pages']} EN pages paired to ES "
        f"({parity['pair_ratio']:.1%}); contextual-presence mismatches="
        f"{len(parity['contextual_presence_mismatches'])}."
    )

    if failures:
        print("Internal-link graph audit failed:")
        for failure in failures:
            print(f"  - {failure}")
        print(f"Machine-readable report: {output.relative_to(ROOT)}")
        return 1

    print(f"Internal-link graph audit passed. Machine-readable report: {output.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
