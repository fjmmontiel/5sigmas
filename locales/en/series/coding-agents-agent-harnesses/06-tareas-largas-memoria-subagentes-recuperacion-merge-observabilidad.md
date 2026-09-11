---
title: "Long-running coding agents: memory, subagents, recovery, merge, and observability"
description: "How to design an agent harness that keeps durable state for hours or days, recovers work after failures, coordinates subagents, and preserves valid evidence through merge."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "coding agents, agent harness, long-running agents, durable state, memory, subagents, recovery, merge, observability"
tags:
  - AI
  - Agents
  - Software
  - Coding agents
  - Observability
---

# Chapter 6 — Long-running tasks, memory, subagents, recovery, merge, and observability

A coding agent can work for hours and still be fragile if all continuity depends on one live conversation.

Long-running tasks cross context changes, process restarts, disconnected streams, parallel workers, moving branches, and aging verification. The problem is no longer only whether the model remembers what it was doing. The harness must know **which state is still authoritative, which work actually happened, which external effects are real, which evidence is still valid, and who owns each part of the task**.

This chapter asks one concrete question:

```text
what must survive so a task can continue,
recover, delegate, and integrate without inventing continuity?
```

The answer is not “more context.” It is separating states with different lifecycles.

{{ include_html("snippets/articulos-tecnicos/coding-agent-long-task-state.html") }}

## A long-running task is a durable state machine, not an infinite conversation

In a short interaction, we can pretend conversation, plan, workspace, and execution are one object. That simplification breaks down over hours.

It is useful to separate at least four planes:

| Plane | Examples | What can invalidate it |
|---|---|---|
| Inference context | recent messages, compacted summary, selected results | context limit, reset, new model session |
| Durable control state | `task_id`, contract, DAG, ownership, blockers, stop reason | authorized amendment, work redistribution |
| Execution state | base SHA, candidate SHA, worktree, files, environment, external effects | new commit, sandbox recreation, target change |
| Evidence/provenance | tests, reviews, postconditions, approvals, trace IDs | candidate, contract, environment, or verifier change |

These planes are related, but they are not interchangeable.

If context is compacted, `candidate_sha` should not change because of that. If a process restarts, a deployment that already happened does not become undone. If the target branch advances, a perfectly preserved conversation does not make old verification fresh.

The stable unit of a long-running task should be a durable identity, for example:

```yaml
task_id: task-4812
contract_version: 4
target_ref: main
target_sha: a13f5c2
status: RUNNING
owners:
  api: worker-api
  migration: worker-db
candidate_sha: null
```

This is an illustrative structure, not a standard.

## “Memory” is not one object

Agent systems use `memory` to mean several different things:

```text
conversation history
summary / compaction state
facts or notes saved by the agent
plan and task graph
files created in the workspace
state of external systems
verification evidence
```

Putting all of these under one word hides important design decisions.

A note saying “the migration is already applied” does not carry the same authority as a postcondition that queries the actual schema. A conversation summary may remember that a PR existed, but it does not prove the PR's current head SHA.

For production systems, better questions are:

```text
who produced this state?
where does it live?
which identity/version is attached to it?
can it be reconstructed?
what invalidates it?
```

## Context, compaction, checkpoints, and durable state are not synonyms either

**Compaction** reduces or transforms the context fed back into the model. Its purpose is to keep reasoning within a token budget.

A **checkpoint** is a restore point. Depending on the runtime, it may contain conversation, plan, files, or other objects.

**Durable task state** is the authoritative state the orchestrator needs to reconstruct the task even when the process or model context changes.

You can have compaction without a complete checkpoint. You can also have a conversation checkpoint that does not include secrets, active connections, or in-memory tool state.

GitHub documents this boundary explicitly for Copilot SDK. With persistence enabled, a session can resume after restarts or container migrations, and conversation history, tool results, planning state, and artifacts are persisted. API keys and in-memory tool state are not.[^github-session-persistence]

Therefore:

```text
resume(session) ≠ restore(entire world exactly)
```

The harness needs to know which state the runtime restores and which state the application must rehydrate.

## Compaction and reset solve different problems

There is no universal context policy for long-running tasks.

Anthropic describes a concrete evolution of its long-running application-development harness. An earlier version used context resets and structured handoff artifacts between sessions. Later, with more capable models, it could sustain longer sessions and rely on automatic compaction. The useful conclusion is not that reset or compaction always wins. It is that the amount of scaffolding required depends on the model and should be reevaluated when the model changes.[^anthropic-long-running]

OpenAI currently documents automatic compaction in the Agents API harness as a way to continue workflows across multiple context windows.[^openai-agents-launch]

That is a capability of a specific harness/service, not a universal property of every model.

