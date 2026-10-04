/* HLGB v92.57 — Hub financeiro autoritativo + Assistente com prévia segura de grade */
(function(){
'use strict';
const V='92.57';
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const q=v=>Math.max(0,Number(v)||0);
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=n=>{try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}};
const money=v=>{try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}};
const fmt=v=>{try{return typeof window.fmtDate==='function'?window.fmtDate(v):sid(v)}catch(e){return sid(v)}};
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function parseIso(v){const m=sid(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function weekRange(v){
 const d=parseIso(v)||new Date(),x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));const e=new Date(x);e.setDate(e.getDate()+6);
 return {selected:iso(d),start:iso(x),end:iso(e)};
}
function isoWeekFromDate(v){
 const d=parseIso(v)||new Date(),x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()+3-((x.getDay()+6)%7));
 const y=x.getFullYear(),w1=new Date(y,0,4,12),wk=1+Math.round(((x-w1)/86400000-3+((w1.getDay()+6)%7))/7);
 return y+'-W'+String(wk).padStart(2,'0');
}

/* ================= HUB: UM ÚNICO ESTADO DE SEMANA ================= */
const HUBKEY='hlgb_hub_week_authoritative_v9257';
function hubDateEl(){return document.getElementById('hubFinanceWeek')}
function selectedHubDate(){
 const el=hubDateEl();let v=sid(el?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){try{v=localStorage.getItem(HUBKEY)||''}catch(e){}}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))v=iso(new Date());
 if(el&&el.value!==v)el.value=v;
 try{localStorage.setItem(HUBKEY,v)}catch(e){}
 return v;
}
function setHubDate(v){
 const d=parseIso(v);if(!d)return;
 const el=hubDateEl();if(el)el.value=iso(d);
 try{localStorage.setItem(HUBKEY,iso(d))}catch(e){}
 syncHubPeriod9257();renderHub9257();
}
function syncHubPeriod9257(){
 const v=selectedHubDate(),pw=document.getElementById('hlgbHubPeriodWeek'),pm=document.getElementById('hlgbHubPeriodMode');
 if(pm)pm.value='week';
 if(pw)pw.value=isoWeekFromDate(v);
}
function hubRows9257(range){
 return arr('hubFinanceEntries').filter(e=>{const d=sid(e?.date).slice(0,10);return d>=range.start&&d<=range.end&&!sid(e?.kind).startsWith('hub_settings')});
}
function hubMethods9257(e){try{return typeof window.hlgb916HubEntryMethods==='function'?window.hlgb916HubEntryMethods(e):(e.flow==='Entrada'?[e.method||'Pix']:(Array.isArray(e.acceptedMethods)&&e.acceptedMethods.length?e.acceptedMethods:['Pix']))}catch(_){return []}}
function hubSummary9257(range){
 const rows=hubRows9257(range),ins=rows.filter(e=>e.flow==='Entrada'),outs=rows.filter(e=>e.flow==='Saída');
 const inTotal=ins.reduce((a,e)=>a+q(e.value),0),outTotal=outs.reduce((a,e)=>a+q(e.value),0),realizedIn=ins.filter(e=>e.status==='Realizado').reduce((a,e)=>a+q(e.value),0),realizedOut=outs.filter(e=>e.status==='Realizado').reduce((a,e)=>a+q(e.value),0);
 let cashIn=0,checksIn=0,hardCash=0,strictCheck=0,flexCheck=0;
 for(const e of ins){const m=norm(e.method);if(m==='cheque')checksIn+=q(e.value);else if(m==='pix'||m==='dinheiro')cashIn+=q(e.value)}
 for(const e of outs){const ms=hubMethods9257(e).map(norm),hasCheck=ms.includes('cheque'),hasCash=ms.includes('pix')||ms.includes('dinheiro');if(hasCheck&&!hasCash)strictCheck+=q(e.value);else if(hasCheck&&hasCash)flexCheck+=q(e.value);else hardCash+=q(e.value)}
 const checkGap=Math.max(0,strictCheck-checksIn),remainingChecks=Math.max(0,checksIn-strictCheck),flexCovered=Math.min(flexCheck,remainingChecks),cashNeed=hardCash+Math.max(0,flexCheck-flexCovered),cashBalance=cashIn-cashNeed;
 return {rows,ins,outs,inTotal,outTotal,balance:inTotal-outTotal,realizedIn,realizedOut,cashIn,checksIn,hardCash,strictCheck,flexCheck,checkEligible:strictCheck+flexCheck,checkGap,cashNeed,cashBalance};
}
function tableSafe(headers,rows){try{return typeof window.table==='function'?window.table(headers,rows):'<div class="empty">Tabela indisponível.</div>'}catch(e){return '<div class="empty">Tabela indisponível.</div>'}}
function renderHub9257(){
 const page=document.getElementById('hubFinanceiro'),el=hubDateEl();if(!page||!el)return false;
 const selected=selectedHubDate(),range=weekRange(selected),s=hubSummary9257(range);syncHubPeriod9257();
 const label=document.getElementById('hubFinanceWeekLabel');if(label)label.innerHTML='<b>Semana de '+esc(fmt(range.start))+' a '+esc(fmt(range.end))+'</b> · data escolhida: '+esc(fmt(selected));
 const cards=document.getElementById('hubFinanceCards');if(cards)cards.innerHTML='<div class="card"><small>Entradas previstas</small><strong>'+money(s.inTotal)+'</strong></div><div class="card"><small>Saídas previstas</small><strong>'+money(s.outTotal)+'</strong></div><div class="card"><small>Saldo previsto</small><strong>'+money(s.balance)+'</strong></div><div class="card"><small>Pix + dinheiro previsto</small><strong>'+money(s.cashIn)+'</strong></div><div class="card"><small>Cheques previstos</small><strong>'+money(s.checksIn)+'</strong></div><div class="card"><small>Contas que aceitam cheque</small><strong>'+money(s.checkEligible)+'</strong></div><div class="card"><small>Entradas realizadas</small><strong>'+money(s.realizedIn)+'</strong></div><div class="card"><small>Saídas realizadas</small><strong>'+money(s.realizedOut)+'</strong></div>';
 const alertEl=document.getElementById('hubFinanceLiquidityAlert');if(alertEl){let parts=[],cls='ok';if(s.balance<0){parts.push('A semana fecha negativa em '+money(Math.abs(s.balance))+'.');cls='bad'}else parts.push('A semana fecha positiva em '+money(s.balance)+'.');if(s.checkGap>0){parts.push('Faltam '+money(s.checkGap)+' em cheque.');cls='bad'}if(s.cashBalance<0){parts.push('Faltam '+money(Math.abs(s.cashBalance))+' em Pix/dinheiro.');if(cls!=='bad')cls='warn'}alertEl.innerHTML='<div class="panel"><span class="badge '+cls+'" style="font-size:13px;padding:8px 12px">'+parts.map(esc).join(' ')+'</span></div>'}
 const cat={};for(const e of s.outs)cat[e.category||'Outros']=(cat[e.category||'Outros']||0)+q(e.value);
 const catEl=document.getElementById('hubFinanceCategoryTable'),catRows=Object.entries(cat).sort((a,b)=>b[1]-a[1]);if(catEl)catEl.innerHTML=catRows.length?tableSafe(['Categoria','Valor','% das saídas'],catRows.map(([k,v])=>[esc(k),money(v),s.outTotal?((v/s.outTotal*100).toFixed(1).replace('.',',')+'%'):'0%'])):'<div class="empty">Nenhuma saída lançada nesta semana.</div>';
 const methodEl=document.getElementById('hubFinanceMethodTable');if(methodEl)methodEl.innerHTML=tableSafe(['Indicador','Valor'],[['Entradas em Pix/dinheiro',money(s.cashIn)],['Entradas em cheque',money(s.checksIn)],['Saídas que exigem Pix/dinheiro',money(s.hardCash)],['Saídas somente em cheque',money(s.strictCheck)],['Saídas flexíveis que aceitam cheque',money(s.flexCheck)],['Necessidade final de Pix/dinheiro',money(s.cashNeed)]]);
 const future=document.getElementById('hubFinanceFutureTable');if(future){const base=parseIso(range.start),rows=[];for(let i=0;i<6;i++){const d=new Date(base);d.setDate(d.getDate()+i*7);const r=weekRange(iso(d)),x=hubSummary9257(r);rows.push([fmt(r.start)+' a '+fmt(r.end),money(x.inTotal),money(x.outTotal),money(x.balance),money(x.cashBalance)])}future.innerHTML=tableSafe(['Semana','Entradas','Saídas','Saldo','Liquidez Pix/dinheiro'],rows)}
 const tbl=document.getElementById('hubFinanceEntriesTable');if(tbl){const rows=s.rows.slice().sort((a,b)=>sid(a.date).localeCompare(sid(b.date)));tbl.innerHTML=rows.length?tableSafe(['Data','Tipo','Descrição','Categoria','Pessoa/Origem','Valor','Pagamento','Status','Ações'],rows.map(e=>[fmt(e.date),'<span class="badge '+(e.flow==='Entrada'?'ok':'warn')+'">'+esc(e.flow)+'</span>',esc(e.description||'-'),esc(e.category||'-'),esc(e.person||e.origin||'-'),money(e.value),esc(hubMethods9257(e).join(' / ')),'<span class="badge '+(e.status==='Realizado'?'ok':'')+'">'+esc(e.status||'Previsto')+'</span>','<button type="button" class="secondary" onclick="editHubFinanceEntry('+JSON.stringify(e.id)+')">Editar</button> <button type="button" class="primary" onclick="toggleHubFinanceEntry('+JSON.stringify(e.id)+')">'+(e.status==='Realizado'?'Reabrir':'✓ Realizado')+'</button> <button type="button" class="danger" onclick="deleteHubFinanceEntry('+JSON.stringify(e.id)+')">Excluir</button>'])):'<div class="empty">Nenhum lançamento nesta semana.</div>'}
 // Elimina a segunda navegação semanal criada pela v92.53 para não haver estados concorrentes.
 const legacy=document.getElementById('hlgbHubWeek9253');if(legacy)legacy.style.setProperty('display','none','important');
 // Atualiza painéis derivados depois de sincronizar a semana.
 setTimeout(()=>{try{window.hlgbHubPeriodSummary?.render?.()}catch(e){}try{window.hlgbRenderHubFactionDetail?.()}catch(e){}try{window.renderConfExpenses?.()}catch(e){}},20);
 return true;
}
function shiftHub9257(delta){const r=weekRange(selectedHubDate()),d=parseIso(r.start);d.setDate(d.getDate()+Number(delta||0)*7);setHubDate(iso(d))}
function bindHub9257(){
 const page=document.getElementById('hubFinanceiro'),el=hubDateEl();if(!page||!el)return;
 window.changeHubFinanceWeek=shiftHub9257;window.renderHubFinance=renderHub9257;
 if(!el.dataset.v9257){el.dataset.v9257='1';el.onchange=()=>setHubDate(el.value);el.oninput=null}
 if(!page.dataset.v9257capture){page.dataset.v9257capture='1';page.addEventListener('click',ev=>{const b=ev.target?.closest?.('button');if(!b)return;const t=norm(b.textContent);if(t.includes('semana anterior')){ev.preventDefault();ev.stopImmediatePropagation();shiftHub9257(-1)}else if(t.includes('proxima semana')){ev.preventDefault();ev.stopImmediatePropagation();shiftHub9257(1)}},true)}
 renderHub9257();
}

