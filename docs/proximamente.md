---
title: Próximamente
description: Series en investigación y planificadas para 5sigmas. Backlog editorial de temas de IA, sistemas GenAI, infraestructura y más.
robots: noindex
hide:
  - toc
  - navigation
  - footer
---

<style>
/* ── En construcción — cards ── */
.prox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin: 1.5rem 0 3rem;
}

.prox-card {
  position: relative;
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  text-decoration: none !important;
  color: inherit !important;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease;
}
.prox-card:hover {
  transform: translateY(-4px);
}
.prox-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
.prox-card-amber { background: rgba(255,179,67,.05); }
.prox-card-amber::before { background: linear-gradient(135deg, rgba(255,179,67,.5), rgba(255,179,67,.12)); }
.prox-card-amber:hover { box-shadow: 0 16px 40px rgba(255,179,67,.12); }

.prox-card-red { background: rgba(224,108,117,.05); }
.prox-card-red::before { background: linear-gradient(135deg, rgba(224,108,117,.5), rgba(224,108,117,.12)); }
.prox-card-red:hover { box-shadow: 0 16px 40px rgba(224,108,117,.12); }

.prox-card-green { background: rgba(152,195,121,.05); }
.prox-card-green::before { background: linear-gradient(135deg, rgba(152,195,121,.5), rgba(152,195,121,.12)); }
.prox-card-green:hover { box-shadow: 0 16px 40px rgba(152,195,121,.12); }

.prox-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.prox-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .4; transform: scale(.75); }
}

.prox-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.3;
}

.prox-desc {
  font-size: .88rem;
  line-height: 1.55;
  opacity: .65;
  flex: 1;
}

.prox-cta {
  font-size: .82rem;
  font-weight: 700;
  margin-top: .25rem;
}

/* ── En investigación ── */
.research-section {
  margin: 0 0 2.5rem;
}

.research-label {
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  opacity: .35;
  margin-bottom: 1.1rem;
}

.research-outer {
  overflow: hidden;
  padding: 0 10px;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 3%, #000 97%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, #000 3%, #000 97%, transparent 100%);
}

.research-track {
  display: flex;
  align-items: stretch;
  gap: 14px;
  width: max-content;
  padding: 0 12px 8px;
  animation: research-scroll 52s linear infinite;
}

.research-track > [aria-hidden="true"][data-nosnippet] {
  display: contents;
}

.research-track:hover {
  animation-play-state: paused;
}

@keyframes research-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.research-card {
  --rc: #6366F1;
  position: relative;
  flex: 0 0 236px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--rc) 18%, transparent);
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--rc) 12%, var(--md-default-bg-color, #fff)) 0%,
      color-mix(in srgb, var(--rc) 4%, var(--md-default-bg-color, #fff)) 100%);
  padding: 1rem 1rem .95rem;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  min-height: 188px;
}

.research-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  border-radius: 14px 14px 0 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--rc) 82%, white), var(--rc));
}

.research-badge {
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--rc) 72%, var(--md-default-fg-color, #111));
  opacity: .95;
}

.research-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--md-default-fg-color, #111);
}

.research-desc {
  font-size: .86rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--md-default-fg-color, #111) 68%, transparent);
}

[data-md-color-scheme="slate"] .research-card {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--rc) 16%, #0b1220) 0%,
      color-mix(in srgb, var(--rc) 7%, #0b1220) 100%);
}

[data-md-color-scheme="default"] .research-card {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--rc) 10%, #ffffff) 0%,
      color-mix(in srgb, var(--rc) 3%, #ffffff) 100%);
}

@media (max-width: 720px) {
  .prox-grid {
    grid-template-columns: 1fr;
  }

  .research-card {
    flex-basis: 208px;
    min-height: 176px;
  }
}
</style>

# Próximamente

<div style="font-size:.95rem;opacity:.6;line-height:1.6;max-width:56ch;margin:.25rem 0 2rem">Series en construcción o en investigación. El orden no implica prioridad de publicación.</div>

<div style="font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.35;margin-bottom:.9rem">En construcción — artículos en elaboración</div>

<div class="prox-grid">

<a href="/series/datacenters-espacio/00_presentacion_serie/" class="prox-card prox-card-green">
  <div class="prox-badge" style="color:#98c379">
    <span class="prox-dot" style="background:#98c379"></span>En construcción · General
  </div>
  <div class="prox-title">Datacenters en el espacio</div>
  <div class="prox-desc">Física, costes y viabilidad de llevar cómputo fuera de la Tierra. Qué resuelve el vacío, qué no resuelve y qué proyectos reales ya están en marcha.</div>
  <div class="prox-cta" style="color:#98c379">Ver presentación →</div>
