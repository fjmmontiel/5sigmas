---
title: "Presupuesto de latencia: medir el camino crítico, no sumar dashboards"
description: "Cómo descomponer la latencia de un agente de voz desde el fin del habla hasta el playback, separar captura, red, turn-taking, inferencia y audio, y optimizar sin comparar métricas incompatibles."
date: 2026-09-10
date_modified: 2026-09-10
tags:
  - IA
  - Voz
  - Realtime
  - Latencia
  - Producción
---

# Capítulo 3 — Presupuesto de latencia: medir el camino crítico, no sumar dashboards

Un proveedor puede anunciar una respuesta rápida y el agente seguir sintiéndose lento. También puede ocurrir lo contrario: una etapa interna parece costosa en un dashboard, pero apenas mueve el tiempo que percibe el usuario porque parte de ese trabajo ocurre mientras otra etapa ya está avanzando.

La razón es que **la latencia conversacional no es un único tiempo ni la suma automática de todas las latencias que exponen los componentes**.

Entre la última parte útil del turno del usuario y el comienzo real del audio de respuesta pueden intervenir:

- captura y procesado del micrófono;
- packetización y transporte de entrada;
- VAD, transcripción y decisión de fin de turno;
- inferencia del modelo;
- agregación de texto y síntesis de voz cuando existe TTS;
- packetización y transporte de salida;
- jitter buffers y otras colas;
- reproducción del navegador, teléfono o dispositivo.

{{ include_html("snippets/articulos-tecnicos/voice-latency-critical-path.html") }}

La pregunta de este capítulo es concreta: **¿cómo construyes un presupuesto de latencia que corresponda al camino que realmente espera el usuario y que permita localizar el cuello de botella sin contar trabajo dos veces?**

## Una métrica de latencia necesita dos fronteras explícitas

Decir «tenemos 400 ms de latencia» no es suficiente. Hay que saber **desde qué evento hasta qué evento** se han medido esos 400 ms.

Para un turno de voz son útiles tres fronteras distintas:

```text
t_speech_stop     = fin de habla observado
t_turn_commit     = el sistema acepta el turno como completo
t_first_playout   = comienza la reproducción de la respuesta
```

Con ellas podemos definir:

```text
L_turn     = t_turn_commit   - t_speech_stop
L_response = t_first_playout - t_turn_commit
L_user     = t_first_playout - t_speech_stop
```

Si los tres timestamps pertenecen al mismo contrato temporal, entonces:

```text
L_user = L_turn + L_response
```

Esto parece trivial, pero evita un error común: comparar `TTFB` de un modelo con una métrica que empieza en el fin del habla, o comparar el primer chunk de TTS con el momento en que el altavoz realmente empieza a reproducir.

### El reloj también forma parte de la definición

Restar timestamps de máquinas distintas sólo es válido si conoces la relación entre sus relojes. En un sistema distribuido, un offset o drift de reloj puede contaminar una diferencia pequeña.

Por eso conviene usar:

- un reloj monotónico para duraciones dentro del mismo proceso o dispositivo;
- IDs de turno y spans para correlacionar eventos entre servicios;
- sincronización de reloj explícita cuando realmente necesitas restar timestamps entre hosts;
- métricas de duración producidas por el propio componente cuando no puedes reconstruir una frontera global con suficiente precisión.

No presentes como «end-to-end» una resta cuyo inicio y final pertenecen a relojes no reconciliados.

## El camino crítico importa más que la suma de tiempos completos

En una pipeline clásica STT → LLM → TTS, escribir esto es tentador:

```text
latencia = STT + LLM + TTS + red
```

Pero una pipeline streaming no funciona necesariamente de forma secuencial a ese nivel.

El STT puede producir parciales mientras el usuario todavía habla. El modelo puede empezar a emitir tokens antes de completar toda su respuesta. El TTS puede empezar a sintetizar cuando recibe suficiente texto, mientras el modelo sigue generando.

