import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AnthropicVertex from "./node_modules/@anthropic-ai/vertex-sdk/index.js";
import { stabilizeVideoSvgMarkup } from "./video-deco-presets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const HTML_PATH = args.find((arg) => !arg.startsWith("--"));
const EVIDENCE_PATH = args.find((arg) => arg.startsWith("--evidence="))?.split("=")[1];
const OUT_DIR_ARG = args.find((arg) => arg.startsWith("--out-dir="))?.split("=")[1];
const OUT_HTML_ARG = args.find((arg) => arg.startsWith("--out-html="))?.split("=")[1];
const ONLY_BEAT = args.find((arg) => arg.startsWith("--only-beat="))?.split("=")[1];
const WRITE_TEMPLATE = args.includes("--write-evidence-template");
const AUTO_EVIDENCE = args.includes("--auto-evidence") || !EVIDENCE_PATH;
const MAX_ATTEMPTS = Number(args.find((arg) => arg.startsWith("--max-attempts="))?.split("=")[1] || 2);

if (!HTML_PATH) {
  console.error("Usage: node deco-pipeline.mjs <article.source.html> [--evidence=file.json] [--out-dir=dir] [--out-html=file.html] [--only-beat=id] [--write-evidence-template]");
  process.exit(1);
}

const htmlAbsPath = path.resolve(HTML_PATH);
if (!fs.existsSync(htmlAbsPath)) {
  console.error(`Not found: ${htmlAbsPath}`);
  process.exit(1);
}

