---
title: Cómo se prepara un diseño para fabricar chips
seo_title: Cómo se prepara un diseño para fabricar chips
description: "Del plano a la máscara, sigue cómo se prepara un diseño para que la fábrica pueda grabar sus conexiones."
date: '2026-11-24'
video: 04-diseno-ip-mascaras.mp4
video_poster: 04-diseno-ip-mascaras.jpg
video_title: Cómo se prepara un diseño para fabricar chips
video_summary: "Mueve dos pistas hasta cumplir la separación exigida y sigue su patrón del plano a la máscara."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 04-diseno-ip-mascaras-visual-text.vtt
video_transcript: 04-diseno-ip-mascaras-transcript.html
video_chapters:
- name: Deja espacio entre las pistas
  start: 0
  end: 16
- name: Del dibujo a la máscara
  start: 16
  end: 32
---
# Cómo se prepara un diseño para fabricar chips

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

Antes de tocar una oblea, el equipo decide qué cálculos hará el chip y cómo se organizarán sus circuitos. Con programas especializados sitúa las piezas y dibuja las conexiones entre ellas.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/04-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/04-b.webp", alt_a="Dos pistas demasiado juntas se separan hasta alcanzar el espacio que pide la regla ilustrativa.", alt_b="El patrón sale del plano, queda en una máscara y se proyecta hacia la oblea.", caption_a="La separación mínima viene de la fábrica.", caption_b="Cada máscara lleva el patrón de una capa.", enlarge_a="Ampliar · Deja espacio entre las pistas", enlarge_b="Ampliar · Del dibujo a la máscara", anim_shell="off") }}

## De las reglas de la fábrica a las plantillas

La fábrica entrega un conjunto de reglas y modelos. Por ejemplo, indican cuánto espacio debe haber entre dos pistas para que la máquina pueda fabricarlas por separado. El equipo usa esas reglas para comprobar si puede fabricar el diseño en esa línea.

Una vez comprobado el diseño, se fabrican unas plantillas llamadas **máscaras**. Cada una lleva uno de los patrones. En la máquina de litografía, la luz transfiere el patrón de una máscara a la oblea. Un chip contiene muchas capas, así que hay que preparar los patrones que correspondan a cada una.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/04-diseno-ip-mascaras-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · Cuando la fábrica prepara una capa del chip, ¿qué lleva la plantilla que usa para copiarla?</summary>
  <p>Lleva el patrón del circuito que se quiere copiar sobre la oblea en un paso de la fabricación. Para construir las distintas capas hacen falta varios dibujos.</p>
</details>

## Fuentes

[TSMC · Open Innovation Platform](https://pr.tsmc.com/english/news/1987) · [ASML · How microchips are made](https://www.asml.com/en/technology/all-about-microchips/how-microchips-are-made)

Continúa con [Cómo se fabrican muchos chips en un solo disco](05-oblea-maquinas-fab.md).
