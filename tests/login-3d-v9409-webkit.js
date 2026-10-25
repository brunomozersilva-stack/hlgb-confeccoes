const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.hlgbLogin3dBaseline9407&&!!window.hlgbBusinessExpansion9400&&!!window.save3dSettings9400?.__hlgb3dFreshBase9409,null,{timeout:60000});
 const result=await page.evaluate(async()=>{
  const order=[];let saved=null,snapshotAtSave=null;
  const openWalDb=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('hlgb_durable_wal',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('entries'))r.result.createObjectStore('entries',{keyPath:'key'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const walDbPut=async entry=>{const d=await openWalDb();try{await new Promise((resolve,reject)=>{const tx=d.transaction('entries','readwrite');tx.objectStore('entries').put(JSON.parse(JSON.stringify(entry)));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{d.close()}};
  const walDbAll=async()=>{const d=await openWalDb();try{return await new Promise((resolve,reject)=>{const tx=d.transaction('entries','readonly'),r=tx.objectStore('entries').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}finally{d.close()}};
  const remoteUpdated='2026-10-25T18:42:59.226Z',pendingCreated='2026-10-25T19:45:57.699Z';
  const remoteData={id:'settings-main',updatedAt:'2026-10-25T18:42:58.880Z',filamentPriceKg:115,machineHourRate:1.25,cleaningUnitCost:1,defaultMultiplier:2};
  const stale={key:'printer3dSettings|settings-main',opId:'op-real-3d',module:'printer3dSettings',id:'settings-main',deleted:false,data:{...remoteData,filamentPriceKg:120,updatedAt:'2026-10-25T21:30:46.941Z'},createdAt:pendingCreated,updatedAt:'2026-10-25T21:30:46.941Z',attempts:430,lastAttemptAt:'2026-10-25T21:31:14.481Z',lastError:'Conflito de edição: outra sessão alterou o mesmo campo (filamentPriceKg).',state:'pending',clientVersion:'91.55',baseData:null,baseUpdatedAt:''};
  const unsafe={key:'printer3dSettings|unsafe-test',opId:'op-unsafe',module:'printer3dSettings',id:'unsafe-test',deleted:false,data:{id:'unsafe-test',filamentPriceKg:200},createdAt:'2026-10-25T18:00:00.000Z',updatedAt:'2026-10-25T18:00:00.000Z',attempts:1,lastError:'conflito',state:'conflict',clientVersion:'91.55',baseData:null,baseUpdatedAt:''};
  localStorage.setItem('hlgb_durable_wal_v1',JSON.stringify({schema:1,updatedAt:new Date().toISOString(),entries:{[stale.key]:stale,[unsafe.key]:unsafe}}));
  await walDbPut(stale);await walDbPut(unsafe);
  hlgbRecordSnapshots.printer3dSettings=new Map();
  window.cloudEnsureFreshSession=async()=>{order.push('session');return true};
  window.hlgbRecordLoadBundle=async()=>{order.push('load');return {modules:['printer3dSettings','printer3dProducts','printer3dSales'],rows:[
    {module:'printer3dSettings',entity_id:'settings-main',data:{...remoteData},updated_at:remoteUpdated,deleted_at:null,revision:1,updated_by:null},
    {module:'printer3dSettings',entity_id:'unsafe-test',data:{id:'unsafe-test',filamentPriceKg:150},updated_at:'2026-10-25T19:00:00.000Z',deleted_at:null,revision:2,updated_by:null},
    {module:'printer3dProducts',entity_id:'product-1',data:{id:'product-1',name:'Teste 3D'},updated_at:'2026-10-25T18:30:00.000Z',deleted_at:null,revision:3,updated_by:null},
    {module:'printer3dSales',entity_id:'sale-1',data:{id:'sale-1',total:10},updated_at:'2026-10-25T18:31:00.000Z',deleted_at:null,revision:4,updated_by:null}
  ]}};
  window.alert=()=>{};
  await window.hlgbLogin3dBaseline9407.refresh3dBase();
  const settingsSnap=hlgbRecordSnapshots.printer3dSettings?.get('settings-main')||null;
  const productSnap=hlgbRecordSnapshots.printer3dProducts?.get('product-1')||null;
  const saleSnap=hlgbRecordSnapshots.printer3dSales?.get('sale-1')||null;
  const walAfterRefresh=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'{}');
  const repaired=walAfterRefresh?.entries?.['printer3dSettings|settings-main']||null;
  const unsafeResult=await window.hlgbLogin3dBaseline9407.repairMissingWalBaseline('printer3dSettings','unsafe-test');
  window.hlgbRecordSaveWithRetry=async(module,id,data)=>{order.push('save');snapshotAtSave=JSON.parse(JSON.stringify(hlgbRecordSnapshots[module]?.get(String(id))||null));saved={module,id,data:JSON.parse(JSON.stringify(data))};return {applied:true,data:{...data},revision:2,updated_at:new Date().toISOString()}};
  window.hlgbBusinessExpansion9400.install();
  document.getElementById('p3HomeNav9400')?.click();
  const input=document.getElementById('p3sFil9400');if(!input)throw new Error('Campo de filamento não renderizou');input.value='123.45';
  await window.save3dSettings9400();
  const idb=await walDbAll();
  return {order,saved,snapshotAtSave,settingsSnap,productSnap,saleSnap,repaired,unsafeResult,idbRepaired:idb.find(x=>x?.key==='printer3dSettings|settings-main')||null,status:window.hlgbLogin3dBaseline9407.status()};
 });
 if(result.status?.version!=='94.09'||!result.status?.snapshotHydrationInstalled)throw new Error('v94.09 não instalada: '+JSON.stringify(result.status));
 if(Number(result.settingsSnap?.revision)!==1||Number(result.settingsSnap?.data?.filamentPriceKg)!==115)throw new Error('Snapshot settings não foi hidratado da linha remota: '+JSON.stringify(result.settingsSnap));
 if(Number(result.productSnap?.revision)!==3||Number(result.saleSnap?.revision)!==4)throw new Error('Snapshots produtos/vendas 3D não foram hidratados: '+JSON.stringify({product:result.productSnap,sale:result.saleSnap}));
 if(Number(result.repaired?.baseData?.filamentPriceKg)!==115||Number(result.repaired?.attempts)!==430||!result.repaired?.baseUpdatedAt)throw new Error('WAL real não recebeu baseline seguro: '+JSON.stringify(result.repaired));
 if(Number(result.idbRepaired?.baseData?.filamentPriceKg)!==115)throw new Error('IndexedDB não recebeu baseline reparado: '+JSON.stringify(result.idbRepaired));
 if(result.unsafeResult?.repaired!==false||result.unsafeResult?.reason!=='remote-newer-than-pending')throw new Error('Conflito real foi rebaseado: '+JSON.stringify(result.unsafeResult));
 if(Number(result.snapshotAtSave?.revision)!==1)throw new Error('Save iniciou sem revisão remota 1: '+JSON.stringify(result.snapshotAtSave));
 if(Number(result.saved?.data?.filamentPriceKg)!==123.45)throw new Error('Novo preço não chegou ao save: '+JSON.stringify(result.saved));
 if(result.order.indexOf('load')<0||result.order.indexOf('save')<0||result.order.indexOf('load')>result.order.indexOf('save'))throw new Error('Save ocorreu antes da leitura: '+JSON.stringify(result.order));
 if(errors.length)throw new Error('Erros WebKit: '+errors.join(' | '));
 console.log('LOGIN_3D_V9409_WEBKIT_OK',JSON.stringify({order:result.order,snapshotRevision:result.snapshotAtSave.revision,repairedAttempts:result.repaired.attempts,value:result.saved.data.filamentPriceKg,hydration:result.status.lastHydration}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
