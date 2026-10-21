# First-party post-click measurement

This contract measures consented behavior after a visit reaches 5sigmas. Search Console clicks remain a separate source and are never relabelled as sessions. The implementation uses the existing Cloudflare Worker and the existing private SEO/GEO reporting workflow.

## Infrastructure and activation

GitHub Pages continues to serve the bilingual MkDocs site. The existing `five-sigmas-mcp` Cloudflare Worker also handles these same-origin HTTPS routes:

| Route | Access and purpose |
| --- | --- |
| `POST /_s5/measurement/events` | Explicitly consented, credential-free browser events. |
| `GET /_s5/measurement/health` | Public storage readiness and policy revision; no analytics or identifiers. |
| `GET /_s5/measurement/export` | Private daily aggregates, authenticated with GitHub Actions OIDC. |

The existing `/mcp` interface remains available. A private SQLite Durable Object binding, `MEASUREMENT_STORE`, holds bounded counters and temporary deduplication state. The Worker selects `.jurisdiction("eu")` for execution and storage of that object. There is no analytics SaaS, advertising pixel, public data bucket, new scheduler or shared export secret.

`measurement-deployment.json` records the activation and retention policy. Its enabled flag and revision must match `mcp-worker/wrangler.jsonc`. The source copy of `measurement-config.js` is deliberately inert. The production Pages workflow:

1. Rebuilds the finite route/tool vocabulary and validates the Worker.
2. Deploys the existing Worker, including its SQLite migration and measurement route.
3. Verifies live MCP behavior and measurement storage readiness.
4. Generates the approved browser configuration only after the health response matches the required schema, revision, explicit opt-in mode and retention.
5. Builds and deploys both languages with that verified configuration.

A build fails if the enabled collector is unavailable or has a different policy. Merely adding JavaScript to a repository never establishes a live connection. Health proves storage readiness; **only a first accepted event starts collection coverage**. Before that, authenticated export returns a controlled `409` response instead of invented zero traffic.

The runtime loader fetches configuration, generated vocabulary and measurement code in that order, using versioned asset URLs so a cached runtime from before this consent contract cannot consume newly approved configuration. Activation requires the exact HTTPS same-origin endpoint, `approved: true`, policy revision `2026-10-18`, a valid vocabulary and explicit visitor consent. The equivalent metadata configuration must satisfy the same checks.

## Consent and visitor controls

A bilingual, keyboard-accessible preferences panel presents equally styled accept and decline actions. Before acceptance, the runtime creates no measurement session identifier, sends no event and keeps no event backlog. Global Privacy Control and Do Not Track override a previous grant.

The preference and random session identifier live in `sessionStorage` for the current tab, with an in-memory fallback if session storage is unavailable. No persistent browser identifier or cookie is created. A session expires after 30 minutes without measured activity and has a 24-hour maximum. A visitor may reopen “Privacidad de la medición” / “Measurement privacy” and withdraw permission. Withdrawal clears local measurement state and aborts pending sends where possible; already accepted anonymous aggregate counts cannot be attributed back to a person or removed by identity.

Requests use `fetch` with `credentials: "omit"`, `mode: "cors"`, `referrerPolicy: "no-referrer"`, `redirect: "error"` and `cache: "no-store"`. The endpoint is independently restricted to the exact same origin. The Fetch mode preserves the browser's real `Origin` header while omitting the `Referer` header; `same-origin` mode combined with `no-referrer` would instead send `Origin: null`. Required headers are:

```http
Content-Type: application/json
X-S5-Consent: granted
X-S5-Policy-Revision: 2026-10-18
```

The server independently checks these headers, origin, method, content type, policy and schema. There is no permissive CORS endpoint or `sendBeacon` fallback carrying ambient credentials.

## Exact event contract

Each schema-v1 event contains exactly these fields:

| Field | Accepted content |
| --- | --- |
| `schema_version` | Integer `1`. |
| `event_name` | One of the documented event names below. |
| `event_id` | Cryptographically random UUIDv4, for idempotent delivery. |
| `occurred_at` | UTC ISO timestamp, within five minutes of arrival. |
| `session_id` | Cryptographically random UUIDv4, bounded to the current session. |
| `landing_path`, `page_path` | Normalized paths present in the generated finite public-source vocabulary. |
| `locale` | `es` or `en`, consistent with the current page path. |
| `traffic_channel` | `direct`, `internal`, `organic_search`, `ai_referral` or `referral`. |
| `referrer_host` | A known search/AI/site host, or the empty string. |
| `context` | Only the finite identifiers permitted for the event. |

