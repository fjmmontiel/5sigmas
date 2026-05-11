---
title: Agente Reactivo, Proactivo y Tool calls
description: "Un recorrido técnico por Reactive / Proactive Agent y por el contrato conversacional que encapsula: respuesta inmediata, trabajo asíncrono y cierre diferido."
date: 2026-04-23
keywords: "agente reactivo, agente proactivo, tool calls, async tool calls, runtime conversacional, background tasks, pending updates"
tags:
  - IA
  - Agentes
  - Tool Calling
  - Arquitectura
  - Runtime
robots: noindex
---

# Agente Reactivo, Proactivo y Tool calls

Cuando un agente usa tools contra sistemas externos, la parte difícil no está en llamar a una API externa. 
Esta llamada se puede hacer con una función, una cola o una librería HTTP cualquiera. Pero lo que complica el diseño, es que la conversación que mantenemos con el LLM y la operación externa puede hacer que el chat se quede bloqueado o que la política de reintentos en llamadas quede sujeta al comportamiento probabilístico de los LLMs.

Además el flujo es:  el usuario escribe en la caja del chat o durante una llamada, el modelo decide que necesita una tool para procesar correctamente la petición del usuario y finalmente la operación sale hacia un servicio que puede tardar, reintentar, fallar o terminar cuando el usuario ya ha seguido hablando.


`Reactive / Proactive Agent` trabaja precisamente sobre esa fricción. El repositorio es una demo local, deliberadamente acotada, para fijar un contrato conversacional: responder ahora con lo que el sistema sabe, ejecutar la operación fuera del turno visible del chat y devolver el cierre cuando el resultado ya existe.

Con esta idea correctamente implementada tenemos el *componente reactivo* del agente, que acepta la petición sin esperar a la API externa, y el *componente proactivo*, que vuelve más tarde con un cierre único cuando el lote ya está resuelto o queda listo para resincronizarse en el siguiente turno.

El patrón se entiende mejor si se mira como tres responsabilidades que conviven dentro del mismo sistema. La parte reactiva responde al usuario sin bloquear el chat, por lo que se pueden seguir procesando más peticiones. La parte asíncrona mantiene vivo el trabajo técnico fuera del historial visible del chat y la parte proactiva decide cuándo puede volver el resultado sin invadir otro turno ni producir varios cierres para el mismo lote. 

La demo usa provisión de accesos porque es un dominio suficientemente concreto para obligar al agente a tocar un sistema externo. La tool activa se llama `provision_access_async`, acepta un batch `accesses` y lanza cada acceso como operación independiente.

{{ include_html("snippets/articulos-tecnicos/async-tool-calls-panorama.html") }}

## El problema no es la tool, es el tiempo

En un chatbot clásico, el turno del usuario y la respuesta del agente forman una unidad casi cerrada. Entra un mensaje, sale una respuesta. Las tools rompen esa comodidad cuando su resultado ya no cabe dentro del mismo turno. Si el agente espera a la API, el chat queda bloqueado. Si responde como si la API ya hubiera confirmado, miente sobre el estado real. Si vuelca cada detalle técnico en la conversación, el historial visible acaba cargando trabajo que pertenece al runtime.

La decisión de diseño del repo consiste en separar esos planos sin perder continuidad para el usuario. El agente puede decir que pone en marcha una gestión, pero no debe darla por terminada hasta que el sistema externo cierre. Mientras tanto, el usuario puede preguntar otra cosa o pedir otro acceso. El runtime conserva el estado operativo, los intentos HTTP y los resultados pendientes sin convertirlos en mensajes `system` permanentes dentro del chat.

Esa separación se nota desde el estado en memoria. `RuntimeState` mantiene el historial visible, las operaciones, los pendientes y las trazas en estructuras distintas:

```python
class RuntimeState:
    def __init__(self) -> None:
        self._messages: dict[str, list[Message]] = {}
        self._pending_updates_by_session: dict[str, list[PendingUpdate]] = {}
        self._operations_by_session: dict[str, dict[str, OperationRecord]] = {}
        self._inflight_counts_by_session: dict[str, int] = {}
        self._events: dict[str, list[Event]] = {}
        self._model_traces: dict[str, list[ModelTrace]] = {}
        self._turn_locks_by_session: dict[str, threading.Lock] = {}
```

