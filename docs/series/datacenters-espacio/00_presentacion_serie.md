---
title: Datacenters en el espacio
description: "Análisis técnico de los datacenters en órbita: disipación de calor, latencia, coste de lanzamiento y viabilidad real frente a la infraestructura terrestre."
keywords: datacenters espacio, computación orbital, infraestructura IA, energía cómputo, satélites computación
robots: noindex
tags:
  - IA
  - Energía
  - Infraestructura
video: "00_presentacion_serie.mp4"
hide:
  - toc
---
# Datacenters en el espacio

{{ include_html("snippets/series_meta.html", series_dir="datacenters-espacio", data_state="construction", data_level="general", status_label="En construcción", level_label="General", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisitos</span><span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a></span></div>") }}

La demanda de cómputo crece más rápido que la capacidad de construir datacenters en tierra. Esta serie analiza si llevar infraestructura de cómputo al espacio es una solución viable o una apuesta especulativa: qué problemas físicos resuelve el vacío, cuáles crea, y qué proyectos reales ya están en marcha.

{{ include_html("snippets/datacenters-espacio/dc_space_pressure_anim.html") }}

## Índice

### 1. Por qué ahora
- Demanda de cómputo de IA: 350.000× más cómputo desde 2014, 1.000 TWh/año proyectados para 2026.
- Seis cuellos de botella en la tierra: red eléctrica (4-12 años de espera), agua (2M litros/día por 100 MW), terreno (4 km² por 1 GW), permisos, calor, latencia.
- El coste de lanzamiento: de $88.000/kg (Transbordador) a $1.400/kg (Falcon Heavy) a <$200/kg (Starship proyectado).
- El punto de inflexión: declaración de Musk (feb. 2026), solicitud FCC de SpaceX para 1 millón de satélites.

### 2. Energía, calor y conectividad
- Por qué "en el espacio hace frío" no implica enfriar gratis: Stefan-Boltzmann, radiadores de 3.950 m² para 2 MW.
- Ventaja real: 1.361 W/m² solar, 95-99% factor de capacidad, $0.002/kWh equivalente.
- Ventanas de enlace (2-10 min LEO), latencia (45-80 ms LEO vs. 600 ms GEO), downlink como cuello de botella.
- Degradación orbital: TRL 3-5 para mantenimiento autónomo, vida útil 5-7 años con COTS, Radshield.

### 3. Qué es "un datacenter en el espacio"
- Hardware real ya en órbita: Starcloud H100 (nov. 2025), Axiom AxDCU-1 + nodos ODC (ene. 2026), D-Orbit AIX, ADA Space Three-Body (12 sats, 5 PFLOPS).
- El espectro de casos de uso: procesamiento a bordo (TRL 7, viable hoy) → computación propósito general (especulativo).
- Almacenamiento resiliente: Lonestar lunar, Spacebilt petabyte en órbita.
- Marco legal: Digital Flag State, Tratado de 1967, regla de 25 años de desorbitación.
- Megaproyectos: SpaceX 1M sats / 100 GW, Google Suncatcher, Starcloud 5 GW, ESA SOLARIS 2040.

### 4. La huella real de un datacenter
- Agua: campos de golf en EEUU retiran 4,4× más agua que todos los DCs del país; en Arizona el ratio es 32:1. La tecnología de refrigeración determina el WUE en un factor de diez.
- Energía: 415 TWh (2024) → 945 TWh (2030). El rack Blackwell NVL72 exige 120 kW y convierte la refrigeración líquida en requisito obligatorio.
- Minerales: cobalto (RDC 74%, China 67% refinación), tierras raras (China 91%), tántalo (100% importado), cobre, litio. El cobalto concentra el mayor riesgo humano.
- Lifecycle: una H100 contiene ≈3 g de oro y 410-420 USD en metales recuperables; Microsoft recicla el 90,9% de componentes. Los minerales no tienen solución orbital.
