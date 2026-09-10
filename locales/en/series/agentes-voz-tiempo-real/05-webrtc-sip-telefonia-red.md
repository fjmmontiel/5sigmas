---
title: "WebRTC, SIP, and telephony: follow the real audio path"
description: "How to reason about WebRTC, SIP, RTP, codecs, jitter, packet loss, NAT, TURN, and telephony without confusing signaling, media, and the agent runtime."
date: 2026-09-10
date_modified: 2026-09-10
tags:
  - AI
  - Voice
  - Realtime
  - WebRTC
  - Telephony
  - Production
---

# Chapter 5 — WebRTC, SIP, and telephony: follow the real audio path

An agent can have a fast model and correct turn-taking logic and still sound bad. Audio may be waiting in a jitter buffer, crossing a TURN relay, arriving from the PSTN at 8 kHz, being transcoded, or travelling over a TCP path where later data waits behind a lost segment.

The useful question is therefore not “should I use WebRTC or SIP?” It is: **what path does the audio actually take, which protocol controls each hop, and which component owns buffering, codec negotiation, network recovery, and observability?**

This chapter separates those boundaries and ends with an operational choice between LiveKit Agents, Pipecat, and a thin/vanilla Python implementation.

## Draw the path before choosing an acronym

Architecture discussions often collapse three different planes:

1. **Signaling and control.** These discover peers, negotiate capabilities, create a call, or change session state.
2. **Media.** These are the packets carrying audio and timing information.
3. **Agent runtime.** This consumes audio, runs turn-taking/models/tools, and produces audio in return.

For a browser call, WebRTC covers negotiation, ICE connectivity, protected RTP media, and realtime transport behavior. In SIP telephony, SIP establishes and modifies the session, while the audio normally travels over RTP/SRTP. With a product such as Twilio Media Streams, the carrier still controls the phone call and exposes audio to your application over WebSocket.

Those three paths assign very different ownership to your code.

```text
Browser WebRTC
mic → browser WebRTC → ICE path → media endpoint/SFU → agent runtime

Direct SIP/RTP telephony
PSTN/carrier → SIP signaling + SDP → RTP/SRTP media → media endpoint → agent runtime

Carrier WebSocket media
PSTN/carrier → carrier media gateway → WSS audio protocol → application/runtime
```

{{ include_html("snippets/articulos-tecnicos/voice-network-paths.html") }}

The last option does not make WebSocket a general replacement for SIP or WebRTC. It moves the boundary: the carrier owns telephony termination and exposes an application media protocol.

## WebRTC: the route selected by ICE matters

WebRTC does not assume that two endpoints can send UDP directly to each other. ICE gathers candidates and tests connectivity pairs. RFC 8445 distinguishes host, server-reflexive, and relayed candidates. STUN helps discover an address visible beyond a NAT, while TURN can provide a relay address when a viable direct route is unavailable.[^rfc8445]

TURN does not mean “the call failed.” It means media needs an additional relay. That extra hop changes the network path and can change latency, cost, and failure domains, so it should be observable.

LiveKit currently documents this connectivity order from preferred path to fallback: ICE over UDP, TURN over UDP, ICE over TCP, and TURN over TLS.[^livekit-connect] UDP is preferred for realtime media. TCP/TLS can traverse more restrictive networks, but it does not behave the same way under loss and congestion.

In production, record at least the selected candidate pair, transport protocol, relay usage, region/media endpoint, and connection changes during the session. If you only keep `WebRTC connected=true`, you discard much of the evidence needed for diagnosis.

## Why TCP can sound worse even when bandwidth is sufficient

TCP delivers a reliable ordered byte stream. If a segment is lost, later data can wait for the missing segment to be retransmitted. That behavior is usually correct for a download. For live audio, late data may be less valuable than audio that should already be playing.

