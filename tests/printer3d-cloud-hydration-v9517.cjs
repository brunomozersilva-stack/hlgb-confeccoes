'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),test=require('node:test');
const src=fs.readFileSync('release-printer3d-cloud-hydration-v9517.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
const auditor=fs.readFileSync('release-internal-auditor.js','utf8');
assert(loader.includes("'release-printer3d-cloud-hydration-v9517.js'"));
assert(loader.includes("'release-printer3d-persistence-v9431.js'"));
assert(auditor.includes("'data:printer3d-cloud'"));
const cloud=[...Array.from({length:6},(_,i)=>({module:'printer3dProducts',entity_id:'p'+(i+1),data:{id:'p'+(i+1),name:'Produto '+(i+1),filamentPriceKg:120},revision:1,updated_at:'2026-11-09T19:00:00Z'})),{module:'printer3dSales',entity_id:'s1',data:{id:'s1',total:15},revision:1,updated_at:'2026-11-09T19:00:00Z'},{module:'printer3dSettings',entity_id:'settings-main',data:{id:'settings-main',filamentPriceKg:120,machineHourRate:1.25,defaultMultiplier:2},revision:2,updated_at:'2026-11-09T19:00:00Z'}];
function run({pending=false,reject=false,initialSettings=null}={}){
 let writes=0,requests=[];
 const db={printer3dProducts:[],printer3dSales:[],printer3dSettings:initialSettings?[initialSettings]:[]};
 const store=new Map();
 if(pending)store.set('hlgb_records_pending_v91',JSON.stringify({modules:{printer3dSettings:[{id:'settings-main',deleted:false,data:initialSettings}]}}));
 const document={readyState:'loading',getElementById:()=>null,querySelector:()=>null,addEventListener:()=>{},activeElement:null};
 const c={console,Date,JSON,Map,Set,Promise,Math,Number,String,Array,Object,db,hlgbRecordSnapshots:{},cloudAccessToken:'test',document,localSaveOnly:()=>{writes++},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},cloudEnsureFreshSession:async()=>true,cloudRequest:async(path,opt)=>{requests.push({path,opt});if(reject)throw Error('conexão simulada indisponível');return cloud},setTimeout:()=>0,window:null};
 c.window=c;vm.createContext(c);vm.runInContext(src,c);
 return {c,db,get writes(){return writes},requests};
}
test('recupera seis produtos, venda e preço do filamento sem escrita remota',async()=>{
 const t=run();const st=await t.c.hlgbPrinter3dCloud9517.refresh('test',true);
 assert.equal(t.db.printer3dProducts.length,6);assert.equal(t.db.printer3dSales.length,1);
 assert.equal(t.db.printer3dSettings[0].filamentPriceKg,120);
 assert.equal(t.c.hlgbRecordSnapshots.printer3dSettings.get('settings-main').revision,2);
 assert.equal(st.remoteCounts.printer3dProducts.cloud,6);assert.equal(st.recordsVerified,true);
 assert.equal(t.requests.length,1);assert.equal(t.requests[0].opt.method,'GET');
});
test('preserva valor pendente para o mesmo ID sem sobrescrever a nuvem',async()=>{
 const initial={id:'settings-main',filamentPriceKg:135,machineHourRate:1.25};
 const t=run({pending:true,initialSettings:initial});
 const st=await t.c.hlgbPrinter3dCloud9517.refresh('test',true);
 assert.equal(t.db.printer3dSettings[0].filamentPriceKg,135);
 assert.equal(st.status,'warn');assert.ok(st.preservedPending>0);
 assert.equal(t.c.hlgbRecordSnapshots.printer3dSettings.get('settings-main').data.filamentPriceKg,120);
});
test('falha de rede mantém dados locais intactos',async()=>{
 const t=run({reject:true,initialSettings:{id:'settings-main',filamentPriceKg:120}});
 const st=await t.c.hlgbPrinter3dCloud9517.refresh('test',true);
 assert.equal(st.verified,false);assert.equal(st.status,'warn');
 assert.equal(t.db.printer3dSettings[0].filamentPriceKg,120);assert.equal(t.writes,0);
});