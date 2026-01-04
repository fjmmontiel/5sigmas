# De las muescas en hueso al número: cómo nace la abstracción

Con la IA no se inventó el "token" ni la "memoria externa". 
Hace 20.000 años ya externalizábamos conceptos fuera del cerebro humano, el primero de los que hicimos fue el número.

Imagina que eres el responsable de “datos” de un reino hace 3.500 años. No tienes datalake, ni ERP, ni dashboards. Tienes el Nilo, campos que cambian de forma con cada crecida, graneros llenos o vacíos y cientos de personas que esperan su ración de grano.

Un escriba camina por los campos tras la inundación del río. Mide con una cuerda de nudos, anota en un papiro cuántos codos tiene cada parcela y calcula cuánta cosecha corresponde a cada familia. A cientos de kilómetros y miles de años atrás, alguien ya había hecho algo parecido, pero con recursos mucho más pobres: un hueso de animal con muescas cuidadosamente ordenadas, el hueso de Ishango, posiblemente usado para llevar cuentas de días, ciclos de luna o presas cazadas.

En ambos casos ocurre lo mismo que hacemos hoy con IA: externalizar memoria y aplicar reglas sobre símbolos para tomar decisiones.


## Del hueso al número

Lo primero que aparece no son los números tal y como los entendemos hoy, sino algo más modesto: marcas.

![image](images/Ishango_bone_(cropped).jpg)

En el Paleolítico tardío, objetos como el hueso de Ishango muestran series de muescas agrupadas en columnas y patrones. Podemos discutir si representan ciclos lunares, series numéricas o algo más simbólico, pero hay tres gestos claros:

1. Alguien decide representar cantidades **fuera de la cabeza**.
2. Esas marcas no son aleatorias: se ordenan en grupos, columnas, repeticiones.
3. Esa estructura permite volver días o semanas después y “releer” lo que pasó.

Es el primer paso de cualquier sistema reutilizable: fijar un estado del mundo en un soporte físico para poder operar sobre él más tarde.

Miles de años después, ese gesto se vuelve sistemático. Aparecen pequeñas fichas de arcilla (tokens) que codifican bienes: una forma para el grano, otra para el aceite, otra para el ganado. El número de fichas indica cuánta cantidad hay. Durante siglos, el “sistema de información” de una ciudad se reduce a eso: cestas con fichas que representan deudas, contratos y entregas.

El salto decisivo llega cuando las fichas dejan de circular como objetos y empiezan a dejar su huella sobre tablillas de arcilla. Primero se guardan dentro de esferas de barro que llevan impresas fuera el resumen del contenido. Luego se presionan directamente sobre la superficie. La ciudad ya no necesita la ficha: le basta el signo. La cantidad se ha vuelto **símbolo**.

Ahí, discretamente, nace el número.

---

## Mesopotamia: cuando contar se vuelve un sistema

En Mesopotamia, entre el 3000 y el 1000 a.C., ese uso práctico de marcas evoluciona hacia algo que reconoce cualquier matemático moderno: un sistema numérico bien definido y una colección de algoritmos estables.

Al principio, los sumerios usan distintos conjuntos de signos según lo que se mide: longitud, volumen, grano, personas. Contar ovejas y medir cebada no se escriben igual. Pero, a medida que la economía se vuelve más compleja, se impone una simplificación: separar **qué** es lo que se cuenta de **cuánto** hay.

Esa separación cristaliza en el sistema sexagesimal, base 60, con valor posicional. Con solo dos signos básicos y la posición, un escriba puede representar cantidades enormes, combinar sumas, restas y multiplicaciones, y trabajar con fracciones de forma sorprendentemente cómoda. El 60 no es una excentricidad: es una base con muchos divisores, ideal para repartir.

A partir de ahí, los textos matemáticos mesopotámicos empiezan a parecerse sospechosamente a cuadernos de problemas actuales:

* Enunciado: una parcela, un canal, un volumen de grano.
* Datos: medidas concretas en el sistema sexagesimal.
* Procedimiento: una receta de pasos —"toma la mitad", "multiplica", "consulta la tabla"—.
* Resultado: el área, el volumen, la ración, el salario.

En tabletas como Plimpton 322 vemos listas de pares de números que hoy interpretamos como triples pitagóricos. En otras encontramos tablas de recíprocos, cuadrados y raíces. Son catálogos listos para usar. Un escriba no “descubre” el recíproco cada vez: lo lee de la tabla.

En esencia, lo que ha aparecido es un entorno donde:

* Los **estados** del sistema se representan con números.
* Existen **tablas** que permiten saltar de un estado a otro sin recomputar.
* Hay **procedimientos estándar** escritos que cualquiera con formación puede ejecutar.

