// Read-only aggregate export authorization. No long-lived shared secret.
// https://docs.github.com/en/actions/reference/security/oidc
export const EXPORT_AUDIENCE = "https://5sigmas.com/_s5/measurement/export";
const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const REPOSITORY = "fjmmontiel/5sigmas-tools-content";
const REPOSITORY_ID = "1249897559";
const OWNER_ID = "162696664";
const WORKFLOW = `${REPOSITORY}/.github/workflows/gsc-direct-growth-data.yml@refs/heads/main`;
const SUBJECTS = new Set([
  `repo:${REPOSITORY}:ref:refs/heads/main`,
  `repo:fjmmontiel@${OWNER_ID}/5sigmas-tools-content@${REPOSITORY_ID}:ref:refs/heads/main`,
]);
let cachedKeys = null;
let cachedAt = 0;
let pendingKeys = null;
let lastUnknownKeyRefresh = 0;

function decodePart(part) {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error("Invalid token encoding");
  const decoded = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function parsePart(part) {
  const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decodePart(part)));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid token object");
  return value;
}

async function fetchKeys(fetcher) {
  const response = await fetcher(JWKS_URL, {
    redirect: "manual", credentials: "omit", cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Key service unavailable");
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw new Error("Invalid key response");
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  const result = JSON.parse(new TextDecoder().decode(buffer));
  if (!Array.isArray(result.keys) || result.keys.length > 16) throw new Error("Invalid key set");
  return result.keys;
}

async function getKeys(now, fetcher, useCache, refresh = false) {
  if (!useCache) return fetchKeys(fetcher);
  if (!refresh && cachedKeys && now - cachedAt < 600000) return cachedKeys;
  if (!pendingKeys) pendingKeys = fetchKeys(fetcher).then((keys) => {
    cachedKeys = keys; cachedAt = now; return keys;
  }).finally(() => { pendingKeys = null; });
  return pendingKeys;
}

export async function verifyExportAuthorization(request, _env = {}, options = {}) {
  try {
    const authorization = request.headers.get("Authorization") || "";
    if (authorization.length > 16384 || !authorization.startsWith("Bearer ")) return false;
    const token = authorization.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = parsePart(parts[0]);
    const claims = parsePart(parts[1]);
    if (header.alg !== "RS256" || header.typ !== "JWT" || typeof header.kid !== "string" || header.kid.length > 128) return false;
    if (header.jku || header.jwk || header.x5u || header.crit || header.b64 !== undefined) return false;
    const nowMs = options.now ?? Date.now();
    const now = Math.floor(nowMs / 1000);
    if (![claims.exp, claims.iat, claims.nbf].every(Number.isInteger)) return false;
    if (claims.exp <= now || claims.iat > now + 30 || claims.nbf > now + 30 || claims.iat < now - 600) return false;
    if (claims.exp - claims.iat > 600 || claims.exp <= claims.iat) return false;
    if (claims.iss !== ISSUER || claims.aud !== EXPORT_AUDIENCE || !SUBJECTS.has(claims.sub)) return false;
    if (claims.repository !== REPOSITORY || String(claims.repository_id) !== REPOSITORY_ID || String(claims.repository_owner_id) !== OWNER_ID) return false;
    if (claims.repository_visibility !== "private" || claims.ref !== "refs/heads/main" || claims.ref_type !== "branch") return false;
    if (claims.workflow_ref !== WORKFLOW || !["schedule", "workflow_dispatch", "repository_dispatch", "push"].includes(claims.event_name)) return false;
    // The report workflow is not reusable. A different called workflow cannot inherit access.
    if (claims.job_workflow_ref && claims.job_workflow_ref !== WORKFLOW) return false;
    if (!/^[0-9a-f]{40}$/.test(claims.workflow_sha || "") || !/^[0-9]+$/.test(String(claims.run_id || ""))) return false;

    const fetcher = options.fetcher || fetch;
    const useCache = options.useCache ?? !options.fetcher;
    let keys = await getKeys(nowMs, fetcher, useCache);
    // Accommodate GitHub key rotation without making arbitrary kid values an
    // unbounded network trigger. A fresh set is authoritative for one minute.
    if (useCache && !keys.some((key) => key.kid === header.kid)
        && nowMs - cachedAt >= 60000 && nowMs - lastUnknownKeyRefresh >= 60000) {
      lastUnknownKeyRefresh = nowMs;
      keys = await getKeys(nowMs, fetcher, true, true);
    }
    const candidates = keys.filter((key) => key.kid === header.kid && key.kty === "RSA" && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
    if (candidates.length !== 1) return false;
    const jwk = candidates[0];
    if (decodePart(jwk.n).length < 256 || decodePart(jwk.n).length > 512 || jwk.d) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodePart(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch {
    // Do not log the token, headers, raw URL or the error's potentially sensitive text.
    return false;
  }
}
