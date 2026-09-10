---
title: "Tests y verifiers en coding agents: cuándo puede el harness decir que una tarea está terminada"
description: "Cómo combinar tests, verifiers, revisión del diff, evidencia ligada al commit, stop conditions y evaluación repetida para decidir si un coding agent puede cerrar una tarea."
date: 2026-09-10
date_modified: 2026-09-10
keywords: "coding agents, agent harness, tests, verifiers, diff review, stop conditions, evals, software engineering agents"
tags:
  - IA
  - Agentes
  - Software
  - Coding agents
  - Evaluación
---

# Capítulo 5 — Tests, verifiers, review de diffs, stop conditions y evaluación de tareas

Un coding agent puede ejecutar `pytest` y obtener verde, escribir «done» y aun así no haber terminado la tarea.

Quizá modificó un test para que aceptara el comportamiento equivocado. Quizá rompió una API no cubierta. Quizá la revisión se hizo sobre un commit anterior. Quizá el entorno de evaluación conservaba estado de otra ejecución. O quizá la tarea pedía dos condiciones y los tests sólo comprobaban una.

Por eso el harness necesita separar dos preguntas:

```text
¿qué evidencia produjo este candidato?
¿esa evidencia es suficiente y sigue siendo válida para cerrar la tarea?
```

La segunda pregunta es una decisión del sistema, no una frase generada por el modelo.

{{ include_html("snippets/articulos-tecnicos/coding-agent-verification-stack.html") }}

## Test, verifier, reviewer y stop condition no son sinónimos

Conviene distinguir cuatro objetos:

| Objeto | Qué hace | Qué no demuestra por sí solo |
|---|---|---|
| Test | Ejecuta assertions sobre comportamiento o estado | Que el conjunto de assertions cubra todo el contrato |
| Verifier | Produce evidencia sobre el candidato: tests, build, tipos, lint, estado externo, invariantes | Que una señal concreta sea suficiente para aceptar |
| Reviewer | Inspecciona semántica, riesgos, scope y decisiones difíciles de codificar | Que su juicio sea determinista o esté actualizado tras otro commit |
| Stop condition | Decide continuar, replanificar, aceptar o devolver la tarea | Que `stop = success` |

Anthropic usa una separación relacionada en sus evals: una **task** define input y criterios de éxito, un **grader** puntúa aspectos del resultado o de la trayectoria y el **outcome** es el estado final real del entorno. También distingue el evaluation harness que ejecuta y agrega la evaluación del agent harness que hace actuar al modelo.[^anthropic-evals]

Para un harness de desarrollo podemos usar `verifier` como término más amplio que un test concreto:

```text
verifier(candidate, environment, contract) → evidence
```

Esa evidencia puede ser binaria, numérica o estructurada. La decisión de cierre consume varias evidencias.

## «Los tests pasan» sólo tiene significado respecto a un contrato

Supón una tarea:

```text
Añade --json a `acme users list`.
Conserva exactamente el modo de texto existente.
Devuelve exit code 2 si el filtro es inválido.
No cambies la API Python pública.
```

Si el agente añade dos tests para `--json` y ambos pasan, todavía faltan tres partes del contrato.

El harness debería convertir los acceptance criteria en un mapa verificable:

| Criterio | Evidencia mínima |
|---|---|
| `--json` produce JSON válido | test funcional / invocación CLI |
| modo de texto no cambia | regression tests / snapshot estable |
| filtro inválido → exit 2 | test negativo |
| API Python pública estable | contract test / type surface / review |
| scope limitado | diff/path review |

No todos los criterios necesitan el mismo mecanismo. Lo importante es poder responder **qué evidencia respalda cada criterio**.

Una suite verde no rellena automáticamente una celda que nunca fue evaluada.

## El resultado importa más que una trayectoria ritual

Un agent puede llegar a una solución válida por caminos distintos. Obligarle a hacer exactamente:

```text
search → open → edit → test → edit → test
```

puede convertir el grader en un test del estilo de trabajo en lugar de un test del resultado.

Anthropic recomienda preferir graders deterministas cuando sea posible, pero también advierte contra verificar secuencias rígidas de tool calls cuando varias trayectorias válidas pueden resolver la tarea; en esos casos conviene evaluar el outcome.[^anthropic-evals]

Esto no significa que la trayectoria sea irrelevante. Hay propiedades que sí viven en ella:

```text
¿leyó o exfiltró un secreto?
¿usó una tool prohibida?
¿ignoró una approval obligatoria?
¿repitió una mutación no idempotente?
```

