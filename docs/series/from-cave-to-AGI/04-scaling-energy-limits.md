# Bonus: Scaling & Energy Limits

La historia de la IA ha sido una historia de "más es mejor". Más datos, más parámetros, más cómputo. Pero, ¿podemos seguir así para siempre?

## Las Leyes de Escalado (Scaling Laws)

En 2020, investigadores de OpenAI (Kaplan et al.) publicaron un estudio que se convirtió en la biblia del sector. Demostraron que el rendimiento de un modelo (su "inteligencia") sigue una ley de potencia predecible en función de tres variables:
1.  Cantidad de cómputo.
2.  Tamaño del conjunto de datos.
3.  Número de parámetros.

La conclusión fue brutal: **la inteligencia es escalable**. No hay un techo visible. Si multiplicas el cómputo por 10, reduces el error de forma predecible.

En 2022, DeepMind refinó esto con las **Leyes de Chinchilla**. Descubrieron que estábamos haciendo modelos demasiado grandes con muy pocos datos. Para ser eficientes, por cada parámetro del modelo, necesitas entrenarlo con 20 tokens de texto. Esto desató una carrera frenética no solo por chips, sino por **datos de calidad**.

## El muro de la energía

Pero escalar tiene un coste físico. Entrenar GPT-4 costó decenas de millones de dólares en electricidad. Los nuevos centros de datos de IA consumen gigavatios, rivalizando con el consumo de países pequeños.

Aquí nos topamos con límites físicos fundamentales:
1.  **Límite de Landauer**: El principio termodinámico que dicta la energía mínima necesaria para borrar un bit de información ($kT \ln 2$). Aunque nuestros chips están lejos de este límite, la disipación de calor es un problema real.
2.  **Disponibilidad de energía**: No podemos construir centrales nucleares tan rápido como construimos GPUs. La IA está devorando la red eléctrica.

## ¿El fin de la Ley de Moore?

La Ley de Moore (la duplicación de transistores cada dos años) se está frenando. Ya estamos trabajando a escala atómica (3nm, 2nm). Si el hardware deja de mejorar exponencialmente, la única forma de seguir escalando la IA será con más energía y más dinero, hasta que sea económicamente insostenible.

La próxima gran revolución no será solo hacer modelos más grandes, sino hacerlos **más eficientes**. 
---

[Volver al inicio >](../../index.md){ .md-button .md-button--primary }

## Referencias

- [Kaplan et al. (2020): Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361)
- [Hoffmann et al. (2022): Training Compute-Optimal Large Language Models (Chinchilla)](https://arxiv.org/abs/2203.15556)
- [Landauer's Principle](https://en.wikipedia.org/wiki/Landauer%27s_principle)
