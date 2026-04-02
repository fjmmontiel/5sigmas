---
title: Arquitecturas de sistemas multimodales
description: Las cuatro familias de arquitectura multimodal, sus diferencias en calidad, coste y latencia, y por qué el embedding multimodal y la generación multimodal no son la misma capa del sistema.
---

# Capítulo 3 — Arquitecturas: espacios compartidos, conectores y modelos omni

Los sistemas multimodales no tienen una única arquitectura estándar. Hay cuatro formas distintas de conectar modalidades diferentes dentro de un sistema, y cada una tiene consecuencias específicas en qué tareas puede realizar el modelo, qué coste computacional tiene en producción y qué latencia introduce en las respuestas. 

Una distinción que conviene hacer desde el inicio: el embedding multimodal y la generación multimodal son capas distintas del sistema. Un modelo puede ser muy fuerte en representación y recuperación cruzada y débil en generación multimodal, o al revés, porque esas capacidades no emergen de la misma arquitectura ni del mismo tipo de entrenamiento.

Entender estas diferencias permite tomar decisiones más informadas al seleccionar o diseñar un sistema, porque la arquitectura adecuada depende del caso de uso concreto y no solo de cuál obtiene mejores puntuaciones en benchmarks genéricos.

---

## 1. Encoder visual + conector + modelo de lenguaje

El enfoque más extendido en los últimos años consiste en tres componentes encadenados: un encoder visual que procesa la imagen y produce una representación de alta dimensión, un módulo de conexión que adapta esa representación al espacio del modelo de lenguaje, y el modelo de lenguaje que genera la respuesta condicionado sobre esa representación visual.

Esta arquitectura tiene la ventaja de que sus componentes pueden entrenarse o reutilizarse de forma relativamente independiente. BLIP-2, por ejemplo, usa un encoder visual preentrenado (EVA-CLIP) y un modelo de lenguaje preentrenado (OPT o FlanT5), conectados por un módulo ligero llamado Q-Former que el sistema entrena con mucho menos cómputo que el necesario para entrenar los extremos desde cero [BLIP-2][r2].

El conector es el punto de diseño más crítico de esta arquitectura. Si es demasiado simple, no puede trasladar la riqueza de la representación visual al modelo de lenguaje, pero si es demasiado complejo requiere más datos y más cómputo para entrenarse correctamente. El Q-Former de BLIP-2 usa un número fijo de tokens de consulta que "comprimen" la información visual en una representación de tamaño fijo, lo que tiene la ventaja de que el coste de procesamiento es predecible con independencia del tamaño de la imagen.

LLaVA adopta un conector aún más sencillo: una transformación lineal que proyecta las representaciones del encoder visual directamente al espacio de embedding del modelo de lenguaje [LLaVA][r3]. Esta simplicidad es deliberada, porque el modelo de lenguaje es suficientemente potente para aprender a interpretar esas representaciones durante el ajuste fino, sin necesidad de un módulo de conexión complejo.

La limitación de esta arquitectura es que la información visual se procesa antes que el texto y se integra como una representación fija. 
El modelo de lenguaje puede condicionar su respuesta sobre esa representación, pero no puede "volver" a la imagen durante el proceso de generación para buscar detalles adicionales. Para tareas que requieren inspección iterativa de la imagen, esta limitación es muy relevante.

{{ include_html("snippets/multimodalidad-iag/03-encoder-conector-llm.html") }}

---

## 2. Fusión mediante cross-attention

Flamingo, publicado por DeepMind en 2022, introdujo un enfoque diferente: en lugar de procesar la imagen antes del texto y pasar su representación como input, insertó capas de cross-attention entre las capas del modelo de lenguaje [Flamingo][r1]. En estas capas, los tokens de texto pueden atender directamente a los tokens visuales en cualquier punto de la generación.

Este diseño permite que el modelo de lenguaje acceda a la información visual de forma dinámica durante toda la generación. Cuando el modelo genera una respuesta que hace referencia a un elemento específico de la imagen, las capas de cross-attention pueden recuperar la representación de ese elemento en el momento en que es relevante, en lugar de depender de que esa información estuviera capturada en la representación inicial.

La diferencia es visible en tareas que requieren razonamiento visual fino como localización, conteo de elementos o análisis de relaciones espaciales, donde Flamingo demostró capacidades de few-shot learning visual que los enfoques de encoder-conector-decoder no podían igualar en ese momento con modelos de tamaño comparable.

El coste de este diseño está en la complejidad de servicio. Las capas de cross-attention aumentan el coste computacional de la inferencia y hacen que el modelo sea más difícil de escalar horizontalmente, de forma que para aplicaciones que requieren latencia baja y volumen alto de consultas, ese overhead puede ser un impedimento real.

{{ include_html("snippets/multimodalidad-iag/03-cross-attention-acceso.html") }}

---

