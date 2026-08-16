---
title: Reactive and proactive agents in voice
description: "How to separate conversation, asynchronous tools, and result delivery so a voice agent does not block the turn, interrupt badly, or repeat messages."
date: 2026-08-04
date_modified: 2026-08-05
keywords: "voice agents, reactive agent, proactive agent, asynchronous tool calls, barge-in, full duplex, conversational runtime, Twilio Media Streams, Pipecat"
article_state: published
tags:
  - AI
  - Voice
  - Agents
  - Tool Calling
  - Architecture
  - Runtime
---

# Reactive and proactive agents in voice

> **Idea:** the fact that an operation has finished does not mean the agent can speak at that moment.  
> **Scope:** telephony or WebRTC, slow tools, interruptions, playback, and results that return later.  
> **Goal:** accept the request quickly, execute outside the turn, and deliver a single completion when it fits the conversation.

In text, the reactive–proactive pattern looks fairly clean. The user asks for something, the agent confirms that it is handling it, the tool works in the background, and the result appears when it is ready.

Voice makes this harder. The user may keep speaking while the operation continues. The model may be generating another response. TTS may already have audio prepared, and the telephony provider may still be playing a fragment that the runtime already tried to cancel.

That is why adding a callback that says *“the tool has finished”* is not enough. Four clocks have to be coordinated:

1. The user's acoustic activity
2. The response the agent is generating
3. The audio that has actually been played
4. The operations that remain alive outside the turn

The pattern works when those clocks remain separate. Acceptance can be reactive, execution can be asynchronous, and delivery can be proactive. Even then, only one component should control the voice and decide when the agent speaks again.

{{ include_html("snippets/articulos-tecnicos/voice-rp-contract.html") }}

## Reactive and proactive describe delivery

A reactive agent responds to a user request. It can listen, decide that it needs a tool, and return a short acknowledgement:

> “I'll check that now. You can keep telling me the rest.”

That message does not confirm the result. It only confirms that the system understood the request and accepted the work.

A proactive agent comes back when it has a relevant update, even if the user has not asked again. In text, that is usually a new message. In voice there is one more decision: **when to say it**.

Before speaking, the runtime has to know whether the user is still talking, whether another response is being played, whether the result is still relevant, and whether it is better to wait for other operations in the same batch to finish.

The real flow looks more like this:

```text
request accepted
→ operation registered
→ background execution
→ result available
→ delivery policy
→ safe window
→ audio played or result joined to the next turn
```

The operation and the conversation progress at different rates. The runtime has to preserve both timelines without mixing them.

{{ include_html("snippets/articulos-tecnicos/voice-rp-safe-window.html") }}

## The four clocks of a call

Several state machines coexist in a real call. Collapsing them into one `is_busy` is often where the problems begin.

### 1. What the user is doing

```text
quiet → speech_started → speaking → speech_stopped → quiet
```

A boolean `is_user_speaking` is too weak. VAD works under uncertainty, needs silence windows, and can revise a decision afterward.

An aggressive VAD responds earlier, but it can also cut sentences. A conservative one protects the turn better, although it adds waiting time. That decision is part of the product, not merely a technical parameter.

### 2. What the agent is generating

```text
planned → generating → completed
                  ↘ cancelled
```

A response can be complete inside the model and still not have reached the user. It can also be cancelled after producing partial text or audio.

### 3. What audio has been played

```text
queued → sent → playing → played
                    ↘ cleared
```

This distinction is critical. Twilio Media Streams can receive `media` events, associate a `mark`, and use `clear` to empty the buffer. The `mark` helps track sent audio, but a `clear` also returns marks that were still pending. The runtime therefore needs to know which audio finished playing and which audio was removed before it reached the user.[^twilio-websocket]

### 4. Which operation is still running

```text
accepted → running → succeeded
                   ↘ failed
                   ↘ cancelled_by_policy
```

An interruption usually cancels the response and playback. It should not automatically cancel a transfer, booking, or search that was already accepted.

Using the same `cancel` for everything mixes two different decisions. One is acoustic. The other is a business decision.

{{ include_html("snippets/articulos-tecnicos/voice-rp-clocks.html") }}

## A turn is not enough

Conversation frameworks usually organize state around turns. That is not enough for an asynchronous tool.

