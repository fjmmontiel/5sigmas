# De Gotinga a Londres: la máquina que se come a sí misma (1931–1945)

El sueño de Hilbert de un sistema matemático perfecto y completo se derrumbó en 1931. Pero de los escombros surgió algo mucho más poderoso: la teoría de la computación.

## Gödel: La verdad es más grande que la prueba

**Kurt Gödel**, un joven lógico austriaco, demostró sus **Teoremas de Incompletitud**. Probó que en cualquier sistema lógico lo suficientemente complejo como para contener la aritmética:
1.  Habrá afirmaciones que son **verdaderas pero no demostrables** dentro del sistema.
2.  El sistema **no puede demostrar su propia consistencia**.

Gödel logró esto codificando la lógica en números (números de Gödel) y construyendo una frase autorreferencial que decía, esencialmente: *"Yo no puedo ser probada"*.

Si la frase es falsa, entonces puede ser probada, lo que sería una contradicción (probar algo falso). Por lo tanto, debe ser verdadera. Y como es verdadera, cumple lo que dice: no puede ser probada.

El impacto fue devastador para el Programa de Hilbert. La matemática tenía agujeros inevitables.

## Turing: La Máquina Universal

En 1936, **Alan Turing**, un estudiante en Cambridge, abordó el tercer problema de Hilbert: la **decidibilidad** (el *Entscheidungsproblem*). ¿Existe un algoritmo universal para decidir la verdad matemática?

Para responder, Turing tuvo que inventar qué es un "algoritmo". Imaginó una máquina teórica (la **Máquina de Turing**) con una cinta infinita de papel, una cabeza lectora/escritora y un conjunto finito de reglas.

Turing demostró dos cosas monumentales:
1.  **La Máquina Universal**: Es posible construir una máquina que pueda simular a *cualquier* otra máquina de Turing si se le da la descripción de esa máquina en la cinta. **Había inventado el software**. Antes, una máquina era hardware dedicado (una calculadora, un telar). Turing demostró que una sola máquina física podía ser todas las máquinas posibles simplemente cambiando su "programa".
2.  **Indecidibilidad**: Demostró que hay problemas que ninguna máquina puede resolver. El famoso **Problema de la Parada** (*Halting Problem*): no existe un programa que pueda analizar cualquier otro programa y decirte si se detendrá o se quedará en bucle infinito.

## Church y la Tesis

Al mismo tiempo, **Alonzo Church** llegó a resultados similares usando el Cálculo Lambda (la base de la programación funcional). Juntos, formularon la **Tesis de Church-Turing**: cualquier cosa que sea "computable" por un humano siguiendo reglas mecánicas, es computable por una Máquina de Turing.

Esto definió los límites físicos de la computación. Todo ordenador, desde el ENIAC hasta tu iPhone y los superordenadores de la NSA, es equivalente a una Máquina de Turing. Son más rápidos, pero no más poderosos lógicamente.

## Referencias

- [Kurt Gödel - Incompleteness Theorems](https://plato.stanford.edu/entries/goedel-incompleteness/)
- [Alan Turing - The Enigma](https://www.turing.org.uk/)
- [The Church-Turing Thesis](https://plato.stanford.edu/entries/church-turing/)

---

[Siguiente: Primeras neuronas de metal >](2-03-neuronas-metal.md){ .md-button .md-button--primary }
