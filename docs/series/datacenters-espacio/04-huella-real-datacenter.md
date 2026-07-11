---
title: La huella real de un datacenter
description: "Desglose completo del consumo de recursos de un centro de datos hiperscala: agua, energía, minerales críticos y ciclo de vida. Los datos calibran la conversación pública mejor que los titulares."
date: 2026-06-14
keywords: "consumo agua datacenters, huella ambiental inteligencia artificial, minerales críticos IA, PUE centros datos, WUE datacenter, cobalto minería IA, e-waste GPUs, golf vs datacenter agua, conflicto hídrico local"
tags:
  - IA
  - Infraestructura
  - Medioambiente
video: "04-huella-real-datacenter.mp4"
video_duration: "PT1M11S"
---

# Capítulo 4 — La huella real de un datacenter

Este capítulo desglosa la huella real de un centro de datos hiperscala en cuatro dimensiones: agua, energía, minerales críticos y ciclo de vida. Al terminarlo, dispondremos de los datos que calibran el debate público (la comparativa agregada entre golf y datacenters, los WUE por tecnología de refrigeración, la cadena de suministro del cobalto), entenderemos por qué el consumo de agua es un problema de concentración geográfica más que de magnitud global, y podremos evaluar qué restricciones resuelve el espacio y cuáles hereda sin ninguna ventaja añadida.

!!! info "Prerrequisitos"
    Este capítulo asume que conoces los conceptos introducidos en el [Capítulo 3 — Qué es un datacenter en el espacio](./03-que-es-datacenter-espacio.md).

Los tres capítulos anteriores construyeron el argumento de por qué el espacio entra en la conversación sobre infraestructura computacional: la demanda crece más rápido que la infraestructura terrestre puede absorber, y varios de los cuellos de botella tienen componentes físicos que el entorno orbital resuelve de forma diferente. Antes de evaluar si ese replanteamiento tiene sentido, conviene entender con precisión qué consume exactamente un centro de datos en tierra, porque la narrativa pública sobre ese consumo está con frecuencia mal calibrada: exagera en agua, subestima en minerales, y omite casi siempre la dimensión del ciclo de vida.

---

## 1. La comparación que calibra la conversación

En Estados Unidos, los centros de datos retiran en conjunto unos 449 millones de galones de agua al día, mientras que los campos de golf retiran aproximadamente 2.000 millones ([MOST][r3]). Ambos volúmenes quedan muy por debajo de la escala agrícola nacional, que sigue dominando el agregado por uno o varios órdenes de magnitud ([MOST][r3]).

Esta comparación no pretende zanjar el debate sobre el impacto ambiental de los centros de datos, sino calibrarlo. El problema del agua en este sector existe, pero su lectura correcta es más geográfica que agregada: depende mucho del clima local, del tipo de refrigeración y de si la instalación se ubica en una cuenca ya tensionada. Microsoft, por ejemplo, publica WUE por región precisamente porque el perfil hídrico cambia de forma significativa según el emplazamiento y la arquitectura térmica ([Microsoft Water][r1]).

El punto no es que los campos de golf sean el problema y los centros de datos no. Es que la conversación pública sobre el agua en los centros de datos se produce casi siempre sin ese contexto, lo que dificulta evaluar qué parte de la preocupación es proporcional a la magnitud real del consumo y qué parte responde a otros factores: la visibilidad del sector, la concentración en zonas con problemas hídricos preexistentes, o la asociación con empresas cuya escala general genera desconfianza independientemente del vector ambiental concreto.

{{ include_html("snippets/datacenters-espacio/04-agua-comparativa.html") }}

---

## 2. Agua: el retiro, el consumo y la tecnología que lo determina

La primera distinción que se suele omitir en el debate sobre el agua en los centros de datos es la diferencia entre retiro y consumo. El retiro es el volumen total que se extrae de una fuente, ya sea acuífero, río o red municipal. El consumo es el volumen que efectivamente se pierde hacia la atmósfera o queda incorporado en algún producto, por lo que no puede reutilizarse de forma inmediata en el mismo ciclo local. En un centro de datos con refrigeración por evaporación, la diferencia entre ambas cifras es grande: de toda el agua que se retira para pasar por las torres de refrigeración, entre el 70 y el 80 por ciento se evapora, y el resto se descarga como purga, con una concentración de minerales y tratamientos químicos que requiere gestión específica antes de poder verterse.

