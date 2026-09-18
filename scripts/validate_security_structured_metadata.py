#!/usr/bin/env python3
"""Fail closed on Security 1.1 ES/EN structured article metadata drift.

This gate verifies rendered output, not just front matter or template source. It
covers the article Open Graph contract that can otherwise disappear when a
locale replaces MkDocs' inherited hook list, plus the canonical TechArticle
JSON-LD identity rendered by the locale templates.

Publication and modification dates are derived from the reviewed locale source
front matter. This prevents the gate itself from becoming stale after a real
content edit while still requiring rendered Open Graph and JSON-LD dates to
match the source exactly.
"""

from __future__ import annotations

import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]

EXPECTED = {
    "es": {
        "path": ROOT / "site/series/seguridad-ia/01-prompt-injection/index.html",
        "source": ROOT / "docs/series/seguridad-ia/01-prompt-injection.md",
        "url": "https://5sigmas.com/series/seguridad-ia/01-prompt-injection/",
        "section": "Seguridad en IA",
        "tags": {"IA", "Seguridad", "LLMs", "Agentes"},
    },
    "en": {
        "path": ROOT / "site/en/series/seguridad-ia/01-prompt-injection/index.html",
        "source": ROOT / "locales/en/series/seguridad-ia/01-prompt-injection.md",
        "url": "https://5sigmas.com/en/series/seguridad-ia/01-prompt-injection/",
        "section": "AI Security",
        "tags": {"AI", "Security", "LLMs", "Agents"},
    },
}


def _frontmatter_dates(source: Path) -> tuple[str, str]:
    """Return source date/date_modified as ISO dates, failing closed on drift."""
    if not source.is_file():
        raise ValueError(f"source missing: {source.relative_to(ROOT)}")
    text = source.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"front matter missing: {source.relative_to(ROOT)}")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise ValueError(f"front matter terminator missing: {source.relative_to(ROOT)}")
    fields: dict[str, str] = {}
    for raw in text[4:end].splitlines():
        if ":" not in raw:
            continue
        key, value = raw.split(":", 1)
        if key in {"date", "date_modified"}:
            fields[key] = value.strip().strip("'\"")
    published = fields.get("date", "")
    modified = fields.get("date_modified", "")
    for key, value in (("date", published), ("date_modified", modified)):
        parts = value.split("-")
        if len(parts) != 3 or tuple(map(len, parts)) != (4, 2, 2) or not all(part.isdigit() for part in parts):
            raise ValueError(
                f"{source.relative_to(ROOT)}: {key} must be explicit YYYY-MM-DD, got {value!r}"
            )
    return published, modified


def _expected(locale: str) -> dict[str, Any]:
    base = dict(EXPECTED[locale])
    published, modified = _frontmatter_dates(base["source"])
    base.update(
        published=f"{published}T00:00:00+00:00",
        modified=f"{modified}T00:00:00+00:00",
        jsonld_published=published,
        jsonld_modified=modified,
    )
    return base


class MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: list[dict[str, str]] = []
        self._jsonld_depth = 0
        self._jsonld_buffer: list[str] = []
        self.jsonld: list[Any] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        values = {str(key).lower(): str(value or "") for key, value in attrs}
        if tag.lower() == "meta":
            self.meta.append(values)
        if tag.lower() == "script" and values.get("type", "").lower() == "application/ld+json":
            self._jsonld_depth += 1
            self._jsonld_buffer = []

    def handle_data(self, data: str) -> None:
        if self._jsonld_depth:
            self._jsonld_buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "script" or not self._jsonld_depth:
            return
        raw = "".join(self._jsonld_buffer).strip()
        self._jsonld_depth -= 1
        self._jsonld_buffer = []
        if not raw:
            return
        try:
            self.jsonld.append(json.loads(raw))
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid JSON-LD: {exc}") from exc


def _meta_values(parser: MetadataParser, *, property_name: str) -> list[str]:
    return [item.get("content", "") for item in parser.meta if item.get("property") == property_name]


def _iter_jsonld_nodes(value: Any):
    if isinstance(value, dict):
        yield value
        graph = value.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                yield from _iter_jsonld_nodes(item)
    elif isinstance(value, list):
        for item in value:
            yield from _iter_jsonld_nodes(item)


def _tech_articles(parser: MetadataParser) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for doc in parser.jsonld:
        for node in _iter_jsonld_nodes(doc):
            node_type = node.get("@type")
            if node_type == "TechArticle" or (isinstance(node_type, list) and "TechArticle" in node_type):
                result.append(node)
    return result