Es un sistema de cómputo humano, distribuido y lento, pero conceptualmente no tan distinto de una base de datos y un conjunto de scripts.

---

## Egipto: geometría para gobernar el río

Mientras tanto, en Egipto, la matemática se organiza alrededor de un problema distinto: domesticar un río que decide cada año qué es campo y qué es agua.

El sistema numérico es decimal, con símbolos específicos para 1, 10, 100, 1.000, etc. Pero donde los escribas egipcios realmente se especializan es en el manejo de fracciones y de geometría aplicada.

En el papiro Rhind, una especie de manual de entrenamiento para escribas del Reino Medio, aparecen problemas de todo tipo:

* Reparto de pan y cerveza entre trabajadores.
* Cálculo de raciones diarias de grano.
* Conversión entre unidades de medida.
* Cálculo de áreas de campos y volúmenes de graneros.

La notación se basa en **fracciones unitarias**: 1/2, 1/3, 1/5… Las fracciones más complejas se descomponen en sumas de fracciones unitarias siguiendo tablas precomputadas. De nuevo, tablas y recetas.

En el papiro de Moscú encontramos problemas todavía más sugerentes: cómo calcular el volumen de una pirámide truncada, o cómo aproximar el área de un círculo. El resultado numérico equivale a usar un valor de π bastante razonable para la época. No hay demostración al estilo Euclides, pero sí una confianza clara en que el método funciona.

La geometría aquí no es un juego intelectual: es una herramienta para saber cuánta piedra necesitas, cuántos hombres tienes que movilizar, cuánto grano cabe en un silo. El error no es solo teórico: se paga en hambre, atrasos o derrumbes.

---

## Una forma de razonar sin llamarlo filosofía

Ni los mesopotámicos ni los egipcios escriben tratados de epistemología, pero su práctica matemática revela una idea concreta de qué significa saber algo.

Primero, saber es **poseer un método que funciona**. Un escriba competente no es quien “entiende” la naturaleza de los números, sino quien domina un repertorio de procedimientos fiables: sabe qué tabla usar, qué operación aplicar y en qué orden. Su valor está en la reproducibilidad.

Segundo, la mente no trabaja sola. El conocimiento está **distribuido**:

* Entre personas (escribas, maestros, supervisores).
* Entre objetos físicos (tablillas, papiri, cuerdas de medida, fichas).
* Entre instituciones (templos, palacios, graneros) que conservan y certifican esos registros.

Sin esa infraestructura, la inteligencia individual sería irrelevante. La “mente” efectiva del sistema es una red de cerebros, artefactos y reglas. Vista con ojos contemporáneos, es una forma temprana de mente extendida.

Tercero, los números no son neutrales. Contar y medir es un acto de **orden político**: decidir qué se mide, cómo se mide y qué consecuencias tiene ese número en raciones, impuestos o trabajo. Las tablas y los algoritmos no son solo técnicas, son mecanismos de poder.

Esa mezcla de método, soporte externo e institución es exactamente lo que reaparece hoy cuando hablamos de sistemas de IA desplegados en producción: modelos, datos y organización son inseparables.

---

## Ingeniería como cómputo sobre el mundo

Si miramos la ingeniería de la época con ojos de arquitecto de sistemas, lo que encontramos son bucles de control ciberfísicos muy primitivos.

En los sistemas de irrigación mesopotámicos:

1. Se **mide**: longitud y profundidad de canales, caudal aproximado, extensión de los campos.
2. Se **calcula**: cuánto hay que excavar, a qué altura levantar un dique, cuántos trabajadores se necesitan.
3. Se **actúa**: se construyen o modifican canales, se abren o cierran compuertas.
4. Se **observa** el resultado en la siguiente crecida y se ajusta.

En Egipto, el ciclo es similar con la crecida del Nilo y la reasignación de tierras.

La arquitectura monumental refuerza este esquema. Una pirámide es, entre otras cosas, un test masivo de precisión acumulada:

* Een el diseño geométrico (ángulos, proporciones).
* En la estimación de volúmenes y recursos.
* En la capacidad logística de mover materiales al ritmo necesario.

Cada bloque encaja porque antes alguien ha pasado por un minibucle de medición y cálculo, aunque nunca lo llame así.

Visto desde hoy, la diferencia entre esos sistemas y un pipeline de datos moderno es menos conceptual de lo que parece. Cambian el soporte, la escala y la velocidad, pero el patrón —medir, transformar, decidir, actuar— es el mismo.

---

## Qué tiene que ver todo esto con la IA actual

