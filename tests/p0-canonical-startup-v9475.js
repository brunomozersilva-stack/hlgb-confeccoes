'use strict';
/* P0: clean user's entry, WITHOUT fake login or touching business data. */
const {webkit, chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const browserName=process.env.HLGB_BROWSER==='chromium'?'chromium':'webkit';
const engine=browserName==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'allow'});
 const page=await context.newPage(),errors=[],failed=[],serverErrors=[],urls=[];
 page.on('console',msg=>{if(msg.type()==='error')errors.push('console:'+msg.text().slice(0,240))});
 page.on('pageerror',err=>errors.push('pageerror:'+String(err.message||err).slice(0,240)));
 page.on('requestfailed',req=>failed.push(req.url().split('?')[0]+' '+(req.failure()?.errorText||'')));
 page.on('response',res=>{if(res.status()>=400)serverErrors.push(res.status()+' '+res.url().split('?')[0])});
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())urls.push(frame.url())});
 try{
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>{
    const l=document.getElementById('loginScreen'),shell=document.getElementById('appShell'),spinner=document.getElementById('sessionLoader');
    return !!l&&!!shell&&getComputedStyle(l).display!=='none'&&getComputedStyle(shell).display==='none'&&(!spinner||getComputedStyle(spinner).display==='none')&&typeof window.doLogin==='function'&&!!document.getElementById('loginUser')&&!!document.getElementById('loginPass');
  },null,{timeout:90000});
  const state=await page.evaluate(()=>({
    url:location.pathname,
    login: getComputedStyle(document.getElementById('loginScreen')).display,
    app: getComputedStyle(document.getElementById('appShell')).display,
    loader: getComputedStyle(document.getElementById('sessionLoader')).display,
    gate: window.hlgbLoginConfirmGate9407?.status?.().confirmed??null,
    clickHandler:typeof doLogin,
    loadedScripts:document.scripts.length,
    title:document.title
  }));
  assert(state.url.endsWith('/app-stable3.html'),'canonical redirects should land on app-stable3');
  assert.equal(state.clickHandler,'function');
  assert.equal(state.login!=='none',true);
  assert.equal(state.app,'none');
  if(serverErrors.length||failed.length)throw Error('Resource failures: '+serverErrors.slice(0,8).join('; ')+' / '+failed.slice(0,8).join('; '));
  console.log('P0_CANONICAL_STARTUP_OK '+JSON.stringify({browser:browserName,state,redirects:urls.slice(-6),consoleErrors:errors.slice(0,6)}));
 }catch(e){
  const state=await page.evaluate(()=>({
    href:location.href,title:document.title,text:document.body?.innerText?.slice(0,700),
    hasLogin:!!document.getElementById('loginScreen'),
    hasShell:!!document.getElementById('appShell'),
    scriptCount:document.scripts.length,
    loginStyle:document.getElementById('loginScreen')?getComputedStyle(document.getElementById('loginScreen')).display:null
  })).catch(err=>({error:String(err)}));
  console.error('P0_CANONICAL_STARTUP_FAILED '+JSON.stringify({browser:browserName,state,urls,consoleErrors:errors.slice(0,30),failed:failed.slice(0,30),serverErrors:serverErrors.slice(0,30)}));
  try{await page.screenshot({path:'/tmp/hlgb-p0-startup-'+browserName+'.png',fullPage:false,timeout:5000})}catch(_){}
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
