# (5.6) Data centers en el espacio: por qué suena lógico, por qué es difícil, y dónde sí podría tener sentido

## TL;DR (sin hype)

* La idea reaparece ahora por un cuello de botella real: **electricidad, agua y red** para data centers en tierra, acelerado por IA. ([IEA][1])
* “En el espacio hace frío” es una **media verdad**: en vacío **no hay convección**, así que la disipación depende de **radiadores** y radiación térmica. ([NASA][2])
* Lo más sólido a corto/medio plazo no es “reemplazar hyperscalers”, sino **edge compute** para datos espaciales (p. ej. satélites) y **almacenamiento tipo disaster recovery**. ([European Space Agency][3])
* Ya hay pilotos/POCs reales en marcha (ISS, Luna) y programas institucionales evaluándolo (ESA, UE/ASCEND). ([ISS National Lab][4])
* El “make or break” técnico-económico es triple: **energía**, **rechazo de calor**, **conectividad**; y el “make or break” ambiental suele ser el **ciclo de vida del lanzamiento**. ([Thales Alenia Space][5])

---

<details>
<summary>Capa técnica</summary>

* Potencia continua: estabilidad eléctrica y degradación por radiación.
* Disipación: radiadores con área/masa relevantes a escala MW.
* Conectividad: ventanas de visibilidad, estaciones, latencia y backhaul.
* Tolerancia a fallos: mantenimiento limitado y necesidad de redundancia.
* Riesgo orbital: colisiones, basura espacial y maniobras.
</details>

## 1) Por qué esta idea está sobre la mesa (ahora)

Después de entender en las series anteriores que “IA = cómputo + datos + objetivos” y que GenAI está empujando la demanda de inferencia/entrenamiento, la pregunta natural es: **¿dónde metemos físicamente el cómputo?**

Tres presiones convergen:

1. **Electricidad**: la IEA estima ~**415 TWh** de consumo eléctrico de data centers en 2024 (~1,5% global) y proyecta que la demanda **más que se duplicará** hacia 2030 (en torno a **945 TWh**), con IA como driver principal. ([IEA][1])
2. **Red/infra**: hay congestión y colas de conexión a red en múltiples países; esto ralentiza despliegues y encarece proyectos. ([ember-energy.org][6])
3. **Agua y calor**: una parte relevante del enfriamiento en tierra compite con agua/energía locales; no es uniforme, pero la presión existe y ya aparece en debate público y regulatorio. ([Undark Magazine][7])

Con ese fondo, “poner compute fuera” aparece como propuesta: si la restricción es local (red/agua/terreno), moverla a otra “localidad” puede sonar tentador.

---

## 2) Qué significa realmente “data center en el espacio”

Conviene separar 3 cosas muy distintas (y muchas noticias las mezclan):

1. **Compute/almacenamiento en órbita (LEO/MEO/GEO)**: “nodos” con potencia limitada (kW–decenas de kW en primeras fases), orientados a procesar datos espaciales o servicios específicos.
2. **Data center lunar**: más cercano a “almacenamiento de muy alta resiliencia” que a cloud interactivo (latencia enorme). Reuters lo describe explícitamente como enfoque de **disaster recovery**. ([Reuters][8])
3. **Megaproyectos a escala GW**: visiones a muy largo plazo (décadas) que dependen de lanzadores y ensamblaje orbital altamente industrializado.

La ESA, por ejemplo, enmarca la motivación como: **se acumula cada vez más dato en órbita** y bajarlo a Tierra es un cuello de botella; procesar “arriba” puede reducir lo que hay que descargar. ([European Space Agency][3])

---

## 3) Señales de que no es solo ciencia ficción (ejemplos reales)

Hay iniciativas con distinta seriedad/madurez:

* **ISS / “orbital edge” con contenedores**: demostración patrocinada por ISS National Lab con Axiom Space y Red Hat para ampliar capacidades de cómputo en órbita (AxDCU-1), orientada a operar software de forma robusta en entorno espacial. ([ISS National Lab][4])
* **Luna / storage y prueba comercial**: Lonestar reportó pruebas de almacenamiento en superficie lunar (IM-1, 2024) y planes posteriores (Freedom, 2025). ([PR Newswire][9])
* **Programas institucionales**: ESA ha publicado material y estudios sobre “space-based data centres” y compute distribuido en órbita. ([nebula.esa.int][10])
* **UE / ASCEND (Horizon Europe)**: estudio de viabilidad liderado por Thales Alenia Space, con foco explícito en factibilidad y beneficios ambientales; y una condición clave: para que el balance ambiental cierre, haría falta un **lanzador ~10× menos emisivo** en su ciclo de vida. ([cordis.europa.eu][11])

