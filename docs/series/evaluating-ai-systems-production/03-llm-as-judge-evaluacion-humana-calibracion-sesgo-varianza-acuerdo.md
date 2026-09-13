---
title: "LLM-as-judge y evaluación humana: calibración, sesgo, varianza y acuerdo"
description: "Cómo convertir juicios humanos y model-based graders en evidencia fiable: rúbricas, calibración, acuerdo, repetición, position bias, adjudicación y gates de producción."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "LLM-as-judge, human evaluation, grader calibration, inter-rater agreement, Cohen kappa, position bias, evaluator variance, AI evaluation"
tags:
  - IA
  - Evaluación
  - Reliability
  - Producción
---

# Capítulo 3 — LLM-as-judge y evaluación humana: calibración, sesgo, varianza y acuerdo

Un juez automático puede convertir miles de outputs abiertos en labels o scores. Eso no convierte sus decisiones en verdad.

Un panel humano puede aportar criterio experto. Eso tampoco elimina desacuerdo, ambigüedad ni sesgos de presentación.

La pregunta de este capítulo es concreta:

> **¿Cuándo podemos confiar en un grader humano o basado en un LLM lo suficiente como para usar su señal en una decisión de release?**

La respuesta no es «cuando parece razonable» ni «cuando coincide mucho con humanos» sin especificar qué humanos, sobre qué casos y bajo qué protocolo. Necesitamos separar cinco propiedades:

1. **validez de la rúbrica**: si el criterio codifica el comportamiento que realmente importa;
2. **fiabilidad**: si el juez produce una decisión estable cuando nada material cambia;
3. **acuerdo**: cuánto coincide con una referencia o con otros evaluadores independientes;
4. **sesgo sistemático**: si posición, estilo, longitud, identidad o familia del modelo cambian la nota sin cambiar la calidad relevante;
5. **alcance**: en qué distribución y para qué tipo de decisión se validó el juez.

Anthropic recomienda graders deterministas cuando sea posible y LLM graders cuando se necesita flexibilidad, con calibración frecuente contra expertos humanos para tareas subjetivas.[^anthropic-evals] La API de Graders de OpenAI expone, entre otros, graders programáticos, de etiqueta y de score basados en modelos.[^openai-graders] Esa disponibilidad es una **capacidad de tooling**. No certifica por sí misma que una rúbrica o un juez sean válidos para nuestro producto.

{{ include_html("snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html") }}

## Primero define qué significa «calibrar»

En este capítulo usamos *calibración del juez* en sentido operativo: comprobar una versión concreta del grader contra decisiones independientes y casos de control antes de escalarlo.

No es lo mismo que calibración probabilística.

Si un grader devuelve una etiqueta `pass/fail` o un score ordinal de 1 a 5, ese número **no es automáticamente una probabilidad**. No deberíamos hablar de «70% de confianza calibrada» a menos que el protocolo produzca una probabilidad con una interpretación estadística explícita y hayamos validado esa interpretación.

Para un juez de producción, una identidad útil es:

```text
judge_version =
  model revision
  + rubric/prompt revision
  + decoding/config revision
  + evidence/context supplied
  + output parser
```

Cambiar uno de esos elementos puede cambiar la política de decisión. Por eso la calibración pertenece a una **versión del juez**, no a una marca o familia de modelos en abstracto.

## Elige primero el tipo de grader más estrecho que resuelva la pregunta

No uses un LLM para juzgar una propiedad que puede comprobarse exactamente.

### Determinista

Útil cuando existe un invariante verificable:

- un test pasa;
- un campo JSON cumple un schema;
- una acción produjo el estado esperado;
- una cita corresponde a un identificador permitido;
- un número cae dentro de una tolerancia definida.

Aquí el problema principal es especificar bien el check, no imitar preferencia humana.

### LLM-as-judge

Útil cuando el criterio es semántico o admite múltiples respuestas válidas:

- claridad de una explicación;
- cumplimiento de una política expresada en lenguaje natural;
- calidad de una síntesis;
- si una respuesta está sustentada por evidencia proporcionada;
- comportamiento conversacional que una regla exacta no captura bien.

El grader debe recibir sólo el contexto necesario para decidir y una salida permitida cuando la evidencia no basta, por ejemplo `unknown` o `insufficient_evidence`.[^anthropic-evals]

### Evaluación humana

Es especialmente valiosa cuando:

- estamos definiendo una rúbrica nueva;
- el coste de un falso positivo es alto;
- los casos son ambiguos o dependen de experiencia de dominio;
- necesitamos entender *por qué* discrepan distintos criterios;
- el juez automático todavía no está calibrado para esa distribución.

El objetivo no es elegir un ganador universal entre humano y LLM. Es asignar cada decisión al mecanismo que puede producir evidencia defendible.

