---
title: Fundamentos de IA
description: Qué es la Inteligencia Artificial, cómo funciona y cómo ha evolucionado: desde heurísticas y Machine Learning hasta redes neuronales y modelos fundacionales.
---

# Capítulo 1 — Qué es IA

La inteligencia artificial **no es una "mente" ni una entidad autónoma**.
Es una familia de **sistemas construidos para optimizar una tarea** a partir de datos, con un objetivo medible, y con capacidad de mejorar mediante algún mecanismo de "aprendizaje".

A veces estos sistemas clasifican, otras predicen, otras deciden y, en los casos más recientes, **generan contenido**.

Para no confundirnos entre productos, modelos y marketing, vamos a usar un marco simple que permite entender **cualquier sistema de IA moderno**.

Cualquier "sistema de IA" se entiende contestando:

- **¿Qué tipo de aplicación de IA es?**: familia/tecnología que usa
- **¿Cómo aprende?**: de dónde sale el "profesor"
- **¿Cómo se ajusta?**: cómo cambia el modelo al entrenar

Vamos a resolver cada pregunta por orden.

---
## 1. El Marco General: IA, ML, DL y GenAI
Una forma efectiva de visualizar la jerarquía es la siguiente:

* **Inteligencia Artificial (IA):** el concepto más amplio. Se refiere a **máquinas o software que imitan capacidades asociadas a la inteligencia humana** para razonar, resolver problemas o tomar decisiones. En la analogía del cuerpo humano, la IA sería el **"cerebro"**.

* **Aprendizaje Automático (Machine Learning, ML):** una rama de la IA que permite a los sistemas **aprender de los datos y mejorar con la experiencia**, en lugar de depender de reglas explícitas. En la analogía, el ML sería el **"entrenamiento"** de ese cerebro.

* **Aprendizaje Profundo (Deep Learning, DL):** un tipo especializado de ML que utiliza **redes neuronales de muchas capas** para manejar datos complejos como imágenes, audio o lenguaje. Se asemeja a las **neuronas y conexiones profundas** del cerebro.

* **Inteligencia Artificial Generativa (GenAI):** una parte del DL orientada a **generar contenido** (texto, imagen, audio, código).

> IA / ML / DL describen la **familia tecnológica** del sistema.
> En esta serie, "generativa" se usa como etiqueta práctica para sistemas cuyo output principal es **contenido nuevo**, aunque técnicamente también remite a una familia de modelos generativos que modelan distribuciones y generan muestras.

{{ include_html("snippets/fundamentos-ia/ia_ml_dl.html") }}

Ya sabemos identificar qué familia tecnológica usa un sistema. La segunda pregunta es: **¿de dónde sale la señal que hace que aprenda?**

## 2. ¿Cómo aprenden estos sistemas?

No son tipos de modelos, sino **formas distintas de construir la señal de aprendizaje**: en definitiva, de qué tipo de profesor usamos.

> Supervisado / no supervisado / auto-supervisado / aprendizaje por refuerzo (RL) describen **de dónde sale el profesor**.

{{ include_html("snippets/fundamentos-ia/tipos_aprendizaje.html") }}

Ya sabemos de dónde viene el "profesor". La tercera pregunta cierra el marco: **¿qué cambia exactamente dentro del modelo cuando aprende?** La respuesta depende del tipo de algoritmo, y entenderla es lo que distingue usar IA de entender IA.

## 3. Cómo se ajustan estos sistemas

Saber **de dónde sale la señal que hace que aprenda** (supervisado / auto-supervisado / RL) no basta.

La clave es entender **qué y cómo se ajusta** para que el modelo mejore.

### 3.1 El bucle universal de aprendizaje

1. **Entrena y predice** con los datos que tiene ahora.
2. **Mide el error** (o qué tan bien separa / agrupa).
3. **Ajusta algo interno** para reducir ese error.
4. **Repite** muchas veces.

> **Aprender = cambiar parámetros internos para equivocarse menos con datos parecidos a los del entrenamiento.**

### 3.2 Por qué un modelo puede aprender hoy y servir mañana

Los modelos se entrenan con una **muestra del mundo** (datos disponibles hoy) y se espera que capture **patrones generales** que se mantengan en el futuro.

