---
title: "Voice-agent architectures: cascades, speech-to-speech and full-duplex"
description: "How full cascade, half cascade, speech-to-speech and full-duplex work. Models, papers, latency, interruptions, tools and GPT-Live evidence."
date: 2026-08-04
date_modified: 2026-09-12
keywords: "voice agents, full cascade, half cascade, speech-to-speech, full duplex, half duplex, Moshi, GPT-Live, audio LLM, latency, tool calling"
article_state: published
tags:
  - AI
  - Voice
  - Architecture
  - Multimodality
  - Realtime
  - Tool Calling
---

# Voice-agent architectures: cascades, speech-to-speech and full-duplex

A customer requests a reservation for Friday. While the agent checks availability, the customer corrects the date: “Sorry, Thursday.” The system must hear the correction, avoid an outdated confirmation and check what happened to the reservation. Natural-sounding speech does not solve those three tasks.

GPT-Live-1, available for application integration since September 10, 2026, can listen while speaking and delegate reasoning and actions. This analysis uses that release to compare three audio paths and, separately, turn management and operation state. It does not treat cascades as necessarily obsolete.[^live-api]

> **Evidence cutoff:** September 12, 2026. A review of 32 selected primary sources, not an exhaustive literature survey or a benchmark run by 5sigmas. Proposed equations, contracts and tests are distinguished from published results. Numbers retain their provider, configuration and metric definition.

OpenAI reports a **30-percentage-point** improvement over GPT-Realtime-2.1 on Full Duplex Bench and a first-place Tau3 result **with GPT-6 Astra medium as the backend**, the model handling delegated work. These are provider results for a particular configuration, not independent evidence of universal superiority.[^live-api]

## 0. Four decisions that should not be mixed

| Axis | Question | Options |
|---|---|---|
| Modality boundaries | What crosses each component? | Audio → text → text → audio; audio → text → audio; audio → audio |
| Interaction | When does the system listen and respond? | Strict turns; interruptible turns; continuous interaction |
| Orchestration | Who reasons and executes? | One engine; several specialists; voice surface plus asynchronous backend |
| Initiative | What triggers an intervention? | User request; external event; pending result; proactive policy |

**Speech-to-speech and full-duplex are not synonyms.** The former describes the modality path; the latter describes simultaneity and temporal behavior. OpenAI explicitly distinguishes Live, Realtime and chained pipelines; Moshi provides a published example of continuous conversational modeling.[^voice-guide][^moshi]

There are also three distinct meanings of “duplex”: bidirectional transport can send and receive packets; a runtime can keep detecting the user during playback; a model can condition its next acoustic output on input arriving while it speaks. Satisfying the first does not establish the other two.

Here, **half cascade** specifically means **audio-in / text-out plus external TTS**. It is useful architectural shorthand, not a universal scientific nomenclature. “Half” does not mean half-duplex or half the latency.

{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}

## 1. Full cascade: audio → STT → LLM → TTS → audio

```text
Microphone / telephony
    → ASR or STT: audio → text hypotheses
    → LLM: text + context + tool results → response
    → TTS: text + voice controls → audio
    → playback queue → device

In parallel: turn detection, cancellation, traces and action state.
```

STT and ASR refer here to speech recognition; LLM is the language model and TTS is speech synthesis. Each boundary is an observable, replaceable contract. Whisper is an ASR reference, not a guarantee of streaming or endpointing simply because its weights have been integrated.[^whisper]

### What is being approximated

An idealized modular factorization is:

\[
p(y\mid x,c,s)=\sum_{z,t}p_{\mathrm{ASR}}(z\mid x)\,p_{\mathrm{LM}}(t\mid z,c)\,p_{\mathrm{TTS}}(y\mid t,s).
\]

Here \(x\) is incoming audio, \(z\) a transcript, \(t\) the textual response, \(y\) outgoing audio, \(c\) context and \(s\) voice control. This is an **analytical system model**, not a product's training equation. Independence between stages is an explicit assumption.

Production systems often pass a single hypothesis \(\hat z\), not the full distribution over transcripts. “Fifteen” and “fifty” then stop competing as alternatives: the LLM receives a decision already made. Retaining partials, alternatives, confidence and entity confirmations is a product decision, not something a larger LLM resolves automatically.

