---
title: Qué es un datacenter en el espacio
description: Qué significa realmente procesar datos en órbita, qué casos de uso tienen sentido hoy, almacenamiento resiliente y los megaproyectos con visión de décadas.
date: 2026-06-14
keywords: "datacenter orbital, satélites computación, procesamiento borde órbita, madurez computación espacial, Starcloud H100, Axiom Space ODC, D-Orbit AIX, Three-Body constellation, SpaceX orbital data center, digital flag state"
tags:
  - IA
  - Infraestructura
  - Espacio
video: "03-que-es-datacenter-espacio.mp4"
video_duration: "PT1M0S"
---

# Capítulo 3 — Qué es "un datacenter en el espacio"

Este capítulo describe qué significa procesar datos en órbita, qué proyectos tienen ya hardware real operando y dónde se sitúa la frontera entre los casos de uso viables hoy y los especulativos. Al terminarlo, conoceremos los proyectos con hardware en órbita a principios de 2026 (Starcloud, Axiom, D-Orbit, ADA Space), entenderemos la diferencia entre procesamiento a bordo y computación de propósito general, y dispondremos del mapa de viabilidad por caso de uso para evaluar el argumento de los megaproyectos.

!!! info "Prerrequisitos"
    Este capítulo asume que conoces los conceptos introducidos en el [Capítulo 2 — Energía, calor y conectividad](./02-energia-calor-conectividad.md).

Los dos capítulos anteriores establecieron el contexto (por qué se habla del espacio ahora) y la física de los problemas principales (calor, energía, conectividad). Este capítulo lleva la serie a su tramo final respondiendo a la pregunta más directa: ¿qué significa realmente tener un datacenter en órbita, para qué sirve hoy, y qué aspecto tienen los proyectos más ambiciosos?

La respuesta corta es que "datacenter en el espacio" no es un concepto único sino un espectro de posibilidades con perfiles de viabilidad muy distintos, que van desde satélites de observación con procesamiento a bordo (ya existentes y viables) hasta instalaciones de computación masiva en geoestacionaria (décadas en el futuro, si acaso).

{{ include_html("snippets/datacenters-espacio/03-casos-orbita.html") }}

---

## 1. Qué significa procesar datos en órbita

La distinción más importante es entre almacenar y procesar en órbita los datos generados allí versus desplazar computación general desde la Tierra al espacio.

### Procesamiento de datos de observación

Los satélites de observación de la Tierra generan cantidades enormes de datos. Un satélite de observación hiperspectral puede generar terabytes de datos por día. Bajar toda esa información a tierra requiere anchos de banda que exceden la capacidad de los enlaces disponibles en muchas misiones.

La solución natural es procesar en el propio satélite: en lugar de bajar los datos brutos, el satélite ejecuta algoritmos de clasificación, detección de cambios o extracción de características, y solo baja los resultados (que pueden ser órdenes de magnitud más pequeños que los datos brutos). El concepto tiene nombre de por sí: "data gravity", la fricción que produce traer a tierra datos masivos antes de poder trabajar con ellos.

{{ include_html("snippets/datacenters-espacio/03-procesar-donde-nace.html") }}

Un ejemplo concreto: Fujitsu y la Universidad de Yamaguchi comunicaron en noviembre de 2025 una tecnología de edge computing para pequeños satélites SAR capaz de procesar imágenes casi en tiempo real en menos de diez minutos, incluso bajo restricciones de potencia y radiación ([Fujitsu / Yamaguchi][r1]). En paralelo, D-Orbit ya comercializa servicios de "space cloud" para ejecutar aplicaciones y procesar datos directamente en órbita, e integra esa lógica en programas operativos de observación como IRIDE-NOX ([D-Orbit][r11]).

Estos sistemas operan a escala de 100-500 W y ejecutan solo inferencia (no entrenamiento). Son de los casos más maduros del espectro y representan la aplicación donde la ventaja del procesamiento orbital es más clara hoy: procesar donde nace el dato para no tener que bajar todo a tierra.

### Computación de propósito general en órbita

Mover computación de propósito general al espacio (el equivalente de un datacenter de AWS en órbita) es un escenario distinto y mucho más especulativo. No resuelve ningún problema que no pueda resolverse más barato en tierra salvo en casos muy específicos: aplicaciones que requieren acceso a datos de satélites en tiempo real con mínima latencia, sistemas que necesitan operación en entornos de alta radiación por razones de resiliencia, o casos de uso donde la jurisdicción de los datos en órbita tiene valor específico.

