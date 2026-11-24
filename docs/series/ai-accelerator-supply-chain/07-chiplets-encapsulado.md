---
title: Cómo se conectan el chip y la memoria
seo_title: Cómo se conectan el chip y la memoria
description: "Sigue una señal entre el chip y la memoria y compara tres formas de conectar las piezas dentro de un encapsulado."
date: '2026-11-24'
video: 07-chiplets-encapsulado.mp4
video_poster: 07-chiplets-encapsulado.jpg
video_title: Cómo se conectan el chip y la memoria
video_summary: "Una señal recorre una base compartida. Después compara la misma conexión sobre un puente y entre capas."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 07-chiplets-encapsulado-visual-text.vtt
video_transcript: 07-chiplets-encapsulado-transcript.html
video_chapters:
- name: Una base bajo los dos chips
  start: 0
  end: 16
- name: Sigue cada conexión
  start: 16
  end: 32
---
# Cómo se conectan el chip y la memoria

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

Un acelerador puede reunir varias piezas de silicio. Cada pieza se fabrica por separado y cumple una función, como hacer cálculos o guardar datos. El **encapsulado** las sostiene y permite que intercambien señales.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/07-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/07-b.webp", alt_a="El chip y la memoria quedan sobre una base común y una señal cruza entre ambos.", alt_b="Tres cortes comparan una pista a lo largo de la base, un puente local y una unión vertical.", caption_a="La pista cruza por debajo del chip y la memoria.", caption_b="La posición de la conexión distingue las tres soluciones.", enlarge_a="Ampliar · Una base bajo los dos chips", enlarge_b="Ampliar · Sigue cada conexión", anim_shell="off") }}

## Tres maneras de unir las piezas

- **Una base común** lleva pistas entre las piezas. Si la base va entre los chips y el soporte inferior, se suele llamar *interposer*.
- **Un puente** conecta las piezas vecinas en una zona pequeña.
- **Un apilado** coloca piezas unas encima de otras y las conecta en vertical.

Una GPU puede combinar varias de estas soluciones. El diseño tiene que dejar sitio para las conexiones y un camino para sacar el calor. Después del montaje se prueba cómo funcionan juntas las piezas.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/07-chiplets-encapsulado-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · Dos chips están uno junto al otro. ¿Qué puede unir sus bordes en una zona pequeña?</summary>
  <p>Un puente conecta los bordes cercanos.</p>
</details>

## Fuentes

[TSMC · CoWoS](https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm) · [Intel Foundry · Advanced Packaging](https://www.intel.com/content/www/us/en/foundry/packaging.html)

Continúa con [Cómo se prueba una GPU antes del envío](08-sustratos-ensamblaje-pruebas.md).
