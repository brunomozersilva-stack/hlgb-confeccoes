'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','release-pricing.js'),'utf8');
function fixture(){
 const alerts=[],listeners={},timers=[];
 const field={querySelector:selector=>selector==='label'?{textContent:'Valor de venda por peça'}:input};
 const input={value:'0',dataset:{},parentElement:{querySelector:()=>null,appendChild(){}},focus(){this.focused=true;}};
 const modal={dataset:{},mode:{value:'expected'},client:{value:'CLI-1'},fields:[field],
  querySelector(sel){return sel==='#fdMode940'?this.mode:sel==='#fdClient940'?this.client:null},
  querySelectorAll(sel){return sel==='.field'?this.fields:[]}};
 const doc={querySelector:selector=>selector==='#modal .modalbox'?modal:null,querySelectorAll:()=>[],
  createElement:()=>({className:'',textContent:''}),
  addEventListener:(name,cb)=>listeners[name]=cb};
 const db={factions:[{id:'FAC-1',productId:'P1',orderId:'O1'}],orders:[{id:'O1',clientId:'CLI-1',grade:[]}],
  products:[{id:'P1',price:0}],clients:[{id:'CLI-1',prices:{}}]};
 const win={registerFactionDelivery935(){return true}};
 const ctx={window:win,document:doc,db,alert:s=>alerts.push(s),console:{warn(){},info(){}},
  setTimeout:fn=>{timers.push(fn);return timers.length},Number,Math,String,Array};
 vm.runInNewContext(source,ctx,{filename:'release-pricing.js'});
 const button=label=>({classList:{contains:x=>x==='modalSave'},textContent:label,
  closest:sel=>sel==='.modalbox'?modal:null});
 function click(label){
  const result={prevented:false,stopped:false};
  listeners.click({target:{closest:sel=>sel==='button'?button(label):null},
   preventDefault(){result.prevented=true;},stopImmediatePropagation(){result.stopped=true;}});
  return result;
 }
 return {win,db,modal,input,alerts,timers,click,listeners};
}
test('salvar grade não exige preço mesmo quando modal reaproveita o ID de facção',()=>{
 const f=fixture();
 f.win.registerFactionDelivery935('FAC-1');
 f.timers[0](); // antiga tela de entrega define dataset de facção
 assert.equal(f.modal.dataset.hlgbFactionId,'FAC-1');
 f.modal.fields=[];f.modal.mode=null;f.modal.client=null;
 const original=JSON.stringify(f.db);
 const result=f.click('Salvar grade');
 assert.deepEqual(result,{prevented:false,stopped:false});
 assert.equal(f.alerts.length,0);
 assert.equal(JSON.stringify(f.db),original);
 // Timer de abertura de facção não pode contaminar modal de corte após troca de tela.
 f.modal.dataset.hlgbFactionId='ID-ANTIGO';
 f.timers[1]();
 assert.equal(f.modal.dataset.hlgbFactionId,'ID-ANTIGO');
});
test('entrega para Notas mantém obrigatoriedade de preço positivo',()=>{
 const f=fixture();f.modal.dataset.hlgbFactionId='FAC-1';
 let result=f.click('Confirmar entrega integrada');
 assert.deepEqual(result,{prevented:true,stopped:true});
 assert.match(f.alerts[0],/exige preço de venda positivo/);
 assert.equal(f.input.focused,true);
 f.input.value='19.90';f.modal.dataset.hlgbPriceUserEdited='1';
 result=f.click('Confirmar entrega integrada');
 assert.deepEqual(result,{prevented:false,stopped:false});
 assert.equal(f.input.value,'19.90','valor informado não pode ser alterado');
});
test('entrega em modo estoque não exige preço de venda',()=>{
 const f=fixture();f.modal.dataset.hlgbFactionId='FAC-1';f.modal.mode.value='stock';
 assert.deepEqual(f.click('Confirmar entrega integrada'),{prevented:false,stopped:false});
 assert.equal(f.alerts.length,0);
});
test('alteração de preço em modal não relacionado não escreve identificação da facção',()=>{
 const f=fixture();f.modal.mode=null;f.modal.fields=[];f.modal.dataset.hlgbFactionId='FAC-1';
 f.win.updateFactionSale940();
 assert.equal(f.modal.dataset.hlgbPriceUserEdited,undefined);
 assert.equal(f.alerts.length,0);
});
