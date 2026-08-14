---
title: Three architectures for voice agents — full cascade, half cascade and speech-to-speech
description: "Technical comparison of full-cascade, half-cascade and native speech-to-speech voice agents: prosody, latency, barge-in, tools, observability and a hybrid S2S interaction-surface architecture."
date: 2026-08-06
keywords: "voice agent architecture, speech to speech, half cascade, full cascade, realtime voice AI, barge in, speech plan, OpenAI realtime, ElevenLabs, latency"
article_state: published
tags:
  - AI
  - Voice
  - Realtime
  - Architecture
  - Agents
---

# Three architectures for voice agents

> **Question:** where should audio become semantic state, and where should semantic state become audio again?  
> **Architectures:** full cascade, half cascade and native speech-to-speech.  
> **Conclusion:** no single topology wins every product; modality quality, tool control and conversational timing pull in different directions.

A production voice agent is more than STT + LLM + TTS. It is a realtime distributed system with turn detection, interruption, streaming, tool calls, playback acknowledgement, retries and human-visible timing.

The cleanest comparison starts by separating the modality path from the business/runtime path.

{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}

## 1. Full cascade: speech → text → LLM → text → speech

The traditional pipeline is explicit:

```text
microphone / phone
→ VAD / end-of-turn
→ STT
→ text LLM
→ text response
→ TTS
→ playback
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-cascade.html") }}

### Strengths

**Auditability.** Every stage has a human-readable representation. You can inspect transcript, prompt, response text and tool arguments independently.

**Provider modularity.** STT, LLM and TTS can be swapped separately.

**Voice control.** A dedicated TTS engine can provide a stable voice, pronunciation dictionary, style tags and acoustic consistency.

**Debugging.** Latency and correctness can be attributed to specific components.

### Weaknesses

The pipeline creates several serialization boundaries. End-of-turn must be detected, STT must emit enough text, the LLM must respond, and TTS must produce playable audio.

More importantly, STT compresses the acoustic signal into text. Prosody, hesitation, pace, emotion, overlap and some disfluency information may be reduced or lost before the language model reasons about the turn.

{{ include_html("snippets/articulos-tecnicos/voice-arch-prosody-loss.html") }}

A full cascade can recover some of this with auxiliary features—VAD metadata, sentiment/prosody models, word timings and confidence—but the architecture still treats text as the main semantic interface.

## 2. Half cascade: audio-native understanding + external TTS

Half cascade keeps the input side audio-native while preserving a dedicated output voice.

```text
microphone / phone
→ realtime audio model
→ governed text / semantic response
→ external TTS
→ playback
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-half.html") }}

The model hears the original audio rather than an STT transcript. That can retain information about pace, emphasis, interruption, accent and other acoustic cues. The output remains text so the product can apply policy, pronunciation and a chosen TTS voice.

### Why it is attractive

- removes STT → LLM reconciliation;
- preserves input prosody;
- retains an auditable text boundary before synthesis;
- allows a specialized TTS provider;
- keeps tool calling and business logic observable.

The cost is orchestration. The runtime still needs to coordinate audio understanding, text streaming, tool calls, TTS streaming and playback.

### `SpeechPlan`: keep semantic output governable but expressive

Plain text is often too weak a contract for a rich external TTS. Rather than letting the model emit provider-specific markup everywhere, define a compact, provider-neutral speech plan:

```json
{
  "text": "I found two options for tomorrow morning.",
  "delivery": {
    "tone": "warm-professional",
    "energy": 0.62,
    "pace": "medium",
    "emphasis": ["two options", "tomorrow morning"],
    "pause_after_ms": 180
  }
}
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-speech-plan.html") }}

The TTS adapter maps that plan to the capabilities of ElevenLabs, OpenAI audio, another provider or an internal synthesizer.

The important property is that **semantic truth remains in `text`; delivery intent is a separate structured layer**. That makes evaluation and provider changes much easier than embedding uncontrolled acoustic instructions directly into prose.

## 3. Native speech-to-speech: audio in, audio out

A native S2S model handles both perception and generation in the acoustic domain:

```text
audio stream
↕
realtime speech model
↕
audio stream
```

Text and tool events can still exist, but they are no longer mandatory serialization boundaries for every conversational turn.

### Strengths

**Low interaction latency.** The system can begin reasoning and responding before a complete STT→LLM→TTS chain finishes.

**Prosody preservation.** The model can use acoustic cues directly.

**Full-duplex fit.** Native realtime models are architecturally closer to simultaneous listening/speaking and backchannel behaviour.

**Natural timing.** Pauses, rhythm and interruption can be part of the model's learned behaviour rather than reconstructed downstream.

### Weaknesses

**Less modular acoustic control.** Voice identity and style depend more heavily on the model's native capabilities.

**Harder debugging.** When perception and synthesis share a model, it is harder to attribute one failure to STT, reasoning or TTS.

**Provider coupling.** Replacing the realtime model can change both cognition and voice behaviour at once.

**Audit/compliance work.** Products needing a governed textual representation must derive one reliably from the session.

A native S2S session therefore simplifies modality orchestration but does **not** eliminate business-runtime orchestration.

## 4. Full duplex is a runtime problem as well as a model feature

A model may support simultaneous audio input/output, but the product still needs to decide how to handle overlapping human and agent speech.

A realtime voice runtime tracks at least:

```text
user_speech_started
user_speech_stopped
response_started
first_audio_played
agent_speech_active
barge_in_detected
playback_cleared
response_cancelled
heard_offset
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-duplex.html") }}