También hay whitepapers de startups defendiendo el caso (útiles para números/intuición, pero hay que tratarlos como parte interesada). ([lumenorbit.github.io][12])

---

## 4) El núcleo técnico: energía, calor y conectividad (mitos vs realidad)

### A) Energía (no es solo “pon paneles y listo”)

En órbita tienes **solar abundante** (según órbita y eclipses), pero:

* necesitas **conversión** (DC/DC), **baterías**, degradación por radiación,
* y sobre todo: **potencia continua** estable para cargas tipo data center no es trivial.

Esto no lo mata, pero lo desplaza a ingeniería de potencia espacial (más cercana a satélite que a edificio).

### B) Calor: “en el espacio hace frío” no significa “enfriar es gratis”

En vacío, el calor sale **por conducción interna** y luego **por radiación** al exterior; **no hay convección** como en aire. ([NASA][2])

Consecuencia: necesitas **radiadores** con área significativa. Un cálculo rápido para fijar intuición:

* Si tienes **1 MW** de calor a evacuar (orden de magnitud de un módulo pequeño de data center), incluso con emisividad alta, radiar a ~300 K exige **miles de m²** de radiador. (Subir temperatura reduce el área, pero choca con límites de electrónica y eficiencia).

Esto es el “coste oculto” del argumento “sin agua para enfriar”: sí, no usas agua, pero pagas con **área/masa/estructura** de radiadores y control térmico.

### C) Conectividad: el cuello de botella cambia de sitio

Si el compute está en órbita y el usuario/cliente está en tierra, dependes de:

* enlaces (RF o láser),
* ventanas de visibilidad (LEO),
* estaciones terrestres,
* y latencia extra.

Donde sí cuadra mejor es cuando **los productores/consumidores del dato también están en órbita**: Earth Observation, constelaciones, vigilancia marítima, etc. (procesas arriba, bajas solo “insights”). ESA lo menciona como motivación central. ([European Space Agency][3])

---

## 5) Dónde SÍ podría tener sentido (casos de uso “con lógica física”)

1. **Edge compute para satélites (reducción de downlink)**

   * Multimodalidad real: imagen/vídeo/radar/telemetría.
   * “Compute cerca del sensor” reduce ancho de banda y acelera decisiones (detección de incendios, seguimiento, anomalías). ([European Space Agency][3])

2. **Almacenamiento de alta resiliencia / disaster recovery**

   * Si tu objetivo no es latencia, sino supervivencia ante desastres/geopolítica, la Luna/órbita pueden ser “otra jurisdicción física”. Reuters enmarca así el caso de Lonestar. ([Reuters][8])

3. **Soberanía y autonomía operativa (en ciertos contextos)**

   * No por magia, sino por control de cadena de suministro/infraestructura y rutas de datos (tema explícito en iniciativas europeas). ([cordis.europa.eu][11])

4. **Compute para misiones espaciales (ciencia/biomedicina/operaciones)**

   * La demo de ISS apunta a operar software robusto en órbita, con despliegues y rollbacks tipo edge/Kubernetes ligero. ([ISS National Lab][4])

---

## 6) Dónde NO encaja (o encaja mal) aunque suene bien

* **Entrenar LLMs gigantes en órbita** como alternativa a hyperscalers terrestres (a corto plazo): por masa, potencia, radiadores, mantenimiento, fallos, y por el hecho de que el pipeline de datos/operación sigue estando principalmente en Tierra.
* **Serving interactivo masivo para usuarios en tierra**: puedes hacerlo, pero la conectividad/latencia/capacidad te penaliza; el valor diferencial es bajo salvo casos extremos.

---

## 7) Riesgos y fricciones (los “costes de realidad”)

* **Basura espacial y colisiones**: cualquier infraestructura grande aumenta superficie, maniobras y riesgo.
* **Radiación**: afecta a memoria/semiconductores, aumenta necesidad de tolerancia a fallos.
* **Mantenimiento**: “no puedes mandar un técnico” como en un data center. Requiere automatización y diseño para degradación.
* **Huella ambiental real**: ASCEND subraya que el beneficio climático depende críticamente del **lanzador** y su ciclo de vida. ([Thales Alenia Space][5])

---

## 8) Cómo evaluar titulares a partir de ahora (checklist anti-humo)

Cuando leas “data centers en el espacio”, intenta obtener respuestas concretas a estas 10 preguntas:

1. **Órbita o Luna?** (LEO/MEO/GEO vs superficie lunar)
2. **Caso de uso primario**: ¿edge espacial o usuarios en tierra?
3. **Potencia continua (kW/MW)**: ¿cuánta y con qué perfil?
4. **Cómo evacúan el calor**: ¿área de radiadores y temperatura de operación?
5. **Conectividad**: ¿a qué tasa real y con qué disponibilidad?
6. **Operación**: ¿actualizaciones, rollbacks, monitorización, fallos? (pista: enfoques tipo edge robusto en ISS). ([ISS National Lab][4])
7. **Seguridad**: ¿amenazas específicas (jamming, spoofing, supply chain)?
8. **Economía**: ¿$/kW entregado, $/GB bajado, coste por lanzamiento?
9. **Ambiental (ciclo de vida)**: ¿qué asumen sobre emisiones del lanzamiento? (ASCEND: condición fuerte). ([Thales Alenia Space][5])
10. **Roadmap honesto**: ¿demo → piloto → operación comercial, con fechas y escalado?

---

## 9) Cierre: cómo encaja con todo lo anterior

Si has leído las series previas, esta “tendencia” se entiende como una consecuencia de primer orden:

* **GenAI empuja cómputo**, y el cómputo choca con **energía/infra/agua** en tierra. ([IEA][1])
* La multimodalidad (observación de la Tierra, sensores) produce datos donde **procesar arriba** puede ser más lógico que “bajar todo”. ([European Space Agency][3])
* Y, si además aceptas que “más test-time compute” mejora calidad en ciertas tareas, mover parte de ese TTC al borde (incluso en órbita) es una extensión natural del diseño de sistemas: **dónde computas** importa tanto como **cuánto computas**.

- [Reuters](https://www.reuters.com/technology/space/lonestars-moonshot-firm-aims-place-data-center-lunar-surface-2025-01-21/?utm_source=chatgpt.com)
- [marketwatch.com](https://www.marketwatch.com/story/space-based-data-centers-could-work-european-study-finds-2cdf5e79?utm_source=chatgpt.com)
- [expressnews.com](https://www.expressnews.com/business/article/data-centers-space-lonestar-data-holdings-20275795.php?utm_source=chatgpt.com)

[1]: https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai?utm_source=chatgpt.com "Energy demand from AI"
[2]: https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/?utm_source=chatgpt.com "7.0 Thermal Control"
[3]: https://www.esa.int/Enabling_Support/Preparing_for_the_Future/Discovery_and_Preparation/Knowledge_beyond_our_planet_space-based_data_centres?utm_source=chatgpt.com "Knowledge beyond our planet: space-based data centres"
[4]: https://issnationallab.org/press-releases/orbital-data-center-launching-to-iss-to-advance-space-computing/?utm_source=chatgpt.com "Orbital Data Center Launching to ISS to Advance Space ..."
[5]: https://www.thalesaleniaspace.com/en/press-releases/thales-alenia-space-reveals-results-ascend-feasibility-study-space-data-centers-0?utm_source=chatgpt.com "Thales Alenia Space reveals results of ASCEND feasibility ..."
[6]: https://ember-energy.org/app/uploads/2025/06/Grids-for-data-centres-in-Europe.pdf?utm_source=chatgpt.com "Grids for data centres in Europe - Ember Energy"
[7]: https://undark.org/2025/12/16/ai-data-centers-water/?utm_source=chatgpt.com "How Much Water Do AI Data Centers Really Use?"
[8]: https://www.reuters.com/technology/space/lonestars-moonshot-firm-aims-place-data-center-lunar-surface-2025-01-21/?utm_source=chatgpt.com "Lonestar's moonshot: Firm aims to place data center on lunar surface"
[9]: https://www.prnewswire.com/news-releases/lonestar-data-holdings-independence-payload-makes-history-with-successful-test-of-data-storage-concept-from-the-surface-of-the-moon-302074489.html?utm_source=chatgpt.com "Lonestar Data Holdings Independence Payload Makes ..."
[10]: https://nebula.esa.int/sites/default/files/2025-01/C4000139754_ExS.pdf?utm_source=chatgpt.com "SPACE-BASED DATA CENTRES – Study"
[11]: https://cordis.europa.eu/project/id/101082517?utm_source=chatgpt.com "Advanced Space Cloud for European Net zero emissions and ..."
[12]: https://lumenorbit.github.io/wp.pdf?utm_source=chatgpt.com "Why we should train AI in space - White Paper"
