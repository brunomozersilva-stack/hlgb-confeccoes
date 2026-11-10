'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-faction-material-refresh-v9522.js','utf8');
const printer=fs.readFileSync('release-faction-checklist-grade-standard.js','utf8');
const grade=[];
for(const [color,values] of [['Preto',[20,40,40,20]],['Branco',[10,20,20,10]],['Rubi',[10,20,20,10]]])
 for(const [i,size] of ['P','M','G','GG'].entries())grade.push({color,size,qty:values[i],productId:1794233359948});
function fixture(opts={}){
 const product={id:1794233359948,name:'Camisola Leidiane',materials:[
  {cat:'Aviamento',qty:2.86,loss:0,name:'Alpinia',unit:'m',calcMode:'consumption',materialId:1791245626717},
  {cat:'Aviamento',qty:1,loss:0,name:'Alca Papiro .40 cm',unit:'un.',calcMode:'consumption',materialId:1788203765087},
  {cat:'Outro',qty:3,loss:0,name:'laço Perola',unit:'un.',calcMode:'consumption',materialId:1788796414806}]};
 const checklist={id:1794320627342,productId:product.id,productName:product.name,
  destinationType:'F',destinationName:'Vanessa',orderId:1794233471683,
  cutId:1794233476001556,qty:240,receivedAt:opts.received?'2026-11-10':'',
  status:'Pendente',materialsSourceV9522:'product_technical_sheet',gradeV9198:grade,
  materials:[
   {id:1,qty:686.4,name:'Alpinia',unit:'m',checked:false},
   {id:2,qty:240,name:'Alca Papiro .40 cm',unit:'un.',checked:false},
   {id:3,qty:720,name:'laço Perola',unit:'un.',checked:false}]};
 const db={materialChecklists:[checklist],products:[product],materials:[],orders:[],
  cuts:[{id:1794233476001556,orderId:1794233471683,productId:product.id,status:'Finalizado',actualCutGrade:grade}]};
 const before=JSON.stringify(db);
 let modal,print,posts=0,remoteChecklist=structuredClone(checklist),revision=2,logs=[];
 const doc={readyState:'loading',hidden:false,addEventListener(){},getElementById(){return null}};
 const win={db,addEventListener(){},hlgbAfterLogin(){},
  __HLGB_AUTH_READY:true,open(){return {document:{open(){},write(html){print=html},close(){}},focus(){}}},
  hlgbRecordSnapshots:{materialChecklists:new Map()},
  openModal(t,html,submit){modal={t,html,submit}},closeModal(){},
  printMaterialChecklist(){},
  hlgbFactionChecklistGrade:null,
  localSaveOnly(){},
  renderDestinationChecklists(){},
  renderFactionChecklists9198(){},
  cloudEnsureFreshSession:async()=>true};
 let walQueue=[];
 const indexedDB={open(){
  const req={};
  queueMicrotask(()=>{
   req.result={objectStoreNames:{contains:(key)=>key==='entries'},close(){},
    transaction(){const tx={objectStore(){
     return {openCursor(){
      const cursor={};queueMicrotask(()=>{cursor.result=null;cursor.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});
      return cursor;
     }};
    }};return tx;}};
   req.onsuccess?.();
  });
  return req;
 }};
 async function cloudRequest(url,arg){
  if(url==='rpc/hlgb_save_record'){
   posts++;
   const payload=JSON.parse(arg.body);
   assert.equal(payload.p_module,'materialChecklists');
   assert.equal(payload.p_expected_revision,revision);
   assert.equal(payload.p_data.materialsSourceV9532,'per_color_confirmed');
   remoteChecklist=structuredClone(payload.p_data);revision++;
   return [{applied:true}];
  }
  if(url.includes('module=eq.materialChecklists'))return [{module:'materialChecklists',entity_id:String(checklist.id),
     revision,data:structuredClone(remoteChecklist),updated_at:'2026-11-10T16:00:00Z'}];
  if(url.includes('module=eq.products'))return [{module:'products',entity_id:String(product.id),
     revision:3,data:structuredClone(product),updated_at:'2026-11-10T14:27:06Z'}];
  throw Error('Unexpected cloud request '+url);
 }
 const ctx={window:win,db,document:doc,console:{warn(){},info(){},error(){}},
  setTimeout(){},cloudRequest,cloudEnsureFreshSession:win.cloudEnsureFreshSession,localSaveOnly:win.localSaveOnly,
  openModal:win.openModal,closeModal:win.closeModal,alert(m){logs.push(String(m))},
  localStorage:{getItem(){return null}},indexedDB,navigator:{onLine:true},
  hlgbRecordSnapshots:win.hlgbRecordSnapshots,hlgbRecordLastSeen:{materialChecklists:''}};
 ctx.globalThis=ctx;vm.createContext(ctx);
 vm.runInContext('hlgbRecordSnapshots={materialChecklists:new Map()};window.hlgbRecordSnapshots=hlgbRecordSnapshots;',ctx);
 vm.runInContext(printer,ctx);vm.runInContext(source,ctx);
 return {ctx,win,db,checklist,product,before,get modal(){return modal},get print(){return print},
  get posts(){return posts},get remote(){return remoteChecklist},get logs(){return logs}};
}
test('real-world 240-piece checklist is separated by color even though original snapshot has only 3 totals',()=>{
 const f=fixture(),api=f.win.hlgbFactionMaterialRefresh9522;
 const analysis=api.analyze(f.checklist);
 assert.equal(analysis.status,'detail-needed');
 assert.equal(analysis.different,false);
 assert.equal(analysis.detailDifferent,true);
 assert.equal(analysis.oldCount,3);
 assert.equal(analysis.newCount,7);
 const get=(name,color)=>analysis.materials.find(m=>m.name===name&&m.color===color)?.qty;
 assert.equal(get('Alpinia','Preto'),343.2);
 assert.equal(get('Alpinia','Branco'),171.6);
 assert.equal(get('Alpinia','Rubi'),171.6);
 assert.equal(get('Alca Papiro .40 cm','Preto'),120);
 assert.equal(get('Alca Papiro .40 cm','Branco'),60);
 assert.equal(get('Alca Papiro .40 cm','Rubi'),60);
 assert.equal(get('laço Perola',''),720);
 assert.equal(JSON.stringify(f.db),f.before);
});
test('Conferir shows color lines with explicit save button and printing preview, no mutation',()=>{
 const f=fixture();
 f.win.hlgbFactionMaterialRefresh9522.openReview(f.checklist.id);
 assert.match(f.modal.html,/Salvar separação por cor na nuvem/);
 assert.match(f.modal.html,/Alpinia/);
 assert.match(f.modal.html,/Rubi/);
 assert.match(f.modal.html,/343,2/);
 assert.match(f.modal.html,/171,6/);
 const view=f.win.hlgbFactionChecklistGrade.displayMaterials(f.checklist);
 assert.equal(view.derived,true);
 assert.equal(view.notYetSaved,true);
 f.win.printMaterialChecklist(f.checklist.id);
 assert.match(f.print,/PRÉVIA DA SEPARAÇÃO POR COR/);
 assert.match(f.print,/Rubi/);
 assert.match(f.print,/343,2/);
 assert.equal(f.posts,0);assert.equal(JSON.stringify(f.db),f.before);
});
test('Explicit authenticated save creates seven lines and verifies exact cloud readback',async()=>{
 const f=fixture(),api=f.win.hlgbFactionMaterialRefresh9522;
 const result=await api.reloadAndSave(f.checklist.id);
 assert.equal(f.posts,1);
 assert.equal(result.count,7);
 assert.equal(f.remote.materials.length,7);
 assert.equal(f.remote.materialsSourceV9532,'per_color_confirmed');
 assert.equal(f.remote.materials.filter(x=>x.color==='Rubi').length,2);
 assert.equal(f.remote.materials.find(x=>x.name==='laço Perola').qty,720);
 assert.equal(api.analyze(f.checklist).status,'current');
});
test('Already received checklist is never saved and print uses original snapshot',async()=>{
 const f=fixture({received:true}),api=f.win.hlgbFactionMaterialRefresh9522;
 assert.equal(api.analyze(f.checklist).locked,true);
 assert.equal(f.win.hlgbFactionChecklistGrade.displayMaterials(f.checklist).derived,false);
 await assert.rejects(()=>api.reloadAndSave(f.checklist.id),/conferência\/recebimento/);
 assert.equal(f.posts,0);
});
test('Visual-only local hydration cannot falsely prove persistence',()=>{
 const f=fixture(),api=f.win.hlgbFactionMaterialRefresh9522;
 f.checklist.materials=api.buildMaterials(f.product,240,'F',f.checklist);
 assert.equal(f.checklist.materials.length,7);
 assert.equal(api.compare(f.checklist.materials,f.checklist.materials).detailDifferent,false);
 assert.equal(api.analyze(f.checklist).status,'detail-needed',
  'Legacy source without server v95.32 proof still requires reconciliation');
});
