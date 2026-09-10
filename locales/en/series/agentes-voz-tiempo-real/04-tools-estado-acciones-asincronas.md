---
title: "Tools and state: execute actions without breaking the conversation"
description: "How to design tool calls, conversational state, asynchronous actions, cancellation, idempotency, and recovery in realtime voice agents."
date: 2026-09-10
date_modified: 2026-09-10
tags:
  - AI
  - Voice
  - Realtime
  - Agents
  - Production
---

# Chapter 4 — Tools and state: execute actions without breaking the conversation

A voice agent can stop speaking within milliseconds while an action it already started remains impossible to undo. That distinction is the core of this chapter.

When a user says “book the table,” “send the email,” or “cancel my order,” the system is no longer only managing dialogue. It is running a distributed workflow with state, external effects, retries, interruptions, and results that may arrive after the user has moved to another topic.

The question is specific: **how do you execute tools and long-running actions without confusing conversational state with real business state, or treating a voice interruption as proof that an external action was cancelled?**

## A tool call is not the external effect

Separate at least four events:

```text
1. tool_requested     the model proposes a call
2. action_admitted    the application validates and accepts the intent
3. effect_committed   the external system confirms the effect
4. result_observed    the agent receives a usable result
```

They are not equivalent.

{{ include_html("snippets/articulos-tecnicos/voice-action-lifecycle.html") }}

The model can emit the same tool call twice. The application can admit an action and lose the connection before receiving the result. An external provider can complete a payment after the user interrupts the agent’s speech. A result can arrive after control has already handed off to another agent.

In production, **the authoritative boundary for an action must live outside model-generated text**.

## Separate four kinds of state

Calling everything “context” hides important failure modes. A realtime agent normally has at least these layers:

| State | Example | Who should be authoritative |
|---|---|---|
| Model context | messages, tool calls, tool results | runtime/provider, depending on architecture |
| Session state | active turn, active agent, `speech_id`, ephemeral preferences | runtime + application |
| Durable application state | `operation_id`, idempotency key, workflow status | application storage |
| System of record | order, booking, transfer, ticket | domain API/database that owns the effect |

An in-memory value such as `userdata` can coordinate a session. It does not turn that memory into a durable ledger.

After a process crash, you should be able to reconstruct what happened from durable state and the system of record. LLM history can help explain the conversation, but it should not be the authority on whether a bank transfer happened.

## The minimum action contract

Before a mutating tool runs, define a stable identity and an explicit policy:

```text
turn_id             identifies the conversational turn
provider_call_id    identifies the call emitted by the model
operation_id        identifies the business intent
idempotency_key     deduplicates equivalent retries
status              admitted | running | committed | failed | unknown
```

A `provider_call_id` is not necessarily a valid business idempotency key. A second model attempt may produce a new call ID for the same human intent.

A practical design assigns or derives `operation_id` in the application layer after validating arguments, user identity, permissions, and preconditions. That ID then travels through logs, traces, callbacks, and the external system.

## Schema validation is not authorization

A tool schema prevents some shape errors. It does not establish business semantics or permission.

Before admitting an action, validate the constraints relevant to the domain:

- user identity and authorization
- normalized arguments
- current resource preconditions
- whether explicit confirmation is required
- amount, frequency, or scope limits
- idempotency and duplicate detection
- deadline and retry policy
- which outcomes can be compensated and which are irreversible.

The tool declaration describes what the model **may request**. The application remains responsible for deciding what it **may execute**.

## Cancelling speech, generation, and side effects are different operations

Voice systems often perform several cancellations at once, but they do not mean the same thing:

```text
cancel model output
cancel TTS synthesis
clear queued/playout audio
cancel local coroutine
cancel provider request
cancel external business action
```

The first four can be fast and local. The last one may not exist at all.

If the agent starts `create_booking()` and the user barges in with “wait,” there are three materially different states:

