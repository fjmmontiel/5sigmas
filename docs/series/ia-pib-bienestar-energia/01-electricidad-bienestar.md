---
title: Electricidad y bienestar
description: Por qué el acceso a electricidad fiable y barata habilita saltos reales en salud, logística e industria, y qué diferencia hay entre tener kilovatios y tener calidad de suministro.
date: 2026-04-07
keywords: "electricidad y bienestar, acceso energía desarrollo, electrificación rural, MTF energía, consumo electricidad per cápita, IDH y energía, calidad suministro eléctrico, nexo energía desarrollo humano"
tags:
  - Economía
  - Energía
  - IA
video: "01-electricidad-bienestar.mp4"
video_duration: "PT1M15S"
---

# Capítulo 1 — Electricidad y bienestar: los mecanismos reales

Este capítulo describe los mecanismos por los que el acceso a electricidad produce efectos reales en salud, economía e industria, y distingue entre la cantidad de energía disponible y la calidad del suministro. Al terminarlo, el lector entenderá los cuatro canales principales que conectan la electrificación con el bienestar, conocerá qué mide el Marco Multi-Nivel (MTF) del Banco Mundial y por qué la conexión nominal a la red no equivale a acceso efectivo a energía, y dispondrá de la base para entender por qué la infraestructura de IA tiene las mismas dependencias físicas que cualquier otro sector eléctrico.

La correlación entre electricidad y desarrollo humano aparece en todos los datos con una regularidad que cuesta no relacionar. Los países con mayor acceso a electricidad fiable y barata tienden a tener mejor esperanza de vida, menores tasas de mortalidad infantil, mayor productividad industrial y más capacidad de generar servicios.

