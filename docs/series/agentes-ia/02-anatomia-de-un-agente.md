---
title: "La anatomía de un agente: tools, memoria y estado"
description: "Cómo funciona por dentro un agente de IA: contexto, planificación, herramientas, memoria, estado y runtime. La tool call es un contrato, no magia."
date: 2026-07-14
keywords: "anatomía agente IA, tools, tool calling, memoria agentes, estado runtime, MCP, ReAct"
tags:
  - IA
  - Agentes
  - Arquitectura
  - Tool Calling
video: "02-anatomia-de-un-agente.mp4"
video_duration: "PT60S"
---

# Capítulo 2 — La anatomía de un agente

En el capítulo anterior vimos que un agente es un sistema que decide una secuencia de acciones dentro de un entorno. Ahora podemos abrirlo y separar sus piezas. Esta separación es importante porque muchos fallos que se atribuyen al modelo nacen en realidad de un runtime ambiguo, una tool mal definida o un estado que se ha mezclado con la conversación.

## El bucle mínimo

El patrón más sencillo tiene cuatro pasos:

1. **Observar:** recibir el objetivo, el contexto y el estado actual.
2. **Planear:** elegir si responder, pedir datos, llamar a una herramienta o terminar.
3. **Actuar:** ejecutar la llamada con argumentos validados.
4. **Verificar:** interpretar el resultado y decidir si la tarea terminó o hay que continuar.

En la práctica hay una quinta pieza transversal: **la política**. La política decide qué herramientas están disponibles, qué acciones requieren confirmación, cuántos pasos se permiten y qué hacer cuando la información no es suficiente.

{{ include_html("snippets/agentes-ia/01-bucle-agente.html") }}

## Tool calling: del texto a un contrato

Una herramienta no debería presentarse al modelo como una frase vaga del tipo “puedes consultar el sistema”. Necesita un contrato explícito:

- nombre estable;
- descripción de cuándo usarla y cuándo no;
- esquema de argumentos;
- validación de tipos y rangos;
- permisos de lectura o escritura;
- timeout y política de reintentos;
- forma de describir éxito, error y resultado parcial.

Si una herramienta `send_email` acepta un destinatario ambiguo, el modelo puede completar el argumento con una inferencia plausible. El problema no es solo que el LLM se equivoque: el sistema ha diseñado una frontera demasiado peligrosa. Una buena tool hace que los estados ilegales sean difíciles de expresar.

El protocolo Model Context Protocol formaliza una parte de este problema para conectar clientes de agentes con servidores de herramientas. Su especificación de autorización distingue, entre otras cosas, una llamada en nombre de una persona y una llamada entre aplicaciones. Esa diferencia es fundamental: “el agente puede consultar el inventario” no significa automáticamente “el agente puede comprar”. La referencia de esta serie usa la especificación vigente, no una instantánea histórica del protocolo.

## Contexto, memoria y estado no son lo mismo

### Contexto de ventana

Es la información que el modelo recibe en el turno actual: instrucciones, mensajes, resultados de tools, documentos y señales del runtime. Tiene un límite de tamaño y debe tratarse como una vista de trabajo, no como una base de datos.

### Memoria

Es información que se conserva entre turnos o sesiones: preferencias, hechos confirmados, resúmenes o representaciones vectoriales. La memoria no es fiable por defecto; necesita reglas de escritura, caducidad, corrección y borrado.

### Estado operativo

Describe lo que el sistema está haciendo: operaciones en vuelo, retries, resultados pendientes, locks, identificadores de idempotencia y eventos. Este estado pertenece al runtime. No debería volcarse sin filtrar en el historial visible porque puede confundir al usuario y al modelo.

La distinción se vuelve crítica cuando una tool tarda. El usuario puede continuar la conversación mientras una operación externa sigue viva. Si el runtime trata todo como un mensaje, el modelo no sabe si una operación fue solicitada, aceptada, ejecutada o realmente completada.

## El agente como máquina de estados

Una petición típica puede pasar por estos estados:

`requested → accepted → running → succeeded`

o bien:

`requested → accepted → running → retrying → failed`

El lenguaje que recibe el usuario debe respetar esa máquina. “He puesto en marcha la gestión” describe `accepted`; “la gestión ha terminado” solo es correcto en `succeeded`. La honestidad no depende de que el modelo sea prudente: depende de que el runtime le dé estados que pueda expresar sin inventar.

El repositorio Reactive/Proactive Agent de 5sigmas usa precisamente esta separación: conversación visible, operaciones, actualizaciones pendientes, locks y trazas viven en estructuras distintas. El patrón resuelve un problema pequeño pero recurrente: cómo aceptar trabajo ahora y cerrar cuando el resultado externo exista, sin bloquear el chat ni enviar mensajes parciales.

## Memoria no es una solución a todo

Añadir una base vectorial no convierte un sistema en agente. La recuperación puede ayudar a encontrar documentación, pero todavía hay que decidir:

- qué consulta hacer;
- qué documentos son confiables;
- cómo citar la evidencia;
- qué ocurre si hay resultados contradictorios;
- cuándo la búsqueda no ha encontrado suficiente información.

La memoria también puede ampliar la superficie de ataque. Si un agente escribe en memoria una instrucción maliciosa que luego se recupera como contexto confiable, el problema no desaparece: se ha convertido en persistente.

## Qué deberías recordar

- El bucle es una arquitectura de decisión, no una animación de marketing.
- Las tools son contratos de software con permisos, validación y estados.
- Contexto, memoria y estado operativo deben mantenerse separados.
- La tarea puede seguir viva después del turno visible.
- MCP ayuda a estandarizar conexiones, pero no decide por sí solo qué autorización es segura.

## Referencias

- [Yao et al. (2022) — ReAct](https://arxiv.org/abs/2210.03629)
- [Schick et al. (2023) — Toolformer](https://arxiv.org/abs/2302.04761)
- [Model Context Protocol — Authorization, versión vigente](https://modelcontextprotocol.io/specification/latest/basic/authorization)
- [Reactive / Proactive Agent — artículo técnico](https://5sigmas.com/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/)
- [OpenAI Agents SDK — documentación](https://openai.github.io/openai-agents-python/)
