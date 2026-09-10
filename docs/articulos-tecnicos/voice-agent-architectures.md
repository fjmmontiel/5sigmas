---
title: "Arquitecturas de agentes de voz: cascade, speech-to-speech y full-duplex"
description: "Cómo funcionan full cascade, half cascade, speech-to-speech y full-duplex. Modelos, papers, latencia, interrupciones, tools y evidencia de GPT-Live."
date: 2026-08-04
date_modified: 2026-09-10
keywords: "voice agents, full cascade, half cascade, speech-to-speech, full duplex, half duplex, Moshi, GPT-Live, audio LLM, latency, tool calling"
article_state: published
tags:
  - IA
  - Voz
  - Arquitectura
  - Multimodalidad
  - Realtime
  - Tool Calling
---

# Arquitecturas de agentes de voz: cascade, speech-to-speech y full-duplex

> **La decisión principal no es cuántos modelos hay. Es dónde se pierde información, quién decide cuándo hablar y quién conserva el estado de las acciones.**
>
> **Corte de evidencia:** 10 de septiembre de 2026. Revisión técnica de fuentes primarias, no benchmark ejecutado por 5sigmas. Las recomendaciones y los contratos de software son propuestas de ingeniería. Las cifras publicadas conservan proveedor, configuración y definición de la métrica.

GPT-Live-1 llega a la API el 10 de septiembre de 2026. Es un punto de partida relevante para revisar la arquitectura de un agente de voz, pero no una razón para declarar obsoleta toda cascada. OpenAI comunica una mejora de **30 puntos porcentuales** frente a GPT-Realtime-2.1 en Full Duplex Bench y un primer puesto en Tau3 **con GPT-6 Astra medium como backend**. Son resultados del proveedor y de una configuración concreta, no una prueba independiente de superioridad universal.[^live-api]

Esta revisión separa representación acústica, interacción y ejecución. El catálogo bibliográfico cubre mecanismos representativos y benchmarks; no pretende enumerar todos los modelos comerciales ni atribuir detalles internos que un proveedor no haya publicado.

## 0. Cuatro decisiones que no deben mezclarse

| Eje | Pregunta | Opciones |
|---|---|---|
| Fronteras de modalidad | ¿Qué cruza cada componente? | Audio → texto → texto → audio; audio → texto → audio; audio → audio |
| Interacción | ¿Cuándo se escucha y se responde? | Turnos estrictos; turnos interrumpibles; interacción continua |
| Orquestación | ¿Quién razona y ejecuta? | Un motor; varios especialistas; superficie de voz y backend asíncrono |
| Iniciativa | ¿Qué activa una intervención? | Petición del usuario; evento externo; resultado pendiente; política proactiva |

**Speech-to-speech y full-duplex no son sinónimos.** El primero describe el camino de las modalidades. El segundo describe la simultaneidad y el comportamiento temporal. OpenAI distingue explícitamente Live, Realtime y pipelines encadenados; Moshi aporta un ejemplo publicado de modelado conversacional continuo.[^voice-guide][^moshi]

También hay tres significados distintos de «duplex»: un transporte bidireccional puede enviar y recibir paquetes; un runtime puede seguir detectando al usuario durante el playback; un modelo puede condicionar su siguiente salida acústica a la entrada que llega mientras habla. Cumplir el primero no demuestra los otros dos.

Aquí **half cascade** significa específicamente **audio-in / text-out + TTS externo**. Es una etiqueta de arquitectura útil, no una nomenclatura científica universal. «Half» no significa half-duplex ni la mitad de la latencia.

{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}

## 1. Full cascade: audio → STT → LLM → TTS → audio

```text
Micrófono / telefonía
    → ASR o STT: audio → hipótesis de texto
    → LLM: texto + contexto + resultados de tools → respuesta
    → TTS: texto + controles de voz → audio
    → cola de reproducción → dispositivo

En paralelo: detección de turnos, cancelación, trazas y estado de acciones.
```

STT y ASR nombran aquí la tarea de reconocimiento del habla; LLM es el modelo de lenguaje y TTS, la síntesis de voz. Cada frontera es un contrato observable y sustituible. Whisper es una referencia de ASR, no una garantía de streaming o endpointing por el mero hecho de integrar sus pesos.[^whisper]

### Qué se está aproximando

Una factorización modular idealizada es:

\[
p(y\mid x,c,s)=\sum_{z,t}p_{\mathrm{ASR}}(z\mid x)\,p_{\mathrm{LM}}(t\mid z,c)\,p_{\mathrm{TTS}}(y\mid t,s).
\]

