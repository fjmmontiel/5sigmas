---
title: "Speculative decoding, prefix caching y otras optimizaciones de latencia"
description: "Cómo distinguir trabajo reutilizado de trabajo especulado, qué cambia realmente en TTFT y decode, y cuándo prefix caching o speculative decoding ayudan o empeoran un serving real."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "speculative decoding, prefix caching, KV cache reuse, TTFT, TPOT, acceptance rate, draft model, inference latency"
tags:
  - IA
  - LLMs
  - Inferencia
  - Serving
  - Latencia
---

# Capítulo 4 — Speculative decoding, prefix caching y otras optimizaciones de latencia

Los capítulos anteriores separaron **prefill**, **decode**, memoria de **KV cache**, cuantización y paralelismo. Con esa base ya podemos analizar dos optimizaciones que a menudo aparecen juntas aunque hacen cosas distintas:

- **prefix caching** reutiliza trabajo de prefill que ya fue calculado y sigue siendo válido;
- **speculative decoding** calcula candidatos baratos para intentar confirmar varios tokens con menos pasos secuenciales del modelo objetivo.

La diferencia es importante. Un cache hit no «adivina» tokens futuros: reutiliza estado ya verificado para un prefijo idéntico bajo el contrato de identidad del runtime. La especulación sí introduce trabajo que puede ser rechazado.

La pregunta de producción no es «¿activo ambas opciones?». Es:

> **¿qué parte del camino crítico estamos evitando, qué trabajo adicional introducimos y bajo qué distribución de requests el ahorro supera al coste?**

{{ include_html("snippets/articulos-tecnicos/inference-speculative-prefix-latency.html") }}

## El presupuesto de latencia vuelve a ser el punto de partida

Para una petición servida de forma autoregresiva podemos mantener la descomposición del capítulo 4.1:

\[
T_{TTFT}
\approx
T_{network}
+T_{queue}
+T_{prefill}
+T_{first\ output}
\]

Después de producir el primer token, el coste de generación depende de los pasos de decode, del scheduler, del batching y del hardware.

Prefix caching y speculative decoding atacan **zonas distintas** de ese camino:

```text
request
  → queue
  → prefill         ← prefix caching puede evitar parte de este trabajo
  → first token
  → decode loop     ← speculative decoding intenta confirmar >1 token por iteración útil
  → completion
```

Eso ya impide dos errores comunes:

1. un hit de prefix cache no implica que TPOT mejore;
2. speculative decoding no elimina el prefill inicial ni garantiza menor TTFT.

Ambas técnicas también comparten recursos con el resto del serving. Un cache que retiene más KV ocupa capacidad. Un draft model o tokens especulativos consumen cómputo, memoria, páginas KV y scheduler budget. Por eso una optimización local puede empeorar cola o goodput global.

## Prefix caching reutiliza estado de un prefijo ya calculado

En un Transformer autoregresivo, el prefill produce K/V para los tokens de entrada. Si una petición posterior empieza con exactamente el mismo prefijo —según el contrato de identidad del runtime—, esas K/V pueden reutilizarse en vez de recomputarse.

vLLM describe Automatic Prefix Caching precisamente así: conserva bloques KV de peticiones procesadas y los reutiliza cuando otra petición comparte el mismo prefijo.[^vllm-apc] TensorRT-LLM también mantiene bloques calculados en una estructura de búsqueda y permite reutilizarlos entre requests con prefijos coincidentes.[^trt-kv]

La relación causal es:

\[
\text{prefix identity match}
\rightarrow
\text{reused KV state}
\rightarrow
\text{less uncached prefill work}
\]

No es:

\[
\text{cache enabled}\Rightarrow\text{all requests faster}
\]

## Un hit sólo existe para la parte realmente reutilizable

Sea una petición con `L_in` tokens de entrada y `L_hit` tokens cubiertos por estado KV reutilizable. Definamos una tasa de reutilización por tokens:

\[
H_{tokens}=\frac{L_{hit}}{L_{in}}
\]

