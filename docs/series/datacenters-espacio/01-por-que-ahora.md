---
title: Por qué ahora — demanda de cómputo y cuellos de botella en tierra
description: Por qué el cómputo en órbita se discute ahora mismo. La presión de la demanda de IA sobre la infraestructura terrestre y los límites que hacen el espacio relevante.
date: 2026-06-14
keywords: "datacenter espacio, computación orbital, infraestructura IA, coste lanzamiento cohetes, cuellos botella datacenter, Starship coste kilogramo, SpaceX FCC, demanda cómputo IA, estrés hídrico datacenter"
tags:
  - IA
  - Infraestructura
  - Energía
video: "01-por-que-ahora.mp4"
video_duration: "PT1M0S"
---

# Capítulo 1 — Por qué ahora

En este capítulo describimos la presión que la demanda de cómputo de IA ejerce sobre la infraestructura terrestre y los seis cuellos de botella que limitan la expansión de los centros de datos en tierra. Al terminarlo, entenderemos qué ha hecho que el espacio entre en la conversación como alternativa para ciertos casos de uso.

La idea de poner infraestructura computacional en el espacio no es nueva. Lo nuevo es que por primera vez confluyen tres factores que hacen esta conversación más factible: una demanda de cómputo que crece más rápido que la infraestructura terrestre puede absorber, un coste de lanzamiento al espacio que ha bajado en órdenes de magnitud en la última década, y una industria espacial comercial con capacidad real de desplegar infraestructura en órbita.

---

## 1. La explosión de la demanda de cómputo

La IA generativa ha sido el catalizador más visible de la aceleración en demanda de cómputo, pero no es el único. El entrenamiento de modelos grandes, la inferencia a escala para cientos de millones de usuarios, el procesamiento de datos de sensores y satélites, la simulación científica y los sistemas de vehículos autónomos requieren todos cómputo intensivo y especializado.

La cantidad de cómputo usada para entrenar modelos de vanguardia ha aumentado unas *350.000* veces desde 2014, según la Agencia Internacional de la Energía ([IEA][r1]). En paralelo, el consumo eléctrico de los centros de datos de IA pasó de 460 TWh en 2022 a proyecciones que superan los 1.000 TWh en 2026 (equivalente al consumo total de Japón), con una predicción base de 945 TWh para 2030 si los factores de eficiencia se comportan como se espera ([IEA][r1], [IEA][r2]). Si la adopción de la IA acelera más de lo previsto, este mismo indicador podría superar los 1.260 TWh ([IEA][r1]).

La particularidad de este tipo de demanda es su concentración. Los racks de GPU para IA no son millones de usuarios navegando por internet, cuya carga puede distribuirse geográficamente. Son cargas de trabajo que requieren hardware especializado, refrigeración activa intensiva y conectividad de alta velocidad, y que se benefician de estar concentradas en ubicaciones con acceso a energía barata, suelo disponible y condiciones climáticas favorables. Un centro de datos hiperscala moderno puede necesitar una potencia de conexión de entre 100 MW y varios gigavatios, y densidades de rack que alcanzan los 40-120 kW por gabinete, límite en el que el aire ha dejado de ser suficiente para refrigerar ([Greenpeace][r3]).

---

## 2. Los cuellos de botella en tierra

Construir más centros de datos en tierra no es ilimitadamente escalable. Hay seis problemas principales que ralentizan la expansión de la infraestructura terrestre, y a diferencia de los análisis de hace cinco años, hoy hay cifras concretas sobre cada una de ellas.

{{ include_html("snippets/datacenters-espacio/01-demanda-cuellos.html") }}

### Red eléctrica

Los centros de datos de gran escala consumen energía a ritmos que las redes eléctricas locales no siempre pueden absorber. Google reportó en enero de 2026 que los plazos de conexión a la red se han convertido en su mayor limitante operativo: algunas compañías de distribución citan tiempos de espera de cuatro a diez años, y al menos una le comunicó que el proceso de estudio de interconexión solo llevaría doce años ([Network World][r4]). Según el análisis de la IEA, alrededor del 20% de la capacidad de centros de datos planificada globalmente para 2030 está en riesgo de retraso por congestión de red ([IEA][r1]).

### Agua para refrigeración

