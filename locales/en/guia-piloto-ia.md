---
title: "Define an AI pilot you can evaluate"
seo_title: "AI Pilot Brief: Evaluate Value, Cost and Risks"
description: "A practical brief for an AI use case at work: define the task, compare it with today's process, and decide whether to continue using results, cost and operating limits."
date: 2026-11-11
keywords: AI pilot, evaluate AI project, AI use case, AI pilot template, AI cost, AI evaluation
---

# Define an AI pilot you can evaluate

Before choosing a model, identify a task your team needs to complete. This free brief brings together the evidence you will need to decide whether to continue: results, human review, cost and limits on actions.

**Who it is for:** professionals applying AI in operations, product or knowledge work. You can start without writing code. The linked tools let you explore the technical assumptions further.

[Go to the copyable template](#template) · [See an example](#example)

## 1. Choose a task and a comparison

Describe one unit of work with a recognizable input and output. “Draft a response to a request using approved documentation” can be tested. “Improve productivity with AI” still needs a more precise task.

Record how the task is completed today: working and review time, observed errors and actual volume. Keep the same task definition when comparing the pilot with that process. Include review and corrections of the AI output in the comparison.

## 2. Write down what you would accept and what would stop the pilot

| Decision | What to record |
|---|---|
| Useful result | What the output must contain and who can check it. |
| Evidence | Which documents or data it may use and how claims will be checked. |
| Limits | Which data it may access, which actions it may take and which require confirmation. |
| Critical failures | Which outputs or actions require stopping or redesigning the test. |
| Budget | How much human work, response time and spending the task allows. |

Prepare representative examples and difficult cases before testing. Include what the system should do when information is missing or a tool fails. A correct result obtained through an unauthorized action should count as a failure. The [agent evaluation guide](series/agentes-ia/03-como-evaluar-un-agente.md) explains why tool use and permissions need to be reviewed alongside the result.

## 3. Check assumptions with the tools

- **Cost and response time:** use the [cost and latency calculator](tools/llm-cost-latency.md) with your volume and input/output length. Keep the assumptions. Model cost is only one part: add integration, operation and human review to the pilot estimate.
- **Reliability:** explore [agent evaluation](tools/agent-reliability-eval.md) if the task chains steps or tools. Its scenarios illustrate relationships, rather than certifying your system.
- **Data and actions:** work through the [prompt injection threat model](tools/prompt-injection-threat.md) if the system reads external content. Prompt instructions do not replace system permission controls.

A calculation helps guide the design. The decision needs results from your task, using permitted data and your operating conditions.

## Template

Use the block's copy button and complete the brief in your own document. You do not need to enter work data on this page.

```text
AI PILOT BRIEF

Owner and review date:
Specific task, user and expected result:
Permitted input and output to be reviewed:

CURRENT PROCESS
Working and review time per task:
Volume and observed errors:

TEST
Representative examples and difficult cases:
Acceptance criterion and person checking it:
Authorized data, tools and actions:
Human confirmations and critical failures:
Expected response to missing information or errors:

RESULTS AND DECISION
Observed results, errors and evidence:
Time, human review/correction and total cost:
Assumptions still to be checked:
Decision: continue / redesign / stop
Reason, owner and next review:
```

## Example

**Hypothetical case: draft replies to internal requests.** The pilot consults an approved collection of procedures and proposes a reply with references. A person reviews every draft before sending it. The system cannot send messages or change records.

The test checks that replies agree with the documents, references support the claims, and the system flags missing information. A malicious instruction inside a document should be among the difficult cases. Record total time, corrections and errors to compare against the current process. No savings are assumed before measurement.

## Decide using what you observed

**Continue** when the evidence meets the agreed criteria. **Redesign** when a specific limitation can be corrected and retested. **Stop** when observed value does not justify the cost or critical failures remain unresolved. Define those criteria before the pilot and retain the results supporting the decision.

To develop the brief further: [what to evaluate in an AI system](series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria.md), [agent evaluation](series/agentes-ia/03-como-evaluar-un-agente.md) and [permissions outside the prompt](series/agentes-ia/04-seguridad-agentes.md).

What would help you apply this brief with your team? Share a question or suggestion through the [5sigmas contact page](meta/about.md). Avoid including confidential data.
