---
title: "How to evaluate an AI agent"
description: "Evaluating an agent requires measuring the whole task, traces, tools, cost, and recovery from failure. A convincing final answer is not enough."
date: 2026-07-14
date_modified: 2026-08-23
keywords: "AI agent evaluation, agent evals, agent benchmarks, traces, LLM as judge, task success, observability"
tags:
  - AI
  - Agents
  - Evaluation
  - Observability
---

# Chapter 3 — How to evaluate an AI agent

A chatbot can often be evaluated by comparing an answer with a reference. An agent can produce the right final answer after using the wrong tool, taking ten times as many steps as necessary, or leaving irreversible changes behind. Agent evaluation therefore has to inspect the whole task.

{{ include_html("snippets/agentes-ia/03-evaluacion.html") }}

## The unit of evaluation is a task

A useful task should specify:

- the initial state of the environment
- the user's objective
- allowed tools
- accessible data
- the success condition
- forbidden actions
- a budget for steps, time, or cost
- the expected result and abstention cases

“Answer invoice questions well” is too vague. “Given a customer and a date range, locate overdue invoices, calculate the total, and prepare a draft without sending it” is concrete enough to build reproducible cases and separate reading, calculation, and writing.

## Four dimensions worth measuring

### 1. Outcome

Did the task finish correctly? This is the most visible dimension, but not the only one. The evaluation should account for partial outcomes and distinguish “could not complete” from “completed despite insufficient data.”

### 2. Trajectory

Which steps did the agent take? Did it use the correct tool? Did it repeat calls or query irrelevant information? The trajectory can reveal that a high task score was achieved by accident or through a cost profile that will not scale.

### 3. Security and compliance

Did the agent access only authorized resources? Did it attempt a forbidden action? Did it request approval when required? A task that reaches the desired output by violating policy is not a production success.

### 4. Operational economics

How long did it take? How many tokens, calls, and retries did it consume? What happens at the 95th percentile? The mean can hide agents that perform well in simple cases and become expensive when a tool degrades.

## Benchmarks, domain cases, and judges

Public benchmarks are useful for comparing capabilities, but they do not replace your own cases. Domain rules, permissions, data, and the consequences of failure change the definition of success.

An LLM-as-judge can help evaluate open-ended text, but introduces another source of variability. When an objective condition exists, combine it with deterministic checks: a numeric result, valid JSON, an executable test, a document reference, or a concrete database mutation.

NIST is investigating *evaluation probes*: checks embedded into the workflow to inspect results and traceability. The work is still ongoing; it is not yet an established industry standard. This direction matters because it shifts evaluation from a final snapshot to the system's behavior during execution.

## The agent can also “cheat”

Once an agent has tools, the evaluation environment is no longer passive. It may find hints it was not supposed to use, modify task state in a way that fools the verifier, or exploit affordances the benchmark designer did not anticipate. NIST has documented this class of problem and recommends making allowed capabilities explicit and inspecting traces.

At minimum, an evaluation should record:

```text
task_id → objective → tools → arguments → results → state → verdict
```

If you store only the final answer, you do not have a reproducible agent evaluation; you have a collection of demos.

## Designing a trust gate

Before deployment, a task should pass several gates:

1. **Correctness:** the result satisfies the criterion.
2. **Traceability:** the evidence and tools used are visible.
3. **Permissions:** no out-of-scope actions occurred.
4. **Cost:** execution remains within budget.
5. **Recovery:** on failure, the system retries safely or stops.
6. **Abstention:** without sufficient data or authorization, it does not improvise.

This changes the question from “what percentage does it get right?” to “under which conditions can I trust it to complete this task?”

The [agent reliability and evaluation playground](/en/tools/agent-reliability-eval/) turns that gate into a reproducible scenario and keeps final success, first-pass success, retry recovery, tool decisions, timeouts and trajectory efficiency as separate signals.

## What to remember

- Agent evaluation starts with a reproducible task, not a polished answer.
- Measure outcome, trajectory, security, and operational economics.
- Public benchmarks help, but your environment determines the real risk.
- Automated judges need deterministic checks and trace inspection where possible.
- An agent that reaches the target by violating permissions has not succeeded.

## References

- [NIST — Building Evaluation Probes into Agentic AI](https://www.nist.gov/programs-projects/building-evaluation-probes-agentic-ai) — ongoing research
- [NIST — Cheating On AI Agent Evaluations](https://www.nist.gov/caisi/cheating-ai-agent-evaluations)
- [NIST — Guidelines for automated benchmark evaluations](https://www.nist.gov/caisi/guidelines)
- [Stanford HAI — AI Index 2026](https://hai.stanford.edu/ai-index/2026-ai-index-report)
