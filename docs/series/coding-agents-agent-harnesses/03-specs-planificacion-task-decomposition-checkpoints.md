---
title: "Specs y planificación en coding agents: convertir una petición en un contrato verificable"
description: "Cómo separar petición, instrucciones persistentes, spec, plan, grafo de tareas y checkpoint para que un coding agent pueda replanificar sin cambiar silenciosamente el objetivo ni declarar éxito sin evidencia."
date: 2026-09-10
date_modified: 2026-09-10
keywords: "coding agents, task specification, agent planning, task decomposition, checkpoints, agent harness, acceptance criteria"
tags:
  - IA
  - Agentes
  - Software
  - Coding agents
  - Planificación
  - Evaluación
---

# Capítulo 3 — Specs, planificación, task decomposition, checkpoints y contratos de tarea

Un coding agent puede ejecutar cientos de pasos correctos y aun así resolver **la tarea equivocada**.

El fallo suele empezar antes de escribir código. Una petición como «añade salida JSON al comando `users list`» no dice necesariamente qué comportamiento existente debe conservarse, qué archivos pueden cambiar, qué casos definen éxito, qué decisiones requieren handback ni contra qué revisión hay que verificar el resultado.

Tampoco lo arregla convertir la petición en una lista larga de TODOs. Una lista ordena trabajo. No define por sí sola **qué significa terminar correctamente**.

Este capítulo usa siete objetos distintos:

1. **petición**: lo que el usuario quiere conseguir;
2. **instrucciones persistentes**: reglas del repositorio y del entorno que aplican a muchas tareas;
3. **contrato de tarea o spec**: resultado esperado, alcance, restricciones y criterios observables de aceptación;
4. **plan**: hipótesis actual de cómo llegar al resultado;
5. **grafo de tareas**: dependencias y unidades verificables del plan;
6. **checkpoint**: estado recuperable y evidencia asociada en un momento concreto;
7. **evidencia de cierre**: pruebas de que el contrato se cumplió sobre un estado de código identificable.

No son sinónimos. Mezclarlos vuelve difícil saber si hay que **replanificar**, **pedir una decisión**, **repetir una verificación** o **dar la tarea por terminada**.

{{ include_html("snippets/articulos-tecnicos/coding-agent-task-contract.html") }}

## La petición no es todavía el contrato

Una petición humana suele describir intención, no todos los invariantes necesarios para ejecutar de forma autónoma.

```text
Añade --json a `acme users list`.
```

Antes de mutar el repositorio, un harness debería poder transformar esa intención en una representación más verificable. Por ejemplo:

```yaml
task_id: CA-203
contract_version: 1
base_sha: 8f2c...91a
integration_target: main

goal:
  acme users list --json produce una representación JSON documentada

in_scope:
  - parser del comando
  - serialización de salida
  - tests del CLI
  - documentación del flag

out_of_scope:
  - cambiar la salida de texto por defecto
  - modificar el protocolo de la API remota
  - actualizar dependencias sin necesidad demostrada

acceptance:
  - `acme users list` conserva su comportamiento existente
  - `acme users list --json` produce JSON válido con el esquema documentado
  - combinaciones de flags inválidas siguen la convención de error del CLI
  - pasan los tests focalizados y la suite de integración relevante

stop_if:
  - el esquema público requiere una decisión de producto que el contrato no resuelve
```

Este YAML es **un ejemplo de contrato del harness, no un estándar**. Lo importante son las propiedades: objetivo observable, alcance positivo y negativo, restricciones, identidad de la revisión, verificación y condiciones de parada.

El contrato responde **qué debe ser verdad al terminar**. El plan responderá **qué creemos ahora que hay que hacer para conseguirlo**.

## Instrucciones persistentes y spec resuelven problemas diferentes

Repositorios agentic modernos pueden contener instrucciones persistentes como `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` u otros mecanismos equivalentes.