function readEnvFile() {
  try {
    const raw = fs.readFileSync(path.join(process.env.HOME, ".claude/.env"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) env[match[1].trim()] = match[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const dotenv = readEnvFile();
const PROJECT = process.env.ANTHROPIC_VERTEX_PROJECT_ID || dotenv.ANTHROPIC_VERTEX_PROJECT_ID;
const REGION = process.env.CLOUD_ML_REGION || dotenv.CLOUD_ML_REGION || "europe-west1";
const MODEL = process.env.ANTHROPIC_MODEL || dotenv.ANTHROPIC_MODEL || "claude-sonnet-4-6@20251101";

if (!PROJECT) {
  console.error("ANTHROPIC_VERTEX_PROJECT_ID not set. Check ~/.claude/.env");
  process.exit(1);
}

const vertexClient = new AnthropicVertex({ projectId: PROJECT, region: REGION });

async function callClaude(systemPrompt, userContent, maxTokens = 4096) {
  const msg = await vertexClient.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });
  return msg.content[0].text.trim();
}

function stripFences(raw) {
  return raw.replace(/^```(?:json|svg)?\n?/, "").replace(/\n?```$/, "").trim();
}

function parseJson(raw) {
  return JSON.parse(stripFences(raw));
}

function extractSvg(raw) {
  const cleaned = stripFences(raw);
  const match = cleaned.match(/<svg[\s\S]*<\/svg>/i);
  if (match) {
    return stabilizeVideoSvgMarkup(match[0].trim());
  }
  const shapes = cleaned.match(/<(rect|path|circle|ellipse|line|polyline|polygon|g)\b[\s\S]*/i);
  if (shapes) {
    return stabilizeVideoSvgMarkup(`<svg class="deco-svg" viewBox="0 0 420 420" aria-hidden="true" focusable="false">\n${shapes[0].trim()}\n</svg>`);
  }
  throw new Error("No SVG found in model response");
}

function htmlToText(raw) {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(strong|em|span)[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function slugMetaFromHtmlPath(filePath) {
  const base = path.basename(filePath, ".html").replace(/\.(source|decorated)$/, "");
  const match = base.match(/^article_(.+)__([^_][\s\S]*)$/);
  if (!match) {
    throw new Error(`Unexpected article html filename: ${base}`);
  }
  return { series: match[1], slug: match[2] };
}

function extractOpening(html) {
  const match = html.match(
    /<div class="beat opening"[\s\S]*?<div class="series-tag">([\s\S]*?)<\/div>[\s\S]*?<div class="main-title">([\s\S]*?)<\/div>[\s\S]*?<div class="subtitle">([\s\S]*?)<\/div>[\s\S]*?<div class="date-range">([\s\S]*?)<\/div>/,
  );
  if (!match) return null;
  return {
    seriesTag: htmlToText(match[1]),
    mainTitle: htmlToText(match[2]),
    subtitle: htmlToText(match[3]),
    dateRange: htmlToText(match[4]),
  };
}

function extractContentBeats(html) {
  const beats = [];
  const regex =
    /<div class="beat" data-id="([^"]+)" data-type="content" style="--c:([^;]+);">[\s\S]*?<div class="epoch">([\s\S]*?)<\/div>[\s\S]*?<div class="headline">([\s\S]*?)<\/div>\s*<div class="body">([\s\S]*?)<\/div>[\s\S]*?<div class="deco" style="color:[^"]+;">([\s\S]*?)<\/div>\s*<div class="footer">/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    beats.push({
      id: match[1],
      color: match[2].trim(),
      epoch: htmlToText(match[3]),
      headline: htmlToText(match[4]),
      bodyText: htmlToText(match[5]),
      bodyHtml: match[5].trim(),
      currentDeco: match[6].trim(),
    });
  }
  return beats;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function ensureEvidenceTemplate(series, slug, beats, outDir) {
  const templatePath =
    EVIDENCE_PATH
    ? path.resolve(EVIDENCE_PATH)
    : path.join(outDir, "evidence.template.json");
  const template = {
    article: {
      series,
      slug,
      notebook_id: "",
      notebook_context: "Fill this file with NotebookLM-backed evidence per beat before running the article deco pipeline.",
    },
    beats: Object.fromEntries(
      beats.map((beat) => [
        beat.id,
        {
          mechanism: "",
          entities: [],
          relationships: [],
          failure_mode: "",
          visual_avoid: [],
          fact_anchor: [],
        },
      ]),
    ),
  };
  writeJson(templatePath, template);
  console.log(`✓ Evidence template written: ${templatePath}`);
}

const BRIEF_SYSTEM = `You are an editorial motion designer for 5Sigmas.

Your job is not to decorate. Your job is to convert a video beat into a concise visual brief for a 420x420 right-side SVG panel.

Return ONLY valid JSON with this schema:
{
  "core_concept": "string",
  "mechanism": "string",
  "best_visual_metaphor": "string",
  "abstraction_level": "physical|diagrammatic|hybrid",
  "entities": ["string"],
  "relationships": ["string"],
  "motion": ["string"],
  "layout": {
    "composition": "string",
    "focus": "string",
    "depth": "string"
  },
  "wrong_visuals": ["string"],
  "svg_plan": {
    "main_shape": "string",
    "secondary_shapes": ["string"],
    "connectors": ["string"],
    "panel_usage": "string"
  }
}

Rules:
- Prefer mechanism over icon.
- Prefer flows, matrices, anchors, mismatches, routing, ladders, loops or comparisons over generic pictograms.
- If the beat is about noisy alignment, show misalignment or weak coupling.
- If the beat is about preference tuning, show a choice loop, not a truth source.
- Keep the brief specific to the beat, not to the series in general.`;

const SVG_SYSTEM = `You generate SVG microdiagrams for 5Sigmas videos.

Output ONLY a valid inline SVG with viewBox="0 0 420 420".

Hard constraints:
- Dark editorial panel, sober and geometric.
- Avoid large text. Use labels only when they materially disambiguate the mechanism.
- Prefer 0-4 labels. Never exceed 6 short labels.
- If you use labels, they must remain comfortably legible in the final video frame.
- Keep the active diagram content inside a safe box roughly bounded by x=92..328 and y=118..302.
- Do not place labels or marks so close to the border that they risk clipping.
- At most 4 main elements.
- At most 2 subtle animated ideas, expressed by using these existing classes only:
  anim-fade, anim-pop, anim-draw
- Use these style classes only:
  deco-panel-glow, deco-panel, deco-grid, deco-frame,
  deco-stroke, deco-stroke--soft, deco-stroke--thin,
  deco-fill, deco-fill--soft, deco-fill--strong, deco-node
- Do not include <style> blocks.
- Do not reference gradients, filters or markers unless you also define them inside a <defs> block.
- Always include the shared panel shell as the first elements:
  1. rect.deco-panel-glow
  2. rect.deco-panel
  3. path.deco-grid
  4. path.deco-frame
- The SVG must explain the beat concept, not decorate it.
- Avoid clipart, mascots, emojis, shields, rockets, chips or globes unless they are literally the mechanism.

Use the panel shell coordinates exactly:
<rect class="deco-panel-glow anim-fade" x="26" y="58" width="368" height="304" rx="44" />
<rect class="deco-panel anim-fade" x="48" y="78" width="324" height="264" rx="36" />
<path class="deco-grid anim-fade" d="M92 126H328M92 192H328M92 258H328M126 108V312M210 108V312M294 108V312" />
<path class="deco-frame anim-fade" d="M82 110H132M82 110V160M338 110H288M338 110V160M82 310H132M82 310V260M338 310H288M338 310V260" />`;

const REVIEW_SYSTEM = `You are reviewing an SVG microdiagram for a 5Sigmas video beat.

Return ONLY valid JSON:
{
  "scores": {
    "fidelity": 0,
    "specificity": 0,
    "causality": 0,
    "cleanliness": 0,
    "motion": 0,
    "anti_cliche": 0
  },
  "defects": ["string"],
  "exact_changes": ["string"],
  "keep_or_regenerate": "keep|regenerate"
}

Rules:
- Penalize generic pictograms hard.
- Penalize visuals that explain the wrong thing.
- Penalize overbusy diagrams.
- Penalize labels that are too small to read comfortably in the rendered frame.
- Penalize any element that escapes the safe panel area or visually crowds the border.
- Penalize SVGs that rely on too many labels or data callouts to explain themselves.
- Penalize SVGs that could fit another beat with minor noun swaps.`;

const EVIDENCE_SYSTEM = `You are extracting visual evidence for a 5Sigmas video beat.

Return ONLY valid JSON:
{
  "mechanism": "string",
  "entities": ["string"],
  "relationships": ["string"],
  "failure_mode": "string",
  "visual_avoid": ["string"],
  "fact_anchor": ["string"]
}

Rules:
- Focus on what the beat is actually explaining.
- Prefer mechanisms, bottlenecks, mismatches, flows, anchors, trade-offs or evaluation structure over generic topic summaries.
- If no precise external evidence is available, stay faithful to the beat copy and do not invent numbers.
- visual_avoid must name 2-3 bad metaphors that would weaken the diagram.`;

const EVIDENCE_BRIEF_SYSTEM = `You are preparing a 5Sigmas microdiagram pipeline for one video beat.

Return ONLY valid JSON:
{
  "evidence": {
    "mechanism": "string",
    "entities": ["string"],
    "relationships": ["string"],
    "failure_mode": "string",
    "visual_avoid": ["string"],
    "fact_anchor": ["string"]
  },
  "brief": {
    "core_concept": "string",
    "mechanism": "string",
    "best_visual_metaphor": "string",
    "abstraction_level": "physical|diagrammatic|hybrid",
    "entities": ["string"],
    "relationships": ["string"],
    "motion": ["string"],
    "layout": {
      "composition": "string",
      "focus": "string",
      "depth": "string"
    },
    "wrong_visuals": ["string"],
    "svg_plan": {
      "main_shape": "string",
      "secondary_shapes": ["string"],
      "connectors": ["string"],
      "panel_usage": "string"
    }
  }
}

Rules:
- evidence and brief must stay tightly aligned.
- Prefer mechanism over topic labels.
- Prefer editorial diagrams over generic icons.
- If facts are not explicit in the beat copy, do not invent them.`;

function lintSvg(svg) {
  const issues = [];
  const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
  const textNodes = [...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi)];

  if (!svg.includes('class="deco-svg"')) {
    issues.push("SVG root is missing class=\"deco-svg\".");
  }
  if (!svg.includes("deco-panel-glow") || !svg.includes("deco-panel") || !svg.includes("deco-grid") || !svg.includes("deco-frame")) {
    issues.push("SVG is missing part of the shared panel shell.");
  }
  if (/<style[\s\S]*?<\/style>/i.test(svg)) {
    issues.push("SVG contains an inline <style> block; use shared classes and presentation attributes instead.");
  }
  if (/class="[^"]*"[^>]*\bclass="/i.test(svg)) {
    issues.push("SVG contains duplicate class attributes on at least one element.");
  }
  for (const ref of refs) {
    if (!ids.has(ref)) {
      issues.push(`SVG references url(#${ref}) but does not define id="${ref}".`);
    }
  }

  if (textNodes.length > 6) {
    issues.push(`SVG uses ${textNodes.length} text labels; keep labels to 6 or fewer.`);
  }

  for (const [, attrs, text] of textNodes) {
    const fontSizeAttr = attrs.match(/\bfont-size=["']?([0-9.]+)/i)?.[1];
    const fontSizeStyle = attrs.match(/font-size:\s*([0-9.]+)px/i)?.[1];
    const fontSize = Number(fontSizeAttr || fontSizeStyle || 0);
    const trimmed = String(text || "").replace(/<[^>]+>/g, "").trim();
    if (trimmed && fontSize && fontSize < 8) {
      issues.push(`Text label "${trimmed.slice(0, 24)}" uses font-size ${fontSize}; raise it to at least 8.`);
    }
  }

  return issues;
}

function buildBriefPrompt({ article, beat, evidence }) {
  return `ARTICLE
- Series: ${article.series}
- Slug: ${article.slug}
- Title: ${article.mainTitle}

BEAT
- ID: ${beat.id}
- Epoch: ${beat.epoch}
- Headline: ${beat.headline}
- Body:
${beat.bodyText}

NOTEBOOK EVIDENCE
${JSON.stringify(evidence, null, 2)}

Produce the visual brief JSON.`;
}

function buildEvidencePrompt({ article, beat, notebookId = "" }) {
  return `ARTICLE
- Series: ${article.series}
- Slug: ${article.slug}
- Title: ${article.mainTitle}
- Notebook ID: ${notebookId || "unknown"}

BEAT
- ID: ${beat.id}
- Epoch: ${beat.epoch}
- Headline: ${beat.headline}
- Body:
${beat.bodyText}

Extract the evidence JSON.`;
}

function buildEvidenceBriefPrompt({ article, beat, notebookId = "" }) {
  return `ARTICLE
- Series: ${article.series}
- Slug: ${article.slug}
- Title: ${article.mainTitle}
- Notebook ID: ${notebookId || "unknown"}

BEAT
- ID: ${beat.id}
- Epoch: ${beat.epoch}
- Headline: ${beat.headline}
- Body:
${beat.bodyText}

Prepare the combined evidence and brief JSON.`;
}

function buildSvgPrompt({ article, beat, brief }) {
  return `ARTICLE
- Series: ${article.series}
- Slug: ${article.slug}

BEAT
- ID: ${beat.id}
- Headline: ${beat.headline}
- Epoch: ${beat.epoch}

VISUAL BRIEF
${JSON.stringify(brief, null, 2)}

Generate the SVG now.`;
}

function buildReviewPrompt({ beat, evidence, brief, svg }) {
  return `BEAT
- ID: ${beat.id}
- Headline: ${beat.headline}
- Body:
${beat.bodyText}

NOTEBOOK EVIDENCE
${JSON.stringify(evidence, null, 2)}

VISUAL BRIEF
${JSON.stringify(brief, null, 2)}

SVG
${svg}

Review the SVG.`;
}

function buildRefinePrompt({ beat, brief, review, svg, lintIssues = [] }) {
  return `BEAT
- ID: ${beat.id}
- Headline: ${beat.headline}

VISUAL BRIEF
${JSON.stringify(brief, null, 2)}

CURRENT SVG
${svg}

FIXES REQUIRED
${JSON.stringify(review.exact_changes, null, 2)}

DEFECTS
${JSON.stringify(review.defects, null, 2)}

SVG LINT
${JSON.stringify(lintIssues, null, 2)}

Regenerate the SVG applying those fixes and preserving the shared panel shell.`;
}

function mergeReviewWithLint(review, lintIssues) {
  if (!lintIssues.length) return review;
  return {
    ...review,
    defects: [...(review.defects || []), ...lintIssues],
    exact_changes: [
      ...(review.exact_changes || []),
      ...lintIssues.map((issue) => `Fix lint issue: ${issue}`),
    ],
    keep_or_regenerate: "regenerate",
  };
}

function reviewNeedsRegeneration(review, lintIssues = []) {
  return review.keep_or_regenerate === "regenerate" || lintIssues.length > 0;
}

function patchHtmlWithBeatSvgs(html, beatSvgs) {
  let nextHtml = html;
  for (const [beatId, svg] of Object.entries(beatSvgs)) {
    const beatPattern = new RegExp(
      `(<div class="beat" data-id="${beatId}" data-type="content"[\\s\\S]*?<div class="deco" style="color:[^"]+;">)([\\s\\S]*?)(</div>\\s*<div class="footer">)`,
      "g",
    );
    nextHtml = nextHtml.replace(beatPattern, `$1\n    <div class="deco-scene">\n${svg}\n    </div>\n  $3`);
  }
  return nextHtml;
}

async function main() {
  const html = fs.readFileSync(htmlAbsPath, "utf8");
  const { series, slug } = slugMetaFromHtmlPath(htmlAbsPath);
  const opening = extractOpening(html);
  const beats = extractContentBeats(html);

  if (!opening) {
    throw new Error("Could not extract opening metadata from article HTML");
  }
  if (!beats.length) {
    throw new Error("Could not extract content beats from article HTML");
  }

  const outDir = OUT_DIR_ARG
    ? path.resolve(OUT_DIR_ARG)
    : path.join(__dirname, "deco", series, slug);
  const outHtml = OUT_HTML_ARG
    ? path.resolve(OUT_HTML_ARG)
    : path.join(
      path.dirname(htmlAbsPath),
      path.basename(htmlAbsPath, ".html").endsWith(".source")
        ? `${path.basename(htmlAbsPath, ".html").replace(/\.source$/, "")}.html`
        : `${path.basename(htmlAbsPath, ".html")}.decorated.html`,
    );

  if (WRITE_TEMPLATE) {
    ensureEvidenceTemplate(series, slug, beats, outDir);
    return;
  }

  const evidence = AUTO_EVIDENCE
    ? {
        article: {
          series,
          slug,
          notebook_id: "",
          notebook_context: "Auto-generated from beat copy. Replace with NotebookLM-backed evidence for higher factual specificity when needed.",
        },
        beats: {},
      }
    : JSON.parse(fs.readFileSync(path.resolve(EVIDENCE_PATH), "utf8"));
  const article = {
    series,
    slug,
    mainTitle: opening.mainTitle,
    subtitle: opening.subtitle,
    dateRange: opening.dateRange,
  };

  const targetBeats = ONLY_BEAT
    ? beats.filter((beat) => beat.id === ONLY_BEAT)
    : beats;

  if (ONLY_BEAT && !targetBeats.length) {
    throw new Error(`Beat not found: ${ONLY_BEAT}`);
  }

  const manifest = {
    article,
    evidence_path: EVIDENCE_PATH ? path.resolve(EVIDENCE_PATH) : path.join(outDir, "evidence.auto.json"),
    generated_at: new Date().toISOString(),
    beats: {},
  };
  const beatSvgs = {};

  for (const beat of targetBeats) {
    const beatEvidence = evidence.beats?.[beat.id];
    let resolvedEvidence = beatEvidence;

    const beatDir = path.join(outDir, beat.id);
    fs.mkdirSync(beatDir, { recursive: true });

    writeText(path.join(beatDir, "copy.txt"), `HEADLINE\n${beat.headline}\n\nBODY\n${beat.bodyText}\n`);
    writeText(path.join(beatDir, "before.html"), beat.currentDeco);
    let brief;
    if (!resolvedEvidence) {
      console.log(`\n[deco] ${beat.id} -> evidence+brief`);
      const combined = parseJson(
        await callClaude(
          EVIDENCE_BRIEF_SYSTEM,
          buildEvidenceBriefPrompt({
            article,
            beat,
            notebookId: evidence.article?.notebook_id || "",
          }),
          3072,
        ),
      );
      resolvedEvidence = combined.evidence;
      brief = combined.brief;
      evidence.beats[beat.id] = resolvedEvidence;
    } else {
      console.log(`\n[deco] ${beat.id} -> brief`);
      brief = parseJson(await callClaude(BRIEF_SYSTEM, buildBriefPrompt({ article, beat, evidence: resolvedEvidence })));
    }
    writeJson(path.join(beatDir, "evidence.json"), resolvedEvidence);
    writeJson(path.join(beatDir, "brief.json"), brief);

    let finalSvg = extractSvg(await callClaude(SVG_SYSTEM, buildSvgPrompt({ article, beat, brief }), 4096));
    writeText(path.join(beatDir, "draft.svg"), `${finalSvg}\n`);

    let finalReview = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const lintIssues = lintSvg(finalSvg);
      console.log(`[deco] ${beat.id} -> review${attempt ? ` #${attempt + 1}` : ""}`);
      const rawReview = parseJson(await callClaude(REVIEW_SYSTEM, buildReviewPrompt({ beat, evidence: resolvedEvidence, brief, svg: finalSvg }), 2048));
      const review = mergeReviewWithLint(rawReview, lintIssues);
      writeJson(path.join(beatDir, attempt ? `review.${attempt + 1}.json` : "review.json"), review);
      finalReview = review;

      if (!reviewNeedsRegeneration(review, lintIssues)) {
        break;
      }
      if (attempt === MAX_ATTEMPTS - 1) {
        break;
      }

      console.log(`[deco] ${beat.id} -> refine${attempt ? ` #${attempt + 1}` : ""}`);
      finalSvg = extractSvg(
        await callClaude(
          SVG_SYSTEM,
          buildRefinePrompt({ beat, brief, review, svg: finalSvg, lintIssues }),
          4096,
        ),
      );
      writeText(path.join(beatDir, attempt ? `refined.${attempt + 1}.svg` : "refined.svg"), `${finalSvg}\n`);
    }

    writeText(path.join(beatDir, "final.svg"), `${finalSvg}\n`);
    beatSvgs[beat.id] = finalSvg;
    manifest.beats[beat.id] = {
      headline: beat.headline,
      epoch: beat.epoch,
      score_total: Object.values(finalReview?.scores || {}).reduce((sum, value) => sum + Number(value || 0), 0),
      review: finalReview,
      files: {
        evidence: path.join(beatDir, "evidence.json"),
        brief: path.join(beatDir, "brief.json"),
        draft_svg: path.join(beatDir, "draft.svg"),
        final_svg: path.join(beatDir, "final.svg"),
      },
    };
  }

  const nextHtml = patchHtmlWithBeatSvgs(html, beatSvgs);
  writeText(outHtml, nextHtml);
  if (AUTO_EVIDENCE) {
    writeJson(path.join(outDir, "evidence.auto.json"), evidence);
  }
  writeJson(path.join(outDir, "manifest.json"), manifest);

  console.log(`\n✓ Decorated HTML written: ${outHtml}`);
  console.log(`✓ Manifest written: ${path.join(outDir, "manifest.json")}`);
}

main().catch((error) => {
  console.error(`[deco] ${error.message}`);
  process.exit(1);
});
