---
title: Controles de producción — limitar las acciones cuando el modelo falla
description: "Qué controles limitan el daño cuando un sistema con IA lee contenido externo, usa herramientas y una defensa falla."
date: 2026-08-06
keywords: seguridad producción LLM, mínimo privilegio, dual LLM, guardrails, observabilidad agentes
tags:
  - IA
  - Seguridad
  - Producción
  - Agentes
video: "05-controles-produccion.mp4"
video_duration: "PT1M0S"
---

# Capítulo 5 — Controles de producción

Un sistema seguro limita qué puede ver cada componente, qué acciones requieren
autorización, qué ocurre cuando una defensa falla y cómo se demuestra lo que
pasó. La promesa de que el modelo nunca se equivocará no basta.

La defensa en profundidad no consiste en apilar filtros hasta que el producto
deje de ser útil. Consiste en repartir responsabilidades entre capas que no
compartan exactamente la misma superficie de ataque.

## Separar la lectura de documentos y las acciones

El patrón dual-LLM propone una frontera clara. Un modelo en cuarentena puede leer
contenido no confiable y extraer datos. No tiene acceso directo a herramientas ni
a información sensible. Un modelo privilegiado puede decidir una acción, pero
recibe salidas estructuradas o resúmenes y no el documento hostil completo.

{{ include_html("snippets/seguridad-ia/05-defense-depth.html") }}

La separación no elimina toda inyección. Un resumen puede estar contaminado y un
clasificador puede equivocarse. La ventaja es que la ruta de ataque deja de ser
un salto directo desde cualquier texto hasta una acción privilegiada.

## Dar a cada herramienta solo los permisos que necesita

OWASP describe la agencia excesiva con ejemplos sencillos. Un agente que solo
necesita leer documentos recibe una extensión que también puede subir y borrar
ficheros. Si una entrada hostil convence al modelo de usar la herramienta
incorrecta, el radio de impacto ya estaba definido por el contrato.

Cada herramienta debe declarar nombre, argumentos, permisos, límites, timeout,
resultado y forma de error. El runtime debe validar la llamada y autorizarla
según usuario, recurso y operación. El modelo puede proponer. No debe convertirse
en la autoridad final por el mero hecho de haber generado un JSON válido.

Las acciones destructivas necesitan una frontera adicional. Puede ser aprobación
humana, doble confirmación, modo de previsualización o una operación reversible.
La política exacta depende del producto, pero debe existir antes de integrar la
tool call.

## Clasificar el texto mientras se genera

Constitutional Classifiers presenta clasificadores de entrada y salida que
pueden evaluar la secuencia mientras se genera. Si aparece contenido peligroso,
el sistema puede cortar la generación sin esperar al final.

Eso mejora tiempo de respuesta y experiencia, pero no sustituye el resto de la
arquitectura. Un guardrail sigue siendo un modelo o un componente que necesita
evaluación. También añade coste, latencia y una nueva señal que monitorizar.

Los clasificadores son más útiles cuando el control que ejercen está conectado
con el riesgo. Una conversación de bajo impacto puede usar una comprobación
barata. Una tool call sensible puede exigir una capa especializada, validación
determinista y aprobación humana.

## Registrar lo que ocurre para poder detenerlo

La telemetría de seguridad debe seguir la ruta de decisión. Conviene conservar
identidad de la petición, fuente recuperada, decisión de política, herramienta
propuesta, autorización, resultado y motivo de aborto sin registrar secretos o
contenido personal innecesario.

La señal no es solo un log. Cambios bruscos en la tasa de aprobaciones, en los
motivos de rechazo, en el uso de una herramienta o en los reintentos pueden
indicar un bypass o una regresión. Sin una línea base, el equipo se entera del
problema cuando ya está mirando el incidente.

## El diseño que queda

Una arquitectura razonable para un flujo con contenido externo y acciones
sensibles puede seguir esta secuencia:

1. ingestión etiquetada como no confiable
2. lectura en cuarentena
3. salida estructurada y validada
4. decisión con scopes limitados
5. autorización independiente
6. herramienta reversible cuando sea posible
7. aborto, auditoría y recuperación

La secuencia no pretende ser una receta universal. Sirve para hacer visible
dónde se separa el dato de la acción y dónde puede detenerse el sistema.

La serie termina con una regla poco espectacular y muy útil. Cuanto más poder
le das a un sistema que interpreta lenguaje, menos puedes depender de que el
lenguaje se interprete como esperas. El control real vive en los límites del
runtime, los permisos, la observabilidad y la capacidad de recuperar.

## Referencias

- OWASP, *LLM Prompt Injection Prevention Cheat Sheet*.
- OWASP, *Excessive Agency*.
- Anthropic, *Constitutional Classifiers*.
- NIST, *AI Risk Management Framework*.
