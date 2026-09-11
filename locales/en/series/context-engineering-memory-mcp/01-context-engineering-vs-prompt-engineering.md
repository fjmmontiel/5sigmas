---
title: "Context engineering vs prompt engineering: what enters the model, when, and why"
description: "Prompt engineering improves instructions. Context engineering decides which information, tools, history, retrieval, observations, and memory actually reach the model at each inference, with what priority and under which constraints."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "context engineering, prompt engineering, context window, agents, retrieval, memory, tool context"
tags:
  - AI
  - Agents
  - Context engineering
  - Architecture
  - LLMs
---

# Chapter 1 — Context engineering vs prompt engineering: what enters the model, when, and why

An agent may have access to a repository, twenty tools, a document store, persistent memory, and two hours of conversation history. The model **does not automatically see any of them**.

At each inference, it sees a specific, bounded representation: instructions, messages, tool definitions, retrieved data, observations, and whatever else the runtime chose to include. Everything else can exist in the application and remain invisible to the model.

That distinction separates two related but different engineering problems:

- **Prompt engineering** focuses mainly on how instructions, examples, and inputs are written and structured to steer a model response.
- **Context engineering** focuses on the system that decides **which information enters an inference, when it enters, in what representation, with what priority, provenance, freshness, and cost**, and which information stays out.

Anthropic makes the distinction explicitly: prompt engineering concerns writing and organizing instructions, while context engineering covers curating and maintaining the information available to the model, including system instructions, tools, external data, and message history.[^anthropic-context]

The useful shift is not replacing one fashionable term with another. It is changing the design question from “how should I word this prompt?” to **“what state must the model observe to make the next decision well?”**

{{ include_html("snippets/articulos-tecnicos/context-engineering-assembly-loop.html") }}

## First, what does “context” mean here?

The word *context* is overloaded. In this chapter, it means the **effective input available to one specific inference**.

We can represent turn `t` as:

\[
C_t = A(I, U_t, H_t, T_t, R_t, O_t, M_t \mid P_t, B_t)
\]

\[
y_t \sim p_\theta(\cdot \mid C_t)
\]

where:

- `I` is the system or application instructions that are stable or relatively stable.
- `U_t` is the current user request or input.
- `H_t` is conversation history or a compacted representation of it.
- `T_t` is the set of tools, schemas, skills, or capabilities exposed for this turn.
- `R_t` is information retrieved from documents, databases, the web, repositories, or other sources.
- `O_t` is observations from earlier actions: tool results, errors, diffs, stdout, or API responses.
- `M_t` is persistent memory or state retrieved for the turn.
- `P_t` is the policy for selection, priority, trust, permissions, and composition.
- `B_t` represents practical constraints: context-window capacity, latency, cost, and product limits.
- `A(·)` is the assembly process.
- `C_t` is the context that actually reaches the model.
- `y_t` is the model output conditioned on that context.

Providers do not serialize these pieces in the same way, and multimodal systems may transform parts of the input into model-specific representations rather than literal text tokens. The equations are not a claim about a universal wire format. They describe a system boundary: **the application can own a large amount of state, while the model conditions its next output on what the runtime assembled for this inference**.

OpenAI documents the same separation in the Responses API. Before inference, the service assembles model context from the user prompt, prior conversation state, and tool instructions; when a skill is relevant, skill metadata and its container path can be added to model context before the next model call.[^openai-responses-environment]

## Prompt engineering is one part of the problem

Prompt engineering still matters. Ambiguous, contradictory, or excessively prescriptive instructions can degrade behavior even when the rest of the system is sound.

Consider this application:

```text
system:
  "Answer using the current returns policy. Cite the source."

user:
  "Can I return an opened laptop after 20 days?"
```

We could spend hours refining that wording. If the runtime retrieves a 2024 policy after the policy changed yesterday, the primary failure is not prompting.

The same is true when:

- the correct document is retrieved but truncated just before the relevant exception;
- the agent has 80 overlapping tools and loads every tool definition on every turn;
- history preserves a decision that a later tool observation has already invalidated;
- stale memory conflicts with the current source and the system has no precedence rule;
- a 15,000-line tool result pushes the governing constraint out of the useful context;
- the application has access to the right information but never retrieves it.

None of those failures is guaranteed to disappear because we write a better sentence.

A useful relationship is therefore:

```text
prompt engineering
    ⊂
context engineering
```

That does not make prompt engineering trivial. It means instructions and examples are **only some of the sources** that may become part of `C_t`.

