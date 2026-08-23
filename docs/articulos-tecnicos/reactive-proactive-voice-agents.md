---
title: Agentes reactivos y proactivos en voz
description: "Cómo separar la conversación, las tools asíncronas y la entrega de resultados para que un agente de voz no bloquee el turno, interrumpa mal o repita mensajes."
date: 2026-08-04
date_modified: 2026-08-23
keywords: "agentes de voz, agente reactivo, agente proactivo, tool calls asíncronas, barge-in, full duplex, runtime conversacional, Twilio Media Streams, Pipecat"
article_state: published
tags:
  - IA
  - Voz
  - Agentes
  - Tool Calling
  - Arquitectura
  - Runtime
---

# Agentes reactivos y proactivos en voz

> **Idea:** que una operación haya terminado no significa que el agente pueda hablar en ese momento.  
> **Alcance:** telefonía o WebRTC, tools que tardan, interrupciones, playback y resultados que vuelven más tarde.  
> **Objetivo:** aceptar la petición rápido, ejecutar fuera del turno y entregar un único cierre cuando encaje en la conversación.

En texto, el patrón reactivo-proactivo parece bastante limpio. El usuario pide algo, el agente confirma que lo está gestionando, la tool trabaja en segundo plano y el resultado aparece cuando está listo.

En voz se complica. El usuario puede seguir hablando mientras la operación continúa. El modelo puede estar generando otra respuesta. El TTS puede tener audio preparado y el proveedor telefónico puede seguir reproduciendo un fragmento que el runtime ya intentó cancelar.

Por eso no basta con añadir un callback que diga *“la tool ha terminado”*. Hay que coordinar cuatro relojes:

1. La actividad acústica del usuario
2. La respuesta que está generando el agente
3. El audio que de verdad ha llegado a reproducirse
4. Las operaciones que siguen vivas fuera del turno

El patrón funciona cuando esos relojes se mantienen separados. La aceptación puede ser reactiva, la ejecución puede ser asíncrona y la entrega puede ser proactiva. Aun así, solo un componente debe controlar la voz y decidir cuándo vuelve a hablar el agente.

{{ include_html("snippets/articulos-tecnicos/voice-rp-contract.html") }}

## Reactivo y proactivo hablan de la entrega

Un agente reactivo responde a una petición del usuario. Puede escucharla, decidir que necesita una tool y devolver una aceptación corta:

> “Lo reviso ahora. Puedes seguir contándome el resto.”

Ese mensaje no confirma el resultado. Solo confirma que el sistema ha entendido la petición y ha aceptado el trabajo.

Un agente proactivo vuelve cuando tiene una actualización relevante, aunque el usuario no haya preguntado otra vez. En texto, eso suele ser un nuevo mensaje. En voz hay una decisión adicional: **cuándo decirlo**.

Antes de hablar, el runtime tiene que saber si el usuario sigue hablando, si hay otra respuesta en reproducción, si el resultado aún tiene sentido y si conviene esperar a que terminen otras operaciones del mismo lote.

El flujo real se parece más a esto:

```text
petición aceptada
→ operación registrada
→ ejecución en segundo plano
→ resultado disponible
→ política de entrega
→ ventana segura
→ audio reproducido o resultado unido al siguiente turno
```

La operación y la conversación avanzan a ritmos distintos. El runtime tiene que conservar ambas líneas temporales sin mezclarlas.

{{ include_html("snippets/articulos-tecnicos/voice-rp-safe-window.html") }}

## Los cuatro relojes de una llamada

En una llamada real conviven varias máquinas de estado. Colapsarlas en un único `is_busy` suele ser el principio de los problemas.

### 1. Qué está haciendo el usuario

```text
quiet → speech_started → speaking → speech_stopped → quiet
```

Un booleano `is_user_speaking` se queda corto. El VAD trabaja con incertidumbre, necesita ventanas de silencio y puede corregir una decisión después.

Un VAD agresivo responde antes, pero también puede cortar frases. Uno conservador protege mejor el turno, aunque añade espera. Esa decisión forma parte del producto, no es solo un parámetro técnico.

### 2. Qué está generando el agente

```text
planned → generating → completed
                  ↘ cancelled
```

