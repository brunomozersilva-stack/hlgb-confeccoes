/* HLGB v92.50 — comparador de preços por matéria-prima */
(function(){
'use strict';
const V='2026.10.03-supplier-comparator-v9250';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function rows(){
 const out=[];for(const s of arr('suppliers'))for(const p of (s.products||[]))if(p?.name&&q(p.price)>0)out.push({supplierId:s.id,supplier:s.name||'Fornecedor',name:p.name,unit:p.unit||'',price:q(p.price),updatedAt:p.updatedAt||s.updatedAt||''});return out;
}
function groups(){
 const m=new Map();for(const r of rows()){const k=norm(r.name)+'|'+norm(r.unit);if(!m.has(k))m.set(k,[]);m.get(k).push(r)}
 return [...m.values()].map(g=>g.sort((a,b)=>a.price-b.price||a.supplier.localeCompare(b.supplier,'pt-BR')));
}
function ensure(){
 const page=document.getElementById('fornecedores');if(!page||document.getElementById('supplierComparator9250'))return;
 const p=document.createElement('div');p.id='supplierComparator9250';p.className='panel';
 p.innerHTML='<h2>🏷️ Melhor preço por matéria-prima</h2><div class="sub">Compara cada item separadamente. Um fornecedor pode ser o melhor em renda e outro em alça.</div><div class="toolbar" style="margin-top:10px"><div class="field"><label>Buscar item ou fornecedor</label><input id="supplierCompareSearch9250" placeholder="Ex.: romantic, renda, alça" oninput="renderSupplierComparator9250()"></div></div><div id="supplierCompareCards9250" class="cards"></div><div id="supplierCompareTable9250"></div>';
 page.appendChild(p);render();
}
function render(){
 const box=document.getElementById('supplierCompareTable9250'),cards=document.getElementById('supplierCompareCards9250');if(!box)return;
 const search=norm(document.getElementById('supplierCompareSearch9250')?.value||''),gs=groups().filter(g=>!search||g.some(x=>norm(x.name).includes(search)||norm(x.supplier).includes(search)));
 let savings=0;for(const g of gs)if(g.length>1)savings+=Math.max(0,g[g.length-1].price-g[0].price);
 if(cards)cards.innerHTML='<div class="card"><small>Itens comparados</small><strong>'+gs.length+'</strong></div><div class="card"><small>Ofertas cadastradas</small><strong>'+gs.reduce((a,g)=>a+g.length,0)+'</strong></div><div class="card"><small>Diferença somada melhor x maior</small><strong>'+moneySafe(savings)+'</strong></div>';
 const rs=[];for(const g of gs){const b=g[0],others=g.slice(1);rs.push([escSafe(b.name),escSafe(b.unit||'-'),'<span class="badge ok">Melhor</span> <b>'+escSafe(b.supplier)+'</b>',moneySafe(b.price),others.length?others.map(x=>escSafe(x.supplier)+' · '+moneySafe(x.price)).join('<br>'):'—'])}
 box.innerHTML=rs.length?table(['Matéria-prima','Unidade','Fornecedor','Melhor preço','Comparação'],rs):'<div class="empty">Nenhum preço encontrado.</div>';
}
function install(){
 ensure();
 const base=window.renderSuppliers;if(typeof base==='function'&&!base.__compare9250){window.renderSuppliers=function(){const r=base.apply(this,arguments);setTimeout(render,0);return r};window.renderSuppliers.__compare9250=true}
}
setTimeout(install,1800);setInterval(ensure,4000);
window.renderSupplierComparator9250=render;
window.hlgbSupplierComparator9250={rows,groups,render};
console.info('[HLGB] '+V+' ativo');
})();