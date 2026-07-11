---
title: Energía, calor y conectividad en órbita
description: Por qué el frío del espacio no significa refrigeración gratis, dónde está la ventaja real de la energía orbital y qué límites impone la conexión con la Tierra.
date: 2026-06-14
keywords: "refrigeración datacenter orbital, Stefan-Boltzmann espacio, energía solar órbita LEO, radiadores espacio vacío, latencia satélites LEO GEO, degradación radiación GPU, downlink satelital ancho banda"
tags:
  - IA
  - Infraestructura
  - Energía
video: "02-energia-calor-conectividad.mp4"
video_duration: "PT1M11S"
---

# Capítulo 2 — Energía, calor y conectividad

Este capítulo desmonta el principal malentendido sobre los datacenters orbitales: que el frío del espacio facilita la refrigeración gratis. Al terminarlo, entenderemos por qué sacar el calor sigue siendo el gran problema de diseño, dónde está la ventaja real de la energía solar en órbita y qué límites impone la conexión con la Tierra.

!!! info "Prerrequisitos"
    Este capítulo asume que conoces los conceptos introducidos en el [Capítulo 1 — Por qué ahora](./01-por-que-ahora.md).

El capítulo anterior identificó por qué la infraestructura terrestre tiene fricciones reales y por qué el espacio ha entrado en la conversación como alternativa para ciertos casos de uso. Antes de preguntarse si ese salto tiene sentido, conviene despejar una intuición engañosa: que, como el espacio es frío, enfriar servidores allí debería ser fácil.

No es así. Una cosa es que el entorno sea frío y otra muy distinta que el sistema tenga una manera eficaz de desprenderse del calor que produce.

---

## 1. Por qué el frío del espacio no implica enfriar gratis

En la Tierra, un centro de datos puede expulsar calor con aire en movimiento, agua fría y torres de refrigeración. Todo eso existe ya alrededor de la instalación y funciona de forma continua, pero en el espacio no hay aire ni agua esperando fuera del equipo para llevarse ese calor.

Por eso allí solo queda una opción, que es expulsarlo radiándolo hacia el exterior. El sistema tiene que desprenderse del calor como lo hace una superficie muy caliente cuando irradia energía. Este mecanismo funciona, pero es mucho más lento que mover aire o agua, y además obliga a desplegar superficies enormes para manejar potencias grandes ([NASA][r1], [LoadPath][r2]).

### La escala real de los radiadores

En una instalación de 2 MW trabajando a temperaturas razonables, cada metro cuadrado de radiador apenas expulsa en torno a 500 W. Esto obliga a desplegar casi 4.000 m² de superficie radiadora, algo parecido a medio campo de fútbol cubierto de paneles pensados solo para sacar calor, con todo ese sistema además en *órbita* ([NASA][r1], [LoadPath][r2]).

Incluso antes de entrar en el peso exacto del sistema, ya podemos ver que en un datacenter orbital el gran problema no es encender los servidores, sino sacar su calor sin que todo el conjunto se vuelva gigantesco.

{{ include_html("snippets/datacenters-espacio/02-radiadores-escala.html") }}

### Por qué la validación en órbita es todavía escasa

Lo que se ha probado bien hasta ahora en órbita sigue estando en escalas modestas: sistemas que manejan miles de vatios, no millones. Esa diferencia importa porque pasar de una GPU potente o de un satélite experimental a un centro de datos de varios megavatios no es un salto lineal, lo cambia todo. Cambia el tamaño de los radiadores, la masa total, la fragilidad del conjunto y la dificultad de mantenerlo estable ([NASA][r1], [LoadPath][r2], [Space Investments][r4]).

Starcloud sí demostró en noviembre de 2025 que una GPU Nvidia H100 podía funcionar en órbita con inmersión en líquido aislante y radiadores pasivos. Es un hito relevante, pero sigue estando muy lejos de demostrar que el mismo enfoque pueda sostener una instalación muchísimo mayor ([Starcloud][r3]).