La regla es separar **trayectoria necesaria para policy** de **trayectoria accidental de implementación**.

## Los verifiers deben observar el efecto real

Un proceso que termina con código `0` sólo demuestra que ese proceso declaró éxito.

Para una migración:

```text
command exit code = 0
```

no equivale a:

```text
schema esperado existe
constraints esperadas existen
datos conservados
rollback o forward recovery definido
```

Para una publicación:

```text
API respondió 200
```

no equivale a:

```text
artefacto correcto está desplegado
```

Y para un coding task:

```text
agent_message = "all tests pass"
```

no equivale a haber ejecutado esos tests sobre el commit que queremos aceptar.

Cuando el sistema externo tiene estado observable, un verifier fuerte comprueba la **postcondition**, no sólo la intención ni el stdout del agente.

## La evidencia debe estar ligada al candidato exacto

Este fallo es muy frecuente:

```text
A → tests PASS
A → review PASS
A → agente corrige un comentario → B
B → merge
```

La revisión y los tests pertenecían a `A`, no a `B`.

GitHub documenta esta semántica de forma concreta para Copilot code review: después de nuevos pushes no vuelve a revisar automáticamente salvo que se habilite `Review new pushes` o se solicite una nueva revisión; además, una aprobación de Copilot puede ser descartada cuando llegan commits posteriores.[^github-code-review]

La lección general no depende de Copilot:

```text
verification_result sin candidate identity = evidencia incompleta
```

Un registro útil debería incluir como mínimo:

```yaml
candidate_sha: 73ab91f...
contract_version: 3
environment_fingerprint: py311-linux-lock-8f42
verifier_version: cli-contract-v5
command: pytest tests/cli tests/regression
result: pass
started_at: 2026-09-10T17:21:04Z
finished_at: 2026-09-10T17:22:11Z
```

Es un ejemplo de contrato de harness, no un estándar.

Si el candidate SHA cambia, el harness debe invalidar cada evidencia cuyo resultado pueda depender del cambio.

## No todo cambio obliga a repetir absolutamente todo

Invalidar evidencia no significa ejecutar siempre la suite más cara desde cero.

El harness puede representar dependencias:

```text
src/cli/output.py
   ├─→ cli_contract_tests
   ├─→ text_mode_regressions
   └─→ type_check

docs/cli.md
   └─→ docs_build
```

Si sólo cambia `docs/cli.md`, no hay razón técnica para fingir que un test de base de datos aporta nueva información.

Pero esta optimización necesita una dependencia explícita y conservadora. Si no sabemos si una modificación puede afectar una evidencia, la opción fail-closed es volver a ejecutarla.

El objetivo es **fresh evidence**, no «máximo número de comandos».

## Los tests también son parte del diff y pueden estar equivocados

Un coding agent suele poder modificar a la vez:

```text
implementation
existing tests
new tests
fixtures
snapshots
CI config
```

Eso crea un riesgo importante: el agente puede hacer que el oracle se adapte al bug.

Ejemplo:

```diff
- assert run("bad-filter").returncode == 2
+ assert run("bad-filter").returncode == 0
```

La suite continúa verde. El contrato dejó de cumplirse.

Por eso la revisión del diff debe tratar cambios de tests y graders como cambios de **criterio de aceptación**, no como archivos auxiliares.

Según el caso, pueden ayudar:

```text
hidden/out-of-band tests
contract tests fuera del workspace editable
comparación base → head de tests y snapshots
protección de CI/graders
reference solution para validar el evaluator
```

Anthropic recomienda una reference solution que demuestre que la tarea es resoluble y que los graders están configurados correctamente, además de diseñar graders resistentes a bypasses.[^anthropic-evals]

## Diff review cubre preguntas que una suite puede no codificar

Una revisión útil del diff no consiste en volver a leer todos los archivos.

Busca fronteras de riesgo:

```text
scope:          ¿tocó rutas fuera de la tarea?
public API:     ¿cambió firmas, formatos o contratos?
config/CI:      ¿relajó una protección o un verifier?
dependencies:  ¿añadió código o paquetes innecesarios?
data:           ¿hay migraciones o cambios destructivos?
tests:          ¿añadió cobertura o movió el objetivo?
generated:      ¿versionó artefactos accidentales?
security:       ¿amplió permisos, red o secretos?
```

Parte puede automatizarse con reglas de paths, diff size, schema checks o scanners. La semántica difícil puede necesitar revisión humana o model-based.

