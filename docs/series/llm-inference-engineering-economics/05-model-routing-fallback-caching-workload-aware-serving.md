---
title: "Model routing, fallback, caching y serving adaptado al workload"
description: "Cómo separar selección de modelo, fallback, cache de respuestas y placement de workers para optimizar calidad, latencia, capacidad y coste sin romper corrección."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "model routing, LLM routing, fallback, response cache, semantic cache, workload-aware serving, inference gateway, KV-aware routing"
tags:
  - IA
  - LLMs
  - Inferencia
  - Serving
  - Routing
---

# Capítulo 5 — Model routing, fallback, caching y serving adaptado al workload

Los cuatro capítulos anteriores optimizaron **cómo** se ejecuta una inferencia: prefill/decode, KV cache, batching, cuantización, paralelismo, prefix reuse y speculative decoding. Falta una decisión anterior y otra posterior:

> **¿qué modelo debe recibir esta petición, en qué worker debe ejecutarse y qué hacemos si no merece una inferencia nueva o si el primer intento falla?**

En producción suelen mezclarse cuatro mecanismos que no son equivalentes:

1. **response/result caching** decide si podemos reutilizar un output anterior;
2. **model routing** elige modelo o clase de modelo antes del primer intento;
3. **worker placement** elige una réplica concreta una vez elegido el modelo;
4. **fallback** decide qué hacer después de un fallo o de otra condición explícita.

Si estas capas se confunden, una mejora local puede romper corrección, aislamiento o SLO. Un semantic-cache hit incorrecto evita la inferencia equivocada. Un router que sólo optimiza precio puede seleccionar un modelo sin tool calling. Un fallback puede duplicar output que ya llegó al usuario. Un worker cache-hot puede estar tan cargado que empeore el TTFT.

{{ include_html("snippets/articulos-tecnicos/inference-routing-fallback-cache-policy.html") }}

## La política empieza por lo que **no** puede elegir

Antes de optimizar calidad, coste o latencia, una petición necesita un conjunto de candidatos **elegibles**.

Sea `x` la petición y `M` el catálogo de modelos. Definimos:

\[
E(x)=\{m\in M:\operatorname{capable}(m,x)\land\operatorname{allowed}(m,x)\land\operatorname{healthy}(m)\}
\]

`capable` puede incluir:

- modalidad de entrada/salida requerida;
- longitud de contexto suficiente;
- tool/function calling o structured output;
- versión de tokenizer/protocolo compatible;
- región o residencia de datos;
- política del tenant y allowlists;
- disponibilidad del deployment;
- presupuesto máximo de deadline si un modelo no puede cumplirlo razonablemente.

Esta fase es **hard filtering**. No tiene sentido asignar un score excelente a un modelo que no puede ejecutar correctamente la request.

La separación también evita un error organizativo: una política de routing no debería convertirse en un bypass de seguridad, residencia o permisos. Esos constraints delimitan el espacio de decisión; el router optimiza **dentro** de él.

## Model routing elige antes del primer intento

Con `E(x)` ya filtrado, el router puede elegir el candidato que maximiza una utilidad esperada. Una forma conceptual —no un estándar— es:

\[
m^*(x)=\arg\max_{m\in E(x)}
\left[
\mathbb{E}Q(x,m)
-\lambda\,\mathbb{E}C(x,m)
-\mu\,P_{SLO}(x,m)
-\nu\,P_{risk}(x,m)
\right]
\]

Donde:

- `Q` representa calidad para la tarea concreta;
- `C` representa coste relevante, no sólo precio/token;
- `P_SLO` penaliza probabilidad o magnitud de incumplir el SLO;
- `P_risk` captura riesgo operativo o de política que la aplicación haya decidido modelar;
- `λ`, `μ` y `ν` son elecciones del producto, no constantes universales.

La ecuación sirve para hacer explícito el contrato. No demuestra que podamos estimar bien cada término.

## Routing estático, reglas y routers aprendidos resuelven problemas distintos

### Routing estático

Un endpoint o workflow usa siempre el mismo modelo. Es una opción válida cuando la distribución de tareas es homogénea o la simplicidad operativa domina.

### Reglas explícitas

