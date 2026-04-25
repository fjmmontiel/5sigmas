import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERIES_ROOT = path.resolve(__dirname, "../docs/series");
const ARTICLE_SCRIPT = path.join(__dirname, "md-to-article-html.mjs");
const DECO_SCRIPT = path.join(__dirname, "deco-pipeline.mjs");
const RENDERER = path.resolve(__dirname, "../../video-generator/article-to-video.mjs");

const args = process.argv.slice(2);
const SERIES_FILTER =
  args.find((a) => a.startsWith("--series="))?.split("=")[1]
  || (args.includes("--series") ? args[args.indexOf("--series") + 1] : null);
const FORCE = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");
const INCLUDE_CTA = args.includes("--linkedin");

function discoverSeries() {
  return fs.readdirSync(SERIES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !SERIES_FILTER || name === SERIES_FILTER)
    .sort();
}

function discoverArticles(series) {
  const dir = path.join(SERIES_ROOT, series);
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("00_") && file !== "index.md")
    .sort()
    .map((file) => {
      const slug = path.basename(file, ".md");
      return {
        series,
        slug,
        md: path.join(dir, file),
        sourceHtml: path.join(__dirname, `article_${series}__${slug}.source.html`),
        html: path.join(__dirname, `article_${series}__${slug}.html`),
        decoDir: path.join(__dirname, "deco", series, slug),
        mp4: path.join(dir, `${slug}.mp4`),
        poster: path.join(dir, `${slug}.jpg`),
      };
    });
}

function needsRender(job) {
  if (FORCE) return true;
  if (!fs.existsSync(job.mp4)) return true;
  return fs.statSync(job.md).mtimeMs > fs.statSync(job.mp4).mtimeMs;
}

function shellEscape(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

async function main() {
  const seriesList = discoverSeries();
  if (!seriesList.length) {
    console.error(`No series found${SERIES_FILTER ? ` matching "${SERIES_FILTER}"` : ""}`);
    process.exit(1);
  }

  const jobs = seriesList.flatMap(discoverArticles);
  const toRun = jobs.filter(needsRender);

  console.log(`\nBatch articles — ${jobs.length} total, ${jobs.length - toRun.length} up-to-date, ${toRun.length} to render`);
  console.log(`CTA: ${INCLUDE_CTA ? "included (--linkedin)" : "omitted (site video)"}`);
  if (!toRun.length) {
    console.log("All article videos are up-to-date. Use --force to re-render.");
    return;
  }

  for (const [index, job] of toRun.entries()) {
    console.log(`\n[${index + 1}/${toRun.length}] ${job.series}/${job.slug}`);
    console.log(`  md:   ${job.md}`);
    console.log(`  html: ${job.html}`);
    console.log(`  mp4:  ${job.mp4}`);

    const steps = [
      `node ${shellEscape(ARTICLE_SCRIPT)} ${shellEscape(job.md)} ${shellEscape(job.sourceHtml)}${INCLUDE_CTA ? "" : " --no-cta"}`,
      `node ${shellEscape(DECO_SCRIPT)} ${shellEscape(job.sourceHtml)} --out-html=${shellEscape(job.html)} --out-dir=${shellEscape(job.decoDir)} --max-attempts=2`,
      `node ${shellEscape(RENDERER)} ${shellEscape(job.html)} ${shellEscape(job.mp4)}`,
      `ffmpeg -ss 1.5 -i ${shellEscape(job.mp4)} -frames:v 1 -update 1 -q:v 3 -y ${shellEscape(job.poster)}`,
    ];

    if (DRY_RUN) {
      steps.forEach((step) => console.log(`  ${step}`));
      continue;
    }

    try {
      execSync(steps[0], { stdio: "inherit", cwd: __dirname });
      execSync(steps[1], { stdio: "inherit", cwd: __dirname });
      execSync(steps[2], { stdio: "inherit", cwd: path.dirname(RENDERER) });
      execSync(steps[3], { stdio: "pipe", cwd: __dirname });
      console.log("  ✓ done");
    } catch (error) {
      console.error(`  ✗ failed: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
