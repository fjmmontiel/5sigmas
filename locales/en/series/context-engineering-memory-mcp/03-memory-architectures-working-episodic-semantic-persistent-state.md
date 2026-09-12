---
title: "Agent memory architectures: working, episodic, semantic, and persistent state"
description: "How to separate active context, episodic memory, semantic knowledge, and authoritative persistent state without confusing persistence, retrieval, or checkpoints with memory types."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "agent memory, working memory, episodic memory, semantic memory, persistent state, context engineering, agents"
tags:
  - AI
  - Agents
  - Context engineering
  - Memory
  - Architecture
---

# Chapter 3 — Memory architectures: working, episodic, semantic, and persistent state

An agent can remember a user preference for months and still make the wrong decision if it treats that preference as more authoritative than the current business-system state. It can also preserve a perfect checkpoint while remembering nothing useful about previous tasks.

The design problem is not only **what to store**. It is separating four questions:

1. What state does the task need **now** to reason?
2. Which past experiences are worth keeping as episodes?
3. Which patterns or derived facts are worth consolidating as semantic knowledge?
4. Which data is **authoritative product state** and should be read from a system of record instead of trusted as agent memory?

A fifth distinction prevents many confused designs: **persistent is not, by itself, a cognitive memory type**. Persistence describes how long data survives and where it lives. A conversation, an episode, an embedding, a consolidated preference, or a checkpoint can all be persistent while carrying different semantics.

CoALA proposes a conceptual architecture that separates working memory from long-term memory, with semantic, episodic, and procedural memory inside the latter.[^coala] It is a useful organizing framework, not an API or a mandatory production taxonomy. This chapter adapts that idea around a more operational boundary for agents: **derived memory is not authoritative state**.

{{ include_html("snippets/articulos-tecnicos/context-memory-lifecycle.html") }}

## Working state: what execution needs now

Let \(W_t\) denote the working set used for one concrete decision. It may contain:

- the current request
- active instructions
- recent tool results
- a relevant slice of history
- retrieved memories
- a fresh read of external state

\(W_t\) is **active state**, not necessarily persistent state. It can be reconstructed on every turn from external sources.

This matters because “having memory” does not mean every stored memory belongs in context. The previous chapter covered assembly under a finite budget. Here we add lifecycle policy:

\[
W_t = A(U_t, H_t, E_t, S_t, R_t)
\]

where \(A\) is the assembly policy, \(E_t\) is retrieved episodic memory, \(S_t\) is retrieved semantic memory, and \(R_t\) is current authoritative state.

The equation is a design abstraction. It does not describe a provider's internal implementation.

## Episodic memory: events situated in time

Episodic memory represents **something that happened**. A useful episode usually retains at least:

```text
event_id
subject / scope
observed_at
source
source_version
relevant input / action / result
provenance
retention / sensitivity metadata
```

Examples:

- “the user rejected this proposal on 2026-09-11”
- “run-42 failed because the payments schema rejected `currency=null`”
- “the agent called `cancel_subscription` and received `409 already_cancelled`”

Time and provenance are part of the meaning. Remove both and an episode can turn into an ambiguous statement that looks universal.

The 2023 *Generative Agents* paper uses a **memory stream** of experiences, dynamic retrieval, and derived reflections to influence later behavior.[^generative-agents] It is a useful research precedent. It does not imply that its scoring, representation, or architecture is the right production design in 2026.

## Semantic memory: consolidated knowledge, not copied history

Semantic memory represents knowledge we want to reuse without replaying every episode that produced it.

Example:

```text
episode e17: user asks for email follow-up
episode e24: user asks for email again
episode e31: user corrects SMS -> email

consolidation:
preference.follow_up_channel = "email"
derived_from = [e17, e24, e31]
```

Consolidation reduces retrieval and context cost, but creates a derived representation. It therefore needs answers to:

- Which episodes produced it?
- Which rule or model performed the consolidation?
- When was it updated?
- What evidence contradicts it?
- When should it be invalidated or recomputed?

A semantic memory should not automatically be promoted to “truth.” It may be a useful inference, a likely preference, or a learned rule. Its **authority** depends on the source and domain.

## Authoritative persistent state: agent memory should not replace it

A support agent may remember that a customer was on the Pro plan yesterday. That memory should not decide whether the customer can use a paid feature today.

