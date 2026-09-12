---
title: "Qué evaluar: modelo, componente, sistema, workflow y trayectoria"
description: "Cómo elegir la frontera correcta de evaluación en sistemas de IA, separar diagnóstico local de evidencia end-to-end y evitar atribuir al modelo fallos o mejoras que pertenecen al workflow, a componentes o al sistema completo."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "evaluación de sistemas de IA, evals, model eval, component eval, system eval, workflow eval, trajectory eval, agent evals, trace grading"
tags:
  - IA
  - Evaluación
  - Agentes
  - Producción
  - Reliability
---

# Capítulo 1 — Qué evaluar: modelo, componente, sistema, workflow y trayectoria

Cuando un sistema de IA falla, la primera pregunta no debería ser «¿qué benchmark usamos?». Debería ser **«¿qué frontera contiene la hipótesis que queremos comprobar?»**.

Si hemos cambiado el modelo, quizá necesitemos aislar el comportamiento del modelo. Si hemos cambiado el retriever, necesitamos medir el retriever. Si hemos cambiado la política que decide cuándo consultar una herramienta, el objeto relevante es el workflow. Y si el problema sólo aparece después de varias llamadas, reintentos y mutaciones de estado, una evaluación de una única respuesta del modelo no contiene el mecanismo que queremos observar.

Esta distinción es importante porque una puntuación sólo describe aquello que el harness realmente ejecutó y midió. NIST mantiene hoy dos ejemplos complementarios de esa idea: **AITE** usa un entorno de test sequestered para evaluar rendimiento de modelos sobre datos ciegos, mientras **TEVV-Athlon** se formula como un marco adaptable para evaluar sistemas de IA y sus resultados en contexto real.[^nist-aite][^nist-tevv] No son dos nombres para la misma frontera.

{{ include_html("snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html") }}

## La evaluación empieza definiendo el objeto, no la métrica

Podemos describir de forma compacta un sistema de IA como:

\[
(o, \tau, s_f)
=
S(x, e; M, C, \pi)
\]

Donde:

- `x` es la tarea o input;
- `e` es el entorno: datos, herramientas, permisos, estado inicial, red y dependencias;
- `M` es el modelo o conjunto de modelos;
- `C` representa componentes como retrievers, rerankers, parsers, guardrails o tool adapters;
- `π` es la política de workflow que decide qué hacer, en qué orden y bajo qué condiciones;
- `τ` es la **trayectoria realizada**: mensajes, decisiones, tool calls, observaciones, reintentos y transiciones de estado;
- `o` es el resultado observable y `s_f` el estado final relevante.

La ecuación no pretende imponer una arquitectura. Sirve para localizar qué variable hemos cambiado y qué parte debe mantenerse fija si queremos atribuirle un efecto.

Una evaluación útil debe responder al menos cuatro preguntas:

1. **Objeto:** ¿qué estamos evaluando exactamente?
2. **Frontera:** ¿qué queda dentro y fuera del sistema bajo test?
3. **Evidencia:** ¿qué observamos: output, estado final, trayectoria, latencia, coste, seguridad?
4. **Atribución:** ¿qué conclusión permite esa frontera y cuál no?

MLPerf formaliza esta disciplina en otro dominio con el concepto **System Under Test (SUT)**: hardware y software medidos se declaran como una frontera concreta y el escenario de carga forma parte del benchmark.[^mlperf-rules] En sistemas generativos necesitamos la misma precisión, aunque la frontera pueda incluir lógica agentic, herramientas y estado mutable.

## Nivel 1 — Evaluar el modelo

Una **model eval** intenta medir el comportamiento del modelo bajo un harness controlado.

Ejemplos:

- respuesta correcta a una pregunta con prompt fijo;
- extracción estructurada con un schema concreto;
- clasificación sobre un dataset etiquetado;
- generación de código cuando el harness, tools y entorno están fijados.

La forma conceptual es:

\[
\text{score}_{model}
=
G(M(x; c, d), y^*)
\]

con `c` como contexto/prompt, `d` como decoding/configuración y `G` como grader.

