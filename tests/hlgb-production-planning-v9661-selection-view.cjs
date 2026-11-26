'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),api=require('../hlgb-modules/producao/production-planning-v9661.js');
function fixture(){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.parentNode=null;this.dataset={};this.style={};this.attributes={};this.listeners={};this._text='';this.value='';this.checked=false;this.className='';this.classList={contains:k=>this.className.split(/\s+/).includes(k),add:k=>{if(!this.classList.contains(k))this.className+=' '+k},remove:k=>{this.className=this.className.split(/\s+/).filter(x=>x!==k).join(' ')}}}
  set textContent(v){this.replaceChildren();this._text=String(v??'')}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('')}
  get isConnected(){return this===body||!!this.parentNode?.isConnected}
  appendChild(x){x.parentNode=this;this.children.push(x);return x}
  get firstChild(){return this.children[0]||null}
  insertBefore(x,ref){if(x.parentNode)x.remove();const i=ref?this.children.indexOf(ref):this.children.length;if(i<0)throw Error('invalid reference');x.parentNode=this;this.children.splice(i,0,x);return x}
  focus(){this.focused=true}
  scrollIntoView(){this.scrolled=true}
  replaceChildren(...items){for(const x of this.children)x.parentNode=null;this.children=[];this._text='';for(const x of items)this.appendChild(x)}
  remove(){if(this.parentNode){const p=this.parentNode;p.children=p.children.filter(x=>x!==this);this.parentNode=null}}
  setAttribute(k,v){this.attributes[k]=String(v)}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
  fire(k){for(const f of this.listeners[k]||[])f();this['on'+k]?.()}
  closest(k){if(k!=='.page')return null;let x=this;while(x){if(x.classList.contains('page'))return x;x=x.parentNode}return null}
 }
 const body=new Element('body'),cut=new Element('section'),productsPage=new Element('section'),purchase=new Element('section'),purchaseTable=new Element('div');
 cut.id='corte';cut.className='page active';productsPage.id='produtos';productsPage.className='page';purchase.id='compras';purchase.className='page';purchaseTable.id='purchaseTable';purchase.appendChild(purchaseTable);for(const x of [cut,productsPage,purchase])body.appendChild(x);
 const walk=r=>[r,...r.children.flatMap(walk)],byId=id=>walk(body).find(x=>x.id===id)||null,docEvents={},winEvents={};
 const document={body,createElement:t=>new Element(t),getElementById:byId,querySelectorAll:s=>s==='[data-planning9661]'?walk(body).filter(x=>x.dataset.planning9661):s==='.page'?walk(body).filter(x=>x.classList.contains('page')):[],addEventListener:(k,f)=>(docEvents[k]??=[]).push(f)};
 const data={orders:[{id:1,orderNumber:12,status:'Aguardando corte',grade:[{productId:10,color:'Rubi',size:'P',qty:30},{productId:11,color:'Rubi',size:'M',qty:40}]}],products:[{id:10,name:'Camisola',materials:[{materialId:1,name:'Malha',qty:3,unit:'kg',calcMode:'yield'},{materialId:2,name:'Renda',qty:.1,unit:'m'}]},{id:11,name:'Calcinha',materials:[{materialId:1,name:'Malha',qty:.2,unit:'kg'},{materialId:2,name:'Renda',qty:.2,unit:'m'}]}],materials:[{id:1,name:'Malha',cat:'Malha',unit:'kg'},{id:2,name:'Renda',cat:'Renda',unit:'m'}],cuts:[],production:[],operationalWriteoffs:[]};
 const permission={corte:true,pedidos:true,produtos:true,materiais:true,producao:true,compras:true,estoque:true,fornecedores:true};
 let selected=[{productId:'old',pieces:5}],writes=0,confirmAnswer=false,nav=null,userId='fixture';
 const win={__HLGB_AUTH_READY:true,HLGBProductionPlanning9661:api,hlgbWriteoffIntegrity9391:{pairIndex:()=>new Set()},hlgbCutterSheetV9523:{previewOnPage9523:()=>{}},hlgbWeeklyMaterialPlanner9583:{selected:()=>selected.map(x=>({...x})),setSelection:x=>{writes++;selected=x}},addEventListener:(k,f)=>(winEvents[k]??=[]).push(f)};
 const ctx={window:win,document,db:data,canOpenPage:p=>permission[p]===true,currentUser:()=>({id:userId}),setTimeout:f=>{f();return 0},confirm:()=>confirmAnswer,page:p=>{nav=p},console};
 vm.runInNewContext(fs.readFileSync('hlgb-modules/producao/production-planning-view-v9661.js','utf8'),ctx);
 const host=()=>byId('hlgbJointCut9661'),find=(r,t)=>walk(r).filter(x=>x.tagName==='button'&&x.textContent===t),click=(r,t,i=0)=>{const e=find(r,t)[i];assert.ok(e,t);e.fire('click')},search=v=>{const e=walk(host()).find(x=>x.tagName==='input'&&x.type==='search');e.value=v;e.fire('input')};
 return {host,cut,shortcut:()=>byId('hlgbJointCutShortcut9673'),data,permission,win,find,click,search,counts:()=>({writes,selected,nav}),confirm:v=>{confirmAnswer=v},user:v=>{userId=v},fire:(events,k)=>{for(const f of events[k]||[])f()},docEvents,winEvents};
}
const f=fixture(),before=JSON.stringify(f.data);
assert.equal(f.host(),null);assert.equal(f.cut.children[0],f.shortcut());f.click(f.shortcut(),'Corte Conjunto');assert.equal(f.host().parentNode.id,'hlgbJointCutPage9732');assert.equal(f.cut.classList.contains('active'),false);
assert.match(f.host().textContent,/Peças pedidas únicas70/);assert.equal(f.win.hlgbJointWorkspaceEvidence9714.pairs,2);assert.equal(f.win.hlgbJointWorkspaceEvidence9714.materials,2);assert.equal(f.win.hlgbJointWorkspaceEvidence9714.adjustedRows,0);assert.equal(f.win.hlgbJointWorkspaceEvidence9714.duplicatePlannedPairs,0);assert.equal(f.win.hlgbJointWorkspaceEvidence9714.remoteConfirmed,false);
assert.ok(f.host());assert.equal(f.host().focused,true);assert.equal(f.host().scrolled,true);f.permission.materiais=false;f.fire(f.docEvents,'click');assert.equal(f.host(),null);assert.equal(f.find(f.shortcut(),'Corte Conjunto')[0].disabled,true);assert.match(f.shortcut().textContent,/requer acesso/);f.permission.materiais=true;f.fire(f.docEvents,'click');assert.ok(f.host());assert.equal(f.find(f.shortcut(),'Corte Conjunto')[0].disabled,false);assert.equal(f.find(f.host(),'Selecionar todos deste grupo').length,2);
f.click(f.host(),'Selecionar todos deste grupo',0);assert.match(f.host().textContent,/70 peças únicas na cesta · 2 modelos/);f.click(f.host(),'Guardar cenário A',0);assert.match(f.host().textContent,/Cenário A · Malha/);
f.click(f.host(),'Selecionar todos deste grupo',1);assert.match(f.host().textContent,/70 peças únicas na cesta · 2 modelos/);assert.match(f.host().textContent,/Malha · cor da ficha não informada · 18 kg/);assert.match(f.host().textContent,/Renda · cor da ficha não informada · 11 m/);
f.search('sem correspondência');assert.match(f.host().textContent,/Cenário A · Malha/);assert.match(f.host().textContent,/70 peças únicas na cesta · 2 modelos/);assert.equal(f.find(f.host(),'Selecionar todos deste grupo').length,0);
f.search('');assert.equal(f.find(f.host(),'Selecionar todos deste grupo').length,2);
const transfer='Enviar cesta para planejamento semanal de Compras';
f.click(f.host(),transfer);assert.equal(f.counts().writes,0);
f.permission.compras=false;f.click(f.host(),transfer);assert.equal(f.counts().writes,0);f.search('');assert.equal(f.find(f.host(),transfer).length,0);
f.permission.compras=true;f.search('');f.confirm(true);f.click(f.host(),transfer);assert.equal(f.counts().writes,1);assert.deepEqual(f.counts().selected.map(x=>[x.productId,x.pieces]).sort(),[['10',30],['11',40]]);assert.equal(f.counts().nav,'compras');assert.equal(JSON.stringify(f.data),before);
f.data.orders[0].grade[0].qty=31;f.search('');assert.match(f.host().textContent,/seleção alterada ou ambígua/);assert.equal(f.find(f.host(),transfer).length,0);
f.click(f.host(),'Limpar toda a cesta');assert.match(f.host().textContent,/0 combinações pedido\/modelo/);f.click(f.host(),'Selecionar todos deste grupo');assert.match(f.host().textContent,/71 peças únicas/);
f.user('other');f.fire(f.docEvents,'click');assert.match(f.host().textContent,/0 combinações pedido\/modelo/);f.permission.corte=false;f.fire(f.docEvents,'click');assert.equal(f.host(),null);assert.equal(f.shortcut(),null);
console.log('PASS unique basket, filter, material totals, explicit purchase handoff, permission, stale selection and session');


