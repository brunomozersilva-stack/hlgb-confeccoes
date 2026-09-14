from pathlib import Path

p = Path('app9240.html')
s = p.read_text(encoding='utf-8')

marker = 'HLGB_V9240_PROJECTION_CLIENT_TOTALS'
if marker in s:
    print('totais por cliente já corrigidos')
    raise SystemExit(0)

anchor = 'function renderProjection(){'
helper = r'''/* HLGB_V9240_PROJECTION_CLIENT_TOTALS */
function projectionClientParts9240(order,item){
  const q=v=>Math.max(0,+v||0);
  const pid=String(item?.productId??item?.key??''),key=String(item?.key??pid);
  const saved=order?.projectionItems?.[key]||order?.projectionItems?.[pid]||{};
  const allocations=Array.isArray(saved.clientAllocations)?saved.clientAllocations.filter(a=>q(a?.qty)>0):[];
  const available=q(typeof projectionDeliverableQty==='function'?projectionDeliverableQty(order,item):item?.remainingQty);
  const fallback=()=>{
    const assigned=order?.productClientAssignments?.[pid]||null;
    return {clientId:assigned?.clientId??item?.clientId??order?.clientId??null,clientName:assigned?.clientName||item?.clientName||order?.client||'Sem cliente'};
  };
  if(!allocations.length)return available>0?[{...fallback(),qty:available}]:[];
  let left=available,out=[];
  allocations.forEach(a=>{
    const qty=Math.min(left,q(a.qty));
    if(qty>0)out.push({clientId:a.clientId??null,clientName:a.clientName||'Sem cliente',qty});
    left=Math.max(0,left-qty);
  });
  if(left>0)out.push({...fallback(),qty:left,residual:true});
  return out;
}
'''
if anchor not in s:
    raise SystemExit('renderProjection não encontrado')
s = s.replace(anchor, helper + anchor, 1)

old_totals = ''' let totalQty=scheduled.reduce((a,x)=>a+projectionRemainingQty(x.item),0);
 let totalValue=scheduled.reduce((a,x)=>a+projectionRemainingValue(x.item),0);'''
new_totals = ''' let scopedClientParts9240=clientF?scheduled.flatMap(({order:o,item})=>projectionClientParts9240(o,item).filter(part=>String(part.clientName||'').toLowerCase().includes(clientF)).map(part=>({order:o,item,part}))):[];
 let totalQty=clientF?scopedClientParts9240.reduce((a,x)=>a+(+x.part.qty||0),0):scheduled.reduce((a,x)=>a+projectionRemainingQty(x.item),0);
 let totalValue=clientF?scopedClientParts9240.reduce((a,x)=>a+(+x.part.qty||0)*projectionUnitForItem(x.item),0):scheduled.reduce((a,x)=>a+projectionRemainingValue(x.item),0);'''
if old_totals not in s:
    raise SystemExit('totais gerais da projeção não encontrados')
s = s.replace(old_totals, new_totals, 1)

old_clients = ''' let clients={};
 scheduled.forEach(({order:o,item})=>{
   let k=item.clientName||o.client||"Sem cliente";if(!clients[k])clients[k]={qty:0,value:0,products:0,invoiced:0};
   const deliverableQty=projectionDeliverableQty(o,item),deliverableValue=projectionDeliverableValue(o,item);
   clients[k].qty+=deliverableQty;clients[k].value+=deliverableValue;clients[k].products++;if(item.invoiced)clients[k].invoiced+=deliverableValue;
 });'''
new_clients = ''' let clients={};
 scheduled.forEach(({order:o,item})=>{
   const unit=projectionUnitForItem(item);
   projectionClientParts9240(o,item).filter(part=>!clientF||String(part.clientName||'').toLowerCase().includes(clientF)).forEach(part=>{
     const k=part.clientName||"Sem cliente";
     if(!clients[k])clients[k]={qty:0,value:0,products:0,invoiced:0};
     clients[k].qty+=(+part.qty||0);
     clients[k].value+=(+part.qty||0)*unit;
     clients[k].products++;
   });
 });'''
if old_clients not in s:
    raise SystemExit('quadro de clientes da projeção não encontrado')
s = s.replace(old_clients, new_clients, 1)

p.write_text(s, encoding='utf-8')
print('totais da projeção divididos pelas quantidades atribuídas a cada cliente')
