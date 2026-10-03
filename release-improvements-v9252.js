/* HLGB v92.52 — pacote de melhorias: voz, relatórios, grupos de cortadores, Hub e estabilidade */
(function(){
'use strict';
const V='2026.10.03-improvements-v9252';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const now=()=>new Date().toISOString();
function arr(n){try{db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}catch(e){return []}}
function clone(v){try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}}
function uid(p){return p+'-'+Date.now()+'-'+Math.floor(Math.random()*900000)}
function upsertLocal(module,row){const a=arr(module),i=a.findIndex(x=>sid(x?.id)===sid(row?.id));if(i>=0)a[i]=clone(row);else a.push(clone(row));try{localSaveOnly?.()}catch(e){}}
async function saveRow(module,row){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
 const out=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),false);
 if(!out?.applied)throw new Error(out?.reason||('A nuvem não confirmou '+module+'.'));
 const saved=out.data||row;upsertLocal(module,saved);return saved;
}

/* 1) ASSISTENTE — voz com prévia completa, sem envio automático */
let voiceRec9252=null,voiceListening9252=false,voiceFinal9252='',voiceInterim9252='';
function speechCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function ensureVoicePreview(){
 const input=document.getElementById('hlgbAssistantInput');if(!input)return;
 const controls=document.getElementById('hlgbAssistantVoiceControls');if(!controls)return;
 let box=document.getElementById('hlgbVoicePreview9252');
 if(!box){
  box=document.createElement('div');box.id='hlgbVoicePreview9252';box.style.cssText='margin-top:8px;border:1px solid #dccbd4;background:#fffafb;border-radius:12px;padding:10px';
  box.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>🎙️ Prévia completa do que foi entendido</b><span id="hlgbVoiceStatus9252" class="sub">Pronto</span></div><div id="hlgbVoiceText9252" style="margin-top:8px;min-height:72px;max-height:180px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:10px;border:1px solid #eee;border-radius:9px;background:#fff">Fale normalmente. O texto completo aparecerá aqui antes de ser enviado.</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px"><button type="button" id="hlgbVoiceSend9252" class="primary" disabled>Enviar transcrição</button><button type="button" id="hlgbVoiceRetry9252" class="secondary">Refazer / limpar</button></div>';
  controls.insertAdjacentElement('afterend',box);
  box.querySelector('#hlgbVoiceSend9252').onclick=()=>{const text=(document.getElementById('hlgbVoiceText9252')?.dataset?.text||'').trim();if(!text)return;input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));try{window.hlgbAssistantAsk?.()}catch(e){console.warn('[HLGB voz 9252 envio]',e)}};
  box.querySelector('#hlgbVoiceRetry9252').onclick=()=>{voiceFinal9252='';voiceInterim9252='';input.value='';const t=document.getElementById('hlgbVoiceText9252');if(t){t.textContent='Fale novamente. A prévia completa aparecerá aqui.';t.dataset.text=''}const s=document.getElementById('hlgbVoiceSend9252');if(s)s.disabled=true;const st=document.getElementById('hlgbVoiceStatus9252');if(st)st.textContent='Pronto';};
 }
 const mic=document.getElementById('hlgbAssistantMicBtn');
 if(mic&&!mic.dataset.preview9252){mic.dataset.preview9252='1';mic.onclick=toggleVoice9252;mic.textContent='🎙️ Falar e revisar';}
}
function renderVoicePreview(){
 const text=[voiceFinal9252,voiceInterim9252].filter(Boolean).join(' ').replace(/\s+/g,' ').trim(),el=document.getElementById('hlgbVoiceText9252'),send=document.getElementById('hlgbVoiceSend9252'),status=document.getElementById('hlgbVoiceStatus9252');
 if(el){el.textContent=text||'Ouvindo…';el.dataset.text=text}
 if(send)send.disabled=!text||voiceListening9252;
 if(status)status.textContent=voiceListening9252?'Ouvindo…':'Confira antes de enviar';
 const input=document.getElementById('hlgbAssistantInput');if(input){input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}))}
}
function stopVoice9252(){
 if(!voiceListening9252)return;voiceListening9252=false;
 try{voiceRec9252?.stop?.()}catch(e){try{voiceRec9252?.abort?.()}catch(_){}}
 const mic=document.getElementById('hlgbAssistantMicBtn');if(mic)mic.textContent='🎙️ Falar e revisar';
 renderVoicePreview();
}
function toggleVoice9252(){
 if(voiceListening9252){stopVoice9252();return}
 const C=speechCtor();if(!C)return alert('O reconhecimento de voz não está disponível neste navegador.');
 try{window.speechSynthesis?.cancel?.()}catch(e){}
 voiceFinal9252='';voiceInterim9252='';const r=new C();voiceRec9252=r;r.lang='pt-BR';r.interimResults=true;r.continuous=true;r.maxAlternatives=3;
 r.onstart=()=>{if(voiceRec9252!==r)return;voiceListening9252=true;const mic=document.getElementById('hlgbAssistantMicBtn');if(mic)mic.textContent='⏹️ Terminar gravação';renderVoicePreview()};
 r.onresult=ev=>{if(voiceRec9252!==r)return;let interim='';for(let i=ev.resultIndex||0;i<ev.results.length;i++){const part=sid(ev.results[i]?.[0]?.transcript).trim();if(!part)continue;if(ev.results[i].isFinal)voiceFinal9252=(voiceFinal9252+' '+part).trim();else interim=(interim+' '+part).trim()}voiceInterim9252=interim;renderVoicePreview()};
 r.onerror=ev=>{if(!['aborted','no-speech'].includes(ev?.error||''))console.warn('[HLGB voz 9252]',ev?.error||ev)};
 r.onend=()=>{if(voiceRec9252!==r)return;voiceListening9252=false;voiceRec9252=null;const mic=document.getElementById('hlgbAssistantMicBtn');if(mic)mic.textContent='🎙️ Falar e revisar';renderVoicePreview()};
 try{r.start()}catch(e){voiceListening9252=false;alert('Não foi possível iniciar o microfone. Confira a permissão do navegador.')}
}