Esa división evita una tentación muy habitual: usar el historial del chat como base de datos de todo lo que ocurrió. Aquí `_messages` sigue siendo conversación. `_operations_by_session` describe trabajo técnico. `_pending_updates_by_session` guarda cierres que ya existen pero todavía no han vuelto al usuario. `_inflight_counts_by_session` permite saber si el lote sigue vivo. Las trazas y eventos sirven para observar la demo, no para contaminar el hilo visible. En los snapshots todavía aparece `pending_system_messages`, pero funciona como vista de compatibilidad sobre esos `PendingUpdate`, no como el estado canónico del runtime.

## El primer turno acepta trabajo, no promete resultados

La función central sigue siendo `ConversationRuntime.handle_user_turn()`. Su responsabilidad no es resolver la operación externa, sino decidir qué puede decir el agente en el turno actual y qué trabajo debe salir a background.

```python
def handle_user_turn(self, conversation_id: str, user_text: str) -> ChatResult:
    self.state.acquire_turn(conversation_id, "user", blocking=True)
    self.state.append(conversation_id, Role.USER, user_text)
    inflight_count = self.state.inflight_count(conversation_id)
    pending_updates = self.state.pending_updates(conversation_id)
    consume_pending_updates = bool(pending_updates) and inflight_count == 0
    turn_pending_updates = self.state.take_pending_updates(conversation_id) if consume_pending_updates else []
    live_operations_context = self._build_live_operations_context(
        conversation_id,
        pending_updates=pending_updates,
        inflight_count=inflight_count,
    )
    injected_system_message, system_messages, messages, first_turn = self._run_model_turn(
        conversation_id=conversation_id,
        phase="first_pass",
        tools=self.registry.provider_definitions(),
        pending_updates=turn_pending_updates,
        extra_system_messages=[live_operations_context] if live_operations_context else [],
    )
```

Este tramo explica bastante del diseño actual del repo. Antes de llamar al modelo, el runtime mira si hay operaciones vivas y si hay cierres pendientes. Si ya no queda nada en vuelo, puede consumir esos pendientes en el siguiente turno como contexto efímero. Si todavía hay trabajo abierto, no los consume como cierre final; prepara un contexto operativo para que el modelo pueda responder con honestidad sin declarar terminado el lote.

Cuando el modelo pide una tool, el runtime valida argumentos, normaliza batches bajo `accesses` y registra cada operación antes de lanzarla:

```python
if first_turn.tool_calls:
    acceptance_messages: list[str] = []
    for tool_call in first_turn.tool_calls:
        tool = self.registry.get(tool_call.name)
        normalized_arguments = normalize_tool_arguments(tool, tool_call.arguments)
        validate_tool_arguments(tool, normalized_arguments)
        acceptance = tool.acceptance_message(normalized_arguments)
        for i, item in enumerate(normalized_arguments.get(tool.batch_field) or []):
            sub_id = f"{tool_call.id}:{i}"
            self.state.accept_operation(conversation_id, tool.name, sub_id, item)
            self.background_tasks.submit_item(conversation_id, tool, sub_id, item)
        acceptance_messages.append(acceptance)
    assistant_text = " ".join(acceptance_messages)
```

El detalle importante está en el lenguaje de aceptación. El agente no dice “ya está hecho”. Dice que pone en marcha la gestión. Esa diferencia sostiene el contrato. La conversación avanza, pero el resultado todavía pertenece al plano operativo.

## El trabajo asíncrono tiene política, no solo background

Mover la HTTP a un hilo o a un event loop no resuelve por sí solo el problema. Lo que importa es qué ocurre con los intentos, los retries y el cierre. `BackgroundTaskRunner` ejecuta cada operación con concurrencia limitada, clasifica el resultado y actualiza el estado en cada intento:

```python
async def _process(...):
    async with self._semaphore:
        for attempt in range(1, tool.max_attempts + 1):
            http_status, response_body, exception = await asyncio.to_thread(_execute_request, request)
            outcome = classify_outcome(http_status, response_body, exception)
            self.state.mark_attempt(...)
            if outcome.success:
                self.state.finish_processing(...)
                self._notify_completion(conversation_id)
                return
            if outcome.retryable and attempt < tool.max_attempts:
                await asyncio.sleep(tool.backoff_seconds)
                continue
            self.state.finish_processing(...)
            self._notify_completion(conversation_id)
            return
```

