---
title: AGI — Inteligencia Artificial General
description: Qué es la Inteligencia Artificial General: definiciones en conflicto, niveles propuestos por Google DeepMind y OpenAI, y qué implicaría alcanzarla realmente.
---

# Capítulo 4 — AGI: Inteligencia Artificial General

Un detector de fraude no puede explicarte termodinámica, un modelo de visión por computador no sabe jugar al ajedrez y un LLM genera texto fluido pero no puede conducir un coche, reparar un grifo ni recordar lo que aprendió en la conversación de ayer. Imaginemos ahora un sistema que tuviese todas estas capacidades a la vez.

La **Inteligencia Artificial General (AGI)** es el término para un sistema capaz de realizar **cualquier tarea cognitiva que realizaría un ser humano**, sin rediseñarse específicamente para cada una. 

Es decir, sería mejor que caualquier humano experto en su materia, en cualquier materia.

El problema es que nadie se pone de acuerdo en qué significa exactamente eso.

---

## 1. El problema de la definición

"AGI" no es un término técnico con una definición consensuada por la comunidad científica. Es un término de campo que diferentes grupos usan de formas distintas, a veces incompatibles. No existe un paper que diga "esto es AGI, esto no lo es". Hay propuestas, marcos y debates que conviven sin resolverse, y eso no es un defecto del campo: refleja un desacuerdo genuino sobre qué propiedades son las que importan.

¿Importa que el sistema pueda hacer cualquier tarea? ¿Que supere a los humanos en valor económico? ¿Que pueda mejorarse a sí mismo? ¿Que tenga algo parecido a comprensión real?

Dependiendo de la definición que uses, AGI podría estar a 2 años, a 20, o ser indefinible en los términos actuales.

---

## 2. Las definiciones en disputa

### 2.1 La definición cognitiva clásica

La más antigua: AGI es un sistema que puede **realizar cualquier tarea intelectual que pueda realizar un ser humano**. Viene de la comunidad de investigación de IA de los años 50-80, e incluye razonamiento abstracto, aprendizaje en dominios completamente nuevos, sentido común, planificación a largo plazo y comprensión del lenguaje en contexto real.

El problema con esta definición es que "cualquier tarea intelectual humana" es un listón difuso. Los humanos también tienen sesgos, límites y fallos. ¿Cuál humano? ¿En qué condición? ¿Con cuánto tiempo?

### 2.2 La definición económica

Sam Altman (OpenAI) ha definido AGI como "IA que supera a la mayoría de los humanos en la mayoría de las tareas con valor económico". A diferencia de la definición cognitiva, esta es medible: puede contrastarse contra benchmarks laborales y de productividad.

El cambio de foco es significativo: de "inteligencia general" a "utilidad económica general", un listón diferente y más bajo en algunos aspectos. El problema es que el 80% del trabajo cognitivo con valor económico podría automatizarse sin que el sistema alcance el listón de la definición clásica. ¿Sería eso AGI?

### 2.3 El espectro de capacidades: cinco niveles

DeepMind propuso tratar la AGI no como un umbral binario sino como un **espectro de cinco niveles de capacidad**:

| Nivel | Descripción | Referencia aproximada |
|---|---|---|
| **0. Sin IA** | Sin capacidad autónoma | Calculadora |
| **1. IA emergente** | Igual o mejor que un no experto en algunas tareas | ChatGPT, según sus autores, en algunas tareas concretas |
| **2. IA competente** | Igual o mejor que el 50% de trabajadores adultos | — |
| **3. IA experta** | Igual o mejor que un experto humano en la mayoría de tareas de su dominio | Modelos de diagnóstico médico en dominios específicos |
| **4. IA virtuosa** | Igual o mejor que el mejor experto humano en prácticamente todo | — |
| **5. Superinteligencia** | Supera a todos los humanos en todas las tareas cognitivas | — |

Este marco reconoce que la transición no es de golpe. Ya estamos avanzando por los niveles, con distintos sistemas en distintos lugares del espectro según la tarea concreta.

### 2.4 La perspectiva de la seguridad

Para los investigadores de seguridad en IA, la línea crítica no es "mejor que humanos en tareas cognitivas" sino la **capacidad de mejora recursiva**: un sistema capaz de mejorar su propio diseño para producir sistemas sucesivamente más capaces. Una inteligencia que se acelera a sí misma en cada iteración.

