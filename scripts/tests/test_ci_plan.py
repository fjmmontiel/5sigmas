#!/usr/bin/env python3
import importlib.util
from pathlib import Path

root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("ci_plan",root/"scripts"/"ci_plan.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
manifest={"workflows":[
    {"id":"core","workflow":".github/workflows/core.yml","suite":"core","paths":["docs/**"]},
    {"id":"series","workflow":".github/workflows/series.yml","suite":"series","paths":["hooks/series_*"]},
    {"id":"english","workflow":".github/workflows/english.yml","suite":"english","paths":["locales/en/**/*.md"]},
    {"id":"locale","workflow":".github/workflows/locale.yml","suite":"locale","paths":["mkdocs.en.yml"]},
]}
assert module.select(manifest,["hooks/series_experience.py"],"auto")==["series"]
assert module.select(manifest,["locales/en/index.md"],"auto")==["english"]
assert module.select(manifest,[".github/workflows/core.yml"],"auto")==["core"]
assert module.select(manifest,[],"series")==["core","series"]
assert module.select(manifest,[],"english")==["core","english","locale"]
assert module.select(manifest,[],"full")==["core","series","english","locale"]
assert module.select(manifest,["docs/index.md"],"auto",draft=True)==[]
print("CI_PLAN_PASS")
