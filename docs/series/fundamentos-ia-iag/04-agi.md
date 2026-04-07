---
title: AGI — Inteligencia Artificial General
description: "Qué es la Inteligencia Artificial General: definiciones en conflicto, niveles propuestos por Google DeepMind y OpenAI, y qué implicaría alcanzarla realmente."
date: 2026-03-20
keywords: "agi, inteligencia artificial general, qué es agi, agi definición, deepmind niveles agi, superinteligencia, alineamiento ia, agi openai, agi riesgos"
---

# Capítulo 4 — AGI: Inteligencia Artificial General

!!! info "Prerrequisitos"
    Este capítulo cierra la serie. Para sacar el máximo provecho, conviene haber leído los tres capítulos anteriores: [Capítulo 1 — Qué es IA](./01-que-es-ia.md), [Capítulo 2 — Qué es IA Generativa](./02-que-es-ia-generativa.md) y [Capítulo 3 — IA vs IA Generativa](./03-ia-vs-ia-generativa.md).

Un detector de fraude no puede explicarte termodinámica, un modelo de visión por computador no sabe jugar al ajedrez y un LLM genera texto fluido pero no puede conducir un coche, reparar un grifo ni recordar lo que aprendió en la conversación de ayer. Imaginemos ahora un sistema que tuviese todas estas capacidades a la vez.

La **Inteligencia Artificial General (AGI)** es el término para un sistema capaz de rendir al nivel humano competente en una **gama amplia de tareas cognitivas**, sin rediseñarse específicamente para cada una y con capacidad de transferir lo aprendido entre dominios.

El problema es que nadie se pone de acuerdo en qué significa exactamente eso.

---

## 1. El problema de la definición

"AGI" no es un término técnico con una definición consensuada. Es un término de campo que diferentes grupos usan de formas distintas, a veces incompatibles. No existe un paper que diga "esto es AGI, esto no lo es".

Las preguntas de fondo no tienen respuesta única: ¿importa que el sistema pueda hacer cualquier tarea? ¿Que supere a los humanos en valor económico? ¿Que pueda mejorarse a sí mismo? ¿Que tenga algo parecido a comprensión real?

Dependiendo de la definición que uses, AGI podría estar a 2 años, a 20, o ser indefinible en los términos actuales.

---

## 2. Las definiciones en disputa

### 2.1 La definición cognitiva

La definición más antigua: AGI es un sistema que puede **realizar cualquier tarea intelectual que pueda realizar un ser humano**. 
Viene de la comunidad de investigación de IA de los años 50-80, e incluye razonamiento abstracto, aprendizaje en dominios completamente nuevos, sentido común, planificación a largo plazo y comprensión del lenguaje en contexto real.

El problema con esta definición es que "cualquier tarea intelectual humana" es un listón difuso. Los humanos también tienen sesgos, límites y fallos. 
¿Con qué humano comparamos? ¿Bajo qué condiciones?

### 2.2 La definición económica

OpenAI define AGI como **"sistemas altamente autónomos que superan a los humanos en la mayor parte del trabajo económicamente valioso"** ([OpenAI Charter][r3]).
A diferencia de la definición cognitiva, esta es medible: puede contrastarse contra benchmarks laborales y de productividad.

El cambio de foco es significativo: de "inteligencia general" a "utilidad económica general", un listón diferente y más bajo en algunos aspectos. El problema es que una parte sustancial del trabajo cognitivo con valor económico podría transformarse o automatizarse sin que el sistema alcance el listón de la definición clásica. ¿Sería eso AGI?

### 2.3 El espectro de capacidades: seis niveles

DeepMind propuso tratar la AGI no como un umbral binario sino como un **espectro de seis niveles de capacidad**, numerados del 0 al 5:

