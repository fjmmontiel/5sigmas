---
title: IA como tecnología eléctrica
description: Qué implica la IA en términos de cómputo y energía, por qué la demanda puede crecer aunque mejore el hardware, y cuáles son los cuellos de botella reales.
date: 2026-04-08
keywords: "IA tecnología eléctrica, consumo energético inteligencia artificial, datacenters IA energía, efecto rebote IA, cómputo GPU TPU, inferencia LLM energía, PUE datacenter, cuellos botella energía IA"
tags:
  - Economía
  - Energía
  - IA
video: "02-ia-tecnologia-electrica.mp4"
video_duration: "PT52S"
---

# Capítulo 2 — IA como tecnología eléctrica

Este capítulo describe el perfil energético real de la IA (entrenamiento frente a inferencia, demanda creciente y concentración geográfica) y por qué la mejora continua en eficiencia del hardware no implica una demanda eléctrica decreciente en términos absolutos. Al terminarlo, el lector entenderá qué significa "compute" en la práctica, sabrá por qué la paradoja de Jevons hace que eficiencia y demanda total puedan crecer a la vez, y tendrá el marco para entender el debate sobre el impacto de la IA en el PIB y el bienestar que los capítulos siguientes desarrollan.

!!! info "Prerrequisitos"
    Este capítulo asume que conoces los conceptos introducidos en el [Capítulo 1 — Electricidad y bienestar](./01-electricidad-bienestar.md).

La IA no es solo una tecnología de software. Detrás de cada consulta a un modelo hay hardware que consume electricidad, infraestructura de refrigeración que consume más, y una cadena logística que va desde la minería de los materiales para fabricar chips hasta la instalación de líneas de alta tensión nuevas para alimentar centros de datos.

{{ include_html("snippets/ia-pib-energia/series_energy_ai_02_ai.html") }}

---

## 1. Qué implica "compute" en la práctica

El proceso de desarrollar y desplegar modelos de IA se divide en dos fases con perfiles energéticos muy distintos.

### Entrenamiento

