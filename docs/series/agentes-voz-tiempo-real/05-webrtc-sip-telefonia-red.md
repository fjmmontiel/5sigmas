---
title: "WebRTC, SIP y telefonía: seguir el camino real del audio"
description: "Cómo razonar sobre WebRTC, SIP, RTP, codecs, jitter, pérdida de paquetes, NAT, TURN y telefonía sin confundir señalización, media y runtime del agente."
date: 2026-09-10
date_modified: 2026-09-10
tags:
  - IA
  - Voz
  - Realtime
  - WebRTC
  - Telefonía
  - Producción
---

# Capítulo 5 — WebRTC, SIP y telefonía: seguir el camino real del audio

Un agente puede tener un modelo rápido y una lógica de turnos correcta y, aun así, sonar mal. El audio puede estar esperando en un jitter buffer, atravesando un relay TURN, entrando desde PSTN a 8 kHz, siendo transcodificado o llegando por una conexión TCP que bloquea paquetes posteriores cuando uno se retrasa.

Por eso la pregunta útil no es «¿uso WebRTC o SIP?». Es: **¿qué camino sigue realmente el audio, qué protocolo controla cada tramo y qué componente posee el buffering, la negociación de codecs, la recuperación de red y la observabilidad?**

Este capítulo separa esas fronteras y termina con una decisión operacional entre LiveKit Agents, Pipecat y una implementación thin/vanilla Python.

## Empieza por dibujar el camino, no por elegir un acrónimo

Tres planos distintos suelen mezclarse en conversaciones de arquitectura:

1. **Señalización y control.** Sirven para descubrir peers, negociar capacidades, crear una llamada o cambiar su estado.
2. **Media.** Son los paquetes que transportan el audio y su información temporal.
3. **Runtime del agente.** Consume audio, ejecuta turn-taking/modelos/tools y produce audio de vuelta.

En una llamada de navegador, WebRTC engloba negociación, conectividad ICE, media RTP protegida y mecanismos de tiempo real. En telefonía SIP, SIP establece y modifica la sesión, pero el audio normalmente circula por RTP/SRTP. Con un producto como Twilio Media Streams, el carrier sigue controlando la llamada telefónica y entrega audio a tu aplicación por WebSocket.

Esas tres rutas no asignan el mismo ownership a tu código.

```text
Browser WebRTC
mic → browser WebRTC → ICE path → media endpoint/SFU → agent runtime

Direct SIP/RTP telephony
PSTN/carrier → SIP signaling + SDP → RTP/SRTP media → media endpoint → agent runtime

Carrier WebSocket media
PSTN/carrier → carrier media gateway → WSS audio protocol → application/runtime
```

{{ include_html("snippets/articulos-tecnicos/voice-network-paths.html") }}

La última opción no convierte WebSocket en un sustituto general de SIP o WebRTC. Simplemente mueve la frontera: el carrier posee la terminación telefónica y expone un protocolo de media de aplicación.

## WebRTC: la ruta elegida por ICE importa

WebRTC no presupone que dos endpoints puedan enviarse UDP directamente. ICE reúne candidatos y prueba pares de conectividad. RFC 8445 distingue candidatos host, server-reflexive y relayed; STUN ayuda a descubrir una dirección visible desde fuera del NAT y TURN puede proporcionar una dirección relay cuando no existe una ruta directa viable.[^rfc8445]

TURN no significa «la llamada falló». Significa que el media necesita un relay adicional. Ese salto cambia la ruta de red y puede cambiar latencia, coste y dominio de fallo, por lo que debe ser observable.

LiveKit documenta actualmente esta secuencia de conectividad, de preferida a fallback: ICE sobre UDP, TURN sobre UDP, ICE sobre TCP y TURN sobre TLS.[^livekit-connect] UDP es la ruta preferida para media realtime; TCP/TLS permite atravesar redes más restrictivas, pero no tiene las mismas propiedades ante pérdida y congestión.