* Si los datos futuros son **parecidos**, el modelo generaliza bien.
* Si cambian mucho (**deriva de datos**), el rendimiento cae, conviene **monitorizar** y **reentrenar**.

Por eso interesa saber **qué se está ajustando**, porque cada familia de algoritmos aprende de una forma distinta.
Además, este factor es clave, porque hace que los sistemas de IA no sean estáticos. Necesitan un mantenimiento y monitorización continua.

---

### 3.3 Qué se ajusta según el tipo de algoritmo

Piensa en cada algoritmo como una máquina con un tipo de **parámetros**. Entrenar es actualizar esos parámetros para que las predicciones cada vez se ajusten mejor.

#### 1. Ajustan **reglas / decisiones**: Árboles de decisión, Random Forest, XGBoost

**Qué cambia internamente:**

* Las **preguntas** que se hacen (qué variable mirar).
* Los **umbrales** de esas preguntas (p. ej. "¿más de X?").
* La **estructura** del árbol (qué ramas existen y hasta qué profundidad).

> Es como construir un **cuestionario**: "si pasa A, pregunta B, y si no, pregunta C".

**Ejemplo aprobación de préstamo:**

* Primera regla candidata: "¿ingresos mensuales por encima de X?": separa solicitudes con más capacidad de pago.
* Luego: "¿ratio de deuda por debajo de Y?": refina la separación.
* Entrenar = probar muchas preguntas/umbrales y quedarse con las que **mejor separan** solicitudes aprobables vs descartables.

{{ include_html("snippets/fundamentos-ia/algoritmos/arboles_decision.html") }}

---

#### 2. Ajustan **probabilidades aprendidas por conteo**: Naive Bayes

**Qué cambia internamente:**

* Tablas de **frecuencias/probabilidades**, cuáles son las señales que aparecen más en cada clase.
* Trata las señales como **casi independientes** dada la clase, para poder combinar evidencias de forma simple.

> Es como llevar un **recuento**: "cuando es spam, ¿cuántas veces veo ‘gratis’?, ¿cuántas ‘urgente’?"

**Ejemplo spam:**

* Si "gratis" aparece muy a menudo en spam y rara vez en no spam, eso empuja la predicción hacia spam.
* Entrenar = actualizar esos conteos con muchos ejemplos y convertirlos en probabilidades.

{{ include_html("snippets/fundamentos-ia/algoritmos/naive_bayes_vnext.html") }}

---

#### 3. Ajustan **grupos por similitud de características**: Clustering, k-means

**Qué cambia internamente:**

* La **posición** de los "centros" de los grupos (a cada centro se le denomina *prototipo*).

**Nota:** qué significa "parecido" depende de la **distancia** que uses y de cómo **escales** las variables.

> Es como poner **imanes** en un mapa: cada dato va al imán más cercano, luego mueves los imanes al centro de cada grupo.

**Ejemplo:**

* Agrupar clientes por comportamiento (frecuencia, gasto, canales) sin etiquetas previas, solo los datos crudos.
* Entrenar = recolocar los centros para que los puntos queden **lo más cerca posible** de su grupo (clientes más parecidos, más juntos).

{{ include_html("snippets/fundamentos-ia/algoritmos/kmeans_vnext.html") }}

---

#### 4. Ajustan **pesos numéricos** (Redes neuronales)

**Qué cambia internamente:**

* Los **pesos** (y **sesgos**) en las conexiones son números que indican **cuánta influencia** tiene cada señal de entrada al combinarse.
* En redes profundas, hay **millones** de pesos repartidos en capas.

> Cada neurona calcula una **suma ponderada** y luego aplica una **función de activación**, que le permite al sistema aprender conceptos no lineales.

<details markdown="1">
<summary><strong>Profundización técnica (opcional)</strong></summary>

**Dos roles típicos de la función de activación:**

* En **capas internas**: aporta no linealidad (capacidad).
* En la **salida**: convierte la puntuación en algo interpretable (p. ej., probabilidad con *sigmoid/softmax*).

**Por qué importa la función de activación:**

* Sin activación, varias capas seguidas serían una sola transformación lineal, así que el modelo sería demasiado rígido.
* La activación introduce **no linealidad**, que permite capturar relaciones "si pasa A y B, pero no C…", curvas, umbrales suaves, etc.
* También afecta al entrenamiento: el tipo de activación influye en lo fácil/difícil que es ajustar pesos en capas profundas.