1. **The action has not been admitted yet.** Do not start it.
2. **It is running and the provider offers a real cancellation primitive.** Request cancellation and wait for a confirmed state.
3. **The effect is already committed, or safe cancellation does not exist.** Interrupt the conversation, then reconcile and communicate the real outcome.

Never say “cancelled” merely because the coroutine waiting for the response was cancelled.

OpenAI Realtime provides a useful example at the model/audio layer. `response.cancel` cancels an in-progress response and, on WebRTC/SIP, `output_audio_buffer.clear` cuts off output audio. Those events do not cancel a booking, payment, or other side effect executed by the application.[^openai-realtime-cancel]

## Barge-in while a tool is still running

A user interruption should not erase information about an admitted action.

Consider this sequence:

```text
T0  user: "book for two at 21:00"
T1  model requests book_table
T2  app admits operation_id=op_42
T3  restaurant API is still processing
T4  user: "actually make it 21:30"
T5  op_42 result arrives: 21:00 booking confirmed
```

The result of `op_42` remains true even though the conversational turn that launched it is now stale.

The application must decide how to handle that late result. A safe pattern is to:

- persist it first
- determine whether it is still relevant to the current goal
- avoid blindly inserting it as if it belonged to the newest turn
- reconcile any real effect before launching a conflicting second action
- tell the user what actually happened, not what the dialogue expected to happen.

A `turn_id` helps detect that the conversation advanced. An `operation_id` prevents the effect from being lost.

## Async does not mean fire-and-forget

A background action still needs an owner.

For every long-running operation, you should know:

```text
who created it
which user/resource it affects
its deadline
what may be retried
which event completes it
what happens if the active agent changes
what happens if the user disconnects
what happens if the process dies
how its result can be observed again
```

If no component can answer those questions after a restart, the operation is not robustly asynchronous. It has merely been detached from the original `await`.

## LiveKit Agents: session tooling is not durable business state

LiveKit Agents supports ordinary tools and asynchronous tools that allow the conversation to continue while long-running work completes.[^livekit-tools]

Inside a tool, `RunContext` exposes the current `session`, `function_call`, `speech_handle`, and `userdata`.[^livekit-function-tools] That removes session plumbing, but it does not move the system-of-record boundary. `userdata` is workflow/session state, not a persistence guarantee for business effects.

Handoffs introduce an important ownership distinction. Async tools attached to an `Agent` belong to that agent, and LiveKit documents that pending updates from those tools are dropped when a handoff occurs. If an operation must survive the agent that launched it, an `AsyncToolset` can instead be attached to `AgentSession`, allowing its final result and updates to reach whichever agent is active when it finishes.[^livekit-async-tools]

That solves **runtime ownership**. It does not replace idempotency keys, durable workflow state, or reconciliation with the external API.


### Runtime cancellation and duplicate handling are not business idempotency

LiveKit async tools finish by default even when the user moves on. To let the LLM stop a running call, the tool must explicitly opt in with `ToolFlag.CANCELLABLE`.[^livekit-async-tools] That cancellation acts on work the runtime controls; it does not prove that an external API reversed an effect it already accepted or committed.

LiveKit also documents duplicate-call policies: `allow`, `reject`, `replace`, and `confirm`. Duplicate detection is based on the **tool name, not its arguments**; `replace` cancels the active call before starting the replacement and requires the active tool to be cancellable.[^livekit-async-tools]

That is execution control inside the agent, not business deduplication. Two calls with the same tool name may represent different operations, while two tool-call IDs may represent the same human intent. The durable boundary remains `operation_id` + idempotency key + system of record.

### Tasks and handoffs change turn ownership

An `AgentTask` is a focused objective that takes control of the session until it returns a result. `TaskGroup` sequences such tasks while sharing context within the group.[^livekit-tasks]

A handoff changes the active agent. LiveKit lets session `userdata` remain available, while a new agent receives fresh conversation history by default unless `chat_ctx` is passed explicitly; the complete session history remains available through `session.history`.[^livekit-handoffs]

