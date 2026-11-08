'use strict';
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&
   !!window.hlgbAuditorAuthority9374&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
  await page.evaluate(()=>{
   window.__HLGB_AUTH_READY=true;
   window.dispatchEvent(new Event('hlgb:authenticated'));
   const login=document.getElementById('loginScreen');
   if(login){login.style.setProperty('display','none','important');login.style.setProperty('pointer-events','none','important')}
   const nav=document.getElementById('hlgbAuditorNavBtn');
   if(nav){document.body.appendChild(nav);Object.entries({display:'block',visibility:'visible',opacity:'1','pointer-events':'auto',position:'fixed',left:'10px',top:'10px','z-index':'2147483647'}).forEach(([k,v])=>nav.style.setProperty(k,v,'important'))}
   window.alert=()=>{};
   window.closeModal=()=>{};
   window.openModal=(title,html)=>{
    let el=document.getElementById('auditorVisibleHost9504');
    if(!el){el=document.createElement('div');el.id='auditorVisibleHost9504';el.setAttribute('role','dialog');document.body.appendChild(el)}
    el.innerHTML=html;
   };
  });
  await page.waitForSelector('#hlgbAuditorNavBtn',{state:'visible',timeout:10000});
  await page.click('#hlgbAuditorNavBtn');
  await page.waitForSelector('#auditorVisibleHost9504 #hlgbAuditorResult',{state:'attached',timeout:10000});
  await page.waitForSelector('#auditorVisibleHost9504 #hlgbHygieneLauncherBtn9504',{state:'visible',timeout:10000});
  await page.click('#auditorVisibleHost9504 #hlgbHygieneLauncherBtn9504');
  await page.waitForSelector('#auditorVisibleHost9504 #hlgbHygienePanel9503',{state:'visible',timeout:30000});
  const summary=await page.locator('#hlgbHygienePanel9503').innerText();
  if(!summary.includes('Higiene do código'))throw new Error('Incorrect hygiene panel: '+summary.slice(0,600));
  if(!summary.includes('CacheStorage'))throw new Error('Cache risk summary absent: '+summary.slice(0,600));
  // Architecture is intentionally hidden from the single-action toolbar; test its fallback through the API.
  await page.evaluate(()=>window.hlgbAuditorAuthorityScan9374());
  await page.waitForSelector('#auditorVisibleHost9504 #hlgbAuthorityMap9374',{state:'visible',timeout:10000});
  await page.waitForSelector('#auditorVisibleHost9504 #hlgbAuthorityHygieneBtn9504',{state:'visible',timeout:10000});
  if(errors.some(e=>/hygiene|9374|9504/i.test(e)))throw new Error(errors.join(' | '));
  console.log('AUDITOR_HYGIENE_BUTTON_V9504_OK',engine.name());
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
