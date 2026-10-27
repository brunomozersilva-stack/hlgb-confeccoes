from pathlib import Path
import re

# 1) Rota: distinguir LEVAR x BUSCAR por envio real, com override estruturado.
p=Path('release-operations-pack.js'); s=p.read_text()
pat=r"function routeAssignedProducts9249\(loc\)\{.*?\n\}\nfunction routeAssignedLine9249\(x\)\{.*?\n\}\nwindow\.routeLocationChanged9249=function\(select\)\{.*?\n\};"
m=re.search(pat,s,re.S)
if not m: raise SystemExit('bloco routeAssigned 9249 não encontrado')
new=r'''function routeAssignedProducts9249(loc){
 if(!loc)return {active:[],planned:[]};
 const active=[],planned=[],seen=new Set();
 const prods=arr('production').filter(p=>loc.type==='Facção'?sid(p.factionId)===sid(loc.id):(!p.factionId&&sid(p.productionLocationId)===sid(loc.id)));
 for(const p of prods){
   const qty=Math.max(0,q(p.planned)-q(p.done));if(qty<=0)continue;
   const o=arr('orders').find(x=>sid(x.id)===sid(p.orderId)),pid=sid(p.productId),prod=arr('products').find(x=>sid(x.id)===pid),name=p.product||prod?.name||'Produto';
   const key='production:'+sid(p.id??p.__hlgbId??(sid(p.orderId)+'-'+pid));seen.add(sid(p.orderId)+'|'+pid);
   const sent=!!(p.sentToFactionAt||p.sentAt||p.sentToProductionAt||p.sentToLocationAt||p.factionSentAt||p.productionSentAt);
   active.push({key,source:'production',productionId:sid(p.id??p.__hlgbId),orderId:sid(p.orderId),productId:pid,orderNo:o?routeOrderNo9249(o):'',product:name,qty,stage:p.stage||'Em produção',op:p.op||'',direction:sent?'pickup':'carry',sent});
 }
 for(const c of arr('capacityAssignments')){
   const same=loc.type==='Facção'?sid(c.factionId)===sid(loc.id):sid(c.locationId||c.productionLocationId)===sid(loc.id);if(!same)continue;
   const o=arr('orders').find(x=>sid(x.id)===sid(c.orderId)),pid=sid(c.productId),dupe=sid(c.orderId)+'|'+pid;if(seen.has(dupe))continue;
   const prod=arr('products').find(x=>sid(x.id)===pid),qty=q(c.pieces||c.qty||c.planned);if(qty<=0)continue;
   planned.push({key:'capacity:'+sid(c.id??dupe),source:'capacity',orderId:sid(c.orderId),productId:pid,orderNo:o?routeOrderNo9249(o):'',product:c.productName||prod?.name||'Produto',qty,stage:'Planejado para o local',direction:'carry'});
 }
 return {active,planned};
}
function routeAssignedLine9249(x){return (x.orderNo?'Pedido #'+x.orderNo+' — ':'')+(x.product||'Produto')+' — '+q(x.qty).toLocaleString('pt-BR')+' pç'}
function routeItemHtml9249(x){const line=routeAssignedLine9249(x),dir=x.direction==='pickup'?'pickup':'carry';return '<div class="ops-route-item9422" data-route-item9249="1" data-key="'+escSafe(x.key||line)+'" data-line="'+escSafe(line)+'" data-direction="'+dir+'" data-source="'+escSafe(x.source||'')+'" data-production-id="'+escSafe(x.productionId||'')+'" data-order-id="'+escSafe(x.orderId||'')+'" data-product-id="'+escSafe(x.productId||'')+'" style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #eee"><div><b>'+escSafe(line)+'</b><div class="sub">'+escSafe(x.stage||'')+(x.sent?' · já enviado ao local':' · ainda não enviado')+'</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="'+(dir==='carry'?'primary':'secondary')+'" data-dir="carry" onclick="routeItemDirection9249(this,\'carry\')">➜ LEVAR</button><button type="button" class="'+(dir==='pickup'?'primary':'secondary')+'" data-dir="pickup" onclick="routeItemDirection9249(this,\'pickup\')">⬅ BUSCAR</button></div></div>'}
function routeLines9249(v){return sid(v).split(/\n+/).map(x=>x.trim()).filter(Boolean)}
function routeSyncDirections9249(stop){if(!stop)return;const carry=stop.querySelector('.ops-route-carry'),pickup=stop.querySelector('.ops-route-pickup'),items=[...stop.querySelectorAll('[data-route-item9249]')],known=new Set(items.map(x=>sid(x.dataset.line)));let c=routeLines9249(carry?.value).filter(x=>!known.has(x)),b=routeLines9249(pickup?.value).filter(x=>!known.has(x));for(const it of items){const line=sid(it.dataset.line);if(!line)continue;(it.dataset.direction==='pickup'?b:c).push(line)}if(carry)carry.value=[...new Set(c)].join('\n');if(pickup)pickup.value=[...new Set(b)].join('\n')}
window.routeItemDirection9249=function(btn,dir){const item=btn?.closest?.('[data-route-item9249]'),stop=btn?.closest?.('.ops-route-stop');if(!item||!stop)return;item.dataset.direction=dir==='pickup'?'pickup':'carry';item.querySelectorAll('button[data-dir]').forEach(b=>b.className=b.dataset.dir===item.dataset.direction?'primary':'secondary');routeSyncDirections9249(stop)};
window.routeLocationChanged9249=function(select){
 const stop=select?.closest?.('.ops-route-stop'),loc=routeLocations()[+select?.value],box=stop?.querySelector('.ops-route-assigned'),carry=stop?.querySelector('.ops-route-carry'),pickup=stop?.querySelector('.ops-route-pickup');if(!stop||!box||!loc)return;
 const data=routeAssignedProducts9249(loc),items=[...data.active,...data.planned],idx=+stop.dataset.i||0,saved=window.__opsRouteStops9249?.[idx],savedItems=Array.isArray(saved?.routeItems)?saved.routeItems:[];
 const carryExisting=new Set(routeLines9249(carry?.value)),pickupExisting=new Set(routeLines9249(pickup?.value));
 for(const x of items){const line=routeAssignedLine9249(x),sv=savedItems.find(y=>sid(y.key)===sid(x.key)||sid(y.line)===line);if(sv?.direction)x.direction=sv.direction;else if(pickupExisting.has(line))x.direction='pickup';else if(carryExisting.has(line))x.direction='carry'}
 box.innerHTML=items.length?'<div class="panel" style="padding:10px;background:#fff"><b>📦 O que fazer neste local</b><div class="sub">O sistema sugere <b>LEVAR</b> quando o produto foi atribuído mas ainda não foi enviado e <b>BUSCAR</b> quando já existe envio registrado. Você pode trocar pelo botão.</div>'+items.map(routeItemHtml9249).join('')+'</div>':'<div class="sub">Nenhum produto atribuído a este local agora. Use os campos abaixo para itens manuais.</div>';
 routeSyncDirections9249(stop);
};'''
s=s[:m.start()]+new+s[m.end():]
old="stops.push({order:i+1,type:loc.type,locationId:loc.id,name:loc.name,address:loc.address,phone:loc.phone,carry:lines(el.querySelector('.ops-route-carry')?.value),pickup:lines(el.querySelector('.ops-route-pickup')?.value),notes:el.querySelector('.ops-route-note')?.value?.trim()||''})"
newsave="const routeItems=[...el.querySelectorAll('[data-route-item9249]')].map(x=>({key:x.dataset.key||'',line:x.dataset.line||'',direction:x.dataset.direction==='pickup'?'pickup':'carry',source:x.dataset.source||'',productionId:x.dataset.productionId||'',orderId:x.dataset.orderId||'',productId:x.dataset.productId||''}));stops.push({order:i+1,type:loc.type,locationId:loc.id,name:loc.name,address:loc.address,phone:loc.phone,carry:lines(el.querySelector('.ops-route-carry')?.value),pickup:lines(el.querySelector('.ops-route-pickup')?.value),routeItems,notes:el.querySelector('.ops-route-note')?.value?.trim()||''})"
if old not in s: raise SystemExit('save stop de rota não encontrado')
s=s.replace(old,newsave,1); p.write_text(s)

