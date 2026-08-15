---
title: "Qué es un agente de IA"
seo_title: "Qué es un agente de IA: cómo funciona y en qué se diferencia de un chatbot"
description: "Qué es un agente de IA, cómo usa herramientas, memoria y estado, en qué se diferencia de un chatbot o workflow y qué necesita para funcionar de forma fiable."
keywords: "agente de IA, agentes IA, AI agents, agentic AI, chatbot vs agente, tool calling, memoria agentes, agentes en producción"
date: 2026-08-09
date_modified: 2026-08-15
---

# Qué es un agente de IA

Un **agente de IA** es un sistema que recibe un objetivo, decide qué acciones necesita para acercarse a él, puede ejecutar esas acciones mediante herramientas y usa los resultados para decidir el siguiente paso. El modelo de lenguaje puede proponer la acción, pero el agente completo incluye también el runtime, las tools, el estado, los permisos y la lógica que decide cuándo detenerse.

La diferencia esencial es esta: **un chatbot genera una respuesta; un agente puede cambiar el estado de otro sistema**.

## La respuesta en 60 segundos

{{ include_html("snippets/agentes-ia/01-bucle-agente.html") }}

Una tool call no concede autoridad por sí misma. Que el modelo genere `send_email(...)` no significa que el sistema deba ejecutarlo. El runtime debe validar argumentos, permisos, riesgo y estado antes de producir un efecto externo.

## Chatbot, workflow, copiloto y agente

| Sistema | Quién decide los pasos | Puede actuar | Ejemplo |
|---|---|---:|---|
| **Chatbot** | Flujo conversacional | Normalmente no | Responder una pregunta |
| **Workflow** | Código determinista | Sí | Recuperar datos → validar → guardar |
| **Copiloto** | Modelo propone; humano aprueba | Con aprobación | Preparar SQL o un cambio de código |
| **Agente acotado** | Modelo decide entre acciones permitidas | Sí, dentro de límites | Consultar, comparar, reintentar y actualizar un registro |

Un workflow no es peor por ser determinista. Si los pasos ya se conocen, suele ser más fácil de probar, explicar y limitar. La agencia aporta valor cuando la secuencia depende del entorno y no merece la pena codificar todas las ramas por adelantado.

## Las piezas de un agente

Un agente fiable necesita más que un prompt y varias funciones:

1. **Objetivo** — qué significa terminar correctamente.
2. **Contexto** — qué información puede usar en el turno actual.
3. **Herramientas** — qué acciones existen y con qué contratos.
4. **Estado** — qué operaciones están pendientes, ejecutadas o fallidas.
5. **Memoria** — qué información puede persistir entre sesiones y con qué procedencia.
6. **Política** — qué requiere autorización, qué está prohibido y qué presupuesto existe.
7. **Verificación** — cómo se demuestra que el resultado es correcto.

{{ include_html("snippets/temas/agent-system-boundary.html") }}

La serie [Agentes de IA — de responder a actuar](/series/agentes-ia/00_presentacion_serie/) desarrolla estas piezas con vídeos, visuales y cinco capítulos progresivos.

## Tool calling no es lo mismo que agencia

Un LLM puede producir argumentos estructurados para una función. Eso es **tool calling**. La agencia aparece cuando el sistema puede decidir *cuándo* usar una herramienta, interpretar el resultado y escoger qué hacer después.

La tool debe seguir siendo un contrato de software. El modelo propone una llamada; el runtime mantiene la frontera de autoridad y decide si puede ejecutarse.

{{ include_html("snippets/temas/agent-tool-gate.html") }}

## Memoria, contexto y estado no son lo mismo

- **Contexto:** información que el modelo ve ahora.
- **Memoria:** información que se conserva y puede recuperarse después.
- **Estado operativo:** qué está ocurriendo realmente en una tarea: intentos, locks, operaciones pendientes y resultados.

