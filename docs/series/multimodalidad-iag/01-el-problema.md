---
title: El problema real de la multimodalidad
description: "Qué significa integrar texto, imagen, audio y otras modalidades, y cómo ordenar percepción, alineamiento, razonamiento, generación y acción."
date: 2026-04-01
keywords: "multimodalidad IA, sistemas multimodales, LLM multimodal, IA texto imagen audio, percepción multimodal, IA generativa multimodal, GPT-4V, Gemini multimodal"
tags:
  - IA
  - GenAI
  - Multimodalidad
video: "01-el-problema.mp4"
video_duration: "PT1M15S"
---

# Capítulo 1 — El problema real: integrar modalidades distintas sin reducirlas demasiado pronto

Este artículo describe qué significa realmente la multimodalidad en IA: no solo que un modelo "vea" imágenes, sino el problema más amplio de integrar texto, imagen, audio, vídeo y señales continuas sin destruir lo que cada una aporta. Al terminarlo entenderás por qué el campo va mucho más allá de los modelos visión-lenguaje, qué diferencia hay entre traducir una modalidad a texto y mantenerla activa en el razonamiento, y cómo se ordenan las cinco capacidades (percepción, alineamiento, razonamiento, generación y acción) que definen hoy a un sistema verdaderamente multimodal. El artículo es accesible si tienes algo de base en modelos de lenguaje, aunque no requiere conocimientos previos en visión por computador ni en procesamiento de audio.

La multimodalidad suele explicarse como si fuera el momento en que un modelo de lenguaje dejó de trabajar solo con texto y empezó a recibir imágenes. Esto no es falso, pero sí demasiado estrecho para describir el campo tal como existe hoy. 

En 2026 ya convivimos con modelos que representan texto, imagen, vídeo, audio y documentos en un mismo espacio de embedding, con sistemas que mantienen diálogo hablado de forma nativa, con arquitecturas que procesan secuencias intercaladas de texto, imagen y vídeo y con modelos que introducen señales continuas del mundo físico dentro del proceso de inferencia. 

La multimodalidad no es solo qué pasa cuando un LLM "ve" una imagen, sino cómo se construyen sistemas capaces de trabajar con señales heterogéneas sin obligarlas a perder su estructura demasiado pronto.

!!! abstract "Idea clave"
    El problema central de la multimodalidad no es juntar modalidades, sino decidir cuándo y cómo integrarlas sin destruir lo que cada una aporta por separado.

Esta diferencia importa porque no todas las soluciones hacen el mismo trabajo. 

Hay sistemas que convierten una imagen en una descripción textual y delegan a partir de ahí todo el razonamiento en el modelo de lenguaje. Hay otros que mantienen parte de la evidencia visual, sonora o documental activa dentro del propio proceso de representación y decisión. 

Ambos enfoques pueden ser útiles y pueden resolver tareas reales, pero no resuelven exactamente el mismo problema. El primero reduce la modalidad cuanto antes para aprovechar un canal que ya dominamos bien, mientras que el segundo intenta conservar más tiempo aquello que el texto no captura del todo bien: posición, sincronía temporal, matiz prosódico, estructura de documento, señal continua o contexto perceptivo. Ahí empieza de verdad la multimodalidad como problema técnico, no como truco de interfaz.

---

## 1. Una modalidad no es solo un tipo de input

Llamamos modalidad a una forma distinta de codificar información sobre el mundo. El texto es una secuencia discreta de símbolos, la imagen tiene estructura espacial, el audio añade continuidad temporal, tono, ritmo e información no verbal, y el vídeo combina visión, audio y tiempo. Un documento no es simplemente una imagen con letras, porque también contiene diseño gráfico, tablas, jerarquía visual, fórmulas, regiones y relaciones espaciales entre bloques.

En robótica aparece además una familia de señales que no encajan bien en la intuición clásica de "contenido": estado del entorno, profundidad, observaciones parciales o telemetría continua. 

ImageBind lo mostró de forma explícita al unir imágenes, texto, audio, profundidad, mapa térmico e IMU (datos inerciales) en un único espacio de representación [ImageBind][r4], mientras que PaLM-E llevó esa lógica a observaciones visuales y estado continuo para tareas de planificación y manipulación [PaLM-E][r5]. Gemini Embedding 2 incorpora ya texto, imágenes, vídeo, audio y documentos como primitiva nativa de producto.

Conviene insistir en esto porque una parte importante de la confusión nace aquí. Cuando se habla de multimodalidad, muchas veces se habla en realidad de visión-lenguaje. 

Esa subárea ha sido central en los últimos años y explica una fracción enorme del progreso visible, desde CLIP hasta Flamingo o BLIP-2, pero no agota el campo. 

