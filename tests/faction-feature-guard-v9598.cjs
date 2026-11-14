'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const guard=fs.readFileSync('release-faction-feature-guard-v9598.js','utf8');
const feature=fs.readFileSync('release-faction-manual-payment-v9566.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
function fixture(withModule){
 const elements=new Map(),calls={open:0,render:0,install:0};
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.parentElement=null;this.style={};this.handlers={};this.dataset={};this.textContent='';this.attributes={};this._id=''}
  set id(s){this._id=s;elements.set(s,this)}
  get id(){return this._id}
  get firstChild(){return this.children[0]||null}
  get nextSibling(){if(!this.parentElement)return null;const a=this.parentElement.children;return a[a.indexOf(this)+1]||null}
  get nextElementSibling(){return this.nextSibling}
  contains(el){let x=el;while(x){if(x===this)return true;x=x.parentElement}return false}
  append(...nodes){nodes.forEach(n=>this.insertBefore(n,null))}
  insertBefore(node,ref){
   if(node.parentElement){const a=node.parentElement.children;a.splice(a.indexOf(node),1)}
   const i=ref==null?-1:this.children.indexOf(ref);
   this.children.splice(i<0?this.children.length:i,0,node);node.parentElement=this;
   return node;
  }
  addEventListener(k,fn){(this.handlers[k]||(this.handlers[k]=[])).push(fn)}
  setAttribute(k,v){this.attributes[k]=v}
  scrollIntoView(){calls.scrolled=true}
  getAttribute(k){return this.attributes[k]||''}
 }
 const page=new Element('section');page.id='pagamentosFaccoes';
 const table=new Element('div');table.id='factionPaymentTable';
 const receipts=new Element('section');receipts.id='fm66-receipts';
 page.append(table,receipts);
 const doc={readyState:'loading',head:new Element('head'),
  getElementById:id=>elements.get(id)||null,createElement:tag=>new Element(tag),
  addEventListener(){}};
 const window={hlgbFactionLedgerPreservation9597:{status:()=>({cloudPayments:30,localPayments:0})},
  addEventListener(){},hlgbAfterLogin(){},db:{factionPayments:[]}};
 if(withModule)window.hlgbFactionManual9566={openForm(){calls.open++},install(){calls.install++},
  renderReceipts(){calls.render++}};
 const ctx={window,document:doc,setTimeout(){},Date,console,String,Number};
 vm.createContext(ctx);vm.runInContext(guard,ctx);
 return {doc,page,table,receipts,window,calls};
}
test('script is loaded once, after existing edit/receipt/correction implementation',()=>{
 const files=loader.match(/const files=\[(.*?)\];/s)?.[1]||'';
 assert.equal(files.split("'release-faction-feature-guard-v9598.js'").length-1,1);
 assert(files.indexOf('release-faction-feature-guard-v9598.js')>files.indexOf('release-faction-manual-payment-v9566.js'));
 assert(files.indexOf('release-faction-feature-guard-v9598.js')>files.indexOf('release-faction-ledger-preservation-v9597.js'));
});
test('other recently delivered isolated modules stay in boot (not silently removed)',()=>{
 const modules=[
  'release-faction-service-rates-v9577.js',
  'release-note-receipts-v9576.js',
  'release-acerto-returns-v9565.js',
  'release-cut-weight-v9579.js',
  'release-product-traceability-v9580.js',
  'release-weekly-material-planner-v9583.js',
  'release-printer3d-cloud-hydration-v9517.js',
  'release-printer3d-module-recovery-v9596.js',
  'release-faction-ledger-preservation-v9597.js'
 ];
 const list=loader.match(/const files=\[(.*?)\];/s)?.[1]||'';
 for(const mod of modules)assert.equal(list.split("'"+mod+"'").length-1,1,
  'recently delivered module was removed or duplicated: '+mod);
});
test('yesterday features remain in production module and cannot silently regress',()=>{
 for(const label of ['fm88-edit','fm88-pay','fm66-attach','fm66-download','fm90-summary-pdf',
 'fm90-correct','fm90-apply','fm91-quick-adjust','manualDirectAdjustmentsV9591',
 'receiptPdfV9566','travetaPointsPerPieceV9592','manualCanceledReasonV9590',
 'manualProductNameV9589','fm66-add-embalagem','fm66-add-traveta',
 'renderReceipts','markGroupPaid','saveGroupEdits','remoteRecord']){
  assert(feature.includes(label),'feature contract missing: '+label);
 }
});
test('guard restores the advanced receipts/actions ABOVE legacy table without creating records',()=>{
 const x=fixture(true),w=x.window,api=w.hlgbFactionFeatureGuard9598;
 assert.equal(api.check(),true);
 assert.deepEqual(x.page.children.map(v=>v.id),['hlgbFactionTools9598','fm66-receipts','factionPaymentTable']);
 assert.equal(x.calls.render,1);
 const status=x.doc.getElementById('hlgbFactionToolsStatus9598').textContent;
 assert.match(status,/nuvem possui mais registros/i);
 const bar=x.doc.getElementById('hlgbFactionTools9598');
 bar.children[1].children[0].handlers.click[0]();
 assert.equal(x.calls.open,1);
 bar.children[1].children[1].handlers.click[0]();
 assert.equal(x.calls.scrolled,true);
 assert.equal(api.check(),true);
 assert.equal(x.page.children.filter(v=>v.id==='fm66-receipts').length,1);
 assert.equal(x.page.children.filter(v=>v.id==='hlgbFactionTools9598').length,1);
 assert.equal(w.db.factionPayments.length,0,'never create records while repairing UI');
});
test('module missing warns without changing data or presenting a false restored state',()=>{
 const x=fixture(false),api=x.window.hlgbFactionFeatureGuard9598;
 assert.equal(api.check(),false);
 assert.equal(api.status().ready,false);
 assert.match(x.doc.getElementById('hlgbFactionToolsStatus9598').textContent,/não carregaram/i);
 assert.equal(x.page.children.filter(v=>v.id==='fm66-receipts').length,1);
 assert.deepEqual(x.window.db.factionPayments,[]);
});
