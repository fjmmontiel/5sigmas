# WW qué?!: Big Data, GPUs y la revolución de 2012

Durante décadas, las redes neuronales fueron una curiosidad académica. La teoría estaba ahí, pero faltaban dos ingredientes cruciales: **datos masivos** y **fuerza bruta de cálculo**.

## La explosión de datos

Con la llegada de la World Wide Web (1991) y luego la Web 2.0 (redes sociales, YouTube), la humanidad empezó a generar datos a una escala inconcebible. Pasamos de tener bibliotecas ordenadas a tener un océano caótico de texto, imágenes y video.

Para la IA clásica (Sistemas Expertos), esto era ruido. Para las redes neuronales, era **comida**.

## La GPU: de los videojuegos a la ciencia

A finales de los 90, empresas como NVIDIA diseñaron chips especializados para renderizar gráficos de videojuegos: las **GPUs** (Unidades de Procesamiento Gráfico). A diferencia de una CPU (que es un genio secuencial), una GPU es un ejército de miles de calculadoras tontas que trabajan en paralelo.

Resulta que multiplicar matrices para rotar polígonos en *Quake* es matemáticamente idéntico a multiplicar matrices para entrenar una red neuronal. En 2007, NVIDIA lanzó **CUDA**, permitiendo usar GPUs para propósitos generales. Fue el regalo accidental más grande a la ciencia de la computación.

## ImageNet 2012: El momento AlexNet

En 2012, todo convergió. Fei-Fei Li había creado **ImageNet**, una base de datos monstruosa con 14 millones de imágenes etiquetadas a mano. Lanzó un concurso: construir un algoritmo que pudiera clasificar estas imágenes.

Durante años, los mejores algoritmos (basados en reglas y estadística clásica) tenían tasas de error del 26%.

Entonces llegó **AlexNet**. Diseñada por Alex Krizhevsky, Ilya Sutskever y Geoffrey Hinton, era una "Red Neuronal Convolucional" (CNN) profunda. Entrenada en dos GPUs GTX 580 durante una semana, AlexNet destrozó a la competencia con una tasa de error del 15.3%.

## Referencias

- [ImageNet Large Scale Visual Recognition Challenge](https://www.image-net.org/challenges/LSVRC/)
- [AlexNet Paper: ImageNet Classification with Deep Convolutional Neural Networks](https://papers.nips.cc/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf)
- [The History of GPUs in AI](https://www.nvidia.com/en-us/about-nvidia/ai-computing/)

---

[Siguiente: Primeras neuronas parlantes >](3-02-neuronas-parlantes.md){ .md-button .md-button--primary }
