---
title: Production controls — limit actions when the model fails
description: "Which runtime controls bound damage when AI systems read external content, use tools and memory, connect through MCP, and one defensive layer fails."
date: 2026-08-06
keywords: "production LLM security, least privilege, dual LLM, guardrails, MCP security, tool poisoning, agent observability, kill switch"
tags:
  - AI
  - Security
  - Production
  - Agents
---

# Chapter 5 — Production controls

A secure system limits what each component can see, which actions require authorization, what happens when a defense fails and how the resulting state can be reconstructed. The promise that a model will never make a mistake is not a sufficient security model.

Defense in depth is not “add filters until the product becomes unusable.” It is **split responsibilities across layers that do not share exactly the same failure mode**.

In 2026, that boundary extends beyond “LLM + tools.” Production agents connect to MCP servers, persistent memory, browsers, repositories, email, databases, other agents and code runtimes. Every integration introduces a trust channel that needs permissions, validation and an independent way to stop.

---

## 1. Separate untrusted reading from privileged action

A dual-model pattern creates a useful structural boundary. A quarantined component can read external content and extract information without access to sensitive tools. A privileged component can decide whether to act, but receives constrained structured output rather than the full untrusted document whenever possible.

{{ include_html("snippets/seguridad-ia/05-defense-depth.html") }}

The pattern does not eliminate manipulation. Summaries can be wrong and classifiers can fail. Its value is that arbitrary external text no longer has a direct path to privileged effects.

The broader rule is:

> **The component that interprets untrusted content should not automatically inherit the authority to create irreversible effects.**

---

## 2. Give every tool only the permissions its workflow needs

The blast radius of a model failure is largely determined before inference begins—by the permissions and operations exposed by the runtime.

A read-only document agent should not receive a tool that can also upload/delete files. A mail summarizer does not need administrative mailbox operations merely because the same connector supports them.

Every production tool contract should define at least:

- name and purpose;
- typed argument schema;
- reachable resources and scopes;
- allowed operations;
- timeout/resource budget;
- error behaviour;
- idempotency/retry semantics;
- reversibility;
- risk class.

The runtime validates and authorizes each request against the current user, resource and operation. A model-generated JSON object is a proposal, not proof of authorization.

Destructive actions require an additional boundary: human approval, deterministic policy, preview mode, reversible operation or another mechanism appropriate to the product.

---

## 3. MCP standardizes integration, not trust

MCP makes it easier to connect AI applications with external tools and data. It does not make a server, tool description or tool response inherently trusted.

OWASP identifies agentic/MCP risks including malicious or changed tool definitions, tool-name/description conflicts, confused-deputy behaviour, overly broad OAuth scopes and data exfiltration through apparently legitimate channels.

A crucial principle is that **tool metadata and outputs can themselves enter model context**. If they contain untrusted instructions and the client treats them as authority, the integration channel becomes another prompt-injection surface.

{{ include_html("snippets/seguridad-ia/05-mcp-boundary.html") }}

A production MCP client should therefore use controls such as:

1. approved server/tool allowlists;
2. minimal read/write/admin scopes;
3. integrity/version checks for approved tool definitions and schemas;
4. sandboxing for less-trusted servers;
5. authorization on every call rather than “tool exists = user may invoke it”;
6. validation of tool outputs before they re-enter model context;
7. explicit secret/data-flow boundaries.

MCP is an integration layer. Authorization remains a runtime responsibility.

---

## 4. Writing memory is a privileged operation too

The previous chapter showed that untrusted content can persist and influence later decisions. Production controls must therefore cover state mutation as well as tool calls.

Memory writes should be validated, scoped, time-bounded and auditable. User/session/tenant isolation must be explicit. Sensitive content needs retention rules and a revocation path.

This suggests a useful framing:

> **Writing memory is an action with authority, even when it looks like a UX feature.**

The risk may be lower than sending a payment, but the object still needs provenance, scope and lifecycle control because it can alter future model context.

---

## 5. Classify content while it is generated—but connect the control to the real risk

Streaming input/output classifiers can stop unsafe generation earlier and improve response time. They also add latency, cost and another component that needs evaluation.

