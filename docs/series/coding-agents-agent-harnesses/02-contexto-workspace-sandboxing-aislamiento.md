---
title: "Contexto, workspace y sandboxing en coding agents: aislar estado no es aislar ejecución"
description: "Un branch, un worktree, un sandbox y un contenedor resuelven problemas distintos. Este capítulo separa el estado que ve el agente, el workspace que modifica, la frontera de ejecución y la integración final."
date: 2026-09-10
date_modified: 2026-09-10
keywords: "coding agents, repository context, workspace, git worktree, sandboxing, branch isolation, agent harness"
tags:
  - IA
  - Agentes
  - Software
  - Coding agents
  - Arquitectura
  - Seguridad
---

# Capítulo 2 — Contexto de repositorio, workspace, sandboxing, worktrees/branches y aislamiento

Un coding agent puede trabajar en “el mismo repositorio” que tú y, aun así, estar operando sobre **otra realidad**.

Puede haber partido de otro commit. Puede tener archivos modificados que todavía no están en Git. Puede no ver un archivo ignorado que cambia el comportamiento del build. Puede ejecutar tests en un contenedor mientras otro agente ejecuta los suyos contra la misma base de datos. Puede estar en un worktree separado y seguir teniendo acceso a tu red o a credenciales del host.

Por eso “aislar al agente” no es una operación única. Hay que separar al menos cuatro preguntas:

1. **¿Qué estado del repositorio existe realmente?**
2. **¿Qué parte de ese estado llega al contexto del modelo?**
3. **¿Qué filesystem y procesos puede modificar el agente?**
4. **¿Cómo se integra el resultado sin mezclar trayectorias incompatibles?**

Un branch, un worktree, un sandbox y un contenedor pueden participar en la respuesta, pero **no son equivalentes**.

{{ include_html("snippets/articulos-tecnicos/coding-agent-isolation-stack.html") }}

## Cinco objetos que conviene nombrar por separado

Antes de diseñar concurrencia o seguridad, fija el vocabulario.

### 1. Repositorio y revisión base

El repositorio contiene historia, refs, objetos Git, configuración y una o más working trees. Para una tarea agentic necesitas además una **revisión base identificable**, normalmente un commit SHA.

Decir “trabaja sobre `main`” es insuficiente si `main` puede avanzar mientras dura la tarea. Una especificación reproducible se parece más a:

```text
repository = fjmmontiel/example
integration_target = main
base_sha = 8f2c...91a
```

El `base_sha` responde “¿desde qué código empezó esta trayectoria?”. El target responde “¿contra qué línea de integración debe revalidarse antes de entregar?”. Son dos hechos distintos.

### 2. Vista de contexto

El modelo no recibe automáticamente todos los bytes del repositorio. El harness selecciona o permite recuperar archivos, símbolos, instrucciones, diffs, logs e historia.

Llamaremos **vista de contexto** al subconjunto de evidencia del repositorio que realmente llega a una inferencia.

Puede ser más pequeño que el workspace y también estar desactualizado respecto a él. Si el agente editó `router.py` pero el siguiente turno conserva una copia anterior en contexto, tenemos un fallo de coherencia aunque el fichero correcto exista en disco.

### 3. Workspace

El workspace es el estado mutable contra el que se ejecutan lecturas, ediciones y comandos.

En Git no es sólo “la rama”. Incluye, como mínimo:

- el `HEAD` actual;
- el índice o staging area;
- archivos tracked modificados;
- archivos untracked;
- estado de submódulos si existen;
- y cualquier artefacto local que influya en el comportamiento: generated files, caches, lockfiles o configuración local según el proyecto.

La documentación de `git status` es explícita: los archivos untracked tienen un estado propio y los ignored no aparecen salvo que se soliciten; los submódulos también tienen estado adicional.[^git-status] Por eso **`git diff` no es un inventario completo del workspace**.

### 4. Sandbox de ejecución

El sandbox define qué efectos puede producir un proceso: dónde puede leer/escribir, a qué red puede conectarse y, según la implementación, qué procesos, syscalls, dispositivos o recursos puede utilizar.

