---
title: Data Centers in Space
description: "Technical analysis of orbital data centers: heat dissipation, latency, launch cost and real viability compared with terrestrial infrastructure."
date: 2026-06-14
keywords: data centers in space, orbital computing, AI infrastructure, compute energy, satellite computing
tags:
  - AI
  - Energy
  - Infrastructure
hide:
  - toc
---
# Data Centers in Space

{{ include_html("snippets/series_meta.html", series_dir="datacenters-espacio", data_state="published", data_level="general", status_label="Published", level_label="General", progress_total="4", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisites</span><span class=\"series-meta-value\"><a href=\"/en/series/fundamentos-ia-iag/00_presentacion_serie/\">AI and Generative AI Foundations</a></span></div>") }}

Compute demand is growing faster than the capacity to build data centers on the ground. This series asks whether moving computing infrastructure into space is a viable solution or a speculative bet: which physical problems vacuum and orbit actually solve, which ones they create, and which projects are currently demonstrations, proposals or early tests.

{{ include_html("snippets/datacenters-espacio/dc_space_pressure_anim.html") }}

## Contents

### 1. Why now
- AI compute demand has increased dramatically since 2014, while electricity scenarios are already forcing an infrastructure conversation.
- Six terrestrial bottlenecks recur: power grid, water, land, permits, heat and latency—but their severity depends strongly on the location and workload.
- Launch cost has fallen from roughly $88,000/kg for the Space Shuttle to around $1,400–2,500/kg for current reusable launchers; a `<$200/kg` threshold remains a projection, not an observed price.
- The current inflection point is still a mix of aggressive industry theses and regulatory proposals rather than a settled mass deployment.

### 2. Energy, heat and connectivity
- Why "space is cold" does not mean free cooling: heat rejection still dominates and radiator area grows quickly.
- A real advantage is longer-duration solar exposure in suitable orbits; ultra-low projected energy costs remain industry scenarios, not observed operating costs.
- Link windows, latency and downlink constraints mean orbital computing may improve some use cases without replacing terrestrial fiber.
- Orbital degradation makes maintenance difficult and pushes the architecture toward autonomy, redundancy and error correction.

### 3. What a "data center in space" actually is
- Real hardware already in orbit spans very different maturity levels, from satellite edge processing to early compute and storage demonstrators.
- The use-case spectrum ranges from useful onboard processing today to general-purpose cloud computing that is still speculative.
- Resilient storage and high-capacity nodes are plausible niches, but they are far from an orbital cloud equivalent to terrestrial infrastructure.
- The 1967 Outer Space Treaty remains foundational while questions around orbital digital sovereignty remain open.
- Most megaprojects are still moonshots, regulatory requests and company roadmaps rather than validated mass infrastructure.

### 4. The real footprint of a data center
- Water: national aggregates provide context, but environmental and political conflicts are local and depend heavily on cooling architecture.
- Energy: aggregate TWh is only part of the problem; rack-level power density increasingly determines facility design.
- Minerals: cobalt, rare earths, tantalum and copper add geopolitical and human dependencies that public debate often hides.
- Lifecycle: circularity helps but does not eliminate new chip demand or the material footprint that an orbital system would also have to launch.

---

**Related series:** [AI, GDP, Well-being and Energy](/en/series/ia-pib-bienestar-energia/00_presentacion_serie/) · [AI and Generative AI Foundations](/en/series/fundamentos-ia-iag/00_presentacion_serie/)

[View all series](/en/series/){ .md-button }
