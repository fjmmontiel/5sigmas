---
title: Reactive–proactive voice agents
description: "How to combine immediate spoken acknowledgements with asynchronous tool execution and proactive result delivery without blocking the conversation or duplicating side effects."
date: 2026-08-04
keywords: "voice agents, proactive voice agent, reactive voice agent, realtime AI, asynchronous tools, barge-in, proactive delivery, Twilio, TTS playback"
article_state: published
tags:
  - AI
  - Voice
  - Agents
  - Realtime
  - Tool Calling
---

# Reactive–proactive voice agents

> **Problem:** a spoken conversation runs at human timing while tools and workflows can take seconds or minutes.  
> **Design goal:** acknowledge quickly, keep the conversation alive, and inject completed work only when there is a safe delivery window.  
> **Invariant:** an operation may finish while the agent is speaking, while the user is speaking, or while another turn is already active.

A voice agent becomes difficult when it stops being purely reactive.

A reactive system waits for the user, computes one response and speaks it. A proactive system may need to surface an event that completes later: a booking result, a background lookup, a verification, a callback or a delayed tool result.

The hard part is not generating the sentence. It is deciding **when** that sentence may enter an already-live audio conversation without interrupting the user, overlapping another response or producing duplicate delivery.

{{ include_html("snippets/articulos-tecnicos/voice-rp-timeline.html") }}

## 1. Keep operation time and conversation time separate

Consider this timeline:

```text
T0  user asks for slow work
T1  agent acknowledges: “I’m checking that now.”
T2  user continues speaking about something else
T3  tool finishes
T4  user is still speaking
T5  safe gap appears
T6  agent delivers the result
```

The tool completed at `T3`. The human did not receive the result until `T6`.

That difference creates two clocks:

- **operation clock** — accepted → running → terminal;
- **conversation clock** — listening → thinking → speaking → interrupted → idle.

A reliable architecture does not force one clock to wait for the other.

## 2. Use a shared conversational blackboard

The interaction surface needs a compact state object describing what is happening now, what work is outstanding and what may be delivered next.

```python
@dataclass
class ConversationBlackboard:
    session_id: str
    user_speaking: bool
    agent_speaking: bool
    active_response_id: str | None
    active_turn_id: str | None
    pending_deliveries: list[str]
    active_operations: set[str]
    last_user_activity_at: float
    last_agent_audio_at: float
```

The blackboard is not a replacement for durable operation storage. It is the **interaction projection** used to arbitrate realtime behaviour.

{{ include_html("snippets/articulos-tecnicos/voice-rp-blackboard.html") }}

A worker may update operation state in a database. The interaction process consumes that state and decides whether a pending delivery can be spoken now.

## 3. Define explicit delivery windows

“Tool completed” should not automatically mean “speak immediately.”

A delivery policy can consider:

- whether the user is currently speaking;
- whether the agent is already speaking;
- whether a response is being interrupted;
- delivery priority;
- result age/staleness;
- whether the result belongs to the current topic;
- whether several completions should be batched;
- whether the user explicitly asked not to be interrupted.

```python
def can_deliver(now, blackboard, envelope):
    if blackboard.user_speaking:
        return False
    if blackboard.agent_speaking and not envelope.may_interrupt:
        return False
    if envelope.expires_at and now > envelope.expires_at:
        return False
    return True
```

{{ include_html("snippets/articulos-tecnicos/voice-rp-windows.html") }}

### Priority does not have to mean immediate interruption

A high-priority result may be delivered at the first natural gap. Only genuinely urgent categories should be allowed to cut through an active utterance.

This prevents the system from becoming technically proactive but conversationally rude.

## 4. The seam between reactive and proactive behaviour is the key contract

The same voice surface should handle both ordinary turn responses and asynchronous completions.

```text
Reactive path
user speech → turn → response → playback

Proactive path
operation event → delivery envelope → policy → response → playback
```

Both eventually create a response that enters the same playback and interruption machinery.

{{ include_html("snippets/articulos-tecnicos/voice-rp-seam.html") }}

This is important because two independent “speakers”—one for normal responses and another for callbacks—will eventually overlap, race or disagree about playback state.

One surface should own the mouth.

## 5. Barge-in cancels audio, not necessarily the work

When the user interrupts while the agent is talking, the immediate requirement is to stop output quickly.

That may require several actions:

1. cancel current model generation;
2. cancel/stop TTS synthesis;
3. clear queued telephone/playback media;
4. record how much audio was actually heard;
5. truncate conversation history accordingly.

It does **not** necessarily mean cancelling the slow background tool.

{{ include_html("snippets/articulos-tecnicos/voice-rp-barge.html") }}

A booking search, database query or workflow can remain useful after the user interrupts the spoken acknowledgement. Cancellation should target the response first and the operation only when the user's new intent invalidates it.

### Heard-state matters

For a telephony stack, generated text and generated audio are not equivalent to audio the callee heard.

A useful lifecycle is:

```text
response_created
→ tts_started
→ media_enqueued
→ playback_started
→ playback_mark_confirmed
→ heard
```

