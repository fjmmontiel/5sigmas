---
title: Artículos Técnicos
description: Artículos técnicos largos y autocontenidos sobre repositorios, runtimes y decisiones reales de implementación en sistemas de IA.
keywords: artículos técnicos IA, runtime conversacional, async tool calls, arquitectura agentes, tool calling, sistemas LLM
tags:
  - IA
  - Agentes
  - Arquitectura
hide:
  - toc
  - navigation
  - footer
---

<div class="s5-landing" markdown="1">

<section class="s5-lab-hero">
  <div class="s5-lab-hero__copy">
    <div class="s5-kicker">Systems laboratory / runbooks</div>
    <h1>Donde una idea se enfrenta a producción.</h1>
    <p>Notas autocontenidas sobre contratos, arquitectura, estado, latencia, herramientas, evaluación y operación. Menos “best practices”; más decisiones, condiciones y límites verificables.</p>
  </div>
  <aside class="s5-lab-hero__terminal">
    <div class="s5-terminal__status">LAB STATUS · ACTIVE</div>
    <div class="s5-terminal__code"><b>01</b>nota publicada<br>runtime conversacional<br>tool calls asíncronos<br>follow-up proactivo</div>
    <div class="s5-terminal__status">BUILD → MEASURE → BREAK → EXPLAIN</div>
  </aside>
</section>

<header class="s5-section-header">
  <div><div class="s5-kicker">Runbook publicado</div><h2 class="s5-section-title">El contrato visible no debe cargar con todo el sistema.</h2></div>
  <p class="s5-section-intro">La primera nota estudia cómo separar conversación, ejecución interna y cierre diferido sin engañar al usuario ni degradar el historial.</p>
</header>

<a class="s5-engineering-note" href="/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/">
  <div class="s5-engineering-note__id">NOTE / 001<br>PUBLICADA</div>
  <div><h2>Agente Reactivo, Proactivo y Tool calls</h2><p>Un patrón para aceptar una tarea con honestidad, ejecutarla fuera del turno visible y cerrar de forma proactiva sin convertir el historial conversacional en la base de datos del runtime.</p><div class="s5-mini-flow"><span>Aceptación</span><span>Ejecución</span><span>Follow-up</span></div></div>
  <div class="s5-engineering-note__spec"><div class="s5-spec"><b>Foco</b><span>Contrato conversacional y estado interno.</span></div><div class="s5-spec"><b>Artefacto</b><span>Repositorio público + demo local.</span></div><div class="s5-spec"><b>Salida</b><span>Lifecycle y arquitectura objetivo.</span></div></div>
</a>

<header class="s5-section-header">
  <div><div class="s5-kicker">Research queue</div><h2 class="s5-section-title">Los siguientes sistemas que merece la pena abrir.</h2></div>
  <p class="s5-section-intro">El roadmap se organiza por problemas operativos reutilizables, no por vendors ni herramientas aisladas.</p>
</header>

<div class="s5-queue">
  <div class="s5-queue-row"><span class="s5-queue-row__id">Q / 002</span><span class="s5-queue-row__title">Latencia end-to-end e interrupciones en sistemas de voz</span><span class="s5-queue-row__state">Investigación</span></div>
  <div class="s5-queue-row"><span class="s5-queue-row__id">Q / 003</span><span class="s5-queue-row__title">Evaluación de agentes, memoria y tool calling</span><span class="s5-queue-row__state">Diseño</span></div>
  <div class="s5-queue-row"><span class="s5-queue-row__id">Q / 004</span><span class="s5-queue-row__title">Percepción en tiempo real y fiabilidad en edge inference</span><span class="s5-queue-row__state">Pendiente</span></div>
</div>

<section class="s5-note-panel">
  <div><div class="s5-kicker">Formato de cada nota</div><h2>Problema, contrato, arquitectura, evidencia y límites.</h2><p>La implementación solo es útil cuando quedan claras las condiciones bajo las que funciona y el coste de sostenerla.</p></div>
  <div><div class="s5-kicker">Contexto antes que código</div><h2>Construye primero el modelo mental.</h2><p>Las series explican los mecanismos que estas notas dan por conocidos.</p><div class="s5-actions"><a class="s5-button s5-button--ink" href="/series/">Explorar las series →</a></div></div>
</section>

</div>
