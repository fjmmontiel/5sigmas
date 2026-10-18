import { MAX_EVENT_SKEW_MS, POLICY_REVISION, SITE_ORIGIN, measurementResponse } from "./measurement-collector.js";

export const DATE_BASIS = "America/Los_Angeles";
export const ATTRIBUTION_BASIS = "session_start_date_landing_path_locale_channel";
export const BOOKKEEPING_RETENTION_MS = 48 * 60 * 60 * 1000;
export const AGGREGATE_RETENTION_DAYS = 90;
export const MAX_SESSION_SPAN_MS = 24 * 60 * 60 * 1000 + MAX_EVENT_SKEW_MS;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export const COUNT_FIELDS = [
  "sessions", "pageviews", "engaged_sessions", "converted_sessions", "key_events",
  "tool_opens", "meaningful_input_changes", "scenario_completions", "results_rendered",
  "shares", "exports", "source_clicks", "related_content_clicks", "video_plays",
  "video_completions", "article_engagement_50", "article_engagement_90",
];
const PRIVATE_COUNTS = ["unique_events", "duplicate_events_ignored", "sessions_without_page_view"];
const ALL_COUNTS = [...COUNT_FIELDS, ...PRIVATE_COUNTS];
const EVENT_FIELDS = {
  page_view: "pageviews", tool_open: "tool_opens", meaningful_input_change: "meaningful_input_changes",
  scenario_completed: "scenario_completions", result_rendered: "results_rendered", share: "shares",
  export: "exports", source_click: "source_clicks", related_content_click: "related_content_clicks",
  video_play: "video_plays", video_complete: "video_completions",
};
const ENGAGEMENT_EVENTS = new Set([
  "meaningful_input_change", "scenario_completed", "result_rendered", "share", "export",
  "source_click", "related_content_click", "video_play", "video_complete", "article_engagement",
]);
const KEY_EVENTS = new Set(["scenario_completed", "result_rendered", "share", "export"]);
export const DEFAULT_LIMITS = Object.freeze({
  sessionPerMinute: 120,
  sessionEvents: 2000,
  globalPerMinute: 2000,
  globalPerDay: 20000,
  sessionsPerDay: 4000,
  aggregateRows: 100000,
  exportRows: 30000,
});

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DATE_BASIS, year: "numeric", month: "2-digit", day: "2-digit",
});
export const pacificDate = (ms) => formatter.format(new Date(ms));
export function shiftDay(day, count) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
}
const counts = () => Object.fromEntries(ALL_COUNTS.map((key) => [key, 0]));
const localeFor = (path) => path === "/en/" || path.startsWith("/en/") ? "en" : "es";
const canonical = (value) => JSON.stringify(value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key,
    value[key] && typeof value[key] === "object" ? JSON.parse(canonical(value[key])) : value[key]])) : value);
const sha256 = async (text) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))]
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");
const int = (value) => Number.isSafeInteger(value) && value >= 0;

function addEvent(previous, event) {
  const result = { ...previous };
  result.sessions = 1;
  result.unique_events += 1;
  if (EVENT_FIELDS[event.event_name]) result[EVENT_FIELDS[event.event_name]] += 1;
  if (ENGAGEMENT_EVENTS.has(event.event_name)) result.engaged_sessions = 1;
  if (KEY_EVENTS.has(event.event_name)) { result.key_events += 1; result.converted_sessions = 1; }
  if (event.event_name === "article_engagement") result[`article_engagement_${event.context.milestone}`] += 1;
  result.sessions_without_page_view = result.pageviews === 0 ? 1 : 0;
  return result;
}

