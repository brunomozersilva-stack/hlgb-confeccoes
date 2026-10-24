const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 // v93.98 mantém IDs/API legados 9396 por compatibilidade, mas exige o build novo de Inteligência.
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.hlgbAuditorIntelligence9396?.version==='93.98'&&String(window.HLGB_AUDITOR_INTELLIGENCE_9396||'').includes('93.98'),null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&typeof window.openHlgbAuditor==='function'&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{
  const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
  const btn=document.getElementById('hlgbAuditorNavBtn');if(btn){document.body.appendChild(btn);Object.assign(btn.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}
 });
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#hlgbSmartStatus',{state:'visible',timeout:10000});
 await page.waitForSelector('#hlgbAuditorIntelligenceBtn9396',{state:'visible',timeout:10000});

 // A interface oficial deve ser a única visível; nenhum controle legado pode reaparecer.
 const shell=await page.evaluate(()=>{
  const status=document.getElementById('hlgbSmartStatus');
  const root=status?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status?.parentElement?.parentElement||status?.parentElement;
  const shown=[...(root?.querySelectorAll?.('button,a,[role="button"]')||[])].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}).map(el=>({id:el.id||'',text:String(el.textContent||'').trim()}));
  const official=['hlgbMultiuserOpen','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396'];
  const legacyPattern=/Diagnóstico profundo do Hub|Teste visual completo|Tela atual|Exportar diagnóstico visual|Copiar última auditoria|Sincronização|Limpar falsos positivos confirmados|Executar teste visual|Diagnóstico Assistente|Diagnóstico da Folha/i;
  return {shown,missing:official.filter(id=>!shown.some(x=>x.id===id)),legacy:shown.filter(x=>legacyPattern.test(x.text)),authority:window.HLGB_AUDITOR_SHELL_AUTHORITY,openerIsShell:window.openHlgbAuditor===window.hlgbAuditorShell9382?.open,legacyCapture:typeof window.__hlgbAuditorEntryCapture9368==='function'};
 });
 if(shell.missing.length||shell.legacy.length||shell.authority!=='93.82'||!shell.openerIsShell||shell.legacyCapture)throw new Error('Shell oficial do Auditor não é autoridade única '+JSON.stringify(shell));

 // Reproduz a janela real em que o Safari mostrou o botão piscando e depois sumindo.
 const stability=await page.evaluate(async()=>{
  const samples=[];
  const snap=()=>{
   const all=[...document.querySelectorAll('#hlgbAuditorIntelligenceBtn9396')];
   const b=all[0],s=b?getComputedStyle(b):null,r=b?.getBoundingClientRect();
   const legacy=document.getElementById('hlgbAuditorLegacyHide9368')?.textContent||'';
   samples.push({at:Math.round(performance.now()),count:all.length,hidden:b?.hidden??null,display:s?.display||null,visibility:s?.visibility||null,width:r?.width||0,height:r?.height||0,handler:typeof b?.onclick==='function',inlineOnclick:b?.getAttribute('onclick')||'',legacyGeneric:/hlgb-auditor-actions:has\(#hlgbSmartTest\)/.test(legacy)});
  };
  snap();for(let i=0;i<140;i++){await new Promise(r=>setTimeout(r,50));snap()}return samples;
 });
 const bad=stability.filter(x=>x.count!==1||x.hidden||x.display==='none'||x.visibility==='hidden'||x.width<=0||x.height<=0||!x.handler||x.inlineOnclick||!x.legacyGeneric);
 if(bad.length)throw new Error('botão Inteligência piscou/sumiu, duplicou ou perdeu o filtro oficial '+JSON.stringify({bad:bad.slice(0,12),last:stability.at(-1)}));

 await page.click('#hlgbAuditorIntelligenceBtn9396');
 await page.waitForSelector('#hlgbAuditorIntelligencePanel9396',{state:'visible',timeout:15000});
 await page.waitForSelector('#hlgbAuditorIntelligenceDownload9396',{state:'visible',timeout:10000});
 const after=await page.evaluate(()=>{
  const p=document.getElementById('hlgbAuditorIntelligencePanel9396'),d=document.getElementById('hlgbAuditorIntelligenceDownload9396'),ds=d?getComputedStyle(d):null,dr=d?.getBoundingClientRect(),report=window.hlgbAuditorIntelligence9396?.last;
  return {
   panelText:p?.innerText||'',downloadVisible:!!d&&!d.hidden&&ds?.display!=='none'&&ds?.visibility!=='hidden'&&(dr?.width||0)>0&&(dr?.height||0)>0,
   version:window.hlgbAuditorIntelligence9396?.version||'',
   hasSaveChain:!!report?.current?.saveChain&&Number.isFinite(Number(report.current.saveChain.depth))&&Array.isArray(report.current.saveChain.duplicateResponsibilities),
   hasProjectionIntegrity:!!report?.current?.projectionIntegrity&&Number.isFinite(Number(report.current.projectionIntegrity.count))&&Number.isFinite(Number(report.current.projectionIntegrity.unresolved)),
   metrics:report?.current?.metrics||null
  };
 });
 if(after.version!=='93.98'||!/Inteligência do Auditor/.test(after.panelText)||!/Save:/.test(after.panelText)||!/Financeiro→Projeção:/.test(after.panelText)||!after.downloadVisible||!after.hasSaveChain||!after.hasProjectionIntegrity)throw new Error('painel/download v93.98 incompleto '+JSON.stringify(after));
 if(!Object.prototype.hasOwnProperty.call(after.metrics||{},'saveDuplicateResponsibilities')||!Object.prototype.hasOwnProperty.call(after.metrics||{},'projectionOrphans')||!Object.prototype.hasOwnProperty.call(after.metrics||{},'projectionOrphansUnresolved'))throw new Error('métricas v93.98 ausentes '+JSON.stringify(after.metrics));
 await page.screenshot({path:'/tmp/hlgb-auditor-inteligencia-webkit.png',fullPage:true});
 if(errors.some(x=>/auditor|9396|9398|9382|intelig/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_INTELLIGENCE_BUTTON_WEBKIT_V9398_OK',JSON.stringify({samples:stability.length,last:stability.at(-1),downloadVisible:after.downloadVisible,version:after.version,metrics:after.metrics,shell}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
