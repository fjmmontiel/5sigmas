---
title: "Turn-taking: detecting speech is not deciding the turn"
description: "VAD, endpointing, interruptions, and barge-in are separate decisions. This chapter separates the signals, state, and policies that let a voice agent know when to listen, when to answer, and when to yield."
date: 2026-09-09
date_modified: 2026-09-09
tags:
  - AI
  - Voice
  - Realtime
  - Agents
  - Production
---

# Chapter 2 — Turn-taking: detecting speech is not deciding the turn

A voice agent can have excellent VAD and still cut users off. It can detect end of turn accurately and still feel slow. It can react to the first sound while speaking and stop its own response every time the user says “uh-huh.”

The underlying problem is that **detecting speech, deciding that a turn is complete, and deciding that overlapping speech should interrupt the agent are different questions**.

A production system should separate at least four signals:

1. **Voice activity:** is a person speaking right now?
2. **End of turn:** has the user finished the thought and yielded the floor?
3. **Interruption intent:** if the user speaks over the agent, are they trying to take the turn or merely backchanneling?
4. **Playback and cancellation state:** if the agent should yield, which audio, generation, history, and actions are still valid?

{{ include_html("snippets/articulos-tecnicos/voice-turn-taking-signals.html") }}

The previous chapter located the text boundary and the runtime owner. Here we use that model to answer a more operational question: **what evidence is sufficient to change speakers without cutting off thoughts, introducing artificial dead air, or duplicating effects?**

## VAD answers “is there speech?”, not “is the thought complete?”

A voice activity detector classifies regions of audio as speech or non-speech. Silero VAD, for example, exposes speech timestamps and is explicitly designed for voice activity detection.[^silero-vad] That signal is useful for detecting speech onset, feeding STT, and identifying pauses.

An acoustic pause, however, is not necessarily a conversational boundary.

Consider this turn:

```text
User: “I need to change the address…”
                         └── 350 ms pause ──┘
User: “…for order 4182.”
```

A system that maps `speech → silence` directly to `turn_end` can answer after “address” and talk over the second half of the request. Increasing the minimum silence reduces that failure, but creates another one: after a complete “yes,” the agent waits unnecessarily.

That is why VAD and end-of-turn detection should be separate signals. Pipecat states this explicitly: its VAD start/stop frames are inputs to user-turn strategies, not the final turn decisions.[^pipecat-speech-input] LiveKit makes the same distinction by combining VAD with a turn detector that uses semantic and acoustic properties to predict end of turn.[^livekit-turns]

### A timeout is a policy, not semantic proof

The simplest endpointing policy waits for a silence window:

```text
if VAD == silence for D:
    commit_turn()
```

`D` is not “the correct length of a human pause.” It is a decision parameter that trades off two error modes:

- If `D` is too short, **premature endpoints** become more likely.
- If `D` is too long, **dead air** before the response increases.

There is no single correct value across languages, microphones, speaking styles, and tasks. The right policy depends on the product's actual pause distribution.

Modern runtimes add more evidence. Pipecat currently uses a turn analyzer by default and can replace it with a speech timeout. LiveKit offers VAD-only detection, STT endpointing, its own turn detector, manual control, or turn detection delegated to the realtime model.[^pipecat-turn-strategies][^livekit-turns]

## Endpointing: deciding when to commit the turn

The endpoint is the moment the system stops treating user input as an open turn and allows a response to depend on it.

A useful way to think about the decision is as a trade-off between two costs:

```text
cutoff_risk = P(user continues | audio, text, context)
waiting_cost = additional time without a response
```

Waiting longer can reduce premature endpoints, but increases perceived latency. A semantic detector tries to use additional evidence instead of buying accuracy only with silence.

OpenAI Realtime currently distinguishes two server-side policies: `server_vad`, based on voice activity and silence, and `semantic_vad`, which estimates whether the user has finished speaking and adjusts its timeout based on that probability.[^openai-realtime-vad] That does not make `semantic_vad` universally better. It introduces another model boundary and may deliberately wait longer when the utterance appears incomplete.

