# 5Sigmas — Instrucciones del proyecto

## Regla de auto-mejora
Cuando el usuario corrija algo, **actualiza CLAUDE.md y MEMORY.md inmediatamente** antes de continuar con cualquier otra tarea. Si no lo haces, el mismo error se repetirá en la siguiente sesión.

---

## Estilo editorial de los artículos

Reglas fijas para cualquier texto que escribas o edites en `docs/series/`:

- **Sin em dashes (—) en prosa.** Son el marcador más visible de texto generado por IA. Si necesitas un inciso, usa comas, paréntesis o restructura la frase.
- **Sin punto y coma innecesarios.** Cuando dos cláusulas podrían separarse con punto y coma, úsalas con conjunciones compuestas: `pero`, `aunque`, `mientras que`, `lo que`, `sin embargo`.
- **Frases compuestas, no telegráficas.** Evita frases de 4-5 palabras en serie. Prefiere una frase más larga con subordinada antes que dos frases cortas yuxtapuestas.
- **Sin over-structuring.** No conviertas prosa en listas de bullets si en el original había párrafo. Las listas son para pasos o enumeraciones reales.
- **Voz directa.** Sin relleno ("es importante destacar que", "cabe mencionar", "en este sentido"). Cada frase va al punto.

Estos principios aplican también a los captions y bullets de los slides de LinkedIn, con la salvedad de que ahí los bullets cortos sí son válidos por el formato visual.

---

## Búsqueda en internet

**WebFetch falla** en este entorno (páginas JS-rendered devuelven contenido vacío). Usar siempre el script compartido:

```bash
# Fetch básico — texto del body, sin nav/footer
~/.claude/scripts/fetch_web.sh "https://example.com"

# Extraer elemento concreto
~/.claude/scripts/fetch_web.sh "https://arcprize.org/leaderboard" --selector ".leaderboard"

# Más texto + screenshot para debug visual
~/.claude/scripts/fetch_web.sh "https://deepmind.google/blog/..." --chars 12000 --screenshot /tmp/page.png
```

Para PDFs descargados: `pdftotext -layout archivo.pdf /tmp/salida.txt` (poppler disponible vía brew).

Para páginas estáticas sin JS (fallback rápido):
```python
import urllib.request
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=15) as r:
    print(r.read().decode("utf-8", errors="replace")[:6000])
```

---

## Posts LinkedIn

### Scripts
- `scripts/generate_post_slides.py` — **único script de posts**. Lee `carousel.html` existente → screenshot de cada `.slide-section[data-id]` → PNGs en la misma carpeta. No construye nada.

No existe ni hace falta un `build_carousels.py`. Claude genera el `carousel.html` directamente.

### Fuente de verdad
- `carousel.html` en cada carpeta de post ES la fuente de verdad.
- **Lo escribe Claude** copiando `documentacion_interna/posts/_template.html` como base.
- `generate_post_slides.py` lee desde `carousel.html` — solo renderiza, nunca genera.

### Template de referencia
`documentacion_interna/posts/_template.html` — fuente de verdad del CSS y la estructura.

Contiene:
- CSS completo del sistema de slides (dark theme, bg `#0b1220`)
- Un ejemplo comentado de cada tipo: `hook`, `steps` (numerado y con arrow), `comparison`, `snippet`, `table`, `cta`
- Guía de colores inline, reglas de uso por tipo y JS de navegación
- Documentación del patrón multi-step y trampas conocidas del CTA

Para un post nuevo: copiar `_template.html` → renombrar a `carousel.html` → sustituir los `.slide-section` con el contenido real del post → ajustar título del header y número de dots.

### Estructura de carpetas
```
documentacion_interna/posts/
└── <serie>/
    └── post_N_<nombre>/
        ├── carousel.html    ← escrito por Claude, fuente de verdad
        ├── post.md          ← guía de publicación LinkedIn
        ├── 01_hook.png      ← generados por generate_post_slides.py
        ├── 02_<slide>.png
        └── ...
```

### Comandos
```bash
# Renderizar PNGs desde carousel.html
.venv/bin/python3.14 scripts/generate_post_slides.py --series <serie>

# Solo un post concreto
.venv/bin/python3.14 scripts/generate_post_slides.py --series <serie> --post post_1_<nombre>

# Preview rápido (solo slide 1 de cada post)
.venv/bin/python3.14 scripts/generate_post_slides.py --series <serie> --preview

# Exportar animaciones de docs/snippets/ a PNG para slides
.venv/bin/python3.14 scripts/export_tabs_v2.py \
  --html docs/snippets/<serie>/<archivo>.html \
  --out exports/snippets/<serie>/<nombre>/ \
  --theme dark --width 1080
```