Aquí \(x\) es audio entrante, \(z\) una transcripción, \(t\) la respuesta textual, \(y\) el audio saliente, \(c\) el contexto y \(s\) el control de voz. Es un **modelo analítico del sistema**, no la ecuación de entrenamiento de un producto. La independencia de cada etapa es una hipótesis explícita.

En producción suele pasarse una única hipótesis \(\hat z\), no toda la distribución sobre transcripciones. «Quince» y «cincuenta» dejan entonces de competir como alternativas: el LLM recibe una decisión ya tomada. Conservar parciales, alternativas, confianza y confirmaciones de entidades es una decisión de producto, no algo que resuelva automáticamente un LLM mayor.

{{ include_html("snippets/articulos-tecnicos/voice-arch-cascade.html") }}

### La frontera de texto y la prosodia

Una transcripción convencional no conserva toda la información sobre pausas, énfasis o ritmo. Pero sería incorrecto afirmar que una cascada no puede usar señales acústicas: puede incorporar marcas temporales, eventos no verbales o un encoder paralelo. SALMONN y Qwen2-Audio muestran distintas formas de incorporar información de audio a un modelo lingüístico.[^salmonn][^qwen2audio]

La intuición se formaliza mediante la desigualdad de procesamiento de datos: bajo la cadena de Markov \(U\to X\to Z\), \(I(U;Z)\leq I(U;X)\). No demuestra que cualquier modelo de audio comprenda mejor la intención; demuestra que un resumen textual no puede crear información ausente. Con canales auxiliares, el objeto relevante pasa a ser \((Z,A)\), no solo \(Z\). Esta es una deducción sobre el diseño del canal.

Una salida TTS puede ser muy expresiva aunque la entrada fuese texto. **Expresividad de salida y conservación de la señal de entrada son propiedades diferentes.** Tampoco debe tratarse una inferencia acústica de emoción como un hecho demostrado sobre la persona.

{{ include_html("snippets/articulos-tecnicos/voice-arch-prosody-loss.html") }}

### Streaming, especulación y control

Una cascada no tiene por qué esperar la transcripción completa, después toda la respuesta y después todo el audio. Puede solapar reconocimiento, generación y síntesis. LiveKit documenta control de turnos e interrupciones en sistemas compuestos; Pipecat organiza procesamiento mediante frames y pipelines.[^livekit][^pipecat]

Ese solapamiento introduce un problema concreto: **qué trabajo es provisional y qué trabajo ya no se puede retirar**. Una revisión del STT puede invalidar la respuesta especulativa; una frase enviada al TTS puede seguir en cola; una frase reproducida ya no puede «desdecirse» mediante una cancelación interna.

La cascada ofrece puntos claros para registrar transcripciones, validar texto antes de sintetizar, elegir una voz y cambiar proveedores. El coste de esa modularidad es coordinar revisiones, backpressure, fallos parciales y cancelación. Los logs textuales facilitan la auditoría, pero no certifican por sí solos que el usuario oyera el texto correcto.

**Encaje recomendado:** dominios donde pesan el control del texto, la portabilidad, los diccionarios de pronunciación y el diagnóstico por etapas. Debe compararse contra alternativas con el mismo runtime, no contra una implementación batch deliberadamente lenta.

## 2. Half cascade: audio → modelo de audio → texto → TTS

```text
Audio → encoder / adaptación de audio → modelo lingüístico
                                      → texto estable + estilo opcional
                                      → TTS externo → playback
Transcripción auxiliar ───────────────────────────────→ observabilidad
```

El modelo recibe una representación del audio sin exigir una transcripción externa como única entrada. Qwen2-Audio es una referencia de audio-in / text-out. Ultravox distingue explícitamente la comprensión directa del audio de una transcripción auxiliar para logs. La API Realtime documenta respuestas con `output_modalities: ["text"]`.[^qwen2audio][^ultravox][^realtime]

**Audio-native no significa ausencia de encoder, de supervisión textual o de componentes preentrenados con ASR.** Describe la interfaz y la representación disponibles para el modelo. Tampoco demuestra que un checkpoint acepte audio indefinido en streaming: eso exige comprobar causalidad, ventanas, estado y la API concreta.

{{ include_html("snippets/articulos-tecnicos/voice-arch-half.html") }}

### Qué cambia y qué no

