---
title: The real footprint of a data center
description: "Water, energy, minerals and data-center lifecycle: what AI consumes, why impact varies by location, and how to measure its footprint."
date: 2026-06-14
date_modified: 2026-08-23
keywords: "data center water consumption, AI environmental footprint, AI critical minerals, data center PUE, data center WUE, cobalt AI mining, GPU e-waste, golf vs data center water, local water conflict"
tags:
  - AI
  - Infrastructure
  - Environment
---

# Chapter 4 — The real footprint of a data center

This chapter breaks down the real footprint of a hyperscale data center across four dimensions: water, energy, critical minerals and lifecycle. It provides the data needed to calibrate the public debate—the aggregate comparison between golf courses and data centers, WUE by cooling technology and the cobalt supply chain—explains why water consumption is primarily a problem of geographic concentration rather than global magnitude, and shows which constraints space solves and which it inherits without any additional advantage.

!!! info "Prerequisites"
    This chapter assumes you know the concepts introduced in [Chapter 3 — What is a data center in space?](./03-que-es-datacenter-espacio.md).

The previous three chapters built the argument for why space has entered the compute-infrastructure debate: demand is growing faster than terrestrial infrastructure can absorb, and several bottlenecks have physical components that the orbital environment addresses differently. Before evaluating whether that rethink makes sense, it is worth understanding precisely what a terrestrial data center actually consumes, because public discussion is often poorly calibrated: it overstates water, understates minerals and almost always omits lifecycle.

---

## 1. The comparison that calibrates the conversation

In the United States, data centers collectively withdraw about 449 million gallons of water per day, while golf courses withdraw approximately 2 billion ([MOST][r3]). Both volumes are far below the national agricultural scale, which still dominates the aggregate by one or more orders of magnitude ([MOST][r3]).

{{ include_html("snippets/datacenters-espacio/04-agua-comparativa.html") }}

This comparison is not meant to end the debate about the environmental impact of data centers, but to calibrate it. The sector's water problem is real, but it is primarily local rather than national in aggregate: it depends heavily on local climate, cooling technology and whether the facility sits in an already stressed basin. Microsoft, for example, publishes WUE by region precisely because the water profile changes significantly by location and thermal architecture ([Microsoft Water][r1]).

The point is not that golf courses are the problem and data centers are not. It is that public discussion of data-center water use usually occurs without this context, making it difficult to separate concern proportional to the actual magnitude of consumption from other factors: the visibility of the sector, concentration in areas with pre-existing water stress or distrust associated with companies whose overall scale is large regardless of the specific environmental issue.

---

## 2. Water: withdrawal, consumption and the technology that determines it

The first distinction often omitted in discussions of data-center water is the difference between withdrawal and consumption. Withdrawal is the total volume taken from a source, whether an aquifer, river or municipal network. Consumption is the water actually lost to the atmosphere or incorporated into a product, so it cannot immediately be reused in the same local cycle. In a data center with evaporative cooling, the difference is large: of all the water withdrawn to pass through cooling towers, between 70 and 80 percent evaporates, while the rest is discharged as blowdown with mineral concentration and chemical treatments that require specific management before release.

The metric that quantifies this efficiency is WUE (Water Usage Effectiveness), defined as liters of water consumed per kilowatt-hour of energy delivered to compute equipment. An older air-cooled data center can have a WUE of zero because it simply uses no direct cooling water, although at the cost of higher electricity consumption. A conventional evaporative facility typically has a WUE between 1.5 and 2.5 liters per kWh ([arXiv][r6]). The strongest documented result cited here is Microsoft's Iowa design, which uses adiabatic cooling with outside air for most of the year and water only when ambient temperature rises above roughly 29 °C: its published WUE is 0.19 liters per kWh ([Microsoft Iowa][r4]).

{{ include_html("snippets/datacenters-espacio/04-wue-refrigeracion.html") }}

