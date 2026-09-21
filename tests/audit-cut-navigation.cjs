const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
function between(a,b){const s=html.indexOf(a),e=html.indexOf(b,s);assert(s>=0&&e>s);return html.slice(s,e)}
let queue=0,draws=0;
const ctx=vm.createContext({canOpenPage:()=>true,document:{querySelectorAll:()=>[],getElementById:()=>({classList:{add(){}}})},syncOrdersToCuts(){},renderCuts(){draws++},renderCutAssignmentQueue(){queue++},auditAction(){},ensurePageSyncButtons(){},console});
vm.runInContext(between('function page(id,btn){','function openModal('),ctx);
ctx.page('corte');ctx.page('corte');
assert.equal(draws,2);assert.equal(queue,2,'every visit must refresh queue rather than retaining pre-login numbers');
const db={orders:[{id:20,status:'Corte finalizado',productId:1},{id:26,status:'Corte finalizado',productId:1},{id:17,workflowSourceOrderId:100}],cuts:[{id:1,orderId:20,productId:1,status:'Planejado'},{id:2,orderId:26,productId:1,status:'Finalizado'}]};
const status=vm.createContext({db,norm:v=>String(v||'').toLowerCase()});
vm.runInContext(between('  function cutStatus9179(productId,orderId){','  window.hlgbCutStatusEvidence9179='),status);
assert.equal(status.cutStatus9179(1,20).cls,'pending','order status alone is not final-cut evidence');
assert.equal(status.cutStatus9179(1,26).cls,'done','matching final cut is evidence');
assert.equal(status.cutStatus9179(2,26).cls,'none','other product cannot borrow final status');
assert.equal(status.cutStatus9179(1,17).cls,'none','source-order link alone is not evidence');
db.cuts.push({id:3,orderId:100,status:'Finalizado',actualCutGrade:[{productId:1,qty:2}]});
assert.equal(status.cutStatus9179(1,17).cls,'done','source-order final cut grade is recognized');
console.log('PASS cut navigation refresh and evidence-based status, including source-order/product matching');
