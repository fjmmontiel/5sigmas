#!/usr/bin/env python3
"""Fail closed when redesigned Security snippets contain structurally broken inline CSS."""
from __future__ import annotations

import re
from pathlib import Path

TARGETS = {
    "docs/snippets/seguridad-ia/02-superficie-jailbreak.html": ".jbsearch__grid{",
    "docs/snippets/seguridad-ia/02-attack-budget.html": ".jbbudget__grid{",
    "docs/snippets/seguridad-ia/02-outcome-ladder.html": ".jbladder__controls{",
    "docs/snippets/seguridad-ia/03-persistencia.html": ".memlife__stage{",
    "docs/snippets/seguridad-ia/03-runtime-vs-weights.html": ".memlayers__lab{",
    "docs/snippets/seguridad-ia/03-propagation-map.html": ".memprop__map{",
    "docs/snippets/seguridad-ia/04-regression-loop.html": ".regloop__controls{",
    "docs/snippets/seguridad-ia/05-release-gate.html": ".releasegate__stage{",
}

STYLE_RE = re.compile(r"<style>(.*?)</style>", re.DOTALL | re.IGNORECASE)
PAIRS = {"(": ")", "[": "]", "{": "}"}
CLOSERS = {v: k for k, v in PAIRS.items()}


def structural_error(css: str) -> str | None:
    stack: list[tuple[str, int]] = []
    quote: str | None = None
    escaped = False
    i = 0
    while i < len(css):
        ch = css[i]
        nxt = css[i + 1] if i + 1 < len(css) else ""
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch in {"'", '"'}:
            quote = ch
            i += 1
            continue
        if ch == "/" and nxt == "*":
            end = css.find("*/", i + 2)
            if end == -1:
                return f"unterminated comment at offset {i}"
            i = end + 2
            continue
        if ch in PAIRS:
            stack.append((ch, i))
        elif ch in CLOSERS:
            if not stack:
                return f"unexpected {ch!r} at offset {i}"
            opening, offset = stack.pop()
            if CLOSERS[ch] != opening:
                return f"mismatched {opening!r} at {offset} with {ch!r} at {i}"
        i += 1
    if quote:
        return "unterminated quoted string"
    if stack:
        opening, offset = stack[-1]
        return f"unclosed {opening!r} at offset {offset}"
    return None


def main() -> int:
    failures: list[str] = []
    for filename, required_selector in TARGETS.items():
        text = Path(filename).read_text(encoding="utf-8")
        match = STYLE_RE.search(text)
        if not match:
            failures.append(f"{filename}: missing inline <style>")
            continue
        css = match.group(1)
        error = structural_error(css)
        if error:
            failures.append(f"{filename}: {error}")
        if "background:linear-gradient(" not in css:
            failures.append(f"{filename}: expected root gradient declaration missing")
        if required_selector not in css:
            failures.append(f"{filename}: downstream selector {required_selector!r} missing")
        if css.count("{") < 10:
            failures.append(f"{filename}: implausibly small CSS rule set ({css.count('{')} blocks)")
    if failures:
        print("SECURITY_INLINE_CSS=FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print(f"SECURITY_INLINE_CSS=PASS targets={len(TARGETS)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
