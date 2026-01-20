---
title: Multimodalidad en IA generativa
description: Representaciones, entrenamiento y producto en sistemas multimodales.
---
# Multimodalidad en IA generativa

{{ include_html("snippets/series_meta.html", series_dir="multimodalidad-iag", data_state="construction", data_level="general", data_read="6", status_label="En construcción", level_label="General", glow_hidden="true", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisitos</span><span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a></span></div>") }}

La multimodalidad es el salto de “hablar con una IA” a **interactuar con un sistema que puede combinar texto con imágenes, audio o vídeo**. El cambio importante no es añadir entradas/salidas nuevas, sino que el modelo pueda **cruzar información** entre lo que “lee” en lenguaje natural con lo que “observa” en una imagen o lo que “escucha” en un audio.


## Índice

### 1. El problema: "unificar" señales distintas
- Qué significa que un modelo pueda relacionar lo que “ve”/“oye” con lo que “entiende” en texto: una representación común, no un truco de entrada/salida.
- Qué cosas esperamos de un sistema multimodal y por qué son difíciles (describir, localizar, comparar, verificar y actuar).

### 2. Alineamiento: de pares a mundos (texto↔imagen↔audio)
- Cómo se entrena la base de pares simples (imagen↔texto) a instrucciones multimodales (pregunta→respuesta, explicación, extracción).
- Por qué la calidad y estructura de datos manda: si los pares son ruidosos, el modelo aprende asociaciones frágiles.

### 3. Arquitecturas: encoder-decoder, fusión, y modelos nativamente tokenizados
- Tres formas de conectar visión y lenguaje: convertir imagen/audio en señales “entendibles” por el modelo, fusionarlas con texto, y decidir cuándo mezclar información.
- Calidad vs coste vs latencia, y por qué algunas arquitecturas son más fáciles de servir que otras.

### 4. Evaluación
- Por qué medir multimodalidad es más difícil que medir texto (y cómo evitar autoengaños y fugas de evaluación).
- Hay que medir **grounding** (si la respuesta está sustentada en la imagen/audio).
- Hay fugas por *contaminación de benchmarks* y por “prior” lingüístico (responder por probabilidad, no por evidencia).

### 5. Riesgos: prompt-injection visual, jailbreaks y seguridad operacional
- **Prompt injection** (incluida la visual: instrucciones ocultas en la imagen).
- Fugas de sistema/políticas, y manipulación de herramientas (si hay tool-use).
- Privacidad (imágenes/documentos) y data poisoning.

<!-- 
## Fuentes y notas
- Radford et al. (2021) — *CLIP*: https://arxiv.org/abs/2103.00020
- Alayrac et al. (2022) — *Flamingo*: https://arxiv.org/abs/2204.14198
- Li et al. (2023) — *BLIP-2*: https://arxiv.org/abs/2301.12597
- Chen et al. (2023) — *PaLI*: https://arxiv.org/abs/2209.06794
- Liu et al. (2023) — *LLaVA*: https://arxiv.org/abs/2304.08485 -->
