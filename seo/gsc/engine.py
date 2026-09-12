from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any, Iterable
from urllib.parse import urlparse
from xml.etree import ElementTree
from zoneinfo import ZoneInfo

import requests

if TYPE_CHECKING:
    from .client import GSCClient


LA_TZ = ZoneInfo("America/Los_Angeles")
MADRID_TZ = ZoneInfo("Europe/Madrid")


def _iso(day: date) -> str:
    return day.isoformat()


def _as_date(value: str) -> date:
    return date.fromisoformat(value)


def _metric_from_response(payload: dict[str, Any]) -> dict[str, float]:
    rows = payload.get("rows") or []
    if not rows:
        return {"clicks": 0.0, "impressions": 0.0, "ctr": 0.0, "position": 0.0}
    row = rows[0]
    return {
        "clicks": float(row.get("clicks", 0.0)),
        "impressions": float(row.get("impressions", 0.0)),
        "ctr": float(row.get("ctr", 0.0)),
        "position": float(row.get("position", 0.0)),
    }


def latest_settled_date(client: "GSCClient", now: datetime | None = None) -> tuple[date, str | None]:
    now = now or datetime.now(LA_TZ)
    today = now.astimezone(LA_TZ).date()
    start = today - timedelta(days=10)
    payload = client.search_analytics(
        _iso(start),
        _iso(today),
        dimensions=["date"],
        data_state="all",
        paginate=False,
    )
    metadata = payload.get("metadata") or {}
    first_incomplete = metadata.get("first_incomplete_date") or metadata.get("firstIncompleteDate")
    if first_incomplete:
        return _as_date(first_incomplete) - timedelta(days=1), first_incomplete

    final_payload = client.search_analytics(
        _iso(start),
        _iso(today),
        dimensions=["date"],
        data_state="final",
        paginate=False,
    )
    dates = [_as_date(row["keys"][0]) for row in final_payload.get("rows", []) if row.get("keys")]
    if not dates:
        raise RuntimeError("Could not determine latest settled Search Console date")
    return max(dates), None


def period_metrics(client: "GSCClient", start: date, end: date) -> dict[str, Any]:
    metrics = _metric_from_response(
        client.search_analytics(_iso(start), _iso(end), data_state="final", paginate=False)
    )
    return {"start": _iso(start), "end": _iso(end), **metrics}


def comparable_windows(end: date, days: int) -> tuple[tuple[date, date], tuple[date, date]]:
    current_start = end - timedelta(days=days - 1)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)
    return (current_start, end), (previous_start, previous_end)


def _weighted_position(items: Iterable[tuple[float, float]]) -> float:
    numerator = 0.0
    denominator = 0.0
    for position, impressions in items:
        numerator += position * impressions
        denominator += impressions
    return numerator / denominator if denominator else 0.0


def sharded_search_rows(
    client: "GSCClient",
    start: date,
    end: date,
    *,
    dimensions: list[str],
    data_state: str = "final",
) -> list[dict[str, Any]]:
    """Query one day at a time so small-site zero-click rows are not lost to broad-window top-row truncation."""
    rows: list[dict[str, Any]] = []
    cursor = start
    while cursor <= end:
        payload = client.search_analytics(
            _iso(cursor),
            _iso(cursor),
            dimensions=dimensions,
            data_state=data_state,
        )
        rows.extend(payload.get("rows", []) or [])
        cursor += timedelta(days=1)
    return rows


