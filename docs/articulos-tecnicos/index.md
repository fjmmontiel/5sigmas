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
---

<style>
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin: 1.5rem 0 2.25rem;
}

.tech-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(38,166,154,.2);
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(38,166,154,.09), transparent 48%),
    radial-gradient(110% 140% at 100% 0%, rgba(50,74,178,.08), transparent 44%),
    linear-gradient(180deg, rgba(8,16,28,.96), rgba(12,22,38,.98));
  color: #e6edf6 !important;
  padding: 1.3rem 1.3rem 1.2rem;
  text-decoration: none !important;
  display: flex;
  flex-direction: column;
  gap: .7rem;
  min-height: 260px;
  box-shadow: 0 18px 48px rgba(3, 10, 20, .18);
}

.tech-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, #26A69A, #7cc7ff, #324AB2);
}

.tech-card:hover {
  transform: translateY(-3px);
  transition: transform .18s ease;
}

.tech-kicker {
  display: flex;
  justify-content: space-between;
  gap: .5rem;
  align-items: center;
  flex-wrap: wrap;
}

.tech-badge {
  font-size: .66rem;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: #7cc7ff;
}

.tech-state {
  font-family: "SF Mono","JetBrains Mono","Courier New",monospace;
  font-size: .68rem;
  padding: .22rem .48rem;
  border-radius: 999px;
  border: 1px solid rgba(124,199,255,.25);
  background: rgba(124,199,255,.08);
  color: #c8edff;
}

.tech-title {
  font-size: 1.08rem;
  line-height: 1.3;
  font-weight: 800;
  color: #f5fbff;
}

.tech-desc {
  font-size: .9rem;
  line-height: 1.58;
  color: rgba(230,237,246,.78);
}

.tech-meta {
  display: grid;
  gap: .35rem;
  margin-top: auto;
  padding-top: .25rem;
}

.tech-meta-row {
  display: flex;
  gap: .55rem;
  align-items: baseline;
  font-size: .8rem;
  line-height: 1.45;
}

.tech-meta-k {
  min-width: 72px;
  font-family: "SF Mono","JetBrains Mono","Courier New",monospace;
  color: rgba(124,199,255,.9);
}

.tech-meta-v {
  color: rgba(230,237,246,.82);
}

.tech-note {
  max-width: 70ch;
  font-size: .94rem;
  line-height: 1.65;
  opacity: .72;
}
</style>

# Artículos Técnicos

Esta sección no replica el formato de las series de divulgación. Aquí irán artículos largos, autocontenidos y anclados en repositorios, decisiones de diseño y trade-offs reales de implementación.

La idea no es trocear una tesis en capítulos narrativos, sino publicar piezas que puedan leerse solas y que aterricen arquitectura, código, UI y operación sobre un sistema concreto.

En esta capa el formato base se parece más a una `engineering note` que a un ensayo divulgativo: estado del proyecto, contrato técnico, límites reales de la demo y una lectura explícita de qué parte del sistema está resuelta y cuál sigue fuera de alcance.

<div class="tech-grid">

<a href="/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/" class="tech-card">
  <div class="tech-kicker">
    <div class="tech-badge">Artículo técnico</div>
    <div class="tech-state">Publicado</div>
  </div>
  <div class="tech-title">Agente Reactivo, Proactivo y Tool calls</div>
  <div class="tech-desc">Una nota técnica sobre <code>Reactive / Proactive Agent</code> para explicar un patrón de runtime: aceptación honesta, trabajo en background y cierre proactivo sin convertir el historial visible en la base de datos del sistema.</div>
  <div class="tech-meta">
    <div class="tech-meta-row"><span class="tech-meta-k">Foco</span><span class="tech-meta-v">contrato conversacional, runtime conversacional, estado interno y follow-up diferido</span></div>
    <div class="tech-meta-row"><span class="tech-meta-k">Repo</span><span class="tech-meta-v">enlace público en GitHub + demo local base</span></div>
    <div class="tech-meta-row"><span class="tech-meta-k">Visual</span><span class="tech-meta-v">panorama operativo, lifecycle de la operación y arquitectura objetivo</span></div>
  </div>
</a>

</div>

<div class="tech-note">
Esta sección queda abierta a muchos artículos. El primero nace del repositorio <code>Reactive / Proactive Agent</code>, pero el foco editorial no es el nombre del repo en sí, sino el patrón que el código cristaliza: conversación visible, ejecución interna y cierre diferido sin romper el contrato con el usuario.
</div>
