---
title: Evaluación de sistemas multimodales
description: Por qué medir la capacidad multimodal exige algo más que exactitud en preguntas sobre imágenes, qué revelan OCRBench v2 y MMAU sobre los límites reales del campo, y los dos problemas sistemáticos que hacen que los benchmarks actuales sobrestimen las capacidades reales.
date: 2026-04-03
keywords: "evaluación modelos multimodales, benchmarks multimodales, OCRBench, MMAU, VQA, MMMU, capacidades IA real, evaluación LLM multimodal, métricas IA generativa"
tags:
  - IA
  - Evaluación
  - Multimodalidad
video: "04-evaluacion.mp4"
---

# Capítulo 4 — Evaluación: medir sin autoengañarse

Este artículo analiza por qué medir la capacidad real de un sistema multimodal es más difícil de lo que sugieren los rankings de benchmarks. Al leerlo entenderás qué son el grounding y el sesgo lingüístico (y por qué el segundo hace que un modelo pueda responder bien sin haber procesado realmente la imagen), cómo la contaminación de datos de evaluación infla artificialmente los resultados publicados, y qué revelan benchmarks como OCRBench v2, MMAU, ZeroBench y HallusionBench sobre los límites reales del campo en documentos, audio, vídeo largo y razonamiento espacial. El artículo es útil tanto para lectores técnicos que evalúan modelos como para cualquiera que quiera interpretar con rigor las comparativas que circulan en el sector.

Evaluar si un modelo de lenguaje produce respuestas precisas y útiles es ya un problema complejo, pero cuando se añade la dimensión visual o auditiva la dificultad se multiplica de dos formas distintas. 

La primera es que los benchmarks actuales de multimodalidad tienen dos problemas sistemáticos que llevan a sobrestimar las capacidades reales (la contaminación de datos de evaluación y la dominancia del texto en los benchmarks). 

La segunda es que la evaluación ha estado dominada históricamente por tareas de visión-lenguaje, lo que ha dejado sin medir bien capacidades enteras: comprensión de documentos con layout complejo, razonamiento sobre audio, coherencia temporal en vídeo o calidad de salidas generadas en modalidades distintas al texto. OCRBench v2 y MMAU son recordatorios recientes de que ese espacio evaluado hasta ahora de forma superficial sigue siendo terreno difícil para los mejores modelos actuales.

---

## 1. Qué significa evaluar el grounding

En el contexto de los sistemas multimodales, grounding es el grado en que la respuesta del modelo está sustentada en el contenido real de la imagen o el audio, y no en inferencias estadísticas sobre qué tipo de respuesta es probable dado el texto de la pregunta. Un modelo puede responder correctamente a "¿qué color tiene el coche de la imagen?" sin haber procesado realmente la imagen, si el color más frecuente en su entrenamiento para coches en contextos similares coincide con el correcto. 

Ese modelo no tiene grounding, sino un sesgo lingüístico fuerte que produce la respuesta acertada por razones equivocadas, y la diferencia resulta invisible mientras el sesgo estadístico y la respuesta correcta apunten en la misma dirección.

Para medir grounding, los benchmarks necesitan incluir ejemplos donde la respuesta correcta viola las expectativas estadísticas. Si todas las preguntas sobre frutas en las imágenes tienen respuestas que coinciden con las frutas más representadas en el entrenamiento, no hay forma de distinguir un modelo con comprensión visual real de uno que responde por probabilidad.

El Visual Question Answering Challenge (VQA), uno de los benchmarks más usados históricamente, tiene exactamente este problema [Goyal et al., 2017][r1]. Un análisis publicado en 2017 mostró que un modelo que ignoraba completamente las imágenes y respondía basándose solo en la distribución de respuestas más frecuentes para cada tipo de pregunta obtenía resultados sorprendentemente altos. Las mejoras en los benchmarks posteriores introdujeron técnicas de balanceo para reducir este sesgo, aunque no lo eliminaron por completo.

{{ include_html("snippets/multimodalidad-iag/04-grounding-concepto.html") }}

---

## 2. El problema de la contaminación de benchmarks

El segundo problema sistemático es la contaminación. Los modelos fundacionales se preentrenan con cantidades masivas de datos de internet, y no hay garantías de que los pares imagen-descripción o los conjuntos de evaluación no aparezcan en esos datos.