En producción registra, como mínimo, el candidate pair seleccionado, protocolo de transporte, uso o no de relay, región/media endpoint y cambios de conexión durante la sesión. Si sólo guardas «WebRTC connected=true», pierdes gran parte del diagnóstico.

## Por qué TCP puede sonar peor sin que el ancho de banda sea bajo

TCP entrega un flujo fiable y ordenado. Si un segmento se pierde, datos posteriores pueden quedar esperando su retransmisión. Para una descarga eso suele ser correcto. Para audio en vivo, un paquete tardío puede valer menos que el audio que ya debería estar reproduciéndose.

Ese efecto de **head-of-line blocking** es una razón para preferir rutas UDP cuando están disponibles. No significa que «TCP sea lento» de forma universal ni justifica publicar una penalización fija en milisegundos. La magnitud depende de RTT, pérdida, congestión, buffers y comportamiento de la red.

Por tanto, un fallback a TURN/TLS debe aparecer como dimensión en tus traces, no como un detalle invisible de conexión.

## Codec, sample rate y packetization son decisiones distintas

Un codec comprime o representa el audio. El sample rate indica cuántas muestras por segundo representa la señal. La packetization decide cuánto audio agrupas antes de enviarlo.

RFC 7874 exige que endpoints WebRTC implementen Opus, PCMA y PCMU. Cuando el endpoint puede procesar más de 8 kHz, recomienda ofrecer Opus antes que PCMA/PCMU.[^rfc7874] Esto es un requisito de interoperabilidad de endpoints WebRTC, no una garantía de que cada sesión negociará Opus.

La oferta/respuesta decide qué codec termina usándose. Por eso «el navegador soporta Opus» y «esta llamada usa Opus» son afirmaciones distintas.

### Opus no tiene una única duración de frame

El payload RTP de Opus permite frames de 2.5, 5, 10, 20, 40 o 60 ms, y un paquete puede agrupar varios frames hasta 120 ms.[^rfc7587]

Agrupar más audio por paquete reduce overhead relativo, pero aumenta el audio afectado si ese paquete se pierde y puede aumentar la espera antes de enviar. Frames/paquetes más pequeños reducen esa granularidad temporal, a cambio de más paquetes y overhead.

No optimices `ptime` de forma aislada. Mídelo junto con bitrate, pérdida, jitter, CPU, FEC y el comportamiento real del receptor.

### FEC necesita tiempo para recuperar

Opus puede usar in-band FEC. El encoder decide si incluye redundancia según estimaciones como pérdida esperada, capacidad disponible y sensibilidad de la señal; el receptor necesita acceso al paquete siguiente para recuperar audio anterior perdido.[^rfc7587]

Eso introduce un trade-off importante: la recuperación puede mejorar continuidad bajo pérdida, pero consume bitrate y necesita suficiente margen de jitter buffer para que el paquete reparador llegue antes del playout. «FEC activado» no equivale a «packet loss resuelto».

## Jitter no es lo mismo que latencia

Latencia describe retraso. Jitter describe variación en el tiempo de llegada de paquetes. Un stream puede tener RTT moderado y, aun así, necesitar buffering adicional porque los paquetes llegan de forma irregular.

El jitter buffer absorbe parte de esa variación retrasando el playout. Demasiado poco buffer produce under-runs o audio dañado cuando llegan paquetes tarde. Demasiado buffer puede producir audio estable pero una conversación lenta.

El API de estadísticas WebRTC expone métricas que permiten observar esta frontera. `jitterBufferDelay` acumula el tiempo que muestras/frames pasan en el buffer y `jitterBufferEmittedCount` cuenta cuántos han salido. Desde el inicio de la sesión:

```text
average_jitter_buffer_delay_seconds
    = jitterBufferDelay / jitterBufferEmittedCount
```

