#!/usr/bin/env python3
"""Audit native-English editorial quality against canonical Spanish routes.

This is intentionally narrower than semantic/route parity. It catches mechanical
translation patterns that can survive a faithful translation while still reading
unnaturally in English, especially punctuation and list syntax copied from Spanish.

Hard errors:
- any Markdown bullet in a published English editorial route ending in `;`;
- comma-chained Markdown lists that use each bullet as one clause of a sentence;
- a bold question immediately followed by a colon (`**Question?**:`).

Review signals (reported, not hard failures):
- English routes with materially more Markdown bullets than their Spanish source;
- clusters of three or more very short English bullets;
- short list blocks with mixed terminal punctuation;
- a small set of high-precision translationese phrases that deserve native-English
  review in context;
- certified routes whose English or canonical Spanish blob changed after review.

Code fences are ignored. Front matter is ignored. Generated/non-editorial files
are not scanned; the published route list in locales/en/manifest.yml is the scope.
"""

from __future__ import annotations

import argparse
import hashlib
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
EDITORIAL_REVIEW = EN_ROOT / "editorial_review.yml"

BULLET_RE = re.compile(r"^(?P<indent>\s*)[-*+]\s+(?P<body>\S.*)$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
WORD_RE = re.compile(r"\b[\w’'-]+\b", re.UNICODE)
QUESTION_COLON_RE = re.compile(r"(?:\*\*|__)[^\n]{1,180}\?(?:\*\*|__):")

# These are review signals, not automatic errors. They are deliberately narrow:
# each commonly appears in literal Spanish→English prose but can still be valid
# English in context. The audit surfaces them for human judgement rather than
# rewriting them blindly.
TRANSLATIONESE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("we_are_going_to", re.compile(r"\bwe are going to\b", re.IGNORECASE)),
    ("is_the_following", re.compile(r"\bis the following\b", re.IGNORECASE)),
    ("are_the_following", re.compile(r"\bare the following\b", re.IGNORECASE)),
    ("we_will_see", re.compile(r"\bwe will see\b", re.IGNORECASE)),
    ("it_is_convenient_or_advisable", re.compile(r"\bit is (?:convenient|advisable) to\b", re.IGNORECASE)),
    ("almost_same_question_always_appears", re.compile(r"\balmost the same question always appears\b", re.IGNORECASE)),
    ("problem_appears_when", re.compile(r"\bthe problem appears when\b", re.IGNORECASE)),
    ("adds_real_value_to", re.compile(r"\badds real value to\b", re.IGNORECASE)),
    ("justifies_cost_and_coupling", re.compile(r"\bjustifies its cost and coupling\b", re.IGNORECASE)),
    ("makes_the_most_sense_to_me", re.compile(r"\bmakes the most sense to me\b", re.IGNORECASE)),
    ("it_is_useful_to_separate", re.compile(r"\bit is (?:also )?useful to separate\b", re.IGNORECASE)),
)


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