AI has added a new dimension to this debate that did not exist five years ago: consumption per transaction has become a visible number in public discussion. But those figures are comparable only when they normalize the same compute workload. If a facility delivers 1 MWh to AI equipment, a conventional evaporative data center may consume 1,500–2,500 liters of water, Microsoft's Iowa adiabatic design around 190 liters, and a closed-loop or immersion system almost zero direct evaporation. The order-of-magnitude difference comes from the facility WUE, not from mixing different queries or models ([Microsoft Iowa][r4], [arXiv][r6]).

{{ include_html("snippets/datacenters-espacio/04-agua-indirecta.html") }}

The industry is reducing its reliance on evaporation as the dominant cooling mechanism, not because operators have chosen the environment over cost, but because the heat density of latest-generation AI racks exceeds what air cooling can manage efficiently. That does not mean evaporation disappears tomorrow: many designs still use it as backup cooling when outside temperatures rise. But the shift favors more closed loops, immersion and other architectures in which water is used less as a consumable and more as part of a technical cycle.

---

## 3. Energy: the AI premium and what it implies

Global data-center electricity consumption was around 415 TWh in 2024 and is projected to rise to about 945 TWh in 2030, or roughly 3 percent of world electricity consumption ([FAS][r13]). In the United States, which holds approximately 45 percent of installed global capacity, the sector accounted for 4.4 percent of national demand in 2023 and could reach as much as 12 percent in 2028 ([FAS][r13]). Those numbers are large, but context matters: not all of that growth is inefficiency. Much of it is new demand that did not previously exist in the compute economy, because large language models at mass-use scale did not exist either.

{{ include_html("snippets/datacenters-espacio/04-sector-consumo.html") }}

The metric that measures the energy efficiency of the data center as a facility is PUE (Power Usage Effectiveness), defined as the ratio between total facility power, including cooling, electrical distribution and auxiliary systems, and the power that actually reaches compute equipment. A PUE of 2.0 means that for every watt delivered to compute equipment, another watt is consumed by support infrastructure, so half of facility power goes to overhead rather than compute. Previous-generation data centers often operated in that range. Modern hyperscale facilities are much closer to 1.1 than 2.0, so at hundreds-of-megawatts scale the reduction in infrastructure overhead is large even while total sector demand keeps growing.

{{ include_html("snippets/datacenters-espacio/04-pue-trayectoria.html") }}

What AI has changed is not primarily facility PUE, which hyperscale operators have continued to improve, but power density per rack. A conventional server rack consumed between 5 and 15 kW. The first GPU racks for AI inference were deployed in the 50–100 kW range. Nvidia's GB200 NVL72 rack, which connects 72 Blackwell GPUs in one compute fabric, is around 120 kW at full load, a jump that makes liquid cooling a practical operating requirement ([NVIDIA][r7]). No air system can handle 120 kW per rack inside a conventional hot-aisle/cold-aisle building.

{{ include_html("snippets/datacenters-espacio/04-energia-densidad.html") }}

This increase in rack density requires redesigning not only cooling systems but also electrical distribution, raised floors and the building structure itself. Data centers built for 10–20 kW per rack need substantial infrastructure upgrades to accommodate latest-generation AI hardware. That explains part of the new-construction frenzy and part of the difficulty of forecasting sector electricity demand: it is not merely more compute, but a physically different kind of compute. The [AI data-center capacity explorer](/en/tools/datacenter-ai-capacity/) lets you test which constraint dominates when total power, PUE, rack slots, rack power and cooling capacity interact.

---

## 4. Minerals: the part that does not make the headlines

Public debate about data centers focuses on water and energy because they are the resources with the most visible impact and the easiest to quantify in terms of local infrastructure. The minerals embedded in the hardware are less visible at the data-center site, but they carry some of the hardest risks to manage across the value chain: geopolitical risk, supply risk and social consequences in extraction regions.

