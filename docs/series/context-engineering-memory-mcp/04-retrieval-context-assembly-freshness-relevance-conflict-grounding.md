---
title: "Retrieval y ensamblado de contexto: frescura, relevancia, conflictos y grounding"
description: "Cómo separar la recuperación de candidatos de la política que decide qué evidencia entra en contexto, resolver frescura y conflictos y mantener un grounding verificable por afirmación."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "retrieval, RAG, context assembly, freshness, relevance, grounding, conflict resolution, hybrid search, context engineering"
tags:
  - IA
  - Agentes
  - Context engineering
  - Retrieval
  - RAG
---

# Capítulo 4 — Retrieval y ensamblado de contexto: frescura, relevancia, conflictos y grounding

Una búsqueda puede devolver el fragmento **más parecido** a la pregunta y, aun así, ser exactamente la evidencia que no debemos usar.

Puede estar desactualizado. Puede pertenecer a otro tenant. Puede describir una política antigua. Puede contradecir una fuente más autoritativa. O puede ser relevante para el tema, pero no sostener la afirmación concreta que el modelo está a punto de generar.

Ésa es la frontera de este capítulo:

> **retrieval propone candidatos; el ensamblado de contexto decide qué evidencia entra; el grounding conecta cada afirmación con la evidencia admitida.**

Mezclar las tres capas produce sistemas difíciles de depurar. Un `top_k=10` no es una política de verdad, y una puntuación de similitud no sustituye frescura, autoridad, permisos o provenance.

{{ include_html("snippets/articulos-tecnicos/context-retrieval-grounding.html") }}

## 1. Retrieval no es ensamblado de contexto

Llamemos \(q_t\) a la consulta derivada de la tarea actual. Un sistema puede generar candidatos desde varios retrievers:

\[
C_t =
R_{\mathrm{lex}}(q_t)
\cup
R_{\mathrm{sem}}(q_t)
\cup
R_{\mathrm{struct}}(q_t)
\]

donde:

- \(R_{\mathrm{lex}}\) prioriza coincidencias léxicas, identificadores y términos exactos;
- \(R_{\mathrm{sem}}\) usa representaciones vectoriales para proximidad semántica;
- \(R_{\mathrm{struct}}\) aplica consultas estructuradas: SQL, filtros por metadatos, recorridos de grafos, APIs o claves exactas.

\(C_t\) es un **conjunto de candidatos**, no el contexto final.

La política de ensamblado produce otro objeto:

\[
A_t =
\pi(
C_t
\mid
\text{scope},
\text{ACL},
\text{freshness},
\text{authority},
\text{conflicts},
B_t
)
\]

donde \(B_t\) es el presupuesto disponible y \(\pi\) es política de aplicación.

Estas ecuaciones son abstracciones de diseño. No describen una API concreta ni el comportamiento interno de un proveedor.

La distinción es útil porque permite preguntar por separado:

1. ¿encontramos la evidencia que necesitábamos?;
2. ¿admitimos la evidencia correcta?;
3. ¿la generación utilizó y citó esa evidencia de forma fiel?

Un único “RAG accuracy” puede ocultar tres fallos completamente distintos.

## 2. Léxico, semántico y estructurado resuelven problemas diferentes

La búsqueda semántica es buena cuando la intención y el vocabulario no coinciden literalmente. La búsqueda léxica conserva señales que un embedding puede diluir: códigos de error, nombres propios, identificadores, cláusulas exactas o símbolos.

Anthropic describe este motivo en su trabajo de Contextual Retrieval: combina embeddings con BM25 y después fusiona resultados; su experimento es evidencia de **esa configuración**, no una prueba de que una configuración híbrida concreta sea universalmente superior.[^anthropic-contextual]

PostgreSQL documenta `ts_rank` y `ts_rank_cd` como funciones de ranking léxico y advierte explícitamente que la relevancia depende de la aplicación y puede necesitar señales adicionales, como la fecha de modificación.[^postgres-ranking]

`pgvector` documenta búsqueda por similitud vectorial y su uso conjunto con PostgreSQL full-text search para búsqueda híbrida, incluyendo fusión de rankings o reranking como opciones.[^pgvector]