One request can create several operations. Each can finish at a different moment, and the completion can arrive during another turn. The runtime therefore needs explicit identities:

```python
@dataclass(frozen=True)
class VoiceContext:
    session_id: str
    turn_id: str
    response_id: str | None
    playback_id: str | None

@dataclass(frozen=True)
class OperationContext:
    operation_id: str
    batch_id: str
    intent_key: str
    created_from_turn_id: str
```

Each identifier answers one question:

- `session_id`: which conversation it belongs to
- `turn_id`: which utterance originated the decision
- `operation_id`: which query or effect we are tracking
- `batch_id`: which operations should close together
- `response_id`: which generation can be cancelled
- `playback_id`: which audio was sent, played, or cleared
- `intent_key`: how we avoid repeating the same effect during a retry or replay

The transcript should not hold all that state. It is useful for reconstructing what was said. It is not a reliable database for knowing whether an operation was accepted, retried, finished, or already communicated.

A minimal separation can look like this:

```python
class VoiceRuntimeState:
    channel: ChannelState
    responses: dict[str, ResponseState]
    playbacks: dict[str, PlaybackState]
    operations: dict[str, OperationState]
    batches: dict[str, BatchState]
    pending_deliveries: deque[DeliveryEnvelope]
    idempotency: dict[str, OperationResult]
```

This structure allows one simple rule: **a completed operation can produce at most one audible final completion**, even if the callback arrives twice or the process restarts.

## The first response accepts work

Acceptance has two goals. It should confirm that the agent understood the request and free the conversation.

It cannot promise a result that does not yet exist.

```python
async def accept_tool_call(call: ToolCall, ctx: VoiceContext) -> Acceptance:
    operation = await operation_store.create_once(
        intent_key=build_intent_key(call, ctx),
        payload=call.arguments,
        created_from_turn_id=ctx.turn_id,
    )

    await queue.publish(
        "operation.accepted",
        operation_id=operation.id,
        session_id=ctx.session_id,
    )

    return Acceptance(
        speech="I'm checking it. You can continue.",
        operation_id=operation.id,
    )
```

The difference between “done” and “I'm handling it” is small in wording but enormous in the system contract. The first sentence asserts a final state. The second says that the work has started.

In voice, it is also useful to keep the acknowledgement short. The longer it is, the longer it occupies the channel and the more likely the user is to interrupt.

## The result goes through an `ActivityGate`

The tool should not call `speak()` directly when it finishes. It first publishes an event, and then a delivery policy decides what to do.

```python
@dataclass
class DeliveryEnvelope:
    delivery_id: str
    session_id: str
    batch_id: str
    priority: Literal["normal", "urgent"]
    summary: str
    became_ready_at: datetime
    source_operation_ids: tuple[str, ...]
```

The `ActivityGate` observes the real state of the conversation:

```python
async def choose_delivery(
    envelope: DeliveryEnvelope,
    channel: ChannelSnapshot,
) -> DeliveryDecision:
    if envelope.priority == "urgent" and channel.can_interrupt:
        return DeliverNow(interrupt=True)

    if channel.user_is_speaking:
        return QueueUntilQuiet(min_quiet_ms=650)

    if channel.playback_is_active:
        return QueueAfterPlayback()

    if channel.turn_is_open:
        return AttachToNextResponse()

    if envelope.is_stale:
        return SuppressAndPersist()

    return DeliverNow(interrupt=False)
```

From there it can:

- Deliver the result now if there is silence and it is still relevant
- Wait for a quiet window if the user is speaking
- Group it with other operations in the same batch
- Incorporate it into the next response
- Interrupt only when priority justifies it
- Suppress it if it is already stale

The silence window does not have to be identical in every case. It can vary by channel, language, domain, and update type.

Interrupting to say that a search finished is usually worse than waiting. Interrupting to warn that a payment is about to be sent with incorrect details may be justified.

{{ include_html("snippets/articulos-tecnicos/voice-rp-gate.html") }}

## Barge-in: cancel the voice, not the whole system

When the user starts speaking, the agent should stop making sound quickly. The correct cancellation is selective.

A barge-in usually requires:

1. Cancel the active generation
2. Stop TTS or S2S output
3. Clear the playback buffer
4. Adjust history to the audio that was actually heard
5. Keep operations running unless the new intent invalidates them

