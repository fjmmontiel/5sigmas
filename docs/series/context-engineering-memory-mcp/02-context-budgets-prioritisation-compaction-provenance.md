---
title: "Context budgets, priorización, compaction y provenance: qué conservar cuando no cabe todo"
description: "Cómo separar el límite físico de contexto del presupuesto operativo, priorizar evidencia, compactar sin confundir resumen con verdad y conservar provenance para rehidratar o invalidar información."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "context budget, context window, compaction, provenance, context engineering, agentes, LLM"
tags:
  - IA
  - Agentes
  - Context engineering
  - Arquitectura
  - LLMs
---

# Capítulo 2 — Context budgets, priorización, compaction y provenance

Una ventana de contexto grande responde a una pregunta física: **cuántos tokens puede aceptar el sistema en una inferencia bajo un contrato concreto**. No responde a la pregunta de producción: **qué información merece ocupar ese espacio ahora**.

Un agente de código puede disponer de una ventana de contexto muy amplia y, aun así, fallar porque conserva demasiados logs obsoletos, compacta una excepción crítica dentro de un resumen ambiguo o recupera una decisión tomada sobre un `HEAD` anterior sin conservar de qué versión provenía.

Este capítulo separa cuatro mecanismos que suelen mezclarse:

1. **límite de contexto**: la capacidad que expone el modelo/API;
2. **presupuesto operativo**: la parte de esa capacidad que decidimos usar para input después de reservar salida y margen;
3. **priorización y compaction**: qué entra verbatim, qué se transforma, qué se referencia y qué se descarta;
4. **provenance**: qué origen, versión y transformación permiten explicar de dónde salió cada pieza y cuándo deja de ser válida.

Google documenta que el contexto se mide en tokens y que sus límites deben consultarse sobre el modelo actual, en lugar de asumir una cifra fija.[^google-tokens] Anthropic recomienda contar tokens antes de enviar una petición y documenta diferentes comportamientos cuando se alcanza o supera la ventana.[^anthropic-window] Esos detalles son contratos de proveedor/API, no una ley universal sobre todos los modelos.

{{ include_html("snippets/articulos-tecnicos/context-budget-lineage.html") }}

## El máximo de contexto no es tu presupuesto operativo

Supongamos que el proveedor expone un límite total \(W\). Una aplicación puede decidir proteger una salida \(O\), mantener un margen \(M\) y reservar bloques obligatorios \(F\), como instrucciones de seguridad o contratos de tools.

Una descomposición útil para diseño es:

\[
B_{\text{input}} = W - O - M
\]

\[
B_{\text{dynamic}} = B_{\text{input}} - F
\]

`B_dynamic` no es una propiedad del modelo. Es una **decisión de producto y runtime**.

El margen puede absorber variación de tokenización, datos dinámicos, tool schemas variables o diferencias entre el contador previo y la petición final. La reserva de salida evita consumir toda la ventana con input y dejar al modelo sin espacio para completar la tarea. Las piezas obligatorias protegen políticas que no deben competir contra un log enorme por el último token disponible.

El planificador de presupuesto de contexto de 5sigmas ya permite explorar esta aritmética de capacidad. Este capítulo aborda el problema posterior: **una vez conocemos cuánto cabe, cómo decidimos qué merece entrar y cómo preservamos su trazabilidad**.

## Un item de contexto necesita más que texto

Para razonar sobre selección conviene representar cada candidato como algo más rico que una cadena:

\[
z_i = (v_i, c_i, s_i, q_i, t_i, a_i, \tau_i)
\]

donde:

- \(v_i\): contenido o valor;
- \(c_i\): coste estimado en tokens;
- \(s_i\): fuente;
- \(q_i\): versión, commit, revision ID o ETag cuando exista;
- \(t_i\): tiempo de captura u observación;
- \(a_i\): autoridad/trust aplicable;
- \(\tau_i\): transformación realizada sobre la fuente, si existe.

