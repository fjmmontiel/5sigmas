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
- `drafts/`: fuentes de trabajo y prototipos en evolución.
- `docs/assets/templates/`: plantillas base para nuevas animaciones/snippets.
- `scripts/`: herramientas de scaffold y validación (`scaffold_tabbed_animation.py`, `validate_animation_branding.py`).
- `tests/`: pruebas unitarias y de regresión de snippets/scripts.
- `Makefile`: flujo estándar de instalación, validación y build.

## Uso operativo con Makefile
- `make install`: crea `.venv` e instala dependencias base.
- `make check-animation-branding`: valida branding e inclusión correcta de snippets de animación.
- `make build`: ejecuta checks + `mkdocs build --strict`.
- `make serve`: levanta servidor local MkDocs.

## Estándar de librería de animaciones (company style)
Toda animación nueva o refactorizada debe:
- compartir tipografía corporativa,
- compartir paleta corporativa (variables/tokens comunes),
- incluir watermark de logo,
- incluir footer corporativo consistente,
- ser reusable como snippet HTML independiente e incluible vía macro.

## Guía enfocada: crear animaciones HTML con include_html
### Objetivo de este flujo
- Construir animaciones tipo tab (selector + contenido) reutilizables, consistentes y compatibles con MkDocs.
- Garantizar inyección automática de branding y soporte light/dark con el toggle nativo de Material.

### Estructura actual obligatoria
- Snippet fuente:
  - `docs/snippets/<dominio>/<nombre>.html`
- Plantilla base:
  - `docs/assets/templates/animation_boilerplate_tabs.html`
  - `docs/assets/templates/animation_boilerplate_generic.html`
- Branding compartido inyectado por macro:
  - `main.py` (`include_html(...)` envuelve snippets de animación en `anim-brand-shell`)
- Estilos compartidos:
  - `docs/stylesheets/extra.css`
  - `docs/assets/stylesheets/animations.css`

### Reglas de implementación de nuevas animaciones
- Las animaciones deben consumirse exclusivamente vía `include_html(...)` en Markdown.
- El patrón de UI debe ser tab-like:
  - contenedor de tabs con `role="tablist"`,
  - selector por tab (`data-tab`),
  - panel de contenido por tab (`data-panel`).
- El snippet no debe duplicar shell corporativo global; el branding se inyecta desde `include_html(...)`.
- Fullscreen es `on` por defecto y puede controlarse con `anim_fullscreen` en `include_html(...)` o con `data-anim-fullscreen` en el snippet.
- Precedencia de fullscreen: `anim_fullscreen` (include) > `data-anim-fullscreen` (snippet) > default `on`.
- Reutilizar tokens de marca (`--ta-*`) para acentos/focus/estado activo y dark mode.
- Mantener compatibilidad con tema oscuro usando selectores `[data-md-color-scheme="slate"]`.

### Flujo operativo recomendado
1. Crear/editar el snippet HTML en `docs/snippets/...` (o usar scaffold).
2. Validar branding/tab-pattern:
   - `python3 scripts/validate_animation_branding.py`
3. Validar build completo:
   - `make build`
4. Incluir en Markdown usando:
   - `{{ include_html("snippets/<dominio>/<nombre>.html") }}`

### Auto-descubrimiento y pipeline
- CI/CD y build local deben ejecutar siempre `make build` para forzar:
  - validación de branding,
  - build MkDocs estricto.

## Generación y gestión de cualquier HTML
### Vías permitidas de creación
- Boilerplate tabs: `docs/assets/templates/animation_boilerplate_tabs.html`
- Boilerplate generic: `docs/assets/templates/animation_boilerplate_generic.html`
- Camino libre: snippet HTML propio en `docs/snippets/<dominio>/<nombre>.html` (sin duplicar shell global).

### Scaffold recomendado
- Crear snippet con plantilla tabs:
  - `python3 scripts/scaffold_tabbed_animation.py --name <nombre> --kind tabs`
