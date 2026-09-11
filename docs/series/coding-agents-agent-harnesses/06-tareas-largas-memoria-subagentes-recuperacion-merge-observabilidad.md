---
title: "Coding agents de larga duración: memoria, subagentes, recuperación, merge y observabilidad"
description: "Cómo diseñar un agent harness que mantenga estado durable durante horas o días, recupere trabajo tras fallos, coordine subagentes y conserve evidencia válida hasta el merge."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "coding agents, agent harness, long-running agents, durable state, memory, subagents, recovery, merge, observability"
tags:
  - IA
  - Agentes
  - Software
  - Coding agents
  - Observabilidad
---

# Capítulo 6 — Tareas largas, memoria, subagentes, recuperación, merge y observabilidad

Un coding agent puede trabajar durante horas y seguir siendo frágil si toda su continuidad depende de una conversación viva.

Una tarea larga atraviesa cambios de contexto, procesos que reinician, streams que se desconectan, workers paralelos, branches que avanzan y verificaciones que envejecen. El problema ya no es sólo que el modelo recuerde qué estaba haciendo. El harness tiene que saber **qué estado sigue siendo autoritativo, qué trabajo ya ocurrió, qué efectos externos son reales, qué evidencia sigue siendo válida y quién posee cada parte de la tarea**.

La pregunta de este capítulo es concreta:

```text
¿qué debe sobrevivir para que una tarea pueda continuar,
recuperarse, delegarse e integrarse sin inventar continuidad?
```

La respuesta no es «más contexto». Es separar los estados que tienen ciclos de vida distintos.

{{ include_html("snippets/articulos-tecnicos/coding-agent-long-task-state.html") }}

## Una tarea larga es una máquina de estados durable, no una conversación infinita

En una interacción corta podemos fingir que conversación, plan, workspace y ejecución son una sola cosa. En una tarea de varias horas esa simplificación falla.

Conviene separar al menos cuatro planos:

| Plano | Ejemplos | Qué puede invalidarlo |
|---|---|---|
| Contexto de inferencia | mensajes recientes, resumen compactado, resultados seleccionados | límite de contexto, reset, nueva sesión de modelo |
| Estado de control durable | `task_id`, contrato, DAG, ownership, blockers, stop reason | amendment autorizado, redistribución de trabajo |
| Estado de ejecución | base SHA, candidate SHA, worktree, archivos, entorno, efectos externos | nuevo commit, recreación del sandbox, cambio de target |
| Evidencia/provenance | tests, reviews, postconditions, approvals, trace IDs | cambio de candidate, contrato, entorno o verifier |

Estos planos se relacionan, pero no son intercambiables.

Si el contexto se compacta, el `candidate_sha` no debería cambiar por ello. Si el proceso reinicia, un deploy que ya ocurrió no deja de haber ocurrido. Si el target branch avanza, una conversación perfectamente conservada no hace fresh una verificación antigua.

La unidad estable de una tarea larga debe ser una identidad durable, por ejemplo:

```yaml
task_id: task-4812
contract_version: 4
target_ref: main
target_sha: a13f5c2
status: RUNNING
owners:
  api: worker-api
  migration: worker-db
candidate_sha: null
```

Es una estructura ilustrativa, no un estándar.

## «Memoria» no es un único objeto

En agentes se usa `memory` para cosas diferentes:

```text
conversation history
summary / compaction state
facts or notes saved by the agent
plan and task graph
files created in the workspace
state of external systems
verification evidence
```

Agrupar todo bajo una palabra oculta decisiones importantes.

Una nota que dice «la migración ya está aplicada» no tiene la misma autoridad que una postcondition que consulta el esquema real. Un resumen de conversación puede recordar que existía un PR, pero no demuestra cuál es su head SHA actual.

Para producción es más útil preguntar:

```text
¿quién produjo este estado?
¿dónde vive?
¿qué identidad/version lo acompaña?
¿puede reconstruirse?
¿qué lo invalida?
```

## Contexto, compaction, checkpoint y durable state tampoco son sinónimos

La **compaction** reduce o transforma el contexto que vuelve a entrar al modelo. Su objetivo es continuar razonando dentro de un presupuesto de tokens.

Un **checkpoint** es un punto de restauración. Puede incluir conversación, plan, archivos u otros objetos según el runtime.

El **durable task state** es el estado autoritativo que necesita el orquestador para reconstruir la tarea incluso si cambia el proceso o el contexto del modelo.

Es posible tener compaction sin un checkpoint completo. También puede existir un checkpoint de conversación que no incluya secretos, conexiones activas o estado en memoria de una tool.

