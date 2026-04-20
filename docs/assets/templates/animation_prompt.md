# 5Sigmas — Guía de referencia para animaciones interactivas

Documento de referencia para generar nuevos snippets HTML de animación para el proyecto 5sigmas. Describe la arquitectura real tal como está implementada en los snippets de producción.

---

## Arquitectura general

Cada animación es un **fichero HTML autocontenido** en `docs/snippets/<serie>/XX-nombre.html`.
Se inserta en el artículo con la macro de MkDocs:

```
{{ include_html('snippets/<serie>/XX-nombre.html') }}
```

El fichero tiene tres bloques en este orden: `<div>` HTML → `<script>` → `<style>`.

---

## Estructura del wrapper

```html
<div class="XYZ-wrap" data-demo="XX-nombre-unico">
  <!-- contenido -->
</div>

<script>
(function () {
  function initRoot(root) {
    if (root.dataset.xyzReady === '1') return;
    root.dataset.xyzReady = '1';
    /* lógica de interacción */
  }

  function boot() {
    document.querySelectorAll('[data-demo="XX-nombre-unico"]').forEach(initRoot);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  if (typeof document$ !== 'undefined' && document$.subscribe) document$.subscribe(boot);
})();
</script>

<style>
/* ... */
</style>
```

**Reglas:**
- El prefijo de clase (`XYZ`) son 3-5 caracteres únicos para este snippet. Ejemplos reales: `emb`, `tr`, `sc`, `sys`, `lops`, `rut`, `dif`.
- `data-demo` es el ID único del snippet. Debe coincidir con el selector de `boot()`.
- La guardia `dataset.xyzReady === '1'` evita doble init en navegación instantánea de MkDocs.
- `document$.subscribe` es la integración con MkDocs Material instant navigation — siempre incluirla.

---

## Variables CSS obligatorias

Definir en el selector raíz `.XYZ-wrap`:

```css
.XYZ-wrap {
  --sa: var(--md-primary-fg-color, #26A69A);   /* teal — color primario */
  --sb: #324AB2;                                /* azul — color secundario */
  --sg: var(--md-accent-fg-color, #FFB343);    /* dorado — acento */
  --sr: #ef4444;                                /* rojo — error / límite */
  --sbg: var(--md-default-bg-color, #fff);     /* fondo */
  --sfg: var(--md-default-fg-color, #0f172a);  /* texto */
  --sbd: rgba(15,23,42,.14);                    /* borde / separador */
  --smut: rgba(15,23,42,.52);                   /* texto muted */
  --sf: "Avenir Next","Avenir","Segoe UI","Helvetica Neue",Arial,sans-serif;

  width: 100%;           /* NUNCA max-width: 960px — eso causa el problema de ancho */
  display: grid;
  gap: 12px;
  padding: clamp(14px,2vw,22px);
  border: 1px solid var(--sbd);
  border-radius: 20px;
  background: var(--sbg);
  color: var(--sfg);
  font-family: var(--sf);
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}
.XYZ-wrap, .XYZ-wrap * { box-sizing: border-box; }
```

**Dark mode** — siempre añadir este bloque:

```css
[data-md-color-scheme="slate"] .XYZ-wrap {
  --sbg: var(--md-default-bg-color, #0f172a);
  --sfg: var(--md-default-fg-color, #e2e8f0);
  --sbd: rgba(226,232,240,.14);
  --smut: rgba(226,232,240,.55);
}
```

---

## Cabecera estándar

```html
<div class="XYZ-hd">
  <div class="XYZ-title">Título de la animación</div>
  <div class="XYZ-sub">Descripción breve del concepto que se visualiza.</div>
</div>
```

```css
.XYZ-hd { display: grid; gap: 5px; }
.XYZ-title { font-size: clamp(17px,2.2vw,24px); font-weight: 900; letter-spacing: -.02em; line-height: 1.1; }
.XYZ-sub   { font-size: 14px; color: var(--smut); line-height: 1.5; max-width: 74ch; }
```

---

## Patrones de interacción

### A. Tabs con pills (para 2-4 opciones de igual peso)

Patrón real: `02-llm-rag-agente.html`

