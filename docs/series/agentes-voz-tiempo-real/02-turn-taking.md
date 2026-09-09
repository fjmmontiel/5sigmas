---
title: "Turn-taking: detectar voz no es decidir el turno"
description: "VAD, endpointing, interrupciones y barge-in son decisiones distintas. Este capítulo separa las señales, estados y políticas que hacen que un agente de voz sepa cuándo escuchar, cuándo responder y cuándo callarse."
date: 2026-09-09
date_modified: 2026-09-09
tags:
  - IA
  - Voz
  - Realtime
  - Agentes
  - Producción
---

# Capítulo 2 — Turn-taking: detectar voz no es decidir el turno

Un agente de voz puede tener un VAD excelente y seguir interrumpiendo al usuario. Puede detectar el final del turno con precisión y, aun así, tardar demasiado en responder. Puede reaccionar al primer sonido mientras habla y cortar su propia respuesta cada vez que el usuario dice «ajá».

El problema es que **detectar habla, decidir que un turno terminó y decidir que una superposición debe interrumpir al agente son preguntas distintas**.

En producción conviene separar al menos cuatro señales:

1. **Actividad de voz:** ¿hay habla humana ahora mismo?
2. **Fin de turno:** ¿el usuario terminó la idea y espera respuesta?
3. **Intención de interrupción:** si el usuario habla mientras el agente habla, ¿quiere tomar el turno o sólo está haciendo backchannel?
4. **Estado de reproducción y cancelación:** si el agente debe ceder, ¿qué audio, generación, historial y acciones siguen siendo válidos?

{{ include_html("snippets/articulos-tecnicos/voice-turn-taking-signals.html") }}

La arquitectura del capítulo anterior nos decía dónde vive el texto y quién posee el runtime. Aquí usamos esa base para resolver una pregunta más operativa: **¿qué evidencia permite cambiar de hablante sin cortar pensamientos, crear silencios artificiales ni duplicar efectos?**

## VAD responde «¿hay habla?», no «¿ha terminado la idea?»

Un detector de actividad de voz clasifica regiones de audio como habla o no habla. Silero VAD, por ejemplo, expone timestamps de habla y está diseñado precisamente como detector de actividad de voz.[^silero-vad] Esa señal es muy útil para saber cuándo empieza sonido compatible con voz, alimentar un STT y detectar pausas.

Pero una pausa acústica no implica necesariamente un final conversacional.

Imagina este turno:

```text
Usuario: «Necesito cambiar la dirección…»
                         └── pausa de 350 ms ──┘
Usuario: «…del pedido 4182»
```

Un sistema que convierta directamente `speech → silence` en `turn_end` puede responder después de «dirección» y pisar la segunda mitad de la petición. Hacer el silencio mínimo más largo reduce ese fallo, pero crea otro: después de un «sí» completo el agente espera innecesariamente.

Por eso VAD y *end-of-turn* deben ser señales separadas. Pipecat lo expresa de forma explícita: sus frames VAD de inicio/fin de habla son entradas para las estrategias de turno, no la decisión final de turno.[^pipecat-speech-input] LiveKit hace la misma separación al combinar VAD con un turn detector que usa propiedades semánticas y acústicas para predecir el final del turno.[^livekit-turns]

### Un timeout es una política, no una prueba semántica

La forma más simple de endpointing es esperar una ventana de silencio:

```text
si VAD = silencio durante D:
    commit_turn()
```

`D` no es «la duración correcta de una pausa humana». Es un parámetro de decisión que intercambia dos tipos de error:

- Si `D` es demasiado corto, aumenta el riesgo de **endpoint prematuro**.
- Si `D` es demasiado largo, aumenta el **dead air** antes de responder.

No existe un único valor correcto para todos los idiomas, micrófonos, ritmos de habla y tareas. La política adecuada depende de la distribución real de pausas del producto.

