---
title: "Qué es un agent harness: el runtime que convierte un modelo en un agente de código"
description: "Un modelo puede proponer código y tool calls. Un agent harness mantiene el bucle, controla el workspace, ejecuta herramientas, aplica permisos, verifica resultados y decide cuándo continuar o devolver el control."
date: 2026-09-10
date_modified: 2026-09-10
keywords: "agent harness, coding agents, coding assistant, agent loop, sandbox, repository agents"
tags:
  - IA
  - Agentes
  - Software
  - Coding agents
  - Arquitectura
---

# Capítulo 1 — Qué es un agent harness y qué añade sobre un modelo o coding assistant

Un modelo capaz de programar puede explicar una función, proponer un diff o pedir que se ejecute una tool. Eso todavía no define **quién abre el repositorio, qué archivos puede tocar, quién ejecuta el comando, cómo vuelve el resultado al modelo, qué ocurre si el test falla y cuándo termina la tarea**.

Ese trabajo pertenece a otra capa: el **agent harness**.

En esta serie mantendremos el término inglés porque ya se usa así en la documentación técnica. No significa simplemente “un prompt grande” ni “un wrapper alrededor de la API”. Un harness es el **runtime y la lógica de control que convierten una secuencia de inferencias del modelo en un proceso que observa un workspace, actúa sobre él, recibe feedback y vuelve a decidir**.

OpenAI describe el Codex harness precisamente como el *agent loop and logic* que sustenta sus distintas superficies, y separa dentro de ese runtime el lifecycle de threads, la configuración/autenticación y la ejecución de shell/file tools dentro de un sandbox.[^openai-codex-harness] Anthropic usa una frontera similar en Managed Agents: distingue **session**, **harness** —el bucle que llama al modelo y enruta sus tool calls— y **sandbox**, el entorno donde el agente ejecuta código y modifica archivos.[^anthropic-managed-agents]

La distinción importa porque dos sistemas pueden usar el mismo modelo y comportarse de forma muy diferente si cambian el contexto que reciben, las tools disponibles, la política de permisos, el entorno de ejecución o los verificadores.

{{ include_html("snippets/articulos-tecnicos/coding-agent-harness-loop.html") }}

## El modelo no posee el repositorio

Conviene separar tres objetos que las interfaces comerciales suelen presentar juntos.

### 1. Modelo

El modelo es el componente de inferencia. Recibe una representación del contexto disponible y produce una salida: texto, código estructurado, una tool call o una combinación de esas formas según el API y el modelo concretos.

El modelo puede **decidir que sería útil ejecutar `pytest`**. Eso no significa que el modelo haya ejecutado `pytest`.

Para que el comando produzca una observación real hacen falta, como mínimo:

```text
modelo propone: run("pytest tests/api")
        ↓
política decide si la acción está permitida
        ↓
runtime ejecuta el proceso en un entorno concreto
        ↓
stdout / stderr / exit code vuelven al loop
        ↓
el siguiente turno del modelo ve esa observación
```

La diferencia entre *proponer una acción* y *realizar una acción* es una frontera de sistema, no una cuestión semántica.

### 2. Coding assistant

*Coding assistant* describe sobre todo una **experiencia de ayuda al desarrollador**, no un estándar arquitectónico. Puede ser autocompletado, chat sobre el repositorio, edición guiada o una interfaz que también lance tareas agentic.

Por eso no conviene construir una taxonomía rígida de “assistant = no tools” y “agent = tools”. Los productos actuales mezclan superficies. OpenAI, por ejemplo, señala que el mismo Codex harness puede exponerse en web, CLI, IDE y app, y que también puede integrarse para construir un code reviewer, un SRE agent o un coding assistant.[^openai-codex-harness]

La pregunta útil no es qué etiqueta aparece en el producto, sino **cuánto control de la trayectoria ha delegado el usuario**.

### 3. Coding agent + harness

Un coding agent puede recibir un objetivo que requiere múltiples pasos y mantener un ciclo de observación → decisión → acción → observación hasta llegar a una condición de parada.