OpenAI documenta esta separación de forma explícita para Codex: el sandbox define la frontera técnica —por ejemplo paths escribibles y acceso de red— y la approval policy decide cuándo una acción que cruza esa frontera debe detenerse para autorización.[^openai-safety]

Anthropic describe su sandbox de Claude Code alrededor de dos límites que deben tratarse conjuntamente: filesystem y network isolation.[^anthropic-sandbox] Gemini CLI, por su parte, ofrece perfiles de macOS Seatbelt y sandboxes basados en Docker/Podman con políticas diferentes de escritura y red.[^gemini-sandbox]

La implementación cambia; la frontera conceptual no: **workspace dice qué estado estás modificando; sandbox dice qué efectos de ejecución están permitidos**.

### 5. Ref de integración

El resultado debe acabar en una unidad revisable: commit, branch, patch o PR según el sistema.

Esa unidad no es el workspace completo. Un branch sólo referencia commits. Los cambios unstaged, los untracked y muchos efectos externos no aparecen mágicamente en él.

GitHub hace esta separación muy visible en Copilot cloud agent: limita al agente a una única rama sobre la que puede publicar cambios y exige revisión humana antes de mergear su draft PR; esas reglas de integración conviven con un entorno de desarrollo efímero y controles separados de credenciales, Actions y red.[^github-risks][^github-environment]

## Branch, worktree, sandbox y contenedor no son sinónimos

Esta confusión causa bugs operativos y también errores de seguridad.

| Mecanismo | Qué separa principalmente | Qué NO garantiza |
|---|---|---|
| Branch/ref | Una línea de commits e integración | Un directorio distinto, procesos distintos o un host seguro |
| Git worktree | Working tree + estado Git por worktree, como `HEAD` e índice | Aislamiento de red, secretos o procesos; compatibilidad semántica al mergear |
| Sandbox | Capacidades de ejecución: filesystem/red y otras según implementación | Que dos diffs sean compatibles o que el base SHA siga vigente |
| Contenedor/VM | Un entorno de procesos y filesystem configurable | Una política segura si mounts, red o credenciales son demasiado amplios |
| Namespace de servicios | Puertos, DBs, colas, buckets, caches o recursos externos por tarea | Aislamiento del repositorio o corrección del cambio |

No hay una jerarquía en la que “contenedor” sea simplemente una versión mejor de “worktree”. Resuelven dimensiones diferentes y a menudo se combinan.

## Qué hace realmente `git worktree`

Git permite adjuntar varias working trees al mismo repositorio para tener más de una revisión checked out a la vez.[^git-worktree]

Cuando creas una linked worktree, comparte con el repositorio común la mayor parte de los datos Git, pero mantiene por worktree elementos como `HEAD` e `index`.[^git-worktree][^git-glossary]

```bash
git worktree add -b agent/payments ../wt-payments main
git worktree add -b agent/search   ../wt-search   main
```

El resultado conceptual es:

```text
Git object store + la mayoría de refs/metadatos compartidos
        │
        ├── wt-payments/  HEAD=agent/payments  index propio  archivos propios
        └── wt-search/    HEAD=agent/search    index propio  archivos propios
```

Git comparte en general las refs bajo `refs/`, pero hay excepciones por worktree (`refs/bisect`, `refs/worktree`, `refs/rewritten`) y pseudorefs como `HEAD` son específicas de cada worktree.[^git-worktree] Por eso el diagrama anterior dice “la mayoría”, no “todas”.

Esto evita una clase importante de interferencia: dos agentes ya no sobrescriben el mismo `router.py` ni comparten el mismo índice simplemente porque ejecutan en paralelo.

También permite que cada trayectoria conserve su propio dirty state mientras avanza.

Pero la documentación de Git no presenta un worktree como security sandbox. Comparte metadatos y objetos del repositorio, y el proceso que trabaja dentro del directorio sigue sujeto a las capacidades del sistema operativo con las que fue lanzado.

**Un worktree aísla estado de trabajo; no limita por sí mismo lo que un proceso puede leer, ejecutar o enviar por red.**