| Nivel | Descripción | Referencia aproximada |
|---|---|---|
| **0. Sin IA** | Sin capacidad autónoma | Calculadora |
| **1. IA emergente** | Igual o mejor que un no experto en algunas tareas | ChatGPT, según sus autores, en algunas tareas concretas |
| **2. IA competente** | Igual o mejor que el 50% de trabajadores adultos | — |
| **3. IA experta** | Igual o mejor que un experto humano en la mayoría de tareas de su dominio | Modelos de diagnóstico médico en dominios específicos |
| **4. IA virtuosa** | Igual o mejor que el mejor experto humano en prácticamente todo | — |
| **5. Superinteligencia (ASI)** | Supera a todos los humanos en todas las tareas cognitivas | — |

Este marco reconoce que la transición no es de golpe. En el paper original (2023), DeepMind marcó los niveles Competent AGI y superiores como no alcanzados por ningún sistema público. El marco también distingue rendimiento de generalidad: un sistema puede tener rendimiento de nivel alto en una tarea concreta sin demostrar generalidad equivalente ([arXiv][r1]).

### 2.4 La perspectiva de la seguridad

Para los investigadores de seguridad en IA, la línea crítica no es "mejor que humanos en tareas cognitivas" sino la **capacidad de mejora recursiva**: un sistema que mejora su propio diseño para producir sistemas sucesivamente más capaces. Un sistema podría superar a todos los humanos en todas las tareas sin cruzar ese umbral, pero si lo cruzara, la velocidad del cambio excedería la capacidad humana de entender y controlar lo que está pasando. Los marcos operacionales actuales van más allá: Anthropic define umbrales específicos en función de la capacidad de automatizar el trabajo de un investigador de IA, desde tareas acotadas hasta ciclos completos de investigación autónoma ([Anthropic RSP][r_rsp]).

> La ambigüedad en la definición no es descuido. Refleja que comunidades distintas intentan capturar propiedades distintas del mismo ente.

{{ include_html("snippets/fundamentos-ia-iag/04-niveles-agi.html") }}

---

## 3. Qué sabemos que no es AGI hoy

Los modelos actuales tienen capacidades que impresionan tanto a quienes los usan por primera vez como a quienes llevan años en el campo. También tienen limitaciones fundamentales que conviene entender con precisión.

### Lo que hacen bien hoy

* Comprensión y generación lingüística a nivel experto en muchos dominios de su entrenamiento.
* Razonamiento sobre textos complejos dentro de una ventana de contexto.
* Generalización con muy pocos ejemplos: aprender de tres casos en el prompt y generalizar.
* Codificación y resolución de errores reales: los modelos frontier alcanzan puntuaciones muy altas en benchmarks de software como OSWorld y SWE-bench, aunque SWE-bench Verified ya no se considera representativo de la frontera actual por contaminación de datos ([OpenAI][r_swe]).
* Uso del ordenador y navegación web: Claude Sonnet 4.6, GPT 5.4 operan interfaces gráficas y ejecutan flujos completos en el navegador con ventana de contexto de 1M tokens ([Anthropic][r11]).
* Síntesis de conocimiento entre dominios cuando el conocimiento relevante estaba en los datos de entrenamiento.
* Matemáticas y ciencias de olimpiada: los modelos más capaces alcanzan medalla de oro en IMO, IPhO e IChO y superan el 90% en benchmarks de ciencia a nivel PhD ([Gemini 3 Deep Think blog][r14]). Los resultados de ARC-AGI-2 están verificados por ARC Prize Foundation, pero los de olimpiadas y HLE son resultados reportados por los propios laboratorios.

### Lo que les falta

* **Razonamiento causal robusto**: confunden correlación con causalidad y fallan en contrafactuales.
* **Conocimiento del mundo físico**: su "comprensión" proviene de texto, no de interacción directa con objetos y consecuencias.
* **Memoria persistente real**: cada conversación empieza desde cero salvo arquitecturas con memoria explícita.
* **Generalización fuera de lo conocido**: funcionan bien en dominios del entrenamiento y fallan de forma impredecible en variaciones alejadas de lo visto.
* **Saber cuándo no saben**: no reconocen con fiabilidad los límites de su propio conocimiento, de ahí las alucinaciones.

> Superar el test de Turing en una conversación corta no implica inteligencia general. Un modelo puede generar texto que parece humano durante minutos y fallar en problemas de razonamiento causal o de sentido común que un humano sin entrenamiento específico resolvería sin dificultad.

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

