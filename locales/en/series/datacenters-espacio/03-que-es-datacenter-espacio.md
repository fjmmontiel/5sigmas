---
title: What is a data center in space?
description: What processing data in orbit really means, which use cases make sense today, resilient storage and megaprojects with decades-long horizons.
date: 2026-06-14
keywords: "orbital data center, satellite computing, in-orbit edge processing, space-computing maturity, Starcloud H100, Axiom Space ODC, D-Orbit AIX, Three-Body constellation, SpaceX orbital data center, digital flag state"
tags:
  - AI
  - Infrastructure
  - Space
---

# Chapter 3 — What is “a data center in space”?

This chapter explains what processing data in orbit means, which projects already have real hardware operating, and where the boundary lies between use cases that are viable today and those that remain speculative. It covers the projects with hardware in orbit in early 2026 (Starcloud, Axiom, D-Orbit, ADA Space), the difference between onboard processing and general-purpose computing, and a viability map for evaluating the megaproject argument.

!!! info "Prerequisites"
    This chapter assumes you know the concepts introduced in [Chapter 2 — Energy, heat and connectivity](./02-energia-calor-conectividad.md).

The previous two chapters established the context (why space is being discussed now) and the physics of the main problems (heat, energy, connectivity). This chapter moves the series toward its conclusion by answering the most direct question: what does it really mean to have a data center in orbit, what is it useful for today, and what do the most ambitious projects look like?

The short answer is that “data center in space” is not a single concept but a spectrum of possibilities with very different viability profiles, ranging from observation satellites with onboard processing (already existing and viable) to massive computing facilities in geostationary orbit (decades away, if ever).

{{ include_html("snippets/datacenters-espacio/03-casos-orbita.html") }}

---

## 1. What it means to process data in orbit

The most important distinction is between storing and processing in orbit the data generated there versus moving general-purpose computing from Earth into space.

### Processing observation data

Earth-observation satellites generate enormous amounts of data. A hyperspectral observation satellite can generate terabytes of data per day. Downlinking all of that information requires bandwidth that exceeds the available link capacity in many missions.

The natural solution is to process it on the satellite itself: instead of downlinking raw data, the satellite runs classification, change-detection or feature-extraction algorithms and transmits only the results (which can be orders of magnitude smaller than the raw data). This is often described as “data gravity”: the friction created by bringing massive datasets down to Earth before they can be processed.

{{ include_html("snippets/datacenters-espacio/03-procesar-donde-nace.html") }}

A concrete example: Fujitsu and Yamaguchi University announced in November 2025 an edge-computing technology for small SAR satellites capable of processing images almost in real time in less than ten minutes, even under power and radiation constraints ([Fujitsu / Yamaguchi][r1]). In parallel, D-Orbit already sells “space cloud” services to run applications and process data directly in orbit, and integrates that logic into operational observation programs such as IRIDE-NOX ([D-Orbit][r11]).

These systems operate at a scale of 100–500 W and perform inference only (not training). They are among the most mature use cases in the spectrum and represent the application where the advantage of orbital processing is clearest today: process data at its source so the full raw dataset does not have to be downlinked to Earth.

### General-purpose computing in orbit

Moving general-purpose computing into space (the equivalent of an AWS data center in orbit) is a different and much more speculative scenario. It does not solve any problem that cannot be solved more cheaply on Earth except in very specific cases: applications that require real-time access to satellite data with minimum latency, systems that need to operate in high-radiation environments for resilience reasons, or use cases where the jurisdiction of data in orbit has specific value.

That third case—data outside a single terrestrial jurisdiction—is sometimes raised in discussions of digital sovereignty and privacy. Recent legal debate focuses on that gap: how to interpret satellite jurisdiction, which obligations survive when data crosses multiple countries in orbit, and how far a maritime-like “flag” logic could go ([JURIST][r8], [UNOOSA][r12]). Today it remains a theoretical and regulatory debate, not an established legal framework.

---

## 2. Projects that already have hardware in orbit

Between theory and the speculative vision there is a middle ground that is often omitted in discussions of orbital data centers: projects that have already launched hardware into space and are processing real data. The situation in early 2026 is:

