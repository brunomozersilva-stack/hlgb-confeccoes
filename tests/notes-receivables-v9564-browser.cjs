'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:880},serviceWorkers:'block',acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/notes-receivables-v9564-fixture.html',{waitUntil:'domcontentloaded'});
  await page.locator('#nr-tabs button[data-tab="open"]').waitFor({state:'visible'});
  const counts=await page.evaluate(()=>window.hlgbNotesReceivables9564.calculate(window.hlgbNotesReceivables9564.allNotes()));
  assert.deepEqual([...counts.open],[4,138000]);
  assert.deepEqual([...counts.paid],[1,10000]);
  assert.deepEqual([...counts.overdue],[1,30000]);
  assert.deepEqual([...counts.today],[1,40000]);
  assert.deepEqual([...counts.next7],[2,58000]);
  assert.deepEqual([...counts.unknown],[1,50000]);
  assert.equal(await page.locator('#nr-table tbody tr').count(),4);
  assert.equal(await page.locator('#original-notes').innerText(),'Operação normal de montagem preservada');
  await page.locator('#nr-tabs [data-tab="paid"]').click();
  assert.equal(await page.locator('#nr-table tbody tr').count(),1);
  assert.equal(await page.locator('#nr-table [data-action="pay"]').count(),0,'paid note may not receive duplicate payment');
  await page.locator('#nr-table [data-action="view"]').click();
  await page.locator('#nr-table [data-action="pdf"]').click();
  await page.locator('#nr-tabs [data-tab="open"]').click();
  await page.locator('#nr-client').selectOption('id:1');
  assert.equal(await page.locator('#nr-table tbody tr').count(),1,'paid customer note excluded from open tab');
  await page.locator('#nr-min').fill('210');
  assert.equal(await page.locator('#nr-table tbody tr').count(),0,'minimum note amount should hide 200');
  await page.locator('#nr-min').fill('100');
  assert.equal(await page.locator('#nr-table tbody tr').count(),1);
  await page.locator('#nr-search').fill('rubi cliente');assert.equal(await page.locator('#nr-table tbody tr').count(),1);
  await page.locator('#nr-search').fill('');
  await page.locator('#nr-table [data-action="pay"]').click();
  await page.locator('#ar65-return').waitFor({state:'visible'});
  await page.getByText('Calcular devolução por produto / quantidade',{exact:true}).click();
  await page.getByLabel('Quantidade a devolver — Camisola Rubi',{exact:true}).fill('2');
  assert.match(await page.locator('#ar9847-result').innerText(),/40,00.*140,00/);
  await page.getByRole('button',{name:'Todas',exact:true}).click();
  assert.match(await page.locator('#ar9847-result').innerText(),/Excedente.*20,00/);
  assert.equal(await page.evaluate(()=>window.__writes),0);
  await page.locator('#ar65-return').fill('30');
  await page.locator('#ar65-reason').fill('Peças devolvidas');
  await page.locator('[data-ar65="return"]').click();
  await page.waitForFunction(()=>window.db.projectionInvoices.find(x=>x.id==='2')?.acertoReturnsV9565?.length===1);
  // Intl.NumberFormat may use a non-breaking space between R$ and amount.
  // First verify the actual financial credit; then verify the displayed column
  // without depending on which whitespace the browser currency formatter emits.
  await page.waitForFunction(()=>{
   const note=window.hlgbNotesReceivables9564.allNotes().find(x=>x.id==='2');
   const displayed=document.querySelector('#nr-table tbody tr')?.textContent?.replace(/\s/g,' ');
   return note?.credit===3000&&note?.balance===15000&&displayed?.includes('30,00');
  },null,{timeout:12000});
  await page.locator('#ar65-memo').fill('Cliente informou que fará o próximo pagamento sexta-feira.');
  await page.locator('[data-ar65="note"]').click();
  await page.waitForFunction(()=>window.db.projectionInvoices.find(x=>x.id==='2')?.acertoNotesV9565?.length===1);
  await page.locator('#ar65-return').fill('10000');
  await page.locator('#ar65-reason').fill('Devolução excessiva');
  await page.locator('[data-ar65="return"]').click();
  await page.locator('#ar65-feedback').waitFor({state:'visible'});
  assert.match(await page.locator('#ar65-feedback').innerText(),/ultrapassar/);
  await page.locator('#ar65-pay').fill('40');
  await page.locator('[data-ar65="payment"]').click();
  await page.waitForFunction(()=>window.db.projectionInvoices.find(x=>x.id==='2')?.paymentHistory?.length===2);
  const noteState=await page.evaluate(()=>{
   const n=window.db.projectionInvoices.find(x=>x.id==='2'),x=window.hlgbNotesReceivables9564.allNotes().find(x=>x.id==='2');
   return {history:n.paymentHistory.length,memo:n.acertoNotesV9565.length,returns:n.acertoReturnsV9565.length,
    paid:x.paid,credit:x.credit,balance:x.balance};
  });
  assert.deepEqual(noteState,{history:2,memo:1,returns:1,paid:6000,credit:3000,balance:11000});
  await page.locator('[data-action="clear"]').click();
  await page.locator('#nr-tabs [data-tab="overdue"]').click();
  assert.equal(await page.locator('#nr-table tbody tr').count(),1);
  await page.locator('#nr-tabs [data-tab="upcoming"]').click();
  assert.equal(await page.locator('#nr-table tbody tr').count(),2,'today + future must be included');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('[data-action="csv"]').click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^HLGB-notas-.*\.csv$/);
  const csv=await fs.readFile(await download.path(),'utf8');
  assert.match(csv,/;"200,00";/,'CSV must use decimal comma for Brazilian Excel');
  assert.match(csv,/;"400,00";/,'second filtered amount must also have decimal comma');
  await page.locator('[data-action="cloud"]').click();
  const results=await page.evaluate(()=>({actions:window.__actions,cloud:window.__cloudChecks,writes:window.__writes}));
  assert.deepEqual(results.actions,['view:1','pdf:1'],'return / payment modal is handled by the real module');
  assert.equal(results.cloud,1);
  assert.equal(results.writes,3,'only three user-confirmed note writes; no hidden automatic save');
  await page.evaluate(()=>{window.db.projectionInvoices.push({id:'6',client:'Cliente A',clientId:1,value:50,paid:0,dueDate:offset(3),status:'Pendente'});window.renderOrderNotes()});
  await page.waitForFunction(()=>document.querySelector('#nr-tabs [data-tab="all"]').textContent.includes('(6)'));
  // Synthetic legacy list and client registration, using actual module controls.
  await page.evaluate(()=>{
   window.closeModal();window.canOpenPage=()=>true;
   window.db.clients=[{id:1,name:'Cliente A'},{id:2,name:'Cliente B'}];
   window.db.orders=[{id:97001,client:'Cliente A',clientId:1,noteReady:true,total:100,received:100,status:'Pedido finalizado'},{id:97002,client:'Cliente B',clientId:2,noteReady:true,total:200,received:20}];
   window.hlgbWalIdbGuard9536.status=()=>({readFailed:false,probes:1});window.hlgbRecordPendingIdentitySet9535=()=>new Set();
   const host=document.createElement('div');host.id='allOrderNotesTable';host.innerHTML='<table><thead><tr><th>Nota</th><th>Ação</th></tr></thead><tbody><tr id="legacyPaid"><td>Quitada</td><td><button onclick="openAcerto(97001)">Acerto</button></td></tr><tr id="legacyPartial"><td>Parcial</td><td><button onclick="openAcerto(97002)">Acerto</button></td></tr></tbody></table>';document.body.appendChild(host);
   const clients=document.createElement('div');clients.id='clientTable';clients.innerHTML='<table><tbody><tr><td>Cliente A</td><td><button onclick="editClient(1)">Editar</button></td></tr></tbody></table>';document.body.appendChild(clients);
   window.hlgbNotesReceivables9564.install();
  });
  assert.equal(await page.locator('[data-hlgb-paid-legacy9710] #legacyPaid').count(),1);
  assert.equal(await page.locator('#legacyPaid').isVisible(),false);
  assert.equal(await page.locator('#legacyPartial').isVisible(),true);
  await page.locator('[data-hlgb-client-notes9710]').click();
  assert.match(await page.locator('#modal').innerText(),/Histórico de notas do cadastro/);
  assert.match(await page.locator('#modal').innerText(),/97001/);
  assert.doesNotMatch(await page.locator('#modal').innerText(),/97002/);


  const statement=await page.evaluate(()=>{
   const api=window.hlgbNotesReceivables9564,clientKey='id:1',base={clientKey,key:'projection:a',id:'a',number:'A',issued:'2026-11-01',total:10000,paid:4000,credit:1000,balance:5000};
   const notes=[base,{...base,key:'projection:b',id:'b',number:'B',issued:'2026-11-02',total:3000,paid:3000,credit:0,balance:0}];
   const event=(id,type,date,amountCents,extra={})=>({id,ownerId:'1',noteKey:base.key,type,date,amountCents,...extra});
   const events=[event('p','payment-recorded','2026-11-04',4000),event('r','return-active','2026-11-05',1000),event('s','return-reversed','2026-11-06',2000,{reversedAt:'2026-11-07'})];
   const report={state:'local-events',events,eventTotal:events.length,issues:['eventos-sem-conciliacao:projection:b']};
   const input={clientKey,openingCents:-2000,independentOpening:true,reason:'Crédito anterior',from:'2026-11-04',to:'2026-11-06'};
   const before=JSON.stringify({notes,report,input}),v=api.clientAccountStatement9773(notes,report,input,true);
   return {v,unchanged:before===JSON.stringify({notes,report,input}),blocked:api.clientAccountStatement9773(notes,report,{...input,independentOpening:false},true).state,forbidden:api.clientAccountStatement9773(notes,report,input,false).state,duplicate:api.clientAccountStatement9773(notes,{...report,events:[...events,events[0]],eventTotal:4},input,true).state};
  });
  assert.equal(statement.v.state,'local-statement');assert.equal(statement.v.summary.currentNotesCents,5000);assert.equal(statement.v.summary.projectedCurrentCents,3000);
  assert.equal(statement.v.summary.priorDatedCents,10000);assert.equal(statement.v.summary.periodEndDatedCents,3000);assert.equal(statement.v.summary.complete,false);
  assert.equal(statement.v.issues.length,1,'undated paid note is explicitly disclosed even with zero balance');
  assert.equal(statement.v.rows.length,3);assert.equal(statement.v.canWrite,false);assert.equal(statement.unchanged,true);assert.equal(statement.blocked,'unavailable');assert.equal(statement.forbidden,'forbidden');assert.equal(statement.duplicate,'event-review');

  const preflight=await page.evaluate(()=>{
   const api=window.hlgbNotesReceivables9564;
   const note=(id,value,paid)=>({id,clientId:1,value,paid,remaining:value-paid,status:paid?'Parcial':'Pendente',issueDate:'2026-11-01',paymentHistory:paid?[{id:'p-'+id,value:paid}]:[]});
   const a=note('a',100,20),b=note('b',200,0);
   const title=n=>({id:'f-'+n.id,projectionInvoiceId:n.id,clientId:1,value:n.value,paid:n.paid,remaining:n.remaining,status:n.status});
   const wrap=(module,data,revision)=>({module,entity_id:data.id,revision,data,deleted_at:null});
   const records=[wrap('projectionInvoices',a,2),wrap('finance',title(a),3),wrap('projectionInvoices',b,4),wrap('finance',title(b),5)];
   const preview=api.clientAccountPreview9759([a,b].map(n=>({...api.projectionView(n),clientKey:'id:1'})),{clientKey:'id:1',openingCents:0,paymentCents:15000,date:'2026-11-26'},true);
   const input={clientId:1,reference:'PIX-abc',method:'PIX',date:'2026-11-26',preview,records,pendingIds:[],pendingObserved:true,canonicalObserved:true};
   const before=JSON.stringify(input),run=changes=>api.globalPaymentPreflight9775({...input,...changes},true);
   const ok=run({}),pending=run({pendingIds:['finance::f-a']}),stale=run({records:records.map(e=>e.entity_id==='a'?{...e,data:{...e.data,remaining:70}}:e)}),badTitle=run({records:records.map(e=>e.entity_id==='f-a'?{...e,data:{...e.data,paid:10}}:e)}),dupe=run({records:[...records,records[1]]}),extra=run({preview:{...preview,unallocatedPayment:100}}),badRef=run({records:records.map(e=>e.entity_id==='a'?{...e,data:{...e.data,paymentHistory:[{id:'p-a',value:20,globalPaymentReference9775:'PIX-abc'}]}}:e)});
   return {ok,pending:pending.reason,stale:stale.reason,badTitle:badTitle.reason,dupe:dupe.reason,extra:extra.reason,badRef:badRef.reason,denied:api.globalPaymentPreflight9775(input,false).reason,unchanged:before===JSON.stringify(input)};
  });
  assert.equal(preflight.ok.state,'preflight-only');assert.equal(preflight.ok.amountCents,15000);
  assert.deepEqual(preflight.ok.allocations.map(a=>[a.noteId,a.noteRevision,a.titleRevision,a.amountCents,a.afterCents]),[['a',2,3,8000,0],['b',4,5,7000,13000]]);
  assert.equal(preflight.ok.hubExpectedEntries,1);assert.equal(preflight.ok.canWrite,false);assert.equal(preflight.ok.atomicConfirmed,false);
  assert.equal(preflight.pending,'pending-sync');assert.equal(preflight.stale,'balance-changed');assert.equal(preflight.badTitle,'title-divergence');assert.equal(preflight.dupe,'record-identity');assert.equal(preflight.extra,'independent-balance-not-supported');assert.equal(preflight.badRef,'payment-history');assert.equal(preflight.denied,'permission');assert.equal(preflight.unchanged,true);
  // An overpayment or contradictory history cannot be hidden as a settled note
  // just because the display projection clamps paid to total.
  const proof=await page.evaluate(()=>{
   const api=window.hlgbNotesReceivables9564;
   const base={id:'proof',value:100,paid:100,remaining:0,status:'Pago'};
   const cases=[base,{...base,paid:120},{...base,paymentHistory:[{value:120}]},{...base,paymentHistory:[{value:80}]},{...base,remaining:.01},{...base,paid:'invalid'},{...base,acertoReturnsV9565:[{value:10}]}];
   return cases.map(n=>api.settledForArchive9710(api.projectionView(n)));
  });
  assert.deepEqual(proof,[true,false,false,false,false,false,false]);
  await page.evaluate(()=>{window.closeModal();window.db.orders[0].received=120;window.hlgbNotesReceivables9564.organizeLegacyNotes9710()});
  assert.equal(await page.locator('#legacyPaid').isVisible(),true,'overpayment stays visible for review');
  await page.evaluate(()=>{window.db.orders[0].received=100;window.hlgbNotesReceivables9564.organizeLegacyNotes9710()});
  assert.equal(await page.locator('#legacyPaid').isVisible(),false);
  await page.evaluate(()=>window.closeModal());await page.locator('[data-hlgb-client-account9759]').click();await page.locator('#ca9759-payment').fill('25');await page.locator('#ca9759-preview').click();assert.match(await page.locator('#ca9759-result').innerText(),/Nenhum valor foi gravado/);assert.match(await page.locator('#ca9759-result').innerText(),/Saldo projetado/);assert.match(await page.locator('#ca9759-result').innerText(),/Entrada única esperada no Hub/);assert.match(await page.locator('#ca9759-result').innerText(),/Saldo independente após/);assert.equal(await page.evaluate(()=>window.__writes),3);

  await page.addScriptTag({path:'hlgb-modules/financeiro/settlement-history-v9653.js'});
  await page.locator('#ca9773-statement summary').click();
  await page.locator('#ca9773-load').click();
  assert.match(await page.locator('#ca9773-output').innerText(),/Histórico parcial/);
  assert.equal(await page.locator('#ca9773-export').isEnabled(),true);
  const statementDownload=page.waitForEvent('download');await page.locator('#ca9773-export').click();const statementFile=await statementDownload;
  assert.match(statementFile.suggestedFilename(),/^HLGB-extrato-cliente-/);
  assert.match(await fs.readFile(await statementFile.path(),'utf8'),/Saldo inicial independente/);
  await page.locator('#ca9759-opening').fill('-20');assert.equal(await page.locator('#ca9773-export').isEnabled(),false);
  assert.equal(await page.evaluate(()=>window.__writes),3);
  await page.evaluate(()=>{window.closeModal();window.db.orders[0].received=40;window.hlgbNotesReceivables9564.organizeLegacyNotes9710()});
  assert.equal(await page.locator('#legacyPaid').isVisible(),true,'reopened note returns to active list');
  assert.equal(await page.locator('[data-hlgb-paid-legacy9710]').count(),0);
  assert.equal(await page.evaluate(()=>window.__writes),3,'visual archive and client history do not write');
  await page.evaluate(()=>{
   window.hlgbPrintNote9411=id=>window.__actions.push('print:'+id);
   const box=document.createElement('div');box.id='projectionNotes9214';box.innerHTML='<table><tbody><tr><td><button data-acerto9214="2">Acerto</button><button data-na9411="view">Ver</button><button data-na9411="pdf">PDF</button><button data-na9411="print">Imprimir</button></td></tr></tbody></table>';
   document.querySelector('#notas').appendChild(box);window.hlgbNotesReceivables9564.paint();
  });
  const fallback=page.locator('#hlgbDeliveryFallback9848');await fallback.waitFor();assert.equal(await page.locator('#projectionNotes9214').isVisible(),false);
  await fallback.click();assert.equal(await page.locator('#projectionNotes9214').isVisible(),true);
  await fallback.click();assert.equal(await page.locator('#projectionNotes9214').isVisible(),false);
  await page.evaluate(()=>document.querySelector('#projectionNotes9214 tbody').insertAdjacentHTML('beforeend','<tr><td><button data-acerto9214="missing">Acerto</button></td></tr>'));
  await page.locator('#projectionNotes9214').waitFor({state:'visible'});assert.equal(await fallback.count(),0,'unknown record restores original list');
  await page.evaluate(()=>document.querySelector('#projectionNotes9214').remove());
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#nr-client').isVisible(),true);
  assert.equal(await page.locator('#nr-tabs button[data-tab="paid"]').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS notas v95.64 '+engine.name()+': tabs, amounts, client filter, pay/view/pdf actions, CSV, cloud refresh, incoming refresh and mobile');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