Para una ventana temporal usa deltas de ambos contadores, no el cociente acumulado de toda la llamada. `jitterBufferTargetDelay` refleja el target acumulado y `jitterBufferMinimumDelay` ayuda a separar el mínimo atribuible a características de red de delay añadido por otros mecanismos.[^webrtc-stats]

No conviertas una sola captura de `jitter` o `packetsLost` en diagnóstico. Correlaciona pérdida, jitter-buffer delay, RTT/candidate pair, codec, concealment y el instante exacto en que el usuario oyó la degradación.

## Packet loss no siempre produce un hueco audible

Un receptor puede ocultar pérdida mediante packet-loss concealment, usar redundancia/FEC o retrasar playout para esperar reparación. Por eso hay dos preguntas distintas:

- ¿se perdieron paquetes en la red?
- ¿qué degradación llegó al audio reproducido?

Para encontrar la causa necesitas métricas del transporte **y** del decoder/playout. Una tasa de pérdida sin contexto de codec, burstiness y concealment no describe por sí sola la experiencia de usuario.

Además, pérdida aleatoria y una ráfaga de pérdida con la misma proporción media pueden producir resultados perceptivos muy diferentes. Conserva distribuciones y ventanas por turno en vez de sólo una media por llamada.

## SIP no transporta por sí solo la voz

SIP es principalmente señalización de sesión. En un establecimiento típico, `INVITE` contiene o negocia SDP, la respuesta acuerda media y después RTP/SRTP transporta el audio.

Esto importa porque un `200 OK` de SIP no demuestra que exista audio bidireccional. Puedes tener señalización correcta y después sufrir RTP bloqueado por firewall, dirección/puerto SDP incorrectos, codec incompatible o media unidireccional.

Cuando depuras telefonía separa explícitamente:

```text
SIP signaling     ¿se creó la sesión y qué SDP se negoció?
RTP/SRTP media    ¿llegan paquetes en ambas direcciones?
codec path        ¿qué codec entra, dónde se decodifica/transcodifica?
agent media       ¿qué PCM/audio recibe y devuelve el runtime?
playout           ¿qué terminó reproduciendo el carrier/dispositivo?
```

Una única métrica «call connected» no cubre esas fronteras.

## La telefonía puede estrechar el audio antes de llegar al modelo

En LiveKit SIP, los codecs SIP por defecto son PCMU, PCMA y G722. AMR-WB está soportado pero no habilitado por defecto. La documentación especifica PCMU/PCMA a 8 kHz, AMR-WB a 16 kHz y la particularidad de señalización de G722, cuyo clock SDP aparece como 8 kHz aunque transporta audio wideband.[^livekit-sip-codecs]

LiveKit también deja claro que **los codecs SIP son distintos de los codecs usados dentro de una room**.[^livekit-sip-codecs] Esa separación evita una inferencia frecuente: que porque la room tenga audio de mayor fidelidad la pierna PSTN haya preservado esa misma información.

Si un tramo telefónico ya limitó el espectro o introdujo transcoding, subir después a PCM de mayor sample rate no recupera información que ya se perdió.

### Más codecs en la oferta tampoco es gratis

LiveKit explica por qué no habilita todos sus codecs SIP por defecto: cada codec añadido crece el SDP del `INVITE`; sobre SIP/UDP, paquetes grandes pueden fragmentarse y perderse. Su configuración permite añadir codecs o usar `only_listed_codecs` para limitar la oferta.[^livekit-sip-codecs]

La consecuencia general no es «ofrece pocos codecs». Es: entiende qué peers debes interoperar, qué transporte SIP usas y cuál es el riesgo de transcoding o fragmentación. La lista óptima depende de tu trunk y carriers.

## PSTN con WebSocket: el carrier puede esconder SIP y RTP de tu aplicación

Twilio Media Streams es un buen ejemplo de otra frontera. Una llamada de Twilio puede transmitir audio raw a tu servidor por WebSocket. En una stream bidireccional, tu aplicación recibe sólo el track inbound y puede enviar audio para reproducción en la llamada. Hay una sola stream bidireccional por Call.[^twilio-streams]