La aplicación enruta por propiedades observables: modalidad, tenant, longitud, idioma, herramienta requerida, clase de tarea o presupuesto. Son fáciles de auditar y fallan de forma visible cuando la taxonomía ya no representa el tráfico.

### Router aprendido

Un clasificador o scorer predice qué candidato tendrá suficiente calidad o mejor utilidad para `x`. RouteLLM estudia precisamente routing entre un modelo fuerte y otro más barato usando preference data y distintos routers aprendidos.[^routellm-paper] El repositorio oficial publica el framework para servir y evaluar esos routers.[^routellm-repo]

Eso no convierte RouteLLM en una prueba de que un learned router sea siempre mejor que reglas. El resultado depende de candidatos, preference data, tareas, thresholds y coste de errores.

### Cascadas

FrugalGPT estudia estrategias que llaman modelos en secuencia y deciden cuándo escalar a otro modelo.[^frugalgpt] Una cascade puede parecerse a fallback, pero el motivo es diferente: la escalada puede estar diseñada como parte normal de la política de calidad/coste, no como recuperación de un fallo técnico.

## Un servicio gestionado sigue teniendo fronteras concretas

Amazon Bedrock Intelligent Prompt Routing es un ejemplo útil porque sus límites son explícitos. La documentación actual describe un endpoint serverless que enruta entre **exactamente dos modelos de la misma familia**, con criterios de calidad configurables.[^bedrock-router]

También documenta limitaciones relevantes: el routing está optimizado para prompts en inglés, no adapta sus decisiones usando performance data específica de la aplicación y puede no ser óptimo para casos especializados.[^bedrock-router]

Aquí aparece una trampa terminológica: Bedrock llama `fallback model` al modelo base usado por su **criterio de routing** cuando no se supera una diferencia de calidad. Eso no significa necesariamente «modelo al que se cambia tras un error de red o provider». El nombre de un campo de producto no redefine la frontera arquitectónica de fallback que usamos en este capítulo.

## El router sólo ve el outcome del modelo que eligió

Si una petición se envía a `m_A`, producción observa el outcome de `m_A`. Normalmente **no** observa qué habría producido `m_B` para la misma request en las mismas condiciones.

Ese es un problema contrafactual.

Un dashboard con:

```text
route=A → 92% success
route=B → 95% success
```

no demuestra que B sea mejor si A y B reciben poblaciones distintas.

Para evaluar routing necesitamos, al menos sobre una muestra controlada, ejecutar candidatos alternativos con el mismo input y un harness comparable. Entonces podemos definir un regret de evaluación:

\[
R(x)=U(x,m_{oracle})-U(x,m_{router})
\]

`m_oracle` no es «el mejor modelo del mundo»: es el mejor candidato observado para **ese eval, esa función de utilidad y ese conjunto de modelos**.

Paired evals, shadow traffic sin side effects o replay offline permiten estimar ese gap. La producción normal, por sí sola, tiene selection bias.

## Calidad del router y calidad del modelo son dos variables

Un sistema puede fallar porque:

- el modelo elegido no resuelve la tarea;
- el router eligió un modelo peor aunque otro candidato sí la resolvía;
- ningún candidato elegible resolvía la tarea;
- la política excluyó correctamente un modelo por capability o compliance;
- la estimación de coste/latencia estaba stale;
- el serving cambió el SLO aunque la elección de modelo fuese correcta.

Por eso conviene guardar `policy_version`, candidatos elegibles y razón de selección. Sin esa evidencia, una regresión del router se confunde con una regresión del modelo.

## Fallback ocurre **después** de una condición de fallo o degradación

Model routing responde:

```text
¿qué intento primero?
```

Fallback responde:

```text
el intento no terminó como esperaba: ¿puedo intentar otra ruta sin romper el contrato?
```

No todo error habilita retry o fallback.

### Fallos potencialmente recuperables

Dependiendo del proveedor y de la aplicación pueden incluir timeout de transporte, rate limiting, overload, endpoint unhealthy o un deployment temporalmente no disponible.

### Fallos que suelen requerir corregir la request o la política

Un error de autenticación, schema inválido, input demasiado grande o capability ausente no se arregla enviando ciegamente la misma petición a otra réplica. Un segundo modelo sólo es una alternativa válida si **sí** satisface el contrato que falló.

