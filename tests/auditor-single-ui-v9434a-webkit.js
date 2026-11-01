const {webkit,chromium}=require('playwright');
const engine=process.env.HLGB_BROWSER==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[]; page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbAuditorSingleAction9429?.run==='function',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}});
 await page.waitForFunction(()=>typeof window.openHlgbAuditor==='function',null,{timeout:15000});
 await page.evaluate(()=>{window.openHlgbAuditor();window.hlgbAuditorSingleUiReclaim9434A?.heal?.('single-ui-v9446-test')});
 await page.waitForFunction(()=>{window.hlgbAuditorSingleUiReclaim9434A?.heal?.('single-ui-v9446-wait');const b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!b)return false;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0},null,{timeout:15000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_AUTOCORRECT_9446==='94.46'&&typeof window.hlgbAuditorAutoCorrect9446?.run==='function',null,{timeout:15000});
 const snapshot=()=>page.evaluate(()=>{const vis=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const one=document.getElementById('hlgbAuditorUnifiedRun9434A'),nav=document.getElementById('hlgbAuditorNavBtn'),host=document.querySelector('.hlgb-auditor-actions');const legacy=['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368','hlgbAuditorUnifiedRun9429'];return {one:vis(one),text:one?.textContent||'',navInsideActions:!!nav?.closest?.('.hlgb-auditor-actions'),legacyVisible:legacy.filter(id=>vis(document.getElementById(id))),visibleActions:host?[...host.querySelectorAll(':scope>button')].filter(vis).map(x=>x.id):[],status:window.hlgbAuditorSingleUiReclaim9434A?.status?.()}});
 let out=await snapshot();
 if(!out.one||!out.text.includes('Auditar e corrigir'))throw new Error('botão reparador único ausente '+JSON.stringify(out));
 if(out.navInsideActions||out.legacyVisible.length||out.visibleActions.length!==1||out.visibleActions[0]!=='hlgbAuditorUnifiedRun9434A')throw new Error('conflito de ações '+JSON.stringify(out));
 if(out.status?.version!=='94.34a'||out.status?.appBase!=='94.46'||out.status?.repairReady!==true||out.status?.recordLearningScopeReady!==true)throw new Error('UI atual divergente '+JSON.stringify(out));
 // Reproduz a corrida vista no Safari: o host fica no DOM, mas outro módulo remove só o botão.
 const sameHost=await page.evaluate(()=>{const h=document.querySelector('.hlgb-auditor-actions'),b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!h||!b||b.parentElement!==h)return false;b.remove();return true});
 if(!sameHost)throw new Error('não foi possível simular remoção isolada do botão');
 await page.waitForFunction(()=>{const h=document.querySelector('.hlgb-auditor-actions'),b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!h||!b||b.parentElement!==h)return false;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0},null,{timeout:3000});
 out=await snapshot();
 if(!out.one||out.visibleActions.length!==1||out.visibleActions[0]!=='hlgbAuditorUnifiedRun9434A'||!(out.status?.buttonRestores>=1))throw new Error('botão não foi restaurado após remoção isolada '+JSON.stringify(out));
 // Reproduz também a corrida anterior: um módulo legado recria o contêiner de ações inteiro.
 const replacement=await page.evaluate(()=>{const old=document.querySelector('.hlgb-auditor-actions');if(!old)return false;const next=old.cloneNode(true);next.querySelector('#hlgbAuditorUnifiedRun9434A')?.remove();old.replaceWith(next);return true});
 if(!replacement)throw new Error('não foi possível simular substituição do host do Auditor');
 await page.waitForFunction(()=>{const h=document.querySelector('.hlgb-auditor-actions'),b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!h||!b||b.parentElement!==h)return false;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0},null,{timeout:3000});
 out=await snapshot();
 if(!out.one||out.visibleActions.length!==1||out.visibleActions[0]!=='hlgbAuditorUnifiedRun9434A')throw new Error('botão não foi restaurado após troca do host '+JSON.stringify(out));
 if(!(out.status?.hostRebinds>=1)||out.status?.observerRootConnected!==true)throw new Error('observador não acompanhou recriação do host '+JSON.stringify(out.status));
 if(errors.some(x=>/auditor|9434a|9446|9444|9443|9442|9429/i.test(x)))throw new Error(errors.join(' | '));
 console.log('AUDITOR_SINGLE_UI_V9446_WEBKIT_OK',JSON.stringify(out));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});