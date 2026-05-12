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
*[MCTS]: Monte Carlo Tree Search: método de búsqueda en árbol que usa muestreo aleatorio para explorar ramas y evaluar su prometimiento, aplicado a razonamiento para explorar múltiples caminos de solución en paralelo antes de comprometerse con uno
*[LPU]: Language Processing Unit: procesador diseñado específicamente para inferencia de modelos de lenguaje, optimizando la velocidad de generación de tokens y reduciendo la latencia en secuencias largas
*[LPUs]: Language Processing Units: procesadores diseñados específicamente para inferencia de modelos de lenguaje, optimizando la velocidad de generación de tokens y reduciendo la latencia en secuencias largas
*[PPO]: Proximal Policy Optimization: algoritmo estándar de aprendizaje por refuerzo para ajuste fino de LLMs; GRPO es una variante que elimina la necesidad de un modelo crítico separado
*[GSM8K]: Grade School Math 8K: benchmark de ~8.500 problemas de matemáticas de nivel escolar para evaluar el razonamiento aritmético en LLMs; ampliamente saturado por los modelos de frontera actuales (>95% de precisión)
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

<!-- ia-pib-bienestar-energia -->
*[PIB]: Producto Interior Bruto: valor total de bienes y servicios producidos en una economía durante un periodo dado
*[IDH]: Índice de Desarrollo Humano: indicador compuesto que combina esperanza de vida, educación y renta nacional bruta per cápita
*[MTF]: Multi-Tier Framework: marco de cinco niveles del Banco Mundial para medir el acceso efectivo a energía más allá de la simple conexión a la red
*[PPA]: Paridad del Poder Adquisitivo: método de conversión monetaria que equipara el poder de compra real entre países para hacer comparables los indicadores de renta
*[GPI]: Genuine Progress Indicator: indicador alternativo al PIB que suma el valor del trabajo no remunerado y resta los costes de la desigualdad, el crimen y la degradación ambiental
*[PTF]: Productividad Total de los Factores: medida de eficiencia económica que cuantifica el output generado por unidad combinada de trabajo y capital
*[TWh]: Teravatio-hora: unidad de energía equivalente a un billón de vatios-hora, usada para medir el consumo eléctrico a escala nacional o de grandes infraestructuras
*[GWh]: Gigavatio-hora: unidad de energía equivalente a mil millones de vatios-hora, usada para medir el consumo de grandes instalaciones industriales o datacenters
*[kWh]: Kilovatio-hora: unidad de energía equivalente a mil vatios consumidos durante una hora, referencia habitual para el consumo doméstico e industrial
*[TPU]: Tensor Processing Unit: acelerador de hardware diseñado por Google específicamente para operaciones matriciales en redes neuronales, alternativa a la GPU para inferencia y entrenamiento

<!-- datacenters-espacio -->
*[PUE]: Power Usage Effectiveness: ratio entre la potencia total consumida por un datacenter y la que llega efectivamente al equipamiento de cómputo; PUE 1,0 es ideal, PUE 2,0 significa que la mitad de la energía no genera cómputo
*[WUE]: Water Usage Effectiveness: litros de agua consumidos por kilovatio-hora entregado al cómputo; mide la eficiencia hídrica de un datacenter
*[TDP]: Thermal Design Power: potencia máxima de disipación de calor para la que está diseñado un chip o componente; determina los requisitos mínimos del sistema de refrigeración
*[LEO]: Low Earth Orbit: órbita terrestre baja, entre 160 y 2.000 km de altitud; latencia típica de 45-80 ms, vida útil de satélites afectada por resistencia atmosférica y radiación
*[GEO]: Geostationary Earth Orbit: órbita geoestacionaria a 35.786 km de altitud; el satélite permanece fijo sobre un punto de la Tierra pero introduce latencias de 500-600 ms
*[TRL]: Technology Readiness Level: escala de 1 a 9 que mide la madurez de una tecnología desde el concepto básico (TRL 1) hasta el sistema demostrado en entorno operacional real (TRL 9)
*[UPS]: Uninterruptible Power Supply: sistema de alimentación ininterrumpida que protege el equipamiento de cortes y fluctuaciones de red mediante baterías o supercondensadores
*[NMC]: Nickel-Manganese-Cobalt: química de cátodo de batería de litio-ion que combina níquel, manganeso y cobalto; estándar en baterías de alta densidad energética para UPS de datacenter y vehículos eléctricos
*[REE]: Rare Earth Elements: grupo de 17 elementos metálicos (lantánidos más escandio e itrio) usados en imanes permanentes, transceptores de fibra y pantallas; el 91% de la refinación global se realiza en China
*[COTS]: Commercial Off-The-Shelf: hardware o software estándar disponible en el mercado general, sin modificaciones especiales para entornos de alta radiación u otras condiciones extremas
*[SEU]: Single Event Upset: cambio de estado en un bit de memoria o registro causado por el impacto de una partícula energética (rayo cósmico, protón solar); fuente principal de errores en hardware COTS en órbita
*[ASM]: Artisanal and Small-scale Mining: minería artesanal y de pequeña escala; extracción manual o con herramientas básicas, predominante en la producción de cobalto en la RDC y tántalo en África central

<!-- articulos-tecnicos / proactive-reactive-agent -->
*[DLQ]: Dead Letter Queue: cola de mensajes fallidos donde se depositan las operaciones que no pudieron procesarse tras agotar todos los reintentos; permite auditoría y reprocesado manual sin perder el trabajo
