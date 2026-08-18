#!/usr/bin/env python3
"""Crawl the published SEO surface and emit machine-readable audit artifacts.

The audit is deliberately deterministic and dependency-free. It can inspect a
local MkDocs build or the deployed site, but it never changes Search Console or
the site itself. A page is classified exactly once as INDEX, NOINDEX, REDIRECT,
or GONE/404.
"""

from __future__ import annotations

import argparse
import csv
import http.client
import json
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field, asdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlsplit, urlunsplit


ORIGIN = "https://5sigmas.com"
DEFAULT_USER_AGENT = "5sigmas-seo-audit/1.0 (+build verification)"
CLASSIFICATIONS = ("INDEX", "NOINDEX", "REDIRECT", "GONE/404")
SITEMAP_NAMES = ("sitemap.xml", "en/sitemap.xml", "video-sitemap.xml")


def normalize_url(value: str) -> str:
    parts = urlsplit(value.strip())
    host = parts.netloc.lower()
    scheme = "https" if host in {"5sigmas.com", "www.5sigmas.com"} else parts.scheme.lower()
    if host == "www.5sigmas.com":
        host = "5sigmas.com"
    path = re.sub(r"/{2,}", "/", parts.path or "/")
    if path.endswith("/index.html"):
        path = path[: -len("index.html")]
    if not Path(path).suffix and not path.endswith("/"):
        path += "/"
    return urlunsplit((scheme, host, path, "", ""))


def same_site(url: str) -> bool:
    return urlsplit(url).netloc.lower() in {"5sigmas.com", "www.5sigmas.com"}


def local_candidates(root: Path, url: str) -> list[Path]:
    path = urlsplit(url).path.lstrip("/")
    if not path:
        return [root / "index.html"]
    raw = root / path
    candidates = [raw]
    if path.endswith("/"):
        candidates.append(raw / "index.html")
    elif not Path(path).suffix:
        candidates.extend((raw / "index.html", root / f"{path}.html"))
    return candidates


@dataclass
class ParsedPage:
    url: str
    status: int
    final_url: str
    error: str = ""
    title: str = ""
    description: str = ""
    robots: str = ""
    language: str = ""
    canonicals: list[str] = field(default_factory=list)
    hreflang: list[dict[str, str]] = field(default_factory=list)
    links: list[dict[str, str]] = field(default_factory=list)
    meta_refresh: str = ""
    in_sitemap: bool = False
    sitemap_names: list[str] = field(default_factory=list)
    classification: str = "GONE/404"

    @property
    def canonical(self) -> str:
        return self.canonicals[0] if len(self.canonicals) == 1 else ""


