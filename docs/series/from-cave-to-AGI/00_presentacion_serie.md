---
title: De las cavernas a la AGI
description: Recorrido histórico y conceptual desde símbolos hasta modelos actuales.
---
# De las cavernas a la AGI

{{ include_html("snippets/series_meta.html", series_dir="from-cave-to-agi", data_state="construction", data_level="general", data_read="7", status_label="En construcción", level_label="General", glow_hidden="true", extra_rows="") }}

Esta serie es un viaje histórico desde los primeros intentos de la humanidad por abstraer el mundo mediante símbolos hasta la creación de modelos de lenguaje masivos que parecen "entenderlo".

Exploraremos cómo la necesidad de contar llevó al cálculo, cómo el deseo de mecanizar el razonamiento llevó a la computación, y cómo el intento de imitar el cerebro nos trajo a la era de la IA generativa.

<!-- ## Escucha el podcast de la serie

{{ podcast_player('from-cave-to-agi') }} -->
<!-- 
## Vídeos

{{ video_gallery('from-cave-to-agi') }} -->
## Índice
En esta serie exploraremos: <br>
<!-- ### Acto I: Representar (≈ 40 000 a. C. – 1700)
- Cómo nacen los lenguajes formales con los que describimos el mundo.
- De las muescas en hueso al número
- El proyecto griego: demostración, geometría y verdad formal
- Cero y notación: el truco que hace posible el álgebra
- Álgebra como lenguaje
- Medir, modelar, predecir (y por qué eso es “hacer ciencia”)
- Del cálculo al mundo dinámico: cambio, derivadas y ecuaciones

### Acto II: Mecanizar (≈ 1700 – 1956)
Cómo pasamos de “razonar con símbolos” a “construir máquinas que operan símbolos”.

- Mecanizar el cálculo: autómatas, engranajes y la obsesión por computar
- Babbage, Jacquard y la idea de programa: instrucciones separadas de la máquina
- Lógica como ingeniería: de Boole a circuitos
- Crisis de fundamentos: qué significa “probar” y por qué importa
- Máquina universal: Turing, computabilidad y límites
- Arquitectura y memoria: de la teoría al ordenador real
- Información y compresión: por qué Shannon es una bisagra (y qué compra para IA)

---

### Acto III: Aprender (≈ 1956 – 2012)
Cómo aparece la idea moderna de no programar reglas, sino **ajustar modelos con datos**.

- Dartmouth y el sueño inicial: “hacer inteligencia” por definición
- Primeras redes: neuronas de metal, Perceptrón y el primer choque con los límites
- IA simbólica y sistemas expertos: cuando las reglas dominan (y por qué fallan)
- Probabilidad en la práctica: Bayes, verosimilitud y generalización
- Optimización como motor: gradiente, regularización y el arte de entrenar
- NLP antes de los LLMs: n-grams, HMM/CRF y por qué funcionaban
- El renacimiento neuronal: backprop, representaciones y el retorno del aprendizaje
- Datos + hardware: el papel real de GPUs, benchmarks y escala industrial

---

### Acto IV: Escalar (≈ 2012 – hoy)
Cómo el mismo principio aprendizaje más escala masiva supera todas las expectativas y la apareción de modelos “fundacionales”.

- 2012 como punto de inflexión: deep learning “gana” por escala y representación
- Atención y Transformers: el cambio de arquitectura que desbloquea preentrenamiento masivo
- Preentrenar para todo: por qué “foundation model” no es solo marketing
- Leyes de escalado y límites
- Instrucción y alineamiento
- Herramientas y agentes: cuando el modelo deja de solo “responder” y empieza a actuar
- Multimodalidad: texto+imagen+audio como unificación práctica en el transformer
- Modelos del mundo: representación, simulación y planificación (qué significa realmente)
- Qué viene después del Transformer: Titans, Nested learning... -->

<!-- 
## Fuentes y notas
- Alan Turing (1936) — *On Computable Numbers*: https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf
- Claude Shannon (1948) — *A Mathematical Theory of Communication*: https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf
- McCulloch & Pitts (1943) — *A logical calculus of the ideas immanent in nervous activity*: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1698376/
- Dartmouth proposal (1955): http://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html
- LeCun, Bengio, Hinton (2015) — *Deep learning*: https://www.nature.com/articles/nature14539
- Vaswani et al. (2017) — *Attention Is All You Need*: https://arxiv.org/abs/1706.03762 -->

### 1. Representar (≈ 40 000 a. C. – 1700)
- **Inventar lenguajes para describir el mundo:** del conteo físico (muescas, marcas) a números y símbolos manipulables.
- **Formalizar la verdad:** los griegos fijan demostración y geometría como estándar de conocimiento verificable.
- **Hacer ciencia con matemáticas:** notación (cero, álgebra) y modelo para la predicción. Nacimiento del cálculo para describir el concepto de cambio de magnitudes (derivadas, ecuaciones).


### 2. Mecanizar (≈ 1700 – 1956)
- **Convertir símbolos en máquina:** automatizar cálculo con mecanismos y, luego, con circuitos. Aquí nace la obsesión por computar.
- **Separar programa de hardware:** de Jacquard/Babbage a la idea de instrucciones reutilizables independientes de la máquina.
- **Fundamentos de la computación moderna:** lógica (Boole), qué es “probar”, computabilidad y límites (Turing), arquitectura real (memoria), e información/compresión (Shannon).


### 3. Aprender (≈ 1956 – 2012)
- **De reglas a datos:** pasamos de no codificar inteligencia a mano, sino ajustar modelos con ejemplos.
- **Motores del aprendizaje práctico:** probabilidad (Bayes, generalización) más algoritmos de optimización (gradiente, regularización) junto con representación (backprop) como tríada para el entrenamiento de IA.
- **Antes de la era LLM:** perceptrón y límites, auge/caída de IA simbólica, NLP estadístico (n-grams, HMM/CRF) y renacimiento neuronal impulsado por datos, GPUs, benchmarks y escala.


### 4. Escalar (≈ 2012 – hoy)
- **Escala como multiplicador:** deep learning despega por más datos/cómputo y mejores representaciones. 2012 marca el cambio de régimen.
- **Transformers y modelos fundacionales:** la atención habilita preentrenamiento masivo y reutilización generalista. Las leyes de escalado y el alineamiento con el humano lo convierte en un punto de inflexión que deriva en el nacimiento de ChatGPT.
- **De “responder” a “actuar” y unificar modalidades:** herramientas/agentes, multimodalidad (texto/imagen/audio), modelos del mundo (simulación/planificación) y líneas post-Transformer (Titans, nested learning, etc.).
