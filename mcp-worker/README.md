# 5sigmas remote MCP and first-party measurement

The existing Cloudflare Worker serves the public, read-only MCP interface over the bilingual knowledge graph and a separate, consent-based measurement route.

## MCP endpoint

`https://5sigmas.com/mcp`

The Worker serves Streamable HTTP with Cloudflare's stateless `createMcpHandler`.

- `search(query)` returns `{ results: [{ id, title, url }] }`.
- `fetch(id)` returns `{ id, title, text, url, metadata }`.

Both tools are read-only and idempotent, return absolute canonical URLs and read live data from:

- `https://5sigmas.com/agent/knowledge.json`
- `https://5sigmas.com/en/agent/knowledge.json`

There is no parallel content store or vector database to synchronize.

## Measurement routes

See [the complete contract](../MEASUREMENT.md) for privacy, exact event semantics, consent and reporting boundaries.

- `POST /_s5/measurement/events`: same-origin JSON with explicit opt-in headers; strict finite vocabulary and credential rejection.
- `GET /_s5/measurement/health`: storage readiness and policy only; no start of measurement coverage.
- `GET /_s5/measurement/export`: aggregate-only, private GitHub Actions OIDC authorization.

The SQLite Durable Object uses EU jurisdiction. Raw payloads and transport headers/IPs are not stored. Salted session/event bookkeeping expires within 48 hours; queryable aggregates span 90 Pacific dates. Cloudflare's recovery history can retain deleted state for up to 30 additional days. Existing private historical reports contain grouped totals only. Worker observability is disabled.

The catalog is generated from the site's existing source files and tool manifest. Never add unrestricted strings or tool input values to the admitted event schema. Do not add a public export route or a shared browser secret.

## Local checks

From the repository root:

```bash
python3 scripts/build_measurement_catalog.py
python3 scripts/configure_measurement.py --validate-only
npm ci --prefix mcp-worker --ignore-scripts --no-audit --no-fund
npm test --prefix mcp-worker
npm run deploy:dry --prefix mcp-worker
node mcp-worker/scripts/verify-measurement-local.mjs
```

The native measurement smoke runs locally against isolated real Workers SQLite. The MCP live verifier connects with the official MCP v2 client, lists tools, runs representative searches and fetches their top results:

```bash
npm run verify:live --prefix mcp-worker -- https://5sigmas.com/mcp
```

## Deployment

The existing Pages workflow calls `.github/workflows/deploy-mcp-worker.yml` before building the site. It validates/deploys the Worker and verifies live storage before generating approved frontend configuration. The Worker workflow can also be manually dispatched on main. Pull requests validate without publishing.

Deployment reuses repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`, falling back to existing `R2_ACCOUNT_ID`

The token must be authorized to deploy this Worker and update its routes in the `5sigmas.com` zone. The account must support the SQLite Durable Object migration. The deployment attempts these operations through the existing credentials; if Cloudflare rejects a capability, preserve that exact error as the infrastructure dependency. A dry run is not proof that the account permits the migration.

Before deployment, `scripts/ensure-workers-subdomain.mjs` checks the existing account's Workers subdomain using the same deployment token. It preserves any existing name without writing. Only the exact missing-subdomain response (HTTP 404, Cloudflare code 10007) permits a single initialization request for `5sigmas-fjmmontiel`; no rename, random fallback, new token or account is attempted. This resolves the account prerequisite reported by Cloudflare error 10063 when adding the SQLite Durable Object.

Account subdomains are shared by all Workers. Before creating one, the preflight requires a complete script inventory and explicitly disabled production and preview URLs on every existing Worker, including `five-sigmas-mcp`. Unknown or enabled flags stop the deployment without changing another Worker. It checks again after initialization. Our custom routes remain authoritative, with both `workers_dev` and `preview_urls` explicitly false; the latter is a route policy, not a substitute for account initialization.

Authorization errors, incomplete inventories and unconfirmed writes stop the deployment. A lost PUT acknowledgement is reconciled by one GET, never a repeated PUT. The API has no documented conditional create: the preflight re-reads immediately before writing under the existing workflow concurrency lock, but another account administrator could still race that boundary. Do not run concurrent account setup. Credentials, account IDs, headers and raw API bodies are never logged.

The documented [account GET](https://developers.cloudflare.com/api/resources/workers/subresources/subdomains/methods/get/) accepts Workers Scripts Read or Write; [account PUT](https://developers.cloudflare.com/api/resources/workers/subresources/subdomains/methods/update/) requires Workers Scripts Write. Token scope is never expanded. The original Worker deploy, storage-health, consent and frontend-activation gates still run after a successful preflight.

The private export uses GitHub's OIDC signing keys and exact private repository/workflow claims, so it needs no new shared secret. A public health check never grants export access or proves that a production report has consumed data.

For a reversible collection shutdown, disable both checked-in policy flags and deploy; keep the binding/migration so expiry cleanup can continue. See the contract for the independent private read switch.
