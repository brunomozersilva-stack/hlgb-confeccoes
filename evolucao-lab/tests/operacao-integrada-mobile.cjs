'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const root=path.resolve(__dirname,'..'),shots=process.env.HLGB_SCREENSHOT_DIR||'/tmp/hlgb-operacao-integrada';
const routes={'/':'operacao-integrada.html','/operacao-integrada-core.js':'operacao-integrada-core.js',
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
  assert.match(await page.locator('#module-content').innerText(),/Sem inconsistências/);
  await module(page,'bot');
  assert.match(await page.locator('#module-content').innerText(),/regras fixas/);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
  const report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(report.schema,'hlgb-evolucao-operacao-integrada-report-v1');
  assert.equal(report.productionApproval,false);
  assert.equal(report.parityApproved,false);
  assert.equal(report.modulesVisited,19);
  assert.equal(report.checks.ok,true);
  assert.equal(report.data.orders.length,1);
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
   await put(page,'settlement.adjust',{id:'ACE-0004',adjustmentCents:'1,00',
    reason:'Conferência do valor da embalagem'});
   await page.locator('#settlement-search').fill('embalagem');
   assert((await page.locator('#settlement-table tbody tr:visible').count())>=1);
   await module(page,'hub');
   await put(page,'finance.pay',{id:'FIN-0007'});
   await module(page,'acertos');
   const row=page.locator('#settlement-table tbody tr').filter({hasText:'ACE-0004'});
   assert.match(await row.innerText(),/pago/i);
   assert.match(await row.innerText(),/11,00/);
   const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
   const evidence=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
   assert.equal(evidence.data.orders.length,2);
   assert.equal(evidence.data.factionTransfers.length,1);
   assert.equal(evidence.data.settlements.length,4);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0002').unitCents,250);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0003').unitCents,300);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0004').amountCents,1100);
   assert.equal(evidence.data.settlements.find(x=>x.id==='ACE-0004').status,'pago');
   assert.equal(evidence.data.finance.find(x=>x.id==='FIN-0007').amountCents,1100);
   assert.equal(evidence.data.finance.find(x=>x.id==='FIN-0007').status,'pago');
   assert.equal(evidence.checks.ok,true);
  }
  const d=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
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
