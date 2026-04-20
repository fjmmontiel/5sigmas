/**
 * batch-render.mjs
 *
 * Batch-renders all carousel_pulido.html posts into MP4 videos.
 * Output is placed alongside the carousel HTML in the post folder.
 *
 * Usage:
 *   node batch-render.mjs                          # all series
 *   node batch-render.mjs --series from-cave-to-agi
 *   node batch-render.mjs --series multimodalidad-iag
 *   node batch-render.mjs --post post_1_cero       # single post by name
 *   node batch-render.mjs --dry-run                # list without rendering
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_ROOT = path.resolve(__dirname, "../distribution/linkedin/posts");
const RENDERER   = path.resolve(__dirname, "../../video-generator/carousel-to-video.mjs");

// CLI args
const args = process.argv.slice(2);
const seriesIdx    = args.indexOf("--series");
const postIdx      = args.indexOf("--post");
const seriesFilter = seriesIdx !== -1 ? args[seriesIdx + 1] : null;
const postFilter   = postIdx   !== -1 ? args[postIdx   + 1] : null;
const dryRun       = args.includes("--dry-run");

// ─── Discover all carousel_pulido.html files ──────────────────────────────────
function findPosts() {
  const results = [];

  for (const series of fs.readdirSync(POSTS_ROOT)) {
    if (seriesFilter && series !== seriesFilter) continue;
    const seriesDir = path.join(POSTS_ROOT, series);
    if (!fs.statSync(seriesDir).isDirectory()) continue;

    for (const cap of fs.readdirSync(seriesDir)) {
      const capDir = path.join(seriesDir, cap);
      if (!fs.statSync(capDir).isDirectory()) continue;

      for (const post of fs.readdirSync(capDir)) {
        if (postFilter && post !== postFilter) continue;
        const postDir  = path.join(capDir, post);
        if (!fs.statSync(postDir).isDirectory()) continue;

        const htmlPath = path.join(postDir, "carousel_pulido.html");
        if (!fs.existsSync(htmlPath)) continue;

        const outPath = path.join(postDir, `${post}.mp4`);
        results.push({ series, cap, post, htmlPath, outPath });
      }
    }
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const posts = findPosts();

if (posts.length === 0) {
  console.error("No carousel_pulido.html files found matching the given filters.");
  process.exit(1);
}

console.log(`\nFound ${posts.length} post(s) to render:\n`);
posts.forEach(({ series, cap, post, outPath }, i) => {
  const exists = fs.existsSync(outPath) ? " (exists)" : "";
  console.log(`  ${String(i + 1).padStart(2)}. ${series}/${cap}/${post}${exists}`);
});

if (dryRun) {
  console.log("\n--dry-run: no render performed.\n");
  process.exit(0);
}

console.log("\nStarting batch render...\n");

let ok = 0, fail = 0;

for (const { series, cap, post, htmlPath, outPath } of posts) {
  console.log(`\n${"─".repeat(72)}`);
  console.log(`Rendering: ${series}/${cap}/${post}`);
  console.log(`  Input:  ${path.relative(process.cwd(), htmlPath)}`);
  console.log(`  Output: ${path.relative(process.cwd(), outPath)}`);
  console.log(`${"─".repeat(72)}\n`);

  try {
    execSync(
      `node "${RENDERER}" "${htmlPath}" "${outPath}"`,
      { stdio: "inherit" }
    );
    console.log(`\n✓ ${post}.mp4\n`);
    ok++;
  } catch (err) {
    console.error(`\n✗ Failed: ${post} — ${err.message}\n`);
    fail++;
  }
}

console.log(`\n${"═".repeat(72)}`);
console.log(`Batch complete: ${ok} OK, ${fail} failed out of ${posts.length} total`);
console.log(`${"═".repeat(72)}\n`);
