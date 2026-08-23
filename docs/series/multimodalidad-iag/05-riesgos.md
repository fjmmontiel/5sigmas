---
title: Riesgos de seguridad en sistemas multimodales
description: "Prompt injection visual, privacidad, fugas de contexto y manipulación de herramientas cuando un sistema multimodal puede observar y actuar."
date: 2026-04-03
date_modified: 2026-08-23
keywords: "riesgos IA multimodal, prompt injection visual, seguridad sistemas IA, privacidad imágenes IA, ataques LLM multimodal, alineamiento seguridad, IA responsable multimodal"
tags:
  - IA
  - GenAI
  - Multimodalidad
  - Alineamiento
video: "05-riesgos.mp4"
video_duration: "PT52S"
---

# Capítulo 5 — Riesgos: prompt injection visual, acción y seguridad operacional

Este artículo describe los riesgos de seguridad específicos de los sistemas multimodales: aquellos que no existen en modelos de texto puro porque la amenaza entra por una modalidad que los filtros habituales no analizan. Al leerlo entenderás cómo funciona el prompt injection visual (y su equivalente en audio documentado por WhisperInject), qué ocurre cuando un sistema con herramientas recibe una inyección exitosa, qué problemas de privacidad introduce el procesamiento de imágenes y documentos, y por qué el perfil de riesgo cambia cualitativamente cuando el sistema no solo responde sino que actúa. El artículo es útil para cualquier equipo que diseña o despliega sistemas multimodales en producción, con o sin base previa en seguridad de IA.

Los sistemas multimodales introducen superficies de ataque que no existen en los modelos de texto puro. Cuando un sistema puede leer imágenes, documentos escaneados o fragmentos de audio, se abre la posibilidad de que contenido malicioso en esas modalidades altere su comportamiento de formas que los filtros diseñados para texto no detectan, porque esos filtros operan sobre el input explícito del usuario y no sobre lo que el modelo extrae de una imagen al procesarla. 

Cada categoría de riesgo tiene su propio mecanismo y sus propios criterios de diseño defensivo, pero todas comparten esa característica: la amenaza entra por una modalidad que el sistema no analiza con las mismas herramientas que usa para el texto.

A eso se añade una segunda dimensión que cambia el análisis de forma sustancial: la diferencia entre un sistema que responde y un sistema que actúa. Cuando el sistema puede llamar herramientas, modificar registros, enviar mensajes o planificar acciones sobre el entorno, la superficie de error y la superficie de ataque crecen a la vez. 

Una inyección exitosa en un sistema que solo genera texto produce una respuesta incorrecta, pero la misma inyección en un sistema con herramientas puede desencadenar una acción irreversible. Esa asimetría de consecuencias es la razón por la que el diseño defensivo en multimodalidad no puede tratarse como una extensión menor del diseño defensivo en sistemas de texto puro.

---

## 1. Prompt injection visual

El prompt injection es un ataque donde el atacante introduce instrucciones para el modelo dentro del contenido que el modelo procesa como datos. 

En sistemas de texto puro, esto significa incluir texto con instrucciones en el input del usuario. En sistemas multimodales, las instrucciones pueden estar dentro de la imagen misma: una fotografía de un documento, una captura de pantalla o una imagen de producto contiene texto superpuesto o integrado que el modelo lee como instrucciones y sigue si no tiene mecanismo para distinguirlas del contenido de datos [Greshake et al., 2023][r1].

Este vector es más difícil de filtrar que sus equivalentes textuales por razones que se acumulan. Las instrucciones en imágenes no pasan por los filtros de texto del sistema porque no existen como texto en el input hasta que el modelo las procesa internamente, lo que significa que cualquier guardrail aplicado antes de la inferencia no las ve. Además pueden estar ofuscadas visualmente (texto de bajo contraste, texto rotado, texto integrado en patrones visuales) de formas que no son detectables por OCR estándar pero que el modelo sí interpreta, ampliando la superficie de ataque sin necesidad de eludir ningún filtro explícito. El atacante también puede combinar instrucciones visuales con texto normal en el prompt para construir ataques en varias etapas, donde la imagen desactiva restricciones y el texto las aprovecha [Qi et al., 2024][r2][Bailey et al., 2023][r3].

