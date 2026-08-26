# 5sigmas — OpenAI WebMCP Challenge submission package

This file is the source of truth for the Devpost submission and demo recording.

## Submission metadata

**Project name:** 5sigmas — AI Engineering Knowledge You Can Use With an Agent

**Tagline:** One live AI-engineering knowledge system for people and agents: explanations, visuals, videos, evidence, and executable tools through WebMCP.

**Live app:** https://5sigmas.com/en/

**Recommended interactive demo page:** https://5sigmas.com/en/tools/agent-reliability-eval/

**Public code repository:** https://github.com/fjmmontiel/5sigmas

**Demo video:** REQUIRED — public YouTube URL, under 3:00, to be added after recording the native ChatGPT in-app browser demo.

**Suggested technologies/tags:** WebMCP, JavaScript, Python, MkDocs, Playwright, GitHub Pages, AI Engineering, RAG, Voice AI, AI Agents, Evaluation, Data Visualization

## Short description

5sigmas turns a bilingual AI-engineering knowledge site into an agent-native knowledge system. WebMCP lets ChatGPT use the same live website a human is looking at: search all deployed knowledge, assemble complete topic bundles, retrieve clean explanations, discover original visuals and videos, inspect cited evidence, and execute deterministic engineering tools directly on their pages.

The result is not a separate chatbot or API bolted onto the site. The human and agent share the same public knowledge, the same page state, the same interactive tools, and the same provenance.

## Why this is a strong fit for WebMCP

Technical knowledge is rarely one flat document. On 5sigmas, a topic can be distributed across a concept page, a learning series, an engineering note, diagrams, animations, videos, cited sources, and an interactive evaluator.

Without WebMCP, an agent has to infer all of that from DOM structure and navigation. It may miss relationships, misread a visualization, or attempt to manipulate controls indirectly.

WebMCP gives the site an explicit contract. 5sigmas can tell the agent what public knowledge exists, how it is related, which visual belongs to which explanation, which evidence is cited, and which deterministic tool can actually be executed. The agent can therefore help the human explore and test the material rather than merely summarize a page.

## What people and agents can do together now

A user can open 5sigmas and ask ChatGPT:

> Use 5sigmas itself to teach me prompt injection. Start with the concept, show me the strongest visual explanation, connect it to the relevant learning material and engineering guidance, and show me the evidence the site cites.

The agent can use the site's WebMCP tools to build that answer from the deployed 5sigmas knowledge graph.

The user can then move to an interactive evaluator and ask:

> Run this reliability scenario at 123,456 monthly tasks and explain what changed.

The page-specific WebMCP tool applies the assumption to the real UI, lets the existing deterministic calculator render, and returns the final scenario and outputs.

Before the WebMCP extension, those tasks required manual navigation, DOM interpretation, and direct manipulation of controls. There was no structured way for the agent to understand the whole site as one connected technical system.

## What it does

### Site-wide knowledge operations

The live site registers read-only WebMCP tools including:

- `5sigmas_search_knowledge` — search the complete deployed knowledge graph.
- `5sigmas_get_knowledge_item` — retrieve one stable knowledge object and its clean Markdown representation when applicable.
- `5sigmas_get_topic_bundle` — assemble concepts, learning material, engineering notes, tools, visuals, videos, evidence and relevant pages around one technical topic.
- `5sigmas_search_visuals` — find meaningful images, SVG diagrams, interactive animation shells and videos with their explanatory parent pages.
- `5sigmas_get_evidence` — retrieve public evidence links cited by 5sigmas.
- `5sigmas_knowledge_stats` — inspect current machine-readable coverage.
- `5sigmas_discover_tools` — discover deterministic AI-engineering calculators and explorers.
- `5sigmas_search_library` — search the current-language MkDocs knowledge index.
- `5sigmas_page_context` — retrieve structured context for the current live page.

### Executable page operations

The site's 18 deterministic interactive engineering tools additionally expose page-scoped execution tools. For example:

- `5sigmas_run_agent_reliability_eval`

The adapter discovers the live page's `data-field` controls, derives a JSON input schema, applies supplied values to the real interface, waits for the existing UI calculation, and returns the rendered outputs and gates. Calculation logic is not duplicated inside the WebMCP layer.

## How it was implemented

### 1. Build-derived bilingual knowledge graph

A MkDocs hook inspects the pages that are actually rendered during the Spanish and English builds. It emits a locale-specific graph containing:

- deployed pages;
- concepts and series chapters;
- engineering notes;
- tool pages;
- meaningful images;
- inline SVG diagrams;
- interactive animation shells;
- videos and posters;
- internal page relationships; and
- external evidence cited by the page.