Therefore, “same session ID” does not imply “same effective prompt,” and a late callback should not automatically be attributed to the agent that launched it.

## Pipecat: function calls inside an explicit pipeline

Pipecat integrates function calling with its LLM flow, and its context aggregators store function calls and results in conversational context.[^pipecat-functions]

`FunctionCallParams` exposes fields including `function_name`, `tool_call_id`, arguments, context, and `result_callback`. The application executes the handler and returns data through that callback.[^pipecat-functions]

Pipecat documents two useful behaviors:

- with `cancel_on_interruption=True`, the documented default, the function call participates in the flow that waits for its result
- with `cancel_on_interruption=False`, the call is treated as asynchronous, the conversation can continue, and the eventual result is injected into context as a developer message that triggers another LLM inference.[^pipecat-functions]

Async functions can also emit intermediate results with `is_final=False` before sending the final result.[^pipecat-functions]


The current API makes this decision **per tool**. With `@tool_options(cancel_on_interruption=False, cancellable_by_llm=True, timeout_secs=...)`, an asynchronous function can let the conversation continue while it runs and also allow the model to request cancellation when the work is no longer relevant. Pipecat then advertises a tool-specific `cancel_<name>` function. A `tool_call_id` is only needed to select one call when multiple instances of the same tool are in flight. The older service-wide `enable_async_tool_cancellation` flag is deprecated and will be removed in 2.0.0.[^pipecat-functions]

`timeout_secs` remains the per-tool deadline and overrides `function_call_timeout_secs` for that function. If the handler exceeds the deadline, Pipecat cancels it by raising `asyncio.CancelledError`. The deadline covers the handler itself, not work that the handler detached into a separate task.[^pipecat-functions]

These primitives control execution Pipecat owns. Cancelling the handler or its async call does not prove that a remote side effect already submitted was reversed. The contract with the external API or worker must establish the actual outcome.

That is a useful primitive for experiences such as “I’m still checking.” It does not make the underlying side effect durable, idempotent, or compensable.

### `app_resources` shares references; it does not provide persistence

Pipecat can pass `app_resources` through `PipelineTask` so function handlers share database connections, API clients, or application objects. Its documentation states that the resources are passed by reference and that the framework does not copy or clear them.[^pipecat-functions]

This is dependency injection, not durable storage.

## Vanilla/thin Python: maximum explicitness, maximum ownership

Direct SDKs and protocols let you define exactly the boundaries your product needs. They also make the application responsible for those boundaries.

Beyond transport, media, buffering, turn-taking, and cancellation from the earlier chapters, a vanilla implementation must own here:

- tool registry and schemas
- validation, authorization, and confirmations
- provider-call → business-operation mapping
- durable state machine
- idempotency keys
- timeouts, retries, and retry budgets
- bounded concurrency and backpressure
- cancellation and compensation
- late-result correlation
- crash persistence and recovery
- handoff/session migration
- tracing, audit log, and replay
- race and partial-failure tests
- workers, queues, and scaling for long-running actions.

Fewer framework layers can mean more control. **They do not mean less system to build.**

## The state machine must survive a restart

For important external effects, model states that can be reconstructed:

```text
REQUESTED
  ↓ validate + authorize
ADMITTED
  ↓ persist operation_id + idempotency_key
RUNNING
  ├──→ COMMITTED
  ├──→ FAILED_RETRYABLE
  ├──→ FAILED_FINAL
  └──→ UNKNOWN
```

`UNKNOWN` is a necessary state. It appears when the request may have reached the provider but the response was lost.

Do not automatically replay a non-idempotent operation from `UNKNOWN`. First query the system of record by `operation_id`, idempotency key, or domain identifier. If the provider offers no reconciliation mechanism, that risk is part of the product design.

## A retry needs idempotency and a budget

