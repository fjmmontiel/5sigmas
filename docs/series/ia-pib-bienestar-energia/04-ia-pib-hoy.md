---
title: IA y PIB hoy — impacto real y señales tempranas
description: Por qué el impacto macroeconómico de la IA tarda en aparecer en el PIB, dónde sí aparece antes, y qué señales son más indicativas de lo que está pasando.
date: 2026-04-10
keywords: "impacto IA PIB, J-Curve productividad IA, productividad inteligencia artificial, crecimiento económico IA, señales tempranas adopción IA, Brynjolfsson productividad, Goldman Sachs IA, Acemoglu IA macroeconomía"
tags:
  - Economía
  - IA
  - Productividad
video: "04-ia-pib-hoy.mp4"
---

# Capítulo 4 — IA y PIB hoy: impacto real, desfases y señales tempranas

Este capítulo examina por qué el impacto macroeconómico de la IA tarda en aparecer en el PIB, dónde sí aparece antes y qué señales son los mejores indicadores adelantados del impacto real. Al terminarlo, el lector entenderá la J-Curve de la productividad de Brynjolfsson, conocerá los estudios de campo más sólidos sobre ganancias por tarea, y tendrá el rango de proyecciones macroeconómicas disponibles (Goldman Sachs, PwC, Acemoglu) con el argumento detrás de cada una.

!!! info "Prerrequisitos"
    Este capítulo asume que conoces los conceptos introducidos en el [Capítulo 3 — Medición: PIB vs bienestar](./03-pib-vs-bienestar.md).

Los datos macroeconómicos de productividad agregada no muestran todavía un salto comparable al que produjo la informatización de los años 90. Pero eso no significa que no esté ocurriendo nada, sino que el instrumento de medida (el PIB, la productividad multifactorial a escala nacional) capta estos efectos tarde, con retardo, y a veces los pierde del todo. 