El caso de uso donde este riesgo es más relevante es cualquier sistema que procesa documentos arbitrarios subidos por usuarios: facturas, contratos, capturas de pantalla, fotografías de productos. En todos esos contextos el contenido es no confiable y puede contener instrucciones embebidas que el sistema ejecutará si no está diseñado para tratarlo de otro modo [OWASP][r4][NCSC][r5].

{{ include_html("snippets/multimodalidad-iag/05-prompt-injection-visual.html") }}

El mismo vector existe en modalidad de audio. Investigadores han demostrado que es posible añadir perturbaciones imperceptibles al audio de entrada para manipular modelos de audio-lenguaje y forzarlos a generar contenido dañino o ejecutar instrucciones maliciosas sin que el oyente humano las haya pronunciado. WhisperInject documentó este efecto contra modelos de audio-lenguaje como Qwen2.5-Omni: la perturbación es inaudible para humanos pero logra eludir los protocolos de seguridad del modelo con una tasa de éxito superior al 86%, lo que tiene implicaciones directas para cualquier sistema que acepta audio como input confiable [2026][r6].

{{ include_html("snippets/multimodalidad-iag/05-whisperinject.html") }}

---

## 2. Fugas de sistema y manipulación de herramientas

Cuando un sistema multimodal tiene acceso a herramientas (llamadas a APIs, acceso a bases de datos, capacidad de enviar mensajes), el prompt injection visual puede usarse no solo para alterar la respuesta del sistema sino para desencadenar acciones externas. La imagen contiene instrucciones que modifican el comportamiento del sistema (ignorar instrucciones anteriores, actuar como si el usuario tuviera ciertos permisos, seguir un flujo alternativo) y, una vez alterado, el sistema ejecuta herramientas con efectos externos: envía datos a una URL externa, borra registros, o genera respuestas que incluyen contenido del contexto de sistema.

El mecanismo funciona en dos fases: la imagen reconfigura las restricciones activas del modelo y, a partir de ese punto, el modelo actúa sobre esa configuración alterada usando las herramientas disponibles. Esta segunda fase es especialmente relevante cuando el sistema tiene instrucciones de sistema extensas con información de configuración, lógica de negocio, o datos de usuarios, porque si el ataque logra que el modelo incluya el contenido de su contexto de sistema en la respuesta, esa información queda expuesta al atacante sin que ningún filtro de output la haya revisado.

El diseño defensivo parte de un principio de mínimo privilegio aplicado a las herramientas: si el procesamiento de documentos no requiere enviar emails o modificar registros de base de datos, esas herramientas no deben estar disponibles en ese contexto. 

El output del sistema después de procesar contenido no confiable debe ser revisado antes de pasar a la siguiente etapa del pipeline, de forma que una inyección exitosa no pueda propagarse a acciones irreversibles. Para comprobar qué caminos siguen abiertos desde contenido no confiable hasta datos, herramientas, egress o memoria, el [explorador de amenazas de prompt injection](/herramientas/amenazas-prompt-injection/) permite modelar esas rutas y los controles que las cortan.

{{ include_html("snippets/multimodalidad-iag/05-fuga-sistema.html") }}

---

## 3. Privacidad: imágenes, documentos y metadatos

Los sistemas multimodales que procesan imágenes y documentos tienen acceso a categorías de información personal que los sistemas de texto puro generalmente no manejan, y el riesgo no viene solo de ataques externos sino del propio diseño del sistema cuando no tiene en cuenta qué tipo de datos está ingiriendo.

Una imagen de un documento de identidad, una foto tomada en un espacio privado, una captura de pantalla con información bancaria, o un documento médico escaneado contienen datos sensibles que no deben almacenarse, procesarse en infraestructura no apropiada, ni incluirse en datos de entrenamiento futuros. El problema es que los sistemas multimodales de propósito general no siempre tienen mecanismos para distinguir qué tipo de contenido están recibiendo antes de procesarlo.