This **head-of-line blocking** effect is one reason UDP paths are preferred when available. It does not mean that “TCP is slow” in every environment, and it does not justify publishing a fixed millisecond penalty. The impact depends on RTT, loss, congestion, buffering, and network behavior.

A fallback to TURN/TLS should therefore appear as a trace dimension rather than an invisible connection detail.

## Codec, sample rate, and packetization are different decisions

A codec represents or compresses audio. Sample rate describes how many samples per second represent the signal. Packetization decides how much audio is grouped before transmission.

RFC 7874 requires WebRTC endpoints to implement Opus, PCMA, and PCMU. When an endpoint can process audio above 8 kHz, it recommends offering Opus before PCMA/PCMU.[^rfc7874] This is an interoperability requirement for WebRTC endpoints, not a guarantee that every session negotiates Opus.

Offer/answer determines the codec actually selected. “The browser supports Opus” and “this call is using Opus” are different claims.

### Opus does not have one frame duration

The Opus RTP payload supports frames representing 2.5, 5, 10, 20, 40, or 60 ms of audio. A packet may contain multiple frames up to 120 ms total duration.[^rfc7587]

Putting more audio in one packet reduces relative overhead, but it increases the amount of audio affected by a lost packet and can increase the wait before transmission. Smaller frames and packets reduce that temporal granularity at the cost of more packets and overhead.

Do not tune `ptime` in isolation. Measure it together with bitrate, loss, jitter, CPU, FEC, and the behavior of the actual receiver.

### FEC needs time to recover

Opus supports in-band FEC. The encoder decides whether to include redundancy using signals such as expected packet loss, available capacity, signal sensitivity, and decoder support. The receiver needs access to the following packet to recover audio from the previous lost packet.[^rfc7587]

That creates an important trade-off. FEC can improve continuity under loss, but it consumes bitrate and needs enough jitter-buffer margin for the repair packet to arrive before playout. “FEC enabled” is not equivalent to “packet loss solved.”

## Jitter is not latency

Latency is delay. Jitter is variation in packet arrival timing. A stream can have a moderate RTT and still need extra buffering because packets arrive irregularly.

A jitter buffer absorbs some of that variation by delaying playout. Too little buffering causes under-runs or damaged audio when packets arrive late. Too much buffering can make audio stable while making the conversation feel slow.

The WebRTC Statistics API exposes metrics at this boundary. `jitterBufferDelay` accumulates the time samples/frames spend in the buffer, while `jitterBufferEmittedCount` counts the samples/frames that have left it. From the start of the session:

```text
average_jitter_buffer_delay_seconds
    = jitterBufferDelay / jitterBufferEmittedCount
```

For a time window, use deltas of both counters rather than the session-wide cumulative ratio. `jitterBufferTargetDelay` captures the accumulated target, and `jitterBufferMinimumDelay` helps separate the minimum delay attributable to network characteristics from delay added by other mechanisms.[^webrtc-stats]

Do not turn one `jitter` or `packetsLost` snapshot into a diagnosis. Correlate loss, jitter-buffer delay, RTT/candidate pair, codec, concealment, and the exact point at which the user heard degradation.

## Packet loss does not always produce an audible gap

A receiver can conceal loss, use redundancy/FEC, or delay playout while waiting for recovery. That means there are two separate questions:

- were packets lost on the network?
- what degradation reached the audio that was played?

Finding the cause requires transport **and** decoder/playout evidence. A loss percentage without codec, burstiness, and concealment context does not describe user experience by itself.

Random loss and a burst of loss can have the same average percentage and produce very different perceptual outcomes. Keep distributions and per-turn windows instead of only a whole-call mean.

## SIP does not carry the voice by itself

SIP is primarily session signaling. In a typical setup, an `INVITE` carries or negotiates SDP, the response agrees the media parameters, and RTP/SRTP then carries audio.

This matters because a SIP `200 OK` does not prove that bidirectional audio exists. Signaling can succeed while RTP is blocked by a firewall, the SDP advertises the wrong address or port, the codecs are incompatible, or media works in only one direction.

