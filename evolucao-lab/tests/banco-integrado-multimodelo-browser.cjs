'use strict';
// Exercício REMOTO com PostgreSQL descartável: dois perfis de navegador, revisão real,
// WAL idempotente e "ACK" perdido. Não acessa Supabase ou HLGB comercial.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const {start}=require('../banco-integrado/servidor.cjs');
const store=require('../banco-integrado/persistencia.cjs');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const orderPayload={
 clientId:'CLI-0001',sizes:['P','M','G2'],
 items:[
  {productId:'PRO-0001',colors:[{color:'Rubi',grade:{P:60,M:60,G2:0}}]},
  {productId:'PRO-0002',colors:[{color:'Branco',grade:{P:0,M:0,G2:10}}]}
 ]
};
const cutLines=[{color:'Rubi',size:'P',qty:40},{color:'Rubi',size:'M',qty:40}];
const originReturn=[{color:'Rubi',size:'P',qty:30}];
const destReturn=[{color:'Rubi',size:'M',qty:20}];
async function login(page,url){
 await page.goto(url);
 await page.locator('[name="actor"]').selectOption('A');
 await page.locator('[name="pin"]').fill('demo-integrado-a');
 await page.locator('button').click();
 await page.locator('#remote-check').waitFor({timeout:15000});
 const session=await page.request.get(url+'/api/session').then(r=>r.json());
 assert.equal(session.actor,'Operador A fictício');
 assert.equal(session.permissions.productionApproval,false);
 assert.ok(session.permissions.allowedCommands.includes('multi.flow.allocate'));
}
const serverSubmit=(page,type,payload,expectedRevision)=>page.evaluate(async data=>{
 const r=await window.HLGBRemoteLab.submit(data.type,data.payload,data.expectedRevision);
 return {status:r.status,message:r.message||'',revision:r.state?.revision??null,
  pending:window.HLGBRemoteLab.info().pending?.command.commandId||null,
  stage:window.HLGBRemoteLab.info().pending?.stage||null};
},{type,payload,expectedRevision});
const state=(page)=>page.evaluate(async()=>window.HLGBRemoteLab.state());
const reconcile=(page)=>page.evaluate(async()=>{const r=await window.HLGBRemoteLab.reconcile();
 return {status:r.status,revision:r.state?.revision||null,
  pending:window.HLGBRemoteLab.info().pending?.command.commandId||null,
  stage:window.HLGBRemoteLab.info().pending?.stage||null};});
