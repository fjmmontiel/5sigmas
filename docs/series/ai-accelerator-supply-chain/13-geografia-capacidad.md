---
title: Por qué una pieza puede frenar toda la cadena de suministro
seo_title: Por qué una pieza puede frenar toda la cadena de suministro
description: "Prueba cómo cambia la producción al variar cuántos chips y juegos de memoria llegan a la línea de montaje."
date: '2026-11-24'
video: 13-geografia-capacidad.mp4
video_poster: 13-geografia-capacidad.jpg
video_title: Por qué una pieza puede frenar toda la cadena de suministro
video_summary: "Compara qué pasa cuando faltan juegos de memoria y cuando faltan chips. Las barras muestran cuántos sobran."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 13-geografia-capacidad-visual-text.vtt
video_transcript: 13-geografia-capacidad-transcript.html
video_chapters:
- name: La memoria pone el límite
  start: 0
  end: 16
- name: El límite cambia de sitio
  start: 16
  end: 32
---
# Por qué una pieza puede frenar toda la cadena de suministro

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

Imagina una línea de montaje con 100 chips de cálculo listos. Para montar una GPU, cada chip necesita un conjunto de pilas de memoria adecuadas para ese diseño. Si llegan 60 conjuntos, con esas piezas se pueden montar como máximo 60 GPU.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/13-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/13-b.webp", alt_a="Con 100 chips y 60 juegos de memoria se montan 60 GPU. Quedan 40 chips sin pareja.", alt_b="Con 40 chips y 60 juegos de memoria se montan 40 GPU. Sobran 20 juegos.", caption_a="Quedan 40 chips a la espera de memoria.", caption_b="Quedan 20 juegos de memoria a la espera de chips.", enlarge_a="Ampliar · La memoria pone el límite", enlarge_b="Ampliar · El límite cambia de sitio", anim_shell="off") }}

## Cómo saber qué parte limita el montaje

La memoria es el **cuello de botella**, el paso que fija cuánto puede salir de la línea. Si llegan más conjuntos de memoria, el límite puede pasar al montaje o a las pruebas.

Encontrar otro proveedor ayuda cuando dispone de capacidad y se puede comprobar que su pieza funciona en el mismo diseño. Para entender un retraso, averigua qué falta, dónde se fabrica y cuánto tardaría en llegar una alternativa que funcione.

{{ include_html("snippets/ai-accelerator-supply-chain/bottleneck-demo.html", demo_title="Cambia las piezas disponibles", chips_label="Chips de cálculo", memory_label="Juegos de memoria", assembled_label="GPU que puedes montar", chips_left_label="Chips que sobran", memory_left_label="Juegos que sobran", reset_label="Volver a 100 y 60", anim_shell="off") }}

[Ver en formato vertical](/series/ai-accelerator-supply-chain/13-geografia-capacidad-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · Ahora hay 40 chips de cálculo y memoria para 60. ¿Cuántas GPU completas se pueden montar?</summary>
  <p>Se pueden montar hasta 40. Esta vez el límite lo pone el número de chips. La memoria sobrante podrá usarse cuando lleguen más chips.</p>
</details>

Para ver un caso publicado de capacidad industrial, busca en el [directorio del atlas](atlas.md) la ficha de TSMC y su trabajo de encapsulado.

## Fuentes

[OECD · Mapping the semiconductor value chain](https://www.oecd.org/en/publications/mapping-the-semiconductor-value-chain_4154cdbf-en.html)

Continúa con [Qué se reutiliza y qué se recicla de un servidor](14-segunda-vida.md).