Por eso la pregunta correcta después de `speech_stop` no es «¿cuánto tardó STT en total?», sino **qué trabajo residual sigue bloqueando la primera muestra de audio que puede reproducirse**.

LiveKit refleja esta distinción en sus métricas actuales. Para un turno de usuario expone `transcription_delay` y `end_of_turn_delay`; para el turno del agente expone `llm_node_ttft`, `tts_node_ttfb` y `e2e_latency`. Su documentación también propone `EOU + LLM TTFT + TTS TTFB` como una aproximación granular para una pipeline STT-LLM-TTS.[^livekit-data-hooks]

Esa suma es útil dentro de **esa definición y esa pipeline**, pero no es una ley física del agente. No incluye automáticamente la captura acústica del cliente, todos los tramos de red ni el tiempo hasta que un dispositivo remoto produce sonido. Además, `llm_node_ttft` y `tts_node_ttfb` no se rellenan para un modelo realtime en LiveKit.[^livekit-data-hooks]

La regla práctica es:

> Usa las métricas de componentes para explicar una métrica de usuario. No sustituyas la métrica de usuario por la suma de métricas cuyos límites no coinciden.

## Captura: el primer buffer ya puede llegar con latencia acumulada

Antes de que el runtime vea audio ya puede existir latencia en el dispositivo, el sistema operativo y el navegador.

La especificación Media Capture and Streams define `latency` para una pista de audio como el tiempo desde el inicio del procesamiento —por ejemplo, cuando ocurre el sonido real— hasta que los datos están disponibles para el siguiente paso. También advierte que el valor es la latencia objetivo de la configuración y que la latencia real puede variar.[^w3c-media-capture]

Esto tiene dos consecuencias:

1. La captura no debe tratarse como un coste cero sólo porque tu servidor recibe frames rápidamente.
2. Un setting del navegador no sustituye una medición acústica cuando necesitas conocer el tiempo físico exacto micrófono → aplicación.

Echo cancellation, noise suppression, resampling y buffering pueden cambiar tanto latencia como calidad. Optimizar una de esas variables sin mantener la otra controlada puede mover el problema en vez de resolverlo.

## Packetización y red: menos buffer no siempre significa mejor conversación

El audio se transporta en unidades discretas. Eso introduce una decisión entre frecuencia de envío, overhead y tolerancia a pérdidas.

El perfil RTP de RFC 3551 establece como valor por defecto para audio packetizado **20 ms o un frame, lo que sea mayor**, salvo que el formato indique otra cosa. El mismo estándar explica el trade-off: paquetes más largos reducen overhead de cabeceras, pero aumentan el retardo y hacen más visible una pérdida.[^rfc3551]

Ese 20 ms no es «la latencia de WebRTC» ni un valor universal que debas copiar. Es un ejemplo normativo de por qué la packetización forma parte del presupuesto.

Después aparece la variabilidad de la red. Un de-jitter buffer retiene media antes de reproducirla para absorber variaciones de llegada; paquetes excesivamente tardíos pueden perder su instante de playout.[^rfc7005]

WebRTC expone esta capa de forma observable. En `RTCInboundRtpStreamStats`, la media del tiempo pasado en el jitter buffer puede calcularse como:

```text
avg_jitter_buffer_delay = jitterBufferDelay / jitterBufferEmittedCount
```

La especificación también separa `jitterBufferTargetDelay` y `jitterBufferMinimumDelay`, precisamente para distinguir el target aplicado de la demora mínima atribuible a las condiciones de red.[^webrtc-stats]

Eso permite investigar una conversación que «se siente lenta» sin asumir que todo el problema es inferencia.

### RTT no es automáticamente latencia de ida

Un RTT mide ida y vuelta bajo su propia definición. Dividirlo por dos presupone, entre otras cosas, suficiente simetría del camino y compatibilidad temporal. En Internet móvil, rutas, colas y radios pueden ser asimétricos.

