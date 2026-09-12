---
title: "Benchmarking de inferencia: cost/task, throughput, latencia, energía y hardware"
description: "Cómo diseñar benchmarks de inferencia reproducibles: workload, TTFT/TPOT/ITL, throughput/goodput, coste por tarea correcta, energía y restricciones reales de hardware."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "LLM inference benchmark, TTFT, TPOT, ITL, throughput, goodput, cost per task, energy per inference, MLPerf, AIPerf, vLLM"
tags:
  - IA
  - LLMs
  - Inferencia
  - Benchmarking
  - Serving
---

# Capítulo 6 — Benchmarking de inferencia: cost/task, throughput, latencia, energía y hardware

Los capítulos anteriores han introducido mecanismos que pueden mover una métrica: batching, KV cache, cuantización, paralelismo, speculative decoding, routing o caching. El último paso de la serie es más incómodo:

> **¿cómo sabemos que una intervención mejora el sistema que realmente queremos operar y no sólo una cifra del benchmark?**

Una cifra aislada como `1200 tok/s`, `p50 TTFT = 180 ms` o `0.002 €/request` no describe un sistema. Falta saber qué tráfico recibió, dónde empezaba y terminaba el reloj, qué hardware ejecutó el modelo, qué estado tenían las caches, qué requests fallaron y qué calidad produjo el output.

{{ include_html("snippets/articulos-tecnicos/inference-benchmark-measurement-boundary.html") }}

## Un benchmark es un protocolo, no un escalar

Para que un resultado sea interpretable necesitamos fijar, como mínimo, un contrato parecido a:

\[
B=(W,A,M,R,S,H,N,E,Q)
\]

Donde:

- `W`: workload y distribución de inputs/outputs;
- `A`: proceso de llegadas, concurrencia y duración;
- `M`: modelo, revisión, tokenizer y configuración de decoding;
- `R`: runtime, versión, scheduler, quantization y configuración de cache;
- `S`: estado inicial, warmup y reglas de repetición;
- `H`: hardware, memoria, topología, power mode y sistema host;
- `N`: frontera cliente-servidor y red incluida en la medida;
- `E`: endpoints y fórmulas exactas de las métricas;
- `Q`: contrato de calidad o éxito de tarea.

Dos números sólo son comparables si las diferencias relevantes de ese contrato están controladas o, al menos, declaradas. Si cambiamos simultáneamente modelo, hardware, longitud de prompt y harness, el resultado compara **stacks completos**. No permite atribuir la diferencia a una sola optimización.

## El workload debe parecerse al problema que quieres resolver

Una media de 512 tokens de entrada y 128 de salida no sustituye a una distribución.

Prefill y decode escalan de manera distinta con la forma de la secuencia. El scheduler reacciona de forma distinta ante prompts largos, outputs largos, sesiones multi-turno y mezcla de longitudes. La KV cache también cambia con la reutilización de prefijos y la concurrencia.

Por eso el workload debe registrar, al menos:

- distribución de tokens de entrada;
- distribución de tokens de salida;
- correlación entre ambas cuando exista;
- porcentaje de requests multi-turno;
- prefijos compartidos o no compartidos;
- herramientas, structured output o restricciones que alteren decoding;
- tasa de cancelación;
- segmentos de tráfico que tengan SLO diferentes.

Si usamos datos sintéticos, el benchmark debe declarar qué propiedades del tráfico real intenta conservar y cuáles no.

## Request rate y concurrencia no describen la misma carga

Un test con `concurrency=64` suele operar como un loop cerrado: cuando una request acaba, otra ocupa su slot. Un test con una tasa de llegada fija o estocástica puede ser abierto: las nuevas requests llegan aunque el servidor esté acumulando cola.

AIPerf expone explícitamente modos de request rate, límites de concurrencia, patrones de llegada `constant`, `poisson` y `gamma`, además de warmup y ramp-up.[^aiperf-load]