Entonces el prefill nuevo debe procesar aproximadamente el sufijo no reutilizado:

\[
L_{uncached}=L_{in}-L_{hit}
\]

Esto no pretende modelar linealmente el tiempo de prefill. La relación tiempo↔tokens depende de attention architecture, chunking, batch, kernels y longitud. La ecuación sólo identifica **qué tokens ya no necesitan el mismo trabajo de prefill**.

### Ejemplo ilustrativo, no benchmark

Una aplicación usa un system prompt y un documento común de 7,680 tokens. Cada petición añade 512 tokens propios:

```text
prefix reutilizable = 7,680 tokens
entrada total       = 8,192 tokens
H_tokens            = 7,680 / 8,192 = 93.75%
```

Con un hit válido, la petición puede evitar recomputar el estado de esos 7,680 tokens. Pero no podemos convertir `93.75%` en «93.75% menos TTFT»: siguen existiendo cola, lookup, procesamiento del sufijo, primera salida y costes del runtime.

## La identidad del cache forma parte de la corrección

«Mismos caracteres» no es una definición suficiente de identidad.

El estado reutilizable depende, como mínimo, de los tokens y de cualquier información que cambie el cálculo de K/V. Según runtime/modelo pueden importar:

- tokenizer y token IDs;
- revisión exacta del modelo;
- adapter/LoRA;
- media multimodal o sus hashes;
- posiciones/rope configuration;
- attention/KV layout;
- dtype/configuración relevante;
- tenant o dominio de confianza.

vLLM implementa actualmente el prefix cache mediante hashes de bloques que incluyen tokens, hash del prefijo previo y datos extra cuando son necesarios; su documentación también expone `cache_salt` para aislar grupos de reutilización.[^vllm-apc-design] TensorRT-LLM documenta salting y políticas de retención/offload como parte de su sistema de KV cache.[^trt-kv]

La consecuencia de producción es simple:

> **un cache key incompleto no es sólo un problema de hit rate; puede convertirse en un problema de corrección o aislamiento.**

## En multi-tenant, el hit de cache también es una señal observable

Un backend compartido puede revelar información por diferencias de tiempo si un atacante puede comprobar si cierto prefijo estaba ya caliente. vLLM documenta esta clase de timing side-channel y ofrece `cache_salt` para limitar la reutilización a requests que comparten el mismo salt.[^vllm-security]

Esto cambia la optimización:

```text
maximum cross-tenant reuse
            ↓
        higher hit rate
            ↓
possible information leakage through timing
```

frente a:

```text
tenant/trust-domain salt
            ↓
      smaller reuse domain
            ↓
lower sharing, stronger isolation
```

No existe un hit rate objetivo independiente del modelo de seguridad.

## Capacidad, eviction y hit rate están acoplados

El cache no conserva estado infinito. Cuando las páginas/bloques reutilizables compiten con nuevas peticiones, el runtime necesita liberar o desplazar estado.

TensorRT-LLM documenta reutilización de bloques, eviction priorizada y, opcionalmente, offload a memoria host antes de que un bloque deje de ser reutilizable.[^trt-kv] vLLM describe la gestión de bloques y eviction LRU de su Automatic Prefix Caching.[^vllm-apc-design]

Por tanto:

\[
\text{retention policy}
\rightarrow
\text{resident reusable state}
\rightarrow
\text{future hit distribution}
\rightarrow
\text{prefill load + scheduler pressure}
\]

Retener más estado puede elevar el hit rate, pero también reduce páginas libres para secuencias activas. Offload amplía el tier reutilizable, pero un hit que necesita copiar de host a GPU no tiene el mismo coste que un hit ya residente en GPU.

## Qué workloads se benefician de prefix reuse

La reutilización tiene sentido cuando existe **repetición real de prefijos**.

Ejemplos típicos:

- system prompts largos compartidos;
- muchas preguntas sobre el mismo documento;
- conversaciones que comparten historial previo;
- agentes con contexto base idéntico y sufijos distintos;
- workloads batch derivados de una plantilla común.

