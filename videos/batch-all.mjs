/**
 * batch-all.mjs
 *
 * Generates ALL article videos and series presentation videos.
 * Idempotent: skips a video if the .mp4 is newer than its source .md(s).
 *
 * Two video types:
 *   "series"   — one per series, from md-series-to-html.mjs
 *                input:  docs/series/<name>/ (all .md files)
 *                output: docs/series/<name>/00_presentacion_serie.mp4
 *
 *   "article"  — one per article, from md-to-article-html.mjs + deco-pipeline.mjs
 *                input:  docs/series/<name>/<slug>.md
 *                output: docs/series/<name>/<slug>.mp4
 *
 * Usage:
 *   node batch-all.mjs                           # both types, all series
 *   node batch-all.mjs --series from-cave-to-agi # one series, both types
 *   node batch-all.mjs --only-series             # series presentations only
 *   node batch-all.mjs --only-articles           # article videos only
 *   node batch-all.mjs --force                   # ignore mtime, re-render all
 *   node batch-all.mjs --dry-run                 # print plan, no rendering
 *   node batch-all.mjs --linkedin                # include CTA in article videos
 */

import fs   from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const SERIES_ROOT = path.resolve(__dirname, "../docs/series");

const args          = process.argv.slice(2);
const SERIES_FILTER = args.find(a => a.startsWith("--series="))?.split("=")[1]
                   || (args.includes("--series") ? args[args.indexOf("--series") + 1] : null);
const FORCE         = args.includes("--force");
const DRY_RUN       = args.includes("--dry-run");
const ONLY_SERIES   = args.includes("--only-series");
const ONLY_ARTICLES = args.includes("--only-articles");
const NO_CTA        = !args.includes("--linkedin");  // default: no CTA for site videos

const SCRIPT_SERIES  = path.join(__dirname, "md-series-to-html.mjs");
const SCRIPT_ARTICLE = path.join(__dirname, "md-to-article-html.mjs");
const SCRIPT_DECO    = path.join(__dirname, "deco-pipeline.mjs");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newestMtime(...paths) {
  return Math.max(...paths.map(p => fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0));
}

function needsRender(mp4, ...sourceMds) {
  if (FORCE) return true;
  if (!fs.existsSync(mp4)) return true;
  const mp4Mtime = fs.statSync(mp4).mtimeMs;
  return newestMtime(...sourceMds) > mp4Mtime;
}

// ─── Job discovery ────────────────────────────────────────────────────────────

function discoverJobs() {
  const seriesDirs = fs.readdirSync(SERIES_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => !SERIES_FILTER || name === SERIES_FILTER)
    .sort();

  if (seriesDirs.length === 0) {
    console.error(`No series found${SERIES_FILTER ? ` matching "${SERIES_FILTER}"` : ""}`);
    process.exit(1);
  }

  const jobs = [];

  for (const series of seriesDirs) {
    const seriesDir = path.join(SERIES_ROOT, series);
    const allMds    = fs.readdirSync(seriesDir)
      .filter(f => f.endsWith(".md") && f !== "index.md")
      .sort()
      .map(f => path.join(seriesDir, f));

    const articleMds = allMds.filter(f => !path.basename(f).startsWith("00_"));

    // ── Series presentation job ──────────────────────────────────────────────
    if (!ONLY_ARTICLES) {
      const mp4 = path.join(seriesDir, "00_presentacion_serie.mp4");
      // Stale if any article .md is newer than the presentation mp4
      jobs.push({
        type:   "series",
        series,
        label:  `${series}/00_presentacion_serie`,
        cmd:    `node "${SCRIPT_SERIES}" "${seriesDir}" --render`,
        mp4,
        stale:  needsRender(mp4, ...articleMds),
        articles: articleMds.length,
      });
    }

    // ── Per-article jobs ─────────────────────────────────────────────────────
    if (!ONLY_SERIES) {
      for (const md of articleMds) {
        const slug = path.basename(md, ".md");
        const mp4  = path.join(seriesDir, `${slug}.mp4`);
        jobs.push({
          type:   "article",
          series,
          label:  `${series}/${slug}`,
          cmd: [
            `node "${SCRIPT_ARTICLE}" "${md}" "${path.join(__dirname, `article_${series}__${slug}.source.html`)}"${NO_CTA ? " --no-cta" : ""}`,
            `node "${SCRIPT_DECO}" "${path.join(__dirname, `article_${series}__${slug}.source.html`)}" --out-html="${path.join(__dirname, `article_${series}__${slug}.html`)}" --out-dir="${path.join(__dirname, "deco", series, slug)}" --max-attempts=2`,
            `node "${path.resolve(__dirname, "../../video-generator/article-to-video.mjs")}" "${path.join(__dirname, `article_${series}__${slug}.html`)}" "${mp4}"`,
          ].join(" && "),
          mp4,
          stale:  needsRender(mp4, md),
        });
      }
    }
  }

  return jobs;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const jobs    = discoverJobs();
  const toRun   = jobs.filter(j => j.stale);
  const skipped = jobs.length - toRun.length;

  const seriesCount  = toRun.filter(j => j.type === "series").length;
  const articleCount = toRun.filter(j => j.type === "article").length;

  console.log(`\n${"═".repeat(72)}`);
  console.log(`batch-all — ${jobs.length} total, ${skipped} up-to-date, ${toRun.length} to render`);
  console.log(`  series presentations: ${seriesCount}   article videos: ${articleCount}`);
  console.log(`  CTA: ${NO_CTA ? "omitted (site/article videos)" : "included (--linkedin)"}`);
  if (FORCE)   console.log(`  --force: re-rendering all`);
  if (DRY_RUN) console.log(`  --dry-run: no rendering`);
  console.log(`${"═".repeat(72)}\n`);

  if (toRun.length === 0) {
    console.log("All videos up-to-date. Use --force to re-render.");
    return;
  }

  // Print full plan
  toRun.forEach((j, i) => {
    const tag = j.type === "series" ? `[SERIE  ${j.articles} arts]` : "[ART   ]";
    console.log(`  ${String(i + 1).padStart(3)}. ${tag}  ${j.label}`);
  });
  console.log();

  if (DRY_RUN) return;

  let ok = 0, fail = 0;

  for (const [i, job] of toRun.entries()) {
    console.log(`\n${"─".repeat(72)}`);
    console.log(`[${i + 1}/${toRun.length}] ${job.type.toUpperCase()}: ${job.label}`);
    console.log(`  → ${job.mp4}`);
    console.log(`${"─".repeat(72)}`);

    try {
      execSync(job.cmd, { stdio: "inherit", cwd: __dirname });

      // Extract poster frame at 1.5 s — used by the MkDocs video_embed hook
      const poster = job.mp4.replace(/\.mp4$/, ".jpg");
      try {
        execSync(
          `ffmpeg -ss 1.5 -i "${job.mp4}" -frames:v 1 -update 1 -q:v 3 -y "${poster}"`,
          { stdio: "pipe" }
        );
        console.log(`\n✓ ${path.basename(job.mp4)}  +  ${path.basename(poster)}`);
      } catch {
        console.log(`\n✓ ${path.basename(job.mp4)}  (poster failed — ffmpeg missing?)`);
      }

      ok++;
    } catch (e) {
      console.error(`\n✗ failed: ${e.message}`);
      fail++;
      // Continue — don't abort the whole batch on one failure
    }
  }

  console.log(`\n${"═".repeat(72)}`);
  console.log(`Done: ${ok} rendered, ${fail} failed, ${skipped} skipped`);
  console.log(`${"═".repeat(72)}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
