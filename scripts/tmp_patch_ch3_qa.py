from pathlib import Path
import re

path = Path('scripts/validate_english_foundations_complete.mjs')
text = path.read_text(encoding='utf-8')

page_pattern = re.compile(
    r"  \{\n"
    r"    route: '/en/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/',\n"
    r".*?"
    r"    screenshot: 'english-foundations-03-comparison\.png',\n"
    r"  \},",
    re.S,
)
page_replacement = '''  {
    route: '/en/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/',
    title: 'Chapter 3 — AI vs Generative AI',
    media: '03-ia-vs-ia-generativa',
    concepts: ['determinism', 'evaluation', 'RAG', 'agent'],
    visuals: [
      '[data-demo="fnd-five-differences"]',
      '[data-demo="03-decision-tree"]',
      '[data-demo="03-matriz-operacional"]',
      '[data-demo="03-deteccion-fraude"]',
    ],
    demoIds: [],
    audio: false,
    requireDetails: false,
    screenshot: 'english-foundations-03-comparison.png',
  },'''
text, count = page_pattern.subn(page_replacement, text, count=1)
if count != 1:
    raise SystemExit(f'expected one Chapter 3 page contract, replaced {count}')

if 'const chapterThreeForbidden = [' not in text:
    marker = 'const failures = [];'
    forbidden = '''const chapterThreeForbidden = [
  'Cinco diferencias',
  'Entradas y salidas',
  '¿Qué tecnología necesitas?',
  'Pregunta 1 de 4',
  'La matriz operacional',
  'Cuando usarlo',
  'Detección de fraude',
  'Qué hace',
  'Por qué funciona',
  'Cuándo aporta valor',
  'Agente — investigación',
];

'''
    if marker not in text:
        raise SystemExit('failure marker not found')
    text = text.replace(marker, forbidden + marker, 1)