class PageParser(HTMLParser):
    def __init__(self, url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page = ParsedPage(url=url, status=0, final_url=url)
        self._title = False
        self._title_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        if tag == "html":
            self.page.language = values.get("lang", "").strip().lower()
        elif tag == "title":
            self._title = True
        elif tag == "meta":
            name = values.get("name", "").lower()
            if name == "description":
                self.page.description = values.get("content", "").strip()
            elif name in {"robots", "googlebot"} and values.get("content"):
                self.page.robots = ",".join(filter(None, (self.page.robots, values["content"]))).lower()
            elif values.get("http-equiv", "").lower() == "refresh":
                self.page.meta_refresh = values.get("content", "").strip()
        elif tag == "link":
            rel = {item.lower() for item in values.get("rel", "").split()}
            href = values.get("href", "").strip()
            if "canonical" in rel and href:
                self.page.canonicals.append(href)
            if "alternate" in rel and values.get("hreflang") and href:
                self.page.hreflang.append({"lang": values["hreflang"].lower(), "href": href})
        elif tag == "a" and values.get("href"):
            self.page.links.append({"href": values["href"], "text": ""})

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title":
            self._title = False

    def handle_data(self, data: str) -> None:
        if self._title:
            self._title_chunks.append(data)

    def finish(self) -> ParsedPage:
        self.page.title = " ".join("".join(self._title_chunks).split())
        self.page.links = [dict(link, text=" ".join(link["href"].split())) for link in self.page.links]
        return self.page


def classify(page: ParsedPage) -> str:
    if page.status >= 400 or page.status == 0:
        return "GONE/404"
    if 300 <= page.status < 400 or page.meta_refresh:
        return "REDIRECT"
    if "noindex" in page.robots:
        return "NOINDEX"
    return "INDEX"


class SiteReader:
    def __init__(self, *, root: Path | None, base_url: str, timeout: int, workers: int) -> None:
        self.root = root
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.workers = workers

    def url_for_path(self, path: str) -> str:
        return normalize_url(urljoin(self.base_url + "/", path.lstrip("/")))

    def fetch(self, url: str) -> ParsedPage:
        url = normalize_url(url)
        if self.root is not None:
            candidates = local_candidates(self.root, url)
            path = next((item for item in candidates if item.is_file()), None)
            if path is None:
                return ParsedPage(url=url, status=404, final_url=url, classification="GONE/404")
            try:
                body = path.read_text(encoding="utf-8", errors="replace")
            except OSError as exc:
                return ParsedPage(url=url, status=0, final_url=url, error=str(exc), classification="GONE/404")
            parser = PageParser(url)
            parser.feed(body)
            page = parser.finish()
            page.status = 200
            page.final_url = url
            page.classification = classify(page)
            return page

        request = urllib.request.Request(url, headers={"User-Agent": DEFAULT_USER_AGENT})
        body = b""
        final_url = url
        status = 0
        error = ""
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    body = response.read()
                    final_url = normalize_url(response.geturl())
                    status = response.status
                if status < 500:
                    break
            except urllib.error.HTTPError as exc:
                body = exc.read()
                final_url = normalize_url(exc.geturl() or url)
                status = exc.code
                error = str(exc)
                if status < 500:
                    break
            except (OSError, urllib.error.URLError, http.client.HTTPException) as exc:
                error = str(exc)
            if attempt < 2:
                time.sleep(0.4 * (attempt + 1))
        if status == 0:
            return ParsedPage(url=url, status=0, final_url=url, error=error, classification="GONE/404")
        parser = PageParser(url)
        parser.feed(body.decode("utf-8", errors="replace"))
        page = parser.finish()
        page.status = status
        page.final_url = final_url
        page.error = error
        page.classification = classify(page)
        if final_url != url and status < 400:
            page.classification = "REDIRECT"
        return page


def sitemap_urls(reader: SiteReader) -> tuple[set[str], dict[str, set[str]], list[str]]:
    urls: set[str] = set()
    names_by_url: defaultdict[str, set[str]] = defaultdict(set)
    errors: list[str] = []
    for name in SITEMAP_NAMES:
        sitemap_url = reader.url_for_path(name)
        if reader.root is not None:
            path = reader.root / name
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
        else:
            try:
                with urllib.request.urlopen(urllib.request.Request(sitemap_url, headers={"User-Agent": DEFAULT_USER_AGENT}), timeout=reader.timeout) as response:
                    text = response.read().decode("utf-8", errors="replace")
            except (OSError, urllib.error.URLError) as exc:
                errors.append(f"{name}: {exc}")
                continue
        try:
            root = ET.fromstring(text)
        except ET.ParseError as exc:
            errors.append(f"{name}: invalid XML: {exc}")
            continue
        for node in root.findall(".//{*}loc"):
            value = (node.text or "").strip()
            if not value:
                continue
            normalized = normalize_url(value)
            urls.add(normalized)
            names_by_url[normalized].add(name)
    return urls, names_by_url, errors


def internal_target(source: str, href: str) -> str | None:
    href = href.strip()
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    target = urljoin(source, href)
    if not same_site(target):
        return None
    if urlsplit(target).path.startswith("/cdn-cgi/"):
        return None
    return normalize_url(target)


def write_csv(path: Path, rows: Iterable[dict[str, object]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def crawl(reader: SiteReader) -> dict[str, object]:
    sitemap_set, sitemap_names, sitemap_errors = sitemap_urls(reader)
    seeds = set(sitemap_set)
    seeds.add(reader.url_for_path("/"))
    pages: dict[str, ParsedPage] = {}
    pending = deque(sorted(seeds))
    seen: set[str] = set()
    while pending:
        batch: list[str] = []
        while pending and len(batch) < 32:
            url = pending.popleft()
            if url not in seen:
                seen.add(url)
                batch.append(url)
        if not batch:
            continue
        with ThreadPoolExecutor(max_workers=reader.workers) as pool:
            futures = {pool.submit(reader.fetch, url): url for url in batch}
            for future in as_completed(futures):
                page = future.result()
                page.in_sitemap = page.url in sitemap_set
                page.sitemap_names = sorted(sitemap_names.get(page.url, set()))
                pages[page.url] = page
                for link in page.links:
                    target = internal_target(page.url, link["href"])
                    if target and target not in seen:
                        pending.append(target)

    incoming: Counter[str] = Counter()
    broken_links: list[dict[str, object]] = []
    redirect_links: list[dict[str, object]] = []
    for page in pages.values():
        for link in page.links:
            target = internal_target(page.url, link["href"])
            if not target:
                continue
            incoming[target] += 1
            target_page = pages.get(target)
            if target_page is None:
                broken_links.append({"source": page.url, "target": target, "status": "not_crawled", "classification": "GONE/404"})
            elif target_page.classification == "GONE/404":
                broken_links.append({"source": page.url, "target": target, "status": target_page.status, "classification": target_page.classification})
            elif target_page.classification == "REDIRECT":
                redirect_links.append({"source": page.url, "target": target, "final_url": target_page.final_url, "status": target_page.status})

    canonical_rows: list[dict[str, object]] = []
    locale_rows: list[dict[str, object]] = []
    classifications: list[dict[str, object]] = []
    redirects: list[dict[str, object]] = []
    sitemap_rows: list[dict[str, object]] = []
    for page in sorted(pages.values(), key=lambda item: item.url):
        canonical = normalize_url(urljoin(page.url, page.canonical)) if page.canonical else ""
        canonical_status = pages.get(canonical).status if canonical in pages else "unknown"
        canonical_classification = pages.get(canonical).classification if canonical in pages else "unknown"
        canonical_ok = page.classification != "INDEX" or canonical == page.url
        classifications.append({
            "url": page.url,
            "classification": page.classification,
            "status": page.status,
            "final_url": page.final_url,
            "title": page.title,
            "language": page.language,
            "canonical": canonical,
            "in_sitemap": page.in_sitemap,
            "sitemap": ";".join(page.sitemap_names),
        })
        canonical_rows.append({
            "url": page.url,
            "classification": page.classification,
            "canonical_declared": canonical,
            "canonical_count": len(page.canonicals),
            "self_referencing": canonical == page.url,
            "canonical_status": canonical_status,
            "canonical_classification": canonical_classification,
        })
        locale_rows.append({
            "url": page.url,
            "language": page.language,
            "expected_language": "en" if urlsplit(page.url).path.startswith("/en/") else "es",
            "hreflang": json.dumps(page.hreflang, ensure_ascii=False),
            "hreflang_count": len(page.hreflang),
        })
        if page.classification == "REDIRECT":
            redirects.append({
                "source": page.url,
                "status": page.status,
                "final_url": page.final_url,
                "single_hop": page.final_url == page.url or page.final_url in pages,
                "internal_links": incoming[page.url],
            })

    for url in sorted(sitemap_set):
        page = pages.get(url)
        sitemap_rows.append({
            "url": url,
            "sitemaps": ";".join(sorted(sitemap_names[url])),
            "status": page.status if page else "not_crawled",
            "classification": page.classification if page else "GONE/404",
            "canonical": normalize_url(urljoin(url, page.canonical)) if page and page.canonical else "",
            "canonical_ok": bool(page and page.classification == "INDEX" and normalize_url(urljoin(url, page.canonical)) == url),
            "valid": bool(page and page.classification == "INDEX" and normalize_url(urljoin(url, page.canonical)) == url),
        })

    hreflang_errors: list[dict[str, object]] = []
    for page in pages.values():
        if page.classification != "INDEX":
            continue
        for alternate in page.hreflang:
            target = normalize_url(urljoin(page.url, alternate["href"]))
            target_page = pages.get(target)
            if target_page is None:
                hreflang_errors.append({"url": page.url, "lang": alternate["lang"], "target": target, "reason": "target_not_crawled"})
                continue
            if target_page.classification != "INDEX":
                continue
            if not any(normalize_url(urljoin(target_page.url, item["href"])) == page.url for item in target_page.hreflang):
                hreflang_errors.append({"url": page.url, "lang": alternate["lang"], "target": target, "reason": "not_reciprocal"})

    orphan_pages = [
        {"url": url, "classification": page.classification, "incoming_indexable": sum(1 for source in pages.values() if source.classification == "INDEX" and any(internal_target(source.url, link["href"]) == url for link in source.links))}
        for url, page in sorted(pages.items())
        if page.classification == "INDEX" and url != reader.url_for_path("/") and not any(
            source.classification == "INDEX" and any(internal_target(source.url, link["href"]) == url for link in source.links)
            for source in pages.values()
        )
    ]
    stats = {
        "pages_examined": len(pages),
        "indexable": sum(page.classification == "INDEX" for page in pages.values()),
        "noindex": sum(page.classification == "NOINDEX" for page in pages.values()),
        "redirect": sum(page.classification == "REDIRECT" for page in pages.values()),
        "gone_or_404": sum(page.classification == "GONE/404" for page in pages.values()),
        "sitemap_urls": len(sitemap_set),
        "sitemap_invalid": sum(not row["valid"] for row in sitemap_rows),
        "broken_internal_links": len(broken_links),
        "internal_redirect_links": len(redirect_links),
        "invalid_canonicals": sum(not row["self_referencing"] for row in canonical_rows if row["classification"] == "INDEX"),
        "invalid_hreflang": len(hreflang_errors),
        "indexable_orphans": len(orphan_pages),
    }
    return {
        "origin": reader.base_url,
        "mode": "local" if reader.root is not None else "production",
        "stats": stats,
        "sitemap_errors": sitemap_errors,
        "pages": [asdict(page) for page in sorted(pages.values(), key=lambda item: item.url)],
        "classifications": classifications,
        "canonical_audit": canonical_rows,
        "locale_audit": locale_rows,
        "sitemap_audit": sitemap_rows,
        "redirects": redirects,
        "broken_links": broken_links,
        "redirect_links": redirect_links,
        "hreflang_errors": hreflang_errors,
        "orphans": orphan_pages,
    }


def write_report(report: dict[str, object], output: Path, label: str) -> None:
    output.mkdir(parents=True, exist_ok=True)
    suffix = f"-{label}" if label else ""
    (output / f"crawl{suffix}.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_csv(output / "url-classification.csv", report["classifications"], ["url", "classification", "status", "final_url", "title", "language", "canonical", "in_sitemap", "sitemap"])
    write_csv(output / "canonical-audit.csv", report["canonical_audit"], ["url", "classification", "canonical_declared", "canonical_count", "self_referencing", "canonical_status", "canonical_classification"])
    write_csv(output / "locale-audit.csv", report["locale_audit"], ["url", "language", "expected_language", "hreflang", "hreflang_count"])
    write_csv(output / "sitemap-audit.csv", report["sitemap_audit"], ["url", "sitemaps", "status", "classification", "canonical", "canonical_ok", "valid"])
    write_csv(output / "redirect-map.csv", report["redirects"], ["source", "status", "final_url", "single_hop", "internal_links"])
    broken = list(report["broken_links"]) + [dict(row, issue="redirect") for row in report["redirect_links"]]
    write_csv(output / "broken-links.csv", broken, ["source", "target", "status", "classification", "final_url", "issue"])
    stats = report["stats"]
    lines = [
        f"# SEO crawl report ({label or 'audit'})",
        "",
        f"- Origin: `{report['origin']}`",
        f"- Mode: `{report['mode']}`",
        "",
        "| Metric | Value |",
        "|---|---:|",
    ]
    for key, value in stats.items():
        lines.append(f"| {key} | {value} |")
    lines.extend(["", "## Blocking findings", ""])
    findings = []
    for key in ("sitemap_invalid", "broken_internal_links", "internal_redirect_links", "invalid_canonicals", "invalid_hreflang", "indexable_orphans"):
        if stats[key]:
            findings.append(f"- `{key}`: {stats[key]}")
    lines.extend(findings or ["- None detected by this crawl."])
    if report["sitemap_errors"]:
        lines.extend(["", "## Sitemap read errors", "", *[f"- {item}" for item in report["sitemap_errors"]]])
    (output / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--site-dir", type=Path, help="Local MkDocs output directory")
    source.add_argument("--base-url", default=ORIGIN, help="Deployed site origin")
    parser.add_argument("--output-dir", type=Path, default=Path("seo-audit"))
    parser.add_argument("--label", default="", help="Artifact suffix, e.g. before or after")
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--allow-findings", action="store_true", help="Report findings without failing")
    args = parser.parse_args()
    reader = SiteReader(root=args.site_dir, base_url=args.base_url or ORIGIN, timeout=args.timeout, workers=args.workers)
    report = crawl(reader)
    write_report(report, args.output_dir, args.label)
    print(json.dumps(report["stats"], ensure_ascii=False, sort_keys=True))
    blocking = sum(report["stats"][key] for key in ("sitemap_invalid", "broken_internal_links", "internal_redirect_links", "invalid_canonicals", "invalid_hreflang", "indexable_orphans"))
    return 0 if args.allow_findings or blocking == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