| Company | Hardware in orbit | Status |
| --- | --- | --- |
| **Starcloud** (formerly Lumen Orbit) | Satellite with Nvidia H100 | Operational since Nov. 2025 ([KPMG][r4]) |
| **Axiom Space** | AxDCU-1 (ISS) + 2 ODC nodes (LEO) | ISS prototype since autumn 2025, with initial ODC nodes since Jan. 2026 ([Axiom][r2], [ISS National Lab][r3]) |
| **D-Orbit** | In-orbit compute services / IRIDE-NOX | Operational in active missions ([D-Orbit][r11]) |
| **ADA Space (China)** | Three-Body Constellation (12 satellites) | Operational since May 2025 ([SpaceNews][r5]) |
| **Tiansuan / BUPT-1** | 1 cloud-native satellite | Operational since Jan. 2023 ([tiansuan.org.cn][r6]) |

{{ include_html("snippets/datacenters-espacio/03-proyectos-orbitales.html") }}

Of these, the most significant case for the debate about AI in space is Starcloud. In November 2025, the startup launched a satellite carrying an Nvidia H100 GPU. In December of the same year it announced the in-orbit training of a simplified NanoGPT-style model, plus Google Gemma running as an active inference model. It is a relevant technical milestone, but it remains a very small-scale demonstration compared with what an orbital cloud system comparable to terrestrial infrastructure would require ([KPMG][r4]).

Starcloud's next launch is scheduled for October 2026, with multiple H100s and the Nvidia Blackwell platform. The company's stated long-term vision is a 5 GW orbital data center with 4 km × 4 km solar-panel and radiator structures ([KPMG][r4]).

Axiom Space, meanwhile, launched the first two dedicated orbital data-center nodes in LEO on 11 January 2026, with 2.5 Gbps optical connectivity (compatible with Space Development Agency standards) and high-capacity Spacebilt storage hardware (122 TB Phison SSDs) ([Axiom][r2], [ISS National Lab][r3]). China has scaled faster: ADA Space's Three-Body constellation has twelve satellites launched in May 2025, each with 744 TOPS of compute, 30 TB of storage and 100 Gbps laser inter-satellite links, for a total of 5 petaflops according to the available industry reporting ([SpaceNews][r5]). The planned expansion is to 2,800 satellites targeting 1,000 petaflops ([SpaceNews][r5]).

---

## 3. Resilient storage and disaster recovery

One use case with a plausible orbital rationale is extremely resilient storage.

Terrestrial backup and disaster-recovery systems solve geographic resilience by keeping copies of data in locations far enough apart that a disaster affecting one region does not destroy every copy. Locations on different continents are the current standard.

Storage in orbit adds a different class of resilience: immunity to geophysical disasters, attacks on terrestrial infrastructure or geopolitical events that cut access to data centers on Earth. For historically important data, human genomics, civilization archives or critical assets whose loss would be irreversible, that kind of resilience can have enough value to justify the additional cost.