Se evita la frontera obligatoria ASR externo → LLM, pero no desaparecen los errores de reconocimiento de entidades. El modelo puede explotar pistas acústicas si su entrenamiento y sus evaluaciones lo respaldan. En la salida sigue existiendo una frontera textual: un TTS que recibe únicamente «De acuerdo» no conoce necesariamente cómo debía decirse.

Un contrato intermedio puede transportar instrucciones expresivas. Este **SpeechPlan es una propuesta de aplicación**, no un estándar de OpenAI, Qwen o Ultravox:

```json
{
  "response_id": "r42",
  "segment_id": "r42.3",
  "text": "La entrevista sigue pendiente de confirmación.",
  "delivery": {"style": "neutral", "pace": "measured"},
  "pronunciation_lexicon_version": "es-v3",
  "commit": "stable_text"
}
```

El adaptador debe mapear esos campos a controles realmente soportados por el sintetizador. Un campo `style` ignorado no conserva la prosodia. Ultravox documenta la integración de un TTS externo; eso prueba la viabilidad del contrato, no la equivalencia acústica entre proveedores.[^ultravox-tts]

{{ include_html("snippets/articulos-tecnicos/voice-arch-speech-plan.html") }}

### La unidad de streaming importa

No enviaría cada token aislado al sintetizador. Un chunker puede esperar una cláusula estable, un máximo de espera o una frontera de puntuación. Debe combinar latencia, estabilidad semántica y continuidad prosódica, y distinguir texto provisional de texto comprometido.

Ejemplo: «Sí…» seguido de «…hay disponibilidad, pero no el viernes» no debería convertirse en una confirmación prematura. Proponer una pequeña espera es distinto de inventar un valor universal de milisegundos: el umbral debe ajustarse con las métricas de esa voz y de ese idioma.

**Encaje recomendado:** la información acústica de entrada aporta valor, pero el producto necesita un TTS concreto o aprobación del texto antes de emitirlo. Sigue siendo necesario cancelar síntesis, vaciar buffers, conservar el estado de tools y registrar lo efectivamente reproducido.

## 3. Speech-to-speech: audio → modelo → audio

S2S elimina la necesidad de exponer un intercambio exclusivamente textual entre comprensión y síntesis. **No obliga a tener un solo transformer, ni prohíbe generar texto internamente.** AudioLM estudia representaciones discretas semánticas y acústicas; EnCodec estudia compresión neural; ninguno de esos ingredientes basta por sí solo para producir un agente conversacional.[^audiolm][^encodec]

Dentro de S2S aparecen varias familias:

| Familia | Mecanismo representativo | Distinción importante |
|---|---|---|
| Secuencias de modalidades | SpeechGPT relaciona representaciones discretas de habla y lenguaje mediante adaptación e instrucciones | Integrar voz no elimina necesariamente pasos secuenciales |
| Texto y audio alineados | Moshi genera un flujo textual asociado a su propia habla junto a flujos acústicos | Texto auxiliar no equivale a un STT externo obligatorio |
| Thinker–Talker | Qwen2.5-Omni y Qwen3-Omni separan procesamiento semántico y generación de voz con acoplamiento interno | Dos módulos internos no son automáticamente una cascada de servicios de texto |
| Adaptadores alrededor de un LLM | LLaMA-Omni y Freeze-Omni exploran integración de comprensión y salida hablada con distintos grados de preservación del LLM | Hay que inspeccionar entrenamiento y runtime, no deducir duplex por el nombre |

Estas son familias representativas, no particiones mutuamente excluyentes.[^speechgpt][^moshi][^qwen25][^qwen3][^llamaomni][^freeze]

### Qué significa «nativo» a nivel de tokens

Un codec transforma la onda en representaciones compactas. El modelo predice representaciones; un decoder las convierte en audio. La compresión, la causalidad y la cantidad de contexto futuro condicionan qué tan pronto puede emitirse un fragmento. Un buen modelo semántico con un decoder que exige mucho contexto puede seguir teniendo mala latencia de inicio.[^audiolm][^encodec][^qwen3]

En Moshi, Mimi opera a 12,5 frames por segundo; hay flujos separados de audio del usuario y del agente y un flujo textual auxiliar. Su diseño combina transformers temporal y de profundidad. El paper distingue 160 ms teóricos y aproximadamente 200 ms prácticos: **no son un SLA telefónico de respuesta útil**.[^moshi]

Como modelo analítico simplificado de conversación continua:

\[
q_\theta(a^{\mathrm{out}}_{1:T}\Vert a^{\mathrm{in}}_{1:T},c)
:=\prod_t q_\theta(a^{\mathrm{out}}_t\mid a^{\mathrm{in}}_{\le t},a^{\mathrm{out}}_{<t},c).
\]

