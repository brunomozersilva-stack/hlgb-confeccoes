from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9200_START -->'
END='<!-- HLGB_V9200_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END)
    s=s[:a]+s[b:]
addon=r'''<!-- HLGB_V9200_START -->
<style>
#projectionNotes9200{margin:14px 0}.hlgb9200-muted{font-size:12px;opacity:.72}.hlgb9200-ok{color:#147a42;font-weight:700}.hlgb9200-warn{color:#a66300;font-weight:700}
</style>
<script>
(function(){
'use strict';
const money9200=v=>{try{return (+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+(+v||0).toFixed(2)}};
const esc9200=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const today9200=()=>new Date().toISOString().slice(0,10);
const clone9200=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
async function saveRow9200(module,row){
  if(!row||row.id==null)throw new Error('Registro sem id');
  if(typeof cloudEnsureFreshSession==='function'){try{await cloudEnsureFreshSession(false)}catch(e){}}
  if(typeof window.hlgbRecordSaveWithRetry==='function'){
    const out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9200(row),false);
    if(out&&out.applied===false)throw new Error(out.reason||'Nuvem recusou a alteração');
    return out?.data||row;
  }
  if(typeof save==='function'){save();return row}
  throw new Error('Camada de nuvem indisponível');
}
function local9200(){try{if(typeof localSaveOnly==='function')localSaveOnly();else localStorage.setItem('hlgb_db',JSON.stringify(db))}catch(e){}}
function paid9200(inv){
  if(Array.isArray(inv.paymentHistory)&&inv.paymentHistory.length)return inv.paymentHistory.reduce((s,p)=>s+(+p.value||0),0);
  const f=(db.finance||[]).find(x=>String(x.projectionInvoiceId)===String(inv.id));
  return +f?.paid||+inv.paid||0;
}
function rem9200(inv){return Math.max(0,(+inv.value||0)-paid9200(inv))}
function st9200(inv){const p=paid9200(inv),r=rem9200(inv);return r<=.009?'Pago':p>0?'Parcial':'Pendente'}
function ensurePanel9200(){
  const anchor=document.getElementById('orderNotesTable')||document.getElementById('allOrderNotesTable'); if(!anchor)return false;
  let box=document.getElementById('projectionNotes9200');
  if(!box){box=document.createElement('div');box.id='projectionNotes9200';box.className='panel';const base=anchor.closest('.panel')||anchor; base.parentElement.insertBefore(box,base)}
  return true;
}
function render9200(){
  if(!ensurePanel9200())return;
  const invs=[...(db.projectionInvoices||[])].sort((a,b)=>String(b.issueDate||b.date||'').localeCompare(String(a.issueDate||a.date||'')));
  const box=document.getElementById('projectionNotes9200');
  box.innerHTML=`<h3 style="margin-top:0">Notas de entregas</h3><div class="hlgb9200-muted">Notas geradas anteriormente pela Projeção/entrega aparecem aqui também. Use Acerto para registrar pagamentos parciais até quitar.</div>${invs.length?`<div style="overflow:auto;margin-top:10px"><table><thead><tr><th>Cliente</th><th>Data</th><th>Produtos</th><th>Peças</th><th>Total</th><th>Recebido</th><th>Saldo</th><th>Status</th><th>Ação</th></tr></thead><tbody>${invs.map(inv=>{const q=(inv.items||[]).reduce((s,i)=>s+(+i.qty||0),0),p=paid9200(inv),r=rem9200(inv),st=st9200(inv);return `<tr><td>${esc9200(inv.client||'')}</td><td>${esc9200(inv.issueDate||inv.date||'')}</td><td>${esc9200((inv.items||[]).map(i=>i.productName).filter(Boolean).join(', '))}</td><td>${q.toLocaleString('pt-BR')}</td><td>${money9200(inv.value)}</td><td>${money9200(p)}</td><td>${money9200(r)}</td><td><span class="${st==='Pago'?'hlgb9200-ok':'hlgb9200-warn'}">${st}</span></td><td><button class="primary" type="button" onclick="window.openProjectionAcerto9200('${esc9200(inv.id)}')">💰 Acerto</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty" style="margin-top:10px">Nenhuma nota de entrega encontrada.</div>'}`;
}
window.openProjectionAcerto9200=function(id){
  const inv=(db.projectionInvoices||[]).find(x=>String(x.id)===String(id));if(!inv)return;
  inv.paymentHistory=Array.isArray(inv.paymentHistory)?inv.paymentHistory:[];
  const p=paid9200(inv),r=rem9200(inv);
  const hist=inv.paymentHistory.map(x=>`<tr><td>${esc9200(x.date)}</td><td>${esc9200(x.method)}</td><td>${money9200(x.value)}</td><td>${esc9200(x.note||'')}</td></tr>`).join('');
  openModal(`Acerto — ${esc9200(inv.client||'Cliente')}`,`<div class="cards"><div class="card"><small>Total</small><strong>${money9200(inv.value)}</strong></div><div class="card"><small>Já recebido</small><strong>${money9200(p)}</strong></div><div class="card"><small>Saldo</small><strong>${money9200(r)}</strong></div></div><div class="grid" style="margin-top:12px"><div class="field"><label>Valor recebido agora</label><input id="paValue9200" type="number" min="0.01" max="${r}" step="0.01" value="${r.toFixed(2)}"></div><div class="field"><label>Data</label><input id="paDate9200" type="date" value="${today9200()}"></div><div class="field"><label>Forma</label><select id="paMethod9200"><option>PIX</option><option>Cheque</option><option>Dinheiro</option><option>Transferência</option></select></div><div class="field"><label>Observação</label><input id="paNote9200" placeholder="Opcional"></div></div>${hist?`<div style="overflow:auto;margin-top:12px"><table><thead><tr><th>Data</th><th>Forma</th><th>Valor</th><th>Observação</th></tr></thead><tbody>${hist}</tbody></table></div>`:''}<button type="button" class="primary modalSave">Salvar acerto</button>`,async()=>{
    const value=+document.getElementById('paValue9200')?.value||0;
    const saldo=rem9200(inv);if(value<=0||value>saldo+.009){alert('Informe um valor válido até o saldo restante.');return}
    inv.paymentHistory.push({id:Date.now(),date:document.getElementById('paDate9200')?.value||today9200(),method:document.getElementById('paMethod9200')?.value||'PIX',value:+value.toFixed(2),note:document.getElementById('paNote9200')?.value?.trim()||''});
    inv.paid=paid9200(inv);inv.remaining=rem9200(inv);inv.status=st9200(inv);inv.updatedAt=new Date().toISOString();
    const fin=(db.finance||[]).find(x=>String(x.projectionInvoiceId)===String(inv.id));
    if(fin){fin.paid=inv.paid;fin.remaining=inv.remaining;fin.status=inv.status;fin.updatedAt=new Date().toISOString()}
    local9200();
    try{await saveRow9200('projectionInvoices',inv);if(fin)await saveRow9200('finance',fin);closeModal();render9200();try{if(typeof renderFinance==='function')renderFinance()}catch(e){};alert('Acerto salvo. Saldo restante: '+money9200(inv.remaining))}catch(err){alert('Não foi possível confirmar o acerto na nuvem: '+err.message)}
  });
}
window.renderNotes9200=render9200;
const oldNotes9200=window.renderOrderNotes;
if(typeof oldNotes9200==='function')window.renderOrderNotes=function(){const r=oldNotes9200.apply(this,arguments);setTimeout(render9200,0);return r};
const mo9200=new MutationObserver(()=>{if(document.getElementById('orderNotesTable')||document.getElementById('allOrderNotesTable'))render9200()});
mo9200.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(render9200,500);setTimeout(render9200,1600);
console.log('[HLGB] v92.00 notas centralizadas carregada');
})();
</script>
<!-- HLGB_V9200_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.99','v92.00')
p.write_text(s,encoding='utf-8')
print('v92.00 aplicada',len(s))
