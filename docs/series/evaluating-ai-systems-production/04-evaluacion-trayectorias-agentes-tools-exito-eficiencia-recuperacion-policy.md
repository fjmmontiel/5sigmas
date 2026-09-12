---
title: "Evaluación de trayectorias de agentes y tools: éxito, eficiencia, recuperación y cumplimiento de política"
description: "Cómo evaluar un agente más allá del resultado final: tool selection, argumentos, side effects, retries, recuperación, stop conditions, eficiencia y cumplimiento de política."
date: 2026-09-13
date_modified: 2026-09-13
keywords: "agent evaluation, trajectory evaluation, tool calls, policy compliance, recovery, retries, efficiency, agent traces, outcome evaluation"
tags:
  - IA
  - Evaluación
  - Agentes
  - Reliability
  - Producción
---

# Capítulo 4 — Evaluación de trayectorias de agentes y tools: éxito, eficiencia, recuperación y cumplimiento de política

Un agente puede terminar con el resultado correcto y haber seguido un camino inaceptable.

Puede procesar bien un reembolso después de saltarse una aprobación obligatoria. Puede crear una reserva, recibir un timeout y repetir el mismo write, dejando dos reservas. Puede resolver una tarea y seguir llamando tools porque no detectó que ya había terminado.

También ocurre el error contrario: una evaluación puede penalizar una trayectoria perfectamente válida sólo porque no coincide con la secuencia de acciones que escribió el autor del benchmark.

La pregunta de este capítulo es:

> **¿Cómo evaluamos la trayectoria de un agente sin confundir éxito final, proceso correcto, recuperación y eficiencia?**

La respuesta exige dos objetos de evidencia distintos:

1. **outcome**: el estado terminal que produjo el sistema;
2. **trajectory**: la secuencia observada de decisiones, tool calls, resultados, cambios de estado y recuperación que llevó hasta ese outcome.

Anthropic distingue explícitamente ambos objetos en su guía de evals para agentes: el transcript o trajectory contiene la ejecución completa, mientras que el outcome es el estado final del entorno. Sus graders pueden inspeccionar uno, otro o ambos.[^anthropic-evals] Esa separación es fundamental porque una sola tasa de éxito no explica cómo se produjo el éxito.

{{ include_html("snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html") }}

## Una trayectoria es una secuencia de transiciones, no una lista de tool names

Para razonar sobre una ejecución podemos representar cada paso como:

\[
e_t = (o_t, d_t, a_t, r_t, s_{t+1})
\]

donde:

- `o_t` es la observación disponible antes de actuar;
- `d_t` es la decisión del agente;
- `a_t` es la acción ejecutada, por ejemplo un tool call o una respuesta;
- `r_t` es el resultado observado de esa acción;
- `s_{t+1}` es el estado real después de la transición.

La trayectoria completa es:

\[
\tau = (e_1, e_2, \ldots, e_T)
\]

y el outcome terminal puede verse como una función del estado final:

\[
y(\tau) = g(s_{T+1})
\]

Esta notación no afirma que debamos puntuar cada pensamiento interno del modelo. En producción nos interesa registrar los **eventos observables que afectan la decisión o el mundo**: inputs relevantes, tool calls, argumentos, autorizaciones, resultados, errores, side effects, retries, handoffs, cambios de estado y condición de parada.

El Agents SDK de OpenAI, por ejemplo, puede registrar una ejecución end-to-end como una trace compuesta por spans de agente, turnos, generaciones, function tools, guardrails y handoffs.[^openai-tracing] Eso es una capacidad de observabilidad del framework. **Tener una trace no significa que la trayectoria sea correcta.** La trace sólo crea el material que después podemos verificar.

## Empieza por el outcome: ¿la tarea terminó realmente resuelta?

Cuando el resultado puede comprobarse directamente, el primer grader debería inspeccionar el estado real.

Ejemplos:

- la reserva existe en la base de datos con fechas y usuario correctos;
- el ticket quedó en el estado esperado;
- el archivo producido pasa tests deterministas;
- el pedido fue cancelado exactamente una vez;
- el mensaje al usuario contiene la información contractual obligatoria.

Una variable binaria simple puede ser:

\[
S_i = \mathbf{1}[\text{terminal assertions satisfied for trial } i]
\]

Esto mide **task success**, no policy compliance ni calidad de recuperación.

