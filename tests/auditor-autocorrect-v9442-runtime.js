const {webkit,chromium}=require('playwright');
const kind=process.env.HLGB_BROWSER||'webkit',engine=kind==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbLoginConfirmGate9407?.prepareAuditorRepairs9442==='function',null,{timeout:60000});
 const before=await page.evaluate(()=>({ack:!!window.hlgbAckReconcile9436,production:!!window.hlgbProductionReconcile9439,rapid:!!window.hlgbAuditorRapid9437,finalizer:!!window.hlgbAuditorFinalize9439,auto:!!window.hlgbAuditorAutoCorrect9442}));
 if(before.ack||before.production||before.rapid||before.finalizer||before.auto)throw new Error('Reparadores/autocorretor carregaram antes da autenticação '+JSON.stringify(before));
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}});
 const prep=await page.evaluate(()=>window.hlgbLoginConfirmGate9407.prepareAuditorRepairs9442('v9442-runtime-test',15000));
 if(!prep?.ok||prep.missing?.length)throw new Error('Gate não preparou reparadores reais '+JSON.stringify(prep));
 await page.waitForFunction(()=>window.HLGB_AUDITOR_AUTOCORRECT_9442==='94.42'&&typeof window.hlgbAuditorAutoCorrect9442?.run==='function',null,{timeout:20000});
 const real=await page.evaluate(()=>({
  ack:{version:window.hlgbAckReconcile9436?.version,install:typeof window.hlgbAckReconcile9436?.install},
  production:{version:window.hlgbProductionReconcile9439?.version,patch:window.hlgbProductionReconcile9439?.patch,reconcile:typeof window.hlgbProductionReconcile9439?.reconcile,candidates:typeof window.hlgbProductionReconcile9439?.candidates},
  rapid:{version:window.hlgbAuditorRapid9437?.version,heal:typeof window.hlgbAuditorRapid9437?.heal},
  finalizer:{version:window.hlgbAuditorFinalize9439?.version,install:typeof window.hlgbAuditorFinalize9439?.install},
  autocorrect:{version:window.hlgbAuditorAutoCorrect9442?.version,status:window.hlgbAuditorAutoCorrect9442?.status?.()},
  gate:window.hlgbLoginConfirmGate9407?.status?.()
 }));
 if(real.ack.version!=='94.36'||real.ack.install!=='function')throw new Error('ACK real indisponível '+JSON.stringify(real.ack));
 if(real.production.version!=='94.39'||real.production.patch!=='94.42-safe-proof'||real.production.reconcile!=='function'||real.production.candidates!=='function')throw new Error('Produção real/patch indisponível '+JSON.stringify(real.production));
 if(real.rapid.version!=='94.37'||real.rapid.heal!=='function')throw new Error('Rapid real indisponível '+JSON.stringify(real.rapid));
 if(real.finalizer.version!=='94.39'||real.finalizer.install!=='function')throw new Error('Finalizador real indisponível '+JSON.stringify(real.finalizer));
 if(!real.autocorrect.status?.preparation?.ready)throw new Error('Autocorretor 94.42 não confirmou dependências '+JSON.stringify(real.autocorrect));
 const conservative=await page.evaluate(()=>{
  const api=window.hlgbProductionReconcile9439,id='safe-9442',base={id,op:'PED-9442',date:'2026-11-01',done:0,size:'',color:'',cutId:'cut-9442',stage:'Aguardando',client:'Teste',orderId:'order-9442',planned:10,product:'Produto',factionId:null,productId:'prod-9442',cutProductKey:'cut-9442:prod-9442',assignmentSource:true,productionLocationId:null,assignedAt:'',sentToFactionAt:''};
  return {
   extraDifferent:api.productionEquivalent({...base,notes:'A'},{...base,notes:'B'}),
   missingRevision:api.staleOperationSatisfied({module:'production',entity_id:id,data:base,deleted_at:null,revision:0,updated_at:new Date().toISOString()},base,base,new Date().toISOString(),id,false),
   wrongIdentity:api.staleOperationSatisfied({module:'production',entity_id:'other',data:base,deleted_at:null,revision:3,updated_at:new Date().toISOString()},base,base,new Date().toISOString(),id,false),
   valid:api.staleOperationSatisfied({module:'production',entity_id:id,data:base,deleted_at:null,revision:3,updated_at:new Date().toISOString()},base,base,new Date().toISOString(),id,false)
  };
 });
 if(conservative.extraDifferent!==false)throw new Error('Produção ainda ignora campo de negócio desconhecido '+JSON.stringify(conservative));
 if(conservative.missingRevision?.ok!==false||conservative.missingRevision?.reason!=='server-revision-missing')throw new Error('Produção ainda aceita prova sem revisão '+JSON.stringify(conservative));
 if(conservative.wrongIdentity?.ok!==false||conservative.wrongIdentity?.reason!=='server-identity-mismatch')throw new Error('Produção ainda aceita identidade remota errada '+JSON.stringify(conservative));
 if(conservative.valid?.ok!==true)throw new Error('Prova remota válida foi rejeitada '+JSON.stringify(conservative));
 await page.waitForFunction(()=>typeof window.openHlgbAuditor==='function',null,{timeout:15000});
 await page.evaluate(()=>{window.openHlgbAuditor();window.hlgbAuditorSingleUiReclaim9434A?.heal?.('v9442-runtime')});
 await page.waitForFunction(()=>{const b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!b)return false;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&!b.disabled&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0},null,{timeout:15000});
 const visible=await page.evaluate(()=>{const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return !e.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const h=document.querySelector('.hlgb-auditor-actions');return h?[...h.querySelectorAll(':scope>button')].filter(vis).map(x=>x.id):[]});
 if(visible.length!==1||visible[0]!=='hlgbAuditorUnifiedRun9434A')throw new Error('Auditor não ficou com um único botão '+JSON.stringify(visible));
 if(errors.some(x=>/9442|autocorrect|production-reconcile/i.test(x)))throw new Error('pageerror v94.42 '+errors.join(' | '));
 console.log('AUDITOR_AUTOCORRECT_V9442_RUNTIME_'+kind.toUpperCase()+'_OK',JSON.stringify({prep,real,conservative,visible}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
