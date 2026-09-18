import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const childScript = 'scripts/audit_browser_resources.mjs';
const reportPath = path.resolve('artifacts/security-requalification/shared-browser-resources/report.json');
const detailDir = path.resolve('artifacts/security-requalification/shared-browser-resources/context-runs');
const defaultProfiles = ['desktop-normal', 'desktop-reduced', 'mobile-normal', 'mobile-reduced'];
const defaultTimeoutMs = Number.parseInt(process.env.S5_BROWSER_RESOURCE_CONTEXT_PROCESS_TIMEOUT_MS ?? '45000', 10);
const maxCapturedLogChars = 6000;

const parseCsv = (value) => (value ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const safeName = (value) => value
  .replace(/^\/+|\/+$/g, '')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'root';

const tail = (value) => value.length > maxCapturedLogChars
  ? value.slice(value.length - maxCapturedLogChars)
  : value;

const runProcess = ({ command, args, env, timeoutMs }) => new Promise((resolve) => {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let settled = false;

  child.stdout.on('data', (chunk) => { stdout = tail(stdout + chunk.toString()); });
  child.stderr.on('data', (chunk) => { stderr = tail(stderr + chunk.toString()); });

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, timeoutMs);

  child.on('error', (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve({ exitCode: null, signal: null, timedOut, stdout, stderr, spawnError: error.message });
  });
  child.on('close', (exitCode, signal) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve({ exitCode, signal, timedOut, stdout, stderr, spawnError: null });
  });
});

const runSelfTest = async () => {
  const quick = await runProcess({
    command: process.execPath,
    args: ['-e', 'process.stdout.write("ok")'],
    env: {},
    timeoutMs: 1000,
  });
  if (quick.exitCode !== 0 || quick.timedOut || quick.stdout !== 'ok') {
    throw new Error(`bounded runner self-test quick child failed: ${JSON.stringify(quick)}`);
  }

  const slow = await runProcess({
    command: process.execPath,
    args: ['-e', 'setTimeout(() => {}, 5000)'],
    env: {},
    timeoutMs: 100,
  });
  if (!slow.timedOut) {
    throw new Error(`bounded runner self-test did not kill stalled child: ${JSON.stringify(slow)}`);
  }

  console.log(JSON.stringify({ self_test: 'PASS', quick_exit: quick.exitCode, stalled_child_killed: true }));
};

if (process.argv.includes('--self-test')) {
  await runSelfTest();
  process.exit(0);
}

if (!Number.isInteger(defaultTimeoutMs) || defaultTimeoutMs < 5000 || defaultTimeoutMs > 120000) {
  throw new Error('S5_BROWSER_RESOURCE_CONTEXT_PROCESS_TIMEOUT_MS must be an integer between 5000 and 120000');
}

const routes = parseCsv(process.env.S5_BROWSER_RESOURCE_PATHS);
const profiles = parseCsv(process.env.S5_BROWSER_RESOURCE_PROFILES);
const selectedProfiles = profiles.length ? profiles : defaultProfiles;
if (!routes.length) {
  throw new Error('S5_BROWSER_RESOURCE_PATHS is required for bounded shared-browser regression');
}

await fs.mkdir(detailDir, { recursive: true });
const tasks = routes.flatMap((route) => selectedProfiles.map((profile) => ({ route, profile })));
const contexts = [];
const failures = [];
let expectedAbortCount = 0;
const startedAt = Date.now();

for (const [index, task] of tasks.entries()) {
  await fs.rm(reportPath, { force: true });
  const result = await runProcess({
    command: process.execPath,
    args: [childScript],
    env: {
      S5_BROWSER_RESOURCE_PATHS: task.route,
      S5_BROWSER_RESOURCE_PROFILES: task.profile,
      S5_BROWSER_RESOURCE_CONCURRENCY: '1',
    },
    timeoutMs: defaultTimeoutMs,
  });

  let childReport = null;
  try {
    childReport = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  } catch {
    childReport = null;
  }

  const label = `${task.route} [${task.profile}]`;
  const detailPath = path.join(detailDir, `${String(index + 1).padStart(2, '0')}-${safeName(task.route)}-${task.profile}.json`);
  const detail = {
    label,
    route: task.route,
    profile: task.profile,
    timeout_ms: defaultTimeoutMs,
    process: result,
    child_report: childReport,
  };
  await fs.writeFile(detailPath, `${JSON.stringify(detail, null, 2)}\n`, 'utf8');

  if (result.timedOut) {
    failures.push(`${label}: CONTEXT_PROCESS_TIMEOUT after ${defaultTimeoutMs}ms; child was killed fail-closed`);
  } else if (result.spawnError) {
    failures.push(`${label}: child spawn error: ${result.spawnError}`);
  } else if (result.exitCode !== 0) {
    failures.push(`${label}: child exited ${result.exitCode}; stderr_tail=${JSON.stringify(result.stderr)}`);
  }

  if (!childReport) {
    failures.push(`${label}: child report missing or unreadable`);
  } else {
    if (childReport.contexts_expected !== 1 || childReport.contexts_observed !== 1 || childReport.complete !== true) {
      failures.push(
        `${label}: child report incomplete expected=1 observed=${childReport.contexts_observed ?? 'missing'} `
        + `complete=${childReport.complete ?? 'missing'}`,
      );
    }
    if ((childReport.failure_count ?? 0) > 0) {
      for (const failure of childReport.failures ?? []) failures.push(`${label}: ${failure}`);
    }
    expectedAbortCount += Number(childReport.expected_abort_count ?? 0);
    for (const context of childReport.contexts ?? []) contexts.push(context);
  }

  console.log(
    `[bounded-shared-browser] ${index + 1}/${tasks.length} ${label} `
    + `exit=${result.exitCode} timeout=${result.timedOut} observed=${childReport?.contexts_observed ?? 0}`,
  );
}

const combined = {
  schema_version: 7,
  verdict_basis: 'ISOLATED_CONTEXT_CHILD_PROCESS_POST_TEARDOWN_OR_FAIL_CLOSED_PROCESS_TIMEOUT',
  execution_model: 'SEQUENTIAL_ISOLATED_CONTEXT_CHILD_PROCESSES_WITH_HARD_DEADLINE',
  complete: contexts.length === tasks.length && failures.length === 0,
  context_process_timeout_ms: defaultTimeoutMs,
  elapsed_ms: Date.now() - startedAt,
  paths: routes,
  profiles: selectedProfiles,
  contexts_expected: tasks.length,
  contexts_observed: contexts.length,
  mutation_fixture_count_per_child: 20,
  expected_abort_count: expectedAbortCount,
  failure_count: failures.length,
  failures,
  contexts,
  detail_directory: detailDir,
};
await fs.writeFile(reportPath, `${JSON.stringify(combined, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  complete: combined.complete,
  contexts_expected: combined.contexts_expected,
  contexts_observed: combined.contexts_observed,
  failure_count: combined.failure_count,
  elapsed_ms: combined.elapsed_ms,
  context_process_timeout_ms: combined.context_process_timeout_ms,
}, null, 2));

if (!combined.complete) process.exit(1);
