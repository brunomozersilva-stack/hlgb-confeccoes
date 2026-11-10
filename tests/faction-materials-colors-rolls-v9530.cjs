'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const printer=fs.readFileSync('release-faction-checklist-grade-standard.js','utf8');
const refresh=fs.readFileSync('release-faction-material-refresh-v9522.js','utf8');
function fixture(){
 const grade=(id,color,qty)=>({productId:id,color,size:'M',qty});
 const calcola={id:1,name:'Calçola Bianca',materials:[
  {name:'Romantic',cat:'Tecido',unit:'kg',materialId:10,qty:0},
  {name:'Malha',cat:'Tecido',unit:'kg',materialId:11,qty:0},
  {name:'Anis',cat:'Aviamento',unit:'m',materialId:12,qty:1.16},
  {name:'Laco M',cat:'Outro',unit:'un.',materialId:13,qty:1},
  {name:'Barra 30',cat:'Aviamento',unit:'m',materialId:14,qty:0.8}]};
 const leidiane={id:2,name:'Camisola Leidiane',materials:[
  {name:'Alpinia',cat:'Aviamento',unit:'m',materialId:15,qty:2.86},
  {name:'Alca Papiro .40 cm',cat:'Aviamento',unit:'un.',materialId:16,qty:1},
  {name:'laço Perola',cat:'Outro',unit:'un.',materialId:17,qty:3}]};
 const sonia={id:3,name:'Short Sonia',materials:[
  {name:'Romantic',cat:'Tecido',unit:'kg',materialId:10,qty:0},
  {name:'Malha',cat:'Tecido',unit:'kg',materialId:11,qty:0},
  {name:'Sanduiche 25',cat:'Aviamento',unit:'m',materialId:20,qty:.8},
  {name:'laço P',cat:'Outro',unit:'un.',materialId:21,qty:0}]};
 const c1={id:101,orderId:201,productId:1,productName:calcola.name,cutId:301,qty:150,destinationType:'F',destinationName:'Luana',receivedAt:'',status:'Pendente',materials:[
  {name:'Anis',unit:'m',qty:174,checked:false},
  {name:'Laco M',unit:'un.',qty:150,checked:false},
  {name:'Barra 30',unit:'m',qty:120,checked:false}]};
 const c2={id:102,orderId:202,productId:2,productName:leidiane.name,cutId:302,qty:240,destinationType:'F',destinationName:'Vanessa',receivedAt:'',status:'Pendente',materials:[
  {name:'Alpinia',unit:'m',qty:686.4,checked:false},
  {name:'Alca Papiro .40 cm',unit:'un.',qty:240,checked:false},
  {name:'laço Perola',unit:'un.',qty:720,checked:false}]};
 const c3={id:103,orderId:203,productId:3,productName:sonia.name,cutId:303,qty:250,destinationType:'F',destinationName:'Nivia',receivedAt:'',status:'Pendente',materials:[
  {name:'Romantic',cat:'Tecido',unit:'kg',qty:0,color:''},
  {name:'Malha',cat:'Tecido',unit:'kg',qty:0,color:''},
  ...[['Preto',80,2],['Branco',40,1],['Chocolate',80,2]].map(([color,qty,rolls])=>({name:'Sanduiche 25',cat:'Aviamento',unit:'m',color,qty,rolls})),
  {name:'laço P',cat:'Outro',unit:'un.',qty:0,color:''}]};
 const db={products:[calcola,leidiane,sonia],materialChecklists:[c1,c2,c3],
  materials:[{id:20,name:'Sanduiche 25',purchaseUnit:'rolo',purchaseConversion:50}],
  cuts:[{id:301,orderId:201,productId:1,actualCutGrade:[grade(1,'Preto',100),grade(1,'Branco',50)]},
   {id:302,orderId:202,productId:2,actualCutGrade:[grade(2,'Preto',120),grade(2,'Branco',60),grade(2,'Rubi',60)]},
   {id:303,orderId:203,productId:3,actualCutGrade:[grade(3,'Preto',100),grade(3,'Branco',50),grade(3,'Chocolate',100)]}],
  orders:[],sizes:['P','M','G','GG']};
 const docs=[];
 const win={db,open(){const doc={html:'',write(s){this.html+=s},close(){}};docs.push(doc);return {document:doc}},
  addEventListener(){},hlgbAfterLogin(){}};
 const document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 const ctx={window:win,db,document,console:{info(){},warn(){},error(){}},
  setTimeout(){},navigator:{onLine:true},openModal(){},alert(){},localStorage:{getItem(){return null}}};
 ctx.globalThis=ctx;vm.createContext(ctx);
 vm.runInContext(printer,ctx);vm.runInContext(refresh,ctx);
 return {db,win,docs};
}
test('Scripts parse',()=>{assert.doesNotThrow(()=>new vm.Script(printer));assert.doesNotThrow(()=>new vm.Script(refresh))});
test('Calçola Bianca 150: materials retain colors and zero-weight material references',()=>{
 const f=fixture(),api=f.win.hlgbFactionMaterialRefresh9522;
 const check=f.db.materialChecklists[0],before=JSON.stringify(check);
 const rows=api.buildMaterials(f.db.products[0],150,'F',check);
 assert.equal(rows.length,7);
 const get=(name,color)=>rows.find(x=>x.name===name&&x.color===color);
 assert.equal(get('Anis','Preto').qty,116);
 assert.equal(get('Anis','Branco').qty,58);
 assert.equal(get('Barra 30','Preto').qty,80);
 assert.equal(get('Barra 30','Branco').qty,40);
 assert.equal(get('Laco M','').qty,150);
 assert.equal(get('Romantic','').qty,0);
 assert.equal(get('Malha','').qty,0);
 assert.equal(get('Anis','Preto').cat,'Aviamento');
 assert.equal(api.compare(check.materials,rows).different,false,'Formatting-only change must not masquerade as material-consumption change');
 assert.equal(JSON.stringify(check),before,'No writes to historical checklist');
});
test('Camisola Leidiane 240: Alpinia and Alça per color, laço total only',()=>{
 const f=fixture(),api=f.win.hlgbFactionMaterialRefresh9522;
 const c=f.db.materialChecklists[1],rows=api.buildMaterials(f.db.products[1],240,'F',c);
 assert.equal(rows.length,7);
 const get=(name,color)=>rows.find(x=>x.name===name&&x.color===color)?.qty;
 assert.equal(get('Alpinia','Preto'),343.2);
 assert.equal(get('Alpinia','Branco'),171.6);
 assert.equal(get('Alpinia','Rubi'),171.6);
 assert.equal(get('Alca Papiro .40 cm','Preto'),120);
 assert.equal(get('Alca Papiro .40 cm','Branco'),60);
 assert.equal(get('Alca Papiro .40 cm','Rubi'),60);
 assert.equal(get('laço Perola',''),720);
 assert.equal(api.compare(c.materials,rows).different,false);
});
test('Short Sonia 250: Sanduiche 25 remains 80/40/80 m with 2/1/2 rolls',()=>{
 const f=fixture(),api=f.win.hlgbFactionMaterialRefresh9522;
 const c=f.db.materialChecklists[2],rows=api.buildMaterials(f.db.products[2],250,'F',c);
 const get=color=>rows.find(x=>x.name==='Sanduiche 25'&&x.color===color);
 assert.deepEqual(['Preto','Branco','Chocolate'].map(x=>get(x).qty),[80,40,80]);
 assert.deepEqual(['Preto','Branco','Chocolate'].map(x=>get(x).rolls),[2,1,2]);
 assert.equal(api.compare(c.materials,rows).different,false);
});
test('Print derives correct color/roll details without changing cloud snapshot',()=>{
 const f=fixture(),c=f.db.materialChecklists[0],before=JSON.stringify(f.db);
 const preview=f.win.hlgbFactionChecklistGrade.displayMaterials(c);
 assert.equal(preview.derived,true);
 assert.ok(preview.rows.some(x=>x.color==='Preto'&&x.name==='Anis'));
 f.win.printMaterialChecklist(c.id);
 const html=f.docs[0].html;
 assert.match(html,/Anis/);assert.match(html,/Preto/);assert.match(html,/Branco/);
 assert.match(html,/Aviamento/);assert.match(html,/(Detalhamento por cor|PRÉVIA DA SEPARAÇÃO POR COR)/);
 assert.equal(JSON.stringify(f.db),before);
});
test('Received or checked checklists NEVER show dynamically overwritten materials',()=>{
 const f=fixture(),c=f.db.materialChecklists[0];
 c.receivedAt='2026-11-10';
 assert.equal(f.win.hlgbFactionChecklistGrade.displayMaterials(c).derived,false);
 assert.equal(f.win.hlgbFactionChecklistGrade.displayMaterials(c).rows.length,3);
 c.receivedAt='';c.materials[0].checked=true;
 assert.equal(f.win.hlgbFactionChecklistGrade.displayMaterials(c).derived,false);
});
test('Different totals remain stale and may not be printed as if up to date',()=>{
 const f=fixture(),c=f.db.materialChecklists[0];c.materials[0].qty=100;
 assert.equal(f.win.hlgbFactionMaterialRefresh9522.analyze(c).status,'stale');
 assert.equal(f.win.hlgbFactionChecklistGrade.displayMaterials(c).stale,true);
});
