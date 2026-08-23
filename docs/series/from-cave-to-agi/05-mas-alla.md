---
title: Más allá del Transformer — memoria y modelos del mundo
description: Cómo el campo intenta ir más allá del puro escalado del Transformer combinando herramientas, búsqueda, memoria en inferencia, modelos del mundo y robótica.
date: 2026-03-31
date_modified: 2026-08-23
keywords: "más allá del Transformer, test-time compute, memoria IA, modelos del mundo, Mamba, SSM, robótica IA, agentes IA, búsqueda IA, futuro IA"
tags:
  - IA
  - LLMs
  - Razonamiento
  - Inferencia
video: "05-mas-alla.mp4"
video_duration: "PT1M25S"
---

# Capítulo 5: Más allá del Transformer (≈ 2022 - Q1 2026)

Este capítulo describe los límites que el escalado puro del Transformer ha dejado visibles y las líneas que el campo está abriendo para superarlos. Al terminarlo entenderás por qué una ventana de contexto larga no es lo mismo que memoria persistente, qué aportan arquitecturas como Mamba frente a la atención estándar, y de qué forma la búsqueda activa sobre espacios de soluciones, ejemplificada por AlphaGo y sus descendientes, está cambiando el tipo de sistemas que construimos. El artículo cubre también modelos del mundo, robótica fundacional y las apuestas de capital que señalan hacia dónde cree el ecosistema que está la siguiente frontera. Está pensado para quienes ya entienden qué es un modelo fundacional y quieren entender hacia dónde va el campo más allá del escalado.

!!! note "Actualización"
    Este capítulo cubre el estado del campo hasta Q1 2026. Los apartados sobre modelos concretos, capital invertido y benchmarks están sujetos a cambio rápido, los apartados sobre limitaciones estructurales del Transformer son estables.

Este capítulo no llega después del anterior solo en sentido cronológico. Llega después en sentido conceptual. El escalado del Transformer sigue siendo una fuerza central, pero ya no basta por sí solo para describir hacia dónde se mueve la frontera.

Durante los últimos años han ido apareciendo varias intuiciones nuevas. Algunas intentan resolver límites prácticos del propio Transformer, como el coste de contexto largo y la memoria. Otras amplían el tipo de sistema que construimos: modelos que usan herramientas, buscan activamente soluciones, aprenden durante la inferencia o intentan construir representaciones internas del mundo en lugar de limitarse a predecir la siguiente pieza de texto.

Este capítulo recorre esa nueva fase.

---

## 1. Por qué el Transformer ya no basta como mapa completo

El Transformer reorganizó el campo porque era paralelizable, escalable y extremadamente general. Pero precisamente al escalarlo empezaron a hacerse visibles varios límites.

El primero es computacional. La atención estándar crece de forma costosa con la longitud del contexto, y eso convierte la memoria larga en un problema de hardware y eficiencia. El [visualizador de atención Transformer](/herramientas/atencion-transformer/) permite inspeccionar esa interacción token a token, mientras que el [explorador de KV cache y contexto](/herramientas/kv-cache-contexto/) muestra cómo ese coste se traduce en memoria y capacidad de contexto durante la inferencia.

El segundo es funcional. Un Transformer preentrenado sabe muchísimo, pero sus pesos suelen quedar fijos en inferencia. Puede usar el contexto inmediato, pero no incorpora con naturalidad una memoria viva y persistente que aprende mientras trabaja.

El tercero es estructural. Predecir bien la siguiente pieza de una secuencia no equivale necesariamente a planificar, buscar activamente una solución, manipular herramientas externas o construir un modelo causal del entorno.

Por eso la frontera actual no consiste solo en entrenar modelos más grandes. Consiste en combinar escala con memoria, búsqueda, herramientas y representación del mundo.

### 1.1 Verdad, incertidumbre y alucinación