Their value is highest when the control maps to the consequence. A low-risk chat can use lightweight checks. A sensitive tool action can require stronger classification plus deterministic policy and human approval.

The common architectural failure is to block dangerous visible text while leaving an equivalent action path open through tools.

> **Blocking the response while allowing the action is not a mitigation.**

---

## 6. Build a kill path outside the model

A production agent needs a stop mechanism that does not depend on the potentially compromised model cooperating.

A kill path can include:

- circuit breakers by user, tenant or workflow;
- immediate revocation of tool credentials;
- cancellation of in-flight jobs;
- retry/attempt budgets;
- temporary disablement of one tool;
- rollback or reconciliation for partial effects;
- degraded read-only mode.

{{ include_html("snippets/seguridad-ia/05-kill-path.html") }}

The important property is that this control lives **outside the natural-language channel** that may be under adversarial influence.

---

## 7. Observe the complete decision path

Security telemetry should make privileged actions reconstructable without unnecessarily logging secrets or personal data.

A useful trace links:

`input → retrieval/memory → model decision → tool proposal → policy decision → execution → resulting state`

Operational signals include sudden changes in approval/denial rates, repeated attempts, unusual tool usage, unexpected MCP-server access and abnormal retry patterns.

Observability is what turns a failed defense into something the team can diagnose and improve rather than rediscover in the next incident.

---

## 8. Turn red-team findings into release gates

The previous chapter's red teaming only becomes operational if meaningful findings can block a release.

A product-specific agent-security gate might require:

- no destructive action without independent authorization;
- no sensitive tool directly reachable from untrusted external content without a structural boundary;
- no cross-tenant memory leakage in regression fixtures;
- approved tool schemas/scopes unchanged or explicitly reviewed;
- indirect-injection scenarios executed end-to-end;
- kill switch and rollback verified;
- sufficient trace evidence to reconstruct every privileged action.

{{ include_html("snippets/seguridad-ia/05-release-gate.html") }}

There is no universal numeric threshold for every product. The acceptance criteria should follow the threat model and be reproducible in CI/CD.

---

## 9. The production architecture that remains

A reasonable high-level sequence for a workflow combining external content and sensitive actions is:

1. label ingestion as untrusted;
2. process it in a constrained/quarantined component;
3. emit validated structured data;
4. persist memory only with provenance and scope;
5. let the decision component see only the tools it needs;
6. authorize by user/resource/operation outside the model;
7. sandbox higher-risk execution;
8. prefer reversible operations where possible;
9. record end-to-end telemetry;
10. provide independent abort, audit and recovery controls.

The sequence is not a universal implementation recipe. Its purpose is to make trust transitions explicit.

The series ends with one durable rule:

> **The more authority you give a system that interprets language, the less your security can depend on that language always being interpreted as intended.**

Real control lives in runtime boundaries, permissions, authorization, isolation, observability and recovery.

---

## References

- OWASP (2026), *Top 10 for Agentic Applications*.
- OWASP, *AI Agent Security Cheat Sheet*.
- OWASP, *MCP Security Cheat Sheet* and *MCP Tool Poisoning*.
- OWASP, *LLM Prompt Injection Prevention Cheat Sheet*.
- Anthropic (2025), *Constitutional Classifiers*.
- NIST, *AI Risk Management Framework*.

---

## Frequently asked questions

**Why is least privilege more important for agents than chatbots?**  
Because an interpretation failure can become an external state change. Limiting the available operations bounds the consequence before the model generates anything.

**Does MCP solve tool security?**  
No. It standardizes connectivity. Clients still need server trust, scopes, schema integrity, output validation and per-call authorization.

**Why treat memory writes as privileged?**  
Because stored state can influence future decisions. Provenance, scope, expiry and revocation prevent a low-trust observation from silently becoming durable authority.

**What makes a kill switch trustworthy?**  
It must live outside the model's natural-language reasoning loop and be able to revoke/cancel the capabilities the workflow is using.

**What should a security release gate test?**  
Concrete threat-model regressions across retrieval, memory, authorization, tools, recovery and traceability—not only model refusal rates.
