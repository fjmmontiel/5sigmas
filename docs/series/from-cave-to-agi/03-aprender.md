---
title: Aprender — de las reglas a los datos
description: "Cómo la IA pasó de escribir el conocimiento a mano a ajustarlo con datos: de la IA simbólica y los sistemas expertos al aprendizaje estadístico y el renacimiento neuronal que desembocó en AlexNet en 2012."
date: 2026-03-27
keywords: "historia machine learning, sistemas expertos, MYCIN, aprendizaje automático historia, backpropagation, AlexNet, inviernos ia, ia simbólica, perceptrón, deep learning historia"
tags:
  - IA
  - Historia
  - LLMs
---

# Capítulo 3 — Aprender (≈ 1956 – 2012)

La Conferencia de Dartmouth no inauguró una tecnología acabada, sino un programa de investigación. La hipótesis era ambiciosa: si el razonamiento humano podía describirse con suficiente precisión, una máquina también podría ejecutarlo. Las décadas siguientes demostraron que esa idea no era absurda, pero sí mucho más difícil de lo que parecía al principio.

Este capítulo recorre el momento en que la IA dejó de apoyarse sobre todo en reglas escritas a mano y empezó a girar, poco a poco, hacia datos, estadística y optimización. El cambio no fue limpio ni instantáneo. Durante mucho tiempo convivieron enfoques distintos, con éxitos parciales y límites muy diferentes. Aun así, la dirección general sí acabó siendo nítida: el campo fue dejando de preguntarse cómo enumerar explícitamente el razonamiento correcto y empezó a interesarse por cómo podía una máquina extraer regularidades útiles a partir de ejemplos.

---

## 1. La era de las reglas: cuando la inteligencia se escribía a mano

### Los primeros sistemas simbólicos