La consecuencia práctica es sencilla:

```text
identificador exacto?   lexical puede dominar
paráfrasis conceptual?  semantic puede recuperar mejor
estado de negocio?      structured/live read puede ser obligatorio
consulta mixta?         varios retrievers pueden generar candidatos
```

No existe un retriever que convierta relevancia en autoridad por sí solo.

## 3. Fusionar rankings no fusiona significado

Dos retrievers pueden producir puntuaciones incompatibles.

Una similitud coseno, una puntuación BM25, `ts_rank_cd` y la puntuación de un reranker no comparten necesariamente escala, distribución ni calibración. Sumarlas como si fueran probabilidades comparables crea una precisión aparente que no existe.

Una alternativa es fusionar **rangos**. Reciprocal Rank Fusion (RRF), por ejemplo, combina listas según la posición de cada documento y no requiere que sus puntuaciones originales compartan escala.[^elastic-rrf] Eso resuelve un problema de combinación de ranking.

No resuelve estos otros:

- si el documento es actual;
- si el usuario puede verlo;
- si gobierna la decisión;
- si contradice otra fuente;
- si el fragmento contiene la evidencia necesaria;
- si el modelo terminará apoyando sus afirmaciones en él.

Por eso `hybrid retrieval` y `context assembly` no son sinónimos.

## 4. La relevancia es una señal; no es verdad

Un candidato útil puede modelarse con metadatos suficientes para no perder su contrato:

```text
evidence_id
source_id
source_type
subject / scope
tenant
source_version
indexed_at
observed_at
valid_from / valid_to
authority_class
retrieval_method
retrieval_rank / score
content
```

No todos los campos son obligatorios en todos los sistemas. La idea importante es conservar separadas las dimensiones.

Una política de ensamblado debería evitar una función ingenua como:

```text
final_score =
  0.8 * semantic_similarity +
  0.2 * freshness
```

salvo que esas señales estén definidas, calibradas y evaluadas para el dominio.

Para decisiones sensibles suele ser más seguro usar **restricciones antes que ranking por preferencia**:

```text
1. scope / tenant / ACL
2. validez y versión
3. authority mínima para la decisión
4. detección de conflictos
5. relevance / utilidad dentro del conjunto elegible
6. budget y orden final
```

Un documento prohibido no debe ganar porque tenga una puntuación de similitud extraordinaria.

## 5. La frescura tiene al menos dos relojes

“Lo indexamos hace cinco minutos” no implica “el hecho tiene cinco minutos”.

Conviene distinguir:

```text
SOURCE TIME
cuándo era válida la fuente / qué revisión representa

INDEX TIME
cuándo esa revisión entró en el índice
```

Puede existir:

```text
source: policy@rev-B
indexed copy: policy@rev-A
indexed_at: hace 10 s
```

El índice es reciente; el contenido sigue stale.

También puede ocurrir lo contrario: un documento antiguo sigue siendo la política vigente porque no ha sido superseded.

Por eso **«gana el timestamp más reciente»** tampoco es una regla universal.

OpenAI describe en su agente interno una distinción operativa útil: contexto precomputado y embebido para retrieval y, cuando la información está stale o falta, consultas en vivo al data warehouse para validar el estado actual.[^openai-data-agent] Es una decisión de esa aplicación, no una propiedad automática de RAG.

Para datos volátiles, una estrategia frecuente es:

```text
retrieve candidate
→ inspect version/freshness requirement
→ if decision requires current authority:
     lectura directa del system of record
→ assemble with the validated revision
```

## 6. El índice necesita una política de invalidación

La frescura no se arregla sólo al consultar. También debemos decidir qué ocurre cuando cambia la fuente:

```text
source rev A
  ↓ index
chunk e7@A

source changes to rev B
  ↓
e7@A becomes stale
  ↓
reindex / tombstone / version filter / live-read fallback
```

Las opciones dependen del sistema, pero el contrato debe ser observable.

Preguntas mínimas:

- ¿cómo sabemos qué revisión originó cada fragmento?;
- ¿hay borrados o tombstones?;
- ¿una actualización reemplaza atómicamente todos los fragmentos de un documento?;
- ¿qué pasa durante el intervalo entre la actualización de la fuente y el refresco del índice?;
- ¿puede la consulta excluir revisiones obsoletas?;
- ¿cuándo obligamos a consultar la fuente viva?

