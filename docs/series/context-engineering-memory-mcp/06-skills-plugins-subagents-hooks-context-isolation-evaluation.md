---
title: "Skills, plugins, subagentes y hooks: aislamiento de contexto, autoridad y evaluación"
description: "Cómo distinguir empaquetado, carga de contexto, delegación, hooks y aislamiento en sistemas de agentes; qué autoridad hereda cada primitive y cómo evaluarla sin confundir extensión con seguridad."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "agent skills, plugins, subagents, hooks, context isolation, delegation, permissions, evaluation, agent harness"
tags:
  - IA
  - Agentes
  - Context engineering
  - Seguridad
  - Evaluación
---

# Capítulo 6 — Skills, plugins, subagentes y hooks: aislamiento de contexto, autoridad y evaluación

Un sistema de agentes puede incorporar una skill, instalar un plugin, delegar a un subagente y ejecutar hooks durante el ciclo de vida. Es fácil agrupar todo bajo «extensiones del agente». Operacionalmente son cosas distintas.

La separación que importa es ésta:

> **Empaquetar una capacidad, cargar información en contexto, ejecutar trabajo en otro agente y conceder autoridad son decisiones diferentes.**

Una skill puede añadir instrucciones sin crear un proceso aislado. Un plugin puede empaquetar una skill, un agente, hooks o integraciones. Un subagente puede tener otro contexto del modelo y aun así heredar herramientas o estado local. Un hook puede ser determinista y, precisamente por ejecutar código fuera de la decisión del modelo, ampliar la superficie de confianza.

{{ include_html("snippets/articulos-tecnicos/context-extension-isolation-lifecycle.html") }}

## 1. Cuatro primitives, cuatro preguntas distintas

No existe una semántica universal de `skill`, `plugin`, `subagent` o `hook` entre productos. Conviene empezar por la función que cumplen en una implementación concreta.

| Primitive | Pregunta principal | Lo que no demuestra por sí sola |
|---|---|---|
| **Skill** | ¿qué conocimiento, instrucciones o procedimiento reutilizable puede cargar el agente? | aislamiento, permiso para actuar, identidad de ejecución |
| **Plugin** | ¿cómo se empaqueta y distribuye un conjunto de capacidades? | sandbox, menor privilegio, contexto separado |
| **Subagente** | ¿qué trabajo se delega a otra ejecución de agente y qué vuelve al padre? | filesystem aislado, toolset reducido, memoria independiente |
| **Hook** | ¿qué lógica se ejecuta al ocurrir un evento del lifecycle? | seguridad automática, idempotencia, ausencia de efectos laterales |

El error recurrente es convertir una etiqueta de producto en una propiedad arquitectónica. La pregunta correcta es siempre: **¿qué contexto, capabilities, estado y autoridad existen en runtime?**

## 2. Una skill es una unidad de expertise reutilizable; no es una frontera de seguridad

Anthropic Agent Skills ofrece un ejemplo actual y bien especificado. Una skill es un directorio con `SKILL.md`, instrucciones y, opcionalmente, código y referencias. El mecanismo usa **progressive disclosure**: metadata de discovery puede estar disponible antes de cargar el contenido completo, y el resto se incorpora cuando la tarea lo necesita.[^anthropic-skills]

Eso resuelve un problema de contexto:

```text
catálogo de skills
      ↓ metadata pequeña
matching con la tarea
      ↓ activación
instrucciones + referencias necesarias
      ↓
contexto efectivo del agente
```

No resuelve automáticamente un problema de autoridad.

La misma familia de Skills de Anthropic tiene runtimes distintos según la superficie. En la Claude API las Skills se ejecutan dentro del entorno de code execution y la documentación actual indica que ese entorno no tiene acceso de red ni instalación de paquetes en runtime. En Claude Code, una skill filesystem-based puede ejecutar dentro del entorno local y dispone del mismo acceso de red que otros programas del equipo, sujeto a los controles de Claude Code.[^anthropic-skills]

Por tanto:

```text
skill identity ≠ execution boundary
skill loaded ≠ action authorized
```

El nombre de la primitive es el mismo; el dominio de ejecución no lo es.

## 3. Progressive disclosure reduce contexto inicial, pero no elimina el coste de activación

Una skill necesita ser descubrible antes de ser utilizada. Eso introduce dos costes diferentes:

```text
C_discovery = metadata visible para decidir si activar
C_active    = instrucciones + referencias realmente cargadas
```

