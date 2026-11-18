'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const sheet=fs.readFileSync(path.join(root,'release-cutter-sheet-materials-v9523.js'),'utf8');
const core=fs.readFileSync(path.join(root,'hlgb-modules/corte/folha-grade-materiais-v9604.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
const fixture=()=>({
 products:[
  {id:1,name:'Short Doll Crystal',materials:[
   {name:'Romantic',unit:'kg',qty:6,loss:0,calcMode:'yield'},
   {name:'Renda 06',unit:'m',qty:.32,loss:3,calcMode:'consumption'},
   {name:'Alça',unit:'un.',qty:1,calcMode:'consumption'},
   {materialId:'r1',qty:.02,calcMode:'consumption'},
   {name:'Inválido',unit:'kg',qty:0,calcMode:'yield'}]},
  {id:2,name:'Sem ficha'}
 ],
 materials:[{id:'r1',name:'Renda catálogo',unit:'kg'}],
 orders:[{id:7,client:'Cliente <ABC>',grade:[
  {productId:1,color:'Preto',size:'P',qty:200},
  {productId:1,color:'Rubi',size:'GG',qty:50},
  {productId:2,color:'Branco',size:'G',qty:7}]}],
 cuts:[
  {id:8,orderId:7,productId:1,cutterId:9,plannedCutDate:'2026-11-18',
   originalGrade:[{productId:1,color:'Preto',size:'P',qty:192},
                  {productId:1,color:'Rubi',size:'GG',qty:14}]},
  {id:10,orderId:7,productId:2,originalGrade:[{productId:2,color:'Branco',size:'G',qty:7}]}],
 cutters:[{id:9,name:'Cortador de teste'}],
 factionPayments:[{id:55,paid:true}]
});
const stable=x=>JSON.stringify(x);
function setup(useCore){
 const db=fixture();let html='',alerts=[],legacy=0;
 const context={db,window:null,document:{
  getElementById:()=>null,createElement:()=>{throw Error('unexpected DOM mutation');}
 },console:{info(){},warn(){}},setTimeout:()=>0,alert:s=>alerts.push(s),
 printCuttingSheet(){legacy++;return false;},
 open(){return {document:{open(){},write(s){html=s},close(){}},focus(){}}}
 };
 context.window=context;vm.createContext(context);
 if(useCore)vm.runInContext(core,context);
 vm.runInContext(sheet,context);
 return {db,ctx:context,api:context.hlgbCutterSheetV9523,html:()=>html,alerts,legacy:()=>legacy};
}
test('carregador mantém 156 scripts originais e posiciona dois cores opcionais uma vez cada',()=>{
 const anchor='const moduleGroups=',start=loader.indexOf(anchor);
 const end=loader.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',start);
 assert.ok(start>=0&&end>start);
 const files=JSON.parse(loader.slice(start+anchor.length,end)).flatMap(group=>group.files);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'hlgb-modules/ownership-v9600.json'),'utf8'));
 assert.equal(files.length,manifest.releaseScripts.length);
 assert.deepEqual(files,manifest.releaseScripts);
 assert.equal(new Set(files).size,files.length);
 for(const [addon,dependent] of [
  ['hlgb-modules/corte/grade-modelo-v9602.js','release-cutter-planner.js'],
  ['hlgb-modules/corte/folha-grade-materiais-v9604.js','release-cutter-sheet-materials-v9523.js']
 ]){
  assert.equal(files.filter(x=>x===addon).length,1,addon);
  assert.equal(files.indexOf(addon)+1,files.indexOf(dependent),addon);
 }
 const illegal=['fetch(','cloudRequest','indexedDB','localStorage','hlgbRecordSaveWithRetry','document.'];
 for(const s of illegal)assert.equal(core.includes(s),false,'pure core cannot call '+s);
});
test('core e fallback selecionam a mesma grade em cortes planejados e finalizados',()=>{
 const old=setup(false),now=setup(true),order=old.db.orders[0];
 const variants=[
  old.db.cuts[0],
  {...old.db.cuts[0],status:'Finalizado',actualCutGrade:[{productId:1,color:'Preto',size:'P',qty:100}]},
  {...old.db.cuts[0],originalGrade:[],actualCutGrade:[]},
  {...old.db.cuts[0],productId:null,originalGrade:[]},
  {...old.db.cuts[0],originalGrade:[{productId:1,qty:0},{productId:1,qty:-4},{productId:1,qty:3}]}
 ];
 for(const cut of variants){
  assert.equal(stable(now.api.gradeOf(order,cut)),stable(old.api.gradeOf(order,cut)));
 }
});
test('previsão de materiais permanece idêntica com rendimento, consumo, perda e catálogo',()=>{
 const old=setup(false),now=setup(true);
 const values=[0,1,172,192,206,1000];
 for(const pieces of values){
  for(const product of [null,old.db.products[0],old.db.products[1]]){
   assert.equal(stable(now.api.planMaterials(product,pieces)),stable(old.api.planMaterials(product,pieces)));
  }
 }
 assert.equal(now.api.planMaterials(now.db.products[0],192)[0].calculated,32);
 assert.equal(now.api.planMaterials(now.db.products[0],192)[3].name,'Renda catálogo');
 assert.equal(now.api.planMaterials(now.db.products[0],192)[4].warning,true);
});
test('folha A4 completa mantém HTML idêntico, campos e dados intactos',()=>{
 const old=setup(false),now=setup(true),before=stable(now.db);
 for(let i=0;i<2;i++){
  const legacyHtml=old.api.renderSheet(old.db.orders[0],old.db.cuts[i]);
  const coreHtml=now.api.renderSheet(now.db.orders[0],now.db.cuts[i]);
  assert.equal(coreHtml,legacyHtml);
  assert.match(coreHtml,/Assinatura do Cortador 1/);
  assert.match(coreHtml,/Peso usado no corte/);
  assert.match(coreHtml,/Cliente &lt;ABC&gt;/);
 }
 assert.equal(stable(now.db),before,'render must be read only');
});
test('impressão de corte e pedido inteiro continua compatível e sem lançamentos',()=>{
 const old=setup(false),now=setup(true),before=stable(now.db);
 for(const args of [[7,8],[7]]){
  assert.equal(old.ctx.printCuttingSheet(...args),true);
  assert.equal(now.ctx.printCuttingSheet(...args),true);
  assert.equal(now.html(),old.html(),'printed HTML must remain identical');
 }
 assert.equal(stable(now.db),before);
 assert.equal(now.db.factionPayments[0].paid,true);
 assert.equal(now.legacy(),0,'não chamar a impressão antiga');
});
