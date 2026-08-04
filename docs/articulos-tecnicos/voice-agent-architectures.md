---
title: Tres arquitecturas para agentes de voz
description: "Comparación técnica entre full cascade, half cascade y speech-to-speech: latencia, prosodia, tool calling, interrupciones, control y una arquitectura híbrida para el siguiente salto."
date: 2026-08-04
date_modified: 2026-08-04
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
> **Criterio:** no solo tiempo hasta el primer audio, sino control, prosodia, interrupciones, tools y complejidad operacional.  
> **Hot take:** una superficie S2S rápida debería conversar; un plano cognitivo más pesado debería razonar y ejecutar.

La arquitectura de un agente de voz suele reducirse a una pregunta: ¿usamos STT, un LLM y TTS, o conectamos directamente un modelo speech-to-speech? Esa formulación mezcla decisiones distintas y hace que muchas comparaciones sean poco útiles.

Conviene separar cuatro ejes:

1. **Arquitectura de modalidad:** full cascade, half cascade o speech-to-speech.
2. **Régimen de interacción:** turn-based o full-duplex.
3. **Iniciativa:** reactiva o proactiva.
4. **Orquestación:** monolítica o dividida entre una superficie rápida y un plano de ejecución.

Un sistema S2S puede seguir siendo estrictamente por turnos. Un cascade puede soportar barge-in y cierto solapamiento. Un modelo audio-native puede producir texto y delegar la voz a un TTS. Y un agente full-duplex no tiene por qué ejecutar las tools dentro del mismo modelo que mantiene el ritmo de la conversación.

Este report compara las tres arquitecturas como **contratos entre componentes**, no como una clasificación de proveedores.

{{ include_html("snippets/articulos-tecnicos/voice-architectures-comparison.html") }}

## 1. Full cascade: audio → STT → LLM → TTS → audio

La arquitectura full cascade separa cada responsabilidad:

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

Es el diseño más conocido porque cada pieza puede sustituirse y observarse por separado. Permite elegir el STT que mejor funciona en un idioma, un LLM especializado, un TTS con la voz de marca y una capa de orquestación propia.

### Dónde sigue siendo fuerte

**Modularidad.** Cada proveedor tiene un contrato explícito. Cambiar el TTS no obliga a cambiar el modelo de razonamiento.

**Auditabilidad.** La transcripción, las tool calls y el texto final quedan disponibles como artefactos separados. En dominios regulados, esa separación facilita inspección y políticas.

**Control de voz.** Un TTS dedicado suele ofrecer diccionarios, pronunciaciones, estilos y voces consistentes. La identidad sonora no depende de las voces disponibles en un modelo S2S.

**Portabilidad.** La arquitectura puede ejecutarse sobre telefonía, navegador o aplicaciones nativas con adaptadores relativamente claros.

**Optimización local.** Cada tramo puede cachearse, cuantizarse, desplegarse cerca del usuario o sustituirse por un modelo especializado.

El problema no es que full cascade sea una mala arquitectura. El problema es que, cuando la conversación debe sentirse humana, deja de ser una tubería lineal y se convierte en una máquina de estados distribuida.

### La latencia no se suma una sola vez

Una medida simplificada es:

```text
T_first_audio =
    T_endpointing
  + T_STT_stable
  + T_LLM_first_tokens
  + T_TTS_first_chunk
  + T_transport
  + T_playback_buffer
```

Pero el coste real no se limita a esa suma. En streaming, cada componente toma decisiones con información provisional:

- el VAD decide si el turno terminó;
- el STT emite parciales que puede corregir;
- el LLM puede empezar sobre una hipótesis incompleta;
- el TTS sintetiza texto que todavía puede cambiar;
- el proveedor telefónico acumula audio que aún no se ha reproducido.

Un error temprano obliga a cancelar o rehacer trabajo posterior. El sistema puede tener excelente latencia en cada servicio y, aun así, sonar lento por buffering, políticas conservadoras o reintentos de coordinación.

### La frontera textual pierde señal

La transcripción conserva principalmente contenido léxico. Puede añadir puntuación o etiquetas, pero no representa completamente:

- velocidad y cambios de ritmo;
- energía;
- vacilaciones;
- sarcasmo;
- emoción;
- alargamientos;
- énfasis;
- pronunciación no estándar;
- ruido y distancia del micrófono.

