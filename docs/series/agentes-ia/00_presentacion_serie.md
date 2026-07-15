---
title: "Agentes de IA — de responder a actuar"
description: "Cinco capítulos para entender qué es un agente de IA, cómo usa herramientas, cómo se evalúa, qué riesgos introduce y qué hace falta para llevarlo a producción."
date: 2026-07-14
keywords: "agentes de IA, agentic AI, tool calling, workflows, evaluación de agentes, prompt injection, identidad de agentes, IA en producción"
tags:
  - IA
  - Agentes
  - Tool Calling
  - Arquitectura
video: "00_presentacion_serie.mp4"
video_duration: "PT60S"
hide:
  - toc
---

# Agentes de IA

{{ include_html("snippets/series_meta.html", series_dir="agentes-ia", data_state="complete", data_level="tecnico", status_label="Terminada", level_label="Técnico", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerrequisitos:</span> <span class=\"series-meta-value\"><a href=\"/series/fundamentos-ia-iag/00_presentacion_serie/\">Fundamentos de IA e IA generativa</a> · <a href=\"/series/modelos-razonadores/00_presentacion_serie/\">Modelos razonadores</a></span></div>") }}

Un chatbot genera respuestas. Un agente puede **decidir una secuencia de acciones**, usar herramientas y volver a observar lo que ocurre antes de continuar.<br>

Eso no convierte al modelo en una entidad autónoma ni elimina la necesidad de diseñar el sistema. Al contrario: cuando un modelo puede leer correo, consultar una base de datos, ejecutar código o cambiar un registro, el problema deja de ser solo la calidad del texto. Importan el estado, los permisos, la evaluación, el coste y la capacidad de detenerse.<br>

En esta serie construiremos un mapa técnico y práctico para separar el hype de los mecanismos que realmente hacen que un agente funcione.

## Índice

### 1. **Qué es un agente y qué no lo es**
- Diferencia entre chatbot, workflow, copiloto y agente.
- Del modelo que responde al sistema que persigue un objetivo.
- Por qué autonomía significa delegar decisiones concretas, no entregar el control completo.

### 2. **La anatomía de un agente**
- El bucle observar–planear–actuar–verificar.
- Tools, memoria, contexto, estado y runtime.
- Por qué una tool call es un contrato de software, no una capacidad mágica del LLM.

### 3. **Cómo se evalúa un agente**
- Tareas reproducibles frente a benchmarks de respuesta.
- Trazas, éxito de tarea, coste, latencia y recuperación ante fallos.
- El problema de que un agente pueda “hacer trampa” en su propia evaluación.

### 4. **Seguridad: cuando leer datos se convierte en actuar**
- Prompt injection directa e indirecta.
- Mínimo privilegio, identidad, autorización y confirmación humana.
- Por qué una única defensa en el prompt no basta.

### 5. **De la demo al sistema operable**
- Presupuestos, límites, retries, idempotencia y observabilidad.
- Trabajo asíncrono y cierre proactivo sin mentir al usuario.
- Cuándo usar un workflow determinista y cuándo un agente aporta valor real.

## La tesis de la serie

> Un agente fiable no es el que actúa más veces sin preguntar, es el que sabe qué puede hacer, cómo demostrar lo que hizo y cuándo debe parar.

**Series relacionadas:** [Fundamentos de IA e IA generativa](/series/fundamentos-ia-iag/00_presentacion_serie/) · [Modelos razonadores](/series/modelos-razonadores/00_presentacion_serie/) · [Multimodalidad en IA generativa](/series/multimodalidad-iag/00_presentacion_serie/)

[Ver todas las series](/series/){ .md-button }
