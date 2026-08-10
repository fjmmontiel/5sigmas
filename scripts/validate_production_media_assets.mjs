import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = (process.env.S5_PREVIEW_URL || 'https://5sigmas.com').replace(/\/$/, '');
const outputDir = process.env.S5_SCREENSHOT_DIR || 'artifacts/visual-review';
const posters = [
  '/series/agentes-ia/00_presentacion_serie.jpg',
  '/series/agentes-ia/01-que-es-un-agente.jpg',
  '/series/agentes-ia/02-anatomia-de-un-agente.jpg',
  '/series/agentes-ia/03-como-evaluar-un-agente.jpg',
  '/series/agentes-ia/04-seguridad-agentes.jpg',
  '/series/agentes-ia/05-de-la-demo-a-produccion.jpg',
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const report = [];
  for (const pathname of posters) {
    const url = `${baseUrl}${pathname}`;
    const response = await page.request.get(url, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok()) throw new Error(`${pathname}: HTTP ${response.status()}`);
    const body = await response.body();
    if (body.length < 3 || body[0] !== 0xff || body[1] !== 0xd8 || body[2] !== 0xff) {
      throw new Error(`${pathname}: production bytes are not JPEG.`);
    }
    const contentType = response.headers()['content-type'] || '';
    if (!contentType.toLowerCase().includes('image/jpeg')) {
      throw new Error(`${pathname}: unexpected content-type ${contentType}.`);
    }

    await page.setContent(`<img id="poster" src="${url.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" alt="poster">`);
    const dimensions = await page.locator('#poster').evaluate(async (image) => {
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    });
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      throw new Error(`${pathname}: JPEG did not decode (${JSON.stringify(dimensions)}).`);
    }
    report.push({ pathname, bytes: body.length, contentType, ...dimensions });
  }
  await fs.writeFile(`${outputDir}/production-agentes-posters.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Production Agentes posters passed: ${report.length}/${posters.length} JPEGs decoded with correct magic bytes.`);
} finally {
  await browser.close();
}
