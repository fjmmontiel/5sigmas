---
title: "Prefill vs decode: TTFT, TPOT, throughput y presupuesto de latencia"
description: "Cómo separar prefill y decode en inferencia de LLMs, medir TTFT y TPOT sin mezclar fronteras, entender el trade-off con throughput y construir un presupuesto de latencia útil para producción."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "LLM inference, prefill, decode, TTFT, TPOT, ITL, throughput, latency, KV cache, serving"
tags:
  - IA
  - LLMs
  - Inferencia
  - Serving
  - Rendimiento
---

# Capítulo 1 — Prefill vs decode: TTFT, TPOT, throughput y presupuesto de latencia

Una petición de generación no tiene una única «latencia del modelo». Tiene al menos dos fases de inferencia con trabajo diferente y, en producción, varias esperas alrededor de ellas.

Cuando un usuario envía un prompt largo y espera una respuesta en streaming, dos preguntas importan por separado:

1. **¿Cuánto tarda en aparecer la primera salida?** Esa experiencia se resume normalmente con **TTFT, time to first token**.
2. **Una vez empieza la respuesta, ¿a qué ritmo progresa?** Esa experiencia se resume con métricas como **TPOT, time per output token**, o **ITL, inter-token latency**, según cómo las defina el harness de benchmark.

Esas dos preguntas corresponden aproximadamente a dos fases del runtime del modelo:

- **prefill** procesa el prompt de entrada, calcula sus representaciones y construye el estado de atención necesario para continuar, incluido el KV cache;
- **decode** genera la continuación de forma autorregresiva, usando el estado anterior y añadiendo nuevo estado token a token.

«Aproximadamente» importa. Un TTFT medido desde el cliente suele incluir red, cola, scheduling, prefill, generación del primer token y entrega de la primera respuesta. Por tanto **TTFT no es sinónimo de tiempo de kernel de prefill**. Del mismo modo, un TPOT medido por un cliente describe la cadencia observada después del primer token; no aísla por sí solo el tiempo de un kernel de decode.[^nvidia-aiperf]

{{ include_html("snippets/articulos-tecnicos/inference-prefill-decode-latency-budget.html") }}

## La petición cambia de forma después del prefill

Consideremos una petición con `L_in` tokens de entrada y `L_out` tokens generados.

Durante **prefill**, el modelo procesa los `L_in` tokens del prompt para producir el estado necesario para la generación. En un transformer autoregresivo, una parte fundamental de ese estado es el **KV cache**: las claves y valores de atención de los tokens ya procesados que podrán reutilizarse en pasos posteriores.

Después llega **decode**. Cada paso de generación añade, conceptualmente, un nuevo token a la secuencia y extiende el estado reutilizable. El modelo ya no necesita recomputar desde cero toda la historia en cada paso: consulta el estado acumulado y calcula el siguiente token.

Una representación útil es:

\[
\text{prompt}_{1:L_{in}}
\xrightarrow{\text{prefill}}
(KV_{1:L_{in}}, y_1)
\xrightarrow{\text{decode}}
(KV_{1:L_{in}+1}, y_2)
\xrightarrow{\text{decode}}
\cdots
\]

No es un wire format ni una descripción exacta de cada arquitectura. Es una frontera de trabajo: **la entrada se consume como un bloque de contexto antes de que la generación iterativa pueda continuar sobre estado reutilizable**.

NVIDIA describe TTFT precisamente alrededor de esa transición: el prompt completo debe procesarse para crear el KV cache antes de que comience el bucle iterativo de generación.[^nvidia-nim-metrics] El paper de Sarathi-Serve usa la misma separación operativa entre prefill y decode y estudia cómo el scheduling entre ambas fases afecta simultáneamente throughput y latencia.[^sarathi]

## TTFT mide una frontera visible para el cliente, no una sola operación

En un servicio real podemos descomponer el camino hasta la primera salida así:

\[
T_{TTFT}
=
T_{ingress}
+T_{queue}
+T_{prefill}
+T_{first\ token}
+T_{delivery}
\]

