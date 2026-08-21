---
title: Voice-agent latency — response and barge-in budget
summary: Break down a voice agent's latency across transport, turn end, STT, model, TTS, output and buffering, then model the interruption path separately.
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-voice-latency.css" />
<script src="/assets/javascripts/tools/voice-latency-core.js" defer></script>
<script src="/assets/javascripts/tools/voice-latency.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Voice-Agent Latency Budget Explorer — 5sigmas",
  "url": "https://5sigmas.com/en/tools/voice-latency-budget/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive explorer for the critical path to first agent audio and the interruption path for voice agents.",
  "featureList": ["STT-LLM-TTS cascade", "Half-cascade", "Speech-to-speech", "Time-to-first-audio budget", "Barge-in", "Bottleneck analysis", "Shareable scenario", "JSON export"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-voice-latency data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · Voice · 09</div>
  <h1>Find where latency is spent before the agent starts speaking.</h1>
  <p>Break down the interval from the acoustic end of the user's turn to the first audio that reaches the listener. Change the architecture, enter measurements for each stage, and check whether the target is feasible before blaming the model. Barge-in is budgeted separately because stopping audio already in playback is a different critical path.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="What the explorer measures">
  <div><small>Response</small><strong>end of speech → first agent audio</strong></div>
  <div><small>Interruption</small><strong>speech start → agent audio stopped</strong></div>
  <div><small>Comparison</small><strong>cascade, half-cascade and speech-to-speech</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Voice-agent latency scenario" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Architecture and target</h2>
      <div class="s5-tool-field-grid s5-tool-field-grid--single">
        <div class="s5-tool-field">
          <label for="s5-voice-latency-en-architecture">Architecture</label>
          <select id="s5-voice-latency-en-architecture" data-field="architecture">
            <option value="cascade">STT → LLM → TTS cascade</option>
            <option value="halfCascade">Half-cascade / audio → model → TTS</option>
            <option value="speechToSpeech">Speech-to-speech</option>
          </select>
          <small>Presets are editable teaching scenarios, not provider measurements.</small>
        </div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-target">Your first-audio target (ms)</label><input id="s5-voice-latency-en-target" data-field="targetMs" type="number" min="0" max="10000" step="10" value="900" /></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Path to first audio</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-voice-latency-en-in">Audio ingress (ms)</label><input id="s5-voice-latency-en-in" data-field="ingressMs" type="number" min="0" max="10000" step="10" value="60" /><small>Last user audio until your processing edge receives it.</small></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-ep">Turn-end detection (ms)</label><input id="s5-voice-latency-en-ep" data-field="endpointMs" type="number" min="0" max="10000" step="10" value="300" /><small>Residual wait after the acoustic end has arrived.</small></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-stt">Residual STT finalization (ms)</label><input id="s5-voice-latency-en-stt" data-field="sttMs" type="number" min="0" max="10000" step="10" value="80" /><small>Use 0 when this critical path has no external STT stage.</small></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-model">Model → first usable output (ms)</label><input id="s5-voice-latency-en-model" data-field="modelMs" type="number" min="0" max="10000" step="10" value="350" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-tts">TTS → first audio (ms)</label><input id="s5-voice-latency-en-tts" data-field="ttsMs" type="number" min="0" max="10000" step="10" value="120" /><small>TTFB/first audible chunk, not total synthesis duration.</small></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-out">Audio egress (ms)</label><input id="s5-voice-latency-en-out" data-field="egressMs" type="number" min="0" max="10000" step="10" value="70" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-buffer">Playback buffer (ms)</label><input id="s5-voice-latency-en-buffer" data-field="bufferMs" type="number" min="0" max="10000" step="10" value="40" /></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Barge-in</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-voice-latency-en-bd">New-speech detection (ms)</label><input id="s5-voice-latency-en-bd" data-field="bargeDetectMs" type="number" min="0" max="10000" step="10" value="80" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-cancel">Control/cancel (ms)</label><input id="s5-voice-latency-en-cancel" data-field="cancelMs" type="number" min="0" max="10000" step="10" value="30" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-clear">Clear output buffer (ms)</label><input id="s5-voice-latency-en-clear" data-field="clearMs" type="number" min="0" max="10000" step="10" value="60" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-en-btarget">Your interruption target (ms)</label><input id="s5-voice-latency-en-btarget" data-field="bargeTargetMs" type="number" min="0" max="10000" step="10" value="250" /></div>
      </div>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Voice latency budget results" aria-live="polite">
    <div class="s5-tool-kpis s5-voice-latency-kpis">
      <div class="s5-tool-kpi"><small>First agent audio</small><strong data-output="responseMs">—</strong><span class="s5-voice-latency-status" data-output="responseStatus">—</span><span data-output="responseDelta">—</span></div>
      <div class="s5-tool-kpi"><small>Remaining model budget</small><strong data-output="modelBudget">—</strong><span data-output="modelBudgetRead">—</span></div>
      <div class="s5-tool-kpi"><small>Barge-in until audio stops</small><strong data-output="bargeMs">—</strong><span class="s5-voice-latency-status" data-output="bargeStatus">—</span><span data-output="bargeDelta">—</span></div>
    </div>

    <p class="s5-voice-latency-budget-note"><strong data-output="architecture">—</strong>. Each number is the residual contribution to the critical path after the acoustic end of the turn; if stages overlap in your system, do not count the same wall-clock time twice.</p>

    <div class="s5-voice-latency-timeline" aria-label="Breakdown of path to first agent audio">
      <div class="s5-voice-latency-stage" data-stage="ingressMs"><span>Audio ingress</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="endpointMs"><span>Turn end</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="sttMs"><span>Residual STT</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="modelMs"><span>Model first output</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="ttsMs"><span>TTS first audio</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="egressMs"><span>Audio egress</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="bufferMs"><span>Playback buffer</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
    </div>

    <div class="s5-voice-latency-callout">
      <div><small>Largest contribution</small><strong data-output="bottleneck">—</strong></div>
      <div><small>Interruption path</small><p data-output="bargeRead">—</p></div>
    </div>

    <aside class="s5-tool-source" aria-label="Method provenance">
      <div class="s5-tool-source__head"><a href="https://developers.deepgram.com/docs/endpointing" target="_blank" rel="noopener noreferrer">Deepgram · Endpointing</a><span>Sources reviewed 2026-08-21</span></div>
      <p>Turn end is a decision, not free latency: endpointing systems wait for evidence of silence or semantic completion. The right value depends on the domain and should be evaluated against false cuts and excessive waits, not milliseconds alone.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-voice-latency-method">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-voice-latency-method">Choose a clear measurement boundary and add only the critical path.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Measurement boundary.</strong> This tool defines response latency as the time from the acoustic end of the user's turn at the capture edge to the first agent audio at the listening edge. If your telemetry uses another boundary, adjust components so every stage uses the same reference.</p>
    <div class="s5-tool-method__formula">first_audio = ingress + turn_detection + residual_STT + model_first_output + TTS_first_audio + egress + playback_buffer</div>
    <p><strong>Architecture.</strong> A full cascade exposes external STT and TTS. In the half-cascade preset, audio understanding lives inside the model while TTS remains external. In speech-to-speech, external STT and TTS are set to zero. These are teaching presets, not a claim that one architecture is always faster.</p>
    <p><strong>Turn end.</strong> Deepgram documents VAD endpointing with a configurable silence duration. OpenAI Realtime distinguishes <code>server_vad</code> from <code>semantic_vad</code>; semantic turn detection can wait longer when it estimates the user has not finished. Reducing this stage without tracking false cuts can make the interaction worse.</p>
    <p><strong>TTS.</strong> ElevenLabs separates model inference time from end-to-end latency and recommends streaming/WebSockets to reduce time to first byte/audio. Text buffering can delay the start of synthesis. That is why this tool asks for “TTS first audio”, not total synthesis duration.</p>
    <p><strong>Barge-in.</strong> Interruption is not response latency in reverse. It includes receiving new speech, detecting it, cancelling generation/playback and clearing audio already queued. In bidirectional Media Streams, Twilio documents <code>clear</code> to empty the audio buffer and <code>mark</code> to track audio that finished or was cleared.</p>
    <div class="s5-tool-method__formula">barge_in_stop = ingress + speech_start_detection + cancel/control + output_buffer_clear</div>
    <div class="s5-voice-latency-caveat"><p><strong>These are not benchmarks.</strong> Initial values are intentionally round so the scenario is manipulable. Replace them with percentiles from your traces. A mean can hide long tails; production gates should inspect distributions by region, provider, language, turn type and architecture.</p></div>
    <p>Research on human turn-taking shows a broad tendency to minimize silence and overlap, but it does not define a universal SLA for voice agents. The 750/800/900 ms preset targets are editable hypotheses, not scientific recommendations.</p>
    <p class="s5-tool-method__notes">Sources: <a href="https://platform.openai.com/docs/api-reference/realtime">OpenAI Realtime API</a>, <a href="https://developers.deepgram.com/docs/endpointing">Deepgram Endpointing</a>, <a href="https://elevenlabs.io/docs/developer-guides/reducing-latency">ElevenLabs Latency Optimization</a>, <a href="https://www.twilio.com/docs/voice/media-streams/websocket-messages">Twilio Media Streams</a>, and <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2705608/">Stivers et al. (PNAS, 2009)</a>.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-voice-latency-related">
  <div class="s5-section-head"><h2 id="s5-voice-latency-related">Take the budget back to the real architecture</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/en/technical-articles/voice-agent-architectures/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Three architectures for voice agents</span><span class="s5-list-row__desc">Compare where STT, reasoning and TTS live before assigning latency to each stage.</span><span class="s5-list-row__meta">Technical note</span></a>
    <a class="s5-list-row" href="/en/technical-articles/reactive-proactive-voice-agents/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Reactive and proactive voice agents</span><span class="s5-list-row__desc">Separate conversational events from internal execution and playback control.</span><span class="s5-list-row__meta">Technical note</span></a>
    <a class="s5-list-row" href="/en/series/reasoning-models/04-latency-streaming/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Latency, streaming and human interaction</span><span class="s5-list-row__desc">See why time to first output can matter more than total completion time.</span><span class="s5-list-row__meta">Chapter</span></a>
  </div>
</section>

</div>
