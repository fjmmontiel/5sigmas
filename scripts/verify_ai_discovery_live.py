#!/usr/bin/env python3
"""Verify the public 5sigmas surfaces needed by AI search and retrieval."""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse

AI_ROBOTS = (
    "OAI-SearchBot",
    "ChatGPT-User",
    "GPTBot",
    "Claude-SearchBot",
    "Claude-User",
    "ClaudeBot",
    "Googlebot",
    "Google-Extended",
)

FETCH_AGENTS = (
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "Googlebot",
)

SITEMAPS = (
    "/sitemap.xml",
    "/en/sitemap.xml",
    "/video-sitemap.xml",
    "/en/video-sitemap.xml",
)

GRAPH_PATHS = (
    "/agent/knowledge.json",
    "/en/agent/knowledge.json",
)

LLMS_PATHS = (
    "/llms.txt",
    "/en/llms.txt",
)

VIDEO_TAXONOMY = {
    "es": {
        "hub": "/videos/",
        "catalog": "/videos/catalog.json",
        "generic": "otros",
        "topics": {
            "agentes": 6,
            "voz": 6,
            "coding-agents": 6,
            "context-engineering": 6,
            "inferencia": 6,
            "evaluacion": 6,
        },
    },
    "en": {
        "hub": "/en/videos/",
        "catalog": "/en/videos/catalog.json",
        "generic": "other",
        "topics": {
            "agents": 6,
            "voice": 6,
            "coding-agents": 6,
            "context-engineering": 6,
            "inference": 6,
            "evaluation": 6,
        },
    },
}


def fetch(url: str, user_agent: str, accept: str = "*/*") -> tuple[bytes, dict[str, str]]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": user_agent,
            "Accept": accept,
            "Cache-Control": "no-cache",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.status
            body = response.read()
            headers = {key.lower(): value for key, value in response.headers.items()}
    except urllib.error.HTTPError as exc:
        body = exc.read()
        raise AssertionError(
            f"{user_agent} -> {url}: HTTP {exc.code}; body={body[:300]!r}"
        ) from exc
    except urllib.error.URLError as exc:
        raise AssertionError(f"{user_agent} -> {url}: network error: {exc}") from exc

    if status != 200:
        raise AssertionError(f"{user_agent} -> {url}: expected 200, got {status}")
    if not body:
        raise AssertionError(f"{user_agent} -> {url}: empty response")
    return body, headers


def require_robots_block(text: str, agent: str) -> None:
    escaped = re.escape(agent)
    pattern = rf"(?ims)^User-agent:\s*{escaped}\s*$\s*^Allow:\s*/\s*$"
    if not re.search(pattern, text):
        raise AssertionError(f"robots.txt does not explicitly allow {agent}")