La métrica que cuantifica esta eficiencia se llama WUE (Water Usage Effectiveness), definida como los litros de agua consumidos por kilovatio-hora de energía entregada al equipamiento de cómputo. Un centro de datos antiguo con refrigeración de aire puede tener un WUE de cero porque simplemente no usa agua directa para refrigerar, aunque a costa de un consumo eléctrico más elevado. Un centro con evaporación convencional tiene un WUE típico de entre 1,5 y 2,5 litros por kWh ([arXiv][r6]). El mejor resultado documentado aquí es el diseño de Microsoft en Iowa, que usa refrigeración adiabática con aire exterior durante la mayor parte del año, con agua solo cuando la temperatura ambiente supera aproximadamente los 29 °C: su WUE publicado es de 0,19 litros por kWh ([Microsoft Iowa][r4]).

{{ include_html("snippets/datacenters-espacio/04-wue-refrigeracion.html") }}

{{ include_html("snippets/datacenters-espacio/04-agua-indirecta.html") }}

La irrupción de la IA ha añadido una nueva dimensión a este debate que no existía hace cinco años: el consumo por transacción se ha vuelto una cifra visible en el debate público. Pero esas cifras solo son comparables cuando normalizan la misma carga de cómputo. Si una instalación entrega 1 MWh al equipamiento de IA, un centro con evaporación convencional puede consumir entre 1.500 y 2.500 litros de agua, el diseño adiabático de Microsoft Iowa unos 190 litros, y un circuito cerrado o de inmersión prácticamente cero evaporación directa. La diferencia de orden de magnitud nace del WUE de la instalación, no de mezclar consultas o modelos distintos ([Microsoft Iowa][r4], [arXiv][r6]).

La tendencia del sector apunta a reducir el peso relativo de la evaporación como mecanismo dominante, no porque los operadores hayan decidido priorizar el medioambiente sobre el coste, sino porque la densidad de calor de los racks de IA de última generación supera el límite de lo que la refrigeración por aire puede gestionar con eficiencia. Eso no significa que la evaporación desaparezca mañana: en muchos diseños sigue apareciendo como apoyo cuando sube la temperatura exterior. Pero sí empuja hacia más circuito cerrado, inmersión y otras arquitecturas donde el agua se usa menos como consumible y más como parte de un ciclo técnico.

---

## 3. Energía: la prima de la IA y lo que implica

El consumo energético de los centros de datos globales se sitúa en torno a 415 TWh en 2024, con proyecciones que apuntan a casi duplicar esa cifra hasta 945 TWh en 2030, lo que representaría alrededor del 3 por ciento del consumo eléctrico mundial ([FAS][r13]). En Estados Unidos, que acumula aproximadamente el 45 por ciento de la capacidad instalada global, el sector pasó del 4,4 por ciento de la demanda nacional en 2023 a proyecciones de hasta el 12 por ciento en 2028 ([FAS][r13]). La magnitud de esos números es real, pero hay una cuestión de contexto: no todo ese crecimiento es ineficiencia. Gran parte es demanda nueva que antes no existía como tal en la economía del cómputo, porque los modelos de lenguaje grande a escala de uso masivo tampoco existían.

{{ include_html("snippets/datacenters-espacio/04-sector-consumo.html") }}

La métrica que mide la eficiencia energética del centro de datos como instalación es el PUE (Power Usage Effectiveness), definido como la ratio entre la potencia total que consume la instalación, incluyendo refrigeración, distribución eléctrica y sistemas auxiliares, y la potencia que llega efectivamente al equipamiento de cómputo. Un PUE de 2,0 significa que por cada vatio que procesa un servidor se consume otro vatio en infraestructura de soporte, de forma que la mitad de la energía no genera cómputo. Los centros de datos de la generación anterior operaban frecuentemente en ese rango. Las instalaciones hiperscala modernas se acercan mucho más a 1,1 que a 2,0, de modo que a escala de centenares de megavatios la mejora del overhead de infraestructura es enorme aunque la demanda total del sector siga creciendo.

{{ include_html("snippets/datacenters-espacio/04-pue-trayectoria.html") }}

