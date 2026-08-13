---
title: Electricity and well-being
description: Why reliable and affordable electricity enables health services, logistics, productive activity and connectivity, and why supply quality matters as much as total electricity use.
date: 2026-04-07
keywords: "electricity and well-being, energy access development, rural electrification, energy MTF, electricity consumption per capita, electricity reliability, human development energy"
tags:
  - Economics
  - Energy
  - AI
---

# Chapter 1 — Electricity and well-being: the real mechanisms

This chapter explains the mechanisms through which electricity supports health services, economic activity, logistics and connectivity, and separates two variables that are often mixed together: **how much electricity exists** and **how usable the supply is**. By the end, you will understand the main channels connecting electrification with well-being, what the World Bank's Multi-Tier Framework measures, and why a nominal grid connection is not the same as effective access.

Countries with reliable and affordable electricity tend to have stronger service infrastructure and greater productive capacity. The important question is not the correlation itself but the mechanism: **what does electricity make possible that could not operate reliably before?**

The question is becoming central again in the AI era. The IEA reports rapid growth in data-center electricity demand even while hardware and software efficiency improve. Lower energy use per task does not automatically reduce total demand when adoption and workload intensity rise at the same time ([IEA, 2026](https://www.iea.org/news/data-centre-electricity-use-surged-in-2025-even-with-tightening-bottlenecks-driving-a-scramble-for-solutions)).

{{ include_html("snippets/ia-pib-energia/series_energy_ai_01_electricity.html") }}

---

## 1. Electricity enables other systems

Electricity is best understood as infrastructure. It creates value by making other systems dependable.

{{ include_html("snippets/ia-pib-bienestar-energia/01-mecanismos.html") }}

### Health and essential services

Refrigeration, diagnostic equipment, lighting, pumps, communications and many facility systems require stable electricity. The useful distinction is operational: these services need **continuous usable power**, not merely an official connection to a grid.

### Logistics and productive activity

Electric motors, pumps, cold storage and workshop machinery increase the amount of useful work that can be performed per hour. Reliable electricity also supports digital inventory, communications and payment systems.

### Education and connectivity

Lighting extends useful hours for study and work. Telecommunications depend on energized network infrastructure. Digital access depends on devices, networks and data centers, all downstream of the electricity system.

The chain is straightforward:

> **reliable electricity → dependable services and connectivity → greater productive capacity**

---

## 2. Quantity is not the same as quality

Electricity consumption per person is useful for broad comparisons, but it hides distribution, price and reliability.

A national average cannot tell you whether a workshop can finish a production run, whether a refrigerator remains powered overnight, or whether voltage is stable enough for sensitive equipment.

### Quantity

Annual kWh per person describes the scale of electricity use. At low access levels, additional reliable supply can unlock lighting, refrigeration, pumping, communications and small machinery for the first time.

### Quality

Three dimensions matter alongside total energy:

- **Reliability:** how often supply fails and whether interruptions are predictable.
- **Voltage stability:** whether equipment can operate consistently without repeated shutdowns or damage.
- **Affordability:** whether users can actually consume enough electricity for useful services.

The World Bank's Multi-Tier Framework describes energy access through several service dimensions rather than a simple connected/not-connected binary ([ESMAP / World Bank, 2015](https://documents.worldbank.org/en/publication/documents-reports/documentdetail/875761468136575589/beyond-connections-energy-access-redefined)).

### Diminishing returns

The relationship between electricity and well-being is nonlinear. The first reliable supply can unlock services that were previously unavailable. Once an economy already has broad dependable access, additional electricity remains useful but other factors increasingly explain differences in outcomes.

{{ include_html("snippets/ia-pib-bienestar-energia/01-kwh-idi-curva.html") }}

> Electricity can be necessary infrastructure without being a sufficient explanation for development. Access, institutions, affordability and distribution determine how broadly its value is realized.

---

## 3. Why outages matter

An outage affects more than the missing kWh. Production can stop, backup systems may need to start, refrigeration and communications can degrade, and schedules become harder to maintain.

The distinction between **planned** and **unplanned** interruption matters because predictable downtime can sometimes be scheduled around while random interruptions break active processes.

World Bank Enterprise Surveys document that unreliable electricity creates significant operating burdens for firms, especially where businesses must maintain their own backup generation ([World Bank Enterprise Surveys](https://www.enterprisesurveys.org/)).

{{ include_html("snippets/ia-pib-bienestar-energia/01-costes-cortes.html") }}

---

## 4. Electricity as enabling infrastructure

A useful mental model is to treat electricity like a transport network or water system. Its value lies in what downstream services become possible because the infrastructure works reliably.

A technically available connection with frequent outages, unstable voltage or unaffordable tariffs delivers much less usable capacity than the word "connected" suggests.

{{ include_html("snippets/ia-pib-bienestar-energia/01-electricidad-infraestructura.html") }}

> The important question is not only how much electricity exists, but **how reliably it reaches users, at what usable capacity and at what cost**.

This is the bridge to AI infrastructure. Accelerators, storage and model serving sit downstream of grid capacity, cooling and continuous supply. The next chapter looks at that physical demand directly.

---

!!! tip "Next reading"
    Continue with [Chapter 2 — AI as an electrical technology →](./02-ia-tecnologia-electrica.md) to see what compute means physically, why efficiency can coexist with rising total demand, and where the real infrastructure bottlenecks appear.

## References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Source | Why it matters |
| --- | --- |
| **IEA (2026)** — *Data centre electricity use surged in 2025* | Current context on data-center and AI electricity growth despite efficiency improvements. |
| **ESMAP / World Bank (2015)** — *Beyond Connections: Energy Access Redefined* | Introduces the Multi-Tier Framework and explains why connection alone does not describe useful access. |
| **World Bank Enterprise Surveys** | Evidence on the operating burden created by unreliable electricity. |

</details>

---

## Frequently asked questions

**Why is a grid connection not the same as effective electricity access?**  
Because the connection statistic says little about available power, outage frequency, voltage stability or affordability. Effective access is about what services the supply can support reliably.

**Why are outages operationally expensive?**  
They can stop production, force the use of backup systems and create schedule uncertainty. The same number of outage hours is more disruptive when interruptions are random rather than planned.

**Does more electricity always produce proportionally more benefit?**  
No. Marginal gains are largest when reliable electricity unlocks basic services for the first time. At higher levels, infrastructure remains necessary while other factors increasingly determine the outcome.

**Why does this matter for AI?**  
Because AI is physically downstream of the electricity system. Training and inference run on hardware in data centers, so grid capacity, reliability and cooling constrain how much AI service can be delivered and where.
