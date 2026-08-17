#!/usr/bin/env python3
"""Audit static English HTML snippets for mechanical editorial punctuation.

The Markdown audit covers article prose. This companion scan covers static text
inside localized HTML visuals without confusing CSS/JS semicolons with prose.
Only rendered <li> text is a hard contract here; script/style contents and HTML
attributes are ignored by construction.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNIPPET_ROOT = ROOT / "locales" / "en" / "snippets"


@dataclass(frozen=True)
class Finding:
    kind: str
    path: str
    excerpt: str


class ListTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0
        self.li_depth = 0
        self.current: list[str] = []
        self.items: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:  # type: ignore[no-untyped-def]
        tag = tag.lower()
        if tag in {"script", "style"}:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag == "li":
            if self.li_depth == 0:
                self.current = []
            self.li_depth += 1

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"script", "style"}:
            if self.skip_depth:
                self.skip_depth -= 1
            return
        if self.skip_depth:
            return
        if tag == "li" and self.li_depth:
            self.li_depth -= 1
            if self.li_depth == 0:
                text = " ".join("".join(self.current).split())
                if text:
                    self.items.append(text)
                self.current = []

    def handle_data(self, data: str) -> None:
        if not self.skip_depth and self.li_depth:
            self.current.append(data)


def scan(path: Path) -> list[Finding]:
    parser = ListTextParser()
    try:
        parser.feed(path.read_text(encoding="utf-8"))
    except Exception as exc:  # malformed source should remain visible to QA
        return [Finding("html_parse_error", str(path.relative_to(ROOT)), str(exc))]

    findings: list[Finding] = []
    for text in parser.items:
        if text.rstrip().endswith(";"):
            findings.append(
                Finding(
                    "semicolon_terminated_html_list_item",
                    str(path.relative_to(ROOT)),
                    text[:300],
                )
            )
    return findings


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", dest="json_path")
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    paths = sorted(SNIPPET_ROOT.rglob("*.html"))
    findings = [finding for path in paths for finding in scan(path)]

    print("English HTML editorial-quality audit")
    print(f"  localized HTML snippets: {len(paths)}")
    print(f"  hard errors:            {len(findings)}")
    for finding in findings:
        print(f"ERROR {finding.kind} {finding.path} — {finding.excerpt}")

    if args.json_path:
        output = Path(args.json_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(
                {
                    "localized_html_snippets": len(paths),
                    "hard_error_count": len(findings),
                    "findings": [asdict(item) for item in findings],
                },
                ensure_ascii=False,
                indent=2,
            ) + "\n",
            encoding="utf-8",
        )

    if args.strict and findings:
        print("English HTML editorial quality has hard anti-patterns.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
