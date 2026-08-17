---
title: Three architectures for voice agents
description: "A practical comparison of full cascade, half cascade and speech-to-speech, focusing on latency, prosody, tools, interruptions and control."
date: 2026-08-04
date_modified: 2026-08-17
keywords: "voice agents, full cascade, half cascade, speech to speech, audio in text out, realtime API, prosody, streaming TTS, full duplex, voice architecture"
article_state: published
tags:
  - AI
  - Voice
  - Architecture
  - Multimodality
  - Realtime
  - Tool Calling
---

# Three architectures for voice agents

> **Comparison:** full cascade, half cascade and speech-to-speech.  
> **Criteria:** latency, prosody, interruptions, tools, control and operating cost.  
> **Hot take:** a fast S2S surface should carry the conversation. A heavier model should handle reasoning and actions.

When people discuss voice architectures, the same question comes up almost every time: do we assemble STT, LLM and TTS, or use a speech-to-speech model directly?

The question is useful, but it mixes several decisions. An architecture can consume audio and still operate turn by turn. A full cascade can support barge-in and streaming. An audio-native model can understand speech and return text for another system to synthesize.

To compare the options properly, I separate four axes:

1. **Modality:** full cascade, half cascade or speech-to-speech
2. **Interaction:** turn-based or full-duplex
3. **Initiative:** reactive or proactive
4. **Orchestration:** one model or a fast surface connected to an execution plane

I am not comparing providers here. I am comparing the contracts between components and the problems each architecture leaves to the runtime.

{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}

## 1. Full cascade: audio → STT → LLM → TTS → audio

Full cascade separates each responsibility:

```text
user audio
→ VAD / endpointing
→ speech-to-text
→ partial and final text
→ LLM + tools
→ response text
→ text-to-speech
→ playback buffer
→ audio to the user
```

It is the best-known architecture because each piece can be observed, measured and replaced independently.

You can choose an STT that works well in a particular market, a specialized LLM, a TTS with the product voice, and your own layer to control tools, state and interruptions.

### Why it remains a strong option

**Modularity.** Changing the TTS does not force you to change the reasoning model.

**Auditability.** The transcript, tool calls and final text remain separate artifacts. That simplifies inspection and many compliance policies.

**Voice control.** A dedicated TTS often provides dictionaries, pronunciations, styles and more stable voices.

**Portability.** The same design can be adapted to telephony, browser and native applications with fairly clear contracts.

**Per-stage optimization.** Each component can be deployed closer to the user, cached, quantized or replaced by a smaller model.

Full cascade is not a bad architecture. The hard part starts when the conversation has to feel human. At that point it stops being a linear pipeline and becomes a state machine distributed across several services.

{{ include_html("snippets/articulos-tecnicos/voice-arch-cascade.html") }}

### Latency is not only a sum

A first approximation would be:

```text
T_first_audio =
    T_endpointing
  + T_STT_stable
  + T_LLM_first_tokens
  + T_TTS_first_chunk
  + T_transport
  + T_playback_buffer
```

But each component works with provisional information.

- The VAD decides whether the user has finished
- The STT emits partials that can still change
- The LLM can start from an incomplete hypothesis
- The TTS synthesizes text that may need to be corrected
- The telephony provider buffers audio that has not yet been played

An early mistake forces downstream work to be cancelled or redone. You can have fast services and still have a slow conversation because of buffering, conservative policies or poor coordination.

### Text loses part of the signal

A transcript preserves lexical content very well. It does not fully preserve:

- Speed and changes of pace
- Energy
- Hesitations
- Sarcasm
- Emotion
- Elongations
- Emphasis
- Unusual pronunciations
- Noise and microphone distance

OpenAI highlighted this loss when introducing the Realtime API. In an ASR → text model → TTS chain, signals such as emotion, emphasis and accents disappear, while latency is also added.[^openai-realtime-intro]

The loss happens in both directions:

1. **Understanding.** The LLM receives less information about the user's intent and state
2. **Expression.** The TTS receives text, but does not always know how it should say it

{{ include_html("snippets/articulos-tecnicos/voice-arch-prosody-loss.html") }}

### Too many components share state

In full cascade you have to reconcile:

```text
vad_state
transcript_revision
llm_response_state
tool_state
tts_state
playback_state
conversation_state
```

A barge-in can arrive while the STT is correcting the previous turn, the LLM is still generating, a tool is still running and synthesized audio is waiting in the buffer.

A mature implementation does not cancel "the whole pipeline." It cancels one specific response, removes pending audio, adjusts history to what was actually heard, and decides separately what to do with operations that are still alive.

## 2. Half cascade: audio → audio-native model → streaming text → TTS