Un sistema capaz de comprender una radiografía con instrucciones textuales, indexar PDFs complejos, mantener una conversación oral con herramientas, recuperar un vídeo a partir de una imagen de ejemplo o planificar una acción robótica usando percepción y lenguaje pertenece a la misma familia general, aunque cada una de esas tareas fuerce una forma distinta de representación y de evaluación. [OCRBench v2][r7] y [MMAU][r8] son útiles precisamente porque obligan a reconocer que documento y audio no son simplemente "casos especiales" de texto+imagen, sino dominios con problemas propios.

---

## 2. El problema no es añadir modalidades, sino cruzarlas sin destruirlas

Un sistema puede aceptar una imagen y, aun así, seguir siendo profundamente texto-céntrico: basta con que convierta la imagen en una leyenda y haga todo lo demás sobre esa leyenda. 

Si la tarea es obtener un resumen grueso del contenido visual, el coste y la simplicidad juegan a favor de esa estrategia. El problema aparece cuando lo importante no es una descripción, sino por ejemplo: dónde está algún objeto, qué parte exacta cambia entre dos imágenes, qué texto manuscrito aparece en una esquina, qué ocurre antes y después en un audio, o qué matiz del habla altera el sentido de una frase. 

En ese punto, reducir demasiado pronto la señal original deja de ser una solución elegante y pasa a ser una fuente de error.

Por eso es útil distinguir tres niveles. 

El primero es **traducción**: convertir una modalidad en otra, normalmente en texto. 

El segundo es **alineamiento**: aprender que dos señales distintas se refieren al mismo contenido, aunque no tengan la misma forma. 

El tercero es **copresencia operativa**: permitir que varias modalidades sigan interviniendo en la inferencia o en la generación sin quedar reducidas de inmediato a una sola. 

CLIP ayudó a consolidar el segundo nivel aprendiendo correspondencias robustas entre imagen y texto desde supervisión natural [CLIP][r1], e ImageBind mostró que esa lógica podía extenderse mucho más allá del par clásico [ImageBind][r4]. [Flamingo][r2] y [BLIP-2][r3] enseñaron a su vez que el alineamiento también podía articularse como puente entre módulos especializados, mientras que Gemini 2.5 y [Qwen2.5-Omni][r6] llevan el problema a un régimen temporal donde la cuestión ya no es solo alinear, sino responder, escuchar y generar bajo restricciones de latencia real.

---

## 3. El espacio compartido importa, pero no es la única arquitectura posible

La versión más difundida de cualquier introducción a la multimodalidad trata el espacio de representación compartida casi como la esencia de toda el área. 

Ahí hay una intuición válida: cuando dos modalidades caen en una geometría semántica común, se vuelve mucho más fácil hacer recuperación cruzada, clasificación zero-shot o comparación entre señales diferentes.

Pero sería un error convertir esa intuición en una definición universal. Flamingo no se entiende bien como "todo está en el mismo espacio y ya está", sino como un modelo que acopla modelos preentrenados y maneja secuencias arbitrariamente intercaladas de texto con imágenes o vídeos. 

BLIP-2 tampoco se reduce a una sola nube geométrica, porque introduce un Querying Transformer ligero para hacer de interfaz entre encoder visual y LLM. 

PaLM-E va por otro camino al inyectar observaciones visuales y estado continuo en un modelo lingüístico para tareas corporizadas. 

Qwen2.5-Omni empuja hacia un modelo de extremo a extremo con comprensión y generación multimodal en streaming. El espacio compartido es una estrategia muy poderosa, pero no la única ni la definición suficiente del campo.

La formulación más precisa es otra: un sistema es multimodal cuando integra información de varias modalidades dentro del proceso de representación, inferencia, generación o acción. 

Eso puede lograrse con embeddings conjuntos, con conectores entre módulos, con cross-attention, con secuencias intercaladas, con modelos más unificados o con combinaciones de todo lo anterior.
---

## 4. Qué capacidades definen hoy a un sistema multimodal

La forma más limpia de ordenar el problema es separar cinco capacidades.

**Percibir.** El sistema tiene que convertir señales heterogéneas en representaciones útiles: leer una página, reconocer el contenido de una imagen, seguir un fragmento de audio, distinguir voces o entender una secuencia de vídeo.

**Alinear.** No basta con percibir dos señales por separado, porque hay que aprender cuándo hablan de lo mismo. Ese fue el corazón de CLIP y sigue siendo central en embeddings y recuperación. Gemini Embedding 2 representa bien esta capa porque unifica texto, imágenes, vídeo, audio y documentos en un espacio de embedding usable para búsqueda, clasificación y clustering multimodal.

