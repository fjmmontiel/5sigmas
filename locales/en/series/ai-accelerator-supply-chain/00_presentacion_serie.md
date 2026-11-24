---
title: From Mine to Cluster — How a GPU is made and used
seo_title: From Mine to Cluster — How a GPU is made and used
description: Follow a GPU from rock to a working server, through the mines, factories and freight that build it, and see what
  can be recovered at the end.
tags:
- Infrastructure
- GPUs
- Semiconductors
date: '2026-11-24'
---
# From Mine to Cluster

A GPU is a part that performs many calculations at once. Follow one from the quartz that supplies its silicon to the day its server comes out of service.

<nav class="ac-journey-nav" aria-label="The GPU&#x27;s journey">
  <ol>
    <li><a href="#mine">Mine</a></li>
    <li><a href="#factory">Factory</a></li>
    <li><a href="#memory">Assembly</a></li>
    <li><a href="#shipping">Shipping</a></li>
    <li><a href="#cluster">Cluster</a></li>
    <li><a href="#recovery">Recovery</a></li>
  </ol>
</nav>
<link rel="stylesheet" href="/assets/stylesheets/ai-accelerator-lifecycle.css">

[Watch in portrait](/en/series/ai-accelerator-supply-chain/00_presentacion_serie-vertical.mp4)

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="mine", stage_title="Quartz supplies the silicon in a chip", story="Quartz supplies the silicon. After purification, the silicon is melted to grow a large crystal. Thin disks are cut from that crystal and polished. Each disk is a wafer.", picture="wafer", picture_alt="A piece of quartz beside a thin silicon disk.", picture_caption="Quartz and a silicon wafer", handoff="Many chips will be built on that surface at the same time.", source_url="https://www.sumcosi.com/english/products/process/", source_name="SUMCO", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="factory", stage_title="Many chips on one disk", story="The factory repeats the chip design across the wafer and builds its circuits layer by layer. It tests the chips while they are still together. Once cut apart, each piece of silicon is called a die.", picture="fab", picture_alt="A cleanroom machine handles a silicon wafer.", picture_caption="A wafer inside chipmaking equipment", handoff="Follow one chip that passed testing. The memory that will feed it data is made separately.", source_url="https://www.asml.com/en/technology/all-about-microchips/how-microchips-are-made", source_name="ASML", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="memory", stage_title="The chip needs memory close by", story="The large piece in the illustration does the calculations. Beside it are stacks of HBM memory, which feed it data quickly. The package holds and connects the parts.", picture="package-cutaway", picture_alt="A compute chip and stacks of memory on a shared base.", picture_caption="Compute chip and memory on the same base", handoff="The assembly is tested before it goes into a server.", source_url="https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm", source_name="TSMC", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="shipping", stage_title="The GPU goes inside a server", story="A circuit board holds the GPU and connects it to the rest of the computer. The server is packed for shipping. At the data center, it is checked and installed in a cabinet called a rack.", picture="logistics", picture_alt="An industrial crate secured to a pallet at a loading dock.", picture_caption="Equipment packed for shipping", handoff="The server is in place. Now it needs power, cooling, and a network connection.", source_url="https://www.dhl.com/us-en/home/technology-logistics/semiconductor-logistics.html", source_name="DHL", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="cluster", stage_title="The network connects the servers", story="Electricity powers the equipment. Cooling carries the heat from the chips outside. A network lets several servers share a job. That connected group is a cluster.", picture="rack", picture_alt="A data center aisle with server cabinets and cooling pipes.", picture_caption="Server cabinets and their cooling loop", handoff="When the equipment is retired, the team checks which parts can stay in use.", source_url="https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary", source_name="IEA", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="recovery", stage_title="What can be saved when equipment is retired", story="When the server is retired, someone checks the boards and modules. A working part can go into another machine. Some parts can be repaired. A specialist can recover materials such as copper from discarded parts.", picture="recovery", picture_alt="A person checks a board from a retired server.", picture_caption="Inspecting a board from a retired server", handoff="", source_url="https://www.simslifecycle.com/data-center/data-center-itad/", source_name="Sims Lifecycle Services", anim_shell="off") }}

<span id="accelerator-lifecycle"></span>

## Look up a material, chip, or company

[Materials and accelerator comparison](atlas.md) · [Find companies](atlas.md#accelerator-companies)

## The 14 chapters, from silicon to recycling

**Get to know the parts and their materials**

- [What a GPU does inside a server](01-que-estamos-fabricando.md)
- [From quartz to a silicon disk](02-mina-material-electronico.md)
- [Why each chip layer needs to be clean](03-consumos-fab.md)

**Build and test the accelerator**

- [How a chip design is prepared for manufacturing](04-diseno-ip-mascaras.md)
- [How multiple chips are made on one disk](05-oblea-maquinas-fab.md)
- [How a GPU’s memory is stacked](06-cadena-memoria-hbm.md)
- [How the compute chip connects to memory](07-chiplets-encapsulado.md)
- [How a GPU is tested before it ships](08-sustratos-ensamblaje-pruebas.md)

**Assemble the servers and put them to work**

- [How a GPU goes into a server](09-paquete-sistema.md)
- [How GPUs exchange data](10-red-cluster.md)
- [How servers get power and stay cool](11-electricidad-refrigeracion-obra.md)
- [The first test with servers working together](12-instalado-utilizable.md)
- [How one missing part can slow the supply chain](13-geografia-capacidad.md)

**Reuse parts and recover materials**

- [What can be reused or recycled from a server](14-segunda-vida.md)
