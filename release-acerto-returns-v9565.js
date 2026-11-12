/* HLGB v95.65 — Acerto: devoluções e anotações auditáveis.
   O abatimento reduz somente saldo a receber, nunca o valor recebido em caixa.
   Não toca em estoque, peças, lançamentos antigos ou WAL. */
(function(){
'use strict';
if(window.hlgbAcertoReturns9565)return;
const V='95.65',busy=new Set(),state={lastError:'',lastSuccess:'',financePending:[]};
const sid=x=>String(x??''),q=x=>Math.max(0,Number(x)||0),cent=x=>Math.round(q(x)*100);
const brl=x=>(x/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=x=>sid(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const copy=x=>JSON.parse(JSON.stringify(x));
const rows=key=>{try{const x=typeof db!=='undefined'?db:window.db;return Array.isArray(x?.[key])?x[key]:[]}catch(e){return Array.isArray(window.db?.[key])?window.db[key]:[]}};
const today=()=>{const x=new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const validDay=x=>{const v=sid(x);if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00');return d.getFullYear()===+v.slice(0,4)&&d.getMonth()+1===+v.slice(5,7)&&d.getDate()===+v.slice(8,10)};
const key=(type,id)=>type+':'+sid(id);
const moduleFor=type=>type==='projection'?'projectionInvoices':'orders';
const lookup=(type,id)=>rows(moduleFor(type)).find(x=>sid(x?.id)===sid(id))||null;
const ret=x=>Array.isArray(x?.acertoReturnsV9565)?x.acertoReturnsV9565:[];
const notes=x=>Array.isArray(x?.acertoNotesV9565)?x.acertoNotesV9565:[];
const credits=x=>ret(x).reduce((s,e)=>s+(e?.reversedAt?0:cent(e?.value)),0);
function paid(x,type){
 const hist=Array.isArray(x?.paymentHistory)?x.paymentHistory:[];
 if(hist.length)return hist.reduce((s,p)=>s+cent(p?.value),0);
 const scalar=type==='projection'?x?.paid:x?.received;
 if(scalar!=null)return cent(scalar);
 // Some older notes store payment only in the finance mirror. For multiple
 // mirrors take a single maximum, never sum duplicate mirror entries.
 const mirrors=x?.id!=null?invoiceFinance(type,x.id):[];
 return Math.max(0,...mirrors.map(f=>cent(f?.paid)));
}
function balance(x,type){
 const total=cent(type==='projection'?x?.value:x?.total);
 const cash=Math.min(total,paid(x,type)),credit=credits(x);
 return {total,cash,credit,remaining:Math.max(0,total-cash-credit),overCredit:credit>total-cash};
}
function status(m){
 return m.remaining>1?(m.cash>0||m.credit>0?'Parcial':'Pendente'):
 m.credit>0?'Compensado por devolução':'Pago';
}
function refresh(){
 for(const f of ['renderNotes9214','renderNotes9200','renderOrderNotes','renderFinance','renderHubFinance'])
  try{window[f]?.()}catch(e){console.warn('[HLGB acerto '+V+'] render '+f,e)}
 try{window.hlgbNotesReceivables9564?.paint?.()}catch(e){}
}
function updateLocal(type,id,row){
 const arr=rows(moduleFor(type));const i=arr.findIndex(x=>sid(x?.id)===sid(id));
 if(i>=0)arr[i]=copy(row);else arr.push(copy(row));
 try{window.localSaveOnly?.()}catch(_){}
}
function invoiceFinance(type,id){
 return rows('finance').filter(f=>type==='projection'?sid(f?.projectionInvoiceId)===sid(id):
  sid(f?.orderId)===sid(id)&&f?.type==='Receber');
}
function moneyState(row,type){
 const m=balance(row,type);
 return {...m,status:status(m)};
}
async function assertNoLocalPending(module,id){
 const guard=window.hlgbWalIdbGuard9536;
 // The current browser has persistent Safari WAL work. Without the read-only
 // guard loaded, writes cannot be considered safe even if other flags say zero.
 if(typeof guard?.probe!=='function'||typeof guard?.ids!=='function')
  throw Error('Proteção de sincronização local indisponível. Registro preservado; recarregue a página sem limpar dados.');
 if(guard?.probe){
  try{await guard.probe()}catch(e){throw Error('Não foi possível conferir operações locais pendentes: '+sid(e?.message||e))}
  if(guard.status?.()?.readFailed)throw Error('O WAL deste navegador não pôde ser lido. Registro preservado; não substituir dados.');
 }
 const identities=new Set();
 for(const provider of [()=>guard?.ids?.(),()=>window.hlgbRecordPendingIdentitySet9535?.()]){
  try{for(const identity of provider()||[])identities.add(sid(identity))}
  catch(e){throw Error('Falha ao conferir pendências de gravação. Registro preservado: '+sid(e?.message||e))}
 }
 if(identities.has(module+'::'+sid(id))||identities.has(module+'|'+sid(id)))
  throw Error('Existe alteração local pendente neste registro. Aguarde a sincronização antes de lançar o acerto.');
}
async function confirmedSave(module,id,next){
 await assertNoLocalPending(module,id);
 const save=window.hlgbRecordSaveWithRetry;
 if(typeof save!=='function')throw Error('A gravação autenticada não está disponível. Nada foi registrado.');
 const out=await save(module,sid(id),copy(next),false);
 if(!out||out.applied!==true)throw Error(out?.reason||'A nuvem não confirmou a gravação.');
 return out.data||next;
}
async function mirrorFinance(type,id,record){
 const m=moneyState(record,type);
 const matches=invoiceFinance(type,id),failed=[];
 for(const old of matches){
  if(old?.id==null)continue;
  const next={...copy(old),paid:m.cash/100,remaining:m.remaining/100,
   creditReturnsV9565:m.credit/100,status:m.status,updatedAt:new Date().toISOString()};
  try{
   const saved=await confirmedSave('finance',old.id,next);
   const arr=rows('finance'),idx=arr.findIndex(x=>sid(x?.id)===sid(old.id));
   if(idx>=0)arr[idx]=copy(saved);
  }catch(e){failed.push({id:sid(old.id),message:sid(e?.message||e)})}
 }
 try{window.localSaveOnly?.()}catch(_){}
 state.financePending=failed;
 return {ok:failed.length===0,failed};
}
async function saveAction(type,id,kind,input){
 const slot=key(type,id);if(busy.has(slot))throw Error('Já existe um salvamento em andamento.');
 busy.add(slot);state.lastError='';state.lastSuccess='';
 try{
  const current=lookup(type,id);
  if(!current)throw Error('Nota ou pedido não encontrado. Nenhuma gravação feita.');
  if(current.id==null)throw Error('Registro sem identificação.');
  if(!['return','note','payment','reversal'].includes(kind))throw Error('Operação inválida.');
  const old=moneyState(current,type),next=copy(current),now=new Date().toISOString();
  if(old.overCredit)throw Error('O histórico possui abatimentos maiores que o saldo. Conferir antes de lançar.');
  if(kind==='return'){
   const value=Number(input?.value),note=sid(input?.reason).trim(),detail=sid(input?.detail).trim(),at=sid(input?.date||today());
   if(!Number.isFinite(value)||value<=0||cent(value)>old.remaining)
    throw Error('O abatimento precisa ser positivo e não pode ultrapassar o saldo de '+brl(old.remaining)+'.');
   if(!note||note.length>180)throw Error('Informe o motivo da devolução (até 180 caracteres).');
   if(!validDay(at))throw Error('Informe uma data válida para a devolução.');
   next.acertoReturnsV9565=[...ret(next),{id:sid(Date.now())+'-'+sid(Math.floor(Math.random()*1000000)),
    value:cent(value)/100,date:at,reason:note,detail:detail.slice(0,1200),createdAt:now,type:'devolucao'}];
  }else if(kind==='note'){
   const text=sid(input?.text).trim();
   if(!text||text.length>1600)throw Error('Escreva a anotação (até 1.600 caracteres).');
   next.acertoNotesV9565=[...notes(next),{id:sid(Date.now())+'-'+sid(Math.floor(Math.random()*1000000)),text,createdAt:now,date:today()}];
  }else if(kind==='payment'){
   const value=Number(input?.value),method=sid(input?.method||'PIX'),at=sid(input?.date||today());
   if(!Number.isFinite(value)||value<=0||cent(value)>old.remaining)
    throw Error('O recebimento não pode ultrapassar o saldo de '+brl(old.remaining)+'.');
   if(!validDay(at))throw Error('Data de recebimento inválida.');
   const p={id:Date.now(),value:cent(value)/100,method,date:at,note:sid(input?.detail).trim().slice(0,1200)};
   const previous=Array.isArray(next.paymentHistory)?next.paymentHistory:[];
   // A legacy invoice may have received/paid>0 without any paymentHistory.
   // Adding the first new receipt must never erase those previously received
   // funds by making the new history the sole source of truth.
   const baseline=previous.length===0&&old.cash>0?[{
    id:'legacy-received-'+sid(id),value:old.cash/100,
    method:'Recebimento anterior (dados de origem preservados)',
    date:'',note:'Saldo recebido já existente antes do primeiro acerto detalhado',
    importedBaselineV9565:true
   }]:[];
   next.paymentHistory=[...previous,...baseline,p];
  }else if(kind==='reversal'){
   const entry=ret(next).find(x=>sid(x?.id)===sid(input?.entryId));
   if(!entry||entry.reversedAt)throw Error('Devolução inexistente ou já estornada.');
   const why=sid(input?.reason).trim();if(!why)throw Error('Informe o motivo do estorno.');
   entry.reversedAt=now;entry.reversalReason=why.slice(0,400);
  }
  let m=moneyState(next,type);
  if(m.overCredit)throw Error('Abatimentos maiores que o saldo disponível.');
  if(type==='projection'){
   next.paid=m.cash/100;
  }else{
   next.received=m.cash/100;
  }
  next.remaining=m.remaining/100;
  next.acertoCreditTotalV9565=m.credit/100;
  // Orders use "status" for the production stage. Never replace
  // "Pedido finalizado" / "A cortar" with a financial status.
  if(type==='projection')next.status=m.status;
  if(type==='order')next.paymentStatus=m.status;
  next.updatedAt=now;
  // Persist the canonical note/order first; on failure nothing local is changed.
  const saved=await confirmedSave(moduleFor(type),id,next);
  updateLocal(type,id,saved);
  // Finance is a separate record. Do not pretend this is a distributed transaction.
  const mirror=await mirrorFinance(type,id,saved);
  state.lastSuccess=mirror.ok?'Acerto confirmado na nuvem.':'Acerto confirmado, mas o financeiro ainda precisa ser reconciliado.';
  refresh();
  return {ok:true,mirror,saved,summary:moneyState(saved,type)};
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{busy.delete(slot)}
}
async function retryFinance(type,id){
 const row=lookup(type,id);if(!row)throw Error('Nota não encontrada');
 const out=await mirrorFinance(type,id,row);
 if(!out.ok)throw Error('Não foi possível atualizar '+out.failed.length+' lançamento(s) financeiro(s).');
 refresh();return out;
}
const history=(x,type)=>{
 const m=moneyState(x,type),cash=Array.isArray(x.paymentHistory)?x.paymentHistory:[];
 const lines=[
 ...cash.map(p=>({date:sid(p.date),kind:'Recebimento',value:cent(p.value),note:sid(p.method)+' · '+sid(p.note||'')})),
 ...ret(x).map(e=>({date:sid(e.date),kind:e.reversedAt?'Devolução estornada':'Devolução',value:cent(e.value),
    note:sid(e.reason||'')+(e.detail?' — '+sid(e.detail):'')+(e.reversedAt?' · Estornada: '+sid(e.reversalReason):''),entryId:sid(e.id),reversed:!!e.reversedAt})),
 ...notes(x).map(e=>({date:sid(e.date||e.createdAt).slice(0,10),kind:'Anotação',value:null,note:sid(e.text)}))
 ];
 return {m,lines:lines.sort((a,b)=>b.date.localeCompare(a.date))};
};
function render(type,id){
 const doc=lookup(type,id);if(!doc){alert('Nota ou pedido não encontrado.');return false;}
 if(typeof window.openModal!=='function'){alert('A janela de Acerto não está disponível.');return false;}
 const h=history(doc,type),m=h.m,invoiceType=type==='projection'?'Nota':'Pedido';
 const title='Acerto · '+sid(doc.client||doc.clientName||invoiceType+' #'+id);
 const rowsHtml=h.lines.length?'<div style="overflow-x:auto"><table><thead><tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Detalhes</th><th></th></tr></thead><tbody>'+
  h.lines.map(e=>'<tr><td>'+esc(e.date)+'</td><td>'+esc(e.kind)+'</td><td>'+(e.value==null?'-':brl(e.value))+'</td><td>'+esc(e.note)+'</td>'+
  '<td>'+(e.entryId&&!e.reversed?'<button type="button" class="secondary" data-return-reverse="'+esc(e.entryId)+'">Estornar</button>':'')+'</td></tr>').join('')+'</tbody></table></div>':
  '<div class="empty">Nenhum lançamento ou anotação registrado.</div>';
 const todayStr=today(),html='<div id="hlgbAcertoReturn9565" style="max-width:860px">'+
 '<div class="cards" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:7px">'+
 [['Total original',m.total],['Recebido em dinheiro',m.cash],['Abatido por devolução',m.credit],['Saldo a cobrar',m.remaining]].map(([label,value])=>
 '<div class="card"><small>'+esc(label)+'</small><strong>'+brl(value)+'</strong></div>').join('')+'</div>'+
 '<p class="sub">Recebimento e devolução são registrados separadamente. Uma devolução <b>não entra como dinheiro recebido</b> nem altera o estoque automaticamente.</p>'+
 '<div class="panel" style="padding:12px;margin:10px 0"><h3 style="margin-top:0">💰 Registrar pagamento</h3>'+
 '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">'+
 '<div class="field"><label>Valor recebido (R$)</label><input id="ar65-pay" type="number" min="0.01" step="0.01" max="'+(m.remaining/100)+'" value="'+(m.remaining/100).toFixed(2)+'"></div>'+
 '<div class="field"><label>Forma</label><select id="ar65-method"><option>PIX</option><option>Cheque</option><option>Dinheiro</option><option>Transferência</option><option>Outro</option></select></div>'+
 '<div class="field"><label>Data</label><input id="ar65-paydate" type="date" value="'+todayStr+'"></div></div>'+
 '<div class="field"><label>Observação do pagamento</label><input id="ar65-paynote" placeholder="Ex.: cheque nº 123"></div>'+
 '<button type="button" class="primary" data-ar65="payment"'+(m.remaining<=1?' disabled':'')+'>Salvar recebimento</button></div>'+
 '<div class="panel" style="padding:12px;margin:10px 0"><h3 style="margin-top:0">↩️ Abater devolução</h3>'+
 '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">'+
 '<div class="field"><label>Valor a abater (R$)</label><input id="ar65-return" type="number" min="0.01" step="0.01" max="'+(m.remaining/100)+'" placeholder="0,00"></div>'+
 '<div class="field"><label>Data da devolução</label><input id="ar65-returndate" type="date" value="'+todayStr+'"></div></div>'+
 '<div class="field"><label>Motivo da devolução (obrigatório)</label><input id="ar65-reason" maxlength="180" placeholder="Ex.: 3 peças devolvidas"></div>'+
 '<div class="field"><label>Detalhes / produtos devolvidos</label><textarea id="ar65-detail" rows="2" maxlength="1200" placeholder="Modelo, quantidades, motivo ou combinado com cliente"></textarea></div>'+
 '<button type="button" class="secondary" data-ar65="return"'+(m.remaining<=1?' disabled':'')+'>Registrar abatimento</button></div>'+
 '<div class="panel" style="padding:12px;margin:10px 0"><h3 style="margin-top:0">📝 Anotações do acerto</h3>'+
 '<div class="field"><label>Anotação</label><textarea id="ar65-memo" rows="3" maxlength="1600" placeholder="Ex.: cliente informou que pagará o restante na sexta-feira"></textarea></div>'+
 '<button type="button" class="secondary" data-ar65="note">Salvar anotação</button></div>'+
 '<h3>📚 Histórico completo</h3>'+rowsHtml+
 '<div role="status" id="ar65-feedback" style="margin-top:8px"></div>'+
 (state.financePending.length?'<div style="margin:10px 0;color:#9c4200">⚠ O acerto foi salvo, mas a atualização do financeiro falhou.'+
 '<button type="button" class="secondary" data-ar65="retry">Tentar reconciliar financeiro</button></div>':'')+
 '</div>';
 window.openModal(title,html,()=>false);
 const host=document.getElementById('hlgbAcertoReturn9565');
 if(!host)return true;
 host.addEventListener('click',async e=>{
  const b=e.target?.closest?.('[data-ar65],[data-return-reverse]');if(!b||b.disabled)return;
  const kind=b.hasAttribute('data-return-reverse')?'reversal':b.dataset.ar65;
  const g=x=>sid(document.getElementById(x)?.value);
  const input=kind==='payment'?{value:g('ar65-pay'),date:g('ar65-paydate'),method:g('ar65-method'),detail:g('ar65-paynote')}:
   kind==='return'?{value:g('ar65-return'),date:g('ar65-returndate'),reason:g('ar65-reason'),detail:g('ar65-detail')}:
   kind==='note'?{text:g('ar65-memo')}:kind==='reversal'?{entryId:b.dataset.returnReverse,reason:prompt('Motivo do estorno da devolução:')||''}:{};
  if(kind==='reversal'&&!input.reason)return;
  const feedback=host.querySelector('#ar65-feedback');
  b.disabled=true;if(feedback)feedback.textContent='Salvando e aguardando confirmação da nuvem…';
  try{
   const result=kind==='retry'?await retryFinance(type,id):await saveAction(type,id,kind,input);
   render(type,id);
   const next=document.getElementById('ar65-feedback');
   if(next)next.textContent=result?.mirror?.ok===false?'Acerto salvo, mas falta sincronizar o lançamento financeiro.':kind==='retry'?'Financeiro atualizado.':'✓ Acerto confirmado na nuvem.';
  }catch(err){if(feedback)feedback.textContent='⚠ '+sid(err?.message||err);b.disabled=false}
 });
 return true;
}
function patchRenderer(){
 const old=window.renderNotes9214;
 if(typeof old!=='function'||old.__hlgbAcertoReturns9565)return;
 const wrapped=function(){
  const out=old.apply(this,arguments);
  setTimeout(()=>{
   try{document.querySelectorAll('#projectionNotes9214 [data-acerto9214]').forEach(b=>{
    const row=b.closest('tr'),inv=lookup('projection',b.getAttribute('data-acerto9214'));
    if(!row||!inv)return;
    const m=moneyState(inv,'projection'),c=row.children;
    if(c.length>=9){
     c[5].textContent=brl(m.cash);
     c[6].textContent=brl(m.remaining);
     c[7].innerHTML='<span class="badge '+(m.remaining<=1?'ok':'warn')+'">'+esc(status(m))+'</span>'+
       (m.credit>0?'<div class="sub">Devoluções: '+brl(m.credit)+'</div>':'');
    }
   })}catch(e){console.warn('[HLGB Acerto '+V+'] status',e)}
  },0);
  return out;
 };
 wrapped.__original=old;wrapped.__hlgbAcertoReturns9565=true;
 window.renderNotes9214=wrapped;
}
function patchOrderRemaining(){
 const old=window.orderRemaining;
 if(typeof old!=='function'||old.__hlgbAcertoReturns9565)return;
 const w=function(o){return moneyState(o,'order').remaining/100};
 w.__original=old;w.__hlgbAcertoReturns9565=true;window.orderRemaining=w;
}
function decorateOrder(id){
 const item=lookup('order',id),modal=document.getElementById('modal'),hist=document.getElementById('paymentHistoryBox');
 if(!item||!modal||!hist)return false;
 modal.querySelector('#hlgbOrderReturnExtra9565')?.remove();
 const m=moneyState(item,'order'),saldo=document.getElementById('acertoRemaining');
 if(saldo)saldo.textContent=brl(m.remaining);
 // Keep the original cheque form and payment history; append only the new tasks.
 const host=document.createElement('div');host.id='hlgbOrderReturnExtra9565';
 host.className='panel';host.style.cssText='margin-top:14px;padding:12px';
 const returnList=ret(item).map(e=>'<div class="sub">'+esc(e.date)+' · '+esc(e.reason)+' · '+brl(cent(e.value))+
   (e.reversedAt?' (estornada)':'')+'</div>').join('');
 const memoList=notes(item).map(e=>'<div class="sub">'+esc(e.date)+' · '+esc(e.text)+'</div>').join('');
 host.innerHTML='<h3 style="margin-top:0">↩️ Devoluções e anotações</h3>'+
  '<div class="cards"><div class="card"><small>Total abatido por devolução</small><strong>'+brl(m.credit)+'</strong></div>'+
  '<div class="card"><small>Saldo após abatimentos</small><strong>'+brl(m.remaining)+'</strong></div></div>'+
  '<div class="sub">Os abatimentos reduzem o saldo, mas não são recebimentos e não alteram estoque.</div>'+
  '<div class="grid" style="margin:10px 0"><div class="field"><label>Valor da devolução (R$)</label>'+
  '<input type="number" id="or65-value" min="0.01" step="0.01" max="'+(m.remaining/100)+'" placeholder="0,00"></div>'+
  '<div class="field"><label>Data</label><input type="date" id="or65-date" value="'+today()+'"></div>'+
  '<div class="field"><label>Motivo (obrigatório)</label><input id="or65-reason" maxlength="180" placeholder="Ex.: peças devolvidas"></div></div>'+
  '<div class="field"><label>Detalhes</label><textarea id="or65-detail" rows="2" maxlength="1200" placeholder="Modelo, peças, motivo"></textarea></div>'+
  '<button type="button" class="secondary" data-or65="return"'+(m.remaining<=1?' disabled':'')+'>Abater devolução</button>'+
  (returnList?'<h4>Histórico de devoluções</h4>'+returnList:'')+
  '<h4>📝 Anotações do acerto</h4>'+
  '<div class="field"><label>Nova anotação</label><textarea id="or65-note" rows="2" maxlength="1600"></textarea></div>'+
  '<button type="button" class="secondary" data-or65="note">Salvar anotação</button>'+
  (memoList?'<h4>Anotações anteriores</h4>'+memoList:'')+
  '<div role="status" id="or65-feedback"></div>'+
  (state.financePending.length?'<button type="button" class="secondary" data-or65="retry">Reconciliar financeiro pendente</button>':'');
 hist.insertAdjacentElement('afterend',host);
 host.addEventListener('click',async e=>{
  const b=e.target.closest('button[data-or65]');if(!b||b.disabled)return;
  const kind=b.dataset.or65,get=x=>sid(document.getElementById(x)?.value);
  const value=kind==='return'?{value:get('or65-value'),date:get('or65-date'),reason:get('or65-reason'),detail:get('or65-detail')}:
   {text:get('or65-note')};
  const f=host.querySelector('#or65-feedback');
  b.disabled=true;if(f)f.textContent='Salvando na nuvem…';
  try{
   const result=kind==='retry'?await retryFinance('order',id):await saveAction('order',id,kind,value);
   window.openAcerto(id);
   const next=document.getElementById('or65-feedback');
   if(next)next.textContent=result?.mirror?.ok===false?'Abatimento confirmado, mas lançamento financeiro pendente.':'✓ Registro confirmado na nuvem.';
  }catch(err){b.disabled=false;if(f)f.textContent='⚠ '+sid(err?.message||err)}
 });
 return true;
}
function patchOrderAcerto(){
 const old=window.openAcerto;
 if(typeof old!=='function'||old.__hlgbAcertoReturns9565)return;
 const w=function(id){const result=old.apply(this,arguments);decorateOrder(id);return result};
 w.__hlgbAcertoReturns9565=true;w.__original=old;
 window.openAcerto=w;
}
function install(){
 window.openProjectionAcerto9214=id=>render('projection',id);
 patchRenderer();patchOrderRemaining();patchOrderAcerto();
}
window.hlgbAcertoReturns9565={version:V,balance,moneyState,credits,paid,lookup,saveAction,retryFinance,render,install,status:()=>copy(state)};
install();[600,1600,3600].forEach(ms=>setTimeout(install,ms));
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,400));
console.info('[HLGB] v'+V+' devoluções e anotações do acerto auditáveis; confirmação de nuvem obrigatória');
})();