GitHub, por ejemplo, dice explícitamente que los PR producidos por Copilot cloud agent merecen la misma revisión minuciosa que cualquier otra contribución antes de merge.[^github-agent-review]

## Un model reviewer es evidencia probabilística, no un oracle

Un segundo modelo puede detectar inconsistencias que los tests no expresan:

```text
¿el cambio resuelve realmente el issue?
¿la nueva abstracción rompe invariantes implícitos?
¿hay un edge case no cubierto?
¿el diff introduce complejidad innecesaria?
```

Pero un LLM grader/reviewer sigue siendo no determinista. Anthropic recomienda calibrar LLM-as-judge contra expertos humanos y dar salida explícita como `Unknown` cuando no dispone de información suficiente.[^anthropic-evals]

Además, «usar otro agente» no garantiza independencia. Puede compartir:

```text
mismo modelo
mismo contexto incompleto
mismas instrucciones del repo
mismo bug conceptual
```

Por tanto, un reviewer model-based complementa tests y revisión humana; no convierte una inferencia en ground truth.

## La revisión también envejece

Incluso una revisión excelente puede quedar obsoleta si cambia:

```text
candidate SHA
base branch relevante
contract version
config del verifier
instrucciones que usa el reviewer
```

GitHub documenta otra frontera concreta: Copilot code review lee las custom instructions y skills desde la **head branch** del PR. Eso significa que esas instrucciones también forman parte del contexto de la revisión y pueden cambiar junto al código revisado.[^github-code-review]

Un harness serio guarda suficiente provenance para saber qué se revisó y bajo qué configuración.

## Stop condition no significa success condition

Un agent loop puede terminar por varias razones:

```text
ACCEPTED
REWORK_REQUIRED
HAND_BACK_TO_HUMAN
BLOCKED_BY_AUTHORITY
ENVIRONMENT_FAILURE
BUDGET_EXHAUSTED
NO_PROGRESS
```

Todas son stop conditions. Sólo una representa aceptación.

Esto evita un antipatrón peligroso:

```text
modelo no llama más tools → tarea terminada
```

El modelo puede detenerse porque cree erróneamente que acabó, porque perdió contexto o porque no sabe continuar.

El harness debe decidir el cierre a partir del contrato y la evidencia.

## Un success gate puede expresarse explícitamente

Como modelo conceptual, no como estándar:

\[
\operatorname{Accept}(h)=
C(h)\land V(h)\land D(h)\land P(h)\land F(h)
\]

Para el candidato \(h\):

- \(C\): todos los acceptance criteria obligatorios tienen evidencia;
- \(V\): los verifiers requeridos pasan;
- \(D\): diff/review no deja blocker conocido;
- \(P\): policy y approvals necesarios siguen válidos;
- \(F\): toda la evidencia requerida es **fresh** para el candidato y entorno actuales.

Falla cualquiera de esas condiciones y el estado no es `ACCEPTED`.

Esto es deliberadamente distinto de:

```text
Accept(h) = agent_says_done(h)
```

## Stop conditions de fallo también protegen calidad y coste

Un loop sin criterio de salida puede repetir la misma acción indefinidamente.

Un handback razonable puede activarse cuando ocurre una condición demostrable:

```text
falta una credencial o approval que el agent no puede obtener
la spec tiene dos interpretaciones incompatibles con impacto material
el entorno de evaluación es inestable y no permite obtener evidencia válida
se repite el mismo fallo sin nueva información
una acción necesaria excede la policy
se alcanza un budget explícito de intentos/tiempo/coste
```

La condición «mismo fallo sin nueva información» es más útil que un número mágico universal de reintentos. El budget concreto depende de la tarea, coste y criticidad.

`HAND_BACK_TO_HUMAN` tampoco significa fracaso del modelo. Puede ser la respuesta correcta cuando la siguiente decisión necesita autoridad que el agent no posee.

## El entorno de evaluación forma parte del resultado

Dos ejecuciones con el mismo patch pueden producir resultados distintos si cambia:

```text
sistema operativo
versión de runtime
lockfile/dependencias
servicios externos
fixtures
clock/timezone
estado previo
CPU/memoria disponible
```

SWE-bench usa containers Docker para crear entornos reproducibles y su harness aplica patches, ejecuta tests y determina el resultado dentro de ese entorno.[^swebench-harness]

