---
title: "Evaluación online: shadow, canary, A/B, guardrails y regression gates"
description: "Cómo evaluar cambios de sistemas de IA en producción sin confundir observación, exposición real y causalidad: shadow traffic, canaries, experimentos A/B, guardrails, rollback y gates de release."
date: 2026-09-13
date_modified: 2026-09-13
keywords: "online evaluation, shadow traffic, canary, A/B testing, guardrails, regression gates, AI systems, progressive delivery"
tags:
  - IA
  - Evaluación
  - Producción
  - Reliability
  - Experimentos
---

# Capítulo 5 — Evaluación online: shadow, canary, A/B, guardrails y regression gates

Un cambio puede pasar todos los evals offline y fallar cuando toca tráfico real.

La distribución de inputs cambia, aparecen dependencias reales, la concurrencia no se parece al benchmark, el estado de usuario importa y algunas métricas sólo existen después de que una persona use el producto.

Pero «probar en producción» no describe un único método. **Shadow, canary y A/B responden preguntas distintas**:

- un **shadow** ejecuta el candidato con copias de tráfico real sin usar su respuesta para servir al usuario;
- un **canary** expone una fracción pequeña de tráfico real al candidato y observa seguridad/reliability antes de ampliar;
- un **A/B** asigna unidades experimentalmente a control o tratamiento para estimar un efecto causal bajo un diseño declarado.

Confundirlos produce decisiones incorrectas. Un shadow puede decir que el candidato se comporta distinto, pero no cuánto cambiará una métrica de usuario. Un canary puede detectar un aumento de errores, pero una asignación por porcentaje de tráfico no es automáticamente un experimento causal. Un A/B puede estimar efecto causal y aun así ser demasiado lento o peligroso para descubrir primero una regresión crítica.

La pregunta de este capítulo es:

> **¿Qué evidencia necesitamos en cada etapa online para decidir continuar, detener, revertir o ampliar un cambio de IA?**

{{ include_html("snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html") }}

## Antes de exponer tráfico, fija la unidad de cambio

Un «candidato» no debe significar simplemente «el modelo nuevo».

En un sistema de IA, la experiencia que llega a producción puede depender de:

```text
model + snapshot/version
prompt/system policy
retrieval/index version
tool schemas + tool implementations
runtime/harness
routing/fallback policy
feature flags
post-processing/guardrails
```

Si dos variantes cambian varias capas a la vez, el resultado online evalúa el **paquete desplegado**, no permite atribuir causalmente el efecto a una sola capa.

Por eso cada release debería tener una identidad reproducible, por ejemplo:

```text
candidate_id = hash(
  model_snapshot,
  prompt_version,
  tool_contract_version,
  retrieval_version,
  runtime_version,
  routing_policy
)
```

La identidad no tiene por qué ser literalmente un hash, pero debe permitir reconstruir qué ejecutó cada request.

## Shadow: primero observa el candidato sin darle autoridad sobre la respuesta

El tráfico shadow —también llamado mirroring— copia requests reales hacia una variante candidata mientras la variante estable sigue respondiendo al usuario.

La documentación actual de Istio lo define así: el tráfico mirrored ocurre fuera del camino crítico de la request primaria y las respuestas del destino espejo se descartan.[^istio-mirroring]

Eso crea una superficie útil para responder preguntas como:

- ¿el candidato acepta la distribución real de inputs?;
- ¿produce más errores de tool/schema?;
- ¿cambia drásticamente la latencia o el consumo?;
- ¿sus outputs o decisiones discrepan del sistema estable?;
- ¿aparecen casos que el eval set offline no contenía?;

Podemos medir, por ejemplo, una tasa descriptiva de discrepancia sobre casos comparables:

<div class="s5-native-equation" data-equation="shadow-disagreement" tabindex="0" role="group" aria-label="Ecuación; desplazable horizontalmente" style="max-width:100%;overflow-x:auto;padding:1rem 0"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><msub><mi>D</mi><mrow><mtext>shadow</mtext></mrow></msub><mo>=</mo><mfrac><msub><mi>N</mi><mtext>discrepancias relevantes</mtext></msub><msub><mi>N</mi><mtext>trials shadow comparables</mtext></msub></mfrac></math></div>

El numerador debe tener semántica concreta: distinta tool, violación de política, distinto resultado factual, cambio de clase de respuesta, etc. «Los textos no son idénticos» suele ser una señal demasiado débil para sistemas generativos.

### Un shadow no mide impacto real sobre el usuario

La respuesta candidata no determina lo que el usuario ve. Por tanto no observa directamente:

- si el usuario completa mejor su tarea;
- si cambia conversión, retención o abandono;
- si una respuesta más lenta cambia comportamiento;
- si el usuario adapta su siguiente acción a la salida candidata.

El shadow es evidencia **contrafactual de ejecución**, no evidencia completa de experiencia de usuario.

### El peligro de los side effects

«La respuesta se descarta» no implica «la ejecución no puede hacer daño».

Si el candidato llama tools con writes reales, puede crear pedidos, enviar emails, modificar tickets o duplicar operaciones aunque su output nunca llegue al usuario.

Para shadowing seguro, una de estas condiciones debe ser explícita:

```text
read-only tools
or sandbox/staging side effects
or write suppression / dry-run adapters
or reversible isolated resources
```

Si no puedes aislar side effects, no debes tratar el mirroring de requests como una prueba inocua.

## Canary: expón poco tráfico real para descubrir riesgo antes de ampliar

En un canary, una parte pequeña del tráfico sí usa la nueva variante.

El objetivo principal suele ser reducir el **blast radius** mientras observas señales de producción:

- error rate;
- timeout/cancellation rate;
- latencia tail;
- policy violations;
- tool failures;
- coste por request o task;
- abandono o indicadores de experiencia suficientemente rápidos;
- saturación de dependencias.

Argo Rollouts es un ejemplo concreto de tooling de progressive delivery: permite pasos de peso, pausas y análisis; un `AnalysisRun` puede hacer que el rollout continúe, se pause o se aborte según condiciones declaradas.[^argo-canary][^argo-analysis]

Eso es una **capacidad del controlador de rollout**, no una garantía de que las métricas o thresholds elegidos sean correctos.

### Canary no significa A/B

Un canary del 5% puede recibir tráfico distinto por región, shard, hora, tipo de cliente, infraestructura o routing. Incluso un reparto aparentemente aleatorio puede estar correlacionado con factores que afectan la métrica.

Por tanto:

> **usa canary para detectar si es seguro ampliar; usa un experimento controlado cuando la pregunta sea cuánto efecto causal produce el cambio.**

Puedes comparar control y canary descriptivamente, pero no conviertas automáticamente esa diferencia en «lift causado por el candidato».

### Predeclara abort conditions

Un canary es útil sólo si sabemos qué significa detenerlo.

Por ejemplo:

```text
ABORT si:
  hard_policy_violation > 0
  OR duplicate_write_detected == true
  OR error_rate excede el límite acordado
  OR p99 latency excede el budget acordado

PAUSE si:
  la evidencia es insuficiente
  OR la métrica crítica está retrasada
  OR faltan datos de una dependencia

PROMOTE sólo si:
  todos los hard guardrails pasan
  AND la ventana mínima se completó
  AND no hay degradación material en reliability
```

Los límites concretos dependen del producto y del coste del fallo. No existe un 1%, 5% o p95 universal que convierta un canary en seguro.

La documentación de Argo Rollouts también distingue explícitamente `Failed`, `Successful` e `Inconclusive` en los análisis. Esa tercera salida es importante: «no tengo evidencia suficiente» no debe colapsarse en PASS.[^argo-analysis]

## A/B: randomiza cuando quieres estimar efecto causal

Un experimento A/B cambia la pregunta.

Ya no preguntamos sólo «¿el candidato parece estable?», sino:

> **¿qué cambia para la población objetivo cuando asignamos tratamiento en vez de control?**

Bajo un diseño randomizado válido, una estimación simple de diferencia de medias puede escribirse como:

<div class="s5-native-equation" data-equation="ab-difference" tabindex="0" role="group" aria-label="Ecuación; desplazable horizontalmente" style="max-width:100%;overflow-x:auto;padding:1rem 0"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mover><mi>Δ</mi><mo>^</mo></mover><mo>=</mo><mover><msub><mi>Y</mi><mi>T</mi></msub><mo>¯</mo></mover><mo>−</mo><mover><msub><mi>Y</mi><mi>C</mi></msub><mo>¯</mo></mover></math></div>

Pero esa expresión sólo adquiere interpretación causal si el diseño y el análisis preservan sus supuestos: asignación correcta, unidad adecuada, logging fiable, tratamiento realmente aplicado y control de problemas como interferencia o attrition.

La literatura de experimentación de Microsoft describe los A/B tests como experimentos controlados usados para establecer efectos causales mediante randomización, y su plataforma separa explícitamente ejecución, logging y análisis porque la confianza depende de toda esa cadena.[^microsoft-exp][^microsoft-platform]

### Elige bien la unidad de randomización

No siempre debes randomizar por request.

Ejemplos:

- un copiloto que mantiene memoria puede necesitar asignación por usuario;
- un agente empresarial puede requerir asignación por tenant para evitar que una organización mezcle políticas;
- una experiencia conversacional puede necesitar sticky assignment por sesión;
- un sistema colaborativo puede tener interferencia entre usuarios, haciendo inválida una interpretación ingenua por usuario.

La unidad de asignación, la unidad de análisis y el mecanismo real de exposición deben quedar registrados.

### Antes de leer el efecto, comprueba que el experimento es confiable

Un **Sample Ratio Mismatch (SRM)** ocurre cuando la proporción observada entre grupos difiere de la esperada de forma incompatible con el diseño. Microsoft documenta SRM como una señal de problemas de datos o asignación que puede invalidar la decisión si no se explica.[^srm]

Por tanto el orden debe ser:

```text
assignment health
→ exposure/logging health
→ metric integrity
→ guardrails
→ treatment effect
```

No leas primero «+3%» y luego compruebes si la randomización estaba rota.

### Guardrail metrics no son métricas secundarias decorativas

Un experimento puede mejorar la métrica objetivo y dañar otra dimensión que no estamos dispuestos a sacrificar.

Ejemplo:

```text
primary metric:
  task_completion_rate

guardrails:
  unsafe_action_rate
  duplicate_write_rate
  p99 latency
  support_escalation_rate
  cost_per_successful_task
```

La literatura de Microsoft sobre experimentación fiable insiste en mirar varias dimensiones y detectar consecuencias no deseadas durante el experimento, no sólo al final.[^microsoft-during][^metric-pitfalls]

Si una métrica representa una frontera dura —por ejemplo exposición de datos o write sin autorización— no debe compensarse con lift de producto.

## Guardrail no significa «un detector más»

En este capítulo, un **guardrail de release** es una condición que restringe la decisión de despliegue.

Puede alimentarse de:

- reglas deterministas;
- monitores de seguridad;
- métricas de reliability;
- graders calibrados;
- revisión humana;
- señales de negocio.

Lo importante es su semántica operacional:

```text
si falla → qué acción ocurre
quién puede override
qué evidencia queda
cuándo puede reintentarse
```

Un dashboard que se pone rojo pero no detiene nada no es equivalente a un hard gate.

Tampoco todos los guardrails deben ser hard stops. Algunas señales tienen ruido suficiente para requerir `PAUSE + review` en lugar de rollback inmediato.

## Regression gate: combina evidencia, no promedies riesgos incompatibles

Un release gate útil debe representar la lógica real de promoción.

Para una variante \(v\), podemos expresar de forma esquemática:

<div class="s5-native-equation" data-equation="online-release-gate" tabindex="0" role="group" aria-label="Ecuación; desplazable horizontalmente" style="max-width:100%;overflow-x:auto;padding:1rem 0"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mi>G</mi><mo>(</mo><mi>v</mi><mo>)</mo><mo>=</mo><msub><mi>H</mi><mrow><mtext>hard</mtext></mrow></msub><mo>∧</mo><msub><mi>R</mi><mrow><mtext>reliability</mtext></mrow></msub><mo>∧</mo><msub><mi>E</mi><mrow><mtext>evidence</mtext></mrow></msub></math></div>

Donde:

- `H_hard` representa invariantes no compensatorios;
- `R_reliability` exige que el candidato permanezca dentro del budget operativo;
- `E_evidence` exige que la etapa haya acumulado la evidencia declarada para su pregunta.

No conviertas estas dimensiones en una media arbitraria donde una mejora de conversión compensa una violación de seguridad.

### La evidencia debe avanzar por etapas

Una secuencia razonable para cambios de riesgo significativo es:

```text
offline regression suite
→ shadow
→ canary pequeño
→ canary ampliado
→ A/B o holdout cuando necesites efecto causal
→ rollout progresivo
→ post-release monitoring
```

No todas las releases requieren todas las etapas. Un cambio de CSS y un agente con permiso para transferir dinero no deben compartir el mismo protocolo.

La regla es elegir la etapa más barata que pueda falsar el cambio **antes** de aumentar el alcance del riesgo.

## Tres ejemplos concretos

### 1. Nuevo modelo en un asistente de soporte

**Offline**: casos históricos + hard negatives + policy checks.

**Shadow**: ejecutar el nuevo modelo sobre requests reales con tools de write desactivadas. Comparar routing, escalado, policy violations, latencia y coste.

**Canary**: 1–5% puede ser una decisión operacional razonable en un producto concreto, pero no es un valor universal. Exponer usuarios reales sólo después de que shadow no revele defectos críticos. Abort conditions predefinidas para seguridad y reliability.

**A/B**: si la pregunta final es si mejora resolución o reduce contactos repetidos, usar una asignación experimental estable y métricas de usuario adecuadas.

### 2. Nuevo workflow para un agente que hace writes

Shadow real con writes activos sería peligroso.

Usa:

```text
real requests
→ candidate workflow
→ sandbox / write suppression
→ compare intended actions
```

Después, canary con cuentas o tenants explícitamente elegibles, idempotency/reconciliation instrumentados y un rollback operativo probado.

No interpretes una caída de latencia como mejora si viene de saltarse una validación obligatoria.

### 3. Cambio de prompt de bajo riesgo

Si offline muestra paridad y el cambio no tiene side effects, quizá shadow + A/B sea más informativo que construir un canary largo.

Pero el A/B todavía necesita identidad de variante, asignación estable, métricas confiables y guardrails. «Sólo cambié un prompt» no elimina los requisitos experimentales.

## Errores de diseño que deben disparar CHANGES_REQUIRED

### «Shadow pasó, así que los usuarios estarán mejor»

No. Shadow no expone la salida candidata al usuario.

### «El canary está 2% mejor, por tanto hay +2% de lift»

No necesariamente. Sin diseño randomizado y análisis apropiado, esa diferencia puede ser selección o confounding.

### «A/B dio significativo, así que podemos ignorar el aumento de incidentes»

No. Un guardrail duro debe bloquear aunque la métrica primaria mejore.

### «El rollout controller dice Success, así que la hipótesis de producto está validada»

No. El controlador sólo evalúa las condiciones que configuraste. Argo Rollouts puede automatizar promoción/abort según métricas, pero no define por ti qué métrica representa valor o seguridad.[^argo-analysis]

### «Miramos el dashboard hasta que salió verde»

Eso introduce una regla de parada implícita y hace difícil interpretar la evidencia. Define antes ventanas mínimas, criterios de parada y qué análisis es confirmatorio frente a exploratorio.

