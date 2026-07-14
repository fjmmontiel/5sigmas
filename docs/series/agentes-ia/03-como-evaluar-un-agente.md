---
title: "Cómo evaluar un agente de IA"
description: "Evaluar un agente exige medir la tarea completa, las trazas, las herramientas, el coste y la recuperación ante fallos. Una respuesta convincente no basta."
date: 2026-07-14
keywords: "evaluación agentes IA, agent evals, benchmarks agentes, trazas, LLM as judge, éxito de tarea, observabilidad"
tags:
  - IA
  - Agentes
  - Evaluación
  - Observabilidad
video: "03-como-evaluar-un-agente.mp4"
video_duration: "PT58S"
---

# Capítulo 3 — Cómo evaluar un agente de IA

Un chatbot se puede evaluar comparando una respuesta con una referencia. Un agente puede producir una respuesta final correcta después de usar una herramienta equivocada, gastar diez veces más pasos de los necesarios o dejar cambios irreversibles en el sistema. Por eso la evaluación tiene que mirar la tarea completa.

{{ include_html("snippets/agentes-ia/03-evaluacion.html") }}

## La unidad de evaluación es una tarea

Una tarea útil debe especificar:

- estado inicial del entorno;
- objetivo del usuario;
- herramientas permitidas;
- datos accesibles;
- condición de éxito;
- acciones prohibidas;
- presupuesto de pasos, tiempo o coste;
- resultado esperado y casos de abstención.

“Responde bien sobre facturas” es demasiado vago. “Dado un cliente y un intervalo de fechas, localiza facturas vencidas, calcula el total y prepara un borrador sin enviarlo” ya permite construir casos reproducibles y separar lectura, cálculo y escritura.

## Cuatro dimensiones que conviene medir

### 1. Resultado

¿La tarea terminó correctamente? Es la dimensión más visible, pero no la única. Debe admitir resultados parciales y distinguir “no se pudo completar” de “se completó con datos insuficientes”.

### 2. Trayectoria

¿Qué pasos tomó el agente? ¿Usó la herramienta adecuada? ¿repitió llamadas? ¿consultó información irrelevante? La trayectoria permite detectar que una puntuación alta se consigue por casualidad o con un coste que no escala.

### 3. Seguridad y cumplimiento

¿Accedió solo a los recursos autorizados? ¿intentó ejecutar una acción prohibida? ¿pidió aprobación cuando correspondía? Una tarea correcta pero conseguida saltándose una política no es un éxito de producción.

### 4. Economía operativa

¿Cuánto tardó? ¿cuántos tokens, llamadas y reintentos consumió? ¿qué ocurre en el percentil 95? La media puede ocultar agentes que funcionan bien en el caso simple y se vuelven caros cuando una tool falla.

## Benchmarks, casos propios y jueces

Los benchmarks públicos sirven para comparar capacidades, pero no sustituyen a los casos propios. El dominio, los permisos, los datos y las consecuencias de un error cambian la definición de éxito.

Un LLM-as-judge puede ayudar a evaluar textos abiertos, pero introduce otra fuente de variabilidad. Conviene combinarlo con verificadores deterministas cuando exista una condición objetiva: una suma, un JSON válido, una prueba ejecutable, una referencia documental o un cambio concreto en una base de datos.

NIST está investigando *evaluation probes*: verificadores integrados en el flujo que comprueban resultados y trazabilidad. El proyecto sigue en curso; no es todavía un estándar industrial cerrado. Es una dirección importante porque desplaza la evaluación desde una foto final hacia el comportamiento del sistema mientras trabaja.

## El agente también puede “hacer trampa”

Cuando el agente tiene acceso a herramientas, la evaluación deja de ser un entorno pasivo. Puede buscar pistas que no debería usar, modificar el estado de la tarea para que el verificador la considere resuelta o explotar affordances no previstas del benchmark. NIST ha documentado este problema y recomienda especificar con claridad las capacidades permitidas y revisar las trazas.

La consecuencia práctica es sencilla: una evaluación debe registrar al menos:

```text
task_id → objetivo → herramientas → argumentos → resultados → estado → veredicto
```

Si solo guardas la respuesta final, no tienes una evaluación reproducible del agente; tienes una colección de demos.

## Diseño de un gate de confianza

Antes de desplegar, una tarea debería pasar varios gates:

1. **Correctitud:** el resultado cumple el criterio.
2. **Trazabilidad:** la evidencia y las herramientas usadas son visibles.
3. **Permisos:** no hubo acciones fuera de alcance.
4. **Coste:** el presupuesto está dentro del límite.
5. **Recuperación:** ante fallo, reintenta de forma segura o se detiene.
6. **Abstención:** si faltan datos o autorización, no improvisa.

Este enfoque cambia la pregunta de “¿qué porcentaje acierta?” a “¿en qué condiciones puedo confiar en que complete esta tarea?”.

## Qué deberías recordar

- La evaluación de un agente empieza por una tarea reproducible, no por una frase bonita.
- Hay que medir resultado, trayectoria, seguridad y economía.
- Los benchmarks públicos son útiles, pero el entorno propio decide el riesgo real.
- Los jueces automáticos necesitan verificadores y revisión de trazas.
- Un agente que llega al resultado violando permisos no ha tenido éxito.

## Referencias

- [NIST — Building Evaluation Probes into Agentic AI](https://www.nist.gov/programs-projects/building-evaluation-probes-agentic-ai) — investigación en curso
- [NIST — Cheating On AI Agent Evaluations](https://www.nist.gov/caisi/cheating-ai-agent-evaluations)
- [NIST — Guidelines for automated benchmark evaluations](https://www.nist.gov/caisi/guidelines)
- [Stanford HAI — AI Index 2026](https://hai.stanford.edu/ai-index/2026-ai-index-report)
