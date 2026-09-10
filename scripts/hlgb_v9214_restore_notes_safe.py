from pathlib import Path
import re

src=Path('app9213.html')
out=Path('app9214.html')
s=src.read_text(encoding='utf-8')

START='<!-- HLGB_V9214_NOTES_START -->'
END='<!-- HLGB_V9214_NOTES_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

addon=r'''<!-- HLGB_V9214_NOTES_START -->
<style>
#projectionNotes9214{margin:14px 0}.hlgb9214-muted{font-size:12px;opacity:.72}.hlgb9214-ok{color:#147a42;font-weight:700}.hlgb9214-warn{color:#a66300;font-weight:700}
</style>
<script>
(function(){
'use strict';
const money9214=v=>{try{return (+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+(+v||0).toFixed(2)}};
const esc9214=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const today9214=()=>new Date().toISOString().slice(0,10);
const clone9214=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
async function saveRow9214(module,row){
  if(!row||row.id==null)throw new Error('Registro sem id');
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Camada de nuvem indisponível');
  const r=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9214(row),false);
  if(!r||r.applied===false)throw new Error(r?.reason||'Nuvem recusou a alteração');
  return r.data||row;
}
function paid9214(inv){
  if(Array.isArray(inv.paymentHistory)&&inv.paymentHistory.length)return inv.paymentHistory.reduce((s,p)=>s+(+p.value||0),0);
  const f=(db.finance||[]).find(x=>String(x.projectionInvoiceId)===String(inv.id));
  return +f?.paid||+inv.paid||0;
}
function rem9214(inv){return Math.max(0,(+inv.value||0)-paid9214(inv))}
function st9214(inv){const p=paid9214(inv),r=rem9214(inv);return r<=.009?'Pago':p>0?'Parcial':'Pendente'}
function ensurePanel9214(){
  const anchor=document.getElementById('orderNotesTable')||document.getElementById('allOrderNotesTable');
  if(!anchor)return false;
  let box=document.getElementById('projectionNotes9214');
  if(!box){box=document.createElement('div');box.id='projectionNotes9214';box.className='panel';const base=anchor.closest('.panel')||anchor;base.parentElement.insertBefore(box,base)}
  return true;
}
function render9214(){
  if(!ensurePanel9214())return;
  const invs=[...(db.projectionInvoices||[])].sort((a,b)=>String(b.issueDate||b.date||'').localeCompare(String(a.issueDate||a.date||'')));
  const box=document.getElementById('projectionNotes9214');
  box.innerHTML=`<h3 style="margin-top:0">Notas de entregas</h3><div class="hlgb9214-muted">Notas geradas pela Projeção/entrega também aparecem aqui. Use Acerto para registrar pagamentos parciais até quitar.</div>${invs.length?`<div style="overflow:auto;margin-top:10px"><table><thead><tr><th>Cliente</th><th>Data</th><th>Produtos</th><th>Peças</th><th>Total</th><th>Recebido</th><th>Saldo</th><th>Status</th><th>Ação</th></tr></thead><tbody>${invs.map(inv=>{const qty=(inv.items||[]).reduce((s,i)=>s+(+i.qty||0),0),p=paid9214(inv),r=rem9214(inv),st=st9214(inv);return `<tr><td>${esc9214(inv.client||inv.clientName||'')}</td><td>${esc9214(inv.issueDate||inv.date||'')}</td><td>${esc9214((inv.items||[]).map(i=>i.productName).filter(Boolean).join(', '))}</td><td>${qty.toLocaleString('pt-BR')}</td><td>${money9214(inv.value)}</td><td>${money9214(p)}</td><td>${money9214(r)}</td><td><span class="${st==='Pago'?'hlgb9214-ok':'hlgb9214-warn'}">${st}</span></td><td><button class="primary" type="button" data-acerto9214="${esc9214(inv.id)}">💰 Acerto</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty" style="margin-top:10px">Nenhuma nota de entrega encontrada.</div>'}`;
  box.querySelectorAll('[data-acerto9214]').forEach(b=>b.onclick=()=>window.openProjectionAcerto9214(b.getAttribute('data-acerto9214')));
}
window.openProjectionAcerto9214=function(id){
  const inv=(db.projectionInvoices||[]).find(x=>String(x.id)===String(id));if(!inv)return;
  inv.paymentHistory=Array.isArray(inv.paymentHistory)?inv.paymentHistory:[];
  const p=paid9214(inv),r=rem9214(inv);
  const hist=inv.paymentHistory.map(x=>`<tr><td>${esc9214(x.date)}</td><td>${esc9214(x.method)}</td><td>${money9214(x.value)}</td><td>${esc9214(x.note||'')}</td></tr>`).join('');
  openModal(`Acerto — ${esc9214(inv.client||inv.clientName||'Cliente')}`,`<div class="cards"><div class="card"><small>Total</small><strong>${money9214(inv.value)}</strong></div><div class="card"><small>Já recebido</small><strong>${money9214(p)}</strong></div><div class="card"><small>Saldo</small><strong>${money9214(r)}</strong></div></div><div class="grid" style="margin-top:12px"><div class="field"><label>Valor recebido agora</label><input id="paValue9214" type="number" min="0.01" max="${r}" step="0.01" value="${r.toFixed(2)}"></div><div class="field"><label>Data</label><input id="paDate9214" type="date" value="${today9214()}"></div><div class="field"><label>Forma</label><select id="paMethod9214"><option>PIX</option><option>Cheque</option><option>Dinheiro</option><option>Transferência</option></select></div><div class="field"><label>Observação</label><input id="paNote9214" placeholder="Opcional"></div></div>${hist?`<div style="overflow:auto;margin-top:12px"><table><thead><tr><th>Data</th><th>Forma</th><th>Valor</th><th>Observação</th></tr></thead><tbody>${hist}</tbody></table></div>`:''}<button type="button" class="primary modalSave">Salvar acerto</button>`,async()=>{
    const value=+document.getElementById('paValue9214')?.value||0;
    const saldo=rem9214(inv);if(value<=0||value>saldo+.009){alert('Informe um valor válido até o saldo restante.');return false}
    const entry={id:Date.now(),date:document.getElementById('paDate9214')?.value||today9214(),method:document.getElementById('paMethod9214')?.value||'PIX',value:+value.toFixed(2),note:document.getElementById('paNote9214')?.value?.trim()||''};
    inv.paymentHistory.push(entry);inv.paid=paid9214(inv);inv.remaining=rem9214(inv);inv.status=st9214(inv);inv.updatedAt=new Date().toISOString();
    const fin=(db.finance||[]).find(x=>String(x.projectionInvoiceId)===String(inv.id));if(fin){fin.paid=inv.paid;fin.remaining=inv.remaining;fin.status=inv.status;fin.updatedAt=inv.updatedAt}
    try{await saveRow9214('projectionInvoices',inv);if(fin)await saveRow9214('finance',fin);try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}closeModal();render9214();try{if(typeof renderFinance==='function')renderFinance()}catch(e){}alert('Acerto salvo. Saldo restante: '+money9214(inv.remaining));return true}catch(err){inv.paymentHistory=inv.paymentHistory.filter(x=>x!==entry);alert('Não foi possível confirmar o acerto na nuvem: '+String(err?.message||err));return false}
  });
};
window.renderNotes9214=render9214;
if(typeof window.renderOrderNotes==='function'){
  const original9214=window.renderOrderNotes;
  window.renderOrderNotes=function(){const r=original9214.apply(this,arguments);setTimeout(render9214,0);return r};
}
document.addEventListener('click',function(e){const b=e.target&&e.target.closest?e.target.closest('button'):null;if(!b)return;const t=String(b.textContent||'').trim().toLowerCase();if(t==='notas prontas'||t.includes('notas prontas'))setTimeout(render9214,80)},true);
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(render9214,150),0);else setTimeout(render9214,1200);
console.log('[HLGB] v92.14 notas central/acerto carregado sem observer global');
})();
</script>
<!-- HLGB_V9214_NOTES_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.13 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.14 Multiusuário</title>')
s=s.replace('Versão v91.90</b>','Versão v92.14</b>')
s=s.replace('<small style="font-size:10px;opacity:.8">v92.04</small>','<small style="font-size:10px;opacity:.8">v92.14</small>')
out.write_text(s,encoding='utf-8')

Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.14</title><script>(function(){window.location.replace('./app9214.html?v=92.14&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.14 notas restauradas em página separada')