LiveKit also separates its turn detector from **endpointing delay**. With the turn detector enabled, the model contributes end-of-turn evidence while the session still applies endpoint timing bounds. Other detection modes give those bounds different roles.[^livekit-turn-detector][^livekit-turn-tuning]

The production consequence matters: **do not optimize endpointing by looking only at average response delay**. An agent that responds quickly because it routinely cuts users off does not have good turn-taking.

## Turn start and turn end are not symmetric

To react to an interruption, speech onset should be detected quickly. To close a user turn, the system usually wants more confidence.

That favors an asymmetric design:

```text
user starts speaking
  └─ fast signal: VAD / audio

user finishes speaking
  └─ more conservative signal: acoustic + semantic context + safety timeout
```

Pipecat makes this separation explicit with independent turn-start and turn-stop strategies. A turn can start from VAD or transcription and end through Smart Turn, a timeout, an external signal, or another strategy.[^pipecat-turn-strategies]

The asymmetry is useful because the mistakes have different costs. Detecting speech onset too late lets the agent talk over the user. Committing an end too early can change the meaning of the request itself.

## Barge-in: hearing the user is not enough to know whether to stop

When the agent is already speaking, another decision appears:

```text
user_speech_started && agent_speaking
        ↓
true interruption or backchannel?
```

A *backchannel* is a short cue such as “yeah,” “uh-huh,” or “right” that may signal attention without taking the floor. If every VAD event immediately cancels the response, the agent becomes sensitive to breathing, noise, and acknowledgments.

LiveKit documents this distinction directly in adaptive interruption handling: VAD detects incoming user audio, then a separate model attempts to distinguish genuine barge-in from backchanneling or noise.[^livekit-adaptive-interruptions] That specific capability is a LiveKit Cloud surface under the conditions in its current documentation. It should not be attributed to the self-hosted framework as a universal property.

Pipecat exposes turn start as a strategy. `VADUserTurnStartStrategy` is the most responsive option. `MinWordsUserTurnStartStrategy` can require more evidence while the bot is speaking, and external strategies can delegate the decision to another component.[^pipecat-turn-strategies]

The broader design rule is independent of either framework: **speech start is evidence for considering an interruption, not necessarily the final decision to yield the turn**.

## A correct interruption is a state transition

Suppose the user really does intend to interrupt. “Stop TTS” solves only one part of the problem.

At that instant the system may contain all of the following:

```text
model response still generating
TTS audio synthesized but not yet sent
audio sent but still buffered for playback
audio already played
a tool still running
provisional conversation history
```

A robust interruption must decide independently what to cancel, what to preserve, and what may need compensation.

At minimum:

1. **Stop producing new speech** so the agent yields the acoustic channel.
2. **Clear or truncate pending audio** that should no longer be played.
3. **Cancel generation** when continuing to compute has no value.
4. **Preserve only valid context** for the next turn.
5. **Treat tools by semantics rather than reflex.** A read may be cancellable. An operation with side effects may require idempotency, durable state, or a policy not to cancel it.

When LiveKit handles an interruption, it pauses agent speech and truncates conversation history to the portion of speech it considers heard before the interruption. It also exposes `session.interrupt()` for explicit interruption.[^livekit-turns] Pipecat uses `InterruptionFrame` to discard pending DataFrames and ControlFrames. SystemFrames have priority and are not discarded by that interruption.[^pipecat-system-frames]

Those are **runtime semantics**, not physical proof of which samples reached a person's ear. If a transport or carrier owns another playback buffer, the product still has to correlate its state with the most authoritative playback boundary it can observe.

## Five failure modes worth measuring separately

A single “turn-taking accuracy” number hides failures with different causes.

