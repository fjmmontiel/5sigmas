---
title: AI as an electrical technology
description: What AI implies in compute and energy terms, why demand can grow even as hardware improves, and where the real bottlenecks are.
date: 2026-04-08
keywords: "AI electrical technology, artificial intelligence energy consumption, AI data centers energy, AI rebound effect, GPU TPU compute, LLM inference energy, data center PUE, AI energy bottlenecks"
tags:
  - Economics
  - Energy
  - AI
---

# Chapter 2 — AI as an electrical technology

This chapter describes AI's real energy profile — training versus inference, growing demand and geographic concentration — and why continuous improvements in hardware efficiency do not imply declining electricity demand in absolute terms. By the end, the reader will understand what "compute" means in practice, why the Jevons paradox allows efficiency and total demand to grow at the same time, and have the framework needed for the debate on AI's impact on GDP and well-being developed in the following chapters.

!!! info "Prerequisites"
    This chapter assumes familiarity with the concepts introduced in [Chapter 1 — Electricity and well-being](./01-electricidad-bienestar.md).

AI is not purely a software technology. Every model query depends on hardware that draws electricity, cooling infrastructure that draws additional power, and a logistics chain that runs from mining chip materials to installing new high-voltage transmission lines for data centers.

{{ include_html("snippets/ia-pib-energia/series_energy_ai_02_ai.html") }}

---

## 1. What "compute" means in practice

Developing and deploying AI models involves two phases with very different energy profiles.

### Training

