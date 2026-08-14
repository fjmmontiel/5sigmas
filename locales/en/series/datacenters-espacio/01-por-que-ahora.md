---
title: Why now — compute demand and terrestrial bottlenecks
description: "Why orbital computing is being discussed now: AI compute demand, terrestrial infrastructure constraints, launch economics and the cases where space changes the equation."
date: 2026-06-14
keywords: "orbital data center, space computing, AI infrastructure, launch cost, data center bottlenecks, AI compute demand, orbital solar power, satellite downlink"
tags:
  - AI
  - Infrastructure
  - Energy
---

# Chapter 1 — Why now

This chapter explains why orbital computing has moved from a recurring science-fiction idea into a serious infrastructure discussion. By the end, you will understand the pressure AI places on terrestrial power, cooling and siting; the six main bottlenecks constraining new data-center capacity; and why falling launch costs plus commercial space infrastructure make some orbital use cases worth analysing rather than dismissing automatically.

Three developments have converged: **compute demand is rising faster than many terrestrial infrastructure systems can expand, launch prices have fallen by orders of magnitude from the Shuttle era, and commercial launch/constellation capacity is now real rather than hypothetical.**

---

## 1. The compute-demand shock

Generative AI is the most visible driver, but not the only one. Frontier-model training, inference for hundreds of millions of users, scientific simulation, autonomous systems and satellite/sensor processing all require specialized high-density compute.

The IEA estimates that the compute used to train leading AI models increased by roughly **350,000× since 2014**. In its 2024 outlook, the IEA estimated that electricity use by data centers, AI and crypto could rise from about **460 TWh in 2022 to more than 1,000 TWh in 2026**. Its later AI-and-energy analysis puts a base case for data centers around **945 TWh in 2030**, with a high-adoption scenario above **1,260 TWh** ([IEA](https://www.iea.org/reports/energy-and-ai)).

The challenge is not only the total energy. AI loads are unusually concentrated. Modern GPU clusters need specialized accelerators, high-bandwidth networking and increasingly liquid cooling. Hyperscale campuses can seek grid connections in the hundreds of megawatts or even gigawatts, while rack densities of roughly **40–120 kW per cabinet** push beyond what conventional air cooling was designed to handle.

---

## 2. Six terrestrial bottlenecks

{{ include_html("snippets/datacenters-espacio/01-demanda-cuellos.html") }}

### Grid connection

The building can be constructed faster than the power system around it. Large operators increasingly cite multi-year connection queues; some utilities quote **four to ten years** for new capacity, and the IEA estimates that roughly **20% of planned global data-center capacity through 2030** is exposed to grid-delay risk.

### Water

A 100 MW hyperscale site can use around **two million litres of water per day** under water-intensive cooling designs, comparable with the domestic consumption of thousands of households. The impact is highly site-dependent: a litre consumed in a water-stressed basin is not equivalent to a litre in a water-abundant one.

### Land and planning

A gigawatt-scale campus requires large contiguous sites plus transmission, fibre and road access. The most attractive data-center regions already face scarcity, high land prices and political resistance.

### Permitting and associated infrastructure

Permitting can take months or years, and transmission upgrades often move more slowly than the data-center building itself. The bottleneck is therefore the complete infrastructure stack, not just construction.

### Heat

High-density AI racks turn thermal management into an engineering constraint. Liquid cooling improves heat removal but changes the building, distribution and maintenance architecture. Waste heat can sometimes be reused in district heating, but only where appropriate infrastructure and nearby demand exist.

### Latency and redundancy

Interactive applications still benefit from geographical proximity. Spreading compute across more regions helps latency and resilience, but increases operating complexity, replication costs and consistency challenges.

---

## 3. Why space changes some constraints

Space does not make the constraints disappear. It changes their physics and economics.

{{ include_html("snippets/datacenters-espacio/01-por-que-espacio.html") }}

The clearest potential advantage is **solar generation**. Outside the atmosphere, solar irradiance is around **1,361–1,367 W/m²**, and favourable sun-synchronous or dawn–dusk orbits can provide much higher solar capacity factors than terrestrial sites. Starcloud/Lumen Orbit has modelled **95–99%** availability in favourable orbit configurations. Those are company projections rather than observed market prices, and they still depend on launch, thermal-management and replacement assumptions.

The most immediately defensible orbital-compute case is different: **process satellite data where it is produced**. Earth-observation satellites can generate far more raw data than they can economically downlink. The 2024 FOOL work on neural feature compression showed bandwidth reductions up to roughly **80%** for common Earth-observation tasks by extracting useful features before transmission ([arXiv](https://arxiv.org/abs/2402.07355)).

That is a genuine form of data gravity: moving computation to the data can be cheaper than moving all the data to Earth first.

---

## 4. Launch cost is the economic inflection point

{{ include_html("snippets/datacenters-espacio/01-lanzamiento-inflection.html") }}

The Space Shuttle era cost on the order of **$88,000/kg** to low Earth orbit. Reusable commercial launchers have moved commonly cited ranges to roughly **$1,400–$2,500/kg**, depending on vehicle and mission. SpaceX's long-run Starship targets are much lower, but values such as **<$200/kg** in the 2030s—or the most aggressive $30/$10 scenarios—remain projections, not demonstrated operational prices.

In January 2026, SpaceX filed with the FCC for an orbital data-center constellation of up to **one million satellites**, with a stated potential scale of roughly **100 GW of AI compute**. The filing entered public-comment review, but did not provide a detailed deployment schedule or complete cost model.

On 4 February 2026, Elon Musk publicly predicted that the cheapest place to deploy AI could become space within roughly **30–36 months**. The thesis is straightforward: chip production and compute demand can scale faster than new terrestrial electricity generation and transmission, while orbital solar generation avoids local grid queues. It is an aggressive industry claim, not a settled economic result.

The key shift is therefore not that orbital infrastructure is already cheaper. It is that falling launch prices have narrowed the gap enough that **some workload-specific comparisons are no longer trivially negative**.

---

## 5. What to carry into the rest of the series

A serious orbital-data-center analysis should separate four questions:

1. **Where does the data originate?** Satellite-native data favours orbital processing more than ordinary web traffic.
2. **How power-dense is the workload?** Power and heat scale with actual compute, not with the marketing label “AI.”
3. **How much mass has to be launched and replaced?** Launch economics dominate many scenarios.
4. **What must return to Earth?** Downlink can erase the benefit if the workload still requires moving huge volumes of information back to terrestrial users.

!!! tip "Next chapter"
    [Chapter 2 — Energy, heat and connectivity →](./02-energia-calor-conectividad.md) explains why “space is cold” does **not** mean free cooling, and why thermal radiation becomes the defining engineering constraint.

---

## Frequently asked questions

**What are the six major terrestrial bottlenecks?**  
Grid connection, water, land/planning, permitting, heat removal, and latency/redundancy trade-offs.

**Why is satellite data processing the strongest orbital-compute case today?**  
Because the data is already in orbit and downlink bandwidth is scarce. Processing onboard can reduce what has to be transmitted to Earth.

**Has launch cost already fallen enough for orbital hyperscale compute to beat terrestrial data centers?**  
Not generally. Current reusable-launch economics are still expensive for megawatt-scale hardware. The debate becomes interesting only under specific workloads or much lower future launch costs.

**Is near-continuous orbital solar power the same as cheap compute?**  
No. Generation is only one part of the system. Radiators, launch mass, replacement cycles, networking and operations can consume the advantage.
