from pathlib import Path

src=Path('app9216.html')
out=Path('app9217.html')
s=src.read_text(encoding='utf-8')

addon=r'''<!-- HLGB_V9217_STAGE_RECONCILIATION_START -->
<script>
(function(){
'use strict';
const q9217=v=>Math.max(0,+v||0);
const clone9217=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
function gradeQty9217(o,pid){return (o?.grade||[]).reduce((a,g)=>String(g?.productId??'')===String(pid)?a+q9217(g?.qty):a,0)}
function invoiceEvidence9217(sourceOrderId,pid,clientId){
  const rows=[];
  (db.projectionInvoices||[]).forEach(inv=>{
    if(String(inv?.clientId??'')!==String(clientId??''))return;
    (inv?.items||[]).forEach(it=>{
      if(String(it?.orderId??'')!==String(sourceOrderId??'')||String(it?.productId??'')!==String(pid??''))return;
      rows.push({invoiceId:inv.id,qty:q9217(it.qty),date:inv.issueDate||it.deliveredAt||inv.date||'',source:it.source||inv.source||'faction_delivery_v9140',clientId:inv.clientId,clientName:inv.client||'',substitution:!!it.substitution});
    });
  });
  return rows;
}
async function saveOrder9217(o){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravador da nuvem indisponível');
  const r=await window.hlgbRecordSaveWithRetry('orders',String(o.id),clone9217(o),false);
  if(!r||r.applied===false)throw new Error(r?.reason||'A nuvem não confirmou o pedido sincronizado');
  return r.data||o;
}
window.hlgbSyncCustomerStage9217=async function(faction,updatedFaction,client,currentInvoice){
  const f=updatedFaction||faction;if(!f||!client||client.id==null||f.productId==null)return false;
  const sourceOrderId=f.orderId??faction?.orderId,pid=f.productId??faction?.productId,sent=q9217(f.sent??faction?.sent);
  if(!sourceOrderId||!sent)return false;
  const candidates=(db.orders||[]).filter(o=>{
    if(String(o.id)===String(sourceOrderId)||String(o.clientId??'')!==String(client.id))return false;
    if(o.workflowV9130!==true&&String(o.workflowV9130)!=='true')return false;
    const st=String(o.status||'').toLowerCase();if(st.includes('finalizado')||st==='cancelado')return false;
    return gradeQty9217(o,pid)===sent;
  });
  if(candidates.length!==1)return false;
  const o=candidates[0],total=gradeQty9217(o,pid),evidence=invoiceEvidence9217(sourceOrderId,pid,client.id);
  if(currentInvoice&&currentInvoice.id!=null&&!evidence.some(x=>String(x.invoiceId)===String(currentInvoice.id))){
    (currentInvoice.items||[]).forEach(it=>{if(String(it.productId??'')===String(pid))evidence.push({invoiceId:currentInvoice.id,qty:q9217(it.qty),date:currentInvoice.issueDate||it.deliveredAt||currentInvoice.date||'',source:it.source||currentInvoice.source||'faction_delivery_v9140',clientId:client.id,clientName:client.name||'',substitution:!!it.substitution})});
  }
  let delivered=evidence.reduce((a,x)=>a+q9217(x.qty),0);if(!delivered)delivered=Math.min(total,q9217(f.done??f.returned));
  delivered=Math.min(total,delivered);if(delivered<=0)return false;
  const lastDate=evidence.map(x=>x.date).filter(Boolean).sort().pop()||f.lastDeliveryAt||'';
  o.projectionItems=o.projectionItems||{};const k=String(pid),prev=o.projectionItems[k]||{};
  o.projectionItems[k]={...prev,date:prev.date||lastDate,invoiced:delivered>=total,invoiceIds:[...new Set([...(prev.invoiceIds||[]),...evidence.map(x=>x.invoiceId).filter(x=>x!=null)])],invoicedQty:delivered,deliveryHistory:evidence.map(x=>({qty:x.qty,date:x.date,note:'',source:x.source,clientId:String(x.clientId??client.id),invoiceId:x.invoiceId,clientName:x.clientName||client.name||'',substitution:x.substitution})),lastDeliveredAt:lastDate,lastDeliveryClientId:String(client.id),lastDeliveryClientName:client.name||'',sourceOrderId:String(sourceOrderId),reconciledV9217:true};
  o.cutStatus='Corte finalizado';o.workflowSourceOrderId=String(sourceOrderId);o.workflowStageReconciled=true;o.workflowStageReconciledAt=new Date().toISOString();o.projectionInvoiced=delivered>=total;o.status=delivered>=total?'Pedido finalizado':'Pedido em produção';
  const saved=await saveOrder9217(o);Object.assign(o,saved);return true;
};
function cutCoverage9217(){
  const fin=new Map();
  (db.cuts||[]).forEach(c=>{if(String(c?.status||'').toLowerCase()!=='finalizado')return;const arr=c.actualCutGrade||c.originalGrade||[];arr.forEach(g=>{const pid=String(g?.productId??'');if(!pid)return;const key=String(c.orderId??'')+'::'+pid;fin.set(key,(fin.get(key)||0)+q9217(g?.qty))})});
  return fin;
}
function hideCoveredPlannedCuts9217(){
  if(!Array.isArray(db.cuts))return 0;const fin=cutCoverage9217(),groups=new Map();
  db.cuts.forEach(c=>{if(String(c?.status||'').toLowerCase()!=='planejado'||c?.workflowSuperseded)return;const pid=String(c?.productId??'');if(!pid)return;const key=String(c.orderId??'')+'::'+pid;groups.set(key,(groups.get(key)||0)+q9217(c.pieces))});
  const before=db.cuts.length;db.cuts=db.cuts.filter(c=>{if(c?.workflowSuperseded)return false;if(String(c?.status||'').toLowerCase()!=='planejado')return true;const pid=String(c?.productId??'');if(!pid)return true;const key=String(c.orderId??'')+'::'+pid;return !(fin.has(key)&&fin.get(key)>=q9217(groups.get(key)))});return before-db.cuts.length;
}
window.hlgbHideCoveredPlannedCuts9217=hideCoveredPlannedCuts9217;
const oldPage9217=window.page;
if(typeof oldPage9217==='function')window.page=function(){try{hideCoveredPlannedCuts9217()}catch(e){}return oldPage9217.apply(this,arguments)};
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{try{hideCoveredPlannedCuts9217()}catch(e){}},0);
setTimeout(()=>{try{hideCoveredPlannedCuts9217()}catch(e){}},1200);
console.log('[HLGB] v92.17 reconciliação de etapas carregada');
})();
</script>
<!-- HLGB_V9217_STAGE_RECONCILIATION_END -->'''

# Integra a sincronização ao ponto exato em que a entrega da facção volta confirmada da nuvem.
needle="if(data?.order&&f.orderId){let o=ord940(f.orderId);if(o)Object.assign(o,data.order)}closeModal();"
replacement="if(data?.order&&f.orderId){let o=ord940(f.orderId);if(o)Object.assign(o,data.order)}try{await window.hlgbSyncCustomerStage9217?.(f,data?.faction||f,c,data?.projectionInvoice)}catch(syncErr){console.warn('[HLGB 92.17] pedido cliente não sincronizado',syncErr)}closeModal();"
if needle not in s:
    raise SystemExit('Ponto de integração da entrega v9140 não encontrado')
s=s.replace(needle,replacement,1)

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.16 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.17 Multiusuário</title>')
s=s.replace('Versão v92.16</b>','Versão v92.17</b>')
s=s.replace('<small style="font-size:10px;opacity:.8">v92.16</small>','<small style="font-size:10px;opacity:.8">v92.17</small>')
out.write_text(s,encoding='utf-8')

Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.17</title><script>(function(){window.location.replace('./app9217.html?v=92.17&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.17 preparada: etapas reconciliadas com entregas e cortes duplicados ocultos')
