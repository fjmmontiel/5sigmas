---
title: "De la demo a producción: cómo operar un agente"
description: "Qué hace falta para llevar un agente de IA a producción: presupuestos, retries, idempotencia, observabilidad, trabajo asíncrono, fallbacks y criterios para no usar agentes."
date: 2026-07-14
keywords: "agentes en producción, observabilidad agentes, retries, idempotencia, background tasks, costes agentes, fallbacks, runtime conversacional"
tags:
  - IA
  - Agentes
  - Producción
  - Arquitectura
video: "05-de-la-demo-a-produccion.mp4"
video_duration: "PT59S"
---

# Capítulo 5 — De la demo a un sistema operable

Una demo puede parecer autónoma durante dos minutos. Producción empieza cuando una herramienta tarda, devuelve un `429`, cambia el esquema, pierde la conexión o termina después de que el usuario haya seguido hablando. La pregunta deja de ser si el modelo sabe llamar a una función y pasa a ser si el sistema puede mantener un contrato honesto bajo fallos.

## Presupuestos antes que promesas

Un agente debería tener límites explícitos:

- máximo de pasos;
- máximo de llamadas por herramienta;
- tiempo total de ejecución;
- tokens o coste estimado;
- tamaño máximo de contexto;
- número de reintentos;
- acciones que requieren aprobación.

Sin presupuesto, una tarea ambigua puede producir un bucle caro. El límite no es un detalle de optimización: define el comportamiento de parada. Cuando se alcanza, el agente debe resumir el estado, pedir información, derivar a una persona o devolver un fallo claro.

## Retries, idempotencia y fallos terminales

No todos los errores se recuperan igual. Un timeout puede ser reintentable; un argumento inválido no. Un `429` requiere backoff y respeto a la cuota; una respuesta de negocio negativa puede necesitar una explicación al usuario.

Los reintentos también pueden duplicar acciones. Si una petición de pago llega al servidor pero la respuesta se pierde, repetirla sin una clave de idempotencia puede crear dos operaciones. El agente no puede resolver esto con lenguaje: la API y el runtime necesitan una identidad estable para cada intención.

Cuando se agotan los retries, la operación debe terminar en un estado visible: error terminal, revisión manual o cola de mensajes fallidos. Dejarla “pendiente” sin dueño es peor que fallar de forma explícita.

## Trabajo asíncrono y cierres honestos

El runtime local Reactive/Proactive Agent de 5sigmas modela un caso frecuente: el agente acepta una gestión, la tool trabaja fuera del turno visible y el resultado vuelve cuando el lote termina. La conversación puede seguir, pero el sistema no dice que la operación está completada antes de tiempo.

El patrón tiene tres reglas:

1. aceptar trabajo no equivale a prometer resultado;
2. el cierre solo sale cuando el lote puede cerrarse;
3. si el usuario sigue hablando, el resultado pendiente vuelve como contexto controlado o como notificación única.

Esta separación evita mensajes duplicados y evita convertir el historial visible en una base de datos de retries, locks y respuestas HTTP.

## Observabilidad útil

Los logs deben permitir reconstruir una tarea sin guardar secretos ni datos innecesarios. Como mínimo conviene registrar:

```text
task_id · session_id · tool · attempt · policy_decision · latency · outcome · delivery_mode
```

Las trazas no son solo para depurar. Sirven para evaluar el agente, explicar una decisión, detectar una herramienta inestable y comparar coste con éxito. Un dashboard de “respuestas buenas” no muestra por qué la tarea funcionó ni si el sistema está degradándose.

## Cuándo no usar un agente

Un agente no es la evolución natural de cualquier automatización. No conviene usarlo cuando:

- el recorrido es conocido y determinista;
- la acción es irreversible y no existe una verificación suficiente;
- los datos son demasiado sensibles para el entorno disponible;
- la latencia o el coste no admiten variabilidad;
- el criterio de éxito no puede expresarse ni revisarse;
- una función convencional resuelve el problema con menos superficie de riesgo.

En esos casos, un workflow determinista, un formulario o una función normal suelen ser mejores. El agente debe reservarse para la parte donde la incertidumbre de la secuencia compensa el coste adicional de delegar decisiones.

## Checklist de salida

Antes de desplegar un agente, pregunta:

- ¿Cuál es el objetivo exacto y cuál es el estado de éxito?
- ¿Qué herramientas puede usar y con qué permisos?
- ¿Qué ocurre cuando una herramienta tarda o falla?
- ¿Cómo se evita repetir una acción irreversible?
- ¿Qué traza queda para reconstruir la tarea?
- ¿Cuándo pide aprobación o se abstiene?
- ¿Qué alternativa determinista usaríamos si el agente no es fiable?

La respuesta a estas preguntas es más importante que elegir el framework de moda. Los frameworks cambian; el contrato operativo permanece.

## Qué deberías recordar

- Producción es manejar estados, fallos y consecuencias, no solo generar una demo.
- Todo agente necesita presupuestos, retries clasificados e idempotencia.
- Las tareas asíncronas requieren un cierre honesto y único.
- La observabilidad debe cubrir decisiones y herramientas, no solo texto final.
- A veces la mejor arquitectura es no usar un agente.

## Referencias

- [Reactive / Proactive Agent — runtime local de 5sigmas](https://5sigmas.com/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/)
- [NIST — Agent identity and authorization](https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd)
- [NIST — AI Agent Standards Initiative](https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative)
- [Anthropic — Trustworthy agents in practice](https://www.anthropic.com/research/trustworthy-agents)
- [OpenAI Agents SDK — tracing and tools](https://openai.github.io/openai-agents-python/)