LiteLLM, por ejemplo, documenta Router con retry/fallback entre deployments.[^litellm] Eso prueba una capacidad de ese gateway; no implica que «fallback» tenga una semántica universal entre runtimes.

## Un fallback consume el mismo deadline del usuario

Sea `D` el deadline end-to-end y `t` el tiempo ya gastado. El presupuesto restante es:

\[
B_{remaining}=D-t
\]

Un fallback sólo es útil si su probabilidad de terminar correctamente dentro de `B_remaining` justifica el coste de intentarlo.

Reintentar tres veces un provider lento puede convertir un fallo rápido en un timeout de varios segundos. Durante un incidente, retries sin presupuesto también amplifican carga precisamente sobre el sistema degradado.

Por eso el contrato necesita:

- timeout por attempt;
- retry budget total;
- cooldown/circuit breaker o equivalente;
- clasificación de errores;
- límites de concurrencia;
- observabilidad por attempt y por request lógica.

## Compatibilidad de fallback no significa «misma API»

Dos modelos que aceptan un endpoint OpenAI-compatible pueden diferir en:

- longitud de contexto;
- tool calling;
- JSON/structured output;
- multimodalidad;
- reasoning controls;
- tokenizer;
- límites de output;
- comportamiento de safety;
- sistema de prompt o tool schema que soportan;
- región y tratamiento de datos.

El fallback candidate debe pasar de nuevo por constraints de elegibilidad.

La respuesta de otro modelo tampoco conserva necesariamente distribución, wording ni decisión. Fallback es una política de continuidad de servicio, no una equivalencia matemática entre modelos.

## Streaming cambia cuándo es seguro hacer fallback

Antes del primer byte visible, cambiar de modelo puede ser relativamente sencillo. Después de emitir texto/audio/tokens al cliente, el sistema ya tiene una historia observable.

```text
attempt A
  → emits "The total is..."
  → fails
  → attempt B starts from zero
```

Si B vuelve a emitir la respuesta completa, el cliente puede ver duplicados o contradicciones. Si continúa desde el texto parcial, necesitamos un protocolo explícito de continuation y estado.

Y un fallback de inferencia **no revierte side effects** que una tool o servicio externo ya haya ejecutado. La idempotencia y reconciliación viven en la capa que posee esos efectos.

## Response caching evita inferencia completa; prefix caching no

En 4.4 vimos prefix caching:

```text
same compatible prefix
→ reuse verified KV
→ avoid part of prefill
→ still generate a new output
```

Response caching es distinto:

```text
compatible request identity
→ reuse a previous final result
→ no new model inference for that hit
```

Es una optimización más agresiva y, por tanto, su frontera de corrección también es mayor.

## Una cache key es parte del contrato de verdad

Un key exacto útil rara vez es sólo `hash(user_prompt)`.

Dependiendo del producto puede necesitar incorporar:

\[
K=H(
input,
policy\_version,
model\_revision,
decoding\_config,
tool\_schema,
retrieval\_snapshot,
tenant\_scope
)
\]

Si cambia cualquiera de esas dependencias y el output anterior deja de ser válido, una key que no lo represente puede producir un **stale hit**.

Ejemplos:

- cambia el system prompt pero el prompt del usuario es igual;
- cambia la revisión del modelo;
- el RAG corpus se actualiza;
- una herramienta cambia schema o datos;
- cambia la política del tenant;
- el output depende de «ahora», inventario o precio actual.

TTL ayuda con edad, pero no sustituye una identidad de dependencias correcta.

## No todo request debería ser cacheable

Un resultado cacheado es especialmente peligroso cuando la petición depende de:

- identidad o permisos del usuario;
- estado mutable externo;
- hora/fecha actual;
- datos privados que no pueden cruzar tenants;
- side effects;
- nonces o challenges;
- sampling deliberadamente variable;
- contexto de conversación no incluido en la key.

RFC 9111, para HTTP caching, trata invalidación y métodos inseguros como parte del contrato de cache.[^rfc9111] No estamos afirmando que un LLM response cache sea simplemente HTTP cache. La lección transferible es que **reutilizar una respuesta exige una regla explícita de validez e invalidación**.

## Semantic cache añade un clasificador de equivalencia