If the user barges in before the mark/acknowledgement corresponding to the final result, the runtime should not treat that result as fully delivered.

## 6. Batch related results before speaking

A single user request can fan out into multiple operations:

```text
availability search
pricing lookup
policy validation
customer-data fetch
```

If each completion independently enters the conversation, the agent can produce a stream of fragmented updates.

Group related work by `batch_id` and create one delivery when the batch reaches the chosen condition:

```python
if batch.all_terminal:
    await deliveries.create_once(
        key=f"batch:{batch.id}:final",
        payload=build_user_summary(batch),
    )
```

{{ include_html("snippets/articulos-tecnicos/voice-rp-batch.html") }}

The batch may also support intermediate milestones for genuinely long workflows, but those should be deliberate product events rather than arbitrary worker callbacks.

## 7. A runtime loop for conversational delivery

A compact runtime can subscribe to both media/turn events and durable-operation events:

```python
async def realtime_loop(events):
    async for event in events:
        match event:
            case UserSpeechStarted():
                await stop_current_playback()
                blackboard.user_speaking = True

            case UserSpeechStopped():
                blackboard.user_speaking = False
                await maybe_deliver_pending()

            case OperationCompleted(operation_id, result_ref):
                envelope = await build_delivery(operation_id, result_ref)
                await delivery_store.put_once(envelope)
                await maybe_deliver_pending()

            case PlaybackConfirmed(delivery_id):
                await delivery_store.mark_delivered(delivery_id)
```

{{ include_html("snippets/articulos-tecnicos/voice-rp-runtime.html") }}

The important property is that operation completion **publishes** a delivery opportunity. It does not seize the audio channel.

## 8. Tool result delivery needs idempotency too

At-least-once callbacks and process restarts can otherwise produce repeated spoken results.

Use a stable delivery key:

```text
delivery_key = operation_id + ":final"
```

Then enforce `create_once` and `mark_delivered_once` semantics.

The delivery store may distinguish:

- `pending`
- `reserved`
- `speaking`
- `delivered`
- `superseded`
- `expired`

A lease can prevent two interaction workers from speaking the same result simultaneously after a reconnect/failover.

## 9. Proactivity needs conversational relevance

A result can become technically correct but conversationally stale.

Examples:

- the user changed the requested date;
- another tool superseded the result;
- the user explicitly cancelled the task;
- the session ended;
- the result is now too old to be useful.

A delivery envelope should therefore include expiry and relevance information:

```python
@dataclass
class DeliveryEnvelope:
    operation_id: str
    topic_key: str
    created_at: float
    expires_at: float | None
    priority: int
    may_interrupt: bool
    payload: dict
```

Before speaking it, the runtime revalidates whether the result still belongs to the active user state.

## 10. Measure the real user-facing timings

For proactive voice systems, separate at least:

```text
request_to_ack_ms
operation_duration_ms
result_ready_to_safe_window_ms
safe_window_to_first_audio_ms
barge_in_to_silence_ms
result_ready_to_heard_ms
duplicate_delivery_rate
stale_delivery_rate
```

The metric `result_ready_to_safe_window_ms` is especially useful: it tells you whether the operation is slow or the conversation policy is deliberately waiting for a natural gap.

A low technical tool latency does not guarantee fast human-visible delivery.

## 11. Test overlapping events, not only clean turns

Useful integration scenarios include:

- result completes while user is speaking;
- result completes while agent is speaking;
- user barges in during proactive delivery;
- two batches finish nearly simultaneously;
- callback is duplicated;
- connection drops after result creation but before playback confirmation;
- user changes the task before delivery;
- slow tool finishes after session close;
- tool is explicitly cancelled;
- TTS fails after the result was reserved.

Assertions should include side effects and heard-state:

```python
assert delivery.create_count == 1
assert delivery.heard_count <= 1
assert operation.side_effect_count == 1
assert no_overlapping_agent_audio
assert stale_result_was_not_spoken
```

## 12. Architecture rule

A reactive–proactive voice agent works best when **one realtime interaction surface owns turn-taking and playback**, while asynchronous workers own durable work and publish results through idempotent delivery envelopes.

> **The background worker decides when work is done. The voice surface decides when the human should hear about it.**

This gives the system room to stay conversational while work continues in parallel.

## Sources

- OpenAI Realtime API and Agents SDK — realtime sessions, function calling and asynchronous events.
- Pipecat — frame-based realtime pipelines and function calling.
- Twilio Media Streams — bidirectional media, `mark` acknowledgements and `clear` semantics.

## Frequently asked questions

**Should a completed tool interrupt the user immediately?**  
Usually no. It should create a pending delivery and wait for a safe conversational window unless the result is explicitly classified as interrupt-worthy.

**Does barge-in cancel background work?**  
Not automatically. It should stop the current response/playback; durable work is cancelled only when the new user intent invalidates it.

**Why track heard-state?**  
Because generated or buffered audio may never reach the user. Delivery semantics should reflect playback acknowledgement, not only TTS completion.

**How do you avoid duplicate spoken results after retries?**  
Use stable operation/delivery identifiers, create-once semantics and a delivery lease/state machine.
