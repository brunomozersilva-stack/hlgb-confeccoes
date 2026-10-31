const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbAuditorSingleAction9429?.run==='function',null,{timeout:60000});
 const pre=await page.evaluate(()=>({rapid:window.HLGB_AUDITOR_RAPID_9437||null,gate:window.hlgbLoginConfirmGate9407?.status?.()}));
 if(pre.rapid)throw new Error('v94.37 carregou antes da autenticação '+JSON.stringify(pre));
 await page.evaluate(()=>{
  window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));
  const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');
  const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}
  const b=document.getElementById('hlgbAuditorNavBtn');if(b){document.body.appendChild(b);Object.assign(b.style,{display:'block',visibility:'visible',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}
 });
 await page.waitForFunction(()=>window.HLGB_AUDITOR_RAPID_9437==='94.37'&&window.hlgbAuditorRapid9437?.status?.().authReady===true,null,{timeout:15000});
 await page.waitForSelector('#hlgbAuditorNavBtn',{state:'visible',timeout:15000});
 await page.click('#hlgbAuditorNavBtn');
 await page.waitForSelector('#hlgbAuditorUnifiedRun9434A',{state:'visible',timeout:15000});
 await page.waitForTimeout(1200);
 const sample=await page.evaluate(()=>window.hlgbAuditorRapid9437.captureNow('webkit-test'));
 if(!sample||sample.kind!=='rapid-sample')throw new Error('amostra rápida não foi registrada '+JSON.stringify(sample));
 const daily=await page.evaluate(async()=>{
  const api=window.hlgbAuditorSingleAction9429,orig=api.run;
  api.run=async()=>({daily:{kind:'hlgb_auditor_daily_report',version:'94.29',date:(()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())})(),runCount:1,health:{pendingUnique:0},intelligence:{comparison:{improved:0,regressed:0}}}});
  try{return await window.hlgbAuditorRapid9437.runDaily18('webkit-force',true)}finally{api.run=orig}
 });
 if(!daily?.scheduled18||daily.scheduled18.scheduledLocal!=='18:00')throw new Error('relatório forçado não recebeu marcador das 18h '+JSON.stringify(daily));
 await page.waitForSelector('#hlgbDaily18Ready9437',{state:'visible',timeout:5000});
 const out=await page.evaluate(()=>{
  const vis=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  const host=document.querySelector('.hlgb-auditor-actions');
  const visibleActions=host?[...host.querySelectorAll(':scope>button')].filter(vis).map(x=>x.id):[];
  return {visibleActions,rapid:window.hlgbAuditorRapid9437.status(),gate:window.hlgbLoginConfirmGate9407?.status?.(),banner:vis(document.getElementById('hlgbDaily18Ready9437')),card:!!document.getElementById('hlgbDaily18Card9437')};
 });
 if(out.visibleActions.length!==1||out.visibleActions[0]!=='hlgbAuditorUnifiedRun9434A')throw new Error('Auditor deixou de ter uma ação principal '+JSON.stringify(out));
 if(!out.banner||!out.card)throw new Error('relatório das 18h não ficou encontrável '+JSON.stringify(out));
 if(out.rapid.rapidHistoryCount<1)throw new Error('histórico rápido vazio '+JSON.stringify(out));
 if(out.gate?.rapidLearningLoaded!==true)throw new Error('gate não confirmou 94.37 '+JSON.stringify(out));
 if(errors.some(x=>/9437|rapid|auditor/i.test(x)))throw new Error('pageerror '+errors.join(' | '));
 console.log('AUDITOR_RAPID_V9437_WEBKIT_OK',JSON.stringify(out));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
