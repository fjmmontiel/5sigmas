---
title: Tiempo físico — latencia, streaming e interacción humana
description: "TTFT, streaming y umbrales de latencia percibida en modelos razonadores. RouteLLM, patrones de diseño y gestión de coste de sesión en producción."
date: 2026-04-11
keywords: "latencia IA, TTFT, streaming LLM, RouteLLM, test-time compute producto, latencia percibida, tiempo de respuesta IA, SLO IA, decodificación especulativa"
tags:
  - IA
  - LLMs
  - Razonamiento
---

# Capítulo 4 — Tiempo físico: latencia, streaming e interacción humana

El capítulo anterior describió el test-time compute como una variable de diseño. Este capítulo traduce esa variable al problema concreto del producto: qué ocurre cuando el tiempo de cómputo de un paper se convierte en segundos reales que un usuario espera. Al terminarlo, el lector conocerá los umbrales de latencia percibida que determinan cuándo una espera rompe la experiencia de usuario, entenderá la diferencia entre TTFT y latencia total y por qué esa distinción importa para el diseño, y sabrá qué patrones de diseño existen para aprovechar el test-time compute sin destruir la usabilidad.

!!! info "Prerrequisitos"
    Este capítulo asume que conoces el concepto de test-time compute introducido en el [Capítulo 3 — Test-Time Compute](./03-test-time-compute.md).

"Pensar más" en un paper se mide en tokens. En un producto, se mide en segundos de pantalla en blanco, en sesiones que cuestan más, en sistemas con más puntos donde algo puede fallar. 

La traducción de la teoría a la práctica requiere entender tres cosas: cuánto puede esperar un usuario antes de que la experiencia se rompa, cómo el streaming cambia la percepción de esa espera, y qué patrones de diseño existen para aprovechar el test-time compute sin destruir la usabilidad.

---

## 1. Umbrales de latencia percibida