El símbolo \(\Vert\) indica condicionamiento causal, no condicionamiento ordinario sobre entradas futuras. Los índices representan frames alineados tras los retardos de implementación. Se omiten codebooks y variables textuales para mostrar el requisito causal: la salida futura puede depender de audio entrante nuevo. La ecuación no afirma una factorización interna concreta para GPT-Live.

## 4. Half-duplex, barge-in y full-duplex

{{ include_html("snippets/articulos-tecnicos/voice-arch-duplex.html") }}

**Turnos estrictos.** El agente espera el cierre del turno, produce una respuesta y no incorpora habla simultánea durante ella. Puede ser una interfaz push-to-talk o una política de aplicación. Un modelo S2S también puede usarse así.

**Turnos interrumpibles.** El runtime continúa observando la entrada y puede parar la respuesta al detectar que el usuario toma la palabra. Eso es *barge-in*. No demuestra que el modelo integre de forma continua lo que oye dentro de su generación acústica. Realtime permite controlar detección de turnos y respuestas automáticas; el endpointing semántico no se reduce a esperar silencio.[^realtime][^vad]

**Interacción full-duplex continua.** El sistema procesa entrada y salida simultáneas y decide si continuar, pausar, responder brevemente o ceder el turno. No significa que deba hablar por encima del usuario. Moshi, PersonaPlex y GPT-Live permiten estudiar esta clase de comportamiento desde diseños distintos.[^moshi][^personaplex][^live-intro]

Una cascada puede ofrecer entrada y salida concurrentes mediante orquestación. Eso permite construir un **sistema** duplex sin convertir cada modelo en un modelo nativamente duplex. La comparación debe declarar la capa a la que se refiere.

### Silencio, interrupción y backchannel no son lo mismo

«Ajá» puede ser una señal para que el agente continúe; «No, espera, cambia la fecha» puede exigir detenerse. Ruido de fondo y una conversación lateral no deberían recibir automáticamente el mismo tratamiento. Las sucesivas versiones de Full-Duplex-Bench incorporan aspectos distintos de pausa, solapamiento y conversación prolongada.[^fdb1][^fdb15][^fdb2]

Un sistema que detiene toda salida ante cualquier sonido puede obtener una buena cifra de tiempo de parada y una experiencia pésima. Por eso hay que medir tanto el tiempo de reacción como la corrección de la decisión de interrumpir.

## 5. Cómo se entrenan estas capacidades

Hay tres problemas de aprendizaje separados: representar el audio, decidir el contenido y producir voz con el timing adecuado. Entrenar uno no resuelve automáticamente los demás.

Los modelos audio-language estudian alineamiento entre encoders y LLM, instrucciones multimodales y conservación de capacidades lingüísticas. Los modelos de generación estudian tokens acústicos, alineamiento con texto y síntesis incremental. Los modelos de interacción necesitan ejemplos donde importe qué ocurre mientras otra persona habla.[^salmonn][^qwen2audio][^speechgpt][^freeze]

PersonaPlex adapta la línea de Moshi para controlar rol y voz mediante prompts textuales y acústicos, combinando datos de interacción real y conversaciones sintéticas.[^personaplex] La consecuencia de ingeniería es importante: un dataset de turnos perfectamente alternados puede enseñar contenido, pero no ofrece por sí solo cobertura de interrupciones, vacilaciones y solapamientos naturales.

Para evaluar una integración nueva separaría las ablaciones: mismo LLM con texto frente a audio; mismo audio-model con varios TTS; mismo modelo con endpointing distinto; mismo frontend con backends de distinta capacidad. Cambiar todas las piezas simultáneamente impide atribuir la mejora a la arquitectura.

## 6. Hot take: S2S delante, razonamiento pesado detrás

```text
            voz / silencios / solapamientos
Usuario ⇄ superficie conversacional rápida
                         ⇅ solicitudes y resultados
                  backend asíncrono
                         ⇅
          retrieval · herramientas · workflows
                         ⇅
               estado de negocio persistente
```

La hipótesis de diseño es separar el ritmo de la conversación del coste de resolver una tarea. GPT-Live documenta esta separación; MoshiRAG estudia recuperación asíncrona de conocimiento para una interfaz full-duplex. Retrieval no es una transacción: la evidencia de MoshiRAG no demuestra seguridad de pagos o reservas.[^live-guide][^moshirag]

{{ include_html("snippets/articulos-tecnicos/voice-arch-surface.html") }}

