import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const root = process.cwd();
const testsDir = join(root, 'tests');
const outDir = join(root, 'auditor-nightly');
const tests = readdirSync(testsDir)
  .filter(name => /^audit-.*\.cjs$/i.test(name))
  .sort();

function summarizeFailure(proc, timedOut) {
  if (timedOut) return 'Tempo limite excedido.';
  const raw = String(proc?.stderr || proc?.stdout || proc?.error?.message || `Processo terminou com código ${proc?.status ?? 'desconhecido'}`)
    .replace(/\x1b\[[0-9;]*m/g, '');
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const preferred = lines.find(line => /^(?:AssertionError(?:\s+\[[^\]]+\])?|SyntaxError|ReferenceError|TypeError|RangeError|Error):/.test(line))
    || lines.find(line => /AssertionError|SyntaxError|ReferenceError|TypeError|RangeError/.test(line))
    || lines.find(line => !/^at\s/.test(line) && !/^node:/.test(line))
    || `Processo terminou com código ${proc?.status ?? 'desconhecido'}`;
  return preferred
    .replaceAll(root, '<workspace>')
    .replace(/\/home\/runner\/work\/[^\s:]+/g, '<workspace>')
    .replace(/https:\/\/x-access-token:[^@\s]+@github\.com/gi, 'https://github.com')
    .slice(0, 280);
}

const results = [];
const startedAt = new Date();
const suiteStart = performance.now();

for (const name of tests) {
  const started = performance.now();
  const proc = spawnSync(process.execPath, [join(testsDir, name)], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, HLGB_NIGHTLY_AUDIT: '1' }
  });
  const durationMs = Math.round(performance.now() - started);
  const timedOut = !!proc.error && proc.error.code === 'ETIMEDOUT';
  const ok = !timedOut && proc.status === 0;
  const item = {
    test: basename(name),
    status: ok ? 'passed' : (timedOut ? 'timeout' : 'failed'),
    durationMs
  };
  if (!ok) {
    item.exitCode = Number.isInteger(proc.status) ? proc.status : null;
    item.detail = summarizeFailure(proc, timedOut);
  }
  results.push(item);
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${name} (${durationMs} ms)${ok ? '' : ` — ${item.detail}`}\n`);
}

const durationMs = Math.round(performance.now() - suiteStart);
const passed = results.filter(r => r.status === 'passed').length;
const failed = results.length - passed;
const report = {
  schemaVersion: 1,
  kind: 'hlgb-nightly-code-audit',
  generatedAt: new Date().toISOString(),
  startedAt: startedAt.toISOString(),
  source: 'github-actions',
  repository: process.env.GITHUB_REPOSITORY || 'brunomozersilva-stack/hlgb-confeccoes',
  commit: process.env.GITHUB_SHA || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runNumber: process.env.GITHUB_RUN_NUMBER || null,
  summary: {
    status: failed === 0 ? 'ok' : 'failed',
    tests: results.length,
    passed,
    failed,
    durationMs
  },
  failures: results.filter(r => r.status !== 'passed'),
  slowest: [...results].sort((a,b) => b.durationMs - a.durationMs).slice(0, 10)
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'latest.json'), JSON.stringify(report, null, 2) + '\n');

const lines = [
  'HLGB — Auditor noturno (código)',
  `Gerado: ${report.generatedAt}`,
  `Commit: ${report.commit || '-'}`,
  `Resultado: ${report.summary.status.toUpperCase()}`,
  `Testes: ${report.summary.tests} | Aprovados: ${passed} | Falhas: ${failed}`,
  `Duração: ${durationMs} ms`,
  '',
  failed ? 'Falhas:' : 'Falhas: nenhuma',
  ...report.failures.map(r => `- ${r.test}: ${r.status} (${r.durationMs} ms)${r.detail ? ` — ${r.detail}` : ''}`),
  '',
  'Mais lentos:',
  ...report.slowest.map(r => `- ${r.test}: ${r.durationMs} ms`)
];
writeFileSync(join(outDir, 'latest.txt'), lines.join('\n') + '\n');
writeFileSync(join(outDir, 'exit-code.txt'), String(failed ? 1 : 0) + '\n');

console.log(`Nightly audit: ${passed}/${results.length} passed; ${failed} failed; ${durationMs} ms.`);
