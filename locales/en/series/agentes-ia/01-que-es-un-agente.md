---
title: "What an AI agent is—and is not"
description: "The difference between a chatbot, workflow, copilot, and agent. An agent is not just an LLM with tools: it is a system that decides actions within explicit boundaries."
date: 2026-07-14
keywords: "what is an AI agent, agentic AI, chatbot vs agent, workflow, tool calling, ReAct"
tags:
  - AI
  - Agents
  - Tool Calling
---

# Chapter 1 — What an AI agent is—and is not

The word *agent* has become a label for almost any application that uses a language model. An assistant that drafts an email, a workflow with three APIs, and a system that chooses steps dynamically can all be described with the same word. That ambiguity is the first problem to solve.

In this series we use an operational definition: **an agent is a system that receives an objective, decides which actions are needed to move toward it, executes those actions in an environment, and uses the results to decide the next step**. The model may be the component that proposes an action, but the agent also includes the runtime, tools, state, and policies that constrain execution.

{{ include_html("snippets/agentes-ia/01-bucle-agente.html") }}

## A scale of autonomy

### 1. Direct response

The user asks a question and the model generates an output. The system may retrieve information first, but the work sequence is fixed outside the model. A ticket classifier or a function that summarizes a document normally belongs here.

### 2. Deterministic workflow

The system chains known steps: retrieve documents, call a model, validate JSON, and store the result. It can be complex and valuable without being an agent. Its advantage is that the path is visible, testable, and relatively easy to constrain.

### 3. Copilot with approval

The model proposes an action and a person decides whether it executes. The system can prepare SQL, a support reply, or a code change while keeping the final consequential step under human control.

### 4. Bounded agent

The system can choose among tools, retry, decompose a task, and inspect results. Its autonomy is bounded by an objective, a set of tools, and a permissions policy. This is usually the most useful production meaning of *agent*.

### 5. Open-ended autonomy

The system receives a broad goal and can discover new plans, tools, and subgoals over a long period. It is compelling in a demo and much harder to evaluate, secure, and operate. It should not be confused with the normal production case.

## The model is not the whole agent

An LLM computes a next action or response from the context it receives. By itself it does not maintain a reliable database of operations, possess natural authority over an API, or know whether an external action actually completed unless the runtime tells it.

The agent appears when the model is surrounded by a contract:

- **Objective:** what completing the task means.
- **Context:** which information it may read and for how long.
- **Tools:** which actions are available and with which arguments.
- **State:** which operations are pending, complete, or failed.
- **Policy:** what requires approval, what is forbidden, and when to stop.
- **Verification:** how the system checks that the result is correct.

ReAct popularized the pattern of interleaving reasoning and action: decide what is needed, act, and observe the result. Toolformer explored how a model can learn when invoking tools improves its output. Neither removes the engineering problem of deciding which tools exist, what permissions they have, and how each result is verified.

## Agency does not mean unlimited freedom

Useful autonomy is local. An agent may be autonomous in choosing among `search_customer`, `get_invoice`, and `draft_reply`, but not in granting itself new permissions, deleting data, or sending irreversible communications without confirmation.

The useful question is not “what tasks can the agent do?” but:

> Which decisions are we delegating, over which environment, with what evidence, and with what recovery path?

This avoids two opposite errors: calling every API invocation an agent and losing precision, or imagining an agent as a digital person that can solve any problem if given enough context.

## What to remember

- A chatbot produces a response; an agent decides and executes a sequence.
- A workflow can be complex without being an agent.
- The LLM is a decision component, not the whole system.
- Autonomy should be expressed as concrete permissions and boundaries.
- If you cannot describe the objective, environment, tools, and stopping condition, you do not yet have an agent contract.

## References

- [Yao et al. (2022) — ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [Schick et al. (2023) — Toolformer](https://arxiv.org/abs/2302.04761)
- [Anthropic (2026) — Trustworthy agents in practice](https://www.anthropic.com/research/trustworthy-agents)
- [NIST (2026) — AI Agent Standards Initiative](https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative)

## Frequently asked questions

**Is RAG an agent?** Not necessarily. Retrieving documents and passing them to a model is a workflow. It becomes part of an agent when the system can decide when to search, which source to consult, and what to do with the result within a broader objective.

**Does an agent need multiple models?** No. One model can use several tools. Multi-agent systems are one possible architecture, not a requirement for agency.

**Is a deterministic workflow worse?** No. When the steps are known, it is often preferable because it is easier to test, constrain, and explain. An agent adds value when the sequence depends on the situation and encoding every branch explicitly is not worthwhile.
