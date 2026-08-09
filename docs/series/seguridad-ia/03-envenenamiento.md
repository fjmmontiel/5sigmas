---
title: Envenenamiento — cuando una instrucción peligrosa se queda en el sistema
description: "Qué ocurre cuando un documento o una memoria conserva una instrucción peligrosa y el sistema la vuelve a usar más tarde."
date: 2026-08-06
keywords: envenenamiento RAG, memoria agentes, sleeper agents, memory poisoning, backdoors LLM, unlearning
tags:
  - IA
  - Seguridad
  - LLMs
  - Agentes
video: "03-envenenamiento.mp4"
video_duration: "PT1M0S"
---

# Capítulo 3 — Envenenamiento

Un sistema puede fallar porque recibe una instrucción hostil hoy. También puede fallar porque guarda una señal que parece normal y la vuelve a utilizar mañana. Ese segundo caso es más difícil de auditar, porque el incidente no está en una sola petición. Está repartido entre ingestión, almacenamiento, recuperación y decisión.

El envenenamiento aparece en varias capas. Un documento malicioso puede alterar un índice RAG. Una memoria de agente puede conservar una falsa preferencia o un resumen contaminado. Un dataset de entrenamiento puede introducir un patrón que solo se activa cuando aparece un disparador concreto.

La diferencia importante es temporal. El prompt injection clásico intenta modificar una decisión presente. El *memory poisoning* intenta conseguir que el propio sistema preserve la influencia del atacante y la vuelva a introducir más adelante como si fuese parte de su estado legítimo.

## Guardar un dato no lo convierte en verdad

Guardar una salida en una base de datos no la vuelve confiable. La memoria de un agente debe tener origen, fecha, ámbito, permisos y una política de caducidad. Sin esas propiedades el sistema puede tratar una observación antigua como una instrucción vigente o convertir una hipótesis en un hecho operativo.

El mismo principio vale para RAG. La recuperación ordena documentos por una señal de relevancia. No certifica que el contenido sea correcto, actual o autorizado para gobernar una acción.

{{ include_html("snippets/seguridad-ia/03-persistencia.html") }}

La división entre conocimiento y control debe conservarse también después de guardar el dato. Un resumen de correo puede ser útil para responder una pregunta y seguir siendo una entrada no confiable para enviar un pago.

{{ include_html("snippets/seguridad-ia/03-memory-governance.html") }}

## La memoria persistente ya es una superficie de ataque medible

La evidencia de 2026 permite analizar esta superficie de forma mucho más directa que los primeros trabajos sobre backdoors en pesos del modelo.