OpenAI documenta que Codex lee `AGENTS.md` antes de empezar a trabajar y construye una cadena de instrucciones desde reglas globales hasta reglas más cercanas al directorio activo.[^openai-agents-md] GitHub describe de forma parecida las custom instructions de repositorio como contexto persistente sobre estructura, estándares y comandos de build/test.[^github-custom-instructions]

Ese tipo de archivo es adecuado para reglas como:

```text
- usa pnpm, no npm
- ejecuta make lint antes de entregar
- no cambies migrations existentes
- los handlers HTTP viven en services/api/
```

Pero no debería convertirse en el lugar donde escondemos el objetivo de una tarea concreta:

```text
- hoy añade --json a users list
```

La diferencia operativa es importante:

| Objeto | Vida útil típica | Pregunta que responde |
|---|---|---|
| Instrucción persistente | muchas tareas | ¿cómo se trabaja correctamente en este repositorio? |
| Contrato de tarea | una tarea y sus enmiendas | ¿qué resultado debe producir esta trayectoria? |
| Plan | una versión de la estrategia | ¿qué secuencia creemos que nos llevará al resultado? |

Si cambias una convención estable, actualiza la instrucción persistente. Si cambia el resultado pedido, **versiona o enmienda el contrato de tarea**. Si sólo descubriste que el archivo correcto estaba en otro módulo, normalmente basta con replanificar.

## Un plan es una hipótesis, no la autoridad de la tarea

Los coding agents actuales ya exponen explícitamente modos de planificación. El template oficial de Plan Mode de Codex permite acciones no mutantes para recopilar evidencia y pide producir un plan suficientemente completo para una ejecución posterior, mientras bloquea mutaciones del repositorio durante esa fase.[^codex-plan] Claude Code también documenta un Plan Mode orientado a investigar y proponer antes de realizar cambios de código.[^claude-plan]

Esto permite separar dos fases que a menudo se mezclan:

```text
observar el repositorio → formar una estrategia
                         ≠
                    ejecutar cambios
```

Pero incluso un plan detallado puede quedar obsoleto después del primer comando.

Supón que el plan decía:

```text
1. añadir --json al parser
2. reutilizar User.to_dict()
3. añadir tests
```

Durante la inspección descubrimos que `User.to_dict()` expone un campo interno que nunca debería formar parte del CLI público. La respuesta correcta no es «seguir el plan porque ya fue aprobado». Es **replanificar sin cambiar silenciosamente el contrato**:

```text
contrato v1: igual
plan v2:
1. añadir --json al parser
2. crear un serializer público con los campos aceptados
3. añadir tests de esquema y regresión del modo texto
```

La autoridad sigue siendo `acceptance + constraints + scope`. El plan es la estrategia mutable para satisfacerla.

## Replanificar no autoriza a redefinir éxito

Esta frontera evita una forma común de specification drift.

Imagina que un test de compatibilidad falla porque el agente cambió sin querer la salida de texto. Hay dos caminos:

```text
A) corregir la implementación hasta recuperar la compatibilidad
B) editar el criterio de aceptación para permitir el cambio
```

A es replanificación o reparación. B es **una enmienda del contrato** y necesita una fuente de autoridad válida: usuario, issue actualizado, decisión de producto o el mecanismo que el sistema haya definido.

Un harness fail-closed debería registrar algo parecido a:

```json
{
  "task_contract_version": 1,
  "plan_version": 3,
  "reason_for_replan": "existing serializer leaks internal field",
  "acceptance_changed": false
}
```

Si `acceptance_changed=true`, los verificadores y checkpoints dependientes de la versión anterior dejan de demostrar el nuevo contrato hasta que se reevalúen.

## El contrato también puede quedarse obsoleto

No basta con versionar el plan. La fuente que originó la tarea puede cambiar durante una ejecución larga.

GitHub documenta un caso concreto para Copilot cloud agent: al asignarle un issue recibe el título, descripción y comentarios existentes **en el momento de la asignación**, pero no ve automáticamente comentarios añadidos después; la información posterior debe trasladarse al PR.[^github-task]

La implicación general no es «todos los agentes de GitHub funcionan igual». Es que un harness necesita saber **qué snapshot de requisitos consumió**.