Lo que ha cambiado con la IA no es principalmente el PUE de la instalación, que los operadores hiperscala han seguido mejorando, sino la densidad de potencia por rack. Un rack de servidores convencionales consumía entre 5 y 15 kW. Los primeros racks de GPU para inferencia de IA se instalaron en el rango de 50 a 100 kW. El rack GB200 NVL72 de Nvidia, que conecta 72 GPUs Blackwell en un único tejido de cómputo, ronda los 120 kW a plena carga, un salto que convierte la refrigeración líquida en requisito práctico de operación ([NVIDIA][r7]). Ningún sistema de aire puede gestionar 120 kW por rack dentro de un edificio convencional con pasillos calientes y fríos.

Esta escalada de densidad obliga a rediseñar no solo los sistemas de refrigeración sino la distribución eléctrica, los suelos técnicos y la propia estructura del edificio. Los centros de datos construidos para cargas de 10 a 20 kW por rack necesitan actualizaciones de infraestructura sustanciales para acomodar hardware de IA de última generación, lo que explica parte del frenesí de construcción nueva y parte de la dificultad para predecir la evolución del consumo energético del sector: no es solo más cómputo, es un tipo de cómputo físicamente diferente.

{{ include_html("snippets/datacenters-espacio/04-energia-densidad.html") }}

---

## 4. Los minerales: la parte que no sale en los titulares

El debate público sobre los centros de datos se concentra en el agua y la energía porque son los recursos con impacto más visible y más fácilmente cuantificable en términos de infraestructura local. Los minerales que componen el hardware son invisibles en el centro de datos pero concentran algunos de los riesgos más difíciles de gestionar de toda la cadena de valor: riesgo geopolítico, riesgo de suministro y consecuencias sociales en las regiones de extracción.

Un rack de GPUs de IA no es solo silicio. El silicio ultrapuro del sustrato de los chips requiere impurezas controladas de boro, fósforo o arsénico para definir sus propiedades eléctricas. Los interconectados entre los miles de millones de transistores usan cobre como conductor principal y cobalto en los nodos más avanzados para resistir la migración electrónica. Las baterías de litio-ion de los sistemas de alimentación ininterrumpida, que han sustituido a las baterías de plomo-ácido por su menor tamaño y mayor vida útil, contienen cátodos de níquel-manganeso-cobalto. Los condensadores de alta frecuencia usan tántalo. Los motores de los discos duros y los transceptores de fibra óptica requieren imanes permanentes de neodimio y disprosio, tierras raras cuya refinación está concentrada en un 91 por ciento en China ([SFA][r8], [JPMorgan][r11]).

{{ include_html("snippets/datacenters-espacio/04-minerales-cadena.html") }}

{{ include_html("snippets/datacenters-espacio/04-cobalto-cadena.html") }}

El cobalto es el caso más documentado y más extremo. Aproximadamente el 74 por ciento de la producción mundial procede de la República Democrática del Congo, y alrededor del 67 por ciento de la refinación global se realiza en China ([SFA][r8]). Investigaciones publicadas en 2024 sobre zonas de extracción en la provincia de Lualaba identificaron lo que los autores describen como zonas de sacrificio: comunidades donde la contaminación por minería industrial ha alcanzado niveles que afectan de forma sistemática a la salud de la población local. Las encuestas documentaron que el 56 por ciento de mujeres y niñas en comunidades cercanas a cinco minas importantes reportaban problemas de salud reproductiva y ginecológica, con tasas elevadas de abortos y malformaciones. El 72 por ciento de los residentes informó de enfermedades de piel crónicas vinculadas al contacto con ríos clasificados como hiperácidos por vertidos de ácido sulfúrico y roturas de balsas de residuos mineros ([RAID][r9]).

La industria tecnológica ha puesto en marcha iniciativas como la Fair Cobalt Alliance, cofundada por Apple, Google y Microsoft, que en el primer semestre de 2024 reportó distribución de equipos de protección a lavadoras artesanales, cubrimiento de seis pozos de minería para prevenir colapsos y la incorporación de 18 menores a programas de remediación ([FCA][r14]). Son iniciativas con impacto medible, aunque la escala del problema, con hasta 250.000 personas vinculadas a la minería artesanal en el Congo, las supera con comodidad ([FCA][r14]).

