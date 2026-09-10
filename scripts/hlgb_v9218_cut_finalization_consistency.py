from pathlib import Path

src=Path('app9217.html')
out=Path('app9218.html')
s=src.read_text(encoding='utf-8')

old_cut_status="""  function cutStatus9179(productId,orderId){
    const cuts=(db.cuts||[]).filter(c=>{
      const direct=productId&&String(c.productId)===String(productId);
      const byOrder=orderId&&String(c.orderId)===String(orderId);
      return direct||byOrder;
    });
    if(cuts.some(c=>norm(c.status)==='finalizado'))return {text:'✓ Já cortado',cls:'done'};
    if(cuts.some(c=>c.plannedCutDate||c.cutterId||norm(c.status)==='planejado'))return {text:'Programado / a cortar',cls:'pending'};
    return {text:'Ainda não cortado',cls:'none'};
  }
"""
new_cut_status="""  function cutStatus9179(productId,orderId){
    const pid=String(productId||'');
    const order=(db.orders||[]).find(o=>String(o.id)===String(orderId||''));
    const pitems=order?.projectionItems||{};
    const pmeta=pitems[pid]||pitems[productId]||{};
    const sourceOrderId=pmeta?.sourceOrderId||order?.workflowSourceOrderId||null;
    const linkedOrderIds=new Set([orderId,sourceOrderId].filter(v=>v!==null&&v!==undefined&&String(v)!=='').map(String));
    const containsProduct=c=>{
      if(pid&&String(c?.productId||'')===pid)return true;
      const grades=[];
      if(Array.isArray(c?.actualCutGrade))grades.push(...c.actualCutGrade);
      if(Array.isArray(c?.originalGrade))grades.push(...c.originalGrade);
      return !!pid&&grades.some(g=>String(g?.productId||'')===pid&&(+g?.qty||0)>0);
    };
    const cuts=(db.cuts||[]).filter(c=>{
      const linked=linkedOrderIds.has(String(c?.orderId||''));
      if(sourceOrderId)return linked&&containsProduct(c);
      if(orderId&&String(c?.orderId||'')===String(orderId))return containsProduct(c)||!pid;
      return containsProduct(c);
    });
    if(norm(order?.cutStatus||'').includes('finalizado')||norm(order?.status||'')==='pedido finalizado')return {text:'✓ Já cortado',cls:'done'};
    if(cuts.some(c=>norm(c.status)==='finalizado'&&containsProduct(c)))return {text:'✓ Já cortado',cls:'done'};
    if(cuts.some(c=>c.plannedCutDate||c.cutterId||norm(c.status)==='planejado'))return {text:'Programado / a cortar',cls:'pending'};
    return {text:'Ainda não cortado',cls:'none'};
  }
"""
if old_cut_status not in s:
    raise SystemExit('Função cutStatus9179 esperada não encontrada')
s=s.replace(old_cut_status,new_cut_status,1)

helper=r'''async function retireCoveredPlannedCuts9218(finalCut){
  if(!finalCut||!Array.isArray(db.cuts)||typeof hlgbRecordSaveWithRetry!=='function')return 0;
  const grade=Array.isArray(finalCut.actualCutGrade)&&finalCut.actualCutGrade.length?finalCut.actualCutGrade:(Array.isArray(finalCut.originalGrade)?finalCut.originalGrade:[]);
  const finalByProduct=new Map();
  grade.forEach(g=>{const k=String(g?.productId||'');if(k)finalByProduct.set(k,(finalByProduct.get(k)||0)+qty9173(g?.qty))});
  const siblings=(db.cuts||[]).filter(x=>{
    if(String(x?.id)===String(finalCut.id)||String(x?.orderId||'')!==String(finalCut.orderId||'')||norm9173(x?.status)==='finalizado')return false;
    const pid=String(x?.productId||'');
    const pieces=qty9173(x?.pieces);
    if(pid&&finalByProduct.has(pid))return pieces>0&&pieces===qty9173(finalByProduct.get(pid));
    if(!pid)return pieces>0&&pieces===qty9173(finalCut.pieces);
    return false;
  });
  let retired=0;
  for(const x of siblings){
    const tomb={...clone9173(x),supersededV9218:true,supersededReason:'covered_by_final_cut',supersededAt:new Date().toISOString()};
    try{
      const r=await hlgbRecordSaveWithRetry('cuts',String(x.id),tomb,true);
      if(r?.applied!==false)retired++;
    }catch(e){console.warn('[HLGB 92.18] não foi possível arquivar corte planejado duplicado',x.id,e)}
  }
  if(retired)db.cuts=(db.cuts||[]).filter(x=>!siblings.some(y=>String(y.id)===String(x.id)));
  return retired;
}
window.hlgbRetireCoveredPlannedCuts9218=retireCoveredPlannedCuts9218;
'''
needle='window.finishCut=function(id){'
if needle not in s:
    raise SystemExit('Função finishCut não encontrada')
s=s.replace(needle,helper+'\n'+needle,1)

needle2="next=await save9173('cuts',next);if(o)await save9173('orders'"
replace2="next=await save9173('cuts',next);try{await retireCoveredPlannedCuts9218(next)}catch(cleanErr){console.warn('[HLGB 92.18] limpeza de planejados duplicados falhou sem desfazer o corte',cleanErr)}if(o)await save9173('orders'"
if needle2 not in s:
    raise SystemExit('Ponto de confirmação do corte não encontrado')
s=s.replace(needle2,replace2,1)

# Corrige também a identificação visual antiga que ainda mostrava v91.90.
s=s.replace("function boot9173(){document.title='HLGB Confecções — Sistema de Gestão v91.90 Multiusuário';","function boot9173(){document.title='HLGB Confecções — Sistema de Gestão v92.18 Multiusuário';",1)
s=s.replace("logo.textContent='v91.90';/* v92.04: não forçar versão histórica no logo */","logo.textContent='v92.18';/* versão visual sincronizada com a publicação atual */",1)
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.17 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.18 Multiusuário</title>',1)
s=s.replace('Versão v92.17</b>','Versão v92.18</b>',1)
s=s.replace('<small style="font-size:10px;opacity:.8">v92.17</small>','<small style="font-size:10px;opacity:.8">v92.18</small>',1)

marker=r'''<!-- HLGB_V9218_CUT_FINALIZATION_CONSISTENCY -->
<script>
(function(){
  function stamp9218(){
    document.title='HLGB Confecções — Sistema de Gestão v92.18 Multiusuário';
    const logo=document.querySelector('#appShell .logo small');if(logo)logo.textContent='v92.18';
  }
  if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(stamp9218,50),0);
  setTimeout(stamp9218,900);
  console.log('[HLGB] v92.18 consistência de corte finalizado carregada');
})();
</script>'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+marker+'\n'+s[pos:]

out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.18</title><script>(function(){window.location.replace('./app9218.html?v=92.18&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.18 preparada: projeção reconhece corte finalizado e finalização aposenta planejados duplicados exatos')
