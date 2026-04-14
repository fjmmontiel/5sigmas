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

/* ── Marquee ── */
.marquee-section {
  margin: 0 0 2.5rem;
}

.marquee-label {
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  opacity: .35;
  margin-bottom: 1.1rem;
}

.marquee-outer {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
}

.marquee-track {
  display: flex;
  gap: 12px;
  width: max-content;
  animation: marquee-scroll 40s linear infinite;
}
.marquee-track:hover { animation-play-state: paused; }

@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.marquee-pill {
  flex-shrink: 0;
  width: 260px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.07);
  background: rgba(255,255,255,.03);
  padding: .9rem 1rem .85rem;
  display: flex;
  flex-direction: column;
  gap: .4rem;
  cursor: default;
}

.pill-title {
  font-size: .88rem;
  font-weight: 700;
  line-height: 1.3;
}

.pill-desc {
  font-size: .78rem;
  line-height: 1.5;
  opacity: .5;
}
</style>

# Próximamente

<div style="font-size:.95rem;opacity:.6;line-height:1.6;max-width:56ch;margin:.25rem 0 2rem">Series en construcción o en investigación. El orden no implica prioridad de publicación.</div>

<div style="font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.35;margin-bottom:.9rem">En construcción — artículos en elaboración</div>

<div class="prox-grid">

<a href="/series/ia-pib-bienestar-energia/00_presentacion_serie/" class="prox-card prox-card-red">
  <div class="prox-badge" style="color:#e06c75">
    <span class="prox-dot" style="background:#e06c75"></span>En construcción · General
  </div>
  <div class="prox-title">IA, PIB, bienestar y energía</div>
  <div class="prox-desc">Electricidad, productividad y bienestar más allá del PIB. La IA como tecnología eléctrica del siglo XXI, con datos reales del Banco Mundial e IEA.</div>
  <div class="prox-cta" style="color:#e06c75">Ver presentación →</div>
</a>

<a href="/series/datacenters-espacio/00_presentacion_serie/" class="prox-card prox-card-green">
  <div class="prox-badge" style="color:#98c379">
    <span class="prox-dot" style="background:#98c379"></span>En construcción · General
  </div>
  <div class="prox-title">Datacenters en el espacio</div>
  <div class="prox-desc">Física, costes y viabilidad de llevar cómputo fuera de la Tierra. Qué resuelve el vacío, qué no resuelve y qué proyectos reales ya están en marcha.</div>
  <div class="prox-cta" style="color:#98c379">Ver presentación →</div>
</a>

</div>

<div class="marquee-section">
  <div class="marquee-label">En investigación — sin fecha de publicación</div>
  <div class="marquee-outer">
    <div class="marquee-track">
      <!-- set 1 -->
      <div class="marquee-pill">
        <div class="pill-title">Evaluación de modelos de IA</div>
        <div class="pill-desc">Benchmarks vs rendimiento real, LLM-as-judge y red-teaming.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">RAG: Retrieval-Augmented Generation</div>
        <div class="pill-desc">Cómo conectar un LLM a fuentes externas. Arquitectura, evaluación y trampas habituales.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">Agentes de IA</div>
        <div class="pill-desc">Cómo los LLMs pasan de responder a actuar. Bucles de razonamiento y límites reales.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">El problema de la alucinación</div>
        <div class="pill-desc">Por qué alucinan los LLMs, los límites del grounding y hasta dónde llega el RAG.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">Fine-tuning y adaptación de modelos</div>
        <div class="pill-desc">Cuándo hacer fine-tuning vs prompt engineering vs RAG, y qué coste implica cada opción.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">IA en el trabajo</div>
        <div class="pill-desc">Evidencia real de productividad, augmentation vs sustitución y cómo cambia el trabajo cualificado.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">Geopolítica de la IA</div>
        <div class="pill-desc">Chips, TSMC, control de exportaciones y la carrera entre EEUU, China y la UE.</div>
      </div>
      <!-- set 2 — copia exacta para el bucle sin corte (oculto a crawlers) -->
      <div aria-hidden="true" data-nosnippet>
      <div class="marquee-pill">
        <div class="pill-title">Evaluación de modelos de IA</div>
        <div class="pill-desc">Benchmarks vs rendimiento real, LLM-as-judge y red-teaming.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">RAG: Retrieval-Augmented Generation</div>
        <div class="pill-desc">Cómo conectar un LLM a fuentes externas. Arquitectura, evaluación y trampas habituales.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">Agentes de IA</div>
        <div class="pill-desc">Cómo los LLMs pasan de responder a actuar. Bucles de razonamiento y límites reales.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">El problema de la alucinación</div>
        <div class="pill-desc">Por qué alucinan los LLMs, los límites del grounding y hasta dónde llega el RAG.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">Fine-tuning y adaptación de modelos</div>
        <div class="pill-desc">Cuándo hacer fine-tuning vs prompt engineering vs RAG, y qué coste implica cada opción.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">IA en el trabajo</div>
        <div class="pill-desc">Evidencia real de productividad, augmentation vs sustitución y cómo cambia el trabajo cualificado.</div>
      </div>
      <div class="marquee-pill">
        <div class="pill-title">Geopolítica de la IA</div>
        <div class="pill-desc">Chips, TSMC, control de exportaciones y la carrera entre EEUU, China y la UE.</div>
      </div>
      </div>
    </div>
  </div>
</div>

[Ver series publicadas](/series/){ .md-button }
