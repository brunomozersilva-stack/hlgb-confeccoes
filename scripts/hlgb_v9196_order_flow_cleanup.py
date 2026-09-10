from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9196_START -->'
END='<!-- HLGB_V9196_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

# Versão visual atual.
s=s.replace('91.95','91.96')

# Produção continua como categoria, mas a página redundante deixa de aparecer no submenu.
s=s.replace('    <button onclick="page(\'producao\',this)">Produção</button>\n','')

# Novo status intermediário: produção física concluída, aguardando fechamento da nota.
s=s.replace('"Pedido em produção","Pedido finalizado"','"Pedido em produção","Aguardando nota","Pedido finalizado"')
s=s.replace("'Pedido em produção','Pedido finalizado'","'Pedido em produção','Aguardando nota','Pedido finalizado'")

# Não mostrar produção fisicamente concluída como produção ativa na página legada (mesmo que acessada por link antigo).
needle='function renderProduction(){'
if needle not in s:
    raise SystemExit('renderProduction não encontrada')
helper=r'''function hlgbProductionDone9196(p){
  const planned=Math.max(0,+p?.planned||0),done=Math.max(0,+p?.done||0);
  const st=String(p?.stage||'').toLowerCase();
  return !!p?.finishedAt || !!p?.productionCompletedAt || st.includes('conclu') || (planned>0&&done>=planned);
}
'''
s=s.replace(needle,helper+needle,1)
old='let arr=db.production.filter(p=>!f||p.stage===f);'
if old in s:
    s=s.replace(old,"let arr=db.production.filter(p=>!hlgbProductionDone9196(p)&&(!f||p.stage===f));",1)

# Painel de fila de notas: não cria nota automaticamente; mostra o que terminou a produção e aguarda a próxima nota.
anchor='<div id="allOrderNotesSummary" class="cards"></div>'
if anchor not in s:
    raise SystemExit('âncora da página Notas não encontrada')
notes_panel=r'''<div class="panel" id="hlgbReadyNote9196Panel">
  <h2>📦 Prontos para nota</h2>
  <div class="sub">Produtos cuja produção e eventuais faltas já foram concluídas. Aqui eles deixam de aparecer como “em produção” e seguem para a etapa de nota.</div>
  <div id="hlgbReadyNote9196Table"></div>
</div>
'''
s=s.replace(anchor,notes_panel+anchor,1)

