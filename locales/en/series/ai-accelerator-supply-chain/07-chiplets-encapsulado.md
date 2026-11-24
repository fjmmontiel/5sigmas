---
title: How the compute chip connects to memory
seo_title: How the compute chip connects to memory
description: "Follow a signal between the chip and its memory and compare three ways to connect parts inside a package."
date: '2026-11-24'
---
# How the compute chip connects to memory

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

An AI accelerator can contain several pieces of silicon. Each is made separately and does a job such as computing or storing data. The **package** holds the pieces and lets them pass signals to one another.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/07-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/07-b.webp", alt_a="The chip and memory sit on a shared base and a signal crosses between them.", alt_b="Three cross-sections compare a route in the base, a local bridge, and a vertical connection.", caption_a="The trace passes underneath the chip and memory.", caption_b="The location of the connection distinguishes the three options.", enlarge_a="Enlarge · A base under both chips", enlarge_b="Enlarge · Follow each connection", anim_shell="off") }}

## Three ways to connect the parts

- **A shared base** carries connections between pieces. A layer that sits between the chips and the lower substrate is often called an *interposer*.
- **A bridge** connects neighboring pieces in a small area.
- **A stack** places pieces on top of each other and connects them vertically.

A GPU can combine these techniques. The design has to leave room for connections and a path for heat to escape. After assembly, the parts are tested together.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/07-chiplets-encapsulado-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · Two chips sit side by side. What can connect their edges in one small area?</summary>
  <p>A bridge connects the nearby edges.</p>
</details>

## Sources

[TSMC · CoWoS](https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm) · [Intel Foundry · Advanced Packaging](https://www.intel.com/content/www/us/en/foundry/packaging.html)

Continue with [How a GPU is tested before it ships](08-sustratos-ensamblaje-pruebas.md).