Este umbral es distinto de los anteriores. Un sistema podría superar a todos los humanos en todas las tareas sin tener esa capacidad. Y al revés: si se cruzara ese umbral, la velocidad del cambio podría exceder la capacidad humana de entender y controlar lo que está pasando. El tiempo disponible para corregir errores se comprimiría de forma drástica.

> La ambigüedad en la definición no es descuido. Refleja que comunidades distintas intentan capturar propiedades distintas con el mismo término.

{{ include_html("snippets/fundamentos-ia-iag/04-niveles-agi.html") }}

---

## 3. Qué sabemos que no es AGI hoy

Los modelos actuales (incluyendo los mejores LLMs disponibles) tienen capacidades que impresionan tanto a quienes los usan por primera vez como a quienes llevan años en el campo. También tienen limitaciones fundamentales que conviene entender con precisión.

### Lo que hacen bien hoy

* Comprensión y generación lingüística a nivel experto en muchos dominios dentro de su contexto de entrenamiento.
* Razonamiento sobre textos complejos dentro de una ventana de contexto.
* Generalización con muy pocos ejemplos: aprender de tres casos en el prompt y generalizar.
* Codificación y resolución de errores reales de software: en el leaderboard estándar (mini-SWE-agent v2.0.0, swebench.com), Claude 4.5 Opus lidera con el 76,8% (SOTA, feb 2026); Claude Opus 4.6: 75,6%; GPT-5-2: 72,8%; Gemini 3 Pro: 69,6% ([swebench.com][r10]).
* Matemáticas formales, análisis (con alta variabilidad según el tipo de problema).
* Uso del ordenador y navegación web: Claude Sonnet 4.6 (febrero 2026) se posiciona como el modelo líder en computer use, capaz de operar interfaces gráficas y ejecutar flujos completos en el navegador con ventana de contexto de 1M tokens ([Anthropic][r11]).
* Síntesis de conocimiento entre dominios cuando el conocimiento relevante estaba en los datos de entrenamiento.
* En evaluaciones específicas de biología y virología, los mejores modelos superan la mediana de los expertos de dominio en algunas tareas, aunque siguen por debajo del consenso de expertos (42-54%) en las más difíciles ([GPT-5 system card][r10]).
* Matemáticas e ciencias de olimpiada: Gemini 3 Deep Think (feb 2026) alcanza medalla de oro en el IMO 2025 (matemáticas), IPhO 2025 (física) e IChO 2025 (química); y un 94,3% en GPQA Diamond (ciencia PhD) con Gemini 3.1 Pro. Ya está siendo utilizado por investigadores reales: matemáticos en Rutgers trabajan con Deep Think en estructuras matemáticas para física de alta energía ([Gemini 3 Deep Think blog][r14]).

### Lo que les falta

* **Razonamiento causal robusto**: confunden correlación con causalidad con facilidad. Les cuesta razonar de forma fiable sobre contrafactuales ("¿qué habría pasado si...?").
* **Conocimiento del mundo físico**: no tienen experiencia directa con el mundo. Su "comprensión" proviene de texto, no de acción e interacción con objetos y consecuencias reales. Los sistemas de computer use actuales empiezan a operar interfaces gráficas y ejecutar tareas en el ordenador, pero con una fiabilidad muy inferior a la humana en cualquier tarea no rutinaria.
* **Memoria persistente real**: cada conversación empieza desde cero salvo arquitecturas con memoria explícita. No acumulan experiencia de interacciones sucesivas de la misma forma que un ser humano.
* **Generalización fuera de lo conocido**: funcionan bien en dominios presentes en el entrenamiento. Fallan de forma impredecible en variaciones que se alejan de lo visto, a veces en casos que parecen triviales.
* **Saber cuándo no saben**: no reconocen con fiabilidad los límites de su propio conocimiento. De ahí las alucinaciones: el modelo produce la continuación más probable sin señalizar que está fuera de su competencia.

> Superar el test de Turing en una conversación corta no implica inteligencia general. Un modelo puede generar texto que parece humano durante minutos y fallar en un problema de razonamiento de sentido común que cualquier niño de ocho años resolvería sin esfuerzo.