La superficie puede seguir escuchando durante una búsqueda. No necesita llenar el tiempo con «perfecto», «gracias» o «lo estoy revisando» en cada turno. Un backchannel debe cumplir una función conversacional, no ocultar la latencia real.

### Tres estados que no deben confundirse

1. **Observado:** audio y correcciones que llegaron al sistema.
2. **Reproducido:** parte de la respuesta que alcanzó el punto de playback instrumentado.
3. **Confirmado:** acciones cuyo resultado fue validado por el sistema de negocio.

Estos tres registros no avanzan a la misma velocidad. El historial no debería afirmar «entrevista confirmada» porque el LLM generó esa frase, ni porque existe audio pendiente en una cola.

Un `DeliveryEnvelope` podría incluir `task_id`, versión del contexto relevante, estado de ejecución, resultado estructurado, procedencia y una clave de deduplicación. Es un contrato propuesto aquí, no una API de proveedor. Al recibirlo se revalida su pertinencia: una corrección de fecha puede invalidarlo; una frase no relacionada no tiene por qué hacerlo.

**Interrumpir voz no equivale a cancelar una acción.** La guía de delegación de Live distingue ambos ciclos de vida.[^live-delegation] Para una operación con efectos externos propongo autorización en el ejecutor, idempotencia, consulta de estado tras un timeout y una política de compensación cuando proceda. Ningún prompt sustituye estas garantías.

### El detalle de telefonía que rompe muchas demos

Twilio documenta `clear` para vaciar el buffer y `mark` para seguir la reproducción. Pero también devuelve marcas pendientes después de `clear`: **un `mark` recibido no siempre significa audio reproducido**.[^twilio]

El ledger debe distinguir completado por playback de descartado por limpieza. Incluso una confirmación de playback del proveedor no demuestra que la persona oyera o entendiera el mensaje. La métrica debe nombrar el punto exacto de observación.

## 7. Latencia: cinco relojes, no una cifra de marketing

{{ include_html("snippets/articulos-tecnicos/voice-arch-latency.html") }}

| Métrica propuesta | Inicio → final | Qué revela |
|---|---|---|
| Primer sonido | Fin real de intervención → primer audio reproducido | Sensación inicial, incluidos fillers |
| Primera respuesta útil | Fin real de intervención → primer contenido que responde | Tiempo hasta información relevante |
| Interrupción | Inicio de interrupción válida → silencio real de la salida | Capacidad de ceder el turno |
| Acción | Solicitud aceptada → efecto confirmado | Ejecución, no fluidez verbal |
| Entrega | Resultado disponible → resultado reproducido | Coordinación entre backend y conversación |

Estas definiciones son propuestas para el harness, no equivalencias entre métricas de papers. El fin real de intervención necesita anotación externa o referencia conocida: usar el endpoint que decidió el propio sistema puede ocultar su error.

### Camino crítico, no suma de p95

Para un grafo de dependencias, una aproximación de finalización es:

\[
F_v=d_v+\max_{u\in\operatorname{pred}(v)}F_u.
\]

El tiempo hasta el primer audio depende del camino crítico, de qué prefijos son utilizables y de las colas. Las etapas pueden solaparse. Además, \(p95(A+B)\) no es, en general, \(p95(A)+p95(B)\). Hay que calcular percentiles sobre trazas completas de la misma población.

Qwen3-Omni reporta 234 ms de primer paquete teórico en una configuración de concurrencia 1; la misma tabla reporta 728 ms con concurrencia 4 y 1.172 ms con concurrencia 6. Eso ilustra sensibilidad a carga, no latencia universal de llamada.[^qwen3]

Full-Duplex-Bench-v3 reporta, en su propio protocolo, 6,89 s y pass@1 de 0,60 para GPT-Realtime, frente a 4,25 s y 0,54 para Gemini Live 3.1. Es un ejemplo de trade-off dentro de un estudio, **no una comparación válida con los 160 ms de Moshi**. Tampoco su baseline Whisper–GPT-4o–TTS representa el límite de todas las cascadas.[^fdb3]

No conectaría esos números con una línea de tendencia. Las definiciones, cargas, runtimes, modelos y tareas son diferentes.

## 8. GPT-Live: qué aporta la evidencia y qué no

