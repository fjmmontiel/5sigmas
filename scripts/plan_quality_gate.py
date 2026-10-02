#!/usr/bin/env python3
"""Plan delegated CI workers from one diff or an explicit manual scope."""
from __future__ import annotations

import argparse
import fnmatch
import subprocess

WORKERS = {
    "site": [
        "docs/**", "locales/**", "discovery/**", "overrides/**", "overrides_locale/**",
        "hooks/**", "scripts/**", "quality/**", "mkdocs.yml", "mkdocs.en.yml",
        "main.py", "locale_main.py", "requirements.txt", "Makefile", "VIDEO_DELIVERY.md",
    ],
    "tools": [
        "docs/herramientas/**", "locales/en/tools/**", "docs/assets/data/tools/**",
        "docs/assets/javascripts/tools/**", "docs/stylesheets/tools*.css", "tools/**",
        "scripts/*tool*.mjs", "scripts/audit_volatile_tool_freshness.mjs",
        "scripts/refresh_model_price_performance_upstream.mjs",
        "scripts/audit_tool_seo_geo_shell.py", "scripts/tests/test_audit_tool_seo_geo_shell.py",
    ],
    "english": [
        "locales/en/**", "mkdocs.en.yml", "locale_main.py", "hooks/video_sitemap_en.py",
        "hooks/locale_alternates.py", "scripts/prepare_locale.py",
        "scripts/audit_english*.py", "scripts/validate_english*.mjs",
        "scripts/validate_locale_switching.mjs",
    ],
    "topics": [
        "docs/temas/**", "locales/en/temas/**", "docs/snippets/temas/**",
        "locales/en/snippets/temas/**", "docs/articulos-tecnicos/voice-agent-architectures.md",
        "locales/en/articulos-tecnicos/voice-agent-architectures.md",
        "scripts/validate_*_visual.mjs", "scripts/validate_voice_architecture_article.mjs",
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
}

EXPLICIT = {
    "full": {"site", "tools", "english", "topics", "series"},
    "site": {"site"},
    "tools": {"tools"},
    "english": {"english"},
    "topics": {"topics"},
    "series": {"series"},
    "owner": {"series", "owner"},
}


def changed_files(base: str, head: str) -> list[str]:
    if not base or not head or base == head:
        return []
    raw = subprocess.check_output(
        ["git", "diff", "--name-only", base, head],
        text=True,
    )
    return [line.strip() for line in raw.splitlines() if line.strip()]


def matches(path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--scope", default="auto")
    args = parser.parse_args()

    scope = args.scope or "auto"
    enabled = {name: False for name in [*WORKERS, "owner"]}

    files = changed_files(args.base, args.head)
    if scope != "auto":
        if scope not in EXPLICIT:
            raise SystemExit(f"Unknown scope: {scope}")
        for name in EXPLICIT[scope]:
            enabled[name] = True
    else:
        infrastructure_change = any(
            path.startswith(".github/workflows/")
            or path in {"scripts/plan_quality_gate.py", "scripts/audit_ci_storage_policy.py"}
            for path in files
        )
        if infrastructure_change:
            for worker in WORKERS:
                enabled[worker] = True
        else:
            for worker, patterns in WORKERS.items():
                enabled[worker] = any(matches(path, patterns) for path in files)

    for name in [*WORKERS, "owner"]:
        print(f"{name}={'true' if enabled[name] else 'false'}")
    print("changed_count=" + str(len(files)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