Una respuesta puede estar terminada dentro del modelo y no haber llegado todavía al usuario. También puede cancelarse después de producir texto o audio parcial.

### 3. Qué audio se ha reproducido

```text
queued → sent → playing → played
                    ↘ cleared
```

Esta separación es crítica. En Twilio Media Streams se pueden enviar eventos `media`, asociar un `mark` y usar `clear` para vaciar el buffer. El `mark` ayuda a seguir el audio enviado, pero un `clear` también devuelve los marks que seguían pendientes. Por eso el runtime necesita saber qué audio terminó de reproducirse y qué audio fue eliminado antes de llegar al usuario.[^twilio-websocket]

### 4. Qué operación sigue en marcha

```text
accepted → running → succeeded
                   ↘ failed
                   ↘ cancelled_by_policy
```

Una interrupción suele cancelar la respuesta y el playback. No debería cancelar automáticamente una transferencia, una reserva o una búsqueda que ya se había aceptado.

Usar el mismo `cancel` para todo mezcla dos decisiones distintas. Una es acústica. La otra es de negocio.

{{ include_html("snippets/articulos-tecnicos/voice-rp-clocks.html") }}

## El turno se queda corto

Los frameworks de conversación suelen organizar el estado alrededor de turnos. Para una tool asíncrona, eso no basta.

Una petición puede crear varias operaciones. Cada una puede acabar en un momento distinto y el cierre puede llegar durante otro turno. Por eso el runtime necesita identidades explícitas:

```python
@dataclass(frozen=True)
class VoiceContext:
    session_id: str
    turn_id: str
    response_id: str | None
    playback_id: str | None

@dataclass(frozen=True)
class OperationContext:
    operation_id: str
    batch_id: str
    intent_key: str
    created_from_turn_id: str
```

Cada identificador contesta una pregunta:

- `session_id`: a qué conversación pertenece
- `turn_id`: qué intervención originó la decisión
- `operation_id`: qué consulta o efecto estamos siguiendo
- `batch_id`: qué operaciones deberían cerrarse juntas
- `response_id`: qué generación se puede cancelar
- `playback_id`: qué audio se envió, se reprodujo o se eliminó
- `intent_key`: cómo evitamos repetir el mismo efecto durante un retry o un replay

El historial no debería guardar todo ese estado. Sirve para reconstruir qué se dijo. No es una base fiable para saber si una operación se aceptó, se reintentó, terminó o ya se comunicó.

Una separación mínima puede verse así:

```python
class VoiceRuntimeState:
    channel: ChannelState
    responses: dict[str, ResponseState]
    playbacks: dict[str, PlaybackState]
    operations: dict[str, OperationState]
    batches: dict[str, BatchState]
    pending_deliveries: deque[DeliveryEnvelope]
    idempotency: dict[str, OperationResult]
```

Esta estructura permite fijar una regla sencilla: **una operación terminada puede producir como máximo un cierre final audible**, incluso si el callback llega dos veces o el proceso se reinicia.

## La primera respuesta acepta trabajo

La aceptación tiene dos objetivos. Debe confirmar que el agente ha entendido la petición y debe liberar la conversación.

No puede prometer un resultado que todavía no existe.

```python
async def accept_tool_call(call: ToolCall, ctx: VoiceContext) -> Acceptance:
    operation = await operation_store.create_once(
        intent_key=build_intent_key(call, ctx),
        payload=call.arguments,
        created_from_turn_id=ctx.turn_id,
    )

    await queue.publish(
        "operation.accepted",
        operation_id=operation.id,
        session_id=ctx.session_id,
    )

    return Acceptance(
        speech="Lo estoy revisando. Puedes seguir.",
        operation_id=operation.id,
    )
```

La diferencia entre “hecho” y “lo estoy gestionando” es pequeña en palabras, pero enorme en el contrato del sistema. La primera frase afirma un estado final. La segunda cuenta que el trabajo ha empezado.

En voz, además, interesa que la aceptación sea corta. Cuanto más se alarga, más tiempo ocupa el canal y más probable es que el usuario interrumpa.

## El resultado pasa por un `ActivityGate`

La tool no debería llamar directamente a `speak()` cuando termina. Primero publica un evento y después una política de entrega decide qué hacer.

