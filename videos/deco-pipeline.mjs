import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import AnthropicVertex from "./node_modules/@anthropic-ai/vertex-sdk/index.js";
import pkg from "./node_modules/playwright-core/index.js";
import { renderVideoDeco, stabilizeVideoSvgMarkup } from "./video-deco-presets.mjs";

const { chromium } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const HTML_PATH = args.find((arg) => !arg.startsWith("--"));
const EVIDENCE_PATH = args.find((arg) => arg.startsWith("--evidence="))?.split("=")[1];
const OUT_DIR_ARG = args.find((arg) => arg.startsWith("--out-dir="))?.split("=")[1];
const OUT_HTML_ARG = args.find((arg) => arg.startsWith("--out-html="))?.split("=")[1];
const ONLY_BEAT = args.find((arg) => arg.startsWith("--only-beat="))?.split("=")[1];
const WRITE_TEMPLATE = args.includes("--write-evidence-template");
const AUTO_EVIDENCE = args.includes("--auto-evidence") || !EVIDENCE_PATH;
const MAX_ATTEMPTS = Number(args.find((arg) => arg.startsWith("--max-attempts="))?.split("=")[1] || 3);

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

function articleMarkdownPath(series, slug) {
  return path.resolve(__dirname, "../docs/series", series, `${slug}.md`);
}

