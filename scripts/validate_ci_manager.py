#!/usr/bin/env python3
"""Enforce one PR quality entrypoint and a synchronized delegation manifest."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
MANIFEST = ROOT / "quality" / "ci-workflows.json"
MANAGER = WORKFLOWS / "delegate-quality.yml"
AUTOMERGE = WORKFLOWS / "delegated-automerge.yml"


def on_block(text: str) -> list[str]:
    lines = text.splitlines()
    try:
        start = lines.index("on:") + 1
    except ValueError:
        return []
    block: list[str] = []
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
        errors.append("Duplicate ids in quality/ci-workflows.json")
    if len(paths) != len(set(paths)):
        errors.append("Duplicate workflow paths in quality/ci-workflows.json")

    workflow_files = sorted({*WORKFLOWS.glob("*.yml"), *WORKFLOWS.glob("*.yaml")})
    for workflow in workflow_files:
        if has_trigger(workflow.read_text(), "pull_request") and workflow != MANAGER:
            errors.append(f"{workflow.relative_to(ROOT)} has a direct pull_request trigger")

    manager_text = MANAGER.read_text()
    if "name: Delegated PR quality" not in manager_text:
        errors.append("Delegated manager workflow name changed; automerge contract would break")
    if not has_trigger(manager_text, "pull_request"):
        errors.append("delegate-quality.yml must own pull_request")

    for entry in entries:
        path = ROOT / entry["workflow"]
        if not path.exists():
            errors.append(f"Missing delegated workflow: {entry['workflow']}")
            continue
        child = path.read_text()
        if not has_trigger(child, "workflow_call"):
            errors.append(f"{entry['workflow']} is not reusable via workflow_call")
        if f"uses: ./{entry['workflow']}" not in manager_text:
            errors.append(f"delegate-quality.yml does not call {entry['workflow']}")

    automerge_text = AUTOMERGE.read_text()
    if "Delegated PR quality" not in automerge_text:
        errors.append("delegated-automerge.yml is not listening to Delegated PR quality")

    if errors:
        raise SystemExit("\n".join(f"- {error}" for error in errors))
    print(f"CI_MANAGER_CONTRACT_PASS delegated={len(entries)} automatic_pr_entrypoints=1")


if __name__ == "__main__":
    main()
