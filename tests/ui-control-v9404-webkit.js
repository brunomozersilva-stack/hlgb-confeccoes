const {webkit}=require('playwright');
(async()=>{
  const browser=await webkit.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  // Usa uma rota estática do próprio repositório para manter origem HTTP sem acionar o loader principal do HLGB.
  await page.goto('http://127.0.0.1:4173/tests/ui-control-v9404-webkit.js',{waitUntil:'domcontentloaded'});
  await page.setContent(`<!doctype html><html><head></head><body>
    <div id="loginScreen"><div><h1>HLGB Confecções</h1></div></div>
    <div id="sessionLoader"><div><h1>HLGB Confecções</h1></div></div>
    <div id="appShell" style="display:block"><header><div class="logo">HLGB <small>v93.72</small></div></header><main>
      <div id="config"><div class="panel">Config base</div></div>
      <div id="productFixture"><label>Fotos<input id="fproductPhotos" type="file" accept="image/*" multiple></label><button id="productDirectSaveBtn" type="button">💾 Salvar alterações</button></div>
    </main></div>
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
  // Reproduz o contrato real do cadastro: existe um base limpo e um wrapper legado que iniciava a foto depois do save.
  await page.addScriptTag({content:`
    window.__legacyPhotoSideEffect=0;
    function saveProductFromForm(p){p.model='TESTE';return true}
    const _v8946SaveProduct=saveProductFromForm;
    saveProductFromForm=function(p){const ok=_v8946SaveProduct(p);if(ok)window.__legacyPhotoSideEffect++;return ok};
    window.compressProductImage=async function(){return 'data:image/jpeg;base64,VEVTVEU='};
  `});
  await page.addScriptTag({url:'http://127.0.0.1:4173/release-brand-theme-v9402.js'});
  await page.addScriptTag({url:'http://127.0.0.1:4173/release-ui-actions-v9402.js'});
  await page.waitForTimeout(300);

  if(await page.locator('#byhThemePanel9402').count()!==1)throw new Error('Painel de aparência não ficou único');
  if(await page.locator('#byhThemeOpacityReadout').count()!==1)throw new Error('Leitura visível da intensidade não apareceu');
  const slider=page.locator('#byhThemeOpacity');
  if(await slider.getAttribute('max')!=='100')throw new Error('Intensidade continua limitada ao valor antigo');
  await slider.evaluate(el=>{el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(120);
  const intensity=await page.evaluate(()=>({
    readout:(document.getElementById('byhThemeOpacityReadout')?.innerText||'').replace(/\s+/g,' '),
    value:document.getElementById('byhThemeOpacity')?.value,
    visual:getComputedStyle(document.documentElement).getPropertyValue('--byh-photo-visual-opacity').trim(),
    shellBefore:getComputedStyle(document.getElementById('appShell'),'::before').opacity,
    previewBefore:getComputedStyle(document.getElementById('byhThemePreview'),'::before').opacity,
    saved:JSON.parse(localStorage.getItem('byhagatha_theme_v1')||'{}').photoIntensity
  }));
  if(!intensity.readout.includes('80%')||intensity.value!=='80'||Number(intensity.visual)!==0.8||Number(intensity.shellBefore)!==0.8||Number(intensity.previewBefore)!==0.8||Number(intensity.saved)!==80)throw new Error('Intensidade real da foto não acompanhou 80%: '+JSON.stringify(intensity));
  await slider.evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(80);
  const zero=await page.evaluate(()=>({readout:document.getElementById('byhThemeOpacityReadout')?.innerText||'',shell:Number(getComputedStyle(document.getElementById('appShell'),'::before').opacity),preview:Number(getComputedStyle(document.getElementById('byhThemePreview'),'::before').opacity)}));
  if(!zero.readout.includes('0%')||zero.shell!==0||zero.preview!==0)throw new Error('Intensidade 0% não ocultou somente a foto: '+JSON.stringify(zero));

  const input=page.locator('#fproductPhotos');
  await input.setInputFiles({name:'produto.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])});
  await page.waitForFunction(()=>document.querySelector('.hlgb-photo-prep-status')?.textContent?.includes('pronta'));
  const photoSave=await page.evaluate(()=>{
    const p={id:'produto-teste',photos:[]};
    const ok=window.saveProductFromForm(p);
    return {ok,photos:p.photos||[],legacy:window.__legacyPhotoSideEffect,patched:!!window.saveProductFromForm.__hlgbProductPhoto9405,mode:window.hlgbUiActions9402?.productPhotos?.mode,version:window.hlgbUiActions9402?.version};
  });
  if(!photoSave.ok||photoSave.photos.length!==1||!String(photoSave.photos[0].data||'').startsWith('data:image/jpeg')||photoSave.legacy!==0||!photoSave.patched||photoSave.mode!=='prepare-before-existing-save'||photoSave.version!=='94.05')throw new Error('Foto de produto ainda usa o fluxo paralelo antigo: '+JSON.stringify(photoSave));

  await page.evaluate(()=>window.hlgbUiControl9404.installAuditorBridge());
  await page.evaluate(()=>window.openHlgbAuditor());
  await page.waitForTimeout(600);
  if(await page.locator('#oldAudit').count())throw new Error('Auditor continuou exibindo resultado antigo');
  if(await page.locator('#newAudit').count()!==1)throw new Error('Auditor não executou atualização automática');
  const banner=await page.locator('#byhAuditorLive9404').innerText();
  if(!/Status atualizado/i.test(banner))throw new Error('Auditor não confirmou atualização desta abertura');
  const globals=await page.evaluate(()=>({ui:window.HLGB_UI_CONTROL_9404,theme:window.HLGB_BYHAGATHA_THEME_9402,actions:window.HLGB_UI_ACTIONS_9402}));
  if(globals.ui!=='94.04'||globals.theme!=='94.04'||globals.actions!=='94.05')throw new Error('Versões centrais incorretas: '+JSON.stringify(globals));
  await page.screenshot({path:'/tmp/hlgb-ui-control-v9405-webkit.png',fullPage:true});
  console.log(JSON.stringify({ok:true,intensity80:intensity,zero,photoSave:{count:photoSave.photos.length,legacy:photoSave.legacy,version:photoSave.version},auditor:banner}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