Los metadatos de imágenes se ignoran con frecuencia pese a que las imágenes JPEG incluyen datos EXIF que pueden contener la localización GPS de donde fue tomada la foto, el tipo de dispositivo y la hora exacta, de forma que un sistema que los almacena sin eliminarlos extrae información de localización que el usuario puede no haber querido compartir.

El principio de minimización de datos se aplica con especial fuerza en sistemas multimodales: procesar la imagen solo para la tarea específica requerida, no almacenarla más tiempo del necesario, y no usarla para ningún propósito secundario sin consentimiento explícito.

{{ include_html("snippets/multimodalidad-iag/05-exif-privacidad.html") }}

---

## 4. Envenenamiento de datos en sistemas con aprendizaje continuo

Cuando un sistema multimodal incluye algún mecanismo de aprendizaje continuo o actualización de base de conocimiento basada en interacciones, el envenenamiento de datos es una superficie de ataque adicional. El atacante introduce contenido cuidadosamente diseñado (imágenes, documentos) que, al ser procesado y potencialmente incorporado al aprendizaje del sistema, altera las representaciones que el modelo usará en interacciones futuras. 

A diferencia del prompt injection, este ataque no afecta a una sola interacción sino al comportamiento a largo plazo del sistema, lo que lo hace más difícil de detectar y más costoso de revertir.

Los sistemas de recuperación aumentada (RAG) multimodal, donde el sistema indexa documentos visuales y los recupera para responder preguntas, son especialmente vulnerables. Un documento malicioso indexado en la base de conocimiento puede aparecer recuperado ante preguntas que el atacante controla, introduciendo información falsa en respuestas futuras de forma sistemática.

La mitigación más efectiva es la separación estricta entre el pipeline de inferencia y cualquier mecanismo de actualización del modelo o la base de conocimiento. Los documentos que se indexan deben pasar por revisión antes de ser incorporados, y los documentos de fuentes no confiables deben tener acceso limitado o nulo a la base de conocimiento del sistema.

{{ include_html("snippets/multimodalidad-iag/05-rag-envenenamiento.html") }}

---

## 5. Qué cambia cuando el sistema actúa

Los cuatro riesgos anteriores existen en cualquier sistema multimodal. Pero cuando el sistema tiene capacidad de actuar (uso de herramientas, acceso a APIs, control de interfaces, planificación de pasos en un entorno), las consecuencias se amplifican de forma cualitativa, no solo cuantitativa.

El primer cambio es de **reversibilidad**. Una respuesta incorrecta puede ignorarse o corregirse. Una acción ejecutada sobre una base de datos, un sistema de archivos o un servicio externo puede no serlo. El diseño defensivo en sistemas con herramientas tiene que asumir que cualquier inyección exitosa puede tener consecuencias persistentes, y eso eleva el umbral de confianza necesario antes de ejecutar cualquier herramienta con efectos externos.

El segundo cambio es de **superficie de ataque por composición**. En sistemas que encadenan percepción con acción (observar una imagen, razonar sobre ella, llamar una herramienta, usar el resultado para generar la siguiente acción), un error de percepción se propaga a través de toda la cadena. Una imagen manipulada que produce una representación incorrecta puede generar una secuencia de acciones completamente equivocada, cada una de las cuales parece localmente razonable dado el estado anterior.

Ese efecto de propagación hace que los ataques sobre la capa perceptiva sean mucho más valiosos para un adversario en sistemas agénticos que en sistemas de solo comprensión.

{{ include_html("snippets/multimodalidad-iag/05-agencia-propagacion.html") }}

