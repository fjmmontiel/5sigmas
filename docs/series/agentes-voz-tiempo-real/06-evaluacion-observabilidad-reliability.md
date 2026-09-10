---
title: "Evaluar un agente de voz: evidencia por turno, observabilidad y reliability"
description: "Cómo saber si un agente de voz funciona de verdad: outcome, turn-taking, media, tools y runtime unidos en una taxonomía de fallos y un loop producción→eval→regresión."
date: 2026-09-10
date_modified: 2026-09-10
tags:
  - IA
  - Voz
  - Realtime
  - Evaluación
  - Observabilidad
  - Reliability
  - Producción
---

# Capítulo 6 — Evaluar un agente de voz: evidencia por turno, observabilidad y reliability

Un dashboard puede enseñar 420 ms de latencia media, 99.9 % de requests HTTP correctos y cero excepciones. El agente puede seguir fallando la tarea real.

También puede ocurrir lo contrario: un proveedor devuelve un error, el runtime hace fallback y el usuario completa la conversación sin notar nada. Contar ese evento como «turno fallido» mezcla un fallo interno recuperado con un fallo visible.

La pregunta útil es: **¿qué evidencia necesitas por turno para decidir si el sistema hizo lo correcto, qué frontera falló, si se recuperó y qué llegó a percibir el usuario?**

Este capítulo construye ese modelo y lo conecta con evaluación offline, observabilidad de producción, replay y gates de regresión.

## Una transcripción no es la verdad del sistema

La transcripción es una evidencia importante, pero sólo describe una parte del recorrido. Considera este turno:

```text
Usuario: «Reserva la cita del martes a las 15:00»
Agente:  «Perfecto, queda reservada»
```

Un judge de texto podría considerar correcta la respuesta. Sin embargo, la tool puede haber devuelto timeout después de que el servicio externo aceptara la mutación, o puede haber fallado antes de crearla. En el primer caso el estado real podría ser `UNKNOWN`; en el segundo, `FAILED`. La misma frase del agente oculta dos resultados de negocio distintos.

La evaluación necesita unir al menos cuatro capas:

1. **Resultado.** ¿La intención del usuario quedó satisfecha y el estado externo correcto?
2. **Control conversacional.** ¿El turno terminó donde debía, hubo falsa interrupción, solape o barge-in mal resuelto?
3. **Media y percepción.** ¿Qué audio entró, qué audio se generó y qué llegó a la frontera de playout?
4. **Runtime y dependencias.** ¿Qué provider, tool, proceso o transporte falló, reintentó, hizo fallback o se reconectó?

{{ include_html("snippets/articulos-tecnicos/voice-turn-evidence-stack.html") }}

Ninguna capa sustituye a las demás. Una conversación «correcta» en texto no valida la media. Una traza limpia del LLM no valida que el usuario oyera el audio. Un HTTP 200 de una tool no valida que el agente interpretara bien la intención.

## El objeto mínimo de análisis debe ser el turno lógico

Una sesión completa es demasiado grande para muchas decisiones. Una request de proveedor es demasiado pequeña. El objeto útil suele ser un **turno lógico**: desde la evidencia de que el usuario está intentando comunicar algo hasta que el sistema termina la respuesta relevante o decide no responder.

No todos los runtimes delimitan ese turno de la misma forma, así que guarda tus propios identificadores además de los del framework:

```text
session_id
turn_id
speech_id / provider_response_id / tool_call_id
agent_version
prompt_version
model + provider + region
transport/path
started_at / speech_stop / turn_commit / first_playout / turn_end
outcome
first_harmful_observable
root_cause
recovery
user_impact
```

Los IDs de proveedor son útiles para depurar, pero no deben convertirse en tu clave canónica. Un fallback puede crear dos requests para un solo turno. Un reintento de tool puede crear varios intentos para una única operación lógica.

### Observado, inferido y juzgado no son lo mismo

Marca la procedencia de cada señal:

- **observado:** un evento, timestamp, estado de base de datos, packet counter o resultado de tool que realmente registraste;
- **inferido:** una conclusión derivada de varias señales, por ejemplo «probable pérdida de media después de TURN/TCP»;
- **juzgado:** una clasificación humana o de un modelo, por ejemplo «la respuesta resolvió la intención».

No conviertas automáticamente un judge probabilístico en ground truth. Conserva el input del judge, versión/modelo, criterio, output y, cuando importe, calibración contra humanos.

## Separa síntoma, causa y recuperación