El diseño intenta mantener `C_discovery << C_active`, pero una biblioteca grande sigue necesitando una política de discovery suficientemente precisa.

Dos fallos son especialmente importantes:

1. **under-triggering**: la skill correcta existe pero no se activa;
2. **over-triggering**: una skill irrelevante se activa y consume contexto o introduce instrucciones innecesarias.

Por eso una evaluación de skills no puede limitarse a «la skill produce buen output cuando la invoco manualmente». Debe medir también **selección y activación**.

## 4. Plugin es normalmente una frontera de empaquetado, no una primitive de ejecución única

`Plugin` es todavía más dependiente del producto.

En ChatGPT y Codex, la documentación actual de OpenAI describe un plugin como una capacidad empaquetada para un workflow. Puede contener **skills**, **apps** y **app templates**. Las apps siguen siendo las integraciones que conectan con datos y acciones externas, y sus permisos/autenticación se gestionan en esa capa; instalar el plugin no inventa permisos nuevos sobre el sistema externo.[^openai-plugins]

Claude Code usa la palabra plugin para otro paquete compuesto: su referencia actual permite distribuir **skills, agents, hooks, MCP servers, LSP servers y monitors** dentro de un plugin.[^claude-plugins]

Estas dos definiciones son compatibles con una conclusión general, no con una API general:

> **plugin describe distribución/composición; la autoridad real depende de los componentes incluidos y del runtime donde se habilitan.**

Nunca escribas una regla como `plugin = tool` o `plugin = sandbox`. Inspecciona el manifiesto y las capabilities reales.

## 5. Instalar una extensión no equivale a conceder todas sus dependencias

Una arquitectura segura separa al menos:

```text
INSTALL
¿puede existir este paquete en el workspace?

DISCOVER
¿qué componentes anuncia?

ENABLE
¿qué componentes quedan visibles en este run?

AUTHORIZE
¿qué puede hacer este principal sobre un recurso concreto?

APPROVE
¿acepta el usuario este efecto ahora?
```

En el modelo actual de plugins de OpenAI, una extensión puede depender de una app o app template que todavía requiera configuración, publicación, OAuth y asignación de acceso. Un usuario que no puede acceder a un recurso en el sistema conectado no debería obtener ese acceso a través del plugin.[^openai-plugins]

La frontera de distribución no sustituye la frontera de identidad.

## 6. Un subagente es delegación; el aislamiento debe comprobarse dimensión por dimensión

Los subagentes son útiles para reducir interferencia entre tareas, especializar instrucciones o ejecutar trabajo en paralelo. Pero «otro agente» no significa automáticamente «otro sandbox».

Claude Code lo hace explícito. Un subagente puede configurar modelo, tools, skills, memoria y `isolation`. Si `tools` se omite, el subagente **hereda todas las tools disponibles para la conversación principal**. El aislamiento del repositorio mediante worktree sólo aparece cuando se configura `isolation: worktree`.[^claude-subagents]

Eso produce una regla importante:

```text
new model context ≠ reduced tool authority
new agent identity ≠ isolated filesystem
```

Un subagente puede tener una ventana de contexto separada y seguir conservando una capacidad peligrosa heredada.

## 7. Handoff y agent-as-tool tampoco significan lo mismo

OpenAI Agents SDK distingue dos patrones de composición.[^openai-agents]

**Manager / agent as tool**:

```text
parent agent
  ↓ invokes specialist as a tool
specialist work
  ↓ structured result
parent keeps control
```

**Handoff**:

```text
current agent
  ↓ transfers conversation
specialist becomes active agent
```

La distinción afecta al contexto y a la política. En los handoffs actuales, el agente receptor recibe por defecto el historial completo de la conversación; `input_filter` permite reducir o transformar lo que se pasa.[^openai-handoffs]

Por tanto, crear un specialist no reduce por sí solo la exposición de datos. Hay que definir explícitamente el **delegation envelope**.

## 8. El delegation envelope debería ser un contrato, no un prompt libre

Una delegación reproducible puede representarse como:

```text
D = (
  goal,
  constraints,
  allowed_context,
  allowed_capabilities,
  workspace,
  budget,
  output_schema,
  provenance_requirements
)
```

El padre debería poder responder:

```text
¿qué información recibió el hijo?
¿qué tools podía ver?
¿qué filesystem/red/secrets podía alcanzar?
¿qué estado podía mutar?
¿qué resultado devolvió?
¿qué evidencia respalda ese resultado?
```