def aggregate_query_page(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    queries: dict[str, dict[str, Any]] = {}
    for row in rows:
        keys = row.get("keys") or []
        if len(keys) < 2:
            continue
        query, page = keys[0], keys[1]
        bucket = queries.setdefault(
            query,
            {"clicks": 0.0, "impressions": 0.0, "position_parts": [], "pages": defaultdict(float)},
        )
        clicks = float(row.get("clicks", 0.0))
        impressions = float(row.get("impressions", 0.0))
        position = float(row.get("position", 0.0))
        bucket["clicks"] += clicks
        bucket["impressions"] += impressions
        bucket["position_parts"].append((position, impressions))
        bucket["pages"][page] += impressions

    normalized: dict[str, dict[str, Any]] = {}
    for query, bucket in queries.items():
        impressions = bucket["impressions"]
        pages = dict(bucket["pages"])
        normalized[query] = {
            "query": query,
            "clicks": bucket["clicks"],
            "impressions": impressions,
            "ctr": bucket["clicks"] / impressions if impressions else 0.0,
            "position": _weighted_position(bucket["position_parts"]),
            "pages": pages,
            "page_count": len(pages),
            "top_page": max(pages, key=pages.get) if pages else None,
            "top_page_share": (max(pages.values()) / impressions) if pages and impressions else 0.0,
        }
    return normalized


def _expected_ctr(position: float) -> float:
    if position <= 3:
        return 0.08
    if position <= 5:
        return 0.05
    if position <= 10:
        return 0.025
    if position <= 15:
        return 0.012
    if position <= 20:
        return 0.006
    return 0.003


def _position_factor(position: float) -> float:
    if 3 <= position <= 5:
        return 1.0
    if position <= 10:
        return 0.95
    if position <= 15:
        return 0.8
    if position <= 20:
        return 0.45
    if position <= 30:
        return 0.2
    return 0.05


def _normalize_query(value: str) -> str:
    return " ".join(value.casefold().split())


def active_protection(experiments: dict[str, Any], settled_through: date) -> dict[str, Any]:
    protected_urls: set[str] = set()
    protected_queries: set[str] = set()
    active: list[dict[str, Any]] = []
    for item in experiments.get("experiments", []):
        if item.get("status") != "measuring":
            continue
        deployed = _as_date(item["deployed_on"])
        settled_days = max(0, (settled_through - deployed).days)
        min_days = int(item.get("min_settled_days", 10))
        is_protected = settled_days < min_days
        view = {**item, "settled_days_after_deploy": settled_days, "protected": is_protected}
        active.append(view)
        if is_protected:
            protected_urls.update(item.get("urls", []))
            protected_queries.update(_normalize_query(q) for q in item.get("query_family", []))
    return {
        "experiments": active,
        "protected_urls": sorted(protected_urls),
        "protected_queries": sorted(protected_queries),
    }


def _is_protected(query: str, pages: dict[str, float], protection: dict[str, Any]) -> bool:
    if _normalize_query(query) in set(protection.get("protected_queries", [])):
        return True
    protected_urls = set(protection.get("protected_urls", []))
    return any(page in protected_urls for page in pages)


def score_opportunities(
    query_aggregates: dict[str, dict[str, Any]],
    protection: dict[str, Any],
    *,
    min_impressions: int = 10,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for query, item in query_aggregates.items():
        impressions = item["impressions"]
        position = item["position"]
        ctr = item["ctr"]
        if impressions < min_impressions or not (3 <= position <= 30):
            continue
        expected = _expected_ctr(position)
        ctr_deficit = max(0.0, 1.0 - min(1.0, ctr / expected)) if expected else 0.0
        evidence = min(1.0, impressions / 100.0)
        intent_concentration = max(0.25, item["top_page_share"])
        impact = math.log1p(impressions) * _position_factor(position)
        score = impact * (0.5 + 0.5 * evidence) * ctr_deficit * intent_concentration
        candidates.append(
            {
                "query": query,
                "clicks": round(item["clicks"], 3),
                "impressions": round(impressions, 3),
                "ctr": round(ctr, 6),
                "position": round(position, 3),
                "top_page": item["top_page"],
                "top_page_share": round(item["top_page_share"], 4),
                "page_count": item["page_count"],
                "score": round(score, 4),
                "protected": _is_protected(query, item["pages"], protection),
            }
        )
    return sorted(candidates, key=lambda item: item["score"], reverse=True)


def cannibalization_candidates(
    query_aggregates: dict[str, dict[str, Any]],
    protection: dict[str, Any],
    *,
    min_impressions: int = 10,
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for query, item in query_aggregates.items():
        impressions = item["impressions"]
        pages = item["pages"]
        if impressions < min_impressions or len(pages) < 2:
            continue
        shares = [value / impressions for value in pages.values() if value > 0]
        entropy = -sum(share * math.log(share) for share in shares)
        normalized_entropy = entropy / math.log(len(shares)) if len(shares) > 1 else 0.0
        ownership = item["top_page_share"]
        if ownership >= 0.9:
            continue
        output.append(
            {
                "query": query,
                "impressions": round(impressions, 3),
                "position": round(item["position"], 3),
                "page_count": len(pages),
                "top_page": item["top_page"],
                "top_page_share": round(ownership, 4),
                "entropy": round(normalized_entropy, 4),
                "pages": [
                    {"url": url, "impressions": round(value, 3)}
                    for url, value in sorted(pages.items(), key=lambda pair: pair[1], reverse=True)[:5]
                ],
                "protected": _is_protected(query, pages, protection),
            }
        )
    return sorted(output, key=lambda item: (item["entropy"], item["impressions"]), reverse=True)


def aggregate_pages(rows: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    output: dict[str, dict[str, float]] = {}
    for row in rows:
        keys = row.get("keys") or []
        if not keys:
            continue
        url = keys[0]
        output[url] = {
            "clicks": float(row.get("clicks", 0.0)),
            "impressions": float(row.get("impressions", 0.0)),
            "ctr": float(row.get("ctr", 0.0)),
            "position": float(row.get("position", 0.0)),
        }
    return output


def rising_pages(current: dict[str, dict[str, float]], previous: dict[str, dict[str, float]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for url, cur in current.items():
        prev = previous.get(url, {"clicks": 0.0, "impressions": 0.0, "ctr": 0.0, "position": 0.0})
        imp_delta = cur["impressions"] - prev["impressions"]
        click_delta = cur["clicks"] - prev["clicks"]
        position_improvement = (
            prev["position"] - cur["position"]
            if prev["position"] > 0 and cur["position"] > 0
            else 0.0
        )
        if cur["impressions"] < 3 and imp_delta < 3:
            continue
        score = max(0.0, imp_delta) + max(0.0, click_delta) * 5 + max(0.0, position_improvement)
        output.append(
            {
                "url": url,
                "clicks": round(cur["clicks"], 3),
                "impressions": round(cur["impressions"], 3),
                "position": round(cur["position"], 3),
                "impressions_delta": round(imp_delta, 3),
                "clicks_delta": round(click_delta, 3),
                "position_improvement": round(position_improvement, 3),
                "score": round(score, 3),
            }
        )
    return sorted(output, key=lambda item: item["score"], reverse=True)


def fetch_sitemap_urls(sitemap_url: str, *, max_urls: int = 5000, timeout: int = 20) -> list[str]:
    host = urlparse(sitemap_url).hostname
    visited: set[str] = set()
    result: list[str] = []

    def fetch(url: str, depth: int) -> None:
        if url in visited or len(result) >= max_urls:
            return
        visited.add(url)
        response = requests.get(
            url,
            timeout=timeout,
            headers={"User-Agent": "5sigmas-gsc-growth/1.0"},
        )
        response.raise_for_status()
        root = ElementTree.fromstring(response.content)
        root_name = root.tag.rsplit("}", 1)[-1]
        locs = [element.text.strip() for element in root.findall(".//{*}loc") if element.text]
        if root_name == "sitemapindex" and depth < 1:
            for child in locs:
                if urlparse(child).hostname == host:
                    fetch(child, depth + 1)
            return
        for item in locs:
            parsed = urlparse(item)
            if parsed.scheme in {"http", "https"} and parsed.hostname == host:
                result.append(item)
                if len(result) >= max_urls:
                    break

    fetch(sitemap_url, 0)
    return list(dict.fromkeys(result))[:max_urls]


def sitemap_visibility(
    sitemap_urls: list[str],
    page_metrics: dict[str, dict[str, float]],
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for sitemap_url in sitemap_urls:
        try:
            urls = fetch_sitemap_urls(sitemap_url)
            visible = [url for url in urls if page_metrics.get(url, {}).get("impressions", 0) > 0]
            output.append(
                {
                    "sitemap": sitemap_url,
                    "url_count": len(urls),
                    "urls_with_impressions": len(visible),
                    "visibility_ratio": round(len(visible) / len(urls), 4) if urls else 0.0,
                    "clicks": round(sum(page_metrics.get(url, {}).get("clicks", 0.0) for url in urls), 3),
                    "impressions": round(sum(page_metrics.get(url, {}).get("impressions", 0.0) for url in urls), 3),
                }
            )
        except Exception as exc:
            output.append({"sitemap": sitemap_url, "error": str(exc)})
    return output


def parse_inspection(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = payload.get("inspectionResult") or {}
    index = result.get("indexStatusResult") or {}
    return {
        "url": url,
        "verdict": index.get("verdict"),
        "coverage_state": index.get("coverageState"),
        "robots_txt_state": index.get("robotsTxtState"),
        "indexing_state": index.get("indexingState"),
        "page_fetch_state": index.get("pageFetchState"),
        "last_crawl_time": index.get("lastCrawlTime"),
        "google_canonical": index.get("googleCanonical"),
        "user_canonical": index.get("userCanonical"),
    }


def fresh_trend(client: "GSCClient", settled_through: date, now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(LA_TZ)
    today = now.astimezone(LA_TZ).date()
    start = min(settled_through - timedelta(days=2), today - timedelta(days=4))
    payload = client.search_analytics(
        _iso(start),
        _iso(today),
        dimensions=["date"],
        data_state="all",
        paginate=False,
    )
    rows = []
    for row in payload.get("rows", []):
        row_date = row.get("keys", [None])[0]
        if not row_date:
            continue
        rows.append(
            {
                "date": row_date,
                "clicks": float(row.get("clicks", 0.0)),
                "impressions": float(row.get("impressions", 0.0)),
                "ctr": float(row.get("ctr", 0.0)),
                "position": float(row.get("position", 0.0)),
                "settled": _as_date(row_date) <= settled_through,
            }
        )
    metadata = payload.get("metadata") or {}
    return {
        "first_incomplete_date": metadata.get("first_incomplete_date") or metadata.get("firstIncompleteDate"),
        "rows": rows,
    }


def build_report(
    client: "GSCClient",
    *,
    mode: str,
    experiments: dict[str, Any],
    tracked: dict[str, Any],
    now: datetime | None = None,
) -> dict[str, Any]:
    now = now or datetime.now(MADRID_TZ)
    settled_through, first_incomplete = latest_settled_date(client, now.astimezone(LA_TZ))
    window28, previous28 = comparable_windows(settled_through, 28)
    window7, previous7 = comparable_windows(settled_through, 7)

    summary28 = period_metrics(client, *window28)
    prior28 = period_metrics(client, *previous28)
    summary7 = period_metrics(client, *window7)
    prior7 = period_metrics(client, *previous7)

    query_page_rows = sharded_search_rows(
        client,
        window28[0],
        window28[1],
        dimensions=["query", "page"],
        data_state="final",
    )
    query_aggregates = aggregate_query_page(query_page_rows)
    protection = active_protection(experiments, settled_through)

    opportunities = score_opportunities(query_aggregates, protection)[:20]
    cannibalization = cannibalization_candidates(query_aggregates, protection)[:15]

    current_pages = aggregate_pages(
        client.search_analytics(
            _iso(window7[0]), _iso(window7[1]), dimensions=["page"], data_state="final"
        ).get("rows", [])
    )
    previous_pages = aggregate_pages(
        client.search_analytics(
            _iso(previous7[0]), _iso(previous7[1]), dimensions=["page"], data_state="final"
        ).get("rows", [])
    )
    page28 = aggregate_pages(
        client.search_analytics(
            _iso(window28[0]), _iso(window28[1]), dimensions=["page"], data_state="final"
        ).get("rows", [])
    )

    raw_sitemaps = client.list_sitemaps().get("sitemap", []) or []
    configured_sitemaps = tracked.get("sitemaps", [])
    sitemap_perf = sitemap_visibility(configured_sitemaps, page28)

    priority_hubs = tracked.get("priority_hubs", [])
    mirrors = tracked.get("mirrors", [])
    experiment_urls = sorted({url for item in experiments.get("experiments", []) for url in item.get("urls", [])})
    inspection_urls = list(dict.fromkeys(priority_hubs + (mirrors + experiment_urls if mode == "full" else [])))
    inspections: list[dict[str, Any]] = []
    for url in inspection_urls:
        try:
            inspections.append(parse_inspection(url, client.inspect_url(url)))
        except Exception as exc:
            inspections.append({"url": url, "error": str(exc)})

    report = {
        "schema_version": 1,
        "status": "OK",
        "mode": mode,
        "site_url": client.site_url,
        "generated_at": now.astimezone(MADRID_TZ).isoformat(),
        "settled_through": _iso(settled_through),
        "first_incomplete_date": first_incomplete,
        "summary_28d": summary28,
        "previous_28d": prior28,
        "summary_7d": summary7,
        "previous_7d": prior7,
        "fresh": fresh_trend(client, settled_through, now.astimezone(LA_TZ)),
        "protected": protection,
        "opportunities": opportunities,
        "cannibalization": cannibalization,
        "rising_pages": rising_pages(current_pages, previous_pages)[:20],
        "sitemaps": {
            "api": [
                {
                    "path": item.get("path"),
                    "last_submitted": item.get("lastSubmitted"),
                    "last_downloaded": item.get("lastDownloaded"),
                    "warnings": item.get("warnings"),
                    "errors": item.get("errors"),
                    "is_pending": item.get("isPending"),
                }
                for item in raw_sitemaps
            ],
            "visibility": sitemap_perf,
        },
        "url_inspection": inspections,
        "priority_hubs": priority_hubs,
    }
    return report


def _pct(value: float) -> str:
    return f"{value * 100:.3f}%"


def _delta(current: float, previous: float) -> str:
    if previous == 0:
        return "n/a" if current == 0 else "+∞"
    return f"{((current - previous) / previous) * 100:+.1f}%"


def render_markdown(report: dict[str, Any]) -> str:
    cur28 = report["summary_28d"]
    prev28 = report["previous_28d"]
    cur7 = report["summary_7d"]
    prev7 = report["previous_7d"]
    priority = {item["url"]: item for item in report["url_inspection"] if item.get("url") in report["priority_hubs"]}

    lines = [
        "# 5sigmas direct Search Console state",
        "",
        f"- **Status:** `{report['status']}`",
        f"- **Mode:** `{report['mode']}`",
        f"- **Generated:** `{report['generated_at']}`",
        f"- **Settled through:** `{report['settled_through']}`",
        f"- **First incomplete date:** `{report.get('first_incomplete_date') or report['fresh'].get('first_incomplete_date') or 'unknown'}`",
        "",
        "## KPI",
        "",
        f"- 28d: **{cur28['clicks']:.0f} clicks / {cur28['impressions']:.0f} impressions / {_pct(cur28['ctr'])} CTR / {cur28['position']:.2f} avg position**",
        f"- Previous 28d: **{prev28['clicks']:.0f} / {prev28['impressions']:.0f} / {_pct(prev28['ctr'])} / {prev28['position']:.2f}**",
        f"- 28d movement: clicks `{_delta(cur28['clicks'], prev28['clicks'])}`, impressions `{_delta(cur28['impressions'], prev28['impressions'])}`",
        f"- 7d: **{cur7['clicks']:.0f} / {cur7['impressions']:.0f} / {_pct(cur7['ctr'])} / {cur7['position']:.2f}**",
        f"- Previous 7d: **{prev7['clicks']:.0f} / {prev7['impressions']:.0f} / {_pct(prev7['ctr'])} / {prev7['position']:.2f}**",
        "",
        "## Protected experiments",
        "",
    ]
    for item in report["protected"]["experiments"]:
        lines.append(
            f"- PR #{item.get('pr')}: `{item.get('id')}` — protected=`{item['protected']}`; settled days after deploy=`{item['settled_days_after_deploy']}`/{item.get('min_settled_days', 10)}; target `{item.get('urls', [''])[0]}`"
        )
    if not report["protected"]["experiments"]:
        lines.append("- none")

    lines += ["", "## Top query opportunities", "", "| Query | Impr. | Clicks | CTR | Pos. | Owner | Score | Protected |", "|---|---:|---:|---:|---:|---|---:|:---:|"]
    for item in report["opportunities"][:12]:
        lines.append(
            f"| {item['query'].replace('|', '/')} | {item['impressions']:.0f} | {item['clicks']:.0f} | {_pct(item['ctr'])} | {item['position']:.2f} | `{item['top_page']}` | {item['score']:.2f} | {'yes' if item['protected'] else 'no'} |"
        )

    lines += ["", "## Cannibalization / ownership", "", "| Query | Impr. | Pos. | Top owner share | Entropy | Protected |", "|---|---:|---:|---:|---:|:---:|"]
    if report["cannibalization"]:
        for item in report["cannibalization"][:10]:
            lines.append(
                f"| {item['query'].replace('|', '/')} | {item['impressions']:.0f} | {item['position']:.2f} | {item['top_page_share'] * 100:.1f}% | {item['entropy']:.2f} | {'yes' if item['protected'] else 'no'} |"
            )
    else:
        lines.append("| none |  |  |  |  |  |")

    lines += ["", "## Rising pages · settled 7d vs previous 7d", "", "| URL | Impr. | Δ impr. | Clicks | Δ clicks | Pos. | Δ pos improvement |", "|---|---:|---:|---:|---:|---:|---:|"]
    for item in report["rising_pages"][:12]:
        lines.append(
            f"| `{item['url']}` | {item['impressions']:.0f} | {item['impressions_delta']:+.0f} | {item['clicks']:.0f} | {item['clicks_delta']:+.0f} | {item['position']:.2f} | {item['position_improvement']:+.2f} |"
        )

    lines += ["", "## Sitemap visibility", ""]
    for item in report["sitemaps"]["visibility"]:
        if item.get("error"):
            lines.append(f"- `{item['sitemap']}` — ERROR: `{item['error']}`")
        else:
            lines.append(
                f"- `{item['sitemap']}` — **{item['urls_with_impressions']}/{item['url_count']} URLs with settled impressions** ({item['visibility_ratio'] * 100:.1f}%)"
            )

    lines += ["", "## Priority URL Inspection", ""]
    for url in report["priority_hubs"]:
        item = priority.get(url, {"url": url, "error": "missing inspection result"})
        if item.get("error"):
            lines.append(f"- `{url}` — ERROR: `{item['error']}`")
        else:
            lines.append(
                f"- `{url}` — `{item.get('verdict')}` / `{item.get('coverage_state')}` / `{item.get('indexing_state')}` / crawl `{item.get('last_crawl_time')}`"
            )

    fresh_rows = [row for row in report["fresh"]["rows"] if not row["settled"]]
    lines += ["", "## Fresh / incomplete signal", ""]
    if fresh_rows:
        for row in fresh_rows:
            lines.append(
                f"- `{row['date']}` — {row['clicks']:.0f} clicks / {row['impressions']:.0f} impressions / {_pct(row['ctr'])} / pos {row['position']:.2f} — **INCOMPLETE; leading signal only**"
            )
    else:
        lines.append("- No incomplete daily rows returned.")

    compact = json.dumps(report, ensure_ascii=False, separators=(",", ":"))
    lines += [
        "",
        "<details><summary>Machine-readable JSON</summary>",
        "",
        "```json",
        compact,
        "```",
        "</details>",
        "",
        "_Generated directly from Google Search Console APIs by `seo/gsc`; no GSC Wizard dependency._",
    ]
    return "\n".join(lines) + "\n"


def load_json(path: str | Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)
