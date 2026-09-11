---
title: "Context budgets, prioritization, compaction, and provenance: what to preserve when everything will not fit"
description: "How to separate the physical context limit from the operational budget, prioritize evidence, compact without treating summaries as ground truth, and preserve provenance for rehydration and invalidation."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "context budget, context window, compaction, provenance, context engineering, agents, LLM"
tags:
  - AI
  - Agents
  - Context engineering
  - Architecture
  - LLMs
---

# Chapter 2 — Context budgets, prioritization, compaction, and provenance

A large context window answers a capacity question: **how many tokens can the system accept for one inference under a specific API contract**. It does not answer the production question: **which information deserves to occupy that space now**.

A coding agent can have a very large context window and still fail because it carries too much stale logging, compresses a critical exception into an ambiguous summary, or retrieves a decision made against an older `HEAD` without retaining the version that decision came from.

This chapter separates four mechanisms that are often collapsed into one:

1. **context limit**: the capacity exposed by the model/API;
2. **operational budget**: how much of that capacity the application chooses to spend on input after reserving output and headroom;
3. **prioritization and compaction**: what enters verbatim, what is transformed, what is referenced, and what is dropped;
4. **provenance**: the source, version, and transformation metadata needed to explain where an item came from and when it should no longer be trusted.

Google documents context windows in tokens and exposes current input/output limits through model metadata rather than requiring developers to hard-code a number.[^google-tokens] Anthropic recommends counting tokens before a request and documents provider-specific overflow behavior.[^anthropic-window] Those are concrete API contracts, not universal behavior across every model.

{{ include_html("snippets/articulos-tecnicos/context-budget-lineage.html") }}

## The maximum context window is not your operational budget

Assume a provider exposes a total limit \(W\). An application may protect an output allowance \(O\), keep operational headroom \(M\), and reserve fixed mandatory content \(F\), such as safety instructions or tool contracts.

A useful design decomposition is:

\[
B_{\text{input}} = W - O - M
\]

\[
B_{\text{dynamic}} = B_{\text{input}} - F
\]

`B_dynamic` is not a model property. It is an **application and runtime policy**.

Headroom can absorb token-counting variation, dynamic data, changing tool schemas, or differences between a preflight count and the final request. Reserving output prevents an application from filling the entire window with input and leaving too little space to complete the task. Mandatory blocks protect policy that must not compete with a giant log for the final available tokens.

The existing 5sigmas context-budget planner lets readers explore this capacity arithmetic. This chapter tackles the next problem: **once we know how much fits, how do we decide what deserves to enter and preserve enough lineage to verify that choice later?**

## A context item needs more than text

Selection becomes easier to reason about when each candidate is represented as more than a string:

\[
z_i = (v_i, c_i, s_i, q_i, t_i, a_i, \tau_i)
\]

where:

- \(v_i\): content or value.
- \(c_i\): estimated token cost.
- \(s_i\): source.
- \(q_i\): version, commit, revision ID, or ETag when available.
- \(t_i\): observation or capture time.
- \(a_i\): applicable authority/trust.
- \(\tau_i\): transformation applied to the source, if any.

Two chunks with identical text are not necessarily equivalent if one comes from the current policy and the other from old memory. A summary that was valid yesterday may be stale today if its source changed.

**Relevance, authority, freshness, and cost are separate variables.**

## Prioritization is not sorting by similarity score

A selector can estimate the utility of candidates, but a production system also needs hard constraints.

As a design abstraction:

\[
\max_{x_i \in \{0,1\}} \sum_i x_i u_i - \lambda R(x)
\]

subject to:

\[
\sum_i x_i c_i \le B_{\text{dynamic}}
\]

plus constraints such as:

```text
policy.must_include == true
tenant == current_tenant
source.trust >= required_trust
version is compatible with current task state
```

`u_i` is not an objective property of the text. It can be estimated by deterministic rules, retrieval scores, a selector model, evaluation results, or a combination. \(R(x)\) represents set-level risk such as redundancy or contradiction.

The equation makes the decision surface explicit. **It does not claim that a framework or provider implements context engineering with this exact objective.**

### Apply constraints before relevance

A robust policy may:

1. reject content outside the tenant or task scope;
2. pin mandatory content;
3. invalidate items whose version no longer matches the task state;
4. rank the remaining evidence for the current decision;
5. choose an appropriate representation when useful evidence is too expensive.

