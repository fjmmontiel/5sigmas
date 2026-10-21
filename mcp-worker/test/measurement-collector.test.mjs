import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AI_REFERRERS, SEARCH_REFERRERS, POLICY_REVISION, SITE_ORIGIN,
  MAX_BODY_BYTES, handleMeasurement, validateMeasurementEvent,
} from "../src/measurement-collector.js";
import {
  MeasurementStore, COUNT_FIELDS, BOOKKEEPING_RETENTION_MS, MAX_SESSION_SPAN_MS,
  pacificDate,
} from "../src/measurement-store.js";

const BASE = Date.parse("2026-10-18T12:00:00.000Z");
const MINUTE = 60000;
const HOUR = 3600000;
let sequence = 0;
const uuid = () => `00000000-0000-4000-8000-${(++sequence).toString(16).padStart(12, "0")}`;
const CATALOG = {
  paths: ["/", "/en/", "/article/", "/en/article/", "/tools/demo/", "/en/tools/demo/", "/tools/other/"],
  tool_ids: ["demo-tool", "other-tool"],
  fields: ["requestsPerDay", "otherField"],
  video_ids: ["chapter.mp4"],
  tool_fields: { "demo-tool": ["requestsPerDay"], "other-tool": ["otherField"] },
  tool_paths: { "/tools/demo/": "demo-tool", "/en/tools/demo/": "demo-tool", "/tools/other/": "other-tool" },
};
function event(overrides = {}) {
  return {
    schema_version: 1, event_name: "page_view", event_id: uuid(),
    occurred_at: new Date(BASE).toISOString(), session_id: uuid(),
    landing_path: "/tools/demo/", page_path: "/tools/demo/", locale: "es",
    traffic_channel: "organic_search", referrer_host: "google.es", context: {}, ...overrides,
  };
}
function harness({ now = BASE, limits = {}, path = ":memory:" } = {}) {
  let time = now;
  const db = new DatabaseSync(path);
  const calls = [];
  const storage = {
    alarm: null,
    sql: { exec: (query, ...params) => db.prepare(query).all(...params) },
    transactionSync(fn) {
      db.exec("BEGIN IMMEDIATE");
      try { const result = fn(); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    async getAlarm() { return this.alarm; },
    async setAlarm(value) { this.alarm = value; },
    async deleteAlarm() { this.alarm = null; },
  };
  const storeEnv = { MEASUREMENT_ENABLED: "true", MEASUREMENT_POLICY_REVISION: POLICY_REVISION };
  const makeStore = () => new MeasurementStore({ storage }, storeEnv, { now: () => time, limits });
  let store = makeStore();
  const namespace = {
    jurisdiction(value) { assert.equal(value, "eu"); return this; },
    idFromName(value) { assert.equal(value, "5sigmas-postclick-v1"); return "private-store"; },
    get(value) {
      assert.equal(value, "private-store");
      return { fetch: async (request) => {
        calls.push({ url: request.url, headers: Object.fromEntries(request.headers) });
        return store.fetch(request);
      } };
    },
  };
  const env = { MEASUREMENT_ENABLED: "true", MEASUREMENT_POLICY_REVISION: POLICY_REVISION,
    MEASUREMENT_CATALOG: CATALOG, MEASUREMENT_STORE: namespace };
  return {
    db, env, calls, storage, close: () => db.close(),
    storeEnv,
    now: () => time, setNow: (value) => { time = value; },
    restart: () => { store = makeStore(); },
    ingest: (item) => store.ingest(item),
    alarm: () => store.alarm(),
    health: () => store.fetch(new Request("https://measurement.internal/health")),
    export: () => store.fetch(new Request("https://measurement.internal/export")),
    snapshot: () => store.projection(time),
    async beatUntil(end) { while (time < end) { time = Math.min(end, time + HOUR); await store.alarm(); } },
  };
}
function request(item = event(), { method = "POST", path = "events", headers = {}, body } = {}) {
  return new Request(`${SITE_ORIGIN}/_s5/measurement/${path}`, {
    method,
    headers: { Origin: SITE_ORIGIN, "Content-Type": "application/json", "X-S5-Consent": "granted",
      "X-S5-Policy-Revision": POLICY_REVISION, ...headers },
    ...(["GET", "HEAD"].includes(method) ? {} : { body: body ?? JSON.stringify(item), duplex: "half" }),
  });
}
const route = (h, req, options = {}) => handleMeasurement(req, h.env, { now: h.now, ...options });
const countRows = (h, table) => h.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

test("unconfigured intake stays inert and health cannot announce absent storage", async (t) => {
  const h = harness(); t.after(h.close);
  for (const patch of [
    { MEASUREMENT_ENABLED: "false" }, { MEASUREMENT_POLICY_REVISION: "stale" },
    { MEASUREMENT_STORE: undefined }, { MEASUREMENT_CATALOG: undefined },
  ]) {
    const response = await handleMeasurement(request(null, { method: "GET", path: "health" }), { ...h.env, ...patch });
    assert.equal(response.status, 503);
    assert.notEqual((await response.json()).ok, true);
  }
  assert.equal(h.calls.length, 0);
  assert.equal(await route(h, new Request(`${SITE_ORIGIN}/mcp/health`)), null);
  assert.equal((await route(h, request(null, { method: "GET", path: "unknown" }))).status, 404);
});

test("public health is exact and reveals no aggregate, UUID or storage contents", async (t) => {
  const h = harness(); t.after(h.close);
  const response = await route(h, request(null, { method: "GET", path: "health" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "5sigmas-measurement", schema_version: 1,
    policy_revision: POLICY_REVISION, consent_mode: "explicit_opt_in", retention_days: 90, storage: "ready" });
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.ok(h.storage.alarm > BASE);
  assert.equal(h.snapshot(), null);
  assert.equal((await h.export()).status, 409);
});

test("transport and consent failures never reach storage", async (t) => {
  const h = harness(); t.after(h.close);
  for (const [name, init, expected] of [
    ["external origin", { headers: { Origin: "https://attacker.invalid" } }, 403],
    ["missing consent", { headers: { "X-S5-Consent": "" } }, 403],
    ["outdated policy", { headers: { "X-S5-Policy-Revision": "2026-01-01" } }, 403],
    ["cross-site fetch", { headers: { "Sec-Fetch-Site": "cross-site" } }, 403],
    ["same-site different origin", { headers: { "Sec-Fetch-Site": "same-site" } }, 403],
    ["cookies", { headers: { Cookie: "user=email@example.invalid" } }, 403],
    ["authorization", { headers: { Authorization: "Bearer not-permitted" } }, 403],
    ["DNT", { headers: { DNT: "1" } }, 403],
    ["GPC", { headers: { "Sec-GPC": "1" } }, 403],
    ["query leakage", { path: "events?email=a@example.invalid" }, 400],
    ["empty query", { path: "events?" }, 400],
    ["GET events", { method: "GET" }, 405],
    ["OPTIONS", { method: "OPTIONS", body: "" }, 405],
    ["non JSON", { headers: { "Content-Type": "text/plain" } }, 415],
    ["compressed body", { headers: { "Content-Encoding": "gzip" } }, 415],
    ["oversized declaration", { headers: { "Content-Length": String(MAX_BODY_BYTES + 1) } }, 413],
    ["malformed JSON", { body: "{" }, 400],
  ]) {
    await t.test(name, async () => assert.equal((await route(h, request(event(), init))).status, expected));
  }
  const noOrigin = request(); noOrigin.headers.delete("origin");
  assert.equal((await route(h, noOrigin)).status, 403);
  assert.equal(h.calls.length, 0);
  assert.equal(countRows(h, "landing_rows"), 0);
});

test("streaming byte limit rejects oversized unknown-length bodies and malformed UTF8", async (t) => {
  const h = harness(); t.after(h.close);
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array(MAX_BODY_BYTES)); controller.enqueue(new Uint8Array(1)); controller.close();
  } });
  assert.equal((await route(h, request(event(), { body: stream }))).status, 413);
  assert.equal((await route(h, request(event(), { body: new Uint8Array([0x7b, 0xff, 0x7d]) }))).status, 400);
  assert.equal(h.calls.length, 0);
});

