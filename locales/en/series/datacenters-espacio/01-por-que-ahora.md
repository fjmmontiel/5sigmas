---
title: Why now — compute demand and terrestrial bottlenecks
description: Why orbital computing is being discussed now. The pressure AI compute demand places on terrestrial infrastructure and the limits that make space relevant.
date: 2026-06-14
keywords: "orbital data center, space computing, AI infrastructure, rocket launch cost, data center bottlenecks, Starship cost per kilogram, SpaceX FCC, AI compute demand, data center water stress"
tags:
  - AI
  - Infrastructure
  - Energy
---

# Chapter 1 — Why now

This chapter describes the pressure AI compute demand places on terrestrial infrastructure and the six bottlenecks that limit the expansion of data centers on Earth. By the end, you will understand what has brought space into the discussion as an alternative for certain use cases.

The idea of putting computing infrastructure in space is not new. What is new is that three factors have now converged to make the idea more plausible: compute demand is growing faster than terrestrial infrastructure can absorb it, launch costs have fallen by orders of magnitude over the last decade, and the commercial space industry now has real capacity to deploy infrastructure in orbit.

---

## 1. The explosion in compute demand

Generative AI has been the most visible catalyst for accelerating compute demand, but it is not the only one. Training large models, inference at scale for hundreds of millions of users, processing sensor and satellite data, scientific simulation and autonomous-vehicle systems all require intensive, specialized computing.

The amount of compute used to train frontier models has increased roughly *350,000* times since 2014, according to the International Energy Agency ([IEA][r1]). In parallel, the IEA estimated in 2024 that the combined electricity consumption of data centers, AI and cryptocurrencies could rise from 460 TWh in 2022 to more than 1,000 TWh in 2026, a scale comparable to Japan's total electricity consumption ([IEA][r2]). In its later report on energy and AI, the base-case forecast for data centers reaches 945 TWh by 2030 if efficiency factors behave as expected, and could exceed 1,260 TWh if AI adoption accelerates more than anticipated ([IEA][r1]).

The distinctive feature of this demand is its concentration. AI GPU racks are not millions of users browsing the internet, whose load can be distributed geographically. They are workloads that require specialized hardware, intensive active cooling and high-speed connectivity, and that benefit from being concentrated in locations with access to cheap energy, available land and favourable climate conditions. A modern hyperscale data center can require a grid connection from 100 MW to several gigawatts, with rack densities reaching 40–120 kW per cabinet, a range where air cooling is no longer sufficient ([Greenpeace][r3]).

---

## 2. Terrestrial bottlenecks

Building more data centers on Earth is not infinitely scalable. Six main problems slow the expansion of terrestrial infrastructure, and unlike analyses from five years ago, there are now concrete figures for each of them.

{{ include_html("snippets/datacenters-espacio/01-demanda-cuellos.html") }}

### Power grid

Large-scale data centers consume power at rates that local grids cannot always absorb. Google reported in January 2026 that grid-connection lead times had become its biggest operational constraint: some utilities cite waiting times of four to ten years, and at least one told the company that the interconnection study process alone would take twelve years ([Network World][r4]). According to the IEA's analysis, around 20% of global data-center capacity planned through 2030 is at risk of delay because of grid congestion ([IEA][r1]).

### Water for cooling

A 100 MW hyperscale data center consumes around two million litres of water per day, equivalent to the domestic consumption of roughly 6,500 families ([GOV.UK][r5]). Globally, the sector currently consumes around 560 billion litres per year, and that figure could reach 1.2 trillion litres in 2030 ([GOV.UK][r5]). In water-stressed areas—which include many locations attractive for their climate or land costs—this consumption creates real conflicts with agriculture, household use and environmental regulation.

### Land and planning

A 1,000 MW data center can occupy several square kilometres. In the regions with the highest demand—Northern Virginia, Silicon Valley and Europe's FLAP-D corridor: Frankfurt, London, Amsterdam, Paris and Dublin—available land with access to power infrastructure, fibre connectivity and reasonable climate conditions is scarce and expensive. The NIMBY (not in my backyard) effect adds political friction in dense areas.

### Permitting and regulation

Obtaining permits for a new data center can take from many months to several years. In the European Union, the requirements of the Energy Efficiency Directive add another layer. In addition, the associated electricity-transmission infrastructure usually advances more slowly than the building itself, so the bottleneck is not only the data center but everything that must be connected around it.

### Heat as an externality

Waste heat from data centers is an externality that is difficult to manage. The rack densities required by modern AI (40–120 kW) already demand liquid cooling, which is more efficient but also more expensive to install and maintain. In dense areas, that heat contributes to the urban heat-island effect. Some operators are exploring waste-heat recovery for district-heating systems, but these solutions depend on proximity to suitable urban infrastructure.

### Latency and redundancy

