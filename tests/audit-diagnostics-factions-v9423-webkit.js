const {webkit}=require('playwright');
const assert=require('assert');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4173/tests/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  document.body.innerHTML='<div id="modal"><select id="mname"><option>Antiga</option></select><button id="hlgbSmartTest" onclick="hlgbAuditorSmartRun()">Testar sistema</button></div><div id="appShell"><div class="logo"><small></small></div></div>';
  window.db={factionMasters:[{id:1,name:'Roseli',active:true},{id:2,name:'Inativa',active:false}],factions:[],production:[{id:'p1',stage:'Aguardando atribuição',productionLocationId:'old',factionId:null,planned:10,done:0}],materialChecklists:[],cuts:[]};
  window.hlgbFactionNames9287=()=>['Roseli'];
  window.__auditCalls=0;window.hlgbAuditorRunFull=()=>{window.__auditCalls++;return Promise.resolve(true)};
  window.__projectionCalls=0;window.renderProjection=()=>{window.__projectionCalls++};
  window.hlgb955FlushSilent=async()=>true;
  window.HLGB_RELEASE_VERSION='94.22';
 });
 await page.addScriptTag({url:'http://127.0.0.1:4173/release-diagnostic-faction-stability-v9423.js'});
 await page.waitForTimeout(80);
 const result=await page.evaluate(async()=>{
  const api=window.hlgbDiagnosticFactionStability9423;
  api.repairFactionSelect();api.reconcileLocalAssignments();
  await window.hlgbAuditorSmartRun();
  for(let i=0;i<6;i++)window.renderProjection();
  await new Promise(r=>setTimeout(r,380));
  return {version:api?.version,names:[...document.querySelectorAll('#mname option')].map(o=>o.textContent),location:window.db.production[0].productionLocationId,audit:window.__auditCalls,projection:window.__projectionCalls,split:api.obsoleteSplit({module:'cuts',data:{status:'Desmembrado por modelo',modelSplitParentV1:true,hiddenByModelSplitV1:true}})};
 });
 assert.equal(result.version,'94.23');
 assert.deepEqual(result.names,['Roseli']);
 assert.equal(result.location,null);
 assert.equal(result.audit,1);
 assert.equal(result.split,true);
 assert(result.projection<=2,'projection burst was not coalesced: '+result.projection);
 await browser.close();console.log('audit-diagnostics-factions-v9423-webkit: ok');
})().catch(e=>{console.error(e);process.exit(1)});
