import assert from "node:assert/strict";
import test from "node:test";
import { ensureWorkersSubdomain, INITIAL_SUBDOMAIN, runPreflight } from "../scripts/ensure-workers-subdomain.mjs";

const ACCOUNT = "a".repeat(32);
const TOKEN = "synthetic-token-never-print";
const BASE = `/client/v4/accounts/${ACCOUNT}/workers`;
const ACCOUNT_ROUTE = `${BASE}/subdomain`;
const WORKER = "five-sigmas-mcp";
const CONFIG = {
  name: WORKER, workers_dev: false, preview_urls: false,
  routes: [
    { pattern: "5sigmas.com/mcp*", zone_name: "5sigmas.com" },
    { pattern: "5sigmas.com/_s5/measurement/*", zone_name: "5sigmas.com" },
  ],
};
const ok = (result, extra = {}) => ({ status: 200, data: { success: true, errors: [], result, ...extra } });
const missing = () => ({ status: 404, data: { success: false, errors: [{ code: 10007 }], result: null } });
const flags = (enabled = false, previews_enabled = false) => ok({ enabled, previews_enabled });
const getAccount = (reply) => ({ method: "GET", path: ACCOUNT_ROUTE, ...reply });
const inventory = (names = [WORKER], extra = {}) => ({ method: "GET", path: `${BASE}/scripts`, ...ok(names.map((id) => ({ id })), extra) });
const workerFlags = (name = WORKER, reply = flags()) => ({ method: "GET", path: `${BASE}/scripts/${name}/subdomain`, ...reply });
const putAccount = (reply = ok({ subdomain: INITIAL_SUBDOMAIN })) => ({ method: "PUT", path: ACCOUNT_ROUTE, body: { subdomain: INITIAL_SUBDOMAIN }, ...reply });
const beforeCreate = () => [getAccount(missing()), inventory(), workerFlags(), getAccount(missing())];
const afterCreate = () => [getAccount(ok({ subdomain: INITIAL_SUBDOMAIN })), inventory(), workerFlags()];

function scenario(steps) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ method: options.method, path: new URL(url).pathname, body: options.body });
    const expected = steps[calls.length - 1];
    assert.ok(expected, "Unexpected network request");
    assert.equal(new URL(url).origin, "https://api.cloudflare.com");
    assert.equal(new URL(url).search, "");
    assert.equal(new URL(url).pathname, expected.path);
    assert.equal(options.method, expected.method);
    assert.equal(options.redirect, "error");
    assert.equal(options.credentials, "omit");
    assert.equal(options.headers.Authorization, `Bearer ${TOKEN}`);
    assert.equal(options.headers.Cookie, undefined);
    assert.deepEqual(options.body ? JSON.parse(options.body) : undefined, expected.body);
    if (expected.throw) throw expected.throw;
    return new Response(expected.raw ?? JSON.stringify(expected.data), {
      status: expected.status, headers: { "Content-Type": "application/json", ...expected.headers },
    });
  };
  return {
    calls, fetcher,
    run: (overrides = {}) => ensureWorkersSubdomain({ accountId: ACCOUNT, apiToken: TOKEN, config: CONFIG, fetcher, ...overrides }),
    done: () => assert.equal(calls.length, steps.length, "Every expected request must execute"),
    writes: () => calls.filter((call) => call.method !== "GET"),
  };
}

test("existing account names are preserved with exactly one read and zero writes", async () => {
  const s = scenario([getAccount(ok({ subdomain: "an-existing-owner-name" }))]);
  assert.deepEqual(await s.run(), { state: "existing", writes: 0 });
  assert.deepEqual(s.writes(), []);
  s.done();
});

test("verified absence initializes once only after checking all Workers, then verifies flags again", async () => {
  const names = [WORKER, "another-worker"];
  const s = scenario([
    getAccount(missing()), inventory(names), workerFlags("another-worker"), workerFlags(), getAccount(missing()),
    putAccount(), getAccount(ok({ subdomain: INITIAL_SUBDOMAIN })), inventory(names), workerFlags("another-worker"), workerFlags(),
  ]);
  assert.deepEqual(await s.run(), { state: "created", writes: 1, workers_checked: 2 });
  assert.equal(s.writes().length, 1);
  assert.equal(s.calls.findIndex((call) => call.method === "PUT"), 5);
  s.done();
});