function = r'''
async function validateChapterThreeCanonicalVisuals(page, entry) {
  if (!entry.route.includes('/03-ia-vs-ia-generativa/')) return;

  const differences = page.locator('[data-demo="fnd-five-differences"]');
  if (await differences.count() !== 1) {
    failures.push(`${entry.route}: canonical five-differences visual missing`);
  } else {
    if (!(await differences.evaluate((element) => element.hasAttribute('data-anim-tabs')))) {
      failures.push(`${entry.route}: five-differences canonical tab runtime missing`);
    }
    if ((await differences.getAttribute('data-default')) !== 'io') {
      failures.push(`${entry.route}: five-differences canonical default changed`);
    }
    const tabs = differences.locator('[data-role="tab"][data-tab]');
    const actual = await tabs.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-tab')));
    if (JSON.stringify(actual) !== JSON.stringify(['io', 'det', 'exp', 'eval', 'riesgos'])) {
      failures.push(`${entry.route}: five-differences tab sequence changed: ${JSON.stringify(actual)}`);
    }
    if (await differences.locator('.dif-panel[data-panel]').count() !== 5) {
      failures.push(`${entry.route}: five-differences canonical panel density changed`);
    }
    for (const tab of ['io', 'det', 'exp', 'eval', 'riesgos']) {
      await differences.locator(`[data-role="tab"][data-tab="${tab}"]`).click();
      if (await differences.locator('.dif-panel[data-panel]:visible').count() !== 1) {
        failures.push(`${entry.route}: five-differences tab ${tab} exposes wrong panel count`);
      }
    }
    const copy = await differences.innerText();
    for (const required of ['Classical AI vs Generative AI: five differences', 'Inputs and outputs', 'Determinism', 'Explainability', 'Evaluation', 'Risks']) {
      if (!copy.includes(required)) failures.push(`${entry.route}: five-differences missing English canonical copy ${JSON.stringify(required)}`);
    }
  }

  const decision = page.locator('[data-demo="03-decision-tree"]');
  if (await decision.count() !== 1) {
    failures.push(`${entry.route}: canonical technology decision tree missing`);
  } else {
    if (await decision.locator('#dt-stage').count() !== 1 || await decision.locator('#dt-path-row').count() !== 1) {
      failures.push(`${entry.route}: decision-tree canonical stage/path contract missing`);
    }
    const initial = await decision.innerText();
    for (const required of ['Which technology do you need?', 'Question 1 of 4', 'Yes →', 'No']) {
      if (!initial.includes(required)) failures.push(`${entry.route}: decision-tree missing English canonical copy ${JSON.stringify(required)}`);
    }
    const yes = decision.locator('.dt-btn[data-ans="yes"]');
    if (await yes.count() !== 1) {
      failures.push(`${entry.route}: decision-tree Yes control missing`);
    } else {
      await yes.click();
      const result = await decision.innerText();
      for (const required of ['Recommended technology', 'Explicit rules', 'Cost: minimal', 'Evaluation: trivial']) {
        if (!result.includes(required)) failures.push(`${entry.route}: decision-tree result missing ${JSON.stringify(required)}`);
      }
      const restart = decision.locator('.dt-restart');
      if (await restart.count() !== 1) {
        failures.push(`${entry.route}: decision-tree restart control missing`);
      } else {
        await restart.click();
        if (!(await decision.innerText()).includes('Question 1 of 4')) {
          failures.push(`${entry.route}: decision-tree restart did not restore canonical first question`);
        }
      }
    }
  }

  const matrix = page.locator('[data-demo="03-matriz-operacional"]');
  if (await matrix.count() !== 1) {
    failures.push(`${entry.route}: canonical operational matrix missing`);
  } else {
    if ((await matrix.getAttribute('data-default')) !== 'reglas') {
      failures.push(`${entry.route}: operational-matrix canonical default changed`);
    }
    const nodes = matrix.locator('.mx-sp-node[data-tab]');
    const actual = await nodes.evaluateAll((items) => items.map((item) => item.getAttribute('data-tab')));
    if (JSON.stringify(actual) !== JSON.stringify(['reglas', 'ml', 'llm', 'rag', 'agente'])) {
      failures.push(`${entry.route}: operational-matrix sequence changed: ${JSON.stringify(actual)}`);
    }
    if (await matrix.locator('.mx-panel[data-panel]').count() !== 5) {
      failures.push(`${entry.route}: operational-matrix canonical panel density changed`);
    }
    for (const tab of ['reglas', 'ml', 'llm', 'rag', 'agente']) {
      await matrix.locator(`.mx-sp-node[data-tab="${tab}"]`).click();
      if (await matrix.locator('.mx-panel[data-panel]:visible').count() !== 1) {
        failures.push(`${entry.route}: operational-matrix tab ${tab} exposes wrong panel count`);
      }
    }
    const copy = await matrix.innerText();
    for (const required of ['The operational matrix', 'Explicit rules', 'Classical ML', 'Plain LLM', 'LLM + RAG', 'Agent']) {
      if (!copy.includes(required)) failures.push(`${entry.route}: operational matrix missing English canonical copy ${JSON.stringify(required)}`);
    }
  }

  const fraud = page.locator('[data-demo="03-deteccion-fraude"]');
  if (await fraud.count() !== 1) {
    failures.push(`${entry.route}: canonical fraud-detection visual missing`);
  } else {
    if ((await fraud.getAttribute('data-default')) !== 'reglas') {
      failures.push(`${entry.route}: fraud visual canonical default changed`);
    }
    const nodes = fraud.locator('.fd-node[data-tab]');
    const actual = await nodes.evaluateAll((items) => items.map((item) => item.getAttribute('data-tab')));
    if (JSON.stringify(actual) !== JSON.stringify(['reglas', 'ml', 'rag', 'agente'])) {
      failures.push(`${entry.route}: fraud visual sequence changed: ${JSON.stringify(actual)}`);
    }
    if (await fraud.locator('.fd-panel[data-panel]').count() !== 4) {
      failures.push(`${entry.route}: fraud visual canonical panel density changed`);
    }
    for (const tab of ['reglas', 'ml', 'rag', 'agente']) {
      await fraud.locator(`.fd-node[data-tab="${tab}"]`).click();
      if (await fraud.locator('.fd-panel[data-panel]:visible').count() !== 1) {
        failures.push(`${entry.route}: fraud visual tab ${tab} exposes wrong panel count`);
      }
    }
    const copy = await fraud.innerText();
    for (const required of ['Fraud detection across the matrix', 'Rules', 'Classical ML', 'LLM + RAG', 'Agent']) {
      if (!copy.includes(required)) failures.push(`${entry.route}: fraud visual missing English canonical copy ${JSON.stringify(required)}`);
    }
  }

  const pageText = await page.locator('body').innerText();
  for (const token of chapterThreeForbidden) {
    if (pageText.includes(token)) failures.push(`${entry.route}: Chapter 3 Spanish leakage ${JSON.stringify(token)}`);
  }
}
'''
if 'async function validateChapterThreeCanonicalVisuals' not in text:
    try_marker = '\ntry {\n  for (const entry of pages) {'
    if try_marker not in text:
        raise SystemExit('try marker not found')
    text = text.replace(try_marker, function + try_marker, 1)

call = '      await validateMLOps(page, entry);'
if 'await validateChapterThreeCanonicalVisuals(page, entry);' not in text:
    if call not in text:
        raise SystemExit('validator call marker not found')
    text = text.replace(call, call + '\n      await validateChapterThreeCanonicalVisuals(page, entry);', 1)

path.write_text(text, encoding='utf-8')
