---
title: Cómo se prueba una GPU antes del envío
seo_title: Cómo se prueba una GPU antes del envío
description: "Mira qué se puede probar con una sonda en la oblea y qué fallos aparecen al unir el chip con su memoria."
date: '2026-11-24'
video: 08-sustratos-ensamblaje-pruebas.mp4
video_poster: 08-sustratos-ensamblaje-pruebas.jpg
video_title: Cómo se prueba una GPU antes del envío
video_summary: "Una sonda toca los contactos de un chip. Tras unirlo a la memoria, sigue la señal hasta un contacto abierto."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 08-sustratos-ensamblaje-pruebas-visual-text.vtt
video_transcript: 08-sustratos-ensamblaje-pruebas-transcript.html
video_chapters:
- name: Probar antes de cortar
  start: 0
  end: 16
- name: Probar la conexión
  start: 16
  end: 32
---
# Cómo se prueba una GPU antes del envío

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

Mientras los chips siguen juntos en la oblea, una tarjeta con sondas toca sus contactos. La máquina envía señales y comprueba la respuesta. Así se identifica qué chips conviene separar y enviar a montaje.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/08-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/08-b.webp", alt_a="Una sonda recorre la oblea y marca el chip que supera la prueba eléctrica.", alt_b="Las piezas pasan por separado; después la señal se detiene en el contacto abierto del ensamblaje.", caption_a="La sonda comprueba los chips antes de separarlos.", caption_b="El fallo está en una unión añadida al montar las piezas.", enlarge_a="Ampliar · Probar antes de cortar", enlarge_b="Ampliar · Probar la conexión", anim_shell="off") }}

## Qué puede fallar después de unir las piezas

Un chip puede funcionar por separado y fallar después de unirlo a la memoria. En la segunda prueba se comprueba el conjunto. Si un contacto ha quedado abierto, los datos pueden dejar de pasar aunque las dos piezas hayan superado sus pruebas individuales.

Según el equipo, también se comprueba si el acelerador trabaja a determinadas velocidades, potencias y temperaturas. Cuando el fabricante clasifica las piezas por los resultados, ese paso se conoce como *binning*.

### Qué comprueba cada prueba

| Cuándo | Qué se prueba | Qué puede descubrir |
|---|---|---|
| Antes de cortar | Un chip en la oblea | El circuito no responde a la sonda. |
| Después del montaje | El chip unido a la memoria | Un contacto abierto interrumpe la señal. |
| Con el equipo funcionando | El acelerador con carga | El equipo da errores a una temperatura de prueba. |

[Ver en formato vertical](/series/ai-accelerator-supply-chain/08-sustratos-ensamblaje-pruebas-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · Un chip y una pila de memoria pasan sus pruebas por separado. ¿Qué puede descubrir una prueba del conjunto?</summary>
  <p>Puede detectar un fallo en las conexiones que se hicieron al montar las dos piezas. Por ejemplo, un contacto abierto puede impedir que pasen los datos.</p>
</details>

## Fuentes

[Amkor · Semiconductor Test Services](https://amkor.com/test-services/) · [Teradyne · Magnum 7H](https://www.teradyne.com/products/magnum-7h/)

Continúa con [Cómo se monta una GPU dentro de un servidor](09-paquete-sistema.md).