Un exact cache exige identidad exacta. Un semantic cache intenta decidir que dos requests distintas son suficientemente equivalentes para reutilizar una respuesta.

GPTCache, por ejemplo, usa embeddings y búsqueda vectorial para recuperar queries similares, y su propia documentación reconoce false positives y false negatives como parte del problema.[^gptcache]

Una política simplificada puede parecer:

\[
\operatorname{admit}(x,c)=
[sim(x,c)\ge\tau]
\land metadata\_compatible
\land fresh
\land policy\_allowed
\]

El threshold `τ` no crea una garantía de corrección.

vCache investiga semantic caching con verificación explícita y parte precisamente del problema de que similarity thresholds estáticos no aportan garantías formales de corrección.[^vcache] LaCache estudia robustez frente a colisiones/adversarial queries en semantic caching.[^lacache]

Conclusión operativa: **cache hit rate no es el objetivo primario**. Primero necesitamos precisión de admisión y severidad de los false hits.

## Una cache semántica puede contaminar errores

Si una respuesta equivocada entra en cache y muchas queries futuras se consideran equivalentes, el error se multiplica sin ejecutar de nuevo el modelo.

Por eso deben existir decisiones independientes de:

1. **lookup** — qué candidatos parecen similares;
2. **admission** — qué respuesta se permite reutilizar;
3. **write policy** — qué outputs pueden entrar al cache;
4. **invalidation** — qué cambio los vuelve inválidos;
5. **trust scope** — entre qué tenants o dominios puede compartirse.

Un vector store resuelve principalmente lookup. No resuelve por sí solo las otras cuatro decisiones.

## Model routing y worker placement son dos niveles distintos

Después de seleccionar un modelo, un serving distribuido todavía debe decidir **qué réplica** lo ejecuta.

NVIDIA Dynamo documenta KV-aware routing que combina reutilización potencial de KV con carga activa de prefill/decode.[^dynamo-routing] En su modelo actual, un worker con mucho prefix overlap puede perder frente a otro más frío si la carga proyectada hace mayor su coste total.[^dynamo-concepts]

Ese mecanismo no elige entre un modelo barato y otro de mayor calidad. Elige dónde colocar una request dentro del serving disponible para el modelo/deployment correspondiente.

La secuencia correcta puede ser:

```text
request
→ model policy: model B
→ serving pool for model B
→ worker policy: replica B3
→ inference
```

No:

```text
"router" = una única decisión opaca
```

## Los standards pueden definir la frontera sin definir tu política

Gateway API Inference Extension separa Gateway, `InferencePool` y endpoint selection. Su documentación define métricas/capabilities —por ejemplo prefix-cache status o disponibilidad de adapters— que una implementación de scheduler puede usar.[^gaie]

El proyecto también deja claro que su lightweight Endpoint Picker es una referencia de conformance y que producción puede usar otras implementaciones.[^gaie]

Eso es una distinción importante:

- **API/protocol capability**: qué información y punto de extensión existen;
- **scheduler implementation**: cómo se selecciona un endpoint;
- **application model policy**: qué modelo debería responder a la tarea.

No atribuyamos una política específica de quality/cost routing al estándar por el mero hecho de que exponga un Endpoint Picker.

## Workload-aware significa segmentar por la distribución que realmente importa

Una única política global suele ocultar que distintos workloads optimizan objetivos distintos.

### Asistente interactivo con prefijos largos repetidos

Puede importar TTFT, prefix locality y cola. Un router de workers cache-aware puede ser más relevante que un learned model router si todas las requests ya usan el mismo modelo.

### FAQ read-only con respuestas muy repetidas

Un response cache exacto o semantic cache cuidadosamente validado puede evitar inferencias enteras. La métrica crítica no es sólo hit rate: hay que medir false-hit/stale-hit rate y daño por respuesta incorrecta.

### Coding agent con tools y estado de repositorio

El output depende del snapshot, tool schema y permisos. Reutilizar respuestas completas suele ser mucho más difícil. El model router debe filtrar primero capacidades; un fallback sólo es válido si el candidato conserva el contrato de tools/contexto necesario.

### Batch offline de summarization

Pueden dominar throughput y coste/task. Una política estática puede superar en operabilidad a un router por request si la distribución es homogénea y el coste del router no compra una mejora medible.