GitHub documenta esta frontera explícitamente en Copilot SDK: con persistencia, una sesión puede reanudarse tras reinicios o migraciones de contenedor y se guardan historial, resultados de tools, planificación y artefactos; las API keys y el estado de tools sólo en memoria no se persisten.[^github-session-persistence]

Por tanto:

```text
resume(session) ≠ restore(entire world exactly)
```

El harness debe saber qué parte restaura el runtime y qué parte debe rehidratar la aplicación.

## Compaction y reset resuelven problemas distintos

No existe una política universal de contexto para tareas largas.

Anthropic describe una evolución concreta de su harness de desarrollo de larga duración: en una versión anterior usaba resets de contexto y handoff artifacts estructurados entre sesiones; posteriormente, con modelos más capaces, pudo mantener sesiones más largas y apoyarse en compaction automática. Su conclusión útil no es que «reset» o «compaction» gane siempre, sino que la cantidad de scaffolding necesaria depende del modelo y debe reevaluarse cuando éste cambia.[^anthropic-long-running]

OpenAI, por su parte, documenta en Agents API que el harness puede compactar automáticamente contexto anterior conforme una sesión se acerca al límite y mantener workflows que atraviesan múltiples ventanas de contexto.[^openai-agents-launch]

Esto es capacidad de un harness/servicio concreto, no una propiedad universal de cualquier modelo.

Una política razonable distingue:

```text
context continuity    → lo que el modelo necesita ahora
handoff artifact      → lo mínimo para que otro contexto entienda el trabajo
control state         → lo que el sistema debe conocer aunque ningún modelo lo recuerde
workspace state       → el código y los efectos realmente existentes
```

## Un reinicio no debería convertir la memoria del modelo en source of truth

Supón que el proceso muere después de ejecutar:

```text
alembic upgrade head
```

pero antes de persistir «migration done» en la conversación.

Al arrancar de nuevo hay dos errores posibles:

```text
1. asumir que no ocurrió y repetir una mutación no idempotente
2. asumir que ocurrió porque el modelo lo recuerda, sin observar el sistema
```

El enfoque fail-closed es reconciliar estado durable con postconditions observables.

Para efectos externos, un ledger de acciones puede registrar:

```yaml
action_id: db-migrate-019
intent: apply migration 20260911_03
request_fingerprint: 4db1...
started_at: 2026-09-11T09:14:20Z
observed_status: unknown
postcondition: schema_version == 20260911_03
```

Después del restart:

```text
si el outcome es durable y conocido → continuar
si es consultable → observar postcondition
si no puede saberse con seguridad → no repetir a ciegas; bloquear/reconciliar
```

Éste es un principio de diseño de 5sigmas para recuperación. No afirmamos que un provider concreto implemente automáticamente este ledger.

## Recuperar un stream no es repetir el stream

Una desconexión de UI o transporte no implica que la tarea haya dejado de existir.

La documentación actual de OpenAI Agents API ofrece un ejemplo muy concreto: sus streams no reproducen eventos perdidos. Para recuperar la vista de la aplicación recomienda abrir un stream nuevo y bufferizar eventos, recuperar la sesión y sus items guardados, reconstruir estado local por `item_id`, aplicar las actualizaciones bufferizadas que sigan siendo relevantes y después continuar con eventos live.[^openai-events]

La forma es importante:

```text
reconnect
   ↓
read durable history/state
   ↓
reconcile by stable identity
   ↓
apply only missing/new updates
   ↓
continue live
```

No:

```text
reconnect → replay every command we think we missed
```

El mismo runtime documenta que, tras un restart o disconnect, la aplicación debe recuperar la sesión para descubrir `required_actions` pendientes.[^openai-manage-sessions]

La lección general es separar **event delivery** de **durable state**. Un evento es una observación de una transición. No debería ser el único lugar donde existe el resultado de la transición.

## Un estado `idle` o un stream cerrado no demuestra éxito

Los estados operativos necesitan semántica explícita.

Un esquema de control puede incluir:

```text
RUNNING
WAITING_FOR_AUTHORITY
WAITING_FOR_ENVIRONMENT
RECOVERING
DELEGATED
INTEGRATING
VERIFYING
ACCEPTED
REWORK_REQUIRED
HAND_BACK_TO_HUMAN
FAILED
CANCELLED
```

`idle`, «no hay más tokens» o «el socket se cerró» son observaciones del runtime, no success conditions del producto.