Current values such as:

- subscription
- permissions
- balance
- consent
- ownership
- inventory
- order state

often belong to a **system of record** outside the agent.

The application may retain a copy, cache, or derived memory, but when a decision requires current authority it should read or validate against the governing source.

Design rule:

```text
fresh authoritative state
>
stale derived memory
```

This does not mean an external system can never fail. It means the application must model which source governs each decision instead of letting “what the agent remembers” win because it appears first in the prompt.

## Persistence is an axis, not a fourth bucket

We can classify state along two different axes:

| Semantics | Can be ephemeral | Can persist | Example |
| --- | --- | --- | --- |
| Working state | yes | yes, if serialized | current tool result |
| Episode | rarely useful if only ephemeral | yes | action + result + timestamp |
| Derived semantic memory | can be computed on demand | yes | consolidated preference |
| Authoritative state | usually lives outside the agent | yes | subscription in billing DB |
| Checkpoint | yes | yes | snapshot for resuming execution |

This separation prevents misleading claims such as “we use a vector database, therefore we have persistent memory.” A vector database describes a storage and retrieval mechanism. It does not define what a record means or what authority it has.

## Retrieval is not a memory type either

Retrieval answers **how we access** information. It may use:

- exact keys
- SQL
- text search
- embeddings
- graph traversal
- filters by user, time, version, or tenant
- a combination of these

Episodic and semantic describe **what the information represents**. Retrieval describes **how we find it**.

That difference becomes central in the next chapter: excellent semantic search can still retrieve stale or low-authority memory. Relevance does not solve freshness or authority.

## Checkpoint ≠ memory

A checkpoint answers a different question: **from which execution state can I resume?**

It may serialize:

```text
step_id
pending tool calls
local variables
cursor / queue position
conversation items
retry counters
external effect IDs
```

That can be critical for recovery, but it does not make the checkpoint semantic or episodic memory.

A checkpoint can incidentally contain conversation history or episodes. Its primary contract is still **resume correctness**, not **future usefulness**.

The inverse distinction matters too: persistent memory containing a user's preferences is not enough to resume a workflow after a crash. Pending effects, locks, idempotency keys, or execution positions may still be missing.

## What current frameworks provide — and what they do not

The OpenAI Agents SDK documents `Session` as a persistence layer for conversation history across runs. The runner retrieves prior items, prepends them to the next turn, and persists new items. Implementations can use SQLite, Redis, SQLAlchemy, OpenAI Conversations, or other backends.[^openai-sessions] The SDK also supports limiting retrieved history and compaction over sessions.[^openai-sessions]

That is a **harness capability**. It does not decide which part of a conversation is a durable preference, which business datum is authoritative, or when a semantic memory should be invalidated.

Anthropic currently exposes two distinct surfaces. Its Memory Tool is client-side: Claude requests operations while **the application executes them and controls storage**.[^anthropic-memory-tool] Managed Agents, by contrast, offers persistent memory stores as a managed product capability.[^anthropic-managed-memory]

A Managed Agents property should not be attributed to the Claude model, and a truth/freshness policy should not be attributed to the Memory Tool. Application-level scope, retention, authority, privacy, and invalidation decisions still exist in both cases.

## Writing memory is a policy-controlled operation

A dangerous design lets any generated text become durable memory automatically.

A safer path separates:

```text
observation
  ↓
candidate memory write
  ↓
validation / scope / sensitivity / dedup
  ↓
append episode OR update semantic memory
  ↓
provenance + retention + invalidation metadata
```

Useful checks before a write include:

- Is this an observation or an inference?
- Does it really belong to this user or tenant?
- Does it contain secrets or data that should not persist?
- Is there already an equivalent memory?
- Is there enough evidence to consolidate a semantic fact?
- Which future event should invalidate it?
- Does the product or user permit retaining it?

The model can propose a memory write. The application still owns the persistence contract.

## Conflicts: authority first, then relevance

Suppose a support agent retrieves:

```text
semantic memory:
  preferred_channel = email
  derived_from = [e17, e24, e31]

system of record:
  marketing_email_consent = false
  revision = consent@2026-09-11T17:22Z
```

For a marketing campaign, a retrieved preference does not authorize sending mail. Current authoritative state must govern the action.

For an operational response that the product permits, the preference may still be useful.

