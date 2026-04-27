/**
 * md-series-to-html.mjs
 *
 * Generates a series presentation video: opening + 1 beat per article + no CTA.
 * Reads the series directory, calls Claude once with all articles, renders HTML.
 *
 * Usage:
 *   node md-series-to-html.mjs <series-dir> [output.html] [--render]
 *
 * Examples:
 *   node md-series-to-html.mjs ../docs/series/from-cave-to-agi
 *   node md-series-to-html.mjs ../docs/series/from-cave-to-agi --render
 *
 * Output:
 *   HTML: videos/series_<name>.html  (intermediate)
 *   MP4:  <series-dir>/00_presentacion_serie.mp4
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AnthropicVertex from "./node_modules/@anthropic-ai/vertex-sdk/index.js";
import { renderVideoDeco, videoDecoStyles } from "./video-deco-presets.mjs";
import { resolveSeriesVideoMood, videoMoodStyles } from "./video-moods.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const SERIES_DIR = args.find(a => !a.startsWith("--"));
const OUT_HTML   = args.filter(a => !a.startsWith("--"))[1];
const DO_RENDER  = args.includes("--render");
const OUT_VIDEO  = args.find(a => a.startsWith("--out="))?.split("=")[1];

if (!SERIES_DIR) {
  console.error("Usage: node md-series-to-html.mjs <series-dir> [output.html] [--render] [--mood=name]");
  process.exit(1);
}
if (!fs.existsSync(SERIES_DIR)) {
  console.error(`Not found: ${SERIES_DIR}`);
  process.exit(1);
}

const seriesName = path.basename(path.resolve(SERIES_DIR));
const VIDEO_MOOD = args.find(a => a.startsWith("--mood="))?.split("=")[1]
  || resolveSeriesVideoMood(seriesName, { role: "series" });
const outPath    = OUT_HTML || path.join(__dirname, `series_${seriesName}.html`);

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

if (!PROJECT) {
  console.error("ANTHROPIC_VERTEX_PROJECT_ID not set. Check ~/.claude/.env");
  process.exit(1);
}

const vertexClient = new AnthropicVertex({ projectId: PROJECT, region: REGION });

// ─── Brand palette ────────────────────────────────────────────────────────────
const COLORS = ["#26A69A", "#FFB343", "#7cc7ff", "#26A69A", "#FFB343", "#7cc7ff", "#26A69A", "#FFB343"];

// ─── Primary deco per article (first symbol of each chapter's pool) ───────────
// Keep in sync with DECO_POOLS in md-to-article-html.mjs
const CHAPTER_DECO = {
  "01-representar":           "0",
  "02-mecanizar":             "⚙",
  "03-aprender":              "⊞",
  "04-escalar":               "⑂",
  "05-mas-alla":              "→",
  "01-que-es-ia":             "→",
  "02-que-es-ia-generativa":  "∑",
  "03-ia-vs-ia-generativa":   "≠",
  "04-agi":                   "▲",
  "01-el-problema":           "◎",
  "02-alineamiento":          "⟷",
  "03-arquitecturas":         "⚡",
  "04-evaluacion":            "⚠",
  "05-riesgos":               "↺",
};

// ─── Parse markdown (minimal: frontmatter + first paragraphs) ─────────────────
function parseMarkdown(raw) {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const [k, ...v] = line.split(":");
      if (k && v.length) fm[k.trim()] = v.join(":").trim().replace(/^"|"$/g, "");
    }
  }
  let body = raw.replace(/^---[\s\S]*?---\n/, "");
  body = body.replace(/\{\{.*?\}\}/g, "");
  body = body.replace(/<details[\s\S]*?<\/details>/gi, "");
  body = body.replace(/^!!! \w+.*\n(    .*\n)*/gm, "");
  body = body.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  body = body.replace(/## Preguntas frecuentes[\s\S]*$/i, "");
  body = body.replace(/## \d+\. Referencias[\s\S]*$/i, "");
  body = body.replace(/## Referencias[\s\S]*$/i, "");
  body = body.replace(/^---+$/gm, "");
  body = body.replace(/\n{3,}/g, "\n\n").trim();
  // For series reel: only first 1500 chars per article (enough context, saves tokens)
  return { fm, body: body.slice(0, 1500) };
}

// ─── Discover & load articles ─────────────────────────────────────────────────
function loadSeries(seriesDir) {
  const files = fs.readdirSync(seriesDir)
    .filter(f => f.endsWith(".md") && !f.startsWith("index"))
    .sort();

  const presentation = files.find(f => f.startsWith("00_"));
  const articles     = files.filter(f => !f.startsWith("00_") && !f.startsWith("index"));

  const presentationData = presentation
    ? parseMarkdown(fs.readFileSync(path.join(seriesDir, presentation), "utf8"))
    : { fm: {}, body: "" };

  const articleData = articles.map(f => {
    const { fm, body } = parseMarkdown(fs.readFileSync(path.join(seriesDir, f), "utf8"));
    return { slug: path.basename(f, ".md"), fm, body };
  });

  return { presentationData, articleData };
}

// ─── Claude prompt for series reel ───────────────────────────────────────────
const SYSTEM_PROMPT = `You are a video editor for 5Sigmas, a Spanish channel about AI history.
Transform a multi-article series into a series presentation video structure in JSON.

This is a SERIES OVERVIEW video — it appears on the series landing page to introduce ALL chapters.
There is NO CTA beat (the viewer is already on the page).

STRUCTURE:
- opening: series title card
- beats: exactly ONE beat per article, in order. No more, no less.
- Each beat summarizes ONE chapter's core idea in a punchy, cinematic way.

BEAT RULES (same as article beats):
- headline: MAX 7 words, sentence-fragment, striking paradox or observation. In Spanish.
- body: TWO paragraphs separated by <br><br>. TOTAL 28–38 words (shorter than article beats — this is a teaser).
  - P1 (16–22 words): context, what the chapter is about
  - P2 (12–18 words): the key punchline. End with <strong style="color:#f0f4ff;">key concept</strong>
- epoch: location · period matching the chapter's historical setting
- deco: use EXACTLY the symbol specified per article in the user message — do not change it
- deco_color: rotate strictly through #26A69A | #FFB343 | #7cc7ff — no two consecutive same
- divider_color: same palette, always different from deco_color of that beat
- id: "0N_<shortname>" (e.g. "02_cero", "03_algoritmo")

OPENING:
- series_tag: full series name (e.g. "De la cueva a la AGI")
- main_title: short series title (1–3 words max, punchy)
- subtitle: one-line description of what the series covers
- date_range: full time span covered by the series

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
      "id": "0N_shortname",
      "chapter": "string (chapter title for reference)",
      "epoch": "string",
      "headline": "string",
      "body": "string (HTML inline allowed)",
      "deco": "string",
      "deco_color": "string",
      "divider_color": "string"
    }
  ]
}`;

async function callClaude(userContent) {
  const msg = await vertexClient.messages.create({
    model:      MODEL,
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: userContent }],
  });
  return msg.content[0].text;
}

