const {webkit}=require('playwright');const assert=require('assert');const fs=require('fs');
(async()=>{
 const browser=await webkit.launch({headless:true});try{
 const reports=[],pages=[];const errors=[];
 for(const [i,user] of ['user-a','user-b'].entries()){
  const context=await browser.newContext({viewport:{width:1100,height:850},acceptDownloads:true});
  const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://hlgb.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Validação em ambiente simulado</title><style>body{font:16px Arial;padding:24px}button,a,input{margin:6px;padding:10px}.panel{padding:16px;border:1px solid #ddd}</style><div id="modal"></div></html>'}));
  await page.goto('https://hlgb.test/');
  await page.evaluate(user=>{
   window.__HLGB_AUTH_READY=true;window.HLGB_RELEASE_VERSION='93.72';window.currentUser=()=>({id:user});window.hlgbRecordReady=true;window.db={};window.hlgbRecordSnapshots={};
   for(const m of ['orders','cuts','production','hubFinanceEntries']){const row={id:'test-1',qty:4};window.db[m]=[row];window.hlgbRecordSnapshots[m]=new Map([['test-1',{data:row,revision:1}]])}
   window.hlgbInternalAuditor={buildSyncDiagnostic:async()=>({summary:{normalizedPending:0,walLocalStorage:0,walIndexedDb:0},durableWalIndexedDb:{available:true}})};
   window.hlgbAuditorSmartRun=()=>{};window.hlgbAuditorSmartProblem=()=>{};window.openModal=(title,body)=>{document.getElementById('modal').innerHTML='<h2>'+title+'</h2>'+body};
  },user);
  await page.addScriptTag({path:'release-auditor-shell-v9382.js'});await page.evaluate(()=>{hlgbAuditorShell9382.install();openHlgbAuditor()});
  await page.click('#hlgbMultiuserOpen');await page.click('#hlgbMultiuserCapture');await page.waitForFunction(()=>document.getElementById('hlgbMultiuserStatus').textContent.startsWith('Relatório pronto'));
  const downloadPromise=page.waitForEvent('download');await page.click('#hlgbMultiuserDownload');const dl=await downloadPromise;const path=await dl.path();reports.push(fs.readFileSync(path));assert(dl.suggestedFilename().startsWith('hlgb-multiusuario-'));
 }
 await pages[1].setInputFiles('#hlgbMultiuserImport',{name:'outro-usuario.json',mimeType:'application/json',buffer:reports[0]});await pages[1].waitForFunction(()=>document.getElementById('hlgbMultiuserStatus').textContent==='Comparação concluída.');
 assert((await pages[1].locator('#hlgbMultiuserComparison').innerText()).includes('Validação parcial'));
 await pages[1].screenshot({path:'/tmp/hlgb-multiuser-webkit.png',fullPage:true});
 await pages[1].setInputFiles('#hlgbMultiuserImport',{name:'mesmo-usuario.json',mimeType:'application/json',buffer:reports[1]});await pages[1].waitForFunction(()=>document.getElementById('hlgbMultiuserStatus').textContent.includes('mesmo usuário'));
 assert.deepEqual(errors,[]);console.log('MULTIUSER_WEBKIT_OK: dois contextos simulados, coleta, downloads, importação, comparação e rejeição do mesmo perfil');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
