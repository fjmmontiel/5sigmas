---
title: Próximamente
description: Backlog editorial público de 5sigmas. Series en preparación, temas en investigación y criterios para convertir una idea en serie.
robots: noindex
hide:
  - toc
  - navigation
  - footer
---

<style>
.prox-hero {
  margin: .4rem 0 1.8rem;
  padding: 1.25rem 0 1.35rem;
  border-bottom: 1px solid color-mix(in srgb, var(--md-default-fg-color) 12%, transparent);
}

.prox-hero p {
  max-width: 62ch;
  margin: .4rem 0 0;
  color: var(--md-default-fg-color--light);
  line-height: 1.65;
}

.prox-lanes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.2rem 0 2.1rem;
}

.prox-lane {
  min-width: 0;
  border-top: 3px solid var(--lane-color);
  padding-top: .8rem;
}

.prox-lane h2 {
  margin: 0;
  font-size: 1rem;
}

.prox-lane p {
  margin: .35rem 0 0;
  color: var(--md-default-fg-color--light);
  font-size: .85rem;
  line-height: 1.5;
}

.prox-section {
  margin: 2rem 0 2.4rem;
}

.prox-section h2 {
  margin-bottom: .35rem;
}

.prox-section > p {
  max-width: 66ch;
  margin-top: 0;
  color: var(--md-default-fg-color--light);
  line-height: 1.6;
}

.prox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: .9rem;
  margin-top: 1rem;
}

.prox-card {
  --card-color: #26A69A;
  position: relative;
  min-width: 0;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--card-color) 24%, transparent);
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--card-color) 9%, var(--md-default-bg-color)) 0%,
      color-mix(in srgb, var(--card-color) 3%, var(--md-default-bg-color)) 100%);
  padding: 1rem 1rem .95rem;
}

.prox-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  border-radius: 8px 8px 0 0;
  background: var(--card-color);
}

.prox-kicker {
  margin: 0 0 .45rem;
  color: color-mix(in srgb, var(--card-color) 76%, var(--md-default-fg-color));
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.prox-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.3;
}

.prox-desc {
  margin: .5rem 0 0;
  color: var(--md-default-fg-color--light);
  font-size: .86rem;
  line-height: 1.52;
}

.prox-proof {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: .75rem;
  margin: 1rem 0 1.4rem;
}

.prox-proof div {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--md-default-fg-color) 12%, transparent);
  padding: .85rem;
  background: color-mix(in srgb, var(--md-default-fg-color) 3%, var(--md-default-bg-color));
}

.prox-proof strong {
  display: block;
  margin-bottom: .3rem;
}

.prox-proof span {
  color: var(--md-default-fg-color--light);
  font-size: .84rem;
  line-height: 1.45;
}

@media (max-width: 760px) {
  .prox-lanes {
    grid-template-columns: 1fr;
  }
}
</style>

# Próximamente

<div class="prox-hero">
  <p>Esta página no funciona como calendario cerrado. Es una ventana al criterio editorial de 5sigmas: qué temas están tomando forma, cuáles siguen en investigación y qué tiene que ocurrir para que una idea pase a serie pública.</p>
</div>

<div class="prox-lanes">
  <section class="prox-lane" style="--lane-color:#26A69A">
    <h2>En preparación</h2>
    <p>Temas con tesis clara, material localizado y estructura probable de serie.</p>
  </section>
  <section class="prox-lane" style="--lane-color:#C27A00">
    <h2>En investigación</h2>
    <p>Ideas con potencial, pero todavía sin arco narrativo suficientemente cerrado.</p>
  </section>
  <section class="prox-lane" style="--lane-color:#6D5BD0">
    <h2>En vigilancia</h2>
    <p>Frentes que cambian rápido y necesitan más evidencia antes de publicarse.</p>
  </section>
</div>

