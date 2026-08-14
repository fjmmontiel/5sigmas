---
title: Energy, heat and connectivity in orbit
description: "Why cold space does not provide free cooling, where orbital solar power has a real advantage, and what connectivity, radiation and maintenance constrain."
date: 2026-06-14
keywords: "orbital data center cooling, Stefan Boltzmann space radiator, LEO solar power, orbital thermal management, satellite latency, radiation GPU, downlink bandwidth"
tags:
  - AI
  - Infrastructure
  - Energy
---

# Chapter 2 — Energy, heat and connectivity

This chapter dismantles the most common misconception about orbital data centers: **space is cold, therefore servers should be easy to cool.** By the end, you will understand why heat rejection is one of the hardest parts of the architecture, why solar generation is a more credible orbital advantage, and how link windows, downlink capacity, radiation and maintenance shape the system.

!!! info "Prerequisite"
    This chapter assumes the context from [Chapter 1 — Why now](./01-por-que-ahora.md).

A cold environment is not the same as an efficient heat sink. On Earth, a data center can move heat into air or water. In vacuum, there is no surrounding fluid to carry the heat away. The system must **radiate** it.

---

## 1. Heat rejection in vacuum

Thermal radiation follows the Stefan–Boltzmann relationship: radiated power rises strongly with surface temperature and emitting area. At server-compatible temperatures, that means a surprisingly small amount of heat per square metre compared with pumped liquid or evaporative cooling on Earth.

For a roughly **2 MW** orbital installation operating at reasonable radiator temperatures, a representative design point is around **500 W/m²**, implying close to **4,000 m² of radiator area**—roughly half a football pitch dedicated only to heat rejection ([NASA SmallSat thermal control](https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/)).

{{ include_html("snippets/datacenters-espacio/02-radiadores-escala.html") }}

That surface must itself be launched, unfolded, oriented and protected. Radiators can absorb solar energy if they face the wrong direction, and their large exposed area increases vulnerability to small debris and micrometeoroids.

The strongest in-orbit demonstrations are still many orders of magnitude below megawatt-class data centers. Starcloud demonstrated operation of an Nvidia H100 in orbit in late 2025 using dielectric liquid immersion and passive radiators. That is a meaningful engineering milestone, but it does not prove that a multi-megawatt thermal architecture scales linearly.

{{ include_html("snippets/datacenters-espacio/02-calor-espacio.html") }}

The important inversion is:

> **In orbit, powering the compute may become easier than rejecting the compute's heat.**

---

## 2. Orbital solar generation

{{ include_html("snippets/datacenters-espacio/02-solar-orbita.html") }}

Outside the atmosphere, solar panels receive stronger and more regular irradiance than terrestrial arrays. In favourable orbits, eclipse periods can be short enough to give very high capacity factors.

That improves **energy availability per square metre**, but does not make power free. A multi-megawatt installation still needs thousands of square metres of arrays plus power conditioning, storage for eclipse periods, structure and redundancy. All of that mass has to reach orbit and survive there.

Radiation also degrades solar cells, coatings and electronics over time. Space systems are designed around expected degradation curves, but a realistic economic model must include declining output and finite replacement cycles.

The orbital-energy thesis therefore depends on three numbers together:

1. solar capacity factor,
2. launched mass per delivered watt,
3. lifetime before replacement.

Ignoring any one of them produces an artificially optimistic result.

---

## 3. Connectivity: link windows, latency and bandwidth

A low-Earth-orbit satellite only sees a given ground station during part of each orbit. Recent constellation measurements report direct passes commonly lasting roughly **120–600 seconds**.

{{ include_html("snippets/datacenters-espacio/02-enlaces-ventanas.html") }}

Constellations mitigate this by handing traffic between satellites and stations. The trade-off is more hardware, more launches and more routing complexity. Geostationary systems offer continuous visibility but much higher propagation delay; LEO systems reduce latency substantially but still face orbital geometry and handovers.

For many services, modern LEO latency can be competitive. For the most delay-sensitive real-time workloads, terrestrial fibre remains difficult to beat because the user, network and compute can all remain geographically close.

### Downlink is a separate constraint

Radio links are limited by spectrum, power, weather and regulation. Optical links can provide much higher capacity; Axiom's early ODC nodes, for example, target multi-gigabit optical connectivity.

But the architectural principle is unchanged:

> **Orbital computing works best when processing reduces the amount of information that has to cross the Earth–space link.**

That is why satellite inference, feature extraction and filtering make more immediate sense than moving a general-purpose cloud workload to orbit and then sending most of its inputs and outputs across the same constrained link.

---

## 4. Radiation and maintenance

Terrestrial data centers are designed around replaceable components. Fans, drives, power supplies, accelerators and networking can be swapped. Capacity can be upgraded continuously.

Orbital systems cannot assume that operating model.

Commercial off-the-shelf chips face radiation-induced bit errors, latch-ups and long-term degradation. The two main strategies are:

- **radiation-tolerant hardware**, which sacrifices some leading-edge compute density for robustness;
- **COTS hardware plus protection**, using shielding, redundancy, error correction and software techniques such as Radshield.

{{ include_html("snippets/datacenters-espacio/02-radiacion-mantenimiento.html") }}

Neither is free. Radiation-hardened electronics can lag frontier accelerators substantially; protection layers add mass, power and complexity.

The operational consequences are significant:

- redundancy must be designed in before launch;
- the hardware generation is largely fixed for the mission;
- autonomous fault detection and recovery matter more;
- failed hardware may be cheaper to replace with a new launch than service directly;
- end-of-life deorbit planning is part of the system from day one.

Robotic servicing may improve the equation over time, but it is not yet equivalent to terrestrial maintenance.

---

## 5. The four equations behind orbital feasibility

A useful mental model is to evaluate any proposal against four coupled budgets:

**Power budget** — how many watts can be generated and stored continuously?

**Thermal budget** — how many watts of waste heat can be radiated at the chosen operating temperature?

**Link budget** — how much useful information can move between orbit, other satellites and Earth at acceptable latency?

**Lifetime budget** — how quickly radiation, debris exposure and hardware obsolescence degrade the asset relative to launch/replacement cost?

A proposal that solves only the first budget is not an orbital data center; it is a solar-power concept with unresolved compute infrastructure.

!!! tip "Next chapter"
    [Chapter 3 — What is a data center in space? →](./03-que-es-datacenter-espacio.md) maps the spectrum from already viable onboard processing to real 2025–2026 orbital hardware and decade-scale megaprojects.

---

## Frequently asked questions

**Why doesn't the cold of space cool servers automatically?**  
Because vacuum has almost no matter to conduct or convect heat away. The system must emit its waste heat as thermal radiation, which requires large radiator surfaces at ordinary electronics temperatures.

**Why is solar energy a more convincing orbital advantage than cooling?**  
Favourable orbits can provide much more continuous solar exposure than terrestrial sites. Cooling still requires large launched radiators, so the two effects do not cancel automatically.

**Can LEO connectivity support interactive AI?**  
For some applications, yes. LEO propagation delay is much lower than GEO. But orbital handovers, ground-station geometry and downlink capacity remain constraints, and very latency-sensitive services still favour nearby terrestrial compute.

**What is the main maintenance problem?**  
The inability to replace and upgrade hardware continuously. Orbital compute must carry more redundancy and accept a more rigid hardware lifecycle than terrestrial data centers.