Sin estas respuestas, `updated_at` puede convertirse en decoración.

## 7. La autoridad no es lo mismo que la relevancia

Supongamos que un agente de soporte pregunta si puede hacer un reembolso.

Recupera:

```text
e1 — foro interno
"Normalmente aceptamos reembolsos hasta 60 días"
puntuación semántica alta

e2 — policy rev A
"Reembolsos hasta 30 días"
muy relevante, pero superseded

e3 — policy rev B
"Reembolsos hasta 14 días"
fuente autoritativa vigente

e4 — order API
purchased_at = 20 días
estado actual del pedido
```

La respuesta correcta no sale de “escoger el fragmento más parecido”.

La política necesita saber que:

- `e3` gobierna la regla actual;
- `e4` gobierna los hechos actuales del pedido;
- `e2` es stale;
- `e1` puede servir como contexto explicativo, pero no autoriza la acción.

Esto generaliza a permisos, facturación, cumplimiento, inventario, feature flags y cualquier dominio donde exista un system of record.

## 8. Los conflictos deben ser objetos explícitos

Dos candidatos contradictorios no deberían desaparecer dentro de un promedio de puntuaciones.

Primero determina si existe realmente un conflicto:

```text
same subject?
same field / proposition?
overlapping validity interval?
same decision scope?
```

Después conserva un **conflict set**:

```text
conflict_id = c17
proposition = refund_window_days
evidence = [e2@revA, e3@revB]
resolution =
  superseded(e2, by=e3)
```

Otro conflicto puede quedar así:

```text
conflict_id = c18
evidence = [e11, e19]
resolution = unresolved
```

`unresolved` es un estado válido.

La salida de la política puede ser:

- admitir la evidencia ganadora y conservar provenance de la decisión;
- mostrar ambas perspectivas si el tiempo o el scope las hace compatibles;
- pedir una lectura fresca;
- abstenerse;
- escalar a revisión humana.

No hay que obligar al modelo a “elegir algo” si el sistema no puede justificar la elección.

## 9. El modelo no debería resolver silenciosamente la autoridad

Podemos darle al modelo instrucciones como “prefiere documentación oficial”, pero eso no sustituye controles de aplicación verificables.

El modelo ve texto. La aplicación conoce —o debe conocer— permisos, tenant, IDs de fuente, revisiones, ACL y contratos.

Una frontera más robusta es:

```text
retrieval layer
  generates candidates

assembly layer
  enforces machine-checkable constraints
  represents unresolved conflicts

model
  reasons over the admitted evidence
  may explain uncertainty
```

El modelo puede ayudar a clasificar o rerankear. La aplicación sigue siendo responsable de no convertir ese juicio en autoridad invisible.

## 10. Qué ofrecen APIs actuales y qué no

OpenAI Vector Store Search permite buscar fragmentos relevantes con filtros por atributos, un número máximo de resultados, opciones de ranking y query rewriting. La respuesta incluye contenido, atributos y una puntuación de similitud.[^openai-vector-search]

Eso es una **capacidad de retrieval gestionado**. La puntuación no certifica frescura ni verdad, y la aplicación sigue teniendo que decidir qué significan los atributos, qué fuente es autoritativa y si una revisión sigue vigente.

Google Agent Search puede devolver `groundingChunks` y `groundingSupports` que relacionan segmentos de la respuesta con fuentes recuperadas; su documentación también indica que grounding metadata puede faltar, por ejemplo cuando la relevancia de fuente es insuficiente.[^google-grounding]

Eso es una **capacidad del servicio de grounding**. No demuestra que toda afirmación sea verdadera ni sustituye una política de resolución de conflictos propia del dominio.

Anthropic Contextual Retrieval demuestra otra frontera: mejorar la recuperación de candidatos mediante contexto de fragmento, búsqueda léxica, embeddings y reranking.[^anthropic-contextual] Tampoco convierte la relevancia de un candidato en autoridad de negocio.

## 11. El grounding empieza después del retrieval

Para este capítulo usamos una definición operativa:

> una afirmación está grounded cuando existe una relación verificable entre esa afirmación y evidencia admitida que realmente la sostiene.

Podemos representarlo como:

\[
g_j:
\quad
\text{claim}_j
\rightarrow
E_j
\subseteq
A_t
\]

donde \(E_j\) son los IDs de evidencia que sostienen la afirmación.

Esto es más fuerte que:

```text
answer has citations
```

porque una cita puede:

- apuntar a una fuente que no contiene la afirmación;
- cubrir sólo parte de una frase;
- referirse a un documento recuperado pero no usado;
- ocultar que existe evidencia contradictoria.

La evidencia académica reciente trata precisamente esta distinción entre generar referencias y comprobar soporte por afirmación; no debemos asumir que “RAG + citas” produce atribución fiel automáticamente.[^reclaim]

## 12. Construye el contexto como un paquete de evidencia

En producción, el modelo debería recibir algo más estructurado que una concatenación de fragmentos:

```text
EVIDENCE PACKET

e7
source = policy
version = rev-B
authority = authoritative
valid_from = 2026-09-01
retrieved_by = lexical + semantic
text = ...

e12
source = order_api
observed_at = 2026-09-11T19:05Z
authority = authoritative-live
text = ...

conflicts = []
```

O, si existe incertidumbre:

```text
conflict c18
e11 contradicts e19
resolution = unresolved
required_behavior = abstain_or_escalate
```

El formato exacto puede ser JSON, objetos internos o texto estructurado. El contrato importante es conservar identidad y metadatos hasta generación y evaluación.

## 13. Ordenar contexto también es una decisión

Después de filtrar y resolver conflictos todavía queda un problema: **qué evidencia entra y en qué orden**.

Con un budget \(B_t\), el assembler puede necesitar:

- deduplicar fragmentos solapados;
- agrupar evidencia sobre la misma proposición;
- conservar el fragmento mínimo que mantiene el soporte;
- incluir la revisión/fecha junto al contenido;
- reservar espacio para evidencia contraria relevante;
- no desplazar una fuente autoritativa por diez fragmentos redundantes de baja autoridad.

El capítulo 3.2 trató compaction y budget. Aquí la diferencia es que el budget se aplica **después de preservar el contrato epistemológico de la evidencia**.

Comprimir cinco fragmentos conflictivos en una frase sin provenance puede ahorrar tokens y destruir precisamente lo que necesitábamos saber.

## 14. Caso completo: una política que cambió hoy

Pregunta:

```text
"¿Puedo reembolsar este pedido?"
```

La generación de candidatos encuentra:

```text
lexical
  e2 policy rev-A

semantic
  e1 forum explanation
  e3 policy rev-B

structured
  e4 order_api live state
```

Ensamblado:

```text
scope / ACL        PASS all
freshness          e2 = STALE
authority          e3 policy > e1 forum
live state         e4 authoritative for order facts
conflict           rev-A vs rev-B resolved by supersession
budget             keep e3 + e4; e1 optional explanation
```

Paquete de evidencia:

```text
A_t = [e3, e4]
```

Generación:

```text
claim c1:
"El límite vigente es 14 días."
grounded_by = [e3]

claim c2:
"Este pedido tiene 20 días."
grounded_by = [e4]

claim c3:
"No es elegible según la política actual."
grounded_by = [e3, e4]
```

Ahora podemos depurar cada capa.

Si `e3` no apareció, es un fallo de retrieval.

Si apareció pero `e2` ganó, es un fallo de ensamblado/frescura.

Si `e3` y `e4` entraron pero el modelo afirmó 30 días, es un fallo de generación/grounding.

Ésa es la razón práctica para no llamar a todo “RAG”.

## 15. Cómo evaluar retrieval, ensamblado y grounding por separado

### Recuperación de candidatos

Mide si la evidencia necesaria aparece en el conjunto de candidatos:

- recall@k sobre IDs de evidencia relevantes;
- cobertura de identificadores exactos;
- recall por tipo de consulta;
- tasa de candidatos bloqueados posteriormente por ACL/scope;
- latencia/coste por retriever.

Un reranker sólo puede reordenar candidatos que recibió. No recupera evidencia que nunca entró en su conjunto de candidatos.

