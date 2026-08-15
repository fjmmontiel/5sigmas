---
title: "What is an AI agent?"
seo_title: "What is an AI agent: how it works and how it differs from a chatbot"
description: "What an AI agent is, how it uses tools, memory and state, how it differs from a chatbot or workflow, and what it needs to operate reliably."
keywords: "AI agent, AI agents, agentic AI, chatbot vs agent, tool calling, agent memory, production AI agents"
date: 2026-08-09
date_modified: 2026-08-15
---

# What is an AI agent?

An **AI agent** is a system that receives an objective, decides which actions are needed to move toward it, can execute those actions through tools, and uses the results to decide the next step. A language model may propose an action, but the complete agent also includes the runtime, tools, state, permissions and the logic that decides when to stop.

The essential distinction is this: **a chatbot generates a response; an agent can change the state of another system**.

## The 60-second answer

{{ include_html("snippets/agentes-ia/01-bucle-agente.html") }}

A tool call does not grant authority by itself. The fact that the model emits `send_email(...)` does not mean the system should execute it. The runtime must validate arguments, permissions, risk and state before producing an external effect.

## Chatbot, workflow, copilot and agent

| System | Who decides the steps | Can act | Example |
|---|---|---:|---|
| **Chatbot** | Conversational flow | Usually no | Answer a question |
| **Workflow** | Deterministic code | Yes | Retrieve data → validate → save |
| **Copilot** | Model proposes; human approves | With approval | Prepare SQL or a code change |
| **Bounded agent** | Model chooses among allowed actions | Yes, within limits | Query, compare, retry and update a record |

A workflow is not inferior because it is deterministic. If the steps are already known, it is usually easier to test, explain and constrain. Agency adds value when the sequence depends on the environment and encoding every branch in advance is not worth the complexity.

## The components of an agent

A reliable agent needs more than a prompt and several functions:

1. **Objective** — what successful completion means.
2. **Context** — what information it may use in the current turn.
3. **Tools** — which actions exist and what their contracts are.
4. **State** — which operations are pending, completed or failed.
5. **Memory** — what information may persist between sessions and with what provenance.
6. **Policy** — what requires authorization, what is forbidden and what budget exists.
7. **Verification** — how the system proves that the result is correct.

{{ include_html("snippets/temas/agent-system-boundary.html") }}

The [AI Agents — from responding to acting](/en/series/agentes-ia/00_presentacion_serie/) series develops these components through five progressive chapters.

## Tool calling is not the same as agency

An LLM can produce structured arguments for a function. That is **tool calling**. Agency appears when the system can decide *when* to use a tool, interpret its result and choose what to do next.

A tool should remain a software contract. The model proposes a call; the runtime keeps the authority boundary and decides whether it may execute.

{{ include_html("snippets/temas/agent-tool-gate.html") }}

## Memory, context and state are different things

- **Context:** information visible to the model now.
- **Memory:** information preserved and retrievable later.
- **Operational state:** what is actually happening in a task: attempts, locks, pending operations and results.

Mixing these layers creates failures that are difficult to debug. A conversation may say that an action was requested while the runtime knows it is still executing. Operational state should be the source of truth for what actually happened.

## How to evaluate an agent

A convincing final answer is not enough. You need to measure the **complete task**:

- did it reach the objective?
- did it use the correct tools?
- did it respect permissions?
- how many steps, tokens and retries did it need?
- what happened when a tool failed?
- did it abstain when data or authorization was missing?
- did it leave the system in a recoverable state?

[How to evaluate an AI agent](/en/series/agentes-ia/03-como-evaluar-un-agente/) develops a gate architecture for outcome, trajectory, safety and operational economics.

## Why security changes when the system can act

A chatbot that misinterprets a document may produce a wrong answer. An agent with broad permissions can turn the same misinterpretation into an external action.

Security therefore has to live outside the prompt as well: least privilege, per-operation authorization, isolation, human approval for sensitive actions, observability and an external path to stop execution.

The [AI Security](/en/series/seguridad-ia/00_presentacion_serie/) series covers prompt injection, jailbreaks, poisoned memory, red teaming and production controls.

## When using an agent makes sense

Agency is useful when:

- the objective is clear but the sequence changes depending on what happens;
- several tools are available;
- intermediate results determine the next step;
- the system can verify progress and outcome;
- permissions and cost can be bounded.

A conventional workflow may be better when the path is known, the error budget is tiny or a deterministic function solves the problem with less risk surface.

## Where to go deeper in 5sigmas

- [What is an agent and what is not?](/en/series/agentes-ia/01-que-es-un-agente/)
- [Agent anatomy: tools, memory and state](/en/series/agentes-ia/02-anatomia-de-un-agente/)
- [How to evaluate an agent](/en/series/agentes-ia/03-como-evaluar-un-agente/)
- [Agent security](/en/series/agentes-ia/04-seguridad-agentes/)
- [From demo to production](/en/series/agentes-ia/05-de-la-demo-a-produccion/)
- [Proactive and reactive agents and tool calls](/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/)

## Frequently asked questions

### Is ChatGPT an AI agent?

It depends on the capability being used. A chat interface that only generates text behaves as a conversational assistant. A system that can choose tools, operate on external resources and continue from their results includes agentic behaviour. The label should describe the real system, not only the model it uses.

### Is RAG an agent?

Not necessarily. Retrieving documents and passing them to a model can be a deterministic workflow. It becomes part of an agent when the system can decide when to search, which source to query and what to do next with the result.

### Does an agent require multiple models?

No. One model can coordinate multiple tools. Multi-agent systems are one possible architecture, not a requirement.

### Does more autonomy mean a better agent?

No. In production, bounded autonomy usually matters more: minimal tools, budgets, verification and a clear stopping criterion.

## Primary sources

- [Yao et al. — ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [OpenAI Agents SDK — Agents](https://openai.github.io/openai-agents-python/agents/)
- [OpenAI Agents SDK — Tool guardrails](https://openai.github.io/openai-agents-python/guardrails/)
- [Model Context Protocol — Authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization)