```html
<div class="XYZ-tablist" role="tablist">
  <button class="XYZ-tab XYZ-tab--on" data-for="a" role="tab" aria-selected="true">
    <span class="XYZ-tab-n">1</span> Opción A
  </button>
  <button class="XYZ-tab" data-for="b" role="tab" aria-selected="false">
    <span class="XYZ-tab-n">2</span> Opción B
  </button>
</div>

<div class="XYZ-panels">
  <div class="XYZ-panel" data-panel="a" role="tabpanel"><!-- contenido --></div>
  <div class="XYZ-panel" data-panel="b" role="tabpanel" hidden><!-- contenido --></div>
</div>
```

```js
const tabs   = Array.from(root.querySelectorAll('.XYZ-tab'));
const panels = Array.from(root.querySelectorAll('.XYZ-panel'));

function activate(key) {
  tabs.forEach(t => {
    const on = t.dataset.for === key;
    t.classList.toggle('XYZ-tab--on', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  panels.forEach(p => { p.hidden = p.dataset.panel !== key; });
}

tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.for)));
activate('a'); // default
```

```css
.XYZ-panel[hidden] { display: none; }

@keyframes XYZ-panel-in {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
.XYZ-panel:not([hidden]) { animation: XYZ-panel-in 0.22s ease both; }
```

---

### B. Pipeline numerado con líneas conectoras (para pasos secuenciales)

Patrón real: `02-llmops.html`

```html
<div class="XYZ-pipeline" role="tablist">
  <button class="XYZ-pip XYZ-pip--active" data-step="1" role="tab"
          aria-selected="true" aria-controls="XYZ-pane-1">
    <div class="XYZ-pip-n">1</div>
    <div class="XYZ-pip-l">Paso uno</div>
  </button>
  <div class="XYZ-pip-line" aria-hidden="true"></div>
  <button class="XYZ-pip" data-step="2" role="tab"
          aria-selected="false" aria-controls="XYZ-pane-2">
    <div class="XYZ-pip-n">2</div>
    <div class="XYZ-pip-l">Paso dos</div>
  </button>
</div>

<div class="XYZ-stage">
  <div class="XYZ-pane XYZ-pane--active" id="XYZ-pane-1" role="tabpanel"><!-- --></div>
  <div class="XYZ-pane" id="XYZ-pane-2" role="tabpanel" hidden><!-- --></div>
</div>
```

```js
const pips   = Array.from(root.querySelectorAll('.XYZ-pip[data-step]'));
const panes  = Array.from(root.querySelectorAll('.XYZ-pane'));

function activate(step) {
  pips.forEach(p => {
    const on = p.dataset.step === step;
    p.classList.toggle('XYZ-pip--active', on);
    p.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  panes.forEach(p => { p.hidden = p.id !== `XYZ-pane-${step}`; });
}

pips.forEach(p => p.addEventListener('click', () => activate(p.dataset.step)));
activate('1');
```

---

### C. Selector de botones sin paneles (para actualizar un área de detalle)

Patrón real: `02-escalas.html`

```js
const pts = Array.from(root.querySelectorAll('[data-sc]'));
const detail = root.querySelector('#XYZ-detail');

function activate(key) {
  pts.forEach(p => {
    const on = p.getAttribute('data-sc') === key;
    p.setAttribute('aria-pressed', on ? 'true' : 'false');
    p.classList.toggle('XYZ-pt--active', on);
  });
  // renderizar detalle con DATA[key]
  detail.innerHTML = `...`;
}

pts.forEach(pt => pt.addEventListener('click', () => activate(pt.getAttribute('data-sc'))));
activate(pts[0].getAttribute('data-sc'));
```

---

## Patrones de animación

### Dot que viaja por una flecha (flujo lineal)

Patrón real: `02-llm-rag-agente.html`

```html
<div class="XYZ-arr">
  <div class="XYZ-arr-line"></div>
  <div class="XYZ-arr-tip"></div>
  <div class="XYZ-arr-dot" style="--dur:2.4s;--del:0.1s;--col:var(--sa)"></div>
</div>
```

```css
.XYZ-arr {
  flex: 1; min-width: 36px; max-width: 110px;
  position: relative; height: 38px;
  display: flex; align-items: center;
}
.XYZ-arr-line { flex: 1; height: 2px; background: var(--sbd); }
.XYZ-arr-tip  {
  width: 0; height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid var(--sbd);
  flex-shrink: 0;
}
.XYZ-arr-dot {
  position: absolute; left: 0; top: 50%;
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--col, var(--sa));
  transform: translate(-50%, -50%);
  animation: XYZ-dot-go var(--dur, 2.4s) var(--del, 0s) infinite ease-in-out;
  box-shadow: 0 0 8px color-mix(in srgb, var(--col, var(--sa)) 55%, transparent);
}
@keyframes XYZ-dot-go {
  0%   { left: 0%;   opacity: 0; }
  8%   { opacity: 1; }
  88%  { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
```

