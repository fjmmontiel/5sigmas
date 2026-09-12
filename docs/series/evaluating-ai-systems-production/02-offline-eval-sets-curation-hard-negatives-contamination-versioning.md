---
title: "Offline eval sets: curación, hard negatives, contaminación y versionado"
description: "Cómo construir conjuntos de evaluación offline que sigan midiendo el comportamiento que importa: procedencia, cobertura, hard negatives, leakage, contaminación, holdouts y versionado reproducible."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "offline evals, dataset curation, hard negatives, data contamination, eval versioning, benchmark leakage, holdout, AI evaluation"
tags:
  - IA
  - Evaluación
  - Datasets
  - Producción
  - Reliability
---

# Capítulo 2 — Offline eval sets: curación, hard negatives, contaminación y versionado

Un conjunto offline no es una carpeta de ejemplos que «parecen representativos». Es un **instrumento de medida versionado**.

Si sus casos son ambiguos, demasiado fáciles, duplicados entre splits, conocidos por el sistema durante el desarrollo o mutados sin dejar rastro, el número final puede ser reproducible y aun así responder a la pregunta equivocada.

La pregunta de este capítulo es concreta:

> **¿Cómo construimos un eval set que mida una hipótesis real, encuentre fallos útiles y conserve significado cuando el sistema y los datos cambian?**

La respuesta exige separar cinco problemas:

1. de dónde salen los casos;
2. qué cobertura pretendemos;
3. cómo construimos casos difíciles sin convertir el set en una colección de rarezas;
4. qué exposición o leakage puede invalidar una conclusión;
5. qué versión exacta de datos, labels y protocolo produjo cada resultado.

NIST AITE ofrece un extremo útil de este diseño: datos ciegos dentro de un entorno *sequestered* para reducir el riesgo de contaminación train/test.[^nist-aite] En el otro extremo, los equipos de producto suelen trabajar con bancos internos que crecen a partir de bugs y feedback. Ambos enfoques sólo son útiles si conocemos la procedencia y la historia de cada caso.

{{ include_html("snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html") }}

## El objeto correcto: una versión del eval, no «el dataset»

Representemos una release de evaluación como:

\[
D_v = \{(id_i, x_i, y_i, m_i, p_i)\}_{i=1}^{N_v}
\]

Donde:

- `v` identifica una versión inmutable;
- `id_i` es un identificador estable del caso;
- `x_i` contiene task/input y, cuando corresponda, el estado inicial del entorno;
- `y_i` contiene referencia, criterios de éxito o checks esperados;
- `m_i` contiene metadatos necesarios para estratificar y reproducir;
- `p_i` contiene la procedencia: fuente, fecha, permisos, transformaciones y lineage.

Esta definición evita un error común: llamar `eval_v1` a un fichero que cambia en sitio. Si cambia un item, una label, un split o una transformación que afecta al resultado, ya no estamos midiendo exactamente con `D_v`.

### La unidad mínima debe poder auditarse

Un caso debería permitir reconstruir, al menos:

```text
item_id
source_id / provenance
source_snapshot_or_timestamp
split
capability_or_risk_tags
input / initial_state
reference_or_success_criteria
labeling_guideline_version
transform_pipeline_version
created_at / reviewed_at
```

No todos los campos tienen que vivir en el mismo fichero. Sí deben poder resolverse desde el manifest de la versión.

## Empieza por una hipótesis de cobertura

«Representativo» no significa «aleatorio» por defecto.

Antes de muestrear, define qué distribución o qué regiones de riesgo quieres observar. En un asistente de soporte, por ejemplo, quizá importen:

- intención: devolución, envío, facturación, cuenta;
- complejidad: una política, varias políticas, conflicto entre políticas;
- dependencia: sin tool, una tool, varias tools;
- riesgo: reversible, efecto externo, acción sensible;
- idioma, longitud y ruido del input;
- estado: cliente elegible, casi elegible, no elegible.

La cobertura puede modelarse como estratos `z`:

\[
D_v = \bigcup_{z \in Z} D_{v,z}
\]

