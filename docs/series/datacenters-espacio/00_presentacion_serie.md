---
title: Datacenters en el espacio
description: "Análisis técnico de los datacenters en órbita: disipación de calor, latencia, coste de lanzamiento y viabilidad real frente a la infraestructura terrestre."
date: 2026-06-14
keywords: datacenters espacio, computación orbital, infraestructura IA, energía cómputo, satélites computación
tags:
  - IA
  - Energía
  - Infraestructura
video: "00_presentacion_serie.mp4"
video_duration: "PT0M49S"
hide:
  - toc
---
# Datacenters en el espacio

{{ include_html("snippets/series_meta.html", series_dir="datacenters-espacio", data_state="published", data_level="general", status_label="Publicada", level_label="General", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerrequisitos</span><span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a></span></div>") }}

La demanda de cómputo crece más rápido que la capacidad de construir datacenters en tierra. Esta serie analiza si llevar infraestructura de cómputo al espacio es una solución viable o una apuesta especulativa: qué problemas físicos resuelve el vacío, cuáles crea, y qué proyectos están hoy en fase de prueba, propuesta o demostración.

{{ include_html("snippets/datacenters-espacio/dc_space_pressure_anim.html") }}

## Índice

### 1. Por qué ahora
- Demanda de cómputo de IA: salto de 350.000× desde 2014 y escenarios eléctricos que ya fuerzan la conversación sobre infraestructura ([capítulo 1](./01-por-que-ahora.md)).
- Seis cuellos de botella en tierra: red eléctrica, agua, terreno, permisos, calor y latencia, con fricciones muy distintas según el caso ([capítulo 1](./01-por-que-ahora.md)).
- El coste de lanzamiento: de los 88.000 $/kg del Transbordador a rangos de 1.400-2.500 $/kg en lanzadores reutilizables actuales, y el umbral `<200 $/kg` sigue siendo una proyección ([capítulo 1](./01-por-que-ahora.md)).
- El punto de inflexión: tesis agresivas de la industria y una solicitud regulatoria de SpaceX que todavía no equivale a un despliegue cerrado ([capítulo 1](./01-por-que-ahora.md)).

### 2. Energía, calor y conectividad
- Por qué "en el espacio hace frío" no implica enfriar gratis: la disipación sigue mandando y los radiadores escalan rápido ([capítulo 2](./02-energia-calor-conectividad.md)).
- Ventaja real: más continuidad solar por panel, y el escenario de `0,002 $/kWh` sigue siendo una proyección industrial, no un coste observado ([capítulo 2](./02-energia-calor-conectividad.md)).
- Ventanas de enlace, latencia y downlink: el cómputo orbital mejora algunos casos, pero no sustituye la fibra terrestre ([capítulo 2](./02-energia-calor-conectividad.md)).
- Degradación orbital: mantenimiento difícil, vida útil medida en años y fuerte dependencia de autonomía y corrección de errores ([capítulo 2](./02-energia-calor-conectividad.md)).

### 3. Qué es "un datacenter en el espacio"
- Hardware real ya en órbita: demostradores y primeros nodos con grados muy distintos de madurez, desde edge satelital hasta prototipos de cómputo y almacenamiento ([capítulo 3](./03-que-es-datacenter-espacio.md)).
- El espectro de casos de uso: procesamiento a bordo ya útil hoy frente a computación de propósito general todavía especulativa ([capítulo 3](./03-que-es-datacenter-espacio.md)).
- Almacenamiento resiliente: archivo extremo y nodos de alta capacidad, todavía lejos de una cloud orbital equivalente a la terrestre ([capítulo 3](./03-que-es-datacenter-espacio.md)).
- Marco legal: el Tratado de 1967 sigue siendo la base y la soberanía digital orbital sigue en debate, no cerrada ([capítulo 3](./03-que-es-datacenter-espacio.md)).
- Megaproyectos: moonshots, solicitudes regulatorias y hojas de ruta de empresa más que infraestructura masiva ya validada ([capítulo 3](./03-que-es-datacenter-espacio.md)).

### 4. La huella real de un datacenter
- Agua: el agregado nacional contextualiza, pero el conflicto político y ambiental real se vuelve local y depende mucho del tipo de refrigeración ([capítulo 4](./04-huella-real-datacenter.md)).
- Energía: el problema no es solo el TWh agregado. También es la densidad de potencia por rack y lo que obliga a rediseñar ([capítulo 4](./04-huella-real-datacenter.md)).
- Minerales: cobalto, tierras raras, tántalo y cobre añaden una dependencia geopolítica y humana que el debate público suele ocultar ([capítulo 4](./04-huella-real-datacenter.md)).
- Lifecycle: la circularidad ayuda, pero no elimina la nueva demanda de chips ni la huella material que también viajaría al espacio ([capítulo 4](./04-huella-real-datacenter.md)).
