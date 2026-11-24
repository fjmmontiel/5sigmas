---
title: Cómo se monta una GPU dentro de un servidor
seo_title: Cómo se monta una GPU dentro de un servidor
description: "Sigue una GPU probada hasta el servidor y compara qué se comprueba al recibir un rack o una máquina de fábrica."
date: '2026-11-24'
video: 09-paquete-sistema.mp4
video_poster: 09-paquete-sistema.jpg
video_title: Cómo se monta una GPU dentro de un servidor
video_summary: "Monta una placa con GPU dentro del chasis y sigue un envío desde el embalaje hasta la inspección en destino."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 09-paquete-sistema-visual-text.vtt
video_transcript: 09-paquete-sistema-transcript.html
video_chapters:
- name: Montar el servidor
  start: 0
  end: 16
- name: Sigue un envío
  start: 16
  end: 32
---
# Cómo se monta una GPU dentro de un servidor

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

Imagina que hay una GPU probada encima de la mesa. Para usarla, un fabricante la monta en una **placa** que le lleva corriente y la conecta con el resto del ordenador.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/09-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/09-b.webp", alt_a="La placa con GPU se introduce en un chasis con alimentación, procesador y ventilación.", alt_b="Dos filas comparan los relevos de una máquina de fabricación y un rack montado, desde la protección de la carga hasta la inspección en destino.", caption_a="El chasis reúne la placa y los demás componentes.", caption_b="El tipo de carga determina cómo se protege y qué se comprueba al recibirla.", enlarge_a="Ampliar · Montar el servidor", enlarge_b="Ampliar · Sigue un envío", anim_shell="off") }}

## De la placa al equipo listo para transportar

Un servidor reúne esa placa con otros componentes. La CPU coordina parte del trabajo, las fuentes convierten la electricidad y la refrigeración se lleva calor. Todo va sujeto dentro de una caja llamada **chasis**. Antes de embalarlo, el fabricante comprueba que las piezas funcionan juntas.

El transporte también depende de lo que se mueve. El gráfico compara el viaje de una máquina de fabricación con el de un rack de servidores ya montado. En ambos casos, alguien tiene que recibir la carga y comprobar su estado antes de instalarla.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/09-paquete-sistema-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · ¿Qué problemas resuelven la placa y la refrigeración?</summary>
  <p>La placa lleva corriente y señales a la GPU. La refrigeración recoge el calor que produce mientras trabaja y lo lleva fuera del equipo.</p>
</details>

## Fuentes

[NVIDIA · DGX GB Rack Scale Systems](https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html) · [DHL](https://www.dhl.com/global-en/campaign/semicon-solution/capital-equipment-solution.html)

Continúa con [Cómo intercambian datos las GPU](10-red-cluster.md).
