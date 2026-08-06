---
title: Jailbreaks — cómo se fuerza un límite aprendido
description: "Cómo los jailbreaks automáticos fuerzan los límites de un modelo y por qué un filtro no equivale a una frontera de seguridad."
date: 2026-08-06
keywords: jailbreaks, seguridad LLM, GCG, adversarial suffixes, Best-of-N
tags:
  - IA
  - Seguridad
  - LLMs
video: "02-jailbreaks.mp4"
video_duration: "PT1M0S"
---

# Capítulo 2 — Jailbreaks

Un modelo puede rechazar una petición peligrosa y seguir siendo vulnerable a
un ataque que cambie la forma de la pregunta. La diferencia importa porque un
jailbreak no intenta convencer al sistema de que la petición es buena. Intenta
encontrar una entrada que haga que el modelo produzca una continuación que sus
controles deberían haber bloqueado.

En los primeros casos bastaba con una ocurrencia humana. Un personaje, una
historia o una reformulación conseguían que el modelo abandonara una restricción
en una conversación concreta. El salto técnico llega cuando esa búsqueda se
automatiza y el atacante puede probar miles de variantes con una métrica clara.

## Una negativa no crea una frontera lógica

Los modelos generativos no ejecutan una política de seguridad como un parser
que devuelve siempre el mismo error. Generan tokens condicionados por el
contexto. El entrenamiento de seguridad cambia la distribución de respuestas,
pero no añade una barrera formal que vuelva imposibles todas las continuaciones
indeseadas.

Eso explica por qué la temperatura cero no resuelve el problema. Si la entrada
adversaria ya ha llevado al modelo a una región no deseada de su distribución,
decodificar de forma determinista solo hace más repetible el resultado.

{{ include_html("snippets/seguridad-ia/02-superficie-jailbreak.html") }}

Para evaluar un sistema hay que observar qué ocurre cuando una persona
persistente puede variar la entrada, observar la salida y volver a intentarlo.

## La búsqueda automática cambia el coste

El trabajo sobre ataques universales y transferibles popularizó una idea
importante. Un sufijo adversario puede optimizarse para aumentar la probabilidad
de que el modelo empiece con una respuesta afirmativa y después transferirse a
otras consultas y modelos.

El método GCG trata los tokens como variables discretas y busca sustituciones
que mejoren el objetivo. No necesita que el atacante entienda cada detalle del
modelo. Necesita una función de evaluación, capacidad de probar variantes y
una ruta para observar el resultado.

La transferencia no significa que exista una llave maestra universal para todos
los modelos. Significa que una defensa evaluada en una sola formulación puede
estar midiendo una superficie demasiado estrecha. El atacante optimiza sobre la
familia de entradas y el sistema debería evaluar sobre esa misma familia.

OWASP resume otra parte del problema con la curva de Best-of-N. Con suficientes
intentos, las variaciones de una petición pueden elevar mucho la probabilidad de
encontrar una salida no deseada. El porcentaje depende del modelo, del objetivo,
del presupuesto y de la evaluación concreta. No debe trasladarse como una
garantía universal a cualquier producto.

## Lo que sí puede hacer una defensa

Rate limiting y circuit breakers siguen siendo útiles. Reducen la velocidad del
ataque, elevan su coste y permiten activar una revisión. El error es vender esa
fricción como una solución completa.

Un filtro de entrada puede bloquear patrones conocidos. Un clasificador de
salida puede detectar contenido peligroso mientras se genera. Un límite de
intentos puede cortar la búsqueda. Ninguna de esas capas decide por sí sola si
el sistema está autorizado a realizar una acción externa.

La defensa gana fuerza cuando el control de salida se conecta con el control de
acción. Una respuesta bloqueada no debe dejar abierta una tool call equivalente.
Un agente que alcanza el límite de intentos debe quedar en un estado conocido y
auditable. Un flujo de alto riesgo necesita una aprobación humana o una política
determinista que no dependa de la redacción del modelo.

## Medir el bypass correcto

Un benchmark de jailbreak puede contar una respuesta como éxito cuando contiene
palabras de una rúbrica, aunque no permita realizar la acción que preocupa. El
trabajo de Constitutional Classifiers muestra por qué el red-teaming debe revisar
la utilidad real del ataque y no solo la coincidencia textual.

La evaluación mínima debería separar tres resultados:

- el modelo cruzó el filtro
- el modelo produjo una capacidad operativa
- el sistema pudo ejecutar una acción dañina

Cada salto necesita una prueba distinta. Confundirlos produce dos errores
opuestos. Puede parecer que el modelo está roto cuando solo generó texto
irrelevante, o puede parecer seguro porque el filtro bloqueó la respuesta pero
el runtime dejó disponible el mismo efecto por otra ruta.

La conclusión de este capítulo es incómoda pero práctica. La alineación reduce
la frecuencia de respuestas peligrosas. La seguridad del producto depende además
de presupuesto de intentos, clasificación, autorización y capacidad de parar.

## Referencias

- Zou et al., *Universal and Transferable Adversarial Attacks on Aligned Language Models*.
- OWASP, *LLM Prompt Injection Prevention Cheat Sheet*.
- Anthropic, *Constitutional Classifiers*.
