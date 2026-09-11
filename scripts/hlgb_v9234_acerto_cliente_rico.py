from pathlib import Path

src=Path('app9233.html')
out=Path('app9234.html')
s=src.read_text(encoding='utf-8')

# Somente avanço do carimbo visual; nenhuma regra de negócio existente é alterada.
s=s.replace('v92.33','v92.34')

addon=r'''<!-- HLGB_V9234_CLIENT_SETTLEMENT_START -->
<style>
.hlgb9234-methods{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}
.hlgb9234-methods button{min-width:105px}
.hlgb9234-history{margin-top:16px}
.hlgb9234-history table{min-width:760px}
.hlgb9234-cheque{margin-top:12px;padding:13px;background:#fff8fb;border:1px solid var(--line);border-radius:12px}
.hlgb9234-feedback{display:none;margin-top:10px;color:#287a4b;font-size:13px;font-weight:800}
.hlgb9234-pay-panel{margin:0 0 14px;padding:14px;background:#fff}
</style>
<script>
(function(){
'use strict';
const clone9234=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
const q9234=v=>Math.max(0,+v||0);
const money9234=v=>{try{return q9234(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+q9234(v).toFixed(2)}};
const esc9234=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today9234=()=>new Date().toISOString().slice(0,10);
const fmt9234=v=>{try{return v?new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'-'}catch(e){return String(v||'-')}};
function invoice9234(id){return (db.projectionInvoices||[]).find(x=>String(x.id)===String(id))||null}
function finance9234(inv){return (db.finance||[]).find(x=>String(x.projectionInvoiceId)===String(inv?.id))||null}
function payments9234(inv){return Array.isArray(inv?.paymentHistory)?inv.paymentHistory:[]}
function paid9234(inv){
  if(Array.isArray(inv?.paymentHistory))return inv.paymentHistory.reduce((s,p)=>s+q9234(p?.value),0);
  const f=finance9234(inv);return q9234(f?.paid??inv?.paid);
}
function remaining9234(inv){return Math.max(0,q9234(inv?.value)-paid9234(inv))}
function status9234(inv){const p=paid9234(inv),r=remaining9234(inv);return r<=.009?'Pago':p>0?'Parcial':'Pendente'}
async function saveRow9234(module,row){
  if(!row||row.id==null)throw new Error('Registro sem identificação.');
  try{if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false)}catch(e){}
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('A conexão com a nuvem não está pronta.');
  const out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9234(row),false);
  if(!out||out.applied===false)throw new Error(out?.reason||('A nuvem não confirmou '+module+'.'));
  return out.data||row;
}
function replaceLocal9234(module,id,row){
  db[module]=Array.isArray(db[module])?db[module]:[];
  const i=db[module].findIndex(x=>String(x.id)===String(id));
  if(i>=0)db[module][i]=clone9234(row);else db[module].push(clone9234(row));
}
function renderAll9234(){
  try{window.renderNotes9200?.()}catch(e){}
  try{window.renderNotes9214?.()}catch(e){}
  try{window.renderNotes9215?.()}catch(e){}
  try{window.renderLegacy9223?.()}catch(e){}
  try{if(typeof renderFinance==='function')renderFinance()}catch(e){}
}
function chequeDetails9234(p){
  const c=p?.cheque||{};let bits=[];
  if(c.number)bits.push('nº '+esc9234(c.number));
  if(c.owner)bits.push(esc9234(c.owner));
  if(c.date)bits.push('data '+fmt9234(c.date));
  let txt='Cheque'+(bits.length?' — '+bits.join(' — '):'');
  if(p?.note)txt+='<br>'+esc9234(p.note);
  if(c.photo)txt+=` <button type="button" class="secondary" data-cheque-photo9234="${esc9234(p.id)}">📷 Foto</button>`;
  return txt;
}
function history9234(inv){
  const arr=payments9234(inv);
  if(!arr.length)return '<div class="empty">Nenhum pagamento lançado ainda.</div>';
  const rows=arr.map(p=>{
    const det=p.method==='Cheque'?chequeDetails9234(p):esc9234(p.note||'-');
    return `<tr><td>${fmt9234(p.date)}</td><td><b>${esc9234(p.method||'PIX')}</b></td><td>${money9234(p.value)}</td><td>${det}</td><td><button type="button" class="danger" data-remove-pay9234="${esc9234(p.id)}">Excluir</button></td></tr>`;
  }).join('');
  return `<div style="overflow:auto"><table><thead><tr><th>Data</th><th>Forma</th><th>Valor</th><th>Detalhes</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function wire9234(id){
  const method=document.getElementById('acMethod9234'),cheque=document.getElementById('acChequeFields9234');
  function toggle(){if(cheque)cheque.style.display=method?.value==='Cheque'?'block':'none'}
  method?.addEventListener('change',toggle);
  document.querySelectorAll('.acTab9234').forEach(b=>b.addEventListener('click',()=>{if(method)method.value=b.dataset.method;document.querySelectorAll('.acTab9234').forEach(x=>x.classList.remove('primary'));b.classList.add('primary');toggle()}));
  document.querySelectorAll('[data-remove-pay9234]').forEach(b=>b.onclick=()=>window.hlgbRemoveProjectionPayment9234(id,b.getAttribute('data-remove-pay9234')));
  document.querySelectorAll('[data-cheque-photo9234]').forEach(b=>b.onclick=()=>window.hlgbViewChequePhoto9234(id,b.getAttribute('data-cheque-photo9234')));
  const first=document.querySelector('.acTab9234[data-method="PIX"]');if(first)first.classList.add('primary');toggle();
}
function open9234(id){
  const inv=invoice9234(id);if(!inv)return;
  const paid=paid9234(inv),rem=remaining9234(inv),hist=history9234(inv);
  const body=`<div class="cards" style="margin-bottom:14px"><div class="card"><small>Total da nota</small><strong>${money9234(inv.value)}</strong></div><div class="card"><small>Já recebido</small><strong>${money9234(paid)}</strong></div><div class="card"><small>Saldo restante</small><strong>${money9234(rem)}</strong></div></div>
  <div class="sub" style="margin-bottom:8px">Pagamento picado: lance cada recebimento separadamente, com a data e a forma corretas. O histórico fica guardado abaixo.</div>
  <div class="hlgb9234-methods">
   <button type="button" class="secondary acTab9234" data-method="PIX">💠 PIX</button>
   <button type="button" class="secondary acTab9234" data-method="Cheque">🧾 Cheque</button>
   <button type="button" class="secondary acTab9234" data-method="Dinheiro">💵 Dinheiro</button>
   <button type="button" class="secondary acTab9234" data-method="Transferência">🏦 Transferência</button>
   <button type="button" class="secondary acTab9234" data-method="Outro">➕ Outro</button>
  </div>
  <div class="panel hlgb9234-pay-panel"><h3 style="margin-top:0">Lançar recebimento</h3>
   <div class="grid"><div class="field"><label>Forma de pagamento</label><select id="acMethod9234"><option>PIX</option><option>Cheque</option><option>Dinheiro</option><option>Transferência</option><option>Outro</option></select></div><div class="field"><label>Valor recebido</label><input id="acValue9234" type="number" step="0.01" min="0.01" max="${rem}" value="${rem.toFixed(2)}"></div><div class="field"><label>Data do recebimento</label><input id="acDate9234" type="date" value="${today9234()}"></div><div class="field"><label>Observação</label><input id="acNote9234" placeholder="Opcional"></div></div>
   <div id="acChequeFields9234" class="hlgb9234-cheque" style="display:none"><strong>Dados do cheque</strong><div class="grid" style="margin-top:10px"><div class="field"><label>Data do cheque</label><input id="acChequeDate9234" type="date" value="${today9234()}"></div><div class="field"><label>Dono do cheque</label><input id="acChequeOwner9234" placeholder="Nome de quem emitiu"></div><div class="field"><label>Número do cheque</label><input id="acChequeNumber9234" placeholder="Ex.: 123456"></div><div class="field"><label>Foto do cheque</label><input id="acChequePhoto9234" type="file" accept="image/*"><div class="sub">Opcional · até 5 MB.</div></div></div></div>
   <button type="button" class="primary" id="acSave9234" style="margin-top:12px">💾 Salvar recebimento e dar baixa</button><div id="acFeedback9234" class="hlgb9234-feedback"></div>
  </div>
  <div class="hlgb9234-history"><h3>Histórico do acerto</h3>${hist}</div>`;
  openModal(`Acerto do cliente — ${esc9234(inv.client||inv.clientName||'Cliente')}`,body,()=>{});
  wire9234(id);
  const btn=document.getElementById('acSave9234');if(btn)btn.onclick=()=>window.hlgbSaveProjectionPayment9234(id);
}
async function fileData9234(file){
  if(!file)return '';
  if(file.size>5*1024*1024)throw new Error('A foto do cheque deve ter no máximo 5 MB.');
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Não foi possível ler a foto do cheque.'));r.readAsDataURL(file)});
}
window.hlgbSaveProjectionPayment9234=async function(id){
  const current=invoice9234(id);if(!current)return;
  const rem=remaining9234(current),value=q9234(document.getElementById('acValue9234')?.value),method=document.getElementById('acMethod9234')?.value||'PIX',date=document.getElementById('acDate9234')?.value||today9234(),note=document.getElementById('acNote9234')?.value?.trim()||'';
  if(value<=0||value>rem+.009){alert('Informe um valor válido até o saldo restante de '+money9234(rem)+'.');return}
  let cheque=null;
  try{
    if(method==='Cheque'){
      const cdate=document.getElementById('acChequeDate9234')?.value||'',owner=document.getElementById('acChequeOwner9234')?.value?.trim()||'',number=document.getElementById('acChequeNumber9234')?.value?.trim()||'',file=document.getElementById('acChequePhoto9234')?.files?.[0]||null;
      if(!cdate){alert('Informe a data do cheque.');return}
      if(!owner){alert('Informe o dono do cheque.');return}
      cheque={date:cdate,owner,number,photo:await fileData9234(file)};
    }
  }catch(e){alert(e.message);return}
  const originalInv=clone9234(current),nextInv=clone9234(current);nextInv.paymentHistory=Array.isArray(nextInv.paymentHistory)?nextInv.paymentHistory:[];
  nextInv.paymentHistory.push({id:Date.now()+Math.floor(Math.random()*1000),date,method,value:+value.toFixed(2),note,...(cheque?{cheque}: {})});
  nextInv.paid=nextInv.paymentHistory.reduce((s,p)=>s+q9234(p.value),0);nextInv.remaining=Math.max(0,q9234(nextInv.value)-nextInv.paid);nextInv.status=nextInv.remaining<=.009?'Pago':nextInv.paid>0?'Parcial':'Pendente';nextInv.updatedAt=new Date().toISOString();
  const currentFin=finance9234(current),originalFin=currentFin?clone9234(currentFin):null,nextFin=currentFin?{...clone9234(currentFin),paid:nextInv.paid,remaining:nextInv.remaining,status:nextInv.status,updatedAt:new Date().toISOString()}:null;
  const btn=document.getElementById('acSave9234');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando na nuvem…'}
  let invoiceSaved=false;
  try{
    const savedInv=await saveRow9234('projectionInvoices',nextInv);invoiceSaved=true;
    const savedFin=nextFin?await saveRow9234('finance',nextFin):null;
    replaceLocal9234('projectionInvoices',nextInv.id,savedInv);if(savedFin)replaceLocal9234('finance',nextFin.id,savedFin);
    try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
    renderAll9234();open9234(id);
    const fb=document.getElementById('acFeedback9234');if(fb){fb.style.display='block';fb.textContent='✅ Recebimento salvo. Saldo atual: '+money9234(nextInv.remaining)}
  }catch(err){
    if(invoiceSaved){try{await saveRow9234('projectionInvoices',originalInv)}catch(_){} }
    if(originalFin){try{await saveRow9234('finance',originalFin)}catch(_){} }
    if(btn){btn.disabled=false;btn.textContent='💾 Salvar recebimento e dar baixa'}
    alert('Não foi possível confirmar este recebimento na nuvem. Nenhum dado local foi alterado. '+String(err?.message||err));
  }
};
window.hlgbRemoveProjectionPayment9234=async function(id,payId){
  const current=invoice9234(id);if(!current)return;
  if(!confirm('Excluir este recebimento e recalcular o saldo?'))return;
  const originalInv=clone9234(current),nextInv=clone9234(current);nextInv.paymentHistory=(Array.isArray(nextInv.paymentHistory)?nextInv.paymentHistory:[]).filter(p=>String(p.id)!==String(payId));
  nextInv.paid=nextInv.paymentHistory.reduce((s,p)=>s+q9234(p.value),0);nextInv.remaining=Math.max(0,q9234(nextInv.value)-nextInv.paid);nextInv.status=nextInv.remaining<=.009?'Pago':nextInv.paid>0?'Parcial':'Pendente';nextInv.updatedAt=new Date().toISOString();
  const currentFin=finance9234(current),originalFin=currentFin?clone9234(currentFin):null,nextFin=currentFin?{...clone9234(currentFin),paid:nextInv.paid,remaining:nextInv.remaining,status:nextInv.status,updatedAt:new Date().toISOString()}:null;
  let invoiceSaved=false;
  try{
    const savedInv=await saveRow9234('projectionInvoices',nextInv);invoiceSaved=true;const savedFin=nextFin?await saveRow9234('finance',nextFin):null;
    replaceLocal9234('projectionInvoices',nextInv.id,savedInv);if(savedFin)replaceLocal9234('finance',nextFin.id,savedFin);try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){};renderAll9234();open9234(id);
  }catch(err){
    if(invoiceSaved){try{await saveRow9234('projectionInvoices',originalInv)}catch(_){} }if(originalFin){try{await saveRow9234('finance',originalFin)}catch(_){} }alert('Não foi possível excluir o recebimento: '+String(err?.message||err));
  }
};
window.hlgbViewChequePhoto9234=function(id,payId){
  const inv=invoice9234(id),p=payments9234(inv).find(x=>String(x.id)===String(payId)),src=p?.cheque?.photo||'';if(!src){alert('Este cheque não tem foto salva.');return}
  const w=window.open('','_blank','width=900,height=700');if(!w){alert('O navegador bloqueou a janela da foto.');return}w.document.write(`<title>Cheque</title><body style="margin:0;background:#222;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${src}" style="max-width:96vw;max-height:96vh;object-fit:contain"></body>`);w.document.close();
};
window.openProjectionAcerto9234=open9234;
window.openProjectionAcerto9200=open9234;
window.openProjectionAcerto9214=open9234;

function stamp9234(){try{document.title='HLGB Confecções — Sistema de Gestão v92.34 Multiusuário'}catch(e){}const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.34'}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{[600,1800,4200,9000].forEach(ms=>setTimeout(stamp9234,ms))},0);else setTimeout(stamp9234,900);window.addEventListener('focus',()=>setTimeout(stamp9234,30));
console.log('[HLGB] v92.34 acerto detalhado de clientes restaurado');
})();
</script>
<!-- HLGB_V9234_CLIENT_SETTLEMENT_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.34</title><script>(function(){window.location.replace(\'./app9234.html?v=92.34&fresh=\'+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>',encoding='utf-8')
print('v92.34 preparada: somente acerto detalhado de clientes')
