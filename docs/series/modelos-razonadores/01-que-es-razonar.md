---
title: Qué es "razonar" para un LLM
description: Qué definiciones de razonamiento encajan en el contexto de los modelos de lenguaje, cómo nacieron los modelos razonadores, y qué dicen los papers sobre la ilusión del pensamiento.
date: 2026-04-08
keywords: "modelos razonadores, razonamiento LLM, chain of thought, CoT, o1 OpenAI, test time compute, razonamiento IA, ilusión del pensamiento, Apple reasoning paper, cadenas de pensamiento"
tags:
  - IA
  - LLMs
  - Razonamiento
---

# Capítulo 1 — Qué es "razonar" para un LLM

Este capítulo examina qué significa razonar en el contexto de los LLMs, cómo nacieron los primeros modelos diseñados para hacerlo y qué dicen los papers sobre sus límites. Al terminarlo, el lector entenderá en qué se diferencia el razonamiento deliberado del reconocimiento de patrones, sabrá por qué RLVR y GRPO producen un perfil de entrenamiento distinto al del RLHF estándar, conocerá los benchmarks que documentaron el salto de o1 y tendrá un marco para leer el debate sobre si los LLMs razonan genuinamente o replican estructuras aprendidas.

Cuando un LLM responde a una pregunta compleja con argumentos estructurados, contraejemplos y conclusiones coherentes, la reacción más común es decir que "razona". La pregunta más técnica es si esa palabra describe algo real o es solo una metáfora conveniente.

Si realmente razona o no, tiene consecuencias directas sobre cómo diseñar sistemas, cómo evaluar sus salidas y cómo entender sus fallos.

---

## 1. Qué significa "razonar" para un humano

En psicología cognitiva, el razonamiento es un proceso deliberado que permite a las personas resolver problemas fuera de los patrones que ya conocen. Se distingue del reconocimiento de patrones (que ocurre rápido, sin esfuerzo y de forma automática) por ser lento, costoso en atención y conscientemente dirigido.

[Daniel Kahneman](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow) describió esta distinción como Sistema 1 (rápido, intuitivo, automático) y Sistema 2 (lento, deliberado, esforzado). El Sistema 2 es el que asociamos intuitivamente con el razonamiento: examinar premisas, considerar alternativas, detectar contradicciones, construir argumentos.

Las propiedades relevantes del razonamiento humano para entender como los LLMs lo pueden aplicar, se pueden agrupar en tres:

**Es un proceso con pasos.** Un problema complejo no se resuelve de una vez sino descomponiéndolo en subproblemas que se resuelven en secuencia y donde cada uno depende del anterior.

**Consume recursos.** El razonamiento cansa. Requiere atención sostenida, tiene costes cognitivos reales y se degrada con la fatiga.

**No es infalible.** Los humanos razonamos mal con frecuencia. Tenemos sesgos conocidos (confirmación, disponibilidad, anclaje) que producen errores sistemáticos incluso cuando pensamos que estamos razonando bien. El pensamiento crítico es, en parte, el conjunto de herramientas para detectar y corregir esos errores.

---

## 2. Qué pueden hacer los LLMs que se parece al razonamiento

Los LLMs pueden hacer cosas que, a efectos prácticos, producen outputs similares a los del razonamiento humano en muchos contextos.

**Descomponer problemas.** Cuando se le pide a un LLM que resuelva un problema complejo paso a paso, la cadena de pasos que genera suele ser coherente y el resultado final mejora respecto a dar la respuesta directamente.

**Detectar contradicciones en texto.** Los modelos avanzados pueden identificar cuando dos afirmaciones en un texto son incompatibles entre sí, aunque no de forma perfectamente fiable.

**Generar alternativas.** Dado un escenario, el modelo puede generar múltiples interpretaciones o soluciones posibles, lo que en un contexto humano llamaríamos pensamiento lateral.

**Seguir lógica formal.** Para problemas con estructura lógica explícita (si P entonces Q, P, por tanto Q), los LLMs generalmente producen la inferencia correcta dentro de su ventana de contexto.

Lo que produce estos outputs no es, según el mejor entendimiento actual, el mismo proceso que produce el razonamiento humano. Los modelos operan mediante predicción estadística del siguiente token: el texto que parece un argumento coherente es el texto que tiene más probabilidad de seguir al texto anterior dado el preentrenamiento.

El debate no está cerrado sobre si ese proceso puede llamarse razonamiento o si es fundamentalmente distinto. Lo que sí está claro es que sus fallos tienen un patrón muy diferente al de los fallos del razonamiento humano.

---

## 3. El nacimiento de los modelos razonadores: o1 de OpenAI

