/**
 * md-to-article-html.mjs
 *
 * Converts a 5Sigmas series article (.md) into a beat-structured HTML
 * ready for article-to-video.mjs rendering.
 *
 * Usage:
 *   node md-to-article-html.mjs <path/to/article.md> [output.html]
 *
 * Requires:
 *   - gcloud CLI authenticated (gcloud auth print-access-token)
 *   - ANTHROPIC_VERTEX_PROJECT_ID in ~/.claude/.env
 *   - node_modules/@anthropic-ai/vertex-sdk (npm install)
 *
 * Pipeline:
 *   1. Parse frontmatter + clean body from .md
 *   2. Call Claude (Vertex) → get beats JSON
 *   3. Render beats into article HTML template
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AnthropicVertex from "./node_modules/@anthropic-ai/vertex-sdk/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const MD_PATH   = args.find(a => !a.startsWith("--"));
const OUT_HTML  = args.filter(a => !a.startsWith("--"))[1];
const DO_RENDER = args.includes("--render");
const NO_CTA    = args.includes("--no-cta");   // omit CTA beat (for site-embedded article videos)
const OUT_VIDEO = args.find(a => a.startsWith("--out="))?.split("=")[1];

if (!MD_PATH) {
  console.error("Usage: node md-to-article-html.mjs <article.md> [output.html] [--render] [--no-cta] [--out=video.mp4]");
  process.exit(1);
}
if (!fs.existsSync(MD_PATH)) {
  console.error(`Not found: ${MD_PATH}`);
  process.exit(1);
}

const slug    = path.basename(MD_PATH, ".md");
const outPath = OUT_HTML || path.join(__dirname, `article_${slug}.html`);

// ─── Vertex / Claude config ───────────────────────────────────────────────────
function readEnvFile() {
  try {
    const raw = fs.readFileSync(path.join(process.env.HOME, ".claude/.env"), "utf8");
    const out = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim();
    }
    return out;
  } catch { return {}; }
}
const dotenv  = readEnvFile();
const PROJECT = process.env.ANTHROPIC_VERTEX_PROJECT_ID || dotenv.ANTHROPIC_VERTEX_PROJECT_ID;
const REGION  = process.env.CLOUD_ML_REGION             || dotenv.CLOUD_ML_REGION || "europe-west1";
const MODEL   = process.env.ANTHROPIC_MODEL || dotenv.ANTHROPIC_MODEL || "claude-sonnet-4-6@20251101";

// Ensure GOOGLE_APPLICATION_CREDENTIALS is set (vertex-sdk needs it)
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Try to find service account key next to CLAUDE.md
  const candidates = [
    path.join(process.env.HOME, ".claude", `${PROJECT}-*.json`),
    path.join(process.env.HOME, ".claude", "service_account.json"),
  ];
  console.warn("GOOGLE_APPLICATION_CREDENTIALS not set — vertex-sdk will use ADC");
}

if (!PROJECT) {
  console.error("ANTHROPIC_VERTEX_PROJECT_ID not set. Check ~/.claude/.env");
  process.exit(1);
}

// ─── Brand palette (rotating) ─────────────────────────────────────────────────
const COLORS = ["#26A69A", "#FFB343", "#7cc7ff", "#26A69A", "#FFB343", "#7cc7ff", "#26A69A", "#FFB343"];

// ─── Parse markdown ───────────────────────────────────────────────────────────
function parseMarkdown(raw) {
  // Extract frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const fm      = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const [k, ...v] = line.split(":");
      if (k && v.length) fm[k.trim()] = v.join(":").trim().replace(/^"|"$/g, "");
    }
  }

  // Strip frontmatter, then clean noise
  let body = raw.replace(/^---[\s\S]*?---\n/, "");

  // Remove include_html directives (snippets)
  body = body.replace(/\{\{.*?\}\}/g, "");

  // Remove reference tables and details blocks
  body = body.replace(/<details[\s\S]*?<\/details>/gi, "");

  // Remove !!! admonitions (mkdocs)
  body = body.replace(/^!!! \w+.*\n(    .*\n)*/gm, "");

  // Remove markdown links → keep text only
  body = body.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove FAQ section (everything from "## Preguntas" onward)
  body = body.replace(/## Preguntas frecuentes[\s\S]*$/i, "");

  // Remove references section
  body = body.replace(/## \d+\. Referencias[\s\S]*$/i, "");
  body = body.replace(/## Referencias[\s\S]*$/i, "");

  // Remove horizontal rules
  body = body.replace(/^---+$/gm, "");

  // Collapse whitespace
  body = body.replace(/\n{3,}/g, "\n\n").trim();

  return { fm, body };
}

// ─── Call Claude via Vertex SDK ──────────────────────────────────────────────
const vertexClient = new AnthropicVertex({ projectId: PROJECT, region: REGION });

async function callClaude(systemPrompt, userContent) {
  const msg = await vertexClient.messages.create({
    model:      MODEL,
    max_tokens: 4096,
    system:     systemPrompt,
    messages:   [{ role: "user", content: userContent }],
  });
  return msg.content[0].text;
}

// ─── Generate beat structure via Claude ──────────────────────────────────────
const SYSTEM_PROMPT = `You are a video editor for 5Sigmas, a Spanish channel about AI history.
Transform a long-form article into a beat structure for a 90-second cinematic video in JSON.

CRITICAL RULES — do not break any of these:

BEATS:
- Exactly 5 or 6 content beats (never more). Be ruthless: select only the 5-6 most essential ideas.
- opening: series_tag must match the article's series exactly (e.g. "De la cueva a la AGI · Capítulo 1")
- cta: always "Lee el artículo completo." / "Con el artículo completo en 5Sigmas."

HEADLINE — must feel like a punch, not a summary:
- Lead with the STRIKING OBSERVATION or PARADOX, not the explanation
- Max 7 words, sentence-fragment style, in Spanish
- Bad: "Al-Khwarizmi crea el álgebra en el siglo IX"
- Good: "Operar con lo que todavía no sabemos."
- Can use \\n for a line break if the headline has two strong clauses

BODY — Two-paragraph structure separated by <br><br>. Total 38–48 words. No exceptions.

PARAGRAPH 1 (22–28 words): Setup/context. Short declarative sentences. Facts that build tension.
PARAGRAPH 2 (16–22 words): The key insight — the punch. End with <strong style="color:#f0f4ff;">the key concept bolded.</strong>

Style rules:
- Use <em style="color:#7cc7ff;">term</em> for ONE technical term in paragraph 1 (optional)
- Use <strong style="color:#FFB343;">number or date</strong> if a specific figure is the point
- Sentence structure: short and declarative. No subordinate chains.
- Bad body: "Hay dos pasos distintos: usar una marca para señalar una ausencia posicional y tratar esa ausencia como un número operable."
- Good body: "Marcar que falta algo es un paso. Darle reglas aritméticas es otro completamente distinto.<br><br>Brahmagupta formalizó el cero como número con reglas propias. Con eso, el mismo símbolo vale 3, 30 o 3.000 según su posición. Eso es <strong style=\"color:#f0f4ff;\">notación posicional.</strong>"

EPOCH: location · period (e.g. "Bagdad · Siglo IX d.C.", "Grecia · ≈ 300 a.C.", "India · Siglos V–VII d.C.")

DECO: single character/symbol that IS the concept (not describes it):
- zero → "0", algebra → "x", calculus → "∂", logic → "∴", tally → "|||", function → "f(x)"
- Each deco must be DIFFERENT from the others — no repeats across beats

COLORS — alternate strictly through the palette:
- deco_color: #26A69A | #FFB343 | #7cc7ff (rotate, never two consecutive beats same color)
- divider_color: same palette, always DIFFERENT from deco_color of that beat

Output ONLY valid JSON, no explanation, no markdown fences. Schema:
{
  "opening": {
    "series_tag": "string",
    "main_title": "string",
    "subtitle": "string",
    "date_range": "string",
    "deco": "string",
    "deco_color": "string"
  },
  "beats": [
    {
      "id": "02_shortname",
      "epoch": "string",
      "headline": "string",
      "body": "string (HTML inline allowed)",
      "deco": "string",
      "deco_color": "string",
      "divider_color": "string"
    }
  ],
  "cta": {
    "epoch": "string",
    "headline": "string",
    "body": "string"
  }
}

The cta.url is always fixed as "5sigmas.com" — do NOT invent or guess article paths.`;

// ─── Render HTML from beats JSON ──────────────────────────────────────────────
function renderHTML(beatsJson, slug, { noCta = false } = {}) {
  const { opening, beats, cta } = beatsJson;

  const footer_label_opening = opening.series_tag || "5Sigmas";
  const footer_label_content = opening.main_title || slug;
  const footer_label_cta     = opening.series_tag || "5Sigmas";

  // Content beats HTML
  const beatBlocks = beats.map((b, i) => {
    const id   = b.id || `0${i+2}_beat`;
    const dc   = b.deco_color  || COLORS[i % COLORS.length];
    const divc = b.divider_color || COLORS[(i + 1) % COLORS.length];
    return `\n<!-- ═══ BEAT ${i+2} — ${id} ════════════════════════════════════════════ -->
<div class="beat" data-id="${id}" data-type="content" style="--c:${dc};">
  <div class="accent-bar"></div>
  <div class="beat-inner">
    <div class="epoch">${b.epoch}</div>
    <div class="divider" style="background:${divc};"></div>
    <div class="headline">${b.headline.replace(/\\n/g, "<br>")}</div>
    <div class="body">${b.body}</div>
  </div>
  <div class="deco" style="color:${dc};">${b.deco}</div>
  <div class="footer">
    <span class="footer-label">5Sigmas · ${footer_label_content}</span>
    <span class="footer-logo">5σ</span>
  </div>
</div>`;
  }).join("\n");

  const openDeco      = opening.deco       || slug.charAt(0).toUpperCase();
  const openDecoColor = opening.deco_color || "#26A69A";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Article Video — ${opening.main_title}</title>
<style>
  /* Generated by md-to-article-html.mjs */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0b1220; }

  @font-face { font-family: "Avenir Next"; }
  body { font-family: "Avenir Next","Avenir","Segoe UI","Helvetica Neue",Arial,sans-serif; color: #f0f4ff; }

  /* ── Beat layout ──────────────────────────────────────────── */
  .beat {
    --c: #26A69A;   /* beat color — overridden inline per beat */
    width: 1920px; height: 1080px;
    display: none; flex-direction: column;
    background: #0b1220; position: relative; overflow: hidden;
  }
  .beat.active { display: flex; }

  /* Corner ambient glow from beat color */
  .beat::before {
    content: ''; position: absolute; bottom: -80px; right: -80px;
    width: 720px; height: 720px; border-radius: 50%;
    background: radial-gradient(circle, var(--c) 0%, transparent 68%);
    opacity: .06; pointer-events: none;
  }

  /* Subtle dot-grid texture */
  .beat::after {
    content: ''; position: absolute; inset: 0;
    background-image: radial-gradient(circle, rgba(240,244,255,.035) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  .accent-bar {
    height: 5px; flex-shrink: 0;
    background: linear-gradient(90deg, #26A69A 0%, #324AB2 40%, #FFB343 80%);
  }

  .beat-inner {
    flex: 1; display: flex; flex-direction: column;
    justify-content: center; padding: 0 160px;
  }

  /* ── Footer ────────────────────────────────────────────────── */
  .footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 160px 48px; flex-shrink: 0; position: relative; z-index: 1;
  }
  .footer-label {
    font-size: 13px; font-weight: 600; letter-spacing: .15em;
    color: rgba(240,244,255,.3); text-transform: uppercase;
  }
  .footer-logo {
    font-size: 36px; font-weight: 800; letter-spacing: -3px;
    background: linear-gradient(135deg, #26A69A 0%, #324AB2 40%, #FFB343 80%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }

  /* ── Deco — glows in beat color ────────────────────────────── */
  .deco {
    position: absolute; right: 120px; bottom: 100px;
    font-size: 280px; font-weight: 900; line-height: 1; opacity: .16;
    font-family: "SF Mono","JetBrains Mono","Courier New",monospace;
    pointer-events: none; user-select: none;
    text-shadow: 0 0 180px var(--c);
  }

  /* ── Opening beat ──────────────────────────────────────────── */
  .opening .beat-inner { justify-content: center; align-items: flex-start; }
  .opening .series-tag {
    font-size: 13px; font-weight: 600; letter-spacing: .18em;
    text-transform: uppercase; color: rgba(240,244,255,.4); margin-bottom: 24px;
  }
  .opening .main-title {
    font-size: 160px; font-weight: 900; letter-spacing: -.04em;
    line-height: .95; color: #f0f4ff; margin-bottom: 40px;
  }
  .opening .subtitle {
    font-size: 28px; font-weight: 400; line-height: 1.5;
    color: rgba(240,244,255,.65); max-width: 900px;
  }
  .opening .date-range {
    font-size: 22px; font-weight: 600; letter-spacing: .04em;
    color: var(--c); margin-top: 48px;
  }

  /* ── Content beats ─────────────────────────────────────────── */
  .epoch {
    font-size: 15px; font-weight: 700; letter-spacing: .18em;
    text-transform: uppercase; color: var(--c); margin-bottom: 40px;
  }
  .divider { width: 48px; height: 4px; border-radius: 2px; margin-bottom: 48px; }
  .headline {
    font-size: 88px; font-weight: 800; line-height: 1.05;
    letter-spacing: -.02em; color: #f0f4ff; margin-bottom: 48px; max-width: 1400px;
  }
  /* Two-paragraph body: p1 = context, p2 = insight (auto-split on <br><br>) */
  .body {
    font-size: 28px; font-weight: 400; line-height: 1.55;
    color: rgba(240,244,255,.75); max-width: 960px;
  }

  /* ── CTA beat ──────────────────────────────────────────────── */
  .cta-beat .beat-inner { align-items: flex-start; }
  .cta-beat .cta-headline {
    font-size: 100px; font-weight: 900; line-height: 1.0;
    color: #FFB343; margin-bottom: 40px; letter-spacing: -.03em;
  }
  .cta-beat .cta-body {
    font-size: 26px; color: rgba(240,244,255,.65);
    max-width: 800px; line-height: 1.6; margin-bottom: 52px;
  }
  .cta-beat .cta-url {
    font-size: 24px; font-weight: 700; color: #7cc7ff;
    letter-spacing: .04em; text-transform: uppercase;
  }
  .cta-beat .deco { color: #FFB343; opacity: .14; }
</style>
</head>
<body>

<!-- ═══ BEAT 1 — Opening ═══════════════════════════════════════════════════ -->
<div class="beat opening" data-id="01_opening" data-type="opening" style="--c:${openDecoColor};">
  <div class="accent-bar"></div>
  <div class="beat-inner">
    <div class="series-tag">${opening.series_tag}</div>
    <div class="main-title">${opening.main_title}</div>
    <div class="subtitle">${opening.subtitle}</div>
    <div class="date-range">${opening.date_range}</div>
  </div>
  <div class="deco" style="color:${openDecoColor};">${openDeco}</div>
  <div class="footer">
    <span class="footer-label">${footer_label_opening}</span>
    <span class="footer-logo">5σ</span>
  </div>
</div>
${beatBlocks}
${noCta ? "" : `
<!-- ═══ CTA ════════════════════════════════════════════════════════════════ -->
<div class="beat cta-beat" data-id="0${beats.length + 2}_cta" data-type="cta">
  <div class="accent-bar"></div>
  <div class="beat-inner">
    <div class="epoch">${cta.epoch || "5Sigmas.com"}</div>
    <div class="divider" style="background:#FFB343;"></div>
    <div class="cta-headline">${cta.headline.replace(/\\n/g, "<br>")}</div>
    <div class="cta-body">${cta.body}</div>
    <div class="cta-url">5sigmas.com →</div>
  </div>
  <div class="deco" style="color:#FFB343;">→</div>
  <div class="footer">
    <span class="footer-label">${footer_label_cta}</span>
    <span class="footer-logo">5σ</span>
  </div>
</div>`}

</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const raw = fs.readFileSync(MD_PATH, "utf8");
  console.log(`Parsing: ${MD_PATH}`);
  const { fm, body } = parseMarkdown(raw);

  const title = fm.title || slug;
  console.log(`  Title: ${title}`);
  console.log(`  Body:  ${body.length} chars → sending to Claude...`);

  const userContent = `Article title: ${title}
Article description: ${fm.description || ""}
Article date: ${fm.date || ""}

Full article body (cleaned):
---
${body}
---

Generate the beat structure JSON as specified. The article is in Spanish, output must be in Spanish.
For the CTA url field, infer it from the slug/title pattern: 5sigmas.com/series/<serie>/<slug>/`;

  let raw_response;
  try {
    raw_response = await callClaude(SYSTEM_PROMPT, userContent);
  } catch (e) {
    console.error("Claude API error:", e.message);
    process.exit(1);
  }

  // Extract JSON (strip any accidental markdown fences)
  const jsonStr = raw_response.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

  let beatsJson;
  try {
    beatsJson = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON from Claude response:");
    console.error(jsonStr.slice(0, 500));
    process.exit(1);
  }

  console.log(`\nBeats generated:`);
  console.log(`  Opening: ${beatsJson.opening.main_title}`);
  beatsJson.beats.forEach((b, i) => console.log(`  Beat ${i+2}: [${b.id}] ${b.epoch} — ${b.headline.slice(0, 50)}`));
  if (!NO_CTA) console.log(`  CTA: ${beatsJson.cta.headline}`);
  if (NO_CTA)  console.log(`  (CTA omitted — --no-cta)`);

  const html = renderHTML(beatsJson, slug, { noCta: NO_CTA });
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`\n✓ HTML written: ${outPath}`);

  if (DO_RENDER) {
    const { execSync: exec } = await import("child_process");
    // Default output: alongside the source .md file
    const mdDir   = path.dirname(path.resolve(MD_PATH));
    const videoOut = OUT_VIDEO || path.join(mdDir, `${slug}.mp4`);
    fs.mkdirSync(path.dirname(videoOut), { recursive: true });
    console.log(`\nRendering video → ${videoOut}`);
    const renderer = path.resolve(__dirname, "../../video-generator/article-to-video.mjs");
    exec(`node "${renderer}" "${outPath}" "${videoOut}"`, {
      stdio: "inherit",
      cwd:   path.dirname(renderer),
    });
  } else {
    const mdDir   = path.dirname(path.resolve(MD_PATH));
    const videoOut = OUT_VIDEO || path.join(mdDir, `${slug}.mp4`);
    console.log(`\nNext step:`);
    console.log(`  node article-to-video.mjs "${outPath}" "${videoOut}"`);
    console.log(`\nOr in one command:`);
    console.log(`  node md-to-article-html.mjs "${MD_PATH}" --render --no-cta`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
