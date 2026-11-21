'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});try{
 const page=await browser.newPage();
 await page.setContent('<!doctype html><html><body><button id="login" onclick="doLogin()">Entrar</button><span id="status"></span></body></html>');
 await page.evaluate(()=>{
   let auth=0,read=0;window.__testCalls=()=>({auth,read});
   window.cloudSignIn=async()=>{if(++auth===1)throw new TypeError('Load failed');return {user:{id:'fake'}}};
   window.cloudRequest=async()=>{if(++read===1)throw new TypeError('Load failed');return {ok:true}};
   window.doLogin=async()=>{try{await window.cloudSignIn('fake','fake');await window.cloudRequest('records',{method:'GET'});
      document.getElementById('status').textContent='Entrou';}catch(e){document.getElementById('status').textContent='Erro: '+e.message}};
 });
 await page.addScriptTag({path:'hlgb-modules/autenticacao/rede-segura-v9613.js'});
 await page.click('#login');await page.waitForFunction(()=>document.getElementById('status').textContent==='Entrou');
 const result=await page.evaluate(()=>({calls:window.__testCalls(),status:window.hlgbAuthNetwork9613.status()}));
 assert.deepEqual(result.calls,{auth:2,read:2});assert.equal(result.status.installed,true);
 console.log('PASS '+engine.name()+' Safari Load failed retry during synthetic login and safe GET');
 await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});