Si necesitas latencia unidireccional, mide esa frontera de forma explícita o documenta las hipótesis. `RTT / 2` puede ser una estimación operacional, no una verdad medida.

## Turn-taking puede dominar aunque el modelo sea rápido

El capítulo anterior separó VAD de end-of-turn. Aquí aparece su consecuencia temporal.

LiveKit define `end_of_turn_delay` como el tiempo entre el fin del habla y la decisión de terminar el turno. Su `EOUMetrics.end_of_utterance_delay` incluye la `transcription_delay` cuando aplica.[^livekit-data-hooks][^livekit-eou]

Eso significa que bajar el TTFT del modelo no arregla una política de endpointing que espera demasiado. También significa que reducir agresivamente el endpointing puede mejorar el número de latencia y empeorar el sistema al cortar frases.

Un presupuesto de producción debe mirar juntos:

```text
latencia de fin de turno
+ tasa de endpoint prematuro
+ tasa de endpoint tardío
```

No declares una configuración mejor si sólo gana en tiempo y pierde corrección conversacional.

## Inferencia: TTFB de servicio no equivale a primera respuesta audible

En una cascade hay varias fronteras posibles:

```text
final transcript
→ primera entrada aceptada por el LLM
→ primer token del LLM
→ texto suficiente para sintetizar
→ primer chunk del TTS
```

Pipecat hace visible parte de esta diferencia. Sus métricas actuales separan `TTFB`, `Processing Time` y, para TTS, `Text Aggregation`: el tiempo desde el primer token del LLM hasta la primera frase completa usada por la síntesis.[^pipecat-metrics]

Por tanto, optimizar sólo LLM TTFT puede no mover la experiencia si el sistema espera una frase completa antes de empezar TTS. Del mismo modo, un TTS con buen TTFB no resuelve un end-of-turn lento.

En speech-to-speech la frontera interna cambia. Puede no existir un STT/LLM/TTS observable como tres servicios separados, pero siguen existiendo eventos del sistema: fin de turno, request/commit, primer output de audio y playout. **Que una arquitectura oculte etapas no elimina la necesidad de medir sus fronteras externas.**

## Primer audio generado no es primer audio escuchado

El servidor puede producir un chunk y el usuario seguir sin oír nada.

Entre ambos pueden quedar:

- serialización y packetización;
- transporte;
- jitter buffer;
- cola de reproducción;
- audio graph;
- salida del sistema operativo y hardware.

La Web Audio API separa dos conceptos útiles. `AudioContext.baseLatency` representa la latencia de procesamiento desde `AudioDestinationNode` hasta el subsistema de audio, sin incluir todo el procesamiento posterior ni el grafo. `outputLatency` estima el intervalo desde que el navegador pide al host reproducir un buffer hasta que la primera muestra es procesada por el dispositivo de salida.[^webaudio]

Por eso un evento `audio_chunk_received` no debe llamarse `playback_started`.

En browser, móvil y PSTN la frontera observable final será distinta. El diseño de telemetría debe nombrar exactamente qué sabe: **frame enviado, frame recibido, frame encolado, playback reportado o audio acústicamente medido**.

## El presupuesto debe ser una distribución, no una media

Una media puede ocultar que la mayoría de turnos son rápidos y una fracción relevante acumula retransmisiones, jitter, cold starts o colas.

Para producción conserva al menos la distribución de las fronteras importantes —por ejemplo p50, p90, p95 y p99 cuando el volumen lo permita— y segmenta por variables que cambian el camino:

- canal: browser, app, PSTN;
- región de usuario y región de compute;
- transporte y codec;
- proveedor y modelo;
- longitud y tipo de turno;
- idioma;
- estado warm/cold;
- calidad de red y packet loss;
- interrupción o turno normal.

Los percentiles no deben convertirse en targets universales por copiar los de otro producto. Sirven para ver la distribución de **tu** workload bajo una definición estable.

