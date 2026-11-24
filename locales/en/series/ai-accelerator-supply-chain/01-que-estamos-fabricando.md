---
title: What a GPU does inside a server
seo_title: What a GPU does inside a server
description: "Open a server and follow the GPU from its circuit board to the network that lets multiple servers work together."
date: '2026-11-24'
---
# What a GPU does inside a server

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

A GPU is an accelerator, a part that performs many operations at once. A server is the computer it goes into. Open one and you will also find a main processor, called a CPU, that coordinates the work. There is also memory for storing data, connections, and a cooling system.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/01-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/01-b.webp", alt_a="The GPU goes onto a circuit board inside the server alongside the processor and memory.", alt_b="Four servers with eight GPUs each form a group when a network connects them.", caption_a="From GPU to board to server.", caption_b="Each group of eight belongs to one server.", enlarge_a="Enlarge · In a server", enlarge_b="Enlarge · Count the right thing", anim_shell="off") }}

## From one GPU to a group of servers

A **rack** is a cabinet that holds several servers. A **cluster** is a group of servers connected by a network so they can share work. A cluster can occupy more than one rack. Think of the rack as where the servers are stored and the cluster as the group that can work together.

Imagine eight servers with eight GPUs each. You have **64 GPUs and eight servers**. To work out how many racks you need, you still need to know how many servers fit in each cabinet and how they will be powered and cooled.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/01-que-estamos-fabricando-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · Four servers each have eight GPUs. How many GPUs are there?</summary>
  <p>There are 32 GPUs.</p>
</details>

## Sources

[NVIDIA · DGX GB Rack Scale Systems](https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html)

Continue with [From quartz to a silicon disk](02-mina-material-electronico.md).
