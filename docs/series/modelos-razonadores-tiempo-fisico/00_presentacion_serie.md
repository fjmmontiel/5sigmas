-
## Serie 4 — Modelos razonadores y tiempo físico (Test-Time Compute)

**Objetivo:** explicar razonamiento como *proceso* y el papel del *tiempo de inferencia* como recurso.

**Tipos de artículos:**

* “Concepto con experimento mental”
* “Diseño de sistema”
* “Trade-offs (coste/latencia/calidad)”

**Línea de artículos (esbozo):**

1. **Qué es “razonar” en un modelo (definición útil)**

   * Diferenciar: memoria, búsqueda, verificación, planificación.
2. **Por qué el razonamiento falla (y cómo se ve el fallo)**

   * Errores sistemáticos, confabulación, shortcuts.
3. **Test-Time Compute como palanca**

   * Más pasos/candidatos/verificación → mejor calidad (con costes).
4. **Estrategias de razonamiento en sistemas**

   * Generate-and-verify, self-consistency, debate/judges, tool-use.
5. **Tiempo físico: latencia, streaming, interacción humana**

   * Qué significa “pensar más” en producto (y cuándo es inaceptable).
6. **Evaluación de razonamiento**

   * Benchmarks vs tareas reales; tests de robustez; trampas.
7. **Arquitectura de producción para razonamiento**

   * Orquestación, presupuestos de cómputo, escalado, caching, fallbacks.
8. **Riesgos: overthinking, coste, ataques, alineamiento**

   * Cómo diseñar límites.

**Conceptos imprescindibles:**

* Búsqueda vs inferencia directa, verificación, presupuestos, latencia, fiabilidad.

---