Los runtimes modernos añaden más evidencia. Pipecat usa por defecto un analizador de fin de turno y permite sustituirlo por un timeout de habla; LiveKit ofrece VAD-only, endpointing del STT, un turn detector propio, control manual o la detección del modelo realtime.[^pipecat-turn-strategies][^livekit-turns]

## Endpointing: decidir cuándo comprometer el turno

El *endpoint* es el momento en que el sistema deja de tratar el input como un turno todavía abierto y permite que la respuesta dependa de él.

Podemos pensar la decisión como una competencia entre dos costes:

```text
riesgo_de_cortar = P(el usuario continúa | audio, texto, contexto)
coste_de_esperar = tiempo adicional sin respuesta
```

Esperar más reduce algunos endpoints prematuros, pero empeora la latencia percibida. Un detector semántico intenta usar más información para no comprar precisión únicamente con silencio.

OpenAI Realtime distingue actualmente dos políticas server-side: `server_vad`, basada en actividad y silencio, y `semantic_vad`, que estima semánticamente si el usuario ha terminado y ajusta el timeout en función de esa probabilidad.[^openai-realtime-vad] Eso no convierte `semantic_vad` en una política universalmente mejor: añade otra frontera de modelo y puede aceptar más espera cuando la frase parece incompleta.

LiveKit separa además el detector del **endpointing delay**. Con el turn detector activo, el detector aporta evidencia de fin de turno y la sesión mantiene límites temporales de endpointing; con otros modos, esos límites cumplen funciones distintas.[^livekit-turn-detector][^livekit-turn-tuning]

La implicación importante es ésta: **no optimices endpointing mirando únicamente el tiempo medio hasta responder**. Un agente que responde muy rápido porque corta al usuario no tiene buen turn-taking.

## El inicio de turno y el fin de turno tampoco son simétricos

Para reaccionar a una interrupción necesitamos detectar el comienzo del habla con rapidez. Para cerrar un turno queremos más certeza.

Eso favorece una arquitectura asimétrica:

```text
inicio del usuario
  └─ señal rápida: VAD / audio

fin del usuario
  └─ señal más conservadora: contexto acústico + semántico + timeout de seguridad
```

Pipecat materializa esta separación mediante estrategias distintas de *turn start* y *turn stop*. Puede iniciar un turno con VAD o transcripción y cerrarlo con Smart Turn, un timeout, una señal externa u otra estrategia.[^pipecat-turn-strategies]

Esta asimetría es útil porque los errores cuestan cosas diferentes. Detectar un comienzo tarde hace que el agente hable encima del usuario. Cerrar un final demasiado pronto puede cambiar el significado de la petición completa.

## Barge-in: oír al usuario no basta para saber si debes callarte

Cuando el agente está hablando aparece una pregunta adicional:

```text
usuario_speech_started && agent_speaking
        ↓
¿interrupción real o backchannel?
```

Un *backchannel* es una señal corta como «sí», «ajá» o «vale» que puede indicar atención sin pedir el turno. Si cualquier evento VAD cancela inmediatamente la respuesta, el agente será muy sensible a respiraciones, ruido y acknowledgements.

LiveKit documenta esta separación directamente en su adaptive interruption handling: VAD detecta audio entrante y un modelo posterior intenta distinguir barge-in genuino de backchannel/noise.[^livekit-adaptive-interruptions] Esa capacidad concreta pertenece a LiveKit Cloud bajo las condiciones descritas por sus docs; no debe atribuirse al framework autohospedado como una propiedad universal.

Pipecat expone la decisión de inicio como estrategia. `VADUserTurnStartStrategy` es la opción más reactiva; `MinWordsUserTurnStartStrategy` puede exigir más evidencia cuando el bot está hablando. Además, `KrispVivaIPUserTurnStartStrategy` ejecuta el modelo de predicción de interrupciones Krisp VIVA IP después del VAD y sólo abre el turno si la probabilidad de interrupción supera el umbral configurado. Es una estrategia de Pipecat respaldada por el SDK/modelo de Krisp, no un modelo propio de Pipecat, y puede combinarse con transcripción como fallback.[^pipecat-turn-strategies]

