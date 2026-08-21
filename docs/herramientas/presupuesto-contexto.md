---
title: Planificador de presupuesto de contexto y tokens para LLMs
description: Distribuye la ventana de contexto entre sistema, herramientas, historial, RAG, mensaje de usuario, salida y margen de seguridad; detecta overflow antes de producción.
keywords: ventana de contexto LLM, presupuesto tokens, context window, tokens RAG, historial conversación, tool schemas tokens, max output tokens
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-context-budget.css" />
<script src="/assets/javascripts/tools/context-budget-core.js" defer></script>
<script src="/assets/javascripts/tools/context-budget.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Planificador de presupuesto de contexto y tokens — 5sigmas",
  "url": "https://5sigmas.com/herramientas/presupuesto-contexto/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Planificador interactivo para distribuir una ventana de contexto entre instrucciones, herramientas, historial, RAG, entrada de usuario, salida y margen de seguridad.",
  "featureList": [
    "Presupuesto explícito de input, output y margen",
    "Desglose de sistema, herramientas, historial, RAG y usuario",
    "Detección de overflow y headroom",
    "Estimación de turnos adicionales hasta presión de contexto",
    "Escenario compartible y exportación JSON"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-context-budget data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · LLMs · 06</div>
  <h1>Distribuye la ventana de contexto antes de superar el límite.</h1>
  <p>Una ventana grande sigue siendo un presupuesto finito. Separa instrucciones, esquemas de herramientas, historial, contexto RAG, mensaje actual, salida reservada y margen operativo para ver cuánto cabe antes de truncar o fallar.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Relaciones principales">
  <div><small>Ventana</small><strong>input + salida + margen</strong></div>
  <div><small>Input</small><strong>sistema + herramientas + historial + RAG + usuario</strong></div>
  <div><small>Presión futura</small><strong>margen ÷ crecimiento por turno</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Presupuesto de contexto" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Límite y reservas</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-context-es-limit">Ventana de contexto · tokens</label><input id="s5-context-es-limit" data-field="contextLimit" type="number" min="1" step="1" inputmode="numeric" value="128000" /></div>
        <div class="s5-tool-field"><label for="s5-context-es-output">Salida reservada · tokens</label><input id="s5-context-es-output" data-field="reservedOutput" type="number" min="0" step="1" inputmode="numeric" value="8000" /><small>No es una predicción: es el máximo que quieres proteger para la respuesta.</small></div>
        <div class="s5-tool-field"><label for="s5-context-es-safety">Margen de seguridad · tokens</label><input id="s5-context-es-safety" data-field="safetyTokens" type="number" min="0" step="1" inputmode="numeric" value="4096" /><small>Reserva para variación de tokenización, contenido dinámico y overhead no modelado.</small></div>
        <div class="s5-tool-field"><label for="s5-context-es-growth">Crecimiento de historial por turno · tokens</label><input id="s5-context-es-growth" data-field="historyGrowthPerTurn" type="number" min="0" step="1" inputmode="numeric" value="1800" /><small>Úsalo para aproximar cuándo una conversación larga empezará a presionar el contexto.</small></div>
      </div>
      <div class="s5-context-preset-actions" aria-label="Ventanas de contexto frecuentes">
        <button type="button" data-context-preset="32768">32K</button>
        <button type="button" data-context-preset="128000">128K</button>
        <button type="button" data-context-preset="256000">256K</button>
        <button type="button" data-context-preset="400000">400K</button>
        <button type="button" data-context-preset="1050000">1.05M</button>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Qué entra en cada llamada</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-context-es-system">Sistema / developer · tokens</label><input id="s5-context-es-system" data-field="systemTokens" type="number" min="0" step="1" inputmode="numeric" value="2500" /></div>
        <div class="s5-tool-field"><label for="s5-context-es-tools">Herramientas / esquemas · tokens</label><input id="s5-context-es-tools" data-field="toolTokens" type="number" min="0" step="1" inputmode="numeric" value="5000" /></div>
        <div class="s5-tool-field"><label for="s5-context-es-history">Historial · tokens</label><input id="s5-context-es-history" data-field="historyTokens" type="number" min="0" step="1" inputmode="numeric" value="20000" /></div>
        <div class="s5-tool-field"><label for="s5-context-es-rag">Contexto RAG · tokens</label><input id="s5-context-es-rag" data-field="ragTokens" type="number" min="0" step="1" inputmode="numeric" value="24000" /></div>
        <div class="s5-tool-field"><label for="s5-context-es-user">Mensaje actual · tokens</label><input id="s5-context-es-user" data-field="userTokens" type="number" min="0" step="1" inputmode="numeric" value="2000" /></div>
      </div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Resultado del presupuesto de contexto" aria-live="polite">
    <div class="s5-tool-kpis">
      <div class="s5-tool-kpi"><small>Contexto planificado</small><strong data-output="planned">—</strong><span>input + salida reservada + margen</span></div>
      <div class="s5-tool-kpi"><small>Límite</small><strong data-output="limit">—</strong><span>ventana configurada para el escenario</span></div>
      <div class="s5-tool-kpi"><small>Input disponible</small><strong data-output="availableInput">—</strong><span>después de proteger salida y margen</span></div>
      <div class="s5-tool-kpi"><small>Input restante</small><strong data-output="remainingInput">—</strong><span>negativo significa overflow</span></div>
    </div>

    <div class="s5-tool-status-grid" aria-label="Comprobaciones del escenario">
      <div class="s5-tool-status" data-output="budgetStatus" data-label="Presupuesto total">—</div>
      <div class="s5-tool-status" data-output="reserveStatus" data-label="Reserva de salida">—</div>
      <div class="s5-tool-status" data-output="growthStatus" data-label="Crecimiento del historial">—</div>
    </div>

    <div class="s5-context-budget-bar-wrap">
      <div class="s5-tool-breakdown__head"><strong>Distribución de la ventana</strong><span data-output="utilization">—</span></div>
      <div class="s5-context-budget-bar" data-budget-bar role="img" aria-label="Distribución del presupuesto de contexto"></div>
      <div class="s5-context-budget-legend" data-budget-legend aria-label="Leyenda del presupuesto"></div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Detalles del presupuesto">
      <div><small>Uso del input disponible</small><strong data-output="inputUse">—</strong></div>
      <div><small>Overflow</small><strong data-output="overflow">—</strong></div>
      <div><small>Turnos hasta presión</small><strong data-output="turns">—</strong></div>
      <div><small>Mayor bloque</small><strong data-output="largestBlock">—</strong></div>
    </div>

    <div class="s5-context-pressure" data-budget-pressure aria-label="Lectura del escenario"></div>

    <aside class="s5-tool-source" aria-label="Procedencia metodológica">
      <div class="s5-tool-source__head"><a href="https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them" target="_blank" rel="noopener noreferrer">OpenAI · tokens y límites</a><span>Verificado 21-08-2026</span></div>
      <p>La herramienta no asigna un modelo concreto. Usa un presupuesto combinado de contexto y hace explícitas la salida reservada y el margen para que puedas adaptar los límites reales de tu proveedor.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-context-method">
  <div><div class="s5-eyebrow">Método</div><h2 id="s5-context-method">Separa input, salida reservada y margen antes de calcular capacidad.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Presupuesto de input.</strong> La ventana configurada se reparte entre los tokens que ya llegan al modelo, la salida máxima que quieres permitir y un margen operativo explícito.</p>
    <div class="s5-tool-method__formula">input_disponible = ventana_contexto − salida_reservada − margen</div>
    <p><strong>Demanda real.</strong> El input se desglosa para que un crecimiento de historial, un esquema de herramientas grande o más chunks RAG no quede oculto dentro de una única cifra.</p>
    <div class="s5-tool-method__formula">input_usado = sistema + herramientas + historial + RAG + usuario</div>
    <p><strong>Overflow.</strong> Si el input usado supera el input disponible, la herramienta muestra exactamente cuántos tokens hay que recuperar. No decide automáticamente qué eliminar: esa prioridad depende de tu producto. En su lugar muestra qué bloques podrían absorber la reducción.</p>
    <p><strong>Conversaciones largas.</strong> El número de turnos restantes es una aproximación lineal: margen de input actual dividido entre el crecimiento de historial que configures. Resumir, compactar o descartar mensajes cambia esa dinámica.</p>
    <p><strong>Semántica del límite.</strong> OpenAI documenta que el límite máximo de tokens combina input y output. En Responses, `max_output_tokens` limita la generación y la estrategia de truncado puede fallar o eliminar elementos del principio cuando el input excede la ventana. Por eso este planificador separa deliberadamente capacidad, reserva de salida y política de truncado.</p>
    <p class="s5-tool-method__notes">No estima tokens a partir de caracteres ni palabras: introduce conteos reales de tu tokenizer o telemetría. La tokenización depende del modelo y del idioma.</p>
    <p class="s5-tool-method__notes">Fuentes primarias: <a href="https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them">OpenAI · What are tokens and how to count them?</a> y <a href="https://developers.openai.com/api/reference/cli/resources/responses/methods/create">OpenAI Responses API · create</a>. Verificadas el 21-08-2026.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-context-related">
  <div class="s5-section-head"><h2 id="s5-context-related">Conecta contexto, coste y arquitectura</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/herramientas/coste-latencia-llm/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Coste y latencia de LLMs</span><span class="s5-list-row__desc">Convierte el presupuesto de tokens en coste por solicitud y coste mensual.</span><span class="s5-list-row__meta">Herramienta</span></a>
    <a class="s5-list-row" href="/herramientas/kv-cache-contexto/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">KV cache y contexto</span><span class="s5-list-row__desc">Mira cuánto cuesta mantener esos tokens residentes en memoria durante inferencia.</span><span class="s5-list-row__meta">Herramienta</span></a>
    <a class="s5-list-row" href="/temas/llms/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">LLMs</span><span class="s5-list-row__desc">Tokens, generación autoregresiva y contexto como base del mecanismo.</span><span class="s5-list-row__meta">Concepto</span></a>
  </div>
</section>

</div>
