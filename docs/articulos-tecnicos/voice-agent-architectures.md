---
title: Tres arquitecturas para agentes de voz
description: "Comparación práctica entre full cascade, half cascade y speech-to-speech, con foco en latencia, prosodia, tools, interrupciones y control."
date: 2026-08-04
date_modified: 2026-08-23
keywords: "voice agents, full cascade, half cascade, speech to speech, audio in text out, realtime API, prosodia, streaming TTS, full duplex, arquitectura de voz"
article_state: published
tags:
  - IA
  - Voz
  - Arquitectura
  - Multimodalidad
  - Realtime
  - Tool Calling
---

# Tres arquitecturas para agentes de voz

> **Comparación:** full cascade, half cascade y speech-to-speech.  
> **Criterio:** latencia, prosodia, interrupciones, tools, control y coste de operación.  
> **Hot take:** una superficie S2S rápida debería llevar la conversación. Un modelo más pesado debería encargarse del razonamiento y las acciones.

Cuando se habla de arquitecturas de voz, casi siempre aparece la misma pregunta: ¿montamos STT, LLM y TTS o usamos directamente un modelo speech-to-speech?

La pregunta es útil, pero mezcla varias decisiones. Una arquitectura puede consumir audio y seguir funcionando por turnos. Un full cascade puede tener barge-in y streaming. Un modelo audio-native puede entender la voz y devolver texto para que otro sistema la sintetice.

Para comparar bien las opciones, separo cuatro ejes:

1. **Modalidad:** full cascade, half cascade o speech-to-speech
2. **Interacción:** por turnos o full-duplex
3. **Iniciativa:** reactiva o proactiva
4. **Orquestación:** un único modelo o una superficie rápida conectada a un plano de ejecución

Aquí no comparo proveedores. Comparo los contratos que aparecen entre componentes y los problemas que cada arquitectura deja en manos del runtime.

{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}

## 1. Full cascade: audio → STT → LLM → TTS → audio

Full cascade separa cada responsabilidad:

```text
audio del usuario
→ VAD / endpointing
→ speech-to-text
→ texto parcial y final
→ LLM + tools
→ texto de respuesta
→ text-to-speech
→ buffer de playback
→ audio al usuario
```

Es la arquitectura más conocida porque cada pieza se puede observar, medir y sustituir de forma independiente.

Puedes elegir un STT que funcione bien en un mercado concreto, un LLM especializado, un TTS con la voz de marca y una capa propia para controlar tools, estado e interrupciones.

### Por qué sigue siendo una opción fuerte

**Modularidad.** Cambiar el TTS no obliga a cambiar el modelo que razona.

**Auditabilidad.** La transcripción, las tool calls y el texto final quedan como artefactos separados. Eso simplifica la inspección y muchas políticas de compliance.

**Control de voz.** Un TTS dedicado suele ofrecer diccionarios, pronunciaciones, estilos y voces más estables.

**Portabilidad.** El mismo diseño puede adaptarse a telefonía, navegador y aplicaciones nativas con contratos bastante claros.

**Optimización por tramo.** Cada componente puede desplegarse cerca del usuario, cachearse, cuantizarse o sustituirse por un modelo más pequeño.

Full cascade no es una mala arquitectura. El problema aparece cuando la conversación tiene que sentirse humana. En ese momento deja de ser una tubería lineal y se convierte en una máquina de estados repartida entre varios servicios.

{{ include_html("snippets/articulos-tecnicos/voice-arch-cascade.html") }}

### La latencia no es solo una suma

Una primera aproximación sería:

```text
T_first_audio =
    T_endpointing
  + T_STT_stable
  + T_LLM_first_tokens
  + T_TTS_first_chunk
  + T_transport
  + T_playback_buffer
```

Pero cada componente trabaja con información provisional.