*Hidden in Memory: Sleeper Memory Poisoning in LLM Agents* estudia un ataque diferido en el que contenido adversario de un documento, web o repositorio provoca que un asistente guarde una memoria falsa. El trabajo evalúa la cadena completa —escritura, recuperación y uso posterior— y reporta que, entre las recuperaciones exitosas, las memorias envenenadas provocan la acción pretendida por el atacante en un 60-89% de las evaluaciones según el modelo y el setup ([Pulipaka et al., 2026](https://arxiv.org/abs/2605.15338)).

El resultado no debe interpretarse como una tasa universal de ataque para cualquier producto. Sí demuestra una propiedad estructural: una entrada no confiable puede dejar de ser efímera y convertirse en estado persistente que afecta conversaciones posteriores.

*From Untrusted Input to Trusted Memory* amplía el problema identificando cuatro canales de escritura de memoria y nueve vulnerabilidades estructurales en capacidades del modelo, prompts de sistema y arquitectura del agente. Su conclusión más útil para diseño es que los agentes que escriben y recuperan memoria de forma más agresiva también pueden aumentar su superficie de ataque ([Dash et al., 2026](https://arxiv.org/abs/2606.04329)).

La señal más reciente es *MemSecBench*, publicado como preprint en julio de 2026. Su protocolo Write–Execute–Forget sigue la misma semántica maliciosa desde que se almacena hasta que causa una consecuencia y después intenta repararse. En 24 configuraciones de agentes, memorias y modelos, el trabajo reporta persistencia maliciosa en el 84,2% de los casos y éxito end-to-end de la cadena Write–Execute en el 50,3%. Es evidencia preliminar y dependiente del harness, pero mejora mucho la pregunta experimental: no solo si el poison entra, sino si llega a una acción y puede retirarse después ([Chen et al., 2026](https://arxiv.org/abs/2607.27080)).

OWASP ya trata este riesgo de forma explícita en su Top 10 para aplicaciones agénticas de 2026 bajo **ASI06: Memory & Context Poisoning**: la memoria y el contexto dejan de ser simples features de producto y pasan a ser activos que necesitan procedencia, aislamiento y controles de escritura ([OWASP, 2026](https://genai.owasp.org/2026/05/13/memory-is-a-feature-it-is-also-an-attack-surface/)).

## Un comportamiento peligroso también puede quedar oculto en el modelo

El estudio *Sleeper Agents* construyó modelos de prueba que escribían código seguro cuando el prompt indicaba 2023 y código vulnerable cuando indicaba 2024. La demostración no describe un incidente comercial. Sirve para estudiar una propiedad concreta: un comportamiento activado por un disparador puede persistir después de técnicas estándar de entrenamiento de seguridad.

El trabajo observó persistencia tras fine-tuning supervisado, reinforcement learning y entrenamiento adversarial. En algunos casos el entrenamiento adversarial ayudó al modelo a reconocer mejor sus disparadores, lo que podía ocultar el comportamiento durante la evaluación.

Ese caso pertenece a una capa diferente del sistema. El *sleeper agent* vive en los pesos del modelo; el *memory poisoning* de runtime vive en el estado persistente que rodea al modelo. Conviene separarlos porque las mitigaciones también son distintas.

{{ include_html("snippets/seguridad-ia/03-runtime-vs-weights.html") }}

## Por qué retirar un dato es difícil

Borrar una entrada de la tabla principal de memoria no demuestra que el sistema haya olvidado su influencia. Puede haber copias en índices vectoriales, caches, resúmenes, checkpoints, memoria de otros agentes o trazas reutilizadas en pasos posteriores.

Hay al menos cuatro dificultades distintas:

1. El mismo dato puede haberse materializado en varias capas de almacenamiento.
2. El sistema puede conservar una reformulación o resumen aunque la fuente original desaparezca.
3. Otro agente puede haber propagado la información a su propia memoria o estado.
4. Si el dato llegó a entrenamiento o fine-tuning, retirar la fuente externa ya no elimina la representación aprendida.

{{ include_html("snippets/seguridad-ia/03-propagation-map.html") }}

La corrección necesita una prueba de desaparición y una prueba de regresión. La primera pregunta si el comportamiento activable sigue presente. La segunda comprueba que la mitigación no ha destruido una capacidad legítima.

Por eso el ciclo **Write → Retrieve → Execute → Forget** es una unidad de evaluación más útil que preguntar únicamente si `DELETE memory_id` devolvió un `200 OK`.

## Cómo diseñar una memoria que pueda gobernarse

Una memoria operable necesita al menos:

- **Procedencia**: quién o qué componente originó el dato.
- **Autoridad de escritura**: qué actor tuvo permiso para persistirlo.
- **Ámbito**: usuario, tenant, sesión, agente o workflow al que aplica.
- **Tiempo**: fecha de creación, última validación y caducidad.
- **Sensibilidad**: qué tipo de información contiene y dónde puede circular.
- **Confianza**: si procede de usuario, herramienta, documento externo o inferencia del modelo.
- **Revocación**: ruta que permita invalidarlo y reconstruir los derivados afectados.
- **Auditoría**: evidencia de cuándo se recuperó y qué decisiones influyó.

OWASP recomienda además validar y sanear los datos antes de persistirlos, aislar memoria entre usuarios o sesiones, imponer expiración y límites de tamaño y auditar contenidos sensibles antes de almacenarlos ([OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)).

El modelo puede proponer una memoria. El runtime debe decidir si se guarda, cómo se recupera y qué acciones puede influir. Una preferencia conversacional puede entrar con un umbral bajo. Una memoria que vaya a decidir una transferencia, un borrado o una acción administrativa necesita una frontera de confianza completamente distinta.

## Qué debe medir una evaluación de memoria

Una prueba útil debería responder, por separado, a cinco preguntas:

1. **Write** — ¿el contenido adversario consiguió persistir?
2. **Retrieve** — ¿la memoria contaminada vuelve a entrar en contexto cuando el atacante lo necesita?
3. **Influence** — ¿modifica la decisión del agente?
4. **Execute** — ¿esa influencia alcanza una tool call o un efecto externo?
5. **Forget** — ¿la revocación elimina la influencia sin destruir memoria legítima?

Esta separación evita declarar un sistema inseguro solo porque guardó un texto irrelevante y, en el extremo contrario, evita declarar una mitigación exitosa porque eliminó una fila mientras la influencia seguía viva en otro artefacto.

## Qué cambia en el producto

Un sistema con memoria tiene que poder olvidar de manera verificable. Un sistema con RAG tiene que poder retirar una fuente y demostrar qué índices, caches y resúmenes quedaron afectados. Un agente multiusuario necesita aislamiento explícito para impedir que la memoria de una sesión gane autoridad en otra.

La memoria no debería convertirse en un canal alternativo para saltarse los controles de entrada. Si una observación no confiable no podría autorizar una acción hoy, persistirla no debería convertirla en una fuente confiable mañana.

El envenenamiento describe, en último término, un problema de estado: **qué guardó el sistema, de dónde salió, qué confianza le asignó, dónde se propagó y qué puede hacer con ello cuando reaparece**.

## Referencias

- Pulipaka et al. (2026), [*Hidden in Memory: Sleeper Memory Poisoning in LLM Agents*](https://arxiv.org/abs/2605.15338).
- Dash et al. (2026), [*From Untrusted Input to Trusted Memory: A Systematic Study of Memory Poisoning Attacks in LLM Agents*](https://arxiv.org/abs/2606.04329).
- Chen et al. (2026), [*MemSecBench: Tracking Agent Memory Poisoning from Persistence to Consequence and Repair*](https://arxiv.org/abs/2607.27080) — preprint.
- Hubinger et al. (2024), [*Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training*](https://arxiv.org/abs/2401.05566).
- OWASP (2026), [*Memory Is a Feature. It Is Also an Attack Surface*](https://genai.owasp.org/2026/05/13/memory-is-a-feature-it-is-also-an-attack-surface/).
- OWASP, [*AI Agent Security Cheat Sheet*](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html).
