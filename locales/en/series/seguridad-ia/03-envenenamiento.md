---
title: Poisoning — when a dangerous instruction stays in the system
description: "What happens when a document or memory preserves a dangerous instruction and the system uses it again later."
date: 2026-08-06
date_modified: 2026-08-23
keywords: RAG poisoning, agent memory, sleeper agents, memory poisoning, LLM backdoors, unlearning
tags:
  - AI
  - Security
  - LLMs
  - Agents
---

# Chapter 3 — Poisoning

A system can fail because it receives a hostile instruction today. It can also fail because it stores a signal that appears normal and uses it again tomorrow. That second case is harder to audit because the incident is not contained in a single request. It is distributed across ingestion, storage, retrieval and decision-making.

Poisoning appears at several layers. A malicious document can alter a RAG index. An agent memory can preserve a false preference or a contaminated summary. A training dataset can introduce a pattern that activates only when a specific trigger appears.

The important difference is temporal. Classic prompt injection tries to modify a present decision. *Memory poisoning* tries to make the system itself preserve the attacker's influence and reintroduce it later as if it were part of its legitimate state.

## Storing data does not make it trustworthy

Storing an output in a database does not make it trustworthy. An agent's memory should record its origin, date, scope, permissions and expiration policy. Without those properties, the system can treat an old observation as a current instruction or turn a hypothesis into an operational fact.

The same principle applies to RAG. Retrieval ranks documents by a relevance signal. It does not certify that the content is correct, current or authorized to govern an action. To test whether untrusted input can reach memory, tools or external egress, the [prompt-injection threat explorer](/en/tools/prompt-injection-threat/) models those paths and the controls that break them.

{{ include_html("snippets/seguridad-ia/03-persistencia.html") }}

The separation between knowledge and control must also be preserved after the data is stored. An email summary can be useful for answering a question and still remain an untrusted input for sending a payment.

{{ include_html("snippets/seguridad-ia/03-memory-governance.html") }}

## Persistent memory is already a measurable attack surface

Evidence published in 2026 lets us analyze this surface much more directly than the earliest work on backdoors in model weights.

*Hidden in Memory: Sleeper Memory Poisoning in LLM Agents* studies a delayed attack in which adversarial content from a document, website or repository causes an assistant to store a false memory. The work evaluates the full chain — writing, retrieval and later use — and reports that, among successful retrievals, poisoned memories trigger the attacker's intended action in 60–89% of evaluations depending on the model and setup ([Pulipaka et al., 2026](https://arxiv.org/abs/2605.15338)).

The result should not be interpreted as a universal attack rate for any product. It does demonstrate a structural property: an untrusted input can stop being ephemeral and become persistent state that affects later conversations.