El resumen del subagente no es suficiente si el padre necesita verificar una decisión o continuar trabajo durable.

## 9. «Aislamiento de contexto» son al menos seis fronteras

Conviene descomponer la palabra `isolation`.

### 9.1 Contexto del modelo

Qué mensajes, instrucciones, tool results y documentos llegan al modelo del subagente.

### 9.2 Estado local de aplicación

Objetos en memoria que el runtime comparte fuera del modelo.

OpenAI Agents SDK, por ejemplo, documenta que el objeto local de `context` no se envía al LLM, pero dentro de un run los wrappers derivados comparten el mismo estado de aplicación subyacente; los runs anidados con `Agent.as_tool()` no reciben una copia aislada por defecto.[^openai-context]

### 9.3 Workspace/filesystem

Qué archivos puede leer o escribir el worker. Un worktree puede aislar cambios Git sin aislar necesariamente `$HOME`, credenciales o red.

### 9.4 Tools y credenciales

Qué operaciones existen en el tool catalog y qué principal/secretos usan al ejecutarse.

### 9.5 Red

Qué destinos puede alcanzar el proceso o sandbox.

### 9.6 Memoria persistente

Qué información puede leer/escribir entre sesiones y qué política de borrado/provenance aplica.

Una claim de «subagente aislado» debería especificar cuáles de estas seis fronteras están realmente separadas.

## 10. Hooks son control de lifecycle fuera de la elección normal del modelo

Los hooks permiten ejecutar lógica cuando ocurre un evento del runtime. Claude Code documenta hooks para, entre otras cosas, validar comandos, formatear código, enviar notificaciones o imponer reglas de proyecto.[^claude-hooks-guide]

Su valor principal es que una regla determinista no depende de que el modelo «recuerde» llamar a una tool:

```text
model proposes Write
       ↓
PreToolUse hook / permission policy
       ↓ allow | ask | deny
actual tool execution
       ↓
PostToolUse hook
```

Pero hay que distinguir hooks **blocking** y **async**. La referencia actual de Claude Code señala que un hook asíncrono continúa en background y no puede bloquear ni cambiar una acción que ya ocurrió.[^claude-hooks]

Así que:

```text
observability hook after action ≠ preventive control before action
```

## 11. Un hook puede ser una guardrail o una nueva superficie de ejecución

«Determinista» no significa «seguro».

Anthropic publicó en 2026 un análisis de vulnerabilidades donde configuración de proyecto podía provocar ejecución de hooks antes de que el usuario aceptara confiar en el directorio. La corrección fue mover el parseo/ejecución de configuración local después del trust prompt.[^anthropic-containment]

La lección es más general que Claude Code:

> **cargar configuración ejecutable de un workspace no confiable ya cruza una frontera de confianza.**

Un hook que ejecuta shell puede tener más autoridad efectiva que el modelo al que pretende vigilar. Evalúa su origen, firma/versionado, entorno, secretos, filesystem y red igual que harías con cualquier código.

## 12. Orden de policy: visibility, permission y hook no son intercambiables

En Claude Code, la documentación de permisos actual deja un orden explícito: hooks pueden bloquear o influir en la evaluación, las reglas `deny` conservan precedencia y una respuesta `allow` de un hook no salta reglas de permiso posteriores.[^claude-permissions]

En OpenAI Agents SDK, el mecanismo es diferente. Tool guardrails envuelven function tools antes/después de ejecución, mientras handoffs usan otra pipeline y no heredan automáticamente esos tool guardrails.[^openai-guardrails]

No generalices un orden de control entre frameworks. Documenta el pipeline exacto del runtime elegido.

## 13. Context filtering no es authorization

Reducir contexto y reducir capabilities son controles complementarios.

```text
input_filter
  ↓
menos información visible al specialist

capability/tool filter
  ↓
menos operaciones disponibles

authorization in tool/server
  ↓
menos efectos permitidos sobre recursos reales
```

En OpenAI Agents SDK, `input_filter` controla qué historial recibe un handoff. Los filtros de tools/MCP controlan visibility, pero la propia documentación de contexto advierte que visibility no autoriza argumentos generados por el modelo ni sustituye la autorización del sistema protegido.[^openai-context][^openai-mcp]

La política robusta aplica las tres capas.

## 14. Los resultados del subagente deben volver con provenance suficiente

Si un especialista devuelve únicamente:

```text
"todo correcto"
```