Lonestar Data Holdings is developing disaster-recovery-oriented storage in cislunar and lunar environments, a sign that this “extreme archive” thesis is already being commercialized beyond low Earth orbit ([Lonestar][r14]). Current projects in low Earth orbit remain modest in capacity (terabytes, not petabytes, although Spacebilt's 122 TB SSDs in AxDCU-1 mark a new threshold for unit capacity) and have access profiles with frequent writes and rare reads ([ISS National Lab][r3]). They are not fast-access systems but archives of last resort.

---

## 4. The consequences of operating in orbit

Beyond the physics described in the previous chapter, there are operational implications that any serious viability assessment must include.

**Upgrade cycles.** Terrestrial data centers continuously upgrade hardware: new GPU generations, more memory, better cooling systems. In orbit, the hardware that is launched is the hardware that operates until the end of the mission. Racks cannot be added, radiation-degraded chips cannot be replaced, and the system cannot be adapted to new AI models that require more memory or a different accelerator type. The useful life of satellites using Nvidia-class COTS chips is measured in years, not decades.

**Radiation tolerance.** Consumer chips are not designed to operate in the radiation environment of low Earth orbit or beyond. Radiation-tolerant chips exist but have significantly lower compute density than modern consumer chips. The alternative is software-protection approaches (Radshield, Fujitsu's “radiation armor”) that improve immunity to bit errors by up to 720 times under heavy-ion irradiation, but add compute overhead and system complexity ([KPMG][r4]).

**Operational autonomy.** An orbital data center must operate largely autonomously. Operators cannot physically access the system, so all management is remote and constrained by communication-link windows and bandwidth. Incident management in such a system is radically different from management on Earth.

**Regulatory framework.** The 1967 Outer Space Treaty establishes that objects in space are the responsibility of the state that launched them. Communication frequencies are regulated by the ITU. Deorbiting at end of life is an increasingly explicit requirement in national regulations: LEO satellites cannot be abandoned indefinitely, and the growth of Starlink, OneWeb and other constellations is intensifying the regulatory discussion around that end-of-life cycle.

---

## 5. Megaprojects: decades-long visions

Massive-scale projects exist at different stages of development, from pilots already in orbit to visions that depend on Starship becoming fully operational.

{{ include_html("snippets/datacenters-espacio/03-arquitectura-tether.html") }}

**SpaceX / Orbital Data Center System.** On 30 January 2026, SpaceX filed an application with the FCC to operate a constellation of up to one million satellites for orbital data processing, with projections of 100 GW of AI compute. The satellites would use Starlink V3 (which offers more than 1 Tbps per satellite through laser links) and carry ML accelerators onboard to preprocess data before transmission. The FCC accepted the application for public comment in February 2026, but the filing did not include a deployment schedule or detailed cost ([SpaceNews][r7], [FCC][r17]). The economic viability of this project depends on Starship reaching the projected launch cadence and costs.

**Google Project Suncatcher.** Google announced Project Suncatcher in November 2025 as a research moonshot to explore scalable ML in space, and Planet announced that it would build and operate the project's advanced platform. What has been announced so far is a research demonstrator for validating TPUs and optical links in orbit, with prototypes planned for 2027, not a committed roadmap for a commercial data center ([Google][r13], [Planet][r15]).

**Starcloud (5 GW).** The startup envisions a 5 GW orbital data center with 4 km × 4 km solar panels and radiators, which would generate more power than the largest power plant in the United States. Its roadmap includes a next launch with multiple H100s and the Blackwell platform in October 2026. It then proposes scaling gradually toward an orbital cloud offering ([KPMG][r4]).

**SBSP (Space-Based Solar Power).** Orbital solar-power projects that would transmit energy to Earth by microwave are technically different from data centers but share orbital-hardware infrastructure. ESA maintains SOLARIS as a study and maturation program for SBSP in Europe, while Space Solar argues that CASSIOPeiA could enable commercial deployments from 2030 if the technology and regulation mature ([ESA][r9], [Space Solar][r16]). If SBSP develops at scale, it could create orbital power-management infrastructure that shares components with massive orbital computing.

---

## 6. Does it make sense today?

The answer depends heavily on the use case, and the situation has changed since 2023 with the first real hardware milestones in orbit.

**Makes sense today, with hardware already in orbit:** onboard processing of observation-satellite data to reduce downlink (Fujitsu/Yamaguchi, D-Orbit IRIDE). First high-value orbital-storage trials (Axiom/Spacebilt). Technical demonstrations of high-end AI in orbit (Starcloud H100).

**Could make sense in 5–10 years:** orbital edge computing for communications constellations, where processing in the node itself reduces latency. Computing for space-exploration missions where communication latency with Earth is unacceptable. Orbital data centers at tens-of-megawatts scale if Starship reaches its projected costs.

**Still speculative within the foreseeable horizon:** general-purpose orbital data centers that compete economically with terrestrial facilities for general AI workloads. Google Suncatcher and SpaceX's million-satellite project belong to this category today, although both have intermediate milestones planned for 2026–2027.

> Space is not a short-term solution to the bottlenecks of terrestrial data centers. It is a niche direction with specific use cases where the unique properties of the orbital environment have enough value to justify the added cost. What changed in 2025–2026 is that this niche is no longer purely theoretical: real hardware is in orbit processing real data. The distance between today's niche and the massive infrastructure envisioned by the most ambitious projects remains enormous, and the physical problems of heat and mass have not disappeared. The starting point is now real hardware rather than paper studies.

The next chapter closes the series with an inventory of the resources consumed by terrestrial data centers: water, energy, critical minerals and lifecycle. That analysis is the right starting point for evaluating which constraints space solves and which it inherits without any added advantage.

---

## Frequently asked questions

**Which projects already have real computing hardware operating in orbit in 2026?**
Several prototypes and demonstrators are already operating. Starcloud launched a satellite with an Nvidia H100 GPU in November 2025 and announced the in-orbit training of a simplified NanoGPT-style model plus active inference with Google Gemma. Axiom Space launched AxDCU-1 to the ISS and two ODC nodes to LEO in January 2026 with 2.5 Gbps optical connectivity. The ADA Space Three-Body constellation has had 12 operational satellites since May 2025 with 5 petaflops total according to industry reporting. D-Orbit AIX runs object-detection models on operational satellites. Tiansuan/BUPT-1 has operated since January 2023 as the first documented cloud-native satellite in this series ([tiansuan.org.cn][r6]).

**What is the difference between onboard processing and general-purpose computing in orbit?**
Onboard processing is specialized inference inside the satellite itself: specific models run on the data that satellite generates to reduce what must be downlinked to Earth. It is the most mature case and the one with the strongest economic rationale. General-purpose computing in orbit is different and much more speculative: it would be equivalent to moving an AWS data center into space to serve arbitrary workloads from there. Today that solves no problem more cheaply than on Earth except in very specific cases.

**For which use cases does orbital computing make economic sense today?**
Three use cases have a credible case today: onboard processing of observation satellites to reduce downlink (D-Orbit AIX, IRIDE), high-value archival storage for extreme resilience (Spacebilt/Axiom's 122 TB SSDs mark the current threshold), and advanced-compute demonstrations to validate hardware and orbital operations. In 5–10 years, orbital edge computing for communications constellations and the first tens-of-megawatts data centers could be added if Starship reaches its projected costs.

**What is the “Digital Flag State” debate and why does it matter for data in space?**
The term summarizes a legal debate inspired by maritime law: applying a “flag” logic to the satellite under which the jurisdiction of the country of registration would dominate over data travelling in orbit. It is not a rule in force, but it matters because it reveals the underlying problem: data sovereignty and orbital jurisdiction do not fit neatly together today. If such a framework were ever formalized, it would add a digital-sovereignty argument to the economic viability of orbital computing.

**When could orbital data centers compete economically with terrestrial ones for general-purpose workloads?**
Probably not this decade for arbitrary workloads. Current launch costs make installing megawatts of compute in orbit several times more expensive than on Earth. For the economics to work, Starship would need to reach less than $200 per kilogram at high cadence, thermal-management systems would need to move from partial demonstrations to robust megawatt-scale operation, and hardware-refresh cycles would also need a workable solution for the workloads being served. The most optimistic projections place that crossover in the second half of the 2030s ([Space Investments][r10]).

---

## 7. References

<details markdown="1">
<summary><strong>Base sources</strong></summary>

| Key | Source | Brief description |
| --- | --- | --- |
| R1 | **Fujitsu / Yamaguchi University (2025)** — *Near-real-time image processing on small SAR satellites* ([Fujitsu / Yamaguchi][r1]) | Near-real-time SAR processing in less than ten minutes under power and radiation constraints. |
| R2 | **Axiom Space (2026)** — *Orbital Data Centers* ([Axiom][r2]) | AxDCU-1 on ISS in autumn 2025, with 2 ODC nodes launched in January 2026 and 2.5 Gbps optical connectivity. |
| R3 | **Spacebilt / Axiom (2026)** — *Axiom Space Orbital Data Center with Spacebilt* ([ISS National Lab][r3]) | High-capacity orbital storage hardware with 122 TB Phison SSDs and PIC64-HPSC. |
| R4 | **Starcloud / KPMG (2025)** — *KPMG Cosmos Q4 2025* ([KPMG][r4]) | Starcloud H100 in orbit, NanoGPT training, Gemma inference and 5 GW roadmap. |
| R5 | **SpaceNews (2025)** — *China launches first of 2,800 satellites for AI space computing constellation* ([SpaceNews][r5]) | 12 satellites in May 2025, 744 TOPS/satellite, 100 Gbps ISL and 5 petaflops total. |
| R6 | **Tiansuan (2023)** — *Satellite Computing: A Case Study of Cloud-Native Satellites* ([tiansuan.org.cn][r6]) | BUPT-1 operational since January 2023 with cloud-native architecture in orbit. |
| R7 | **SpaceNews (2026)** — *SpaceX files plans for million-satellite orbital data center constellation* ([SpaceNews][r7]) | SpaceX requests 1M satellites, 100 GW of compute and Starlink V3 >1 Tbps/satellite. |
| R8 | **JURIST (2026)** — *Orbital data centers and the legal vacuum threatening AI governance* ([JURIST][r8]) | Legal opinion column on the regulatory gap and data sovereignty in orbital infrastructure. |
| R9 | **ESA** — *SOLARIS / clean energy from space* ([ESA][r9]) | Status of the European space-based solar-power program as a feasibility and maturation initiative. |
| R10 | **Space Investments (2025)** — *Orbital Data Centers 2025-2030 Transition* ([Space Investments][r10]) | Orbital market: $1.78B in 2029, $39B in 2035 and technology-maturity table by subsystem. |
| R11 | **D-Orbit** — *Advanced Services / IRIDE-NOX* ([D-Orbit][r11]) | Space-cloud services and operational participation in Italy's IRIDE-NOX program. |
| R12 | **UNOOSA** — *Outer Space Treaty* ([UNOOSA][r12]) | Fundamental legal framework for activities in outer space. |
| R13 | **Google (2025)** — *Project Suncatcher* ([Google][r13]) | Research moonshot to explore scalable ML in space with TPUs and solar power, with prototypes planned for 2027. |
| R14 | **Lonestar (2025-2026)** — *Lunar data center / DRaaS* ([Lonestar][r14]) | Disaster-recovery-oriented storage in lunar and cislunar environments. |
| R15 | **Planet (2025)** — *Platform for Google Project Suncatcher* ([Planet][r15]) | Planet will build and operate the space platform for the Project Suncatcher demonstrator. |
| R16 | **Space Solar (2025)** — *CASSIOPeiA and commercial SBSP roadmap* ([Space Solar][r16]) | Space Solar's position on commercial CASSIOPeiA deployment from 2030. |
| R17 | **FCC (2026)** — *SpaceX NGSO orbital data center application accepted for filing* ([FCC][r17]) | FCC public notice accepting for comment SpaceX's application for an NGSO system of up to one million satellites. |

</details>

[r1]: https://www.yamaguchi-u.ac.jp/english/news/3112/index.html "Near-real-time image processing on small SAR satellites — Yamaguchi University / Fujitsu"
[r2]: https://www.axiomspace.com/orbital-data-center "Orbital Data Centers — Axiom Space"
[r3]: https://issnationallab.org/press-releases/orbital-data-center-launching-to-iss-to-advance-space-computing/ "Orbital Data Center Launching to ISS — ISS National Lab"
[r4]: https://kpmg.com/kpmg-us/content/dam/kpmg/pdf/2026/kpmg-cosmos-2025-q4-final.pdf "KPMG Cosmos Q4 2025"
[r5]: https://spacenews.com/china-launches-first-of-2800-satellites-for-ai-space-computing-constellation/ "China launches first of 2,800 satellites for AI space computing constellation — SpaceNews"
[r6]: http://www.tiansuan.org.cn/source/Satellite_Computing_A_Case_Study_of_Cloud-Native_Satellites.pdf "Cloud-Native Satellites — Tiansuan"
[r7]: https://spacenews.com/spacex-files-plans-for-million-satellite-orbital-data-center-constellation/ "SpaceX files plans for million-satellite orbital data center constellation — SpaceNews"
[r8]: https://www.jurist.org/commentary/2026/03/orbital-data-centers-and-the-legal-vacuum-threatening-ai-governance/ "Orbital data centers and the legal vacuum threatening AI governance — JURIST"
[r9]: https://www.esa.int/Space_in_Member_States/United_Kingdom/ESA_accelerates_the_race_towards_clean_energy_from_space "SOLARIS — ESA"
[r10]: https://www.spaceinvestments.io/information-communications/orbital-data-centers-technical-validation-and-strategic-positioning-in-the-2025-2030-transition-period "Orbital Data Centers 2025-2030 — Space Investments"
[r11]: https://dorbit.space/advanced-services/ "Advanced Services — D-Orbit"
[r12]: https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html "Outer Space Treaty — UNOOSA"
[r13]: https://blog.google/innovation-and-ai/technology/research/google-project-suncatcher/ "Project Suncatcher — Google"
[r14]: https://www.lonestarlunar.com/press-release/lunar-data-center-achieves-first-success-en-route-to-the-moon "Lunar data center — Lonestar"
[r15]: https://www.planet.com/pulse/planet-to-build-and-operate-advanced-space-platform-for-google-s-project-suncatcher-moonshot/ "Planet and Project Suncatcher — Planet"
[r16]: https://www.spacesolar.co.uk/space-solar-study-advances-commercial-space-based-solar-power/ "CASSIOPeiA commercial roadmap — Space Solar"
[r17]: https://docs.fcc.gov/public/attachments/DA-26-113A1.pdf "SpaceX NGSO orbital data center application accepted for filing — FCC"