---
title: Seguridad en IA — ataques y defensas
description: "Una serie sobre cómo una orden escondida en un documento puede influir en un sistema con IA, cómo puede conservarse ese riesgo y qué controles limitan las acciones."
keywords: seguridad IA, prompt injection, jailbreak LLM, agentes IA, RAG security, OWASP LLM, red teaming IA
date: 2026-05-26
robots: noindex
tags:
  - IA
  - Seguridad
  - LLMs
hide:
  - toc
---

# Seguridad en IA

{{ include_html("snippets/series_meta.html", series_dir="seguridad-ia", data_state="construction", data_level="tecnico", status_label="En construcción", level_label="Técnico", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisitos</span><span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a> · <a href=\"/series/modelos-razonadores/00_presentacion_serie/\">Modelos razonadores</a></span></div>") }}

La seguridad de software suele partir de una intuición bastante estable: si separas bien el código de los datos, las clases de ataque principales quedan acotadas. En sistemas con LLMs esa intuición deja de ser suficiente, porque el propio motor del sistema consume instrucciones y datos en el mismo medio: lenguaje natural.

Eso cambia la superficie de riesgo de forma estructural. Un documento recuperado por RAG, una observación escrita por otro agente, una salida de herramienta o una nota guardada en memoria pueden dejar de ser simples datos y convertirse en una orden operativa si el sistema no separa bien privilegios, contexto y ejecución.

La serie no intenta convertir la seguridad en IA en una lista de sustos nuevos. El objetivo es más preciso: entender dónde aparece el riesgo de verdad, qué parte pertenece a la arquitectura y qué parte pertenece a los controles, y por qué muchas mitigaciones que parecen razonables solo ganan tiempo pero no cierran el problema.

{{ include_html("snippets/seguridad-ia/00-series-mapa.html") }}

## Índice

### 1. **Una orden escondida en un documento puede cambiar lo que hace el sistema**
- Qué se rompe exactamente cuando un LLM procesa el plano de control y el plano de datos en el mismo canal.
- Por qué la inyección indirecta en RAG y agentes es más grave que el caso de chat aislado.
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