Esta ecuación es un **presupuesto de sistema**, no una identidad que todos los proveedores expongan con esos nombres.

- `T_ingress`: red, gateway, autenticación y parsing anteriores al scheduler de inferencia.
- `T_queue`: tiempo esperando capacidad, batching o una decisión del scheduler.
- `T_prefill`: trabajo de procesamiento del prompt en el servidor de inferencia.
- `T_first token`: trabajo necesario para materializar la primera salida después del estado de prefill.
- `T_delivery`: serialización y transporte de la primera respuesta hasta el punto donde mide el cliente.

La definición actual de NVIDIA AIPerf mide TTFT desde que el cliente envía la petición hasta que recibe el primer chunk no vacío, e incluye explícitamente red, cola, procesamiento del prompt y generación de la primera salida.[^nvidia-aiperf] vLLM `bench serve` también lo mide en el cliente, desde el envío de la petición hasta la primera salida streamed recibida.[^vllm-bench]

Por eso una reducción de TTFT **no demuestra por sí sola** que el kernel de prefill sea más rápido. Puede deberse a menor cola, mejor prefix caching, un prompt menor, mejor red, batching distinto o cambios en cualquier otra parte del camino medido.

## TPOT e ITL necesitan una definición antes de compararse

Después del primer token, una métrica frecuente es el tiempo medio amortizado por token de salida.

vLLM define TPOT por petición, excluyendo el primer token:

\[
TPOT
=
\frac{T_{e2e}-TTFT}{L_{out}-1}
\]

para `L_out > 1`.[^vllm-bench]

NVIDIA AIPerf usa la misma forma para su ITL medio basado en la latencia end-to-end y excluye el primer token.[^nvidia-aiperf]

Pero los nombres no son universales. vLLM distingue:

- **ITL** como los intervalos observados entre salidas consecutivas;
- **TPOT** como la duración de decode amortizada entre todos los tokens de salida salvo el primero.

Con decoding estándar y un token por evento streamed pueden ser muy similares. Con speculative decoding, chunking u otras estrategias, un evento streamed puede contener varios tokens y entonces ITL y TPOT ya no significan exactamente lo mismo.[^vllm-bench]

La regla de comparación correcta es:

> **compara puntos de medición y fórmulas antes que nombres de métricas**.

Un número etiquetado `TPOT = 20 ms` no es comparable automáticamente con otro `TPOT = 18 ms` si uno empieza en el servidor, otro en el cliente, uno incluye el primer token o uno agrega chunks en vez de tokens.

## La latencia total combina espera inicial y generación

Para una respuesta streamed, una aproximación útil cuando TPOT se define como arriba es:

\[
T_{e2e}
\approx
TTFT + (L_{out}-1)\cdot TPOT
\]

El término dominante depende de la forma de la petición.

- Un prompt muy largo con una respuesta corta puede estar dominado por TTFT.
- Un prompt corto con una respuesta de miles de tokens puede estar dominado por decode.
- En alta concurrencia, la cola y la política de scheduling pueden dominar ambos.

### Ejemplo puramente ilustrativo

Supongamos, **sin atribuir estos números a ningún modelo ni hardware**, que una petición tiene:

```text
TTFT       = 450 ms
L_out      = 120 tokens
TPOT       = 25 ms/token
```

Entonces:

\[
T_{e2e}
\approx
0.450 + (120-1)\cdot0.025
=3.425\text{ s}
\]

El ejercicio enseña dos cosas. Primero, reducir TTFT en 100 ms no equivale a reducir TPOT en 1 ms/token cuando la respuesta es larga. Segundo, cualquier benchmark que compare latencias sin fijar la distribución de longitudes de entrada y salida puede inducir a conclusiones equivocadas.

## Longitud de entrada y longitud de salida presionan partes diferentes

La forma `(L_in, L_out)` es una variable de primer orden.

