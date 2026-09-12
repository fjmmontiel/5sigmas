---
title: "KV cache, jerarquía de memoria, continuous batching y PagedAttention"
description: "Cómo el KV cache convierte la memoria en un límite de capacidad, cómo PagedAttention separa bloques lógicos y físicos, y cómo continuous batching usa esa capacidad petición a petición."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "KV cache, PagedAttention, continuous batching, LLM serving, GPU memory, memory hierarchy, inference"
tags:
  - IA
  - LLMs
  - Inferencia
  - Serving
  - Memoria
---

# Capítulo 2 — KV cache, jerarquía de memoria, continuous batching y PagedAttention

El capítulo anterior separó **prefill**, **decode** y el scheduler. Ahora aparece una restricción que conecta las tres piezas: **cada secuencia activa necesita estado reutilizable y ese estado ocupa memoria mientras la petición siga viva**.

Por eso dos despliegues sobre el mismo tipo y número de GPUs pueden admitir cantidades muy distintas de trabajo simultáneo según:

- cuántos tokens vivos mantienen en KV cache;
- qué arquitectura de atención usa el modelo;
- qué dtype tiene el cache;
- cómo asigna bloques el runtime;
- cuándo libera o reutiliza esos bloques;
- qué política usa para admitir, pausar o expulsar peticiones;
- y si mueve estado a una memoria más lenta.

El problema de producción no es simplemente «¿cabe el modelo?». Es:

> **¿cuánto estado de atención puede permanecer disponible para las secuencias activas sin convertir la memoria en el cuello de botella del scheduler?**

{{ include_html("snippets/articulos-tecnicos/inference-kv-cache-paging-batching.html") }}

## Qué guarda realmente el KV cache

En atención causal, cuando el modelo ya ha procesado un token, las proyecciones **K** y **V** de ese token no necesitan recalcularse desde cero en cada paso posterior. El runtime puede conservarlas y reutilizarlas durante decode.

Para una capa de atención podemos representar el siguiente paso como:

\[
\operatorname{Attn}(q_t, [K_{1:t-1}, k_t], [V_{1:t-1}, v_t])
\]

Los términos `K_{1:t-1}` y `V_{1:t-1}` son el estado reutilizado. Hugging Face documenta esta misma estructura: el cache se actualiza por capa y concatena las nuevas claves y valores con el estado anterior durante generación.[^hf-cache]

Esta memoria compra cómputo: evita volver a proyectar K/V de todos los tokens anteriores en cada paso. Pero no es gratuita. Mientras una secuencia siga necesitando esos tokens, su estado debe estar accesible desde la atención.

## Una fórmula útil para estimar memoria — con límites explícitos

Para un transformer autoregresivo de atención completa donde cada capa guarda K y V con forma estándar, una estimación del KV cache de **una secuencia** es:

\[
M_{KV}(T)
=
T\cdot L\cdot2\cdot H_{KV}\cdot d_h\cdot b
\]

donde:

- `T` es el número de tokens cuyo estado sigue cacheado;
- `L` es el número de capas que almacenan KV;
- `2` representa K y V;
- `H_KV` es el número de heads de key/value;
- `d_h` es la dimensión por head;
- `b` son los bytes por elemento del cache.

Para varias secuencias vivas, la primera aproximación suma sus tokens cacheados:

\[
M_{KV,live}\approx\sum_i M_{KV}(T_i)
\]

Pero esta fórmula **no es universal**. Cambia cuando aparecen MQA/GQA, sliding-window attention, chunked attention, MLA, capas recurrentes, KV sharing entre capas, cuantización del cache o reutilización de prefijos. La documentación actual de vLLM dedica un gestor híbrido precisamente a modelos donde distintas capas necesitan geometrías de cache diferentes.[^vllm-hybrid]

### Ejemplo ilustrativo, no benchmark

Supongamos una arquitectura ficticia con:

```text
L        = 32 capas
H_KV     = 8 heads KV
d_h      = 128
cache    = BF16 = 2 bytes/element
```

Entonces:

\[
M_{KV/token}
=32\cdot2\cdot8\cdot128\cdot2
=131072\text{ bytes}
=128\text{ KiB/token}
\]

Una sola secuencia con `8192` tokens cacheados necesitaría:

\[
8192\cdot128\text{ KiB}=1\text{ GiB}
\]