Una taxonomía con una sola etiqueta como `LLM_ERROR` pierde la mayor parte de la información útil.

Modela el fallo con dimensiones separadas:

```text
stage       = turn | media | stt | llm | tts | tool | transport | runtime | business_state
symptom     = no_audio | wrong_answer | late_response | overlap | duplicate_effect | ...
cause       = endpointing | timeout | provider_5xx | auth | queue_saturation | crash | ...
recovery    = none | retry | fallback | reconnect | reconcile | compensate | user_retry
user_impact = none | delay | degraded_audio | repeated_speech | wrong_action | dropped_call
```

La diferencia entre **primer observable dañino** y **causa raíz** es especialmente importante. El usuario puede notar «respuesta tardía» porque un fallback se activó después de un timeout. El primer observable dañino es latencia; la causa raíz puede ser un provider timeout; la recuperación fue fallback; el outcome final puede seguir siendo correcto.

Esto permite responder preguntas distintas sin reescribir la taxonomía:

- ¿Qué está dañando más a usuarios?
- ¿Qué dependencia provoca más fallos internos?
- ¿Qué mecanismos de recuperación están evitando impacto?
- ¿Qué fallos llegan a producción porque no existen como casos de regresión?

## Una taxonomía de voz debe incluir fallos que no existen en chat

Como mínimo, cubre estas familias.

| Frontera | Ejemplo de fallo | Evidencia necesaria |
|---|---|---|
| ingreso de media | no llega audio o llega sólo un canal | transport events, RTP/WebRTC/carrier counters, track state |
| speech/turn detection | falso final de turno o final demasiado tardío | VAD/EOU events, transcript timing, `turn_id` |
| interrupción | backchannel interpretado como barge-in | speech events, interruption decision, playback state |
| STT | transcript incorrecto que cambia intención | audio de entrada + transcript + confidence/evidence si existe |
| LLM/realtime model | respuesta errónea, tool equivocada o timeout | request/response trace, tool plan, provider error |
| tool/business state | tool dijo éxito pero el efecto no existe | `operation_id`, system of record, reconciliation result |
| TTS | audio incorrecto, truncado o tardío | synthesized chunks, TTS error/latency, expected text |
| playout | se generó audio pero no llegó a reproducirse | output queue, carrier/player acknowledgement boundary |
| transporte | reconnect, relay inesperado, jitter/loss | candidate/path, reconnect events, jitter/loss windows |
| runtime | crash, worker restart, handoff/state loss | process logs, session events, durable-state reconstruction |

No uses `model_error` como cajón de sastre para una tool que falló, un jitter buffer que creció o un turn detector que cerró pronto.

## Métricas: empieza por el denominador

Una métrica de reliability sólo es interpretable si define qué cuenta y qué excluye.

Por ejemplo:

```text
turn_failure_rate
  = turns_with_user_visible_failure / eligible_logical_turns

internal_failure_rate
  = turns_with_any_internal_failure / eligible_logical_turns

recovery_success_rate
  = internally_failed_turns_recovered_without_user_visible_failure
    / internally_failed_turns

unknown_effect_rate
  = mutating_actions_ending_UNKNOWN / admitted_mutating_actions

retry_amplification
  = provider_or_tool_attempts / logical_operations
```

No mezcles un «turn failure rate» calculado sobre turns con un provider error rate calculado sobre requests. Fallback y retry cambian el número de requests sin cambiar necesariamente el número de turns.

Segmenta además por variables que cambian el mecanismo: versión del agente, provider/modelo, idioma, transport, carrier, región, device class, route ICE/TURN, codec, tool y tipo de intención. Si agregas todo, una regresión grave en una cohorte pequeña puede desaparecer en la media.

Para latencia conserva distribuciones por frontera y no sólo un promedio. El capítulo 3 ya separó `speech_stop → turn_commit → first_playout`; aquí esa frontera debe viajar con el outcome y la taxonomía de fallo, no vivir en otro dashboard aislado.

## No todo fallo interno debe bloquear el release

Un sistema fiable no es uno sin errores internos. Es uno que cumple el contrato de usuario dentro de un failure model conocido y hace visible cuando no puede hacerlo.

Ejemplo:

```text
attempt 1: TTS provider A -> timeout
fallback: provider B -> first playable audio
outcome: respuesta correcta
user impact: +620 ms de delay
```