pero el tamaño de cada estrato debe seguir la pregunta de evaluación. Si queremos estimar rendimiento de producción, necesitamos pesos que se aproximen a la distribución relevante. Si queremos encontrar regresiones raras y costosas, puede ser correcto sobrerrepresentar esas regiones y **no** interpretar después el promedio como tasa de producción.

La regla es sencilla:

> **la política de muestreo forma parte de la métrica.**

Un 92% calculado sobre un banco deliberadamente adversarial y un 92% sobre tráfico estratificado no significan lo mismo.

## De dónde sacar casos

Un eval set sano suele mezclar varias fuentes porque cada una descubre fallos diferentes.

### 1. Casos de producción depurados

Bugs, escalados, tickets y traces fallidos aportan realismo.

Ventaja: están cerca del riesgo que ya existe.

Riesgo: si sólo convertimos fallos conocidos en tests, la suite se convierte en un archivo histórico y no explora fallos vecinos.

### 2. Casos diseñados por expertos

Permiten cubrir invariantes, políticas, seguridad y esquinas que todavía no aparecieron en tráfico.

Ventaja: control del mecanismo.

Riesgo: los autores pueden introducir artefactos lingüísticos o supuestos que no existen en uso real.

### 3. Casos generados o transformados

Podemos variar entidades, cantidades, orden, ruido, tool state o restricciones.

Ventaja: ampliar cobertura de forma barata.

Riesgo: muchas variantes sintéticas no equivalen a nuevas situaciones. Mil paráfrasis del mismo mecanismo no son mil unidades independientes de evidencia.

### 4. Casos adversariales / hard negatives

Buscan una frontera donde el sistema debería cambiar de decisión.

Dynabench formalizó una variante de esta idea con creación de datos *human-and-model-in-the-loop*: los anotadores intentan producir ejemplos que engañen al modelo objetivo pero sigan siendo válidos para una persona.[^dynabench] Adversarial NLI usó un procedimiento iterativo relacionado para construir ejemplos difíciles frente a modelos sucesivos.[^anli]

La lección no es «usa adversarial data siempre». Es que **la dificultad puede diseñarse alrededor de un fallo concreto y validarse de nuevo**, en lugar de asumir que ejemplos aleatorios cubrirán esa frontera.

## Qué es un hard negative útil

Un *hard negative* no es simplemente «un ejemplo difícil».

Es especialmente útil cuando mantiene casi todo constante y cambia una condición que debería cambiar la decisión correcta.

Ejemplo de soporte:

```text
A: pedido entregado hace 29 días + producto intacto → devolución permitida
B: pedido entregado hace 31 días + producto intacto → devolución no permitida
```

Si la política relevante fija el límite en 30 días, el par obliga al sistema a usar la variable causal y no una heurística como «menciona devolución → aprobar».

Podemos representar un par como:

\[
(x_i^{+}, x_i^{-}), \qquad
\Delta(x_i^{+},x_i^{-}) \approx \Delta^*_i
\]

Donde `Δ*` es la mínima diferencia que justifica el cambio de label. El símbolo `≈` es deliberado: en lenguaje y sistemas reales casi nunca podemos garantizar identidad perfecta de todas las demás variables.

Una señal de consistencia pareada puede ser:

\[
PC = \frac{1}{K}\sum_{i=1}^{K}
\mathbf{1}[f(x_i^{+})=y_i^{+} \land f(x_i^{-})=y_i^{-}]
\]

`PC` no sustituye la accuracy global. Responde a otra pregunta: **¿el sistema mantiene la decisión correcta a ambos lados de una frontera diseñada?**

### Hard no significa raro

Un caso puede ser difícil porque:

- exige discriminar una condición casi idéntica;
- combina dos reglas que entran en conflicto;
- contiene evidencia relevante junto a un distractor plausible;
- requiere no actuar;
- obliga a recuperar correctamente tras un fallo parcial;
- rompe una correlación espuria que funcionaba en ejemplos fáciles.

No necesitamos llenar el set de acertijos. Necesitamos presión donde el sistema podría aprender el atajo equivocado.

## El anti-patrón: generar hard negatives sólo contra el modelo actual

