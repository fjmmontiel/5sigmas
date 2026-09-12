---
title: "Cuantización, paralelismo y compromisos de memoria, rendimiento y calidad"
description: "Qué cambia realmente al cuantizar pesos, activaciones o KV cache, y cómo TP, PP, DP, EP y CP cambian la distribución, la comunicación, la memoria por rank y los dominios de fallo."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "LLM quantization, tensor parallelism, pipeline parallelism, expert parallelism, context parallelism, FP8, INT4, AWQ, GPTQ"
tags:
  - IA
  - LLMs
  - Inferencia
  - Serving
  - GPUs
---

# Capítulo 3 — Cuantización, paralelismo y compromisos de memoria, rendimiento y calidad

Los dos capítulos anteriores separaron el tiempo de **prefill/decode** y el presupuesto de **KV cache**. Ahora aparecen dos palancas que suelen resumirse demasiado:

- «cuantizar el modelo»;
- «ponerlo en más GPUs».

Ninguna describe una configuración completa.

Un checkpoint puede tener pesos de 4 bits y activaciones de 16 bits. El KV cache puede seguir en BF16 o usar FP8 con escalas distintas. Un runtime puede descomprimir pesos antes de una operación o ejecutar un kernel que consume directamente el formato cuantizado. Dos despliegues con `TP=4` pueden comunicarse sobre NVLink/NVSwitch o cruzar nodos por una red mucho más lenta.

La pregunta útil no es «¿cuántos bits?» ni «¿cuántas GPUs?». Es:

> **¿qué tensores reducimos, qué operaciones puede ejecutar el hardware con esa representación, qué estado queda replicado o fragmentado y qué comunicación entra ahora en el camino crítico?**

{{ include_html("snippets/articulos-tecnicos/inference-quantization-parallelism-tradeoffs.html") }}

## Cuantización no significa que todo el modelo tenga la misma precisión

La notación habitual ya contiene información importante.

```text
W4A16  → pesos de 4 bits, activaciones de 16 bits
W8A8   → pesos de 8 bits, activaciones de 8 bits
FP8 KV → KV cache en FP8; no implica pesos FP8
```

TensorRT-LLM expone hoy recetas distintas para FP4, FP8, W4A16/W4A8 con AWQ o GPTQ y cuantización independiente del KV cache.[^trt-quant] vLLM también trata la cuantización de pesos/activaciones y la del KV cache como superficies diferentes.[^vllm-quant][^vllm-kv]

Por tanto, una frase como «modelo INT4» es insuficiente para reproducir un resultado. Como mínimo hay que registrar:

- qué módulos/tensores están cuantizados;
- dtype de pesos;
- dtype de activaciones;
- dtype del KV cache;
- granularidad de las escalas;
- método y datos de calibración si existen;
- módulos mantenidos en mayor precisión;
- formato de empaquetado/layout;
- kernels realmente seleccionados por el runtime;
- hardware y versión del runtime.

## La operación básica introduce error de representación

En una cuantización simétrica sencilla podemos escribir:

\[
q = \operatorname{clip}\left(\operatorname{round}\left(\frac{x}{s}\right),q_{min},q_{max}\right)
\]

\[
\hat{x}=s\,q
\]

con error:

\[
\varepsilon=x-\hat{x}
\]

`q` vive en un conjunto discreto y `s` es una escala. En esquemas asimétricos aparece además un zero-point. En implementaciones reales también importan clipping, rounding, agrupación, outliers, packing y tipos de acumulación.

La granularidad de `s` cambia el compromiso. Una escala global tiene poco metadata pero debe cubrir una distribución más heterogénea. Escalas por canal, grupo, token o bloque pueden adaptarse mejor localmente, a cambio de metadata y operaciones adicionales.

TensorRT-LLM distingue explícitamente, entre otras, escalas per-channel, per-token y per-group.[^trt-mode] La documentación actual de KV cache de vLLM separa escalado por tensor y por attention head, y recomienda calibración con datos para la ruta de mayor precisión.[^vllm-kv]

## Weight-only y weight+activation atacan cuellos distintos

### Weight-only

En `W4A16`, por ejemplo, los pesos se almacenan con menos bits mientras las activaciones conservan una precisión mayor.

Esto reduce con claridad el **carga útil de pesos**. Puede ser especialmente útil cuando mover pesos domina la ejecución, pero el efecto de latencia depende de que exista un kernel eficiente para el formato y del coste de descuantización/empaquetado.

