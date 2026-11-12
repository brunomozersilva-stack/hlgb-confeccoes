'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const split=fs.readFileSync('release-cut-model-split.js','utf8');
const gradeScript=fs.readFileSync('release-cut-model-grade-adjust.js','utf8');
const sheets=fs.readFileSync('release-cutter-sheet-materials-v9523.js','utf8');
const gradeCyrlene=()=>['Preto','Branco','Rubi','Pantera','Romance'].flatMap(color=>
 ['P','M','G','GG'].map(size=>({productId:'1788193732999',color,size,qty:51})));
function setupGrade(){
 const grade=gradeCyrlene();
 const order={id:'1793016171651',orderNumber:3,client:'Click Sophia',grade:grade.map(x=>({...x}))};
 const cut={id:'1793034494813143',orderId:order.id,productId:'1788193732999',product:'Camisola Cyrlene',pieces:1020,modelSplitChildV1:true,status:'Planejado',originalGrade:grade.map(x=>({...x})),cutType:'Interno'};
 const db={orders:[order],cuts:[cut],products:[{id:'1788193732999',name:'Camisola Cyrlene'}]};
 let modal=null,save=null,calls=0;
 const ctx={db,window:null,document:{getElementById(id){
  if(id==='hlgbAdjNote')return {value:'Ajuste conferido'};
  const m=String(id).match(/^hlgbAdjCell_(\d+)$/);
  if(m)return {value:String(grade[Number(m[1])].qty)};
  return null;
 },querySelector(){return null}},
 console:{info(){},warn(){}},setTimeout(){return 0},alert(){throw Error('Unexpected alert')},
 openModal(title,html,cb){modal={title,html};save=cb},
 closeModal(){},renderCuts(){},localSaveOnly(){},
 async hlgbRecordSaveWithRetry(module,id,row){calls++;assert.equal(module,'cuts');assert.equal(id,cut.id);return {applied:true,data:row};}
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(gradeScript,ctx);
 return {ctx,db,order,cut,open:()=>ctx.hlgbOpenSplitGradeAdjust(cut.id),modal:()=>modal,save:()=>save(),calls:()=>calls};
}
test('Camisola Cyrlene pedido 3: planned model has a permanent grade adjustment control',()=>{
 assert.match(split,/hlgbAdjustSplitGradeBtn/);
 assert.match(split,/onclick="hlgbOpenSplitGradeAdjust/);
 assert.match(split,/<\/button>'\)\+.*viewOrderDetails/s);
});
test('Cyrlene 1020 / 20 grade rows: editing works without mutating original order',async()=>{
 const f=setupGrade(),originalOrder=JSON.stringify(f.order),originalCut=JSON.stringify(f.cut);
 await f.open();
 assert.match(f.modal().title,/Ajustar grade/);
 assert.equal((f.modal().html.match(/hlgbAdjCell_/g)||[]).length,20);
 assert.equal(f.calls(),0);
 assert.equal(JSON.stringify(f.cut),originalCut);
 await f.save();
 assert.equal(f.calls(),1);
 assert.equal(f.db.cuts[0].pieces,1020);
 assert.equal(f.db.cuts[0].actualCutGrade.length,20);
 assert.equal(f.db.cuts[0].cutGradeAdjustmentNote,'Ajuste conferido');
 assert.equal(JSON.stringify(f.order),originalOrder);
});
test('Fio Duplo Penelope pedido 46 prints from order grade if cut grade is missing',()=>{
 const pid='1788444804759',grade=[],colors=['Preto','Rubi','Branco'];
 const counts=[[40,40,20,20],[20,40,20,20],[30,40,30,20]];
 for(let i=0;i<colors.length;i++)for(let j=0;j<4;j++)
  grade.push({productId:pid,color:colors[i],size:['P','M','G','GG'][j],qty:counts[i][j]});
 const order={id:'1794426295127',orderNumber:46,client:'Click Sophia',grade};
 const cut={id:'1794426295128',orderId:order.id,productId:pid,product:'Variações Fio Duplo Penelope',pieces:340,status:'Planejado',originalGrade:[],cutType:''};
 const db={orders:[order],cuts:[cut],products:[{id:pid,name:'Fio Duplo Penelope',materials:[{name:'Tule',qty:.5,unit:'m',calcMode:'consumption'}]}],materials:[],cutters:[]};
 let printed='';
 const ctx={db,window:null,document:{getElementById(){return null}},console:{info(){},warn(){}},setTimeout(){return 0},alert(){throw Error('Unexpected print alert')},
 open(){return {document:{open(){},write(html){printed=html},close(){}},focus(){}}}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(sheets,ctx);
 assert.equal(typeof ctx.printCuttingSheet,'function','new printer must install even without legacy');
 const unchanged=JSON.stringify(db);
 assert.equal(ctx.printCuttingSheet(order.id,cut.id),true);
 assert.match(printed,/Fio Duplo Penelope/);
 assert.match(printed,/340/);
 for(const color of colors)assert(printed.includes(color));
 assert.match(printed,/Tipo do corte:/);
 assert.match(printed,/☐ Interno/);
 assert.match(printed,/☐ Externo/);
 assert.equal(JSON.stringify(db),unchanged);
});
test('Internal cut is pre-marked on paper, never inferred for missing type',()=>{
 const pid='p1',order={id:'o1',orderNumber:3,grade:[{productId:pid,color:'Preto',size:'P',qty:10}]};
 const cut={id:'c1',productId:pid,orderId:'o1',cutType:'Interno',originalGrade:order.grade};
 const ctx={db:{orders:[order],cuts:[cut],products:[{id:pid,name:'Modelo'}],materials:[],cutters:[]},window:null,document:{getElementById(){return null}},setTimeout(){},console:{info(){},warn(){}}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(sheets,ctx);
 const html=ctx.hlgbCutterSheetV9523.renderSheet(order,cut);
 assert.match(html,/☑ Interno/);assert.match(html,/☐ Externo/);
 assert.match(sheets,/previewOnPage9523/);
});
