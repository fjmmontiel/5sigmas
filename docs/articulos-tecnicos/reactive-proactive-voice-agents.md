---
title: Agentes reactivos y proactivos en voz
description: "Cómo desacoplar conversación, ejecución asíncrona y entrega de resultados en un agente de voz sin bloquear el turno, interrumpir al usuario ni duplicar mensajes."
date: 2026-08-04
date_modified: 2026-08-04
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

> **Tesis:** en voz, que una operación haya terminado no significa que el sistema tenga permiso para hablar.  
> **Alcance:** conversación telefónica o WebRTC, tool calls duraderas, interrupciones, playback y entrega diferida.  
> **Objetivo:** responder ahora, ejecutar fuera del turno y devolver un único cierre cuando sea conversacionalmente seguro.

El patrón reactivo-proactivo parece sencillo en texto. El usuario pide una operación, el agente acusa recibo sin bloquear el chat, la tool corre en segundo plano y el sistema vuelve cuando el resultado existe. En voz, ese mismo contrato se vuelve bastante más exigente porque el canal no es una secuencia limpia de mensajes: el usuario puede seguir hablando, el modelo puede estar generando, el sintetizador puede tener audio en cola y el proveedor telefónico puede continuar reproduciendo audio que el runtime ya considera cancelado.

Por eso, trasladar el patrón a voz no consiste en añadir un callback que diga *“la tool terminó”*. Consiste en coordinar cuatro relojes distintos:

1. la actividad acústica del usuario;
2. la generación del modelo;
3. el audio efectivamente reproducido;
4. las operaciones duraderas que siguen vivas fuera del turno.

La idea central de este report es separar esos relojes y sus estados. El agente puede ser reactivo en la aceptación, asíncrono en la ejecución y proactivo en la entrega, pero solo una **superficie de interacción** debe poseer el canal de voz y decidir cuándo puede volver a hablar.

{{ include_html("snippets/articulos-tecnicos/voice-reactive-proactive-panorama.html") }}

## Reactivo y proactivo describen la entrega, no el modelo

Un agente reactivo responde a un estímulo del usuario. En el caso más simple, escucha una petición, decide si necesita una tool y devuelve una aceptación inmediata:

> “Lo reviso ahora. Puedes seguir contándome el resto.”

Ese mensaje no confirma el resultado. Confirma que el sistema ha entendido una intención y ha aceptado trabajo. La operación queda registrada con una identidad propia y sale del turno visible.

Un agente proactivo vuelve sin esperar una nueva pregunta cuando existe una actualización relevante. En texto, esto suele ser un nuevo mensaje. En voz, la proactividad es una política de entrega mucho más delicada: antes de hablar hay que comprobar si el usuario está hablando, si el sistema ya está reproduciendo otra respuesta, si el resultado sigue siendo pertinente y si varios resultados deberían agruparse.

Por tanto, el patrón completo no es:

```text
tool completada → hablar
```

sino:

```text
petición aceptada
→ operación registrada
→ ejecución duradera
→ resultado disponible
→ política de entrega
→ ventana conversacional segura
→ audio reproducido o resincronización en el siguiente turno
```

La operación puede terminar en milisegundos o varios segundos. La conversación puede continuar durante ese intervalo. El runtime debe conservar ambas líneas temporales sin fingir que son una sola.

## Cuatro relojes que no se deben colapsar

En una llamada real conviven al menos cuatro máquinas de estado.

### 1. Estado del canal del usuario

Describe lo que el sistema cree que está haciendo la persona:

```text
quiet → speech_started → speaking → speech_stopped → quiet
```

No es suficiente con un booleano `is_user_speaking`. La detección tiene incertidumbre, necesita ventanas de silencio y puede corregirse después. Un VAD agresivo reduce la latencia aparente, pero también corta turnos; uno conservador protege el contenido, pero añade espera.

### 2. Estado de la respuesta del agente

Describe la generación lógica:

```text
planned → generating → completed
                  ↘ cancelled
```

Una respuesta puede estar completa en el modelo y, aun así, no haber sido escuchada. También puede cancelarse tras haber producido tokens o frames parciales.

### 3. Estado del playback

Describe el audio enviado al canal:

```text
queued → sent → playing → played
                    ↘ cleared
```

Esta distinción es crítica. En Twilio Media Streams, el servidor puede enviar eventos `media`, asociar un `mark` y usar `clear` para vaciar el buffer. El `mark` permite conocer cuándo el audio correspondiente ha terminado de reproducirse; `clear` provoca la devolución de los marks pendientes y evita confundir audio enviado con audio escuchado.[^twilio-websocket]

