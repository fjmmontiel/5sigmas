---
title: Fiabilidad y evaluación de agentes — playground de trazas
description: Evalúa éxito final, primer intento, reintentos, decisiones de herramientas, timeouts, política y eficiencia de trayectorias con criterios explícitos.
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-agent-reliability.css" />
<script src="/assets/javascripts/tools/agent-reliability-core.js" defer></script>
<script src="/assets/javascripts/tools/agent-reliability.js" defer></script>

<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Fiabilidad y evaluación de agentes — 5sigmas","url":"https://5sigmas.com/herramientas/fiabilidad-evaluacion-agentes/","applicationCategory":"DeveloperApplication","operatingSystem":"Any","isAccessibleForFree":true,"description":"Playground para evaluar el resultado y las señales observables de la trayectoria de un agente con criterios de publicación explícitos."}</script>

<div class="s5-landing s5-tool-page s5-agent-reliability" data-s5-agent-reliability data-locale="es">
<section class="s5-page-intro"><div class="s5-eyebrow">Herramientas · Agentes · 11</div><h1>Evalúa si un agente resuelve la tarea y si su trayectoria es fiable.</h1><p>Un resultado correcto puede esconder una llamada a herramienta incorrecta, demasiados reintentos o un camino frágil. El playground separa el resultado final, las decisiones observables de la traza y los fallos operativos, y los compara con criterios de publicación que tú defines.</p></section>
<div class="s5-tool-summary-strip"><div><small>Resultado</small><strong>éxito final, primer intento y recuperación</strong></div><div><small>Traza</small><strong>herramientas correctas, omisiones, pasos y reintentos</strong></div><div><small>Operación</small><strong>timeouts, política y proyección</strong></div></div>

<div class="s5-tool-workbench">
<form class="s5-tool-controls" aria-label="Escenario de evaluación de agentes" onsubmit="return false">
<section class="s5-tool-controls__section"><h2>Resultado por tarea</h2><div class="s5-tool-field-grid">
<div class="s5-tool-field"><label>Tareas evaluadas</label><input data-field="tasks" type="number" min="0" step="10" value="200" /></div>
<div class="s5-tool-field"><label>Éxitos al primer intento</label><input data-field="firstPassSuccesses" type="number" min="0" step="1" value="148" /></div>
<div class="s5-tool-field"><label>Tareas que necesitaron reintento</label><input data-field="retryingTasks" type="number" min="0" step="1" value="42" /></div>
<div class="s5-tool-field"><label>Tareas recuperadas tras reintentar</label><input data-field="retryRecoveredTasks" type="number" min="0" step="1" value="24" /></div>
<div class="s5-tool-field"><label>Reintentos adicionales totales</label><input data-field="totalRetryAttempts" type="number" min="0" step="1" value="58" /></div>
</div></section>
<section class="s5-tool-controls__section"><h2>Herramientas y trayectoria</h2><div class="s5-tool-field-grid">
<div class="s5-tool-field"><label>Decisiones de herramienta esperadas</label><input data-field="expectedToolDecisions" type="number" min="0" step="10" value="520" /></div>
<div class="s5-tool-field"><label>Decisiones correctas</label><input data-field="correctToolDecisions" type="number" min="0" step="1" value="487" /></div>
<div class="s5-tool-field"><label>Herramienta equivocada / argumentos inválidos</label><input data-field="wrongToolDecisions" type="number" min="0" step="1" value="18" /><small>El resto se interpreta como una decisión requerida que el agente omitió.</small></div>
<div class="s5-tool-field"><label>Pasos observables totales</label><input data-field="totalAgentSteps" type="number" min="0" step="10" value="1360" /></div>
<div class="s5-tool-field"><label>Pasos innecesarios según la rúbrica</label><input data-field="unnecessarySteps" type="number" min="0" step="1" value="170" /></div>
</div></section>
<section class="s5-tool-controls__section"><h2>Operación y tráfico</h2><div class="s5-tool-field-grid">
<div class="s5-tool-field"><label>Tareas con timeout</label><input data-field="timeoutTasks" type="number" min="0" step="1" value="9" /><small>Puede solaparse con otros fallos; no se suma a la tasa de fallo.</small></div>
<div class="s5-tool-field"><label>Tareas con incumplimiento de política</label><input data-field="policyViolationTasks" type="number" min="0" step="1" value="3" /><small>No cuentes bloqueos correctos de los guardrails como incumplimientos.</small></div>
<div class="s5-tool-field"><label>Tráfico mensual proyectado</label><input data-field="monthlyTasks" type="number" min="0" step="1000" value="100000" /></div>
</div></section>
<section class="s5-tool-controls__section"><h2>Criterios de publicación</h2><div class="s5-tool-field-grid">
<div class="s5-tool-field"><label>Éxito final mínimo (%)</label><input data-field="minFinalSuccessPercent" type="number" min="0" max="100" step="0.5" value="85" /></div>
<div class="s5-tool-field"><label>Primer intento mínimo (%)</label><input data-field="minFirstPassPercent" type="number" min="0" max="100" step="0.5" value="70" /></div>
<div class="s5-tool-field"><label>Decisión de herramienta mínima (%)</label><input data-field="minToolDecisionPercent" type="number" min="0" max="100" step="0.5" value="95" /></div>
<div class="s5-tool-field"><label>Timeout máximo (%)</label><input data-field="maxTimeoutPercent" type="number" min="0" max="100" step="0.5" value="5" /></div>
<div class="s5-tool-field"><label>Incumplimiento de política máximo (%)</label><input data-field="maxPolicyViolationPercent" type="number" min="0" max="100" step="0.1" value="1" /></div>
<div class="s5-tool-field"><label>Pasos innecesarios máximos (%)</label><input data-field="maxUnnecessaryStepPercent" type="number" min="0" max="100" step="0.5" value="15" /></div>
</div><p class="s5-agent-note">Los criterios comparan estimaciones puntuales. Los intervalos del 95% se muestran por separado y no se usan para aprobar automáticamente una versión.</p><div class="s5-tool-actions"><button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button><button class="s5-tool-action" type="button" data-action="export">Exportar JSON</button><button class="s5-tool-action" type="button" data-action="reset">Restablecer</button></div><p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p></section>
</form>