## 3. Tokenización nativa multimodal

El tercer enfoque es el más radical: en lugar de conectar un encoder visual con un modelo de lenguaje mediante algún tipo de conector, el sistema discretiza las imágenes o el audio en tokens del mismo tipo que los tokens de texto, y el modelo procesa todos los tokens de forma unificada.

Gemini, desarrollado por Google, fue el primer modelo de escala masiva construido con esta filosofía desde el principio [Gemini][r4]. En lugar de adaptar un modelo de lenguaje existente para que acepte entradas visuales, Gemini fue diseñado como un modelo nativo multimodal donde texto, imagen, audio y vídeo se representan en el mismo espacio de tokens desde el inicio del preentrenamiento.

Las ventajas teóricas de este enfoque son sustanciales: el modelo puede aprender relaciones entre modalidades que no son posibles cuando las representaciones se generan en etapas separadas, la información visual no está forzada a pasar por un cuello de botella de conector con capacidad limitada, y el modelo puede generar salidas en cualquier modalidad, no solo texto.

La dificultad práctica es el coste de entrenamiento. Para que la tokenización nativa produzca representaciones de calidad comparable a los encoders visuales especializados, el preentrenamiento tiene que exponer al modelo a cantidades masivas de datos multimodales, porque encoders como EVA-CLIP o SigLIP han sido optimizados durante años con cómputo considerable y replicar esa calidad de representación en un modelo unificado requiere una inversión equivalente o superior.

Meta ha explorado esta dirección con Chameleon, un modelo que tokeniza imágenes mediante VQ-VAE y las procesa como tokens discretos intercalados con texto en el mismo transformer, eliminando la distinción entre encoder visual separado y modelo de lenguaje [Chameleon][r8]. Gemini 1.5 toma una ruta complementaria dentro del paradigma de tokenización nativa: adopta una arquitectura Mixture of Experts (MoE) donde distintos grupos de parámetros se especializan por modalidad y tipo de contenido, lo que permite escalar la capacidad total del modelo sin escalar el coste de inferencia de forma proporcional [Gemini 1.5][r9]. El resultado práctico es que Gemini 1.5 puede procesar contextos de hasta un millón de tokens multimodales en producción, una escala que sería computacionalmente inviable con una arquitectura densa equivalente.

{{ include_html("snippets/multimodalidad-iag/03-tokenizacion-discreta.html") }}

---

## 4. Modelos omni y streaming: entrada y salida multimodal nativas

Las tres arquitecturas anteriores comparten una asimetría implícita: están optimizadas para entender modalidades de entrada y responder en texto. La cuarta familia rompe esa asimetría al intentar que entrada y salida sean ambas multimodales, a menudo bajo restricciones de latencia que exigen procesamiento en streaming.

GPT-4o fue el primer modelo de escala masiva que popularizó la idea de modelo "omni": entrenado de extremo a extremo sobre texto, imagen y audio, con entrada combinada de texto, audio, imagen y vídeo y salida de texto, audio e imagen [GPT-4o][r5]. 

En una cronología de 2026, GPT-4o encaja mejor como punto de transición entre la etapa VLM y la etapa omni que como frontera del campo. Gemini 2.5 Native Audio empuja el eje de audio nativo y diálogo en tiempo real [Gemini 2.5 Native Audio][r7], mientras que Qwen2.5-Omni trabaja en streaming sobre texto, imagen, audio y vídeo y genera texto y voz de forma simultánea [Qwen2.5-Omni][r6].

Lo que distingue a estos sistemas de los modelos nativamente multimodales del apartado anterior no es solo que generen en varias modalidades, sino que lo hacen bajo restricciones temporales duras: el modelo tiene que percibir, procesar y responder mientras el audio o el vídeo sigue llegando, lo que impone requisitos muy distintos a la arquitectura de atención, al tamaño del contexto activo y al diseño del decoder. Esta diferencia es la que hace que los modelos omni sean una familia separada y no simplemente una extensión de los modelos con tokenización nativa.

La dificultad práctica de estos sistemas está en la evaluación. No hay benchmarks establecidos que midan bien la calidad de respuesta oral en tiempo real, la gestión de interrupciones o la coherencia entre salida de texto y salida de voz cuando ambas se generan a la vez. MMAU cubre parte del eje de comprensión de audio, pero el espacio de evaluación para generación multimodal en streaming sigue siendo abierto.

{{ include_html("snippets/multimodalidad-iag/03-tres-arquitecturas.html") }}

---

## 5. Calidad, coste y latencia: el espacio de tradeoffs

Cada una de las cuatro familias ocupa una posición distinta en el espacio entre calidad, coste de desarrollo y coste de operación.

