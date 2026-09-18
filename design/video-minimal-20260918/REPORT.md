# 5sigmas — auditoría visual y piloto de vídeo

Fecha: 18 de septiembre de 2026. Estado: propuesta de revisión, no publicada.

## Decisión

Adoptar una línea **editorial técnica monocroma**: los mismos fondos planos, Inter, jerarquía tipográfica y separadores discretos de la web, con diagramas suficientemente grandes para explicar lo que ocurre. No resolver el problema quitando texto. Quitar decoración y dedicar su espacio a relaciones, pasos, comparaciones y datos comprobables.

El vídeo debe parecer una explicación de 5sigmas en movimiento, no una diapositiva con una estética tecnológica independiente.

## Alcance real de la revisión

Se rastrearon los sitemaps español e inglés, sus alternates y los enlaces internos de documentos en dos niveles adicionales: **314 rutas públicas, 157 por idioma**. Todas devolvieron HTTP 200 y se renderizaron en Chromium a 1440 × 1000 y 390 × 844. La comprobación geométrica no encontró desbordamiento horizontal de página a 390 px. Hay 184 páginas con elementos `video` y 91 URLs MP4 distintas; estas URLs no equivalen necesariamente a 91 contenidos únicos, por lo que el inventario también incluye hashes.

Además del rastreo, se inspeccionaron fuentes de estilos y de generación de vídeo, se extrajeron cuatro fotogramas de cada uno de los 91 MP4 versionados y se revisaron fotogramas representativos de las familias visuales. El piloto español se inspeccionó a lo largo de sus siete escenas. **Esto no equivale a haber reproducido de principio a fin todos los vídeos, ni a haber realizado una auditoría completa de accesibilidad, SEO o compatibilidad con Safari.**

La primera pasada solo cubría principalmente español y falló al intentar capturar vídeos intencionalmente ocultos dentro de desplegables. Esa pasada no se utiliza para afirmar cobertura móvil completa: la segunda corrigió ambas limitaciones y terminó con cero errores de captura en escritorio y móvil.

El detalle por URL está en `inventario-paginas.html`, `.csv` y `.json`. `cobertura-validada.json` contiene los recuentos derivados; `inventario-videos.json` contiene duración, streams y hash de cada archivo localizado. La detección de degradados cuenta estilos CSS de elementos con dimensiones de layout, no los degradados grabados dentro del MP4, y no considera automáticamente decorativo todo gradiente detectado.

## Hallazgos

### 1. La base de la web y los vídeos pertenecen a dos sistemas distintos

`docs/stylesheets/revamp.css` define blanco `#ffffff`, negro `#111111`, gris de texto `#666666`, superficie `#f7f7f7`, divisores `#dedede` e Inter. Sin embargo, gran parte de los vídeos conserva fondos oscuros degradados, variantes de color por serie, glifos enmarcados, tipografía de mucho peso y detalles pequeños.

No es un problema que pueda arreglarse únicamente con CSS: el fondo, el título y el icono ya están rasterizados dentro del vídeo. Cambiar el contenedor dejaría intacto el desacuerdo visual principal.

### 2. Persisten envoltorios de animación del sistema anterior

También hay estilos con gradientes en componentes como `anim-brand-shell` y `s5v__canvas`. Por tanto, la coherencia requiere trabajar en tres capas: contenido del MP4, póster/miniatura y contenedor o módulo interactivo. Cambiar solo una mantiene las otras dos desalineadas.

No conviene aplicar una regla global indiscriminada que elimine cualquier `linear-gradient`: un mapa de intensidad puede usar una escala continua para representar una magnitud. Se debe retirar el gradiente de decoración, no destruir una codificación de datos.

### 3. Algunos gráficos son plantillas ornamentales, no representaciones del tema

En `scripts/regenerate_p0_compact_videos.py`, una familia de vídeos usa barras con valores constantes `[0.42, 0.70, 0.88, 0.58]`, etiquetas A/B/C/D y otras figuras genéricas. La curva también se calcula a partir de una fórmula fija. Esos datos no proceden del contenido explicado. Esto es un hallazgo de ese generador, no una afirmación sobre todos los vídeos.

Su problema no es solo el color. Una versión monocroma de las mismas barras seguiría siendo un gráfico sin información pertinente. Debe sustituirse por un mecanismo explícito o por datos con fuente, unidades y significado.

