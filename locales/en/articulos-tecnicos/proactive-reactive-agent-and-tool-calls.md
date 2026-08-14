---
title: Proactive and reactive agents and tool calls
description: "How to design agents that acknowledge work immediately, execute tools asynchronously, preserve durable state and deliver results proactively without coupling conversation timing to operation timing."
date: 2026-08-03
keywords: "AI agents, tool calling, proactive agents, reactive agents, asynchronous tools, durable execution, idempotency, agent runtime, delivery envelope"
article_state: published
tags:
  - AI
  - Agents
  - Tool Calling
  - Realtime
  - Architecture
---

# Proactive and reactive agents and tool calls

> **Core idea:** a model turn should not be the clock that governs slow or asynchronous work.  
> **Runtime rule:** accept quickly, execute durably, and deliver the result when the interaction surface is ready.  
> **Failure mode:** coupling a tool's technical completion directly to the model's next utterance.

Many agent systems begin with a synchronous assumption:

```text
user request
→ LLM decides tool
→ tool blocks
→ LLM waits
→ tool returns
→ LLM answers
```

That is acceptable for a local lookup that finishes in tens of milliseconds. It becomes fragile when the work takes seconds, minutes or longer, when several operations run in parallel, or when the user continues interacting while the work is still active.

A robust runtime separates **conversation**, **operation execution** and **result delivery**.

{{ include_html("snippets/articulos-tecnicos/async-tool-panorama.html") }}

## 1. Reactive acknowledgement and proactive completion are different events

When a user asks for slow work, the agent usually needs to respond immediately so the interaction does not feel frozen:

> “I’ll check that now. You can keep going while I do it.”

That utterance is **acceptance**, not completion.

The durable operation starts after acceptance and can outlive the current model turn. When it reaches a terminal state, the system creates a result that may be delivered immediately, attached to a later turn, grouped with other results, or suppressed if it is no longer relevant.

A useful state model is:

```text
request
→ accepted
→ running
→ terminal(success | failure | cancelled)
→ delivery_pending
→ delivered | superseded | expired
```

The key distinction is that `terminal` belongs to the operation while `delivered` belongs to the interaction surface.

{{ include_html("snippets/articulos-tecnicos/tool-lifecycle.html") }}

## 2. The model should not own durable operation state

The conversation transcript is useful context. It is not a durable workflow engine.

If a process restarts after a payment succeeds but before the assistant announces success, a transcript-only design may rerun the payment or lose the result. If a callback arrives twice, the model cannot reliably infer whether the side effect already happened. If the user changes topic while a tool is active, the operation should not disappear merely because the next prompt no longer mentions it.

Durable coordination should track explicit objects such as:

```python
@dataclass
class Operation:
    operation_id: str
    session_id: str
    turn_id: str
    kind: str
    status: Literal[
        "accepted", "running", "succeeded", "failed", "cancelled"
    ]
    idempotency_key: str
    started_at: datetime | None
    completed_at: datetime | None
    result_ref: str | None
    error: str | None
```

The model can decide **what** work should happen. The runtime owns whether it has been accepted, started, completed, retried or cancelled.

### Idempotency is part of the tool contract

Production systems include retries, ambiguous timeouts and at-least-once event delivery. The tool layer should therefore support an idempotency key or an equivalent mechanism:

```python
result = await payments.create_transfer(
    request=transfer,
    idempotency_key=operation.idempotency_key,
)
```

A model retry must not silently become a duplicate side effect.

## 3. A tool result should become a delivery object

Technical completion should not write directly to the user channel.

Instead, the runtime creates a `DeliveryEnvelope`:

```python
@dataclass
class DeliveryEnvelope:
    delivery_id: str
    session_id: str
    operation_id: str
    payload: dict
    priority: Literal["low", "normal", "urgent"]
    status: Literal["pending", "speaking", "delivered", "suppressed"]
    created_at: datetime
    expires_at: datetime | None = None
```

The interaction surface decides when the envelope can be surfaced.

This separation solves several common races:

- an operation finishes while the user is still speaking;
- two operations finish in the opposite order from which they started;
- a result arrives after the conversation changed topic;
- the result is technically generated but not actually heard/read;
- a callback is delivered twice;
- the channel disconnects before delivery.

{{ include_html("snippets/articulos-tecnicos/target-architecture.html") }}

## 4. One component should own conversational delivery

A tool callback should not generate user-visible speech directly. It publishes state/events. A single interaction surface arbitrates human-visible output.

At a high level:

```text
Interaction Surface
  ↕ user turns / deliveries
Durable Coordination
  ↕ operation events
Cognitive Execution Plane
  ↕ tools, RAG, workers, workflows
External systems
```

### Interaction Surface

Owns the human-facing channel:

- turn detection;
- current response state;
- interruption/barge-in;
- playback state;
- acknowledgement;
- pending-result delivery;
- priority policy.

### Cognitive Execution Plane

Owns slow or expensive work:

- reasoning;
- tool calls;
- retrieval;
- retries;
- compensation;
- validation;
- parallel routines.

### Durable Coordination

Owns truth about long-lived operations:

- operation state;
- idempotency keys;
- event ordering;
- locks/leases;
- pending deliveries;
- cancellation/supersession;
- recovery after restart.

The result is not “the LLM waits for a tool.” It is “the interaction surface and the execution plane share a durable protocol.”

## 5. Reactive and proactive policy should be explicit

