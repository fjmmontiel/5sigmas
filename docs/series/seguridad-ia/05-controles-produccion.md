---
title: Controles de producción — limitar las acciones cuando el modelo falla
description: "Qué controles limitan el daño cuando un sistema con IA lee contenido externo, usa herramientas y una defensa falla."
date: 2026-08-06
date_modified: 2026-08-23
keywords: seguridad producción LLM, mínimo privilegio, dual LLM, guardrails, MCP security, tool poisoning, observabilidad agentes
tags:
  - IA
  - Seguridad
  - Producción
  - Agentes
video: "05-controles-produccion.mp4"
video_duration: "PT1M0S"
---

# Capítulo 5 — Controles de producción

Un sistema seguro limita qué puede ver cada componente, qué acciones requieren autorización, qué ocurre cuando una defensa falla y cómo se demuestra lo que pasó. La promesa de que el modelo nunca se equivocará no basta.

La defensa en profundidad no consiste en apilar filtros hasta que el producto deje de ser útil. Consiste en repartir responsabilidades entre capas que no compartan exactamente la misma superficie de ataque.

En 2026 esa frontera ya no puede pensarse solo como «LLM + tools». Los sistemas reales conectan agentes con servidores MCP, memoria persistente, otros agentes, navegadores, repositorios, correo, bases de datos y runtimes de código. Cada integración añade un canal de confianza que debe tener permisos, validación y una forma explícita de detenerse.

## Separar la lectura de documentos y las acciones

El patrón dual-LLM propone una frontera clara. Un modelo en cuarentena puede leer contenido no confiable y extraer datos. No tiene acceso directo a herramientas ni a información sensible. Un modelo privilegiado puede decidir una acción, pero recibe salidas estructuradas o resúmenes y no el documento hostil completo.

{{ include_html("snippets/seguridad-ia/05-defense-depth.html") }}

La separación no elimina toda inyección. Un resumen puede estar contaminado y un clasificador puede equivocarse. La ventaja es que la ruta de ataque deja de ser un salto directo desde cualquier texto hasta una acción privilegiada.

La regla general es más amplia que el patrón dual-LLM: **el componente que procesa datos no confiables no debería heredar automáticamente la capacidad de producir efectos irreversibles**.

## Dar a cada herramienta solo los permisos que necesita

OWASP sitúa el uso indebido de herramientas, el abuso de privilegios y la ejecución inesperada entre los principales riesgos de aplicaciones agénticas. La implicación práctica es sencilla: el radio de impacto de un fallo viene determinado en gran parte antes de que el modelo genere nada, por los permisos que el runtime ya le concedió ([OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)).

Un agente que solo necesita leer documentos no debería recibir una herramienta que también pueda subir y borrar ficheros. Si una entrada hostil convence al modelo de usar una operación incorrecta, el blast radius ya estaba definido por el contrato.

Cada herramienta debería declarar al menos:

- nombre y propósito;
- esquema de argumentos;
- permisos y recursos alcanzables;
- operaciones permitidas;
- timeout y límites de consumo;
- forma de error;
- idempotencia o estrategia ante reintentos;
- reversibilidad;
- clase de riesgo de la acción.

El runtime debe validar la llamada y autorizarla según usuario, recurso y operación. El modelo puede proponer. No debe convertirse en la autoridad final por el mero hecho de haber generado un JSON válido.

Las acciones destructivas necesitan una frontera adicional. Puede ser aprobación humana, doble confirmación, modo de previsualización, operación reversible o una política determinista independiente del modelo. La política exacta depende del producto, pero debe existir antes de integrar la tool call.

## MCP no elimina el problema: estandariza una nueva frontera de confianza

MCP simplifica la conexión entre aplicaciones con LLMs y herramientas externas, pero la estandarización no convierte automáticamente en confiable al servidor, sus descripciones de herramientas ni sus respuestas.

OWASP identifica varias superficies específicas de MCP: **tool poisoning**, *rug pull* de definiciones después de la aprobación inicial, *tool shadowing* entre servidores, *confused deputy*, permisos OAuth demasiado amplios y exfiltración mediante canales aparentemente legítimos ([OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)).

El caso de *tool poisoning* es especialmente importante porque reproduce la misma propiedad que vimos con RAG. Una descripción de herramienta o una respuesta del servidor termina dentro del contexto del modelo. Si contiene instrucciones hostiles y el cliente la trata como contenido confiable, el canal de herramientas se convierte en otra vía de prompt injection ([OWASP MCP Tool Poisoning](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning)). El [explorador de amenazas de prompt injection](/herramientas/amenazas-prompt-injection/) permite modelar esa alcanzabilidad desde contenido no confiable hacia herramientas, datos, salida externa y memoria, y comprobar qué controles independientes cortan cada ruta.

{{ include_html("snippets/seguridad-ia/05-mcp-boundary.html") }}

Por eso un cliente MCP de producción debería aplicar, como mínimo:

1. **Allowlist de servidores y tools**: no descubrimiento dinámico sin aprobación.
2. **Scopes mínimos**: separar lectura, escritura y administración.
3. **Integridad de definiciones**: detectar cambios en tool descriptions y schemas después de haber sido aprobados.
4. **Aislamiento**: ejecutar servidores no confiables en sandbox y limitar filesystem, red y credenciales.
5. **Autorización por llamada**: el hecho de que una tool exista no significa que cualquier usuario o flujo pueda invocarla.
6. **Tool outputs no confiables**: validar el resultado antes de devolverlo al contexto del modelo.
7. **Secret boundaries**: evitar que credenciales o datos sensibles puedan terminar en argumentos de tools sin una política explícita.

