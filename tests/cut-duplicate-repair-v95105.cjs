'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','release-cut-duplicate-repair-v95105.js'),'utf8');
const ID={jk:'1794489178728783',jd:'1794489179277674',yk:'1794489178968556',yd:'1794489179922532'};
function create(opts={}){
 const specs=[[ID.jk,'1788443129345','Fio Jamile',480,true],[ID.jd,'1788443129345','Fio Jamile',480,false],
 [ID.yk,'1788193667899','Short Doll Yza',410,true],[ID.yd,'1788193667899','Short Doll Yza',410,false]];
 const records=new Map(specs.map(([id,pid,product,pieces,keep])=>[id,{
  entity_id:id,revision:keep&&product==='Fio Jamile'?2:1,updated_at:'2026-11-17T18:00:00Z',deleted_at:null,
  data:{id:Number(id),orderId:1794489164896,productId:Number(pid),product,pieces,status:'Planejado',
    modelSplitChildV1:true,orderReferenceNumber:'49',cutterId:null,factionId:null,productionLocationId:null,
    originalGrade:[{productId:Number(pid),qty:pieces}],actualCutGrade:[{productId:Number(pid),qty:pieces}],
    ...(keep&&product==='Fio Jamile'?{materialUsage:[{name:'poliamida'},{name:'renda'},{name:'malha'}],
      materialUsageRecordedAt:'2026-11-17T16:51:18Z'}:{})}
 }]));
 const copy=x=>JSON.parse(JSON.stringify(x)),db={cuts:[...records.values()].map(r=>copy(r.data))},writes=[];
 const window={db,__HLGB_AUTH_READY:opts.unauth!==true,alert:()=>{},confirm:()=>opts.confirm!==false,
   cloudRequest:async path=>{
    const id=decodeURIComponent(path).match(/entity_id=eq\.([^&]+)/)?.[1];return records.has(id)?[copy(records.get(id))]:[];
   },hlgbWalIdbGuard9536:{probe:async()=>{},ids:()=>new Set(opts.wal||[]),status:()=>({readFailed:false})},
   hlgbRecordPendingIdentitySet9535:()=>new Set([]),
   hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{
    if(opts.fail&&writes.length===0)throw Error('indisponível');
    writes.push({module,id,deleted});const r=records.get(id);r.deleted_at=deleted?'2026-11-17T19:00:00Z':null;
    r.data=copy(data);r.revision++;return {applied:true,deleted_at:r.deleted_at}
   },localSaveOnly:()=>{},renderCuts:()=>{},renderDailyCuts:()=>{},
   hlgbCutModelSplit:{renderSplitPanel:()=>{}}};
 const document={addEventListener:()=>{},getElementById:()=>null};
 const context={window,document,db,console,setTimeout:()=>0,Date,Error,JSON,Number,String,Array,Set,Promise,encodeURIComponent};
 vm.createContext(context);vm.runInContext(source,context);
 return {api:window.hlgbCutDuplicateRepair95105,window,db,records,writes};
}
test('arquiva só os dois duplicados e preserva os materiais da Jamile',async()=>{
 const f=create(),r=await f.api.execute();
 assert.equal(r.ok,true);assert.equal(r.archived,2);assert.deepEqual(f.writes.map(x=>x.id),[ID.jd,ID.yd]);
 assert.equal(f.db.cuts.length,2);assert.equal(f.records.get(ID.jk).data.materialUsage.length,3);
 assert.equal(f.records.get(ID.jk).deleted_at,null);assert.equal(f.records.get(ID.yk).deleted_at,null);
 assert.ok(f.records.get(ID.jd).deleted_at);assert.ok(f.records.get(ID.yd).deleted_at);
});
test('execução idempotente e sem reenvio de exclusões',async()=>{
 const f=create();await f.api.execute();const r=await f.api.execute();
 assert.equal(r.already,true);assert.equal(f.writes.length,2);
});
test('confirmação cancelada não escreve nada',async()=>{
 const f=create({confirm:false}),r=await f.api.execute();assert.equal(r.canceled,true);assert.equal(f.writes.length,0);
});
test('WAL pendente, falta de autenticação e atualização do duplicado bloqueiam',async()=>{
 const wal=create({wal:['cuts::'+ID.jd]});await assert.rejects(wal.api.execute(),/pendente/);assert.equal(wal.writes.length,0);
 const auth=create({unauth:true});await assert.rejects(auth.api.execute(),/Entre no HLGB/);assert.equal(auth.writes.length,0);
 const modified=create();modified.records.get(ID.jd).revision=2;
 await assert.rejects(modified.api.execute(),/duplicado foi editado/);assert.equal(modified.writes.length,0);
});
test('falta dos 3 materiais impede alteração de qualquer corte',async()=>{
 const f=create();f.records.get(ID.jk).data.materialUsage=[];await assert.rejects(f.api.execute(),/3 materiais/);
 assert.equal(f.writes.length,0);
});
test('falha de nuvem não exclui dados locais nem tenta demais',async()=>{
 const f=create({fail:true});await assert.rejects(f.api.execute(),/indisponível/);
 assert.equal(f.writes.length,0);assert.equal(f.db.cuts.length,4);
});
test('loader injeta módulo após proteção de integridade de registros',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
 const a=html.indexOf("'release-record-integrity.js'"),b=html.indexOf("'release-cut-duplicate-repair-v95105.js'");
 assert.ok(a>=0&&b>a);
});