test("schema rejects personal values, unknown dimensions and cross-tool field injection", async (t) => {
  const h = harness(); t.after(h.close);
  const attacks = [
    { email: "visitor@example.invalid" },
    { page_path: "/tools/demo/?amount=1000" },
    { page_path: "/tools/demo/#visitor" },
    { landing_path: "/unlisted/visitor-name/" },
    { context: { input_value: "private" } },
    { event_id: "persistent-user-identity" },
    { session_id: "00000000-0000-0000-0000-000000000000" },
    { event_name: "private_data" },
    { event_name: ["page_view"] },
    { schema_version: 2 },
    { locale: "en" },
    { referrer_host: "google.com.attacker.invalid" },
    { traffic_channel: "referral", referrer_host: "private-employer.invalid" },
    { event_name: "article_engagement", context: { milestone: 70 } },
    { event_name: "article_engagement", context: { milestone: "50" } },
    { event_name: "meaningful_input_change", context: { tool_id: "demo-tool", field: "otherField" } },
    { event_name: "tool_open", context: { tool_id: "other-tool" } },
    { event_name: "video_play", context: { video_id: "private-filename.mp4" } },
    { event_name: "source_click", context: { source_kind: "primary-source", target_path: "/outside/source/" } },
    { event_name: "scenario_completed", context: { tool_id: "demo-tool", result_kind: "a-private-result" } },
    { event_name: "result_rendered", context: { tool_id: "demo-tool" } },
    { occurred_at: "2026-02-30T12:00:00.000Z" },
    { occurred_at: "2026-10-18T12:00:00" },
    { occurred_at: new Date(BASE - 5 * MINUTE - 1).toISOString() },
  ];
  for (const patch of attacks) assert.equal((await route(h, request(event(patch)))).status, 400, JSON.stringify(patch));
  assert.equal(h.calls.length, 0);
  const legitimate = event({ event_name: "meaningful_input_change", context: { tool_id: "demo-tool", field: "requestsPerDay" } });
  assert.equal((await route(h, request(legitimate))).status, 202);
});