block=r'''<!-- HLGB_V9196_START -->
<style id="hlgb-v9196-style">
#hlgbReadyNote9196Table .hlgb9196-ready{display:grid;grid-template-columns:minmax(150px,.7fr) minmax(190px,1.2fr) minmax(190px,1.3fr) minmax(140px,.7fr) minmax(190px,1fr) auto;gap:10px;align-items:center;padding:11px 8px;border-bottom:1px solid #eee5e9}
#hlgbReadyNote9196Table .hlgb9196-ready:last-child{border-bottom:0}.hlgb9196-ready small{display:block;color:#786c73;margin-top:2px}.hlgb9196-ready strong{font-size:13px}.hlgb9196-pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#fff1c9;color:#775300;font-size:11px;font-weight:800;border:1px solid #ead18b}
@media(max-width:900px){#hlgbReadyNote9196Table .hlgb9196-ready{grid-template-columns:1fr 1fr}.hlgb9196-ready button{width:100%}}
</style>
<script id="hlgb-v9196-script">
(function(){
'use strict';
const V9196='91.96';
const clone9196=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
const norm9196=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc9196=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const product9196=id=>(db.products||[]).find(p=>String(p.id)===String(id))||null;
function orderNumber9196(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id||'-')}catch(e){return o?.orderNumber||o?.id||'-'}}
function orderPids9196(o){return [...new Set((o?.grade||[]).map(g=>String(g?.productId??'')).filter(Boolean))]}
function orderProductQty9196(o,pid){return (o?.grade||[]).reduce((a,g)=>String(g?.productId??'')===String(pid)?a+Math.max(0,+g?.qty||0):a,0)}
function sourceProjection9196(o,pid){return o?.projectionItems?.[String(pid)]||o?.projectionItems?.[+pid]||null}
function clientAssignment9196(o,pid){return o?.productClientAssignments?.[String(pid)]||o?.productClientAssignments?.[+pid]||null}
function findCustomerOrder9196(m){
  const pid=String(m?.productId??''); if(!pid)return null;
  const sourceId=String(m?.sourceOrderId??m?.orderId??'');
  const source=(db.orders||[]).find(o=>String(o.id)===sourceId)||null;
  if(source&&source.clientId&&norm9196(source.client)!=='sem cliente')return source;
  const asg=source?clientAssignment9196(source,pid):null;
  const cid=String(m?.clientId??asg?.clientId??source?.clientId??'');
  if(!cid)return source;
  const all=(db.orders||[]).filter(o=>String(o.id)!==sourceId&&String(o.clientId??'')===cid&&orderProductQty9196(o,pid)>0&&!['cancelado','pedido finalizado'].includes(norm9196(o.status)));
  if(!all.length)return source;
  const sourceQty=source?orderProductQty9196(source,pid):0;
  const exact=sourceQty>0?all.filter(o=>orderProductQty9196(o,pid)===sourceQty):[];
  if(exact.length===1)return exact[0];
  if(exact.length>1){
    const prod=exact.filter(o=>norm9196(o.status)==='pedido em producao');
    if(prod.length===1)return prod[0];
    return null;
  }
  return all.length===1?all[0]:null;
}
function allOrderProductsReady9196(o){
  const ids=orderPids9196(o); if(!ids.length)return false;
  return ids.every(pid=>o?.fulfillmentByProduct?.[pid]?.completed===true);
}
async function saveRow9196(module,row){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordReady!=='undefined'&&!window.hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')await hlgbEnsureRecordsOnlineAfterLogin();
  if(typeof window.hlgbRecordSaveWithRetry!=='function'||!window.cloudAccessToken)throw new Error('A conexão com a nuvem ainda não está pronta.');
  const out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9196(row),false);
  if(!out||out.applied!==true)throw new Error('A nuvem não confirmou '+module+'.');
  return out;
}
function replaceLocal9196(module,id,backup){
  const arr=Array.isArray(db[module])?db[module]:[]; const idx=arr.findIndex(x=>String(x.id)===String(id));
  if(idx>=0)arr[idx]=backup;
}
function readyMeta9196(o,pid){return o?.fulfillmentByProduct?.[String(pid)]||null}
window.hlgbOpenReadyProjection9196=function(orderId,pid){
  const o=(db.orders||[]).find(x=>String(x.id)===String(orderId)); if(!o)return;
  try{page('projecao',document.querySelector("nav button[onclick*=\"page('projecao'\"]"))}catch(e){try{page('projecao')}catch(_e){}}
  setTimeout(()=>{
    const pe=document.getElementById('projectionProductFilter'),ce=document.getElementById('projectionClientFilter');
    if(pe)pe.value=product9196(pid)?.name||''; if(ce)ce.value=o.client||'';
    try{renderProjection()}catch(e){}
  },80);
};
function renderReadyForNote9196(){
  const box=document.getElementById('hlgbReadyNote9196Table'); if(!box)return;
  const rows=[];
  (db.orders||[]).forEach(o=>{
    if(norm9196(o.status)!=='aguardando nota'&&!o?.fulfillmentByProduct)return;
    orderPids9196(o).forEach(pid=>{
      const meta=readyMeta9196(o,pid); if(!meta?.completed)return;
      const qty=orderProductQty9196(o,pid),src=(db.orders||[]).find(x=>String(x.id)===String(meta.sourceOrderId||''))||o;
      const spi=sourceProjection9196(src,pid)||{};
      const already=Math.min(qty,Math.max(+meta.existingInvoicedQty||0,+spi.invoicedQty||0));
      rows.push({o,pid,meta,qty,already,left:Math.max(0,qty-already),name:product9196(pid)?.name||meta.product||'Produto'});
    });
  });
  if(!rows.length){box.innerHTML='<div class="empty">Nenhum produto aguardando nota.</div>';return}
  box.innerHTML=rows.map(r=>`<div class="hlgb9196-ready">
    <div><strong>Pedido #${esc9196(orderNumber9196(r.o))}</strong><small>${esc9196(r.o.client||'-')}</small></div>
    <div><strong>${esc9196(r.name)}</strong><small>${r.qty.toLocaleString('pt-BR')} peça(s) concluídas</small></div>
    <div><span class="hlgb9196-pill">Aguardando nota</span><small>Produção concluída em ${esc9196(r.meta.completedAt||'-')}</small></div>
    <div><strong>${r.already.toLocaleString('pt-BR')}</strong><small>já lançada(s) em nota</small></div>
    <div><strong>${r.left.toLocaleString('pt-BR')}</strong><small>saldo para a próxima nota</small></div>
    <button type="button" class="secondary" onclick="hlgbOpenReadyProjection9196('${esc9196(r.o.id)}','${esc9196(r.pid)}')">Abrir projeção</button>
  </div>`).join('');
}
window.renderReadyForNote9196=renderReadyForNote9196;
const oldRenderNotes9196=window.renderOrderNotes;
if(typeof oldRenderNotes9196==='function')window.renderOrderNotes=function(){const out=oldRenderNotes9196.apply(this,arguments);try{renderReadyForNote9196()}catch(e){}return out};

// Baixa crítica: falta, produção e pedido da cliente só fecham depois da confirmação da nuvem.
window.abateMissingPiece=function(id){
  const m=(db.missingPieces||[]).find(x=>String(x.id)===String(id)); if(!m)return;
  openModal('Abater / recuperar ocorrência',`
   <div class="grid">
    <div class="field"><label>Produto</label><input value="${esc9196(m.product||'-')}" disabled></div>
    <div class="field"><label>Tipo</label><input value="${esc9196(m.issueType||'Peça faltante')}" disabled></div>
    <div class="field"><label>Pendente</label><input value="${Math.max(0,+m.remainingQty||0)}" disabled></div>
    <div class="field"><label>Quantidade para abater</label><input id="missingAbateQty" type="number" min="1" max="${Math.max(0,+m.remainingQty||0)}" value="${Math.max(0,+m.remainingQty||0)}"></div>
    <div class="field"><label>Data</label><input id="missingAbateDate" type="date" value="${typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Observação</label><input id="missingAbateNote" placeholder="Ex.: peça localizada / reposta"></div>
   </div>
   <div class="sub" style="margin-top:10px">Ao zerar a falta, o sistema também atualiza a quantidade realmente produzida. Se o pedido da cliente estiver totalmente atendido, ele sai de Produção e entra em Prontos para nota.</div>
   <button type="button" class="primary modalSave">☁️ Confirmar baixa</button>`,async()=>{
     const q=Math.max(0,+document.getElementById('missingAbateQty')?.value||0),open=Math.max(0,+m.remainingQty||0);
     if(q<=0||q>open){alert('Informe uma quantidade válida.');return false}
     const date=document.getElementById('missingAbateDate')?.value||(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10));
     const note=document.getElementById('missingAbateNote')?.value?.trim()||'Peça localizada / reposta';
     const sourceId=String(m.sourceOrderId??m.orderId??''),pid=String(m.productId??'');
     const mBackup=clone9196(m);
     const prods=(db.production||[]).filter(p=>String(p.productId??'')===pid&&(String(p.orderId??'')===sourceId||String(p.customerOrderId??'')===String(m.orderId??'')));
     const prodBackups=prods.map(p=>[p.id,clone9196(p)]);
     const customer=findCustomerOrder9196(m),customerBackup=customer?clone9196(customer):null;
     const customerCuts=customer?(db.cuts||[]).filter(c=>String(c.orderId??'')===String(customer.id)&&String(c.productId??'')===pid&&!['finalizado','finalizada'].includes(norm9196(c.status))):[];
     const cutBackups=customerCuts.map(c=>[c.id,clone9196(c)]);
     const btn=document.querySelector('#modal .modalSave'); if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando na nuvem…'}
     try{
       m.history=Array.isArray(m.history)?m.history:[];
       m.history.push({id:Date.now(),qty:q,date,note,source:'baixa_v9196'});
       m.recoveredQty=Math.min(Math.max(0,+m.originalQty||open),Math.max(0,+m.recoveredQty||0)+q);
       m.remainingQty=Math.max(0,open-q); m.status=m.remainingQty<=0?'Resolvido':'Parcial'; m.lastRecoveredAt=date;
       let left=q;
       prods.slice().sort((a,b)=>(+a.id||0)-(+b.id||0)).forEach(p=>{
         if(left<=0)return; const room=Math.max(0,(+p.planned||0)-(+p.done||0)),add=Math.min(left,room); if(add<=0)return;
         p.done=(+p.done||0)+add; left-=add; p.lastRecoveryAt=date;
         if((+p.planned||0)>0&&(+p.done||0)>=(+p.planned||0)){p.done=+p.planned||+p.done||0;p.stage='Produção concluída';p.finishedAt=date;p.productionCompletedAt=date}
       });
       const prodComplete=prods.length>0&&prods.every(p=>(+p.planned||0)>0&&(+p.done||0)>=(+p.planned||0));
       if(customer&&String(customer.id)!==sourceId){m.sourceOrderId=sourceId;m.orderId=customer.id;m.clientId=customer.clientId||m.clientId;m.client=customer.client||m.client;prods.forEach(p=>p.customerOrderId=customer.id)}
       if(customer&&prodComplete&&m.remainingQty<=0){
         customer.fulfillmentByProduct=customer.fulfillmentByProduct||{};
         const source=(db.orders||[]).find(o=>String(o.id)===sourceId)||customer,spi=sourceProjection9196(source,pid)||{};
         customer.fulfillmentByProduct[pid]={...(customer.fulfillmentByProduct[pid]||{}),completed:true,completedAt:date,product:m.product||product9196(pid)?.name||'',sourceOrderId:sourceId,productionIds:prods.map(p=>p.id),existingInvoicedQty:Math.max(0,+spi.invoicedQty||0)};
         customer.productionCompletedAt=date; customer.noteSourceOrderId=sourceId;
         if(allOrderProductsReady9196(customer))customer.status='Aguardando nota';
         customerCuts.forEach(c=>{c.status='Atendido por produção';c.done=true;c.finishedAt=date;c.fulfilledByOrderId=sourceId;c.fulfilledAt=date});
       }
       // Salva o estado físico e o pedido antes de fechar a falta. Assim a falta nunca aparece resolvida se as outras etapas falharem.
       for(const p of prods)await saveRow9196('production',p);
       if(customer)await saveRow9196('orders',customer);
       for(const c of customerCuts)await saveRow9196('cuts',c);
       await saveRow9196('missingPieces',m);
       try{localSaveOnly()}catch(e){}
       closeModal();
       try{renderMissingPieces()}catch(e){}try{renderProduction()}catch(e){}try{renderProjection()}catch(e){}try{renderOrderNotes()}catch(e){}try{renderReadyForNote9196()}catch(e){}
       return true;
     }catch(e){
       console.error('HLGB v91.96 baixa',e); replaceLocal9196('missingPieces',m.id,mBackup); prodBackups.forEach(([id,b])=>replaceLocal9196('production',id,b)); if(customer&&customerBackup)replaceLocal9196('orders',customer.id,customerBackup); cutBackups.forEach(([id,b])=>replaceLocal9196('cuts',id,b));
       try{localSaveOnly()}catch(_e){}; if(btn){btn.disabled=false;btn.textContent='☁️ Confirmar baixa'}
       alert('A baixa não foi concluída porque a nuvem não confirmou todas as etapas. Tente novamente. '+String(e?.message||e)); return false;
     }
   });
};

function boot9196(){
  try{renderReadyForNote9196()}catch(e){}
  // Segurança: se algum link antigo abrir Produção, os concluídos continuam fora da lista ativa.
  const legacy=[...document.querySelectorAll('nav button')].find(b=>String(b.getAttribute('onclick')||'').includes("page('producao'"));if(legacy)legacy.remove();
}
setTimeout(boot9196,800);window.addEventListener('focus',()=>setTimeout(boot9196,100));
})();
</script>
<!-- HLGB_V9196_END -->'''

if '</body>' not in s:
    raise SystemExit('body final não encontrado')
s=s.replace('</body>',block+'\n</body>',1)

# Guardas de segurança.
assert START in s and END in s
assert 'hlgbReadyNote9196Table' in s
assert 'window.abateMissingPiece=function' in s
assert 'Aguardando nota' in s
assert '<button onclick="page(\'producao\',this)">Produção</button>' not in s
assert len(s)>1_000_000

# Valida todos os blocos JavaScript com Node.
scripts=re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',s,re.I)
with tempfile.TemporaryDirectory() as td:
    for i,js in enumerate(scripts):
        f=Path(td)/f's{i}.js'; f.write_text(js,encoding='utf-8')
        r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
        if r.returncode:
            raise SystemExit(f'JS inválido no bloco {i}: {r.stderr}')

p.write_text(s,encoding='utf-8')
print('HLGB v91.96 aplicado:',len(s),'bytes,',len(scripts),'scripts validados')