The OpenAI voice SDK exposes this pattern by reacting to `input_audio_buffer.speech_started`. The application can cancel output and truncate assistant audio so that state reflects only what the person heard.[^openai-voice-agents]

In telephony, `clear` and `mark` allow the same principle to be applied to Twilio's buffer.[^twilio-websocket]

```python
async def on_barge_in(event: SpeechStarted, session: VoiceSession) -> None:
    if session.active_response_id:
        await realtime.cancel_response(session.active_response_id)

    if session.active_playback_id:
        played_ms = await playback.estimate_played_ms(session.active_playback_id)
        await realtime.truncate_assistant_audio(
            response_id=session.active_response_id,
            audio_end_ms=played_ms,
        )
        await playback.clear(session.active_playback_id)

    # Operations remain alive until policy decides otherwise.
    await operation_policy.reconcile_with_new_turn(session.session_id)
```

The user can say “don't make the transfer” and cancel an operation. Starting a new question should not have the same effect.

{{ include_html("snippets/articulos-tecnicos/voice-rp-barge.html") }}

## Several tools should produce one final completion

One turn can check availability, retrieve customer data, and calculate an alternative.

If every callback speaks on its own, the call fills with interruptions:

> “I have the availability.”  
> “I've also retrieved your details.”  
> “And the alternative has been calculated.”

It is better to treat those operations as one semantic batch.

Pipecat has primitives aligned with this idea. A function call can survive an interruption and return its result when it finishes. Calls in the same group also share a `group_id`, so the LLM can be reactivated once when the last one completes.[^pipecat-functions][^pipecat-frames]

```python
@dataclass
class BatchState:
    batch_id: str
    operation_ids: set[str]
    completed_ids: set[str]
    final_delivery_id: str | None = None

    @property
    def drained(self) -> bool:
        return self.operation_ids == self.completed_ids
```

When an operation completes:

```python
async def on_operation_finished(result: OperationResult) -> None:
    await store.record_result_once(result)

    batch = await store.mark_batch_member_complete(
        batch_id=result.batch_id,
        operation_id=result.operation_id,
    )

    if not batch.drained:
        return

    envelope = await delivery_store.create_once(
        delivery_key=f"batch:{batch.batch_id}:final",
        payload=summarize_batch(batch),
    )
    await delivery_bus.publish(envelope)
```

`record_result_once` and `create_once` matter because production includes retries, ambiguous timeouts, and *at least once* delivery. The design cannot depend on every event arriving exactly once.

{{ include_html("snippets/articulos-tecnicos/voice-rp-batch.html") }}

## When there is no gap, the result waits

Sometimes no safe window appears for a follow-up. The user may keep talking, the agent may be responding to another intent, or the call may end before the result arrives.

In those cases, the completion remains stored as a pending delivery.

On the next turn, the runtime can inject ephemeral context:

```text
Pending update from a previous operation:
- The availability check completed successfully.
- It has not yet been communicated to the user.
- This update does not replace the new request.
```

The model can join both threads naturally:

> “Before we go to that, I already have the availability you asked for. There is a slot on Thursday. About your new question…”

After confirming that the audio was played, the `delivery_id` becomes `spoken`. If the user interrupts before hearing the result, it is not marked delivered and can be retried in a shorter form.

This avoids two opposite errors:

- Repeating a completion that was already heard
- Losing a completion because the system confused generated audio with played audio

## A single component controls the voice

The architecture becomes clearer when it separates three planes.

### Interaction Surface

It listens, detects turns, handles barge-in, produces backchannels, plays audio, and applies the `ActivityGate`. It is the only component authorized to speak.

### Cognitive Execution Plane

It handles heavier reasoning, RAG, tools, retries, compensations, and idempotency. It can keep working even after the conversation has moved to another turn.

### Durable Coordination

It stores events, locks, operations, batches, and pending deliveries. It connects the other two planes without turning the transcript into operational state.

{{ include_html("snippets/articulos-tecnicos/voice-rp-runtime.html") }}

This division also appears in recent full-duplex systems. GPT-Live, introduced by OpenAI on July 8, 2026, keeps the conversation on a voice surface while delegating search, deeper reasoning, and complex work to a frontier model.[^gpt-live]