That ordering prevents a semantically relevant fragment from displacing normative policy, or stale memory from winning merely because its embedding is closer to the query.

## What to do when useful information does not fit

There is no single operation called “reduce context.” The choices have different semantics.

| Operation | What enters \(C_t\) | What stays outside | Main risk |
| --- | --- | --- | --- |
| **Verbatim** | original content | none of that item | token cost |
| **Selection** | chosen fragments | unselected fragments | missing an exception |
| **Structured extraction** | explicit fields/facts | original representation | losing nuance outside the schema |
| **Compaction/summary** | derived representation | original detail | loss or distortion |
| **Reference + rehydration** | ID/pointer + minimal context | large content in storage | retrieval or version failure |
| **Drop** | nothing | the whole item | losing useful signal |

The right operation depends on the evidence. A security policy may require exact text. Repetitive logs can often be reduced to structured failures. A large file can remain outside the active prompt behind a stable identifier and be fetched only if a later decision needs it.

### Compaction is a transformation, not perfect memory

Anthropic documents server-side compaction as a process that summarizes older context at a configured threshold and continues from a `compaction` block; later requests drop content blocks that precede that block.[^anthropic-compaction] Its context-editing documentation separately describes selective removal of tool results or thinking blocks.[^anthropic-editing]

OpenAI documents a different mechanism in Codex and Responses: prior input is replaced with a smaller representative list, and `/responses/compact` can return an opaque `compaction` item that is passed into subsequent work.[^openai-codex-loop][^openai-compact]

The implementations differ. The architecture lesson is the same:

> after compaction, the active representation is not identical to the original history.

A summary should therefore not automatically become “the truth of the conversation.” Treat it as a **derived artifact** with provenance and an invalidation policy.

### Cache is not compaction

Google describes context caching as reusing previously processed input tokens to improve cost or performance when input is repeated.[^google-cache]

Caching can make a repeated prefix cheaper to serve. It does not logically remove that content from the active input or decide whether the content should still be present. It is an execution optimization, separate from:

- selection.
- summarization.
- externalization.
- dropping.

Calling caching “context reduction” hides the central question: **which information actually conditions the next inference?**

## Provenance: being able to walk from a representation back to its source

Provenance is more than attaching a URL.

For context engineering, a material context item should let us answer:

- what entity or source did this come from?
- which exact version did we observe?
- when was it captured?
- what transformation produced the active representation?
- was that transformation exact, extractive, or lossy?
- which change should invalidate it?
- can the application rehydrate the source when verification is needed?

W3C PROV-O defines general relationships among entities, activities, and agents, including derivation and invalidation.[^prov-o] An agent does not need RDF or PROV-O to implement good lineage. The useful discipline is conceptual: **a derived representation should remain connected to what it was derived from**.

An application manifest might look like this:

```json
{
  "context_item_id": "ctx_017",
  "kind": "summary",
  "derived_from": [
    {
      "uri": "repo://payments/refund_policy.md",
      "version": "git:4af13c2",
      "captured_at": "2026-09-11T12:03:18Z"
    }
  ],
  "transform": {
    "kind": "summary",
    "policy_version": "support-v7",
    "lossy": true
  },
  "validity": {
    "scope": "repo_head=4af13c2",
    "invalidate_on": ["source_version_change"]
  }
}
```

This is an **illustrative application schema**, not a provider standard or a serialization mandated by W3C.

## Freshness is not a timestamp

A timestamp tells us when something was observed. It does not prove that the item is still valid.

Consider a coding agent:

```text
repo HEAD       = a1b2c3
summary S       = derived from files@a1b2c3
tests T         = executed against candidate@a1b2c3
```

Then the repository advances:

```text
repo HEAD       = d4e5f6
```

Summary `S` does not instantly become false, but **its validity for the new state is no longer established**. Tests `T` also do not prove the new candidate.

The policy can:

- mark `S` as `STALE`.
- inspect which source files changed before invalidating all of it.
- rehydrate the affected sources.
- regenerate only the summary that depends on those files.
- rerun evidence scoped to the old SHA.

The same principle applies to policies, tickets, database schemas, external APIs, and user memory.

## Worked example: a coding agent under token pressure