OpenAI describió precisamente esta pérdida al presentar Realtime API: en una cadena ASR → modelo de texto → TTS se pierde información como emoción, énfasis y acentos, además de introducir latencia.[^openai-realtime-intro]

La pérdida afecta a dos partes diferentes:

1. **comprensión:** el LLM recibe menos evidencia sobre intención y estado del usuario;
2. **expresión:** el TTS recibe texto, pero no necesariamente la intención prosódica con la que debería decirlo.

### El estado se distribuye entre demasiados owners

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

Un barge-in puede ocurrir cuando:

- el STT todavía corrige el final del turno anterior;
- el LLM sigue generando;
- una tool está en curso;
- el TTS terminó de sintetizar;
- el audio continúa en el buffer de telefonía.

La implementación madura no cancela “el pipeline” como una sola entidad. Cancela una respuesta concreta, elimina audio pendiente, trunca el historial a lo escuchado y decide por separado qué hacer con las operaciones duraderas.

## 2. Half cascade: audio → modelo audio-native → texto streaming → TTS

Half cascade ocupa un espacio que suele describirse mal. La variante relevante aquí es:

```text
audio del usuario
→ modelo realtime audio-native
→ texto de respuesta en streaming
→ TTS externo
→ audio al usuario
```

No es “STT integrado” sin más. El modelo consume audio directamente para comprender el turno, pero la frontera de salida sigue siendo texto. Esto elimina el STT externo como contrato intermedio y conserva un TTS especializado como capa de voz.

El SDK oficial de OpenAI muestra una sesión Realtime con `output_modalities: ["text"]` y streaming mediante el evento `response.output_text.delta`.[^openai-python-realtime] Ese contrato hace viable una implementación audio-in / text-out sin obligar al modelo a producir audio.

### Qué gana frente a full cascade

**Comprensión audio-native.** El modelo puede usar tono, ritmo, pausas o vacilaciones como evidencia, en lugar de depender solo de una transcripción.

**Menos reconciliación.** Desaparece la frontera externa entre STT parcial, STT final y LLM. Sigue existiendo turn detection, pero la comprensión y la generación pertenecen al mismo contexto multimodal.

**Streaming directo al TTS.** Los deltas de texto pueden alimentar un sintetizador externo sin esperar a la respuesta completa.

**Voz independiente.** El producto mantiene un TTS elegido por calidad, coste, idiomas, clonación autorizada o identidad de marca.

**Tool calling audio-native.** El modelo puede decidir tools a partir del audio sin serializar primero toda la interacción como una transcripción definitiva.

Esta arquitectura puede reducir latencia y complejidad, pero no resuelve automáticamente la prosodia de salida.

### La prosodia entra, pero no atraviesa el texto por arte de magia

El modelo puede comprender que el usuario está frustrado, susurra o duda. Si la salida es solo:

```text
Entiendo. Voy a revisarlo.
```

el TTS no conoce necesariamente la intención acústica. Puede leerlo con un estilo neutro y perder el beneficio expresivo.

La solución es convertir la frontera en un contrato más rico:

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

El `SpeechPlan` no necesita exponerse al usuario ni formar parte del historial visible. Es una representación intermedia para conservar intención expresiva y controlar el TTS.

{{ include_html("snippets/articulos-tecnicos/voice-architectures-prosody.html") }}

Hay tres formas de producirlo:

1. el modelo devuelve texto y metadatos estructurados en paralelo;
2. una capa ligera deriva el plan a partir del estado acústico y la respuesta;
3. el TTS acepta instrucciones de estilo o tokens expresivos embebidos.

La primera ofrece mayor trazabilidad. La segunda permite separar el modelo conversacional del control de voz. La tercera puede reducir latencia, pero acopla el contrato al proveedor de síntesis.

### El reto de streaming

Enviar cada delta de texto al TTS reduce la espera, pero introduce decisiones de chunking. Fragmentos demasiado cortos producen entonación errática. Fragmentos demasiado largos retrasan el primer audio.

Un *semantic chunker* puede cerrar unidades cuando detecta:

- puntuación fuerte;
- una cláusula estable;
- un límite de longitud;
- una pausa explícita del `SpeechPlan`;
- un cambio de intención;
- una tool call que obliga a detener la respuesta.

