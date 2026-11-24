---
title: How servers get power and stay cool
seo_title: How servers get power and stay cool
description: "Trace two paths through a data center: power on its way to the racks and heat on its way out of the building."
date: '2026-11-24'
---
# How servers get power and stay cool

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

A rack full of servers needs electricity to run. The chips release heat as they work. The building needs to deliver enough electricity and remove enough heat to keep the equipment within its operating limits.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/11-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/11-b.webp", alt_a="The facility total includes racks, cooling, and other equipment. Rack power measures the first group.", alt_b="A building diagram shows electricity entering through a transformer and heat leaving the facility. Water enters where the cooling design requires it.", caption_a="Rack power is one part of the electricity the facility needs.", caption_b="The facility also powers its cooling equipment. Some designs need a water supply.", enlarge_a="Enlarge · Power comes in", enlarge_b="Enlarge · Heat goes out", anim_shell="off") }}

## Electricity comes in and heat goes out

Electricity comes in through a grid connection. Transformers change its voltage, and other equipment distributes it to the racks.

Heat travels out. It can pass first into air or a liquid, depending on the server. The facility moves that heat outside. If the design uses water, it also needs the supply and equipment for that loop. Before accepting the installation, the team checks that both paths work under load.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/11-electricidad-refrigeracion-obra-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · If a server has electricity, what other job has to happen for it to keep working?</summary>
  <p>Heat needs to leave the equipment and the building. A system using air or liquid does that job, depending on the design.</p>
</details>

## Sources

[IEA · Key Questions on Energy and AI](https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary) · [Vertiv · GB200 power and cooling blueprint](https://www.vertiv.com/en-emea/about/news-and-events/news-releases/vertiv-codevelops-with-nvidia-complete-power-and-cooling-blueprint-for--nvidia-gb200-nvl72-platform/)

Continue with [The first test with servers working together](12-instalado-utilizable.md).
