---
title: "Qué es un LLM y cómo funciona"
seo_title: "Qué es un LLM: cómo funciona un modelo de lenguaje grande"
description: "Qué es un LLM, cómo tokeniza, aprende y genera texto, qué cambia con el ajuste por instrucciones y cuáles son sus límites técnicos."
keywords: "LLM, large language model, modelo de lenguaje grande, tokens, preentrenamiento, Transformer, instruction tuning, RLHF"
date: 2026-04-07
date_modified: 2026-08-16
---

# Qué es un LLM y cómo funciona

Un **LLM** (*Large Language Model* o modelo de lenguaje grande) es una red neuronal entrenada para estimar qué token puede venir después de una secuencia. Durante el preentrenamiento observa grandes cantidades de texto y ajusta sus parámetros para reducir el error de esa predicción. Después puede generar texto, responder preguntas, resumir, traducir o producir código porque muchas tareas pueden formularse como continuación condicionada de una secuencia.

La definición parece simple. El comportamiento que emerge no lo es. Para entenderlo conviene separar cuatro piezas: **tokenización, representación, predicción y adaptación**.

## La respuesta en 60 segundos

{{ include_html("snippets/temas/llm-token-pipeline.html") }}

El modelo no busca una frase almacenada ni consulta por defecto una base de datos. Calcula una distribución de probabilidad sobre el vocabulario, elige una continuación y vuelve a ejecutar el proceso con el nuevo contexto.

Un sistema de producto puede añadir memoria, búsqueda, herramientas o políticas alrededor del modelo. Esas capacidades pertenecen al sistema completo, no necesariamente a los pesos del LLM.

## 1. El texto se convierte en tokens

El modelo no trabaja directamente con palabras. Un **tokenizador** divide el texto en unidades que pueden ser palabras completas, fragmentos, signos o bytes. Cada token recibe un identificador entero.

{{ include_html("snippets/temas/llm-tokenization.html") }}

La segmentación exacta depende del vocabulario y del algoritmo. Métodos como Byte Pair Encoding y SentencePiece equilibran dos objetivos: mantener un vocabulario manejable y representar palabras raras sin convertir cada carácter en una unidad independiente.[^sentencepiece]

La tokenización importa porque condiciona:

- el coste, que suele medirse por tokens
- la longitud efectiva del contexto
- la representación de idiomas y código
- la facilidad para copiar números, nombres o cadenas poco frecuentes

## 2. Los tokens se convierten en representaciones

Cada identificador se transforma en un vector aprendido llamado **embedding**. El modelo también necesita información sobre la posición de cada token. Sin ella, una secuencia sería solo un conjunto sin orden.

Los vectores atraviesan una pila de bloques Transformer. En cada bloque ocurren dos operaciones principales:

1. **Atención:** cada posición combina información de otras posiciones relevantes
2. **Red feed-forward:** transforma la representación de cada posición de forma no lineal

Las conexiones residuales y la normalización estabilizan el entrenamiento. Al repetir el bloque muchas veces, las representaciones dejan de codificar solo la identidad del token y empiezan a incorporar sintaxis, relaciones semánticas, referencias, estructura del documento y señales útiles para la predicción.[^transformer]

{{ include_html("snippets/temas/llm-contextual-representation.html") }}

La guía sobre [el Transformer](/temas/transformer/) desarrolla esta arquitectura paso a paso.

## 3. El objetivo base es predecir el siguiente token

En un LLM autoregresivo, el entrenamiento optimiza la probabilidad del token real condicionado por los anteriores.

{{ include_html("snippets/temas/llm-next-token.html") }}

El modelo recibe una secuencia y debe asignar alta probabilidad al token real que sigue en cada posición. El gradiente indica cómo modificar millones o miles de millones de parámetros para cometer menos error en el siguiente lote.

A gran escala, resolver bien esa tarea exige aprender regularidades profundas. Para predecir una continuación plausible, el modelo necesita capturar gramática, estilo, relaciones entre conceptos, convenciones de código y parte de la estructura estadística del mundo descrito en los datos.

Eso no convierte la probabilidad en verdad. El objetivo de entrenamiento premia una continuación compatible con el contexto, no una afirmación verificada externamente.

## 4. Preentrenamiento, instrucciones y preferencias no son lo mismo

Un producto conversacional suele pasar por varias etapas.

{{ include_html("snippets/temas/llm-adaptation-stages.html") }}

### Preentrenamiento

El modelo aprende patrones generales a partir de grandes corpus. El resultado es un **modelo base** que completa texto, pero no necesariamente sigue bien una instrucción.

### Ajuste por instrucciones

Se entrena con pares de instrucción y respuesta para que interprete peticiones y adopte formatos útiles. Esta fase transforma la capacidad general de continuación en comportamiento asistencial.

### Optimización por preferencias

Se utilizan comparaciones humanas, modelos de recompensa u otras señales para favorecer respuestas consideradas más útiles, seguras o alineadas con el producto. InstructGPT mostró de forma temprana cómo el ajuste supervisado y el aprendizaje a partir de preferencias podían mejorar el seguimiento de instrucciones sin cambiar el objetivo fundamental de generación.[^instructgpt]

Estas etapas modifican el comportamiento observable. No garantizan que el modelo conozca una fuente, mantenga coherencia durante una operación larga o ejecute acciones de forma fiable.

## Parámetros, contexto y conocimiento externo

Tres mecanismos distintos suelen confundirse.

{{ include_html("snippets/temas/llm-knowledge-layers.html") }}