For applications that require low latency, geographic proximity to the user matters. A data center that adds too many tens of milliseconds of delay falls outside the threshold for many real-time applications. Distributing compute geographically addresses latency but multiplies management costs and can create data inconsistencies across regions.

---

## 3. Why space enters the discussion

None of these constraints disappears in space. But some change in ways that could make orbital infrastructure advantageous for certain workloads.

The most obvious premise is solar energy: in orbit, solar panels receive irradiance of 1,361–1,367 W/m² without atmospheric absorption and, in the most favourable orbits, with much more continuous exposure than on Earth. In dawn–dusk sun-synchronous orbits, the corporate Starcloud/Lumen Orbit white paper projects capacity factors of 95–99%, versus 15–25% for terrestrial installations ([Starcloud][r10]). Under the same launch, amortization and operating assumptions, that document estimates an equivalent energy cost of around $0.002 per kWh. This is an industry projection, not an observed market price ([Starcloud][r10]).

Popular explanations often point to the cold of space as a cooling advantage. The physics is more complicated than that, and it is the subject of the next chapter.

{{ include_html("snippets/datacenters-espacio/01-por-que-espacio.html") }}

A genuine potential advantage appears in workloads that process satellite data in orbit: processing on the satellite itself or in nearby orbital infrastructure can drastically reduce the volume of data that must be sent down to Earth (downlink), one of the most constrained resources in the satellite pipeline. The 2024 FOOL paper (*Addressing the Downlink Bottleneck in Satellite Computing*) shows that neural feature compression can reduce the required bandwidth by up to 80% without losing information relevant to common Earth-observation tasks ([arXiv][r8]).

---

## 4. The launch-cost inflection point

The cost of launching to space has fallen dramatically. Launching one kilogram to low Earth orbit cost $88,000 with the Space Shuttle. Today, commonly cited ranges for reusable commercial launchers are around $1,400–$2,500 per kilogram, depending on the vehicle and mission ([Space Investments][r9]). For Starship, SpaceX projects getting below $200 per kilogram by the middle of the 2030s, with more optimistic estimates discussing $30 or even $10 per kilogram under full-reusability scenarios ([Space Investments][r9]).

{{ include_html("snippets/datacenters-espacio/01-lanzamiento-inflection.html") }}

On 4 February 2026, Elon Musk made his most explicit statement to date about the role of space in AI infrastructure: "My prediction is that within 36 months, or perhaps 30, the cheapest place to deploy AI will be space" ([YouTube][r7]). The central argument is that, outside China, global electricity production has remained practically flat while chip production grows exponentially, and that building new terrestrial generation takes longer than the pace of AI adoption allows. Under this thesis, space addresses the energy bottleneck by accessing solar power without grid constraints.

One week earlier, on 30 January 2026, SpaceX had filed an application with the FCC to operate a constellation of up to one million satellites for orbital data centers, with a potential 100 GW of AI compute. The FCC accepted the application for public comment in February of the same year, but the filing included neither a deployment schedule nor a detailed cost estimate ([SpaceNews][r6]).

That does not mean launch costs have stopped being a barrier. Falcon 9 still costs between $1,500 and $2,500 per kilogram, making a megawatt-scale computing installation several times more expensive in space than on Earth even before thermal-management systems are counted ([Space Investments][r9]). But the gap has narrowed to the point where, for certain very specific workloads, the economic analysis is no longer trivially negative for the orbital option.

The next chapter examines exactly what it physically means to have computing in orbit: energy, heat, connectivity and the myths surrounding each of these dimensions.

---

## Frequently asked questions

**What are the main bottlenecks slowing the expansion of terrestrial data centers?**
There are six recurring bottlenecks. The power grid: some operators already report waits of several years for new capacity ([Network World][r4]). Water: a 100 MW center can consume around two million litres per day under some cooling designs ([GOV.UK][r5]). Land and permits: the largest campuses occupy extensive areas and need slow approval processes, especially when they also require new transmission infrastructure ([Greenpeace][r3]). Heat: rack densities associated with AI are already pushing air cooling to its limits ([Greenpeace][r3]). And latency: applications sensitive to response time still require physical proximity to the end user.

**How much has the cost of launching to space fallen over recent decades?**
From tens of thousands of dollars per kilogram in the Space Shuttle era to ranges around $1,400–$2,500 with today's reusable launchers ([Space Investments][r9]). Starship aims to reduce that cost further in the 2030s, but those figures remain projections rather than observed operational prices. That decline of more than one order of magnitude is what makes the economics of orbital data centers no longer trivially negative for certain use cases, even though the cost remains several times higher than equivalent terrestrial infrastructure.

