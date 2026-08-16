---
title: "Evaluación de modelos de IA"
seo_title: "Cómo evaluar modelos de IA: benchmarks, calidad y producción"
description: "Cómo evaluar un modelo y un sistema de IA con benchmarks, conjuntos propios, jueces, pruebas humanas y métricas de producto sin confundir una puntuación con valor real."
keywords: "evaluación modelos IA, benchmark LLM, evals, evaluación humana, LLM as a judge, contaminación benchmarks, calidad IA"
date: 2026-04-07
date_modified: 2026-08-16
---

# Evaluación de modelos de IA

Evaluar IA significa medir si un **modelo, sistema o producto** cumple un objetivo bajo condiciones concretas. Un benchmark público responde una pregunta limitada. No demuestra por sí solo que la aplicación sea fiable, rápida, segura o útil para sus usuarios.

La primera decisión de una evaluación no es qué métrica usar. Es **qué objeto se está evaluando**.

{{ include_html("snippets/temas/evaluation-object.html") }}

Cada nivel introduce fallos y criterios distintos.

## La respuesta en 60 segundos

{{ include_html("snippets/temas/evaluation-stack.html") }}

Ninguna capa sustituye a las demás. La clave es conectar cada métrica con una decisión de producto.

## 1. Define la tarea y el coste del error

“Calidad” es demasiado amplio. Una evaluación necesita un contrato observable.

Para un extractor de datos:

- campos obligatorios
- formatos válidos
- precisión y cobertura
- tratamiento de ausencias
- coste de un falso positivo

Para un agente con tools:

- selección de la acción
- argumentos correctos
- orden de operaciones
- idempotencia
- estado final
- mensaje que recibe el usuario

Para un asistente de voz:

- comprensión de intención
- entidades
- tiempo hasta primer audio
- interrupciones
- éxito de tarea
- cierre duplicado

La métrica debe reflejar el fallo que importa. Optimizar similitud textual cuando el problema real es ejecutar dos veces una transferencia sería medir la superficie equivocada.

## 2. Construye una taxonomía de casos

Un promedio oculta dónde falla el sistema. El conjunto debe etiquetar dimensiones relevantes:

- intención o tipo de tarea
- dificultad
- idioma y mercado
- longitud y ruido
- presencia de ambigüedad
- necesidad de conocimiento externo
- uso de tools
- impacto del error
- población o segmento afectado

Después se calcula rendimiento por segmento, no solo una cifra global.

Una taxonomía permite responder preguntas accionables: “¿el nuevo modelo mejora consultas largas, pero empeora nombres propios en español?” Eso ayuda a decidir. “Subió dos puntos” no.

## 3. Usa un conjunto de datos de referencia propio

El **conjunto de datos de referencia** (*golden set*) contiene ejemplos reales o diseñados para representar el dominio. Cada caso necesita:

- entrada
- contexto relevante
- resultado esperado o rúbrica
- etiquetas de segmento
- severidad del fallo
- procedencia y fecha

{{ include_html("snippets/temas/evaluation-reference-set.html") }}

Debe versionarse como código. Cuando aparece un incidente, se añade un caso de regresión. Cuando cambia el producto, se actualiza la distribución y se conserva un subconjunto estable para comparar versiones.

Un conjunto de referencia no tiene que ser enorme. Un centenar de casos bien elegidos puede detectar más problemas de producto que miles de preguntas genéricas.

## 4. Entiende qué mide un benchmark

Un benchmark ofrece estandarización y comparación. MMLU, por ejemplo, mide respuestas de elección múltiple en numerosos dominios académicos.[^mmlu] HELM propuso una evaluación más amplia y transparente mediante escenarios, métricas y documentación de limitaciones.[^helm]

Antes de usar una puntuación, pregunta:

- ¿la tarea se parece a la aplicación?
- ¿el formato favorece una capacidad concreta?
- ¿las respuestas son inequívocas?
- ¿el modelo pudo ver los datos durante el entrenamiento?
- ¿la métrica captura severidad o solo acierto medio?
- ¿hay intervalos de confianza y tamaño suficiente?

Un benchmark puede medir conocimiento académico y no decir casi nada sobre tool calling, conversación, latencia o fiabilidad operacional.

## Contaminación y saturación

Los benchmarks públicos pueden aparecer en corpus de entrenamiento o inspirar datos muy parecidos. Cuando los laboratorios optimizan repetidamente contra una prueba estática, la puntuación deja de ser una estimación limpia de generalización.

La contaminación puede ser exacta o semántica. Detectarla es difícil si los datos de entrenamiento no son públicos.

Las defensas incluyen:

- conjuntos privados
- preguntas creadas después del entrenamiento
- rotación frecuente
- evaluación dinámica
- deduplicación
- análisis de memorización
- tareas con ejecución verificable

LiveCodeBench diseñó una evaluación de código que se actualiza con problemas recientes y usa ejecución para comprobar las soluciones.[^livecodebench] El principio es más general: cuando sea posible, una prueba viva y verificable resiste mejor la optimización superficial.

## 5. Métricas deterministas cuando existen

No todo necesita un juez generativo.

Usa reglas o ejecución para:

- validar JSON y esquemas
- comparar valores numéricos
- ejecutar tests
- comprobar citas y URLs
- verificar argumentos de una API
- inspeccionar el estado final
- medir latencia y coste

Una métrica determinista suele ser más barata, reproducible y auditable. La evaluación generativa debería reservarse para dimensiones que realmente requieren juicio.

## 6. Evaluación humana

Los humanos pueden valorar corrección, utilidad, tono, claridad o preferencia. Para que la señal sea fiable hacen falta:

- una rúbrica concreta
- ejemplos positivos y negativos
- entrenamiento de evaluadores
- doble anotación en una muestra
- resolución de desacuerdos
- orden aleatorio y cegado del modelo
- medición de acuerdo

