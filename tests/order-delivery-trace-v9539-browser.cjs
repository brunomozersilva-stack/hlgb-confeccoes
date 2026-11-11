'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { chromium,webkit }=require('playwright');
const which=process.env.HLGB_BROWSER||'chromium';
const engine=which==='webkit'?webkit:chromium;
test('real '+which+' browser: cloud → local → table, mismatch and pending are visible without writes',async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html><body>'+
   '<div id="loginScreen" style="display:none"></div><div id="appShell">'+
   '<div class="page active" id="pedidos">'+
   '<div id="orderFilterSummary"></div>'+
   '<table id="ordersTable"><tbody><tr><td>43</td><td>Dell</td></tr></tbody></table>'+
   '</div></div></body></html>');
  await page.evaluate(()=>{
   window.db={orders:[{id:1794399349735,orderNumber:43,qty:240}]};
   window.__queries=[];
   window.cloudRequest=async(path,init)=>{
    window.__queries.push({path,method:init.method});
    return [{module:'orders',entity_id:'1794399349735',revision:1,
     deleted_at:null,updated_at:'2026-11-11T12:15:52Z',
     data:{id:1794399349735,orderNumber:43,qty:240}}];
   };
   window.hlgbWalIdbGuard9536={probe:async()=>({}),status:()=>({readFailed:false})};
   window.hlgbRecordPendingIdentitySet9535=()=>new Set();
  });
  await page.addScriptTag({path:'release-order-delivery-trace-v9539.js'});
  const first=await page.evaluate(()=>window.hlgbOrderDeliveryTrace9539.verify('43',true));
  assert.equal(first.results.length,1);
  assert.equal(first.results[0].localMatch,true);
  assert.equal(first.results[0].visible,true);
  assert.equal(await page.locator('#hlgbOrderDeliveryTrace9539').count(),1);
  const bad=await page.evaluate(()=>{
   window.db.orders[0].qty=241;
   window.hlgbRecordPendingIdentitySet9535=()=>new Set(['orders::1794399349735']);
   return window.hlgbOrderDeliveryTrace9539.verify('43',true);
  });
  assert.equal(bad.results[0].localPresent,true);
  assert.equal(bad.results[0].localMatch,false);
  assert.equal(bad.results[0].pending,'sim');
  assert.ok(await page.locator('#hlgbOrderTraceStatus9539').innerText().then(x=>x.includes('DIVERGENTE')));
  const commands=await page.evaluate(()=>window.__queries);
  assert.ok(commands.length>=2);
  assert.ok(commands.every(x=>x.method==='GET'&&x.path.includes('module=eq.orders')));
 }finally{await browser.close()}
});