“Retry three times” is not a complete strategy.

A safe retry policy answers:

- Is the operation idempotent?
- Does the provider honor the same idempotency key across attempts?
- Which failures are retryable?
- What is the total user/business deadline?
- Is there backoff and jitter?
- Can a second worker run the same job concurrently?
- How do we know whether the previous attempt committed?

Repeating reads can be cheap. For mutations, a timeout after sending the request can mean “the response failed,” not “the effect failed.”

## Compensation is not cancellation

Some committed effects can be reversed only by another operation. That is **compensation**.

```text
create_booking(op_42)  → committed
cancel_booking(op_43)  → committed
```

`op_43` does not erase the history of `op_42`; it creates another business transition.

That distinction matters for auditability, payments, bookings, and other side-effecting systems. If the user interrupts after commit, compensation may be the correct next action. Pretending the first action never happened is not.

## Tools need backpressure too

An agent can accept work faster than its dependencies can process it. If every tool call opens an unbounded coroutine or job, bursts turn the implicit queue into memory pressure, connection pressure, or rate-limit failures.

Define limits per constrained resource:

```text
max concurrent operations
max queued operations
per-user/per-tenant limits
deadline before admission
policy: reject | queue | coalesce | degrade
```

Coalescing may be valid for repeated reads. Combining two mutations can change semantics. The domain must own that decision; it cannot be a generic framework rule.

## Gate late results for relevance

A valid result does not always deserve immediate speech.

Before a late callback becomes audible output, ask at least:

```text
Does it belong to the same user and logical session?
Was the result already communicated?
Is the conversational goal still current?
Does a newer turn contradict it?
May the active agent disclose it?
Does reconciliation need to happen first?
```

Separating the **durable result** from the **conversational response** prevents an old callback from taking over the current turn.

## Observability: correlate conversation and effect

A useful trace does not stop at `tool_called`.

Record, while avoiding unnecessary secrets or PII:

```text
session_id / conversation_id
turn_id
model response id
provider tool_call_id
operation_id / idempotency_key
admission timestamp
external request span
commit/reconcile timestamp
result delivery timestamp
active agent at delivery
spoken acknowledgement id
```

That lets production debugging answer concrete questions:

- Did the model duplicate the request, or did our retry layer duplicate it?
- Did the user hear confirmation for an action that never committed?
- Did the operation finish after barge-in?
- Did a handoff lose the result?
- Did a restart leave an action in `UNKNOWN`?

## Evals and replay: test races, not only happy paths

A tool-calling test that only asks “did the model select the right function?” is insufficient for realtime systems.

Add deterministic scenarios such as:

1. barge-in before `ADMITTED`.
2. barge-in after `RUNNING`.
3. timeout after sending a mutation.
4. duplicate result.
5. reconnect while the action remains active.
6. handoff before an async tool completes.
7. crash between `COMMITTED` and user acknowledgement.
8. late result after intent changes.
9. two concurrent tool calls against the same resource.
10. retry with and without provider idempotency support.

The assertion is not just the final sentence. Check durable state, number of side effects, causal order, and what audio the user actually heard.

## LiveKit, Pipecat, or vanilla: choose the boundary you need to control

There is no universal winner here.

| Need | LiveKit Agents | Pipecat | Vanilla/thin Python |
|---|---|---|---|
| Tool calling | tools on `Agent`/`AgentSession`; `RunContext` connects tool and session | handlers + `FunctionCallParams` integrated with LLM/context aggregators | app-designed provider adapters and contracts |
| Background/async | async tools; `AsyncToolset` can survive handoffs | `cancel_on_interruption=False` continues and reinjects results | application scheduler/queue/callback protocol |
| Ephemeral state | `userdata`, chat context, session history | `LLMContext`, aggregators, `app_resources` | application structures |
| Durable business state | application responsibility | application responsibility | application responsibility |
| Handoff/result ownership | explicit agent/task/session primitives | depends on pipeline, context, and app logic | completely explicit |
| Idempotency/reconciliation | domain/application | domain/application | domain/application |
| Low-level protocol control | lower if you accept runtime primitives | high at processor/frame level | maximum control and maximum implementation burden |

