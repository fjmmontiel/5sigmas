---
title: Alineamiento de pares a interacciones multimodales
description: Cómo se aprende que dos señales distintas hablan del mismo contenido, qué cambia cuando el alineamiento va más allá del par imagen-texto, y por qué la calidad y estructura del dato determinan la robustez de las representaciones aprendidas.
date: 2026-04-02
keywords: "alineamiento multimodal, CLIP, contrastive learning, ImageBind, embedding multimodal, representaciones imagen texto, entrenamiento multimodal, aprendizaje contrastivo"
tags:
  - IA
  - GenAI
  - Multimodalidad
  - Alineamiento
---

# Capítulo 2 — Alineamiento: de pares a interacciones

El capítulo anterior estableció que la multimodalidad no se agota en el par texto-imagen ni en la existencia de un único espacio de representación compartida. Este capítulo describe cómo se construye el alineamiento entre modalidades: qué tipo de datos se necesitan, cómo evoluciona el problema cuando las modalidades son más de dos, y qué sucede cuando los datos son de baja calidad o están mal estructurados.

La progresión no es arbitraria. Los sistemas multimodales se entrenan en etapas, cada una construyendo sobre la anterior, de forma que los problemas que aparecen en las etapas finales casi siempre tienen su raíz en debilidades de las etapas previas.

---

## 1. Pares imagen-texto: la base y sus límites

El punto de partida es el más sencillo conceptualmente: pares de imagen y texto que van juntos. Una fotografía con su pie de foto, una imagen de producto acompañada de su descripción, un diagrama junto a su leyenda. Internet contiene miles de millones de estos pares, y los modelos fundacionales de visión-lenguaje como CLIP o ALIGN se entrenaron extrayéndolos a escala [CLIP][r1].

El proceso de aprendizaje con estos pares sigue una lógica de *contrastive learning*: el modelo aprende a proyectar la imagen y el texto al mismo espacio de representación de forma que los pares que van juntos queden cerca y los que no van juntos queden lejos. La función de pérdida penaliza al modelo cuando asocia una imagen con la descripción de otra imagen, y lo recompensa cuando las representaciones del par correcto son similares. Ese entrenamiento produce un encoder visual y un encoder textual alineados, capaces de encontrar la descripción más compatible con una imagen sin haber sido entrenados con ese par específico, lo que surge directamente de que el espacio compartido captura relaciones semánticas en el par imagen-texto en lugar de memorizar ejemplos.

La limitación de este enfoque está en el ruido de los datos. El pie de foto de una fotografía no siempre describe con precisión lo que aparece en ella: puede referirse a algo que ocurrió antes o después, puede ser una descripción de contexto más que de contenido, o puede ser simplemente irrelevante. 

Cuando el modelo aprende de millones de estos pares ruidosos, las representaciones que construye son estadísticamente sólidas pero frágiles en los detalles, lo que tiene consecuencias visibles cuando el sistema se enfrenta a preguntas que requieren precisión.

La respuesta del campo a esas fragilidades no fue abandonar el paradigma contrastivo sino refinarlo. SigLIP sustituyó la función de pérdida clásica de CLIP por entrenamiento sigmoid por pares independientes, lo que mejora la estabilidad en lotes pequeños y produce representaciones más transferibles en tareas de localización [SigLIP][r7]. 

DINOv2 tomó una dirección distinta: en lugar de depender de supervisión textual, entrena el encoder visual con auto-supervisión sobre una colección curada de imágenes, produciendo representaciones más densas que capturan estructura espacial fina y generalizan mejor en segmentación y recuperación visual [DINOv2][r8]. Ambos apuntan a la misma conclusión: el bottleneck de calidad de representación en sistemas multimodales no estaba solo en el alineamiento con texto, sino en la riqueza del propio encoder visual.

Pero la limitación más importante no es el ruido: es que el par imagen-texto deja fuera modalidades enteras. Audio, vídeo, documentos y señales continuas no encajan en ese marco sin extensiones adicionales, y esa estrechez condiciona qué sistemas puede producir quien solo trabaja con ese tipo de datos.

---

## 2. Más allá del par: alineamiento de múltiples modalidades

Una de las observaciones más importantes de la última etapa del campo es que el alineamiento no necesita estar anclado en imagen-texto para funcionar. ImageBind lo demostró de forma directa: usando únicamente pares que incluyen imagen como denominador común (imagen-texto, imagen-audio, imagen-profundidad, imagen-térmico, imagen-IMU), el sistema aprende un espacio de embedding compartido sobre seis modalidades sin haber necesitado nunca pares directos audio-texto o audio-profundidad [ImageBind][r5]. 