{{ include_html("snippets/articulos-tecnicos/voice-arch-cascade.html") }}

### The text boundary and prosody

A conventional transcript does not preserve all information about pauses, emphasis or rhythm. However, it would be wrong to say that a cascade cannot use acoustic signals: it can carry timestamps, non-verbal events or a parallel encoder. SALMONN and Qwen2-Audio show different ways to incorporate audio information into a language model.[^salmonn][^qwen2audio]

The intuition can be formalized with the data-processing inequality: under the Markov chain \(U\to X\to Z\), \(I(U;Z)\leq I(U;X)\). This does not prove that any audio model understands intent better; it says that a textual summary cannot create missing information. With side channels, the relevant object becomes \((Z,A)\), not only \(Z\). This is a deduction about channel design.

TTS output can be highly expressive even when its input was text. **Output expressiveness and preservation of the input signal are different properties.** An acoustic inference about emotion should not be treated as a demonstrated fact about a person either.

{{ include_html("snippets/articulos-tecnicos/voice-arch-prosody-loss.html") }}

### Streaming, speculation and control

A cascade need not wait for the full transcript, then the full response, then all the audio. Recognition, generation and synthesis can overlap. LiveKit documents turn and interruption control in composed systems; Pipecat organizes processing through frames and pipelines.[^livekit][^pipecat]

This overlap introduces a concrete problem: **which work is provisional, and which work can no longer be withdrawn**. An STT revision may invalidate a speculative response; a phrase sent to TTS may remain queued; a phrase already played cannot be “unsaid” by an internal cancellation.

A cascade offers clear points to log transcripts, validate text before synthesis, choose a voice and change providers. The price of modularity is coordinating revisions, backpressure, partial failures and cancellation. Text logs facilitate auditing but do not, by themselves, certify that the user heard the correct words.

**Recommended fit:** domains prioritizing textual control, portability, pronunciation dictionaries and stage-level diagnosis. Compare against alternatives using the same runtime, not against an intentionally slow batch implementation.

## 2. Half cascade: audio → audio model → text → TTS

```text
Audio → audio encoder / adaptation → language model
                                   → stable text + optional style
                                   → external TTS → playback
Auxiliary transcript ──────────────────────────────→ observability
```

The model receives an audio representation without requiring an external transcript as its only input. Qwen2-Audio is an audio-in / text-out reference. The Ultravox repository describes audio input and text output without a mandatory external speech-recognition stage. The Realtime API documents responses with `output_modalities: ["text"]`.[^qwen2audio][^ultravox][^realtime]

**Audio-native does not mean the absence of an encoder, text supervision or components pretrained with ASR.** It describes the interface and representation available to the model. Nor does it establish that a checkpoint accepts indefinitely streamed audio: causality, windows, state and the specific API must be checked.

{{ include_html("snippets/articulos-tecnicos/voice-arch-half.html") }}

### What changes and what does not

The mandatory external ASR → LLM boundary disappears, but entity-recognition errors do not. The model can exploit acoustic cues when its training and evaluations support that ability. A textual boundary remains on output: a TTS receiving only “All right” does not necessarily know how it should be spoken.

An intermediate contract can carry expressive instructions. This **SpeechPlan is an application proposal**, not a standard from OpenAI, Qwen or Ultravox:

```json
{
  "response_id": "r42",
  "segment_id": "r42.3",
  "text": "The interview is still awaiting confirmation.",
  "delivery": {"style": "neutral", "pace": "measured"},
  "pronunciation_lexicon_version": "en-v3",
  "commit": "stable_text"
}
```

The adapter must map these fields to controls the synthesizer actually supports. An ignored `style` field does not preserve prosody. Ultravox documents external TTS integration; that establishes a viable contract, not acoustic equivalence between providers.[^ultravox-tts]

{{ include_html("snippets/articulos-tecnicos/voice-arch-speech-plan.html") }}

### The streaming unit matters

I would not send every isolated token to the synthesizer. A chunker can wait for a stable clause, a maximum wait or a punctuation boundary. It must balance latency, semantic stability and prosodic continuity, while distinguishing provisional text from committed text.

For example, “Yes…” followed by “…there is availability, but not on Friday” should not become a premature confirmation. Proposing a short wait is different from inventing a universal millisecond value: the threshold needs tuning against that voice and language.

