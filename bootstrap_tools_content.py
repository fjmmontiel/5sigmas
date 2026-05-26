#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path


LINKS = (
    "5sigmas.html",
    "business",
    "distribution",
    "ops",
    "playbooks",
    "research",
    "tools",
    "videos",
)


def tools_root(repo_root: Path) -> Path:
    configured = os.environ.get("FIVESIGMAS_TOOLS_CONTENT_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()
    return (repo_root.parent / "5sigmas-tools-content").resolve()


def ensure_link(repo_root: Path, tools_repo: Path, name: str) -> None:
    source = tools_repo / name
    target = repo_root / name
    if not source.exists():
        raise SystemExit(f"Falta {source}")
    if target.is_symlink():
        if target.resolve() == source.resolve():
            return
        target.unlink()
    elif target.exists():
        raise SystemExit(f"{target} ya existe y no es un symlink. Resuélvelo manualmente antes de bootstrappear.")
    target.symlink_to(source)


def main() -> None:
    repo_root = Path(__file__).resolve().parent
    tools_repo = tools_root(repo_root)
    if not tools_repo.exists():
        raise SystemExit(f"No existe el repo de tooling: {tools_repo}")
    for name in LINKS:
        ensure_link(repo_root, tools_repo, name)
    print(f"Workspace enlazado contra {tools_repo}")


if __name__ == "__main__":
    main()

