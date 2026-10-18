import { verifyExportAuthorization } from "./measurement-auth.js";

export const SITE_ORIGIN = "https://5sigmas.com";
export const POLICY_REVISION = "2026-10-18";
export const MEASUREMENT_PREFIX = "/_s5/measurement/";
export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_EVENT_SKEW_MS = 5 * 60 * 1000;

export const AI_REFERRERS = new Set([
  "chatgpt.com", "chat.openai.com", "claude.ai", "perplexity.ai",
  "gemini.google.com", "copilot.microsoft.com", "poe.com",
]);
export const SEARCH_REFERRERS = new Set([
  "google.com", "google.es", "google.co.uk", "google.fr", "google.de",
  "google.it", "google.pt", "google.ca", "google.com.au", "google.co.in",
  "google.co.jp", "google.com.br", "google.com.mx", "bing.com",
  "duckduckgo.com", "search.brave.com", "search.yahoo.com",
  "search.yahoo.co.jp", "yandex.com", "yandex.ru", "ecosia.org",
  "google.nl", "google.be", "google.com.ar", "google.cl", "google.co", "google.ch",
  "google.at", "google.ie", "google.se", "google.no", "google.dk", "google.fi",
  "google.pl", "google.cz", "google.ro", "google.co.nz", "google.com.sg",
]);

const TOP_LEVEL = new Set([
  "schema_version", "event_name", "event_id", "occurred_at", "session_id",
  "landing_path", "page_path", "locale", "traffic_channel", "referrer_host", "context",
]);
const EVENT_CONTEXT = {
  page_view: [],
  tool_open: ["tool_id"],
  meaningful_input_change: ["tool_id", "field"],
  scenario_completed: ["tool_id", "action", "result_kind"],
  result_rendered: ["tool_id", "result_kind"],
  share: ["tool_id", "action"],
  export: ["tool_id", "action"],
  source_click: ["tool_id", "source_kind", "target_path"],
  related_content_click: ["tool_id", "related_kind", "target_path"],
  video_play: ["video_id"],
  video_complete: ["video_id"],
  article_engagement: ["milestone"],
};
const TOOL_EVENTS = new Set([
  "tool_open", "meaningful_input_change", "scenario_completed", "result_rendered", "share", "export",
]);
const RESULT_KINDS = new Set(["scenario", "estimate", "comparison", "ranking"]);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const catalogs = new WeakMap();

export class MeasurementError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = "MeasurementError";
    this.code = code;
    this.status = status;
  }
}

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const fail = (code = "invalid_event", status = 400) => { throw new MeasurementError(code, status); };

export function compileCatalog(catalog) {
  if (!object(catalog)) fail("catalog_unavailable", 503);
  if (catalogs.has(catalog)) return catalogs.get(catalog);
  const result = {};
  for (const name of ["paths", "tool_ids", "fields", "video_ids"]) {
    if (!Array.isArray(catalog[name]) || catalog[name].some((item) => typeof item !== "string")) {
      fail("catalog_unavailable", 503);
    }
    result[name] = new Set(catalog[name]);
  }
  if (!result.paths.size || !result.paths.has("/")) fail("catalog_unavailable", 503);
  if (catalog.tool_fields !== undefined) {
    if (!object(catalog.tool_fields) || Object.values(catalog.tool_fields).some((value) => !Array.isArray(value)
        || value.some((field) => typeof field !== "string"))) fail("catalog_unavailable", 503);
    result.tool_fields = Object.fromEntries(Object.entries(catalog.tool_fields).map(([tool, fields]) => [tool, new Set(fields)]));
  }
  if (catalog.tool_paths !== undefined) {
    if (!object(catalog.tool_paths) || Object.values(catalog.tool_paths).some((value) => typeof value !== "string")) {
      fail("catalog_unavailable", 503);
    }
    result.tool_paths = catalog.tool_paths;
  }
  catalogs.set(catalog, result);
  return result;
}