**Recommended fit:** acoustic information on input adds value, but the product needs a particular TTS or approval of text before emission. Synthesis cancellation, buffer clearing, tool state and actual-playback logging remain necessary.

## 3. Speech-to-speech: audio → model → audio

S2S removes the requirement to expose an exclusively textual exchange between understanding and synthesis. **It does not require one transformer or prohibit internal text generation.** AudioLM studies semantic and acoustic discrete representations; EnCodec studies neural compression. Neither ingredient alone produces a conversational agent.[^audiolm][^encodec]

Several families exist within S2S:

| Family | Representative mechanism | Important distinction |
|---|---|---|
| Modality sequences | SpeechGPT relates discrete speech and language through adaptation and instruction training | Integrated speech does not necessarily remove sequential steps |
| Aligned text and audio | Moshi generates text associated with its own speech alongside acoustic streams | Auxiliary text is not a mandatory external STT |
| Thinker–Talker | Qwen2.5-Omni and Qwen3-Omni separate semantic processing and voice generation with internal coupling | Two internal modules are not automatically a text-service cascade |
| Adapters around an LLM | LLaMA-Omni and Freeze-Omni explore speech input/output integration with different degrees of LLM preservation | Inspect training and runtime rather than inferring duplex from the name |

These are representative families, not mutually exclusive partitions.[^speechgpt][^moshi][^qwen25][^qwen3][^llamaomni][^freeze]

### What “native” means at token level

A codec turns a waveform into compact representations. The model predicts representations; a decoder turns them into audio. Compression, causality and the amount of future context affect how soon a segment can be emitted. A strong semantic model with a decoder requiring substantial context can still have poor startup latency.[^audiolm][^encodec][^qwen3]

In Moshi, Mimi operates at 12.5 frames per second; user and agent audio have separate streams alongside auxiliary text. The design combines temporal and depth transformers. The paper distinguishes 160 ms theoretical and approximately 200 ms practical latency: **these are not a telephony useful-answer SLA**.[^moshi]

A simplified analytical model of continuous conversation is:

\[
q_\theta(a^{\mathrm{out}}_{1:T}\Vert a^{\mathrm{in}}_{1:T},c)
:=\prod_t q_\theta(a^{\mathrm{out}}_t\mid a^{\mathrm{in}}_{\le t},a^{\mathrm{out}}_{<t},c).
\]

The symbol \(\Vert\) denotes causal conditioning, not ordinary conditioning on future inputs. Indices represent aligned frames after implementation delays. Codebooks and textual variables are omitted to expose the causal requirement: future output can depend on newly arriving input audio. The equation does not assert a specific internal factorization for GPT-Live.

## 4. Half-duplex, barge-in and full-duplex

{{ include_html("snippets/articulos-tecnicos/voice-arch-duplex.html") }}

**Strict turns.** The agent waits for a turn to close, produces a response and does not incorporate simultaneous speech during it. This can be a push-to-talk interface or an application policy. An S2S model can also be used this way.

**Interruptible turns.** The runtime keeps observing input and can stop the response when it detects the user taking the floor. This is *barge-in*. It does not establish that the model continuously integrates incoming speech within acoustic generation. Realtime permits control over turn detection and automatic responses; semantic endpointing is not simply waiting for silence.[^realtime][^vad]

**Continuous full-duplex interaction.** The system processes simultaneous input and output and decides whether to continue, pause, respond briefly or yield. This does not mean it should talk over the user. Moshi, PersonaPlex and GPT-Live offer different designs for studying this behavior.[^moshi][^personaplex][^live-intro]

A cascade can offer concurrent input and output through orchestration. That can create a duplex **system** without making each model natively duplex. A comparison must identify the layer it describes.

### Silence, interruption and backchannels differ

“Uh-huh” may encourage the agent to continue; “No, wait, change the date” may require stopping. Background noise and a side conversation should not automatically receive the same treatment. Successive Full-Duplex-Bench versions cover different aspects of pauses, overlap and prolonged conversation.[^fdb1][^fdb15][^fdb2]

A system that stops every output upon any sound can achieve an excellent stop-time metric and a terrible experience. Measure both reaction time and whether interrupting was the correct decision.

## 5. How these abilities are trained

There are three separate learning problems: represent audio, decide content and produce speech with appropriate timing. Training one does not automatically solve the others.

