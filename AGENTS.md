# AGENTS.md

## Objetivo principal del código en este repositorio
Construir y mantener una librería de animaciones HTML reutilizable para explicar conceptos técnicos de forma visual, consistente y escalable dentro de MkDocs.

## Alcance y límites sobre contenido
- Los archivos Markdown en `docs/` son contenido editorial del autor.
- No modificar el contenido semántico/redaccional de Markdown salvo petición explícita.
- El trabajo de código debe centrarse en:
  - integración con MkDocs,
  - snippets HTML/CSS/JS de animaciones,
  - utilidades de composición/validación,
  - tests.

## Estructura del repositorio (resumen)
- `docs/`: sitio MkDocs (contenido, snippets, assets).
- `docs/snippets/`: snippets HTML embebibles; aquí viven animaciones consumidas por Markdown.
- `docs/assets/`: logos, JS/CSS compartidos y recursos visuales.
- `docs/series/`: series en Markdown (no alterar contenido editorial sin pedido).
- `drafts/`: fuentes de trabajo y componentes de animaciones en evolución.
- `library/sources/`: fuentes HTML base por animación.
- `library/components/shared/`: estilo corporativo compartido.
- `library/components/animations/<nombre>/`: componentes reutilizables (`markup/style/script`).
- `scripts/`: herramientas de composición y validación (`compose_animations.py`, `validate_animation_branding.py`, etc.).
- `tests/`: pruebas unitarias y de regresión de snippets/scripts.
- `Makefile`: flujo estándar de instalación, build, composición y checks.

## Uso operativo con Makefile
- `make install`: crea `.venv` e instala dependencias base.
- `make compose-animations`: compone snippets de animaciones desde componentes.
- `make check-animation-branding`: valida branding e inclusión correcta de snippets de animación.
- `make build`: ejecuta composición + checks + `mkdocs build --strict`.
- `make serve`: levanta servidor local MkDocs.

## Estándar de librería de animaciones (company style)
Toda animación nueva o refactorizada debe:
- compartir tipografía corporativa,
- compartir paleta corporativa (variables/tokens comunes),
- incluir watermark de logo,
- incluir footer corporativo consistente,
- ser reusable vía componentes (`markup/style/script`) y/o utilidades de composición.

## Guía enfocada: crear animaciones con componentes
### Objetivo de este flujo
- Construir animaciones tipo tab (selector + contenido) reutilizables, consistentes y compatibles con MkDocs.
- Garantizar inyección automática de branding y soporte light/dark desde componentes compartidos.

### Estructura actual obligatoria
- Fuentes base: `library/sources/<nombre>.html`
- Componentes por animación:
  - `library/components/animations/<nombre>/markup.html`
  - `library/components/animations/<nombre>/style.html`
  - `library/components/animations/<nombre>/script.html`
- Branding compartido inyectado:
  - `library/components/shared/style.html`
- Snippets compuestos de salida:
  - `docs/snippets/ia_ml_dl.html` (caso especial)
  - `docs/snippets/animaciones/<nombre>.html` (resto)

### Reglas de implementación de nuevas animaciones
- El patrón de UI debe ser tab-like:
  - contenedor de tabs con `role="tablist"`,
  - selector por tab (`data-tab`),
  - panel de contenido por tab (`data-panel`).
- El contenedor visual de la demo debe usar clase `ta-demo` para heredar branding común.
- No duplicar branding en cada animación (tipografía, watermark, footer): se define en `components/shared/style.html`.
- Reutilizar tokens de marca (`--ta-*`) para acentos/focus/estado activo y dark mode.
- Mantener compatibilidad con tema oscuro usando selectores `[data-md-color-scheme="slate"]`.

### Flujo operativo recomendado
1. Crear la animación desde componentes (o usar scaffold).
2. Componer snippets:
   - `python3 scripts/compose_animations.py`
3. Validar branding/tab-pattern:
   - `python3 scripts/validate_animation_branding.py`
4. Validar build completo:
   - `make build`
5. Incluir en Markdown usando:
   - `{{ include_animation("snippets/animaciones/<nombre>.html") }}`

### Auto-descubrimiento y pipeline
- `scripts/compose_animations.py` descubre automáticamente animaciones nuevas en `library/sources` y `library/components/animations`.
- No se debe mantener una lista manual de animaciones en el script.
- CI/CD y build local deben ejecutar siempre `make build` para forzar:
  - composición,
  - validación de branding,
  - build MkDocs estricto.