| Failure | What happens | Useful signal |
|---|---|---|
| Premature endpoint | The agent responds during an internal pause | turn commit before the user continuation |
| Late endpoint | The user is done but the agent leaves dead air | actual end → commit/response |
| False interruption | Backchannel/noise stops the agent | interruption without a useful subsequent user turn |
| Missed interruption | The user tries to enter and the agent keeps talking | speech start → effective agent stop |
| Stale continuation | Output or an action from the cancelled turn reappears | frames/audio/tool results after cancellation |

There is no need to invent universal targets. Instrument events from the same turn, label representative examples, and compare configurations on the same corpus and transport.

A minimal useful trace can retain:

```text
user_speech_start
user_speech_stop
turn_end_predicted
turn_committed
agent_generation_start
agent_audio_first_playable
agent_playback_start
interruption_candidate
interruption_accepted
agent_playback_stopped
```

The observability chapter will go deeper into event design and failure taxonomies. For turn-taking, the important requirement is that a trace can distinguish **detection**, **decision**, and **effect**.

## LiveKit, Pipecat, or vanilla: who owns the decision?

The runtime changes where these policies live. It does not change the physics of the problem.

| Turn-taking question | LiveKit Agents | Pipecat | Vanilla/thin Python |
|---|---|---|---|
| Speech onset | VAD inside turn handling or a signal from the realtime model | Turn-start strategies: VAD, transcription, min-words, external | Provider/VAD event or custom detector; the app orders and validates events |
| End of turn | Turn detector, VAD, STT endpointing, manual control, or realtime-model detection | Turn-stop strategies; Smart Turn is the current default | Provider server VAD/semantic VAD, custom detector, or explicit timeout |
| Barge-in | Interruption handling; adaptive handling is a separate managed surface where applicable | Turn start can emit an interruption; policy remains composable | The app decides when to cancel generation, audio, and state |
| Playback/history | `AgentSession` integrates interruption and context truncation | Interruption frames and processors control what keeps flowing | The app must model buffers, playback correlation, and confirmed context |
| Fine-grained control | High within session and turn-handling abstractions | Very high through strategies, processors, and frames | Maximum, in exchange for owning ordering, cancellation, retries, tests, and observability |

### Choose LiveKit Agents when an integrated session contract is the dominant constraint

It fits well when you want room/session, VAD, endpointing, interruptions, and worker lifecycle to form one coherent contract and would rather configure policies than rebuild the state machine from primitives. With a realtime model using server-side turn detection, LiveKit documents an important boundary: the model decides the interruption signal and many `InterruptionOptions` no longer apply, so the relevant tuning moves to the realtime provider.[^livekit-turns]

### Choose Pipecat when you want turn strategies to remain explicit and composable

Pipecat is a natural fit when you need to combine different signals for turn start and stop, insert custom processors, or replace turn logic without abandoning a structured pipeline. Its start/stop strategies make it visible which trigger begins the user turn and which detector closes it.[^pipecat-turn-strategies]

### Choose vanilla/thin when the provider boundary is sufficient or protocol-level control matters

An application can delegate turn detection to a realtime provider and consume its events, or it can run its own VAD and turn detector. Either way, it owns whatever the framework no longer provides: event ordering, deduplication, cancellation, playback buffers, confirmed state, tools, retries/reconnect, tracing, and tests.

With OpenAI Realtime, for example, `server_vad` and `semantic_vad` are provider/service capabilities, not Python capabilities. The turn-detection contract can control automatic response creation and interruption of the active response. Any product policy built on top remains application-owned.[^openai-realtime-vad]

### A hybrid is reasonable when authority boundaries are explicit

A system can use framework media/session management while delegating end-of-turn detection to a realtime provider. Pipecat can likewise use an external turn strategy driven by an S2S service. The important constraint is that **each transition has one authority**. Two components both trying to commit the same turn create races that are hard to reproduce.

Do not select a runtime because one demo “feels fast.” A demo can hide language, network, acoustics, utterance length, and interruption policy. Compare configurations with the same audio corpus, network conditions, transport, and success definition.

