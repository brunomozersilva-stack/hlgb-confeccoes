/* HLGB v93.87 — baixa remove modelo de todo fluxo ativo, inclusive projeção e nota */
(function(){
'use strict';
const V='93.87';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=n=>{try{return Array.isArray(window.db?.[n])?window.db[n]:[]}catch(_){return[]}};
const vis=()=>window.hlgbOperationalVisibility9385||window.hlgbOperationalVisibility9384||null;
const product=id=>arr('products').find(p=>sid(p.id)===sid(id))||null;
const cutBy=id=>arr('cuts').find(c=>sid(c.id)===sid(id))||null;
const prodBy=id=>arr('production').find(p=>sid(p.id)===sid(id))||null;
function derivedOrderProductHidden(orderId,pid){
 if(!orderId||!pid)return false;
 for(const w of arr('operationalWriteoffs')){
  const refs=Array.isArray(w?.sourceRefs)?w.sourceRefs:[];
  for(const r of refs){
   const rp=sid(r?.productId||w?.productId||'');
   if(rp&&rp!==sid(pid))continue;
   if(sid(r?.type)==='cut'){
    const c=cutBy(r?.id);if(c&&sid(c.orderId)===sid(orderId))return true;
   }else if(sid(r?.type)==='production'){
    const p=prodBy(r?.id);if(p&&sid(p.orderId)===sid(orderId))return true;
   }
  }
 }
 return false;
}
function isHidden(orderId,pid){const v=vis(),base=!!(v&&orderId&&pid&&typeof v.orderProductHidden==='function'&&v.orderProductHidden(orderId,pid));return base||derivedOrderProductHidden(orderId,pid)}
function prodHidden(p){const v=vis();if(v&&typeof v.productionHidden==='function'&&v.productionHidden(p))return true;return !!(p?.orderId&&p?.productId&&isHidden(p.orderId,p.productId))}
function visibleGrade(o){const g=Array.isArray(o?.grade)?o.grade:[];return g.filter(r=>!r?.productId||!isHidden(o?.id,r.productId))}
function allHidden(o){if(!o)return false;const g=Array.isArray(o.grade)?o.grade.filter(r=>r&&r.productId):[];if(g.length)return g.every(r=>isHidden(o.id,r.productId));return !!(o.productId&&isHidden(o.id,o.productId))}
function unitPrice(o,r){if(Number(r?.unitPrice)>0)return Number(r.unitPrice);try{if(typeof window.suggestedPrice==='function'){const x=Number(window.suggestedPrice(o?.clientId||0,r?.productId));if(x>0)return x}}catch(_){}const p=product(r?.productId);if(Number(p?.price)>0)return Number(p.price);if(Number(o?.unitPrice)>0)return Number(o.unitPrice);return 0}
function gradeValue(o,g){return (g||[]).reduce((s,r)=>s+q(r?.qty??r?.quantity)*unitPrice(o,r),0)}
function visibleTotal(o,g){const all=Array.isArray(o?.grade)?o.grade:[],total=q(o?.total);if(!all.length)return allHidden(o)?0:total;const av=gradeValue(o,all),vv=gradeValue(o,g);if(av>0&&total>0)return Math.round((total*(vv/av)+Number.EPSILON)*100)/100;const aq=all.reduce((s,r)=>s+q(r?.qty??r?.quantity),0),vq=(g||[]).reduce((s,r)=>s+q(r?.qty??r?.quantity),0);return aq&&total?Math.round((total*(vq/aq)+Number.EPSILON)*100)/100:vv}
function itemText(g){return (g||[]).map(r=>{const p=product(r?.productId),bits=[q(r?.qty??r?.quantity),p?.name||'Produto'];if(r?.color)bits.push(r.color);if(r?.size||r?.tamanho)bits.push('Tam '+(r.size||r.tamanho));return bits.join(' ')}).join(' | ')}
function visibleOrder(o){if(!o)return o;const g=visibleGrade(o),qty=g.length?g.reduce((s,r)=>s+q(r?.qty??r?.quantity),0):(allHidden(o)?0:q(o.qty??o.totalQty));return {...o,grade:g,qty,totalQty:qty,total:visibleTotal(o,g),items:g.length?itemText(g):(allHidden(o)?'':o.items)}}
function withFiltered(module,filter,fn,args,self){if(!window.db||!Array.isArray(window.db[module]))return fn.apply(self,args);const original=window.db[module];window.db[module]=original.filter(filter);try{return fn.apply(self,args)}finally{window.db[module]=original}}
function withVisibleOrders(fn,args,self){if(!window.db||!Array.isArray(window.db.orders))return fn.apply(self,args);const original=window.db.orders;window.db.orders=original.filter(o=>!allHidden(o)).map(visibleOrder);try{return fn.apply(self,args)}finally{window.db.orders=original}}
function wrap(name,maker){const old=window[name];if(typeof old!=='function'||old.__hlgb9387)return;const w=maker(old);w.__hlgb9387=true;w.__original=old;window[name]=w}
function wrapViews(){
 wrap('renderProduction',old=>function(){return withFiltered('production',p=>!prodHidden(p),old,arguments,this)});
 wrap('productionHubRows',old=>function(){return withFiltered('production',p=>!prodHidden(p),old,arguments,this)});
 wrap('renderProductionHub',old=>function(){return withFiltered('production',p=>!prodHidden(p),old,arguments,this)});
 wrap('renderProjection',old=>function(){return withVisibleOrders(old,arguments,this)});
 wrap('changeProjectionDate',old=>function(){return withVisibleOrders(old,arguments,this)});
 wrap('renderOrderNotes',old=>function(){return withVisibleOrders(old,arguments,this)});
 wrap('orderProductSummary',old=>function(o){const vo=visibleOrder(o);if(allHidden(o))return'';return old.call(this,vo)});
 wrap('printCustomerNote',old=>function(o,c,info){const vo=visibleOrder(o),next={...(info||{}),value:visibleTotal(o,visibleGrade(o))};return old.call(this,vo,c,next)});
 wrap('renderFactions',old=>function(){if(!window.db||!Array.isArray(window.db.factions))return old.apply(this,arguments);return withFiltered('factions',f=>{if(f?.productionId){const p=arr('production').find(x=>sid(x.id)===sid(f.productionId));if(p&&prodHidden(p))return false}if(f?.orderId&&f?.productId&&isHidden(f.orderId,f.productId))return false;return true},old,arguments,this)});
}
function customerFor(o){try{return typeof window.clientContactForOrder==='function'?window.clientContactForOrder(o):{}}catch(_){return{}}}
function isoToday(){try{return typeof window.isoDate==='function'?window.isoDate(new Date()):new Date().toISOString().slice(0,10)}catch(_){return new Date().toISOString().slice(0,10)}}
function installNotaPronta(){const old=window.notaPronta;if(typeof old!=='function'||old.__hlgb9387)return;const fn=function(id){const o=arr('orders').find(x=>sid(x.id)===sid(id));if(!o)return;if(allHidden(o))return alert('Todos os modelos deste pedido já tiveram baixa. Não há produto ativo para nota.');const vo=visibleOrder(o),c=customerFor(o),customerName=c?.contact||c?.name||o.client||'Cliente',customerPhone=c?.phone||c?.whatsapp||c?.telefone||'',defaultValue=visibleTotal(o,visibleGrade(o));if(typeof window.openModal!=='function')return old.apply(this,arguments);window.openModal('Nota pronta — cobrança','<div class="grid"><div class="field"><label>Cliente</label><input value="'+esc(c?.name||o.client||'')+'" disabled></div><div class="field"><label>Nome da pessoa / contato</label><input id="ncontact" value="'+esc(customerName)+'"></div><div class="field"><label>Telefone / WhatsApp</label><input id="nphone" value="'+esc(customerPhone)+'"></div><div class="field"><label>Valor da cobrança</label><input id="nvalue" type="number" step=".01" value="'+defaultValue+'"></div><div class="field"><label>Data da cobrança</label><input id="ndate" type="date" value="'+isoToday()+'"></div><div class="field"><label>Vencimento</label><input id="ndue" type="date" value="'+esc(o.date||isoToday())+'"></div><div class="field"><label>Condições de pagamento</label><select id="ncond"><option>À vista</option><option>7 dias</option><option>14 dias</option><option>21 dias</option><option>28 dias</option><option>30 dias</option><option>Personalizado</option></select></div><div class="field"><label>Mensagem de agradecimento</label><textarea id="nmsg">Agradecemos pela preferência e pela confiança em nosso trabalho. Será um prazer continuar atendendo você!</textarea></div></div><div class="sub">Produtos que receberam baixa não entram nesta nota.</div><button type="button" class="primary modalSave">Lançar no financeiro e preparar impressão</button>',()=>{window.db.finance=Array.isArray(window.db.finance)?window.db.finance:[];const value=q(document.getElementById('nvalue')?.value),ncontact=document.getElementById('ncontact')?.value||'',nphone=document.getElementById('nphone')?.value||'',ndate=document.getElementById('ndate')?.value||isoToday(),ndue=document.getElementById('ndue')?.value||o.date||isoToday(),ncond=document.getElementById('ncond')?.value||'À vista',nmsg=document.getElementById('nmsg')?.value||'',existing=window.db.finance.find(f=>sid(f.orderId)===sid(o.id)&&f.type==='Receber'&&f.status!=='Pago'),activeNames=[...new Set((vo.grade||[]).map(r=>product(r.productId)?.name).filter(Boolean))],launch={type:'Receber',desc:'Pedido #'+o.id+' — '+(o.client||'')+(activeNames.length?' — '+activeNames.join(', '):''),value,status:'Pendente',paid:0,remaining:value,date:ndue,orderId:o.id,clientId:o.clientId||c?.id||null,clientName:o.client||c?.name||'',paymentTerms:ncond,note:nmsg,contact:ncontact,phone:nphone,operationalWriteoffFiltered:true,activeProductIds:[...new Set((vo.grade||[]).map(r=>r.productId).filter(Boolean))]};if(existing)Object.assign(existing,launch);else window.db.finance.push({id:Date.now(),...launch});o.paymentHistory=Array.isArray(o.paymentHistory)?o.paymentHistory:[];o.paymentStatus='Pendente';o.invoiceReady=true;o.noteReady=true;o.invoiceDate=ndate;o.dueDate=ndue;o.paymentTerms=ncond;o.invoiceNote=nmsg;o.contactName=ncontact;o.contactPhone=nphone;try{if(typeof window.closeModal==='function')window.closeModal()}catch(_){}try{if(typeof window.save==='function')window.save();else if(typeof window.persistDb==='function')window.persistDb()}catch(e){console.error('[HLGB v93.87] falha ao salvar nota',e);alert('Não foi possível salvar a nota.');return}try{window.renderOrderNotes?.()}catch(_){}try{window.printCustomerNote?.(vo,c,{name:ncontact,phone:nphone,message:nmsg,value,due:ndue,terms:ncond})}catch(e){console.error(e)}})};fn.__hlgb9387=true;fn.__original=old;window.notaPronta=fn}
function refresh(){wrapViews();installNotaPronta();try{window.renderProduction?.()}catch(_){}try{window.renderProductionHub?.()}catch(_){}try{window.renderCuts?.()}catch(_){}try{window.renderProjection?.()}catch(_){}try{window.renderOrderNotes?.()}catch(_){}try{window.renderFactions?.()}catch(_){}}
function diagnostics(){const v=vis();return{version:V,hiddenProduction:arr('production').filter(p=>prodHidden(p)).length,ordersFullyHidden:arr('orders').filter(allHidden).length,ordersPartiallyHidden:arr('orders').filter(o=>!allHidden(o)&&Array.isArray(o.grade)&&o.grade.some(r=>r?.productId&&isHidden(o.id,r.productId))).length,derivedOrderProductLinks:arr('operationalWriteoffs').reduce((n,w)=>n+(Array.isArray(w?.sourceRefs)?w.sourceRefs.length:0),0),coreVersion:v?.version||null}}
window.hlgbOperationalVisibility9386={version:V,visibleGrade,visibleOrder,allHidden,visibleTotal,isHidden,derivedOrderProductHidden,diagnostics,refresh};refresh();try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>refresh(),0)}catch(_){}console.info('[HLGB] v'+V+' baixa em todo fluxo ativo',diagnostics());
})();