Half cascade is often explained ambiguously. Here, I use the term for this architecture:

```text
user audio
→ realtime audio-native model
→ streaming response text
→ external TTS
→ audio to the user
```

The model listens to the audio directly and uses it to understand the turn. The output, however, is still text. That text is sent to an external TTS.

This removes STT as an independent boundary while preserving a specialized, controllable voice.

The official OpenAI SDK shows Realtime sessions with `output_modalities: ["text"]` and streaming through `response.output_text.delta`.[^openai-python-realtime] That contract makes it possible to build audio-in / text-out without asking the model to generate audio.

{{ include_html("snippets/articulos-tecnicos/voice-arch-half.html") }}

### What it gains over full cascade

**Audio-native understanding.** The model can use tone, pauses, rhythm and hesitation as part of the intent.

**Less reconciliation.** There is no longer a need to coordinate partial STT, final STT and an LLM as three separate states.

**Streaming to TTS.** Text deltas can begin to be synthesized before the full response is complete.

**Independent voice.** The product keeps whichever TTS fits best for quality, price, languages or brand identity.

**Tool calling from audio.** The model can decide on a tool without first converting the whole interaction into a final transcript.

It is a strong option, with one important nuance: preserving prosody on input does not mean preserving it on output.

### Prosody enters and can be lost again on output

The model can detect that the user is frustrated, hesitant or speaking quietly.

If the TTS only receives this:

```text
I understand. I'll check it.
```

it may read it in a neutral tone. Understanding was audio-native, but the response crossed a plain-text boundary again.

One way to avoid that is to add an intermediate contract:

```json
{
  "text": "I understand. I'll check it.",
  "speech_plan": {
    "intent": "reassuring",
    "pace": 0.92,
    "energy": 0.42,
    "pause_before_ms": 180,
    "emphasis": ["understand"],
    "pronunciations": {},
    "voice_profile": "support_es_v3"
  }
}
```

The `SpeechPlan` is not shown to the user and does not need to enter the conversation history either. Its job is to carry expressive intent to the TTS.

{{ include_html("snippets/articulos-tecnicos/voice-arch-speech-plan.html") }}

It can be produced in three ways:

1. The model returns text and metadata in parallel
2. A lightweight layer derives the plan from the audio and the response
3. The TTS receives style instructions or expressive tokens

The first option makes traceability easier. The second separates conversation from voice control more cleanly. The third reduces contracts, although it also couples the system more tightly to the synthesis provider.

### Streaming needs a good chunker

Sending every delta to the TTS reduces waiting time, but it can break intonation. Chunks that are too short sound choppy. Chunks that are too long delay the first audio.

A *semantic chunker* can close a unit when it finds:

- Strong punctuation
- A stable clause
- A length limit
- An explicit `SpeechPlan` pause
- A change of intent
- A tool call that requires stopping the response

```python
async for delta in realtime.output_text():
    chunker.push(delta)

    for phrase in chunker.pop_ready_phrases():
        await tts.enqueue(
            text=phrase.text,
            speech_plan=phrase.speech_plan,
        )
```

The chunker needs a small revision margin. A response can begin with "Yes" and continue with "Yes, but...". Synthesizing the first token too early creates an acoustic promise that is hard to take back.

### What is still necessary

Half cascade does not eliminate:

- Playback and its truncation
- TTS cancellation
- Tool coordination
- Asynchronous results
- Idempotency
- Proactive delivery
- Measurement all the way to the audio that was actually heard

It also introduces the `SpeechPlan`. The extra contract is worthwhile when audio-native understanding and the freedom to choose a TTS matter enough to justify it.

## 3. Speech-to-speech: audio ↔ model

In speech-to-speech, the same model consumes audio and produces audio:

```text
user audio
↔ speech-to-speech model
↔ agent audio
```

The diagram is much cleaner. The full system still needs telephony, tools, state, policies, security and observability.

Modern Realtime models can receive and emit audio directly and also support function calling.[^openai-gpt-realtime] The main advantage is that understanding and expression share an acoustic representation.

{{ include_html("snippets/articulos-tecnicos/voice-arch-duplex.html") }}

### Where S2S stands out

**Conversational rhythm.** It can generate backchannels, adapt tempo and react without waiting for a stable transcript.

**Prosodic continuity.** The acoustic signal does not need to be compressed to text between input and response.

**More natural barge-in.** The session can react to user activity and cut output with fewer intermediaries.

**Fewer boundaries.** Serializations, contracts and buffers between STT, LLM and TTS are reduced.

**Better fit for full-duplex.** Some models can listen while speaking and adjust the response during overlap.