La regla de diseño es más general que cualquiera de los dos frameworks: **speech start es evidencia para considerar una interrupción, no necesariamente la decisión final de ceder el turno**.

## Interrumpir correctamente es una operación de estado

Supongamos que el usuario sí quiere interrumpir. «Parar el TTS» sólo resuelve una parte.

En ese instante pueden existir simultáneamente:

```text
respuesta del modelo todavía generándose
audio TTS ya sintetizado pero no enviado
audio enviado y aún en buffer de reproducción
audio ya reproducido
una tool en ejecución
historial conversacional provisional
```

Una interrupción robusta debe decidir por separado qué cancelar, qué conservar y qué compensar.

Como mínimo:

1. **Detener nuevo output hablado** para no seguir ocupando el canal.
2. **Vaciar o truncar audio pendiente** que todavía no debe reproducirse.
3. **Cancelar la generación** si seguir computando no tiene utilidad.
4. **Conservar sólo el contexto válido** para el siguiente turno.
5. **Tratar tools por semántica**, no por reflejo: una lectura puede cancelarse; una operación con side effects puede necesitar idempotencia, estado durable o una política de no cancelación.

LiveKit, cuando maneja una interrupción, pausa el habla del agente y ajusta el historial conversacional a la parte de la respuesta que considera escuchada antes de la interrupción; también expone `session.interrupt()` para interrupción explícita.[^livekit-turns] Con manejo VAD/no-realtime, LiveKit modela además la **falsa interrupción**: si una interrupción no produce transcripción, la sesión puede clasificarla tras `false_interruption_timeout` y reanudar el habla pausada cuando `resume_false_interruption` está habilitado. Esa recuperación de sesión es distinta del modelo adaptive gestionado.[^livekit-turns] Pipecat usa `InterruptionFrame` para descartar DataFrames y ControlFrames pendientes; los SystemFrames tienen prioridad y no se descartan por esa interrupción.[^pipecat-system-frames]

Esas son **semánticas de runtime**, no una garantía física de qué muestras llegaron al oído de una persona. Si el transporte o carrier mantiene su propio buffer, el producto necesita correlacionar su estado de reproducción con la frontera que realmente puede observar.

## Cinco fallos que conviene medir por separado

«Turn-taking accuracy» como una sola cifra oculta fallos con causas distintas.

| Fallo | Qué ocurre | Señal útil |
|---|---|---|
| Endpoint prematuro | El agente responde durante una pausa interna | turn commit antes de la continuación del usuario |
| Endpoint tardío | El usuario terminó, pero el agente deja silencio | fin real → commit/respuesta |
| Interrupción falsa | Backchannel/ruido detiene al agente | interrupciones sin turno útil posterior |
| Interrupción perdida | El usuario intenta entrar y el agente sigue hablando | speech start → stop efectivo del agente |
| Continuación obsoleta | Output o acción del turno cancelado reaparece | frames/audio/tool results después de cancelación |

No hacen falta objetivos universales inventados. Hace falta instrumentar eventos del mismo turno, etiquetar ejemplos reales y comparar configuraciones sobre el mismo corpus y transporte.

Para cada interacción, una traza mínima útil puede conservar:

```text
user_speech_start
user_speech_stop
turn_end_predicted
turn_committed
agent_generation_start
agent_audio_first_playable
agent_playback_start
interruption_candidate
interruption_accepted
agent_playback_stopped
```

El capítulo de observabilidad profundizará en los eventos y failure taxonomies. Aquí basta con que turn-taking deje una traza que permita distinguir **detección**, **decisión** y **efecto**.

## LiveKit, Pipecat o vanilla: quién posee la decisión

La elección del runtime cambia dónde viven estas políticas. No cambia la física del problema.