A runtime can classify an operation when it is accepted:

```python
@dataclass
class OperationPolicy:
    may_continue_across_turns: bool
    may_interrupt: bool
    delivery_priority: str
    stale_after_s: float | None
    cancellation_scope: str
```

Examples:

- a database lookup may continue across turns and wait for a quiet delivery window;
- a bank transfer may require explicit confirmation before execution;
- a safety-critical warning may be allowed to interrupt;
- a recommendation computed for an old user preference may become stale and be suppressed.

The model can supply semantic context, but these rules should not be improvised from scratch on every turn.

## 6. Cancellation must be selective

“User interrupted” and “operation cancelled” are not the same event.

A user may speak over the agent because they want to ask another question. The runtime should stop the current response/playback quickly, but the durable operation can continue unless the new intent explicitly invalidates it.

Likewise, cancelling one response should not cancel every operation started by that session.

A useful hierarchy is:

```text
session
  ├─ turn
  │   ├─ response
  │   └─ operation A
  └─ operation B (cross-turn)
```

Cancellation should target the smallest state object justified by the new intent.

## 7. Batch work should create one coherent completion

One user request can fan out into several operations:

```text
check availability
+ fetch customer data
+ calculate alternative
```

If every callback talks independently, the interaction becomes noisy and out of order.

Group operations by a semantic `batch_id` and create a final delivery only when the batch reaches the chosen completion condition:

```python
async def on_operation_terminal(result: OperationResult):
    await store.record_result_once(result)
    batch = await store.mark_member_complete(
        batch_id=result.batch_id,
        operation_id=result.operation_id,
    )

    if not batch.ready_for_final_delivery:
        return

    await delivery_store.create_once(
        delivery_key=f"batch:{batch.batch_id}:final",
        payload=summarize(batch),
    )
```

This gives the conversation one coherent conclusion while retaining the individual operation traces.

## 8. Delivery acknowledgement should reflect what the human actually received

For text UIs, “delivered” may mean the message reached the client. For voice, generated audio and heard audio are different states.

The system should distinguish:

```text
result_ready
→ response_generated
→ audio_buffered
→ playback_started
→ playback_confirmed
→ delivered
```

If a user interrupts before the final sentence is heard, the result should not be marked delivered simply because TTS generated it.

This becomes essential for avoiding duplicate or missing follow-ups after barge-in, reconnects and retries.

{{ include_html("snippets/articulos-tecnicos/runtime-conversational.html") }}

## 9. What to measure

A single “tool latency” number is insufficient. Useful metrics include:

| Metric | Meaning |
|---|---|
| `request_to_acceptance_ms` | How quickly the system acknowledges the work |
| `acceptance_to_operation_start_ms` | Internal scheduling delay |
| `operation_duration_ms` | External dependency/work duration |
| `terminal_to_delivery_ready_ms` | Aggregation/rendering delay |
| `delivery_ready_to_visible_ms` | Conversation-policy wait |
| `duplicate_side_effect_rate` | Idempotency failures |
| `duplicate_delivery_rate` | Repeated completion messages |
| `stale_delivery_rate` | Results surfaced after relevance expired |
| `cancel_reconciliation_rate` | Correct resolution after intent changes |
| `restart_recovery_success_rate` | Durable state survives process failure |

Every trace should correlate at least `session_id`, `turn_id`, `operation_id`, `batch_id`, `response_id` and `delivery_id`.

## 10. What to test before production

The important tests are temporal conflicts, not only ideal conversations:

- callback arrives twice;
- process restarts after the external effect but before delivery;
- user changes topic while work is running;
- user explicitly cancels one operation;
- two operations complete out of order;
- delivery becomes stale;
- channel disconnects with a pending result;
- one operation fails while the rest of the batch succeeds;
- authorization expires between acceptance and execution;
- model response is interrupted but the durable operation should survive.

Assertions should include state and side effects:

```python
assert operation.side_effect_count == 1
assert delivery.final_count == 1
assert operation.status == "succeeded"
assert delivery.status in {"delivered", "pending"}
assert cancelled_response.did_not_cancel_unrelated_operation
```

## 11. The architecture in one sentence

A proactive/reactive agent is not an LLM that “remembers to tell you later.” It is a runtime where **acceptance, durable execution and human-visible delivery are separate state machines connected by explicit identifiers and idempotent events**.

> **Technical completion creates a pending delivery. The interaction surface decides when that delivery should become part of the conversation.**

## Sources

- OpenAI Agents SDK — tool/function calling and realtime sessions.
- OpenAI Realtime API documentation — asynchronous session events and function calls.
- Pipecat function-calling/control-frame documentation — asynchronous function execution and grouped calls.
- Twilio Media Streams — media buffering, `mark` and `clear` semantics for bidirectional voice streams.

## Frequently asked questions

**Why not simply wait for the tool before generating a response?**  
Because slow tools block the interaction, do not survive turn changes cleanly and couple the user experience to external dependency latency.

**Why is the transcript not enough as operation state?**  
Because retries, restarts and ambiguous side effects require explicit durable identifiers and statuses that should not be reconstructed from natural language.

**Should a tool callback ever speak directly to the user?**  
Preferably no. It should publish a result; one interaction surface should decide how and when human-visible delivery occurs.

**What is the key reliability primitive?**  
Idempotency for side effects plus durable, independently acknowledged delivery state.
