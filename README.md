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
- **August 26 semantic-navigation extension** — one build-derived relationship layer now drives crawlable internal learning paths, agent navigation, related-item graph coverage, and video key-moment discovery.

The live site registers site-wide WebMCP tools through `document.modelContext.registerTool(...)`:

- `5sigmas_search_knowledge`
- `5sigmas_get_knowledge_item`
- `5sigmas_get_topic_bundle`
- `5sigmas_search_visuals`
- `5sigmas_get_evidence`
- `5sigmas_knowledge_stats`
- `5sigmas_get_learning_path`
- `5sigmas_discover_tools`
- `5sigmas_search_library`
- `5sigmas_page_context`

The knowledge/navigation operations are read-only. Interactive tool pages additionally register executable functions such as `5sigmas_run_agent_reliability_eval` using the existing deterministic UI logic rather than duplicating the calculations.

## Why WebMCP matters here

Before WebMCP, an agent visiting a technical knowledge site generally had to infer structure from navigation, text, DOM elements, and interactive controls. That is fragile for a site like 5sigmas, where one topic can span a concept explanation, a multi-part learning series, diagrams, animations, videos, interactive evaluators, and primary evidence.

With WebMCP, a user can stay on the same live 5sigmas page while the agent can:

1. search the complete deployed knowledge system for a technical problem;
2. assemble a cross-format topic bundle;
3. retrieve a specific explanation in clean Markdown;
4. discover the relevant diagrams, animations and videos;
5. retrieve the sources cited by the site;
6. ask what to understand, read, watch or try next through a semantic learning path; and
7. navigate to an interactive evaluator and execute it with explicit assumptions.

The human gets the visual, explorable website. The agent gets a structured interface to the same public knowledge.

## One semantic relationship layer

The site does not maintain a separate SEO recommendation system and agent recommendation system. During each ES/EN build, 5sigmas derives relationships from the same public pages that are actually being deployed.

For every eligible public page it produces recommendations such as:

- **Understand the concept**
- **Read next**
- **Watch next**
- **Try it**
- **Go deeper**

Those relationships are emitted twice from the same source of truth:

1. as normal crawlable `<a href>` links in a visible learning-path block for humans and search engines;
2. as `/agent/learning-paths.json` for `5sigmas_get_learning_path` and other agent workflows.

Because the links exist in rendered HTML before the knowledge graph is extracted, they also become `related_item_ids` in the public agent graph. Build QA fails if path coverage is unexpectedly small, if recommendation density falls below the contract, or if the internal relationships do not materially appear in the knowledge graph.

The public learning-path graph is sanitized before deployment: repository paths, branch/commit metadata and GitHub-family URLs are prohibited just as they are in the main knowledge graph.

## Knowledge graph

The graph is generated automatically from the pages MkDocs actually renders. It does not rely on a manually maintained submission-only catalog.

For each locale, the build emits:

- `/agent/knowledge.json`
- `/en/agent/knowledge.json`
- `/agent/learning-paths.json`
- `/en/agent/learning-paths.json`

It indexes page-level knowledge and first-class child objects for meaningful visual/video assets and cited evidence, while retaining parent relationships and clean Markdown mirrors.

The agent-facing graph deliberately excludes repository metadata and GitHub-family URLs. GitHub is an implementation and submission channel; it is not part of the public 5sigmas WebMCP knowledge contract.

## Video indexing and key moments

Every generated watch page is a real indexable page with a prominent HTML5 video, canonical URL, `VideoObject`, thumbnail/content URLs, normal sitemap membership and a dedicated video-sitemap entry.

Key moments follow Google's two supported contracts without inventing timestamps:

- when a video has editorially reviewed `video_chapters`, the build emits explicit `Clip` nodes and clickable `?t=` moment links;
- otherwise the build emits `SeekToAction` with the working `?t={seek_to_second_number}` URL template, allowing Google to identify key moments automatically.

The same coverage is mirrored into `/videos/key-moments.json` and `/en/videos/key-moments.json`, and the video catalogues expose whether each video uses curated `Clip` moments or automatic seek discovery. This makes every current video key-moment-ready while preserving editorial accuracy.

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
3. Ask `5sigmas_get_learning_path` what to understand/watch/try next and follow one recommendation.
4. Navigate to `https://5sigmas.com/en/tools/agent-reliability-eval/`.
5. Ask the agent to run the reliability evaluator with a changed assumption and explain the rendered result.

This demonstrates three connected capabilities: structured retrieval over the full deployed knowledge base, semantic navigation through the public site, and direct execution of live page functionality.

## Build locally

Requirements: Python 3 and Node.js for the validation scripts.

```bash
python -m pip install -r requirements.txt
mkdocs build --clean --strict
python scripts/audit_multilingual_search_foundation.py

python scripts/prepare_locale.py --locale en
S5_LOCALE=en mkdocs build -f mkdocs.en.yml --clean --strict
python scripts/audit_semantic_navigation.py
```

Run the WebMCP source and browser contract:

```bash
node scripts/test_agent_reliability_tool.mjs

python -m http.server 8000 --directory site
# In another shell after Playwright is available:
S5_PREVIEW_BASE=http://127.0.0.1:8000 node scripts/validate_agent_reliability_tool.mjs
```

The browser test injects a WebMCP host, verifies global registration, executes knowledge/topic/visual/retrieval/learning-path calls, and runs the deterministic agent-reliability tool in both locales.

## Deployment and QA

The production GitHub Pages workflow runs strict Spanish and English builds, search/SEO audits, deployment, and live Playwright QA across representative learning series, concepts, visuals, video hubs and interactive experiences. The build hooks themselves enforce semantic-navigation density, public-only agent contracts, knowledge-graph related-item coverage and complete video key-moment coverage.

## Challenge submission

The complete Devpost-ready project description, demo script, judging-criteria mapping and submission checklist are in [`WEBMCP_CHALLENGE_SUBMISSION.md`](WEBMCP_CHALLENGE_SUBMISSION.md).

## License

This repository is available under the [MIT License](LICENSE).