This makes coverage self-maintaining: a new public object enters the agent graph when it becomes part of the deployed site.

### 2. Clean content retrieval

Page and visual objects retain a same-site clean Markdown mirror, allowing an agent to retrieve the underlying explanation without scraping the rendered navigation and layout chrome.

### 3. WebMCP runtime

The global JavaScript runtime uses `document.modelContext.registerTool(...)` and an `AbortController` lifecycle. It registers the knowledge operations on every site page. Interactive tool pages dynamically add an executable function generated from the controls currently present in the real UI.

### 4. Public knowledge boundary

The agent interface deliberately represents the deployed knowledge product, not the implementation repository. The build removes repository paths and GitHub-family URLs from the generated graph, both WebMCP runtimes defensively sanitize their responses, and CI fails if repository metadata enters the public agent contract.

### 5. End-to-end validation

CI performs strict bilingual MkDocs builds, graph validation, SEO audits, all 18 deterministic tool tests, Playwright browser checks, and an executable WebMCP test that injects a browser host, registers the tools, performs knowledge search/retrieval/topic/visual calls, and executes a live calculator in Spanish and English.

Production deployment additionally runs live browser QA across the public site.

## Meaningful extension during the challenge period

5sigmas existed before the WebMCP Challenge. The submission is specifically the WebMCP extension built after the challenge opened.

Timestamped production milestones:

- **August 25, 2026 — `755b5b6bd584c72faa1fad7440d6a21f03b7a402`**: first site-wide WebMCP discovery/search/context layer and dynamic executable adapters for interactive tools.
- **August 26, 2026 — `32165c6b5245b812d5a9a06c62b1a99a2e36e2a1`**: full bilingual knowledge graph and site-wide knowledge/visual/evidence/topic WebMCP operations.
- **August 26, 2026 — `b3022d64d096f80a3873753a044b85266333d9ff`**: hard public boundary preventing repository metadata from entering the WebMCP knowledge interface.

This commit history distinguishes the pre-existing site from the new WebMCP work required by the challenge rules.

## Judging criteria mapping

### WebMCP Leverage

The project uses WebMCP in two distinct ways rather than exposing a token demonstration function:

1. site-wide structured retrieval across heterogeneous deployed knowledge; and
2. page-specific execution of deterministic engineering applications through their existing live state.

The same browser session can move from learning and evidence retrieval into calculation and scenario testing.

### Execution

5sigmas is a deployed bilingual product, not a proof of concept. The WebMCP layer is global, build-derived, automatically updated with deployed content, production-tested, and integrated with the existing interactive user experience.

### Potential Impact

AI engineers regularly move between papers, architecture notes, calculators, diagrams, evaluation guidance, and operational assumptions. 5sigmas gives both the engineer and their agent one provenance-preserving technical environment in which those forms of knowledge are connected and executable.

### Creativity & Ambition

Most examples of agent-ready websites expose operations on one application surface. 5sigmas treats an entire technical knowledge system as agent-operable: prose, relationships, evidence, visuals, videos and deterministic interactive models are different machine-readable views of the same live learning environment.

## Testing instructions for judges

No login is required.

### Test 1 — complete topic exploration

1. Open https://5sigmas.com/en/ in ChatGPT's in-app browser.
2. Ask: **"Using 5sigmas' own site tools, build me a complete learning bundle for prompt injection. Include the strongest concept/learning material, one visual, one video if available, and the site's cited evidence."**
3. Confirm the agent uses the 5sigmas site tools rather than only reading visible page text.
4. Follow one returned 5sigmas page or visual.

### Test 2 — knowledge retrieval

Ask the agent to search 5sigmas for **agent reliability** and retrieve the clean content of one page-like result.

Expected behavior: structured search results with stable IDs, followed by a knowledge-item response containing the deployed page data and clean Markdown content.

### Test 3 — live executable tool

1. Navigate to https://5sigmas.com/en/tools/agent-reliability-eval/.
2. Ask the agent to use the page's 5sigmas tool to run the scenario with **123456 monthly tasks**.
3. Ask it to explain the resulting metrics and gates.

Expected behavior: the page-specific executable tool applies the supplied value to the real UI and returns a non-empty rendered output object with the final scenario.

## Demo video plan — target 2:35

The final submission video must be a real screen recording of the deployed site running inside ChatGPT's in-app browser. Keep the browser and 5sigmas visible throughout the functional demo.

### 0:00–0:18 — Problem and promise

**Screen:** 5sigmas English homepage.

**Narration:**