```python
async for delta in realtime.output_text():
    chunker.push(delta)

    for phrase in chunker.pop_ready_phrases():
        await tts.enqueue(
            text=phrase.text,
            speech_plan=phrase.speech_plan,
        )
```

El chunker debe conservar un pequeño margen de revisión. Una respuesta puede empezar con “Sí” y corregirse a “Sí, pero…”. Sintetizar el primer token demasiado pronto crea una promesa acústica difícil de retirar.

### Qué no elimina half cascade

Half cascade todavía necesita:

- playback y truncado;
- cancelación de TTS;
- coordinación de tools;
- gestión de resultados asíncronos;
- idempotencia;
- una política de entrega proactiva;
- medición desde audio de entrada hasta audio escuchado.

También añade una interfaz propia: el `SpeechPlan`. La arquitectura merece la pena cuando la comprensión acústica y la libertad de elegir TTS compensan ese contrato adicional.

## 3. Speech-to-speech: audio ↔ modelo

En speech-to-speech, el mismo modelo consume audio y produce audio:

```text
audio del usuario
↔ modelo speech-to-speech
↔ audio del agente
```

La simplificación visual es radical, pero no significa que el sistema completo tenga un único componente. Telefonía, tools, estado, políticas, observabilidad y seguridad siguen existiendo.

Los modelos Realtime modernos pueden recibir y emitir audio directamente, además de soportar function calling.[^openai-gpt-realtime] El beneficio principal es que comprensión y expresión comparten una representación acústica interna.

### Lo que S2S hace mejor

**Timing conversacional.** Puede producir backchannels, adaptar el ritmo y reaccionar sin esperar una transcripción textual estable.

**Continuidad prosódica.** La información acústica no tiene que comprimirse a texto entre comprensión y respuesta.

**Barge-in más natural.** El modelo puede operar sobre una sesión continua y responder a eventos de actividad del usuario.

**Menos fronteras externas.** Se reducen contratos, serializaciones y puntos de buffering entre STT, LLM y TTS.

**Full-duplex real.** Algunos modelos pueden escuchar mientras hablan y ajustar la salida durante el solapamiento.

Pero S2S y full-duplex no son sinónimos. Un modelo puede aceptar audio y devolver audio por turnos. Full-duplex exige que la arquitectura procese simultáneamente ambas direcciones y mantenga coherencia durante el solapamiento.

### Lo que S2S complica

**Auditabilidad.** Es necesario derivar transcripciones, tool traces y estado escuchado sin asumir que el audio completo generado llegó al usuario.

**Control determinista.** La voz, la pronunciación y el estilo pueden depender de capacidades del modelo en lugar de un TTS especializado.

**Tool latency.** Una conversación natural no debería congelarse mientras una operación tarda. El modelo necesita delegación o continuidad asíncrona.

**Coste y escalado.** Mantener una sesión audio-native continua puede ser más costoso que activar modelos especializados por etapas.

**Compliance.** Redacción, filtrado, PII y políticas de contenido deben aplicarse sobre audio, texto derivado y acciones.

**Portabilidad.** El contrato de sesión, eventos, voces y function calling suele estar más acoplado al proveedor.

## Latencia y complejidad: medir más que el primer token

Una comparación justa necesita separar:

```text
T_detection       fin de intervención detectado
T_decision        intención y primera decisión útil
T_first_audio     primer audio reproducible
T_interruption    speech_started → silencio real del agente
T_completion      operación aceptada → resultado
T_delivery        resultado listo → cierre escuchado
```

{{ include_html("snippets/articulos-tecnicos/voice-architectures-latency.html") }}

S2S suele tener ventaja en `T_first_audio` y `T_interruption`, pero puede perder si la política de turn detection es conservadora o la red añade jitter. Full cascade puede ser competitivo con STT, LLM y TTS muy rápidos, aunque su coordinación siga siendo más compleja. Half cascade puede ocupar un punto intermedio: comprensión audio-native con una voz externa optimizada y controlable.

La comparación también debe medir calidad:

- precisión de intención bajo ruido y acentos;
- conservación de entidades;
- corrección de tool arguments;
- naturalidad prosódica;
- estabilidad de voz;
- porcentaje de interrupciones falsas;
- número de respuestas duplicadas;
- éxito de tarea;
- trazabilidad del resultado.

## Matriz de decisión

