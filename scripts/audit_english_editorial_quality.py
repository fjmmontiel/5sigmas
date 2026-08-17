#!/usr/bin/env python3
"""Audit native-English editorial quality against canonical Spanish routes.

This is intentionally narrower than semantic/route parity. It catches mechanical
translation patterns that can survive a faithful translation while still reading
unnaturally in English, especially list punctuation copied from Spanish prose.

Hard errors:
- any Markdown bullet in a published English editorial route ending in `;`.

Review signals (reported, not hard failures):
- English routes with materially more Markdown bullets than their Spanish source;
- clusters of three or more very short English bullets, which often indicate
  sentence fragmentation that should be reviewed in rendered context.

Code fences are ignored. Front matter is ignored. Generated/non-editorial files
are not scanned; the published route list in locales/en/manifest.yml is the scope.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import yaml

ROOT = Path(__file__).resolve().parents[1]
ES_ROOT = ROOT / "docs"
EN_ROOT = ROOT / "locales" / "en"
MANIFEST = EN_ROOT / "manifest.yml"

BULLET_RE = re.compile(r"^(?P<indent>\s*)[-*+]\s+(?P<body>\S.*)$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
WORD_RE = re.compile(r"\b[\w’'-]+\b", re.UNICODE)


@dataclass(frozen=True)
class Finding:
    kind: str
    route: str
    line: int | None
    excerpt: str
    severity: str


def load_manifest() -> dict:
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise SystemExit("locales/en/manifest.yml must contain a mapping")
    return data


def published_markdown_routes() -> list[str]:
    routes = load_manifest().get("published_routes") or []
    return sorted(
        str(route)
        for route in routes
        if str(route).endswith(".md") and (EN_ROOT / str(route)).is_file()
    )


def body_lines(path: Path) -> list[tuple[int, str]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    result: list[tuple[int, str]] = []
    in_frontmatter = bool(lines and lines[0].strip() == "---")
    in_fence = False

    for index, line in enumerate(lines, start=1):
        if in_frontmatter:
            if index > 1 and line.strip() == "---":
                in_frontmatter = False
            continue

        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        result.append((index, line))
    return result


def markdown_bullets(path: Path) -> list[tuple[int, str, str]]:
    bullets: list[tuple[int, str, str]] = []
    for line_no, line in body_lines(path):
        match = BULLET_RE.match(line)
        if match:
            bullets.append((line_no, match.group("indent"), match.group("body").strip()))
    return bullets


def semicolon_findings(route: str, path: Path) -> list[Finding]:
    findings: list[Finding] = []
    for line_no, _indent, body in markdown_bullets(path):
        # Strip trailing HTML comments because they do not alter rendered prose.
        visible = re.sub(r"\s*<!--.*?-->\s*$", "", body).rstrip()
        if visible.endswith(";"):
            findings.append(
                Finding(
                    kind="semicolon_terminated_bullet",
                    route=route,
                    line=line_no,
                    excerpt=visible[:220],
                    severity="error",
                )
            )
    return findings


def fragmentation_findings(route: str, en_path: Path, es_path: Path) -> list[Finding]:
    findings: list[Finding] = []
    en_bullets = markdown_bullets(en_path)
    es_bullets = markdown_bullets(es_path) if es_path.is_file() else []

    en_count = len(en_bullets)
    es_count = len(es_bullets)
    if es_path.is_file() and en_count >= es_count + 3 and en_count > max(4, es_count * 1.25):
        findings.append(
            Finding(
                kind="bullet_count_drift",
                route=route,
                line=None,
                excerpt=f"EN bullets={en_count}; ES canonical bullets={es_count}",
                severity="review",
            )
        )

    # Short-bullet clusters are only a review signal. They can be good UI copy,
    # but clusters in prose-heavy articles are where machine-translated cadence
    # most often hides.
    cluster: list[tuple[int, str]] = []
    previous_line: int | None = None
    for line_no, _indent, body in en_bullets:
        words = WORD_RE.findall(re.sub(r"[`*_\[\]()]", " ", body))
        short = len(words) <= 8
        adjacent = previous_line is not None and line_no <= previous_line + 2
        if short and (not cluster or adjacent):
            cluster.append((line_no, body))
        else:
            if len(cluster) >= 3:
                findings.append(
                    Finding(
                        kind="short_bullet_cluster",
                        route=route,
                        line=cluster[0][0],
                        excerpt=" | ".join(item for _, item in cluster[:4])[:260],
                        severity="review",
                    )
                )
            cluster = [(line_no, body)] if short else []
        previous_line = line_no
    if len(cluster) >= 3:
        findings.append(
            Finding(
                kind="short_bullet_cluster",
                route=route,
                line=cluster[0][0],
                excerpt=" | ".join(item for _, item in cluster[:4])[:260],
                severity="review",
            )
        )

    return findings


def audit(routes: Iterable[str]) -> list[Finding]:
    findings: list[Finding] = []
    for route in routes:
        en_path = EN_ROOT / route
        es_path = ES_ROOT / route
        findings.extend(semicolon_findings(route, en_path))
        findings.extend(fragmentation_findings(route, en_path, es_path))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", dest="json_path")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    routes = published_markdown_routes()
    findings = audit(routes)
    errors = [item for item in findings if item.severity == "error"]
    reviews = [item for item in findings if item.severity == "review"]

    print("English editorial-quality audit")
    print(f"  published Markdown routes: {len(routes)}")
    print(f"  hard errors:               {len(errors)}")
    print(f"  review signals:            {len(reviews)}")

    for item in errors:
        location = f":{item.line}" if item.line else ""
        print(f"ERROR {item.kind} {item.route}{location} — {item.excerpt}")
    for item in reviews:
        location = f":{item.line}" if item.line else ""
        print(f"REVIEW {item.kind} {item.route}{location} — {item.excerpt}")

    report = {
        "published_markdown_routes": len(routes),
        "hard_error_count": len(errors),
        "review_signal_count": len(reviews),
        "findings": [asdict(item) for item in findings],
    }
    if args.json_path:
        destination = Path(args.json_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    if args.strict and errors:
        print("English editorial quality has hard anti-patterns.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