async function confirmed(page,type,payload,revision){
 const v=await serverSubmit(page,type,payload,revision);
 assert.equal(v.status,'confirmed',type+': '+JSON.stringify(v));
 assert.equal(v.revision,revision+1,type+' revisão sequencial');
 assert.equal(v.pending,null,'WAL já confirmado deve desaparecer após prova do servidor');
 return v.revision;
}
test('Duas sessões reais em PostgreSQL descartável: 120→80→50, conflito, ACK perdido, offline e replay único',async()=>{
 const srv=await start(),url='http://127.0.0.1:'+srv.address().port;
 const browser=await browserType.launch({headless:true});
 const A=await browser.newContext({viewport:{width:1280,height:840},acceptDownloads:true}),
  B=await browser.newContext({viewport:{width:390,height:840},acceptDownloads:true});
 const a=await A.newPage(),b=await B.newPage(),errors=[];
 for(const page of [a,b])page.on('pageerror',e=>errors.push(e.message));
 try{
  await login(a,url);await login(b,url);
  const before=await store.state(),startRevision=before.revision;
  assert.equal((await state(a)).revision,startRevision);
  assert.equal((await state(b)).revision,startRevision);
  let revision=await confirmed(a,'order.multi.create',orderPayload,startRevision);
  const order=(await store.state()).multiOrders.at(-1);
  assert.equal(order.totals.pieces,130);
  assert.equal(order.items[0].qty,120);assert.equal(order.items[1].qty,10);

  // B está numa revisão antiga. Nunca misturar rascunho e não reexecutar o pedido.
  await b.locator('[data-module="pedidos"]').click();
  const oldDraft=b.locator('form[data-command="order.add"] [name="M"]');
  await oldDraft.fill('17');
  const competingPayload=JSON.parse(JSON.stringify(orderPayload));
  competingPayload.items[0].colors[0].grade.P=50; // Sessão B tenta 110, A já confirmou 120.
  const rejected=await serverSubmit(b,'order.multi.create',competingPayload,startRevision);
  assert.equal(rejected.status,'conflict');
  assert.equal(rejected.stage,'conflict');
  assert.ok(rejected.pending,'ID original deve ficar guardado no WAL');
  assert.equal(await oldDraft.inputValue(),'17','Conflito não apaga rascunho visível');
  assert.equal((await store.state()).multiOrders.length,before.multiOrders.length+1,
   'Comando concorrente não pode duplicar pedido');

  // Reabrir o Chrome/WebKit conserva intenção pendente no IndexedDB da própria sessão.
  await b.reload();await b.locator('#remote-check').waitFor();
  const recovered=await b.evaluate(()=>window.HLGBRemoteLab.info().pending);
  assert.equal(recovered.command.commandId,rejected.pending);
  assert.equal(recovered.stage,'conflict');
  const proven=await reconcile(b);
  assert.equal(proven.status,'not_found','Falha de concorrência não foi gravada no servidor');
  const discarded=await b.evaluate(async()=>window.HLGBRemoteLab.discard());
  assert.equal(discarded.status,'discarded');
  assert.equal((await b.evaluate(()=>window.HLGBRemoteLab.info())).pending,null);
  const history=await b.evaluate(()=>window.HLGBRemoteLab.history());
  const archived=history.find(x=>x.commandId===rejected.pending);
  assert.ok(archived,'Versão concorrente cancelada deve ficar no histórico local');
  assert.equal(archived.resolution,'cancelled_after_server_proof');
  assert.equal(archived.firstFailure,'conflict');
  assert.equal(archived.conflictRevision,revision);
  assert.equal(archived.command.expectedRevision,startRevision);
  assert.equal(archived.command.payload.items[0].colors[0].grade.P,50,
   'Preservar valor alternativo da sessão B, não sobrescrever a versão de A');
  assert.equal((await store.state()).multiOrders.at(-1).items[0].qty,120,
   'A versão confirmada da sessão A permanece no servidor');
  assert.equal((await store.readback(rejected.pending)).status,'cancelled');
  const download=b.waitForEvent('download');
  await b.locator('#remote-history-export').click();
  const exported=JSON.parse(fs.readFileSync(await (await download).path(),'utf8'));
  assert.equal(exported.schema,'hlgb-historico-conflitos-wal-v1');
  assert.ok(exported.archived.some(x=>x.commandId===rejected.pending));
  await b.reload();await b.locator('#remote-check').waitFor();
  assert.ok((await b.evaluate(()=>window.HLGBRemoteLab.history()))
   .some(x=>x.commandId===rejected.pending),'Arquivamento sobrevive ao fechamento da página');
  assert.equal((await state(b)).revision,revision);

  revision=await confirmed(b,'multi.cut.plan',{
   orderId:order.id,itemId:'ITM-001',lines:cutLines,
   scheduledDate:'2026-11-22',priority:'normal',
   cutterOne:'Cortador A',cutterTwo:'Cortador B',spreader:'Infestador C'
  },revision);
  const cut=(await store.state()).multiCutPlans.at(-1);
  assert.equal(cut.qty,80);
  await reconcile(a);
  revision=await confirmed(a,'multi.cut.complete',{
   id:cut.id,checkerOne:'Fiscal A',checkerTwo:'Fiscal B'
  },revision);
  await reconcile(b);
  revision=await confirmed(b,'multi.flow.allocate',{
   cutId:cut.id,factionId:'FAC-0001',lines:cutLines,
   unitCents:550,reason:'Alocação fictícia após corte'
  },revision);
  const lot=(await store.state()).multiFlowLots.at(-1);
  assert.equal(lot.qty,80);

  // O PostgreSQL COMITOU, mas o navegador perdeu a resposta ("ACK perdido").
  await a.route('**/api/commands',async route=>{
   if(route.request().method()==='POST'){await route.fetch();await route.abort();}
   else await route.continue();
  });
  const lost=await a.evaluate(async({rev,id,lines})=>{
   try{await window.HLGBRemoteLab.submit('multi.flow.return',{
    id,lines,reason:'Primeiro retorno com ACK perdido'},rev);
    return {unexpected:true};
   }catch(e){return {error:String(e.message||e),
    pending:window.HLGBRemoteLab.info().pending?.command.commandId||null};}
  },{rev:revision,id:lot.id,lines:originReturn});
  assert.equal(lost.unexpected,undefined,'Resposta perdida não pode ser exibida como sucesso');
  assert.ok(lost.pending,'WAL com comando intacto até a prova');
  await a.unroute('**/api/commands');
  revision++;
  let now=await store.state();
  assert.equal(now.revision,revision);
  assert.equal(now.multiFlowLots.at(-1).returns.length,1);
  const command=now.log.at(-1);
  assert.equal(command.commandId,lost.pending);
  assert.equal(command.type,'multi.flow.return');
  await a.reload();await a.locator('#remote-check').waitFor();
  assert.equal((await a.evaluate(()=>window.HLGBRemoteLab.info().pending.command.commandId)),lost.pending);
  const ack=await reconcile(a);
  assert.equal(ack.status,'confirmed');
  assert.equal(ack.pending,null);
  assert.equal((await state(a)).multiFlowLots.at(-1).returns.length,1);
  const replay=await store.commit({
   commandId:lost.pending,type:'multi.flow.return',expectedRevision:revision-1,
   payload:{id:lot.id,lines:originReturn,reason:'Primeiro retorno com ACK perdido'}
  },'Operador A fictício');
  assert.equal(replay.status,'already_committed','Reenvio idêntico não cria outro acerto');
  assert.equal((await store.state()).revision,revision);

  await reconcile(b);
  revision=await confirmed(b,'multi.flow.transfer',{
   id:lot.id,factionId:'FAC-0002',unitCents:600,reason:'Resto do lote mudou de facção'
  },revision);
  await reconcile(a);
  revision=await confirmed(a,'multi.flow.return',{
   id:lot.id,lines:destReturn,reason:'Segundo retorno na nova facção'
  },revision);
  await reconcile(b);
  revision=await confirmed(b,'multi.flow.separate',{
   orderId:order.id,itemId:'ITM-001',
   lines:[...originReturn,...destReturn],reason:'Separar 50 por grade'
  },revision);
  await reconcile(a);
  revision=await confirmed(a,'multi.flow.ship',{
   orderId:order.id,itemId:'ITM-001',
   lines:[{color:'Rubi',size:'P',qty:20}],reason:'Expedir 20'
  },revision);

  // Queda de rede ANTES de postar: ID fica em WAL. Nenhum replay automático.
  await B.setOffline(true);
  const offline=await b.evaluate(async args=>{
   try{await window.HLGBRemoteLab.submit('multi.flow.review',args.payload,args.revision);
    return {unexpected:true};
   }catch(e){return {error:String(e.message||e),
    pending:window.HLGBRemoteLab.info().pending?.command.commandId||null};}
  },{payload:{id:'MFR-0002',reviewer:'Conferente fictício',reason:'Revisão após queda de rede'},revision});
  assert.equal(offline.unexpected,undefined);
  assert.ok(offline.pending);
  assert.equal((await store.state()).revision,revision,'Sem internet não registrou acerto');
  await B.setOffline(false);
  await b.reload();await b.locator('#remote-check').waitFor();
  const missing=await reconcile(b);
  assert.equal(missing.status,'not_found');
  assert.equal((await store.state()).revision,revision,'Releitura não deve reenviar automaticamente');
  const retried=await b.evaluate(async()=>window.HLGBRemoteLab.retry());
  assert.equal(retried.status,'confirmed');
  revision++;
  assert.equal(retried.state.revision,revision);
  assert.equal((await store.state()).log.filter(e=>e.commandId===offline.pending).length,1);

  now=await store.state();
  assert.equal(now.revision,revision);
  const rows=now.multiFlowLots.at(-1).returns;
  assert.deepEqual(rows.map(x=>[x.factionId,x.qty,x.amountCents]),
   [['FAC-0001',30,16500],['FAC-0002',20,12000]]);
  assert.equal(rows[1].review?.reviewer,'Conferente fictício');
  assert.deepEqual(now.finance,before.finance,'Percurso fictício não escreve título comercial');
  assert.deepEqual(now.settlements,before.settlements,'Acerto fictício não integra conta a pagar');
  assert.deepEqual(now.stockLedger,before.stockLedger,'Nenhum estoque comercial foi consumido');
  const {orderBalance}=require('../modulos/fluxo-multimodelo-v1.js');
  const cell=orderBalance(now,order.id,'ITM-001');
  assert.equal(cell.reduce((n,x)=>n+x.toCut,0),40);
  assert.equal(cell.reduce((n,x)=>n+x.cutToSeparate,0),30);
  assert.equal(cell.reduce((n,x)=>n+x.separated,0),50);
  assert.equal(cell.reduce((n,x)=>n+x.shipped,0),20);

  // Cada sessão independente lê a mesma revisão e os mesmos registros do servidor.
  await reconcile(a);
  const finalA=await state(a),finalB=await state(b);
  assert.equal(finalA.revision,finalB.revision);
  assert.equal(finalA.revision,revision);
  assert.deepEqual(finalA.multiFlowLots,finalB.multiFlowLots);
  assert.deepEqual(finalA.multiFlowSeparations,finalB.multiFlowSeparations);
  assert.equal(errors.length,0,'Erros JS nas sessões: '+errors.join(' | '));
  const evidence={
   schema:'hlgb-multimodelo-2sessoes-ci-v1',environment:'postgres-descartavel',browser:browserType.name(),
   testedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA||'local',
   sessions:{independentBrowserContexts:2,adminOnly:true,productionRoleUnchanged:true},
   proof:{staleRevisionConflict:true,draftPreservedOnConflict:true,conflictingVersionArchivedAndExported:true,walRecoveredAfterReload:true,
    lostAckRecoveredByReadback:true,sameIdReplayNoDuplicate:true,
    offlineNoAutomaticResend:true,offlineSameIdRetryConfirmed:true,
    twoSessionsReadSameServerState:true,ledgerAndInventoryUnchanged:true},
   businessFixture:{orderId:order.id,cutId:cut.id,lotId:lot.id,orderedFirstModel:120,
    orderedSecondModel:10,cut:80,remainingToCut:40,separated:50,
    cutWaitingSeparation:30,shipped:20,
    returns:rows.map(x=>({factionId:x.factionId,qty:x.qty,amountCents:x.amountCents})),
    totalSimulatedAcertoCents:rows.reduce((n,x)=>n+x.amountCents,0)},
   result:'passed_in_ci_only_if_file_exists',productionApproved:false,
   notes:'Não usar como prova de dados empresariais nem de dois dispositivos físicos.'
  };
  if(process.env.HLGB_EVIDENCE_DIR){
   fs.mkdirSync(process.env.HLGB_EVIDENCE_DIR,{recursive:true});
   fs.writeFileSync(path.join(process.env.HLGB_EVIDENCE_DIR,
    'hlgb-multimodelo-'+browserType.name()+'.json'),JSON.stringify(evidence,null,2)+'\n');
  }
  console.log('PASS laboratório PostgreSQL '+browserType.name()+': 2 sessões, conflito, ACK, offline, replay, 120/80/50');
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
});