| Fecha | Hito verificado | Lectura arquitectónica |
|---|---|---|
| 2024 | Moshi | El diálogo continuo con flujos acústicos separados ya tiene una referencia publicada |
| 2025 | Qwen2.5/3-Omni | El acoplamiento semántico y acústico puede tener módulos internos y salida incremental |
| Enero de 2026 | PersonaPlex | El control de rol y voz también puede estudiarse en interacción full-duplex |
| Abril de 2026 | MoshiRAG | Recuperación asíncrona sin convertir cada búsqueda en un turno bloqueante |
| 8 de julio de 2026 | Presentación de GPT-Live | Interacción continua con delegación para trabajo complejo |
| 3 de agosto de 2026 | Publicación de ingeniería | Camino de audio y trabajo asíncrono tratados por separado |
| 10 de septiembre de 2026 | GPT-Live-1 en la API | La separación frontend/backend pasa a ser una opción de integración publicada |

Fuentes: papers y publicaciones oficiales.[^moshi][^qwen25][^qwen3][^personaplex][^moshirag][^live-intro][^live-engineering][^live-api]

La tendencia defendible es **integración acústica para conversar y separación de responsabilidades para trabajar**. Es una síntesis de ingeniería, no una regresión estadística ni una afirmación de que todos los agentes deban adoptar el mismo diseño.

El artículo de ingeniería de GPT-Live describe una ruta de medios de baja latencia separada de llamadas asíncronas al backend y mecanismos de continuidad de sesiones.[^live-engineering] No publica suficiente detalle para reconstruir su tokenizer, número de parámetros, mezcla completa de datos o política interna de entrenamiento. No atribuyo a GPT-Live los detalles de Mimi o de Thinker–Talker.

«SOTA» exige declarar benchmark, versión, fecha, configuración y procedencia de la evaluación. Un primer puesto de un sistema con backend Astra no aísla la capacidad del frontend de voz. Esta revisión no incorpora una reproducción independiente de ese ranking ni un experimento propio con GPT-Live-1.

## 9. Matriz de decisión sin un ganador ficticio

{{ include_html("snippets/articulos-tecnicos/voice-arch-decision.html") }}

| Necesidad dominante | Punto de partida razonable | Condición que puede cambiar la decisión |
|---|---|---|
| Validar cada frase antes de pronunciarla | Full cascade o audio-in/text-out | El control añadido retrasa el audio; medir su coste real |
| Conservar una voz/TTS de producto | Full o half cascade | Una solución S2S concreta también puede ofrecer control de voz |
| Interpretar pistas acústicas | Half cascade o S2S | Demostrar mejora en datos del dominio, no asumirla |
| Manejar solapamiento y turnos naturales | Modelo/runtime con full-duplex probado | Evaluar falsas interrupciones y entidades corregidas |
| Razonar o ejecutar tareas largas | Frontend y backend desacoplados | Consistencia y entrega de resultados pasan a ser centrales |
| Operar o cambiar componentes por separado | Cascade modular | Más contratos, observabilidad y coordinación |

Los gráficos de selección son guías cualitativas; no contienen mediciones comparativas de proveedores.

### Variantes que los tres nombres simplifican

Puede haber ASR externo seguido de un modelo que genere texto y audio; un canal textual acompañado de un encoder prosódico; enrutamiento entre S2S y cascada según el riesgo; o respuestas precomputadas junto a generación libre. Son composiciones de los mismos ejes, no excepciones que obliguen a inventar una escala lineal de «mejor arquitectura».

LiveKit y Pipecat son opciones de runtime, no una cuarta modalidad de modelo. Una implementación Python propia ofrece control sobre el estado, pero obliga al equipo a asumir transporte, concurrencia, cancelación y pruebas. Mi recomendación es comparar primero el contrato de interrupción, playback y tools; después decidir framework. Usar un framework no concede automáticamente corrección distribuida.[^livekit][^pipecat]

### Coste y capacidad

Compararía **coste por tarea completada**, no solo precio por minuto o token:

\[
C_{\mathrm{éxito}}=\frac{C_{\mathrm{voz}}+C_{\mathrm{backend}}+C_{\mathrm{telefonía}}+C_{\mathrm{infra}}+C_{\mathrm{reintentos}}}{N_{\mathrm{tareas\ correctas}}}.
\]

Hay que fijar duración facturable, silencios, caché, concurrencia, colas, cancelaciones y trabajo desperdiciado. Un modelo local puede tener coste marginal de API nulo y coste de capacidad considerable. Una sesión continua puede consumir recursos durante el silencio; eso no demuestra que toda implementación S2S sea más cara.

Los exploradores de [latencia](/herramientas/latencia-agente-voz/) y [coste y capacidad](/herramientas/coste-capacidad-agente-voz/) sirven para explicitar hipótesis. Sus escenarios no sustituyen medidas del despliegue.