**Razonar.** Una vez alineadas las señales, el sistema tiene que operar sobre ellas: comparar, verificar, localizar, resumir, responder preguntas o seguir dependencias temporales. 

**Generar.** Un sistema multimodal no siempre termina en texto. Puede producir voz, imagen, quizá vídeo, quizá una representación estructurada, quizá una combinación de varias salidas. Gemini 2.5 Native Audio y Qwen2.5-Omni son especialmente útiles para explicar esta capa porque desplazan el centro del relato desde "entender una imagen" hacia mantener una conversación y producir respuesta multimodal en tiempo real.

**Actuar.** En cuanto el sistema usa herramientas o entra en un entorno físico, la multimodalidad deja de ser solo una cuestión de comprensión y pasa a ser una cuestión de decisión situada. PaLM-E es importante aquí porque une lenguaje, observación y estado continuo en tareas de robótica.

Los modelos de acción visual-lingüística (VLA) como RT-2 van un paso más allá: en lugar de separar la percepción del comando de acción, el modelo convierte directamente observaciones visuales e instrucciones textuales en comandos motores ejecutables, de forma que el mismo proceso de razonamiento que genera texto puede generar acción física [RT-2][r9].

{{ include_html("snippets/multimodalidad-iag/01-vla-pipeline.html") }}

---

## 5. Por qué sigue siendo difícil

La primera dificultad es de **estructura**. Texto, imagen, audio, vídeo y documentos no comparten de forma natural la misma granularidad: una palabra, un parche visual, un tramo de audio o una región de documento no son unidades equivalentes. El modelo tiene que aprender correspondencias que no vienen dadas de antemano, y muchas veces las aprende de manera incompleta o sesgada por los datos disponibles.

La segunda dificultad es de **temporalidad**. En audio y vídeo, el orden no es un detalle sino que forma parte del significado. Un sistema que oye una risa, una interrupción o un cambio de tono no está procesando simplemente "más tokens", sino sincronía, ritmo y contexto conversacional.

La tercera dificultad es de **grounding**. Un sistema puede producir una respuesta verbalmente impecable sin que esa respuesta esté bien sustentada en la señal perceptiva. Este problema aparece en visión, en documentos y también en audio: una respuesta puede sonar razonable y, sin embargo, no estar fundamentada. Ese desajuste es una de las razones por las que la evaluación multimodal no puede apoyarse solo en exactitud final o en fluidez de la salida. 

La cuarta dificultad es de **asimetría**. La expresión "de cualquier modalidad de entrada a cualquiera de salida" marca bien la aspiración del campo, pero no describe de forma uniforme lo que hacen los sistemas reales. Algunos son muy fuertes como embeddings y recuperación, pero no generan. Otros generan voz, pero no imagen. Otros comprenden vídeo, pero siguen contestando sobre todo en texto. Otros mezclan percepción y acción, pero no son universales fuera de su dominio. La dirección es any-to-any, pero el estado real del campo sigue siendo desigual y arquitectónicamente heterogéneo. 

La quinta dificultad es de **colapso modal**. En sistemas entrenados con distribuciones muy desbalanceadas entre modalidades, el modelo tiende a apoyarse casi exclusivamente en la modalidad más representada, con independencia de cuál es la más informativa para la tarea concreta.

{{ include_html("snippets/multimodalidad-iag/01-colapso-modal.html") }}

---

## 6. Qué deja preparado este capítulo

A partir de aquí ya no conviene escribir la serie como si multimodalidad fuera el nombre elegante de los VLMs. Esa parte del campo sigue siendo importantísima, pero ya no basta para ordenar el conjunto. 

Lo que sigue en la serie responde a una pregunta más general: cómo se alinean modalidades distintas, qué arquitecturas conservan mejor la evidencia, cómo se evalúan sin autoengaño y qué riesgos aparecen cuando percepción, generación y acción quedan acopladas en el mismo sistema.

{{ include_html("snippets/multimodalidad-iag/01-espacio-comun.html") }}

---

!!! tip "Siguiente capítulo"
    [Capítulo 2 — Alineamiento →](./02-alineamiento.md) — Cómo se aprende que dos señales distintas hablan del mismo contenido, qué cambia cuando el alineamiento va más allá del par imagen-texto, y por qué la calidad del dato determina la robustez de las representaciones.