La observabilidad debe registrar el timeout y el fallback. La evaluación de outcome no debe convertir automáticamente el turno en fracaso. A la vez, si la latencia supera el presupuesto de experiencia, ese mismo turno puede fallar un SLO de interacción aunque complete la tarea.

Por eso separa al menos:

- **correctness:** ¿hizo lo correcto?
- **interaction quality:** ¿turnos, interrupciones, audio y timing fueron aceptables?
- **reliability:** ¿el sistema mantuvo el contrato ante fallos esperables?
- **recovery cost:** ¿cuántos retries/fallbacks/segundos extra necesitó?

## Define invariantes que un judge no debería decidir

Hay propiedades que son deterministas y deben validarse como tales:

- una operación con el mismo `operation_id` no debe producir dos efectos de negocio;
- un audio cancelado no debe seguir entrando a la cola de playout después de la frontera acordada;
- un `turn_id` no debe cambiar a mitad de una misma operación lógica;
- un resultado `UNKNOWN` no debe convertirse en `SUCCESS` sin reconciliación o evidencia del system of record;
- una tool destructiva no debe ejecutarse sin el estado/permiso requerido;
- una sesión recuperada no debe reutilizar estado in-memory como si fuera durable.

Reserva judges para propiedades semánticas o perceptivas que no pueden reducirse a una aserción determinista.

## Evaluación por capas: de barato y determinista a realista

No existe un único «eval score» que sustituya toda la estrategia. Construye una escalera.

### 1. Tests de componentes e invariantes

Prueba parsers, state machines, idempotencia, cancelación, transformaciones de audio y tool adapters con inputs controlados. Aquí quieres reproducibilidad y diagnosis rápida.

### 2. Tests de comportamiento del agente

Comprueba turnos concretos, argumentos de tools, handoffs, políticas y respuestas esperadas. El framework puede ayudarte, pero documenta qué capas quedan fuera.

LiveKit Agents ofrece un test framework integrado con pytest/Vitest que valida mensajes, tool calls, argumentos y handoffs. La documentación actual lo define como **text-based**, ejecutable localmente o en CI; usa el proveedor LLM real pero no crea una conexión a una room.[^livekit-testing]

Eso es útil para lógica del agente. No certifica WebRTC, SIP, carrier, jitter, VAD/audio real o playout de producción.

Pipecat Evals ejecuta escenarios contra el agente real. En text mode evita STT/TTS; en audio mode ejercita la pipeline STT/LLM/TTS. Sin embargo, el **eval transport sustituye Daily/WebRTC/telephony por un servidor local RTVI/WebSocket**, por lo que incluso un eval de audio no prueba el transport de producción.[^pipecat-evals]

### 3. Audio y escenarios multi-turn

Añade audio fijo o generado, ruido, interrupciones, pronunciaciones difíciles, cambios de intención y resultados de tools adversos. Si el audio concreto que falló importa, conviértelo en fixture reproducible en vez de confiar sólo en síntesis nueva cada run.

### 4. Pruebas sobre el transport desplegado

Ejecuta llamadas reales o simuladas sobre las rutas que usan tus usuarios: navegador/WebRTC, SIP/PSTN o carrier WebSocket. Aquí aparecen NAT, codec negotiation, packet loss, reconnection y buffering que un eval transport no reproduce.

### 5. Producción y review humano

Muestrea sesiones reales con reglas explícitas de privacidad y retención, detecta clusters de fallo, revisa casos ambiguos y convierte fallos repetibles en nuevos tests. Producción no es tu único eval set; es una fuente de casos y distribuciones que los tests sintéticos no conocen.

## El replay correcto no es «volver a enviar la transcripción»

Hay varios niveles de replay:

1. **Transcript replay:** reproduce texto. Sirve para lógica, contexto y tools mockeadas.
2. **Audio replay:** usa el mismo audio de entrada para STT/turn-taking y, si procede, compara salida.
3. **Event replay:** reproduce eventos de framework/transport con timestamps controlados.
4. **Dependency replay:** sustituye providers/tools por respuestas registradas para aislar una state machine.
5. **Full-path replay:** atraviesa el transport y dependencias reales o sus equivalentes de staging.

El nivel correcto depende del fallo. Un error de prompt puede reducirse a texto. Un falso barge-in necesita audio y timing. Un bug de reconnect puede requerir eventos de transporte. Un doble cobro necesita el ledger de operaciones y el system of record.

Guarda siempre la versión del agente, prompt/config y dependencias relevantes para poder explicar por qué un replay ya no reproduce un caso antiguo.