Si todos los casos difíciles se seleccionan porque `model_A` falla, el dataset queda condicionado por `model_A`.

Eso puede ser útil para diagnóstico, pero crea dos riesgos:

1. medir una futura versión casi exclusivamente sobre las debilidades de una versión anterior;
2. confundir «derrota a este modelo» con «representa un riesgo importante del producto».

Dynabench aborda explícitamente la naturaleza dinámica del benchmark: los modelos y la recogida de datos se retroalimentan.[^dynabench] Esa dinámica es una propiedad del protocolo, no una licencia para mezclar rondas sin identificarlas.

En producción conviene guardar el origen del hard case:

```text
hardness_source: human | production_failure | model_adversarial | transform
hardness_target: model_revision | workflow_revision | policy_boundary
round: 2026-09-r2
```

Así podemos saber si una mejora generaliza o sólo resuelve el generador que creó el set.

## Cuatro tipos de contaminación que no debemos mezclar

«Contaminación» se usa para fallos distintos. Conviene nombrarlos por separado.

### 1. Exposición de entrenamiento

El contenido del test —o material suficientemente cercano— pudo estar presente en pretraining, fine-tuning o distillation.

Esto importa especialmente al interpretar benchmarks públicos. Un resultado alto puede combinar generalización y memoria, y desde fuera rara vez podemos demostrar ausencia total de exposición.

NIST AITE reduce este riesgo manteniendo datos de evaluación ciegos en un entorno sequestered.[^nist-aite]

LiveBench usa otra estrategia: introduce preguntas nuevas periódicamente y se apoya en fuentes recientes con respuestas objetivamente verificables para limitar la contaminación potencial.[^livebench]

Ninguna de las dos estrategias demuestra una propiedad universal de «contamination-free». Reducen una clase concreta de exposición bajo su protocolo.

### 2. Leakage entre splits

El mismo caso, una variante casi idéntica o la misma entidad/plantilla puede cruzar de authoring/dev a holdout.

El duplicado exacto es el caso fácil. Más peligrosos son:

- paráfrasis del mismo item;
- varias ventanas del mismo documento;
- issues del mismo repositorio con solución compartida;
- conversaciones del mismo usuario repartidas entre splits;
- variantes sintéticas derivadas del mismo seed;
- un estado inicial y su estado final separados en train/test.

Por eso la unidad de split no siempre debe ser una fila. Puede ser `document_id`, `customer_id`, `repo_id`, `incident_family` o `generation_seed`.

### 3. Leakage de desarrollo

El test puede no estar en el entrenamiento del modelo y aun así dejar de ser un holdout.

Ocurre cuando el equipo:

- lee repetidamente los fallos del test final;
- ajusta prompt/policy contra esos mismos items;
- selecciona el modelo mirando cada iteración sobre el test;
- modifica el grader para acomodar outputs observados allí.

Después de suficientes iteraciones, el equipo ha optimizado el sistema contra el set, aunque nunca haya hecho gradient descent sobre él.

La solución práctica es separar **dev/calibration** de **holdout/release** y limitar quién y cuándo puede inspeccionar el holdout.

### 4. Leakage temporal o de futuro

Si la task pretende reproducir una decisión en tiempo `t`, no puede usar datos que sólo existían después de `t`.

Ejemplos:

- RAG evaluado con un corpus posterior al ticket;
- predicción de incidentes con postmortems escritos después;
- research agent evaluado con una web snapshot que contiene la respuesta publicada después del cutoff.

La fecha de snapshot es parte del caso.

## Un scanner de duplicados no certifica ausencia de contaminación

Podemos definir un audit de overlap:

\[
O_{\tau}(A,B)
=\frac{1}{|B|}\sum_{b\in B}
\mathbf{1}\left[\max_{a\in A} sim(a,b) \ge \tau\right]
\]

Es útil para encontrar candidatos a leakage. No es una prueba de «dataset limpio».

El resultado depende de:

- representación usada;
- función `sim`;
- umbral `τ`;
- normalización;
- unidad comparada;
- información de procedencia disponible.

Un exact-match scan tiene pocos falsos positivos y pierde paráfrasis. Un embedding scan puede encontrar equivalencia semántica y también marcar casos legítimamente similares. La revisión de procedencia sigue siendo necesaria.