## 7. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Radford et al. (2021)** — *Learning Transferable Visual Models From Natural Language Supervision* ([arXiv][r1]) | CLIP: aprendizaje de representaciones compartidas texto-imagen a escala. |
| R2 | **Alayrac et al. (2022)** — *Flamingo: a Visual Language Model for Few-Shot Learning* ([arXiv][r2]) | Flamingo: modelo que combina visual encoder con LLM mediante cross-attention. |
| R3 | **Li et al. (2023)** — *BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models* ([arXiv][r3]) | Arquitectura de conexión entre encoders visuales y modelos de lenguaje. |
| R4 | **Girdhar et al. (2023)** — *ImageBind: One Embedding Space To Bind Them All* ([CVPR][r4]) | Espacio de embedding conjunto sobre seis modalidades usando solo pares con imagen. |
| R5 | **Driess et al. (2023)** — *PaLM-E: An Embodied Multimodal Language Model* ([arXiv][r5]) | Inyección de observaciones visuales y estado continuo en un LLM para planificación corporal. |
| R6 | **Qwen Team (2025)** — *Qwen2.5-Omni Technical Report* ([arXiv][r6]) | Modelo omni con comprensión y generación multimodal en streaming. |
| R7 | **Liu et al. (2024)** — *OCRBench v2* ([arXiv][r7]) | Benchmark de evaluación de LMMs en localización de texto, manuscrito y razonamiento documental. |
| R8 | **Sakshi et al. (2024)** — *MMAU: A Massive Multi-Task Audio Understanding and Reasoning Benchmark* ([Adobe Research][r8]) | Benchmark de comprensión y razonamiento de audio con habla, sonidos no verbales y música. |
| R9 | **Brohan et al. (2023)** — *RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control* ([arXiv][r9]) | Modelos VLA que convierten observaciones visuales e instrucciones textuales en comandos motores ejecutables. |

</details>

[r1]: https://arxiv.org/abs/2103.00020 "CLIP — Radford et al. 2021"
[r2]: https://arxiv.org/abs/2204.14198 "Flamingo — Alayrac et al. 2022"
[r3]: https://arxiv.org/abs/2301.12597 "BLIP-2 — Li et al. 2023"
[r4]: https://openaccess.thecvf.com/content/CVPR2023/html/Girdhar_ImageBind_One_Embedding_Space_To_Bind_Them_All_CVPR_2023_paper "ImageBind — Girdhar et al. CVPR 2023"
[r5]: https://arxiv.org/abs/2303.03378 "PaLM-E — Driess et al. 2023"
[r6]: https://arxiv.org/abs/2503.20215 "Qwen2.5-Omni — Qwen Team 2025"
[r7]: https://arxiv.org/abs/2501.00321 "OCRBench v2 — Liu et al. 2024"
[r8]: https://research.adobe.com/publication/mmau-a-massive-multi-task-audio-understanding-and-reasoning-benchmark/ "MMAU — Sakshi et al. 2024"
[r9]: https://arxiv.org/abs/2307.15818 "RT-2 — Brohan et al. 2023"

---

## Preguntas frecuentes

**¿Por qué el texto y las imágenes no se pueden procesar con la misma estructura sin conversión previa?**
El lenguaje es una secuencia discreta de símbolos con estructura semántica directa. Las imágenes son señales continuas de alta dimensionalidad con estructura espacial, sin unidades naturales equivalentes a las palabras. Para que un sistema opere con ambas, tiene que aprender correspondencias que no vienen dadas de antemano, y muchas veces las aprende de forma incompleta o sesgada.

**¿Cuál es la diferencia entre reducir una modalidad a texto y mantenerla activa en el razonamiento?**
Reducir una imagen a su descripción textual es útil cuando lo que importa es el contenido semántico grueso. El problema aparece cuando lo importante es dónde está algo, qué cambia entre dos imágenes, o qué matiz del habla altera el sentido de una frase: en esos casos, reducir demasiado pronto la señal original deja de ser elegante y pasa a ser una fuente de error. Mantener la señal activa en el razonamiento es precisamente la distinción entre traducción y copresencia operativa.

**¿Qué significa que un modelo tenga problemas de grounding y qué consecuencias tiene?**
El grounding es la capacidad de sustentar una respuesta en la evidencia real de la señal perceptiva y no solo en inferencias estadísticas sobre qué respuesta es probable. Cuando falla, el modelo puede producir una respuesta verbalmente correcta que no está fundamentada en la imagen o el audio que recibió: suena razonable pero contradice la evidencia física.

**¿Por qué un sistema puede parecer multimodal y en la práctica apoyarse casi solo en el texto?**
Es el efecto del colapso modal: cuando los datos de entrenamiento están muy desbalanceados entre modalidades, el modelo tiende a apoyarse casi exclusivamente en la modalidad más representada, aunque otra sea más informativa para la tarea concreta. El texto tiene mucha mayor densidad semántica por byte que una imagen ruidosa, así que en sistemas mal equilibrados el modelo aprende a responder desde sesgos lingüísticos previos y a ignorar la información visual.