| Pregunta de turn-taking | LiveKit Agents | Pipecat | Python vanilla/thin |
|---|---|---|---|
| Inicio de habla | VAD dentro del manejo de turno o señal del realtime model | Estrategias de turn start: VAD, transcripción, min-words, externas | Evento del provider/VAD o detector propio; la app ordena y valida eventos |
| Fin de turno | Turn detector, VAD, STT endpointing, manual o realtime-model detection | Estrategias de turn stop; Smart Turn es el default actual | Server VAD/semantic VAD del provider, detector propio o timeout explícito |
| Barge-in | Interruption handling; adaptive es una superficie gestionada separada cuando aplica | VAD/min-words/Krisp VIVA IP/estrategias externas; emitir una interrupción sigue siendo decisión de la estrategia | La app decide cuándo cancelar generación, audio y estado |
| Playback/history | `AgentSession` integra pausa/interrupción y truncado de contexto | Frames de interrupción y processors controlan qué sigue fluyendo | La app debe modelar buffers, correlación de playback y contexto confirmado |
| Control fino | Alto dentro de las abstracciones de sesión/turn handling | Muy alto mediante estrategias/processors/frames | Máximo, a cambio de poseer ordering, cancellation, retries, tests y observabilidad |

### Elige LiveKit Agents cuando la sesión integrada sea la restricción dominante

Encaja bien si quieres que room/session, VAD, endpointing, interrupciones y lifecycle formen un contrato coherente y prefieres configurar políticas antes que construir el state machine desde primitives. Si usas un realtime model con turn detection server-side, LiveKit documenta una frontera importante: la señal de interrupción la decide el modelo y muchas opciones de `InterruptionOptions` dejan de aplicar; la configuración debe hacerse en el proveedor realtime.[^livekit-turns]

### Elige Pipecat cuando quieras componer explícitamente las estrategias

Pipecat resulta natural cuando necesitas combinar señales distintas para empezar y terminar turnos, insertar processors propios o sustituir la lógica por turno sin abandonar un pipeline estructurado. Sus estrategias de start/stop hacen visible qué trigger inicia el turno y qué detector lo termina.[^pipecat-turn-strategies]

### Elige vanilla/thin cuando la frontera del provider ya es suficiente o necesitas control de protocolo

Una aplicación puede delegar el turn detection a un provider realtime y limitarse a consumir eventos, o puede ejecutar VAD/turn detection propio. En ambos casos debe poseer lo que el framework ya no resuelve: ordering de eventos, deduplicación, cancelación, buffers de reproducción, estado confirmado, tools, retries/reconnect, trazas y tests.

Con OpenAI Realtime, por ejemplo, `server_vad` y `semantic_vad` son capacidades del provider/model service, no de Python. El contrato de turn detection permite configurar creación de respuesta e interrupción de la respuesta activa; si la aplicación construye encima una política de negocio, esa política sigue siendo suya.[^openai-realtime-vad]

### Un híbrido es razonable cuando las fronteras están claras

Puedes usar media/sesión de un framework y delegar el fin de turno a un realtime provider; o usar Pipecat con una estrategia externa que reciba señales de un servicio S2S. Lo importante es que **haya una única autoridad por transición**. Dos componentes intentando comprometer el mismo turno crean races difíciles de reproducir.

No elijas por una demo que «se siente rápida». Un demo puede esconder el idioma, red, acústica, longitud del turno y política de interrupción. Compara configuraciones con el mismo corpus de audio, condiciones de red, transporte y definición de éxito.

## Tres workloads concretos

### Browser assistant

Si el navegador habla directamente con un realtime provider, server-side turn detection reduce plumbing. Aun así, el backend debe saber qué eventos son autoritativos para cancelar tools, actualizar estado y decidir qué respuesta queda en historial. Si necesitas cambiar providers o unificar turn-taking entre web y otros canales, un runtime como LiveKit o Pipecat puede justificar la capa adicional.

### Agente PSTN