- El VAD decide si el usuario terminó
- El STT emite parciales que todavía pueden cambiar
- El LLM puede empezar con una hipótesis incompleta
- El TTS sintetiza texto que quizá haya que corregir
- El proveedor telefónico guarda audio que aún no se ha reproducido

Un error temprano obliga a cancelar o rehacer trabajo posterior. Puedes tener servicios rápidos y, aun así, una conversación lenta por buffering, políticas conservadoras o mala coordinación.

Para convertir ese presupuesto en una restricción operativa medible, el [explorador de latencia para agentes de voz](/herramientas/latencia-agente-voz/) separa transporte, detección de fin de turno, STT, modelo, TTS, buffering e interrupción y permite ver qué tramo domina la experiencia.

### El texto pierde parte de la señal

La transcripción conserva muy bien el contenido léxico. No conserva por completo:

- Velocidad y cambios de ritmo
- Energía
- Vacilaciones
- Sarcasmo
- Emoción
- Alargamientos
- Énfasis
- Pronunciaciones poco habituales
- Ruido y distancia del micrófono

OpenAI destacó esta pérdida al presentar Realtime API. En una cadena ASR → modelo de texto → TTS desaparecen señales como emoción, énfasis y acentos, y además se añade latencia.[^openai-realtime-intro]

La pérdida ocurre en dos direcciones:

1. **Comprensión.** El LLM recibe menos información sobre la intención y el estado del usuario
2. **Expresión.** El TTS recibe texto, pero no siempre sabe cómo debería decirlo

{{ include_html("snippets/articulos-tecnicos/voice-arch-prosody-loss.html") }}

### Demasiados componentes comparten el estado

En full cascade hay que reconciliar:

```text
vad_state
transcript_revision
llm_response_state
tool_state
tts_state
playback_state
conversation_state
```

Un barge-in puede llegar mientras el STT corrige el turno anterior, el LLM sigue generando, una tool continúa en marcha y el audio ya sintetizado espera en el buffer.

Una implementación madura no cancela “todo el pipeline”. Cancela una respuesta concreta, elimina el audio pendiente, ajusta el historial a lo que se oyó y decide por separado qué hacer con las operaciones que siguen vivas.

## 2. Half cascade: audio → modelo audio-native → texto streaming → TTS

Half cascade suele explicarse de forma ambigua. En este report uso el término para esta arquitectura:

```text
audio del usuario
→ modelo realtime audio-native
→ texto de respuesta en streaming
→ TTS externo
→ audio al usuario
```

El modelo escucha el audio directamente y lo usa para comprender el turno. La salida, en cambio, sigue siendo texto. Ese texto se envía a un TTS externo.

Así desaparece el STT como frontera independiente, pero se mantiene una voz especializada y controlable.

El SDK oficial de OpenAI muestra sesiones Realtime con `output_modalities: ["text"]` y streaming a través de `response.output_text.delta`.[^openai-python-realtime] Ese contrato permite construir audio-in / text-out sin pedir al modelo que genere audio.

{{ include_html("snippets/articulos-tecnicos/voice-arch-half.html") }}

### Qué gana frente a full cascade

**Comprensión audio-native.** El modelo puede usar tono, pausas, ritmo y vacilaciones como parte de la intención.

**Menos reconciliación.** Ya no hay que coordinar un STT parcial, un STT final y un LLM como tres estados distintos.

**Streaming al TTS.** Los deltas de texto pueden empezar a sintetizarse antes de que termine la respuesta completa.

**Voz independiente.** El producto conserva el TTS que mejor encaja por calidad, precio, idiomas o identidad de marca.

**Tool calling desde audio.** El modelo puede decidir una tool sin convertir antes toda la interacción en una transcripción definitiva.

Es una opción muy interesante, aunque tiene un matiz importante: conservar la prosodia en la entrada no significa conservarla en la salida.

### La prosodia entra y puede perderse al salir

El modelo puede detectar que el usuario está frustrado, duda o habla en voz baja.