La sesión de WebSocket no te convierte en endpoint SIP. Twilio sigue poseyendo la pierna telefónica y tu aplicación implementa el protocolo Media Streams.

El contrato de audio actual es concreto: `audio/x-mulaw`, 8 kHz, mono. El audio que envías de vuelta debe usar ese formato y Twilio lo reproduce en el orden recibido.[^twilio-ws]

Los mensajes `mark` y `clear` también importan para barge-in. `mark` permite saber cuándo Twilio considera completado el playback del media enviado; `clear` vacía el buffer pendiente y devuelve los marks restantes.[^twilio-ws] Ese acknowledgement es evidencia del estado de playback **dentro de Twilio**, no prueba física de que el humano oyera cada muestra.

En seguridad, Twilio exige validar `X-Twilio-Signature` y la conexión Media Streams llega por WSS hacia tu servidor.[^twilio-streams]

## WebSocket de audio y WebRTC resuelven problemas diferentes

Un WebSocket es un canal bidireccional de aplicación sobre TCP. No añade automáticamente timestamps RTP, jitter buffer, ICE/TURN, codec negotiation o adaptación de media.

Pipecat refleja esa frontera en sus transports. `SmallWebRTCTransport` usa WebRTC peer-to-peer y expone configuración ICE/STUN/TURN; la documentación indica que en redes de producción puede ser necesario configurar esos servidores para NAT traversal.[^pipecat-smallwebrtc] `TwilioFrameSerializer`, en cambio, integra el protocolo WebSocket de Twilio Media Streams y convierte esa frontera carrier-specific a frames del pipeline.[^pipecat-twilio]

Por tanto, «Pipecat soporta WebRTC y Twilio» no significa que el mismo componente posea ambas redes. El transport/serializer seleccionado determina qué contrato entra al pipeline.

## Restricciones de red que debes probar de verdad

Un laboratorio con fibra y UDP abierto valida muy poco sobre usuarios detrás de VPN, NAT simétrico, firewall corporativo o redes móviles que cambian de interfaz.

Para WebRTC prueba, como mínimo:

- ruta UDP directa cuando sea posible;
- conexión por TURN/UDP;
- fallback TCP/TLS donde tu stack lo soporte;
- cambio Wi-Fi ↔ móvil o pérdida temporal de interfaz;
- pérdida aleatoria y burst loss;
- jitter variable;
- RTT alto y ancho de banda restringido;
- MTU/VPN si usas data channels o encapsulación adicional.

Para telefonía añade:

- transportes SIP que realmente uses: UDP/TCP/TLS;
- codec negotiation real contra cada trunk relevante;
- una y dos direcciones de RTP;
- DTMF si forma parte del producto;
- SRTP/TLS si los prometes en producción;
- llamadas entre regiones/carriers relevantes;
- re-INVITE o cambios de media si tu carrier los usa.

No necesitas meter todos esos fallos en cada test. Sí necesitas una matriz que conecte cada riesgo de producción con una prueba o evidencia concreta.

## Diagnóstico: identifica primero la frontera que falló

Una taxonomía útil evita culpar al modelo cuando el problema es de media:

| Síntoma | Primera frontera a inspeccionar | Evidencia útil |
|---|---|---|
| no conecta | signaling / ICE / firewall | ICE states, candidate pairs, TURN, SIP responses |
| conecta pero no hay audio | media routing | RTP counters, SDP directions, inbound/outbound track events |
| audio sólo en una dirección | NAT/firewall/SDP/media endpoint | RTP/track counters por dirección, PCAP si aplica |
| pausas o audio robotizado | jitter/loss/decoder | jitter buffer, loss windows, concealment, codec |
| conversación estable pero lenta | buffering/path | jitter-buffer delay, TURN/TCP route, playout queue |
| calidad pobre desde PSTN | codec/transcoding | SDP codec, carrier leg, transcode points, sample rate |
| se rompe tras cambio de red | reconnection/path migration | ICE/reconnect events, new candidate pair, media resume |