## 10. Voz personalizada y seguridad

VALL-E estudia condicionamiento acústico con una muestra de tres segundos. PersonaPlex combina control de rol y voz en conversación full-duplex. Son evidencias de capacidades concretas, no de que todo proveedor permita clonar cualquier voz.[^valle][^personaplex]

{{ include_html("snippets/articulos-tecnicos/voice-arch-voice-prompt.html") }}

Separaría identidad autorizada, pronunciación y estilo por turno. Las muestras deben tener procedencia y permiso; las credenciales y autorizaciones de tools permanecen fuera del modelo. El audio de una persona no debe convertirse en una fuente privilegiada de instrucciones para el backend. Aplicaría minimización de datos, trazabilidad de la voz elegida y controles contra suplantación.

Estas son recomendaciones de diseño, no una certificación legal. Del mismo modo, retener una transcripción no vuelve automáticamente conforme a un sistema, y no retener audio no garantiza privacidad si las trazas contienen datos personales.

## 11. Un mismo harness para las tres arquitecturas

**Corpus.** Construiría escenarios con ruido, telefonía, idiomas y acentos del producto; nombres y números difíciles; autocorrecciones; pausas largas; interrupciones reales; backchannels; tools lentas; resultados que llegan durante otro turno y cortes de conexión. Una evaluación de contenido como VoiceBench y una evaluación temporal como Full-Duplex-Bench responden preguntas diferentes.[^voicebench][^fdb1][^fdb15][^fdb2][^fdb3]

**Control experimental.** Mismo objetivo, instrucciones, herramientas y referencias. Fijar snapshot del modelo, configuración de voz, transporte, región, endpointing y carga. Comparar el producto completo y, por separado, ablaciones que cambien una sola pieza. Publicar qué fallos son del agente y qué ejecuciones quedaron invalidadas por el harness.

**Medición.** Registrar audio de entrada y salida en el punto instrumentado, hipótesis de texto, respuestas, llamadas a tools, efectos confirmados y buffers descartados. Medir exactitud de entidades, argumentos, éxito de tarea, interrupciones correctas e incorrectas, duplicación de acciones, primera respuesta útil y coste por éxito.

**Estadística.** Repetir escenarios, presentar tamaño de muestra y distribuciones. Usar comparaciones emparejadas y, cuando corresponda, bootstrap agrupado por interlocutor o sesión. No tratar como observaciones independientes cien turnos de una única llamada. Evaluar naturalidad con jueces humanos ciegos y no convertir un MOS de otro protocolo en una escala común.

### Casos de aceptación que bloquearían una release

| Caso | Invariante que exigiría |
|---|---|
| «El viernes… perdón, el lunes» | Ninguna acción confirmada usa la fecha descartada |
| «Ajá» durante una explicación | La política distingue escucha de una petición real de parada |
| Interrupción con audio ya en cola | No se reproduce una respuesta invalidada después del vaciado |
| Timeout de una reserva | Se consulta el estado antes de repetir una operación no idempotente |
| Resultado antiguo tras una corrección | El resultado se revalida antes de anunciarlo |
| Fin de llamada con despedida pendiente | El cierre no depende solo de que el modelo terminara de generar |

Los umbrales numéricos se fijan según riesgo y experiencia del producto. No propongo aprobar todos los dominios con un único p95 ni doy por superados estos casos sin ejecutar la prueba.

## Conclusión

Full cascade ofrece contratos explícitos. Half cascade elimina la transcripción externa como frontera obligatoria y conserva un sintetizador independiente. S2S integra el camino acústico, pero sus mecanismos internos y su interacción pueden ser muy distintos.

Full-duplex es otra decisión: escuchar durante la salida, interpretar el solapamiento y decidir cuándo ceder la palabra. Y ninguna de estas opciones elimina la responsabilidad de mantener coherentes lo observado, lo reproducido y lo confirmado.

**Mi punto de partida para agentes con interacción rica y tareas largas sería una superficie de voz rápida, un backend asíncrono y un estado de negocio persistente. Para un flujo donde manda la validación textual o una voz específica, empezaría por una cascada. La elección final se gana en el mismo harness, no contando cajas en un diagrama.**

## Fuentes primarias

