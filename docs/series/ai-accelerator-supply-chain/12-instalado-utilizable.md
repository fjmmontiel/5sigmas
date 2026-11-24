---
title: La primera prueba con los servidores trabajando juntos
seo_title: La primera prueba con los servidores trabajando juntos
description: "Enciende los servidores, verifica que se detectan las GPU y sigue la primera prueba que reparte trabajo entre los equipos."
date: '2026-11-24'
video: 12-instalado-utilizable.mp4
video_poster: 12-instalado-utilizable.jpg
video_title: La primera prueba con los servidores trabajando juntos
video_summary: "Sigue un servidor desde el encendido hasta la prueba y mira cómo se combinan los resultados de tres equipos."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 12-instalado-utilizable-visual-text.vtt
video_transcript: 12-instalado-utilizable-transcript.html
video_chapters:
- name: Encender y detectar
  start: 0
  end: 16
- name: Una tarea entre servidores
  start: 16
  end: 32
---
# La primera prueba con los servidores trabajando juntos

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

Con los servidores montados, el equipo de instalación los enciende y comprueba que aparecen todas las GPU. A continuación configura el software que controla las piezas y conecta las máquinas entre sí.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/12-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/12-b.webp", alt_a="Los servidores instalados se encienden y pasan de detectados a preparados para una prueba.", alt_b="Una tarea se reparte entre tres servidores. Los resultados se unen y se comprueban.", caption_a="Detectar una GPU es un paso previo a probarla con carga.", caption_b="Los resultados de cada servidor deben poder reunirse.", enlarge_a="Ampliar · Encender y detectar", enlarge_b="Ampliar · Una tarea entre servidores", anim_shell="off") }}

## Qué mide una tarea de prueba en varios servidores

El equipo puede ejecutar un trabajo de prueba en varios servidores a la vez. Así observa si las GPU reciben datos, si la red permite que se repartan el trabajo y si la refrigeración mantiene el equipo dentro de los límites previstos.

La **aceptación** consiste en comprobar que el sistema cumple las condiciones acordadas. Después, el operador puede ofrecer esa capacidad a quien necesite ejecutar trabajos. Un servidor encendido es una comprobación. Un trabajo repartido entre servidores prueba que el conjunto ya puede hacer algo útil.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/12-instalado-utilizable-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · ¿Por qué se ejecuta una tarea en varios servidores antes de abrir el centro de datos a los usuarios?</summary>
  <p>La tarea comprueba si los servidores intercambian datos y trabajan juntos mientras la instalación les da corriente y extrae el calor.</p>
</details>

## Fuentes

[AWS · Amazon EC2 Trn3 UltraServers](https://aws.amazon.com/ec2/instance-types/trn3/)

Continúa con [Por qué una pieza puede frenar toda la cadena de suministro](13-geografia-capacidad.md).
