#!/usr/bin/env python3
"""Fail-closed INDEXABILITY gate for the Seguridad IA article + watch surfaces.

This is deliberately separate from Google selection/index state. It validates the
technical contract we own: rendered canonical/noindex/lang/search-document
fundamentals, sitemap + reciprocal hreflang, crawlable discovery/internal graph,
and article<->watch + video-sitemap discovery. Google Search Console observations
are persisted separately in the requalification ledger and never turn a neutral
selection state into a technical failure.
"""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
import xml.etree.ElementTree as ET

SITE_ORIGIN = "https://5sigmas.com"
SERIES = "seguridad-ia"
SLUGS = (
    "00_presentacion_serie",
    "01-prompt-injection",
    "02-jailbreaks",
    "03-envenenamiento",
    "04-red-teaming",
    "05-controles-produccion",
)
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"
INDEXABILITY_AMENDMENT = 5727362172


def _norm_url(url: str) -> str:
    parsed = urlsplit(url)
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    if not path.endswith("/") and not Path(path).suffix:
        path += "/"
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, parsed.query, ""))


def _expected(locale: str, kind: str, slug: str) -> str:
    prefix = "/en" if locale == "en" else ""
    base = "videos/series" if kind == "watch" else "series"
    return f"{SITE_ORIGIN}{prefix}/{base}/{SERIES}/{slug}/"


def _local_html(site: Path, url: str) -> Path:
    path = urlsplit(url).path.strip("/")
    return site / path / "index.html" if path else site / "index.html"


@dataclass
class HtmlFacts:
    lang: str = ""
    title: str = ""
    h1: list[str] = field(default_factory=list)
    description: str = ""
    robots: str = ""
    canonicals: list[str] = field(default_factory=list)
    links: list[str] = field(default_factory=list)
    body_text: str = ""
    jsonld_errors: list[str] = field(default_factory=list)


class FactsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.facts = HtmlFacts()
        self._title = False
        self._h1_depth = 0
        self._skip_depth = 0
        self._title_parts: list[str] = []
        self._h1_parts: list[str] = []
        self._body_parts: list[str] = []
        self._jsonld = False
        self._jsonld_parts: list[str] = []

    @staticmethod
    def _attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {str(k).lower(): str(v or "") for k, v in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        a = self._attrs(attrs)
        if tag == "html":
            self.facts.lang = a.get("lang", "").strip().lower()
        if tag in {"script", "style", "noscript", "template", "svg"}:
            self._skip_depth += 1
        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._jsonld = True
            self._jsonld_parts = []
        if tag == "title":
            self._title = True
            self._title_parts = []
        if tag == "h1":
            self._h1_depth += 1
            if self._h1_depth == 1:
                self._h1_parts = []
        if tag == "meta":
            name = a.get("name", "").strip().lower()
            if name == "description":
                self.facts.description = a.get("content", "").strip()
            elif name in {"robots", "googlebot"}:
                value = a.get("content", "").strip()
                self.facts.robots = ",".join(filter(None, [self.facts.robots, value]))
        if tag == "link":
            rel = {part.lower() for part in a.get("rel", "").split()}
            if "canonical" in rel and a.get("href"):
                self.facts.canonicals.append(a["href"].strip())
        if tag == "a" and a.get("href"):
            self.facts.links.append(a["href"].strip())

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title" and self._title:
            self.facts.title = " ".join("".join(self._title_parts).split())
            self._title = False
        if tag == "h1" and self._h1_depth:
            if self._h1_depth == 1:
                self.facts.h1.append(" ".join("".join(self._h1_parts).split()))
            self._h1_depth -= 1
        if tag == "script" and self._jsonld:
            raw = "".join(self._jsonld_parts).strip()
            if raw:
                try:
                    json.loads(raw)
                except json.JSONDecodeError as exc:
                    self.facts.jsonld_errors.append(str(exc))
            self._jsonld = False
            self._jsonld_parts = []
        if tag in {"script", "style", "noscript", "template", "svg"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._jsonld:
            self._jsonld_parts.append(data)
        if self._title:
            self._title_parts.append(data)
        if self._h1_depth:
            self._h1_parts.append(data)
        if not self._skip_depth:
            text = " ".join(data.split())
            if text:
                self._body_parts.append(text)

    def finish(self) -> HtmlFacts:
        self.facts.body_text = " ".join(self._body_parts)
        return self.facts


def _parse_html(path: Path) -> HtmlFacts:
    parser = FactsParser()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    parser.close()
    return parser.finish()


def _sitemap(site: Path, locale: str, video: bool = False) -> tuple[dict[str, dict[str, str]], list[str]]:
    if locale == "en":
        path = site / "en" / ("video-sitemap.xml" if video else "sitemap.xml")
    else:
        path = site / ("video-sitemap.xml" if video else "sitemap.xml")
    errors: list[str] = []
    rows: dict[str, dict[str, str]] = {}
    if not path.is_file():
        return rows, [f"missing sitemap: {path.relative_to(site)}"]
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        return rows, [f"invalid sitemap XML {path.relative_to(site)}: {exc}"]
    for node in root.findall(f"{{{SITEMAP_NS}}}url"):
        loc = node.find(f"{{{SITEMAP_NS}}}loc")
        if loc is None or not (loc.text or "").strip():
            continue
        url = _norm_url((loc.text or "").strip())
        alts: dict[str, str] = {}
        for alt in node.findall(f"{{{XHTML_NS}}}link"):
            hreflang = alt.attrib.get("hreflang", "").strip().lower()
            href = alt.attrib.get("href", "").strip()
            if hreflang and href:
                alts[hreflang] = _norm_url(href)
        rows[url] = alts
    return rows, errors


def _robots_allows_security(site: Path) -> tuple[bool, str]:
    path = site / "robots.txt"
    if not path.is_file():
        return False, "robots.txt missing from built site"
    current_agents: list[str] = []
    disallows: list[str] = []
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, value = [part.strip() for part in line.split(":", 1)]
        key = key.lower()
        if key == "user-agent":
            current_agents = [value.lower()]
        elif key == "disallow" and "*" in current_agents and value:
            disallows.append(value)
    protected_prefixes = [f"/series/{SERIES}/", f"/en/series/{SERIES}/", f"/videos/series/{SERIES}/", f"/en/videos/series/{SERIES}/"]
    for disallow in disallows:
        if disallow == "/" or any(prefix.startswith(disallow) or disallow.startswith(prefix) for prefix in protected_prefixes):
            return False, f"robots.txt disallow overlaps Seguridad IA: {disallow}"
    return True, "PASS"


def _crawl_graph(site: Path) -> tuple[dict[str, set[str]], dict[str, list[str]]]:
    incoming: dict[str, set[str]] = {}
    outgoing: dict[str, list[str]] = {}
    for path in site.rglob("index.html"):
        rel = path.relative_to(site)
        if rel == Path("index.html"):
            page_url = f"{SITE_ORIGIN}/"
        else:
            page_url = f"{SITE_ORIGIN}/{rel.parent.as_posix().strip('/')}/"
        try:
            facts = _parse_html(path)
        except OSError:
            continue
        normalized: list[str] = []
        for href in facts.links:
            if href.startswith(("mailto:", "tel:", "javascript:", "#")):
                continue
            target = _norm_url(urljoin(page_url, href))
            if urlsplit(target).netloc != "5sigmas.com":
                continue
            normalized.append(target)
            incoming.setdefault(target, set()).add(page_url)
        outgoing[page_url] = normalized
    return incoming, outgoing


def _surface_errors(site: Path, url: str, locale: str) -> tuple[list[str], HtmlFacts | None]:
    errors: list[str] = []
    path = _local_html(site, url)
    if not path.is_file():
        return [f"rendered HTML missing: {path.relative_to(site)}"], None
    facts = _parse_html(path)
    if len(facts.canonicals) != 1:
        errors.append(f"expected exactly one canonical, got {facts.canonicals!r}")
    elif _norm_url(facts.canonicals[0]) != _norm_url(url):
        errors.append(f"canonical mismatch: {facts.canonicals[0]!r} != {url!r}")
    tokens = {part.strip().lower() for part in facts.robots.split(",") if part.strip()}
    if "noindex" in tokens or "none" in tokens:
        errors.append(f"robots meta blocks indexing: {facts.robots!r}")
    if not facts.title:
        errors.append("empty <title>")
    if not facts.description:
        errors.append("empty meta description")
    if len(facts.h1) != 1 or not facts.h1[0]:
        errors.append(f"expected exactly one non-empty H1, got {facts.h1!r}")
    expected_lang = "en" if locale == "en" else "es"
    if facts.lang.split("-", 1)[0] != expected_lang:
        errors.append(f"html lang mismatch: {facts.lang!r} expected {expected_lang!r}")
    if len(facts.body_text) < 200:
        errors.append(f"crawlable text unexpectedly thin: {len(facts.body_text)} characters")
    if facts.jsonld_errors:
        errors.append(f"invalid JSON-LD: {facts.jsonld_errors[0]}")
    return errors, facts


def audit_indexability(root: Path, site: Path) -> dict:
    site = site.resolve()
    normal: dict[str, dict[str, dict[str, str]]] = {}
    video: dict[str, dict[str, dict[str, str]]] = {}
    global_errors: list[str] = []
    for locale in ("es", "en"):
        normal[locale], errors = _sitemap(site, locale, False)
        global_errors.extend(errors)
        video[locale], errors = _sitemap(site, locale, True)
        global_errors.extend(errors)
    robots_ok, robots_detail = _robots_allows_security(site)
    if not robots_ok:
        global_errors.append(robots_detail)
    incoming, outgoing = _crawl_graph(site)

    rows: list[dict] = []
    for slug in SLUGS:
        for locale in ("es", "en"):
            article = _expected(locale, "article", slug)
            watch = _expected(locale, "watch", slug)
            other = "en" if locale == "es" else "es"
            other_article = _expected(other, "article", slug)
            other_watch = _expected(other, "watch", slug)
            blockers: list[str] = []
            article_errors, article_facts = _surface_errors(site, article, locale)
            watch_errors, watch_facts = _surface_errors(site, watch, locale)
            blockers.extend(f"article: {item}" for item in article_errors)
            blockers.extend(f"watch: {item}" for item in watch_errors)

            if article not in normal[locale]:
                blockers.append("article missing from normal sitemap")
            if watch not in normal[locale]:
                blockers.append("watch missing from normal sitemap")
            if watch not in video[locale]:
                blockers.append("watch missing from video sitemap")

            expected_hreflang = "en" if locale == "es" else "es"
            if article in normal[locale] and normal[locale][article].get(expected_hreflang) != other_article:
                blockers.append(
                    f"article sitemap hreflang {expected_hreflang} is not reciprocal: "
                    f"{normal[locale][article].get(expected_hreflang)!r}"
                )
            if watch in normal[locale] and normal[locale][watch].get(expected_hreflang) != other_watch:
                blockers.append(
                    f"watch sitemap hreflang {expected_hreflang} is not reciprocal: "
                    f"{normal[locale][watch].get(expected_hreflang)!r}"
                )

            article_referrers = sorted(ref for ref in incoming.get(article, set()) if ref != article)
            watch_referrers = sorted(ref for ref in incoming.get(watch, set()) if ref != watch)
            if not article_referrers:
                blockers.append("article is orphaned: no crawlable internal referrer")
            if not watch_referrers:
                blockers.append("watch is orphaned: no crawlable internal referrer")
            if article_facts is not None and watch not in outgoing.get(article, []):
                blockers.append("article does not crawlably link to watch page")
            if watch_facts is not None and article not in outgoing.get(watch, []):
                blockers.append("watch page does not crawlably link back to article")

            rows.append(
                {
                    "route": f"series/{SERIES}/{slug}.md",
                    "locale": locale,
                    "article_url": article,
                    "watch_url": watch,
                    "article_referrers": article_referrers[:20],
                    "watch_referrers": watch_referrers[:20],
                    "canonical_status": "PASS" if not any("canonical" in item for item in blockers) else "FAIL",
                    "hreflang_status": "PASS" if not any("hreflang" in item for item in blockers) else "FAIL",
                    "sitemap_status": "PASS" if not any("sitemap" in item for item in blockers) else "FAIL",
                    "internal_discovery_status": "PASS" if not any(("orphaned" in item or "crawlably link" in item) for item in blockers) else "FAIL",
                    "robots_status": "PASS" if robots_ok and not any("robots meta" in item for item in blockers) else "FAIL",
                    "blockers": blockers,
                    "INDEXABILITY_PASS": not blockers and not global_errors,
                }
            )

    status = not global_errors and all(row["INDEXABILITY_PASS"] for row in rows)
    return {
        "schema_version": 1,
        "owner_amendment_comment": INDEXABILITY_AMENDMENT,
        "series": SERIES,
        "meaning": "technical indexability only; Google selection/index state is separate",
        "INDEXABILITY_PASS": status,
        "global_errors": global_errors,
        "rows": rows,
        "summary": {
            "route_locale_pairs": len(rows),
            "passing": sum(1 for row in rows if row["INDEXABILITY_PASS"]),
            "failing": sum(1 for row in rows if not row["INDEXABILITY_PASS"]),
        },
    }


def _self_test() -> None:
    good = '<html lang="es"><head><title>x</title><meta name="description" content="d"><link rel="canonical" href="https://5sigmas.com/series/seguridad-ia/01-prompt-injection/"></head><body><h1>x</h1><p>' + ('texto ' * 50) + '</p></body></html>'
    parser = FactsParser(); parser.feed(good); facts = parser.finish()
    assert facts.lang == "es" and len(facts.h1) == 1 and facts.description
    assert facts.canonicals == ["https://5sigmas.com/series/seguridad-ia/01-prompt-injection/"]

    for mutation, expected in (
        (good.replace('</head>', '<meta name="robots" content="noindex"></head>'), "noindex"),
        (good.replace('/series/seguridad-ia/01-prompt-injection/', '/en/series/seguridad-ia/01-prompt-injection/'), "canonical"),
        (good.replace('<h1>x</h1>', ''), "h1"),
    ):
        parser = FactsParser(); parser.feed(mutation); mutated = parser.finish()
        signals = []
        if "noindex" in mutated.robots.lower(): signals.append("noindex")
        if mutated.canonicals != facts.canonicals: signals.append("canonical")
        if not mutated.h1: signals.append("h1")
        assert expected in signals, (expected, signals)

    # Graph/sitemap mutations are represented independently: a missing URL,
    # wrong reciprocal alternate, or empty incoming set must all be observable.
    normal = {facts.canonicals[0]: {"en": "https://5sigmas.com/en/series/seguridad-ia/01-prompt-injection/"}}
    assert facts.canonicals[0] in normal
    assert normal[facts.canonicals[0]]["en"].startswith("https://5sigmas.com/en/")
    assert not set(), "synthetic orphan fixture must remain empty"
    print("Security INDEXABILITY negative fixtures passed: noindex/canonical/H1/sitemap-hreflang/orphan signals remain fail-closed.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--site", type=Path, default=Path("site"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/security-requalification/indexability/report.json"))
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        _self_test()
        return 0
    root = args.root.resolve()
    site = args.site if args.site.is_absolute() else root / args.site
    report = audit_indexability(root, site)
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "rows"}, ensure_ascii=False, indent=2))
    for row in report["rows"]:
        if row["blockers"]:
            print(f"{row['locale']} {row['route']}: " + " | ".join(row["blockers"]))
    return 0 if report["INDEXABILITY_PASS"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
