---
title: "Arquitecturas de voz: dónde colocas la frontera de texto"
description: "Full cascade, audio-native con TTS externo, speech-to-speech y full-duplex no son cuatro etiquetas equivalentes. Este capítulo separa modalidad, interacción y orquestación para elegir arquitectura con criterios observables."
date: 2026-09-07
date_modified: 2026-09-08
keywords: "arquitecturas agentes de voz, full cascade, half cascade, speech to speech, full duplex, STT LLM TTS, realtime voice"
tags:
  - IA
  - Voz
  - Arquitectura
  - Realtime
  - Agentes
---

# Capítulo 1 — Arquitecturas de voz: dónde colocas la frontera de texto

Un agente de voz necesita resolver tres problemas distintos: **entender audio, decidir qué hacer y producir audio**. La arquitectura cambia según dónde separemos esas responsabilidades y qué representación cruza cada frontera.

La comparación suele resumirse como *cascade vs speech-to-speech*, pero esa frase mezcla conceptos de distinto nivel. **Full cascade, audio-native con salida textual y speech-to-speech describen dónde aparece el texto. Full-duplex describe si el sistema puede escuchar y hablar de forma solapada.** Un sistema speech-to-speech puede seguir trabajando por turnos; un cascade puede soportar interrupciones y streaming sin convertirse por ello en S2S.

Ese es el modelo mental de este capítulo: primero localizamos la frontera de texto; después preguntamos cómo se coordinan los turnos.

{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}

## Tres arquitecturas de modalidad

### 1. Full cascade: audio → STT → LLM → TTS → audio

En un full cascade clásico, cada etapa tiene un contrato explícito:

```text
audio del usuario
→ detección de actividad / fin de turno
→ STT
→ texto
→ LLM + tools
→ texto de respuesta
→ TTS
→ audio al usuario
```

LiveKit documenta este patrón como una de las dos familias principales para construir voice agents: un pipeline que encadena modelos especializados de STT, LLM y TTS frente a un modelo realtime directo.[^livekit-voice]

La ventaja principal no es que sea sencillo. En producción puede ser una máquina de estados bastante compleja. La ventaja es que **sus fronteras son visibles**: podemos conservar la transcripción, sustituir el TTS, medir el tiempo de cada etapa y aplicar políticas sobre texto antes de sintetizarlo.

Esto hace que full cascade sea especialmente útil cuando importan:

- La elección independiente de proveedores por idioma o mercado.
- Un TTS concreto por identidad de voz o pronunciación.
- La inspección textual de entradas, tool calls y respuestas.
- La posibilidad de optimizar cada componente por separado.
- La capacidad de aislar fallos y decidir qué componente reintentar, cancelar o sustituir.

El coste de esa modularidad es coordinación. El STT puede seguir revisando una hipótesis mientras el LLM ya genera; el TTS puede tener audio en cola cuando el usuario interrumpe; una tool puede continuar ejecutándose después de cancelar la respuesta hablada. Por eso la latencia percibida no es sólo la suma de tres modelos.

Si medimos desde que el usuario deja de hablar hasta el primer audio reproducible, sumar `T_STT + T_LLM + T_TTS` como si todo ocurriera en serie puede contar dos veces trabajo que ya ocurrió o que se solapa. En un pipeline con streaming, el STT puede emitir hipótesis parciales mientras el usuario habla, el runtime puede iniciar la generación cuando dispone del turno y del texto necesarios, y el TTS puede sintetizar los primeros fragmentos mientras el modelo continúa generando. LiveKit describe explícitamente este solapamiento entre etapas en su arquitectura de pipeline.[^livekit-streaming-pipeline]

Una descomposición más fiel es seguir el **camino crítico** desde el fin del habla hasta audio reproducible:

```text
speech_stop_to_first_audio_ms
= duración del camino crítico entre:
  commit / endpointing del turno
  finalización residual del STT, si queda trabajo pendiente
  modelo → primer texto suficiente para hablar
  TTS → primer audio reproducible
  transporte + buffer de reproducción
```

