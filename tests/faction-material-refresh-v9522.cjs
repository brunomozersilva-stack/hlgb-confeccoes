'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-faction-material-refresh-v9522.js','utf8');
const router=fs.readFileSync('app-stable3.html','utf8');
const crystal={id:1794233310486,name:'Short Doll Crystal',materials:[
 {materialId:1787861583858,name:'Romantic',unit:'kg',qty:6,loss:0,calcMode:'yield'},
 {materialId:1788777471853,name:'renda 06',unit:'m',qty:.32,loss:0,calcMode:'consumption'},
 {materialId:1788778167229,name:'laçarote G',unit:'un.',qty:2,loss:0,calcMode:'consumption'},
 {materialId:1788203765087,name:'Alca Papiro .40 cm',unit:'un.',qty:1,loss:0,calcMode:'consumption'}
]};
const melanie={id:1788442854165,name:'Short Doll Melanie',materials:[
 {materialId:1787861583858,name:'Romantic',unit:'kg',qty:8,loss:0,calcMode:'yield'},
 {materialId:1787861563966,name:'Renda 18 Jacatronica',unit:'kg',qty:.038,loss:0,calcMode:'consumption'},
 {materialId:1788203765087,name:'Alca Papiro .40 cm',unit:'un.',qty:1,loss:0,calcMode:'consumption'},
 {materialId:1788203914667,name:'Laco M',unit:'un.',qty:2,loss:0,calcMode:'consumption'},
 {materialId:1788777309734,name:'fita 002',unit:'m',qty:.4998,loss:0,calcMode:'consumption'},
 {materialId:1791245626717,name:'Alpinia',unit:'m',qty:1,loss:0,calcMode:'consumption'}
]};
test('new reconciler loaded after faction operations, syntax valid',()=>{
 assert.match(router,/'release-faction-operations-v9520\.js','release-faction-material-refresh-v9522\.js'/);
 assert.doesNotThrow(()=>new vm.Script(source));
});
function setup({checked=false,pending=false,lostResponse=false}= {}){
 const c={id:1794313232479,productId:crystal.id,productName:crystal.name,destinationName:'Graziano',
 qty:192,materials:checked?[{name:'Romantic',unit:'kg',qty:32,checked:true}]:[],
 status:'Pendente',note:'não apagar',total:400,unitPrice:2.08,receivedAt:'',receivedBy:''};
 const db={products:[JSON.parse(JSON.stringify(crystal)),JSON.parse(JSON.stringify(melanie))],
 materialChecklists:[JSON.parse(JSON.stringify(c))],factions:[],factionPayments:[{id:77,paid:true,total:400}]};
 const snap={materialChecklists:new Map([[String(c.id),{revision:1,data:JSON.parse(JSON.stringify(c))}]])};
 let remoteChecklist={module:'materialChecklists',entity_id:String(c.id),revision:1,data:JSON.parse(JSON.stringify(c)),updated_at:'2026-11-10T12:00:00Z'};
 const remoteProduct={module:'products',entity_id:String(crystal.id),revision:3,data:JSON.parse(JSON.stringify(crystal)),updated_at:'2026-11-10T12:00:00Z'};
 let posts=0,cacheWrites=0;
 const idb={open(){const req={};process.nextTick(()=>{req.result={objectStoreNames:{contains:x=>x==='entries'},close(){},transaction(){
    const tx={objectStore(){return {openCursor(){const cursor={};process.nextTick(()=>{cursor.result=null;cursor.onsuccess?.();tx.oncomplete?.()});return cursor}}}};return tx
   }};req.onsuccess?.()});return req}};
 const localStorage={getItem(name){if(name==='hlgb_durable_wal_v1'&&pending)return JSON.stringify({entries:{'materialChecklists|1794313232479':{module:'materialChecklists',id:1794313232479}}});return null}};
 const cloudRequest=async(path,opt)=>{
  if(path.includes('module=eq.materialChecklists'))return [JSON.parse(JSON.stringify(remoteChecklist))];
  if(path.includes('module=eq.products'))return [JSON.parse(JSON.stringify(remoteProduct))];
  if(path==='rpc/hlgb_save_record'){
   posts++;
   const body=JSON.parse(opt.body);
   assert.equal(body.p_module,'materialChecklists');assert.equal(body.p_entity_id,String(c.id));
   assert.equal(body.p_expected_revision,remoteChecklist.revision);
   assert.equal(body.p_deleted,false);
   assert.equal(body.p_data.note,'não apagar');
   assert.equal(body.p_data.total,400);
   remoteChecklist={...remoteChecklist,revision:2,data:body.p_data,updated_at:'2026-11-10T12:40:00Z'};
   if(lostResponse){lostResponse=false;throw Error('failed to fetch after commit')}
   return {applied:true,data:body.p_data,revision:2};
  }
  throw Error('Unexpected '+path);
 };
 const document={readyState:'loading',addEventListener(){},getElementById:()=>null};
 const ctx={console,Date,Number,String,Array,Map,Set,Math,JSON,Object,Promise,db,document,window:null,
 localStorage,indexedDB,cloudRequest,cloudEnsureFreshSession:async()=>true,__HLGB_AUTH_READY:true,
 navigator:{onLine:true},hlgbRecordSnapshots:snap,hlgbRecordLastSeen:{materialChecklists:''},
 setTimeout(){return 0},localSaveOnly(){cacheWrites++},renderDestinationChecklists(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,db,get posts(){return posts},get cacheWrites(){return cacheWrites},get remoteChecklist(){return remoteChecklist}};
}
test('Crystal 192 peças: rendimento 6 pç/kg -> 32 kg, mais 3 aviamentos',()=>{
 const h=setup(),m=h.ctx.hlgbFactionMaterialRefresh9522.buildMaterials(crystal,192);
 assert.equal(m.length,4);
 assert.equal(m.find(x=>x.name==='Romantic').qty,32);
 assert.equal(m.find(x=>x.name==='renda 06').qty,61.44);
 assert.equal(m.find(x=>x.name==='laçarote G').qty,384);
 assert.equal(m.find(x=>x.name==='Alca Papiro .40 cm').qty,192);
 assert.equal(h.ctx.hlgbFactionMaterialRefresh9522.analyze(h.db.materialChecklists[0]).status,'stale');
 assert.equal(h.ctx.hlgbFactionMaterialRefresh9522.analyze(h.db.materialChecklists[0]).oldCount,0);
});
test('Melanie 172 peças: 6 materiais, Romantic rendimento 8 pç/kg -> 21,5 kg',()=>{
 const h=setup(),m=h.ctx.hlgbFactionMaterialRefresh9522.buildMaterials(melanie,172);
 assert.equal(m.length,6);
 assert.equal(m.find(x=>x.name==='Romantic').qty,21.5);
 assert.ok(Math.abs(m.find(x=>x.name==='Renda 18 Jacatronica').qty-6.536)<1e-9);
 assert.equal(m.find(x=>x.name==='Laco M').qty,344);
 assert.ok(Math.abs(m.find(x=>x.name==='fita 002').qty-85.9656)<1e-9);
 assert.equal(m.find(x=>x.name==='Alpinia').qty,172);
});
test('update is one revision-safe cloud write with readback and preserves history and finances',async()=>{
 const h=setup();const result=await h.ctx.hlgbFactionMaterialRefresh9522.reloadAndSave(1794313232479);
 assert.equal(result.count,4);
 assert.equal(h.posts,1);
 assert.equal(h.db.materialChecklists[0].materials.length,4);
 assert.equal(h.db.materialChecklists[0].note,'não apagar');
 assert.equal(h.db.materialChecklists[0].total,400);
 assert.equal(h.db.materialChecklists[0].materials[0].checked,false);
 assert.equal(h.ctx.hlgbRecordSnapshots.materialChecklists.get('1794313232479').revision,2);
 assert.equal(h.cacheWrites,1);
 assert.equal(h.db.factionPayments[0].paid,true);
});
test('existing checked item blocks any automatic rewrite or new cloud write',async()=>{
 const h=setup({checked:true}),review=h.ctx.hlgbFactionMaterialRefresh9522.analyze(h.db.materialChecklists[0]);
 assert.equal(review.locked,true);
 await assert.rejects(()=>h.ctx.hlgbFactionMaterialRefresh9522.reloadAndSave(1794313232479),/concilia|confer/i);
 assert.equal(h.posts,0);
 assert.equal(h.db.materialChecklists[0].materials[0].checked,true);
});
test('relevant pending WAL blocks write',async()=>{
 const h=setup({pending:true});
 await assert.rejects(()=>h.ctx.hlgbFactionMaterialRefresh9522.reloadAndSave(1794313232479),/pendente/i);
 assert.equal(h.posts,0);
});
test('lost HTTP acknowledgement does not duplicate cloud write; next read reconciles',async()=>{
 const h=setup({lostResponse:true});
 await assert.rejects(()=>h.ctx.hlgbFactionMaterialRefresh9522.reloadAndSave(1794313232479),/failed to fetch/i);
 assert.equal(h.posts,1);
 assert.equal(h.db.materialChecklists[0].materials.length,0);
 assert.equal(h.remoteChecklist.data.materials.length,4);
 const result=await h.ctx.hlgbFactionMaterialRefresh9522.reloadAndSave(1794313232479);
 assert.equal(result.alreadyCurrent,true);
 assert.equal(h.posts,1);
 assert.equal(h.db.materialChecklists[0].materials.length,4);
});