- Crear snippet con plantilla generic:
  - `python3 scripts/scaffold_tabbed_animation.py --name <nombre> --kind generic`

### Contrato mínimo de snippet
- El root del snippet debe declarar:
  - `data-anim-fullscreen="off"` (o `"on"` si se habilita modal global).
  - `data-anim-contrast="force"` para contraste automático robusto.
- No insertar logos/footer manuales.
- No usar estilos/JS globales fuera del scope del snippet.

### Contrato de include_html y shell global
- Todo snippet HTML de `docs/snippets/**` se inyecta por `include_html(...)`.
- El shell global (`anim-brand-shell`) añade:
  - viewport estándar de contenido,
  - footer "5SIGMAS · Animation Library",
  - tipografía/tokens corporativos,
  - soporte light/dark nativo Material,
  - fullscreen opcional por `data-anim-fullscreen="on"`.
- Snippets estructurales excluidos del shell por defecto:
  - `snippets/5sigma.html`
  - `snippets/series_cards.html`
  - `snippets/series_meta.html`
- La lista de descartadas/excluidas se mantiene en `main.py` (`SHELL_EXCLUDED_SNIPPETS`) y AGENTS debe reflejarla sin divergencias.
- Overrides disponibles en macro:
  - `anim_shell="on|off|auto"`
  - `anim_fullscreen="on|off"`
  - `anim_contrast="force|auto|off"`

### Gestión, migración y mantenimiento
- Si un snippet legado no cumple el contrato, migrarlo manualmente y validar antes de merge.
- Si cambia el esquema global del shell, migrar snippets afectados en la misma iteración.
- No mezclar refactor visual masivo con cambios funcionales sin aprobación explícita.

### Checklist obligatorio por cambio
1. `python3 scripts/validate_animation_branding.py`
2. `make build`
3. Tests relevantes (`.venv/bin/python -m pytest -q` o subset justificable)

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

### 2) Estructura obligatoria de archivos
- Crea/edita siempre en:
  - `docs/snippets/<dominio>/<nombre>.html`
  - opcionalmente partir de `docs/assets/templates/animation_boilerplate_tabs.html` o `docs/assets/templates/animation_boilerplate_generic.html`
- El snippet en `docs/snippets/*` es fuente de verdad, no output generado.

### 3) Patrón UI recomendado (tab-like)
- Debe existir:
  - contenedor con `role="tablist"`,
  - botones/tab con `data-tab`,
  - paneles con `data-panel`.
- Integra con runtime compartido cuando aplique (`data-anim-tabs`) para comportamiento uniforme.

### 4) Branding y tema (no duplicar)
- El branding shell global se inyecta con `include_html(...)`; no replicarlo manualmente dentro del snippet.
- Reutiliza tokens de branding `--ta-*` desde los estilos compartidos.
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
1. Implementar cambios en `docs/snippets/<dominio>/<nombre>.html`.
2. Validar reglas branding/tabs/dark mode:
   - `python3 scripts/validate_animation_branding.py`
3. Validar pipeline completo:
   - `make build`

### 8) Testing y Definition of Done
- Cada mejora relevante debe añadir/ajustar tests.
- Mínimo esperado:
  - test de estructura tab-like,
  - test de branding compartido (`ta-demo`, logos, footer),
  - test de pipeline (`make build` en CI).
- Si falla una validación, no cerrar tarea hasta corregir componente + documentación.

### 9) Anti-patrones a evitar
- Duplicar CSS de branding en cada animación.
- Incluir shell manual dentro del snippet (`anim-brand-shell`, `data-anim-shell`, `data-anim-shell-open`) en animaciones no descartadas.
- Introducir variaciones visuales fuera de los tokens compartidos sin aprobación.
- Cambiar estructura de carpetas o contratos del pipeline sin actualizar `AGENTS.md` y tests.
- Intervenir el toggle de tema nativo de MkDocs Material con hacks/custom JS sin aprobación explícita.
