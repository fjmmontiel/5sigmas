---
title: "From demo to production: how to operate an agent"
description: "What it takes to run an AI agent in production: budgets, retries, idempotency, observability, asynchronous work, fallbacks, and criteria for not using an agent."
date: 2026-07-14
date_modified: 2026-08-23
keywords: "production AI agents, agent observability, retries, idempotency, background tasks, agent cost, fallbacks, conversational runtime"
tags:
  - AI
  - Agents
  - Production
  - Architecture
---

# Chapter 5 — From demo to an operable system

A demo can look autonomous for two minutes. Production begins when a tool is slow, returns a `429`, changes its schema, drops the connection, or finishes after the user has kept talking. The question is no longer whether the model can call a function, but whether the system can uphold an honest operational contract when things fail.

## Budgets before promises

An agent should have explicit limits:

- maximum number of steps
- maximum calls per tool
- total execution time
- tokens or estimated cost
- maximum context size
- retry count
- actions that require approval

Without a budget, an ambiguous task can produce an expensive loop. The limit is not merely an optimization detail: it defines stopping behavior. Once a limit is reached, the agent should summarize state, request information, escalate to a person, or return a clear failure.

## Retries, idempotency, and terminal failures

Not every failure should be handled the same way. A timeout may be retryable; an invalid argument is not. A `429` calls for backoff and respect for quota limits; a business-rule rejection may need to be explained to the user.

Retries can also duplicate actions. If a payment request reaches the server but the response is lost, repeating it without an idempotency key can create two operations. Language cannot solve this: the API and runtime need a stable identity for each intent.

When retries are exhausted, the operation needs an explicit terminal state: an error, manual review, or a dead-letter queue. Leaving it “pending” without an owner is worse than failing explicitly.

## Asynchronous work and honest completion

The local Reactive/Proactive Agent runtime used by 5sigmas models a common case: the agent accepts work, the tool continues outside the visible turn, and the result arrives when the batch finishes. Conversation can continue, but the system does not claim completion prematurely.

The pattern has three rules:

1. Accepting work is not the same as promising an outcome.
2. Report completion only when the operation can actually close.
3. If the user keeps talking, return a pending result as controlled context or as a single deliberate notification.

This separation avoids duplicate messages and avoids turning visible conversation history into a database of retries, locks, and HTTP responses.

## Useful observability

Logs should make it possible to reconstruct a task without retaining secrets or unnecessary data. At minimum, record something equivalent to:

```text
task_id · session_id · tool · attempt · policy_decision · latency · outcome · delivery_mode
```

Traces do more than support debugging. They support evaluation, explain decisions, expose unstable tools, and let teams compare cost against successful task completion. A dashboard of “good responses” cannot explain why the task worked or whether the system is degrading. To turn those signals into explicit release criteria, try the [agent reliability and evaluation playground](/en/tools/agent-reliability-eval/), which separates final success, first-pass success, tool decisions, retries, timeouts, policy violations, and unnecessary steps.

## When not to use an agent

An agent is not the natural next step for every automation. Avoid one when:

- the path is known and deterministic
- the action is irreversible and cannot be verified adequately
- the data is too sensitive for the available environment
- latency or cost cannot tolerate variability
- the success criterion cannot be expressed or reviewed
- a conventional function solves the problem with a smaller risk surface

In those cases, a deterministic workflow, form, or conventional function is often better. Use an agent only for the part where uncertainty in the sequence justifies the additional cost of delegating decisions.

## Release checklist

Before deploying an agent, ask:

- What is the exact objective and success state?
- Which tools can it use and with which permissions?
- What happens when a tool is slow or fails?
- How do we prevent an irreversible action from being repeated?
- What trace is retained so the task can be reconstructed?
- When does it ask for approval or abstain?
- Which deterministic alternative would we use if the agent were not reliable enough?

The answers matter more than choosing the framework of the moment. Frameworks change; the operational contract remains.

## What to remember

- Production means handling states, failures, and consequences—not merely generating a demo.
- Every agent needs budgets, classified retries, and idempotency.
- Asynchronous tasks require one honest completion path.
- Observability should cover decisions and tools, not only final text.
- Sometimes the best architecture is not to use an agent.

## References

- [Reactive / Proactive Agent — 5sigmas runtime](/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/)
- [NIST — Agent identity and authorization](https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd)
- [NIST — AI Agent Standards Initiative](https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative)
- [Anthropic — Trustworthy agents in practice](https://www.anthropic.com/research/trustworthy-agents)
- [OpenAI Agents SDK — tracing and tools](https://openai.github.io/openai-agents-python/)