# ¿Modelos que «razonan»?: Chain of Thought y RLHF

Tener un modelo que predice palabras (GPT-3) es impresionante, pero no es un asistente útil. Puede ser tóxico, mentir o divagar. Necesitábamos domar a la bestia.

## RLHF: Enseñando modales a la IA

**Reinforcement Learning from Human Feedback (RLHF)** fue la técnica que convirtió a GPT-3 en ChatGPT.

El proceso es híbrido:
1.  El modelo genera varias respuestas.
2.  Humanos clasifican cuál es mejor (más útil, honesta e inofensiva).
3.  Se entrena un "Modelo de Recompensa" que aprende las preferencias humanas.
4.  Se usa ese modelo para afinar al LLM original mediante aprendizaje por refuerzo.

Esto alineó a la IA con la intención humana. No solo completaba texto; seguía instrucciones.

## Chain of Thought: "Pensemos paso a paso"

En 2022, descubrimos un "truco" mágico. Si le pedías a un modelo que resolviera un problema matemático complejo, fallaba. Pero si le decías *"Let's think step by step"* (Pensemos paso a paso), acertaba.

Esto se llama **Chain of Thought (CoT)**. Obliga al modelo a generar pasos intermedios de razonamiento antes de dar la respuesta final. Al verbalizar su proceso, el modelo reduce errores lógicos.

## OpenAI o1 y los Modelos de Razonamiento (2024)

En septiembre de 2024, OpenAI lanzó **o1** (Strawberry). Este modelo no solo usa CoT cuando se lo pides; **ha sido entrenado para pensar**.

o1 genera miles de tokens de "pensamiento" oculto antes de responder. Explora caminos, verifica sus propios errores y refina su estrategia. Es el paso de la "IA rápida" (Sistema 1 de Kahneman: instintiva) a la "IA lenta" (Sistema 2: deliberativa).

## Referencias

- [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903)
- [Training language models to follow instructions with human feedback (InstructGPT)](https://arxiv.org/abs/2203.02155)
- [OpenAI o1 System Card](https://openai.com/index/openai-o1-system-card/)

---

[Siguiente: Modelos del mundo >](3-04-modelos-mundo.md){ .md-button .md-button--primary }
