---
title: Red-teaming — probar el camino completo antes del incidente
description: "Cómo probar desde el documento que entra hasta la acción que el sistema puede ejecutar, antes de que ocurra un incidente."
date: 2026-08-06
keywords: red teaming IA, evaluación de seguridad, uplift humano, attack budget, agentes IA, benchmarks LLM
tags:
  - IA
  - Seguridad
  - Evaluación
  - LLMs
video: "04-red-teaming.mp4"
video_duration: "PT1M0S"
---

# Capítulo 4 — Red-teaming

Una prueba de seguridad puede ser rigurosa y aun así responder a la pregunta equivocada. Si el sistema real recupera documentos, usa herramientas, conserva memoria y permite varios intentos, evaluar solo un prompt aislado deja fuera la cadena donde el daño podría ocurrir.

El red-teaming sirve para encontrar esos caminos antes de que los encuentre un incidente. Su valor depende de que la amenaza, el entorno, el presupuesto y la rúbrica se parezcan al uso que se quiere proteger.

En sistemas agénticos, esto obliga a cambiar la unidad de análisis: no basta con auditar una respuesta. Hay que auditar una **trayectoria**.

## El threat model viene antes que el benchmark

Antes de elegir un dataset o una métrica, una evaluación debería fijar al menos:

- **Activo**: qué dato, capacidad o recurso se quiere proteger.
- **Actor**: qué puede controlar el atacante y qué información observa.
- **Entrada**: chat, documento, web, email, memoria, tool output, MCP server u otro agente.
- **Presupuesto**: número de intentos, tiempo, adaptatividad y coste disponible.
- **Permisos**: tools, scopes, credenciales y recursos alcanzables.
- **Éxito**: qué evento concreto cuenta como daño.
- **Recuperación**: qué estado debe quedar después de abortar o revertir.

Sin estas siete piezas, una tasa agregada de ataque puede ser precisa y seguir siendo poco útil para una decisión de producto.