Training a large model requires processing massive amounts of data for weeks or months using thousands of specialized accelerators — GPUs or TPUs — in parallel. The energy consumed by a large-scale training run can equal the annual electricity consumption of thousands of homes. According to published estimates, the initial training of GPT-4 consumed around 42 GWh over several weeks, a figure comparable to the annual consumption of thousands of homes [Epoch AI (2023)](https://epoch.ai/data/ai-models).

A given model is not retrained frequently, but training recurs for every new version, every specialized variant and every experiment run by research teams. Across dozens of active laboratories and companies, those training runs add up to growing energy demand concentrated in the data centers where the work happens.

### Inference

Inference is the process of using the model to answer questions. Every query, every image generation and every document analysis consumes energy. Unlike training, inference happens billions of times per day, continuously and across distributed infrastructure.

The important distinction is scale and cadence: training is a large one-off cost, whereas inference is a small continuous cost that, multiplied by usage volume, can exceed training in aggregate energy consumption as adoption grows. A query to a large language model consumes approximately ten times more energy than a conventional web search, while video generation can reach forty times the energy use of that search [IEA (2025)](https://www.iea.org/reports/energy-and-ai).

> Energy use does not end with training. Serving a model to millions of daily users consumes energy continuously, not episodically.

{{ include_html("snippets/ia-pib-bienestar-energia/02-entrenamiento-inferencia.html") }}

---

## 2. Why efficiency does not stop demand

A reasonable intuition is that if chips become more efficient per operation, energy consumption should stabilize or decline. That intuition is partly right, but it is not enough to predict what happens in practice.

The rebound effect, or Jevons paradox, explains the divergence [Jevons (1865)](https://archive.org/details/coalquestionani00jevogoog). When a technology becomes more efficient, its cost of use falls, which encourages more use and can result in higher total consumption even though every unit of use is cheaper.

For AI, efficiency improvements have three simultaneous effects:

1. **They reduce the cost per query**, making applications economically viable that were not viable before.
2. **They broaden the set of users**, because models that are cheaper to operate can be deployed across more sectors and geographies.
3. **They increase model complexity**, because more efficient hardware creates room to scale model capability without increasing unit cost at the same rate.

The net result in recent years has been rising rather than stable energy consumption, despite real improvements in efficiency per operation.

{{ include_html("snippets/ia-pib-bienestar-energia/02-efecto-rebote.html") }}

---

## 3. The real bottlenecks

AI's expansion as an electrical technology is constrained by more than investment capital. Five bottlenecks determine how quickly it can grow.

{{ include_html("snippets/ia-pib-bienestar-energia/02-cuellos-botella.html") }}

### Electricity

Electricity is the first and most direct bottleneck. Data centers need grid connections with sufficient capacity and guarantees of continuous supply. The IEA estimates that global data-center electricity consumption reached 415 TWh in 2024 and could reach between 945 TWh and 1,260 TWh in 2030 depending on the pace of adoption; the base scenario already slightly exceeds Japan's current electricity consumption [IEA (2025)](https://www.iea.org/reports/energy-and-ai).

Within that total, the AI-specific component is growing faster than the rest of data workloads: a Greenpeace analysis (2025) estimates that electricity consumption attributable to AI workloads could grow from 50 TWh in 2023 to 554 TWh in 2030, an 11× increase in seven years, with associated CO₂ emissions rising from approximately 180 to 320 million tonnes over the same period [Greenpeace (2025)](https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf).

{{ include_html("snippets/ia-pib-bienestar-energia/02-proyeccion-demanda.html") }}

Household comparisons should be read as order-of-magnitude annual-energy equivalents under continuous operation. They do not mean that a data center and 100,000 homes draw exactly the same power at every instant; they mean their annual energy totals can be similar if the data center sustains that load throughout the year.

In many regions, the grid has no capacity available in the short term, expansion lead times are measured in years, and supply stability depends on an energy mix that remains mostly fossil-based in many countries. Large technology companies respond with long-term renewable-energy contracts (PPAs), dedicated supply agreements and, more recently, direct agreements with existing nuclear plants: Microsoft announced in 2023 an agreement to restart part of the generation at Three Mile Island in Pennsylvania, and Amazon and Google have signed similar agreements with nuclear-energy operators.

Those contracts do not mean that data centers run on renewable electricity in real time. They guarantee that an equivalent amount of renewable energy enters the grid, not that the electricity reaching a data center at every moment is renewable. The Greenpeace (2025) analysis estimates that the actual emissions of large technology companies are between 1.6 and 7.6 times higher than their carbon-neutrality claims suggest, because PPAs are accounted for as annual offsets rather than direct real-time substitution [Greenpeace (2025)](https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf).

{{ include_html("snippets/ia-pib-bienestar-energia/02-huella-ambiental.html") }}

### Chips

AI accelerators — primarily NVIDIA GPUs and Google TPUs at present — are the scarcest resource in the ecosystem. Manufacturing them requires leading-edge semiconductors produced in only a few fabs worldwide, mainly in Taiwan and South Korea, as well as materials such as gallium, of which China controls between 98% and 99% of global production [IEA (2025)](https://www.iea.org/reports/energy-and-ai). The supply chain is long, fragile and geopolitically sensitive.

Hardware manufacturing also has its own energy and material footprint, which is rarely included in sector sustainability calculations: producing a leading-edge semiconductor wafer requires approximately 2.3 MWh, and the total volume of AI hardware expected to be deployed over the next decade is already generating estimates of between 1.2 and 5 million tonnes of electronic waste by 2030, a stream that exceeds the current capacity of specialized recycling systems [Greenpeace (2025)](https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf).

Lead times for large-scale hardware orders range from 36 to 52 weeks [(IEA, 2025)][r1], limiting how quickly any actor can scale compute capacity regardless of available budget. US restrictions on exports of advanced chips add another layer of uncertainty for actors outside the Western technology alliance.

### Water

Data-center cooling now consumes enough water to be a local planning issue. A 100 MW data center can consume around two million liters per day through evaporative-cooling systems, and estimates for the sector as a whole suggest that global consumption could rise from 560 billion liters in 2024 to 1.2 trillion in 2030 [IEA (2025)](https://www.iea.org/reports/energy-and-ai). Paradoxically, some water-stressed regions are also attractive locations for data centers because of climate or low land costs. In those areas, data-center water use creates direct tension with other uses and with local communities competing for a scarce resource.

The basis of comparison matters. Facility by facility, a typical 100 MW data center consumes substantially more water than a medium-sized golf course: the IEA places the data center at roughly two million liters per day in total, while the 2024 GCSAA/ASHS survey for the United States puts median water use per golf facility at around 85 million liters per year [(GCSAA/ASHS, 2025)](https://journals.ashs.org/view/journals/horttech/35/5/article-p848.xml). At the aggregate sector level, however, the picture changes: the same survey projects around 2.01 trillion liters of water applied to US golf courses in 2024, roughly 3.6 times the IEA estimate for global data centers in 2024 [(GCSAA, 2025)](https://www.gcsaa.org/docs/default-source/what-we-do/gcep-phase-4-water-report.pdf?sfvrsn=c829dd3e_0).

{{ include_html("snippets/ia-pib-bienestar-energia/02-agua-golf-datacenters.html") }}

### Talent

The number of people capable of designing, training and maintaining AI systems at scale remains limited relative to demand. Talent is geographically concentrated, and its scarcity is a real limit on development speed.

### Regulation

Regulatory requirements for data centers, personal-data management and the use of AI systems in critical sectors vary enormously across jurisdictions. That variation creates uncertainty about which business models are viable in which geographies. The European AI Act, US restrictions on chip exports and debates over digital sovereignty across multiple countries create a constantly changing regulatory environment that shapes investment decisions.

---

## 4. The geography of AI energy demand

AI energy demand is highly concentrated. Data centers cluster in regions with favorable conditions: low electricity prices, available land, fiber connectivity and climates that reduce cooling costs.

In the United States, Northern Virginia, Texas and the Pacific Northwest hold a disproportionate share of capacity. In Europe, Ireland and the Nordic countries have attracted massive investment because of cheap energy and favorable cooling climates. Ireland illustrates the concentration this can create at national scale: data centers already account for more than 20% of the country's total electricity consumption, and some projections put that share close to 80% by 2030 if expansion continues at the expected pace, making management of that demand a national energy-policy priority unmatched by other sectors. In Asia, Singapore, Japan and parts of China concentrate regional capacity.

A functional split is also emerging: model training tends to concentrate where electricity is cheaper — often near renewable generation or electricity markets with low off-peak prices — while low-latency inference is located close to population centers. This two-level geography affects which regions attract each type of infrastructure and what kinds of jobs and value added each function generates.

This concentration also affects local grids. A single large data center can account for a significant share of a region's electricity consumption and strain infrastructure that was not designed to absorb the additional load.

> At AI's current deployment scale, "how much energy does it consume?" is a question of public infrastructure and energy policy, not only technological efficiency.

{{ include_html("snippets/ia-pib-bienestar-energia/02-geografia-ia.html") }}

The next chapter examines the other side of the equation: how we measure the impact associated with all this consumption, and why GDP captures only part of what actually matters.

---

## Frequently asked questions

**Why is AI described as an "electrical technology"?**
Because, like the electric motor or computing, AI is not confined to a single sector: it can transform productivity in any industry that adopts its capabilities. The electric motor did not merely power factories; it reorganized how those factories were designed. AI does not merely automate office tasks; it changes how decision-making processes are structured. The analogy also points to AI's physical dependency: without energy infrastructure at scale, there is no AI at scale.

**How much energy does it take to train a large AI model?**
The initial training of a model at GPT-4 scale consumed around 42 GWh according to available estimates, equivalent to the annual electricity consumption of a few thousand homes. That figure describes a single training run: the industry performs dozens of large-scale training runs per year across active laboratories, plus hundreds of smaller-scale experiments, making the aggregate figure several times larger. Model scale has also continued to grow: models trained in 2025 often exceed that threshold.

**What is the rebound effect and why does it matter for AI energy use?**
The rebound effect, or Jevons paradox, describes the pattern in which an improvement in a technology's efficiency reduces the cost per unit of use and, as a consequence, expands usage volume by more than the efficiency improvement saves. Applied to AI: although each generation of chips performs more compute per watt, total demand for compute grows faster than efficiency improves, so aggregate consumption rises even as the cost per operation falls. This is why IEA projections show data-center electricity consumption nearly doubling between 2024 and 2030 even while assuming continued efficiency improvements.

**Why are AI data centers concentrated in certain geographic locations?**
Because they simultaneously require cheap and abundant electricity, available land, water for cooling and high-capacity fiber connectivity. That combination is scarce. Northern Virginia, northwestern Ireland, Singapore and the Nordic countries each offer different subsets of those conditions. As demand grows and exhausts available capacity in those locations, the first constraints emerge in local grids and water resources before new generation capacity can arrive.

**Will improvements in AI hardware efficiency reduce its global energy consumption?**
Probably not in absolute terms, although they can in relative terms. Improvements in chip efficiency reduce the cost per operation, expanding the market for viable applications and, with it, total demand. The same pattern occurred with mobile phones: current chips are thousands of times more efficient than the first mobile chips, but the electricity consumption of the telecommunications sector has continued to grow because usage volume multiplied even faster.

---

## 5. References

<details markdown="1">
<summary><strong>Base sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **IEA (2025)** — *Energy and AI* ([IEA][r1]) | Primary source for the 415→945→1,260 TWh projections, per-query consumption comparisons, water data and the geographic concentration of data centers. |
| R2 | **Greenpeace (2025)** — *Umweltauswirkungen der Künstlichen Intelligenz* ([Greenpeace][r2]) | Analysis of AI's environmental impact: carbon emissions, water consumption and the water footprint of data centers. |
| R3 | **Patterson, D. et al. (2021)** — *Carbon and the Broad Economy of Machine Learning* ([arXiv][r3]) | Methodological framework for calculating the carbon footprint of training; includes proposals for sector energy efficiency. |
| R4 | **Jevons, W.S. (1865)** — *The Coal Question* | Original formulation of the efficiency paradox: technological improvement lowers unit cost but expands usage volume, resulting in growing total demand. |
| R5 | **Strubell, E. et al. (2019)** — *Energy and Policy Considerations for Deep Learning in NLP* ([arXiv][r5]) | First systematic analysis of the energy and carbon cost of training large-scale language models. |
| R6 | **Epoch AI (2023)** — *Trends in Machine Learning* ([Epoch AI][r6]) | Database of notable models with estimates of compute, training energy cost and scaling trends. Source for the ~42 GWh GPT-4 estimate. |
| R7 | **GCSAA / ASHS (2025)** — *Survey of Water Use and Management Practices on US Golf Courses from 2005 to 2024* | National survey and peer-reviewed paper on water applied to US golf courses; basis for around 2.01 trillion liters in 2024 and a median of around 85 million liters per facility. |

</details>

[r1]: https://www.iea.org/reports/energy-and-ai "Energy and AI — IEA"
[r2]: https://www.greenpeace.de/publikationen/20250514-greenpeace-studie-umweltauswirkungen-ki-eng.pdf "Umweltauswirkungen KI — Greenpeace"
[r3]: https://arxiv.org/abs/2104.10350 "Carbon and the Broad Economy of Machine Learning — arXiv"
[r4]: https://archive.org/details/coalquestionani00jevogoog "The Coal Question — Jevons (1865)"
[r5]: https://arxiv.org/abs/1906.02629 "Energy and Policy Considerations for Deep Learning in NLP — arXiv"
[r6]: https://epoch.ai/data/ai-models "AI Models — Epoch AI"
[r7]: https://journals.ashs.org/view/journals/horttech/35/5/article-p848.xml "Survey of Water Use and Management Practices on US Golf Courses from 2005 to 2024 — ASHS HortTechnology"