## Context is a snapshot, not the full application state

This distinction prevents a particularly dangerous mistake in agent systems: treating “the system knows X” as equivalent to “the model can use X now.”

Suppose an application owns:

```text
Repository:        420,000 lines
Documentation:     3,200 pages
History:           900 messages
Durable memory:    18,000 records
Available tools:   64
Runtime state:     processes, files, DB, external APIs
```

That is the **universe of potentially useful information**. It is not the inference context.

For one task, the runtime might assemble:

```text
- task and safety instructions
- current user message
- summary of 12 earlier turns
- 4 tool schemas
- 3 relevant files
- current diff
- latest test result
- 2 verified memories
```

The second set is much smaller, yet it can be far more useful.

Anthropic frames the objective as finding a small set of high-signal tokens that maximizes the chance of the desired outcome, while treating context as a finite resource.[^anthropic-context] That does not mean “fewer tokens is always better.” It means **window capacity and information utility are different variables**.

The classic *Lost in the Middle* paper showed that, for the models and tasks it evaluated, increasing context and changing the position of relevant information could substantially degrade retrieval.[^lost-in-the-middle] Long-context models have improved considerably since 2023, so that result should not be turned into a universal constant for every 2026 model. The durable methodological lesson is narrower: **supporting a larger input does not prove that irrelevant context is free or that every piece of information is used equally well regardless of position and content**.

## What a context assembler actually decides

A context assembler does not need to be a single component with that name. Its responsibilities may be split across an SDK, agent harness, retrieval backend, and application code. Conceptually, however, five decisions must be made.

### 1. Eligibility: what could enter

First define the candidate set.

It can include:

- global and task-specific instructions;
- conversation history;
- repository files or symbols;
- tool definitions;
- tool results;
- retrievable documents;
- user or task memory;
- workflow state;
- time, identity, tenant, or permission metadata.

Eligibility does not imply that a source should always be inserted.

OpenAI’s internal data agent illustrates this separation with multiple layers: table usage and metadata, human annotations, code-derived enrichment, institutional knowledge, memory, and runtime context. At query time, it retrieves relevant context rather than scanning all available information.[^openai-data-agent]

### 2. Selection: what matters now

The next question is temporal: **what does this turn need?**

A factual question about an invoice may only require the invoice, the applicable policy, and customer identity. A repository change may require repository instructions, the symbol definition, its consumers, tests, and the current diff.

Relevance can be determined with:

- deterministic rules;
- lexical search;
- embeddings;
- structured queries;
- agentic navigation with tools;
- a selector model;
- a combination of those mechanisms.

There is no universally best selector. The design depends on how dynamic the corpus is, the acceptable latency, the required precision, and the cost of missing information.

### 3. Authority and freshness: what wins when sources conflict

Context engineering is not just retrieval.

Suppose memory says:

```text
"The return window is 30 days."
```

while the current policy says:

```text
"As of 2026-09-01, the return window is 14 days."
```

Retrieving both without provenance or precedence creates a new failure mode.

The assembler needs enough metadata to distinguish at least:

- who produced the information;
- when it was produced;
- the scope for which it is valid;
- whether it is a direct observation or a summary;
- which source is normative;
- whether the information may be stale.

Chapters 3.2–3.4 go deeper into budget, provenance, memory, freshness, and conflict. The important point here is simpler: **selecting information without preserving authority can create an internally inconsistent context**.

### 4. Compression and representation: how much detail to preserve

Not everything needs to travel as raw data.

A 200-turn history can become:

- the most recent turns verbatim;
- a summary of durable decisions;
- references to external artifacts;
- recent observations without redundant raw tool output.

A 500-page document can enter as:

- selected pages;
- retrieved chunks;
- a structured table;
- a summary that preserves links back to the source.

Every transformation buys tokens, latency, or focus by accepting some risk of information loss. Aggressive compaction may erase a critical exception; keeping every byte raw can crowd out more important signals.

OpenAI’s newly documented Agents API provides automatic compaction for long sessions and tool search that loads relevant tool definitions when needed, treating them as separate context-management mechanisms.[^openai-agents-api] Those are capabilities of that specific harness. They are not intrinsic properties of the model and not requirements for every architecture.

### 5. Ordering and assembly: how information crosses the inference boundary

Two contexts containing the same facts need not behave identically if structure, ordering, duplication, or contradictory instructions differ.

Depending on the API, the assembler must decide:

- which instructions take precedence;
- where examples and evidence appear;
- how tool schemas are represented;
- which parts of history remain verbatim;
- which results are dropped or summarized;
- how untrusted data is separated from instructions;
- how stable prefixes are preserved when prompt caching matters.

Prompt engineering appears again here: **the wording and internal organization of instructions still matter**, but they now sit inside a broader assembly policy.

## When each kind of context enters

A common mistake is to imagine `C` as a static bag. In an agent loop, `C_t` evolves over time.

### Before the first turn

The initial contract often includes:

```text
instructions
+ current user input
+ initial capabilities/tools
+ context retrieved before inference
```

For a predictable task, preloading can reduce retrieval latency. For a huge information space, loading everything up front can waste context.

### During the loop

A tool call creates new observations:

```text
C₀ → model → tool call
             ↓
       observation O₀
             ↓
A(..., O₀) → C₁ → model
```

`O₀` did not exist when `C₀` was assembled. That feedback loop creates a lifecycle problem: which results should persist, which can be summarized, and which invalidate an earlier belief?

This directly connects to the previous agent-harness series. The harness owns causal continuity; context engineering decides **which parts of that continuity re-enter the model**.

### As the task grows or approaches a limit

The system can:

- compact history;
- persist notes outside the window;
- retrieve memory on demand;
- delegate to subagents with isolated contexts;
- clear tool output that has already been consumed;
- preserve references instead of full content.

Anthropic documents compaction, structured note-taking, and subagents as distinct techniques for work that extends beyond one context window.[^anthropic-context] They are not interchangeable: each preserves and loses different information.

## Preload vs just-in-time is an architectural trade-off

The two extremes are easy to understand.

### Preload

Load information up front because it is likely to be needed.

Benefits:

- fewer retrieval round trips;
- immediate availability;
- simpler reproducibility when the package is versioned.

Costs:

- larger context;
- more potentially irrelevant information;
- more staleness risk if the preloaded package ages;
- higher input cost when effective caching is unavailable.

### Just-in-time

Keep references and retrieve detail only when the task requires it.

Benefits:

- tighter budget control;
- fresher data;
- the agent can refine search based on intermediate observations.

Costs:

- additional latency and tool calls;
- more retrieval failure modes;
- the agent may not know what it needs to look for;
- weaker reproducibility when an external source changes.

Anthropic describes a hybrid strategy in Claude Code: some information enters up front, while primitives such as glob and grep let the agent discover additional context on demand.[^anthropic-context]

The right boundary depends on the relative cost of **loading too much** versus **failing to retrieve something critical**.

## One prompt, two different contexts

Suppose the prompt is:

```text
"Review this change and tell me whether we can deploy it."
```

### Context A

```text
- 40-line diff
- PR description
```

The model can inspect visible syntax, local logic, and style.

### Context B

```text
- 40-line diff
- PR description
- contract for the affected API
- focused tests and their output
- deployment configuration
- related prior incident
- version currently in production
- policy requiring a rollback plan for this service
```

The prompt is identical. The observable task is not.

If B produces a better answer, we have not proved that “more context always helps.” We have shown that **selected information changes the problem the model can observe**.

B can also be worse when the incident is obsolete, the tests belong to another SHA, or the policy applies to a different service. Context engineering must manage **relevance + identity + freshness**, not raw volume.

## What context engineering is not

### It is not “put more tokens in the window”

A large context window is capacity. Engineering decides how to use it.

Google, for example, exposes model-specific input/output limits and context-caching mechanisms for repeated prefixes.[^gemini-tokens][^gemini-cache] Those features affect constraints and economics. They do not decide which information is correct for a task.

### It is not synonymous with RAG

RAG is a family of mechanisms for retrieving information and adding it to an inference. It can be one part of the assembler.

Context engineering also covers history, instructions, tools, observations, memory, compaction, trust/provenance, and lifecycle.

### It is not memory

Memory answers a different question: **what information persists outside one inference and can be retrieved later?**

Context engineering decides whether a particular memory should enter now, how it is validated, and what priority it has relative to fresher sources. Chapter 3.3 separates working, episodic, semantic, and persistent state.

### It is not only a model capability

A larger model window can expand the design space, but selection, retrieval, tool exposure, compaction, provenance, and state lifecycle normally live in the runtime or application.

Keep these layers separate:

```text
model capability
≠
provider/API context management
≠
application/harness context policy
```

Blurring them attributes guarantees to the model that actually belong to the surrounding system.