La palabra *residual* importa: si el STT ya trabajó durante el turno, esa latencia previa no debe volver a sumarse después de `speech_stop`. Del mismo modo, la generación completa del LLM no bloquea el primer audio cuando el TTS consume texto en streaming. Como los intervalos exactos dependen del runtime y del proveedor, conviene medir timestamps del mismo turno y reconstruir el camino crítico en lugar de sumar cifras de latencia publicadas de componentes aislados.

El [explorador de latencia para agentes de voz](/herramientas/latencia-agente-voz/) permite convertir esa descomposición en un presupuesto explícito. En el capítulo dedicado a latencia separaremos además cuándo puede solaparse trabajo y cuándo una etapa bloquea realmente a la siguiente.

### 2. Audio-native con salida textual + TTS externo

*Half-cascade* no es un estándar formal, pero el término ya aparece en frameworks de producción. LiveKit, por ejemplo, define *half-cascade* como un modelo realtime que entiende el audio y devuelve texto, emparejado con un TTS separado.[^livekit-pipelines] En esta serie usaremos el término exactamente en ese sentido:

```text
audio del usuario
→ modelo realtime que entiende audio directamente
→ texto de respuesta en streaming
→ TTS externo
→ audio al usuario
```

La diferencia con full cascade está en la entrada: el modelo conversacional ya no depende de una transcripción como única representación del turno. La diferencia con S2S está en la salida: **la voz sigue estando detrás de una frontera textual**.

Esta arquitectura sólo existe si el proveedor realtime permite una modalidad de respuesta exclusivamente textual. LiveKit lo señala explícitamente como requisito y advierte de que el soporte varía por proveedor.[^livekit-pipelines] `gpt-realtime`, por ejemplo, declara entrada y salida de texto y audio, además de function calling y transporte por WebRTC, WebSocket o SIP.[^openai-realtime-model] Esa capacidad permite construir un flujo audio-in/text-out aunque el producto elija un TTS separado; no debe asumirse para cualquier modelo realtime.

Esta arquitectura tiene sentido cuando la señal acústica aporta información útil a la comprensión, pero el producto quiere conservar un sintetizador especializado. El trade-off importante es fácil de pasar por alto: **la prosodia puede llegar al modelo y perderse de nuevo al cruzar la salida textual**.

Si el usuario habla con prisa o frustración y el modelo genera únicamente:

```text
Entiendo. Voy a revisarlo.
```

el TTS necesita su propio mecanismo para decidir ritmo, energía o énfasis. La arquitectura no resuelve automáticamente esa transferencia expresiva.

Por eso conviene tratar el texto entre modelo y TTS como un contrato, no como un detalle de implementación. Puede ser suficiente texto plano; puede incluir instrucciones de estilo; o puede reservarse el control expresivo a un TTS capaz de interpretar el contexto. La decisión debe evaluarse con audio real, no asumirse por el diagrama.

### 3. Speech-to-speech: audio → modelo → audio

En speech-to-speech, la conversación no necesita cruzar una representación textual obligatoria entre comprensión y generación:

```text
audio del usuario
→ modelo speech-to-speech
→ audio del agente
```

OpenAI describe la Realtime API como una vía para transmitir audio de entrada y salida directamente y señala que el pipeline ASR → modelo de texto → TTS puede perder emoción, énfasis y acentos además de añadir latencia.[^openai-realtime-intro] Google Live API ofrece igualmente interacción bidireccional en tiempo real con entrada de audio y salida de audio nativa, manteniendo una sesión persistente sobre WebSocket.[^gemini-live]

Reducir fronteras puede mejorar el ritmo conversacional y evitar parte de la reconciliación entre STT, LLM y TTS. Pero **speech-to-speech no elimina el resto del sistema**. El runtime sigue necesitando estado, tools, permisos, trazas, cancelación, idempotencia, observabilidad y una definición precisa de qué audio llegó realmente al usuario.

