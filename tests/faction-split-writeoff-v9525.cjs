'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const coreSource=fs.readFileSync('release-production-operations-v9385-core.js','utf8');
const writeoffSource=fs.readFileSync('release-production-writeoff-integrity-v9391.js','utf8');
const splitSource=fs.readFileSync('release-cut-model-split.js','utf8');
const factionSource=fs.readFileSync('release-faction-operations-v9520.js','utf8');
const grade=(pid,qty)=>({productId:pid,qty,size:'M',color:'Preto'});
function fixture({pending=false}={}){
 const db={orders:[{id:37,orderNumber:37,client:'Click Sophia',grade:[grade(1,192),grade(2,172),grade(3,240)]},
  {id:38,orderNumber:38,client:'Click Sophia',grade:[grade(4,300),grade(5,280)]}],
 products:[{id:1,name:'Short Doll Crystal'},{id:2,name:'Short Doll Melanie'},{id:3,name:'Camisola Leidiane'},{id:4,name:'Cueca Boxer Emerson'},{id:5,name:'Calcinha Micaela'}],
 cuts:[{id:370,orderId:37,status:'Desmembrado por modelo',modelSplitParentV1:true,hiddenByModelSplitV1:true,pieces:630},
  {id:371,orderId:37,productId:1,modelSplitChildV1:true,status:'Finalizado',pieces:192,actualCutGrade:[grade(1,192)]},
  {id:372,orderId:37,productId:2,modelSplitChildV1:true,status:'Finalizado',pieces:172,actualCutGrade:[grade(2,172)]},
  {id:373,orderId:37,productId:3,modelSplitChildV1:true,status:'Planejado',pieces:240,originalGrade:[grade(3,240)]},
  {id:380,orderId:38,status:'Desmembrado por modelo',modelSplitParentV1:true,hiddenByModelSplitV1:true,pieces:580},
  {id:381,orderId:38,productId:4,modelSplitChildV1:true,status:'Finalizado',pieces:260,actualCutGrade:[grade(4,260)]},
  {id:382,orderId:38,productId:5,modelSplitChildV1:true,status:'Finalizado',pieces:280,actualCutGrade:[grade(5,280)]}],
 production:[{id:1001,orderId:37,cutId:371,productId:1,stage:'Em produção',planned:192},
  {id:1002,orderId:37,cutId:372,productId:2,stage:'Em produção',planned:172},
  {id:1004,orderId:38,cutId:381,productId:4,stage:'Em produção',planned:260},
  {id:1005,orderId:38,cutId:382,productId:5,stage:'Em produção',planned:280}],
 operationalWriteoffs:[],factions:[],cutters:[],factionPayments:[{id:10,paid:true,total:900}]};
 const warnings=[],reads=[];let submit=null,writes=0;
 const document={getElementById(id){
   if(id==='w9391reason')return{value:'Outro'};
   if(id==='w9391note')return{value:'Conferência do modelo'};
   return null;
 },querySelectorAll(sel){if(sel==='.hlgb9391-writeoff:checked')return [{value:'modelo-pedido-38|4'}];return[]}};
 const localStorage={getItem(k){return pending&&k==='hlgb_durable_wal_v1'?
   JSON.stringify({entries:{'cuts|381':{module:'cuts',id:381,data:{orderId:38,productId:4}}}}):null}};
 const indexedDB={open(){const req={};process.nextTick(()=>{
   req.result={objectStoreNames:{contains:n=>n==='entries'},close(){},transaction(){
     const tx={objectStore(){return{getAll(){const get={};process.nextTick(()=>{get.result=[];get.onsuccess?.();tx.oncomplete?.()});return get}}}};return tx;
   }};req.onsuccess?.();
  });return req}};
 const ctx={window:null,db,document,localStorage,indexedDB,navigator:{onLine:true},console:{info(){},warn(){},error(){}},setTimeout(){},
  hlgbAfterLogin(){},alert(s){warnings.push(String(s))},openModal(t,body,fn){submit=fn},closeModal(){},__HLGB_AUTH_READY:true,
  cloudEnsureFreshSession:async()=>true,cloudRequest:async(path)=>{
   reads.push(path);
   if(path.includes('entity_id=eq.')){const id=decodeURIComponent(path.split('entity_id=eq.')[1].split('&')[0]);return remotes.filter(x=>x.entity_id===id)}
   return remotes.slice();
  }};
 const remotes=[];
 ctx.hlgbRecordSaveWithRetry=async(module,id,data)=>{
   writes++;
   assert.equal(module,'operationalWriteoffs');
   assert.equal(id,data.id);
   remotes.push({module,entity_id:id,data:JSON.parse(JSON.stringify(data)),revision:1,deleted_at:null});
   return {applied:true,data,revision:1};
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(coreSource,ctx);vm.runInContext(writeoffSource,ctx);
 return {ctx,db,remotes,reads,warnings,get writes(){return writes},async submit(){assert.equal(typeof submit,'function');await submit()}};
}
test('syntax and visible faction entry, with split-model button in Corte',()=>{
 assert.doesNotThrow(()=>new vm.Script(coreSource));
 assert.doesNotThrow(()=>new vm.Script(writeoffSource));
 assert.doesNotThrow(()=>new vm.Script(splitSource));
 assert.doesNotThrow(()=>new vm.Script(factionSource));
 assert.match(factionSource,/document\.getElementById\('faccoes'\)/);
 assert.match(factionSource,/panel\.parentElement!==page/);
 // The retired per-split writeoff button must remain absent; use the validated operational flow.
 assert.doesNotMatch(splitSource,/onclick="hlgbShowWriteoffForSplit/);
 assert.match(splitSource,/hlgbOpenSplitGradeAdjust/);
});
test('split parent never doubles child cuts in operational list',()=>{
 const f=fixture();
 const rows=f.ctx.hlgbOperationalVisibility9385.visibleModelRows();
 assert.equal(rows.length,5);
 assert.ok(rows.every(x=>!x.cut.modelSplitParentV1));
 assert.equal(rows.filter(x=>x.productId==='4').length,1);
});
test('37 and 38: only finalized children pending, real cut qty used',()=>{
 const f=fixture(),p=f.ctx.hlgbWriteoffIntegrity9391.pendingModels();
 assert.equal(p.length,4);
 const qty=id=>p.find(x=>String(x.productId)===String(id))?.qty;
 assert.equal(qty(1),192);assert.equal(qty(2),172);
 assert.equal(qty(4),260);assert.equal(qty(5),280);
 assert.equal(qty(3),undefined);
 assert.ok(p.every(x=>x.orderProductRefs.length===1));
});
test('selected writeoff records one order/model once, readback verified and finances preserved',async()=>{
 const f=fixture(),before=JSON.stringify(f.db.factionPayments);
 f.ctx.hlgbWriteoffSelected9385();await f.submit();
 assert.equal(f.writes,1);assert.equal(f.remotes.length,1);
 assert.equal(f.remotes[0].data.quantity,260);
 assert.deepEqual(JSON.parse(JSON.stringify(f.remotes[0].data.orderProductRefs)),[{orderId:'38',productId:'4'}]);
 assert.equal(JSON.stringify(f.db.factionPayments),before);
 assert.equal(f.ctx.hlgbWriteoffIntegrity9391.pendingModels().length,3);
 assert.ok(f.reads.some(x=>x.includes('entity_id=eq.')),'readback required');
});
test('unconfirmed WAL of cut blocks writeoff and changes no record',async()=>{
 const f=fixture({pending:true});
 f.ctx.hlgbWriteoffSelected9385();await f.submit();
 assert.equal(f.writes,0);
 assert.equal(f.remotes.length,0);
 assert.ok(f.warnings.some(x=>/pendentes/i.test(x)));
});
test('prior confirmed pair is not offered for duplicate writeoff',()=>{
 const f=fixture();
 f.db.operationalWriteoffs.push({id:'old',sourceType:'model',orderProductRefs:[{orderId:'38',productId:'4'}]});
 const p=f.ctx.hlgbWriteoffIntegrity9391.pendingModels();
 assert.ok(!p.some(x=>String(x.productId)==='4'));
 assert.equal(p.length,3);
});
