#!/usr/bin/env python3
"""Plan autonomous quality workers from a PR diff or one manual delegated suite."""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import subprocess
from pathlib import Path

SUITES = ("core", "series", "owner", "english", "tools", "topics")
AUTO_SUITES = ("core", "series", "english", "tools", "topics")

PATTERNS = {
    "core": [
        "docs/**", "locales/**", "discovery/**", "overrides/**", "overrides_locale/**",
        "hooks/**", "scripts/**", "quality/**", "mkdocs.yml", "mkdocs.en.yml",
        "main.py", "locale_main.py", "requirements.txt", "Makefile", "VIDEO_DELIVERY.md",
    ],
    "series": [
        "hooks/series_experience.py", "hooks/series_curriculum.json",
        "docs/stylesheets/series-experience.css", "docs/stylesheets/advanced-series-golden.css",
        "docs/assets/javascripts/series-experience.js",
        "docs/assets/javascripts/advanced-series-golden.js",
        "docs/assets/javascripts/reader-direct-navigation.js",
        "scripts/capture_*series*review.py", "scripts/test_series*.py",
        "scripts/test_publication_nav.py", "scripts/validate_series_covers_follow_player.mjs",
        "quality/series-owner-review/**",
    ],
    "english": [
        "locales/en/**", "discovery/**", "mkdocs.en.yml", "locale_main.py",
        "hooks/video_sitemap_en.py", "hooks/locale_alternates.py",
        "scripts/prepare_locale.py", "scripts/prepare_modelos_r2_ci_media.sh",
        "scripts/audit_english*.py", "scripts/validate_english*.mjs",
        "scripts/validate_locale_switching.mjs",
    ],
    "tools": [
        "docs/herramientas/**", "locales/en/tools/**", "docs/assets/data/tools/**",
        "docs/assets/javascripts/tools/**", "docs/stylesheets/tools*.css", "tools/**",
        "hooks/locale_alternates.py", "scripts/prepare_locale.py",
        "scripts/audit_multilingual_search_foundation.py", "scripts/*tool*.mjs",
        "scripts/audit_tool_seo_geo_shell.py", "scripts/tests/test_audit_tool_seo_geo_shell.py",
        "scripts/validate_locale_switching.mjs", "mkdocs.yml", "mkdocs.en.yml",
    ],
    "topics": [
        "docs/temas/**", "locales/en/temas/**", "docs/snippets/temas/**",
        "locales/en/snippets/temas/**", "docs/articulos-tecnicos/voice-agent-architectures.md",
        "locales/en/articulos-tecnicos/voice-agent-architectures.md",
        "scripts/validate_*_visual.mjs", "scripts/validate_voice_architecture_article.mjs",
    ],
}


def git_rev(value: str, fallback: str) -> str:
    if value:
        return value
    return subprocess.check_output(["git", "rev-parse", fallback], text=True).strip()


def changed_files(base: str, head: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...{head}"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def matches(path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def explicit_plan(requested: str) -> dict[str, bool]:
    selected = {suite: False for suite in SUITES}
    if requested == "full":
        for suite in AUTO_SUITES:
            selected[suite] = True
    elif requested in {"core", "reader"}:
        selected["core"] = True
    elif requested == "owner":
        selected["core"] = True
        selected["series"] = True
        selected["owner"] = True
    elif requested in {"series", "english", "tools", "topics"}:
        selected["core"] = True
        selected[requested] = True
    else:
        raise SystemExit(f"Unknown delegated suite: {requested}")
    return selected


def auto_plan(files: list[str]) -> dict[str, bool]:
    selected = {suite: False for suite in SUITES}
    infrastructure_change = any(
        path.startswith(".github/workflows/")
        or path in {"scripts/ci_plan.py", "scripts/audit_ci_storage_policy.py"}
        for path in files
    )
    if infrastructure_change:
        for suite in AUTO_SUITES:
            selected[suite] = True
        return selected

    for suite in ("series", "english", "tools", "topics"):
        selected[suite] = any(matches(path, PATTERNS[suite]) for path in files)
    selected["core"] = any(matches(path, PATTERNS["core"]) for path in files)
    if any(selected[suite] for suite in ("series", "english", "tools", "topics")):
        selected["core"] = True
    return selected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default=os.environ.get("BASE_SHA", ""))
    parser.add_argument("--head", default=os.environ.get("HEAD_SHA", ""))
    parser.add_argument("--suite", default=os.environ.get("DELEGATED_SUITE", "auto"))
    parser.add_argument("--github-output", default=os.environ.get("GITHUB_OUTPUT", ""))
    args = parser.parse_args()

    head = git_rev(args.head, "HEAD")
    base = git_rev(args.base, "HEAD^")
    requested = args.suite or "auto"
    files = changed_files(base, head) if requested == "auto" else []
    selected = auto_plan(files) if requested == "auto" else explicit_plan(requested)

    payload = {"base_sha": base, "head_sha": head, "changed_files": files, **selected}
    print(json.dumps(payload, indent=2, sort_keys=True))

    if args.github_output:
        with Path(args.github_output).open("a", encoding="utf-8") as handle:
            handle.write(f"base_sha={base}\n")
            handle.write(f"head_sha={head}\n")
            for suite, enabled in selected.items():
                handle.write(f"{suite}={'true' if enabled else 'false'}\n")
            handle.write("changed_count=" + str(len(files)) + "\n")


if __name__ == "__main__":
    main()