el padre no sabe:

- qué versión del repositorio inspeccionó;
- qué tests ejecutó;
- qué fuentes leyó;
- qué warnings ignoró;
- si su workspace divergió;
- qué side effects produjo.

Un retorno útil debería ser estructurado:

```text
result
candidate_sha / data_version
evidence_ids
checks_run
unresolved_items
side_effects
workspace_or_session_id
```

Esto conecta directamente con los capítulos 3.2–3.4: la salida de un subagente vuelve a ser **evidencia candidata**, no verdad autoritativa automática.

## 15. Plugins y skills también son una frontera de prompt injection

Una extensión puede introducir instrucciones, referencias, código o integraciones de terceros. La procedencia importa incluso si el paquete está «instalado».

Para cada componente registra como mínimo:

```text
package / skill id
version or content hash
publisher/source
installation scope
loaded files
requested capabilities
runtime surface
```

Si una skill puede leer contenido externo, ese contenido sigue siendo no confiable. Si un plugin contiene hooks, el riesgo incluye ejecución local. Si incorpora una app/MCP server, añade una frontera de autorización externa.

`installed` no debería convertirse en `trusted for every task`.

## 16. Evaluar skills: selección, carga, calidad y contaminación

Un set de evaluación de skills debería incluir positivos y negativos.

Mide, al menos:

```text
activation_recall
activation_precision
context_bytes_or_tokens_loaded
success_given_correct_activation
false_activation_side_effects
instruction_conflict_rate
```

Los hard negatives son importantes: tareas que se parecen semánticamente pero no deberían activar la skill.

Para skills con código, añade pruebas del runtime real: filesystem, red, paquetes disponibles y permisos.

## 17. Evaluar plugins: instalación y dependency graph forman parte del sistema

El test unitario de un componente no certifica el plugin completo.

Prueba:

```text
manifest parsing
version pin / update path
missing dependency
permission downgrade
unauthorized user
revoked OAuth/app access
malicious or stale packaged instructions
component name collision
rollback/uninstall
```

Un plugin compuesto debe evaluarse como grafo de dependencias, no como una única capability.

## 18. Evaluar subagentes: delegation quality y aislamiento por separado

La evaluación necesita dos ejes distintos.

### ¿Delegó bien?

- eligió el specialist correcto;
- construyó un envelope suficiente;
- evitó duplicar trabajo;
- hizo handback cuando faltaba autoridad;
- devolvió evidencia usable.

### ¿Estuvo realmente aislado?

- no recibió historial prohibido;
- no vio tools fuera de allowlist;
- no leyó rutas fuera del workspace;
- no recibió secretos innecesarios;
- no alcanzó red no permitida;
- no escribió memoria persistente fuera del scope.

No combines ambos resultados en un único `task_success`.

## 19. Evaluar hooks: trigger, orden, decisión y fallo

Para cada hook conserva fixtures que prueben:

```text
correct event fires
wrong event does not fire
matcher boundaries
allow / ask / deny behavior
ordering with permission system
exit code / timeout
async behavior
idempotency on retries
redaction of secrets
latency added to critical path
```

Un hook preventivo que falla abierto puede ser un P0 de seguridad. Un hook de observabilidad que pierde eventos puede ser un P1/P2 de diagnóstico. El mismo porcentaje de «hook success» no describe ambos riesgos.

## 20. Observabilidad: una traza debe mostrar los saltos de contexto y autoridad

OpenAI Agents SDK registra spans distintos para agentes, function tools, guardrails y handoffs, lo que ilustra la granularidad mínima que necesita una traza de delegación.[^openai-tracing]

Un ledger portable debería conservar:

```text
root_run_id
parent_agent_id
child_agent_id / plugin component
extension_version_or_hash
context_filter / input summary id
visible capabilities
authorization principal
workspace/sandbox id
hook event + decision
tool calls + side effects
result evidence ids
handoff / handback reason
```

No necesitas copiar conversaciones completas a logs. Necesitas poder reconstruir **qué frontera se cruzó y bajo qué autoridad**.

## 21. Caso concreto: revisión de un pull request con skill, plugin, subagente y hooks

Supongamos un coding agent que revisa y, si todo está correcto, prepara un PR para merge.

Un diseño explícito puede ser:

```text
PLUGIN repo-review
  packages:
    SKILL review-policy
    SUBAGENT security-reviewer
    HOOK pre-merge-verifier
    MCP/app integration -> GitHub
```