## Una rama tampoco es un workspace

Este error es más sutil.

Supón que `agent/payments` apunta a `abc123`, pero dentro del worktree existen:

```text
M  src/payments.py
?? tests/fixtures/new_case.json
!! .env.local
```

La rama sigue apuntando a `abc123` hasta que se crea un commit. El fichero untracked tampoco pertenece a ningún commit. El ignored puede afectar al runtime sin aparecer en una revisión normal.

Si el harness persiste únicamente:

```json
{"branch": "agent/payments"}
```

no ha persistido suficiente información para reconstruir la realidad de la tarea.

Para una trayectoria recuperable interesa registrar algo parecido a:

```json
{
  "task_id": "T-184",
  "base_sha": "8f2c...91a",
  "head_sha": "abc123",
  "branch": "agent/payments",
  "worktree": "/work/T-184",
  "dirty_tracked": true,
  "untracked_inventory_captured": true,
  "submodule_state_captured": true,
  "sandbox_policy": "repo-write-no-network-v3"
}
```

No es un formato estándar. Es un ejemplo de las **invariantes que el harness necesita poder reconstruir**.

## Contexto del modelo y estado del workspace pueden divergir

Hay dos planos distintos:

```text
workspace real
    ↓ lectura/búsqueda/tool
observación serializada
    ↓ selección/compaction
contexto del siguiente turno
```

Una trayectoria puede fallar aunque el workspace esté perfectamente aislado si el contexto es incorrecto.

Ejemplos:

- El agente busca `create_user`, modifica tres referencias y no observa una cuarta generada dinámicamente.
- Un compaction resume “tests verdes” pero omite que sólo se ejecutó una suite focalizada.
- El workspace cambió de base tras un rebase y el modelo sigue razonando con una versión previa del contrato.
- Una instrucción relevante vive en un directorio que la estrategia de retrieval nunca inspeccionó.

El aislamiento no sustituye a la **coherencia de observación**. El harness debe hacer que una acción cambie la realidad que observarán las siguientes tools y, cuando cambia una revisión o se recupera una sesión, invalidar contexto que ya no representa el workspace.

## El sandbox es una frontera de capacidades, no una carpeta especial

Un sandbox útil se describe por capacidades concretas, no por el nombre de la tecnología.

Como mínimo, pregunta:

### Filesystem

- ¿Qué roots son read-only?
- ¿Qué paths son writable?
- ¿Puede leer `$HOME`, SSH keys o configuración fuera del repo?
- ¿Los symlinks o mounts permiten cruzar la frontera esperada?

### Red

- ¿Está bloqueada por defecto?
- ¿Hay allowlist por dominio o destino?
- ¿Puede alcanzar localhost o servicios internos?
- ¿Qué ocurre con DNS, proxies y redirects?

### Procesos y recursos

- ¿Los subprocesses heredan la misma política?
- ¿Puede dejar daemons vivos después de terminar la tarea?
- ¿Hay límites de CPU, memoria, disco y tiempo?
- ¿Comparte `/tmp`, sockets, Docker daemon o runtime de contenedores con otras tareas?

### Identidad y credenciales

- ¿Qué token Git puede usar y contra qué ref?
- ¿Hay secretos dentro del entorno o se median fuera de él?
- ¿Una tool externa recibe credenciales con scope mayor que el de la tarea?

OpenAI describe en su despliegue interno de Codex writable roots, modos `read-only`/`workspace-write`, política de red y credenciales como controles separados.[^openai-safety] Anthropic señala además que proteger sólo filesystem o sólo red deja rutas de riesgo abiertas; su sandbox aplica ambos límites también a subprocesses lanzados desde la tool.[^anthropic-sandbox]

La conclusión no es que todos los sistemas deban copiar una implementación concreta. Es que **“corre en un sandbox” no es evidencia suficiente sin conocer la policy efectiva**.

## Un contenedor tampoco convierte automáticamente el entorno en seguro

Docker, Podman o una VM pueden ser mecanismos excelentes para construir aislamiento reproducible, pero la seguridad depende de cómo se configuren.