Un sistema con capacidades AGI podría automatizar trabajo cognitivo a escala: no solo tareas manuales o repetitivas, sino análisis, diseño, investigación y toma de decisiones complejas.

Las estimaciones de impacto son amplias y eso es ya con la IA actual. McKinsey estima que la IA generativa podría automatizar actividades que representan hasta el 60-70% del tiempo de los trabajadores ([informe McKinsey][r8]). Goldman Sachs calcula que ~25% de las tareas actuales son directamente automatizables y que dos tercios de los empleos en EE. UU. y Europa están expuestos a algún grado de sustitución ([informe Goldman Sachs][r9]).

La distribución del impacto importa tanto como el impacto total: quién captura el valor producido, cómo se redistribuye, qué pasa con las personas cuyo trabajo se automatiza primero.

### Impacto científico

AlphaFold da un atisbo de lo que sería posible: dio un salto decisivo en un problema que la comunidad científica llevaba cincuenta años intentando resolver, reconocido con el Nobel de Química 2024.

Un sistema capaz de leer toda la literatura disponible, identificar contradicciones, proponer hipótesis testables y diseñar experimentos cambiaría la velocidad del descubrimiento de forma radical. La compresión del tiempo entre descubrimiento y aplicación podría redefinir campos enteros de la medicina, la química y la física en una sola generación.

### El problema de la alineación

El mayor riesgo no es que una AGI sea malévola. Es que sea **muy capaz y optimice para un objetivo que no captura exactamente lo que queremos como sociedad**.

"Alineación" es el problema técnico y filosófico de asegurar que un sistema muy capaz optimice lo que los humanos realmente valoran, no solo lo que pudimos especificar en el objetivo de entrenamiento. Es un problema sin solución completa conocida hoy.

> El campo de AI Safety existe precisamente porque los investigadores más serios del tema reconocen que no saben cómo resolver la alineación antes de llegar a sistemas mucho más capaces de los actuales. La incertidumbre no es alarmismo, es honestidad técnica sobre un problema abierto.

{{ include_html("snippets/fundamentos-ia-iag/04-impacto-agi.html") }}

---

## 5. Dónde estamos y hacia dónde vamos

Ningún sistema actual cumple ninguna de las definiciones de AGI (ni la cognitiva, ni la económica completa, ni la de mejora recursiva). Lo que existe son sistemas de inteligencia estrecha (no generales) muy capaces que, combinados, empiezan a cubrir un rango amplio de tareas.

{{ include_html("snippets/fundamentos-ia-iag/04-benchmarks-evolucion.html") }}

{{ include_html("snippets/fundamentos-ia-iag/04-ia-vs-humanos.html") }}

Los modelos frontier de 2025-2026 muestran rendimiento de nivel experto en dominios concretos como software, matemáticas formales o análisis de texto, pero no existe evidencia pública y consensuada de que hayan alcanzado el umbral de Competent AGI según el marco de DeepMind en la mayoría de tareas cognitivas. En dominios que requieren experiencia física, conocimiento tácito o razonamiento causal robusto, siguen por debajo.

METR evalúa el **horizonte temporal de tareas**: la longitud de tarea que un modelo resuelve con fiabilidad del 50%. En marzo de 2025 ese horizonte era de ~1 hora; con GPT-5-thinking, METR lo estima en ~2 horas 15 minutos ([METR, 2025][r12]). La tendencia es de duplicación cada ~7 meses, y el próximo umbral significativo es el salto a días o semanas, donde aparecen los riesgos de autonomía real.

ARC-AGI-2 mide la capacidad que falta para AGI cognitiva: razonar sobre problemas completamente nuevos desde muy pocos ejemplos, sin memorización de patrones. Lanzado con resultados iniciales por debajo del 4%, Gemini 3 Deep Think alcanzó el 84,6% en febrero de 2026, rozando el umbral de ~85% para vencer el benchmark ([Gemini 3 Deep Think blog][r14]). Humanity's Last Exam (HLE), el benchmark más difícil publicado hasta la fecha, llegó al 48,4% con el mismo modelo, cuando los expertos humanos con referencias puntúan ~85-90%. Los propios organizadores de ARC Prize insisten en que "AGI remains unsolved" y en que ARC-AGI-2 se diseñó para mantener tareas fáciles para humanos y difíciles para IA ([ARC Prize][r_arc]).