An AI GPU rack is not only silicon. The ultrapure silicon substrate requires controlled impurities of boron, phosphorus or arsenic to define electrical properties. Interconnects between billions of transistors use copper as the main conductor and cobalt in advanced nodes to resist electromigration. Lithium-ion batteries in uninterruptible power supplies, which have replaced lead-acid batteries because of smaller size and longer life, contain nickel-manganese-cobalt cathodes. High-frequency capacitors use tantalum. Hard-drive motors and fiber-optic transceivers require permanent magnets made from neodymium and dysprosium, rare earths whose refining is 91 percent concentrated in China ([SFA][r8], [JPMorgan][r11]).

{{ include_html("snippets/datacenters-espacio/04-minerales-cadena.html") }}

Cobalt is the best-documented and most severe case. Approximately 74 percent of world production comes from the Democratic Republic of Congo, and about 67 percent of global refining takes place in China ([SFA][r8]). Research published in 2024 on extraction zones in Lualaba province identified what the authors describe as sacrifice zones: communities where pollution from industrial mining has reached levels that systematically affect local health. Surveys documented that 56 percent of women and girls in communities near five major mines reported reproductive and gynecological health problems, with elevated rates of miscarriage and malformation. Seventy-two percent of residents reported chronic skin diseases linked to contact with rivers classified as hyper-acidic because of sulfuric-acid discharges and mine-tailings failures ([RAID][r9]).

{{ include_html("snippets/datacenters-espacio/04-cobalto-cadena.html") }}

The technology industry has launched initiatives such as the Fair Cobalt Alliance, co-founded by Apple, Google and Microsoft, which in the first half of 2024 reported distributing protective equipment to artisanal washers, covering six mining pits to prevent collapses and enrolling 18 minors in remediation programs ([FCA][r14]). These initiatives have measurable impact, although the scale of the problem—with as many as 250,000 people linked to artisanal mining in Congo—is much larger than the reach of those programs ([FCA][r14]).

Tantalum has a different but similarly concentrated geopolitical profile: the United States imports 100 percent of its tantalum, most of it from Rwanda and Congo. Around 40 percent of copper supply comes from Chile and Peru; copper is used in data buses, heat sinks and building electrical distribution. The geography of mineral dependence in technology infrastructure is therefore global, concentrated and difficult to substitute in the short term ([JPMorgan][r11]).

---

## 5. Useful life, e-waste and the circular economy of GPUs

A server can remain technically usable for many years. In practice, the industry's usual refresh cycle is three to five years, driven by manufacturer warranties and the performance advantage of the next hardware generation, which for AI accelerators has been large enough to justify early replacement. The gap between technical service life and the actual refresh cycle is one of the determinants of the sector's electronic-waste volume.

Large operators have responded with circular centers: facilities dedicated to evaluating, refurbishing and redistributing hardware that has been retired from the primary data center but still has enough technical capacity for other uses. Microsoft reported in 2024 a 90.9 percent reuse and recycling rate for server components, processing packaging from more than 30,000 racks and diverting 2,500 metric tons of waste from landfill ([Microsoft][r12]). When hardware truly reaches end of life, recovering metals and reusable components adds a real economic incentive alongside the environmental argument.

{{ include_html("snippets/datacenters-espacio/04-h100-recuperacion.html") }}

At the scale of tens or hundreds of thousands of GPUs that make up modern AI clusters, these mechanisms are no longer marginal. An H100 that is no longer competitive for training frontier models can continue to have economic value for inference workloads for several years. A rack retired after four years is not necessarily electronic waste: it can be an asset that moves down the compute value chain before reaching recycling.

---

## 6. The real balance

When broken down by resource, the footprint of a modern data center is more nuanced than either extreme of the public debate suggests. Sector electricity consumption is set to almost double by 2030, dependence on minerals with ethically compromised supply chains is real and difficult to resolve in the short term, and concentration of facilities in water-stressed regions creates local tensions that do not disappear simply because the sector is small at national scale. But aggregate water consumption remains lower than other intensive uses, hyperscale operators have continuously improved energy efficiency, and hardware lifecycle management is improving.

The result is a clearer map of distinct problems. Water is primarily a problem of geographic concentration rather than global magnitude: the impact is greatest where water stress and facility density intersect, not in the national aggregate. Energy is a problem of growing scale that can be mitigated with carbon-free generation but not eliminated by efficiency alone. Minerals are the least visible and most structurally difficult problem because they depend on geographically concentrated supply chains that cannot be substituted quickly.

