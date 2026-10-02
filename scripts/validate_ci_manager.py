#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
MANIFEST = ROOT / "quality" / "ci-workflows.json"
MANAGER = WORKFLOWS / "pr-quality-manager.yml"
ALLOWED_PULL_REQUEST = {MANAGER.name}


def on_block(text: str) -> list[str]:
    lines = text.splitlines()
    try:
        start = lines.index("on:") + 1
    except ValueError:
        return []
    block = []
    for line in lines[start:]:
        if line and not line.startswith((" ", "\t")):
            break
        block.append(line)
    return block


def has_trigger(text: str, trigger: str) -> bool:
    return any(line.strip() == f"{trigger}:" and line.startswith("  ") for line in on_block(text))


def main() -> None:
    data = json.loads(MANIFEST.read_text())
    entries = data["workflows"]
    ids = [entry["id"] for entry in entries]
    paths = [entry["workflow"] for entry in entries]
    errors: list[str] = []

    if len(ids) != len(set(ids)):
        errors.append("Duplicate workflow ids in quality/ci-workflows.json")
    if len(paths) != len(set(paths)):
        errors.append("Duplicate workflow paths in quality/ci-workflows.json")

    for workflow in sorted(WORKFLOWS.glob("*.yml")):
        text = workflow.read_text()
        if has_trigger(text, "pull_request") and workflow.name not in ALLOWED_PULL_REQUEST:
            errors.append(f"{workflow}: direct pull_request trigger is forbidden; delegate through pr-quality-manager.yml")

    manager_text = MANAGER.read_text()
    if not has_trigger(manager_text, "pull_request"):
        errors.append("PR quality manager must own the pull_request trigger")

    for entry in entries:
        path = ROOT / entry["workflow"]
        if not path.exists():
            errors.append(f"Missing delegated workflow: {entry['workflow']}")
            continue
        text = path.read_text()
        if not has_trigger(text, "workflow_call"):
            errors.append(f"{entry['workflow']}: missing workflow_call trigger")
        if f"uses: ./{entry['workflow']}" not in manager_text:
            errors.append(f"Manager does not delegate {entry['workflow']}")
        if entry["workflow"] == ".github/workflows/pr-quality-manager.yml":
            errors.append("Manager must not delegate itself")

    if errors:
        raise SystemExit("\n".join(f"- {error}" for error in errors))

    print(f"CI_MANAGER_CONTRACT_PASS delegated={len(entries)} automatic_pr_entrypoints=1")


if __name__ == "__main__":
    main()
