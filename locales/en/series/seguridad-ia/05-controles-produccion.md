---
title: Production controls — limit actions when the model fails
description: "Which controls limit damage when an AI system reads external content, uses tools, and one defense fails."
date: 2026-08-06
date_modified: 2026-09-17
keywords: production LLM security, least privilege, dual LLM, guardrails, MCP security, tool poisoning, agent observability
tags:
  - AI
  - Security
  - Production
  - Agents
---

# Chapter 5 — Production controls

A secure system limits what each component can see, which actions require authorization, what happens when a defense fails and how the team can show what happened. The promise that the model will never make a mistake is not enough.

Defense in depth does not mean stacking filters until the product becomes unusable. It means distributing responsibilities across layers that do not share exactly the same attack surface.

In 2026, that boundary can no longer be thought of only as “LLM + tools.” Real systems connect agents to MCP servers, persistent memory, other agents, browsers, repositories, email, databases and code runtimes. Every integration adds another trust channel, which needs explicit permissions, validation and a way to shut it down.

## Separate document reading from actions

The dual-LLM pattern proposes a clear boundary. A quarantined model can read untrusted content and extract data. It has no direct access to tools or sensitive information. A privileged model can decide an action, but it receives structured outputs or summaries rather than the full hostile document.

{{ include_html("snippets/seguridad-ia/05-defense-depth.html") }}

The separation does not eliminate all injection risk. A summary can be contaminated and a classifier can be wrong. The advantage is that the attack path is no longer a direct jump from arbitrary text to a privileged action.

The general rule is broader than the dual-LLM pattern: **the component that processes untrusted data should not automatically inherit the ability to produce irreversible effects**.

## Give every tool only the permissions it needs

OWASP places tool misuse, privilege abuse and unexpected execution among the main risks of agentic applications. The practical implication is simple: the blast radius of a failure is largely determined before the model generates anything, by the permissions the runtime has already granted it ([OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)).

An agent that only needs to read documents should not receive a tool that can also upload and delete files. If a hostile input convinces the model to use the wrong operation, the blast radius was already defined by the contract.

Every tool should declare at least:

- name and purpose
- argument schema
- permissions and reachable resources
- allowed operations
- timeout and consumption limits
- error behavior
- idempotency or retry strategy
- reversibility
- action risk class

The runtime must validate the call and authorize it according to user, resource and operation. The model can propose. It should not become the final authority merely because it generated valid JSON.

Destructive actions need an additional boundary. It can be human approval, double confirmation, preview mode, a reversible operation or a deterministic policy independent of the model. The exact policy depends on the product, but it should exist before integrating the tool call.

## MCP does not eliminate the problem: it standardizes a new trust boundary

MCP simplifies the connection between LLM applications and external tools, but standardization does not automatically make the server, its tool descriptions or its responses trustworthy.

OWASP identifies several MCP-specific surfaces: **tool poisoning**, *rug pull* of definitions after initial approval, *tool shadowing* between servers, *confused deputy*, overly broad OAuth permissions and exfiltration through apparently legitimate channels ([OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)).

*Tool poisoning* is especially important because it has the same property we saw with RAG. A tool description or server response ends up inside the model context. If it contains hostile instructions and the client treats it as trusted content, the tool channel becomes another prompt-injection path ([OWASP MCP Tool Poisoning](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning)). The [prompt-injection threat explorer](/en/tools/prompt-injection-threat/) models that reachability from untrusted content to tools, data, external egress and memory, and shows which independent controls cut each path.

{{ include_html("snippets/seguridad-ia/05-mcp-boundary.html") }}

That is why a production MCP client should apply, at minimum:

1. **Server and tool allowlists**: no dynamic discovery without approval.
2. **Minimum scopes**: separate read, write and administration.
3. **Definition integrity**: detect changes in tool descriptions and schemas after approval.
4. **Isolation**: run untrusted servers in a sandbox and limit filesystem, network and credentials.
5. **Per-call authorization**: the fact that a tool exists does not mean any user or flow can invoke it.
6. **Untrusted tool outputs**: validate the result before returning it to model context.
7. **Secret boundaries**: prevent credentials or sensitive data from ending up in tool arguments without explicit policy.

MCP should be treated as an integration layer, not an authorization layer.

## Memory also needs write policies

The previous chapter showed that a hostile input can persist and reappear later. Production therefore needs controls not only over tool calls but also over the state the agent can modify.

OWASP recommends validating and sanitizing data before persistence, isolating memory between users and sessions, limiting duration and size, and auditing sensitive content ([OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)).

A useful rule follows: **writing to memory is a privileged action**. It is not necessarily as sensitive as sending a payment, but it is important enough to require provenance, scope and revocation.

## Classify exchanges with a cascade, not isolated text alone

