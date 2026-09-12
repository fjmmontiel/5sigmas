---
title: "Context engineering vs prompt engineering: qué entra al modelo, cuándo y por qué"
description: "Prompt engineering optimiza instrucciones. Context engineering decide qué información, tools, historial, retrieval, observaciones y memoria llegan realmente al modelo en cada inferencia, con qué prioridad y bajo qué límites."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "context engineering, prompt engineering, context window, agents, retrieval, memory, tool context"
tags:
  - IA
  - Agentes
  - Context engineering
  - Arquitectura
  - LLMs
---

# Capítulo 1 — Context engineering vs prompt engineering: qué entra al modelo, cuándo y por qué

Un agente puede tener acceso a un repositorio, veinte tools, una base documental, memoria persistente y dos horas de historial. El modelo **no ve automáticamente ninguna de esas cosas**.

En cada inferencia ve una representación concreta y acotada: instrucciones, mensajes, definiciones de tools, datos recuperados, observaciones y cualquier otro contenido que el runtime haya decidido incluir. Todo lo demás puede existir en la aplicación y seguir siendo invisible para el modelo.

Esa distinción separa dos problemas relacionados, pero no equivalentes:

- **Prompt engineering** trabaja principalmente sobre cómo expresar y estructurar instrucciones, ejemplos y entradas para orientar la respuesta.
- **Context engineering** trabaja sobre el sistema que decide **qué información entra en la inferencia, en qué momento, en qué forma, con qué prioridad, procedencia, frescura y coste**, y qué información queda fuera.

Anthropic formula la diferencia de manera explícita: prompt engineering se ocupa de escribir y organizar instrucciones, mientras context engineering abarca la curación y mantenimiento del conjunto de información que llega al modelo, incluyendo system instructions, tools, datos externos e historial.[^anthropic-context]

La idea importante no es sustituir un término de moda por otro. Es cambiar la unidad de diseño: de «¿cómo redacto mejor este prompt?» a **«¿qué estado necesita observar el modelo para tomar bien la siguiente decisión?»**.

{{ include_html("snippets/articulos-tecnicos/context-engineering-assembly-loop.html") }}

## Primero: qué significa aquí «contexto»

La palabra *contexto* se usa de demasiadas formas. En este capítulo la reservaremos para la **entrada efectiva disponible para una inferencia concreta**.

Podemos representar el turno `t` así:

\[
C_t = A(I, U_t, H_t, T_t, R_t, O_t, M_t \mid P_t, B_t)
\]

\[
y_t \sim p_\theta(\cdot \mid C_t)
\]

donde:

- `I`: instrucciones estables o semiestables del sistema/aplicación.
- `U_t`: petición o input actual del usuario.
- `H_t`: historial conversacional o su representación compactada.
- `T_t`: tools, schemas, skills o capacidades expuestas en ese turno.
- `R_t`: información recuperada desde documentos, bases de datos, web, repositorios u otras fuentes.
- `O_t`: observaciones producidas por acciones anteriores: tool results, errores, diffs, stdout, respuestas de APIs.
- `M_t`: memoria o estado persistente recuperado para el turno.
- `P_t`: política de selección, prioridad, trust, permisos y composición.
- `B_t`: restricciones prácticas: ventana de contexto, latencia, coste y límites de producto.
- `A(·)`: el proceso de ensamblado.
- `C_t`: el contexto que realmente llega al modelo.
- `y_t`: la salida del modelo para ese contexto.

No todos los proveedores serializan estas piezas igual, y en sistemas multimodales parte de la entrada puede transformarse en representaciones específicas del modelo en lugar de texto literal. La fórmula no pretende describir un wire format universal. Describe una frontera de sistema: **la aplicación posee mucha información; el modelo condiciona su salida sobre la entrada que el runtime ensambló para esta inferencia**.

OpenAI documenta esa misma separación en Responses API: antes de inferir, el servicio ensambla contexto con el prompt del usuario, estado conversacional previo e instrucciones de tools; si una skill es relevante, su metadata y su ubicación se incorporan al contexto antes de volver a llamar al modelo.[^openai-responses-environment]

## Prompt engineering es una parte del problema

Prompt engineering sigue siendo importante. Una instrucción ambigua, contradictoria o excesivamente prescriptiva puede empeorar el comportamiento aunque todo lo demás esté bien.

Pero imaginemos este sistema:

```text
system:
  "Responde usando la política vigente de devoluciones. Cita la fuente."

user:
  "¿Puedo devolver un portátil abierto después de 20 días?"
```