El repo modela fallos técnicos, errores de negocio, `429`, `5xx`, timeouts y respuestas correctas con una política común. Esa política no vive en la UI ni en el prompt. Vive en el runtime y queda reflejada en las operaciones, eventos y snapshot que la interfaz lee después. Por eso la demo puede enseñar retries visibles sin convertirlos en conversación visible.

La siguiente lámina pone esa operación completa en un solo mapa. Lo relevante no es memorizar cada caja, sino ver dónde cambia de plano la solicitud: aceptación visible, trabajo en background, outcome técnico, pendiente de cierre y entrega final.

{{ include_html("snippets/articulos-tecnicos/async-tool-calls-operacion-lifecycle.html") }}

## El cierre llega cuando el lote puede cerrarse

La parte proactiva del repo no consiste en que el modelo “decida avisar” por intuición. La decisión está en `handle_background_completion()`. Cada vez que una operación termina, el background runner notifica al runtime. El runtime mira si quedan operaciones vivas, si la demo está forzando resincronización en siguiente turno y si la sesión está libre para escribir un nuevo mensaje del agente.

```python
def handle_background_completion(self, conversation_id: str) -> bool:
    inflight_count = self.state.inflight_count(conversation_id)
    pending_updates = self.state.pending_updates(conversation_id)
    if not pending_updates:
        return False
    if inflight_count > 0:
        return False
    if self.force_next_turn_resync:
        return False
    if not self.state.acquire_turn(conversation_id, "proactive", blocking=False):
        self._schedule_proactive_retry(conversation_id)
        return False

    pending_updates = self.state.take_pending_updates(conversation_id)
    assistant_text = self._build_guaranteed_proactive_followup(
        [update.message for update in pending_updates]
    )
    self.state.append(conversation_id, Role.ASSISTANT, assistant_text)
    self.state.mark_updates_proactively_delivered(conversation_id, pending_updates)
    return True
```

La regla actual es más estricta que “terminó una task, manda un mensaje”. El cierre sale cuando ya no quedan operaciones abiertas para esa sesión. Si hay varias gestiones en el mismo lote, se acumulan. Si la sesión está ocupada, se reintenta. Si la configuración fuerza resincronización, el resultado queda preparado para el siguiente turno. Esa disciplina evita el comportamiento más molesto de muchos agentes con background work: mensajes parciales, duplicados o fuera de contexto.

Hay otro detalle importante en la rama pública. Cuando todas las operaciones terminan bien, el follow-up no vuelve a llamar al modelo: se construye con `_build_guaranteed_proactive_followup()`. El LLM solo entra en el cierre si hay fallos finales y hace falta convertir varios outcomes en una explicación breve con alternativa concreta. Esa separación reduce variabilidad justo en el punto donde el sistema necesita ser más predecible.

Cuando no puede emitir un follow-up proactivo, el repo usa `pending_updates` como puente. En el siguiente turno, esos cierres se inyectan como contexto interno y desaparecen después de consumirse. El usuario recibe continuidad, pero el chat visible no queda lleno de mensajes técnicos. En la fotografía externa del estado, `delivery_mode` marca si el resultado sigue `queued`, volvió por `proactive` o fue absorbido por `next_turn`; `session_view.latest_sync_mode` resume esa lectura para la UI como `aggregating`, `queued_final`, `proactive`, `next_turn`, `waiting` o `idle`.

```python
def _build_pending_updates(self, pending_updates: list[PendingUpdate]) -> str | None:
    if not pending_updates:
        return None
    lines = [
        "Estado de operaciones anteriores ya completadas antes de este turno:",
        "Estas actualizaciones solo describen operaciones anteriores y no sustituyen nuevas solicitudes del usuario en este turno.",
    ]
    lines.extend(f"- {update.message}" for update in pending_updates)
    return "\n".join(lines)
```

Ese texto interno no es contenido editorial para el usuario. Es una instrucción de continuidad para el modelo. La frontera sigue siendo la misma: el runtime puede usar estado operativo para responder mejor, pero no tiene por qué exponerlo como si fuera parte natural de la conversación.

## La interfaz no es un adorno

