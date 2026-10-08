// Run with jsdom available on NODE_PATH. No application data or network is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (!process.argv.includes('--child')) {
  const result = spawnSync(process.execPath, [__filename, '--child'], {
    encoding: 'utf8', timeout: 5000, env: process.env,
  });
  assert.equal(result.error?.code, undefined,
    'Hub layout must let timers run; observer/microtask feedback starved the event loop');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  process.stdout.write(result.stdout);
} else {
  const { JSDOM } = require('jsdom');
  const root = path.join(__dirname, '..');
  const base = fs.readFileSync(path.join(root, 'app9240.html'), 'utf8');
  const hub = base.match(/<section id="hubFinanceiro"[\s\S]*?<\/section>/)[0];
  const dom = new JSDOM('<!doctype html><head></head><body>' + hub + '</body>', {
    url: 'https://example.test', runScripts: 'outside-only',
  });
  const w = dom.window;
  w.console.info = () => {};
  // Preserve the hidden pre-login Hub from the actual base HTML.
  w.document.getElementById('hubFinanceiro').style.display = 'none';
  w.eval(fs.readFileSync(path.join(root, 'release-runtime-recovery-v9326.js'), 'utf8'));
  const wait = () => new Promise(resolve => setTimeout(resolve, 25));
  (async () => {
    await wait();
    const api = w.hlgbRuntimeRecovery9326;
    const runs = api.state().layoutRuns;
    await wait();
    assert.equal(api.state().layoutRuns, runs, 'idle layout must settle');
    let mutations = 0;
    const observer = new w.MutationObserver(records => { mutations += records.length; });
    const top = w.document.getElementById('hlgbHubTop9326');
    observer.observe(top, { childList: true, subtree: true });
    for (let i = 0; i < 5; i++) api.organizeHub();
    await wait();
    assert.equal(mutations, 0, 'organizing correctly placed panels must not mutate DOM');
    const page = w.document.getElementById('hubFinanceiro');
    const week = w.document.getElementById('hubFinanceWeek').closest('.panel');
    const planned = w.document.getElementById('hubFinanceEntriesTable').closest('.panel');
    page.appendChild(planned);
    await wait();
    assert.equal(planned.parentElement, top, 'external redraw must still be repaired');
    assert(top.contains(week), 'weekly controls must remain present');
    assert.equal(new Set([...top.children]).size, top.children.length);
    const settled = api.state().layoutRuns;
    await wait();
    assert.equal(api.state().layoutRuns, settled, 'redraw repair must settle too');
    observer.disconnect();
    dom.window.close();
    console.log('PASS: hidden pre-login Hub settles, repeated layout is inert, external redraw repairs once.');
  })().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
}