Aumentar `L_in` incrementa el trabajo previo a la primera salida y el estado que debe construirse o recuperar. NVIDIA señala explícitamente que prompts más largos tienden a aumentar TTFT porque el input completo participa en la creación del KV cache antes del loop iterativo.[^nvidia-nim-metrics]

Aumentar `L_out` añade pasos de decode y hace crecer el estado asociado a la secuencia generada. En la aproximación anterior, cada token posterior al primero añade otro término de TPOT.

Eso no significa que dos peticiones con la misma longitud tengan necesariamente la misma latencia. También importan, entre otras variables:

- modelo y arquitectura;
- dtype y cuantización;
- GPU/acelerador y topología entre dispositivos;
- kernels utilizados;
- parallelism;
- tamaño de batch efectivo;
- concurrencia y request rate;
- estado y política del KV cache;
- prefix caching;
- scheduler;
- sampling/speculative decoding;
- red y protocolo de serving.

Por eso `tokens/s` sin una descripción del workload es una métrica incompleta.

## «Prefill es compute-bound y decode memory-bound» es una heurística, no una ley

Es común resumir las fases diciendo que prefill aprovecha más paralelismo y decode tiene peor utilización de cómputo por procesar muy poco trabajo nuevo por secuencia en cada iteración.

Sarathi-Serve describe precisamente prefill como una fase con alto paralelismo sobre el prompt y decode como iteraciones de baja granularidad, y usa esa asimetría para motivar chunked prefills y scheduling sin stalls.[^sarathi] DistServe usa la diferencia entre ambas fases para justificar recursos y políticas distintas y muestra que compartir hardware puede introducir interferencia entre prefill y decode.[^distserve]

Pero **no debemos convertir esa descripción en una clasificación fija de hardware**. El régimen real cambia con:

- batch size;
- longitud de contexto;
- arquitectura del modelo;
- atención y kernels;
- precisión;
- speculative decoding;
- parallelism;
- acelerador y ancho de banda de memoria.

La frase útil en producción no es «decode siempre es memory-bound». Es **«prefill y decode tienen perfiles de trabajo suficientemente diferentes como para medirlos y presupuestarlos por separado»**.

## Throughput no es latencia y optimizar uno puede empeorar la otra

**Throughput** mide trabajo completado por unidad de tiempo para una población de peticiones. Puede expresarse como requests/s, output tokens/s, total tokens/s u otra magnitud explícita.

El servidor puede aumentar throughput agrupando trabajo de varias peticiones. Eso mejora utilización del acelerador, pero también puede introducir más espera, batches mayores o interferencia entre prefill y decode.

El paper de PagedAttention parte de este problema desde otra dimensión: el KV cache por petición es grande y dinámico, y gestionarlo mal desperdicia memoria y limita el batch size disponible.[^pagedattention] Esa es una razón por la que la capacidad de batching no depende sólo de FLOPs. El capítulo 4.2 tratará la memoria del KV cache, PagedAttention y continuous batching en detalle.

Sarathi-Serve estudia directamente el trade-off throughput-latency y propone dividir prefills largos en chunks para poder intercalarlos con decodes sin bloquear durante tanto tiempo las peticiones ya activas.[^sarathi]

La consecuencia práctica es que una configuración que maximiza tokens/s puede no ser la que minimiza TTFT o TPOT de cola larga.

## Goodput responde una pregunta más útil bajo SLOs

Si el producto exige simultáneamente, por ejemplo:

```text
p99 TTFT < límite_A
p99 TPOT < límite_B
```

no basta con preguntar «¿cuántos requests/s puede aceptar el servidor?».

DistServe formaliza **goodput** como la tasa máxima que puede servirse cumpliendo restricciones de latencia definidas para la aplicación.[^distserve] Las herramientas actuales de serving también exponen variantes operativas de esta idea; vLLM permite definir objetivos de TTFT, TPOT o end-to-end para reportar goodput.[^vllm-bench]

Esto cambia la optimización:

\[
\max \; throughput
\]

no es necesariamente el mismo problema que:

\[
\max \; goodput
\quad\text{sujeto a}\quad
TTFT \le S_{TTFT},\; TPOT \le S_{TPOT}
\]

