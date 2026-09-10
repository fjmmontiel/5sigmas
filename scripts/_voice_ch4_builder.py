#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


def git_blob_sha(text: str) -> str:
    data = text.encode("utf-8")
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


ES = "docs/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md"
EN = "locales/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md"
SNIPPET = "docs/snippets/articulos-tecnicos/voice-action-lifecycle.html"
EN_MIRROR = "locales/en/snippets/articulos-tecnicos/voice-action-lifecycle.html"
EN_I18N = "locales/en/snippets/articulos-tecnicos/voice-action-lifecycle.i18n.json"

es = read(ES)
en = read(EN)

include = '{{ include_html("snippets/articulos-tecnicos/voice-action-lifecycle.html") }}'
es = replace_once(
    es,
    "No son equivalentes.\n\nEl modelo puede emitir dos veces la misma tool call.",
    f"No son equivalentes.\n\n{include}\n\nEl modelo puede emitir dos veces la misma tool call.",
    "ES visual include",
)
en = replace_once(
    en,
    "They are not equivalent.\n\nThe model can emit the same tool call twice.",
    f"They are not equivalent.\n\n{include}\n\nThe model can emit the same tool call twice.",
    "EN visual include",
)

es_livekit_anchor = (
    "Esto resuelve **ownership dentro del runtime**. No sustituye idempotency keys, durable workflow state ni reconciliación con la API externa.\n"
)
es_livekit_insert = es_livekit_anchor + """

### Cancelación y duplicados del runtime no son idempotencia de negocio

Las async tools de LiveKit terminan por defecto aunque el usuario cambie de tema. Si quieres que el LLM pueda detener una llamada en curso, la tool debe optar explícitamente por `ToolFlag.CANCELLABLE`.[^livekit-async-tools] Esa cancelación actúa sobre el trabajo que controla el runtime; no demuestra que una API externa haya revertido un efecto que ya aceptó o confirmó.

LiveKit también documenta políticas para llamadas duplicadas: `allow`, `reject`, `replace` y `confirm`. La detección de duplicados se hace por **nombre de tool, no por argumentos**; `replace` cancela la llamada activa antes de lanzar la nueva y exige que la tool activa sea cancelable.[^livekit-async-tools]

Eso es control de ejecución dentro del agente, no deduplicación de negocio. Dos llamadas con el mismo nombre pueden representar operaciones distintas, y dos tool calls con IDs distintos pueden representar la misma intención humana. La frontera durable sigue siendo `operation_id` + idempotency key + sistema de registro.
"""
es = replace_once(es, es_livekit_anchor, es_livekit_insert, "ES LiveKit current cancellation")

en_livekit_anchor = (
    "That solves **runtime ownership**. It does not replace idempotency keys, durable workflow state, or reconciliation with the external API.\n"
)
en_livekit_insert = en_livekit_anchor + """

### Runtime cancellation and duplicate handling are not business idempotency

LiveKit async tools finish by default even when the user moves on. To let the LLM stop a running call, the tool must explicitly opt in with `ToolFlag.CANCELLABLE`.[^livekit-async-tools] That cancellation acts on work the runtime controls; it does not prove that an external API reversed an effect it already accepted or committed.

LiveKit also documents duplicate-call policies: `allow`, `reject`, `replace`, and `confirm`. Duplicate detection is based on the **tool name, not its arguments**; `replace` cancels the active call before starting the replacement and requires the active tool to be cancellable.[^livekit-async-tools]

That is execution control inside the agent, not business deduplication. Two calls with the same tool name may represent different operations, while two tool-call IDs may represent the same human intent. The durable boundary remains `operation_id` + idempotency key + system of record.
"""
en = replace_once(en, en_livekit_anchor, en_livekit_insert, "EN LiveKit current cancellation")