When debugging telephony, separate these boundaries explicitly:

```text
SIP signaling     did the session form, and what SDP was negotiated?
RTP/SRTP media    are packets arriving in both directions?
codec path        which codec enters, and where is it decoded/transcoded?
agent media       what PCM/audio does the runtime receive and return?
playout           what did the carrier/device ultimately play?
```

A single “call connected” metric cannot answer those questions.

## Telephony can narrow the signal before it reaches the model

LiveKit SIP currently enables PCMU, PCMA, and G722 by default. AMR-WB is supported but is not enabled by default. Its documentation specifies PCMU/PCMA at 8 kHz, AMR-WB at 16 kHz, and the G722 signaling quirk where SDP uses an 8 kHz clock even though the codec carries wideband audio.[^livekit-sip-codecs]

LiveKit also states that **SIP codecs are distinct from the codecs used inside a LiveKit room**.[^livekit-sip-codecs] This prevents a common inference: higher-fidelity room audio does not mean the PSTN leg preserved the same information.

If a telephony leg has already limited the spectrum or introduced transcoding, resampling later to a higher-rate PCM stream cannot restore information that was lost earlier.

### Offering more codecs is not free either

LiveKit explains why it does not enable every supported SIP codec by default: every additional codec makes the SDP in the `INVITE` larger, and large SIP/UDP packets can fragment and be lost. Its configuration can add codecs or use `only_listed_codecs` to restrict the offer.[^livekit-sip-codecs]

The general lesson is not “offer fewer codecs.” It is to understand which peers must interoperate, which SIP transport you use, and where transcoding or fragmentation risk exists. The correct codec set depends on your trunks and carriers.

## PSTN over WebSocket: the carrier can hide SIP and RTP from your application

Twilio Media Streams is a useful example of a different boundary. A Twilio call can send raw audio to your server over WebSocket. In a bidirectional stream, your application receives the inbound track and can send audio back for playback on the call. Only one bidirectional stream is allowed per Call.[^twilio-streams]

The WebSocket session does not make your application a SIP endpoint. Twilio continues to own the phone leg while your application implements the Media Streams protocol.

The current audio contract is specific: `audio/x-mulaw`, 8 kHz, mono. Audio sent back must use that format, and Twilio buffers it for playback in receive order.[^twilio-ws]

`mark` and `clear` messages also matter for barge-in. `mark` lets the application observe when Twilio considers the submitted media to have completed playback. `clear` empties pending buffered audio and causes outstanding marks to be returned.[^twilio-ws] That acknowledgement is evidence about playback state **inside Twilio**, not physical proof that a human heard every sample.

For security, Twilio requires validating `X-Twilio-Signature`, and Media Streams connects to your server over WSS.[^twilio-streams]

## Audio WebSocket and WebRTC solve different problems

A WebSocket is a bidirectional application channel over TCP. It does not automatically provide RTP timestamps, a jitter buffer, ICE/TURN, codec negotiation, or media adaptation.

Pipecat exposes that boundary through its transports. `SmallWebRTCTransport` uses peer-to-peer WebRTC and exposes ICE/STUN/TURN configuration. Its current docs note that production deployments across networks may need STUN/TURN for NAT traversal.[^pipecat-smallwebrtc] `TwilioFrameSerializer`, by contrast, integrates Twilio's Media Streams WebSocket protocol and converts that carrier-specific boundary into Pipecat frames.[^pipecat-twilio]

So “Pipecat supports WebRTC and Twilio” does not mean one component owns both networks. The selected transport or serializer determines which contract enters the pipeline.

## Network restrictions need real tests

A fiber-connected lab with open UDP says very little about users behind VPNs, restrictive NATs, corporate firewalls, or mobile networks that change interfaces.

For WebRTC, test at least:

- a direct UDP path when available
- TURN/UDP
- TCP/TLS fallback where your stack supports it
- Wi-Fi ↔ cellular changes or temporary interface loss
- random loss and burst loss
- variable jitter
- high RTT and constrained bandwidth
- MTU/VPN behavior if you use data channels or extra encapsulation

For telephony, add:

- the SIP transports you actually use: UDP/TCP/TLS
- real codec negotiation against each relevant trunk
- RTP in both directions
- DTMF if the product depends on it
- SRTP/TLS if you promise them in production
- calls across the carriers/regions that matter
- re-INVITE or media changes when your carrier uses them

You do not need every fault in every test. You do need a matrix that maps each production risk to a concrete test or piece of evidence.

## Diagnosis: identify the failing boundary first

A useful taxonomy prevents blaming the model for a media failure:

| Symptom | First boundary to inspect | Useful evidence |
|---|---|---|
| cannot connect | signaling / ICE / firewall | ICE states, candidate pairs, TURN, SIP responses |
| connects but no audio | media routing | RTP counters, SDP directions, inbound/outbound track events |
| one-way audio | NAT/firewall/SDP/media endpoint | per-direction RTP/track counters, PCAP when applicable |
| pauses or robotic audio | jitter/loss/decoder | jitter buffer, loss windows, concealment, codec |
| stable but slow conversation | buffering/path | jitter-buffer delay, TURN/TCP route, playout queue |
| poor PSTN quality | codec/transcoding | SDP codec, carrier leg, transcode points, sample rate |
| breaks after network change | reconnection/path migration | ICE/reconnect events, new candidate pair, media resume |

The same symptom can have multiple causes. This table orders the investigation; it does not replace evidence.

## Do not mix clocks or observability boundaries

Browser, SFU/media server, agent runtime, model provider, and carrier timestamps may come from different clocks. A distributed trace should correlate IDs and events, but it should not subtract unsynchronized host timestamps and call the result “network latency.”

For WebRTC, store stats snapshots/deltas with the relevant `turn_id` or `speech_id`. For SIP, preserve Call-ID/trunk/SDP and, when needed, PCAP or RTP stats. For carrier WebSocket media, preserve `callSid`/`streamSid`, chunk/timestamp information, and your own ingest/playout timing.

Useful observability lets you answer “where did time accumulate or audio disappear?” without inferring the answer from the model's final result.

## LiveKit Agents vs Pipecat vs vanilla/thin at the media layer

The decision changes when **media and networking** are the main constraint rather than model orchestration alone.

| Question | LiveKit Agents + LiveKit media | Pipecat | Vanilla/thin Python |
|---|---|---|---|
| Browser media | LiveKit rooms/SFU and WebRTC SDKs own much of connectivity/media | selected transport can be SmallWebRTC, Daily, LiveKit, or another endpoint | use provider-direct/external WebRTC SDKs or own the endpoint yourself |
| NAT / firewall | LiveKit owns ICE and can use TURN; Cloud and self-hosted deployments have different operational surfaces | depends on transport; SmallWebRTC exposes ICE/STUN/TURN to your deployment | depends on chosen endpoint; if you implement it, you also own ICE/TURN operation |
| PSTN | LiveKit SIP provides SIP participants/trunks/dispatch; Cloud offers managed SIP while self-hosting requires the SIP service | use carrier transports/serializers or integrations such as LiveKit/Daily | consume a carrier-managed Media Stream or operate SIP/RTP directly |
| Codec boundary | room media and SIP codec negotiation are separate layers | depends on transport/serializer/provider | document every decode/resample/transcode boundary between endpoints |
| Low-level packet control | lower while staying at room/track abstractions; move into media infrastructure when more control is required | custom processors/transports offer control subject to the underlying transport | highest when you own the RTP/WebRTC stack, with equally high ownership of jitter/recovery/security |
| Observability | room/SIP/agent events and stats still need cross-layer correlation | pipeline events plus metrics from the selected transport | design and maintain stats capture, IDs, PCAP hooks, and correlation yourself |
| Operating cost | runtime + media/SIP infrastructure or managed services + inference | framework + transport/provider + deployment + inference | endpoints/providers + compute + TURN/SIP when applicable + engineering/on-call |

