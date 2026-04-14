/**
 * batch-articles.mjs
 *
 * Renders article videos for an entire series (or all series).
 * Skips articles where the .mp4 is newer than the .md (idempotent).
 * Output: <series>/<slug>.mp4 — alongside each article .md.
 *
 * Usage:
 *   node batch-articles.mjs                        # all series
 *   node batch-articles.mjs --series from-cave-to-agi
 *   node batch-articles.mjs --series from-cave-to-agi --force   # re-render all
 *   node batch-articles.mjs --dry-run              # show what would run
 *
 * Flags:
 *   --series <name>   Process only this series folder
 *   --force           Re-render even if .mp4 is up-to-date
 *   --dry-run         Print jobs without executing
 *   --no-cta          Omit CTA beat (default for article/site videos)
 *   --linkedin        Include CTA beat (for LinkedIn post videos)
 */

import fs   from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const SERIES_ARG = args.find(a => a.startsWith("--series="))?.split("=")[1]
                || (args.includes("--series") ? args[args.indexOf("--series") + 1] : null);
const FORCE      = args.includes("--force");
const DRY_RUN    = args.includes("--dry-run");
// Article videos default to --no-cta; pass --linkedin to keep CTA
const NO_CTA     = !args.includes("--linkedin");

const SERIES_ROOT = path.resolve(__dirname, "../docs/series");
const SCRIPT      = path.join(__dirname, "md-to-article-html.mjs");

// Keep in sync with hooks/wip_series.py — no videos for incomplete series
const WIP_SERIES = new Set([
  "ia-pib-bienestar-energia",
  "datacenters-espacio",
]);

// ─── Discover series ──────────────────────────────────────────────────────────
function discoverSeries() {
  return fs.readdirSync(SERIES_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => !SERIES_ARG || name === SERIES_ARG)
    .filter(name => !WIP_SERIES.has(name))
    .sort();
}

// ─── Discover articles in a series ───────────────────────────────────────────
function discoverArticles(seriesName) {
  const dir = path.join(SERIES_ROOT, seriesName);
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".md") && !f.startsWith("00_") && f !== "index.md")
    .sort()
    .map(f => ({
      md:   path.join(dir, f),
      slug: path.basename(f, ".md"),
      mp4:  path.join(dir, path.basename(f, ".md") + ".mp4"),
    }));
}

// ─── Check if render needed ───────────────────────────────────────────────────
function needsRender({ md, mp4 }) {
  if (FORCE) return true;
  if (!fs.existsSync(mp4)) return true;
  const mdMtime  = fs.statSync(md).mtimeMs;
  const mp4Mtime = fs.statSync(mp4).mtimeMs;
  return mdMtime > mp4Mtime;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const seriesList = discoverSeries();
  if (seriesList.length === 0) {
    console.error(`No series found${SERIES_ARG ? ` matching "${SERIES_ARG}"` : ""}`);
    process.exit(1);
  }

  const jobs = [];
  for (const series of seriesList) {
    const articles = discoverArticles(series);
    for (const article of articles) {
      jobs.push({ series, ...article });
    }
  }

  const toRender = jobs.filter(needsRender);
  const skipped  = jobs.length - toRender.length;

  console.log(`\nBatch articles — ${jobs.length} total, ${skipped} up-to-date, ${toRender.length} to render`);
  console.log(`CTA: ${NO_CTA ? "omitted (site video)" : "included (linkedin)"}\n`);

  if (toRender.length === 0) {
    console.log("All videos up-to-date. Use --force to re-render.");
    return;
  }

  for (const job of toRender) {
    const ctaFlag = NO_CTA ? "--no-cta" : "";
    const cmd = `node "${SCRIPT}" "${job.md}" --render ${ctaFlag}`.trim();

    console.log(`\n[${ toRender.indexOf(job) + 1}/${toRender.length}] ${job.series} / ${job.slug}`);
    console.log(`  md:  ${job.md}`);
    console.log(`  mp4: ${job.mp4}`);

    if (DRY_RUN) {
      console.log(`  cmd: ${cmd}`);
      continue;
    }

    try {
      execSync(cmd, { stdio: "inherit", cwd: __dirname });
      console.log(`  ✓ done`);
    } catch (e) {
      console.error(`  ✗ failed: ${e.message}`);
      // Continue with next article, don't abort batch
    }
  }

  if (!DRY_RUN) {
    console.log(`\n✓ Batch complete — ${toRender.length} rendered, ${skipped} skipped`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