Ese tercer caso (datos que no pertenecen a ninguna jurisdicción terrestre) es un argumento que aparece en algunas conversaciones sobre soberanía digital y privacidad. La discusión jurídica reciente gira precisamente sobre ese vacío: cómo interpretar la jurisdicción del satélite, qué obligaciones sobreviven cuando el dato cruza múltiples países por órbita y hasta dónde puede llegar una lógica de "bandera" parecida a la marítima ([JURIST][r8], [UNOOSA][r12]). Hoy sigue siendo un debate teórico y regulatorio, no un marco legal vigente.

---

## 2. Los proyectos que ya tienen hardware en órbita

Entre la teoría y la visión especulativa existe un espacio intermedio que a menudo se omite en las discusiones sobre datacenters orbitales: proyectos que ya han lanzado hardware al espacio y que están procesando datos reales. La situación a principios de 2026 es esta:

| Empresa | Hardware en órbita | Estado |
| --- | --- | --- |
| **Starcloud** (antes Lumen Orbit) | Satélite con Nvidia H100 | Operativo desde nov. 2025 ([KPMG][r4]) |
| **Axiom Space** | AxDCU-1 (ISS) + 2 nodos ODC (LEO) | Prototipo en ISS desde otoño 2025, con nodos iniciales ODC desde ene. 2026 ([Axiom][r2], [ISS National Lab][r3]) |
| **D-Orbit** | Servicios de compute en órbita / IRIDE-NOX | Operativo en misiones activas ([D-Orbit][r11]) |
| **ADA Space (China)** | Three-Body Constellation (12 satélites) | Operativa desde mayo 2025 ([SpaceNews][r5]) |
| **Tiansuan / BUPT-1** | 1 satélite cloud-native | Operativo desde ene. 2023 ([tiansuan.org.cn][r6]) |

{{ include_html("snippets/datacenters-espacio/03-proyectos-orbitales.html") }}

De estos, el caso más significativo para el debate sobre IA en el espacio es el de Starcloud. En noviembre de 2025, la startup lanzó un satélite con una GPU Nvidia H100. En diciembre del mismo año anunció el entrenamiento en órbita de un modelo simplificado tipo NanoGPT, más la ejecución de Google Gemma como modelo de inferencia activo. Es un hito técnico relevante, pero sigue siendo una demostración de escala muy reducida frente a lo que sería un sistema cloud orbital comparable a la infraestructura terrestre ([KPMG][r4]).

El próximo lanzamiento de Starcloud está previsto para octubre de 2026, con múltiples H100 y la plataforma Nvidia Blackwell. La visión a largo plazo declarada por la empresa es un datacenter orbital de 5 GW con paneles solares y radiadores de 4 km × 4 km ([KPMG][r4]).

Por su parte, Axiom Space lanzó el 11 de enero de 2026 los dos primeros nodos de datacenter orbital dedicados en LEO, con conectividad óptica de 2,5 Gbps (compatible con los estándares de la Agencia de Desarrollo Espacial) y hardware de almacenamiento de alta capacidad de Spacebilt (SSDs Phison de 122 TB) ([Axiom][r2], [ISS National Lab][r3]). China ha ido más rápido en escala: la constelación Three-Body de ADA Space tiene doce satélites lanzados en mayo de 2025, cada uno con 744 TOPS de potencia de cómputo, 30 TB de almacenamiento y enlaces láser inter-satélite de 100 Gbps, con un total de 5 petaflops según la cobertura sectorial disponible ([SpaceNews][r5]). La expansión planificada es hasta 2.800 satélites apuntando a 1.000 petaflops ([SpaceNews][r5]).

---

## 3. Almacenamiento resiliente y disaster recovery

Una dirección que tiene cierta lógica para el espacio es la del almacenamiento extremamente resiliente.

Los sistemas de backup y disaster recovery terrestres resuelven el problema de la resiliencia geográfica: mantener copias de datos en ubicaciones suficientemente separadas para que un desastre que afecte a una región no destruya todas las copias. Las ubicaciones en distintos continentes son el estándar actual.

Un almacenamiento en órbita añade una clase de resiliencia diferente: inmune a desastres geofísicos, ataques sobre infraestructura terrestre o eventos geopolíticos que corten el acceso a centros de datos en tierra. Para datos de importancia histórica, genómica humana, archivos de civilización o activos críticos cuya pérdida sería irreversible, ese tipo de resiliencia tiene un valor que puede justificar el coste extra.