Orchestration does not disappear. It simply stops being hidden.

## Rules the runtime must satisfy

These rules add more reliability than adding instructions to the prompt:

1. Do not confirm success before reaching a terminal state
2. Accept or recover every effect with an idempotency key
3. Produce at most one final completion per batch
4. Prevent a tool from speaking directly into the channel
5. Keep an operation alive through an acoustic interruption unless an explicit decision cancels it
6. Store in history only the audio the user could have heard
7. Mark a result delivered only after playback or confirmed resynchronization
8. Preserve pending results across turn changes and restarts
9. Suppress or replace stale updates
10. Treat priority as business policy rather than an improvisation by the LLM

A natural voice helps. It does not compensate for a duplicated transfer, premature confirmation, or a result played out of context.

## What to measure

A single latency number does not describe this system. At minimum, track:

| Metric | What it reveals |
|---|---|
| `speech_stop_to_acceptance_audio_ms` | Time from the end of the turn to the first audible acknowledgement |
| `barge_in_to_playback_stop_ms` | How long it takes the agent to stop sounding |
| `operation_accept_to_start_ms` | Internal wait before execution |
| `operation_duration_ms` | Real time spent in the external dependency |
| `operation_complete_to_delivery_ready_ms` | Aggregation and summarization cost |
| `delivery_ready_to_first_audio_ms` | Wait introduced by the `ActivityGate` |
| `generated_to_played_gap_ms` | Output buffering and transport |
| `duplicate_side_effect_rate` | Idempotency failures |
| `duplicate_delivery_rate` | Repeated completions |
| `stale_delivery_rate` | Results spoken too late |
| `next_turn_resync_rate` | Completions that did not find a proactive window |
| `cancelled_response_unheard_ms` | Generated audio correctly excluded from context |

Every trace should link `session_id`, `turn_id`, `operation_id`, `batch_id`, `response_id`, `playback_id`, and `delivery_id`.

Without that correlation, an incident is summarized as “the bot interrupted.” With it, you can tell whether the silence window failed, a `mark` arrived late, or the same callback was processed twice.

## What to test before production

The test suite has to reproduce timing conflicts, not only ideal conversations:

- The tool finishes while the user is still speaking
- The tool finishes during playback
- Two tools in the same batch finish in reverse order
- A callback arrives twice
- The user interrupts before hearing the completion
- The user explicitly cancels an operation
- The channel disconnects with pending deliveries
- The process restarts after the effect and before the follow-up
- A new intent makes a previous update stale
- An urgent result interrupts and a normal one waits
- TTS generates audio that Twilio has not played yet
- VAD fires a false `speech_started`

A useful test does not check only text. It also checks state and effects:

```python
assert operation.side_effect_count == 1
assert batch.final_delivery_count == 1
assert playback.heard_text == conversation.assistant_text
assert pending_delivery.is_empty_after_confirmed_playback
assert durable_operation.was_not_cancelled_by_barge_in
```

## The complete pattern

A reactive–proactive voice agent is not a bot that simply “notifies later.”

Reactive acceptance keeps the conversation moving. The asynchronous plane executes real work without blocking the channel. Proactive delivery returns the result when it finds a safe gap. Persistent state prevents an interruption, retry, or turn change from becoming duplicate messages or inconsistent effects.

The rule that summarizes the design is:

> **Technical completion creates a pending delivery. The conversation decides when it can be heard.**

## Sources

[^openai-voice-agents]: OpenAI Agents SDK, [Build voice agents](https://openai.github.io/openai-agents-js/guides/voice-agents/build/). Describes semantic VAD, interruption events, and assistant-audio truncation.
[^twilio-websocket]: Twilio, [Media Streams WebSocket messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages). Contract for `media`, `mark`, and `clear` in bidirectional streams.
[^pipecat-functions]: Pipecat, [Function calling](https://docs.pipecat.ai/pipecat/learn/function-calling). Asynchronous execution and the `cancel_on_interruption` policy.
[^pipecat-frames]: Pipecat, [Control frames](https://docs.pipecat.ai/api-reference/server/frames/control-frames). Grouping calls with `group_id`.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), July 8, 2026. Full-duplex surface with delegation of search, reasoning, and complex work.
