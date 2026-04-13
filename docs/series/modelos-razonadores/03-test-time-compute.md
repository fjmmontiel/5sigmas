---
title: Test-Time Compute
description: "Test-time compute como segunda ley de escala. Las tres palancas (más pasos, más candidatos, más estructura) y su perfil de calidad, coste y latencia en modelos razonadores."
date: 2026-04-10
keywords: "test-time compute, razonamiento LLM, best-of-N, chain of thought, PRM, ORM, leyes de escala, razonamiento extendido, budget forcing, DeepSeek R1, MCTS, self-consistency, Tree of Thoughts"
tags:
  - IA
  - LLMs
  - Razonamiento
---

# Capítulo 3 — Test-Time Compute

Los capítulos anteriores establecieron que el razonamiento de los LLMs consume recursos y produce fallos predecibles. Este capítulo añade la pieza que conecta todo: ese proceso tiene una ley de escala propia. Al terminarlo, el lector entenderá qué es el test-time compute y por qué representa una segunda dimensión de escala independiente del entrenamiento, conocerá las tres palancas para traducir más cómputo en mejores respuestas (más pasos, más candidatos, más estructura), y sabrá qué perfil de intercambios tiene cada palanca en términos de calidad, coste y latencia.

!!! info "Prerrequisitos"
    Este capítulo asume que conoces los conceptos de los capítulos anteriores: [Capítulo 1 — Qué es "razonar"](./01-que-es-razonar.md) y [Capítulo 2 — Fallos](./02-fallos.md).

La observación central es que gastar más cómputo en el momento de generar la respuesta (tiempo de inferencia) produce mejores respuestas, de forma predecible y en determinadas categorías de problemas. A eso se le llama la ley de escala de test-time compute.

---

## 1. Qué es test-time compute y por qué importa

