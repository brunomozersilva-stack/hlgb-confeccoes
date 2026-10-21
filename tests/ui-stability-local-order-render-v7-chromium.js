const {chromium}=require('playwright');
const path=require('path');
const assert=require('assert');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  try{
    await page.setContent(`<!doctype html><html><body><section id="pedidos" class="page active"><div id="ordersTable"></div></section></body></html>`);
    await page.evaluate(()=>{
      window.__renders=0;
      window.renderOrders=()=>{window.__renders++};
      window.cloudPullRemoteIfNewer=()=>true;
      window.save=function saveSentinel(){};
      window.hlgbRecordSaveWithRetry=function recordSaveSentinel(){};
      window.__saveBefore=window.save;
      window.__recordSaveBefore=window.hlgbRecordSaveWithRetry;
    });
    await page.addScriptTag({path:path.resolve('release-ui-stability.js')});

    let state=await page.evaluate(()=>({guard:window.HLGB_UI_STABILITY_GUARD,saveSame:window.save===window.__saveBefore,recordSaveSame:window.hlgbRecordSaveWithRetry===window.__recordSaveBefore}));
    assert.ok(String(state.guard).includes('v7-screen-stability-20261021'));
    assert.strictEqual(state.saveSame,true,'save() não pode ser embrulhado');
    assert.strictEqual(state.recordSaveSame,true,'hlgbRecordSaveWithRetry não pode ser embrulhado');

    await page.evaluate(()=>window.cloudPullRemoteIfNewer());
    await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
    await page.evaluate(()=>window.renderOrders());
    state=await page.evaluate(()=>({renders:window.__renders,pending:window.hlgbUiStabilityPending()}));
    assert.strictEqual(state.renders,1,'render local após clique deve ser imediato no Chromium');
    assert.ok(!state.pending.includes('renderOrders'),'render local não pode ficar pendente');

    await page.evaluate(()=>window.cloudPullRemoteIfNewer());
    await page.evaluate(()=>window.renderOrders());
    state=await page.evaluate(()=>({renders:window.__renders,pending:window.hlgbUiStabilityPending()}));
    assert.strictEqual(state.renders,1,'redraw realmente remoto deve continuar agrupado');
    assert.ok(state.pending.includes('renderOrders'),'redraw remoto deve entrar na fila');

    await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
    await page.evaluate(()=>window.renderOrders());
    state=await page.evaluate(()=>({renders:window.__renders,pending:window.hlgbUiStabilityPending()}));
    assert.strictEqual(state.renders,2,'ação local deve executar imediatamente e prevalecer');
    assert.ok(!state.pending.includes('renderOrders'),'ação local deve cancelar redraw remoto atrasado');

    await page.screenshot({path:'/tmp/hlgb-pedidos-refresh-chromium.png',fullPage:true});
    console.log('UI_STABILITY_LOCAL_ORDER_RENDER_V7_CHROMIUM_OK',JSON.stringify(state));
  } finally {
    await browser.close();
  }
})().catch(err=>{console.error(err);process.exit(1)});