## Regla de implementación
- Cambios mínimos, diffs pequeños y verificables.
- Sin refactors cosméticos fuera del alcance.
- Sin cambios de arquitectura/dependencias/infra sin aprobación explícita.
- Antes de cualquier cambio con impacto global en UI/comportamiento (por ejemplo: tema light/dark, header, navegación, JS global, overlays), pedir aprobación explícita y explicar claramente efectos esperados, riesgos y rollback.
- Si no hay aprobación explícita para ese impacto global, no aplicar el cambio.

## Definition of Done (obligatoria para tareas de código)
Una tarea se considera terminada cuando:
1. El objetivo funcional está implementado con cambios mínimos.
2. Se añadieron o ajustaron tests que expongan la feature o corrección.
3. Los tests relevantes pasan localmente.
4. Si aplica, los logs/checks operativos reportan estado correcto.
5. Se entrega resumen por subtarea: objetivo, cambios, ficheros tocados, comandos ejecutados y resultado.

## Regla de mantenimiento de AGENTS.md (obligatoria)
- Si una regla de `AGENTS.md` resulta incorrecta, incompleta o causa fallos (detectado por validaciones, por revisión del agente o por feedback explícito del usuario), la tarea debe incluir su corrección inmediata en el mismo PR/iteración.
- No se considera “done” una tarea que deja `AGENTS.md` desalineado con el comportamiento real del repositorio.

## Best Practices para desarrollar animaciones
### 1) Diseña primero el contrato de la animación
- Define el objetivo pedagógico en 1 frase.
- Define tabs mínimas necesarias (sin sobrecargar): cada tab debe responder una pregunta clara.
- Mantén nombres consistentes para `data-demo`, `data-tab`, `data-panel`.

### 2) Estructura obligatoria de componentes
- Crea/edita siempre en:
  - `library/components/animations/<nombre>/markup.html`
  - `library/components/animations/<nombre>/style.html`
  - `library/components/animations/<nombre>/script.html`
- Usa `library/sources/<nombre>.html` como fuente base/backup para bootstrap.
- No mezclar lógica nueva directamente en `docs/snippets/*` (son outputs compuestos).

### 3) Patrón UI recomendado (tab-like)
- Debe existir:
  - contenedor con `role="tablist"`,
  - botones/tab con `data-tab`,
  - paneles con `data-panel`.
- Integra con runtime compartido cuando aplique (`data-tabs`) para comportamiento uniforme.

### 4) Branding y tema (no duplicar)
- Toda demo debe incluir clase `ta-demo` en el contenedor raíz de la animación.
- Reutiliza tokens de branding `--ta-*` desde `library/components/shared/style.html`.
- No hardcodear paleta/estados de focus/active si ya existe token equivalente.
- Soporte dark mode obligatorio con `[data-md-color-scheme="slate"]`.

### 5) JavaScript y runtime
- Prioriza idempotencia de init (evitar doble inicialización).
- Diseña para múltiples instancias por página.
- Mantén compatibilidad con navegación instantánea de MkDocs Material.
- Evita side effects globales fuera del namespace de la animación.

### 6) Accesibilidad mínima
- Usa `role="tablist"` y estados `aria-selected` en tabs.
- Soporta navegación por teclado en tabs (flechas/Home/End) cuando exista interacción compleja.
- Mantén contraste suficiente en light/dark.

### 7) Flujo operativo de desarrollo
1. Implementar cambios en `library/components/animations/<nombre>/...`.
2. Componer outputs:
   - `python3 scripts/compose_animations.py`
3. Validar reglas branding/tabs/dark mode:
   - `python3 scripts/validate_animation_branding.py`
4. Validar pipeline completo:
   - `make build`

### 8) Testing y Definition of Done
- Cada mejora relevante debe añadir/ajustar tests.
- Mínimo esperado:
  - test de estructura tab-like,
  - test de branding compartido (`ta-demo`, logos, footer),
  - test de pipeline (`make build` en CI).
- Si falla una validación, no cerrar tarea hasta corregir componente + documentación.

### 9) Anti-patrones a evitar
- Editar manualmente `docs/snippets/...` como fuente principal.
- Duplicar CSS de branding en cada animación.
- Introducir variaciones visuales fuera de los tokens compartidos sin aprobación.
- Cambiar estructura de carpetas o contratos del pipeline sin actualizar `AGENTS.md` y tests.
- Intervenir el toggle de tema nativo de MkDocs Material con hacks/custom JS sin aprobación explícita.