### Tráfico con providers externos inestables

La prioridad puede ser continuidad. Fallback, retry budgets y circuit breakers importan más que una pequeña mejora media de precio/token.

No hay una estrategia universal porque no hay una única función objetivo.

## Tres casos completos

### Caso A — soporte de producto read-only

Hay dos modelos elegibles. El pequeño resuelve preguntas frecuentes; el grande maneja casos ambiguos. Existe una base de conocimiento versionada.

Una política razonable puede ser:

```text
hard constraints
→ exact/semantic response cache scoped to KB version
→ miss: model router small vs large
→ worker placement
→ provider/worker failure: compatible fallback if budget remains
```

Evals: cache precision, paired quality de ambos modelos, coste/task, p95 TTFT y fallback success condicionada a errores recuperables.

### Caso B — agente de ingeniería con tools

Cada request depende de repo SHA, permisos y estado de herramientas. El cache de outputs completos queda deshabilitado salvo subproblemas puramente funcionales y versionados.

```text
capability + policy filter
→ tool-capable model route
→ worker placement
→ attempt
→ fallback only to tool/schema-compatible model
```

El sistema registra si hubo tool call o side effect antes del fallo. Nunca interpreta un retry de inferencia como rollback de la herramienta.

### Caso C — summarization batch

El workload tiene documentos largos, no interaction latency y una ventana de finalización conocida.

```text
static eligible model
→ queue/batch scheduler
→ worker placement by capacity/load
→ bounded retry on infrastructure failure
```

Aquí un learned router por documento puede añadir complejidad sin beneficio si los paired evals no muestran heterogeneidad de calidad suficiente.

## Observabilidad: registra la **decisión**, no sólo la inferencia

Un trace útil debería poder reconstruir:

```text
logical_request_id
policy_version
workload_segment
eligible_models + exclusion_reasons
cache_namespace + key_version + hit/miss + admission_reason
selected_model + revision + selection_reason
selected_worker + placement_reason
attempt_id + deadline_remaining
error_class
fallback_candidate + fallback_reason
output_already_visible
usage + latency + cost
quality/outcome evidence
```

No todo campo debe viajar a un proveedor externo ni quedar sin redacción. La observabilidad también tiene un contrato de privacidad.

Sin `exclusion_reasons`, no sabemos si un modelo perdió por score o por una restricción dura. Sin `policy_version`, no podemos reproducir la decisión. Sin `attempt_id`, mezclamos la request lógica con retries.

## Evals separadas por mecanismo

### Model router

Medir:

- calidad por segmento y candidato;
- regret en paired evals;
- cost/task;
- latency/SLO por route;
- frecuencia de cada exclusión dura;
- drift del mix de tráfico.

### Response cache

Medir:

- hit rate;
- precision de hits;
- false-positive / stale-hit rate;
- recall sólo si existe un ground truth razonable de queries reutilizables;
- latencia de lookup;
- bytes/entries residentes;
- severidad del peor hit incorrecto.

### Fallback

Medir:

- tasa de fallos elegibles;
- fallback attempts por request lógica;
- success condicionado al tipo de fallo;
- latencia añadida;
- requests que agotaron deadline;
- duplicación/partial-output incidents;
- retries amplificados durante outages.

### Worker placement

Medir:

- queue time y TTFT;
- load por worker;
- prefix/KV overlap cuando aplique;
- recompute evitado o estimado con definición explícita;
- tail latency;
- goodput del pool.

Un único «router success rate» destruiría estas fronteras.

## El gate de producción es end-to-end

Un router puede ahorrar coste medio y empeorar p99. Un cache puede reducir TTFT y aumentar errores. Un fallback puede elevar availability y violar deadline. Un placement cache-aware puede mejorar prefill y crear hotspots si ignora carga.

Por eso la decisión de desplegar una política debe mirar al menos:

\[
\text{quality}
\times
\text{SLO attainment}
\times
\text{cost/task}
\times
\text{capacity/goodput}
\]

No como un producto matemático literal, sino como cuatro ejes que no deben ocultarse entre sí.

## Contrato de benchmark reproducible

