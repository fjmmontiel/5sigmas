#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/from-cave-to-agi/03-aprender/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, {recursive: true});
const browser = await chromium.launch({headless: true});

for (const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]) {
  const page = await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
  const response = await page.goto(`${base}${route}`, {waitUntil:'networkidle'});
  if (!response?.ok()) failures.push(`HTTP ${response?.status() ?? 'no response'}`);
  const body = await page.locator('body').innerText();
  for (const phrase of ['Chapter 3 — Learn','Logic Theorist','MYCIN','Vapnik','Rumelhart, Hinton and Williams','AlexNet']) {
    if (!body.includes(phrase)) failures.push(`missing canonical Chapter 3 narrative phrase ${JSON.stringify(phrase)}`);
  }

  const symbolic = page.locator('.sim-wrap');
  if (await symbolic.count() !== 1) failures.push(`expected one canonical symbolic-AI visual, found ${await symbolic.count()}`);
  else {
    const allText = (await symbolic.textContent()) || '';
    for (const phrase of [
      'Symbolic AI: knowledge written by hand',
      'Paradigm',
      'MYCIN',
      'The limit',
      'Intelligence as a list of rules',
      'MYCIN — 450 rules to diagnose infections',
      'The bottleneck: acquiring the knowledge'
    ]) if (!allText.includes(phrase)) failures.push(`canonical symbolic-AI visual missing ${JSON.stringify(phrase)}`);

    if (await symbolic.locator('.sim-step').count() !== 3) failures.push(`expected 3 canonical symbolic-AI steps, found ${await symbolic.locator('.sim-step').count()}`);
    if (await symbolic.locator('.sim-panel').count() !== 3) failures.push(`expected 3 canonical symbolic-AI panels, found ${await symbolic.locator('.sim-panel').count()}`);
    if (await symbolic.locator('.sim-rule').count() !== 3) failures.push(`expected 3 canonical MYCIN rule rows, found ${await symbolic.locator('.sim-rule').count()}`);
    if (await symbolic.locator('.sim-sc-row').count() !== 3) failures.push(`expected 3 canonical symbolic-AI scale rows, found ${await symbolic.locator('.sim-sc-row').count()}`);
    try {
      await page.waitForFunction(() => document.querySelector('[data-demo="03-simbolica"]')?.dataset.simReady === '1', null, {timeout: 2000});
    } catch {
      failures.push(`symbolic-AI runtime did not boot on ${viewport.name}`);
    }

    const next = symbolic.locator('#sim-next');
    await next.click();
    if (!(await symbolic.locator('[data-p="1"]').evaluate(el => el.classList.contains('sim-panel--active')))) failures.push('symbolic-AI Next did not activate MYCIN panel');
    await next.click();
    if (!(await symbolic.locator('[data-p="2"]').evaluate(el => el.classList.contains('sim-panel--active')))) failures.push('symbolic-AI Next did not activate limit panel');
    if (!(await next.isDisabled())) failures.push('symbolic-AI Next control was not disabled on final panel');
    await symbolic.locator('#sim-prev').click();
    if (!(await symbolic.locator('[data-p="1"]').evaluate(el => el.classList.contains('sim-panel--active')))) failures.push('symbolic-AI Previous did not return to MYCIN panel');
    await symbolic.locator('[data-s="0"]').click();
    if (!(await symbolic.locator('[data-p="0"]').evaluate(el => el.classList.contains('sim-panel--active')))) failures.push('symbolic-AI stepper did not return to paradigm panel');

    for (const forbidden of [
      'IA simbólica','Durante tres décadas','Paradigma','El límite','La inteligencia como lista','Ejemplo real',
      'reglas para diagnosticar','El techo','El cuello de botella','Dominio estrecho','Dominio medio','Dominio abierto','Anterior','Siguiente'
    ]) if (allText.includes(forbidden)) failures.push(`symbolic-AI Spanish leakage ${JSON.stringify(forbidden)}`);
  }

  const loop = page.locator('.buc-wrap');
  if (await loop.count() !== 1) failures.push(`expected one canonical training loop, found ${await loop.count()}`);
  else {
    const allText = (await loop.textContent()) || '';
    for (const phrase of [
      'The training loop: three pieces, one mechanism',
      'Measure the error',
      'Propagate',
      'Adjust',
      'Piece 1 · Probability',
      'Piece 2 · Backpropagation',
      'Piece 3 · Optimization',
      'The complete loop'
    ]) if (!allText.includes(phrase)) failures.push(`canonical training-loop visual missing ${JSON.stringify(phrase)}`);

    if (await loop.locator('.buc-step').count() !== 3) failures.push(`expected 3 canonical training-loop steps, found ${await loop.locator('.buc-step').count()}`);
    if (await loop.locator('.buc-panel').count() !== 3) failures.push(`expected 3 canonical training-loop panels, found ${await loop.locator('.buc-panel').count()}`);
    try {
      await page.waitForFunction(() => document.querySelector('[data-demo="03-bucle-entrenamiento"]')?.dataset.bucReady === '1', null, {timeout: 2000});
    } catch {
      failures.push(`training-loop runtime did not boot on ${viewport.name}`);
    }

    const next = loop.locator('#buc-next');
    await next.click();
    if (!(await loop.locator('[data-p="1"]').evaluate(el => el.classList.contains('buc-panel--active')))) failures.push('training-loop Next did not activate backpropagation panel');
    await next.click();
    if (!(await loop.locator('[data-p="2"]').evaluate(el => el.classList.contains('buc-panel--active')))) failures.push('training-loop Next did not activate optimization panel');
    if (!(await next.isDisabled())) failures.push('training-loop Next control was not disabled on final panel');
    await loop.locator('#buc-prev').click();
    if (!(await loop.locator('[data-p="1"]').evaluate(el => el.classList.contains('buc-panel--active')))) failures.push('training-loop Previous did not return to backpropagation panel');
    await loop.locator('[data-s="0"]').click();
    if (!(await loop.locator('[data-p="0"]').evaluate(el => el.classList.contains('buc-panel--active')))) failures.push('training-loop stepper did not return to loss panel');

    for (const forbidden of [
      'El bucle de entrenamiento','Todo modelo de aprendizaje automático','Medir el error','Pieza 1','Cuantificar cuánto',
      'Función de pérdida','Pieza 2','Distribuir la responsabilidad','Pieza 3','Descenso de gradiente estocástico',
      'El bucle completo','Predecir','Anterior','Siguiente'
    ]) if (allText.includes(forbidden)) failures.push(`training-loop Spanish leakage ${JSON.stringify(forbidden)}`);
  }

  const dims = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
  if (dims[1] > dims[0] + 2) failures.push(`${viewport.name} horizontal overflow`);
  if (viewport.name === 'desktop') await page.screenshot({path:path.join(outDir,'english-history-03-learn.png'),fullPage:true});
  await page.close();
}

await browser.close();
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log('English history chapter 3 QA passed with canonical symbolic-AI and training-loop structure, interaction and translation fidelity.');
