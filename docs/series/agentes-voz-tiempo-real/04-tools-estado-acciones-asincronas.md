---
title: "Tools y estado: ejecutar acciones sin romper la conversación"
description: "Cómo diseñar tool calls, estado conversacional, acciones asíncronas, cancelación, idempotencia y recuperación en agentes de voz en tiempo real."
date: 2026-09-10
date_modified: 2026-09-10
tags:
  - IA
  - Voz
  - Realtime
  - Agentes
  - Producción
---

# Capítulo 4 — Tools y estado: ejecutar acciones sin romper la conversación

Un agente puede dejar de hablar en milisegundos y, aun así, haber iniciado una acción que ya no puede deshacer. Esa diferencia es el centro del problema.

Cuando un usuario dice «reserva la mesa», «manda el correo» o «cancela mi pedido», el sistema deja de ser sólo una conversación. Entra en un flujo distribuido con estado, efectos externos, reintentos, interrupciones y resultados que pueden llegar cuando el usuario ya está hablando de otra cosa.

La pregunta de este capítulo es concreta: **¿cómo ejecutas tools y acciones largas sin confundir el estado de la conversación con el estado real del negocio, y sin convertir una interrupción de voz en una falsa cancelación de la acción?**

## Una tool call no es el efecto externo

Conviene separar al menos cuatro eventos:

```text
1. tool_requested     el modelo propone una llamada
2. action_admitted    la aplicación valida y acepta la intención
3. effect_committed   el sistema externo confirma el efecto
4. result_observed    el agente recibe un resultado utilizable
```

No son equivalentes.

{{ include_html("snippets/articulos-tecnicos/voice-action-lifecycle.html") }}

El modelo puede emitir dos veces la misma tool call. La aplicación puede aceptar una acción y perder la conexión antes de recibir el resultado. El proveedor externo puede completar el pago aunque el usuario interrumpa el audio. Una respuesta puede llegar después de un handoff a otro agente.

Por eso, en producción, **la frontera autoritativa de una acción debe vivir fuera del texto generado por el modelo**.

## Separa cuatro tipos de estado

Llamar a todo «contexto» oculta fallos importantes. Un agente realtime suele tener, como mínimo, estas capas:

| Estado | Ejemplo | Quién debería ser autoritativo |
|---|---|---|
| Contexto del modelo | mensajes, tool calls, tool results | runtime/provider según la arquitectura |
| Estado de sesión | turno activo, agente activo, `speech_id`, preferencias efímeras | runtime + aplicación |
| Estado durable de la aplicación | `action_id`, idempotency key, estado de workflow | almacenamiento de la aplicación |
| Sistema de registro | pedido, reserva, transferencia, ticket | API/DB del dominio que ejecuta el efecto |

Una variable en memoria como `userdata` puede ser útil para coordinar una sesión. No convierte esa memoria en un ledger durable.

Si el proceso muere, debes poder reconstruir qué ocurrió consultando el estado durable y el sistema de registro. El historial del LLM puede ayudar a explicar la conversación, pero no debe decidir por sí solo si una transferencia bancaria ocurrió.

## El contrato mínimo de una acción

Antes de ejecutar una tool que modifica el mundo, define un identificador estable y una política explícita:

```text
turn_id             identifica el turno conversacional
provider_call_id    identifica la llamada emitida por el modelo
operation_id        identifica la intención de negocio
idempotency_key     deduplica reintentos equivalentes
status              admitted | running | committed | failed | unknown
```

`provider_call_id` no siempre es una buena idempotency key de negocio. Un nuevo intento del modelo puede producir otro ID para la misma intención humana.

Una estrategia práctica es derivar o asignar `operation_id` en la capa de aplicación después de validar argumentos, usuario, permisos y precondiciones. Ese ID viaja por logs, traces y callbacks hasta el sistema externo.

## Validar argumentos no basta

Un schema de tools evita parte de los errores de forma. No resuelve autorización ni semántica.

Antes de admitir una acción revisa, según el dominio:

- identidad y permisos del usuario;
- argumentos normalizados;
- precondiciones actuales del recurso;
- necesidad de confirmación explícita;
- límites de importe, frecuencia o alcance;
- idempotencia y duplicados;
- deadline y política de retry;
- qué estados son compensables y cuáles son irreversibles.

La tool declaration describe lo que el modelo **puede solicitar**. La aplicación sigue siendo responsable de decidir lo que **puede ejecutar**.

## Cancelar speech, generación y side effects son operaciones distintas

En voz aparecen varias cancelaciones que suelen ocurrir juntas, pero no significan lo mismo:

```text
cancel model output
cancel TTS synthesis
clear queued/playout audio
cancel local coroutine
cancel provider request
cancel external business action
```

Las primeras cuatro pueden ser rápidas y locales. La última puede no existir.

Por ejemplo, si el agente inicia `create_booking()` y el usuario hace barge-in diciendo «espera», hay tres casos distintos:

1. **Todavía no se admitió la acción.** Puedes evitar iniciarla.
2. **Está en progreso y el proveedor soporta cancelación real.** Solicitas cancelación y esperas un estado confirmado.
3. **El efecto ya se confirmó o no existe cancelación segura.** Interrumpes la conversación, pero debes reconciliar y explicar el resultado real.

Nunca digas «cancelado» sólo porque cancelaste la coroutine que esperaba la respuesta.

OpenAI Realtime ilustra bien la separación en la capa del modelo/audio: `response.cancel` cancela una respuesta en progreso y, para WebRTC/SIP, `output_audio_buffer.clear` corta el audio de salida. Esos eventos no cancelan por sí mismos una reserva, un pago o cualquier side effect ejecutado por tu aplicación.[^openai-realtime-cancel]

## Barge-in mientras una tool sigue corriendo

Una interrupción de usuario no debería destruir información sobre una acción ya admitida.

Supongamos:

```text
T0  usuario: "reserva para dos a las 21:00"
T1  modelo solicita book_table
T2  aplicación admite operation_id=op_42
T3  API del restaurante sigue procesando
T4  usuario: "mejor a las 21:30"
T5  llega resultado de op_42: reserva 21:00 confirmada
```

El resultado de `op_42` sigue siendo verdadero aunque el turno conversacional que lo inició haya quedado obsoleto.

La aplicación necesita decidir qué hacer con ese resultado tardío. Normalmente conviene:

- persistirlo primero;
- marcar si sigue siendo relevante para el objetivo actual;
- no insertarlo ciegamente como si perteneciera al turno nuevo;
- si creó un efecto real, reconciliarlo antes de intentar una segunda acción;
- comunicar al usuario el estado real, no el que el diálogo esperaba.

Un `turn_id` ayuda a detectar que la conversación avanzó. Un `operation_id` ayuda a no perder el efecto.

## Async no significa fire-and-forget

Una acción en background sigue necesitando ownership.

Para cada operación larga deberías saber:

```text
quién la creó
qué usuario/recurso afecta
qué deadline tiene
qué puede reintentarse
qué evento la completa
qué ocurre si cambia el agente activo
qué ocurre si se desconecta el usuario
qué ocurre si muere el proceso
cómo se vuelve a observar su resultado
```

Si ninguna parte del sistema puede contestar esas preguntas después de un restart, la operación no es robustamente asíncrona; sólo quedó desacoplada del await original.

## LiveKit Agents: herramientas de sesión no equivalen a estado durable

LiveKit Agents soporta tools que bloquean el flujo y tools asíncronas que permiten seguir conversando mientras una operación larga termina.[^livekit-tools]

`RunContext` da acceso a `session`, `function_call`, `speech_handle` y `userdata` dentro de una tool.[^livekit-function-tools] Eso reduce plumbing de sesión, pero no cambia la frontera del sistema de registro: `userdata` es estado del workflow de la sesión, no una garantía de persistencia de tus efectos de negocio.