## Una rúbrica vaga produce una varianza que el modelo no puede arreglar

Supongamos que pedimos:

```text
Score the answer for quality from 1 to 5.
```

¿Qué significa calidad? ¿Correctitud, cobertura, tono, concisión, grounding, seguridad?

Dos jueces pueden aplicar funciones distintas y aun así seguir literalmente la instrucción.

Una rúbrica útil separa dimensiones y ancla cada una con criterios observables:

```text
groundedness:
  pass: every material claim is supported by supplied evidence
  fail: at least one material claim lacks support or contradicts evidence
  unknown: supplied evidence is insufficient to decide

policy_compliance:
  pass: action satisfies all listed policy constraints
  fail: action violates at least one listed constraint
  unknown: required policy state is missing
```

Separar dimensiones también ayuda a diagnosticar desacuerdo. Un único score compuesto puede ocultar que todos coinciden en factualidad y discrepan sólo en estilo.

## Los humanos también necesitan un protocolo

«Human-rated» no describe una metodología completa.

Como mínimo registra:

```text
rater expertise / locale
rubric_version
examples_or_anchors_version
blindness / model identity visibility
randomization policy
independent rating before adjudication
adjudication rule
item assignment
rater_id or stable pseudonym
```

### Independencia antes de adjudicar

Si H1 ve la decisión de H2 antes de puntuar, ya no tenemos dos observaciones independientes.

Un flujo sano es:

```text
item
→ H1 label
→ H2 label
→ store both
→ measure disagreement
→ adjudicate if the protocol requires a final label
```

La adjudicación produce una referencia operativa. No debe borrar el desacuerdo original: ese desacuerdo contiene información sobre ambigüedad de la task o de la rúbrica.

### Blindar la identidad cuando no forma parte del criterio

Si el rater sabe qué proveedor o modelo produjo cada respuesta, la identidad puede influir en la decisión.

Para comparar outputs, oculta identidad y randomiza orden salvo que el objeto de evaluación requiera explícitamente conocer el sistema de origen.

## Acuerdo observado: mide primero lo que realmente ocurrió

Para dos evaluadores con labels categóricas, el acuerdo observado es:

\[
p_o = \frac{1}{N}\sum_{i=1}^{N}\mathbf{1}[j_i=h_i]
\]

`p_o` responde a una pregunta simple: **¿en qué fracción de items dieron la misma label?**

Pero no muestra dónde discrepan. Acompáñalo con una matriz de confusión o, como mínimo, counts por label.

Ejemplo ilustrativo:

```text
                 humano
              pass  fail
juez pass       72     8
juez fail        6    14
```

Aquí `p_o = (72 + 14) / 100 = 0.86`.

Esto es aritmética ilustrativa, no un benchmark de ningún modelo.

## Cohen's κ: corregir acuerdo esperado no crea una métrica universal

Para dos raters y categorías nominales, Cohen propuso:[^cohen-kappa]

\[
\kappa = \frac{p_o-p_e}{1-p_e}
\]

Donde `p_e` es el acuerdo esperado a partir de las frecuencias marginales de labels.

En el ejemplo anterior:

- juez: `pass=0.80`, `fail=0.20`;
- humano: `pass=0.78`, `fail=0.22`;
- `p_e = 0.80\cdot0.78 + 0.20\cdot0.22 = 0.668`;
- `κ = (0.86 - 0.668)/(1 - 0.668) ≈ 0.578`.

La diferencia entre `0.86` y `0.578` no es una contradicción. Son métricas distintas.

Además, `p_e` depende de los marginales. Por eso no uses κ como un score absoluto que pueda compararse sin contexto entre datasets con prevalencias diferentes. Reporta al menos `N`, distribución de labels, `p_o`, κ y la matriz de confusión.

Si hay más de dos raters, categorías ordinales o scores continuos, usa una medida de acuerdo apropiada al diseño en lugar de forzar Cohen's κ.

## Acuerdo con humanos no demuestra validez del criterio

Dos jueces pueden coincidir perfectamente y estar aplicando la rúbrica equivocada.

Ejemplo: humanos y LLM podrían favorecer una respuesta fluida y larga aunque el requisito real sea «no afirmar nada fuera de la evidencia suministrada».

Por eso el orden correcto es:

```text
constructo de producto
→ rúbrica
→ casos de calibración
→ juicio humano independiente
→ juez automático
→ análisis de acuerdo + sesgos
```

No al revés.

El paper de MT-Bench/Chatbot Arena mostró que, bajo su protocolo, jueces LLM fuertes podían aproximar preferencias humanas y estudió explícitamente position bias, verbosity bias y self-enhancement bias.[^mtbench-judge] Es evidencia de que este enfoque puede funcionar bajo setups concretos, no una garantía transferible a cualquier dominio, rúbrica o modelo juez.

