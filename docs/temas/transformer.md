---
title: "Cómo funciona el Transformer"
seo_title: "Cómo funciona el Transformer: atención y arquitectura paso a paso"
description: "Explicación técnica del Transformer: embeddings, autoatención, bloques residuales, encoder, decoder, coste y límites de la arquitectura."
keywords: "Transformer, self-attention, autoatención, arquitectura Transformer, Query Key Value, encoder decoder, LLM"
date: 2026-04-07
date_modified: 2026-08-16
---

# Cómo funciona el Transformer

El **Transformer** es una arquitectura neuronal que procesa una secuencia mediante atención. Cada posición puede combinar información de otras posiciones sin recorrerlas una a una como una red recurrente. Esa propiedad permitió paralelizar el entrenamiento y escalar modelos de texto, imagen, audio y vídeo.[^transformer]

La atención es la operación distintiva, pero un Transformer completo también necesita embeddings, información posicional, proyecciones, redes feed-forward, conexiones residuales y normalización.

## La arquitectura en una sola vista

{{ include_html("snippets/temas/transformer-block.html") }}

En un modelo autoregresivo, la última representación se proyecta sobre el vocabulario para producir las probabilidades del siguiente token.

## 1. Embeddings e información posicional

Un token empieza como un identificador entero. Una matriz aprendida lo convierte en un vector. Tokens que aparecen en contextos parecidos pueden acabar con representaciones relacionadas.

La atención, por sí sola, no conoce el orden. El modelo necesita añadir o incorporar la posición. El paper original usó codificaciones sinusoidales sumadas al embedding de entrada. Arquitecturas posteriores emplean embeddings posicionales aprendidos, posiciones relativas o transformaciones rotatorias como RoPE.[^transformer][^rope]

{{ include_html("snippets/temas/transformer-embedding-position.html") }}

La posición no es un detalle cosmético: permite distinguir quién actúa sobre quién aunque una secuencia contenga prácticamente los mismos tokens. El mecanismo exacto no es universal; la suma `embedding + posición` describe el Transformer original, mientras que RoPE incorpora la posición mediante rotaciones dentro del cálculo de atención.[^rope]

## 2. Query, Key y Value

Cada representación se proyecta en tres vectores:

- **Query (Q):** qué información busca esta posición
- **Key (K):** qué señal ofrece cada posición para ser encontrada
- **Value (V):** qué contenido aporta si recibe atención

La atención escalada conecta cuatro operaciones: proyectar `Q`, `K` y `V`; calcular compatibilidades; normalizar los pesos; y mezclar los valores.[^transformer]

{{ include_html("snippets/temas/transformer-qkv.html") }}

El producto `QKᵀ` calcula compatibilidades entre posiciones. El factor `√d_k` controla la escala de los logits. `softmax` convierte cada fila en pesos normalizados. La multiplicación por `V` produce una combinación ponderada de información.

La interpretación “cada palabra mira a todas las demás” es útil, aunque incompleta. En realidad, cada cabeza aprende proyecciones distintas y puede especializarse en patrones diferentes.

## 3. Multi-head attention

En lugar de ejecutar una sola atención con toda la dimensión, el bloque divide la representación en varias **cabezas**. Cada cabeza calcula sus propias matrices `Q`, `K` y `V`.

{{ include_html("snippets/temas/transformer-multihead.html") }}

Una cabeza puede capturar dependencias locales. Otra puede relacionar entidades alejadas. Otra puede ayudar a copiar estructura o seguir delimitadores. No existe una asignación fija y universal, pero la separación aumenta la capacidad de representar relaciones simultáneas.

## 4. Máscara causal en modelos generativos

Un decoder autoregresivo no debe ver el futuro durante el entrenamiento. Se aplica una máscara triangular que impide a la posición `t` atender a tokens posteriores.[^transformer]

{{ include_html("snippets/temas/transformer-causal-mask.html") }}

Así, aunque todas las posiciones del lote se procesen en paralelo durante el entrenamiento, cada predicción respeta el mismo contrato que existirá al generar: solo puede usar el prefijo disponible.

Durante la inferencia, la generación sigue siendo secuencial porque el token siguiente no existe hasta que se elige el anterior. La caché KV evita recalcular claves y valores de todo el prefijo en cada paso.

## 5. La red feed-forward

Después de la atención, cada posición atraviesa una red densa aplicada de forma independiente y con los mismos parámetros para todas las posiciones de esa capa.[^transformer]

{{ include_html("snippets/temas/transformer-ffn.html") }}

En modelos grandes, esta parte contiene una fracción importante de los parámetros y del cómputo. Arquitecturas modernas utilizan activaciones y puertas como GELU, SwiGLU o variantes equivalentes. Los modelos *mixture-of-experts* sustituyen una única red densa por varios expertos y enrutan cada token hacia una parte de ellos.

## 6. Residuales y normalización

Cada subbloque no sustituye sin más la representación que recibe: aprende una transformación sobre una **ruta residual** que conserva la entrada. La posición de la normalización determina dónde se modifica la señal antes de continuar por la pila de capas.

{{ include_html("snippets/temas/transformer-residual-norm.html") }}

El Transformer original usó *post-norm*: suma primero la salida de la subcapa a la ruta residual y normaliza después.[^transformer] En *pre-norm*, la normalización se aplica dentro de la rama de la subcapa, dejando una ruta de identidad directa entre capas. El análisis de Xiong et al. muestra por qué esa colocación cambia el comportamiento de los gradientes al inicio del entrenamiento y puede mejorar la estabilidad de optimización.[^prenorm]

La misma estructura residual rodea tanto la atención como la red feed-forward. El detalle exacto de la normalización cambia entre familias, pero la idea central se mantiene: cada subcapa aprende una corrección sobre una representación que también puede avanzar por la ruta residual.