def validate_html(html: str, locale: str) -> list[str]:
    try:
        expected = _expected(locale)
    except ValueError as exc:
        return [f"{locale}: {exc}"]
    errors: list[str] = []
    parser = MetadataParser()
    try:
        parser.feed(html)
        parser.close()
    except ValueError as exc:
        return [f"{locale}: {exc}"]

    def require_single(property_name: str, expected_value: str) -> None:
        values = _meta_values(parser, property_name=property_name)
        if values != [expected_value]:
            errors.append(
                f"{locale}: {property_name} expected exactly {expected_value!r}, got {values!r}"
            )

    require_single("og:type", "article")
    require_single("article:author", "https://5sigmas.com/meta/about/")
    require_single("article:section", expected["section"])
    require_single("article:published_time", expected["published"])
    require_single("article:modified_time", expected["modified"])

    tags = set(_meta_values(parser, property_name="article:tag"))
    if tags != expected["tags"]:
        errors.append(f"{locale}: article:tag expected {sorted(expected['tags'])!r}, got {sorted(tags)!r}")

    articles = _tech_articles(parser)
    if len(articles) != 1:
        errors.append(f"{locale}: expected exactly one TechArticle JSON-LD node, got {len(articles)}")
    else:
        article = articles[0]
        expected_fields = {
            "url": expected["url"],
            "inLanguage": locale,
            "datePublished": expected["jsonld_published"],
            "dateModified": expected["jsonld_modified"],
        }
        for key, expected_value in expected_fields.items():
            actual = article.get(key)
            if actual != expected_value:
                errors.append(f"{locale}: TechArticle.{key} expected {expected_value!r}, got {actual!r}")
        main_entity = article.get("mainEntityOfPage")
        main_id = main_entity.get("@id") if isinstance(main_entity, dict) else None
        if main_id != expected["url"]:
            errors.append(
                f"{locale}: TechArticle.mainEntityOfPage @id expected {expected['url']!r}, got {main_id!r}"
            )

    wrong_section = EXPECTED["en" if locale == "es" else "es"]["section"]
    if wrong_section in _meta_values(parser, property_name="article:section"):
        errors.append(f"{locale}: cross-locale article:section leak: {wrong_section!r}")

    return errors


def _synthetic_html(
    locale: str,
    *,
    section: str | None = None,
    include_article_meta: bool = True,
    modified_override: str | None = None,
) -> str:
    expected = _expected(locale)
    modified = modified_override or expected["jsonld_modified"]
    modified_time = f"{modified}T00:00:00+00:00"
    meta = '<meta property="og:type" content="article">'
    if include_article_meta:
        meta += (
            '<meta property="article:author" content="https://5sigmas.com/meta/about/">'
            f'<meta property="article:section" content="{section or expected["section"]}">'
            f'<meta property="article:published_time" content="{expected["published"]}">'
            f'<meta property="article:modified_time" content="{modified_time}">'
            + "".join(f'<meta property="article:tag" content="{tag}">' for tag in sorted(expected["tags"]))
        )
    article = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "url": expected["url"],
        "inLanguage": locale,
        "datePublished": expected["jsonld_published"],
        "dateModified": modified,
        "mainEntityOfPage": {"@type": "WebPage", "@id": expected["url"]},
    }
    return f"<html><head>{meta}<script type=\"application/ld+json\">{json.dumps(article)}</script></head></html>"


def self_test() -> None:
    for locale in EXPECTED:
        assert not validate_html(_synthetic_html(locale), locale), f"valid {locale} fixture should pass"
        assert validate_html(_synthetic_html(locale, include_article_meta=False), locale), (
            f"missing article metadata must fail for {locale}"
        )
        other = "en" if locale == "es" else "es"
        assert validate_html(_synthetic_html(locale, section=EXPECTED[other]["section"]), locale), (
            f"cross-locale article section must fail for {locale}"
        )
        stale = "1999-01-01"
        stale_failures = validate_html(_synthetic_html(locale, modified_override=stale), locale)
        assert any("article:modified_time" in item for item in stale_failures), (
            f"stale Open Graph modified date must fail for {locale}"
        )
        assert any("TechArticle.dateModified" in item for item in stale_failures), (
            f"stale JSON-LD modified date must fail for {locale}"
        )
    print("Security structured metadata negative fixtures PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0

    failures: list[str] = []
    for locale in EXPECTED:
        try:
            expected = _expected(locale)
        except ValueError as exc:
            failures.append(f"{locale}: {exc}")
            continue
        path: Path = expected["path"]
        if not path.is_file():
            failures.append(f"{locale}: built page missing: {path.relative_to(ROOT)}")
            continue
        failures.extend(validate_html(path.read_text(encoding="utf-8", errors="replace"), locale))

    if failures:
        print(f"Security structured metadata FAIL ({len(failures)})")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Security structured metadata PASS: native ES/EN Open Graph provenance and TechArticle identity")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