El mismo síntoma puede tener varias causas. La tabla ordena la investigación, no reemplaza la evidencia.

## No mezcles clocks ni fronteras de observabilidad

Los timestamps del browser, SFU/media server, runtime, proveedor de modelo y carrier pueden vivir en relojes distintos. Un trace distribuido debe correlacionar IDs y eventos, pero no restar timestamps de hosts sin sincronización suficiente y llamar al resultado «latencia de red».

Para WebRTC guarda snapshots/deltas de stats junto al `turn_id` o `speech_id`. Para SIP conserva Call-ID/trunk/SDP y, cuando sea necesario, PCAP o RTP stats. Para un carrier WebSocket conserva `callSid`/`streamSid`, timestamps/chunks y tus propios tiempos de ingest/playout.

La observabilidad útil permite responder «¿dónde se acumuló el tiempo o se perdió el audio?» sin inferirlo sólo desde el resultado final del modelo.

## LiveKit Agents vs Pipecat vs vanilla/thin en esta capa

La decisión cambia cuando el problema central es **media y red**, no sólo orquestación del modelo.

| Pregunta | LiveKit Agents + LiveKit media | Pipecat | Vanilla/thin Python |
|---|---|---|---|
| Browser media | LiveKit rooms/SFU y SDKs WebRTC poseen gran parte de conectividad/media | el transport elegido puede ser SmallWebRTC, Daily, LiveKit u otro | puedes usar WebRTC provider-direct/SDK externo o poseer tu propio endpoint |
| NAT / firewall | LiveKit posee ICE y puede usar TURN; Cloud y self-host tienen superficies operativas distintas | depende del transport; SmallWebRTC expone ICE/STUN/TURN a tu deployment | depende del endpoint elegido; si lo implementas tú, también posees ICE/TURN y su operación |
| PSTN | LiveKit SIP crea SIP participants/trunks/dispatch; Cloud ofrece SIP gestionado y self-host requiere desplegar el servicio SIP | puede entrar por transports/serializers de carriers o integraciones como LiveKit/Daily | puedes consumir un Media Stream carrier-managed o operar SIP/RTP directamente |
| Codec boundary | room media y SIP codec negotiation son capas separadas | depende del transport/serializer/provider | tú debes documentar cada decode/resample/transcode entre endpoints |
| Low-level packet control | menor si te mantienes en abstracciones de room/track; baja a infraestructura media si necesitas más | custom processors/transports dan control, condicionado por el transport subyacente | máximo si posees RTP/WebRTC stack; también máximo ownership de jitter/recovery/security |
| Observability | room/SIP/agent events y stats, pero debes correlacionar capas | pipeline events + métricas del transport seleccionado | debes diseñar y mantener captura de stats, IDs, PCAP hooks y correlación |
| Coste operativo | runtime + media/SIP infraestructura o servicios gestionados + inference | framework + transport/provider + deployment + inference | endpoints/providers + compute + TURN/SIP si aplica + ingeniería/on-call |

No hay un ganador universal. El punto de decisión es **qué frontera quieres poseer**.

### Elige LiveKit cuando la room/media plane es parte central del producto

Es una opción fuerte si necesitas browser/mobile WebRTC, rooms, participants, un SFU y una ruta SIP integrada bajo un mismo modelo de media. La abstracción permite que el agent runtime consuma tracks sin implementar cada detalle de ICE/RTP.

No atribuyas a `LiveKit Agents` lo que pertenece a LiveKit Cloud o LiveKit SIP. Agents es el runtime/orquestación; Cloud puede operar infraestructura media/TURN/SIP; un despliegue self-hosted debe operar sus propias piezas según la arquitectura elegida.[^livekit-telephony]