### Ensamblado

Mide la política:

- **stale admission rate**: evidencia stale que llegó al contexto;
- **authority error rate**: una fuente menos autoritativa desplazó a la que gobierna;
- **conflict detection recall**;
- **conflict resolution accuracy**;
- **ACL/scope violation rate**;
- **evidence redundancy** dentro del budget;
- **required-evidence retention** después de dedup/compaction.

### Grounding

Mide generación contra el paquete de evidencia:

- porcentaje de afirmaciones materiales con soporte;
- citation precision: la fuente citada realmente sostiene la afirmación;
- citation completeness: afirmaciones que deberían citar evidencia y no la citan;
- unsupported-claim rate;
- contradiction-with-evidence rate;
- correcto comportamiento de abstención cuando `conflict = unresolved`.

No mezcles estos números en una única métrica hasta saber qué fallo quieres detectar.

## 16. Qué registrar para poder depurar un turno

Una traza útil debería reconstruir:

```text
query / task
retriever configs + versions
candidate IDs + raw ranks/scores
filters / ACL decisions
source versions + freshness checks
conflict groups + resolution reason
final evidence IDs + order
model / prompt / context version
generated claim → evidence links
abstain / escalation decision
```

No hace falta guardar contenido sensible indefinidamente. Se pueden almacenar hashes, IDs o metadatos minimizados según la política de privacidad.

Pero si sólo guardamos la respuesta final, no podremos saber si el sistema:

- nunca recuperó la fuente correcta;
- la descartó por un filtro defectuoso;
- aceptó una revisión stale;
- resolvió mal un conflicto;
- o generó una afirmación sin soporte pese a tener buena evidencia.

## 17. Implicación de producción: maximiza recall al recuperar y filtra con rigor al ensamblar

La arquitectura robusta no pregunta “¿qué base de datos vectorial usamos?” antes de definir el contrato de evidencia.

Pregunta:

```text
CANDIDATES
¿qué retrievers maximizan recall para nuestras consultas?

ELIGIBILITY
¿qué scope, ACL y versiones pueden entrar?

FRESHNESS
¿qué debe validarse live?

AUTHORITY
¿qué fuente gobierna cada decisión?

CONFLICT
¿cómo representamos supersession e incertidumbre?

BUDGET
¿qué evidencia mínima conserva el soporte?

GROUNDING
¿cómo ligamos cada afirmación a IDs de evidencia?

EVALS
¿qué capa falló cuando la respuesta fue incorrecta?
```

Retrieval puede ser gestionado por un proveedor, un motor de búsqueda o código propio. El **contrato de verdad operacional** sigue perteneciendo a la aplicación.

La regla que conecta este capítulo con los anteriores es:

```text
relevance
≠ freshness
≠ authority
≠ permission
≠ grounding
```

Un sistema fiable conserva esas diferencias hasta el final.

## Referencias

[^anthropic-contextual]: Anthropic Engineering — *Introducing Contextual Retrieval* (2024-09-19). https://www.anthropic.com/engineering/contextual-retrieval
[^openai-vector-search]: OpenAI API Reference — *Search vector store*. https://developers.openai.com/api/reference/python/resources/vector_stores/methods/search
[^openai-data-agent]: OpenAI Engineering — *Inside OpenAI’s in-house data agent* (2026-01-29). https://openai.com/index/inside-our-in-house-data-agent/
[^postgres-ranking]: PostgreSQL 17 Documentation — *Controlling Text Search / Ranking Search Results*. https://www.postgresql.org/docs/17/textsearch-controls.html
[^pgvector]: pgvector official repository — vector similarity and hybrid search documentation. https://github.com/pgvector/pgvector
[^elastic-rrf]: Elasticsearch Reference — *Reciprocal rank fusion*. https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion
[^google-grounding]: Google Cloud — *Grounding with Agent Search*, including grounding chunks/supports and response metadata. https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/grounding-with-vertex-ai-search
[^reclaim]: Xia et al. — *Ground Every Sentence: Improving Retrieval-Augmented LLMs with Interleaved Reference-Claim Generation*, Findings of NAACL 2025. https://aclanthology.org/2025.findings-naacl.55/