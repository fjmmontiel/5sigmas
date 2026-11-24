---
title: Cómo intercambian datos las GPU
seo_title: Cómo intercambian datos las GPU
description: "Sigue un dato dentro de la GPU, entre GPU del mismo servidor y entre racks. Distingue la latencia del ancho de banda."
date: '2026-11-24'
video: 10-red-cluster.mp4
video_poster: 10-red-cluster.jpg
video_title: Cómo intercambian datos las GPU
video_summary: "Sigue una señal por tres escalas. Dos líneas de tiempo muestran la primera llegada y cuántos datos llegan."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 10-red-cluster-visual-text.vtt
video_transcript: 10-red-cluster-transcript.html
video_chapters:
- name: La distancia cambia la ruta
  start: 0
  end: 16
- name: Llegada y caudal
  start: 16
  end: 32
---
# Cómo intercambian datos las GPU

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

Imagina que dos GPU calculan partes distintas de una tarea. Cuando tienen que juntar sus resultados, necesitan intercambiar datos. El camino de esos datos depende de dónde están las dos GPU.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/10-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/10-b.webp", alt_a="La señal viaja entre cálculo y memoria, entre GPU de un servidor y entre servidores de distintos racks.", alt_b="Dos líneas de tiempo muestran que el primer dato puede llegar pronto aunque lleguen menos datos en el intervalo.", caption_a="El recorrido crece del encapsulado a la red del clúster.", caption_b="La fila de arriba llega primero. La de abajo entrega más datos.", enlarge_a="Ampliar · La distancia cambia la ruta", enlarge_b="Ampliar · Llegada y caudal", anim_shell="off") }}

## Conexiones dentro de la GPU, dentro del servidor y entre racks

Dentro de un encapsulado, los datos recorren pistas cortas entre las piezas. Dentro de un servidor, las GPU pueden comunicarse por enlaces directos. Entre servidores o racks, los conmutadores dirigen los datos por la red. Según el diseño se usan conexiones de cobre, fibra óptica o ambas.

La **latencia** es el tiempo que tarda un mensaje en llegar. El **ancho de banda** es cuánto se puede enviar en un intervalo. Una tarea que intercambia resultados a menudo depende de las dos cosas.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/10-red-cluster-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · Una conexión tarda poco en entregar el primer dato, pero lleva pocos datos cada segundo. ¿Qué medida describe cada propiedad?</summary>
  <p>El tiempo que tarda en llegar el primer dato es la latencia. La cantidad que puede mover por segundo es el ancho de banda.</p>
</details>

## Fuentes

[NVIDIA · DGX GB Rack Scale Systems](https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html) · [UALink Consortium · Specification](https://ualinkconsortium.org/specification/)

Continúa con [Cómo se alimentan y enfrían los servidores](11-electricidad-refrigeracion-obra.md).
