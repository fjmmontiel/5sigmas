#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/multimodalidad-iag/04-evaluacion/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);

    const metrics = page.locator('[data-demo="mm-04-metrics"]');
    if (await metrics.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical evaluation-metrics visual`);
    } else {
      if (await metrics.locator('.met-tab').count() !== 4) failures.push(`${viewport.name}: metrics visual lost one of four canonical tabs`);
      if (await metrics.locator('.met-panel').count() !== 4) failures.push(`${viewport.name}: metrics visual lost one of four canonical panels`);
      if (await metrics.locator('.met-contrast-col').count() !== 2) failures.push(`${viewport.name}: grounding panel lost its two-way evidence contrast`);
      if (await metrics.locator('.met-para-row').count() !== 3) failures.push(`${viewport.name}: consistency panel lost its three paraphrase cases`);
      if (await metrics.locator('.met-loc-col').count() !== 2) failures.push(`${viewport.name}: localization panel lost partial-vs-localized comparison`);
      if (await metrics.locator('.met-calib-case').count() !== 2) failures.push(`${viewport.name}: calibration panel lost poorly-vs-well calibrated cases`);

      const text = (await metrics.textContent()) || '';
      for (const token of [
        'Four dimensions accuracy does not capture',
        'Grounding failure',
        'Diagnostic test',
        'Same image · same question · different phrasings',
        'SEEDBench',
        'Partial understanding',
        'Understanding with localization',
        'Poorly calibrated model',
        'Well-calibrated model',
        'Production failure signal',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: metrics visual missing ${JSON.stringify(token)}`);
      }

      for (const token of [
        'Cuatro dimensiones que la exactitud no captura',
        'Qué mide',
        'Fallo de grounding',
        'Misma imagen · misma pregunta',
        'Comprensión parcial',
        'Modelo mal calibrado',
        'Señal de fallo en producción',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = metrics.locator('.met-tab');
      const panels = metrics.locator('.met-panel');
      for (let index = 0; index < 4; index += 1) {
        await tabs.nth(index).click();
        if (!(await tabs.nth(index).evaluate((node) => node.classList.contains('active')))) {
          failures.push(`${viewport.name}: metrics tab ${index + 1} did not become active`);
        }
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: metrics panel ${index + 1} did not become visible`);
      }

      const [visualClientWidth, visualScrollWidth] = await metrics.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (visualScrollWidth > visualClientWidth + 2) failures.push(`${viewport.name}: metrics visual internal overflow ${visualScrollWidth - visualClientWidth}px`);

      await metrics.screenshot({
        path: path.join(outDir, `english-multimodality-04-metrics-${viewport.name}.png`),
        animations: 'disabled',
      });
    }

    const ocr = page.locator('[data-demo="mm-04-ocr"]');
    if (await ocr.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical OCRBench visual`);
    } else {
      if (await ocr.locator('.ocr-tab').count() !== 3) failures.push(`${viewport.name}: OCRBench visual lost one of three canonical tabs`);
      if (await ocr.locator('.ocr-panel').count() !== 3) failures.push(`${viewport.name}: OCRBench visual lost one of three canonical panels`);
      if (await ocr.locator('.ocr-doc').count() !== 3) failures.push(`${viewport.name}: OCRBench visual lost one of three document examples`);
      if (await ocr.locator('svg').count() !== 3) failures.push(`${viewport.name}: OCRBench visual lost one of three canonical document diagrams`);
      if (await ocr.locator('.ocr-task').count() !== 9) failures.push(`${viewport.name}: OCRBench visual lost canonical task-density examples`);
      if (await ocr.locator('.ocr-chain-step').count() !== 4) failures.push(`${viewport.name}: OCRBench cross-region panel lost its four-step reasoning chain`);
      if (await ocr.locator('.ocr-perf-fill').count() !== 2) failures.push(`${viewport.name}: OCRBench visual lost canonical performance bars`);

      const text = (await ocr.textContent()) || '';
      for (const token of [
        'OCRBench v2: "reading" a document ≠ "reasoning over" it',
        'Straight-line text',
        'Complex layout',
        'Cross-region reasoning',
        'Solved regime',
        'Difficulty zone',
        'Main limit',
        'ANNUAL REPORT — Merged cell →',
        'Taxable base:',
        'Declared VAT:',
        'Required steps',
        '€1,458.53 × 0.21 = €306.29',
        'The gap revealed by OCRBench v2',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: OCRBench visual missing ${JSON.stringify(token)}`);
      }

      for (const token of [
        'Texto en línea recta',
        'Razonamiento cruzado',
        'Caso resuelto',
        'Documento de entrada',
        'Resultado del modelo',
        'Por qué funciona bien aquí',
        'Zona de dificultad',
        'Celda fusionada',
        'Problemas frecuentes',
        'Por qué falla aquí',
        'Límite principal',
        'REGIÓN A',
        'Base imponible',
        'IVA declarado',
        'La pregunta que falla',
        'Pasos necesarios',
        'La brecha que reveló OCRBench v2',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: OCRBench Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = ocr.locator('.ocr-tab');
      const panels = ocr.locator('.ocr-panel');
      for (let index = 0; index < 3; index += 1) {
        await tabs.nth(index).click();
        if (!(await tabs.nth(index).evaluate((node) => node.classList.contains('active')))) {
          failures.push(`${viewport.name}: OCRBench tab ${index + 1} did not become active`);
        }
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: OCRBench panel ${index + 1} did not become visible`);
      }

      const [visualClientWidth, visualScrollWidth] = await ocr.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (visualScrollWidth > visualClientWidth + 2) failures.push(`${viewport.name}: OCRBench visual internal overflow ${visualScrollWidth - visualClientWidth}px`);

      await ocr.screenshot({
        path: path.join(outDir, `english-multimodality-04-ocrbench-${viewport.name}.png`),
        animations: 'disabled',
      });
    }

    const video = page.locator('[data-demo="mm-04-video"]');
    if (await video.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical long-video degradation visual`);
    } else {
      if (await video.locator('.vdg-tab').count() !== 3) failures.push(`${viewport.name}: long-video visual lost one of three duration tabs`);
      if (await video.locator('.vdg-panel').count() !== 3) failures.push(`${viewport.name}: long-video visual lost one of three duration panels`);
      if (await video.locator('.vdg-meter-fill').count() !== 3) failures.push(`${viewport.name}: long-video visual lost one of three performance meters`);
      if (await video.locator('.vdg-tl-window').count() !== 3) failures.push(`${viewport.name}: long-video visual lost one of three attention windows`);
      if (await video.locator('.vdg-attn-map svg').count() !== 3) failures.push(`${viewport.name}: long-video visual lost one of three temporal-attention maps`);
      if (await video.locator('.vdg-exp-task').count() !== 12) failures.push(`${viewport.name}: long-video visual lost canonical task-density examples`);

      const text = (await video.textContent()) || '';
      for (const token of [
        'Video-MME: video understanding does not scale with duration',
        'Short video (≤2 min)',
        'Medium video (15–30 min)',
        'Long video (≥60 min)',
        '78%',
        '54%',
        '38%',
        '24 pp drop versus short video',
        '40 pp drop versus short video · barely above chance level',
        'high coherence · entire video in context',
        'beginning ignored',
        '75% of the video outside context',
        'Implication for production systems',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: long-video visual missing ${JSON.stringify(token)}`);
      }

      for (const token of [
        'la comprensión de vídeo no escala',
        'Vídeo corto',
        'Vídeo medio',
        'Vídeo largo',
        'Exactitud en preguntas temporales',
        'ventana de atención activa',
        'Densidad de atención temporal',
        'Tareas bien resueltas',
        'caída de 24 pp',
        'inicio ignorado',
        'Rendimiento degradado',
        'caída de 40 pp',
        'La mayor parte del vídeo es inaccesible',
        'Rendimiento crítico',
        'Implicación para sistemas en producción',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: long-video Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = video.locator('.vdg-tab');
      const panels = video.locator('.vdg-panel');
      for (let index = 0; index < 3; index += 1) {
        await tabs.nth(index).click();
        if (!(await tabs.nth(index).evaluate((node) => node.classList.contains('active')))) {
          failures.push(`${viewport.name}: long-video tab ${index + 1} did not become active`);
        }
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: long-video panel ${index + 1} did not become visible`);
      }

      const [visualClientWidth, visualScrollWidth] = await video.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (visualScrollWidth > visualClientWidth + 2) failures.push(`${viewport.name}: long-video visual internal overflow ${visualScrollWidth - visualClientWidth}px`);

      await video.screenshot({
        path: path.join(outDir, `english-multimodality-04-video-degradation-${viewport.name}.png`),
        animations: 'disabled',
      });
    }

    const hallusion = page.locator('[data-demo="mm-04-hallucination"]');
    if (await hallusion.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical HallusionBench visual`);
    } else {
      if (await hallusion.locator('.hbl-tab').count() !== 3) failures.push(`${viewport.name}: HallusionBench visual lost one of three canonical tabs`);
      if (await hallusion.locator('.hbl-panel').count() !== 3) failures.push(`${viewport.name}: HallusionBench visual lost one of three canonical panels`);
      if (await hallusion.locator('.hbl-scene svg').count() !== 3) failures.push(`${viewport.name}: HallusionBench visual lost one of three scene diagrams`);
      if (await hallusion.locator('.hbl-response').count() !== 6) failures.push(`${viewport.name}: HallusionBench visual lost hallucinated-vs-correct response pairs`);
      if (await hallusion.locator('.hbl-mechanism').count() !== 3) failures.push(`${viewport.name}: HallusionBench visual lost one of three mechanism explanations`);
      if (await hallusion.locator('.hbl-sum-card').count() !== 3) failures.push(`${viewport.name}: HallusionBench visual lost its three-pattern summary`);

      const text = (await hallusion.textContent()) || '';
      for (const token of [
        'HallusionBench: three patterns of visual hallucination',
        'Claiming what is absent',
        'Denying what is present',
        'Incorrect spatial relation',
        'There is only one glass in the image',
        'Hallucinating model',
        'Correct answer',
        'Underlying mechanism',
        'VAT: €388.97',
        'Taxable base: €1,458.53',
        'The cube is above the sphere',
        'Pattern shared by all three types',
        'language prior outweighs the visual evidence',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: HallusionBench visual missing ${JSON.stringify(token)}`);
      }

      for (const token of [
        'tres patrones de alucinación visual',
        'Afirmar lo ausente',
        'Negar lo presente',
        'Relación espacial errónea',
        'Imagen real',
        'Solo hay un vaso',
        'Modelo hallucinating',
        'Respuesta correcta',
        'Mecanismo subyacente',
        'IVA: €388,97',
        'Base imponible',
        'El cubo está encima de la esfera',
        'Patrón común a los tres tipos',
        'prior lingüístico supera la evidencia visual',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: HallusionBench Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = hallusion.locator('.hbl-tab');
      const panels = hallusion.locator('.hbl-panel');
      for (let index = 0; index < 3; index += 1) {
        await tabs.nth(index).click();
        if (!(await tabs.nth(index).evaluate((node) => node.classList.contains('active')))) {
          failures.push(`${viewport.name}: HallusionBench tab ${index + 1} did not become active`);
        }
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: HallusionBench panel ${index + 1} did not become visible`);
      }

      const [visualClientWidth, visualScrollWidth] = await hallusion.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (visualScrollWidth > visualClientWidth + 2) failures.push(`${viewport.name}: HallusionBench visual internal overflow ${visualScrollWidth - visualClientWidth}px`);

      await hallusion.screenshot({
        path: path.join(outDir, `english-multimodality-04-hallusionbench-${viewport.name}.png`),
        animations: 'disabled',
      });
    }

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: page horizontal overflow ${scrollWidth - clientWidth}px`);
    for (const error of runtimeErrors) failures.push(`${viewport.name}: pageerror: ${error}`);

    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}

console.log('Canonical English Multimodality Chapter 4 QA passed: evaluation metrics, OCRBench, long-video degradation, and HallusionBench preserve canonical tabs/panels, information density, real interactions, English labels, no Spanish leakage, and clean desktop/mobile overflow.');