Lonestar Data Holdings está desarrollando almacenamiento orientado a disaster recovery en el entorno cislunar y lunar, una señal de que esta tesis de "archivo extremo" ya se está intentando comercializar fuera de la órbita baja ([Lonestar][r14]). Los proyectos actuales en órbita baja son modestos en capacidad (cuentas de terabytes, no petabytes, aunque los SSDs de Spacebilt de 122 TB en el AxDCU-1 marcan un nuevo umbral de capacidad unitaria) y tienen perfiles de acceso de escritura frecuente y lectura rara ([ISS National Lab][r3]). No son sistemas de acceso rápido sino archivos de último recurso.

---

## 4. Las consecuencias de operar en órbita

Más allá de la física que el capítulo anterior describió, hay implicaciones operativas que cualquier evaluación seria de la viabilidad tiene que incluir.

**Ciclos de actualización.** Los centros de datos terrestres actualizan hardware de forma continua: nuevas generaciones de GPUs, más memoria, mejores sistemas de refrigeración. En órbita, el hardware que se lanza es el hardware que opera hasta el final de la misión. No se pueden añadir racks, no se pueden reemplazar chips degradados por la radiación, no se puede adaptar el sistema a nuevos modelos de IA que requieran más memoria o un tipo de acelerador diferente. La vida útil de los satélites con chips COTS tipo Nvidia se mide en años, no en décadas.

**Tolerancia a radiación.** Los chips de consumo no están diseñados para operar en el entorno de radiación de la órbita baja o más allá. Los chips tolerantes a radiación existen pero tienen densidades computacionales significativamente menores que los chips de consumo modernos. La alternativa son los enfoques de protección por software (Radshield, la "armadura de radiación" de Fujitsu) que mejoran la inmunidad frente a errores de bit hasta 720 veces en condiciones de irradiación de iones pesados, pero que añaden overhead computacional y complejidad al sistema ([KPMG][r4]).

**Autonomía operacional.** Un centro de datos en órbita tiene que operar de forma sustancialmente autónoma. Los operadores no pueden acceder físicamente al sistema, por lo que toda la gestión es remota y a través de los enlaces de comunicación con sus ventanas y limitaciones de ancho de banda. La gestión de incidencias en un sistema así es radicalmente diferente de la gestión en tierra.

**Marco regulatorio.** El Tratado del Espacio Ultraterrestre de 1967 establece que los objetos en el espacio son responsabilidad del estado que los lanzó. Las frecuencias de comunicación están reguladas por la ITU. La desorbitación al final de la vida útil es un requisito creciente en las regulaciones nacionales: los satélites en LEO no pueden dejarse abandonados indefinidamente, y el crecimiento de las constelaciones de Starlink, OneWeb y otros está endureciendo la conversación regulatoria sobre ese cierre de ciclo.

---

## 5. Megaproyectos: visión a décadas

Los proyectos de escala masiva existen en distintos grados de desarrollo, desde pilotos ya en órbita hasta visiones que dependen de Starship alcanzando plena operatividad.

{{ include_html("snippets/datacenters-espacio/03-arquitectura-tether.html") }}

**SpaceX / Orbital Data Center System.** El 30 de enero de 2026, SpaceX presentó ante la FCC una solicitud para operar una constelación de hasta un millón de satélites para procesamiento de datos orbital, con proyecciones de 100 GW de cómputo de IA. Los satélites usarían Starlink V3 (que ofrece más de 1 Tbps por satélite con enlaces láser) y llevarían aceleradores de ML a bordo para preprocesar datos antes de la transmisión. La FCC aceptó la solicitud para comentario público en febrero de 2026, pero el filing no incluía calendario de despliegue ni coste detallado ([SpaceNews][r7], [FCC][r17]). La viabilidad económica de este proyecto depende de que Starship llegue a la cadencia de lanzamiento y los costes proyectados.

**Google Project Suncatcher.** Google anunció en noviembre de 2025 Project Suncatcher como moonshot de investigación para explorar ML escalable en el espacio, y Planet comunicó que construiría y operaría la plataforma avanzada del proyecto. Lo que hoy está publicado es un demostrador de investigación para validar TPUs y enlaces ópticos en órbita, con prototipos previstos para 2027, no una hoja de ruta cerrada de datacenter comercial ([Google][r13], [Planet][r15]).

