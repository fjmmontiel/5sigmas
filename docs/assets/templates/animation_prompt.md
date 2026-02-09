# 5SIGMAS Animation Creation Prompt

Use the following prompt when you want to generate a new animation for the 5sigmas project. It ensures the output follows the refactored architecture, branding, and technical standards.

---

## The Prompt

**Act as an expert Frontend Developer and Data Visualization specialist.**

**Context**: You are creating an animation for the "5sigmas" project, a high-quality educational platform about AI. 

**Goal**: Create a standalone HTML snippet for an animation titled: **"[INSERT TITLE HERE]"**.

**Technical Requirements:**
1. **Single File**: Output a single HTML snippet (no external files except the global assets).
2. **Global Assets**: Do NOT include CSS for tabs, branding, or core layout. These are provided by `animations.css` and `tabbed-animations.js` (loaded by the site).
3. **Internal Logic**: You can include a `<script>` tag for specific visualization logic (SVG animations, counters, canvas) and a `<style>` tag for styles *unique* to this specific visualization.
4. **Dark Mode**: Use `[data-md-color-scheme="slate"]` selectors to ensure perfect visibility in dark mode.
5. **Responsive**: The layout must work on mobile (use `ta-grid` or `flex-wrap`).

---

### OPTION A: TABBED INTERFACE
Use this structure if the concept is complex and needs steps:

```html
<div class="ta-demo" data-tabs data-default="tab1">
  <div class="ta-tabs-header">
    <div class="ta-tabs-title">[Title]</div>
    <div class="ta-tabs-subtitle">[Sub-description]</div>
  </div>

  <div class="ta-tablist" data-role="tablist">
    <button class="ta-tab" type="button" data-role="tab" data-tab="tab1">Step 1</button>
    <button class="ta-tab" type="button" data-role="tab" data-tab="tab2">Step 2</button>
  </div>

  <div class="ta-panels">
    <section class="ta-panel" role="tabpanel" data-panel="tab1">
      <div class="ta-grid">
        <div class="ta-viz"> [SVG or Visual Content] </div>
        <div class="ta-copy">
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
<div class="ta-demo">
  <div class="ta-tabs-header">
    <div class="ta-tabs-title">[Title]</div>
    <div class="ta-tabs-subtitle">[Sub-description]</div>
  </div>
  
  <div class="ta-grid">
    <div class="ta-viz"> [SVG or Visual Content] </div>
    <div class="ta-copy">
      <div class="ta-card-k">Key Insight</div>
      <div class="ta-card-v">Explanation...</div>
    </div>
  </div>
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

**Critical: Branding & Footer**
- The `ta-demo` container has a mandatory **bottom padding of 60px** to clear the "5SIGMAS · Animation Library" footer. 
- **Do not** use `position: absolute` with `bottom: 0` for your content, as it will overlap the footer. 
- Always ensure your content stays within the padded area. The footer has a high `z-index` to remain visible, but overlapping content looks unprofessional.

**Aesthetic Guidelines:**
- Use the CSS variables: `--ta-brand-primary` (teal), `--ta-brand-warm` (orange), `--ta-brand-accent` (blue).
- Avoid generic colors. Use HSL or the brand variables.
- Add subtle micro-animations (e.g., `fade-in`, `draw-line`).
- Do NOT add logos or footers; the `ta-demo` class handles the 5sigmas branding automatically.

**Output just the HTML code with its internal style/script.**