def load_editorial_review() -> dict:
    if not EDITORIAL_REVIEW.is_file():
        return {}
    data = yaml.safe_load(EDITORIAL_REVIEW.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise SystemExit("locales/en/editorial_review.yml must contain a mapping")
    return data


def published_markdown_routes() -> list[str]:
    routes = load_manifest().get("published_routes") or []
    return sorted(
        str(route)
        for route in routes
        if str(route).endswith(".md") and (EN_ROOT / str(route)).is_file()
    )


def git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


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


def visible_body(body: str) -> str:
    return re.sub(r"\s*<!--.*?-->\s*$", "", body).rstrip()


def bullet_blocks(path: Path) -> list[list[tuple[int, str, str]]]:
    blocks: list[list[tuple[int, str, str]]] = []
    current: list[tuple[int, str, str]] = []
    previous_line: int | None = None
    previous_indent: str | None = None

    for line_no, indent, body in markdown_bullets(path):
        adjacent = previous_line is not None and line_no <= previous_line + 2
        same_indent = previous_indent == indent
        if current and (not adjacent or not same_indent):
            blocks.append(current)
            current = []
        current.append((line_no, indent, body))
        previous_line = line_no
        previous_indent = indent
    if current:
        blocks.append(current)
    return blocks


def punctuation_findings(route: str, path: Path) -> list[Finding]:
    findings: list[Finding] = []

    for line_no, _indent, body in markdown_bullets(path):
        visible = visible_body(body)
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

    # Detect list blocks that preserve Spanish sentence punctuation across
    # separate Markdown bullets, e.g. "Search...," / "Memory...," / "Worlds.".
    for block in bullet_blocks(path):
        comma_items = [item for item in block if visible_body(item[2]).endswith(",")]
        if len(block) >= 3 and len(comma_items) >= 2:
            findings.append(
                Finding(
                    kind="comma_chained_bullet_list",
                    route=route,
                    line=block[0][0],
                    excerpt=" | ".join(visible_body(item[2]) for item in block[:5])[:320],
                    severity="error",
                )
            )

    for line_no, line in body_lines(path):
        if QUESTION_COLON_RE.search(line):
            findings.append(
                Finding(
                    kind="question_followed_by_colon",
                    route=route,
                    line=line_no,
                    excerpt=line.strip()[:260],
                    severity="error",
                )
            )

    return findings


def translationese_findings(route: str, path: Path) -> list[Finding]:
    findings: list[Finding] = []
    for line_no, line in body_lines(path):
        # Skip raw HTML/template lines: the editorial text in those surfaces is
        # checked in their canonical snippet source, not inferred here.
        stripped = line.strip()
        if not stripped or stripped.startswith(("<", "{{", "!!!")):
            continue
        for name, pattern in TRANSLATIONESE_PATTERNS:
            if pattern.search(line):
                findings.append(
                    Finding(
                        kind=f"translationese_{name}",
                        route=route,
                        line=line_no,
                        excerpt=stripped[:300],
                        severity="review",
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

    # Short-bullet clusters can be perfectly good checklists, so this is a
    # review signal rather than a failure.
    for block in bullet_blocks(en_path):
        short_items: list[tuple[int, str]] = []
        for line_no, _indent, body in block:
            words = WORD_RE.findall(re.sub(r"[`*_\[\]()]", " ", body))
            if len(words) <= 8:
                short_items.append((line_no, body))
        if len(block) >= 3 and len(short_items) == len(block):
            findings.append(
                Finding(
                    kind="short_bullet_cluster",
                    route=route,
                    line=block[0][0],
                    excerpt=" | ".join(item for _, item in short_items[:4])[:260],
                    severity="review",
                )
            )

        # Short fragment lists should normally use one punctuation convention.
        # Mixed endings often survive a literal source translation: e.g. four
        # bare fragments followed by one period solely because it was the final
        # item in the Spanish sentence-like list.
        if len(block) >= 3:
            visible = [visible_body(item[2]) for item in block]
            word_counts = [len(WORD_RE.findall(re.sub(r"[`*_\[\]()]", " ", item))) for item in visible]
            if all(count <= 12 for count in word_counts):
                endings = [item[-1] if item and item[-1] in ".!?" else "bare" for item in visible]
                if "bare" in endings and any(end in {".", "!", "?"} for end in endings):
                    findings.append(
                        Finding(
                            kind="mixed_fragment_list_punctuation",
                            route=route,
                            line=block[0][0],
                            excerpt=" | ".join(visible[:5])[:320],
                            severity="review",
                        )
                    )

    return findings


def certification_findings(routes: Iterable[str]) -> tuple[list[Finding], int, int]:
    findings: list[Finding] = []
    route_set = set(routes)
    current_count = 0
    stale_count = 0

    entries = load_editorial_review().get("certified_routes") or []
    if not isinstance(entries, list):
        raise SystemExit("locales/en/editorial_review.yml certified_routes must be a list")

    for entry in entries:
        if not isinstance(entry, dict) or not entry.get("route"):
            findings.append(
                Finding(
                    kind="editorial_certification_invalid",
                    route="editorial_review.yml",
                    line=None,
                    excerpt="Each certified route must be a mapping with a route field",
                    severity="error",
                )
            )
            continue

        route = str(entry["route"])
        if route not in route_set:
            findings.append(
                Finding(
                    kind="editorial_certification_not_published",
                    route=route,
                    line=None,
                    excerpt="Certified route is not present in manifest published_routes",
                    severity="error",
                )
            )
            continue

        en_path = EN_ROOT / route
        es_path = ES_ROOT / route
        if not en_path.is_file() or not es_path.is_file():
            findings.append(
                Finding(
                    kind="editorial_certification_missing_source",
                    route=route,
                    line=None,
                    excerpt="Certified route is missing its English or canonical Spanish file",
                    severity="error",
                )
            )
            continue

        expected_en = str(entry.get("english_blob_sha") or "")
        expected_es = str(entry.get("spanish_blob_sha") or "")
        actual_en = git_blob_sha(en_path)
        actual_es = git_blob_sha(es_path)
        mismatches: list[str] = []
        if not expected_en or actual_en != expected_en:
            mismatches.append(f"EN {expected_en or 'missing'} → {actual_en}")
        if not expected_es or actual_es != expected_es:
            mismatches.append(f"ES {expected_es or 'missing'} → {actual_es}")

        if mismatches:
            stale_count += 1
            findings.append(
                Finding(
                    kind="editorial_certification_stale",
                    route=route,
                    line=None,
                    excerpt="; ".join(mismatches),
                    severity="review",
                )
            )
        else:
            current_count += 1

    return findings, current_count, stale_count


def audit(routes: Iterable[str]) -> list[Finding]:
    findings: list[Finding] = []
    for route in routes:
        en_path = EN_ROOT / route
        es_path = ES_ROOT / route
        findings.extend(punctuation_findings(route, en_path))
        findings.extend(translationese_findings(route, en_path))
        findings.extend(fragmentation_findings(route, en_path, es_path))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", dest="json_path")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    routes = published_markdown_routes()
    findings = audit(routes)
    certification_items, certified_current, certified_stale = certification_findings(routes)
    findings.extend(certification_items)

    errors = [item for item in findings if item.severity == "error"]
    reviews = [item for item in findings if item.severity == "review"]

    print("English editorial-quality audit")
    print(f"  published Markdown routes: {len(routes)}")
    print(f"  current certifications:    {certified_current}")
    print(f"  stale certifications:      {certified_stale}")
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
        "current_certification_count": certified_current,
        "stale_certification_count": certified_stale,
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