# 2) Nota avulsa: busca de cliente e produto sem mudar movimentação de estoque.
p=Path('release-note-integrity.js'); s=p.read_text()
old="function manualItemRow(i=0){\n return '<tr class=\"hlgb-manual-item9411\"><td><input class=\"hlgb-manual-desc9411\" placeholder=\"Ex.: Calcinha com pequeno defeito\"></td><td><input class=\"hlgb-manual-qty9411\" type=\"number\" min=\"1\" step=\"1\" value=\"1\"></td><td><input class=\"hlgb-manual-unit9411\" type=\"number\" min=\"0\" step=\".01\" value=\"0\"></td><td class=\"hlgb-manual-total9411\">R$ 0,00</td><td><button type=\"button\" class=\"danger hlgb-manual-remove9411\">×</button></td></tr>';\n}"
new="function manualItemRow(i=0){\n return '<tr class=\"hlgb-manual-item9411\"><td><input class=\"hlgb-manual-desc9411\" list=\"hlgbManualProducts9411\" placeholder=\"Busque por nome ou referência\"></td><td><input class=\"hlgb-manual-qty9411\" type=\"number\" min=\"1\" step=\"1\" value=\"1\"></td><td><input class=\"hlgb-manual-unit9411\" type=\"number\" min=\"0\" step=\".01\" value=\"0\"></td><td class=\"hlgb-manual-total9411\">R$ 0,00</td><td><button type=\"button\" class=\"danger hlgb-manual-remove9411\">×</button></td></tr>';\n}\nfunction manualClientList9411(){return arr('clients').map(c=>'<option value=\"'+esc(c.name||'')+'\" data-id=\"'+esc(c.id)+'\"></option>').join('')}\nfunction manualProductList9411(){return arr('products').map(p=>'<option value=\"'+esc(p.name||'Produto')+'\" data-id=\"'+esc(p.id)+'\" data-price=\"'+q(p.price||p.salePrice||p.unitPrice)+'\">'+esc(p.code||p.reference||p.ref||'')+'</option>').join('')}\nfunction bindManualSearch9411(){const ci=document.getElementById('hlgbManualClientSearch9411'),cs=document.getElementById('hlgbManualClient9411');if(ci&&cs)ci.oninput=()=>{const n=norm(ci.value),c=arr('clients').find(x=>norm(x.name)===n||norm(x.code)===n);if(c)cs.value=sid(c.id)};document.querySelectorAll('.hlgb-manual-desc9411').forEach(inp=>{if(inp.dataset.search9411)return;inp.dataset.search9411='1';inp.addEventListener('change',()=>{const tr=inp.closest('tr'),n=norm(inp.value),prod=arr('products').find(x=>norm(x.name)===n||norm(x.code)===n||norm(x.reference)===n||norm(x.ref)===n);inp.dataset.productId=prod?sid(prod.id):'';if(prod){inp.value=prod.name||inp.value;const u=tr?.querySelector('.hlgb-manual-unit9411');if(u&&q(u.value)<=0)u.value=q(prod.price||prod.salePrice||prod.unitPrice).toFixed(2);recalcManual()}})})}"
if old not in s: raise SystemExit('manualItemRow não encontrado')
s=s.replace(old,new,1)
old2="'<div class=\"grid\"><div class=\"field\"><label>Cliente cadastrado</label><select id=\"hlgbManualClient9411\"><option value=\"\">Selecione (opcional)</option>'+clients+'</select></div><div class=\"field\"><label>Ou nome do cliente</label><input id=\"hlgbManualClientFree9411\" placeholder=\"Digite se não estiver cadastrado\"></div>"
new2="'<datalist id=\"hlgbManualClients9411\">'+manualClientList9411()+'</datalist><datalist id=\"hlgbManualProducts9411\">'+manualProductList9411()+'</datalist><div class=\"grid\"><div class=\"field\"><label>Buscar cliente cadastrado</label><input id=\"hlgbManualClientSearch9411\" list=\"hlgbManualClients9411\" placeholder=\"Digite nome ou código\"><select id=\"hlgbManualClient9411\" style=\"margin-top:6px\"><option value=\"\">Selecione (opcional)</option>'+clients+'</select></div><div class=\"field\"><label>Ou nome do cliente</label><input id=\"hlgbManualClientFree9411\" placeholder=\"Digite se não estiver cadastrado\"></div>"
if old2 not in s: raise SystemExit('form cliente manual não encontrado')
s=s.replace(old2,new2,1)
s=s.replace("setTimeout(()=>{bindManualRows();recalcManual();const add=document.getElementById('hlgbManualAdd9411');", "setTimeout(()=>{bindManualRows();bindManualSearch9411();recalcManual();const add=document.getElementById('hlgbManualAdd9411');",1)
s=s.replace("window.hlgbAddManualNoteItem9411=function(){const host=document.getElementById('hlgbManualItems9411');if(host){host.insertAdjacentHTML('beforeend',manualItemRow(Date.now()));bindManualRows();recalcManual()}};", "window.hlgbAddManualNoteItem9411=function(){const host=document.getElementById('hlgbManualItems9411');if(host){host.insertAdjacentHTML('beforeend',manualItemRow(Date.now()));bindManualRows();bindManualSearch9411();recalcManual()}};",1)
old3="const items=[];document.querySelectorAll('.hlgb-manual-item9411').forEach(tr=>{const productName=sid(tr.querySelector('.hlgb-manual-desc9411')?.value).trim(),qty=Math.floor(q(tr.querySelector('.hlgb-manual-qty9411')?.value)),unitPrice=q(tr.querySelector('.hlgb-manual-unit9411')?.value);if(productName&&qty>0)items.push({orderId:null,itemKey:null,productId:null,productName,description:productName,projectionDate:issueDate,deliveredAt:issueDate,qty,unitPrice,value:+(qty*unitPrice).toFixed(2),sourceType:'manual_note',manualItem:true})});"
new3="const items=[];document.querySelectorAll('.hlgb-manual-item9411').forEach(tr=>{const desc=tr.querySelector('.hlgb-manual-desc9411'),productName=sid(desc?.value).trim(),productId=sid(desc?.dataset?.productId)||null,qty=Math.floor(q(tr.querySelector('.hlgb-manual-qty9411')?.value)),unitPrice=q(tr.querySelector('.hlgb-manual-unit9411')?.value);if(productName&&qty>0)items.push({orderId:null,itemKey:productId,productId,productName,description:productName,projectionDate:issueDate,deliveredAt:issueDate,qty,unitPrice,value:+(qty*unitPrice).toFixed(2),sourceType:'manual_note',manualItem:true})});"
if old3 not in s: raise SystemExit('collect items manual não encontrado')
s=s.replace(old3,new3,1); p.write_text(s)