La contaminación en texto ya es un problema documentado: modelos que obtienen resultados excepcionales en ciertos benchmarks de razonamiento son capaces de recitar las respuestas correctas cuando se les proporciona el identificador del problema, lo que sugiere que el benchmark estaba en sus datos de entrenamiento. En multimodalidad el problema es potencialmente mayor, porque las imágenes de los benchmarks son frecuentemente fotografías disponibles públicamente que pueden haber aparecido en el conjunto de preentrenamiento junto con sus descripciones o etiquetas.

La solución técnica es usar benchmarks con datos de evaluación que no existían en internet en el momento del preentrenamiento del modelo o que están protegidos de la indexación, aunque en la práctica la recomendación más útil es interpretar los resultados con escepticismo cuando el modelo evaluado tiene preentrenamiento masivo sobre datos de internet, sobre todo si el benchmark es antiguo.

Los laboratorios más rigurosos realizan análisis de contaminación antes de publicar resultados: buscan en sus datos de entrenamiento imágenes similares a las del benchmark de evaluación y excluyen esas imágenes del análisis final. Sin ese análisis, los resultados publicados son una cota superior de la capacidad real del modelo en ese benchmark, no una medida directa.

{{ include_html("snippets/multimodalidad-iag/04-contaminacion.html") }}

---

## 3. El sesgo lingüístico: responder por probabilidad, no por evidencia

El sesgo/prior lingüístico es la tendencia de los modelos a generar respuestas que son estadísticamente probables dado el texto de la pregunta, con independencia del contenido de la imagen. Es la forma más sutil de falta de grounding y la más difícil de detectar con benchmarks estándar, porque los errores que produce son invisibles cuando la distribución estadística coincide con la distribución de respuestas correctas.

Los experimentos de ablación son la herramienta estándar para medirlo: se presenta al modelo la pregunta sin imagen y se observa si la distribución de respuestas cambia significativamente. Cuando el modelo sin imagen obtiene resultados similares al modelo con imagen, el sesgo lingüístico está dominando la respuesta.

El efecto es especialmente marcado en categorías donde las distribuciones de entrenamiento están sesgadas: preguntas sobre el color habitual de ciertos objetos, la especie de un animal cuando solo hay uno visible, o el número de elementos en escenas donde dos o tres es la frecuencia dominante. En todos esos casos hay una distribución de respuesta muy sesgada que el modelo aprende durante el entrenamiento y que funciona como atajo, prescindiendo de la imagen cuando el sesgo es suficientemente fuerte.

El diseño de benchmarks que resisten el sesgo lingüístico requiere técnicas activas: contraejemplos donde el objeto tiene un color inusual, escenas donde el número de elementos viola las expectativas, configuraciones espaciales que son poco frecuentes en el entrenamiento. [MMStar][r3] y [SEEDBench][r2] son ejemplos de benchmarks diseñados con atención explícita a este problema.

{{ include_html("snippets/multimodalidad-iag/04-prior-linguistico.html") }}

---

## 4. Métricas más allá de la exactitud

La exactitud en la respuesta final no captura toda la información relevante sobre las capacidades de un modelo multimodal. Los evaluadores más rigurosos incluyen tres dimensiones adicionales que revelan aspectos distintos de la comprensión visual.

**Consistencia.** Un modelo genuinamente capaz debería responder de forma consistente a parafraseos de la misma pregunta. Cuando la respuesta cambia drásticamente ante una formulación semánticamente equivalente, el modelo no tiene comprensión robusta del contenido visual, sino sensibilidad a la forma superficial de la pregunta.

**Localización cuando es relevante.** Para tareas donde la respuesta depende de la ubicación de elementos en la imagen, la evaluación debería verificar no solo si la respuesta final es correcta sino también si el modelo puede señalar dónde en la imagen está el elemento relevante. Un modelo que responde correctamente "hay tres coches" pero no puede delimitar dónde están tiene un tipo de comprensión distinto al de un modelo que puede hacerlo, y esa diferencia importa en aplicaciones donde la localización es parte del resultado esperado [Hu et al., 2024][r4].