Una representación útil puede incluir:

```text
requirements_source = issue#842
requirements_revision = issue_body_hash + last_consumed_comment_id
contract_version = 4
```

Si la fuente cambia, el sistema debe decidir explícitamente si:

- el cambio no afecta a la tarea;
- exige una enmienda del contrato;
- invalida parte del plan;
- invalida verificaciones ya ejecutadas;
- o requiere handback antes de continuar.

Sin esa reconciliación, una tarea puede terminar exactamente según una versión de requisitos que ya no existe.

## Task decomposition: una lista no es todavía un grafo

Dividir «añade `--json`» en cinco bullets parece planificación, pero no expresa qué se puede paralelizar ni qué evidencia habilita el siguiente paso.

Una descomposición más útil nombra dependencias:

```text
A  inspeccionar parser, salida y convenciones de error
│
├── B  implementar parseo de --json
└── C  implementar serializer público
     │
B + C ──> D  tests de CLI y esquema
B + C ──> E  documentación
D + E ──> F  verificación integrada
```

Ahora aparecen propiedades que una checklist plana oculta:

- B y C dependen de lo observado en A;
- D necesita el comportamiento conjunto de B y C;
- F no puede empezar sólo porque «5/6 tareas estén hechas»;
- si C cambia el esquema después de D, D queda stale;
- paralelizar B y C sólo es seguro si no compiten por el mismo estado o contrato mutable.

El objetivo de la descomposición no es maximizar el número de subagentes. Es crear **fronteras de trabajo con inputs, outputs y verificaciones comprensibles**.

## Qué debe contener un nodo de trabajo

Un nodo suficientemente explícito puede representarse así:

```yaml
node_id: D
purpose: verificar el contrato observable del CLI JSON
inputs:
  - parser con flag --json
  - serializer público
preconditions:
  - B PASS
  - C PASS
expected_outputs:
  - tests de modo texto
  - tests de esquema JSON
verification:
  - pytest tests/cli/users_list.py
invalidates_if:
  - cambia el parser relevante
  - cambia el serializer público
```

De nuevo, no es un formato estándar. Hace visible una idea más importante: **la evidencia tiene dependencias**.

Un PASS no debería vivir como un booleano eterno. Tiene que estar ligado al código y a los inputs que verificó.

## Checkpoint no significa lo mismo en todos los harnesses

«Tenemos checkpoints» puede describir capacidades muy diferentes.

Claude Code documenta que crea checkpoints del estado de archivos antes de ediciones y permite restaurar código y conversación de forma independiente. También documenta límites relevantes: cambios producidos directamente por comandos Bash y modificaciones externas concurrentes no quedan cubiertos de la misma forma por ese mecanismo, y checkpointing no sustituye a Git.[^claude-checkpoint]

Gemini CLI documenta otro diseño: cuando su checkpointing está habilitado, crea una snapshot basada en un shadow Git repository antes de modificaciones de archivos y guarda además estado conversacional/tooling para poder restaurarlo.[^gemini-checkpoint]

No hay contradicción. **Son scopes de checkpoint distintos.**

Por eso un sistema de producción no debería guardar sólo:

```text
checkpoint = true
```

Debería poder contestar:

```text
¿qué filesystem quedó capturado?
¿qué cambios no quedan capturados?
¿qué HEAD/workspace corresponde al checkpoint?
¿qué procesos o servicios externos seguían vivos?
¿qué contrato y qué plan estaban activos?
¿qué verificaciones habían pasado y sobre qué SHA?
```

## Un checkpoint útil necesita identidad y límites

Conectándolo con el capítulo anterior, un checkpoint recuperable puede registrar:

```yaml
checkpoint_id: cp-17
task_contract_version: 1
plan_version: 2
base_sha: 8f2c...91a
current_head_sha: 41ba...1fd
workspace_id: wt-CA-203
completed_nodes: [A, B, C]
open_assumptions:
  - public JSON fields approved by existing docs
verification_results:
  - command: pytest tests/cli/users_list.py
    verification_head_sha: 41ba...1fd
    exit_code: 0
uncommitted_state_inventory: captured
external_effects:
  - test_db_namespace: ca203
next_node: D
```

