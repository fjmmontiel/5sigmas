---
title: "Arquitecturas de memoria para agentes: working, episodic, semantic y estado persistente"
description: "Cómo separar contexto activo, memoria episódica, conocimiento semántico y estado autoritativo persistente sin confundir persistencia, retrieval o checkpoints con tipos de memoria."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "agent memory, working memory, episodic memory, semantic memory, persistent state, context engineering, agents"
tags:
  - IA
  - Agentes
  - Context engineering
  - Memoria
  - Arquitectura
---

# Capítulo 3 — Arquitecturas de memoria: working, episodic, semantic y estado persistente

Un agente puede recordar una preferencia del usuario durante meses y, aun así, tomar una mala decisión si trata esa preferencia como más autoritativa que el estado actual del sistema de negocio. También puede conservar un checkpoint perfecto y no recordar nada útil sobre tareas anteriores.

El problema no es sólo **qué guardar**. Es separar cuatro preguntas:

1. ¿qué estado necesita la tarea **ahora** para razonar?;
2. ¿qué experiencias pasadas merece la pena conservar como episodios?;
3. ¿qué regularidades o hechos derivados merece la pena consolidar como conocimiento semántico?;
4. ¿qué datos son **estado autoritativo** del producto y deben leerse de su system of record en lugar de confiar en una memoria del agente?

Hay una quinta distinción que evita muchos diseños confusos: **persistente no es, por sí solo, un tipo cognitivo de memoria**. Persistencia describe cuánto dura un dato y dónde vive. Una conversación, un episodio, un embedding, una preferencia consolidada o un checkpoint pueden ser persistentes, pero tienen semánticas distintas.

CoALA propone una arquitectura conceptual que distingue working memory y long-term memory, y dentro de esta última memoria semántica, episódica y procedural.[^coala] Es un marco útil para ordenar conceptos, no una API ni una taxonomía obligatoria para producción. En este capítulo adaptamos esa idea a una frontera operativa más importante para agentes: **memoria derivada no equivale a estado autoritativo**.

{{ include_html("snippets/articulos-tecnicos/context-memory-lifecycle.html") }}

## Working state: lo que la ejecución necesita ahora

Llamemos \(W_t\) al working set usado en una decisión concreta. Puede incluir:

- la petición actual;
- instrucciones vigentes;
- resultados recientes de tools;
- una porción relevante del historial;
- recuerdos recuperados;
- una lectura fresca de estado externo.

\(W_t\) es **estado activo**, no necesariamente persistente. Puede reconstruirse en cada turno a partir de fuentes externas.

Esto importa porque «tener memoria» no significa que todo lo recordado deba entrar en contexto. El capítulo anterior trató el assembly bajo presupuesto. Aquí añadimos una política de lifecycle:

\[
W_t = A(U_t, H_t, E_t, S_t, R_t)
\]

donde \(A\) es la política de ensamblado, \(E_t\) son episodios recuperados, \(S_t\) conocimiento semántico recuperado y \(R_t\) lecturas autoritativas actuales.

La fórmula es una abstracción de diseño. No describe el comportamiento interno de un proveedor.

## Episodic memory: hechos situados en el tiempo

Una memoria episódica representa **algo que ocurrió**. Un episodio útil suele conservar al menos:

```text
event_id
subject / scope
observed_at
source
source_version
input / action / result relevantes
provenance
retention / sensitivity metadata
```

Ejemplos:

- «el usuario rechazó esta propuesta el 11-09-2026»;
- «la ejecución run-42 falló porque el schema de pagos no aceptaba `currency=null`»;
- «el agente llamó a `cancel_subscription` y recibió `409 already_cancelled`».

El tiempo y la procedencia son parte del significado. Si eliminamos ambos, un episodio puede convertirse en una afirmación ambigua que parece universal.

El paper *Generative Agents* de 2023 usa un **memory stream** de experiencias, retrieval dinámico y reflexiones derivadas para influir en comportamiento posterior.[^generative-agents] Es un precedente de investigación valioso. No implica que su scoring, representación o arquitectura sean la opción correcta para un sistema de producción de 2026.