| Dimensión | Full cascade | Half cascade | Speech-to-speech |
|---|---|---|---|
| Comprensión de prosodia | Baja o indirecta | Alta en entrada | Alta en entrada |
| Prosodia de salida | Alta si el TTS es bueno | Alta con `SpeechPlan` + TTS | Nativa, dependiente del modelo |
| Latencia mínima posible | Media | Baja-media | Baja |
| Control de voz | Muy alto | Muy alto | Variable |
| Tool calling observable | Muy alto | Alto | Medio-alto |
| Complejidad de orquestación | Muy alta | Alta | Menor en modalidad, no en negocio |
| Portabilidad entre proveedores | Alta | Media | Baja-media |
| Full-duplex natural | Difícil | Posible | Mejor encaje |
| Compliance textual | Directo | Directo en salida | Requiere derivaciones fiables |
| Personalización acústica | TTS dedicado | TTS dedicado | Dependiente del modelo |
| Debugging por etapas | Excelente | Bueno | Más difícil |

No existe un ganador universal. La elección depende del producto.

### Elegir full cascade cuando

- la trazabilidad textual y el control por etapas son obligatorios;
- se necesita intercambiar proveedores;
- la voz debe pertenecer a un TTS específico;
- el dominio tolera una interacción más turn-based;
- los equipos ya operan bien las máquinas de estado distribuidas.

### Elegir half cascade cuando

- la comprensión del audio aporta valor real;
- se quiere eliminar la reconciliación STT → LLM;
- la voz externa es una ventaja de producto;
- se puede diseñar y evaluar un `SpeechPlan`;
- el sistema necesita text output para compliance o control.

### Elegir S2S cuando

- timing, naturalidad y full-duplex son prioritarios;
- el modelo ofrece una voz y tool calling adecuados;
- el equipo puede instrumentar audio escuchado y acciones;
- la sesión continua compensa el coste y el acoplamiento;
- el producto acepta que parte del comportamiento acústico sea menos modular.

## Hot take: la arquitectura ganadora no será un único modelo gigante

Mi apuesta no es reemplazar toda la plataforma por un S2S monolítico. Es dividir responsabilidades:

```text
S2S Interaction Surface
    ↕ eventos, contexto y entregas
Cognitive Execution Plane
    ↕
tools, RAG, workflows, workers y side effects
```

La **S2S Interaction Surface** debe ser pequeña, rápida y full-duplex. Sus responsabilidades son humanas:

- escuchar;
- detectar cuándo intervenir;
- producir backchannels;
- mantener una voz estable;
- gestionar barge-in;
- responder preguntas ligeras;
- aceptar trabajo;
- volver con resultados cuando exista una ventana segura.

El **Cognitive Execution Plane** puede ser más pesado. Sus responsabilidades son computacionales:

- razonamiento profundo;
- planificación;
- RAG;
- tool calls;
- rutinas paralelas;
- retries;
- idempotencia;
- validaciones;
- compensaciones;
- generación de un resultado estructurado.

La superficie no espera bloqueada. Puede decir:

> “Lo estoy revisando. Cuéntame mientras tanto qué horario prefieres.”

El plano cognitivo continúa y publica un `DeliveryEnvelope` cuando termina. La superficie decide si lo entrega, lo agrega o lo incorpora al siguiente turno.

GPT-Live hace explícita una dirección similar: una superficie full-duplex mantiene la conversación mientras delega búsqueda, razonamiento más profundo y trabajo complejo a un modelo frontier detrás.[^gpt-live] MoshiRAG explora un patrón relacionado desde investigación: una interfaz full-duplex compacta combinada con retrieval asíncrono para mejorar factualidad sin sacrificar interacción.[^moshirag]

{{ include_html("snippets/articulos-tecnicos/voice-architectures-surface-plane.html") }}

### Few-shot prompting acústico: muestras de voz como contexto

El siguiente paso es que la superficie pueda recibir ejemplos de audio autorizados como parte del prompt de voz:

```text
system instructions
+ conversational policy
+ pronunciation lexicon
+ 3–15 s audio references
+ consent and provenance metadata
```

La analogía con few-shot prompting es útil. En texto, los ejemplos enseñan formato, tono o criterio. En voz, las muestras pueden condicionar:

- identidad vocal;
- ritmo;
- timbre;
- pronunciación;
- estilo;
- entorno acústico;
- expresividad.