test("exact known acquisition hosts are admitted, unknown hosts are suppressed", () => {
  for (const host of AI_REFERRERS) assert.equal(validateMeasurementEvent(event({ traffic_channel: "ai_referral", referrer_host: host }), CATALOG, BASE).referrer_host, host);
  for (const host of SEARCH_REFERRERS) assert.equal(validateMeasurementEvent(event({ traffic_channel: "organic_search", referrer_host: host }), CATALOG, BASE).referrer_host, host);
  for (const channel of ["direct", "referral"]) assert.equal(validateMeasurementEvent(event({ traffic_channel: channel, referrer_host: "" }), CATALOG, BASE).referrer_host, "");
  assert.equal(validateMeasurementEvent(event({ traffic_channel: "internal", referrer_host: "5sigmas.com" }), CATALOG, BASE).traffic_channel, "internal");
});

test("real SQLite aggregates events and session conversions without retaining raw payloads", async (t) => {
  const h = harness(); t.after(h.close);
  const session = uuid();
  const cases = [
    ["page_view", {}], ["tool_open", { tool_id: "demo-tool" }],
    ["meaningful_input_change", { tool_id: "demo-tool", field: "requestsPerDay" }],
    ["scenario_completed", { tool_id: "demo-tool", result_kind: "scenario" }],
    ["result_rendered", { tool_id: "demo-tool", result_kind: "estimate" }],
    ["share", { tool_id: "demo-tool", action: "share" }],
    ["export", { tool_id: "demo-tool", action: "download" }],
    ["source_click", { source_kind: "primary-source" }],
    ["related_content_click", { related_kind: "contextual", target_path: "/article/" }],
    ["video_play", { video_id: "chapter.mp4" }], ["video_complete", { video_id: "chapter.mp4" }],
    ["article_engagement", { milestone: 50 }], ["article_engagement", { milestone: 90 }],
  ];
  const ids = [];
  for (const [name, context] of cases) {
    const item = event({ session_id: session, event_name: name, context }); ids.push(item.event_id);
    assert.equal((await route(h, request(item))).status, 202, name);
  }
  const projection = h.snapshot();
  const row = projection.first_party.rows[0];
  assert.equal(row.sessions, 1); assert.equal(row.engaged_sessions, 1); assert.equal(row.converted_sessions, 1);
  assert.equal(row.key_events, 4); assert.equal(row.pageviews, 1);
  for (const field of COUNT_FIELDS.filter((name) => !["sessions", "engaged_sessions", "converted_sessions", "key_events", "pageviews"].includes(name))) assert.equal(row[field], 1, field);
  assert.deepEqual(row.referrer_host_sessions, {});
  assert.deepEqual(projection.first_party.diagnostics, { unique_events: 13, duplicate_events_ignored: 0,
    sessions_without_page_view: 0, sessions: 1 });
  assert.equal(projection.page_activity.rows[0].converted_sessions, 1);
  const persisted = JSON.stringify(["session_state", "event_receipts", "session_pages", "landing_rows", "page_rows"].map((table) => h.db.prepare(`SELECT * FROM ${table}`).all()));
  for (const id of [...ids, session]) assert.equal(persisted.includes(id), false);
  for (const text of ["requestsPerDay", "chapter.mp4", '"context"', "occurred_at", '"result_kind"']) assert.equal(persisted.includes(text), false, text);
  assert.ok(h.calls.every((call) => !Object.hasOwn(call.headers, "origin") && !Object.hasOwn(call.headers, "cookie")));
});