/* ================= ASSISTENTE: GRADE EXATA DO PEDIDO ================= */
function orderNo(o){return sid(o?.orderNumber||o?.number||o?.id)}
function findOrderByNumber9257(n){return arr('orders').find(o=>orderNo(o)===sid(n))||null}
function productById(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function productsInOrder(o){
 const ids=[...new Set((o?.grade||[]).map(g=>sid(g?.productId)).filter(Boolean))];return ids.map(id=>productById(id)).filter(Boolean);
}
function findProductInsideOrder9257(o,raw){
 const n=norm(raw),ps=productsInOrder(o);if(!ps.length)return null;
 const exact=ps.filter(p=>n.includes(norm(p.name))).sort((a,b)=>sid(b.name).length-sid(a.name).length)[0];if(exact)return exact;
 const words=n.split(/\s+/).filter(w=>w.length>=3),generic=new Set(['pedido','divide','dividir','grade','dois','clientes','igualmente','manda','previa','previa','favor']);
 return ps.map(p=>({p,score:norm(p.name).split(/\s+/).filter(t=>t.length>=3&&!generic.has(t)&&words.some(w=>w===t||w.includes(t)||t.includes(w))).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||sid(b.p.name).length-sid(a.p.name).length)[0]?.p||null;
}
function sizes9257(){try{return typeof hlgbSortedSizes==='function'?hlgbSortedSizes(db.sizes).map(String):['P','M','G','GG']}catch(e){return ['P','M','G','GG']}}
function splitGradePreview9257(raw){
 const n=norm(raw);if(!/(divid|separ|repart)/.test(n)||!/(grade)/.test(n)||!/(dois|2)\s+clientes?/.test(n))return null;
 const m=n.match(/pedido\s*#?\s*(\d+)/);if(!m)return null;
 const o=findOrderByNumber9257(m[1]);if(!o)return {kind:'grade-split-preview',title:'Pedido #'+esc(m[1]),text:'Não encontrei esse pedido no sistema. Nenhuma ação foi executada.'};
 const p=findProductInsideOrder9257(o,raw);
 if(!p){const names=productsInOrder(o).map(x=>x.name);return {kind:'grade-split-preview',title:'Pedido #'+esc(orderNo(o)),text:'Encontrei o pedido de <b>'+esc(o.client||'Sem cliente')+'</b>, mas não identifiquei com segurança o produto citado.<br><br>Produtos deste pedido: '+(names.length?names.map(x=>'<b>'+esc(x)+'</b>').join(', '):'nenhum produto com grade identificável')+'.<br><br><b>Nenhuma alteração foi feita.</b>'}}
 const rows=(o.grade||[]).filter(g=>sid(g.productId)===sid(p.id)&&q(g.qty)>0);
 if(!rows.length)return {kind:'grade-split-preview',title:'Prévia — pedido #'+esc(orderNo(o))+' · '+esc(p.name),text:'O produto foi identificado no pedido, mas não encontrei quantidades de grade para ele. <b>Nenhuma impressão ou alteração foi feita.</b>'};
 const ss=sizes9257(),colors=[...new Set(rows.map(g=>sid(g.color||'-')))],matrix={};
 for(const color of colors){matrix[color]={};for(const s of ss)matrix[color][s]=0}
 for(const g of rows){const color=sid(g.color||'-'),size=sid(g.size||'');if(!matrix[color])matrix[color]={};matrix[color][size]=(matrix[color][size]||0)+q(g.qty)}
 let total=0,aTotal=0,bTotal=0;
 const body=colors.map(color=>{let ct=0,at=0,bt=0;const cells=ss.map(size=>{const qty=q(matrix[color]?.[size]);ct+=qty;const a=Math.ceil(qty/2),b=Math.floor(qty/2);at+=a;bt+=b;return '<td><b>'+qty+'</b><div class="sub">C1 '+a+' · C2 '+b+'</div></td>'}).join('');total+=ct;aTotal+=at;bTotal+=bt;return '<tr><td>'+esc(color)+'</td>'+cells+'<td><b>'+ct+'</b><div class="sub">C1 '+at+' · C2 '+bt+'</div></td></tr>'}).join('');
 const html='<div class="panel" style="background:#fff"><div><b>Pedido #'+esc(orderNo(o))+'</b> · cliente atual: '+esc(o.client||'-')+'</div><div><b>Produto:</b> '+esc(p.name)+'</div><div class="sub">Prévia somente leitura. Nada foi alterado e nenhuma impressão foi aberta.</div></div><div style="overflow:auto"><table><thead><tr><th>Cor</th>'+ss.map(s=>'<th>'+esc(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+body+'<tr><td><b>Total</b></td>'+ss.map(size=>{const z=rows.filter(g=>sid(g.size)===size).reduce((a,g)=>a+q(g.qty),0);return '<td><b>'+z+'</b></td>'}).join('')+'<td><b>'+total+'</b><div class="sub">C1 '+aTotal+' · C2 '+bTotal+'</div></td></tr></tbody></table></div><div class="panel" style="background:#fff8fb"><b>Divisão sugerida:</b> Cliente 1 = '+aTotal+' peças · Cliente 2 = '+bTotal+' peças.<br><span class="sub">Como os nomes dos dois clientes não foram informados, a prévia usa Cliente 1 e Cliente 2. Se houver quantidade ímpar em algum tamanho/cor, a peça excedente fica no Cliente 1. Para aplicar de verdade, informe os nomes dos dois clientes e confirme depois.</span></div>';
 return {kind:'grade-split-preview',title:'Prévia da divisão — '+esc(p.name),text:html};
}
function renderAssistant9257(a){
 const out=document.getElementById('hlgbAssistantAnswer');if(!out||!a)return;
 out.dataset.pendingKind=a.kind||'';out.innerHTML='<h3 style="margin-top:0">'+esc(a.title||'Assistente HLGB')+'</h3>'+a.text;
}
function installAssistant9257(){
 const cur=window.hlgbAssistantAsk;if(typeof cur!=='function'||cur.__v9257)return;
 const base=cur,w=function(){const raw=sid(document.getElementById('hlgbAssistantInput')?.value).trim(),special=splitGradePreview9257(raw);if(special){renderAssistant9257(special);return}return base.apply(this,arguments)};w.__v9257=true;w.__original=base;window.hlgbAssistantAsk=w;
}
function cleanVoiceButtons9257(){
 const box=document.getElementById('hlgbVoiceBox9255');if(!box)return;
 const primary=[...box.querySelectorAll('button')].filter(b=>norm(b.textContent).includes('enviar pergunta'));
 if(primary.length>1)primary.slice(1).forEach(b=>b.remove());
 const send=document.getElementById('hlgbVoiceSend9255');if(send){send.textContent='Enviar pergunta';send.onclick=()=>window.hlgbSendAssistant9256?.()}
}

/* ================= AJUSTES VISUAIS DO DIAGNÓSTICO ================= */
function visualFixes9257(){
 if(!document.getElementById('hlgbVisualFix9257')){const st=document.createElement('style');st.id='hlgbVisualFix9257';st.textContent='#capacidadeProducao button{max-width:100%;white-space:normal;overflow-wrap:anywhere}#hubFinanceiro select,#hubFinanceiro button,#hubFinanceiro input{min-height:34px}#hubFinanceiro .toolbar label{line-height:1.25}';document.head.appendChild(st)}
}
function stamp(){
 try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0').replace(/[^0-9.]/g,''))||0;if(cur<=92.57){window.HLGB_RELEASE_VERSION=V;const x=document.querySelector('#appShell .logo small');if(x)x.textContent='v'+V;const b=document.querySelector('#loginScreen b');if(b&&/Versão/i.test(b.textContent||''))b.textContent='Versão v'+V}}catch(e){}
}
function refresh(){stamp();bindHub9257();installAssistant9257();cleanVoiceButtons9257();visualFixes9257()}
setTimeout(refresh,900);setInterval(refresh,1200);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(refresh,300),0)}catch(e){}
window.hlgbPatch9257={renderHub:renderHub9257,shiftHub:shiftHub9257,setHubDate,splitGradePreview:splitGradePreview9257};
window.HLGB_PATCH_9257=V;
console.info('[HLGB] v'+V+' ativo');
})();