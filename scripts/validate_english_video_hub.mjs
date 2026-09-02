#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const screenshots = path.resolve('artifacts/visual-review');
fs.mkdirSync(screenshots, { recursive: true });

const absolutePath = (value) => {
  const parsed = new URL(value, 'https://5sigmas.com');
  return parsed.pathname;
};

const requestText = async (request, route) => {
  const response = await request.get(`${base}${route}`);
  if (!response.ok()) {
    failures.push(`${route}: HTTP ${response.status()}`);
    return '';
  }
  return response.text();
};

const schemasFromPage = async (page) => {
  const payloads = await page.locator('script[type="application/ld+json"]').allTextContents();
  const schemas = [];
  for (const payload of payloads) {
    try {
      const parsed = JSON.parse(payload);
      if (Array.isArray(parsed)) schemas.push(...parsed);
      else if (parsed && typeof parsed === 'object') schemas.push(parsed);
    } catch (error) {
      failures.push(`invalid JSON-LD payload: ${error.message}`);
    }
  }
  return schemas;
};

const githubAnnotation = (message) => String(message)
  .replace(/%/g, '%25')
  .replace(/\r/g, '%0D')
  .replace(/\n/g, '%0A');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();

const hubResponse = await page.goto(`${base}/en/videos/`, { waitUntil: 'networkidle' });
if (!hubResponse?.ok()) failures.push(`/en/videos/: HTTP ${hubResponse?.status() ?? 'no response'}`);

if (hubResponse?.ok()) {
  const lang = await page.locator('html').getAttribute('lang');
  if (!String(lang || '').toLowerCase().startsWith('en')) failures.push(`/en/videos/: html lang is ${JSON.stringify(lang)}`);

  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  if (canonical !== 'https://5sigmas.com/en/videos/') failures.push(`/en/videos/: canonical is ${JSON.stringify(canonical)}`);

  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const bodyLower = body.toLowerCase();
  for (const expected of ['One technical idea per video', 'Video library', 'videos available']) {
    if (!bodyLower.includes(expected.toLowerCase())) failures.push(`/en/videos/: missing English hub copy ${JSON.stringify(expected)}`);
  }
  for (const forbidden of ['vídeo disponible', 'vídeos disponibles', 'Ver vídeo', 'Leer artículo']) {
    if (body.includes(forbidden)) failures.push(`/en/videos/: Spanish runtime copy leaked: ${JSON.stringify(forbidden)}`);
  }

  const hubSchemas = await schemasFromPage(page);
  const collection = hubSchemas.find((schema) => schema['@type'] === 'CollectionPage');
  if (!collection) failures.push('/en/videos/: missing CollectionPage JSON-LD');
  else {
    if (collection.inLanguage !== 'en') failures.push(`/en/videos/: CollectionPage inLanguage is ${JSON.stringify(collection.inLanguage)}`);
    if (collection.url !== 'https://5sigmas.com/en/videos/') failures.push(`/en/videos/: CollectionPage URL is ${JSON.stringify(collection.url)}`);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 2) failures.push(`/en/videos/: desktop horizontal overflow ${overflow}px`);
  await page.screenshot({ path: path.join(screenshots, 'english-video-hub-desktop.png'), fullPage: true });
}

const catalogueResponse = await page.request.get(`${base}/en/videos/catalog.json`);
let catalogue = null;
if (!catalogueResponse.ok()) {
  failures.push(`/en/videos/catalog.json: HTTP ${catalogueResponse.status()}`);
} else {
  try {
    catalogue = await catalogueResponse.json();
  } catch (error) {
    failures.push(`/en/videos/catalog.json: invalid JSON (${error.message})`);
  }
}

