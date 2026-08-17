---
title: Jailbreaks — when a model can be pushed into answering incorrectly
description: "How an attacker tries many ways of asking for the same thing and which controls remain necessary after a refusal."
date: 2026-08-06
keywords: jailbreaks, LLM security, GCG, adversarial suffixes, Best-of-N, attack budget
tags:
  - AI
  - Security
  - LLMs
video: "02-jailbreaks.mp4"
video_duration: "PT1M0S"
---

# Chapter 2 — Jailbreaks

A model can refuse a dangerous request and still remain vulnerable to an attack that changes the form of the question. The distinction matters because a jailbreak does not try to convince the system that the request is good. It tries to find an input that makes the model produce a continuation that its controls should have blocked.

In the earliest cases, a human trick was enough. A character, a story, or a reformulation could make the model abandon a restriction in one particular conversation. The technical shift arrives when that search is automated and the attacker can try thousands of variants against a clear metric.

## Refusing a request does not create a perfect boundary

Generative models do not execute a security policy like a parser that always returns the same error. They generate tokens conditioned on context. Safety training changes the distribution of responses, but it does not add a formal barrier that makes every undesirable continuation impossible.

That also explains why temperature zero does not solve the problem. If an adversarial input has already moved the model into an undesirable region of its distribution, deterministic decoding only makes the result more repeatable.

{{ include_html("snippets/seguridad-ia/02-superficie-jailbreak.html") }}

To evaluate a system, we have to observe what happens when a persistent person can vary the input, observe the output, and try again.

## Trying many variants changes the cost of the attack

Work on universal and transferable attacks popularized an important idea. An adversarial suffix can be optimized to increase the probability that the model starts with an affirmative response and then transferred to other queries and models.

The GCG method treats tokens as discrete variables and searches for substitutions that improve the objective. The attacker does not need to understand every detail of the model. They need an evaluation function, the ability to try variants, and a path to observe the result ([Zou et al., 2023](https://arxiv.org/abs/2307.15043)).

Transfer does not mean that there is one universal master key for every model. It means that a defense evaluated on a single formulation may be measuring an input surface that is too narrow. The attacker optimizes over a family of inputs, and the system should evaluate over that same family.

OWASP summarizes another part of the problem with Best-of-N attacks: if the attacker can generate many variations, risk no longer depends only on the success probability of one attempt. The exact percentage depends on the model, objective, budget, and evaluation; it should not be carried over as a universal guarantee for any product ([OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)).

## The threat model needs an attack budget

Saying that a model “resists jailbreaks” without declaring how many attempts the attacker had is an incomplete claim.

An evaluation should explicitly fix:

- maximum number of attempts
- whether the attacker sees previous responses
- whether the next prompt can adapt
- whether the attacker has access to logits, scores, or only text
- whether language, encoding, or format can change
- whether the system applies rate limiting or identity-based blocking
- whether the attack targets an isolated conversation or an agent with tools

{{ include_html("snippets/seguridad-ia/02-attack-budget.html") }}

The same model can show a very different profile under `N=1` and under an adaptive attacker with hundreds or thousands of queries. The budget is part of the security specification, just as timeout or retry count are part of the specification of a distributed system.

## Which controls remain useful

Rate limiting and circuit breakers remain useful. They reduce attack speed, raise its cost, and create opportunities to trigger review. The mistake is presenting that friction as a complete solution.

An input filter can block known patterns. An output classifier can detect dangerous content while it is being generated. An attempt limit can stop the search. None of those layers decides by itself whether the system is authorized to perform an external action.

The defense becomes stronger when output control is connected to action control. A blocked response should not leave an equivalent tool call open. An agent that reaches the attempt limit should end in a known and auditable state. A high-risk flow needs human approval or a deterministic policy that does not depend on the model's wording.

Anthropic presents *Constitutional Classifiers* precisely as an additional input/output defense against universal jailbreaks. The architectural takeaway is not to assume that a classifier solves the problem, but to use it as a measurable layer inside a system where the runtime retains final authority ([Anthropic, 2025](https://www.anthropic.com/research/constitutional-classifiers)).

## What a test should measure

A jailbreak benchmark can count a response as successful when it contains words from a rubric even if it does not enable the action we actually care about. Red-teaming therefore needs to review the real usefulness of the attack, not only textual matching.

The minimum evaluation should separate four outcomes:

1. **Bypass** — the model crossed a conversational filter or policy.
2. **Capability** — it produced information or a capability that is actually usable.
3. **Tool reachability** — the system allowed an equivalent external action to be proposed.
4. **Execution** — the action was actually executed with a real effect.

{{ include_html("snippets/seguridad-ia/02-outcome-ladder.html") }}

Each transition needs a different test. Collapsing them creates two opposite errors. The model can appear broken when it only generated irrelevant text, or it can appear safe because the filter blocked the answer while the runtime left the same effect reachable through another route.

The conclusion of this chapter is uncomfortable but practical. Alignment reduces the frequency of dangerous responses. Product security also depends on attempt budgets, classification, authorization, scopes, observability, and the ability to stop.

## References

- Zou et al. (2023), [*Universal and Transferable Adversarial Attacks on Aligned Language Models*](https://arxiv.org/abs/2307.15043).
- OWASP, [*LLM Prompt Injection Prevention Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).
- Anthropic (2025), [*Constitutional Classifiers: Defending against universal jailbreaks*](https://www.anthropic.com/research/constitutional-classifiers).