## Observabilidad: una traza debe conectar el turno, no sólo providers

Una traza útil tiene un span o correlación estable para el turno lógico y enlaza los intentos internos. Una estructura conceptual puede ser:

```text
voice.session
└── voice.turn              turn_id=...
    ├── turn.detect
    ├── stt.finalize
    ├── model.response      attempt=1
    ├── tool.operation      operation_id=...
    ├── model.response      attempt=2 / fallback if needed
    ├── tts.synthesize
    └── media.playout
```

No inventes cardinalidad alta en labels de métricas con texto libre, transcript completo o IDs únicos. OpenTelemetry recomienda que `error.type` sea predecible y de baja cardinalidad; las operaciones correctas no deberían llevar `error.type`, y los errores deben poder agregarse sin crear una serie por mensaje.[^otel-errors]

Conserva los detalles de alta cardinalidad en traces/logs o storage apropiado, enlazados por IDs, no como dimensions de cada métrica.

## LiveKit: qué observas en el SDK y qué pertenece a Cloud

LiveKit Agents expone datos de sesión desde el SDK: `session.history`, eventos durante los turnos, métricas por componente/turno/sesión y un `SessionReport` final. `ctx.make_session_report()` y `to_dict()` trabajan con datos del proceso y funcionan también en deployments self-hosted; no requieren una request a LiveKit Cloud.[^livekit-data]

El SDK también instrumenta sesiones con OpenTelemetry y permite exportar spans a un backend compatible.[^livekit-tracing]

**Agent insights**, en cambio, es una capacidad de LiveKit Cloud. Su timeline combina transcript, traces, logs y audio. Funciona para agentes desplegados en Cloud y para agentes self-hosted conectados a media servers de LiveKit Cloud; no funciona con media servers completamente self-hosted.[^livekit-insights]

Esa distinción importa al comparar stacks. «LiveKit tiene una timeline con audio» no significa que el paquete open-source de Agents incluya por sí solo ese backend gestionado.

Además, los logs de una session no cubren necesariamente crashes/startup/dispatch fuera de una sesión; la documentación de Insights separa esos eventos de servidor y apunta a log drains para ese dominio.[^livekit-insights]

### Los errores recuperables tampoco equivalen a turns correctos

`AgentSession` emite `ErrorEvent` para STT, LLM, TTS y realtime model. La propiedad `recoverable` pertenece al objeto `error`: `ev.error.recoverable`. Cuando es `True`, la operación puede recuperarse automáticamente; cuando es `False`, la sesión se cierra salvo intervención.[^livekit-errors]

Registra el error interno y el recovery, pero decide el outcome del turno con evidencia adicional. Un `recoverable=True` sólo describe semántica de recuperación del runtime, no éxito del producto.

## Pipecat: observa frames y turns, pero conserva las fronteras

Pipecat puede emitir `MetricsFrame` con métricas de performance/usage. `UserBotLatencyObserver` mide entre la parada de habla detectada del usuario y el inicio de habla del bot, y puede añadir breakdowns por servicio cuando las métricas están activadas.[^pipecat-metrics][^pipecat-userbot]

`TurnTrackingObserver` expone inicio/fin de turnos e interrupciones. Otros observers pueden registrar actividad de LLM, transcripción y startup.[^pipecat-observers]

Para errores, un `FrameProcessor` dispara `on_error` antes de propagar `ErrorFrame` upstream. El frame expone mensaje, excepción opcional, `fatal` y el processor de origen. En la API actual, `fatal=True` indica un error no recuperable que cancela el pipeline; `fatal=False` permite que la aplicación capture el error y aplique una estrategia como failover sin forzar ese shutdown.[^pipecat-errors]

Estas primitives permiten un ledger detallado del pipeline. No conviertas sus nombres en tu única taxonomía de producto. `fatal=False` no demuestra que el turno haya salido bien: sólo evita que ese error obligue a terminar el pipeline. No dice por sí solo si una reserva quedó creada, si existió recovery en otra capa o si el usuario oyó audio parcial.

Pipecat Evals completa la parte local de regresión, pero su propia documentación separa explícitamente lo que queda fuera: transport desplegado, carga/concurrencia, estado oculto de tools, producción drift, replay de audio exacto y trend/bake-off persistente requieren capas adicionales.[^pipecat-lifecycle]

## LiveKit Agents vs Pipecat vs vanilla/thin para evals y observabilidad

