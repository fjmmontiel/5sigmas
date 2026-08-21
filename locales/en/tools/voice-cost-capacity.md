---
title: Voice-agent cost and capacity — monthly planner
description: Estimate monthly cost, cost per call, STT/TTS minutes, LLM tokens, average concurrency, workers and stream limits for a voice agent.
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
  "featureList": ["Cost per call", "Cost per connected minute", "Telephony and Media Streams", "STT", "TTS", "LLM tokens", "Concurrency", "Workers", "Stream limits", "Shareable scenario", "JSON export"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-voice-cost-capacity data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · Voice · 10</div>
  <h1>Turn call traffic into monthly cost and required capacity.</h1>
  <p>Separate connected minutes, user speech, agent speech, synthesized characters and model tokens. Then compare peak concurrency with the capacity you intend to provision. Every rate is editable because real cost depends on country, contract, architecture and volume.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="What the planner calculates">
  <div><small>Cost</small><strong>telephony + media + STT + LLM + TTS</strong></div>
  <div><small>Volume</small><strong>connected minutes and audio by direction</strong></div>
  <div><small>Capacity</small><strong>average concurrency, peak, workers and streams</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Voice-agent cost and capacity scenario" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Traffic</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-en-calls">Calls per month</label><input id="s5-vcc-en-calls" data-field="callsPerMonth" type="number" min="0" step="100" value="10000" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-duration">Average duration (min)</label><input id="s5-vcc-en-duration" data-field="averageCallMinutes" type="number" min="0" step="0.1" value="4" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-user">User speaking (%)</label><input id="s5-vcc-en-user" data-field="userSpeechPercent" type="number" min="0" max="100" step="1" value="42" /><small>Share of connected minutes carrying billable user audio.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-agent">Agent speaking (%)</label><input id="s5-vcc-en-agent" data-field="agentSpeechPercent" type="number" min="0" max="100" step="1" value="38" /><small>May overlap with the user during interruption.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-hours">Service hours per month</label><input id="s5-vcc-en-hours" data-field="serviceHoursPerMonth" type="number" min="0" step="1" value="220" /><small>Used to turn monthly volume into average concurrency.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-peak">Peak simultaneous calls</label><input id="s5-vcc-en-peak" data-field="peakConcurrency" type="number" min="0" step="1" value="35" /><small>Use observations or a forecast; a monthly average cannot recover the peak.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Capacity</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-en-util">Target worker utilization (%)</label><input id="s5-vcc-en-util" data-field="targetWorkerUtilizationPercent" type="number" min="1" max="100" step="1" value="70" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-spw">Maximum sessions per worker</label><input id="s5-vcc-en-spw" data-field="sessionsPerWorker" type="number" min="1" step="1" value="50" /><small>Your runtime capacity, not a universal limit.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-stt-limit">STT concurrency limit</label><input id="s5-vcc-en-stt-limit" data-field="sttConcurrencyLimit" type="number" min="0" step="1" value="0" /><small>0 = do not check a limit.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-tts-limit">TTS concurrency limit</label><input id="s5-vcc-en-tts-limit" data-field="ttsConcurrencyLimit" type="number" min="0" step="1" value="0" /><small>0 = do not check a limit.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Usage rates</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-en-tel">Telephony (USD/connected min)</label><input id="s5-vcc-en-tel" data-field="telephonyUsdPerConnectedMinute" type="number" min="0" step="0.0001" value="0.0178" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-media">Media Stream (USD/connected min)</label><input id="s5-vcc-en-media" data-field="mediaStreamUsdPerConnectedMinute" type="number" min="0" step="0.0001" value="0.0044" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-stt">STT (USD/user audio min)</label><input id="s5-vcc-en-stt" data-field="sttUsdPerUserAudioMinute" type="number" min="0" step="0.0001" value="0.017" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-tts">TTS (USD/1,000 characters)</label><input id="s5-vcc-en-tts" data-field="ttsUsdPer1000Characters" type="number" min="0" step="0.001" value="0.05" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-en-chars">Characters per spoken minute</label><input id="s5-vcc-en-chars" data-field="charactersPerAgentMinute" type="number" min="0" step="10" value="1000" /><small>Editable assumption for converting agent minutes into TTS characters.</small></div>
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
      <div class="s5-tool-kpi"><small>Cost per connected minute</small><strong data-output="costPerMinute">—</strong><span>useful across scenarios with different call length</span></div>
    </div>

    <div class="s5-voice-cost-usage" aria-label="Derived monthly volume">
      <div><small>Connected minutes</small><strong data-output="connectedMinutes">—</strong></div>
      <div><small>User audio</small><strong data-output="userMinutes">—</strong></div>
      <div><small>Agent audio</small><strong data-output="agentMinutes">—</strong></div>
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
      <div><small>Expected active STT at peak</small><strong data-output="sttStreams">—</strong><span class="s5-voice-quota" data-output="sttQuota">—</span></div>
      <div><small>Expected active TTS at peak</small><strong data-output="ttsStreams">—</strong><span class="s5-voice-quota" data-output="ttsQuota">—</span></div>
    </div>

    <div class="s5-voice-cost-reference">
      <div><small>Reference snapshot</small><strong data-field="presetLabel">Spain reference · cascade</strong><p data-output="presetNote">Public rates verified on 2026-08-21; edit them to match your contract and region.</p></div>
      <strong>Data: <span data-output="sourceUpdated">2026-08-21</span></strong>
    </div>

    <aside class="s5-tool-source" aria-label="Pricing provenance">
      <div class="s5-tool-source__head"><a href="https://www.twilio.com/en-us/voice/pricing/es" target="_blank" rel="noopener noreferrer">Twilio · Voice pricing Spain</a><span>Verified 2026-08-21</span></div>
      <p>The preset uses $0.0178/min for a local outbound call to Spain and $0.0044/min for Media Streams. Mobile, inbound, SIP/BYOC, taxes and discounts can change the invoice.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-vcc-method">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-vcc-method">Do not turn the whole call into one billing unit.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Connected minutes.</strong> Telephony and media transport usually follow connection time. STT depends on the input audio you process. TTS can be billed by generated characters. The LLM follows its own token meter. Mixing those bases produces a precise-looking estimate that does not map to the invoice.</p>
    <div class="s5-tool-method__formula">monthly_cost = connected_min × (telephony + media) + user_audio_min × STT + agent_chars/1000 × TTS + LLM_tokens + fixed_per_call</div>
    <p><strong>Speech mix.</strong> User and agent percentages are independent. They may sum above 100% when barge-in creates overlap; both media directions can continue generating billable usage during that interval.</p>
    <p><strong>Concurrency.</strong> Average concurrency comes from monthly volume and service hours. Peak concurrency does not: use traces or a forecast at sufficient time resolution. The peak/average ratio makes the risk of sizing from averages visible.</p>
    <div class="s5-tool-method__formula">avg_concurrency = connected_minutes / service_minutes</div>
    <div class="s5-tool-method__formula">workers = ceil(peak_concurrency / (sessions_per_worker × target_utilization))</div>
    <p><strong>Active streams.</strong> The planner estimates simultaneous STT and TTS streams by multiplying peak calls by the speaking share of each side. That is an expected duty-cycle load, not a queueing bound. For operational guarantees, use measured provider-concurrency percentiles.</p>
    <p><strong>Initial rates.</strong> OpenAI lists GPT Live Transcribe at $0.017/min. ElevenLabs lists Flash/Turbo TTS at $0.05 per 1,000 characters and approximates 1,000 characters as ~1 minute. The reference LLM uses GPT-5.6 Luna at $0.20/$1.20 per MTok input/output. Rates are dated and remain editable.</p>
    <div class="s5-voice-cost-note"><strong>This is not an invoice.</strong> Monthly phone numbers, taxes, recording, observability, tool calls, storage, transfers, volume discounts and contractual minimums are excluded. Add stable extras through “other fixed cost per call” or replace the effective rates.</div>
    <p>To optimize response time as well as cost, use the <a href="/en/tools/voice-latency-budget/">voice-agent latency budget explorer</a>.</p>
    <p><strong>Sources:</strong> <a href="https://www.twilio.com/en-us/voice/pricing/es" target="_blank" rel="noopener noreferrer">Twilio Voice Spain</a> · <a href="https://developers.openai.com/api/docs/models/gpt-live-transcribe" target="_blank" rel="noopener noreferrer">OpenAI GPT Live Transcribe</a> · <a href="https://developers.openai.com/api/docs/models/gpt-5.6-luna" target="_blank" rel="noopener noreferrer">OpenAI GPT-5.6 Luna</a> · <a href="https://elevenlabs.io/pricing/api" target="_blank" rel="noopener noreferrer">ElevenLabs API pricing</a>. Reviewed 2026-08-21.</p>
  </div>
</section>

</div>