### Elige Pipecat cuando quieres componer la pipeline alrededor del transport

Pipecat encaja cuando quieres mantener explícita la pipeline de frames y poder cambiar entre transports/integraciones. Para WebRTC self-hosted, `SmallWebRTCTransport` deja visibles signaling e ICE servers. Para Twilio, el serializer habla el protocolo Media Streams específico del carrier.[^pipecat-smallwebrtc][^pipecat-twilio]

La flexibilidad no elimina la infraestructura del transport. Si escoges un transport gestionado, parte de la red la posee ese servicio. Si escoges SmallWebRTC, signaling, STUN/TURN y operación vuelven a tu deployment.

### Elige vanilla/thin cuando la frontera no estándar es tu ventaja o requisito

Thin Python puede ser muy razonable sin implementar protocolos desde cero. Un browser puede conectarse provider-direct por WebRTC y tu backend poseer sólo auth, policy y business state. Un carrier puede terminar PSTN/SIP y darte un WebSocket de media. En ambos casos reduces el runtime de orquestación sin asumir ownership del protocolo inferior.

Baja a RTP/SIP/WebRTC propios sólo cuando necesites control que los endpoints existentes no exponen: packet inspection, DSP específico, routing/media research, codec negotiation particular, SBC behavior o protocolos no estándar.

Entonces tu aplicación también debe poseer más cosas: signaling, ICE/TURN o SIP/RTP según el caso, jitter buffering, timestamps, codec negotiation, resampling, packet-loss strategy, reconnection, security, load testing, capacity planning y observabilidad.

### Un híbrido puede ser la frontera correcta

Ejemplos razonables:

- LiveKit posee rooms/WebRTC/SIP y Pipecat orquesta el pipeline mediante su `LiveKitTransport`.
- Twilio posee PSTN y Media Streams mientras Pipecat adapta el WebSocket con `TwilioFrameSerializer`.
- Un componente custom posee RTP/DSP de bajo nivel y entrega PCM normalizado a un runtime de agents que conserva tools/state/evals.

Un híbrido es útil cuando cada capa tiene un owner claro. Es peor cuando introduce dos componentes que creen poseer reconnection, buffering o cancelación sin una frontera explícita.

## Tres decisiones concretas

### 1. Asistente de navegador para usuarios en redes heterogéneas

Prioriza WebRTC, telemetría ICE/candidate-pair y TURN operativo. LiveKit es razonable si ya quieres rooms/SFU y operación media integrada. Pipecat con un transport WebRTC es razonable si la pipeline explícita pesa más. Thin/provider-direct es razonable si el proveedor realtime expone WebRTC y no necesitas una media plane propia.

No usaría raw WebSocket de audio desde el navegador como equivalente automático a WebRTC sólo porque sea más fácil de prototipar: estarías reasumiendo mecanismos de media que WebRTC ya resuelve.

### 2. Agente PSTN donde el carrier WebSocket cubre el producto

Si `audio/x-mulaw` 8 kHz, el control `media/mark/clear` y la telefonía gestionada del carrier son suficientes, Pipecat + serializer o thin Python sobre el Media Stream pueden ser más directos que operar SIP/RTP.

Si necesitas trunks propios, routing SIP, SRTP/TLS, control de codec por trunk o integración con rooms/participants, una media plane SIP como LiveKit SIP puede ser una frontera más adecuada. No compares estas opciones como si expusieran el mismo nivel de control.

### 3. Pipeline experimental de bajo nivel

Si el objetivo es investigar packetization, FEC, jitter-buffer policy, RTP extensions o DSP antes del runtime, vanilla/thin o un transport custom suele ser la ruta más transparente. Pipecat puede seguir siendo útil por encima de esa frontera con processors propios. LiveKit puede seguir resolviendo distribución de media si el experimento no requiere controlar la capa que abstrae.

La decisión depende de dónde necesitas medir y modificar paquetes, no de cuál framework tenga más integraciones.