El enfoque encoder-conector-LLM ofrece la mayor eficiencia de desarrollo: permite reutilizar componentes preentrenados y reduce el coste de entrenamiento, y en producción resulta relativamente predecible en latencia porque el procesamiento visual es independiente de la longitud de la respuesta generada. Por eso domina en proyectos de código abierto y es la opción más accesible para equipos con recursos limitados.

La fusión mediante cross-attention alcanza mayor calidad en tareas de razonamiento visual fino, aunque ese beneficio tiene un precio en latencia de inferencia que puede ser significativo cuando el volumen de consultas es alto. La elección tiene sentido cuando la precisión en localización y razonamiento espacial es más crítica que el coste de servicio, que no es siempre el caso.

Los modelos nativamente multimodales tienen el mayor potencial estructural a largo plazo pero requieren inversiones de entrenamiento que actualmente solo están al alcance de los laboratorios de IA más grandes, de forma que su latencia y coste en producción dependen de la implementación específica y no son directamente comparables con los otros enfoques. 

Las arquitecturas MoE como Gemini 1.5 modifican parcialmente este análisis: activar solo una fracción de los parámetros por token reduce el coste de inferencia respecto a un modelo denso equivalente, de forma que la barrera de entrada en producción es menor de lo que el tamaño total del modelo sugiere.

Los modelos omni y streaming añaden una dimensión nueva al espacio de tradeoffs: latencia de primera respuesta. Un modelo que genera audio en tiempo real tiene restricciones de latencia cualitativamente distintas a un modelo que responde en texto tras procesar una imagen, porque el usuario percibe el silencio inicial de forma mucho más negativa en una conversación hablada. Eso hace que las decisiones de arquitectura en esta familia estén dominadas por el diseño de la cola de generación y la gestión del contexto activo, más que por la calidad de representación.

Para la mayoría de aplicaciones actuales, la elección práctica se reduce a variantes del modelo encoder-conector-LLM con distintas configuraciones de conector y encoder visual. Las diferencias en coste de operación y predictibilidad de latencia son, en la práctica, más relevantes para decisiones de producción que los números de los benchmarks.

{{ include_html("snippets/multimodalidad-iag/03-tradeoffs.html") }}

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Alayrac et al. (2022)** — *Flamingo: a Visual Language Model for Few-Shot Learning* ([arXiv][r1]) | Cross-attention para fusión visual-lingüística. |
| R2 | **Li et al. (2023)** — *BLIP-2: Bootstrapping Language-Image Pre-training* ([arXiv][r2]) | Q-Former como conector entre encoder visual y LLM. |
| R3 | **Liu et al. (2023)** — *Visual Instruction Tuning* ([arXiv][r3]) | LLaVA: proyección lineal como conector simple. |
| R4 | **Team Gemini (2023)** — *Gemini: A Family of Highly Capable Multimodal Models* ([arXiv][r4]) | Arquitectura nativa multimodal de escala masiva. |
| R5 | **OpenAI (2024)** — *Hello GPT-4o* ([blog][r5]) | Primer modelo omni de escala masiva con entrada y salida multimodal nativas. |
| R6 | **Qwen Team (2025)** — *Qwen2.5-Omni Technical Report* ([arXiv][r6]) | Modelo omni con comprensión y generación multimodal en streaming. |
| R7 | **Google DeepMind (2025)** — *Gemini 2.5 Native Audio* ([blog][r7]) | Capacidades de audio nativo y diálogo en tiempo real. |
| R8 | **Team Chameleon (2024)** — *Chameleon: Mixed-Modal Early-Fusion Foundation Models* ([arXiv][r8]) | Modelo Meta con tokenización discreta de imágenes via VQ-VAE en el mismo transformer que el texto. |
| R9 | **Team Gemini (2024)** — *Gemini 1.5: Unlocking multimodal understanding across millions of tokens of context* ([arXiv][r9]) | Arquitectura MoE multimodal nativa con contexto de hasta un millón de tokens. |

</details>

[r1]: https://arxiv.org/abs/2204.14198 "Flamingo — Alayrac et al. 2022"
[r2]: https://arxiv.org/abs/2301.12597 "BLIP-2 — Li et al. 2023"
[r3]: https://arxiv.org/abs/2304.08485 "LLaVA — Liu et al. 2023"
[r4]: https://arxiv.org/abs/2312.11805 "Gemini — Team Gemini 2023"
[r5]: https://openai.com/index/hello-gpt-4o "Hello GPT-4o — OpenAI 2024"
[r6]: https://arxiv.org/abs/2503.20215 "Qwen2.5-Omni — Qwen Team 2025"
[r7]: https://blog.google/technology/google-deepmind/gemini-2-5-native-audio "Gemini 2.5 Native Audio — Google DeepMind 2025"
[r8]: https://arxiv.org/abs/2405.09818 "Chameleon — Team Chameleon 2024"
[r9]: https://arxiv.org/abs/2403.05530 "Gemini 1.5 — Team Gemini 2024"