sólo para ese KV cache bajo esas hipótesis.

Si mantuviéramos todo igual pero usáramos `H_KV=32`, la cifra sería `512 KiB/token` y `4 GiB` para `8192` tokens. El ejemplo enseña por qué **GQA/MQA pueden cambiar drásticamente el coste de estado**: reducen el número de heads K/V respecto a MHA.

Estas cifras no incluyen pesos, activaciones/workspaces del runtime, allocator metadata, fragmentación, padding, graph capture ni headroom operativo. No deben interpretarse como «VRAM total necesaria».

## La VRAM disponible para KV no es la VRAM de la GPU

Un presupuesto más realista separa:

\[
M_{GPU}
=
M_{weights}
+M_{runtime}
+M_{KV}
+M_{headroom}
\]

`M_runtime` agrupa buffers temporales, workspaces, kernels, graph captures y otros estados del engine. `M_headroom` evita operar exactamente en el límite de memoria.

La capacidad de serving depende de **qué parte del presupuesto queda realmente para tokens KV activos**. TensorRT-LLM expone esta frontera de manera explícita: su gestor reserva una fracción configurable de memoria GPU libre para KV cache y puede limitarla además por número de tokens.[^trt-kv]

Por tanto, «GPU de 80 GB» no equivale a «80 GB para contexto». Primero hay que descontar el resto del sistema.

## El problema de una reserva contigua máxima

Imaginemos tres peticiones con el mismo máximo declarado de `8k`, pero longitudes realizadas muy distintas:

```text
A: máximo 8k, termina en 1.2k
B: máximo 8k, termina en 7.6k
C: máximo 8k, termina en 2.0k
```

Si el runtime tuviera que reservar un tensor contiguo de `8k` tokens para cada petición desde el inicio, gran parte de esa memoria quedaría reservada pero sin contener estado útil mientras A y C permanecen cortas.

La documentación de TensorRT-LLM describe exactamente este problema para su cache contiguo: un tensor dimensionado al máximo de secuencia puede usar mucha más memoria de la necesaria cuando las secuencias reales son más cortas.[^trt-attention]

Ese desperdicio reduce el número de peticiones que el scheduler puede mantener activas incluso aunque el acelerador todavía tenga capacidad de cómputo.

## PagedAttention separa el espacio lógico del físico

PagedAttention parte de una idea de sistemas operativos: **la secuencia puede ver su KV cache como bloques lógicos consecutivos sin exigir que esos bloques ocupen memoria física contigua**.

Conceptualmente:

```text
Request A, bloques lógicos:   A0 → A1 → A2
                               │    │    │
block table                    ▼    ▼    ▼
VRAM física:                 P7   P2   P11
```

Cuando A necesita más estado, el gestor puede asignar otro bloque libre. Cuando A termina, esos bloques regresan al pool y pueden asignarse a otra petición.

El paper original de PagedAttention identifica precisamente la fragmentación y la sobrerreserva del KV cache como límite para batching y propone un esquema de bloques inspirado en memoria virtual.[^pagedattention] TensorRT-LLM usa hoy la misma clase de abstracción: un pool de bloques KV que el cache manager asigna a peticiones a medida que se necesitan.[^trt-kv]

### Paging no hace desaparecer todo desperdicio

Hay que evitar una simplificación frecuente: **paged ≠ utilización perfecta**.

Puede quedar espacio sin usar en el último bloque parcialmente ocupado de una secuencia. Además, los runtimes actuales soportan arquitecturas heterogéneas que obligan a compatibilizar tamaños de página entre grupos de capas. El gestor híbrido actual de vLLM documenta casos donde aparecen padding y agrupaciones adicionales para full attention, sliding window, Mamba o KV sharing.[^vllm-hybrid]

PagedAttention elimina una clase importante de asignación rígida; no elimina todas las formas posibles de overhead.

## PagedAttention y continuous batching resuelven problemas distintos

Es fácil mezclarlos porque suelen aparecer juntos en runtimes modernos.

- **PagedAttention / paged KV cache** responde: *¿cómo asignamos y reutilizamos memoria KV sin exigir reservas contiguas máximas por petición?*
- **Continuous batching / iteration-level scheduling** responde: *¿cuándo entra y sale cada petición del batch activo?*

Una no implica automáticamente la otra.