test("idempotent duplicates, conflicting IDs and immutable acquisition survive a restart", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "s5-measurement-")); t.after(() => rmSync(directory, { recursive: true, force: true }));
  let h = harness({ path: join(directory, "state.sqlite") });
  const original = event();
  assert.equal((await h.ingest(original)).status, 202);
  h.close();
  h = harness({ path: join(directory, "state.sqlite") }); t.after(h.close);
  assert.equal((await h.ingest(original)).status, 200);
  assert.equal((await h.ingest({ ...original, page_path: "/article/" })).status, 409);
  assert.equal((await h.ingest(event({ session_id: original.session_id, landing_path: "/article/" }))).status, 409);
  assert.equal((await h.ingest(event({ session_id: original.session_id, traffic_channel: "direct", referrer_host: "" }))).status, 409);
  const output = h.snapshot();
  assert.equal(output.first_party.rows[0].pageviews, 1);
  assert.equal(output.first_party.diagnostics.unique_events, 1);
  assert.equal(output.first_party.diagnostics.duplicate_events_ignored, 1);
  assert.equal(countRows(h, "event_receipts"), 1);
});

test("parallel duplicate deliveries serialize into one count in SQLite", async (t) => {
  const h = harness(); t.after(h.close);
  const item = event();
  const responses = await Promise.all(Array.from({ length: 30 }, () => h.ingest(item)));
  assert.equal(responses.filter((response) => response.status === 202).length, 1);
  assert.equal(responses.filter((response) => response.status === 200).length, 29);
  assert.equal(h.snapshot().first_party.rows[0].sessions, 1);
  assert.equal(h.snapshot().first_party.rows[0].pageviews, 1);
  assert.equal(h.snapshot().first_party.diagnostics.duplicate_events_ignored, 29);
});

test("out-of-order midnight events move the whole acquisition session, preserving page activity", async (t) => {
  const now = Date.parse("2026-10-18T07:01:00.000Z");
  const h = harness({ now }); t.after(h.close);
  const session = uuid();
  const later = event({ session_id: session, occurred_at: "2026-10-18T07:00:30.000Z", locale: "en",
    page_path: "/en/tools/demo/", event_name: "result_rendered", context: { tool_id: "demo-tool", result_kind: "ranking" } });
  const earlier = event({ session_id: session, occurred_at: "2026-10-18T06:59:59.000Z" });
  assert.equal((await route(h, request(later))).status, 202);
  assert.equal((await route(h, request(earlier))).status, 202);
  const projection = h.snapshot();
  assert.equal(projection.first_party.rows.length, 1);
  assert.equal(projection.first_party.rows[0].date, "2026-10-17");
  assert.equal(projection.first_party.rows[0].locale, "es");
  assert.equal(projection.first_party.rows[0].sessions, 1);
  assert.equal(projection.first_party.rows[0].results_rendered, 1);
  assert.deepEqual(projection.first_party.rows[0].referrer_host_sessions, {});
  assert.equal(projection.first_party.diagnostics.sessions_without_page_view, 0);
  assert.deepEqual(projection.page_activity.rows.map((row) => [row.date, row.locale, row.pageviews, row.results_rendered]),
    [["2026-10-17", "es", 1, 0], ["2026-10-18", "en", 0, 1]]);
});