Una demo de este patrón falla si solo enseña un chat. El usuario tiene que ver que la conversación sigue siendo limpia mientras las operaciones se mueven por otro carril. Por eso `demo_view.py` convierte el snapshot del runtime en paneles de sesión, operaciones, timeline, intentos HTTP, eventos y trazas. `demo_page.py` monta esa lectura en una UI local que deja comparar el hilo visible con el estado interno sin mezclar ambos planos.

La UI actual no intenta parecer un producto final. Su función es pedagógica: hacer observable el contrato. En el chat se ve lo que el usuario recibiría. En el panel de operaciones se ve lo que el runtime está procesando. En el detalle interno se ve por qué una operación está en retry, acumulada, lista para cierre o ya avisada. También deja ver el modo de modelo: `mock` para una demo plug-and-play sin credenciales y `responses` cuando se configura un proveedor real. Esa separación visual refuerza la separación de estado que ya existe en el código.

El adaptador del modelo cumple otra función de borde. `OpenAIResponsesAdapter` construye payloads compatibles con Responses, separa mensajes de sistema, historial y tools, y parsea tool calls desde la respuesta del proveedor. El mock adapter replica lo suficiente de ese comportamiento para que la demo arranque sin credenciales y siga siendo verificable. Esa decisión práctica importa: el patrón se puede enseñar en modo `mock`, y el modo real queda disponible cuando hay configuración válida.

## Cómo se vería al crecer

El repo actual vive en un único proceso Python, con estado en memoria, servidor demo local, mock service y navegador local. Esa limitación está documentada en el README y conviene respetarla. La demo no persiste estado real, no despliega infraestructura y no pretende cubrir seguridad de producción. Aun así, el código ya separa responsabilidades de una forma que permite imaginar una evolución razonable sin cambiar el contrato.

La arquitectura objetivo de la siguiente lámina debe leerse así: no como algo que el repositorio ya despliega, sino como una descomposición natural de sus fronteras actuales si el patrón pasara de demo local a sistema distribuido. El gateway conversacional aceptaría turnos y tool calls. Un store como Redis mantendría estado efímero y locks por sesión. Una cola separaría aceptación de ejecución. Workers ejecutarían las tools. Un bus de eventos devolvería outcomes. Un orquestador decidiría si el cierre vuelve como follow-up o queda para el siguiente turno.

{{ include_html("snippets/articulos-tecnicos/async-tool-calls-arquitectura-objetivo.html") }}

Esa evolución solo tiene sentido si conserva lo que el repo ya demuestra en pequeño: el agente responde sin esperar la API, el historial visible no almacena mensajes técnicos, los retries viven fuera de la UI conversacional y el cierre llega una vez, cuando el lote está listo. Redis, colas, workers y bus de eventos son una arquitectura objetivo posible, no una promesa sobre lo que la demo ya despliega. Cambiar de infraestructura sin conservar esas invariantes reabriría el problema que la demo intenta resolver.

La última lámina mira el mismo patrón desde el recorrido conversacional. No presenta una plataforma nueva. Ordena el sistema en capas: usuario, chat visible, runtime, procesamiento interno, estado persistente y entrega diferida.

{{ include_html("snippets/articulos-tecnicos/async-tool-calls-runtime-conversacional.html") }}

## Qué aporta realmente el repo

El valor de `Reactive / Proactive Agent` no está en descubrir que se puede ejecutar trabajo en background. Eso es una técnica conocida. Lo interesante es que fija el contrato conversacional alrededor de ese trabajo: qué puede prometer el agente ahora, dónde vive el estado técnico, cuándo se acumulan resultados y cómo vuelve el cierre sin ensuciar el hilo.

Esa es una pieza pequeña, pero muy práctica, dentro del diseño de agentes. Muchas demos de tool calling enseñan al modelo llamando una función y recibiendo una respuesta inmediata. Este repo se centra en el caso más incómodo: la operación sigue viva después del turno. Ahí aparecen los problemas que luego pesan en producto real: latencia, retries, mensajes duplicados, estado invisible, interrupciones fuera de orden y conversaciones que pierden honestidad sobre lo que ya ocurrió.

La demo no resuelve producción. Sí deja una forma clara de pensar el contrato. El usuario puede seguir hablando. El sistema puede seguir trabajando. El cierre vuelve cuando hay algo real que contar. Para un agente con tools asíncronas, esa frontera vale más que una llamada HTTP bien envuelta.
