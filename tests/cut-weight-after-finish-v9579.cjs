'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-cut-weight-v9579.js','utf8'),boot=fs.readFileSync('app-stable3.html','utf8');
assert(boot.includes("'release-cut-weight-v9579.js'"));
let pending=false,fail=false,allowRead=true,remoteRow={id:'cut1',productId:'p1',orderId:'o1',pieces:1000,
 cutterId:'c1',status:'Finalizado',finishedAt:'2026-11-12T15:00:00Z',actualCutGrade:[{size:'P',qty:200}]};
const db={cuts:[JSON.parse(JSON.stringify(remoteRow))]},deep=x=>JSON.parse(JSON.stringify(x));
const w={db,__HLGB_AUTH_READY:true,addEventListener(){},hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>pending?['cuts::cut1']:[],status:()=>({readFailed:false})},
 hlgbRecordSaveWithRetry:async(m,id,p)=>{assert.equal(m,'cuts');if(fail)return {applied:false,reason:'Servidor recusou'};remoteRow=deep(p);return {applied:true,data:deep(p)}},
 cloudRequest:async(path)=>{assert(path.includes('module=eq.cuts'));return allowRead?[{entity_id:'cut1',data:deep(remoteRow),deleted_at:null}]:[]},
 renderCuts(){},renderCutterHistory9250(){}};
const context={window:w,document:{readyState:'loading',addEventListener(){}},Date,Math,JSON,Set,Promise,console,setTimeout(){},encodeURIComponent};
vm.createContext(context);vm.runInContext(src,context);
const api=w.hlgbCutWeight9579;assert.equal(api.version,'95.79');
(async()=>{
 const old=JSON.stringify(db.cuts[0]);
 pending=true;await assert.rejects(()=>api.save('cut1',{totalKg:10,usedKg:7,wasteKg:2}),/pendente/);
 assert.equal(JSON.stringify(db.cuts[0]),old);
 pending=false;fail=true;await assert.rejects(()=>api.save('cut1',{totalKg:10}),/recusou/);assert.equal(JSON.stringify(db.cuts[0]),old);
 fail=false;allowRead=false;await assert.rejects(()=>api.save('cut1',{totalKg:10,usedKg:7,wasteKg:2}),/não comprovou/);
 assert.equal(JSON.stringify(db.cuts[0]),old,'unverified save must not replace local cut');
 allowRead=true;db.cuts[0]=deep(remoteRow);
 const one=await api.save('cut1',{totalKg:10,usedKg:7,wasteKg:2,note:'Rolo final'});
 assert(one.ok);assert.equal(db.cuts[0].cutWeightV9579.totalKg,10);
 assert.equal(db.cuts[0].status,'Finalizado');assert.equal(db.cuts[0].finishedAt,'2026-11-12T15:00:00Z');
 assert.equal(db.cuts[0].pieces,1000);assert.equal(db.cuts[0].actualCutGrade[0].qty,200);
 assert(db.cuts[0].cutWeightEventsV9579.length>=2);
 const oldCount=db.cuts[0].cutWeightEventsV9579.length;
 await api.save('cut1',{totalKg:11,usedKg:8,wasteKg:2,note:'Pesagem conferida'});
 assert.equal(db.cuts[0].cutWeightEventsV9579.length,oldCount+1);
 const last=db.cuts[0].cutWeightEventsV9579.at(-1);
 assert.equal(last.before.totalKg,10);assert.equal(last.after.totalKg,11);
 assert.throws(()=>api.validate({totalKg:0}),/peso total/);
 assert.throws(()=>api.validate({totalKg:10,usedKg:11}),/maior/);
 assert.match(src,/cutTable/);assert.match(src,/dailyCutsTable/);
 console.log('PASS v95.79: completed cutting weight updates with remote ACK/readback, no stage or grade changes, full history and WAL guard');
})().catch(e=>{console.error(e);process.exitCode=1});