es_pipecat_anchor = (
    "Las funciones asíncronas también pueden enviar resultados intermedios con `is_final=False` antes del resultado final.[^pipecat-functions]\n"
)
es_pipecat_insert = es_pipecat_anchor + """

La API actual hace otra distinción útil. Una función con `cancel_on_interruption=False` puede exponer `cancellable_by_llm=True`; Pipecat anuncia entonces una tool `cancel_<nombre>` para que el modelo detenga esa llamada. `timeout_secs` limita la ejecución del handler y, al expirar, el handler recibe `asyncio.CancelledError`. La propia documentación advierte que trabajo que el handler haya lanzado en una task independiente **no se cancela con él**.[^pipecat-functions]

Por tanto, incluso una cancelación correcta del handler sigue sin demostrar que el side effect remoto se haya cancelado. El contrato con la API o worker externo debe decir qué ocurrió realmente.
"""
es = replace_once(es, es_pipecat_anchor, es_pipecat_insert, "ES Pipecat current cancellation")

en_pipecat_anchor = (
    "Async functions can also emit intermediate results with `is_final=False` before sending the final result.[^pipecat-functions]\n"
)
en_pipecat_insert = en_pipecat_anchor + """

The current API adds another useful distinction. A function with `cancel_on_interruption=False` can expose `cancellable_by_llm=True`; Pipecat then advertises a matching `cancel_<name>` tool so the model can stop that call. `timeout_secs` bounds handler execution and, when it expires, the handler receives `asyncio.CancelledError`. The documentation explicitly notes that work the handler spawned into an independent task **is not cancelled with the handler**.[^pipecat-functions]

So even successful handler cancellation still does not prove that a remote side effect was cancelled. The contract with the external API or worker must establish the actual outcome.
"""
en = replace_once(en, en_pipecat_anchor, en_pipecat_insert, "EN Pipecat current cancellation")

write(ES, es)
write(EN, en)

snippet = """<section class="s5v s5v-arch-map s5v-action-lifecycle s5v--wide" data-step="1" aria-label="Ciclo de vida de una acción externa durante una conversación de voz">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Estado y efectos</span><h3>Separa lo que el agente dice de lo que el negocio hizo</h3></div><p>Un barge-in puede cortar el audio sin revertir una operación ya admitida.</p></header>
    <div class="s5v-arch-map__panels">
      <div data-panel="1" class="s5v-arch-map__pipe">
        <span>Tool solicitada<br><small>propuesta del modelo</small></span>
        <span>Acción admitida<br><small><code>operation_id</code> persistido</small></span>
        <span>Resultado externo<br><small>COMMITTED · FAILED · UNKNOWN</small></span>
        <span>Resultado observado<br><small>reconciliar antes de hablar</small></span>
      </div>
    </div>
    <div class="s5v__copy"><code>cancel speech</code> no mueve la máquina de estado hacia atrás. Si la respuesta externa se pierde después de enviar una mutación, entra en <code>UNKNOWN</code>: consulta el sistema de registro antes de reintentar. Sólo después decide si el resultado sigue siendo relevante para el turno actual.</div>
  </div>
</section>
"""
write(SNIPPET, snippet)
write(EN_MIRROR, "<!-- 5sigmas-canonical-mirror -->\n")

i18n = {
    "source": "snippets/articulos-tecnicos/voice-action-lifecycle.html",
    "source_blob_sha": git_blob_sha(snippet),
    "replacements": {
        "Ciclo de vida de una acción externa durante una conversación de voz": "Lifecycle of an external action during a voice conversation",
        "Estado y efectos": "State and effects",
        "Separa lo que el agente dice de lo que el negocio hizo": "Separate what the agent says from what the business did",
        "Un barge-in puede cortar el audio sin revertir una operación ya admitida.": "A barge-in can stop the audio without reversing an operation that was already admitted.",
        "Tool solicitada": "Tool requested",
        "propuesta del modelo": "model proposal",
        "Acción admitida": "Action admitted",
        "persistido": "persisted",
        "Resultado externo": "External outcome",
        "Resultado observado": "Result observed",
        "reconciliar antes de hablar": "reconcile before speaking",
        "no mueve la máquina de estado hacia atrás. Si la respuesta externa se pierde después de enviar una mutación, entra en": "does not move the state machine backwards. If the external response is lost after sending a mutation, enter",
        "consulta el sistema de registro antes de reintentar. Sólo después decide si el resultado sigue siendo relevante para el turno actual.": "query the system of record before retrying. Only then decide whether the result is still relevant to the current turn.",
    },
    "forbidden_output_tokens": [
        "Ciclo de vida de una acción externa",
        "Estado y efectos",
        "Separa lo que el agente dice",
        "Un barge-in puede cortar",
        "Tool solicitada",
        "propuesta del modelo",
        "Acción admitida",
        "persistido",
        "Resultado externo",
        "Resultado observado",
        "reconciliar antes de hablar",
        "no mueve la máquina",
        "consulta el sistema de registro",
    ],
}
write(EN_I18N, json.dumps(i18n, ensure_ascii=False, indent=2) + "\n")