/** Private binding only. Persists aggregate counters and expiring salted hashes, never payloads. */
export class MeasurementStore {
  constructor(ctx, env, options = {}) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.now = options.now || Date.now;
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    if (Object.values(this.limits).some((value) => !Number.isSafeInteger(value) || value <= 0)) throw new Error("invalid_limits");
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    this.sql.exec(`CREATE TABLE IF NOT EXISTS session_state (
      session_hash TEXT PRIMARY KEY, landing_path TEXT NOT NULL, traffic_channel TEXT NOT NULL,
      referrer_host TEXT NOT NULL, started_ms INTEGER NOT NULL, last_ms INTEGER NOT NULL,
      created_ms INTEGER NOT NULL, expires_ms INTEGER NOT NULL, bucket_date TEXT NOT NULL,
      counters TEXT NOT NULL)`);
    this.sql.exec("CREATE INDEX IF NOT EXISTS session_expiry ON session_state(expires_ms)");
    this.sql.exec(`CREATE TABLE IF NOT EXISTS event_receipts (
      event_hash TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, session_hash TEXT NOT NULL,
      expires_ms INTEGER NOT NULL)`);
    this.sql.exec("CREATE INDEX IF NOT EXISTS receipt_expiry ON event_receipts(expires_ms)");
    this.sql.exec(`CREATE TABLE IF NOT EXISTS session_pages (
      session_hash TEXT NOT NULL, date TEXT NOT NULL, page_path TEXT NOT NULL, locale TEXT NOT NULL,
      counters TEXT NOT NULL, expires_ms INTEGER NOT NULL,
      PRIMARY KEY(session_hash,date,page_path,locale))`);
    this.sql.exec("CREATE INDEX IF NOT EXISTS page_bookkeeping_expiry ON session_pages(expires_ms)");
    const columns = ALL_COUNTS.map((name) => `${name} INTEGER NOT NULL DEFAULT 0 CHECK(${name} >= 0)`).join(",");
    this.sql.exec(`CREATE TABLE IF NOT EXISTS landing_rows (
      date TEXT NOT NULL, path TEXT NOT NULL, locale TEXT NOT NULL, traffic_channel TEXT NOT NULL,
      ${columns}, PRIMARY KEY(date,path,locale,traffic_channel))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS page_rows (
      date TEXT NOT NULL, path TEXT NOT NULL, locale TEXT NOT NULL, traffic_channel TEXT NOT NULL,
      ${columns}, PRIMARY KEY(date,path,locale,traffic_channel))`);
    this.sql.exec("CREATE TABLE IF NOT EXISTS rate_windows (kind TEXT NOT NULL, key TEXT NOT NULL, count INTEGER NOT NULL, expires_ms INTEGER NOT NULL, PRIMARY KEY(kind,key))");
    this.sql.exec("CREATE INDEX IF NOT EXISTS rate_expiry ON rate_windows(expires_ms)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS incomplete_days (date TEXT PRIMARY KEY)");
    if (!this.meta("hash_salt")) this.setMeta("hash_salt", crypto.randomUUID() + crypto.randomUUID());
    this.salt = this.meta("hash_salt");
  }

  one(query, ...params) { return [...this.sql.exec(query, ...params)][0] || null; }
  meta(key) { return this.one("SELECT value FROM meta WHERE key=?", key)?.value ?? null; }
  setMeta(key, value) { this.sql.exec("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", key, String(value)); }
  atomic(fn) { return this.ctx.storage.transactionSync(fn); }
  enabled() { return this.env.MEASUREMENT_ENABLED === "true" && this.env.MEASUREMENT_POLICY_REVISION === POLICY_REVISION; }

  markIncomplete(...days) {
    for (const day of new Set(days)) this.sql.exec("INSERT OR IGNORE INTO incomplete_days(date) VALUES(?)", day);
  }

  touch(now, firstEventMs = now) {
    const prior = Number(this.meta("covered_through_ms") || 0);
    // Alarms are hourly. A missed heartbeat is retained as a coverage gap.
    if (prior && now - prior > 3 * HOUR) {
      for (let day = pacificDate(prior); day <= pacificDate(now); day = shiftDay(day, 1)) this.markIncomplete(day);
    }
    const start = this.meta("collection_started_ms");
    if (start === null) this.setMeta("collection_started_ms", Math.min(now, firstEventMs));
    else if (firstEventMs < Number(start)) this.setMeta("collection_started_ms", firstEventMs);
    this.setMeta("covered_through_ms", Math.max(now, prior));
  }

  purge(now) {
    const oldest = shiftDay(pacificDate(now), -(AGGREGATE_RETENTION_DAYS - 1));
    for (const table of ["event_receipts", "session_pages", "session_state", "rate_windows"]) {
      this.sql.exec(`DELETE FROM ${table} WHERE expires_ms <= ?`, now);
    }
    for (const table of ["landing_rows", "page_rows", "incomplete_days"]) {
      this.sql.exec(`DELETE FROM ${table} WHERE date < ?`, oldest);
    }
  }

  async schedule(now) {
    let next = now + HOUR;
    // Wake exactly at a Pacific date boundary when it precedes the next hourly sweep.
    if (pacificDate(next) !== pacificDate(now)) {
      let low = now;
      let high = next;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (pacificDate(middle) === pacificDate(now)) low = middle;
        else high = middle;
      }
      next = high;
    }
    for (const table of ["event_receipts", "session_pages", "session_state", "rate_windows"]) {
      const row = this.one(`SELECT MIN(expires_ms) AS expiry FROM ${table}`);
      if (row?.expiry !== null && row?.expiry !== undefined) next = Math.min(next, Math.max(now + 1, row.expiry));
    }
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm === null || alarm <= now || alarm > next) await this.ctx.storage.setAlarm(next);
  }

  bumpWindow(kind, key, expires, maximum) {
    const prior = this.one("SELECT count FROM rate_windows WHERE kind=? AND key=?", kind, key)?.count || 0;
    if (prior >= maximum) return false;
    this.sql.exec("INSERT INTO rate_windows(kind,key,count,expires_ms) VALUES(?,?,1,?) ON CONFLICT(kind,key) DO UPDATE SET count=count+1", kind, key, expires);
    return true;
  }

  admission(now, hash, freshSession) {
    const minute = String(Math.floor(now / MINUTE));
    const day = pacificDate(now);
    const windows = [
      ["global_minute", minute, now + 2 * MINUTE, this.limits.globalPerMinute],
      ["global_day", day, now + 48 * HOUR, this.limits.globalPerDay],
      ["session_minute", `${hash}:${minute}`, now + 2 * MINUTE, this.limits.sessionPerMinute],
      ...(freshSession ? [["new_sessions", day, now + 48 * HOUR, this.limits.sessionsPerDay]] : []),
    ];
    for (const [kind, key, , limit] of windows) {
      if ((this.one("SELECT count FROM rate_windows WHERE kind=? AND key=?", kind, key)?.count || 0) >= limit) return false;
    }
    for (const args of windows) this.bumpWindow(...args);
    return true;
  }

  adjustRow(table, day, path, locale, channel, values, direction) {
    const current = this.one(`SELECT * FROM ${table} WHERE date=? AND path=? AND locale=? AND traffic_channel=?`, day, path, locale, channel);
    const updated = {};
    for (const key of ALL_COUNTS) {
      updated[key] = Number(current?.[key] || 0) + direction * values[key];
      if (!int(updated[key])) throw new Error("counter_overflow");
    }
    const columns = ["date", "path", "locale", "traffic_channel", ...ALL_COUNTS];
    this.sql.exec(`INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map(() => "?").join(",")})
      ON CONFLICT(date,path,locale,traffic_channel) DO UPDATE SET ${ALL_COUNTS.map((key) => `${key}=excluded.${key}`).join(",")}`,
      day, path, locale, channel, ...ALL_COUNTS.map((key) => updated[key]));
  }

  adjustSession(state, direction) {
    const locale = localeFor(state.landing_path);
    this.adjustRow("landing_rows", state.bucket_date, state.landing_path, locale, state.traffic_channel,
      JSON.parse(state.counters), direction);
  }

  async ingest(event) {
    const now = this.now();
    if (!this.enabled()) return measurementResponse({ error: "collection_disabled" }, 503);
    const clientOccurred = Date.parse(event.occurred_at);
    if (!Number.isFinite(clientOccurred) || Math.abs(now - clientOccurred) > MAX_EVENT_SKEW_MS) {
      return measurementResponse({ error: "event_outside_delivery_window" }, 400);
    }
    // A tolerated fast browser clock must never fabricate a future coverage day.
    const occurred = Math.min(clientOccurred, now);
    const [sessionHash, eventHash, fingerprint] = await Promise.all([
      sha256(`${this.salt}\0session\0${event.session_id}`),
      sha256(`${this.salt}\0event\0${event.event_id}`),
      sha256(canonical(event)),
    ]);
    let result;
    try {
      result = this.atomic(() => {
        this.purge(now);
        const session = this.one("SELECT * FROM session_state WHERE session_hash=?", sessionHash);
        const previousReceipt = this.one("SELECT * FROM event_receipts WHERE event_hash=?", eventHash);
        if (previousReceipt && previousReceipt.fingerprint !== fingerprint) return { status: 409, error: "event_id_conflict" };
        if (session && (session.landing_path !== event.landing_path || session.traffic_channel !== event.traffic_channel
          || session.referrer_host !== event.referrer_host)) return { status: 409, error: "session_attribution_conflict" };
        if (session && (Math.max(session.last_ms, occurred) - Math.min(session.started_ms, occurred) > MAX_SESSION_SPAN_MS
            || now - session.started_ms > MAX_SESSION_SPAN_MS)) return { status: 409, error: "session_expired" };
        if (!this.admission(now, sessionHash, !session)) {
          this.markIncomplete(pacificDate(now), pacificDate(occurred), session?.bucket_date || pacificDate(occurred));
          return { status: 429, error: "rate_limited" };
        }
        if (previousReceipt) {
          if (!session) return { status: 409, error: "session_expired" };
          this.touch(now, occurred);
          this.adjustSession(session, -1);
          const counters = JSON.parse(session.counters);
          counters.duplicate_events_ignored += 1;
          session.counters = JSON.stringify(counters);
          this.adjustSession(session, 1);
          this.sql.exec("UPDATE session_state SET counters=? WHERE session_hash=?", session.counters, sessionHash);
          return { status: 200, accepted: true, duplicate: true };
        }
        const priorCounts = session ? JSON.parse(session.counters) : counts();
        if (priorCounts.unique_events >= this.limits.sessionEvents) {
          this.markIncomplete(pacificDate(now), session.bucket_date);
          return { status: 429, error: "session_event_limit" };
        }
        const aggregateRows = this.one("SELECT (SELECT COUNT(*) FROM landing_rows) + (SELECT COUNT(*) FROM page_rows) AS n").n;
        const targetLandingDate = pacificDate(Math.min(session?.started_ms ?? occurred, occurred));
        const landingExists = this.one("SELECT 1 AS present FROM landing_rows WHERE date=? AND path=? AND locale=? AND traffic_channel=?",
          targetLandingDate, event.landing_path, localeFor(event.landing_path), event.traffic_channel);
        const pageExists = this.one("SELECT 1 AS present FROM page_rows WHERE date=? AND path=? AND locale=? AND traffic_channel=?",
          pacificDate(occurred), event.page_path, event.locale, event.traffic_channel);
        if (aggregateRows + (landingExists ? 0 : 1) + (pageExists ? 0 : 1) > this.limits.aggregateRows) {
          this.markIncomplete(pacificDate(now), pacificDate(occurred), session?.bucket_date || pacificDate(occurred));
          return { status: 429, error: "storage_capacity" };
        }
        this.touch(now, occurred);
        const expires = session?.expires_ms || now + BOOKKEEPING_RETENTION_MS;
        const next = {
          session_hash: sessionHash, landing_path: event.landing_path, traffic_channel: event.traffic_channel,
          referrer_host: event.referrer_host, started_ms: Math.min(session?.started_ms ?? occurred, occurred),
          last_ms: Math.max(session?.last_ms ?? occurred, occurred), created_ms: session?.created_ms || now,
          expires_ms: expires, bucket_date: pacificDate(Math.min(session?.started_ms ?? occurred, occurred)),
          counters: JSON.stringify(addEvent(priorCounts, event)),
        };
        if (session) this.adjustSession(session, -1);
        this.adjustSession(next, 1);
        this.sql.exec(`INSERT INTO session_state(session_hash,landing_path,traffic_channel,referrer_host,started_ms,last_ms,created_ms,expires_ms,bucket_date,counters)
          VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(session_hash) DO UPDATE SET started_ms=excluded.started_ms,last_ms=excluded.last_ms,bucket_date=excluded.bucket_date,counters=excluded.counters`,
          next.session_hash, next.landing_path, next.traffic_channel, next.referrer_host, next.started_ms,
          next.last_ms, next.created_ms, next.expires_ms, next.bucket_date, next.counters);
        const pageDay = pacificDate(occurred);
        const pageArgs = [sessionHash, pageDay, event.page_path, event.locale];
        const oldPage = this.one("SELECT counters FROM session_pages WHERE session_hash=? AND date=? AND page_path=? AND locale=?", ...pageArgs);
        const oldPageCounts = oldPage ? JSON.parse(oldPage.counters) : counts();
        const newPageCounts = addEvent(oldPageCounts, event);
        if (oldPage) this.adjustRow("page_rows", pageDay, event.page_path, event.locale, event.traffic_channel, oldPageCounts, -1);
        this.adjustRow("page_rows", pageDay, event.page_path, event.locale, event.traffic_channel, newPageCounts, 1);
        this.sql.exec("INSERT INTO session_pages(session_hash,date,page_path,locale,counters,expires_ms) VALUES(?,?,?,?,?,?) ON CONFLICT(session_hash,date,page_path,locale) DO UPDATE SET counters=excluded.counters",
          ...pageArgs, JSON.stringify(newPageCounts), expires);
        this.sql.exec("INSERT INTO event_receipts(event_hash,fingerprint,session_hash,expires_ms) VALUES(?,?,?,?)", eventHash, fingerprint, sessionHash, expires);
        this.sql.exec("DELETE FROM landing_rows WHERE sessions=0");
        return { status: 202, accepted: true, duplicate: false };
      });
    } catch {
      this.atomic(() => this.markIncomplete(pacificDate(now), pacificDate(occurred)));
      result = { status: 503, error: "storage_write_refused" };
    }
    await this.schedule(now);
    return measurementResponse(result.error ? { error: result.error } : { accepted: true, duplicate: result.duplicate },
      result.status, result.status === 429 ? { "Retry-After": "60" } : {});
  }

  projection(now) {
    const start = this.meta("collection_started_ms");
    if (start === null) return null;
    const first = Number(start);
    const today = pacificDate(now);
    const startDate = [pacificDate(first), shiftDay(today, -(AGGREGATE_RETENTION_DAYS - 1))].sort().at(-1);
    const endDate = today;
    const gaps = new Set([...this.sql.exec("SELECT date FROM incomplete_days")].map((row) => row.date));
    const completeDays = [];
    const fullStart = shiftDay(pacificDate(first), 1);
    for (let day = [startDate, fullStart].sort().at(-1); day <= shiftDay(today, -3); day = shiftDay(day, 1)) {
      if (!gaps.has(day)) completeDays.push(day);
    }
    const rawLanding = [...this.sql.exec("SELECT * FROM landing_rows ORDER BY date,path,locale,traffic_channel LIMIT ?", this.limits.exportRows + 1)];
    const rawPages = [...this.sql.exec("SELECT * FROM page_rows ORDER BY date,path,locale,traffic_channel LIMIT ?", this.limits.exportRows + 1)];
    if (rawLanding.length + rawPages.length > this.limits.exportRows) throw new Error("export_capacity");
    const countersOf = (row) => Object.fromEntries(COUNT_FIELDS.map((field) => [field, row[field]]));
    const rows = rawLanding.map((row) => {
      return { date: row.date, landing_path: row.path, locale: row.locale, traffic_channel: row.traffic_channel,
        ...countersOf(row), referrer_host_sessions: {} };
    });
    const diagnostics = Object.fromEntries([...PRIVATE_COUNTS, "sessions"].map((key) => [key,
      rawLanding.reduce((total, row) => total + row[key], 0)]));
    return {
      schema_version: 1, site_origin: SITE_ORIGIN, date_basis: DATE_BASIS,
      generated_at: new Date(now).toISOString(), collection_started_at: new Date(first).toISOString(),
      covered_through: new Date(Number(this.meta("covered_through_ms"))).toISOString(),
      coverage: { start_date: startDate, end_date: endDate, complete_days: completeDays, scope: "received_opt_in_events" },
      consent_mode: "explicit_opt_in", policy_revision: POLICY_REVISION, retention_days: AGGREGATE_RETENTION_DAYS,
      first_party: { schema_version: 1, date_basis: DATE_BASIS, attribution_basis: ATTRIBUTION_BASIS, rows, diagnostics },
      page_activity: { rows: rawPages.map((row) => ({ date: row.date, page_path: row.path,
        locale: row.locale, traffic_channel: row.traffic_channel, ...countersOf(row) })) },
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const now = this.now();
    if (request.method === "POST" && url.pathname === "/ingest") {
      // The binding is private; the public router has already enforced the static catalog.
      return this.ingest(await request.json());
    }
    if (request.method !== "GET" || !["/health", "/export"].includes(url.pathname)) return measurementResponse({ error: "not_found" }, 404);
    if (!this.enabled()) {
      this.atomic(() => { this.purge(now); if (this.meta("collection_started_ms") !== null) this.markIncomplete(pacificDate(now)); });
      await this.schedule(now);
      return measurementResponse({ error: "collection_disabled" }, 503);
    }
    if (url.pathname === "/export" && this.meta("collection_started_ms") === null) {
      return measurementResponse({ error: "collection_not_started" }, 409);
    }
    this.atomic(() => {
      this.purge(now);
      // Readiness alone is not evidence that a deployed browser has collected anything.
      if (this.meta("collection_started_ms") !== null) this.touch(now);
    });
    await this.schedule(now);
    if (url.pathname === "/health") return measurementResponse({ ready: true });
    try { return measurementResponse(this.projection(now)); }
    catch { return measurementResponse({ error: "export_unavailable" }, 503); }
  }

  async alarm() {
    const now = this.now();
    this.atomic(() => {
      this.purge(now);
      if (this.meta("collection_started_ms") !== null) {
        if (this.enabled()) this.touch(now);
        else this.markIncomplete(pacificDate(now));
      }
    });
    await this.schedule(now);
  }
}