Entrenar un modelo grande requiere procesar cantidades masivas de datos durante semanas o meses usando miles de aceleradores especializados (GPUs o TPUs) en paralelo. El consumo energético de un entrenamiento de escala grande puede equivaler al consumo eléctrico de miles de hogares durante un año. El entrenamiento inicial de GPT-4, según estimaciones publicadas, consumió alrededor de 42 GWh a lo largo de varias semanas, una cifra comparable al consumo anual de miles de viviendas [Epoch AI (2023)](https://epoch.ai/data/ai-models).

No es un proceso que se repite con frecuencia para el mismo modelo, pero sí se repite para cada nueva versión, cada variante especializada y cada experimento que llevan a cabo los equipos de investigación. La suma de todos esos entrenamientos, a lo largo de docenas de laboratorios y empresas activos, representa una demanda energética creciente y concentrada geográficamente en los centros de datos donde ocurre.

### Inferencia

La inferencia es el proceso de usar el modelo para responder preguntas. Cada consulta, cada generación de imagen, cada análisis de documento consume energía. A diferencia del entrenamiento, la inferencia ocurre miles de millones de veces al día de forma distribuida y continua.

Lo importante es la relación entre los dos: mientras el entrenamiento es un coste puntual grande, la inferencia es un coste continuo pequeño que, multiplicado por el volumen de uso, puede superar al entrenamiento en consumo energético agregado conforme crece la adopción. Una consulta a un modelo de lenguaje grande consume aproximadamente diez veces más energía que una búsqueda web convencional, y la generación de vídeo puede situarse cuarenta veces por encima de esa búsqueda [IEA (2025)](https://www.iea.org/reports/energy-and-ai).

> El consumo no está solo en entrenar los modelos sino en servirlos. Un modelo con millones de usuarios diarios consume energía de forma constante, no episódica.

{{ include_html("snippets/ia-pib-bienestar-energia/02-entrenamiento-inferencia.html") }}

---

## 2. Por qué la eficiencia no frena la demanda

Una intuición razonable es que si los chips se vuelven más eficientes por operación, el consumo energético debería estabilizarse o decrecer. Esta intuición es parcialmente correcta y completamente insuficiente para predecir lo que ocurre en la práctica.

El fenómeno que explica la divergencia tiene nombre: el efecto rebote (o paradoja de Jevons) [Jevons (1865)](https://archive.org/details/coalquestionani00jevogoog). Cuando una tecnología se vuelve más eficiente, el coste de usarla baja, lo que incentiva más uso, lo que puede resultar en un consumo total mayor aunque cada unidad de uso sea más barata.

En el caso de la IA, la mejora de eficiencia tiene tres efectos simultáneos:

1. **Reduce el coste por consulta**, lo que hace económicamente viables aplicaciones que antes no lo eran.
2. **Amplía el espectro de usuarios**, porque modelos más baratos de operar pueden desplegarse en más sectores y geografías.
3. **Aumenta la complejidad de los modelos**, porque la mayor eficiencia del hardware libera espacio para escalar la potencia del modelo sin aumentar el coste por unidad al mismo ritmo.

El resultado neto en los últimos años ha sido un consumo energético creciente, no estable, a pesar de mejoras reales en eficiencia por operación.

{{ include_html("snippets/ia-pib-bienestar-energia/02-efecto-rebote.html") }}

---

## 3. Los cuellos de botella reales

La expansión de la IA como tecnología eléctrica no está limitada solo por el dinero disponible para invertir. Hay cinco cuellos de botella que determinan la velocidad real a la que puede crecer.

{{ include_html("snippets/ia-pib-bienestar-energia/02-cuellos-botella.html") }}

### Energía

El primero y más directo: los centros de datos necesitan conexiones a la red eléctrica con capacidad suficiente y garantías de suministro continuo. La IEA estima que el consumo eléctrico global de centros de datos alcanzó 415 TWh en 2024 y podría situarse entre 945 TWh y 1.260 TWh en 2030 según el ritmo de adopción; el escenario base ya queda ligeramente por encima del consumo eléctrico actual de Japón [IEA (2025)](https://www.iea.org/reports/energy-and-ai). 

Dentro de ese total, el componente específico de IA crece más rápido que el del resto de cargas de datos: un análisis de Greenpeace (2025) estima que el consumo eléctrico atribuible a cargas de trabajo de IA podría crecer de 50 TWh en 2023 a 554 TWh en 2030, un x11 en siete años, con las emisiones de CO₂ asociadas pasando de aproximadamente 180 a 320 millones de toneladas en ese mismo período [Greenpeace (2025)](https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf).

{{ include_html("snippets/ia-pib-bienestar-energia/02-proyeccion-demanda.html") }}

Cuando se usa la comparación con hogares conviene leerla como una equivalencia de orden de magnitud bajo operación continua a lo largo del año. No significa que un centro de datos y 100.000 viviendas consuman exactamente lo mismo en cada instante, sino que ambos suman una energía anual similar si el centro mantiene esa carga de forma sostenida.

En muchas regiones, la red no tiene capacidad disponible a corto plazo, los plazos de ampliación se miden en años, y la estabilidad del suministro depende de una mezcla energética que en muchos países sigue siendo mayoritariamente fósil. Las grandes empresas tecnológicas responden a esto con contratos de energía renovable a largo plazo (PPAs), acuerdos de suministro dedicados y, en los casos más recientes, acuerdos directos con plantas nucleares existentes: Microsoft anunció en 2023 un acuerdo para retomar parte de la producción de Three Mile Island en Pennsylvania, y Amazon y Google han firmado acuerdos similares con operadores de energía nuclear. 

Esos contratos, sin embargo, no equivalen a consumo renovable en tiempo real: garantizan que una cantidad equivalente de energía renovable entra en la red, pero no que la electricidad que llega al centro de datos en cada momento sea de origen renovable. El análisis de Greenpeace (2025) estima que las emisiones reales de las grandes empresas tecnológicas superan entre 1,6 y 7,6 veces las que sus declaraciones de neutralidad climática sugieren, porque los PPAs se contabilizan como compensación anual y no como sustitución directa en tiempo real [Greenpeace (2025)](https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf).

{{ include_html("snippets/ia-pib-bienestar-energia/02-huella-ambiental.html") }}

### Chips

Los aceleradores de IA (principalmente GPUs de NVIDIA y TPUs de Google en este momento) son el recurso más escaso del ecosistema. Su fabricación requiere semiconductores de última generación que solo se producen en pocas fábricas en el mundo, fundamentalmente en Taiwán y Corea del Sur, y también compuestos como el galio, del que China controla entre el 98 y el 99% de la producción global [IEA (2025)](https://www.iea.org/reports/energy-and-ai). La cadena de suministro es larga, frágil y geopolíticamente sensible. 

La fabricación del hardware tiene también una huella energética y material propia que raramente se incluye en los cálculos de sostenibilidad del sector: producir una oblea (wafer) de semiconductores de última generación requiere aproximadamente 2,3 MWh, y el volumen total de hardware de IA que se desplegará en la próxima década genera ya estimaciones de residuos electrónicos de entre 1,2 y 5 millones de toneladas para 2030, un flujo que supera la capacidad actual de los sistemas de reciclaje especializados [Greenpeace (2025)](https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf).

Los plazos de entrega de hardware a gran escala oscilan entre 36 y 52 semanas para pedidos grandes [(IEA, 2025)][r1], lo que limita la velocidad a la que cualquier actor puede escalar capacidad de cómputo, independientemente del presupuesto disponible. Las restricciones de exportación de chips avanzados de la administración estadounidense añaden otra capa de incertidumbre para actores fuera de la alianza tecnológica occidental.

### Agua

La refrigeración de los centros de datos consume agua en cantidades que empiezan a aparecer en los debates de planificación local. Un centro de datos de 100 MW puede consumir alrededor de dos millones de litros diarios en sistemas de refrigeración evaporativa, y las estimaciones para el sector en su conjunto apuntan a que el consumo global podría pasar de 560.000 millones de litros en 2024 a 1,2 billones en 2030 [IEA (2025)](https://www.iea.org/reports/energy-and-ai). En zonas con estrés hídrico (que son, paradójicamente, también zonas atractivas para instalar centros de datos por su clima o bajo coste del suelo), este consumo genera tensiones directas con otros usos del agua y con las comunidades locales que los ven como competidores por un recurso escaso.

Conviene, sin embargo, matizar qué comparación se está haciendo. Si se compara instalación con instalación, un centro de datos típico de 100 MW consume bastante más agua que un campo de golf mediano: la IEA sitúa ese centro en torno a dos millones de litros diarios en total, mientras la encuesta 2024 de GCSAA/ASHS para EE.UU. sitúa la mediana por instalación en unos 85 millones de litros al año [(GCSAA/ASHS, 2025)](https://journals.ashs.org/view/journals/horttech/35/5/article-p848.xml). Pero si se mira el agregado sectorial, la foto cambia: la misma encuesta proyecta para los campos de golf de EE.UU. en 2024 alrededor de 2,01 billones de litros de agua aplicada al año, unas 3,6 veces la estimación global de la IEA para data centers en 2024 [(GCSAA, 2025)](https://www.gcsaa.org/docs/default-source/what-we-do/gcep-phase-4-water-report.pdf?sfvrsn=c829dd3e_0)

{{ include_html("snippets/ia-pib-bienestar-energia/02-agua-golf-datacenters.html") }}

### Talento

El número de personas capaces de diseñar, entrenar y mantener sistemas de IA a escala sigue siendo limitado respecto a la demanda. El talento se concentra geográficamente, y su escasez actúa como límite real para la velocidad de desarrollo.

### Regulación

La regulación sobre centros de datos, gestión de datos personales y uso de sistemas de IA en sectores críticos varía enormemente entre jurisdicciones y añade incertidumbre sobre qué modelos de negocio son viables en qué geografías. El AI Act europeo, las restricciones de exportación de chips de la administración estadounidense, y los debates sobre soberanía digital en múltiples países crean un entorno regulatorio en permanente cambio que condiciona las decisiones de inversión.

---

## 4. La geografía de la demanda energética de IA

La demanda energética de la IA no está distribuida uniformemente. Se concentra en los centros de datos, que a su vez se concentran en regiones con condiciones favorables: coste bajo de la electricidad, disponibilidad de terreno, acceso a fibra óptica y condiciones climáticas que reducen el coste de refrigeración.

En Estados Unidos, las regiones de Virginia del Norte, Texas y el Noroeste del Pacífico concentran una parte desproporcionada de la capacidad. En Europa, Irlanda y los países nórdicos han atraído inversiones masivas por su energía barata y su clima favorable para la refrigeración. El caso de Irlanda ilustra la concentración que eso puede producir a escala nacional: los centros de datos representan ya más del 20% del consumo eléctrico total del país, y algunas proyecciones sitúan ese porcentaje cerca del 80% para 2030 si la expansión continúa al ritmo previsto, lo que convierte la gestión de esa demanda en una prioridad de política energética nacional sin parangón en otros sectores. En Asia, Singapur, Japón y partes de China concentran la capacidad regional.

Dentro de esa distribución empieza a observarse una diferenciación funcional: el entrenamiento de modelos tiende a concentrarse donde la electricidad es más barata (a menudo cerca de fuentes renovables o de mercados eléctricos con precios bajos en horas valle), mientras que la inferencia a baja latencia se sitúa cerca de los centros de población. Esta geografía en dos niveles tiene implicaciones para qué regiones atraen qué tipo de infraestructura y qué tipo de empleo y valor añadido genera cada función.

Esta concentración tiene consecuencias para la red eléctrica local: la incorporación de un centro de datos grande puede representar una fracción significativa del consumo eléctrico de una región y añadir presión sobre infraestructuras que no estaban diseñadas para absorber esa carga adicional.

> La escala a la que se despliega la IA convierte la pregunta "¿cuánta energía consume?" en una pregunta de infraestructura pública y política energética, no solo de eficiencia tecnológica.

{{ include_html("snippets/ia-pib-bienestar-energia/02-geografia-ia.html") }}

El capítulo siguiente analiza el otro lado de la ecuación: cómo medimos el impacto que todo este consumo produce, y por qué el PIB solo captura una parte de lo que realmente importa.

---

## Preguntas frecuentes

**¿Por qué se llama a la IA una "tecnología eléctrica"?**
Porque, como el motor eléctrico o la informática, la IA no tiene un sector de uso fijo: puede transformar la productividad en cualquier industria que adopte sus capacidades. El motor eléctrico no solo movió fábricas, reorganizó cómo se diseñaban esas fábricas. La IA no solo automatiza tareas de oficina: cambia cómo se estructuran los procesos de toma de decisiones. El paralelo "eléctrico" también apunta a su dependencia física: sin infraestructura energética a escala, no hay IA a escala.

**¿Cuánta energía consume entrenar un modelo de IA grande?**
El entrenamiento inicial de un modelo de la escala de GPT-4 consumió en torno a 42 GWh según las estimaciones disponibles, equivalente al consumo eléctrico anual de unos miles de hogares. Pero ese número corresponde a un único entrenamiento: la industria realiza decenas de entrenamientos a escala grande al año entre los laboratorios activos, más cientos de experimentos de escala menor, lo que hace que la cifra agregada sea varias veces superior. Además, la escala de los modelos ha seguido creciendo: los modelos entrenados en 2025 superan con frecuencia ese umbral.

**¿Qué es el efecto rebote y por qué importa para la energía de la IA?**
El efecto rebote (o paradoja de Jevons) describe el patrón donde la mejora en eficiencia de una tecnología reduce el coste por unidad de uso y, como consecuencia, expande el volumen de uso más de lo que la eficiencia ahorra. Aplicado a la IA: aunque los chips de cada generación hacen más cómputo por vatio, la demanda total de cómputo crece más rápido que la eficiencia mejora, de forma que el consumo agregado sube aunque el coste por operación baje. Este es el mecanismo por el que las proyecciones de la IEA estiman que el consumo eléctrico de los centros de datos casi se duplique entre 2024 y 2030, incluso asumiendo mejoras continuas en eficiencia.

**¿Por qué se concentran los centros de datos de IA en ciertos lugares geográficos?**
Porque requieren simultáneamente energía barata y abundante, suelo disponible, agua para refrigeración y conectividad de fibra óptica de alta capacidad. Esa combinación es escasa. El norte de Virginia, el noroeste de Irlanda, Singapur o los países nórdicos reúnen subconjuntos distintos de esas condiciones. A medida que la demanda crece y agota la capacidad disponible en esas ubicaciones, aparece la fricción sobre la red eléctrica local y los recursos hídricos, que son los primeros límites que el sector está encontrando antes de que llegue la capacidad de generación nueva.

**¿La mejora en eficiencia del hardware de IA reducirá su consumo energético global?**
Probablemente no en términos absolutos, aunque sí en términos relativos. Las mejoras en eficiencia de los chips reducen el coste por operación, lo que expande el mercado de aplicaciones viables y, con él, la demanda total. Es el mismo patrón que ocurrió con los teléfonos móviles: los chips actuales son miles de veces más eficientes que los primeros chips de móvil, pero el consumo eléctrico del sector de telecomunicaciones ha seguido creciendo porque el volumen de uso se multiplicó aún más.

---

## 5. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **IEA (2025)** — *Energy and AI* ([IEA][r1]) | Fuente primaria para proyecciones 415→945→1.260 TWh, comparativas de consumo por consulta, datos de agua y concentración geográfica de centros de datos. |
| R2 | **Greenpeace (2025)** — *Umweltauswirkungen der Künstlichen Intelligenz* ([Greenpeace][r2]) | Análisis del impacto ambiental de la IA: emisiones de carbono, consumo de agua y huella hídrica de centros de datos. |
| R3 | **Patterson, D. et al. (2021)** — *Carbon and the Broad Economy of Machine Learning* ([arXiv][r3]) | Marco metodológico para calcular la huella de carbono del entrenamiento; incluye propuestas de eficiencia energética para el sector. |
| R4 | **Jevons, W.S. (1865)** — *The Coal Question* | Formulación original de la paradoja de la eficiencia: la mejora tecnológica reduce el coste unitario pero expande el volumen de uso, con demanda total creciente. |
| R5 | **Strubell, E. et al. (2019)** — *Energy and Policy Considerations for Deep Learning in NLP* ([arXiv][r5]) | Primer análisis sistemático del coste energético y de carbono del entrenamiento de modelos de lenguaje a gran escala. |
| R6 | **Epoch AI (2023)** — *Trends in Machine Learning* ([Epoch AI][r6]) | Base de datos de modelos notables con estimaciones de compute, coste energético de entrenamiento y tendencias de escala. Fuente para la estimación de ~42 GWh en GPT-4. |
| R7 | **GCSAA / ASHS (2025)** — *Survey of Water Use and Management Practices on US Golf Courses from 2005 to 2024* | Encuesta nacional y paper revisado por pares sobre agua aplicada en campos de golf de EE.UU.; base para unos 2,01 billones de litros en 2024 y una mediana de unos 85 millones de litros por instalación. |

</details>

[r1]: https://www.iea.org/reports/energy-and-ai "Energy and AI — IEA"
[r2]: https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf "Umweltauswirkungen KI — Greenpeace"
[r3]: https://arxiv.org/abs/2104.10350 "Carbon and the Broad Economy of Machine Learning — arXiv"
[r4]: https://archive.org/details/coalquestionani00jevogoog "The Coal Question — Jevons (1865)"
[r5]: https://arxiv.org/abs/1906.02629 "Energy and Policy Considerations for Deep Learning in NLP — arXiv"
[r6]: https://epoch.ai/data/ai-models "AI Models — Epoch AI"
[r7]: https://journals.ashs.org/view/journals/horttech/35/5/article-p848.xml "Survey of Water Use and Management Practices on US Golf Courses from 2005 to 2024 — ASHS HortTechnology"