GPTQ es un método de cuantización posentrenamiento sólo de pesos basado en información aproximada de segundo orden.[^gptq] AWQ también es weight-only, pero usa estadísticas de activación para identificar/proteger canales salientes mediante escalado.[^awq]

Las cifras de velocidad publicadas en esos artículos pertenecen a sus modelos, kernels, GPUs y referencias de comparación. No son un multiplicador transferible a cualquier despliegue de 2026.

### Weight + activation

En `W8A8`, pesos **y** activaciones usan menor precisión en las operaciones elegibles. Eso puede reducir tráfico y permitir instrucciones de menor precisión, pero introduce una segunda distribución que hay que representar bien: las activaciones pueden contener outliers difíciles de cuantizar.

SmoothQuant aborda precisamente ese problema moviendo offline parte de la dificultad de cuantizar activaciones hacia los pesos mediante una transformación equivalente, habilitando W8A8 en los experimentos del paper.[^smoothquant]

La documentación actual de vLLM muestra otra frontera importante: en FP8 W8A8 el runtime selecciona entre varios kernels según GPU y checkpoint, y su ruta de cuantización dinámica online calcula escalas durante el forward. La propia documentación advierte que en esa ruta las mejoras de latencia pueden ser limitadas.[^vllm-fp8]

**Menor dtype no es una instrucción de hardware.** El kernel disponible decide si el formato se aprovecha o si aparecen conversiones que reducen o anulan la ganancia.

## El KV cache es una tercera decisión de precisión

El capítulo 4.2 mostró que el KV cache crece con los tokens vivos. Reducir sus bytes por elemento puede aumentar el número de tokens o secuencias residentes sin tocar los pesos.

vLLM soporta actualmente FP8 KV cache con escalas por tensor y, con backends concretos, por attention head. También permite dejar capas sensibles fuera de la cuantización.[^vllm-kv]

Esto cambia el problema de calidad. Un error en pesos afecta muchas operaciones del modelo. Un error en K/V altera el estado que la atención reutiliza a lo largo de la secuencia. Para contextos largos no basta con medir una tarea corta y asumir que el comportamiento será idéntico a 64k o 128k tokens.

Por eso un benchmark de KV-cache quantization debe registrar, al menos:

```text
context-length distribution
attention architecture
KV dtype + scale granularity
calibration dataset/method
layers excluded from quantization
quality/eval suite
TTFT / TPOT / throughput
max live tokens / concurrency
```

## El ahorro ideal de carga útil es fácil; la huella real no

Para `N_w` pesos representados con `b_w` bits, el payload ideal es:

\[
M_{payload}=N_w\frac{b_w}{8}
\]

Pero una representación desplegada se parece más a:

\[
M_{weights,actual}
=
M_{payload}
+M_{scales}
+M_{zero/meta}
+M_{padding/layout}
+M_{unquantized}
\]

A esto todavía hay que sumar KV cache, workspaces, activaciones temporales, allocator state, graph captures y headroom.

### Ejemplo ilustrativo, no benchmark

Supongamos exactamente `70×10^9` parámetros cuantizables y ignoremos por un momento metadata y módulos excluidos.

En 16 bits:

\[
70\times10^9\cdot2\text{ bytes}=140\text{ GB}=130.4\text{ GiB}
\]

En 4 bits, el payload ideal sería:

\[
70\times10^9\cdot0.5\text{ bytes}=35\text{ GB}=32.6\text{ GiB}
\]

Eso es una reducción de **carga útil**, no una afirmación de que un proceso real consumirá exactamente 35 GB ni de que será 4× más rápido.

Si esos pesos cuantizados pudieran fragmentarse perfectamente entre cuatro ranks de tensor parallel, la carga útil ideal media sería:

\[
35\text{ GB}/4=8.75\text{ GB por rank}
\]

Pero el footprint real por rank incluirá escalas, tensores replicados, buffers, KV cache y cualquier parte del modelo que no siga ese sharding. **Cuantización y paralelismo pueden reducir componentes distintos del presupuesto; no convierten automáticamente toda la VRAM en `carga útil / bits / GPUs`.**

## La calidad no se deduce del nombre del esquema

Dos checkpoints `W4A16` pueden conservar calidad de forma muy distinta porque cambian:

- método de cuantización;
- grupos y escalas;
- calibration data;
- capas excluidas;
- tratamiento de outliers;
- arquitectura del modelo;
- distribución de evaluación.

AWQ, GPTQ y SmoothQuant son evidencia de técnicas concretas bajo experimentos concretos, no garantías generales para cualquier checkpoint.[^awq][^gptq][^smoothquant]

Un release gate útil para cuantización debe comparar **el modelo original y el cuantizado bajo el mismo harness**:

```text
same prompts / dataset
same decoding parameters
same max context
same tool/reasoning settings if applicable
same metric implementation
paired outputs when possible
```

Y debe incluir tareas que representen la producción real. Perplexity por sí sola puede detectar degradación de lenguaje, pero no sustituye evals de código, matemáticas, extracción estructurada, tool use o long-context si esas son las cargas de trabajo relevantes.

## Paralelizar significa decidir dónde vive cada parte

Cuando una GPU no puede alojar el modelo o no alcanza el SLO, podemos distribuir el trabajo. Pero «multi-GPU» no describe **qué dimensión** se distribuye.

TensorRT-LLM documenta actualmente tensor, pipeline, data, expert y context parallelism como estrategias distintas de inferencia.[^trt-parallel]

Cada una cambia una relación distinta:

| Estrategia | Qué se distribuye | Qué suele permanecer relacionado por una petición | Coste nuevo dominante a vigilar |
|---|---|---|---|
| Data parallel (DP) | peticiones entre réplicas | una petición puede ejecutarse en una sola réplica | pesos replicados, balanceo y capacidad por réplica |
| Tensor parallel (TP) | tensores de una capa | la misma petición cruza todos los ranks TP | collectives frecuentes + sincronización |
| Pipeline parallel (PP) | grupos de capas | la petición atraviesa etapas | transferencias de activaciones + bubbles/balance |
| Expert parallel (EP) | expertos MoE | tokens se enrutan a expertos remotos | dispatch/all-to-all + imbalance |
| Context parallel (CP) | dimensión de secuencia/contexto | atención necesita combinar estado entre shards | comunicación de K/V/attention + sincronización |

Estas definiciones describen **la dimensión de partición**. La comunicación exacta depende del runtime, del modelo y del algoritmo.

## Data parallel: escala peticiones, no una petición por arte de magia

En data parallel existen varias réplicas capaces de aceptar trabajo distinto.

```text
request A → replica 0
request B → replica 1
request C → replica 2
```

Si cada réplica contiene el modelo completo, el coste obvio es memoria de pesos replicada. A cambio, el throughput agregado puede crecer si existe demanda suficiente y el load balancer reparte bien las peticiones.

DP **no reduce por sí mismo el tiempo de cómputo de una petición individual**: esa petición sigue ejecutándose dentro de una réplica salvo que el runtime combine DP con otra forma de paralelismo.

En serving, DP también puede separar failure domains mejor que un único grupo TP gigante: si una réplica muere, otra podría absorber nuevas peticiones. Pero reintentar una petición en otra réplica, conservar estado y evitar duplicar efectos sigue siendo responsabilidad del sistema de serving; no es una propiedad automática de «DP».

## Tensor parallel: menos tensor por rank, más comunicación dentro de la capa

Tensor parallel fragmenta matrices/tensores de capas entre GPUs. Cada rank calcula una parte y el grupo necesita combinar resultados.

NCCL define operaciones como AllReduce, AllGather y ReduceScatter sobre todos los ranks participantes; todos deben llamar a la operación con contratos compatibles para completar el collective.[^nccl]

La intuición es:

\[
T_{layer,TP}
\approx
T_{compute\ local}
+T_{collective}
+T_{sync}
\]

Al aumentar `TP`, `T_compute local` puede bajar porque cada rank realiza menos trabajo. Pero el collective no desaparece. Cuando el shard local se vuelve pequeño, comunicación y sincronización pueden dominar.

Por eso `TP=8` sobre ocho GPUs conectadas por NVLink/NVSwitch y `TP=8` cruzando nodos sobre una red distinta **no son el mismo experimento**.

vLLM advierte precisamente que el tensor parallel multi-node necesita comunicación GPU↔GPU eficiente y recomienda comprobar si NCCL está usando InfiniBand/GDRDMA o sockets.[^vllm-distributed]