Los PNGs de snippets van en `exports/snippets/` y se referencian en slides con la ruta relativa desde la raíz del proyecto.

---

### Diseño de slides

**Hook — siempre igual, sin excepciones:**
```python
{
    "id": "01_hook",
    "type": "hook",
    "theme": "dark",
    "label": "...",
    "headline": "...",     # blanco — el gancho principal
    "highlight": "...",    # azul/primary — el claim de impacto
    "lead": "...",         # gris/muted — CTA o continuación
}
```

**CTA — slide final:**
- `headline`: lo que el artículo ofrece
- `sub`: "Serie · Capítulo N"
- `url_text`: "5sigmas.com →"

**Snippet slides:**
- `type: "snippet"`, `img`: ruta relativa a `exports/snippets/`
- Usar `_li.png` (exportaciones LinkedIn 1080px-wide)
- CSS correcto: `padding:20px 64px 0` en img-area + `border-radius:12px` en img — NO edge-to-edge
- Si la animación tiene múltiples tabs/steps: exportar CADA step por separado con Playwright y crear UN slide snippet por step
- `caption-tag`: NUNCA usar la palabra "ANIMACIÓN" — usar el CONCEPTO CLAVE del step
  - Sin numeración: `"MECANISMO ·"`, `"RUTAS ·"`
  - Con numeración: `"PASO 1/6 · MODELO"`, `"SISTEMA 2/3 · RAG"`, `"ESCALA 3/4 · GPT-3"`
- `export_tabs_v2.py` solo detecta `button[data-tab]` de forma nativa. Para otros selectores (`data-sc`, `data-for`, `data-step`, `.emb-step[data-s]`) usar script Playwright inline:

```python
# Script inline para animaciones con selectores no estándar
# Importar desde export_tabs_v2: _open_runtime_page, _screenshot_at_linkedin_width,
#   _resolve_export_target, LI_FRAME_WIDTH
JOBS = [
    ('docs/snippets/<serie>/<archivo>.html', Path('exports/snippets/<serie>/<nombre>/dark'), [
        ('button[data-sc="tab1"]', '1_nombre1', 'Etiqueta 1'),
        ('button[data-sc="tab2"]', '2_nombre2', 'Etiqueta 2'),
    ]),
]
# Por cada job: _open_runtime_page → click selector → wait 900ms → _screenshot_at_linkedin_width
```

---

### Workflow — 5 fases en orden, sin saltarse ninguna

#### FASE 1 — Análisis del artículo

Lo que Claude hace antes de proponer nada:
1. Leer el artículo `.md` completo (`docs/series/<serie>/<cap>.md`)
2. Listar snippets disponibles en `docs/snippets/<serie>/`
3. Listar exports ya generados en `exports/snippets/<serie>/`

Output obligatorio — presentar esta tabla al usuario:

```
## Análisis: <nombre del artículo>

### Conceptos con entidad para post
| # | Concepto | Entidad | Snippets disponibles |
|---|----------|---------|----------------------|
| 1 | ...      | alta    | 02-embeddings_li.png |
| 2 | ...      | media   | ninguno              |

### Posts propuestos
| Post | Título tentativo | Slides estimados | Snippet |
|------|-----------------|------------------|---------|
| post_1_... | ... | 5-6 | sí / no |

¿Apruebas esta estructura o quieres ajustar?
```

Reglas de selección:
- 1 concepto principal + ilustración = 1 post (norma dura)
- Mínimo 4 slides por post, máximo 7 de contenido textual/conceptual
- Los slides de snippet multi-step pueden expandir el total por encima de 7 (cap2: hasta 11 slides)
- Entidad suficiente: tiene nombre propio, consecuencias prácticas, explicable sin depender de otro post del capítulo
- No fragmentar un concepto en dos posts ni fusionar dos en uno

**Esperar aprobación explícita antes de continuar a Fase 2.**

---

#### FASE 2 — Diseño de slides (por post)

Para cada post aprobado, diseñar la secuencia antes de escribir código:

```
Post N — <título>
  01_hook      → hook (siempre primero)
  02_<nombre>  → tipo: steps / comparison / snippet / table / stat
  03_<nombre>  → ...
  0N_cta       → cta (siempre último)
```

Reglas:
- El hook siempre con `headline` + `highlight` + `lead`
- Cada slide intermedio desarrolla UNA sola idea
- Si hay snippet disponible: slide dedicado `type: snippet` — no mezclarlo con texto
- El CTA con la URL exacta del artículo en 5sigmas.com
- Máximo 5 bullets por slide; máximo 8 palabras por bullet