"AI engineering knowledge is fragmented across explanations, diagrams, videos, evidence and interactive tools. 5sigmas already brings those formats together for people. For the WebMCP Challenge, I made the same live knowledge system directly usable by an agent."

### 0:18–0:42 — Show site tools

**Screen:** ChatGPT in-app browser Site Tools indicator on 5sigmas.

Show the global tools, especially `5sigmas_search_knowledge`, `5sigmas_get_topic_bundle`, `5sigmas_search_visuals`, `5sigmas_get_evidence` and `5sigmas_get_knowledge_item`.

**Narration:**

"These are not remote copies of the site. The live page registers structured WebMCP tools, so ChatGPT can use the same public knowledge the user is browsing."

### 0:42–1:25 — Prompt injection topic bundle

**Prompt:**

"Use 5sigmas' site tools to build me a complete learning bundle for prompt injection. Start with the concept, include related learning or engineering material, one visual, and the evidence 5sigmas cites."

**Screen:** Show the agent invoking the topic/knowledge tools and the returned cross-format results. Open one visual/page result.

**Narration:**

"A topic is no longer one page. The agent can connect concepts, series, engineering notes, visuals, videos and evidence because the knowledge graph is generated from everything actually deployed."

### 1:25–2:12 — Execute a real engineering tool

Navigate to the Agent Reliability & Evaluation tool.

**Prompt:**

"Run this evaluator with 123,456 monthly tasks using the page's 5sigmas tool, then explain the result."

Show `5sigmas_run_agent_reliability_eval` executing and the page state/results.

**Narration:**

"Interactive pages expose an additional WebMCP function derived from their real controls. The adapter does not duplicate the calculator logic: it updates the page, lets the existing deterministic implementation run, and returns the rendered outputs."

### 2:12–2:35 — Architecture and close

**Screen:** Return to the site/visual hub or a concise architecture image if available.

**Narration:**

"The result is one evidence-backed AI-engineering environment for humans and agents. People keep the visual and interactive website. Agents gain a reliable interface to the same explanations, media, provenance and executable models. That's what I think an agent-native open web should feel like."

## Video requirements checklist

Before upload:

- Keep final runtime below **2:55**; target 2:35–2:45.
- Include spoken audio throughout.
- Show the real deployed `5sigmas.com` site.
- Show actual WebMCP/Site Tool invocation, not only slides or code.
- Do not add copyrighted music.
- Avoid unnecessary third-party logos/trademarks in added overlays or title cards.
- Upload as a **public YouTube** video.
- Test the YouTube URL in a logged-out/private browser window.

## Suggested YouTube metadata

**Title:** 5sigmas — An Agent-Native AI Engineering Knowledge System | OpenAI WebMCP Challenge

**Description:**

5sigmas is an evidence-backed AI engineering knowledge system for humans and agents. For the OpenAI WebMCP Challenge, the live bilingual site was extended with WebMCP so ChatGPT can search the complete deployed knowledge graph, retrieve explanations, discover visuals and videos, inspect cited evidence, and execute deterministic engineering tools directly on their pages.

Live demo: https://5sigmas.com/en/

The implementation uses `document.modelContext.registerTool(...)`, a build-derived bilingual knowledge graph, and page-scoped executable adapters that reuse the existing deterministic UI logic.

## Final Devpost checklist

- [ ] Join the WebMCP Challenge with the entrant's own Devpost account.
- [ ] Confirm entrant eligibility and accept the official rules personally.
- [ ] Project name entered.
- [ ] Tagline/short description entered.
- [ ] Full English project description entered.
- [ ] Live URL: `https://5sigmas.com/en/`.
- [ ] Public repository URL: `https://github.com/fjmmontiel/5sigmas`.
- [ ] Root open-source `LICENSE` visible and detected by the repository host.
- [ ] Root `README.md` contains build instructions and challenge-extension evidence.
- [ ] Public YouTube demo URL added; runtime under 3 minutes.
- [ ] Testing instructions include both topic exploration and executable-tool demo.
- [ ] Pre-existing-vs-new WebMCP work documented with dated commit evidence.
- [ ] Submission materials are in English.
- [ ] No credentials required for judges.
- [ ] No copyrighted music in demo.
- [ ] Final live site tested in ChatGPT's in-app browser after recording.
- [ ] Submit before September 3, 2026 at 1:00 p.m. PDT.

## What remains account-bound

The implementation, public deployment, open-source packaging, submission copy, testing instructions and recording script can all live in this repository.

The entrant must personally perform the Devpost registration/submission and accept the official rules. The required video must also be recorded from the actual ChatGPT in-app browser interaction and uploaded publicly to the entrant's YouTube account.