Además, esos radiadores no viven en un entorno amable. Si reciben demasiado sol, pueden absorber tanta o más energía de la que intentan expulsar. Y, al ser superficies grandes y desplegadas, también quedan más expuestas a pequeños fragmentos y micrometeoritos que ni siquiera se pueden seguir con precisión ([NASA][r1], [LoadPath][r2], [NASA Orbital Debris][r10]).

{{ include_html("snippets/datacenters-espacio/02-calor-espacio.html") }}

---

## 2. Energía solar en órbita

La ventaja real está en la generación de energía, no en la refrigeración.

{{ include_html("snippets/datacenters-espacio/02-solar-orbita.html") }}

Fuera de la atmósfera, los paneles solares reciben más radiación y la reciben con mucha más regularidad. En las órbitas más favorables pueden pasar casi todo el tiempo viendo el sol, algo imposible para una instalación terrestre. Por eso, con la misma superficie de panel, un sistema orbital puede generar bastante más electricidad útil a lo largo del día ([Starcloud][r3]).

Eso no significa que la energía salga gratis. Para sostener una instalación de varios megavatios hacen falta miles de metros cuadrados de paneles y decenas de toneladas de hardware adicional. La promesa económica solo empieza a tener sentido si lanzar masa al espacio se abarata mucho y si el sistema de refrigeración no acaba comiéndose esa ventaja ([Starcloud][r3], [Space Investments][r4]).

También hay degradación. La radiación y el entorno espacial van deteriorando recubrimientos y materiales con el tiempo. La buena noticia es que, con el diseño adecuado, ese desgaste parece suficientemente controlable como para proyectar vidas útiles largas para los paneles ([Starcloud][r3]).

---

## 3. Conectividad: ventanas de enlace y ancho de banda

La conectividad entre una instalación orbital y la Tierra tiene límites muy concretos que no aparecen en un centro de datos terrestre.

### Ventanas de enlace

Un satélite en órbita baja solo puede comunicarse directamente con una estación terrestre durante unos minutos en cada vuelta. Fuera de ese tramo, la conexión se corta. Según los datos recogidos por un estudio reciente sobre varias constelaciones operativas, esos pases duran entre 120 y 600 segundos por órbita ([arXiv][r5]).

La manera de suavizar ese límite es desplegar constelaciones: muchos satélites coordinados en vez de uno solo. Pero eso multiplica el número de lanzamientos, el coste y la complejidad. La alternativa son los satélites que permanecen siempre sobre el mismo punto de la Tierra. Resuelven la continuidad, pero lo pagan con más retraso en la comunicación, demasiado alto para muchas aplicaciones interactivas ([Space Investments][r4]).

Las constelaciones en órbita baja mejoran mucho ese punto y pueden moverse en latencias competitivas para algunos servicios, aunque siguen sin igualar a la fibra terrestre en los casos más exigentes ([Space Investments][r4]).

### Cuántos datos se pueden bajar a tierra

También importa cuánta información puedes bajar a tierra. Los enlaces por radio tienen límites de frecuencia, potencia y clima, además de estar condicionados por el marco regulatorio de asignación de espectro ([ITU][r8]). Los enlaces láser amplían mucho esa capacidad y ya forman parte del diseño de varios proyectos recientes ([Space Investments][r4], [Axiom][r9]).

Pero el principio no cambia: si procesas datos en órbita y luego no puedes bajar el resultado con suficiente rapidez, el valor práctico de todo el sistema cae. Por eso tiene sentido procesar arriba cuando eso reduce drásticamente lo que hay que enviar. El sistema FOOL muestra que filtrar los datos antes de bajarlos puede recortar de forma notable el tráfico necesario en observación de la Tierra ([arXiv][r5]).

{{ include_html("snippets/datacenters-espacio/02-enlaces-ventanas.html") }}

---

## 4. Degradación orbital y mantenimiento