Si el TTS solo recibe esto:

```text
Entiendo. Voy a revisarlo.
```

puede leerlo con un tono neutro. La comprensión fue audio-native, pero la respuesta volvió a cruzar una frontera de texto plano.

Una forma de evitarlo es añadir un contrato intermedio:

```json
{
  "text": "Entiendo. Voy a revisarlo.",
  "speech_plan": {
    "intent": "reassuring",
    "pace": 0.92,
    "energy": 0.42,
    "pause_before_ms": 180,
    "emphasis": ["entiendo"],
    "pronunciations": {},
    "voice_profile": "support_es_v3"
  }
}
```

El `SpeechPlan` no se enseña al usuario y tampoco tiene por qué entrar en el historial. Su función es transportar la intención expresiva hasta el TTS.

{{ include_html("snippets/articulos-tecnicos/voice-arch-speech-plan.html") }}

Se puede producir de tres formas:

1. El modelo devuelve el texto y los metadatos en paralelo
2. Una capa ligera deriva el plan a partir del audio y de la respuesta
3. El TTS recibe instrucciones de estilo o tokens expresivos

La primera opción facilita la trazabilidad. La segunda separa mejor conversación y control de voz. La tercera reduce contratos, aunque también acopla más el sistema al proveedor de síntesis.

### El streaming necesita un buen chunker

Enviar cada delta al TTS reduce la espera, pero puede romper la entonación. Fragmentos demasiado cortos suenan entrecortados. Fragmentos demasiado largos retrasan el primer audio.

Un *semantic chunker* puede cerrar una unidad cuando encuentra:

- Puntuación fuerte
- Una cláusula estable
- Un límite de longitud
- Una pausa explícita del `SpeechPlan`
- Un cambio de intención
- Una tool call que obliga a detener la respuesta

```python
async for delta in realtime.output_text():
    chunker.push(delta)

    for phrase in chunker.pop_ready_phrases():
        await tts.enqueue(
            text=phrase.text,
            speech_plan=phrase.speech_plan,
        )
```

El chunker necesita un pequeño margen de revisión. Una respuesta puede empezar con “Sí” y continuar con “Sí, pero…”. Sintetizar el primer token demasiado pronto crea una promesa acústica difícil de retirar.

### Qué sigue siendo necesario

Half cascade no elimina:

- El playback y su truncado
- La cancelación del TTS
- La coordinación de tools
- Los resultados asíncronos
- La idempotencia
- La entrega proactiva
- La medición hasta el audio que realmente se escuchó

También introduce el `SpeechPlan`. Tiene sentido cuando la comprensión acústica y la libertad de elegir TTS compensan ese contrato adicional.

## 3. Speech-to-speech: audio ↔ modelo

En speech-to-speech, el mismo modelo consume audio y produce audio:

```text
audio del usuario
↔ modelo speech-to-speech
↔ audio del agente
```

El diagrama es mucho más limpio. El sistema completo sigue necesitando telefonía, tools, estado, políticas, seguridad y observabilidad.

Los modelos Realtime modernos pueden recibir y emitir audio directamente y también soportan function calling.[^openai-gpt-realtime] La ventaja principal es que comprensión y expresión comparten una representación acústica.

{{ include_html("snippets/articulos-tecnicos/voice-arch-duplex.html") }}

### Dónde destaca S2S

**Ritmo conversacional.** Puede generar backchannels, adaptar el tempo y reaccionar sin esperar una transcripción estable.

**Continuidad prosódica.** La señal acústica no tiene que comprimirse a texto entre la entrada y la respuesta.

**Barge-in más natural.** La sesión puede reaccionar a la actividad del usuario y cortar la salida con menos intermediarios.

**Menos fronteras.** Se reducen serializaciones, contratos y buffers entre STT, LLM y TTS.

