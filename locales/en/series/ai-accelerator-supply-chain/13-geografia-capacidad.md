---
title: How one missing part can slow the supply chain
seo_title: How one missing part can slow the supply chain
description: "Change the number of compute chips and memory sets that reach a factory and see how many GPUs it can assemble."
date: '2026-11-24'
---
# How one missing part can slow the supply chain

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

Imagine an assembly line with 100 compute chips ready. To assemble a GPU, each chip needs a set of memory stacks that fit its design. If only 60 sets arrive, the line can assemble at most 60 GPUs from those parts.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/13-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/13-b.webp", alt_a="With 100 chips and 60 memory sets, 60 GPUs can be assembled. Forty chips are left over.", alt_b="With 40 chips and 60 memory sets, 40 GPUs can be assembled. Twenty memory sets remain.", caption_a="Forty chips are waiting for memory.", caption_b="Twenty memory sets are waiting for chips.", enlarge_a="Enlarge · Memory sets the limit", enlarge_b="Enlarge · The limit moves", anim_shell="off") }}

## Finding what limits assembly

Memory is the **bottleneck**, the step that limits how much the line can produce. If more memory sets arrive, assembly or testing can become the next bottleneck.

Another supplier can help when it has capacity and its part can be shown to work in the same design. To understand a delay, find out what is missing, where it is made, and how long it would take to qualify an alternative.

{{ include_html("snippets/ai-accelerator-supply-chain/bottleneck-demo.html", demo_title="Change the parts available", chips_label="Compute chips", memory_label="Memory sets", assembled_label="GPUs you can assemble", chips_left_label="Chips left", memory_left_label="Memory sets left", reset_label="Reset to 100 and 60", anim_shell="off") }}

[Watch in portrait](/en/series/ai-accelerator-supply-chain/13-geografia-capacidad-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · This time there are 40 compute chips and memory for 60. How many complete GPUs can be assembled?</summary>
  <p>Up to 40 can be assembled. This time the number of compute chips sets the limit. The extra memory can be used once more chips arrive.</p>
</details>

For a published example of industrial capacity, find TSMC and its packaging work in the [atlas directory](atlas.md).

## Sources

[OECD · Mapping the semiconductor value chain](https://www.oecd.org/en/publications/mapping-the-semiconductor-value-chain_4154cdbf-en.html)

Continue with [What can be reused or recycled from a server](14-segunda-vida.md).