La documentación actual de τ-bench/τ² ilustra bien la diferencia. Para sus dominios principales, una secuencia de `actions` describe una trayectoria de referencia que se usa para construir un estado objetivo; el agente puede tomar otra ruta y recibir éxito completo si produce un estado de base de datos equivalente y cumple los requisitos de comunicación.[^tau-evaluation] El repo avisa expresamente de que comparar tool calls con esa única trayectoria es una señal de similitud, no un veredicto general de corrección.

La implicación es importante:

> **si múltiples trayectorias pueden resolver legítimamente la tarea, el outcome debe evaluarse por invariantes del resultado, no por imitación de una secuencia concreta.**

## Después evalúa las decisiones que sí importan durante el camino

No toda diferencia de trayectoria es relevante.

Leer primero el perfil del usuario y después la reserva puede ser equivalente a hacerlo al revés. Saltarse una aprobación antes de un write no lo es.

La evaluación debe distinguir **libertad de planificación** de **invariantes obligatorios**.

### Selección de tool

Pregunta si la acción era compatible con el objetivo y el estado disponible.

Ejemplos:

- usar una tool de lectura antes de una decisión irreversible cuando falta una precondición;
- no llamar una tool de write cuando el usuario sólo pidió información;
- seleccionar el endpoint correcto entre varias operaciones parecidas.

Un check exacto funciona cuando la selección correcta es única. Si existen varias rutas válidas, el grader debe reconocer equivalencia o verificar consecuencias, no comparar contra un único nombre esperado.

### Argumentos y precondiciones

Un tool correcto con argumentos equivocados sigue siendo un fallo.

Registra al menos:

```text
tool_name
arguments
schema/version
preconditions observed
principal / tenant / resource scope
approval state if required
idempotency or transaction identifier if relevant
```

La corrección puede dividirse en:

- schema válido;
- tipos y formatos correctos;
- entidad correcta;
- valores semánticamente correctos;
- autorización y scope correctos.

No mezcles esas dimensiones en un único `tool_call_pass` si necesitas diagnosticar el mecanismo del error.

### Side effects

Para un tool que modifica estado, el evento importante no termina en «API devolvió 200».

Necesitamos conocer:

```text
intent to write
→ authorization / preconditions
→ request sent
→ external result observed
→ actual side effect / state
→ reconciliation if acknowledgement is ambiguous
```

Una respuesta de red y el estado real pueden divergir. Esa diferencia se vuelve crítica durante retries.

## Policy compliance debe ser no compensatorio cuando la política es dura

Supongamos que el agente obtiene el resultado correcto pero expone información de otro tenant o ejecuta una operación sin aprobación.

Un promedio como:

```text
0.8 * task_success + 0.2 * policy_score
```

permitiría que un buen resultado compensase una violación grave. Si la política representa una frontera de seguridad, legalidad o autorización, ese diseño es incorrecto.

Un gate más apropiado es:

\[
G_i = H_i \land S_i
\]

con `H_i = 1` sólo si se cumplen todos los invariantes duros aplicables.

Después de ese gate podemos comparar calidad o eficiencia entre los casos válidos.

Ejemplos de invariantes duros:

- no ejecutar un write sin autorización requerida;
- no cruzar tenant boundaries;
- no enviar secretos a una tool no permitida;
- no confirmar una acción que el backend rechazó;
- no repetir un side effect no idempotente sin reconciliar primero el estado.

El trabajo de *Procedure-Aware Evaluation* formaliza precisamente el riesgo de «corrupt success»: tareas que parecen exitosas por outcome pero esconden fallos de procedimiento.[^procedure-aware] Sus cifras pertenecen a su benchmark y setup; aquí usamos el paper para justificar la separación conceptual, no para trasladar porcentajes a otro producto.

## Recovery no es contar retries

Un retry puede ser una recuperación correcta o puede empeorar el incidente.

Necesitamos primero clasificar qué ocurrió.

Un evento de fallo útil registra:

```text
failure_class: timeout | transport | provider | tool_error | policy_denial | parse | unknown
side_effect_status: not_started | definitely_applied | definitely_not_applied | unknown
retryable_under_policy: true | false
state_reconciled_before_retry: true | false | not_applicable
recovery_action: retry | cancel | fallback | human | stop
recovery_outcome: recovered | unrecovered | corrupted
```

### El caso peligroso: timeout después de un write

Imagina:

```text
create_refund(...)
→ backend aplica el reembolso
→ la respuesta se pierde
→ cliente observa timeout
```

Si el agente interpreta `timeout == no ocurrió` y repite la llamada, puede duplicar el side effect.

La trayectoria correcta depende del contrato del sistema:

```text
timeout ambiguo
→ consultar estado / usar idempotency key / reconciliar transacción
→ sólo después decidir retry, cancel o escalado
```