Aquí aparece otro límite importante. Los LLMs generativos basados en predicción del siguiente token no están optimizados directamente para distinguir entre verdad, falsedad y desconocimiento. Están optimizados para producir continuaciones plausibles dadas unas distribuciones de entrenamiento y unas señales de recompensa. Cuando la información es insuficiente o el contexto está mal especificado, esa presión puede empujar al modelo a completar en lugar de abstenerse.

Por eso conviene ser cuidadosos con cómo se formula el problema. Hay argumentos serios para pensar que, en sistemas abiertos de propósito general, las alucinaciones no van a desaparecer por completo. La teoría reciente ha defendido que son inevitables para LLMs computables usados como resolvedores generales, y trabajos más aplicados sostienen que los procedimientos estándar de entrenamiento y evaluación premian adivinar antes que reconocer incertidumbre.

Dicho eso, también sería excesivo convertir esta idea en una condena absoluta del Transformer como arquitectura o afirmar que toda mitigación es superficial. Buena parte del problema depende del objetivo de entrenamiento, de la calibración, de la capacidad de abstención y del acceso a verificación externa. Recuperación, herramientas, verificación, detección de incertidumbre y políticas explícitas de no responder pueden reducir mucho las alucinaciones en dominios acotados. El enunciado más sólido, por tanto, no es que el problema vaya a desaparecer, sino que en sistemas generativos abiertos sigue siendo un límite estructural serio, aunque pueda amortiguarse de forma sustancial en productos bien diseñados.

---

## 2. Del siguiente token a la búsqueda sobre el espacio de soluciones

Una de las líneas más importantes de esta nueva fase consiste en volver a tomarse en serio algo que el auge de los LLMs había dejado un poco en segundo plano: la búsqueda.