No hay ganador universal. La decisión depende de cuánto del schema de evidencia y de la infraestructura de calidad quieres que posea el runtime frente a tu aplicación.

| Dimensión | LiveKit Agents | Pipecat | Vanilla/thin Python |
|---|---|---|---|
| eventos de runtime | eventos de sesión, métricas, reports, OTel | frames, processor events, metrics, observers | los defines y emites tú |
| tests cercanos al código | framework text-based para behavior/tools/handoffs | Pipecat Evals text/audio sobre eval transport | harness propio o librerías independientes |
| observabilidad gestionada | Agent insights es LiveKit Cloud, no core self-hosted | extras de Pipecat Cloud son managed, no core | tu backend/OTel/vendor elegido |
| transport de producción | necesita pruebas separadas del test framework | eval transport no certifica WebRTC/SIP/telephony | debes construir/integrar el transport y su harness |
| failure taxonomy de negocio | aplicación | aplicación | aplicación |
| replay exacto | exporta/conserva los datos que necesites | exporta/conserva los datos que necesites | posesión total, también responsabilidad total |
| velocidad vs control | más primitives y convenciones | gran visibilidad del pipeline/frame graph | máximo control; mayor superficie que diseñar y operar |

### Elige LiveKit Agents cuando

Ya utilizas sus sesiones/media/agents y quieres eventos, métricas, reports y test helpers alineados con ese runtime. Si además aceptas LiveKit Cloud como media/observability plane, Agent insights reduce trabajo de integración. Mantén fuera de ese supuesto tu ground truth de negocio, policy de sampling, casos de regresión y cualquier retention que deba superar el servicio gestionado.

### Elige Pipecat cuando

La pipeline explícita y la observabilidad a nivel de frames/processors te ayudan a localizar fallos, y quieres Evals cerca del repositorio. Conserva pruebas separadas para el transport real, load/concurrency, tool side effects y audio exacto cuando esas fronteras importan.

### Elige vanilla/thin cuando

Necesitas un schema de evidencia propio, control exhaustivo de protocolos/eventos o un harness que no encaja en las abstracciones anteriores. Ahora tú posees IDs, traces, metrics, structured logs, error taxonomy, sampling, redaction, audio capture, replay, fixtures, judges, dashboards, alerts, retention, CI gates y correlación con estado de negocio. Menos runtime no significa menos sistema.

### Un híbrido suele ser razonable

Puedes usar LiveKit o Pipecat para runtime/media y mantener un **turn ledger canónico de la aplicación** exportado a OpenTelemetry + tu almacén de evals. Esa separación evita que cambiar de framework destruya tu historial de calidad y permite que el outcome de negocio siga viniendo del system of record.

## Tres fallos concretos y cómo evaluarlos

### Caso 1 — El agente tarda, pero responde bien

Evidencia:

```text
turn_commit = 10:00:00.000
provider timeout at attempt 1
fallback attempt 2 succeeds
first_playout = 10:00:01.420
business outcome = SUCCESS
```

No etiquetes `wrong_answer`. Registra provider failure + recovery + latency impact. El gate puede fallar por interaction latency aunque la tarea sea correcta.

### Caso 2 — El agente dice «reservado», pero la tool quedó UNKNOWN

La transcripción parece correcta. El eval real debe consultar el `operation_id` y el system of record. Si no existe evidencia de commit, el turno no es success sólo porque el modelo lo afirmara.

Convierte el caso en una regresión con tool fixture que simule «request enviada + response perdida» y exige reconciliación antes de confirmar al usuario.

### Caso 3 — El usuario interrumpe y sigue oyendo audio viejo

Necesitas audio/timestamps o eventos de playout. Un transcript replay no reproduce el bug. El caso debe conservar la secuencia `user_speech_start → interruption accepted → generation cancelled → output queue cleared → playback stopped` y probar la frontera que realmente controla el dispositivo/carrier.

## De producción a eval sin copiar basura

No conviertas cada sesión mala en un test completo. Primero minimiza el caso.

```text
production failure
→ classify stage/symptom/cause/recovery/impact
→ isolate smallest reproducible evidence
→ choose transcript/audio/event/dependency/full-path replay
→ add deterministic assertions where possible
→ add judge only for irreducibly semantic/perceptual properties
→ gate the regression at the cheapest layer that can reproduce it
```

Si el fallo sólo aparece en PSTN con un carrier concreto, un test de texto no es el gate correcto. Si el fallo es una idempotency bug de tool, no necesitas una llamada telefónica completa para bloquearlo.