mkdocs = read("mkdocs.yml")
mkdocs = replace_once(
    mkdocs,
    "          - Presupuesto de latencia: series/agentes-voz-tiempo-real/03-presupuesto-latencia.md\n",
    "          - Presupuesto de latencia: series/agentes-voz-tiempo-real/03-presupuesto-latencia.md\n          - Tools, estado y acciones asíncronas: series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md\n",
    "ES nav",
)
write("mkdocs.yml", mkdocs)

mkdocs_en = read("mkdocs.en.yml")
mkdocs_en = replace_once(
    mkdocs_en,
    "          - Latency budget: series/agentes-voz-tiempo-real/03-presupuesto-latencia.md\n",
    "          - Latency budget: series/agentes-voz-tiempo-real/03-presupuesto-latencia.md\n          - Tools, state and async actions: series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md\n",
    "EN nav",
)
write("mkdocs.en.yml", mkdocs_en)

manifest = read("locales/en/manifest.yml")
manifest = replace_once(
    manifest,
    "  - series/agentes-voz-tiempo-real/03-presupuesto-latencia.md\n",
    "  - series/agentes-voz-tiempo-real/03-presupuesto-latencia.md\n  - series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md\n",
    "EN manifest route",
)
manifest = replace_once(
    manifest,
    "  - snippets/articulos-tecnicos/voice-latency-critical-path.html\n",
    "  - snippets/articulos-tecnicos/voice-latency-critical-path.html\n  - snippets/articulos-tecnicos/voice-action-lifecycle.html\n",
    "EN manifest snippet",
)
write("locales/en/manifest.yml", manifest)

source_gate = read("scripts/validate_voice_tools_state_ch4_source.mjs")
source_gate = replace_once(
    source_gate,
    "import path from 'node:path';\n",
    "import path from 'node:path';\nimport crypto from 'node:crypto';\n",
    "source gate crypto import",
)
source_gate = replace_once(
    source_gate,
    "const [es, en] = await Promise.all([\n  fs.readFile(esPath, 'utf8'),\n  fs.readFile(enPath, 'utf8'),\n]);\n",
    "const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([\n  fs.readFile(esPath, 'utf8'),\n  fs.readFile(enPath, 'utf8'),\n  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/voice-action-lifecycle.html'), 'utf8'),\n  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/voice-action-lifecycle.html'), 'utf8'),\n  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/voice-action-lifecycle.i18n.json'), 'utf8'),\n  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),\n  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),\n  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),\n]);\nconst i18n = JSON.parse(i18nRaw);\n",
    "source gate supporting files",
)
extra_checks = r'''

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/voice-action-lifecycle.html") }}';
check(es.includes(visualInclude), 'ES: action lifecycle visual include missing');
check(en.includes(visualInclude), 'EN: action lifecycle visual include missing');
check(snippet.includes('s5v-action-lifecycle') && snippet.includes('operation_id') && snippet.includes('UNKNOWN'), 'Visual: action lifecycle mechanism incomplete');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: action lifecycle mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/voice-action-lifecycle.html', 'EN: action lifecycle i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: action lifecycle i18n source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Tool requested', 'Action admitted', 'External outcome', 'Result observed', 'system of record']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN: action lifecycle translation missing ${token}`);
}
check(mkdocsEs.includes('Tools, estado y acciones asíncronas: series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'ES: chapter 4 navigation missing');
check(mkdocsEn.includes('Tools, state and async actions: series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'EN: chapter 4 navigation missing');
check(manifest.includes('series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'EN: chapter 4 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/voice-action-lifecycle.html'), 'EN: chapter 4 required snippet missing');

check(es.includes('`ToolFlag.CANCELLABLE`') && es.includes('nombre de tool, no por argumentos') && es.includes('`replace`'), 'ES: current LiveKit cancellation/duplicate semantics missing');
check(en.includes('`ToolFlag.CANCELLABLE`') && en.includes('tool name, not its arguments') && en.includes('`replace`'), 'EN: current LiveKit cancellation/duplicate semantics missing');
check(es.includes('`cancellable_by_llm=True`') && es.includes('`timeout_secs`') && es.includes('`asyncio.CancelledError`') && es.includes('no se cancela con él'), 'ES: current Pipecat cancellation/timeout semantics missing');
check(en.includes('`cancellable_by_llm=True`') && en.includes('`timeout_secs`') && en.includes('`asyncio.CancelledError`') && en.includes('is not cancelled with the handler'), 'EN: current Pipecat cancellation/timeout semantics missing');
'''
source_gate = replace_once(
    source_gate,
    "\nif (failures.length) {\n",
    extra_checks + "\nif (failures.length) {\n",
    "source gate chapter 4 current contracts",
)
write("scripts/validate_voice_tools_state_ch4_source.mjs", source_gate)