[^voice-guide]: OpenAI, [Voice agents](https://developers.openai.com/api/docs/guides/voice-agents), 2026-09-10.
[^whisper]: Radford et al., [Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356), 2022.
[^salmonn]: Tang et al., [SALMONN: Towards Generic Hearing Abilities for Large Language Models](https://arxiv.org/abs/2310.13289), 2023.
[^qwen2audio]: Qwen team, [Qwen2-Audio Technical Report](https://arxiv.org/html/2407.10759v1), 2024.
[^ultravox]: Ultravox, [Frequently asked questions](https://docs.ultravox.ai/gettingstarted/faq), 2026-09-10.
[^realtime]: OpenAI, [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations), 2026-09-10.
[^audiolm]: Borsos et al., [AudioLM: a Language Modeling Approach to Audio Generation](https://arxiv.org/abs/2209.03143), 2022.
[^encodec]: Défossez et al., [High Fidelity Neural Audio Compression](https://arxiv.org/abs/2210.13438), 2022.
[^speechgpt]: Zhang et al., [SpeechGPT: Empowering Large Language Models with Intrinsic Cross-Modal Conversational Abilities](https://arxiv.org/abs/2305.11000), 2023.
[^moshi]: Défossez et al., [Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/html/2410.00037v2), 2024.
[^qwen25]: Qwen team, [Qwen2.5-Omni Technical Report](https://arxiv.org/html/2503.20215v1), 2025.
[^qwen3]: Qwen team, [Qwen3-Omni Technical Report](https://arxiv.org/html/2509.17765v1), 2025.
[^llamaomni]: Fang et al., [LLaMA-Omni: Seamless Speech Interaction with Large Language Models](https://arxiv.org/abs/2409.06666), 2024.
[^freeze]: Wang et al., [Freeze-Omni: A Smart and Low Latency Speech-to-speech Dialogue Model with Frozen LLM](https://arxiv.org/abs/2411.00774), 2024.
[^personaplex]: Roy et al. / NVIDIA, [PersonaPlex: Voice and Role Control for Full Duplex Conversational Speech Models](https://research.nvidia.com/labs/adlr/personaplex/), 2026-01-15.
[^fdb1]: Lin et al., [Full-Duplex-Bench: A Benchmark to Evaluate Full-Duplex Spoken Dialogue Models on Turn-Taking Capabilities](https://arxiv.org/abs/2503.04721), 2025.
[^fdb15]: Full-Duplex-Bench authors, [Full-Duplex-Bench v1.5](https://arxiv.org/abs/2507.23159), 2025.
[^fdb2]: Full-Duplex-Bench authors, [Full-Duplex-Bench v2](https://arxiv.org/abs/2510.07838), 2025.
[^fdb3]: Full-Duplex-Bench authors, [Full-Duplex-Bench-v3: Benchmarking Tool Use for Full-Duplex Voice Agents Under Real-World Disfluency](https://arxiv.org/html/2604.04847v1), 2026-04-06.
[^voicebench]: Chen et al., [VoiceBench: Benchmarking LLM-Based Voice Assistants](https://arxiv.org/abs/2410.17196), 2024.
[^live-intro]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), 2026-07-08.
[^live-engineering]: OpenAI, [Continuous voice interaction with GPT-Live](https://openai.com/index/continuous-voice-interaction-with-gpt-live/), 2026-08-03.
[^live-api]: OpenAI, [Build more natural voice experiences with GPT-Live-1 in the API](https://openai.com/index/introducing-gpt-live-1-in-the-api/), 2026-09-10.
[^live-guide]: OpenAI, [Live API guide](https://developers.openai.com/api/docs/guides/live), 2026-09-10.
[^live-delegation]: OpenAI, [Live delegation](https://developers.openai.com/api/docs/guides/live-delegation), 2026-09-10.
[^moshirag]: Chien et al., [MoshiRAG: Asynchronous Knowledge Retrieval for Full-Duplex Speech Language Models](https://arxiv.org/abs/2604.12928), 2026-04-14.
[^twilio]: Twilio, [Media Streams: WebSocket messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages), 2026-09-10.
[^livekit]: LiveKit, [Turns overview](https://docs.livekit.io/agents/logic/turns/), 2026-09-10.
[^pipecat]: Pipecat, [Pipeline](https://docs.pipecat.ai/pipecat/learn/pipeline), 2026-09-10.
[^vad]: OpenAI, [Voice activity detection](https://developers.openai.com/api/docs/guides/realtime-vad), 2026-09-10.
[^valle]: Wang et al., [Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers](https://arxiv.org/abs/2301.02111), 2023.
[^ultravox-tts]: Ultravox, [Bring your own TTS](https://docs.ultravox.ai/voices/bring-your-own), 2026-09-10.