A useful policy separates:

```text
context continuity    → what the model needs now
handoff artifact      → the minimum another context needs to understand the work
control state         → what the system must know even if no model remembers it
workspace state       → the code and effects that actually exist
```

## A restart should not turn model memory into the source of truth

Suppose the process dies after running:

```text
alembic upgrade head
```

but before persisting “migration done” into the conversation.

After restart, there are two possible errors:

```text
1. assume it did not happen and repeat a non-idempotent mutation
2. assume it happened because the model remembers it, without observing the system
```

The fail-closed approach is to reconcile durable state with observable postconditions.

For external effects, an action ledger can record:

```yaml
action_id: db-migrate-019
intent: apply migration 20260911_03
request_fingerprint: 4db1...
started_at: 2026-09-11T09:14:20Z
observed_status: unknown
postcondition: schema_version == 20260911_03
```

After restart:

```text
if the outcome is durable and known → continue
if it can be queried → observe the postcondition
if it cannot be known safely → do not retry blindly; block/reconcile
```

This is a 5sigmas production design principle for recovery. We are not claiming that a particular provider automatically implements this ledger.

## Recovering a stream is not replaying the stream

A disconnected UI or transport does not imply that the task stopped existing.

The current OpenAI Agents API documentation provides a concrete example. Its streams do not replay missed events. To restore application state, it recommends opening a new stream and buffering incoming events, retrieving the session and saved items, rebuilding local state by `item_id`, applying buffered updates that remain relevant, and then continuing with live events.[^openai-events]

The shape matters:

```text
reconnect
   ↓
read durable history/state
   ↓
reconcile by stable identity
   ↓
apply only missing/new updates
   ↓
continue live
```

Not:

```text
reconnect → replay every command we think we missed
```

The same runtime documents that, after a restart or stream disconnect, the application should retrieve the session to discover pending `required_actions`.[^openai-manage-sessions]

The general lesson is to separate **event delivery** from **durable state**. An event is an observation of a transition. It should not be the only place where the result of that transition exists.

## An `idle` state or closed stream does not prove success

Operational states need explicit semantics.

A control model may include:

```text
RUNNING
WAITING_FOR_AUTHORITY
WAITING_FOR_ENVIRONMENT
RECOVERING
DELEGATED
INTEGRATING
VERIFYING
ACCEPTED
REWORK_REQUIRED
HAND_BACK_TO_HUMAN
FAILED
CANCELLED
```

`idle`, “no more tokens,” or “the socket closed” are runtime observations, not product success conditions.

Agents API states this explicitly for its own protocol: an idle session or closed stream does not establish success, and a completed turn does not guarantee every tool succeeded. The application still needs to inspect output and saved state.[^openai-events]

## Subagents help only when ownership and dependencies are explicit

Parallelism does not mean duplicating the same task and hoping the parent picks the better answer.

A worker should receive enough of a contract to operate without implicit parent memory:

```yaml
work_unit_id: api-pagination
owner: worker-api
depends_on: [contract-v4]
base_sha: a13f5c2
scope:
  - src/api/**
  - tests/api/**
forbidden_scope:
  - migrations/**
expected_output:
  - candidate_sha
  - changed_paths
  - validation_results
  - blockers
```

GitHub Fleet mode documents a related pattern. The parent decomposes work into todos with durable IDs and dependencies, each subagent owns one unit, workers report changes/validation/blockers, and the parent verifies the combined result. GitHub also marks Fleet mode as experimental in several SDKs and states that parallel work does not remove the need for parent reconciliation.[^github-fleet]

That is a GitHub Copilot SDK capability and guidance, not a property of all coding agents.

## Every subagent needs its own execution identity

To debug and integrate work, the system should distinguish:

```text
root_task_id
work_unit_id
agent_id / subagent_id
base_sha
workspace_id
candidate_sha
turn/run IDs
verifier evidence
```

OpenAI Agents API gives one current example of this attribution. Each subagent has its own item history, turns expose `subagent_id`, and the event stream includes coordination actions for creating subagents, sending input, waiting, and interrupting them.[^openai-multi-agent]

It also documents a useful caveat: a completed `create` or `wait` coordination action does not mean the subagent has completed its task.[^openai-multi-agent]

So the correct state is not:

```text
wait_call = done → worker = successful
```

It is closer to:

```text
worker lifecycle + output contract + verification → integration eligibility
```

## Do not attribute runtime capabilities to the subagent abstraction

The framework/provider boundary matters again.

In the current Agents API public beta, subagents inherit configured MCP tools, credentials and allowed tools, web-search settings, and access to environment files and command-line tools. They do not support function tools.[^openai-multi-agent]