## Three concrete workloads

### Browser assistant

If the browser connects directly to a realtime provider, server-side turn detection can reduce plumbing. The backend still needs to know which events are authoritative for cancelling tools, updating state, and deciding which response belongs in history. If provider switching or one shared turn policy across web and other channels matters, a runtime such as LiveKit or Pipecat may justify the extra layer.

### PSTN agent

Telephony adds noise, compression, echo, and carrier buffering. VAD can remain a fast speech-start signal, but end-of-turn and interruption policies should be evaluated on real phone audio. A configuration that works on a laptop microphone is not sufficient evidence for a different telephony route with different codec and buffering behavior. If the carrier terminates SIP and exposes media over WebSocket, the application runtime still has to distinguish media events, turn decisions, and playback state.

### Experimental or low-level pipeline

If you are researching new end-of-turn detectors, overlap models, or duplex policies, vanilla/thin can be the right choice because every transition must remain observable and modifiable. The cost is that replay harnesses, queues, cancellation, clocks, and failure injection also become part of the experiment.

## Tune the system without chasing one metric

A reproducible process starts with representative conversations: short answers, lists, hesitations, internal pauses, backchannels, corrections, overlap, noise, multiple languages, and audio from every production channel.

Then compare policies while holding the rest of the system constant:

```text
same audio samples
same transport or equivalent replay
same playback policy
same definition of a correct turn
same instrumentation
```

Measure at least:

- premature endpoint rate
- the latency distribution from human completion to turn commit
- false interruption rate
- missed interruption rate
- the `speech_start → agent_playback_stop` distribution for accepted barge-ins
- stale continuation/audio after cancellation
- task success after genuine interruptions

Do not take results from a semantic detector on clean audio, a VAD on PSTN, and a third system on a browser microphone and present them as one ranking. They are different systems under different conditions.

## What should be explicit before production

A turn-taking design is ready for QA when it can answer, without ambiguity:

- Which component detects speech onset.
- Which component has authority to declare end of turn.
- Which timeout is a fallback and what role it serves.
- How barge-in is distinguished from backchanneling while the agent is speaking.
- Which signal actually stops playback.
- What happens to buffered audio.
- What happens to active generation.
- What happens to tools with and without side effects.
- Which part of conversation history remains confirmed after interruption.
- Which events let an engineer reconstruct why the system changed turns.

The central idea is straightforward: **turn-taking is not a silence threshold. It is a transition protocol connecting acoustic signals, turn decisions, and execution state.** VAD can start that protocol. It should not be asked to make every decision in it.

## Primary sources

[^silero-vad]: Silero Team. *Silero VAD repository*. https://github.com/snakers4/silero-vad
[^pipecat-speech-input]: Pipecat. *Speech Input & Turn Detection*. https://docs.pipecat.ai/pipecat/learn/speech-input
[^pipecat-turn-strategies]: Pipecat. *User Turn Strategies*. https://docs.pipecat.ai/api-reference/server/utilities/turn-management/user-turn-strategies
[^pipecat-system-frames]: Pipecat. *System Frames*. https://docs.pipecat.ai/api-reference/server/frames/system-frames
[^livekit-turns]: LiveKit. *Turns overview*. https://docs.livekit.io/agents/logic/turns/
[^livekit-turn-detector]: LiveKit. *LiveKit turn detector*. https://docs.livekit.io/agents/logic/turns/turn-detector/
[^livekit-turn-tuning]: LiveKit. *Turn-taking tuning*. https://docs.livekit.io/agents/logic/turns/tuning/
[^livekit-adaptive-interruptions]: LiveKit. *Adaptive interruption handling*. https://docs.livekit.io/agents/logic/turns/adaptive-interruption-handling/
[^openai-realtime-vad]: OpenAI. *Realtime API reference — turn detection*. https://platform.openai.com/docs/api-reference/realtime
