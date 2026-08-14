---
title: The real footprint of a data center
description: "Water, electricity, critical minerals and hardware lifecycle: what AI infrastructure actually consumes, why impacts vary by location, and which constraints space does or does not remove."
date: 2026-06-14
keywords: "data center water use, AI environmental footprint, PUE WUE data center, critical minerals AI, cobalt data center, GPU e-waste, circular economy data center"
tags:
  - AI
  - Infrastructure
  - Environment
---

# Chapter 4 — The real footprint of a data center

This chapter decomposes the footprint of hyperscale compute into four layers: **water, electricity, critical minerals and hardware lifecycle**. By the end, you will be able to calibrate common water-use claims, interpret WUE and PUE correctly, understand why AI rack density changes the physical plant, and see why mineral supply chains and refresh cycles matter even when a data center itself looks clean.

!!! info "Prerequisite"
    This chapter closes the series and builds on [Chapter 3 — What is a data center in space?](./03-que-es-datacenter-espacio.md).

The public discussion often over-focuses on one visible resource at a time. Water attracts headlines, electricity dominates grid planning, while the embodied footprint of accelerators and supply chains is easier to ignore. A serious comparison between terrestrial and orbital compute has to include all four.

---

## 1. Calibrating the water conversation

In the United States, data centers collectively withdraw roughly **449 million gallons of water per day** in one widely cited national comparison, while golf courses withdraw around **2 billion gallons per day**. Agriculture remains larger again by one or more orders of magnitude.

{{ include_html("snippets/datacenters-espacio/04-agua-comparativa.html") }}

That comparison does **not** mean data-center water use is irrelevant. It means the impact is primarily **geographic and technological**, not only national aggregate volume.

A facility in a water-stressed basin can create real conflict even if the sector is a small fraction of national withdrawals. Microsoft and other operators therefore increasingly publish site/region-specific water metrics because a litre consumed in Iowa is not environmentally equivalent to a litre consumed in an already constrained watershed.

---

## 2. Withdrawal, consumption and WUE

Water **withdrawal** is the total volume taken from a source. Water **consumption** is the fraction that is not immediately returned to the local cycle—often because it evaporates.

Evaporative cooling can lose roughly **70–80%** of withdrawn cooling water to the atmosphere, with the rest discharged as blowdown that may require treatment.

The industry metric is **WUE (Water Usage Effectiveness)**: litres of water consumed per kWh delivered to IT equipment.

Representative designs span more than an order of magnitude:

- dry-air systems can have near-zero **direct** WUE but higher electricity use;
- conventional evaporative systems can sit around **1.5–2.5 L/kWh**;
- Microsoft's published Iowa adiabatic design reports around **0.19 L/kWh**;
- closed-loop liquid/immersion designs can reduce direct evaporation dramatically.

{{ include_html("snippets/datacenters-espacio/04-wue-refrigeracion.html") }}

This is why “water per AI query” numbers are often misleading. The same compute workload can have radically different water use depending on the facility and climate.

{{ include_html("snippets/datacenters-espacio/04-agua-indirecta.html") }}

There is also **indirect water** in electricity generation and hardware supply chains. A site with zero direct evaporative cooling can still rely on a regional power mix with significant water intensity. Complete footprinting therefore has to distinguish direct operational use from upstream use.

---

## 3. Electricity: total demand vs facility efficiency

Global data-center electricity use was roughly **415 TWh in 2024**, with projections around **945 TWh by 2030** under strong growth assumptions—about 3% of global electricity consumption. In the United States, data centers could rise from roughly **4.4% of national electricity use in 2023** toward materially higher shares later in the decade as AI capacity expands.

{{ include_html("snippets/datacenters-espacio/04-sector-consumo.html") }}

### PUE is not total efficiency

**PUE (Power Usage Effectiveness)** is total facility power divided by power delivered to IT equipment.

- PUE 2.0: every watt of compute requires another watt of facility overhead.
- PUE 1.1: only roughly 0.1 W of overhead accompanies each watt delivered to IT.

Modern hyperscale facilities have pushed PUE much closer to 1.1 than old data centers did.

{{ include_html("snippets/datacenters-espacio/04-pue-trayectoria.html") }}

A falling PUE can coexist with rapidly rising total electricity use because the amount of IT compute is growing much faster than facility overhead is shrinking.

### AI changes rack density

Traditional server racks often operated around **5–15 kW**. Dense GPU systems moved into the 50–100 kW range. Nvidia's GB200 NVL72-class rack is around **120 kW** at full load.

{{ include_html("snippets/datacenters-espacio/04-energia-densidad.html") }}

At that density, liquid cooling is not a nice-to-have. Power distribution, piping, heat exchangers, floor/loading design and building layout all change. This helps explain why operators are building new AI-native facilities rather than simply filling every old data center with newer GPUs.

---

## 4. Critical minerals: the invisible infrastructure