```python
@dataclass
class DeliveryEnvelope:
    delivery_id: str
    session_id: str
    batch_id: str
    priority: Literal["normal", "urgent"]
    summary: str
    became_ready_at: datetime
    source_operation_ids: tuple[str, ...]
```

El `ActivityGate` mira el estado real de la conversación:

```python
async def choose_delivery(
    envelope: DeliveryEnvelope,
    channel: ChannelSnapshot,
) -> DeliveryDecision:
    if envelope.priority == "urgent" and channel.can_interrupt:
        return DeliverNow(interrupt=True)

    if channel.user_is_speaking:
        return QueueUntilQuiet(min_quiet_ms=650)

    if channel.playback_is_active:
        return QueueAfterPlayback()

    if channel.turn_is_open:
        return AttachToNextResponse()

    if envelope.is_stale:
        return SuppressAndPersist()

    return DeliverNow(interrupt=False)
```

A partir de ahí puede:

- Entregar el resultado ahora si hay silencio y sigue siendo relevante
- Esperar una ventana de calma si el usuario está hablando
- Agruparlo con otras operaciones del mismo lote
- Incorporarlo a la siguiente respuesta
- Interrumpir solo cuando la prioridad lo justifique
- Suprimirlo si ya quedó obsoleto

La ventana de silencio no tiene por qué ser igual en todos los casos. Puede cambiar por canal, idioma, dominio y tipo de actualización.

Interrumpir para decir que una búsqueda terminó suele ser peor que esperar. Interrumpir para avisar de que un pago va a salir con datos incorrectos puede estar justificado.

{{ include_html("snippets/articulos-tecnicos/voice-rp-gate.html") }}

## Barge-in: se cancela la voz, no todo el sistema

Cuando el usuario empieza a hablar, el agente debe dejar de sonar rápido. La cancelación correcta es selectiva.

Un barge-in suele requerir:

1. Cancelar la generación activa
2. Detener el TTS o la salida S2S
3. Vaciar el buffer de playback
4. Ajustar el historial al audio que sí llegó a escucharse
5. Mantener las operaciones en marcha salvo que la nueva intención las invalide

Ese camino de interrupción puede presupuestarse explícitamente con el [explorador de latencia para agentes de voz](/herramientas/latencia-agente-voz/), que separa detección de habla, cancelación, TTS, buffering y parada efectiva del playback.

El SDK de voz de OpenAI expone este patrón al reaccionar a `input_audio_buffer.speech_started`. La aplicación puede cancelar la salida y truncar el audio del asistente para que el estado refleje solo lo que la persona oyó.[^openai-voice-agents]

En telefonía, `clear` y `mark` permiten aplicar el mismo principio sobre el buffer de Twilio.[^twilio-websocket]

```python
async def on_barge_in(event: SpeechStarted, session: VoiceSession) -> None:
    if session.active_response_id:
        await realtime.cancel_response(session.active_response_id)

    if session.active_playback_id:
        played_ms = await playback.estimate_played_ms(session.active_playback_id)
        await realtime.truncate_assistant_audio(
            response_id=session.active_response_id,
            audio_end_ms=played_ms,
        )
        await playback.clear(session.active_playback_id)

    # Las operaciones siguen vivas hasta que la política decida lo contrario.
    await operation_policy.reconcile_with_new_turn(session.session_id)
```

El usuario puede decir “no hagas la transferencia” y cancelar una operación. Empezar una nueva pregunta no debería tener el mismo efecto.

{{ include_html("snippets/articulos-tecnicos/voice-rp-barge.html") }}

## Varias tools deberían producir un solo cierre

Un mismo turno puede comprobar disponibilidad, recuperar los datos del cliente y calcular una alternativa.

Si cada callback habla por su cuenta, la llamada se llena de interrupciones:

> “Ya tengo la disponibilidad.”  
> “También he recuperado tus datos.”  
> “Y ya está calculada la alternativa.”

Es mejor tratar esas operaciones como un lote semántico.

Pipecat tiene primitivas alineadas con esta idea. Una function call puede sobrevivir a una interrupción y devolver el resultado cuando termina. Además, las llamadas del mismo grupo comparten `group_id`, así que el LLM puede reactivarse una sola vez cuando acaba la última.[^pipecat-functions][^pipecat-frames]