## La percepción humana da contexto, no un SLA

Stivers et al. estudiaron turn-taking en una muestra mundial de **10 idiomas**. Encontraron evitación general del solapamiento y minimización del silencio, con diferencias entre idiomas en el gap medio dentro de un rango de **250 ms respecto a la media entre idiomas**.[^stivers2009]

Ese resultado ayuda a entender por qué pequeñas diferencias temporales pueden cambiar la sensación de una conversación. No establece que un agente de voz deba responder en 250 ms. El estudio describe conversaciones humanas, idiomas y condiciones distintas de una pipeline de IA.

Úsalo como evidencia de que el timing importa, no como presupuesto de ingeniería.

## LiveKit, Pipecat o vanilla: la observabilidad cambia, la definición no

El runtime determina qué timestamps y correlaciones recibes de serie.

| Pregunta de latencia | LiveKit Agents | Pipecat | Python vanilla/thin |
|---|---|---|---|
| Fin de turno | `transcription_delay`, `end_of_turn_delay`, EOU metrics cuando aplican | Turn tracking + observers/frames elegidos por la pipeline | Evento del provider/VAD/detector que la app declare autoritativo |
| Servicio/modelo | métricas por plugin; LLM TTFT y TTS TTFB en cascade | `TTFB`, processing y text aggregation por processor/service | métricas del provider + timestamps alrededor del SDK/protocolo |
| Usuario → bot | `ChatMessage.metrics.e2e_latency` según la definición de Agents | `UserBotLatencyObserver` mide user stop → bot start | la app debe definir y correlacionar ambos eventos |
| Media/red | complementa con métricas del transporte/cliente; no está toda dentro del TTFT | depende del transport y observers añadidos | WebRTC stats, carrier/media events y telemetría propia |
| Correlación | `speech_id` y trazas | frames, observers y tracing | trace/turn IDs diseñados por la aplicación |

LiveKit documenta `e2e_latency` como el tiempo desde que el usuario dejó de hablar hasta que el agente empezó a responder.[^livekit-data-hooks] Pipecat documenta `UserBotLatencyObserver` como la medida entre el fin del habla del usuario y el inicio del habla del bot.[^pipecat-metrics]

Aunque los nombres parecen comparables, **no publiques una comparación entre frameworks hasta validar que speech-stop, bot-start, playback y transporte representan exactamente la misma frontera en el mismo experimento**.

### Elige LiveKit Agents cuando su contrato de sesión ya es tu unidad de observación

Si tu aplicación usa `AgentSession`, las métricas por turno y `speech_id` reducen el trabajo de correlación. Aun así, combina esa telemetría con la capa de media necesaria para el canal real cuando quieres explicar captura, red o playout.

### Elige Pipecat cuando quieres medir la pipeline por processors y observers

Pipecat es útil cuando necesitas ver TTFB, processing, text aggregation y user-bot latency dentro de una composición explícita. Esa modularidad facilita localizar qué processor añade espera, pero el significado de la métrica sigue dependiendo del servicio y del transport.

### Elige vanilla/thin cuando necesitas controlar la frontera de medición

Puede ser la opción adecuada para experimentos de protocolo, provider-direct WebRTC o rutas de media muy específicas. A cambio, la aplicación debe poseer clocks monotónicos, IDs de turno, spans, correlación entre media y negocio, exportación, replay y definición exacta de cada métrica.

### Un híbrido suele ser razonable para observabilidad

Puedes correlacionar métricas del runtime con `RTCStats`, eventos de carrier y spans propios. El requisito es una sola taxonomía de eventos y un ID de turno que atraviese las capas que pretendes comparar.

No elijas runtime porque un dashboard enseñe una cifra más baja. Primero comprueba qué empieza y qué termina esa cifra.

## Un procedimiento reproducible para encontrar el cuello de botella

No hace falta inventar un benchmark de frameworks. Hace falta conservar las condiciones.

