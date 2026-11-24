---
title: How GPUs exchange data
seo_title: How GPUs exchange data
description: "Follow data within a GPU, between GPUs inside a server, and across racks. Learn what latency and bandwidth measure."
date: '2026-11-24'
---
# How GPUs exchange data

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

Imagine two GPUs calculating different parts of a job. When they need to combine their results, they have to exchange data. The data takes a different path depending on where the GPUs are.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/10-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/10-b.webp", alt_a="A signal travels between compute and memory, between GPUs inside one server, and between servers in different racks.", alt_b="Two time lines show that the first data can arrive early even when less data arrives in the interval.", caption_a="The route grows from the package to the cluster network.", caption_b="The top row arrives first. The bottom row delivers more data.", enlarge_a="Enlarge · Distance changes the path", enlarge_b="Enlarge · Arrival and throughput", anim_shell="off") }}

## Connections inside a GPU, inside a server, and between racks

Inside a package, data travels along short connections between chips. Inside a server, GPUs can communicate over direct links. Between servers or racks, network switches direct the traffic. The system can use copper connections, fiber, or both.

**Latency** is how long a message takes to arrive. **Bandwidth** is how much data can be sent in a given time. Both matter when a job has to exchange intermediate results often.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/10-red-cluster-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · A connection delivers the first data quickly but moves little data each second. Which measure describes each property?</summary>
  <p>The time the first data takes to arrive is latency. The amount that can move per second is bandwidth.</p>
</details>

## Sources

[NVIDIA · DGX GB Rack Scale Systems](https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html) · [UALink Consortium · Specification](https://ualinkconsortium.org/specification/)

Continue with [How servers get power and stay cool](11-electricidad-refrigeracion-obra.md).
