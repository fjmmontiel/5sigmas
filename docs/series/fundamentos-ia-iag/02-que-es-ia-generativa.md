---
title: Qué es IA Generativa
description: "Cómo funciona la IA generativa: del embedding y el Transformer a los modelos fundacionales. Leyes de escala, LLMOps y diferencias entre LLM, RAG y agentes."
date: 2026-03-17
keywords: "ia generativa, qué es ia generativa, transformer, modelos de lenguaje, LLM, embedding, leyes de escala, GPT, modelos fundacionales, RLHF, fine-tuning"
tags:
  - IA
  - GenAI
  - LLMs
---

# Capítulo 2 — Qué es IA Generativa

!!! info "Prerrequisitos"
    Este capítulo asume que conoces el marco general de la IA descrito en el [Capítulo 1 — Qué es IA](./01-que-es-ia.md).

En el [capítulo anterior](./01-que-es-ia.md) vimos las diferentes capas dentro de la IA, y ahora vamos a hacer una profundización sobre un aspecto concreto del DL, la IA generativa.

La IA generativa genera texto, imagen, código, audio y vídeo en lugar de clasificar entradas o discriminar entre diferentes clases.

El mecanismo de fondo es el mismo que en cualquier sistema de ML, con datos que entran, parámetros que se ajustan y error que intentamos que baje en cada fase de entrenamiento.

Lo que cambió es qué se aprende y a qué escala se aplica. Ese cambio descansa en tres piezas que encajan en orden:

- **Embeddings**: cómo el modelo representa el significado como números.
- **Transformer**: la arquitectura que permite procesar contexto largo en paralelo.
- **Leyes de escala**: por qué más datos y parámetros produce capacidades que nadie programó.

---

## 1. Embeddings: Traduciendo el texto a números

Los modelos de ML necesitan números como entrada, y el texto no lo es de forma natural.

La solución pasa por tres pasos en cadena.

