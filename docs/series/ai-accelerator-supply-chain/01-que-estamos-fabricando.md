---
title: Qué hace una GPU dentro de un servidor
seo_title: Qué hace una GPU dentro de un servidor
description: "Abre un servidor y sigue la GPU desde su placa hasta la red que permite que varios equipos trabajen juntos."
date: '2026-11-24'
video: 01-que-estamos-fabricando.mp4
video_poster: 01-que-estamos-fabricando.jpg
video_title: Qué hace una GPU dentro de un servidor
video_summary: "Del chip a la placa y al servidor. Cuenta las GPU de cuatro servidores cuando la red los une."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 01-que-estamos-fabricando-visual-text.vtt
video_transcript: 01-que-estamos-fabricando-transcript.html
video_chapters:
- name: La GPU dentro del servidor
  start: 0
  end: 16
- name: Cuenta la unidad correcta
  start: 16
  end: 32
---
# Qué hace una GPU dentro de un servidor

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

Una GPU es un acelerador. Hace muchas operaciones a la vez. Un servidor es el ordenador en el que se monta. Si abres uno, encontrarás también un procesador principal, llamado CPU, que coordina el trabajo. Dentro hay memoria para guardar datos, conexiones y un sistema de refrigeración.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/01-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/01-b.webp", alt_a="La GPU pasa a la placa y queda dentro del servidor junto al procesador y la memoria.", alt_b="Cuatro servidores con ocho GPU cada uno forman un grupo al conectarse por red.", caption_a="De la GPU a la placa y de la placa al servidor.", caption_b="Cada grupo de ocho pertenece a un servidor.", enlarge_a="Ampliar · La GPU dentro del servidor", enlarge_b="Ampliar · Cuenta la unidad correcta", anim_shell="off") }}

## De una GPU a un grupo de servidores

Un **rack** es un armario que reúne varios servidores. Un **clúster** es un grupo de servidores conectados por una red para repartir trabajos. Un clúster puede ocupar más de un rack. Piensa en el rack como el lugar donde van los servidores y en el clúster como el grupo que puede trabajar junto.

Imagina ocho servidores con ocho GPU cada uno. Tienes **64 GPU y ocho servidores**. Para saber cuántos racks hacen falta todavía necesitas saber cuántos servidores admite cada armario y cómo se alimentan y refrigeran.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/01-que-estamos-fabricando-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · Cuatro servidores tienen ocho GPU cada uno. ¿Cuántas GPU hay?</summary>
  <p>Hay 32 GPU.</p>
</details>

## Fuentes

[NVIDIA · DGX GB Rack Scale Systems](https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html)

Continúa con [Del cuarzo a un disco de silicio](02-mina-material-electronico.md).