def assert_crawlable(headers: dict[str, str], url: str) -> None:
    x_robots = headers.get("x-robots-tag", "").lower()
    if "noindex" in x_robots or "none" in x_robots:
        raise AssertionError(f"{url}: blocking X-Robots-Tag={x_robots!r}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default="https://5sigmas.com")
    args = parser.parse_args()
    origin = args.origin.rstrip("/")

    results: dict[str, object] = {
        "origin": origin,
        "robots": {},
        "crawler_fetches": {},
        "sitemaps": {},
        "llms": {},
        "graphs": {},
        "markdown_probe": {},
        "video_taxonomy": {},
    }

    robots_bytes, robots_headers = fetch(
        origin + "/robots.txt", "5sigmas-ai-discovery-verifier/1.0", "text/plain"
    )
    robots = robots_bytes.decode("utf-8", errors="replace")
    assert_crawlable(robots_headers, origin + "/robots.txt")
    for agent in AI_ROBOTS:
        require_robots_block(robots, agent)
        results["robots"][agent] = "allow"

    for path in SITEMAPS:
        expected = f"Sitemap: {origin}{path}"
        if expected not in robots:
            raise AssertionError(f"robots.txt missing {expected}")

    # Exercise public content with the user-agent tokens used by the major AI/search ecosystems.
    # This catches accidental UA-based WAF/CDN rules in addition to robots policy regressions.
    representative = origin + "/"
    for agent in FETCH_AGENTS:
        body, headers = fetch(representative, agent, "text/html")
        assert_crawlable(headers, representative)
        if b"<html" not in body[:10000].lower():
            raise AssertionError(f"{agent} did not receive HTML from {representative}")
        results["crawler_fetches"][agent] = {
            "status": 200,
            "bytes": len(body),
        }

    for path in SITEMAPS:
        body, _ = fetch(origin + path, "OAI-SearchBot", "application/xml,text/xml")
        text = body.decode("utf-8", errors="replace")
        if "<urlset" not in text and "<sitemapindex" not in text:
            raise AssertionError(f"{path}: not a sitemap document")
        results["sitemaps"][path] = {"status": 200, "bytes": len(body)}

    for path in LLMS_PATHS:
        body, _ = fetch(origin + path, "Claude-User", "text/plain,text/markdown")
        if len(body) < 200:
            raise AssertionError(f"{path}: unexpectedly small llms surface ({len(body)} bytes)")
        results["llms"][path] = {"status": 200, "bytes": len(body)}

    for locale, contract in VIDEO_TAXONOMY.items():
        catalog_bytes, catalog_headers = fetch(
            origin + contract["catalog"], "ChatGPT-User", "application/json"
        )
        assert_crawlable(catalog_headers, origin + contract["catalog"])
        catalog = json.loads(catalog_bytes)
        videos = catalog.get("videos")
        if not isinstance(videos, list) or catalog.get("count") != len(videos):
            raise AssertionError(f"{contract['catalog']}: invalid catalogue count")

        counts: dict[str, int] = {}
        for video in videos:
            topic = str(video.get("topic") or "")
            counts[topic] = counts.get(topic, 0) + 1

        generic_count = counts.get(contract["generic"], 0)
        if generic_count:
            raise AssertionError(
                f"{contract['catalog']}: {generic_count} videos still use generic topic "
                f"{contract['generic']!r}"
            )
        for topic, expected in contract["topics"].items():
            actual = counts.get(topic, 0)
            if actual != expected:
                raise AssertionError(
                    f"{contract['catalog']}: topic {topic!r} count={actual}, expected={expected}"
                )

        hub_bytes, hub_headers = fetch(
            origin + contract["hub"], "OAI-SearchBot", "text/html"
        )
        assert_crawlable(hub_headers, origin + contract["hub"])
        hub = hub_bytes.decode("utf-8", errors="replace")
        card_topics = re.findall(r'data-topic="([^"]+)"', hub)
        if len(card_topics) != len(videos):
            raise AssertionError(
                f"{contract['hub']}: HTML cards={len(card_topics)} catalog={len(videos)}"
            )
        if contract["generic"] in card_topics:
            raise AssertionError(
                f"{contract['hub']}: rendered HTML still contains generic topic "
                f"{contract['generic']!r}"
            )
        for topic, expected in contract["topics"].items():
            actual = card_topics.count(topic)
            if actual != expected:
                raise AssertionError(
                    f"{contract['hub']}: rendered topic {topic!r} count={actual}, expected={expected}"
                )

        results["video_taxonomy"][locale] = {
            "catalog_count": len(videos),
            "generic_count": generic_count,
            "modern_topics": {
                topic: counts.get(topic, 0) for topic in contract["topics"]
            },
        }

    graphs: list[dict] = []
    for path in GRAPH_PATHS:
        body, _ = fetch(origin + path, "ChatGPT-User", "application/json")
        graph = json.loads(body)
        if graph.get("schema_version") != 2:
            raise AssertionError(f"{path}: expected schema_version=2")
        items = graph.get("items")
        if not isinstance(items, list) or not items:
            raise AssertionError(f"{path}: knowledge graph is empty")
        graphs.append(graph)
        results["graphs"][path] = {
            "status": 200,
            "items": len(items),
            "locale": graph.get("locale"),
        }

    probe = next(
        (
            item
            for graph in graphs
            for item in graph["items"]
            if isinstance(item, dict)
            and isinstance(item.get("markdown_url"), str)
            and item.get("markdown_url")
            and isinstance(item.get("url"), str)
            and item.get("url")
        ),
        None,
    )
    if not probe:
        raise AssertionError("No graph item exposes both canonical url and markdown_url")

    for key in ("url", "markdown_url"):
        parsed = urlparse(probe[key])
        if parsed.scheme != "https" or parsed.netloc != "5sigmas.com":
            raise AssertionError(f"Unsafe {key} in graph probe: {probe[key]!r}")

    markdown, markdown_headers = fetch(
        probe["markdown_url"], "ChatGPT-User", "text/markdown,text/plain"
    )
    assert_crawlable(markdown_headers, probe["markdown_url"])
    if len(markdown) < 200:
        raise AssertionError(
            f"Markdown mirror unexpectedly small: {probe['markdown_url']} ({len(markdown)} bytes)"
        )
    results["markdown_probe"] = {
        "id": probe.get("id"),
        "canonical_url": probe["url"],
        "markdown_url": probe["markdown_url"],
        "bytes": len(markdown),
    }

    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"AI_DISCOVERY_FAIL: {exc}", file=sys.stderr)
        raise
