---
title: Jailbreaks — cuando un modelo puede ser llevado a responder mal
description: "Cómo un atacante prueba muchas formas de pedir lo mismo y qué controles siguen siendo necesarios después de una negativa."
date: 2026-08-06
keywords: jailbreaks, seguridad LLM, GCG, adversarial suffixes, Best-of-N, attack budget
tags:
  - IA
  - Seguridad
  - LLMs
video: "02-jailbreaks.mp4"
video_duration: "PT1M0S"
---

# Capítulo 2 — Jailbreaks

Un modelo puede rechazar una petición peligrosa y seguir siendo vulnerable a un ataque que cambie la forma de la pregunta. La diferencia importa porque un jailbreak no intenta convencer al sistema de que la petición es buena. Intenta encontrar una entrada que haga que el modelo produzca una continuación que sus controles deberían haber bloqueado.

En los primeros casos bastaba con una ocurrencia humana. Un personaje, una historia o una reformulación conseguían que el modelo abandonara una restricción en una conversación concreta. El salto técnico llega cuando esa búsqueda se automatiza y el atacante puede probar miles de variantes con una métrica clara.

## Rechazar una petición no crea una frontera perfecta

Los modelos generativos no ejecutan una política de seguridad como un parser que devuelve siempre el mismo error. Generan tokens condicionados por el contexto. El entrenamiento de seguridad cambia la distribución de respuestas, pero no añade una barrera formal que vuelva imposibles todas las continuaciones indeseadas.

Eso explica por qué la temperatura cero no resuelve el problema. Si la entrada adversaria ya ha llevado al modelo a una región no deseada de su distribución, decodificar de forma determinista solo hace más repetible el resultado.

{{ include_html("snippets/seguridad-ia/02-superficie-jailbreak.html") }}

Para evaluar un sistema hay que observar qué ocurre cuando una persona persistente puede variar la entrada, observar la salida y volver a intentarlo.

## Probar muchas variantes cambia el coste del ataque

El trabajo sobre ataques universales y transferibles popularizó una idea importante. Un sufijo adversario puede optimizarse para aumentar la probabilidad de que el modelo empiece con una respuesta afirmativa y después transferirse a otras consultas y modelos.

El método GCG trata los tokens como variables discretas y busca sustituciones que mejoren el objetivo. No necesita que el atacante entienda cada detalle del modelo. Necesita una función de evaluación, capacidad de probar variantes y una ruta para observar el resultado ([Zou et al., 2023](https://arxiv.org/abs/2307.15043)).

La transferencia no significa que exista una llave maestra universal para todos los modelos. Significa que una defensa evaluada en una sola formulación puede estar midiendo una superficie demasiado estrecha. El atacante optimiza sobre la familia de entradas y el sistema debería evaluar sobre esa misma familia.

OWASP resume otra parte del problema con ataques Best-of-N: si el atacante puede generar muchas variaciones, el riesgo deja de depender únicamente de la probabilidad de éxito de un intento. El porcentaje concreto depende del modelo, del objetivo, del presupuesto y de la evaluación; no debe trasladarse como una garantía universal a cualquier producto ([OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)).

## El threat model necesita un presupuesto de ataque

Decir que un modelo «resiste jailbreaks» sin declarar cuántos intentos tuvo el atacante es una afirmación incompleta.

Una evaluación debería fijar explícitamente:

- número máximo de intentos;
- si el atacante observa las respuestas anteriores;
- si puede adaptar el siguiente prompt;
- si tiene acceso a logits, scores o únicamente texto;
- si puede cambiar idioma, codificación o formato;
- si el sistema aplica rate limiting o bloqueo por identidad;
- si el ataque es contra una conversación aislada o un agente con tools.

El mismo modelo puede mostrar un perfil muy distinto bajo `N=1` y bajo un atacante adaptativo con cientos o miles de consultas. El presupuesto forma parte de la especificación de seguridad, igual que el timeout o el número de reintentos forman parte de la especificación de un sistema distribuido.

## Qué controles siguen siendo útiles

Rate limiting y circuit breakers siguen siendo útiles. Reducen la velocidad del ataque, elevan su coste y permiten activar una revisión. El error es vender esa fricción como una solución completa.

Un filtro de entrada puede bloquear patrones conocidos. Un clasificador de salida puede detectar contenido peligroso mientras se genera. Un límite de intentos puede cortar la búsqueda. Ninguna de esas capas decide por sí sola si el sistema está autorizado a realizar una acción externa.

La defensa gana fuerza cuando el control de salida se conecta con el control de acción. Una respuesta bloqueada no debe dejar abierta una tool call equivalente. Un agente que alcanza el límite de intentos debe quedar en un estado conocido y auditable. Un flujo de alto riesgo necesita una aprobación humana o una política determinista que no dependa de la redacción del modelo.

Anthropic presenta *Constitutional Classifiers* precisamente como una defensa adicional de entrada y salida frente a jailbreaks universales. El resultado relevante para arquitectura no es asumir que un clasificador resuelve el problema, sino usarlo como una capa medible dentro de un sistema donde el runtime mantiene la autoridad final ([Anthropic, 2025](https://www.anthropic.com/research/constitutional-classifiers)).

## Qué debe medir una prueba

Un benchmark de jailbreak puede contar una respuesta como éxito cuando contiene palabras de una rúbrica, aunque no permita realizar la acción que preocupa. Por eso el red-teaming debe revisar la utilidad real del ataque y no solo la coincidencia textual.

La evaluación mínima debería separar cuatro resultados:

1. **Bypass** — el modelo cruzó el filtro o política conversacional.
2. **Capability** — produjo información o una capacidad realmente utilizable.
3. **Tool reachability** — el sistema permitió proponer una acción externa equivalente.
4. **Execution** — la acción llegó a ejecutarse con efecto real.

Cada salto necesita una prueba distinta. Confundirlos produce dos errores opuestos. Puede parecer que el modelo está roto cuando solo generó texto irrelevante, o puede parecer seguro porque el filtro bloqueó la respuesta pero el runtime dejó disponible el mismo efecto por otra ruta.

La conclusión de este capítulo es incómoda pero práctica. La alineación reduce la frecuencia de respuestas peligrosas. La seguridad del producto depende además del presupuesto de intentos, clasificación, autorización, scopes, observabilidad y capacidad de parar.

## Referencias

- Zou et al. (2023), [*Universal and Transferable Adversarial Attacks on Aligned Language Models*](https://arxiv.org/abs/2307.15043).
- OWASP, [*LLM Prompt Injection Prevention Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).
- Anthropic (2025), [*Constitutional Classifiers: Defending against universal jailbreaks*](https://www.anthropic.com/research/constitutional-classifiers).