El tercer cambio es de **atribución**. En un sistema conversacional, el origen de una respuesta incorrecta es relativamente trazable. En un pipeline de percepción-razonamiento-acción donde cada paso involucra componentes distintos, un fallo puede originarse en la percepción, en el razonamiento, en la selección de herramienta o en la interpretación del resultado de la herramienta. Esa opacidad de la cadena de causalidad complica tanto el diagnóstico post-incidente como la asignación de responsabilidad, lo que tiene implicaciones prácticas para el diseño de logs, alertas y mecanismos de reversión.

El principio de diseño defensivo que se deriva de estos tres cambios es el de *confinamiento por etapas*: cada transición de percepción a razonamiento a acción debe incluir un punto de verificación donde el sistema pueda evaluar si las condiciones de la acción siguiente son coherentes con el input original. En la práctica, eso significa tratar el output de la capa de percepción como input no confiable antes de usarlo para seleccionar una acción, de la misma forma que el input del usuario se trata como no confiable antes de pasarlo al modelo.

Un cuarto cambio específico de los sistemas agénticos multimodales es el de las **alucinaciones con consecuencias de acción**. En un sistema conversacional, una alucinación produce una respuesta incorrecta que el usuario puede descartar. En un sistema agéntico, una alucinación perceptiva produce una acción sobre el entorno: el modelo cree ver un elemento que no está o cree que una condición se cumple cuando no lo hace, y actúa en consecuencia. Si esa acción modifica el estado del entorno (un archivo, una base de datos, un formulario enviado), la alucinación ha producido un efecto irreversible que no es rastreable como tal en los logs del sistema.

El **bucle infinito agéntico** es una variante estructural del mismo problema: un sistema que percibe el entorno, ejecuta una acción, observa el resultado y decide la siguiente acción puede entrar en un ciclo donde cada observación refuerza la acción anterior en lugar de corregirla, especialmente si la percepción del estado post-acción está sesgada por lo que el sistema esperaba ver. Ese ciclo no termina por error cometido sino por agotamiento de recursos o por un mecanismo de supervisión externo, lo que subraya la importancia de diseñar límites de iteración y condiciones de parada en cualquier bucle de percepción-acción.

{{ include_html("snippets/multimodalidad-iag/05-alucinacion-accion.html") }}

---

## 6. Sesgos demográficos y cumplimiento normativo

Los riesgos de seguridad de los sistemas multimodales no se agotan en ataques activos. Los sistemas de visión-lenguaje pueden codificar sesgos demográficos de formas que no se detectan con benchmarks de capacidad general. Esos sesgos proceden de los datos de entrenamiento, se amplifican en el alineamiento con preferencias humanas y son difíciles de detectar porque los benchmarks generales no los miden explícitamente.

El marco regulatorio europeo aborda parte de este problema de forma directa. El Reglamento de IA (EU AI Act, Reglamento 2024/1689) clasifica los sistemas según riesgo y establece que los sistemas que interactúan con personas o toman decisiones que las afectan, tienen obligaciones de transparencia, auditabilidad y evaluación de sesgos [EU AI Act][r7]. Los sistemas multimodales que procesan imágenes, vídeo o audio de personas en contextos de alto riesgo (reconocimiento facial, selección de personal, evaluación médica) quedan bajo las categorías más exigentes del reglamento, con requisitos que incluyen registros de actividad, evaluación de impacto y supervisión humana obligatoria. Esa clasificación por nivel de riesgo es la estructura organizadora que el EU AI Act aplica al campo y condiciona qué sistemas pueden desplegarse en la UE sin requisitos adicionales de conformidad.

{{ include_html("snippets/multimodalidad-iag/05-riesgos-multimodal.html") }}

---

