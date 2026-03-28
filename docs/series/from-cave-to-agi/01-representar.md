---
title: Representar — del conteo al cálculo
description: "Cómo la humanidad aprendió a representar el mundo con símbolos manipulables: desde las primeras muescas de hueso hasta el álgebra, el cálculo diferencial y la notación que hizo posible la IA moderna."
date: 2026-03-26
keywords: "historia de las matemáticas, representación simbólica, álgebra, cálculo diferencial, historia computación, Leibniz Newton, notación matemática, origen inteligencia artificial"
---

# Capítulo 1: Representar (≈ 43 000 a. C. hasta 1700)

En este capítulo recorremos un proceso larguísimo y decisivo: cómo la humanidad pasó de marcar cantidades en objetos físicos a construir un lenguaje matemático capaz de describir relaciones, demostrar conclusiones y anticipar el comportamiento del mundo.

No es solo una historia de números, es la historia de como los seres humanos aplicamos la abstracción. 

El cambio profundo llegó cuando aceptamos que una marca podía sustituir a una cosa, que una letra podía representar una cantidad desconocida y que una deducción podía ser válida aunque no tocara directamente ningún objeto físico. En esa distancia entre el mundo y su representación nace una parte esencial de la historia intelectual que más tarde hará posible la computación.

---

## 1. Inventamos lenguajes para describir el mundo

### Antes de escribir, ya contábamos