El harness es la capa que hace ese ciclo operativo. Dependiendo del producto, puede poseer o coordinar:

- La sesión y su estado persistente.
- La selección y compactación de contexto del repositorio.
- Lecturas, ediciones, shell, git, browser y MCP/tools externas.
- El workspace, worktree, contenedor o VM donde ocurre el trabajo.
- Permisos, approvals, secretos y restricciones de red.
- La captura de stdout, stderr, diffs, resultados de tests y otros eventos.
- Reintentos, checkpoints, recuperación y handoff entre sesiones.
- Verificadores, stop conditions y entrega del resultado para revisión.

No todos los harnesses implementan todo eso de la misma forma. La lista define **responsabilidades posibles**, no una garantía universal.

## El mecanismo: un bucle con estado y efectos reales

El patrón mínimo puede escribirse así:

```text
1. cargar contrato de tarea + estado actual
2. seleccionar contexto relevante del repositorio
3. llamar al modelo
4. interpretar respuesta / tool call
5. aplicar política y approvals
6. ejecutar la acción en el workspace
7. capturar la observación real
8. actualizar estado y contexto
9. verificar progreso / invariantes / stop condition
10. continuar, recuperar, pedir ayuda o terminar
```

El punto importante es que **cada iteración modifica el mundo que observará la siguiente**. Si el agente edita `router.py`, el siguiente `grep`, test o diff debe ejecutarse contra ese nuevo estado. Si una command falla, el error se vuelve contexto. Si se hace checkout de otra rama, cambia la realidad sobre la que operan las siguientes decisiones.

OpenAI expone esta propiedad en Codex Core: el core es a la vez librería y runtime del agent loop y mantiene la persistencia de un thread; el App Server aloja esos threads como proceso de larga duración y puede pausar un turno para pedir una aprobación al cliente.[^openai-codex-harness]

El harness, por tanto, no es sólo un dispatcher de tools. También establece **continuidad causal** entre acciones.

## Cinco fronteras que el harness añade al modelo

### Contexto: qué realidad llega al siguiente turno

Un repositorio real no cabe necesariamente entero en el contexto del modelo, y aunque cupiera no siempre sería útil enviarlo completo. El harness necesita decidir o ayudar a decidir qué observar: árbol de archivos, instrucciones del repo, símbolos, diffs, resultados de búsqueda, logs, historial de tarea o artefactos de una sesión anterior.

Esta capa puede ser explícita —por ejemplo, herramientas de búsqueda y lectura que el modelo invoca— o incluir lógica automática de persistencia/compactación. OpenAI documenta que el Codex harness mantiene lifecycle y persistencia de threads para que distintas superficies puedan reconectar y representar una timeline consistente.[^openai-codex-harness]

La consecuencia es directa: **una respuesta mala puede ser un fallo del modelo, pero también un fallo de contexto del harness**. Si el agente modifica una API sin haber observado los consumidores relevantes, cambiar de modelo puede no resolver el problema.

### Acción: cómo una intención se convierte en un efecto

Leer un archivo, ejecutar un compilador o hacer `git diff` requiere capacidades del sistema operativo y del entorno. El harness enruta la tool call hacia una implementación concreta y devuelve el resultado.

GitHub Copilot cloud agent, por ejemplo, trabaja en un entorno efímero propio donde puede explorar código, modificarlo y ejecutar tests y linters.[^github-agent-environment] Gemini CLI expone herramientas de lectura/escritura y shell y aplica confirmación a las herramientas mutadoras, con posibilidad de ejecutar tools dentro de sandbox.[^gemini-tools]

Estos ejemplos no demuestran que todos los coding agents deban usar contenedores ni el mismo permission model. Demuestran la frontera: **el modelo no posee por sí mismo un filesystem, un proceso shell ni credenciales git**.

### Política: qué está permitido hacer

Cuanta más autonomía recibe el loop, más importante es separar capacidad de autorización.