That is a current restriction of this product. It does not establish that subagents in general cannot execute function tools.

A technical article should preserve this attribution:

```text
model              → inference capability
harness/runtime     → orchestration and lifecycle
provider/service    → concrete persistence/streaming/hosting
application         → ownership, business state, policies, and recovery contracts
```

## Safe parallelism needs a designed integration surface

Two workers can produce commits that Git merges cleanly while still breaking the system.

Example:

```text
worker A: changes `User.id` from int to UUID in the API
worker B: adds a cache that still indexes users by int
```

The files do not have to collide. The invariant does.

The parent therefore needs an integration phase:

```text
worker outputs
   ↓
reconcile assumptions
   ↓
integrate commits/artifacts
   ↓
new integrated candidate SHA
   ↓
run integration-level verification
```

A clean merge is evidence about Git mechanics. It is not proof of semantic consistency.

## The target branch can move while workers are running

Suppose:

```text
t0: target main = A
worker-1 starts from A
worker-2 starts from A

t1: main advances to B
workers produce W1 and W2 on A
```

Before merge, the harness must explicitly decide which candidate it wants to verify:

```text
I = integrate(B, W1, W2)
```

Tests run on `W1@A` are not automatically evidence for `I@B`.

This is the freshness rule from chapter 5 applied to fan-out/fan-in:

```text
candidate identity changed → dependent evidence becomes stale
```

Evidence may be reused only when dependency is modeled explicitly and the change cannot affect it. If dependency is unknown, revalidate fail-closed.

## A worker checkpoint and an integration checkpoint are different objects

A worker checkpoint may be enough to resume that worker's branch:

```text
worker_id + base_sha + workspace + plan + local evidence
```

The integration point additionally needs:

```text
target_sha
worker candidate SHAs
merge/rebase operations
resolved conflicts
combined diff digest
integration candidate SHA
integration evidence
```

This avoids a common error: treating the whole task as recoverable merely because every worker can resume its own conversation.

## Useful observability reconstructs causality, not just logs

For a long-running task, “we have logs” is not enough.

A typical production question is:

```text
why was this candidate SHA accepted if the migration worker had failed 40 minutes earlier?
```

Answering it requires joining several identities:

```text
task_id
contract_version
root turn/run
subagent/work_unit
workspace + base_sha + candidate_sha
tool/action_id
status transition
retry/recovery relation
verifier/evidence IDs
integration candidate
stop_reason
```

OpenAI Agents API exposes session/turn/item histories, subagent attribution, and traces covering model responses, tool calls, and delegated work.[^openai-observability][^openai-tracing]

Its documentation also states useful limits: `usage` is best-effort, can be `null` or change, and is not the final bill. During the public beta, the API does not expose tracing configuration or external trace exporters.[^openai-observability][^openai-tracing]

This illustrates why provider observability and application observability are separate layers.

## Long-task metrics: separate activity from progress

Counting tool calls or tokens may measure work without measuring progress.

More informative operational metrics include:

| Metric | Question it answers |
|---|---|
| time in each state | where is the task actually waiting? |
| work units ready/running/blocked | is the DAG progressing or stuck? |
| retries by cause | are we recovering or repeating the same failure? |
| stale evidence count | how much verification is invalidated by integration? |
| integration conflict rate | does decomposition create clean ownership? |
| recovery success | can work continue after restart/disconnect without intervention? |
| handback reason | which authority/capability is missing? |
| cost per accepted outcome | what does valid completed work cost, not just token generation? |

The exact metrics depend on the product. The principle is to bind activity to states and verifiable outcomes.

## Worked example: three workers and a moving target

Task:

```text
Add `external_id` to accounts.
Expose it through REST.
Migrate existing data.
Update documentation and tests.
```

Initial contract:

```yaml
task_id: account-external-id
contract_version: 2
target_sha: A
```

The parent creates:

```text
W1 API        base=A   owns src/api/** + tests/api/**
W2 migration  base=A   owns migrations/** + tests/db/**
W3 docs       base=A   owns docs/**
```

Each worker returns:

```yaml
work_unit_id: migration
base_sha: A
candidate_sha: M7
changed_paths:
  - migrations/20260911_external_id.py
verification:
  migration_up: pass
  migration_down: pass
blockers: []
```

While they work, `main` advances from `A` to `B`.

The parent should not conclude:

```text
W1 pass + W2 pass + W3 pass → merge
```

It should construct the integrated candidate:

```text
I9 = integrate(B, W1, W2, W3)
```

Then:

```text
1. recompute changed paths and cross-cutting invariants
2. invalidate evidence that depends on A/W1/W2/W3 where applicable
3. run integration tests and contract checks on I9
4. review semantic conflicts and target changes
5. accept only when final evidence belongs to I9
```

