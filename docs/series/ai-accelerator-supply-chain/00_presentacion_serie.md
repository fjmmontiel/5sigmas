---
title: De la mina al clúster — Cómo se fabrica y se usa una GPU
seo_title: De la mina al clúster — Cómo se fabrica y se usa una GPU
description: De una roca a una GPU en funcionamiento. Sigue el silicio, el cobre, las fábricas, el transporte y lo que se
  recupera al final.
tags:
- Infraestructura
- GPUs
- Semiconductores
date: '2026-11-24'
video: 00_presentacion_serie.mp4
video_poster: 00_presentacion_serie.jpg
video_title: De la mina al clúster
video_summary: "Sigue dos minerales hasta un chip, un servidor y un clúster en marcha. El recorrido termina con la revisión de las piezas retiradas."
video_date: '2026-11-24'
video_duration: PT96S
video_captions: 00_presentacion_serie-visual-text.vtt
video_transcript: 00_presentacion_serie-transcript.html
video_chapters:
- name: Del cuarzo al silicio.
  start: 0
  end: 16
- name: Muchos chips en un solo disco.
  start: 16
  end: 32
- name: El chip se une a la memoria.
  start: 32
  end: 48
- name: La GPU se monta en un servidor.
  start: 48
  end: 64
- name: La GPU trabaja en red.
  start: 64
  end: 80
- name: Reutilizar piezas, recuperar metales.
  start: 80
  end: 96
---
# De la mina al clúster

Una GPU es una pieza que hace muchos cálculos al mismo tiempo. Vamos a seguir una desde el cuarzo del que sale su silicio hasta el día en que se retira el servidor que la aloja.

<nav class="ac-journey-nav" aria-label="Recorrido de la GPU">
  <ol>
    <li><a href="#mine">Mina</a></li>
    <li><a href="#factory">Fábrica</a></li>
    <li><a href="#memory">Montaje</a></li>
    <li><a href="#shipping">Envío</a></li>
    <li><a href="#cluster">Clúster</a></li>
    <li><a href="#recovery">Retirada</a></li>
  </ol>
</nav>
<link rel="stylesheet" href="/assets/stylesheets/ai-accelerator-lifecycle.css">

[Ver en formato vertical](/series/ai-accelerator-supply-chain/00_presentacion_serie-vertical.mp4)

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="mine", stage_title="Del cuarzo sale el silicio del chip", story="Del cuarzo se obtiene el silicio. Tras purificarlo, se funde para hacer crecer un cristal grande. De ese cristal se cortan discos finos que se pulen. Cada disco es una oblea.", picture="wafer", picture_alt="Fragmento de cuarzo junto a un disco de silicio.", picture_caption="Cuarzo y oblea de silicio", handoff="Sobre esa superficie se fabricarán los circuitos de muchos chips a la vez.", source_url="https://www.sumcosi.com/english/products/process/", source_name="SUMCO", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="factory", stage_title="Muchos chips en un solo disco", story="La fábrica repite el diseño del chip sobre la oblea y construye sus circuitos capa por capa. Prueba los chips mientras siguen juntos. Cuando los corta, cada pieza de silicio se llama dado.", picture="fab", picture_alt="Una máquina de sala limpia manipula una oblea de silicio.", picture_caption="Oblea dentro del equipo de fabricación", handoff="Sigamos un chip que ha pasado la prueba. La memoria que le dará los datos se fabrica aparte.", source_url="https://www.asml.com/en/technology/all-about-microchips/how-microchips-are-made", source_name="ASML", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="memory", stage_title="El chip necesita memoria cerca", story="La pieza grande de la ilustración es el chip que calcula. A su lado están las pilas de memoria HBM, que le pasan datos con rapidez. El encapsulado sostiene y conecta las piezas.", picture="package-cutaway", picture_alt="Un chip de cálculo y varias pilas de memoria sobre un soporte común.", picture_caption="Chip y memoria sobre la misma base", handoff="El conjunto se prueba antes de montarlo en un servidor.", source_url="https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm", source_name="TSMC", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="shipping", stage_title="La GPU se monta dentro de un servidor", story="Una placa sostiene la GPU y la conecta con el resto del ordenador. El servidor se embala para el viaje. En el centro de datos se comprueba su estado y se instala en un armario llamado rack.", picture="logistics", picture_alt="Caja industrial asegurada sobre un palé en el muelle de carga.", picture_caption="Equipo embalado para el transporte", handoff="El servidor ya está en su sitio. Ahora necesita corriente, refrigeración y red.", source_url="https://www.dhl.com/us-en/home/technology-logistics/semiconductor-logistics.html", source_name="DHL", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="cluster", stage_title="La red conecta los servidores", story="La electricidad alimenta los equipos. La refrigeración lleva al exterior el calor de los chips. La red permite a varios servidores repartirse una tarea. Ese grupo conectado es un clúster.", picture="rack", picture_alt="Pasillo de centro de datos con armarios de servidores y tuberías de refrigeración.", picture_caption="Armarios de servidores y circuito de refrigeración", handoff="Cuando termina el servicio del equipo, se revisa qué partes pueden seguir funcionando.", source_url="https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary", source_name="IEA", anim_shell="off") }}

{{ include_html("snippets/ai-accelerator-supply-chain/story-plate.html", stage_id="recovery", stage_title="Qué se aprovecha al retirar el equipo", story="Al retirar el servidor se revisan las placas y los módulos. Una pieza que funciona puede pasar a otro equipo. Algunas se pueden reparar. De las piezas que se descartan, un gestor puede recuperar materiales como el cobre.", picture="recovery", picture_alt="Una persona inspecciona una placa de un servidor retirado.", picture_caption="Inspección de una placa retirada", handoff="", source_url="https://www.simslifecycle.com/data-center/data-center-itad/", source_name="Sims Lifecycle Services", anim_shell="off") }}

<span id="accelerator-lifecycle"></span>

## Busca un material, un chip o una empresa

[Materiales y comparación de aceleradores](atlas.md) · [Ver empresas](atlas.md#accelerator-companies)

## Los 14 capítulos, del silicio al reciclaje

**Reconocer las piezas y sus materiales**

- [Qué hace una GPU dentro de un servidor](01-que-estamos-fabricando.md)
- [Del cuarzo a un disco de silicio](02-mina-material-electronico.md)
- [Por qué se limpia cada capa de un chip](03-consumos-fab.md)

**Fabricar y probar el acelerador**

- [Cómo se prepara un diseño para fabricar chips](04-diseno-ip-mascaras.md)
- [Cómo se fabrican muchos chips en un solo disco](05-oblea-maquinas-fab.md)
- [Cómo se apila la memoria de una GPU](06-cadena-memoria-hbm.md)
- [Cómo se conectan el chip y la memoria](07-chiplets-encapsulado.md)
- [Cómo se prueba una GPU antes del envío](08-sustratos-ensamblaje-pruebas.md)

**Montar y poner a trabajar los servidores**

- [Cómo se monta una GPU dentro de un servidor](09-paquete-sistema.md)
- [Cómo intercambian datos las GPU](10-red-cluster.md)
- [Cómo se alimentan y enfrían los servidores](11-electricidad-refrigeracion-obra.md)
- [La primera prueba con los servidores trabajando juntos](12-instalado-utilizable.md)
- [Por qué una pieza puede frenar toda la cadena de suministro](13-geografia-capacidad.md)

**Volver a usar piezas y recuperar materiales**

- [Qué se reutiliza y qué se recicla de un servidor](14-segunda-vida.md)