Eso importa porque dos servidores con la misma capacidad media pueden comportarse de forma muy distinta bajo bursts.

Para capacidad de producción conviene hacer un **saturation sweep**:

```text
carga baja
→ aumenta arrival rate / concurrency
→ crece utilización
→ crece throughput
→ aparece cola
→ suben TTFT y tails
→ throughput se aproxima a un plateau
→ errores/cancelaciones/SLO misses pueden crecer
```

El punto útil no es necesariamente el máximo `tok/s`. Es el punto donde la capacidad sigue cumpliendo el contrato de servicio.

## TTFT mide una frontera de usuario, no un kernel de prefill

En AIPerf, TTFT se calcula desde el inicio de la request hasta el primer chunk/token recibido por el cliente. Su definición incluye **red, cola, procesamiento del prompt y generación de la primera salida**.[^aiperf-metrics]

Por tanto:

\[
TTFT_{client}
\neq
T_{prefill\ kernel}
\]

salvo que un harness específico haya definido otra frontera y la documente.

Ésta es una fuente frecuente de comparaciones inválidas. Una optimización del scheduler puede bajar TTFT sin acelerar el kernel de prefill. Una red más lenta puede subir TTFT aunque el servidor sea idéntico.

## TPOT, ITL y chunk latency tampoco son sinónimos universales

Para una respuesta con `n` tokens de salida, una definición común de TPOT usa el tiempo posterior al primer token:

\[
TPOT=\frac{T_{end}-TTFT}{n-1}
\]

pero distintas herramientas pueden usar nombres o endpoints ligeramente distintos. El benchmark debe publicar la fórmula, no sólo el acrónimo.

ITL describe intervalos entre tokens consecutivos. En streaming real puede existir además **inter-chunk latency**: un chunk puede contener más de un token y la cadencia de transporte ya no coincide necesariamente con la cadencia del decoder. AIPerf separa esas métricas.[^aiperf-metrics]

Para UX interactiva deberíamos mirar distribuciones, no sólo medias:

- TTFT p50/p95/p99;
- TPOT o ITL p50/p95/p99 según la definición usada;
- end-to-end latency;
- chunk jitter cuando el protocolo lo haga relevante;
- errores y cancelaciones.

## Throughput responde «cuánto terminamos»; goodput añade «dentro del SLO»

Raw throughput puede expresarse como requests/s o tokens/s. Ninguna de las dos cifras garantiza que las requests hayan cumplido la experiencia objetivo.

Definimos un conjunto de requests válidas bajo un SLO `G`:

\[
G=\{r:\ TTFT_r\leq\tau_1\land TPOT_r\leq\tau_2\land T_{e2e,r}\leq\tau_3\land success_r\}
\]

Entonces:

\[
\operatorname{goodput}=\frac{|G|}{T_{window}}
\]

AIPerf define goodput como requests completadas por segundo que satisfacen constraints de métricas configurados, y contabiliza los errores en el denominador de su fracción de requests buenas.[^aiperf-goodput] vLLM `bench serve` también permite fijar SLOs de goodput sobre TTFT, TPOT y end-to-end latency, además de percentiles configurables.[^vllm-bench]

Un servidor puede aumentar throughput y reducir goodput si para lograrlo deja crecer demasiado la cola o las tails.

## El benchmark necesita una dimensión de calidad

Un sistema que responde rápido pero falla la tarea no es eficiente.

Para tareas evaluables definimos:

\[
N_{success}=\sum_i \mathbf{1}[Q(y_i, y_i^*, x_i)\geq q_{min}]
\]

`Q` puede ser exact match, tests ejecutables, un rubric humano, un juez calibrado o una métrica específica del dominio. Lo importante es fijarla **antes** de comparar sistemas y conservar el mismo contrato.

Cuando la calidad depende de un juez LLM, hay que versionar también:

- modelo juez;
- prompt/rubric;
- temperatura y sampling;
- aggregation;
- tratamiento de abstenciones y errores del juez;
- calibración contra ejemplos humanos cuando sea necesaria.

