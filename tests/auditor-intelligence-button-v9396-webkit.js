const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_INTELLIGENCE_9396==='93.96',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&typeof window.openHlgbAuditor==='function'&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{
  const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
  const btn=document.getElementById('hlgbAuditorNavBtn');if(btn){document.body.appendChild(btn);Object.assign(btn.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}
 });
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#hlgbSmartStatus',{state:'visible',timeout:10000});
 await page.waitForSelector('#hlgbAuditorIntelligenceBtn9396',{state:'visible',timeout:10000});
 await page.waitForTimeout(900);
 const before=await page.evaluate(()=>{
  const b=document.getElementById('hlgbAuditorIntelligenceBtn9396');
  const s=b?getComputedStyle(b):null,r=b?.getBoundingClientRect();
  return {exists:!!b,hidden:b?.hidden,display:s?.display,visibility:s?.visibility,width:r?.width||0,height:r?.height||0,text:b?.textContent||''};
 });
 if(!before.exists||before.hidden||before.display==='none'||before.visibility==='hidden'||before.width<=0||before.height<=0||!/Inteligência/.test(before.text))throw new Error('botão Inteligência não está realmente visível '+JSON.stringify(before));
 await page.click('#hlgbAuditorIntelligenceBtn9396');
 await page.waitForSelector('#hlgbAuditorIntelligencePanel9396',{state:'visible',timeout:15000});
 await page.waitForSelector('#hlgbAuditorIntelligenceDownload9396',{state:'visible',timeout:10000});
 const after=await page.evaluate(()=>{
  const p=document.getElementById('hlgbAuditorIntelligencePanel9396'),d=document.getElementById('hlgbAuditorIntelligenceDownload9396');
  const ds=d?getComputedStyle(d):null,dr=d?.getBoundingClientRect();
  return {panelText:p?.innerText||'',downloadVisible:!!d&&!d.hidden&&ds?.display!=='none'&&ds?.visibility!=='hidden'&&(dr?.width||0)>0&&(dr?.height||0)>0};
 });
 if(!/Inteligência do Auditor/.test(after.panelText)||!after.downloadVisible)throw new Error('painel/download da Inteligência incompleto '+JSON.stringify(after));
 await page.screenshot({path:'/tmp/hlgb-auditor-inteligencia-webkit.png',fullPage:true});
 if(errors.some(x=>/auditor|9396|9382|intelig/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_INTELLIGENCE_BUTTON_WEBKIT_OK',JSON.stringify({before,downloadVisible:after.downloadVisible}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