## Varianza: un solo juicio puede esconder inestabilidad

Un model-based grader puede ser estocástico por sampling, infraestructura o sensibilidad a pequeñas variaciones de prompt/contexto.

Para un score numérico `s_{i,r}` del item `i` en repetición `r`, podemos medir:

\[
\bar{s}_i = \frac{1}{R}\sum_{r=1}^{R}s_{i,r}
\]

\[
\hat{\sigma}^2_i = \frac{1}{R-1}\sum_{r=1}^{R}(s_{i,r}-\bar{s}_i)^2
\]

No hace falta repetir indefinidamente. Sí hace falta conocer si el gate de release cambia porque el mismo juez oscila cerca del umbral.

Para labels categóricas, guarda la distribución de resultados:

```text
item_42, R=10
pass: 6
fail: 3
unknown: 1
```

Convertir esto silenciosamente en `pass` elimina una señal importante de incertidumbre.

### Distingue varianza del juez de desacuerdo de la task

Si el mismo juez cambia de opinión al repetir, tenemos inestabilidad intra-juez.

Si jueces estables discrepan entre sí, puede haber diferencias de política, de capacidad o ambigüedad en la rúbrica.

No son el mismo fallo y no se corrigen igual.

## Position bias: el control mínimo es invertir el orden

En una comparación A/B, ejecuta también B/A.

Define una consistencia de swap:

\[
SC = \frac{1}{N}\sum_{i=1}^{N}
\mathbf{1}[pref_i(A,B)=flip(pref_i(B,A))]
\]

`SC=1` significa que invertir el orden no cambió la preferencia semántica en los items medidos.

No significa que las preferencias sean correctas.

El trabajo original de MT-Bench/Chatbot Arena identificó position bias entre las limitaciones de LLM-as-judge.[^mtbench-judge] Estudios posteriores han mostrado que la magnitud depende del juez y de la task, por lo que no debemos importar un único «factor de corrección» universal.[^position-bias]

En producción, el gate debería fallar si una decisión de release depende de un juez cuya preferencia cambia materialmente al invertir el orden.

## Verbosidad y estilo: controla contenido antes de atribuir el sesgo

«El juez prefiere respuestas largas» es una hipótesis, no una conclusión automática.

Una respuesta larga puede contener más información correcta. Para probar un sesgo de estilo necesitamos pares controlados donde el contenido relevante sea equivalente o donde la transformación esté explícitamente diseñada.

Controles útiles:

- orden A/B ↔ B/A;
- formato markdown ↔ texto plano si el formato no es criterio;
- conciso ↔ expandido sin añadir claims;
- nombre/identidad del modelo oculto;
- referencias o citations presentadas de forma equivalente.

Si el contenido cambia, el experimento ya no aísla estilo.

## Self-preference y familia del juez: cruza generadores y jueces

El paper de MT-Bench discutió *self-enhancement bias*: un juez puede favorecer respuestas que se parecen a su propia distribución.[^mtbench-judge]

No asumas que «usar el modelo más fuerte» elimina este problema.

Una matriz de control puede cruzar:

```text
generator_family × judge_family × task_stratum
```

Si el ranking cambia sistemáticamente cuando el judge comparte familia con un candidato, trátalo como señal de riesgo y amplía revisión humana o usa un panel de jueces con política explícita.

No conviertas una observación de un benchmark concreto en una regla sobre todos los proveedores.

## La referencia puede ayudar y también cambiar la task

Para problemas con respuesta objetiva, aportar una referencia al juez puede reducir carga de razonamiento.

Pero una referencia demasiado estrecha también puede penalizar soluciones válidas diferentes.

Antes de introducirla, decide si la task es:

- **reference-matching**: esperamos una solución concreta;
- **constraint satisfaction**: hay múltiples soluciones válidas;
- **preference**: comparamos calidad bajo una rúbrica subjetiva.

El grader debe corresponder a ese constructo.

## Calibración práctica: no uses el holdout para escribir el prompt del juez

Construye un **calibration/dev bank** donde puedas iterar rúbrica, ejemplos y prompt del grader.

Reserva después un banco independiente para confirmar el juez.

```text
calibration/dev
  → tune rubric + judge prompt
  → inspect disagreement
  → repair ambiguity

judge validation holdout
  → freeze judge version
  → measure agreement / bias / variance
  → accept, restrict or reject scope
```

Si inspeccionas el holdout después de cada cambio del grader y vuelves a editar el prompt, ese banco ya participa en el desarrollo.

Este es exactamente el mismo principio de leakage de desarrollo del capítulo 5.2, aplicado al evaluador.

## Un gate de aceptación del juez

No existe un threshold universal de κ, acuerdo o `SC` que haga «bueno» a un judge en cualquier sistema.