test("a subdomain that appears during inventory is preserved without PUT", async () => {
  const s = scenario([getAccount(missing()), inventory(), workerFlags(), getAccount(ok({ subdomain: "another-admin-choice" }))]);
  assert.deepEqual(await s.run(), { state: "existing", writes: 0 });
  assert.deepEqual(s.writes(), []);
  s.done();
});

test("initial authorization denial cannot be interpreted as missing", async (t) => {
  for (const status of [401, 403]) await t.test(String(status), async () => {
    const s = scenario([getAccount({ status, data: { success: false, errors: [{ code: 10007, message: TOKEN }] } })]);
    await assert.rejects(s.run(), new RegExp(`authorization_denied_http_${status}`));
    assert.equal(s.writes().length, 0);
    s.done();
  });
});

test("absence requires the exact typed 404/10007 response", async (t) => {
  const cases = [
    { status: 404, data: { success: false, errors: [] } },
    { status: 404, data: { success: false, errors: [{ code: "10007" }] } },
    { status: 404, data: { success: false, errors: [{ code: 10007 }, { code: 10000 }] } },
    { status: 404, data: { success: false, errors: [{ code: 10007 }, {}] } },
    { status: 500, data: { success: false, errors: [{ code: 10007 }] } },
    { status: 200, data: { success: true, result: null } },
  ];
  for (const [index, reply] of cases.entries()) await t.test(String(index), async () => {
    const s = scenario([getAccount(reply)]);
    await assert.rejects(s.run());
    assert.equal(s.writes().length, 0);
    s.done();
  });
});

test("initial transport, redirect and malformed responses stop without writes", async (t) => {
  for (const [label, reply] of Object.entries({
    network: { throw: new Error(`network diagnostic ${TOKEN}`) },
    redirect: { status: 302, data: {}, headers: { Location: "https://example.invalid" } },
    html: { status: 200, raw: "<html>not JSON</html>", headers: { "Content-Type": "text/html" } },
    invalid: { status: 200, raw: "{bad JSON" },
    excessive: { status: 200, raw: " ".repeat(1024 * 1024 + 1) },
  })) await t.test(label, async () => {
    const s = scenario([getAccount(reply)]);
    await assert.rejects(s.run());
    assert.equal(s.writes().length, 0);
    s.done();
  });
});

test("all inventory pagination and completeness hints are checked", async (t) => {
  const partial = [
    { result_info: { page: 1, total_pages: 2, count: 1 } },
    { result_info: { page: 2, total_pages: 2, total_count: 2 } },
    { result_info: { total_count: 2 } },
    { result_info: { count: 0, total_pages: 1 } },
    { result_info: { cursor: "next-page" } },
    { result_info: { per_page: 100 } },
    { result_info: { total_count: "1" } },
    { result_info: null },
    ...[0, -1, 0.5, "1", null, true, Number.MAX_SAFE_INTEGER + 1]
      .map((per_page) => ({ result_info: { page: 1, per_page, total_count: 1 } })),
  ];
  for (const [index, extra] of partial.entries()) await t.test(String(index), async () => {
    const s = scenario([getAccount(missing()), inventory([WORKER], extra)]);
    await assert.rejects(s.run(), /worker_inventory_incomplete/);
    assert.equal(s.writes().length, 0);
    s.done();
  });
  const s = scenario([getAccount(missing()), { ...inventory(), headers: { Link: '<https://api.cloudflare.com/next>; rel="next"' } }]);
  await assert.rejects(s.run(), /worker_inventory_incomplete/);
  assert.equal(s.writes().length, 0);
  s.done();
});

test("per-page inventory size cannot be smaller than the returned Worker count", async () => {
  const s = scenario([getAccount(missing()), inventory([WORKER, "another-worker"], {
    result_info: { page: 1, per_page: 1, count: 2, total_count: 2, total_pages: 1 },
  })]);
  await assert.rejects(s.run(), /worker_inventory_incomplete/);
  assert.equal(s.writes().length, 0);
  s.done();
});