**Starcloud (5 GW).** La startup prevé un datacenter orbital de 5 GW con paneles solares y radiadores de 4 km × 4 km, que generaría más potencia que la mayor central eléctrica de Estados Unidos. En la hoja de ruta figura un siguiente lanzamiento con múltiples H100 y plataforma Blackwell en octubre de 2026. Después plantea escalar gradualmente hacia una oferta cloud orbital ([KPMG][r4]).

**SBSP (Space-Based Solar Power).** Los proyectos de energía solar orbital que transmitirían energía a tierra mediante microondas son técnicamente distintos de los datacenters pero comparten la infraestructura de hardware en órbita. ESA mantiene SOLARIS como programa de estudio y maduración para SBSP en Europa, mientras que Space Solar sostiene que CASSIOPeiA podría habilitar despliegues comerciales a partir de 2030 si la tecnología y la regulación maduran ([ESA][r9], [Space Solar][r16]). Si SBSP se desarrolla a escala, podría crear una infraestructura orbital de gestión de energía que comparte componentes con la computación orbital masiva.

---

## 6. ¿Tiene sentido hoy?

La respuesta varía radicalmente según el caso de uso, y la situación ha cambiado desde 2023 con los primeros hitos reales de hardware en órbita.

**Tiene sentido hoy y ya hay hardware en órbita**: procesamiento a bordo de satélites de observación para reducir el downlink (Fujitsu/Yamaguchi, D-Orbit IRIDE). Primeras pruebas de almacenamiento orbital de alto valor (Axiom/Spacebilt). Demostraciones técnicas de IA de alta gama en órbita (Starcloud H100).

**Podría tener sentido en 5-10 años**: edge computing orbital para constelaciones de satélites de comunicaciones, donde procesar en el propio nodo reduce la latencia. Computación para misiones de exploración espacial donde la latencia de comunicación con la Tierra es inaceptable. Datacenters orbitales a escala de decenas de megavatios si Starship alcanza los costes proyectados.

**Especulativo en el horizonte visible**: datacenters de propósito general en órbita que compitan económicamente con instalaciones terrestres para cargas de trabajo de IA general. Google Suncatcher y el proyecto de SpaceX de un millón de satélites pertenecen a esta categoría hoy, aunque con hitos intermedios planificados en 2026-2027.

> El espacio no es una solución a los cuellos de botella de los centros de datos terrestres en el corto plazo. Es una dirección de nicho con casos de uso específicos donde las propiedades únicas del entorno orbital tienen valor suficiente para justificar el coste extra. Lo que ha cambiado en 2025-2026 es que ese nicho está dejando de ser solo teoría: hay hardware real en órbita procesando datos reales. La distancia entre el nicho actual y la infraestructura masiva que imaginan los proyectos más ambiciosos sigue siendo enorme, y los problemas físicos del calor y la masa no han desaparecido. Pero el punto de partida ya no es el papel.

El capítulo siguiente cierra la serie con el inventario de recursos que consumen los centros de datos en tierra: agua, energía, minerales críticos y ciclo de vida. Ese análisis es el punto de partida adecuado para evaluar qué restricciones resuelve el espacio y cuáles hereda sin ninguna ventaja añadida.

---

## Preguntas frecuentes

**¿Qué proyectos tienen ya hardware de computación real operando en órbita en 2026?**
Varios prototipos y demostradores. Starcloud lanzó en noviembre de 2025 un satélite con una GPU Nvidia H100 y anunció el entrenamiento en órbita de un modelo simplificado tipo NanoGPT más inferencia activa con Google Gemma. Axiom Space lanzó en enero de 2026 el AxDCU-1 en la ISS y dos nodos ODC en LEO con conectividad óptica de 2,5 Gbps. La constelación ADA Space Three-Body tiene 12 satélites operativos desde mayo de 2025 con 5 petaflops totales según cobertura sectorial. D-Orbit AIX ejecuta modelos de detección de objetos en satélites operativos. Tiansuan/BUPT-1 opera desde enero de 2023 como primer satélite cloud-native documentado en esta serie ([tiansuan.org.cn][r6]).

**¿Cuál es la diferencia entre procesamiento a bordo y computación de propósito general en órbita?**
El procesamiento a bordo es inferencia especializada dentro del propio satélite: se ejecutan modelos concretos sobre los datos que ese satélite genera para reducir lo que hay que bajar a tierra. Es el caso más maduro y con mejor análisis económico. La computación de propósito general en órbita es distinta y mucho más especulativa: sería el equivalente a mover un datacenter de AWS al espacio para servir cargas de trabajo arbitrarias desde allí. Hoy eso no resuelve ningún problema que no pueda resolverse más barato en tierra salvo en casos muy específicos.