VALL-E demostró *acoustic prompting* a partir de una grabación de tres segundos y mostró conservación de identidad, emoción y entorno.[^valle] OpenAI Voice Engine mostró generación condicionada por una muestra de 15 segundos, pero mantuvo el sistema en una vista previa limitada por los riesgos de suplantación.[^voice-engine]

Eso valida la dirección técnica, no una disponibilidad universal en los modelos S2S comerciales. Una implementación de producto debe separar tres conceptos:

1. **voz base autorizada**, que define identidad;
2. **estilo del turno**, que define emoción, energía y ritmo;
3. **entorno o calidad**, que no debería copiarse accidentalmente.

También necesita controles duros:

- consentimiento verificable;
- procedencia de la muestra;
- lista de identidades bloqueadas;
- detección y etiquetado de audio sintético;
- revocación;
- trazas de qué muestra condicionó cada sesión;
- límites contra impersonación;
- protección de las muestras en reposo y tránsito.

La capacidad de imitar mejor una voz humana no debe convertirse en una ruta lateral para clonar a cualquiera.

## Harness común para comparar las tres arquitecturas

Las tres variantes deben evaluarse con el mismo corpus y el mismo contrato de tarea.

### Dataset

- idiomas y mercados reales;
- ruido, reverberación y telefonía degradada;
- voces rápidas, lentas y con acentos;
- interrupciones;
- autocorrecciones;
- tool calls cortas y largas;
- resultados que llegan durante otro turno;
- entidades sensibles y pronunciaciones de marca.

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

1. fijar el mismo escenario y resultado esperado;
2. ejecutar varias semillas o sesiones;
3. registrar audio de entrada y audio efectivamente reproducido;
4. comparar tool traces y side effects;
5. realizar evaluación humana ciega de naturalidad;
6. inspeccionar fallos por arquitectura, no solo promedios;
7. repetir bajo congestión y dependencias lentas.

El objetivo no es demostrar que una arquitectura tiene menos milisegundos en laboratorio. Es identificar cuál mantiene la conversación, ejecuta la tarea y conserva control cuando los componentes fallan o se solapan.

## Conclusión

Full cascade seguirá siendo valioso donde modularidad, control y auditabilidad pesen más que la naturalidad máxima. Half cascade es una opción especialmente interesante cuando se quiere comprensión audio-native sin renunciar a un TTS externo y a una salida textual gobernable. Speech-to-speech es el mejor punto de partida para timing, prosodia y full-duplex, pero no elimina el runtime ni las tools.

La dirección más prometedora es híbrida:

> **una superficie S2S rápida para la relación humana, un plano cognitivo más pesado para el trabajo y un contrato durable para unirlos.**

A esa arquitectura se puede añadir un `Voice Prompt Pack` con muestras autorizadas, pronunciaciones y política expresiva. El resultado no es un único modelo que hace todo, sino un sistema en el que cada capa trabaja a la velocidad y con el nivel de control que necesita.

## Fuentes

[^openai-realtime-intro]: OpenAI, [Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/). Comparación con pipelines ASR → LLM → TTS y pérdida de señales acústicas.
[^openai-python-realtime]: OpenAI, [OpenAI Python SDK — Realtime API](https://github.com/openai/openai-python). Ejemplo de `output_modalities: ["text"]` y streaming `response.output_text.delta`.
[^openai-gpt-realtime]: OpenAI, [gpt-realtime model](https://developers.openai.com/api/docs/models/gpt-realtime). Entrada y salida de texto/audio, WebRTC, WebSocket, SIP y function calling.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 8 de julio de 2026. Superficie full-duplex con delegación a un modelo frontier.
[^moshirag]: MoshiRAG, [Full-Duplex Spoken Dialogue with Retrieval-Augmented Generation](https://arxiv.org/abs/2604.12928), 2026.
[^valle]: Microsoft Research, [VALL-E](https://www.microsoft.com/en-us/research/project/vall-e-x/vall-e/). Acoustic prompting con una muestra de tres segundos y consideraciones éticas.
[^voice-engine]: OpenAI, [Navigating the challenges and opportunities of synthetic voices](https://openai.com/index/navigating-the-challenges-and-opportunities-of-synthetic-voices/). Voice Engine condicionado por una muestra de 15 segundos y despliegue limitado por seguridad.