Un contenedor con:

```text
- repo montado read-write
- $HOME montado read-write
- Docker socket montado
- red abierta
- cloud credentials inyectadas
```

no tiene la misma frontera que otro que sólo recibe un workspace temporal, una red allowlisted y credenciales mediadas.

Gemini CLI ilustra bien esta diferencia: su documentación expone tanto perfiles Seatbelt con distintas reglas de red como modos Docker/Podman y permite flags adicionales del sandbox.[^gemini-sandbox] El nombre del runtime no sustituye al contrato de mounts, identidad y networking.

Por eso en un diseño de producción deberías versionar o auditar la **sandbox policy**, no sólo guardar `runtime=docker`.

## Paralelizar agentes introduce tres clases de colisión

Poner un worktree por agente resuelve sólo una de ellas.

### 1. Colisión de filesystem/Git

Dos agentes modifican los mismos archivos o el mismo índice en el mismo directorio.

**Mitigación típica:** workspace o worktree por tarea.

### 2. Colisión de recursos de ejecución

Los worktrees son distintos, pero ambos tests escriben en:

```text
/tmp/app.sock
localhost:5432/test
redis://localhost/0
~/.cache/project
```

Ahora una suite puede romper o validar falsamente a la otra.

**Mitigación típica:** namespace por tarea para puertos, DB/schema, queues, temp dirs, browser profiles y caches; o entorno de ejecución separado cuando el coste lo justifique.

### 3. Colisión semántica de integración

Dos agentes parten del mismo base SHA y producen cambios individualmente correctos pero incompatibles entre sí.

Un worktree no puede resolver eso. Sólo evita que se pisen mientras trabajan.

**Mitigación típica:** rebase/merge contra el target actual, resolución explícita de conflictos y reejecución de verificadores sobre el resultado integrado.

Esta tercera categoría importa porque un “merge limpio” tampoco demuestra compatibilidad semántica. Git puede combinar dos diffs sin conflicto textual y aun así producir un comportamiento incorrecto.

## Caso concreto: dos agentes, un mismo repositorio

Supón que arrancamos dos tareas desde `base_sha=A`:

```text
Agente 1: cambia el parser de configuración
Agente 2: refactoriza los tests de configuración
```

Una topología razonable podría ser:

```text
repo común / object store
   ├── worktree T1 -> branch agent/parser
   │      └── sandbox T1 -> DB test_t1, /tmp/t1, red allowlisted
   └── worktree T2 -> branch agent/tests
          └── sandbox T2 -> DB test_t2, /tmp/t2, red allowlisted
```

Esto separa archivos, índice y recursos de ejecución.

Aun así, antes de integrar T2 después de T1 hay que volver a comprobar:

```text
1. target actual
2. merge-base/base SHA
3. diff efectivo tras rebase/merge
4. tests relevantes sobre el estado combinado
5. archivos inesperados/untracked
6. invariantes de scope y policy
```

La separación mejora la causalidad: si T1 falla, es más fácil atribuir qué workspace y qué entorno produjeron el fallo. No elimina la necesidad de revalidar la composición.

## Qué hacen hoy algunos harnesses: no mezcles fronteras de producto

Los productos actuales combinan estas primitives de forma distinta.

### Codex

OpenAI describe la app de Codex con soporte integrado de worktrees para que varios agentes trabajen en paralelo sobre copias separadas del código.[^openai-worktrees] En documentación separada, OpenAI describe el sandbox como la frontera que restringe escrituras y red y la approval policy como otra capa.[^openai-safety]

Por tanto, no deberíamos resumir “Codex usa worktrees, luego está sandboxed”. **Worktree y sandbox son mecanismos distintos incluso dentro del mismo producto.**

### Claude Code

Anthropic presenta el sandbox de Claude Code explícitamente como aislamiento de filesystem y red apoyado en primitives del sistema operativo, con límites que se aplican también a procesos hijos.[^anthropic-sandbox]

Eso responde a la frontera de ejecución. No convierte una branch o un diff en semánticamente independiente de otra trayectoria.