La ventaja es diagnóstica: si mantenemos `c`, `d`, dataset y grader constantes, podemos comparar dos modelos con bastante aislamiento.

La limitación es igual de importante: **el resultado no describe automáticamente el producto**. Un modelo mejor en esa frontera puede empeorar el sistema si aumenta latencia, rompe un formato que asumía un parser, cambia patrones de tool calling o interactúa peor con el workflow.

Incluso benchmarks etiquetados como «agentic» suelen fijar un harness concreto. Las model cards actuales de Google DeepMind, por ejemplo, publican resultados de Terminal-bench junto al harness usado; ese detalle forma parte de la configuración evaluada, no es decoración metodológica.[^gemini-card]

### Qué puede concluir una model eval

Puede apoyar afirmaciones como:

> Con este dataset, prompt, tools/harness, configuración de inferencia y grader, el modelo B supera al modelo A en la métrica definida.

No permite concluir sin más:

> El sistema de producción será mejor con B.

Para esa segunda afirmación necesitamos ampliar la frontera.

## Nivel 2 — Evaluar un componente

Un **component eval** aísla una pieza que transforma una entrada en una salida usada por el resto del sistema.

Ejemplos típicos:

- retriever: query → documentos;
- reranker: candidatos → orden;
- clasificador de intención: mensaje → clase;
- parser: texto → estructura;
- guardrail: input/output → allow/block/label;
- tool adapter: llamada lógica → request/response normalizados.

Si estamos cambiando el retriever, medir sólo la respuesta final del agente puede ocultar el mecanismo. Un fallo de retrieval puede ser compensado por el modelo en algunos casos y amplificado en otros.

Una frontera de componente permite métricas específicas. Para retrieval, por ejemplo:

\[
Recall@k = \frac{|R_k \cap R^*|}{|R^*|}
\]

pero **un Recall@k mayor no demuestra por sí solo mayor éxito del sistema**. Puede traer más evidencia relevante y también más ruido, aumentar contexto, coste o latencia, o cambiar el comportamiento downstream.

La práctica correcta es doble:

1. usar la component eval para saber si el cambio mejora el mecanismo local que pretendíamos mejorar;
2. confirmar en una frontera mayor que esa mejora sobrevive al resto del sistema.

## Nivel 3 — Evaluar el workflow

El **workflow** es la política que conecta componentes y decide el camino: qué modelo usar, cuándo llamar una herramienta, cuándo pedir aclaración, cuándo reintentar, cuándo escalar y cuándo terminar.

Dos sistemas con el mismo modelo y las mismas tools pueden comportarse de forma muy diferente si cambia `π`.

Por ejemplo:

```text
request
  ↓
classify intent
  ↓
retrieve policy
  ↓
model decides action
  ├─ answer
  ├─ call tool
  └─ escalate
```

Cambiar un timeout, una condición de retry o la regla de escalado es un cambio de workflow aunque el modelo sea idéntico.

Una workflow eval pregunta cosas como:

- ¿selecciona la rama correcta?
- ¿invoca la herramienta sólo cuando corresponde?
- ¿respeta un máximo de reintentos?
- ¿preserva invariantes de estado entre pasos?
- ¿termina correctamente?
- ¿recupera una dependencia fallida sin repetir efectos no idempotentes?

OpenAI describe hoy **trace grading** precisamente como evaluación end-to-end de workflows agentic para localizar puntos débiles a lo largo de la ejecución.[^openai-agentkit] Esa capacidad no convierte automáticamente cualquier trace score en una medida del producto completo; la frontera sigue dependiendo de qué entorno, herramientas y grader ejecutemos.

## Nivel 4 — Evaluar la trayectoria

Una **trayectoria** no es otro nombre para workflow.

- El **workflow** describe las reglas o política que pueden generar muchos caminos.
- La **trayectoria** `τ` es el camino concreto que ocurrió en un trial.

Anthropic define transcript/trace/trajectory como el registro completo de un trial, incluyendo outputs, tool calls, razonamiento disponible, resultados intermedios e interacciones; distingue además esa trayectoria del **outcome**, el estado final del entorno.[^anthropic-evals]

Podemos escribir:

\[
\tau_i
=
(a_1, o_1, a_2, o_2, \ldots, a_T, o_T)
\]

para un trial `i`.

Evaluar `τ` sirve para preguntas que el resultado final no responde:

- ¿se llamó una herramienta prohibida aunque el resultado final fuese correcto?
- ¿hubo cinco retries innecesarios antes de lograr éxito?
- ¿se expuso información sensible en un paso intermedio?
- ¿se canceló una acción o sólo se dejó de mostrar su salida?
- ¿el agente llegó al resultado por una ruta frágil que fallará ante una pequeña perturbación?

Pero el error inverso también es común: **una trayectoria «bonita» no demuestra éxito**.

Un agente puede emitir el mensaje «reserva completada» y seguir una secuencia aparentemente razonable, mientras la base de datos no contiene ninguna reserva. Por eso Anthropic separa explícitamente transcript/trajectory de outcome y recomienda inspeccionar ambos.[^anthropic-evals]

### Resultado y trayectoria responden preguntas diferentes

Podemos tener cuatro casos:

| Outcome | Trayectoria | Interpretación |
|---|---|---|
| correcto | correcta | éxito limpio |
| correcto | problemática | éxito con deuda/riesgo oculto |
| incorrecto | razonable | posible fallo de tool, entorno o grader; investigar |
| incorrecto | problemática | fallo visible y mecanismo candidato |

No conviene convertir esta tabla en una única puntuación demasiado pronto. Primero necesitamos saber qué dimensión está fallando.

## Nivel 5 — Evaluar el sistema

Una **system eval** incluye la frontera que realmente entrega el comportamiento que nos importa.

Puede abarcar:

- gateway y autenticación;
- prompt/context assembly;
- modelo(s);
- retrieval;
- workflow/orquestación;
- tools y servicios externos;
- estado persistente;
- retries y timeouts;
- guardrails;
- formato/render del resultado;
- latencia, coste y límites operativos relevantes.

La pregunta ya no es «¿el modelo contestó bien?», sino, por ejemplo:

> ¿Puede el sistema resolver correctamente una devolución, respetar política y permisos, producir el estado final correcto, mantenerse dentro del SLO y no ejecutar efectos duplicados?

TEVV-Athlon de NIST se orienta precisamente a evaluaciones adaptadas al sistema, objetivo y contexto de uso, y cubre desde modelos estadísticos hasta LLMs, sistemas multimodales y sistemas agentic.[^nist-tevv]

La ventaja de la frontera end-to-end es **validez para el producto**. La desventaja es **atribución**: si la tasa de éxito cae, el fallo puede venir del modelo, retriever, tool, red, política de retry, datos o grader.

Por eso una system eval no sustituye las evals estrechas. Las conecta.

## La regla central: frontera estrecha para diagnosticar; frontera amplia para confirmar

Una práctica útil es elegir la **frontera más estrecha que todavía contiene el mecanismo que hemos cambiado** y después confirmar el resultado en la frontera mayor donde vive el riesgo real.

Podemos expresarlo así:

\[
B_{diagnostic}
=\min\{B : \Delta \subseteq B \land B\text{ observa el efecto esperado}\}
\]

Y después exigir:

\[
\Delta U_{product}\mid B_{system} > 0
\]

si afirmamos que el cambio mejora el producto.

La notación sólo dice:

1. no uses una evaluación end-to-end para diagnosticar algo que puedes aislar mejor;
2. no uses una evaluación aislada para afirmar impacto de producto que no has medido.

## Atribución causal: cambiar una cosa y mantener el resto fijo

Supongamos que queremos saber si sustituir `M_A` por `M_B` mejora un agente.

Una comparación útil mantiene constantes:

- task set y distribución;
- prompts/context assembly;
- workflow;
- tools y versiones;
- estado inicial del entorno;
- límites de tiempo;
- graders;
- número de trials y configuración de sampling.

Y cambia únicamente el modelo.

Entonces podemos estimar un delta dentro de ese harness:

\[
\Delta_{model\mid harness}
=
E[G(S_{M_B})]-E[G(S_{M_A})]
\]