El informe técnico de GPT-4 es un ejemplo histórico de por qué la contaminación se reporta como análisis metodológico y no como un booleano mágico: OpenAI midió overlap entre benchmarks y datos de entrenamiento y separó resultados contaminados/no contaminados bajo su detector, con limitaciones explícitas.[^gpt4-report]

## Splits que preservan la unidad causal

El split debe seguir la dependencia que podría filtrar información.

Supongamos un dataset de RAG con 20 preguntas por documento. Un split aleatorio por pregunta puede colocar 15 preguntas de un documento en dev y 5 del mismo documento en test. El test ya no pregunta «¿generaliza a documentos no vistos por el proceso de desarrollo?». Pregunta algo más estrecho.

Según el objetivo, podríamos necesitar:

```text
split_unit: document_id
```

Para un coding agent:

```text
split_unit: repository + issue_family
```

Para soporte:

```text
split_unit: policy_version + incident_family
```

No hay una unidad universal. Debe corresponder al canal por el que una solución puede transferirse artificialmente entre splits.

## Dev, regression bank y holdout cumplen funciones diferentes

Una organización útil separa al menos tres bancos.

### Dev / calibration set

Visible durante construcción.

Sirve para:

- escribir tareas;
- depurar graders;
- inspeccionar transcripts;
- iterar prompts/policies;
- descubrir casos rotos.

No debe presentarse después como evidencia independiente de la mejora que ayudó a diseñar.

### Regression bank

Casos conocidos que el sistema ya debería pasar.

Anthropic distingue capability evals de regression evals y señala que los casos que antes medían capacidad pueden convertirse en regresiones al estabilizarse.[^anthropic-evals]

Su objetivo es detectar que una propiedad ya adquirida se rompió.

### Holdout / release set

No debería participar en cada iteración de producto.

Sirve para confirmar que una decisión tomada con dev + regresiones generaliza a casos no usados para optimizarla.

Un holdout que todo el equipo inspecciona a diario deja de actuar como holdout aunque el fichero se siga llamando `holdout.jsonl`.

## Un cuarto banco puede ser útil: challenge rotatorio

Los sistemas y los modelos saturan evals estáticas.

LiveBench ilustra una estrategia pública de rotación: nuevas preguntas periódicas y fuentes recientes para limitar exposición y mantener dificultad.[^livebench]

En producto podemos aplicar el mismo principio sin copiar el benchmark:

- conservar una release estable para comparabilidad longitudinal;
- añadir un challenge bank fresco para encontrar capacidades/fallos nuevos;
- no mezclar ambos promedios sin etiquetar la versión y composición.

Esto evita elegir entre dos objetivos que compiten: **comparabilidad histórica** y **frescura**.

## Versionar significa poder reconstruir el resultado

Un score sin identidad de dataset es evidencia incompleta.

Como mínimo registra:

```text
eval_suite: support-policy
dataset_version: 3.2.0
manifest_sha256: ...
split: release
item_count: ...
source_snapshot: ...
labeling_guidelines: 7
transform_pipeline: 4
model_revision: ...
workflow_revision: ...
grader_revision: ...
harness_revision: ...
```

Hugging Face Datasets permite fijar una revisión concreta de un dataset mediante tag, branch o commit SHA, y mantiene fingerprints derivados del estado de los datos y de transformaciones aplicadas.[^hf-load][^hf-fingerprint] Es un mecanismo útil de reproducibilidad, pero un fingerprint técnico **no sustituye** la semántica de versión de nuestra evaluación.

Dos datasets pueden tener hashes distintos por un cambio de orden irrelevante. Y, al revés, mantener un nombre como `v3` no sirve si el contenido se modifica silenciosamente.

### Manifest canónico

Una práctica robusta es construir un manifest ordenado y hashearlo:

\[
H_v = SHA256(canonical\_manifest(D_v))
\]

El manifest puede contener IDs, hashes de payload, split, source revision, label revision y transform revision.

La función exacta importa menos que dos propiedades:

1. el mismo input produce la misma identidad;
2. cualquier cambio material queda visible y obliga a una nueva identidad.

## Qué cambios exigen nueva versión

No todo cambio tiene la misma semántica.

### Patch

Corrección que no pretende cambiar la task:

- typo en metadata;
- caption que no usa el grader;
- reparación de enlace de provenance.

Aun así cambia el hash del artefacto y debe quedar registrada.

### Minor

Añade o modifica cobertura manteniendo el constructo principal:

- nuevos items;
- nuevos hard negatives;
- nueva región/idioma;
- retirada de casos inválidos.

No debemos comparar promedios de `v3.1` y `v3.2` como si el denominador fuese idéntico sin recomputar ambos sistemas sobre la misma versión.

### Major

Cambia qué significa éxito o la frontera medida:

- nueva rúbrica;
- nuevo outcome;
- cambio de política que redefine labels;
- pasar de single-turn a workflow completo;
- nuevo entorno o tool contract.

Esto es una nueva evaluación aunque conserve un nombre de producto parecido.

La convención `major.minor.patch` es sólo un ejemplo. Lo importante es documentar la semántica.

## No reetiquetes el pasado en silencio

Supongamos que descubrimos que 12 items tenían un label erróneo.

Hay dos preguntas diferentes:

1. ¿qué resultado produjo el sistema bajo `D_3.1` tal como existía entonces?
2. ¿qué resultado produce ese mismo sistema bajo `D_3.1.1` corregido?

Reescribir el histórico borra la primera respuesta.

Una práctica reproducible conserva:

- la release original;
- el patch corregido;
- un changelog de items añadidos/retirados/relabelled;
- resultados recalculados cuando necesitamos comparar sistemas sobre la misma base.

## Curar no es sólo filtrar; es buscar artefactos

Un dataset puede parecer diverso y permitir un atajo trivial.

Antes de confiar en él, intenta modelos/baselines absurdamente simples:

- longitud del input;
- palabras o plantillas asociadas a una label;
- presencia de tool names;
- posición de la respuesta correcta;
- metadata accidental;
- formato de filenames;
- estilo distinto entre positivos y negativos.

Si una heurística barata predice la label, el problema puede ser el dataset y no el sistema evaluado.

Adversarial NLI y Dynabench nacieron precisamente de la observación de que datasets estáticos pueden contener patrones explotables y saturarse, y usan interacción con modelos para buscar ejemplos que rompen esas heurísticas.[^anli][^dynabench]

## Referencias válidas y tasks resolubles

Anthropic recomienda construir tareas no ambiguas y disponer de una solución de referencia conocida que pase los graders; una tasa de fallo extrema puede indicar task o grader roto, no sólo incapacidad del agente.[^anthropic-evals]

Eso sugiere un gate previo a admitir un item:

```text
source/provenance valid
→ task understandable
→ reference solution exists
→ grader accepts reference
→ no forbidden leakage
→ split assignment valid
→ item versioned
```

Un hard case sin solución verificable es simplemente ruido difícil.

## Tres ejemplos de diseño

### Caso A — Retriever para políticas internas

Queremos medir si un retriever encuentra la política correcta.

Diseño:

- split por `policy_document_id`, no por query;
- positivos con evidencia explícita;
- hard negatives con política vecina pero incorrecta;
- snapshot del corpus fijado;
- dev visible y holdout por documentos no usados en tuning;
- métrica local de retrieval y confirmación end-to-end posterior.

Si una nueva política entra en producción, el eval debe registrar si pertenece a la siguiente release o a un challenge bank, no aparecer silenciosamente dentro de `v1`.

### Caso B — Agente de soporte y límite de elegibilidad

Queremos evitar aprobaciones incorrectas cerca de una frontera de política.

Construimos pares:

```text
29 días → allow
31 días → deny
```

pero también variamos tipo de producto, idioma y historial para comprobar que el sistema no memorizó una plantilla.

El hard pair mide sensibilidad a la frontera. Un banco de tráfico estratificado mide el rendimiento general. No mezclamos ambas distribuciones en un único porcentaje sin declarar pesos.

### Caso C — Coding agent

