#!/usr/bin/env python3
import json
import tempfile
from pathlib import Path
import importlib.util

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("planner", root / "scripts" / "plan_pr_quality.py")
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)

manifest = {
    "workflows": [
        {"id": "core", "suite": "core", "paths": ["docs/**"]},
        {"id": "series", "suite": "series", "paths": ["hooks/series_*", "docs/stylesheets/series-*.css"]},
        {"id": "english", "suite": "english", "paths": ["locales/en/**/*.md"]},
    ]
}
assert planner.select(manifest, ["hooks/series_experience.py"], "changed", False) == ["series"]
assert planner.select(manifest, ["locales/en/index.md"], "changed", False) == ["english"]
assert planner.select(manifest, ["docs/index.md"], "changed", False) == ["core"]
assert planner.select(manifest, [], "series", False) == ["core", "series"]
assert planner.select(manifest, [], "all", False) == ["core", "series", "english"]
assert planner.select(manifest, ["docs/index.md"], "changed", True) == []
print("PR_QUALITY_PLANNER_PASS")