**Mejor encaje para full-duplex.** Algunos modelos pueden escuchar mientras hablan y ajustar la respuesta durante el solapamiento.

S2S y full-duplex no son lo mismo. Un modelo puede recibir audio y devolver audio de forma estrictamente turn-based. Full-duplex exige procesar las dos direcciones a la vez y mantener coherencia cuando ambos hablan.

### Qué se vuelve más difícil

**Auditabilidad.** Hay que derivar transcripciones, tool traces y estado escuchado sin asumir que todo el audio generado llegó al usuario.

**Control de voz.** La pronunciación, el estilo y la identidad dependen más de las capacidades del modelo.

**Latencia de tools.** La conversación no debería congelarse mientras una operación tarda. Hace falta delegación o continuidad asíncrona.

**Coste.** Mantener una sesión audio-native continua puede ser más caro que activar modelos especializados por etapas. El [planificador de coste y capacidad para agentes de voz](/herramientas/coste-capacidad-agente-voz/) permite traducir llamadas, minutos, tokens y concurrencia a coste mensual, workers y límites de proveedor antes de elegir arquitectura.

**Compliance.** Redacción, filtrado, PII y políticas deben aplicarse al audio, al texto derivado y a las acciones.

**Portabilidad.** El contrato de sesión, las voces y el function calling suelen estar más ligados al proveedor.

## Medir algo más que el primer audio

Una comparación justa necesita separar varios tiempos:

```text
T_detection       fin de intervención detectado
T_decision        intención y primera decisión útil
T_first_audio     primer audio reproducible
T_interruption    speech_started → silencio real del agente
T_completion      operación aceptada → resultado
T_delivery        resultado listo → cierre escuchado
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-latency.html") }}

S2S suele tener ventaja en `T_first_audio` y `T_interruption`. Puede perder parte de esa ventaja con un turn detection conservador o una red inestable.

Full cascade puede ser competitivo si STT, LLM y TTS son rápidos y trabajan en streaming. Su dificultad aparece en la coordinación.

Half cascade ocupa un punto intermedio. Mantiene comprensión audio-native y conserva una voz externa que se puede optimizar y controlar.

La evaluación también necesita métricas de calidad:

- Precisión de intención con ruido y acentos
- Conservación de entidades
- Corrección de los argumentos de tools
- Naturalidad prosódica
- Estabilidad de la voz
- Interrupciones falsas
- Respuestas duplicadas
- Éxito de tarea
- Trazabilidad del resultado

## Matriz de decisión

| Dimensión | Full cascade | Half cascade | Speech-to-speech |
|---|---|---|---|
| Comprensión de prosodia | Baja o indirecta | Alta en entrada | Alta en entrada |
| Prosodia de salida | Alta si el TTS es bueno | Alta con `SpeechPlan` + TTS | Nativa y dependiente del modelo |
| Latencia mínima posible | Media | Baja-media | Baja |
| Control de voz | Muy alto | Muy alto | Variable |
| Tool calling observable | Muy alto | Alto | Medio-alto |
| Complejidad de orquestación | Muy alta | Alta | Menor en modalidad, no en negocio |
| Portabilidad entre proveedores | Alta | Media | Baja-media |
| Full-duplex natural | Difícil | Posible | Mejor encaje |
| Compliance textual | Directo | Directo en salida | Requiere derivaciones fiables |
| Personalización acústica | TTS dedicado | TTS dedicado | Dependiente del modelo |
| Debugging por etapas | Excelente | Bueno | Más difícil |

No hay una arquitectura ganadora para todos los productos.

{{ include_html("snippets/articulos-tecnicos/voice-arch-decision.html") }}

### Elegir full cascade cuando

- La trazabilidad textual y el control por etapas son obligatorios
- Hay que poder cambiar proveedores
- La voz depende de un TTS concreto
- El dominio tolera una conversación más turn-based
- El equipo ya sabe operar una máquina de estados distribuida

### Elegir half cascade cuando

- La señal acústica aporta valor real a la comprensión
- Se quiere eliminar la reconciliación STT → LLM
- La voz externa es una ventaja de producto
- Se puede diseñar y evaluar un `SpeechPlan`
- Hace falta una salida textual gobernable

### Elegir S2S cuando

- El timing, la naturalidad y el full-duplex son prioritarios
- El modelo ofrece una voz y un tool calling adecuados
- El equipo puede instrumentar el audio escuchado y las acciones
- La sesión continua compensa el coste y el acoplamiento
- El producto acepta menos modularidad en el comportamiento acústico

## Hot take: S2S delante, razonamiento pesado detrás

Mi apuesta no es sustituir toda la plataforma por un modelo S2S gigante.

La arquitectura que más sentido me hace separa dos velocidades:

```text
S2S Interaction Surface
    ↕ eventos, contexto y entregas