Suppose this **purely illustrative** candidate universe; the numbers are not a provider claim or benchmark:

```text
4k   task instructions and contract
18k  relevant repository files
42k  test output and logs
35k  conversation history
16k  external documentation
12k  memories and prior decisions
```

The available dynamic budget in this illustrative scenario is 60k.

A naive strategy takes the newest items until the window is full. It can easily keep 42k of logs and evict the task specification.

An explicit policy might do this:

```text
4k   task contract                         -> VERBATIM / mandatory
18k  repository files                      -> current chunks + repo SHA
42k  logs                                  -> structured failures + raw pointer
35k  history                               -> compact summary + lineage
16k  documentation                         -> just-in-time retrieval
12k  memory                                -> only current, verified decisions
```

We have not created free tokens. We changed representations, which creates new obligations:

- test whether log extraction preserves the failure that matters.
- keep raw data available for rehydration.
- record which history the summary came from.
- invalidate artifacts tied to an old SHA.
- measure whether this policy improves task success.

## Tool search and context loading are prioritization mechanisms, not magic

OpenAI documents that Agents API can load relevant tool definitions on demand rather than placing every definition into each turn, and can manage compaction across work that spans multiple context windows.[^openai-agents-api]

That removes some plumbing within that product. It does not turn context policy into an intrinsic property of the model, and it does not remove application decisions such as:

- which tools the current user is authorized to invoke.
- which business evidence is normative.
- which results must persist outside the context window.
- which source changes invalidate a derived representation.

Keep the boundary explicit:

```text
model capability
≠
provider/API context-management capability
≠
application/harness context policy
```

## How to evaluate a context policy

“Tokens used” is not enough. A system can look efficient because it dropped the one piece of evidence the task required.

Measure at least:

- **task success** under a fixed budget policy.
- **critical-evidence omission rate**: tasks that fail because available evidence was excluded.
- **stale-context incidence**: decisions conditioned on a version no longer compatible with current state.
- **provenance coverage**: derived items with recoverable source/version/transform metadata.
- **rehydration success**: whether a reference retrieves the intended source and version.
- **compaction fidelity** on critical invariants rather than stylistic similarity.
- **context occupancy** by information class.
- selector, retrieval, and compaction latency/cost.
- robustness to ordering changes and irrelevant context.

Where possible, evaluations should freeze corpus versions, model, tools, and policy. If the provider, context limit, retrieval algorithm, and compaction strategy all change together, the result cannot tell us which change helped.

## Production implication: persist an assembly manifest

For a material inference, retain enough metadata to reconstruct the assembly decision:

```text
context_policy_version
model + API contract
candidate item IDs
included item IDs
source versions
transforms applied
drop / defer reasons
token estimates and observed usage
compaction lineage
invalidation / freshness state
```

This does not require retaining every sensitive byte forever. Retention must still satisfy security, privacy, and cost constraints. But if an important decision depends on a compacted representation and the system cannot identify the source version behind it, a critical part of the agent's audit trail is gone.

The goal is not to fill the window. It is to **give the model the smallest sufficient set for the current decision while preserving outside the window the evidence needed to verify, rehydrate, or invalidate transformed context**.

The next chapter separates durable memory from active context: what should persist across turns or sessions, how it is written and retrieved, and how memory conflicts with newer evidence.

[^anthropic-window]: Anthropic, [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows), accessed 2026-09-11.
[^anthropic-compaction]: Anthropic, [Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction), accessed 2026-09-11.
[^anthropic-editing]: Anthropic, [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing), accessed 2026-09-11.
[^openai-codex-loop]: OpenAI, [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/), accessed 2026-09-11.
[^openai-compact]: OpenAI API Reference, [Compact a response](https://developers.openai.com/api/reference/java/resources/responses/methods/compact), accessed 2026-09-11.
[^openai-agents-api]: OpenAI, [Introducing the Agents API](https://openai.com/index/introducing-the-agents-api/), September 10, 2026.
[^google-tokens]: Google AI for Developers, [Understand and count tokens](https://ai.google.dev/gemini-api/docs/tokens), updated September 4, 2026.
[^google-cache]: Google AI for Developers, [Context caching](https://ai.google.dev/gemini-api/docs/caching), updated September 2, 2026.
[^prov-o]: W3C, [PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/), W3C Recommendation, April 30, 2013.