Por eso **recovery** incluye detección, clasificación y reconciliación, no sólo reintentar.

Para fallos recuperables declarados, una métrica descriptiva puede ser:

\[
R_{rec} = \frac{N_{recovered}}{N_{recoverable\ failures\ observed}}
\]

El denominador debe estar definido. No compares `R_rec` entre sistemas si uno expone más fallos al grader o usa otra taxonomía.

También reporta los fallos que se volvieron corrupción de estado. Un 100% de «retry success» puede ocultar duplicados si el grader sólo observa la respuesta final.

## Stop conditions: acabar bien también significa saber parar

Una trayectoria puede fallar porque termina demasiado pronto o porque no termina cuando debería.

Dos clases distintas:

### Premature stop

El agente declara éxito aunque falte una condición terminal.

Ejemplo: responde «reserva confirmada» después de generar una propuesta, sin evidencia de que el backend haya creado la reserva.

### Post-success overrun

La tarea ya está resuelta pero el agente continúa ejecutando acciones.

Podemos definir, para tareas donde existe un primer estado inequívocamente terminal:

\[
O_i = \#\{a_t: t > t_i^*\}
\]

con `t_i^*` como el primer instante en que las condiciones terminales quedan satisfechas.

`O_i > 0` no es automáticamente malo. Puede existir una acción de verificación obligatoria posterior. El contrato debe declarar qué acciones post-éxito siguen siendo necesarias.

La utilidad de la métrica es detectar loops, writes tardíos y consumo innecesario **después de controlar el protocolo**.

## Eficiencia: menos pasos no significa mejor agente

Minimizar la longitud de la trayectoria sin más contexto crea incentivos equivocados.

Un agente prudente puede ejecutar una lectura adicional para verificar una precondición antes de una operación irreversible. Otro puede ahorrar un paso y asumir el dato. Si ambos terminan bien en un simulador fácil, «menos calls» premiaría al segundo aunque sea más frágil.

La documentación de τ-bench hace visible este problema: una trayectoria de referencia no es necesariamente la única correcta, y sus métricas de coincidencia de acciones se presentan como diagnósticos, no como corrección general.[^tau-evaluation]

Evalúa eficiencia **condicionada a éxito, calidad y cumplimiento comparables**.

Para cada trial conserva distribuciones de:

```text
turns
tool_calls
read_calls
write_calls
retries
model_tokens
wall_time
provider/tool latency
monetary cost
post_success_actions
```

Después compara dentro de estratos equivalentes de dificultad y outcome.

Una medida útil de coste operacional agregado es:

\[
C_{success} = \frac{\sum_i C_i}{\sum_i S_i}
\]

siempre que `C_i` incluya también el coste de trials fallidos que consumieron recursos. Si el producto exige compliance duro, sustituye el denominador por éxitos que además pasan esos invariantes.

No conviertas esta fórmula en un ranking universal: el workload, tools, precios, cachés y criterios de éxito deben ser comparables.

## No exijas la «golden trajectory» salvo que el camino sea el objeto de la tarea

Hay tareas donde una secuencia concreta sí importa.

Por ejemplo:

- un protocolo regulado exige consentimiento antes de acceder a un dato;
- una herramienta de seguridad debe ejecutar una aprobación antes del deploy;
- una task educativa evalúa precisamente si el agente usa un proceso concreto.

En esos casos, el orden o ciertas acciones forman parte del criterio.

Pero incluso entonces conviene expresar el requisito como **invariantes parciales**:

```text
approval precedes write
authentication precedes protected read
at most one charge side effect
state reconciliation precedes retry after ambiguous write
```

Eso permite múltiples planes válidos alrededor de las relaciones que realmente importan.

τ-bench ofrece `RewardType.ACTION` para tareas donde la trayectoria de referencia se trata como obligatoria, y advierte que eso presupone que se han enumerado las soluciones válidas o que la trayectoria es efectivamente única.[^tau-evaluation] Es un buen recordatorio de que exact-path matching es una decisión fuerte, no el default.

## Tres familias de graders para una trayectoria

### 1. Verificadores deterministas

Son la primera opción para hechos observables:

- nombre y argumentos de tool calls;
- schema;
- orden relativo entre eventos;
- permisos y approval IDs;
- número de writes;
- estado terminal;
- retries y timeouts;
- límites de coste/latencia;
- presencia de side effects duplicados.

Ventaja: reproducibilidad y causalidad claras.

Límite: sólo verifican lo que hemos especificado explícitamente.

### 2. Trajectory graders basados en modelos