### 4. El espacio visual no está al servicio de la explicación

En el piloto actual, el titular tiene un peso visual enorme mientras el mecanismo queda encerrado en un gráfico pequeño. La propuesta mantiene los siete títulos y las seis explicaciones, reduce el peso tipográfico y amplía el área explicativa. No convierte el vídeo en titulares sueltos ni en una secuencia de frases vacías.

El texto principal transcrito del original suma aproximadamente 300 palabras; el del prototipo suma 351, sin contar las etiquetas del diagrama. La solución no ha sido recortar. Para la migración completa conviene ajustar el ritmo por escena a su carga real, no copiar una duración fija para todos los capítulos.

### 5. Movimiento decorativo y movimiento explicativo no son equivalentes

El generador compacto introduce un zoom suave de cámara sobre imágenes estáticas. Ese movimiento no explica ningún cambio de estado. La propuesta deja estable el texto y anima únicamente operaciones: avanzar un paso, generar candidatos, reunir votos, descartar una rama o completar una línea temporal.

El estado final permanece visible. No hay zoom global, partículas, brillos, desplazamientos de lectura ni animación permanente de fondo. La reproducción comienza por decisión del usuario, no automáticamente.

### 6. Hay metadatos que no coinciden con el medio

El MP4 español de Test-Time Compute dura **71,3667 segundos** y tiene una única pista de vídeo, sin audio. La página y el frontmatter consultados anuncian **1:29 / PT1M29S**. El archivo público y el versionado se compararon por SHA-256 y coincidían: `bdc30289cc7addf6e376eede3d3214736bfa282e2a0bf6ef09bb753f6d431c12`.

La portada del original también identifica erróneamente el contenido como «De la cueva a la AGI · capítulo 3». La propuesta lo identifica como «Modelos razonadores · capítulo 3».

Al regenerar no basta con subir un MP4: deben actualizarse su póster, la duración, los momentos clave y los metadatos derivados. No se debe convertir la ausencia de locución en un bloqueo artificial de esta revisión visual.

## Aplicación por familia de páginas

| Familia | Conservar | Cambiar |
|---|---|---|
| Inicio | Jerarquía editorial, navegación, foco en contenido | Póster y vídeo destacado de la misma fuente visual; sin portadas de una estética distinta |
| Biblioteca de vídeos | Títulos, enlaces, agrupación y datos útiles | Miniaturas coherentes extraídas del render; duración real; retirar decoración cromática por serie |
| Páginas individuales de vídeo | Reproductor accesible, contexto, artículo relacionado | MP4, póster y marco; sin sombras pesadas ni degradados de contenedor |
| Hub visual | Demostraciones e interactividad | Igualar tokens y geometría entre vídeos y módulos; conservar información y estados |
| Series y capítulos | Texto completo, estructura, navegación | Embeds, póster y envoltorios de diagramas; no simplificar el artículo para acomodar una plantilla |
| Presentaciones de serie | Mapa conceptual y progresión de capítulos | Usar relaciones reales en lugar de grandes glifos o emblemas |
| Herramientas | Cálculos, unidades, entradas, resultados y leyendas | Reducir decoración; conservar color cuando represente una variable o estado que lo justifique |
| Conceptos | Definiciones, ejemplos y relaciones | Reutilizar el mismo sistema de diagramas y estados de los vídeos |
| Ingeniería | Capturas reales, trazas y pruebas de funcionamiento | Portada editorial y encuadre consistente; no sustituir evidencia de interfaz por una ilustración |
| Otras páginas | Base tipográfica minimalista | No introducir cambios sin un problema concreto observado |

Cada ruta tiene su familia y una acción propuesta en el inventario. Las rutas sin vídeo no reciben por defecto una orden de crear uno.

## Especificación visual escogida

**Fondos y color.** Fondo blanco plano para la exportación principal. Texto principal `#111111`, secundario `#666666`. Divisores editoriales `#dedede`. Las conexiones que transmiten información usan negro o un gris más contrastado (`#888888` en el prototipo), no el gris tenue del separador. Cero fondos ornamentales degradados. El color solo se introduce cuando representa una variable o un estado y debe acompañarse de una etiqueta o forma.