Los modelos realtime también pueden hacer tool calling. `gpt-realtime` expone function calling, y Gemini Live requiere que la aplicación ejecute la función y devuelva el resultado a la sesión.[^openai-realtime-model][^gemini-tools] La frontera de negocio sigue fuera del modelo aunque la frontera acústica se haya simplificado.

## Full-duplex es otro eje

**Full-duplex significa que entrada y salida pueden coexistir en el tiempo.** No significa simplemente que el modelo acepte audio y devuelva audio.

Un sistema S2S turn-based puede hacer esto:

```text
usuario habla → espera → agente habla → espera → usuario habla
```

Un sistema full-duplex puede mantener actividad en ambas direcciones y decidir continuamente si debe escuchar, responder, pausar, interrumpir o producir un backchannel. GPT-Live, por ejemplo, se describe explícitamente como una arquitectura full-duplex que procesa entrada mientras genera salida y toma decisiones de interacción varias veces por segundo.[^gpt-live]

La distinción no depende de una sola implementación comercial. Moshi modela en streams paralelos el habla del usuario y la del asistente para representar solapamientos, interrupciones e interjecciones sin depender de una segmentación explícita en turnos.[^moshi]

{{ include_html("snippets/articulos-tecnicos/voice-arch-duplex.html") }}

La consecuencia práctica es que **modalidad e interacción deben evaluarse por separado**:

| Pregunta | Full cascade | Audio-native + TTS | Speech-to-speech |
|---|---|---|---|
| ¿Dónde aparece texto obligatorio? | Entre STT, LLM y TTS | Antes del TTS | Puede no existir en el camino acústico principal |
| ¿Puedo cambiar la voz sin cambiar el modelo conversacional? | Sí | Sí | Depende del proveedor/modelo |
| ¿La señal acústica entra directamente al modelo conversacional? | No, salvo canales auxiliares | Sí | Sí |
| ¿Tengo transcript y respuesta textual como artefactos naturales? | Sí | Sí en salida | Pueden ser derivados |
| ¿Puede ser full-duplex? | Posible, con más coordinación | Posible | Es el encaje más directo, pero no viene garantizado |

La última fila es la que evita la confusión más común: **S2S y full-duplex no son sinónimos**.

La tabla resume **tendencias de diseño**, no garantías de comportamiento. Un proveedor puede añadir transcripciones, control de voz o mejores mecanismos de interrupción a cualquiera de estas familias. La decisión debe validarse sobre el modelo, transporte, TTS y runtime concretos que vayan a operar el producto.

## Qué propiedad favorece cada arquitectura

No hay una ganadora universal. La decisión útil empieza por preguntar qué propiedad del producto no queremos degradar.

{{ include_html("snippets/articulos-tecnicos/voice-arch-decision.html") }}

### Full cascade favorece modularidad y auditabilidad

Es una buena base cuando la transcripción debe ser un artefacto de primera clase, la voz necesita un TTS específico, el equipo quiere cambiar proveedores por etapa o los controles operativos se expresan mejor sobre texto.

### Audio-native + TTS favorece comprensión acústica y control de voz

Tiene sentido cuando queremos que el modelo escuche la señal original pero seguimos necesitando una voz externa, pronunciaciones controladas o una salida textual explícita antes de hablar.

### Speech-to-speech reduce fronteras y favorece continuidad acústica

Es una base fuerte cuando el ritmo, las interrupciones y la expresividad pesan más que la capacidad de sustituir cada etapa de forma independiente. A cambio, obliga a instrumentar mejor qué ocurrió dentro de la sesión y qué escuchó realmente el usuario.

## Segunda decisión: cuánto runtime quieres poseer

Elegir *cascade*, *half-cascade* o S2S no decide quién implementa el runtime. **LiveKit Agents, Pipecat y una implementación Python directa operan en otra capa**: conectan media, modelos, turn-taking, tools, estado y lifecycle. Cualquiera de los tres puede participar en más de una arquitectura de modalidad según los providers que conectes.

