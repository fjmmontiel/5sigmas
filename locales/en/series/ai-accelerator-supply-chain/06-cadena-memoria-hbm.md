---
title: How a GPU’s memory is stacked
seo_title: How a GPU’s memory is stacked
description: "Learn the difference between capacity and bandwidth and see how HBM stacks next to the compute chip."
date: '2026-11-24'
---
# How a GPU’s memory is stacked

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

The part of the GPU that does the calculations needs data from memory. Imagine loading an entire model onto a single GPU. Its data has to fit in memory and then reach the compute chip.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/06-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/06-b.webp", alt_a="A container shows how much fits; two paths show how much moves over the same interval.", alt_b="The layers stack, connect through columns, and join the compute chip.", caption_a="How much fits and how much moves each second are different measures.", caption_b="Metal columns connect the memory layers.", enlarge_a="Enlarge · Space and speed", enlarge_b="Enlarge · Memory goes up", anim_shell="off") }}

## How much data fits and how much can move per second

**Capacity** tells you how much fits. It is measured in gigabytes, or GB. **Bandwidth** tells you how much data can move per second. It can be measured in gigabytes per second, or GB/s.

## The memory is made separately and mounted next to the chip

**HBM** stands for high-bandwidth memory. Each stack places several **DRAM** memory chips one on top of another. This adds room for data without making the base as wide. Metal connections through the silicon link the chips vertically. Once the memory is mounted beside the compute chip, many short connections let them transfer data in parallel. The stack is tested before it is joined to the chip.

### Read two memory specifications

| GPU | HBM4 capacity per GPU | Peak memory bandwidth |
|---|---:|---:|
| [NVIDIA Rubin](https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/) | Up to 288 GB | Up to 22 TB/s |
| [AMD Instinct MI455X](https://www.amd.com/en/products/accelerators/instinct/mi400/mi455x.html) | 432 GB | 23.3 TB/s |

To check if 300 GB fits, use the first numeric column. To see how much data the memory can transfer per second, use the second. The [atlas](atlas.md) lists more accelerators and the source of each figure.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/06-cadena-memoria-hbm-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · A model takes up 50 GB. Which figure tells you whether it fits in memory?</summary>
  <p>Memory capacity, measured in GB. The memory needs enough space to hold those 50 GB.</p>
</details>

## Sources

[SK hynix · 12-layer HBM3E volume production](https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/) · [Micron · HBM3E](https://www.micron.com/products/memory/hbm/hbm3e)

Continue with [How the compute chip connects to memory](07-chiplets-encapsulado.md).