No compararemos números de RouteLLM, FrugalGPT, Bedrock, Dynamo, semantic caches o gateways como si fueran un leaderboard común. Miden intervenciones, modelos, tráfico y hardware diferentes.

Para afirmar que una política mejora nuestro serving necesitamos fijar:

- distribución de inputs y segmentos;
- candidatos y revisiones exactas;
- prompts/system policy/tool schemas;
- pricing snapshot o coste de hardware;
- hardware/runtime/quantization;
- cache warm-up y estado inicial;
- request rate/concurrency;
- input/output lengths;
- failure injection para fallback;
- timeout/retry budgets;
- quality evaluator y sus límites;
- número de repeticiones;
- distribución de TTFT/TPOT/e2e, throughput/goodput y cost/task.

Si cambia más de una capa, el resultado compara **stacks completos**, no aísla causalmente el router o cache.

## Checklist de decisión

Antes de añadir una nueva capa pregunta:

1. **¿Cuál es la decisión exacta?** Reutilizar output, elegir modelo, elegir worker o recuperarse de un fallo.
2. **¿Qué constraints son duros?** Capabilities, policy, región, contexto, deadline.
3. **¿Qué señal puede estar stale?** Load, KV locality, quality estimate, health, precios, cache freshness.
4. **¿Cuál es el coste del error?** Modelo insuficiente, false cache hit, retry duplicado, hotspot.
5. **¿Podemos evaluar la alternativa no elegida?** Paired eval, replay o shadow.
6. **¿Qué estado ya es observable o irreversible?** Streaming output y side effects.
7. **¿La política es versionada y reversible?** Si no, una regresión será difícil de reproducir.

## Conclusión

Workload-aware serving no consiste en encadenar «smart routing», cache y fallback. Consiste en **mantener separadas decisiones con momentos y contratos diferentes**:

- cache decide si existe un resultado previo todavía válido;
- model routing decide qué modelo intentar primero;
- worker placement decide dónde ejecutar ese modelo;
- fallback decide si una segunda ruta sigue siendo válida después del fallo;
- evals y telemetría actualizan la política con evidencia, incluidas alternativas no elegidas.

Cuando esas fronteras son explícitas, podemos optimizar coste y latencia sin llamar «optimización» a una pérdida silenciosa de calidad o corrección.

En el siguiente capítulo cerraremos la serie con **benchmarking de inferencia**: cómo medir cost/task, throughput, latencia, energía y restricciones de hardware sin comparar setups incompatibles.

## Referencias

[^routellm-paper]: Ong, I. et al. *RouteLLM: Learning to Route LLMs with Preference Data*. arXiv:2406.18665. https://arxiv.org/abs/2406.18665
[^routellm-repo]: LMSYS. *RouteLLM* — repositorio oficial. https://github.com/lm-sys/RouteLLM
[^frugalgpt]: Chen, L. et al. *FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance*. arXiv:2305.05176. https://arxiv.org/abs/2305.05176
[^bedrock-router]: AWS. *Understanding intelligent prompt routing in Amazon Bedrock*. https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-routing.html
[^litellm]: LiteLLM. *Getting Started / Router retry and fallback*. https://docs.litellm.ai/
[^rfc9111]: IETF. *RFC 9111 — HTTP Caching*. https://www.rfc-editor.org/rfc/rfc9111
[^gptcache]: Zilliz. *GPTCache — Semantic cache for LLM queries*. https://github.com/zilliztech/GPTCache
[^vcache]: *vCache: Verified Semantic Prompt Caching*. arXiv:2502.03771. https://arxiv.org/abs/2502.03771
[^lacache]: *LaCache: Robust Semantic Caching for LLM Serving*. arXiv:2608.01718. https://arxiv.org/abs/2608.01718
[^dynamo-routing]: NVIDIA. *Dynamo Router Guide v1.4.0*. https://docs.nvidia.com/dynamo/v1.4.0/knowledge-base/modular-components/router/overview
[^dynamo-concepts]: NVIDIA. *Dynamo KV-Aware Routing — concepts*. https://docs.nvidia.com/dynamo/dev/knowledge-base/concepts/system-architecture/kv-aware-routing
[^gaie]: Kubernetes SIG Network. *Gateway API Inference Extension*. https://github.com/kubernetes-sigs/gateway-api-inference-extension