Define umbrales desde el coste de error del producto.

Un gate reproducible puede exigir:

```text
judge_revision fixed
rubric_revision fixed
validation_set fixed and not used for tuning
per-stratum sample counts declared
raw agreement + confusion matrix
agreement statistic appropriate to label type
repeat stability near release boundary
A/B ↔ B/A consistency for pairwise judging
controlled style/length probes
human review of disagreements
known failure strata explicitly excluded or routed to humans
```

La salida no tiene que ser binaria `judge good / judge bad`.

Puede ser:

```text
ACCEPT: automatic judging for low-risk support-quality items
RESTRICT: human fallback for safety/policy disputes
REJECT: not reliable enough for release gating
```

Ese alcance debe viajar con la versión del grader.

## Tres casos concretos

### Caso A — Grounding de un asistente RAG

Queremos saber si cada claim material está soportado por evidencia suministrada.

Diseño:

1. checks deterministas para presencia/validez de IDs de citas;
2. LLM judge aislado para entailment claim↔evidence;
3. calibration bank etiquetado por expertos;
4. `unknown` cuando la evidencia no permita decidir;
5. validación por estratos: factual simple, síntesis multi-source, conflicto entre fuentes;
6. revisión humana de falsos `pass`, porque son el fallo más costoso.

No usamos «fluidez» dentro del mismo score de grounding.

### Caso B — Comparar dos respuestas de soporte

Queremos elegir la que resuelve mejor el caso sin violar política.

Primero validamos determinísticamente las acciones de política que puedan comprobarse. Después comparamos comunicación/calidad con A/B y B/A.

Si el judge cambia de ganador con frecuencia al invertir posiciones, el problema no se arregla promediando silenciosamente: se investiga el sesgo o se deriva esa región a humanos.

### Caso C — Review humano de respuestas de alto riesgo

Dos especialistas puntúan independientemente una decisión sensible.

Guardamos:

- labels originales;
- rationale/evidencia señalada;
- `p_o` y matriz de confusión;
- κ sólo si el diseño categórico de dos raters lo hace apropiado;
- adjudicación final separada.

Si el desacuerdo se concentra en un subgrupo, el siguiente paso es revisar la rúbrica o el contexto de ese estrato, no esconderlo bajo el promedio global.

## Qué registrar con cada resultado basado en un judge

Como mínimo:

```text
judge_type: deterministic | llm | human | hybrid
judge_model_revision: ...
judge_prompt_rubric_revision: ...
judge_sampling_config: ...
human_protocol_revision: ...
calibration_set_version: ...
validation_set_version: ...
item_stratum: ...
raw_judgments: ...
repetitions: ...
position_randomization: ...
agreement_metrics: ...
known_bias_probes: ...
adjudication_status: ...
```

Sin esta identidad, repetir «el mismo eval» después de cambiar juez o rúbrica puede medir una política diferente.

## Implicación de producción

Un LLM-as-judge no debe entrar en un release gate porque sea barato, rápido o porque un benchmark externo diga que los LLM judges pueden concordar bien con humanos.

Debe entrar cuando **esa versión concreta** del juez:

1. implementa una rúbrica que representa el riesgo del producto;
2. se ha comparado con decisiones humanas independientes en casos relevantes;
3. mantiene estabilidad suficiente alrededor del umbral operativo;
4. supera probes de sesgo diseñados para su forma de juzgar;
5. declara los estratos donde no es fiable y deriva esos casos a otro mecanismo.

La arquitectura robusta suele ser híbrida:

```text
deterministic invariants
+ calibrated model graders for scalable semantic checks
+ targeted human review for ambiguity, high-risk cases and judge maintenance
```

El principio central es:

> **un judge es otro componente del sistema de medida: necesita versión, tests, calibración, límites y observabilidad.**

En el siguiente capítulo aplicaremos esta disciplina al objeto más difícil de evaluar: una trayectoria completa de agente con tools, recuperación, eficiencia y cumplimiento de política.

## Referencias

[^anthropic-evals]: Anthropic Engineering, *Demystifying evals for AI agents*, 9 Jan 2026. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[^openai-graders]: OpenAI API Reference, *Graders*. https://platform.openai.com/docs/api-reference/graders
[^mtbench-judge]: Lianmin Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*, NeurIPS 2023 Datasets and Benchmarks Track. https://arxiv.org/abs/2306.05685
[^position-bias]: Lin Shi et al., *Judging the Judges: A Systematic Study of Position Bias in LLM-as-a-Judge*, 2024. https://arxiv.org/abs/2406.07791
[^cohen-kappa]: Jacob Cohen, *A Coefficient of Agreement for Nominal Scales*, Educational and Psychological Measurement 20(1), 1960. https://doi.org/10.1177/001316446002000104