export function validateMeasurementEvent(raw, catalog, now = Date.now()) {
  const allowed = compileCatalog(catalog);
  if (!object(raw) || Object.keys(raw).length !== TOP_LEVEL.size
      || Object.keys(raw).some((key) => !TOP_LEVEL.has(key))
      || [...TOP_LEVEL].some((key) => !Object.hasOwn(raw, key))) fail();
  if (raw.schema_version !== 1 || typeof raw.event_name !== "string"
      || !Object.hasOwn(EVENT_CONTEXT, raw.event_name)) fail();
  if (typeof raw.event_id !== "string" || !UUID_V4.test(raw.event_id)
      || typeof raw.session_id !== "string" || !UUID_V4.test(raw.session_id)) fail("invalid_identifier");
  if (typeof raw.occurred_at !== "string" || !UTC_TIMESTAMP.test(raw.occurred_at)) fail("invalid_timestamp");
  const occurred = Date.parse(raw.occurred_at);
  if (!Number.isFinite(occurred)) fail("invalid_timestamp");
  const canonicalTime = new Date(occurred).toISOString();
  if (canonicalTime !== raw.occurred_at && canonicalTime.replace(".000Z", "Z") !== raw.occurred_at) {
    fail("invalid_timestamp");
  }
  if (!Number.isFinite(now) || Math.abs(now - occurred) > MAX_EVENT_SKEW_MS) fail("event_outside_delivery_window");
  if (!allowed.paths.has(raw.landing_path) || !allowed.paths.has(raw.page_path)) fail("unknown_path");
  const pageLocale = raw.page_path === "/en/" || raw.page_path.startsWith("/en/") ? "en" : "es";
  if (raw.locale !== pageLocale) fail("invalid_locale");
  const channel = raw.traffic_channel;
  const host = raw.referrer_host;
  if (!((channel === "direct" || channel === "referral") && host === "")
      && !(channel === "internal" && host === "5sigmas.com")
      && !(channel === "organic_search" && SEARCH_REFERRERS.has(host))
      && !(channel === "ai_referral" && AI_REFERRERS.has(host))) fail("invalid_acquisition");
  if (!object(raw.context)) fail("invalid_context");
  const keys = new Set(EVENT_CONTEXT[raw.event_name]);
  const context = {};
  for (const [key, value] of Object.entries(raw.context)) {
    if (!keys.has(key)) fail("invalid_context");
    if (key === "tool_id" && !allowed.tool_ids.has(value)) fail("unknown_tool");
    if (key === "field" && !allowed.fields.has(value)) fail("unknown_field");
    if (key === "video_id" && !allowed.video_ids.has(value)) fail("unknown_video");
    if (key === "target_path" && !allowed.paths.has(value)) fail("unknown_target");
    if (key === "source_kind" && value !== "primary-source") fail("invalid_context");
    if (key === "related_kind" && value !== "contextual") fail("invalid_context");
    if (key === "result_kind" && !RESULT_KINDS.has(value)) fail("invalid_context");
    if (key === "milestone" && value !== 50 && value !== 90) fail("invalid_context");
    if (key === "action") {
      const actions = raw.event_name === "scenario_completed" ? ["submit"]
        : raw.event_name === "share" ? ["share"] : ["export", "download"];
      if (!actions.includes(value)) fail("invalid_context");
    }
    context[key] = value;
  }
  if (TOOL_EVENTS.has(raw.event_name) && !Object.hasOwn(context, "tool_id")) fail("missing_tool");
  if (Object.hasOwn(context, "tool_id") && allowed.tool_paths
      && allowed.tool_paths[raw.page_path] !== context.tool_id) fail("tool_path_mismatch");
  if (raw.event_name === "meaningful_input_change" && !Object.hasOwn(context, "field")) fail("missing_field");
  if (Object.hasOwn(context, "field") && allowed.tool_fields
      && !allowed.tool_fields[context.tool_id]?.has(context.field)) fail("tool_field_mismatch");
  if (["scenario_completed", "result_rendered"].includes(raw.event_name) && !Object.hasOwn(context, "result_kind")) {
    fail("missing_result_kind");
  }
  if (["share", "export"].includes(raw.event_name) && !Object.hasOwn(context, "action")) fail("missing_action");
  if (["video_play", "video_complete"].includes(raw.event_name) && !Object.hasOwn(context, "video_id")) fail("missing_video");
  if (raw.event_name === "article_engagement" && !Object.hasOwn(context, "milestone")) fail("missing_milestone");
  // Copy only admitted fields. No transport attributes enter this object.
  return {
    schema_version: 1,
    event_name: raw.event_name,
    event_id: raw.event_id,
    occurred_at: canonicalTime,
    session_id: raw.session_id,
    landing_path: raw.landing_path,
    page_path: raw.page_path,
    locale: raw.locale,
    traffic_channel: channel,
    referrer_host: host,
    context,
  };
}