### 4. Estado de la operación durable

Describe trabajo que no debería depender del turno acústico:

```text
accepted → running → succeeded
                   ↘ failed
                   ↘ cancelled_by_policy
```

Una interrupción del usuario suele cancelar la generación y el playback, pero no necesariamente una transferencia, una búsqueda, una reserva o una consulta de backend ya aceptada. Mezclar estos ciclos produce uno de los errores más comunes en agentes de voz: utilizar el mismo `cancel` para todo.

{{ include_html("snippets/articulos-tecnicos/voice-reactive-proactive-clocks.html") }}

## La unidad correcta no es el turno, sino la operación

Los frameworks conversacionales suelen organizar el sistema alrededor de turnos. Para tools asíncronas, el turno deja de ser suficiente. Una petición puede crear varias operaciones, estas pueden terminar en órdenes distintas y su cierre puede emitirse durante otro turno.

El runtime necesita identidades explícitas:

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

Cada identificador responde a una pregunta diferente:

- `session_id`: ¿a qué conversación pertenece?
- `turn_id`: ¿qué intervención originó la decisión?
- `operation_id`: ¿qué side effect o consulta concreta estamos siguiendo?
- `batch_id`: ¿qué operaciones deberían cerrarse juntas?
- `response_id`: ¿qué generación se puede cancelar?
- `playback_id`: ¿qué audio fue enviado, reproducido o eliminado?
- `intent_key`: ¿cómo evitamos repetir el mismo efecto ante retries o replays?

El historial conversacional no debe actuar como base de datos de este estado. Los mensajes visibles sirven para reconstruir qué se dijo; no son una fuente fiable para saber si una operación fue aceptada, reintentada, completada o entregada.

Una separación mínima podría ser:

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

Esta estructura también permite aplicar una regla que debe ser invariante: **una operación terminada puede producir como máximo un cierre final audible**, aunque el callback llegue dos veces o el proceso se reinicie.

## La aceptación debe ser inmediata y semánticamente honesta

La primera respuesta tiene dos objetivos: confirmar que el agente ha entendido la petición y liberar la conversación. No debe hacer una promesa sobre un resultado que todavía no existe.

Un flujo razonable:

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

La frase de aceptación debe diseñarse como parte del contrato de producto. “Hecho” y “lo gestiono” no son equivalentes. La primera afirma un estado final; la segunda informa de una transición a trabajo en curso.

En voz conviene, además, que la aceptación sea corta. Una explicación larga aumenta el tiempo durante el que el usuario no puede aportar información y eleva la probabilidad de barge-in. La intención no es ocultar el trabajo, sino mantener el canal útil.

## La proactividad necesita un `ActivityGate`

Cuando llega un resultado, el componente que ejecutó la tool no debería hablar directamente. Debe publicar un evento durable y dejar que una política de entrega decida qué hacer.

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

El `ActivityGate` evalúa el estado del canal:

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

Las decisiones importantes son explícitas:

- **entregar ahora**, si hay silencio y el resultado sigue siendo relevante;
- **esperar una quiet window**, si el usuario está hablando;
- **agrupar**, si quedan operaciones del mismo lote;
- **adjuntar al siguiente turno**, si el usuario ha retomado la conversación;
- **interrumpir**, únicamente para una prioridad que lo justifique;
- **suprimir**, si el resultado ya fue sustituido o dejó de aportar valor.

La quiet window no debe ser un temporizador global fijo. Puede depender del canal, el idioma, el dominio y el tipo de actualización. Interrumpir para decir que una búsqueda acabó suele ser peor que esperar. Interrumpir para advertir que un pago va a ejecutarse con datos incorrectos puede ser lo apropiado.

## Barge-in: cancelar la voz no equivale a cancelar el trabajo

Cuando el usuario empieza a hablar durante la respuesta del agente, el sistema debe detener rápidamente el audio. Pero la cancelación correcta es selectiva.

Un barge-in suele implicar:

1. cancelar la generación activa;
2. detener TTS o la salida S2S;
3. vaciar el buffer de playback;
4. truncar el elemento de conversación al audio realmente escuchado;
5. mantener vivas las operaciones duraderas salvo que la nueva intención las invalide.

El SDK de voz de OpenAI expone esta idea al reaccionar a `input_audio_buffer.speech_started`: la aplicación puede cancelar la salida y truncar el audio del asistente para que el estado conversacional refleje solo lo que la persona llegó a oír.[^openai-voice-agents] En telefonía, `clear` y `mark` permiten aplicar el mismo principio sobre el buffer de Twilio.[^twilio-websocket]

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

    # Deliberadamente no se cancelan todas las operaciones.
    await operation_policy.reconcile_with_new_turn(session.session_id)
