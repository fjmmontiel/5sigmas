---
title: Escalar - de AlexNet a los modelos fundacionales
description: Cómo datos, cómputo y arquitecturas escalables cambiaron la IA desde 2012. AlexNet, Transformer, preentrenamiento, leyes de escala y el nacimiento de los modelos fundacionales.
date: 2026-03-30
keywords: "escalar IA, AlexNet, Transformer, leyes de escala, modelos fundacionales, preentrenamiento, GPT historia, historia deep learning, ImageNet, BERT"
---

# Capítulo 4: Escalar (≈ 2012 - 2024)

Los tres capítulos anteriores dejaron preparadas las piezas necesarias: representar el mundo con símbolos, mecanizar procedimientos y aprender a partir de datos. A partir de 2012, esas piezas dejaron de avanzar por separado. Datos, cómputo, optimización y arquitectura empezaron a reforzarse mutuamente a una escala inédita.

Este capítulo recorre ese cambio de régimen. No trata solo del auge del deep learning. Trata del momento en que el progreso empezó a depender cada vez más de una combinación sistemática de escala, reutilización y transferencia, hasta producir modelos que ya no resolvían una sola tarea, sino familias enteras de tareas.

---

## 1. 2012: cuando la escala dejó de ser un detalle

[AlexNet](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf) ganó ILSVRC 2012 con un resultado que cambió la percepción del campo: 15,3% de error top-5 frente al 26,2% del segundo clasificado. El sistema se entrenó sobre 1,2 millones de imágenes usando dos GPUs GTX 580 durante 6 días, combinando una red más profunda de lo habitual con ReLU, dropout, aumento de datos y una implementación eficiente en GPU.

Lo importante es entender bien qué demostró ese resultado. AlexNet no inventó de cero las redes convolucionales ni formuló por sí sola unas leyes de escala ya establecidas. Lo que sí mostró con claridad fue que, cuando profundidad, datos, regularización y cómputo alcanzan suficiente masa crítica, el rendimiento puede mejorar de una forma que ya no parece un simple refinamiento incremental.

La lección de 2012 tampoco fue que la arquitectura dejara de importar. Fue más bien que una arquitectura buena puede permanecer durante años por debajo de su potencial y despegar de pronto cuando el hardware y el volumen de datos dejan de ser el cuello de botella.

{{ include_html("snippets/from-cave-to-agi/04-shock-2012.html") }}

---

## 2. El Transformer y el preentrenamiento masivo

El siguiente gran giro llegó con [Attention Is All You Need](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf) en 2017. El Transformer no fue simplemente otra arquitectura para lenguaje. Reorganizó el problema alrededor de mecanismos de atención, eliminando la recurrencia del núcleo del modelo y haciendo el entrenamiento mucho más paralelizable.

