---
title: "Observabilidad, taxonomías de fallos y feedback loops producción → eval → reparación"
description: "Cómo convertir señales reales de producción en casos reproducibles, evals versionados, reparaciones verificables y regresiones sin confundir telemetría con veredicto ni sobreajustar cada incidente."
date: 2026-09-13
date_modified: 2026-09-13
keywords: "AI observability, failure taxonomy, production monitoring, evals, regression testing, incident response, traces, feedback loop"
tags:
  - IA
  - Evaluación
  - Observabilidad
  - Producción
  - Reliability
---

# Capítulo 6 — Observabilidad, taxonomías de fallos y feedback loops producción → eval → reparación

Los capítulos anteriores han construido el sistema de evaluación desde dentro hacia fuera: qué frontera evaluar, cómo diseñar conjuntos offline, cómo calibrar jueces, cómo inspeccionar trayectorias y cómo exponer cambios progresivamente en producción.

Falta cerrar el circuito.

Un sistema real produce señales que ningún eval estático conoce de antemano: inputs nuevos, combinaciones raras de tools, dependencias lentas, estados parciales, abusos, cambios de distribución y fallos que sólo aparecen después de miles de sesiones. La producción aporta evidencia imprescindible. Pero **telemetría no equivale a un veredicto de evaluación**, y un incidente no debe convertirse automáticamente en un test.

La pregunta de este capítulo es:

> **¿Cómo transformamos una señal de producción en evidencia reproducible que pueda guiar una reparación y prevenir la regresión sin entrenarnos para memorizar el incidente?**

{{ include_html("snippets/articulos-tecnicos/eval-production-feedback-loop.html") }}

## Observabilidad y evaluación responden preguntas distintas

La observabilidad intenta reconstruir **qué ocurrió** en un sistema en ejecución.

Puede incluir:

- métricas agregadas: error rate, timeouts, latencia tail, coste, abandono;
- logs de eventos y decisiones;
- traces y spans que conectan una request con modelos, retrieval, tools, guardrails y handoffs;
- estado de dependencias;
- feedback del usuario;
- tickets, escalados e incidentes.

Una evaluación pregunta otra cosa: **bajo un contrato declarado, ¿el sistema cumple el comportamiento que queremos medir?**

La diferencia importa. Un pico de `tool_error_rate` demuestra que una señal cambió; no identifica por sí solo si la causa fue un argumento inválido del agente, una API degradada, un token expirado, un timeout de red o un bug en el propio instrumento.

De forma análoga, un trace completo puede explicar una ejecución sin decir si esa ejecución era correcta. OpenAI Agents SDK, por ejemplo, documenta tracing end-to-end con spans para generaciones, function tools, guardrails, handoffs y audio. Esa capacidad mejora la reconstrucción causal del workflow, pero no convierte el trace en grader.[^openai-tracing]

La regla base es:

> **telemetry → hipótesis; reproducción + criterio → evidencia de eval.**

## Primero conserva una identidad reproducible del sistema

Un fallo que no puede vincularse a lo que realmente estaba desplegado es muy difícil de explicar.

Para cada sesión o task relevante, registra suficiente identidad para reconstruir el paquete ejecutado:

```text
candidate_id
model + snapshot
prompt / policy version
retrieval / index version
tool schema + implementation version
runtime / harness version
routing / fallback policy
feature flags
relevant environment version
```

No todo tiene que vivir en un único trace, pero debe existir una clave de correlación estable.

Esto evita el antipatrón:

```text
"el modelo falló el martes"
```

cuando el martes también cambió el índice, hubo una nueva versión del tool y una región operó con fallback distinto.

## Un trace útil preserva causalidad, no todos los bytes

Registrar más datos no es siempre registrar mejor evidencia.