Anthropic recomienda que cada trial empiece desde un entorno limpio y aislado; estado compartido, caches o agotamiento de recursos pueden introducir fallos correlacionados o incluso ventajas artificiales.[^anthropic-evals]

Por eso un resultado sin environment identity tiene menos fuerza de la que parece.

## Evaluar un coding agent exige evaluar modelo + harness + tarea + grader

Un benchmark de coding agents no mide «el modelo» en vacío.

El resultado depende de:

```text
model
agent harness
prompt/instructions
tools
context/repository snapshot
sandbox/environment
budget
task specification
graders/tests
scoring rule
```

Anthropic lo formula explícitamente: cuando evalúa «un agent», evalúa el modelo y el harness juntos.[^anthropic-evals]

Por eso no es válido comparar dos porcentajes como si fueran la misma medición cuando cambian el harness, el budget, el entorno o la versión de la suite.

## Un benchmark verde también puede medir mal

En febrero de 2026, OpenAI dejó de reportar SWE-bench Verified para frontier launches tras identificar contaminación y problemas de especificación/tests; entre otras cosas, encontró tests que rechazaban soluciones funcionalmente correctas y señales de exposición a problemas/soluciones durante training.[^openai-swebench-verified]

La lección no es «SWE-bench es malo». Es que **el benchmark también necesita evaluación**.

Ese punto se volvió aún más importante en julio de 2026: una auditoría de OpenAI sobre SWE-Bench Pro estimó que aproximadamente el **30% de las tareas auditadas por su metodología eran problemáticas**, con problemas de task specification, tests o grading.[^openai-swebench-pro]

Ese ~30% es el resultado de esa auditoría concreta; no debe extrapolarse como tasa universal de error de benchmarks.

Antes de interpretar una puntuación necesitamos inspeccionar:

```text
qué task se ejecutó
qué snapshot y entorno
qué veía el agent
qué budget tenía
qué grader decidió pass/fail
si el grader acepta soluciones válidas alternativas
si existe contaminación o leakage
```

## Una ejecución no estima fiabilidad

Los agentes son estocásticos. Que una tarea pase una vez demuestra posibilidad, no consistencia.

Anthropic distingue dos preguntas:

- **pass@k**: probabilidad de conseguir al menos un éxito en `k` intentos;
- **pass^k**: probabilidad de que los `k` intentos sean exitosos.[^anthropic-evals]

Si una aplicación puede probar varias soluciones y elegir una válida, `pass@k` puede ser relevante. Si cada usuario necesita que la tarea funcione de forma repetible, la consistencia capturada por `pass^k` responde otra pregunta.

No deben intercambiarse.

Para una tarea con probabilidad de éxito por trial \(p\), bajo trials independientes e idénticamente distribuidos:

\[
P(\text{al menos un éxito en }k)=1-(1-p)^k
\]

\[
P(\text{todos exitosos en }k)=p^k
\]

La hipótesis de independencia importa: si todos los trials comparten un servicio roto o estado contaminado, esas fórmulas no describen correctamente el experimento.

## Capability eval y regression gate tienen objetivos distintos

Una capability eval pregunta:

```text
¿qué tareas difíciles puede resolver el sistema y con qué distribución de éxito?
```

Una regression suite pregunta:

```text
¿seguimos resolviendo aquello que ya consideramos obligatorio?
```

Anthropic recomienda que las regression evals protejan comportamiento conocido con tasas de éxito cercanas al 100%, mientras las capability evals deben contener dificultad suficiente para discriminar progreso.[^anthropic-evals]

En CI de una tarea concreta solemos querer un **gate determinista de regresión**. En evaluación de un agent harness queremos además una **distribución de capacidad y fiabilidad** sobre muchas tareas/trials.

Confundir ambas lleva a dos errores:

```text
usar un benchmark probabilístico como merge gate de un único PR
usar una suite trivial al 100% para afirmar progreso de capacidad
```

## Caso trabajado: cerrar correctamente `--json`

Volvamos al ejemplo.

El agent termina con este candidate SHA:

```text
73ab91f
```

El harness ejecuta:

```text
1. contract verifier
   - `acme users list --json` → JSON válido
   - filtro inválido → exit 2

2. regression verifier
   - tests del modo texto existentes → PASS
   - contract tests API Python → PASS

3. static verifier
   - type check → PASS
   - lint → PASS

4. diff verifier/review
   - paths fuera de scope → ninguno
   - tests existentes debilitados → no
   - CI / permisos → sin cambios

5. freshness gate
   - todos los resultados pertenecen a 73ab91f
   - working tree limpio
   - contract_version = 3
```