**Calibración.** Los modelos deberían poder expresar incertidumbre cuando el contenido visual es ambiguo o cuando la pregunta no tiene respuesta clara dado el contenido disponible. Un modelo que siempre genera una respuesta con alta confianza, incluso ante imágenes ambiguas o preguntas que no pueden responderse sin información adicional, no está calibrado correctamente, lo que en producción se traduce en respuestas falsamente definitivas donde el sistema debería abstenerse o pedir aclaración.

{{ include_html("snippets/multimodalidad-iag/04-metricas-evaluacion.html") }}

---

## 5. Dominios donde la evaluación sigue siendo difícil

La evaluación de multimodalidad ha estado dominada por VQA y tareas de grounding visual porque son las más fáciles de automatizar y de convertir en benchmarks con respuestas de elección única. Eso ha creado un punto ciego sistemático: los dominios donde la evaluación es más difícil de automatizar son precisamente los que más revelan sobre las limitaciones reales de los modelos.

**Documentos con layout complejo.** OCRBench v2, publicado en 2024, evaluó a modelos multimodales avanzados en tareas de localización de texto, reconocimiento de manuscrito y razonamiento lógico sobre documentos [Liu et al., 2024][r5]. Los resultados mostraron que incluso modelos con puntuaciones altas en VQA tropiezan en escenarios de documento real: texto en orientaciones no estándar, tablas con celdas fusionadas, fórmulas matemáticas integradas en flujo de texto, o preguntas que requieren cruzar información de varias regiones del mismo documento. OmniDocBench, presentado en CVPR 2025, extendió esa evaluación a documentos con layouts no estándar: múltiples columnas, figuras flotantes, elementos con alineación no lineal. La evaluación de 13 modelos SOTA mostró el mismo colapso: sistemas que alcanzan entre el 80 y el 90% de precisión en texto estándar caen al 36,9% en reconstrucción de layouts complejos, lo que confirma que el límite no está en el reconocimiento visual sino en la integración de estructura y semántica en escenas que no son prosa lineal [Ouyang et al., 2025][r10].

{{ include_html("snippets/multimodalidad-iag/04-ocrbench.html") }}

**Audio experto.** MMAU, publicado por Adobe Research en 2024, evaluó comprensión y razonamiento sobre audio en tres categorías: habla, sonidos no verbales del entorno y música [Sakshi et al., 2024][r6]. Los resultados mostraron que incluso los modelos más fuertes quedan significativamente por debajo del rendimiento humano experto en las tareas más difíciles de cada categoría, y que la degradación es especialmente marcada cuando la tarea requiere razonar sobre la causa del sonido (no solo identificarlo), inferir contexto de múltiples fuentes sonoras simultáneas, o distinguir entre variantes musicales que comparten estructura superficial. Esos límites son especialmente relevantes para sistemas de audio nativo como Gemini 2.5 o Qwen2.5-Omni, donde las expectativas de capacidad suelen estar por encima de lo que los benchmarks disponibles pueden confirmar.

**Razonamiento experto.** MMMU, publicado en 2023, evaluó la capacidad de los modelos de razonar sobre contenido visual en 30 asignaturas universitarias agrupadas en 6 disciplinas (Arte y Diseño, Negocios, Ciencia, Salud y Medicina, Humanidades y Ciencias Sociales, e Ingeniería y Tecnología). A diferencia de los benchmarks de descripción de imágenes, MMMU exige integrar conocimiento de dominio con comprensión visual: no basta con leer bien la imagen, el modelo tiene que saber qué significa lo que ve. Los resultados mostraron una brecha persistente entre los mejores modelos y el rendimiento humano experto, sobre todo en disciplinas donde la imagen no es ilustración sino que contiene la evidencia decisiva: diagramas de circuito, gráficos de laboratorio, radiografías [Yue et al., 2023][r7].