Cognitive Execution Plane
    ↕
tools, RAG, workflows, workers y side effects
```

La **S2S Interaction Surface** es pequeña, rápida y full-duplex. Se ocupa de la parte humana:

- Escuchar
- Saber cuándo intervenir
- Producir backchannels
- Mantener una voz estable
- Gestionar barge-in
- Resolver preguntas ligeras
- Aceptar trabajo
- Entregar resultados cuando haya un hueco seguro

El **Cognitive Execution Plane** puede ser más pesado. Se ocupa de la parte computacional:

- Razonamiento profundo
- Planificación
- RAG
- Tool calls
- Rutinas paralelas
- Retries
- Idempotencia
- Validaciones
- Compensaciones
- Generación de resultados estructurados

La superficie no espera bloqueada. Puede decir:

> “Lo estoy revisando. Cuéntame mientras tanto qué horario prefieres.”

El plano cognitivo sigue trabajando y publica un `DeliveryEnvelope` cuando termina. La superficie decide si lo entrega, lo agrupa o lo incorpora al siguiente turno.

GPT-Live apunta en una dirección parecida. Una superficie full-duplex mantiene la conversación mientras delega búsqueda, razonamiento más profundo y trabajo complejo a un modelo frontier.[^gpt-live]

MoshiRAG explora una idea relacionada desde investigación. Combina una interfaz full-duplex compacta con retrieval asíncrono para mejorar la factualidad sin romper la interacción.[^moshirag]

{{ include_html("snippets/articulos-tecnicos/voice-arch-surface.html") }}

### Few-shot prompting con muestras de voz

El siguiente paso sería poder pasar ejemplos de audio autorizados a la superficie:

```text
system instructions
+ conversational policy
+ pronunciation lexicon
+ 3–15 s audio references
+ consent and provenance metadata
```

{{ include_html("snippets/articulos-tecnicos/voice-arch-voice-prompt.html") }}

La analogía con el few-shot prompting de texto es directa. Los ejemplos enseñan formato, tono o criterio. En voz, las muestras pueden condicionar:

- Identidad vocal
- Ritmo
- Timbre
- Pronunciación
- Estilo
- Entorno acústico
- Expresividad

VALL-E demostró *acoustic prompting* con una grabación de tres segundos y mostró conservación de identidad, emoción y entorno.[^valle]

OpenAI Voice Engine mostró generación condicionada por una muestra de 15 segundos. El acceso se mantuvo limitado por los riesgos de suplantación.[^voice-engine]

Eso respalda la dirección técnica, pero no significa que todos los modelos S2S comerciales ofrezcan hoy esta capacidad.

En producto conviene separar:

1. **Voz base autorizada**, que define la identidad
2. **Estilo del turno**, que define emoción, energía y ritmo
3. **Entorno o calidad**, que no debería copiarse por accidente

También hacen falta controles claros:

- Consentimiento verificable
- Procedencia de la muestra
- Identidades bloqueadas
- Detección y etiquetado de audio sintético
- Revocación
- Trazas de la muestra usada en cada sesión
- Límites contra la suplantación
- Protección de las muestras en reposo y en tránsito

Mejorar la imitación de una voz humana no puede convertirse en una vía para clonar a cualquiera.

## Un mismo harness para las tres arquitecturas

Las tres variantes deberían evaluarse con el mismo corpus y el mismo contrato de tarea.

### Dataset

- Idiomas y mercados reales
- Ruido, reverberación y telefonía degradada
- Voces rápidas, lentas y con acentos
- Interrupciones
- Autocorrecciones
- Tools rápidas y lentas
- Resultados que llegan durante otro turno
- Entidades sensibles y pronunciaciones de marca

### Métricas

```text
turn_detection_delay_ms
speech_stop_to_first_audio_ms
barge_in_to_silence_ms
semantic_error_rate
entity_preservation_rate
tool_argument_accuracy
task_success_rate
prosody_preference_score
voice_identity_stability
duplicate_delivery_rate
cost_per_successful_minute
```

### Protocolo

1. Fijar el mismo escenario y el mismo resultado esperado
2. Ejecutar varias semillas o sesiones
3. Registrar el audio de entrada y el audio que de verdad se reprodujo
4. Comparar tool traces y side effects
5. Hacer una evaluación humana ciega de naturalidad
6. Analizar los fallos por arquitectura y no solo los promedios
7. Repetir con congestión y dependencias lentas

El objetivo no es demostrar que una opción ahorra unos milisegundos en laboratorio. Es descubrir cuál mantiene la conversación, completa la tarea y conserva el control cuando los componentes fallan o se solapan.

## Conclusión

Full cascade sigue teniendo mucho sentido cuando pesan más la modularidad, el control y la auditabilidad.

Half cascade es especialmente atractiva cuando queremos comprensión audio-native sin renunciar a un TTS externo y a una salida textual gobernable.

Speech-to-speech ofrece el mejor punto de partida para timing, prosodia y full-duplex. Aun así, no elimina el runtime ni las tools.

La dirección que veo más prometedora es híbrida:

> **Una superficie S2S rápida para la conversación, un plano cognitivo más pesado para el trabajo y un contrato persistente que los mantenga sincronizados.**

A esa arquitectura se le puede sumar un `Voice Prompt Pack` con muestras autorizadas, pronunciaciones y política expresiva.

El resultado no es un modelo que intenta hacerlo todo. Es un sistema en el que cada capa trabaja a la velocidad y con el nivel de control que necesita.

## Fuentes

[^openai-realtime-intro]: OpenAI, [Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/). Comparación con pipelines ASR → LLM → TTS y pérdida de señales acústicas.
[^openai-python-realtime]: OpenAI, [OpenAI Python SDK — Realtime API](https://github.com/openai/openai-python). Ejemplo de `output_modalities: ["text"]` y streaming `response.output_text.delta`.
[^openai-gpt-realtime]: OpenAI, [gpt-realtime model](https://developers.openai.com/api/docs/models/gpt-realtime). Entrada y salida de texto y audio, WebRTC, WebSocket, SIP y function calling.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 8 de julio de 2026. Superficie full-duplex con delegación a un modelo frontier.
[^moshirag]: MoshiRAG, [Full-Duplex Spoken Dialogue with Retrieval-Augmented Generation](https://arxiv.org/abs/2604.12928), 2026.
[^valle]: Microsoft Research, [VALL-E](https://www.microsoft.com/en-us/research/project/vall-e-x/vall-e/). Acoustic prompting con una muestra de tres segundos y consideraciones éticas.
[^voice-engine]: OpenAI, [Navigating the challenges and opportunities of synthetic voices](https://openai.com/index/navigating-the-challenges-and-opportunities-of-synthetic-voices/). Voice Engine condicionado por una muestra de 15 segundos y despliegue limitado por seguridad.
