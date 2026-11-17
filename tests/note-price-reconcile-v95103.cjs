'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'..');
const noteJs=fs.readFileSync(path.join(base,'release-note-price-reconcile-v95103.js'),'utf8');
const factionJs=fs.readFileSync(path.join(base,'release-pricing.js'),'utf8');
function noteFixture(onlinePrice=15.9,options={}){
 const id='1792667306359',orderId='1793198036361';
 const db={products:[{id,name:'Conjunto Paula c saia',price:options.localPrice??0,clientPrices:{}}],
 clients:[{id:1787833498539,name:'Quesia',prices:{}}],
 orders:[{id:Number(orderId),clientId:1787833498539,grade:[{productId:Number(id),qty:300,unitPrice:0}]}]};
 const calls=[],alerts=[],queued=[];
 const window={db,__HLGB_AUTH_READY:true,
   suggestedPrice:(_cid,pid)=>db.products.find(p=>String(p.id)===String(pid))?.price||0,
   projectionItemsForOrder:()=>[{key:id,productId:Number(id),name:'Conjunto Paula c saia',qty:300}],
   sendProjectionToNotes9202:()=>{queued.push({unitPrice:window.suggestedPrice(1787833498539,id)});return true},
   cloudRequest:async(url,arg)=>{
     calls.push({url,arg});
     if(options.fail)throw Error('Falha na nuvem');
     return [{entity_id:id,deleted_at:null,data:{id:Number(id),name:'Conjunto Paula c saia',price:onlinePrice,clientPrices:{}}}];
   }};
 const document={querySelectorAll:()=>[{value:orderId+'::'+id}]};
 const context={window,db,document,alert:msg=>alerts.push(msg),console,encodeURIComponent,Map,Promise,Number,Object,Error};
 vm.createContext(context);vm.runInContext(noteJs,context);
 return {window,db,calls,alerts,queued};
}
test('Paula: preço 15,90 confirmado na nuvem substitui apenas sugestão local zerada',async()=>{
 const f=noteFixture(15.9);
 const before=JSON.stringify(f.db);
 assert.equal(await f.window.sendProjectionToNotes9202(),true);
 assert.equal(f.queued.length,1);
 assert.equal(f.queued[0].unitPrice,15.9);
 assert.equal(f.calls.length,1);
 assert.match(f.calls[0].url,/module=eq.products/);
 assert.equal(JSON.stringify(f.db),before,'não alterar pedido, ficha ou grade local');
});
test('preço indisponível ou rede falha: não envia fila com R$ 0,00',async()=>{
 for(const fixture of [noteFixture(0),noteFixture(15.9,{fail:true})]){
  assert.equal(await fixture.window.sendProjectionToNotes9202(),false);
  assert.equal(fixture.queued.length,0);
  assert.equal(fixture.alerts.length,1);
 }
});
test('preço positivo local preservado, sem consulta desnecessária e sem mudar o pedido',async()=>{
 const f=noteFixture(15.9,{localPrice:12.9});
 assert.equal(await f.window.sendProjectionToNotes9202(),true);
 assert.equal(f.queued[0].unitPrice,12.9);
 assert.equal(f.calls.length,0);
});
function factionFixture(){
 const id=1792667306359;
 const db={products:[{id,name:'Conjunto Paula c saia',price:15.9,clientPrices:{}}],
 clients:[{id:1787833498539,name:'Quesia',prices:{}}],
 orders:[{id:17,clientId:1787833498539,grade:[{productId:id,unitPrice:0,qty:300}]}],
 factions:[{id:38,productId:id,orderId:17,client:'Quesia'}]};
 const listeners={},alerts=[];
 const label={textContent:'Valor de venda por peça'};
 const helper={textContent:''},parent={querySelector:()=>helper,appendChild:()=>{}};
 const input={value:'0',dataset:{},parentElement:parent,focus(){}};
 const field={querySelector:sel=>sel==='label'?label:input};
 const modal={dataset:{},querySelectorAll:()=>[field],querySelector:sel=>sel==='#fdClient940'?{value:'1787833498539'}:sel==='#fdMode940'?{value:'expected'}:null};
 const doc={querySelector:()=>modal,querySelectorAll:()=>[modal],
 addEventListener:(name,cb)=>{listeners[name]=cb},
 createElement:()=>({className:'',textContent:''})};
 const window={registerFactionDelivery935:()=>true,
 hlgbNotePriceReconcile95103:{effective:()=>15.9,verify:async()=>({price:15.9})}};
 const ctx={window,db,document:doc,console,setTimeout:fn=>{fn();return 0},alert:msg=>alerts.push(msg),Number,Math,String};
 vm.createContext(ctx);vm.runInContext(factionJs,ctx);
 return {window,db,modal,input,listeners,alerts};
}
test('preço na grade do pedido zero não anula preço válido da ficha',()=>{
 const f=factionFixture();
 assert.equal(f.window.hlgbFactionPriceFor(f.db.factions[0],1787833498539),15.9);
 f.window.registerFactionDelivery935(38);
 f.window.updateFactionSale940();
 assert.equal(f.input.value,'15.90');
});
test('confirmação não apaga valor digitado manualmente e não bloqueia nota válida',()=>{
 const f=factionFixture();f.window.registerFactionDelivery935(38);f.window.updateFactionSale940();
 f.input.value='17.90';
 f.input.closest=()=>f.modal;
 f.listeners.input({target:f.input});
 assert.equal(f.modal.dataset.hlgbPriceUserEdited,'1','input manual reconhecido');
 let prevented=false;
 f.listeners.click({target:{closest:()=>({
  classList:{contains:x=>x==='modalSave'},textContent:'Confirmar entrega integrada',
  closest:()=>f.modal})},preventDefault:()=>{prevented=true},
  stopImmediatePropagation:()=>{prevented=true}});
 assert.equal(f.input.value,'17.90');
 assert.equal(prevented,false);
 assert.equal(f.alerts.length,0);
});