Audio-language models investigate encoder–LLM alignment, multimodal instructions and preservation of linguistic capabilities. Generative models investigate acoustic tokens, text alignment and incremental synthesis. Interaction models require examples where what happens while another person speaks matters.[^salmonn][^qwen2audio][^speechgpt][^freeze]

PersonaPlex adapts the Moshi line to control role and voice using textual and acoustic prompts, combining real interaction and synthetic conversations.[^personaplex] The engineering implication is important: perfectly alternating turns may teach content but do not, by themselves, cover natural interruptions, hesitations and overlap.

For a new integration, I would separate ablations: the same LLM with text versus audio; the same audio model with different TTS systems; the same model with different endpointing; the same frontend with backends of different capability. Changing every component simultaneously prevents attribution of gains to architecture.

## 6. Continuous conversation and asynchronous execution

```text
                speech / silence / overlap
User ⇄ fast conversational surface
                     ⇅ requests and results
              asynchronous backend
                     ⇅
       retrieval · tools · workflows
                     ⇅
            persistent business state
```

The design hypothesis is to separate conversational pace from the cost of solving a task. GPT-Live documents this separation; MoshiRAG studies asynchronous knowledge retrieval for a full-duplex interface. Retrieval is not a transaction: MoshiRAG does not establish payment or booking safety.[^live-guide][^moshirag]

{{ include_html("snippets/articulos-tecnicos/voice-arch-surface.html") }}

The surface can keep listening during a search. It need not fill every turn with “perfect,” “thanks” or “I'm checking.” A backchannel should serve a conversational function, not hide real latency.

### Three states that must not be conflated

1. **Observed:** audio and corrections that reached the system.
2. **Played:** response segments that reached the instrumented playback point.
3. **Confirmed:** actions whose outcome was validated by the business system.

These records do not advance at the same speed. History should not say “interview confirmed” because the LLM generated that sentence, or because audio awaits in a queue.

A `DeliveryEnvelope` could contain `task_id`, the relevant context version, execution status, a structured result, provenance and a deduplication key. This is a proposed contract, not a provider API. Its relevance is revalidated on receipt: a corrected date can invalidate it; unrelated new speech need not do so.

**Interrupting speech does not mean canceling an action.** Separating the audio path from delegated work implies distinct lifecycles: stopping playback does not establish that the executor reversed an operation.[^live-engineering][^live-delegation] For an operation with external effects, I propose executor-side authorization, idempotency, status queries after timeouts and compensation where applicable. No prompt substitutes for these guarantees.

### The telephony detail that breaks many demos

Twilio documents `clear` for flushing buffers and `mark` for tracking playback. However, it also returns pending marks after `clear`: **a received `mark` does not always mean audio was played**.[^twilio]

The ledger must distinguish playback completion from discard after clearing. Even a provider playback acknowledgment does not establish that the person heard or understood the message. The metric must name the exact observation point.

## 7. Latency: five clocks, not one marketing number

{{ include_html("snippets/articulos-tecnicos/voice-arch-latency.html") }}

| Proposed metric | Start → end | What it reveals |
|---|---|---|
| First sound | Actual utterance end → first played audio | Initial responsiveness, including fillers |
| First useful answer | Actual utterance end → first answering content | Time to relevant information |
| Interruption | Valid interruption onset → actual output silence | Ability to yield the floor |
| Action | Accepted request → confirmed effect | Execution rather than verbal fluency |
| Delivery | Result available → result played | Backend/conversation coordination |

These are proposed harness definitions, not equivalences between paper metrics. Actual utterance end requires an external annotation or known reference: using the system's own endpoint decision can hide its error.

### Critical path, not a sum of p95 values

For a dependency graph, a completion-time approximation is:

\[
F_v=d_v+\max_{u\in\operatorname{pred}(v)}F_u.
\]

Time to first audio depends on the critical path, usable prefixes and queues. Stages can overlap. Furthermore, \(p95(A+B)\) is not generally \(p95(A)+p95(B)\). Compute percentiles over complete traces from the same population.

Qwen3-Omni reports theoretical first-packet latency of 234 ms at concurrency 1; the same table reports 728 ms at concurrency 4 and 1,172 ms at concurrency 6. This illustrates load sensitivity, not universal call latency.[^qwen3]