LiveKit Agents coloca `AgentSession` como orquestador de la sesión y conecta al agente con participantes mediante la infraestructura realtime de LiveKit. El framework incluye abstracciones para pipeline de voz, turn detection, interrupciones y lifecycle del worker; el servidor de agentes anuncia capacidad, aísla jobs por proceso y puede redistribuir sesiones cuando un worker desaparece.[^livekit-agents][^livekit-session][^livekit-server-lifecycle] **Eso no convierte todas las capacidades de LiveKit Cloud en capacidades del framework**: el framework y SIP pueden autohospedarse, mientras que hosting gestionado, observabilidad integrada y otras superficies operativas son servicios de Cloud.[^livekit-self-hosting]

Pipecat organiza el runtime como una secuencia de `FrameProcessor` por la que circulan frames de audio, texto, control y lifecycle. El transporte es sustituible: la documentación incluye WebRTC mediante Daily o LiveKit, SmallWebRTC y WebSocket para escenarios controlados/telefonía.[^pipecat-pipeline][^pipecat-transports] Turn-taking, interrupciones, tool calling, métricas y OpenTelemetry están expuestos como primitivas configurables del pipeline.[^pipecat-turns][^pipecat-tools][^pipecat-metrics] **Eso no significa que Pipecat proporcione por sí mismo una red WebRTC global o un carrier telefónico**: esas propiedades dependen del transporte y del servicio elegidos.

En Python vanilla/thin no desaparece el runtime: **cambia de dueño**. Si conectas directamente un SDK o protocolo de proveedor, tu aplicación pasa a definir el contrato de sesión y a integrar transporte/media, buffering, turn-taking, cancelación, estado, tools, retries, reconnect, backpressure, observabilidad, replay/testing, seguridad y scaling. WebRTC ya resuelve piezas muy difíciles —ICE/NAT traversal, DTLS/SRTP, negociación de codecs, RTCP, echo cancellation y jitter buffering—, pero alguien sigue teniendo que integrar ese stack con el modelo y con el lifecycle de negocio.[^openai-webrtc-scale] En WebSocket o RTP/SIP más directos, parte de esa responsabilidad vuelve todavía más al servidor.

### Matriz de decisión del runtime

| Criterio | LiveKit Agents | Pipecat | Python vanilla/thin |
|---|---|---|---|
| Frontera de abstracción | Sesión/agente dentro de rooms + worker lifecycle | Pipeline de frames + processors + transporte elegible | Eventos/protocolo del provider y primitives propios |
| Media y transporte | WebRTC como camino principal; SIP/telephony integrado en el ecosistema LiveKit | Daily, LiveKit, SmallWebRTC, WebSocket y serializers según el caso | Lo que integres: WebRTC/WebSocket/SIP/RTP; tú compones las piezas |
| Turnos, cancelación y tools | `AgentSession` ofrece turn handling, interrupciones, eventos y tools | Estrategias de turno, `InterruptionFrame`, cancelación y function calling configurables | Contratos propios; máximo control y máxima superficie de correctness |
| Observabilidad y replay | Métricas/data hooks en SDK; Cloud añade timeline, traces y recordings | Metrics frames, observers y OpenTelemetry; almacenamiento/replay lo diseñas tú | Instrumentación, correlation IDs, audio played y replay son responsabilidad de la app |
| Deploy y fallos | Worker capacity, job isolation y draining integrados; Cloud puede gestionar hosting | Runner/pipeline lifecycle; el modelo de hosting depende de tu runtime o Pipecat Cloud | Tú defines aislamiento, autoscaling, draining, reconnect y recovery |
| Extensibilidad / lock-in | Menos código de media; más acoplamiento a rooms/session APIs de LiveKit | Muy extensible por processors/transports; acoplamiento al frame model de Pipecat | Menor dependencia de framework, pero mayor dependencia de tus contratos y quizá del provider |
| Coste dominante | Menos ingeniería de plumbing; coste de infraestructura/Cloud según despliegue | Menos plumbing de pipeline; coste del transporte/hosting elegido + operación | Más ingeniería y operación; puede compensar sólo cuando el control adicional tiene valor real |