The first generation of *Constitutional Classifiers* used input and output classifiers to detect dangerous content. In January 2026, *Constitutional Classifiers++* materially changed the production architecture: it evaluates the **full exchange** in context, uses a **two-stage cascade**, and combines inexpensive linear probes with more expensive external classifiers. The first stage screens all traffic and escalates only suspicious exchanges to the second stage ([Anthropic, *Next-generation Constitutional Classifiers*](https://www.anthropic.com/research/next-generation-constitutional-classifiers); [Cunningham et al., 2026](https://arxiv.org/abs/2601.04603)).

The paper reports a **40× reduction in computational cost relative to its baseline exchange classifier**, a **0.05% refusal rate on production traffic**, and more than **1,700 cumulative hours of red-teaming**. Those figures describe Anthropic's evaluated system and harnesses; they are not universal numbers for every guardrail, model or traffic distribution. Anthropic also states that the defenses are not perfect and describes reconstruction and output-obfuscation attacks as weaknesses that motivated the redesign.

The architecture lesson matters more than memorizing the numbers: a cheap signal can decide **which traffic deserves a more expensive evaluation**, while the final decision retains enough context to detect relationships between the request and response. This makes the cost-latency-risk trade-off explicit instead of running the same heavy classifier on every token.

A guardrail is still a model or component that needs evaluation and can fail. Classifiers are most useful when their enforcement matches the risk. A low-impact conversation can use a cheap check. A sensitive tool call may require a specialized layer, deterministic validation and human approval.

The mistake is to put the guardrail only in front of visible text and leave an equivalent path open through a tool. **Blocking the response while allowing the action is not a mitigation.**

## Design a real kill path

A production agent needs a stop mechanism that does not depend on the model itself cooperating.

That *kill path* can include:

- a circuit breaker per user, tenant or workflow
- immediate revocation of tool credentials
- cancellation of executions in progress
- retry and budget limits
- temporary blocking of a specific tool
- rollback or reconciliation of partially executed actions
- a degraded read-only mode

The important property is that the control lives outside the natural-language channel that may be compromised.

{{ include_html("snippets/seguridad-ia/05-kill-path.html") }}

## Record what happens so it can be stopped

Security telemetry should follow the decision path. Preserve request identity, retrieved source, memory used, policy decision, proposed tool, authorization, result and abort reason without recording unnecessary secrets or personal content.

A minimum trace for an action should make it possible to reconstruct:

`input → retrieval/memory → model decision → tool proposal → policy decision → execution → resulting state`

These traces are useful for more than post-incident reconstruction. Sudden changes in approval rates, rejection reasons, tool usage, MCP servers consulted or retries can indicate a bypass or regression. Without a baseline, the problem may only become visible during incident response.

## Turn security into a release gate

The previous chapter's red-team work has operational value only if its results can block a release.

A security gate for an agent can be small and specific:

- no destructive action without independent authorization
- no sensitive tool accessible from untrusted external content without a structural boundary
- zero cross-tenant memory leakage in the regression set
- tool schemas and scopes compared against an approved baseline
- indirect prompt-injection scenarios executed end-to-end
- kill switch and rollback verified
- enough logs to reconstruct every privileged action

{{ include_html("snippets/seguridad-ia/05-release-gate.html") }}

A gate should not merely count checks. Every condition needs **evidence bound to the revision being deployed**: a policy and its scopes, a baseline for schemas/state, and an end-to-end attack-and-recovery test. If one artifact is missing, stale or no longer describes the deployable system, the correct path is `HOLD` even when the other controls are green.

OWASP explicitly includes adversarial validation, CI/CD and release gates in its recommendations for agent security. The important idea is not to adopt a universal number, but to make the acceptance criterion reproducible and connected to the product's threat model ([OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)).

## The resulting design

A reasonable architecture for a flow with external content and sensitive actions can follow this sequence:

1. Ingestion labeled as untrusted
2. Quarantined reading
3. Structured and validated output
4. Memory with provenance and scope if persistence is needed
5. Decision with limited tools
6. Independent authorization by user, resource and operation
7. Sandbox for risky execution
8. Reversible tool where possible
9. End-to-end telemetry
10. Abort, audit and recovery

This is not a universal recipe; it shows where data is separated from action and where the system can be stopped.

The final rule is simple and practical. **The more power you give to a system that interprets language, the less you can depend on that language being interpreted as you expect.** Real control lives in runtime boundaries, permissions, authorization, isolation, observability and the ability to recover.

## References

- OWASP (2026), [*Top 10 for Agentic Applications*](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).
- OWASP, [*AI Agent Security Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html).
- OWASP, [*MCP Security Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html).
- OWASP, [*MCP Tool Poisoning*](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning).
- OWASP, [*LLM Prompt Injection Prevention Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).
- Anthropic (2025), [*Constitutional Classifiers: Defending against universal jailbreaks*](https://www.anthropic.com/research/constitutional-classifiers).
- Anthropic (2026), [*Next-generation Constitutional Classifiers: More efficient protection against universal jailbreaks*](https://www.anthropic.com/research/next-generation-constitutional-classifiers).
- Cunningham et al. (2026), [*Constitutional Classifiers++: Efficient Production-Grade Defenses against Universal Jailbreaks*](https://arxiv.org/abs/2601.04603).
- NIST, [*AI Risk Management Framework*](https://www.nist.gov/itl/ai-risk-management-framework).
