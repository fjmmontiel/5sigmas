---
title: Red-teaming — medir antes del incidente
description: "Cómo evaluar capacidades peligrosas y fallos de seguridad en la cadena completa de un sistema con LLM."
date: 2026-08-06
keywords: red teaming IA, evaluación de seguridad, uplift humano, ART, benchmarks LLM
tags:
  - IA
  - Seguridad
  - Evaluación
  - LLMs
video: "04-red-teaming.mp4"
video_duration: "PT1M0S"
---

# Capítulo 4 — Red-teaming

Una prueba de seguridad puede ser rigurosa y aun así responder a la pregunta
equivocada. Si el sistema real recupera documentos, usa herramientas, conserva
memoria y permite varios intentos, evaluar solo un prompt aislado deja fuera la
cadena donde el daño podría ocurrir.

El red-teaming sirve para encontrar esos caminos antes de que los encuentre un
incidente. Su valor depende de que la amenaza, el entorno, el presupuesto y la
rúbrica se parezcan al uso que se quiere proteger.

## Capacidad, uplift y daño

Una evaluación debería separar al menos tres niveles:

- qué sabe hacer el modelo
- cuánto mejora a una persona que intenta completar una tarea
- qué puede ejecutar el producto con sus herramientas y permisos

La primera pregunta pertenece a la capacidad del modelo. La segunda mide
*uplift* humano. La tercera es una propiedad del sistema completo.

{{ include_html("snippets/seguridad-ia/04-uplift.html") }}

Un resultado alto en una rúbrica no prueba por sí solo que una persona haya
obtenido una capacidad nueva. La evaluación debe revisar si el contenido era
accionable, si la persona tenía los recursos necesarios y si el resultado se
podía reproducir bajo condiciones realistas.

## Helpful-only para ver el techo de capacidad

El AI Safety Index recoge como buena práctica evaluar también modelos
*helpful-only*, sin las mitigaciones de seguridad del producto. El objetivo no
es desplegarlos. Es medir la capacidad base para no confundir un filtro con una
ausencia de capacidad.

La comparación debe declarar qué versión se prueba, qué safeguards están
activos, qué herramientas existen y quién revisa los resultados. Una cifra de
un modelo capado no se puede comparar sin más con una cifra de un modelo sin
guardrails.

## Red-teaming automático

Constitutional Classifiers describe un pipeline de red-teaming automático que
genera ataques largos y de varios turnos. Un modelo de ataque propone una
estructura, la rellena con variantes y usa los resultados para producir nuevos
intentos.

La automatización aumenta la cobertura, pero también introduce un riesgo de
métrica. Si el grader premia palabras concretas o respuestas extensas, el
atacante puede aprender a jugar con la rúbrica sin encontrar una ruta útil.

El propio estudio señala casos donde reformular términos dañinos o generar
respuestas muy largas elevaba la puntuación sin aportar instrucciones realmente
accionables. El red-team debe revisar ejemplos y medir utilidad para la amenaza
real, no solo la puntuación agregada.

## La cadena real tiene estados

Una evaluación de un agente necesita registrar:

1. la entrada y su procedencia
2. lo que el sistema recuperó
3. la decisión del modelo
4. la tool call propuesta
5. la autorización aplicada
6. el resultado de la herramienta
7. el estado final y la posibilidad de recuperación

Cada punto permite una prueba distinta. Un filtro puede bloquear una salida y
dejar intacto el retrieval. Un policy engine puede denegar la herramienta y
seguir registrando una memoria peligrosa. Un runtime puede abortar a tiempo y
dejar un estado parcial que necesita reconciliación.

El benchmark end-to-end no tiene que ser enorme. Tiene que ser representativo.
Una tarea pequeña con una cuenta de prueba, un documento contaminado y una
acción reversible puede revelar más que miles de prompts sin herramientas.

## Evitar el benchmark de escaparate

Una buena prueba incluye variaciones de redacción, documentos adversarios,
timeouts, errores de herramienta, reintentos y permisos reducidos. También debe
decir qué no ha probado.

La seguridad no mejora porque el informe tenga una cifra con dos decimales. Mejora
cuando el equipo puede señalar la ruta exacta que falló, repetirla en un entorno
aislado y comprobar que una defensa nueva cambia el resultado sin romper el caso
legítimo.

Ese es el papel del red-teaming en esta serie. Convertir un miedo abstracto en
una cadena observable con un criterio de parada y una evidencia que el equipo
pueda discutir.

## Referencias

- Future of Life Institute, *AI Safety Index*.
- Anthropic, *Constitutional Classifiers*.
- NIST AI Risk Management Framework.