---

### SVG con animateMotion (bucle circular o path complejo)

Patrón real: `02-llm-rag-agente.html` (tab Agente)

```html
<svg class="XYZ-loop-svg" viewBox="0 0 300 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <marker id="XYZ-marr" viewBox="0 0 8 8" refX="6" refY="4"
            markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M1,1.5 L6.5,4 L1,6.5" fill="none" stroke="var(--sg)"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- El path que el dot va a recorrer -->
  <path id="XYZ-path-fwd"
        d="M 150,4 L 288,4 L 288,60 L 150,60"
        fill="none" stroke="var(--sg)" stroke-width="2" stroke-dasharray="5,4"
        stroke-linecap="round" marker-end="url(#XYZ-marr)"/>

  <!-- Dot animado -->
  <circle r="5" fill="var(--sg)" opacity="0.92">
    <animateMotion dur="2s" repeatCount="indefinite" begin="0s">
      <mpath href="#XYZ-path-fwd"/>
    </animateMotion>
  </circle>
</svg>
```

**Notas:**
- Los IDs del SVG (`XYZ-path-fwd`, `XYZ-marr`) deben llevar el prefijo del snippet para evitar colisiones globales.
- `begin="1s"` en un segundo dot crea el efecto de persecución.
- Para reiniciar al activar un tab: `root.querySelectorAll('animateMotion').forEach(m => { try { m.beginElement(); } catch(_){} })`.

---

### Barras animadas con IntersectionObserver

Patrón real: `02-transformer.html`

```html
<div class="XYZ-bar-track"><div class="XYZ-bar-fill" data-w="42%"></div></div>
```

```js
function animateBars(root) {
  root.querySelectorAll('.XYZ-bar-fill[data-w]').forEach((el, i) => {
    el.style.width = '0';
    setTimeout(() => { el.style.width = el.dataset.w; }, 100 + i * 50);
  });
}

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animateBars(root); io.disconnect(); } });
  }, { threshold: 0.3 });
  io.observe(root);
} else {
  animateBars(root);
}
```

```css
.XYZ-bar-fill {
  height: 100%;
  width: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--sa), var(--sb));
  transition: width .55s ease;
}
```

---

### Spinner CSS

```css
.XYZ-spin { display: inline-block; animation: XYZ-spin 1.8s linear infinite; }
@keyframes XYZ-spin { to { transform: rotate(360deg); } }
```

---

## Nodos de flujo (diagramas lineales)

Patrón real: `02-llm-rag-agente.html`, `02-transformer.html`

```html
<div class="XYZ-flow">
  <div class="XYZ-fnode XYZ-fnode--in">
    <div class="XYZ-fn-l">Entrada</div>
  </div>
  <!-- arrow -->
  <div class="XYZ-fnode XYZ-fnode--model">
    <div class="XYZ-fn-l">Modelo</div>
    <div class="XYZ-fn-s">subtítulo pequeño</div>
  </div>
  <!-- arrow -->
  <div class="XYZ-fnode XYZ-fnode--out">
    <div class="XYZ-fn-l">Salida</div>
  </div>
</div>
```

```css
.XYZ-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 0; }

.XYZ-fnode {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--sbd);
  background: color-mix(in srgb, var(--sbg) 84%, transparent);
  font-weight: 800; text-align: center; flex-shrink: 0;
}
.XYZ-fn-l { font-size: 13px; font-weight: 800; }
.XYZ-fn-s { font-size: 10.5px; font-weight: 600; color: var(--smut); margin-top: 2px; }

/* Variantes de color */
.XYZ-fnode--in    { border-color: color-mix(in srgb,var(--sb) 34%,var(--sbd)); background: color-mix(in srgb,var(--sb) 10%,var(--sbg)); }
.XYZ-fnode--model { border-color: color-mix(in srgb,var(--sa) 44%,var(--sbd)); background: color-mix(in srgb,var(--sa) 12%,var(--sbg)); box-shadow: 0 0 0 2px color-mix(in srgb,var(--sa) 16%,transparent); }
.XYZ-fnode--out   { border-color: color-mix(in srgb,var(--sa) 28%,var(--sbd)); background: color-mix(in srgb,var(--sa) 8%,var(--sbg)); }
```

---

## Cards de contexto (funciona para / no funciona para)

