---
title: Energy, heat and connectivity in orbit
description: Why the cold of space does not mean free cooling, where the real advantage of orbital energy lies, and what limits the connection to Earth imposes.
date: 2026-06-14
keywords: "orbital data center cooling, Stefan-Boltzmann space, LEO orbital solar power, vacuum space radiators, LEO GEO satellite latency, GPU radiation degradation, satellite downlink bandwidth"
tags:
  - AI
  - Infrastructure
  - Energy
video: "02-energia-calor-conectividad.mp4"
video_duration: "PT52S"
---

# Chapter 2 — Energy, heat and connectivity

This chapter addresses the main misconception about orbital data centers: that the cold of space makes cooling free. By the end, you will understand why rejecting heat remains the major design problem, where the real advantage of orbital solar energy lies, and what limits the connection to Earth imposes.

!!! info "Prerequisites"
    This chapter assumes that you know the concepts introduced in [Chapter 1 — Why now](./01-por-que-ahora.md).

The previous chapter identified the real constraints on terrestrial infrastructure and why space has entered the discussion as an alternative for certain use cases. Before asking whether moving infrastructure off-world makes sense, one misleading intuition needs to be addressed: because space is cold, cooling servers there should be easy.

It is not. A cold environment is one thing; giving a system an effective way to get rid of the heat it produces is something entirely different.

---

## 1. Why the cold of space does not mean free cooling

On Earth, a data center can reject heat using moving air, chilled water and cooling towers. All of that already exists around the installation and works continuously, but in space there is no air or water waiting outside the equipment to carry that heat away.

That leaves only one option: reject it outward as thermal radiation. The system has to shed heat the way a very hot surface emits energy. This mechanism works, but it is much slower than moving air or water, and it also requires deploying enormous surfaces to handle high power levels ([NASA][r1], [LoadPath][r2]).

### The real scale of radiators

In a 2 MW installation operating at reasonable temperatures, each square metre of radiator rejects only around 500 W. That requires deploying almost 4,000 m² of radiator surface, roughly half a football pitch covered in panels designed only to reject heat, with the entire system also in *orbit* ([NASA][r1], [LoadPath][r2]).

Even before considering the exact mass of the system, the main problem in an orbital data center is clear: not powering the servers, but rejecting their heat without making the installation enormous.

{{ include_html("snippets/datacenters-espacio/02-radiadores-escala.html") }}

### Why in-orbit validation is still limited

What has been demonstrated reliably in orbit so far remains modest in scale: systems handling thousands of watts, not millions. That difference matters because moving from a powerful GPU or an experimental satellite to a multi-megawatt data center is not a linear step; it changes everything. It changes radiator size, total mass, system fragility and how difficult the installation is to keep stable ([NASA][r1], [LoadPath][r2], [Space Investments][r4]).

Starcloud did demonstrate in November 2025 that an Nvidia H100 GPU could operate in orbit using immersion in an insulating liquid and passive radiators. It is an important milestone, but it is still far from demonstrating that the same approach can support a vastly larger installation ([Starcloud][r3]).

Radiators also operate in a harsh environment. If they receive too much sunlight, they can absorb as much energy as—or more than—they are trying to reject. Because they are large, deployed surfaces, they are also more exposed to small debris and micrometeoroids that cannot even be tracked precisely ([NASA][r1], [LoadPath][r2], [NASA Orbital Debris][r10]).

{{ include_html("snippets/datacenters-espacio/02-calor-espacio.html") }}

---

## 2. Solar energy in orbit

The real advantage is in power generation, not cooling.

{{ include_html("snippets/datacenters-espacio/02-solar-orbita.html") }}

Outside the atmosphere, solar panels receive more radiation and receive it far more consistently. In the most favourable orbits they can spend almost all of their time in sunlight, something impossible for a terrestrial installation. As a result, with the same panel area, an orbital system can generate considerably more useful electricity over the course of a day ([Starcloud][r3]).

That does not make energy free. Supporting a multi-megawatt installation requires thousands of square metres of panels and tens of tonnes of additional hardware. The economics only begin to work if the cost of launching mass to space falls substantially and if the cooling system does not erase that advantage ([Starcloud][r3], [Space Investments][r4]).

Materials also degrade over time. Radiation and the space environment gradually damage coatings and other materials. With the right design, however, that wear appears controllable enough to project long service lives for the panels ([Starcloud][r3]).

---

## 3. Connectivity: link windows and bandwidth

Connectivity between an orbital installation and Earth has very concrete limits that do not appear in a terrestrial data center.

### Link windows

A satellite in low Earth orbit can communicate directly with a ground station for only a few minutes on each pass. Outside that interval, the connection is lost. According to data collected by a recent study across several operational constellations, those passes last between 120 and 600 seconds per orbit ([arXiv][r5]).

One way to reduce that limitation is to deploy constellations: many coordinated satellites instead of a single one. But that multiplies the number of launches, cost and complexity. The alternative is satellites that remain continuously above the same point on Earth. They solve continuity, but at the cost of greater communication delay, too high for many interactive applications ([Space Investments][r4]).

Low-Earth-orbit constellations improve this substantially and can reach latency ranges competitive for some services, although they still do not match terrestrial fibre in the most demanding cases ([Space Investments][r4]).

### How much data can be sent back to Earth

It also matters how much information can be downloaded to Earth. Radio links have limits in frequency, power and weather, and are also constrained by the regulatory framework for spectrum allocation ([ITU][r8]). Laser links greatly expand that capacity and are already part of the design of several recent projects ([Space Investments][r4], [Axiom][r9]).