### Barge-in sequence

A robust interruption path usually requires:

1. detect user speech;
2. cancel current model output if possible;
3. stop/cancel TTS generation if external;
4. clear queued playback/media;
5. record how much audio was actually heard;
6. truncate conversational history to the heard boundary;
7. continue listening without cancelling unrelated durable work.

The latency users perceive is not “VAD latency” or “model latency” alone. It is the complete `speech_started → actual silence` path.

## 5. Tool calling should remain a first-class observable event

All three architectures can use tools. The question is how explicitly tool state is represented.

For production systems, a tool event should still have stable identifiers and durable state:

```python
@dataclass
class ToolOperation:
    operation_id: str
    session_id: str
    response_id: str | None
    tool_name: str
    arguments: dict
    idempotency_key: str
    status: str
```

The voice model may propose the call. Authorization, idempotency and side-effect truth should remain outside the model.

Slow work should follow the same proactive-delivery architecture described in the previous articles: accept quickly, execute durably, then publish a result to the interaction surface.

A speech-to-speech model does not make a five-second CRM call conversationally synchronous.

## 6. Compare architectures with the same timing definitions

A fair comparison needs several distinct clocks:

```text
T_detection       end of user intervention detected
T_decision        intent and first useful decision
T_first_audio     first playable audio
T_interruption    speech_started → real agent silence
T_completion      accepted operation → result ready
T_delivery        result ready → completion actually heard
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-latency.html") }}

S2S usually has an advantage in `T_first_audio` and often in `T_interruption`, especially when the model and transport support full duplex well. Conservative turn detection or network instability can erase part of that advantage.

Full cascade can still be competitive when STT, LLM and TTS are individually fast and stream aggressively. Its main cost is coordination between stages.

Half cascade occupies the middle: audio-native understanding without giving up an external voice and governed text output.

### Quality metrics matter too

- intent accuracy under noise and accents;
- entity preservation;
- tool-argument correctness;
- prosody/naturalness;
- voice identity stability;
- false interruptions;
- duplicate responses/deliveries;
- task success;
- result traceability.

## 7. Decision matrix

| Dimension | Full cascade | Half cascade | Speech-to-speech |
|---|---|---|---|
| Input prosody understanding | Low / indirect | High | High |
| Output prosody | High with strong TTS | High with `SpeechPlan` + TTS | Native / model-dependent |
| Minimum possible latency | Medium | Low–medium | Low |
| Voice control | Very high | Very high | Variable |
| Tool calling observability | Very high | High | Medium–high |
| Orchestration complexity | Very high | High | Lower modality complexity; business runtime remains |
| Provider portability | High | Medium | Low–medium |
| Natural full duplex | Difficult | Possible | Best fit |
| Textual compliance boundary | Direct | Direct on output | Requires reliable derived representation |
| Acoustic personalization | Dedicated TTS | Dedicated TTS | Model-dependent |
| Stage-by-stage debugging | Excellent | Good | Harder |

{{ include_html("snippets/articulos-tecnicos/voice-arch-decision.html") }}

### Choose full cascade when

- textual traceability and stage-level control are mandatory;
- provider portability matters;
- voice identity depends on a specific TTS;
- the domain tolerates more turn-based timing;
- the team already operates a distributed state machine confidently.

### Choose half cascade when

- acoustic information materially improves understanding;
- STT→LLM reconciliation should be removed;
- an external TTS is a product advantage;
- a `SpeechPlan` can be designed/evaluated;
- governed text output is still required.

### Choose native S2S when

- timing, naturalness and full-duplex behaviour are primary requirements;
- the model provides suitable voice quality and tool events;
- actual played audio and external actions can be instrumented;
- continuous session cost/coupling is acceptable;
- reduced acoustic modularity is an acceptable trade-off.

## 8. A hybrid architecture: S2S interaction surface + cognitive execution plane

The architecture I find most promising does not move every responsibility into one giant speech model. It separates two speeds:

```text
S2S Interaction Surface
    ↕ events, context, deliveries
