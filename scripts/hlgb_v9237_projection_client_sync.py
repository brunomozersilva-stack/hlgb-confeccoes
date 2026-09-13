from pathlib import Path

src=Path('app9236.html')
out=Path('app9237.html')
s=src.read_text(encoding='utf-8').replace('v92.36','v92.37')

needle='function projectionTrackingMatches(order,productName){'
helper='''function projectionCurrentClient9237(order,item){\n let pid=String(item?.productId??item?.key??\"\"),key=String(item?.key??item?.itemKey??pid);\n let saved=order?.projectionItems?.[key]||order?.projectionItems?.[pid]||{};\n let allocs=Array.isArray(saved.clientAllocations)?saved.clientAllocations.filter(a=>(+a?.qty||0)>0):[];\n let names=[...new Set(allocs.map(a=>String(a?.clientName||\"\").trim()).filter(Boolean))];\n if(names.length)return names.join(\" / \");\n let assigned=order?.productClientAssignments?.[pid]||null;\n return assigned?.clientName||item?.clientName||order?.client||\"Sem cliente\";\n}\nfunction projectionTrackingClient9237(order,productName){\n let item=null;try{item=(projectionItemsForOrder(order)||[]).find(i=>String(i.name||\"\")===String(productName||\"\"))||null}catch(e){}\n return projectionCurrentClient9237(order,item||{name:productName});\n}\n'''+needle
if needle not in s: raise SystemExit('projectionTrackingMatches não encontrado')
s=s.replace(needle,helper,1)

old='if(clientF&&!String(order?.client||\"\").toLowerCase().includes(clientF))return false;'
new='if(clientF&&!String(projectionTrackingClient9237(order,productName)).toLowerCase().includes(clientF))return false;'
if old not in s: raise SystemExit('filtro antigo não encontrado')
s=s.replace(old,new,1)

old='return [fmtDate(item.date),\"#\"+(typeof displayOrderNumber===\"function\"?displayOrderNumber(o):o.id),esc(o.client||\"-\"),esc(item.name||\"-\")'
new='return [fmtDate(item.date),\"#\"+(typeof displayOrderNumber===\"function\"?displayOrderNumber(o):o.id),esc(projectionCurrentClient9237(o,item)),esc(item.name||\"-\")'
if old not in s: raise SystemExit('linha de cliente pendente não encontrada')
s=s.replace(old,new,1)

old='esc(inv.client||r.order?.client||\"-\"),esc(r.item.productName||\"-\")'
new='esc(r.order?projectionCurrentClient9237(r.order,{productId:r.item?.productId,key:r.item?.itemKey||r.item?.productId,clientName:r.item?.clientName}):(r.item?.clientName||inv.client||\"-\")),esc(r.item.productName||\"-\")'
if old not in s: raise SystemExit('linha de cliente entregue não encontrada')
s=s.replace(old,new,1)

out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.37</title><script>(function(){window.location.replace(\'./app9237.html?v=92.37&fresh=\'+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>',encoding='utf-8')
print('v92.37 preparada')