test("tolerated fast browser clocks never create a future export date", async (t) => {
  const now = Date.parse("2026-10-18T06:59:59.000Z");
  const h = harness({ now }); t.after(h.close);
  const item = event({ occurred_at: "2026-10-18T07:00:01.000Z" });
  assert.equal((await route(h, request(item))).status, 202);
  assert.equal(h.snapshot().first_party.rows[0].date, "2026-10-17");
  assert.equal(h.snapshot().coverage.end_date, "2026-10-17");
  h.setNow(now + 1000);
  assert.equal((await route(h, request(item))).status, 200);
});

test("retention removes hashed bookkeeping at 48h and aggregates at 90 days without traffic", async (t) => {
  const h = harness(); t.after(h.close);
  const original = event();
  await h.ingest(original);
  h.setNow(BASE + BOOKKEEPING_RETENTION_MS); await h.alarm();
  for (const table of ["event_receipts", "session_state", "session_pages"]) assert.equal(countRows(h, table), 0, table);
  assert.equal(h.snapshot().first_party.rows[0].sessions, 1);
  assert.equal((await h.ingest(original)).status, 400);
  h.setNow(BASE + 90 * 86400000 + HOUR); await h.alarm();
  assert.equal(countRows(h, "landing_rows"), 0); assert.equal(countRows(h, "page_rows"), 0);
  assert.equal(h.db.prepare("SELECT name FROM sqlite_master WHERE name='landing_referrers'").all().length, 0);
  assert.equal(h.snapshot().first_party.diagnostics.unique_events, 0);
  assert.ok(h.storage.alarm > h.now());
});

test("session lifetime cannot extend indefinitely through new event UUIDs", async (t) => {
  const h = harness(); t.after(h.close);
  const original = event(); await h.ingest(original);
  h.setNow(BASE + MAX_SESSION_SPAN_MS + 1);
  assert.equal((await h.ingest(event({ session_id: original.session_id, occurred_at: new Date(h.now()).toISOString() }))).status, 409);
  assert.equal(h.snapshot().first_party.rows[0].pageviews, 1);
});

test("session and global limits bound collection and mark affected coverage incomplete", async (t) => {
  for (const limits of [{ globalPerDay: 1 }, { sessionPerMinute: 1 }, { sessionEvents: 1 }]) {
    const h = harness({ limits }); t.after(h.close);
    const original = event(); assert.equal((await h.ingest(original)).status, 202);
    const refused = await h.ingest(event({ session_id: original.session_id }));
    assert.equal(refused.status, 429); assert.equal(refused.headers.get("retry-after"), "60");
    assert.equal(h.snapshot().first_party.rows[0].pageviews, 1);
    assert.equal(countRows(h, "event_receipts"), 1);
    assert.deepEqual(h.db.prepare("SELECT date FROM incomplete_days").all().map((row) => row.date), ["2026-10-18"]);
  }
});

test("bounded aggregate dimensions do not prevent updates to existing buckets", async (t) => {
  const h = harness({ limits: { aggregateRows: 2 } }); t.after(h.close);
  const original = event(); await h.ingest(original);
  assert.equal((await h.ingest(event({ session_id: original.session_id }))).status, 202);
  assert.equal((await h.ingest(event({ session_id: original.session_id, page_path: "/article/" }))).status, 429);
  assert.equal(h.snapshot().first_party.rows[0].pageviews, 2);
  assert.equal(countRows(h, "page_rows"), 1);
});