This inventory of constraints is the right starting point for evaluating the argument for data centers in space. The bottlenecks identified in Chapter 1 behave differently in orbit: direct solar energy without atmospheric losses removes grid dependence, vacuum makes cooling water unnecessary and heat is managed by radiation. Minerals, by contrast, have no orbital solution: any hardware taken into space carries exactly the same mineral footprint it has on Earth, plus additional material for radiators, solar panels and radiation protection. Space solves some problems of terrestrial infrastructure and inherits others without any additional advantage.

---

## Frequently asked questions

**Do data centers really consume a lot of water compared with other industries?**
In absolute terms, US data centers withdraw about 449 million gallons of water per day. Golf courses withdraw approximately 2 billion, about 4.5 times more, while agriculture still dominates the national aggregate by one or more orders of magnitude ([MOST][r3]). The main issue is concentration rather than national-scale volume: data centers are often built in already water-stressed areas because of favorable climate, creating local conflicts that the national figure alone does not capture.

**What is WUE and how much does it vary by cooling technology?**
WUE (Water Usage Effectiveness) measures liters of water consumed per kilowatt-hour delivered to compute. A data center with conventional evaporative cooling has a WUE of 1.5–2.5 liters per kWh ([arXiv][r6]). Microsoft's published Iowa design reports 0.19, with adiabatic cooling that uses water only when temperature rises above roughly 29 °C ([Microsoft Iowa][r4]). Dielectric-fluid immersion or closed-loop systems have WUE close to zero because water does not evaporate. The difference between conventional practice and the documented best result is more than a factor of ten.

**How much can water consumption change for the same compute workload depending on cooling?**
A great deal. WUE measures liters of water consumed per kilowatt-hour delivered to compute. For the same IT load, a conventional evaporative facility consumes 1.5–2.5 liters per kWh, the Microsoft Iowa adiabatic design 0.19, and a closed-loop or immersion system almost zero direct evaporation ([Microsoft Iowa][r4], [arXiv][r6]). For 1 MWh delivered to compute, that means 1,500–2,500 liters versus about 190 liters, or even less. The decisive variable here is facility cooling, not comparisons between models or queries that are not normalized.

**Which critical minerals are found in an AI GPU and where do they come from?**
The most relevant include cobalt (NMC battery cathodes and interconnects in advanced chip nodes), whose production is 74% concentrated in the DRC and 67% of refining in China; rare earths such as neodymium and dysprosium (hard-drive magnets and fiber transceivers), with 91% of refining in China; tantalum (high-frequency capacitors), of which the US imports 100%; and copper (interconnects, heat sinks and electrical distribution) ([SFA][r8], [JPMorgan][r11]). Cobalt has the best-documented human impacts: surveys in mining communities in Lualaba, DRC, found that 56% of women and girls reported reproductive health problems and 72% of residents reported skin disease associated with pollution ([RAID][r9]).

**What happens to GPUs and data-center hardware when they are retired?**
Large operators have adopted a circular-center model: they evaluate, refurbish and redistribute hardware retired from primary data centers before it reaches true end of life. Microsoft reported in 2024 a 90.9% reuse and recycling rate for server components ([Microsoft][r12]). When hardware can no longer be reused, recovery of metals and components adds a real economic incentive, so end of life is managed as a value chain rather than only a compliance cost.

---

## 7. References

<details markdown="1">
<summary><strong>Base sources</strong></summary>