Podemos dedicar horas a mejorar la redacción. Si el runtime recupera una política de 2024 cuando la política cambió ayer, el problema no es principalmente de prompting.

Lo mismo ocurre si:

- se recupera el documento correcto pero se trunca justo antes de la excepción relevante;
- el agente dispone de 80 tools solapadas y carga todas sus definiciones en cada turno;
- el historial conserva una decisión ya invalidada por una tool posterior;
- una memoria antigua contradice la fuente actual y no existe regla de precedencia;
- un resultado de tool de 15.000 líneas desplaza del contexto la restricción que debía gobernar el siguiente paso;
- el sistema tiene acceso a la información correcta, pero nunca la recupera.

Ninguno de esos fallos se arregla necesariamente escribiendo una frase mejor.

Por eso conviene pensar en una relación de inclusión:

```text
prompt engineering
    ⊂
context engineering
```

No porque todo prompt engineering sea trivial, sino porque las instrucciones y ejemplos son **sólo algunas de las fuentes** que pueden formar `C_t`.

## El contexto es un snapshot, no el estado completo de la aplicación

Esta distinción evita un error especialmente peligroso en agentes: confundir «el sistema sabe X» con «el modelo puede usar X ahora».

Supongamos que una aplicación mantiene:

```text
Repositorio:       420.000 líneas
Documentación:     3.200 páginas
Historial:         900 mensajes
Memoria durable:   18.000 registros
Tools disponibles: 64
Estado runtime:    procesos, archivos, DB, APIs externas
```

Eso es el **universo de información potencial**. No es el contexto de inferencia.

Para una tarea concreta, el runtime podría ensamblar:

```text
- instrucciones de seguridad y de tarea
- mensaje actual
- resumen de 12 turnos anteriores
- 4 tool schemas
- 3 archivos relevantes
- diff actual
- último resultado de tests
- 2 memorias verificadas
```

El segundo conjunto es mucho más pequeño, pero puede ser mucho más útil.

Anthropic resume el objetivo como buscar el conjunto mínimo de tokens de alta señal que aumente la probabilidad del comportamiento deseado, y trata el contexto como un recurso finito.[^anthropic-context] Esto no significa «menos tokens siempre es mejor». Significa que **capacidad de ventana y utilidad de la información no son la misma variable**.

El trabajo clásico *Lost in the Middle* mostró precisamente que, en los modelos y tareas evaluados, aumentar contexto y cambiar la posición de la información relevante podía degradar de forma importante la recuperación.[^lost-in-the-middle] Modelos posteriores han mejorado mucho en long context, por lo que no debemos convertir ese resultado de 2023 en una constante universal para cualquier modelo de 2026. La lección que sí sobrevive es metodológica: **tener capacidad para aceptar más contexto no demuestra que añadir contexto irrelevante sea gratis ni que toda posición/contenido se use con la misma eficacia**.

## Qué decide realmente un context assembler

Un context assembler no tiene por qué ser un componente con ese nombre. Puede estar repartido entre el SDK, el harness, el backend de retrieval y varias funciones de aplicación. Conceptualmente, sin embargo, debe resolver cinco decisiones.

### 1. Elegibilidad: qué podría entrar

Primero define el conjunto candidato.

Ejemplos:

- instrucciones globales y específicas de la tarea;
- historial de conversación;
- archivos o símbolos del repositorio;
- tool definitions;
- resultados de tools;
- documentos recuperables;
- memoria de usuario o de tarea;
- estado de workflow;
- metadata de tiempo, identidad, tenant o permisos.

Que una fuente sea elegible no significa que deba incluirse siempre.

El agente de datos interno de OpenAI ilustra esta separación con varias capas: uso y metadata de tablas, anotaciones humanas, enriquecimiento desde código, conocimiento institucional, memoria y contexto de runtime. En tiempo de consulta recupera sólo contexto relevante en lugar de escanear toda la información disponible.[^openai-data-agent]

### 2. Selección: qué es relevante ahora

La siguiente pregunta es temporal: **¿qué necesita este turno?**

Para responder una pregunta factual sobre una factura quizá sólo hacen falta el documento, la política aplicable y la identidad del cliente. Para modificar un repositorio quizá hacen falta instrucciones del repo, definición del símbolo, consumidores, tests y diff actual.

La relevancia puede determinarse mediante:

- reglas deterministas;
- búsqueda lexical;
- embeddings;
- queries estructuradas;
- navegación agentic con tools;
- un modelo selector;
- una combinación de esos mecanismos.