Tiene poco valor cuando casi todos los prompts son únicos desde los primeros bloques, cuando el cache se evacua antes de ser reutilizado o cuando la política de aislamiento impide compartir entre los requests que parecían similares.

Una evaluación debe medir la distribución real de `L_hit`, no sólo informar `cache_hit=true`.

## Speculative decoding ataca la dependencia secuencial del decode

Decode estándar confirma aproximadamente un token nuevo por paso autoregresivo:

```text
state_t → target → token_t+1 → state_t+1 → target → token_t+2 → ...
```

Speculative decoding introduce un **proposer** —por ejemplo un draft model, MTP o un método basado en n-grams— que genera varios candidatos baratos. El target los evalúa/verifica en conjunto; se acepta un prefijo compatible y, si aparece una discrepancia, el algoritmo corrige o vuelve al camino objetivo según su regla de aceptación.

```text
target state
   ↓
draft/proposer → d1 d2 d3 ... dk
   ↓
target verification
   ├─ accept d1..dj → commit state/KV
   └─ reject/correct → discard or rewind rejected speculative state
```

Los trabajos originales de speculative decoding/sampling muestran algoritmos de aceptación diseñados para preservar la distribución del modelo objetivo dentro de los supuestos del método.[^leviathan][^chen] **Eso no autoriza a afirmar que cualquier método llamado “speculative decoding” es distribution-preserving.** Hay variantes greedy, n-gram, MTP, EAGLE-like y otras con contratos diferentes.

## «Verificar varios» no significa «varios tokens gratis»

Para una iteración que propone `k` tokens podemos escribir un presupuesto conceptual:

\[
T_{spec}(k)
=
T_{draft}(k)
+T_{verify}(k)
+T_{correction}(k)
+T_{scheduler/KV}(k)
\]

Sea `C(k)` el número de tokens finalmente comprometidos en esa iteración. La magnitud útil es:

\[
\frac{\mathbb{E}[C(k)]}{\mathbb{E}[T_{spec}(k)]}
\]

comparada con el decode base **en el mismo hardware, runtime, carga y configuración**.

No asumimos que `T_verify(k)` sea igual al coste de un único token ni que crezca linealmente con `k`. El kernel, la longitud, el batch y el método de verificación importan.

## Acceptance rate es necesaria, pero no suficiente

Si el proposer acierta a menudo, el target puede comprometer más tokens por ciclo útil. Pero dos sistemas con la misma acceptance rate pueden tener rendimiento distinto porque cambia:

- coste del proposer;
- `k` propuesto;
- coste de verification;
- tamaño del target;
- KV adicional;
- batch y concurrencia;
- scheduler;
- interconexión si draft y target están distribuidos;
- longitud y dificultad de la secuencia.

vLLM expone actualmente métricas por request como `mean_acceptance_length`, `draft_acceptance_rate`, número de pasos especulativos, draft tokens y accepted draft tokens.[^vllm-acceptance] Esas métricas sirven para explicar **por qué** una configuración ayudó o no, pero deben leerse junto con TTFT, TPOT/ITL, throughput y goodput.

Una tasa de aceptación alta con un proposer costoso puede perder. Una tasa más modesta con propuestas casi gratuitas puede ganar.

## El draft model es sólo una familia de proposer

Una implementación de dos modelos usa un modelo pequeño para proponer y el modelo objetivo para verificar. Pero no es la única frontera.

La documentación actual de vLLM incluye, entre otros, métodos de draft model, n-gram y MTP; MTP usa capacidad multi-token nativa de familias compatibles y no necesita un draft model separado.[^vllm-draft][^vllm-ngram][^vllm-mtp]

Esto importa porque el coste cambia:

### Draft model separado

```text
extra model weights
+ extra forward path
+ possible extra KV/state
+ target verification
```

### N-gram / prompt lookup

```text
cheap lookup/proposal
+ target verification
```

### MTP / proposer integrado