```

La última línea es la relevante. El sistema puede cancelar una operación si el usuario dice “no hagas la transferencia”, pero no porque haya empezado a formular otra pregunta. La cancelación de negocio debe depender de intención y política, no de un evento acústico.

{{ include_html("snippets/articulos-tecnicos/voice-reactive-proactive-barge-in.html") }}

## Tools paralelas: esperar al lote, no a cada callback

Un turno puede lanzar varias tools: comprobar disponibilidad, recuperar datos de cliente y calcular una alternativa. Si cada callback provoca una respuesta, el agente genera una sucesión de interrupciones:

> “Ya tengo la disponibilidad.”  
> “También he recuperado tus datos.”  
> “Y ya está calculada la alternativa.”

La unidad de entrega debería ser el lote semántico. Pipecat incorpora dos primitivas alineadas con esta idea. Una function call puede configurarse para sobrevivir a una interrupción y reinyectar el resultado cuando termina; además, las llamadas del mismo grupo comparten `group_id`, de forma que el LLM se reactiva una vez cuando completa la última llamada del grupo.[^pipecat-functions][^pipecat-frames]

Un coordinador equivalente puede mantener:

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

Al recibir un callback:

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

`record_result_once` y `create_once` son indispensables. En producción hay retries, timeouts ambiguos y entregas *at least once*. La conversación no puede depender de que cada evento llegue exactamente una vez.

## Resincronización en el siguiente turno

No siempre aparece una ventana segura para un follow-up proactivo. La llamada puede terminar, el usuario puede continuar hablando o el resultado puede llegar cuando el agente ya está respondiendo a otra intención. En esos casos, el resultado debe sobrevivir como una entrega pendiente.

En el siguiente turno, el runtime puede inyectar un contexto efímero:

```text
Actualización pendiente de una operación anterior:
- La comprobación de disponibilidad terminó correctamente.
- Todavía no se ha comunicado al usuario.
- No confundas esta actualización con la nueva petición.
```

El modelo puede combinarla con la respuesta actual:

> “Antes de ir con eso: ya tengo la disponibilidad que me pediste. Hay hueco el jueves. Sobre tu nueva pregunta…”

Tras una respuesta confirmada como reproducida, el `delivery_id` pasa a `spoken`. Si el usuario interrumpe antes de escuchar el resultado, no debe marcarse como entregado y puede volver a intentarse de forma condensada.

Esta distinción evita dos fallos opuestos:

- repetir cierres que sí se escucharon;
- perder cierres porque el sistema confundió audio generado con audio reproducido.

## La superficie de voz debe ser la única dueña del canal

La arquitectura más estable separa tres planos:

### Interaction Surface

Escucha, detecta turnos, administra barge-in, genera backchannels, reproduce audio y aplica el `ActivityGate`. Es el único componente autorizado para hablar.

### Cognitive Execution Plane

Ejecuta razonamiento pesado, RAG, tools, retries, compensaciones e idempotencia. Puede tardar más y continuar aunque el canal cambie de turno.

### Durable Coordination

Mantiene eventos, locks, operaciones, lotes y entregas pendientes. Une ambos planos sin convertir el historial de audio o texto en estado operacional.

{{ include_html("snippets/articulos-tecnicos/voice-reactive-proactive-runtime.html") }}

Esta separación ya aparece en sistemas full-duplex recientes. GPT-Live, presentado por OpenAI el 8 de julio de 2026, mantiene la conversación en una superficie de voz mientras delega búsqueda, razonamiento más profundo y trabajo complejo a un modelo frontier situado detrás.[^gpt-live] La idea no elimina la orquestación; la convierte en una responsabilidad explícita.

## Invariantes que el runtime debe hacer cumplir

Las siguientes reglas son más útiles que una colección de prompts:

1. **No afirmar éxito antes del estado terminal.**
2. **Cada side effect se acepta o recupera con una clave de idempotencia.**
3. **Cada lote produce como máximo un cierre final.**
4. **Ninguna tool habla directamente en el canal.**
5. **Una interrupción acústica no cancela por defecto una operación durable.**
6. **El historial conserva solo el audio que el usuario pudo escuchar.**
7. **Un resultado generado no cuenta como entregado hasta confirmar playback o resincronización.**
8. **Los resultados pendientes sobreviven a cambios de turno y reinicios.**
9. **Las actualizaciones obsoletas se suprimen o sustituyen, no se reproducen tarde.**
10. **La prioridad de una entrega es política de negocio, no decisión improvisada del LLM.**

Estas invariantes definen qué significa que el sistema sea correcto. La naturalidad de la voz es importante, pero no compensa una transferencia duplicada, una confirmación prematura o un cierre reproducido fuera de contexto.

## Observabilidad: medir el sistema que escucha y el que opera

Un único valor de “latencia” no describe este patrón. Conviene instrumentar, como mínimo:

| Métrica | Qué revela |
|---|---|
| `speech_stop_to_acceptance_audio_ms` | Tiempo desde fin de turno hasta primera aceptación audible |
| `barge_in_to_playback_stop_ms` | Cuánto tarda el agente en dejar de sonar |
| `operation_accept_to_start_ms` | Espera interna antes de ejecutar |
| `operation_duration_ms` | Tiempo real de la dependencia externa |
| `operation_complete_to_delivery_ready_ms` | Coste de agregación y resumen |
| `delivery_ready_to_first_audio_ms` | Espera causada por el `ActivityGate` |
| `generated_to_played_gap_ms` | Buffer y transporte de salida |
| `duplicate_side_effect_rate` | Fallo de idempotencia |
| `duplicate_delivery_rate` | Cierre audible repetido |
| `stale_delivery_rate` | Resultados pronunciados cuando ya no eran pertinentes |
| `next_turn_resync_rate` | Cuántos cierres no encontraron ventana proactiva |
| `cancelled_response_unheard_ms` | Audio generado pero correctamente excluido del contexto |

Cada traza debería enlazar `session_id`, `turn_id`, `operation_id`, `batch_id`, `response_id`, `playback_id` y `delivery_id`. Sin esa correlación, un incidente se reduce a “el bot interrumpió” cuando en realidad puede ser una quiet window demasiado corta, un mark tardío o un callback duplicado.

## Qué probar antes de producción

El test suite debe reproducir conflictos temporales, no solo respuestas ideales:

- la tool termina mientras el usuario sigue hablando;
- la tool termina durante playback;
- dos tools del mismo lote completan en orden inverso;
- un callback se entrega dos veces;
- el usuario interrumpe antes de oír el cierre;
- el usuario cancela explícitamente una operación;
- el canal se desconecta con entregas pendientes;
- el proceso reinicia después del side effect y antes del follow-up;
- una actualización queda obsoleta por una nueva intención;
- un resultado urgente interrumpe y uno normal espera;
- el TTS genera audio que Twilio todavía no ha reproducido;
- el VAD dispara un falso `speech_started`.

Un test útil no pregunta únicamente qué texto generó el modelo. Comprueba estados y efectos:

```python
assert operation.side_effect_count == 1
assert batch.final_delivery_count == 1
assert playback.heard_text == conversation.assistant_text
assert pending_delivery.is_empty_after_confirmed_playback
assert durable_operation.was_not_cancelled_by_barge_in
```

## El patrón completo

El agente reactivo-proactivo en voz no es un bot que “avisa luego”. Es un runtime que desacopla aceptación, ejecución y entrega sin perder la continuidad acústica.

La aceptación reactiva mantiene la conversación fluida. El plano asíncrono permite ejecutar trabajo real sin bloquear el canal. La entrega proactiva devuelve el resultado cuando existe una oportunidad segura. Y el estado durable garantiza que una interrupción, un retry o un cambio de turno no conviertan ese comportamiento en mensajes duplicados o side effects inconsistentes.

La regla que resume todo el diseño es deliberadamente simple:

> **La finalización técnica crea una entrega pendiente; solo la política conversacional concede permiso para hablar.**

## Fuentes

[^openai-voice-agents]: OpenAI Agents SDK, [Build voice agents](https://openai.github.io/openai-agents-js/guides/voice-agents/build/). Describe VAD semántico, eventos de interrupción y truncado del audio del asistente.
[^twilio-websocket]: Twilio, [Media Streams WebSocket messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages). Contrato de `media`, `mark` y `clear` en streams bidireccionales.
[^pipecat-functions]: Pipecat, [Function calling](https://docs.pipecat.ai/pipecat/learn/function-calling). Ejecución asíncrona y política `cancel_on_interruption`.
[^pipecat-frames]: Pipecat, [Control frames](https://docs.pipecat.ai/api-reference/server/frames/control-frames). Agrupación de llamadas mediante `group_id`.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 8 de julio de 2026. Superficie full-duplex con delegación de búsqueda, razonamiento y trabajo complejo.