Agents API lo formula de forma explícita para su propio protocolo: una sesión idle o un stream cerrado no establecen success, y un turn completado tampoco garantiza que todas las tools hayan tenido éxito; hay que inspeccionar el output y los estados guardados.[^openai-events]

## Subagentes sólo ayudan si ownership y dependencias son explícitos

Paralelizar no significa duplicar la misma tarea y esperar que el parent elija.

Un worker debería recibir un contrato suficiente para trabajar sin memoria implícita del parent:

```yaml
work_unit_id: api-pagination
owner: worker-api
depends_on: [contract-v4]
base_sha: a13f5c2
scope:
  - src/api/**
  - tests/api/**
forbidden_scope:
  - migrations/**
expected_output:
  - candidate_sha
  - changed_paths
  - validation_results
  - blockers
```

GitHub Fleet mode documenta un patrón parecido: el parent descompone trabajo en todos con IDs durables y dependencias, cada subagente posee una unidad, los workers deben devolver cambios/validación/blockers y el parent debe verificar el resultado combinado. La propia documentación marca Fleet mode como experimental en varios SDKs y advierte que el paralelismo no elimina la reconciliación por parte del parent.[^github-fleet]

Eso es capacidad y guidance de GitHub Copilot SDK, no una propiedad de todos los coding agents.

## Cada subagente necesita su propia identidad de ejecución

Para poder depurar e integrar necesitamos distinguir:

```text
root_task_id
work_unit_id
agent_id / subagent_id
base_sha
workspace_id
candidate_sha
turn/run IDs
verifier evidence
```

OpenAI Agents API ofrece un ejemplo de esta atribución: cada subagent tiene su propio item history; los turns exponen `subagent_id`, y los eventos incluyen acciones de coordinación como crear, enviar input, esperar o interrumpir subagentes.[^openai-multi-agent]

También documenta un caveat útil: que una acción de `create` o `wait` haya terminado no significa que el subagente haya terminado su tarea.[^openai-multi-agent]

Por tanto, el estado correcto no es:

```text
wait_call = done → worker = successful
```

sino algo parecido a:

```text
worker lifecycle + output contract + verification → integration eligibility
```

## No atribuyas al subagente capacidades que pertenecen al runtime

La frontera framework/provider vuelve a importar.

En la versión actual de Agents API, los subagentes heredan MCP tools configuradas, credenciales/allowed tools, web search y acceso a archivos/CLI del entorno, pero no soportan function tools.[^openai-multi-agent]

Eso es una restricción actual de ese producto en public beta. No demuestra que «los subagentes» en general no puedan ejecutar function tools.

Un artículo técnico debe conservar este nivel de atribución:

```text
modelo             → capacidad de inferencia
harness/runtime     → orchestration y lifecycle
provider/service    → persistencia/streaming/hosting concretos
application         → ownership, business state, policies y recovery contracts
```

## Paralelismo seguro necesita una superficie de integración diseñada

Dos workers pueden producir commits que Git logra fusionar sin conflicto y aun así romper el sistema.

Ejemplo:

```text
worker A: cambia `User.id` de int a UUID en API
worker B: añade cache que sigue indexando por int
```

Los archivos no tienen por qué colisionar. La invariante sí.

Por eso el parent necesita una fase de integración:

```text
worker outputs
   ↓
reconcile assumptions
   ↓
integrate commits/artifacts
   ↓
new integrated candidate SHA
   ↓
run integration-level verification
```

Un merge limpio es evidencia sobre la mecánica de Git. No es una prueba de consistencia semántica.

## El target branch puede moverse mientras los workers trabajan

Supón:

```text
t0: target main = A
worker-1 parte de A
worker-2 parte de A

t1: main avanza a B
workers producen W1 y W2 sobre A
```

Antes de mergear, el harness debe decidir explícitamente qué candidato quiere verificar:

```text
I = integrate(B, W1, W2)
```

Los tests ejecutados sobre `W1@A` no son automáticamente pruebas de `I@B`.

Esta es la misma regla de freshness del capítulo 5 aplicada a fan-out/fan-in:

```text
candidate identity changed → dependent evidence becomes stale
```

Puede reutilizarse evidencia sólo cuando la dependencia está explícitamente modelada y el cambio no puede afectarla. Si no se sabe, se revalida fail-closed.

## Checkpoint de worker y checkpoint de integración son objetos diferentes

Un checkpoint de worker puede servir para continuar su rama:

```text
worker_id + base_sha + workspace + plan + local evidence
```

Pero el punto de integración necesita además:

```text
target_sha
worker candidate SHAs
merge/rebase operations
resolved conflicts
combined diff digest
integration candidate SHA
integration evidence
```

Esto evita un error común: marcar la tarea global como recuperable sólo porque cada worker puede reanudar su conversación.

## Observabilidad útil reconstruye causalidad, no sólo logs

Para una tarea larga, «tenemos logs» no basta.

Una pregunta de producción típica es:

```text
¿por qué se aceptó este candidate SHA si el worker de migraciones había fallado 40 minutos antes?
```

Para responder necesitamos unir varias identidades:

```text
task_id
contract_version
root turn/run
subagent/work_unit
workspace + base_sha + candidate_sha
tool/action_id
status transition
retry/recovery relation
verifier/evidence IDs
integration candidate
stop_reason
```

OpenAI Agents API expone session/turn/item histories, atribución a subagentes y trazas de model responses, tool calls y delegated work.[^openai-observability][^openai-tracing]

Pero sus propias docs establecen límites relevantes: `usage` es best-effort, puede ser `null` o cambiar, y no es la factura final; el public beta no expone configuración de tracing ni external trace exporters.[^openai-observability][^openai-tracing]

Esto ilustra por qué observabilidad de provider y observabilidad de aplicación no son la misma capa.

## Métricas de tarea larga: separa actividad de progreso

Contar tool calls o tokens puede medir trabajo sin medir avance.

Métricas operativas más informativas incluyen:

| Métrica | Pregunta que responde |
|---|---|
| tiempo en cada estado | ¿dónde espera realmente la tarea? |
| work units ready/running/blocked | ¿el DAG progresa o está atascado? |
| retries por causa | ¿recuperamos o repetimos el mismo fallo? |
| stale evidence count | ¿cuánto trabajo de verificación invalida la integración? |
| integration conflict rate | ¿la descomposición produce ownership limpio? |
| recovery success | ¿podemos continuar tras restart/disconnect sin intervención? |
| handback reason | ¿qué autoridad/capacidad falta al sistema? |
| cost por outcome aceptado | ¿cuánto cuesta cerrar trabajo válido, no sólo generar tokens? |

Las métricas concretas dependen del producto. El principio es ligar actividad a estados y outcomes verificables.

## Caso trabajado: tres workers y un target que avanza

Tarea:

```text
Añadir `external_id` a cuentas.
Exponerlo en REST.
Migrar datos existentes.
Actualizar documentación y tests.
```

Contrato inicial:

```yaml
task_id: account-external-id
contract_version: 2
target_sha: A
```

El parent crea:

```text
W1 API        base=A   owns src/api/** + tests/api/**
W2 migration  base=A   owns migrations/** + tests/db/**
W3 docs       base=A   owns docs/**
```

Cada worker devuelve:

```yaml
work_unit_id: migration
base_sha: A
candidate_sha: M7
changed_paths:
  - migrations/20260911_external_id.py
verification:
  migration_up: pass
  migration_down: pass
blockers: []
```

Mientras trabajan, `main` avanza de `A` a `B`.

El parent no debería decir:

```text
W1 pass + W2 pass + W3 pass → merge
```

Debe construir el candidato integrado:

```text
I9 = integrate(B, W1, W2, W3)
```

Después:

```text
1. recalcular changed paths e invariantes cruzadas
2. invalidar evidencia dependiente de A/W1/W2/W3 cuando corresponda
3. ejecutar integration tests y contract checks sobre I9
4. revisar conflictos semánticos y cambios de target
5. aceptar sólo si la evidencia final pertenece a I9
```

Si el proceso del parent cae después de crear `I9`, el restore necesita poder reconstruir que `I9` existe y qué evidencias están fresh. Releer conversaciones de los tres workers no sustituye ese ledger.

## Recovery correcto tiene que ser repetible

Un buen test de arquitectura es preguntar:

```text
si mato el orchestrator ahora mismo,
¿puede otro proceso decidir exactamente qué hacer después sin adivinar?
```

Para acercarse a «sí» hacen falta al menos:

```text
identidades estables
durable control state
workspace/candidate identities
acción y effect provenance
worker ownership + dependencies
pending authority/actions
evidence freshness
explicit stop reasons
```

Y una regla de reconciliación:

```text
persisted state + observed external state → next safe transition
```

No:

```text
last model message → guess next action
```

## Trade-off: durabilidad y paralelismo cuestan complejidad

Persistir cada transición, mantener un DAG, aislar workspaces, conservar provenance y revalidar integración añade trabajo al harness.

No todas las tareas lo necesitan.

