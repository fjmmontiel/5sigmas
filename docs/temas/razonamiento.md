---
title: "Razonamiento en LLMs"
seo_title: "Razonamiento en LLMs: chain of thought y test-time compute"
description: "Qué significa razonar en un LLM, cómo funcionan chain of thought, búsqueda y verificadores, y qué se paga en latencia, coste y fiabilidad."
keywords: "razonamiento LLM, chain of thought, test-time compute, inference-time compute, self-consistency, verificadores, modelos razonadores"
date: 2026-04-14
date_modified: 2026-08-23
---

# Razonamiento en LLMs

En un LLM, **razonar** significa producir o ejecutar cómputo intermedio que ayuda a resolver una tarea antes de emitir la respuesta final. Ese cómputo puede tomar la forma de pasos textuales, búsqueda entre candidatos, uso de herramientas, verificación o iteraciones de corrección.

No es una propiedad binaria. Un modelo puede resolver bien una clase de problemas y fallar ante una variación mínima. También puede llegar a una respuesta correcta con una explicación falsa, o escribir una cadena convincente que termina en un resultado incorrecto.

Por eso conviene separar tres preguntas:

1. ¿La respuesta final es correcta?
2. ¿El proceso utilizado es robusto?
3. ¿La explicación visible refleja realmente ese proceso?

## La idea central

{{ include_html("snippets/temas/reasoning-loop.html") }}

Los modelos razonadores modernos dedican más cómputo durante la inferencia. Esa estrategia se conoce como **test-time compute** o **inference-time compute**. En lugar de fijar todo el rendimiento durante el entrenamiento, el sistema puede gastar más pasos en consultas difíciles.

La ventaja es capacidad adaptable. El coste aparece en latencia, tokens, variabilidad y operación. La [calculadora de coste y latencia LLM](/herramientas/coste-latencia-llm/) permite hacer explícito ese intercambio al comparar modelo, volumen de tokens y tiempo de respuesta bajo distintos supuestos.

## Chain of thought

*Chain of thought* (CoT) induce al modelo a producir pasos intermedios antes de la respuesta. Wei et al. mostraron que ejemplos con razonamientos encadenados podían mejorar el rendimiento de modelos grandes en tareas aritméticas, simbólicas y de sentido común.[^cot]

{{ include_html("snippets/temas/reasoning-chain-of-thought.html") }}

La técnica ayuda porque ofrece espacio para representar variables y dependencias. También puede empeorar la respuesta si los primeros pasos contienen un error que se propaga.

La cadena visible tampoco debe tratarse como una traza causal perfecta. Un modelo puede racionalizar una decisión influida por señales que no menciona. Turpin et al. documentaron explicaciones que parecían coherentes pero omitían factores decisivos del prompt.[^unfaithful]

La conclusión práctica es clara: una explicación textual puede ser útil para inspección, pero no sustituye a una evaluación de corrección ni a telemetría del sistema.

## Self-consistency y muestreo de candidatos

Una respuesta única depende de una trayectoria de generación. **Self-consistency** genera varias cadenas y elige la respuesta que aparece con mayor consistencia entre ellas.[^selfconsistency]

{{ include_html("snippets/temas/reasoning-self-consistency.html") }}

Esta estrategia funciona cuando existen caminos independientes que convergen en la solución. Su coste crece casi linealmente con el número de muestras y no ayuda si todas comparten el mismo sesgo.

En problemas abiertos, votar texto completo no tiene sentido. Se necesita normalizar respuestas, evaluar candidatos o usar un modelo juez.

## Búsqueda y planificación

El razonamiento puede formularse como búsqueda sobre estados posibles. **Tree of Thoughts** hace explícita esta idea al mantener varias continuaciones intermedias, evaluarlas y decidir qué rama explorar a continuación.[^tot]

{{ include_html("snippets/temas/reasoning-search-planning.html") }}