Cambiar el judge entre sistemas destruye el denominador de `cost/task`.

## Cost/request, cost/token y cost/successful-task responden preguntas distintas

Sea `C_run` el coste total contabilizado durante una corrida.

\[
C_{request}=\frac{C_{run}}{N_{attempted}}
\]

\[
C_{token}=\frac{C_{run}}{N_{output\ tokens}}
\]

\[
C_{successful\ task}=\frac{C_{run}}{N_{success}}
\]

En una API, `C_run` puede incluir input tokens, output tokens, cached tokens, tool calls u otros cargos según el proveedor. En self-hosting puede incluir accelerator-time, host, memoria, red y reserva ociosa según la frontera económica elegida.

No existe una frontera de coste universal. Sí existe la obligación de declarar qué entra y qué no.

### Ejemplo ilustrativo, no benchmark

Supongamos una corrida que cuesta `24 €`, intenta `1000` tareas y `920` pasan el criterio de éxito fijado:

\[
C_{request}=24/1000=0.024\ €
\]

\[
C_{successful\ task}=24/920\approx0.02609\ €
\]

Reportar sólo `0.024 €/request` ocultaría el coste de los outputs que no resolvieron la tarea.

## Potencia y energía no son la misma magnitud

Potencia es una tasa instantánea. Energía acumula esa tasa durante un intervalo:

\[
E_{run}=\int_{t_0}^{t_1} P_{SUT}(t)\,dt
\]

Por eso `250 W` de TDP no es `250 Wh` consumidos y tampoco demuestra la energía real de una inferencia.

Las reglas oficiales de MLPerf Power son útiles como disciplina incluso fuera de MLPerf: definen el sistema bajo prueba a nivel de sistema, miden potencia AC en la pared, alinean timestamps de power y performance, exigen replicabilidad y prohíben combinar el mejor performance de una corrida con el menor consumo de otra.[^mlperf-power]

Las guías de comunicación de MLCommons también prohíben usar TDP, potencia nominal de PSU u otros proxies como sustitutos de la potencia de sistema medida al comparar resultados MLPerf.[^mlperf-messaging]

## Energy/request, energy/token y energy/task también deben separarse

Con energía medida en la misma ventana de performance:

\[
E_{request}=\frac{E_{run}}{N_{attempted}}
\]

\[
E_{token}=\frac{E_{run}}{N_{output\ tokens}}
\]

\[
E_{successful\ task}=\frac{E_{run}}{N_{success}}
\]

Si el run ilustrativo anterior consumiera `1.8 kWh`, entonces:

\[
E_{successful\ task}=1800/920\approx1.957\ Wh
\]

Eso sigue sin ser un benchmark publicable si no conocemos la frontera del SUT, el instrumento, la incertidumbre, la duración y la repetibilidad. Sólo muestra cómo cambia el denominador.

## La frontera energética debe dibujarse físicamente

«GPU energy» y «system energy» no son intercambiables.

Un benchmark debe indicar si mide:

- sólo el acelerador mediante telemetría interna;
- acelerador + CPU + RAM;
- nodo completo;
- varios nodos;
- sistema a pared;
- red o almacenamiento externos.

Para comparar hardware, una medición de nodo completo puede responder mejor a coste operativo real; una medición de GPU puede ser útil para profiling interno. Son preguntas distintas.

## Hardware constraint no significa sólo «qué GPU»

La ficha mínima de un benchmark reproducible debería incluir:

```text
accelerator model + count
accelerator memory + memory mode
precision / quantization
power cap / clocks cuando se modifican
tensor / pipeline / expert / context parallelism
interconnect + topology
CPU + RAM
host count
runtime + driver + CUDA/ROCm stack
model revision + tokenizer
scheduler / batching / cache config
client location + network path
```

Dos servidores con el mismo modelo de GPU pueden tener resultados distintos por NVLink/NVSwitch, PCIe, NUMA, CPU bottlenecks, memoria host, red o power cap.