if (catalogue) {
  if (catalogue.language !== 'en') failures.push(`catalogue language is ${JSON.stringify(catalogue.language)}`);
  if (!Array.isArray(catalogue.videos) || catalogue.videos.length === 0) failures.push('catalogue has no videos');
  if (catalogue.count !== catalogue.videos?.length) failures.push(`catalogue count ${catalogue.count} != videos.length ${catalogue.videos?.length}`);

  const topics = new Set();
  for (const video of catalogue.videos || []) {
    topics.add(video.topic);
    const watchPath = absolutePath(video.watch_url || '/');
    const videoPath = absolutePath(video.video_url || '/');
    const thumbPath = absolutePath(video.thumb_url || '/');
    if (!watchPath.startsWith('/en/videos/')) failures.push(`${video.id}: watch URL escapes English namespace: ${video.watch_url}`);
    if (!videoPath.startsWith('/en/')) failures.push(`${video.id}: video URL is not native-English: ${video.video_url}`);
    if (!thumbPath.startsWith('/en/')) failures.push(`${video.id}: poster URL is not native-English: ${video.thumb_url}`);
    if (!String(video.source_url || '').startsWith('https://5sigmas.com/en/')) failures.push(`${video.id}: source URL is not English: ${video.source_url}`);
    if (!String(video.publication_date || '').trim()) failures.push(`${video.id}: catalogue publication_date is missing`);
    else if (Number.isNaN(Date.parse(video.publication_date))) failures.push(`${video.id}: catalogue publication_date is invalid: ${JSON.stringify(video.publication_date)}`);
  }

  for (const expectedTopic of ['foundations', 'history', 'multimodality', 'reasoning', 'impact', 'infrastructure', 'security', 'agents', 'engineering']) {
    if (!topics.has(expectedTopic)) failures.push(`catalogue missing canonical topic ${expectedTopic}`);
  }

  const hubCards = await page.locator('[data-s5-video-card]').count();
  if (hubCards !== catalogue.count) failures.push(`/en/videos/: rendered cards ${hubCards} != catalogue count ${catalogue.count}`);

  if (catalogue.videos.length) {
    const topic = catalogue.videos[0].topic;
    const filter = page.locator(`[data-s5-video-filter="${topic}"]`);
    if (await filter.count()) {
      await filter.click();
      const visibleCards = await page.locator('[data-s5-video-card]:visible').count();
      if (visibleCards <= 0 || visibleCards >= catalogue.count) failures.push(`/en/videos/: topic filter ${topic} did not narrow the catalogue (${visibleCards}/${catalogue.count})`);
      const status = (await page.locator('[data-s5-video-status]').innerText()).trim();
      if (!/videos? available$/i.test(status)) failures.push(`/en/videos/: filter status is not localized English: ${JSON.stringify(status)}`);
    } else {
      failures.push(`/en/videos/: missing runtime filter for catalogue topic ${topic}`);
    }
  }

  const sampleIndexes = [...new Set([0, Math.floor(catalogue.videos.length / 2), catalogue.videos.length - 1])].filter((index) => index >= 0);
  for (const index of sampleIndexes) {
    const video = catalogue.videos[index];
    const watchPath = absolutePath(video.watch_url);
    const response = await page.goto(`${base}${watchPath}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${watchPath}: HTTP ${response?.status() ?? 'no response'}`);
      continue;
    }
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    if (canonical !== video.watch_url) failures.push(`${watchPath}: canonical ${JSON.stringify(canonical)} != ${video.watch_url}`);
    const source = await page.locator('[data-s5-watch-player] source').getAttribute('src');
    if (!absolutePath(source || '/').startsWith('/en/')) failures.push(`${watchPath}: player source is not native-English: ${source}`);
    const schemas = await schemasFromPage(page);
    const videoSchema = schemas.find((schema) => schema['@type'] === 'VideoObject');
    if (!videoSchema) failures.push(`${watchPath}: missing VideoObject JSON-LD`);
    else {
      if (videoSchema.inLanguage !== 'en') failures.push(`${watchPath}: VideoObject inLanguage is ${JSON.stringify(videoSchema.inLanguage)}`);
      if (videoSchema.contentUrl !== video.video_url) failures.push(`${watchPath}: VideoObject contentUrl ${JSON.stringify(videoSchema.contentUrl)} != ${video.video_url}`);
      if (videoSchema.mainEntityOfPage?.['@id'] !== video.watch_url) failures.push(`${watchPath}: VideoObject mainEntityOfPage is not its watch URL`);
      if (!String(videoSchema.uploadDate || '').trim()) failures.push(`${watchPath}: VideoObject uploadDate is missing`);
      else if (videoSchema.uploadDate !== video.publication_date) failures.push(`${watchPath}: VideoObject uploadDate ${JSON.stringify(videoSchema.uploadDate)} != catalogue publication_date ${JSON.stringify(video.publication_date)}`);
      else if (Number.isNaN(Date.parse(videoSchema.uploadDate))) failures.push(`${watchPath}: VideoObject uploadDate is invalid: ${JSON.stringify(videoSchema.uploadDate)}`);
    }
    const sourceHref = await page.locator('.s5-video-watch__source-link').getAttribute('href').catch(() => null);
    if (sourceHref !== video.source_url) failures.push(`${watchPath}: source/article link ${JSON.stringify(sourceHref)} != ${video.source_url}`);
  }

  if (catalogue.videos.length) {
    await page.setViewportSize({ width: 390, height: 844 });
    const watchPath = absolutePath(catalogue.videos[0].watch_url);
    await page.goto(`${base}${watchPath}`, { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 2) failures.push(`${watchPath}: mobile horizontal overflow ${overflow}px`);
    await page.screenshot({ path: path.join(screenshots, 'english-video-watch-mobile.png'), fullPage: true });
  }

  const sitemap = await requestText(page.request, '/en/video-sitemap.xml');
  if (sitemap) {
    for (const video of catalogue.videos) {
      if (!sitemap.includes(`<loc>${video.watch_url}</loc>`)) failures.push(`/en/video-sitemap.xml: missing ${video.watch_url}`);
      if (!sitemap.includes(video.video_url)) failures.push(`/en/video-sitemap.xml: missing native video ${video.video_url}`);
      if (!sitemap.includes(`<video:publication_date>${video.publication_date}</video:publication_date>`)) failures.push(`/en/video-sitemap.xml: missing publication_date for ${video.watch_url}`);
    }
    if (/https:\/\/5sigmas\.com\/(?!en\/)[^<]*\.mp4/.test(sitemap)) failures.push('/en/video-sitemap.xml: contains a Spanish-namespace MP4 URL');
  }
}

await browser.close();

if (failures.length) {
  console.error('English video hub QA failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
    if (process.env.GITHUB_ACTIONS === 'true') console.error(`::error title=English video hub QA::${githubAnnotation(failure)}`);
  }
  process.exit(1);
}
console.log(`English video hub QA passed: native-English library, watch pages, schema, sitemap, runtime filters and responsive layout are coherent (${catalogue?.count || 0} videos).`);