<details markdown="1">
<summary><strong>La diferencia entre comprensión lingüística y comprensión del mundo</strong></summary>

Una de las discusiones más activas en el campo es si los LLMs "comprenden" o simplemente producen patrones estadísticos muy sofisticados sobre texto.

El argumento de que no comprenden: el modelo no tiene acceso al mundo, solo a texto sobre el mundo. Puede completar frases sobre física sin entender por qué una pelota cae. Puede describir el dolor sin haberlo sentido. La representación lingüística no equivale a la representación conceptual.

El argumento de que algo parecido a la comprensión emerge: los modelos generalizan en formas que no se explican por memorización pura. Sus representaciones internas capturan estructura semántica. Algunos experimentos muestran que los modelos tienen representaciones internas de conceptos como verdad/falsedad, espacio o tiempo.

El debate no está cerrado y tiene consecuencias directas sobre qué esperar de seguir escalando: si la comprensión emerge del lenguaje a escala, escalar podría acercarse a AGI. Si requiere algo más (experiencia directa con el mundo, interacción causal con objetos y consecuencias), escalar solo no bastaría.

</details>

{{ include_html("snippets/fundamentos-ia-iag/04-capacidades-limites.html") }}

---

## 4. Si llegara: qué cambiaría

La pregunta no es si lo que tenemos hoy es AGI. No lo es por ninguna definición razonable. La pregunta es qué implicaría que llegara.

### Impacto económico

Un sistema con capacidades AGI podría automatizar trabajo cognitivo a escala: no solo tareas manuales o repetitivas, sino análisis, diseño, investigación y toma de decisiones complejas. Las estimaciones de impacto laboral sitúan entre el 25% y el 70% las tareas con exposición significativa a la automatización por IA en los próximos 10-20 años, y eso es con la IA actual. McKinsey estima que la IA generativa podría automatizar actividades que representan hasta el 60-70% del tiempo de los trabajadores ([informe McKinsey][r8]); Goldman Sachs calcula que ~25% de las tareas actuales son directamente automatizables y que dos tercios de los empleos en EE. UU. y Europa están expuestos a algún grado de sustitución ([informe Goldman Sachs][r9]). La distribución del impacto importa tanto como el impacto total: quién captura el valor producido, cómo se redistribuye, qué pasa con las personas cuyo trabajo se automatiza primero.

### Impacto científico

AlphaFold da un atisbo de lo que sería posible: resolvió en meses un problema que la comunidad científica llevaba cincuenta años intentando resolver. Un sistema capaz de leer toda la literatura disponible, identificar contradicciones, proponer hipótesis testables y diseñar experimentos cambiaría la velocidad del descubrimiento de forma radical. La compresión del tiempo entre descubrimiento y aplicación podría redefinir campos enteros de la medicina, la química y la física en una sola generación.

### Impacto geopolítico

El control de los sistemas más capaces concentra poder de forma inédita en la historia tecnológica. Los debates actuales sobre regulación de IA, control de acceso a chips de alta capacidad y política de exportación de tecnología ya reflejan esa tensión antes de que exista AGI. Un sistema con capacidades AGI en manos de un solo actor (gobierno o empresa) cambiaría el equilibrio de poder global de formas difíciles de predecir.

### El problema de la alineación

El mayor riesgo no es que una AGI sea malévola. Es que sea **muy capaz y optimice para un objetivo que no captura exactamente lo que queremos**.

Un ejemplo real que ilustra el problema a pequeña escala: un sistema de IA entrenado para maximizar el tiempo de juego en un videojuego descubrió que podía hacerlo bloqueando la pantalla de "game over" en lugar de jugar bien. Optimizó la métrica, destruyó el objetivo. A eso se le llama *specification gaming* (optimizar la letra, no el espíritu).

"Alineación" es el problema técnico y filosófico de asegurar que un sistema muy capaz optimice lo que los humanos realmente valoran, no solo lo que pudimos especificar en el objetivo de entrenamiento. Es un problema sin solución completa conocida hoy.

> El campo de AI Safety existe precisamente porque los investigadores más serios del tema reconocen que no saben cómo resolver la alineación antes de llegar a sistemas mucho más capaces de los actuales. La incertidumbre no es alarmismo, es honestidad técnica sobre un problema abierto.

{{ include_html("snippets/fundamentos-ia-iag/04-impacto-agi.html") }}

