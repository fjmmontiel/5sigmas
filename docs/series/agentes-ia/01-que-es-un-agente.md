---
title: "Qué es un agente de IA y qué no lo es"
description: "La diferencia entre chatbot, workflow, copiloto y agente. Un agente no es solo un LLM con herramientas: es un sistema que decide acciones dentro de unos límites."
date: 2026-07-14
keywords: "qué es un agente de IA, agentic AI, chatbot vs agente, workflow, tool calling, ReAct"
tags:
  - IA
  - Agentes
  - Tool Calling
video: "01-que-es-un-agente.mp4"
video_duration: "PT60S"
---

# Capítulo 1 — Qué es un agente de IA y qué no lo es

La palabra *agente* se ha convertido en una etiqueta para casi cualquier aplicación que usa un modelo de lenguaje. Un asistente que redacta un correo, un workflow con tres APIs y un sistema que decide pasos dinámicamente pueden aparecer descritos con la misma palabra. Esa ambigüedad es el primer problema que hay que resolver.

En esta serie usaremos una definición operativa: **un [agente de IA](/temas/agentes-ia/) es un sistema que recibe un objetivo, decide qué acciones necesita para acercarse a él, ejecuta esas acciones en un entorno y usa los resultados para decidir el siguiente paso**. El modelo puede ser el componente que propone la acción, pero el agente incluye también el runtime, las herramientas, el estado y las políticas que limitan la ejecución.

{{ include_html("snippets/agentes-ia/01-bucle-agente.html") }}

## Una escala de autonomía

### 1. Respuesta directa

El usuario pregunta y el modelo genera una salida. Puede usar información recuperada por el sistema, pero la secuencia de trabajo está fijada fuera del modelo. Un clasificador de tickets o una función que resume un documento pertenecen normalmente a esta categoría.

### 2. Workflow determinista

El sistema encadena pasos conocidos: recuperar documentos, llamar a un modelo, validar un JSON y guardar el resultado. Puede ser complejo y útil sin ser agente. La ventaja es que el recorrido es visible, testeable y relativamente fácil de limitar.

### 3. Copiloto con aprobación

El modelo propone una acción y una persona decide si se ejecuta. El sistema puede preparar un SQL, una respuesta de soporte o un cambio de código, pero mantiene el último paso bajo control humano.

### 4. Agente acotado

El sistema puede seleccionar entre varias herramientas, reintentar, descomponer una tarea y comprobar resultados. Su autonomía está delimitada por un objetivo, un conjunto de herramientas y una política de permisos. Este es el sentido productivo más útil de la palabra.

### 5. Autonomía abierta

El sistema recibe una meta amplia y puede descubrir nuevos planes, herramientas y subobjetivos durante mucho tiempo. Es la versión más atractiva en una demo y la más difícil de evaluar, proteger y operar. No debe confundirse con el caso normal de producción.

## El modelo no es el agente completo

Un LLM calcula la siguiente acción o respuesta a partir del contexto que recibe. No conserva por sí mismo una base de datos fiable de operaciones, no tiene una autoridad natural sobre una API y no sabe si una acción externa terminó correctamente a menos que el runtime se lo comunique.

El agente aparece cuando alrededor del modelo se construye un contrato:

- **Objetivo:** qué significa completar la tarea.
- **Contexto:** qué información puede leer y durante cuánto tiempo.
- **Herramientas:** qué acciones están disponibles y con qué argumentos.
- **Estado:** qué operaciones están pendientes, terminadas o fallidas.
- **Política:** qué requiere aprobación, qué está prohibido y cuándo hay que parar.
- **Verificación:** cómo se comprueba que el resultado es correcto.

La investigación de ReAct popularizó el patrón de intercalar razonamiento y acción: el sistema piensa qué necesita, actúa y observa el resultado. Toolformer exploró cómo un modelo puede aprender a invocar herramientas cuando una llamada mejora la respuesta. Ninguno de los dos trabajos elimina el problema de ingeniería: decidir qué herramientas existen, qué permisos tienen y cómo se comprueba cada resultado.

## Agencia no significa libertad total

La autonomía útil es local. Un agente puede ser autónomo para escoger entre `buscar_cliente`, `consultar_factura` y `redactar_respuesta`, pero no para concederse nuevos permisos, borrar datos o enviar una comunicación irreversible sin confirmación.

La pregunta correcta no es “¿qué tareas puede hacer el agente?”, sino:

> ¿Qué decisiones delegamos, sobre qué entorno, con qué evidencia y con qué forma de recuperación?

Esta formulación evita dos errores opuestos. El primero es llamar agente a cualquier llamada a una API y perder precisión. El segundo es imaginar que un agente es una persona digital que puede resolver cualquier problema si se le da suficiente contexto.

## Qué deberías recordar

- Un chatbot produce una respuesta; un agente decide y ejecuta una secuencia.
- Un workflow puede ser complejo sin ser agente.
- El LLM es una pieza de decisión, no la totalidad del sistema.
- La autonomía debe expresarse como permisos y límites concretos.
- Si no puedes describir el objetivo, el entorno, las herramientas y la parada, todavía no tienes un contrato de agente.

## Referencias

- [Yao et al. (2022) — ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [Schick et al. (2023) — Toolformer](https://arxiv.org/abs/2302.04761)
- [Anthropic (2026) — Trustworthy agents in practice](https://www.anthropic.com/research/trustworthy-agents)
- [NIST (2026) — AI Agent Standards Initiative](https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative)

## Preguntas frecuentes

**¿Un RAG es un agente?** No necesariamente. Recuperar documentos y pasarlos a un modelo es un workflow. Se convierte en parte de un agente cuando el sistema puede decidir cuándo buscar, qué fuente consultar y qué hacer con el resultado dentro de un objetivo más amplio.

**¿Un agente necesita varios modelos?** No. Puede usar un único modelo con varias herramientas. Los sistemas multiagente son una arquitectura posible, no una condición de la agencia.

**¿Un workflow determinista es peor?** No. Cuando los pasos son conocidos, suele ser preferible porque es más fácil de probar, limitar y explicar. Un agente aporta valor cuando la secuencia depende de la situación y no merece la pena codificar todas las ramas por adelantado.