El tántalo tiene una situación geopolítica diferente pero igualmente concentrada: Estados Unidos importa el ciento por ciento de su tántalo, procedente en su mayor parte de Rwanda y del Congo. El cobre, que conecta los buses de datos, los disipadores de calor y la distribución eléctrica de los propios edificios, proviene en un 40 por ciento de Chile y Perú. La geografía de la dependencia mineral de la infraestructura tecnológica es, en resumen, global, concentrada y difícil de sustituir en plazos cortos ([JPMorgan][r11]).

---

## 5. Vida útil, e-waste y la economía circular de las GPUs

Un servidor puede seguir siendo técnicamente utilizable durante muchos años. En la práctica, el ciclo de renovación habitual en la industria es de tres a cinco años, impulsado por las garantías de los fabricantes y por la ventaja de rendimiento de la siguiente generación de hardware, que en el caso de los aceleradores de IA ha sido suficientemente grande para justificar la renovación anticipada. Esta distancia entre la vida útil técnica y el ciclo de renovación real es uno de los determinantes del volumen de residuos electrónicos que genera el sector.

La respuesta de los grandes operadores ha tomado la forma de centros circulares: instalaciones dedicadas a evaluar, recondicionar y redistribuir hardware que ha terminado su vida activa en el centro de datos principal pero que tiene capacidad técnica suficiente para otros usos. Microsoft reportó en 2024 una tasa de reutilización y reciclaje del 90,9 por ciento de los componentes de servidor, con procesamiento de embalajes de más de 30.000 racks y desvío de 2.500 toneladas métricas de residuos de los vertederos ([Microsoft][r12]). Cuando el hardware alcanza verdaderamente el final de su vida útil, la recuperación de metales y componentes reutilizables añade un incentivo económico real, además del argumento ambiental.

{{ include_html("snippets/datacenters-espacio/04-h100-recuperacion.html") }}

A escala de las decenas de miles de GPUs que un operador hiperscala renueva en cada ciclo, esa cifra convierte la gestión del fin de vida en un negocio, no solo en un coste de cumplimiento. Esta economía de la recuperación tiene además una lógica de reducción de dependencia geopolítica: si los metales críticos se recuperan localmente de hardware en fin de vida, la dependencia neta de minería primaria se reduce. Los volúmenes de nueva demanda creados por el crecimiento del sector superan ampliamente los volúmenes recuperables del hardware existente, así que la circularidad no es una solución completa, pero sí reduce la exposición marginal y crea infraestructura de procesamiento que puede escalarse.

---

## 6. El balance real

La huella de un centro de datos moderno es, en el análisis desagregado, más matizada de lo que los dos extremos del debate público sugieren. El consumo energético del sector va a casi duplicarse de aquí a 2030, la dependencia de minerales con cadenas de suministro éticamente comprometidas es real y difícil de resolver a corto plazo, y la concentración de instalaciones en regiones con estrés hídrico crea tensiones locales que no desaparecen por el hecho de que el sector sea pequeño a escala nacional. Pero el consumo de agua agregado sigue siendo menor que el de otros usos intensivos, la eficiencia energética de los operadores hiperscala ha mejorado de forma continua, y los ciclos de vida del hardware están mejorando.

Lo que emerge del análisis es el mapa de los problemas reales y su naturaleza distinta. El agua es un problema de concentración geográfica más que de magnitud global: el impacto se produce donde se cruzan zonas de estrés hídrico y densidad de instalaciones, no en el agregado nacional. La energía es un problema de escala creciente que se puede mitigar con generación sin carbono pero no eliminar con eficiencia sola. Y los minerales son el problema menos visible y más estructuralmente difícil, porque dependen de geografías de riesgo que la tecnología no puede reemplazar en el corto plazo.

Este inventario de restricciones es el punto de partida adecuado para evaluar el argumento de los datacenters en el espacio. Las fricciones que el capítulo 1 identificó como cuellos de botella tienen en el espacio respuestas físicamente distintas: la energía solar directa sin pérdidas atmosféricas elimina la dependencia de red, el vacío hace innecesaria el agua para refrigeración y el calor se gestiona por radiación. Los minerales, en cambio, son un problema que no tiene solución orbital: cualquier hardware que se lleve al espacio lleva consigo exactamente la misma huella mineral que tiene en tierra, más los materiales adicionales para los radiadores, paneles solares y protección contra la radiación. El espacio resuelve algunos problemas de la infraestructura terrestre y hereda otros sin ninguna ventaja añadida.