Queremos evaluar correcciones de bugs de repositorio.

Riesgos de leakage:

- issues relacionados del mismo repositorio;
- commits posteriores que contienen la solución;
- tests añadidos después de la fecha de la task;
- clones o forks en splits distintos.

La unidad de provenance necesita repo, commit base, issue family, fecha y test revision. Un snapshot mutable de `main` no es una task reproducible.

## Checklist de admisión de un item

Antes de aceptar un caso en una release offline:

1. **¿Qué hipótesis o riesgo cubre?**
2. **¿Cuál es su source/provenance y tenemos derecho a usarlo?**
3. **¿Qué unidad debe permanecer junta para evitar leakage entre splits?**
4. **¿Existe una referencia o criterio de éxito verificable?**
5. **¿El grader acepta la referencia y rechaza un fallo obvio?**
6. **¿Es un caso normal, una regresión, un hard negative o un challenge?**
7. **¿Ha sido usado para tuning o inspeccionado durante desarrollo?**
8. **¿Qué snapshot temporal necesita?**
9. **¿Qué versión de guideline/transform produjo su label?**
10. **¿Qué item_id y hash permiten reconstruirlo?**

Si no podemos responder a la séptima pregunta, tampoco podemos afirmar que sea un holdout limpio.

## Qué reportar con un resultado offline

No publiques sólo:

```text
accuracy = 87.4%
```

Acompáñalo de:

```text
dataset_version / manifest hash
split + access policy
sampling / strata / weights
item count
source snapshot / cutoff
known contamination status
model + workflow + harness + grader revisions
number of trials where relevant
metric definition
excluded / invalid items with reason
```

Y cuando compares dos sistemas, evalúalos sobre **la misma release** salvo que el propósito sea estudiar cambio de distribución.

## Implicación de producción

Un eval set offline sano tiene dos propiedades que parecen contradictorias:

- es suficientemente **estable** para detectar regresiones y comparar versiones;
- es suficientemente **vivo** para incorporar fallos nuevos, cambios de producto y amenazas de saturación.

La forma de resolver esa tensión no es mutar el mismo fichero para siempre. Es mantener una familia de artefactos con roles distintos:

```text
dev / calibration
regression bank
frozen release holdout
rotating challenge bank
```

Cada uno tiene una política de acceso, un propósito y una identidad.

El principio central es:

> **la dificultad sin provenance es ruido; la frescura sin versionado rompe comparabilidad; un holdout usado para optimizar deja de ser un holdout.**

En el siguiente capítulo veremos otra fuente de incertidumbre: incluso con un dataset bien construido, el resultado depende de cómo juzgamos los outputs y de cuánto acuerdo existe entre graders humanos y automáticos.

## Referencias

[^anthropic-evals]: Anthropic Engineering, *Demystifying evals for AI agents*, 9 Jan 2026. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[^nist-aite]: NIST, *Announcing NIST's Artificial Intelligence Technology Evaluation (AITE)*, 27 Jul 2026. https://www.nist.gov/news-events/news/2026/07/announcing-nists-artificial-intelligence-technology-evaluation-aite
[^dynabench]: Douwe Kiela et al., *Dynabench: Rethinking Benchmarking in NLP*, NAACL 2021. https://aclanthology.org/2021.naacl-main.324/
[^anli]: Yixin Nie et al., *Adversarial NLI: A New Benchmark for Natural Language Understanding*, ACL 2020. https://aclanthology.org/2020.acl-main.441/
[^livebench]: LiveBench project, official repository and release changelog; monthly refreshed questions are used to limit potential contamination. https://github.com/LiveBench/LiveBench
[^hf-load]: Hugging Face Datasets, *Load*; `revision` can pin a tag, branch or commit hash. https://huggingface.co/docs/datasets/main/loading
[^hf-fingerprint]: Hugging Face Datasets, *The cache*; dataset fingerprints track data state and transforms. https://huggingface.co/docs/datasets/main/about_cache
[^gpt4-report]: OpenAI, *GPT-4 Technical Report*, 2023; contamination analysis and benchmark overlap methodology. https://cdn.openai.com/papers/gpt-4.pdf