test("an explicit complete single-page inventory is accepted", async () => {
  const s = scenario([
    getAccount(missing()), inventory([WORKER], { result_info: { page: 1, per_page: 1, count: 1, total_count: 1, total_pages: 1 } }),
    workerFlags(), getAccount(ok({ subdomain: "already-created" })),
  ]);
  assert.deepEqual(await s.run(), { state: "existing", writes: 0 });
  s.done();
});

test("missing target, duplicate names and invalid Worker identities refuse creation", async (t) => {
  for (const names of [["other-worker"], [WORKER, WORKER], [WORKER, "../other"], [WORKER, null]]) {
    await t.test(JSON.stringify(names), async () => {
      const s = scenario([getAccount(missing()), inventory(names)]);
      await assert.rejects(s.run(), /worker_inventory_unexpected/);
      assert.equal(s.writes().length, 0);
      s.done();
    });
  }
});

test("enabled production or preview URLs on either our Worker or another Worker block the account write", async (t) => {
  for (const name of [WORKER, "another-worker"]) for (const [enabled, previews] of [[true, false], [false, true], [true, true]]) {
    await t.test(`${name}:${enabled}:${previews}`, async () => {
      const names = name === WORKER ? [WORKER] : [WORKER, name];
      const s = scenario([getAccount(missing()), inventory(names), workerFlags(name, flags(enabled, previews))]);
      await assert.rejects(s.run(), new RegExp(`${name === WORKER ? "owned" : "other"}_worker_public_urls_enabled_production_${enabled}_preview_${previews}`));
      assert.equal(s.writes().length, 0);
      s.done();
    });
  }
});

test("missing or nonboolean URL flags never count as disabled", async (t) => {
  for (const value of [{ enabled: false }, { enabled: "false", previews_enabled: false }, { enabled: false, previews_enabled: 0 }, null]) {
    await t.test(JSON.stringify(value), async () => {
      const s = scenario([getAccount(missing()), inventory(), workerFlags(WORKER, ok(value))]);
      await assert.rejects(s.run(), /owned_worker_url_flags_unknown/);
      assert.equal(s.writes().length, 0);
      s.done();
    });
  }
});

test("a denied Worker inventory inspection stops without creating or modifying anything", async () => {
  const s = scenario([getAccount(missing()), inventory(), workerFlags(WORKER, { status: 403, data: {} })]);
  await assert.rejects(s.run(), /authorization_denied_http_403/);
  assert.equal(s.writes().length, 0);
  s.done();
});

test("route and preview policy must be explicit before any API request", async (t) => {
  for (const config of [
    { ...CONFIG, workers_dev: true }, { ...CONFIG, preview_urls: undefined }, { ...CONFIG, preview_urls: true },
    { ...CONFIG, name: "unrelated-worker" }, { ...CONFIG, routes: [] },
    { ...CONFIG, routes: [...CONFIG.routes, { pattern: "extra.example/*", zone_name: "5sigmas.com" }] },
  ]) await t.test(JSON.stringify(config), async () => {
    const s = scenario([]);
    await assert.rejects(s.run({ config }), /custom_route_policy_mismatch/);
    s.done();
  });
});

test("lost PUT acknowledgement is reconciled by one read-back and never a second PUT", async (t) => {
  for (const [label, reply] of Object.entries({
    network: { throw: new Error(`lost acknowledgement ${TOKEN}`) },
    server: { status: 503, data: { success: false, errors: [{ code: 10001, message: TOKEN }] } },
    malformed: { status: 200, raw: "not-json" },
  })) await t.test(label, async () => {
    const s = scenario([...beforeCreate(), putAccount(reply), ...afterCreate()]);
    assert.deepEqual(await s.run(), { state: "created_readback_confirmed", writes: 1, workers_checked: 1 });
    assert.equal(s.writes().length, 1);
    assert.equal(s.calls[5].method, "GET");
    assert.equal(s.calls[5].path, ACCOUNT_ROUTE);
    s.done();
  });
});