## Pipeline parallel: menos capas por rank, pero la petición atraviesa etapas

Pipeline parallel coloca distintos grupos de capas en distintos ranks:

```text
rank 0: layers 0..n
rank 1: layers n+1..m
rank 2: layers m+1..z
```

La activación sale de una etapa y entra en la siguiente. Eso puede resolver un problema de capacidad cuando una sola GPU no puede alojar todas las capas.

Pero introduce dos nuevos problemas:

1. **balance:** la etapa más lenta limita el pipeline;
2. **bubbles:** si no hay suficiente trabajo solapable, algunas etapas quedan esperando.

En decode autoregresivo de baja concurrencia, donde cada token introduce dependencias secuenciales, esos huecos pueden importar mucho. No debe suponerse que `PP=4` divide la latencia por cuatro.

## Expert parallel: sólo tiene sentido si existen expertos

En un Mixture-of-Experts, el router selecciona un subconjunto de expertos para cada token. Expert parallel distribuye expertos completos entre ranks en lugar de fragmentar cada experto entre todos ellos.

TensorRT-LLM distingue actualmente TP, EP e híbridos para capas MoE.[^trt-ep]

La nueva relación es:

```text
token → router → rank que posee el expert → resultado → combinación
```

Eso suele requerir redistribuir hidden states entre ranks. NCCL expone AllToAll, donde cada rank envía chunks distintos a los demás ranks.[^nccl]

Dos riesgos aparecen inmediatamente:

- **communication volume**, porque los tokens viajan hacia sus expertos;
- **load imbalance**, porque el router no garantiza que todos los expertos reciban el mismo número de tokens.

Por eso el rendimiento de EP depende también de la distribución de routing y de las estrategias de balance/replicación de expertos.

## Context parallel: fragmentar secuencia no fragmenta automáticamente pesos

Context parallel divide la dimensión de secuencia/contexto entre ranks. La dificultad está en atención: los queries locales necesitan información K/V que puede vivir en otros shards.

La documentación de Megatron Core hace explícita esa frontera: CP particiona la secuencia, pero los pesos permanecen duplicados dentro del grupo CP; atención requiere comunicación adicional para reunir/intercambiar K/V.[^megatron-cp]

TensorRT-LLM también expone CP como estrategia de inferencia para contextos largos.[^trt-parallel]

Por tanto, CP puede aliviar memoria/compute asociados a secuencias largas sin equivaler a TP. **CP divide contexto; TP divide tensores del modelo.**

## Las estrategias se componen, pero no con una fórmula universal de memoria

Un deployment puede combinar, por ejemplo, TP + PP + DP. Un MoE puede añadir EP o usar una combinación TP/EP en las capas de expertos. CP puede coexistir con otras dimensiones.

No debemos escribir sin más:

```text
memoria_por_GPU = memoria_total / (TP × PP × DP × EP × CP)
```

porque es falso en general.

- DP replica pesos en lugar de fragmentarlos.
- CP puede replicar pesos y fragmentar estado/secuencia.
- EP sólo afecta las capas de expertos.
- TP puede dejar tensores pequeños o ciertos módulos replicados.
- PP reparte capas, no necesariamente un número idéntico de bytes.
- KV cache puede seguir otra estrategia de sharding.

La forma correcta es construir un **inventario por tensor/estado** y preguntar para cada elemento si está replicado, sharded o ausente en ese rank.

## La interconexión forma parte del modelo de rendimiento

Una comparación multi-GPU que sólo enumera «8×H100» está incompleta.

Hay que registrar:

```text
GPU model + memory
GPUs per node
intra-node fabric (NVLink/NVSwitch/PCIe...)
inter-node NIC + bandwidth
NCCL/version + topology
TP / PP / DP / EP / CP sizes
collective algorithms/settings when material
model + quantization
sequence/batch distribution
```

NCCL es topology-aware y ejecuta collectives dentro y entre GPUs/nodos, pero sigue existiendo un coste de comunicación y sincronización.[^nccl-overview]

Cuando el tiempo por rank baja más rápido que el tiempo de comunicación, escalar deja de ser eficiente. Ese punto depende del workload y la topología; no existe un «número correcto de GPUs» independiente del sistema.

## Cuantización y paralelismo interactúan

Las dos palancas no son independientes.

### Cuantizar puede cambiar la necesidad de paralelismo

