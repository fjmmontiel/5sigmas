---
title: Red teaming — test the complete path before the incident
description: "How to test from the document that enters the system to the action it can execute, before an incident occurs."
date: 2026-08-06
keywords: AI red teaming, security evaluation, human uplift, attack budget, AI agents, LLM benchmarks
tags:
  - AI
  - Security
  - Evaluation
  - LLMs
---

# Chapter 4 — Red teaming

A security test can be rigorous and still answer the wrong question. If the real system retrieves documents, uses tools, keeps memory and allows multiple attempts, evaluating only an isolated prompt leaves out the chain through which harm could occur.

Red teaming is useful for finding those paths before an incident does. Its value depends on whether the threat, environment, budget and rubric resemble the use case being protected.

In agentic systems, this forces a change in the unit of analysis: auditing a response is not enough. We need to audit a **trajectory**.

## The threat model comes before the benchmark

Before choosing a dataset or metric, an evaluation should define at least:

- **Asset**: which data, capability or resource needs to be protected.
- **Actor**: what the attacker can control and what information they observe.
- **Input**: chat, document, web, email, memory, tool output, MCP server or another agent.
- **Budget**: number of attempts, time, adaptivity and available cost.
- **Permissions**: tools, scopes, credentials and reachable resources.
- **Success**: which concrete event counts as harm.
- **Recovery**: what state should remain after aborting or reverting.

{{ include_html("snippets/seguridad-ia/04-threat-model.html") }}

Without these seven pieces, an aggregate attack rate can be precise and still be of little use for a product decision.

OWASP already treats agentic red teaming as a full-lifecycle activity: identify attack paths, validate defenses and maintain continuous feedback between design, deployment and operation ([OWASP AI and Agentic Red Teaming, Q2 2026](https://genai.owasp.org/resource/ai-security-solutions-landscape-for-ai-and-agentic-red-teaming-q2-2026/)).

## Separate what the model can do from what the system executes

An evaluation should separate at least three levels:

- what the model knows how to do;
- how much it improves a person trying to complete a task;
- what the product can execute with its tools and permissions.

The first question belongs to model capability. The second measures human *uplift*. The third is a property of the complete system.

{{ include_html("snippets/seguridad-ia/04-uplift.html") }}

A high rubric score does not by itself prove that a person has gained a new capability. The evaluation needs to check whether the content was actionable, whether the person had the necessary resources and whether the result could be reproduced under realistic conditions.

## Testing the model and testing the product are different experiments

To study base capability, it can make sense to evaluate configurations with mitigations reduced or disabled. The goal is not to deploy them, but to avoid confusing “the system blocked the output” with “the model does not have that capability.”

The comparison must state which version is being tested, which safeguards are active, which tools exist, what permissions the agent has, how many attempts the attacker receives and who reviews the results. A number from a model with guardrails cannot simply be compared with a number from another setup that does not have them.

That detail also matters for regressions. If a new version changes the system prompt, classifier, retrieval, model or tool scopes, the evaluated system has changed even if the commercial name remains the same.

## Automating attacks can also mislead the evaluation

*Constitutional Classifiers* describes an automated red-teaming pipeline that generates long, multi-turn attacks. An attack model proposes a structure, fills it with variants and uses the results to produce new attempts ([Anthropic, 2025](https://www.anthropic.com/research/constitutional-classifiers)).

Automation increases coverage, but it also introduces a metric risk. If the grader rewards particular words or long responses, the attacker can learn to game the rubric without finding a useful path.

That is why an automated evaluation needs two kinds of validation:

1. **Attack validity**: confirm that the supposed success actually produces the capability or effect of concern.
2. **Grader validity**: review false positives, false negatives and cases where the attacker optimizes against the rubric itself.

A score without audited examples can measure the attacker's ability to fool the evaluator rather than the ability to compromise the product.

## The evaluation should record every step

An agent evaluation needs to record:

1. the input and its provenance;
2. what the system retrieved or remembered;
3. the model's decision;
4. the proposed tool call;
5. the authorization that was applied;
6. the tool result;
7. the final state and the possibility of recovery.

Each point allows a different test. A filter can block an output while leaving retrieval untouched. A policy engine can deny the tool while still recording dangerous memory. A runtime can abort in time and leave partial state that needs reconciliation.

The end-to-end benchmark does not have to be huge. It has to be representative. A small task with a test account, a contaminated document and a reversible action can reveal more than thousands of prompts with no tools.

{{ include_html("snippets/seguridad-ia/04-causal-chain.html") }}

## Measure the causal chain, not only the final text

For a tool-using flow, it is useful to separate success states:

- **Injection reached context** — the hostile input reached the model.
- **Decision changed** — the agent's decision or plan changed.
- **Tool proposed** — a dangerous tool call appeared.
- **Policy bypassed** — the authorization layer allowed the call.
- **Effect happened** — the external resource actually changed.
- **Recovery failed** — the system could not stop, revert or reconcile the effect.

This decomposition turns one “attack success” percentage into useful engineering evidence. If the attack reaches the model but always dies at authorization, the control that is working becomes visible. If the model appears safe but the same effect can be reached through a poorly validated tool call, that becomes visible too.

## Test ordinary failures as well as perfect attacks

A good test includes wording variations and adversarial documents, but also everyday system failures:

- timeouts and partial responses;
- tool errors;
- retries;
- duplicated actions;
- reduced permissions;
- revoked credentials;
- modified tool schemas;
- expired or contaminated memory;
- human interruption halfway through an execution.

Many incidents do not require the attacker to control every step. It is enough for a hostile input to coincide with a retry, an excessive permission or incomplete reconciliation.

## Turn the red team into a regression

The most valuable result of a red team is not the report. It is the reproducible test that remains afterward.

Whenever possible, each finding should become a case with:

- an input fixture;
- a known initial state;
- fixed tools and scopes;
- attacker budget;
- success criterion;
- stop criterion;
- expected trace evidence;
- final-state verification.

That case should run again when the model, prompt, retrieval, memory, a tool or the authorization policy changes.

{{ include_html("snippets/seguridad-ia/04-regression-loop.html") }}

Security does not improve because a report contains a number with two decimal places. It improves when the team can point to the exact path that failed, repeat it in an isolated environment and verify that a new defense changes the result without breaking the legitimate case.

That is the role of red teaming in this series: turn an abstract fear into an observable chain with a stop criterion and evidence that can become a release gate.

## References

- OWASP (2026), [*AI Security Solutions Landscape for AI and Agentic Red Teaming Q2 2026*](https://genai.owasp.org/resource/ai-security-solutions-landscape-for-ai-and-agentic-red-teaming-q2-2026/).
- OWASP (2026), [*Top 10 for Agentic Applications*](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).
- Anthropic (2025), [*Constitutional Classifiers: Defending against universal jailbreaks*](https://www.anthropic.com/research/constitutional-classifiers).
- NIST, [*AI Risk Management Framework*](https://www.nist.gov/itl/ai-risk-management-framework).