Una tool puede técnicamente ejecutar `rm`, abrir una conexión o hacer `git push`; el harness debe decidir si esa acción es posible dentro de su policy. Anthropic documenta para Claude Code dos límites de sandbox especialmente relevantes: filesystem y network isolation. El objetivo es que la ejecución pueda ser más autónoma dentro de una frontera dura en lugar de convertir cada acción en una pregunta de permiso.[^anthropic-sandbox]

GitHub hace la misma separación a nivel de entorno: el cloud agent usa un entorno efímero, permite configurar firewall, secrets y runners, y recomienda controles de red cuando se usan runners propios.[^github-agent-environment]

Un approval tampoco convierte una acción en segura. Es sólo una decisión dentro de una frontera de confianza. Los capítulos 2.2 y 2.4 tratarán sandboxing, worktrees, permisos, hooks, secretos y trust boundaries en detalle.

### Feedback: qué aprende el loop de sus propios efectos

Un coding agent es útil porque puede cerrar el ciclo con evidencia del workspace:

```text
edición
→ formatter
→ type checker
→ tests
→ ejecución real
→ diff
→ nueva decisión
```

Sin esta realimentación, el sistema se parece más a generación de código por turnos que a ejecución autónoma sobre un repositorio.

Pero **tener herramientas de test no significa que el resultado sea correcto**. GitHub indica que el cloud agent puede ejecutar tests y linters en su entorno, pero el resultado sigue terminando en una rama/PR que debe revisarse; incluso documenta que los workflows de Actions no se ejecutan automáticamente por defecto ante ciertos pushes del agente.[^github-agent-environment][^github-agent-review]

La garantía viene del contrato del verificador y de qué parte del comportamiento cubre, no de que exista un comando llamado `test`.

### Control: cuándo continuar, parar o devolver el problema

El modelo puede emitir una respuesta que suene final aunque la tarea no esté completa. El harness necesita una definición externa de progreso y salida.

Puede ser tan simple como “termina cuando el comando solicitado devuelve 0” o tan estructurado como:

```text
DONE si:
- tests requeridos = PASS
- diff dentro del scope permitido
- no quedan archivos inesperados
- verificador funcional = PASS
- resumen de cambios generado

HAND_BACK si:
- falta un requisito que no puede inferirse
- se necesita un permiso no concedido
- el estado del repositorio no puede reconciliarse con seguridad
```

Anthropic ha mostrado en experimentos de coding agents de larga duración que la estructura del harness —descomposición, artefactos de handoff y un evaluador separado— puede cambiar el resultado incluso manteniendo la familia de modelo; también advierte de que esas piezas pueden dejar de aportar valor cuando el modelo mejora y deben volver a evaluarse.[^anthropic-harness-design]

Ese detalle evita otro error frecuente: **más scaffolding no es automáticamente mejor**.

## Un ejemplo concreto: renombrar una API y actualizar sus consumidores

Supongamos esta tarea:

```text
Renombra `create_user()` a `create_account()`,
actualiza todos los consumidores y demuestra que no rompiste la API pública.
```

Un modelo aislado puede producir un parche plausible con los archivos que le mostremos. Un assistant interactivo puede ayudarnos a aplicar esos cambios mientras nosotros elegimos búsquedas, comandos y archivos.

Un harness agentic puede ejecutar una trayectoria como esta:

```text
1. inspeccionar instrucciones del repositorio
2. localizar definición y referencias
3. leer tests y API pública relevante
4. editar definición + consumidores
5. ejecutar formatter/type checker/tests focalizados
6. inspeccionar fallos
7. corregir una referencia dinámica que la primera búsqueda no encontró
8. ejecutar suite requerida
9. revisar diff y archivos modificados
10. entregar commit/branch/PR o pedir revisión
```

Lo que añade el harness no es “más inteligencia” en abstracto. Añade **capacidad de cerrar el loop contra un estado mutable y verificable**.