Un centro de datos hiperscala de 100 MW consume en torno a dos millones de litros de agua al día, el equivalente al consumo doméstico de unas 6.500 familias ([GOV.UK][r5]). Globalmente, el sector consume hoy alrededor de 560.000 millones de litros al año, y ese número podría alcanzar 1,2 billones de litros en 2030 ([GOV.UK][r5]). En zonas con estrés hídrico (que son muchas de las más atractivas por su clima o coste del suelo), ese consumo genera conflictos reales con la agricultura, el consumo doméstico y la regulación ambiental.

### Terreno y planificación

Un centro de datos de 1.000 MW puede ocupar varios kilómetros cuadrados. En las regiones con mayor demanda (Virginia del Norte, Silicon Valley, el corredor FLAP-D europeo: Frankfurt, London, Amsterdam, Paris y Dublin), el suelo disponible con acceso a infraestructura eléctrica, conectividad de fibra y condiciones climáticas razonables es escaso y caro. El efecto NIMBY (not in my backyard) añade fricción política en zonas densas.

### Permisología y regulación

Obtener los permisos para un centro de datos nuevo puede llevar desde muchos meses hasta varios años. En la Unión Europea, los requisitos de la directiva de eficiencia energética añaden una capa adicional. Además, la infraestructura de transmisión eléctrica asociada suele avanzar más despacio que el propio edificio, así que el cuello no está solo en el centro sino en todo lo que hay que conectar alrededor.

### Calor como externalidad

El calor residual de los centros de datos es una externalidad con gestión compleja. Las densidades de rack que requieren la IA moderna (40-120 kW) ya exigen refrigeración líquida, que es más eficiente pero también más cara de instalar y mantener. En zonas densas, ese calor contribuye al efecto de isla de calor urbano. Algunos operadores exploran la recuperación de calor residual para sistemas de calefacción urbana, pero son soluciones que dependen de la proximidad a infraestructura urbana adecuada.

### Latencia y redundancia

Para aplicaciones que requieren baja latencia, la proximidad geográfica al usuario importa. Un datacenter que introduce demasiadas decenas de milisegundos de retraso queda fuera del umbral de muchas aplicaciones en tiempo real. Distribuir cómputo geográficamente resuelve la latencia pero multiplica los costes de gestión y puede crear inconsistencias de datos entre regiones.

---

## 3. Por qué el espacio entra en la conversación

Ninguna de estas fricciones desaparece en el espacio. Pero algunas cambian de naturaleza de forma que podría hacer el espacio ventajoso para ciertas cargas de trabajo.

La premisa más obvia es la energía solar: en órbita, los paneles solares reciben irradiación de 1.361-1.367 W/m² sin absorción atmosférica y, en las órbitas más favorables, con exposición mucho más continua que en tierra. En órbitas heliosíncronas de amanecer y ocaso, el white paper corporativo de Starcloud/Lumen Orbit proyecta factores de capacidad del 95-99%, frente al 15-25% de las instalaciones terrestres ([Starcloud][r10]). Bajo esos mismos supuestos de lanzamiento, amortización y operación, ese documento estima un coste energético equivalente en torno a 0,002 dólares por kWh. Es una proyección de industria, no un precio de mercado observado ([Starcloud][r10]).

La premisa que más se repite en los artículos de divulgación es el frío del espacio para refrigeración. Esta premisa es más complicada de lo que parece, y es el tema del siguiente capítulo.

{{ include_html("snippets/datacenters-espacio/01-por-que-espacio.html") }}

Lo que sí es real como ventaja potencial: para aplicaciones que procesan datos de satélites en órbita, procesar en el propio satélite o en infraestructura orbital cercana puede reducir drásticamente el volumen de datos que necesita bajar a tierra (downlink), que es uno de los recursos más limitados en la cadena de satélites. El paper FOOL (Addressing the Downlink Bottleneck in Satellite Computing, 2024) muestra que la compresión neuronal de características puede reducir el ancho de banda necesario hasta en un 80% sin pérdida de información relevante para las tareas más comunes de observación de la Tierra ([arXiv][r8]).

---

## 4. El punto de inflexión del coste de lanzamiento

El coste de lanzamiento al espacio ha bajado dramáticamente. Lanzar un kilogramo a órbita baja costaba 88.000 dólares con el Transbordador Espacial. Hoy, los rangos que suelen citarse para lanzadores reutilizables comerciales están en el orden de 1.400 a 2.500 dólares por kilogramo, según el vehículo y la misión ([Space Investments][r9]). Para el Starship, SpaceX proyecta llegar por debajo de los 200 dólares por kilogramo hacia mediados de la década de 2030, con estimaciones más optimistas que hablan de 30 dólares o incluso 10 dólares por kilogramo en el escenario de plena reutilización ([Space Investments][r9]).

