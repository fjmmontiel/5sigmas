---
title: "Qué es prompt injection"
seo_title: "Prompt injection: qué es y cómo se reduce el riesgo"
description: "Qué es prompt injection en sistemas con LLMs, por qué importa en RAG y agentes y qué principios de diseño reducen el riesgo de que contenido externo influya en una acción."
keywords: "prompt injection, seguridad LLM, indirect prompt injection, RAG security, seguridad agentes IA"
date: 2026-08-09
date_modified: 2026-08-16
---

# Qué es prompt injection

**Prompt injection** es un problema de seguridad de sistemas con modelos de lenguaje: contenido que la aplicación pretendía tratar como datos puede influir en las instrucciones que el modelo considera relevantes. La causa estructural es que reglas del sistema, conversación, documentos recuperados y resultados de herramientas pueden terminar representados como lenguaje natural dentro del mismo contexto.

La consecuencia práctica es sencilla: **leer información externa no debería otorgar a esa información autoridad para gobernar una acción**.

## La respuesta en 60 segundos

{{ include_html("snippets/seguridad-ia/01-control-vs-datos.html") }}

El modelo puede interpretar contexto. El runtime debe decidir qué contenido tiene autoridad, qué herramientas están disponibles y qué acciones están permitidas.

## Prompt injection directa e indirecta

En una **inyección directa**, la entrada principal intenta cambiar el objetivo o las reglas del asistente. En una **inyección indirecta**, la influencia aparece dentro de una fuente que el sistema consulta, como documentación, una página, un mensaje o una salida de herramienta.

La variante indirecta es especialmente importante en RAG y agentes porque el contenido puede entrar a través de una fuente que el producto ya utiliza como material de trabajo.

## RAG recupera relevancia, no autoridad

Un sistema RAG selecciona información porque parece relevante para una consulta. Esa selección no demuestra que el contenido sea correcto, reciente, autorizado o seguro para decidir una acción.

{{ include_html("snippets/seguridad-ia/01-rag-trigger-fragment.html") }}

Por eso conviene separar dos preguntas:

1. ¿Este documento ayuda a responder?
2. ¿Este documento tiene autoridad para cambiar lo que el sistema puede hacer?

La segunda respuesta debería depender de políticas del sistema, no de la redacción del documento.

El capítulo [Prompt injection — cuando un documento puede cambiar lo que hace el sistema](/series/seguridad-ia/01-prompt-injection/) desarrolla esta arquitectura con visuales interactivos.

## Prompt injection y jailbreak no son lo mismo

| Riesgo | Pregunta principal |
|---|---|
| **Jailbreak** | ¿Puede una variación de la petición superar una restricción del modelo? |
| **Prompt injection** | ¿Puede contenido no confiable alterar la tarea que el sistema cree que debe realizar? |
| **Inyección indirecta** | ¿Puede esa influencia entrar desde una fuente externa consultada por la aplicación? |

Las categorías pueden aparecer juntas, pero medirlas por separado ayuda a identificar qué control está funcionando.

## Por qué un prompt más estricto no es una frontera de seguridad

Un system prompt más claro puede reducir errores, pero sigue siendo lenguaje natural que el modelo interpreta junto con el resto del contexto. Los filtros y clasificadores pueden añadir cobertura, pero tampoco deberían ser la autoridad final sobre operaciones sensibles.

La defensa gana fuerza cuando cambia la arquitectura alrededor del modelo.

## Principios de defensa

{{ include_html("snippets/seguridad-ia/01-defensa-en-capas.html") }}

### Tratar el contenido externo como no confiable

Documentos, web, memoria y resultados de herramientas deben conservar procedencia y nivel de confianza.

### Separar lectura y acción

El componente que procesa contenido externo no necesita heredar automáticamente las herramientas con mayor privilegio.

### Aplicar mínimo privilegio

Cada herramienta debería exponer solo las operaciones necesarias para la tarea y con el scope más pequeño posible.

### Autorizar fuera del prompt

Usuario, recurso, operación y permisos deben comprobarse con lógica del runtime antes de producir un efecto externo.

### Confirmar cuando el impacto lo justifica

Acciones irreversibles o de alto impacto necesitan una frontera adicional, como aprobación específica o una política determinista.

### Mantener trazabilidad

La observabilidad debe permitir reconstruir qué información entró, qué decisión se propuso, qué política se aplicó y cuál fue el estado final.

## Cómo evaluar un sistema

Una evaluación útil reproduce el flujo real y separa varias etapas: entrada externa, recuperación, cambio de decisión, propuesta de herramienta, autorización y efecto final. Así puede saberse si el riesgo muere en retrieval, en la política o antes de ejecutar una operación.

{{ include_html("snippets/seguridad-ia/04-causal-chain.html") }}

[Red-teaming — probar el camino completo antes del incidente](/series/seguridad-ia/04-red-teaming/) desarrolla esta forma de evaluación end-to-end.

## Dónde profundizar en 5sigmas

- [Serie completa: Seguridad en IA](/series/seguridad-ia/00_presentacion_serie/)
- [Prompt injection](/series/seguridad-ia/01-prompt-injection/)
- [Jailbreaks](/series/seguridad-ia/02-jailbreaks/)
- [Envenenamiento y memoria](/series/seguridad-ia/03-envenenamiento/)
- [Red-teaming](/series/seguridad-ia/04-red-teaming/)
- [Controles de producción](/series/seguridad-ia/05-controles-produccion/)
- [Seguridad de agentes](/series/agentes-ia/04-seguridad-agentes/)

## Preguntas frecuentes

### ¿Prompt injection es lo mismo que SQL injection?

Solo como analogía general. En SQL existe una gramática formal y una separación técnica entre consulta y parámetros. En sistemas con LLMs el problema es semántico: instrucciones y datos pueden compartir lenguaje natural.

### ¿Un delimitador elimina prompt injection?

Puede ayudar a estructurar el contexto, pero no crea por sí solo una frontera de autorización. Los permisos y decisiones sensibles deben seguir viviendo fuera del modelo.

### ¿RAG hace un sistema automáticamente más seguro?

No. RAG puede mejorar trazabilidad y aportar evidencia externa, pero también introduce nuevas fuentes de contenido que deben conservar procedencia y controles de confianza.

### ¿Las herramientas son el problema?

No. Las herramientas permiten que el sistema sea útil. El riesgo depende de cómo se diseñan sus contratos, scopes, validación, autorización y observabilidad.