No existe un selector universalmente mejor. El diseño depende de si el corpus es estático o dinámico, de la latencia admisible, de la precisión requerida y del coste de omitir información.

### 3. Autoridad y frescura: qué fuente gana si hay conflicto

Context engineering no es sólo retrieval.

Si una memoria dice:

```text
"El límite es 30 días"
```

y la política vigente dice:

```text
"Desde 2026-09-01 el límite es 14 días"
```

recuperar ambas sin procedencia ni precedencia crea un problema nuevo.

El assembler necesita conservar suficiente metadata para distinguir al menos:

- quién produjo el dato;
- cuándo;
- para qué scope;
- si es una observación directa o un resumen;
- qué fuente es normativa;
- si la información puede haber quedado stale.

Los capítulos 3.2–3.4 profundizarán en budget, provenance, memoria, freshness y conflictos. Aquí basta fijar la idea: **seleccionar información sin conservar su autoridad puede producir un contexto internamente incoherente**.

### 4. Compresión y representación: cuánto detalle conservar

No todo tiene que viajar en formato raw.

Un historial de 200 turnos puede convertirse en:

- los últimos turnos completos;
- un resumen de decisiones durables;
- referencias a artefactos externos;
- observaciones recientes sin tool output redundante.

Un documento de 500 páginas puede entrar como:

- páginas concretas;
- chunks recuperados;
- una tabla estructurada;
- un resumen con referencias a la fuente.

Cada transformación compra tokens, latencia o foco a cambio de riesgo de pérdida. Una compactación agresiva puede borrar una excepción crítica; mantener cada byte raw puede desplazar señales más importantes.

OpenAI acaba de documentar, en Agents API, compaction automática para sesiones largas y tool search para cargar definiciones relevantes cuando se necesitan, precisamente como mecanismos distintos de gestión de contexto.[^openai-agents-api] Son capacidades concretas de ese harness, no propiedades intrínsecas del modelo ni requisitos de toda arquitectura.

### 5. Orden y ensamblado: cómo cruza la frontera de inferencia

Dos contextos con la misma información no tienen por qué ser operacionalmente equivalentes si cambian estructura, orden, duplicación o instrucciones contradictorias.

El assembler debe decidir, según el API concreto:

- qué instrucciones preceden a cuáles;
- dónde aparecen ejemplos y evidencia;
- cómo se representan tool schemas;
- qué historial permanece verbatim;
- qué resultados se eliminan o resumen;
- cómo se delimitan datos no confiables frente a instrucciones;
- cómo se conserva una estructura estable cuando importa prompt caching.

Aquí vuelve a aparecer prompt engineering: **la formulación y organización interna de las instrucciones sigue importando**, pero ya dentro de una política más amplia de ensamblado.

## Cuándo entra cada tipo de contexto

El error más común es imaginar `C` como una bolsa estática. En un agente, `C_t` cambia con el tiempo.

### Antes del primer turno

Suelen entrar las piezas que definen el contrato inicial:

```text
instrucciones
+ input del usuario
+ capabilities/tools iniciales
+ contexto recuperado antes de inferir
```

Para una tarea muy conocida, preload puede reducir latencia. Para un espacio de información enorme, cargar todo por anticipado puede desperdiciar contexto.

### Durante el loop

Una tool call produce observaciones nuevas:

```text
C₀ → modelo → tool call
               ↓
         observación O₀
               ↓
A(..., O₀) → C₁ → modelo
```

`O₀` no existía cuando se construyó `C₀`. El feedback loop crea un problema temporal: qué resultados deben persistir, cuáles pueden resumirse y cuáles invalidan una creencia anterior.

Este punto conecta directamente con la serie anterior de agent harnesses. El harness posee la continuidad causal; context engineering decide **qué parte de esa continuidad vuelve a entrar al modelo**.

### Al acercarse al límite o al crecer la tarea

El sistema puede:

- compactar historial;
- persistir notas fuera de la ventana;
- recuperar memoria por demanda;
- descargar trabajo a subagentes con contextos aislados;
- eliminar tool outputs ya consumidos;
- preservar referencias en lugar del contenido completo.

Anthropic documenta compaction, structured note-taking y subagents como técnicas distintas para tareas que exceden una sola ventana.[^anthropic-context] No son intercambiables: cada una conserva y pierde información de forma diferente.

## Preload vs just-in-time: una decisión arquitectónica, no una religión

Hay dos extremos fáciles de entender.

