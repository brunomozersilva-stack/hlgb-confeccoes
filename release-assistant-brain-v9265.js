/* HLGB v92.65 — cérebro avançado do Assistente (consulta segura + contexto + análise) */
(function(){
'use strict';
const V='92.65',CTX='hlgb_assistant_context_v9265';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>{try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}};
const arr=n=>{try{return Array.isArray(window.db?.[n])?window.db[n]:[]}catch(e){return []}};
function orderNo(o){return sid(o?.orderNumber||o?.number||o?.id)}
function productById(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function locationName(id,fallback){return arr('productionLocations').find(x=>sid(x?.id)===sid(id))?.name||fallback||'Sem local'}
function nowIso(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fmtDate(v){try{return typeof window.fmtDate==='function'?window.fmtDate(v):sid(v).slice(0,10).split('-').reverse().join('/')}catch(e){return sid(v)}}
function loadCtx(){try{return JSON.parse(sessionStorage.getItem(CTX)||'{}')||{}}catch(e){return {}}}
function saveCtx(patch){try{const c=Object.assign(loadCtx(),patch,{updatedAt:Date.now()});sessionStorage.setItem(CTX,JSON.stringify(c));return c}catch(e){return Object.assign(loadCtx(),patch)}}
function tokens(s){const stop=new Set(['o','a','os','as','um','uma','de','da','do','das','dos','e','em','no','na','nos','nas','para','por','com','qual','quais','quanto','quantos','me','mostra','mostrar','fala','fale','tem','tinha','que']);return norm(s).split(/\s+/).filter(x=>x.length>=2&&!stop.has(x))}
function dice(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;if(a.length<2||b.length<2)return a===b?1:0;const m=new Map();for(let i=0;i<a.length-1;i++){const x=a.slice(i,i+2);m.set(x,(m.get(x)||0)+1)}let hit=0;for(let i=0;i<b.length-1;i++){const x=b.slice(i,i+2),n=m.get(x)||0;if(n){hit++;m.set(x,n-1)}}return 2*hit/((a.length-1)+(b.length-1))}
function resolve(raw,list,labelFn){
 const n=norm(raw),ts=tokens(raw),rows=[];
 for(const item of list||[]){const label=sid(labelFn(item));if(!label)continue;const ln=norm(label),lt=tokens(label);let score=0;
  if(n.includes(ln))score+=100+Math.min(40,ln.length);
  const overlap=lt.filter(t=>ts.some(w=>w===t||w.includes(t)||t.includes(w))).length;score+=overlap*18;
  score+=dice(n,ln)*20;
  if(score>0)rows.push({item,label,score});
 }
 rows.sort((a,b)=>b.score-a.score||b.label.length-a.label.length);
 if(!rows.length)return {item:null,ambiguous:false,alternatives:[]};
 const top=rows[0],second=rows[1];
 const ambiguous=!!second&&top.score<120&&Math.abs(top.score-second.score)<8;
 return {item:ambiguous?null:top.item,ambiguous,alternatives:rows.slice(0,4)};
}
function namedOrder(raw){const m=norm(raw).match(/pedido\s*#?\s*(\d+)/);return m?arr('orders').find(o=>orderNo(o)===m[1]||sid(o?.id)===m[1])||null:null}
function render(a){const out=document.getElementById('hlgbAssistantAnswer');if(!out||!a)return false;out.innerHTML='<h3 style="margin-top:0">'+esc(a.title||'Assistente HLGB')+'</h3>'+(a.text||'');out.dataset.pendingKind=a.kind||'brain';return true}
function ambiguity(title,kind,r){return {kind,title,text:'Não identifiquei com segurança. Você quis dizer '+r.alternatives.map(x=>'<b>'+esc(x.label)+'</b>').join(', ')+'? Nenhuma alteração foi feita.'}}

function help(raw){
 if(!/(o que voce consegue|o que vc consegue|o que pode fazer|como pode ajudar|ajuda do assistente|funcoes do assistente|funções do assistente|capacidade do assistente)/.test(norm(raw)))return null;
 return {kind:'brain-help',title:'O que o Assistente HLGB consegue fazer',text:[
  'Posso consultar <b>pedidos, clientes, produtos, cortes, produção, facções, compras, fornecedores, RH, financeiro, projeções, faltantes e auditoria</b>.',
  'Também consigo <b>somar grades, comparar valores, fazer rankings, calcular saldos, mostrar o que falta produzir e resumir situações por cliente, produto, pedido ou local</b>.',
  'Entendo contexto da conversa: depois de você citar um cliente, produto ou pedido, consigo usar esse assunto em perguntas curtas seguintes.',
  'Quando houver risco de confundir nomes parecidos, eu devo <b>perguntar antes</b>. Para ações que alteram dados, a regra continua sendo mostrar prévia/confirmar antes de executar.'
 ].join('<br><br>')};
}

function calc(raw){
 const n=norm(raw).replace(/r\$/g,'').replace(/reais?/g,'').replace(/,/g,'.');
 let m=n.match(/(-?\d+(?:\.\d+)?)\s*%\s*(?:de|do|da)\s*(-?\d+(?:\.\d+)?)/);if(m){const a=Number(m[1]),b=Number(m[2]),v=a*b/100;return {kind:'brain-calc',title:'Cálculo',text:esc(m[1])+'% de '+esc(m[2])+' = <b>'+v.toLocaleString('pt-BR',{maximumFractionDigits:4})+'</b>'}}
 if(!/(calcula|calcular|conta|soma|somar|multiplica|multiplicar|divide|dividir|subtrai|menos|mais|\d\s*[+*/-]\s*\d)/.test(n))return null;
 const expr=(n.match(/-?\d+(?:\.\d+)?(?:\s*[+*/-]\s*-?\d+(?:\.\d+)?)+/)||[])[0];if(!expr)return null;
 const nums=expr.match(/-?\d+(?:\.\d+)?/g)?.map(Number)||[],ops=expr.match(/[+*/-]/g)||[];if(!nums.length||ops.length!==nums.length-1)return null;
 let values=[nums[0]],operators=[];for(let i=0;i<ops.length;i++){const op=ops[i],num=nums[i+1];if(op==='*'||op==='/'){const a=values.pop();values.push(op==='*'?a*num:(num===0?NaN:a/num))}else{operators.push(op);values.push(num)}}let total=values[0];for(let i=0;i<operators.length;i++)total=operators[i]==='+'?total+values[i+1]:total-values[i+1];if(!Number.isFinite(total))return {kind:'brain-calc',title:'Cálculo',text:'Essa conta não pode ser concluída porque há divisão por zero.'};return {kind:'brain-calc',title:'Cálculo',text:esc(expr)+' = <b>'+total.toLocaleString('pt-BR',{maximumFractionDigits:6})+'</b>'}
}

function clientRanking(raw){
 const n=norm(raw);if(!/(cliente.*mais.*(compr|pedido|valor)|ranking.*cliente|maiores clientes|top clientes)/.test(n))return null;
 const map=new Map();for(const o of arr('orders')){if(norm(o?.status).includes('cancelad'))continue;const name=sid(o?.client||'Sem cliente'),key=norm(name),g=map.get(key)||{name,qty:0,value:0,orders:0};const grade=Array.isArray(o?.grade)?o.grade:[];g.qty+=grade.reduce((a,x)=>a+q(x?.qty),0);g.value+=q(o?.total||o?.value);g.orders++;map.set(key,g)}
 const rows=[...map.values()].sort((a,b)=>b.value-a.value||b.qty-a.qty).slice(0,10);if(!rows.length)return {kind:'brain-ranking',title:'Ranking de clientes',text:'Não encontrei pedidos suficientes para montar o ranking.'};return {kind:'brain-ranking',title:'Ranking de clientes',text:rows.map((x,i)=>(i+1)+'º <b>'+esc(x.name)+'</b> · '+money(x.value)+' · '+x.qty.toLocaleString('pt-BR')+' peças · '+x.orders+' pedido(s)').join('<br>')}
}
function productRanking(raw){
 const n=norm(raw);if(!/(produto.*mais.*(vend|pedido|quantidade)|ranking.*produto|modelos.*mais.*pedidos|top produtos)/.test(n))return null;
 const map=new Map();for(const o of arr('orders')){if(norm(o?.status).includes('cancelad'))continue;for(const g of (o?.grade||[])){const p=productById(g?.productId),name=p?.name||g?.product||g?.name||'Produto',key=sid(g?.productId)||norm(name),x=map.get(key)||{name,qty:0,orders:new Set()};x.qty+=q(g?.qty);x.orders.add(orderNo(o));map.set(key,x)}}const rows=[...map.values()].sort((a,b)=>b.qty-a.qty).slice(0,10);if(!rows.length)return {kind:'brain-ranking',title:'Ranking de produtos',text:'Não encontrei grade de pedidos suficiente para montar o ranking.'};return {kind:'brain-ranking',title:'Produtos mais pedidos',text:rows.map((x,i)=>(i+1)+'º <b>'+esc(x.name)+'</b> · '+x.qty.toLocaleString('pt-BR')+' peças · '+x.orders.size+' pedido(s)').join('<br>')}
}

function productionByLocation(raw){
 const n=norm(raw);if(!/(producao.*(local|lugar|faccao)|produção.*(local|lugar|facção)|onde.*producao|onde.*produção|por local.*producao|por local.*produção)/.test(n))return null;
 const map=new Map();for(const p of arr('production')){if(norm(p?.status).includes('finaliz')||norm(p?.status).includes('conclu'))continue;const id=p?.productionLocationId||p?.locationId,name=locationName(id,p?.locationName),key=sid(id)||norm(name),g=map.get(key)||{name,planned:0,done:0};g.planned+=q(p?.planned??p?.qty??p?.pieces);g.done+=q(p?.done??p?.completed??p?.produced);map.set(key,g)}const rows=[...map.values()].map(x=>({...x,remaining:Math.max(0,x.planned-x.done)})).sort((a,b)=>b.remaining-a.remaining);if(!rows.length)return {kind:'brain-production',title:'Produção por local',text:'Não encontrei produção aberta vinculada a locais.'};return {kind:'brain-production',title:'Produção por local',text:rows.map(x=>'• <b>'+esc(x.name)+'</b> · planejado '+x.planned.toLocaleString('pt-BR')+' · feito '+x.done.toLocaleString('pt-BR')+' · <b>faltam '+x.remaining.toLocaleString('pt-BR')+'</b>').join('<br>')}
}

function orderRemaining(raw){
 const n=norm(raw);if(!/(quanto falta|falta produzir|faltam.*pedido|resta.*pedido|situacao.*pedido|situação.*pedido)/.test(n))return null;const o=namedOrder(raw);if(!o)return null;
 const ordered=(o?.grade||[]).reduce((a,x)=>a+q(x?.qty),0)||q(o?.qty||o?.totalQty),prod=arr('production').filter(x=>sid(x?.orderId)===sid(o?.id)&&!x?.deletedAt),done=prod.reduce((a,x)=>a+q(x?.done??x?.completed??x?.produced),0),planned=prod.reduce((a,x)=>a+q(x?.planned??x?.qty??x?.pieces),0),remaining=Math.max(0,ordered-done),miss=arr('missingPieces').filter(x=>sid(x?.orderId)===sid(o?.id)&&!norm(x?.status).includes('resolvid')).reduce((a,x)=>a+q(x?.remainingQty??x?.originalQty??x?.qty),0);
 saveCtx({orderId:o.id,orderNumber:orderNo(o),client:o.client||''});return {kind:'brain-order',title:'Pedido #'+esc(orderNo(o))+' — '+esc(o.client||'Sem cliente'),text:'Pedido: <b>'+ordered.toLocaleString('pt-BR')+' peças</b><br>Produção planejada registrada: <b>'+planned.toLocaleString('pt-BR')+'</b><br>Produção concluída registrada: <b>'+done.toLocaleString('pt-BR')+'</b><br>Diferença pedido x concluído: <b>'+remaining.toLocaleString('pt-BR')+' peças</b><br>Faltantes registrados em aberto: <b>'+miss.toLocaleString('pt-BR')+' peças</b><br><br><span class="sub">O cálculo usa os campos atuais de pedido e produção; não considera uma peça concluída se ela não estiver baixada no sistema.</span>'}
}

function financePosition(raw){
 const n=norm(raw);if(!/(quanto.*(receber|pagar)|contas.*(receber|pagar)|saldo.*previsto|posicao financeira|posição financeira|resumo financeiro)/.test(n))return null;
 const today=nowIso(),rows=arr('hubFinanceEntries').filter(e=>!sid(e?.kind).startsWith('hub_settings')),open=rows.filter(e=>norm(e?.status)!=='realizado'),receivable=open.filter(e=>e?.flow==='Entrada').reduce((a,e)=>a+q(e?.value),0),payable=open.filter(e=>e?.flow==='Saída').reduce((a,e)=>a+q(e?.value),0),dueIn=open.filter(e=>e?.flow==='Entrada'&&sid(e?.date).slice(0,10)<=today).reduce((a,e)=>a+q(e?.value),0),dueOut=open.filter(e=>e?.flow==='Saída'&&sid(e?.date).slice(0,10)<=today).reduce((a,e)=>a+q(e?.value),0);
 return {kind:'brain-finance',title:'Posição financeira',text:'A receber em aberto: <b>'+money(receivable)+'</b><br>A pagar em aberto: <b>'+money(payable)+'</b><br>Saldo previsto dos lançamentos em aberto: <b>'+money(receivable-payable)+'</b><br><br>Com vencimento até hoje: entradas <b>'+money(dueIn)+'</b> · saídas <b>'+money(dueOut)+'</b>'}
}

function systemOverview(raw){
 const n=norm(raw);if(!/(resumo geral|situacao geral|situação geral|como esta a fabrica|como está a fábrica|visao geral|visão geral|diagnostico geral|diagnóstico geral)/.test(n))return null;
 const activeOrders=arr('orders').filter(o=>!/(entreg|finaliz|cancel)/.test(norm(o?.status))).length,pendingCuts=arr('cuts').filter(c=>!/(finaliz|conclu|cancel)/.test(norm(c?.status))).reduce((a,c)=>a+q(c?.pieces),0),prod=arr('production').filter(p=>!/(finaliz|conclu|cancel)/.test(norm(p?.status))),prodRemain=prod.reduce((a,p)=>a+Math.max(0,q(p?.planned??p?.qty??p?.pieces)-q(p?.done??p?.completed??p?.produced)),0),missing=arr('missingPieces').filter(x=>!norm(x?.status).includes('resolvid')).reduce((a,x)=>a+q(x?.remainingQty??x?.originalQty??x?.qty),0),issues=arr('systemIssues').filter(x=>norm(x?.status)!=='resolvido').length;
 const openFin=arr('hubFinanceEntries').filter(e=>norm(e?.status)!=='realizado'&&!sid(e?.kind).startsWith('hub_settings')),inV=openFin.filter(e=>e?.flow==='Entrada').reduce((a,e)=>a+q(e?.value),0),outV=openFin.filter(e=>e?.flow==='Saída').reduce((a,e)=>a+q(e?.value),0);
 return {kind:'brain-overview',title:'Visão geral da operação',text:'Pedidos ativos: <b>'+activeOrders+'</b><br>Peças em cortes ainda não finalizados: <b>'+pendingCuts.toLocaleString('pt-BR')+'</b><br>Peças ainda a concluir na produção registrada: <b>'+prodRemain.toLocaleString('pt-BR')+'</b><br>Faltantes em aberto: <b>'+missing.toLocaleString('pt-BR')+'</b><br>Ocorrências abertas na Central: <b>'+issues+'</b><br><br>Financeiro em aberto: receber <b>'+money(inV)+'</b> · pagar <b>'+money(outV)+'</b> · saldo <b>'+money(inV-outV)+'</b>'}
}

function contextFollowup(raw){
 const n=norm(raw),ctx=loadCtx();if(!ctx.updatedAt||Date.now()-ctx.updatedAt>30*60*1000)return null;
 if(ctx.orderNumber&&/^(e |e o |agora |dele|desse|desse pedido|e quanto falta)/.test(n)&&/(falta|produ|pedido)/.test(n))return orderRemaining('quanto falta do pedido '+ctx.orderNumber);
 return null;
}
function entityMemory(raw){
 const o=namedOrder(raw);if(o){saveCtx({orderId:o.id,orderNumber:orderNo(o),client:o.client||''});return}
 const c=resolve(raw,arr('clients'),x=>x?.name);if(c.item&&c.item?.name&&norm(raw).includes(norm(c.item.name)))saveCtx({clientId:c.item.id,client:c.item.name});
 const p=resolve(raw,arr('products'),x=>x?.name);if(p.item&&p.item?.name&&norm(raw).includes(norm(p.item.name)))saveCtx({productId:p.item.id,product:p.item.name});
}
function advanced(raw){
 raw=sid(raw).trim();if(!raw)return null;
 const handlers=[help,calc,orderRemaining,clientRanking,productRanking,productionByLocation,financePosition,systemOverview,contextFollowup];
 for(const h of handlers){try{const a=h(raw);if(a){entityMemory(raw);return a}}catch(e){console.warn('[HLGB Brain 92.65]',h.name,e)}}
 entityMemory(raw);return null;
}
function install(){
 const cur=window.hlgbAssistantAsk;if(typeof cur!=='function'||cur.__hlgbBrain9265)return false;
 const base=cur;
 const wrapped=function(){const input=document.getElementById('hlgbAssistantInput'),raw=sid(input?.value||'').trim(),a=advanced(raw);if(a){render(a);return a}return base.apply(this,arguments)};
 wrapped.__hlgbBrain9265=true;wrapped.__original=base;window.hlgbAssistantAsk=wrapped;return true;
}
function boot(){install();try{if(Number(window.HLGB_RELEASE_VERSION||0)<92.65)window.HLGB_RELEASE_VERSION='92.65'}catch(e){}}
setTimeout(boot,9000);setTimeout(boot,12000);setInterval(()=>{if(typeof window.hlgbAssistantAsk==='function'&&!window.hlgbAssistantAsk.__hlgbBrain9265)install()},7000);
window.hlgbAssistantBrain9265={version:V,advanced,resolve,loadCtx,saveCtx,install};
window.HLGB_ASSISTANT_BRAIN_9265=true;
console.info('[HLGB] Assistente Brain v'+V+' ativo');
})();