### GitHub Copilot cloud agent

GitHub combina un development environment efímero con un modelo de publicación restringido: el agente sólo puede push a una rama concreta, sus credenciales están limitadas y el draft PR requiere revisión humana; además, el comportamiento de Actions y firewall tiene controles propios.[^github-risks][^github-environment]

Aquí también **execution environment**, **branch capability** y **merge policy** son capas separadas.

### Gemini CLI

Gemini CLI permite activar sandboxing mediante Seatbelt en macOS o Docker/Podman, con perfiles que pueden variar escritura y red.[^gemini-sandbox]

Eso demuestra por qué no conviene escribir “Gemini CLI está aislado” sin especificar el modo efectivo: la propia documentación expone varias políticas.

## Dirty state: el agente debe saber de quién es cada cambio

Trabajar sobre el workspace de un humano introduce un problema que no existe en una copia limpia: ya puede haber cambios antes de empezar.

Un harness fail-closed debería distinguir:

```text
preexisting_changes
agent_changes
external_changes_during_run
```

Si no puede hacerlo, una operación de “revert” o “cleanup” puede destruir trabajo ajeno.

Una estrategia robusta es capturar al inicio:

- `base_sha` y `HEAD`;
- salida machine-readable de estado Git;
- inventario de untracked relevante;
- submódulos/LFS si forman parte del proyecto;
- instrucciones y configuración que controlan el build;
- identidad del workspace/worktree;
- policy efectiva del sandbox.

`git status --porcelain` ayuda a obtener estado parseable, pero ni siquiera eso convierte ignored files o recursos externos en parte de Git.[^git-status]

Por tanto, **“working tree clean” es una propiedad Git concreta, no una prueba de entorno reproducible**.

## Recuperar una sesión exige reconciliar realidad, no sólo conversación

Persistir el transcript de un agente no basta para reanudar una tarea.

Antes de continuar después de crash, compaction o handoff, el harness debería comparar el estado esperado con el observado:

```text
expected.base_sha == observed.merge_base ?
expected.head_sha == observed.HEAD ?
expected.workspace_id == observed.workspace ?
expected.policy_id == observed.policy ?
expected.required_artifacts still exist ?
unexpected processes/resources still running ?
```

Si una de esas invariantes cambió, la operación correcta puede ser re-leer, rebasear, re-ejecutar tests o bloquear el resume. Fingir continuidad porque existe un historial de mensajes crea una trayectoria cuya causalidad ya no conocemos.

## Qué aislamiento elegir

No existe una primitive universal. Empieza por el fallo que quieres impedir.

| Necesidad | Primitive mínima razonable | Qué añadir cuando aumenta el riesgo |
|---|---|---|
| Un agente local, repo limpio, tarea corta | workspace actual + status/base SHA explícitos | sandbox de escritura/red si ejecuta código no confiable |
| Dos tareas en paralelo sobre el mismo repo | worktree/working copy por tarea + branch/ref propia | namespaces separados para tests y servicios |
| Ejecutar dependencias o código potencialmente hostil | sandbox de filesystem + red | contenedor/VM, identidad mínima y egress estricto según threat model |
| Agentes cloud que entregan cambios | workspace efímero + ref limitada | credenciales mediadas, firewall, required checks y review gate |
| Reanudar tareas largas | workspace durable o checkpoint reproducible | reconciliación de SHA, dirty state, policy y recursos externos |

La decisión es composicional: una tarea puede necesitar **worktree + sandbox + namespace de servicios + branch protegida** al mismo tiempo.

## Contrato mínimo para un harness de producción

Para que el aislamiento sea observable y recuperable, registra identidad y policy como datos de primera clase:

```text
task_id
repository_id
base_sha
integration_target
workspace_id / worktree_path
branch_or_detached_head
preexisting_dirty_state
sandbox_policy_id
network_policy_id
credential_scope
service_namespace
current_head_sha
verification_head_sha
cleanup_state
```

Dos campos son especialmente fáciles de olvidar:

- **`verification_head_sha`**: sobre qué código exacto pasaron los tests/gates.
- **`cleanup_state`**: si procesos, worktrees, contenedores, temp resources y credenciales efímeras fueron realmente retirados.

Sin el primero puedes atribuir un PASS a otro código. Sin el segundo puedes terminar una tarea dejando efectos vivos fuera del diff.

## Implicación para producción

El objetivo de aislar un coding agent no es “meterlo en Docker”. Es conseguir tres propiedades verificables:

1. **Causalidad:** sabemos qué estado inicial produjo cada cambio y cada resultado de test.
2. **Confinamiento:** sabemos qué efectos podía producir la ejecución y qué recursos podía alcanzar.
3. **Integración:** sabemos qué diff/ref se entrega y contra qué target fue revalidado.

Un worktree mejora causalidad y concurrencia. Un sandbox mejora confinamiento. Una branch/PR mejora integración. Ninguna sustituye a las otras.

## Qué deberías recordar

- Branch, worktree, workspace, sandbox y contenedor son objetos diferentes.
- Una branch referencia commits; no contiene por sí sola dirty state, untracked files ni procesos.
- Un linked worktree separa working tree, `HEAD` e índice, pero comparte gran parte del repositorio Git y no es una security boundary.
- El contexto del modelo puede divergir del workspace real; aislamiento físico no corrige una observación stale o incompleta.
- Un sandbox debe describirse por capacidades efectivas de filesystem, red, procesos e identidad, no sólo por su tecnología.
- Dos worktrees pueden seguir interfiriendo mediante DBs, puertos, caches, temp dirs o servicios compartidos.
- Cambios paralelos pueden ser semánticamente incompatibles aunque no exista merge conflict textual.
- Recuperar una tarea exige reconciliar SHA, workspace, dirty state, policy y efectos externos; un transcript no basta.
- El PASS de un test debe quedar ligado al SHA exacto que verificó.

## Referencias

[^git-worktree]: Git, [git-worktree Documentation](https://git-scm.com/docs/git-worktree). Documenta múltiples working trees, linked worktrees y qué estado Git se comparte o mantiene por worktree.
[^git-glossary]: Git, [gitglossary](https://git-scm.com/docs/gitglossary). Define working tree/worktree y enumera metadatos per-worktree como `HEAD`, índice y pseudorefs frente a metadatos compartidos.
[^git-status]: Git, [git-status Documentation](https://git-scm.com/docs/git-status). Documenta estado del índice/working tree, untracked, ignored y submódulos; ignored files sólo aparecen cuando se solicitan.
[^openai-worktrees]: OpenAI, [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/), 2 de febrero de 2026, actualizado el 4 de marzo de 2026. Describe soporte integrado de worktrees para que múltiples agentes trabajen en paralelo sobre copias separadas del código y mantiene esa primitive separada de las restricciones de sandbox.
[^openai-safety]: OpenAI, [Running Codex safely at OpenAI](https://openai.com/index/running-codex-safely/), 8 de mayo de 2026. Separa sandboxing, approvals, writable roots, network policy, identidad/credenciales y telemetría como superficies distintas de control.
[^anthropic-sandbox]: Anthropic, [Beyond permission prompts: making Claude Code more secure and autonomous](https://www.anthropic.com/engineering/claude-code-sandboxing), 20 de octubre de 2025. Describe filesystem y network isolation, su aplicación a subprocesses y el uso de primitives del sistema operativo.
[^github-risks]: GitHub, [Risks and mitigations for GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations). Documenta branch limitada, credenciales restringidas, draft PR con revisión humana y tratamiento específico de Actions.
[^github-environment]: GitHub, [Configure the development environment](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment). Documenta entorno efímero/configurable, runners, secrets y firewall como configuración separada del flujo de integración.
[^gemini-sandbox]: Gemini CLI, [Sandboxing in the Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/cli/sandbox.html). Documenta Seatbelt y Docker/Podman, perfiles con distintas políticas de escritura/red y la advertencia de que sandboxing reduce, pero no elimina, todos los riesgos.