**Las 4 piezas mínimas para realizar los ajustes:**

* **Función de activación**: sirve para que los sistemas aprendan conceptos **no lineales**.
* **Función de pérdida**: una medida del "fallo" (cuánto se equivocó).
* **Propagación hacia atrás (Backpropagation)**: reparte la culpa del error entre pesos (qué pesos contribuyeron más al fallo).
* **Optimizador**: decide cuánto mover cada peso en cada paso (pasos pequeños, repetidos).
</details>


**Ejemplo spam:**

* Señales: "gratis", "urgente", "muchos enlaces"…
* La red combina señales con pesos, pasa por activaciones y produce una puntuación/probabilidad.
* Si falla, ajusta pesos/sesgos para que la próxima vez "gratis" pese más o menos, etc.

{{ include_html("snippets/fundamentos-ia/redes_neuronales_v2.html") }}

---

### 3.4 Para qué tipo de datos sirve cada familia

No todas las familias son igual de adecuadas para cualquier problema. El tipo de dato es muchas veces el primer filtro de decisión:

| Familia | Datos donde funciona bien | Dónde falla o no es la primera opción |
|---------|--------------------------|---------------------------------------|
| **Árboles** (Decision Tree, Random Forest, XGBoost) | Tabular estructurado: números, categorías, variables mixtas. El favorito para datos de negocio y competiciones de Kaggle con tablas. | Imágenes, audio, texto crudo sin preprocesar. |
| **Naive Bayes** | Texto (bolsa de palabras, frecuencias de tokens), datos categóricos con pocas correlaciones entre variables. Muy rápido con poco dato. | Datos continuos muy correlacionados entre sí; relaciones complejas entre variables. |
| **K-means** (clustering) | Numérico continuo donde la distancia euclidiana tiene sentido: coordenadas, métricas de comportamiento escaladas. | Texto, datos de alta dimensión sin reducción previa, variables categóricas puras. |
| **Redes neuronales** | Imágenes, audio, texto, series temporales, vídeo. Brillan cuando el volumen de datos es grande y el patrón es complejo. | Datos tabulares pequeños: suelen ganar los árboles con menos coste computacional. |

> **Estas cuatro familias ilustran el espectro de mecanismos de ajuste, no todo el mapa.** Existen decenas más: SVMs, regresión logística/lineal, modelos de mezclas gaussianas, redes bayesianas, modelos de series temporales (ARIMA, Prophet), métodos de ensemble, etc. Elegir algoritmo empieza siempre por entender el tipo de dato y el objetivo del problema.

Estos tres ejes (**familia tecnológica, tipo de aprendizaje, mecanismo de ajuste**) permiten describir cualquier sistema de IA moderno. Pero todos comparten algo: de dónde viene la lógica que los hace funcionar.

## 4. Software clásico vs IA

Todo lo anterior describe una forma distinta de definir la lógica de una solución. No cambia cómo se escribe el código, sino de dónde viene la lógica que hace que el sistema funcione.

En el software clásico:

* **Datos de entrada + reglas escritas por humanos → salida**

Ejemplo: convertir Fahrenheit a Celsius con una fórmula fija.

* El programador escribe explícitamente la regla: **C = (F - 32) x 5/9**
* Si entra el mismo valor en Fahrenheit, siempre sale el mismo valor en Celsius.

En IA:

* **Datos de entrada + datos de salida → reglas aprendidas**
* El "algoritmo", la fórmula matemática, emerge del entrenamiento.

Ejemplo: usar muchos pares **(Fahrenheit, Celsius)** para que el sistema aprenda la conversión.

* Ya no escribes la fórmula exacta a mano.
* El modelo ajusta parámetros y aprende una regla aproximada que luego generaliza a nuevos valores.

Este es el principio base del llamado **Software 2.0**: la lógica ya no se escribe, se aprende.

Esto no cambia todavía cómo se construye software, sino cómo se construyen soluciones usando IA. El salto en la forma de desarrollar software llegará con los LLMs.

Este cambio de paradigma no ocurrió de golpe. Hubo décadas de avances, fracasos y saltos que explican dónde estamos hoy y hacia dónde vamos.

## 5. Grandes hitos

No hace falta memorizar toda la cronología.
Lo importante es ver **qué cambió en cada ola**.