```python
@dataclass
class BatchState:
    batch_id: str
    operation_ids: set[str]
    completed_ids: set[str]
    final_delivery_id: str | None = None

    @property
    def drained(self) -> bool:
        return self.operation_ids == self.completed_ids
```

Al completar una operación:

```python
async def on_operation_finished(result: OperationResult) -> None:
    await store.record_result_once(result)

    batch = await store.mark_batch_member_complete(
        batch_id=result.batch_id,
        operation_id=result.operation_id,
    )

    if not batch.drained:
        return

    envelope = await delivery_store.create_once(
        delivery_key=f"batch:{batch.batch_id}:final",
        payload=summarize_batch(batch),
    )
    await delivery_bus.publish(envelope)
```

`record_result_once` y `create_once` son importantes porque producción incluye retries, timeouts ambiguos y entregas *at least once*. El diseño no puede depender de que cada evento llegue exactamente una vez.

{{ include_html("snippets/articulos-tecnicos/voice-rp-batch.html") }}

## Cuando no hay hueco, el resultado espera

A veces no aparece una ventana segura para hacer un follow-up. El usuario puede seguir hablando, el agente puede estar respondiendo a otra intención o la llamada puede terminar antes de que llegue el resultado.

En esos casos, el cierre queda guardado como una entrega pendiente.

En el siguiente turno, el runtime puede inyectar un contexto efímero:

```text
Actualización pendiente de una operación anterior:
- La comprobación de disponibilidad terminó correctamente.
- Todavía no se ha comunicado al usuario.
- Esta actualización no sustituye la nueva petición.
```

El modelo puede unir ambos hilos de forma natural:

> “Antes de ir con eso, ya tengo la disponibilidad que me pediste. Hay hueco el jueves. Sobre tu nueva pregunta…”

Después de confirmar que el audio se reprodujo, el `delivery_id` pasa a `spoken`. Si el usuario interrumpe antes de oír el resultado, no se marca como entregado y puede volver a intentarse de forma más corta.

Así evitamos dos errores opuestos:

- Repetir un cierre que sí se escuchó
- Perder un cierre porque el sistema confundió audio generado con audio reproducido

## Un único componente controla la voz

La arquitectura queda más clara cuando separa tres planos.

### Interaction Surface

Escucha, detecta turnos, gestiona barge-in, produce backchannels, reproduce audio y aplica el `ActivityGate`. Es el único componente autorizado para hablar.

### Cognitive Execution Plane

Se encarga del razonamiento pesado, RAG, tools, retries, compensaciones e idempotencia. Puede seguir trabajando aunque la conversación haya cambiado de turno.

### Durable Coordination

Guarda eventos, locks, operaciones, lotes y entregas pendientes. Conecta los otros dos planos sin convertir el transcript en estado operativo.

{{ include_html("snippets/articulos-tecnicos/voice-rp-runtime.html") }}

Esta división también aparece en sistemas full-duplex recientes. GPT-Live, presentado por OpenAI el 8 de julio de 2026, mantiene la conversación en una superficie de voz mientras delega búsqueda, razonamiento más profundo y trabajo complejo a un modelo frontier.[^gpt-live]

La orquestación no desaparece. Simplemente deja de estar escondida.

## Reglas que el runtime debe cumplir

Estas reglas aportan más fiabilidad que añadir instrucciones al prompt:

1. No confirmar éxito antes de llegar a un estado terminal
2. Aceptar o recuperar cada efecto con una clave de idempotencia
3. Producir como máximo un cierre final por lote
4. Impedir que una tool hable directamente en el canal
5. Mantener una operación viva ante una interrupción acústica, salvo decisión explícita
6. Guardar en el historial solo el audio que el usuario pudo escuchar
7. Marcar un resultado como entregado solo después del playback o de una resincronización confirmada
8. Conservar los resultados pendientes durante cambios de turno y reinicios
9. Suprimir o sustituir las actualizaciones obsoletas
10. Tratar la prioridad como política de negocio y no como una improvisación del LLM

Una voz natural ayuda. No compensa una transferencia duplicada, una confirmación prematura o un resultado reproducido fuera de contexto.

## Qué medir

Un único número de latencia no describe este sistema. Como mínimo, conviene seguir:

| Métrica | Qué revela |
|---|---|
| `speech_stop_to_acceptance_audio_ms` | Tiempo desde el final del turno hasta la primera aceptación audible |
| `barge_in_to_playback_stop_ms` | Cuánto tarda el agente en dejar de sonar |
| `operation_accept_to_start_ms` | Espera interna antes de ejecutar |
| `operation_duration_ms` | Tiempo real de la dependencia externa |
| `operation_complete_to_delivery_ready_ms` | Coste de agregación y resumen |
| `delivery_ready_to_first_audio_ms` | Espera introducida por el `ActivityGate` |
| `generated_to_played_gap_ms` | Buffer y transporte de salida |
| `duplicate_side_effect_rate` | Fallos de idempotencia |
| `duplicate_delivery_rate` | Cierres repetidos |
| `stale_delivery_rate` | Resultados pronunciados demasiado tarde |
| `next_turn_resync_rate` | Cierres que no encontraron una ventana proactiva |
| `cancelled_response_unheard_ms` | Audio generado que se excluyó correctamente del contexto |

Cada traza debería enlazar `session_id`, `turn_id`, `operation_id`, `batch_id`, `response_id`, `playback_id` y `delivery_id`.

Sin esa correlación, un incidente se resume como “el bot interrumpió”. Con ella se puede saber si falló la ventana de silencio, llegó tarde un `mark` o se procesó dos veces el mismo callback.

## Qué probar antes de producción

El test suite tiene que reproducir conflictos temporales, no solo conversaciones ideales.

El [playground de fiabilidad y evaluación de agentes](/herramientas/fiabilidad-evaluacion-agentes/) permite convertir este tipo de trayectorias observables —decisiones de tools, retries, timeouts, cumplimiento de políticas y éxito final— en gates explícitos antes de publicar.

- La tool termina mientras el usuario sigue hablando
- La tool termina durante playback
- Dos tools del mismo lote acaban en orden inverso
- Un callback llega dos veces
- El usuario interrumpe antes de oír el cierre
- El usuario cancela de forma explícita una operación
- El canal se desconecta con entregas pendientes
- El proceso reinicia después del efecto y antes del follow-up
- Una nueva intención deja obsoleta una actualización anterior
- Un resultado urgente interrumpe y uno normal espera
- El TTS genera audio que Twilio todavía no ha reproducido
- El VAD dispara un falso `speech_started`

Un test útil no comprueba solo el texto. También comprueba el estado y los efectos:

```python
assert operation.side_effect_count == 1
assert batch.final_delivery_count == 1
assert playback.heard_text == conversation.assistant_text
assert pending_delivery.is_empty_after_confirmed_playback
assert durable_operation.was_not_cancelled_by_barge_in
```

## El patrón completo

Un agente reactivo-proactivo en voz no es un bot que simplemente “avisa luego”.

La aceptación reactiva mantiene la conversación en movimiento. El plano asíncrono ejecuta trabajo real sin bloquear el canal. La entrega proactiva devuelve el resultado cuando encuentra un hueco seguro. El estado persistente evita que una interrupción, un retry o un cambio de turno acaben en mensajes duplicados o efectos inconsistentes.

La regla que resume el diseño es esta:

> **La finalización técnica crea una entrega pendiente. La conversación decide cuándo puede escucharse.**

## Fuentes

[^openai-voice-agents]: OpenAI Agents SDK, [Build voice agents](https://openai.github.io/openai-agents-js/guides/voice-agents/build/). Describe VAD semántico, eventos de interrupción y truncado del audio del asistente.
[^twilio-websocket]: Twilio, [Media Streams WebSocket messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages). Contrato de `media`, `mark` y `clear` en streams bidireccionales.
[^pipecat-functions]: Pipecat, [Function calling](https://docs.pipecat.ai/pipecat/learn/function-calling). Ejecución asíncrona y política `cancel_on_interruption`.
[^pipecat-frames]: Pipecat, [Control frames](https://docs.pipecat.ai/api-reference/server/frames/control-frames). Agrupación de llamadas mediante `group_id`.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 8 de julio de 2026. Superficie full-duplex con delegación de búsqueda, razonamiento y trabajo complejo.
