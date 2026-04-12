---
title: Mecanizar — de Babbage a Turing
description: "Cómo la humanidad automatizó el cálculo: de los primeros mecanismos físicos a la separación de programa y hardware, y los fundamentos teóricos de la computación moderna."
date: 2026-03-26
keywords: "historia computación, Alan Turing, Charles Babbage, máquina de Turing, ENIAC, Von Neumann, historia ordenadores, automatización cálculo, computación teórica"
tags:
  - IA
  - Historia
---

# Capítulo 2: Mecanizar (≈ 1640 - 1956)

Este capítulo explica cómo la humanidad pasó de calcular con máquinas físicas a diseñar ordenadores de propósito general capaces de ejecutar cualquier programa. Al terminarlo entenderás por qué la separación entre instrucciones y mecanismo fue el giro conceptual decisivo de toda la historia de la computación, cómo Alan Turing definió qué significa computar antes de que existiera ningún ordenador moderno y de qué forma la lógica booleana dejó de ser filosofía y se convirtió en ingeniería de circuitos. No se necesita base técnica previa, aunque conocer el capítulo anterior ayuda. La historia recorre tres siglos en los que cada avance revela que el límite no era el hardware, sino la pregunta que alguien se atrevió a plantear.

En el capítulo anterior vimos cómo la humanidad aprendió a representar cantidades, relaciones y cambios con símbolos. Una vez que esos símbolos podían manipularse mediante reglas, la siguiente pregunta surgía casi sola: si un procedimiento está bien definido, ¿puede ejecutarlo una máquina?

La respuesta no apareció de golpe. Llegó en capas. Primero automatizamos operaciones concretas. Después aprendimos a codificar instrucciones fuera de la máquina. Más tarde comprendimos que la lógica también podía expresarse de forma mecánica. Y, finalmente, construimos dispositivos capaces de almacenar programas, ejecutar operaciones en base a condiciones y tratar la información como una magnitud formal.

Este capítulo recorre ese trayecto. No es solo la historia de cómo llegamos a construir ordenadores. Es la historia de cómo convertimos procedimientos abstractos en procesos ejecutables.

---

## 1. De automatizar cuentas a programar procedimientos

### Las primeras calculadoras: automatizar no es programar

