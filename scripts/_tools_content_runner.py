from __future__ import annotations

import os
import runpy
import sys
from pathlib import Path


def resolve_tools_root() -> Path:
    current = Path(__file__).resolve()
    repo_root = current.parents[1]
    configured = os.environ.get("FIVESIGMAS_TOOLS_CONTENT_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()
    return (repo_root.parent / "5sigmas-tools-content").resolve()


def run_external(script_name: str) -> None:
    tools_root = resolve_tools_root()
    target = tools_root / "scripts" / script_name
    if not target.exists():
        raise SystemExit(f"No existe el script externo: {target}")
    external_scripts = str(target.parent)
    if external_scripts not in sys.path:
        sys.path.insert(0, external_scripts)
    sys.argv[0] = str(target)
    runpy.run_path(str(target), run_name="__main__")