## Semantic memory: conocimiento consolidado, no una copia del historial

Una memoria semántica representa conocimiento que queremos reutilizar sin reproducir todos los episodios de los que surgió.

Ejemplo:

```text
episodio e17: usuario pide seguimiento por email
episodio e24: vuelve a pedir email
episodio e31: corrige SMS -> email

consolidación:
preference.follow_up_channel = "email"
derived_from = [e17, e24, e31]
```

La consolidación reduce coste de retrieval y contexto, pero crea una representación derivada. Por eso necesita responder:

- ¿de qué episodios deriva?;
- ¿qué regla o modelo produjo la consolidación?;
- ¿cuándo se actualizó?;
- ¿qué evidencia la contradice?;
- ¿cuándo debe invalidarse o recomputarse?

Una memoria semántica no debería ascender automáticamente a «verdad». Puede ser una inferencia útil, una preferencia probable o una regla aprendida. Su **authority** depende de la fuente y del dominio.

## Estado persistente autoritativo: memoria del agente no debe sustituirlo

Un sistema de soporte puede recordar que un cliente estaba en el plan Pro ayer. Esa memoria no debería decidir si hoy puede usar una feature de pago.

El estado actual de:

- suscripción;
- permisos;
- saldo;
- consentimiento;
- ownership;
- inventario;
- estado de una orden;

suele pertenecer a un **system of record** externo al agente.

La aplicación puede conservar una copia, un cache o una memoria derivada, pero cuando la decisión requiere autoridad actual debe leer o validar contra la fuente correspondiente.

Regla de diseño:

```text
fresh authoritative state
>
stale derived memory
```

No significa que la fuente externa nunca falle. Significa que la aplicación debe modelar explícitamente qué fuente tiene autoridad para cada decisión, en vez de dejar que «lo que el agente recuerda» gane por aparecer primero en el prompt.

## La persistencia es un eje, no un cuarto tipo

Podemos clasificar una pieza de estado en dos ejes diferentes:

| Semántica | Puede ser efímera | Puede persistir | Ejemplo |
| --- | --- | --- | --- |
| Working state | sí | sí, si se serializa | tool result actual |
| Episodio | raramente útil si sólo es efímero | sí | acción + resultado + timestamp |
| Semántica derivada | puede calcularse on demand | sí | preferencia consolidada |
| Estado autoritativo | normalmente vive fuera del agente | sí | suscripción en billing DB |
| Checkpoint | sí | sí | snapshot para reanudar ejecución |

Esta separación evita frases engañosas como «usamos una base vectorial, por tanto tenemos memoria persistente». Una base vectorial describe un mecanismo de almacenamiento y retrieval. No define qué significa cada registro ni su autoridad.

## Retrieval tampoco es un tipo de memoria

Retrieval responde **cómo accedemos** a información. Puede usar:

- clave exacta;
- SQL;
- búsqueda textual;
- embeddings;
- graph traversal;
- filtros por usuario, tiempo, versión o tenant;
- una combinación de ellos.

Episodic y semantic describen **qué representa** la información. Retrieval describe **cómo la encontramos**.

La diferencia será central en el siguiente capítulo: una búsqueda semántica excelente puede recuperar una memoria stale o poco autoritativa. Relevance no resuelve freshness ni authority.

## Checkpoint ≠ memory

Un checkpoint responde a otra pregunta: **¿desde qué estado de ejecución puedo reanudar?**

Puede serializar:

```text
step_id
pending tool calls
local variables
cursor / queue position
conversation items
retry counters
external effect IDs
```

Eso puede ser crítico para recovery, pero no convierte el checkpoint en memoria semántica o episódica.

Un checkpoint puede contener accidentalmente conversación o episodios. Aun así, su contrato principal es **resume correctness**, no **future usefulness**.

