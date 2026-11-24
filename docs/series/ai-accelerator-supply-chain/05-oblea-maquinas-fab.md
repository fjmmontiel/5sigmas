---
title: Cómo se fabrican muchos chips en un solo disco
seo_title: Cómo se fabrican muchos chips en un solo disco
description: "Mira cómo la litografía forma capas en una oblea y cómo se comprueba cuántos chips funcionan antes de cortarlos."
date: '2026-11-24'
video: 05-oblea-maquinas-fab.mp4
video_poster: 05-oblea-maquinas-fab.jpg
video_title: Cómo se fabrican muchos chips en un solo disco
video_summary: "La luz marca un recubrimiento. Descubre qué zonas protege y cuenta qué chips pasan la prueba eléctrica."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 05-oblea-maquinas-fab-visual-text.vtt
video_transcript: 05-oblea-maquinas-fab-transcript.html
video_chapters:
- name: La luz dibuja el patrón
  start: 0
  end: 16
- name: Un patrón para muchos chips
  start: 16
  end: 32
---
# Cómo se fabrican muchos chips en un solo disco

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

La fábrica empieza con un disco de silicio pulido. Sobre él repite un mismo diseño en muchas posiciones. Así puede fabricar muchos chips a la vez en una sola **oblea**.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/05-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/05-b.webp", alt_a="Tres cortes de la misma capa muestran el recubrimiento entero, una abertura en el recubrimiento y la zona donde se retira material.", alt_b="Una cuadrícula de 100 posiciones pasa de patrón repetido a 75 resultados correctos y 25 fallos en un ejemplo.", caption_a="La abertura deja al descubierto solo la zona que se va a retirar.", caption_b="La prueba cuenta cuántas posiciones funcionan.", enlarge_a="Ampliar · La luz dibuja el patrón", enlarge_b="Ampliar · Un patrón para muchos chips", anim_shell="off") }}

## Copiar un dibujo, quitar material y repetir

La fábrica añade una película de material y la cubre con un recubrimiento sensible a la luz. Una máquina ilumina el recubrimiento con el dibujo de una plantilla llamada máscara. Esa operación se llama **litografía**. Al lavar la oblea, solamente queda parte del recubrimiento. Esa parte protege las zonas que deben conservarse mientras se retira el material expuesto. Al repetir operaciones de este tipo, los circuitos y sus conexiones se construyen capa a capa.

Durante la fabricación se mide el tamaño de lo que se ha construido y se buscan defectos. Al final se hace una prueba eléctrica. Si en un ejemplo funcionan 75 de 100 chips, el **rendimiento de esa prueba** es del 75 %. Indica qué parte de los chips probados funciona.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/05-oblea-maquinas-fab-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · En otra oblea se prueban 100 chips y funcionan 82. ¿Cuál es el rendimiento de esa prueba?</summary>
  <p>El rendimiento es del 82 %. Es la proporción de chips que funcionan entre todos los que se probaron.</p>
</details>

## Fuentes

[ASML · How microchips are made](https://www.asml.com/en/technology/all-about-microchips/how-microchips-are-made)

Continúa con [Cómo se apila la memoria de una GPU](06-cadena-memoria-hbm.md).