### «El reparto esperado era 50/50, pero quedó 57/43 y analizamos igual»

Un SRM sin explicación es un problema de trustworthiness, no una pequeña imperfección estadística.[^srm]

## Registra el contrato de cada online eval

Un recibo mínimo debería incluir:

```text
candidate_id / control_id
traffic stage: shadow | canary | experiment | rollout
start/end timestamps
eligibility population
assignment unit + assignment mechanism
exposure definition
side-effect policy
primary metrics
guardrail metrics
metric windows + denominators
abort/pause/promote rules
rollback target
logging/schema versions
known exclusions
final decision + approver/automation
```

Para A/B añade hipótesis, análisis preespecificado, expected allocation y controles de salud como SRM.

Para canary añade pesos/steps reales, tiempo de exposición y qué routing produjo la cohorte.

Para shadow añade qué respuestas y side effects fueron suprimidos, y cómo se emparejaron control/candidate para comparación.

## No borres la evidencia al promover

Una vez que la variante gana, necesitas conservar:

- qué versión se evaluó;
- qué cohortes estuvieron expuestas;
- qué guardrails pasaron;
- qué alertas ocurrieron;
- qué rollout/rollback se ejecutó;
- qué resultados eran descriptivos y cuáles causales;
- qué datos llegaron tarde después de la decisión.

Esto conecta directamente con el siguiente capítulo: la evaluación online sólo es sostenible si observabilidad, taxonomía de fallos y reparación alimentan de vuelta los evals offline.

## Regla de producción

> **Shadow responde «¿cómo se comporta el candidato sobre tráfico real sin servirlo?»; canary responde «¿es suficientemente seguro ampliar exposición real?»; A/B responde «¿qué efecto causal produce el tratamiento bajo este diseño?». Los guardrails limitan qué riesgos pueden aceptarse y el regression gate decide si la evidencia disponible permite avanzar.**

La calidad del sistema depende menos de tener muchos dashboards que de que cada etapa tenga una pregunta, una población, una identidad de variante, una frontera de side effects y una decisión explícita.

---

## Fuentes primarias

[^istio-mirroring]: Istio. *Mirroring*. https://istio.io/latest/docs/tasks/traffic-management/mirroring/

[^argo-canary]: Argo Rollouts. *Canary*. https://argo-rollouts.readthedocs.io/en/stable/features/canary/

[^argo-analysis]: Argo Rollouts. *Analysis & Progressive Delivery*. https://argo-rollouts.readthedocs.io/en/stable/features/analysis/

[^microsoft-exp]: Kohavi, R. et al. *Online Experimentation at Microsoft*. Microsoft Research, 2009. https://www.microsoft.com/en-us/research/publication/online-experimentation-at-microsoft/

[^microsoft-platform]: Gupta, S. et al. *The Anatomy of a Large-Scale Experimentation Platform*. IEEE ICSA, 2018. https://www.microsoft.com/en-us/research/publication/the-anatomy-of-a-large-scale-experimentation-platform/

[^srm]: Fabijan, A. et al. *Diagnosing Sample Ratio Mismatch in Online Controlled Experiments: A Taxonomy and Rules of Thumb for Practitioners*. KDD, 2019. https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/

[^microsoft-during]: Machmouchi, W., Gupta, S., Zhang, R. *Patterns of Trustworthy Experimentation: During-Experiment Stage*. Microsoft Experimentation Platform, 2021. https://www.microsoft.com/en-us/research/articles/patterns-of-trustworthy-experimentation-during-experiment-stage/

[^metric-pitfalls]: Dmitriev, P. et al. *A Dirty Dozen: Twelve Common Metric Interpretation Pitfalls in Online Controlled Experiments*. KDD, 2017. https://www.microsoft.com/en-us/research/publication/a-dirty-dozen-twelve-common-metric-interpretation-pitfalls-in-online-controlled-experiments/
