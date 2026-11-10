'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const src=fs.readFileSync('release-faction-operations-v9520.js','utf8');
const app=fs.readFileSync('app-stable3.html','utf8');
test('new faction operations module loads after validated v95.14 transfer',()=>{
 assert.match(app,/'release-faction-safe-adjust-v9514\.js','release-faction-operations-v9520\.js'/);
 assert.doesNotThrow(()=>new vm.Script(src));
 assert.ok(src.includes('hlgb_save_record'));
 assert.ok(!src.includes("window.save("),'must never invoke generic full-db save');
});
function setup({pending=false,conflict=false,offline=false,existing=0,postResponseLost=false}={}){
 const fid='1001',pid='2001';
 const base={id:1001,name:'Graziano',productId:2001,orderId:3001,productionId:4001,
   op:'OP-1001',status:'Em produção',description:'Cueca modelo A',
   sent:30,done:20,returned:10,defects:0,waste:0,price:1.5,
   travetaDonePiecesV9520:existing,travetaBaixasV9520:existing?[{requestId:'old-event',quantity:existing,pointsTotal:existing*2,pointsPerPiece:2}]:[]};
 const master={id:2001,name:'Cueca modelo A',travetadas:2};
 let remoteFac={module:'factions',entity_id:fid,revision:3,data:{...base},deleted_at:null};
 let remoteProd={module:'products',entity_id:pid,revision:2,data:{...master},deleted_at:null};
 let post=0, read=0, localSaves=0, alerts=[], errorText='', modal=null;
 const inputs={
  hlgbTravetaQty9520:{value:'5'},hlgbTravetaNote9520:{value:'Terminou travetada de cinco cuecas'},
  hlgbTravetaError9520:{set textContent(v){errorText=v},get textContent(){return errorText}},
  hlgbTravetaSubmit9520:{disabled:false,textContent:'',isConnected:true}
 };
 const localWAL=pending?{entries:{'factions|1001':{module:'factions',id:'1001',data:{...base}}}}:{entries:{}};
 let openTx;
 const indexedDB={open(){const req={};process.nextTick(()=>{
   req.result={objectStoreNames:{contains:n=>n==='entries'},close(){},transaction(){
    const tx={objectStore(){return {getAll(){const result={};process.nextTick(()=>{result.result=[];result.onsuccess?.();tx.oncomplete?.()});return result}}}};return tx;
   }};
   req.onsuccess?.();
  });return req;
 }};
 const document={readyState:'loading',addEventListener(){},getElementById:id=>inputs[id]||null,
  createElement(){return {style:{},innerHTML:'',querySelector:()=>null,addEventListener(){}}}};
 const cloudRequest=async(path,opts)=>{
  if(offline)throw new Error('failed to fetch');
  if(path.startsWith('hlgb_records?')){
   read++;
   if(path.includes('module=eq.factions'))return [remoteFac];
   if(path.includes('module=eq.products'))return [remoteProd];
   throw Error('unexpected read '+path);
  }
  if(path==='rpc/hlgb_save_record'){
   post++;
   const body=JSON.parse(opts.body);
   assert.equal(body.p_module,'factions');
   assert.equal(body.p_entity_id,fid);
   assert.equal(body.p_expected_revision,remoteFac.revision);
   assert.equal(body.p_deleted,false);
   if(conflict)return {applied:false,data:remoteFac.data,revision:remoteFac.revision};
   remoteFac={...remoteFac,revision:remoteFac.revision+1,data:body.p_data,updated_at:'2026-11-10T12:30:00Z'};
   if(postResponseLost){postResponseLost=false;throw Error('failed to fetch after server commit')}
   return {applied:true,data:remoteFac.data,revision:remoteFac.revision};
  }
  throw Error('unexpected request '+path);
 };
 const hlgbRecordSnapshots={factions:new Map([[fid,{data:{...base},deleted_at:null,revision:3,updated_at:'2026-11-10T12:00:00Z'}]])};
 const hlgbRecordLastSeen={factions:'2026-11-10T12:00:00Z'};
 const ctx={console,Date,Number,String,Array,Object,JSON,Map,Set,Math,Promise,hlgbRecordSnapshots,hlgbRecordLastSeen,
  db:{factions:[{...base}],products:[master],factionMasters:[]},
  window:null,document,navigator:{onLine:true},localStorage:{getItem(k){return k==='hlgb_durable_wal_v1'?JSON.stringify(localWAL):null}},
  indexedDB,setTimeout(){return 0},cloudRequest,cloudEnsureFreshSession:async()=>true,
  cloudUser:{email:'testing@example.com'},crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},
  openModal(title,html,fn){modal={title,html,fn}},closeModal(){},alert(msg){alerts.push(String(msg))},
  localSaveOnly(){localSaves++},__HLGB_AUTH_READY:true
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
 return {ctx,get remote(){return remoteFac.data},get post(){return post},get read(){return read},get localSaves(){return localSaves},get alerts(){return alerts},get error(){return errorText},get modal(){return modal},inputs};
}
test('faction transfer opens existing transactional v95.14 UI, no legacy edit',()=>{
 const h=setup(),calls=[];
 h.ctx.hlgbFactionAdjust9514={open:id=>calls.push(id)};
 h.ctx.hlgbFactionOperations9520.openTransfer(1001);
 assert.equal(calls.length,1);assert.equal(String(calls[0]),'1001');
 assert.equal(h.post,0);
});
test('traveta operation adds five finished garments, ten travetas, does not touch price or paid fields',async()=>{
 const h=setup();h.ctx.hlgbFactionOperations9520.openTraveta(1001);
 assert.match(h.modal.title,/Baixa operacional de travetada/);
 assert.match(h.modal.html,/não altera pagamento/);
 const result=await h.ctx.hlgbFactionOperations9520.submitTraveta();
 assert.equal(result,true,h.error);
 assert.equal(h.post,1);
 assert.equal(h.remote.travetaDonePiecesV9520,5);
 assert.equal(h.remote.travetaBaixasV9520[0].pointsTotal,10);
 assert.equal(h.remote.name,'Graziano');
 assert.equal(h.remote.price,1.5);
 assert.equal(h.remote.sent,30);
 assert.equal(h.remote.done,20);
 assert.equal(h.localSaves,1);
 assert.equal(h.alerts.length,1);
 assert.equal(h.ctx.hlgbRecordSnapshots.factions.get('1001').revision,4,'normal sync must see cloud revision');
 assert.equal(h.ctx.hlgbRecordSnapshots.factions.get('1001').data.travetaDonePiecesV9520,5);
 assert.equal(h.ctx.hlgbRecordLastSeen.factions,'2026-11-10T12:30:00Z');
});
test('refuses traveta write if WAL has pending faction operations',async()=>{
 const h=setup({pending:true});h.ctx.hlgbFactionOperations9520.openTraveta(1001);
 const result=await h.ctx.hlgbFactionOperations9520.submitTraveta();
 assert.equal(result,false);
 assert.equal(h.post,0);
 assert.match(h.error,/pendente/i);
});
test('conflict does not auto-merge or write a second time',async()=>{
 const h=setup({conflict:true});h.ctx.hlgbFactionOperations9520.openTraveta(1001);
 const result=await h.ctx.hlgbFactionOperations9520.submitTraveta();
 assert.equal(result,false);
 assert.equal(h.post,1);
 assert.match(h.error,/não confirmada|conflito|revisão/i);
 assert.equal(h.remote.travetaDonePiecesV9520,0);
 assert.equal(h.localSaves,0);
});
test('non-positive number and missing product points cannot be saved',async()=>{
 const h=setup();h.ctx.hlgbFactionOperations9520.openTraveta(1001);
 h.inputs.hlgbTravetaQty9520.value='-5';
 assert.equal(await h.ctx.hlgbFactionOperations9520.submitTraveta(),false);
 assert.equal(h.post,0);
});
test('history counts are not inferred as zero when old operations might exist',()=>{
 const h=setup({existing:5});const st=h.ctx.hlgbFactionOperations9520.status('1001');
 assert.equal(st.done,5);assert.equal(st.eligible,20);assert.equal(st.remaining,15);
 assert.equal(st.recordedPoints,10);
 assert.equal(st.source,'travetaBaixasV9520');
});