# 3) Hub: pesquisa nunca mostra tombstone e oferece exclusão usando a autoridade existente.
p=Path('release-hub-search.js'); s=p.read_text()
s=s.replace("function rows(){try{const d=dbRef();return Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries:[]}catch(e){return []}}", "function rows(){try{const d=dbRef(),a=Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries:[],m=window.hlgbRecordSnapshots?.hubFinanceEntries;return a.filter(e=>{if(e?.deleted_at||e?.deletedAt||e?.deleted===true||e?.tombstone===true)return false;const id=sid(e?.id??e?.__hlgbId),snap=m?.get?.(id);return !snap?.deleted_at})}catch(e){return []}}",1)
s=s.replace("else if(kind==='toggle'&&typeof window.toggleHubFinanceEntry==='function')await window.toggleHubFinanceEntry(id)", "else if(kind==='toggle'&&typeof window.toggleHubFinanceEntry==='function')await window.toggleHubFinanceEntry(id);else if(kind==='delete'&&typeof window.deleteHubFinanceEntry==='function'){await window.deleteHubFinanceEntry(id);namesBuilt=false;render()}",1)
old="return '<button type=\"button\" class=\"secondary\" data-hub-search-action=\"edit\" data-hub-id=\"'+esc(id)+'\">Editar</button> <button type=\"button\" class=\"primary\" data-hub-search-action=\"toggle\" data-hub-id=\"'+esc(id)+'\">'+(real?'Reabrir':'✓ Realizado')+'</button>'"
new="return '<button type=\"button\" class=\"secondary\" data-hub-search-action=\"edit\" data-hub-id=\"'+esc(id)+'\">Editar</button> <button type=\"button\" class=\"primary\" data-hub-search-action=\"toggle\" data-hub-id=\"'+esc(id)+'\">'+(real?'Reabrir':'✓ Realizado')+'</button> <button type=\"button\" class=\"danger\" data-hub-search-action=\"delete\" data-hub-id=\"'+esc(id)+'\">Excluir</button>'"
if old not in s: raise SystemExit('actionHtml hub search não encontrado')
s=s.replace(old,new,1);p.write_text(s)