La condición `| harness` es importante. El resultado pertenece a **ese sistema controlado**.

Si al mismo tiempo cambiamos modelo, prompt, retriever y retry policy, una mejora de +8 puntos de éxito es una mejora del **stack comparado**, no una estimación del efecto causal del modelo.

Este error aparece a menudo en benchmarks de agentes. El propio portal de OpenAI Evals señala en GDPval que más contexto, razonamiento y scaffolding pueden cambiar el rendimiento observado; por tanto, el scaffold es parte material del setup evaluado.[^openai-evals]

## Tres cambios reales y la frontera correcta

### Caso A — Cambiar de modelo en un asistente de soporte

Hipótesis: un modelo nuevo entiende mejor políticas ambiguas.

Secuencia útil:

1. **model/component eval** con casos de interpretación de política y contexto fijo;
2. comparación pareada dentro del mismo harness;
3. **system eval** del flujo completo de soporte;
4. lectura de trajectories cuando el outcome cambia.

No basta con un benchmark general del modelo.

### Caso B — Cambiar el retriever

Hipótesis: el nuevo retriever encuentra evidencia más relevante.

Secuencia útil:

1. component eval de retrieval con queries y relevancia etiquetada;
2. medir cobertura, ranking y coste/latencia local;
3. ejecutar el mismo sistema con `retriever_A` y `retriever_B`;
4. comprobar outcome, groundedness y regressions.

Si mejora Recall@k pero baja task success, la component eval y la system eval **no se contradicen**: están midiendo niveles distintos.

### Caso C — Añadir retries a una tool inestable

Hipótesis: retry mejora reliability.

La pregunta no es de modelo.

Necesitamos evaluar:

- workflow: cuándo y cuántas veces reintenta;
- trajectory: si el retry ocurre después de una acción posiblemente aplicada;
- system/outcome: si se duplican efectos o se recupera correctamente;
- operación: latencia y coste añadidos.

Una tasa mayor de tool-call success puede ocultar un problema grave si también aumenta los efectos duplicados.

## Un mapa operativo de fronteras

| Frontera | Pregunta que responde bien | Mantener fijo | Señal principal | No demuestra por sí sola |
|---|---|---|---|---|
| Modelo | ¿cambió la capacidad/comportamiento del modelo bajo un harness? | prompt, dataset, config, grader, harness | output/score | calidad del producto |
| Componente | ¿mejoró este módulo local? | contratos upstream/downstream | métrica específica del módulo | éxito end-to-end |
| Workflow | ¿la política/orquestación toma buenas decisiones? | modelos, tools, entorno si buscamos aislarla | branches, retries, stops, invariants | estado final correcto en producción |
| Trayectoria | ¿qué ocurrió en este trial y por qué? | no aplica como «componente»; es evidencia realizada | acciones, observaciones, estados | distribución de rendimiento global |
| Sistema | ¿el producto resuelve la tarea bajo condiciones representativas? | versión completa del stack y entorno documentados | outcome + SLO + seguridad/coste | causa exacta de una regresión |

## El anti-patrón: una única «eval score» para todo

Reducir todo a un número facilita dashboards y dificulta el diagnóstico.

Imaginemos:

```text
system_success = 91%
```

Sin más contexto no sabemos:

- si falla siempre el mismo componente;
- si una tool externa domina la varianza;
- si el modelo toma malas decisiones;
- si el grader está roto;
- si hay outcome correcto con trayectorias inseguras;
- si la mejora viene acompañada de 2× coste o latencia.

Una suite madura suele necesitar **métricas acopladas a fronteras distintas**, no una puntuación universal.

Anthropic recomienda combinar outcome grading con inspección de transcripts y advierte que un harness, task o grader defectuoso puede producir puntuaciones engañosas.[^anthropic-evals] Esa observación convierte el diseño de la evaluación en parte del sistema de ingeniería, no en una capa posterior de reporting.

## El trial también es una unidad de evidencia

Los sistemas generativos son estocásticos. Una task no equivale necesariamente a una observación.

Anthropic distingue **task** de **trial**: cada intento es un trial, y múltiples trials permiten estimar consistencia.[^anthropic-evals]