/* 2) RELATÓRIOS — painel analítico com gráficos e pie charts */
function dateOf(x){return sid(x?.date||x?.issueDate||x?.createdAt||x?.finishedAt).slice(0,10)}
function inRange(x,s,e){const d=dateOf(x);return (!s||!d||d>=s)&&(!e||!d||d<=e)}
function pieStyle(parts){
 const total=parts.reduce((a,x)=>a+q(x.value),0);if(total<=0)return 'background:#eee';
 let acc=0,stops=[];const colors=['#7b1f4c','#bd5c88','#d998b6','#6f5d78','#b08a9b','#8d6f7c','#c77a9c','#9c456d'];
 parts.forEach((x,i)=>{const start=acc/total*100;acc+=q(x.value);const end=acc/total*100;stops.push((colors[i%colors.length])+' '+start.toFixed(2)+'% '+end.toFixed(2)+'%')});
 return 'background:conic-gradient('+stops.join(',')+')';
}
function barRows(parts,maxItems=8){const rows=parts.slice(0,maxItems),max=Math.max(1,...rows.map(x=>q(x.value)));return rows.map(x=>'<div style="display:grid;grid-template-columns:minmax(120px,220px) 1fr auto;gap:8px;align-items:center;margin:6px 0"><span>'+escSafe(x.label)+'</span><div style="height:13px;border-radius:99px;background:#eee;overflow:hidden"><div style="height:100%;width:'+Math.max(2,q(x.value)/max*100).toFixed(1)+'%;background:#8d456b"></div></div><b>'+escSafe(x.display||q(x.value).toLocaleString('pt-BR'))+'</b></div>').join('');
}
function reportData(s,e){
 const hub=arr('hubFinanceEntries').filter(x=>inRange(x,s,e)),outs=hub.filter(x=>x.flow==='Saída'),ins=hub.filter(x=>x.flow==='Entrada');
 const expenseMap={};outs.forEach(x=>{const k=sid(x.category||'Sem categoria').trim()||'Sem categoria';expenseMap[k]=(expenseMap[k]||0)+q(x.value)});
 const expenses=Object.entries(expenseMap).map(([label,value])=>({label,value,display:moneySafe(value)})).sort((a,b)=>b.value-a.value);
 const invoices=arr('projectionInvoices').filter(x=>inRange(x,s,e)),clients={};invoices.forEach(x=>{const k=sid(x.client||x.clientName||'Sem cliente').trim()||'Sem cliente';clients[k]=(clients[k]||0)+q(x.value)});
 const topClients=Object.entries(clients).map(([label,value])=>({label,value,display:moneySafe(value)})).sort((a,b)=>b.value-a.value);
 const orders=arr('orders').filter(x=>inRange(x,s,e)),prod={};for(const o of orders)for(const g of (o.grade||[])){const p=arr('products').find(z=>sid(z.id)===sid(g.productId)),k=p?.name||g.product||'Produto';prod[k]=(prod[k]||0)+q(g.qty)}
 const topProducts=Object.entries(prod).map(([label,value])=>({label,value,display:value.toLocaleString('pt-BR')+' pç'})).sort((a,b)=>b.value-a.value);
 const cuts=arr('cuts').filter(x=>inRange(x,s,e)),cutPieces=cuts.reduce((a,x)=>a+q(x.pieces||x.done),0),doneCuts=cuts.filter(x=>norm(x.status).includes('finalizado')).length;
 const faction=arr('factionPayments').filter(x=>inRange({date:x.paymentDate||x.scheduledPaymentDate||x.createdAt},s,e)),factionTotal=faction.reduce((a,x)=>a+q(x.paidAmount||x.value||q(x.quantity)*q(x.unitPrice)),0);
 const purchases=arr('purchases').filter(x=>inRange(x,s,e)),purchaseTotal=purchases.reduce((a,x)=>a+q(x.total),0);
 return {hub,outs,ins,expenses,topClients,topProducts,orders,invoices,cuts,cutPieces,doneCuts,factionTotal,purchaseTotal};
}
function ensureReports9252(){
 const page=document.getElementById('relatorios');if(!page)return;
 let p=document.getElementById('hlgbReports9252');
 if(!p){p=document.createElement('div');p.id='hlgbReports9252';p.className='panel';p.innerHTML='<h2>📊 Central de relatórios e indicadores</h2><div class="sub">Cruza as informações já cadastradas no sistema. Use qualquer período e veja números, barras e pie charts.</div><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap;margin-top:10px"><div class="field"><label>De</label><input id="hlgbRepStart9252" type="date"></div><div class="field"><label>Até</label><input id="hlgbRepEnd9252" type="date" value="'+today()+'"></div><button class="primary" onclick="hlgbRenderReports9252()">Atualizar relatório</button><button class="secondary" onclick="hlgbReportQuick9252(30)">Últimos 30 dias</button><button class="secondary" onclick="hlgbReportQuick9252(365)">Último ano</button></div><div id="hlgbReportsCards9252" class="cards" style="margin-top:12px"></div><div id="hlgbReportsCharts9252"></div>';
  page.insertBefore(p,page.firstChild||null);
  window.hlgbReportQuick9252=function(days){const d=new Date();d.setDate(d.getDate()-days+1);const iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');document.getElementById('hlgbRepStart9252').value=iso(d);document.getElementById('hlgbRepEnd9252').value=today();renderReports9252()};
  const d=new Date();d.setDate(1);document.getElementById('hlgbRepStart9252').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
 }
 renderReports9252();
}
function renderReports9252(){
 const s=document.getElementById('hlgbRepStart9252')?.value||'',e=document.getElementById('hlgbRepEnd9252')?.value||'',d=reportData(s,e);
 const inV=d.ins.reduce((a,x)=>a+q(x.value),0),outV=d.outs.reduce((a,x)=>a+q(x.value),0),invoiceV=d.invoices.reduce((a,x)=>a+q(x.value),0),orderQty=d.topProducts.reduce((a,x)=>a+x.value,0);
 const cards=document.getElementById('hlgbReportsCards9252');if(cards)cards.innerHTML='<div class="card"><small>Pedidos / peças</small><strong>'+d.orders.length+' / '+orderQty.toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Notas emitidas</small><strong>'+moneySafe(invoiceV)+'</strong></div><div class="card"><small>Entradas no Hub</small><strong>'+moneySafe(inV)+'</strong></div><div class="card"><small>Saídas no Hub</small><strong>'+moneySafe(outV)+'</strong></div><div class="card"><small>Compras</small><strong>'+moneySafe(d.purchaseTotal)+'</strong></div><div class="card"><small>Facções</small><strong>'+moneySafe(d.factionTotal)+'</strong></div><div class="card"><small>Cortes finalizados</small><strong>'+d.doneCuts.toLocaleString('pt-BR')+'</strong><div class="sub">'+d.cutPieces.toLocaleString('pt-BR')+' peças registradas</div></div>';
 const ch=document.getElementById('hlgbReportsCharts9252');if(!ch)return;
 const pie=d.expenses.slice(0,8),legend=pie.map(x=>'<div style="display:flex;justify-content:space-between;gap:12px"><span>'+escSafe(x.label)+'</span><b>'+moneySafe(x.value)+'</b></div>').join('');
 ch.innerHTML='<div class="grid" style="margin-top:14px;align-items:start"><div class="panel" style="background:#fff"><h3>Despesas por categoria</h3><div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><div style="width:190px;height:190px;border-radius:50%;'+pieStyle(pie)+'"></div><div style="min-width:230px;flex:1">'+(legend||'<div class="empty">Sem despesas no período.</div>')+'</div></div></div><div class="panel" style="background:#fff"><h3>Top clientes por faturamento</h3>'+ (d.topClients.length?barRows(d.topClients):'<div class="empty">Sem notas no período.</div>')+'</div></div><div class="panel" style="background:#fff"><h3>Produtos mais pedidos</h3>'+(d.topProducts.length?barRows(d.topProducts,10):'<div class="empty">Sem pedidos no período.</div>')+'</div>';
}
window.hlgbRenderReports9252=renderReports9252;

/* 3) CORTADORES — grupos de funcionários registrados, sem salário nesta área */
function employeeForCutter(c){return arr('employees').find(e=>e&&e.active!==false&&(sid(c?.employeeId)&&sid(e.id)===sid(c.employeeId)||norm(e.name)===norm(c?.name)))||null}
function eligibleCutters(){return arr('cutters').filter(c=>c&&c.active!==false&&employeeForCutter(c)).sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'))}
function cutterGroups(){return arr('cutterGroups').filter(x=>x&&x.active!==false)}
function groupForCutter(id){return cutterGroups().find(g=>(g.memberCutterIds||[]).some(x=>sid(x)===sid(id)))||null}
function groupPieceRate(g,productId){const p=arr('products').find(x=>sid(x.id)===sid(productId)),pr=(g?.productRates||[]).find(x=>sid(x.productId)===sid(productId));return q(pr?.rate)||q(p?.cutCost)||q(g?.defaultPieceRate)}
function ensureCutterGroups(){
 const page=document.getElementById('cortadores');if(!page)return;
 let p=document.getElementById('hlgbCutterGroups9252');
 if(!p){p=document.createElement('div');p.id='hlgbCutterGroups9252';p.className='panel';p.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><h2 style="margin:0">👥 Grupos de cortadores</h2><div class="sub">Agrupe somente cortadores vinculados a funcionários ativos. Salário continua exclusivamente na Folha de Pagamento.</div></div><button class="primary" onclick="openCutterGroup9252()">+ Novo grupo</button></div><div id="hlgbCutterGroupsTable9252" style="margin-top:12px"></div>';
  const planner=document.getElementById('hlgbCutterPlanner');if(planner)planner.insertAdjacentElement('afterend',p);else page.insertBefore(p,page.firstChild||null);
 }
 renderCutterGroups();
 ensurePlannerGroupFilter();
}
window.openCutterGroup9252=function(id){
 const cur=id?cutterGroups().find(x=>sid(x.id)===sid(id)):null,cutters=eligibleCutters(),checked=new Set((cur?.memberCutterIds||[]).map(sid));
 const members=cutters.length?cutters.map(c=>'<label style="display:flex;gap:8px;align-items:center;padding:7px;border-bottom:1px solid #eee"><input type="checkbox" class="cgMember9252" value="'+escSafe(c.id)+'" '+(checked.has(sid(c.id))?'checked':'')+'> <span><b>'+escSafe(c.name)+'</b><br><span class="sub">Funcionário: '+escSafe(employeeForCutter(c)?.name||'')+'</span></span></label>').join(''):'<div class="empty">Nenhum cortador ativo está vinculado a um funcionário ativo. Vincule o cortador ao funcionário pelo mesmo nome ou employeeId.</div>';
 openModal(cur?'Editar grupo de cortadores':'Novo grupo de cortadores','<div class="grid"><div class="field"><label>Nome do grupo</label><input id="cgName9252" value="'+escSafe(cur?.name||'')+'" placeholder="Ex.: Grupo Corte 1"></div><div class="field"><label>Valor padrão por peça</label><input id="cgRate9252" type="number" min="0" step="0.01" value="'+q(cur?.defaultPieceRate)+'"><div class="sub">Se o produto tiver custo de corte próprio, ele tem prioridade.</div></div></div><div class="field"><label>Cortadores registrados</label><div style="max-height:260px;overflow:auto;border:1px solid #ddd;border-radius:10px">'+members+'</div></div><button class="primary modalSave">☁️ Salvar grupo</button>',async()=>{
   const name=sid(document.getElementById('cgName9252')?.value).trim(),ids=[...document.querySelectorAll('.cgMember9252:checked')].map(x=>x.value);if(!name)return alert('Informe o nome do grupo.');if(!ids.length)return alert('Selecione pelo menos um cortador.');
   const row={...(cur||{}),id:cur?.id||uid('cutter-group'),name,memberCutterIds:ids,defaultPieceRate:q(document.getElementById('cgRate9252')?.value),active:true,updatedAt:now(),createdAt:cur?.createdAt||now()};
   try{await saveRow('cutterGroups',row);closeModal();renderCutterGroups();ensurePlannerGroupFilter()}catch(e){alert('Não foi possível salvar o grupo: '+sid(e?.message||e))}
 });
};
function renderCutterGroups(){
 const el=document.getElementById('hlgbCutterGroupsTable9252');if(!el)return;
 const rows=cutterGroups().map(g=>{const members=(g.memberCutterIds||[]).map(id=>arr('cutters').find(c=>sid(c.id)===sid(id))?.name).filter(Boolean);return [escSafe(g.name),escSafe(members.join(', ')||'-'),moneySafe(g.defaultPieceRate),'<button class="secondary" onclick="openCutterGroup9252(\''+escSafe(g.id)+'\')">Editar</button>']});
 el.innerHTML=rows.length?table(['Grupo','Cortadores CLT vinculados','Valor padrão/peça','Ação'],rows):'<div class="empty">Nenhum grupo cadastrado ainda.</div>';
}
function ensurePlannerGroupFilter(){
 const sel=document.getElementById('hlgbCutterPlannerCutter');if(!sel)return;
 let wrap=document.getElementById('hlgbCutterPlannerGroupWrap9252');
 if(!wrap){wrap=document.createElement('div');wrap.id='hlgbCutterPlannerGroupWrap9252';wrap.className='field';wrap.innerHTML='<label>Grupo</label><select id="hlgbCutterPlannerGroup9252"><option value="">Todos os cortadores</option></select>';sel.closest('.field')?.insertAdjacentElement('beforebegin',wrap);wrap.querySelector('select').onchange=filterPlannerCutters}
 const gsel=document.getElementById('hlgbCutterPlannerGroup9252'),cur=gsel.value;gsel.innerHTML='<option value="">Todos os cortadores</option>'+cutterGroups().map(g=>'<option value="'+escSafe(g.id)+'">'+escSafe(g.name)+'</option>').join('');if(cutterGroups().some(g=>sid(g.id)===sid(cur)))gsel.value=cur;filterPlannerCutters();
}
function filterPlannerCutters(){
 const sel=document.getElementById('hlgbCutterPlannerCutter'),gid=document.getElementById('hlgbCutterPlannerGroup9252')?.value||'';if(!sel)return;const prev=sel.value,g=cutterGroups().find(x=>sid(x.id)===sid(gid)),allowed=g?new Set((g.memberCutterIds||[]).map(sid)):null,rows=arr('cutters').filter(c=>c&&c.active!==false&&(!allowed||allowed.has(sid(c.id))));sel.innerHTML='<option value="">Selecione</option>'+rows.map(c=>'<option value="'+escSafe(c.id)+'">'+escSafe(c.name||'Cortador')+'</option>').join('');if(rows.some(c=>sid(c.id)===sid(prev)))sel.value=prev;
}
window.hlgbCutterGroupRate9252=groupPieceRate;

/* 4) HUB — gasto por local, local não cadastrado ou custo geral */
async function createProductionLocation9252(){
 openModal('Cadastrar local de produção','<div class="field"><label>Nome do local</label><input id="newLocName9252" placeholder="Ex.: Confecção Bárbara"></div><button class="primary modalSave">☁️ Cadastrar local</button>',async()=>{const name=sid(document.getElementById('newLocName9252')?.value).trim();if(!name)return alert('Informe o nome do local.');if(arr('productionLocations').some(x=>norm(x.name)===norm(name)))return alert('Esse local já está cadastrado.');try{await saveRow('productionLocations',{id:Date.now(),name,active:true,createdAt:now(),updatedAt:now()});closeModal();try{window.renderHubFinance?.()}catch(e){}setTimeout(decorateConfExpensePanel9252,150)}catch(e){alert('Não foi possível cadastrar: '+sid(e?.message||e))}});
}
window.createProductionLocation9252=createProductionLocation9252;
function costCenters9252(){
 const out=[],seen=new Set(),push=(id,name,kind)=>{name=sid(name).trim();const k=norm(name);if(!name||seen.has(k))return;seen.add(k);out.push({id:sid(id),name,kind})};
 for(const x of arr('productionLocations'))if(x&&x.active!==false)push(x.id,x.name,'productionLocation');
 for(const x of arr('factionMasters'))if(x&&x.active!==false)push(x.id,x.name,'factionMaster');
 for(const x of arr('factions'))if(x&&!norm(x.status).includes('cancelado'))push(x.factionMasterId||x.productionLocationId||x.id,x.name,'faction');
 return out.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
window.openConfExpense9251=function(){
 const centers=costCenters9252(),opts=centers.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name)+'</option>').join('');
 openModal('Lançar gasto da confecção / operação','<div class="grid"><div class="field"><label>Onde pertence este gasto?</label><select id="ceMode9252"><option value="registered">Confecção/local cadastrado</option><option value="other">Pessoa/local não cadastrado</option><option value="general">Custo geral da operação</option></select></div><div class="field" id="ceRegisteredWrap9252"><label>Confecção / local cadastrado</label><select id="ceCenter9252"><option value="">Selecione</option>'+opts+'</select></div><div class="field" id="ceOtherWrap9252" style="display:none"><label>Nome da pessoa/local</label><input id="ceOther9252" placeholder="Ex.: Costureira Maria"></div><div class="field"><label>Tipo de gasto</label><select id="ceType9252"><option>Pão / café</option><option>Limpeza</option><option>Transporte</option><option>Manutenção</option><option>Material de apoio</option><option>Energia / utilidades</option><option>Sindvest</option><option>Honorários</option><option>Encargos</option><option>Outro</option></select></div><div class="field"><label>Valor</label><input id="ceValue9252" type="number" min="0" step="0.01"></div><div class="field"><label>Data</label><input id="ceDate9252" type="date" value="'+today()+'"></div><div class="field"><label>Forma de pagamento</label><input id="ceMethod9252" placeholder="Pix, dinheiro, cartão..."></div></div><div class="field"><label>Observação</label><input id="ceNote9252"></div><button class="primary modalSave">☁️ Salvar gasto</button>',async()=>{
  const mode=document.getElementById('ceMode9252')?.value||'registered',value=q(document.getElementById('ceValue9252')?.value);if(value<=0)return alert('Informe o valor.');
  let center=null,name='';if(mode==='general')name='Geral da operação';else if(mode==='registered'){center=centers.find(x=>sid(x.id)===sid(document.getElementById('ceCenter9252')?.value));name=center?.name||''}else name=sid(document.getElementById('ceOther9252')?.value).trim();if(!name)return alert('Informe a confecção/local.');
  const date=document.getElementById('ceDate9252')?.value||today(),type=document.getElementById('ceType9252')?.value||'Outro',method=sid(document.getElementById('ceMethod9252')?.value).trim(),note=sid(document.getElementById('ceNote9252')?.value).trim(),id=uid('confexp');
  const row={id,flow:'Saída',description:type+' — '+name,value,date,category:'Gastos da confecção',subcategory:type,person:mode==='general'?'':name,status:'Realizado',realizedAt:date,paymentMethod:method,acceptedMethods:method?[method]:[],note,costCenterId:center?.id||'',costCenterName:name,costCenterKind:mode==='general'?'general':(center?.kind||'external'),sourceType:'confecao_expense_v9252',sourceId:id,createdAt:now(),updatedAt:now()};
  try{await saveRow('hubFinanceEntries',row);closeModal();try{window.renderHubFinance?.()}catch(e){}}catch(e){alert('Não foi possível salvar: '+sid(e?.message||e))}
 });
 setTimeout(()=>{const m=document.getElementById('ceMode9252'),a=document.getElementById('ceRegisteredWrap9252'),b=document.getElementById('ceOtherWrap9252');if(m)m.onchange=()=>{a.style.display=m.value==='registered'?'':'none';b.style.display=m.value==='other'?'':'none'}},20);
};
function decorateConfExpensePanel9252(){
 const p=document.getElementById('hlgbConfExpense9251');if(!p)return;if(!document.getElementById('hlgbAddLocation9252')){const b=document.createElement('button');b.id='hlgbAddLocation9252';b.type='button';b.className='secondary';b.textContent='🏭 Cadastrar local';b.onclick=createProductionLocation9252;const top=p.querySelector('button.primary');top?.insertAdjacentElement('afterend',b)}
 const sub=p.querySelector('.sub');if(sub)sub.textContent='Separe despesas por confecção/local ou marque custos coletivos como Geral da operação (Sindvest, honorários, encargos etc.).';
}

/* 5) HUB — troca de semana confiável */
function parseHubDate(v){v=sid(v).trim();let m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return new Date(+m[1],+m[2]-1,+m[3],12);m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(m)return new Date(+m[3],+m[2]-1,+m[1],12);return null}
function formatForInput(el,d){if(el?.type==='date')return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()}
function isoWeek9252(d){const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const w1=new Date(x.getFullYear(),0,4,12),wk=1+Math.round(((x-w1)/86400000-3+((w1.getDay()+6)%7))/7);return x.getFullYear()+'-W'+String(wk).padStart(2,'0')}
function refreshHubWeek9252(){
 const w=document.getElementById('hubFinanceWeek');if(!w)return;const d=parseHubDate(w.value);if(d){const pw=document.getElementById('hlgbHubPeriodWeek');if(pw)pw.value=isoWeek9252(d)}
 try{window.renderHubFinance?.()}catch(e){console.warn('[HLGB semana Hub]',e)}
 setTimeout(()=>{try{window.hlgbHubPeriodSummary?.render?.();window.hlgbRenderHubFactionDetail?.();window.renderConfExpenses?.()}catch(e){}},30);
}
function bindHubWeek9252(){
 const page=document.getElementById('hubFinanceiro'),w=document.getElementById('hubFinanceWeek');if(!page||!w)return;
 if(!w.dataset.weekFix9252){w.dataset.weekFix9252='1';w.addEventListener('change',()=>setTimeout(refreshHubWeek9252,0));w.addEventListener('input',()=>setTimeout(refreshHubWeek9252,0))}
 page.querySelectorAll('button').forEach(b=>{const t=norm(b.textContent);if((t.includes('semana anterior')||t.includes('proxima semana'))&&!b.dataset.weekFix9252){b.dataset.weekFix9252='1';b.addEventListener('click',()=>{setTimeout(()=>{const x=document.getElementById('hubFinanceWeek');if(x&&!parseHubDate(x.value)){const d=new Date();x.value=formatForInput(x,d)}refreshHubWeek9252()},20)})}});
}

/* 8/9) estabilidade visual: facções e cortadores */
function injectStability9252(){
 if(document.getElementById('hlgbStability9252'))return;const st=document.createElement('style');st.id='hlgbStability9252';st.textContent='#cortadores table{width:100%!important;max-width:100%!important;table-layout:fixed!important}#cortadores th,#cortadores td{overflow-wrap:anywhere!important;word-break:break-word!important;font-size:11px!important}#cortadores .panel{max-width:100%!important;overflow-x:hidden!important}#factionChecklistPanel9176{overflow-anchor:none}#faccoes{overflow-anchor:none}';document.head.appendChild(st);
 const f=document.getElementById('factionChecklistPanel9176');if(f&&!f.dataset.stable9252){f.dataset.stable9252='1';let h=Math.ceil(f.getBoundingClientRect().height);if(h>0)f.style.minHeight=h+'px';const mo=new MutationObserver(()=>{const nh=Math.ceil(f.scrollHeight||f.getBoundingClientRect().height);if(nh>h){h=nh;f.style.minHeight=h+'px'}});mo.observe(f,{childList:true,subtree:true,characterData:true})}
}

/* Diagnóstico: explicitar pendências de produção e conflito WAL sem apagar automaticamente */
function ensureSyncInsight9252(){
 const center=document.getElementById('hlgbDiagnosticsCenter');if(!center||document.getElementById('hlgbSyncInsight9252'))return;
 const p=document.createElement('div');p.id='hlgbSyncInsight9252';p.className='panel';p.innerHTML='<h3>🔄 Leitura das pendências de sincronização</h3><div id="hlgbSyncInsightBody9252" class="sub"></div>';center.appendChild(p);renderSyncInsight9252();
}
function renderSyncInsight9252(){
 const el=document.getElementById('hlgbSyncInsightBody9252');if(!el)return;let pending=null;try{pending=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null')}catch(e){}
 const prod=Array.isArray(pending?.modules?.production)?pending.modules.production:[],derived=prod.filter(x=>x?.data?.assignmentSource===true&&q(x?.data?.planned)===0&&x?.data?.cutQuantityLinkedV9246===true);
 let wal=null;try{wal=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||localStorage.getItem('hlgb_records_wal_v1')||'null')}catch(e){}
 el.innerHTML='<b>Produção aguardando:</b> '+prod.length+' registro(s). <b>Com padrão derivado planned=0:</b> '+derived.length+'.<br><span>Esses registros não são apagados automaticamente. O Auditor continua sendo a ferramenta de reconciliação segura contra o snapshot da nuvem.</span>'+(wal?'<br><b>WAL local:</b> presente; conflitos continuam protegidos contra exclusão automática.':'');
}

function stampVersion9252(){try{const v=document.querySelector('#appShell .logo small');if(v)v.textContent='v92.52';const lb=document.querySelector('#loginScreen b');if(lb&&/Versão/i.test(lb.textContent||''))lb.textContent='Versão v92.52';window.HLGB_RELEASE_VERSION='92.52'}catch(e){}}\nfunction refreshAll9252(){stampVersion9252();ensureVoicePreview();ensureReports9252();ensureCutterGroups();decorateConfExpensePanel9252();bindHubWeek9252();injectStability9252();ensureSyncInsight9252()}
const oldHub=window.renderHubFinance;if(typeof oldHub==='function'&&!oldHub.__v9252){const w=function(){const r=oldHub.apply(this,arguments);setTimeout(()=>{decorateConfExpensePanel9252();bindHubWeek9252()},30);return r};w.__v9252=true;w.__original=oldHub;window.renderHubFinance=w}
const oldCut=window.renderCutters;if(typeof oldCut==='function'&&!oldCut.__v9252){const w=function(){const r=oldCut.apply(this,arguments);setTimeout(()=>{ensureCutterGroups();injectStability9252()},30);return r};w.__v9252=true;w.__original=oldCut;window.renderCutters=w}
const oldRep=window.renderReports;if(typeof oldRep==='function'&&!oldRep.__v9252){const w=function(){const r=oldRep.apply(this,arguments);setTimeout(ensureReports9252,20);return r};w.__v9252=true;w.__original=oldRep;window.renderReports=w}
setTimeout(refreshAll9252,2200);setInterval(refreshAll9252,4000);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(refreshAll9252,900),0)}catch(e){}
window.hlgbImprovements9252={refreshAll9252,renderReports9252,ensureReports9252,renderCutterGroups,ensureCutterGroups,renderSyncInsight9252};
window.HLGB_IMPROVEMENTS_9252=V;
console.info('[HLGB] '+V+' ativo');
})();