### Preload

Cargar por adelantado información que probablemente será necesaria.

Ventajas:

- menor número de round trips de retrieval;
- disponibilidad inmediata;
- comportamiento más simple de reproducir si el paquete está versionado.

Costes:

- contexto más grande;
- más información potencialmente irrelevante;
- mayor riesgo de staleness si el preload envejece;
- mayor coste de entrada si no hay caching efectivo.

### Just-in-time

Mantener referencias y recuperar detalles cuando la tarea los requiere.

Ventajas:

- mejor control del budget;
- datos más frescos;
- el agente puede refinar la búsqueda según observaciones intermedias.

Costes:

- más latencia y tool calls;
- nuevos failure modes de búsqueda;
- el agente puede no saber qué debe buscar;
- reproducibilidad más difícil si la fuente externa cambia.

Anthropic describe precisamente una estrategia híbrida en Claude Code: cierta información entra inicialmente, mientras tools como glob/grep permiten descubrir contexto bajo demanda.[^anthropic-context]

La decisión correcta depende del coste relativo de **cargar de más** frente a **no recuperar algo crítico**.

## Un ejemplo: el mismo prompt, dos contextos diferentes

Supongamos el prompt:

```text
"Revisa este cambio y dime si podemos desplegarlo."
```

### Contexto A

```text
- diff de 40 líneas
- descripción del PR
```

El modelo puede revisar sintaxis, lógica local y estilo visible.

### Contexto B

```text
- diff de 40 líneas
- descripción del PR
- contrato de la API afectada
- tests focalizados y su output
- configuración de despliegue
- incidente previo relacionado
- versión actualmente en producción
- policy que exige rollback plan para este servicio
```

El prompt es idéntico. La tarea efectiva no lo es.

Si B obtiene una respuesta mejor, no hemos demostrado que «más contexto siempre mejora». Hemos mostrado que **la información seleccionada cambia el problema observable por el modelo**.

Y B también podría ser peor si el incidente está obsoleto, los tests pertenecen a otro SHA o la policy corresponde a otro servicio. Context engineering debe gestionar **relevancia + identidad + frescura**, no volumen bruto.

## Qué NO es context engineering

### No es «meter más tokens»

Una ventana de contexto grande es capacidad. La ingeniería decide cómo usarla.

Google, por ejemplo, expone límites de input/output por modelo y mecanismos de context caching para reutilizar prefijos.[^gemini-tokens][^gemini-cache] Eso afecta restricciones y economía de la entrada; no decide por sí mismo qué información es correcta para una tarea.

### No es sinónimo de RAG

RAG es una familia de mecanismos para recuperar información y añadirla a una inferencia. Puede ser una parte del assembler.

Context engineering incluye además historial, instructions, tools, observaciones, memoria, compaction, trust/provenance y lifecycle.

### No es memoria

Memoria responde a otra pregunta: **qué información persiste fuera de una inferencia y puede volver a recuperarse después**.

Context engineering decide si una memoria concreta entra ahora, cómo se valida y qué prioridad tiene frente a fuentes más actuales. El capítulo 3.3 separará working, episodic, semantic y persistent state.

### No es sólo una función del modelo

Un modelo con una ventana más grande puede ampliar opciones de diseño, pero selection, retrieval, tool exposure, compaction, provenance y state lifecycle suelen vivir en el runtime o la aplicación.

Por eso hay que distinguir:

```text
model capability
≠
provider/API context management
≠
application/harness context policy
```

Confundir esas capas lleva a atribuir al modelo garantías que realmente pertenecen al sistema alrededor.

## Cómo evaluar un sistema de context engineering

No basta con mirar una respuesta buena.

Una evaluación útil debería versionar al menos:

```text
(task,
 candidate sources,
 source versions,
 assembly policy,
 retrieved items,
 final context identity,
 model/config,
 output)
```

Y medir fallos distintos:

- **omission**: faltó evidencia necesaria;
- **pollution**: entró información irrelevante que degradó la decisión;
- **staleness**: se incluyó una versión antigua;
- **conflict**: coexistieron fuentes incompatibles sin precedencia;
- **over-compression**: se perdió una restricción al resumir;
- **tool-context bloat**: schemas/capabilities consumieron demasiado budget;
- **history drift**: el historial conservó una hipótesis ya invalidada;
- **provenance loss**: el modelo recibió un hecho sin saber de dónde venía o para qué scope era válido.

Esto cambia la pregunta de evaluación. En vez de:

> «¿El modelo sabe la respuesta?»

preguntamos:

> **«¿El sistema ensambló la evidencia correcta para que el modelo pudiera decidir, y podemos reconstruir por qué esa evidencia estaba allí?»**

## Implicación de producción: el contexto es una interfaz versionada

En producción, context engineering debería tratarse como código y datos de sistema, no como magia alrededor del prompt.

Eso implica registrar o poder reconstruir:

- qué fuentes estaban disponibles;
- cuáles se seleccionaron;
- su versión/frescura;
- qué transformaciones se aplicaron;
- qué tools se expusieron;
- qué policy ensambló el contexto;
- qué modelo/config lo consumió.

No hace falta persistir información sensible indiscriminadamente. La observabilidad debe respetar privacidad y seguridad. Pero sin alguna identidad reproducible del contexto, un fallo se convierte en:

```text
"el agente ayer funcionó y hoy no"
```

Con trazabilidad puede convertirse en:

```text
candidate source changed
→ retrieval selected a stale chunk
→ stale chunk entered Cₜ
→ verifier did not detect conflict
→ output changed
```

Esa segunda descripción ya es un problema de ingeniería.

## Qué deberías recordar

- El modelo no observa automáticamente todo el estado de la aplicación; responde al contexto efectivo de cada inferencia.
- Prompt engineering optimiza principalmente instrucciones, ejemplos y su estructura. Context engineering es el problema más amplio de selección, ensamblado y lifecycle de toda la información que puede entrar al modelo.
- `C_t` cambia durante un loop: tool results, retrieval y memoria pueden modificar el siguiente turno sin haber existido en el anterior.
- Más capacidad de ventana no implica que más contexto sea siempre mejor; relevancia, frescura, autoridad y representación importan.
- RAG, memoria, compaction, tool search y prompt design son mecanismos dentro del problema, no sinónimos de context engineering.
- Preload y just-in-time intercambian latencia, coste, frescura, complejidad y riesgo de omisión.
- En producción, el ensamblado de contexto debe poder evaluarse y, hasta donde seguridad y privacidad permitan, reconstruirse.

Los capítulos siguientes desarrollarán esas piezas por separado: budget/priorización/provenance, arquitecturas de memoria, retrieval y conflictos, MCP y finalmente skills/plugins/subagents/hooks y evaluación.

## Referencias

[^anthropic-context]: Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), 29 de septiembre de 2025. Distingue prompt engineering de context engineering y documenta system prompts, tools, examples, just-in-time retrieval, compaction, structured note-taking y subagents como componentes del problema de contexto.
[^openai-responses-environment]: OpenAI, [From model to agent: Equipping the Responses API with a computer environment](https://openai.com/index/equip-responses-api-computer-environment/), 11 de marzo de 2026. Describe el ensamblado de user prompt, estado conversacional y tool instructions, y cómo skill metadata puede añadirse al contexto antes de una nueva inferencia.
[^openai-data-agent]: OpenAI, [Inside OpenAI’s in-house data agent](https://openai.com/index/inside-our-in-house-data-agent/), 29 de enero de 2026. Separa capas de metadata/uso, anotaciones, código, conocimiento institucional, memoria y runtime context, con retrieval selectivo en tiempo de consulta.
[^openai-agents-api]: OpenAI, [Introducing the Agents API](https://openai.com/index/introducing-the-agents-api/), 10 de septiembre de 2026. Documenta compaction, tool search y context management como capacidades del Codex harness servido por Agents API; estas capacidades se citan como implementación concreta, no como propiedades universales de los modelos.
[^lost-in-the-middle]: Nelson F. Liu et al., [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172), TACL 2023 / arXiv:2307.03172. Evalúa multi-document QA y key-value retrieval variando longitud y posición de la evidencia, y encuentra degradación importante en varios modelos de la época cuando la información relevante aparece en posiciones intermedias.
[^gemini-tokens]: Google AI for Developers, [Understand and count tokens](https://ai.google.dev/gemini-api/docs/generate-content/tokens). Documenta que los modelos Gemini exponen límites de input/output medidos en tokens y que esos límites forman la ventana de contexto disponible para la API.
[^gemini-cache]: Google AI for Developers, [Context caching](https://ai.google.dev/gemini-api/docs/caching), actualizado el 2 de septiembre de 2026. Documenta implicit/explicit context caching y el efecto de mantener prefijos comunes para reutilizar input; caching reduce trabajo/coste de entradas repetidas, pero no selecciona su relevancia semántica.