Within its own protocol, Full-Duplex-Bench-v3 reports 6.89 s and pass@1 of 0.60 for GPT-Realtime, versus 4.25 s and 0.54 for Gemini Live 3.1. That is an example of a within-study trade-off, **not a valid comparison with Moshi's 160 ms**. Its Whisper–GPT-4o–TTS baseline does not represent the limit of all cascades either.[^fdb3]

I would not connect these numbers with a trendline. Definitions, loads, runtimes, models and tasks differ.

## 8. GPT-Live: what the evidence does and does not establish

| Date | Verified milestone | Architectural interpretation |
|---|---|---|
| 2024 | Moshi | Continuous dialogue with separate acoustic streams already has a published reference |
| 2025 | Qwen2.5/3-Omni | Semantic/acoustic coupling can have internal modules and incremental output |
| January 2026 | PersonaPlex | Role and voice control can also be studied in full-duplex interaction |
| April 2026 | MoshiRAG | Asynchronous retrieval without making every search a blocking turn |
| July 8, 2026 | GPT-Live introduction | Continuous interaction with delegation for complex work |
| August 3, 2026 | Engineering publication | Audio path and asynchronous work are handled separately |
| September 10, 2026 | GPT-Live-1 API launch | Frontend/backend separation becomes a published integration option |

Sources: papers and official publications.[^moshi][^qwen25][^qwen3][^personaplex][^moshirag][^live-intro][^live-engineering][^live-api]

The defensible trend is **acoustic integration for conversation and separation of responsibilities for work**. This is an engineering synthesis, not a statistical regression or a claim that every agent should adopt the same design.

The GPT-Live engineering article describes an audio path separated from asynchronous calls to the delegated model. To switch instances or compact context, it prepares a replacement while the previous instance continues serving the session. It also separates a provisional conversation view from a finalized record: text, timing and speaker assignment can change before commitment. These are published system mechanisms, not guarantees that an arbitrary implementation achieves the same continuity.[^live-engineering] It does not disclose enough to reconstruct its tokenizer, parameter count, complete data mixture or internal training policy. I do not attribute Mimi or Thinker–Talker internals to GPT-Live.

“SOTA” requires a benchmark, version, date, configuration and evaluation provenance. First place for a system with an Astra backend does not isolate the voice frontend's capability. This review does not include an independent reproduction of that ranking or an original GPT-Live-1 experiment.

## 9. A decision matrix without a fictional winner

{{ include_html("snippets/articulos-tecnicos/voice-arch-decision.html") }}

| Dominant need | Reasonable starting point | Condition that can change the decision |
|---|---|---|
| Validate every sentence before speaking | Full cascade or audio-in/text-out | Added control delays audio; measure its real cost |
| Retain a product voice/TTS | Full or half cascade | A specific S2S service may also provide voice control |
| Interpret acoustic cues | Half cascade or S2S | Demonstrate improvement on domain data rather than assuming it |
| Handle overlap and natural turns | Model/runtime with tested full-duplex | Evaluate false interruptions and corrected entities |
| Reason or execute long-running tasks | Decoupled frontend and backend | Consistency and result delivery become central |
| Operate or replace components separately | Modular cascade | More contracts, observability and coordination |

Selection graphics are qualitative guides, not comparative provider measurements.

### Variants simplified by the three names

A system can use external ASR followed by a model generating text and speech; a text channel with a prosodic encoder; risk-based routing between S2S and a cascade; or precomputed responses alongside free generation. These are compositions of the same axes, not exceptions requiring a linear scale of “better architecture.”

LiveKit and Pipecat are runtime options, not a fourth model modality. A custom Python implementation offers state control but makes the team responsible for transport, concurrency, cancellation and tests. My recommendation is to compare interruption, playback and tool contracts before choosing a framework. A framework does not automatically confer distributed correctness.[^livekit][^pipecat]

### Cost and capacity

I would compare **cost per completed task**, not only price per minute or token:

\[
C_{\mathrm{success}}=\frac{C_{\mathrm{voice}}+C_{\mathrm{backend}}+C_{\mathrm{telephony}}+C_{\mathrm{infra}}+C_{\mathrm{retries}}}{N_{\mathrm{correct\ tasks}}}.
\]