Son útiles para propiedades semánticas difíciles de codificar:

- si la decisión estaba sustentada por la observación disponible;
- si el agente interpretó correctamente un tool error;
- si una recovery action era razonable bajo una policy en lenguaje natural;
- si una comunicación al usuario representa fielmente el estado observado.

Deben seguir la disciplina del capítulo 5.3: rubric versionada, calibración contra humanos, `unknown` cuando falta evidencia, bias probes y scope declarado.

No entregues al grader información que el agente no tenía si la pregunta es «¿era razonable esta decisión en ese momento?». Hacerlo introduce hindsight.

### 3. Revisión humana

Útil para:

- trayectorias de alto riesgo;
- taxonomías nuevas;
- desacuerdos entre graders;
- failure clusters no entendidos;
- auditoría periódica de falsos positivos y negativos del grader automático.

Anthropic recomienda combinar graders deterministas, model-based y humanos según el tipo de evidencia, y revisar manualmente transcripts para comprobar que los graders están midiendo lo esperado.[^anthropic-evals]

## La trace debe preservar causalidad suficiente

Un log plano de tool names suele ser insuficiente.

Para reconstruir por qué ocurrió un side effect necesitamos relaciones:

```text
trace_id
trial_id
parent/child span ids
turn / step index
observed state version
model / policy / tool version
tool request + arguments
authorization decision
tool response
side-effect identity
retry lineage
state reconciliation result
stop reason
timestamps / durations
```

El tracing del Agents SDK de OpenAI ejemplifica una jerarquía de trace + spans para runner, agent, turns, generations, tools, guardrails y handoffs.[^openai-tracing] No hace falta copiar ese esquema para otro framework. Lo importante es que el modelo de observabilidad preserve relaciones suficientes para evaluar la trayectoria.

También hay un límite de seguridad: traces y function spans pueden contener inputs/outputs sensibles. La documentación de OpenAI permite desactivar la captura de datos sensibles.[^openai-tracing] La observabilidad de eval no elimina los requisitos de minimización, acceso y retención.

## Evita que el grader use el futuro para juzgar el pasado

Una trajectory eval puede responder dos preguntas distintas:

1. **ex post:** ¿la trayectoria completa fue segura y correcta?
2. **local:** dado sólo lo conocido en `t`, ¿la decisión `d_t` estaba justificada?

Para la segunda, el grader debe ver un snapshot causal:

```text
history available at t
+ relevant policy at t
+ state visible at t
→ judge decision at t
```

Si le mostramos el resultado futuro del tool, puede calificar como obviamente mala una decisión que era razonable con la información disponible, o justificar retrospectivamente una decisión imprudente que tuvo suerte.

Mantén ambos tipos de grader separados.

## Caso A — Reembolso de soporte: outcome correcto, proceso inválido

Objetivo: reembolsar una compra sólo si cumple policy y existe aprobación para importes altos.

Trayectoria observada:

```text
read_order
→ amount = 600 €
→ create_refund(600 €)
→ success
```

El estado terminal contiene el reembolso correcto. `task_success = 1`.

Pero faltó `approval_id` antes del write. Si esa aprobación es un invariante duro:

```text
outcome: PASS
policy trajectory: FAIL
release gate: FAIL
```

La evaluación evita que el éxito final borre el incumplimiento.

## Caso B — Timeout en una reserva: recuperación que puede duplicar el side effect

Trayectoria:

```text
create_booking(idempotency_key=K)
→ timeout
→ lookup_booking(K)
→ found existing booking
→ return confirmation
```

Comparémosla con:

```text
create_booking()
→ timeout
→ create_booking() again
→ second booking created
```

Ambas pueden terminar mostrando al usuario «reserva confirmada». Sólo la primera reconcilia el estado antes de actuar de nuevo.

Los graders necesarios son distintos:

- outcome verifier: ¿existe la reserva correcta?;
- duplicate-side-effect verifier: ¿existe exactamente una?;
- recovery verifier: ¿se reconcilió el write ambiguo antes del retry?;
- communication verifier: ¿lo dicho al usuario coincide con el estado real?

## Caso C — Coding agent: tests verdes con una trayectoria excesiva

Un coding agent recibe una task pequeña y termina con todos los tests verdes.

Aun así queremos saber:

- qué ficheros modificó;
- si salió del scope permitido;
- si ejecutó comandos destructivos;
- cuántas veces repitió el mismo fallo;
- si revirtió cambios fallidos;
- si siguió editando después de alcanzar los criterios de aceptación.

