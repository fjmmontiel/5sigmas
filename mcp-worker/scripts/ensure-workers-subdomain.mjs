import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const API_ORIGIN = "https://api.cloudflare.com/client/v4";
const WORKER = "five-sigmas-mcp";
export const INITIAL_SUBDOMAIN = "5sigmas-fjmmontiel";
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_WORKERS = 100;
const validSubdomain = (value) => typeof value === "string"
  && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);

export class PreflightError extends Error {
  constructor(code) { super(code); this.name = "PreflightError"; }
}
const refuse = (code) => { throw new PreflightError(code); };
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function validateWorkerPolicy(config) {
  const expectedRoutes = ["5sigmas.com/_s5/measurement/*", "5sigmas.com/mcp*"];
  if (!object(config) || config.name !== WORKER || config.workers_dev !== false
      || config.preview_urls !== false || !Array.isArray(config.routes)
      || config.routes.length !== expectedRoutes.length
      || config.routes.some((route) => !object(route) || route.zone_name !== "5sigmas.com"
        || route.custom_domain === true)
      || JSON.stringify(config.routes.map((route) => route.pattern).sort()) !== JSON.stringify(expectedRoutes)) {
    refuse("custom_route_policy_mismatch");
  }
}

async function boundedJson(response) {
  if (response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json"
      || !response.body) refuse("invalid_api_response");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) refuse("api_response_too_large");
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!object(data)) refuse("invalid_api_response");
    return data;
  } catch (error) {
    if (error instanceof PreflightError) throw error;
    refuse("invalid_api_response");
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function errorCodes(data) {
  if (!Array.isArray(data.errors) || data.errors.length > 16) return [];
  return data.errors.map((error) => error?.code).filter(Number.isSafeInteger);
}

function apiError(reply) {
  const codes = errorCodes(reply.data);
  return new PreflightError(`cloudflare_http_${reply.status}${codes.length ? `_codes_${codes.join("_")}` : ""}`);
}

function successful(reply) {
  if (reply.status < 200 || reply.status >= 300 || reply.data.success !== true) throw apiError(reply);
  return reply.data.result;
}

/** Initialize only a verified-absent account namespace; never rename an existing one.
 * The only write is one PUT to the account subdomain endpoint. Credentials stay
 * inside the existing deployment job; response bodies and headers are never logged.
 */
export async function ensureWorkersSubdomain({ accountId, apiToken, config, fetcher = fetch }) {
  validateWorkerPolicy(config);
  if (typeof accountId !== "string" || !/^[a-f0-9]{32}$/i.test(accountId)
      || typeof apiToken !== "string" || !apiToken.trim() || /[\r\n]/.test(apiToken)) {
    refuse("invalid_deployment_credentials");
  }
  const accountPath = `/accounts/${accountId}/workers`;
  const accountSubdomainPath = `${accountPath}/subdomain`;
  const request = async (method, path, body) => {
    let response;
    try {
      response = await fetcher(`${API_ORIGIN}${path}`, {
        method, redirect: "error", credentials: "omit", cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${apiToken}`, Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { refuse("api_transport_failed"); }
    // A denial never becomes absence or triggers a different credential/path.
    if (response.status === 401 || response.status === 403) {
      refuse(`cloudflare_authorization_denied_http_${response.status}`);
    }
    if (response.status >= 300 && response.status < 400) refuse("api_redirect_refused");
    return { status: response.status, data: await boundedJson(response), link: response.headers.get("link") };
  };

  const readAccountSubdomain = async () => {
    const reply = await request("GET", accountSubdomainPath);
    const codes = errorCodes(reply.data);
    // Wrangler recognizes 10007 as missing. A bare 404 or an auth/network error
    // does not establish absence. Mixed or malformed error lists fail closed.
    if (reply.status === 404 && reply.data.success === false && codes.length > 0
        && codes.length === reply.data.errors.length && codes.every((code) => code === 10007)) return null;
    const result = successful(reply);
    if (!object(result) || !validSubdomain(result.subdomain)) refuse("invalid_account_subdomain");
    return result.subdomain;
  };

  const inspectWorkers = async () => {
    const reply = await request("GET", `${accountPath}/scripts`);
    const scripts = successful(reply);
    // The documented scripts-list endpoint is unpaginated. Refuse unexpected
    // pagination/truncation rather than treating a partial inventory as complete.
    const info = reply.data.result_info;
    if (!Array.isArray(scripts) || scripts.length === 0 || scripts.length > MAX_WORKERS
        || reply.link || (info !== undefined && (!object(info)
          || Object.keys(info).some((key) => !["page", "per_page", "count", "total_count", "total_pages"].includes(key))
          || (info.page !== undefined && info.page !== 1)
          || (info.per_page !== undefined && (!Number.isSafeInteger(info.per_page)
            || info.per_page < 1 || info.per_page < scripts.length))
          || (info.count !== undefined && info.count !== scripts.length)
          || (info.total_count !== undefined && info.total_count !== scripts.length)
          || (info.total_pages !== undefined && info.total_pages !== 1)
          || (info.total_count === undefined && info.total_pages === undefined)))) {
      refuse("worker_inventory_incomplete");
    }
    const names = scripts.map((script) => script?.id);
    if (names.some((name) => typeof name !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(name))
        || new Set(names).size !== names.length || !names.includes(WORKER)) refuse("worker_inventory_unexpected");
    for (const name of names.sort()) {
      const result = successful(await request("GET", `${accountPath}/scripts/${encodeURIComponent(name)}/subdomain`));
      if (!object(result) || typeof result.enabled !== "boolean" || typeof result.previews_enabled !== "boolean") {
        refuse(name === WORKER ? "owned_worker_url_flags_unknown" : "other_worker_url_flags_unknown");
      }
      if (result.enabled || result.previews_enabled) {
        refuse(`${name === WORKER ? "owned" : "other"}_worker_public_urls_enabled_production_${result.enabled}_preview_${result.previews_enabled}`);
      }
    }
    return names;
  };

  let existing = await readAccountSubdomain();
  if (existing !== null) return { state: "existing", writes: 0 };
  const before = await inspectWorkers();
  // The API has no documented create-if-absent/CAS operation. Recheck as close
  // as possible to the PUT, under the existing deployment concurrency lock.
  existing = await readAccountSubdomain();
  if (existing !== null) return { state: "existing", writes: 0 };

  let writeError;
  try {
    const result = successful(await request("PUT", accountSubdomainPath, { subdomain: INITIAL_SUBDOMAIN }));
    if (!object(result) || result.subdomain !== INITIAL_SUBDOMAIN) refuse("unexpected_creation_response");
  } catch (error) {
    // Authentication denials are terminal. Never repeat PUT after a lost or
    // ambiguous acknowledgement: one read-back is the only reconciliation.
    if (error instanceof PreflightError && error.message.startsWith("cloudflare_authorization_denied_")) throw error;
    writeError = error instanceof PreflightError ? error : new PreflightError("subdomain_creation_unconfirmed");
  }
  let observed;
  try { observed = await readAccountSubdomain(); }
  catch (error) {
    if (error instanceof PreflightError && error.message.startsWith("cloudflare_authorization_denied_")) throw error;
    throw writeError || error;
  }
  if (observed !== INITIAL_SUBDOMAIN) throw writeError || new PreflightError("subdomain_creation_unconfirmed");
  const after = await inspectWorkers();
  if (JSON.stringify(after) !== JSON.stringify(before)) refuse("worker_inventory_changed_after_creation");
  return { state: writeError ? "created_readback_confirmed" : "created", writes: 1, workers_checked: after.length };
}

export async function runPreflight({ env = process.env, fetcher = fetch, log = console.log, errorLog = console.error } = {}) {
  try {
    const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
    const result = await ensureWorkersSubdomain({
      accountId: env.CLOUDFLARE_ACCOUNT_ID, apiToken: env.CLOUDFLARE_API_TOKEN, config, fetcher,
    });
    log(`Workers account prerequisite: ${result.state}; writes=${result.writes}.`);
    return 0;
  } catch (error) {
    // Never print errors from fetch, remote bodies, URLs, account IDs or tokens.
    errorLog(`Workers account prerequisite refused: ${error instanceof PreflightError ? error.message : "unexpected_error"}.`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runPreflight();
}