There is no universal winner. The deciding question is **which boundary do you want to own?**

### Choose LiveKit when the room/media plane is central to the product

It is a strong fit when you need browser/mobile WebRTC, rooms, participants, an SFU, and an integrated SIP route under one media model. The abstraction lets the agent runtime consume tracks without implementing every ICE/RTP detail.

Do not attribute to `LiveKit Agents` what belongs to LiveKit Cloud or LiveKit SIP. Agents is the runtime/orchestration layer. Cloud can operate media/TURN/SIP infrastructure. A self-hosted deployment must operate the pieces required by its chosen architecture.[^livekit-telephony]

### Choose Pipecat when you want to compose the pipeline around the transport

Pipecat fits when an explicit frame pipeline and transport switching matter. For self-hosted WebRTC, `SmallWebRTCTransport` leaves signaling and ICE servers visible. For Twilio, the serializer speaks the carrier's Media Streams protocol.[^pipecat-smallwebrtc][^pipecat-twilio]

That flexibility does not remove transport infrastructure. A managed transport moves part of networking to that service. SmallWebRTC moves signaling, STUN/TURN, and operation back into your deployment.

### Choose vanilla/thin when the non-standard boundary is the requirement

Thin Python can be entirely reasonable without implementing protocols from scratch. A browser can connect directly to a realtime provider over WebRTC while your backend owns authentication, policy, and business state. A carrier can terminate PSTN/SIP and hand your application a media WebSocket. Both approaches reduce orchestration layers without making your app own the lower protocol.

Drop down to your own RTP/SIP/WebRTC only when existing endpoints do not expose the control you need: packet inspection, custom DSP, media-routing research, specific codec negotiation, SBC behavior, or non-standard protocols.

At that point the application also owns more: signaling, ICE/TURN or SIP/RTP as appropriate, jitter buffering, timestamps, codec negotiation, resampling, packet-loss strategy, reconnection, security, load testing, capacity planning, and observability.

### A hybrid can be the right boundary

Reasonable examples include:

- LiveKit owns rooms/WebRTC/SIP while Pipecat orchestrates the pipeline through `LiveKitTransport`.
- Twilio owns PSTN and Media Streams while Pipecat adapts the WebSocket with `TwilioFrameSerializer`.
- A custom component owns low-level RTP/DSP and hands normalized PCM to an agent runtime that keeps tools/state/evals.

A hybrid works when each layer has a clear owner. It becomes fragile when two components both believe they own reconnection, buffering, or cancellation.

## Three concrete decisions

### 1. Browser assistant for heterogeneous user networks

Prioritize WebRTC, ICE/candidate-pair telemetry, and an operational TURN path. LiveKit is reasonable when you also want rooms/SFU and an integrated media plane. Pipecat with a WebRTC transport is reasonable when the explicit pipeline matters more. Thin/provider-direct is reasonable when the realtime provider exposes WebRTC and you do not need your own media plane.

I would not treat raw browser audio over WebSocket as an automatic equivalent to WebRTC merely because it is easy to prototype. That choice makes your stack re-own media mechanisms that WebRTC already supplies.

### 2. PSTN agent where a carrier WebSocket is sufficient

If `audio/x-mulaw` at 8 kHz, `media/mark/clear`, and carrier-managed telephony satisfy the product, Pipecat plus a serializer or thin Python over Media Streams can be more direct than operating SIP/RTP.

If you need your own trunks, SIP routing, SRTP/TLS, per-trunk codec control, or integration with rooms/participants, a SIP media plane such as LiveKit SIP may be the better boundary. These choices should not be compared as if they expose the same degree of control.

### 3. Low-level experimental pipeline