**Vídeo larga duración.** Video-MME, publicado en 2024, evaluó la comprensión de vídeos en rangos desde minutos hasta horas, con preguntas que requieren tracking temporal, análisis de cambios entre segmentos y síntesis de información distribuida a lo largo de todo el vídeo. La evaluación reveló una caída pronunciada en calidad a medida que aumenta la duración: los modelos que comprenden bien vídeos cortos fallan en las versiones largas de las mismas tareas, porque el mecanismo de atención pierde coherencia temporal a escala de minutos u horas, un límite que los benchmarks de imagen o vídeo corto no capturan [Fu et al., 2024][r8]. ZeroBench, publicado en febrero de 2025, señaló otro ángulo del problema: evaluó 20 modelos frontier en cien tareas de cognición espacial visual sobre imágenes estáticas, y todos obtuvieron un 0,0% de precisión [Roberts et al., 2025][r11]. No se trata de coherencia temporal sino de algo más básico: el razonamiento espacial puro, en escenas que cualquier niño de tres años resuelve sin esfuerzo, excede de forma sistemática lo que cualquier modelo actual puede hacer. LVOmniBench, presentado en 2026, confirmó el patrón en larga duración con vídeos reales de entre 10 y 90 minutos: todos los modelos de código abierto quedan por debajo del 35% de precisión, con el mejor modelo comercial evaluado alcanzando solo el 65%.

{{ include_html("snippets/multimodalidad-iag/04-video-degradacion.html") }}

**Alucinaciones visuales.** HallusionBench, publicado en 2023, fue diseñado para detectar alucinaciones específicas en sistemas visión-lenguaje: casos donde el modelo afirma ver elementos ausentes, niega la presencia de elementos visibles, o atribuye relaciones espaciales incorrectas a objetos que puede identificar individualmente. Los resultados mostraron que la alucinación visual es un patrón consistente en todos los modelos evaluados, no un fenómeno marginal, y que la frecuencia varía según el tipo de tarea (conteo, razonamiento espacial, existencia) de forma que no hay un modelo robusto en todas las categorías a la vez [Liu et al., 2023][r9].

{{ include_html("snippets/multimodalidad-iag/04-hallusionbench.html") }}

**Salidas multimodales.** No hay benchmarks establecidos que midan bien la calidad de respuesta oral en tiempo real, la coherencia entre texto y voz generados simultáneamente, o la precisión de imágenes generadas condicionadas en texto más imagen de entrada. Esta ausencia de métricas significa que no sabemos con precisión dónde están los límites actuales de los sistemas que trabajan en ese espacio.

---

!!! tip "Siguiente capítulo"
    [Capítulo 5 — Riesgos →](./05-riesgos.md) — Qué riesgos son específicos de la multimodalidad, por qué el grounding deficiente tiene consecuencias distintas según la modalidad, y cómo cambia el perfil de riesgo cuando percepción y acción quedan acopladas en el mismo sistema.

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Goyal et al. (2017)** — *Making the V in VQA Matter* ([arXiv][r1]) | Análisis del prior lingüístico en VQA y VQA v2. |
| R2 | **Li et al. (2023)** — *SEED-Bench: Benchmarking Multimodal LLMs with Generative Comprehension* ([arXiv][r2]) | Benchmark diseñado para reducir contaminación y prior lingüístico. |
| R3 | **Chen et al. (2024)** — *MMStar: Are We on the Right Way for Evaluating Large Vision-Language Models?* ([arXiv][r3]) | Análisis de fugas en benchmarks multimodales y propuesta de evaluación más rigurosa. |
| R4 | **Hu et al. (2024)** — *Evaluating Visual Grounding in Large Vision-Language Models* ([arXiv][r4]) | Revisión de métricas de evaluación de grounding visual en VLMs con énfasis en localización y calibración. |
| R5 | **Liu et al. (2024)** — *OCRBench v2* ([arXiv][r5]) | Benchmark de localización de texto, manuscrito y razonamiento lógico sobre documentos. |
| R6 | **Sakshi et al. (2024)** — *MMAU: A Massive Multi-Task Audio Understanding and Reasoning Benchmark* ([Adobe Research][r6]) | Benchmark de comprensión y razonamiento de audio con habla, sonidos no verbales y música. |
| R7 | **Yue et al. (2023)** — *MMMU: A Massive Multi-discipline Multimodal Understanding and Reasoning Benchmark for Expert AGI* ([arXiv][r7]) | Benchmark de razonamiento visual en 57 disciplinas universitarias con brecha persistente respecto a humanos expertos. |
| R8 | **Fu et al. (2024)** — *Video-MME: The First-Ever Comprehensive Evaluation Benchmark of Multi-modal LLMs in Video Analysis* ([arXiv][r8]) | Benchmark de comprensión de vídeo en rangos de duración desde minutos hasta horas. |
| R9 | **Liu et al. (2023)** — *HallusionBench: An Advanced Diagnostic Suite for Entangled Language Hallucination and Visual Illusion in Large Vision-Language Models* ([arXiv][r9]) | Benchmark específico para detectar alucinaciones visuales en sistemas visión-lenguaje. |
| R10 | **Ouyang et al. (2024)** — *OmniDocBench: Benchmarking Diverse PDF Document Parsing with Comprehensive Annotations* ([arXiv][r10]) | Benchmark de parsing de PDFs con layouts complejos; presentado en CVPR 2025. |
| R11 | **Roberts et al. (2025)** — *ZeroBench: An Impossible Visual Benchmark for Contemporary Large Multimodal Models* ([arXiv][r11]) | Benchmark imposible: 20 modelos frontier evaluados, todos con 0,0% en cognición espacial visual. |

