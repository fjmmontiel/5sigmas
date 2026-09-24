---
title: Seguridad en IA — ataques y defensas
description: "Una serie sobre cómo una orden escondida en un documento puede influir en un sistema con IA, cómo puede conservarse ese riesgo y qué controles limitan las acciones."
keywords: seguridad IA, prompt injection, jailbreak LLM, agentes IA, RAG security, OWASP LLM, red teaming IA
date: 2026-08-06
date_modified: 2026-09-17
tags:
  - IA
  - Seguridad
  - LLMs
video: "00_presentacion_serie.mp4"
video_poster: "00_presentacion_serie.jpg"
video_title: "Seguridad en IA"
video_duration: "PT1M30S"
video_summary: "Cómo una entrada no confiable puede influir en un sistema con IA y qué fronteras de autorización limitan que esa influencia se convierta en una acción."
hide:
  - toc
---

# Seguridad en IA

{{ include_html("snippets/series_meta.html", series_dir="seguridad-ia", data_state="complete", data_level="tecnico", status_label="Terminada", level_label="Técnico", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerrequisitos</span><span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a> · <a href=\"/series/modelos-razonadores/00_presentacion_serie/\">Modelos razonadores</a></span></div>") }}

En seguridad de software, una defensa clásica contra las [inyecciones](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html) consiste en impedir que datos no confiables modifiquen la sintaxis o el significado de una instrucción que ejecuta un intérprete. Esa frontera no resuelve todas las clases de ataque, pero sí evita que esos datos se conviertan en control por el mismo canal. En sistemas con LLMs esa separación deja de ser suficiente, porque el propio motor del sistema consume [instrucciones y datos en el mismo medio](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html): lenguaje natural.

Eso cambia la superficie de riesgo de forma estructural. Un documento recuperado por RAG, una observación escrita por otro agente, una salida de herramienta o una nota guardada en memoria pueden influir en el modelo como si fueran instrucciones. [Separar privilegios, contexto y ejecución](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) no elimina esa influencia; limita qué datos y acciones puede alcanzar si el modelo la sigue.

La serie no intenta convertir la seguridad en IA en una lista de sustos nuevos. El objetivo es separar mecanismos que suelen confundirse: qué controles reducen la probabilidad de que contenido no confiable altere el comportamiento del modelo y qué controles limitan las consecuencias —datos accesibles, herramientas y acciones— incluso cuando esa influencia ocurre.

{{ include_html("snippets/seguridad-ia/00-series-mapa.html") }}

## Índice

### 1. **Una orden escondida en un documento puede cambiar lo que hace el sistema**
- Qué se rompe exactamente cuando un LLM procesa el plano de control y el plano de datos en el mismo canal.
- Por qué la inyección indirecta puede ser más grave cuando el sistema conecta contenido no confiable con herramientas, datos o acciones con privilegios.
- Qué defensas cambian de verdad la forma del sistema.

### 2. **Pedir al modelo que ignore sus límites**
- Cómo funcionan los ataques que fuerzan al modelo a abandonar sus restricciones.
- Qué diferencia hay entre un bypass anecdótico y una familia de jailbreaks transferible.
- Qué papel pueden jugar clasificadores, streaming guards y respuesta rápida.

### 3. **Guardar una señal peligrosa dentro del sistema**
- Qué ocurre cuando el sistema aprende, recuerda o recupera contenido que no debería tratar como confiable.
- Envenenamiento de bases RAG, memoria de trabajo de agentes y backdoors persistentes.
- Por qué retirar conocimiento peligroso es más difícil de lo que parece.

### 4. **Probar el camino completo antes del incidente**
- Qué significa evaluar seguridad en sistemas agénticos y no solo en prompts aislados.
- Qué hay que probar en pipelines con herramientas, memoria y varios pasos.
- Por qué una captura bonita no basta para medir una cadena causal completa.

### 5. **Limitar lo que el sistema puede leer, cambiar y ejecutar**
- Qué arquitectura defensiva tiene sentido en sistemas reales.
- Dónde sirven los guardrails y dónde no.
- Cómo combinar políticas, sandboxing, revisión humana y telemetría sin convertir el producto en algo inútil.

---

**Series relacionadas:** [Modelos razonadores](/series/modelos-razonadores/00_presentacion_serie/) · [Agentes de IA](/series/agentes-ia/00_presentacion_serie/)

[Ver todas las series](/series/){ .md-button }
