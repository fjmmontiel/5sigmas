import fs from "fs";
import path from "path";
import { applyVideoMoodToHtml, DEFAULT_VIDEO_MOOD, listVideoMoods } from "./video-moods.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const outputPath = args.filter((arg) => !arg.startsWith("--"))[1];
const mood = args.find((arg) => arg.startsWith("--mood="))?.split("=")[1] || DEFAULT_VIDEO_MOOD;

if (args.includes("--list")) {
  console.log(JSON.stringify(listVideoMoods(), null, 2));
  process.exit(0);
}

if (!inputPath) {
  console.error("Usage: node apply-video-mood.mjs <input.html> [output.html] [--mood=name]");
  process.exit(1);
}

const inAbs = path.resolve(inputPath);
const outAbs = path.resolve(outputPath || inputPath);

if (!fs.existsSync(inAbs)) {
  console.error(`Not found: ${inAbs}`);
  process.exit(1);
}

const html = fs.readFileSync(inAbs, "utf8");
const next = applyVideoMoodToHtml(html, mood);
fs.mkdirSync(path.dirname(outAbs), { recursive: true });
fs.writeFileSync(outAbs, next, "utf8");
console.log(`✓ Mood applied: ${mood}`);
console.log(`  input:  ${inAbs}`);
console.log(`  output: ${outAbs}`);
