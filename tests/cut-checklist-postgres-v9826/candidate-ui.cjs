/* Isolated candidate. Not present in the commercial loader. */
(function(root){'use strict';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const id=x=>[x.cutId,x.orderId,x.productId];
const grade=x=>x.map(g=>[g.color,g.size,Number(g.qty)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const tuple=l=>JSON.stringify([l.name,l.color,l.unit,Number(l.pieces)]);
const amount=s=>s==null?null:Number(s);
function matched(local,server,draft){
 if(!server||!same(id(local),id(server))||!Array.isArray(server.grade)||!same(grade(local.grade),grade(server.grade))||!Array.isArray(server.lines)||server.lines.length!==draft.lines.length)throw Error('source-mismatch');
 const m=new Map();
 for(const l of draft.lines){const k=tuple(l);if(m.has(k))throw Error('ambiguous-material');m.set(k,l);}
 const seen=new Set();
 return {...draft,lines:server.lines.map(s=>{
  const k=tuple(s),l=m.get(k);
  if(!l||seen.has(k)||(l.required==null)!==(s.required==null)||(l.required!=null&&Math.abs(amount(l.required)-amount(s.required))>1e-6))throw Error('source-mismatch');
  seen.add(k);const raw=l.actual.trim().replace(',','.');
  if(raw&&!/^\d{1,9}(?:\.\d{1,6})?$/.test(raw))throw Error('invalid-quantity');
  return {key:s.key,actual:raw?Number(raw):null,checked:l.checked,note:l.note};
 })};
}
function install(transport){
 const core=root.HLGBChecklistConfirmation9835;if(!core)throw Error('confirmation-unavailable');
 // Same-tab reload recovery: persist only the request, draft and file metadata.
 // Never persist File objects/bytes or share pending requests across accounts.
 const pendingByCut=new Map();let lastOwner='',storageOK=true;
 const storageKey='hlgb-checklist-lab-pending-9889',fileMeta=f=>({sha:f.sha,name:f.info.name,size:f.info.size,mime:f.info.mime});
 const signature=(draft,files)=>JSON.stringify(draft)+JSON.stringify(files);
 function restoreStore(owner){
  pendingByCut.clear();storageOK=true;
  try{const raw=root.sessionStorage.getItem(storageKey);if(!raw)return;
   const state=JSON.parse(raw);
   if(state.owner!==owner){root.sessionStorage.removeItem(storageKey);return}
   if(!Array.isArray(state.entries)||state.entries.length>20)throw Error('pending-store');
   for(const [key,p] of state.entries){
    if(typeof key!=='string'||!p||!same(id(p.source),id(p.req))||key!==JSON.stringify(id(p.source))||!p.draft||!Array.isArray(p.files)||p.files.length>3||p.files.some(f=>!f||!/^([a-f0-9]{64})$/.test(f.sha)||typeof f.name!=='string'||!Number.isSafeInteger(f.size)||f.size<=0||f.size>5*1024*1024||typeof f.mime!=='string')||p.signature!==signature(p.draft,p.files)||!same(core.request(p.source,p.req.expectedVersion,p.req.requestId,matched(p.source,p.source,p.draft)),p.req)||pendingByCut.has(key))throw Error('pending-store');
    pendingByCut.set(key,p);
   }
  }catch(_){storageOK=false;pendingByCut.clear()}
 }
 function persistStore(){
  if(!storageOK)throw Error('pending-store');
  const entries=[...pendingByCut];
  try{if(entries.length)root.sessionStorage.setItem(storageKey,JSON.stringify({owner:lastOwner,entries}));else root.sessionStorage.removeItem(storageKey)}
  catch(_){storageOK=false;throw Error('pending-store')}
 }
 root.addEventListener('hlgb:logout',()=>{pendingByCut.clear();lastOwner='';try{root.sessionStorage.removeItem(storageKey)}catch(_){}storageOK=true});
 root.HLGBCutChecklistPersistence9835={mount(ctx){
  const {panel,source,current,fields,documents,restoreFields,owner}=ctx;
  if(!owner)return;if(owner!==lastOwner){lastOwner=owner;restoreStore(owner);}
  const cacheKey=JSON.stringify(id(source));
  const add=(tag,txt,parent)=>{const n=document.createElement(tag);n.textContent=txt;parent.appendChild(n);return n};
  const area=add('section','',panel);area.dataset.hlgbPersistence9835='1';
  add('h3','Histórico e gravação — homologação',area);
  const status=add('p','Consultando conferências anteriores.',area);status.setAttribute('role','status');
  const save=add('button','Salvar conferência na homologação',area);save.type='button';save.disabled=true;
  const refresh=add('button','Consultar histórico',area);refresh.type='button';
  const history=add('div','',area);let version=null,busy=false,pending=pendingByCut.get(cacheKey)||null;
  const recover=add('button','Restaurar conferência pendente',area);recover.type='button';recover.hidden=!pending;
  const guard=()=>area.isConnected&&lastOwner===owner&&current();
  const localSignature=()=>signature(fields(),documents().map(fileMeta));
  recover.onclick=()=>{if(busy||!guard()||!pending)return;try{if(typeof restoreFields!=='function')throw Error('restore');matched(source,pending.source,pending.draft);if(!restoreFields(pending.draft))throw Error('restore');status.textContent=pending.files.length?'Rascunho restaurado. Selecione novamente os mesmos documentos: '+pending.files.map(f=>f.name).join(', ')+'.':'Rascunho restaurado. Repita a gravação com a mesma referência.';}catch(_){status.textContent='Grade ou materiais divergentes. Recuperação bloqueada.'}};
  async function list(){
   const rows=await transport.list({cutId:source.cutId,orderId:source.orderId,productId:source.productId});
   if(!guard())return;
   if(!Array.isArray(rows))throw Error('history');
   version=rows[0]?.version??0;history.replaceChildren();
   for(const row of rows){const line=add('p','Versão '+row.version+' · '+row.responsible+' · '+row.recordedAt,history);
    const b=add('button','Consultar versão '+row.version,line);b.type='button';b.onclick=async()=>{
     try{const record=await transport.read({cutId:source.cutId,orderId:source.orderId,productId:source.productId,version:row.version});
      if(!guard())return;if(!record||!same(id(record.result),id(source))||record.result.version!==row.version)throw Error('history');
      const detail=add('div','',line);for(const l of record.result.lines)add('p',l.name+' · '+l.color+' · separado '+(l.actual??'não informado')+' · falta '+(l.shortage??'a conferir')+' '+l.unit,detail);
      const docs=await transport.listFiles({cutId:source.cutId,orderId:source.orderId,productId:source.productId,version:row.version});
      if(!guard())return;for(const d of docs)add('p','Documento confirmado: '+d.name,detail);
     }catch(_){if(guard())status.textContent='Não foi possível consultar esta versão.'}
    };
   }
   save.disabled=busy||version===null||!storageOK;
  }
  refresh.onclick=async()=>{if(busy)return;try{await list();if(guard())status.textContent='Histórico consultado.'}catch(_){if(guard())status.textContent='Histórico indisponível.'}};
  save.onclick=async()=>{
   if(busy||!guard()||version===null||!storageOK)return;busy=true;save.disabled=true;status.textContent='Validando fonte e salvando.';
   try{
    const draft=fields(),files=documents(),meta=files.map(fileMeta),sig=signature(draft,meta);
    if(pending&&pending.signature!==sig)throw Error('pending-edit');
    if(!pending){const remote=await transport.source({cutId:source.cutId,orderId:source.orderId,productId:source.productId});if(!guard())return;
     const data=matched(source,remote,draft);
     if(pendingByCut.size>=20&&!pendingByCut.has(cacheKey))throw Error('pending-limit');
     pending={signature:sig,source:remote,req:core.request(remote,version,root.crypto.randomUUID(),data),draft,files:meta};pendingByCut.set(cacheKey,pending);persistStore();recover.hidden=false;
    }
    const unchanged=()=>guard()&&localSignature()===pending.signature;
    const confirmed=await core.confirm({transport,source:pending.source,req:pending.req,stillCurrent:unchanged});
    if(confirmed.state!=='confirmed'){if(guard())status.textContent='Gravação não confirmada. Confira a conexão e tente novamente sem alterar o rascunho.';return}
    const target={cutId:source.cutId,orderId:source.orderId,productId:source.productId,version:confirmed.record.result.version};
    for(const file of files){
     const bytes=Array.from(new Uint8Array(await file.file.arrayBuffer()));if(!unchanged())return;
     const ack=await transport.attach({...target,name:file.info.name,mime:file.info.mime,sha:file.sha,bytes});
     if(!unchanged())return;
     if(!ack||!same(id(ack),id(target))||ack.version!==target.version||ack.sha256!==file.sha||ack.size!==file.info.size||ack.contentVerified!==true||ack.private!==true)throw Error('file-ack');
    }
    const listed=await transport.listFiles(target);
    if(!unchanged())return;
    if(!Array.isArray(listed)||pending.files.some(f=>!listed.some(d=>d.sha256===f.sha&&d.name===f.name&&d.size===f.size&&d.private===true&&d.contentVerified===true)))throw Error('file-readback');
    pendingByCut.delete(cacheKey);persistStore();pending=null;recover.hidden=true;await list();if(guard())status.textContent='Conferência e documentos confirmados — versão '+target.version+'.';
   }catch(e){if(guard())status.textContent=e.message==='source-mismatch'||e.message==='ambiguous-material'?'Grade ou materiais divergentes. Gravação bloqueada.':e.message==='pending-store'?'Não foi possível proteger a referência local. Não reenvie; confira o histórico.':e.message==='pending-edit'?'Gravação anterior não confirmada. Restaure o rascunho original para repetir.':'Gravação não confirmada. Confira os dados e tente novamente.'}
   finally{busy=false;if(guard())save.disabled=version===null||!storageOK;}
  };
  list().then(()=>{if(guard())status.textContent=!storageOK?'Recuperação local indisponível. Consulte o histórico; gravação bloqueada.':pending?'Gravação anterior pendente. Repita sem alterar o rascunho.':'Histórico disponível na homologação.'}).catch(()=>{if(guard())status.textContent='Histórico indisponível.'});
 }};
}
root.HLGBChecklistCandidate9835={install,matched};
})(window);