Un LLM puede responder desde sus parámetros, razonar sobre información incluida en el contexto o llamar a una herramienta. La trazabilidad es muy distinta en cada caso.

Cuando la respuesta debe depender de documentación actual, una arquitectura con recuperación suele ser más verificable que confiar en lo que quedó comprimido durante el entrenamiento. Cuando debe cambiar el estado de otro sistema, hace falta una tool con contrato, validación e idempotencia.

## Por qué la escala ayuda

El rendimiento no depende solo del número de parámetros. También importan la cantidad y calidad de los datos, el cómputo de entrenamiento, la arquitectura, la longitud de contexto y el proceso de adaptación.

Los trabajos sobre *scaling laws* mostraron relaciones predecibles entre pérdida, tamaño del modelo, datos y cómputo. Chinchilla añadió un matiz decisivo: para un presupuesto de entrenamiento dado, aumentar parámetros sin aumentar suficientes tokens puede dejar el modelo infraentrenado.[^gpt3][^chinchilla]

Por eso “más grande” no es una explicación suficiente. La comparación útil exige conocer el régimen de entrenamiento y la tarea de evaluación.

## Qué puede hacer bien un LLM

Un LLM es especialmente útil cuando la tarea admite variación lingüística y el resultado puede verificarse o corregirse:

- transformar y resumir texto
- extraer información con un esquema
- generar borradores y código
- clasificar con instrucciones y ejemplos
- traducir entre representaciones
- coordinar tools mediante argumentos estructurados
- razonar sobre información presente en el contexto

El sistema mejora cuando añade restricciones explícitas, ejemplos, validadores, recuperación y evaluación sobre casos reales.

## Límites que no desaparecen con un prompt mejor

### Generación plausible, no garantía de verdad

El modelo puede producir una afirmación fluida y falsa. La confianza verbal no es una estimación calibrada de corrección.

### Sensibilidad al contexto

Pequeños cambios en instrucciones, orden o ejemplos pueden alterar el resultado. En producción, el prompt es parte del software y necesita pruebas de regresión.

### Conocimiento incompleto o desactualizado

Los parámetros reflejan los datos y la fecha de entrenamiento. Un modelo no conoce automáticamente cambios posteriores ni la documentación privada de una organización.

### Razonamiento no monotónico

Más tokens de razonamiento o más tiempo de inferencia pueden ayudar, pero también introducir deriva, sobrepensamiento o coste sin mejora. La guía de [razonamiento en LLMs](/temas/razonamiento/) separa esas estrategias.

### Falta de estado operacional fiable

El historial conversacional no sustituye a una base de datos. Una operación larga necesita estado explícito, identificadores, reintentos e idempotencia fuera del modelo.

## Cómo evaluar un LLM para un caso real

No basta con elegir el modelo que lidera un benchmark. Una evaluación útil debería medir:

1. la distribución real de entradas
2. la calidad mínima aceptable
3. los fallos costosos
4. la latencia hasta una salida utilizable
5. el coste total del sistema
6. la estabilidad ante reformulaciones
7. la corrección de tools y datos recuperados

La guía de [evaluación de modelos de IA](/temas/evaluacion-modelos/) propone una pila completa desde pruebas estáticas hasta métricas de producto.

## Dónde profundizar en 5sigmas

- [Fundamentos de IA e IA generativa](/series/fundamentos-ia-iag/00_presentacion_serie/) para separar software, aprendizaje y generación
- [De las cavernas a la AGI](/series/from-cave-to-agi/00_presentacion_serie/) para entender cómo representación, aprendizaje y escala convergen en los modelos fundacionales
- [Modelos razonadores](/series/modelos-razonadores/00_presentacion_serie/) para estudiar inferencia, verificación, latencia y fallos
- [Agente reactivo, proactivo y tool calls](/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/) para llevar el modelo a un runtime observable

## Preguntas frecuentes

### ¿Un LLM es una base de datos?

No. Sus parámetros comprimen regularidades aprendidas, pero no ofrecen recuperación exacta, actualización transaccional ni procedencia garantizada. Un sistema puede conectar el LLM con una base de datos o un índice, pero son componentes distintos.

### ¿Un LLM entiende el lenguaje?

Depende de la definición de “entender”. Sus representaciones capturan relaciones sintácticas y semánticas suficientes para resolver tareas complejas. Eso no demuestra experiencia subjetiva ni garantiza una representación causal correcta del mundo.

### ¿Todos los LLMs usan Transformer?

La mayoría de los modelos de lenguaje de propósito general publicados durante la etapa moderna usan Transformers o arquitecturas híbridas cercanas. Existen alternativas basadas en modelos de espacio de estados y otras operaciones, pero “LLM” describe escala y función, no obliga a una arquitectura concreta.

### ¿Qué diferencia hay entre un LLM y un chatbot?

El LLM es el modelo generativo. El chatbot añade interfaz, instrucciones, memoria, recuperación, herramientas, moderación, observabilidad y políticas de producto.

## Fuentes primarias

[^sentencepiece]: Taku Kudo y John Richardson, [*SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing*](https://arxiv.org/abs/1808.06226), 2018.
[^transformer]: Ashish Vaswani et al., [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762), 2017.
[^gpt3]: Tom B. Brown et al., [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165), 2020.
[^chinchilla]: Jordan Hoffmann et al., [*Training Compute-Optimal Large Language Models*](https://arxiv.org/abs/2203.15556), 2022.
[^instructgpt]: Long Ouyang et al., [*Training language models to follow instructions with human feedback*](https://arxiv.org/abs/2203.02155), 2022.