| Fecha | Gran hito | Qué cambia |
| --- | --- | --- |
| **1950** | **Turing** ([paper][hito-turing]) | Pone el marco conceptual de "inteligencia en máquinas". |
| **1955–1956** | **Conferencia de Dartmouth** ([propuesta][hito-dartmouth]) | Nace formalmente el campo de la IA. |
| **1958–1959** | **Perceptrón y primeras demostraciones de aprendizaje automático** ([paper · Rosenblatt][hito-perceptron], [paper · Samuel][hito-samuel]) | Aparece la idea de aprender desde datos, no solo desde reglas. |
| **Década de 1980** | **Sistemas expertos** ([caso XCON][hito-xcon]) | Primera ola empresarial de IA basada en reglas. |
| **1986** | **Backpropagation** ([paper][hito-backprop]) | Se vuelve viable entrenar redes neuronales multicapa. |
| **1997** | **Deep Blue** ([IBM][hito-deepblue]) | Una IA especializada derrota al campeón del mundo de ajedrez y hace visible el poder de la IA estrecha. |
| **2012** | **AlexNet + ImageNet** ([paper][hito-alexnet], [ILSVRC][hito-imagenet]) | Arranca la era moderna del deep learning escalado con datos y GPUs. |
| **2017** | **Transformer — "Attention is all you need"** ([paper][hito-transformer]) | Aparece la arquitectura base de los modelos modernos de lenguaje. |
| **2020–2022** | **GPT-3, AlphaFold y ChatGPT** ([artículo · GPT-3][hito-gpt3], [CASP14][hito-casp14], [paper Nature · AlphaFold][hito-alphafold-paper], [anuncio · ChatGPT][hito-chatgpt]) | Llegan los modelos fundacionales, el impacto científico directo y el uso masivo. |

Si quieres una imagen mental todavía más simple, léelo así:

> **reglas** -> **aprendizaje estadístico** -> **deep learning** -> **modelos fundacionales** -> **IA útil a gran escala**

Toda esa investigación culmina en sistemas capaces y eficientes. Pero un modelo capaz no es todavía un producto.
Para que un sistema de IA funcione de forma fiable en el mundo real hace falta un ciclo de ingeniería completo.

## 6. MLOps: el ciclo completo para que una IA funcione en el mundo real

MLOps es la parte "de ingeniería" que hace que una IA funcione de forma fiable en el mundo real: no solo hoy, también dentro de 3 meses cuando cambien los datos, el mercado o el comportamiento de los usuarios. ([Google Cloud](https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning))
La idea clave:

>Un modelo entrenado ≠ una IA en producción.
>En producción necesitas un ciclo completo: datos → entrenamiento → despliegue → monitorización → mejora.

La forma más clara de entender MLOps es verlo como una cadena de 8 pasos. Si falta uno, normalmente tienes una demo, no un producto.

1. Datos (capturar): recoges señales del mundo real (eventos, transacciones, documentos, logs).
2. Datos (preparar): limpias y conviertes datos en variables útiles (lo que el modelo "entiende").
3. Entrenar: el modelo aprende patrones con ejemplos históricos.
4. Evaluar: compruebas que funciona "lo suficiente" antes de tocar producción.
5. Versionar: guardas qué modelo es, con qué datos/versión se entrenó (trazabilidad).
6. Desplegar: lo pones a funcionar (API o batch), idealmente de forma gradual.
7. Monitorizar: miras si el mundo cambia (datos), si el sistema va bien (latencia/errores) y si el rendimiento cae.
8. Feedback y mejora: cuando llega la "verdad" (etiquetas reales), corriges, reentrenas o haces rollback.

{{ include_html("snippets/fundamentos-ia/mlops/ciclo_mlops.html")}}

[Capítulo 2 — IA Generativa y LLMs →](./02-que-es-ia-generativa.md){ .md-button .md-button--primary }

