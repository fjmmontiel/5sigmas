---
title: Cómo se alimentan y enfrían los servidores
seo_title: Cómo se alimentan y enfrían los servidores
description: "Sigue dos recorridos en un centro de datos: cómo llega la potencia a los racks y cómo sale el calor del edificio."
date: '2026-11-24'
video: 11-electricidad-refrigeracion-obra.mp4
video_poster: 11-electricidad-refrigeracion-obra.jpg
video_title: Cómo se alimentan y enfrían los servidores
video_summary: "Mira cómo entra la corriente al rack y cómo el aire o el líquido llevan el calor del chip hacia el exterior."
video_date: '2026-11-24'
video_duration: PT32S
video_captions: 11-electricidad-refrigeracion-obra-visual-text.vtt
video_transcript: 11-electricidad-refrigeracion-obra-transcript.html
video_chapters:
- name: La electricidad entra
  start: 0
  end: 16
- name: El calor sale
  start: 16
  end: 32
---
# Cómo se alimentan y enfrían los servidores

[De la mina al clúster](00_presentacion_serie.md) · [Atlas](atlas.md)

El rack es el armario que agrupa los servidores. Necesita corriente para funcionar. Cuando los chips trabajan, liberan calor. El edificio tiene que suministrar toda la corriente que necesita el equipo y retirar el calor antes de que su temperatura suba demasiado.

{{ include_html("snippets/ai-accelerator-supply-chain/lesson-visual.html", lesson_a="/assets/images/ai-accelerator-supply-chain/chapters/es/11-a.webp", lesson_b="/assets/images/ai-accelerator-supply-chain/chapters/es/11-b.webp", alt_a="Dentro del total de la instalación aparecen los racks, la refrigeración y otros equipos. La potencia de los racks mide solo el primer grupo.", alt_b="Un corte muestra la electricidad entrando por el transformador y el calor saliendo del edificio. El agua aparece como entrada si el sistema la utiliza.", caption_a="La potencia de los racks es una parte del consumo eléctrico de la instalación.", caption_b="La instalación también alimenta la refrigeración. Algunos diseños necesitan suministro de agua.", enlarge_a="Ampliar · La electricidad entra", enlarge_b="Ampliar · El calor sale", anim_shell="off") }}

## La electricidad llega a los equipos y el calor sale

La corriente llega por la conexión eléctrica. Los transformadores cambian su voltaje y otros equipos la distribuyen hasta los racks.

El calor hace el recorrido de salida. Puede pasar primero al aire o a un líquido, según el servidor. La instalación lleva ese calor hacia el exterior. Si el diseño utiliza agua, hay que contar con los equipos y el suministro que requiere ese circuito. Antes de dar por terminada la instalación se comprueba que ambos recorridos funcionan con carga.

[Ver en formato vertical](/series/ai-accelerator-supply-chain/11-electricidad-refrigeracion-obra-vertical.mp4)

<details class="ac-lesson-check">
  <summary>Pregunta de repaso · Si un servidor recibe corriente, ¿qué trabajo sigue haciendo falta para que pueda seguir trabajando?</summary>
  <p>El calor debe salir del equipo y del edificio. Según el diseño, un sistema de aire o de líquido se encarga de transportarlo.</p>
</details>

## Fuentes

[IEA · Key Questions on Energy and AI](https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary) · [Vertiv · GB200 power and cooling blueprint](https://www.vertiv.com/en-emea/about/news-and-events/news-releases/vertiv-codevelops-with-nvidia-complete-power-and-cooling-blueprint-for--nvidia-gb200-nvl72-platform/)

Continúa con [La primera prueba con los servidores trabajando juntos](12-instalado-utilizable.md).
