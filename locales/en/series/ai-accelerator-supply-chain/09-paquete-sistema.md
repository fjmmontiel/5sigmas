---
title: How a GPU goes into a server
seo_title: How a GPU goes into a server
description: "Follow a tested GPU into a server and compare what teams inspect when fab equipment or an assembled rack arrives."
date: '2026-11-24'
---
# How a GPU goes into a server

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

Imagine a tested GPU sitting on a table. To put it to work, a manufacturer installs it on a **circuit board** that supplies electricity and connects it to the rest of the computer.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/09-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/09-b.webp", alt_a="The board with the GPU slides into the chassis with power, processor, and cooling.", alt_b="Two rows compare how fab equipment and an assembled rack move from dispatch to transport and inspection at receiving.", caption_a="The chassis holds the board and other components.", caption_b="What you ship determines how to protect it and what to inspect on arrival.", enlarge_a="Enlarge · Build the server", enlarge_b="Enlarge · Follow one shipment", anim_shell="off") }}

## From a circuit board to equipment ready to ship

A server brings that board together with other components. The CPU coordinates some of the work, the power supplies convert electricity, and the cooling system carries heat away. Everything is held in an enclosure called a **chassis**. The builder tests the parts together before packing it.

Shipping also depends on what is moving. The diagram compares how a chipmaking machine travels with how an assembled server rack travels. In each case someone has to receive the equipment and check its condition before installation.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/09-paquete-sistema-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · What jobs do the circuit board and cooling system do?</summary>
  <p>The board carries power and signals to the GPU. The cooling system picks up the heat it produces and carries that heat away.</p>
</details>

## Sources

[NVIDIA · DGX GB Rack Scale Systems](https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html) · [DHL](https://www.dhl.com/global-en/campaign/semicon-solution/capital-equipment-solution.html)

Continue with [How GPUs exchange data](10-red-cluster.md).
