---
title: Cómo se apila la memoria de una GPU
seo_title: Cómo se apila la memoria de una GPU
description: "Aprende qué diferencia hay entre capacidad y ancho de banda, y cómo se apila la memoria HBM junto al chip de cálculo."
date: '2026-11-24'
video: 06-cadena-memoria-hbm.mp4
video_poster: 06-cadena-memoria-hbm.jpg
video_title: Cómo se apila la memoria de una GPU
video_summary: "Compara cuánto cabe en memoria y cuánto pasa por segundo. Mira cómo se conectan sus capas en vertical."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 06-cadena-memoria-hbm-visual-text.vtt
video_transcript: 06-cadena-memoria-hbm-transcript.html
video_chapters:
- name: Espacio y velocidad
  start: 0
  end: 16
- name: La memoria crece en altura
  start: 16
  end: 32
---
# Cómo se apila la memoria de una GPU

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

La parte de la GPU que hace los cálculos necesita datos de la memoria. Imagina que vas a cargar un modelo entero en una sola GPU. Sus datos tienen que caber en memoria y después llegar al chip que calcula.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/06-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/06-b.webp", alt_a="Un depósito representa lo que cabe y dos trayectos muestran qué cantidad se mueve en el mismo intervalo.", alt_b="Las capas se apilan, se conectan por columnas y el conjunto queda junto al chip de cálculo.", caption_a="Lo que cabe y lo que se mueve por segundo son medidas distintas.", caption_b="Las columnas metálicas unen las capas de memoria.", enlarge_a="Ampliar · Espacio y velocidad", enlarge_b="Ampliar · La memoria crece en altura", anim_shell="off") }}

## Cuántos datos caben y cuántos se mueven por segundo

La **capacidad** indica cuánto cabe. Se expresa en gigabytes, o GB. El **ancho de banda** indica cuánto puede moverse por segundo. Se expresa, por ejemplo, en gigabytes por segundo, o GB/s.

## La memoria se fabrica aparte y se monta junto al chip

**HBM** significa memoria de alto ancho de banda. Cada pila reúne varios chips de memoria de tipo **DRAM**, unos encima de otros. Así se gana espacio para guardar datos sin extender tanto la base. Conductos metálicos que atraviesan el silicio conectan la pila en vertical. Cuando la memoria se monta al lado del chip de cálculo, muchas pistas cortas permiten que ambos intercambien datos a la vez. La pila se prueba antes de unirla al chip.

### Leer dos fichas de memoria

| GPU | Capacidad HBM4 por GPU | Ancho de banda máximo de memoria |
|---|---:|---:|
| [NVIDIA Rubin](https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/) | Hasta 288 GB | Hasta 22 TB/s |
| [AMD Instinct MI455X](https://www.amd.com/en/products/accelerators/instinct/mi400/mi455x.html) | 432 GB | 23,3 TB/s |

Para saber si caben 300 GB, mira la primera columna numérica. Para ver cuántos datos puede mover la memoria por segundo, mira la segunda. El [atlas](atlas.md) recoge más aceleradores y la procedencia de cada cifra.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/06-cadena-memoria-hbm-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · Un modelo ocupa 50 GB. ¿Qué cifra de la ficha permite saber si cabe en la memoria?</summary>
  <p>La capacidad, medida en GB. Para guardar esos 50 GB hace falta una memoria en la que quepan.</p>
</details>

## Fuentes

[SK hynix · 12-layer HBM3E volume production](https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/) · [Micron · HBM3E](https://www.micron.com/products/memory/hbm/hbm3e)

Continúa con [Cómo se conectan el chip y la memoria](07-chiplets-encapsulado.md).
