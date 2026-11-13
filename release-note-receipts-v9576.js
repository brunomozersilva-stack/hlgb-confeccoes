/* HLGB v95.76 — comprovantes PDF por nota e por recebimento.
 * Armazena PDFs como registros separados no módulo receipts, não infla
 * projectionInvoices, não marca como pago nem modifica WAL empresarial.
 * Sem confirmação remota, preserva seleção na janela e não anuncia sucesso. */
(function(){
'use strict';
const V='95.76',MODULE='receipts',MAX=750*1024,cache=new Map(),busy=new Set();
if(window.hlgbNoteReceipts9576)return;
const sid=x=>String(x??''),esc=x=>sid(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
const fmt=x=>new Date(x).toLocaleString('pt-BR'),key=x=>sid(x);
const state={lastError:'',lastSuccess:'',lastReadback:'',lastNote:'',lastQuery:''};
const dbRef=()=>{try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{}}};
const invoice=id=>(dbRef()?.projectionInvoices||[]).find(n=>sid(n?.id)===sid(id))||null;
async function assertSafe(id){
 if(window.__HLGB_AUTH_READY!==true)throw Error('Acesse o HLGB com login para anexar comprovantes.');
 const g=window.hlgbWalIdbGuard9536;
 if(typeof g?.probe!=='function'||typeof g?.ids!=='function')throw Error('Proteção de gravação não carregada. Atualize somente a página sem apagar dados.');
 await g.probe();
 if(g.status?.()?.readFailed)throw Error('A fila de sincronização não pôde ser lida.');
 const ids=new Set([...g.ids()||[],...window.hlgbRecordPendingIdentitySet9535?.()||[]].map(sid));
 if(ids.has(MODULE+'::'+id)||ids.has(MODULE+'|'+id))throw Error('Esse comprovante ainda possui envio pendente. Não duplicar.');
 if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
}
async function readFile(file){
 if(!file)throw Error('Selecione um PDF de pagamento.');
 if(file.size<5||file.size>MAX)throw Error('PDF inválido ou maior que 750 KB. Faça um PDF menor para anexar.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if([37,80,68,70,45].some((x,i)=>bytes[i]!==x))throw Error('O arquivo escolhido não é um PDF válido.');
 let text='';for(let i=0;i<bytes.length;i+=16000)text+=String.fromCharCode.apply(null,bytes.slice(i,i+16000));
 return {name:sid(file.name||'comprovante.pdf').replace(/[\\/]/g,'_').slice(0,130),
  mime:'application/pdf',size:bytes.length,base64:btoa(text)};
}
function download(rec){
 const pdf=rec?.file;if(!pdf?.base64)throw Error('Nenhum PDF encontrado no comprovante.');
 const binary=atob(pdf.base64),a=new Uint8Array(binary.length);
 for(let i=0;i<a.length;i++)a[i]=binary.charCodeAt(i);
 const blob=new Blob([a],{type:'application/pdf'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=pdf.name||'comprovante.pdf';document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),12000);
}
async function readRemote(id){
 if(typeof window.cloudRequest!=='function')throw Error('Consulta autenticada da nuvem indisponível.');
 const path='hlgb_records?select=entity_id,data,deleted_at&module=eq.'+MODULE+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const rows=await window.cloudRequest(path,{method:'GET'});
 return Array.isArray(rows)&&rows[0]&&!rows[0].deleted_at?rows[0].data:null;
}
async function list(noteId){
 if(window.__HLGB_AUTH_READY!==true)throw Error('Sessão autenticada não disponível.');
 if(typeof window.cloudRequest!=='function')throw Error('Consulta de comprovantes não disponível nesta sessão.');
 const q='hlgb_records?select=entity_id,data,deleted_at&module=eq.'+MODULE+'&order=updated_at.desc&limit=1000';
 state.lastQuery=q;const rows=await window.cloudRequest(q,{method:'GET'});
 if(!Array.isArray(rows))throw Error('A lista de comprovantes não foi confirmada pela nuvem.');
 const a=rows.filter(r=>!r.deleted_at&&r.data?.kind==='hlgb_note_payment_receipt'&&sid(r.data?.projectionInvoiceId)===sid(noteId)).map(r=>r.data);
 cache.set(key(noteId),a);state.lastError='';
 return a;
}
async function save(noteId,file,paymentId){
 const id='notepdf-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
 if(busy.has(key(noteId)))throw Error('Um comprovante já está sendo enviado.');
 busy.add(key(noteId));state.lastError='';state.lastSuccess='';
 try{
  const note=invoice(noteId);if(!note)throw Error('Nota não encontrada na sessão. Nenhum PDF foi enviado.');
  await assertSafe(id);
  const pdf=await readFile(file);
  const history=Array.isArray(note.paymentHistory)?note.paymentHistory:[];
  if(paymentId&&!history.some(p=>sid(p.id)===sid(paymentId)))throw Error('Recebimento escolhido não consta no histórico da nota.');
  const row={id,kind:'hlgb_note_payment_receipt',projectionInvoiceId:sid(noteId),paymentId:sid(paymentId),file:pdf,at:new Date().toISOString()};
  const fn=window.hlgbRecordSaveWithRetry;
  if(typeof fn!=='function')throw Error('O salvamento autenticado não está disponível.');
  const out=await fn(MODULE,id,row,false);
  if(!out||out.applied!==true)throw Error(out?.reason||'O servidor não confirmou o anexo.');
  const remote=await readRemote(id);
  if(!remote||sid(remote.id)!==id||remote.file?.base64!==pdf.base64)
   throw Error('Envio sem confirmação da releitura. Consulte o comprovante antes de reenviar.');
  state.lastReadback=new Date().toISOString();
  state.lastSuccess='PDF confirmado na nuvem.';
  cache.set(key(noteId),[remote,...(cache.get(key(noteId))||[]).filter(x=>sid(x.id)!==id)]);
  return remote;
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{busy.delete(key(noteId))}
}
function show(noteId,host){
 if(!host||!invoice(noteId))return false;
 host.querySelector('#hlgbNotePdf9576')?.remove();
 const note=invoice(noteId),payments=Array.isArray(note.paymentHistory)?note.paymentHistory:[];
 const sec=document.createElement('section');sec.id='hlgbNotePdf9576';sec.className='panel';sec.style.cssText='padding:12px;margin:12px 0';
 const opts=payments.map((p,i)=>'<option value="'+esc(p.id)+'">Recebimento '+(i+1)+' · '+esc(p.date||'sem data')+' · R$ '+Number(p.value||0).toFixed(2).replace('.',',')+'</option>').join('');
 sec.innerHTML='<h3 style="margin:0 0 8px">📎 Comprovantes PDF dos pagamentos</h3>'+
 '<p class="sub">Anexe o PDF do recebimento. Isso não altera o saldo nem confirma um pagamento por si só. Até 750 KB por arquivo.</p>'+
 '<div class="field"><label>Vincular ao recebimento (opcional)</label><select id="np76-payment"><option value="">Comprovante geral da nota</option>'+opts+'</select></div>'+
 '<div class="field"><label>Selecionar PDF</label><input id="np76-file" type="file" accept=".pdf,application/pdf"></div>'+
 '<button type="button" class="secondary" id="np76-save">☁️ Salvar PDF na nota</button>'+
 '<div id="np76-message" class="sub" role="status"></div><div id="np76-list" class="sub">Conferindo comprovantes na nuvem…</div>';
 const ref=host.querySelector('#ar65-feedback')||null;
 if(ref)ref.insertAdjacentElement('beforebegin',sec);else host.appendChild(sec);
 const feedback=sec.querySelector('#np76-message'),listNode=sec.querySelector('#np76-list');
 const paint=items=>{
  listNode.innerHTML=items.length?items.map(r=>'<div style="display:flex;gap:8px;align-items:center;margin:5px 0"><span>'+esc(r.file?.name||'Comprovante')+' · '+esc(fmt(r.at))+'</span><button type="button" class="secondary" data-note-pdf="'+esc(r.id)+'">Baixar PDF</button></div>').join(''):'Nenhum PDF vinculado a esta nota.';
  listNode.querySelectorAll('[data-note-pdf]').forEach(btn=>btn.addEventListener('click',()=>{
   const item=(cache.get(key(noteId))||[]).find(x=>sid(x.id)===sid(btn.dataset.notePdf));if(item)download(item);
  }));
 };
 list(noteId).then(paint).catch(e=>{listNode.textContent='Não foi possível consultar comprovantes: '+sid(e?.message||e)});
 sec.querySelector('#np76-save').addEventListener('click',async()=>{
  const btn=sec.querySelector('#np76-save'),file=sec.querySelector('#np76-file')?.files?.[0],paymentId=sec.querySelector('#np76-payment')?.value||'';
  btn.disabled=true;feedback.textContent='Enviando PDF e confirmando no servidor…';
  try{await save(noteId,file,paymentId);feedback.textContent='✓ PDF confirmado na nuvem.';paint(cache.get(key(noteId))||[]);sec.querySelector('#np76-file').value=''}
  catch(e){feedback.textContent='⚠ '+sid(e?.message||e)}
  finally{btn.disabled=false}
 });
 state.lastNote=sid(noteId);return true;
}
window.hlgbNoteReceipts9576={version:V,save,readFile,readRemote,list,show,download,status:()=>({...state,loading:busy.size})};
console.info('[HLGB] v'+V+' comprovantes PDF de notas isolados e confirmados no servidor');
})();