El límite de memoria también condiciona qué batch, contexto y KV residency son posibles. El benchmark debe registrar OOMs y rechazos; no esconder configuraciones que simplemente no caben.

## Warmup y cache state son parte del experimento

Un resultado «warm» puede incluir:

- kernels ya compilados;
- conexiones ya establecidas;
- allocators estabilizados;
- pesos ya residentes;
- prefix/KV cache con hits;
- filesystem/page cache caliente.

Un resultado «cold» puede medir otra cosa completamente distinta.

AIPerf separa una fase de warmup y descarta sus métricas del profiling; permite controlar duración, request count, concurrency y rate del warmup.[^aiperf-warmup]

Para cada corrida debemos fijar si las caches se vacían, preservan o precargan. Si el objetivo es producción estable, una fase warm puede ser adecuada. Si el objetivo es cold start, hay que medirlo explícitamente.

## Repeticiones: una sola corrida no describe varianza

Un benchmark serio debe repetir bajo las mismas condiciones y conservar las muestras, no sólo el mejor número.

Como mínimo:

- número de repeticiones;
- duración o request count por repetición;
- warmup por repetición;
- orden de variantes si existe riesgo de drift térmico o de carga;
- medianas y percentiles por request;
- dispersión entre runs;
- errores/cancelaciones;
- cualquier outlier excluido y la regla aplicada.

Si hacemos A/B sobre el mismo cluster compartido, el ruido de vecinos y autoscaling forma parte del experimento salvo que se controle.

## El gráfico más útil es la curva de saturación

Una sola carga puede favorecer accidentalmente a una configuración.

Conviene barrer arrival rate o concurrency y observar conjuntamente:

\[
\lambda
\rightarrow
(queue, TTFT_{p99}, TPOT_{p99}, throughput, goodput, errors, power)
\]

En carga baja, dos sistemas pueden parecer iguales. Cerca de saturación pueden divergir porque uno empieza a acumular cola, expulsar KV, reducir batch efficiency o agotar memoria.

La curva muestra **dónde** cambia el régimen del sistema.

## Herramientas distintas pueden usar el mismo nombre para métricas distintas

AIPerf publica fórmulas concretas para TTFT, decode duration, ITL, inter-chunk latency y throughput.[^aiperf-metrics] vLLM `bench serve` expone su propio harness, percentiles y goodput.[^vllm-bench]

No debemos copiar dos tablas y comparar `TTFT` fila a fila sin demostrar que coinciden:

- endpoint temporal;
- streaming/chunking;
- tokenizer y conteo de tokens;
- workload;
- load model;
- warmup;
- network path;
- failed-request handling.

El nombre de la columna no es la definición de la métrica.

## MLPerf enseña por qué el escenario forma parte del resultado

MLPerf Inference v6.1 es la ronda actual documentada por MLCommons para 2026.[^mlperf-suite] Sus reglas distinguen escenarios como Offline, Server y SingleStream porque responden preguntas de deployment diferentes.[^mlperf-rules]

No necesitamos adoptar MLPerf para cada benchmark interno. La lección transferible es que **scenario + workload + rules + metric** forman una unidad. Un score sin su régimen de carga pierde significado.

## Un protocolo mínimo para 5sigmas

Antes de publicar una comparación de inferencia exigiríamos este bloque:

```text
MODEL
  model/revision, tokenizer, decoding, context limit

RUNTIME
  engine/version, precision, parallelism, scheduler, cache settings

HARDWARE
  accelerators, memory, topology, CPU/RAM, power settings

WORKLOAD
  dataset/sampling, input/output distributions, shared prefixes, task success criterion

LOAD
  open/closed loop, arrival pattern, rate/concurrency sweep, duration, warmup

MEASUREMENT
  client/server boundary, formulas, streaming/chunking, power boundary

REPORT
  TTFT/TPOT/ITL/e2e distributions, throughput, goodput, errors,
  cost/request, cost/successful-task, energy/request or energy/task when measured,
  repetitions and run-to-run variance
```