La matriz es deliberadamente compacta. Hay cuatro responsabilidades que conviene separar antes de decidir, porque un nombre de framework puede ocultar en qué capa vive realmente la garantía.

**Recovery no equivale a continuidad de estado.** LiveKit puede detectar que un agente se desconectó inesperadamente y despachar otro agente a la room, pero esa redistribución no reconstruye por sí sola el estado Python en memoria, una tool externa parcialmente ejecutada ni el punto exacto de audio que ya oyó el usuario.[^livekit-server-lifecycle] Esas piezas necesitan persistencia e idempotencia de aplicación. En Pipecat, reconnect y retry tampoco son una política única del framework: el lifecycle del cliente exige iniciar una nueva conexión después de un disconnect, mientras que transportes o servicios concretos pueden tener sus propios reintentos; por ejemplo, su WebSocketTransport de cliente documenta dos intentos de reconexión y los servicios WebSocket aplican su propia política de backoff.[^pipecat-session-lifecycle][^pipecat-websocket-reconnect][^pipecat-service-events] En vanilla, todas esas fronteras y sus invariantes son tuyas. Por eso hay que medir por separado *reconnect transport*, *restart del runtime* y *recovery del estado de negocio*.

**La seguridad también se reparte por capas.** LiveKit autentica el acceso a rooms con tokens JWT que codifican identidad, room y permisos, y separa grants de media/SIP de los permisos del backend.[^livekit-tokens] Pipecat core hereda gran parte de la frontera de seguridad del transporte y del despliegue elegidos; cuando se usa Pipecat Cloud, por ejemplo, WebSocket puede protegerse con tokens HMAC de sesión de corta duración, una capacidad de Cloud y no una propiedad universal del pipeline.[^pipecat-websocket-auth] En vanilla debes diseñar explícitamente auth de cliente, credenciales de provider, autorización de tools, secretos, aislamiento de estado y qué datos pueden cruzar cada frontera. Ningún framework sustituye la política de autorización de una tool con efectos reales.

**Testing/evals es otra superficie de ownership.** LiveKit Agents incluye un test framework para mensajes, tool calls, handoffs y conversaciones multi-turn, además de simulaciones; las simulaciones son una superficie distinta que puede ejecutar escenarios completos, y algunas capacidades dependen de LiveKit Cloud.[^livekit-testing] Pipecat expone frames, observers, eventos y processors que hacen instrumentable el pipeline, pero el harness que convierte esa instrumentación en un conjunto reproducible de evals sigue siendo una decisión de la aplicación salvo que adoptes tooling adicional. Vanilla te da control completo sobre fixtures, reloj, transportes fake y replay, pero también te obliga a construir y mantener esas superficies.

Esto deja una diferencia práctica en *developer velocity vs control*: LiveKit mueve más responsabilidades de media, dispatch y lifecycle a primitives existentes; Pipecat conserva una superficie de composición muy amplia dentro de su frame model; vanilla maximiza control sobre protocolos y scheduling a cambio de una superficie mayor de correctness, operación y tests. La opción correcta es la que elimina trabajo indiferenciado sin ocultar la capa que realmente necesitas modificar.

La tabla no es un ranking. Tampoco hay una afirmación seria del tipo “vanilla siempre tiene menos latencia”. LiveKit puede introducir bridges entre WebRTC y el protocolo del modelo; Pipecat introduce frames, colas y processors; vanilla puede eliminar parte de esa abstracción, pero sigue necesitando buffering, transporte, control de concurrencia y recovery. **Sin un benchmark controlado con el mismo hardware, red, provider, modelo, audio path y carga, no publicaremos una diferencia numérica de overhead.** La comparación útil es medir el mismo workload y separar tiempo de provider, colas del runtime, transporte y playout.

### Tres decisiones concretas

