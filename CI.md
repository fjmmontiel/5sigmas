# CI workflow management

5sigmas uses one automatic PR entrypoint: **5sigmas PR Quality Manager**.

## Automatic PR behavior

The manager reads `quality/ci-workflows.json`, asks GitHub for the changed files, and delegates only the reusable quality workflows whose path rules match. A newer commit to the same PR cancels the previous manager run.

Draft PRs do not spend time on delegated quality. Marking the PR ready for review triggers the full changed-file plan.

Child quality workflows use `workflow_call` and no longer self-trigger on `pull_request`, so one PR no longer creates a wall of independent workflow runs.

## Manual delegation

Actions → **5sigmas PR Quality Manager** → **Run workflow**.

Choose one suite:

- `core`: broad site/browser/contracts
- `series`: core + Series UI/review
- `english`: core + English quality
- `topics`: core + topic visual validators
- `tools`: core + interactive tools/contracts
- `mcp`: core + MCP validation
- `all`: every delegated quality workflow

Individual child workflows remain manually runnable for isolated debugging.

## Deployment workflows

Publishing remains separate from PR quality. GitHub Pages and MCP deployment keep their push-to-main behavior. The PR manager may call MCP validation, but its deploy job is still gated to a push on `main`.

## Maintenance

Edit **only** `quality/ci-workflows.json` when changing path-to-validator routing. If a new PR quality workflow is added, make it reusable with the standard `head_sha`, `base_sha`, and `pr_number` inputs and add one delegated job in `.github/workflows/pr-quality-manager.yml`.

The storage-policy workflow enforces that the manager is the only automatic `pull_request` quality entrypoint.
