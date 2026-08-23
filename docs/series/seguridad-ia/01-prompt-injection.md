---
title: Prompt injection — cuando un documento puede cambiar lo que hace el sistema
description: "Cómo una orden escondida en un documento puede entrar en un sistema con IA y qué controles separan la lectura de una acción."
date: 2026-05-26
date_modified: 2026-08-23
keywords: prompt injection, seguridad LLM, indirect prompt injection, RAG security, agentes IA seguridad, dual LLM pattern
tags:
  - IA
  - Seguridad
  - LLMs
  - Agentes
video: "01-prompt-injection.mp4"
video_duration: "PT1M0S"
---

# Capítulo 1 — Prompt injection

Este capítulo explica por qué el prompt injection nace de cómo están construidos los sistemas con LLMs. Al terminarlo, el lector entenderá qué se rompe cuando instrucciones y datos comparten el mismo canal, por qué la inyección indirecta en RAG y agentes cambia el nivel de gravedad, qué límites tienen los filtros y guardrails de post-proceso, y qué arquitectura defensiva tiene sentido si el sistema puede leer contenido externo y actuar sobre herramientas.

En seguridad clásica solemos vivir de una separación. El programa tiene un plano de control, donde se decide qué hacer, y un plano de datos, donde vive lo que el programa procesa. Cuando esa frontera se conserva, muchas defensas son razonables porque el sistema sabe, al menos de forma aproximada, qué parte del input debe ejecutarse y cuál solo debe interpretarse.

Con un LLM esa frontera se vuelve borrosa. El system prompt, la instrucción del usuario, el texto recuperado por RAG, una salida de herramienta o una observación escrita por otro agente llegan todos como secuencias de lenguaje natural. El modelo no recibe una marca dura que diga "esto es control" y "esto es dato". Recibe tokens y calcula cuál es la continuación más probable bajo el contexto completo.

Ahí aparece el prompt injection. No porque el modelo tenga una personalidad débil ni porque falte un filtro concreto, sino porque el canal donde viajan las instrucciones y el canal donde viajan los datos coinciden. Mientras esa condición se mantenga, cualquier contenido no confiable con suficiente capacidad de entrar en contexto compite por el control del sistema.

---

## 1. El problema empieza cuando un documento llega al modelo

El error más habitual es tratar el prompt injection como si fuera una versión exótica de "escribir mejor el system prompt". Eso confunde el síntoma con la causa.

Un prompt mejor puede reducir algunos fallos obvios, pero no cambia la propiedad importante del sistema: el modelo sigue procesando en el mismo flujo textual las instrucciones privilegiadas y el contenido externo. OWASP lo formula de forma bastante directa en su cheat sheet sobre prompt injection: la vulnerabilidad aparece porque lenguaje de control y datos se procesan juntos, sin una separación clara entre ambos planos.

{{ include_html("snippets/seguridad-ia/01-control-vs-datos.html") }}

La comparación con SQL injection ayuda solo hasta cierto punto. En SQL, el ataque explota la interpolación insegura dentro de un lenguaje formal con sintaxis estricta. En prompt injection el problema es semántico y probabilístico. El modelo no "rompe" una gramática. Reinterpreta el contexto completo y puede tratar una cadena maliciosa como una orden más relevante que la que venía antes.

Eso hace que el problema sea más incómodo. No basta con escapar caracteres, porque no hay un único delimitador que cerrar ni una sintaxis cerrada que proteger. Tampoco basta con añadir veinte líneas de instrucciones diciendo "ignora cualquier texto malicioso", porque ese mandato entra en la misma competición contextual que el propio texto malicioso.

La consecuencia práctica es simple: si el sistema lee contenido no confiable, debes asumir que ese contenido está intentando mover el centro de gravedad de la decisión. A veces lo hará de forma explícita. Otras veces lo hará con instrucciones parciales, ofuscación, reescrituras del objetivo o manipulación del contexto de trabajo. Pero el mecanismo base es siempre el mismo.

---

## 2. La orden puede aparecer en una búsqueda de documentos

En un chat simple el atacante todavía habla directamente con el modelo. Eso ya es un problema, pero el riesgo sigue bastante contenido: la entrada maliciosa y el efecto quedan dentro de la misma interacción.

La situación cambia cuando el sistema recupera documentos externos o coordina varios pasos antes de responder. En RAG, un agente puede leer un correo, una wiki interna, un PDF o una nota de soporte y tratar ese contenido como material de trabajo legítimo. Si ahí va embebida una instrucción hostil, el ataque ya no entra por la caja del usuario. Entra por la cadena de suministro del propio contexto.

Ese es el motivo por el que la literatura reciente insiste en la "retrieval barrier". La inyección indirecta no se vuelve peligrosa solo por existir, sino cuando el contenido malicioso consigue ser recuperado y colocado dentro del top-K que verá el modelo. El paper de USENIX sobre indirect prompt injection en RAG y sistemas agénticos empuja justo ahí: divide el ataque entre un *trigger fragment*, cuyo trabajo es garantizar la recuperación, y un *attack fragment*, que contiene la orden maliciosa.