Billable duration, silence, caching, concurrency, queues, cancellations and wasted work must be fixed. A local model can have zero marginal API cost and substantial capacity cost. A continuous session may consume resources during silence; that does not establish that every S2S implementation is more expensive.

The [latency](/en/tools/voice-latency-budget/) and [cost and capacity](/en/tools/voice-cost-capacity/) explorers help make assumptions explicit. Their scenarios do not replace deployment measurements.

## 10. Personalized voice and safety

VALL-E studies acoustic conditioning with a three-second sample. PersonaPlex combines role and voice control in full-duplex conversation. These demonstrate particular capabilities, not that every provider permits arbitrary voice cloning.[^valle][^personaplex]

{{ include_html("snippets/articulos-tecnicos/voice-arch-voice-prompt.html") }}

I would separate authorized identity, pronunciation and per-turn style. Samples need provenance and permission; tool credentials and authorization stay outside the model. A person's audio must not become a privileged source of backend instructions. Apply data minimization, traceability of the selected voice and anti-impersonation controls.

These are design recommendations, not legal certification. Likewise, retaining a transcript does not automatically make a system compliant, and retaining no audio does not guarantee privacy when traces contain personal data.

## 11. One harness for all three architectures

**Corpus.** Build scenarios with product-relevant noise, telephony, languages and accents; difficult names and numbers; self-corrections; long pauses; real interruptions; backchannels; slow tools; results arriving during another turn and connection failures. A content-oriented evaluation such as VoiceBench and a temporal evaluation such as Full-Duplex-Bench answer different questions.[^voicebench][^fdb1][^fdb15][^fdb2][^fdb3]

**Experimental control.** Use the same objective, instructions, tools and references. Pin model snapshot, voice configuration, transport, region, endpointing and load. Compare the complete product and, separately, single-component ablations. Publish which failures belong to the agent and which runs were invalidated by the harness.

**Measurement.** Log input and output audio at the instrumented point, text hypotheses, responses, tool calls, confirmed effects and discarded buffers. Measure entity accuracy, argument accuracy, task success, correct and incorrect interruptions, duplicated actions, first useful answer and cost per success.

**Statistics.** Repeat scenarios and report sample size and distributions. Use paired comparisons and, where appropriate, bootstrap clustered by speaker or session. Do not treat one hundred turns from one call as independent observations. Evaluate naturalness with blinded human judges, and do not turn MOS from another protocol into a common scale.

### Acceptance cases that would block a release

| Case | Required invariant |
|---|---|
| Friday-to-Thursday correction before confirmation | No new action is confirmed with the discarded date |
| Correction after a reservation was confirmed | Check actual state and apply the authorized change or compensation; do not pretend no reservation occurred |
| “Uh-huh” during an explanation | The policy distinguishes listening from a real stop request |
| Interruption with audio already queued | An invalidated response is not played after clearing |
| Booking timeout | State is queried before retrying a non-idempotent operation |
| Old result after a correction | The result is revalidated before announcement |
| Call ending with a queued goodbye | Hang-up does not depend only on the model finishing generation |

Numerical thresholds depend on product risk and experience. I do not propose one p95 that approves every domain, or claim these cases pass without executing them.

## Conclusion

Full cascade offers explicit contracts. Half cascade removes the external transcript as a mandatory boundary while retaining an independent synthesizer. S2S integrates the acoustic path, but its internal mechanisms and interaction behavior can differ substantially.

Full-duplex is another decision: listening during output, interpreting overlap and deciding when to yield. None of these options removes the responsibility to keep observed, played and confirmed states coherent.

**For agents with rich interaction and long-running tasks, my starting point would be a fast voice surface, an asynchronous backend and persistent business state. For a flow dominated by textual validation or a specific voice, I would start with a cascade. The final choice is earned in the same harness, not by counting boxes in a diagram.**

## Primary sources

