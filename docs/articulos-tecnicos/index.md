---
title: Ingeniería
description: Notas técnicas de 5sigmas sobre arquitectura, runtimes, evaluación y sistemas de inteligencia artificial en producción.
keywords: arquitectura IA, agentes, tool calling, sistemas LLM, runtime conversacional
hide:
  - toc
  - navigation
  - footer
---

<div class="s5-landing">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Construir</div>
  <h1>Sistemas reales. Decisiones explícitas.</h1>
  <p>Notas técnicas sobre arquitectura, estado, latencia, evaluación y operación. Cada pieza parte de un problema concreto, hace explícitas sus decisiones y termina con sus límites.</p>
</section>

<section class="s5-section">
  <div class="s5-section-head"><h2>Publicado</h2></div>
  <div class="s5-note-feature">
    <div>
      <div class="s5-eyebrow">Nota 01</div>
      <h2>Agente reactivo, proactivo y tool calls</h2>
      <p>Cómo separar el contrato visible con el usuario, la ejecución interna y el cierre diferido sin convertir el historial conversacional en la base de datos del runtime.</p>
      <a class="s5-text-link" href="/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/">Leer la nota técnica →</a>
    </div>
    <div class="s5-note-feature__meta">Contrato conversacional<br />Estado interno<br />Ejecución asíncrona<br />Follow-up</div>
  </div>
  <div class="s5-note-feature">
    <div>
      <div class="s5-eyebrow">Nota 02</div>
      <h2>Agentes reactivos y proactivos en voz</h2>
      <p>Cómo coordinar actividad acústica, generación, playback y tools duraderas para aceptar trabajo sin bloquear y volver con un único cierre cuando sea seguro hablar.</p>
      <a class="s5-text-link" href="/articulos-tecnicos/reactive-proactive-voice-agents/">Leer la nota técnica →</a>
    </div>
    <div class="s5-note-feature__meta">Voice runtime<br />Barge-in<br />ActivityGate<br />Tools asíncronas</div>
  </div>
</section>

<section class="s5-section">
  <div class="s5-section-head"><h2>En preparación</h2></div>
  <div class="s5-simple-list">
    <div class="s5-list-row">
      <span class="s5-list-row__n">03</span>
      <span class="s5-list-row__title">Tres arquitecturas para agentes de voz</span>
      <span class="s5-list-row__desc">Full cascade, half cascade y speech-to-speech: prosodia, latencia, control y una arquitectura híbrida.</span>
      <span class="s5-list-row__meta">Investigación</span>
    </div>
    <div class="s5-list-row">
      <span class="s5-list-row__n">04</span>
      <span class="s5-list-row__title">Evaluación de agentes y tool calling</span>
      <span class="s5-list-row__desc">Contratos, trayectorias, memoria y éxito de tarea más allá de una respuesta textual aislada.</span>
      <span class="s5-list-row__meta">Diseño</span>
    </div>
    <div class="s5-list-row">
      <span class="s5-list-row__n">05</span>
      <span class="s5-list-row__title">Percepción fiable en edge inference</span>
      <span class="s5-list-row__desc">Cómo medir y operar visión artificial en tiempo real bajo restricciones físicas.</span>
      <span class="s5-list-row__meta">Pendiente</span>
    </div>
  </div>
</section>

<section class="s5-section">
  <div class="s5-note-feature">
    <div>
      <div class="s5-eyebrow">Antes de implementar</div>
      <h2>Entiende primero el mecanismo.</h2>
      <p>Las series explican los conceptos que las notas técnicas dan por conocidos. Los vídeos y animaciones ofrecen la entrada más rápida.</p>
      <a class="s5-text-link" href="/series/">Explorar las series →</a>
    </div>
    <div class="s5-note-feature__meta">Vídeo<br />Serie<br />Nota técnica<br />Código</div>
  </div>
</section>

</div>
