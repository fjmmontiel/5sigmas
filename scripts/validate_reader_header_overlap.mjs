import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.s5-reader-global-nav');
  await page.evaluate(() => window.scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - window.innerHeight)));
  await page.waitForTimeout(250);

  const state = await page.evaluate(() => {
    const title = document.querySelector('.md-header__title');
    const nav = document.querySelector('.s5-reader-global-nav');
    const logo = document.querySelector('.md-header .md-logo');
    const topics = [...document.querySelectorAll('.md-header__topic')];
    const nativeControls = [...document.querySelectorAll(
      '.md-header__inner > .md-header__option, .md-header__inner > .md-header__button[for="__search"]'
    )];
    if (!title || !nav || !logo) return null;

    const titleBox = title.getBoundingClientRect();
    const navBox = nav.getBoundingClientRect();
    const logoBox = logo.getBoundingClientRect();
    const topicState = topics.map((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        text: node.textContent.trim(),
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        left: box.left,
        right: box.right,
        width: box.width,
      };
    });
    const controlState = nativeControls.map((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        className: node.className,
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        left: box.left,
        right: box.right,
        width: box.width,
      };
    });

    return {
      titleText: title.textContent.trim(),
      titleBox: { left: titleBox.left, right: titleBox.right, width: titleBox.width },
      navBox: { left: navBox.left, right: navBox.right, width: navBox.width },
      logoBox: { left: logoBox.left, right: logoBox.right, width: logoBox.width },
      topics: topicState,
      nativeControls: controlState,
      navLinks: [...nav.querySelectorAll('a')].map((node) => node.textContent.trim()),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });

  if (!state) throw new Error('Unable to measure the desktop reader header.');
  if (state.navLinks.length < 5) throw new Error(`Reader global nav is incomplete: ${JSON.stringify(state)}.`);
  if (state.horizontalOverflow > 2) throw new Error(`Reader header introduces ${state.horizontalOverflow}px of horizontal overflow.`);
  if (state.titleBox.right > state.navBox.left - 12) {
    throw new Error(`Reader header title collides with global nav: ${JSON.stringify(state)}.`);
  }
  if (state.logoBox.right > state.navBox.left - 24) {
    throw new Error(`Reader logo region collides with global nav: ${JSON.stringify(state)}.`);
  }

  const secondary = state.topics.slice(1).filter((topic) => (
    topic.display !== 'none' && topic.visibility !== 'hidden' && topic.opacity > 0.01 && topic.width > 1
  ));
  if (secondary.length > 0) {
    throw new Error(`Scrolled page-title topic is still visible in the desktop reader header: ${JSON.stringify(secondary)}.`);
  }

  const controlCollisions = state.nativeControls.filter((control) => (
    control.display !== 'none'
    && control.visibility !== 'hidden'
    && control.opacity > 0.01
    && control.width > 1
    && control.left < state.navBox.right
    && control.right > state.navBox.left
  ));
  if (controlCollisions.length > 0) {
    throw new Error(`Native header controls collide with reader global nav: ${JSON.stringify({
      navBox: state.navBox,
      controls: controlCollisions,
    })}.`);
  }

  await page.screenshot({ path: `${outputDir}/reader-header-overlap-desktop.png`, fullPage: false });
} finally {
  await browser.close();
}
