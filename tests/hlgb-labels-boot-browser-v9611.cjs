'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const target='/hlgb-modules/utilidades/etiquetas-layout-v9602b.js';
const pure=fs.readFileSync(path.resolve(__dirname,'..',target.slice(1)),'utf8');
const fixture=['<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">',
'<script>window.hlgbLoginConfirmGate9407={confirm:function(){return true}};',
'function doLogin(){var e=document.getElementById("loginError");e.textContent="Entrando…";',
'setTimeout(function(){document.getElementById("loginScreen").style.display="none";',
'document.getElementById("appShell").style.display="block";e.textContent="Acesso confirmado"},15);return false}</script>',
'</head><body><div id="loginScreen"><button id="entrar" onclick="doLogin()">Entrar</button>',
'<span id="loginError"></span></div><div id="appShell" style="display:none">Dentro do HLGB</div>',
'</body></html>'].join('');
async function check(offline){
 const b=await engine.launch({headless:true}),ctx=await b.newContext({serviceWorkers:'block'}),page=await ctx.newPage();
 const exceptions=[];let coreCalls=0,outside=0;
 page.on('pageerror',e=>exceptions.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname!=='127.0.0.1'){outside++;return route.abort('blockedbyclient')}
  if(u.pathname.endsWith('/app9240.html'))return route.fulfill({status:200,contentType:'text/html',body:fixture});
  if(u.pathname===target){coreCalls++;return route.fulfill({status:offline?404:200,contentType:'text/javascript',body:offline?'':pure})}
  if(u.pathname.endsWith('.js'))return route.fulfill({status:200,contentType:'text/javascript',body:''});
  return route.continue();
 });
 try{
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>window.__HLGB_BOOT_READY_9477===true,undefined,{timeout:15000});
  const state=await page.evaluate(()=>({ready:window.__HLGB_BOOT_READY_9477,core:!!window.HLGB_LABEL_LAYOUT_9602B,fail:window.__HLGB_BOOT_FAILED_FILES_9477||[]}));
  assert.equal(state.core,!offline);assert.equal(state.ready,true);assert.equal(coreCalls,1);
  if(offline)assert.ok(state.fail.some(x=>x.includes('etiquetas-layout-v9602b.js')));
  await page.click('#entrar');
  await page.waitForFunction(()=>document.getElementById('appShell')?.style.display==='block',undefined,{timeout:5000});
  assert.equal(await page.locator('#loginError').textContent(),'Acesso confirmado');
  assert.equal(outside,0);assert.deepEqual(exceptions,[]);
  console.log('PASS '+engine.name()+' login sintético; Etiquetas '+(offline?'fallback':'carregadas'));
 }finally{await ctx.close();await b.close()}
}
(async()=>{await check(false);await check(true)})().catch(e=>{console.error(e);process.exitCode=1});