El resultado es que la consulta textual recupera audio, la imagen recupera profundidad o térmico, y todas las modalidades quedan alineadas por transitividad a través del ancla visual.

Esa misma lógica de alineamiento se ha extendido al nivel de producto. Gemini Embedding 2 trata el embedding multimodal como una primitiva nativa que unifica texto, imágenes, vídeo, audio y documentos en un único espacio de representación usable para búsqueda, clasificación y clustering cruzado entre modalidades [Gemini Embedding 2][r6]. La diferencia con los sistemas anteriores no es solo cuantitativa (más modalidades) sino cualitativa: el *embedding* ya no es el subproducto de un modelo de comprensión, sino el objeto central del sistema.

Lo que cambia cuando el alineamiento va más allá del par texto-imagen es la estructura del dato de entrenamiento. 
Para visión-lenguaje, internet proporcionaba miles de millones de pares naturales. 
Para audio-texto, vídeo-texto o documento-layout, los pares de alta calidad son mucho más escasos, más ruidosos y más dependientes de trabajo humano o de síntesis controlada. 
Esa asimetría en la disponibilidad de datos explica en gran medida por qué las capacidades de los sistemas son asimétricas: los modelos comprenden imágenes mejor que audio, y audio mejor que documentos con layout complejo.

{{ include_html("snippets/multimodalidad-iag/02-imagebind-transitividad.html") }}

---

## 3. Instrucción visual: el siguiente nivel

Los pares imagen-texto (y sus extensiones a otras modalidades) entrenan representaciones, pero no entrenan al modelo para seguir instrucciones. Para que un sistema pueda responder a "¿qué anomalías hay en este gráfico?" o "transcribe el texto de esta imagen y corrígelo", necesita un entrenamiento adicional sobre datos de instrucción visual.

Los datos de instrucción visual son triples de imagen, instrucción textual y respuesta esperada. El modelo aprende a condicionarse simultáneamente sobre la imagen y la instrucción para generar la respuesta correcta, que es el formato que usan modelos como LLaVA o InstructBLIP.

Generar estos datos de instrucción de alta calidad es significativamente más costoso que extraer pares de internet, porque requiere o bien anotación humana (cara y lenta) o bien generación sintética mediante modelos de lenguaje potentes que reciben la imagen descrita y generan instrucciones y respuestas plausibles. La generación sintética escala, pero introduce sesgos propios del modelo generador: si el modelo que genera los datos tiene puntos ciegos, el modelo que se entrena con ellos los heredará.

El modelo LLaVA, publicado en 2023, demostró que la generación sintética de datos de instrucción visual usando GPT-4 producía modelos capaces de seguir instrucciones visuales con calidad notable dado el coste de generación de los datos [LLaVA][r2]. El enfoque se ha extendido como práctica habitual para proyectos que no disponen de presupuesto para anotación humana a gran escala, aunque conviene tener presente que la calidad del resultado queda acotada por la calidad del modelo que genera los datos sintéticos.

{{ include_html("snippets/multimodalidad-iag/02-instruccion-visual.html") }}

---

## 4. Por qué la calidad de datos manda

La lección más consistente de los sistemas multimodales es que la calidad de los datos de entrenamiento determina la robustez de las representaciones mucho más que las decisiones de arquitectura. Un modelo con arquitectura subóptima entrenado con datos de alta calidad tiende a superar a uno con arquitectura de vanguardia entrenado con datos ruidosos, al menos en las tareas que esos datos cubren bien.

Esa importancia absoluta de los datos se traduce en dos efectos que afectan directamente a cómo interpretar los resultados publicados. 

El primero es que los benchmarks de evaluación de modelos multimodales son frecuentemente incompletos en su diagnóstico: un modelo puede obtener puntuaciones altas en tareas de descripción de imágenes mientras falla en tareas de localización o verificación, simplemente porque los datos con los que fue entrenado enfatizaron el primero y dejaron el segundo mal cubierto, de forma que la distribución de los datos de entrenamiento se refleja directamente en el perfil de capacidades del modelo. 

El segundo efecto es que las debilidades se amplifican en cadena: si el preentrenamiento con pares imagen-texto produce representaciones donde ciertos tipos de imágenes están asociados débilmente con sus descripciones correctas, el entrenamiento de instrucción visual posterior no puede corregir ese problema desde cero, porque construye sobre las representaciones que recibe, con sus fortalezas y sus lagunas.

Radford et al. documentaron este patrón al analizar los fallos de CLIP en categorías de imágenes subrepresentadas en los datos de entrenamiento [CLIP][r1]: el modelo generalizaba bien en categorías comunes y sistemáticamente peor en categorías infrecuentes, incluso cuando las imágenes eran de calidad equivalente. La corrección requería reequilibrar los datos, no cambiar la arquitectura.