// ─── Render HTML ──────────────────────────────────────────────────────────────
function renderHTML(beatsJson) {
  const { opening, beats } = beatsJson;
  const scopeKey = `series:${seriesName}`;

  const footer_label = opening.series_tag || seriesName;
  const openDecoColor = opening.deco_color || "#26A69A";
  const openDeco      = opening.deco || "5σ";
  const openingDeco = renderVideoDeco({
    scopeKey,
    beatId: "01_opening",
    beatType: "opening",
    headline: opening.main_title,
    glyph: openDeco,
  });

  const beatBlocks = beats.map((b, i) => {
    const id   = b.id || `0${i+2}_beat`;
    const dc   = b.deco_color   || COLORS[i % COLORS.length];
    const divc = b.divider_color || COLORS[(i + 1) % COLORS.length];
    const chapterLabel = b.chapter ? ` · ${b.chapter}` : "";
    const deco = renderVideoDeco({
      scopeKey,
      beatId: id,
      beatType: "content",
      beatIndex: i,
      headline: b.headline,
      glyph: b.deco || "",
    });
    return `\n<!-- ═══ BEAT ${i+2} — ${id} ════════════════════════════════════════════ -->
<div class="beat" data-id="${id}" data-type="content" style="--c:${dc};">
  <div class="accent-bar"></div>
  <div class="beat-inner">
    <div class="epoch">${b.epoch}</div>
    <div class="divider" style="background:${divc};"></div>
    <div class="headline">${b.headline.replace(/\\n/g, "<br>")}</div>
    <div class="body">${b.body}</div>
  </div>
  <div class="deco" style="color:${dc};">${deco}</div>
  <div class="footer">
    <span class="footer-label">${footer_label}${chapterLabel}</span>
    <span class="footer-logo">5σ</span>
  </div>
</div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Series Video — ${opening.series_tag}</title>
<style>
  /* Generated by md-series-to-html.mjs */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0b1220; }

  @font-face { font-family: "Avenir Next"; }
  body { font-family: "Avenir Next","Avenir","Segoe UI","Helvetica Neue",Arial,sans-serif; color: #f0f4ff; }

  .beat {
    --c: #26A69A;
    width: 1920px; height: 1080px;
    display: none; flex-direction: column;
    background: #0b1220; position: relative; overflow: hidden;
  }
  .beat.active { display: flex; }

  .beat::before {
    content: ''; position: absolute; bottom: -80px; right: -80px;
    width: 720px; height: 720px; border-radius: 50%;
    background: radial-gradient(circle, var(--c) 0%, transparent 68%);
    opacity: .06; pointer-events: none;
  }
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
${videoDecoStyles()}
${videoMoodStyles(VIDEO_MOOD)}

  /* Opening */
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

  /* Content beats */
  .epoch {
    font-size: 15px; font-weight: 700; letter-spacing: .18em;
    text-transform: uppercase; color: var(--c); margin-bottom: 40px;
  }
  .divider { width: 48px; height: 4px; border-radius: 2px; margin-bottom: 48px; }
  .headline {
    font-size: 88px; font-weight: 800; line-height: 1.05;
    letter-spacing: -.02em; color: #f0f4ff; margin-bottom: 48px; max-width: 1080px;
  }
  .body {
    font-size: 28px; font-weight: 400; line-height: 1.55;
    color: rgba(240,244,255,.75); max-width: 900px;
  }
</style>
</head>
<body data-video-mood="${VIDEO_MOOD}">

<!-- ═══ BEAT 1 — Opening ═══════════════════════════════════════════════════ -->
<div class="beat opening" data-id="01_opening" data-type="opening" style="--c:${openDecoColor};">
  <div class="accent-bar"></div>
  <div class="beat-inner">
    <div class="series-tag">${opening.series_tag}</div>
    <div class="main-title">${opening.main_title}</div>
    <div class="subtitle">${opening.subtitle}</div>
    <div class="date-range">${opening.date_range}</div>
  </div>
  <div class="deco" style="color:${openDecoColor};">${openingDeco}</div>
  <div class="footer">
    <span class="footer-label">${footer_label}</span>
    <span class="footer-logo">5σ</span>
  </div>
</div>
${beatBlocks}

</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const seriesDir = path.resolve(SERIES_DIR);
  console.log(`\nLoading series: ${seriesName}`);

  const { presentationData, articleData } = loadSeries(seriesDir);

  if (articleData.length === 0) {
    console.error("No articles found (files starting with 00_ or named index.md are excluded)");
    process.exit(1);
  }

  const seriesTitle = presentationData.fm.title || seriesName;
  console.log(`  Series: ${seriesTitle}`);
  console.log(`  Articles: ${articleData.length}`);
  articleData.forEach(a => console.log(`    - ${a.slug}: ${a.fm.title || "(no title)"}`));

  // Build user prompt: series description + all articles summary
  const articlesBlock = articleData.map((a, i) => {
    const deco = CHAPTER_DECO[a.slug] || "·";
    return `--- Article ${i+1}: ${a.slug} ---
Title: ${a.fm.title || a.slug}
Description: ${a.fm.description || ""}
Date: ${a.fm.date || ""}
Deco symbol for this beat: ${deco}
Body excerpt:
${a.body}
`;
  }).join("\n");

  const userContent = `Series name: ${seriesTitle}
Series description: ${presentationData.fm.description || ""}

This series has ${articleData.length} articles. Generate exactly ${articleData.length} content beats (one per article), in order.
Each beat's "deco" field must use the exact symbol specified for that article — do not change or invent.

${articlesBlock}

Generate the series video JSON as specified. All text must be in Spanish.`;

  console.log(`\nCalling Claude (${articleData.length} articles → ${articleData.length} beats)...`);

  let rawResponse;
  try {
    rawResponse = await callClaude(userContent);
  } catch (e) {
    console.error("Claude API error:", e.message);
    process.exit(1);
  }

  const jsonStr = rawResponse.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

  let beatsJson;
  try {
    beatsJson = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON from Claude response:");
    console.error(jsonStr.slice(0, 500));
    process.exit(1);
  }

  // Validate beat count
  if (beatsJson.beats.length !== articleData.length) {
    console.warn(`⚠ Claude returned ${beatsJson.beats.length} beats, expected ${articleData.length}. Proceeding anyway.`);
  }

  console.log(`\nBeats generated:`);
  console.log(`  Opening: ${beatsJson.opening.main_title}`);
  beatsJson.beats.forEach((b, i) =>
    console.log(`  Beat ${i+2}: [${b.id}] ${b.epoch} — ${b.headline.slice(0, 55)}`)
  );
  console.log(`  (no CTA — series landing page video)`);

  const html = renderHTML(beatsJson);
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`\n✓ HTML written: ${outPath}`);

  if (DO_RENDER) {
    const { execSync: exec } = await import("child_process");
    const videoOut = OUT_VIDEO || path.join(seriesDir, "00_presentacion_serie.mp4");
    console.log(`\nRendering video → ${videoOut}`);
    const renderer = path.resolve(__dirname, "../../video-generator/article-to-video.mjs");
    exec(`node "${renderer}" "${outPath}" "${videoOut}"`, {
      stdio: "inherit",
      cwd:   path.dirname(renderer),
    });
    console.log(`\n✓ Series video: ${videoOut}`);
  } else {
    const videoOut = OUT_VIDEO || path.join(seriesDir, "00_presentacion_serie.mp4");
    console.log(`\nNext step:`);
    console.log(`  node article-to-video.mjs "${outPath}" "${videoOut}"`);
    console.log(`\nOr in one command:`);
    console.log(`  node md-series-to-html.mjs "${SERIES_DIR}" --render`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