{{ include_html("snippets/datacenters-espacio/01-lanzamiento-inflection.html") }}

El 4 de febrero de 2026, Elon Musk hizo la declaración más explícita hasta la fecha sobre el papel del espacio en la infraestructura de IA: "Mi predicción es que dentro de 36 meses, o quizás 30, el lugar más barato para desplegar IA será el espacio" ([YouTube][r7]). El argumento central es que fuera de China, la producción eléctrica global se ha mantenido prácticamente plana mientras la producción de chips crece exponencialmente, y que construir nueva generación en tierra tiene plazos que no se compaginan con la velocidad de adopción de la IA. El espacio, según esta tesis, resuelve el cuello de botella energético accediendo a energía solar sin restricciones de red.

Una semana antes, el 30 de enero de 2026, SpaceX había presentado ante la FCC una solicitud para operar una constelación de hasta un millón de satélites para centros de datos orbitales, con un potencial de 100 GW de cómputo de IA. La FCC aceptó la solicitud para comentario público en febrero del mismo año, pero la petición no incluía calendario de despliegue ni estimación de costes detallada ([SpaceNews][r6]).

Eso no significa que los costes de lanzamiento hayan dejado de ser una barrera. El Falcon 9 sigue costando entre 1.500 y 2.500 dólares por kilogramo, lo que hace que una instalación de megavatios de computación sea varias veces más cara en el espacio que en tierra, incluso antes de contar con los sistemas de gestión térmica ([Space Investments][r9]). Pero la brecha se ha reducido hasta el punto en que para determinadas cargas de trabajo muy específicas, el análisis económico ya no es trivialmente negativo para la opción espacial.

El siguiente capítulo examina exactamente qué significa físicamente tener computación en órbita: energía, calor, conectividad y los mitos que rodean a cada una de estas dimensiones.

---

## Preguntas frecuentes

**¿Cuáles son los principales cuellos de botella que frenan la expansión de los centros de datos en tierra?**
Hay seis cuellos de botella recurrentes. La red eléctrica: algunos operadores ya hablan de plazos de varios años para conseguir nueva capacidad ([Network World][r4]). El agua: un centro de 100 MW puede consumir en torno a dos millones de litros al día en determinados esquemas de refrigeración ([GOV.UK][r5]). El terreno y los permisos: los campus más grandes ocupan superficies muy extensas y necesitan tramitaciones lentas, sobre todo si también exigen nueva red de transporte ([Greenpeace][r3]). El calor: las densidades de rack asociadas a la IA ya están llevando al límite la refrigeración por aire ([Greenpeace][r3]). Y la latencia: para aplicaciones sensibles al tiempo de respuesta sigue haciendo falta proximidad física al usuario final.

**¿Cuánto ha bajado el coste de lanzamiento al espacio en las últimas décadas?**
De decenas de miles de dólares por kilogramo en la era del Transbordador Espacial a rangos del orden de 1.400-2.500 dólares con lanzadores reutilizables actuales ([Space Investments][r9]). Starship apunta a bajar de forma adicional ese coste en la década de 2030, pero esas cifras siguen siendo proyecciones y no precios operativos observados. Esa caída de más de un orden de magnitud es lo que hace que el análisis económico de los datacenters orbitales ya no sea trivialmente negativo para ciertos casos de uso, aunque el coste siga siendo varias veces superior al de la infraestructura terrestre equivalente.

**¿Qué argumentó Elon Musk sobre el espacio como infraestructura de IA?**
El 4 de febrero de 2026 declaró que en 30-36 meses el lugar más barato para desplegar IA sería el espacio ([YouTube][r7]). Su tesis es que la nueva demanda eléctrica de la IA crece más rápido que la capacidad de construir generación y red en tierra, mientras que en órbita se puede acceder a energía solar casi continua. Una semana antes, SpaceX había presentado ante la FCC una solicitud para una constelación de hasta un millón de satélites para computación orbital, aunque esa petición no incluía calendario de despliegue ni estimación detallada de costes ([SpaceNews][r6]).

**¿Qué ventaja única tiene el espacio respecto a la infraestructura terrestre para la IA?**
La ventaja más sólida está en la energía: en las órbitas más favorables, los paneles solares pueden recibir luz casi continua salvo eclipses breves, algo imposible en tierra ([Starcloud][r10]). Para ciertos casos de uso, además, la computación orbital reduce el cuello de botella del downlink: procesar en el propio satélite y bajar solo los resultados puede recortar mucho el ancho de banda necesario ([arXiv][r8]). La cautela aquí es importante: la ventaja energética es potencial y depende de que el coste de lanzamiento y el sistema térmico no se coman ese beneficio.

