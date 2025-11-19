# Primeras neuronas de metal: del Perceptrón al Invierno (1943–1980)

Mientras Turing definía la mente como software lógico, otros empezaron a mirar al cerebro físico. Si el cerebro es una máquina, ¿podemos construir uno pieza a pieza?

## McCulloch y Pitts: La lógica del cerebro (1943)

Warren McCulloch (neurofisiólogo) y Walter Pitts (un genio vagabundo de 19 años) publicaron un paper seminal: *A Logical Calculus of the Ideas Immanent in Nervous Activity*.

Propusieron un modelo matemático simplificado de la neurona biológica. Una neurona suma sus entradas (0 o 1) y, si supera un umbral, dispara un 1. Demostraron que una red de estas neuronas artificiales podía calcular cualquier función lógica (AND, OR, NOT).

Fue el puente entre la biología y la computación de Turing. El cerebro *es* una computadora lógica.

## Rosenblatt y el Perceptrón: La máquina que aprende (1957)

**Frank Rosenblatt** llevó esto a la práctica. Construyó el **Perceptrón Mark I**, una máquina física con fotocélulas (ojos) y potenciómetros (pesos sinápticos) conectados por cables.

A diferencia de las máquinas de Turing, que se programaban con reglas explícitas, el Perceptrón **aprendía**. Le mostrabas una imagen (ej. un triángulo), y si se equivocaba, ajustabas ligeramente los pesos para reducir el error.

El *hype* fue inmediato. El New York Times en 1958: *"La Marina revela el embrión de una computadora electrónica que se espera que sea capaz de caminar, hablar, ver, escribir, reproducirse y ser consciente de su existencia"*.

## Minsky, Papert y el cubo de agua fría (1969)

Pero el Perceptrón tenía un límite fatal. Era una red de una sola capa.

En 1969, **Marvin Minsky** y **Seymour Papert** (del MIT) publicaron el libro *Perceptrons*. Demostraron matemáticamente que un Perceptrón simple no podía aprender funciones no lineales básicas, como la **XOR** (O exclusivo).

Para resolver XOR, necesitabas capas intermedias de neuronas ("Deep Learning"), pero en esa época nadie sabía cómo entrenarlas eficientemente (el algoritmo de *Backpropagation* aún no se había popularizado).

El libro de Minsky y Papert fue devastador. Se interpretó como una prueba de que las redes neuronales eran un callejón sin salida. La financiación se evaporó.

## El primer Invierno de la IA

Comenzó el **AI Winter**. Durante los años 70 y 80, el enfoque conexionista (redes neuronales) fue marginado. La IA se volcó en los **Sistemas Expertos** (IA Simbólica): grandes bases de datos de reglas "Si-Entonces" escritas a mano por humanos.

Funcionaban bien para problemas muy acotados (diagnóstico médico, química), pero eran frágiles. No podían aprender, no tenían sentido común y fallaban estrepitosamente ante la ambigüedad del mundo real.

La IA necesitaba una nueva idea. O mejor dicho, 
---

[Siguiente: Acto III - WW qué?! >](3-01-ww-que.md){ .md-button .md-button--primary }

## Referencias

- [A Logical Calculus of the Ideas Immanent in Nervous Activity (1943)](https://www.cs.cmu.edu/~./epxing/Class/10715/reading/McCulloch.and.Pitts.pdf)
- [Frank Rosenblatt's Perceptron](https://news.cornell.edu/stories/2019/09/professors-perceptron-paved-way-ai-60-years-too-soon)
- [Minsky and Papert: Perceptrons](https://mitpress.mit.edu/9780262631112/perceptrons/)
