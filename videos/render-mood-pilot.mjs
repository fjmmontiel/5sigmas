import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { chromium } from "playwright-core";
import {
  applyVideoMoodToHtml,
  DEFAULT_VIDEO_MOOD,
  listVideoMoods,
  listVideoMoodSets,
  resolveVideoMoodSet,
} from "./video-moods.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const moodsArg = args.find((arg) => arg.startsWith("--moods="))?.split("=")[1];
const moodSetArg = args.find((arg) => arg.startsWith("--mood-set="))?.split("=")[1];
const beatsArg = args.find((arg) => arg.startsWith("--beats="))?.split("=")[1];
const outDirArg = args.find((arg) => arg.startsWith("--out-dir="))?.split("=")[1];
const noVideo = args.includes("--no-video");

if (!inputPath) {
  console.error("Usage: node render-mood-pilot.mjs <video.html> [--moods=a,b,c] [--mood-set=name] [--beats=id1,id2] [--out-dir=dir] [--no-video]");
  process.exit(1);
}

const inAbs = path.resolve(inputPath);
if (!fs.existsSync(inAbs)) {
  console.error(`Not found: ${inAbs}`);
  process.exit(1);
}

const slugBase = path.basename(inAbs, ".html");
const outDir = path.resolve(outDirArg || path.join(path.dirname(inAbs), "mood-pilot", slugBase));
const renderer = path.resolve(path.dirname(inAbs), "../../video-generator/article-to-video.mjs");
const selectedMoods = moodSetArg
  ? (resolveVideoMoodSet(moodSetArg) || [])
  : moodsArg
    ? moodsArg.split(",").map((value) => value.trim()).filter(Boolean)
    : listVideoMoods().map((item) => item.id);

if (!selectedMoods.length) {
  const availableSets = listVideoMoodSets().map((item) => item.id).join(", ");
  console.error(`No moods selected${moodSetArg ? ` for set "${moodSetArg}"` : ""}. Available sets: ${availableSets}`);
  process.exit(1);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildComparisonHtml(entries, beatIds) {
  const rows = entries.map((entry) => {
    const shots = beatIds.map((beatId) => `
      <figure>
        <img src="./${entry.mood}/${beatId}.png" alt="${entry.mood} ${beatId}">
        <figcaption>${beatId}</figcaption>
      </figure>
    `).join("");

    return `
      <section class="card">
        <h2>${entry.mood}</h2>
        <p>${entry.label}</p>
        <div class="shots">${shots}</div>
        <p><a href="./${entry.mood}/${path.basename(entry.html)}">${path.basename(entry.html)}</a></p>
        ${entry.video ? `<p><a href="./${entry.mood}/${path.basename(entry.video)}">${path.basename(entry.video)}</a></p>` : ""}
      </section>
    `;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mood Pilot · ${slugBase}</title>
<style>
  body { margin: 0; padding: 32px; background: #0b1220; color: #f0f4ff; font-family: "Avenir Next","Avenir","Segoe UI","Helvetica Neue",Arial,sans-serif; }
  h1 { margin: 0 0 8px; font-size: 36px; }
  p { margin: 0 0 20px; color: rgba(240,244,255,.72); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 24px; }
  .card { border: 1px solid rgba(124,199,255,.14); border-radius: 18px; background: rgba(16,24,40,.68); padding: 20px; }
  .card h2 { margin: 0 0 6px; font-size: 22px; }
  .shots { display: grid; gap: 14px; }
  figure { margin: 0; }
  img { width: 100%; border-radius: 14px; border: 1px solid rgba(124,199,255,.14); }
  figcaption { margin-top: 6px; font-size: 12px; color: rgba(240,244,255,.56); text-transform: uppercase; letter-spacing: .12em; }
  a { color: #7cc7ff; }
</style>
</head>
<body>
  <h1>Mood Pilot · ${slugBase}</h1>
  <p>Comparativa de estilos corporativos sobre el mismo vídeo fuente.</p>
  <div class="grid">${rows}</div>
</body>
</html>`;
}

async function captureBeats(page, htmlPath, requestedBeats) {
  await page.goto(`file://${htmlPath}`);
  const beats = await page.evaluate((ids) => {
    const all = Array.from(document.querySelectorAll(".beat")).map((el) => ({
      id: el.dataset.id || "unknown",
      type: el.dataset.type || "unknown",
    }));
    const selected = ids?.length
      ? ids
      : [all.find((item) => item.type === "opening")?.id, all.find((item) => item.type === "content")?.id].filter(Boolean);
    return { all, selected };
  }, requestedBeats);
  return beats.selected;
}

async function screenshotBeat(page, htmlPath, beatId, outPath) {
  await page.goto(`file://${htmlPath}`);
  await page.evaluate((id) => {
    const beats = Array.from(document.querySelectorAll(".beat"));
    beats.forEach((el) => {
      el.classList.remove("active");
      el.style.display = "none";
    });
    const target = document.querySelector(`.beat[data-id="${id}"]`);
    if (!target) throw new Error(`Beat not found: ${id}`);
    target.classList.add("active");
    target.style.display = "flex";
  }, beatId);
  await page.screenshot({ path: outPath });
}

async function main() {
  ensureDir(outDir);
  const rawHtml = fs.readFileSync(inAbs, "utf8");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const beatIds = beatsArg
    ? beatsArg.split(",").map((value) => value.trim()).filter(Boolean)
    : await captureBeats(page, inAbs, null);

  const manifest = [];

  for (const moodId of selectedMoods) {
    const moodDir = path.join(outDir, moodId);
    ensureDir(moodDir);
    const moodHtml = path.join(moodDir, `${slugBase}.${moodId}.html`);
    const nextHtml = applyVideoMoodToHtml(rawHtml, moodId);
    fs.writeFileSync(moodHtml, nextHtml, "utf8");

    for (const beatId of beatIds) {
      await screenshotBeat(page, moodHtml, beatId, path.join(moodDir, `${beatId}.png`));
    }

    let videoPath = null;
    let posterPath = null;
    if (!noVideo) {
      videoPath = path.join(moodDir, `${slugBase}.${moodId}.mp4`);
      posterPath = path.join(moodDir, `${slugBase}.${moodId}.jpg`);
      execSync(`node "${renderer}" "${moodHtml}" "${videoPath}"`, {
        stdio: "inherit",
        cwd: path.dirname(renderer),
      });
      execSync(`ffmpeg -ss 1.5 -i "${videoPath}" -frames:v 1 -update 1 -q:v 3 -y "${posterPath}"`, {
        stdio: "pipe",
      });
    }

    const moodInfo = listVideoMoods().find((item) => item.id === moodId);
    manifest.push({
      mood: moodId,
      label: moodInfo?.label || moodId,
      html: moodHtml,
      video: videoPath,
      poster: posterPath,
      screenshots: beatIds.map((beatId) => path.join(moodDir, `${beatId}.png`)),
    });
  }

  await browser.close();

  const comparisonHtml = buildComparisonHtml(manifest, beatIds);
  fs.writeFileSync(path.join(outDir, "comparison.html"), comparisonHtml, "utf8");
  fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify({
    source_html: inAbs,
    beats: beatIds,
    moods: manifest,
  }, null, 2)}\n`, "utf8");

  console.log(`✓ Mood pilot ready: ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
