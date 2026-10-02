# CI workflow management

## One PR entrypoint

Automatic PR quality enters through **Delegated PR quality** only. It reads `quality/ci-workflows.json`, selects the validators affected by the changed files, and calls them as reusable workflows inside one Actions run.

A newer commit to the same PR cancels the previous delegated run.

Draft PRs do not spend time on delegated quality. Mark the PR ready for review to run the changed-file plan.

## Manual delegation

Actions → **Delegated PR quality** → **Run workflow**.

Suites:
- `full`: every delegated quality workflow
- `core`: site-wide contracts/browser QA
- `reader`: alias for core reader/site QA
- `series`: core + Series UI and owner review
- `english`: core + English + locale routing
- `locale`: core + locale routing
- `topics`: core + topic visual validators
- `tools`: core + tool quality/contracts
- `mcp`: core + MCP validation

Child workflows remain manually runnable for isolated debugging. They do not self-trigger on PRs.

## Owner auto-merge

**Merge delegated owner PRs** listens for a successful **Delegated PR quality** run. For a non-draft, same-repository PR authored by the repository owner, it waits until every check on the head SHA has settled green and then squash-merges it. If the head changes or any check fails, it refuses the merge.

## Deployment

Deployment stays separate from PR quality. Pages and MCP publication remain gated by their push-to-`main` deployment workflows. MCP validation can be delegated in PR quality, but its deploy job remains push-to-main only.

## Maintenance

`quality/ci-workflows.json` is the single routing manifest. Add or change path rules there.

Every delegated child must:
1. expose `workflow_call`;
2. keep `workflow_dispatch` for focused debugging;
3. avoid a direct `pull_request` trigger.

`scripts/validate_ci_manager.py` enforces the contract so the repository cannot drift back to dozens of independent PR runs.
