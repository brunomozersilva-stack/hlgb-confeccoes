'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('release-orders-cloud-visibility-v9537.js','utf8');
const mkrow=(id,client,num)=>({module:'orders',entity_id:String(id),revision:1,updated_at:'2026-11-11T12:17:00Z',deleted_at:null,data:{id,client,orderNumber:num,qty:240}});
async function scenario(pendingIds=[]){
 const rows=[mkrow(1794399349735,'Dell',43),mkrow(1794399455334,'Quesia',44)];
 let requests=0,writes=0;
 const db={orders:[]},pending=new Set(pendingIds),listeners={};
 const win={
  hlgbWalIdbGuard9536:{probe:async()=>({count:0}),status:()=>({readFailed:false})},
  hlgbRecordPendingIdentitySet9535:()=>new Set(pending),
  cloudRequest:async(path,opt)=>{assert.match(path,/module=eq.orders/);assert.equal(opt.method,'GET');requests++;return rows},
  hlgbApplyRecordRow:row=>{if(!db.orders.some(x=>String(x.id)===String(row.entity_id)))db.orders.push(JSON.parse(JSON.stringify(row.data)));return true},
  renderOrders:()=>{},addEventListener:()=>{}
 };
 const document={
  getElementById:id=>id==='appShell'?{}:id==='loginScreen'?{}:null,
  querySelector:selector=>selector==='#appShell .page.active'?{id:'pedidos'}:null,
  addEventListener:()=>{},activeElement:null
 };
 const ctx={window:win,document,db,navigator:{onLine:true},getComputedStyle:()=>({display:'none'}),
 setTimeout:()=>0,setInterval:()=>0,console,Date,Set,JSON,Array,Math,String};
 vm.runInNewContext(source,ctx,{filename:'release-orders-cloud-visibility-v9537.js'});
 assert.equal(await win.hlgbOrdersCloudConfirm9537.check(true),true);
 assert.equal(requests,1);assert.equal(writes,0);
 return {db,win,requests};
}
(async()=>{
 const a=await scenario();
 assert.deepEqual(a.db.orders.map(o=>o.orderNumber).sort(),[43,44]);
 await a.win.hlgbOrdersCloudConfirm9537.check(true);
 assert.equal(a.db.orders.length,2,'duplicate remote reads must not duplicate orders');
 const b=await scenario(['orders::1794399455334']);
 assert.deepEqual(b.db.orders.map(o=>o.orderNumber),[43],'protect local pending order from echo');
 console.log('PASS v95.37: independent order catch-up, idempotency, no writes, pending protection');
})().catch(e=>{console.error(e);process.exitCode=1});