El objetivo es que cada incidente reduzca la probabilidad de repetir **el mismo mecanismo de fallo**, no acumular una carpeta de conversaciones difíciles de ejecutar y entender.

## Seguridad y privacidad forman parte de observabilidad

Audio, transcripts, tool arguments y traces pueden contener información sensible. Decide explícitamente:

- qué señales recoges y por qué;
- qué se redacciona antes de salir del proceso;
- quién puede leer audio/transcript/tool payloads;
- cuánto tiempo se retienen;
- qué se muestrea frente a qué se conserva completo;
- cómo borras datos asociados a una sesión/usuario cuando el producto lo requiera.

No asumas que la redacción de un servicio gestionado protege datos que tu propia aplicación exportó antes a otro backend. LiveKit, por ejemplo, documenta que su PII redaction se aplica a datos almacenados en LiveKit Cloud; los datos que el agente recolecta o exporta por su cuenta quedan fuera de esa redacción.[^livekit-pii]

En vanilla, todo ese contrato es responsabilidad explícita de la aplicación. En cualquier framework, el business state y las credenciales de tools siguen necesitando controles independientes de la telemetría.

## Checklist de un gate GOLDEN para un agente de voz

Antes de confiar en un release:

1. Define el `turn_id` y las fronteras temporales que usarán todos los componentes.
2. Separa outcome, interaction quality, media y runtime/dependency health.
3. Define una taxonomía con stage, symptom, cause, recovery y user impact.
4. Define cada denominator antes de publicar un rate.
5. Guarda intentos internos separados de operaciones lógicas.
6. Mantén `UNKNOWN` como estado real para side effects no reconciliados.
7. Usa assertions deterministas para invariantes y judges sólo donde aportan señal.
8. Ejecuta tests baratos de behavior en cada cambio relevante.
9. Añade audio cuando el fallo dependa de STT/TTS/VAD/turn-taking.
10. Prueba el transport desplegado cuando WebRTC/SIP/carrier/network sean parte del riesgo.
11. Correlaciona traces/logs/metrics/audio con el mismo session/turn/operation schema.
12. Segmenta métricas por versión, provider, transport, región e intención relevante.
13. Guarda failure + recovery, no sólo el estado final.
14. Minimiza fallos de producción y conviértelos en regressions reproducibles.
15. Mantén privacy, redaction, access y retention como parte del diseño de observabilidad.

Una buena plataforma de observabilidad te ayuda a ver eventos. Una buena estrategia de evaluación decide qué significan esos eventos para el producto. La reliability aparece cuando ambas capas se conectan con un failure model explícito y cada fallo repetible termina en un gate que puede impedir su regreso.

## Referencias

[^livekit-testing]: LiveKit, [Testing and evaluation](https://docs.livekit.io/agents/start/testing/).
[^livekit-data]: LiveKit, [Data hooks](https://docs.livekit.io/deploy/observability/data/).
[^livekit-tracing]: LiveKit, [Export traces](https://docs.livekit.io/deploy/observability/tracing/).
[^livekit-insights]: LiveKit, [Agent insights in LiveKit Cloud](https://docs.livekit.io/deploy/observability/insights/).
[^livekit-errors]: LiveKit, [Events and error handling](https://docs.livekit.io/reference/agents/events/).
[^livekit-pii]: LiveKit, [PII redaction](https://docs.livekit.io/deploy/observability/pii-redaction/).
[^pipecat-evals]: Pipecat, [Pipecat Evals](https://docs.pipecat.ai/pipecat/evals/overview).
[^pipecat-lifecycle]: Pipecat, [Evals Lifecycle](https://docs.pipecat.ai/pipecat/evals/lifecycle).
[^pipecat-metrics]: Pipecat, [Metrics](https://docs.pipecat.ai/pipecat/fundamentals/metrics).
[^pipecat-userbot]: Pipecat, [User-Bot Latency Observer](https://docs.pipecat.ai/api-reference/server/utilities/observers/user-bot-latency-observer).
[^pipecat-observers]: Pipecat, [Observer Pattern](https://docs.pipecat.ai/api-reference/server/utilities/observers/observer-pattern).
[^pipecat-errors]: Pipecat, [FrameProcessor Events — Error Handling](https://docs.pipecat.ai/api-reference/server/events/frame-processor-events).
[^otel-errors]: OpenTelemetry, [Recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/).