Durante mucho tiempo, la única palanca conocida para mejorar la calidad de un LLM era la escala de entrenamiento: más parámetros, más datos, más cómputo en el entrenamiento. Las "leyes de escala" ([Kaplan et al., 2020](https://arxiv.org/abs/2001.08361)) documentaron que esa relación era predecible y sistemática.

Test-time compute propone una segunda dimensión en las leyes de escala: no solo cuánto se invirtió en entrenar el modelo, sino cuánto se invierte en cada respuesta individual. Así como un estudiante puede dar una respuesta mejor si tiene más tiempo para pensar sobre el problema, un modelo puede producir mejores outputs si se le permite procesar más antes de generar el resultado final.

La diferencia con el entrenamiento es la flexibilidad: el coste de entrenamiento se paga una vez y es fijo para todos los usuarios. El test-time compute es variable por consulta y se puede ajustar en función del problema, del contexto y de lo que el usuario está dispuesto a pagar en latencia y coste.

> La implicación práctica es que el presupuesto de cómputo se convierte en una variable de diseño. Para una tarea rutinaria, usar poco cómputo. Para un problema que merece razonamiento profundo, asignar más. Ya no es solo "¿qué modelo usamos?" sino "¿cuánto pensamos en este problema?".

---

## 2. Las tres palancas

Hay tres mecanismos principales para traducir más cómputo en mejores respuestas.

### Palanca 1: Más pasos internos

La cadena de pensamiento (chain-of-thought, [Wei et al., 2022](https://arxiv.org/abs/2201.11903)) es el mecanismo más directo. En lugar de generar la respuesta final inmediatamente, el modelo genera primero una secuencia de pasos intermedios que descomponen el problema. Esos pasos ocupan tokens en el contexto, lo que significa más procesamiento, pero la respuesta final se beneficia de haber resuelto los subproblemas de forma explícita.

Los modelos razonadores modernos (o1, o3, Claude con pensamiento extendido) han internalizado este proceso: en lugar de que el usuario tenga que pedir explícitamente "piensa paso a paso", el modelo decide autónomamente cuándo y cuánto extender su cadena de razonamiento según la complejidad percibida del problema.

Una técnica relevante para controlar esta extensión es el "budget forcing": suprimir el token que señala el fin del razonamiento y añadir la palabra "Wait" para forzar al modelo a continuar deliberando. El modelo s1-32B ([Muennighoff et al., 2025](https://arxiv.org/abs/2501.19393)), entrenado sobre solo 1.000 ejemplos curados, aplicó esta técnica para igualar o superar a o1-preview en benchmarks de matemáticas de competición, con una mejora de 50% a 56,7% en AIME24 gracias al forzado de presupuesto. La idea es sencilla: si el modelo está a punto de dar una respuesta incorrecta, el forzado lo lleva a revisarla.

La ganancia es más pronunciada en problemas que requieren pasos encadenados (matemáticas de varias operaciones, razonamiento lógico multinivel, código con dependencias complejas) y menos pronunciada en tareas de recuperación o generación donde el conocimiento relevante está directamente accesible en los parámetros.

### Palanca 2: Más generación de candidatos

En lugar de generar una única respuesta, el modelo genera varias respuestas independientes para el mismo prompt y luego selecciona la mejor. La selección puede hacerse por mayoría (self-consistency: elegir la respuesta que aparece más entre los candidatos), por un modelo evaluador separado (best-of-N con scoring), o por alguna combinación de ambos.

El principio es estadístico: si cada respuesta individual tiene una probabilidad p de ser correcta y las respuestas son suficientemente independientes entre sí, generar N candidatos y seleccionar el mejor aumenta la probabilidad de que al menos una sea correcta. El coste es N veces el coste de una respuesta individual.

Este método es especialmente efectivo para problemas donde la respuesta correcta es verificable (matemáticas, código que puede ejecutarse y testearse) porque el proceso de selección puede usar la verificación como señal de calidad en lugar de depender de otro LLM. La distinción entre cómo se selecciona el mejor candidato importa: los Process Reward Models (PRM) puntúan cada paso intermedio del razonamiento, mientras que los Outcome Reward Models (ORM) solo evalúan la respuesta final ([Lightman et al., 2023](https://arxiv.org/abs/2305.20050)). Los PRM permiten detectar errores antes de que se propaguen y son más efectivos como guías de búsqueda en árbol, aunque requieren más supervisión para construirse. Un ORM puede reforzar un atajo que llegó a la respuesta correcta por suerte, o penalizar un razonamiento correcto que cometió un error de cálculo en el último paso. Los PRM evitan ambos problemas.

{{ include_html("snippets/modelos-razonadores/03-prm-orm-comparacion.html") }}

El mecanismo de best-of-N con distintos criterios de selección tiene perfiles de rendimiento y coste bien documentados: la ganancia es alta en los primeros candidatos y decrece de forma sublogarítmica. Pasar de N=1 a N=4 da el mayor salto; de N=32 a N=64, mucho menos con el doble de coste.

{{ include_html("snippets/modelos-razonadores/03-best-of-n-visual.html") }}

### Palanca 3: Más estructura en el proceso

La búsqueda en árbol ([Yao et al., 2023](https://arxiv.org/abs/2305.10601), MCTS aplicado a razonamiento) lleva el concepto más lejos: en lugar de generar una cadena lineal de pasos, el modelo explora múltiples ramificaciones del razonamiento en paralelo, evalúa el progreso de cada rama y descarta las que parecen menos prometedoras antes de continuar.

El resultado es una exploración más amplia del espacio de soluciones, a costa de un coste computacional mucho mayor. Para problemas de alta complejidad (planificación estratégica, resolución de problemas de optimización), este enfoque produce resultados mejores que la cadena lineal aunque con un perfil de coste muy distinto.

{{ include_html("snippets/modelos-razonadores/03-ttc-palancas.html") }}

---

## 3. Relación entre calidad, coste y latencia

Las tres palancas no son gratuitas. Cada una tiene un perfil de intercambios que es necesario entender antes de usarlas.

### Coste

Más pasos internos significa más tokens generados, y el coste de los modelos de IA generativa se factura por token. Una respuesta con cadena de pensamiento de cien pasos puede costar diez veces más que la respuesta directa del mismo modelo, independientemente de si la mejora de calidad justifica esa diferencia.

La generación de candidatos multiplica el coste directamente: best-of-5 cuesta cinco veces más que best-of-1. La búsqueda en árbol puede costar órdenes de magnitud más que la cadena lineal para el mismo problema.

### Latencia

El tiempo que el usuario espera antes de recibir la respuesta crece proporcionalmente al test-time compute. Una cadena de pensamiento larga puede tardar decenas de segundos en una tarea que antes respondía en uno o dos. En sistemas donde la latencia importa para la experiencia del usuario (asistentes conversacionales, sistemas en tiempo real), este es el límite operativo más estricto.

El streaming (mostrar la respuesta mientras se genera) suaviza la percepción de latencia pero no resuelve el problema: si el usuario necesita esperar a que termine la cadena de pensamiento antes de recibir algo útil, la latencia real no cambia aunque la experiencia subjetiva mejore.

La causa estructural de ese límite es que la cadena de razonamiento es **secuencial por construcción**. Cada token depende del anterior: el paso 500 de un razonamiento no se puede calcular antes de que existan los pasos 1 a 499. Eso significa que la latencia mínima de una consulta está acotada por `longitud_de_cadena ÷ velocidad_de_generación`. Con los modelos actuales generando en torno a 100 tokens por segundo, una cadena de 5.000 tokens impone un mínimo de 50 segundos que ninguna optimización de arquitectura o red puede eliminar sin acortar la cadena. Sin embargo, ese denominador no es fijo: si la velocidad de generación sube a 1.000 tokens por segundo (hardware especializado de inferencia como las LPU de Groq, o avances en decodificación especulativa), esa misma cadena de 5.000 tokens tarda 5 segundos. A 10.000 tokens por segundo, tarda 0,5 segundos. Lo que hoy es un límite práctico se convierte en latencia imperceptible sin cambiar nada en el modelo ni en la longitud del razonamiento. El capítulo siguiente examina cómo ese suelo afecta al diseño de producto en el estado actual del hardware.

### Rendimientos decrecientes

La relación entre más cómputo y mejor respuesta no es lineal. Hay problemas donde agregar más pasos de razonamiento mejora el resultado de forma consistente hasta cierto punto, y luego el beneficio marginal decrece. En algunos casos (overthinking), añadir más pasos puede deteriorar la respuesta porque el modelo introduce complejidad innecesaria o revisa conclusiones correctas por motivos espurios.

> El diseño correcto de sistemas que usan test-time compute requiere entender qué tipo de problemas se benefician de qué tipo de palanca, y con qué presupuesto de coste y latencia. Usar cadenas de pensamiento largas en preguntas factuales simples es un coste sin beneficio. Usar respuesta directa en razonamiento matemático complejo es calidad sacrificada innecesariamente.

---

## 4. Test-time compute como ley de escala complementaria

La observación más importante es que test-time compute y pre-entrenamiento no son sustitutos sino complementarios. Un modelo más grande entrenado con más datos tiene un techo de calidad superior cuando se le aplica test-time compute. Un modelo pequeño con mucho test-time compute puede, en algunos tipos de problemas, igualar o superar a un modelo grande con poco tiempo de razonamiento.

Los datos de benchmarks ilustran la escala del impacto: en AIME 2024, o1 con consenso entre 64 muestras alcanzó el 83%, frente al 13% de GPT-4o con respuesta directa ([OpenAI, 2024](https://openai.com/index/learning-to-reason-with-llms/)). En GPQA Diamond (ciencia PhD), Claude 3.7 Sonnet con 256 muestras paralelas y un modelo de puntuación aprendido alcanzó el 84.8% ([Anthropic, 2025](https://www.anthropic.com/claude-3-7-sonnet-system-card)). Benchmarks como GSM8K o MATH están ya saturados (los modelos de frontera superan el 95%), de modo que AIME y GPQA son actualmente los más informativos para medir el impacto del test-time compute en razonamiento real.

Esta complementariedad tiene consecuencias económicas: el coste de un sistema de IA de alta calidad ya no viene determinado solo por el tamaño del modelo que se usa, sino por la combinación de capacidad del modelo y presupuesto de cómputo por consulta. Los sistemas más eficientes no serán necesariamente los que usen los modelos más grandes para todo, sino los que enruten cada problema al modelo y al nivel de test-time compute apropiados.

{{ include_html("snippets/modelos-razonadores/03-escala-complementaria.html") }}

El capítulo siguiente traduce estas ideas al problema concreto del producto: qué pasa cuando el tiempo de cómputo no es un número en un paper sino segundos reales que un usuario espera.

---

!!! tip "Siguiente lectura"
    Más cómputo en papel; segundos reales en producto. El capítulo siguiente traduce esa diferencia al diseño de producto: [Capítulo 4 — Tiempo físico: latencia, streaming e interacción humana →](./04-latencia-streaming.md)

## 5. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Fuente | Descripción breve |
| --- | --- |
| **Wei et al. (2022)** — *[Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903)* | Fundamento del razonamiento paso a paso; demuestra que los pasos intermedios mejoran la calidad en tareas complejas. Citado en §2.1 (Palanca 1). |
| **Wang et al. (2022)** — *[Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171)* | Demuestra que generar N respuestas independientes y seleccionar por mayoría mejora sistemáticamente la fiabilidad. Citado en §2.2 (Palanca 2). |
| **Yao et al. (2023)** — *[Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601)* | Extensión del CoT a búsqueda en árbol con evaluación y poda de ramas. Citado en §2.3 (Palanca 3). |
| **Snell et al. (2024)** — *[Scaling LLM Test-Time Compute Optimally](https://arxiv.org/abs/2408.03314)* | Análisis sistemático de cuándo y cuánto TTC es eficiente según el tipo de problema: PRMs vs ORMs, best-of-N vs beam search. |
| **OpenAI (2024)** — *[Learning to Reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/)* | Benchmarks de o1: AIME 2024 (13% GPT-4o → 74% o1 → 83% o1×64) y GPQA Diamond superando el nivel de expertos PhD. Citado en §4. |
| **Muennighoff et al. (2025)** — *[s1: Simple Test-Time Scaling](https://arxiv.org/abs/2501.19393)* | Budget forcing con 1.000 ejemplos curados en Qwen2.5-32B: AIME24 50%→56,7%, superando a o1-preview (44,6%) con 26 minutos de entrenamiento. Citado en §2.1 y §4. |
| **Anthropic (2025)** — *[Claude 3.7 Sonnet System Card](https://www.anthropic.com/claude-3-7-sonnet-system-card)* | 84,8% en GPQA Diamond con 256 muestras paralelas y modelo de puntuación; benchmark de referencia para el impacto del TTC en ciencia PhD. Citado en §4. |
| **Kaplan et al. (2020)** — *[Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361)* | Establece que la calidad de los LLMs escala de forma predecible con parámetros, datos y cómputo de entrenamiento. Base conceptual sobre la que el TTC añade la segunda dimensión. Citado en §1. |
| **Lightman et al. (2023)** — *[Let's Verify Step by Step](https://arxiv.org/abs/2305.20050)* | Introduce los Process Reward Models (PRM): puntuar cada paso intermedio produce señales de entrenamiento más densas y permite detectar errores antes de que se propaguen. Citado en §2.2. |

</details>

---

## Preguntas frecuentes

**¿Cuándo conviene usar PRM en lugar de ORM?**
Los PRM son más eficaces como guías de búsqueda porque puntúan cada paso intermedio, lo que permite detectar y podar ramas incorrectas antes de que lleguen al resultado final. Los ORM son más simples de construir pero pueden reforzar atajos que llegaron a la respuesta correcta por suerte. Para problemas donde el proceso importa (razonamiento matemático complejo, código con dependencias encadenadas) y hay presupuesto para construir el evaluador, los PRM producen mejores señales de selección.

**¿El test-time compute sustituye al escalado del entrenamiento o lo complementa?**
Lo complementa. Un modelo más grande entrenado con más datos tiene un techo de calidad superior cuando se le aplica test-time compute. Un modelo pequeño con mucho TTC puede igualar a un modelo grande en ciertos tipos de problemas, pero no en todos. La elección correcta no es modelo grande versus TTC, sino calibrar qué combinación produce la calidad necesaria al coste y latencia que el sistema puede asumir.

**¿Qué es el budget forcing y en qué casos tiene sentido?**
Budget forcing suprime el token que señala el fin del razonamiento y añade una señal para que el modelo continúe deliberando. Es útil cuando el modelo tiende a producir respuestas rápidas de baja calidad en problemas que requieren más análisis. Tiene sentido en tareas con respuestas verificables donde el coste de una respuesta incorrecta es alto y la latencia adicional es tolerable.

**¿Qué tipo de problemas se benefician más del chain-of-thought?**
Los problemas con estructura secuencial y dependencias explícitas: matemáticas de varias operaciones, razonamiento lógico multinivel, código con dependencias complejas entre funciones. Los que se benefician menos son las tareas de recuperación factual directa (donde el conocimiento está accesible en los parámetros sin necesidad de razonamiento encadenado) y las preguntas de elección múltiple con respuestas cortas y bien definidas.

