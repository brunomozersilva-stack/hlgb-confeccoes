const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&!!window.hlgbLoginConfirmGate9407,null,{timeout:60000});
 const blocked=await page.evaluate(()=>{
  const l=document.getElementById('loginScreen'),a=document.getElementById('appShell'),s=document.getElementById('sessionLoader');
  /* Simula o que o sistema real faz quando recupera uma sessão válida por baixo do gate. */
  window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));
  l.style.display='none';a.style.display='block';if(s)s.style.display='block';
  return {login:getComputedStyle(l).display,app:getComputedStyle(a).display,loader:s?getComputedStyle(s).display:null,gate:window.hlgbLoginConfirmGate9407.status()};
 });
 if(blocked.login==='none'||blocked.app!=='none')throw new Error('Sessão restaurada abriu sem gesto: '+JSON.stringify(blocked));
 if(!blocked.gate.authenticatedObserved&&!blocked.gate.authReady)throw new Error('Gate não reconheceu autenticação restaurada: '+JSON.stringify(blocked));
 const enter=page.locator('#loginScreen button').filter({hasText:/Entrar/i}).first();
 if(await enter.count()===0)throw new Error('Botão Entrar não localizado');
 await enter.click();
 await page.waitForFunction(()=>window.hlgbLoginConfirmGate9407?.status?.().confirmed===true,null,{timeout:5000});
 await page.waitForFunction(()=>getComputedStyle(document.getElementById('appShell')).display!=='none',null,{timeout:5000});
 const released=await page.evaluate(()=>({login:getComputedStyle(document.getElementById('loginScreen')).display,app:getComputedStyle(document.getElementById('appShell')).display,gate:window.hlgbLoginConfirmGate9407.status()}));
 if(released.app==='none'||released.login!=='none')throw new Error('Gesto explícito não liberou sessão já autenticada: '+JSON.stringify(released));
 if(!released.gate.releaseReason)throw new Error('Gate não registrou razão segura para liberar sessão: '+JSON.stringify(released));
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.hlgbLoginConfirmGate9407&&!!document.getElementById('loginScreen')&&!!document.getElementById('appShell'),null,{timeout:60000});
 const reset=await page.evaluate(()=>window.hlgbLoginConfirmGate9407.status());
 if(reset.confirmed)throw new Error('Gate persistiu entre aberturas; deveria exigir novo Enter/clique');
 await page.waitForFunction(()=>!!window.hlgbLogin3dBaseline9407&&!!window.save3dSettings9400?.__hlgb3dFreshBase9407&&!!window.hlgbBusinessExpansion9400,null,{timeout:60000});
 const result=await page.evaluate(async()=>{
  window.hlgbLoginConfirmGate9407.confirm();
  const order=[];let saved=null,loadOpts=null;
  const remoteUpdated='2026-10-25T18:42:59.226Z',pendingCreated='2026-10-25T19:45:57.000Z';
  const remoteData={id:'settings-main',updatedAt:'2026-10-25T18:42:58.880Z',filamentPriceKg:115,machineHourRate:1.25,cleaningUnitCost:1,defaultMultiplier:2};
  const stale={key:'printer3dSettings|settings-main',opId:'op-stale-3d',module:'printer3dSettings',id:'settings-main',deleted:false,data:{...remoteData,filamentPriceKg:120,updatedAt:'2026-10-25T21:05:17.000Z'},createdAt:pendingCreated,updatedAt:'2026-10-25T21:05:17.000Z',attempts:340,lastAttemptAt:'2026-10-25T21:05:17.000Z',lastError:'Conflito de edição: outra sessão alterou o mesmo campo (filamentPriceKg).',state:'conflict',clientVersion:'91.55',baseData:null,baseUpdatedAt:''};
  const unsafe={key:'printer3dSettings|unsafe-test',opId:'op-unsafe',module:'printer3dSettings',id:'unsafe-test',deleted:false,data:{id:'unsafe-test',filamentPriceKg:200},createdAt:'2026-10-25T18:00:00.000Z',updatedAt:'2026-10-25T18:00:00.000Z',attempts:1,lastError:'conflito',state:'conflict',clientVersion:'91.55',baseData:null,baseUpdatedAt:''};
  localStorage.setItem('hlgb_durable_wal_v1',JSON.stringify({schema:1,updatedAt:new Date().toISOString(),entries:{[stale.key]:stale,[unsafe.key]:unsafe}}));
  if(typeof idbPut955==='function'){await idbPut955(stale);await idbPut955(unsafe)}
  if(!(hlgbRecordSnapshots.printer3dSettings instanceof Map))hlgbRecordSnapshots.printer3dSettings=new Map();
  window.alert=()=>{};
  window.cloudEnsureFreshSession=async()=>{order.push('session');return true};
  window.hlgbRecordLoadBundle=async opts=>{
   order.push('load');loadOpts=opts;
   hlgbRecordSnapshots.printer3dSettings.set('settings-main',{module:'printer3dSettings',entity_id:'settings-main',data:{...remoteData},updated_at:remoteUpdated,deleted_at:null,revision:1});
   hlgbRecordSnapshots.printer3dSettings.set('unsafe-test',{module:'printer3dSettings',entity_id:'unsafe-test',data:{id:'unsafe-test',filamentPriceKg:150},updated_at:'2026-10-25T19:00:00.000Z',deleted_at:null,revision:2});
   return {rows:[{module:'printer3dSettings',entity_id:'settings-main'}]};
  };
  window.hlgbRecordSaveWithRetry=async(module,id,data)=>{order.push('save');saved={module,id,data};return {applied:true,data:{...data},revision:2,updated_at:new Date().toISOString()}};
  /* O módulo cria a página/host durante install(); render3dHome sozinho é propositalmente
     no-op quando a página 3D ainda não foi instalada. Reproduza o fluxo real. */
  const installed=window.hlgbBusinessExpansion9400.install();
  if(!installed)throw new Error('Módulo 3D não conseguiu instalar a página real');
  const nav=document.getElementById('p3HomeNav9400');
  if(!nav)throw new Error('Navegação da Impressora 3D não foi criada');
  nav.click();
  const input=document.getElementById('p3sFil9400');if(!input)throw new Error('Campo de filamento não renderizou após abrir a Visão geral 3D');input.value='123.45';
  await window.save3dSettings9400();
  const walAfter=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'{}');
  const repaired=walAfter?.entries?.['printer3dSettings|settings-main']||null;
  const unsafeResult=await window.hlgbLogin3dBaseline9407.repairMissingWalBaseline('printer3dSettings','unsafe-test');
  const walFinal=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'{}');
  const unsafeAfter=walFinal?.entries?.['printer3dSettings|unsafe-test']||null;
  const idb=typeof idbAll955==='function'?await idbAll955():[];
  return {order,saved,loadOpts,status:window.hlgbLogin3dBaseline9407.status(),pageActive:document.getElementById('printer3dHome9400')?.classList.contains('active')||false,repaired,unsafeResult,unsafeAfter,idbRepaired:idb.find(x=>x?.key==='printer3dSettings|settings-main')||null};
 });
 const li=result.order.indexOf('load'),si=result.order.indexOf('save');
 if(li<0||si<0||li>si)throw new Error('3D salvou antes de atualizar a base: '+JSON.stringify(result));
 if(result.loadOpts?.preserveLocal!==true||result.loadOpts?.since!==null)throw new Error('Carga 3D não preserva edição local/base completa: '+JSON.stringify(result.loadOpts));
 if(Number(result.saved?.data?.filamentPriceKg)!==123.45)throw new Error('Valor digitado não chegou ao save protegido: '+JSON.stringify(result.saved));
 if(!result.pageActive)throw new Error('Fluxo real não ativou a página da Impressora 3D');
 if(result.status?.version!=='94.08'||!result.status?.walRepairInstalled)throw new Error('Reparo v94.08 não está ativo: '+JSON.stringify(result.status));
 if(!result.repaired||Number(result.repaired?.baseData?.filamentPriceKg)!==115||!result.repaired?.baseUpdatedAt)throw new Error('Pendência antiga não recebeu baseline remoto seguro: '+JSON.stringify(result.repaired));
 if(Number(result.repaired?.attempts)!==340||result.repaired?.state!=='conflict')throw new Error('Reparo alterou histórico/estado antes do novo enqueue: '+JSON.stringify(result.repaired));
 if(!result.idbRepaired||Number(result.idbRepaired?.baseData?.filamentPriceKg)!==115)throw new Error('IndexedDB não recebeu o mesmo baseline reparado: '+JSON.stringify(result.idbRepaired));
 if(result.unsafeResult?.repaired!==false||result.unsafeResult?.reason!=='remote-newer-than-pending'||result.unsafeAfter?.baseData!==null)throw new Error('Conflito real foi rebaseado indevidamente: '+JSON.stringify({unsafeResult:result.unsafeResult,unsafeAfter:result.unsafeAfter}));
 if(errors.length)throw new Error('Erros WebKit: '+errors.join(' | '));
 console.log('LOGIN_3D_V9408_WEBKIT_OK',{blocked,released,reset,order:result.order,value:result.saved.data.filamentPriceKg,pageActive:result.pageActive,repair:result.status.lastResult?.repair,unsafe:result.unsafeResult});
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
