---
title: "Define un piloto de IA que puedas evaluar"
seo_title: "Piloto de IA: plantilla para evaluar valor, coste y riesgos"
description: "Una ficha práctica para definir un caso de uso de IA en el trabajo, comparar con el proceso actual y decidir si continuar según resultados, coste y límites."
date: 2026-11-11
keywords: piloto de IA, evaluar proyecto IA, caso de uso inteligencia artificial, plantilla piloto IA, coste IA, evaluación IA
---

# Define un piloto de IA que puedas evaluar

Antes de elegir un modelo, concreta una tarea que tu equipo necesita resolver. Esta ficha gratuita reúne lo que tendrás que comprobar para decidir si merece la pena continuar: resultado, revisión humana, coste y límites de actuación.

**Para quién:** profesionales que aplican IA en operaciones, producto o trabajo de conocimiento. Puedes empezar sin saber programar. Las herramientas enlazadas permiten profundizar en los supuestos técnicos.

[Ir a la plantilla para copiar](#plantilla) · [Ver un ejemplo](#ejemplo)

## 1. Elige una tarea y una comparación

Describe una unidad de trabajo con entrada y salida reconocibles. «Preparar un borrador de respuesta a una solicitud usando la documentación aprobada» se puede probar. «Mejorar la productividad con IA» todavía necesita concretarse.

Anota cómo se resuelve hoy: tiempo de trabajo y revisión, errores observados y volumen real. Conserva la misma definición de tarea cuando compares el piloto con ese proceso. Incluye la revisión y las correcciones del resultado de IA en la comparación.

## 2. Escribe qué aceptarías y qué impediría continuar

| Decisión | Qué dejar por escrito |
|---|---|
| Resultado útil | Qué debe contener la salida y quién puede comprobarla. |
| Evidencia | De qué documentos o datos puede partir y cómo revisar las afirmaciones. |
| Límites | Qué datos puede consultar, qué acciones puede realizar y cuáles requieren confirmación. |
| Fallos críticos | Qué resultados o acciones obligan a detener o rediseñar la prueba. |
| Presupuesto | Cuánto trabajo humano, tiempo de respuesta y gasto admite la tarea. |

Prepara ejemplos representativos y casos difíciles antes de probar. Incluye qué debe hacer el sistema cuando falta información o falla una herramienta. Un resultado correcto obtenido con una acción no autorizada debe contar como fallo. La [guía de evaluación de agentes](series/agentes-ia/03-como-evaluar-un-agente.md) explica por qué conviene revisar también el recorrido de herramientas y permisos.

## 3. Contrasta los supuestos con las herramientas

- **Coste y tiempo de respuesta:** usa la [calculadora de coste y latencia](herramientas/coste-latencia-llm.md) con tu volumen y longitud de entrada/salida. Conserva los supuestos. El coste de modelo es solo una parte: añade integración, operación y revisión humana a tu estimación del piloto.
- **Fiabilidad:** explora [evaluación de agentes](herramientas/fiabilidad-evaluacion-agentes.md) si la tarea encadena pasos o herramientas. Sus escenarios ilustran relaciones, no certifican tu sistema.
- **Datos y acciones:** recorre el [modelo de amenazas de prompt injection](herramientas/amenazas-prompt-injection.md) si el sistema lee contenido externo. Las instrucciones del prompt no sustituyen los controles de permisos del sistema.

Un cálculo orienta el diseño. La decisión necesita resultados de tu tarea, con tus datos permitidos y tus condiciones de uso.

## Plantilla

Copia la ficha con el botón del bloque y rellénala en tu propio documento. No hace falta introducir datos de trabajo en esta página.

```text
FICHA DEL PILOTO DE IA

Responsable y fecha de revisión:
Tarea concreta, usuario y resultado esperado:
Entrada permitida y salida que se revisará:

PROCESO ACTUAL
Tiempo de trabajo y revisión por tarea:
Volumen y errores observados:

PRUEBA
Ejemplos representativos y casos difíciles:
Criterio de aceptación y persona que lo verifica:
Datos, herramientas y acciones autorizados:
Confirmaciones humanas y fallos críticos:
Respuesta esperada ante datos insuficientes o error:

RESULTADOS Y DECISIÓN
Resultados observados, errores y evidencia:
Tiempo, revisión/corrección humana y coste total:
Supuestos pendientes de comprobar:
Decisión: continuar / rediseñar / detener
Motivo, responsable y siguiente revisión:
```

## Ejemplo

**Caso hipotético: borradores de respuestas a solicitudes internas.** El piloto consulta una colección aprobada de procedimientos y propone una respuesta con sus referencias. Una persona revisa cada borrador antes de enviarlo. El sistema no envía mensajes ni modifica registros.

La prueba comprueba que las respuestas correspondan a los documentos, que las referencias sostengan lo afirmado y que el sistema señale cuándo falta información. Una instrucción maliciosa dentro de un documento debe formar parte de los casos difíciles. Se registran el tiempo total, las correcciones y los errores para compararlos con el proceso actual. No se presupone ningún ahorro antes de medirlo.

## Decide con lo que has observado

**Continuar** cuando la evidencia satisface los criterios acordados. **Rediseñar** cuando una limitación concreta puede corregirse y volver a probarse. **Detener** cuando el valor observado no justifica el coste o quedan fallos críticos sin resolver. Define esos criterios antes del piloto y conserva los resultados que sostienen la decisión.

Para ampliar la ficha: [qué evaluar en un sistema de IA](series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria.md), [evaluación de agentes](series/agentes-ia/03-como-evaluar-un-agente.md) y [permisos fuera del prompt](series/agentes-ia/04-seguridad-agentes.md).

¿Qué te falta para aplicar esta ficha en tu equipo? Puedes compartir una duda o una sugerencia mediante el [contacto de 5sigmas](meta/about.md). Evita incluir datos confidenciales.
