---
title: What is a data center in space?
description: "What orbital data processing actually means, which projects have real hardware operating, where onboard edge computing is viable today and where megaprojects remain speculative."
date: 2026-06-14
keywords: "orbital data center, satellite compute, in-orbit edge computing, Starcloud H100, Axiom orbital data center, D-Orbit space cloud, ADA Space Three-Body, disaster recovery space"
tags:
  - AI
  - Infrastructure
  - Space
---

# Chapter 3 — What is “a data center in space”?

This chapter maps the spectrum hidden behind the phrase “orbital data center.” By the end, you will understand the difference between processing satellite-native data and moving general-purpose cloud computing into orbit, which projects had real hardware operating by early 2026, where resilient storage fits, and which multi-gigawatt visions remain dependent on future launch and thermal economics.

!!! info "Prerequisite"
    This chapter builds on [Chapter 2 — Energy, heat and connectivity](./02-energia-calor-conectividad.md).

“Data center in space” is not one architecture. It spans applications with very different maturity: onboard inference at hundreds of watts is already useful; a hyperscale orbital cloud is a radically different proposition.

{{ include_html("snippets/datacenters-espacio/03-casos-orbita.html") }}

---

## 1. Process data where it is born

Earth-observation satellites generate more raw data than many missions can economically downlink. Hyperspectral sensors, SAR and high-resolution imaging can produce terabytes per day.

The natural response is **onboard processing**: classify, detect changes, compress features or rank images before transmission, then downlink only the useful result.

{{ include_html("snippets/datacenters-espacio/03-procesar-donde-nace.html") }}

This is the most mature part of orbital computing because the workload and the data are already colocated.

Fujitsu and Yamaguchi University reported in late 2025 an edge-computing approach for small SAR satellites that can process imagery near-real-time under space power/radiation constraints. D-Orbit already sells in-orbit compute services and integrates them into operational Earth-observation programmes such as IRIDE-NOX.

These systems generally operate at **hundreds of watts** and focus on inference or data transformation rather than large-scale model training. Their economic logic is strong because compute reduces a scarce resource: downlink.

### General-purpose orbital cloud is different

Moving something comparable to an AWS region into orbit does not automatically solve a terrestrial problem more cheaply. Ordinary enterprise workloads originate on Earth, need terrestrial users and often require frequent hardware refresh.

A general-purpose orbital cloud only gains a distinctive advantage under specific conditions, for example:

- the input data originates in orbit,
- the workload needs very high resilience from terrestrial disruption,
- the service benefits from proximity to a satellite constellation,
- or a future legal/jurisdictional framework gives orbital data location special value.

The last point remains unsettled. Space law assigns responsibility and registration to launching states; it does not currently provide a simple “no terrestrial jurisdiction” cloud regime.

---

## 2. Real hardware in orbit by early 2026

The field is no longer purely conceptual.

| Project | Hardware / capability | Status by early 2026 |
| --- | --- | --- |
| **Starcloud** | Satellite carrying Nvidia H100-class compute | Operating since late 2025 |
| **Axiom Space** | AxDCU-1 prototype plus dedicated ODC nodes | ISS prototype and initial LEO nodes |
| **D-Orbit** | In-orbit application/processing services | Operating in active missions |
| **ADA Space / Three-Body** | 12-satellite compute constellation | Operating since May 2025 |
| **Tiansuan / BUPT-1** | Cloud-native experimental satellite | Operating since 2023 |

{{ include_html("snippets/datacenters-espacio/03-proyectos-orbitales.html") }}

### Starcloud

Starcloud launched an Nvidia H100 into orbit in November 2025 and subsequently reported both inference and a small NanoGPT-style training demonstration. The engineering significance is real: frontier commercial accelerators can operate in orbit with the right thermal and radiation architecture. It is still several orders of magnitude from a hyperscale data center.

The company's roadmap includes a follow-up platform with multiple accelerators and Blackwell-generation hardware, followed by a long-run vision of a roughly **5 GW orbital data center** with solar/radiator structures measured in kilometres. That long-run system is a company roadmap, not demonstrated infrastructure.

### Axiom

Axiom's initial ODC programme combines compute and high-capacity storage in LEO, including optical connectivity in the multi-gigabit range. The point is not only AI inference: storage, preprocessing and services for spacecraft/constellations are part of the product thesis.

### ADA Space / Three-Body

China's Three-Body constellation gives the best early example of scaling beyond one experimental satellite. Public reporting describes 12 satellites launched in May 2025, each with substantial onboard compute, tens of terabytes of storage and high-speed laser inter-satellite links. The planned constellation is far larger, but current operating hardware and future target scale must be kept separate.

---

## 3. Resilient storage and disaster recovery