# 4) Autoridade Hub: sempre refrescar também a pesquisa após tombstone.
p=Path('release-hub-integrity.js');s=p.read_text()
old="try{if(typeof window.renderHubFinance==='function')window.renderHubFinance();else if(typeof window.hlgbRenderHubSearch9248==='function')window.hlgbRenderHubSearch9248()}catch(e){}"
new="try{if(typeof window.renderHubFinance==='function')window.renderHubFinance();if(typeof window.hlgbRenderHubSearch9248==='function')window.hlgbRenderHubSearch9248()}catch(e){}"
if old not in s: raise SystemExit('refresh hub integrity não encontrado')
s=s.replace(old,new,1);p.write_text(s)

# 5) Roteador: carregar acerto de matéria-prima depois da integridade de notas.
p=Path('app-stable3.html');s=p.read_text()
needle="'release-note-integrity.js'"
if "'release-trade-settlement-v9422.js'" not in s:
    s=s.replace(needle,needle+",'release-trade-settlement-v9422.js'",1)
p.write_text(s)

# 6) Regressão crítica: registrar v94.20 + rodada v94.22.
p=Path('.github/workflows/audit-regression.yml');s=p.read_text()
anchor="      - name: Validate cut grade matrix v94.21\n        run: node tests/audit-cut-grade-matrix-v9421.cjs\n"
extra="\n      - name: Validate invoiced production reconciliation v94.20\n        run: node tests/audit-production-invoice-reconcile-v9420.cjs\n\n      - name: Validate routes, manual note, Hub and trade settlement v94.22\n        run: node tests/audit-round-v9422.cjs\n"
if 'audit-round-v9422.cjs' not in s:
    if anchor not in s: raise SystemExit('anchor critical v94.21 ausente')
    s=s.replace(anchor,anchor+extra,1)
p.write_text(s)

# 7) WebKit UI: adicionar rodada integrada.
p=Path('.github/workflows/user-ui-v9419.yml');s=p.read_text()
anchor="      - name: Validar ajustar grade horizontal no WebKit\n        run: node tests/audit-cut-grade-matrix-v9421-webkit.js\n"
extra="      - name: Validar rota, nota avulsa, Hub e acerto no WebKit\n        run: node tests/audit-round-v9422-webkit.js\n"
if 'audit-round-v9422-webkit.js' not in s:
    if anchor not in s: raise SystemExit('anchor webkit v94.21 ausente')
    s=s.replace(anchor,anchor+extra,1)
p.write_text(s)
