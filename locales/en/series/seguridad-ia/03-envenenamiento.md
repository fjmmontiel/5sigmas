---
title: Poisoning — when a dangerous instruction persists in system state
description: "How untrusted content can persist through RAG or agent memory, why runtime memory differs from weight-level backdoors, and what write/retrieve/execute/forget evaluation should measure."
date: 2026-08-06
keywords: "RAG poisoning, agent memory security, memory poisoning, sleeper agents, LLM backdoors, memory governance"
tags:
  - AI
  - Security
  - LLMs
  - Agents
---

# Chapter 3 — Poisoning

A system can fail because hostile content changes one decision today. It can also fail because the system stores a misleading state and reuses it later. That second failure is harder to audit because the causal chain is spread across ingestion, storage, retrieval and action.

Poisoning can appear at several layers: an untrusted document can contaminate a retrieval corpus; an agent can persist a false preference or summary; or model training can encode a trigger-dependent behaviour. The important common property is **persistence**.

Prompt injection changes the current context. Memory poisoning tries to make untrusted influence become part of the system's future state.

---

## 1. Storage does not turn data into truth

A row in a database is not automatically trusted because the system itself wrote it.

Agent memory should preserve at least origin, timestamp, scope, authority and expiry. A retrieved document should likewise carry provenance and access context. Relevance ranking says “this may help answer the query”; it does not certify truth or permission to govern an action.

{{ include_html("snippets/seguridad-ia/03-persistencia.html") }}

The knowledge/control separation from prompt injection must survive persistence. A summary of an email may be useful context and still be untrusted input for a payment or administrative action.

{{ include_html("snippets/seguridad-ia/03-memory-governance.html") }}

---

## 2. Persistent memory is a measurable attack surface

Recent 2026 work evaluates memory poisoning as an end-to-end runtime problem rather than only as a model-weights backdoor.

*Hidden in Memory: Sleeper Memory Poisoning in LLM Agents* studies delayed influence in which adversarial external content causes an assistant to store false memory and later act on it. Its reported rates vary substantially by model and harness, so they should not be treated as universal product probabilities. The structural result is more important: **untrusted input can become persistent state and affect later conversations** ([Pulipaka et al., 2026](https://arxiv.org/abs/2605.15338)).

*From Untrusted Input to Trusted Memory* identifies multiple memory-write channels and architectural weaknesses, emphasizing that aggressive memory creation/retrieval can improve product continuity while increasing security surface ([Dash et al., 2026](https://arxiv.org/abs/2606.04329)).

*MemSecBench* uses a Write–Execute–Forget framing to track whether malicious state is stored, produces an effect and can then be repaired ([Chen et al., 2026](https://arxiv.org/abs/2607.27080)). As a preprint, its exact numbers are harness-dependent, but the evaluation unit is useful for engineering.

OWASP's 2026 agentic guidance similarly treats memory/context poisoning as a first-class application risk.

---

## 3. Runtime memory and model weights are different layers

*Sleeper Agents* studied trigger-dependent behaviour encoded in model weights and showed that some deceptive behaviours can persist through ordinary safety training ([Hubinger et al., 2024](https://arxiv.org/abs/2401.05566)).

That is not the same mechanism as runtime memory poisoning.

- **Runtime poisoning** lives in documents, memory stores, summaries, caches or agent state around the model.
- **Weight-level behaviour** lives inside learned parameters and may require model-level remediation.

{{ include_html("snippets/seguridad-ia/03-runtime-vs-weights.html") }}

The distinction matters because deletion and revocation mechanisms that work for application state do not necessarily remove learned model behaviour—and retraining a model is unnecessary if the actual problem is one poisoned memory record plus its derivatives.

---

## 4. Deleting the source may not remove the influence

Persistent systems create copies and derivatives:

1. the source may exist in several stores;
2. summaries may survive after the source is deleted;
3. another agent may have copied the state into its own memory;
4. vector indexes and caches may retain derived representations;
5. if the content entered training or fine-tuning, application-level deletion cannot remove learned parameters.

{{ include_html("snippets/seguridad-ia/03-propagation-map.html") }}

This is why successful revocation requires more than `DELETE memory_id` returning success. The system needs evidence that the influence no longer reaches decisions, followed by regression checks showing legitimate memory behaviour still works.

The useful evaluation cycle is:

> **Write → Retrieve → Influence → Execute → Forget**

---

## 5. Design memory so it can be governed

A production memory object should carry:

- **provenance** — which user, tool, document or model inference produced it;
- **write authority** — who was allowed to persist it;
- **scope** — user, tenant, session, agent and workflow boundaries;
- **time** — creation, validation and expiry;
- **sensitivity** — what data class it contains;
- **trust class** — direct user statement, trusted tool, external document or model inference;
- **revocation path** — how to invalidate it and affected derivatives;
- **auditability** — where/when it was retrieved and which decisions it influenced.

The model can propose memory. The runtime should determine whether it is persisted and how much authority it can acquire.

A conversational preference can have a low write threshold. State capable of influencing a transfer, deletion or administrative action needs a much stronger boundary.

---

## 6. What an evaluation should measure

A useful memory-security test separates five questions:

1. **Write** — did untrusted content persist?
2. **Retrieve** — did it re-enter context under relevant conditions?
3. **Influence** — did it change the model's decision or plan?
4. **Execute** — did that influence reach an external effect?
5. **Forget** — did revocation remove the influence without destroying legitimate state?

This avoids calling every stored bad string a compromise while also avoiding the opposite mistake: declaring remediation complete when one row disappeared but derived influence remained elsewhere.

---

## 7. Product consequence

A memory-enabled product needs verifiable forgetting. A RAG system needs source withdrawal plus index/cache rebuilding where necessary. A multi-user agent needs explicit isolation so one session's memory cannot silently gain authority in another.

The governing rule is:

> **If untrusted input could not authorize an action when first observed, persisting it should not make it trusted later.**

---

## References

- Pulipaka et al. (2026), *Hidden in Memory: Sleeper Memory Poisoning in LLM Agents*.
- Dash et al. (2026), *From Untrusted Input to Trusted Memory*.
- Chen et al. (2026), *MemSecBench* — preprint.
- Hubinger et al. (2024), *Sleeper Agents*.
- OWASP (2026), *Memory Is a Feature. It Is Also an Attack Surface*.
- OWASP, *AI Agent Security Cheat Sheet*.

---

## Frequently asked questions

**What is the main difference between prompt injection and memory poisoning?**  
Prompt injection changes the active context; memory poisoning aims to persist influence so it reappears later as system state.

**Why is deleting one memory row insufficient evidence of remediation?**  
Because summaries, vector indexes, caches or other agents may contain derived copies.

**Is a sleeper agent the same as poisoned agent memory?**  
No. Sleeper-agent research studies trigger-dependent behaviour in model weights. Runtime memory poisoning lives in surrounding application state.

**Who should decide whether model-generated memory is stored?**  
The runtime, using explicit provenance, scope, policy and trust rules—not the model alone.