**1. Voice assistant en browser o móvil.** Si usuarios reales llegan desde redes variables y necesitas media robusta, WebRTC es la base natural. LiveKit Agents encaja bien cuando quieres que rooms, media, agent workers y, si lo eliges, operación gestionada formen un sistema coherente.[^livekit-agents] Pipecat encaja cuando la prioridad es componer processors/providers y quieres seleccionar Daily o LiveKit como transporte sin cambiar la lógica central del pipeline.[^pipecat-transports][^pipecat-livekit] Un cliente directo al WebRTC de un provider puede ser razonable para un producto estrecho de un solo modelo o un prototipo; acepta más binding al protocolo del provider y no elimina la necesidad de auth, estado de negocio y seguridad server-side.

**2. Agente PSTN.** LiveKit es una opción fuerte cuando quieres terminar SIP dentro del mismo sistema de rooms y despachar agents sobre ese lifecycle.[^livekit-sip] Pipecat es atractivo cuando ya eliges un carrier/streaming API y quieres que serializers, turn strategies, STT/LLM/TTS y tools vivan en un pipeline sustituible; su `FastAPIWebsocketTransport` está orientado precisamente a telefonía y conexiones WebSocket server-side.[^pipecat-telephony] Vanilla tiene sentido si ya operas tu propio gateway SIP/RTP o necesitas control de carrier/media que un transporte existente no expone; entonces también posees más estados de reconexión, codec, buffering y call lifecycle.

**3. Pipeline experimental o custom de bajo nivel.** Pipecat es un buen punto medio cuando quieres insertar procesadores propios, cambiar transporte o inspeccionar cada frame sin reimplementar todo el lifecycle.[^pipecat-custom] Vanilla es preferible cuando el objeto del experimento es precisamente la capa que el framework abstrae —por ejemplo packetization, tamaños de frame, protocolo de eventos del provider, un scheduler duplex propio o instrumentación temporal exacta—. En ese caso el coste extra de implementación compra control experimental, no “simplicidad”.

Hay además un híbrido útil y concreto: **Pipecat puede ejecutar su pipeline sobre `LiveKitTransport`**. Eso permite usar LiveKit para rooms/WebRTC y Pipecat para la composición de processors.[^pipecat-livekit] El híbrido merece la pena sólo si cada capa conserva una responsabilidad clara; duplicar turn detection, buffering o retry policies en dos runtimes crea más estados de fallo de los que elimina.

La decisión final debería escribirse como una frase condicional: *elige el nivel de abstracción más alto que preserve el control que realmente necesitas*. Si la diferenciación del producto está en media y scheduling, baja de nivel. Si está en la lógica del agente y las tools, pagar ingeniería para reconstruir WebRTC, turn-taking y worker lifecycle suele ser una mala asignación de esfuerzo.

## Un criterio de decisión reproducible

Antes de elegir arquitectura, prepara el mismo conjunto de conversaciones y ejecuta las variantes con el mismo objetivo de tarea. No compares sólo demos felices.

Incluye al menos:

- Usuarios que se interrumpen y se corrigen.
- Ruido, acentos y velocidad de habla variable.
- Nombres propios, números y códigos alfanuméricos.
- Tools rápidas y tools lentas.
- Respuestas que deben cancelarse a mitad de reproducción.
- Errores parciales de STT, modelo, TTS o red.
- Conversaciones suficientemente largas para observar acumulación de estado.

Después mide propiedades distintas, no una sola latencia media:

```text
turn_detection_delay_ms
speech_stop_to_first_audio_ms
barge_in_to_agent_silence_ms
tool_argument_accuracy
task_success_rate
entity_preservation_rate
voice_consistency
cost_per_successful_minute
```

El objetivo no es demostrar que una arquitectura es moderna. Es saber **qué sistema mantiene la conversación y completa la tarea bajo las restricciones reales de tu producto**.

## Qué deberías recordar