S2S and full-duplex are not the same thing. A model can receive audio and return audio in a strictly turn-based way. Full-duplex requires processing both directions at the same time and remaining coherent when both sides speak.

### What becomes harder

**Auditability.** Transcripts, tool traces and heard-state need to be derived without assuming every generated audio sample reached the user.

**Voice control.** Pronunciation, style and identity depend more on the model's capabilities.

**Tool latency.** The conversation should not freeze while an operation takes time. Delegation or asynchronous continuity is needed.

**Cost.** Keeping an audio-native session running continuously can be more expensive than activating specialized models by stage.

**Compliance.** Redaction, filtering, PII and policies have to apply to audio, derived text and actions.

**Portability.** Session contracts, voices and function calling tend to be more tied to the provider.

## Measure more than the first audio

A fair comparison needs to separate several timings:

```text
T_detection       end of intervention detected
T_decision        intent and first useful decision
T_first_audio     first playable audio
T_interruption    speech_started → real agent silence
T_completion      operation accepted → result
T_delivery        result ready → completion heard
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-latency.html") }}

S2S usually has an advantage in `T_first_audio` and `T_interruption`. It can lose part of that advantage with conservative turn detection or an unstable network.

Full cascade can be competitive if STT, LLM and TTS are fast and work in streaming. The hard part is coordination.

Half cascade occupies an intermediate point. It keeps audio-native understanding and preserves an external voice that can be optimized and controlled.

Evaluation also needs quality metrics:

- Intent accuracy with noise and accents
- Entity preservation
- Correctness of tool arguments
- Prosodic naturalness
- Voice stability
- False interruptions
- Duplicate responses
- Task success
- Result traceability

## Decision matrix

| Dimension | Full cascade | Half cascade | Speech-to-speech |
|---|---|---|---|
| Prosody understanding | Low or indirect | High on input | High on input |
| Output prosody | High if the TTS is good | High with `SpeechPlan` + TTS | Native and model-dependent |
| Minimum possible latency | Medium | Low-medium | Low |
| Voice control | Very high | Very high | Variable |
| Observable tool calling | Very high | High | Medium-high |
| Orchestration complexity | Very high | High | Lower for modality, not for business logic |
| Portability across providers | High | Medium | Low-medium |
| Natural full-duplex | Difficult | Possible | Best fit |
| Textual compliance | Direct | Direct on output | Requires reliable derivations |
| Acoustic personalization | Dedicated TTS | Dedicated TTS | Model-dependent |
| Stage-by-stage debugging | Excellent | Good | Harder |

There is no winning architecture for every product.

{{ include_html("snippets/articulos-tecnicos/voice-arch-decision.html") }}

### Choose full cascade when

- Text-level traceability and stage-level control are mandatory
- Providers need to be interchangeable
- The product depends on a specific TTS voice
- The domain can tolerate a more turn-based conversation
- The team already knows how to operate a distributed state machine

### Choose half cascade when

- Acoustic cues materially improve understanding
- You want to eliminate STT → LLM reconciliation
- The external TTS voice is a product advantage
- You can design and evaluate a `SpeechPlan`
- You need text output you can govern directly

### Choose S2S when

- Timing, naturalness and full-duplex behavior are priorities
- The model provides suitable voice quality and tool calling
- The team can instrument what audio was actually heard and which actions executed
- The benefits of a continuous session justify its cost and tighter coupling
- The product can accept less modularity in acoustic behavior

## Hot take: S2S in front, heavy reasoning behind

My bet is not to replace the whole platform with one giant S2S model.

The architecture I prefer separates the system into two layers with different latency budgets:

```text
S2S Interaction Surface
    ↕ events, context and deliveries
Cognitive Execution Plane
    ↕
tools, RAG, workflows, workers and side effects
```

The **S2S Interaction Surface** is small, fast and full-duplex. It handles conversation-facing work:

- Listen
- Know when to intervene
- Produce backchannels
- Maintain a stable voice
- Manage barge-in
- Answer lightweight questions
- Accept work
- Deliver results when there is a safe opening

The **Cognitive Execution Plane** can be heavier. It handles deeper execution:

- Deep reasoning
- Planning
- RAG
- Tool calls
- Parallel routines
- Retries
- Idempotency
- Validations
- Compensations
- Structured result generation

The surface remains responsive instead of blocking on long-running work. It can say:

> "I'm checking it. In the meantime, tell me which time slot you prefer."

The cognitive plane keeps working and publishes a `DeliveryEnvelope` when it finishes. The surface decides whether to deliver it, batch it or incorporate it into the next turn.

GPT-Live points in a similar direction. A full-duplex surface keeps the conversation going while delegating search, deeper reasoning and complex work to a frontier model.[^gpt-live]

MoshiRAG explores a related idea in research. It combines a compact full-duplex interface with asynchronous retrieval to improve factuality without breaking the interaction.[^moshirag]

{{ include_html("snippets/articulos-tecnicos/voice-arch-surface.html") }}

### Few-shot prompting with voice samples

A further extension is to pass authorized audio examples to the surface:

```text
system instructions
+ conversational policy
+ pronunciation lexicon
+ 3–15 s audio references
+ consent and provenance metadata
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-voice-prompt.html") }}

