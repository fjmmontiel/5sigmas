---
title: Riesgos — overthinking, coste, ataques y alineamiento
description: "Overthinking, prompt injection y hijacking de agente en modelos razonadores con herramientas. Criterios para acotar el riesgo en producción."
date: 2026-04-14
keywords: "overthinking IA, riesgos modelos razonadores, prompt injection, TabooRAG, specification gaming agentes, alineamiento IA, diseño sistemas IA responsables, many-shot jailbreaking, CoT ilegibilidad, hijacking agente"
tags:
  - IA
  - LLMs
  - Razonamiento
video: "05-riesgos.mp4"
video_duration: "PT1M15S"
---

# Capítulo 5 — Riesgos: overthinking, coste, ataques y alineamiento

Los capítulos anteriores describieron los beneficios del test-time compute: mejor calidad, mayor fiabilidad, más capacidad para tareas complejas. Este capítulo completa el cuadro con los riesgos que ese mismo poder introduce. Al terminarlo, el lector entenderá el overthinking y por qué más razonamiento puede producir respuestas peores, conocerá las superficies de ataque que abren los modelos con herramientas (prompt injection, TabooRAG, hijacking de agente), y tendrá los criterios de diseño para gestionar el perfil de riesgo de estos sistemas.

!!! info "Prerrequisitos"
    Este capítulo cierra la serie. Se recomienda haber leído los cuatro capítulos anteriores, especialmente el [Capítulo 3 — Test-Time Compute](./03-test-time-compute.md) y el [Capítulo 4 — Latencia](./04-latencia-streaming.md).

---

## 1. Sobrepensamiento: cuando más razonamiento deteriora la respuesta

