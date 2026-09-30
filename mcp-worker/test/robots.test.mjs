import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const robots = await readFile(new URL("../../docs/robots.txt", import.meta.url), "utf8");

for (const agent of [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "Googlebot",
  "Google-Extended"
]) {
  test("robots explicitly allows " + agent, () => {
    const escaped = agent.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    const block = new RegExp("User-agent:\\s*" + escaped + "\\s*\\nAllow:\\s*/", "i");
    assert.match(robots, block);
  });
}

test("robots advertises all production sitemaps", () => {
  for (const url of [
    "https://5sigmas.com/sitemap.xml",
    "https://5sigmas.com/en/sitemap.xml",
    "https://5sigmas.com/video-sitemap.xml",
    "https://5sigmas.com/en/video-sitemap.xml"
  ]) {
    assert.ok(robots.includes("Sitemap: " + url));
  }
});
