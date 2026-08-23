---
title: "The anatomy of an agent: tools, memory, and state"
description: "How an AI agent works internally: context, planning, tools, memory, state, and runtime. A tool call is a contract, not magic."
date: 2026-07-14
date_modified: 2026-08-23
keywords: "AI agent anatomy, tools, tool calling, agent memory, runtime state, MCP, ReAct"
tags:
  - AI
  - Agents
  - Architecture
  - Tool Calling
---

# Chapter 2 — The anatomy of an agent

In the previous chapter, we defined an agent as a system that decides a sequence of actions inside an environment. Now we can open that system and separate its parts. This matters because many failures attributed to the model actually come from an ambiguous runtime, a poorly defined tool, or operational state mixed into the conversation.

## The minimal loop

The simplest pattern has four steps:

1. **Observe:** receive the objective, context, and current state.
2. **Plan:** decide whether to answer, request information, call a tool, or stop.
3. **Act:** execute the call with validated arguments.
4. **Verify:** interpret the result and decide whether the task is complete or another step is needed.

In practice there is a fifth cross-cutting component: **policy**. Policy determines which tools are available, which actions require confirmation, how many steps are allowed, and what happens when the evidence is insufficient.

{{ include_html("snippets/agentes-ia/01-bucle-agente.html") }}

## Tool calling: from text to a contract

A tool should not be presented to the model as a vague sentence such as “you can query the system.” It needs an explicit contract:

- a stable name
- a description of when to use it and when not to
- an argument schema
- type and range validation
- read or write permissions
- timeout and retry policy
- a clear representation of success, error, and partial results

If a `send_email` tool accepts an ambiguous recipient, the model may fill the argument with a plausible inference. The problem is not only that the LLM can be wrong: the system has designed a dangerous boundary. A good tool contract makes illegal states difficult to express.

The Model Context Protocol formalizes part of the interface between agent clients and tool servers. Its authorization specification distinguishes, among other cases, calls made on behalf of a person from application-to-application calls. That distinction is fundamental: “the agent can inspect inventory” does not automatically mean “the agent can purchase.” This series points to the current protocol specification rather than a historical snapshot.

## Context, memory, and state are not the same thing

### Context window

This is the information the model receives in the current turn: instructions, messages, tool results, documents, and runtime signals. It has a finite size and should be treated as a working view, not as a database. The [context budget planner](/en/tools/context-budget/) lets you allocate that window across instructions, tool schemas, history, RAG, the current user message, reserved output, and safety headroom before context pressure appears.

### Memory

This is information retained across turns or sessions: preferences, confirmed facts, summaries, or vector representations. Memory should not be trusted by default; it needs rules for writing, expiration, correction, and deletion.

### Operational state

This describes what the system is doing: in-flight operations, retries, pending results, locks, idempotency identifiers, and events. This state belongs to the runtime. It should not be dumped unfiltered into visible conversation history because it can confuse both the user and the model.

The distinction becomes critical when a tool is slow. The user may continue the conversation while an external operation is still alive. If the runtime treats everything as a message, the model cannot reliably distinguish whether an operation was requested, accepted, executed, or actually completed. The [agent reliability and evaluation playground](/en/tools/agent-reliability-eval/) turns retries, timeouts, tool decisions, and trajectory efficiency into separate signals instead of reducing the whole run to its final answer.

## The agent as a state machine

A typical request may pass through:

`requested → accepted → running → succeeded`

or:

`requested → accepted → running → retrying → failed`

User-facing language must reflect that state machine. “The operation has started” can describe `accepted`; “the operation has finished” is only correct in `succeeded`. Accurate status should not depend on the model being cautious; it should depend on the runtime exposing states the model can report without inventing completion.

The Reactive/Proactive Agent pattern used by 5sigmas applies this separation: visible conversation, operations, pending updates, locks, and traces live in different structures. It addresses a recurring problem: accepting work now and closing it only once an external result exists, without blocking the chat or emitting partial messages as if they were final.

## Memory is not a universal solution

Adding a vector database does not turn a system into an agent. Retrieval can help find documentation, but the system must still decide:

- what query to run
- which documents are trustworthy
- how evidence is cited
- what to do with conflicting results
- when retrieval has not returned enough information

Memory can also increase the attack surface. If an agent writes a malicious instruction into memory and later retrieves it as trusted context, the problem has not disappeared—it has become persistent. The [prompt-injection threat explorer](/en/tools/prompt-injection-threat/) helps reason about exactly those trust boundaries, instruction provenance, and the combination of untrusted data with agent capabilities.

## What to remember

- The loop is a decision architecture, not a marketing animation.
- Tools are software contracts with permissions, validation, and states.
- Context, memory, and operational state should remain separate.
- A task can remain alive after the visible conversation turn ends.
- MCP helps standardize connections, but does not decide which authorization is safe.

## References

- [Yao et al. (2022) — ReAct](https://arxiv.org/abs/2210.03629)
- [Schick et al. (2023) — Toolformer](https://arxiv.org/abs/2302.04761)
- [Model Context Protocol — current authorization specification](https://modelcontextprotocol.io/specification/latest/basic/authorization)
- [Reactive / Proactive Agent — technical article](/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/)
- [OpenAI Agents SDK — documentation](https://openai.github.io/openai-agents-python/)