La preferencia relativa suele ser más fácil que asignar una nota absoluta. Chatbot Arena popularizó comparaciones pareadas y un ranking agregado a partir de votos.[^arena]

La preferencia tampoco equivale a verdad. Un texto más fluido puede ganar frente a otro más correcto. La rúbrica debe separar dimensiones.

## 7. LLM como juez

Un modelo juez puede escalar evaluaciones abiertas. Recibe la entrada, las respuestas y una rúbrica, y produce una puntuación o comparación.

Es útil para:

- filtrar regresiones
- comparar muchas variantes
- evaluar formato y cobertura
- priorizar muestras para revisión humana

Sus riesgos incluyen:

- sesgo por posición
- preferencia por respuestas largas
- afinidad con su propia familia
- sensibilidad al prompt
- errores compartidos con el modelo evaluado

Un juez necesita calibración. Se compara con un conjunto anotado por humanos, se mide acuerdo por segmento y se revisan los desacuerdos importantes. Para decisiones de alto impacto, no debería operar como autoridad única.

## 8. Evalúa el sistema, no solo la respuesta

Un sistema con recuperación o tools puede fallar antes de generar texto.

{{ include_html("snippets/temas/evaluation-system-trace.html") }}

### RAG

Una respuesta incorrecta puede venir de un documento no recuperado, un ranking malo, evidencia insuficiente, una inferencia errónea o una cita que no respalda la afirmación. Sin esa descomposición, la solución propuesta será una conjetura.

### Agentes y tools

Evalúa éxito de tarea, pasos innecesarios, acciones prohibidas, reintentos, duplicados, estado final y recuperación ante errores. La trayectoria explica si el fallo está en la decisión, la ejecución o el mensaje final.

### Voz y tiempo real

Añade medidas temporales y acústicas. Una respuesta correcta que llega después de una pausa incómoda puede fracasar como producto.

## 9. Del offline al online

Las evals offline permiten reproducibilidad y comparación rápida. Las métricas online muestran qué ocurre con usuarios reales.

Conecta ambos niveles:

| Offline | Online |
|---|---|
| exactitud por intención | éxito de tarea |
| puntuación de calidad | reformulaciones y abandono |
| latencia medida | tiempo percibido |
| uso correcto de tools | incidentes y reversión |
| coste por caso | coste por tarea completada |

Un experimento online necesita guardrails. No se debería exponer una variante a producción solo porque mejoró un juez automático.

## 10. Incertidumbre estadística

Una diferencia pequeña puede ser ruido muestral. Reporta:

- número de casos
- distribución por segmento
- intervalo de confianza
- variabilidad entre ejecuciones
- prueba pareada cuando se evalúan los mismos ejemplos

Para salidas estocásticas, ejecuta varias semillas o temperaturas cuando esa variabilidad forme parte del producto.

La significación estadística tampoco garantiza relevancia práctica. Una mejora minúscula puede ser real y no justificar el coste adicional.

## Un ciclo de evaluación operativo

{{ include_html("snippets/temas/evaluation-cycle.html") }}

La evaluación no es una fase al final. Es el bucle que permite cambiar el sistema sin perder conocimiento sobre sus fallos.[^openai-evals]

## Dónde profundizar en 5sigmas

- [Evaluación multimodal](/series/multimodalidad-iag/04-evaluacion/) para benchmarks con texto, imagen y grounding
- [Fallos de los modelos razonadores](/series/modelos-razonadores/02-fallos/) para atajos, sycophancy y propagación de errores
- [Test-time compute](/series/modelos-razonadores/03-test-time-compute/) para comparar calidad, latencia y presupuesto de inferencia
- [Tres arquitecturas para agentes de voz](/articulos-tecnicos/voice-agent-architectures/) para una matriz operacional de evaluación en tiempo real

## Preguntas frecuentes

### ¿Cuál es el mejor benchmark para elegir un LLM?

No existe uno universal. Usa benchmarks para capacidades generales y un conjunto propio para la tarea, idioma, datos, latencia y riesgo del producto.

### ¿Cuántos ejemplos necesita un conjunto de datos de referencia?

Depende de la diversidad y del tamaño de la mejora que se quiere detectar. Empieza con casos representativos y fallos críticos, mide cobertura por segmento y amplía donde la incertidumbre sea alta.

### ¿Se puede evaluar una respuesta abierta automáticamente?

Sí, mediante reglas parciales, referencias, ejecución o un juez. La automatización debe calibrarse y combinarse con revisión humana para dimensiones subjetivas o de alto impacto.

### ¿Una puntuación de benchmark predice la experiencia del usuario?

Solo si la tarea, distribución y métrica se parecen al producto. En muchos sistemas, la latencia, la recuperación, las tools y la interfaz explican más valor que una diferencia pequeña entre modelos base.

## Fuentes primarias

[^mmlu]: Dan Hendrycks et al., [*Measuring Massive Multitask Language Understanding*](https://arxiv.org/abs/2009.03300), 2020.
[^helm]: Percy Liang et al., [*Holistic Evaluation of Language Models*](https://arxiv.org/abs/2211.09110), 2022.
[^arena]: Lianmin Zheng et al., [*Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*](https://arxiv.org/abs/2306.05685), 2023.
[^livecodebench]: Naman Jain et al., [*LiveCodeBench: Holistic and Contamination Free Evaluation of Large Language Models for Code*](https://arxiv.org/abs/2403.07974), 2024.
[^openai-evals]: OpenAI, [*GPT-4 Research — OpenAI Evals*](https://openai.com/index/gpt-4-research/), 2023. OpenAI describe Evals as a development tool for identifying shortcomings, preventing regressions and tracking performance across model versions.