accessibility_gate = r'''#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const cases = [
  {
    locale: 'es',
    route: '/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/',
    tableHeader: 'Necesidad',
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/',
    tableHeader: 'Need',
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.hasTouch,
        isMobile: viewport.hasTouch,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);

      const h1 = (await page.locator('main h1').first().innerText()).trim();
      check(h1.length >= 20, `${testCase.route}: ${viewport.name} missing article h1`);

      const visual = page.locator('.s5v-action-lifecycle');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one action lifecycle visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 20, `${testCase.route}: ${viewport.name} action visual missing meaningful aria-label`);
        const cards = visual.locator('.s5v-arch-map__pipe > span');
        check((await cards.count()) === 4, `${testCase.route}: ${viewport.name} expected four action-boundary cards`);
        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);
        for (let index = 0; index < await cards.count(); index += 1) {
          const box = await cards.nth(index).boundingBox();
          check(Boolean(box && box.width >= (viewport.name === 'mobile' ? 180 : 70)), `${testCase.route}: ${viewport.name} action card ${index + 1} collapsed (${JSON.stringify(box)})`);
          check(Boolean(box && box.height <= 180), `${testCase.route}: ${viewport.name} action card ${index + 1} wraps pathologically (${JSON.stringify(box)})`);
        }
        const copy = (await visual.locator('.s5v__copy').innerText()).trim();
        check(copy.includes('UNKNOWN'), `${testCase.route}: ${viewport.name} UNKNOWN reconciliation missing from visual`);
        check(copy.includes('cancel speech'), `${testCase.route}: ${viewport.name} cancellation boundary missing from visual`);
        if (testCase.locale === 'en') {
          const bodyText = await visual.innerText();
          for (const token of ['Estado y efectos', 'Separa lo que el agente dice', 'Tool solicitada', 'Acción admitida', 'Resultado externo', 'Resultado observado', 'consulta el sistema de registro']) {
            check(!bodyText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
          }
          check(bodyText.includes('system of record'), `${testCase.route}: ${viewport.name} English system-of-record wording missing`);
        }
        await visual.screenshot({
          path: path.join(outDir, `voice-tools-ch4-${testCase.locale}-${viewport.name}-lifecycle.png`),
          animations: 'disabled',
        });
      }

      const documentOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      check(documentOverflow.scrollWidth <= documentOverflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(documentOverflow)}`);

      const runtimeTable = page.locator('main table').filter({ hasText: testCase.tableHeader }).last();
      check((await runtimeTable.count()) === 1, `${testCase.route}: ${viewport.name} runtime decision table missing`);
      if (await runtimeTable.count()) {
        const tableState = await runtimeTable.evaluate((table, args) => {
          const lastHeader = table.querySelector('thead th:last-child');
          if (!lastHeader) return { hasLastHeader: false };
          if (args.viewportName !== 'mobile') {
            const tableBox = table.getBoundingClientRect();
            const lastBox = lastHeader.getBoundingClientRect();
            return { hasLastHeader: true, desktopFits: tableBox.right <= window.innerWidth + 1 && lastBox.right <= window.innerWidth + 1 };
          }
          let scroller = table.parentElement;
          while (scroller && scroller !== document.body) {
            const style = getComputedStyle(scroller);
            const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
            const overflowAllowsScroll = style.overflowX === 'auto' || style.overflowX === 'scroll';
            if (canScroll && overflowAllowsScroll) break;
            scroller = scroller.parentElement;
          }
          if (!scroller || scroller === document.body) return { hasLastHeader: true, hasScroller: false };
          const maxScroll = scroller.scrollWidth - scroller.clientWidth;
          scroller.dataset.s5Ch4ToolsScroller = args.marker;
          scroller.scrollLeft = maxScroll;
          void scroller.offsetWidth;
          const scrollerBox = scroller.getBoundingClientRect();
          const lastBox = lastHeader.getBoundingClientRect();
          return {
            hasLastHeader: true,
            hasScroller: true,
            maxScroll,
            actualScroll: scroller.scrollLeft,
            lastColumnReachable: lastBox.left >= scrollerBox.left - 2 && lastBox.right <= scrollerBox.right + 2,
          };
        }, { viewportName: viewport.name, marker: `${testCase.locale}-${viewport.name}` });
        check(tableState.hasLastHeader === true, `${testCase.route}: ${viewport.name} runtime table last header missing`);
        if (viewport.name === 'desktop') {
          check(tableState.desktopFits === true, `${testCase.route}: desktop runtime decision matrix clipped (${JSON.stringify(tableState)})`);
        } else {
          check(tableState.hasScroller === true, `${testCase.route}: mobile runtime matrix clips without horizontal scroll (${JSON.stringify(tableState)})`);
          check(Number(tableState.maxScroll) > 20 && Number(tableState.actualScroll) > 20, `${testCase.route}: mobile runtime matrix horizontal scroll is inert (${JSON.stringify(tableState)})`);
          check(tableState.lastColumnReachable === true, `${testCase.route}: mobile runtime matrix final column is not reachable (${JSON.stringify(tableState)})`);
          const scroller = page.locator(`[data-s5-ch4-tools-scroller="${testCase.locale}-${viewport.name}"]`);
          if (await scroller.count()) {
            await scroller.screenshot({
              path: path.join(outDir, `voice-tools-ch4-${testCase.locale}-mobile-runtime-table-end.png`),
              animations: 'disabled',
            });
          }
        }
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      await page.screenshot({
        path: path.join(outDir, `voice-tools-ch4-${testCase.locale}-${viewport.name}-page.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Voice tools/state chapter browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice tools/state chapter browser/accessibility QA PASS: ES/EN route language, localized action-lifecycle visual, desktop/mobile geometry, reduced-motion context, runtime-matrix reachability, whole-page overflow, runtime errors and review screenshots are valid.');
'''
write("scripts/validate_voice_tools_state_ch4_accessibility.mjs", accessibility_gate)

workflow = read(".github/workflows/pr-visual-review.yml")
workflow = replace_once(
    workflow,
    "      - name: Validate Realtime Voice Agents chapter 3 accessibility and responsive states\n        run: node scripts/validate_voice_latency_ch3_accessibility.mjs\n",
    "      - name: Validate Realtime Voice Agents chapter 3 accessibility and responsive states\n        run: node scripts/validate_voice_latency_ch3_accessibility.mjs\n\n      - name: Validate Realtime Voice Agents chapter 4 source contract\n        run: node scripts/validate_voice_tools_state_ch4_source.mjs\n\n      - name: Validate Realtime Voice Agents chapter 4 accessibility and responsive states\n        run: node scripts/validate_voice_tools_state_ch4_accessibility.mjs\n",
    "permanent chapter 4 workflow gates",
)
write(".github/workflows/pr-visual-review.yml", workflow)

subprocess.run(["git", "diff", "--check"], cwd=ROOT, check=True)
print("voice chapter 4 builder patch prepared")
print("ES blob candidate", git_blob_sha(es))
print("EN blob candidate", git_blob_sha(en))
print("visual blob candidate", git_blob_sha(snippet))