**Tipografía.** Inter, pesos regulares y medios, con encabezados semibold. En el piloto 1920 × 1080: títulos de contenido de 72 px, cuerpo de 36 px, etiquetas del mecanismo generalmente de 24–51 px. El título de portada puede ser mayor porque cumple una función distinta. Nunca truncar texto con puntos suspensivos para que quepa: un desbordamiento debe detener el render o exigir otra composición.

**Composición.** Retícula estable y márgenes amplios. El texto conserva su explicación; el diagrama obtiene un área propia suficientemente grande. Las cajas solo se usan cuando representan una entidad, elección o resultado; no se añade una tarjeta dentro de otra tarjeta para decorar. Pie y firma pequeños, sin competir con el contenido.

**Diagramas.** Todo nodo, arista, barra, eje o cambio debe poder responder a «¿qué representa?». Las simulaciones se identifican como ilustrativas. Los gráficos numéricos llevan fuente y unidades. No se reutiliza una curva o un conjunto de barras arbitrario como emblema del tema.

**Movimiento.** Texto estable desde el inicio de la escena. Animación finita del mecanismo y tiempo de observación posterior. Los cambios de escena son cortes limpios. La configuración de movimiento reducido debe evitar la reproducción automática y ofrecer un póster y una explicación equivalente; CSS no puede modificar por sí solo los fotogramas internos de un MP4.

**Modo oscuro.** La web ya tiene tokens para fondo `#111111`, superficie `#191919`, texto `#f5f5f5`, texto secundario `#a8a8a8` y línea `#343434`. Una futura exportación oscura debe regenerarse desde los mismos componentes con esos tokens, no aplicar un filtro de inversión a una grabación real. El piloto entregado es la exportación clara. El botón oscuro del comparador cambia su entorno, no finge adaptar el archivo.

**Móvil.** Un vídeo 16:9 con todo este texto no se vuelve legible en una columna de 390 px simplemente por cambiar colores. El cuerpo de 36 px en 1920 px equivale a unos 7,3 px al encogerlo a 390 px. Por eso el comparador incluye el texto accesible de la propuesta debajo y controles de pantalla completa. Para una reproducción realmente integrada en vertical, la migración debe remaquetar los mismos componentes a 9:16, sin recortar información ni limitarse a escalar. No se afirma que esa exportación vertical esté entregada aquí.

## El antes y el después entregados

Caso: Test-Time Compute, destacado en Inicio y en el hub visual. Se entrega el MP4 original sin modificar, un MP4 nuevo completo, la comparación en HTML, las siete escenas y un comparativo estático. El nuevo vídeo conserva las siete escenas, dura 71,37 segundos, es H.264 1920 × 1080 a 30 fps y no añade una locución inexistente en el original.

El diagrama de selección muestra tres resultados concretos de un ejemplo aritmético y cómo se elige por mayoría. El de búsqueda hace explícita una rama descartada. El de latencia representa `5.000 tokens / 100 tokens/s = 50 s` y declara que es una simulación acelerada con tasa fija. No se inventan valores de un benchmark para que el diseño parezca más científico.

### Correcciones editoriales separadas de la estética

Esta no es una copia literal de cada frase. Se conserva la densidad, pero se corrigen afirmaciones que harían engañoso un gráfico más explícito:

- Se diferencia best-of-N con evaluador de selección por mayoría. Para ilustrar el aumento de muestras se compara o1 consigo mismo: 74% con una muestra y 83% con consenso entre 64, según la publicación original de OpenAI, en vez de presentar una comparación con GPT-4o como si aislara el presupuesto.
- El resultado de s1 se presenta como un resultado del estudio, aproximadamente 50% → 57%, no como una garantía universal de que más pasos siempre mejoran la respuesta.
- Se retiran afirmaciones absolutas sobre superioridad y coste de la búsqueda en árbol. El resultado depende de tarea, evaluador y presupuesto.
- La latencia se expresa con una tasa fija y se aclara que aumentar la velocidad de generación también reduce el tiempo. No se afirma que ninguna optimización pueda hacerlo.

Estas correcciones no se han aplicado al artículo de producción. Deben revisarse junto con la migración correspondiente.

## Implementación sin duplicar trabajo