**¿Qué es el paper FOOL y qué propone para el cuello de botella del downlink satelital?**
FOOL (*Addressing the Downlink Bottleneck in Satellite Computing with Neural Feature Compression*, 2024) propone usar compresión neuronal de características directamente a bordo del satélite: en lugar de bajar los datos brutos de observación de la Tierra, el satélite ejecuta una red neuronal que extrae las características relevantes y solo transmite esas, que pueden ser órdenes de magnitud más pequeñas. Los autores muestran reducciones de hasta un 80% en el ancho de banda necesario para tareas comunes de observación, lo que refuerza la idea de que el procesamiento a bordo es hoy el caso de uso orbital con mejor justificación práctica ([arXiv][r8]).

---

## 5. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **IEA (2025)** — *Energy and AI* ([IEA][r1]) | Proyecciones de consumo energético de la IA (350.000x compute growth, TWh projections). |
| R2 | **IEA (2024)** — *Electricity 2024: Analysis and Forecast to 2026* ([IEA][r2]) | Datos de consumo eléctrico de centros de datos 2022-2026. |
| R3 | **Greenpeace (2025)** — *Umweltauswirkungen KI* ([Greenpeace][r3]) | Impacto ambiental de los centros de datos de IA, densidades de rack y huella de suelo. |
| R4 | **Google / Network World (2026)** — *Grid connection delays as biggest threat* ([Network World][r4]) | Declaraciones de Google sobre plazos de interconexión eléctrica de 4-12 años. |
| R5 | **UK Government (2025)** — *Water use in AI and Data Centres* ([GOV.UK][r5]) | Consumo hídrico por MW de centro de datos y proyecciones globales 2030. |
| R6 | **SpaceNews (2026)** — *SpaceX files plans for million-satellite orbital data center constellation* ([SpaceNews][r6]) | Solicitud ante la FCC para constelación de hasta 1 millón de satélites para computación orbital. |
| R7 | **Musk (2026)** — *In 36 months, cheapest place for AI will be space* ([YouTube][r7]) | Entrevista del 4 de febrero de 2026 con la declaración sobre el espacio como infraestructura de IA. |
| R8 | **Wang et al. (2024)** — *FOOL: Addressing the Downlink Bottleneck in Satellite Computing* ([arXiv][r8]) | Reducción del 80% en ancho de banda de downlink mediante compresión neuronal. |
| R9 | **Space Investments (2025)** — *The Basic Economics of Starship* ([Space Investments][r9]) | Análisis del coste por kilogramo de Starship en distintos escenarios de reutilización. |
| R10 | **Starcloud / Lumen Orbit (2024)** — *Why we should train AI in space* ([Starcloud][r10]) | White paper de empresa sobre factor de capacidad orbital y coste energético bajo supuestos optimistas. |

</details>

[r1]: https://www.iea.org/reports/energy-and-ai/ "Energy and AI — IEA"
[r2]: https://iea.blob.core.windows.net/assets/ddd078a8-422b-44a9-a668-52355f24133b/Electricity2024-Analysisandforecastto2026.pdf "Electricity 2024 — IEA"
[r3]: https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf "Umweltauswirkungen KI — Greenpeace"
[r4]: https://www.networkworld.com/article/4117329/google-warns-transmission-delays-are-now-the-biggest-threat-to-data-center-expansion.html "Grid delays — Network World"
[r5]: https://assets.publishing.service.gov.uk/media/688cb407dc6688ed50878367/Water_use_in_data_centre_and_AI_report.pdf "Water use in AI and Data Centres — GOV.UK"
[r6]: https://spacenews.com/spacex-files-plans-for-million-satellite-orbital-data-center-constellation/ "SpaceX files plans for million-satellite orbital data center constellation — SpaceNews"
[r7]: https://www.youtube.com/watch?v=BYXbuik3dgA "Elon Musk: In 36 months, cheapest place for AI will be space — YouTube"
[r8]: https://arxiv.org/pdf/2403.16677 "FOOL: Addressing the Downlink Bottleneck — arXiv"
[r9]: https://www.spaceinvestments.io/space-economy-market-intelligence/starship-economics "The Basic Economics of Starship — Space Investments"
[r10]: https://starcloudinc.github.io/wp.pdf "Why we should train AI in space — Starcloud"