```text
model-specific proposal path
+ target verification
```

No se deben mezclar speedups publicados para estas familias como si midieran la misma intervención.

## El KV cache también participa en la especulación

Los tokens propuestos necesitan estado suficiente para ser verificados/continuados. Si parte del draft se rechaza, ese estado no puede quedar comprometido como si hubiera sido aceptado.

En la documentación de TensorRT-LLM 1.2.0rc8, la arquitectura de two-model speculation contabilizaba los draft tokens contra páginas KV y `max_num_tokens`, y documentaba **KV cache rewind** para devolver al pool páginas de tokens rechazados.[^trt-spec-12] La documentación actual 1.3.0rc26 conserva una frontera operativa importante: speculative decoding está orientado a low batch sizes y su ejemplo draft/target desactiva explícitamente el overlap scheduler.[^trt-spec-current] Esos detalles de allocator/rewind se tratan aquí como implementación versionada, no como contrato universal de speculative decoding.

Por tanto:

\[
\text{more speculative depth}
\not\Rightarrow
\text{free parallelism}
\]

Aumentar `k` puede elevar los tokens aceptados por verificación, pero también reservar más KV, aumentar trabajo de draft y elevar desperdicio cuando baja la aceptación.

## La carga del sistema puede invertir el resultado

Un microbenchmark de una petición aislada puede favorecer speculative decoding porque el target aprovecha la verificación paralela. Bajo alta concurrencia, el panorama puede cambiar:

- el proposer consume capacidad que podría servir otros requests;
- draft tokens reservan KV/scheduler budget;
- batches mayores del target ya amortizan parte del coste;
- verificar secuencias especulativas puede alterar shapes y kernel selection;
- el objetivo puede pasar de latencia individual a **SLO goodput**.

La documentación actual de TensorRT-LLM advierte que los speedups se observan a low batch sizes y su ejemplo draft/target instancia `LLM(..., disable_overlap_scheduler=True)`; esa configuración no se generaliza aquí como una restricción de todos los algoritmos o runtimes.[^trt-spec-current]

Por eso un resultado «1.8× más rápido» sin request rate, batch, hardware, runtime y métrica exacta no es una regla de producción.

## Prefix caching y speculative decoding pueden coexistir, pero no son aditivos

Una petición puede:

1. reutilizar un prefijo KV ya calculado;
2. procesar el sufijo no cacheado;
3. entrar en decode;
4. usar especulación para intentar comprometer varios tokens por verificación.

Pero no podemos sumar porcentajes de mejora.

```text
prefix hit
  ↓
less prefill compute
  ↓
TTFT may fall

speculative decode
  ↓
more candidate work + verification
  ↓
decode step economics may improve
```

Ambas rutas comparten GPU, memoria, scheduler y KV capacity. Reducir prefill puede liberar capacidad para decode; reservar más KV para especulación puede reducir concurrencia; un cambio de batching puede mover de nuevo el cuello.

El resultado final debe medirse end-to-end.

## Otras optimizaciones: clasifícalas por el trabajo que cambian

«Optimización de latencia» es demasiado amplio. Conviene preguntar qué componente modifica.

| Técnica | Trabajo principal que cambia | Riesgo de atribución incorrecta |
|---|---|---|
| Prefix caching | prefill repetido | confundir hit rate con reducción proporcional de TTFT |
| Speculative decoding | pasos secuenciales de decode | ignorar draft/verification/KV/scheduler overhead |
| Chunked prefill | scheduling de prompts largos | presentarlo como reducción del FLOP total |
| Prefill/decode disaggregation | placement y colas de fases | confundir aislamiento de recursos con compute eliminado |
| CUDA graphs / launch optimizations | overhead de lanzamiento/control | extrapolar una mejora de batch/shape a todos los workloads |
| Kernel fusion | movimientos/lanzamientos intermedios | atribuir al «modelo» una capacidad del runtime/kernel |

Estas técnicas pueden componerse. Lo que no se puede componer sin medir son sus porcentajes de speedup.