## How to evaluate a context-engineering system

One good answer is not enough evidence.

A useful evaluation should version at least:

```text
(task,
 candidate sources,
 source versions,
 assembly policy,
 retrieved items,
 final context identity,
 model/config,
 output)
```

It should also distinguish different failure classes:

- **omission**: required evidence never entered;
- **pollution**: irrelevant information degraded the decision;
- **staleness**: an old version was included;
- **conflict**: incompatible sources entered without a precedence rule;
- **over-compression**: summarization removed a critical constraint;
- **tool-context bloat**: schemas or capabilities consumed too much budget;
- **history drift**: history preserved a hypothesis that later evidence invalidated;
- **provenance loss**: a fact entered without enough information about its source or valid scope.

That changes the evaluation question. Instead of asking:

> “Does the model know the answer?”

ask:

> **“Did the system assemble the right evidence for the model to decide, and can we reconstruct why that evidence was present?”**

## Production implication: context is a versioned interface

In production, context engineering should be treated as system code and data, not as magic around a prompt.

That means recording, or being able to reconstruct where security and privacy allow:

- which sources were available;
- which were selected;
- their versions and freshness;
- which transformations were applied;
- which tools were exposed;
- which policy assembled the context;
- which model/config consumed it.

This does not mean indiscriminately persisting sensitive data. Observability still has to respect privacy and security. But without some reproducible identity for the context, a failure becomes:

```text
"the agent worked yesterday and fails today"
```

With traceability, it can become:

```text
candidate source changed
→ retrieval selected a stale chunk
→ stale chunk entered Cₜ
→ verifier did not detect conflict
→ output changed
```

The second description is an engineering problem we can act on.

## What to remember

- A model does not automatically observe all application state. It responds to the effective context of each inference.
- Prompt engineering mainly optimizes instructions, examples, and their structure. Context engineering is the broader selection, assembly, and lifecycle problem for all information that can reach the model.
- `C_t` changes during a loop: tool results, retrieval, and memory can affect the next turn even though they did not exist in the previous one.
- More window capacity does not imply that more context is always better. Relevance, freshness, authority, and representation matter.
- RAG, memory, compaction, tool search, and prompt design are mechanisms inside the larger problem, not synonyms for context engineering.
- Preloading and just-in-time retrieval trade latency, cost, freshness, complexity, and omission risk.
- In production, context assembly should be evaluable and, as security and privacy permit, reconstructable.

The next chapters separate these concerns further: budgeting/prioritization/provenance, memory architectures, retrieval and conflict handling, MCP, and finally skills/plugins/subagents/hooks and evaluation.

## References

[^anthropic-context]: Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), September 29, 2025. Distinguishes prompt engineering from context engineering and documents system prompts, tools, examples, just-in-time retrieval, compaction, structured note-taking, and subagents as context-management concerns.
[^openai-responses-environment]: OpenAI, [From model to agent: Equipping the Responses API with a computer environment](https://openai.com/index/equip-responses-api-computer-environment/), March 11, 2026. Describes assembly of the user prompt, prior conversation state, and tool instructions, plus skill metadata being added to model context before a subsequent inference.
[^openai-data-agent]: OpenAI, [Inside OpenAI’s in-house data agent](https://openai.com/index/inside-our-in-house-data-agent/), January 29, 2026. Separates usage/metadata, human annotations, code-derived knowledge, institutional knowledge, memory, and runtime context, with selective retrieval at query time.
[^openai-agents-api]: OpenAI, [Introducing the Agents API](https://openai.com/index/introducing-the-agents-api/), September 10, 2026. Documents compaction, tool search, and context management as capabilities of the Codex harness served through Agents API. They are cited as one implementation, not as universal model properties.
[^lost-in-the-middle]: Nelson F. Liu et al., [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172), TACL 2023 / arXiv:2307.03172. Evaluates multi-document QA and key-value retrieval while varying context length and evidence position, finding substantial degradation for several models of that era when relevant information appears in intermediate positions.
[^gemini-tokens]: Google AI for Developers, [Understand and count tokens](https://ai.google.dev/gemini-api/docs/generate-content/tokens). Documents model-specific input/output token limits that define the available context window for Gemini API models.
[^gemini-cache]: Google AI for Developers, [Context caching](https://ai.google.dev/gemini-api/docs/caching), updated September 2, 2026. Documents implicit/explicit context caching and how shared prefixes can be reused. Caching can reduce repeated-input work and cost, but does not decide semantic relevance.