Si los pesos dejan de exigir cuatro GPUs sólo para caber, quizá podamos servir una réplica por GPU y usar DP para throughput. Eso puede evitar collectives TP en el camino crítico.

### Paralelizar puede cambiar el valor de cuantizar

Si TP ya divide los pesos, cuantizar puede liberar memoria para más KV cache, batches mayores o menos ranks. Pero si el deployment sigue limitado por comunicación inter-rank, reducir bytes de pesos no garantiza resolver el cuello.

### El formato cuantizado también puede cambiar la comunicación

Dependiendo del runtime, algunas comunicaciones operan sobre tensores en mayor precisión, otras sobre representaciones reducidas y otras exigen conversiones. Eso debe medirse; no puede deducirse sólo de `W4A16`.

Por eso la optimización correcta empieza por el cuello observado:

```text
¿peso no cabe?          → cuantización / TP / PP pueden ayudar de formas distintas
¿KV limita concurrencia? → KV quantization / CP / política de cache
¿decode bandwidth-bound? → weight-only + kernel adecuado puede ayudar
¿prefill compute-bound?  → dtype + kernel de activaciones puede importar más
¿TP communication-bound? → menos ranks / mejor fabric / otra partición
¿MoE imbalance?          → EP placement / routing / expert replication
```

Son hipótesis que deben verificarse, no recetas universales.

## Dominios de fallo: una petición distribuida depende de más componentes

Si una petición necesita cuatro ranks TP para cada capa, perder uno de esos ranks rompe ese grupo de ejecución. Lo mismo ocurre cuando una etapa PP necesaria no está disponible.

Esto no significa que «multi-GPU sea menos fiable» de forma universal. Significa que el **dominio de fallo de una petición** cambia con el placement.

Hay que definir:

- qué ranks son necesarios para completar una petición;
- qué estado puede reconstruirse;
- si existe otra réplica compatible;
- cómo se detecta un rank lento o perdido;
- si se reintenta desde cero o desde estado durable;
- cómo se evita duplicar efectos externos.

La topología de inferencia forma parte del diseño de reliability, no sólo del benchmark.

## Qué medir para elegir una configuración

Una matriz útil no empieza por `bits` o `GPU count`, sino por cuatro capas.

### 1. Footprint

```text
weights per rank
scales / quant metadata
KV bytes per live token
runtime/workspace bytes
headroom
replicated vs sharded bytes
```

### 2. Camino crítico

```text
TTFT
TPOT / ITL
prefill time
decode time
collective time by type
GPU↔GPU / node↔node bytes
kernel time + dequant/quant time
```

### 3. Capacidad

```text
requests/s
tokens/s
SLO goodput
max live tokens
preemptions / queue time
GPU utilization
communication utilization
```

### 4. Calidad y robustez

```text
task metrics vs original checkpoint
long-context eval if KV is quantized
structured-output/tool success if relevant
numerical drift / NaN / overflow incidents
failure/retry behavior by parallel group
```

## Contrato para benchmarks reproducibles

Para comparar dos configuraciones hay que fijar o reportar:

- checkpoint y revision exactos;
- tokenizer;
- runtime + commit/version;
- quantization recipe completa;
- calibration dataset y seed si aplica;
- GPU y driver/CUDA;
- interconexión/topología;
- TP/PP/DP/EP/CP;
- scheduler/batching;
- KV dtype;
- `(L_in,L_out)` y distribución de requests;
- concurrencia/request rate;
- warmup;
- número de repeticiones;
- mediana y percentiles, no sólo una media;
- calidad bajo el mismo harness.

Si cambia simultáneamente hardware, runtime, quantizer, número de GPUs y workload, el resultado es un benchmark de **dos stacks completos**, no una estimación causal del efecto de INT4 o TP.

## Evals deterministas antes del benchmark

También existen invariantes que pueden comprobarse sin afirmar rendimiento.

### Cuantización

```text
reported weight dtype == loaded weight representation
scale shape matches declared granularity
excluded modules remain in intended dtype
KV dtype matches runtime configuration
quantized checkpoint produces finite outputs
```

### Placement

```text
every required layer/tensor has exactly the intended owner(s)
TP shards reconstruct expected logical tensor shape
PP stage boundaries preserve activation contract
EP expert ownership matches router destination map
CP shards cover the intended sequence domain
```