La investigación en experiencia de usuario lleva décadas estudiando cómo la latencia afecta la percepción. [Jakob Nielsen](https://www.nngroup.com/books/usability-engineering/) estableció en los años 90 una escala que sigue siendo relevante:

- **Hasta 0,1 segundos**: la respuesta se percibe como instantánea. El usuario siente que el sistema responde a sus acciones directamente.
- **0,1 a 1 segundo**: el usuario nota la pausa pero no pierde el hilo de pensamiento. La experiencia es fluida si la pausa es menor de un segundo.
- **1 a 10 segundos**: la pausa requiere retroalimentación activa (indicadores de carga) para que el usuario no asuma que algo ha fallado. A partir de los 5-7 segundos, la mayoría de usuarios empieza a desengancharse de la tarea.
- **Más de 10 segundos**: el usuario necesita algo que hacer mientras espera. Sin retroalimentación, asumirá que el sistema está roto.

Los modelos razonadores con cadenas de pensamiento largas operan rutinariamente en el rango de los 10-60 segundos para problemas complejos. Eso los sitúa en una categoría donde la experiencia sin diseño explícito para la latencia es mala por defecto.

Conviene entender por qué esa latencia no se resuelve simplemente con hardware más rápido, al menos no completamente y no hoy. La cadena de razonamiento es secuencial: el token 500 no puede generarse antes de que exista el token 499. A diferencia de otros cuellos de botella en la inferencia de modelos (como procesar varias consultas en paralelo, donde más chips sí ayudan de forma directa), la latencia de una sola consulta de razonamiento está acotada por `longitud_de_cadena ÷ velocidad_de_generación`. Los modelos frontier actuales generan en torno a 100 tokens por segundo durante la fase de razonamiento; una cadena de 10.000 tokens, longitud típica de un problema de matemáticas de competición, impone unos 100 segundos de espera mínima. Ningún truco de streaming ni de diseño de interfaz elimina ese tiempo.

Lo que sí puede moverlo es el denominador. Si la velocidad de generación sube 10 veces (hardware especializado de inferencia, decodificación especulativa, nuevas arquitecturas de silicio), esa misma cadena de 10.000 tokens pasa de 100 segundos a 10 segundos. Si sube 100 veces, pasa a 1 segundo. En ese escenario, razonamientos que hoy se reservan para consultas de alto valor porque cuestan minutos estarían disponibles para cualquier interacción sin fricción perceptible, con la misma profundidad de análisis. El límite actual no es, por tanto, una propiedad permanente de los modelos razonadores, sino el estado del hardware en este momento de la curva.

En sistemas reales que combinan LLM con llamadas a herramientas y RAG, la latencia total de una consulta de complejidad media puede situarse en torno a los 20 segundos, con el razonamiento puro representando 7-8 segundos y el resto distribuido entre llamadas a APIs, recuperación de documentos y síntesis de resultados. Esos números son relevantes para el diseño: muestran que la mejora de latencia percibida puede buscarse tanto en el modelo (menos TTC) como en la arquitectura del sistema (herramientas más rápidas, cachés de RAG).

Una distinción crítica en este contexto es la diferencia entre **TTFT (Time To First Token)** y la latencia total. TTFT es el tiempo que transcurre desde que el usuario envía la query hasta que recibe el primer carácter de la respuesta. En modelos razonadores que no hacen streaming de su cadena de pensamiento, el TTFT es igual al tiempo de razonamiento completo más el tiempo de generación del primer token visible, lo que puede ser de varios segundos incluso para respuestas que en total serían breves. El TTFT determina la percepción de respuesta del sistema; la latencia total, la percepción de velocidad de generación una vez iniciada. Optimizar uno sin el otro produce sistemas que se sienten lentos aunque generen rápido, o que generan rápido pero empiezan tarde.

{{ include_html("snippets/modelos-razonadores/04-ttft-streaming.html") }}

### Enrutamiento dinámico: RouteLLM

Un patrón relevante en este contexto es el enrutamiento dinámico, articulado como técnica bajo el nombre [RouteLLM (Ong et al., 2024)](https://arxiv.org/abs/2406.18665): en lugar de aplicar el modelo más capaz (y más lento) a todas las consultas, un clasificador liviano analiza la consulta entrante y decide qué modelo y cuánto test-time compute son apropiados para resolverla.

Una pregunta factual simple va a un modelo rápido y barato. Un problema de razonamiento complejo va a un modelo lento y costoso. El usuario recibe la calidad que necesita para cada tipo de consulta sin pagar en latencia o coste la tasa máxima en todas ellas. El enrutador añade latencia marginal por sí mismo, pero el ahorro neto cuando la distribución de consultas es heterogénea puede ser grande. El paper original reporta reducciones de coste del 85% manteniendo el 95% del rendimiento del modelo fuerte.

{{ include_html("snippets/modelos-razonadores/04-routellm-decision.html") }}

La idea articulada por RouteLLM encontró su primera implementación comercial a gran escala en agosto de 2025, cuando OpenAI presentó GPT-5. A diferencia de los modelos anteriores (donde el usuario elegía explícitamente entre modo rápido o modo razonador), GPT-5 incorpora un router en tiempo real que decide qué modelo activar en función del tipo de conversación, la complejidad detectada, las herramientas requeridas y la intención explícita del usuario. El sistema combina un modelo rápido para la mayoría de las preguntas con un modelo de razonamiento profundo para los problemas que lo requieren, de forma que el usuario no tiene que elegir modelo ni asignar cómputo de antemano: la selección ocurre de forma invisible en cada consulta ([OpenAI, 2025](https://openai.com/gpt-5/)).

El primer día de lanzamiento dejó ver qué tan central es el router para la calidad percibida del sistema. Cuando el autoswitcher falló durante varias horas y todas las consultas cayeron al modelo rápido por defecto, los usuarios notaron un descenso visible en la calidad de las respuestas. Sam Altman lo reconoció públicamente en X: el router había estado fuera de servicio y eso hizo que el modelo "pareciera mucho más tonto" ([Willison, 2025](https://simonwillison.net/2025/Aug/7/gpt-5/)). La anécdota muestra que el enrutamiento dinámico no es una optimización periférica sino parte de la propuesta de valor: cuando falla, el sistema entrega la misma calidad para todo, exactamente el escenario que el diseño intenta evitar.

---

## 2. Streaming y la percepción de latencia

El streaming (enviar tokens al cliente mientras se generan, en lugar de esperar a que la respuesta completa esté lista) es la herramienta más usada para mejorar la percepción de latencia sin reducir el tiempo total.

La diferencia psicológica es real: recibir el primer token en 0,5 segundos y luego ver la respuesta construirse progresivamente se percibe como más rápido que recibir la respuesta completa después de 5 segundos, aunque el tiempo total sea el mismo o incluso mayor en el primer caso.

El problema con el streaming en modelos razonadores es que la cadena de pensamiento no siempre tiene valor para el usuario antes de que esté completa. Si el modelo está razonando sobre un problema matemático, mostrar los pasos intermedios puede ser útil o puede ser confuso, dependiendo del usuario y del contexto. Y si la interfaz espera a que termine la cadena de pensamiento antes de iniciar el streaming de la respuesta final, el beneficio perceptual del streaming se pierde.

### Patrones de streaming para modelos razonadores

**Streaming del pensamiento con separación visual.** Mostrar la cadena de pensamiento mientras ocurre, con un estilo visual que la distinga de la respuesta final. El usuario ve que el sistema está trabajando y puede seguir el proceso si le interesa.

**Indicadores de progreso significativos.** En lugar de un spinner genérico, mostrar en qué fase está el proceso: "Analizando el problema", "Generando soluciones", "Verificando resultado". Reduce la ansiedad de espera sin requerir streaming del pensamiento real.

**Respuesta parcial progresiva.** Para tareas donde es posible, mostrar resultados parciales que ya tienen valor mientras el sistema completa el análisis. Un informe puede mostrar secciones mientras las demás se generan.

---

## 3. El coste de la sesión y los puntos de rotura

Más test-time compute no solo añade latencia al usuario: añade coste a la sesión y multiplica los puntos donde algo puede fallar.

### Coste de sesión

En sistemas de IA generativa, el coste se factura por token generado. Una cadena de pensamiento de quinientos tokens más una respuesta de doscientos tokens cuesta más del doble que una respuesta directa de doscientos tokens. En modelos que diferencian categorías de token, como [Claude 3.7 Sonnet](https://www.anthropic.com/claude-3-7-sonnet-system-card), los tokens de pensamiento se facturan al mismo precio que los tokens de salida (15 dólares por millón), de forma que una cadena de razonamiento larga tiene un coste proporcional al número de tokens internos generados aunque el usuario nunca los vea ([Anthropic, 2025](https://www.anthropic.com/claude-3-7-sonnet-system-card)). Si hay cientos de miles de usuarios con cadenas de pensamiento largas, la diferencia de coste puede ser la diferencia entre rentabilidad y pérdidas.

Los sistemas que usan test-time compute de forma intensiva necesitan estrategias explícitas de gestión de coste: presupuestos máximos por sesión, clasificación de consultas para escalar el nivel de razonamiento, y monitorización de coste por tipo de consulta para identificar patrones que consumen más de lo que producen.

### Puntos de rotura

Una cadena de razonamiento larga es también una cadena con más pasos donde algo puede fallar:

- Una herramienta externa que el modelo llama puede devolver un error o una respuesta inesperada.
- El contexto puede superar el límite de la ventana del modelo en cadenas muy largas.
- La latencia de red puede interrumpir el streaming en un punto intermedio.
- El modelo puede entrar en un bucle improductivo que genera tokens sin avanzar.

Cada uno de estos fallos, en un sistema sin diseño explícito para gestionarlos, produce una experiencia de usuario degradada: espera larga seguida de error en lugar de respuesta.

{{ include_html("snippets/modelos-razonadores/04-latencia-umbral.html") }}

---

## 4. Patrones de diseño para optimizar TTC en producto

### Clasificación por complejidad

Antes de asignar recursos, clasificar la consulta. Las preguntas factuales simples no se benefician de cadenas de pensamiento largas. El razonamiento adicional en esos casos es coste sin beneficio. Un clasificador liviano (que puede ser otro LLM, o reglas simples basadas en características de la consulta) puede enrutar al nivel de TTC apropiado.

### Presupuesto duro de tiempo y tokens

Definir límites máximos de tiempo y tokens para el proceso de razonamiento antes de empezar. Si el modelo no ha llegado a una respuesta satisfactoria dentro del presupuesto, producir la mejor respuesta disponible en ese punto con la indicación de que el análisis está incompleto, en lugar de seguir indefinidamente.

### Verificación antes de pasos costosos

En flujos de agente donde el modelo llama a herramientas externas o actúa sobre sistemas reales, verificar la intención antes de ejecutar acciones con consecuencias difícilmente reversibles. Una pausa breve para confirmar con el usuario antes de un paso de alto impacto cuesta milisegundos y puede evitar daños costosos.

### Fallbacks explícitos

Definir qué hace el sistema cuando la cadena de razonamiento falla: ¿devuelve la última respuesta parcial? ¿Pide más información al usuario? ¿Degrada a un modelo más simple que puede responder algo? Los sistemas sin fallbacks explícitos degeneran en errores opacos que el usuario no puede interpretar.

> Un sistema que usa test-time compute de forma responsable sabe cuándo parar, qué hacer cuando para antes de tiempo, y cómo comunicarlo al usuario sin romper la experiencia.

---

!!! tip "Siguiente lectura"
    El último capítulo cierra el cuadro con los riesgos que el test-time compute introduce y los criterios de diseño para gestionarlos: [Capítulo 5 — Riesgos: overthinking, coste, ataques y alineamiento →](./05-riesgos.md)

## 5. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Fuente | Descripción breve |
| --- | --- |
| **Nielsen, J. (1994)** — *[Usability Engineering](https://www.nngroup.com/books/usability-engineering/)* (Morgan Kaufmann) | Establece los umbrales de 0,1 s / 1 s / 10 s como referencia para la percepción de latencia en sistemas interactivos. Citado en §1. |
| **Snell et al. (2024)** — *[Scaling LLM Test-Time Compute Optimally](https://arxiv.org/abs/2408.03314)* | Analiza el perfil de coste y calidad de distintas estrategias de TTC; base cuantitativa para las decisiones de enrutamiento y presupuesto discutidas en §4. |
| **Muennighoff et al. (2025)** — *[s1: Simple Test-Time Scaling](https://arxiv.org/abs/2501.19393)* | Documenta cómo el presupuesto de TTC (budget forcing) produce mejoras cuantificables a coste variable; contexto para la variabilidad de coste por sesión discutida en §3. |
| **Ong et al. (2024)** — *[RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665)* | Técnica de enrutamiento dinámico entre modelos de distinta capacidad: un clasificador liviano decide qué modelo y cuánto TTC asignar a cada consulta. Citado en §1. |
| **Anthropic (2025)** — *[Claude 3.7 Sonnet System Card](https://www.anthropic.com/claude-3-7-sonnet-system-card)* | Estructura de facturación de tokens de pensamiento: mismo precio que tokens de salida (15 $/M), lo que hace que las cadenas largas sean significativamente más caras aunque el usuario no las vea. Citado en §3. |
| **OpenAI (2025)** — *[GPT-5](https://openai.com/gpt-5/)* | Sistema unificado con router en tiempo real: selecciona entre modelo rápido y modelo razonador según tipo de conversación, complejidad detectada, herramientas requeridas e intención explícita del usuario. Primera implementación comercial a escala del patrón de enrutamiento dinámico. Citado en §1. |
| **Willison, S. (2025)** — *[GPT-5: Key characteristics, pricing and model card](https://simonwillison.net/2025/Aug/7/gpt-5/)* | Análisis del lanzamiento de GPT-5 con cita directa del system card de OpenAI sobre el router e incidente del autoswitcher durante el primer día de despliegue. Citado en §1. |

</details>

---

## Preguntas frecuentes

**¿Por qué el streaming no resuelve completamente el problema de latencia en modelos razonadores?**
El streaming mejora la percepción de latencia pero no reduce el tiempo total. En modelos que no exponen su cadena de pensamiento durante el razonamiento, el TTFT sigue siendo igual al tiempo de razonamiento completo: el usuario no recibe ningún token hasta que el proceso interno termina. Cuando el modelo sí hace streaming de la cadena, el usuario ve pasos intermedios que pueden ser confusos antes de que aparezca la respuesta final útil.

**¿Qué diferencia hay entre TTFT y latencia total, y cuál importa más?**
TTFT determina la percepción de respuesta del sistema: cuánto tarda en aparecer el primer carácter. La latencia total determina la percepción de velocidad una vez iniciada. En modelos razonadores, el TTFT es generalmente el cuello de botella más visible porque puede ser de decenas de segundos aunque la respuesta final sea breve. Optimizar solo la latencia total produce sistemas que se sienten rápidos una vez iniciados pero que tardan demasiado en arrancar.

**¿Cuándo tiene sentido usar RouteLLM?**
RouteLLM es más útil cuando la distribución de consultas es heterogénea: hay un volumen alto de preguntas simples que no necesitan razonamiento profundo y un subconjunto de preguntas complejas que sí lo requieren. Si todas las consultas tienen complejidad similar, el clasificador añade latencia sin producir ahorro real. El beneficio depende directamente de cuánto varía la distribución de complejidad de las consultas del sistema.

**¿Cómo se establecen SLOs cuando la latencia es variable?**
La latencia variable de los modelos razonadores hace que los SLOs basados en latencia media sean poco informativos porque la distribución tiene colas largas. Es más práctico definir percentiles (p95, p99) y establecer mecanismos activos de corte: si la cadena de razonamiento supera un umbral de tiempo o tokens, el sistema produce la mejor respuesta disponible en ese punto con la indicación de que el análisis está incompleto, en lugar de seguir indefinidamente.