Hay una distinción importante en los handoffs. Las tools asíncronas ligadas a un `Agent` pertenecen a ese agente; LiveKit documenta que sus actualizaciones pendientes se descartan si ocurre un handoff. Para una operación que deba sobrevivir al cambio de agente, `AsyncToolset` puede adjuntarse a `AgentSession`, de modo que el resultado final y sus updates lleguen al agente que esté activo cuando termine.[^livekit-async-tools]

Esto resuelve **ownership dentro del runtime**. No sustituye idempotency keys, durable workflow state ni reconciliación con la API externa.


### Cancelación y duplicados del runtime no son idempotencia de negocio

Las async tools de LiveKit terminan por defecto aunque el usuario cambie de tema. Si quieres que el LLM pueda detener una llamada en curso, la tool debe optar explícitamente por `ToolFlag.CANCELLABLE`.[^livekit-async-tools] Esa cancelación actúa sobre el trabajo que controla el runtime; no demuestra que una API externa haya revertido un efecto que ya aceptó o confirmó.

LiveKit también documenta políticas para llamadas duplicadas: `allow`, `reject`, `replace` y `confirm`. La detección de duplicados se hace por **nombre de tool, no por argumentos**; `replace` cancela la llamada activa antes de lanzar la nueva y exige que la tool activa sea cancelable.[^livekit-async-tools]

Eso es control de ejecución dentro del agente, no deduplicación de negocio. Dos llamadas con el mismo nombre pueden representar operaciones distintas, y dos tool calls con IDs distintos pueden representar la misma intención humana. La frontera durable sigue siendo `operation_id` + idempotency key + sistema de registro.

### Tasks y handoffs cambian quién posee el turno

`AgentTask` representa un objetivo acotado que toma control de la sesión hasta devolver un resultado. `TaskGroup` permite secuenciar tareas con contexto compartido.[^livekit-tasks]

Un handoff cambia el agente activo. LiveKit permite pasar `userdata`, mientras el historial conversacional del nuevo agente es fresco por defecto salvo que pases explícitamente `chat_ctx`; el historial completo de la sesión sigue disponible en `session.history`.[^livekit-handoffs]

Por tanto, no asumas que «mismo session ID» significa «mismo prompt efectivo» ni que un callback tardío pertenece al agente que inició la acción.

## Pipecat: function calls dentro de una pipeline explícita

Pipecat integra function calling en el flujo del LLM y los context aggregators almacenan las llamadas y resultados en el contexto conversacional.[^pipecat-functions]

`FunctionCallParams` expone, entre otros campos, `function_name`, `tool_call_id`, argumentos, contexto y `result_callback`. La aplicación ejecuta el handler y devuelve el resultado mediante ese callback.[^pipecat-functions]

Pipecat distingue dos comportamientos útiles:

- con `cancel_on_interruption=True` —valor por defecto documentado— la llamada participa en el flujo que espera el resultado;
- con `cancel_on_interruption=False`, la llamada se trata como asíncrona: la conversación puede continuar y, cuando llega el resultado, Pipecat lo inyecta en contexto como mensaje de developer y dispara una nueva inferencia.[^pipecat-functions]

Las funciones asíncronas también pueden enviar resultados intermedios con `is_final=False` antes del resultado final.[^pipecat-functions]


La API actual hace otra distinción útil. Una función con `cancel_on_interruption=False` puede exponer `cancellable_by_llm=True`; Pipecat anuncia entonces una tool `cancel_<nombre>` para que el modelo detenga esa llamada. `timeout_secs` limita la ejecución del handler y, al expirar, el handler recibe `asyncio.CancelledError`. La propia documentación advierte que trabajo que el handler haya lanzado en una task independiente **no se cancela con él**.[^pipecat-functions]

Por tanto, incluso una cancelación correcta del handler sigue sin demostrar que el side effect remoto se haya cancelado. El contrato con la API o worker externo debe decir qué ocurrió realmente.