Y tampoco garantiza que el paso 7 ocurra. Puede detenerse demasiado pronto, buscar mal, interpretar un test incompleto como prueba suficiente o introducir un cambio fuera de scope. Esas son propiedades que deben evaluarse sobre el sistema completo.

## El mismo modelo puede vivir en harnesses distintos

Una forma útil de comprobar que modelo y harness son capas separables es observar productos que permiten cambiar uno sin reemplazar el otro.

GitHub permite seleccionar por separado el agente/custom agent y el modelo que usará una sesión de Copilot cloud agent.[^github-use-agent] Gemini CLI también expone selección de modelo como una configuración del CLI, separada de las tools, sandbox y política de ejecución.[^gemini-model]

Eso no implica que cualquier modelo sea intercambiable sin consecuencias. Tool schemas, prompting, context windows, capacidades de reasoning, APIs y convenciones del runtime pueden crear acoplamiento. La conclusión más estrecha es suficiente: **el modelo es una dependencia del harness, no el harness completo**.

La inversa también es importante. El mismo modelo puede rendir distinto cuando cambia el harness. Anthropic documenta explícitamente que sus decisiones de harness para tareas largas cambiaron al pasar de modelos que necesitaban resets/decomposición a modelos posteriores capaces de sostener trayectorias más largas.[^anthropic-harness-design]

Por eso una arquitectura de agents envejece en dos direcciones: cambia el runtime y cambia el modelo que vive dentro.

## Qué NO deberías atribuir al harness

Un harness puede crear las condiciones para trabajar bien; no convierte en verdad lo que el modelo infiere.

No atribuyas automáticamente al harness:

- **Comprensión completa del repositorio.** Sólo conoce lo que el loop ha observado o recuperado.
- **Corrección del código.** Un test incompleto puede pasar con un bug real.
- **Seguridad.** Una política permisiva o una mala frontera de secretos sigue siendo peligrosa.
- **Autonomía ilimitada.** Hay límites de tiempo, contexto, permisos, entorno y budget.
- **Recuperación correcta.** Persistir una conversación no equivale a reconciliar filesystem, procesos, branch y efectos externos.
- **Calidad superior por usar más agentes.** Planner, reviewer y subagents añaden coste y nuevos failure modes; sólo merecen existir si mejoran una métrica relevante bajo un harness comparable.

La distinción también protege contra marketing. “Agentic”, “autonomous” o “multi-agent” no describen por sí solas la frontera de control que nos interesa.

## Assistant o agente: decide por delegación, no por la etiqueta

Para un desarrollador, la diferencia práctica puede representarse por cuánto del ciclo conserva manualmente:

| Responsabilidad | Assistant muy dirigido por el usuario | Coding agent con harness |
|---|---|---|
| Elegir el siguiente archivo/comando | Principalmente el usuario | Puede delegarse al loop |
| Aplicar cambios | Usuario o edición confirmada | Tool ejecutada bajo policy |
| Ejecutar tests y leer resultados | Usuario inicia o supervisa | Loop puede ejecutar y consumir feedback |
| Mantener estado de una tarea larga | Conversación/UI | Runtime + workspace + artefactos de estado |
| Decidir si continuar | Usuario | Stop/verifier policy + modelo |
| Integrar resultado | Usuario | Puede preparar branch/commit/PR bajo límites |

No hay una frontera binaria universal. Un IDE assistant puede incorporar un modo agentic; un coding agent puede pedir aprobación en casi todos los pasos. La tabla describe **delegación operativa**, no una clasificación de marcas.

## Qué cambia al diseñar un sistema de producción

Si construyes o eliges un coding agent, evaluar sólo el modelo es insuficiente. Necesitas conocer también el contrato del harness:

1. **¿Qué observa?** Cómo encuentra instrucciones, símbolos, dependencias y estado del workspace.
2. **¿Qué puede modificar?** Paths, repos, branch/worktree, servicios y red.
3. **¿Qué ejecuta?** Shell, build, browser, MCP, APIs y procesos de larga duración.
4. **¿Dónde vive el estado?** Contexto del modelo, thread persistente, filesystem, base externa.
5. **¿Qué verifica?** Tests exactos, linters, type checks, behavior, diff y policies.
6. **¿Cómo recupera?** Tras timeout, crash, compaction, reconnect o cambio de sesión.
7. **¿Cuándo termina?** Success contract, budget, stop condition o handback.
8. **¿Qué evidencia deja?** Commits, logs, trajectory, tool events, test outputs y reviewable diff.

Los capítulos siguientes desarrollarán esas fronteras una a una. Este capítulo sólo necesita fijar el modelo mental: **el modelo propone acciones; el harness hace que esas acciones formen una trayectoria controlada sobre un entorno real**.

## Qué deberías recordar

- Un modelo de código no es un coding agent completo: no posee por sí solo workspace, shell, permisos, state ni stop conditions.
- *Agent harness* es el runtime/orquestación que mantiene el loop, conecta contexto y tools, aplica policy, conserva estado y devuelve observaciones al modelo.
- Un coding assistant y un coding agent no forman dos categorías limpias de producto; la diferencia útil es cuánto control de la trayectoria se delega.
- Sandbox y permisos pertenecen a la capa de ejecución/control, no a la inteligencia del modelo.
- Tests y linters son evidencia que consume el loop; no garantizan corrección si el verificador es insuficiente.
- El mismo modelo puede comportarse de forma distinta con otro harness, y un harness debe simplificarse o cambiar cuando mejora el modelo.
- La unidad de evaluación útil es la trayectoria sobre un repositorio y su resultado verificable, no sólo la respuesta del modelo.

## Referencias

[^openai-codex-harness]: OpenAI, [Unlocking the Codex harness: how we built the App Server](https://openai.com/index/unlocking-the-codex-harness/), 4 de febrero de 2026. Define el Codex harness como el agent loop y la lógica compartida por sus superficies; documenta thread lifecycle/persistence, configuración/autenticación, ejecución de shell/file tools bajo sandbox/policy y App Server como proceso de larga duración que aloja Codex Core threads.
[^anthropic-managed-agents]: Anthropic, [Scaling Managed Agents: Decoupling the brain from the hands](https://www.anthropic.com/engineering/managed-agents), 8 de abril de 2026. Separa explícitamente session, harness —loop que llama a Claude y enruta tool calls— y sandbox como interfaces distintas.
[^github-agent-environment]: GitHub, [Configure the development environment](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment). Documenta el entorno efímero del Copilot cloud agent, ejecución de tests/linters, setup steps, runners, secrets y firewall.
[^github-agent-review]: GitHub, [Troubleshooting GitHub Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/troubleshoot-cloud-agent). Documenta que el agente puede validar con tests/linters dentro de su entorno y que los GitHub Actions workflows no se ejecutan automáticamente ante ciertos pushes del agente hasta aprobación.
[^github-use-agent]: GitHub, [Using Copilot cloud agent on GitHub](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github). La creación de una sesión permite seleccionar repo/base branch, agente o custom agent y, por separado, el modelo y nivel de reasoning disponibles.
[^anthropic-sandbox]: Anthropic, [Beyond permission prompts: making Claude Code more secure and autonomous](https://www.anthropic.com/engineering/claude-code-sandboxing), 20 de octubre de 2025. Describe filesystem/network isolation, permission model y sandboxed shell como fronteras de ejecución de Claude Code.
[^anthropic-harness-design]: Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps), 24 de marzo de 2026. Muestra cómo decomposition, handoff artifacts y evaluator loops cambian el rendimiento de tareas largas, y por qué componentes del harness pueden dejar de ser load-bearing cuando mejora el modelo.
[^gemini-tools]: Gemini CLI, [Tools reference](https://geminicli.com/docs/reference/tools/). Documenta tool execution, confirmación para mutaciones y sandboxing de tools.
[^gemini-model]: Gemini CLI, [Model selection](https://geminicli.com/docs/cli/model/). Documenta selección del modelo como configuración del CLI, separada del resto del runtime.