Conflict resolution needs at least:

1. **scope**: are both records about the same decision?
2. **authority**: which source governs that decision?
3. **freshness/version**: which state is still applicable?
4. **provenance**: where did the derived memory come from?
5. **policy**: should it be invalidated, corrected, or retained with lower priority?

“Newest timestamp wins” is not a universal policy either. A new episode can be a weak observation while an older authoritative rule remains valid.

## Deletion and correction need lineage

Persisting memory creates lifecycle obligations.

If a user changes “I prefer email” to “I prefer phone calls,” the system needs to know which derived representations should change. If a source is removed under retention or privacy policy, dependent memories should not survive silently without an explicit policy decision.

A useful lineage model can retain relationships such as:

```text
semantic_memory_id
  derived_from -> episode IDs
  scope -> user/project/tenant
  supersedes -> prior memory ID
  invalidated_by -> event/source revision
  retention_policy -> policy ID
```

You do not need a formal graph for every record. You do need enough structure to explain what must be deleted, corrected, or recomputed when a source changes.

## Worked example: a support agent

Consider four separate stores:

```text
WORKING
- current ticket
- latest tool results
- retrieved subset of memory

EPISODIC
- e17: customer requested email
- e24: customer rejected SMS
- e31: agent corrected channel after feedback

SEMANTIC
- preferred_follow_up_channel = email
- derived_from = [e17,e24,e31]

AUTHORITATIVE
- active_plan = Pro
- account_locked = false
- marketing_email_consent = false
```

When a new ticket opens:

1. The assembler does not load the entire history.
2. It retrieves the relevant semantic preference.
3. It reads fresh state for sensitive decisions.
4. It builds \(W_t\).
5. It executes the action.
6. It stores the result as an episode.
7. It updates semantic memory only when the consolidation policy justifies it.

If the user changes the preferred channel, new episodes can supersede the prior semantic memory. If the plan changes, the agent does not need to “learn” the new plan through memory: it reads the system of record again.

## How to evaluate a memory architecture

Useful memory cannot be evaluated with recall@k alone.

Measure separately:

- **write precision**: how many persisted writes actually deserved persistence
- **retrieval usefulness**: whether retrieved memory improves the task
- **stale-memory override rate**: how often old memory displaces more authoritative evidence
- **conflict-resolution accuracy**: whether the right source wins when records disagree
- **provenance coverage**: what fraction of derived memories retain origin and version
- **consolidation fidelity**: whether semantic memory preserves the relevant invariants from its episodes
- **deletion/correction propagation**: whether source changes reach dependent derivatives
- **cross-tenant leakage**: any scope mixing should be a critical failure
- **memory-induced task-success delta** against the same agent without that memory
- **resume correctness** for checkpoints, evaluated separately from memory quality

The final separation matters: an architecture can have good memory and poor recovery, or excellent checkpointing and poor memory selection.

## Production implication: treat memory as a data pipeline

A mature memory architecture needs explicit contracts for:

```text
WRITE
what may persist?

IDENTITY
which user / project / tenant owns it?

PROVENANCE
where did it come from?

AUTHORITY
is it observation, inference, preference, or system-of-record state?

FRESHNESS
which version or event invalidates it?

RETRIEVAL
when should it be considered for W_t?

RETENTION
when must it expire or be deleted?

EVALS
how do we know it helps rather than contaminates future decisions?
```

The design question is not “which vector database do we use?” It is **which information we allow to persist, what it means, what authority it has, when it may condition a decision, and how it stops doing so when the world changes**.

The next chapter separates persisted memory from retrieval and assembly: how to recover fresh, relevant evidence, resolve conflicts, and ground decisions without confusing similarity with truth.

[^coala]: Sumers, Yao, Narasimhan, and Griffiths, [Cognitive Architectures for Language Agents](https://arxiv.org/abs/2309.02427), 2023.
[^generative-agents]: Park et al., [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442), 2023.
[^openai-sessions]: OpenAI Agents SDK, [Sessions](https://openai.github.io/openai-agents-python/sessions/), accessed 2026-09-11.
[^anthropic-memory-tool]: Anthropic, [Memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool), accessed 2026-09-11.
[^anthropic-managed-memory]: Anthropic, [Using agent memory](https://platform.claude.com/docs/en/managed-agents/memory), accessed 2026-09-11.