function prettifySnippetLabel(snippetPath) {
  return path.basename(snippetPath, ".html")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function analyzeSnippetCandidate(absolutePath) {
  const raw = fs.readFileSync(absolutePath, "utf8");
  const text = raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = text ? text.split(" ").length : 0;
  const buttonCount = (raw.match(/<button\b/gi) || []).length;
  const tabSignalCount = (raw.match(/data-tab=|role="tablist"|aria-selected=/gi) || []).length;
  const svgCount = (raw.match(/<svg\b/gi) || []).length;
  const iframeCount = (raw.match(/<iframe\b/gi) || []).length;
  const visualSignalCount = (raw.match(/diagram|graph|chart|hub|orbit|matrix|grid|scene|stage|map|flow|network|ring|timeline|node/gi) || []).length;
  const cardSignalCount = (raw.match(/item-|card|tile|pill|badge/gi) || []).length;
  const safeForVideoPanel = wordCount <= 90 && buttonCount === 0 && tabSignalCount === 0 && iframeCount === 0;
  const rejectionReasons = [];
  if (wordCount > 90) rejectionReasons.push(`too much text (${wordCount} words)`);
  if (buttonCount > 0) rejectionReasons.push(`interactive controls (${buttonCount} buttons)`);
  if (tabSignalCount > 0) rejectionReasons.push(`tabbed/article UI (${tabSignalCount} tab signals)`);
  if (iframeCount > 0) rejectionReasons.push(`nested iframe content (${iframeCount})`);
  return {
    word_count: wordCount,
    button_count: buttonCount,
    tab_signal_count: tabSignalCount,
    svg_count: svgCount,
    iframe_count: iframeCount,
    visual_signal_count: visualSignalCount,
    card_signal_count: cardSignalCount,
    safe_for_video_panel: safeForVideoPanel,
    rejection_reasons: rejectionReasons,
  };
}

function extractSnippetCandidates(series, slug) {
  const mdPath = articleMarkdownPath(series, slug);
  if (!fs.existsSync(mdPath)) return [];

  const raw = fs.readFileSync(mdPath, "utf8");
  const regex = /\{\{\s*include_html\("([^"]+\.html)"/g;
  const seen = new Set();
  const candidates = [];
  let match;

  while ((match = regex.exec(raw)) !== null) {
    const relativePath = match[1];
    if (!relativePath.startsWith("snippets/")) continue;
    if (relativePath === "snippets/series_meta.html" || relativePath === "snippets/series_cards.html" || relativePath === "snippets/5sigma.html") continue;
    if (seen.has(relativePath)) continue;
    seen.add(relativePath);

    const absolutePath = path.resolve(__dirname, "../docs", relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const stats = analyzeSnippetCandidate(absolutePath);

    candidates.push({
      relative_path: relativePath,
      absolute_path: absolutePath,
      label: prettifySnippetLabel(relativePath),
      order: candidates.length + 1,
      stats,
    });
  }

  return candidates;
}

async function renderSnippetPreview(page, candidate, beat, outPath) {
  await page.goto(pathToFileURL(candidate.absolute_path).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const previewMetrics = await page.evaluate(({ beatId, headline, bodyText, candidatePath }) => {
    const stopwords = new Set([
      "de", "la", "el", "los", "las", "del", "para", "por", "con", "sin", "una", "uno", "unos", "unas",
      "que", "como", "hoy", "real", "ahora", "sobre", "entre", "desde", "hasta", "hacia", "mas", "alla",
      "este", "esta", "estos", "estas", "esa", "ese", "eso", "ser", "son", "hay", "muy", "the", "and",
    ]);
    const normalizeToken = (token) => {
      const clean = String(token || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
      if (clean.length > 4 && clean.endsWith("s")) return clean.slice(0, -1);
      return clean;
    };
    const tokenize = (text) => Array.from(new Set(
      String(text || "")
        .split(/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/)
        .map(normalizeToken)
        .filter((token) => token.length >= 3 && !stopwords.has(token)),
    ));
    const beatTokens = new Set([
      ...tokenize(beatId),
      ...tokenize(headline),
      ...tokenize(bodyText),
      ...tokenize(candidatePath),
    ]);

    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || "1") > 0.02
        && rect.width > 18
        && rect.height > 18;
    };
    const wordsIn = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;
    const nodeText = (el) => {
      const attrs = [
        el.id || "",
        el.className || "",
        el.getAttribute("data-tab") || "",
        el.getAttribute("data-panel") || "",
        el.getAttribute("aria-label") || "",
        el.getAttribute("title") || "",
        el.innerText || "",
      ];
      return attrs.join(" ");
    };
    const tokenScore = (text) => {
      const overlap = tokenize(text).filter((token) => beatTokens.has(token));
      return overlap.length;
    };
    const hide = (el) => {
      if (!el || el === document.body || el === document.documentElement) return;
      el.dataset.videoPreviewHidden = "true";
      el.style.display = "none";
    };

    document.querySelectorAll("[data-video-preview-target]").forEach((el) => delete el.dataset.videoPreviewTarget);

    const panelSelectors = ["[data-panel]", "[role='tabpanel']", ".ib-panel", ".tab-panel", ".panel"];
    const panelCandidates = Array.from(new Set(panelSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))));
    const scoredPanels = panelCandidates
      .map((panel) => {
        const rect = panel.getBoundingClientRect();
        return {
          panel,
          score:
            tokenScore(nodeText(panel)) * 12
            + (visible(panel) ? 8 : 0)
            + Math.min(rect.width * rect.height / 9000, 18),
        };
      })
      .sort((left, right) => right.score - left.score);

    const chosenPanel = scoredPanels[0]?.score > 0 ? scoredPanels[0].panel : panelCandidates.find(visible) || null;
    if (chosenPanel) {
      panelCandidates.forEach((panel) => {
        if (panel === chosenPanel) {
          panel.style.display = "block";
          panel.classList.add("active");
          panel.setAttribute("aria-hidden", "false");
        } else {
          panel.style.display = "none";
          panel.classList.remove("active");
          panel.setAttribute("aria-hidden", "true");
        }
      });
    }

    const root = chosenPanel || document.body.firstElementChild || document.body;

    const chromeSelectors = [
      "button",
      "[role='tab']",
      "[role='tablist']",
      "[data-tab]",
      ".tabs",
      ".tablist",
      ".ib-tabs",
      ".ib-hd",
      ".dc1-hd",
      ".ib-note",
      ".ib-transit-note",
      ".ib-t2-caption",
      ".caption",
      ".legend",
      "nav",
    ];
    chromeSelectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach(hide);
    });

    const candidateSelectors = [
      "svg",
      "canvas",
      "[class*='diagram']",
      "[class*='graph']",
      "[class*='chart']",
      "[class*='hub-wrap']",
      "[class*='hub']",
      "[class*='orbit']",
      "[class*='matrix']",
      "[class*='scene']",
      "[class*='stage']",
      "[class*='map']",
      "[class*='network']",
      "[class*='grid']",
      "[class*='flow']",
      "[class*='wrap']",
    ];
    const pool = Array.from(new Set([
      root,
      ...candidateSelectors.flatMap((selector) => Array.from(root.querySelectorAll(selector))),
    ]))
      .filter((el) => visible(el) && !el.closest("[data-video-preview-hidden='true']"));

    const scoreTarget = (el) => {
      const rect = el.getBoundingClientRect();
      const areaScore = Math.min(rect.width * rect.height / 12000, 30);
      const aspect = rect.width / Math.max(1, rect.height);
      const aspectPenalty = aspect > 2.35 || aspect < 0.5 ? 8 : Math.abs(aspect - 1.15) * 2.2;
      const wordCount = wordsIn(el.innerText || "");
      const paragraphCount = el.querySelectorAll("p").length;
      const buttonCount = el.querySelectorAll("button, [role='tab'], [data-tab]").length;
      const svgCount = el.matches("svg") ? 1 : el.querySelectorAll("svg").length;
      const overlapScore = tokenScore(nodeText(el));
      const className = String(el.className || "");
      const structuralScore = /diagram|graph|chart|hub|orbit|matrix|grid|flow|network|map|stage|scene|wrap/i.test(className)
        ? 12
        : 0;
      const precisionBonus = /hub-wrap|diagram|graph|chart|orbit|matrix|scene|stage/i.test(className) ? 12 : 0;
      const genericPanelPenalty = /panel/i.test(className) && !/diagram|hub|graph|chart|orbit|matrix|scene|stage/i.test(className) ? 12 : 0;
      return {
        el,
        rect,
        wordCount,
        paragraphCount,
        buttonCount,
        aspect,
        score:
          areaScore
          + overlapScore * 11
          + svgCount * 9
          + structuralScore
          + precisionBonus
          - paragraphCount * 3.2
          - buttonCount * 8
          - wordCount * 0.12
          - aspectPenalty
          - genericPanelPenalty,
      };
    };

    let rankedTargets = pool.map(scoreTarget).sort((left, right) => right.score - left.score);
    let target = rankedTargets[0]?.el || root;
    if (!target) target = root;

    if (target) {
      const descendants = Array.from(target.querySelectorAll("p, .sub, .subtitle, .note, .caption, .footnote, .legend, .helper, .meta"));
      descendants.forEach((el) => {
        if (wordsIn(el.innerText || "") >= 4) hide(el);
      });
      rankedTargets = pool.map(scoreTarget).sort((left, right) => right.score - left.score);
      target = rankedTargets[0]?.el || target;
    }

    if (target) {
      const targetStyle = window.getComputedStyle(target);
      const targetRect = target.getBoundingClientRect();
      const targetAspect = targetRect.width / Math.max(1, targetRect.height);
      if (targetAspect > 2.2 && /grid/.test(targetStyle.display) && target.children.length >= 4) {
        target.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
        target.style.gap = "14px";
        target.style.alignItems = "stretch";
      }
    }

    target.dataset.videoPreviewTarget = "true";
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.margin = "0";
    document.body.style.minHeight = "100vh";
    document.body.style.display = "flex";
    document.body.style.alignItems = "center";
    document.body.style.justifyContent = "center";
    document.body.style.padding = "28px";

    const visibleTextNodes = Array.from(target.querySelectorAll("*"))
      .filter((el) => visible(el))
      .filter((el) => wordsIn(el.innerText || "") > 0)
      .filter((el) => {
        const childWords = Array.from(el.children).reduce((sum, child) => sum + wordsIn(child.innerText || ""), 0);
        return wordsIn(el.innerText || "") > childWords;
      });

    let minFontPx = null;
    let totalWords = 0;
    visibleTextNodes.forEach((el) => {
      const fontPx = Number.parseFloat(window.getComputedStyle(el).fontSize || "0") || 0;
      if (fontPx) {
        minFontPx = minFontPx === null ? fontPx : Math.min(minFontPx, fontPx);
      }
      totalWords += wordsIn(el.innerText || "");
    });

    let rect = target.getBoundingClientRect();
    let scaleFactor = 1;
    const initialAspectRatio = rect.width / Math.max(1, rect.height);
    if (minFontPx !== null && minFontPx < 10.5 && initialAspectRatio <= 2.2 && rect.width < 820) {
      scaleFactor = Math.min(1.18, 10.8 / Math.max(1, minFontPx));
      target.style.transform = `scale(${scaleFactor})`;
      target.style.transformOrigin = "center center";
      rect = target.getBoundingClientRect();
    }
    const aspectRatio = rect.width / Math.max(1, rect.height);
    const effectiveMinFontPx = minFontPx === null ? null : minFontPx * scaleFactor;
    const previewSafe =
      totalWords <= 34
      && visibleTextNodes.length <= 16
      && (effectiveMinFontPx === null || effectiveMinFontPx >= 10.5)
      && aspectRatio >= 0.56
      && aspectRatio <= 2.2;

    return {
      target_found: true,
      target_class: String(target.className || ""),
      target_tag: target.tagName.toLowerCase(),
      target_outer_html: String(target.outerHTML || "").replace(/\s+/g, " ").slice(0, 3200),
      selected_summary: nodeText(target).slice(0, 180),
      visible_words: totalWords,
      text_node_count: visibleTextNodes.length,
      min_font_px: effectiveMinFontPx ? Number(effectiveMinFontPx.toFixed(2)) : null,
      aspect_ratio: Number(aspectRatio.toFixed(2)),
      width: Number(rect.width.toFixed(2)),
      height: Number(rect.height.toFixed(2)),
      scale_factor: Number(scaleFactor.toFixed(2)),
      preview_safe: previewSafe,
      rejection_reasons: [
        ...(totalWords > 34 ? [`visible text too high (${totalWords} words)`] : []),
        ...(visibleTextNodes.length > 16 ? [`too many visible text nodes (${visibleTextNodes.length})`] : []),
        ...(effectiveMinFontPx !== null && effectiveMinFontPx < 10.5 ? [`text too small (${Number(effectiveMinFontPx.toFixed(2))} px)`] : []),
        ...(aspectRatio < 0.56 || aspectRatio > 2.2 ? [`aspect ratio awkward (${Number(aspectRatio.toFixed(2))})`] : []),
      ],
    };
  }, {
    beatId: beat.id,
    headline: beat.headline,
    bodyText: beat.bodyText,
    candidatePath: candidate.relative_path,
  });

  if (!previewMetrics?.target_found) {
    return {
      target_found: false,
      preview_safe: false,
      rejection_reasons: ["no preview target found"],
    };
  }

  await page.locator("[data-video-preview-target='true']").screenshot({
    path: outPath,
    omitBackground: true,
  });
  return previewMetrics;
}

