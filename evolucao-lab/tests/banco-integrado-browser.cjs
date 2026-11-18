'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium,webkit}=require('playwright'),{start}=require('../banco-integrado/servidor.cjs'),db=require('../banco-integrado/persistencia.cjs');
test('interface completa em duas sessões, conflito, WAL e confirmação independente',async()=>{
 const server=await start(),url='http://127.0.0.1:'+server.address().port;const browser=await (process.env.HLGB_BROWSER==='webkit'?webkit:chromium).launch();
 try{
 const A=await browser.newContext(),A2=await browser.newContext(),B=await browser.newContext(),C=await browser.newContext(),a=await A.newPage(),b=await A2.newPage(),operator=await B.newPage(),cutter=await C.newPage();
 const forged=await A.request.post(url+'/login',{form:{actor:'A',pin:'demo-integrado-a'}});assert.equal(forged.status(),403,'Login sem token CSRF não pode autenticar');
 async function login(page,actor){
 const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
 await page.goto(url);await page.locator('[name=actor]').selectOption(actor);
 await page.locator('[name=pin]').fill('demo-integrado-'+actor.toLowerCase());await page.locator('button').click();
 try{await page.locator('#remote-check').waitFor({timeout:12000});}
 catch(err){const html=await page.locator('body').innerText().catch(()=>'sem corpo');const session=await page.request.get(url+'/api/session').then(r=>({status:r.status(),body:r.text()})).catch(e=>({error:e.message}));throw Error('Falha login '+actor+'; url='+page.url()+'; tela='+html.slice(0,1600)+'; session='+JSON.stringify(session)+'; JS='+JSON.stringify(errors)+'; HTTP='+JSON.stringify(bad));}
 }
 await login(a,'A');await login(b,'A');await login(operator,'B');
 const sessionB=await operator.request.get(url+'/api/session').then(x=>x.json());
 assert.equal(sessionB.permissions.id,'demo-production');
 assert.equal(sessionB.permissions.productionApproval,false);
 assert.equal(sessionB.permissions.allowedCommands.includes('finance.pay'),false);
 assert.equal(sessionB.permissions.readScope,'production_only_ficticio');
 assert.equal(await operator.request.get(url+'/api/state').then(x=>x.status()),403,'Produção não pode ler snapshot integral');
 assert.equal(await operator.request.get(url+'/operacao-integrada.html').then(x=>x.status()),403,'Produção não pode abrir interface administrativa');
 assert.equal(await operator.locator('form[data-command="finance.add"]').count(),0,'Formulários financeiros não são entregues');
 const projected=await operator.request.get(url+'/api/production-state').then(x=>x.json());
 assert.equal(projected.status,'ok');
 assert.equal(projected.state.readScope,'production_only_ficticio');
 assert.equal(Object.hasOwn(projected.state,'employees'),false);
 assert.equal(Object.hasOwn(projected.state,'finance'),false);
 assert.equal(Object.hasOwn(projected.state,'log'),false);
 assert.equal(Object.hasOwn(projected.state.products[0],'priceCents'),false);
 const beforeDenied=await db.state();
 const denied=await operator.evaluate(async r=>{
 const response=await fetch('/api/commands',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-hlgb-integrado':'1'},body:JSON.stringify({commandId:'LAB-NO-FINANCE-B',type:'finance.add',expectedRevision:r,payload:{kind:'pagar',description:'Não autorizar',amountCents:1000,category:'Aluguel'}})});
 return {code:response.status,payload:await response.json()};
 },beforeDenied.revision);
 assert.equal(denied.payload.status,'rejected');
 assert.deepEqual(await db.state(),beforeDenied,'Operador B não pode contornar tela por requisição direta');

 for(const page of [a,b])await page.locator('[data-module=pedidos]').click();
 const form=page=>page.locator('form[data-command="order.add"]');
 await form(a).locator('button[type=submit]').click();await a.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('Revisão servidor 2'));
 // Produção detecta alteração externa sem apagar quantidade preenchida ou reexecutar comando.
 const productionGrade=operator.locator('form[data-command="order.add"] [name=M]');
 await productionGrade.fill('4');
 await operator.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await operator.waitForFunction(()=>!document.querySelector('#shared-revision-notice').hidden&&document.querySelector('#shared-revision-notice').textContent.includes('revisão 2'));
 assert.equal(await productionGrade.inputValue(),'4','A detecção de outro computador não pode apagar o rascunho');
 assert.equal(await operator.locator('form[data-command="order.add"] button[type=submit]').isDisabled(),true,'Revisão antiga deve bloquear novo salvamento');
 assert.equal((await db.state()).revision,2,'Conferência de sincronização nunca grava comando');
 await operator.locator('#sync-refresh').click();
 await operator.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('teste: 2')&&document.querySelector('#shared-revision-notice').hidden);
 assert.equal(await productionGrade.inputValue(),'4','A atualização preserva a grade que estava sendo digitada');
 assert.equal(await operator.locator('form[data-command="order.add"] button[type=submit]').isEnabled(),true);
 await form(b).locator('button[type=submit]').click();await b.waitForFunction(()=>document.body.innerText.includes('Servidor: conflict'));
 assert.equal((await db.state()).orders.length,1);
 // O rascunho permanece até a revisão manual. Releitura não repete o lançamento.
 await b.locator('#remote-check').click();await b.waitForFunction(()=>document.body.innerText.includes('not_found'));
 b.once('dialog',d=>d.accept());await b.locator('#remote-discard').click();await b.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('Revisão servidor 2'));
 await b.locator('[data-module=pedidos]').click();
 await b.route('**/api/commands',async route=>{if(route.request().method()==='POST'){await route.fetch();await route.abort();}else await route.continue();});
 await form(b).locator('button[type=submit]').click();await b.waitForFunction(()=>document.body.innerText.includes('Comando pendente'));
 await b.unroute('**/api/commands');await b.reload();await b.locator('#remote-check').waitFor();await b.locator('#remote-check').click();await b.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('Revisão servidor 3'));
 assert.equal((await db.state()).orders.length,2);
 await a.locator('form[data-command="order.add"] [name=P]').fill('7');
 await a.waitForFunction(()=>!document.querySelector('#shared-revision-notice').hidden&&document.querySelector('#shared-revision-notice').textContent.includes('revisão 3'),null,{timeout:25000});
 assert.equal(await a.locator('form[data-command="order.add"] [name=P]').inputValue(),'7');
 await a.locator('#remote-check').click();await a.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('Revisão servidor 3'));
 // Operador B permanece operacional na visão mínima, mesmo sem ler o documento integral.
 // Segunda alteração externa: formulário ainda não pode enviar enquanto não reler.
 await operator.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await operator.waitForFunction(()=>!document.querySelector('#shared-revision-notice').hidden&&document.querySelector('#shared-revision-notice').textContent.includes('revisão 3'));
 assert.equal(await productionGrade.inputValue(),'4');
 await operator.locator('#sync-refresh').click();
 await operator.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('teste: 3')&&document.querySelector('#shared-revision-notice').hidden);
 await operator.locator('form[data-command="order.add"] button[type=submit]').click();
 await operator.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('teste: 4'));
 assert.equal((await db.state()).orders.length,3);
 assert.equal(await operator.request.get(url+'/api/state').then(x=>x.status()),403);
 const projectedAfter=await operator.request.get(url+'/api/production-state').then(x=>x.json());
 assert.equal(projectedAfter.state.orders.length,3);
 assert.equal(Object.hasOwn(projectedAfter.state,'finance'),false);
 // Terceiro funcionário fictício: identidade individual auditável e somente autorização de corte.
 await login(cutter,'C');
 const cSession=await cutter.request.get(url+'/api/session').then(r=>r.json());
 assert.equal(cSession.actor,'Operador C fictício');
 assert.equal(cSession.employeeId,'LAB-FUN-003');
 assert.equal(cSession.permissions.readScope,'production_cut_only_ficticio');
 assert.deepEqual(cSession.permissions.allowedCommands,['cut.record']);
 assert.equal(await cutter.request.get(url+'/api/state').then(r=>r.status()),403);
 const cutView=await cutter.request.get(url+'/api/production-state').then(r=>r.json());
 assert.deepEqual(Object.keys(cutView.state).sort(),['schema','readScope','revision','products','orders','cutPlans'].sort());
 assert.equal(Object.hasOwn(cutView.state.orders[0],'clientId'),false);
 assert.equal(await cutter.locator('form[data-command="order.add"]').isHidden(),true);
 assert.equal(await cutter.locator('form[data-command="faction.allocate"]').isHidden(),true);
 assert.equal(await cutter.locator('form[data-command="cut.record"]').isVisible(),true);
 const prior=await db.state();
 const forbiddenCut=await cutter.evaluate(async revision=>{
  const response=await fetch('/api/commands',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-hlgb-integrado':'1'},
   body:JSON.stringify({commandId:'LAB-CUT-CANT-ORDER',type:'order.add',expectedRevision:revision,payload:{clientId:'CLI-0001',productId:'PRO-0001',grade:{P:1,M:0,G:0,GG:0}}})});
  return response.json();
 },prior.revision);
 assert.equal(forbiddenCut.status,'rejected');
 assert.deepEqual(await db.state(),prior,'Corte não pode criar pedido mesmo via API');
 const selectedSize=await cutter.locator('form[data-command="cut.record"] [name=size]').inputValue();
 assert.equal(selectedSize,'M','A tela deve escolher automaticamente o tamanho ainda disponível no pedido');
 await cutter.locator('form[data-command="cut.record"] button[type=submit]').click();
 try{await cutter.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('teste: 5'),null,{timeout:16000});}
 catch(e){
  const banner=await cutter.locator('#message').innerText();
  const fresh=await db.state();
  throw Error('Falha no corte: '+banner+'; revisão '+fresh.revision+'; grade '+JSON.stringify(fresh.orders[0]?.grade)+'; cortado '+JSON.stringify(fresh.orders[0]?.cut));
 }
 const afterCut=await db.state();
 assert.equal(afterCut.log.at(-1).actor,'Operador C fictício');
 assert.equal(afterCut.orders[0].cut.M,1);
 // Etapas reais do módulo restrito: corte confirmado → facção → retorno → separação → expedição.
 // O pedido da sessão A ganhou 1 peça cortada; B só pode continuar após conferir revisão 5.
 await operator.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await operator.waitForFunction(()=>!document.querySelector('#shared-revision-notice').hidden&&document.querySelector('#shared-revision-notice').textContent.includes('revisão 5'));
 await operator.locator('#sync-refresh').click();
 await operator.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('teste: 5')&&document.querySelector('#shared-revision-notice').hidden);
 const orderId=afterCut.orders[0].id;
 for(const [command,revision,shouldBalance] of [
  ['faction.allocate',6,null],['faction.return',7,null],['order.separate',8,1],['order.ship',9,1]
 ]){
  const form=operator.locator('form[data-command="'+command+'"]');
  await form.locator('[name=orderId]').selectOption(orderId);
  await form.locator('[name=qty]').fill('1');
  if(shouldBalance!==null){
   assert.equal(await form.locator('[data-balance="'+command+'"]').innerText().then(x=>x.includes('1 peça(s)')),true,'Saldo exibido para '+command);
  }
  await form.locator('button[type=submit]').click();
  try{await operator.waitForFunction(n=>document.querySelector('#top-revision').textContent.includes('teste: '+n),revision,{timeout:14000});}
  catch(e){throw Error('Operação '+command+' não confirmada: '+await operator.locator('#message').innerText()+' / revisão '+(await db.state()).revision);}
 }
 const progressed=await db.state(),first=progressed.orders.find(o=>o.id===orderId);
 assert.deepEqual([first.allocated,first.returned,first.separated,first.shipped],[1,1,1,1],
  'Toda etapa deve preservar os saldos do mesmo pedido');
 assert.equal(progressed.revision,9);
 assert.equal(progressed.log.slice(-4).map(x=>x.type).join(','),
  'faction.allocate,faction.return,order.separate,order.ship');
 assert.equal(progressed.log.slice(-4).every(x=>x.actor==='Operador B fictício'),true);
 assert.equal(progressed.settlements.length,1,'Retorno gerou acerto único; separação e expedição não criam outro');
 assert.equal(progressed.finance.filter(x=>x.sourceId===progressed.settlements[0].id).length,1,'Título único para o acerto');
 const restrictedAfter=await operator.request.get(url+'/api/production-state').then(r=>r.json());
 for(const sensitive of ['finance','settlements','employees','log','paymentBatches'])assert.equal(Object.hasOwn(restrictedAfter.state,sensitive),false,sensitive);
 // Nenhuma separação ou expedição adicional pode ser salva sem retorno/saldo.
 for(const command of ['order.separate','order.ship']){
  const form=operator.locator('form[data-command="'+command+'"]');
  await form.locator('[name=qty]').fill('1');
  const beforeInvalid=await db.state();
  await form.locator('button[type=submit]').click();
  assert.equal((await operator.locator('#message').innerText()).includes('excede o saldo'),true);
  assert.deepEqual(await db.state(),beforeInvalid,'Nenhuma gravação excedente para '+command);
 }
 await cutter.locator('#logout-demo').click();
 await cutter.waitForURL('**/login');
 assert.equal(await cutter.request.get(url+'/api/session').then(r=>r.status()),401,'Logout invalida cookie e sessão');
 await login(cutter,'C');
 const oldSession=await cutter.request.get(url+'/api/session').then(r=>r.json());
 assert.equal(oldSession.employeeId,'LAB-FUN-003');
 const refusal=await operator.evaluate(async()=>{
  const response=await fetch('/api/admin/deactivate',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-hlgb-integrado':'1'},body:JSON.stringify({employeeId:'LAB-FUN-003'})});
  return {code:response.status,body:await response.json()};
 });
 assert.equal(refusal.code,403,'Produção não pode desativar funcionário');
 const deactivate=await a.evaluate(async()=>{
  const response=await fetch('/api/admin/deactivate',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-hlgb-integrado':'1'},body:JSON.stringify({employeeId:'LAB-FUN-003'})});
  return {code:response.status,body:await response.json()};
 });
 assert.equal(deactivate.code,200);
 assert.equal(deactivate.body.status,'disabled');
 assert.equal(await cutter.request.get(url+'/api/session').then(r=>r.status()),401,'Revogação invalida sessão aberta');
 assert.equal(await operator.request.get(url+'/api/session').then(r=>r.status()),200,'Outro funcionário continua ativo');
 const stateBefore=await db.state();
 const rejectedAfterRevoke=await db.commit({commandId:'LAB-CUT-REVOKED',type:'cut.record',expectedRevision:stateBefore.revision,payload:{orderId:stateBefore.orders[0].id,size:'M',qty:1}},'Operador C fictício');
 assert.equal(rejectedAfterRevoke.status,'rejected','Banco bloqueia escrita de conta desativada');
 assert.deepEqual(await db.state(),stateBefore);
 await cutter.goto(url+'/login');
 await cutter.locator('[name=actor]').selectOption('C');
 await cutter.locator('[name=pin]').fill('demo-integrado-c');
 await cutter.locator('button').click();
 assert.equal(await cutter.request.get(url+'/api/session').then(r=>r.status()),401,'Login não reativa conta desativada');
 assert.equal(await operator.request.get(url+'/api/admin/accounts').then(r=>r.status()),403);
 assert.equal(await operator.request.get(url+'/api/admin/login-events').then(r=>r.status()),403,'Produção não pode acessar auditoria de login');
 assert.equal(await operator.request.get(url+'/acessos-lab.html').then(r=>r.status()),403);
 await a.goto(url+'/acessos-lab.html');
 await a.locator('#accounts-body tr').first().waitFor();
 await a.waitForFunction(()=>document.querySelectorAll('#accounts-body tr').length===3);
 await a.locator('#login-events-body tr').first().waitFor();
 const loginHistory=await a.locator('#login-events-body').innerText();
 assert.equal(loginHistory.includes('C'),true,'A auditoria deve registrar tentativas fictícias');
 assert.equal(loginHistory.includes('demo-integrado'),false,'PIN não pode aparecer no histórico');
 const listing=await a.locator('#accounts-body').innerText();
 assert.equal(listing.includes('LAB-FUN-003')&&listing.includes('Desativada'),true,'Conta revogada deve aparecer');
 assert.equal(await a.getByRole('button',{name:'Desativar LAB-FUN-001'}).count(),0,'Admin não pode desativar a própria conta');
 a.once('dialog',d=>d.accept());
 await a.getByRole('button',{name:'Desativar LAB-FUN-002'}).click();
 await a.waitForFunction(()=>document.querySelector('#notice').textContent.includes('LAB-FUN-002 desativado'));
 assert.equal(await operator.request.get(url+'/api/session').then(r=>r.status()),401,'Desativação pela interface invalida sessão do outro operador');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