## 7. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Greshake et al. (2023)** — *Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection* ([arXiv][r1]) | Análisis de ataques de prompt injection indirecta en sistemas LLM con herramientas. |
| R2 | **Qi et al. (2024)** — *Visual Adversarial Examples Jailbreak Aligned Large Language Models* ([arXiv][r2]) | Ataques adversariales visuales contra modelos de lenguaje alineados. |
| R3 | **Bailey et al. (2023)** — *Image Hijacks: Adversarial Images can Control Generative Models at Runtime* ([arXiv][r3]) | Control de modelos generativos mediante imágenes adversariales. |
| R4 | **OWASP** — *Top 10 for Large Language Model Applications* ([OWASP][r4]) | Marco de referencia de riesgos de seguridad en aplicaciones con LLM, incluyendo prompt injection. |
| R5 | **NCSC** — *Prompt injection is not SQL injection (it may be worse)* ([NCSC][r5]) | Análisis de por qué el prompt injection en LLMs es estructuralmente más difícil de mitigar que la inyección SQL clásica. |
| R6 | **(2026)** — *When Good Sounds Go Adversarial: Jailbreaking Audio-Language Models with Benign Inputs* ([arXiv][r6]) | Framework WhisperInject: ataques de audio adversarial en dos etapas contra modelos de audio-lenguaje (Qwen2.5-Omni, Phi-4-Multimodal) con tasa de éxito >86%. |
| R7 | **Parlamento Europeo (2024)** — *Reglamento (UE) 2024/1689 — Reglamento de Inteligencia Artificial* ([EUR-Lex][r7]) | EU AI Act: marco regulatorio europeo con clasificación por riesgo y requisitos de auditoría para sistemas de IA. |

</details>

[r1]: https://arxiv.org/abs/2302.12173 "Indirect Prompt Injection — Greshake et al. 2023"
[r2]: https://arxiv.org/abs/2306.13213 "Visual Adversarial Examples — Qi et al. 2024"
[r3]: https://arxiv.org/abs/2309.00236 "Image Hijacks — Bailey et al. 2023"
[r4]: https://owasp.org/www-project-top-10-for-large-language-model-applications/ "OWASP LLM Top 10"
[r5]: https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection "Prompt injection is not SQL injection — NCSC"
[r6]: https://arxiv.org/abs/2601.21181 "When Good Sounds Go Adversarial — 2026"
[r7]: https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024R1689 "EU AI Act — Reglamento (UE) 2024/1689"

---

## Preguntas frecuentes

**¿Por qué el prompt injection es más difícil de filtrar en sistemas multimodales que en sistemas de texto puro?**
Porque las instrucciones maliciosas viajan dentro de la imagen como contenido visual, no como texto explícito en el input del usuario. Los filtros de texto no las ven porque no existen como texto hasta que el modelo las procesa internamente. Además pueden estar ofuscadas de formas que el OCR estándar no detecta pero el modelo sí interpreta, lo que amplía la superficie de ataque sin necesidad de eludir ningún filtro explícito.

**¿Qué riesgo concreto introduce una alucinación en un sistema que puede actuar sobre el entorno?**
A diferencia de un sistema conversacional donde una alucinación produce una respuesta incorrecta que el usuario puede descartar, un sistema con herramientas que alucina puede ejecutar una acción con efectos externos e irreversibles: borrar un registro, enviar datos a una URL o llamar a una API. Si la imagen que provocó el fallo no aparece de forma obvia en los logs, el origen del problema es difícil de rastrear después.

**¿Qué significa que un sistema multimodal pueda inferir rasgos sensibles a partir de señales visuales o auditivas no relacionadas con esos rasgos?**
Que el modelo puede atribuir características como el estatus socioeconómico o el historial de un usuario a partir de pistas en la imagen o el audio que no contienen esa información de forma objetiva. Ese comportamiento amplifica estereotipos presentes en los datos de entrenamiento y puede derivar en trato discriminatorio automatizado sin que haya una decisión humana explícita de por medio.

**¿Qué cambia en el perfil de riesgo cuando el sistema no solo responde sino que ejecuta pasos autónomos encadenados?**
El cambio fundamental es la irreversibilidad: cada transición de percepción a razonamiento a acción puede propagar un error inicial a través de toda la cadena, y cada paso puede producir efectos que no pueden deshacerse. A mayor longitud de la cadena de pasos autónomos, mayor probabilidad de que un fallo en la capa de percepción se propague y comprometa el resultado completo, porque cada paso siguiente parte del estado incorrecto que el anterior dejó.