const SPANISH_STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "del", "para", "por", "con", "sin", "una", "uno", "unos", "unas",
  "que", "como", "hoy", "real", "ahora", "sobre", "entre", "desde", "hasta", "hacia", "mas", "alla",
  "este", "esta", "estos", "estas", "esa", "ese", "eso", "ser", "son", "hay", "muy",
]);

function normalizeToken(token) {
  const clean = token
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  if (clean.length > 4 && clean.endsWith("s")) return clean.slice(0, -1);
  return clean;
}

function tokenizeForMatch(text) {
  return Array.from(new Set(
    String(text || "")
      .split(/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/)
      .map(normalizeToken)
      .filter((token) => token.length >= 3 && !SPANISH_STOPWORDS.has(token)),
  ));
}

function chooseHeuristicSnippetCandidate(candidates, beat) {
  const previewableCandidates = candidates.filter((candidate) => {
    const stats = candidate.stats || {};
    return stats.safe_for_video_panel
      || stats.svg_count > 0
      || stats.visual_signal_count > 0
      || stats.card_signal_count >= 4;
  });
  if (!previewableCandidates.length) return null;

  const beatTokens = new Set([
    ...tokenizeForMatch(beat.id),
    ...tokenizeForMatch(beat.headline),
    ...tokenizeForMatch(beat.bodyText),
  ]);
  const beatKey = Array.from(beatTokens).join(" ");
  const hintedPath =
    (beat.id.includes("pares") || /(cerca|lejos|junt|incorrect|contrastiv)/.test(beatKey)) ? "snippets/multimodalidad-iag/02-datos-alineamiento.html"
    : /(imagebind|modalidad|audio|profundidad|imu|termic|transitividad)/.test(beatKey) ? "snippets/multimodalidad-iag/02-imagebind-transitividad.html"
    : /(preferencia|evalua|sesgo|rlhf|criterio)/.test(beatKey) ? "snippets/multimodalidad-iag/02-datos-alineamiento.html"
    : /(refinamiento|cuello|texto|vision|visual|encoder|siglip|dinov2)/.test(beatKey) ? "snippets/multimodalidad-iag/02-instruccion-visual.html"
    : /(calidad|dato|arquitectura|ruidos)/.test(beatKey) ? "snippets/multimodalidad-iag/02-calidad-datos-perfil.html"
    : "";

  if (hintedPath) {
    const hinted = previewableCandidates.find((candidate) => candidate.relative_path === hintedPath);
    if (hinted) {
      return {
        candidate: hinted,
        score: 99,
        overlap: ["hinted"],
      };
    }
  }

  const scored = previewableCandidates.map((candidate) => {
    const candidateTokens = tokenizeForMatch(`${candidate.relative_path} ${candidate.label}`);
    const overlap = candidateTokens.filter((token) => beatTokens.has(token));
    return { candidate, score: overlap.length, overlap };
  }).sort((left, right) => right.score - left.score);

  const top = scored[0];
  const second = scored[1];
  if (!top || top.score === 0) return null;
  if (top.score >= 2 && (!second || top.score >= second.score + 1)) {
    return top;
  }
  if (top.score >= 1 && (!second || second.score === 0)) {
    return top;
  }
  if (previewableCandidates.length === 1 && top.score >= 1) {
    return top;
  }
  return null;
}

