/* HLGB v93.88 — baixa por pedido + modelo em todo fluxo ativo */
(function(){
'use strict';
const V='93.88';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=n=>{try{return Array.isArray(window.db?.[n])?window.db[n]:[]}catch(_){return[]}};
const core=()=>window.hlgbOperationalVisibility9385||window.hlgbOperationalVisibility9384||null;
const product=id=>arr('products').find(p=>sid(p.id)===sid(id))||null;
const order=id=>arr('orders').find(o=>sid(o.id)===sid(id))||null;
const cutBy=id=>arr('cuts').find(c=>sid(c.id)===sid(id))||null;
const prodBy=id=>arr('production').find(p=>sid(p.id)===sid(id))||null;
function gradeRows(raw){return Array.isArray(raw)?raw.filter(r=>r&&typeof r==='object'):[]}
function orderQty(orderId,pid){const o=order(orderId);if(!o)return 0;return gradeRows(o.grade).reduce((s,r)=>sid(r.productId)===sid(pid)?s+q(r.qty??r.quantity):s,0)}
function orderClient(o){return sid(o?.client||o?.clientName||arr('clients').find(c=>sid(c.id)===sid(o?.clientId))?.name||'')}
function sourceInfo(r,w){
 const type=sid(r?.type),src=type==='cut'?cutBy(r?.id):type==='production'?prodBy(r?.id):null;
 const orderId=sid(r?.orderId||src?.orderId||'');
 const productId=sid(r?.productId||w?.productId||src?.productId||'');
 return {type,id:sid(r?.id),orderId,productId};
}
function legacyOrderProduct(w){
 const pid=sid(w?.productId||'');if(!pid)return null;
 const c=core();if(c&&typeof c.matchingLegacyOrder==='function'){
  const o=c.matchingLegacyOrder(w);if(o)return {orderId:sid(o.id),productId:pid};
 }
 const who=norm(w?.clientName||''),qty=q(w?.quantity);
 const hits=arr('orders').filter(o=>norm(orderClient(o))===who&&orderQty(o.id,pid)===qty);
 return hits.length===1?{orderId:sid(hits[0].id),productId:pid}:null;
}
function writeoffPairs(w){
 const out=new Map();
 const add=(orderId,productId)=>{if(!orderId)return;const pid=sid(productId||'*')||'*';out.set(sid(orderId)+'|'+pid,{orderId:sid(orderId),productId:pid})};
 for(const x of Array.isArray(w?.orderProductRefs)?w.orderProductRefs:[])add(x?.orderId,x?.productId||w?.productId);
 const refs=Array.isArray(w?.sourceRefs)?w.sourceRefs:[];
 for(const r of refs){const x=sourceInfo(r,w);if(x.orderId)add(x.orderId,x.productId||'*')}
 if(!out.size&&sid(w?.sourceType)==='model'){
  const x=legacyOrderProduct(w);if(x)add(x.orderId,x.productId);
 }
 return [...out.values()];
}
function hiddenPairIndex(){const s=new Set();for(const w of arr('operationalWriteoffs'))for(const x of writeoffPairs(w))s.add(x.orderId+'|'+x.productId);return s}
function isHidden(orderId,pid){
 if(!orderId||!pid)return false;
 const s=hiddenPairIndex(),oid=sid(orderId),p=sid(pid);
 if(s.has(oid+'|'+p)||s.has(oid+'|*'))return true;
 const c=core();return !!(c&&typeof c.orderProductHidden==='function'&&c.orderProductHidden(oid,p));
}
function prodHidden(p){if(!p)return false;if(p.orderId&&p.productId&&isHidden(p.orderId,p.productId))return true;const c=core();return !!(c&&typeof c.productionHidden==='function'&&c.productionHidden(p))}
function visibleGrade(o){return gradeRows(o?.grade).filter(r=>!r.productId||!isHidden(o?.id,r.productId))}
function allHidden(o){const ids=[...new Set(gradeRows(o?.grade).map(r=>sid(r.productId)).filter(Boolean))];if(ids.length)return ids.every(pid=>isHidden(o.id,pid));return !!(o?.productId&&isHidden(o.id,o.productId))}
function unitPrice(o,r){if(Number(r?.unitPrice)>0)return Number(r.unitPrice);try{if(typeof window.suggestedPrice==='function'){const x=Number(window.suggestedPrice(o?.clientId||0,r?.productId));if(x>0)return x}}catch(_){}const p=product(r?.productId);return Number(p?.price||o?.unitPrice||0)}
function gradeValue(o,g){return (g||[]).reduce((s,r)=>s+q(r.qty??r.quantity)*unitPrice(o,r),0)}
function visibleTotal(o,g){const all=gradeRows(o?.grade),total=q(o?.total);if(!all.length)return allHidden(o)?0:total;const av=gradeValue(o,all),vv=gradeValue(o,g);if(av>0&&total>0)return Math.round(total*(vv/av)*100)/100;const aq=all.reduce((s,r)=>s+q(r.qty??r.quantity),0),vq=(g||[]).reduce((s,r)=>s+q(r.qty??r.quantity),0);return aq&&total?Math.round(total*(vq/aq)*100)/100:vv}
function itemText(g){return (g||[]).map(r=>[q(r.qty??r.quantity),product(r.productId)?.name||'Produto',r.color||'',r.size||r.tamanho?('Tam '+(r.size||r.tamanho)):''].filter(Boolean).join(' ')).join(' | ')}
function visibleOrder(o){if(!o)return o;const g=visibleGrade(o),qty=g.reduce((s,r)=>s+q(r.qty??r.quantity),0);return {...o,grade:g,qty:g.length?qty:(allHidden(o)?0:q(o.qty??o.totalQty)),totalQty:g.length?qty:(allHidden(o)?0:q(o.totalQty??o.qty)),total:visibleTotal(o,g),items:g.length?itemText(g):(allHidden(o)?'':o.items)}}
function itemPid(item){const direct=sid(item?.productId||'');if(direct)return direct;const id=sid(item?.id||'');if(id&&product(id))return id;const n=norm(item?.name||item?.product||'');if(!n)return'';const hits=arr('products').filter(p=>norm(p.name)===n);return hits.length===1?sid(hits[0].id):''}
function projectionRowVisible(r){const oid=sid(r?.order?.id||r?.orderId||''),pid=itemPid(r?.item||r);return !oid||!pid||!isHidden(oid,pid)}
function withFiltered(module,filter,fn,args,self){if(!window.db||!Array.isArray(window.db[module]))return fn.apply(self,args);const old=window.db[module];window.db[module]=old.filter(filter);try{return fn.apply(self,args)}finally{window.db[module]=old}}
function withVisibleOrders(fn,args,self){if(!window.db||!Array.isArray(window.db.orders))return fn.apply(self,args);const old=window.db.orders;window.db.orders=old.filter(o=>!allHidden(o)).map(visibleOrder);try{return fn.apply(self,args)}finally{window.db.orders=old}}
function chainHasMarker(fn,marker){
 const seen=new Set(),pointers=['__original','__hlgb9307Original','__hlgb9320Original','__hlgb955Original','__hlgbReliableOriginal'];
 let cur=fn,depth=0;
 while(typeof cur==='function'&&!seen.has(cur)&&depth++<48){
  if(cur[marker])return true;
  seen.add(cur);
  let next=null;
  for(const key of pointers){try{if(typeof cur[key]==='function'){next=cur[key];break}}catch(e){}}
  cur=next;
 }
 return false;
}
function wrap(name,maker){const old=window[name];if(typeof old!=='function'||chainHasMarker(old,'__hlgb9388'))return;const w=maker(old);w.__hlgb9388=true;w.__original=old;window[name]=w}
function wrapProviders(){
 wrap('projectionItemsForOrder',old=>function(o){const vo=visibleOrder(o),rows=old.call(this,vo)||[];return rows.filter(item=>{const pid=itemPid(item);return !pid||!isHidden(o?.id,pid)})});
 wrap('allProjectionRows',old=>function(){return (old.apply(this,arguments)||[]).filter(projectionRowVisible)});
 wrap('renderProjection',old=>function(){return withVisibleOrders(old,arguments,this)});
 wrap('changeProjectionDate',old=>function(){return withVisibleOrders(old,arguments,this)});
 wrap('renderProduction',old=>function(){return withFiltered('production',p=>!prodHidden(p),old,arguments,this)});
 wrap('productionHubRows',old=>function(){return withFiltered('production',p=>!prodHidden(p),old,arguments,this)});
 wrap('renderProductionHub',old=>function(){return withFiltered('production',p=>!prodHidden(p),old,arguments,this)});
 wrap('renderOrderNotes',old=>function(){return withVisibleOrders(old,arguments,this)});
 wrap('orderProductSummary',old=>function(o){if(allHidden(o))return'';return old.call(this,visibleOrder(o))});
 wrap('printCustomerNote',old=>function(o,c,info){const vo=visibleOrder(o);return old.call(this,vo,c,{...(info||{}),value:visibleTotal(o,vo.grade)})});
 wrap('renderFactions',old=>function(){return withFiltered('factions',f=>{if(f?.productionId){const p=prodBy(f.productionId);if(p&&prodHidden(p))return false}return !(f?.orderId&&f?.productId&&isHidden(f.orderId,f.productId))},old,arguments,this)});
}
function correctedModel(m){
 const pairs=new Map(),refs=[];
 for(const r of Array.isArray(m?.sourceRefs)?m.sourceRefs:[]){const x=sourceInfo(r,m);refs.push({...r,productId:r.productId||m.productId||undefined});if(x.orderId&&x.productId)pairs.set(x.orderId+'|'+x.productId,{orderId:x.orderId,productId:x.productId})}
 if(!pairs.size&&m?.productId){
  const candidates=arr('orders').filter(o=>orderQty(o.id,m.productId)>0&&norm(orderClient(o))===norm(m.clientName));
  if(candidates.length===1)pairs.set(sid(candidates[0].id)+'|'+sid(m.productId),{orderId:sid(candidates[0].id),productId:sid(m.productId)})
 }
 const orderProductRefs=[...pairs.values()];let qty=orderProductRefs.reduce((s,x)=>s+orderQty(x.orderId,x.productId),0);if(!qty)qty=q(m?.qty);
 return {...m,qty,sourceRefs:refs,orderProductRefs};
}
async function officialSave(row){if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação oficial indisponível.');const r=await window.hlgbRecordSaveWithRetry('operationalWriteoffs',sid(row.id),row,false);if(!r?.applied)throw new Error(r?.reason||'A nuvem não confirmou a baixa.');const a=arr('operationalWriteoffs'),i=a.findIndex(x=>sid(x.id)===sid(row.id));if(i>=0)a[i]=r.data||row;else a.push(r.data||row);return r.data||row}
function userLabel(){try{const u=typeof window.currentUser==='function'?window.currentUser():null;return sid(u?.name||u?.login||window.cloudUser?.email||'Usuário HLGB')}catch(_){return'Usuário HLGB'}}
function canonicalWriteoffActive(){
 return window.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY==='93.91'&&window.hlgbWriteoffIntegrity9391?.version==='93.91';
}
function installWriteoff(){
 if(canonicalWriteoffActive())return false;
 const fn=async function(){
  const c=core(),ids=[...document.querySelectorAll('.hlgb9385-writeoff:checked')].map(x=>x.value),base=typeof c?.writeoffModels==='function'?c.writeoffModels():[],sel=base.filter(x=>ids.includes(x.id)).map(correctedModel);
  if(!sel.length)return alert('Selecione pelo menos um modelo.');
  if(typeof window.openModal!=='function')return alert('Janela de baixa indisponível.');
  window.openModal('Dar baixa em '+sel.length+' modelo(s)','<div class="field"><label>Motivo</label><select id="w9388reason"><option>Já pago</option><option>Produção antiga</option><option>Regularização do período sem sistema</option><option>Outro</option></select></div><div class="field"><label>Observação</label><textarea id="w9388note"></textarea></div><div class="sub">A baixa retira o modelo de pedido/ordem, corte, produção, projeção, embalagem e nota. O histórico da baixa é preservado.</div><button class="primary modalSave">Confirmar baixa</button>',async()=>{
   try{for(const m of sel){const row={id:'baixa-'+Date.now()+'-'+Math.floor(Math.random()*999999),sourceType:'model',sourceId:m.id,sourceRefs:m.sourceRefs,orderProductRefs:m.orderProductRefs,productId:m.productId,productName:m.productName,clientName:m.clientName,quantity:m.qty,reason:document.getElementById('w9388reason')?.value||'Outro',note:document.getElementById('w9388note')?.value||'',user:userLabel(),date:new Date().toISOString().slice(0,10),createdAt:new Date().toISOString(),writeoffVersion:V};await officialSave(row)}window.closeModal?.();refresh()}catch(e){console.error('[HLGB v93.88] baixa',e);alert(e.message||e)}
  });
 };
 fn.__hlgb9388=true;window.hlgbWriteoffSelected9385=fn;window.hlgbWriteoffSelected9384=fn;window.hlgbWriteoffSelected9378=fn;return true;
}
function customerFor(o){try{return typeof window.clientContactForOrder==='function'?window.clientContactForOrder(o):{}}catch(_){return{}}}
function isoToday(){try{return typeof window.isoDate==='function'?window.isoDate(new Date()):new Date().toISOString().slice(0,10)}catch(_){return new Date().toISOString().slice(0,10)}}
function installNotaPronta(){const old=window.notaPronta;if(typeof old!=='function'||old.__hlgb9388)return;const fn=function(id){const o=arr('orders').find(x=>sid(x.id)===sid(id));if(!o)return;if(allHidden(o))return alert('Todos os modelos deste pedido já tiveram baixa. Não há produto ativo para nota.');const vo=visibleOrder(o),c=customerFor(o),name=c?.contact||c?.name||o.client||'Cliente',phone=c?.phone||c?.whatsapp||c?.telefone||'',value=visibleTotal(o,vo.grade);if(typeof window.openModal!=='function')return old.apply(this,arguments);window.openModal('Nota pronta — cobrança','<div class="grid"><div class="field"><label>Cliente</label><input value="'+esc(c?.name||o.client||'')+'" disabled></div><div class="field"><label>Nome da pessoa / contato</label><input id="ncontact" value="'+esc(name)+'"></div><div class="field"><label>Telefone / WhatsApp</label><input id="nphone" value="'+esc(phone)+'"></div><div class="field"><label>Valor da cobrança</label><input id="nvalue" type="number" step=".01" value="'+value+'"></div><div class="field"><label>Data da cobrança</label><input id="ndate" type="date" value="'+isoToday()+'"></div><div class="field"><label>Vencimento</label><input id="ndue" type="date" value="'+esc(o.date||isoToday())+'"></div><div class="field"><label>Condições de pagamento</label><select id="ncond"><option>À vista</option><option>7 dias</option><option>14 dias</option><option>21 dias</option><option>28 dias</option><option>30 dias</option><option>Personalizado</option></select></div><div class="field"><label>Mensagem de agradecimento</label><textarea id="nmsg">Agradecemos pela preferência e pela confiança em nosso trabalho. Será um prazer continuar atendendo você!</textarea></div></div><div class="sub">Produtos baixados não entram nesta nota.</div><button type="button" class="primary modalSave">Lançar no financeiro e preparar impressão</button>',()=>{window.db.finance=Array.isArray(window.db.finance)?window.db.finance:[];const nv=q(document.getElementById('nvalue')?.value),contact=document.getElementById('ncontact')?.value||'',nphone=document.getElementById('nphone')?.value||'',ndate=document.getElementById('ndate')?.value||isoToday(),ndue=document.getElementById('ndue')?.value||o.date||isoToday(),cond=document.getElementById('ncond')?.value||'À vista',msg=document.getElementById('nmsg')?.value||'',existing=window.db.finance.find(f=>sid(f.orderId)===sid(o.id)&&f.type==='Receber'&&f.status!=='Pago'),names=[...new Set(vo.grade.map(r=>product(r.productId)?.name).filter(Boolean))],launch={type:'Receber',desc:'Pedido #'+o.id+' — '+(o.client||'')+(names.length?' — '+names.join(', '):''),value:nv,status:'Pendente',paid:0,remaining:nv,date:ndue,orderId:o.id,clientId:o.clientId||c?.id||null,clientName:o.client||c?.name||'',paymentTerms:cond,note:msg,contact,phone:nphone,operationalWriteoffFiltered:true,activeProductIds:[...new Set(vo.grade.map(r=>r.productId).filter(Boolean))]};if(existing)Object.assign(existing,launch);else window.db.finance.push({id:Date.now(),...launch});o.invoiceReady=true;o.noteReady=true;o.invoiceDate=ndate;o.dueDate=ndue;o.paymentTerms=cond;o.invoiceNote=msg;o.contactName=contact;o.contactPhone=nphone;window.closeModal?.();try{if(typeof window.save==='function')window.save();else if(typeof window.persistDb==='function')window.persistDb()}catch(e){console.error(e);return alert('Não foi possível salvar a nota.')}try{window.renderOrderNotes?.()}catch(_){}try{window.printCustomerNote?.(vo,c,{name:contact,phone:nphone,message:msg,value:nv,due:ndue,terms:cond})}catch(e){console.error(e)}})};fn.__hlgb9388=true;fn.__original=old;window.notaPronta=fn}
function projectionLeaks(){try{const rows=typeof window.allProjectionRows==='function'?window.allProjectionRows():[];return rows.filter(r=>{const oid=sid(r?.order?.id||r?.orderId||''),pid=itemPid(r?.item||r);return oid&&pid&&isHidden(oid,pid)}).map(r=>({orderId:sid(r?.order?.id||r?.orderId),productId:itemPid(r?.item||r),name:r?.item?.name||''}))}catch(_){return[]}}
function diagnostics(){const pairs=hiddenPairIndex();return{version:V,writeoffs:arr('operationalWriteoffs').length,hiddenOrderProducts:[...pairs].length,hiddenProduction:arr('production').filter(prodHidden).length,projectionLeaks:projectionLeaks().length}}
function appReadyForRender(){
 if(window.__HLGB_AUTH_READY!==true)return false;
 try{const shell=document.getElementById('appShell');if(!shell)return true;const s=getComputedStyle(shell);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'}catch(_){return true}
}
function refresh(){wrapProviders();installWriteoff();installNotaPronta();if(!appReadyForRender())return false;try{window.renderProjection?.()}catch(_){}try{window.renderProduction?.()}catch(_){}try{window.renderProductionHub?.()}catch(_){}try{window.renderCuts?.()}catch(_){}try{window.renderOrderNotes?.()}catch(_){}try{window.renderFactions?.()}catch(_){}try{core()?.diagnostics?.()}catch(_){}return true}
window.HLGB_PRODUCTION_VISIBILITY_RENDER_GUARD='93.89';
window.hlgbOperationalVisibility9386={version:V,isHidden,writeoffPairs,hiddenPairIndex,visibleGrade,visibleOrder,allHidden,visibleTotal,projectionLeaks,diagnostics,appReadyForRender,canonicalWriteoffActive,refresh};
refresh();try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>refresh(),0)}catch(_){}console.info('[HLGB] v'+V+' baixa por pedido + modelo ativa',diagnostics());
})();