Si falta una de estas secciones, el resultado puede seguir siendo útil para debugging interno, pero no debería presentarse como comparación general.

## Qué optimizar depende de la aplicación

### Chat interactivo

Prioridad típica:

- TTFT tail;
- fluidez de decode/ITL;
- goodput bajo SLO;
- calidad por turno;
- cancelación y coste de trabajo desperdiciado.

### Batch offline

Puede importar más:

- tasks/hour;
- output tokens/s;
- coste por tarea correcta;
- energía por tarea;
- utilización sostenida.

### Agente con tools

Tokens/s puede dejar de ser el cuello de botella. El benchmark debe incluir tool latency, retries, side effects y **éxito end-to-end de la tarea**.

La métrica debe seguir al producto, no al dashboard del runtime.

## Checklist antes de creer una cifra

1. **¿Cuál es el workload exacto?** No sólo la media de tokens.
2. **¿Cómo llegan las requests?** Rate, concurrency, burstiness y ramp-up.
3. **¿Dónde empieza y termina cada reloj?** Cliente, gateway, server o kernel.
4. **¿Qué state estaba warm?** Kernels, conexiones, KV/prefix cache y allocators.
5. **¿Qué cuenta como éxito?** Request completada no implica tarea correcta.
6. **¿Qué hardware y topología había?** Incluye host e interconnect.
7. **¿Qué entra en coste y energía?** Declara la frontera.
8. **¿Cuántas repeticiones hay?** Publica distribución y varianza.
9. **¿Qué ocurre al saturar?** Mira queue, tails, errors y goodput.
10. **¿La comparación cambia una variable o todo el stack?** Atribuye sólo lo que el experimento identifica.

## Conclusión

Benchmarking de inferencia no consiste en encontrar la cifra más alta. Consiste en construir un experimento donde **workload, load model, fronteras temporales, calidad, coste, energía y hardware** estén definidos con suficiente precisión para saber qué cambió.

La regla práctica de cierre de esta serie es:

> **no optimices un número que no puedas reconstruir desde el protocolo que lo produjo.**

Con un protocolo reproducible, las optimizaciones de los capítulos anteriores dejan de ser claims aislados y se convierten en decisiones de ingeniería medibles.

## Referencias

[^aiperf-metrics]: NVIDIA. *AIPerf Metrics Reference*. https://docs.nvidia.com/aiperf/reference/ai-perf-metrics-reference
[^aiperf-goodput]: NVIDIA. *Benchmark Goodput with AIPerf*. https://docs.nvidia.com/aiperf/tutorials/metrics-analysis/benchmark-goodput-with-ai-perf
[^aiperf-load]: NVIDIA. *Load Generator Options Reference*. https://docs.nvidia.com/aiperf/benchmark-modes/load-generator-options-reference
[^aiperf-warmup]: NVIDIA. *Warmup Phase Configuration*. https://docs.nvidia.com/aiperf/tutorials/load-patterns-scheduling/warmup-phase-configuration
[^vllm-bench]: vLLM. *vllm bench serve*. https://docs.vllm.ai/en/stable/cli/bench/serve/
[^mlperf-suite]: MLCommons. *MLPerf Inference Benchmark Suite — v6.1*. https://docs.mlcommons.org/inference/index_gh/
[^mlperf-rules]: MLCommons. *MLPerf Inference Rules*. https://github.com/mlcommons/inference_policies/blob/master/inference_rules.adoc
[^mlperf-power]: MLCommons. *MLPerf Inference Power Measurement Rules*. https://github.com/mlcommons/inference_policies/blob/master/power_measurement.adoc
[^mlperf-messaging]: MLCommons. *MLPerf Results Messaging Guidelines*. https://github.com/mlcommons/policies/blob/master/MLPerf_Results_Messaging_Guidelines.adoc