ORCA formalizó **iteration-level scheduling**: el scheduler puede reconsiderar el conjunto activo después de cada iteración de generación en lugar de esperar a que termine un batch completo.[^orca] La documentación actual de Hugging Face describe continuous batching con la misma propiedad: al terminar una petición, su slot puede ser ocupado inmediatamente por otra petición en espera.[^hf-continuous]

TensorRT-LLM denomina esta técnica **in-flight batching** y permite combinar secuencias en fase de contexto con secuencias en generación.[^trt-attention]

## La relación crítica es: terminar → liberar KV → admitir trabajo

Consideremos tres peticiones:

```text
paso n:      [A decode] [B decode]
A termina → libera sus bloques KV
paso n+1:    [C prefill] [B decode]
```

Con un scheduler continuo, C no tiene que esperar a que B termine. Pero C sólo puede entrar si el sistema puede asignar el estado que necesitará y si la política de admisión lo permite.

Ahí se conectan paging y scheduling:

1. A termina o reduce su estado útil.
2. El gestor devuelve bloques físicos al pool.
3. El scheduler observa nueva capacidad.
4. C puede ser admitida en una iteración posterior.
5. Su prefill empieza a poblar nuevos bloques.
6. Decode extiende esos bloques mientras C permanezca activa.

La unidad operativa ya no es «batch fijo». Es una **población dinámica de secuencias compitiendo por tokens de cache y tiempo de cómputo**.

## Más utilización puede aumentar preemption

Continuous batching no significa «mete siempre otra petición».

Si el scheduler sobre-admite trabajo y el KV cache se queda sin bloques, necesita una política: rechazar nueva admisión, esperar, pausar/preempt una secuencia, recomputar estado más tarde o moverlo a otro tier.

TensorRT-LLM expone esta elección de forma explícita. Su política `MAX_UTILIZATION` intenta empaquetar más peticiones, con el riesgo de tener que pausar trabajo si se alcanza el límite del KV cache; `GUARANTEED_NO_EVICT` es más conservadora y garantiza que una petición ya iniciada no se pause por ese motivo.[^trt-scheduler]

Esto conecta con el capítulo 4.1: maximizar ocupación instantánea puede aumentar throughput, pero también introducir colas, preemption o jitter que empeoran TTFT/TPOT de cola larga.

## La jerarquía de memoria añade capacidad a cambio de movimiento

Cuando la VRAM no basta, algunos runtimes pueden mantener bloques reutilizables en memoria host y promoverlos de nuevo a GPU cuando vuelven a ser necesarios.

vLLM documenta actualmente un `OffloadingConnector` que mueve bloques KV completados desde GPU hacia pinned host memory y permite tiers secundarios, con promociones de vuelta a GPU bajo demanda.[^vllm-offload] TensorRT-LLM también soporta host offloading antes de expulsar ciertos bloques del cache GPU.[^trt-kv]

Aquí **offload no designa una única semántica**. El `OffloadingConnector` de vLLM extiende el prefix cache: descarga **bloques KV completados y reutilizables** a tiers más lentos y los vuelve a promover cuando hay un hit. Eso no equivale a pausar una secuencia activa por falta de KV. Otros runtimes pueden descargar estado de una petición activa, preemptarla y recomputar, o aplicar otra política; un benchmark debe registrar cuál está realmente activa.[^vllm-offload][^hf-continuous]

La relación correcta es:

```text
GPU VRAM  ←→  host / pinned memory  ←→  tier secundario opcional
 más rápida      mayor capacidad             aún más lejos
```

Offloading **no convierte memoria lenta en VRAM gratuita**. Introduce transferencia, coordinación y una política de qué merece permanecer caliente. Si la tasa de misses o promociones es alta, el movimiento puede entrar en el camino crítico.

Por eso hay que medir, al menos:

- bytes GPU↔host por unidad de tiempo;
- tiempo de promoción por bloque;
- cache hit/miss por tier;
- evictions y preemptions;
- stalls esperando estado;
- capacidad efectiva ganada.

## Sliding window, GQA y caches híbridos cambian la ecuación

No todos los modelos mantienen el mismo estado para todos los tokens y capas.

### GQA / MQA

Reducen `H_KV` respecto al número de query heads. En la fórmula estándar esto reduce directamente bytes por token. TensorRT-LLM gestiona pools distintos cuando cambian número de heads o attention windows.[^trt-kv]

