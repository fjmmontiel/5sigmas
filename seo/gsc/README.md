# Direct Google Search Console growth loop

This package is the first-party data layer for the 5sigmas SEO/GEO growth loop. It talks directly to Google's Search Console APIs and removes the runtime dependency on third-party Search Console wrappers.

## Boundary

- Property: `sc-domain:5sigmas.com`.
- Authentication: dedicated Google service account, OAuth 2.0 scope `https://www.googleapis.com/auth/webmasters.readonly`.
- Required Search Console role: **Full user** (least privilege for this Search Analytics + URL Inspection contract). Owner also works but is not required.
- APIs: Search Analytics, Sitemaps and URL Inspection.
- This package does **not** call Google's Indexing API and does not claim to request indexing.
- No credential is stored in the repository. GitHub Actions reads the JSON key only from the repository secret `GSC_SERVICE_ACCOUNT_JSON`.
- Generated twice-daily data is not committed and is not uploaded as an Actions artifact. One durable GitHub issue with label `seo-gsc-state` is updated in place.

## What the report measures

The engine determines the latest settled Search Console date from `dataState=all` metadata and `first_incomplete_date`, then calculates:

- latest settled 28 days vs the previous comparable 28 days;
- latest settled 7 days vs the previous comparable 7 days;
- current incomplete/fresh daily signal, explicitly marked as non-settled;
- query/page ownership and near-page-one CTR opportunities;
- query cannibalization via impression ownership and normalized entropy;
- rising/declining pages over settled 7-day windows;
- sitemap URL visibility in settled Search Analytics;
- Google URL Inspection state for the six canonical topic hubs (and more URLs in the full run);
- a durable experiment protection set so recently changed URL/query families are not repeatedly modified before meaningful settled feedback arrives.

For query/page evidence, the engine shards the 28-day retrieval by day before aggregating locally. This reduces the risk that low-click rows on a small site disappear behind broad-window top-row limits.

## CLI

Install only the dedicated operational dependencies:

```bash
python -m pip install -r seo/gsc/requirements.txt
```

Run the deterministic tests:

```bash
python -m unittest discover -s seo/gsc/tests -v
```

Run manually after credentials exist:

```bash
export GSC_SERVICE_ACCOUNT_JSON="$(cat /secure/path/5sigmas-gsc-reader.json)"
python -m seo.gsc run --mode full --output-dir seo-gsc-output
python -m seo.gsc run --mode delta --output-dir seo-gsc-output
```

The output is `report.json` plus a human-readable `report.md`.

## Experiment discipline

`experiments.json` is source-controlled operational state, not Search Console data. A measuring experiment declares:

- exact URLs/query family;
- deployment date and PR;
- settled baseline;
- minimum settled days before the surface stops being mechanically protected.

Expiry of mechanical protection does not mean the page must be changed. It only means later growth-loop reasoning may consider it again if evidence is strong.

## Automation

`.github/workflows/gsc-direct-growth-data.yml` runs on the default branch at:

- 09:40 Europe/Madrid → `full`, before the 10:00 ACTIVE growth loop;
- 15:40 Europe/Madrid → `delta`, before the 16:00 ACTIVE delta loop.

GitHub's timezone-aware scheduler is used so DST does not require manual cron changes. A manual `workflow_dispatch` is also available.

Every run creates or updates exactly one open issue:

`[seo-gsc-state] 5sigmas direct Search Console ledger`

The issue body contains the latest readable report and machine-readable JSON. Normal authenticated runs use `status=OK`. Missing bootstrap uses `BOOTSTRAP_REQUIRED`; API/auth failures use `ERROR`. ChatGPT growth automations read this issue as their Search Console evidence source and fail closed whenever the state is not fresh `OK`.

## One-time human bootstrap

The repository side is fully automated. A human must establish the Google identity and secret once:

1. In Google Cloud, create or select a project dedicated to 5sigmas operations and enable **Google Search Console API**.
2. Create a service account such as `5sigmas-gsc-reader`. Do not grant it a Google Cloud IAM role; Search Console access is assigned separately.
3. Create one **JSON** key for that service account. Record the service account `client_email`.
4. In Google Search Console, open the `5sigmas.com` domain property → **Settings → Users and permissions → Add user** and add the service-account email as a **Full user**. Owner is unnecessary because this integration never writes Search Console state or uses the Indexing API.
5. In GitHub `fjmmontiel/5sigmas` → **Settings → Secrets and variables → Actions → New repository secret**, create exactly:

   `GSC_SERVICE_ACCOUNT_JSON`

   Paste the entire JSON key contents as the secret value.
6. Delete the downloaded JSON from ordinary Downloads/local working folders after the secret is stored (or move it to a proper password/secret vault if a recovery copy is intentionally retained).
7. Optional immediate certification: in GitHub → **Actions → GSC Direct Growth Data → Run workflow**, choose `full`. Otherwise the next scheduled 09:40/15:40 run performs the same bootstrap verification automatically. A healthy run finishes green and updates the state issue with `status=OK` and authenticated Search Console metrics.

After that, no recurring human action is required unless the service-account key is revoked/rotated or Google access is intentionally changed.

If Google Cloud blocks creation of user-managed service-account keys through an organization policy, do not weaken that policy just for this integration. Migrate the workflow to GitHub OIDC / Workload Identity Federation instead.

## Primary documentation

- Search Console OAuth: https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- Search Console API overview/access: https://developers.google.com/webmaster-tools/about
- Search Analytics query/data state: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- URL Inspection API: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- Sitemaps API: https://developers.google.com/webmaster-tools/v1/sitemaps
- Search Console users/permissions: https://support.google.com/webmasters/answer/7687615
- Google service-account keys: https://cloud.google.com/iam/docs/keys-create-delete
