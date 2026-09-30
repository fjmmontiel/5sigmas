import assert from "node:assert/strict";
import test from "node:test";
import { fetchDocument, normalize, searchGraphs } from "../src/search.js";

const graphs = [
  {
    locale: "es",
    graph: {
      schema_version: 2,
      items: [
        {
          id: "es-prompt",
          kind: "concept",
          title: "Qué es prompt injection",
          description: "Cómo contenido externo puede influir en un LLM.",
          url: "https://5sigmas.com/temas/prompt-injection/",
          markdown_url: "https://5sigmas.com/temas/prompt-injection/index.html.md",
          keywords: ["prompt injection", "seguridad"]
        },
        {
          id: "es-evidence",
          kind: "evidence",
          title: "External source",
          url: "https://example.com/source"
        }
      ]
    }
  },
  {
    locale: "en",
    graph: {
      schema_version: 2,
      items: [
        {
          id: "en-prompt",
          kind: "concept",
          title: "What is prompt injection",
          description: "Why untrusted content can influence an LLM.",
          url: "https://5sigmas.com/en/topics/prompt-injection/",
          markdown_url: "https://5sigmas.com/en/topics/prompt-injection/index.html.md",
          keywords: ["prompt injection", "security"]
        }
      ]
    }
  }
];

test("normalize is accent and punctuation insensitive", () => {
  assert.equal(normalize("Evaluación — IA"), "evaluacion ia");
});

test("search returns bilingual citable 5sigmas URLs only", () => {
  const output = searchGraphs(graphs, "prompt injection");
  assert.equal(output.results.length, 2);
  assert.ok(output.results.every((result) => result.url.startsWith("https://5sigmas.com/")));
  assert.ok(!output.results.some((result) => result.id === "es-evidence"));
});

test("fetch returns OpenAI-compatible content with canonical URL", async () => {
  const mockFetch = async (url) => {
    assert.equal(url, "https://5sigmas.com/temas/prompt-injection/index.html.md");
    return new Response("# Prompt injection\n\nContenido completo.", {
      status: 200,
      headers: { "content-type": "text/markdown" }
    });
  };

  const output = await fetchDocument(graphs, "es-prompt", mockFetch);
  assert.equal(output.id, "es-prompt");
  assert.equal(output.url, "https://5sigmas.com/temas/prompt-injection/");
  assert.match(output.text, /Contenido completo/);
  assert.equal(output.metadata.locale, "es");
  assert.equal(output.metadata.kind, "concept");
  assert.equal(output.metadata.truncated, false);
});