**Presentar diseño al usuario y esperar aprobación antes de generar código.**

---

#### FASE 3 — Generación de carousel.html

Solo después de aprobación de Fase 2:

1. Copiar `documentacion_interna/posts/_template.html` como base del nuevo `carousel.html`
2. Escribir `documentacion_interna/posts/<serie>/<post_N>/carousel.html` con:
   - Cabecera CSS completa copiada del template (no inventar estilos nuevos)
   - Un `.slide-section[data-id="<id>"]` por cada slide diseñado en Fase 2
   - `data-id` coincide con el nombre del PNG que se generará (ej: `01_hook`, `02_pasos`, `06_cta`)
3. Preview: `.venv/bin/python3.14 scripts/generate_post_slides.py --series <serie> --preview`
4. Render completo: `.venv/bin/python3.14 scripts/generate_post_slides.py --series <serie>`

---

#### FASE 4 — Revisión de calidad (KPIs)

Proceso obligatorio:
1. Claude lee cada PNG generado y evalúa los KPIs de la tabla
2. Claude presenta el resultado al usuario con el estado de cada KPI
3. Si algún KPI falla, Claude corrige `carousel.html`, re-renderiza y vuelve a presentar
4. El usuario revisa visualmente y confirma que todo está correcto
5. Solo tras confirmación explícita del usuario se avanza a Fase 5

**No generar `post.md` hasta que el usuario confirme.**

| KPI | Criterio | Acción si falla |
|-----|----------|-----------------|
| Densidad | ≤ 5 bullets por slide, ≤ 8 palabras por bullet | Reducir texto |
| Jerarquía | Título > subtítulo > cuerpo claramente distinguibles | Revisar font-weight |
| Color | Fondo `#0b1220` (NO `#0d1117`) — diferencia visible en tipografía | Corregir en carousel.html |
| Hook | Tiene `headline` + `highlight` + `lead` | Rehacer slide hook |
| CTA | Tiene URL correcta de 5sigmas.com; sin `flex:1` ni `min-height` en `.cta-content` | Verificar layout y URL |
| Snippet | Si existe animación → slide snippet; si tiene N steps → N slides snippet | Añadir slides |
| caption-tag | NUNCA "ANIMACIÓN" — concepto clave con formato `"PASO N/T · NOMBRE"` | Corregir tag |
| Equilibrio | Posts del mismo capítulo tienen densidad similar | Ajustar el outlier |
| Contadores | Formato zero-padded `01 / 09`, `02 / 09`... en `.num` dentro de cada slide | Corregir formato |
| PNGs huérfanos | Al reestructurar slides, borrar PNGs con data-id viejos — el renderizador no los borra | `rm` manual |

Referencia visual: `fundamentos-ia-cap1/post_1_marco_ia/` es el estándar de facto.

---

#### FASE 5 — Generación de post.md

Solo cuando el usuario ha confirmado los KPIs de Fase 4.

Estructura exacta del `post.md` (para cap2 en adelante):

```markdown
# Post N — <título completo>

**Publicar:** Semana N
**Audiencia:** <perfil objetivo>
**Tema visual:** Dark

---

## Carrusel — subir en este orden

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `01_hook.png` | ... |
...

> Todos los archivos están en esta misma carpeta.

---

## Caption

<caption completo — texto LinkedIn, 150-250 palabras>

Artículo completo con animaciones interactivas: https://5sigmas.com/series/<serie>/<cap>/

#Tag1 #Tag2 #Tag3 #Tag4 #Tag5
```

Reglas del caption:
- Voz directa, sin adornos
- Empieza con la tensión o dato que engancha — no con el título del artículo
- Máximo 250 palabras
- Sin bullet points (LinkedIn los aplana)
- La URL va al final del caption, en la última línea, antes de los hashtags
- Los hashtags van pegados al bloque de caption, sin separador `---`

Reglas de hashtags:
- Entre 3 y 5 hashtags
- `#InteligenciaArtificial` siempre fijo (el grande, más masa)
- Los 2-4 restantes se proponen y se deciden con el usuario antes de cerrar el post
- Mezclar inglés y español: términos técnicos (`#LLM`, `#MachineLearning`) tienen más masa en inglés
- Sin genéricos vacíos: `#Innovacion`, `#Tecnologia`, `#IA` solos no aportan
- Evitar hashtags de nicho sin masa real en LinkedIn (`#ModelosFundacionales`, `#NLP` en español)

---

## Venv y entorno Python
- Venv: `.venv/bin/python3.14`
- Playwright instalado en este venv
- Poppler instalado (brew)