**¿Para qué casos de uso tiene sentido económico la computación orbital hoy?**
Tres tienen sentido hoy: procesamiento a bordo de satélites de observación para reducir el downlink (D-Orbit AIX, IRIDE), almacenamiento de archivo de alto valor para resiliencia extrema (los SSDs de 122 TB de Spacebilt/Axiom marcan el umbral actual), y demostraciones de cómputo avanzado para validar hardware y operación orbital. En 5-10 años podrían añadirse el edge computing orbital para constelaciones de comunicaciones y los primeros datacenters de decenas de megavatios si Starship alcanza los costes proyectados.

**¿Qué es el debate sobre "Digital Flag State" y por qué importa para los datos en el espacio?**
Es una forma de resumir un debate jurídico inspirado en el derecho marítimo: aplicar al satélite una lógica de "bandera" según la cual la jurisdicción del país de registro dominaría sobre el dato que viaja en órbita. No es una norma vigente, pero importa porque revela el problema de fondo: hoy la soberanía de datos y la jurisdicción orbital no encajan bien entre sí. Si algún marco de este tipo llegara a consolidarse, añadiría un argumento de soberanía digital a la viabilidad económica de la computación orbital.

**¿Cuándo podrían los datacenters orbitales competir económicamente con los terrestres para cargas de propósito general?**
Probablemente no en esta década para cargas arbitrarias. Los costes de lanzamiento actuales hacen que instalar megavatios de cómputo en órbita cueste varias veces más que en tierra. Para que la ecuación cierre hacen falta que Starship alcance menos de 200 dólares por kilogramo con alta cadencia, que los sistemas de gestión térmica pasen de demostraciones parciales a operación robusta a escala de megavatios, y que los ciclos de actualización de hardware no sean un obstáculo para el tipo de carga de trabajo que se quiere servir. Las proyecciones más optimistas sitúan ese punto de cruce en la segunda mitad de la década de 2030 ([Space Investments][r10]).

---

## 7. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Fujitsu / Yamaguchi University (2025)** — *Near-real-time image processing on small SAR satellites* ([Fujitsu / Yamaguchi][r1]) | Procesamiento SAR casi en tiempo real en menos de diez minutos bajo restricciones de potencia y radiación. |
| R2 | **Axiom Space (2026)** — *Orbital Data Centers* ([Axiom][r2]) | AxDCU-1 en ISS otoño 2025, con 2 nodos ODC lanzados en enero de 2026 y 2.5 Gbps óptico. |
| R3 | **Spacebilt / Axiom (2026)** — *Axiom Space Orbital Data Center with Spacebilt* ([ISS National Lab][r3]) | Hardware de almacenamiento orbital de alta capacidad con SSDs Phison de 122 TB y PIC64-HPSC. |
| R4 | **Starcloud / KPMG (2025)** — *KPMG Cosmos Q4 2025* ([KPMG][r4]) | Starcloud H100 en órbita, entrenamiento NanoGPT, inferencia Gemma y roadmap 5 GW. |
| R5 | **SpaceNews (2025)** — *China launches first of 2,800 satellites for AI space computing constellation* ([SpaceNews][r5]) | 12 satélites en mayo de 2025, 744 TOPS/sat, 100 Gbps ISL y 5 petaflops totales. |
| R6 | **Tiansuan (2023)** — *Satellite Computing: A Case Study of Cloud-Native Satellites* ([tiansuan.org.cn][r6]) | BUPT-1 operativo desde enero de 2023 con arquitectura cloud-native en órbita. |
| R7 | **SpaceNews (2026)** — *SpaceX files plans for million-satellite orbital data center constellation* ([SpaceNews][r7]) | SpaceX solicita 1M satélites, 100 GW de cómputo y Starlink V3 >1 Tbps/satélite. |
| R8 | **JURIST (2026)** — *Orbital data centers and the legal vacuum threatening AI governance* ([JURIST][r8]) | Columna de opinión jurídica sobre el vacío regulatorio y la soberanía de datos en infraestructuras orbitales. |
| R9 | **ESA** — *SOLARIS / clean energy from space* ([ESA][r9]) | Estado del programa europeo de space-based solar power como iniciativa de viabilidad y maduración. |
| R10 | **Space Investments (2025)** — *Orbital Data Centers 2025-2030 Transition* ([Space Investments][r10]) | Mercado orbital: $1.78B en 2029, $39B en 2035 y tabla de madurez tecnológica por subsistema. |
| R11 | **D-Orbit** — *Advanced Services / IRIDE-NOX* ([D-Orbit][r11]) | Servicios de space cloud y participación operativa en el programa italiano IRIDE-NOX. |
| R12 | **UNOOSA** — *Outer Space Treaty* ([UNOOSA][r12]) | Marco legal fundamental para actividades en el espacio. |
| R13 | **Google (2025)** — *Project Suncatcher* ([Google][r13]) | Moonshot de investigación para explorar ML escalable en el espacio con TPUs y energía solar, con prototipos previstos para 2027. |
| R14 | **Lonestar (2025-2026)** — *Lunar data center / DRaaS* ([Lonestar][r14]) | Almacenamiento orientado a disaster recovery en el entorno lunar y cislunar. |
| R15 | **Planet (2025)** — *Platform for Google Project Suncatcher* ([Planet][r15]) | Planet construirá y operará la plataforma espacial del demostrador de Project Suncatcher. |
| R16 | **Space Solar (2025)** — *CASSIOPeiA and commercial SBSP roadmap* ([Space Solar][r16]) | Posicionamiento de Space Solar sobre despliegue comercial de CASSIOPeiA desde 2030. |
| R17 | **FCC (2026)** — *SpaceX NGSO orbital data center application accepted for filing* ([FCC][r17]) | Aviso público de la FCC que acepta a comentario la solicitud de SpaceX para un sistema NGSO de hasta un millón de satélites. |

