/* HLGB v92.50 — histórico e custos de cortadores */
(function(){
'use strict';
const V='2026.10.03-cutter-history-v9250';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),today=()=>new Date().toISOString().slice(0,10),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function productName(c){
 const p=arr('products').find(x=>sid(x.id)===sid(c?.productId));if(p)return p.name;
 const raw=sid(c?.product||'').trim();if(!raw)return 'Produto';
 const candidates=arr('products').filter(x=>x?.name&&norm(raw).includes(norm(x.name))).sort((a,b)=>sid(b.name).length-sid(a.name).length);if(candidates[0])return candidates[0].name;
 return raw.replace(/\b\d+\s+/g,' ').replace(/\bTam\s+(PP|P|M|G|GG|XG|EXG)\b/gi,' ').replace(/\s+/g,' ').trim().slice(0,120)||raw.slice(0,120);
}
function period(){try{if(typeof cutterPeriod==='function'){const r=cutterPeriod();return {s:r.start||'',e:r.end||''}}}catch(e){}return {s:document.getElementById('cutterPeriodStart')?.value||'',e:document.getElementById('cutterPeriodEnd')?.value||''}}
function inside(d,s,e){d=sid(d).slice(0,10);return (!s||!d||d>=s)&&(!e||!d||d<=e)}
function unitCost(c,cut,pieces){
 if(c?.cutType==='Interno')return pieces>0?q(c.monthlySalary)/pieces:0;
 const text=norm(productName(cut)),rates=Array.isArray(c?.rates)?c.rates:[],m=rates.filter(r=>text.includes(norm(r.type))).sort((a,b)=>sid(b.type).length-sid(a.type).length);return q(m[0]?.price);
}
function materialInfo(cut,p,qty){
 const pred=(p?.materials||[]).map(m=>({name:m.name||'Material',qty:q(m.qty)*qty,unit:m.unit||''})),act=Array.isArray(cut?.materialUsage)?cut.materialUsage:Array.isArray(cut?.materialsUsed)?cut.materialsUsed:[];
 return {pred,act};
}
function ensure(){
 const page=document.getElementById('cortadores');if(!page||document.getElementById('cutterHistory9250'))return;
 const p=document.createElement('div');p.id='cutterHistory9250';p.className='panel';
 p.innerHTML='<h2>📚 Histórico detalhado de cortadores</h2><div class="sub">Planejado x realizado, falta, custo e materiais por corte/modelo. Usa os mesmos filtros de período acima.</div><div class="toolbar"><button class="secondary" onclick="exportCutterHistory9250()">⬇️ Exportar CSV</button></div><div id="cutterHistoryCards9250" class="cards"></div><div id="cutterHistoryTable9250" style="overflow:auto"></div>';
 page.appendChild(p);render();
}
function dataset(){
 const {s,e}=period(),cuts=arr('cuts').filter(x=>inside(x.finishedAt||x.date,s,e)),out=[];
 for(const cut of cuts){
   const c=arr('cutters').find(x=>sid(x.id)===sid(cut.cutterId)),p=arr('products').find(x=>sid(x.id)===sid(cut.productId)),pl=q(cut.plannedPieces||cut.pieces),dn=/finalizado/i.test(sid(cut.status))?q(cut.pieces):q(cut.done||0),missing=Math.max(0,pl-dn);
   const pieces=c?cuts.filter(x=>sid(x.cutterId)===sid(c.id)&&/finalizado/i.test(sid(x.status))).reduce((a,x)=>a+q(x.pieces),0):0,unit=c?unitCost(c,cut,pieces):0,mi=materialInfo(cut,p,dn),o=arr('orders').find(x=>sid(x.id)===sid(cut.orderId));
   out.push({cut,c,p,o,planned:pl,done:dn,missing,unit,total:unit*dn,pred:mi.pred.map(x=>x.name+': '+Number(x.qty.toFixed(3))+' '+x.unit).join(' · ')||'-',act:mi.act.length?mi.act.map(x=>(x.name||'Material')+': '+q(x.qty||x.used)+' '+(x.unit||'')).join(' · '):'Não informado'});
 }
 return out;
}
function render(){
 const cards=document.getElementById('cutterHistoryCards9250'),tbl=document.getElementById('cutterHistoryTable9250');if(!cards||!tbl)return;const d=dataset(),planned=d.reduce((a,x)=>a+x.planned,0),done=d.reduce((a,x)=>a+x.done,0),cost=d.reduce((a,x)=>a+x.total,0);
 cards.innerHTML='<div class="card"><small>Planejado</small><strong>'+planned.toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Realizado</small><strong>'+done.toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Falta</small><strong>'+Math.max(0,planned-done).toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Custo do período</small><strong>'+moneySafe(cost)+'</strong></div>';
 const rs=d.map(x=>[escSafe(x.c?.name||'Sem cortador'),escSafe(x.c?.cutType||'-'),escSafe(x.cut.finishedAt||x.cut.date||'-'),x.o?'#'+escSafe(typeof displayOrderNumber==='function'?displayOrderNumber(x.o):x.o.id):'-',escSafe(productName(x.cut)),x.planned.toLocaleString('pt-BR'),x.done.toLocaleString('pt-BR'),x.missing.toLocaleString('pt-BR'),moneySafe(x.unit),moneySafe(x.total),escSafe(x.pred),escSafe(x.act)]);
 tbl.innerHTML=rs.length?table(['Cortador','Tipo','Data','Pedido','Modelo','Planejado','Realizado','Falta','Custo/peça','Custo total','Material previsto','Material realizado'],rs):'<div class="empty">Nenhum corte no período.</div>';
}
function installCleanup(){
 const base=window.renderCutterProductCosts;if(typeof base!=='function'||base.__clean9250)return;
 const w=function(){
   const el=document.getElementById('cutterProductCostTable');if(!el)return base.apply(this,arguments);const {s,e}=period(),rs=[];
   for(const c of arr('cutters')){
     const cuts=arr('cuts').filter(x=>sid(x.cutterId)===sid(c.id)&&/finalizado/i.test(sid(x.status))&&inside(x.finishedAt||x.date,s,e)),pieces=cuts.reduce((a,x)=>a+q(x.pieces),0),g=new Map();
     for(const cut of cuts){const n=productName(cut);g.set(n,(g.get(n)||0)+q(cut.pieces))}
     for(const [n,qtyv] of g){const sample=cuts.find(x=>productName(x)===n),u=unitCost(c,sample,pieces);rs.push([escSafe(c.name),escSafe(n),qtyv.toLocaleString('pt-BR'),moneySafe(u),moneySafe(u*qtyv),escSafe(c.cutType||'-')])}
   }
   el.innerHTML=rs.length?table(['Cortador','Produto','Peças','Custo por peça','Custo total','Tipo'],rs):'<div class="empty">Nenhum corte finalizado no período selecionado.</div>';render();
 };
 w.__clean9250=true;w.__original=base;window.renderCutterProductCosts=w;
 const rc=window.renderCutters;if(typeof rc==='function'&&!rc.__hist9250){window.renderCutters=function(){const r=rc.apply(this,arguments);setTimeout(render,0);return r};window.renderCutters.__hist9250=true}
}
window.exportCutterHistory9250=function(){
 const d=dataset(),lines=[['Cortador','Tipo','Data','Pedido','Modelo','Planejado','Realizado','Falta','Custo unitário','Custo total'].join(';')];
 for(const x of d)lines.push([x.c?.name||'Sem cortador',x.c?.cutType||'',x.cut.finishedAt||x.cut.date||'',x.o?(typeof displayOrderNumber==='function'?displayOrderNumber(x.o):x.o.id):'',productName(x.cut),x.planned,x.done,x.missing,x.unit,x.total].map(v=>'"'+sid(v).replace(/"/g,'""')+'"').join(';'));
 const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='HLGB-HISTORICO-CORTADORES-'+today()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
function boot(){ensure();installCleanup();render()}
setTimeout(boot,1800);setInterval(ensure,4000);
window.renderCutterHistory9250=render;
window.hlgbCutterHistory9250={dataset,productName,render};
console.info('[HLGB] '+V+' ativo');
})();