The vocabulary is regenerated from repository route sources, static `data-field` / video identifiers and the existing `docs/agent-tools.json` manifest. Tool IDs must match their page, and field identifiers must belong to that tool. An arbitrary string is not safe merely because it resembles a slug. Unknown paths, hosts, field names, context keys and top-level fields are rejected.

**Never collect tool input values, free text, result values, URL queries or fragments, arbitrary URL paths, complete referrers, cookies, email addresses, account identifiers, IP addresses or request headers as analytics data.** Known referrer hosts are used only to validate temporary session attribution; the durable aggregate export does not include host breakdowns.

## Event semantics

| Event | Meaning and implementation |
| --- | --- |
| `page_view` | The current known route was rendered while consent was granted. |
| `tool_open` | A known tool page was opened. Both explicit `data-s5-tool` roots and the 18 tools in the existing manifest are supported. |
| `meaningful_input_change` | First committed change to a known field on the current tool route. Only its static field identifier is sent. |
| `scenario_completed` | The tool explicitly reports a valid completed scenario through the measurement API. Generic form submission does not establish completion. |
| `result_rendered` | The tool explicitly reports that a useful result was produced after a meaningful user action. Initial/default/reset rendering does not count. |
| `share` | A recognized tool share action was used. |
| `export` | A recognized export/download action was used, including existing CSV and JSON controls. This measures the action, not proof that a file was saved. |
| `source_click` | A contextual primary-source link was followed. Only a known same-site target path may be retained; external target paths are omitted. |
| `related_content_click` | A contextual related-content link was followed, with the same target restrictions. |
| `video_play` / `video_complete` | A known video played or emitted the native `ended` event. |
| `article_engagement` | The article crossed its 50% or 90% scroll milestone once per route. |

The model price/performance controller has explicit scenario/result integration. Other tools receive their existing open, field-change and action instrumentation; their custom completion semantics must be added at the point a valid result is actually produced. Do not infer successful calculation from arbitrary DOM changes.

For example, the model controller may emit:

```js
window.s5Measurement?.track('result_rendered', {
  tool_id: 'model-price-performance',
  result_kind: 'comparison',
});
```

This returns whether the runtime queued an eligible event, not a guarantee of server receipt. `window.s5Measurement.status()` exposes configuration, consent and the latest delivery state for local debugging, without payload data.

## Reception, security and storage

The collector limits each body to 8 KiB, bounded streaming time and chunk count. It rejects malformed schemas, stale/replayed timestamps, cross-origin requests, cookies, credential-bearing event requests and changed acquisition attributes within a session. Exactly repeated event IDs are idempotent; reusing an ID for a different payload is a conflict.

SQL updates are transactional. Per-minute, per-day, per-session, new-session and aggregate-row limits bound abuse and storage growth without retaining IP addresses or fingerprinting visitors. Rate-limited dates are explicitly incomplete. This is an observation system for consented browser events, not proof that every accepted event was generated by a unique human.

Raw event bodies are never written to storage. Temporary bookkeeping contains salted hashes of event/session identifiers, a payload fingerprint, finite acquisition/page dimensions and counters. Counter updates handle concurrent duplicate delivery, late arrival, a session crossing Pacific midnight and a session navigating between languages.

Private export accepts only a short-lived, valid RS256 GitHub Actions token for audience `https://5sigmas.com/_s5/measurement/export`, the exact private repository/owner IDs, main branch and owning `gsc-direct-growth-data.yml` workflow. Pull-request tokens are refused. Signing keys come only from GitHub's fixed JWKS endpoint; redirects and attacker-supplied key URLs are not used. Tokens and request bodies are never logged or archived. Worker observability is disabled to avoid application request logging. The underlying hosting providers still operate their own network/security infrastructure; this policy does not claim they cannot process transport metadata.

## Retention and deletion

| Data | Retention and location |
| --- | --- |
| Temporary session/event bookkeeping | Up to 48 hours in the private EU SQLite object; purged by alarms and before access. |
| Queryable daily aggregates | A rolling 90 Pacific-date window in the same object. |
| Platform recovery history | Cloudflare SQLite point-in-time recovery may retain deleted state for up to 30 additional days. It is not available through the measurement export. |
| Existing private SEO/GEO report history | May retain grouped daily/page/channel totals longer; never raw events, session IDs, hashed identifiers or tool inputs. |

The 48-hour and 90-day deletion policies govern the active collector store; they do not promise immediate erasure from Cloudflare recovery history or deletion of anonymous historical report totals. Alarms continue retention cleanup when collection is disabled. A disabled or mismatched policy cannot advance complete coverage.

