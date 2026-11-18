/* Transporte de homologação: carregado somente pelo servidor local, nunca na página estática. */
(function(){
 'use strict';
 const NAME='HLGB_INTEGRADO_REMOTO_FICTICIO_V1';
 let db,actor,pending=null,permissions=null;
 const request=async(url,method='GET',data)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);try{const r=await fetch(url,{signal:controller.signal,method,credentials:'same-origin',cache:'no-store',headers:method==='POST'?{'content-type':'application/json','x-hlgb-integrado':'1'}:{},...(method==='POST'?{body:JSON.stringify(data)}:{})});const v=await r.json();if(!r.ok||v.status==='denied'||v.status==='uncertain')throw Error(v.message||'Prova remota inconclusiva');return v;}finally{clearTimeout(timer);}};
 const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('wal',{keyPath:'actor'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('WAL bloqueado'));});
 const tx=(mode,fn)=>new Promise((resolve,reject)=>{const t=db.transaction('wal',mode),store=t.objectStore('wal');let val;const set=x=>val=x;try{fn(store,set,t);}catch(e){t.abort();reject(e);}t.oncomplete=()=>resolve(val);t.onabort=()=>reject(t.error||Error('WAL abortado'));t.onerror=()=>reject(t.error||Error('WAL indisponível'));});
 const load=()=>tx('readonly',(s,set)=>{const r=s.get(actor);r.onsuccess=()=>set(r.result||null);});
 async function claim(command){const entry={actor,command,stage:'pending'};await tx('readwrite',(s,set,t)=>{const g=s.get(actor);g.onsuccess=()=>{if(g.result){t.abort();return;}s.add(entry);set(entry);};});pending=entry;return entry;}
 async function stage(entry,value){await tx('readwrite',(s,set,t)=>{const g=s.get(actor);g.onsuccess=()=>{if(g.result?.command.commandId!==entry.command.commandId){t.abort();return;}s.put({...entry,stage:value});};});pending={...entry,stage:value};}
 async function clear(entry){await tx('readwrite',(s,set,t)=>{const g=s.get(actor);g.onsuccess=()=>{if(g.result?.command.commandId!==entry.command.commandId){t.abort();return;}s.delete(actor);};});pending=null;}
 async function state(){
 const production=permissions?.id==='demo-production',r=await request(production?'/api/production-state':'/api/state');
 if(r.status!=='ok')throw Error('Estado remoto inválido');
 if(production){
  const v=r.state;
  if(v?.schema!=='hlgb-evolucao-operacao-producao-ficticia-v1'||v.readScope!=='production_only_ficticio'||!Number.isSafeInteger(v.revision)||
   !['clients','products','factions','orders','cutPlans'].every(k=>Array.isArray(v[k]))||
   ['finance','employees','log','payroll','settlements','paymentBatches','suppliers'].some(k=>Object.hasOwn(v,k)))
    throw Error('Visão de produção fora do contrato de isolamento');
  return v;
 }
 if(r.state?.schema!=='hlgb-evolucao-operacao-ficticia-v1'||!window.HLGBOperationalLab.inspect(r.state).ok)throw Error('Snapshot administrativo inválido');
 return r.state;
}
 async function revision(){const v=await request('/api/revision');if(v.status!=='ok'||!Number.isSafeInteger(v.revision)||v.revision<1)throw Error('Revisão remota inválida');return v.revision;}
 async function init(){const s=await request('/api/session');if(s.environment!=='HLGB-INTEGRADO-FICTICIO')throw Error('Ambiente proibido');actor=s.actor;permissions=s.permissions;if(!Array.isArray(permissions?.allowedCommands)||permissions.productionApproval!==false)throw Error('Permissões fictícias inválidas');db=await open();pending=await load();return state();}
 async function prove(entry){const r=await request('/api/proof','POST',entry.command);
 if(r.status==='readback_confirmed'){
 const latest=await state();
 if(r.revision!==entry.command.expectedRevision+1||latest.revision<r.revision)throw Error('Prova não corresponde à revisão do comando local');
 if(permissions?.id!=='demo-production'){
  const ev=latest.log.find(x=>x.commandId===entry.command.commandId);
  if(!ev||ev.type!==entry.command.type||ev.actor!==actor||ev.revision!==r.revision)throw Error('Prova não corresponde ao comando local');
 }
 // Para produção, /api/proof comprova no servidor fingerprint + ator + evento,
 // e a visão restrita apenas confirma a revisão; nunca revelar o log completo.
 await clear(entry);return {status:'confirmed',state:latest,result:r.result};}
 if(r.status==='cancelled'){await clear(entry);return {status:'discarded',state:await state()};}
 if(r.status==='not_found'){await stage(entry,'not_found');return {status:'not_found'};}
 throw Error('Prova inconclusiva: não repetir');}
 async function send(entry){const answer=await request('/api/commands','POST',entry.command);
 if(['committed','already_committed'].includes(answer.status))return prove(entry);
 if(['rejected','conflict'].includes(answer.status)){await stage(entry,answer.status);return {status:answer.status,message:answer.message,serverRevision:answer.serverRevision};}
 throw Error('Resposta inconclusiva');}
 async function submit(type,payload,revision){if(!permissions?.allowedCommands.includes(type))throw Error('O perfil fictício não autoriza este comando. Nenhuma intenção registrada.');pending=await load();if(pending)throw Error('Existe comando pendente. Confira a sincronização antes de novo lançamento.');
 const entry=await claim({commandId:'LAB-'+crypto.randomUUID(),type,payload,expectedRevision:revision});
 return send(entry);}
 async function reconcile(){pending=await load();if(!pending)return {status:'empty',state:await state()};return prove(pending);}
 async function retry(){pending=await load();if(!pending||pending.stage!=='not_found')throw Error('Releia antes de reenviar.');return send(pending);}
 async function discard(){pending=await load();if(!pending||!['conflict','rejected','not_found'].includes(pending.stage))throw Error('Não é permitido descartar operação sem conferência.');
 const entry=pending,result=await request('/api/cancel','POST',entry.command);
 if(result.status==='committed')return prove(entry);
 if(result.status!=='cancelled'||result.commandId!==entry.command.commandId)throw Error('Cancelamento não confirmado.');
 const proof=await request('/api/proof','POST',entry.command);
 if(proof.status!=='cancelled')throw Error('Cancelamento sem releitura.');
 await clear(entry);return {status:'discarded',state:await state()};}
 window.HLGBRemoteLab={init,state,revision,submit,reconcile,retry,discard,info:()=>({actor,pending,permissions}),load:async()=>{pending=await load();return pending;}};
})();
