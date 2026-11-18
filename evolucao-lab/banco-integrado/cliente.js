/* Transporte de homologação: carregado somente pelo servidor local, nunca na página estática. */
(function(){
 'use strict';
 const NAME='HLGB_INTEGRADO_REMOTO_FICTICIO_V1';
 let db,actor,pending=null;
 const request=async(url,method='GET',data)=>{const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:method==='POST'?{'content-type':'application/json','x-hlgb-integrado':'1'}:{},...(method==='POST'?{body:JSON.stringify(data)}:{})});const v=await r.json();if(!r.ok||v.status==='denied'||v.status==='uncertain')throw Error(v.message||'Prova remota inconclusiva');return v;};
 const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('wal',{keyPath:'actor'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('WAL bloqueado'));});
 const tx=(mode,fn)=>new Promise((resolve,reject)=>{const t=db.transaction('wal',mode),store=t.objectStore('wal');let val;const set=x=>val=x;try{fn(store,set,t);}catch(e){t.abort();reject(e);}t.oncomplete=()=>resolve(val);t.onabort=()=>reject(t.error||Error('WAL abortado'));t.onerror=()=>reject(t.error||Error('WAL indisponível'));});
 const load=()=>tx('readonly',(s,set)=>{const r=s.get(actor);r.onsuccess=()=>set(r.result||null);});
 async function claim(command){const entry={actor,command,stage:'pending'};await tx('readwrite',(s,set,t)=>{const g=s.get(actor);g.onsuccess=()=>{if(g.result){t.abort();return;}s.add(entry);set(entry);};});pending=entry;return entry;}
 async function stage(entry,value){await tx('readwrite',(s,set,t)=>{const g=s.get(actor);g.onsuccess=()=>{if(g.result?.command.commandId!==entry.command.commandId){t.abort();return;}s.put({...entry,stage:value});};});pending={...entry,stage:value};}
 async function clear(entry){await tx('readwrite',(s,set,t)=>{const g=s.get(actor);g.onsuccess=()=>{if(g.result?.command.commandId!==entry.command.commandId){t.abort();return;}s.delete(actor);};});pending=null;}
 async function state(){const r=await request('/api/state');if(r.status!=='ok'||r.state?.schema!=='hlgb-evolucao-operacao-ficticia-v1'||!window.HLGBOperationalLab.inspect(r.state).ok)throw Error('Estado remoto inválido');return r.state;}
 async function init(){const s=await request('/api/session');if(s.environment!=='HLGB-INTEGRADO-FICTICIO')throw Error('Ambiente proibido');actor=s.actor;db=await open();pending=await load();return state();}
 async function prove(entry){const r=await request('/api/commands/'+encodeURIComponent(entry.command.commandId));
 if(r.status==='readback_confirmed'){
 const latest=await state(),ev=latest.log.find(x=>x.commandId===entry.command.commandId);
 if(!ev||r.revision!==entry.command.expectedRevision+1||ev.type!==entry.command.type||ev.actor!==actor||ev.revision!==r.revision||latest.revision<r.revision)throw Error('Prova não corresponde ao comando local');
 await clear(entry);return {status:'confirmed',state:latest,result:r.result};}
 if(r.status==='not_found'){await stage(entry,'not_found');return {status:'not_found'};}
 throw Error('Prova inconclusiva: não repetir');}
 async function send(entry){const answer=await request('/api/commands','POST',entry.command);
 if(['committed','already_committed'].includes(answer.status))return prove(entry);
 if(['rejected','conflict'].includes(answer.status)){await stage(entry,answer.status);return {status:answer.status,message:answer.message,serverRevision:answer.serverRevision};}
 throw Error('Resposta inconclusiva');}
 async function submit(type,payload,revision){pending=await load();if(pending)throw Error('Existe comando pendente. Confira a sincronização antes de novo lançamento.');
 const entry=await claim({commandId:'LAB-'+crypto.randomUUID(),type,payload,expectedRevision:revision});
 return send(entry);}
 async function reconcile(){pending=await load();if(!pending)return {status:'empty',state:await state()};return prove(pending);}
 async function retry(){pending=await load();if(!pending||pending.stage!=='not_found')throw Error('Releia antes de reenviar.');return send(pending);}
 async function discard(){pending=await load();if(!pending||!['conflict','rejected','not_found'].includes(pending.stage))throw Error('Não é permitido descartar operação sem conferência.');
 const verdict=await prove(pending);if(verdict.status==='confirmed')return verdict;
 // A ausência de prova não autoriza reenvio com novo ID. Só descartar após a revisão do operador.
 if(verdict.status!=='not_found')throw Error('Não foi possível revisar o comando.');
 await clear(pending);return {status:'discarded',state:await state()};}
 window.HLGBRemoteLab={init,state,submit,reconcile,retry,discard,info:()=>({actor,pending}),load:async()=>{pending=await load();return pending;}};
})();