Si una tarea tiene probabilidad de éxito `p`, observar una sola ejecución produce una variable Bernoulli con mucha varianza. Para comparar cambios pequeños necesitamos repeticiones suficientes y reportar distribución/incertidumbre, no seleccionar la trayectoria que mejor confirma nuestra hipótesis.

Esto será central en capítulos posteriores sobre datasets, jueces, agreement y gates de regresión. Aquí importa por una razón: **la frontera correcta no arregla un protocolo estadístico débil**.

## Qué registrar en cada evaluación

Como mínimo, un resultado reproducible debería identificar:

```text
eval_scope: model | component | workflow | system
task_id / dataset_version
trial_id / seed where meaningful
model + revision
prompt/context/policy version
component versions
tool/environment versions
initial state
sampling/reasoning config
timeouts/retry policy
graders + versions
trajectory reference
outcome/state checks
latency/cost counters
```

`trajectory` aparece como evidencia, no como sustituto de `outcome`.

La lista exacta dependerá del sistema, pero la regla es estable: **si una variable podría explicar el resultado, debe estar fijada, registrada o tratada explícitamente como fuente de variación**.

## Checklist de decisión

Antes de ejecutar una eval, responde en este orden:

1. **¿Qué cambio o riesgo quiero medir?**
2. **¿En qué frontera aparece por primera vez su mecanismo?**
3. **¿Qué variables debo mantener constantes para atribuir el efecto?**
4. **¿Qué outcome o estado representa éxito real?**
5. **¿Necesito inspeccionar la trayectoria para entender seguridad, eficiencia o recuperación?**
6. **¿Qué frontera mayor debe confirmar que el cambio no rompe el producto?**
7. **¿Cuántos trials necesito para no confundir variación con regresión?**

Si no podemos responder a la primera pregunta, todavía no necesitamos un benchmark. Necesitamos definir la hipótesis.

## Implicación de producción

La arquitectura de evaluación debería parecerse a una jerarquía de pruebas de software:

- evals estrechas y rápidas para modelo/componentes;
- evals de workflow para lógica y transiciones;
- análisis de trajectory para explicar mecanismos;
- evals end-to-end para outcome, SLO, coste y riesgos reales;
- producción como fuente de nuevos casos, no como sustituto de la evaluación controlada.

La decisión importante no es escoger un único nivel. Es **conectar niveles sin mezclar sus conclusiones**.

Cuando una system eval falla, bajamos de frontera hasta localizar el mecanismo. Cuando una eval estrecha mejora, subimos de frontera hasta demostrar que la mejora importa al usuario.

Ese movimiento —**diagnosticar estrecho, confirmar amplio**— será la base del resto de la serie.

## Referencias

[^nist-aite]: NIST, *Announcing NIST's Artificial Intelligence Technology Evaluation (AITE)*, 27 Jul 2026. https://www.nist.gov/news-events/news/2026/07/announcing-nists-artificial-intelligence-technology-evaluation-aite
[^nist-tevv]: NIST, *The TEVV-Athlon Framework for Evaluating AI Systems*, initial public draft announced 7 Aug 2026. https://www.nist.gov/artificial-intelligence/ai-research/tevv-athlon-framework-evaluating-ai-systems
[^mlperf-rules]: MLCommons, *MLPerf Inference Rules*, definitions of System Under Test, run and scenarios. https://github.com/mlcommons/inference_policies/blob/master/inference_rules.adoc
[^anthropic-evals]: Anthropic Engineering, *Demystifying evals for AI agents*, 9 Jan 2026. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[^openai-agentkit]: OpenAI, *Introducing AgentKit*, 6 Oct 2025; Evals section documents datasets and Trace Grading for end-to-end agentic workflows. https://openai.com/index/introducing-agentkit/
[^openai-evals]: OpenAI Evals, *GDPval*. https://evals.openai.com/
[^gemini-card]: Google DeepMind, *Gemini 3.5 Flash model card*, evaluation table and methodology notes including named harnesses for agentic benchmarks. https://deepmind.google/models/model-cards/gemini-3-5-flash/