export function measurementResponse(value, status = 200, extraHeaders = {}) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

async function readBoundedJson(request) {
  if (request.headers.get("content-type")?.trim().toLowerCase() !== "application/json"
      || request.headers.has("content-encoding")) fail("unsupported_media_type", 415);
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    fail("payload_too_large", 413);
  }
  if (!request.body) fail("invalid_json");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  let timer;
  try {
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new MeasurementError("body_timeout", 408)), 3000);
    });
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES || chunks.length >= 128) fail("payload_too_large", 413);
      chunks.push(value);
    }
    if (declared !== null && Number(declared) !== size) fail("invalid_content_length");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { fail("invalid_json"); }
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
  }
}

function transportAllowed(request, { requireOrigin = false, exportRoute = false } = {}) {
  const origin = request.headers.get("origin");
  if ((requireOrigin && origin !== SITE_ORIGIN) || (origin !== null && origin !== SITE_ORIGIN)) fail("origin_refused", 403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin" && !(exportRoute && fetchSite === "none")) fail("origin_refused", 403);
  if (request.headers.has("cookie") || request.headers.has("proxy-authorization")
      || (!exportRoute && request.headers.has("authorization"))) fail("credentials_refused", 403);
  if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") fail("privacy_preference", 403);
}

/** Same-origin public intake and OIDC-protected private export; never mounted under MCP. */
export async function handleMeasurement(request, env, options = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(MEASUREMENT_PREFIX)) return null;
  try {
    if (url.origin !== SITE_ORIGIN || url.search || url.hash || request.url.includes("?")) fail("invalid_route", 400);
    const route = url.pathname.slice(MEASUREMENT_PREFIX.length);
    if (!["events", "health", "export"].includes(route)) fail("not_found", 404);
    const method = route === "events" ? "POST" : "GET";
    if (request.method !== method) return measurementResponse({ error: "method_not_allowed" }, 405, { Allow: method });
    transportAllowed(request, { requireOrigin: route === "events", exportRoute: route === "export" });
    if (env.MEASUREMENT_ENABLED !== "true" || env.MEASUREMENT_POLICY_REVISION !== POLICY_REVISION) {
      return measurementResponse({ ready: false, state: "NOT_CONNECTED" }, 503);
    }
    compileCatalog(env.MEASUREMENT_CATALOG);
    if (!env.MEASUREMENT_STORE?.jurisdiction) fail("storage_unavailable", 503);
    if (route === "export") {
      const authorize = options.verifyExportAuthorization || verifyExportAuthorization;
      if (!(await authorize(request, env))) fail("unauthorized", 401);
    }
    let event;
    if (route === "events") {
      if (request.headers.get("x-s5-consent") !== "granted"
          || request.headers.get("x-s5-policy-revision") !== POLICY_REVISION) fail("consent_required", 403);
      event = validateMeasurementEvent(await readBoundedJson(request), env.MEASUREMENT_CATALOG,
        options.now ? options.now() : Date.now());
    }
    const namespace = env.MEASUREMENT_STORE.jurisdiction("eu");
    const stub = namespace.get(namespace.idFromName("5sigmas-postclick-v1"));
    const response = await stub.fetch(new Request(`https://measurement.internal/${route === "events" ? "ingest" : route}`, {
      method: event ? "POST" : "GET",
      ...(event ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) } : {}),
    }));
    // Neither the public intake nor health routes return stored counters or identifiers.
    if (route !== "export" && response.ok) {
      return measurementResponse(route === "health"
        ? { ok: true, service: "5sigmas-measurement", schema_version: 1, policy_revision: POLICY_REVISION,
          consent_mode: "explicit_opt_in", retention_days: 90, storage: "ready" }
        : { accepted: true }, response.status);
    }
    return response;
  } catch (error) {
    if (error instanceof MeasurementError) return measurementResponse({ error: error.code }, error.status);
    return measurementResponse({ error: "collector_unavailable" }, 503);
  }
}
