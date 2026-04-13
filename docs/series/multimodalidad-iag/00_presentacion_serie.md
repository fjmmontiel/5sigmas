---
title: Multimodalidad en IA generativa
description: "Qué significa construir sistemas capaces de percibir, alinear, razonar, generar y actuar entre texto, imagen, audio, vídeo, documentos y otras señales del mundo."
keywords: multimodalidad IA, modelos multimodales, CLIP, Flamingo, Gemini, visión lenguaje, audio texto
tags:
  - IA
  - GenAI
  - LLMs
  - Multimodalidad
robots: noindex, follow
hide:
  - toc
video: "00_presentacion_serie.mp4"
---
# Multimodalidad en IA generativa

Durante un tiempo fue razonable contar la multimodalidad como la historia de cómo un modelo de lenguaje empezó a mirar imágenes, pero esa versión ya se ha quedado corta: hoy el campo incluye modelos que combinan texto, imagen, vídeo, audio y documentos en un mismo espacio de representación.

Gemini se presentó desde el inicio como una familia multimodal en texto, audio, imagen, vídeo y código. Gemini Embedding 2 convierte además el embedding multimodal en una primitiva nativa sobre texto, imágenes, vídeo, audio y documentos. Qwen2.5-Omni empuja el frente de entrada y salida multimodal en streaming, y PaLM-E recuerda que, en cuanto aparece robótica o estado del entorno, la frontera del problema vuelve a moverse.

Por eso esta serie trata la multimodalidad no como un apéndice de los LLMs ni como un catálogo de pares texto-imagen, sino como un problema más general: cómo hacer que un sistema preserve evidencia procedente de modalidades distintas, la alinee cuando hablan de lo mismo, razone con ella sin destruirla por el camino y, en algunos casos, produzca salidas también multimodales o actúe sobre herramientas y sobre el entorno.

{{ include_html("snippets/series_meta.html", series_dir="multimodalidad-iag", data_state="complete", data_level="general", status_label="Completa", level_label="General", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisitos</span><span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a></span></div>") }}

## Índice

### 1. El problema real: qué cuenta como multimodalidad

- Qué es una modalidad y por qué texto, imagen, audio, vídeo, documentos y sensores no se comportan igual.
- Por qué "convertir todo a texto" resuelve algunas tareas, pero pierde parte del problema.
- Qué significa pasar de sistemas texto-centrados a sistemas capaces de cruzar modalidades de entrada y de salida.

### 2. Alineamiento: de pares a interacciones

- Cómo se aprende que dos señales distintas hablan del mismo objeto, evento o contexto.
- Qué cambia cuando la alineación ya no es solo imagen-texto, sino audio-texto, vídeo-audio, documento-layout o percepción-acción.
- Por qué la estructura y la calidad del dato mandan más que la retórica del modelo.

### 3. Arquitecturas: espacios compartidos, conectores y modelos omni

- Dual encoders, cross-attention, conectores ligeros, secuencias intercaladas y modelos más unificados.
- Qué gana y qué pierde cada familia en coste, latencia, flexibilidad y grounding.
- Por qué el embedding multimodal y la generación multimodal no son la misma capa del sistema.

### 4. Evaluación

- Por qué medir multimodalidad exige algo más que exactitud en preguntas sobre imágenes.
- Grounding, localización, temporalidad, documentos, audio y formatos de salida heterogéneos.
- Qué nos dicen los benchmarks recientes sobre los límites reales del campo.

### 5. Riesgos

- Prompt injection multimodal, privacidad en documentos e imágenes, seguridad en voz y tool use.
- Qué cambia cuando el sistema no solo responde, sino que actúa.
- Por qué en multimodalidad la superficie de ataque y la superficie de error crecen a la vez.

---

**Series relacionadas:** [Fundamentos de IA e IA generativa](/series/fundamentos-ia-iag/00_presentacion_serie/) · [Modelos razonadores](/series/modelos-razonadores/00_presentacion_serie/)

[Ver todas las series](/series/){ .md-button }

<!-- 
## Fuentes y notas
- Radford et al. (2021) — *CLIP*: https://arxiv.org/abs/2103.00020
- Alayrac et al. (2022) — *Flamingo*: https://arxiv.org/abs/2204.14198
- Li et al. (2023) — *BLIP-2*: https://arxiv.org/abs/2301.12597
- Girdhar et al. (2023) — *ImageBind*: https://openaccess.thecvf.com/content/CVPR2023/html/Girdhar_ImageBind_One_Embedding_Space_To_Bind_Them_All_CVPR_2023_paper
- Driess et al. (2023) — *PaLM-E*: https://arxiv.org/abs/2303.03378 -->