En septiembre de 2024, OpenAI publicó [o1](https://openai.com/index/learning-to-reason-with-llms/), el primer modelo diseñado explícitamente para "pensar antes de responder". La diferencia respecto a los modelos anteriores no estaba en el tamaño del modelo ni en los datos de entrenamiento, sino en la arquitectura de uso: antes de generar la respuesta final, el modelo generaba una cadena de razonamiento interna que el usuario no veía directamente.

El resultado en los benchmarks fue llamativo. En el examen AIME 2024 (matemáticas de competición universitaria), GPT-4o resolvía el 12% de los problemas mientras o1 alcanzaba el 74% con una sola muestra y el 83% con consenso entre 64 muestras. En competición de programación (Codeforces), o1 pasaba del percentil 11 al percentil 89. En GPQA Diamond, un benchmark de preguntas de física, química y biología diseñadas para ser imposibles de buscar en Google, o1 superó por primera vez la precisión de expertos con doctorado reclutados para responder las mismas preguntas.

El mecanismo no era nuevo en la investigación: la idea de "cadena de pensamiento" (chain-of-thought prompting) había aparecido en papers de Google en 2022 ([Wei et al., 2022](https://arxiv.org/abs/2201.11903)) y se había demostrado que producir los pasos intermedios mejoraba los resultados. Lo que o1 añadía era que ese proceso de "pensar" ocurría de forma autónoma, no solo cuando el prompt lo pedía explícitamente, y que el modelo aprendía durante el entrenamiento cuándo y cómo extender su cadena de razonamiento para mejorar el resultado.

> La observación central de o1 fue que el razonamiento, entendido como proceso con pasos, podía comprarse con más cómputo en tiempo de inferencia: gastar más tiempo de procesamiento antes de generar la respuesta mejoraba la calidad de esa respuesta. A ese concepto se le llama test-time compute y es el eje de esta serie.

### 3.1 El mecanismo de entrenamiento: RLVR y GRPO

La diferencia entre o1 y un modelo estándar no es solo de arquitectura de inferencia, sino de entrenamiento. Los modelos razonadores se entrenan con **RLVR (Reinforcement Learning with Verifiable Rewards)**: en lugar de imitar texto humano existente, el modelo genera intentos de solución para problemas con respuestas objetivamente verificables (matemáticas, código), recibe una señal binaria de si fue correcto, y ajusta sus pesos para reforzar las estrategias de razonamiento que funcionaron.

DeepSeek R1 introdujo una variante específica llamada **GRPO (Group Relative Policy Optimization)** que elimina la necesidad de un modelo crítico separado: el modelo genera G intentos independientes para el mismo problema, evalúa cada uno, y calcula la ventaja de cada intento como su desviación del promedio del grupo. Los intentos mejores que el promedio refuerzan sus estrategias; los peores, las penalizan.

{{ include_html("snippets/modelos-razonadores/01-rlvr-entrenamiento.html") }}

### 3.2 El ecosistema: de o1 a los modelos actuales

En menos de un año desde la publicación de o1, el ecosistema de modelos razonadores pasó de un único modelo propietario a un conjunto diverso que incluye modelos open-source de nivel frontera (DeepSeek R1, 671B parámetros), modelos híbridos con razonamiento configurable (Claude 3.7, Gemini 2.5), y modelos con razonamiento profundo y búsqueda interna extendida (o3). Las diferencias entre ellos en transparencia del proceso, apertura de los pesos y rendimiento en benchmarks son sustanciales.

{{ include_html("snippets/modelos-razonadores/01-ecosistema-modelos.html") }}

---

## 4. El paper de Apple y la respuesta al paper

El 6 de junio de 2025, [Apple Research](https://machinelearning.apple.com/research/illusion-of-thinking) publicó "The Illusion of Thinking: Understanding the Strengths and Limitations of Reasoning Models via the Lens of Problem Complexity", un paper que estudiaba el comportamiento de los modelos razonadores en problemas de lógica con complejidad controlable (como las Torres de Hanói o juegos de bloques). Los resultados eran provocadores: los modelos sufren un colapso de precisión completo cuando la complejidad supera un umbral, y de forma contraintuitiva reducen el esfuerzo de razonamiento (en tokens) justo cuando más lo necesitan. Además, el paper documentó el fenómeno del sobrepensamiento: en tareas simples, el modelo encuentra la solución correcta pronto en su cadena interna pero continúa explorando alternativas incorrectas, lo que degrada la respuesta final.

El paper argumentaba que lo que los modelos hacen cuando "razonan" puede ser, en muchos casos, reconocimiento de patrones sofisticado más que razonamiento genuino: el modelo aprende la estructura superficial de los argumentos correctos en su entrenamiento y la replica, pero falla cuando esa estructura cambia de formas que no ha visto.

La respuesta académica llegó el 13 de junio de 2025. Alex Lawsen, investigador de Open Philanthropy, publicó "The Illusion of the Illusion of Thinking" coescrito con el modelo Claude Opus, identificando tres fallos metodológicos en el diseño experimental de Apple: los modelos fallaban porque alcanzaban sus límites de presupuesto de tokens (no por incapacidad de razonar), el script de evaluación penalizaba soluciones parciales correctas como si fueran errores totales, y algunos puzles de cruce de río incluían instancias matemáticamente irresolubles que los modelos identificaban correctamente como imposibles pero que el sistema contabilizaba como fallos.

El debate es genuinamente abierto. Lo que ambas posiciones comparten es la observación de que los fallos de los modelos razonadores tienen patrones: no son aleatorios ni uniformemente distribuidos. Eso es precisamente el tema del siguiente capítulo.

{{ include_html("snippets/modelos-razonadores/01-razonamiento-pasos.html") }}

---

## 5. Por qué la distinción importa en la práctica

Si tratas un LLM como si razonara de la misma forma que un experto humano, tomas decisiones de diseño equivocadas. Confías en sus outputs en contextos donde sus fallos son sistemáticos. Construyes sistemas que funcionan en demo y fallan en producción cuando el input se desvía del patrón aprendido.

Si tratas un LLM como si fuera incapaz de razonar porque no tiene el mismo sustrato que el razonamiento humano, también te equivocas. Infrautilizas una capacidad real que, con las garantías adecuadas, produce valor en casos donde la alternativa humana es más cara, más lenta o igualmente falible.

La posición práctica útil es tratar el razonamiento de los LLMs como un proceso con una curva de rendimiento conocida: funciona bien en ciertos tipos de problemas y falla de forma predecible en otros. El siguiente paso es entender exactamente cuál es esa curva.

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Fuente | Descripción breve |
| --- | --- |
| **Wei et al. (2022)** — *[Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903)* | Paper fundacional del chain-of-thought prompting; demuestra que generar pasos intermedios mejora los resultados en tareas complejas. Citado en §3. |
| **OpenAI (2024)** — *[Learning to Reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/)* | Presentación pública de o1 con los benchmarks de referencia: AIME 2024 (74% con una muestra, 83% con 64), Codeforces (P11→P89) y GPQA Diamond. Citado en §3. |
| **Apple Research (2025)** — *[The Illusion of Thinking](https://machinelearning.apple.com/research/illusion-of-thinking)* | Documenta el colapso de precisión por complejidad y el sobrepensamiento: en tareas simples el modelo encuentra la solución pronto pero continúa explorando alternativas incorrectas. Citado en §4. |
| **Kahneman, D. (2011)** — *[Thinking, Fast and Slow](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow)* (Farrar, Straus and Giroux) | Marco teórico de Sistema 1 y Sistema 2 para contextualizar qué entendemos por razonamiento deliberado frente al reconocimiento automático de patrones. Citado en §1. |
| **Lawsen, A. & Claude Opus (2025)** — *The Illusion of the Illusion of Thinking* (LessWrong, 13 junio 2025) | Respuesta metodológica al paper de Apple Research: los fallos observados se explican por límites de presupuesto de tokens confundidos con incapacidad de razonamiento, penalización incorrecta de soluciones parciales e instancias irresolubles contabilizadas como errores. Citado en §4. |

</details>

---

## Preguntas frecuentes

**¿Hay diferencia real entre un LLM que "razona" y uno que no?**
Sí, en el sentido operativo que importa para el diseño de sistemas. Los modelos razonadores generan una cadena de pasos intermedios antes de producir la respuesta final, y ese proceso se entrena explícitamente con RLVR en lugar de imitación de texto. El resultado observable son mejoras sustanciales en benchmarks de razonamiento: o1 pasó de un 12% a un 74% en AIME 2024 respecto a GPT-4o con una sola muestra. Lo que sigue siendo debatido es si ese proceso merece la misma etiqueta que el razonamiento humano, aunque la distinción no cambia que sus fallos tienen un patrón propio.

**¿Qué diferencia hay entre RLVR y el RLHF estándar?**
RLHF usa evaluaciones humanas para ajustar el comportamiento del modelo: personas valoran respuestas y esa señal dirige el entrenamiento. RLVR usa problemas con respuestas objetivamente verificables (matemáticas, código ejecutable), y la señal de recompensa es una verificación automática de corrección, no una evaluación subjetiva. La diferencia clave es que RLVR puede escalar sin depender de anotadores humanos para cada problema.

**¿Qué es el GRPO y en qué se diferencia del PPO estándar?**
GRPO (Group Relative Policy Optimization), introducido por DeepSeek R1, elimina la necesidad de un modelo crítico separado. En lugar de estimar el valor de cada estado con un segundo modelo, genera varios intentos independientes para el mismo problema y calcula la ventaja de cada uno como su desviación del promedio del grupo. Los intentos mejores que el promedio refuerzan sus estrategias y los peores las penalizan, reduciendo el coste computacional y la inestabilidad de entrenar dos modelos en paralelo.

**¿Por qué el debate sobre si los LLMs razonan genuinamente no está resuelto?**
Porque depende de cómo se defina razonar. Si la definición exige el mismo sustrato que el razonamiento humano, la respuesta es que no. Si la definición se centra en el comportamiento observable (generar pasos correctos, detectar contradicciones, derivar conclusiones válidas en dominios complejos), la respuesta es más matizada. El paper de Apple Research (2025) mostró colapso de precisión por encima de un umbral de complejidad. El paper de respuesta de Lawsen y Claude Opus (2025) cuestionó el diseño experimental. Ninguna de las dos posiciones ha cerrado el debate.