Las convenciones actuales de OpenTelemetry para GenAI estandarizan nombres para operaciones y atributos, pero advierten que mensajes de entrada/salida, queries de retrieval y argumentos/resultados de tools pueden contener información sensible o PII.[^otel-genai] La documentación de OpenAI Agents SDK hace una advertencia equivalente: los spans de generación y functions pueden contener inputs/outputs sensibles y permite desactivar su captura.[^openai-tracing]

Por tanto, un contrato de observabilidad debe responder al menos:

```text
qué campos necesitamos para diagnosticar
qué datos se redactan o tokenizan
quién puede acceder
cuánto tiempo se retienen
qué identificadores permiten correlación
qué contenido NO debe persistirse
```

**Observabilidad no autoriza copiar conversaciones de producción al eval set.** Antes de reutilizar una sesión como caso de evaluación hay que aplicar privacidad, permisos, redacción y políticas de retención correspondientes.

OpenTelemetry además sigue evolucionando sus semantic conventions; usar nombres estandarizados mejora interoperabilidad, pero no convierte cada atributo GenAI en un contrato estable para siempre. La versión de instrumentación también forma parte de la evidencia.[^otel-semconv]

## De la anomalía a una taxonomía de fallos

Una taxonomía no sirve para producir un dashboard bonito. Sirve para que dos fallos con el mismo mecanismo terminen juntos aunque su texto superficial sea distinto.

Una taxonomía operacional puede separar, como mínimo:

| Familia | Ejemplo de síntoma | Pregunta diagnóstica |
|---|---|---|
| Input / distribución | formato o idioma nuevo | ¿el supuesto de entrada dejó de cumplirse? |
| Retrieval / contexto | respuesta desactualizada | ¿falló selección, freshness, ranking o ensamblado? |
| Modelo / decisión | reasoning incorrecto | ¿el error aparece antes de cualquier tool? |
| Tool selection / argumentos | tool correcto, parámetros inválidos | ¿la policy eligió mal o construyó mal la llamada? |
| Side effect / estado | write duplicado o parcial | ¿el estado externo coincide con la intención? |
| Orquestación / recovery | retry incorrecto, timeout mal reconciliado | ¿la recuperación preservó invariantes? |
| Policy / seguridad | acción no autorizada | ¿se violó una frontera no compensatoria? |
| UX / handoff | usuario abandonó o escalado incorrecto | ¿el workflow terminó técnicamente pero falló la experiencia? |
| Infra / dependencia | API externa lenta o indisponible | ¿el comportamiento del sistema es correcto bajo una dependencia degradada? |
| Observabilidad | trace incompleto o métrica corrupta | ¿podemos confiar en la evidencia recogida? |
| Eval / grader | caso válido marcado como FAIL | ¿el oracle o la task están equivocados? |

La clasificación debe poder expresar **síntoma** y **causa** por separado.

```text
symptom = duplicate_refund
cause = retry_after_ambiguous_timeout_without_state_reconciliation
```

Si sólo guardamos `duplicate_refund`, la reparación puede atacar la capa equivocada.

NIST AI RMF Playbook recomienda monitorización post-deployment, mecanismos de feedback, respuesta a incidentes, recuperación y change management, además de documentar errores, near-misses y patrones de ataque.[^nist-manage] También recomienda comparar comportamiento pre- y post-deployment y usar casos del entorno operacional para testing y monitoring.[^nist-measure] Es orientación de gestión de riesgo, no una taxonomía universal; la taxonomía concreta debe reflejar las fronteras del producto.

## Un incidente no es todavía un eval case

Cuando producción revela un fallo, el camino incorrecto es:

```text
incident
→ copiar transcript
→ expected = "que no vuelva a pasar"
→ añadir a regression suite
```

Eso mezcla información privada, contexto accidental y criterio ambiguo.

El camino útil es construir un **caso reproducible mínimo** que conserve el mecanismo relevante.

Un recibo ilustrativo —no un estándar— podría ser:

```yaml
failure_case_id: support-refund-retry-017
observed_at: 2026-09-13T01:22:04Z
candidate_id: voice-support-4f2c
trace_id: redacted:8e4...
source: production_incident
symptom: duplicate_write
failure_family: orchestration_recovery
root_cause_hypothesis: retry_after_ambiguous_timeout
impact: financial_side_effect
reproduction:
  environment: sandbox-refunds-v12
  precondition: refund_not_yet_reconciled
  stimulus: provider_timeout_after_write
expected_invariant:
  - at_most_one_refund
  - reconcile_before_retry
verifier:
  type: deterministic_state_check
  version: refund-invariants-v3
provenance:
  user_content_retained: false
  redaction_policy: prod-to-eval-v2
```

La idea no es archivar el incidente completo. Es conservar **la condición que hace falsable la reparación**.

## Reproducibilidad decide qué tipo de gate necesitas

No todo fallo de producción debe terminar en el mismo eval suite.

### Caso A — comportamiento reproducible del sistema

Ejemplo: dado un estado concreto, el agente repite un write después de un timeout ambiguo.

Eso puede convertirse en un eval de trayectoria con un verifier de estado:

```text
initial state
→ tool call
→ ambiguous timeout
→ recovery decision
→ final external state
```

La reparación debe demostrar no sólo que el texto final cambió, sino que el invariante `at_most_one_write` permanece cierto.

### Caso B — fallo de infraestructura o capacidad

Ejemplo: un proveedor externo tuvo 40 segundos de latencia y agotó el pool de conexiones.

Forzar ese incidente dentro de un prompt eval puede ser la abstracción equivocada. Probablemente necesitas un reliability/load/fault-injection gate que reproduzca la condición de dependencia degradada.

El principio es:

> **lleva el fallo al harness más estrecho que pueda reproducir su mecanismo, y confirma después en la frontera donde vive el riesgo.**

### Caso C — evidencia insuficiente

Si falta el trace, el estado externo no es recuperable o el evento ocurrió bajo instrumentación defectuosa, no inventes una causa para crear un test.

Marca el caso como `INSUFFICIENT_EVIDENCE`, mejora la instrumentación y conserva el incidente como señal. Un test construido sobre una causa imaginada puede institucionalizar el diagnóstico equivocado.

## No sobreajustes el regression suite a incidentes individuales

Anthropic recomienda convertir fallos reales y tickets en eval cases, priorizados por impacto de usuario.[^anthropic-evals] Eso no implica almacenar cada incidente como un ejemplo único e independiente.

Si veinte tickets representan el mismo mecanismo, crear veinte tests casi idénticos infla la cobertura aparente.

Antes de añadir un caso:

1. **deduplica por mecanismo**, no sólo por texto;
2. define la **clase de equivalencia** que quieres proteger;
3. añade al menos un **neighbor case** donde el comportamiento correcto sea distinto;
4. cuando aplique, añade un **hard negative** para evitar que la reparación se convierta en regla universal;
5. separa el set de **regresión** del set de **capacidad**.

Ejemplo: si el bug fue «ante cualquier timeout, no reintentar», una reparación ingenua puede eliminar retries legítimos.

El paquete de regresión debería cubrir:

```text
ambiguous timeout after possible write → reconcile, then decide
confirmed pre-write timeout          → retry may be valid
read-only idempotent request         → retry policy can differ
explicit provider failure/no write   → safe recovery path
```

Así protegemos el **invariante** en vez de memorizar el incidente.

## El grader también puede ser el fallo

Un regression suite creciente acumula sus propios defectos.

Si un caso de producción parece fallar después de una reparación, revisa:

```text
agent/system behavior
AND task specification
AND environment
AND verifier/grader
```

Anthropic insiste en leer transcripts y grades porque un score bajo puede venir de una task ambigua, un harness roto o un grader que rechaza una solución válida.[^anthropic-evals]

Por tanto, cada caso nuevo debe guardar versión de:

- task / fixture;
- environment;
- verifier o rubric;
- system candidate;
- datos externos relevantes.

Una modificación del grader es una modificación del **oracle**. No debe presentarse como mejora del agente hasta separar ambos efectos.