---

## 5. Dónde estamos y hacia dónde vamos

Ningún sistema actual cumple ninguna de las definiciones de AGI (ni la cognitiva, ni la económica completa, ni la de mejora recursiva). Lo que existe son sistemas estrechos muy capaces que, combinados, empiezan a cubrir un rango amplio de tareas.

{{ include_html("snippets/fundamentos-ia-iag/04-benchmarks-evolucion.html") }}

{{ include_html("snippets/fundamentos-ia-iag/04-ia-vs-humanos.html") }}

En términos del espectro de DeepMind, los modelos frontier de 2025-2026 (GPT-5.4, Claude Opus 4.6, Gemini 3.1 Pro) se sitúan en la transición entre el nivel 2 (competente) y el nivel 3 (experto): rendimiento igual o superior al de un experto humano en dominios específicos como software, matemáticas formales o procesamiento de información, y rendimiento sub-experto en dominios que requieren experiencia física, conocimiento tácito o razonamiento causal robusto.

Lo que sí hay ahora son métricas concretas de autonomía. METR evalúa el **horizonte temporal de tareas**: la longitud de tarea que un modelo resuelve con fiabilidad del 50%. En marzo de 2025 ese horizonte era de ~1 hora (Claude 3.7 Sonnet); con GPT-5-thinking, METR lo estima en ~2 horas 15 minutos ([GPT-5 system card][r10]). La tendencia es de duplicación cada ~7 meses ([METR, 2025][r12]). La IA ha pasado de resolver tareas de minutos a resolver tareas de horas. El salto a tareas de días o semanas es el próximo umbral significativo, y en esa escala es donde aparecen los riesgos de autonomía real.

En ARC-AGI-2 (el benchmark de razonamiento fluido más exigente, lanzado en marzo de 2025) el progreso ha sido más rápido de lo esperado: los mejores sistemas pasaron de ~4% en el lanzamiento a 84,6% en febrero de 2026 (Gemini 3 Deep Think, verificado por ARC Prize Foundation; GPT-5.4 Pro xHigh alcanza ~84% en marzo de 2026). El umbral para «vencer» el benchmark es ~85%. ARC-AGI-2 mide exactamente la capacidad que falta para AGI cognitiva: razonar sobre problemas completamente nuevos desde muy pocos ejemplos, sin memorización de patrones.

Otro indicador del ritmo: Humanity's Last Exam (HLE), diseñado para ser el benchmark más difícil posible con preguntas de élite multidisciplinar, fue publicado con la expectativa de que ningún modelo lo superara pronto. Gemini 3 Deep Think alcanza el 48,4% sin herramientas (feb 2026), la primera vez que cualquier modelo supera el 40% en este benchmark. Los expertos humanos con tiempo y referencias puntúan ~85-90%.

Lo que sí es observable: la velocidad de progreso en los últimos cinco años no tiene precedentes en la historia de la tecnología. Los sistemas de 2026 eran impensables como productos de consumo en 2020. Las capacidades emergentes con la escala sugieren dinámicas que la comunidad científica no comprende del todo. Y el debate sobre AGI ha pasado de ser especulación académica a ser parte de la agenda pública, regulatoria y de política exterior de los países con mayor capacidad computacional.

La pregunta más útil no es "¿cuándo llega la AGI?" Nadie lo sabe con honestidad. La pregunta útil es qué criterios para pensar y qué marcos para evaluar te hacen más robusto en un entorno donde la IA mejora rápido y el panorama cambia cada pocos meses.