## Qué no debes usar como criterio de selección

No elijas media/runtime por:

- número de integraciones;
- estrellas de GitHub;
- una demo sin condiciones de red publicadas;
- una cifra de «latencia del framework» con distinto provider, región, codec o audio path;
- marketing de «carrier grade» o «realtime» sin un failure model verificable.

Para comparar overhead de frameworks debes mantener el mismo hardware, red, provider/modelo, ruta de audio, codec, carga y condiciones de loss/jitter, repetir suficientes muestras y reportar distribución. Si no puedes hacerlo, compara **ownership y mecanismos**, no inventes una clasificación numérica.

## Qué medir por turno y por llamada

Una instrumentación mínima útil debería poder unir:

```text
call/session id
turn/speech id
media endpoint + region
selected ICE candidate pair / relay state
transport protocol
codec + negotiated/sample-rate boundary
packet loss and jitter windows
jitter-buffer delay/target
reconnect/path-change events
SIP Call-ID + trunk + negotiated SDP when applicable
carrier stream id when applicable
agent ingest timestamp
first generated audio
first submitted/playout-ack boundary
```

No todos los runtimes expondrán cada campo con el mismo nombre. El contrato importante es conservar la frontera y el owner.

## Checklist de producción

Antes de llamar robusta a una ruta de voz:

1. Dibuja todos los hops de media, no sólo el runtime del agente.
2. Identifica dónde se negocia, decodifica, resamplea y transcodifica el audio.
3. Registra la ruta ICE/TURN o SIP/RTP/carrier-stream realmente usada.
4. Prueba las restricciones de red que sí existen en tus usuarios.
5. Correlaciona jitter/loss con decoder/playout, no sólo con RTT.
6. Separa signaling success de media success.
7. Verifica autenticación de signaling/media y cifrado prometido por cada hop.
8. Mide p50/p95/p99 y distribuciones por ruta, codec, región y tipo de red.
9. Mantén explícita la frontera entre framework, servicio gestionado, carrier y modelo.
10. Sólo después optimiza el tramo que la evidencia muestra como dominante.

El objetivo no es eliminar toda variación de red. Es saber qué parte del camino controlas, detectar cuándo cambia y diseñar el sistema para degradarse de forma comprensible.

## Referencias

[^rfc8445]: IETF, [RFC 8445 — Interactive Connectivity Establishment (ICE)](https://www.rfc-editor.org/rfc/rfc8445.html).
[^rfc7874]: IETF, [RFC 7874 — WebRTC Audio Codec and Processing Requirements](https://www.rfc-editor.org/rfc/rfc7874.html).
[^rfc7587]: IETF, [RFC 7587 — RTP Payload Format for the Opus Speech and Audio Codec](https://www.rfc-editor.org/rfc/rfc7587.html).
[^webrtc-stats]: W3C, [Identifiers for WebRTC's Statistics API](https://www.w3.org/TR/webrtc-stats/).
[^livekit-connect]: LiveKit, [Connecting to LiveKit — Connection reliability](https://docs.livekit.io/intro/basics/connect/).
[^livekit-telephony]: LiveKit, [Telephony introduction](https://docs.livekit.io/telephony/).
[^livekit-sip-codecs]: LiveKit, [Audio codecs negotiation and support](https://docs.livekit.io/reference/telephony/codecs-negotiation/).
[^pipecat-smallwebrtc]: Pipecat, [Small WebRTC Transport](https://docs.pipecat.ai/api-reference/server/services/transport/small-webrtc).
[^pipecat-twilio]: Pipecat, [Twilio Frame Serializer](https://docs.pipecat.ai/api-reference/server/services/serializers/twilio).
[^twilio-streams]: Twilio, [Media Streams Overview](https://www.twilio.com/docs/voice/media-streams).
[^twilio-ws]: Twilio, [Media Streams — WebSocket Messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages).
