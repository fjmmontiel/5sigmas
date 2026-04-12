---
title: IA Generativa
description: Qué es la IA generativa, cómo se diferencia de la IA discriminativa y qué tipos de contenido es capaz de generar. Explicación técnica en español.
keywords: IA generativa, inteligencia artificial generativa, modelos generativos, ChatGPT, generación de imágenes, texto a imagen, LLM
date: 2026-04-07
hide:
  - toc
robots: noindex
---

# IA Generativa

La IA generativa engloba los modelos capaces de producir contenido nuevo: texto, imágenes, audio, vídeo o código. Lo que los distingue de la IA discriminativa (que clasifica o predice a partir de datos existentes) es que aprenden la distribución de los datos de entrenamiento y pueden muestrear de esa distribución para crear ejemplos que no existen en el corpus original. Un modelo de lenguaje aprende cómo se distribuye el texto humano; uno de imágenes aprende cómo se distribuyen los píxeles en fotografías reales. A partir de esa representación interna, ambos generan contenido nuevo bajo condiciones (un prompt, una descripción, un estilo) en lugar de limitarse a recuperar o transformar lo que ya existe.

## En qué series aparece

<div style="display:flex;gap:.75rem;flex-wrap:wrap;margin:1.25rem 0">

<a href="/series/fundamentos-ia-iag/00_presentacion_serie/" style="flex:1;min-width:200px;text-decoration:none;border-radius:10px;border:1px solid rgba(50,74,178,.3);padding:1rem;display:flex;flex-direction:column;gap:.4rem;color:inherit">
  <div style="font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#324AB2;font-weight:700">Fundamentos de IA e IA generativa</div>
  <div style="font-size:.85rem;opacity:.8;line-height:1.4">Define con precisión qué hace generativo a un modelo, cómo se diferencia de la IA clásica y qué significa AGI en este contexto.</div>
  <div style="margin-top:.5rem;font-size:.82rem;color:#324AB2;font-weight:600">Leer →</div>
</a>

<a href="/series/multimodalidad-iag/00_presentacion_serie/" style="flex:1;min-width:200px;text-decoration:none;border-radius:10px;border:1px solid rgba(124,199,255,.3);padding:1rem;display:flex;flex-direction:column;gap:.4rem;color:inherit">
  <div style="font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#7cc7ff;font-weight:700">Multimodalidad en IA generativa</div>
  <div style="font-size:.85rem;opacity:.8;line-height:1.4">Explora cómo la generación se extiende a imagen, audio y vídeo, y qué arquitecturas permiten que un único modelo trabaje con varios tipos de contenido.</div>
  <div style="margin-top:.5rem;font-size:.82rem;color:#7cc7ff;font-weight:600">Leer →</div>
</a>

</div>

## Preguntas frecuentes

**¿En qué se diferencia la IA generativa de la IA tradicional?**
La IA tradicional (discriminativa) toma datos de entrada y produce una etiqueta o predicción: "este correo es spam", "este tumor es maligno". La IA generativa produce contenido nuevo: un párrafo, una imagen, una melodía. La diferencia no es solo de aplicación sino de arquitectura: los modelos generativos aprenden a representar cómo se distribuyen los datos, mientras que los discriminativos aprenden a separar categorías.

**¿La IA generativa solo genera texto?**
No. El término cubre modelos de texto (LLMs como GPT o Gemini), modelos de imagen (Stable Diffusion, DALL-E, Midjourney), modelos de audio (MusicGen, Bark), modelos de vídeo (Sora, Kling) y modelos de código (Codex, Copilot). Lo que tienen en común es que todos aprenden a producir salidas del mismo tipo de datos con los que se entrenaron.

**¿ChatGPT es IA generativa?**
Sí. ChatGPT es una interfaz sobre GPT-4 (o versiones posteriores), que son LLMs generativos entrenados para producir texto. La conversación es posible porque el modelo genera respuestas token a token, condicionadas por el historial del chat.

**¿Cómo genera imágenes la IA?**
Los modelos de difusión (como Stable Diffusion) aprenden a revertir un proceso de añadir ruido gaussiano a imágenes reales. Durante la generación, parten de ruido puro y aplican pasos iterativos de "desruidización" guiados por un prompt de texto, hasta obtener una imagen coherente. DALL-E 3 combina este proceso con un LLM que reformula el prompt antes de pasarlo al modelo de imagen.
