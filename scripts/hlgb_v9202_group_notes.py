from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9202_START -->'
END='<!-- HLGB_V9202_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]
addon=r'''<!-- HLGB_V9202_START -->
<script>
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const money=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function openInvoices(){return (db.projectionInvoices||[]).filter(x=>String(x.status||'Pendente').toLowerCase()!=='pago')}
function enhance(){
 const box=document.getElementById('projectionNotes9200');if(!box)return;
 if(!document.getElementById('mergeNotes9202')){
   const bar=document.createElement('div');bar.id='mergeNotes9202';bar.style='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0';
   bar.innerHTML='<button type="button" class="secondary" onclick="window.openMergeNotes9202()">🧾 Agrupar notas do cliente</button><span class="sub">Junte várias entregas/produtos do mesmo cliente em uma única nota.</span>';
   const h=box.querySelector('h3');if(h)h.insertAdjacentElement('afterend',bar);else box.prepend(bar);
 }
}
window.openMergeNotes9202=function(){
 const invs=openInvoices();
 const clients=[...new Set(invs.map(x=>x.client).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
 if(!clients.length){alert('Não há notas em aberto para agrupar.');return}
 openModal('Agrupar notas do cliente',`<div class="field"><label>Cliente</label><select id="mgClient9202" onchange="window.renderMergeCandidates9202()"><option value="">Selecione</option>${clients.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div id="mgCandidates9202" style="margin-top:12px"></div><button type="button" class="primary modalSave">Agrupar selecionadas</button>`,()=>window.mergeSelected9202());
}
window.renderMergeCandidates9202=function(){
 const client=document.getElementById('mgClient9202')?.value||'';
 const list=openInvoices().filter(x=>String(x.client)===client);
 const el=document.getElementById('mgCandidates9202');if(!el)return;
 el.innerHTML=list.length?`<div style="overflow:auto"><table><thead><tr><th></th><th>Data</th><th>Produtos</th><th>Peças</th><th>Valor</th></tr></thead><tbody>${list.map(x=>{const q=(x.items||[]).reduce((s,i)=>s+(+i.qty||0),0);return `<tr><td><input class="mgInv9202" type="checkbox" value="${esc(x.id)}"></td><td>${esc(x.issueDate||x.date||'')}</td><td>${esc((x.items||[]).map(i=>i.productName).filter(Boolean).join(', '))}</td><td>${q.toLocaleString('pt-BR')}</td><td>${money(x.value)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma nota em aberto deste cliente.</div>';
}
window.mergeSelected9202=function(){
 const ids=[...document.querySelectorAll('.mgInv9202:checked')].map(x=>String(x.value));
 if(ids.length<2){alert('Selecione pelo menos duas notas para agrupar.');return}
 const src=ids.map(id=>(db.projectionInvoices||[]).find(x=>String(x.id)===id)).filter(Boolean);
 if(src.length<2)return;
 const client=src[0].client;if(src.some(x=>String(x.client)!==String(client))){alert('Só é possível agrupar notas do mesmo cliente.');return}
 const merged={id:Date.now(),client,clientId:src[0].clientId||null,sourceClient:src[0].sourceClient||client,items:src.flatMap(x=>x.items||[]),date:new Date().toISOString().slice(0,10),issueDate:new Date().toISOString().slice(0,10),dueDate:src.map(x=>x.dueDate||x.issueDate||x.date).filter(Boolean).sort()[0]||new Date().toISOString().slice(0,10),value:src.reduce((s,x)=>s+(+x.value||0),0),terms:src[0].terms||'À vista',termsDetail:'Agrupada de '+src.map(x=>'#'+x.id).join(', '),status:'Pendente',mergedFrom:src.map(x=>x.id),paymentHistory:[]};
 db.projectionInvoices.push(merged);
 src.forEach(x=>{x.status='Agrupada';x.mergedInto=merged.id;x.groupedAt=new Date().toISOString()});
 try{if(typeof save==='function')save()}catch(e){}
 closeModal();try{if(typeof window.renderNotes9200==='function')window.renderNotes9200()}catch(e){};setTimeout(enhance,50);alert('Notas agrupadas em uma única nota de '+money(merged.value)+'.');
}
const old=window.renderNotes9200;if(typeof old==='function')window.renderNotes9200=function(){const r=old.apply(this,arguments);setTimeout(enhance,0);return r};
const mo=new MutationObserver(enhance);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(enhance,600);setTimeout(enhance,1800);
console.log('[HLGB] v92.02 agrupamento de notas carregado');
})();
</script>
<!-- HLGB_V9202_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v92.01','v92.02')
p.write_text(s,encoding='utf-8')
print('v92.02 aplicada',len(s))