Archival storage is another workload where orbital cost may buy a qualitatively different property rather than cheaper ordinary cloud storage.

A terrestrial disaster-recovery strategy uses geographic separation across regions/continents. Orbital or cislunar storage adds separation from terrestrial disasters, infrastructure attacks and some geopolitical disruptions.

This only makes sense for data whose loss is much more expensive than slow access: historical archives, critical scientific/genomic datasets, or deep-disaster-recovery copies.

Lonestar Data Holdings has been pursuing this thesis in cislunar/lunar environments. Early orbital storage systems are still modest compared with terrestrial cloud fleets, although 100+ TB solid-state storage nodes now demonstrate much higher unit capacity than the earliest experiments.

The correct analogy is therefore **deep archive**, not low-latency object storage.

---

## 4. Orbital operations change the data-center lifecycle

### Hardware refresh

A terrestrial facility can replace GPUs every generation. An orbital platform is largely frozen at launch. By the time the spacecraft reaches the end of a multi-year mission, terrestrial accelerators may be several generations ahead.

### Radiation tolerance

Commercial accelerators maximize compute density, not radiation tolerance. Space systems must choose between slower rad-hard components and COTS hardware protected with shielding, redundancy, ECC and software mitigation. Research systems such as Radshield show that software can substantially improve resilience, but at non-zero compute/power cost.

### Autonomous operations

Every fault has to be diagnosed remotely under intermittent or capacity-limited links. Automated failover, health monitoring and safe-state recovery are therefore part of the core architecture rather than an operational afterthought.

### End-of-life

Orbital debris constraints make deorbit/disposal part of the original design. A million-node compute constellation cannot simply treat failed hardware as abandoned infrastructure.

---

## 5. Megaprojects: hardware reality vs roadmap

{{ include_html("snippets/datacenters-espacio/03-arquitectura-tether.html") }}

### SpaceX orbital data-center constellation

SpaceX's January 2026 FCC filing proposes up to one million satellites and an eventual order-of-magnitude target around **100 GW** of AI compute. The concept would build on Starlink-class optical networking and future Starship launch economics. The filing is a regulatory proposal, not a deployed system or fully costed construction schedule.

### Google Project Suncatcher

Google announced Project Suncatcher in November 2025 as a research moonshot for scalable machine learning in space, with Planet involved in the future orbital platform. Public material describes experimental validation of TPU-class compute and optical links, with prototype activity targeted for later years—not a committed hyperscale commercial cloud.

### Starcloud 5 GW roadmap

Starcloud's 5 GW proposal is one of the clearest company visions for a true orbital hyperscale facility. Its feasibility depends on several unsolved scaling questions at once: launch cadence/cost, kilometre-scale thermal radiators, solar-array deployment, servicing and network architecture.

### Space-based solar power

Space-based solar power (SBSP) is not the same as orbital compute, but the two share large deployable structures, power management and launch economics. ESA's SOLARIS and commercial SBSP proposals therefore matter indirectly: progress in orbital power infrastructure could reduce one of the barriers to large compute platforms.

---

## 6. What makes sense today?

**Already viable:** onboard preprocessing/inference for satellite-native data, especially where downlink is the bottleneck.

**Early but real:** dedicated compute/storage nodes serving spacecraft, disaster-recovery experiments and frontier commercial-accelerator demonstrations.

**Potentially viable with lower launch cost:** larger constellation-level compute serving space-native workloads.

**Still speculative:** replacing a significant fraction of terrestrial hyperscale AI infrastructure with multi-gigawatt orbital facilities.

The line between these categories matters. A working H100 in orbit is evidence that one engineering component works; it is not evidence that a 5 GW cloud is economically or thermally solved.

!!! tip "Next chapter"
    [Chapter 4 — The real footprint of a data center →](./04-huella-real-datacenter.md) compares water, electricity, minerals and lifecycle impacts on Earth before asking which constraints space actually removes.

---

## Frequently asked questions

**What is the most mature form of orbital computing?**  
Onboard processing of satellite-native data. It reduces downlink and already operates in real missions.

**Does the Starcloud H100 prove hyperscale orbital AI is viable?**  
It proves a leading commercial accelerator can operate in orbit under a designed thermal/radiation system. Scaling that demonstration to megawatts or gigawatts introduces completely different mass, radiator, power and maintenance constraints.

**Why could orbital storage make sense despite high cost?**  
For deep disaster recovery, the value is physical/geographic separation from terrestrial failure modes, not low-cost everyday access.

**What is the biggest operational disadvantage compared with terrestrial cloud?**  
Hardware cannot be continuously replaced and serviced. Radiation, finite mission life and remote operations make every generation much more rigid.