</details>

[r1]: https://arxiv.org/abs/1612.00837 "Making the V in VQA Matter — Goyal et al. 2017"
[r2]: https://arxiv.org/abs/2307.16125 "SEED-Bench — Li et al. 2023"
[r3]: https://arxiv.org/abs/2403.17101 "MMStar — Chen et al. 2024"
[r4]: https://arxiv.org/abs/2402.05862 "Evaluation of VLMs — 2024"
[r5]: https://arxiv.org/abs/2501.00321 "OCRBench v2 — Liu et al. 2024"
[r6]: https://research.adobe.com/publication/mmau-a-massive-multi-task-audio-understanding-and-reasoning-benchmark/ "MMAU — Sakshi et al. 2024"
[r7]: https://arxiv.org/abs/2311.16502 "MMMU — Yue et al. 2023"
[r8]: https://arxiv.org/abs/2405.21075 "Video-MME — Fu et al. 2024"
[r9]: https://arxiv.org/abs/2310.14566 "HallusionBench — Liu et al. 2023"
[r10]: https://arxiv.org/abs/2412.07626 "OmniDocBench — Ouyang et al. 2024"
[r11]: https://arxiv.org/abs/2502.09696 "ZeroBench — Roberts et al. 2025"

---

## Preguntas frecuentes

**¿Por qué un modelo puede obtener una puntuación alta en un benchmark visual sin haber procesado realmente la imagen?**
Por el sesgo lingüístico: el modelo responde basándose en la distribución estadística de respuestas probables dado el texto de la pregunta, no en el contenido visual. El efecto es invisible cuando ese sesgo estadístico coincide con la respuesta correcta, porque el modelo acierta por razones equivocadas y ningún benchmark de exactitud lo distingue de uno que sí ha procesado la imagen.

**¿Cómo se detecta si un sistema realmente razona sobre la secuencia temporal de un vídeo?**
Con lo que el artículo describe como la prueba de desordenamiento: se pasan los fotogramas del vídeo al modelo en orden aleatorio antes de hacer la pregunta. Si la puntuación no varía o incluso mejora con el desorden, el sistema no tiene razonamiento temporal dinámico y está respondiendo a partir de pistas semánticas presentes en fotogramas individuales, no de la secuencia.

**¿Qué hace que MMMU sea más exigente que los benchmarks de descripción de imágenes?**
MMMU usa preguntas de exámenes universitarios en 30 asignaturas donde la imagen no es ilustración sino que contiene la evidencia decisiva: diagramas de circuito, gráficos de laboratorio, radiografías. No basta con leer bien la imagen, el modelo tiene que saber qué significa lo que ve. Los mejores modelos actuales siguen quedando significativamente por debajo del rendimiento humano experto en las categorías más técnicas.

**¿Por qué el rendimiento de los modelos cae tanto al pasar de texto estándar a documentos con layout complejo?**
Porque sus representaciones están optimizadas para fotografías naturales, no para integrar estructura espacial y semántica al mismo tiempo. OCRBench v2 y OmniDocBench muestran que sistemas con el 80-90% de precisión en texto estándar caen al 36,9% en reconstrucción de layouts con columnas múltiples, tablas con celdas fusionadas o fórmulas integradas en flujo de texto.
