const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const engine = process.env.HLGB_BROWSER === 'webkit' ? webkit : chromium;

(async () => {
  const browser = await engine.launch({headless:true});
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:4173/app-stable3.html');
    await page.waitForFunction(() => window.hlgbAuditorIntelligence9396 && window.hlgbHubLiveRefresh9289);
    await page.waitForFunction(() => window.hlgbAuditorIntelligence9396.currentMetrics().saveChain.responsibilities.gradeLink.count === 1);
    // Replay the real grade installer after other guards have wrapped its saver.
    const grade = await page.evaluate(() => Array.from(document.scripts).find(s => s.textContent.includes("const V='92.45-grade-consumers'"))?.textContent);
    assert.ok(grade);
    await page.addScriptTag({content:grade});
    await page.waitForTimeout(1100);
    const chain = await page.evaluate(() => {
      window.hlgbHubLiveRefresh9289.installRecordHook();
      return window.hlgbAuditorIntelligence9396.currentMetrics().saveChain;
    });
    assert.equal(chain.responsibilities.gradeLink.count, 1, JSON.stringify(chain.duplicateResponsibilities));
    assert.equal(chain.responsibilities.hubLive.count, 1);
    assert.equal(chain.duplicateResponsibilityCount, 0, JSON.stringify(chain.duplicateResponsibilities));
    console.log('AUDITOR_BOOT_SAVE_V9449_OK', engine.name(), chain.depth);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode=1});