Los centros de datos terrestres pueden repararse. Si falla un componente, un técnico lo cambia. Si hace falta más capacidad, se añaden equipos nuevos. 

La Estación Espacial Internacional ha demostrado que se puede hacer mantenimiento en el espacio, pero a un coste enorme. Para satélites comerciales no tripulados, la realidad sigue siendo que si algo importante falla, lo normal es perder el equipo y lanzar otro ([Space Investments][r4]).

Eso obliga a diseñar con mucha más redundancia desde el primer día y a aceptar que el hardware tiene fecha de caducidad. Los servicios robóticos de reparación siguen siendo inmaduros y los chips comerciales normales se degradan antes en órbita por la radiación. Las estimaciones más habituales sitúan su vida útil en varios años, no en décadas ([Space Investments][r4]).

La radiación espacial daña memorias y transistores poco a poco y puede provocar errores esporádicos. Hoy hay dos respuestas principales: usar hardware diseñado para soportar mejor ese entorno o proteger chips comerciales con más software de control y corrección. Ninguna de las dos sale gratis: la primera sacrifica potencia, la segunda añade complejidad y consumo ([Columbia][r6]).

{{ include_html("snippets/datacenters-espacio/02-radiacion-mantenimiento.html") }}

Todos estos requisitos tienen consecuencias directas para el diseño:

- La redundancia debe venir muy cargada desde el principio, porque luego no hay forma sencilla de ampliarla.
- La vida útil del sistema tiene que asumirse como finita y con un plan claro de retirada al final de la misión. Además, la regulación obliga a no dejar ese hardware abandonado indefinidamente en órbita ([NASA][r7]).
- El ciclo de actualización es mucho más rígido que en tierra: el hardware que lanzas es, en la práctica, el hardware con el que te quedas.

El capítulo siguiente describe qué proyectos tienen ya hardware real en órbita procesando datos reales, qué casos de uso tienen sentido económico hoy y cuál es el espectro entre el procesamiento a bordo de satélites de observación y los megaproyectos con visión de décadas.

---

## Preguntas frecuentes

**¿Por qué el frío del espacio no facilita la refrigeración de los servidores?**
Porque en el espacio no hay aire ni agua alrededor del sistema que se lleven el calor. El equipo solo puede expulsarlo radiándolo hacia fuera, y ese proceso es lento a temperaturas normales de trabajo ([NASA][r1], [LoadPath][r2]). Por eso un sistema de 2 MW necesita cerca de 4.000 m² de radiadores: el problema no es que fuera haga frío, sino que sacar el calor cuesta mucha superficie.

**¿Qué superficie de radiadores necesita un datacenter orbital de 2 MW?**
Aproximadamente 3.950 m² bajo los supuestos térmicos usados en el capítulo ([NASA][r1], [LoadPath][r2]). Es una superficie comparable a medio campo de fútbol dedicada solo a expulsar calor. La masa exacta depende del diseño, pero la conclusión no cambia: a escala de megavatios, la refrigeración domina el problema mucho antes de que lo haga el cómputo.

**¿Cuál es la ventaja real del espacio para los centros de datos?**
La ventaja más sólida está en la energía, no en la refrigeración. Los paneles solares en órbita pueden recibir luz de forma mucho más constante que en tierra, así que con la misma superficie generan más electricidad útil. Esa ventaja solo compensa si lanzar todo ese hardware se abarata mucho y si el sistema térmico no acaba anulando el beneficio.

**¿Qué retraso añaden los satélites en órbita baja a una IA interactiva?**
Las constelaciones en órbita baja pueden moverse en rangos competitivos para algunos servicios interactivos, muy por debajo de los satélites que están mucho más lejos de la Tierra. Aun así, siguen por detrás de la fibra terrestre en los casos más sensibles al retraso. Para una IA conversacional o ciertos servicios online puede ser suficiente. Para usos de tiempo real muy estricto, no.

