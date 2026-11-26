'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright'),fs=require('node:fs');
const vm=require('node:vm'),router=fs.readFileSync('app-stable3.html','utf8');const beginPatch=router.indexOf('function addFactionGroupEntry9738(html){'),endPatch=router.indexOf('h=addFactionGroupEntry9738(h);',beginPatch);assert(beginPatch>=0&&endPatch>beginPatch);const transform=vm.runInNewContext(router.slice(beginPatch,endPatch)+';addFactionGroupEntry9738',{console});const base=fs.readFileSync('app9240.html','utf8'),actual=transform(base);assert.notEqual(actual,base);assert.equal(transform(actual),actual);assert.equal(actual.split('id="hlgbGroupButton9734"').length,2);const from=actual.indexOf('<section id="faccoes" class="page">'),to=actual.indexOf('</section>',from);assert(from>=0&&to>from);const realFactionPage=actual.slice(from,to+10);
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const entry=await browser.newPage({viewport:{width:390,height:844}});await entry.setContent(realFactionPage);const native=entry.locator('#hlgbGroupButton9734');assert.equal(await native.count(),1);assert.equal(await native.isVisible(),true);assert.match(await native.innerText(),/Calculadora de matéria-prima/);assert.equal(await native.evaluate(el=>el.closest('.toolbar').previousElementSibling.className),'sub');await entry.close();
  const page=await browser.newPage({viewport:{width:1180,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/faction-material-refresh-v9522-fixture.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(async()=>{
   const r=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('hlgb_durable_wal',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('entries',{keyPath:'key'});
    req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result)
   });r.close();
   window.renderDestinationChecklists();
   window.renderFactionChecklists9198();
  });
  // Exercise the real capture handler, ahead of the original modal save callback.
  await page.evaluate(()=>{
   db.production=[{id:123,productId:999999,planned:172}];window.__assignmentCalls=0;
   openModal('Atribuição teste','<input id="assignProductionId" value="123"><input id="assignQty" value="172"><select id="assignDestination"><option value="F:1">Facção</option></select><button type="button" class="modalSave">Confirmar atribuição</button>');
   document.querySelector('#modal .modalSave').onclick=()=>window.__assignmentCalls++;
  });
  await page.locator('#modal .modalSave').click();
  assert.equal(await page.evaluate(()=>window.__assignmentCalls),0);assert.ok(await page.evaluate(()=>window.__alerts.some(x=>x.includes('Atribuição não realizada'))));
  await page.evaluate(()=>{db.production[0].productId=db.products[1].id});
  await page.locator('#modal .modalSave').click();
  assert.equal(await page.evaluate(()=>window.__assignmentCalls),1);assert.equal(await page.evaluate(()=>window.__posts),0);await page.evaluate(()=>closeModal());
  await page.locator('#hlgbMaterialRevisions9522 details > summary').click();
  await page.locator('#hlgbFactionMaterialRevisions9522 details > summary').click();
  await page.waitForSelector('#hlgbMaterialRevisions9522 button[data-material-revision9522]',{timeout:12000});
  await page.waitForSelector('#hlgbFactionMaterialRevisions9522 button[data-material-revision9522]',{timeout:12000});
  const first=await page.locator('#hlgbMaterialRevisions9522').innerText();
  assert.match(first,/Short Doll Crystal/);
  const faccoes=await page.locator('#hlgbFactionMaterialRevisions9522').innerText();
  assert.match(faccoes,/Short Doll Crystal/);
  assert.match(faccoes,/Short Doll Melanie/);
  assert.match(faccoes,/Graziano/);
  assert.match(faccoes,/Vanessa/);
  assert.match(first,/Short Doll Melanie/);
  const direct=page.locator('#factionChecklistTable9176 [data-hlgb-checklist-recover9728="1794313367933"]');await direct.waitFor();assert.equal(await direct.innerText(),'Recuperar materiais do checklist');await page.evaluate(()=>{renderFactionChecklists9198();renderFactionChecklists9198()});await direct.waitFor();assert.equal(await direct.count(),1);
  assert.match(first,/0 linha\(s\) no envio \/ 4 na ficha/);
  assert.match(first,/0 linha\(s\) no envio \/ 6 na ficha/);
  assert.equal(await page.evaluate(()=>window.__posts),0,'viewing old dispatch may not trigger write');
  // Old printing must be blocked until the updated checklist is reviewed.
  const unsafePrint=await page.evaluate(()=>{
   printMaterialChecklist(1794313232479);
   return {alerts:window.__alerts.slice(),legacy:document.getElementById('legacyPrint').textContent};
  });
  assert.ok(unsafePrint.alerts.some(v=>/desatualizado/i.test(v)),'stale print must warn');
  assert.equal(unsafePrint.legacy,'','outdated checklist must not be printed');

  await page.locator('#hlgbMaterialRevisions9522 [data-material-revision9522="1794313232479"]').click();
  await page.waitForSelector('#hlgbMaterialRefreshConfirm9522');
  const modal=await page.locator('#modal').innerText();
  assert.match(modal,/Romantic/);
  assert.match(modal,/32/,'Crystal: 192 / 6 = 32 kg of Romantic');
  // The modal attaches its save handler after rendering; don't click until it is bound.
  await page.waitForFunction(()=>typeof document.getElementById('hlgbMaterialRefreshConfirm9522')?.onclick==='function',{timeout:10000});
  await page.locator('#hlgbMaterialRefreshConfirm9522').click();
  await page.waitForFunction(()=>window.db.materialChecklists[0].materials.length===4,{timeout:10000});
  const c=await page.evaluate(()=>({
   posts:window.__posts,
   len:db.materialChecklists[0].materials.length,
   kg:db.materialChecklists[0].materials.find(m=>m.name==='Romantic').qty,
   revision:window.hlgbRecordSnapshots.materialChecklists.get('1794313232479').revision,
   printed:document.getElementById('legacyPrint').textContent
  }));
  assert.equal(c.posts,1);assert.equal(c.len,4);assert.equal(c.kg,32);assert.equal(c.revision,2);
  await direct.click();
  await page.waitForSelector('#hlgbMaterialRefreshConfirm9522');
  assert.match(await page.locator('#modal').innerText(),/21,5/,'Melanie: 172 / 8 = 21.5 kg');
  // The modal attaches its save handler after rendering; don't click until it is bound.
  await page.waitForFunction(()=>typeof document.getElementById('hlgbMaterialRefreshConfirm9522')?.onclick==='function',{timeout:10000});
  await page.locator('#hlgbMaterialRefreshConfirm9522').click();
  await page.waitForFunction(()=>window.db.materialChecklists[1].materials.length===6,{timeout:10000});
  const data=await page.evaluate(()=>({posts:window.__posts,
   count:db.materialChecklists[1].materials.length,
   kg:db.materialChecklists[1].materials.find(m=>m.name==='Romantic').qty,
   payments:(db.factionPayments||[]).length}));
  assert.equal(data.posts,2);assert.equal(data.count,6);await direct.waitFor({state:'detached'});assert.equal(data.kg,21.5);assert.equal(data.payments,0);
  // Actual checklist selection UI, isolated from all commercial writes.
  await page.evaluate(real=>{
   document.getElementById('factionChecklistTable9176').remove();document.body.insertAdjacentHTML('beforeend',real);
   window.__HLGB_AUTH_READY=false;window.cloudUser=null;window.canOpenPage=()=>true;window.currentUser=()=>({id:'fixture'});window.hlgbFactionMaterialRefresh9522.ensurePanel();
   if(!document.getElementById('hlgbGroupButton9734'))throw Error('Native button removed before login');
   window.__HLGB_AUTH_READY=true;
   const previous=window.openModal;window.openModal=(...args)=>{previous(...args);document.getElementById('modal').classList.add('show')};
   db.products.forEach(p=>p.materials.forEach(m=>{m.cat=m.name==='Romantic'?'Tecido':/^renda/i.test(m.name)?'Renda':'Aviamento'}));
   for(const c of db.materialChecklists)c.materials=window.hlgbFactionMaterialRefresh9522.buildMaterials(db.products.find(p=>p.id===c.productId),c.qty,'F',c);
   window.__groupBefore=JSON.stringify(db);window.hlgbFactionMaterialRefresh9522.ensurePanel();
  },realFactionPage);
  assert.equal(await page.locator('#hlgbGroupButton9734').count(),1);
  await page.evaluate(()=>{window.canOpenPage=id=>id!=='materiais';window.hlgbFactionMaterialRefresh9522.ensurePanel()});await page.locator('#hlgbGroupButton9734').click();assert.match(await page.evaluate(()=>window.__alerts.at(-1)),/acesso/);await page.evaluate(()=>{window.canOpenPage=()=>true});
  await page.setViewportSize({width:390,height:844});await page.locator('#hlgbGroupButton9734').click();
  await page.locator('#hlgbGroupSearch9734').fill('Crystal');await page.locator('#hlgbGroupAll9734').click();await page.locator('#hlgbGroupSearch9734').fill('Melanie');await page.locator('#hlgbGroupAll9734').click();
  assert.match(await page.locator('#hlgbGroupOutput9734').innerText(),/2 envios · 364 peças/);assert.match(await page.locator('#hlgbGroupOutput9734').innerText(),/Alca Papiro/);assert.doesNotMatch(await page.locator('#hlgbGroupOutput9734 table').first().innerText(),/Romantic|Renda/i);
  assert.equal(await page.evaluate(()=>JSON.stringify(db)===window.__groupBefore),true);assert.equal(await page.evaluate(()=>window.__posts),2);
  await page.locator('#hlgbGroupClear9734').click();assert.equal(await page.locator('#hlgbGroupPrint9734').isDisabled(),true);await page.evaluate(()=>closeModal());
  await page.evaluate(()=>{db.materialChecklists[0].materials[0].checked=true;db.materialChecklists[0].materials[0].qty=99;renderDestinationChecklists()});
  await page.waitForSelector('#hlgbMaterialRevisions9522 [data-material-revision9522="1794313232479"]');
  await page.locator('#hlgbMaterialRevisions9522 [data-material-revision9522="1794313232479"]').click();
  await page.waitForFunction(()=>document.getElementById('modal').textContent.includes('Conferência manual necessária'));
  assert.equal(await page.locator('#hlgbMaterialRefreshConfirm9522').count(),0,'checked materials must not be auto-rewritten');
  assert.equal(await page.evaluate(()=>window.__posts),2);
  assert.deepEqual(errors,[]);
  console.log('PASS '+engine.name()+': Crystal 4 items, Melanie 6 items, live yield calculation, cloud ACK, checked items protected');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});