{{ include_html("snippets/seguridad-ia/01-rag-trigger-fragment.html") }}

El dato operativo da la medida del riesgo. En esa línea de trabajo se muestran fragmentos de unos diez tokens capaces de forzar recuperación casi perfecta en distintos embeddings y benchmarks, con costes muy bajos por consulta objetivo. En el experimento más llamativo, un solo email envenenado consigue que un flujo multiagente con GPT-4o termine exfiltrando claves SSH en más del 80% de los intentos.

La lectura del riesgo cambia por dos motivos. El atacante ya no necesita una sesión interactiva privilegiada con el modelo. Le basta con contaminar una fuente que el sistema ya considera relevante. Además, la recuperación y la orquestación multiplican el daño. El agente que ejecuta una herramienta puede no ver el texto original del ataque. Solo ve la instrucción ya normalizada por otro agente o por el retrieval. En ese punto la orden parece venir de una parte "confiable" del pipeline.

Los sistemas multiagente suelen verse mejor en la demo que en la auditoría. La separación funcional entre agentes da sensación de orden, pero también introduce canales donde una observación o un resumen pasan a tratarse como autoridad local. Si una de esas observaciones está contaminada, el resto del sistema hereda la contaminación con menos contexto para cuestionarla.

---

## 3. Filtrar palabras no separa los datos de las instrucciones

Cuando aparece el prompt injection, la reacción natural es añadir filtros: listas de palabras prohibidas, detectores de instrucciones peligrosas, reescritura de consultas, perplejidad, masking, una capa extra de guardrail o un LLM juez. Todo eso puede aportar valor táctico. El problema es pensar que basta.

El primer límite es semántico. Un atacante no tiene por qué escribir "ignora todas las instrucciones anteriores". Puede reformular, trocear, ofuscar o esconder el objetivo dentro de una secuencia aparentemente inocua. OWASP recoge variantes como tipoglycemia, codificación Base64 o instrucciones repartidas en observaciones y resultados de herramientas. Ninguna de ellas necesita una firma estática perfecta para funcionar.

El segundo límite es adaptativo. El mismo trabajo de USENIX muestra que defensas intuitivas como parafrasear la consulta, filtrar por perplejidad o enmascarar tokens producen mejoras pequeñas que desaparecen cuando el atacante optimiza contra ellas. La razón no es misteriosa: la defensa sigue actuando sobre la superficie del texto, mientras el problema de fondo es que el sistema sigue dispuesto a otorgar influencia operativa a contenido no confiable si este consigue entrar en contexto.

El tercer límite aparece cuando el sistema tiene herramientas. En ese caso ya no hablamos solo de seguridad del contenido de salida. Hablamos de agencia. OWASP describe esta familia como *excessive agency*: el modelo recibe más capacidad de la que necesita y un atacante puede reconducirla hacia acciones que el desarrollador no pretendía permitir en ese flujo.

No hace falta un escenario hollywoodiense para que eso duela. Basta con que un agente pensado para leer documentos tenga también permiso para borrar archivos, mandar correos o ejecutar scripts. A partir de ahí, la inyección deja de ser un problema de "respuesta incorrecta" y pasa a ser un problema de "acción errónea con efectos externos".

---

## 4. La protección debe separar lectura y acción

La defensa seria no empieza por escribir un prompt más severo. Empieza por decidir qué parte del sistema puede ver contenido no confiable y qué parte puede actuar.

Una defensa estructural consiste en separar privilegios. El patrón dual-LLM, popularizado en la práctica por Simon Willison y recogido también por OWASP, funciona precisamente así: un modelo en cuarentena puede leer contenido externo, pero no puede tocar herramientas ni datos sensibles. El modelo privilegiado sí puede actuar, pero no lee directamente el contenido no confiable. Solo recibe salidas estructuradas, resúmenes o etiquetas.

{{ include_html("snippets/seguridad-ia/01-defensa-en-capas.html") }}

Esa separación no convierte el problema en trivial, pero rompe el camino más directo entre el texto hostil y la acción privilegiada. Y eso es exactamente lo que quieres en seguridad: no una promesa abstracta de invulnerabilidad, sino una reducción clara de la ruta de ataque.

El [explorador de amenazas de prompt injection](/herramientas/amenazas-prompt-injection/) permite modelar esas rutas de extremo a extremo —desde contenido no confiable hasta datos, herramientas, salida externa o memoria persistente— y comprobar qué límites arquitectónicos cortan cada camino.

La segunda defensa útil es el mínimo privilegio. Cada herramienta disponible para un agente debe justificarse por el caso de uso concreto y con el menor scope posible. Si la tarea es resumir un documento, no debería existir un camino por el que ese mismo agente pueda enviar emails, borrar ficheros o ejecutar Python arbitrario. Cuanto más pequeño es el radio de acción, menos rentable se vuelve una inyección exitosa.