### Choose LiveKit Agents when

`AgentSession` is your natural unit, integrated tools/tasks/handoffs fit the workflow, and its async-tool ownership semantics match your needs. Keep durable business state external, and use `AsyncToolset` specifically when the operation should outlive the agent that launched it.

### Choose Pipecat when

You want an explicit pipeline and granular control over when function results return to context, including calls that continue through interruptions and report intermediate updates. Keep the source of truth for side effects outside conversational context.

### Choose vanilla/thin when

You need a highly specific durable action state machine, direct provider/protocol integration, cancellation or replay semantics not supplied by a runtime, or experiments where every boundary must be observable. In return, your application owns scheduling, persistence, retries, cancellation, reconciliation, tracing, testing, and scaling.

### Use a hybrid when

The realtime runtime already solves media, session, and turn-taking, while the business stack already has a durable workflow engine or job platform. The voice tool can **admit** an operation into that system, receive an `operation_id`, and observe progress without making the realtime process the owner of a multi-minute workflow.

That boundary is usually cleaner than forcing a long-running operation to live inside the same coroutine serving the voice turn.

## Production rule

The chapter reduces to one ownership rule:

> **The model proposes; the application admits; the system of record confirms; the conversation communicates.**

With those responsibilities separated, interruption, retry, handoff, and restart can change the conversation without rewriting business reality.

When they are mixed together, the agent can sound confident while its internal state has already diverged from the real world.

## What to measure before optimizing

For each tool class, capture distributions and rates rather than only an average:

- admission latency
- time to commit or result
- timeout and retry rates
- duplicate-suppression rate
- operations left in `UNKNOWN`
- late results after turn changes
- cancellation requested vs cancellation confirmed
- compensations
- handoffs with pending operations
- reconciliation failures
- time from commit to audible acknowledgement.

Do not compare different runtimes under different workloads, providers, or policies and label the delta “framework overhead.” To attribute overhead, hold hardware, network, provider/model, external action, load, turn-taking policy, and persistence strategy constant.

## Conclusion

Tools turn a voice agent into a system that changes external state. At that point, correctness is no longer just choosing the right function.

You need to separate conversational context, session state, durable state, and the system of record; distinguish audio cancellation from side-effect cancellation; design idempotency and reconciliation; bound work; and decide what happens when results arrive after an interruption, handoff, or restart.

LiveKit Agents and Pipecat provide useful primitives at different boundaries. Vanilla/thin Python leaves those boundaries to the application. None of them remove the business problem: **an external effect needs a durable owner independent of whatever sentence the agent is speaking at that moment**.

---

[^livekit-tools]: LiveKit Documentation, *Tool definition and use*. https://docs.livekit.io/agents/logic/tools/
[^livekit-function-tools]: LiveKit Documentation, *Function tools — RunContext*. https://docs.livekit.io/agents/logic/tools/definition/
[^livekit-async-tools]: LiveKit Documentation, *Async tools*. https://docs.livekit.io/agents/logic/tools/async/
[^livekit-tasks]: LiveKit Documentation, *Tasks and task groups*. https://docs.livekit.io/agents/logic/tasks/
[^livekit-handoffs]: LiveKit Documentation, *Agents and handoffs*. https://docs.livekit.io/agents/logic/agents-handoffs/
[^pipecat-functions]: Pipecat Documentation, *Function Calling*. https://docs.pipecat.ai/pipecat/learn/function-calling
[^openai-realtime-cancel]: OpenAI API Reference, *Realtime client events — response.cancel / output_audio_buffer.clear*. https://platform.openai.com/docs/api-reference/realtime-client-events/conversation/item/create