If the work is about packetization, FEC, jitter-buffer policy, RTP extensions, or DSP below the agent runtime, vanilla/thin or a custom transport is usually the most transparent route. Pipecat can still be useful above that boundary with custom processors. LiveKit can still handle media distribution if the experiment does not need control over the layer it abstracts.

Choose based on where packets must be measured and modified, not on which framework advertises more integrations.

## What not to use as a selection criterion

Do not choose a media/runtime stack because of:

- integration count
- GitHub stars
- a polished demo with unpublished network conditions
- a “framework latency” number measured with a different provider, region, codec, or audio path
- “carrier grade” or “realtime” marketing without a verifiable failure model

To compare framework overhead, hold hardware, network, provider/model, audio path, codec, load, and loss/jitter conditions constant. Repeat enough trials to report a distribution. If you cannot run that experiment, compare **ownership and mechanisms** instead of inventing a numeric ranking.

## What to measure per turn and per call

A useful minimum telemetry contract should be able to join:

```text
call/session id
turn/speech id
media endpoint + region
selected ICE candidate pair / relay state
transport protocol
codec + negotiated/sample-rate boundary
packet loss and jitter windows
jitter-buffer delay/target
reconnect/path-change events
SIP Call-ID + trunk + negotiated SDP when applicable
carrier stream id when applicable
agent ingest timestamp
first generated audio
first submitted/playout-ack boundary
```

Different runtimes will expose different field names. Preserve the boundary and the owner even when the API names differ.

## Production checklist

Before calling a voice path robust:

1. Draw every media hop, not only the agent runtime.
2. Identify where audio is negotiated, decoded, resampled, and transcoded.
3. Record the ICE/TURN or SIP/RTP/carrier-stream route actually used.
4. Test the network restrictions your users really encounter.
5. Correlate jitter/loss with decoder and playout evidence, not only RTT.
6. Separate signaling success from media success.
7. Verify authentication for signaling/media and the encryption promised on each hop.
8. Measure p50/p95/p99 and distributions by route, codec, region, and network type.
9. Keep framework, managed service, carrier, and model boundaries explicit.
10. Only then optimize the hop that the evidence shows is dominant.

The goal is not to remove all network variation. It is to know which part of the path you control, detect when that path changes, and design degradation that remains understandable.

## References

[^rfc8445]: IETF, [RFC 8445 — Interactive Connectivity Establishment (ICE)](https://www.rfc-editor.org/rfc/rfc8445.html).
[^rfc7874]: IETF, [RFC 7874 — WebRTC Audio Codec and Processing Requirements](https://www.rfc-editor.org/rfc/rfc7874.html).
[^rfc7587]: IETF, [RFC 7587 — RTP Payload Format for the Opus Speech and Audio Codec](https://www.rfc-editor.org/rfc/rfc7587.html).
[^webrtc-stats]: W3C, [Identifiers for WebRTC's Statistics API](https://www.w3.org/TR/webrtc-stats/).
[^livekit-connect]: LiveKit, [Connecting to LiveKit — Connection reliability](https://docs.livekit.io/intro/basics/connect/).
[^livekit-telephony]: LiveKit, [Telephony introduction](https://docs.livekit.io/telephony/).
[^livekit-sip-codecs]: LiveKit, [Audio codecs negotiation and support](https://docs.livekit.io/reference/telephony/codecs-negotiation/).
[^pipecat-smallwebrtc]: Pipecat, [Small WebRTC Transport](https://docs.pipecat.ai/api-reference/server/services/transport/small-webrtc).
[^pipecat-twilio]: Pipecat, [Twilio Frame Serializer](https://docs.pipecat.ai/api-reference/server/services/serializers/twilio).
[^twilio-streams]: Twilio, [Media Streams Overview](https://www.twilio.com/docs/voice/media-streams).
[^twilio-ws]: Twilio, [Media Streams — WebSocket Messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages).