Si te dedicas a diseñar, desplegar o gobernar sistemas de IA, esta etapa temprana de la historia no es un museo: es el origen de varios patrones que sigues usando sin darte cuenta.

**1. Externalizar memoria es la verdadera palanca**

Lo que convierte las muescas, las fichas o las tablillas en algo poderoso no es la sofisticación matemática, sino el simple hecho de que permiten **recordar más y mejor** que un individuo aislado. A partir de ahí, se puede:

* Encadenar decisiones a lo largo del tiempo.
* Coordinar a muchas personas alrededor de los mismos datos.
* Construir infraestructuras que viven décadas más que sus diseñadores.

En sistemas de IA pasa lo mismo. La diferencia entre un modelo juguete y un sistema estratégico no está solo en la arquitectura del modelo, sino en la calidad de la memoria externa: datos, features, logs, embeddings, trazas. Sin ese soporte, la “inteligencia” no escala.

**2. Las representaciones discretas mandan**

El paso de “diez sacos de grano” a “el número 10 escrito en una tablilla” es análogo al paso de una frase hablada a una secuencia de tokens en un modelo de lenguaje. En ambos casos, comprimes algo complejo y continuo en unidades discretas sobre las que puedes definir operaciones sistemáticas.

Los mesopotámicos eligieron base 60 por su utilidad práctica. Hoy elegimos esquemas de tokenización, espacios de embedding y estructuras de datos con el mismo criterio: equilibrio entre capacidad expresiva, coste y facilidad de cómputo.

**3. Los algoritmos son recetas, no oráculos**

Las tablillas no venden magia. Explican exactamente qué hay que hacer: qué número tomar, qué operación aplicar, qué tabla consultar. Son recetas auditables.

En un entorno serio de IA, deberíamos aspirar a lo mismo: sistemas cuyos pasos principales puedan describirse, discutirse y, si hace falta, corregirse. Aunque el modelo interno sea opaco, la arquitectura de datos, llamadas, validaciones y controles tiene que ser legible.

**4. Todo cómputo relevante es ciberfísico**

Para los estados antiguos, calcular sin tocar el mundo no tenía sentido. Cada operación numérica estaba anclada a una decisión física: abrir un canal, asignar una parcela, construir un muro.

Con los sistemas de IA pasa igual: su impacto real viene de cambiar precios, rutas, diagnósticos, aprobaciones, contenidos. Si pierdes de vista ese bucle entre símbolo y realidad, tu sistema acaba optimizando métricas internas irrelevantes.

---

## Hacia el siguiente paso: de las recetas a las pruebas

Todo lo que hemos visto en este primer acto tiene algo en común: son **métodos que funcionan**. Si un problema se parece lo suficiente a uno antiguo, aplicas la misma receta y esperas un buen resultado. Pero nadie se está preguntando todavía qué es exactamente una demostración, qué garantiza que un procedimiento funcione siempre o cuáles son los límites de cualquier regla de razonamiento.

Esa pregunta aparece de forma explícita en otro sitio y en otra época: la Grecia clásica.

Allí, las figuras geométricas dejan de ser solo planos de obra para convertirse en objetos de estudio en sí mismos. Se buscan axiomas, definiciones, pruebas. Aparece la idea de que podemos construir sistemas completos de teoremas a partir de unos pocos principios, y con ella, la intuición de que el razonamiento mismo podría formalizarse.

Ese será el tema del siguiente post del Acto I: cómo pasamos de recetas útiles a sistemas axiomáticos y qué tiene que ver eso con la manera en que hoy pensamos en demostraciones automáticas, lógica, verificación de software y, en última instancia, límites formales de cualquier AGI.

## Conclusión

La abstracción no es un lujo intelectual, es una herramienta de eficiencia. Pasamos de contar con piedras a contar con tokens digitales por la misma razón: **coste y escala**.

**Acción**: Revisa tu arquitectura de IA. ¿Estás confiando demasiado en la "memoria" interna del modelo (que es falible) en lugar de construir sistemas robustos de memoria externa (RAG, bases de datos)?
**Reflexión**: Tu "prompt" es la tablilla moderna. Asegúrate de que las instrucciones sean tan claras como las de un escriba egipcio.

## Referencias

- [The Ishango Bone - Africa's Ancient Mathematical Artifact](https://www.mathigon.org/course/sequences/ishango)
- [Lebombo Bone - The Oldest Mathematical Artifact](https://www.empoweringafricans.org/lebombo-bone)
- [History of Number Abstraction](https://historymath.com/number-abstraction)

---
<!-- 
[Siguiente: El proyecto griego >](1-02-griego.md){ .md-button .md-button--primary } -->