A partir de ahí se abrieron dos trayectorias especialmente influyentes. Por un lado, [BERT](https://aclanthology.org/N19-1423.pdf) mostró la fuerza del preentrenamiento bidireccional y del fine-tuning posterior sobre tareas concretas. Por otro, [GPT-2](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) y después [GPT-3](https://proceedings.neurips.cc/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf) enseñaron que un modelo autoregresivo suficientemente grande podía transferirse a tareas nuevas directamente desde el contexto, primero de forma llamativa en zero-shot y después con capacidades mucho más sólidas de few-shot e in-context learning.

{{ include_html("snippets/from-cave-to-agi/04-transformer-reutilizacion.html") }}

Ese cambio alteró la lógica del progreso. Durante mucho tiempo, cada tarea importante exigía su propio modelo, su propio pipeline y sus propios datos anotados. Con el preentrenamiento a gran escala empezó a resultar más eficaz entrenar una base general y después adaptarla, afinarla o condicionarla para usos concretos.

La misma familia de ideas se extendió además fuera del texto. [Vision Transformer](https://arxiv.org/pdf/2010.11929) llevó el paradigma a visión. [CLIP](https://proceedings.mlr.press/v139/radford21a/radford21a.pdf) alineó imagen y lenguaje a gran escala. [DALL·E](https://proceedings.mlr.press/v139/ramesh21a/ramesh21a.pdf) y los [latent diffusion models](https://openaccess.thecvf.com/content/CVPR2022/papers/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.pdf) mostraron nuevas formas de generar imágenes a partir de lenguaje. Y sistemas multimodales posteriores, como [Gemini 1.5](https://storage.googleapis.com/deepmind-media/gemini/gemini_v1_5_report.pdf), reforzaron la idea de un modelo capaz de trabajar con texto, imagen, audio y vídeo dentro de un mismo sistema.

{{ include_html("snippets/from-cave-to-agi/04-escala-producto.html") }}

---

## 3. La escala se volvió metodología

La idea de que el rendimiento mejora de forma relativamente predecible al aumentar parámetros, datos y cómputo no nació con los LLMs, pero se volvió central con ellos. Trabajos como [Deep Learning Scaling is Predictable, Empirically](https://arxiv.org/abs/1712.00409), [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) y [Training Compute-Optimal Large Language Models](https://arxiv.org/pdf/2203.15556) fueron dando forma a una intuición cada vez más fuerte: en muchos regímenes, el error cae siguiendo relaciones de potencia estables, y el progreso depende tanto de cómo escalas como de qué escalas.

{{ include_html("snippets/from-cave-to-agi/04-leyes-escala.html") }}


Eso no significa que la escala lo explique todo. Significa que, una vez que una arquitectura y un objetivo de entrenamiento son suficientemente buenos, aumentar recursos deja de ser una cuestión secundaria y pasa a formar parte de la teoría práctica del sistema.

En este punto conviene introducir una cautela importante. La literatura sobre [capacidades emergentes](https://arxiv.org/pdf/2206.07682) ha sido influyente porque describe saltos bruscos de rendimiento en ciertas tareas cuando el modelo supera determinados tamaños. Pero trabajos posteriores, como [Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/pdf/2304.15004), sostienen que parte de esa brusquedad puede depender de la métrica elegida o del modo de evaluar. Lo más prudente, por tanto, no es afirmar que toda capacidad nueva emerge de forma misteriosa, sino reconocer que la escala ha traído capacidades nuevas o mucho más robustas mientras la interpretación fuerte de esa emergencia sigue abierta.

{{ include_html("snippets/from-cave-to-agi/04-emergencia-capacidades.html") }}

---

## 4. Modelos fundacionales: la misma base para muchas tareas

A partir de ahí aparece el marco de los [modelos fundacionales](https://crfm.stanford.edu/assets/report.pdf). La idea central no es solo que un modelo sea grande, sino que se entrene sobre datos amplios, generalmente mediante auto-supervisión a escala, y después pueda adaptarse a una gran variedad de tareas posteriores.

Este cambio tiene una consecuencia técnica y económica enorme. El mismo modelo base puede servir como infraestructura reutilizable para redactar, resumir, traducir, clasificar, extraer información, generar código, recuperar conocimiento y trabajar en varias modalidades con ajustes relativamente pequeños en comparación con entrenar un sistema nuevo para cada tarea.

Aquí está el giro profundo de este periodo. Durante décadas, la IA avanzó como una colección de sistemas especializados. Con los modelos fundacionales, el centro de gravedad se desplazó hacia bases generales preentrenadas que luego se adaptan, se alinean o se encadenan para usos concretos.

{{ include_html("snippets/from-cave-to-agi/04-preentrenamiento-finetuning.html") }}

---

## 5. Lo que este periodo dejó preparado

Al llegar a 2024, el campo ya había cambiado de forma estructural. La IA dejó de pensarse principalmente como un conjunto de soluciones aisladas y empezó a organizarse alrededor de modelos base cada vez más grandes, reutilizables y multimodales.

Ese cambio deja preparado el terreno de la siguiente etapa. La escala ya no se entiende solo como una cuestión de más parámetros o más datos, sino como la base sobre la que empiezan a aparecer problemas nuevos: memoria más eficaz, mejor uso de herramientas, búsqueda más activa y una relación más rica con el mundo fuera del texto.

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | [Krizhevsky, Sutskever & Hinton (2012) — *ImageNet Classification with Deep Convolutional Neural Networks*](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf) | AlexNet y el cambio de régimen en visión. |
| R2 | [Vaswani et al. (2017) — *Attention Is All You Need*](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf) | Introducción del Transformer. |
| R3 | [Devlin et al. (2019) — *BERT*](https://aclanthology.org/N19-1423.pdf) | Preentrenamiento bidireccional y fine-tuning. |
| R4 | [Radford et al. (2019) — *Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) | GPT-2 y transferencia zero-shot. |
| R5 | [Brown et al. (2020) — *Language Models are Few-Shot Learners*](https://proceedings.neurips.cc/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf) | GPT-3 e in-context learning a gran escala. |
| R6 | [Dosovitskiy et al. (2020) — *An Image is Worth 16x16 Words*](https://arxiv.org/pdf/2010.11929) | Vision Transformer. |
| R7 | [Radford et al. (2021) — *CLIP*](https://proceedings.mlr.press/v139/radford21a/radford21a.pdf) | Alineación de imagen y lenguaje. |
| R8 | [Ramesh et al. (2021) — *Zero-Shot Text-to-Image Generation*](https://proceedings.mlr.press/v139/ramesh21a/ramesh21a.pdf) | DALL·E y generación de imagen desde texto. |
| R9 | [Rombach et al. (2022) — *High-Resolution Image Synthesis with Latent Diffusion Models*](https://openaccess.thecvf.com/content/CVPR2022/papers/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.pdf) | Latent diffusion y generación eficiente de imágenes. |
| R10 | [Hestness et al. (2017) — *Deep Learning Scaling is Predictable, Empirically*](https://arxiv.org/abs/1712.00409) | Curvas de escala en deep learning. |
| R11 | [Kaplan et al. (2020) — *Scaling Laws for Neural Language Models*](https://arxiv.org/abs/2001.08361) | Leyes de escala para modelos de lenguaje. |
| R12 | [Hoffmann et al. (2022) — *Training Compute-Optimal Large Language Models*](https://arxiv.org/pdf/2203.15556) | Chinchilla y la corrección compute-optimal del escalado. |
| R13 | [Wei et al. (2022) — *Emergent Abilities of Large Language Models*](https://arxiv.org/pdf/2206.07682) | Formulación influyente del debate sobre emergencia. |
| R14 | [Schaeffer et al. (2023) — *Are Emergent Abilities of Large Language Models a Mirage?*](https://arxiv.org/pdf/2304.15004) | Crítica metodológica al concepto fuerte de emergencia. |
| R15 | [Bommasani et al. (2021) — *On the Opportunities and Risks of Foundation Models*](https://crfm.stanford.edu/assets/report.pdf) | Marco conceptual de los modelos fundacionales. |
| R16 | [Gemini Team (2024) — *Gemini 1.5 report*](https://storage.googleapis.com/deepmind-media/gemini/gemini_v1_5_report.pdf) | Multimodalidad y contexto de millones de tokens. |

</details>