(function completeCompatibilityView(){
 const x=fixture();
 x.data.products[0].name='Camisola Juliana';x.data.products[1].name='Camisola Leticia';x.data.materials[0].name='Romantic';
 x.data.orders[0].status='Pedido em produção';x.data.orders[0].grade[0].color='Cronos';x.data.orders[0].grade[1].color='Rubi';
 x.data.cuts=[{id:1,orderId:1,productId:10,status:'Planejado'},{id:2,orderId:1,productId:11,status:'Finalizado'}];
 const before=JSON.stringify(x.data),walk=n=>[n,...n.children.flatMap(walk)];
 x.click(x.shortcut(),'Corte Conjunto');
 const nodes=()=>walk(x.host());
 const findSelect=label=>nodes().find(e=>e.tagName==='select'&&e.attributes['aria-label']===label);
 const focus=findSelect('Todos os modelos em pedidos'),mat=findSelect('Matéria-prima da consulta completa');
 assert.equal(focus.children.length,3);focus.value=JSON.stringify(['1','10']);focus.fire('change');
 mat.value='1';mat.fire('change');
 assert.match(x.host().textContent,/Romantic · 2 pedido/);
 assert.match(x.host().textContent,/Camisola Juliana.*Corte: Planejado/);
 assert.match(x.host().textContent,/Camisola Leticia.*Corte: Finalizado.*cor diferente/);
 const panel=nodes().find(e=>e.tagName==='details'&&e.children[0]?.textContent==='Todos os modelos em pedidos — compatibilidade por matéria-prima');
 const checks=walk(panel).filter(e=>e.tagName==='input'&&e.type==='checkbox');assert.equal(checks.length,2);
 for(const e of checks){e.checked=true;e.fire('change')}
 assert.match(panel.textContent,/Cronos · 30 pç · 1 modelo\(s\)\/pedido\(s\)/);
 assert.match(panel.textContent,/Rubi · 40 pç · 1 modelo\(s\)\/pedido\(s\)/);
 const target=walk(panel).find(e=>e.tagName==='input'&&e.type==='number');assert.ok(target);
 target.value='8';target.fire('input');
 assert.match(panel.textContent,/Camisola Juliana — grade precisa de ajuste/);
 assert.match(panel.textContent,/pedido 30 · 24 no enfesto \+ 6 complementares OU 32/);
 assert.match(panel.textContent,/Camisola Leticia — grade exata/);
 assert.equal(x.counts().writes,0);assert.equal(JSON.stringify(x.data),before);
 console.log('PASS full material selector and separate-color simulation');
})();
