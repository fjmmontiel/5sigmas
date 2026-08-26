# 5sigmas

**An evidence-backed AI engineering knowledge system for humans and agents.**

Live site: https://5sigmas.com

5sigmas combines technical learning series, engineering notes, concepts, original visuals and animations, videos, cited evidence, and deterministic interactive AI-engineering tools in Spanish and English.

During the OpenAI WebMCP Challenge, 5sigmas was meaningfully extended so an agent can use that same deployed knowledge directly from the live website instead of reconstructing it from DOM scraping.

## WebMCP challenge extension

The WebMCP work was added after the challenge opened on August 25, 2026. The relevant production milestones are:

- `755b5b6bd584c72faa1fad7440d6a21f03b7a402` — first site-wide WebMCP tool discovery, library search, page context, and executable tool-page adapters.
- `32165c6b5245b812d5a9a06c62b1a99a2e36e2a1` — full bilingual deployed knowledge graph covering pages, concepts, series, engineering notes, tools, meaningful images, SVGs, animations, videos, and cited evidence.
- `b3022d64d096f80a3873753a044b85266333d9ff` — public-boundary hardening that prevents repository paths, commits, branches, GitHub-family URLs, and implementation metadata from entering the WebMCP surface.

The live site now registers read-only site-wide WebMCP tools through `document.modelContext.registerTool(...)`:

- `5sigmas_search_knowledge`
- `5sigmas_get_knowledge_item`
- `5sigmas_get_topic_bundle`
- `5sigmas_search_visuals`
- `5sigmas_get_evidence`
- `5sigmas_knowledge_stats`
- `5sigmas_discover_tools`
- `5sigmas_search_library`
- `5sigmas_page_context`

Interactive tool pages additionally register executable functions such as `5sigmas_run_agent_reliability_eval` using the existing deterministic UI logic rather than duplicating the calculations.

## Why WebMCP matters here

Before WebMCP, an agent visiting a technical knowledge site generally had to infer structure from navigation, text, DOM elements, and interactive controls. That is fragile for a site like 5sigmas, where one topic can span a concept explanation, a multi-part learning series, diagrams, animations, videos, interactive evaluators, and primary evidence.

With WebMCP, a user can stay on the same live 5sigmas page while the agent can:

1. search the complete deployed knowledge system for a technical problem;
2. assemble a cross-format topic bundle;
3. retrieve a specific explanation in clean Markdown;
4. discover the relevant diagrams, animations and videos;
5. retrieve the sources cited by the site; and
6. navigate to an interactive evaluator and execute it with explicit assumptions.

The human gets the visual, explorable website. The agent gets a structured interface to the same public knowledge.

## Knowledge graph

The graph is generated automatically from the pages MkDocs actually renders. It does not rely on a manually maintained submission-only catalog.

For each locale, the build emits:

- `/agent/knowledge.json`
- `/en/agent/knowledge.json`

It indexes page-level knowledge and first-class child objects for meaningful visual/video assets and cited evidence, while retaining parent relationships and clean Markdown mirrors.

The agent-facing graph deliberately excludes repository metadata and GitHub-family URLs. GitHub is an implementation and submission channel; it is not part of the public 5sigmas WebMCP knowledge contract.

## Interactive AI-engineering tools

5sigmas currently includes 18 deterministic tools covering areas such as:

- LLM cost and latency
- model price/performance
- inference VRAM
- KV cache and context
- Transformer attention
- context budgets
- RAG retrieval and evaluation
- voice-agent latency and capacity
- agent reliability and evaluation
- prompt-injection threats
- benchmark reliability
- scaling laws
- training compute and energy
- datacenter AI capacity
- global AI ecosystem analysis

## Recommended judge demo

Open the live English site in ChatGPT's in-app browser with WebMCP support:

1. Visit `https://5sigmas.com/en/`.
2. Ask the agent to use 5sigmas site tools to teach **prompt injection** using the site's own concepts, learning material, visuals, videos and evidence.
3. Have the agent execute `5sigmas_get_topic_bundle` and follow one returned visual or source.
4. Navigate to `https://5sigmas.com/en/tools/agent-reliability-eval/`.
5. Ask the agent to run the reliability evaluator with a changed traffic assumption and explain the rendered result.

This demonstrates both halves of the implementation: structured retrieval over the full deployed knowledge base and direct execution of live page functionality.

## Build locally

Requirements: Python 3 and Node.js for the validation scripts.

```bash
python -m pip install -r requirements.txt
mkdocs build --clean --strict
python scripts/audit_multilingual_search_foundation.py

python scripts/prepare_locale.py --locale en
S5_LOCALE=en mkdocs build -f mkdocs.en.yml --clean --strict
```

Run the WebMCP source and browser contract:

```bash
node scripts/test_agent_reliability_tool.mjs

python -m http.server 8000 --directory site
# In another shell after Playwright is available:
S5_PREVIEW_BASE=http://127.0.0.1:8000 node scripts/validate_agent_reliability_tool.mjs
```

The browser test injects a WebMCP host, verifies global registration, executes knowledge search/topic/visual/retrieval calls, and runs the deterministic agent-reliability tool in both locales.

## Deployment and QA

The production GitHub Pages workflow runs strict Spanish and English builds, search/SEO audits, deployment, and live Playwright QA across representative learning series, concepts, visuals, video hubs and interactive experiences.

## Challenge submission

The complete Devpost-ready project description, demo script, judging-criteria mapping and submission checklist are in [`WEBMCP_CHALLENGE_SUBMISSION.md`](WEBMCP_CHALLENGE_SUBMISSION.md).

## License

This repository is available under the [MIT License](LICENSE).
