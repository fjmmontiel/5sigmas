#!/usr/bin/env python3
"""Keep GitHub Actions small, failure-evidence-only, and delegation-first."""
from __future__ import annotations

from pathlib import Path
import re
import sys

WORKFLOW_DIR = Path(".github/workflows")
UPLOAD = re.compile(r"^\s*(?:-\s*)?uses:\s*actions/upload-artifact@")
PAGES_UPLOAD = re.compile(r"^\s*(?:-\s*)?uses:\s*actions/upload-pages-artifact@")
OWNER_EVIDENCE = {"series-owner-interactive-review"}


def step_block(lines: list[str], index: int) -> str:
    line = lines[index]
    stripped = line.lstrip()
    uses_indent = len(line) - len(stripped)
    step_indent = uses_indent if stripped.startswith("- ") else max(uses_indent - 2, 0)
    start = index
    while start > 0:
        candidate = lines[start - 1]
        candidate_stripped = candidate.lstrip()
        indent = len(candidate) - len(candidate_stripped)
        if indent == step_indent and candidate_stripped.startswith("- "):
            start -= 1
            break
        start -= 1
    end = index + 1
    while end < len(lines):
        candidate = lines[end]
        candidate_stripped = candidate.lstrip()
        indent = len(candidate) - len(candidate_stripped)
        if indent == step_indent and candidate_stripped.startswith("- "):
            break
        end += 1
    return "\n".join(lines[start:end])


def unwrap(expr: str) -> str:
    value = expr.strip()
    if value.startswith("${{") and value.endswith("}}"):
        value = value[3:-2].strip()
    return value


def failure_only(expr: str) -> bool:
    value = unwrap(expr)
    return value == "failure()" or (value.startswith("failure() && ") and "||" not in value)


def owner_review_exception(block: str, expr: str) -> bool:
    if unwrap(expr) != "always()":
        return False
    return any(re.search(rf"(?m)^\s*name:\s*{re.escape(name)}\s*$", block) for name in OWNER_EVIDENCE)


def main() -> int:
    errors: list[str] = []
    pages_uploads: list[tuple[Path, int]] = []

    for path in sorted([*WORKFLOW_DIR.glob("*.yml"), *WORKFLOW_DIR.glob("*.yaml")]):
        lines = path.read_text(encoding="utf-8").splitlines()
        for index, line in enumerate(lines):
            if PAGES_UPLOAD.match(line):
                pages_uploads.append((path, index + 1))
            if not UPLOAD.match(line):
                continue
            block = step_block(lines, index)
            if not re.search(r"(?m)^\s*retention-days:\s*1\s*(?:#.*)?$", block):
                errors.append(f"{path}:{index + 1}: upload-artifact must set retention-days: 1")
            match = re.search(r"(?m)^\s*if:\s*(.+?)\s*$", block)
            if not match:
                errors.append(f"{path}:{index + 1}: upload-artifact must be failure-only")
            else:
                expr = match.group(1).split("#", 1)[0].strip()
                if not failure_only(expr) and not owner_review_exception(block, expr):
                    errors.append(f"{path}:{index + 1}: unsupported artifact condition: {expr}")
            if re.search(r"(?m)^\s*path:\s*['\"]?site(?:/|['\"]?$)", block):
                errors.append(f"{path}:{index + 1}: never retain built site directories as generic artifacts")

    if len(pages_uploads) != 1 or pages_uploads[0][0].name != "deploy-pages.yml":
        rendered = ", ".join(f"{p}:{line}" for p, line in pages_uploads) or "none"
        errors.append(f"upload-pages-artifact must exist exactly once in deploy-pages.yml; found {rendered}")

    required = {
        "quality-gate.yml",
        "pr-visual-review.yml",
        "tools-quality.yml",
        "english-mirror-quality.yml",
        "topic-quality.yml",
        "series-ui-review.yml",
        "deploy-pages.yml",
        "deploy-mcp-worker.yml",
        "cleanup-actions-artifacts.yml",
        "cleanup-pages-artifact.yml",
    }
    present = {p.name for p in WORKFLOW_DIR.glob("*.yml")}
    missing = sorted(required - present)
    if missing:
        errors.append("missing canonical delegated workflows: " + ", ".join(missing))

    forbidden_prefixes = (
        "topic-evaluation-", "topic-reasoning-", "topic-transformer-",
        "english-reasoning-",
    )
    forbidden_exact = {
        "ci-storage-policy.yml", "dom-inspection-diagnostic.yml",
        "english-editorial-quality.yml", "english-energy-ch2-bottlenecks-quality.yml",
        "locale-switch-quality.yml", "measurement-contract.yml",
        "series-owner-workbench.yml", "tool-shell-contract.yml",
        "topic-agent-autonomy-quality.yml", "topic-prompt-injection-taxonomy-quality.yml",
        "voice-architecture-article-quality.yml",
    }
    leftovers = sorted(
        name for name in present
        if name in forbidden_exact or name.startswith(forbidden_prefixes)
    )
    if leftovers:
        errors.append("legacy babysitting workflows remain: " + ", ".join(leftovers))

    for cleanup, snippets in {
        "cleanup-actions-artifacts.yml": ("schedule:", "actions: write", "deleteArtifact"),
        "cleanup-pages-artifact.yml": ("workflow_run:", "actions: write", "deleteArtifact"),
    }.items():
        text = (WORKFLOW_DIR / cleanup).read_text(encoding="utf-8") if (WORKFLOW_DIR / cleanup).exists() else ""
        for snippet in snippets:
            if snippet not in text:
                errors.append(f"{cleanup}: missing safeguard {snippet!r}")

    if errors:
        print("CI delegation/storage policy violations:", file=sys.stderr)
        for error in errors:
            print(" - " + error, file=sys.stderr)
        return 1

    print("CI delegation policy OK: one Quality Gate entrypoint, reusable workers, bounded evidence, deploy/cleanup separated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