Esto es una primitiva potente para una UX de «sigo comprobándolo». Pero la semántica de negocio sigue siendo tuya. `cancel_on_interruption=False` no convierte un side effect en durable, idempotente ni compensable.

### `app_resources` comparte referencias, no crea persistencia

Pipecat permite pasar `app_resources` a `PipelineTask` para que los handlers compartan conexiones, clientes o estado de aplicación. La documentación indica que esos recursos se pasan por referencia y que el framework no los copia ni los limpia.[^pipecat-functions]

Eso facilita dependency injection. No convierte un objeto Python compartido en una base de datos durable.

## Vanilla/thin Python: máxima explicitud, máximo ownership

Con SDKs y protocolos directos puedes modelar exactamente las fronteras que necesita tu producto. También debes poseerlas.

Además de transporte, media, buffering, turn-taking y cancelación —ya vistos en capítulos anteriores— una implementación vanilla debe definir aquí:

- registry y schemas de tools;
- validación, authz y confirmations;
- mapeo provider-call → operación de negocio;
- durable state machine;
- idempotency keys;
- timeouts, retries y retry budgets;
- bounded concurrency y backpressure;
- cancelación y compensación;
- correlación de resultados tardíos;
- persistencia y recuperación tras crash;
- handoff/session migration;
- tracing, audit log y replay;
- tests de carreras y fallos parciales;
- workers, colas y escalado de acciones largas.

Tener menos capas de framework puede dar más control. **No significa tener menos sistema que construir.**

## La máquina de estados debe sobrevivir a un restart

Para efectos externos importantes, modela explícitamente estados que puedas reconstruir. Por ejemplo:

```text
REQUESTED
  ↓ validate + authorize
ADMITTED
  ↓ persist operation_id + idempotency_key
RUNNING
  ├──→ COMMITTED
  ├──→ FAILED_RETRYABLE
  ├──→ FAILED_FINAL
  └──→ UNKNOWN
```

`UNKNOWN` es útil. Aparece cuando pierdes la respuesta después de enviar una petición y no sabes si el proveedor ejecutó el efecto.

En ese estado no deberías repetir automáticamente una operación no idempotente. Primero consulta el sistema externo por `operation_id`, idempotency key o un identificador de dominio. Si el proveedor no permite reconciliar, el riesgo forma parte del diseño del producto.

## Retry necesita idempotencia y un presupuesto

«Reintentar tres veces» no es una estrategia suficiente.

Un retry seguro requiere responder:

- ¿la operación es idempotente?
- ¿el proveedor reconoce la misma idempotency key entre intentos?
- ¿qué errores son retryable?
- ¿cuál es el deadline total de usuario o negocio?
- ¿hay jitter/backoff?
- ¿un segundo worker puede ejecutar el mismo job?
- ¿cómo sabes si el intento anterior llegó a commit?

Para lecturas, repetir puede ser barato. Para mutaciones, un timeout después de enviar la petición puede significar «falló la respuesta», no «falló el efecto».

## Compensation no es cancellation

Algunos efectos pueden revertirse mediante otra operación. Eso es **compensación**.

```text
create_booking(op_42)  → committed
cancel_booking(op_43)  → committed
```

`op_43` no borra históricamente `op_42`; crea una nueva transición de negocio.

Esta distinción importa para auditoría, cobros, reservas y sistemas con side effects. Si el usuario interrumpe después del commit, una compensación puede ser el siguiente paso correcto. Fingir que la primera operación nunca existió no lo es.

## Backpressure también existe en tools

Un agente puede recibir más trabajo del que sus dependencias pueden procesar. Si cada tool call abre una coroutine o job sin límite, una ráfaga de usuarios convierte la cola implícita en memoria, conexiones o rate-limit failures.

Define límites por recurso:

```text
max concurrent operations
max queued operations
per-user/per-tenant limits
deadline before admission
policy: reject | queue | coalesce | degrade
```

Para una lectura repetida puede ser razonable coalescer. Para una mutación, fusionar dos operaciones puede cambiar semántica. La política debe pertenecer al dominio, no a una regla genérica del framework.