Crear una fuente compartida de tokens y componentes semánticos, separada del contenido. El guion declara títulos, párrafos, datos y fuentes, tipo de mecanismo, secuencia de estados y tiempos. El render usa esa fuente para producir MP4, póster, transcripción y momentos clave. Las variantes ES/EN y los formatos horizontal/vertical comparten componentes, no texto rasterizado ni coordenadas que se rompan al traducir.

Reemplazar el contrato de `diagram(kind)` con figuras genéricas por componentes con datos explícitos, por ejemplo `candidate_selection(candidates, criterion)`, `reasoning_tree(nodes, edges, rejected_nodes)` y `token_latency(tokens, rate, exclusions)`. Una entrada sin significado o sin fuente cuando contiene cifras bloquea el render.

La publicación debe conservar las URLs canónicas de artículo y watch page. Los medios pueden llevar versión nueva, por ejemplo `03-test-time-compute-v2.mp4` y su póster correspondiente. `VIDEO_DELIVERY.md` documenta que los metadatos alimentan embeds, biblioteca, VideoObject/Clip y sitemap: hay que regenerar esas salidas de forma coordinada. El cálculo de duración debe venir de `ffprobe`, no de una constante copiada entre páginas.

Secuencia recomendada: aprobar este piloto; integrar componentes y tokens; migrar primero vídeos destacados de Inicio/Ver; seguir por familias de mecanismos; regenerar versiones localizadas y pósteres; validar cada lote antes de sustituirlo. Las grabaciones reales de interfaz se conservan como evidencia y solo adaptan su portada y encuadre.

## Criterios de aceptación

Un lote no se publica hasta comprobar: texto completo y sin cortes; ausencia de decoración que no aporte información; mecanismos con etiquetas y cifras trazables; contraste suficiente de texto y conexiones informativas; observación legible a tamaño de uso; alternativa accesible para móvil; reproducción y pausa; coherencia ES/EN; póster y MP4 de la misma versión; duración y momentos clave consistentes; ausencia de regresiones en páginas consumidoras. El fondo del reproductor y los estilos del artículo deben comprobarse también en claro y oscuro.

Las medidas de contraste se basan en WCAG: 4,5:1 para texto normal y 3:1 para texto grande; los objetos gráficos necesarios para entender el contenido también requieren contraste no textual adecuado. Una comprobación de desbordamiento o una captura sin errores no demuestra por sí sola conformidad WCAG.

## Estado y archivos

La rama `design/video-minimal-audit-20260918` contiene la auditoría y el prototipo. Esta revisión no se ha fusionado con main, no ha sustituido vídeos publicados y no ha activado una migración automática de todo el catálogo. Los resultados de esta propuesta son revisables antes de extender la línea al resto del sitio.

`comparador.html` es autónomo y contiene ambos vídeos; puede abrirse sin servidor. `inventario-paginas.html` permite buscar todas las rutas auditadas. Los MP4 también se entregan separados. `pilot-validation.json` y `cobertura-validada.json` documentan la validación ejecutada. `pilot.py` permite reproducir el render con Inter instalado, Pillow y ffmpeg; no se incluyen fuentes tipográficas.

## Referencias y evidencias

- Web: https://5sigmas.com/ ; https://5sigmas.com/videos/ ; https://5sigmas.com/visuales/ ; https://5sigmas.com/videos/series/modelos-razonadores/03-test-time-compute/
- Fuente auditada: repositorio `fjmmontiel/5sigmas`, base `e2f301e3fe346a4328cb773c46fa49ca34388a12`. Archivos: `docs/stylesheets/revamp.css`, `docs/assets/stylesheets/animations.css`, `docs/stylesheets/voice-report-animations.css`, `scripts/regenerate_p0_compact_videos.py`, `VIDEO_DELIVERY.md`, `hooks/video_embed.py`, `hooks/video_sitemap.py` y metadatos del capítulo.
- Cobertura ES/EN: https://github.com/fjmmontiel/5sigmas/actions/runs/35322596500
- Muestreo de MP4: https://github.com/fjmmontiel/5sigmas/actions/runs/35322062276
- WCAG contraste de texto: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG contraste no textual: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- s1: https://arxiv.org/abs/2501.19393
- OpenAI, Learning to reason with LLMs: https://openai.com/index/learning-to-reason-with-llms/
- Tree of Thoughts: https://arxiv.org/abs/2305.10601
- Presupuesto óptimo de test-time compute: https://arxiv.org/abs/2408.03314