*From Untrusted Input to Trusted Memory* extends the problem by identifying four memory-write channels and nine structural vulnerabilities across model capabilities, system prompts and agent architecture. Its most useful design conclusion is that agents that write and retrieve memory more aggressively can also increase their attack surface ([Dash et al., 2026](https://arxiv.org/abs/2606.04329)).

The latest evidence is *MemSecBench*, published as a preprint in July 2026. Its Write–Execute–Forget protocol follows the same malicious semantics from storage through consequence and then attempted repair. Across 24 configurations of agents, memories and models, the work reports malicious persistence in 84.2% of cases and end-to-end success of the Write–Execute chain in 50.3%. This is preliminary and harness-dependent evidence, but it sharpens the experimental question: not only whether the poison gets in, but whether it reaches an action and can be removed afterward ([Chen et al., 2026](https://arxiv.org/abs/2607.27080)).

OWASP already treats this risk explicitly in its 2026 Top 10 for agentic applications under **ASI06: Memory & Context Poisoning**: memory and context stop being mere product features and become assets that need provenance, isolation and write controls ([OWASP, 2026](https://genai.owasp.org/2026/05/13/memory-is-a-feature-it-is-also-an-attack-surface/)).

## Dangerous behavior can also remain hidden in the model

The *Sleeper Agents* study built test models that wrote safe code when the prompt indicated 2023 and vulnerable code when it indicated 2024. The demonstration does not describe a commercial incident. It is used to study one concrete property: trigger-activated behavior can persist after standard safety-training techniques.

The work observed persistence after supervised fine-tuning, reinforcement learning and adversarial training. In some cases, adversarial training helped the model recognize its triggers better, which could hide the behavior during evaluation.

That case belongs to a different system layer. A *sleeper agent* lives in the model weights; runtime *memory poisoning* lives in the persistent state surrounding the model. They should be separated because the mitigations are different as well.

{{ include_html("snippets/seguridad-ia/03-runtime-vs-weights.html") }}

## Why deleting a record is not enough

Deleting an entry from the primary memory table does not prove that the system has forgotten its influence. Copies can remain in vector indexes, caches, summaries, checkpoints, other agents' memory or traces reused in later steps.

There are at least four distinct difficulties:

1. The same data may have materialized across several storage layers.
2. The system may preserve a reformulation or summary even after the original source disappears.
3. Another agent may have propagated the information into its own memory or state.
4. If the data reached training or fine-tuning, removing the external source no longer removes the learned representation.

{{ include_html("snippets/seguridad-ia/03-propagation-map.html") }}

Remediation needs both a disappearance test and a regression test. The first asks whether the activatable behavior is still present. The second checks that the mitigation has not destroyed a legitimate capability.

That is why the **Write → Retrieve → Execute → Forget** cycle is a more useful evaluation unit than asking only whether `DELETE memory_id` returned `200 OK`.

## How to design governable memory

A governable memory system needs at least:

- **Provenance**: who or what component originated the data.
- **Write authority**: which actor had permission to persist it.
- **Scope**: the user, tenant, session, agent or workflow to which it applies.
- **Time**: creation date, last validation and expiration.
- **Sensitivity**: what type of information it contains and where it may circulate.
- **Trust**: whether it comes from a user, tool, external document or model inference.
- **Revocation**: a path for invalidating it and rebuilding affected derivatives.
- **Auditability**: evidence of when it was retrieved and which decisions it influenced.

OWASP also recommends validating and sanitizing data before persistence, isolating memory across users or sessions, enforcing expiration and size limits, and auditing sensitive content before storage ([OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)).

The model can propose an item for memory. The runtime should decide whether it is stored, how it is retrieved and which actions it can influence. A conversational preference can enter with a low threshold. A memory item that can influence a transfer, deletion or administrative action needs a completely different trust boundary.

## What a memory evaluation should measure

A useful test should answer five questions separately:

1. **Write** — did the adversarial content manage to persist?
2. **Retrieve** — does the contaminated memory return to context when the attacker needs it?
3. **Influence** — does it modify the agent's decision?
4. **Execute** — does that influence reach a tool call or external effect?
5. **Forget** — does revocation remove the influence without destroying legitimate memory?

This separation avoids declaring a system insecure merely because it stored irrelevant text. Conversely, it avoids declaring a mitigation successful because it removed one row while the influence remained active in another artifact.

## What changes in the product

A system with memory has to be able to forget in a verifiable way. A system with RAG has to be able to withdraw a source and demonstrate which indexes, caches and summaries were affected. A multi-user agent needs explicit isolation to prevent one session's memory from acquiring authority in another.

Memory should not become an alternative channel for bypassing input controls. If an untrusted observation could not authorize an action today, persisting it should not turn it into a trusted source tomorrow.

Ultimately, poisoning is a state-management problem: **what the system stored, where it came from, what trust it assigned, where it propagated and what it can do with it when it reappears**.

## References

- Pulipaka et al. (2026), [*Hidden in Memory: Sleeper Memory Poisoning in LLM Agents*](https://arxiv.org/abs/2605.15338).
- Dash et al. (2026), [*From Untrusted Input to Trusted Memory: A Systematic Study of Memory Poisoning Attacks in LLM Agents*](https://arxiv.org/abs/2606.04329).
- Chen et al. (2026), [*MemSecBench: Tracking Agent Memory Poisoning from Persistence to Consequence and Repair*](https://arxiv.org/abs/2607.27080) — preprint.
- Hubinger et al. (2024), [*Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training*](https://arxiv.org/abs/2401.05566).
- OWASP (2026), [*Memory Is a Feature. It Is Also an Attack Surface*](https://genai.owasp.org/2026/05/13/memory-is-a-feature-it-is-also-an-attack-surface/).
- OWASP, [*AI Agent Security Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html).