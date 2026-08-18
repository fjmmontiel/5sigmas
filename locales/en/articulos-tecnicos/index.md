---
title: Engineering
description: Production engineering notes on architecture, runtimes, evaluation and artificial-intelligence systems.
keywords: AI architecture, agents, tool calling, LLM systems, conversational runtime
hide:
  - toc
  - navigation
  - footer
---

<div class="s5-landing">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Build</div>
  <h1>Real systems. Explicit decisions.</h1>
  <p>Technical notes on architecture, state, latency, evaluation and operations. Each piece starts from a concrete problem, makes its design choices explicit and ends with the limits of the approach.</p>
</section>

<section class="s5-section">
  <div class="s5-section-head"><h2>Published</h2></div>
  <div class="s5-note-feature">
    <div>
      <div class="s5-eyebrow">Note 01</div>
      <h2>Proactive and reactive agents and tool calls</h2>
      <p>How to separate the user-visible conversational contract, internal execution and deferred completion without turning conversation history into the runtime database.</p>
      <a class="s5-text-link" href="/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/">Read the technical note →</a>
    </div>
    <div class="s5-note-feature__meta">Conversational contract<br />Internal state<br />Asynchronous execution<br />Follow-up</div>
  </div>
  <div class="s5-note-feature">
    <div>
      <div class="s5-eyebrow">Note 02</div>
      <h2>Reactive and proactive agents in voice</h2>
      <p>How to coordinate acoustic activity, generation, playback and long-running tools so the system can accept work without blocking and return one completion when it is safe to speak.</p>
      <a class="s5-text-link" href="/en/articulos-tecnicos/reactive-proactive-voice-agents/">Read the technical note →</a>
    </div>
    <div class="s5-note-feature__meta">Voice runtime<br />Barge-in<br />ActivityGate<br />Asynchronous tools</div>
  </div>
  <div class="s5-note-feature">
    <div>
      <div class="s5-eyebrow">Note 03</div>
      <h2>Three architectures for voice agents</h2>
      <p>An operational comparison of full cascade, half cascade and speech-to-speech, focused on prosody, latency, tools, control and full-duplex interaction.</p>
      <a class="s5-text-link" href="/en/articulos-tecnicos/voice-agent-architectures/">Read the technical note →</a>
    </div>
    <div class="s5-note-feature__meta">Full cascade<br />Half cascade<br />Speech-to-speech<br />Hybrid architecture</div>
  </div>
</section>

<section class="s5-section">
  <div class="s5-section-head"><h2>In preparation</h2></div>
  <div class="s5-simple-list">
    <div class="s5-list-row">
      <span class="s5-list-row__n">04</span>
      <span class="s5-list-row__title">Evaluating agents and tool calling</span>
      <span class="s5-list-row__desc">Contracts, trajectories, memory and task success beyond an isolated text response.</span>
      <span class="s5-list-row__meta">Design</span>
    </div>
    <div class="s5-list-row">
      <span class="s5-list-row__n">05</span>
      <span class="s5-list-row__title">Reliable perception at the edge</span>
      <span class="s5-list-row__desc">How to measure and operate real-time computer vision under physical constraints.</span>
      <span class="s5-list-row__meta">Pending</span>
    </div>
  </div>
</section>

<section class="s5-section">
  <div class="s5-note-feature">
    <div>
      <div class="s5-eyebrow">Before implementing</div>
      <h2>Understand the mechanism first.</h2>
      <p>The series explain the concepts that the technical notes assume. Videos and interactive visuals provide the fastest entry point.</p>
      <a class="s5-text-link" href="/en/series/">Explore the series →</a>
    </div>
    <div class="s5-note-feature__meta">Video<br />Series<br />Technical note<br />Code</div>
  </div>
</section>

</div>