But the principle does not change: if you process data in orbit and then cannot send the result back quickly enough, the practical value of the entire system falls. That is why processing in orbit makes sense when it dramatically reduces what has to be transmitted. The FOOL system shows that filtering data before downlink can substantially reduce the traffic required for Earth observation ([arXiv][r5]).

{{ include_html("snippets/datacenters-espacio/02-enlaces-ventanas.html") }}

---

## 4. Orbital degradation and maintenance

Terrestrial data centers can be repaired. If a component fails, a technician replaces it. If more capacity is needed, new equipment is added.

The International Space Station has demonstrated that maintenance in space is possible, but at enormous cost. For uncrewed commercial satellites, the reality is still that if something important fails, the usual outcome is to lose the equipment and launch another one ([Space Investments][r4]).

That forces designers to build in much more redundancy from day one and to accept that the hardware has a finite service life. Robotic repair services are still immature, and ordinary commercial chips degrade faster in orbit because of radiation. The most common estimates put their useful life at several years, not decades ([Space Investments][r4]).

Space radiation gradually damages memories and transistors and can cause sporadic errors. Today there are two main responses: use hardware designed to tolerate that environment better, or protect commercial chips with additional control and correction software. Both impose trade-offs: the first sacrifices performance, while the second adds complexity and power consumption ([Columbia][r6]).

{{ include_html("snippets/datacenters-espacio/02-radiacion-mantenimiento.html") }}

All of these requirements have direct design consequences:

- Redundancy must be provisioned from the start, because there is no easy way to expand it later.
- The system's useful life has to be treated as finite, with a clear removal plan at the end of the mission. Regulation also requires that this hardware not simply be left abandoned in orbit indefinitely ([NASA][r7]).
- The upgrade cycle is far more rigid than on Earth: the hardware you launch is, in practice, the hardware you keep.

The next chapter describes which projects already have real hardware in orbit processing real data, which use cases make economic sense today, and the spectrum between onboard processing on Earth-observation satellites and megaprojects with multi-decade ambitions.

---

## Frequently asked questions

**Why doesn't the cold of space make server cooling easier?**
Because in space there is no air or water around the system to carry heat away. The equipment can only reject it by radiating it outward, and that process is slow at normal operating temperatures ([NASA][r1], [LoadPath][r2]). That is why a 2 MW system needs close to 4,000 m² of radiators: the problem is not that the outside environment is cold, but that rejecting heat requires a great deal of surface area.

**How much radiator area does a 2 MW orbital data center need?**
Approximately 3,950 m² under the thermal assumptions used in this chapter ([NASA][r1], [LoadPath][r2]). That is comparable to half a football pitch devoted only to rejecting heat. The exact mass depends on the design, but the conclusion does not change: at megawatt scale, cooling dominates the problem long before compute does.

**What is the real advantage of space for data centers?**
The strongest advantage is in energy, not cooling. Solar panels in orbit can receive light much more consistently than on Earth, so the same panel area can generate more useful electricity. That advantage only pays off if launching all that hardware becomes much cheaper and if the thermal system does not end up cancelling the benefit.

**How much delay do low-Earth-orbit satellites add to interactive AI?**
Low-Earth-orbit constellations can deliver latency competitive with some interactive services, far below satellites that are much farther from Earth. Even so, they still trail terrestrial fibre in the most latency-sensitive cases. For conversational AI or some online services, that may be sufficient. For very strict real-time uses, it is not.

**How long does a commercial GPU last in orbit before radiation degradation becomes a problem?**
Ordinary commercial chips are not designed to withstand space radiation for long periods. Typical estimates put their useful life at several years before accumulated wear becomes a serious problem ([Space Investments][r4], [Columbia][r6]). The alternative is to use more resistant hardware or add extra layers of software protection, but both approaches make the system more expensive and more complex.

---

## 5. References

<details markdown="1">
<summary><strong>Base sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **NASA** — *Thermal Control — State of the Art for Small Satellites* ([NASA][r1]) | Physics of the space environment for orbital hardware and heat transfer in vacuum. |
| R2 | **LoadPath / AFRL (2018)** — *Thermal design considerations for future high-power small satellites* ([LoadPath][r2]) | Deployable radiators and practical dissipation limits in high-power satellites. |
| R3 | **Starcloud / Lumen Orbit (2024)** — *Why we should train AI in space* ([Starcloud][r3]) | Company white paper projecting orbital solar capacity and energy cost under optimistic assumptions. |
| R4 | **Space Investments (2025)** — *Orbital AI Datacenter Economics* ([Space Investments][r4]) | Comparative cost analysis of orbital and terrestrial installations, including LEO/GEO latency. |
| R5 | **Wang et al. / Columbia / JPL (2024)** — *FOOL: Addressing the Downlink Bottleneck* ([arXiv][r5]) | 80% downlink reduction through neural compression, plus link-window data. |
| R6 | **Wang / Columbia / JPL (2024)** — *Radshield: Software Radiation Protection* ([Columbia][r6]) | 720× improvement in SEFI immunity for commercial hardware using software protection. |
| R7 | **NASA SOA (2023)** — *Deorbit Systems* ([NASA][r7]) | 25-year orbital-lifetime regulation and decay time at different altitudes. |
| R8 | **ITU** — *Space Frequency Coordination* ([ITU][r8]) | Regulatory framework for satellite-communication frequencies. |
| R9 | **Axiom Space (2026)** — *Orbital Data Centers* ([Axiom][r9]) | ODC node specifications: 2.5 Gbps optical connectivity and Kepler compatibility. |
| R10 | **NASA Orbital Debris Program Office** — *Debris Protection* ([NASA Orbital Debris][r10]) | Operational risk from fragments and particles too small for routine tracking but still capable of damaging active spacecraft. |

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