## 7. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **OECD** — *Explanatory Memorandum on the Updated OECD Definition of an AI System* ([OECD][1]) | Aclara la definición moderna de sistema de IA. |
| R2 | **ISO/IEC 22989:2022** — *Artificial intelligence — Concepts and terminology* ([ISO][5]) | Vocabulario y conceptos base del campo. |
| R3 | **Tom M. Mitchell** — *Machine Learning* ([CMU School of Computer Science][2]) | Define formalmente aprendizaje con E/T/P. |
| R4 | **Y. LeCun, Y. Bengio, G. Hinton (2015)** — *Deep Learning* ([Nature][3]) | Panorama corto de la revolución del deep learning. |
| R5 | **I. Goodfellow, Y. Bengio, A. Courville** — *Deep Learning* ([Deep Learning Book][6]) | Base técnica de redes neuronales modernas. |
| R6 | **R. S. Sutton, A. G. Barto** — *Reinforcement Learning: An Introduction* ([Incomplete Ideas][7]) | Referencia clásica para aprendizaje por refuerzo. |
| R7 | **R. Wirth, J. Hipp** — *CRISP-DM: Towards a Standard Process Model for Data Mining* ([cs.unibo.it][8]) | Proceso estándar para proyectos de datos y ML. |
| R8 | **D. Sculley et al. (2015)** — *Hidden Technical Debt in Machine Learning Systems* ([NeurIPS Papers][4]) | Explica por qué un modelo no basta como sistema real. |

</details>

[1]: https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/03/explanatory-memorandum-on-the-updated-oecd-definition-of-an-ai-system_3c815e51/623da898-en.pdf "Explanatory memorandum on the updated OECD definition ..."
[2]: https://www.cs.cmu.edu/~tom/files/MachineLearningTomMitchell.pdf "Mitchell. "Machine Learning.""
[3]: https://www.nature.com/articles/nature14539 "Deep learning"
[4]: https://papers.neurips.cc/paper/5656-hidden-technical-debt-in-machine-learning-systems.pdf "Hidden Technical Debt in Machine Learning Systems"
[5]: https://www.iso.org/standard/74296.html "ISO/IEC 22989:2022 - Artificial intelligence"
[6]: https://www.deeplearningbook.org/ "Deep Learning Book"
[7]: https://incompleteideas.net/book/the-book-2nd.html "Reinforcement Learning: An Introduction"
[8]: https://cs.unibo.it/~danilo.montesi/CBD/Beatriz/10.1.1.198.5133.pdf "CRISP-DM: Towards a Standard Process Model for Data ..."

**Referencias de hitos**

<details markdown="1">
<summary><strong>Fuentes de hitos</strong></summary>

| Hito | Fuente | Descripción breve |
| --- | --- | --- |
| H1 | Alan Turing — *Computing Machinery and Intelligence* ([paper][hito-turing]) | Marco conceptual sobre inteligencia en máquinas. |
| H2 | Dartmouth Summer Research Project on Artificial Intelligence (1955) ([propuesta][hito-dartmouth]) | Acta fundacional del campo de la IA. |
| H3 | Frank Rosenblatt — *The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain* ([paper][hito-perceptron]) | Primer gran paso hacia aprendizaje desde datos. |
| H4 | Arthur Samuel — *Some Studies in Machine Learning Using the Game of Checkers* ([paper][hito-samuel]) | Primera demostración práctica de que una máquina puede aprender a jugar mejor que su programador. |
| H5 | XCON / sistemas expertos en producción en Digital Equipment Corporation ([caso XCON][hito-xcon]) | Auge industrial de la IA basada en reglas. |
| H6 | Rumelhart, Hinton, Williams — *Learning representations by back-propagating errors* ([paper][hito-backprop]) | Hace viable entrenar redes neuronales multicapa. |
| H7 | IBM — Deep Blue vs Kasparov (1997) ([IBM][hito-deepblue]) | Demuestra el poder de una IA especializada en un dominio concreto. |
| H8 | AlexNet — *ImageNet Classification with Deep Convolutional Neural Networks* (2012) ([paper][hito-alexnet]) | Dispara la era moderna del deep learning visual. |
| H9 | ImageNet / ILSVRC ([ILSVRC][hito-imagenet]) | Benchmark que acelera el progreso en visión por computador. |
| H10 | AlphaGo (2016) — *Mastering the game of Go with deep neural networks and tree search* ([paper Nature][hito-alphago]) | Combina deep learning y búsqueda: primer sistema que supera a los mejores humanos en Go. |
| H11 | AlphaGo vs Lee Sedol (2016) ([página DeepMind][hito-alphago-match]) | El hito público que visibiliza ese salto técnico ante la opinión global. |
| H12 | *Attention Is All You Need* — Transformer (2017) ([paper][hito-transformer]) | Arquitectura base de los modelos actuales de lenguaje e imagen. |
| H13 | BERT (2019) — *Pre-training of Deep Bidirectional Transformers for Language Understanding* ([paper][hito-bert]) | Consolida el preentrenamiento bidireccional en NLP. |
| H14 | GPT-3 (2020) — *Language Models are Few-Shot Learners* ([artículo OpenAI][hito-gpt3]) | Escala los modelos fundacionales de lenguaje a un nivel sin precedentes. |
| H15 | CASP14 / AlphaFold (2020–2021) ([CASP14][hito-casp14], [paper Nature][hito-alphafold-paper], [blog DeepMind][hito-alphafold-blog]) | Resuelve el problema del plegamiento de proteínas: primer impacto científico directo de la IA a esa escala. |
| H16 | ChatGPT (2022) ([anuncio OpenAI][hito-chatgpt]) | Populariza la IA generativa a gran escala ante el público general. |
| H17 | University of Reading — Turing Test 2014 ([artículo][hito-turing2014]) | Referencia divulgativa sobre el debate del test de Turing. |
| H18 | *AlphaGo — The Movie* (2017, dir. Greg Kohs) ([documental · YouTube][hito-alphago-doc]) | Documental que narra desde dentro la preparación del enfrentamiento contra Lee Sedol. Recomendado para entender el impacto humano y técnico del hito. |
| H19 | *AlphaFold: The making of a scientific breakthrough* — DeepMind (2021) ([vídeo · YouTube][hito-alphafold-doc]) | Vídeo documental de DeepMind sobre el proceso y el impacto de AlphaFold. Recomendado antes de leer el paper. |