MCP debe tratarse como una capa de integración, no como una capa de autorización.

## La memoria también necesita políticas de escritura

El capítulo anterior mostró que una entrada hostil puede persistir y reaparecer más tarde. Producción necesita, por tanto, controles no solo sobre las tool calls sino sobre el estado que el agente puede modificar.

OWASP recomienda validar y sanear datos antes de persistirlos, aislar memoria entre usuarios y sesiones, limitar duración y tamaño y auditar contenido sensible ([OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)).

Eso sugiere una regla útil: **escribir memoria es una acción privilegiada**. No necesariamente tan sensible como enviar un pago, pero sí lo bastante importante como para tener procedencia, scope y revocación.

## Clasificar el texto mientras se genera

Constitutional Classifiers presenta clasificadores de entrada y salida que pueden evaluar la secuencia mientras se genera. Si aparece contenido peligroso, el sistema puede cortar la generación sin esperar al final.

Eso mejora tiempo de respuesta y experiencia, pero no sustituye el resto de la arquitectura. Un guardrail sigue siendo un modelo o un componente que necesita evaluación. También añade coste, latencia y una nueva señal que monitorizar.

Los clasificadores son más útiles cuando el control que ejercen está conectado con el riesgo. Una conversación de bajo impacto puede usar una comprobación barata. Una tool call sensible puede exigir una capa especializada, validación determinista y aprobación humana.

El error es poner el guardrail únicamente delante del texto visible y dejar una ruta equivalente abierta por una herramienta. **Bloquear la respuesta y permitir la acción no es una mitigación.**

## Diseñar un kill path real

Un agente de producción necesita una forma de detenerse que no dependa de que el propio modelo coopere.

Ese *kill path* puede incluir:

- circuit breaker por usuario, tenant o workflow;
- revocación inmediata de credenciales de tools;
- cancelación de ejecuciones en curso;
- límite de reintentos y presupuesto;
- bloqueo temporal de una herramienta concreta;
- rollback o reconciliación de acciones parcialmente ejecutadas;
- modo read-only degradado.

La propiedad importante es que el control viva fuera del canal natural-language que podría estar comprometido.

{{ include_html("snippets/seguridad-ia/05-kill-path.html") }}

## Registrar lo que ocurre para poder detenerlo

La telemetría de seguridad debe seguir la ruta de decisión. Conviene conservar identidad de la petición, fuente recuperada, memoria utilizada, decisión de política, herramienta propuesta, autorización, resultado y motivo de aborto sin registrar secretos o contenido personal innecesario.

Una traza mínima de una acción debería permitir reconstruir:

`input → retrieval/memory → model decision → tool proposal → policy decision → execution → resulting state`

La señal no es solo un log. Cambios bruscos en la tasa de aprobaciones, en los motivos de rechazo, en el uso de una herramienta, en los servidores MCP consultados o en los reintentos pueden indicar un bypass o una regresión. Sin una línea base, el equipo se entera del problema cuando ya está mirando el incidente.

## Convertir seguridad en un release gate

El red-teaming del capítulo anterior solo tiene valor operacional si sus resultados pueden bloquear una release.

Un gate de seguridad para un agente puede ser pequeño y específico:

- ninguna acción destructiva sin autorización independiente;
- ninguna tool sensible accesible desde contenido externo no confiable sin una frontera estructural;
- cero cross-tenant memory leakage en el conjunto de regresión;
- tool schemas y scopes comparados contra una baseline aprobada;
- escenarios de prompt injection indirecta ejecutados end-to-end;
- kill switch y rollback verificados;
- logs suficientes para reconstruir cada acción privilegiada.

{{ include_html("snippets/seguridad-ia/05-release-gate.html") }}

OWASP incorpora explícitamente adversarial validation, CI/CD y release gates dentro de sus recomendaciones para seguridad de agentes. La idea importante no es adoptar una cifra universal, sino hacer que el criterio de aceptación sea reproducible y esté conectado con el threat model del producto ([OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)).

## El diseño que queda

Una arquitectura razonable para un flujo con contenido externo y acciones sensibles puede seguir esta secuencia:

1. ingestión etiquetada como no confiable;
2. lectura en cuarentena;
3. salida estructurada y validada;
4. memoria con procedencia y scope si hace falta persistencia;
5. decisión con tools limitadas;
6. autorización independiente por usuario, recurso y operación;
7. sandbox para ejecución de riesgo;
8. herramienta reversible cuando sea posible;
9. telemetría end-to-end;
10. aborto, auditoría y recuperación.

La secuencia no pretende ser una receta universal. Sirve para hacer visible dónde se separa el dato de la acción y dónde puede detenerse el sistema.

La serie termina con una regla poco espectacular y muy útil. **Cuanto más poder le das a un sistema que interpreta lenguaje, menos puedes depender de que el lenguaje se interprete como esperas.** El control real vive en los límites del runtime, los permisos, la autorización, el aislamiento, la observabilidad y la capacidad de recuperar.

## Referencias

- OWASP (2026), [*Top 10 for Agentic Applications*](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).
- OWASP, [*AI Agent Security Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html).
- OWASP, [*MCP Security Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html).
- OWASP, [*MCP Tool Poisoning*](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning).
- OWASP, [*LLM Prompt Injection Prevention Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).
- Anthropic (2025), [*Constitutional Classifiers: Defending against universal jailbreaks*](https://www.anthropic.com/research/constitutional-classifiers).
- NIST, [*AI Risk Management Framework*](https://www.nist.gov/itl/ai-risk-management-framework).