- Full cascade, audio-native + TTS y speech-to-speech describen dónde colocamos las fronteras de modalidad.
- *Half-cascade* no es un estándar formal; aquí lo usamos en el sentido operativo documentado arriba: audio-in → text-out → TTS, y sólo cuando el modelo realtime admite salida text-only.
- Speech-to-speech no implica full-duplex.
- Full-duplex describe solapamiento temporal y control de interacción, no el número de modelos.
- LiveKit Agents, Pipecat y vanilla Python son decisiones de runtime, no arquitecturas de modalidad.
- Reducir componentes no elimina tools, estado, permisos, trazas ni recuperación.
- Menos dependencias de framework no implica menos complejidad operativa.
- La arquitectura correcta depende de qué quieras proteger: modularidad, control de voz, señal acústica, timing, auditabilidad, portabilidad o control del runtime.

La [nota técnica sobre arquitecturas de agentes de voz](/articulos-tecnicos/voice-agent-architectures/) profundiza en contratos de streaming, prosodia y una posible separación entre superficie conversacional y plano de ejecución. Los siguientes capítulos de esta serie se centrarán en turn-taking, latencia, tools, transporte y evaluación por separado.

## Referencias

[^livekit-voice]: LiveKit, [Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/). Documenta como alternativas de primer nivel un pipeline STT–LLM–TTS y un modelo realtime directo.
[^livekit-pipelines]: LiveKit, [Pipeline types](https://docs.livekit.io/agents/models/pipelines/). Define STT–LLM–TTS, realtime y *half-cascade*; esta última usa un modelo realtime para comprensión y un TTS separado para la salida, y requiere que el proveedor soporte una modalidad de respuesta text-only.
[^livekit-streaming-pipeline]: LiveKit, [Sequential pipeline architecture for voice agents](https://livekit.com/blog/sequential-pipeline-architecture-voice-agents), 23 de marzo de 2026. Explica cómo el STT, la generación del modelo y el TTS se solapan mediante streaming y por qué la latencia end-to-end no debe modelarse como una suma estrictamente bloqueante de etapas completas.
[^livekit-agents]: LiveKit, [Agents framework introduction](https://docs.livekit.io/agents/). Describe el framework open source, WebRTC hacia usuarios, pipelines y separación respecto a las capacidades gestionadas de LiveKit Cloud.
[^livekit-session]: LiveKit, [AgentSession](https://docs.livekit.io/agents/logic/sessions/). Contrato de orquestación de input, pipeline, tools, turn handling, eventos y control de sesión.
[^livekit-server-lifecycle]: LiveKit, [Server lifecycle](https://docs.livekit.io/agents/server/lifecycle/). Capacity exchange, aislamiento de jobs por proceso, draining y redispatch tras desconexión del agent.
[^livekit-self-hosting]: LiveKit, [Self-hosting overview](https://docs.livekit.io/transport/self-hosting/). Separa Agents framework/SIP autohospedables de hosting, observabilidad e inference gestionados en LiveKit Cloud.
[^livekit-sip]: LiveKit, [SIP primer](https://docs.livekit.io/reference/telephony/sip-primer/). Flujo SIP/RTP para conectar telefonía tradicional con aplicaciones WebRTC/rooms de LiveKit.
[^livekit-tokens]: LiveKit, [Tokens & grants](https://docs.livekit.io/home/server/generating-tokens). Documenta access tokens JWT, identidad, room y permisos/grants para media y SIP.
[^livekit-testing]: LiveKit, [Testing and evaluation](https://docs.livekit.io/agents/start/testing/). Test framework para comportamiento, tool calls y conversaciones, además de agent simulations; distingue tests locales/CI de simulaciones y superficies Cloud.
[^pipecat-pipeline]: Pipecat, [Pipeline & Frame Processing](https://docs.pipecat.ai/pipecat/learn/pipeline). Pipeline, `FrameProcessor`, frames, colas, lifecycle, observers y métricas.
[^pipecat-transports]: Pipecat, [Transports](https://docs.pipecat.ai/pipecat/learn/transports) y [Choosing a Transport](https://docs.pipecat.ai/client/concepts/choosing-a-transport). Separa la lógica del pipeline del transporte y documenta Daily, LiveKit, SmallWebRTC y WebSocket con sus ámbitos de uso.
[^pipecat-turns]: Pipecat, [User Turn Strategies](https://docs.pipecat.ai/api-reference/server/utilities/turn-management/user-turn-strategies). Estrategias configurables para inicio/fin de turno e interrupciones.
[^pipecat-tools]: Pipecat, [Function Calling](https://docs.pipecat.ai/pipecat/learn/function-calling). Tools, contexto, cancelación por interrupción y function calls asíncronas.
[^pipecat-metrics]: Pipecat, [Metrics](https://docs.pipecat.ai/pipecat/fundamentals/metrics) y [OpenTelemetry Tracing](https://docs.pipecat.ai/api-reference/server/utilities/opentelemetry). TTFB, processing, usage, observers y tracing.
[^pipecat-telephony]: Pipecat, [FastAPIWebsocketTransport](https://docs.pipecat.ai/api-reference/server/services/transport/fastapi-websocket). Transporte WebSocket server-side orientado a integraciones de telefonía y serializers.
[^pipecat-custom]: Pipecat, [Custom FrameProcessor](https://docs.pipecat.ai/pipecat/fundamentals/custom-frame-processor). Extensión del pipeline con lógica propia preservando frames de control/lifecycle.
[^pipecat-livekit]: Pipecat, [LiveKitTransport](https://docs.pipecat.ai/api-reference/server/services/transport/livekit). Pipeline Pipecat sobre rooms y WebRTC de LiveKit, autohospedado o Cloud.
[^pipecat-session-lifecycle]: Pipecat, [Session Lifecycle](https://docs.pipecat.ai/client/concepts/session-lifecycle). Documenta estados de sesión y que el cliente debe iniciar una nueva conexión tras disconnect; no define una política universal de reconnect para todos los transportes.
[^pipecat-websocket-reconnect]: Pipecat, [WebSocketTransport](https://docs.pipecat.ai/api-reference/client/js/transports/websocket). El transporte WebSocket del cliente documenta dos intentos automáticos de reconexión antes de desconectar limpiamente.
[^pipecat-service-events]: Pipecat, [Service Events](https://docs.pipecat.ai/api-reference/server/events/service-events). Los servicios basados en WebSocket documentan una política propia de reconnect con exponential backoff, separada del lifecycle del cliente.
[^pipecat-websocket-auth]: Pipecat, [WebSocket Authentication](https://docs.pipecat.ai/pipecat-cloud/guides/websocket-authentication). Capacidad de Pipecat Cloud para proteger conexiones WebSocket con tokens HMAC de sesión; no es una propiedad universal de Pipecat core.
[^openai-webrtc-scale]: OpenAI, [How OpenAI delivers low-latency voice AI at scale](https://openai.com/index/delivering-low-latency-voice-ai-at-scale/). Detalla las responsabilidades que WebRTC estandariza: ICE/NAT traversal, DTLS/SRTP, codecs, RTCP, echo cancellation y jitter buffering.
[^openai-realtime-model]: OpenAI, [GPT-Realtime model](https://developers.openai.com/api/docs/models/gpt-realtime). Modalidades de texto/audio, transportes Realtime y function calling.
[^openai-realtime-intro]: OpenAI, [Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/). Describe el pipeline ASR → modelo de texto → TTS, la pérdida de señales acústicas y el streaming directo de audio.
[^gemini-live]: Google, [Get started with Gemini Live API](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk). Sesiones persistentes, entrada de audio y salida de audio nativa en tiempo real.
[^gemini-tools]: Google, [Tool use with Live API](https://ai.google.dev/gemini-api/docs/live-api/tools). Contrato de function calling y devolución explícita de resultados a la sesión.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 8 de julio de 2026. Arquitectura full-duplex y separación entre interacción continua y trabajo más profundo.
[^moshi]: Défossez et al. (2024), [Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/abs/2410.00037). Diálogo hablado full-duplex con streams paralelos para usuario y asistente y sin segmentación explícita en turnos.
