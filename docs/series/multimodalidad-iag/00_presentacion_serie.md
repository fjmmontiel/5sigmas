---
title: Multimodalidad en IA generativa
description: Representaciones, entrenamiento y producto en sistemas multimodales.
---
# Multimodalidad en IA generativa

{{ include_html("snippets/series_meta.html", series_dir="multimodalidad-iag", data_state="construction", data_level="general", data_read="6", status_label="En construcción", level_label="General", glow_hidden="true", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisitos</span><span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a></span></div>") }}

La multimodalidad no es "añadir imágenes a un LLM". Es un cambio de diseño: cómo representas señales distintas (texto, imagen, audio, vídeo), cómo las alineas, y qué pierdes/ganas cuando intentas unificarlo todo en un solo sistema.

**Objetivo de la serie**
- Entender las piezas técnicas reales (encoders, tokens, alineamiento, datasets, objetivos).
- Separar capacidades de marketing vs límites físicos/estadísticos del entrenamiento multimodal.
- Aterrizar criterios de diseño para producto: latencia, coste, fiabilidad, evaluación y seguridad.

## Índice

### 1. El problema: "unificar" señales distintas
- Qué significa compartir espacio latente vs compartir tokens vs compartir backbone.
- Por qué la multimodalidad no es solo I/O: es inductive bias.

### 2. Alineamiento: de pares a mundos (texto↔imagen↔audio)
- Contraste, matching, captioning, instruction-tuning multimodal.
- Dónde aparece la ambigüedad y por qué escala mal sin estructura.

### 3. Arquitecturas: encoder-decoder, fusión, y modelos nativamente tokenizados
- Patrones dominantes y trade-offs (calidad vs coste vs latencia).
- Qué rompe primero cuando metes vídeo/audio.

### 4. Entrenamiento: datos, objetivos y "limpieza" multimodal
- Curación de datasets, leakage, y sesgos por modalidad.
- Por qué la evaluación es más difícil que en texto.

### 5. Inferencia: herramientas, OCR, grounding y agentes multimodales
- Cuándo usar VLM puro vs VLM+tools vs pipelines.
- Señales de confianza y verificación.

### 6. Riesgos: prompt-injection visual, jailbreaks y seguridad operacional
- Superficies nuevas de ataque y mitigaciones de diseño.

## Contenido inicial
- 01. Qué es (y qué no es) multimodalidad: el mapa mental completo
- 02. Tokens visuales: qué "ve" realmente un VLM

## Próximos artículos
- En preparación.

<!-- 
## Fuentes y notas
- Radford et al. (2021) — *CLIP*: https://arxiv.org/abs/2103.00020
- Alayrac et al. (2022) — *Flamingo*: https://arxiv.org/abs/2204.14198
- Li et al. (2023) — *BLIP-2*: https://arxiv.org/abs/2301.12597
- Chen et al. (2023) — *PaLI*: https://arxiv.org/abs/2209.06794
- Liu et al. (2023) — *LLaVA*: https://arxiv.org/abs/2304.08485 -->
