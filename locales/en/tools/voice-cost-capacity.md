---
title: Voice-agent cost and capacity — monthly planner
description: Estimate monthly cost, cost per call, billable units, call concurrency, workers and provider limits for a voice agent.
keywords: voice agent cost, voice AI calculator, voice concurrency, AI agent capacity, STT cost, TTS cost, voice LLM cost
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-voice-cost-capacity.css" />
<script src="/assets/javascripts/tools/voice-cost-capacity-core.js" defer></script>
<script src="/assets/javascripts/tools/voice-cost-capacity.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Voice-Agent Cost & Capacity Planner — 5sigmas",
  "url": "https://5sigmas.com/en/tools/voice-cost-capacity/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive planner for monthly cost, billable units and concurrent capacity in voice-agent systems.",
  "featureList": ["Cost per call", "Cost per connected minute", "Telephony and Media Streams", "STT", "TTS", "LLM tokens", "Call concurrency", "Provider concurrency", "Workers", "Shareable scenario", "JSON export"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-voice-cost-capacity data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · Voice · 10</div>
  <h1>Turn call traffic into monthly cost and required capacity.</h1>
  <p>Separate connected minutes, audio sent to STT, synthesized audio, generated characters and model tokens. Then size workers and provider limits without confusing simultaneous calls with simultaneous TTS requests.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="What the planner calculates">
  <div><small>Cost</small><strong>telephony + media + STT + LLM + TTS</strong></div>
  <div><small>Volume</small><strong>minutes and billable units by component</strong></div>
  <div><small>Capacity</small><strong>peak calls, workers and provider concurrency</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Voice-agent cost and capacity scenario" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Traffic and usage</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-en-calls">Calls per month</label><input id="s5-vcc-en-calls" data-field="callsPerMonth" type="number" min="0" step="100" value="10000" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-duration">Average duration (min)</label><input id="s5-vcc-en-duration" data-field="averageCallMinutes" type="number" min="0" step="0.1" value="4" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-user">Billable STT audio (%)</label><input id="s5-vcc-en-user" data-field="userSpeechPercent" type="number" min="0" max="100" step="1" value="42" /><small>Share of connected time you actually send/bill as STT audio. Use 100% if you continuously stream the caller track.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-agent">Synthesized agent audio (%)</label><input id="s5-vcc-en-agent" data-field="agentSpeechPercent" type="number" min="0" max="100" step="1" value="38" /><small>Share of connected time played as TTS audio. It may overlap user audio during barge-in.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-hours">Service hours per month</label><input id="s5-vcc-en-hours" data-field="serviceHoursPerMonth" type="number" min="0" step="1" value="220" /><small>Turns monthly volume into average concurrency.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-peak">Peak simultaneous calls</label><input id="s5-vcc-en-peak" data-field="peakConcurrency" type="number" min="0" step="1" value="35" /><small>Use traces or a forecast; a monthly average cannot recover the peak.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Capacity</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-en-util">Target worker utilization (%)</label><input id="s5-vcc-en-util" data-field="targetWorkerUtilizationPercent" type="number" min="1" max="100" step="1" value="70" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-spw">Maximum sessions per worker</label><input id="s5-vcc-en-spw" data-field="sessionsPerWorker" type="number" min="1" step="1" value="50" /><small>Measured capacity of your runtime, not a universal limit.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-ss">STT sessions per active call</label><input id="s5-vcc-en-ss" data-field="sttSessionsPerCall" type="number" min="0" step="0.1" value="1" /><small>1 = one persistent STT session per call. Change it if you multiplex, share or open more than one.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-td">TTS generation duty (%)</label><input id="s5-vcc-en-td" data-field="ttsGenerationDutyPercent" type="number" min="0" max="100" step="0.5" value="5" /><small>Share of peak calls generating TTS at the same instant. This is not the share of time audio is playing.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-stt-limit">STT concurrency limit</label><input id="s5-vcc-en-stt-limit" data-field="sttConcurrencyLimit" type="number" min="0" step="1" value="0" /><small>0 = do not check. Enter the real account/provider limit if you have one.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-tts-limit">TTS concurrency limit</label><input id="s5-vcc-en-tts-limit" data-field="ttsConcurrencyLimit" type="number" min="0" step="1" value="0" /><small>0 = do not check. For WebSockets, follow your provider's documented concurrency semantics.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Usage rates</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-en-tel">Telephony (USD/connected min)</label><input id="s5-vcc-en-tel" data-field="telephonyUsdPerConnectedMinute" type="number" min="0" step="0.0001" value="0.0178" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-media">Media Stream (USD/connected min)</label><input id="s5-vcc-en-media" data-field="mediaStreamUsdPerConnectedMinute" type="number" min="0" step="0.0001" value="0.0044" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-stt">STT (USD/audio min)</label><input id="s5-vcc-en-stt" data-field="sttUsdPerUserAudioMinute" type="number" min="0" step="0.0001" value="0.017" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-tts">TTS (USD/1,000 characters)</label><input id="s5-vcc-en-tts" data-field="ttsUsdPer1000Characters" type="number" min="0" step="0.001" value="0.05" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-chars">Characters per synthesized minute</label><input id="s5-vcc-en-chars" data-field="charactersPerAgentMinute" type="number" min="0" step="10" value="1000" /><small>Editable assumption for converting agent audio minutes into TTS characters.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-fixed">Other fixed cost (USD/call)</label><input id="s5-vcc-en-fixed" data-field="fixedUsdPerCall" type="number" min="0" step="0.001" value="0" /></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>LLM per call</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-en-it">Input tokens</label><input id="s5-vcc-en-it" data-field="llmInputTokensPerCall" type="number" min="0" step="100" value="1400" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-ot">Output tokens</label><input id="s5-vcc-en-ot" data-field="llmOutputTokensPerCall" type="number" min="0" step="50" value="220" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-ip">Input (USD/MTok)</label><input id="s5-vcc-en-ip" data-field="llmInputUsdPerMillionTokens" type="number" min="0" step="0.01" value="0.2" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-op">Output (USD/MTok)</label><input id="s5-vcc-en-op" data-field="llmOutputUsdPerMillionTokens" type="number" min="0" step="0.01" value="1.2" /></div>
      </div>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset reference</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Cost and capacity results" aria-live="polite">
    <div class="s5-tool-kpis s5-voice-cost-kpis">
      <div class="s5-tool-kpi"><small>Monthly cost</small><strong data-output="monthlyCost">—</strong><span data-output="largestCost">—</span></div>
      <div class="s5-tool-kpi"><small>Cost per call</small><strong data-output="costPerCall">—</strong><span>includes every modelled line item</span></div>
      <div class="s5-tool-kpi"><small>Cost per connected minute</small><strong data-output="costPerMinute">—</strong><span>comparable across different call lengths</span></div>
    </div>

    <div class="s5-voice-cost-usage" aria-label="Derived monthly volume">
      <div><small>Connected minutes</small><strong data-output="connectedMinutes">—</strong></div>
      <div><small>Billable STT audio</small><strong data-output="userMinutes">—</strong></div>
      <div><small>Synthesized audio</small><strong data-output="agentMinutes">—</strong></div>
    </div>

    <div class="s5-voice-cost-breakdown" aria-label="Monthly cost breakdown">
      <div class="s5-voice-cost-row" data-cost-row="telephony"><span>Telephony</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="media"><span>Media Streams</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="stt"><span>STT</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="tts"><span>TTS</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="llm"><span>LLM</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="fixed"><span>Fixed per call</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
    </div>

    <div class="s5-voice-capacity-grid" aria-label="Concurrent capacity">
      <div><small>Average concurrency</small><strong data-output="averageConcurrency">—</strong><span>Peak/average: <span data-output="peakRatio">—</span></span></div>
      <div><small>Workers required</small><strong data-output="workers">—</strong><span>target / physical sessions: <span data-output="workerRead">—</span></span></div>
      <div><small>STT sessions at peak</small><strong data-output="sttStreams">—</strong><span class="s5-voice-quota" data-output="sttQuota">—</span></div>
      <div><small>TTS requests generating at peak</small><strong data-output="ttsStreams">—</strong><span class="s5-voice-quota" data-output="ttsQuota">—</span></div>
    </div>

    <div class="s5-voice-cost-reference">
      <div><small>Reference snapshot</small><strong data-field="presetLabel">Spain reference · cascade</strong><p data-output="presetNote">Public rates and assumptions verified on 2026-08-21; edit them to match your contract, region and architecture.</p></div>
      <strong>Data: <span data-output="sourceUpdated">2026-08-21</span></strong>
    </div>

    <aside class="s5-tool-source" aria-label="Scenario provenance">
      <div class="s5-tool-source__head"><a href="https://www.twilio.com/en-us/voice/pricing/es" target="_blank" rel="noopener noreferrer">Twilio · Voice pricing Spain</a><span>Verified 2026-08-21</span></div>
      <p>The preset uses $0.0178/min for a local outbound call to Spain and $0.0044/min for Media Streams. Mobile, inbound, SIP/BYOC, taxes, monthly numbers and discounts can change the invoice.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-vcc-method">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-vcc-method">Cost and capacity do not share one unit.</h2></div>
  <div class="s5-tool-method__body s5-tool-method__notes">
    <p><strong>Billing.</strong> Telephony and Media Streams follow connected time; STT depends on the audio you actually process; TTS may be billed by generated characters; the LLM by tokens. The STT-audio percentage should match the real pipeline: use 100% when you stream the full caller track, even through silence.</p>
    <div class="s5-tool-method__formula">monthly_cost = connected_min × (telephony + media) + stt_audio_min × STT + agent_chars/1000 × TTS + LLM_tokens + fixed_per_call</div>
    <p><strong>Call concurrency.</strong> Average concurrency follows from volume and service hours. Peak concurrency must come from traces or a forecast. Sizing from the mean alone is unsafe when call arrivals are bursty.</p>
    <div class="s5-tool-method__formula">avg_concurrency = connected_minutes / service_minutes</div>
    <div class="s5-tool-method__formula">workers = ceil(peak_calls / (sessions_per_worker × target_utilization))</div>
    <p><strong>STT.</strong> In a typical cascade, each active call keeps a persistent transcription session, so the reference uses one STT session per call. It is an editable architecture assumption. Twilio documents one WebSocket connection per Media Stream and one bidirectional stream per Call.</p>
    <div class="s5-tool-method__formula">stt_concurrency ≈ peak_calls × stt_sessions_per_call</div>
    <p><strong>TTS.</strong> Do not use audio playback share as provider concurrency. ElevenLabs documents that with WebSockets only time spent generating audio counts toward concurrency and says a limit of 5 can typically support about 100 balanced voice-agent conversations. The initial 5% factor reproduces that heuristic (5/100); it is editable and does not replace p95/p99 measurements from your own requests.</p>
    <div class="s5-tool-method__formula">tts_concurrency ≈ peak_calls × generation_duty</div>
    <p><strong>Reference rates.</strong> On 2026-08-21: Twilio Spain lists $0.0178/min for a local outbound call and $0.0044/min for Media Streams; OpenAI lists GPT Live Transcribe at $0.017/audio-minute and GPT-5.6 Luna at $0.20/$1.20 per MTok input/output; ElevenLabs lists Flash/Turbo TTS at $0.05 per 1,000 characters. Every rate remains editable.</p>
    <div class="s5-voice-cost-note"><strong>Not an invoice or SLA.</strong> The model excludes monthly phone numbers, taxes, recording, observability, tool calls, storage, transfers, volume discounts and contractual minimums. Provider concurrency limits depend on plan and account and must come from your real configuration.</div>
    <p>To optimize response time as well as cost, use the <a href="/en/tools/voice-latency-budget/">voice-agent latency explorer</a>. For architecture trade-offs, read <a href="/en/technical-articles/voice-agent-architectures/">three architectures for voice agents</a>.</p>
    <p><strong>Sources:</strong> <a href="https://www.twilio.com/en-us/voice/pricing/es" target="_blank" rel="noopener noreferrer">Twilio Voice Spain</a> · <a href="https://www.twilio.com/docs/voice/media-streams" target="_blank" rel="noopener noreferrer">Twilio Media Streams</a> · <a href="https://developers.openai.com/api/docs/models/gpt-live-transcribe" target="_blank" rel="noopener noreferrer">OpenAI GPT Live Transcribe</a> · <a href="https://developers.openai.com/api/docs/models/gpt-5.6-luna" target="_blank" rel="noopener noreferrer">OpenAI GPT-5.6 Luna</a> · <a href="https://elevenlabs.io/pricing/api" target="_blank" rel="noopener noreferrer">ElevenLabs API pricing</a> · <a href="https://elevenlabs.io/docs/overview/models" target="_blank" rel="noopener noreferrer">ElevenLabs concurrency</a>. Verified 2026-08-21.</p>
  </div>
</section>

</div>