</details>

[r1]: https://www.yamaguchi-u.ac.jp/english/news/3112/index.html "Near-real-time image processing on small SAR satellites — Yamaguchi University / Fujitsu"
[r2]: https://www.axiomspace.com/orbital-data-center "Orbital Data Centers — Axiom Space"
[r3]: https://issnationallab.org/press-releases/orbital-data-center-launching-to-iss-to-advance-space-computing/ "Orbital Data Center Launching to ISS — ISS National Lab"
[r4]: https://kpmg.com/kpmg-us/content/dam/kpmg/pdf/2026/kpmg-cosmos-2025-q4-final.pdf "KPMG Cosmos Q4 2025"
[r5]: https://spacenews.com/china-launches-first-of-2800-satellites-for-ai-space-computing-constellation/ "China launches first of 2,800 satellites for AI space computing constellation — SpaceNews"
[r6]: http://www.tiansuan.org.cn/source/Satellite_Computing_A_Case_Study_of_Cloud-Native_Satellites.pdf "Cloud-Native Satellites — Tiansuan"
[r7]: https://spacenews.com/spacex-files-plans-for-million-satellite-orbital-data-center-constellation/ "SpaceX files plans for million-satellite orbital data center constellation — SpaceNews"
[r8]: https://www.jurist.org/commentary/2026/03/orbital-data-centers-and-the-legal-vacuum-threatening-ai-governance/ "Orbital data centers and the legal vacuum threatening AI governance — JURIST"
[r9]: https://www.esa.int/Space_in_Member_States/United_Kingdom/ESA_accelerates_the_race_towards_clean_energy_from_space "SOLARIS — ESA"
[r10]: https://www.spaceinvestments.io/information-communications/orbital-data-centers-technical-validation-and-strategic-positioning-in-the-2025-2030-transition-period "Orbital Data Centers 2025-2030 — Space Investments"
[r11]: https://dorbit.space/advanced-services/ "Advanced Services — D-Orbit"
[r12]: https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html "Outer Space Treaty — UNOOSA"
[r13]: https://blog.google/innovation-and-ai/technology/research/google-project-suncatcher/ "Project Suncatcher — Google"
[r14]: https://www.lonestarlunar.com/press-release/lunar-data-center-achieves-first-success-en-route-to-the-moon "Lunar data center — Lonestar"
[r15]: https://www.planet.com/pulse/planet-to-build-and-operate-advanced-space-platform-for-google-s-project-suncatcher-moonshot/ "Planet and Project Suncatcher — Planet"
[r16]: https://www.spacesolar.co.uk/space-solar-study-advances-commercial-space-based-solar-power/ "CASSIOPeiA commercial roadmap — Space Solar"
[r17]: https://docs.fcc.gov/public/attachments/DA-26-113A1.pdf "SpaceX NGSO orbital data center application accepted for filing — FCC"
