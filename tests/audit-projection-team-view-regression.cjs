const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'release-projection-team-view.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
assert(loader.includes("'release-projection-team-view.js'"),'loader must include projection team view');

const rows=[
  {order:{id:'o1',client:'Gisele',priority:'Urgente',status:'Em produção'},item:{key:'i1',productId:'p1',name:'Camisola',date:'2026-09-30',qty:100,value:1500,clientName:'Gisele'}},
  {order:{id:'o2',client:'Quezia',priority:'Padrão',status:'Aguardando'},item:{key:'i2',productId:'p2',name:'Conjunto',date:'2026-10-01',qty:50,value:1000,clientName:'Quezia'}}
];
const elements={projectionStart:{value:'2026-09-29'},projectionEnd:{value:'2026-10-04'}};
const context={
  console,
  db:{
    production:[
      {id:'prod1',orderId:'o1',productId:'p1',planned:100,done:75},
      {id:'prod2',orderId:'o2',productId:'p2',planned:50,done:50}
    ],
    cuts:[{id:'cut1',orderId:'o1',productId:'p1',cutterId:'cutter1'}],
    cutters:[{id:'cutter1',name:'Thiago'}],
    missingPieces:[{id:'missing1',orderId:'o1',productId:'p1',status:'Em aberto',remainingQty:4}]
  },
  window:{renderProjection(){return true}},
  document:{
    readyState:'loading',
    addEventListener(){},
    getElementById(id){return elements[id]||null},
    querySelector(){return null}
  },
  localStorage:{getItem(){return null},setItem(){}},
  setTimeout(fn){return 0},
  allProjectionRows:()=>rows,
  projectionDeliverableQty:(o,i)=>i.qty,
  projectionDeliverableValue:(o,i)=>i.value,
  projectionProductionSplit:(id,key)=>id==='o1'?'Facção A':'',
  projectionLocationForOrder:o=>o.id==='o2'?'Confecção B':'',
  displayOrderNumber:o=>o.id==='o1'?101:102,
  money:v=>'R$ '+Number(v).toFixed(2),
  fmtDate:v=>v
};
vm.createContext(context);
vm.runInContext(src,context);
const api=context.window.hlgbProjectionTeam;
assert(api,'projection team API must load');

const base=Array.from(api.baseRows());
assert.equal(base.length,2,'must expose both scheduled deliverables');
assert.equal(base[0].client,'Gisele');
assert.equal(base[0].qty,100);
assert.equal(base[0].value,1500);
assert.equal(base[0].location,'Facção A');
assert.equal(base[0].number,101);
assert.equal(base[0].progress.done,75);
assert.equal(base[0].progress.planned,100);
assert.equal(base[0].progress.pct,75);
assert.deepEqual(Array.from(base[0].cutters),['Thiago'],'must show cutter linked to the cut');
assert.equal(base[0].missing,4,'must show open missing pieces for the order/product');

assert.equal(base[1].location,'Confecção B');
assert.equal(base[1].progress.done,50);
assert.equal(base[1].progress.pct,100);

const p=api.prodProgress(rows[0].order,rows[0].item);
assert.equal(p.pct,75,'progress must be calculated from production records');

console.log('PASS projection team view: loader, delivery fields, location and production progress.');