El evidence bundle podría ser:

```yaml
candidate_sha: 73ab91f
contract_version: 3
environment_fingerprint: py311-linux-lock-8f42
required_checks:
  cli_contract: pass
  text_regression: pass
  python_api_contract: pass
  typecheck: pass
  lint: pass
diff_review:
  blocker_count: 0
  test_oracle_changed: false
freshness:
  all_evidence_matches_candidate: true
stop_reason: ACCEPTED
```

De nuevo, es una estructura ilustrativa.

Si el agent corrige después una línea y crea `84cd120`, el estado correcto vuelve a ser:

```text
84cd120 → NOT YET VERIFIED
```

No heredamos `PASS` por proximidad temporal.

## Qué debería guardar el harness para poder explicar un cierre

Un cierre auditable necesita menos narrativa y más provenance:

```text
task_id + contract_version
base_sha + candidate_sha
workspace/environment identity
changed paths + diff digest
verifier names + versions + commands
start/end time + exit/result
artifacts relevantes
reviewer identity/config + reviewed SHA
approvals/policy evidence cuando aplique
known blockers
stop_reason
```

Con eso podemos reconstruir **por qué** se aceptó una tarea y qué cambió si después aparece una regresión.

Sin ello, «pasó ayer» es difícil de distinguir de «creemos que pasó sobre algo parecido».

## Trade-off: cobertura, latencia y coste de verificación

Más checks no siempre significan mejor sistema.

Una suite puede tardar horas, depender de servicios caros o producir flakiness. Un reviewer model-based puede añadir coste y ruido. Una revisión humana de cada diff puede destruir throughput.

La solución es estratificar evidencia:

```text
rápido + determinista + local     → en cada iteración relevante
selectivo por dependencia         → tras cambios de scope concreto
caro / integración / humano       → milestone o frontera de riesgo
full regression                   → antes de release cuando el contrato lo exige
```

Pero el harness no debe degradar silenciosamente un requisito porque es caro. Si un check obligatorio no puede ejecutarse, el estado correcto es `BLOCKED/UNVERIFIED`, no `PASS`.

## Implicación de producción: «done» debe ser un estado derivado

El modelo propone código y puede sugerir que terminó. El harness calcula el estado final a partir de evidencia verificable.

La regla operativa es:

```text
agent intent → candidate
candidate → evidence
evidence + contract + policy → stop decision
```

Eso permite autonomía sin convertir la autoconfianza del modelo en criterio de merge.

Un buen harness puede cerrar rápido cuando la evidencia es fuerte, reabrir cuando cambia el candidate SHA y hacer handback cuando falta autoridad o verificabilidad.

En el siguiente capítulo esta lógica se extiende a tareas que duran mucho más que una sesión: memoria, subagentes, recuperación, integración, merge y observabilidad deben conservar no sólo el trabajo, sino también la provenance de qué sigue siendo válido.

## Referencias primarias

[^anthropic-evals]: Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), 9 de enero de 2026. Se usan sus definiciones de task/trial/grader/outcome/evaluation harness, tipos de graders, stable isolated environments, outcome-based grading, reference solutions, bypass resistance, calibración humana y pass@k/pass^k.
[^github-code-review]: GitHub Docs, [Using GitHub Copilot code review on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review). Se usan únicamente sus semánticas actuales de re-review/new pushes, approvals y contexto de custom instructions; no se generalizan otras capacidades de Copilot al harness.
[^github-agent-review]: GitHub Docs, [Review output from Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/review-copilot-output). Se usa la recomendación first-party de revisar los cambios del cloud agent antes de merge y sus fronteras de approval/workflow como ejemplo de control externo.
[^swebench-harness]: SWE-bench, [Evaluation Harness Reference](https://github.com/SWE-bench/SWE-bench/blob/main/docs/reference/harness.md). Se usa la descripción del harness Docker que prepara entornos, aplica patches, ejecuta tests y determina resultados reproducibles.
[^openai-swebench-verified]: OpenAI, [Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/), 23 de febrero de 2026. Se usan sus hallazgos sobre contaminación, task/test mismatch y límites de interpretar el benchmark como señal de capacidad frontier.
[^openai-swebench-pro]: OpenAI, [Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/), 8 de julio de 2026. Se usa su auditoría de SWE-Bench Pro y su estimación contextualizada de tareas problemáticas; no se extrapola esa cifra fuera de la metodología reportada.