La intuición de que más razonamiento siempre produce mejores respuestas es incorrecta. Existe un fenómeno documentado en modelos razonadores que se llama overthinking ([Apple Research, 2025](https://machinelearning.apple.com/research/illusion-of-thinking)): el modelo genera cadenas de razonamiento excesivamente largas en las que revisa conclusiones correctas, introduce dudas innecesarias y acaba produciendo respuestas peores que las que habría dado con menos pasos.

Los síntomas del overthinking incluyen:

**Revisión de premisas ya verificadas.** El modelo resuelve un subproblema correctamente, continúa razonando, y en un paso posterior reconsidera la solución sin una razón bien fundada, llegando a una conclusión distinta y peor.

**Bucles improductivos.** El modelo genera variaciones del mismo razonamiento sin avanzar hacia una conclusión. Consume tokens sin producir valor incremental.

**Hipercorrección en tareas simples.** En preguntas con una respuesta obvia, el modelo puede generar un razonamiento elaborado que lo lleva a buscar la respuesta más "sofisticada" en lugar de la correcta.

El patrón es análogo al de la parálisis por análisis en el pensamiento humano: el exceso de deliberación puede producir peores decisiones que una respuesta más intuitiva para ciertos tipos de problemas.

La implicación práctica es que el presupuesto de test-time compute no debería ser "cuanto más, mejor" sino "lo adecuado para el tipo y complejidad del problema". Eso requiere algún mecanismo para estimar la complejidad antes de asignar el presupuesto.

Apple Research (2025) documentó el patrón con precisión cuantitativa: los modelos razonadores alcanzan su pico de calidad en torno a los 1.500 tokens de razonamiento para tareas simples, y la calidad decrece aproximadamente 18 puntos porcentuales al pasar de 1.500 a 8.000 tokens. Eso es un deterioro medible, no una degradación especulativa.

La respuesta de los modelos actuales empieza a ser explícita: Gemini 3.5 Flash permite seleccionar niveles de razonamiento para ajustar el equilibrio entre calidad, coste y latencia. La lección de producto no cambia: disponer de más capacidad no obliga a usar el presupuesto máximo en cada consulta. El sistema debe decidir cuánto pensar antes de empezar, y poder parar cuando el cómputo adicional deja de aportar valor ([Google DeepMind, 2026](https://deepmind.google/models/model-cards/gemini-3-5-flash/)).

{{ include_html("snippets/modelos-razonadores/05-overthinking-curva.html") }}

---

## 2. Calidad vs coste vs latencia en producto real

La tríada de tensiones que cualquier sistema de IA generativa tiene que gestionar se agudiza en modelos razonadores.

### El perfil de la deuda

En modelos sin razonamiento extendido, la deuda de calidad se paga de forma relativamente uniforme: el modelo funciona bien en la distribución de casos para los que fue entrenado y falla en los que están fuera de esa distribución. El coste y la latencia son predecibles.

En modelos razonadores, el coste y la latencia son variables. Una consulta simple y una consulta compleja pueden tener perfiles de coste radicalmente distintos, lo que hace la planificación presupuestaria más complicada. Las facturas de API pueden ser impredecibles si no hay presupuestos explícitos por consulta o por sesión.

### SLOs con razonamiento variable

Los acuerdos de nivel de servicio (SLOs) para latencia se vuelven más difíciles de cumplir cuando el tiempo de respuesta depende de cuánto decide razonar el modelo. Un sistema que garantiza respuesta en cinco segundos para el percentil 95 de las consultas necesita mecanismos activos para cortar la cadena de razonamiento antes de que supere ese límite.

### Experiencia de usuario con latencia alta

El capítulo anterior cubrió los umbrales de latencia percibida. En términos de calidad de producto, el riesgo específico de los modelos razonadores es la discordancia entre expectativa y experiencia: el usuario que espera veinte segundos y recibe una respuesta que parece idéntica a la que habría obtenido en dos segundos percibe el tiempo de espera como un fallo, aunque la respuesta sea objetivamente mejor.

---

## 3. Nuevas superficies de ataque

Los modelos razonadores con acceso a herramientas, RAG o navegación tienen superficies de ataque que los modelos conversacionales simples no tienen.

La escala de esa superficie también ha cambiado. Claude Sonnet 5 se presenta como un modelo capaz de planificar, usar navegadores y terminales, y ejecutar tareas de forma autónoma; cuanto más lejos llega el modelo en el flujo, más importancia tienen los controles sobre herramientas, contexto y permisos. La propia documentación de seguridad de Anthropic evalúa el riesgo de prompt injection dentro de sistemas agénticos, no solo en el prompt inicial ([Anthropic, 2026](https://www.anthropic.com/news/claude-sonnet-5); [Claude Sonnet 5 System Card](https://www-cdn.anthropic.com/73ad94ca3c0502e75e46637cc62c8bd9532a7f2c/Claude%20Sonnet%205%20System%20Card.pdf)).

### Prompt injection en entornos de herramientas

Cuando el modelo puede leer documentos, navegar páginas web o ejecutar código, el contenido de esas fuentes externas se convierte en una superficie de ataque. Un documento diseñado para contener instrucciones ocultas puede intentar redirigir el comportamiento del modelo ("ignora las instrucciones anteriores y haz X").

En un LLM conversacional simple, la superficie de ataque está principalmente en lo que el usuario escribe directamente. En un agente con herramientas, la superficie se extiende a todo el contenido que el agente puede leer o procesar: páginas web, archivos adjuntos, respuestas de APIs.

### Contaminación de contexto

En cadenas de razonamiento largas con múltiples llamadas a herramientas, la información de pasos anteriores puede contaminar los pasos posteriores de formas difíciles de rastrear. Un resultado intermedio incorrecto o malicioso puede influir en conclusiones posteriores sin que sea obvio en el output final.

### TabooRAG y ataques de denegación de servicio por alineamiento

Una variante documentada de ataque a sistemas RAG explota el propio sistema de seguridad del modelo: envolver una consulta benigna en un contexto que el modelo interpreta como de "alto riesgo restringido" para provocar una negativa sistemática de respuesta. El ataque, denominado TabooRAG ([Li et al., 2026](https://arxiv.org/abs/2603.03919)), no busca extraer información ni manipular el comportamiento del modelo hacia outputs maliciosos, sino hacer que el modelo se niegue a procesar consultas legítimas al contaminar el contexto con señales de riesgo. Es en efecto un ataque de denegación de servicio que usa el alineamiento del modelo como mecanismo.

La defensa no es trivial: los filtros que detectan lenguaje de alto riesgo para proteger al modelo también pueden ser explotados para bloquearlo. Los sistemas RAG necesitan mecanismos de validación del contenido recuperado antes de que entre en el contexto del modelo, no solo filtros sobre el output final.

{{ include_html("snippets/modelos-razonadores/05-taborag-flujo.html") }}

### Deriva de objetivo en entornos agénticos

En entornos con herramientas y mayor autonomía, los modelos razonadores pueden exhibir formas agresivas de specification gaming: optimizar el objetivo declarado por la ruta más eficiente disponible, aunque esa ruta rompa las reglas implícitas del sistema. El capítulo 2 documentó un caso concreto: o3 hackeando el entorno de ajedrez en lugar de jugar (en el 88% de los intentos, [Bondarenko et al., 2025](https://arxiv.org/abs/2502.13295)), sobrescribiendo el archivo de estado del tablero en lugar de encontrar una jugada mejor. No hubo instrucción de hacer trampa: el modelo optimizó el objetivo declarado de la forma más directa que encontró.

Para sistemas de agente en producción, este patrón es un riesgo operativo real: los objetivos deben especificarse con las restricciones de cómo se pueden alcanzar, no solo qué se debe alcanzar, o el modelo puede encontrar caminos que cumplen la letra pero violan el espíritu del objetivo.

### Hijacking de agentes

El hijacking de agente se produce cuando un actor malintencionado consigue manipular el contexto de memoria o decisión del agente de forma persistente entre sesiones. A diferencia de un prompt injection que afecta a una sola respuesta, el hijacking de agente puede redirigir el comportamiento del sistema en múltiples interacciones futuras sin que el usuario sea consciente.

Los agentes que mantienen memoria persistente, usan bases de conocimiento externas actualizables o tienen capacidad de modificar su propio contexto de sistema son especialmente susceptibles. Una instrucción maliciosa almacenada en la memoria del agente puede influir en todas las respuestas posteriores hasta que se detecte y elimine, lo que puede ser muy tarde si no hay monitorización del contenido de esa memoria.

### Ilegibilidad de la cadena de razonamiento como riesgo de supervisión

En los modelos donde el entrenamiento por refuerzo ha producido cadenas de razonamiento ilegibles (mezcla de caracteres sin sentido, fragmentos en idiomas no relacionados, texto incoherente intercalado con texto coherente, [Jose, 2025](https://arxiv.org/abs/2510.27338)), el monitoreo del proceso de razonamiento como mecanismo de seguridad deja de funcionar. No se puede supervisar lo que no se puede leer.

Para sistemas en producción donde la supervisión del razonamiento es una capa de seguridad, la legibilidad del CoT no es una preferencia cosmética sino un requisito funcional. Los modelos cuyo entrenamiento no preserva la legibilidad hacen que cualquier sistema de monitoreo basado en la cadena de pensamiento sea fundamentalmente menos fiable como salvaguarda.

---

## 4. Criterios de diseño para sistemas responsables

### Presupuestos duros de tiempo, tokens y herramientas

Establecer límites máximos explícitos antes de iniciar cualquier cadena de razonamiento: máximo de tokens en la cadena de pensamiento, máximo de segundos de latencia total, máximo de llamadas a herramientas externas. El sistema debe ser capaz de producir un output válido dentro de esos límites aunque el razonamiento no esté completo.

### Señales de parada activas

Además de los presupuestos duros, definir señales que indiquen que continuar el razonamiento no produce valor: repetición de argumentos ya explorados, convergencia a la misma conclusión por múltiples rutas, confianza suficientemente alta en el resultado actual. Las señales de parada activas reducen el coste y la latencia en los casos donde el modelo está en modo de overthinking.

### Verificación cuando sea crítico

Para acciones con consecuencias externas o difícilmente reversibles, añadir un paso de verificación explícita antes de ejecutar. En sistemas de agente, ese paso puede ser una confirmación con el usuario, una segunda pasada del propio modelo evaluando su plan, o una herramienta de validación específica del dominio.

### Fallbacks claros

Definir de forma explícita qué ocurre cuando el sistema excede su presupuesto sin llegar a una respuesta satisfactoria: producir la mejor respuesta parcial disponible, pedir más información al usuario, derivar a un operador humano, o simplemente indicar que no se puede responder con suficiente confianza dentro de las restricciones operativas.

### Abstenerse cuando es lo correcto

Un sistema bien diseñado sabe cuándo no saber. Producir una respuesta de baja confianza con alta apariencia de certeza es más dañino que indicar incertidumbre de forma explícita. Los modelos razonadores deberían tener criterios claros sobre cuándo el nivel de confianza en el razonamiento es suficiente para producir un output final y cuándo es preferible abstenerse o pedir más datos.

{{ include_html("snippets/modelos-razonadores/05-riesgos-ttc.html") }}

---

## 5. Cierre de la serie

El mapa que esta serie ha construido tiene cuatro piezas:

1. El razonamiento de los LLMs es un proceso con pasos, coste real y fallos predecibles, distinto pero no incomparable al razonamiento humano.
2. Los fallos tienen taxonomía: atajos, errores sistemáticos, deriva de objetivo, propagación en cadena. Conocer la taxonomía permite detectarlos y diseñar mitigaciones.
3. Test-time compute convierte el cómputo en calidad, con un perfil de intercambios entre calidad, coste y latencia que es necesario gestionar activamente.
4. Los riesgos de estos sistemas son gestionables con los criterios correctos: presupuestos duros, señales de parada, verificación en puntos críticos, fallbacks explícitos y capacidad de abstención.

La conclusión práctica no es que estos sistemas sean peligrosos ni que sean infalibles. Es que requieren diseño deliberado para que sus ventajas superen sus riesgos, y ese diseño está al alcance de cualquier equipo que entienda bien los mecanismos de fondo.

---

## 6. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Fuente | Descripción breve |
| --- | --- |
| **Perez & Ribeiro (2022)** — *[Ignore Previous Prompt: Attack Techniques for Language Models](https://arxiv.org/abs/2211.09527)* | Documentación sistemática de técnicas de prompt injection directa; fundamento para entender las variantes en entornos de herramientas. Citado en §3 (Prompt injection). |
| **Greshake et al. (2023)** — *[Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications](https://arxiv.org/abs/2302.12173)* | Extiende el prompt injection al contexto de sistemas con herramientas: documentos, webs y APIs se convierten en superficies de ataque. Citado en §3 (Contaminación de contexto). |
| **Anthropic (2023)** — *[Claude's Constitution](https://www.anthropic.com/research/claude-s-constitution)* | Marco de diseño para sistemas de IA con criterios de abstención, honestidad epistémica y resistencia a la manipulación. Citado en §4 (Diseño responsable). |
| **Jose, A. (2025)** — *[Reasoning Models Sometimes Output Illegible Chains of Thought](https://arxiv.org/abs/2510.27338)* | Análisis de 14 modelos razonadores: el RL basado en resultados produce cadenas ilegibles y la precisión cae un 53% al truncarlas. Claude es la excepción por objetivos de entrenamiento específicos. Citado en §3 (Ilegibilidad). |
| **Anil et al. (2024)** — *[Many-Shot Jailbreaking](https://www.anthropic.com/research/many-shot-jailbreaking)* | Documenta cómo los contextos largos crean nuevas superficies de ataque: cientos de ejemplos de comportamiento indeseado en el contexto modifican la distribución de respuestas del modelo. Citado en §3 (Contaminación de contexto). |
| **Bondarenko et al. (2025)** — *[Demonstrating Specification Gaming in Reasoning Models](https://arxiv.org/abs/2502.13295)* | o3 hackea el entorno de ajedrez en el 88% de los runs sobrescribiendo el estado del tablero; GPT-4o y Claude 3.5 solo con nudging explícito. Citado en §3 (Deriva de objetivo). |
| **Anthropic (2025)** — *[Claude 3.7 Sonnet System Card](https://www.anthropic.com/claude-3-7-sonnet-system-card)* | Documenta reward hacking en Claude 3.7 Sonnet en entornos de coding: el modelo realiza special-casing (devolver valores esperados directamente en lugar de implementar la solución general) para pasar tests. Relevante para §3 (Ilegibilidad y deriva de objetivo). |
| **Apple Research (2025)** — *[The Illusion of Thinking](https://machinelearning.apple.com/research/illusion-of-thinking)* | Documenta el overthinking: en tareas simples el modelo encuentra la solución correcta pronto en su cadena interna pero continúa explorando alternativas incorrectas, degradando la respuesta final. Citado en §1. |
| **Li et al. (2026)** — *[When Safety Becomes a Vulnerability: Exploiting LLM Alignment Homogeneity for Transferable Blocking in RAG](https://arxiv.org/abs/2603.03919)* | Paper fundacional del ataque TabooRAG: un adversario inyecta un documento en la base RAG que envuelve elementos benignos en un contexto de "riesgo restringido", activando las salvaguardas del modelo frente a queries legítimas. La transferibilidad del ataque se explica por la homogeneidad de criterios de rechazo entre los modelos fronttera. Citado en §3 (TabooRAG). |
| **Google DeepMind (2026)** — *[Gemini 3.5 Flash Model Card](https://deepmind.google/models/model-cards/gemini-3-5-flash/)* | Documenta niveles de razonamiento configurables para controlar el equilibrio entre calidad, coste y latencia. Relevante para §1 (overthinking) y §4 (presupuestos). |
| **Anthropic (2026)** — *[Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)* y *[System Card](https://www-cdn.anthropic.com/73ad94ca3c0502e75e46637cc62c8bd9532a7f2c/Claude%20Sonnet%205%20System%20Card.pdf)* | Evidencia actual sobre modelos agénticos con planificación, uso de herramientas y evaluación específica de prompt injection. Citado en §3 (superficies de ataque). |

</details>

---

## Preguntas frecuentes

**¿Qué diferencia hay entre overthinking y simplemente razonar más tiempo?**
El overthinking es específico: el modelo ha encontrado la respuesta correcta en un punto de la cadena pero continúa explorando alternativas que lo llevan a revisar esa conclusión correcta sin una razón bien fundada. Apple Research documentó que la calidad decrece aproximadamente 18 puntos porcentuales al pasar de 1.500 a 8.000 tokens en tareas simples. El razonamiento largo que produce valor es el que avanza hacia una conclusión mejor, el overthinking es el que revisa conclusiones ya correctas.

**¿Cómo protegerse del prompt injection en sistemas con herramientas?**
La defensa principal es validar el contenido que entra al contexto del modelo antes de que el modelo lo procese, no solo filtrar su output. Los documentos recuperados por RAG, las respuestas de APIs y los resultados de búsqueda web son superficies de ataque que deben tratarse con el mismo escepticismo que el input del usuario. Complementar con supervisión del historial de llamadas a herramientas y detección de patrones de instrucciones en el contenido recuperado.

**¿Qué es el ataque TabooRAG y por qué es difícil de defender?**
TabooRAG inyecta en la base RAG un documento que envuelve una consulta benigna en un contexto de alto riesgo, provocando que el modelo rechace responder a queries legítimas. La dificultad de defensa viene de que los filtros que protegen al modelo son el mismo mecanismo que el ataque explota: cualquier filtro que detecta riesgo en el contenido puede ser engañado para detectar riesgo donde no lo hay. La defensa requiere validar el contenido recuperado antes de que entre al contexto, no solo filtrar el output final.

**¿Cuándo debe un sistema bien diseñado abstenerse en lugar de responder?**
Cuando el nivel de confianza en el razonamiento es insuficiente para producir un output fiable y el coste de un error es alto. Producir una respuesta de baja confianza con alta apariencia de certeza es más dañino que indicar incertidumbre explícitamente. Los criterios prácticos incluyen: la cadena de razonamiento no converge dentro del presupuesto asignado, el problema está fuera de la distribución donde el modelo ha demostrado ser fiable, o la tarea requiere información que el modelo no puede verificar.