**¿Cuánto dura una GPU comercial en órbita antes de degradarse por radiación?**
Los chips comerciales normales no están pensados para soportar durante mucho tiempo la radiación espacial. Las estimaciones habituales los sitúan en una vida útil de varios años antes de que el desgaste acumulado se vuelva un problema serio ([Space Investments][r4], [Columbia][r6]). La alternativa es usar hardware más resistente o añadir capas extra de protección por software, pero ambas soluciones encarecen y complican el sistema.

---

## 5. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **NASA** — *Thermal Control — State of the Art for Small Satellites* ([NASA][r1]) | Física del entorno espacial para hardware orbital y transferencia de calor en vacío. |
| R2 | **LoadPath / AFRL (2018)** — *Thermal design considerations for future high-power small satellites* ([LoadPath][r2]) | Radiadores desplegables y límites prácticos de disipación en satélites de alta potencia. |
| R3 | **Starcloud / Lumen Orbit (2024)** — *Why we should train AI in space* ([Starcloud][r3]) | White paper de empresa con proyección de capacidad solar orbital y coste energético bajo supuestos optimistas. |
| R4 | **Space Investments (2025)** — *Orbital AI Datacenter Economics* ([Space Investments][r4]) | Análisis de costes comparativos entre instalaciones orbitales y terrestres, con latencia LEO/GEO. |
| R5 | **Wang et al. / Columbia / JPL (2024)** — *FOOL: Addressing the Downlink Bottleneck* ([arXiv][r5]) | Reducción del 80% en downlink mediante compresión neuronal y datos de ventanas de enlace. |
| R6 | **Wang / Columbia / JPL (2024)** — *Radshield: Software Radiation Protection* ([Columbia][r6]) | 720x mejora en inmunidad SEFI para hardware comercial con protección por software. |
| R7 | **NASA SOA (2023)** — *Deorbit Systems* ([NASA][r7]) | Regulación de vida útil orbital de 25 años y tiempo de decaimiento a distintas altitudes. |
| R8 | **ITU** — *Space Frequency Coordination* ([ITU][r8]) | Marco regulatorio para frecuencias de comunicación por satélite. |
| R9 | **Axiom Space (2026)** — *Orbital Data Centers* ([Axiom][r9]) | Especificaciones de los nodos ODC: 2.5 Gbps óptico, compatibilidad Kepler. |
| R10 | **NASA Orbital Debris Program Office** — *Debris Protection* ([NASA Orbital Debris][r10]) | Riesgo operativo de fragmentos y partículas demasiado pequeñas para rastreo rutinario pero capaces de dañar naves activas. |

</details>

[r1]: https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/ "Thermal Control — NASA SmallSat"
[r2]: https://s3vi.ndc.nasa.gov/ssri-kb/static/resources/ICES_2018_77.pdf "Thermal design considerations for future high-power small satellites — LoadPath / AFRL"
[r3]: https://starcloudinc.github.io/wp.pdf "Why we should train AI in space — Starcloud"
[r4]: https://www.spaceinvestments.io/information-communications/orbital-data-centers-technical-validation-and-strategic-positioning-in-the-2025-2030-transition-period "Orbital AI Datacenter Economics — Space Investments"
[r5]: https://arxiv.org/pdf/2403.16677 "FOOL: Addressing the Downlink Bottleneck — arXiv"
[r6]: https://www.cs.columbia.edu/~junfeng/papers/radshield-asplos26.pdf "Radshield — Columbia / JPL"
[r7]: https://www.nasa.gov/smallsat-institute/sst-soa/deorbit-systems/ "Deorbit Systems — NASA SOA"
[r8]: https://www.itu.int/en/ITU-R/space/Pages/default.aspx "Space Frequency Coordination — ITU"
[r9]: https://www.axiomspace.com/orbital-data-center "Orbital Data Centers — Axiom Space"
[r10]: https://www.orbitaldebris.jsc.nasa.gov/protection/ "Debris Protection — NASA Orbital Debris Program Office"