test("counter overflow rolls back every affected table and records a coverage gap", async (t) => {
  const h = harness(); t.after(h.close);
  const original = event(); await h.ingest(original);
  h.db.prepare("UPDATE landing_rows SET pageviews=?").run(Number.MAX_SAFE_INTEGER);
  const before = JSON.stringify(h.db.prepare("SELECT * FROM session_state").all());
  assert.equal((await h.ingest(event({ session_id: original.session_id }))).status, 503);
  assert.equal(countRows(h, "event_receipts"), 1);
  assert.equal(JSON.stringify(h.db.prepare("SELECT * FROM session_state").all()), before);
  assert.equal(h.db.prepare("SELECT pageviews FROM landing_rows").get().pageviews, Number.MAX_SAFE_INTEGER);
  assert.equal(countRows(h, "incomplete_days"), 1);
});

test("coverage excludes pre-start, partial start, latest two full days and missed heartbeats", async (t) => {
  const start = Date.parse("2026-10-01T10:00:00.000Z");
  const h = harness({ now: start }); t.after(h.close);
  assert.equal((await h.export()).status, 409);
  await h.health();
  assert.equal((await h.export()).status, 409);
  assert.equal(h.snapshot(), null);
  await h.ingest(event({ occurred_at: new Date(start).toISOString() }));
  await h.beatUntil(Date.parse("2026-10-06T12:00:00.000Z"));
  let projection = h.snapshot();
  assert.equal(projection.collection_started_at, new Date(start).toISOString());
  assert.equal(projection.coverage.start_date, "2026-10-01");
  assert.deepEqual(projection.coverage.complete_days, ["2026-10-02", "2026-10-03"]);
  assert.equal(projection.first_party.rows[0].sessions, 1);
  h.setNow(Date.parse("2026-10-07T12:00:00.000Z")); await h.alarm();
  await h.beatUntil(Date.parse("2026-10-11T12:00:00.000Z"));
  projection = h.snapshot();
  assert.equal(projection.coverage.complete_days.includes("2026-10-06"), false);
  assert.equal(projection.coverage.complete_days.includes("2026-10-07"), false);
  assert.ok(projection.coverage.complete_days.includes("2026-10-08"));
});

test("health-only deployments never acquire complete zero days", async (t) => {
  const h = harness({ now: Date.parse("2026-10-01T12:00:00.000Z") }); t.after(h.close);
  assert.equal((await h.health()).status, 200);
  await h.beatUntil(Date.parse("2026-10-10T12:00:00.000Z"));
  assert.equal((await h.health()).status, 200);
  assert.equal((await h.export()).status, 409);
  assert.equal(h.snapshot(), null);
  assert.equal(h.db.prepare("SELECT value FROM meta WHERE key='collection_started_ms'").get(), undefined);
});

test("disabled and outdated-policy alarms purge without advancing coverage", async (t) => {
  for (const patch of [{ MEASUREMENT_ENABLED: "false" }, { MEASUREMENT_POLICY_REVISION: "old-policy" }]) {
    const start = Date.parse("2026-10-01T12:00:00.000Z");
    const h = harness({ now: start }); t.after(h.close);
    await h.ingest(event({ occurred_at: new Date(start).toISOString() }));
    const originalCoverage = h.snapshot().covered_through;
    Object.assign(h.storeEnv, patch);
    await h.beatUntil(Date.parse("2026-10-04T12:00:00.000Z"));
    assert.equal(h.snapshot().covered_through, originalCoverage);
    assert.equal(countRows(h, "session_state"), 0);
    assert.equal((await h.health()).status, 503);
    assert.equal((await h.export()).status, 503);
    Object.assign(h.storeEnv, { MEASUREMENT_ENABLED: "true", MEASUREMENT_POLICY_REVISION: POLICY_REVISION });
    await h.beatUntil(Date.parse("2026-10-10T12:00:00.000Z"));
    const complete = h.snapshot().coverage.complete_days;
    for (const day of ["2026-10-02", "2026-10-03", "2026-10-04"]) assert.equal(complete.includes(day), false);
    assert.equal(complete.includes("2026-10-05"), true);
  }
});

