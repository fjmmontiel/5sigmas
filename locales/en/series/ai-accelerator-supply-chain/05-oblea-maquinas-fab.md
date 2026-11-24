---
title: How multiple chips are made on one disk
seo_title: How multiple chips are made on one disk
description: "See how lithography builds layers on a wafer and how electrical testing counts working chips before cutting."
date: '2026-11-24'
---
# How multiple chips are made on one disk

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

The factory starts with a polished silicon disk. It repeats the same design in many positions on that disk. That is how one **wafer** can carry many chips at once.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/05-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/05-b.webp", alt_a="Three cross-sections show the same layer fully coated, with an opening in the coating, and after the exposed material is removed.", alt_b="A grid of 100 positions shows 75 working chips and 25 failures in an illustrative test.", caption_a="The opening exposes only the area that will be removed.", caption_b="Testing counts how many positions work.", enlarge_a="Enlarge · Light makes a pattern", enlarge_b="Enlarge · One pattern, many chips", anim_shell="off") }}

## Copy a pattern, remove material, and repeat

The factory adds a thin film and covers it with a light-sensitive coating. A machine shines the pattern from a template called a mask onto the coating. This is **lithography**. After a wash, some of the coating remains. It protects the areas that should stay while the exposed material is removed. Repeating operations like these builds the circuits and their connections layer by layer.

During manufacturing, the equipment measures features and checks for defects. At the end comes an electrical test. If 75 of 100 chips work in this example, the **yield at that test step** is 75 percent. Yield tells you what share of the tested chips work.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/05-oblea-maquinas-fab-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · On another wafer, 82 out of 100 chips pass a test. What is the yield at that step?</summary>
  <p>The yield is 82 percent. It is the share of the tested chips that work.</p>
</details>

## Sources

[ASML · How microchips are made](https://www.asml.com/en/technology/all-about-microchips/how-microchips-are-made)

Continue with [How a GPU’s memory is stacked](06-cadena-memoria-hbm.md).
