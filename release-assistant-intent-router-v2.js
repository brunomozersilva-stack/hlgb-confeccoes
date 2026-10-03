/* HLGB — roteador de intenção do Assistente: respostas objetivas e previsíveis */
(function(){
'use strict';
const V='2026.10.02-assistant-intent-router-v2';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function todayISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function addDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fmt(iso){if(!iso)return '-';try{return typeof fmtDate==='function'?fmtDate(iso):iso.split('-').reverse().join('/')}catch(e){return iso}}
function productById(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function productTokens(name){const generic=new Set(['camisola','camisa','calcinha','body','conjunto','short','doll','top','sutia','sutiã','robe','baby']);return norm(name).split(/\s+/).filter(t=>t.length>=3&&!generic.has(t))}
function findProduct(raw){
 const n=norm(raw),ps=arr('products').filter(p=>p?.name);
 const exact=ps.filter(p=>n.includes(norm(p.name))).sort((a,b)=>String(b.name).length-String(a.name).length)[0];if(exact)return exact;
 const words=n.split(/\s+/).filter(w=>w.length>=3);
 return ps.map(p=>({p,score:productTokens(p.name).filter(t=>words.some(w=>w===t||w.includes(t)||t.includes(w))).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(b.p.name).length-String(a.p.name).length)[0]?.p||null;
}
function orderProductQty(o,pid){
 let qty=0;for(const g of (o?.grade||[]))if(sid(g?.productId)===sid(pid))qty+=q(g.qty);
 if(!qty&&sid(o?.productId)===sid(pid))qty=q(o.qty||o.totalQty);
 return qty;
}
function nextDelivery(raw){
 const n=norm(raw);
 if(!/(proxima|proximo|mais proxima|mais proximo)/.test(n)||!/(entrega|entregar|data)/.test(n))return null;
 const p=findProduct(raw);if(!p)return {kind:'system-info',title:'Próxima entrega',text:'Não consegui identificar com segurança qual produto você quis consultar.'};
 const today=todayISO();
 const rows=arr('orders').filter(o=>{
   const st=norm(o?.status);if(st.includes('cancelad'))return false;
   const d=String(o?.projectionDeliveryDate||o?.date||'').slice(0,10);if(!d||d<today)return false;
   return orderProductQty(o,p.id)>0;
 }).map(o=>({o,date:String(o.projectionDeliveryDate||o.date).slice(0,10),qty:orderProductQty(o,p.id)}))
 .sort((a,b)=>a.date.localeCompare(b.date)||String(a.o.client||'').localeCompare(String(b.o.client||''),'pt-BR'));
 if(!rows.length)return {kind:'system-info',title:'Próxima entrega — '+p.name,text:'Não encontrei entrega futura cadastrada para <b>'+escSafe(p.name)+'</b>.'};
 const firstDate=rows[0].date,same=rows.filter(x=>x.date===firstDate),total=same.reduce((a,x)=>a+x.qty,0);
 const lines=same.map(x=>'• <b>'+escSafe(x.o.client||'Sem cliente')+'</b> — '+x.qty.toLocaleString('pt-BR')+' peças'+(x.o.orderNumber||x.o.id?' — pedido #'+escSafe(x.o.orderNumber||x.o.id):'')).join('<br>');
 return {kind:'system-info',title:'Próxima entrega — '+p.name,text:'<b>'+fmt(firstDate)+'</b><br>'+lines+(same.length>1?'<br><br><b>Total nessa data: '+total.toLocaleString('pt-BR')+' peças</b>':'')};
}
function cutDate(c){return String(c?.plannedCutDate||c?.cutDate||c?.scheduledDate||c?.date||c?.createdAt||'').slice(0,10)}
function cutActive(c){const s=norm(c?.status);return !s.includes('finalizado')&&!s.includes('concluido')&&!s.includes('cancelado')}
function addGroup(groups,pid,name,qty,unit){
 const key=sid(pid)||norm(name),g=groups[key]||(groups[key]={name:name||'Produto',qty:0,value:0});g.qty+=q(qty);g.value+=q(qty)*q(unit);
}
function unitPrice(order,pid){
 let u=0;try{if(order?.clientId&&pid&&typeof suggestedPrice==='function')u=q(suggestedPrice(order.clientId,pid))}catch(e){}
 return u||q(productById(pid)?.price);
}
function parseCutDescription(c,groups){
 const text=String(c?.description||c?.product||'');if(!text.includes('|')&&!/\bTam\b/i.test(text))return false;
 let found=false;
 for(const part of text.split('|')){
   const m=part.trim().match(/^(\d{1,7})\s+(.+)$/);if(!m)continue;
   const qty=q(m[1]),p=findProduct(m[2]);if(!p||!qty)continue;
   const o=arr('orders').find(x=>sid(x?.id)===sid(c?.orderId));addGroup(groups,p.id,p.name,qty,unitPrice(o,p.id));found=true;
 }
 return found;
}
function aggregateCut(c,groups){
 const o=arr('orders').find(x=>sid(x?.id)===sid(c?.orderId));
 const detail=(c?.actualCutGrade||c?.originalGrade||c?.grade||[]).filter(x=>q(x?.qty)>0);
 if(detail.length){
   const by={};for(const x of detail){const pid=sid(x.productId||c.productId),k=pid||'x';by[k]=(by[k]||0)+q(x.qty)}
   for(const [pid,qty] of Object.entries(by)){const p=productById(pid)||productById(c.productId);addGroup(groups,pid,p?.name||c.product||'Produto',qty,unitPrice(o,pid))}
   return;
 }
 if(c?.productId){const p=productById(c.productId);addGroup(groups,c.productId,p?.name||c.product||'Produto',q(c.pieces)||orderProductQty(o,c.productId),unitPrice(o,c.productId));return}
 if(parseCutDescription(c,groups))return;
 const pids=[...new Set((o?.grade||[]).map(g=>sid(g.productId)).filter(Boolean))];
 if(pids.length){for(const pid of pids){const qty=orderProductQty(o,pid);if(qty)addGroup(groups,pid,productById(pid)?.name||'Produto',qty,unitPrice(o,pid));return}}
 addGroup(groups,'',c?.product||'Corte',q(c?.pieces),0);
}
function cutsSummary(raw){
 const n=norm(raw);if(!/(\bcorte\b|\bcortes\b|\bcortar\b)/.test(n)||/grade/.test(n))return null;
 let target=null,label='pendentes';
 if(/amanha/.test(n)){target=addDays(todayISO(),1);label='amanhã'}
 else if(/hoje/.test(n)){target=todayISO();label='hoje'}
 const cuts=arr('cuts').filter(c=>cutActive(c)&&(!target||cutDate(c)===target));
 const groups={};for(const c of cuts)aggregateCut(c,groups);
 const rows=Object.values(groups).filter(x=>x.qty>0).sort((a,b)=>b.qty-a.qty||a.name.localeCompare(b.name,'pt-BR'));
 if(!rows.length)return {kind:'system-info',title:'Cortes para '+label,text:'Não encontrei cortes '+label+'.'};
 const qty=rows.reduce((a,x)=>a+x.qty,0),value=rows.reduce((a,x)=>a+x.value,0);
 return {kind:'system-info',title:'Cortes para '+label,text:rows.map(x=>'• <b>'+escSafe(x.name)+'</b> — '+x.qty.toLocaleString('pt-BR')+' peças'+(x.value?' — '+moneySafe(x.value):'')).join('<br>')+'<br><br><b>Total: '+qty.toLocaleString('pt-BR')+' peças'+(value?' — '+moneySafe(value):'')+'</b>'};
}
function direct(raw){return nextDelivery(raw)||cutsSummary(raw)||null}
function render(a){
 const out=document.getElementById('hlgbAssistantAnswer');if(!out||!a)return;
 out.innerHTML='<h3 style="margin-top:0">'+escSafe(a.title||'Assistente HLGB')+'</h3>'+(a.text||'');out.dataset.pendingKind=a.kind||'';
}
function install(){
 const cur=window.hlgbAssistantAsk;if(typeof cur!=='function'||cur.__hlgbIntentRouterV2)return;
 const base=cur,w=function(){const raw=String(document.getElementById('hlgbAssistantInput')?.value||'').trim(),a=direct(raw);if(a){render(a);return}return base.apply(this,arguments)};
 w.__hlgbIntentRouterV2=true;w.__original=base;window.hlgbAssistantAsk=w;
}
function boot(){install()}
setTimeout(boot,4200);setInterval(()=>{if(window.HLGB_ASSISTANT_FINAL_V9250)return;if(typeof window.hlgbAssistantAsk==='function'&&!window.hlgbAssistantAsk.__hlgbIntentRouterV2)install()},2500);
window.hlgbAssistantIntentRouter={direct,nextDelivery,cutsSummary,findProduct,aggregateCut};
window.HLGB_ASSISTANT_INTENT_ROUTER_GUARD=V;
console.info('[HLGB] roteador de intenção do Assistente v2 ativo');
})();