### Sliding-window o chunked attention

Una capa puede dejar de necesitar KV de tokens más antiguos una vez fuera de su ventana. Hugging Face documenta que en esos modelos un cache dinámico deja de crecer para esas capas al alcanzar el tamaño de la ventana o chunk.[^hf-cache-strategies]

### Arquitecturas híbridas

Modelos con capas de atención y capas recurrentes, o capas con diferentes necesidades de estado, ya no encajan en una única fórmula homogénea. vLLM documenta grupos KV distintos y padding para poder compartir un pool físico entre tipos de capa.[^vllm-hybrid]

La consecuencia: **antes de estimar capacidad, identifica la geometría real de estado del modelo**. `num_attention_heads × context_length` no basta.

## Reutilizar prefijos es otra optimización — no la confundas con paging

Un bloque paginado también puede convertirse en una unidad reutilizable cuando otra petición comparte el mismo prefijo. Eso puede ahorrar prefill y memoria duplicada.

Pero **prefix caching/reuse es una política adicional**. Paging hace posible gestionar bloques con flexibilidad; no garantiza que dos peticiones vayan a compartirlos.

TensorRT-LLM almacena bloques completos en una estructura de búsqueda para reutilización entre peticiones y permite además un `cache_salt` para restringir reutilización entre dominios que no deben compartir estado.[^trt-kv]

El capítulo 4.4 estudiará prefix caching y speculative decoding. Aquí importa sólo conservar la frontera: **allocation, scheduling y reuse son mecanismos diferentes aunque operen sobre los mismos bloques**.

## Qué debe observar el scheduler

Para operar un servidor bajo carga, `GPU utilization` no es suficiente. Necesitamos visibilidad del estado que limita admisión.

Un conjunto mínimo de métricas útiles es:

```text
kv_capacity_bytes
kv_bytes_used
kv_blocks_total
kv_blocks_free
live_cached_tokens
active_sequences
waiting_sequences
admissions
preemptions
evictions
prefix_cache_hits
host_offload_bytes
host_promotions
batch_size_by_iteration
```

También conviene asociar por petición:

```text
input_tokens
cached_tokens
allocated_blocks
attention_mode
cache_dtype
queue_time
prefill_time
decode_time
preemptions
```

Así puede distinguirse «GPU ocupada» de «scheduler sin memoria para admitir trabajo».

## Caso concreto: chat con longitudes heterogéneas

Supongamos un servicio donde llegan simultáneamente:

```text
A: 1k prompt + 100 output
B: 8k prompt + 800 output
C: 2k prompt + 50 output
D: 16k prompt + 200 output
```

Con batches rígidos y reservas máximas por petición, las diferencias de longitud generan espera y memoria reservada sin uso útil.

Con blocks paginados y scheduling continuo:

1. cada petición recibe bloques a medida que crece su estado;
2. A y C pueden terminar antes sin esperar a B o D;
3. sus bloques vuelven al pool;
4. el scheduler puede admitir nuevas peticiones en la siguiente iteración;
5. B y D siguen conservando sólo el estado que su arquitectura necesite;
6. si la VRAM se acerca al límite, la política decide si frena admisión, preempta o mueve bloques.

Eso **no garantiza** que cualquier política paginada sea más rápida en cualquier workload. El resultado depende de block size, scheduler, kernels, memoria disponible, longitud de secuencias, prefix reuse, offload y coste de gestión.

## Cómo comparar sistemas sin atribuir el resultado a la capa equivocada

Si un runtime A soporta más concurrencia que B, no basta con decir «PagedAttention es más rápido».

Hay que controlar o registrar:

- mismo modelo y revision;
- misma precisión de pesos y KV cache;
- misma arquitectura de atención;
- misma GPU y cantidad de VRAM realmente disponible;
- mismo max context y distribución real de `(L_in, L_out)`;
- mismo request rate/concurrencia;
- block/page size;
- continuous-batching policy;
- preemption policy;
- prefix caching on/off;
- offloading on/off y tier sizes;
- chunked prefill;
- warmup y suficientes repeticiones;
- TTFT/TPOT/goodput además de throughput.

El paper original de PagedAttention reporta mejoras de throughput bajo sus modelos, workloads y baselines de 2023.[^pagedattention] Es evidencia de esa implementación y experimento, **no una constante multiplicativa que podamos trasladar a runtimes de 2026**.