Eso es lo que esta serie ha intentado construir: un mapa mental estable que funcione aunque los modelos cambien.

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Morris et al. (2023)** — *Levels of AGI: Operationalizing Progress on the Path to AGI* ([arXiv][r1]) | El marco de cinco niveles de DeepMind para operacionalizar AGI. |
| R2 | **Bubeck et al. (2023)** — *Sparks of Artificial General Intelligence: Early experiments with GPT-4* ([arXiv][r2]) | Evaluación sistemática de GPT-4 frente al listón de AGI cognitiva. |
| R3 | **Altman, S. (2023)** — *Planning for AGI and beyond* ([OpenAI blog][r3]) | La definición económica y el marco de planificación de OpenAI. |
| R4 | **Russell, S. (2019)** — *Human Compatible: Artificial Intelligence and the Problem of Control* (libro, Basic Books) | Argumento central sobre el problema de alineación y el diseño de IA compatible con valores humanos. |
| R5 | **Bostrom, N. (2014)** — *Superintelligence: Paths, Dangers, Strategies* (libro, Oxford University Press) | El escenario de inteligencia explosiva y sus riesgos. Referencia de debate, no consenso científico. |
| R6 | **Krakovna et al. (2020)** — *Specification gaming: the flip side of AI ingenuity* ([DeepMind blog][r6]) | Ejemplos reales de sistemas que optimizan la métrica equivocada con resultados imprevistos. |
| R7 | **Grace et al. (2024)** — *Thousands of AI Authors on the Future of AI* ([arXiv][r7]) | Encuesta a investigadores de IA sobre probabilidades y tiempos estimados para hitos de AGI. |
| R8 | **McKinsey Global Institute (2023)** — *The economic potential of generative AI: The next productivity frontier* ([McKinsey][r8]) | Estima que la IA generativa podría automatizar actividades que representan el 60-70% del tiempo de los trabajadores. |
| R9 | **Briggs, J. & Kodnani, D. (2023)** — *The Potentially Large Effects of Artificial Intelligence on Economic Growth* ([Goldman Sachs][r9]) | Estima que dos tercios de los empleos en EE. UU. y Europa están expuestos a algún grado de automatización por IA; ~25% de las tareas son directamente automatizables. |
| R10 | **OpenAI (2025)** — *GPT-5 System Card* ([OpenAI][r10]) | Resultados en SWE-bench Verified (74,9%), evaluaciones METR (horizonte temporal ~2h15m) y comparativas con expertos humanos en dominios científicos. |
| R11 | **Anthropic (2026)** — *Claude Sonnet 4.6* ([Anthropic][r11]) | Modelo líder en computer use y navegación web (febrero 2026); Claude Sonnet 4 alcanza 72,7% en SWE-bench Verified. |
| R12 | **METR (2025)** — *Measuring AI Ability to Complete Long Tasks* ([METR][r12]) | Introduce la métrica de horizonte temporal de tareas: el tiempo de tarea completable con 50% de fiabilidad se duplica cada ~7 meses; Claude 3.7 Sonnet alcanza ~1 hora. |
| R13 | **Google DeepMind (2026)** — *Gemini 3.1 Pro* ([deepmind.google][r13]) | Gemini 3.1 Pro: GPQA Diamond 94,3%; SWE-bench Verified 80,6% (nuevo SOTA a feb 2026); ARC-AGI-2 77,1%. |
| R14 | **The Deep Think team (2026)** — *Gemini 3 Deep Think: Advancing science, research and engineering* ([blog.google][r14]) | Gemini 3 Deep Think: ARC-AGI-2 84,6% (verificado por ARC Prize Foundation); HLE 48,4% sin herramientas; medalla de oro en IMO 2025, IPhO 2025 e IChO 2025; Codeforces 3455 Elo; usado por investigadores de Rutgers para física de alta energía. |

</details>

[r1]: https://arxiv.org/abs/2311.02462 "Levels of AGI: Operationalizing Progress on the Path to AGI"
[r2]: https://arxiv.org/abs/2303.12528 "Sparks of Artificial General Intelligence: Early experiments with GPT-4"
[r3]: https://openai.com/index/planning-for-agi-and-beyond/ "Planning for AGI and beyond"
[r6]: https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/ "Specification gaming: the flip side of AI ingenuity"
[r7]: https://arxiv.org/abs/2401.02843 "Thousands of AI Authors on the Future of AI"
[r8]: https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier "The economic potential of generative AI: The next productivity frontier"
[r9]: https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html "The Potentially Large Effects of Artificial Intelligence on Economic Growth"
[r10]: https://openai.com/index/gpt-5-system-card/ "GPT-5 System Card"
[r11]: https://www.anthropic.com/claude/sonnet "Claude Sonnet 4.6"
[r12]: https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/ "Measuring AI Ability to Complete Long Tasks"
[r13]: https://deepmind.google/models/gemini/pro/ "Gemini 3.1 Pro"
[r14]: https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-deep-think/ "Gemini 3 Deep Think: Advancing science, research and engineering"