La distinción inversa también importa: una memoria persistente con las preferencias del usuario no basta para reanudar un workflow después de un crash. Faltan pending effects, locks, idempotency keys o posiciones de ejecución.

## Qué ofrecen los frameworks actuales y qué no

OpenAI Agents SDK documenta `Session` como una capa persistente para mantener historial entre runs. El runner recupera items previos, los añade al siguiente turno y persiste nuevos items; distintas implementaciones pueden usar SQLite, Redis, SQLAlchemy, OpenAI Conversations u otros backends.[^openai-sessions] El SDK también permite limitar cuánto historial recuperar y ofrece compaction sobre sesiones.[^openai-sessions]

Eso es una **capacidad del harness**. No decide por sí sola qué parte del historial es una preferencia durable, qué dato es autoritativo o cuándo debe invalidarse una memoria semántica.

Anthropic documenta dos superficies distintas. Su Memory Tool es client-side: Claude solicita operaciones y **la aplicación ejecuta y controla el almacenamiento**.[^anthropic-memory-tool] Managed Agents, en cambio, ofrece memory stores persistentes como una capacidad gestionada de ese producto.[^anthropic-managed-memory]

No debemos atribuir una propiedad del Managed Agents service al modelo Claude ni una política de verdad/frescura a la Memory Tool. En ambos casos siguen existiendo decisiones de aplicación sobre scope, retención, autoridad, privacidad e invalidación.

## Escribir memoria es una operación con política

Un diseño peligroso permite que cualquier texto generado termine automáticamente en memoria durable.

Mejor separar:

```text
observation
  ↓
candidate memory write
  ↓
validation / scope / sensitivity / dedup
  ↓
append episode OR update semantic memory
  ↓
provenance + retention + invalidation metadata
```

Ejemplos de checks antes de escribir:

- ¿es una observación o una inferencia?;
- ¿pertenece realmente a este usuario/tenant?;
- ¿contiene secretos o datos que no deben persistir?;
- ¿ya existe una memoria equivalente?;
- ¿hay suficiente evidencia para consolidar un hecho semántico?;
- ¿qué evento futuro debe invalidarlo?;
- ¿el usuario o producto permite retenerlo?

El modelo puede proponer una escritura. La aplicación sigue poseyendo el contrato de persistencia.

## Conflictos: autoridad primero, después relevancia

Supongamos que un agente de soporte recupera:

```text
semantic memory:
  preferred_channel = email
  derived_from = [e17, e24, e31]

system of record:
  marketing_email_consent = false
  revision = consent@2026-09-11T17:22Z
```

Para una campaña de marketing, una preferencia recuperada no autoriza el envío. La lectura autoritativa actual debe gobernar la acción.

Para una respuesta operativa permitida por el producto, la preferencia puede seguir siendo útil.

La resolución necesita al menos:

1. **scope**: ¿hablan de la misma decisión?;
2. **authority**: ¿qué fuente gobierna esa decisión?;
3. **freshness/version**: ¿qué estado sigue siendo aplicable?;
4. **provenance**: ¿de dónde salió la memoria derivada?;
5. **policy**: ¿debe invalidarse, corregirse o conservarse con menor prioridad?

«Último timestamp gana» tampoco es una política universal. Un episodio nuevo puede ser una observación débil, mientras que una regla autoritativa más antigua sigue vigente.

## Borrado y corrección necesitan trazabilidad

Persistir memoria crea obligaciones de ciclo de vida.

Si un usuario corrige «prefiero email» por «prefiero llamadas», el sistema necesita saber qué representaciones derivadas actualizar. Si una fuente se elimina por política de retención o privacidad, las memorias que dependen de ella no deberían seguir sobreviviendo sin una decisión explícita.

Una estrategia útil es conservar relaciones como:

```text
semantic_memory_id
  derived_from -> episode IDs
  scope -> user/project/tenant
  supersedes -> prior memory ID
  invalidated_by -> event/source revision
  retention_policy -> policy ID
```

