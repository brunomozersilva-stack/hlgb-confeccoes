from pathlib import Path
import re

src=Path('app9218.html')
out=Path('app9219.html')
s=src.read_text(encoding='utf-8')

# 1) Pedidos espelho de entrega nunca devem voltar para a fila de corte.
old_orders='''function pedidosQuePrecisamDeCorte(){
 return (db.orders||[]).filter(o=>{
   let st=String(o.status||"").toLowerCase().trim();
   // O pedido fica no Corte até ser marcado como "Corte finalizado".
   // Pedidos já em produção/finalizados ou com nota pronta não entram.
   if(o.invoiceReady || o.noteReady)return false;
   if(st==="corte finalizado" || st==="pedido finalizado" || st==="produção" || st==="pedido em produção")return false;
   return true;
 });
}'''
new_orders='''function pedidosQuePrecisamDeCorte(){
 return (db.orders||[]).filter(o=>{
   let st=String(o.status||"").toLowerCase().trim();
   // Pedidos espelho/reconciliados já vieram de um corte físico existente.
   if(o.workflowSourceOrderId)return false;
   if(String(o.cutStatus||"").toLowerCase().includes("finalizado"))return false;
   // O pedido fica no Corte até ser marcado como "Corte finalizado".
   // Pedidos já em produção/finalizados ou com nota pronta não entram.
   if(o.invoiceReady || o.noteReady)return false;
   if(st==="corte finalizado" || st==="pedido finalizado" || st==="produção" || st==="pedido em produção")return false;
   return true;
 });
}'''
if old_orders not in s:
    raise SystemExit('pedidosQuePrecisamDeCorte esperado não encontrado')
s=s.replace(old_orders,new_orders)

# 2) Na Projeção, o status do pedido reconciliado é autoridade antes de qualquer plano antigo.
pat=r"  function cutStatus9179\(productId,orderId\)\{.*?\n  \}\n  window\.hlgbProgramAnyModel9179=function\(\)\{"
new_cut=r'''  function cutStatus9179(productId,orderId){
    const pid=String(productId||'');
    const oid=String(orderId||'');
    const order=(db.orders||[]).find(o=>String(o.id)===oid);
    const pitems=order?.projectionItems||{};
    const pmeta=pitems[pid]||pitems[productId]||{};
    const sourceOrderId=pmeta?.sourceOrderId||order?.workflowSourceOrderId||null;
    const isFinal=v=>String(v||'').toLowerCase().includes('finalizado');

    // A reconciliação do pedido prevalece sobre qualquer registro planejado antigo.
    if(order&&(isFinal(order.cutStatus)||isFinal(order.status)||order.workflowStageReconciled===true))
      return {text:'✓ Já cortado',cls:'done'};

    const linkedOrderIds=new Set([oid,String(sourceOrderId||'')].filter(Boolean));
    const containsProduct=c=>{
      if(pid&&String(c?.productId||'')===pid)return true;
      const grades=[];
      if(Array.isArray(c?.actualCutGrade))grades.push(...c.actualCutGrade);
      if(Array.isArray(c?.originalGrade))grades.push(...c.originalGrade);
      return !!pid&&grades.some(g=>String(g?.productId||'')===pid&&(+g?.qty||0)>0);
    };
    const cuts=(db.cuts||[]).filter(c=>linkedOrderIds.has(String(c?.orderId||''))&&containsProduct(c));
    if(cuts.some(c=>norm(c.status)==='finalizado'))return {text:'✓ Já cortado',cls:'done'};

    // Pedido espelho não pode ser classificado como "a cortar" por resíduo local antigo.
    if(sourceOrderId)return {text:'✓ Já cortado',cls:'done'};

    if(cuts.some(c=>c.plannedCutDate||c.cutterId||norm(c.status)==='planejado'))
      return {text:'Programado / a cortar',cls:'pending'};
    return {text:'Ainda não cortado',cls:'none'};
  }
  window.hlgbProgramAnyModel9179=function(){'''