La tercera es estructurar los límites entre pasos. El output de retrieval, OCR, navegación o un agente auxiliar debe tratarse como dato no confiable antes de alimentar una decisión posterior. Eso implica validación explícita, esquemas estructurados cuando sea posible, y puntos de aprobación humana si el siguiente paso puede producir daño irreversible.

La cuarta es observabilidad. Los guardrails son útiles sobre todo cuando dejan rastro: qué aprobaron, qué bloquearon, qué tool call abortaron, cómo cambió la tasa de alertas y en qué ruta del pipeline ocurrió el desvío. Sin esa telemetría, el sistema no aprende nada de sus intentos fallidos y el bypass siguiente vuelve a parecer una sorpresa.

Aquí entran también los clasificadores especializados. El trabajo de Anthropic sobre Constitutional Classifiers es relevante porque muestra una dirección pragmática: monitores de entrada y salida capaces de operar en *streaming*, con un coste adicional medible, y combinados como una capa más dentro de un modelo de defensa en profundidad. Su aportación tiene sentido dentro de un sistema más ancho, no como promesa de que el problema ya está resuelto.

---

## 5. Qué cambia en producto

Si aceptas esta lectura, cambian varias decisiones de producto de forma inmediata.

La primera es que ya no puedes evaluar seguridad solo con prompts directos. Necesitas pruebas end-to-end con recuperación, herramientas, memoria y varios pasos. El pipeline real importa más que el benchmark aislado, porque es ahí donde la instrucción hostil encuentra su camino hacia la acción.

La segunda es que el contenido recuperado deja de ser "conocimiento" y pasa a ser "input externo". Eso obliga a revisar arquitecturas RAG que hoy se presentan casi como neutrales. No lo son. Cada documento recuperado es un paquete de influencia potencial sobre el modelo.

La tercera es que los agentes dejan de ser una simple mejora de UX. Son una ampliación del perímetro de seguridad. Cuando un sistema puede observar, decidir y ejecutar en secuencia, cualquier fallo de interpretación cuesta más que en un chatbot. No porque el modelo se vuelva mágicamente más malicioso, sino porque el sistema le ha dado más palancas.

La consecuencia práctica es una corrección de encuadre. El prompt injection seguirá apareciendo mientras los sistemas mezclen control y datos en el mismo canal. La respuesta madura consiste en reducir las oportunidades de gobierno de una orden externa y limitar sus privilegios si consigue entrar.

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **OWASP** — *LLM Prompt Injection Prevention Cheat Sheet* | Explica por qué el problema nace de mezclar instrucciones y datos, y resume defensas de arquitectura, validación y mínimo privilegio. |
| R2 | **Chang et al. (2025)** — *Overcoming the Retrieval Barrier: Indirect Prompt Injection in the Wild for LLM Systems* | Trabajo de USENIX sobre inyección indirecta realista en RAG y sistemas agénticos con *trigger fragments*, recuperación casi perfecta y ataques end-to-end. |
| R3 | **OWASP Top 10 for LLM Applications 2025** | Marco operativo para prompt injection, excessive agency, tool misuse y otras vulnerabilidades de aplicaciones con LLMs. |
| R4 | **Anthropic (2025)** — *Constitutional Classifiers* | Defensa con clasificadores de entrada y salida, predicción en streaming y miles de horas de red teaming. |
| R5 | **Hubinger et al. (2024)** — *Sleeper Agents* | Muestra que un comportamiento malicioso activado por disparadores puede persistir tras entrenamiento de seguridad estándar. |

</details>

---

## Preguntas frecuentes

**¿Es correcto decir que el prompt injection es "como SQL injection"?**
Solo en un sentido muy general: en ambos casos datos no confiables alteran el comportamiento del sistema. Pero la diferencia práctica importa. En SQL injection el exploit vive dentro de una gramática formal y suele resolverse con separación estricta entre consulta y parámetros. En LLMs el problema es semántico: instrucciones y datos ya comparten el mismo medio, y el modelo no tiene una frontera dura entre ambos.

**¿Por qué la inyección indirecta es más peligrosa que el prompt injection directo?**
Porque el ataque deja de depender de una interacción frontal con el usuario y pasa a esconderse en una fuente que el sistema ya considera relevante: un correo, un documento, una página recuperada o la memoria escrita por otro agente. En ese punto la orden hostil viaja dentro de la propia cadena de contexto del sistema.

**¿Sirven los guardrails basados en otro LLM?**
Sirven como una capa adicional, no como sustituto de arquitectura. Un guardrail puede bloquear casos obvios y mejorar cobertura, pero sigue siendo un modelo que procesa lenguaje natural y, por tanto, comparte parte de la misma superficie de ataque. Si el sistema sigue dando privilegios amplios al actor principal, el guardrail solo reduce parte del riesgo.

**¿Cuál es la defensa más importante si un agente usa herramientas?**
La combinación de mínimo privilegio y separación de roles. El agente que lee contenido no confiable no debería tener acceso directo a acciones destructivas o sensibles. Y el agente que sí puede actuar debería hacerlo sobre entradas estructuradas y con scopes muy limitados.