Los economistas que estudian las tecnologías de propósito general tienen un nombre para este fenómeno: la J-Curve de la productividad, una caída inicial antes de la recuperación que refleja los costes de reorganización previos a la captura de valor [Brynjolfsson et al. (2021)](https://www.nber.org/papers/w25148).

{{ include_html("snippets/ia-pib-energia/series_energy_ai_04_gdp.html") }}

---

## 1. Por qué el impacto macro tarda en llegar

La historia de las tecnologías de propósito general, las que tienen potencial de afectar a toda la economía, muestra un patrón repetido: el impacto en productividad aparece décadas después de que la tecnología se adopta de forma amplia.

El economista Robert Gordon documentó este fenómeno para la electrificación industrial [Gordon (2016)](https://press.princeton.edu/books/hardcover/9780691147727/the-rise-and-fall-of-american-growth). Las primeras fábricas que instalaron motores eléctricos no cambiaron drásticamente su productividad de inmediato: simplemente sustituyeron la transmisión mecánica por la eléctrica manteniendo la misma disposición de las máquinas. El salto de productividad llegó cuando los ingenieros se dieron cuenta de que la electricidad permitía reorganizar completamente la planta, llevar la potencia exactamente donde se necesitaba, y diseñar procesos que eran imposibles con la transmisión centralizada. Eso tardó veinte o treinta años.

El mismo patrón aparece con la informática. Las primeras computadoras empresariales automatizaron exactamente lo que se hacía antes a mano, sin cambiar los procesos. El salto llegó cuando los procesos se rediseñaron para aprovechar lo que la computadora podía hacer que el trabajo manual no podía.

Con la IA, estamos en una etapa temprana de ese ciclo.

### Los cuatro mecanismos del desfase

**Difusión lenta.** La adopción de una nueva tecnología no es instantánea. Las empresas necesitan tiempo para aprender a usarla, para evaluar si vale la inversión, para encontrar los casos de uso donde el retorno es real. La IA generativa lleva disponible de forma amplia desde 2022-2023 y muchas empresas todavía están en fase de exploración.

**Reorganización de procesos.** Para capturar el valor de la IA, las empresas necesitan cambiar cómo trabajan, no solo añadir una herramienta a un proceso existente. Eso requiere cambio organizativo, resistencia interna y tiempo.

**Capital intangible.** El valor de la IA en una empresa no está solo en el software sino en el conocimiento de cómo usarlo, los datos propios que la alimentan, y los procesos rediseñados para aprovecharla. Ese capital intangible no aparece en los balances ni en el PIB.

**Complementariedades.** La IA crea más valor cuando complementa otras inversiones: en formación de los trabajadores que la usan, en infraestructura de datos que la alimenta, en sistemas de gestión que incorporan sus outputs. El impacto pleno llega cuando todas esas piezas están en su sitio, no cuando se instala el primer modelo.

{{ include_html("snippets/ia-pib-bienestar-energia/04-jcurva-productividad.html") }}

---

## 2. Dónde aparece antes que en el PIB

Si el PIB no capta el impacto a corto plazo, ¿dónde sí aparece?

### Productividad por tarea específica

Los estudios a nivel de tarea, en lugar de a nivel de empresa o de economía, muestran ganancias consistentes. Los estudios de economistas de MIT, Harvard y Stanford sobre el uso de asistentes de IA en tareas de codificación, redacción de textos, análisis de datos y respuesta a clientes muestran reducciones de tiempo en esas tareas del 20% al 50% según el contexto [Brynjolfsson et al. (2023)](https://www.nber.org/papers/w31161). En tareas legales, estudios de campo han documentado ahorros de tiempo de entre el 12 y el 32% [Goldman Sachs (2023)](https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html), y en desarrollo de software los experimentos con asistentes de código muestran aumentos en la tasa de completitud de tareas de alrededor del 26% [Peng et al. (2023)](https://arxiv.org/abs/2302.06590).

Esas ganancias a nivel de tarea no producen automáticamente el mismo porcentaje de ganancia a nivel de empresa o de economía, porque el tiempo ahorrado no siempre se redirige a tareas más productivas. Pero señalan que el potencial físico existe.

{{ include_html("snippets/ia-pib-bienestar-energia/04-evidencia-sectorial.html") }}

### Capacidades antes inexistentes

En ciertos dominios, la IA no solo acelera tareas existentes sino que hace posibles tareas que antes eran inviables a cualquier escala. El caso más documentado es la predicción de estructuras proteicas: el sistema AlphaFold de DeepMind aceleró la capacidad de predecir la forma tridimensional de una proteína a partir de su secuencia en un factor de aproximadamente 45.000 respecto a los métodos experimentales anteriores. El valor no es solo la velocidad sino el acceso: investigadores sin los recursos para experimentos de cristalografía de rayos X pueden obtener estructuras proteicas en minutos, lo que ha ampliado la participación en proyectos de desarrollo farmacéutico a instituciones y países que antes no tenían capacidad para entrar en ese campo.

En la industria manufacturera, los primeros casos documentados muestran un tipo diferente de impacto. ArcelorMittal y HeidelbergMaterials han reportado reducciones de entre el 2 y el 5% en el consumo energético de sus instalaciones gracias a sistemas de IA que optimizan en tiempo real los parámetros de producción, un canal de impacto que las métricas de productividad laboral no capturan porque la IA actúa como sistema de control de procesos físicos, no como herramienta cognitiva del trabajador.

### Calidad percibida

En muchas tareas, la IA no reduce el tiempo sino que mejora el output manteniendo el tiempo constante. Un analista puede producir informes más completos, con más contexto y más variantes, en el mismo tiempo que antes. Un programador puede explorar más opciones de diseño antes de comprometerse con una. Un médico puede revisar literatura relevante más ampliamente antes de tomar una decisión.

Esa mejora de calidad es real y valiosa pero no aparece directamente en las métricas de productividad tradicionales. La brecha entre la experiencia de los usuarios y los datos de producción agregados aparece de forma recurrente en los estudios de adopción: encuestas entre usuarios de herramientas de IA en entornos profesionales muestran que la mayoría reporta ganancias de productividad personal significativas, pero cuando esas ganancias se buscan en datos de producción institucionales, los efectos son sistemáticamente menores que los autoreportados o no resultan estadísticamente detectables. 

Las hipótesis más probables son que las ganancias se redistribuyen hacia tareas que antes no existían, se expresan en calidad que las métricas no capturan, o se absorben en reorganización del tiempo de trabajo en lugar de en producción adicional medible.

### Tiempo ahorrado en tareas rutinarias

El impacto más visible y más inmediato está en la reducción del tiempo dedicado a tareas que son necesarias pero no añaden valor diferencial: redactar comunicaciones estándar, buscar información en documentación interna, hacer resúmenes, traducir contenido, formatear datos para informes.

{{ include_html("snippets/ia-pib-bienestar-energia/04-difusion.html") }}

---

## 3. Nuevos productos y servicios que no existían

Una parte del impacto que el PIB capta peor es la creación de productos y servicios que antes no existían o que eran prohibitivamente caros.

La personalización a escala es el ejemplo más claro: antes de la IA, personalizar la experiencia de cada cliente requería trabajo humano que hacía el coste inviable a escala. La IA permite personalizar la comunicación, el contenido y la asistencia para millones de usuarios simultáneamente con un coste marginal muy bajo.

Las aplicaciones de salud mental asistidas por IA, las tutorías personalizadas en educación, los asistentes de programación accesibles para desarrolladores individuales, o los sistemas de diagnóstico de imagen médica que extienden el alcance de los especialistas a zonas sin acceso son ejemplos de valor que antes sencillamente no estaba disponible para esos usuarios, o lo estaba a un coste muy superior.

Ese valor "nuevo" es difícil de medir porque no tiene comparación directa con lo que existía antes.

---

## 4. El problema del valor mal medido

El PIB tiene un sesgo sistemático frente a los bienes y servicios cuyo precio baja drásticamente: cuando algo pasa de costar mucho a costar poco, el PIB puede capturar una reducción del gasto incluso si el consumo real aumenta y el bienestar mejora.

Los servicios digitales gratuitos o de bajo coste son el ejemplo más citado: el valor que una persona extrae de un buscador, de un servicio de mensajería o de un asistente de IA no aparece bien reflejado en el PIB cuando ese servicio se ofrece gratis o a precio nominal.

La misma lógica aplica a la IA: si la IA permite que un autónomo o una pyme produzca trabajo que antes requería un equipo más grande, el PIB puede ver ese cambio como una reducción del mercado laboral en ese segmento, en lugar de como un aumento de capacidad productiva.

---

## 5. Señales tempranas más indicativas

Las señales que con más probabilidad anticipan el impacto macroeconómico futuro de la IA son:

**Tasa de adopción empresarial activa.** No basta con que una empresa "use" IA: lo relevante es qué porcentaje ha rediseñado procesos reales en torno a ella. Las encuestas de McKinsey, OCDE y Stanford HAI rastrean esto con más granularidad que el PIB. Los datos disponibles muestran una brecha creciente: las grandes empresas adoptan IA generativa a un ritmo que supera en más de 30 puntos porcentuales a las pequeñas y medianas [McKinsey (2024)](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai). La misma encuesta estima que solo el 1% de las empresas ha alcanzado un nivel que puede considerarse maduro de despliegue de IA, definido como integración profunda en procesos de negocio con métricas de retorno documentadas, mientras que el 99% restante está en fases de exploración, piloto o adopción parcial. Esa cifra sugiere que el grueso del impacto macroeconómico está todavía por materializarse.

**Productividad por trabajador en sectores de early adoption.** Tecnología, servicios financieros, salud y sector legal son los que muestran primero las ganancias. Si esas ganancias se aceleran, es una señal adelantada.

**Formación y reorganización laboral.** Las empresas que más invierten en formar a sus equipos para usar IA de forma efectiva son las que más probablemente materializarán las ganancias de productividad. Eso es observable antes de que aparezca en el PIB.

**Nuevos puestos y roles emergentes.** Qué trabajos nuevos crea la IA, no solo cuántos elimina, y si esos trabajos tienen mayor o menor valor añadido que los que desplaza.

> El impacto de la IA en el PIB llegará, pero llegará tarde y de forma desigual entre sectores, geografías y tamaños de empresa. Lo que ocurra en los próximos años con la distribución de esos beneficios determinará si el resultado final mejora el bienestar de la mayoría o concentra las ganancias en una minoría que ya las tenía.

{{ include_html("snippets/ia-pib-bienestar-energia/04-brecha-adopcion.html") }}

Las proyecciones más optimistas [Goldman Sachs (2023)](https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html) estiman un impacto acumulado de hasta 7 billones de dólares en el PIB global en diez años, con un aumento del potencial de crecimiento estadounidense de 1,5 puntos porcentuales. PwC lleva esa estimación más lejos: en su escenario de adopción amplia, el impacto global podría alcanzar los 15,7 billones de dólares para 2030, con una distribución geográfica marcadamente desigual en la que China capturaría hasta un 26% del crecimiento adicional y Norteamérica un 14,5% [PwC (2023)](https://web.archive.org/web/20241015094323/https://www.pwc.com/gx/en/issues/artificial-intelligence/publications/artificial-intelligence-study.html). Para Estados Unidos en particular, KPMG estima un incremento del PIB de 2,84 billones de dólares para ese mismo año en su escenario central. Todas estas proyecciones coexisten con análisis más cautelosos: Daron Acemoglu, del MIT, argumenta que si la IA solo automatiza las tareas más rutinarias y no crea nuevas categorías de valor en igual medida, el impacto agregado en la productividad total de los factores podría quedarse por debajo del 0,53% acumulado en una década [Acemoglu (2024)](https://www.nber.org/papers/w32487). La diferencia entre ambas visiones no es técnica sino sobre qué parte de la economía puede transformarse realmente con los modelos actuales.

{{ include_html("snippets/ia-pib-bienestar-energia/04-debate-proyecciones.html") }}

---

## Preguntas frecuentes

**¿Por qué no se ve todavía el impacto de la IA en el PIB si es tan potente?**
Las tecnologías de propósito general tienen un patrón histórico: su impacto en la productividad macroeconómica llega con desfase de años o décadas. La electrificación industrial tardó treinta años en mostrar su efecto pleno porque primero hubo que rediseñar las fábricas, no solo cambiar los motores. Con la IA ocurre algo parecido: las empresas están en fase de aprendizaje y reorganización, el capital intangible necesario (conocimiento de uso, datos propios, procesos rediseñados) no se mide bien, y la mayoría de la adopción todavía es parcial. Brynjolfsson llama a este fenómeno la J-Curve de la productividad: una caída aparente antes de la recuperación.

**¿Qué es la J-Curve de la productividad y cómo se aplica a la IA?**
La J-Curve describe el patrón donde la adopción de una tecnología de propósito general produce primero una caída aparente en la productividad medida, porque los costes de reorganización y formación son inmediatos pero los beneficios están diferidos hasta que el capital intangible complementario se acumula. Para la IA, eso significa que las empresas invierten en herramientas, formación y rediseño de procesos antes de que aparezca el retorno en datos de producción. La trampa es interpretar esa caída inicial como señal de que la tecnología no funciona, cuando en realidad es la fase previa al salto.

**¿Dónde se están viendo ya ganancias de productividad por la IA?**
En tareas específicas y medibles. Las ganancias más documentadas son del 20-50% en tareas de codificación (GitHub Copilot: +26% en tasa de completitud), entre el 12 y el 32% en tareas legales, y +14% en casos resueltos por hora en atención al cliente (Brynjolfsson et al., 2023). En ciencia, AlphaFold aceleró la predicción de estructuras proteicas en un factor de 45.000. En manufactura, los primeros sistemas de optimización en tiempo real muestran reducciones del 2-5% en consumo energético de instalaciones industriales. Estas ganancias a nivel de tarea no siempre escalan automáticamente a nivel de empresa o de economía.

**¿Cuánto podría crecer el PIB gracias a la IA según los estudios más citados?**
Las estimaciones varían mucho. Goldman Sachs proyecta hasta 7 billones de dólares de impacto global en diez años. PwC eleva esa cifra a 15,7 billones para 2030 en su escenario de adopción amplia. En el extremo contrario, Daron Acemoglu (MIT) argumenta que si la IA solo automatiza las tareas más rutinarias sin crear nuevas categorías de valor equivalentes, el impacto acumulado en productividad podría quedarse por debajo del 0,53% en una década. La diferencia entre visiones no es principalmente técnica sino sobre qué fracción de la economía puede transformarse con los modelos actuales.

**¿Por qué las ganancias que reportan los usuarios de IA no aparecen en los datos macroeconómicos?**
Hay varias hipótesis que no son mutuamente excluyentes: el tiempo ahorrado puede redistribuirse hacia actividades que antes no existían o que los indicadores no capturan como producción adicional; las mejoras pueden expresarse en calidad del output (informes más completos, más variantes analizadas) sin producir más cantidad medible; o las ganancias se absorben en reorganización interna del tiempo de trabajo sin generar producción adicional visible. El efecto es sistemático: las encuestas de adopción muestran ganancias subjetivas significativas que los datos de producción institucional no confirman o lo hacen con un desfase considerable.

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **Brynjolfsson, E., Li, D., Raymond, L.R. (2023)** — *Generative AI at Work* ([NBER][r1]) | Experimento de campo en atención al cliente: +14% de casos resueltos por hora, mayor beneficio para trabajadores menos experimentados. Base empírica para el argumento de democratización de competencias. |
| R2 | **Goldman Sachs (2023)** — *The Potentially Large Effects of Artificial Intelligence on Economic Growth* ([Goldman Sachs][r2]) | Proyección macroeconómica: hasta $7 billones de impacto en el PIB global en 10 años, +1,5-2pp de crecimiento potencial en EE.UU., 60-70% de ocupaciones con tareas automatizables. Fuente para los datos de ahorro de tiempo en tareas legales. |
| R3 | **Acemoglu, D. (2024)** — *The Simple Macroeconomics of AI* ([NBER][r3]) | Análisis de equilibrio general: si la IA solo automatiza el 5% de tareas con retorno económico viable a corto plazo, el impacto acumulado en PTF sería inferior al 1% en una década. Contrapeso al optimismo de R2. |
| R4 | **Gordon, R.J. (2016)** — *The Rise and Fall of American Growth* (Princeton UP) | Historia del crecimiento de productividad en EE.UU. desde 1870. Documenta el patrón de desfase entre adopción de tecnologías de propósito general y su impacto macroeconómico medible. |
| R5 | **McKinsey & Company (2024)** — *The State of AI* ([McKinsey][r5]) | Encuesta anual de adopción de IA en empresas de 100+ países. Fuente para la brecha de adopción entre grandes empresas y pymes (más de 30 puntos porcentuales en uso activo con rediseño de procesos). |
| R6 | **Brynjolfsson, E. et al. (2021)** — *The Productivity J-Curve: How Intangibles Complement General Purpose Technologies* ([NBER][r6]) | Marco teórico y evidencia empírica del patrón J-Curve: la PTF parece caer antes de subir porque el capital intangible (conocimiento, procesos, organización) necesario para complementar la tecnología no se mide bien hasta que se acumula. |
| R7 | **Peng, S. et al. (2023)** — *The Impact of AI on Developer Productivity: Evidence from GitHub Copilot* ([arXiv][r7]) | Experimento controlado: los desarrolladores con acceso a GitHub Copilot completaron tareas de codificación un 55% más rápido en el experimento, con un +26% en tasa de éxito en tareas representativas del trabajo real. |
| R8 | **PwC (2023)** — *Sizing the Prize: What's the real value of AI for your business?* ([PwC][r8]) | Proyección del impacto global de la IA en el PIB: 15,7 billones de dólares para 2030 en el escenario de adopción amplia, con distribución geográfica detallada (China +26% del crecimiento adicional, Norteamérica +14,5%). |

</details>

[r1]: https://www.nber.org/papers/w31161 "Generative AI at Work — NBER"
[r2]: https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html "The Potentially Large Effects of AI on Economic Growth — Goldman Sachs"
[r3]: https://www.nber.org/papers/w32487 "The Simple Macroeconomics of AI — NBER"
[r4]: https://press.princeton.edu/books/hardcover/9780691147727/the-rise-and-fall-of-american-growth "The Rise and Fall of American Growth — Princeton UP"
[r5]: https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai "The State of AI 2024 — McKinsey"
[r6]: https://www.nber.org/papers/w25148 "The Productivity J-Curve — NBER"
[r7]: https://arxiv.org/abs/2302.06590 "The Impact of AI on Developer Productivity: Evidence from GitHub Copilot — arXiv"
[r8]: https://web.archive.org/web/20241015094323/https://www.pwc.com/gx/en/issues/artificial-intelligence/publications/artificial-intelligence-study.html "Sizing the Prize — PwC"