En 2016, [AlphaGo](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf) mostró que una red neuronal muy potente no bastaba por sí sola: el sistema combinaba redes, búsqueda en árbol y aprendizaje por refuerzo para navegar un espacio de juego inmenso. En 2017, [AlphaZero](https://arxiv.org/abs/1712.01815) generalizó ese enfoque a Go, ajedrez y shogi partiendo solo de las reglas del juego. La idea de fondo ya estaba ahí: en ciertos problemas, la inteligencia práctica no consiste solo en predecir bien una respuesta, sino en explorar activamente un espacio de posibilidades y evaluar trayectorias prometedoras.

Esa lógica reaparece más tarde en otros contextos. En 2022, [ReAct](https://arxiv.org/abs/2210.03629) mostró que incluso en agentes basados en lenguaje el rendimiento mejora cuando el sistema alterna razonamiento y acción, consulta herramientas externas, observa el resultado y usa esa información para decidir el paso siguiente. No es un descendiente directo de AlphaGo en sentido arquitectónico, pero sí participa del mismo giro más amplio: dejar atrás la idea de que un modelo útil se limita a producir una respuesta en un solo paso.

{{ include_html("snippets/from-cave-to-agi/05-agentes-convergencia.html") }}

La línea de DeepMind sí puede contarse ya de forma continua. En julio de 2024, [AlphaProof y AlphaGeometry 2](https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/) mostraron que una combinación de modelos de lenguaje, búsqueda y aprendizaje por refuerzo podía alcanzar nivel de medalla de plata en la Olimpiada Internacional de Matemáticas. En mayo de 2025, [AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) llevó esa idea al descubrimiento algorítmico: modelos Gemini, evaluadores automáticos y un marco evolutivo trabajando juntos para mejorar código y encontrar algoritmos nuevos. Ese mismo año, en la evaluación oficial de la IMO 2025, Gemini Deep Think alcanzó nivel de medalla de oro, consolidando la idea de que la combinación de modelo base, búsqueda activa y verificación formal puede superar el umbral de los mejores competidores humanos en matemáticas olímpicas.

La [retrospectiva de DeepMind publicada en marzo de 2026](https://deepmind.google/blog/10-years-of-alphago/) sobre los diez años de AlphaGo hace explícita esta genealogía. Allí presenta tanto AlphaProof como AlphaEvolve como continuaciones de la misma intuición que hizo potente a AlphaGo y AlphaZero: combinar modelos capaces con búsqueda, verificación y planificación para recorrer espacios enormes donde responder bien una sola vez no basta.

Lo que empieza a aparecer aquí es un cambio de unidad básica. El sistema útil ya no es solo el modelo, sino el modelo más búsqueda, más herramientas y más evaluación.

{{ include_html("snippets/from-cave-to-agi/05-busqueda-solucion.html") }}

## 3. Memoria más allá de la ventana de contexto

Otra frontera clara es la memoria. Los LLMs han ampliado mucho su contexto, pero una ventana larga no es lo mismo que una memoria persistente y selectiva.

{{ include_html("snippets/from-cave-to-agi/05-memoria-tipos.html") }}

### 3.1 Mamba y el regreso de los State Space Models

Los <abbr title="Familia de modelos de secuencia procedentes de la teoría de control clásica. En lugar de calcular atención entre todos los pares de tokens, mantienen un vector de estado oculto compacto que se actualiza en cada paso de la secuencia. Eso les permite procesar secuencias largas con coste computacional lineal O(N) en vez del cuadrático O(N²) que impone la atención estándar del Transformer.">state space models</abbr> (SSM) son una familia de arquitecturas con raíces en la teoría de control clásica: en lugar de calcular atención entre todos los pares de tokens del contexto, mantienen un vector de estado oculto compacto que se actualiza en cada paso de la secuencia, lo que les permite procesar secuencias largas con coste lineal en lugar del cuadrático que impone la atención estándar.

[Mamba](https://arxiv.org/abs/2312.00752) recuperó esa tradición con una idea clave: hacer que parte de sus parámetros dependan del input para mejorar la selección de información relevante y conseguir escalado lineal en longitud de secuencia. El punto no era solo acelerar. Era intentar conservar capacidad de razonamiento sobre secuencias largas sin pagar siempre el coste de atención completa.

[Mamba-2](https://arxiv.org/abs/2405.21060) fue más lejos y mostró una relación matemática profunda entre atención y state space models, proponiendo una capa refinada más rápida y competitiva. El mensaje de fondo es importante: quizá no estemos ante una ruptura total con el Transformer, sino ante una familia más amplia de mecanismos de memoria y secuencia.

### 3.2 Titans, MIRAS y la memoria que aprende durante la inferencia

La línea de Google Research va todavía un paso más allá. [Titans](https://arxiv.org/abs/2501.00663) introduce una memoria neuronal a largo plazo que se actualiza mientras el modelo está funcionando. La idea central no es solo guardar más contexto, sino decidir qué merece consolidarse como memoria en función de su novedad o sorpresa.

Google presentó después [Titans + MIRAS](https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/) como una línea explícita hacia test-time memorization: sistemas que mantienen memoria útil durante la ejecución sin depender únicamente de reentrenamiento offline. Ahí aparece una intuición importante para la etapa actual: quizá aprender no deba quedar confinado al entrenamiento. Quizá parte del aprendizaje relevante ocurra también en uso.

### 3.3 Nested Learning

Esa misma dirección culmina, por ahora, en [Nested Learning](https://research.google/blog/introducing-nested-learning-a-new-ml-paradigm-for-continual-learning/), presentado por Google Research en 2025 como un paradigma de aprendizaje continuo basado en problemas de optimización anidados con distintas frecuencias de actualización. La idea es reinterpretar arquitectura y optimización como partes de un mismo sistema multinivel.

No es todavía un nuevo estándar del campo. Pero sí señala algo importante: el futuro del aprendizaje puede depender menos de un único gran bucle de entrenamiento y más de varios niveles de adaptación con ritmos distintos, desde memoria inmediata hasta modificación interna más persistente.

{{ include_html("snippets/from-cave-to-agi/05-arquitecturas-post-transformer.html") }}

---

## 4. Modelos del mundo: aprender estructura, no solo secuencias

Otra línea fuerte intenta ir más allá de la predicción del siguiente token y aprender representaciones internas de cómo evoluciona un entorno.

{{ include_html("snippets/from-cave-to-agi/05-world-models-ecosystem.html") }}

[DreamerV3](https://arxiv.org/abs/2301.04104), y después su versión publicada en [Nature](https://www.nature.com/articles/s41586-025-08744-2), mostró que un world model puede aprender a imaginar futuros posibles y reutilizar esa capacidad para resolver más de 150 tareas con una sola configuración, incluyendo la recolección de diamantes en Minecraft desde cero. La clave no es solo el rendimiento, sino el tipo de enfoque: el sistema aprende un modelo latente del entorno y planifica dentro de él.

En paralelo, [I-JEPA](https://arxiv.org/abs/2301.08243) empuja una intuición distinta pero cercana. En vez de reconstruir todos los píxeles, propone predecir representaciones semánticas en un espacio latente. No es un world model completo en el sentido de Dreamer, pero sí pertenece a la misma familia de ideas que priorizan estructura sobre reconstrucción literal.

[Genie 2](https://deepmind.google/blog/genie-2-a-large-scale-foundation-world-model/) lleva esta dirección a un terreno especialmente sugerente: generar entornos 3D jugables y controlables a partir de una sola imagen de entrada. Todavía estamos en una fase temprana y demostrativa, pero la tesis ya es visible: si un sistema puede modelar dinámicas de mundo suficientemente bien, entonces puede servir no solo para responder preguntas, sino para entrenar agentes y explorar espacios de acción.

### 4.1 La tesis ya mueve capital

Esta idea ha dejado de ser solo una línea académica. En marzo de 2026, Reuters informó de que [AMI](https://www.reuters.com/business/ex-meta-ai-chief-yann-lecuns-ami-raises-103-billion-alternative-ai-approach-2026-03-10/), la startup de Yann LeCun, recaudó 1.030 millones de dólares para desarrollar sistemas centrados en razonamiento, planificación y modelado del mundo real. Un mes antes, Reuters informó de que [World Labs](https://www.reuters.com/business/ai-pioneer-fei-fei-lis-world-labs-raises-1-billion-funding-2026-02-18/) de Fei-Fei Li levantó 1.000 millones para avanzar en “spatial intelligence”.

El dato no prueba que esa sea la vía ganadora. Pero sí muestra que una parte relevante del ecosistema cree que el siguiente salto no llegará solo por escalar lenguaje, sino por modelar mejor la estructura espacial, causal e interactiva del mundo.

Ya no estamos viendo apuestas de laboratorio que se midan en cientos de millones. Solo en 2026, OpenAI anunció **\$110.000 millones** de nueva inversión, Anthropic cerró **\$30.000 millones** y xAI otros **\$20.000 millones**. En paralelo, las grandes tecnológicas planean alrededor de **\$635.000 millones** de gasto de capital en IA solo en 2026.

La señal es difícil de ignorar: la frontera dejó de ser únicamente un problema de algoritmo. El dinero se está desplazando hacia cuatro cuellos de botella concretos: **modelos, cómputo, energía y mundo físico** porque entrenar mejor ya no basta. 

Ahora también hay que desplegar, alimentar y dar percepción y acción espacial a esos sistemas en el mundo real.


{{ include_html("snippets/from-cave-to-agi/05-apuestas-capital.html") }}

---

## 5. Del modelo al cuerpo: robótica y acción física

Si la frontera se desplaza hacia sistemas que perciben, planifican y actúan, la robótica deja de ser una nota al pie y vuelve al centro del debate.

[RT-2](https://arxiv.org/abs/2307.15818) mostró que un modelo visión-lenguaje-acción puede transferir parte del conocimiento adquirido en datos web a tareas de control robótico. El punto importante aquí no es solo que el robot ejecute movimientos, sino que aproveche representaciones más generales para interpretar instrucciones y generalizar mejor fuera del conjunto de entrenamiento estrictamente robótico.

Figure representa bien una de las apuestas más visibles de esta etapa. Primero, por su orientación comercial temprana: en 2024 anunció una alianza con BMW para desplegar robots humanoides en planta. Después, por su capa de inteligencia: [Helix](https://www.figure.ai/news/helix) se presentó en 2025 como un modelo visión-lenguaje-acción generalista para control de humanoides, capaz de operar con el cuerpo superior completo y coordinar incluso dos robots en tareas compartidas. Y, ya a finales de 2025, la propia empresa publicó métricas de despliegue de [Figure 02 en BMW](https://www.figure.ai/news/production-at-bmw), con horas acumuladas de operación, piezas manipuladas y contribución documentada a producción. Figure combina, por tanto, una narrativa clara de VLA generalista con despliegue industrial explícito.

Tesla representa una apuesta distinta. Su enfoque con [Optimus](https://www.tesla.com/AI) es el de un humanoide generalista profundamente integrado con el resto de su stack de IA física, percepción, control y manufactura. La compañía lo presenta como un robot autónomo de propósito general para tareas inseguras, repetitivas o aburridas. A nivel público, sin embargo, la evidencia a Q1 2026 sigue siendo más programática que la de Figure: Reuters recogió en 2024 que Tesla aspiraba a usar Optimus internamente en baja escala en 2025 y a escalar después hacia clientes externos, pero esa ambición sigue siendo más una hoja de ruta corporativa que un despliegue industrial público tan documentado como el de Figure.

[NVIDIA Project GR00T](https://investor.nvidia.com/news/press-release-details/2024/NVIDIA-Announces-Project-GR00T-Foundation-Model-for-Humanoid-Robots-and-Major-Isaac-Robotics-Platform-Update/default.aspx) expresa la misma intuición desde otro ángulo: modelos fundacionales para robots humanoides, unidos a simulación, datos sintéticos, percepción y hardware específico.

Todavía no estamos ante robots generalistas fiables en cualquier entorno. Pero sí ante un cambio claro de enfoque. La robótica empieza a heredar la lógica de los modelos fundacionales: una misma base intenta transferirse a muchas tareas distintas en lugar de reprogramarse por completo para cada una.

{{ include_html("snippets/from-cave-to-agi/05-robotica-fundacional.html") }}

---

## 6. Lo que esta nueva fase está intentando resolver

Visto en conjunto, el movimiento es claro. El escalado del Transformer produjo sistemas muy potentes, pero también dejó visibles varios límites: memoria corta en relación con tareas de larga duración, poca adaptación interna durante la inferencia, planificación todavía débil en ciertos dominios y comprensión incompleta del mundo físico.

Las líneas que hoy parecen más prometedoras intentan atacar precisamente esos puntos:

- Búsqueda y verificación sobre espacios de soluciones,
- Memoria selectiva durante la inferencia,
- Aprendizaje continuo en múltiples escalas temporales,
- Modelos internos del entorno,
- Sistemas capaces de percibir y actuar en el mundo físico.

No sabemos todavía qué combinación acabará imponiéndose. Lo que sí parece claro es que el futuro de la IA no se juega solo en modelos más grandes, sino en sistemas mejor organizados y más capaces de interactuar con el mundo.

!!! tip "Siguiente serie"
    Este capítulo cierra la historia de cómo llegamos hasta aquí. La siguiente serie entra en uno de los frentes más activos del presente: [Multimodalidad en IA Generativa →](/series/multimodalidad-iag/00_presentacion_serie/)

---

## 7. Referencias

<details markdown="1">
<summary>**Fuentes base**</summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | [Silver et al. (2016) — *AlphaGo*](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf) | Redes, búsqueda en árbol y RL en Go. |
| R2 | [Silver et al. (2017) — *AlphaZero*](https://arxiv.org/abs/1712.01815) | Generalización del enfoque de self-play y búsqueda; enviado en diciembre de 2017. |
| R3 | [Yao et al. (2022) — *ReAct*](https://arxiv.org/abs/2210.03629) | Integración de razonamiento y acción con herramientas en LLMs. |
| R4 | [DeepMind (2024) — *AlphaProof y AlphaGeometry 2*](https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/) | Anuncio de julio de 2024: nivel plata en la IMO mediante búsqueda, RL y formalización matemática. |
| R5 | [DeepMind (2025) — *AlphaEvolve*](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) | Anuncio de mayo de 2025: agente para descubrimiento y optimización algorítmica. |
| R6 | [DeepMind (2026) — *10 years of AlphaGo*](https://deepmind.google/blog/10-years-of-alphago/) | Retrospectiva de marzo de 2026 que conecta AlphaGo, AlphaZero, AlphaProof y AlphaEvolve como una misma línea de búsqueda y planificación. |
| R7 | [Gu & Dao (2023) — *Mamba*](https://arxiv.org/abs/2312.00752) | State space models selectivos y secuencias largas. |
| R8 | [Dao & Gu (2024) — *Transformers are SSMs*](https://arxiv.org/abs/2405.21060) | Mamba-2 y dualidad entre atención y SSM. |
| R9 | [Behrouz, Zhong & Mirrokni (2025) — *Titans*](https://arxiv.org/abs/2501.00663) | Memoria neuronal de largo plazo durante inferencia. |
| R10 | [Google Research (2025) — *Titans + MIRAS*](https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/) | Test-time memorization y memoria a largo plazo. |
| R11 | [Google Research (2025) — *Nested Learning*](https://research.google/blog/introducing-nested-learning-a-new-ml-paradigm-for-continual-learning/) | Paradigma multinivel para aprendizaje continuo. |
| R12 | [Hafner et al. (2023) — *DreamerV3*](https://arxiv.org/abs/2301.04104) | World models para control general. |
| R13 | [Hafner et al. (2025) — *Mastering diverse control tasks through world models*](https://www.nature.com/articles/s41586-025-08744-2) | Publicación en Nature de DreamerV3. |
| R14 | [Assran et al. (2023) — *I-JEPA*](https://arxiv.org/abs/2301.08243) | Predicción en espacio de representación. |
| R15 | [DeepMind (2024) — *Genie 2*](https://deepmind.google/blog/genie-2-a-large-scale-foundation-world-model/) | Mundo 3D jugable y controlable desde una imagen. |
| R16 | [Brohan et al. (2023) — *RT-2*](https://arxiv.org/abs/2307.15818) | Modelos visión-lenguaje-acción en robótica. |
| R17 | [Figure (2025) — *Helix*](https://www.figure.ai/news/helix) | VLA generalista para control de humanoides. |
| R18 | [Figure (2025) — *Figure 02 en BMW*](https://www.figure.ai/news/production-at-bmw) | Métricas públicas de despliegue industrial. |
| R19 | [Reuters (2024) — BMW y Figure](https://www.reuters.com/business/autos-transportation/bmw-taps-humanoid-startup-figure-take-teslas-robot-2024-01-18/) | Acuerdo inicial de despliegue con BMW. |
| R20 | [Tesla — *AI & Robotics*](https://www.tesla.com/AI) | Posicionamiento oficial de Optimus como humanoide generalista. |
| R21 | [Reuters (2024) — Tesla y Optimus para uso interno](https://www.reuters.com/business/autos-transportation/tesla-have-humanoid-robots-internal-use-next-year-musk-says-2024-07-22/) | Hoja de ruta pública de Tesla para Optimus. |
| R22 | [NVIDIA (2024) — *Project GR00T*](https://investor.nvidia.com/news/press-release-details/2024/NVIDIA-Announces-Project-GR00T-Foundation-Model-for-Humanoid-Robots-and-Major-Isaac-Robotics-Platform-Update/default.aspx) | Modelo fundacional para robots humanoides. |
| R23 | [Reuters (2026) — financiación de AMI](https://www.reuters.com/business/ex-meta-ai-chief-yann-lecuns-ami-raises-103-billion-alternative-ai-approach-2026-03-10/) | Señal de capital hacia world models y razonamiento. |
| R24 | [Reuters (2026) — financiación de World Labs](https://www.reuters.com/business/ai-pioneer-fei-fei-lis-world-labs-raises-1-billion-funding-2026-02-18/) | Señal de capital hacia inteligencia espacial y 3D. |
| R25 | [OpenAI (2025) — *Why Language Models Hallucinate*](https://openai.com/index/why-language-models-hallucinate/) | Tesis de que los objetivos estándar premian adivinar antes que abstenerse. |
| R26 | [Xu et al. (2024/2025) — *Hallucination is Inevitable*](https://arxiv.org/abs/2401.11817) | Argumento teórico de inevitabilidad en LLMs generales. |
| R27 | [Kadavath et al. (2022) — *Language Models (Mostly) Know What They Know*](https://arxiv.org/abs/2207.05221) | Calibración y autoevaluación de modelos. |
| R28 | [Kapoor et al. (2024) — *Large Language Models Must Be Taught to Know What They Don’t Know*](https://papers.nips.cc/paper_files/paper/2024/file/9c20f16b05f5e5e70fa07e2a4364b80e-Paper-Conference.pdf) | La calibración útil no aparece sola; necesita entrenamiento explícito. |
| R29 | [Madhusudhan et al. (2025) — *Do LLMs Know When to NOT Answer?*](https://aclanthology.org/2025.coling-main.627.pdf) | Abstención como dimensión clave de fiabilidad. |
| R30 | [Dhuliawala et al. (2024) — *Chain-of-Verification*](https://aclanthology.org/2024.findings-acl.212.pdf) | Verificación interna para reducir alucinaciones. |
| R31 | [Farquhar et al. (2024) — *Detecting hallucinations in large language models using semantic entropy*](https://www.nature.com/articles/s41586-024-07421-0) | Detección de alucinaciones mediante incertidumbre. |

</details>

---

## Preguntas frecuentes

**¿Por qué la búsqueda activa en tiempo de inferencia es relevante si los LLMs ya razonan?**
Porque la inteligencia práctica en problemas complejos no consiste en predecir el siguiente token en un solo paso, sino en explorar activamente un espacio de soluciones y evaluar trayectorias alternativas. Sistemas como AlphaProof combinan modelo base, búsqueda y verificación formal para superar el rendimiento de una respuesta directa, lo que muestra que cuánto computa el modelo en el momento de responder puede ser tan determinante como cuánto aprendió durante el entrenamiento.

**¿Si ya existen ventanas de contexto masivas, qué problema resuelven Mamba o Titans?**
Las ventanas largas tienen coste cuadrático y se descartan al terminar la sesión. Mamba propone escalado lineal para secuencias largas, manteniendo un estado oculto compacto que se actualiza en cada paso a un coste mucho menor, aunque comprimiendo la historia. Titans va más lejos: introduce una memoria neuronal que se actualiza durante la propia inferencia y mantiene persistencia selectiva entre sesiones, sin depender de reentrenamiento ni de escalar la ventana de contexto indefinidamente.

**¿Cuál es la diferencia fundamental entre un LLM y un modelo del mundo?**
Un LLM predice estadísticamente la siguiente pieza de una secuencia sin construir una representación causal del entorno en el que opera. Un modelo del mundo aprende representaciones internas de cómo evoluciona ese entorno, lo que le permite simular futuros posibles y descartar consecuencias indeseables antes de actuar. DreamerV3 es el ejemplo más desarrollado: aprende un modelo latente y lo usa para resolver más de 150 tareas distintas con una sola configuración.

**¿Cómo cambia la robótica con los modelos VLA?**
Los modelos visión-lenguaje-acción permiten transferir conocimiento general extraído de datos web a tareas de control físico mediante instrucciones en lenguaje natural. Eso elimina la necesidad de programar cada movimiento manualmente: una misma base se generaliza a múltiples tareas sin reprogramación total. Figure 02 ya ha publicado métricas reales de despliegue en planta de BMW, lo que sitúa este enfoque más allá de la demostración experimental y muestra que la robótica empieza a heredar la lógica de los modelos fundacionales.
