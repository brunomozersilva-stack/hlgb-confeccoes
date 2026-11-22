'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const moduleUrl='/hlgb-modules/autenticacao/rede-segura-v9613.js';
const code=fs.readFileSync('hlgb-modules/autenticacao/rede-segura-v9613.js','utf8');
const fixture=[
'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">',
'<script>window.hlgbLoginConfirmGate9407={confirm(){return true}};var attempts=0,reads=0;',
'async function cloudSignIn(){if(++attempts===1)throw new TypeError("Load failed");return {access_token:"mock"}}',
'async function cloudRequest(){if(++reads===1)throw new TypeError("Load failed");return {rows:[]}}',
'async function doLogin(){try{await cloudSignIn("fake","fake");await cloudRequest("records",{method:"GET"});',
'document.getElementById("loginError").textContent="Entrou"}catch(e){',
'document.getElementById("loginError").textContent="Erro: "+e.message}}</script>',
'</head><body><div id="loginScreen"><button id="login" onclick="doLogin()">Entrar</button>',
'<span id="loginError"></span></div><div id="appShell"></div></body></html>'
].join('');
async function check(missing){
 const b=await engine.launch({headless:true}),ctx=await b.newContext({serviceWorkers:'block'}),page=await ctx.newPage();
 const errors=[];let requested=0,other=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app9240.html*',route=>route.fulfill({status:200,contentType:'text/html',body:fixture}));
 await page.route('**/*.js*',route=>{
  const p=new URL(route.request().url()).pathname;
  if(p===moduleUrl){requested++;return route.fulfill({status:missing?404:200,contentType:'text/javascript',body:missing?'':code})}
  other++;return route.fulfill({status:200,contentType:'text/javascript',body:''});
 });
 try{
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>window.__HLGB_BOOT_READY_9477===true,undefined,{timeout:30000});
  const observed=await page.evaluate(()=>({ready:window.__HLGB_BOOT_READY_9477,installed:!!window.hlgbAuthNetwork9613?.status().installed,
   failed:window.__HLGB_BOOT_FAILED_FILES_9477||[]}));
  assert.equal(observed.ready,true);assert.equal(observed.installed,!missing);
  assert.equal(requested,1);assert.ok(other>100,'157 scripts unchanged');
  if(missing)assert.ok(observed.failed.some(f=>f.includes('rede-segura-v9613.js')));
  else{
   await page.click('#login');
   await page.waitForFunction(()=>document.getElementById('loginError').textContent==='Entrou',undefined,{timeout:8000});
   assert.deepEqual(await page.evaluate(()=>({auth:attempts,read:reads})),{auth:2,read:2});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS '+engine.name()+' loader original; módulo '+(missing?'ausente, login não bloqueado':'presente, erro Safari recuperado'));
 }finally{await ctx.close();await b.close()}
}
(async()=>{await check(false);await check(true)})().catch(e=>{console.error(e);process.exitCode=1});