If the parent process dies after creating `I9`, recovery must reconstruct that `I9` exists and which evidence is fresh. Rereading three worker conversations is not a substitute for that ledger.

## Correct recovery must be repeatable

A useful architecture test is:

```text
if I kill the orchestrator right now,
can another process decide exactly what to do next without guessing?
```

Getting close to “yes” requires at least:

```text
stable identities
durable control state
workspace/candidate identities
action and effect provenance
worker ownership + dependencies
pending authority/actions
evidence freshness
explicit stop reasons
```

And a reconciliation rule:

```text
persisted state + observed external state → next safe transition
```

Not:

```text
last model message → guess next action
```

## Trade-off: durability and parallelism cost complexity

Persisting every transition, maintaining a DAG, isolating workspaces, retaining provenance, and revalidating integration all add harness work.

Not every task needs it.

For a five-minute fix in a local repository, one agent, one worktree, and a test suite may be enough. For a multi-hour migration with remote effects and three workers, relying only on the transcript is an unnecessary bet.

The practical question is:

```text
how much state can be lost before the system has to guess?
```

The longer the task, the more parallelism it uses, the more authority its tools have, and the more expensive it is to repeat effects, the more valuable durable control and evidence state become.

## The architecture should become simpler when the model changes

A harness should not accumulate mechanisms merely because they were useful once.

Anthropic's long-running coding work shows that model changes can shift which scaffolding adds value. Strategies needed for an earlier model generation can become overhead for a newer one.[^anthropic-long-running]

Likewise, a managed harness may take responsibility for persistence, compaction, subagent lifecycle, or tracing that a thin/vanilla implementation would have to build itself.

Moving responsibility into a runtime does not remove the need to understand its boundary. The application still owns its business contracts, work ownership, candidate identity, and success criteria.

## Production implication: continuity means being able to reconstruct truth

A long-running task is not reliable because the model can keep talking after ten hours.

It is reliable when, after a reset, restart, disconnect, or fan-in, the system can answer:

```text
which task are we executing?
which contract is current?
who owns each unit of work?
which effects already happened?
which candidate is current?
which evidence belongs to that candidate?
what is blocked?
which transition is safe now?
why would we accept or hand back the task?
```

That is the step from a persistent coding assistant to an operable harness.

Useful continuity is not about preserving every token. It is about preserving enough authoritative state to **reconstruct the truth of the work** and reverify anything that is no longer valid.

## Primary references

[^openai-agents-launch]: OpenAI, [Introducing the Agents API](https://openai.com/index/introducing-the-agents-api/), September 10, 2026. Used for first-party claims about long sessions, compaction, subagents, and the harness/environment boundary. Customer testimonials and marketing benchmark numbers are deliberately not used as general evidence.
[^openai-events]: OpenAI API Docs, [Agents API — Events and items](https://developers.openai.com/api/docs/guides/agents-api/sessions/events). Used for current event/item identity semantics, turn/item state, and the documented state-reconstruction algorithm after a stream disconnect; streams do not replay missed events.
[^openai-manage-sessions]: OpenAI API Docs, [Agents API — Manage sessions](https://developers.openai.com/api/docs/guides/agents-api/sessions/manage). Used for `requires_action`, recovery of pending actions after restart/disconnect, and session lifecycle semantics.
[^openai-multi-agent]: OpenAI API Docs, [Agents API — Multi-agent](https://developers.openai.com/api/docs/guides/agents-api/multi-agent). Used only for current product capabilities: subagent histories, `subagent_id`, coordination items, inheritance of MCP/allowed tools, and the current function-tool limitation.
[^openai-observability]: OpenAI API Docs, [Agents API — Observability and usage](https://developers.openai.com/api/docs/guides/agents-api/observability). Used for session/turn/item observability and the best-effort `usage` caveats.
[^openai-tracing]: OpenAI API Docs, [Agents API — Tracing](https://developers.openai.com/api/docs/guides/agents-api/tracing). Used for the current trace/span semantics and public-beta limits on tracing configuration and external exporters.
[^anthropic-long-running]: Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps), March 24, 2026. Used as first-party evidence for handoff artifacts, context reset vs compaction, planner/generator/evaluator separation, and the fact that useful scaffolding changes with model capability. Its cost and duration figures are not generalized to other setups.
[^github-session-persistence]: GitHub Docs, [Copilot SDK — Session resume and persistence](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-persistence). Used to distinguish persisted state from state that must be reinjected when a session resumes.
[^github-fleet]: GitHub Docs, [Copilot SDK — Fleet mode](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/fleet-mode). Used for its current ownership/dependency pattern, worker result contract, and parent verification guidance, while preserving its experimental status.