**What did Elon Musk argue about space as AI infrastructure?**
On 4 February 2026 he said that, within 30–36 months, the cheapest place to deploy AI would be space ([YouTube][r7]). His thesis is that new electricity demand from AI is growing faster than the ability to build generation and grid infrastructure on Earth, while orbit can access nearly continuous solar power. One week earlier, SpaceX had filed with the FCC for a constellation of up to one million satellites for orbital computing, although that filing included neither a deployment schedule nor a detailed cost estimate ([SpaceNews][r6]).

**What unique advantage does space have over terrestrial infrastructure for AI?**
The strongest advantage is energy: in the most favourable orbits, solar panels can receive light almost continuously apart from brief eclipses, something impossible on Earth ([Starcloud][r10]). For certain use cases, orbital computing also reduces the downlink bottleneck: processing on the satellite and sending down only results can substantially reduce the bandwidth required ([arXiv][r8]). The caveat is important: the energy advantage is only potential, and launch and thermal-management costs can erase it.

**What is the FOOL paper and what does it propose for the satellite downlink bottleneck?**
FOOL (*Addressing the Downlink Bottleneck in Satellite Computing with Neural Feature Compression*, 2024) proposes using neural feature compression directly onboard the satellite: instead of downlinking raw Earth-observation data, the satellite runs a neural network that extracts the relevant features and transmits only those, which can be orders of magnitude smaller. The authors show reductions of up to 80% in the bandwidth needed for common observation tasks, reinforcing the idea that onboard processing is currently the orbital use case with the strongest practical justification ([arXiv][r8]).

---

## 5. References

<details markdown="1">
<summary><strong>Base sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **IEA (2025)** — *Energy and AI* ([IEA][r1]) | AI energy-consumption projections (350,000× compute growth, TWh projections). |
| R2 | **IEA (2024)** — *Electricity 2024: Analysis and Forecast to 2026* ([IEA][r2]) | Data-center electricity-consumption data for 2022–2026. |
| R3 | **Greenpeace (2025)** — *Umweltauswirkungen KI* ([Greenpeace][r3]) | Environmental impact of AI data centers, rack densities and land footprint. |
| R4 | **Google / Network World (2026)** — *Grid connection delays as biggest threat* ([Network World][r4]) | Google's statements on 4–12 year electricity-interconnection lead times. |
| R5 | **UK Government (2025)** — *Water use in AI and Data Centres* ([GOV.UK][r5]) | Water use per MW of data-center capacity and global 2030 projections. |
| R6 | **SpaceNews (2026)** — *SpaceX files plans for million-satellite orbital data center constellation* ([SpaceNews][r6]) | FCC filing for a constellation of up to one million orbital-computing satellites. |
| R7 | **Musk (2026)** — *In 36 months, cheapest place for AI will be space* ([YouTube][r7]) | 4 February 2026 interview containing the claim about space as AI infrastructure. |
| R8 | **Wang et al. (2024)** — *FOOL: Addressing the Downlink Bottleneck in Satellite Computing* ([arXiv][r8]) | 80% reduction in downlink bandwidth through neural compression. |
| R9 | **Space Investments (2025)** — *The Basic Economics of Starship* ([Space Investments][r9]) | Analysis of Starship cost per kilogram under different reuse scenarios. |
| R10 | **Starcloud / Lumen Orbit (2024)** — *Why we should train AI in space* ([Starcloud][r10]) | Company white paper on orbital capacity factor and energy cost under optimistic assumptions. |

</details>

[r1]: https://www.iea.org/reports/energy-and-ai/ "Energy and AI — IEA"
[r2]: https://iea.blob.core.windows.net/assets/ddd078a8-422b-44a9-a668-52355f24133b/Electricity2024-Analysisandforecastto2026.pdf "Electricity 2024 — IEA"
[r3]: https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf "Umweltauswirkungen KI — Greenpeace"
[r4]: https://www.networkworld.com/article/4117329/google-warns-transmission-delays-are-now-the-biggest-threat-to-data-center-expansion.html "Grid delays — Network World"
[r5]: https://assets.publishing.service.gov.uk/media/688cb407dc6688ed50878367/Water_use_in_data_centre_and_AI_report.pdf "Water use in AI and Data Centres — GOV.UK"
[r6]: https://spacenews.com/spacex-files-plans-for-million-satellite-orbital-data-center-constellation/ "SpaceX files plans for million-satellite orbital data center constellation — SpaceNews"
[r7]: https://www.youtube.com/watch?v=BYXbuik3dgA "Elon Musk: In 36 months, cheapest place for AI will be space — YouTube"
[r8]: https://arxiv.org/pdf/2403.16677 "FOOL: Addressing the Downlink Bottleneck — arXiv"
[r9]: https://www.spaceinvestments.io/space-economy-market-intelligence/starship-economics "The Basic Economics of Starship — Space Investments"
[r10]: https://starcloudinc.github.io/wp.pdf "Why we should train AI in space — Starcloud"