</details>

[hito-turing]: https://academic.oup.com/mind/article-abstract/LIX/236/433/986238 "Computing Machinery and Intelligence"
[hito-dartmouth]: https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/1904 "A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence"
[hito-perceptron]: https://deeplearning.cs.cmu.edu/S24/document/readings/Rosenblatt_1959-09865-001.pdf "The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain"
[hito-samuel]: https://people.csail.mit.edu/brooks/idocs/Samuel.pdf "Some Studies in Machine Learning Using the Game of Checkers"
[hito-xcon]: https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/download/460/396 "R1 and Beyond: AI Technology Transfer at Digital Equipment Corporation"
[hito-backprop]: https://www.nature.com/articles/323533a0.pdf "Learning representations by back-propagating errors"
[hito-deepblue]: https://www.ibm.com/history/deep-blue "Deep Blue"
[hito-alexnet]: https://proceedings.neurips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf "ImageNet Classification with Deep Convolutional Neural Networks"
[hito-imagenet]: https://image-net.org/challenges/LSVRC/ "ImageNet Large Scale Visual Recognition Challenge"
[hito-alphago]: https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf "Mastering the game of Go with deep neural networks and tree search"
[hito-alphago-match]: https://deepmind.google/research/alphago/ "AlphaGo"
[hito-transformer]: https://papers.nips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html "Attention Is All You Need"
[hito-bert]: https://aclanthology.org/N19-1423/ "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
[hito-gpt3]: https://openai.com/index/language-models-are-few-shot-learners/ "Language models are few-shot learners"
[hito-casp14]: https://predictioncenter.org/casp14/doc/CASP14_press_release.html "CASP14 press release"
[hito-alphafold-paper]: https://www.nature.com/articles/s41586-021-03819-2.pdf "Highly accurate protein structure prediction with AlphaFold"
[hito-alphafold-blog]: https://deepmind.google/blog/alphafold-a-solution-to-a-50-year-old-grand-challenge-in-biology/ "AlphaFold: a solution to a 50-year-old grand challenge in biology"
[hito-chatgpt]: https://openai.com/index/chatgpt/ "Introducing ChatGPT"
[hito-turing2014]: https://archive.reading.ac.uk/news-events/2014/June/pr583836.html "Turing Test success marks milestone in computing history"
[hito-alphago-doc]: https://www.youtube.com/watch?v=WXuK6gekU1Y "AlphaGo — The Movie (2017)"
[hito-alphafold-doc]: https://www.youtube.com/watch?v=gg7WjuFs8F4 "AlphaFold: The making of a scientific breakthrough — DeepMind"