### Collectives

```text
all participating ranks enter compatible collective calls
message shape/dtype match the algorithm contract
one missing rank cannot silently produce a successful request
```

NCCL advierte que collectives llamados de forma incompatible entre ranks pueden terminar en hangs, crashes o corrupción; esta coordinación es una propiedad del sistema distribuido, no del modelo.[^nccl]

## Implicación de producción: optimiza la restricción, no el nombre de la técnica

Cuantización y paralelismo son mecanismos para redistribuir costes:

\[
\text{representación}
\rightarrow
\text{bytes + error + kernels}
\]

\[
\text{placement}
\rightarrow
\text{memoria por rank + comunicación + sincronización}
\]

El objetivo de producción es encontrar una configuración que satisfaga simultáneamente:

\[
\text{fit} \land \text{quality} \land \text{latency SLO} \land \text{goodput} \land \text{reliability}
\]

Reducir bits puede ser correcto aunque no acelere, si permite que un modelo quepa o libera KV capacity. Añadir GPUs puede ser correcto aunque el scaling no sea lineal, si reduce memoria por rank o permite un modelo mayor. Pero ninguna decisión debe justificarse sólo con «INT4» o «8 GPUs».

En el siguiente capítulo veremos dos optimizaciones que modifican trabajo **reutilizado o evitado**: **prefix caching** y **speculative decoding**. Allí la pregunta ya no será sólo dónde viven los bytes o en cuántos ranks se ejecuta el modelo, sino cuánto trabajo podemos no repetir y cuánto trabajo especulativo merece la pena verificar.

## Referencias

[^trt-quant]: NVIDIA TensorRT-LLM, **Quantization**. Recetas FP4/FP8, W4A16/W4A8 AWQ/GPTQ y KV-cache quantization. https://nvidia.github.io/TensorRT-LLM/features/quantization.html

[^trt-mode]: NVIDIA TensorRT-LLM, **Quantization mode**. Flags de weights/activations, per-channel, per-token, per-group y KV-cache quantization. https://nvidia.github.io/TensorRT-LLM/_modules/tensorrt_llm/quantization/mode.html

[^vllm-quant]: vLLM, **Quantization**. Métodos soportados y matriz hardware/formato. https://docs.vllm.ai/en/latest/features/quantization/

[^vllm-fp8]: vLLM, **FP8 W8A8**. Hardware, kernel selection y cuantización dinámica. https://docs.vllm.ai/en/latest/features/quantization/llm_compressor/fp8/

[^vllm-kv]: vLLM, **Quantized KV Cache**. FP8 KV, granularidad de escalas, calibración y exclusión de capas. https://docs.vllm.ai/en/latest/features/quantization/quantized_kvcache/

[^gptq]: Frantar et al., **GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers**, 2022. https://arxiv.org/abs/2210.17323

[^awq]: Lin et al., **AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration**, MLSys 2024. https://arxiv.org/abs/2306.00978

[^smoothquant]: Xiao et al., **SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models**, ICML 2023. https://arxiv.org/abs/2211.10438

[^trt-parallel]: NVIDIA TensorRT-LLM, **Parallelism in TensorRT-LLM**. TP, PP, DP, EP, CP y Wide-EP para inferencia distribuida. https://nvidia.github.io/TensorRT-LLM/features/parallel-strategy.html

[^trt-ep]: NVIDIA TensorRT-LLM, **Expert Parallelism**. Diferencia entre TP, EP e híbrido en capas MoE. https://nvidia.github.io/TensorRT-LLM/legacy/advanced/expert-parallelism.html

[^nccl]: NVIDIA NCCL, **Collective Operations**. Semántica de AllReduce, AllGather, ReduceScatter y AllToAll, y requisito de participación compatible entre ranks. https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html

[^nccl-overview]: NVIDIA NCCL, **Overview**. Primitivas topology-aware de comunicación GPU↔GPU y sincronización. https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/overview.html

[^vllm-distributed]: vLLM, **Distributed Inference and Serving**. TP/PP y consideraciones de comunicación multi-node/NCCL. https://docs.vllm.ai/en/latest/serving/distributed_serving/

[^megatron-cp]: NVIDIA Megatron Core, **Context Parallel Package**. Partición de secuencia, replicación de pesos dentro del dominio CP y comunicación de atención. https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/features/context_parallel.html