Patrón real: `02-llm-rag-agente.html`, `03-cinco-diferencias.html`

```html
<div class="XYZ-cards">
  <div class="XYZ-card XYZ-card--good">
    <div class="XYZ-card-k">Funciona para</div>
    <p>Descripción de casos de uso válidos.</p>
  </div>
  <div class="XYZ-card XYZ-card--limit">
    <div class="XYZ-card-k">Limitación</div>
    <p>Descripción de lo que no hace o falla.</p>
  </div>
</div>
```

```css
.XYZ-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.XYZ-card {
  border: 1px solid var(--sbd);
  border-radius: 11px;
  padding: 11px 13px;
  display: grid; gap: 5px; align-content: start;
}
.XYZ-card--good  {
  border-color: color-mix(in srgb,var(--sa) 30%,var(--sbd));
  background: linear-gradient(135deg,color-mix(in srgb,var(--sa) 7%,transparent),transparent 65%),
              color-mix(in srgb,var(--sbg) 93%,#0f172a 7%);
}
.XYZ-card--limit {
  border-color: color-mix(in srgb,var(--sr) 22%,var(--sbd));
  background: linear-gradient(135deg,color-mix(in srgb,var(--sr) 5%,transparent),transparent 65%),
              color-mix(in srgb,var(--sbg) 93%,#0f172a 7%);
}
.XYZ-card-k { font-size: 10.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; color: var(--smut); }
.XYZ-card p { margin: 0; font-size: 13px; line-height: 1.5; }
```

---

## Chips / Tags

```html
<div class="XYZ-chips">
  <span class="XYZ-chip">Concepto A</span>
  <span class="XYZ-chip XYZ-chip--hl">Concepto destacado</span>
</div>
```

```css
.XYZ-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.XYZ-chip {
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--sbd);
  background: color-mix(in srgb, var(--sbg) 86%, transparent);
  font-size: 12.5px; font-weight: 600;
}
.XYZ-chip--hl {
  border-color: color-mix(in srgb, var(--sb) 36%, var(--sbd));
  background: color-mix(in srgb, var(--sb) 9%, var(--sbg));
  font-weight: 700;
}
```

---

## Responsive y accesibilidad

Siempre añadir al final del `<style>`:

```css
@media (max-width: 580px) {
  .XYZ-cards { grid-template-columns: 1fr; }
  /* ajustes específicos del layout */
}

@media (prefers-reduced-motion: reduce) {
  .XYZ-arr-dot,
  .XYZ-spin { animation: none !important; }
  .XYZ-bar-fill { transition: none; }
}
```

---

## Colores de fondo con gradiente radial

Para el `.XYZ-wrap` cuando se quiere dar profundidad:

```css
background:
  radial-gradient(110% 130% at 10% 0%, color-mix(in srgb,var(--sb) 8%,transparent), transparent 52%),
  radial-gradient(80% 110% at 90% 0%,  color-mix(in srgb,var(--sg) 8%,transparent), transparent 54%),
  var(--sbg);
```

---

## Ubicación de ficheros y convención de nombres

```
docs/snippets/
└── <serie>/
    ├── 01-nombre-concepto.html    ← animación del capítulo 1
    ├── 01-otro-concepto.html
    └── 02-siguiente.html
```

Series actuales: `fundamentos-ia-iag`, `from-cave-to-agi`, `multimodalidad-iag`, `modelos-razonadores`, `ia-pib-bienestar-energia`, `datacenters-espacio`.

El número de prefijo coincide con el capítulo del artículo donde se inserta.

---

## Checklist antes de entregar un snippet nuevo

- [ ] Prefijo de clase único de 3-5 chars, sin colisiones con otros snippets
- [ ] `data-demo` único, igual que el selector en `boot()`
- [ ] Guardia `dataset.XYZReady` en `initRoot`
- [ ] `document$.subscribe(boot)` incluido
- [ ] `width: 100%` en el wrapper — **nunca `max-width` fijo**
- [ ] Variables `--sa/sb/sg/sr/sbg/sfg/sbd/smut` definidas en el wrapper
- [ ] Bloque `[data-md-color-scheme="slate"]` para dark mode
- [ ] IDs de SVG con prefijo del snippet (`XYZ-path-xxx`, `XYZ-marker-xxx`)
- [ ] `@media (prefers-reduced-motion: reduce)` desactiva todas las animaciones
- [ ] `@media (max-width: 580px)` colapsa grids a 1 columna
