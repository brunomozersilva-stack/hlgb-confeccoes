'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const root=path.resolve(__dirname,'..'),shots=process.env.HLGB_SCREENSHOT_DIR||'/tmp/hlgb-operacao-integrada';
const routes={'/':'operacao-integrada.html',
 '/modulos/registro-v1.js':'modulos/registro-v1.js',
 '/modulos/pagamento-lote-v1.js':'modulos/pagamento-lote-v1.js',
 '/modulos/faccoes-multidestino-v1.js':'modulos/faccoes-multidestino-v1.js',
 '/modulos/grade-faccoes-v1.js':'modulos/grade-faccoes-v1.js',
 '/modulos/planejamento-materiais-v1.js':'modulos/planejamento-materiais-v1.js',
 '/modulos/corte-bom-v1.js':'modulos/corte-bom-v1.js',
 '/modulos/requisicoes-compras-v1.js':'modulos/requisicoes-compras-v1.js',
 '/modulos/observabilidade-v2.js':'modulos/observabilidade-v2.js',
 '/operacao-integrada-core.js':'operacao-integrada-core.js',
 '/operacao-integrada-ui.js':'operacao-integrada-ui.js','/folha-homologacao.html':'folha-homologacao.html'};
const server=http.createServer((req,res)=>{
 const file=routes[req.url];
 if(!file){res.writeHead(404);res.end();return}
 const data=fs.readFileSync(path.join(root,file));
 res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html;charset=utf-8':'text/javascript;charset=utf-8',
  'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'",
  'cache-control':'no-store'});
 res.end(data);
});
function revision(page){return page.locator('#top-revision').innerText().then(t=>Number(t.match(/Revisão local (\d+)/)?.[1]||0))}
async function module(page,id){await page.locator('[data-module="'+id+'"]').click();await page.waitForFunction(i=>document.querySelector('[data-module="'+i+'"]')?.getAttribute('aria-current')==='page',id)}
async function put(page,type,changes={}){
 const form=page.locator('form[data-command="'+type+'"]');
 assert.equal(await form.count(),1,'form '+type);
 const before=await revision(page);
 for(const [key,value] of Object.entries(changes)){
  const field=form.locator('[name="'+key+'"]');
  if(await field.evaluate(el=>el.tagName==='SELECT'))await field.selectOption(String(value));
  else await field.fill(String(value));
 }
 await form.locator('button[type=submit]').click();
 try{await page.waitForFunction(prev=>{
  const m=document.querySelector('#top-revision')?.textContent.match(/Revisão local (\d+)/);
  return !!m&&Number(m[1])===prev+1;
 },before,{timeout:9500})}
 catch(e){throw Error('Comando '+type+' não confirmou: '+await page.locator('#flash').innerText()+' ('+e.message+')')}
 assert.match(await page.locator('#flash').innerText(),/Salvo e confirmado por releitura/);
 return before+1;
}
async function run(browser,width,url){
 const ctx=await browser.newContext({viewport:{width,height:820},acceptDownloads:true});
 const page=await ctx.newPage(),errors=[],remote=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('request',req=>{if(!req.url().startsWith(url))remote.push(req.url())});
 try{
  await page.goto(url);
  await page.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 1'));
  assert.equal(await page.locator('[data-module]').count(),19);
  await module(page,'auditor');
  assert.match(await page.locator('#module-content').innerText(),/Observabilidade 2.0/);
  await module(page,'bot');
  assert.match(await page.locator('#module-content').innerText(),/Assistente de triagem/);
  await module(page,'relatorios');
  assert.match(await page.locator('#module-content').innerText(),/Histórico completo/);
  await module(page,'nucleo');
  // Desativar o plugin não apaga as funções antigas nem interrompe cadastro e pagamento.
  await page.locator('[data-toggle-observer]').click();
  await module(page,'auditor');
  assert.match(await page.locator('#module-content').innerText(),/Diagnóstico determinístico/);
  await module(page,'bot');
  assert.match(await page.locator('#module-content').innerText(),/Recomendações baseadas em regras fixas/);
  await module(page,'relatorios');
  assert.match(await page.locator('#module-content').innerText(),/Indicadores vinculados/);
  await module(page,'nucleo');
  await page.locator('[data-toggle-observer]').click();
  await module(page,'auditor');
  assert.match(await page.locator('#module-content').innerText(),/Observabilidade 2.0/);
  await module(page,'nucleo');
  assert.match(await page.locator('#module-title').innerText(),/Salvamento/);
  await module(page,'pedidos');
  await put(page,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',P:'8',M:'12',G:'0',GG:'0'});
  assert.match(await page.locator('#module-content').innerText(),/PED-0001/);
  assert.match(await page.locator('#global-metrics').innerText(),/Peças pedidas\s+20/);
  await module(page,'corte');
  await put(page,'cut.record',{orderId:'PED-0001',size:'P',qty:'6'});
  await put(page,'cut.record',{orderId:'PED-0001',size:'M',qty:'10'});
  let rev=await revision(page);
  const invalid=page.locator('form[data-command="cut.record"]');
  await invalid.locator('[name="size"]').selectOption('P');
  await invalid.locator('[name="qty"]').fill('9');
  await invalid.locator('button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('excede'));
  assert.equal(await revision(page),rev,'corte excedente não grava');
  await put(page,'cut.plan',{orderId:'PED-0001',P:'2',M:'2',G:'0',GG:'0',workMode:'interno',
   cutterOne:'Ana Cortadora',cutterTwo:'Beto Cortador',spreader:'Carla Enfestadora'});
  assert.match(await page.locator('#module-content').innerText(),/COR-0001/);
  await put(page,'cut.plan.update',{id:'COR-0001',P:'2',M:'2',G:'0',GG:'0',workMode:'externo',
   cutterOne:'Ana Cortadora',cutterTwo:'Beto Cortador',spreader:'Carla Enfestadora'});
  await put(page,'cut.plan.complete',{id:'COR-0001',usefulGrams:'480',scrapGrams:'35',
   signatureOne:'Ana Cortadora',signatureTwo:'Beto Cortador'});
  assert.match(await page.locator('#module-content').innerText(),/480 g útil \+ 35 g lixo/);
  await page.evaluate(()=>{window.print=()=>{document.body.dataset.printProof='true'}});
  await page.locator('button[data-print-plan="COR-0001"]').click();
  assert.equal(await page.locator('body').getAttribute('data-print-proof'),'true');
  assert.match(await page.locator('#cut-print').innerText(),/Folha de Corte FICTÍCIA/);
  assert.match(await page.locator('#cut-print').innerText(),/Carla Enfestadora/);
  assert.match(await page.locator('#cut-print').innerText(),/35 g/);
  await module(page,'faccoes');
  await put(page,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0002',qty:'12'});
  await put(page,'faction.return',{orderId:'PED-0001',qty:'9'});
  await module(page,'acertos');
  assert.match(await page.locator('#module-content').innerText(),/ACE-0001/);
  await put(page,'settlement.adjust',{id:'ACE-0001',adjustmentCents:'1,00'});
  await module(page,'separacao');
  await put(page,'order.separate',{orderId:'PED-0001',qty:'7'});
  await put(page,'order.ship',{orderId:'PED-0001',qty:'5'});
  await module(page,'compras');
  await put(page,'purchase.add',{supplierId:'FOR-0001',materialId:'MAT-0002',qtyGrams:'2000',
   checkerOne:'Pessoa A',checkerTwo:'Pessoa B'});
  await put(page,'purchase.receive',{id:'COM-0001'});
  await module(page,'folha');
  await put(page,'payroll.update',{id:'FUN-0001',salaryCents:'2.000,00',passageCents:'250,00',
   extrasCents:'0,00',discountCents:'0,00'});
  await module(page,'impressora3d');
  await put(page,'print.add',{name:'Chaveiro Teste Offline',grams:'24',priceCents:'7,90',stock:'3'});
  await module(page,'central');
  await put(page,'error.add',{message:'Falta de teste fictícia'});
  await put(page,'error.resolve',{id:'ERR-0001'});
  await module(page,'hub');
  assert.match(await page.locator('#module-content').innerText(),/Acerto fictício/);
  await put(page,'finance.pay',{id:'FIN-0002'});
  await module(page,'auditor');
  assert.match(await page.locator('#module-content').innerText(),/0 alertas|Sem inconsistências/);
  await module(page,'bot');
  assert.match(await page.locator('#module-content').innerText(),/Assistente de triagem|regras fixas/);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
  const report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(report.schema,'hlgb-evolucao-operacao-integrada-report-v1');
  assert.equal(report.productionApproval,false);
  assert.equal(report.observability.schema,'hlgb-lab-observabilidade-v2');
  assert.equal(report.observability.summary.events,report.data.log.length);
  assert.equal(report.observability.productionApproval,false);
  assert.equal(report.parityApproved,false);
  assert.equal(report.modulesVisited,19);
  assert.equal(report.checks.ok,true);
  assert.equal(report.data.orders.length,1);
  assert.equal(report.journey.orderId,'PED-0001');
  assert.equal(report.journey.total,8);
  assert.equal(report.journey.productionApproval,false);
  assert.equal(report.journey.completed,7,'sem compra do material da Melina');
  const order=report.data.orders[0];
  assert.deepEqual(order.grade,{P:8,M:12,G:0,GG:0});
  assert.deepEqual(order.cut,{P:8,M:12,G:0,GG:0});
  assert.equal(report.data.cutPlans.length,1);
  assert.equal(report.data.cutPlans[0].status,'concluido');
  assert.equal(report.data.cutPlans[0].workMode,'externo');
  assert.equal(report.data.cutPlans[0].scrapGrams,35);
  assert.equal(order.allocated,12);assert.equal(order.returned,9);
  assert.equal(order.separated,7);assert.equal(order.shipped,5);
  assert.equal(report.data.materials.find(x=>x.id==='MAT-0001').stockGrams,16000-20*120-35);
  assert.equal(report.data.materials.find(x=>x.id==='MAT-0002').stockGrams,10000);
  assert.equal(report.data.settlements[0].amountCents,9*550+100);
  assert.equal(report.data.finance.find(x=>x.sourceId==='ACE-0001').status,'pago');
  assert.equal(report.data.employees[0].passageCents,25000);
  assert.equal(report.data.errors[0].status,'resolvido');
  assert.equal(new Set(report.data.log.map(x=>x.commandId)).size,report.data.log.length);
  const expectedRev=report.data.revision;
  await page.reload();
  await page.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),expectedRev);
  await module(page,'pedidos');
  assert.match(await page.locator('#module-content').innerText(),/PED-0001/);
  // Mesmo perfil, duas abas reais, mesmo IndexedDB. O formulário da primeira aba não se perde em conflito.
  if(width===375){
   await module(page,'hub');
   const tab=await ctx.newPage();await tab.goto(url);
   await tab.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),expectedRev);
   await module(tab,'hub');
   await put(tab,'finance.add',{description:'Conta concorrente fictícia',kind:'pagar',amountCents:'55,00'});
   const form=page.locator('form[data-command="finance.add"]');
   await form.locator('[name="description"]').fill('Meu rascunho deve permanecer');
   await form.locator('[name="amountCents"]').fill('30,00');
   await form.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('CONFLITO'));
   assert.equal(await form.locator('[name="description"]').inputValue(),'Meu rascunho deve permanecer');
   assert.equal(await revision(page),expectedRev);
   await page.locator('#refresh').click();
   await page.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),expectedRev+1);
   await tab.close();
   // Teste completo no navegador: outra encomenda fictícia, transferência antes do retorno,
   // preço por modelo, travetada futura, embalagem avulsa e reconciliação no Hub.
   await module(page,'pedidos');
   await put(page,'order.add',{clientId:'CLI-0002',productId:'PRO-0002',P:'10',M:'0',G:'0',GG:'0'});
   await module(page,'corte');
   await put(page,'cut.record',{orderId:'PED-0002',size:'P',qty:'10'});
   await module(page,'faccoes');
   await put(page,'faction.allocate',{orderId:'PED-0002',factionId:'FAC-0001',qty:'8'});
   await put(page,'faction.rate.set',{factionId:'FAC-0002',productId:'PRO-0002',
    unitCents:'3,00',reason:'Preço específico por modelo'});
   await put(page,'faction.reassign',{orderId:'PED-0002',factionId:'FAC-0002',
    reason:'Troca autorizada antes do retorno fictício'});
   assert.match(await page.locator('#module-content').innerText(),/TRO-0001/);
   const filter=page.locator('#faction-search');
   await filter.fill('OFICINA EXEMPLO B');
   assert.equal(await page.locator('#faction-table tbody tr:visible').count(),1);
   await filter.fill('');
   await put(page,'faction.return',{orderId:'PED-0002',qty:'5'});
   await put(page,'faction.traveta.set',{factionId:'FAC-0002',traveta:'true',
    reason:'Agora a facção traveta futuros retornos'});
   await put(page,'faction.return',{orderId:'PED-0002',qty:'3'});
   const snap=await revision(page);
   const transfer=page.locator('form[data-command="faction.reassign"]');
   // O pedido não aparece mais na lista de transferência por já ter retornado.
   assert.equal(await transfer.locator('[name="orderId"] option[value="PED-0002"]').count(),0);
   assert.equal(await revision(page),snap);
   await module(page,'acertos');
   await put(page,'settlement.add',{serviceType:'embalagem',factionId:'FAC-0002',
    productId:'PRO-0002',qty:'100',unitCents:'0,15',travetaCents:'0,05',
    reason:'Embalagem fictícia calcinha'});
   await put(page,'settlement.pieces.return',{id:'ACE-0004',qty:'10',
    reason:'Dez embalagens devolvidas no teste'});
   await put(page,'settlement.adjust',{id:'ACE-0004',adjustmentCents:'1,00',
    reason:'Conferência do valor da embalagem'});
   await page.locator('#settlement-search').fill('embalagem');
   assert((await page.locator('#settlement-table tbody tr:visible').count())>=1);
   await module(page,'hub');
   const linkedTitleId=await page.locator('form[data-command="finance.pay"] select[name="id"] option')
    .filter({hasText:'ACE-0004'}).getAttribute('value');
   assert.match(linkedTitleId,/^FIN-/);
   await put(page,'finance.pay',{id:linkedTitleId});
   await module(page,'acertos');
   const row=page.locator('#settlement-table tbody tr').filter({hasText:'ACE-0004'});
   assert.match(await row.innerText(),/pago/i);
   assert.match(await row.innerText(),/10,00/);
   await put(page,'settlement.compensate',{id:'ACE-0004',deltaCents:'-2,00',
    reference:'AJ-EMBALAGEM-001',reason:'Crédito simulado para recuperar diferença'});
   await put(page,'settlement.compensate',{id:'ACE-0004',deltaCents:'1,00',
    reference:'AJ-EMBALAGEM-002',reason:'Débito complementar fictício'});
   assert.match(await page.locator('#module-content').innerText(),/CMP-0001/);
   assert.match(await page.locator('#module-content').innerText(),/CMP-0002/);
   const beforeComp=await revision(page);
   const duplicate=page.locator('form[data-command="settlement.compensate"]');
   assert.equal(await duplicate.locator('[name="id"]').inputValue(),'ACE-0004','manter destino do acerto após salvar');
   await duplicate.locator('[name="id"]').selectOption('ACE-0004');
   await duplicate.locator('[name="reference"]').fill('aj-embalagem-001');
   await duplicate.locator('[name="deltaCents"]').fill('3,00');
   await duplicate.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('Referência de compensação já utilizada'));
   assert.equal(await revision(page),beforeComp);
   await module(page,'hub');
   const compensationTitle=await page.locator('form[data-command="finance.pay"] select[name="id"] option')
    .filter({hasText:'CMP-0001'}).getAttribute('value');
   assert.match(compensationTitle,/^FIN-/);
   await put(page,'finance.pay',{id:compensationTitle});
   await module(page,'acertos');
   assert.match(await page.locator('#module-content').innerText(),/AJ-EMBALAGEM-001/);
   // Busca e filtros combinados em dados fictícios, sem regravar saldos.
   const filteredRevision=await revision(page);
   await page.locator('#settlement-status').selectOption('aberto');
   assert.equal(await page.locator('#settlement-compensation-table tbody tr:visible').count(),0);
   await page.locator('#settlement-status').selectOption('todos');
   await page.locator('#settlement-faction').selectOption('FAC-0002');
   await page.locator('#settlement-service').selectOption('embalagem');
   assert.equal(await page.locator('#settlement-table tbody tr:visible').count(),1);
   assert.equal(await page.locator('#settlement-compensation-table tbody tr:visible').count(),2);
   await page.locator('#settlement-compensation').selectOption('pago');
   assert.equal(await page.locator('#settlement-compensation-table tbody tr:visible').count(),1);
   assert.match(await page.locator('#settlement-compensation-table tbody tr:visible').innerText(),/CMP-0001/);
   await page.locator('#settlement-search').fill('aj-embalagem-002');
   assert.equal(await page.locator('#settlement-table tbody tr:visible').count(),1,'busca referência localiza acerto original');
   assert.equal(await page.locator('#settlement-compensation-table tbody tr:visible').count(),0);
   await page.locator('#settlement-compensation').selectOption('todos');
   assert.equal(await page.locator('#settlement-compensation-table tbody tr:visible').count(),1);
   assert.match(await page.locator('#settlement-query-summary').innerText(),/1 de 4 acertos/);
   // A seleção local sobrevive a uma mudança de módulo.
   await module(page,'hub');
   await module(page,'acertos');
   assert.equal(await page.locator('#settlement-search').inputValue(),'aj-embalagem-002');
   assert.equal(await page.locator('#settlement-table tbody tr:visible').count(),1);
   await page.locator('#settlement-clear-filters').click();
   assert.equal(await page.locator('#settlement-search').inputValue(),'');
   assert.equal(await page.locator('#settlement-table tbody tr:visible').count(),4);
   assert.equal(await page.locator('#settlement-compensation-table tbody tr:visible').count(),2);
   assert.equal(await revision(page),filteredRevision,'consultas não alteram lançamentos nem revisão');
   await page.evaluate(()=>{window.print=()=>{document.body.dataset.compPrintProof='true'}});
   await page.locator('button[data-print-comp="CMP-0001"]').click();
   assert.equal(await page.locator('body').getAttribute('data-comp-print-proof'),'true');
   assert.match(await page.locator('#cut-print').innerText(),/Conferência de Compensação FICTÍCIA/);
   assert.match(await page.locator('#cut-print').innerText(),/AJ-EMBALAGEM-001/);
   assert.match(await page.locator('#cut-print').innerText(),/ACE-0004/);
   const [csvComp]=await Promise.all([page.waitForEvent('download'),page.locator('#export-csv').click()]);
   const textCsv=fs.readFileSync(await csvComp.path(),'utf8');
   assert.match(textCsv,/Compensação/);
   assert.match(textCsv,/CMP-0001/);
   assert.match(textCsv,/CMP-0002/);
   await module(page,'relatorios');
   const historySearch=page.locator('#history-search');
   await historySearch.fill('settlement.compensate');
   assert.equal(await page.locator('#audit-history-table tbody tr:visible').count(),2);
   await historySearch.fill('');
   const [observerCsv]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-observer-csv').click()]);
   const historyCsv=fs.readFileSync(await observerCsv.path(),'utf8');
   assert.match(historyCsv,/settlement.compensate/);
   assert.match(historyCsv,/finance.pay/);
   await module(page,'auditor');
   assert.match(await page.locator('#module-content').innerText(),/Observabilidade 2.0/);
   await module(page,'bot');
   assert.match(await page.locator('#module-content').innerText(),/Assistente de triagem/);
   const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
   const evidence=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
   assert.equal(evidence.data.orders.length,2);
   assert.equal(evidence.data.factionTransfers.length,1);
   assert.equal(evidence.data.settlements.length,4);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0002').unitCents,250);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0003').unitCents,300);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0004').amountCents,1000);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0004').qty,90);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0004').returns.length,1);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0004').status,'pago');
   assert.equal(evidence.data.finance.find(x=>x.sourceId==='ACE-0004').amountCents,1000);
   assert.equal(evidence.data.finance.find(x=>x.sourceId==='ACE-0004').status,'pago');
   assert.equal(evidence.data.settlementCompensations.length,2);
   assert.equal(evidence.data.settlementCompensations[0].deltaCents,-200);
   assert.equal(evidence.data.settlementCompensations[0].status,'pago');
   assert.equal(evidence.data.settlementCompensations[1].deltaCents,100);
   assert.equal(evidence.data.settlementCompensations[1].status,'aberto');
   assert.equal(evidence.data.finance.find(x=>x.sourceId==='CMP-0001').kind,'receber');
   assert.equal(evidence.data.finance.find(x=>x.sourceId==='CMP-0002').kind,'pagar');
   assert.equal(evidence.data.finance.find(x=>x.sourceId==='CMP-0001').amountCents,200);
   assert.equal(evidence.totals.compensatedNet,-100);
   assert.equal(evidence.checks.ok,true);
   // Roteiro de homologação do MESMO pedido. Não aproveitar compras de outros materiais.
   await module(page,'nucleo');
   await page.locator('#journey-order').selectOption('PED-0002');
   assert.match(await page.locator('#journey-progress').innerText(),/5 de 8 etapas/);
   assert.equal(await page.locator('[data-step-id="compras"]').getAttribute('data-completed'),'true');
   assert.equal(await page.locator('[data-step-id="expedicao"]').getAttribute('data-completed'),'false');
   await page.locator('#journey-order').selectOption('PED-0001');
   assert.match(await page.locator('#journey-progress').innerText(),/7 de 8 etapas/);
   assert.equal(await page.locator('[data-step-id="compras"]').getAttribute('data-completed'),'false');
   assert.equal(await page.locator('[data-step-id="hub"]').getAttribute('data-completed'),'true');
   const queryRevision=await revision(page);
   await page.locator('[data-step-id="compras"] button[data-goto="compras"]').click();
   assert.match(await page.locator('#module-title').innerText(),/Compras/);
   await module(page,'nucleo');
   assert.equal(await page.locator('#journey-order').inputValue(),'PED-0001');
   assert.equal(await revision(page),queryRevision,'navegar e consultar não gera pagamentos nem gravacões');
   // Concluir a única etapa ausente: compra do material correspondente ao pedido 1.
   await module(page,'compras');
   await put(page,'purchase.add',{supplierId:'FOR-0001',materialId:'MAT-0001',
    qtyGrams:'1500',checkerOne:'Conferente Um',checkerTwo:'Conferente Dois'});
   await put(page,'purchase.receive',{id:'COM-0002'});
   await module(page,'nucleo');
   await page.locator('#journey-order').selectOption('PED-0001');
   assert.match(await page.locator('#journey-progress').innerText(),/8 de 8 etapas/);
   assert.equal(await page.locator('#journey-steps [data-completed="false"]').count(),0);
   const afterJourney=await revision(page);
   const [journeyDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
   const journeyReport=JSON.parse(fs.readFileSync(await journeyDownload.path(),'utf8'));
   assert.equal(journeyReport.journey.completed,8);
   assert.equal(journeyReport.journey.orderId,'PED-0001');
   assert.equal(journeyReport.productionApproval,false);
   assert.equal(await revision(page),afterJourney,'exportação não efetua gravação');
   await page.reload();
   await page.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),afterJourney);
   await module(page,'nucleo');
   await page.locator('#journey-order').selectOption('PED-0001');
   assert.match(await page.locator('#journey-progress').innerText(),/8 de 8 etapas/);
   // Fechamento em lote modular: acertos futuros e compensação positiva, sem gravar na prévia.
   const linkedSources=['ACE-0002','ACE-0003','CMP-0002'];
   const batchIds=linkedSources.map(sourceId=>evidence.data.finance.find(x=>x.sourceId===sourceId).id);
   const originalPaid=evidence.data.finance.find(x=>x.sourceId==='ACE-0004');
   await module(page,'hub');
   const batchForm=page.locator('form[data-command="finance.batch.pay"]');
   assert.equal(await batchForm.count(),1);
   const preRev=await revision(page);
   await batchForm.locator('input[value="'+batchIds[0]+'"]').check();
   await page.locator('#preview-finance-batch').click();
   assert.match(await page.locator('#flash').innerText(),/Selecione entre 2 e 50/);
   assert.equal(await revision(page),preRev,'prévia inválida não executa baixa');
   await batchForm.locator('input[value="'+batchIds[1]+'"]').check();
   await batchForm.locator('input[value="'+batchIds[2]+'"]').check();
   assert.match(await page.locator('#finance-batch-summary').innerText(),/3 título/);
   assert.match(await page.locator('#finance-batch-summary').innerText(),/22,50/);
   await batchForm.locator('[name="reference"]').fill('LOTE-DEMO-2026-001');
   await batchForm.locator('[name="reason"]').fill('Conferência fictícia coletiva');
   await page.locator('#preview-finance-batch').click();
   assert.match(await page.locator('#flash').innerText(),/Prévia validada: 3 título/);
   assert.equal(await revision(page),preRev,'validar sem pagar não altera revisão');
   await batchForm.locator('button[type=submit]').click();
   await page.waitForFunction(prev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+(prev+1)),preRev);
   assert.match(await page.locator('#flash').innerText(),/Salvo e confirmado por releitura local/);
   assert.match(await page.locator('#module-content').innerText(),/PAG-0001/);
   assert.match(await page.locator('#module-content').innerText(),/LOTE-DEMO-2026-001/);
   assert.equal(await page.locator('#finance-batch-form input[name="financeIds"]').count(),0,
    'não deixar títulos pagos selecionáveis para repetição');
   const [batchDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
   const afterBatch=JSON.parse(fs.readFileSync(await batchDownload.path(),'utf8'));
   assert.equal(afterBatch.data.paymentBatches.length,1);
   assert.equal(afterBatch.data.paymentBatches[0].count,3);
   assert.equal(afterBatch.data.paymentBatches[0].totalCents,2250);
   assert.deepEqual(afterBatch.data.paymentBatches[0].items.map(x=>x.financeId),batchIds);
   assert.ok(batchIds.every(id=>afterBatch.data.finance.find(x=>x.id===id).status==='pago'));
   assert.equal(afterBatch.data.finance.find(x=>x.id===originalPaid.id).amountCents,originalPaid.amountCents);
   assert.equal(afterBatch.data.finance.find(x=>x.id===originalPaid.id).status,originalPaid.status);
   assert.equal(afterBatch.data.settlementCompensations.find(x=>x.id==='CMP-0002').status,'pago');
   assert.equal(afterBatch.checks.ok,true);
   assert.equal(afterBatch.totals.paymentBatches,1);
   const [batchCsv]=await Promise.all([page.waitForEvent('download'),page.locator('#export-csv').click()]);
   assert.match(fs.readFileSync(await batchCsv.path(),'utf8'),/LOTE-DEMO-2026-001/);
   const postRev=await revision(page);
   await page.reload();
   await page.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),postRev);
   await module(page,'hub');
   assert.match(await page.locator('#module-content').innerText(),/LOTE-DEMO-2026-001/);
   assert.equal(await revision(page),postRev);

   // Pedido 3 dividido entre duas facções, retorno individual e devolução rastreada.
   await module(page,'pedidos');
   await put(page,'order.add',{clientId:'CLI-0001',productId:'PRO-0003',
    P:'14',M:'0',G:'0',GG:'0'});
   await module(page,'corte');
   await put(page,'cut.record',{orderId:'PED-0003',size:'P',qty:'14'});
   await module(page,'faccoes');
   await put(page,'faction.multi.allocate',{
    orderId:'PED-0003',factionId:'FAC-0001',qty:'5'});
   await put(page,'faction.multi.allocate',{
    orderId:'PED-0003',factionId:'FAC-0002',qty:'7'});
   assert.match(await page.locator('#module-content').innerText(),/Distribuição por pedido e facção/);
   const entryA=await page.locator(
    'form[data-command="faction.multi.return"] [name="assignmentId"] option')
    .filter({hasText:'PED-0003 · Oficina Exemplo A'}).getAttribute('value');
   const entryB=await page.locator(
    'form[data-command="faction.multi.return"] [name="assignmentId"] option')
    .filter({hasText:'PED-0003 · Oficina Exemplo B'}).getAttribute('value');
   assert.match(entryA,/^ALO-/);
   assert.match(entryB,/^ALO-/);
   assert.notEqual(entryA,entryB);
   assert.equal(await page.locator('form[data-command="faction.return"] option[value="PED-0003"]').count(),0,
    'retorno simples não deve atribuir facção errada a pedido dividido');
   await put(page,'faction.multi.return',{assignmentId:entryB,qty:'3'});
   await put(page,'faction.multi.return',{assignmentId:entryA,qty:'4'});
   await module(page,'acertos');
   await put(page,'settlement.pieces.return',{id:'ACE-0005',qty:'1',
    reason:'Uma peça da facção B devolvida em teste'});
   const [manyDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
   const many=JSON.parse(fs.readFileSync(await manyDownload.path(),'utf8'));
   const entries=many.data.factionAssignments.filter(x=>x.orderId==='PED-0003');
   assert.equal(entries.length,2);
   assert.deepEqual(entries.map(x=>x.qtySent),[5,7]);
   assert.deepEqual(entries.map(x=>x.qtyReturned),[4,2]);
   assert.equal(many.data.orders.find(x=>x.id==='PED-0003').allocated,12);
   assert.equal(many.data.orders.find(x=>x.id==='PED-0003').returned,6);
   const newest=many.data.settlements.filter(x=>x.orderId==='PED-0003');
   assert.equal(newest.length,2);
   assert.deepEqual(newest.map(x=>x.factionId),['FAC-0002','FAC-0001']);
   assert.deepEqual(newest.map(x=>x.qty),[2,4]);
   assert.deepEqual(newest.map(x=>x.assignmentId),[entryB,entryA]);
   assert.equal(many.checks.ok,true);
   assert.equal(many.productionApproval,false);
   await module(page,'faccoes');
   assert.match(await page.locator('#module-content').innerText(),/ALO-/);
   const manyRevision=await revision(page);
   await page.reload();
   await page.waitForFunction(rev=>
    document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),manyRevision);
   await module(page,'faccoes');
   assert.match(await page.locator('#module-content').innerText(),/PED-0003/);
   assert.equal(await revision(page),manyRevision);
   const transferForm=page.locator('form[data-command="faction.multi.transfer"]');
   assert.equal(await transferForm.count(),1);
   await transferForm.locator('[name="fromAssignmentId"]').selectOption(entryB);
   await transferForm.locator('[name="toFactionId"]').selectOption('FAC-0001');
   await transferForm.locator('[name="qty"]').fill('6');
   await transferForm.locator('[name="reason"]').fill('Tentativa de transferir acima do saldo pendente');
   await transferForm.locator('button[type="submit"]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('Transferência excede'));
   assert.equal(await revision(page),manyRevision,'transferência inválida não gera revisão');
   await put(page,'faction.multi.transfer',{fromAssignmentId:entryB,
    toFactionId:'FAC-0001',qty:'2',
    reason:'Redistribuição apenas do saldo não retornado'});
   const afterTransfer=await revision(page);
   await put(page,'faction.multi.return',{assignmentId:entryA,qty:'1'});
   const [transferDownload]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const transferReport=JSON.parse(fs.readFileSync(await transferDownload.path(),'utf8'));
   const move=transferReport.data.factionPartialTransfers[0];
   assert.equal(move.orderId,'PED-0003');
   assert.equal(move.fromAssignmentId,entryB);
   assert.equal(move.toAssignmentId,entryA);
   assert.deepEqual([move.fromBefore,move.fromAfter,move.toBefore,move.toAfter],[7,5,5,7]);
   assert.equal(move.qty,2);
   assert.equal(transferReport.data.orders.find(x=>x.id==='PED-0003').allocated,12);
   assert.equal(transferReport.data.orders.find(x=>x.id==='PED-0003').returned,7);
   assert.deepEqual(transferReport.data.factionAssignments
    .filter(x=>x.orderId==='PED-0003').map(x=>[x.qtySent,x.qtyReturned]),[[7,5],[5,2]]);
   assert.equal(transferReport.data.settlements.find(x=>x.id==='ACE-0005').qty,2);
   assert.equal(transferReport.data.settlements.find(x=>x.id==='ACE-0006').qty,4);
   assert.equal(transferReport.observability.summary.partialFactionTransfers,1);
   assert.equal(transferReport.observability.summary.piecesTransferred,2);
   assert.equal(transferReport.observability.findings.length,0);
   assert.equal(transferReport.checks.ok,true);
   assert.equal(transferReport.productionApproval,false);
   await module(page,'relatorios');
   assert.match(await page.locator('#module-content').innerText(),/Rastro de transferências/);
   assert.match(await page.locator('#module-content').innerText(),/TRP-0001/);
   const [transferCsv]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-observer-csv').click()]);
   assert.match(fs.readFileSync(await transferCsv.path(),'utf8'),/TRP-0001/);
   await page.reload();
   await page.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),
    afterTransfer+1);
   await module(page,'faccoes');
   assert.match(await page.locator('#module-content').innerText(),/TRP-0001/);

   // Homologação no navegador: grade por cor/tamanho, oficina, transferência e acerto.
   await module(page,'pedidos');
   await put(page,'order.add',{clientId:'CLI-0001',productId:'PRO-0003',
    P:'4',M:'2',G:'0',GG:'0'});
   await module(page,'corte');
   await put(page,'cut.record',{orderId:'PED-0004',size:'P',qty:'4'});
   await put(page,'cut.record',{orderId:'PED-0004',size:'M',qty:'2'});
   await module(page,'faccoes');
   await put(page,'order.color.grade.set',{orderId:'PED-0004',color:'Preto',
    P:'3',M:'1',G:'0',GG:'0'});
   assert.match(await page.locator('#module-content').innerText(),/Incompleta/);
   await put(page,'order.color.grade.set',{orderId:'PED-0004',color:'Rubi',
    P:'1',M:'1',G:'0',GG:'0'});
   assert.match(await page.locator('#module-content').innerText(),/Completa para alocar/);
   const noGradeRevision=await revision(page);
   // O formulário antigo nunca pode sobrescrever a classificação.
   assert.equal(await page.locator('form[data-command="faction.allocate"] option[value="PED-0004"]').count(),0);
   assert.equal(await page.locator('form[data-command="faction.multi.allocate"] option[value="PED-0004"]').count(),0);
   const rows=page.locator('form[data-command="faction.grade.allocate"]');
   assert.equal(await rows.count(),1);
   await rows.locator('[name="orderId"]').selectOption('PED-0004');
   await rows.locator('[name="factionId"]').selectOption('FAC-0001');
   await rows.locator('[name="color"]').selectOption('Preto');
   await rows.locator('[name="size"]').selectOption('P');
   await rows.locator('[name="qty"]').fill('4');
   await rows.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('excede a quantidade prevista'));
   assert.equal(await revision(page),noGradeRevision,'excedente por cor não grava');
   await put(page,'faction.grade.allocate',{orderId:'PED-0004',factionId:'FAC-0001',
    color:'Preto',size:'P',qty:'3'});
   await put(page,'faction.grade.allocate',{orderId:'PED-0004',factionId:'FAC-0001',
    color:'Preto',size:'M',qty:'1'});
   await put(page,'faction.grade.allocate',{orderId:'PED-0004',factionId:'FAC-0002',
    color:'Rubi',size:'P',qty:'1'});
   const [gradedIdsDownload]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const gradedInitial=JSON.parse(fs.readFileSync(await gradedIdsDownload.path(),'utf8'));
   const gradedAssignments=gradedInitial.data.factionAssignments.filter(x=>x.orderId==='PED-0004');
   assert.equal(gradedAssignments.length,2);
   const a=gradedAssignments.find(x=>x.factionId==='FAC-0001');
   const b=gradedAssignments.find(x=>x.factionId==='FAC-0002');
   assert.ok(a&&b);
   await put(page,'faction.grade.return',{assignmentId:a.id,color:'Preto',size:'P',qty:'2'});
   await put(page,'faction.grade.return',{assignmentId:b.id,color:'Rubi',size:'P',qty:'1'});
   await put(page,'faction.grade.transfer',{fromAssignmentId:a.id,toFactionId:'FAC-0002',
    color:'Preto',size:'P',qty:'1',reason:'Transferência fictícia por grade'});
   await put(page,'faction.grade.return',{assignmentId:b.id,color:'Preto',size:'P',qty:'1'});
   const [beforeReturnDL]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const beforeReturn=JSON.parse(fs.readFileSync(await beforeReturnDL.path(),'utf8'));
   const acertosGrade=beforeReturn.data.settlements.filter(x=>x.orderId==='PED-0004');
   assert.deepEqual(acertosGrade.map(x=>[x.color,x.size,x.qty]),
    [['Preto','P',2],['Rubi','P',1],['Preto','P',1]]);
   assert.equal(acertosGrade[0].factionId,'FAC-0001');
   assert.equal(acertosGrade[2].factionId,'FAC-0002');
   await module(page,'acertos');
   await put(page,'settlement.grade.pieces.return',{id:acertosGrade[0].id,qty:'1',
    reason:'Peça preta P devolvida da facção A'});
   await module(page,'relatorios');
   assert.match(await page.locator('#module-content').innerText(),/Grade por cor e tamanho/);
   assert.match(await page.locator('#module-content').innerText(),/Saldo real por facção/);
   const [gradeJson]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
   const gradedReport=JSON.parse(fs.readFileSync(await gradeJson.path(),'utf8'));
   const savedGraded=gradedReport.data.orders.find(x=>x.id==='PED-0004');
   assert.deepEqual(savedGraded.colorGrades.map(x=>[x.color,x.grade.P,x.grade.M]),
    [['Preto',3,1],['Rubi',1,1]]);
   assert.equal(savedGraded.allocated,5);
   assert.equal(savedGraded.returned,3);
   assert.equal(gradedReport.observability.summary.ordersWithColorGrade,1);
   assert.equal(gradedReport.observability.summary.gradePiecesOpen,2);
   assert.equal(gradedReport.observability.findings.length,0);
   assert.equal(gradedReport.data.factionPartialTransfers.at(-1).gradeTracked,true);
   assert.equal(gradedReport.data.settlements.find(x=>x.id===acertosGrade[0].id).qty,1);
   assert.equal(gradedReport.checks.ok,true);
   const [gradeCsv]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-observer-csv').click()]);
   assert.match(fs.readFileSync(await gradeCsv.path(),'utf8'),/Saldo por cor e tamanho/);
   await page.reload();
   const afterGradeRevision=gradedReport.data.revision;
   await page.waitForFunction(rev=>
    document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),
    afterGradeRevision);
   await module(page,'faccoes');
   assert.match(await page.locator('#module-content').innerText(),/Preto/);
   assert.equal(await revision(page),afterGradeRevision);

   // Paleta central, regra por variante e lista de materiais sem baixa de estoque.
   await module(page,'produtos');
   assert.match(await page.locator('#module-content').innerText(),/Paleta central de cores/);
   await put(page,'color.catalog.add',{name:'Azul-marinho'});
   const afterColor=await revision(page);
   const duplicated=page.locator('form[data-command="color.catalog.add"]');
   await duplicated.locator('[name="name"]').fill(' azul-MARINHO ');
   await duplicated.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('Cor já cadastrada'));
   assert.equal(await revision(page),afterColor,'cor duplicada não cria revisão');
   await put(page,'material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0001',
    color:'Preto',size:'P',gramsPerUnit:'125',reason:'Malha específica Preto P fictícia'});
   await put(page,'material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0002',
    color:'*',size:'*',gramsPerUnit:'15',reason:'Aviamento adicional no planejamento'});
   await module(page,'compras');
   assert.match(await page.locator('#module-content').innerText(),/Planejador semanal de produção/);
   await put(page,'materials.plan.add',{productId:'PRO-0001',color:'Preto',size:'P',qty:'100'});
   await put(page,'materials.plan.add',{productId:'PRO-0002',color:'Rubi',size:'M',qty:'200'});
   const [draftFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const draft=JSON.parse(fs.readFileSync(await draftFile.path(),'utf8'));
   assert.equal(draft.data.colorCatalog.at(-1).name,'Azul-marinho');
   assert.equal(draft.data.colorCatalog.at(-1).id,'CLR-0004');
   assert.equal(draft.data.materialRecipeRules.length,2);
   assert.equal(draft.data.materialPlanLines.length,2);
   assert.equal(draft.materialPlanning.stockWritten,false);
   assert.equal(draft.materialPlanning.purchaseCreated,false);
   assert.equal(draft.materialPlanning.pieces,300);
   assert.equal(draft.materialPlanning.materials.find(x=>x.materialId==='MAT-0001').requiredGrams,12500);
   assert.equal(draft.materialPlanning.materials.find(x=>x.materialId==='MAT-0002').requiredGrams,10500);
   assert.equal(draft.data.stockLedger.length,gradedReport.data.stockLedger.length,
    'paleta e planejamento não criam baixas de material');
   assert.equal(draft.data.purchaseOrders.length,transferReport.data.purchaseOrders.length);
   assert.equal(draft.checks.ok,true);
   await module(page,'relatorios');
   assert.match(await page.locator('#module-content').innerText(),/Planejamento teórico de compras/);
   const [draftCsv]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-csv').click()]);
   assert.match(fs.readFileSync(await draftCsv.path(),'utf8'),/Necessidade de material/);
   await module(page,'compras');
   await put(page,'materials.plan.archive',{id:'PLN-0001',
    reason:'Revisão fictícia do programa de corte'});
   const [archivedFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const archived=JSON.parse(fs.readFileSync(await archivedFile.path(),'utf8'));
   assert.equal(archived.data.materialPlanLines[0].active,false);
   assert.equal(archived.materialPlanning.pieces,200);
   assert.equal(archived.materialPlanning.materials.find(x=>x.materialId==='MAT-0001'),undefined);
   await page.reload();
   await page.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),
    archived.data.revision);
   await module(page,'compras');
   assert.match(await page.locator('#module-content').innerText(),/PLN-0001/);
   assert.equal(await revision(page),archived.data.revision);

   // A grade semanal inteira deve virar duas linhas em UM evento, sem compras/baixas.
   const beforeBatchGrade=await revision(page);
   await put(page,'materials.plan.grade.add',{productId:'PRO-0001',color:'Azul-marinho',
    P:'20',M:'30',G:'0',GG:'0'});
   assert.equal(await revision(page),beforeBatchGrade+1);
   const [completeListCsv]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-shopping-csv').click()]);
   const csvOnly=fs.readFileSync(await completeListCsv.path(),'utf8');
   assert.match(csvOnly,/LISTA DE MATERIAIS/);
   assert.match(csvOnly,/DETALHAMENTO POR MODELO/);
   assert.match(csvOnly,/Azul-marinho/);
   const [afterBatchFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const afterBatchPlan=JSON.parse(fs.readFileSync(await afterBatchFile.path(),'utf8'));
   assert.equal(afterBatchPlan.materialPlanning.pieces,250);
   assert.deepEqual(afterBatchPlan.data.materialPlanLines.slice(-2).map(x=>[x.size,x.qty]),
    [['P',20],['M',30]]);
   assert.equal(afterBatchPlan.data.log.at(-1).type,'materials.plan.grade.add');
   assert.equal(afterBatchPlan.data.materialPlanLines.at(-1).createdCommandId,
    afterBatchPlan.data.materialPlanLines.at(-2).createdCommandId);
   assert.equal(afterBatchPlan.data.stockLedger.length,draft.data.stockLedger.length);
   assert.equal(afterBatchPlan.data.purchaseOrders.length,draft.data.purchaseOrders.length);
   assert.equal(afterBatchPlan.checks.ok,true);
   assert.equal(afterBatchPlan.observability.findings.length,0);
   await page.reload();
   await page.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),
    afterBatchPlan.data.revision);
   await module(page,'compras');
   assert.match(await page.locator('#module-content').innerText(),/Azul-marinho/);

   // Ficha avançada de Corte BOM: 2 matérias, 1 transação, desperdício e dupla conferência.
   await module(page,'pedidos');
   await put(page,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',
    P:'5',M:'0',G:'0',GG:'0'});
   await module(page,'faccoes');
   await put(page,'order.color.grade.set',{orderId:'PED-0005',color:'Preto',
    P:'3',M:'0',G:'0',GG:'0'});
   await put(page,'order.color.grade.set',{orderId:'PED-0005',color:'Rubi',
    P:'2',M:'0',G:'0',GG:'0'});
   await module(page,'corte');
   const formBom=page.locator('form[data-command="cut.bom.execute"]');
   assert.equal(await formBom.count(),1);
   await formBom.locator('[name="orderId"]').selectOption('PED-0005');
   await formBom.locator('[name="color"]').selectOption('Preto');
   await formBom.locator('[name="size"]').selectOption('P');
   await formBom.locator('[name="qty"]').fill('2');
   await formBom.locator('[name="waste_MAT-0001"]').fill('25');
   await formBom.locator('[name="waste_MAT-0002"]').fill('5');
   const beforeBom=await revision(page);
   await page.locator('#preview-bom-cut').click();
   assert.match(await page.locator('#flash').innerText(),/Prévia validada/);
   assert.match(await page.locator('#flash').innerText(),/Nenhuma baixa executada/);
   assert.equal(await revision(page),beforeBom);
   await formBom.locator('[name="signatureTwo"]').fill('Nome errado');
   await formBom.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('conferências devem coincidir'));
   assert.equal(await revision(page),beforeBom);
   await put(page,'cut.bom.execute',{orderId:'PED-0005',color:'Preto',
    size:'P',qty:'2','waste_MAT-0001':'25','waste_MAT-0002':'5',
    signatureTwo:'Beto Cortador'});
   const [bomReportFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const reportBom=JSON.parse(fs.readFileSync(await bomReportFile.path(),'utf8'));
   const lot=reportBom.data.bomCutRuns[0];
   assert.equal(lot.id,'BOM-0001');
   assert.equal(lot.orderId,'PED-0005');
   assert.equal(lot.color,'Preto');
   assert.equal(lot.qty,2);
   assert.deepEqual(lot.materials.map(x=>[x.materialId,x.requiredGrams,x.scrapGrams]),
    [['MAT-0001',250,25],['MAT-0002',30,5]]);
   assert.equal(reportBom.data.stockLedger.filter(x=>x.bomCutId==='BOM-0001').length,2);
   assert.equal(reportBom.data.orders.find(x=>x.id==='PED-0005').cut.P,2);
   assert.equal(reportBom.observability.summary.bomCuts,1);
   assert.equal(reportBom.observability.summary.bomUsefulGrams,280);
   assert.equal(reportBom.observability.summary.bomScrapGrams,30);
   assert.equal(reportBom.observability.findings.length,0);
   assert.equal(reportBom.checks.ok,true);
   assert.equal(reportBom.data.finance.find(x=>x.sourceId==='PED-0005').status,'aberto');
   const afterBom=await revision(page);
   const legacyForm=page.locator('form[data-command="cut.record"]');
   await legacyForm.locator('[name="orderId"]').selectOption('PED-0005');
   await legacyForm.locator('[name="size"]').selectOption('P');
   await legacyForm.locator('[name="qty"]').fill('1');
   await legacyForm.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('não repita corte'));
   assert.equal(await revision(page),afterBom,'Corte antigo não permite duplicar consumo BOM');
   await module(page,'relatorios');
   assert.match(await page.locator('#module-content').innerText(),/Corte BOM: materiais/);
   const [bomCsv]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-observer-csv').click()]);
   assert.match(fs.readFileSync(await bomCsv.path(),'utf8'),/Consumo e lixo BOM/);
   await page.reload();
   await page.waitForFunction(rev=>document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),
    afterBom);
   await module(page,'corte');
   assert.match(await page.locator('#module-content').innerText(),/BOM-0001/);
   assert.equal(await revision(page),afterBom);

   // Requisições: demanda real do cenário, aprovação separada e compra sem baixa.
   await module(page,'compras');
   await put(page,'materials.plan.add',{productId:'PRO-0002',color:'Branco',size:'G',qty:'200'});
   const [forecastFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const scenario=JSON.parse(fs.readFileSync(await forecastFile.path(),'utf8'));
   const needed=scenario.materialPlanning.materials.find(x=>x.materialId==='MAT-0002');
   assert.ok(needed.missingGrams>0,'cenário deve exigir compra de renda');
   const currentRenda=scenario.data.materials.find(x=>x.id==='MAT-0002').stockGrams;
   const countPurchases=scenario.data.purchaseOrders.length;
   const countFinance=scenario.data.finance.length;
   await put(page,'purchase.request.create',{materialId:'MAT-0002',
    requester:'Compradora Fictícia',reason:'Falta de renda para a semana'});
   const oneRevision=await revision(page);
   const requestCreateForm=page.locator('form[data-command="purchase.request.create"]');
   assert.equal(await requestCreateForm.locator('[name="materialId"] option[value="MAT-0002"]').count(),0,
    'material com requisição ativa não deve ser oferecido para nova compra');
   assert.equal(await revision(page),oneRevision);
   const badApproval=page.locator('form[data-command="purchase.request.approve"]');
   await badApproval.locator('[name="approver"]').fill('Compradora Fictícia');
   await badApproval.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('pessoas diferentes'));
   assert.equal(await revision(page),oneRevision);
   await put(page,'purchase.request.approve',{id:'REQ-0001',
    approver:'Supervisora Fictícia',
    reason:'Conferência do planejamento e do saldo disponível'});
   const afterApprovalRev=await revision(page);
   const [approvedFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const approved=JSON.parse(fs.readFileSync(await approvedFile.path(),'utf8'));
   assert.equal(approved.data.purchaseRequests[0].status,'aprovada');
   assert.equal(approved.data.purchaseOrders.length,countPurchases);
   assert.equal(approved.data.finance.length,countFinance);
   assert.equal(approved.data.materials.find(x=>x.id==='MAT-0002').stockGrams,currentRenda);
   await put(page,'purchase.request.issue',{id:'REQ-0001',supplierId:'FOR-0001',
    checkerOne:'Aline Confere',checkerTwo:'Beto Confere',
    reason:'Ordem fictícia baseada na requisição aprovada'});
   const [issuedFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const issued=JSON.parse(fs.readFileSync(await issuedFile.path(),'utf8'));
   const issuedReq=issued.data.purchaseRequests[0];
   assert.equal(issuedReq.status,'emitida');
   assert.equal(issuedReq.qtyGrams,needed.missingGrams);
   const issuedPurchaseId=issuedReq.purchaseId;
   assert.ok(/^COM-\d+$/.test(issuedPurchaseId));
   assert.equal(issuedPurchaseId,issued.data.purchaseOrders.at(-1).id);
   assert.equal(issued.data.purchaseOrders.length,countPurchases+1);
   assert.equal(issued.data.purchaseOrders.at(-1).purchaseRequestId,'REQ-0001');
   assert.equal(issued.data.purchaseOrders.at(-1).received,false);
   assert.equal(issued.data.materials.find(x=>x.id==='MAT-0002').stockGrams,currentRenda);
   assert.equal(issued.data.finance.length,countFinance);
   const revBeforeReceipt=await revision(page);
   await put(page,'purchase.receive',{id:issuedPurchaseId});
   const [receiptFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const received=JSON.parse(fs.readFileSync(await receiptFile.path(),'utf8'));
   assert.equal(received.data.purchaseRequests[0].status,'recebida');
   assert.equal(received.data.materials.find(x=>x.id==='MAT-0002').stockGrams,
    currentRenda+needed.missingGrams);
   assert.equal(received.data.stockLedger.filter(x=>x.sourceId===issuedPurchaseId).length,1);
   assert.equal(received.data.finance.filter(x=>x.sourceId===issuedPurchaseId).length,1);
   assert.equal(received.data.finance.length,countFinance+1);
   assert.equal(received.observability.summary.receivedPurchaseRequests,1);
   assert.equal(received.observability.findings.length,0);
   assert.equal(received.checks.ok,true);
   const revAfterReceipt=await revision(page);
   const receiveAgain=page.locator('form[data-command="purchase.receive"]');
   // O recebimento não deve voltar a ser opção depois da primeira baixa.
   assert.equal(await receiveAgain.locator('[name="id"] option[value="'+issuedPurchaseId+'"]').count(),0);
   await module(page,'relatorios');
   assert.match(await page.locator('#module-content').innerText(),/Histórico de requisições/);
   const [reqCsv]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-csv').click()]);
   assert.match(fs.readFileSync(await reqCsv.path(),'utf8'),/Requisição/);
   await page.reload();
   await page.waitForFunction(rev=>
    document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),
    revAfterReceipt);
   await module(page,'compras');
   assert.match(await page.locator('#module-content').innerText(),/REQ-0001/);
   assert.match(await page.locator('#module-content').innerText(),/recebida/);
   assert.equal(await revision(page),revAfterReceipt);

   // Nova requisição de Malha: a compra será emitida e cancelada antes do recebimento.
   await put(page,'materials.plan.add',{productId:'PRO-0001',
    color:'Azul-marinho',size:'G',qty:'300'});
   await put(page,'purchase.request.create',{materialId:'MAT-0001',
    requester:'Solicitante Teste',reason:'Repor malha para produção fictícia'});
   await put(page,'purchase.request.approve',{id:'REQ-0002',
    approver:'Supervisora Teste',reason:'Déficit de malha conferido'});
   await put(page,'purchase.request.issue',{id:'REQ-0002',supplierId:'FOR-0002',
    checkerOne:'Equipe Um',checkerTwo:'Equipe Dois',
    reason:'Compra emitida sem recebimento para testar cancelamento'});
   const [issuedCancellationFile]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const beforeCancel=JSON.parse(fs.readFileSync(await issuedCancellationFile.path(),'utf8'));
   const reqToCancel=beforeCancel.data.purchaseRequests.find(x=>x.id==='REQ-0002');
   assert.equal(reqToCancel.status,'emitida');
   const purchaseToCancel=reqToCancel.purchaseId;
   assert.equal(beforeCancel.data.purchaseOrders.find(x=>x.id===purchaseToCancel).received,false);
   const snapshotStock=JSON.stringify(beforeCancel.data.materials);
   const snapshotLedger=JSON.stringify(beforeCancel.data.stockLedger);
   const snapshotFinance=JSON.stringify(beforeCancel.data.finance);
   const cancelRevision=await revision(page);
   const cancelForm=page.locator('form[data-command="purchase.request.cancelIssued"]');
   assert.equal(await cancelForm.count(),1);
   await cancelForm.locator('[name="id"]').selectOption('REQ-0002');
   await cancelForm.locator('[name="cancelledBy"]').fill('Conferente Mesmo');
   await cancelForm.locator('[name="reviewedBy"]').fill('Conferente Mesmo');
   await cancelForm.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('Conferência independente'));
   assert.equal(await revision(page),cancelRevision,'mesma pessoa não cancela');
   await put(page,'purchase.request.cancelIssued',{id:'REQ-0002',
    reference:'CANCEL-MALHA-002',cancelledBy:'Auxiliar Exemplo',
    reviewedBy:'Gerente Exemplo',
    reason:'Fornecedor não poderá atender a compra do exercício'});
   const [cancelledDoc]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-json').click()]);
   const cancelled=JSON.parse(fs.readFileSync(await cancelledDoc.path(),'utf8'));
   const cancelledReq=cancelled.data.purchaseRequests.find(x=>x.id==='REQ-0002');
   const cancelledPo=cancelled.data.purchaseOrders.find(x=>x.id===purchaseToCancel);
   assert.equal(cancelledReq.status,'emissao_cancelada');
   assert.equal(cancelledReq.cancelIssueReference,'CANCEL-MALHA-002');
   assert.equal(cancelledPo.cancelled,true);
   assert.equal(cancelledPo.received,false);
   assert.equal(cancelledPo.cancelReference,'CANCEL-MALHA-002');
   assert.equal(JSON.stringify(cancelled.data.materials),snapshotStock);
   assert.equal(JSON.stringify(cancelled.data.stockLedger),snapshotLedger);
   assert.equal(JSON.stringify(cancelled.data.finance),snapshotFinance);
   assert.equal(cancelled.observability.summary.cancelledIssuedPurchases,1);
   assert.equal(cancelled.observability.findings.length,0);
   assert.equal(cancelled.checks.ok,true);
   const disabledPurchase=page.locator('form[data-command="purchase.receive"]');
   assert.equal(await disabledPurchase.locator('[name="id"] option[value="'+purchaseToCancel+'"]').count(),0,
    'compra cancelada não pode voltar para recebimento');
   await module(page,'relatorios');
   assert.match(await page.locator('#module-content').innerText(),/emissao_cancelada/);
   const [cancelCsv]=await Promise.all([page.waitForEvent('download'),
    page.locator('#export-csv').click()]);
   assert.match(fs.readFileSync(await cancelCsv.path(),'utf8'),/CANCEL-MALHA-002/);
   const cancelledRevision=cancelled.data.revision;
   await page.reload();
   await page.waitForFunction(rev=>
    document.querySelector('#top-revision')?.textContent.includes('Revisão local '+rev),
    cancelledRevision);
   await module(page,'compras');
   assert.match(await page.locator('#module-content').innerText(),/CANCEL-MALHA-002/);
   assert.match(await page.locator('#module-content').innerText(),/Cancelada/);
   assert.equal(await revision(page),cancelledRevision);
  }
  const d=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  if(d.scroll>d.width+2){
   const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>{
    const rect=el.getBoundingClientRect();
    return {tag:el.tagName,id:el.id,cls:String(el.className||'').slice(0,80),
     right:Math.round(rect.right),width:Math.round(rect.width),
     text:(el.textContent||'').trim().slice(0,80)};
   }).filter(x=>x.right>innerWidth+2).sort((a,b)=>b.right-a.right).slice(0,18));
   console.log('DEBUG_OVERFLOW_'+width,JSON.stringify(offenders));
   const blocks=await page.evaluate(()=>[...document.querySelectorAll(
    'html,body,.frame,.side,.nav,.workspace,.topbar,main,.tiles,.panel,.fields,.field,.table-wrap,.flow,.log,#module-content,#audit-trail')]
    .map(el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);
     return {tag:el.tagName,cls:String(el.className||'').slice(0,45),id:el.id,
      width:Math.round(r.width),right:Math.round(r.right),scroll:el.scrollWidth,
      client:el.clientWidth,overflow:c.overflowX,text:(el.textContent||'').trim().slice(0,38)};})
    .filter(x=>x.width>innerWidth+1||x.scroll>x.client+5)
    .sort((a,b)=>(b.width-a.width)||(b.scroll-b.client)-(a.scroll-a.client)).slice(0,40));
   console.log('DEBUG_BLOCKS_'+width,JSON.stringify(blocks));
  }
  assert(d.scroll<=d.width+2,'overflow '+width+'px '+JSON.stringify(d));
  assert.deepEqual(errors,[],'erros JS');
  assert.deepEqual(remote,[],'nenhuma requisição externa');
  if(width===375){
   fs.mkdirSync(shots,{recursive:true});
   await page.screenshot({path:path.join(shots,'operacao-integrada-'+browserType.name()+'-375.png'),fullPage:true});
  }
  console.log('PASS integração '+browserType.name()+' '+width+'px: 19 módulos, transações integradas, 2 abas, relatório e recuperação');
 }finally{await ctx.close()}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 const browser=await browserType.launch({headless:true});
 try{for(const width of [320,375,390,768,1280])await run(browser,width,url)}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
