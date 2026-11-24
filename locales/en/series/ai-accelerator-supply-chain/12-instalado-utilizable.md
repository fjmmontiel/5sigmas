---
title: The first test with servers working together
seo_title: The first test with servers working together
description: "Power up the servers, check that the GPUs appear, and follow the first test job shared across the cluster."
date: '2026-11-24'
---
# The first test with servers working together

[From Mine to Cluster](00_presentacion_serie.md) · [Atlas](atlas.md)

Once the servers are in their racks, the installation team turns them on and checks that every GPU shows up. Then the team configures the software that controls the hardware and connects the machines to each other.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/en/12-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/en/12-b.webp", alt_a="Installed servers power on, are detected, and are prepared for a test.", alt_b="A job is split across three servers. Their results are combined and checked.", caption_a="Detecting a GPU comes before testing it under load.", caption_b="The results from each server have to fit together.", enlarge_a="Enlarge · Power on and detect", enlarge_b="Enlarge · One job across servers", anim_shell="off") }}

## What a test job checks across several servers

The team can run a test job across several servers at once. It checks that GPUs get the data they need, that the network can share the workload, and that cooling keeps the equipment within its limits.

**Acceptance** is the process of checking the system against the agreed requirements. After that, the operator can offer the capacity to people who need to run jobs. Powering up one server is one check. Running a job across servers shows what the system can do together.

[Watch in portrait](/en/series/ai-accelerator-supply-chain/12-instalado-utilizable-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Quick check · Why run one job across several servers during installation?</summary>
  <p>It checks whether the servers exchange data and work together while the facility supplies power and removes heat.</p>
</details>

## Sources

[AWS · Amazon EC2 Trn3 UltraServers](https://aws.amazon.com/ec2/instance-types/trn3/)

Continue with [How one missing part can slow the supply chain](13-geografia-capacidad.md).
