const {webkit}=require('playwright');
(async()=>{
  const browser=await webkit.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  // Usa uma rota estática do próprio repositório para manter origem HTTP sem acionar o loader principal do HLGB.
  await page.goto('http://127.0.0.1:4173/tests/ui-control-v9404-webkit.js',{waitUntil:'domcontentloaded'});
  await page.setContent(`<!doctype html><html><head></head><body>
    <div id="loginScreen"><div><h1>HLGB Confecções</h1></div></div>
    <div id="sessionLoader"><div><h1>HLGB Confecções</h1></div></div>
    <div id="appShell" style="display:block"><header><div class="logo">HLGB <small>v93.72</small></div></header><main><div id="config"><div class="panel">Config base</div></div></main></div>
  </body></html>`);
  await page.evaluate(()=>{
    window.HLGB_RELEASE_VERSION='93.72';
    window.openHlgbAuditor=function(){
      const old=document.getElementById('hlgbAuditorResult');if(old)old.remove();
      const host=document.createElement('div');host.id='hlgbAuditorResult';host.innerHTML='<div id="oldAudit">Status do sistema: Falha · resultado antigo</div>';document.body.appendChild(host);return true;
    };
    const newest={id:'audit-new',completedAt:new Date().toISOString(),summary:{result:'Aprovado',pass:41,warn:0,fail:0}};
    window.hlgbInternalAuditor={loadRuns:async()=>true,latest:()=>newest};
    window.hlgbAuditorRunFull=async()=>{const host=document.getElementById('hlgbAuditorResult');host.innerHTML='<div id="newAudit">Resultado Aprovado · 41 aprovados · 0 atenções · 0 falhas</div>';return newest};
    window.hlgbAuditorShowRun=()=>true;
  });
  await page.addScriptTag({url:'http://127.0.0.1:4173/release-brand-theme-v9402.js'});
  await page.waitForTimeout(250);
  if(await page.locator('#byhThemePanel9402').count()!==1)throw new Error('Painel de aparência não ficou único');
  if(await page.locator('#byhThemeOpacityReadout').count()!==1)throw new Error('Leitura visível da intensidade não apareceu');
  await page.locator('#byhThemeOpacity').evaluate(el=>{el.value='33';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(80);
  const readout=(await page.locator('#byhThemeOpacityReadout').innerText()).replace(/\s+/g,' ');
  if(!readout.includes('33%'))throw new Error('Intensidade visível não acompanhou o slider: '+readout);
  const cssOpacity=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--byh-photo-opacity').trim());
  if(cssOpacity!=='.33'&&cssOpacity!=='0.33')throw new Error('Intensidade aplicada divergiu do valor visível: '+cssOpacity);
  await page.evaluate(()=>window.hlgbUiControl9404.installAuditorBridge());
  await page.evaluate(()=>window.openHlgbAuditor());
  await page.waitForTimeout(600);
  if(await page.locator('#oldAudit').count())throw new Error('Auditor continuou exibindo resultado antigo');
  if(await page.locator('#newAudit').count()!==1)throw new Error('Auditor não executou atualização automática');
  const banner=await page.locator('#byhAuditorLive9404').innerText();
  if(!/Status atualizado/i.test(banner))throw new Error('Auditor não confirmou atualização desta abertura');
  const globals=await page.evaluate(()=>({ui:window.HLGB_UI_CONTROL_9404,theme:window.HLGB_BYHAGATHA_THEME_9402}));
  if(globals.ui!=='94.04'||globals.theme!=='94.04')throw new Error('Versão central de UI incorreta: '+JSON.stringify(globals));
  await page.screenshot({path:'/tmp/hlgb-ui-control-v9404-webkit.png',fullPage:true});
  console.log(JSON.stringify({ok:true,opacity:readout,auditor:banner,version:globals.ui}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