{{ include_html("snippets/multimodalidad-iag/02-calidad-datos-perfil.html") }}

---

## 5. El rol del alineamiento con preferencias humanas

Más allá del entrenamiento supervisado, los modelos multimodales más recientes incluyen una fase de alineamiento con preferencias humanas, análoga al RLHF que se aplica a los modelos de lenguaje. En esta fase, evaluadores humanos comparan respuestas del modelo a preguntas visuales y expresan cuál es mejor, de forma que el modelo aprende a generar respuestas que los humanos consideran útiles, correctas y alineadas con sus expectativas.

Esta fase captura algo que el entrenamiento supervisado puro no puede medir directamente: las preferencias subjetivas sobre cómo debe describir el modelo lo que ve, qué nivel de detalle es apropiado para distintos tipos de preguntas, y cómo equilibrar precisión y legibilidad en las respuestas.

El riesgo es que las preferencias de los evaluadores no son uniformes y pueden introducir sesgos culturales, de género o de gusto estético que se codifican en el modelo. Si los evaluadores tienden a preferir descripciones más largas y elaboradas, el modelo aprenderá a generar respuestas más largas con independencia de si esa longitud es apropiada para la pregunta. El sesgo no está en la arquitectura ni en los datos visuales sino en quién evalúa y qué criterios aplica, lo que hace que sea difícil de detectar con benchmarks estándar y más fácil de detectar en uso real.

{{ include_html("snippets/multimodalidad-iag/02-datos-alineamiento.html") }}

---

!!! tip "Siguiente capítulo"
    [Capítulo 3 — Arquitecturas →](./03-arquitecturas.md) — Las cuatro familias de arquitectura multimodal, sus diferencias en calidad, coste y latencia, y por qué el embedding multimodal y la generación multimodal no son la misma capa del sistema.

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Radford et al. (2021)** — *Learning Transferable Visual Models From Natural Language Supervision* ([arXiv][r1]) | CLIP y el aprendizaje contrastivo a escala. |
| R2 | **Liu et al. (2023)** — *Visual Instruction Tuning* ([arXiv][r2]) | LLaVA: generación sintética de datos de instrucción visual con GPT-4. |
| R3 | **Li et al. (2023)** — *BLIP-2: Bootstrapping Language-Image Pre-training* ([arXiv][r3]) | Estrategia de entrenamiento en etapas para sistemas visión-lenguaje. |
| R4 | **Jain et al. (2023)** — *VCoder: Versatile Vision Encoders for Multimodal Large Language Models* ([arXiv][r4]) | Estudio de cómo la elección del encoder visual determina el perfil de capacidades del sistema multimodal, más allá de la arquitectura del LLM. |
| R5 | **Girdhar et al. (2023)** — *ImageBind: One Embedding Space To Bind Them All* ([CVPR][r5]) | Alineamiento de seis modalidades usando solo pares con imagen como ancla. |
| R6 | **Google DeepMind (2026)** — *Gemini Embedding 2* ([blog][r6]) | Embedding nativo multimodal sobre texto, imágenes, vídeo, audio y documentos. |
| R7 | **Zhai et al. (2023)** — *Sigmoid Loss for Language Image Pre-Training* ([arXiv][r7]) | SigLIP: función de pérdida sigmoid por pares independientes que mejora la estabilidad respecto a CLIP. |
| R8 | **Oquab et al. (2023)** — *DINOv2: Learning Robust Visual Features without Supervision* ([arXiv][r8]) | DINOv2: encoder visual auto-supervisado con representaciones densas y mayor generalización espacial. |

</details>

[r1]: https://arxiv.org/abs/2103.00020 "CLIP — Radford et al. 2021"
[r2]: https://arxiv.org/abs/2304.08485 "LLaVA — Liu et al. 2023"
[r3]: https://arxiv.org/abs/2301.12597 "BLIP-2 — Li et al. 2023"
[r4]: https://arxiv.org/abs/2312.14233 "VCoder — Jain et al. 2023"
[r5]: https://openaccess.thecvf.com/content/CVPR2023/html/Girdhar_ImageBind_One_Embedding_Space_To_Bind_Them_All_CVPR_2023_paper "ImageBind — Girdhar et al. CVPR 2023"
[r6]: https://blog.google/innovation-and-ai/technology/developers-tools/gemini-embedding-2/ "Gemini Embedding 2 — Google DeepMind 2026"
[r7]: https://arxiv.org/abs/2303.15343 "SigLIP — Zhai et al. 2023"
[r8]: https://arxiv.org/abs/2304.07193 "DINOv2 — Oquab et al. 2023"
