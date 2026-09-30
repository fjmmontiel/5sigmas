import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { fetchDocument, loadGraphs, searchGraphs } from "./search.js";

const SearchResult = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url()
});

const SearchOutput = z.object({
  results: z.array(SearchResult)
});

const FetchMetadata = z.object({
  locale: z.string(),
  kind: z.string(),
  description: z.string(),
  markdown_url: z.string(),
  parent_url: z.string(),
  truncated: z.boolean()
});

const FetchOutput = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string().url(),
  metadata: FetchMetadata.optional()
});

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

function jsonToolResult(value) {
  return {
    structuredContent: value,
    content: [{ type: "text", text: JSON.stringify(value) }]
  };
}

function createServer() {
  const server = new McpServer(
    {
      name: "5sigmas",
      title: "5sigmas AI Engineering Knowledge",
      version: "1.0.0",
      websiteUrl: "https://5sigmas.com"
    },
    {
      instructions:
        "Use search to find relevant public 5sigmas knowledge, then fetch an id to retrieve the clean deployed article content. Prefer the canonical URL returned by the tools when citing 5sigmas."
    }
  );

  server.registerTool(
    "search",
    {
      title: "Search 5sigmas",
      description:
        "Search the bilingual public 5sigmas AI-engineering knowledge base. Returns citable canonical 5sigmas URLs. Use fetch with a returned id for the complete clean article text.",
      inputSchema: z.object({
        query: z.string().min(1).max(1000).describe("Natural-language search query.")
      }),
      outputSchema: SearchOutput,
      annotations: READ_ONLY
    },
    async ({ query }) => {
      const graphs = await loadGraphs();
      return jsonToolResult(searchGraphs(graphs, query));
    }
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch 5sigmas content",
      description:
        "Retrieve complete clean content for one 5sigmas result id returned by search, together with its canonical citation URL and provenance metadata.",
      inputSchema: z.object({
        id: z.string().min(1).max(512).describe("Stable id returned by the search tool.")
      }),
      outputSchema: FetchOutput,
      annotations: READ_ONLY
    },
    async ({ id }) => {
      const graphs = await loadGraphs();
      return jsonToolResult(await fetchDocument(graphs, id));
    }
  );

  return server;
}

const mcpHandler = createMcpHandler(createServer);

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", "mcp-protocol-version,mcp-session-id");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/mcp/health") {
      return Response.json(
        {
          ok: true,
          service: "5sigmas-mcp",
          protocol: "MCP Streamable HTTP",
          knowledge: [
            "https://5sigmas.com/agent/knowledge.json",
            "https://5sigmas.com/en/agent/knowledge.json"
          ]
        },
        {
          headers: {
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    if (url.pathname !== "/mcp" && url.pathname !== "/mcp/") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers":
            "content-type,mcp-protocol-version,mcp-session-id,last-event-id"
        }
      });
    }

    return withCors(await mcpHandler(request, env, ctx));
  }
};