1. **Define la métrica de usuario.** Por ejemplo, `speech_stop → first_playout`.
2. **Fija las condiciones.** Mismo hardware, ruta de red, codec, provider/model, política de turno, audio y carga.
3. **Instrumenta eventos, no sólo servicios.** Speech stop, commit, request, primer token/audio, send, receive y playback.
4. **Correlaciona por turno.** No mezcles métricas de requests distintos.
5. **Mira distribuciones.** La cola puede tener una causa distinta de la mediana.
6. **Aísla una capa.** Cambia una política o componente manteniendo el resto estable.
7. **Repite suficientes veces para estimar variación.** Si no puedes controlar el experimento, no publiques un ranking numérico.
8. **Verifica calidad y reliability.** Menos espera no compensa más endpoints prematuros, audio degradado o tools duplicadas.

Una traza mínima útil puede tener esta forma:

```text
turn_id
client_capture_stop
server_speech_stop
turn_committed
model_request_start
model_first_output
first_audio_encoded
first_audio_sent
first_audio_received
playback_started
```

No todas las arquitecturas podrán observar todos los eventos. Esa ausencia también es información sobre la frontera de abstracción que has elegido.

## Qué debe quedar claro antes de producción

Un presupuesto de latencia está listo para QA cuando puedes responder:

- Cuál es la métrica principal percibida por usuario y cuáles son exactamente sus dos fronteras.
- Qué reloj mide cada duración.
- Qué parte pertenece a captura, media/red, turn-taking, inferencia y playout.
- Qué trabajo ocurre antes del fin del habla y qué trabajo queda en el camino crítico después.
- Qué métricas son outputs del framework, cuáles del provider y cuáles del sistema operativo/navegador/carrier.
- Cómo distingues primer byte, primer token, primer audio generado y primer audio reproducido.
- Qué jitter/packet-loss/buffering acompaña a un turno lento.
- Qué percentiles vigilas y por qué segmentos.
- Cómo correlacionas todas las observaciones del mismo turno.
- Qué trade-off de calidad, coste o reliability introduces al reducir espera.

La idea central es ésta: **el presupuesto correcto se construye desde fronteras observables del usuario hacia dentro**. Una vez fijado `speech_stop → first_playout`, las métricas de VAD, red, TTFT, TTS y buffers sirven para explicar esa duración. Sin esa frontera común, sólo estás comparando relojes y dashboards distintos.

## Fuentes primarias

[^livekit-data-hooks]: LiveKit. *Data hooks — Metrics and usage data / Per-turn latency / Measure conversation latency*. https://docs.livekit.io/deploy/observability/data/
[^livekit-eou]: LiveKit. *EOUMetrics API*. https://docs.livekit.io/reference/python/livekit/agents/metrics/index.html
[^pipecat-metrics]: Pipecat. *Metrics*. https://docs.pipecat.ai/pipecat/fundamentals/metrics
[^w3c-media-capture]: W3C. *Media Capture and Streams — latency constrainable property*. https://www.w3.org/TR/mediacapture-streams/
[^webrtc-stats]: W3C. *Identifiers for WebRTC's Statistics API*. https://www.w3.org/TR/webrtc-stats/
[^webaudio]: W3C. *Web Audio API 1.1 — AudioContext baseLatency/outputLatency*. https://www.w3.org/TR/webaudio-1.1/
[^rfc3551]: IETF. RFC 3551. *RTP Profile for Audio and Video Conferences with Minimal Control*. https://www.rfc-editor.org/rfc/rfc3551.html
[^rfc7005]: IETF. RFC 7005. *RTCP XR Block for De-Jitter Buffer Metric Reporting*. https://www.rfc-editor.org/rfc/rfc7005.html
[^stivers2009]: Stivers, T. et al. (2009). *Universals and cultural variation in turn-taking in conversation*. PNAS 106(26), 10587–10592. https://doi.org/10.1073/pnas.0903616106