Un resume seguro no «continúa el chat». Primero reconcilia ese estado con la realidad actual.

Si `current_head_sha` cambió, el worktree desapareció o la sandbox policy ya no es la misma, parte del checkpoint puede seguir siendo información útil, pero **ya no prueba continuidad causal**.

## Los checkpoints también necesitan invalidación

Una trayectoria larga acumula resultados:

```text
lint PASS
unit tests PASS
integration tests PASS
manual review PASS
```

El problema aparece cuando cambia el código después de cada PASS.

La regla mínima es:

```text
verification_result = (check, inputs, environment, verification_head_sha, outcome)
```

Si un cambio posterior toca inputs que afectan al check, el resultado debe considerarse stale hasta repetirlo o demostrar de forma determinista que sigue siendo válido.

No hace falta reejecutar absolutamente todo después de cada carácter. Sí hace falta que el harness tenga una política explícita de **dependencias e invalidación**, en vez de sumar checks verdes de estados distintos y llamarlo «done».

## Stop conditions: cuándo no seguir autónomamente

Un buen contrato no sólo enumera acciones permitidas. Define condiciones bajo las que continuar sería inventar una decisión.

Ejemplos:

```text
STOP si el cambio exige elegir un esquema público no especificado
STOP si hay que ampliar el scope a un servicio que el contrato excluye
STOP si la migración requiere borrar datos reales
STOP si el target de integración avanzó y rompe una premisa del diseño
STOP si una verificación requerida no puede ejecutarse con evidencia fiable
```

Una stop condition no es «el agente se rindió». Es una frontera de autoridad.

El handback debería incluir la evidencia que permite decidir:

```text
qué se descubrió
qué parte del contrato queda bloqueada
qué alternativas concretas existen
qué estado del workspace se conserva
qué decisión mínima permite continuar
```

## Completion: terminar nodos no equivale a terminar la tarea

El harness debe evaluar el contrato original contra el estado final, no inferir éxito a partir del progreso del plan.

Una salida de cierre útil puede parecerse a:

```yaml
task_id: CA-203
contract_version: 1
final_head_sha: 7ea1...0bc
verification_head_sha: 7ea1...0bc
acceptance:
  default_text_behavior: PASS
  json_schema: PASS
  invalid_flag_behavior: PASS
  integration_suite: PASS
scope_review: PASS
unresolved_stop_conditions: []
cleanup_state: complete
```

Hay dos invariantes fuertes:

1. **cada criterio de aceptación tiene evidencia**, no sólo una frase del modelo;
2. **`verification_head_sha` coincide con el código entregado**, o existe una explicación verificable de por qué una evidencia anterior sigue siendo válida.

Esto evita el patrón «los tests pasaron, luego hice un último cambio pequeño, luego declaré terminado».

## Cómo encajan los siete objetos

Podemos resumir la máquina de estados así:

```text
PETICIÓN + INSTRUCCIONES PERSISTENTES + REPO OBSERVADO
                         │
                         ▼
                  CONTRATO DE TAREA vN
             objetivo · scope · aceptación
               restricciones · stop rules
                         │
                         ▼
                    PLAN / GRAFO vM
                         │
                ejecutar + observar
                         │
             ┌───────────┴───────────┐
             │                       │
       supuesto inválido       criterio ambiguo
             │                       │
        REPLANIFICAR              HANDBACK /
       contrato igual          ENMIENDA CONTRATO
             │                       │
             └───────────┬───────────┘
                         ▼
                  VERIFICAR + CHECKPOINT
                         │
              ¿aceptación completa y
            evidencia sobre el head final?
                   │             │
                  sí            no
                   │             │
                 DONE        seguir/bloquear
```

La clave es que cada transición tenga una razón observable. El agente puede cambiar de estrategia muchas veces sin cambiar qué significa éxito.

