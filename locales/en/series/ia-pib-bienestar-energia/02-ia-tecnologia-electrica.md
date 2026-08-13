---
title: AI as an electrical technology
description: How AI workloads translate into electricity demand, why efficiency and total demand can rise together, and which infrastructure layers matter.
date: 2026-04-08
keywords: "AI electricity, AI energy use, data centers AI, inference energy, AI infrastructure"
tags:
  - Economics
  - Energy
  - AI
---

# Chapter 2 — AI as an electrical technology

AI is software running on a physical stack. Model development and model serving depend on accelerators, memory, networking, storage, cooling and reliable electricity. This chapter connects those layers and explains why lower energy per task does not automatically imply lower total demand.

!!! info "Prerequisite"
    Start with [Chapter 1 — Electricity and well-being](./01-electricidad-bienestar.md) for the distinction between nominal access and usable, reliable supply.

{{ include_html("snippets/ia-pib-energia/series_energy_ai_02_ai.html") }}

---

## 1. Building models and serving them have different demand profiles

Large model-building runs concentrate a large amount of compute into a finite period. Serving repeats smaller workloads continuously across many users and applications. As adoption grows, serving can become the larger lifetime workload because a small cost is multiplied by high volume and long operating periods.

{{ include_html("snippets/ia-pib-bienestar-energia/02-entrenamiento-inferencia.html") }}

The physical cost of any workload depends on model size, precision, hardware generation, batching, context length, output length and modality. There is therefore no single universal value for “energy per AI query”.

---

## 2. Efficiency can coexist with rising total demand

Hardware and software continue to reduce the energy needed for a unit of useful work. But total electricity depends on more than unit efficiency:

> **energy per task × number of tasks × workload complexity**

If energy per task falls while usage and workload complexity grow faster, total demand can still increase. This is the rebound effect: cheaper, more efficient compute enables more applications and more frequent use.

{{ include_html("snippets/ia-pib-bienestar-energia/02-efecto-rebote.html") }}

The engineering question is whether efficiency improves faster than aggregate demand expands.

---

## 3. The physical bottlenecks

Compute capacity depends on several layers working together. A constraint in any one of them can limit deployable capacity.

{{ include_html("snippets/ia-pib-bienestar-energia/02-cuellos-botella.html") }}

### Electricity and facilities

Large data centers require substantial reliable electrical capacity and supporting facility infrastructure. The IEA estimated global data-center electricity consumption at **415 TWh in 2024** and described substantially higher scenarios for 2030 as AI and conventional data workloads expand ([IEA, 2025](https://www.iea.org/reports/energy-and-ai)).

{{ include_html("snippets/ia-pib-bienestar-energia/02-proyeccion-demanda.html") }}

### Hardware, cooling and resource accounting

Accelerators depend on a wider semiconductor and networking supply chain. Cooling, networking, storage and power conversion add facility overhead, while hardware manufacturing and replacement add lifecycle costs that are separate from operational electricity.

{{ include_html("snippets/ia-pib-bienestar-energia/02-huella-ambiental.html") }}

Water comparisons also require consistent boundaries. Facility-level and sector-level totals, or direct and indirect water use, should not be mixed in the same comparison.

{{ include_html("snippets/ia-pib-bienestar-energia/02-agua-golf-datacenters.html") }}

---

## 4. Geography matters

Compute demand is concentrated rather than evenly spread across a grid. Large sites value electricity availability, facility capacity and network connectivity, while regional serving also values proximity to users.

{{ include_html("snippets/ia-pib-bienestar-energia/02-geografia-ia.html") }}

The same global AI service can therefore depend on several different local infrastructure conditions.

---

## 5. A better measurement stack

A useful scorecard separates the workload, hardware, facility, electricity supply and hardware lifecycle. A single “Wh per query” number can be useful, but only when those assumptions are explicit.

| Layer | Examples of what to measure |
| --- | --- |
| Workload | modality, context length, output size |
| Hardware | accelerator generation, utilization, precision |
| Facility | IT load and cooling overhead |
| Electricity | total consumption and reliability |
| Lifecycle | hardware manufacturing and replacement |

---

!!! tip "Continue the path"
    Continue with [Chapter 3 — Measurement: GDP vs well-being →](./03-pib-vs-bienestar.md).

## References

- **IEA (2025)** — [Energy and AI](https://www.iea.org/reports/energy-and-ai).
- **Jevons (1865)** — *The Coal Question*, the classical statement of the rebound mechanism.
- **Epoch AI** — public datasets tracking the growth of AI model compute.

## Frequently asked questions

**Why can serving matter more than model building over the full lifecycle?**  
Because model building is episodic while serving can run continuously at high volume.

**Does more efficient hardware reduce electricity demand?**  
It reduces electricity per unit of work, but total demand can still rise if usage grows faster.

**Why is one energy-per-query number insufficient?**  
Because model size, modality, output length, hardware, utilization and facility overhead all change the physical cost.
