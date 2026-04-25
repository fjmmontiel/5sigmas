import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { stabilizeVideoSvgMarkup, videoDecoStyles } from "./video-deco-presets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERIES_ROOT = path.resolve(__dirname, "../docs/series");
const RENDERER = path.resolve(__dirname, "../../video-generator/article-to-video.mjs");

const args = process.argv.slice(2);
const SERIES_FILTER =
  args.find((a) => a.startsWith("--series="))?.split("=")[1]
  || (args.includes("--series") ? args[args.indexOf("--series") + 1] : null);
const ONLY_SERIES = args.includes("--only-series");
const ONLY_ARTICLES = args.includes("--only-articles");
const NO_RENDER = args.includes("--no-render");
const DRY_RUN = args.includes("--dry-run");

function discoverSeries() {
  return fs.readdirSync(SERIES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !SERIES_FILTER || name === SERIES_FILTER)
    .sort();
}

function discoverJobs() {
  const jobs = [];
  for (const series of discoverSeries()) {
    const seriesDir = path.join(SERIES_ROOT, series);
    const articles = fs.readdirSync(seriesDir)
      .filter((file) => file.endsWith(".md") && !file.startsWith("00_") && file !== "index.md")
      .sort();

    if (!ONLY_ARTICLES) {
      jobs.push({
        type: "series",
        label: `${series}/00_presentacion_serie`,
        html: path.join(__dirname, `series_${series}.html`),
        mp4: path.join(seriesDir, "00_presentacion_serie.mp4"),
        poster: path.join(seriesDir, "00_presentacion_serie.jpg"),
      });
    }

    if (!ONLY_SERIES) {
      for (const file of articles) {
        const slug = path.basename(file, ".md");
        jobs.push({
          type: "article",
          label: `${series}/${slug}`,
          html: path.join(__dirname, `article_${series}__${slug}.html`),
          mp4: path.join(seriesDir, `${slug}.mp4`),
          poster: path.join(seriesDir, `${slug}.jpg`),
        });
      }
    }
  }
  return jobs;
}

function patchDecoCss(html) {
  return html.replace(
    /  \.beat-inner \{\s*position: relative;[\s\S]*?^\s*\/\* ── Opening beat/m,
    `${videoDecoStyles()}\n\n  /* ── Opening beat`,
  );
}

function patchEmbeddedSvgs(html) {
  return html.replace(/<svg\b[\s\S]*?<\/svg>/gi, (svg) => {
    if (!/class=(["'])deco-svg\1/.test(svg)) return svg;
    return stabilizeVideoSvgMarkup(svg);
  });
}

function computeAdaptiveDecoVars(textCount, detail) {
  if (detail === "dense" || textCount >= 14) {
    const veryDense = textCount >= 18;
    return {
      size: veryDense ? 680 : 640,
      right: veryDense ? 40 : 28,
      top: veryDense ? 270 : 278,
    };
  }
  if (detail === "medium" || textCount >= 7) {
    const heavierMedium = textCount >= 10;
    return {
      size: heavierMedium ? 600 : 580,
      right: heavierMedium ? 28 : 36,
      top: heavierMedium ? 292 : 300,
    };
  }
  return null;
}

function patchDecoWrappers(html) {
  return html.replace(
    /<div class="deco" style="([^"]*)">([\s\S]*?<svg\b[^>]*data-detail="([^"]+)"[^>]*data-text-count="([^"]+)"[\s\S]*?<\/svg>[\s\S]*?)<\/div>/g,
    (_match, style, inner, detail, rawCount) => {
      const textCount = Number(rawCount || 0);
      const vars = computeAdaptiveDecoVars(textCount, detail);
      const baseStyle = style
        .replace(/;?\s*--deco-size:[^;"]*;?/g, "")
        .replace(/;?\s*--deco-right:[^;"]*;?/g, "")
        .replace(/;?\s*--deco-top:[^;"]*;?/g, "")
        .replace(/\s{2,}/g, " ")
        .trim()
        .replace(/;+\s*$/, "");
      if (!vars) {
        return `<div class="deco" style="${baseStyle}">${inner}</div>`;
      }
      const nextStyle = `${baseStyle}; --deco-size:${vars.size}px; --deco-right:${vars.right}px; --deco-top:${vars.top}px;`;
      return `<div class="deco" style="${nextStyle}">${inner}</div>`;
    },
  );
}

function refreshHtmlFile(filePath) {
  const prev = fs.readFileSync(filePath, "utf8");
  let next = patchDecoCss(prev);
  next = patchEmbeddedSvgs(next);
  next = patchDecoWrappers(next);
  const changed = next !== prev;
  if (changed && !DRY_RUN) {
    fs.writeFileSync(filePath, next, "utf8");
  }
  return changed;
}

function renderVideo(job) {
  execSync(`node "${RENDERER}" "${job.html}" "${job.mp4}"`, {
    stdio: "inherit",
    cwd: path.dirname(RENDERER),
  });
  execSync(`ffmpeg -ss 1.5 -i "${job.mp4}" -frames:v 1 -update 1 -q:v 3 -y "${job.poster}"`, {
    stdio: "pipe",
    cwd: __dirname,
  });
}

async function main() {
  const jobs = discoverJobs();
  if (!jobs.length) {
    console.error(`No matching jobs found${SERIES_FILTER ? ` for "${SERIES_FILTER}"` : ""}.`);
    process.exit(1);
  }

  console.log(`Refresh video layout — ${jobs.length} jobs`);
  if (DRY_RUN) console.log("  --dry-run");
  if (NO_RENDER) console.log("  --no-render");

  let changedCount = 0;
  let renderedCount = 0;

  for (const [index, job] of jobs.entries()) {
    if (!fs.existsSync(job.html)) {
      console.log(`\n[${index + 1}/${jobs.length}] ${job.label}`);
      console.log(`  missing html: ${job.html}`);
      continue;
    }

    console.log(`\n[${index + 1}/${jobs.length}] ${job.label}`);
    console.log(`  html: ${job.html}`);
    const changed = refreshHtmlFile(job.html);
    changedCount += changed ? 1 : 0;
    console.log(`  layout: ${changed ? "updated" : "already normalized"}`);

    if (NO_RENDER) continue;
    if (DRY_RUN) {
      console.log(`  render: node "${RENDERER}" "${job.html}" "${job.mp4}"`);
      continue;
    }

    renderVideo(job);
    renderedCount += 1;
    console.log(`  render: ok`);
  }

  console.log(`\nDone: ${changedCount} HTML updated, ${renderedCount} videos rendered`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
