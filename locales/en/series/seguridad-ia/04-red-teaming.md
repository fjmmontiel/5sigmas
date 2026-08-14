---
title: Red teaming — test the complete path before the incident
description: "How to test from untrusted input to retrieval, model decision, authorization and tool effect, and turn security findings into reproducible release regressions."
date: 2026-08-06
keywords: "AI red teaming, AI security evaluation, human uplift, attack budget, AI agents, LLM security benchmarks"
tags:
  - AI
  - Security
  - Evaluation
  - LLMs
---

# Chapter 4 — Red teaming

A security evaluation can be rigorous and still answer the wrong question. If the real system retrieves documents, uses tools, keeps memory and allows repeated attempts, testing one isolated prompt leaves out the path through which harm could occur.

Red teaming finds those paths before an incident does. Its value depends on whether the threat model, environment, attack budget and success rubric resemble the product being protected.

For agentic systems, the unit of analysis is therefore not one response. It is a **trajectory**.

---

## 1. Threat model before benchmark

Before selecting a dataset or metric, define at least:

- **Asset** — which data, capability or resource is protected?
- **Actor** — what can the adversary control and observe?
- **Entry point** — chat, document, web, email, memory, tool output, MCP server or another agent?
- **Budget** — attempts, time, adaptivity and cost?
- **Permissions** — which tools, scopes and credentials are reachable?
- **Success** — what concrete event counts as harm?
- **Recovery** — what state should remain after abort/rollback?

{{ include_html("snippets/seguridad-ia/04-threat-model.html") }}

Without these dimensions, an attack-success percentage may be numerically precise and operationally meaningless.

OWASP's 2026 agentic red-team guidance treats the activity as a lifecycle practice: identify attack paths, validate defenses and feed reproducible findings back into design and deployment.

---

## 2. Separate model capability, human uplift and product execution

A security evaluation should distinguish:

1. **Model capability** — what can the model produce under the tested configuration?
2. **Human uplift** — how much does access to the model improve a person's ability to complete the threat-model task?
3. **Product execution** — what external effects can the deployed system actually perform with its tools and permissions?

{{ include_html("snippets/seguridad-ia/04-uplift.html") }}

A high rubric score does not automatically prove that a person obtained a novel dangerous capability, and a model-level failure does not automatically mean the production runtime can execute the corresponding effect.

These are different experiments and should be reported separately.

---

## 3. Model evaluation and product evaluation are different setups

To study base capability, researchers may intentionally reduce mitigations. That can be valid if it is clearly labelled. It should not be compared directly with a production system running classifiers, policy engines, scoped tools and confirmations.

Every evaluation should declare:

- model/version;
- system prompt and context configuration;
- active safeguards;
- tools and scopes;
- attempt budget;
- grader and human-review process.

Changing any of those variables changes the system under test, even if the product name remains the same.

---

## 4. Automated attack generation can game the grader

Automated red-team agents can generate large families of test cases and adapt based on previous results. This improves coverage but introduces a second optimization target: the evaluator itself.

If the grader over-rewards keywords, verbosity or superficial rubric matches, an automated attacker can learn to maximize the score without finding a meaningful compromise.

A robust automated evaluation therefore validates both:

**Attack validity.** Did the candidate success actually produce the capability/effect defined in the threat model?

**Grader validity.** What are the false-positive/false-negative rates, and are there signs that the attack process is optimizing for the rubric rather than the product compromise?

A score without audited examples can measure how well the attacker fooled the evaluator.

---

## 5. Record every step in the trajectory

For a tool-using agent, the evaluation trace should include:

1. input and provenance;
2. retrieved/remembered context;
3. model decision;
4. proposed tool call;
5. authorization decision;
6. tool result;
7. final state and recovery result.

{{ include_html("snippets/seguridad-ia/04-causal-chain.html") }}

Each step is a different control point. Retrieval can be compromised while authorization still works. The model can behave correctly while a tool schema is too permissive. The runtime can abort a call but leave partial state requiring reconciliation.

A small end-to-end fixture with reversible actions can reveal more than thousands of prompts that never touch the actual product boundary.

---

## 6. Measure the causal chain, not only final text

A useful decomposition is:

- **Injection reached context** — hostile influence entered active context.
- **Decision changed** — the model's plan shifted.
- **Tool proposed** — a sensitive action was requested.
- **Policy bypassed** — independent authorization allowed it.
- **Effect happened** — external state changed.
- **Recovery failed** — stop/rollback/reconciliation did not restore the expected state.

This makes control effectiveness visible. If injections frequently reach the model but always die at authorization, that boundary can be measured. If the model appears safe but a permissive tool exposes the same effect, that is visible too.

---

## 7. Test ordinary failures as well as adversarial inputs

Real incidents often combine hostile content with normal distributed-system failure modes:

- timeouts and partial responses;
- tool errors and retries;
- duplicate actions;
- revoked credentials;
- schema changes;
- expired or poisoned memory;
- human interruption during execution.

Red teaming should include these interactions because the dangerous path may require only that a malicious input coincides with one retry or one over-broad permission.

---

## 8. Convert every useful finding into regression

The most valuable output of a red team is not the slide deck. It is the reproducible test that remains after the finding.

Where possible, each finding becomes a fixture with:

- known initial state;
- fixed tools/scopes;
- attack budget;
- success condition;
- stop condition;
- expected trace evidence;
- final-state verification.

{{ include_html("snippets/seguridad-ia/04-regression-loop.html") }}

Run it again whenever the model, prompt, retrieval, memory, tool contract or authorization policy changes.

The goal is a security release gate connected to a concrete causal path, not a one-time aggregate score.

---

## References

- OWASP (2026), *AI Security Solutions Landscape for AI and Agentic Red Teaming Q2 2026*.
- OWASP (2026), *Top 10 for Agentic Applications*.
- Anthropic (2025), *Constitutional Classifiers*.
- NIST, *AI Risk Management Framework*.

---

## Frequently asked questions

**Why is one prompt benchmark insufficient for an agent?**  
Because the product's real risk may arise through retrieval, memory, tools, authorization and retries rather than the final text alone.

**What is the difference between model capability and product execution?**  
The model may be able to describe or propose something without the runtime having permission to execute the effect.

**Why audit the grader?**  
Automated attacks can optimize against a weak rubric. A high score is useful only if sampled “successes” correspond to meaningful threat-model outcomes.

**What should happen after a red-team finding is fixed?**  
Turn it into a reproducible regression and keep it in the release gate.