## Repair loop: prueba la causa, no sólo que desaparece el síntoma

Un loop de reparación robusto puede escribirse así:

```text
1. detectar señal
2. reconstruir ejecución
3. clasificar síntoma + causa probable
4. reproducir el mecanismo
5. crear/actualizar el eval versionado
6. implementar reparación
7. ejecutar targeted regression
8. ejecutar suite vecina / broader regression
9. pasar shadow/canary cuando cambia riesgo real
10. monitorizar recurrencia después del deploy
```

El paso 8 evita el clásico «arreglé este ticket y rompí la clase vecina».

El paso 10 evita otro error: cerrar el loop en el CI. Una reparación no está completamente confirmada hasta que producción deja de mostrar la misma familia de fallo **sin ocultarla mediante nueva instrumentación o routing**.

### Métricas útiles para el loop

No hay un número universal que demuestre que el sistema está reparado. Pero sí conviene seguir medidas con denominador explícito:

```text
failure_family_rate
reproduction_success_rate
regression_pass_rate
recurrence_after_fix
mean_time_to_detect
mean_time_to_reproduce
mean_time_to_verified_repair
unknown / unclassified failure rate
```

Estas métricas miden el proceso además del modelo. Una caída de `unknown_failure_rate`, por ejemplo, puede significar mejor instrumentación y taxonomía, no mejor comportamiento del agente.

NIST recomienda medir tiempos de respuesta y reparación y evaluar si las métricas existentes son suficientes para detectar riesgos emergentes y guiar mejoras.[^nist-measure]

## Tres ejemplos concretos

### 1. Respuesta correcta, write duplicado

Un agente de soporte termina diciendo «reembolso completado». El usuario ve una respuesta correcta, pero el backend contiene dos refunds.

Un success metric basado sólo en el mensaje final puede marcar PASS.

El feedback loop correcto usa el trace para descubrir:

```text
tool write
→ timeout ambiguo
→ retry sin reconciliación
→ segundo write
```

Taxonomía: `orchestration_recovery + side_effect`.

Eval nuevo: estado externo y trayectoria, no match de texto. Repair: idempotency/reconciliation antes de retry. Regression neighbors: timeout antes del write, read-only tool e idempotent tool.

### 2. Retrieval desactualizado

Usuarios reportan que el asistente responde con una política antigua.

El feedback textual es sólo el síntoma. La correlación del trace muestra que las sesiones afectadas usaron `index_version=2026-08-31` después de que la política cambiara.

Taxonomía: `retrieval_context / freshness`.

La reproducción debe fijar snapshot de corpus y freshness contract. El eval puede comprobar selección de la versión vigente y comportamiento cuando existen documentos conflictivos. La reparación puede ser invalidación del índice, no un prompt que diga «usa información reciente».

### 3. p99 sube, pero el modelo no es la causa

Después de un release, p99 aumenta y hay más abandonos.

La métrica detecta la regresión. El trace revela que la mayor parte del tiempo está en una API de CRM y no en generación del modelo.

Taxonomía: `dependency / reliability`.

El gate correcto puede ser fault injection con latency budget y cancellation/recovery, seguido de canary. Convertirlo en un eval de respuesta lingüística produciría una falsa sensación de cobertura.

## El loop necesita ownership y estado explícitos

Un sistema operativo necesita saber qué ocurre después de clasificar un fallo.

Una máquina de estados mínima puede ser:

```text
OBSERVED
→ TRIAGED
→ REPRODUCED | INSUFFICIENT_EVIDENCE
→ EVAL_ADDED | EXISTING_EVAL_COVERS
→ REPAIR_CANDIDATE
→ REGRESSION_PASS
→ RELEASED
→ VERIFIED_IN_PRODUCTION
```

`REGRESSION_PASS` no equivale a `VERIFIED_IN_PRODUCTION`.

También conviene mantener estados como:

```text
DUPLICATE_MECHANISM
NOT_PRODUCT_DEFECT
GRADER_DEFECT
INSTRUMENTATION_DEFECT
PRIVACY_BLOCKED
```

Eso impide forzar todos los casos a la misma cola de «bugs del modelo».

## Qué debe quedar unido al caso

Para que el loop sea auditable, el caso debería conservar suficiente provenance:

```text
production evidence reference
failure taxonomy version
redaction/privacy decision
minimal reproducible fixture
expected invariant
verifier + version
candidate/version that failed
repair candidate/version
eval-set version
release/deploy identity
post-deploy verification evidence
```

No necesitas una plataforma concreta para expresar este contrato.

Lo importante es que una futura persona pueda contestar:

> **¿qué vimos, por qué creemos que falló, qué test representa ese mecanismo, qué cambio lo reparó y qué evidencia demuestra que no reapareció?**

## Producción no reemplaza el eval; el eval no reemplaza producción

Anthropic resume el patrón operativo de forma útil: automated evals ayudan pre-launch y en CI/CD, production monitoring detecta drift y fallos inesperados, A/B tests validan cambios significativos y la revisión humana cubre huecos y calibra criterios.[^anthropic-evals]

NIST plantea de forma similar el post-deployment monitoring y el TEVV continuo como actividades complementarias dentro del ciclo de riesgo.[^nist-manage]

Ninguna capa basta sola:

```text
offline eval
≠ production monitoring
≠ incident response
≠ randomized experiment
≠ human review
```

El sistema fiable es el que conecta esas capas conservando qué pregunta responde cada una.

## Regla de producción

**No conviertas telemetría en score, ni incidente en test, ni test que pasa en prueba de causa.**

Cierra el circuito sólo cuando puedas recorrerlo en ambas direcciones:

```text
producción
→ evidencia
→ mecanismo reproducible
→ eval versionado
→ reparación
→ regression gate
→ despliegue controlado
→ producción
```

Si el mismo fallo reaparece, no añadas otro caso idéntico por reflejo. Pregunta primero si falló la reparación, la cobertura, el verifier, el deploy, la taxonomía o la propia observabilidad.

Ahí termina la serie: evaluar sistemas de IA en producción no consiste en acumular scores. Consiste en construir evidencia que sobreviva a los cambios del sistema y pueda explicar por qué una decisión de release es defendible.

---

[^anthropic-evals]: Anthropic Engineering, [*Demystifying evals for AI agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), 9 de enero de 2026. Distingue evals, production monitoring, A/B y revisión humana; recomienda convertir fallos reales en eval cases, revisar transcripts y mantener suites de regresión.
[^openai-tracing]: OpenAI Agents SDK, [*Tracing*](https://openai.github.io/openai-agents-python/tracing/). Documenta traces/spans de generaciones, function tools, guardrails y handoffs, además de controles para contenido sensible.
[^otel-genai]: OpenTelemetry, [*Gen AI semantic attributes*](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/). Define atributos semánticos GenAI y advierte que messages, retrieval queries y tool arguments/results pueden contener información sensible o PII.
[^otel-semconv]: OpenTelemetry, [*Semantic Conventions 1.44.0*](https://opentelemetry.io/docs/specs/semconv/). Las convenciones proporcionan un vocabulario común para telemetry; su estabilidad debe comprobarse por señal/área y versión.
[^nist-manage]: NIST AI Resource Center, [*AI RMF Playbook — Manage*](https://airc.nist.gov/airmf-resources/playbook/manage/), especialmente Manage 4.1–4.2 sobre monitoring post-deployment, incident response, recovery, feedback y continual improvement. El Playbook es guidance voluntaria, no un checklist universal.
[^nist-measure]: NIST AI Resource Center, [*AI RMF Playbook — Measure*](https://airc.nist.gov/airmf-resources/playbook/measure/), especialmente Measure 2.4 y Measure 4 sobre comportamiento en producción, casos operacionales, feedback, métricas emergentes y tiempos de respuesta/reparación.