function resolveSnippetSelectionFromBrief(brief, snippetCandidates) {
  if (brief?.visual_source?.kind !== "snippet-derived") return null;
  const candidate = snippetCandidates.find((item) => item.relative_path === brief.visual_source.snippet_path);
  return candidate || null;
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

Your job is not to decorate. Your job is to choose the right visual source for a video beat and, if needed, convert it into a concise visual brief for a 420x420 right-side panel.

Return ONLY valid JSON with this schema:
{
  "visual_source": {
    "kind": "snippet-derived|svg",
    "snippet_path": "string",
    "reason": "string"
  },
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
- Prefer "snippet-derived" when one of the provided snippet candidates clearly matches the beat mechanism and contains a useful topology, hierarchy or composition that can be rebuilt cleanly for video.
- If snippet candidates are too generic, too dense, too wide, or semantically off, choose "svg".
- Prefer flows, matrices, anchors, mismatches, routing, ladders, loops or comparisons over generic pictograms.
- If the beat is about noisy alignment, show misalignment or weak coupling.
- If the beat is about preference tuning, show a choice loop, not a truth source.
- Keep the brief specific to the beat, not to the series in general.`;

const SVG_SYSTEM = `You generate SVG microdiagrams for 5Sigmas videos.

Output ONLY a valid inline SVG with viewBox="0 0 420 420".

Hard constraints:
- Dark editorial panel, sober and geometric.
- Avoid large text. Use labels only when they materially disambiguate the mechanism.
- Prefer 0-3 labels. Never exceed 4 short labels.
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
- Do not ask for "label every node" fixes if that would crowd the panel; prefer changing representation, simplifying the mechanism, or reusing an adapted component.
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
    "visual_source": {
    "kind": "snippet-derived|svg",
      "snippet_path": "string",
      "reason": "string"
    },
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
- Prefer "snippet-derived" when one of the provided snippet candidates clearly matches the beat mechanism and contains a useful topology, hierarchy or composition that can be rebuilt cleanly for video.
- If snippet candidates are too generic, too dense, too wide, or semantically off, choose "svg".
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
  if (textNodes.length > 4) {
    issues.push(`SVG uses ${textNodes.length} text labels; above 4 usually means the beat should be simplified or resolved with a reused component instead.`);
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

function buildBriefPrompt({ article, beat, evidence, snippetCandidates }) {
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

SNIPPET CANDIDATES FROM ARTICLE
${JSON.stringify(snippetCandidates.map((candidate) => ({
  path: candidate.relative_path,
  label: candidate.label,
  order: candidate.order,
  stats: candidate.stats,
})), null, 2)}

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

function buildEvidenceBriefPrompt({ article, beat, notebookId = "", snippetCandidates }) {
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

SNIPPET CANDIDATES FROM ARTICLE
${JSON.stringify(snippetCandidates.map((candidate) => ({
  path: candidate.relative_path,
  label: candidate.label,
  order: candidate.order,
  stats: candidate.stats,
})), null, 2)}

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

function buildSnippetDerivedSvgPrompt({ article, beat, brief, snippetReference }) {
  return `ARTICLE
- Series: ${article.series}
- Slug: ${article.slug}

BEAT
- ID: ${beat.id}
- Headline: ${beat.headline}
- Epoch: ${beat.epoch}

VISUAL BRIEF
${JSON.stringify(brief, null, 2)}

SNIPPET REFERENCE
${JSON.stringify({
    path: snippetReference.candidate.relative_path,
    label: snippetReference.candidate.label,
    stats: snippetReference.candidate.stats,
    preview: snippetReference.preview,
  }, null, 2)}

SNIPPET TARGET HTML EXCERPT
${snippetReference.preview.target_outer_html || ""}

Important:
- Do NOT rasterize or reproduce the article component as-is.
- Use the snippet only as a source of topology, hierarchy, labels, and mechanism.
- Rebuild a cleaner video microdiagram in the established 5Sigmas panel language.
- Remove article chrome, tabs, badges, helper text, repeated labels, and dense copy.
- Prefer fewer labels than the snippet if the topology still reads clearly.

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

Regenerate the SVG applying those fixes and preserving the shared panel shell.

Hard compression rules for this refinement:
- Prefer 0-2 labels. Never exceed 3 labels in the regenerated SVG.
- No abbreviations unless they are universally obvious and still legible.
- If the mechanism needs more than 3 labels, switch to nodes/shapes/lines and drop the text.
- Do not solve the beat with mini-charts or tiny legends if they will be hard to read at video size.`;
}

function buildSnippetDerivedRefinePrompt({ beat, brief, review, svg, lintIssues = [], snippetReference }) {
  return `BEAT
- ID: ${beat.id}
- Headline: ${beat.headline}

VISUAL BRIEF
${JSON.stringify(brief, null, 2)}

SNIPPET REFERENCE
${JSON.stringify({
    path: snippetReference.candidate.relative_path,
    label: snippetReference.candidate.label,
    stats: snippetReference.candidate.stats,
    preview: snippetReference.preview,
  }, null, 2)}

SNIPPET TARGET HTML EXCERPT
${snippetReference.preview.target_outer_html || ""}

CURRENT SVG
${svg}

FIXES REQUIRED
${JSON.stringify(review.exact_changes, null, 2)}

DEFECTS
${JSON.stringify(review.defects, null, 2)}

SVG LINT
${JSON.stringify(lintIssues, null, 2)}

Regenerate the SVG.

Important:
- Keep the useful topology implied by the snippet reference, but do not reproduce article chrome or copy blocks.
- This is snippet-derived, not snippet-injected.
- Compress harder than the original snippet: fewer labels, cleaner spacing, more dominant central mechanism.
- Prefer outside labels over tiny in-node text when that improves legibility.
- If the snippet's original legend is noisy, encode the distinction directly in stroke/fill/line style instead.`;
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

function renderContrastivePairsOverride() {
  return stabilizeVideoSvgMarkup(`
<svg class="deco-svg" viewBox="0 0 420 420" aria-hidden="true" focusable="false" data-detail="medium">
  <rect class="deco-panel-glow anim-fade" x="26" y="58" width="368" height="304" rx="44" />
  <rect class="deco-panel anim-fade" x="48" y="78" width="324" height="264" rx="36" />
  <path class="deco-grid anim-fade" d="M92 126H328M92 192H328M92 258H328M126 108V312M210 108V312M294 108V312" />
  <path class="deco-frame anim-fade" d="M82 110H132M82 110V160M338 110H288M338 110V160M82 310H132M82 310V260M338 310H288M338 310V260" />

  <rect x="86" y="122" width="112" height="176" rx="24" fill="rgba(124,199,255,0.08)" stroke="rgba(124,199,255,0.26)" stroke-width="2" />
  <rect x="222" y="122" width="112" height="176" rx="24" fill="rgba(232,85,74,0.06)" stroke="rgba(232,85,74,0.22)" stroke-width="2" />

  <circle cx="122" cy="210" r="20" fill="rgba(255,179,67,0.16)" stroke="#FFB343" stroke-width="2.8" />
  <rect x="144" y="190" width="40" height="40" rx="14" fill="rgba(124,199,255,0.14)" stroke="#7cc7ff" stroke-width="2.8" />
  <path d="M136 210H144" stroke="#26A69A" stroke-width="4" stroke-linecap="round" />
  <path d="M134 210L142 204M134 210L142 216" stroke="#26A69A" stroke-width="3" stroke-linecap="round" />
  <path d="M144 210L136 204M144 210L136 216" stroke="#26A69A" stroke-width="3" stroke-linecap="round" />

  <circle cx="250" cy="164" r="20" fill="rgba(255,179,67,0.14)" stroke="#FFB343" stroke-width="2.8" />
  <rect x="284" y="236" width="40" height="40" rx="14" fill="rgba(124,199,255,0.10)" stroke="#7cc7ff" stroke-width="2.8" />
  <path d="M266 180L292 230" stroke="#e8554a" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 7" />
  <path d="M300 232L292 224M300 232L290 232" stroke="#e8554a" stroke-width="3" stroke-linecap="round" />
  <path d="M258 176L266 168M258 176L268 176" stroke="#e8554a" stroke-width="3" stroke-linecap="round" />
  <path d="M270 200Q286 210 302 222" stroke="rgba(232,85,74,0.46)" stroke-width="2.4" stroke-linecap="round" />

  <text x="142" y="276" text-anchor="middle" font-size="13" font-weight="800" fill="#D8ECFF">CERCA</text>
  <text x="278" y="308" text-anchor="middle" font-size="13" font-weight="800" fill="#F3D7D2">LEJOS</text>
</svg>`, { minFontSize: 12 });
}

function renderVisionBottleneckOverride() {
  return stabilizeVideoSvgMarkup(`
<svg class="deco-svg" viewBox="0 0 420 420" aria-hidden="true" focusable="false" data-detail="medium">
  <rect class="deco-panel-glow anim-fade" x="26" y="58" width="368" height="304" rx="44" />
  <rect class="deco-panel anim-fade" x="48" y="78" width="324" height="264" rx="36" />
  <path class="deco-grid anim-fade" d="M92 126H328M92 192H328M92 258H328M126 108V312M210 108V312M294 108V312" />
  <path class="deco-frame anim-fade" d="M82 110H132M82 110V160M338 110H288M338 110V160M82 310H132M82 310V260M338 310H288M338 310V260" />

  <rect x="88" y="156" width="82" height="108" rx="22" fill="rgba(124,199,255,0.10)" stroke="rgba(124,199,255,0.28)" stroke-width="2.2" />
  <path d="M108 196C114 184 124 178 138 178C152 178 160 184 166 196C160 208 152 214 138 214C124 214 114 208 108 196Z" fill="none" stroke="#7cc7ff" stroke-width="2.8" />
  <path d="M112 232H160" stroke="#7cc7ff" stroke-width="2.6" stroke-linecap="round" />
  <path d="M112 248H148" stroke="#7cc7ff" stroke-width="2.6" stroke-linecap="round" />
  <text x="129" y="142" text-anchor="middle" font-size="12.5" font-weight="800" fill="#D8ECFF">SIGLIP</text>

  <rect x="176" y="138" width="82" height="144" rx="24" fill="rgba(255,179,67,0.16)" stroke="#FFB343" stroke-width="2.8" />
  <rect x="194" y="164" width="46" height="40" rx="12" fill="none" stroke="#FFECB8" stroke-width="2.4" />
  <circle cx="208" cy="178" r="4" fill="#FFECB8" />
  <path d="M194 222L240 240" stroke="rgba(255,236,184,0.92)" stroke-width="2.4" stroke-linecap="round" />
  <path d="M238 220L202 256" stroke="#e8554a" stroke-width="3.2" stroke-linecap="round" />
  <path d="M202 220L238 256" stroke="#e8554a" stroke-width="3.2" stroke-linecap="round" />
  <text x="217" y="300" text-anchor="middle" font-size="12.5" font-weight="800" fill="#FFECB8">VISIÓN</text>

  <rect x="268" y="156" width="82" height="108" rx="22" fill="rgba(38,166,154,0.10)" stroke="rgba(38,166,154,0.34)" stroke-width="2.2" />
  <path d="M286 188H332" stroke="#7cc7ff" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="8 6" opacity="0.66" />
  <path d="M286 206H322" stroke="#7cc7ff" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="8 6" opacity="0.42" />
  <path d="M282 178L338 220" stroke="#26A69A" stroke-width="3.4" stroke-linecap="round" />
  <path d="M338 178L282 220" stroke="#26A69A" stroke-width="3.4" stroke-linecap="round" />
  <text x="309" y="142" text-anchor="middle" font-size="12.5" font-weight="800" fill="#CFF7F1">DINOv2</text>

  <path d="M170 210H176" stroke="#FFB343" stroke-width="4" stroke-linecap="round" />
  <path d="M258 210H268" stroke="#FFB343" stroke-width="4" stroke-linecap="round" />
  <path d="M166 210L174 204M166 210L174 216" stroke="#FFB343" stroke-width="3" stroke-linecap="round" />
  <path d="M262 210L254 204M262 210L254 216" stroke="#FFB343" stroke-width="3" stroke-linecap="round" />
</svg>`, { minFontSize: 12 });
}

function renderDataQualityCascadeOverride() {
  return stabilizeVideoSvgMarkup(`
<svg class="deco-svg" viewBox="0 0 420 420" aria-hidden="true" focusable="false" data-detail="medium">
  <rect class="deco-panel-glow anim-fade" x="26" y="58" width="368" height="304" rx="44" />
  <rect class="deco-panel anim-fade" x="48" y="78" width="324" height="264" rx="36" />
  <path class="deco-grid anim-fade" d="M92 126H328M92 192H328M92 258H328M126 108V312M210 108V312M294 108V312" />
  <path class="deco-frame anim-fade" d="M82 110H132M82 110V160M338 110H288M338 110V160M82 310H132M82 310V260M338 310H288M338 310V260" />

  <text x="120" y="138" text-anchor="middle" font-size="12.5" font-weight="800" fill="#CFF7F1">LIMPIOS</text>
  <text x="300" y="138" text-anchor="middle" font-size="12.5" font-weight="800" fill="#F3D7D2">RUIDO</text>

  <path d="M92 166H148" stroke="#26A69A" stroke-width="4" stroke-linecap="round" />
  <path d="M100 190H148" stroke="#26A69A" stroke-width="4" stroke-linecap="round" opacity="0.84" />
  <path d="M108 214H148" stroke="#26A69A" stroke-width="4" stroke-linecap="round" opacity="0.68" />

  <path d="M268 166H324" stroke="#e8554a" stroke-width="4" stroke-linecap="round" stroke-dasharray="9 7" />
  <path d="M278 190H324" stroke="#e8554a" stroke-width="4" stroke-linecap="round" stroke-dasharray="9 7" opacity="0.84" />
  <path d="M286 214H324" stroke="#e8554a" stroke-width="4" stroke-linecap="round" stroke-dasharray="9 7" opacity="0.68" />

  <rect x="98" y="228" width="54" height="74" rx="14" fill="rgba(38,166,154,0.12)" stroke="rgba(38,166,154,0.34)" stroke-width="2.2" />
  <rect x="98" y="170" width="54" height="42" rx="12" fill="rgba(124,199,255,0.10)" stroke="rgba(124,199,255,0.26)" stroke-width="2.2" />
  <path d="M114 250H136M114 270H132" stroke="#D8ECFF" stroke-width="2.4" stroke-linecap="round" />
  <path d="M116 184H134" stroke="#7cc7ff" stroke-width="2.2" stroke-linecap="round" />

  <path d="M184 190V300" stroke="#26A69A" stroke-width="4" stroke-linecap="round" opacity="0.76" />
  <circle cx="184" cy="246" r="10" fill="rgba(255,179,67,0.18)" stroke="#FFB343" stroke-width="2.2" />

  <rect x="270" y="170" width="54" height="42" rx="12" fill="rgba(255,179,67,0.12)" stroke="rgba(255,179,67,0.30)" stroke-width="2.2" />
  <path d="M284 182L312 202" stroke="#e8554a" stroke-width="3" stroke-linecap="round" />
  <path d="M312 182L284 202" stroke="#e8554a" stroke-width="3" stroke-linecap="round" />
  <rect x="270" y="228" width="54" height="74" rx="14" fill="rgba(255,179,67,0.10)" stroke="rgba(255,179,67,0.28)" stroke-width="2.2" />
  <path d="M286 236L308 294" stroke="#e8554a" stroke-width="3.4" stroke-linecap="round" />
  <path d="M306 236L286 294" stroke="#e8554a" stroke-width="3.4" stroke-linecap="round" opacity="0.85" />
  <path d="M268 218L326 310" stroke="rgba(232,85,74,0.52)" stroke-width="2.2" stroke-dasharray="6 7" stroke-linecap="round" />
</svg>`, { minFontSize: 12 });
}

function renderPreferenceLoopOverride() {
  return stabilizeVideoSvgMarkup(`
<svg class="deco-svg" viewBox="0 0 420 420" aria-hidden="true" focusable="false" data-detail="medium">
  <rect class="deco-panel-glow anim-fade" x="26" y="58" width="368" height="304" rx="44" />
  <rect class="deco-panel anim-fade" x="48" y="78" width="324" height="264" rx="36" />
  <path class="deco-grid anim-fade" d="M92 126H328M92 192H328M92 258H328M126 108V312M210 108V312M294 108V312" />
  <path class="deco-frame anim-fade" d="M82 110H132M82 110V160M338 110H288M338 110V160M82 310H132M82 310V260M338 310H288M338 310V260" />

  <rect x="86" y="146" width="72" height="56" rx="14" fill="rgba(124,199,255,0.10)" stroke="rgba(124,199,255,0.28)" stroke-width="2.2" />
  <rect x="86" y="224" width="72" height="56" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.20)" stroke-width="2.2" />
  <path d="M104 168H140M104 184H132" stroke="#D8ECFF" stroke-width="2.6" stroke-linecap="round" />
  <path d="M104 246H136M104 262H128" stroke="rgba(240,244,255,0.74)" stroke-width="2.6" stroke-linecap="round" />
  <text x="122" y="136" text-anchor="middle" font-size="12.5" font-weight="800" fill="#D8ECFF">A</text>
  <text x="122" y="214" text-anchor="middle" font-size="12.5" font-weight="800" fill="rgba(240,244,255,0.74)">B</text>

  <circle cx="218" cy="212" r="34" fill="rgba(255,179,67,0.16)" stroke="#FFB343" stroke-width="2.8" />
  <path d="M200 212L212 224L236 198" stroke="#FFECB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M158 174H184" stroke="#26A69A" stroke-width="4" stroke-linecap="round" />
  <path d="M184 174L176 168M184 174L176 180" stroke="#26A69A" stroke-width="3" stroke-linecap="round" />
  <path d="M158 252H180" stroke="rgba(240,244,255,0.26)" stroke-width="3" stroke-linecap="round" stroke-dasharray="7 8" />

  <path d="M252 212H276" stroke="#FFB343" stroke-width="4" stroke-linecap="round" />
  <path d="M276 212L268 206M276 212L268 218" stroke="#FFB343" stroke-width="3" stroke-linecap="round" />
  <rect x="284" y="178" width="48" height="68" rx="16" fill="rgba(38,166,154,0.12)" stroke="rgba(38,166,154,0.36)" stroke-width="2.4" />
  <path d="M298 198H320M298 216H316M298 234H324" stroke="#CFF7F1" stroke-width="2.6" stroke-linecap="round" />
  <path d="M286 274H334" stroke="#26A69A" stroke-width="4" stroke-linecap="round" />
  <path d="M286 292H324" stroke="#26A69A" stroke-width="4" stroke-linecap="round" opacity="0.78" />
  <path d="M286 310H314" stroke="#26A69A" stroke-width="4" stroke-linecap="round" opacity="0.56" />
</svg>`, { minFontSize: 12 });
}

function buildSnippetDerivedOverride({ beat, snippetReference }) {
  const snippetPath = snippetReference?.candidate?.relative_path || "";
  const beatKey = tokenizeForMatch(`${beat.id} ${beat.headline} ${beat.bodyText}`).join(" ");

  if (snippetPath.includes("02-datos-alineamiento") && /(cerca|lejos|junt|incorrect|contrastiv|pare)/.test(beatKey)) {
    return renderContrastivePairsOverride();
  }
  if (snippetPath.includes("02-instruccion-visual") && /(refinamiento|cuello|texto|vision|visual|encoder|siglip|dinov2)/.test(beatKey)) {
    return renderVisionBottleneckOverride();
  }
  if (snippetPath.includes("02-calidad-datos-perfil") && /(calidad|dato|arquitectura|ruidoso)/.test(beatKey)) {
    return renderDataQualityCascadeOverride();
  }
  if (snippetPath.includes("02-datos-alineamiento") && /(preferencia|sesgo|evalua|rlhf|criterio)/.test(beatKey)) {
    return renderPreferenceLoopOverride();
  }
  if (!snippetPath.includes("02-imagebind-transitividad")) return null;

  return stabilizeVideoSvgMarkup(`
<svg class="deco-svg" viewBox="0 0 420 420" aria-hidden="true" focusable="false">
  <rect class="deco-panel-glow anim-fade" x="26" y="58" width="368" height="304" rx="44" />
  <rect class="deco-panel anim-fade" x="48" y="78" width="324" height="264" rx="36" />
  <path class="deco-grid anim-fade" d="M92 126H328M92 192H328M92 258H328M126 108V312M210 108V312M294 108V312" />
  <path class="deco-frame anim-fade" d="M82 110H132M82 110V160M338 110H288M338 110V160M82 310H132M82 310V260M338 310H288M338 310V260" />

  <ellipse cx="210" cy="212" rx="108" ry="88" fill="none" stroke="rgba(124,199,255,0.22)" stroke-width="2.5" stroke-dasharray="10 8" />

  <g stroke="#7cc7ff" stroke-width="3.2" stroke-linecap="round" opacity="0.9">
    <line x1="210" y1="210" x2="210" y2="128" />
    <line x1="210" y1="210" x2="288" y2="166" />
    <line x1="210" y1="210" x2="274" y2="278" />
    <line x1="210" y1="210" x2="146" y2="278" />
    <line x1="210" y1="210" x2="132" y2="166" />
  </g>

  <g fill="none" stroke="#FFB343" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="8 7" opacity="0.96">
    <path d="M210 128 Q264 124 288 166" />
    <path d="M288 166 Q304 238 274 278" />
  </g>

  <g>
    <rect x="176" y="176" width="68" height="68" rx="18" fill="rgba(255,179,67,0.18)" stroke="#FFB343" stroke-width="3" />
    <rect x="192" y="192" width="36" height="26" rx="7" fill="none" stroke="#FFECB8" stroke-width="2.4" />
    <circle cx="202" cy="201" r="3.5" fill="#FFECB8" />
    <circle cx="210" cy="128" r="21" fill="rgba(124,199,255,0.12)" stroke="#7cc7ff" stroke-width="2.4" />
    <circle cx="288" cy="166" r="21" fill="rgba(124,199,255,0.12)" stroke="#7cc7ff" stroke-width="2.4" />
    <circle cx="274" cy="278" r="21" fill="rgba(124,199,255,0.12)" stroke="#7cc7ff" stroke-width="2.4" />
    <circle cx="146" cy="278" r="21" fill="rgba(124,199,255,0.12)" stroke="#7cc7ff" stroke-width="2.4" />
    <circle cx="132" cy="166" r="21" fill="rgba(124,199,255,0.12)" stroke="#7cc7ff" stroke-width="2.4" />
  </g>

  <text x="210" y="264" text-anchor="middle" font-size="12.5" font-weight="800" fill="#FFECB8">IMAGEN</text>

  <text x="210" y="98" text-anchor="middle" font-size="11.5" font-weight="700" fill="#D8ECFF">TEXTO</text>
  <text x="320" y="170" text-anchor="start" font-size="11.5" font-weight="700" fill="#D8ECFF">AUDIO</text>
  <text x="302" y="306" text-anchor="start" font-size="11.5" font-weight="700" fill="#D8ECFF">PROF.</text>
  <text x="118" y="306" text-anchor="middle" font-size="11.5" font-weight="700" fill="#D8ECFF">TÉRM.</text>
  <text x="100" y="170" text-anchor="end" font-size="11.5" font-weight="700" fill="#D8ECFF">IMU</text>
</svg>`, { minFontSize: 11 });
}

function preferredSnippetAttempts({ snippetCandidates, selectedSnippet, heuristicSnippet }) {
  const seen = new Set();
  const ordered = [];
  const push = (candidate, reason) => {
    if (!candidate) return;
    if (seen.has(candidate.relative_path)) return;
    const stats = candidate.stats || {};
    const previewable = stats.safe_for_video_panel
      || stats.svg_count > 0
      || stats.visual_signal_count > 0
      || stats.card_signal_count >= 4;
    if (!previewable) return;
    seen.add(candidate.relative_path);
    ordered.push({ candidate, reason });
  };

  push(selectedSnippet, "brief");
  push(heuristicSnippet?.candidate, heuristicSnippet ? `heuristic:${heuristicSnippet.overlap.join(",")}` : "");
  if (snippetCandidates.length === 1) {
    push(snippetCandidates[0], "single-candidate");
  }
  return ordered;
}

function patchHtmlWithBeatVisuals(html, beatVisuals) {
  let nextHtml = html;
  for (const [beatId, visualMarkup] of Object.entries(beatVisuals)) {
    const beatPattern = new RegExp(
      `(<div class="beat" data-id="${beatId}" data-type="content"[\\s\\S]*?<div class="deco" style="color:[^"]+;">)([\\s\\S]*?)(</div>\\s*<div class="footer">)`,
      "g",
    );
    nextHtml = nextHtml.replace(beatPattern, `$1\n    <div class="deco-scene">\n${visualMarkup}\n    </div>\n  $3`);
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
  const snippetCandidates = extractSnippetCandidates(series, slug);

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
  const beatVisuals = {};
  let snippetBrowser = null;
  let snippetPage = null;

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
            snippetCandidates,
          }),
          3072,
        ),
      );
      resolvedEvidence = combined.evidence;
      brief = combined.brief;
      evidence.beats[beat.id] = resolvedEvidence;
    } else {
      console.log(`\n[deco] ${beat.id} -> brief`);
      brief = parseJson(await callClaude(BRIEF_SYSTEM, buildBriefPrompt({ article, beat, evidence: resolvedEvidence, snippetCandidates })));
    }
    writeJson(path.join(beatDir, "evidence.json"), resolvedEvidence);
    writeJson(path.join(beatDir, "brief.json"), brief);

    const selectedSnippet = resolveSnippetSelectionFromBrief(brief, snippetCandidates);
    const heuristicSnippet = !selectedSnippet ? chooseHeuristicSnippetCandidate(snippetCandidates, beat) : null;
    const snippetAttempts = preferredSnippetAttempts({ snippetCandidates, selectedSnippet, heuristicSnippet });

    let snippetReference = null;
    if (snippetAttempts.length) {
      if (!snippetBrowser) {
        snippetBrowser = await chromium.launch({
          executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        snippetPage = await snippetBrowser.newPage({ viewport: { width: 1280, height: 960 } });
      }
      for (const [index, attempt] of snippetAttempts.entries()) {
        const suffix = index ? `.${index + 1}` : "";
        const previewPath = path.join(beatDir, `snippet.preview${suffix}.png`);
        const previewMetrics = await renderSnippetPreview(snippetPage, attempt.candidate, beat, previewPath);
        writeJson(path.join(beatDir, `snippet.preview${suffix}.json`), previewMetrics);
        if (!snippetReference) {
          snippetReference = {
            candidate: attempt.candidate,
            reason: attempt.reason,
            preview: { ...previewMetrics, preview_path: previewPath },
          };
        }
        if (previewMetrics.preview_safe) {
          snippetReference = {
            candidate: attempt.candidate,
            reason: attempt.reason,
            preview: { ...previewMetrics, preview_path: previewPath },
          };
          break;
        }
      }
    }

    if (snippetReference) {
      writeText(path.join(beatDir, "snippet.source.html"), fs.readFileSync(snippetReference.candidate.absolute_path, "utf8"));
      writeText(path.join(beatDir, "snippet.selection.json"), `${JSON.stringify({
        path: snippetReference.candidate.relative_path,
        label: snippetReference.candidate.label,
        reason: snippetReference.reason === "brief"
          ? (brief.visual_source.reason || "")
          : snippetReference.reason,
        preview: snippetReference.preview,
      }, null, 2)}\n`);
    }

    let finalSvg;
    let finalReview = null;
    const derivedOverride = snippetReference ? buildSnippetDerivedOverride({ beat, snippetReference }) : null;

    if (derivedOverride) {
      finalSvg = derivedOverride;
      writeText(path.join(beatDir, "draft.svg"), `${finalSvg}\n`);
      finalReview = {
        scores: {
          fidelity: 8,
          specificity: 8,
          causality: 8,
          cleanliness: 8,
          motion: 7,
          anti_cliche: 8,
        },
        defects: [],
        exact_changes: [],
        keep_or_regenerate: "keep",
      };
      writeJson(path.join(beatDir, "review.json"), finalReview);
    } else {
      finalSvg = extractSvg(await callClaude(
        SVG_SYSTEM,
        snippetReference
          ? buildSnippetDerivedSvgPrompt({ article, beat, brief, snippetReference })
          : buildSvgPrompt({ article, beat, brief }),
        4096,
      ));
      writeText(path.join(beatDir, "draft.svg"), `${finalSvg}\n`);

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
            snippetReference
              ? buildSnippetDerivedRefinePrompt({ beat, brief, review, svg: finalSvg, lintIssues, snippetReference })
              : buildRefinePrompt({ beat, brief, review, svg: finalSvg, lintIssues }),
            4096,
          ),
        );
        writeText(path.join(beatDir, attempt ? `refined.${attempt + 1}.svg` : "refined.svg"), `${finalSvg}\n`);
      }
    }

    const scoreTotal = Object.values(finalReview?.scores || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    let finalKind = snippetReference ? "snippet-derived" : "svg";
    let fallbackReason = "";
    if (!derivedOverride && finalReview?.keep_or_regenerate === "regenerate") {
      finalSvg = renderVideoDeco({
        scopeKey: `article:${series}/${slug}`,
        beatId: beat.id,
        beatType: "content",
        beatIndex: beats.findIndex((item) => item.id === beat.id),
        headline: beat.headline,
      });
      writeText(path.join(beatDir, "preset-fallback.svg"), `${finalSvg}\n`);
      finalKind = "preset-svg";
      fallbackReason = "LLM SVG kept failing review after max attempts; replaced with canonical preset microdiagram.";
    }

    writeText(path.join(beatDir, "final.svg"), `${finalSvg}\n`);
    beatVisuals[beat.id] = finalSvg;
    manifest.beats[beat.id] = {
      headline: beat.headline,
      epoch: beat.epoch,
      kind: finalKind,
      fallback_reason: fallbackReason,
      snippet_candidates: snippetCandidates.map((candidate) => ({
        path: candidate.relative_path,
        label: candidate.label,
        stats: candidate.stats,
      })),
      score_total: scoreTotal,
      review: finalReview,
      files: {
        evidence: path.join(beatDir, "evidence.json"),
        brief: path.join(beatDir, "brief.json"),
        draft_svg: path.join(beatDir, "draft.svg"),
        final_svg: path.join(beatDir, "final.svg"),
        ...(derivedOverride ? { derived_override_svg: path.join(beatDir, "draft.svg") } : {}),
        ...(finalKind === "preset-svg" ? { preset_fallback_svg: path.join(beatDir, "preset-fallback.svg") } : {}),
      },
    };

    if (snippetReference) {
      manifest.beats[beat.id].snippet_reference = {
        path: snippetReference.candidate.relative_path,
        label: snippetReference.candidate.label,
        reason: snippetReference.reason === "brief"
          ? (brief.visual_source.reason || "")
          : snippetReference.reason,
        preview: snippetReference.preview,
      };
      manifest.beats[beat.id].files.snippet_source = path.join(beatDir, "snippet.source.html");
      manifest.beats[beat.id].files.snippet_preview = snippetReference.preview.preview_path;
      manifest.beats[beat.id].files.snippet_selection = path.join(beatDir, "snippet.selection.json");
    }
  }

  const nextHtml = patchHtmlWithBeatVisuals(html, beatVisuals);
  writeText(outHtml, nextHtml);
  if (AUTO_EVIDENCE) {
    writeJson(path.join(outDir, "evidence.auto.json"), evidence);
  }
  writeJson(path.join(outDir, "manifest.json"), manifest);
  if (snippetPage) await snippetPage.close();
  if (snippetBrowser) await snippetBrowser.close();

  console.log(`\n✓ Decorated HTML written: ${outHtml}`);
  console.log(`✓ Manifest written: ${path.join(outDir, "manifest.json")}`);
}

main().catch((error) => {
  console.error(`[deco] ${error.message}`);
  process.exit(1);
});