OWASP ya trata el red-teaming agéntico como una actividad de ciclo completo: identificar caminos de ataque, validar defensas y mantener feedback continuo entre diseño, despliegue y operación ([OWASP AI and Agentic Red Teaming, Q2 2026](https://genai.owasp.org/resource/ai-security-solutions-landscape-for-ai-and-agentic-red-teaming-q2-2026/)).

## Separar lo que el modelo sabe hacer de lo que el sistema ejecuta

Una evaluación debería separar al menos tres niveles:

- qué sabe hacer el modelo;
- cuánto mejora a una persona que intenta completar una tarea;
- qué puede ejecutar el producto con sus herramientas y permisos.

La primera pregunta pertenece a la capacidad del modelo. La segunda mide *uplift* humano. La tercera es una propiedad del sistema completo.

{{ include_html("snippets/seguridad-ia/04-uplift.html") }}

Un resultado alto en una rúbrica no prueba por sí solo que una persona haya obtenido una capacidad nueva. La evaluación debe revisar si el contenido era accionable, si la persona tenía los recursos necesarios y si el resultado se podía reproducir bajo condiciones realistas.

## Probar el modelo y probar el producto son experimentos distintos

Para estudiar capacidad base puede tener sentido evaluar configuraciones con mitigaciones reducidas o desactivadas. El objetivo no es desplegarlas, sino evitar confundir «el sistema bloqueó la salida» con «el modelo carece de esa capacidad».

La comparación debe declarar qué versión se prueba, qué safeguards están activos, qué herramientas existen, qué permisos tiene el agente, cuántos intentos recibe el atacante y quién revisa los resultados. Una cifra de un modelo con guardrails no se puede comparar sin más con una cifra de otro setup que no los tiene.

Ese detalle también importa para regresiones. Si una nueva versión cambia el system prompt, el clasificador, el retrieval, el modelo o los scopes de herramientas, ha cambiado el sistema evaluado aunque el nombre comercial siga siendo el mismo.

## Automatizar ataques también puede engañar a la evaluación

*Constitutional Classifiers* describe un pipeline de red-teaming automático que genera ataques largos y de varios turnos. Un modelo de ataque propone una estructura, la rellena con variantes y usa los resultados para producir nuevos intentos ([Anthropic, 2025](https://www.anthropic.com/research/constitutional-classifiers)).

La automatización aumenta la cobertura, pero también introduce un riesgo de métrica. Si el grader premia palabras concretas o respuestas extensas, el atacante puede aprender a jugar con la rúbrica sin encontrar una ruta útil.

Por eso una evaluación automatizada necesita dos tipos de validación:

1. **Validez del ataque**: confirmar que el supuesto éxito produce realmente la capacidad o efecto que preocupa.
2. **Validez del grader**: revisar falsos positivos, falsos negativos y casos donde el atacante optimiza contra la propia rúbrica.

Un score sin ejemplos auditados puede medir la habilidad del atacante para engañar al evaluador en lugar de la habilidad para comprometer el producto.

## La evaluación debe registrar cada paso

Una evaluación de un agente necesita registrar:

1. la entrada y su procedencia;
2. lo que el sistema recuperó o recordó;
3. la decisión del modelo;
4. la tool call propuesta;
5. la autorización aplicada;
6. el resultado de la herramienta;
7. el estado final y la posibilidad de recuperación.

Cada punto permite una prueba distinta. Un filtro puede bloquear una salida y dejar intacto el retrieval. Un policy engine puede denegar la herramienta y seguir registrando una memoria peligrosa. Un runtime puede abortar a tiempo y dejar un estado parcial que necesita reconciliación.

El benchmark end-to-end no tiene que ser enorme. Tiene que ser representativo. Una tarea pequeña con una cuenta de prueba, un documento contaminado y una acción reversible puede revelar más que miles de prompts sin herramientas.

## Medir la cadena causal, no solo el último texto

Para un flujo con herramientas conviene separar estados de éxito:

- **Injection reached context** — la entrada hostil llegó al modelo.
- **Decision changed** — cambió la decisión o plan del agente.
- **Tool proposed** — apareció una llamada de herramienta peligrosa.
- **Policy bypassed** — la capa de autorización permitió la llamada.
- **Effect happened** — el recurso externo cambió realmente.
- **Recovery failed** — el sistema no pudo detener, revertir o reconciliar el efecto.

Esta descomposición convierte un único porcentaje de «attack success» en evidencia útil para ingeniería. Si el ataque llega al modelo pero muere siempre en autorización, el control que está funcionando es visible. Si el modelo parece seguro pero el mismo efecto puede alcanzarse por una tool call mal validada, también queda visible.

## Probar fallos normales además de ataques perfectos

Una buena prueba incluye variaciones de redacción y documentos adversarios, pero también fallos cotidianos del sistema:

- timeouts y respuestas parciales;
- errores de herramienta;
- reintentos;
- duplicación de acciones;
- permisos reducidos;
- credenciales revocadas;
- tool schemas modificados;
- memoria caducada o contaminada;
- interrupción humana a mitad de una ejecución.

Muchos incidentes no requieren que el atacante controle todos los pasos. Basta con que una entrada hostil coincida con un retry, un permiso excesivo o una reconciliación incompleta.

## Convertir el red-team en regresión

El resultado más valioso de un red-team no es el informe. Es el test reproducible que queda después.

Cada hallazgo debería convertirse, cuando sea posible, en un caso con:

- fixture de entrada;
- estado inicial conocido;
- herramientas y scopes fijados;
- presupuesto del atacante;
- criterio de éxito;
- criterio de parada;
- evidencia esperada en trazas;
- verificación del estado final.

Ese caso debe ejecutarse de nuevo cuando cambie el modelo, el prompt, el retrieval, la memoria, una herramienta o la política de autorización.

La seguridad no mejora porque el informe tenga una cifra con dos decimales. Mejora cuando el equipo puede señalar la ruta exacta que falló, repetirla en un entorno aislado y comprobar que una defensa nueva cambia el resultado sin romper el caso legítimo.

Ese es el papel del red-teaming en esta serie: convertir un miedo abstracto en una cadena observable con un criterio de parada y una evidencia que pueda convertirse en gate de release.

## Referencias

- OWASP (2026), [*AI Security Solutions Landscape for AI and Agentic Red Teaming Q2 2026*](https://genai.owasp.org/resource/ai-security-solutions-landscape-for-ai-and-agentic-red-teaming-q2-2026/).
- OWASP (2026), [*Top 10 for Agentic Applications*](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).
- Anthropic (2025), [*Constitutional Classifiers: Defending against universal jailbreaks*](https://www.anthropic.com/research/constitutional-classifiers).
- NIST, [*AI Risk Management Framework*](https://www.nist.gov/itl/ai-risk-management-framework).