Cloudflare documents [EU jurisdiction restrictions](https://developers.cloudflare.com/durable-objects/reference/data-location/) and [SQLite storage and 30-day recovery](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/). The jurisdiction applies to object execution/storage, not every edge request or platform billing identifier.

## Aggregation and SEO/GEO reporting

The acquisition table has the grain:

`session-start date × landing path × landing locale × traffic channel`

Dates use `America/Los_Angeles`, matching Search Console daily reporting. The complete session stays with its acquisition page/date/channel even if it later changes page, language or day. A separate `page_activity` table uses the actual event page/date/locale. Its session counts are session-page-days and must not be summed into a unique site session total.

Both tables expose sessions, pageviews, engaged sessions, converted sessions, key events and the individual event counters. An engaged session has a meaningful tool, article, navigation or video interaction. A converted session has at least one scenario completion, useful result, share or export. Three such actions by one session are **one converted session and three key events**. These behavioral conversions do not imply a sale, lead or revenue.

The export includes generation/start/observation timestamps, explicit complete dates, policy and retention. The partial launch day, the most recent two full Pacific dates, known heartbeat gaps and rate-limited days remain incomplete. The closing delay allows the 24-hour maximum session and bounded delivery delay to settle. Complete means complete under the collector's received-opt-in-event scope, not that every visitor consented or every browser request arrived.

The existing private FULL obtains one authenticated aggregate snapshot and joins it with the daily web/page GSC rows already collected. DELTA reuses that snapshot. No additional Google calls or GSC recollection are introduced. Historical successful FULLs remain immutable.

GSC `clicks` / `impressions` and observed first-party `sessions` retain separate fields. Period totals remain `null` while coverage is incomplete; observed counts and their actual dates are shown separately. A missing integration, a new source with no accepted events, delivery failures and dates before launch are never replaced with zero sessions.

`ai_referral` identifies a recognized browser referral from an assistant host. Missing referrers may appear as direct. Neither is evidence of Google AI search impressions, visibility or citations; those capabilities retain their independent source states.

## Reproducible verification

From the repository root:

```bash
python3 scripts/build_measurement_catalog.py
python3 scripts/configure_measurement.py --validate-only
python3 -m unittest scripts.tests.test_measurement_setup
node scripts/test_measurement_contract.mjs
node scripts/test_model_price_performance_measurement.mjs
npm ci --prefix mcp-worker --ignore-scripts --no-audit --no-fund
npm test --prefix mcp-worker
npm run deploy:dry --prefix mcp-worker
node mcp-worker/scripts/verify-measurement-local.mjs
```

The tests exercise the actual browser runtime and real SQLite, including no traffic before consent, privacy gates, withdrawal, tool changes, valid conversions, duplicates, concurrency, midnight attribution, retention and authenticated export rejection. The local native Worker smoke uses an isolated SQLite store; it never adds synthetic visits to production. Local workerd does not implement geographic jurisdiction restrictions, so an explicit test adapter requires the requested `eu` jurisdiction and maps it to isolated local storage; EU placement itself must be verified by deployment on Cloudflare. The private repository separately tests the received aggregate through its FULL, report projection, verified archive and DELTA reuse.

After building both MkDocs locales, an installed Playwright/Chromium environment can also verify actual browser headers and the rendered consent controls:

```bash
node scripts/verify_measurement_browser.mjs --site ./site \
  --chromium /path/to/installed/chrome --output /tmp/5sigmas-measurement-browser
```

This gate checks ES/EN desktop and mobile pages, omits a deliberately installed synthetic cookie from measurement requests, verifies the browser's real `Origin`, rejects input/query leakage, exercises useful model results and withdrawal, and captures the consent panel with its details expanded. Every request is intercepted locally. It does not install dependencies or contact the production collector.

After deployment, a health response, approved published browser configuration and successful receipt are distinct evidence. An authenticated production snapshot is established only when a new owning FULL reads and validates it. Do not label a source `CONNECTED` from a green test or health response alone.

## Disable or roll back

Set `measurement-deployment.json.enabled` to `false` and `MEASUREMENT_ENABLED` in `mcp-worker/wrangler.jsonc` to `"false"` in the same reviewed change, then use the existing deployment workflow. The backend refuses new collection, cleanup continues and the Pages build emits disabled browser configuration. Do not remove the SQLite binding or migration as a routine rollback; doing so would interfere with retention cleanup.

The private workflow also has an independent read switch: `S5_MEASUREMENT_EXPORT_ENABLED=false`. It stops aggregate reads and reports the source as disconnected; it does not disable browser collection. Re-enabling does not recover events intentionally uncollected while disabled.