Para un chatbot interactivo, el segundo suele estar más cerca de la experiencia que importa.

## Tres workloads, tres presupuestos distintos

### 1. Chat interactivo

El usuario está esperando una reacción inmediata y después lee mientras se genera.

Prioridades típicas:

- TTFT bajo y estable;
- TPOT/ITL suficientemente bajo para que la respuesta fluya;
- p95/p99 además de la media;
- goodput bajo los SLOs del producto.

Maximizar output tokens/s a costa de colas largas puede ser una mala decisión.

### 2. Resumen batch de documentos largos

No hay un humano esperando cada primer token y el sistema puede procesar muchos documentos en segundo plano.

Aquí puede tener más peso:

- throughput agregado;
- coste por millón de tokens o por tarea;
- utilización;
- estabilidad con entradas largas;
- tiempo total del lote.

TTFT sigue siendo medible, pero puede dejar de ser el objetivo principal.

### 3. Generación larga interactiva

Un usuario pide código, un informe o una trayectoria agentic extensa.

TTFT importa al inicio, pero decode acumula una fracción creciente de la latencia total. TPOT, jitter entre tokens y stop conditions pueden dominar la percepción y el coste final.

La conclusión no es escoger una métrica favorita. Es **hacer explícita la función de utilidad del workload**.

## El scheduler conecta TTFT, TPOT y throughput

En producción varias peticiones compiten por el mismo runtime.

Un prefill largo puede entrar mientras otras secuencias están decodificando. Si el scheduler lo ejecuta como un bloque grande, puede retrasar los siguientes pasos de decode de peticiones existentes. Si lo divide demasiado, puede introducir overhead y perder eficiencia.

Sarathi-Serve muestra esta tensión con chunked prefills: chunks menores reducen el tiempo durante el que un prefill bloquea decodes, pero el tamaño de chunk también afecta eficiencia.[^sarathi]

DistServe propone otra arquitectura: separar físicamente recursos de prefill y decode para evitar parte de esa interferencia, a cambio de introducir una nueva frontera —incluido el movimiento del estado necesario entre fases— y de necesitar una asignación de recursos y red adecuada.[^distserve]

Ninguna de las dos estrategias es una victoria universal. Enseñan que **el scheduler y la topología del serving forman parte del presupuesto de latencia**.

## Un presupuesto de latencia útil debe conservar fronteras

Para depurar un sistema, una sola métrica end-to-end es insuficiente.

Como mínimo conviene registrar:

```text
request_id
input_tokens
output_tokens
request_arrival_ts
queue_enter_ts
prefill_start_ts
prefill_end_ts
first_output_received_ts
decode_end_ts
request_complete_ts
```

Si el cliente y el servidor tienen relojes distintos, no mezcles timestamps sin sincronización o trazas que definan claramente los spans. Una estrategia robusta es conservar dos vistas:

```text
CLIENTE
request_sent ─────────────── first_output ─────────── final_output
       |<------ TTFT ------>|<----- generation ----->|

SERVIDOR
queue → prefill → first-token boundary → decode steps → complete
```

La vista cliente responde «¿qué experimentó el consumidor?». La vista servidor responde «¿dónde gastó tiempo el sistema que controlamos?».

No son intercambiables.

## Cómo benchmarkear sin engañarnos

Un benchmark útil debe fijar o registrar al menos:

- modelo y versión exactos;
- engine/runtime y versión;
- hardware, número de aceleradores y topología;
- dtype/cuántización;
- tensor/pipeline/data parallelism cuando aplique;
- longitudes de entrada y salida, o su distribución;
- concurrencia/request rate y patrón de llegada;
- política de batching/scheduling;
- estado del prefix/KV cache;
- sampling y speculative decoding;
- streaming/protocolo y punto de medición;
- fórmula exacta de TTFT, TPOT/ITL, e2e y throughput;
- warmup, duración y número de repeticiones;
- media y percentiles relevantes.