Cognitive Execution Plane
    ↕
tools, RAG, workflows, workers, side effects
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-surface.html") }}

### S2S Interaction Surface

Small, fast and full duplex. It owns the human timing:

- listen continuously;
- know when to respond;
- backchannel;
- manage barge-in;
- keep a stable conversational voice;
- answer lightweight questions;
- accept long-running work;
- deliver completed work at a safe conversational moment.

### Cognitive Execution Plane

Can be slower and heavier:

- deep reasoning;
- planning;
- RAG;
- tool calls;
- parallel routines;
- retries/idempotency;
- validations;
- compensating actions;
- structured result generation.

The surface does not remain blocked while the execution plane works. It can continue the conversation and receive a `DeliveryEnvelope` later.

This resembles the direction of full-duplex surfaces delegating heavier search/reasoning to separate frontier cognition. Research such as MoshiRAG explores a related idea: compact full-duplex spoken interaction combined with asynchronous retrieval.

## 9. Few-shot voice prompting with authorized audio samples

A further extension is to condition the interaction surface with authorized acoustic references:

```text
system instructions
+ conversational policy
+ pronunciation lexicon
+ 3–15 s authorized audio references
+ consent / provenance metadata
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-voice-prompt.html") }}

The analogy with text few-shot prompting is direct. Audio examples can potentially condition:

- voice identity;
- rhythm;
- timbre;
- pronunciation;
- speaking style;
- expressiveness;
- acoustic environment.

VALL-E demonstrated acoustic prompting from a three-second recording. OpenAI's Voice Engine research showed generation conditioned on a 15-second sample, while access remained limited because of impersonation risk.

This supports the technical direction without implying that every commercial S2S model exposes such a capability today.

For product design, separate:

1. **authorized base voice identity**;
2. **turn-level delivery style**;
3. **environment/quality characteristics**, which should not be copied accidentally.

Controls are mandatory:

- verifiable consent;
- sample provenance;
- blocked identities;
- synthetic-audio labelling/detection where appropriate;
- revocation;
- audit trail of the sample/profile used by a session;
- anti-impersonation boundaries;
- encryption/protection of reference samples.

Improving voice imitation must not become an unrestricted cloning path.

## 10. One evaluation harness for all three architectures

The three variants should use the same task corpus and outcome contract.

### Dataset

- real languages/markets;
- background noise, reverb and degraded telephony;
- fast/slow/accented speakers;
- interruptions and self-corrections;
- fast and slow tools;
- results completing during another turn;
- sensitive entities and brand pronunciation.

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

1. hold scenario and expected outcome constant;
2. execute multiple seeds/sessions;
3. record input audio and the audio actually played;
4. compare tool traces and external side effects;
5. run blinded human naturalness evaluation;
6. analyse failures by architecture, not only averages;
7. repeat under congestion and slow dependencies.

The goal is not to prove one architecture saves a few lab milliseconds. It is to discover which architecture preserves conversation quality, task completion and control when components overlap or fail.

## 11. Conclusion

Full cascade remains strong when modularity, stage-level observability and textual governance dominate.

Half cascade is especially attractive when audio-native understanding matters but a dedicated TTS voice and governed textual response are still product requirements.

Speech-to-speech is the strongest starting point for timing, prosody and full duplex, but it does not eliminate tools, durable execution or runtime state.

> **The most promising direction is a fast S2S interaction surface, a heavier cognitive execution plane, and a durable event/delivery contract that keeps them synchronized.**

## Sources

- OpenAI — *Introducing the Realtime API*.
- OpenAI Python SDK — Realtime API examples and text output modalities.
- OpenAI — `gpt-realtime` model documentation.
- OpenAI (8 July 2026) — *Introducing GPT-Live*.
- MoshiRAG (2026) — *Full-Duplex Spoken Dialogue with Retrieval-Augmented Generation*.
- Microsoft Research — VALL-E acoustic prompting.
- OpenAI — Voice Engine / synthetic voice safety research.

## Frequently asked questions

**Which architecture has the lowest theoretical interaction latency?**  
Native S2S usually has the advantage because it avoids mandatory STT→LLM→TTS serialization, but turn detection, transport and product policy can dominate real latency.

**Why use half cascade instead of S2S?**  
It preserves audio-native input understanding while keeping a dedicated, controllable external TTS voice and a governed text boundary before synthesis.

**Does S2S eliminate the agent runtime?**  
No. Tool authorization, durable operations, idempotency, result delivery, interruption and playback acknowledgement still require explicit runtime state.

**What should be compared across architectures?**  
The same task outcome, tool traces, actually heard audio, interruption timing, entity preservation, task success, naturalness and cost—not isolated component benchmarks.