</a>

</div>

<div class="research-section">
  <div class="research-label">En investigación — sin fecha de publicación</div>
  <div class="research-outer">
    <div class="research-track">
      <div class="research-card" style="--rc:#6366F1">
        <div class="research-badge">En investigación</div>
        <div class="research-title">Evaluación de modelos de IA</div>
        <div class="research-desc">Benchmarks vs rendimiento real, LLM-as-judge y red-teaming.</div>
      </div>
      <div class="research-card" style="--rc:#7C3AED">
        <div class="research-badge">En investigación</div>
        <div class="research-title">RAG: Retrieval-Augmented Generation</div>
        <div class="research-desc">Cómo conectar un LLM a fuentes externas. Arquitectura, evaluación y trampas habituales.</div>
      </div>
      <div class="research-card" style="--rc:#10B981">
        <div class="research-badge">En investigación</div>
        <div class="research-title">Agentes de IA</div>
        <div class="research-desc">Cómo los LLMs pasan de responder a actuar. Bucles de razonamiento y límites reales.</div>
      </div>
      <div class="research-card" style="--rc:#8B5CF6">
        <div class="research-badge">En investigación</div>
        <div class="research-title">El problema de la alucinación</div>
        <div class="research-desc">Por qué alucinan los LLMs, los límites del grounding y hasta dónde llega el RAG.</div>
      </div>
      <div class="research-card" style="--rc:#EC4899">
        <div class="research-badge">En investigación</div>
        <div class="research-title">Fine-tuning y adaptación de modelos</div>
        <div class="research-desc">Cuándo hacer fine-tuning vs prompt engineering vs RAG, y qué coste implica cada opción.</div>
      </div>
      <div class="research-card" style="--rc:#F59E0B">
        <div class="research-badge">En investigación</div>
        <div class="research-title">IA en el trabajo</div>
        <div class="research-desc">Evidencia real de productividad, augmentation vs sustitución y cómo cambia el trabajo cualificado.</div>
      </div>
      <div class="research-card" style="--rc:#3B82F6">
        <div class="research-badge">En investigación</div>
        <div class="research-title">Geopolítica de la IA</div>
        <div class="research-desc">Chips, TSMC, control de exportaciones y la carrera entre EEUU, China y la UE.</div>
      </div>

      <div aria-hidden="true" data-nosnippet>
        <div class="research-card" style="--rc:#6366F1">
          <div class="research-badge">En investigación</div>
          <div class="research-title">Evaluación de modelos de IA</div>
          <div class="research-desc">Benchmarks vs rendimiento real, LLM-as-judge y red-teaming.</div>
        </div>
        <div class="research-card" style="--rc:#7C3AED">
          <div class="research-badge">En investigación</div>
          <div class="research-title">RAG: Retrieval-Augmented Generation</div>
          <div class="research-desc">Cómo conectar un LLM a fuentes externas. Arquitectura, evaluación y trampas habituales.</div>
        </div>
        <div class="research-card" style="--rc:#10B981">
          <div class="research-badge">En investigación</div>
          <div class="research-title">Agentes de IA</div>
          <div class="research-desc">Cómo los LLMs pasan de responder a actuar. Bucles de razonamiento y límites reales.</div>
        </div>
        <div class="research-card" style="--rc:#8B5CF6">
          <div class="research-badge">En investigación</div>
          <div class="research-title">El problema de la alucinación</div>
          <div class="research-desc">Por qué alucinan los LLMs, los límites del grounding y hasta dónde llega el RAG.</div>
        </div>
        <div class="research-card" style="--rc:#EC4899">
          <div class="research-badge">En investigación</div>
          <div class="research-title">Fine-tuning y adaptación de modelos</div>
          <div class="research-desc">Cuándo hacer fine-tuning vs prompt engineering vs RAG, y qué coste implica cada opción.</div>
        </div>
        <div class="research-card" style="--rc:#F59E0B">
          <div class="research-badge">En investigación</div>
          <div class="research-title">IA en el trabajo</div>
          <div class="research-desc">Evidencia real de productividad, augmentation vs sustitución y cómo cambia el trabajo cualificado.</div>
        </div>
        <div class="research-card" style="--rc:#3B82F6">
          <div class="research-badge">En investigación</div>
          <div class="research-title">Geopolítica de la IA</div>
          <div class="research-desc">Chips, TSMC, control de exportaciones y la carrera entre EEUU, China y la UE.</div>
        </div>
      </div>
    </div>
  </div>
</div>

[Ver series publicadas](/series/){ .md-button }