Mezclar las tres capas produce fallos difíciles de depurar. Una conversación puede decir que una acción fue solicitada mientras el runtime sabe que todavía está ejecutándose. El estado operativo debe ser la fuente de verdad sobre lo que realmente ocurrió.

## Cómo se evalúa un agente

Una respuesta final convincente no basta. Hay que medir la **tarea completa**:

- ¿alcanzó el objetivo?
- ¿usó las herramientas correctas?
- ¿respetó los permisos?
- ¿cuántos pasos, tokens y reintentos necesitó?
- ¿qué hizo cuando una tool falló?
- ¿supo abstenerse cuando faltaban datos o autorización?
- ¿dejó el sistema en un estado recuperable?

[Cómo evaluar un agente de IA](/series/agentes-ia/03-como-evaluar-un-agente/) desarrolla una arquitectura de gates para resultado, trayectoria, seguridad y economía operativa.

## Por qué la seguridad cambia cuando el sistema puede actuar

Un chatbot que interpreta mal un documento puede producir una respuesta incorrecta. Un agente con permisos amplios puede convertir la misma interpretación en una acción.

Por eso la seguridad debe vivir también fuera del prompt: mínimo privilegio, autorización por operación, aislamiento, aprobación humana para acciones sensibles, observabilidad y una ruta externa para detener ejecuciones.

La serie [Seguridad en IA](/series/seguridad-ia/00_presentacion_serie/) cubre prompt injection, jailbreaks, memoria contaminada, red-teaming y controles de producción.

## Cuándo tiene sentido usar un agente

Tiene sentido cuando:

- el objetivo está claro pero la secuencia cambia según lo que ocurra;
- existen varias herramientas posibles;
- los resultados intermedios determinan el siguiente paso;
- el sistema puede verificar progreso y resultado;
- los permisos y el coste pueden acotarse.

Puede ser mejor un workflow convencional cuando el recorrido es conocido, el margen de error es mínimo o una función determinista resuelve el problema con menos superficie de riesgo.

## Dónde profundizar en 5sigmas

- [Qué es un agente y qué no lo es](/series/agentes-ia/01-que-es-un-agente/)
- [Anatomía de un agente: tools, memoria y estado](/series/agentes-ia/02-anatomia-de-un-agente/)
- [Cómo evaluar un agente](/series/agentes-ia/03-como-evaluar-un-agente/)
- [Seguridad de agentes](/series/agentes-ia/04-seguridad-agentes/)
- [De la demo a producción](/series/agentes-ia/05-de-la-demo-a-produccion/)
- [Agente reactivo, proactivo y tool calls](/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/)

## Preguntas frecuentes

### ¿ChatGPT es un agente de IA?

Depende de la capacidad concreta que se esté usando. Un chat que solo genera texto funciona como asistente conversacional. Un sistema que puede elegir herramientas, operar sobre recursos externos y continuar a partir de sus resultados incorpora comportamiento agéntico. La etiqueta debe describir el sistema real, no solo el modelo que utiliza.

### ¿Un RAG es un agente?

No necesariamente. Recuperar documentos y enviarlos a un modelo puede ser un workflow determinista. Se vuelve parte de un agente cuando el sistema puede decidir cuándo buscar, qué fuente consultar y qué hacer después con el resultado.

### ¿Un agente necesita varios modelos?

No. Un único modelo puede coordinar varias tools. Los sistemas multiagente son una arquitectura posible, no una condición necesaria.

### ¿Más autonomía significa un agente mejor?

No. En producción suele importar más que la autonomía esté acotada: herramientas mínimas, presupuestos, verificación y un criterio claro de parada.

## Fuentes primarias

- [Yao et al. — ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [OpenAI Agents SDK — Agents](https://openai.github.io/openai-agents-python/agents/)
- [OpenAI Agents SDK — Tool guardrails](https://openai.github.io/openai-agents-python/guardrails/)
- [Model Context Protocol — Authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization)