Primero, el texto se divide en **tokens**: la unidad mínima que el modelo procesa. Un token puede ser una palabra completa, una sílaba o un signo de puntuación, por ejemplo: «agente» suele tokenizarse como «ag» + «ente», no como una unidad entera. ([OpenAI Tokenizer](https://platform.openai.com/tokenizer))

Cada token se convierte después en un **vector**: una lista de miles de números que representan su posición en un espacio matemático. En este punto los valores son arbitrarios, el formato existe, pero la semántica no.

Lo que añade el entrenamiento es el sentido a esos vectores dentro de la semántica, la geometría. 
Los vectores se ajustan hasta que palabras con contextos similares quedan cercanas entre sí. 

A ese vector ya ajustado se le llama **embedding** ([paper original][r2]).
«Rey» y «Reina» acaban cerca. «Rey» y «Carbón», lejos.

Las operaciones sobre esas posiciones capturan relaciones: `rey − hombre + mujer ≈ reina`.

> El modelo no "entiende" palabras: aprende que ciertos tokens aparecen en contextos similares y les asigna posiciones cercanas en el espacio vectorial. La semántica emerge sola durante el entrenamiento.

Texto, imágenes y audio pasan todos por el mismo proceso de conversión a vector antes de procesarse, lo que permite que una sola arquitectura funcione para modalidades distintas.

{{ include_html("snippets/fundamentos-ia-iag/02-embeddings.html") }}

Con las representaciones resueltas, el siguiente problema es procesarlas sin perder el hilo cuando las secuencias de esos vectores se alargan.

---

## 2. El Transformer: La arquitectura que lo cambia todo

Antes del [Transformer (2017)](https://arxiv.org/abs/1706.03762), los modelos procesaban el texto **en orden**, token a token, con dos consecuencias prácticas:

1. El entrenamiento no se podía paralelizar
2. El contexto del inicio se perdía antes de llegar al final.

El Transformer resuelve ambos con un mecanismo central, **la atención**.

Por cada token que procesa, el modelo calcula cuánta relevancia tiene cada otro token del contexto. En "El banco donde me senté estaba mojado", al procesar "banco" la atención conecta con "senté" y "mojado" y determina que se trata de un mueble y no de una entidad financiera, sin que ninguna regla lo establezca explícitamente.

Internamente funciona con el mismo principio que las redes neuronales, pesos que se ajustan para reducir el error. Lo que cambia es la arquitectura de esas conexiones, porque la atención relaciona todos los tokens del contexto a la vez, en lugar de hacerlo en orden.

Lo que hace al Transformer tan valioso no es solo que resuelva esos dos problemas, sino que la arquitectura es **general**: funciona para texto, imágenes, audio, vídeo y código. El Transformer domina el stack de los modelos de lenguaje (GPT, Claude, Gemini, Llama) y parte importante del stack multimodal moderno, aunque no toda la IA generativa comparte exactamente la misma arquitectura: Stable Diffusion, por ejemplo, es un modelo de difusión latente, no un Transformer puro.

{{ include_html("snippets/fundamentos-ia-iag/02-transformer.html") }}

La arquitectura estaba lista, y el salto a años luz llegó cuando se la aplicó a una escala de datos y cómputo sin precedente.

---

## 3. Leyes de escala: cuando la cantidad se convierte en calidad

El entrenamiento usa **aprendizaje auto-supervisado**: sin etiquetas y con una señal simple (predecir el siguiente token), el modelo aprende del volumen bruto de texto, y ese volumen produce un resultado que sorprendió incluso a quienes lo diseñaron.

En 2020, OpenAI publicó ([Scaling Laws][r3]) que el rendimiento de los modelos sigue una **relación predecible** con tres variables: parámetros, datos de entrenamiento y cómputo.

> **Ley de escala**: Dicta que duplicar la potencia de cálculo con la proporción correcta de datos y parámetros produce una mejora predecible y consistente en el rendimiento. Es decir, a mayor cantidad de datos y cómputo, mejores modelos de IA.

Lo inesperado no fue que los modelos mejoraran, sino que **a cierta escala aparecieran capacidades que nadie había programado**: few-shot learning, aritmética, traducción, síntesis de código, seguimiento de instrucciones complejas.

A estas capacidades se las llama **capacidades emergentes** porque no estaban en el diseño de nadie. La literatura posterior discute cuánto de esa emergencia es un cambio real en el modelo y cuánto es un artefacto de la métrica usada para medirla, pero el salto práctico en utilidad a escala es innegable.

<details markdown="1">
<summary><strong>¿Qué es el few-shot learning?</strong></summary>

El modelo puede aprender a ejecutar una tarea nueva viendo solo dos o tres ejemplos incluidos directamente en el prompt, sin reentrenarse ni ver más datos. Le muestras un par de traducciones al formato que necesitas y ya generaliza al resto. Antes de los modelos de lenguaje a escala, esto requería un conjunto de entrenamiento dedicado; ahora ocurre en el contexto de una sola llamada. Es una capacidad que GPT-3 demostró en 2020 ([paper GPT-3][r4]) y que nadie había anticipado a partir de una señal de entrenamiento tan simple como predecir el siguiente token.

</details>

{{ include_html("snippets/fundamentos-ia-iag/02-escalas-curva.html") }}

La misma curva se hace concreta cuando recorremos la familia GPT modelo a modelo: de 117 millones de parámetros en GPT-1 a 175.000 millones en GPT-3, donde el umbral emergente se cruzó.

{{ include_html("snippets/fundamentos-ia-iag/02-escalas.html") }}

### Modelos fundacionales

El resultado de estas capacidades emergentes son los **modelos fundacionales** ([Foundation Models][r6]), modelos preentrenados sobre grandes volúmenes de texto, adaptables a múltiples tareas sin reentrenarse desde cero.

Un solo modelo puede redactar, resumir, traducir, clasificar, extraer información y generar código. En este punto es donde se hace efectiva la verdadera utilidad de la IA Generativa, ahora tenemos un único modelo que nos sirve para múltiples tareas.

> Un modelo fundacional no es un experto en una tarea concreta, sino una representación comprimida del lenguaje y el conocimiento humano que puede especializarse.

Donde antes entrenabas un modelo por tarea, ahora uno solo sirve para muchas, y la adaptación puede ser tan ligera como cambiar las instrucciones o más profunda mediante aprendizaje por refuerzo con feedback humano (RLHF, [InstructGPT][r7]), que es lo que convierte un modelo que predice texto en uno que sigue instrucciones. 

Lo que cambia en cada caso es qué tipo de sistema construyes encima.

A los modelos fundacionales entrenados principalmente sobre texto se les llama **LLM** (Large Language Models, grandes modelos de lenguaje). GPT, Claude, Gemini o Llama son ejemplos. 

Todos parten de la misma arquitectura de IA base, el Transformer, se preentrenan sobre texto masivo y se adaptan después para seguir instrucciones.

---

## 4. LLM, LLM + RAG, Agente

Más a la derecha no significa mejor, significa más capacidades, más caro de operar y más difícil de controlar cuando algo falla.

### LLM puro

El modelo genera a partir de lo que aprendió durante el preentrenamiento, todo su conocimiento está en los parámetros.

Funciona bien para redacción, resumen, traducción, generación de código, análisis de texto, cualquier tarea donde el conocimiento general es suficiente. 

La limitación es que ese conocimiento es estático y tiene fecha de corte, no sabe lo que pasó después de su entrenamiento y no puede acceder a documentos propios o internos.

### LLM + RAG (Retrieval-Augmented Generation)

El RAG resuelve el problema de conocimiento estático añadiendo un paso de búsqueda antes de generar ([paper RAG][r5]). El mecanismo usa los embeddings del capítulo anterior, los documentos de tu base de conocimiento se convierten en vectores y se almacenan. 

Cuando llega una consulta, también se vectoriza y el sistema encuentra los fragmentos más cercanos en el espacio de embeddings, es decir, los más relevantes por significado. 

Esos fragmentos se incluyen en el contexto del modelo junto con la pregunta, y el modelo los lee y razona con ellos para responder.

El resultado es que el modelo puede responder con precisión sobre cosas que no estaban en su entrenamiento base, (documentación interna, normativas actualizadas, bases de conocimiento propias). 

Pero esto tiene un matiz, el sistema no aprende nada nuevo de forma permanente, solo lee los documentos relevantes en cada consulta, igual que harías tú consultando un expediente antes de responder.

### Agente

El modelo ya no solo responde: puede planificar, usar herramientas y actuar en bucles con acceso a búsqueda web, código ejecutable, bases de datos y APIs, lo que le permite dividir una tarea compleja en pasos, ejecutar cada uno, leer los resultados y ajustar el plan. 

Eso lo hace capaz de cosas que ningún modelo solo podría hacer, pero con un riesgo proporcional: a mayor longitud de la cadena de pasos, más probabilidad de que un fallo se propague al resultado final.

{{ include_html("snippets/fundamentos-ia-iag/02-llm-rag-agente.html") }}

El Agente es donde se cierra la promesa del Software 2.0, ya no solo la lógica se aprende, el sistema también actúa.

Como podemos anticipar, cualquiera de estas configuraciones necesita un ciclo de ingeniería para funcionar en producción.

---

## 5. LLMOps: el ciclo completo para GenAI en producción

LLMOps sigue la misma lógica que el ciclo del capítulo anterior (capturar datos, entrenar, evaluar, desplegar, monitorizar) pero con una diferencia de fondo, para el 99% de las empresas/particulares que aplicamos estas tecnologías:

> **El modelo es un servicio de terceros** OpenAI, Anthropic, Google, Meta... modelos que consumes vía API, no lo entrenas y no tienes acceso a sus pesos.

En MLOps clásico el artefacto central es el modelo, mientras que en LLMOps básico lo son el **prompt** y el **contexto** que pasas en cada llamada, de modo que lo que antes era "reentrenar" aquí es "reescribir las instrucciones" y otorgar el contexto adecuado para cada prompt.

### Lo que gestionas en LLMOps

**Prompts**: el equivalente al código de tu sistema, donde una instrucción mal formulada degrada el rendimiento igual que un bug, y por eso se versionan, se testean y se despliegan como cualquier artefacto de software.

**Contexto**: system prompt, historial de conversación, documentos RAG: todo lo que entra en cada llamada determina la calidad de la respuesta y, al mismo tiempo, el coste, porque pagas por cada token que entra y sale.

**Evaluación**: no puedes reentrenar para corregir un error, así que la única palanca disponible es el prompt y el contexto, y sin evaluación (automática, humana o mediante otro modelo como LLM-as-judge) no puedes iterar con criterio, lo que la convierte en el paso más subestimado y el más crítico de todo el ciclo.

<details markdown="1">
<summary><strong>¿Qué es LLM-as-judge?</strong></summary>

En lugar de que una persona revise cada respuesta, se usa otro modelo de lenguaje como evaluador automático. Le pasas la pregunta, la respuesta generada y unos criterios (¿es correcta?, ¿es concisa?, ¿cita fuentes?), y el modelo devuelve una puntuación o un veredicto. Es mucho más rápido y barato que la revisión humana a escala, aunque tiene el riesgo de heredar los sesgos del modelo evaluador. Lo habitual es combinarlo: LLM-as-judge para el volumen continuo, revisión humana para casos ambiguos y para validar que el propio evaluador funciona bien.

</details>

Latencia, coste por consulta, monitorización de deriva semántica, versionado de prompts: todo existe para que el ciclo de mejora sea trazable en producción.

{{ include_html("snippets/fundamentos-ia-iag/02-llmops.html") }}

> El comportamiento del sistema cambia con las instrucciones, no con el modelo, lo que es una ventaja (iterar es barato) pero también un riesgo, porque un cambio de prompt puede romper el sistema silenciosamente si no hay evaluación automatizada.

### API externa vs modelo open-source propio

El ciclo anterior asume que consumes el modelo vía API, que es el punto de partida de la mayoría. Pero existe una segunda ruta, alojar tú mismo un modelo open-source. 

El flujo de LLMOps cambia en puntos concretos según cuál elijas.

**API externa** (OpenAI, Anthropic, Google, Mistral API…)

No gestionas el modelo, solo gestionas el prompt, el contexto y la evaluación. El coste es por token y la factura crece con el volumen. 
El modelo puede cambiar sin que lo decidas tú, una actualización del proveedor puede ser una mejora general pero una regresión en tu caso de uso. Los datos salen de tu infraestructura en cada llamada, lo que puede ser un problema en entornos regulados.

<details markdown="1">
<summary><strong>¿Cómo se resuelve habitualmente el problema de privacidad con APIs externas?</strong></summary>

Los principales proveedores ofrecen vías para operar en entornos regulados. La más común es la **política de retención cero** (zero data retention): el proveedor se compromete contractualmente a no almacenar ni usar tus datos para entrenar sus modelos. 

OpenAI, Anthropic y Google la ofrecen para clientes enterprise. A esto se añade un **Data Processing Agreement** (DPA) con cumplimiento GDPR para operaciones en Europa, y en sectores como salud, un **Business Associate Agreement** (BAA) para cumplir HIPAA. 

Algunos proveedores disponen además de endpoints con residencia de datos en la UE, de modo que los datos no salen de la región. 
</details>

**Modelo open-source propio** (Deepseek, Mistral, Qwen, Phi…)

El modelo vive en tu infraestructura. El coste por token desaparece pero aparece el coste fijo de las GPUs. Tienes control total sobre la versión del modelo, los datos no salen de tus servidores y puedes hacer ajuste fino sobre tus propios datos si el modelo base no es suficiente.

A cambio, añades una capa de operaciones nueva: gestión del servidor de inferencia, actualizaciones del modelo, escalado bajo carga y monitorización del hardware.

| | API externa | Open-source propio |
|---|---|---|
| Coste | Variable por token | Fijo en hardware |
| Control del modelo | Ninguno | Total |
| Los datos salen | Sí | No |
| Ops adicionales | Mínimas | Servidor de inferencia, GPUs, escalado |
| Ajuste fino | Solo vía fine-tuning del proveedor | Libre sobre tus datos |

La elección no es técnica sino de negocio: velocidad de iteración, volumen de peticiones, requisitos de privacidad y coste a escala. 

Muchos equipos empiezan con API externa y migran partes a open-source cuando el volumen lo justifica o la regulación lo exige.

{{ include_html("snippets/fundamentos-ia-iag/02-llmops-rutas.html") }}

---

!!! tip "Siguiente lectura"
    El capítulo siguiente compara IA clásica e IA generativa en cinco ejes concretos y proporciona una matriz operacional para decidir qué tecnología usar en cada caso: [Capítulo 3 — IA vs IA Generativa →](./03-ia-vs-ia-generativa.md)

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Vaswani et al. (2017)** — *Attention Is All You Need* ([arXiv][r1]) | Paper original del Transformer. |
| R2 | **Mikolov et al. (2013)** — *Efficient Estimation of Word Representations in Vector Space* ([arXiv][r2]) | Funda el concepto moderno de word embeddings (Word2Vec). |
| R3 | **Kaplan et al. (2020)** — *Scaling Laws for Neural Language Models* ([arXiv][r3]) | Establece las leyes de escala para LLMs. |
| R4 | **Brown et al. (2020)** — *Language Models are Few-Shot Learners* (GPT-3) ([arXiv][r4]) | Demuestra capacidades emergentes en modelos fundacionales a escala. |
| R5 | **Lewis et al. (2020)** — *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* ([arXiv][r5]) | Paper fundacional de RAG. |
| R6 | **Bommasani et al. (2021)** — *On the Opportunities and Risks of Foundation Models* ([arXiv][r6]) | Panorama completo de modelos fundacionales: capacidades, riesgos y sociedad. |
| R7 | **Ouyang et al. (2022)** — *Training language models to follow instructions with human feedback* ([arXiv][r7]) | Introduce el ajuste fino con feedback humano como método de alineación de LLMs. |

</details>

[r1]: https://arxiv.org/abs/1706.03762 "Attention Is All You Need"
[r2]: https://arxiv.org/abs/1301.3781 "Efficient Estimation of Word Representations in Vector Space"
[r3]: https://arxiv.org/abs/2001.08361 "Scaling Laws for Neural Language Models"
[r4]: https://arxiv.org/abs/2005.14165 "Language Models are Few-Shot Learners"
[r5]: https://arxiv.org/abs/2005.11401 "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
[r6]: https://arxiv.org/abs/2108.07258 "On the Opportunities and Risks of Foundation Models"
[r7]: https://arxiv.org/abs/2203.02155 "Training language models to follow instructions with human feedback"
