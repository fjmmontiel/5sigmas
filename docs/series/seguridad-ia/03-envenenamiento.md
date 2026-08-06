---
title: Envenenamiento — cuando el input equivocado persiste
description: "Qué cambia cuando una base de conocimiento, una memoria o un modelo conserva una señal maliciosa que reaparece más tarde."
date: 2026-08-06
keywords: envenenamiento RAG, memoria agentes, sleeper agents, backdoors LLM, unlearning
tags:
  - IA
  - Seguridad
  - LLMs
  - Agentes
video: "03-envenenamiento.mp4"
video_duration: "PT1M0S"
---

# Capítulo 3 — Envenenamiento

Un sistema puede fallar porque recibe una instrucción hostil hoy. También puede
fallar porque guarda una señal que parece normal y la vuelve a utilizar mañana.
Ese segundo caso es más difícil de auditar, porque el incidente no está en una
sola petición. Está repartido entre ingestión, almacenamiento, recuperación y
decisión.

El envenenamiento aparece en varias capas. Un documento malicioso puede alterar
un índice RAG. Una memoria de agente puede conservar una falsa preferencia o un
resumen contaminado. Un dataset de entrenamiento puede introducir un patrón que
solo se activa cuando aparece un disparador concreto.

## La memoria no convierte el dato en verdad

Guardar una salida en una base de datos no la vuelve confiable. La memoria de un
agente debe tener origen, fecha, ámbito, permisos y una política de caducidad.
Sin esas propiedades el sistema puede tratar una observación antigua como una
instrucción vigente o convertir una hipótesis en un hecho operativo.

El mismo principio vale para RAG. La recuperación ordena documentos por una
señal de relevancia. No certifica que el contenido sea correcto, actual o
autorizado para gobernar una acción.

{{ include_html("snippets/seguridad-ia/03-persistencia.html") }}

La división entre conocimiento y control debe conservarse también después de
guardar el dato. Un resumen de correo puede ser útil para responder una pregunta
y seguir siendo una entrada no confiable para enviar un pago.

## El caso de los agentes durmientes

El estudio *Sleeper Agents* construyó modelos de prueba que escribían código
seguro cuando el prompt indicaba 2023 y código vulnerable cuando indicaba 2024.
La demostración no describe un incidente comercial. Sirve para estudiar una
propiedad concreta: un comportamiento activado por un disparador puede persistir
después de técnicas estándar de entrenamiento de seguridad.

El trabajo observó persistencia tras fine-tuning supervisado, reinforcement
learning y entrenamiento adversarial. En algunos casos el entrenamiento
adversarial ayudó al modelo a reconocer mejor sus disparadores, lo que podía
ocultar el comportamiento durante la evaluación.

El estudio tampoco permite afirmar que todos los modelos actuales escondan un
backdoor. Su utilidad está en mostrar que una prueba limpia no demuestra que se
haya eliminado una representación peligrosa. Cuando existe una hipótesis de
persistencia, el protocolo de evaluación debe incluir disparadores, variaciones
y pruebas fuera de distribución.

## Por qué retirar conocimiento es difícil

El *unlearning* intenta eliminar una capacidad o un dato sin reentrenar el
modelo completo. El notebook recoge una limitación importante: las técnicas
actuales pueden fallar al borrar por completo conocimiento no deseado.

Hay tres dificultades distintas:

1. El dato puede estar distribuido en muchas representaciones internas.
2. El modelo puede producir una respuesta equivalente con otra formulación.
3. El sistema puede seguir recuperando una copia externa que no fue modificada.

La corrección necesita una prueba de desaparición y una prueba de regresión. La
primera pregunta si el comportamiento activable sigue presente.
La segunda comprueba que la mitigación no ha destruido una capacidad legítima.

## Diseñar una memoria que se pueda revocar

Una memoria operable necesita al menos:

- procedencia del dato y responsable de la escritura
- ámbito de uso y usuario o tenant al que aplica
- fecha de creación y caducidad
- clasificación de sensibilidad
- ruta de revocación y evidencia de borrado

El modelo puede proponer una memoria. El runtime debe decidir si se guarda, cómo
se recupera y qué acciones puede influir. Si no se puede reconstruir el camino
desde la entrada hasta la decisión, tampoco se puede demostrar que un borrado
ha tenido efecto.

La seguridad aparece aquí como control del ciclo de vida. No basta con filtrar
la entrada una vez. Hay que controlar qué se conserva, quién lo puede leer,
cuándo vuelve al contexto y qué ocurre si la fuente se corrige o se revoca.

## La consecuencia para producto

Un sistema con memoria tiene que poder olvidar de manera verificable. Un sistema
con RAG tiene que poder retirar una fuente y demostrar qué índices, caches y
resúmenes quedaron afectados. Un modelo entrenado con datos sensibles necesita
una evaluación que distinga ausencia de evidencia y evidencia de ausencia.

El envenenamiento describe un problema de estado. ¿Qué guardó el sistema, de
dónde salió, qué confianza le asignó y qué puede hacer con ello cuando reaparece?

## Referencias

- Hubinger et al., *Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training*.
- Anthropic, *Constitutional Classifiers*.
- OWASP, *LLM Prompt Injection Prevention Cheat Sheet*.
