#!/usr/bin/env python3
"""Plan delegated CI suites from the current PR diff or a manual suite request."""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import subprocess
from pathlib import Path

SUITES = ("core", "series", "owner", "english", "locale", "tools")

PATTERNS = {
    "core": [
        "docs/**", "locales/**", "discovery/**", "overrides/**", "overrides_locale/**",
        "hooks/**", "scripts/**", "mkdocs.yml", "mkdocs.en.yml", "main.py", "locale_main.py",
        "requirements.txt", "Makefile", "VIDEO_DELIVERY.md",
        ".github/workflows/deploy-pages.yml", ".github/workflows/publish-video-media.yml",
        ".github/workflows/pr-visual-review.yml", ".github/workflows/delegate-quality.yml",
    ],
    "series": [
        "hooks/series_experience.py", "hooks/series_curriculum.json",
        "docs/stylesheets/series-experience.css", "docs/stylesheets/advanced-series-golden.css",
        "docs/assets/javascripts/series-experience.js",
        "docs/assets/javascripts/advanced-series-golden.js",
        "docs/assets/javascripts/reader-direct-navigation.js",
        "scripts/capture_gallery_series_review.py", "scripts/capture_series_ui_review.py",
        "scripts/test_series_experience.py", "scripts/test_series_navigation.py",
        "scripts/test_publication_nav.py", ".github/workflows/series-ui-review.yml",
    ],
    "owner": [
        "docs/stylesheets/advanced-series-golden.css", "docs/stylesheets/series-experience.css",
        "docs/assets/javascripts/advanced-series-golden.js",
        "docs/assets/javascripts/series-experience.js",
        "scripts/build_series_owner_review.py", "scripts/test_series_owner_review.py",
        "quality/series-owner-review/reviewer.html",
        ".github/workflows/series-owner-workbench.yml",
    ],
    "english": [
        "locales/en/**", "discovery/**", "mkdocs.en.yml", "locale_main.py",
        "hooks/video_sitemap_en.py", "hooks/locale_alternates.py",
        "scripts/prepare_locale.py", "scripts/prepare_modelos_r2_ci_media.sh",
        "scripts/audit_english_full_parity.py", "scripts/validate_english_*.mjs",
        ".github/workflows/english-mirror-quality.yml",
    ],
    "locale": [
        "mkdocs.yml", "mkdocs.en.yml", "locales/**", "discovery/**", "hooks/**",
        "overrides/**", "overrides_locale/**", "scripts/validate_locale_switching.mjs",
        "scripts/prepare_modelos_r2_ci_media.sh", ".github/workflows/locale-switch-quality.yml",
    ],
    "tools": [
        "docs/herramientas/**", "locales/en/tools/**", "docs/assets/data/tools/**",
        "docs/assets/javascripts/tools/**", "docs/stylesheets/tools*.css", "tools/**",
        "hooks/locale_alternates.py", "scripts/prepare_locale.py",
        "scripts/audit_english_full_parity.py", "scripts/audit_multilingual_search_foundation.py",
        "scripts/*tool*.mjs", "scripts/validate_locale_switching.mjs",
        "mkdocs.yml", "mkdocs.en.yml", ".github/workflows/tools-quality.yml",
    ],
}


def changed_files(base: str, head: str) -> list[str]:
    if not base or not head:
        return []
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...{head}"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def matches(path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def plan(files: list[str], requested: str) -> dict[str, bool]:
    selected = {suite: False for suite in SUITES}
    if requested and requested != "auto":
        if requested == "full":
            return {suite: True for suite in SUITES}
        if requested == "reader":
            selected["core"] = True
            return selected
        if requested not in selected:
            raise SystemExit(f"Unknown delegated suite: {requested}")
        selected[requested] = True
        if requested == "series":
            selected["owner"] = True
        if requested == "english":
            selected["locale"] = True
        return selected

    for suite in SUITES:
        selected[suite] = any(matches(path, PATTERNS[suite]) for path in files)

    # Core is the canonical site-wide safety net. A focused suite never replaces it.
    if any(selected[suite] for suite in ("series", "owner", "english", "locale", "tools")):
        selected["core"] = True
    return selected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default=os.environ.get("BASE_SHA", ""))
    parser.add_argument("--head", default=os.environ.get("HEAD_SHA", ""))
    parser.add_argument("--suite", default=os.environ.get("DELEGATED_SUITE", "auto"))
    parser.add_argument("--github-output", default=os.environ.get("GITHUB_OUTPUT", ""))
    args = parser.parse_args()

    files = changed_files(args.base, args.head) if args.suite == "auto" else []
    selected = plan(files, args.suite)
    payload = {"changed_files": files, **selected}
    print(json.dumps(payload, indent=2, sort_keys=True))

    if args.github_output:
        output = Path(args.github_output)
        with output.open("a", encoding="utf-8") as handle:
            for suite, enabled in selected.items():
                handle.write(f"{suite}={'true' if enabled else 'false'}\n")
            handle.write("changed_count=" + str(len(files)) + "\n")


if __name__ == "__main__":
    main()