## El resultado tardío debe pasar por un gate de relevancia

No todo resultado válido debe provocar speech inmediatamente.

Antes de convertir un callback tardío en una respuesta audible, comprueba al menos:

```text
¿la operación corresponde al mismo usuario y sesión lógica?
¿el resultado ya fue comunicado?
¿el objetivo conversacional sigue vigente?
¿hay un turno más nuevo que lo contradice?
¿el agente activo tiene permiso para revelar ese resultado?
¿el resultado exige una acción de reconciliación primero?
```

Separar **resultado durable** de **respuesta conversacional** evita que un callback antiguo secuestre el turno actual.

## Observabilidad: correlaciona conversación y efecto

Un trace útil no termina en `tool_called`.

Registra, con cuidado de no filtrar secretos o PII innecesaria:

```text
session_id / conversation_id
turn_id
model response id
provider tool_call_id
operation_id / idempotency_key
admission timestamp
external request span
commit/reconcile timestamp
result delivery timestamp
active agent at delivery
spoken acknowledgement id
```

Con eso puedes responder preguntas de producción concretas:

- ¿duplicó el modelo la petición o la duplicó nuestro retry?
- ¿el usuario oyó una confirmación de algo que nunca committed?
- ¿la operación terminó después del barge-in?
- ¿un handoff perdió el resultado?
- ¿un restart dejó una acción en estado `UNKNOWN`?

## Evals y replay: prueba carreras, no sólo happy paths

Un test de tool calling que sólo pregunta «¿eligió la función correcta?» es insuficiente para realtime.

Añade escenarios deterministas como:

1. barge-in antes de `ADMITTED`;
2. barge-in después de `RUNNING`;
3. timeout después de enviar una mutación;
4. resultado duplicado;
5. reconnect mientras la acción sigue activa;
6. handoff antes de completar una tool async;
7. crash entre `COMMITTED` y el acknowledgement al usuario;
8. resultado tardío después de que cambie la intención;
9. dos tool calls concurrentes sobre el mismo recurso;
10. retry con y sin idempotency support.

La aserción correcta no es sólo la frase final. Incluye estado durable, número de side effects, orden causal y qué llegó a oír el usuario.

## LiveKit, Pipecat o vanilla: decide por la frontera que necesitas controlar

No hay un ganador universal en este capítulo.

| Necesidad | LiveKit Agents | Pipecat | Python vanilla/thin |
|---|---|---|---|
| Tool calling | tools integradas en `Agent`/`AgentSession`; `RunContext` conecta tool con sesión | handlers + `FunctionCallParams` integrados con LLM/context aggregators | contrato y adapter por provider diseñados por la app |
| Background/async | async tools; `AsyncToolset` puede sobrevivir a handoffs | `cancel_on_interruption=False` permite continuar y reinyectar resultados | scheduler/queue/callback protocol propios |
| Estado efímero | `userdata`, chat context, session history | `LLMContext`, aggregators, `app_resources` | estructuras propias |
| Durable business state | responsabilidad de la aplicación | responsabilidad de la aplicación | responsabilidad de la aplicación |
| Handoff/result ownership | primitives explícitas de agent/task/session | depende de pipeline, context y lógica aplicada | completamente explícito |
| Idempotencia/reconciliación | dominio/aplicación | dominio/aplicación | dominio/aplicación |
| Control fino del protocolo | menor si aceptas las primitives del runtime | alto a nivel de processors/frames | máximo; también máximo coste de implementación |

### Elige LiveKit Agents cuando

Tu unidad natural es `AgentSession`, quieres tools, tasks y handoffs integrados y la semántica de async tools encaja con tu workflow. Sigue externalizando el estado de negocio durable y usa `AsyncToolset` sólo cuando realmente quieras que la operación sobreviva al agente que la lanzó.

### Elige Pipecat cuando