Los primeros programas de IA trabajaban con una intuición poderosa: si el razonamiento puede expresarse como una secuencia de pasos formales, quizá baste con representar esos pasos y dejar que la máquina los recorra. En esa línea aparecieron sistemas como [Logic Theorist](https://bitsavers.org/pdf/rand/ipl/P-868_The_Logic_Theory_Machine_Jul56.pdf), presentado en 1956, y [GPS, el General Problem Solver](https://iiif.library.cmu.edu/file/Simon_box00064_fld04907_bdl0001_doc0001/Simon_box00064_fld04907_bdl0001_doc0001.pdf), descrito a finales de los años 50 y comienzos de los 60. Ambos mostraban algo importante: una máquina podía buscar, combinar reglas y producir cadenas de inferencia no triviales.

El problema era que estos sistemas rendían mejor allí donde el mundo ya estaba muy formalizado. Teoremas, juegos o rompecabezas admiten estados, reglas y metas relativamente limpios. El mundo real, casi nunca.

### Sistemas expertos: la madurez del paradigma simbólico

Ese enfoque alcanzó su forma más sólida con los sistemas expertos. En vez de aspirar a inteligencia general, intentaban capturar conocimiento de un dominio estrecho mediante reglas, hechos y heurísticas construidas junto a especialistas humanos.

[MYCIN](https://www.shortliffe.net/Buchanan-Shortliffe-1984/Chapter-30.pdf), desarrollado en Stanford en los años 70, se convirtió en uno de los casos más conocidos. Daba recomendaciones terapéuticas para infecciones bacterianas graves y mostró que un sistema basado en reglas podía rendir a gran nivel dentro de un dominio muy delimitado. [XCON, también llamado R1](https://cdn.aaai.org/AAAI/1980/AAAI80-076.pdf), automatizó la configuración de sistemas VAX en Digital Equipment y se convirtió en uno de los ejemplos industriales más citados del periodo.

El interés de estos sistemas no está solo en que funcionaran, sino en por qué funcionaban. Lo hacían bien cuando el dominio era relativamente estable, cuando el vocabulario de decisiones podía acotarse y cuando era viable convertir conocimiento experto en reglas mantenibles.

{{ include_html("snippets/from-cave-to-agi/03-simbolica.html") }}


### Por qué ese camino acabó tocando techo

El límite apareció cuando el conocimiento dejó de ser pequeño, estable y fácil de formalizar. Mantener un sistema experto no consistía solo en escribir reglas una vez, sino en revisarlas, ampliarlas, resolver conflictos entre ellas y absorber excepciones. A medida que el dominio se volvía más complejo, también lo hacía la base de conocimiento.

Ahí apareció uno de los grandes cuellos de botella de la IA simbólica: la adquisición de conocimiento. Extraer conocimiento experto y traducirlo a una base formal era costoso, lento y frágil. El problema no era únicamente computacional. También era humano y organizativo.

Los llamados inviernos de la IA tienen bastante que ver con este choque entre promesa y realidad. El primero estuvo ligado a expectativas desmesuradas, barreras de complejidad y críticas institucionales como el [informe ALPAC de 1966 y el informe Lighthill de 1973](https://publications.jrc.ec.europa.eu/repository/bitstream/JRC120469/jrc120469_historical_evolution_of_ai-v1.1.pdf). El segundo, a finales de los 80 y comienzos de los 90, suele asociarse al desgaste del paradigma experto, al cuello de botella de adquisición de conocimiento y al colapso del mercado de máquinas Lisp, que había servido de soporte a buena parte de ese ecosistema ([JRC AI Watch](https://publications.jrc.ec.europa.eu/repository/bitstream/JRC120469/jrc120469_historical_evolution_of_ai-v1.1.pdf)).

{{ include_html("snippets/from-cave-to-agi/03-inviernos-ia.html") }}

---

## 2. El giro estadístico: aprender a partir de ejemplos

El cambio de paradigma no consistió solo en usar más datos, sino en desplazar la pregunta central. En vez de preguntarse qué reglas había que escribir para resolver una tarea, el campo empezó a preguntarse qué regularidades podía inferir un modelo si se le mostraban suficientes ejemplos.

### Generalizar sin memorizar

Aprender es captar una regularidad que siga funcionando fuera del conjunto de entrenamiento, no simplemente reproducirlo. Ese problema, la generalización, se volvió central con el auge del aprendizaje estadístico.

La [teoría del aprendizaje estadístico de Vapnik](https://link.springer.com/book/10.1007/978-1-4757-3264-1) ofreció un lenguaje para pensar capacidad, riesgo empírico y control del sobreajuste. En paralelo, [Valiant](https://people.mpi-inf.mpg.de/~mehlhorn/SeminarEvolvability/ValiantLearnable.pdf) formalizó la idea de aprender como adquisición de conocimiento en ausencia de programación explícita. El aprendizaje automático empezó a consolidarse así no como una colección de trucos, sino como una disciplina con fundamentos sobre qué puede aprenderse, con cuántos datos y bajo qué condiciones.

La probabilidad también dejó de ser un accesorio y pasó a ocupar una posición central. En muchos dominios, un sistema no necesita solo decidir. Necesita además representar incertidumbre, combinar evidencia incompleta y actualizar sus creencias cuando llegan nuevos datos.

### Optimizar parámetros en lugar de escribir reglas

Si un modelo aprende de ejemplos, entonces hay que ajustar sus parámetros para reducir error. Hoy esa idea parece evidente, pero reorganizó el campo entero. El aprendizaje empezó a formularse como un problema de optimización.

El antecedente clásico del enfoque estocástico aparece ya en [Robbins y Monro (1951)](https://www.columbia.edu/~ww2040/8100F16/RM51.pdf). Más adelante, el descenso de gradiente estocástico permitió entrenar modelos sobre conjuntos de datos grandes sin recalcular el error sobre todos los ejemplos en cada paso. A eso se añadieron técnicas de regularización y validación que ayudaban a que el modelo no solo ajustara bien el pasado, sino que mantuviera capacidad de generalizar.

En esta fase, el campo no avanzó solo con redes neuronales. También crecieron árboles de decisión, métodos kernel, modelos probabilísticos y técnicas de ensemble. El giro de fondo todavía no era “todo es deep learning”. Era, más bien, que muchas tareas empezaban a describirse mejor como problemas de ajuste estadístico que como una lista de reglas escritas a mano.

### La representación también se aprende

La diferencia decisiva entre muchos métodos clásicos y las redes profundas aparece aquí. En bastantes enfoques anteriores, un humano debía diseñar a mano gran parte de las características relevantes. El modelo aprendía a partir de esos rasgos, pero no aprendía bien la propia representación.

Las redes neuronales multicapa prometían algo más ambicioso: aprender representaciones intermedias útiles directamente desde los datos. Esa idea existía desde mucho antes, aunque durante bastante tiempo costó convertirla en una práctica robusta.

{{ include_html("snippets/from-cave-to-agi/03-bucle-entrenamiento.html") }}

---

## 3. El perceptrón, su crítica y la recuperación de las redes

### El primer entusiasmo neuronal

El perceptrón de Rosenblatt apareció primero como propuesta en 1957 y quedó formalizado con más madurez en su artículo de 1958, [*The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain*](https://www.ovid.com/00006832-195811000-00007). Fue una de las primeras formulaciones influyentes de una neurona artificial entrenable.

La promesa era potente: una máquina podía ajustar pesos a partir de ejemplos y aprender una frontera de decisión en vez de recibirla completamente escrita. Eso abría una vía distinta a la simbólica. En lugar de representar de forma explícita cadenas de inferencia, el sistema ajustaba parámetros para discriminar patrones.

### La crítica de Minsky y Papert

La crítica clásica llegó con [*Perceptrons* de Minsky y Papert](https://mitpress.mit.edu/9780262630221/perceptrons/) en 1969. Su análisis mostraba límites importantes de los perceptrones de una sola capa y usó como caso central la función XOR (OR exclusivo): una operación que devuelve 1 solo cuando las dos entradas son distintas y 0 cuando son iguales. Es la función booleana más simple que un perceptrón de una capa no puede aprender, porque sus cuatro casos posibles quedan distribuidos en las esquinas de un cuadrado de manera que ninguna línea recta puede separarlos en dos grupos correctos.

El problema no fue que el análisis fuera falso. El problema fue que, durante años, se interpretó como una descalificación práctica mucho más amplia de lo que realmente demostraba. Con el tiempo quedó claro que una red con capas ocultas podía representar funciones fuera del alcance del perceptrón simple. La dificultad no era solo expresiva. También era una cuestión de entrenamiento.

### Backpropagation y redes multicapa

Ese obstáculo empezó a romperse cuando el entrenamiento de redes profundas dejó de ser una intuición vaga y pasó a tener una receta operativa convincente. El paper de [Rumelhart, Hinton y Williams de 1986](https://gwern.net/doc/ai/nn/1986-rumelhart-2.pdf) convirtió la retropropagación del error en el procedimiento emblemático para ajustar redes multicapa. La idea era propagar el error desde la salida hacia atrás para estimar cómo debía modificarse cada peso.

El principio tenía antecedentes anteriores, pero 1986 fue el punto de inflexión que lo volvió central para la comunidad neuronal ([historia del backprop](https://people.idsia.ch/~juergen/who-invented-backpropagation.html)). A partir de ahí, las redes dejaron de ser solo una promesa biológicamente inspirada y pasaron a ser una familia de modelos entrenables con una técnica general.

{{ include_html("snippets/from-cave-to-agi/03-problema-xor.html") }}

---

## 4. NLP antes de los transformers

El procesamiento del lenguaje natural siguió durante mucho tiempo una trayectoria distinta de la que más tarde impondrían los transformers. Antes de los grandes modelos neuronales, el campo estuvo dominado por enfoques estadísticos y secuenciales.

Los [modelos de n-gramas](https://web.stanford.edu/~jurafsky/slp3/3.pdf), cuya genealogía arranca en parte de las ideas de Shannon sobre secuencias, trataban de estimar la probabilidad de una palabra a partir de unas pocas palabras anteriores. Eran simples, eficaces y muy útiles, pero tenían una limitación evidente: su memoria efectiva era corta.

Los [modelos ocultos de Markov](https://www.cs.ubc.ca/~murphyk/Bayes/rabiner.pdf) dominaron durante años tareas como reconocimiento de voz y etiquetado secuencial. Más tarde, los [campos aleatorios condicionales](https://daiwk.github.io/assets/Conditional%20random%20fields%20Probabilistic%20models%20for%20segmenting%20and%20labeling%20sequence%20data.pdf) ofrecieron una alternativa potente para segmentar y etiquetar secuencias relajando ciertas restricciones fuertes de los HMM.

Todos estos enfoques fueron valiosos, pero compartían una limitación de fondo: trabajaban bien con correlaciones locales y estructuras probabilísticas manejables, pero no aprendían representaciones contextuales profundas del lenguaje. El contexto largo, la ambigüedad semántica y la composición abierta seguían resistiéndose.

{{ include_html("snippets/from-cave-to-agi/03-nlp-pre-transformer.html") }}

---

## 5. El renacimiento neuronal: qué cambió antes de 2012

El resurgir del aprendizaje profundo no puede explicarse por una sola causa. Fue la convergencia de varios cambios que durante décadas habían estado incompletos.

### Más datos, más cómputo, mejores referencias compartidas

Primero llegó la escala. La digitalización masiva de texto, imagen, audio y actividad en línea produjo volúmenes de datos que los enfoques anteriores rara vez habían podido aprovechar. En visión, [ImageNet](https://image-net.org/static_files/papers/imagenet_cvpr09.pdf) convirtió esa escala en una infraestructura concreta para investigación comparativa.

Después llegó el hardware adecuado. Las GPUs, diseñadas para computación paralela intensiva, encajaban muy bien con el álgebra lineal del entrenamiento neuronal. El cambio fue operativo: ciertos modelos que durante años habían parecido interesantes pero impracticables empezaron a ser entrenables en tiempos razonables.

También hicieron falta referencias compartidas para medir progreso. Sin benchmarks comunes, cada grupo puede parecer bueno en su propio problema. Con benchmarks, el progreso se vuelve visible, comparable y acumulativo.

### El preludio inmediato de la explosión

Antes de AlexNet hubo un prólogo importante. Trabajos como [*Reducing the Dimensionality of Data with Neural Networks*](https://www.cs.toronto.edu/~hinton/absps/science.pdf) en 2006 y [*Greedy Layer-Wise Training of Deep Networks*](https://proceedings.neurips.cc/paper/3048-greedy-layer-wise-training-of-deep-networks.pdf) en 2007 ayudaron a reabrir el problema de entrenar redes profundas cuando todavía no era evidente que pudieran escalar bien con inicialización directa.

Ese periodo no resolvió todo, pero cambió el clima intelectual del campo. Las redes profundas dejaban de parecer una curiosidad histórica y empezaban a recuperar credibilidad empírica.

### 2012 como umbral

El cierre natural de este capítulo está en 2012. [AlexNet](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf) entrenó una red profunda sobre 1,2 millones de imágenes del reto ImageNet, usando dos GPUs GTX 580 durante 5-6 días y varios elementos de diseño que ya apuntaban a la nueva fase.

El salto fue lo bastante grande como para cambiar la dirección del campo. No inaugura por sí solo toda la era actual, pero sí marca el umbral a partir del cual el aprendizaje profundo dejó de ser una línea prometedora entre varias y pasó a convertirse en el eje dominante del progreso en visión y, poco después, en voz y lenguaje.

---

## 6. Lo que este periodo dejó preparado

Al llegar a 2012, la IA había cambiado de forma profunda. No había abandonado del todo las reglas ni la lógica, pero ya no las trataba como el camino principal para construir sistemas competentes a gran escala. El centro de gravedad se había desplazado hacia modelos que aprenden a partir de datos, ajustan parámetros y mejoran a medida que crecen los ejemplos, el cómputo y la calidad de las representaciones.

Ese desplazamiento deja preparado el terreno del siguiente capítulo, donde la historia ya no gira tanto sobre si una máquina puede aprender de los datos, sino sobre lo que ocurre cuando ese aprendizaje encuentra suficiente escala.

!!! tip "Siguiente capítulo"
    [Capítulo 4 — Escalar →](./04-escalar.md) — AlexNet, el Transformer y las leyes de escala: qué pasó cuando el aprendizaje encontró datos masivos, GPUs y arquitecturas nuevas.

---

## 7. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | [Newell & Simon (1956) — *The Logic Theory Machine*](https://bitsavers.org/pdf/rand/ipl/P-868_The_Logic_Theory_Machine_Jul56.pdf) | Primer gran ejemplo de razonamiento simbólico automatizado. |
| R2 | [Newell, Shaw & Simon (1959-1961) — *GPS, A Program that Simulates Human Thought*](https://iiif.library.cmu.edu/file/Simon_box00064_fld04907_bdl0001_doc0001/Simon_box00064_fld04907_bdl0001_doc0001.pdf) | Programa emblemático del enfoque de búsqueda heurística. |
| R3 | [McDermott (1980) — *R1: An Expert in the Computer Systems Domain*](https://cdn.aaai.org/AAAI/1980/AAAI80-076.pdf) | Caso fundacional de XCON/R1 en configuración de sistemas VAX. |
| R4 | [Buchanan & Shortliffe (1984) — evaluación de MYCIN](https://www.shortliffe.net/Buchanan-Shortliffe-1984/Chapter-30.pdf) | Rendimiento, desacuerdo entre expertos y límites de evaluación en sistemas expertos. |
| R5 | [JRC AI Watch (2020) — *Historical Evolution of Artificial Intelligence*](https://publications.jrc.ec.europa.eu/repository/bitstream/JRC120469/jrc120469_historical_evolution_of_ai-v1.1.pdf) | Marco histórico de inviernos de la IA, auge simbólico y transición a ML. |
| R6 | [Vapnik — *The Nature of Statistical Learning Theory*](https://link.springer.com/book/10.1007/978-1-4757-3264-1) | Fundamentos de generalización y aprendizaje estadístico. |
| R7 | [Valiant (1984) — *A Theory of the Learnable*](https://people.mpi-inf.mpg.de/~mehlhorn/SeminarEvolvability/ValiantLearnable.pdf) | Formalización del aprendizaje sin programación explícita. |
| R8 | [Robbins & Monro (1951) — *A Stochastic Approximation Method*](https://www.columbia.edu/~ww2040/8100F16/RM51.pdf) | Antecedente clásico del aprendizaje por actualización estocástica. |
| R9 | [Rosenblatt (1958) — *The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain*](https://www.ovid.com/00006832-195811000-00007) | Formulación clásica del perceptrón. |
| R10 | [Minsky & Papert (1969) — *Perceptrons*](https://mitpress.mit.edu/9780262630221/perceptrons/) | Análisis clásico de los límites del perceptrón de una capa. |
| R11 | [Rumelhart, Hinton & Williams (1986) — *Learning representations by back-propagating errors*](https://gwern.net/doc/ai/nn/1986-rumelhart-2.pdf) | Paper canónico de backpropagation en redes multicapa. |
| R12 | [Schmidhuber — historia de backprop](https://people.idsia.ch/~juergen/who-invented-backpropagation.html) | Resumen histórico de antecedentes previos a 1986. |
| R13 | [Jurafsky & Martin — capítulo sobre n-gramas](https://web.stanford.edu/~jurafsky/slp3/3.pdf) | Marco clásico para modelos de lenguaje previos a transformers. |
| R14 | [Rabiner (1989) — *A Tutorial on Hidden Markov Models*](https://www.cs.ubc.ca/~murphyk/Bayes/rabiner.pdf) | Referencia clásica sobre HMM en secuencias y voz. |
| R15 | [Lafferty, McCallum & Pereira (2001) — *Conditional Random Fields*](https://daiwk.github.io/assets/Conditional%20random%20fields%20Probabilistic%20models%20for%20segmenting%20and%20labeling%20sequence%20data.pdf) | Introducción de CRF para secuencias etiquetadas. |
| R16 | [Deng et al. (2009) — *ImageNet: A Large-Scale Hierarchical Image Database*](https://image-net.org/static_files/papers/imagenet_cvpr09.pdf) | Dataset y benchmark clave en visión. |
| R17 | [Hinton & Salakhutdinov (2006) — *Reducing the Dimensionality of Data with Neural Networks*](https://www.cs.toronto.edu/~hinton/absps/science.pdf) | Reapertura del entrenamiento profundo en la fase previa al boom. |
| R18 | [Bengio et al. (2007) — *Greedy Layer-Wise Training of Deep Networks*](https://proceedings.neurips.cc/paper/3048-greedy-layer-wise-training-of-deep-networks.pdf) | Papel del preentrenamiento capa a capa en redes profundas. |
| R19 | [Krizhevsky, Sutskever & Hinton (2012) — *ImageNet Classification with Deep Convolutional Neural Networks*](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf) | AlexNet y el umbral de 2012. |
| R20 | [LeCun, Bengio & Hinton (2015) — *Deep Learning*](https://www.nature.com/articles/nature14539) | Revisión histórica y técnica del auge del aprendizaje profundo. |

</details>