| Key | Source | Brief description |
| --- | --- | --- |
| R1 | **Microsoft (2025)** — *Understanding water use at Microsoft datacenters* ([Microsoft Water][r1]) | How Microsoft contextualizes water by region and publishes WUE metrics by site. |
| R3 | **MOST Policy Initiative (2024)** — *Data Center Water Use* ([MOST][r3]) | Withdrawal vs consumption, US data centers at 449M gallons/day and aggregate context versus agriculture and other uses. |
| R4 | **Microsoft (Iowa factsheet)** — *Central US datacenter sustainability factsheet* ([Microsoft Iowa][r4]) | Published WUE of 0.19 and adiabatic cooling use in Iowa. |
| R6 | **arXiv (2025)** — *The Environmental Impact of AI Servers and Sustainable Solutions* ([arXiv][r6]) | AI-water projections for 2030: +200–300B gallons/year in the US and evaporative WUE of 1.5–2.5 L/kWh. |
| R7 | **NVIDIA (2026)** — *Mission Control FAQ for GB200/GB300 NVL72* ([NVIDIA][r7]) | GB200 NVL72: 72 GPUs, 18 nodes and ~120 kW per rack at full load. |
| R8 | **SFA Oxford (2024)** — *Critical Minerals in AI and Digital Technologies* ([SFA][r8]) | Cobalt, rare earths, tantalum and copper in semiconductors and batteries, with geopolitical dependencies. |
| R9 | **RAID UK (2024)** — *Environmental and Human Costs of DRC Cobalt Demand* ([RAID][r9]) | Sacrifice zones in Lualaba, 56% of women with reproductive problems, 72% skin disease and hyper-acidic rivers. |
| R11 | **J.P. Morgan (2024)** — *The Growing Demand for Critical Minerals* ([JPMorgan][r11]) | Demand projections for rare earths, cobalt and copper for digital infrastructure in 2025–2030. |
| R12 | **Microsoft (2025)** — *Environmental Sustainability Report 2025* ([Microsoft][r12]) | 90.9% reuse/recycling rate in FY24, 2,500 t of diverted waste and 30,000 racks processed. |
| R13 | **FAS / Federation of American Scientists (2025)** — *Measuring AI's Energy and Environmental Footprint* ([FAS][r13]) | Global data centers: 415 TWh (2024) → 945 TWh (2030), and US: 4.4% → up to 12% of national demand in 2028. |
| R14 | **Fair Cobalt Alliance (2024)** — *FCA Mid-Year Report 2024* ([FCA][r14]) | 250,000 people in artisanal mining, PPE distribution and 18 minors in remediation programs. |

</details>

[r1]: https://local.microsoft.com/blog/understanding-water-use-at-microsoft-datacenters/ "Understanding water use at Microsoft datacenters — Microsoft"
[r3]: https://mostpolicyinitiative.org/science-note/data-center-water-use/ "Data Center Water Use — MOST Policy Initiative"
[r4]: https://datacenters.microsoft.com/globe/pdfs/sustainability/factsheets/Iowa%20%28Central%20US%29.pdf "Iowa (Central US) factsheet — Microsoft"
[r6]: https://arxiv.org/html/2601.06063v1 "Environmental Impact of AI Servers — arXiv"
[r7]: https://docs.nvidia.com/mission-control/docs/systems-administration-guide/2.0.0/prs/faq.html "Mission Control FAQ for GB200/GB300 NVL72 — NVIDIA"
[r8]: https://www.sfa-oxford.com/knowledge-and-insights/critical-minerals-in-low-carbon-and-future-technologies/critical-minerals-in-artificial-intelligence/ "Critical Minerals in AI — SFA Oxford"
[r9]: https://raid-uk.org/report-environmental-pollution-human-costs-drc-cobalt-demand-industrial-mines-green-energy-evs-2024/ "DRC Cobalt Human Costs — RAID"
[r11]: https://www.jpmorgan.com/insights/global-research/commodities/critical-minerals "Critical Minerals Demand — J.P. Morgan"
[r12]: https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/msc/documents/presentations/CSR/2025-Microsoft-Environmental-Sustainability-Report.pdf "Environmental Sustainability Report — Microsoft"
[r13]: https://fas.org/publication/measuring-and-standardizing-ais-energy-footprint/ "AI Energy Footprint — FAS"
[r14]: https://faircobaltalliance.org/blog/fca-mid-year-report-2024/ "Fair Cobalt Alliance Mid-Year 2024 — FCA"