## Qué deberías registrar en producción

Como mínimo:

```text
task_id
requirements_source + revision
repository_id
base_sha
integration_target
task_contract_version
plan_version
node/dependency state
open assumptions
workspace_id
sandbox/policy identity
checkpoint_id + checkpoint scope
verification results + verification_head_sha
contract amendments
stop/handback decisions
final_head_sha
cleanup_state
```

No necesitas exponer todos estos campos al usuario. Sí necesitas conservar suficientes para poder responder después a cuatro preguntas:

- ¿qué se pidió exactamente?
- ¿qué supuso el agente y qué descubrió?
- ¿qué código verificó cada PASS?
- ¿por qué el sistema decidió continuar, parar o declarar terminado?

## Implicación para producción

La planificación de un coding agent no debería medirse por lo larga que sea su lista de pasos.

Un harness fiable necesita mantener **dos cosas en tensión**:

- **estabilidad del objetivo**: el contrato, el scope y la aceptación no cambian sólo porque la implementación sea incómoda;
- **plasticidad de la estrategia**: el plan, el orden y la descomposición sí cambian cuando nueva evidencia invalida una hipótesis.

Los checkpoints hacen recuperable esa trayectoria sólo si especifican qué capturan. Los verificadores hacen atribuible el progreso sólo si sus resultados están ligados al estado que comprobaron.

Eso convierte «haz esta tarea» en una ejecución que puede inspeccionarse, reanudarse y auditarse sin confiar en que el modelo recuerde correctamente lo que quiso hacer.

## Qué deberías recordar

- Una petición expresa intención; un contrato convierte esa intención en condiciones observables de éxito.
- Las instrucciones persistentes del repositorio definen cómo trabajar y no sustituyen el spec de una tarea concreta.
- El plan es una hipótesis revisable. El contrato es la autoridad de éxito hasta que una fuente autorizada lo enmienda.
- Replanificar no permite rebajar acceptance criteria ni ampliar scope silenciosamente.
- Una checklist no expresa dependencias. Un grafo de tareas puede ligar inputs, outputs, precondiciones e invalidación.
- Un checkpoint sólo es útil si conoces su scope y sus exclusiones.
- Checkpointing de producto, Git y estado externo pueden cubrir superficies distintas.
- Un PASS debe quedar ligado a los inputs y al `verification_head_sha` que realmente comprobó.
- Completar todos los nodos del plan no demuestra que el contrato esté satisfecho.
- Stop conditions y handback son fronteras de autoridad, no fallos de autonomía.

## Referencias

[^openai-agents-md]: OpenAI, [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Documenta la carga de instrucciones persistentes antes de trabajar, su jerarquía global/proyecto y el orden de precedencia por directorio.
[^codex-plan]: OpenAI, [`plan.md` de Codex](https://github.com/openai/codex/blob/main/codex-rs/collaboration-mode-templates/templates/plan.md). Template oficial de Plan Mode: permite investigación no mutante para reducir ambigüedad y separa planificación de mutaciones del repositorio.
[^claude-plan]: Anthropic, [Permission modes](https://code.claude.com/docs/en/permission-modes). Documenta Plan Mode como fase de investigación/propuesta sin editar código fuente antes de pasar a ejecución.
[^claude-checkpoint]: Anthropic, [Checkpointing](https://code.claude.com/docs/en/checkpointing). Documenta snapshots/restauración y sus límites, incluidos cambios vía Bash y cambios externos, y especifica que checkpointing no sustituye a version control.
[^github-task]: GitHub, [Kick off a task with Copilot agents on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task). Documenta qué información de un issue recibe el agente al asignarlo y que comentarios posteriores no se incorporan automáticamente a esa asignación.
[^github-custom-instructions]: GitHub, [Customize Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-copilot-overview). Describe custom instructions persistentes para estructura, estándares y workflows del repositorio.
[^gemini-checkpoint]: Google, [Checkpointing — Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/cli/checkpointing.html). Describe snapshots locales basados en shadow Git y restauración del estado asociado a modificaciones de archivos.