Quieres una pipeline explícita y control granular sobre cuándo un function result vuelve al contexto, incluyendo operaciones que continúan durante interrupciones y updates intermedios. Mantén fuera del contexto la fuente de verdad de los side effects.

### Elige vanilla/thin cuando

Necesitas una state machine de acciones muy específica, integración directa con protocolos/providers, semánticas de cancelación/replay no cubiertas por el runtime o experimentos donde cada frontera debe ser observable. A cambio, tu aplicación posee scheduler, persistence, retries, cancellation, reconciliation, tracing, testing y scaling.

### Usa un híbrido cuando

El runtime resuelve bien media, sesión y turn-taking, pero el negocio ya dispone de un workflow engine o una plataforma de jobs durable. En ese caso, la tool del agente puede **admitir** una operación en ese sistema, recibir un `operation_id` y observar progreso sin convertir el proceso realtime en el dueño del workflow.

Ese límite suele ser más limpio que intentar forzar una operación de varios minutos a vivir dentro de la misma coroutine que atiende el turno de voz.

## Regla de producción

La regla que conecta todo el capítulo es simple:

> **El modelo propone; la aplicación admite; el sistema de registro confirma; la conversación comunica.**

Si esas cuatro responsabilidades quedan separadas, una interrupción, retry, handoff o restart puede cambiar la conversación sin reescribir la realidad del negocio.

Si quedan mezcladas, el agente puede sonar convincente mientras su estado interno y el mundo real ya divergen.

## Qué medir antes de optimizar

Para cada clase de tool registra distribuciones y tasas, no sólo una media:

- admission latency;
- ejecución hasta commit o resultado;
- timeout rate y retry rate;
- duplicate-suppression rate;
- operaciones en `UNKNOWN`;
- resultados tardíos después de cambio de turno;
- cancelaciones solicitadas vs confirmadas;
- compensaciones;
- handoffs con operaciones pendientes;
- errores de reconciliación;
- tiempo entre commit y acknowledgement audible.

No compares runtimes con workloads, proveedores o políticas diferentes y llames a esa diferencia «overhead del framework». Para atribuir overhead mantén constantes hardware, red, provider/modelo, acción externa, carga, política de turn-taking y estrategia de persistencia.

## Conclusión

Las tools convierten un voice agent en un sistema que modifica estado externo. En ese momento la corrección ya no consiste sólo en elegir la función adecuada.

Necesitas separar contexto conversacional, estado de sesión, estado durable y sistema de registro; distinguir cancelación de audio de cancelación de side effects; diseñar idempotencia y reconciliación; controlar backpressure; y decidir qué hacer con resultados que llegan después de una interrupción, un handoff o un restart.

LiveKit Agents y Pipecat aportan primitivas útiles en fronteras distintas. Vanilla/thin Python deja esas fronteras en tus manos. Ninguna opción elimina el problema de negocio: **el efecto externo debe tener un dueño durable independiente de la frase que el agente esté diciendo en ese instante**.

---

[^livekit-tools]: LiveKit Documentation, *Tool definition and use*. https://docs.livekit.io/agents/logic/tools/
[^livekit-function-tools]: LiveKit Documentation, *Function tools — RunContext*. https://docs.livekit.io/agents/logic/tools/definition/
[^livekit-async-tools]: LiveKit Documentation, *Async tools*. https://docs.livekit.io/agents/logic/tools/async/
[^livekit-tasks]: LiveKit Documentation, *Tasks and task groups*. https://docs.livekit.io/agents/logic/tasks/
[^livekit-handoffs]: LiveKit Documentation, *Agents and handoffs*. https://docs.livekit.io/agents/logic/agents-handoffs/
[^pipecat-functions]: Pipecat Documentation, *Function Calling*. https://docs.pipecat.ai/pipecat/learn/function-calling
[^openai-realtime-cancel]: OpenAI API Reference, *Realtime client events — response.cancel / output_audio_buffer.clear*. https://platform.openai.com/docs/api-reference/realtime-client-events/conversation/item/create