<section class="prox-section">
  <h2>En preparación</h2>
  <p>Son candidatos cercanos, pero todavía no se publican hasta que el contrato de contenido, las fuentes y la gramática visual estén cerrados.</p>

  <div class="prox-grid">
    <article class="prox-card" style="--card-color:#B23A48">
      <p class="prox-kicker">Seguridad en IA</p>
      <h3 class="prox-title">Prompt injection, agentes y defensas por etapas</h3>
      <p class="prox-desc">Cómo cambia la seguridad cuando el modelo deja de responder en una caja de texto y empieza a leer documentos, usar herramientas y actuar sobre sistemas.</p>
    </article>

    <article class="prox-card" style="--card-color:#C27A00">
      <p class="prox-kicker">Infraestructura</p>
      <h3 class="prox-title">AI factories y la economía física del cómputo</h3>
      <p class="prox-desc">Capital, energía, chips, red eléctrica y cadena material como parte del sistema de IA, no como un detalle externo al software.</p>
    </article>

    <article class="prox-card" style="--card-color:#4E9CD6">
      <p class="prox-kicker">Evaluación</p>
      <h3 class="prox-title">Medir modelos sin comprar el ranking</h3>
      <p class="prox-desc">Benchmarks, tareas reales, evaluación humana, LLM-as-judge y red-teaming como señales distintas que no conviene mezclar.</p>
    </article>
  </div>
</section>

<section class="prox-section">
  <h2>En investigación</h2>
  <p>Aquí todavía no hay promesa de publicación. Hay preguntas útiles que pueden acabar como serie, artículo técnico o píldora si la evidencia aguanta.</p>

  <div class="prox-grid">
    <article class="prox-card" style="--card-color:#7C3AED">
      <p class="prox-kicker">RAG</p>
      <h3 class="prox-title">Retrieval-Augmented Generation</h3>
      <p class="prox-desc">Arquitectura, evaluación, recuperación híbrida, chunking, reranking y límites reales del grounding documental.</p>
    </article>

    <article class="prox-card" style="--card-color:#10B981">
      <p class="prox-kicker">Agentes</p>
      <h3 class="prox-title">De responder a operar</h3>
      <p class="prox-desc">Bucles de planificación, herramientas, memoria, permisos y errores que dejan de ser texto para convertirse en acciones.</p>
    </article>

    <article class="prox-card" style="--card-color:#8B5CF6">
      <p class="prox-kicker">Fiabilidad</p>
      <h3 class="prox-title">El problema de la alucinación</h3>
      <p class="prox-desc">Por qué aparece, qué reduce el riesgo, qué no lo elimina y cuándo el problema deja de ser lingüístico para ser operativo.</p>
    </article>

    <article class="prox-card" style="--card-color:#EC4899">
      <p class="prox-kicker">Adaptación</p>
      <h3 class="prox-title">Fine-tuning, prompts y modelos propios</h3>
      <p class="prox-desc">Dónde termina la ingeniería de contexto, cuándo tiene sentido adaptar pesos y qué deuda operativa introduce cada opción.</p>
    </article>

    <article class="prox-card" style="--card-color:#F59E0B">
      <p class="prox-kicker">Trabajo</p>
      <h3 class="prox-title">Productividad real con IA</h3>
      <p class="prox-desc">Evidencia de tareas concretas, rediseño de procesos, adopción organizativa y diferencias entre ahorro individual y mejora agregada.</p>
    </article>

    <article class="prox-card" style="--card-color:#3B82F6">
      <p class="prox-kicker">Geopolítica</p>
      <h3 class="prox-title">Chips, export controls y soberanía tecnológica</h3>
      <p class="prox-desc">TSMC, restricciones de exportación, capacidad energética y concentración industrial como límites materiales del despliegue.</p>
    </article>
  </div>
</section>

<section class="prox-section">
  <h2>Qué convierte una idea en serie</h2>
  <p>Un tema no entra en 5sigmas por estar de moda. Tiene que poder explicarse con estructura, fuentes y visuales que ayuden a entender el mecanismo.</p>

  <div class="prox-proof">
    <div>
      <strong>Tesis defendible</strong>
      <span>Una pregunta central clara y una posición que pueda sostenerse sin exagerar.</span>
    </div>
    <div>
      <strong>Fuentes suficientes</strong>
      <span>Material primario, datos o literatura que permitan separar evidencia de opinión.</span>
    </div>
    <div>
      <strong>Arco narrativo</strong>
      <span>Capítulos que se construyen unos sobre otros, no una lista de temas sueltos.</span>
    </div>
    <div>
      <strong>Gramática visual</strong>
      <span>Diagramas, mapas o comparativas que expliquen mejor que un bloque de texto.</span>
    </div>
  </div>
</section>

[Ver series publicadas](/series/){ .md-button .md-button--primary }
[Ver píldoras 5sigmas](/pildoras/){ .md-button }