[^voice-guide]: OpenAI, [Voice agents](https://developers.openai.com/api/docs/guides/voice-agents), 2026-09-10.
[^whisper]: Radford et al., [Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356), 2022.
[^salmonn]: Tang et al., [SALMONN: Towards Generic Hearing Abilities for Large Language Models](https://arxiv.org/abs/2310.13289), 2023.
[^qwen2audio]: Qwen team, [Qwen2-Audio Technical Report](https://arxiv.org/html/2407.10759v1), 2024.
[^ultravox]: Fixie, [Ultravox repository and architecture description](https://github.com/fixie-ai/ultravox), accessed 2026-09-12.
[^realtime]: OpenAI, [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations), 2026-09-10.
[^audiolm]: Borsos et al., [AudioLM: a Language Modeling Approach to Audio Generation](https://arxiv.org/abs/2209.03143), 2022.
[^encodec]: Défossez et al., [High Fidelity Neural Audio Compression](https://arxiv.org/abs/2210.13438), 2022.
[^speechgpt]: Zhang et al., [SpeechGPT: Empowering Large Language Models with Intrinsic Cross-Modal Conversational Abilities](https://arxiv.org/abs/2305.11000), 2023.
[^moshi]: Défossez et al., [Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/html/2410.00037v2), 2024.
[^qwen25]: Qwen team, [Qwen2.5-Omni Technical Report](https://arxiv.org/html/2503.20215v1), 2025.
[^qwen3]: Qwen team, [Qwen3-Omni Technical Report](https://arxiv.org/html/2509.17765v1), 2025.
[^llamaomni]: Fang et al., [LLaMA-Omni: Seamless Speech Interaction with Large Language Models](https://arxiv.org/abs/2409.06666), 2024.
[^freeze]: Wang et al., [Freeze-Omni: A Smart and Low Latency Speech-to-speech Dialogue Model with Frozen LLM](https://arxiv.org/abs/2411.00774), 2024.
[^personaplex]: Roy et al. / NVIDIA, [PersonaPlex: Voice and Role Control for Full Duplex Conversational Speech Models](https://research.nvidia.com/labs/adlr/personaplex/), 2026-01-15.
[^fdb1]: Lin et al., [Full-Duplex-Bench: A Benchmark to Evaluate Full-Duplex Spoken Dialogue Models on Turn-Taking Capabilities](https://arxiv.org/abs/2503.04721), 2025.
[^fdb15]: Full-Duplex-Bench authors, [Full-Duplex-Bench v1.5](https://arxiv.org/abs/2507.23159), 2025.
[^fdb2]: Full-Duplex-Bench authors, [Full-Duplex-Bench v2](https://arxiv.org/abs/2510.07838), 2025.
[^fdb3]: Full-Duplex-Bench authors, [Full-Duplex-Bench-v3: Benchmarking Tool Use for Full-Duplex Voice Agents Under Real-World Disfluency](https://arxiv.org/html/2604.04847v1), 2026-04-06.
[^voicebench]: Chen et al., [VoiceBench: Benchmarking LLM-Based Voice Assistants](https://arxiv.org/abs/2410.17196), 2024.
[^live-intro]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 2026-07-08.
[^live-engineering]: OpenAI, [Continuous voice interaction with GPT-Live](https://openai.com/index/continuous-voice-interaction-with-gpt-live/), 2026-08-03.
[^live-api]: OpenAI, [Build more natural voice experiences with GPT-Live-1 in the API](https://openai.com/index/introducing-gpt-live-1-in-the-api/), 2026-09-10.
[^live-guide]: OpenAI, [Live API guide](https://developers.openai.com/api/docs/guides/live), 2026-09-10.
[^live-delegation]: OpenAI, [Live delegation](https://developers.openai.com/api/docs/guides/live-delegation), 2026-09-10.
[^moshirag]: Chien et al., [MoshiRAG: Asynchronous Knowledge Retrieval for Full-Duplex Speech Language Models](https://arxiv.org/abs/2604.12928), 2026-04-14.
[^twilio]: Twilio, [Media Streams: WebSocket messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages), 2026-09-10.
[^livekit]: LiveKit, [Turns overview](https://docs.livekit.io/agents/logic/turns/), 2026-09-10.
[^pipecat]: Pipecat, [Pipeline](https://docs.pipecat.ai/pipecat/learn/pipeline), 2026-09-10.
[^vad]: OpenAI, [Voice activity detection](https://developers.openai.com/api/docs/guides/realtime-vad), 2026-09-10.
[^valle]: Wang et al., [Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers](https://arxiv.org/abs/2301.02111), 2023.
[^ultravox-tts]: Ultravox, [Bring your own TTS](https://docs.ultravox.ai/voices/bring-your-own), 2026-09-10.