Dos chunks con el mismo texto pueden no ser equivalentes si uno procede de la política vigente y otro de una memoria antigua. Un resumen correcto ayer puede ser stale hoy si el documento del que deriva cambió.

**Relevancia, autoridad, frescura y coste son variables distintas.**

## Priorizar no es ordenar por similarity score

Un selector puede aproximar la utilidad de cada candidato, pero el sistema necesita restricciones duras además de un ranking.

Como abstracción de diseño:

\[
\max_{x_i \in \{0,1\}} \sum_i x_i u_i - \lambda R(x)
\]

sujeto a:

\[
\sum_i x_i c_i \le B_{\text{dynamic}}
\]

y a restricciones como:

```text
policy.must_include == true
tenant == current_tenant
source.trust >= required_trust
version is compatible with current task state
```

`u_i` no es una propiedad objetiva del texto. Puede estimarse mediante reglas, retrieval, un modelo selector, resultados de evals o una mezcla de ellos. \(R(x)\) representa riesgos del conjunto, por ejemplo redundancia o conflicto.

La ecuación sirve para hacer explícita la decisión. **No afirma que un framework o proveedor resuelva context engineering mediante esa función.**

### Primero restricciones, después relevancia

Una política robusta puede operar así:

1. excluir contenido que no pertenece al tenant o scope;
2. fijar contenido obligatorio;
3. invalidar piezas incompatibles con la versión actual;
4. priorizar evidencia restante por utilidad para la decisión concreta;
5. aplicar una transformación adecuada cuando el coste sea demasiado alto.

Esto evita un fallo común: permitir que un fragmento muy relevante semánticamente desplace una instrucción normativa o que una memoria antigua gane porque su embedding está más cerca de la pregunta.

## Qué hacer cuando una pieza útil no cabe

No existe una única operación llamada «reducir contexto». Hay decisiones semánticamente distintas.

| Operación | Qué entra en \(C_t\) | Qué permanece fuera | Riesgo dominante |
| --- | --- | --- | --- |
| **Verbatim** | contenido original | nada de esa pieza | coste de tokens |
| **Selección** | fragmentos elegidos | fragmentos no seleccionados | omitir una excepción |
| **Extracción estructurada** | campos/hechos explícitos | representación original | perder matices fuera del schema |
| **Compaction/resumen** | representación derivada | detalle original | pérdida o distorsión |
| **Referencia + rehidratación** | ID/pointer + mínimo contexto | contenido grande en storage | fallo de retrieval o versión |
| **Drop** | nada | pieza completa | perder señal relevante |

La operación correcta depende del tipo de evidencia. Una política de seguridad puede requerir texto exacto. Un log repetitivo puede resumirse. Un archivo grande puede permanecer fuera con un identificador estable y recuperarse sólo si una decisión posterior lo necesita.

### Compaction es una transformación, no memoria perfecta

Anthropic documenta server-side compaction como un proceso que resume contexto antiguo al alcanzar un umbral y continúa desde un bloque `compaction`; en peticiones posteriores elimina bloques anteriores a ese punto.[^anthropic-compaction] Su documentación de context editing distingue esa compaction de limpiar selectivamente tool results o thinking blocks.[^anthropic-editing]

OpenAI documenta en Codex y Responses un mecanismo distinto: sustituye el input previo por una lista compactada y el endpoint `/responses/compact` puede devolver un item opaco de tipo `compaction` para continuar la conversación.[^openai-codex-loop][^openai-compact]

Las implementaciones son diferentes. La lección de arquitectura sí es común:

> después de compactar, la representación activa ya no es idéntica al historial original.

Por eso no debemos etiquetar automáticamente un resumen como «la verdad de la conversación». Debe tratarse como un **artefacto derivado** con una procedencia y una política de invalidación.

### Cache no es compaction

Google describe context caching como reutilización de tokens de entrada ya procesados para reducir coste o mejorar rendimiento cuando se repite contenido.[^google-cache]

Caching puede hacer más barato reutilizar un prefijo. No elimina lógicamente ese contenido de la entrada activa ni decide qué debe conservarse. Es una optimización de ejecución distinta de:

- seleccionar;
- resumir;
- externalizar;
- descartar.

Confundir cache con compaction oculta el problema real: **qué información condiciona la próxima inferencia**.

## Provenance: poder volver desde una representación a su origen

Provenance no significa «añadir una URL al final».

Para context engineering necesitamos responder, cuando sea material:

- ¿de qué entidad o fuente deriva esta pieza?;
- ¿qué versión concreta observamos?;
- ¿cuándo se capturó?;
- ¿qué transformación produjo la representación actual?;
- ¿fue una copia exacta, una extracción o un resumen con pérdida?;
- ¿qué cambio debe invalidarla?;
- ¿podemos rehidratar la fuente si necesitamos verificarla?

W3C PROV-O formaliza relaciones generales entre entidades, actividades y agentes, incluyendo derivación e invalidación.[^prov-o] No hace falta adoptar RDF ni PROV-O para implementar un agente. Sí es útil la disciplina conceptual: **una representación derivada debe poder enlazarse con aquello de lo que deriva**.

Un manifest de aplicación podría parecerse a esto:

```json
{
  "context_item_id": "ctx_017",
  "kind": "summary",
  "derived_from": [
    {
      "uri": "repo://payments/refund_policy.md",
      "version": "git:4af13c2",
      "captured_at": "2026-09-11T12:03:18Z"
    }
  ],
  "transform": {
    "kind": "summary",
    "policy_version": "support-v7",
    "lossy": true
  },
  "validity": {
    "scope": "repo_head=4af13c2",
    "invalidate_on": ["source_version_change"]
  }
}
```

Esto es un **ejemplo de esquema de aplicación**, no un estándar de proveedor ni una serialización exigida por W3C.

## Freshness no es una timestamp

Un timestamp sólo dice cuándo observamos algo. No demuestra que siga siendo válido.

Imaginemos un agente de código:

```text
repo HEAD       = a1b2c3
summary S       = derivado de files@a1b2c3
tests T         = ejecutados sobre candidate@a1b2c3
```

Después aparece:

```text
repo HEAD       = d4e5f6
```

El resumen `S` no se vuelve falso automáticamente, pero **su validez ya no puede darse por supuesta para el nuevo estado**. Los tests `T` tampoco prueban el nuevo candidato.

La política puede:

- marcar `S` como `STALE`;
- comparar qué archivos cambiaron antes de invalidarlo por completo;
- rehidratar las fuentes afectadas;
- regenerar sólo el resumen necesario;
- volver a ejecutar la evidencia cuyo scope dependía del SHA anterior.

La misma lógica aplica a políticas, tickets, esquemas de base de datos, APIs externas o memoria de usuario.

## Caso completo: un agente de código bajo presión de tokens

Supongamos este universo candidato **puramente ilustrativo**; las cifras no describen un proveedor ni un benchmark:

```text
4k   instrucciones y contrato de tarea
18k  archivos relevantes del repo
42k  salida de tests y logs
35k  historial de conversación
16k  documentación externa
12k  memorias y decisiones anteriores
```

El presupuesto dinámico disponible en este escenario ilustrativo es 60k.

Una estrategia ingenua toma los elementos más recientes hasta llenar el límite. Puede terminar incluyendo 42k de logs y expulsando la spec.

Una estrategia explícita podría hacer:

```text
4k   contrato                           -> VERBATIM / obligatorio
18k  archivos                            -> chunks actuales con repo SHA
42k  logs                                -> extracción de fallos + pointer al raw
35k  historial                           -> compact summary + lineage
16k  docs                                -> retrieval just-in-time
12k  memoria                             -> sólo decisiones vigentes y verificadas
```

No hemos «ganado tokens» gratuitamente. Hemos cambiado representaciones y, por tanto, creado nuevas obligaciones:

- verificar que la extracción de logs conserva el fallo relevante;
- conservar el raw para rehidratar;
- registrar de qué historial deriva el resumen;
- invalidar artifacts ligados a un SHA antiguo;
- medir si esta política mejora el éxito de tarea.

