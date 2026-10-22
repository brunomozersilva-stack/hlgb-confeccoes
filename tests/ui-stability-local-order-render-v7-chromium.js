const {chromium}=require('playwright');
const path=require('path');
const assert=require('assert');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  try{
    await page.setContent(`<!doctype html><html><body><section id="pedidos" class="page active"><button id="saveOrder" class="modalSave">Salvar alterações</button><div id="ordersTable"></div></section></body></html>`);
    await page.evaluate(()=>{
      window.__renders=0;
      window.renderOrders=()=>{window.__renders++};
      window.cloudPullRemoteIfNewer=()=>true;
      window.save=function saveSentinel(){};
      window.hlgbRecordSaveWithRetry=function recordSaveSentinel(){};
      window.__saveBefore=window.save;
      window.__recordSaveBefore=window.hlgbRecordSaveWithRetry;
      // Simula o fluxo real: depois do clique em Salvar, o próprio save pode provocar
      // um eco remoto antes de syncAllData chamar renderOrders.
      document.getElementById('saveOrder').addEventListener('click',()=>{
        window.cloudPullRemoteIfNewer();
        window.renderOrders();
      });
    });
    await page.addScriptTag({path:path.resolve('release-ui-stability.js')});

    let state=await page.evaluate(()=>({guard:window.HLGB_UI_STABILITY_GUARD,saveSame:window.save===window.__saveBefore,recordSaveSame:window.hlgbRecordSaveWithRetry===window.__recordSaveBefore}));
    assert.ok(String(state.guard).includes('v8-screen-stability-20261022'));
    assert.strictEqual(state.saveSame,true,'save() não pode ser embrulhado');
    assert.strictEqual(state.recordSaveSame,true,'hlgbRecordSaveWithRetry não pode ser embrulhado');

    // Controle: redraw puramente remoto continua agrupado.
    await page.evaluate(()=>window.cloudPullRemoteIfNewer());
    await page.evaluate(()=>window.renderOrders());
    state=await page.evaluate(()=>({renders:window.__renders,pending:window.hlgbUiStabilityPending()}));
    assert.strictEqual(state.renders,0,'redraw puramente remoto deve continuar agrupado');
    assert.ok(state.pending.includes('renderOrders'),'redraw remoto deve entrar na fila');

    // Reprodução do bug real: clique local -> eco remoto -> renderOrders.
    await page.click('#saveOrder');
    state=await page.evaluate(()=>({renders:window.__renders,pending:window.hlgbUiStabilityPending(),remote:window.hlgbUiStabilityRemoteState()}));
    assert.strictEqual(state.renders,1,'Salvar Pedido deve atualizar a própria tela imediatamente no Chromium');
    assert.ok(!state.pending.includes('renderOrders'),'render do próprio save não pode ficar pendente');
    assert.strictEqual(state.remote.localCommit,true,'janela de commit local deve estar ativa');

    await page.screenshot({path:'/tmp/hlgb-pedidos-refresh-chromium.png',fullPage:true});
    console.log('UI_STABILITY_LOCAL_ORDER_RENDER_V8_CHROMIUM_OK',JSON.stringify(state));
  } finally {
    await browser.close();
  }
})().catch(err=>{console.error(err);process.exit(1)});
