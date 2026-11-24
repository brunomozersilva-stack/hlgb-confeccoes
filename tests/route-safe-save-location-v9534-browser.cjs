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
  // Reproduce the reported case with anonymized fixture IDs: assignments exist
  // remotely, but the browser still holds only an older production snapshot.
  const edit=await fixture();
  try{
   await edit.evaluate(()=>{
    db.factionMasters.push({id:'cris',name:'Cris'});
    db.products.push({id:'mayte',name:'Calcinha Mayte'},{id:'tatielly',name:'Calcinha Tatielly'});
    db.orders.push({id:'ord55',orderNumber:55},{id:'ord54',orderNumber:54});
    db.routePlans.push({id:'route-existing',date:'2026-11-24',driver:'Motorista',status:'Planejada',notes:'Preservar observação',stops:[{order:1,type:'Facção',locationId:'cris',name:'Cris',carry:['Conferir etiquetas'],pickup:[],routeItems:[]},{order:2,type:'Facção',locationId:'lu',name:'Luana',carry:[],pickup:[],routeItems:[]}]});
    const original=window.cloudRequest;window.cloudRequest=async(path,opts)=>{
     if(path.includes('module=eq.production')){
      if(opts?.method!=='GET'||!path.includes('=eq.cris'))throw Error('Unexpected scoped query');
      return [{entity_id:'p-m',deleted_at:null,data:{id:'p-m',factionId:'cris',productId:'mayte',orderId:'ord55',product:'Calcinha Mayte',planned:480,done:0,stage:'Em produção'}},{entity_id:'p-t',deleted_at:null,data:{id:'p-t',factionId:'cris',productId:'tatielly',orderId:'ord54',product:'Calcinha Tatielly',planned:360,done:0,stage:'Em produção'}}];
     }return original(path,opts);
    };
    window.__routeBefore=JSON.stringify(db.production);window.editRoute9249('route-existing');
   });
   const stop=edit.locator('.ops-route-stop').first();
   assert.equal(await stop.locator('.ops-route-carry').inputValue(),'Conferir etiquetas');
   await stop.getByRole('button',{name:'Atualizar modelos da nuvem'}).click();
   await stop.getByText('2 modelo(s) novo(s) incluído(s)',{exact:false}).waitFor();
   const carry=await stop.locator('.ops-route-carry').inputValue();assert.match(carry,/Pedido #55 — Calcinha Mayte — 480 pç/);assert.match(carry,/Pedido #54 — Calcinha Tatielly — 360 pç/);assert.match(carry,/Conferir etiquetas/);
   await stop.getByRole('button',{name:'Atualizar modelos da nuvem'}).click();await stop.getByText('0 modelo(s) novo(s)',{exact:false}).waitFor();
   assert.equal(await stop.locator('.ops-route-carry').inputValue(),carry);
   const mayte=stop.locator('[data-route-item9249]').filter({hasText:'Calcinha Mayte'}),tatielly=stop.locator('[data-route-item9249]').filter({hasText:'Calcinha Tatielly'});
   await mayte.getByRole('button',{name:'Retirar da rota'}).click();await tatielly.getByRole('button',{name:'BUSCAR'}).click();
   assert.doesNotMatch(await stop.locator('.ops-route-carry').inputValue(),/Mayte|Tatielly/);assert.match(await stop.locator('.ops-route-pickup').inputValue(),/Tatielly/);await stop.getByRole('button',{name:'Atualizar modelos da nuvem'}).click();await stop.getByText('0 modelo(s) novo(s)',{exact:false}).waitFor();assert.doesNotMatch(await stop.locator('.ops-route-carry').inputValue(),/Mayte|Tatielly/);
   await mayte.getByRole('button',{name:'LEVAR'}).click();
   await stop.getByRole('button',{name:'Descer parada'}).click();
   assert.equal(await edit.locator('.ops-route-stop').nth(1).locator('.ops-route-carry').inputValue(),'Conferir etiquetas\nPedido #55 — Calcinha Mayte — 480 pç');
   await edit.evaluate(()=>window.modalSave());
   const result=await edit.evaluate(()=>({routes:db.routePlans,sent:window.__sentRouteRows,unchanged:JSON.stringify(db.production)===window.__routeBefore}));
   assert.equal(result.routes.length,1);assert.equal(result.sent.length,1);assert.equal(result.sent[0].id,'route-existing');assert.equal(result.sent[0].stops[1].name,'Cris');assert.equal(result.sent[0].notes,'Preservar observação');assert.equal(result.unchanged,true);
   console.log('PASS '+kind+' — existing route edit, scoped current assignments, no duplicate, no production writes');
  }finally{await edit.close()}
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