## Tres casos concretos de decisión

### Caso A — Asistente con system prompt largo y repetido

Patrón:

```text
6k tokens comunes + 0.5–2k tokens por usuario
muchas peticiones comparten exactamente el prefijo
```

Primera hipótesis: **prefix caching**. Hay trabajo de prefill repetido y verificable que puede eliminarse. Medir `L_hit`, TTFT cold/hot, queue time, GPU-KV residency, eviction y aislamiento por tenant.

Speculative decoding puede añadirse después si decode sigue dominando, pero no es la primera explicación del TTFT alto.

### Caso B — Chat con prompts cortos y respuestas largas

Patrón:

```text
0.2–1k input tokens
1–4k output tokens
poco prefijo compartido
```

Prefix caching probablemente aporta poco. Si TPOT domina y existe un proposer barato con buena aceptación, speculative decoding merece un experimento controlado.

El gate debe comparar misma request distribution y reportar acceptance + latencia + goodput, no sólo tokens/s internos.

### Caso C — Serving saturado con alta concurrencia

Patrón:

```text
queueing visible
KV pressure
large continuous batches
SLO defined at p95/p99
```

Ninguna optimización se activa sólo por su microbenchmark. Hay que verificar si más cache residency o draft work reduce admisión, aumenta cola o empeora SLO goodput. Puede ser correcto desactivar una optimización que gana single-request latency si pierde capacidad bajo carga.

## Qué medir para prefix caching

Un dashboard útil separa resultado y mecanismo:

```text
request count
prompt-token distribution
reused-prefix-token distribution
H_tokens = reused_prefix_tokens / prompt_tokens
cold vs warm TTFT
cache lookup latency
GPU-resident hits vs restored/offloaded hits
evictions by cause
KV bytes retained for reuse
queue time / preemptions
throughput + SLO goodput
```

El simple número de cache hits oculta cuánto prefijo se reutilizó y cuánto trabajo se evitó.

## Qué medir para speculative decoding

```text
proposal method + exact configuration
num speculative tokens k
num speculative steps
num draft tokens
num accepted draft tokens
mean acceptance length
acceptance distribution by request/output position
draft time
verification time
correction/rewind overhead
extra KV/memory footprint
TTFT / TPOT / ITL
requests/s + tokens/s + SLO goodput
```

Además hay que separar cold start/warmup y registrar si el draft comparte dispositivo, ocupa otra GPU o cruza interconexión.

## Contrato de benchmark reproducible

Dos configuraciones sólo aíslan una optimización si fijamos o reportamos:

- target model + revision;
- tokenizer;
- proposer/draft + revision, si existe;
- método de acceptance/verification;
- runtime + commit/version;
- hardware, driver y CUDA;
- quantization y KV dtype;
- TP/PP/DP/EP/CP;
- scheduler y batching;
- prefix-cache block size/hash/salt/retention;
- `(L_in,L_out)` y grado real de prefix sharing;
- request rate/concurrencia;
- sampling parameters;
- warmup;
- repeticiones suficientes;
- mediana + percentiles + distribución/varianza;
- calidad/salida bajo el mismo harness cuando el algoritmo no garantiza equivalencia exacta.

Si un experimento cambia modelo, hardware, runtime y workload a la vez, es una comparación entre stacks, no evidencia causal de speculative decoding o prefix caching.

## Evals deterministas antes de rendimiento

Hay invariantes que deben pasar incluso antes de hablar de milisegundos.

### Prefix reuse

```text
same logical prefix + same cache identity → reusable state may match
changed identity component → no unsafe reuse
reused KV corresponds to exactly the matched token prefix
evicted block cannot be treated as resident
salt/trust domain prevents forbidden cross-tenant reuse
```

### Speculative decoding

```text
accepted tokens obey the selected verification/acceptance contract
rejected speculative state is not committed
KV/state after commit equals the accepted sequence
fallback without speculation remains available
reported acceptance counters reconcile with emitted tokens
```

### End-to-end