La actualización más reciente de la Agencia Internacional de la Energía (IEA) muestra por qué esta relación vuelve a ser central con la IA: el consumo eléctrico de los centros de datos aumentó un 17% en 2025, mientras que el de los centros orientados a IA creció todavía más rápido. Aunque el consumo por tarea está cayendo por las mejoras de eficiencia, el uso total sigue subiendo porque aumentan la adopción y las cargas intensivas, incluidos los agentes. La eficiencia de cada consulta no elimina la necesidad de una red fiable para sostener el conjunto ([IEA, 2026](https://www.iea.org/news/data-centre-electricity-use-surged-in-2025-even-with-tightening-bottlenecks-driving-a-scramble-for-solutions)).

Los datos también permiten cuantificar esa regularidad. Análisis de datos de panel con 47 países estiman que un incremento del 1% en el consumo de energía per cápita se asocia con un aumento de entre 0,64 y 0,94 puntos porcentuales en los índices de bienestar percibido, una relación estadísticamente significativa incluso controlando por renta, urbanización y condiciones climáticas [Lee et al. (2020)](https://www.aeaweb.org/articles?id=10.1257/jep.34.1.122).

El problema es que la correlación no explica el mecanismo. Si no entendemos por qué la electricidad produce esos efectos, tampoco podemos anticipar cuándo deja de producirlos, qué nivel de acceso es suficiente, o qué forma de suministro importa realmente.

Este capítulo desglosa los mecanismos reales que conectan la electricidad con el bienestar, y distingue entre dos variables que suelen confundirse: la cantidad de energía disponible y la calidad del suministro.

{{ include_html("snippets/ia-pib-energia/series_energy_ai_01_electricity.html") }}

---

## 1. Los cuatro canales principales

La electricidad no produce bienestar directamente. Lo hace habilitando otros sistemas que, estos sí, tienen impacto directo en la vida de las personas.

{{ include_html("snippets/ia-pib-bienestar-energia/01-mecanismos.html") }}

### Salud

El impacto más inmediato ocurre en el sector sanitario. La refrigeración fiable permite conservar vacunas, sangre, medicamentos y muestras de laboratorio. Los equipos de diagnóstico (desde un simple análisis de sangre hasta un escáner de resonancia magnética) requieren corriente estable. La iluminación adecuada en quirófanos y salas de parto reduce la mortalidad perinatal de forma directa.

Fuera de los centros de salud, el impacto se extiende al hogar: la refrigeración de alimentos reduce la carga microbiana en la dieta, el agua potable requiere bombeo y tratamiento, y la sustitución de combustión interior (leña, queroseno) por electricidad reduce la enfermedad respiratoria crónica, que es una de las principales causas de mortalidad en hogares de bajos ingresos. Estudios de caso en América Latina documentan reducciones superiores a treinta puntos porcentuales en indicadores de enfermedad respiratoria tras ese cambio, con efectos más pronunciados en menores de cinco años y personas mayores [Lee et al. (2020)](https://www.aeaweb.org/articles?id=10.1257/jep.34.1.122).

### Logística e industria

La electricidad permite mecanizar procesos que de otro modo requieren trabajo físico intensivo o quedan sin hacer. Desde molinos de grano hasta sistemas de irrigación, desde cadenas de frío para alimentos perecederos hasta talleres de manufactura básica, la electrificación multiplica la cantidad de trabajo que puede hacer una persona en una hora.

En agricultura, el acceso a bombas eléctricas para irrigación puede duplicar o triplicar el rendimiento por hectárea en zonas con déficit hídrico estacional. En manufactura, la capacidad de operar maquinaria eléctrica sin depender de motores de combustión con mantenimiento costoso cambia la ecuación económica de pequeñas y medianas empresas.

### Servicios y educación

Con electricidad llegan la iluminación nocturna (que amplía las horas útiles de estudio y trabajo), la conectividad digital (que requiere energía para funcionar) y los servicios de telecomunicaciones (que necesitan infraestructura energizada). La cadena es directa: electrificación habilita conectividad, la conectividad habilita acceso a información y mercados, y ese acceso se traduce en capacidad de aprendizaje, emprendimiento y participación económica.

---

## 2. La diferencia entre cantidad y calidad

Aquí aparece la distinción que los datos agregados suelen ocultar: no es lo mismo tener acceso a electricidad que tener acceso a electricidad de calidad.

### Cantidad: kilovatios-hora per cápita

La métrica más habitual para medir electrificación es el consumo en kWh per cápita. Es una métrica útil para comparaciones a gran escala, pero tiene un límite fundamental: no dice nada sobre cómo se distribuye ese consumo, a qué precio llega, ni con qué fiabilidad funciona el suministro.

Un país puede tener una media de kWh per cápita relativamente alta y al mismo tiempo tener regiones enteras con cortes de doce horas diarias, mientras la capital consume de forma continua. El promedio esconde una distribución que tiene consecuencias radicalmente distintas para cada parte de esa distribución.

### Calidad: fiabilidad, estabilidad y coste de los cortes

La calidad del suministro se mide con variables distintas:

- **Fiabilidad**: horas de corte por año y su predictibilidad. Un sistema con cuatro horas de corte diario pero predecible permite adaptarse (generadores de respaldo, planificación de procesos). Un sistema con cortes aleatorios de la misma duración total daña más porque impide cualquier planificación.

- **Estabilidad de voltaje**: las fluctuaciones de voltaje dañan equipos electrónicos y electrodomésticos. Para la industria pequeña, eso se traduce en coste de mantenimiento elevado y vida útil reducida de maquinaria. Para los hogares, en electrodomésticos que se rompen con más frecuencia de la que el ingreso disponible puede reemplazar.

- **Coste de los cortes**: la interrupción del suministro no es solo una incomodidad. Para una clínica, un corte puede significar la pérdida de toda la cadena de frío. Para un taller, significa producción paralizada y pedidos incumplidos. Para un comercio, neveras vacías y género perdido. El coste económico real de los cortes supera ampliamente el coste visible del kilovatio-hora.

### Umbrales y rendimientos decrecientes

Los datos muestran una relación no lineal entre consumo eléctrico y bienestar. En niveles muy bajos de acceso, cada kilovatio-hora adicional tiene un impacto enorme: es la diferencia entre tener o no tener luz, refrigeración básica, o posibilidad de conectarse. A partir de cierto umbral, el impacto marginal decrece.

> El primer escalón (pasar de cero acceso a acceso básico confiable) es el que produce los mayores retornos en salud y productividad. El Marco Multi-Nivel de Acceso Energético (MTF) del Banco Mundial identifica el rango de 50 a 200 kWh per cápita anuales como la zona donde los retornos en salud y productividad básica son más pronunciados, antes de que la demanda se oriente hacia usos industriales y de ocio de mayor consumo [ESMAP, Banco Mundial (2015)](https://documents.worldbank.org/en/publication/documents-reports/documentdetail/875761468136575589/beyond-connections-energy-access-redefined). Las mejoras a partir de un consumo medio ya establecido generan ganancias más modestas y difusas.

Esto tiene implicaciones directas para las políticas de electrificación: el énfasis en ampliar el acceso a quien no lo tiene produce retornos mucho mayores que mejorar la infraestructura en zonas ya electrificadas, al menos en términos de impacto en bienestar humano básico.

El extremo superior de la distribución añade otra perspectiva. Todos los países que han alcanzado un IDH de 0,9 o superior tienen un consumo per cápita de al menos 4.000 kWh anuales, aunque no todos los que superan ese consumo han alcanzado ese nivel de IDH. La electricidad en ese rango funciona como condición necesaria pero no suficiente: por debajo del umbral, el desarrollo humano alto no se ha producido en ningún caso documentado; por encima, otros factores institucionales, educativos y distributivos determinan si el potencial energético se traduce en bienestar generalizado.

{{ include_html("snippets/ia-pib-bienestar-energia/01-kwh-idi-curva.html") }}

---

## 3. Qué pasa cuando el suministro falla

Los cortes de electricidad tienen un coste documentado que va mucho más allá de la incomodidad. En países con infraestructura eléctrica poco fiable, las empresas invierten en generadores diésel de respaldo, lo que añade un coste operativo permanente que las empresas de países con suministro estable no tienen. Las estimaciones del Banco Mundial sitúan el coste de las interrupciones en el equivalente al 5-6% de los ingresos anuales para grandes empresas, cifra que puede superar el 20% para pequeñas y medianas empresas con menor capacidad de instalar generación de respaldo propia [Banco Mundial, Enterprise Surveys](https://www.enterprisesurveys.org/). Ese diferencial actúa como un impuesto implícito sobre la actividad económica que no aparece en ningún indicador agregado pero sí en los márgenes de cada empresa que lo soporta.

En el sector salud, las consecuencias son directamente medibles en resultados clínicos. Los estudios en países con alta tasa de cortes muestran correlación entre frecuencia de cortes y mortalidad perinatal, pérdida de vacunas por ruptura de cadena de frío, y cancelación de procedimientos quirúrgicos programados.

Para los hogares, los cortes prolongados en verano o invierno tienen impacto directo en morbimortalidad de población vulnerable: personas mayores, pacientes con enfermedades crónicas que requieren equipos eléctricos, familias sin capacidad de pagar alternativas de respaldo.

{{ include_html("snippets/ia-pib-bienestar-energia/01-costes-cortes.html") }}

---

## 4. El suministro eléctrico como infraestructura habilitante

Una forma de entender la electricidad es tratarla no como un servicio final sino como una infraestructura habilitante, es decir, como la condición que hace posibles otros servicios que sí tienen impacto directo en bienestar.

En esos términos, la electricidad funciona como el agua potable o las redes de transporte: su valor no está en ella misma sino en lo que desbloquea. Un sistema de agua potable no tiene valor si la red de distribución tiene pérdidas del 40%. Un sistema de transporte no tiene valor si los caminos están cortados la mitad del año. Un sistema eléctrico no tiene valor si los cortes son tan frecuentes que los servicios críticos no pueden operar con él.

{{ include_html("snippets/ia-pib-bienestar-energia/01-electricidad-infraestructura.html") }}

> Lo que importa no es solo cuánta electricidad hay disponible, sino con qué fiabilidad llega y a qué coste para los usuarios finales. La calidad del suministro es tan determinante como la cantidad.

El siguiente capítulo analiza cómo la IA entra en este ecosistema: qué demanda computacional genera, qué presión añade sobre la infraestructura energética, y por qué la eficiencia creciente del hardware no implica necesariamente una demanda energética decreciente. La conexión entre este capítulo y el siguiente no es solo técnica: si la IA requiere electricidad estable y abundante para funcionar, y si ese acceso sigue siendo desigual a escala global, entonces la brecha de bienestar que la electrificación ayudó a reducir podría reproducirse en una nueva forma con la IA como vector.


---

## Preguntas frecuentes

**¿Cuánta electricidad se necesita para que la electrificación tenga impacto real en el bienestar?**
Los estudios sugieren que el umbral donde los efectos en salud y economía se hacen consistentes está en torno a 500-1.000 kWh per cápita al año. Por encima de ese nivel, el sistema puede sostener refrigeración de alimentos y medicamentos, iluminación nocturna y pequeña maquinaria. Por debajo, el acceso es insuficiente para las actividades que producen los saltos más visibles en bienestar. El Marco Multi-Nivel (MTF) del Banco Mundial formaliza esto con cinco escalones, donde el nivel más bajo (horas de iluminación de poca intensidad) está lejos de habilitar los usos productivos que cambian la economía local.

**¿Qué diferencia hay entre tener acceso a la red eléctrica y tener acceso efectivo a energía?**
La tasa de electrificación oficial mide si hay una conexión disponible, no si el suministro es suficiente para los usos que importan. Muchas comunidades con conexión formal reciben entre dos y ocho horas de electricidad al día o experimentan caídas de tensión que inhabilitan equipos productivos. Esos hogares aparecen en las estadísticas como "con acceso" aunque el suministro no alcance los umbrales del MTF que habilitan usos sanitarios o económicos. El dato relevante no es la conexión sino la potencia disponible, la fiabilidad y el coste.

**¿Por qué el coste de las interrupciones del suministro eléctrico es tan alto para las empresas en países en desarrollo?**
Porque en contextos donde la red es poco fiable, cada empresa que depende de electricidad tiene que invertir en generación de respaldo, normalmente grupos electrógenos de diésel. Ese coste duplica la inversión necesaria en electricidad, reduce la competitividad de las empresas locales frente a las que operan con red estable, y actúa como barrera de entrada para actividades que requieren equipos de precisión o refrigeración continua. Las encuestas empresariales del Banco Mundial sitúan el coste de las interrupciones en entre el 3 y el 15% de los ingresos anuales según el sector.

**¿Es suficiente la electricidad para producir desarrollo, o se necesitan otras condiciones?**
La electricidad es una condición necesaria pero no suficiente. Los estudios más rigurosos muestran efectos causales positivos, pero también documentan que esos efectos son mayores cuando la electrificación se combina con otras inversiones complementarias: infraestructura de transporte para llevar productos al mercado, sistemas de salud que puedan operar el equipamiento que se alimenta de la red, o formación técnica para manejar los equipos que la electrificación hace posibles. Sin esas complementariedades, la electrificación mejora los indicadores pero no dispara el salto que los datos de los países que ya la tienen sugieren.

**¿Cómo conecta el acceso a electricidad con el riesgo de brecha que puede abrir la IA?**
Si la IA requiere infraestructura computacional que depende de electricidad estable y abundante, los países y regiones que ya tienen déficit energético quedarán fuera del acceso a herramientas que sí estarán disponibles en economías con red robusta. El efecto no es solo de acceso a servicios de IA, sino de capacidad de adoptar los procesos productivos que la IA hará posibles: desde diagnóstico médico asistido hasta agricultura de precisión. La brecha de electrificación puede convertirse en brecha de IA si no se resuelve la primera.

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | **IEA (2025)** — *Energy and AI* ([IEA][r1]) | Análisis del impacto de la IA en la demanda energética global; referencia para datos de acceso y consumo. |
| R2 | **Banco Mundial** — *World Development Indicators* ([Banco Mundial][r2]) | Base de datos con indicadores de acceso a electricidad, desarrollo humano y distribución del suministro. |
| R3 | **Dinkelman, T. (2011)** — *The Effects of Rural Electrification on Employment: New Evidence from South Africa* ([American Economic Review][r3]) | Diseño cuasi-experimental con topografía como variable instrumental. Efectos causales positivos sobre empleo femenino y bienestar en comunidades rurales de Sudáfrica. |
| R4 | **Lee, K. et al. (2020)** — *Does Household Electrification Supercharge Economic Development?* ([Journal of Economic Perspectives][r4]) | Revisión de la evidencia microeconómica sobre electrificación y desarrollo, incluyendo efectos sobre salud, empleo y bienestar en países en desarrollo. |
| R5 | **IEA** — *World Energy Outlook 2024* ([IEA][r5]) | Escenarios de acceso energético global (SDG7), demanda futura y análisis de electrificación por regiones. |
| R6 | **World Bank / ESMAP (2015)** — *Beyond Connections: Energy Access Redefined* ([Banco Mundial][r6]) | Documento fundacional del Marco Multi-Nivel (MTF). Define los cinco niveles de acceso energético y los umbrales de consumo asociados a cada uno. |
| R7 | **Banco Mundial** — *Enterprise Surveys* ([Banco Mundial][r7]) | Base de datos de encuestas empresariales en más de 150 países. Fuente primaria para el coste de las interrupciones de suministro como porcentaje de ingresos. |
| R8 | **IEA (2026)** — *[Key Questions on Energy and AI](https://www.iea.org/reports/key-questions-on-energy-and-ai)* | Actualización sobre demanda eléctrica de centros de datos, eficiencia por tarea, crecimiento de cargas de IA y nuevos cuellos de botella físicos. |

</details>

[r1]: https://www.iea.org/reports/energy-and-ai "Energy and AI — IEA"
[r2]: https://databank.worldbank.org/source/world-development-indicators "World Development Indicators — Banco Mundial"
[r3]: https://www.aeaweb.org/articles?id=10.1257/aer.101.7.3078 "The Effects of Rural Electrification on Employment — AER"
[r4]: https://www.aeaweb.org/articles?id=10.1257/jep.34.1.122 "Does Household Electrification Supercharge Economic Development? — Journal of Economic Perspectives"
[r5]: https://www.iea.org/reports/world-energy-outlook-2024 "World Energy Outlook 2024 — IEA"
[r6]: https://documents.worldbank.org/en/publication/documents-reports/documentdetail/875761468136575589/beyond-connections-energy-access-redefined "Beyond Connections: Energy Access Redefined — ESMAP/World Bank"
[r7]: https://www.enterprisesurveys.org/ "Enterprise Surveys — Banco Mundial"
[r8]: https://www.iea.org/reports/key-questions-on-energy-and-ai "Key Questions on Energy and AI — IEA"