test("export is protected before binding access and returns only the aggregate contract", async (t) => {
  const h = harness(); t.after(h.close);
  const exportRequest = request(null, { method: "GET", path: "export", headers: { Authorization: "Bearer test-oidc" } });
  const denied = await route(h, exportRequest, { verifyExportAuthorization: async () => false });
  assert.equal(denied.status, 401); assert.equal(h.calls.length, 0);
  await route(h, request(event()));
  const accepted = await route(h, exportRequest, { verifyExportAuthorization: async (req) => req.headers.get("authorization") === "Bearer test-oidc" });
  assert.equal(accepted.status, 200);
  const body = await accepted.json();
  assert.deepEqual(Object.keys(body).sort(), ["schema_version", "site_origin", "date_basis", "generated_at", "collection_started_at",
    "covered_through", "coverage", "consent_mode", "policy_revision", "retention_days", "first_party", "page_activity"].sort());
  assert.equal(body.first_party.attribution_basis, "session_start_date_landing_path_locale_channel");
  assert.equal(body.coverage.scope, "received_opt_in_events");
  const serialized = JSON.stringify(body);
  for (const key of ["session_id", "event_id", "session_hash", "event_hash", "fingerprint", "hash_salt", "test-oidc"]) assert.equal(serialized.includes(key), false);
});

test("Pacific daily attribution respects the DST transition", () => {
  assert.equal(pacificDate(Date.parse("2026-11-01T06:59:59.999Z")), "2026-10-31");
  assert.equal(pacificDate(Date.parse("2026-11-01T07:00:00.000Z")), "2026-11-01");
  assert.equal(pacificDate(Date.parse("2026-11-02T07:59:59.999Z")), "2026-11-01");
  assert.equal(pacificDate(Date.parse("2026-11-02T08:00:00.000Z")), "2026-11-02");
});

test("actual browser runtime sends consented visits, interactions and conversions into SQLite", async (t) => {
  const { bootMeasurement } = await import("../../scripts/measurement_test_harness.mjs");
  const { default: catalog } = await import("../src/measurement-catalog.json", { with: { type: "json" } });
  const browser = bootMeasurement();
  assert.equal(browser.sent.length, 0);
  browser.grant();
  assert.ok(browser.sent.some((item) => item.payload.event_name === "page_view"));
  assert.ok(browser.sent.some((item) => item.payload.event_name === "tool_open"));
  assert.equal(browser.api.track("scenario_completed", { tool_id: "model-price-performance", result_kind: "comparison" }), true);
  assert.equal(browser.api.track("result_rendered", { tool_id: "model-price-performance", result_kind: "ranking" }), true);
  assert.equal(browser.api.track("export", { tool_id: "model-price-performance", action: "export" }), true);
  const h = harness(); t.after(h.close); h.env.MEASUREMENT_CATALOG = catalog;
  for (const item of browser.sent) {
    assert.equal(item.options.credentials, "omit");
    const received = new Request(item.url, { ...item.options, headers: item.requestHeaders });
    assert.equal((await route(h, received)).status, 202, item.payload.event_name);
  }
  const duplicate = browser.sent.at(-1);
  assert.equal((await route(h, new Request(duplicate.url, { ...duplicate.options, headers: duplicate.requestHeaders }))).status, 200);
  const projection = h.snapshot();
  assert.equal(projection.first_party.rows.length, 1);
  assert.equal(projection.first_party.rows[0].sessions, 1);
  assert.equal(projection.first_party.rows[0].pageviews, 1);
  assert.equal(projection.first_party.rows[0].tool_opens, 1);
  assert.equal(projection.first_party.rows[0].scenario_completions, 1);
  assert.equal(projection.first_party.rows[0].results_rendered, 1);
  assert.equal(projection.first_party.rows[0].exports, 1);
  assert.equal(projection.first_party.rows[0].key_events, 3);
  assert.equal(projection.first_party.rows[0].converted_sessions, 1);
  assert.equal(projection.first_party.diagnostics.duplicate_events_ignored, 1);
});