```text
request cancellation frees speculative/cache state
OOM/preemption cannot silently corrupt reusable state
retry does not reuse state from an incompatible model/config
observability attributes latency to queue/prefill/draft/verify/decode
```

## Producción: optimizar trabajo evitado, no activar features

Prefix caching y speculative decoding son útiles por mecanismos distintos:

\[
\text{reuse}
\rightarrow
\text{verified prior state}
\rightarrow
\text{less repeated prefill}
\]

\[
\text{speculation}
\rightarrow
\text{cheap candidates}
\rightarrow
\text{target verification}
\rightarrow
\text{possibly more committed tokens per useful step}
\]

El primero necesita **repetición + identidad correcta + capacidad de cache**. El segundo necesita **propuestas suficientemente baratas + aceptación suficiente + verification eficiente**. Ambos deben convivir con memoria, scheduler, batching y SLOs.

La decisión correcta no es «usar la técnica más nueva». Es demostrar, con el workload real, qué trabajo desaparece, qué trabajo adicional aparece y qué ocurre con **latencia, goodput, memoria y corrección** al mismo tiempo.

En el siguiente capítulo llevaremos estas piezas al plano de serving adaptativo: **model routing, fallback, caching de resultados/respuestas y decisiones condicionadas por el workload**.

## Referencias

[^vllm-apc]: vLLM, **Automatic Prefix Caching**. Reutilización de KV cache cuando nuevas queries comparten prefijo. https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/

[^vllm-apc-design]: vLLM, **Automatic Prefix Caching — design**. Hash por bloques, parent hash, datos extra, eviction y cache isolation/salting. https://docs.vllm.ai/en/latest/design/prefix_caching/

[^vllm-security]: vLLM, **Security — Prefix Cache Timing Side-Channel Mitigation**. Riesgo de timing side-channel y `cache_salt`. https://docs.vllm.ai/en/latest/usage/security/

[^trt-kv]: NVIDIA TensorRT-LLM, **KV Cache System**. Block reuse, search, prioritized eviction, salting/offload y partial reuse. https://nvidia.github.io/TensorRT-LLM/features/kvcache.html

[^trt-spec-current]: NVIDIA TensorRT-LLM, **Speculative Decoding**, documentación actual 1.3.0rc26. Alcance low-batch, configuración draft/target y métodos soportados. https://nvidia.github.io/TensorRT-LLM/1.3.0rc26/features/speculative-decoding.html

[^trt-spec-12]: NVIDIA TensorRT-LLM, **Speculative Decoding**, 1.2.0rc8. Detalle de implementación versionado sobre accounting de páginas KV, `max_num_tokens` y KV cache rewind. https://nvidia.github.io/TensorRT-LLM/1.2.0rc8/features/speculative-decoding.html

[^vllm-draft]: vLLM, **Draft Models**. Draft-model speculative decoding y configuración actual. https://docs.vllm.ai/en/latest/features/speculative_decoding/draft_model/

[^vllm-ngram]: vLLM, **N-Gram Speculation**. Propuestas por coincidencias n-gram sin un segundo modelo generativo. https://docs.vllm.ai/en/latest/features/speculative_decoding/n_gram/

[^vllm-mtp]: vLLM, **MTP (Multi-Token Prediction)**. Speculative decoding con capacidad MTP nativa de modelos compatibles. https://docs.vllm.ai/en/latest/features/speculative_decoding/mtp/

[^vllm-acceptance]: vLLM, **Per-Request Acceptance Metrics**. `mean_acceptance_length`, `draft_acceptance_rate` y contadores por request. https://docs.vllm.ai/en/latest/features/speculative_decoding/acceptance_metrics/

[^leviathan]: Leviathan, Kalman & Matias, **Fast Inference from Transformers via Speculative Decoding**, 2022/2023. https://arxiv.org/abs/2211.17192

[^chen]: Chen et al., **Accelerating Large Language Model Decoding with Speculative Sampling**, 2023. https://arxiv.org/abs/2302.01318