## Evals deterministas para esta capa

Además de benchmarks de rendimiento, hay invariantes que pueden probarse sin hardware idéntico:

### Accounting

```text
allocated_blocks >= blocks referenced by live block tables
free_blocks + allocated_blocks = pool_blocks
no two writable logical blocks alias unexpectedly
```

### Lifecycle

```text
request admitted → blocks allocated
request grows    → capacity accounted
request ends     → blocks released or explicitly retained for reuse
request evicted  → ownership/reference state updated atomically
```

### Continuous batching

```text
short request finishes
→ slot/capacity becomes reusable
→ waiting request may enter next eligible iteration
→ long request continues without batch-wide barrier
```

### Tiering

```text
offload(block)
→ GPU ownership released only after safe transfer state
promote(block)
→ attention cannot consume stale/incomplete bytes
```

Estos tests no sustituyen benchmarks. Verifican que el mecanismo conserva sus invariantes antes de medir rendimiento.

## Implicación de producción: capacidad es estado vivo, no sólo FLOPs

La forma útil de pensar el serving es:

\[
\text{capacidad efectiva}
=
f(\text{compute},\text{KV bytes/token},\text{tokens vivos},\text{allocator},\text{scheduler},\text{SLOs})
\]

Una GPU puede estar limitada por memoria KV antes de agotar capacidad aritmética. Otra puede tener espacio libre pero un scheduler que no lo aprovecha. Una tercera puede aceptar más secuencias mediante offload y pagar esa decisión en transferencias.

PagedAttention aporta una separación clave entre **espacio lógico por secuencia y bloques físicos**. Continuous batching aporta otra separación entre **la vida de una petición y la vida del batch**. La jerarquía de memoria añade una tercera entre **estado caliente y capacidad más lenta**.

Juntas permiten construir un servidor más flexible. Pero cada una introduce una política distinta que debe medirse por separado.

En el siguiente capítulo cambiaremos de eje: **cuantización y paralelismo**. Allí veremos cómo pesos, activaciones y KV cache pueden usar representaciones distintas, y cómo ahorrar memoria no equivale automáticamente a mantener calidad o latencia.

## Referencias

[^hf-cache]: Hugging Face Transformers, **How caching works**. Estado K/V por capa y actualización incremental durante generación. https://huggingface.co/docs/transformers/main/cache_explanation

[^hf-cache-strategies]: Hugging Face Transformers, **Cache strategies**. Dynamic/static/offloaded/quantized caches y comportamiento con sliding/chunked attention. https://huggingface.co/docs/transformers/main/kv_cache

[^hf-continuous]: Hugging Face Transformers, **Continuous batching architecture**. Replanificación por paso y lifecycle de peticiones. https://huggingface.co/docs/transformers/main/continuous_batching_architecture

[^pagedattention]: Kwon et al., **Efficient Memory Management for Large Language Model Serving with PagedAttention**, 2023. https://arxiv.org/abs/2309.06180

[^orca]: Yu et al., **Orca: A Distributed Serving System for Transformer-Based Generative Models**, OSDI 2022. https://www.usenix.org/conference/osdi22/presentation/yu

[^trt-kv]: NVIDIA TensorRT-LLM, **KV Cache System**. Block pools, reuse, attention windows, GPU allocation and host offloading. https://nvidia.github.io/TensorRT-LLM/features/kvcache.html

[^trt-attention]: NVIDIA TensorRT-LLM, **Attention — In-flight batching and paged KV cache**. https://nvidia.github.io/TensorRT-LLM/features/attention.html

[^trt-scheduler]: NVIDIA TensorRT-LLM, **Useful Runtime Options — Capacity Scheduler Policy**. Trade-off entre `MAX_UTILIZATION` y `GUARANTEED_NO_EVICT`. https://nvidia.github.io/TensorRT-LLM/latest/legacy/performance/performance-tuning-guide/useful-runtime-flags.html

[^vllm-hybrid]: vLLM, **Hybrid KV Cache Manager**. Page geometry and allocation across heterogeneous attention/state layers. https://docs.vllm.ai/en/latest/design/hybrid_kv_cache_manager/

[^vllm-offload]: vLLM, **KV Offloading Usage Guide**. GPU→CPU/secondary-tier offloading and promotion semantics. https://docs.vllm.ai/en/latest/features/kv_offloading_usage/