El outcome verifier puede revisar tests y diff final. La trajectory eval aporta política, recuperación y coste.

No optimices `tool_calls` antes de filtrar por corrección del diff, tests y scope. Un agente con 12 calls correctas puede ser preferible a uno con 7 calls que tuvo suerte en un caso concreto.

## Diseña el release gate como capas, no como una media opaca

Una estructura práctica es:

```text
Layer 0 — evaluability
trace completa, versiones conocidas, estado verificable

Layer 1 — hard invariants
security / authorization / tenant / irreversible side-effect rules

Layer 2 — terminal success
state assertions + required communication

Layer 3 — recovery quality
failure detection + reconciliation + retry/cancel/fallback correctness

Layer 4 — efficiency
latency / tokens / calls / cost, only among comparable valid trials
```

Un fallo en Layer 1 no debería desaparecer porque Layer 4 sea excelente.

Para agregados de release, reporta por estrato y por failure mode, no sólo una media global:

```text
task_success_rate
hard_policy_violation_rate
recoverable_failure_count
recovered_failure_rate
duplicate_side_effect_count
premature_stop_rate
post_success_action_distribution
tool_calls_per_valid_success
cost_per_valid_success
```

Los nombres son un contrato interno, no estándares universales. Define numerador, denominador y unidad en el eval spec.

## La trayectoria también puede revelar fallos del propio benchmark

Si outcome y trayectoria discrepan de forma extraña, no asumas automáticamente que el agente es el problema.

Puede fallar:

- el simulador;
- el grader;
- una task ambigua;
- el estado inicial;
- la definición del outcome;
- la política de referencia.

Anthropic documenta ejemplos donde problemas de grader o de harness cambiaban materialmente resultados de benchmark después de corregir la evaluación.[^anthropic-evals]

La documentación reciente de τ-bench también aclara su semántica de `actions` precisamente porque una lectura incorrecta podía convertir una trayectoria de referencia en un requisito inexistente.[^tau-evaluation]

Por eso, cuando aparece un cluster nuevo de fallos:

```text
agent failure?
→ inspect trajectory
→ replay / deterministic verifier
→ inspect task + grader + environment
→ classify root cause
→ only then repair agent or eval
```

## Qué persistir por trial

Un mínimo defendible:

```text
task_id / task_version
trial_id
system_version
model + harness + policy versions
initial_state_fingerprint
trace_id
observable trajectory events
tool versions
arguments / results or safe hashes
policy and approval decisions
side-effect identifiers
retry lineage
reconciliation evidence
stop_reason
terminal_state_fingerprint
outcome assertions
trajectory grader outputs + versions
human review status if applicable
latency / token / cost measurements
```

Si privacidad o seguridad impiden guardar payloads completos, conserva identificadores, hashes, metadata y evidencias minimizadas suficientes para reproducir los checks permitidos.

Sin versionado, dos runs con el mismo nombre pueden estar evaluando sistemas, tools o policies distintos.

## Implicación de producción

Una evaluación de agente útil no intenta reducir toda la ejecución a un solo número.

Primero responde preguntas separadas:

1. **¿se logró el outcome?**
2. **¿las tool calls y argumentos fueron correctos bajo la información disponible?**
3. **¿se respetaron autorización, policy y side effects?**
4. **¿los fallos se detectaron, reconciliaron y recuperaron correctamente?**
5. **¿el agente paró en el momento correcto?**
6. **entre las ejecuciones válidas, cuál es su coste y eficiencia?**

Después usa esas dimensiones para un gate que refleje el riesgo real del producto.

El principio central es:

> **el outcome dice si la tarea terminó bien; la trayectoria explica si el sistema llegó hasta ahí de una forma que aceptaríamos repetir en producción.**

En el siguiente capítulo llevaremos esas señales al tráfico real: shadow evaluation, canaries, A/B tests, guardrails y regression gates.

## Referencias

[^anthropic-evals]: Anthropic Engineering, *Demystifying evals for AI agents*, 9 Jan 2026. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[^openai-tracing]: OpenAI Agents SDK, *Tracing*. https://openai.github.io/openai-agents-python/tracing/
[^tau-evaluation]: Sierra, *τ-bench / τ² — Task Schema and Evaluation*. https://github.com/sierra-research/tau2-bench/blob/main/docs/evaluation.md
[^procedure-aware]: Hongliu Cao, Ilias Driouich, Eoin Thomas, *Beyond Task Completion: Revealing Corrupt Success in LLM Agents through Procedure-Aware Evaluation*, 3 Mar 2026. https://arxiv.org/abs/2603.03116
