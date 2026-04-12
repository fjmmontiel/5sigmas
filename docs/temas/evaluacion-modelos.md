---
title: Evaluación de modelos de IA
description: Cómo se evalúan los modelos de IA, qué son los benchmarks, por qué la evaluación es difícil y qué benchmarks son más fiables. Guía técnica en español.
keywords: evaluación IA, benchmarks IA, MMLU, evaluación humana, saturación de benchmarks, leaderboards IA, evaluación modelos de lenguaje
date: 2026-04-07
hide:
  - toc
robots: noindex
---

# Evaluación de modelos de IA

Evaluar un modelo de IA es más difícil que entrenarlo. El entrenamiento tiene una función de pérdida clara; la evaluación requiere decidir qué capacidades importan, cómo medirlas sin que el modelo las haya memorizado y cómo comparar modelos con arquitecturas y objetivos distintos. Los benchmarks son el instrumento estándar: conjuntos de preguntas o tareas con respuestas conocidas que permiten medir rendimiento de forma reproducible. Pero tienen un problema estructural: en cuanto un benchmark se vuelve popular, los laboratorios lo incluyen en los datos de entrenamiento (a veces sin declararlo) o ajustan sus modelos para maximizar esa métrica concreta, lo que infla los resultados sin reflejar mejoras reales en capacidad general. Ese proceso se llama saturación o contaminación de benchmarks y es uno de los problemas más documentados en la evaluación de LLMs.

## En qué series aparece

<div style="display:flex;gap:.75rem;flex-wrap:wrap;margin:1.25rem 0">

<a href="/series/multimodalidad-iag/00_presentacion_serie/" style="flex:1;min-width:200px;text-decoration:none;border-radius:10px;border:1px solid rgba(124,199,255,.3);padding:1rem;display:flex;flex-direction:column;gap:.4rem;color:inherit">
  <div style="font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#7cc7ff;font-weight:700">Multimodalidad en IA generativa</div>
  <div style="font-size:.85rem;opacity:.8;line-height:1.4">El capítulo 4 cubre los benchmarks específicos para modelos multimodales (VQA, MMMU, MMBench), los problemas de saturación y las alternativas de evaluación humana.</div>
  <div style="margin-top:.5rem;font-size:.82rem;color:#7cc7ff;font-weight:600">Leer →</div>
</a>

<a href="/series/from-cave-to-agi/00_presentacion_serie/" style="flex:1;min-width:200px;text-decoration:none;border-radius:10px;border:1px solid rgba(38,166,154,.3);padding:1rem;display:flex;flex-direction:column;gap:.4rem;color:inherit">
  <div style="font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#26A69A;font-weight:700">De las cavernas a la AGI</div>
  <div style="font-size:.85rem;opacity:.8;line-height:1.4">El contexto histórico de cómo los benchmarks han guiado el campo desde los primeros sistemas de IA y cómo la escalada de modelos ha impulsado la saturación sistemática.</div>
  <div style="margin-top:.5rem;font-size:.82rem;color:#26A69A;font-weight:600">Leer →</div>
</a>

</div>

## Preguntas frecuentes

**¿Qué es un benchmark en IA?**
Un benchmark es un conjunto de pruebas estandarizadas con respuestas conocidas que permite medir el rendimiento de un modelo de forma reproducible y comparable. Ejemplos habituales: MMLU (preguntas de conocimiento general en múltiples dominios), HumanEval (código), GSM8K (razonamiento matemático elemental), VQA y MMBench (preguntas sobre imágenes). Un benchmark bien construido cubre casos representativos de una capacidad, tiene respuestas inequívocas y no ha sido visto por el modelo durante el entrenamiento.

**¿Por qué los benchmarks se saturan?**
Cuando un benchmark se vuelve la métrica estándar del campo, los laboratorios optimizan sus modelos para él, a veces incluyendo datos similares al benchmark en el entrenamiento. Después de suficientes iteraciones, los modelos superan el nivel humano en esa prueba concreta sin haber adquirido la capacidad que el benchmark pretendía medir. MMLU, ImageNet y varios benchmarks de razonamiento han pasado por ese ciclo en menos de tres años.

**¿Qué es la evaluación humana?**
La evaluación humana consiste en pedir a evaluadores (humanos entrenados o usuarios finales) que valoren las respuestas del modelo según criterios específicos: preferencia, corrección, utilidad, seguridad. Es más costosa y menos reproducible que un benchmark automatizado, pero captura matices que los benchmarks de elección múltiple ignoran. Chatbot Arena (LMSYS) es el sistema de evaluación humana por preferencia más citado en LLMs.

**¿Qué benchmarks son más fiables en 2025?**
Los más resistentes a la contaminación son los que usan datos que aún no existen en internet: GPQA Diamond (preguntas de doctorado verificadas por expertos), FrontierMath (problemas matemáticos originales inéditos) y LiveCodeBench (código extraído de competiciones recientes). Los benchmarks con datos públicos y estáticos (MMLU, HellaSwag) se consideran saturados para los modelos de última generación.

**¿Los modelos hacen trampa en los benchmarks?**
El término técnico es "contaminación de datos de prueba" (test set contamination): el benchmark o datos similares aparecen en el corpus de preentrenamiento. Algunos laboratorios lo reportan (OpenAI publicó análisis de contaminación para GPT-4), otros no. Es difícil detectarlo porque los corpus de preentrenamiento son enormes y opacos. Por eso la tendencia es hacia benchmarks dinámicos, con datos generados bajo demanda, que los modelos no pueden haber memorizado.