## Tool search y context loading son priorización, no magia

OpenAI documenta que Agents API puede cargar definiciones de tools relevantes cuando se necesitan en lugar de colocar todas las definiciones en cada turno, y que gestiona compaction para trabajos que atraviesan varias ventanas.[^openai-agents-api]

Eso reduce plumbing dentro de ese producto. No convierte la decisión de contexto en una propiedad intrínseca del modelo y no elimina decisiones de aplicación como:

- qué tools están autorizadas para el usuario;
- qué evidencia de negocio es normativa;
- qué resultados deben persistir fuera del contexto;
- qué cambios invalidan una representación derivada.

Mantén siempre la frontera:

```text
model capability
≠
provider/API context-management capability
≠
application/harness context policy
```

## Cómo evaluar una política de contexto

No basta medir «tokens usados». Un sistema puede usar pocos tokens porque eliminó justo la evidencia necesaria.

Mide al menos:

- **task success** bajo una política de budget concreta;
- **critical-evidence omission rate**: cuántas tareas fallan porque faltó evidencia que sí estaba disponible;
- **stale-context incidence**: decisiones condicionadas por una versión ya incompatible;
- **provenance coverage**: proporción de items derivados con origen/version/transform recuperables;
- **rehydration success**: si un pointer permite recuperar exactamente la fuente esperada;
- **compaction fidelity** sobre invariantes críticas, no similitud estilística;
- **context occupancy** por clase de información;
- latencia y coste del selector, retrieval y compaction;
- estabilidad frente a cambios de orden y contenido irrelevante.

Las evals deben congelar, cuando sea posible, el corpus, versiones, modelo, tools y política para que un cambio de resultados sea atribuible. Si cambia el proveedor, la ventana, el algoritmo de retrieval y la política de compaction a la vez, no sabemos qué mejoró.

## Implicación de producción: persiste el assembly manifest

Para una inferencia material, guarda suficiente metadata para reconstruir la decisión de ensamblado:

```text
context_policy_version
model + API contract
candidate item IDs
included item IDs
source versions
transforms applied
drop / defer reasons
token estimates and observed usage
compaction lineage
invalidation / freshness state
```

No necesitas almacenar eternamente cada byte sensible. La retención debe respetar seguridad, privacidad y coste. Pero si una decisión crítica depende de una representación compactada y no puedes saber de qué versión salió, has perdido una parte importante de la auditabilidad del agente.

El objetivo no es llenar la ventana. Es **entregar al modelo el conjunto mínimo suficiente para la decisión actual y conservar fuera de la ventana la evidencia necesaria para verificar, rehidratar o invalidar lo que transformamos**.

El siguiente capítulo separará memoria de contexto activo: qué merece persistir entre turnos o sesiones, cómo se escribe y se recupera, y qué hacer cuando una memoria entra en conflicto con evidencia más reciente.

[^anthropic-window]: Anthropic, [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows), consultado el 11-09-2026.
[^anthropic-compaction]: Anthropic, [Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction), consultado el 11-09-2026.
[^anthropic-editing]: Anthropic, [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing), consultado el 11-09-2026.
[^openai-codex-loop]: OpenAI, [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/), consultado el 11-09-2026.
[^openai-compact]: OpenAI API Reference, [Compact a response](https://developers.openai.com/api/reference/java/resources/responses/methods/compact), consultado el 11-09-2026.
[^openai-agents-api]: OpenAI, [Introducing the Agents API](https://openai.com/index/introducing-the-agents-api/), 10-09-2026.
[^google-tokens]: Google AI for Developers, [Understand and count tokens](https://ai.google.dev/gemini-api/docs/tokens), actualizado el 04-09-2026.
[^google-cache]: Google AI for Developers, [Context caching](https://ai.google.dev/gemini-api/docs/caching), actualizado el 02-09-2026.
[^prov-o]: W3C, [PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/), W3C Recommendation, 30-04-2013.
