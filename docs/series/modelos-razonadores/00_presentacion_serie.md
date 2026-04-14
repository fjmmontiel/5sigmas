---
title: Modelos razonadores — test-time compute, cadenas de pensamiento y fallos sistemáticos
description: "Cinco capítulos sobre cómo razonan los LLMs y qué cuesta ese razonamiento en producción. Test-time compute, sycophancy, specification gaming, latencia real y riesgos de los modelos razonadores con herramientas."
keywords: modelos razonadores, test-time compute, chain of thought, razonamiento LLM, o1 OpenAI, DeepSeek R1, RLVR, GRPO, sycophancy, PRM, ORM, latencia IA, TTFT, overthinking IA, specification gaming, budget forcing, cadenas de pensamiento, razonamiento extendido, fallos LLM
tags:
  - IA
  - LLMs
  - Razonamiento
hide:
  - toc
---

# Modelos razonadores

{{ include_html("snippets/series_meta.html", series_dir="modelos-razonadores", data_state="complete", data_level="tecnico", status_label="Terminada", level_label="Técnico", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerrequisitos</span><span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a></span></div>") }}

Los LLMs pueden *parecer* que razonan, pero “razonar” es una cualidad inherentemente humana. Lo podemos definir como un **proceso** con diferentes pasos cuyo recorrido consume **tiempo físico** (latencia), energía mental (**cómputo**) y no es infalible (**alucinaciones**).<br>

En esta serie explicaremos que si el razonamiento es un proceso, entonces el tiempo de ejecución es una variable más. Puedes **pagar más pasos**, más muestras, más verificación o más interacción con herramientas para **mejorar la calidad de la respuesta**.<br>

## Índice

### 1. **Qué es “razonar” para un LLM**
- Veremos qué definiciones de razonamiento pueden encajar en el contexto de los LLMs. 
- Nacimiento de los modelos razonadores: o1 de OpenAI como punto de partida.
- Repaso del paper de Apple sobre "The illusion of thinking" y la respuesta de Anthropic<br>

### 2. **Cómo se ven los fallos de estos sistemas**
- Los fallos de este tipo de modelos no son aleatorios, definiremos sus diferentes tipos: Atajos, errores sistemáticos, deriva de objetivo y más.
- Veremos los métodos para detectarlos y mitigarlos al máximo.

### 3. **Test-Time Compute**
- Test-time compute como una nueva ley de escala para la IA generativa.
- Palancas para aprovechar al máximo esta nueva ley de escala: Más pasos internos, más generación de candidatos, más estructura.
- Relación entre una calidad superior de las respuestas asociada a un mayor coste y latencia. 

### 4. **Tiempo físico: latencia, streaming, interacción humana**
- Veremos cómo “pensar más” en un paper es barato. En un producto, significa: El usuario espera, la sesión es más cara y el sistema tiene más puntos posibles de rotura. 
- ¿Dónde está el umbral de latencia aceptable para esta tarea y este usuario? (Lanzamiento de GPT-5 como enrutador)
- Veremos qué patrones nos pueden ayudar a optimizar al máximo los beneficios del test-time compute.

### 5. **Riesgos: overthinking, coste, ataques, alineamiento**
- Veremos por qué con **más Test-Time Compute** puede aparecer **sobrepensamiento**, bucles improductivos y degradación de la calidad.
- Aterrizaremos **calidad vs coste vs latencia**, y cómo se manifiesta en producto (SLOs, colas, facturas impredecibles, peor experiencia).
- Nuevas superficies de riesgo cuando hay **herramientas / RAG / navegación**: prompt injection, contaminación de contexto y uso indebido de tools.
- Cerraremos con criterios de diseño: **presupuestos duros** (tiempo/tokens/tools), **señales de parada**, **verificación cuando sea crítico** y **fallbacks** (pedir datos, degradar, abstenerse o derivar).

---

**Series relacionadas:** [Fundamentos de IA e IA generativa](/series/fundamentos-ia-iag/00_presentacion_serie/) · [De las cavernas a la AGI](/series/from-cave-to-agi/00_presentacion_serie/)

[Ver todas las series](/series/){ .md-button }

<!-- ## Fuentes y notas

* Wei et al. (2022) — *Chain-of-Thought Prompting*: [https://arxiv.org/abs/2201.11903](https://arxiv.org/abs/2201.11903)
* Wang et al. (2022) — *Self-Consistency Improves Chain of Thought*: [https://arxiv.org/abs/2203.11171](https://arxiv.org/abs/2203.11171)
* Yao et al. (2022) — *ReAct*: [https://arxiv.org/abs/2210.03629](https://arxiv.org/abs/2210.03629)
* Schick et al. (2023) — *Toolformer*: [https://arxiv.org/abs/2302.04761](https://arxiv.org/abs/2302.04761)
* Yao et al. (2023) — *Tree of Thoughts*: [https://arxiv.org/abs/2305.10601](https://arxiv.org/abs/2305.10601) -->
