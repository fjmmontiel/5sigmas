---
title: Jailbreaks — when a model can be pushed past its intended policy
description: "Why one refusal is not a security boundary, how repeated/adaptive attempts change the threat model, and which outcomes a real jailbreak evaluation should distinguish."
date: 2026-08-06
keywords: "jailbreaks, LLM security, adversarial prompts, attack budget, Best-of-N, AI safety evaluation"
tags:
  - AI
  - Security
  - LLMs
---

# Chapter 2 — Jailbreaks

A model can refuse a dangerous request once and still remain vulnerable when the request is reformulated repeatedly. A jailbreak is not necessarily an argument that the harmful request is legitimate. It is a search for an input that moves generation outside the intended behavioural policy.

The important engineering shift is from **one clever prompt** to **a search process with a budget, feedback and an objective**. Once many variants can be tested automatically, security has to be evaluated against the attack process rather than against one representative wording.

---

## 1. A refusal is not a formal boundary

Generative models do not enforce safety like a parser returning a deterministic access-control error. Safety training changes the probability distribution over responses; it does not create a mathematical proof that every disallowed continuation is unreachable.

Temperature zero does not fix this property. Deterministic decoding can make one trajectory more repeatable, but it does not guarantee that the underlying trajectory is policy-compliant for every possible input.

{{ include_html("snippets/seguridad-ia/02-superficie-jailbreak.html") }}

This changes the evaluation question from “Did the model refuse?” to:

> **How does the system behave when an adaptive actor can vary inputs, observe outcomes and try again?**

---

## 2. Search changes the economics of an attack

Research on universal and transferable adversarial inputs showed that model behaviour can sometimes be pushed by automatically searching over input variations ([Zou et al., 2023](https://arxiv.org/abs/2307.15043)). The defensive takeaway is more important than any particular optimization method: evaluating one prompt samples only a tiny part of the reachable input surface.

Best-of-N style evaluations make the same point in black-box form. If one trial has a small probability of bypassing a policy, many attempts can produce a very different aggregate risk profile. The exact relationship depends on independence, adaptation, model, objective and detection controls; no single published percentage transfers universally to a production system.

Security claims therefore need an explicit **attack budget**.

---

## 3. The threat model must declare the budget

An evaluation should state at least:

- maximum number of attempts;
- whether previous outputs are observable;
- whether subsequent attempts can adapt;
- what interface is available (text only, scores or deeper model access);
- which languages and formats are allowed;
- rate limits, identity controls and circuit breakers;
- whether the target is a chat response or a tool-using workflow.

{{ include_html("snippets/seguridad-ia/02-attack-budget.html") }}

`N=1` and an adaptive multi-attempt adversary are different security experiments. Attempt budget belongs in the test specification just like timeout, retry limits and resource budgets belong in distributed-system specifications.

---

## 4. Useful controls remain useful—within their scope

Rate limiting raises attacker cost and creates detection opportunities. Input classifiers can block known patterns. Output monitors can stop unsafe generation. Account-level limits can interrupt high-volume search.

None of these controls answers the separate authorization question: **what can the runtime actually do?**

A blocked text response should not leave an equivalent sensitive tool action open. Repeated policy violations should place the workflow in a known state. High-risk operations should remain behind deterministic authorization or human approval independent of the model's phrasing.

Anthropic's Constitutional Classifiers are useful as an example of a measurable input/output monitoring layer. Their value is strongest inside a system where runtime permissions and action boundaries remain independent.

---

## 5. Evaluate outcomes, not only rubric-matching text

Automated jailbreak graders can count a response as an attack success even when the output is unusable or incapable of causing the feared effect. Conversely, a response can look harmless while an equivalent tool path remains reachable.

A useful evaluation separates at least four levels:

1. **Bypass** — the conversational or content policy was crossed.
2. **Capability** — the output contained materially usable capability relevant to the threat model.
3. **Tool reachability** — the system could propose or access an external action that creates the same effect.
4. **Execution** — the action was actually authorized and produced an external state change.

{{ include_html("snippets/seguridad-ia/02-outcome-ladder.html") }}

Each level needs different evidence. This prevents both over-reporting harmless text as a compromise and under-reporting a product where tool authority remains exposed.

---

## 6. What changes in production

A mature jailbreak posture combines model alignment with product controls:

- attempt budgets and rate limits;
- input/output monitoring;
- least-privilege tools;
- independent authorization;
- observability across repeated attempts;
- circuit breakers and known failure states;
- human review where external effects are consequential.

The model's refusal behaviour matters. The product's security depends on what remains reachable when the refusal mechanism is imperfect.

---

## References

- Zou et al. (2023), *Universal and Transferable Adversarial Attacks on Aligned Language Models*.
- OWASP, *LLM Prompt Injection Prevention Cheat Sheet*.
- Anthropic (2025), *Constitutional Classifiers: Defending against universal jailbreaks*.

---

## Frequently asked questions

**Does a successful refusal prove a model is jailbreak-resistant?**  
No. It proves one input was handled correctly. A useful security claim needs an explicit multi-attempt threat model.

**Why declare the attack budget?**  
Because the probability of finding a failure can change dramatically when the attacker gets more attempts, feedback or adaptivity.

**Are rate limits a real security control?**  
Yes. They increase cost and improve detection, but they are not a substitute for authorization and least privilege.

**Why separate bypass from execution?**  
Because unsafe text and an externally executed action have different consequences and different control points.
