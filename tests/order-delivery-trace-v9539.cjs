'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-order-delivery-trace-v9539.js','utf8');
function run(opts={}){
 const order={id:1794399349735,client:'Dell',orderNumber:43,qty:240};
 const row={module:'orders',entity_id:String(order.id),data:order,revision:1,updated_at:'2026-11-11T12:15:52Z',deleted_at:null};
 let reads=0;
 const local=opts.local===false?[]:[JSON.parse(JSON.stringify(order))];
 if(opts.different&&local.length)local[0].qty=241;
 const db={orders:local};
 const doc={
  getElementById:id=>id==='appShell'?{}:id==='loginScreen'?{}:null,
  querySelector:s=>s==='#appShell .page.active'?{id:'pedidos'}:null,
  querySelectorAll:()=>opts.visible===false?[]:[{querySelector:x=>x==='td'?{textContent:'43'}:null}],
  addEventListener:()=>{},activeElement:null
 };
 const win={addEventListener:()=>{},cloudRequest:async(path,init)=>{
  assert.match(path,/module=eq.orders/);assert.equal(init.method,'GET');reads++;return [row]
 },hlgbWalIdbGuard9536:{probe:async()=>({}),status:()=>({readFailed:false})},
 hlgbRecordPendingIdentitySet9535:()=>new Set(opts.pending?['orders::'+order.id]:[]),
 hlgbSyncRecovery9301:{version:'95.36',pending:()=>({records:0,wal:0})}};
 const ctx={window:win,document:doc,navigator:{onLine:true,userAgent:'Mozilla/5.0 Chrome/120.0'},
 db,Date,JSON,Math,Set,Array,String,Error,setTimeout:()=>0,setInterval:()=>0,
 getComputedStyle:()=>({display:'none'}),console,Blob:function(){}};
 vm.runInNewContext(src,ctx);
 return {win,reads:()=>reads};
}
test('confirmed cloud, local, DOM-visible order has all evidence',async()=>{
 const {win,reads}=run();
 const report=await win.hlgbOrderDeliveryTrace9539.verify('43',true);
 assert.equal(reads(),1);assert.equal(report.results.length,1);
 assert.equal(report.results[0].localMatch,true);
 assert.equal(report.results[0].visible,true);
 assert.equal(report.results[0].cloudPresent,true);
});
test('cloud exists but local missing is reported, not silently repaired',async()=>{
 const {win}=run({local:false,visible:false});
 const report=await win.hlgbOrderDeliveryTrace9539.verify('',true);
 assert.equal(report.results[0].localPresent,false);
 assert.equal(report.results[0].visible,false);
});
test('inconsistent local version and WAL warning remain visible',async()=>{
 const {win}=run({different:true,pending:true});
 const report=await win.hlgbOrderDeliveryTrace9539.verify('43',true);
 assert.equal(report.results[0].localPresent,true);
 assert.equal(report.results[0].localMatch,false);
 assert.equal(report.results[0].pending,'sim');
});
test('no business mutations, JWTs, e-mails or order contents in report',async()=>{
 const {win}=run();
 await win.hlgbOrderDeliveryTrace9539.verify('43',true);
 const report=JSON.stringify(win.hlgbOrderDeliveryTrace9539.report());
 assert.equal(report.includes('Dell'),false);
 assert.equal(report.includes('qty'),false);
 assert.equal(report.includes('token'),false);
});