Los algoritmos concretos cambian la política de frontera:

- **beam search:** conserva un conjunto acotado de candidatos según una puntuación;
- **Tree of Thoughts:** permite ramificar, evaluar y retroceder entre estados intermedios;
- **Monte Carlo Tree Search / UCT:** asigna exploración según el valor observado y la incertidumbre de las ramas.[^uct]
- **programas o tools:** convierten parte del espacio de búsqueda en operaciones verificables;
- **planificación explícita:** separa creación del plan y ejecución.

La búsqueda aporta valor cuando hay una señal que distingue estados prometedores. Sin un evaluador fiable, el sistema puede multiplicar candidatos plausibles sin mejorar la selección.

## Verificadores y modelos de recompensa

Un verificador puntúa una respuesta, un paso o una trayectoria. La distinción importante es **qué parte del proceso puede observar y contra qué fuente de verdad compara**. Cuando existe una comprobación ejecutable —tests, solver, esquema o estado externo— esa señal suele ser más directa que pedir a otro modelo una opinión.[^verifiers]

{{ include_html("snippets/temas/reasoning-verifier-signal.html") }}

Un verificador de resultado u **Outcome Reward Model (ORM)** puntúa el outcome final. Es útil cuando la respuesta puede juzgarse de forma fiable, pero no identifica dónde apareció el primer error de una trayectoria. Un **Process Reward Model (PRM)** puntúa estados o pasos intermedios y ofrece una señal más fina para localizar errores o guiar búsqueda, a cambio de necesitar un criterio fiable a nivel de paso.[^process]

La verificación por proceso tampoco demuestra que una explicación visible sea la traza causal interna del modelo. Evalúa el artefacto intermedio que puede observarse. Para código, ejecutar tests sigue siendo preferible a juzgar la naturalidad de una explicación; para una tool call, conviene validar el esquema y comprobar el efecto real.

## Test-time compute

El sistema puede asignar más cómputo de varias formas:

{{ include_html("snippets/temas/reasoning-test-time-compute.html") }}

Snell et al. estudiaron cómo escalar cómputo en inferencia y mostraron que la estrategia óptima depende tanto de la dificultad del problema como de la capacidad del modelo para aprovechar ese presupuesto.[^testtime]

Más cómputo no produce una mejora monotónica. Puede aparecer:

- sobrepensamiento
- deriva del objetivo
- propagación de un supuesto inicial falso
- confianza reforzada en una respuesta incorrecta
- latencia incompatible con la interacción
- coste superior al de usar directamente un modelo mejor

La política correcta no es “pensar siempre más”. Es **rutar el presupuesto según la dificultad y el valor de la respuesta**.

## Razonamiento visible y razonamiento interno

{{ include_html("snippets/temas/reasoning-evidence-surfaces.html") }}

No hace falta mostrar cada token intermedio para ofrecer transparencia. Una explicación larga puede ocultar la evidencia importante; una respuesta auditable debería citar los datos relevantes, exponer supuestos, indicar incertidumbre y registrar las acciones reales fuera del texto mostrado.

## Razonamiento con herramientas

Las tools cambian el problema. El modelo ya no necesita simular todas las operaciones dentro de una cadena textual: puede alternar decisiones con acciones sobre un entorno y usar resultados observables para actualizar el siguiente paso.[^react]

{{ include_html("snippets/temas/agent-tool-gate.html") }}

Una calculadora reduce errores aritméticos. Un buscador aporta información actual. Un intérprete ejecuta código. Una API permite actuar sobre un sistema externo.

El reto se desplaza hacia el contrato:

- cuándo llamar
- con qué argumentos
- cómo validar
- qué hacer ante timeout o resultado parcial
- cómo evitar duplicados
- cómo reanudar después de una interrupción

