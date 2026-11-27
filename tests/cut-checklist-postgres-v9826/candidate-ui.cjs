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
 root.HLGBCutChecklistPersistence9835={mount(ctx){
  const {panel,source,current,fields,documents}=ctx;
  const add=(tag,txt,parent)=>{const n=document.createElement(tag);n.textContent=txt;parent.appendChild(n);return n};
  const area=add('section','',panel);area.dataset.hlgbPersistence9835='1';
  add('h3','Histórico e gravação — homologação',area);
  const status=add('p','Consultando conferências anteriores.',area);status.setAttribute('role','status');
  const save=add('button','Salvar conferência na homologação',area);save.type='button';save.disabled=true;
  const refresh=add('button','Consultar histórico',area);refresh.type='button';
  const history=add('div','',area);let version=null,busy=false,pending=null;
  const guard=()=>area.isConnected&&current();
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
   save.disabled=busy||version===null;
  }
  refresh.onclick=async()=>{if(busy)return;try{await list();if(guard())status.textContent='Histórico consultado.'}catch(_){if(guard())status.textContent='Histórico indisponível.'}};
  save.onclick=async()=>{
   if(busy||!guard()||version===null)return;busy=true;save.disabled=true;status.textContent='Validando fonte e salvando.';
   try{
    const draft=fields(),files=documents(),signature=JSON.stringify(draft)+JSON.stringify(files.map(f=>f.sha));
    if(pending&&pending.signature!==signature)throw Error('pending-edit');
    if(!pending){const remote=await transport.source({cutId:source.cutId,orderId:source.orderId,productId:source.productId});if(!guard())return;
     const data=matched(source,remote,draft);
     pending={signature,source:remote,req:core.request(remote,version,root.crypto.randomUUID(),data),files};
    }
    const unchanged=()=>guard()&&JSON.stringify(fields())+JSON.stringify(documents().map(f=>f.sha))===pending.signature;
    const confirmed=await core.confirm({transport,source:pending.source,req:pending.req,stillCurrent:unchanged});
    if(confirmed.state!=='confirmed'){if(guard())status.textContent='Gravação não confirmada. Confira a conexão e tente novamente sem alterar o rascunho.';return}
    const target={cutId:source.cutId,orderId:source.orderId,productId:source.productId,version:confirmed.record.result.version};
    for(const file of pending.files){
     const ack=await transport.attach({...target,name:file.info.name,mime:file.info.mime,sha:file.sha,bytes:Array.from(new Uint8Array(await file.file.arrayBuffer()))});
     if(!unchanged())return;
     if(!ack||!same(id(ack),id(target))||ack.version!==target.version||ack.sha256!==file.sha||ack.size!==file.info.size||ack.contentVerified!==true||ack.private!==true)throw Error('file-ack');
    }
    const listed=await transport.listFiles(target);
    if(!unchanged())return;
    if(!Array.isArray(listed)||pending.files.some(f=>!listed.some(d=>d.sha256===f.sha&&d.name===f.info.name&&d.size===f.info.size&&d.private===true&&d.contentVerified===true)))throw Error('file-readback');
    pending=null;await list();if(guard())status.textContent='Conferência e documentos confirmados — versão '+target.version+'.';
   }catch(e){if(guard())status.textContent=e.message==='source-mismatch'||e.message==='ambiguous-material'?'Grade ou materiais divergentes. Gravação bloqueada.':e.message==='pending-edit'?'Gravação anterior não confirmada. Restaure o rascunho original para repetir.':'Gravação não confirmada. Confira os dados e tente novamente.'}
   finally{busy=false;if(guard())save.disabled=version===null;}
  };
  list().then(()=>{if(guard())status.textContent='Histórico disponível na homologação.'}).catch(()=>{if(guard())status.textContent='Histórico indisponível.'});
 }};
}
root.HLGBChecklistCandidate9835={install,matched};
})(window);
