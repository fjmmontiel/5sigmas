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

Una primera aproximación útil es:

```text
T_first_audio ≈
    T_turn_detection
  + T_STT
  + T_model_first_output
  + T_TTS_first_audio
  + T_transport
  + T_playback_buffer
```

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
- Reducir componentes no elimina tools, estado, permisos, trazas ni recuperación.
- La arquitectura correcta depende de qué quieras proteger: modularidad, control de voz, señal acústica, timing, auditabilidad o portabilidad.

La [nota técnica sobre arquitecturas de agentes de voz](/articulos-tecnicos/voice-agent-architectures/) profundiza en contratos de streaming, prosodia y una posible separación entre superficie conversacional y plano de ejecución. Los siguientes capítulos de esta serie se centrarán en turn-taking, latencia, tools, transporte y evaluación por separado.

## Referencias

[^livekit-voice]: LiveKit, [Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/). Documenta como alternativas de primer nivel un pipeline STT–LLM–TTS y un modelo realtime directo.
[^livekit-pipelines]: LiveKit, [Pipeline types](https://docs.livekit.io/agents/models/pipelines/). Define STT–LLM–TTS, realtime y *half-cascade*; esta última usa un modelo realtime para comprensión y un TTS separado para la salida, y requiere que el proveedor soporte una modalidad de respuesta text-only.
[^openai-realtime-model]: OpenAI, [GPT-Realtime model](https://developers.openai.com/api/docs/models/gpt-realtime). Modalidades de texto/audio, transportes Realtime y function calling.
[^openai-realtime-intro]: OpenAI, [Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/). Describe el pipeline ASR → modelo de texto → TTS, la pérdida de señales acústicas y el streaming directo de audio.
[^gemini-live]: Google, [Get started with Gemini Live API](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk). Sesiones persistentes, entrada de audio y salida de audio nativa en tiempo real.
[^gemini-tools]: Google, [Tool use with Live API](https://ai.google.dev/gemini-api/docs/live-api/tools). Contrato de function calling y devolución explícita de resultados a la sesión.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 8 de julio de 2026. Arquitectura full-duplex y separación entre interacción continua y trabajo más profundo.
[^moshi]: Défossez et al. (2024), [Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/abs/2410.00037). Diálogo hablado full-duplex con streams paralelos para usuario y asistente y sin segmentación explícita en turnos.