La separación importante es operacional: **el modelo propone; el runtime valida y ejecuta; el resultado real actualiza el estado; solo entonces se decide el siguiente paso**. En implementaciones actuales, los runtimes de agentes exponen precisamente ese bucle y permiten aplicar guardrails alrededor de las tool calls.[^agentguardrails] El [playground de fiabilidad y evaluación de agentes](/herramientas/agent-reliability/) permite inspeccionar ese tipo de trayectoria separando éxito final, primer intento, retries, timeouts y decisiones de herramientas.

La nota [Agente reactivo, proactivo y tool calls](/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/) desarrolla ese runtime.

## El coste humano de la latencia

En un chat, varios segundos pueden ser aceptables si la tarea es compleja. En voz, la misma demora rompe el ritmo conversacional. El [explorador de latencia de agentes de voz](/herramientas/latencia-agentes-voz/) permite descomponer ese retraso por etapas y comprobar qué componente domina el tiempo hasta la primera respuesta audible.

{{ include_html("snippets/temas/reasoning-latency-clocks.html") }}

La serie [Modelos razonadores](/series/modelos-razonadores/00_presentacion_serie/) y la comparación de [arquitecturas para agentes de voz](/articulos-tecnicos/voice-agent-architectures/) desarrollan estas fronteras con más detalle.

Esta separación evita optimizar solo el benchmark y olvidar la experiencia.

## Cómo evaluar razonamiento

Una evaluación robusta no mira solo la exactitud final.

{{ include_html("snippets/temas/reasoning-evaluation.html") }}

También hay que comparar contra baselines más simples. A veces una regla, una consulta estructurada o un modelo pequeño con una tool supera a una deliberación larga.

La guía de [evaluación de modelos de IA](/temas/evaluacion-modelos/) propone cómo construir ese conjunto de pruebas.

## Preguntas frecuentes

### ¿Chain of thought hace que el modelo sea lógico?

No. Ofrece espacio para pasos intermedios y puede mejorar ciertas tareas. Los pasos siguen siendo generados por el modelo y pueden contener saltos, racionalizaciones o errores.

### ¿Cuanto más razona un modelo, mejor responde?

No siempre. La mejora depende de la tarea, el modelo, el verificador y el presupuesto. En consultas simples, más pasos pueden añadir coste y abrir nuevas oportunidades de error.

### ¿Un modelo juez puede verificar a otro modelo?

Puede aportar una señal útil, especialmente con una rúbrica clara y ejemplos. También hereda sesgos, sensibilidad al orden y errores. Debe calibrarse contra humanos o verificadores externos y no ser la única fuente de verdad en decisiones críticas.

### ¿RAG es razonamiento?

RAG es recuperación de información. Puede formar parte de un proceso de razonamiento, pero recuperar un documento no implica usarlo correctamente ni verificar la conclusión.

## Fuentes primarias

[^cot]: Jason Wei et al., [*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/abs/2201.11903), 2022.
[^selfconsistency]: Xuezhi Wang et al., [*Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171), 2022.
[^unfaithful]: Miles Turpin et al., [*Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting*](https://arxiv.org/abs/2305.04388), 2023.
[^tot]: Shunyu Yao et al., [*Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601), 2023.
[^uct]: Levente Kocsis y Csaba Szepesvári, [*Bandit Based Monte-Carlo Planning*](https://doi.org/10.1007/11871842_29), ECML 2006.
[^verifiers]: Karl Cobbe et al., [*Training Verifiers to Solve Math Word Problems*](https://arxiv.org/abs/2110.14168), 2021.
[^process]: Hunter Lightman et al., [*Let's Verify Step by Step*](https://arxiv.org/abs/2305.20050), 2023.
[^testtime]: Charlie Snell et al., [*Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters*](https://arxiv.org/abs/2408.03314), 2024.
[^react]: Shunyu Yao et al., [*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629), ICLR 2023.
[^agentguardrails]: [OpenAI Agents SDK — Guardrails](https://openai.github.io/openai-agents-python/guardrails/), documentación oficial.