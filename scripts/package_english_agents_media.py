#!/usr/bin/env python3
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Missing expected block in {path}: {old!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


manifest_media = """  - series/agentes-ia/00_presentacion_serie.mp4
  - series/agentes-ia/00_presentacion_serie.jpg
  - series/agentes-ia/01-que-es-un-agente.mp4
  - series/agentes-ia/01-que-es-un-agente.jpg
  - series/agentes-ia/02-anatomia-de-un-agente.mp4
  - series/agentes-ia/02-anatomia-de-un-agente.jpg
  - series/agentes-ia/03-como-evaluar-un-agente.mp4
  - series/agentes-ia/03-como-evaluar-un-agente.jpg
  - series/agentes-ia/04-seguridad-agentes.mp4
  - series/agentes-ia/04-seguridad-agentes.jpg
  - series/agentes-ia/05-de-la-demo-a-produccion.mp4
  - series/agentes-ia/05-de-la-demo-a-produccion.jpg
"""
replace_once(
    "locales/en/manifest.yml",
    "  - articulos-tecnicos/reactive-proactive-agent-header-demo.mp4\n",
    manifest_media + "  - articulos-tecnicos/reactive-proactive-agent-header-demo.mp4\n",
)
replace_once(
    "locales/en/manifest.yml",
    "  agents_series: complete\n",
    "  agents_series: text_visuals_and_native_media_complete\n",
)
replace_once(
    "locales/en/manifest.yml",
    "  visual_hub: blocked_on_localized_media\n  video_hub: blocked_on_localized_media\n  localized_video_media: reasoning_models_foundations_multimodality_energy_caves_datacenters_security_and_technical_articles_complete\n",
    "  visual_hub: not_yet_published\n  video_hub: not_yet_published\n  localized_video_media: canonical_series_and_technical_articles_complete\n",
)

media_append = """

series/agentes-ia/00_presentacion_serie.md:
  video: 00_presentacion_serie.mp4
  video_poster: 00_presentacion_serie.jpg
  video_title: AI Agents
  video_duration: PT32S

series/agentes-ia/01-que-es-un-agente.md:
  video: 01-que-es-un-agente.mp4
  video_poster: 01-que-es-un-agente.jpg
  video_title: What an AI agent is—and is not
  video_duration: PT32S

series/agentes-ia/02-anatomia-de-un-agente.md:
  video: 02-anatomia-de-un-agente.mp4
  video_poster: 02-anatomia-de-un-agente.jpg
  video_title: The anatomy of an agent
  video_duration: PT32S

series/agentes-ia/03-como-evaluar-un-agente.md:
  video: 03-como-evaluar-un-agente.mp4
  video_poster: 03-como-evaluar-un-agente.jpg
  video_title: How to evaluate an AI agent
  video_duration: PT32S

series/agentes-ia/04-seguridad-agentes.md:
  video: 04-seguridad-agentes.mp4
  video_poster: 04-seguridad-agentes.jpg
  video_title: Agent security
  video_duration: PT32S

series/agentes-ia/05-de-la-demo-a-produccion.md:
  video: 05-de-la-demo-a-produccion.mp4
  video_poster: 05-de-la-demo-a-produccion.jpg
  video_title: From demo to production
  video_duration: PT32S
"""
media_path = Path("locales/en/media.yml")
media_text = media_path.read_text(encoding="utf-8")
if "series/agentes-ia/00_presentacion_serie.md:" not in media_text:
    media_path.write_text(media_text.rstrip() + media_append + "\n", encoding="utf-8")

validator = r'''#!/usr/bin/env node
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const root = '/en/series/agentes-ia/';
const pages = [
  ['00_presentacion_serie', 'AI Agents'],
  ['01-que-es-un-agente', 'An agent is a loop with permissions'],
  ['02-anatomia-de-un-agente', 'The anatomy of an agent'],
  ['03-como-evaluar-un-agente', 'A demo measures an output. An agent needs a trace.'],
  ['04-seguridad-agentes', 'Incoming data can become an instruction'],
  ['05-de-la-demo-a-produccion', 'From demo to production'],
];
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
];
const failures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const [slug, marker] of pages) {
    for (const [label, viewport] of viewports) {
      const page = await browser.newPage({ viewport });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const route = `${root}${slug}/`;
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
      const body = await page.locator('body').innerText().catch(() => '');
      if (!body.includes(marker)) failures.push(`${route}: missing English marker ${JSON.stringify(marker)}`);

      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (videoCount !== 1) failures.push(`${route}: expected one native-English video, found ${videoCount}`);
      else {
        const video = videos.first();
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        if (sourceUrl.pathname !== `${root}${slug}.mp4`) failures.push(`${route}: unexpected video path ${sourceUrl.pathname}`);
        if (posterUrl.pathname !== `${root}${slug}.jpg`) failures.push(`${route}: unexpected poster path ${posterUrl.pathname}`);
        const mediaResponse = await page.request.get(sourceUrl.href, { headers: { Range: 'bytes=0-1023' } });
        if (![200, 206].includes(mediaResponse.status())) failures.push(`${route}: MP4 range request failed with HTTP ${mediaResponse.status()}`);
        const posterResponse = await page.request.get(posterUrl.href);
        if (!posterResponse.ok()) failures.push(`${route}: poster request failed with HTTP ${posterResponse.status()}`);
      }
      if (await page.locator('audio').count()) failures.push(`${route}: unexpected inherited audio`);
      const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      if (sizes.scroll > sizes.client + 2) failures.push(`${route}: ${label} horizontal overflow ${sizes.scroll - sizes.client}px`);
      for (const error of runtimeErrors) failures.push(`${route}: pageerror: ${error}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Native English AI Agents media QA failed:');
  for (const failure of [...new Set(failures)]) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Native English AI Agents media QA passed: presentation + Chapters 1–5, exact /en/ MP4/poster pairs, range delivery, desktop/mobile clean.');
'''
Path("scripts/validate_english_agents_media.mjs").write_text(validator, encoding="utf-8")

replace_once(
    ".github/workflows/english-mirror-quality.yml",
    "      - 'scripts/validate_english_security_media.mjs'\n",
    "      - 'scripts/validate_english_security_media.mjs'\n      - 'scripts/validate_english_agents_media.mjs'\n",
)
replace_once(
    ".github/workflows/english-mirror-quality.yml",
    "      - name: Validate complete English Technical Articles\n        run: node scripts/validate_english_technical_articles.mjs\n",
    "      - name: Validate native English AI Agents media\n        run: node scripts/validate_english_agents_media.mjs\n\n      - name: Validate complete English Technical Articles\n        run: node scripts/validate_english_technical_articles.mjs\n",
)
replace_once(
    ".github/workflows/deploy-pages.yml",
    "      - name: Validate live English Technical Articles\n        env:\n          S5_PREVIEW_BASE: https://5sigmas.com\n        run: node scripts/validate_english_technical_articles.mjs\n",
    "      - name: Validate live English AI Agents media\n        env:\n          S5_PREVIEW_BASE: https://5sigmas.com\n        run: node scripts/validate_english_agents_media.mjs\n\n      - name: Validate live English Technical Articles\n        env:\n          S5_PREVIEW_BASE: https://5sigmas.com\n        run: node scripts/validate_english_technical_articles.mjs\n",
)

for temporary in [
    ".github/workflows/render-english-agents-media.yml",
    "scripts/render_english_agents_media.py",
    ".github/workflows/package-english-agents-media.yml",
    "scripts/package_english_agents_media.py",
]:
    Path(temporary).unlink(missing_ok=True)
