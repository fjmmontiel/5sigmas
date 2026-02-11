# 5SIGMAS Animation Creation Prompt

Use the following prompt when you want to generate a new animation for the 5sigmas project. It ensures the output follows the refactored architecture, branding, and technical standards.

---

## The Prompt

**Act as an expert Frontend Developer and Data Visualization specialist.**

**Context**: You are creating an animation for the "5sigmas" project, a high-quality educational platform about AI. 

**Goal**: Create a standalone HTML snippet for an animation titled: **"[INSERT TITLE HERE]"**.

**Technical Requirements:**
1. **Single File**: Output a single HTML snippet (no external files except the global assets).
2. **Include Policy**: The snippet must be consumed via `include_html(...)` only; do not use or suggest the legacy `include_animation` macro.
3. **Global Assets**: Do NOT include CSS for tabs, branding shell, modal, or core layout. These are provided by `animations.css`, `extra.css`, `tabbed-animations.js`, and `animation-shell.js`.
4. **Internal Logic**: You can include a `<script>` tag for specific visualization logic (SVG animations, counters, canvas) and a `<style>` tag for styles *unique* to this specific visualization.
5. **Dark Mode**: Use `[data-md-color-scheme="slate"]` selectors and shared tokens to ensure automatic adaptation with Material native toggle.
6. **Responsive**: The layout must work on mobile (use `ta-grid` or `flex-wrap`).
7. **Style Scope (critical)**: Scope every snippet-specific selector under a unique root class for that snippet (e.g., `.demo-fund-ml ...`). Never define bare global selectors like `.ta-copy`, `.ta-viz`, `.ta-card`, `.ta-grid`, `svg`, `button`.

---

### OPTION A: TABBED INTERFACE
Use this structure if the concept is complex and needs steps:

```html
<div class="ta-demo ta-tabs demo-[slug]" data-anim-tabs data-default="tab1" data-anim-fullscreen="on" data-anim-contrast="force">
  <div class="ta-tabs-header">
    <div class="ta-tabs-title">[Title]</div>
    <div class="ta-tabs-subtitle">[Sub-description]</div>
  </div>

  <div class="ta-tablist" role="tablist">
    <button class="ta-tab" type="button" role="tab" data-tab="tab1">Step 1</button>
    <button class="ta-tab" type="button" role="tab" data-tab="tab2">Step 2</button>
  </div>

  <div class="ta-panels">
    <section class="ta-panel" role="tabpanel" data-panel="tab1">
        <div class="ta-grid">
          <div class="ta-viz"> [SVG or Visual Content] </div>
          <div class="demo-copy">
            <div class="ta-card-k">Concept</div>
            <div class="ta-card-v">Detailed explanation...</div>
          </div>
      </div>
    </section>
    <section class="ta-panel" role="tabpanel" data-panel="tab2" hidden>
       <!-- Repeat structure for tab 2 -->
    </section>
  </div>
</div>
```

---

### OPTION B: SIMPLE INTERFACE (No Tabs)
Use this for single infographics:

```html
<div class="ta-demo ta-generic" data-anim-fullscreen="on" data-anim-contrast="force">
  <section class="ta-section ta-section--header">
    <div class="ta-tabs-title">[Title]</div>
    <div class="ta-tabs-subtitle">[Sub-description]</div>
  </section>

  <section class="ta-section ta-section--viewport">
    <div class="ta-vizbox">[SVG or Visual Content]</div>
  </section>

  <section class="ta-section ta-section--insights ta-grid">
    <article class="ta-card">
      <div class="ta-card-k">Key Insight</div>
      <div class="ta-card-v">Explanation...</div>
    </article>
  </section>
</div>
```

---

### Mandatory CSS Classes for Content:
- `ta-card`: A container for text info.
- `ta-card-k`: Small bold header for a concept.
- `ta-card-v`: Regular text for the value/definition.
- `ta-chips`: Container for a list of tags.
- `ta-chip`: A single rounded tag.
- `ta-grid`: A 2-column layout that collapses on mobile.

**Mandatory scope pattern for custom CSS**
- Add a unique class in the root: `demo-[slug]`.
- Prefix all custom CSS with that root. Example: `.demo-[slug] .demo-copy { ... }`.
- If you need helper classes (`demo-copy`, `demo-node`, etc.), keep them local to the root prefix.

**Critical: Branding, Footer & Fullscreen**
- The global shell is injected by `include_html(...)` and guarantees the footer "5SIGMAS · Animation Library".
- Never embed `anim-brand-shell`, `data-anim-shell`, or `data-anim-shell-open` manually inside the snippet.
- Keep content inside your snippet container (`ta-demo` + `ta-section`); do not rely on fixed positioning to paint outside.
- Fullscreen is enabled by default; use `anim_fullscreen="off"` in `include_html(...)` or `data-anim-fullscreen="off"` in snippet only when needed.
- Fullscreen precedence is: include arg `anim_fullscreen` > snippet `data-anim-fullscreen` > default `on`.

**Aesthetic Guidelines:**
- Use the CSS variables: `--ta-brand-primary` (teal), `--ta-brand-warm` (orange), `--ta-brand-accent` (blue).
- Avoid generic colors. Use HSL or the brand variables.
- Add subtle micro-animations (e.g., `fade-in`, `draw-line`).
- Do NOT add logos or footers manually; they come from the global include shell.

**Output just the HTML code with its internal style/script.**