La [Pascalina](https://www.britannica.com/technology/Pascaline), construida por Blaise Pascal entre 1642 y 1644, automatizaba sumas y restas mediante ruedas dentadas. Pocas décadas después, el [Step Reckoner de Leibniz](https://www.britannica.com/technology/Step-Reckoner) amplió esa idea y permitió multiplicar y dividir a partir de repeticiones mecánicas de operaciones más simples.

El salto era importante, pero todavía estábamos ante máquinas de cálculo, no ante ordenadores en sentido pleno. Estas máquinas ejecutaban una familia concreta de operaciones. No almacenaban una secuencia general de instrucciones, no podían alterar su comportamiento en función de estados intermedios y no separaban de forma clara el mecanismo que opera del procedimiento que debe seguir.

{{ include_html("snippets/from-cave-to-agi/02-limite-calculadoras.html") }}

### Jacquard: cuando las instrucciones se separan del mecanismo

El siguiente avance decisivo no llegó desde la matemática, sino desde la industria textil. El [telar de Jacquard](https://www.britannica.com/technology/Jacquard-loom), desarrollado en 1804-1805, utilizaba tarjetas perforadas intercambiables para controlar patrones complejos de tejido. La máquina no "entendía" el dibujo. Simplemente ejecutaba una secuencia de instrucciones codificadas en un soporte externo.

Aquí aparece una idea que cambiará toda la historia posterior. El comportamiento de una máquina puede depender de una descripción intercambiable de pasos. No estamos todavía ante software moderno, pero sí ante un precursor claro de la programabilidad: el mecanismo y las instrucciones dejan de estar completamente fundidos.

### Babbage y Lovelace: la máquina general aún antes de existir

Charles Babbage llevó esa intuición mucho más lejos con la [Máquina Analítica](https://www.britannica.com/technology/Analytical-Engine). En su diseño aparecen ya varias piezas que hoy nos resultan familiares: una unidad de cálculo, una memoria separada, tarjetas perforadas para datos e instrucciones, ejecución no estrictamente secuencial y capacidad de bifurcación condicional.

La máquina nunca llegó a construirse por completo, pero conceptualmente ya estaba mucho más cerca de un ordenador general que de una calculadora mecánica. No era una máquina hecha para una sola operación. Era una máquina pensada para ejecutar procedimientos distintos.

En 1843, [Ada Lovelace](https://www.computerhistory.org/babbage/adalovelace/) publicó sus célebres notas sobre la Máquina Analítica. Allí aparece lo que suele considerarse el primer programa publicado para una máquina computacional: un procedimiento para calcular números de Bernoulli. Su intuición más profunda fue todavía más ambiciosa. Si una máquina puede manipular símbolos según reglas, entonces no está limitada a números en sentido estrecho. Puede operar sobre cualquier dominio que admita una notación suficientemente precisa, una idea que anticipa la computación de propósito general mucho antes de que existiera el hardware capaz de sostenerla.

---

## 2. Cuando la lógica se volvió ingeniería

### Boole: dar forma algebraica al razonamiento

George Boole dio a la lógica una forma algebraica en *The Mathematical Analysis of Logic* y la desarrolló con más madurez en *[An Investigation of the Laws of Thought](https://www.gutenberg.org/ebooks/15114)*. Su aportación fue mostrar que proposiciones y relaciones lógicas podían tratarse con operaciones formales.

El valor de este paso no está solo en la elegancia matemática. Está en que convierte el razonamiento lógico en algo susceptible de representación simbólica rigurosa. A partir de ahí, pensar lógicamente deja de ser solo una actividad verbal o filosófica y pasa a poder describirse mediante estructuras discretas y manipulables.

### Shannon: el puente entre lógica y circuitos

Durante décadas, el álgebra de Boole fue una construcción brillante con poca traducción práctica. El puente llegó con Claude Shannon. En su tesis de máster de 1937, publicada después como *[A Symbolic Analysis of Relay and Switching Circuits](https://dspace.mit.edu/handle/1721.1/11173)*, mostró que el álgebra booleana podía aplicarse al diseño de circuitos de conmutación.

Ese enlace fue decisivo. Ya no se trataba solo de razonar sobre verdadero y falso en un papel, sino de construir dispositivos físicos que implementaran operaciones lógicas. Ahí nace la lógica digital como base material de la computación moderna. La proposición lógica deja de ser solo una forma de pensar y pasa a ser una forma de cablear.

{{ include_html("snippets/from-cave-to-agi/02-puertas-logicas.html") }}

### Turing: definir qué significa computar

En 1936, Alan Turing publica *[On Computable Numbers, with an Application to the Entscheidungsproblem](https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf)*. Su contribución no fue describir una máquina concreta, sino aislar lo esencial de cualquier proceso mecánico de cálculo: leer símbolos, escribir símbolos, cambiar de estado y seguir reglas finitas paso a paso.

La potencia de esta abstracción es enorme. Por un lado, la máquina de Turing ofrece un modelo general de computación. Por otro, deja claro que la computación también tiene fronteras. No existe un procedimiento general capaz de decidir, para cualquier programa y cualquier entrada, si esa ejecución terminará o continuará indefinidamente. Ese resultado, conocido hoy como *halting problem*, marca uno de los límites formales más importantes de la computación.

<details class="s5-optional">
  <summary>Ampliación opcional: por qué no podemos saber siempre si un programa terminará</summary>

  <div class="s5-optional__body">
    <p>
      Aquí no hablamos de un caso práctico aislado, como un programa mal escrito que entra en un bucle infinito.
      La afirmación es mucho más fuerte: no existe un método general que, recibiendo cualquier programa y cualquier entrada,
      pueda decidir siempre y en tiempo finito si esa ejecución terminará o seguirá indefinidamente.
    </p>

    <p>
      La intuición puede parecer engañosa al principio. En muchos casos concretos sí podemos razonar sobre la terminación.
      Podemos ver, por ejemplo, que un contador baja hasta cero, o que una recursión tiene un caso base claro.
      Lo que Turing demuestra es que no puede existir un verificador universal válido para todos los programas posibles.
    </p>

    <p>
      La idea de la demostración consiste en suponer que sí existe ese verificador general. Imaginemos una función
      <code>TERMINA(programa, entrada)</code> que responde siempre correctamente:
    </p>

    <pre><code>TERMINA(programa, entrada) =
  "sí"  si el programa acaba
  "no"  si el programa no acaba nunca</code></pre>

    <p>
      A partir de ahí puede construirse otro programa que use ese verificador para comportarse justamente al revés de lo predicho
      cuando se analiza a sí mismo. Si el verificador dice que terminará, entra en bucle. Si el verificador dice que no terminará,
      entonces se detiene.
    </p>

    <pre><code>PARADOJA(x):
  si TERMINA(x, x) = "sí":
    repetir para siempre
  si TERMINA(x, x) = "no":
    terminar</code></pre>

    <p>
      El problema aparece cuando ese programa se ejecuta sobre su propio código, es decir, cuando evaluamos <code>PARADOJA(PARADOJA)</code>.
      Si el verificador predice que termina, entonces el programa entra en bucle. Si predice que entra en bucle, entonces termina.
      En ambos casos aparece una contradicción.
    </p>

    <p>
      La conclusión no es que nunca podamos demostrar que un programa concreto termina.
      La conclusión es más precisa y más importante: no existe un procedimiento único, automático y universal que resuelva esa pregunta para todos los casos.
      Ahí aparece una de las primeras fronteras formales de la computación.
    </p>
  </div>
</details>

Ese resultado cambia el tono de toda la disciplina. La computación deja de ser solo una promesa de automatización ilimitada y pasa a tener límites demostrables. No todo problema difícil es simplemente una cuestión de más tiempo o más hardware, porque hay fronteras que nacen de la propia estructura matemática del problema.

{{ include_html("snippets/from-cave-to-agi/02-maquina-turing.html") }}

### Shannon otra vez: medir la información sin depender del significado

En 1948, Shannon vuelve a cambiar el marco con *[A Mathematical Theory of Communication](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf)*. Esta vez el foco no está en circuitos lógicos, sino en la información como cantidad medible. El giro conceptual es muy profundo: para construir una teoría general de la comunicación, el mensaje debe analizarse sin depender de su significado.

De ahí salen ideas centrales para todo lo que vendrá después: compresión, capacidad de canal, redundancia, transmisión fiable con ruido y la noción práctica de bit como unidad elemental de información. La computación moderna no solo necesita lógica y memoria. Necesita también una teoría precisa de cuánto puede representarse, transmitirse y reconstruirse.

---

## 3. Llevar el programa dentro de la máquina

### El programa almacenado: la gran simplificación conceptual

La siguiente transformación consiste en mover las instrucciones al interior de la propia máquina. El principio de [programa almacenado](https://www.britannica.com/technology/stored-program-concept) sostiene que instrucciones y datos pueden residir en la misma memoria y ser tratados bajo una codificación común.

Esta idea quedó asociada al *[First Draft of a Report on the EDVAC](https://archive.computerhistory.org/resources/text/Knuth_Don_X4100/PDF_index/k-8-pdf/k-8-u2593-Draft-EDVAC.pdf)* de 1945 y, con el tiempo, a la llamada arquitectura de von Neumann. El efecto práctico fue inmenso. Cambiar de tarea ya no exigía recablear físicamente la máquina o sustituir mecanismos externos. Bastaba con cambiar el contenido de memoria.

Aquí la separación entre hardware y programa deja de ser una intuición externa, como en Jacquard, y se convierte en el principio organizador del ordenador moderno.

### ENIAC, Baby y EDSAC: el ordenador deja de ser una idea

Conviene distinguir bien los hitos porque suelen mezclarse. [ENIAC](https://www.britannica.com/technology/ENIAC), completado en 1945, demostró que la computación electrónica de propósito general era físicamente viable. Pero reprogramarlo seguía siendo costoso y engorroso porque dependía de paneles y cableado.

El [Manchester Baby](https://www.computerhistory.org/revolution/birth-of-the-computer/4/87) fue en 1948 la primera máquina en ejecutar un programa almacenado desde memoria. Era una demostración experimental, no un servicio estable de computación, pero marcó el cambio de régimen.

[EDSAC](https://www.britannica.com/technology/EDSAC), operativa en 1949 en Cambridge, convirtió ese principio en una máquina útil para usuarios reales: el ordenador programable como infraestructura práctica, ya no solo como demostración experimental.

{{ include_html("snippets/from-cave-to-agi/02-ciclo-von-neumann.html") }}

### Dartmouth: cuando la pregunta pasa de computar a pensar

Cuando John McCarthy, Marvin Minsky, Nathaniel Rochester y Claude Shannon redactan en 1955 la propuesta del *[Dartmouth Summer Research Project on Artificial Intelligence](https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html)* para el verano de 1956, el armazón técnico ya está montado. Existen lógica simbólica, circuitos digitales, teoría de la computación, información cuantificable y ordenadores electrónicos programables.

La novedad ya no consiste en preguntar si una máquina puede calcular. Esa parte empieza a estar resuelta. La nueva pregunta es si procesos como aprender, abstraer, usar lenguaje o resolver problemas también pueden describirse con precisión suficiente como para ser ejecutados por una máquina.

La IA no nace en un vacío. Nace cuando la computación general deja de ser una aspiración y se convierte en una base real sobre la que imaginar algo más ambicioso.

{{ include_html("snippets/from-cave-to-agi/02-timeline-mecanizar.html") }}

---

## 4. Lo que este periodo dejó preparado

Al llegar a 1956, la humanidad ya no solo sabía representar el mundo con símbolos. Sabía construir máquinas para manipular esos símbolos de forma automática, reutilizable y general. Habíamos pasado de automatizar cuentas concretas a diseñar dispositivos capaces de ejecutar programas, implementar lógica, almacenar instrucciones y operar sobre información cuantificable.

Ese cambio lo transforma todo. A partir de aquí, la gran cuestión ya no será cómo mecanizar el cálculo, sino cómo conseguir que la máquina ajuste su comportamiento a partir de experiencia, datos y objetivos. Ese es el punto de partida del siguiente capítulo.

!!! tip "Siguiente capítulo"
    [Capítulo 3 — Aprender →](./03-aprender.md) — Cómo se consigue que una máquina mejore a partir de datos: del perceptrón y los sistemas expertos al renacimiento del deep learning antes de 2012.

---

## 5. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | [Britannica — Pascaline](https://www.britannica.com/technology/Pascaline) | La calculadora de Pascal y su alcance real. |
| R2 | [Britannica — Step Reckoner](https://www.britannica.com/technology/Step-Reckoner) | La máquina de Leibniz y la ampliación de la aritmética mecánica. |
| R3 | [Britannica — Jacquard loom](https://www.britannica.com/technology/Jacquard-loom) | Tarjetas perforadas y automatización de secuencias. |
| R4 | [Britannica — Analytical Engine](https://www.britannica.com/technology/Analytical-Engine) | Diseño de Babbage, tarjetas, memoria y control condicional. |
| R5 | [Computer History Museum — Ada Lovelace](https://www.computerhistory.org/babbage/adalovelace/) | Notas de 1843, números de Bernoulli y la idea de programación. |
| R6 | [Project Gutenberg — Boole, *An Investigation of the Laws of Thought*](https://www.gutenberg.org/ebooks/15114) | Texto clásico sobre lógica algebraica. |
| R7 | [MIT DSpace — Shannon, *A Symbolic Analysis of Relay and Switching Circuits*](https://dspace.mit.edu/handle/1721.1/11173) | El puente entre álgebra booleana y circuitos. |
| R8 | [Turing (1936) — *On Computable Numbers*](https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf) | Máquina de Turing, computabilidad y límites. |
| R9 | [Shannon (1948) — *A Mathematical Theory of Communication*](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf) | Fundamentos de teoría de la información. |
| R10 | [Britannica — Stored-program computer](https://www.britannica.com/technology/stored-program-concept) | El principio de programa almacenado. |
| R11 | [Computer History Museum — *First Draft of a Report on the EDVAC*](https://archive.computerhistory.org/resources/text/Knuth_Don_X4100/PDF_index/k-8-pdf/k-8-u2593-Draft-EDVAC.pdf) | Documento clave en la difusión del modelo de programa almacenado. |
| R12 | [Britannica — ENIAC](https://www.britannica.com/technology/ENIAC) | Primer gran ordenador electrónico de propósito general. |
| R13 | [Computer History Museum — Manchester Baby](https://www.computerhistory.org/revolution/birth-of-the-computer/4/87) | Primera ejecución de un programa almacenado en memoria. |
| R14 | [Britannica — EDSAC](https://www.britannica.com/technology/EDSAC) | Primer ordenador de programa almacenado con uso práctico regular. |
| R15 | [Stanford / John McCarthy — Dartmouth proposal](https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html) | Texto fundacional del proyecto de verano de 1956. |

</details>

---

## Preguntas frecuentes

**¿En qué se diferencia automatizar de programar?**
Automatizar significa reproducir mecánicamente una operación concreta y fija, como sumaba la Pascalina mediante ruedas dentadas. Programar implica separar el mecanismo que opera del procedimiento que debe seguir, de forma que la misma máquina pueda ejecutar procedimientos distintos sin recablear físicamente nada. Esa separación es el giro conceptual que lleva de la calculadora al ordenador, y Babbage ya la intuía en el diseño de su Máquina Analítica décadas antes de que existiera el hardware capaz de sostenerla.

**¿Qué demostró Turing con la máquina de Turing antes de que hubiera ordenadores?**
Demostró que era posible aislar lo esencial de cualquier proceso mecánico de cálculo (leer símbolos, escribir símbolos, cambiar de estado y seguir reglas finitas) y al mismo tiempo demostró que esa misma estructura tiene límites formales. El halting problem no es una limitación práctica del hardware, sino un resultado matemático: no puede existir un procedimiento general que decida siempre si cualquier programa terminará o continuará indefinidamente.

**¿Por qué fue tan importante que instrucciones y datos compartan la misma memoria?**
Porque convirtió el cambio de tarea en una operación de contenido, no de estructura física. Antes del programa almacenado, reprogramar una máquina como ENIAC implicaba días de recableado de paneles. Con el principio de von Neumann, basta con cambiar lo que está escrito en memoria, y eso hace posible los ordenadores de propósito general: la misma arquitectura física ejecuta programas radicalmente distintos.

**¿Qué problema real resolvió el ordenador de programa almacenado que las calculadoras anteriores no podían?**
Las calculadoras mecanizaban operaciones concretas y predefinidas, útiles para cálculos repetitivos pero incapaces de adaptar su comportamiento a estados intermedios o de ejecutar lógica condicional. El ordenador de programa almacenado, como EDSAC en 1949, permitió a investigadores reales presentar un problema, describirlo en instrucciones almacenadas en memoria y obtener resultados sin reconstruir nada físico, convirtiendo la computación en una infraestructura práctica reutilizable.