El flujo seguro es:

```text
1. el parent descubre la metadata de review-policy
2. activa la skill porque la tarea es review
3. construye D con candidate SHA + diff + criterios + tool allowlist
4. delega al security-reviewer en contexto separado
5. el subagente sólo recibe archivos/evidencia necesarios
6. devuelve findings + evidence ids + candidate SHA
7. el parent reconcilia findings con su contexto actual
8. un pre-merge hook ejecuta verificaciones deterministas sobre el mismo SHA
9. la integración GitHub vuelve a comprobar permiso + branch/head actuales
10. sólo entonces se propone o ejecuta el efecto permitido
```

Observa qué hace cada primitive:

- la **skill** aporta procedimiento;
- el **plugin** distribuye componentes;
- el **subagente** separa trabajo/model context;
- el **hook** fija una transición determinista;
- la **integración** posee el side effect externo;
- la **policy** decide qué authority cruza cada frontera.

Ninguna de las cinco sustituye a las otras.

## 22. Decisión de producción: elige la primitive por el problema que necesitas aislar

Usa una **skill** cuando el problema principal sea knowledge/procedure reutilizable y quieras cargarlo sólo cuando resulte relevante.

Usa un **plugin** cuando el problema sea distribución, versionado y composición de varias capabilities. Revisa por separado la autoridad de cada componente incluido.

Usa un **subagente** cuando la tarea necesite especialización, paralelismo o separación de contexto. Añade aislamiento de tools/workspace/network/memory explícitamente si también lo necesitas.

Usa un **hook** cuando una transición de lifecycle requiera una regla determinista, validación o telemetría que no deba depender de la elección del modelo. Decide si debe bloquear antes del efecto o sólo observar después.

Y combina primitives sólo cuando cada una cierre una frontera concreta. Más capas no implican automáticamente más seguridad ni mejor contexto.

## 23. Implicación final: package, context y authority deben poder auditarse por separado

Una arquitectura mantenible conserva estas desigualdades:

```text
skill loaded ≠ action authorized
plugin installed ≠ component trusted
subagent created ≠ context isolated
separate context ≠ separate application state
hook deterministic ≠ hook safe
capability visible ≠ capability authorized
task success ≠ isolation success
```

Si una sola pregunta resume el capítulo, es ésta:

> **Antes de añadir una extension primitive, identifica qué cambia realmente: qué se empaqueta, qué entra en contexto, dónde se ejecuta, qué autoridad hereda y qué evidencia demostraría que esa frontera funciona.**

Ese contrato permite usar skills, plugins, subagentes y hooks sin convertir conveniencia de producto en una propiedad de seguridad inexistente.

## Referencias

[^anthropic-skills]: Anthropic, *Agent Skills overview*. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
[^claude-plugins]: Anthropic, *Claude Code — Plugins reference*. https://code.claude.com/docs/en/plugins-reference
[^claude-subagents]: Anthropic, *Claude Code — Create custom subagents*. https://code.claude.com/docs/en/subagents
[^claude-hooks-guide]: Anthropic, *Claude Code — Automate workflows with hooks*. https://code.claude.com/docs/en/hooks-guide
[^claude-hooks]: Anthropic, *Claude Code — Hooks reference*. https://code.claude.com/docs/en/hooks
[^claude-permissions]: Anthropic, *Claude Code — Configure permissions*. https://code.claude.com/docs/en/permissions
[^anthropic-containment]: Anthropic Engineering, *How we contain Claude across products*, 2026. https://www.anthropic.com/engineering/how-we-contain-claude
[^openai-plugins]: OpenAI Help Center, *Plugins in ChatGPT and Codex*, actualizado en 2026. https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex
[^openai-agents]: OpenAI Agents SDK, *Agents*. https://openai.github.io/openai-agents-python/agents/
[^openai-handoffs]: OpenAI Agents SDK, *Handoffs*. https://openai.github.io/openai-agents-python/handoffs/
[^openai-context]: OpenAI Agents SDK, *Context management*. https://openai.github.io/openai-agents-python/context/
[^openai-guardrails]: OpenAI Agents SDK, *Guardrails*. https://openai.github.io/openai-agents-python/guardrails/
[^openai-mcp]: OpenAI Agents SDK, *Model Context Protocol*. https://openai.github.io/openai-agents-python/mcp/
[^openai-tracing]: OpenAI Agents SDK, *Tracing*. https://openai.github.io/openai-agents-python/tracing/