Para una corrección de cinco minutos en un repo local, un solo agente, un worktree y una suite de tests pueden ser suficientes. Para una migración de varias horas con efectos remotos y tres workers, depender sólo del transcript es una apuesta innecesaria.

La pregunta práctica es:

```text
¿cuánto estado puede perderse sin que el sistema tenga que adivinar?
```

Cuanto mayor sea la duración, el paralelismo, la autoridad de las tools y el coste de repetir efectos, más valor tiene hacer durable el estado de control y evidencia.

## La arquitectura debe poder simplificarse cuando cambia el modelo

El harness no debe acumular mecanismos sólo porque fueron útiles una vez.

El trabajo de Anthropic sobre long-running coding muestra precisamente que cambios de modelo pueden cambiar qué scaffolding aporta valor: estrategias necesarias para una generación anterior pueden convertirse en overhead con una nueva.[^anthropic-long-running]

De forma similar, un managed harness puede asumir parte de la persistencia, compaction, subagent lifecycle o tracing que una implementación thin/vanilla tendría que construir.

Pero transferir una responsabilidad al runtime no elimina la necesidad de conocer su boundary. La aplicación sigue necesitando sus propios contratos de negocio, ownership, candidate identity y success criteria.

## Implicación de producción: continuidad significa poder reconstruir verdad

Una tarea larga no es fiable porque el modelo pueda seguir hablando después de diez horas.

Es fiable cuando el sistema puede responder, después de un reset, un restart, una desconexión o un fan-in:

```text
qué tarea estamos ejecutando
qué contrato está vigente
qué trabajo posee cada actor
qué efectos ya ocurrieron
qué candidate es el actual
qué evidencia pertenece a ese candidate
qué está bloqueado
qué transición es segura ahora
por qué aceptaríamos o devolveríamos la tarea
```

Ese es el salto de un coding assistant persistente a un harness operable.

La continuidad útil no consiste en conservar cada token. Consiste en conservar suficiente estado autoritativo para **reconstruir la verdad del trabajo** y volver a verificar todo lo que dejó de ser válido.

## Referencias primarias

[^openai-agents-launch]: OpenAI, [Introducing the Agents API](https://openai.com/index/introducing-the-agents-api/), 10 de septiembre de 2026. Se usa para las capacidades first-party anunciadas de long sessions, compaction, subagents y separación entre harness y entorno. No se usan customer testimonials ni benchmarks de marketing como evidencia general.
[^openai-events]: OpenAI API Docs, [Agents API — Events and items](https://developers.openai.com/api/docs/guides/agents-api/sessions/events). Se usan las semánticas actuales de event/item identity, estado de turns/items y el algoritmo documentado para reconstruir estado tras desconexión; los streams no replayean eventos perdidos.
[^openai-manage-sessions]: OpenAI API Docs, [Agents API — Manage sessions](https://developers.openai.com/api/docs/guides/agents-api/sessions/manage). Se usa la semántica de `requires_action`, recuperación de acciones pendientes tras restart/disconnect y lifecycle de sesión.
[^openai-multi-agent]: OpenAI API Docs, [Agents API — Multi-agent](https://developers.openai.com/api/docs/guides/agents-api/multi-agent). Se usan únicamente capacidades actuales del producto: subagent histories, `subagent_id`, coordination items, herencia de MCP/tools permitidas y la limitación actual de function tools.
[^openai-observability]: OpenAI API Docs, [Agents API — Observability and usage](https://developers.openai.com/api/docs/guides/agents-api/observability). Se usan session/turn/item observability y los caveats de `usage` best-effort.
[^openai-tracing]: OpenAI API Docs, [Agents API — Tracing](https://developers.openai.com/api/docs/guides/agents-api/tracing). Se usan las definiciones actuales de trace/span y la limitación del public beta respecto a configuración y external exporters.
[^anthropic-long-running]: Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps), 24 de marzo de 2026. Se usa como evidencia first-party de handoff artifacts, context reset vs compaction, planner/generator/evaluator y de que el scaffolding necesario cambia con la capacidad del modelo. No se generalizan sus costes ni tiempos a otros setups.
[^github-session-persistence]: GitHub Docs, [Copilot SDK — Session resume and persistence](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-persistence). Se usa para distinguir qué estado persiste y qué debe reinyectarse al reanudar una sesión.
[^github-fleet]: GitHub Docs, [Copilot SDK — Fleet mode](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/fleet-mode). Se usa su patrón actual de ownership/dependencies, worker result contract y parent verification, conservando explícitamente su estado experimental.