La velocidad de progreso en los últimos cinco años no tiene precedentes. Las capacidades emergentes con la escala sugieren dinámicas que la comunidad científica no comprende del todo, y el debate sobre AGI ha pasado de especulación académica a agenda pública, regulatoria y de política exterior.

La pregunta más útil no es "¿cuándo llega la AGI?" Nadie lo sabe con honestidad. La pregunta es qué criterios para pensar y qué marcos para evaluar te hacen más robusto en un entorno donde la IA mejora rápido y el panorama cambia cada pocos meses.

!!! abstract "Resumen de posición"
    **Qué sí sabemos:** los sistemas actuales superan a expertos humanos en dominios concretos y acotados. El horizonte de tareas autónomas crece de forma predecible. Los benchmarks de razonamiento general mejoran más rápido de lo esperado.

    **Qué no sabemos:** si las capacidades emergentes con la escala convergen hacia algo que merezca llamarse AGI o si hay un techo que no conocemos. Si la alineación es un problema técnico resoluble antes de llegar a sistemas mucho más capaces. Si los saltos cualitativos observados en benchmarks se traducen en generalización real fuera del laboratorio.

    **Qué implicaría alcanzarla:** una reorganización de la división de trabajo cognitivo más profunda que la industrialización. Compresión del tiempo entre descubrimiento y aplicación científica. Y la necesidad de resolver la alineación antes de que el sistema sea lo suficientemente capaz como para que los errores sean irreversibles.