No hace falta implementar un grafo formal para todo. Sí hace falta poder explicar qué se debe borrar, corregir o recomputar cuando cambia la fuente.

## Caso completo: agente de soporte

Consideremos cuatro almacenes separados:

```text
WORKING
- ticket actual
- últimos tool results
- subset recuperado de memoria

EPISODIC
- e17: cliente pidió email
- e24: cliente rechazó SMS
- e31: agente corrigió canal tras feedback

SEMANTIC
- preferred_follow_up_channel = email
- derived_from = [e17,e24,e31]

AUTHORITATIVE
- active_plan = Pro
- account_locked = false
- marketing_email_consent = false
```

Al abrir un ticket nuevo:

1. el assembler no carga todo el historial;
2. recupera la preferencia semántica relevante;
3. consulta el estado actual para decisiones sensibles;
4. construye \(W_t\);
5. ejecuta la acción;
6. guarda el resultado como episodio;
7. sólo actualiza memoria semántica si la política de consolidación lo justifica.

Si el usuario cambia el canal preferido, los nuevos episodios pueden sustituir la memoria anterior. Si cambia el plan, no hace falta «enseñar» al agente el nuevo plan mediante memoria: se vuelve a leer del system of record.

## Cómo evaluar una arquitectura de memoria

Una memoria útil no se evalúa sólo con recall@k.

Mide por separado:

- **write precision**: cuántas escrituras persistidas merecían realmente persistir;
- **retrieval usefulness**: si la memoria recuperada mejora la tarea;
- **stale-memory override rate**: veces que una memoria antigua desplaza evidencia más autoritativa;
- **conflict-resolution accuracy**: si gana la fuente correcta cuando hay contradicción;
- **provenance coverage**: qué porcentaje de memorias derivadas conserva origen y versión;
- **consolidation fidelity**: si una memoria semántica conserva las invariantes relevantes de sus episodios;
- **deletion/correction propagation**: si cambios en la fuente llegan a derivados dependientes;
- **cross-tenant leakage**: cualquier mezcla entre scopes debe ser fallo crítico;
- **memory-induced task success delta** frente al mismo agente sin esa memoria;
- **resume correctness** para checkpoints, evaluada aparte de la calidad de memoria.

Esta última separación es importante: una arquitectura puede tener buena memoria y mal recovery, o excelente checkpointing y mala selección de recuerdos.

## Implicación de producción: trata memoria como un pipeline de datos

Una arquitectura de memoria madura necesita contratos explícitos para:

```text
WRITE
what may persist?

IDENTITY
who / project / tenant does it belong to?

PROVENANCE
where did it come from?

AUTHORITY
is it observation, inference, preference, or system-of-record state?

FRESHNESS
what version or event invalidates it?

RETRIEVAL
when should it be considered for W_t?

RETENTION
when must it expire or be deleted?

EVALS
how do we know it helps rather than contaminates future decisions?
```

La pregunta de diseño no es «¿qué vector database usamos?». Es **qué información permitimos persistir, qué significa, qué autoridad tiene, cuándo puede condicionar una decisión y cómo deja de hacerlo cuando el mundo cambia**.

El siguiente capítulo separará esa memoria persistida del mecanismo de retrieval y assembly: cómo recuperar evidencia fresca y relevante, resolver conflictos y grounding sin confundir similarity con verdad.

[^coala]: Sumers, Yao, Narasimhan y Griffiths, [Cognitive Architectures for Language Agents](https://arxiv.org/abs/2309.02427), 2023.
[^generative-agents]: Park et al., [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442), 2023.
[^openai-sessions]: OpenAI Agents SDK, [Sessions](https://openai.github.io/openai-agents-python/sessions/), consultado el 11-09-2026.
[^anthropic-memory-tool]: Anthropic, [Memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool), consultado el 11-09-2026.
[^anthropic-managed-memory]: Anthropic, [Using agent memory](https://platform.claude.com/docs/en/managed-agents/memory), consultado el 11-09-2026.