<section class="s5-tool-results" aria-live="polite">
<div class="s5-tool-kpis s5-agent-kpis"><div class="s5-tool-kpi"><small>Éxito final</small><strong data-output="finalSuccess">—</strong><span data-output="finalSuccessCi">—</span></div><div class="s5-tool-kpi"><small>Primer intento</small><strong data-output="firstPass">—</strong><span>sin reintento</span></div><div class="s5-tool-kpi"><small>Decisiones de herramienta correctas</small><strong data-output="toolAccuracy">—</strong><span data-output="toolAccuracyCi">—</span></div><div class="s5-tool-kpi"><small>Recuperación tras reintento</small><strong data-output="retryRecovery">—</strong><span>sobre tareas reintentadas</span></div></div>
<div class="s5-agent-incidence"><div><small>Timeouts</small><strong data-output="timeoutRate">—</strong></div><div><small>Política</small><strong data-output="policyRate">—</strong></div><div><small>Herramienta omitida</small><strong data-output="missedToolRate">—</strong></div><div><small>Pasos innecesarios</small><strong data-output="unnecessaryRate">—</strong></div></div>
<div class="s5-agent-ops"><div><small>Pasos por tarea</small><strong data-output="stepsPerTask">—</strong></div><div><small>Multiplicador de intentos</small><strong data-output="attemptMultiplier">—</strong></div><div><small>No agregamos</small><strong>fallos ≠ suma de incidencias</strong></div><div><small>Unidad</small><strong>tarea + traza observable</strong></div></div>
<section class="s5-agent-gates"><div class="s5-agent-gates__head"><h2>Criterios de publicación</h2><span class="s5-agent-gates__summary" data-output="gateSummary">—</span></div>
<div class="s5-agent-gate" data-gate="finalSuccess"><strong>Éxito final</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="firstPass"><strong>Primer intento</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="toolDecision"><strong>Decisión de herramienta</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="timeouts"><strong>Timeouts</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="policyViolations"><strong>Política</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="unnecessarySteps"><strong>Pasos innecesarios</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div></section>
<section class="s5-agent-projection"><div class="s5-agent-projection__top"><div><small data-output="monthlyTasks">—</small><strong data-output="monthlyFailures">—</strong><p class="s5-agent-projection__range" data-output="monthlyFailureRange">—</p></div></div><div class="s5-agent-projection__incidence"><div><span>Timeouts esperados</span><strong data-output="monthlyTimeouts">—</strong></div><div><span>Incumplimientos esperados</span><strong data-output="monthlyPolicy">—</strong></div></div></section>
<p class="s5-agent-note"><strong>Límite:</strong> la proyección supone una distribución futura similar a la muestra evaluada. El rango de fallos procede del intervalo Wilson del éxito final; no modela cambios en la distribución de datos ni dependencia entre tareas.</p>
</section></div>

<section class="s5-section"><div class="s5-section-head"><h2>Resultado y trayectoria responden preguntas distintas</h2></div><div class="s5-agent-method-grid"><div><strong>Estado final</strong><p>τ-bench evalúa el estado final del entorno frente a un objetivo anotado.</p></div><div><strong>Traza observable</strong><p>La elección de herramienta, sus argumentos, los reintentos, los handoffs y los pasos ayudan a localizar la causa del resultado. OpenAI denomina <em>trace grading</em> a esta evaluación estructurada de la trayectoria.</p></div><div><strong>Consistencia</strong><p>Para medir consistencia necesitas repetir varias veces la misma tarea. No reconstruimos pass^k a partir de una única tasa de éxito.</p></div></div></section>
<section class="s5-section"><div class="s5-note-feature"><div><div class="s5-eyebrow">Fuentes</div><h2>Sin score compuesto oculto.</h2><p>Los criterios son configurables y no se presentan como umbrales universales.</p></div><div class="s5-note-feature__meta"><a href="https://platform.openai.com/docs/guides/trace-grading">OpenAI · Trace grading</a><br /><a href="https://arxiv.org/abs/2406.12045">τ-bench</a><br /><a href="https://arxiv.org/abs/2308.03688">AgentBench</a><br />Revisado: 21-08-2026</div></div></section>
</div>