---

## Preguntas frecuentes

**¿Consumen realmente mucha agua los centros de datos en comparación con otras industrias?**
En términos absolutos, los centros de datos de EE.UU. retiran unos 449 millones de galones de agua al día. Los campos de golf retiran aproximadamente 2.000 millones, unas 4,5 veces más, y la agricultura sigue dominando el agregado nacional por uno o varios órdenes de magnitud ([MOST][r3]). El problema real no es tanto la magnitud agregada como la concentración: los centros de datos se instalan en zonas ya tensionadas hídricamente por su clima favorable, y eso crea conflictos locales que no refleja por sí solo el dato nacional.

**¿Qué es el WUE y cuánto varía según la tecnología de refrigeración?**
WUE (Water Usage Effectiveness) mide los litros de agua consumidos por kilovatio-hora entregado al cómputo. Un centro con refrigeración por evaporación convencional tiene un WUE de 1,5 a 2,5 litros por kWh ([arXiv][r6]). El diseño publicado por Microsoft para Iowa reporta 0,19, con refrigeración adiabática que usa agua solo cuando la temperatura supera aproximadamente los 29 °C ([Microsoft Iowa][r4]). Los sistemas de inmersión en fluido dieléctrico o circuito cerrado tienen un WUE próximo a cero porque el agua no se evapora. La diferencia entre el estándar mayoritario y la mejor práctica documentada supera el factor 10.

**¿Cuánto puede cambiar el agua consumida por la misma carga de cómputo según la refrigeración?**
Mucho. WUE (Water Usage Effectiveness) mide los litros de agua consumidos por kilovatio-hora entregado al cómputo. Para la misma carga IT, un centro con refrigeración por evaporación convencional consume entre 1,5 y 2,5 litros por kWh, el diseño adiabático de Microsoft Iowa 0,19, y un circuito cerrado o de inmersión prácticamente cero evaporación directa ([Microsoft Iowa][r4], [arXiv][r6]). Si la referencia es 1 MWh entregado al cómputo, eso equivale a 1.500-2.500 litros frente a unos 190 litros, o incluso menos. La variable decisiva aquí es la refrigeración del centro, no comparar modelos o consultas que no están normalizados.

**¿Qué minerales críticos contiene una GPU de IA y de dónde proceden?**
Los más relevantes son cobalto (cátodos de batería NMC, interconectados en nodos de chip avanzados), cuya producción está concentrada en un 74% en la RDC y un 67% de la refinación en China, tierras raras como neodimio y disprosio (imanes de discos duros, transceptores de fibra), con un 91% de refinación en China, tántalo (condensadores de alta frecuencia), del que EE.UU. importa el 100%, y cobre (interconectados, disipadores, distribución eléctrica) ([SFA][r8], [JPMorgan][r11]). El cobalto es el caso con consecuencias humanas más documentadas: comunidades mineras en Lualaba, RDC, registran tasas del 56% de problemas reproductivos y 72% de enfermedades de piel vinculadas a la contaminación ([RAID][r9]).

**¿Qué ocurre con las GPUs y el hardware de los datacenters cuando se retiran?**
Los grandes operadores han adoptado el modelo de centros de circularidad: evalúan, reacondicionan y redistribuyen el hardware que sale de los datacenters principales antes de que alcance el verdadero fin de vida. Microsoft reportó en 2024 una tasa de reutilización y reciclaje del 90,9% de componentes de servidor ([Microsoft][r12]). Cuando el hardware ya no puede reutilizarse, la recuperación de metales y componentes añade un incentivo económico real, de modo que el fin de vida se gestiona como una cadena de valor y no solo como un coste de cumplimiento.

---

