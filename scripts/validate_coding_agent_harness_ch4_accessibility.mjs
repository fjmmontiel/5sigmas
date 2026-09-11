#!/usr/bin/env node
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
    route: '/series/coding-agents-agent-harnesses/04-tools-permisos-approvals-hooks-secretos-trust-boundaries/',
    requiredVisual: ['Autoridad · policy · credenciales', 'INPUT NO CONFIABLE', 'ENFORCEMENT DEL HARNESS', 'AUTORIDAD EXTERNA', 'Propuesta del modelo', 'SOLICITUD CANÓNICA', 'Tool + schema', 'Policy', 'Approval ligado', 'Sandbox + red', 'digest mismatch → reaprobar', 'Gate local', 'Credencial proyectada', 'ACL / IAM remoto', 'Gate remoto', 'EFECTO', 'Ledger de autoridad + verifier'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/coding-agents-agent-harnesses/04-tools-permisos-approvals-hooks-secretos-trust-boundaries/',
    requiredVisual: ['Authority · policy · credentials', 'UNTRUSTED INPUT', 'HARNESS ENFORCEMENT', 'EXTERNAL AUTHORITY', 'Model proposal', 'CANONICAL REQUEST', 'Tool + schema', 'Policy', 'Bound approval', 'Sandbox + network', 'digest mismatch → re-approve', 'Local gate', 'Projected credential', 'Remote ACL / IAM', 'Remote gate', 'EFFECT', 'Authority ledger + verifier'],
    forbidden: ['Grafo de autoridad', 'Autoridad · policy', 'Una tool call sólo', 'INPUT NO CONFIABLE', 'ENFORCEMENT DEL HARNESS', 'AUTORIDAD EXTERNA', 'Contexto', 'Propuesta del modelo', 'SOLICITUD CANÓNICA', '¿expuesta?', 'Approval ligado', 'Sandbox + red', 'reaprobar', 'Gate local', 'Credencial proyectada', 'el destino puede rechazar', 'scope del token remoto', 'Gate remoto', 'EFECTO', 'Ledger de autoridad', 'La conjunción es la idea'],
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

async function box(locator) {
  const value = await locator.boundingBox();
  return value ? { x: value.x, y: value.y, width: value.width, height: value.height, right: value.x + value.width, bottom: value.y + value.height } : null;
}

async function assertTables(page, testCase, viewport) {
  const tables = page.locator('main table');
  check((await tables.count()) >= 1, `${testCase.route}: ${viewport.name} expected at least one teaching table`);
  for (let index = 0; index < await tables.count(); index += 1) {
    const table = tables.nth(index);
    const state = await table.evaluate((node, args) => {
      const lastHeader = node.querySelector('thead th:last-child');
      const tableBox = node.getBoundingClientRect();
      if (!lastHeader) return { hasLastHeader: false };
      if (args.viewportName !== 'mobile') {
        const lastBox = lastHeader.getBoundingClientRect();
        return { hasLastHeader: true, desktopFits: tableBox.right <= window.innerWidth + 1 && lastBox.right <= window.innerWidth + 1 };
      }
      let scroller = node.parentElement;
      while (scroller && scroller !== document.body) {
        const style = getComputedStyle(scroller);
        if (scroller.scrollWidth > scroller.clientWidth + 1 && (style.overflowX === 'auto' || style.overflowX === 'scroll')) break;
        scroller = scroller.parentElement;
      }
      if (!scroller || scroller === document.body) return { hasLastHeader: true, hasScroller: false, tableWidth: tableBox.width };
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollLeft = maxScroll;
      void scroller.offsetWidth;
      const scrollerBox = scroller.getBoundingClientRect();
      const lastBox = lastHeader.getBoundingClientRect();
      return { hasLastHeader: true, hasScroller: true, maxScroll, actualScroll: scroller.scrollLeft, lastColumnReachable: lastBox.left >= scrollerBox.left - 2 && lastBox.right <= scrollerBox.right + 2 };
    }, { viewportName: viewport.name });
    check(state.hasLastHeader === true, `${testCase.route}: ${viewport.name} table ${index + 1} missing final header`);
    if (viewport.name === 'desktop') check(state.desktopFits === true, `${testCase.route}: desktop table ${index + 1} clipped (${JSON.stringify(state)})`);
    else if (state.hasScroller) {
      check(Number(state.maxScroll) > 10 && Number(state.actualScroll) > 10, `${testCase.route}: mobile table ${index + 1} horizontal scroll inert (${JSON.stringify(state)})`);
      check(state.lastColumnReachable === true, `${testCase.route}: mobile table ${index + 1} final column unreachable (${JSON.stringify(state)})`);
    } else check(Number(state.tableWidth) <= viewport.width + 1, `${testCase.route}: mobile table ${index + 1} clips without scroller (${JSON.stringify(state)})`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.hasTouch, isMobile: viewport.hasTouch, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const runtimeErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);
      check(((await page.locator('main h1').first().innerText()).trim()).length >= 45, `${testCase.route}: ${viewport.name} missing article h1`);
      check(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), `${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual = page.locator('.s5v-coding-agent-authority-path');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one authority graph`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 45, `${testCase.route}: ${viewport.name} authority graph missing meaningful aria-label`);
        const visualText = (await visual.innerText()).toLocaleLowerCase();
        for (const token of testCase.requiredVisual) check(visualText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!visualText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} legacy card pipe returned`);
        check((await visual.locator('button').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic controls returned`);

        const scroll = visual.locator('.s5v-authority__scroll');
        check((await scroll.getAttribute('tabindex')) === '0', `${testCase.route}: ${viewport.name} horizontal topology region is not keyboard-focusable`);
        check((await scroll.getAttribute('role')) === 'region', `${testCase.route}: ${viewport.name} topology scroller missing region role`);
        const scrollState = await scroll.evaluate((node, args) => {
          const style = getComputedStyle(node);
          const before = node.scrollLeft;
          const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
          if (args.viewportName === 'mobile') node.scrollLeft = maxScroll;
          void node.offsetWidth;
          return { overflowX: style.overflowX, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, maxScroll, before, after: node.scrollLeft };
        }, { viewportName: viewport.name });
        if (viewport.name === 'mobile') {
          check(scrollState.maxScroll > 300, `${testCase.route}: mobile authority topology collapsed instead of scrolling (${JSON.stringify(scrollState)})`);
          check(scrollState.after > 250, `${testCase.route}: mobile authority scroll cannot reach external-authority region (${JSON.stringify(scrollState)})`);
        } else {
          check(scrollState.scrollWidth <= scrollState.clientWidth + 4, `${testCase.route}: desktop authority graph unexpectedly requires horizontal scrolling (${JSON.stringify(scrollState)})`);
        }

        if (viewport.name === 'mobile') await scroll.evaluate((node) => { node.scrollLeft = 0; });
        const untrusted = await box(visual.locator('[data-boundary="untrusted"]'));
        const harness = await box(visual.locator('[data-boundary="harness"]'));
        const external = await box(visual.locator('[data-boundary="external"]'));
        const contextBox = await box(visual.locator('[data-node="context"]'));
        const proposal = await box(visual.locator('[data-node="proposal"]'));
        const request = await box(visual.locator('[data-node="canonical-request"]'));
        const tool = await box(visual.locator('[data-control="tool-schema"]'));
        const policy = await box(visual.locator('[data-control="policy"]'));
        const approval = await box(visual.locator('[data-control="approval"]'));
        const sandbox = await box(visual.locator('[data-control="sandbox-network"]'));
        const changed = await box(visual.locator('[data-node="request-changed"]'));
        const localGate = await box(visual.locator('[data-node="local-gate"]'));
        const invocation = await box(visual.locator('[data-node="effective-invocation"]'));
        const credential = await box(visual.locator('[data-control="credential"]'));
        const remoteAcl = await box(visual.locator('[data-control="remote-acl"]'));
        const remoteGate = await box(visual.locator('[data-node="remote-gate"]'));
        const effect = await box(visual.locator('[data-outcome="effect"]'));
        const evidence = await box(visual.locator('[data-node="evidence"]'));
        const deny = await box(visual.locator('[data-outcome="deny-reask"]'));

        for (const [name, value] of Object.entries({ untrusted, harness, external, contextBox, proposal, request, tool, policy, approval, sandbox, changed, localGate, invocation, credential, remoteAcl, remoteGate, effect, evidence, deny })) check(Boolean(value), `${testCase.route}: ${viewport.name} missing geometry for ${name}`);
        if ([untrusted, harness, external, contextBox, proposal, request, tool, policy, approval, sandbox, changed, localGate, invocation, credential, remoteAcl, remoteGate, effect, evidence, deny].every(Boolean)) {
          check(untrusted.right < harness.x && harness.right < external.x, `${testCase.route}: ${viewport.name} trust domains do not remain spatially distinct`);
          check(contextBox.x >= untrusted.x && proposal.x >= untrusted.x && proposal.right <= untrusted.right + 2, `${testCase.route}: ${viewport.name} context/proposal escaped untrusted-input region`);
          check(request.x >= harness.x && request.right <= harness.right + 2, `${testCase.route}: ${viewport.name} canonical request escaped harness region`);
          check(tool.x < policy.x && Math.abs(tool.y - policy.y) < 8, `${testCase.route}: ${viewport.name} tool and policy controls are not parallel peers`);
          check(approval.x < sandbox.x && Math.abs(approval.y - sandbox.y) < 8, `${testCase.route}: ${viewport.name} approval and sandbox controls are not parallel peers`);
          check(localGate.y > tool.bottom && localGate.y > approval.y, `${testCase.route}: ${viewport.name} local gate does not follow independent controls`);
          check(changed.y > approval.y && changed.x < localGate.x, `${testCase.route}: ${viewport.name} TOCTOU/reapproval path lost its distinct position`);
          check(invocation.x >= harness.x && invocation.right <= harness.right + 2, `${testCase.route}: ${viewport.name} effective invocation escaped local harness boundary`);
          check(credential.x >= external.x && remoteAcl.x >= external.x && remoteGate.x >= external.x, `${testCase.route}: ${viewport.name} remote credential/ACL/gate not separated from local sandbox authority`);
          check(effect.x >= external.x, `${testCase.route}: ${viewport.name} external effect rendered inside local authority domain`);
          check(evidence.y > invocation.y && evidence.y > effect.y && evidence.width > 500, `${testCase.route}: ${viewport.name} evidence ledger no longer receives outcomes below the graph`);
          check(deny.x < localGate.x && deny.y >= localGate.y, `${testCase.route}: ${viewport.name} deny/re-ask branch is not a distinct outcome`);
        }

        for (const edge of ['request-to-tool','request-to-policy','request-to-approval','request-to-sandbox','request-change-to-approval','tool-to-local-gate','policy-to-local-gate','approval-to-local-gate','sandbox-to-local-gate','local-gate-to-invocation','credential-to-remote-gate','acl-to-remote-gate','invocation-to-remote-gate','remote-gate-reject','remote-gate-effect','deny-to-evidence','reject-to-evidence','effect-to-evidence']) {
          check((await visual.locator(`[data-edge="${edge}"]`).count()) === 1, `${testCase.route}: ${viewport.name} authority edge missing ${edge}`);
        }

        await visual.screenshot({ path: path.join(outDir, `coding-harness-ch4-${testCase.locale}-${viewport.name}-visual-start.png`), animations: 'disabled' });
        if (viewport.name === 'mobile') {
          await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth - node.clientWidth; });
          await visual.screenshot({ path: path.join(outDir, `coding-harness-ch4-${testCase.locale}-${viewport.name}-visual-end.png`), animations: 'disabled' });
        }
      }

      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);
      await assertTables(page, testCase, viewport);

      const articleText = (await page.locator('main').innerText()).toLocaleLowerCase();
      for (const token of ['tool_available', 'policy_authority', 'approval_subject', 'arguments_digest', 'credential_identity', 'credential_value_logged', 'network_destination', 'verification_head_sha']) check(articleText.includes(token), `${testCase.route}: ${viewport.name} production invariant missing ${token}`);
      check(articleText.includes('post-hook != preventive control'), `${testCase.route}: ${viewport.name} hook timing invariant missing`);
      check(articleText.includes('t(a)') && articleText.includes('p(a)') && articleText.includes('s(a)') && articleText.includes('c(a)') && articleText.includes('r(a)') && articleText.includes('a(a)'), `${testCase.route}: ${viewport.name} executable authority predicate incomplete`);

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path: path.join(outDir, `coding-harness-ch4-${testCase.locale}-${viewport.name}-page.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Coding agent harness chapter 2.4 browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Coding agent harness chapter 2.4 browser/accessibility QA PASS: ES/EN localization, relationship-first authority topology, independent controls, TOCTOU re-approval, local-vs-remote authority boundaries, outcome evidence, reduced-motion, desktop/mobile reachability, table reachability, page overflow and runtime errors are valid.');