test("unconfirmed ambiguous PUT stops after its sole read-back", async () => {
  const s = scenario([...beforeCreate(), putAccount({ throw: new Error("timeout") }), getAccount(missing())]);
  await assert.rejects(s.run(), /api_transport_failed/);
  assert.equal(s.writes().length, 1);
  s.done();
});

test("PUT authorization denial is terminal, without a follow-up request", async () => {
  const s = scenario([...beforeCreate(), putAccount({ status: 403, data: { success: false, errors: [{ code: 10000 }] } })]);
  await assert.rejects(s.run(), /authorization_denied_http_403/);
  assert.equal(s.writes().length, 1);
  s.done();
});

test("read-back authorization denial stays explicit after an ambiguous PUT", async () => {
  const s = scenario([...beforeCreate(), putAccount({ throw: new Error("timeout") }), getAccount({ status: 403, data: {} })]);
  await assert.rejects(s.run(), /authorization_denied_http_403/);
  assert.equal(s.writes().length, 1);
  s.done();
});

test("name collision does not choose a fallback or repeat the write", async () => {
  const s = scenario([...beforeCreate(), putAccount({ status: 400, data: { success: false, errors: [{ code: 10031 }] } }), getAccount(missing())]);
  await assert.rejects(s.run(), /cloudflare_http_400_codes_10031/);
  assert.equal(s.writes().length, 1);
  s.done();
});

test("a mismatched read-back stops rather than renaming the observed account", async () => {
  const s = scenario([...beforeCreate(), putAccount(), getAccount(ok({ subdomain: "someone-else-created" }))]);
  await assert.rejects(s.run(), /subdomain_creation_unconfirmed/);
  assert.equal(s.writes().length, 1);
  s.done();
});

test("post-create flag verification catches exposure without modifying Worker settings", async () => {
  const s = scenario([...beforeCreate(), putAccount(), getAccount(ok({ subdomain: INITIAL_SUBDOMAIN })), inventory(), workerFlags(WORKER, flags(false, true))]);
  await assert.rejects(s.run(), /owned_worker_public_urls_enabled_production_false_preview_true/);
  assert.deepEqual(s.writes().map((call) => call.method), ["PUT"]);
  s.done();
});

test("post-create inventory changes are not silently accepted", async () => {
  const s = scenario([
    ...beforeCreate(), putAccount(), getAccount(ok({ subdomain: INITIAL_SUBDOMAIN })),
    inventory([WORKER, "another-worker"]), workerFlags("another-worker"), workerFlags(),
  ]);
  await assert.rejects(s.run(), /worker_inventory_changed_after_creation/);
  assert.equal(s.writes().length, 1);
  s.done();
});

test("credential, remote body and transport diagnostics never enter logs", async (t) => {
  for (const [label, reply] of Object.entries({
    remote: { status: 500, data: { success: false, errors: [{ code: 10001, message: `${TOKEN} ${ACCOUNT}` }], details: { Authorization: `Bearer ${TOKEN}` } } },
    network: { throw: new Error(`https://api.cloudflare.com/accounts/${ACCOUNT} Authorization: Bearer ${TOKEN}`) },
    denied: { status: 403, data: { credential: TOKEN, account: ACCOUNT } },
  })) await t.test(label, async () => {
    const s = scenario([getAccount(reply)]);
    const logs = [];
    const exitCode = await runPreflight({ env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN }, fetcher: s.fetcher, log: (line) => logs.push(line), errorLog: (line) => logs.push(line) });
    assert.equal(exitCode, 1);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /^Workers account prerequisite refused:/);
    for (const secret of [TOKEN, ACCOUNT, "Authorization", "https://api.cloudflare.com"]) assert.ok(!logs[0].includes(secret));
    assert.equal(s.writes().length, 0);
    s.done();
  });
});

test("invalid account identifiers or header credentials make no request", async () => {
  for (const credentials of [{ accountId: "../different-account" }, { apiToken: "" }, { apiToken: "token\r\ninjected" }]) {
    const s = scenario([]);
    await assert.rejects(s.run(credentials), /invalid_deployment_credentials/);
    s.done();
  }
});