La necesidad de contar es mucho más antigua que la escritura. Objetos con muescas del Paleolítico, como el hueso de Lebombo y el hueso de Ishango, no prueban por sí solos la existencia de una matemática formal, pero sí muestran algo más básico y más importante: grupos humanos muy antiguos ya utilizaban secuencias de marcas para registrar, organizar o recordar cantidades ([Royal Society](https://royalsocietypublishing.org/rstb/article/373/1740/20160518/23403/From-number-sense-to-number-symbols-An), [PNAS Border Cave](https://pmc.ncbi.nlm.nih.gov/articles/PMC3421171/), [Royal Belgian Institute of Natural Sciences](https://www.naturalsciences.be/en/museum/exhibitions-activities/exhibitions/250-years-of-natural-sciences/the-ishango-bone)).

Ese gesto es más profundo de lo que parece. Una muesca no es una oveja, no es un día, no es un saco de grano. 
Es una representación física de cualquiera de esos conceptos. Y en cuanto aceptas que una marca puede hablar en nombre de algo ausente, aparece una idea que atraviesa toda la historia posterior: pensar operando sobre símbolos.

### Números, posición y cero

Durante milenios, distintas civilizaciones desarrollaron maneras propias de representar cantidades. Los egipcios usaban un sistema aditivo. Los romanos también. Los babilonios introdujeron un sistema posicional muy potente. La diferencia importa porque, en un sistema posicional, el valor de un símbolo depende también del lugar que ocupa. Esa idea multiplica la capacidad expresiva de un conjunto pequeño de signos.

El desarrollo del cero requiere distinguir dos pasos históricos que a menudo se mezclan. Un paso es usar una marca para señalar una ausencia dentro de un sistema posicional. 
Otro paso, mucho más ambicioso, es tratar esa ausencia como un número con reglas propias. En India encontramos ambas piezas en momentos distintos: el manuscrito Bakhshali muestra un punto usado como placeholder, y siglos después Brahmagupta formula reglas aritméticas explícitas para operar con cero como número ([Oxford GLAM](https://www.glam.ox.ac.uk/article/carbon-dating-finds-bakhshali-manuscript-contains-oldest-recorded-origins-symbol-zero), [Britannica: zero](https://www.britannica.com/science/zero-mathematics), [Britannica: Brahmagupta](https://www.britannica.com/biography/Brahmagupta)).

Con ese paso, la representación numérica gana una generalidad nueva. Ya no solo registramos cantidades concretas. Podemos construir un sistema compacto, reutilizable y formal para expresar cualquier cantidad y operar con ella siguiendo reglas estables. Más tarde, esa tradición pasará al mundo islámico y desde ahí a Europa ([Britannica: zero](https://www.britannica.com/science/zero-mathematics)).

{{ include_html("snippets/from-cave-to-agi/01-sistemas-numeracion.html") }}

### Álgebra: operar con lo que todavía no sabemos

El siguiente salto ya no consiste en representar cantidades visibles, sino en razonar sobre cantidades desconocidas. En el siglo IX, al-Khwarizmi sistematizó procedimientos para resolver ecuaciones lineales y cuadráticas en *Al-Kitab al-mukhtasar fi hisab al-jabr wa-l-muqabala*. De *al-jabr* viene la palabra álgebra, y de la latinización de su nombre vendrá más tarde la palabra algoritmo ([Britannica: The Compendious Book on Calculation by Completion and Balancing](https://www.britannica.com/topic/The-Compendious-Book-on-Calculation-by-Completion-and-Balancing), [Britannica: al-Khwarizmi](https://www.britannica.com/biography/al-Khwarizmi), [MacTutor: Al-Khwarizmi](https://mathshistory.st-andrews.ac.uk/Biographies/Al-Khwarizmi/)).

Hay una precisión importante aquí. El álgebra de al-Khwarizmi todavía no es la notación simbólica moderna. Sus métodos son retóricos y se apoyan en argumentos geométricos. Pero el cambio conceptual ya está hecho: se puede transformar una expresión paso a paso, siguiendo reglas generales, hasta despejar lo que no conocíamos al principio.

### La notación comprime el pensamiento

Entre el álgebra retórica medieval y el cálculo hay una pieza decisiva: la notación. 
François Viète introdujo la primera notación algebraica sistemática, usando letras para variables y parámetros. Pocas décadas después, Descartes y Fermat llevaron esa compresión simbólica un paso más lejos al conectar ecuaciones y geometría. 
Una curva dejaba de ser solo una figura para convertirse también en una relación expresable por símbolos ([Britannica: François Viète](https://www.britannica.com/biography/Francois-Viete-seigneur-de-la-Bigotiere), [Britannica: Analytic geometry](https://www.britannica.com/science/analytic-geometry), [Britannica: mathematics / analytic geometry](https://www.britannica.com/science/mathematics/Analytic-geometry), [Britannica: La Géométrie](https://www.britannica.com/topic/La-Geometrie)).

Esto cambia el tipo de pensamiento que se puede hacer. Con buena notación, una idea compleja cabe en menos espacio mental. Y cuando una idea cabe en símbolos compactos, se vuelve más fácil transformarla, combinarla y generalizarla.

{{ include_html("snippets/from-cave-to-agi/01-algebra-despejar.html") }}

---

## 2. Formalizar la verdad

### La geometría griega y el ideal deductivo

Los griegos añadieron algo que va más allá del cálculo práctico: un estándar de justificación. En los *Elementos*, Euclides organiza resultados a partir de definiciones, postulados y demostraciones encadenadas. 
No se trata solo de llegar a una conclusión correcta, sino de mostrar por qué esa conclusión se sigue de forma necesaria a partir de supuestos aceptados ([Britannica: Elements](https://www.britannica.com/topic/Elements-by-Euclid), [Britannica: Euclid](https://www.britannica.com/biography/Euclid-Greek-mathematician), [Britannica: Euclidean geometry](https://www.britannica.com/science/Euclidean-geometry)).

Ese ideal deductivo cambia la naturaleza del conocimiento matemático. Dentro del sistema, la autoridad ya no está en la tradición, ni en la intuición, ni en la experiencia inmediata, sino en la cadena de inferencias. Cada paso puede revisarse y cada conclusión puede reconstruirse.

{{ include_html("snippets/from-cave-to-agi/01-cadena-deductiva.html") }}

### El poder y el límite de la abstracción

La fuerza de este enfoque es enorme. Permite obtener verdades necesarias a partir de una estructura formal. 
Pero también tiene un límite claro, solo funciona sobre objetos idealizados. Una recta geométrica no tiene grosor, un triángulo no tiene errores de medición. El rigor nace precisamente de esa distancia respecto del mundo físico.

Esta distinción será crucial más adelante. La matemática gana potencia cuando abstrae, pero la ciencia solo gana poder explicativo cuando logra volver desde esa abstracción al mundo observado. La historia moderna de la ciencia consiste, en buena medida, en aprender a recorrer bien ese doble trayecto.

---

## 3. Hacer ciencia con matemáticas

### Cuando la naturaleza empezó a escribirse en ecuaciones

En el siglo XVII ocurre una transformación decisiva. Galileo matematiza el movimiento terrestre, Kepler formula leyes cuantitativas para las órbitas planetarias y Newton reunirá ambas líneas en una mecánica unificada. 
A partir de ahí, la naturaleza deja de ser solo algo que se describe con palabras y pasa a ser algo que también se expresa con relaciones matemáticas precisas ([Britannica: Galileo](https://www.britannica.com/biography/Galileo-Galilei), [Britannica: Kepler's laws](https://www.britannica.com/science/Keplers-laws-of-planetary-motion), [Britannica: Principia](https://www.britannica.com/topic/Principia)).

El cambio cultural es inmenso. 
Entender ya no significa únicamente clasificar o narrar sino encontrar una estructura matemática que permita explicar y prever.

### El cálculo y la descripción del cambio

El cálculo aparece en ese contexto. Newton desarrolla sus métodos en la segunda mitad de la década de 1660. Leibniz llega de forma independiente en los años 1670 y publica en 1684 la exposición que fijará buena parte de la notación que seguimos usando hoy ([Britannica: Newton and Leibniz](https://www.britannica.com/science/mathematics/Newton-and-Leibniz), [Britannica: Gottfried Wilhelm Leibniz](https://www.britannica.com/biography/Gottfried-Wilhelm-Leibniz), [MacTutor: Leibniz](https://mathshistory.st-andrews.ac.uk/Biographies/Leibniz/), [Britannica: Isaac Newton](https://www.britannica.com/biography/Isaac-Newton)).

Lo que aporta el cálculo es un lenguaje para describir variación continua. Permite formalizar tasas de cambio y acumulaciones. Gracias a él, fenómenos como la caída de los cuerpos, las órbitas, la velocidad cambiante o la propagación de magnitudes físicas dejan de ser solo observables y pasan a ser calculables con antelación.

Ese poder predictivo amplía lo que la matemática puede hacer: ya no solo sirve para contar, medir o demostrar, sino también para modelar procesos.

{{ include_html("snippets/from-cave-to-agi/01-timeline-representar.html") }}

---

## 4. Lo que estas herramientas hicieron posible

Al final de este periodo, la humanidad ya dispone de varias piezas que más tarde serán imprescindibles para la computación.

- Sistemas simbólicos capaces de representar cantidades de forma compacta y operable.
- Reglas algebraicas para transformar expresiones y trabajar con incógnitas.
- Un ideal deductivo que convierte el razonamiento en una secuencia verificable de pasos.
- Un lenguaje matemático capaz de describir relaciones, trayectorias y cambios continuos.

Ninguna de estas piezas nació pensando en ordenadores. Aún faltaban siglos para eso. Pero sin ellas no habría forma de imaginar la siguiente etapa: convertir estas representaciones y estas reglas en procedimientos mecánicos ejecutables.

El siguiente capítulo entra justo ahí: en el momento en que la humanidad deja de limitarse a pensar con símbolos y empieza a intentar que una máquina los manipule por nosotros.

---

## 5. Referencias

<details markdown="1">
<summary><strong>Fuentes base</strong></summary>

| Clave | Fuente | Descripción breve |
| --- | --- | --- |
| R1 | [Royal Society (2018) — *From number sense to number symbols. An archaeological perspective*](https://royalsocietypublishing.org/rstb/article/373/1740/20160518/23403/From-number-sense-to-number-symbols-An) | Marco arqueológico para el paso desde marcas físicas a notación numérica. |
| R2 | [PNAS (2012) — *Early evidence of San material culture represented by organic artifacts from Border Cave, South Africa*](https://pmc.ncbi.nlm.nih.gov/articles/PMC3421171/) | Contexto arqueológico de Border Cave y los objetos con muescas asociados a Lebombo. |
| R3 | [Royal Belgian Institute of Natural Sciences — *The Ishango Bone*](https://www.naturalsciences.be/en/museum/exhibitions-activities/exhibitions/250-years-of-natural-sciences/the-ishango-bone) | Descripción institucional del hueso de Ishango y sus agrupaciones de muescas. |
| R4 | [Oxford GLAM — *Carbon dating finds Bakhshali manuscript contains oldest recorded origins of the symbol 'zero'*](https://www.glam.ox.ac.uk/article/carbon-dating-finds-bakhshali-manuscript-contains-oldest-recorded-origins-symbol-zero) | Uso del punto como placeholder en el manuscrito Bakhshali. |
| R5 | [Britannica — *Zero*](https://www.britannica.com/science/zero-mathematics) | Distinción histórica entre placeholder y cero como número. |
| R6 | [Britannica — *Brahmagupta*](https://www.britannica.com/biography/Brahmagupta) | Reglas aritméticas explícitas para el cero y números negativos. |
| R7 | [Britannica — *The Compendious Book on Calculation by Completion and Balancing*](https://www.britannica.com/topic/The-Compendious-Book-on-Calculation-by-Completion-and-Balancing) | Papel fundacional de al-Khwarizmi en el desarrollo del álgebra. |
| R8 | [MacTutor — *Al-Khwarizmi*](https://mathshistory.st-andrews.ac.uk/Biographies/Al-Khwarizmi/) | Etimología de “algoritmo” y contexto biográfico. |
| R9 | [Britannica — *François Viète*](https://www.britannica.com/biography/Francois-Viete-seigneur-de-la-Bigotiere) | Primera notación algebraica sistemática. |
| R10 | [Britannica — *Analytic geometry*](https://www.britannica.com/science/analytic-geometry) | Unión entre álgebra y geometría en la tradición cartesiana. |
| R11 | [Britannica — *Elements*](https://www.britannica.com/topic/Elements-by-Euclid) | Euclides y el estándar del razonamiento deductivo. |
| R12 | [Britannica — *Galileo*](https://www.britannica.com/biography/Galileo-Galilei) | Matematización del movimiento en la revolución científica. |
| R13 | [Britannica — *Kepler’s laws of planetary motion*](https://www.britannica.com/science/Keplers-laws-of-planetary-motion) | Formulación cuantitativa de las órbitas planetarias. |
| R14 | [Britannica — *Principia*](https://www.britannica.com/topic/Principia) | Unificación newtoniana de la mecánica y la gravitación. |
| R15 | [Britannica — *Newton and Leibniz*](https://www.britannica.com/science/mathematics/Newton-and-Leibniz) | Desarrollo independiente del cálculo y cronología básica. |

</details>