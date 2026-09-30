import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = process.argv[2] || process.env.S5_MCP_URL || "https://5sigmas.com/mcp";
const healthUrl = new URL("/mcp/health", endpoint);

const health = await fetch(healthUrl, { headers: { accept: "application/json" } });
assert.equal(health.status, 200, "health HTTP " + health.status);
const healthBody = await health.json();
assert.equal(healthBody.ok, true);

const client = new Client(
  { name: "5sigmas-live-verifier", version: "1.0.0" },
  { versionNegotiation: { mode: "auto" } }
);
const transport = new StreamableHTTPClientTransport(new URL(endpoint));

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, ["fetch", "search"]);
  for (const tool of tools.tools) {
    assert.equal(tool.annotations?.readOnlyHint, true, tool.name + " must be read-only");
    assert.equal(tool.annotations?.destructiveHint, false, tool.name + " must be non-destructive");
  }

  for (const query of ["prompt injection", "test-time compute"]) {
    const search = await client.callTool({ name: "search", arguments: { query } });
    assert.ok(search.structuredContent && typeof search.structuredContent === "object");
    const results = search.structuredContent.results;
    assert.ok(Array.isArray(results) && results.length > 0, "no results for " + query);
    const first = results[0];
    assert.ok(first.id && first.title);
    assert.ok(String(first.url).startsWith("https://5sigmas.com/"));

    const fetched = await client.callTool({ name: "fetch", arguments: { id: first.id } });
    assert.ok(fetched.structuredContent && typeof fetched.structuredContent === "object");
    assert.equal(fetched.structuredContent.id, first.id);
    assert.ok(String(fetched.structuredContent.url).startsWith("https://5sigmas.com/"));
    assert.ok(String(fetched.structuredContent.text).length > 200);
  }

  console.log(JSON.stringify({
    ok: true,
    endpoint,
    protocolEra: client.getProtocolEra?.() || "legacy",
    server: client.getServerVersion(),
    tools: names
  }));
} finally {
  try { await transport.terminateSession(); } catch {}
  await client.close();
}