## Encoder, decoder y encoder-decoder

{{ include_html("snippets/temas/transformer-encoder-decoder.html") }}

BERT popularizó el uso de encoders con contexto bidireccional para producir representaciones útiles en clasificación, extracción y comprensión.[^bert] Las familias GPT popularizaron el decoder causal para generación. El Transformer original combinaba ambos: el encoder representaba toda la entrada y el decoder generaba la salida consultando esas representaciones mediante *cross-attention*.[^transformer]

“Transformer” no implica por tanto un único diagrama. Describe una familia de bloques y contratos de atención.

## Por qué desplazó a las redes recurrentes

Las RNN y LSTM actualizan un estado paso a paso. Eso introduce una dependencia secuencial difícil de paralelizar y obliga a transportar información lejana a través de muchos pasos.

{{ include_html("snippets/temas/transformer-rnn-vs-attention.html") }}

La ventaja aparece sobre posiciones ya conocidas durante el entrenamiento: la atención reduce el número de operaciones secuenciales dentro de una capa y acorta el camino entre posiciones distantes. El precio es la interacción densa entre pares, que se vuelve importante al crecer el contexto.

## El coste de la atención

Para una secuencia de longitud `n`, la matriz `QKᵀ` tiene `n × n` elementos. Su memoria y parte del cómputo crecen de forma cuadrática con la longitud.

Eso no significa que todo el coste del modelo sea siempre `O(n²)`. Las proyecciones y redes feed-forward también pesan, y las implementaciones optimizadas evitan materializar ciertos intermedios. Pero el crecimiento de la interacción entre todos los pares sigue siendo un límite estructural para contextos muy largos.

{{ include_html("snippets/temas/transformer-attention-cost.html") }}

Las líneas de trabajo incluyen:

- atención local o dispersa
- compresión y memoria externa
- recuperación de fragmentos relevantes
- kernels más eficientes
- modelos de espacio de estados
- arquitecturas híbridas

Mamba mostró que una familia de modelos de espacio de estados selectivos podía procesar secuencias con crecimiento lineal y mantener capacidades competitivas en varios dominios.[^mamba] Eso no convierte al Transformer en obsoleto. Abre otro punto del espacio de diseño.

## Transformers más allá del texto

La arquitectura trabaja con secuencias de vectores, no exclusivamente con palabras.

Vision Transformer divide una imagen en parches, proyecta cada parche a un vector y aplica un encoder Transformer.[^vit] En audio pueden usarse frames o tokens acústicos. En vídeo se combinan estructura espacial y temporal. En modelos multimodales, texto, imagen y audio pueden alinearse en espacios compartidos o conectarse mediante atención cruzada.

La serie [Multimodalidad en IA generativa](/series/multimodalidad-iag/00_presentacion_serie/) desarrolla esas decisiones.

## Qué no explica la arquitectura por sí sola

Conocer el Transformer no basta para explicar el comportamiento de un modelo. También importan:

- los datos de preentrenamiento
- el objetivo de pérdida
- el tokenizador
- la escala y el presupuesto de cómputo
- el ajuste por instrucciones
- la optimización por preferencias
- el contexto y las tools durante la inferencia

Dos modelos con bloques parecidos pueden comportarse de forma muy distinta por el resto del sistema.

## Dónde profundizar en 5sigmas

- [Qué es un LLM](/temas/llms/) para conectar la arquitectura con el ciclo de entrenamiento y generación
- [Escalar](/series/from-cave-to-agi/04-escalar/) para entender por qué datos, cómputo y parámetros cambiaron el campo
- [Más allá del Transformer](/series/from-cave-to-agi/05-mas-alla/) para explorar memoria, búsqueda y arquitecturas alternativas
- [Arquitecturas multimodales](/series/multimodalidad-iag/03-arquitecturas/) para ver cómo se adaptan estos bloques a otras modalidades

## Preguntas frecuentes

### ¿La atención es lo mismo que memoria?

No. La atención combina representaciones disponibles en el contexto. Una caché KV conserva claves y valores para reutilizarlos durante la generación, pero no equivale a memoria persistente ni garantiza recordar información entre sesiones.

### ¿Por qué se divide por la raíz de la dimensión?

Cuando la dimensión de las claves crece, el producto escalar tiende a aumentar su varianza. Dividir por `√d_k` evita logits demasiado extremos y mantiene una región de gradiente más útil para `softmax`.

### ¿Todos los Transformers generan texto?

No. Un encoder puede producir representaciones o clasificaciones. Un Vision Transformer puede clasificar imágenes. La generación autoregresiva es una configuración concreta, no una propiedad obligatoria.

### ¿Un contexto mayor siempre mejora el resultado?

No. Aumenta la información disponible, pero también el coste y la dificultad de localizar la evidencia relevante. La calidad depende de la posición, el ruido, el entrenamiento para contexto largo y la estrategia de recuperación.

## Fuentes primarias

[^transformer]: Ashish Vaswani et al., [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762), 2017.
[^rope]: Jianlin Su et al., [*RoFormer: Enhanced Transformer with Rotary Position Embedding*](https://arxiv.org/abs/2104.09864), 2021.
[^prenorm]: Ruibin Xiong et al., [*On Layer Normalization in the Transformer Architecture*](https://arxiv.org/abs/2002.04745), 2020.
[^bert]: Jacob Devlin et al., [*BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*](https://arxiv.org/abs/1810.04805), 2018.
[^vit]: Alexey Dosovitskiy et al., [*An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale*](https://arxiv.org/abs/2010.11929), 2020.
[^mamba]: Albert Gu y Tri Dao, [*Mamba: Linear-Time Sequence Modeling with Selective State Spaces*](https://arxiv.org/abs/2312.00752), 2023.