## 7. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Microsoft (2025)** — *Understanding water use at Microsoft datacenters* ([Microsoft Water][r1]) | Cómo Microsoft contextualiza el agua por región y publica métricas WUE por emplazamiento. |
| R3 | **MOST Policy Initiative (2024)** — *Data Center Water Use* ([MOST][r3]) | Distinción entre retiro y consumo, US DCs: 449M galones/día y contexto agregado frente a agricultura y otros usos. |
| R4 | **Microsoft (Iowa factsheet)** — *Central US datacenter sustainability factsheet* ([Microsoft Iowa][r4]) | WUE publicado de 0,19 y uso de refrigeración adiabática en Iowa. |
| R6 | **arXiv (2025)** — *The Environmental Impact of AI Servers and Sustainable Solutions* ([arXiv][r6]) | Proyecciones AI water 2030: +200-300B galones/año US y WUE evaporativo de 1,5-2,5 L/kWh. |
| R7 | **NVIDIA (2026)** — *Mission Control FAQ for GB200/GB300 NVL72* ([NVIDIA][r7]) | GB200 NVL72: 72 GPUs, 18 nodos y ~120 kW por rack a plena carga. |
| R8 | **SFA Oxford (2024)** — *Critical Minerals in AI and Digital Technologies* ([SFA][r8]) | Cobalto, tierras raras, tántalo y cobre en semiconductores y baterías, con dependencias geopolíticas. |
| R9 | **RAID UK (2024)** — *Environmental and Human Costs of DRC Cobalt Demand* ([RAID][r9]) | Zonas de sacrificio en Lualaba, 56% de mujeres con problemas reproductivos, 72% de enfermedades de piel y ríos hiperácidos. |
| R11 | **J.P. Morgan (2024)** — *The Growing Demand for Critical Minerals* ([JPMorgan][r11]) | Proyecciones demanda REE, cobalto y cobre para infraestructura digital 2025-2030. |
| R12 | **Microsoft (2025)** — *Environmental Sustainability Report 2025* ([Microsoft][r12]) | Tasa de reutilización/reciclaje del 90,9% en FY24, 2.500 t de residuos desviados y 30.000 racks procesados. |
| R13 | **FAS / Federation of American Scientists (2025)** — *Measuring AI's Energy and Environmental Footprint* ([FAS][r13]) | Global DCs: 415 TWh (2024) → 945 TWh (2030), y US: 4,4% → hasta 12% de la demanda nacional en 2028. |
| R14 | **Fair Cobalt Alliance (2024)** — *FCA Mid-Year Report 2024* ([FCA][r14]) | 250.000 personas en minería artesanal, distribución de EPP y 18 menores en programas de remediación. |

</details>

[r1]: https://local.microsoft.com/blog/understanding-water-use-at-microsoft-datacenters/ "Understanding water use at Microsoft datacenters — Microsoft"
[r3]: https://mostpolicyinitiative.org/science-note/data-center-water-use/ "Data Center Water Use — MOST Policy Initiative"
[r4]: https://datacenters.microsoft.com/globe/pdfs/sustainability/factsheets/Iowa%20%28Central%20US%29.pdf "Iowa (Central US) factsheet — Microsoft"
[r6]: https://arxiv.org/html/2601.06063v1 "Environmental Impact of AI Servers — arXiv"
[r7]: https://docs.nvidia.com/mission-control/docs/systems-administration-guide/2.0.0/prs/faq.html "Mission Control FAQ for GB200/GB300 NVL72 — NVIDIA"
[r8]: https://www.sfa-oxford.com/knowledge-and-insights/critical-minerals-in-low-carbon-and-future-technologies/critical-minerals-in-artificial-intelligence/ "Critical Minerals in AI — SFA Oxford"
[r9]: https://raid-uk.org/report-environmental-pollution-human-costs-drc-cobalt-demand-industrial-mines-green-energy-evs-2024/ "DRC Cobalt Human Costs — RAID"
[r11]: https://www.jpmorgan.com/insights/global-research/commodities/critical-minerals "Critical Minerals Demand — J.P. Morgan"
[r12]: https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/msc/documents/presentations/CSR/2025-Microsoft-Environmental-Sustainability-Report.pdf "Environmental Sustainability Report — Microsoft"
[r13]: https://fas.org/publication/measuring-and-standardizing-ais-energy-footprint/ "AI Energy Footprint — FAS"
[r14]: https://faircobaltalliance.org/blog/fca-mid-year-report-2024/ "Fair Cobalt Alliance Mid-Year 2024 — FCA"
