---
title: "Agentes de voz en tiempo real"
seo_title: "Agentes de voz en tiempo real: arquitectura, turnos, latencia y evaluación"
description: "Qué es un agente de voz en tiempo real, cómo se diseña el camino de audio, turn-taking, latencia, tools, telefonía y evaluación, con guías y herramientas de 5sigmas."
keywords: "agentes de voz, voice agents, realtime voice agents, speech to speech, turn taking, latencia voz, barge in, WebRTC, SIP, STT, TTS"
date: 2026-09-16
date_modified: 2026-09-16
---

# Agentes de voz en tiempo real

Un **agente de voz en tiempo real** es un sistema que mantiene una conversación hablada mientras coordina audio entrante, detección de turnos, inferencia, audio saliente y acciones externas bajo restricciones de tiempo. No es simplemente un chatbot con STT y TTS: el runtime debe decidir **cuándo escuchar, cuándo responder, qué puede interrumpirse y qué operaciones siguen vivas aunque cambie el turno**.

La unidad útil de diseño es el sistema completo. Una voz natural no compensa un endpointing lento; un modelo rápido no arregla una cola de reproducción larga; cancelar audio no cancela automáticamente una reserva, un pago o cualquier otra tool ya ejecutada.

## La respuesta en 60 segundos

Un agente de voz fiable separa al menos seis problemas:

1. **Camino de modalidad.** Puede usar una cascada `audio → STT → LLM → TTS → audio`, un modelo audio-in/text-out con síntesis externa o una arquitectura speech-to-speech.
2. **Turn-taking.** Detectar actividad de voz no equivale a decidir que el usuario terminó. Endpointing, interrupción y reanudación necesitan estado propio.
3. **Presupuesto de latencia.** Hay que medir tiempo hasta primer audio y recuperación tras una interrupción sobre el camino crítico real, no sumar métricas incompatibles de dashboards distintos.
4. **Tools y estado.** La conversación y las operaciones externas tienen ciclos de vida diferentes. Una acción durable necesita identificador, estado, idempotencia y política de cancelación explícita.
5. **Transporte.** WebRTC, WebSocket, SIP y telefonía introducen buffers, jitter, transcoding y fronteras distintas. Transporte bidireccional no implica por sí solo conversación full-duplex.
6. **Evaluación.** La respuesta final no basta: deben observarse turnos, audio realmente reproducido, interrupciones, latencia, tools, fallos, recuperación y estado final.

## Arquitecturas de voz: dónde vive la frontera de texto

La primera decisión es qué representación cruza cada componente. Una **full cascade** conserva fronteras explícitas entre reconocimiento, razonamiento y síntesis; una arquitectura **audio-in/text-out + TTS** elimina la obligación de un ASR externo como única entrada pero mantiene una salida textual; un sistema **speech-to-speech** puede modelar audio de entrada y salida sin exponer una frontera textual obligatoria entre comprensión y síntesis.

Estas familias no determinan por sí solas la simultaneidad. **Speech-to-speech y full-duplex son ejes diferentes**: el primero describe modalidades; el segundo, qué puede escuchar, procesar y producir el sistema mientras ya está hablando.

La guía técnica [Arquitecturas de agentes de voz: cascade, speech-to-speech y full-duplex](/articulos-tecnicos/voice-agent-architectures/) compara las tres familias con sus límites de control, streaming, tools y observabilidad. El [capítulo 1 de la serie](/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/) organiza la misma decisión como punto de partida de diseño.

## Turn-taking: el problema no termina en VAD

Un detector de actividad de voz puede indicar que hay señal compatible con habla. El runtime todavía debe decidir si esa señal abre un turno, si una pausa lo cierra, si el usuario interrumpió al agente o si solo produjo ruido breve.

Por eso conviene separar **señal acústica**, **decisión de turno** y **política de interacción**. Una implementación puede tener buen VAD y seguir cortando al usuario demasiado pronto o tardando demasiado en responder.

[Turn-taking: detectar voz no es decidir el turno](/series/agentes-voz-tiempo-real/02-turn-taking/) desarrolla endpointing, interrupciones y estados de conversación sin convertir un umbral de milisegundos en una constante universal.

## Latencia: medir el camino crítico hasta el audio útil

La métrica que percibe el usuario no es «latencia del LLM» aislada. El tiempo hasta primer audio puede incluir transporte, decisión de fin de turno, STT o encoding acústico, inferencia, TTS, buffering y reproducción. Algunas etapas se solapan; otras están en serie.

El [explorador de latencia para agentes de voz](/herramientas/latencia-agente-voz/) permite cambiar esos componentes y separar **tiempo hasta primer audio**, **barge-in** y supuestos de solapamiento. El [capítulo 3](/series/agentes-voz-tiempo-real/03-presupuesto-latencia/) explica cómo convertir el diagrama de componentes en un presupuesto de camino crítico medible.

## Tools y estado: interrumpir voz no deshace efectos externos

Una conversación puede avanzar mientras una tool sigue ejecutándose. Si el usuario corrige una fecha después de que empezó una reserva, el sistema necesita saber si la operación está pendiente, confirmada, cancelable, compensable o ya irreversible.

El contrato robusto separa como mínimo:

- `turn_id`: qué turno originó la intención;
- `operation_id`: qué operación durable se inició;
- estado de ejecución: solicitada, aceptada, completada, fallida o cancelada;
- idempotencia: cómo evitar duplicar un efecto tras retry o reconexión;
- política de interrupción: qué puede detener el playback, la inferencia y la tool.

[Tools y estado: ejecutar acciones sin romper la conversación](/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/) profundiza en ese ciclo. [Agentes reactivos y proactivos en voz](/articulos-tecnicos/reactive-proactive-voice-agents/) conecta actividad acústica, playback, barge-in y operaciones asíncronas.

## WebRTC, SIP y telefonía: seguir el audio extremo a extremo

WebRTC y SIP resuelven capas distintas. WebRTC define capacidades de comunicación en tiempo real entre endpoints; SIP es un protocolo de señalización para establecer, modificar y terminar sesiones. En telefonía, además aparecen carriers, media gateways, codecs, jitter buffers y posibles transcodificaciones.

El [capítulo 5](/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/) sigue ese recorrido para evitar atribuir al modelo una latencia que se introdujo en la red o en el pipeline de media.

## Capacidad y coste: una conversación rápida también debe escalar

Una demo puede funcionar con una llamada y fallar al multiplicar concurrencia, límites de proveedor y minutos facturables. El [planificador de coste y capacidad de agentes de voz](/herramientas/coste-capacidad-agente-voz/) separa llamadas conectadas, audio de STT/TTS, tokens, workers y concurrencia de proveedor para estimar coste mensual y capacidad.

Esto evita confundir dos preguntas distintas: **¿responde suficientemente rápido?** y **¿puede sostener la carga esperada dentro del presupuesto?**

## Cómo evaluar un agente de voz

Una evaluación útil conserva evidencia por turno y por operación. Como mínimo debería poder responder:

- qué audio recibió realmente el sistema;
- cuándo decidió que el usuario terminó o interrumpió;
- qué salida generó y qué parte llegó a reproducirse;
- qué tools se propusieron, autorizaron y ejecutaron;
- qué latencias ocurrieron en cada frontera relevante;
- si una interrupción dejó trabajo obsoleto vivo;
- cuál fue el estado final de la tarea y si hubo recuperación.

[Evaluar un agente de voz: evidencia por turno, observabilidad y reliability](/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/) convierte esas señales en un contrato de evaluación reproducible.

## Ruta de aprendizaje en 5sigmas

1. [Arquitecturas de voz](/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/): decide dónde colocar las fronteras de modalidad.
2. [Turn-taking](/series/agentes-voz-tiempo-real/02-turn-taking/): separa señal acústica de decisión conversacional.
3. [Presupuesto de latencia](/series/agentes-voz-tiempo-real/03-presupuesto-latencia/): mide el camino crítico.
4. [Tools y estado](/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/): gobierna acciones duraderas y cancelación.
5. [WebRTC, SIP y telefonía](/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/): localiza transporte, buffers y red.
6. [Evaluación y observabilidad](/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/): prueba el sistema por turno y por operación.

Para experimentar con números, usa [Latencia de agentes de voz](/herramientas/latencia-agente-voz/) y [Coste y capacidad de agentes de voz](/herramientas/coste-capacidad-agente-voz/). Para comparar arquitecturas completas, abre [la guía de cascade, speech-to-speech y full-duplex](/articulos-tecnicos/voice-agent-architectures/).

## Preguntas frecuentes

### ¿Un agente de voz speech-to-speech siempre tiene menos latencia?

No. Puede eliminar o solapar fronteras de una cascada, pero la latencia real depende del modelo, streaming, endpointing, red, buffering y reproducción. Debe medirse con la misma definición de inicio y fin para cada arquitectura.

### ¿WebRTC hace que un agente sea full-duplex?

No. WebRTC permite comunicación bidireccional en tiempo real, pero el runtime y el modelo todavía deben decidir si pueden escuchar, actualizar estado y producir salida mientras existe playback activo.

### ¿Barge-in significa cancelar la tool que estaba ejecutándose?

No. Barge-in suele describir la interrupción de la salida hablada. Una operación externa necesita su propia semántica de cancelación o compensación; algunas acciones ya ejecutadas no pueden deshacerse.

### ¿Qué debería medir primero en producción?

Empieza por éxito de tarea, tiempo hasta primer audio, errores de turn-taking, interrupciones, audio efectivamente reproducido, estado de tools y recuperación. Después segmenta por idioma, ruta de media, proveedor y tipo de tarea para encontrar la causa real.

## Fuentes primarias y estándares

- [OpenAI — Build more natural voice experiences with GPT-Live-1 in the API](https://openai.com/index/introducing-gpt-live-1-in-the-api/)
- [OpenAI — Realtime API](https://platform.openai.com/docs/guides/realtime)
- [W3C — WebRTC 1.0: Real-Time Communication Between Browsers](https://www.w3.org/TR/webrtc/)
- [IETF — RFC 3261: SIP: Session Initiation Protocol](https://www.rfc-editor.org/rfc/rfc3261)
- [LiveKit — Turns overview](https://docs.livekit.io/agents/logic/turns/)
- [Pipecat — Pipeline fundamentals](https://docs.pipecat.ai/guides/learn/pipeline)