vLLM advierte actualmente que la terminología de latencia no está estandarizada entre herramientas y recomienda comparar puntos de medición y fórmulas.[^vllm-bench] NVIDIA hace la misma advertencia en su documentación de métricas.[^nvidia-nim-metrics]

Por tanto, este artículo **no publica un ranking de runtimes**. Un ranking creíble requeriría el mismo hardware, modelo, pesos, precision, prompts, output lengths, cache state, request pattern, scheduler policy, red y harness, con suficientes repeticiones para reportar distribución y varianza.

## Qué medir primero cuando algo va lento

Una secuencia de diagnóstico práctica es:

1. **Separa TTFT de decode.** Si el usuario tarda en ver cualquier salida, no empieces optimizando kernels de decode.
2. **Separa cola de prefill.** Un TTFT alto bajo carga y bajo en single-request suele apuntar a capacidad/scheduling antes que al prompt compute aislado.
3. **Mira `(L_in, L_out)`.** Sin forma de secuencia no sabrás qué fase estás estresando.
4. **Mira percentiles, no sólo medias.** Un sistema interactivo puede tener una media excelente y p99 inaceptable.
5. **Mira goodput bajo SLO.** Aumentar batch size hasta maximizar tokens/s puede empeorar la cantidad de trabajo que realmente cumple el contrato de latencia.
6. **Sólo entonces atribuye causa.** Necesitas traces o métricas server-side para afirmar que el cuello está en prefill, decode, KV movement, red o scheduler.

## Implicación de producción: la latencia es un contrato por fases

El error más común es tratar inferencia como una caja con una sola cifra de rendimiento.

Una especificación útil para producción se parece más a esto:

```text
workload:
  input_tokens: distribución conocida
  output_tokens: distribución conocida
  arrival_pattern: medido

latency_slo:
  TTFT_p95: objetivo explícito
  TPOT_p95: objetivo explícito
  e2e_p95: objetivo si el producto lo necesita

capacity:
  goodput: requests/s que cumplen todos los SLOs

observability:
  client spans: request → first output → final output
  server spans: queue → prefill → decode → complete
```

Con esa separación ya podemos hacer preguntas técnicas concretas: ¿el KV cache limita batching?, ¿continuous batching ayuda o aumenta jitter?, ¿conviene chunked prefill?, ¿prefill y decode deben compartir GPUs?, ¿una cuantización reduce memoria sin degradar calidad?, ¿prefix caching elimina trabajo real o sólo cambia dónde se paga?

Esas son las preguntas de los siguientes capítulos.

La idea que debe quedar de este primero es más sencilla:

> **prefill determina gran parte del trabajo hasta poder empezar; decode determina la cadencia de continuar; el scheduler conecta ambos con la capacidad total. TTFT, TPOT y throughput sólo son útiles cuando sabemos exactamente dónde se miden y qué workload los produjo.**

## Referencias

[^nvidia-aiperf]: NVIDIA, **AIPerf Metrics Reference**. Definiciones client-observed de TTFT, decode duration e ITL. https://docs.nvidia.com/aiperf/reference/ai-perf-metrics-reference

[^nvidia-nim-metrics]: NVIDIA, **NIM LLM Benchmarking — Metrics**. Definiciones de TTFT, end-to-end latency e ITL/TPOT y caveat sobre diferencias entre herramientas. https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html

[^vllm-bench]: vLLM, **Benchmark CLI — Understanding the Latency Metrics**. TTFT, ITL, TPOT y advertencia de que la terminología no está estandarizada. https://docs.vllm.ai/en/latest/benchmarking/cli/

[^distserve]: Zhong et al., **DistServe: Disaggregating Prefill and Decoding for Goodput-optimized Large Language Model Serving**, 2024. https://arxiv.org/abs/2401.09670

[^sarathi]: Agrawal et al., **Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve**, 2024. https://arxiv.org/abs/2403.02310

[^pagedattention]: Kwon et al., **Efficient Memory Management for Large Language Model Serving with PagedAttention**, 2023. https://arxiv.org/abs/2309.06180
