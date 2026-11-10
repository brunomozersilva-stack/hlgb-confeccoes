'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const kind=process.env.HLGB_BROWSER||'chromium';
(async()=>{
 const browser=await ({chromium,webkit})[kind].launch({headless:true});
 try{
  async function fixture(mode='confirmed'){
   const page=await browser.newPage();
   await page.setContent('<!doctype html><html lang="pt-BR"><body><main id="appShell"></main><div id="modal"><div id="modalContent"></div></div></body></html>');
   await page.evaluate(mode=>{
    window.db={
     routePlans:[],
     factionMasters:[
      {id:'ro',name:'Roseli',address:'Itaocara',phone:'1111'},
      {id:'lu',name:'Luana',address:'Nova Friburgo',phone:'2222'}],
     productionLocations:[],capacityAssignments:[],
     products:[{id:'pr',name:'Robe Gabrielle'},{id:'pl',name:'Calcinha Penelope'}],
     orders:[{id:'ord1',orderNumber:37}],
     production:[
      {id:'prodRo',orderId:'ord1',factionId:'ro',productId:'pr',planned:100,done:0},
      {id:'prodLu',orderId:'ord1',factionId:'lu',productId:'pl',planned:50,done:0}
     ],
     labels:[],users:[]
    };
    window.__testRouteMode=mode;
    window.__sentRouteRows=[];
    window.__remoteRoute=null;
    window.__alerts=[];
    window.localSaveOnly=()=>{};
    window.cloudEnsureFreshSession=async()=>true;
    window.cloudAccessToken='testing';
    window.alert=msg=>window.__alerts.push(String(msg));
    window.openModal=(title,html,fn)=>{
     document.querySelector('#modalContent').innerHTML='<h2>'+title+'</h2>'+html;
     document.querySelector('#modal').classList.add('show');window.modalSave=fn;
    };
    window.closeModal=()=>{
     document.querySelector('#modal').classList.remove('show');window.modalSave=null;
    };
    window.hlgbAfterLogin=()=>{};
    window.hlgbRecordSaveWithRetry=async(module,id,row)=>{
     if(module!=='routePlans')throw Error('Unexpected module '+module);
     window.__sentRouteRows.push(JSON.parse(JSON.stringify(row)));
     if(window.__testRouteMode==='confirmed'){
      window.__remoteRoute=JSON.parse(JSON.stringify(row));
      return {applied:true,revision:1,data:JSON.parse(JSON.stringify(row))};
     }
     if(window.__testRouteMode==='commit_timeout'){
      window.__remoteRoute=JSON.parse(JSON.stringify(row));
     }
     const error=Object.assign(new Error('A nuvem demorou demais para responder ao POST.'),{code:'HLGB_CLOUD_TIMEOUT'});
     throw error;
    };
    window.cloudRequest=async(path,opts)=>{
     if(opts?.method!=='GET'||!path.includes('module=eq.routePlans'))throw Error('Unexpected network call '+path);
     return window.__remoteRoute?[{entity_id:String(window.__remoteRoute.id),data:JSON.parse(JSON.stringify(window.__remoteRoute)),revision:1,deleted_at:null}]:[];
    };
   },mode);
   await page.addScriptTag({path:'release-operations-pack.js'});
   await page.evaluate(()=>window.newRoute9249());
   return page;
  }
  const first=await fixture();
  try{
   await first.evaluate(()=>window.addRouteStop9249());
   assert.equal(await first.locator('.ops-route-loc').first().inputValue(),'','New stop must not implicitly pick Roseli');
   assert.equal(await first.locator('.ops-route-carry').first().inputValue(),'');
   assert.equal(await first.locator('.ops-route-pickup').first().inputValue(),'');
   const noWrite=await first.evaluate(async()=>{await window.modalSave();return {sent:window.__sentRouteRows.length,status:document.getElementById('opsRouteCloudStatus9534').textContent}});
   assert.equal(noWrite.sent,0,'Route without selected location cannot be saved');
   assert.match(noWrite.status,/Escolha a facção/);
   await first.locator('.ops-route-loc').first().selectOption('0');
   const r=await first.locator('.ops-route-carry').first().inputValue();
   assert.match(r,/Robe Gabrielle/);
   await first.evaluate(()=>window.addRouteStop9249());
   assert.equal(await first.locator('.ops-route-loc').nth(1).inputValue(),'','Next stop must also be empty');
   assert.equal(await first.locator('.ops-route-carry').nth(1).inputValue(),'');
   await first.locator('.ops-route-loc').nth(1).selectOption('1');
   const l=await first.locator('.ops-route-carry').nth(1).inputValue();
   assert.match(l,/Calcinha Penelope/);
   assert.doesNotMatch(l,/Robe Gabrielle/);
   await first.locator('.ops-route-carry').first().fill(r+'\nConferir etiquetas');
   await first.locator('.ops-route-loc').first().selectOption('1');
   const after=await first.locator('.ops-route-carry').first().inputValue();
   assert.doesNotMatch(after,/Robe Gabrielle/,'Changing location must clear old automatic Roseli products');
   assert.match(after,/Calcinha Penelope/);
   assert.match(after,/Conferir etiquetas/,'Manual notes must survive location change');
   assert.match(await first.locator('.ops-route-carry').nth(1).inputValue(),/Calcinha Penelope/,'Other stop unchanged');
   console.log('PASS '+kind+' — no implicit Roseli, independent stop and manual text safe');
  }finally{await first.close()}
  const timeout=await fixture('commit_timeout');
  try{
   await timeout.evaluate(()=>window.addRouteStop9249());
   await timeout.locator('.ops-route-loc').selectOption('1');
   await timeout.evaluate(()=>window.modalSave());
   const result=await timeout.evaluate(()=>({modalOpen:document.querySelector('#modal').classList.contains('show'),
    rows:window.db.routePlans,sent:window.__sentRouteRows,alerts:window.__alerts}));
   assert.equal(result.modalOpen,false,'POST timeout with matched GET is safe to confirm');
   assert.equal(result.rows.length,1);
   assert.equal(result.sent.length,1);
   assert.equal(result.rows[0].id,result.sent[0].id);
   assert.match(result.alerts.join(' '),/confirmada na nuvem/);
   console.log('PASS '+kind+' — timed-out POST confirmed by remote read without duplicate');
  }finally{await timeout.close()}
  const pending=await fixture('timeout_missing');
  try{
   await pending.evaluate(()=>window.addRouteStop9249());
   await pending.locator('.ops-route-loc').selectOption('1');
   await pending.evaluate(()=>window.modalSave());
   let st=await pending.evaluate(()=>({open:document.querySelector('#modal').classList.contains('show'),
    count:window.db.routePlans.length,sends:window.__sentRouteRows.length,notice:document.querySelector('#opsRouteCloudStatus9534').textContent}));
   assert.equal(st.open,true,'No remote proof: editor must remain open');
   assert.equal(st.count,0,'No false local confirmation');
   assert.equal(st.sends,1);
   assert.match(st.notice,/ainda não está confirmada/);
   await pending.evaluate(()=>{window.__remoteRoute=window.__sentRouteRows[0]});
   await pending.locator('#opsRouteVerify9534').click();
   st=await pending.evaluate(()=>({open:document.querySelector('#modal').classList.contains('show'),
    count:window.db.routePlans.length,sends:window.__sentRouteRows.length}));
   assert.equal(st.open,false);
   assert.equal(st.count,1);
   assert.equal(st.sends,1,'Explicit GET verification never performs a second POST');
   console.log('PASS '+kind+' — missing proof keeps editor; later GET confirms without write');
  }finally{await pending.close()}
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