Accelerators and data-center electrical systems depend on globally concentrated material supply chains.

{{ include_html("snippets/datacenters-espacio/04-minerales-cadena.html") }}

Examples include:

- ultra-pure silicon plus controlled dopants for semiconductors;
- copper and cobalt in advanced interconnects and electrical distribution;
- lithium, nickel, manganese and cobalt in UPS batteries;
- tantalum in capacitors;
- neodymium/dysprosium and other rare-earth materials in motors, drives and optical/networking components.

Rare-earth refining is highly concentrated in China, creating geopolitical supply risk even when mining occurs elsewhere.

### Cobalt is the clearest social-risk example

Roughly **three quarters of world cobalt mine production** comes from the Democratic Republic of Congo, while much of global refining is concentrated in China.

{{ include_html("snippets/datacenters-espacio/04-cobalto-cadena.html") }}

Research and human-rights reporting around Lualaba and other mining regions documents severe health, water-contamination and labour impacts. Industry programmes such as the Fair Cobalt Alliance attempt to improve protective equipment, mine safety and child-labour remediation, but the scale of artisanal mining is much larger than any single programme.

This is part of AI infrastructure even though it happens thousands of kilometres away from the data center.

---

## 5. Hardware life, refresh cycles and e-waste

A server may remain technically usable for many years, but operational refresh cycles are often around **three to five years** because warranties, efficiency and accelerator-generation gains make earlier replacement economically attractive.

That gap between technical life and economic life is a major driver of e-waste.

Large operators increasingly run circular centres that inspect, refurbish and redeploy components. Microsoft reported a **90.9% reuse/recycling rate for server components in 2024**, alongside thousands of tonnes diverted from landfill.

{{ include_html("snippets/datacenters-espacio/04-h100-recuperacion.html") }}

The circular-economy question is particularly important for AI accelerators because frontier hardware depreciates economically very quickly even when it still works. A retired H100-class GPU may still be valuable for inference, research or smaller workloads after it no longer belongs in the most performance-sensitive training cluster.

---

## 6. What space solves—and what it inherits

The orbital thesis looks different once the terrestrial footprint is separated into layers.

### Space can potentially reduce

**Local grid congestion.** Orbital solar power avoids a terrestrial transmission queue for the compute itself.

**Direct evaporative water use.** A vacuum radiator does not consume cooling water through evaporation.

**Land-use conflict.** The compute and solar/radiator structures are not competing for terrestrial industrial land.

### Space does not remove

**Energy demand.** The compute still needs the same order of electrical power.

**Heat rejection.** It becomes a radiator/mass problem instead of an evaporative-water problem.

**Critical minerals.** The same accelerators, power electronics and networking still require globally sourced materials—and orbital structures add more material.

**Hardware obsolescence and e-waste.** In orbit, replacement may be *harder*, and end-of-life disposal becomes an orbital-debris problem rather than ordinary recycling logistics.

**Embodied emissions.** Launch vehicles, spacecraft structure, solar arrays and radiators add manufacturing and launch footprints before any computation occurs.

The comparison is therefore not “dirty Earth vs clean space.” It is a **transfer of constraints**.

---

## 7. A lifecycle framework for any compute proposal

A useful footprint analysis should report at least:

1. **IT electricity** consumed over the service life;
2. **facility/orbital overhead** (PUE or its orbital equivalent);
3. **direct water** and upstream water intensity;
4. **embodied hardware/material footprint**;
5. **critical-mineral provenance**;
6. **refresh/replacement frequency**;
7. **transport or launch footprint**;
8. **end-of-life recovery or disposal**.

A proposal that optimizes one row can still be worse overall if it transfers cost into another.

!!! tip "Series complete"
    This closes the Data Centers in Space text/visual argument: terrestrial bottlenecks explain why the idea is being discussed; orbital physics determines what is hard; real hardware shows which use cases are already credible; and lifecycle accounting prevents the final comparison from becoming marketing.

---

## Frequently asked questions

**Is data-center water consumption globally huge?**  
It is meaningful but much smaller than agriculture in aggregate. The most serious impacts often come from local concentration in already water-stressed regions.

**What is the difference between WUE and PUE?**  
WUE measures water consumed per unit of IT energy. PUE measures total facility electricity divided by IT electricity. A facility can improve one while worsening the other.

**Why does AI force liquid cooling?**  
Because modern accelerator racks can exceed 100 kW. Air cooling struggles to remove that heat density efficiently within ordinary rack/building constraints.

**Why include minerals in the AI footprint?**  
Because accelerators, batteries, networking and electrical infrastructure depend on concentrated global supply chains with geopolitical, labour and environmental impacts.

**Does moving a data center to space eliminate its environmental footprint?**  
No. It can eliminate some local terrestrial constraints such as direct evaporative water use and grid connection, but it retains energy, materials and lifecycle costs while adding launch, radiation and orbital-disposal requirements.
