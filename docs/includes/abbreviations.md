<!-- Abreviaciones globales — se inyectan automáticamente en todas las páginas vía pymdownx.snippets -->
<!-- Añadir aquí cuando aparezca una nueva sigla técnica en cualquier artículo -->

*[LLM]: Large Language Model: modelo de lenguaje entrenado sobre grandes volúmenes de texto para predecir y generar texto
*[LLMs]: Large Language Models: modelos de lenguaje entrenados sobre grandes volúmenes de texto para predecir y generar texto
*[GPU]: Graphics Processing Unit: procesador especializado en operaciones matriciales en paralelo, clave para entrenar redes neuronales
*[GPUs]: Graphics Processing Unit: procesador especializado en operaciones matriciales en paralelo, clave para entrenar redes neuronales
*[RLHF]: Reinforcement Learning from Human Feedback: técnica de ajuste fino donde evaluadores humanos guían el comportamiento del modelo mediante preferencias
*[AGI]: Artificial General Intelligence: hipotético sistema de IA capaz de realizar cualquier tarea cognitiva que un humano puede hacer
*[API]: Application Programming Interface: interfaz que permite a programas comunicarse entre sí de forma estandarizada
*[APIs]: Application Programming Interfaces: interfaces que permiten a programas comunicarse entre sí de forma estandarizada
*[RAG]: Retrieval-Augmented Generation: técnica que combina recuperación de documentos relevantes con generación de texto para mejorar precisión factual
*[NLP]: Natural Language Processing: campo de la IA dedicado a que los ordenadores comprendan y generen lenguaje humano
*[CLIP]: Contrastive Language-Image Pretraining: modelo que aprende representaciones conjuntas de imágenes y texto mediante contraste
*[SSM]: State Space Model: familia de modelos de secuencias que mantiene un estado oculto compacto en lugar de usar atención completa
*[SSMs]: State Space Models: familia de modelos de secuencias que mantiene un estado oculto compacto en lugar de usar atención completa
*[VQ-VAE]: Vector Quantized Variational Autoencoder: autoencoder que comprime datos en secuencias de tokens discretos tomados de un vocabulario finito
*[VLM]: Visual Language Model: modelo que combina comprensión visual y lingüística para razonar sobre imágenes y texto de forma conjunta
*[MoE]: Mixture of Experts: arquitectura donde distintos subconjuntos de parámetros se activan según la entrada, escalando capacidad sin escalar coste de inferencia proporcionalmente
*[MMAU]: Massive Multitask Audio Understanding: benchmark que evalúa comprensión de audio en tareas diversas
*[benchmark]: prueba estandarizada que mide el rendimiento de un modelo en una tarea concreta para compararlo con otros sistemas
*[benchmarks]: pruebas estandarizadas que miden el rendimiento de modelos en tareas concretas para compararlos entre sí
*[grounding]: capacidad de un modelo para anclar sus respuestas en información verificable del mundo real, reduciendo alucinaciones
*[prior]: creencia inicial sobre cómo es el mundo antes de ver datos; en modelos de lenguaje, sesgos aprendidos durante el entrenamiento que influyen en sus respuestas

<!-- Modelos razonadores -->
*[sycophancy]: tendencia de los modelos de lenguaje a validar las preferencias del usuario incluso cuando están equivocados, anteponiendo la aprobación a la precisión factual
*[RLVR]: Reinforcement Learning with Verifiable Rewards: variante de RL donde la señal de recompensa es una verificación automática de corrección, sin depender de evaluadores humanos
*[GRPO]: Group Relative Policy Optimization: algoritmo de entrenamiento que elimina el modelo crítico generando varios intentos del mismo problema y calculando ventajas relativas al grupo
*[CoT]: Chain-of-Thought: técnica donde el modelo genera pasos intermedios explícitos antes de producir la respuesta final
*[TTC]: Test-Time Compute: cómputo invertido en el momento de generar una respuesta, en contraposición al cómputo de entrenamiento
*[PRM]: Process Reward Model: modelo evaluador que puntúa cada paso intermedio de la cadena de razonamiento, no solo la respuesta final
*[ORM]: Outcome Reward Model: modelo evaluador que puntúa únicamente la respuesta final, sin evaluar los pasos intermedios
*[TTFT]: Time To First Token: tiempo desde que el usuario envía la consulta hasta que recibe el primer carácter de la respuesta
*[SLO]: Service Level Objective: objetivo medible de nivel de servicio, normalmente expresado como percentil de latencia (p. ej. p95 < 5 s)
*[SLOs]: Service Level Objectives: objetivos medibles de nivel de servicio, normalmente expresados como percentiles de latencia
*[AIME]: American Invitational Mathematics Examination: examen de matemáticas de competición universitaria ampliamente usado como benchmark de razonamiento en LLMs
*[GPQA]: Graduate-Level Google-Proof Q&A: benchmark de preguntas de ciencia a nivel de doctorado diseñadas para ser irreproducibles con búsqueda web
