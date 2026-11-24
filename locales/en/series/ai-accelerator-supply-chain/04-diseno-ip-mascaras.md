---
title: How a chip design is prepared for manufacturing
seo_title: How a chip design is prepared for manufacturing
description: "Follow a chip layout to the mask and see how a design is prepared so the factory can pattern its connections."
date: '2026-11-24'
---
# How a chip design is prepared for manufacturing

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

Before any work starts on a wafer, the team decides what the chip will calculate and how to organize its circuits. Specialized software lets the team place the parts and draw connections between them.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/04-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/04-b.webp", alt_a="Two tracks are moved apart to satisfy an illustrative spacing rule.", alt_b="A pattern moves from the layout to the mask and is projected onto the wafer.", caption_a="The factory specifies the minimum spacing.", caption_b="Each mask carries the pattern for one layer.", enlarge_a="Enlarge · Leave room between traces", enlarge_b="Enlarge · From drawing to mask", anim_shell="off") }}

## From the factory’s rules to physical templates

The factory provides rules and models. For instance, they tell the design team how far apart two traces need to be for the equipment to make them separately. The team checks its design against those rules before sending it to the factory.

Once the design is checked, physical templates called **masks** are made. Each carries one of the patterns. In the lithography machine, light transfers a mask pattern to the wafer. A chip has many layers, so the right patterns have to be prepared for each layer.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/04-diseno-ip-mascaras-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · What does the template used by a lithography machine carry?</summary>
  <p>It carries the pattern that the machine copies onto the wafer in one manufacturing step. The different layers need several patterns.</p>
</details>

## Sources

[TSMC · Open Innovation Platform](https://pr.tsmc.com/english/news/1987) · [ASML · How microchips are made](https://www.asml.com/en/technology/all-about-microchips/how-microchips-are-made)

Continue with [How multiple chips are made on one disk](05-oblea-maquinas-fab.md).