Telefonía añade ruido, compresión, eco y buffering del carrier. El VAD puede seguir siendo una señal rápida de speech start, pero conviene evaluar end-of-turn e interrupciones con audio telefónico real. La configuración que funciona con un micrófono de portátil no es evidencia suficiente para otra ruta con codec y buffering distintos. Si el carrier termina SIP y entrega media por WebSocket, el runtime de aplicación sigue necesitando distinguir evento de media, decisión de turno y estado de reproducción.

### Pipeline experimental o low-level

Si estás investigando nuevos detectores de turn end, modelos de overlap o políticas de duplex, vanilla/thin puede ser la opción correcta porque necesitas observar y modificar cada transición. El coste es que el harness de replay, las colas, cancelación, clocks y failure injection también pasan a ser parte del experimento.

## Cómo ajustar sin perseguir una sola métrica

Un proceso reproducible empieza por guardar conversaciones representativas: frases cortas, enumeraciones, dudas, pausas internas, backchannels, correcciones, solapamientos, ruido, distintos idiomas y audio de cada canal real.

Después compara políticas manteniendo constantes el resto de capas:

```text
misma muestra de audio
mismo transporte o replay equivalente
misma política de playback
misma definición de turno correcto
misma instrumentación
```

Mide al menos:

- tasa de endpoints prematuros;
- distribución de latencia desde final humano hasta commit;
- false-interruption rate;
- missed-interruption rate;
- distribución `speech_start → agent_playback_stop` para barge-ins aceptados;
- continuaciones/audio obsoleto después de cancelación;
- éxito de tarea después de interrupciones reales.

No mezcles los resultados de un detector semántico en audio limpio con los de un VAD en PSTN y los presentes como un ranking. Son sistemas y condiciones diferentes.

## Qué debe quedar claro antes de producción

Un diseño de turn-taking está listo para QA cuando puede contestar sin ambigüedad:

- Qué componente detecta speech start.
- Qué componente tiene autoridad para declarar end-of-turn.
- Qué timeout actúa como fallback y cuál es su función.
- Cómo se distingue barge-in de backchannel cuando el agente habla.
- Qué señal detiene realmente el playback.
- Qué ocurre con audio ya bufferizado.
- Qué ocurre con la generación activa.
- Qué ocurre con tools con y sin side effects.
- Qué parte del historial queda confirmada después de una interrupción.
- Qué eventos permiten reconstruir por qué el sistema cambió de turno.

La idea central es sencilla: **turn-taking no es un threshold de silencio. Es un protocolo de transición entre señales acústicas, decisiones de turno y estado de ejecución.** Un VAD puede iniciar ese protocolo. No debe cargar con todas sus decisiones.

## Fuentes primarias

[^silero-vad]: Silero Team. *Silero VAD repository*. https://github.com/snakers4/silero-vad
[^pipecat-speech-input]: Pipecat. *Speech Input & Turn Detection*. https://docs.pipecat.ai/pipecat/learn/speech-input
[^pipecat-turn-strategies]: Pipecat. *User Turn Strategies*. https://docs.pipecat.ai/api-reference/server/utilities/turn-management/user-turn-strategies
[^pipecat-system-frames]: Pipecat. *System Frames*. https://docs.pipecat.ai/api-reference/server/frames/system-frames
[^livekit-turns]: LiveKit. *Turns overview*. https://docs.livekit.io/agents/logic/turns/
[^livekit-turn-detector]: LiveKit. *LiveKit turn detector*. https://docs.livekit.io/agents/logic/turns/turn-detector/
[^livekit-turn-tuning]: LiveKit. *Turn-taking tuning*. https://docs.livekit.io/agents/logic/turns/tuning/
[^livekit-adaptive-interruptions]: LiveKit. *Adaptive interruption handling*. https://docs.livekit.io/agents/logic/turns/adaptive-interruption-handling/
[^openai-realtime-vad]: OpenAI. *Realtime API reference — turn detection*. https://platform.openai.com/docs/api-reference/realtime
