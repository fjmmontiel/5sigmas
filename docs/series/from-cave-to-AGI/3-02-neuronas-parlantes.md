# Primeras neuronas parlantes: Transformers y la predicción del siguiente token

Si 2012 fue el año de la visión, 2017 fue el año del lenguaje. Hasta entonces, las redes neuronales (RNNs, LSTMs) leían el texto palabra por palabra, olvidando el principio de una frase cuando llegaban al final. Eran lentas y "miopes".

## "Attention Is All You Need" (2017)

Un equipo de Google Brain publicó un paper con un título provocador: *Attention Is All You Need*. Presentaron el **Transformer**.

La idea clave es el mecanismo de **Auto-Atención** (*Self-Attention*). En lugar de leer secuencialmente, el Transformer mira toda la frase a la vez y calcula la relación de cada palabra con todas las demás. Puede entender que en la frase "El banco estaba cerrado porque se inundó", la palabra "inundó" se refiere al edificio, no a la institución financiera, basándose en el contexto global.

Y lo más importante: los Transformers son masivamente paralelizables. Podías tirarles miles de GPUs y terabytes de texto, y escalarían sin fin.

## GPT: Generative Pre-trained Transformer

OpenAI tomó esta arquitectura y apostó todo a una hipótesis simple: **Scaling Laws** (Leyes de Escalado). La teoría decía que si simplemente hacías el modelo más grande y le dabas más datos, se volvería más inteligente.

- **GPT-1 (2018)**: 117 millones de parámetros. Prometedor.
- **GPT-2 (2019)**: 1.5 mil millones. Escribía ensayos coherentes (y aterradores).
- **GPT-3 (2020)**: 175 mil millones. El salto cuántico.

GPT-3 no fue programado para traducir, resumir o programar. Fue entrenado solo para una cosa: **predecir la siguiente palabra**. Pero al aprender a predecir la siguiente palabra en todo el internet, aprendió de facto a razonar, traducir y codificar. 
---

[Siguiente: ¿Modelos que «razonan»? >](3-03-modelos-razonan.md){ .md-button .md-button--primary }

## Referencias

- [Attention Is All You Need (2017)](https://arxiv.org/abs/1706.03762)
- [Language Models are Few-Shot Learners (GPT-3)](https://arxiv.org/abs/2005.14165)
- [OpenAI GPT-2: Better Language Models](https://openai.com/research/better-language-models)