test('lost response after real server commit retries only readback, never duplicate write',async()=>{
 const h=setup({postResponseLost:true});h.ctx.hlgbFactionOperations9520.openTraveta(1001);
 const first=await h.ctx.hlgbFactionOperations9520.submitTraveta();
 assert.equal(first,false,'first request must report unconfirmed response');
 assert.equal(h.post,1);
 assert.equal(h.remote.travetaDonePiecesV9520,5,'database already committed one operation');
 const second=await h.ctx.hlgbFactionOperations9520.submitTraveta();
 assert.equal(second,true,h.error);
 assert.equal(h.post,1,'retry must not send a second write');
 assert.equal(h.remote.travetaBaixasV9520.length,1,'no duplicate event');
 assert.equal(h.ctx.hlgbRecordSnapshots.factions.get('1001').revision,4);
});
test('refuses browser save when revision snapshot registry cannot be updated',async()=>{
 const h=setup();h.ctx.hlgbRecordSnapshots.factions=null;
 h.ctx.hlgbFactionOperations9520.openTraveta(1001);
 const ok=await h.ctx.hlgbFactionOperations9520.submitTraveta();
 assert.equal(ok,false);
 assert.match(h.error,/Cache de revisões/i);
 assert.equal(h.ctx.db.factions[0].travetaDonePiecesV9520,0,'local unsynchronized copy is not silently replaced');
});
