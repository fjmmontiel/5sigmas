---
title: How a GPU is tested before it ships
seo_title: How a GPU is tested before it ships
description: "See which defects a wafer probe can find and what can go wrong when the compute chip and memory are connected."
date: '2026-11-24'
---
# How a GPU is tested before it ships

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

While the chips are still together on the wafer, a probe card touches their electrical contacts. The machine sends signals and checks the response. That helps identify which chips to cut out and send to assembly.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/08-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/08-b.webp", alt_a="A probe moves across the wafer and marks a chip that passes the electrical test.", alt_b="The parts pass on their own; once assembled, the signal stops at the open connection.", caption_a="A probe checks chips before they are separated.", caption_b="The break is at a connection added during assembly.", enlarge_a="Enlarge · Test before cutting", enlarge_b="Enlarge · Test the connection", anim_shell="off") }}

## What can fail after the parts are joined

A chip can work on its own and fail once it is joined to memory. The second test checks the assembly. If a connection is open, data might stop passing even though both parts passed their separate tests.

Depending on the device, tests can also check whether the accelerator can run at specified speeds, power levels, and temperatures. When the manufacturer sorts the parts by their results, that step is called *binning*.

### What each test checks

| When | What gets tested | What it can reveal |
|---|---|---|
| Before cutting | A chip on the wafer | The circuit fails to respond to the probe. |
| After assembly | The chip connected to its memory | An open contact breaks the signal. |
| Under load | The running accelerator | The accelerator produces errors at a test temperature. |

[Watch in portrait](/en/series/ai-accelerator-supply-chain/08-sustratos-ensamblaje-pruebas-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · A chip and a memory stack pass their own tests. What can a test of the assembly uncover?</summary>
  <p>It can find a fault in the connections added during assembly. For example, an open contact can stop data from passing.</p>
</details>

## Sources

[Amkor · Semiconductor Test Services](https://amkor.com/test-services/) · [Teradyne · Magnum 7H](https://www.teradyne.com/products/magnum-7h/)

Continue with [How a GPU goes into a server](09-paquete-sistema.md).