s,n=re.subn(pat,new_cut,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'cutStatus9179 não substituído: {n}')

# 3) Corrige o código legado que forçava a tela de volta para v91.90.
s=s.replace("el.textContent!=='v91.90')el.textContent='v91.90'","el.textContent!=='v92.19')el.textContent='v92.19'")
s=s.replace("document.title='HLGB Confecções — Sistema de Gestão v91.90 Multiusuário'","document.title='HLGB Confecções — Sistema de Gestão v92.19 Multiusuário'")
s=s.replace("logo.textContent='v91.90'","logo.textContent='v92.19'")
# Tudo que a v92.18 ainda carimbava visualmente passa a indicar a publicação atual.
s=s.replace('v92.18','v92.19')

# 4) Se um navegador ainda tiver cortes espelho planejados no estado local, retira-os e confirma tombstone na nuvem.
addon=r'''<!-- HLGB_V9219_MIRROR_CUT_VERSION_FIX_START -->
<script>
(function(){
'use strict';
function stamp9219(){
  try{document.title='HLGB Confecções — Sistema de Gestão v92.19 Multiusuário'}catch(e){}
  const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.19';
}
function mirrorPlanInvalid9219(c){
  if(String(c?.status||'').toLowerCase()!=='planejado')return false;
  const o=(db.orders||[]).find(x=>String(x.id)===String(c?.orderId||''));
  if(!o||!o.workflowSourceOrderId)return false;
  const st=String(o.status||'').toLowerCase();
  const cut=String(o.cutStatus||'').toLowerCase();
  return cut.includes('finalizado')||['pedido em produção','pedido finalizado','corte finalizado','produção'].includes(st)||o.workflowStageReconciled===true;
}
async function cleanupMirrorPlans9219(){
  if(!Array.isArray(db.cuts))return 0;
  const bad=db.cuts.filter(mirrorPlanInvalid9219);
  if(!bad.length)return 0;
  for(const c of bad){
    try{
      if(typeof hlgbRecordSaveWithRetry==='function'){
        await hlgbRecordSaveWithRetry('cuts',String(c.id),{...c,supersededV9219:true,supersededReason:'mirror_order_already_cut',supersededAt:new Date().toISOString()},true);
      }
    }catch(e){console.warn('[HLGB 92.19] tombstone de corte espelho',c.id,e)}
  }
  const ids=new Set(bad.map(x=>String(x.id)));
  db.cuts=db.cuts.filter(x=>!ids.has(String(x.id)));
  try{localSaveOnly()}catch(e){}
  try{renderCuts()}catch(e){}
  try{if(typeof renderProjection==='function')renderProjection()}catch(e){}
  return bad.length;
}
window.hlgbCleanupMirrorPlans9219=cleanupMirrorPlans9219;
function boot9219(){stamp9219();cleanupMirrorPlans9219().catch(e=>console.warn('[HLGB 92.19] limpeza local',e));}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(boot9219,120);setTimeout(stamp9219,1200)},0);
setTimeout(stamp9219,700);
window.addEventListener('focus',()=>setTimeout(stamp9219,30));
console.log('[HLGB] v92.19 cortes espelho e versão visual carregados');
})();
</script>
<!-- HLGB_V9219_MIRROR_CUT_VERSION_FIX_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]

# Valida que a trava visual antiga não sobreviveu.
if "el.textContent!=='v91.90')el.textContent='v91.90'" in s:
    raise SystemExit('Forçador visual v91.90 ainda presente')
if 'HLGB_V9219_MIRROR_CUT_VERSION_FIX_START' not in s:
    raise SystemExit('Marcador v92.19 ausente')

out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.19</title><script>(function(){window.location.replace('./app9219.html?v=92.19&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.19 preparada: pedido espelho não volta ao corte, projeção prioriza corte finalizado e versão visual corrigida')