Eso es lo que esta serie ha intentado construir: un mapa mental estable que funcione aunque los modelos cambien.

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Morris et al. (2023)** — *Levels of AGI: Operationalizing Progress on the Path to AGI* ([arXiv][r1]) | El marco de seis niveles (0-5) de DeepMind para operacionalizar AGI. |
| R2 | **Bubeck et al. (2023)** — *Sparks of Artificial General Intelligence: Early experiments with GPT-4* ([arXiv][r2]) | Evaluación sistemática de GPT-4 frente al listón de AGI cognitiva. |
| R3 | **OpenAI (2023)** — *OpenAI Charter* ([OpenAI][r3]) | Definición canónica de AGI de OpenAI: "sistemas altamente autónomos que superan a los humanos en la mayor parte del trabajo económicamente valioso". |
| R4 | **Russell, S. (2019)** — *Human Compatible: Artificial Intelligence and the Problem of Control* (libro, Basic Books) | Argumento central sobre el problema de alineación y el diseño de IA compatible con valores humanos. |
| R5 | **Bostrom, N. (2014)** — *Superintelligence: Paths, Dangers, Strategies* (libro, Oxford University Press) | El escenario de inteligencia explosiva y sus riesgos. Referencia de debate, no consenso científico. |
| R6 | **Krakovna et al. (2020)** — *Specification gaming: the flip side of AI ingenuity* ([DeepMind blog][r6]) | Ejemplos reales de sistemas que optimizan la métrica equivocada con resultados imprevistos. |
| R7 | **Grace et al. (2024)** — *Thousands of AI Authors on the Future of AI* ([arXiv][r7]) | Encuesta a investigadores de IA sobre probabilidades y tiempos estimados para hitos de AGI. |
| R8 | **McKinsey Global Institute (2023)** — *The economic potential of generative AI: The next productivity frontier* ([McKinsey][r8]) | Estima que la IA generativa podría automatizar actividades que representan el 60-70% del tiempo de los trabajadores. |
| R9 | **Briggs, J. & Kodnani, D. (2023)** — *The Potentially Large Effects of Artificial Intelligence on Economic Growth* ([Goldman Sachs][r9]) | Estima que dos tercios de los empleos en EE. UU. y Europa están expuestos a algún grado de automatización por IA; ~25% de las tareas son directamente automatizables. |
| R10 | **OpenAI (2025)** — *GPT-5 System Card* ([OpenAI][r10]) | Resultados en SWE-bench Verified (74,9%), evaluaciones METR (horizonte temporal ~2h15m) y comparativas con expertos humanos en dominios científicos. |
| R11 | **Anthropic (2026)** — *Introducing Claude Sonnet 4.6* ([Anthropic][r11]) | Anuncio oficial con capacidades de computer use, coding y ventana de contexto de 1M tokens (beta). |
| R12 | **METR (2025)** — *Measuring AI Ability to Complete Long Tasks* ([METR][r12]) | Introduce la métrica de horizonte temporal de tareas: el tiempo de tarea completable con 50% de fiabilidad se duplica cada ~7 meses; Claude 3.7 Sonnet alcanza ~1 hora. |
| R13 | **Google DeepMind (2026)** — *Gemini 3.1 Pro* ([deepmind.google][r13]) | Gemini 3.1 Pro: GPQA Diamond 94,3%; SWE-bench Verified 80,6% (nuevo SOTA a feb 2026); ARC-AGI-2 77,1%. |
| R14 | **The Deep Think team (2026)** — *Gemini 3 Deep Think: Advancing science, research and engineering* ([blog.google][r14]) | Gemini 3 Deep Think: ARC-AGI-2 84,6% (verificado por ARC Prize Foundation); HLE 48,4% sin herramientas; medalla de oro en IMO 2025, IPhO 2025 e IChO 2025. |
| R15 | **ARC Prize Foundation (2025)** — *Announcing ARC-AGI-2 and ARC Prize 2025* ([arcprize.org][r_arc]) | Lanzamiento de ARC-AGI-2; insiste en que "AGI remains unsolved" y detalla metodología de verificación de resultados. |
| R16 | **Anthropic (2024)** — *Responsible Scaling Policy v2.1* ([Anthropic][r_rsp]) | Define umbrales de autonomía de AI R&D (AI R&D-1 a AI R&D-5) y su relación con medidas de seguridad. |
| R17 | **OpenAI (2026)** — *Why SWE-bench Verified no longer measures frontier coding capabilities* ([OpenAI][r_swe]) | Explica por qué SWE-bench Verified está contaminado y recomienda SWE-bench Pro y otros benchmarks alternativos. |

</details>

[r1]: https://arxiv.org/abs/2311.02462 "Levels of AGI: Operationalizing Progress on the Path to AGI"
[r2]: https://arxiv.org/abs/2303.12528 "Sparks of Artificial General Intelligence: Early experiments with GPT-4"
[r3]: https://openai.com/charter/ "OpenAI Charter"
[r6]: https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/ "Specification gaming: the flip side of AI ingenuity"
[r7]: https://arxiv.org/abs/2401.02843 "Thousands of AI Authors on the Future of AI"
[r8]: https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier "The economic potential of generative AI: The next productivity frontier"
[r9]: https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html "The Potentially Large Effects of Artificial Intelligence on Economic Growth"
[r10]: https://openai.com/index/gpt-5-system-card/ "GPT-5 System Card"
[r11]: https://www.anthropic.com/news/claude-sonnet-4-6 "Introducing Claude Sonnet 4.6"
[r12]: https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/ "Measuring AI Ability to Complete Long Tasks"
[r13]: https://deepmind.google/models/gemini/pro/ "Gemini 3.1 Pro"
[r14]: https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-deep-think/ "Gemini 3 Deep Think: Advancing science, research and engineering"
[r_arc]: https://arcprize.org/blog/announcing-arc-agi-2-and-arc-prize-2025 "Announcing ARC-AGI-2 and ARC Prize 2025"
[r_rsp]: https://www-cdn.anthropic.com/17310f6d70ae5627f55313ed067afc1a762a4068.pdf "Anthropic Responsible Scaling Policy v2.1"
[r_swe]: https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/ "Why SWE-bench Verified no longer measures frontier coding capabilities"