As with text few-shot prompting, examples provide format, tone or criteria. In voice, samples can condition:

- Voice identity
- Rhythm
- Timbre
- Pronunciation
- Style
- Acoustic environment
- Expressiveness

VALL-E demonstrated *acoustic prompting* with a three-second recording and showed preservation of identity, emotion and environment.[^valle]

OpenAI Voice Engine showed generation conditioned on a 15-second sample. Access remained limited because of impersonation risks.[^voice-engine]

That supports the technical direction, but does not mean every commercial S2S model offers this capability today.

For production use, separate:

1. **Authorized base voice**, which defines identity
2. **Turn style**, which defines emotion, energy and rhythm
3. **Environment or quality**, which should not be copied accidentally

Clear controls are also needed:

- Verifiable consent
- Sample provenance
- Blocked identities
- Synthetic-audio detection and labeling
- Revocation
- Traces of the sample used in each session
- Anti-impersonation limits
- Protection of samples at rest and in transit

Better voice imitation must not become a mechanism for cloning arbitrary people.

## One harness for all three architectures

All three variants should be evaluated with the same corpus and the same task contract.

### Dataset

- Real languages and markets
- Noise, reverberation and degraded telephony
- Fast, slow and accented voices
- Interruptions
- Self-corrections
- Fast and slow tools
- Results that arrive during another turn
- Sensitive entities and brand pronunciations

### Metrics

```text
turn_detection_delay_ms
speech_stop_to_first_audio_ms
barge_in_to_silence_ms
semantic_error_rate
entity_preservation_rate
tool_argument_accuracy
task_success_rate
prosody_preference_score
voice_identity_stability
duplicate_delivery_rate
cost_per_successful_minute
```

### Protocol

1. Use the same scenario and expected outcome
2. Run several seeds or sessions
3. Record input audio and the audio that was actually played
4. Compare tool traces and side effects
5. Run a blinded human evaluation of naturalness
6. Analyze failures by architecture, not only averages
7. Repeat under congestion and slow dependencies

The goal is not to prove one option saves a few milliseconds in a lab. It is to find which architecture preserves the conversation, completes the task and retains control when components fail or overlap.

## Conclusion

Full cascade remains a strong choice when modularity, control and auditability matter most.

Half cascade is especially attractive when audio-native understanding matters but you still want an external TTS and text output you can govern directly.

Speech-to-speech offers the best starting point for timing, prosody and full-duplex. Even so, it does not eliminate the runtime or tools.

The hybrid direction looks most promising:

> **A fast S2S surface for the conversation, a heavier cognitive plane for the work, and a persistent contract that keeps them synchronized.**

A `Voice Prompt Pack` with authorized samples, pronunciations and expressive policy can be added to that architecture.

Each layer can then operate at the speed and with the level of control it needs instead of forcing one model to do everything.

## Sources

[^openai-realtime-intro]: OpenAI, [Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/). Comparison with ASR → LLM → TTS pipelines and the loss of acoustic signals.
[^openai-python-realtime]: OpenAI, [OpenAI Python SDK — Realtime API](https://github.com/openai/openai-python). Example of `output_modalities: ["text"]` and streaming `response.output_text.delta`.
[^openai-gpt-realtime]: OpenAI, [gpt-realtime model](https://developers.openai.com/api/docs/models/gpt-realtime). Text and audio input/output, WebRTC, WebSocket, SIP and function calling.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 8 July 2026. Full-duplex surface with delegation to a frontier model.
[^moshirag]: MoshiRAG, [Full-Duplex Spoken Dialogue with Retrieval-Augmented Generation](https://arxiv.org/abs/2604.12928), 2026.
[^valle]: Microsoft Research, [VALL-E](https://www.microsoft.com/en-us/research/project/vall-e-x/vall-e/). Acoustic prompting with a three-second sample and ethical considerations.
[^voice-engine]: OpenAI, [Navigating the challenges and opportunities of synthetic voices](https://openai.com/index/navigating-the-challenges-and-opportunities-of-synthetic-voices/). Voice Engine conditioned on a 15-second sample and deployment limited for safety.
