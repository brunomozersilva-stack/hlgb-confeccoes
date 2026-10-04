/* HLGB v92.55 — correções estruturais do Hub e voz com prévia completa */
(function(){
'use strict';
const V='2026.10.03-critical-ui-v9255';
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const q=v=>Math.max(0,Number(v)||0);
const arr=n=>{try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}};

/* ==================== HUB FINANCEIRO ==================== */
const HUB_KEY='hlgb_hub_selected_date_v9255';
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function parseIso(v){const m=sid(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function hubInput(){return document.getElementById('hubFinanceWeek')}
function rememberHub(v){if(/^\d{4}-\d{2}-\d{2}$/.test(sid(v)))try{localStorage.setItem(HUB_KEY,v)}catch(e){}}
function rememberedHub(){try{return localStorage.getItem(HUB_KEY)||''}catch(e){return ''}}
function ensureHubDate(){
 const el=hubInput();if(!el)return '';
 let v=sid(el.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){v=rememberedHub()||iso(new Date());el.value=v}
 rememberHub(v);return v;
}
function moneySafe(v){try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}}
function fmtSafe(v){try{return typeof window.fmtDate==='function'?window.fmtDate(v):sid(v)}catch(e){return sid(v)}}
function escSafe(v){try{return typeof window.esc==='function'?window.esc(v):esc(v)}catch(e){return esc(v)}}
function tableSafe(headers,rows){try{return typeof window.table==='function'?window.table(headers,rows):'<div class="empty">Tabela indisponível.</div>'}catch(e){return '<div class="empty">Tabela indisponível.</div>'}}
function hubRange(v){
 if(typeof window.hlgb916HubRange==='function')return window.hlgb916HubRange(v);
 const d=parseIso(v)||new Date(),day=(d.getDay()+6)%7,m=new Date(d);m.setDate(m.getDate()-day);const s=new Date(m);s.setDate(s.getDate()+6);return {selected:iso(d),start:iso(m),end:iso(s)};
}
function hubMethods(e){try{return typeof window.hlgb916HubEntryMethods==='function'?window.hlgb916HubEntryMethods(e):(e.flow==='Entrada'?[e.method||'Pix']:(e.acceptedMethods||['Pix']))}catch(_){return []}}
function hubSummary(range){
 if(typeof window.hlgb916HubSummary==='function')return window.hlgb916HubSummary(range);
 const rows=arr('hubFinanceEntries').filter(e=>{const d=sid(e.date).slice(0,10);return d>=range.start&&d<=range.end}),ins=rows.filter(e=>e.flow==='Entrada'),outs=rows.filter(e=>e.flow==='Saída');
 const inTotal=ins.reduce((a,e)=>a+q(e.value),0),outTotal=outs.reduce((a,e)=>a+q(e.value),0),realizedIn=ins.filter(e=>e.status==='Realizado').reduce((a,e)=>a+q(e.value),0),realizedOut=outs.filter(e=>e.status==='Realizado').reduce((a,e)=>a+q(e.value),0);
 return {arr:rows,ins,outs,inTotal,outTotal,balance:inTotal-outTotal,cashIn:0,checksIn:0,hardCash:0,strictCheck:0,flexCheck:0,checkEligible:0,checkGap:0,cashNeed:0,cashBalance:0,realizedIn,realizedOut};
}
function renderHubCore9255(){
 const el=hubInput();if(!el)return false;
 const chosen=ensureHubDate(),range=hubRange(chosen),s=hubSummary(range);
 rememberHub(chosen);
 const label=document.getElementById('hubFinanceWeekLabel');if(label)label.textContent='Semana de '+fmtSafe(range.start)+' a '+fmtSafe(range.end)+'.';
 const cards=document.getElementById('hubFinanceCards');if(cards)cards.innerHTML=
  '<div class="card"><small>Entradas previstas</small><strong>'+moneySafe(s.inTotal)+'</strong></div>'+
  '<div class="card"><small>Saídas previstas</small><strong>'+moneySafe(s.outTotal)+'</strong></div>'+
  '<div class="card"><small>Saldo previsto</small><strong>'+moneySafe(s.balance)+'</strong></div>'+
  '<div class="card"><small>Pix + dinheiro previsto</small><strong>'+moneySafe(s.cashIn)+'</strong></div>'+
  '<div class="card"><small>Cheques previstos</small><strong>'+moneySafe(s.checksIn)+'</strong></div>'+
  '<div class="card"><small>Contas que aceitam cheque</small><strong>'+moneySafe(s.checkEligible)+'</strong></div>'+
  '<div class="card"><small>Entradas realizadas</small><strong>'+moneySafe(s.realizedIn)+'</strong></div>'+
  '<div class="card"><small>Saídas realizadas</small><strong>'+moneySafe(s.realizedOut)+'</strong></div>';
 const alertEl=document.getElementById('hubFinanceLiquidityAlert');if(alertEl){
  let parts=[],cls='ok';if(s.balance<0){parts.push('A semana fecha negativa em '+moneySafe(Math.abs(s.balance))+'.');cls='bad'}else parts.push('A semana fecha positiva em '+moneySafe(s.balance)+'.');
  if(s.checkGap>0){parts.push('Faltam '+moneySafe(s.checkGap)+' em cheque para contas que aceitam somente cheque.');cls='bad'}
  if(s.cashBalance<0){parts.push('Faltam '+moneySafe(Math.abs(s.cashBalance))+' de liquidez em Pix/dinheiro.');if(cls!=='bad')cls='warn'}
  alertEl.innerHTML='<div class="panel"><span class="badge '+cls+'" style="font-size:13px;padding:8px 12px">'+parts.map(escSafe).join(' ')+'</span></div>';
 }
 const cat={};(s.outs||[]).forEach(e=>cat[e.category||'Outros']=(cat[e.category||'Outros']||0)+q(e.value));
 const catRows=Object.entries(cat).sort((a,b)=>b[1]-a[1]),catEl=document.getElementById('hubFinanceCategoryTable');
 if(catEl)catEl.innerHTML=catRows.length?tableSafe(['Categoria','Valor','% das saídas'],catRows.map(([k,v])=>[escSafe(k),moneySafe(v),s.outTotal?((v/s.outTotal*100).toFixed(1).replace('.',',')+'%'):'0%'])):'<div class="empty">Nenhuma saída lançada nesta semana.</div>';
 const methodEl=document.getElementById('hubFinanceMethodTable');if(methodEl)methodEl.innerHTML=tableSafe(['Indicador','Valor'],[['Entradas em Pix/dinheiro',moneySafe(s.cashIn)],['Entradas em cheque',moneySafe(s.checksIn)],['Saídas que exigem Pix/dinheiro',moneySafe(s.hardCash)],['Saídas somente em cheque',moneySafe(s.strictCheck)],['Saídas flexíveis que aceitam cheque',moneySafe(s.flexCheck)],['Necessidade final de Pix/dinheiro após usar cheques',moneySafe(s.cashNeed)]]);
 const future=document.getElementById('hubFinanceFutureTable');if(future){const base=new Date(range.start+'T12:00:00'),rows=[];for(let i=0;i<6;i++){const d=new Date(base);d.setDate(d.getDate()+i*7);const r=hubRange(iso(d)),x=hubSummary(r);rows.push([fmtSafe(r.start)+' a '+fmtSafe(r.end),moneySafe(x.inTotal),moneySafe(x.outTotal),moneySafe(x.balance),moneySafe(x.cashBalance)])}future.innerHTML=tableSafe(['Semana','Entradas','Saídas','Saldo','Liquidez Pix/dinheiro'],rows)}
 const tbl=document.getElementById('hubFinanceEntriesTable');if(tbl){const rows=(s.arr||[]).slice().sort((a,b)=>sid(a.date).localeCompare(sid(b.date)));tbl.innerHTML=rows.length?tableSafe(['Data','Tipo','Descrição','Categoria','Pessoa/Origem','Valor','Pagamento','Status','Ações'],rows.map(e=>[fmtSafe(e.date),'<span class="badge '+(e.flow==='Entrada'?'ok':'warn')+'">'+escSafe(e.flow)+'</span>',escSafe(e.description||'-'),escSafe(e.category||'-'),escSafe(e.person||e.origin||'-'),moneySafe(e.value),escSafe(hubMethods(e).join(' / ')),'<span class="badge '+(e.status==='Realizado'?'ok':'')+'">'+escSafe(e.status||'Previsto')+'</span>','<button type="button" class="secondary" onclick="editHubFinanceEntry('+JSON.stringify(e.id)+')">Editar</button> <button type="button" class="primary" onclick="toggleHubFinanceEntry('+JSON.stringify(e.id)+')">'+(e.status==='Realizado'?'Reabrir':'✓ Realizado')+'</button> <button type="button" class="danger" onclick="deleteHubFinanceEntry('+JSON.stringify(e.id)+')">Excluir</button>'])):'<div class="empty">Nenhum lançamento nesta semana.</div>'}
 const old9253=document.getElementById('hlgbHubWeek9253');if(old9253)old9253.style.display='none';
 // mantém todos os painéis extras exatamente na mesma semana
 try{const pw=document.getElementById('hlgbHubPeriodWeek'),pm=document.getElementById('hlgbHubPeriodMode');if(pm)pm.value='week';if(pw&&typeof window.hlgbHubWeek9253?.range==='function'){/* compat */}if(pw){const d=parseIso(chosen);if(d){const x=new Date(d);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const y=x.getFullYear(),w1=new Date(y,0,4,12),wk=1+Math.round(((x-w1)/86400000-3+((w1.getDay()+6)%7))/7);pw.value=y+'-W'+String(wk).padStart(2,'0')}}}catch(e){}
 try{window.hlgbHubPeriodSummary?.render?.()}catch(e){}
 try{window.renderConfExpenses?.()}catch(e){}
 try{window.hlgbRenderHubFactionDetail?.()}catch(e){}
 return true;
}
function changeHubWeek9255(delta){
 const el=hubInput();if(!el)return;const r=hubRange(ensureHubDate()),d=new Date(r.start+'T12:00:00');d.setDate(d.getDate()+Number(delta||0)*7);el.value=iso(d);rememberHub(el.value);renderHubCore9255();
}
function installHub(){
 if(window.HLGB_HUB_MASTER_9258)return; // HLGB_HUB_MASTER_9258_DISABLE
 window.changeHubFinanceWeek=changeHubWeek9255;
 window.renderHubFinance=renderHubCore9255;
 const el=hubInput();if(el&&!el.dataset.hub9255){el.dataset.hub9255='1';el.addEventListener('change',()=>{rememberHub(el.value);renderHubCore9255()},true)}
 if(document.getElementById('hubFinanceiro'))renderHubCore9255();
}

/* ==================== ASSISTENTE DE VOZ ==================== */
let rec=null,listening=false,finalText='',interimText='';
function speechCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function editDistance(a,b){a=norm(a);b=norm(b);const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function vocabulary(){
 const vals=[];const add=(type,v)=>{v=sid(v).trim();if(v)vals.push({type,name:v,n:norm(v),words:norm(v).split(' ').length})};
 arr('products').forEach(x=>add('Produto',x.name));arr('clients').forEach(x=>add('Cliente',x.name));arr('factionMasters').forEach(x=>add('Facção',x.name));arr('productionLocations').forEach(x=>add('Local',x.name));arr('colors').forEach(x=>add('Cor',x.name||x.value||x));
 const seen=new Set();return vals.filter(x=>{const k=x.type+'|'+x.n;if(!x.n||seen.has(k))return false;seen.add(k);return true}).slice(0,600);
}
function correctKnownEntities(text){
 const words=sid(text).trim().split(/\s+/).filter(Boolean),vocab=vocabulary();if(!words.length||!vocab.length)return {text:sid(text),changes:[],matches:[]};
 const changes=[],matches=[];const used=new Set();
 for(const ent of vocab){
  const w=ent.words;if(w<1||w>4||ent.n.length<4)continue;
  for(let i=0;i<=words.length-w;i++){
   const key=i+':'+w;if(used.has(key))continue;const phrase=words.slice(i,i+w).join(' '),pn=norm(phrase);if(!pn)continue;
   const dist=editDistance(pn,ent.n),ratio=dist/Math.max(pn.length,ent.n.length);
   if(pn===ent.n){matches.push(ent);used.add(key);break}
   if(ratio<=0.18&&pn[0]===ent.n[0]){words.splice(i,w,...ent.name.split(' '));changes.push({from:phrase,to:ent.name,type:ent.type});matches.push(ent);used.add(key);break}
  }
 }
 return {text:words.join(' '),changes,matches};
}
function scoreAlternative(t){const n=norm(t),v=vocabulary();let s=0;for(const x of v){if(n.includes(x.n))s+=Math.min(20,x.n.length)}return s}
function bestAlternative(result){
 const alts=[];for(let i=0;i<Math.min(result?.length||0,3);i++)alts.push(result[i]);alts.sort((a,b)=>(scoreAlternative(b?.transcript||'')+(b?.confidence||0)*3)-(scoreAlternative(a?.transcript||'')+(a?.confidence||0)*3));return sid(alts[0]?.transcript).trim();
}
function setVoiceStatus(t){const e=document.getElementById('hlgbVoiceStatus9255');if(e)e.textContent=t}
function preview(){return document.getElementById('hlgbVoiceFullPreview9255')}
function renderPreview(){
 const raw=[finalText,interimText].filter(Boolean).join(' ').replace(/\s+/g,' ').trim(),fixed=correctKnownEntities(raw),ta=preview();if(ta&&document.activeElement!==ta)ta.value=fixed.text;
 const info=document.getElementById('hlgbVoiceEntities9255');if(info){const seen=new Set(),chips=fixed.matches.filter(x=>{const k=x.type+'|'+x.n;if(seen.has(k))return false;seen.add(k);return true}).slice(0,12);info.innerHTML=chips.length?'<b>Reconhecido no sistema:</b> '+chips.map(x=>'<span class="badge" style="margin:2px">'+esc(x.type)+': '+esc(x.name)+'</span>').join(' '):'<span class="sub">Ainda não identifiquei cadastro específico na fala.</span>'}
 if(fixed.changes.length)setVoiceStatus('Revisei '+fixed.changes.length+' nome(s) usando os cadastros do HLGB.');
 else setVoiceStatus(listening?'Ouvindo…':'Confira o texto antes de enviar.');
 const send=document.getElementById('hlgbVoiceSend9255');if(send)send.disabled=!sid(ta?.value||fixed.text).trim()||listening;
}
function stopVoice(sendAfter=false){
 if(!listening){if(sendAfter)sendPreview();return}
 listening=false;try{rec?.stop?.()}catch(e){try{rec?.abort?.()}catch(_){}}
 const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent='🎙️ Falar e revisar';renderPreview();
 if(sendAfter)setTimeout(sendPreview,120);
}
function sendPreview(){
 const ta=preview(),text=sid(ta?.value).trim(),input=document.getElementById('hlgbAssistantInput');if(!text||!input)return;input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));try{window.hlgbAssistantAsk?.()}catch(e){console.warn('[HLGB voz 9255 envio]',e)}
}
function startVoice(){
 if(listening){stopVoice(false);return}
 const C=speechCtor();if(!C)return alert('O reconhecimento de voz não está disponível neste navegador.');
 finalText='';interimText='';const ta=preview();if(ta)ta.value='';
 try{window.speechSynthesis?.cancel?.()}catch(e){}
 try{
  const r=new C();rec=r;r.lang='pt-BR';r.interimResults=true;r.continuous=true;r.maxAlternatives=3;
  const GL=window.SpeechGrammarList||window.webkitSpeechGrammarList;if(GL){try{const g=new GL(),phrases=vocabulary().map(x=>x.name.replace(/[;=|]/g,' ')).slice(0,300);if(phrases.length)g.addFromString('#JSGF V1.0; grammar hlgb; public <termo> = '+phrases.join(' | ')+' ;',1);r.grammars=g}catch(e){}}
  r.onstart=()=>{if(rec!==r)return;listening=true;const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent='⏹️ Terminar e revisar';setVoiceStatus('Ouvindo…');renderPreview()};
  r.onresult=ev=>{if(rec!==r)return;let interim='';for(let i=ev.resultIndex||0;i<ev.results.length;i++){const part=bestAlternative(ev.results[i]);if(!part)continue;if(ev.results[i].isFinal)finalText=(finalText+' '+part).trim();else interim=(interim+' '+part).trim()}interimText=interim;renderPreview()};
  r.onerror=ev=>{if(!['aborted','no-speech'].includes(ev?.error||''))setVoiceStatus('Microfone: '+sid(ev?.error||'erro'));};
  r.onend=()=>{if(rec!==r)return;rec=null;listening=false;const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent='🎙️ Falar e revisar';renderPreview()};
  r.start();
 }catch(e){listening=false;alert('Não foi possível iniciar o microfone. Confira a permissão do navegador.')}
}
function ensureVoice9255(){
 const input=document.getElementById('hlgbAssistantInput');if(!input)return;
 const old=document.getElementById('hlgbVoicePreview9252');if(old)old.style.display='none';
 let controls=document.getElementById('hlgbAssistantVoiceControls');
 if(!controls){controls=document.createElement('div');controls.id='hlgbAssistantVoiceControls';(input.closest('.hlgb-assistant-input')||input.parentElement)?.insertAdjacentElement('afterend',controls)}
 controls.dataset.continuous='1';controls.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:7px';
 controls.innerHTML='<button type="button" id="hlgbAssistantMicBtn" class="secondary" data-preview9252="1">🎙️ Falar e revisar</button><button type="button" id="hlgbAssistantSpeakBtn" class="secondary">🔊 Ler resposta</button><button type="button" id="hlgbAssistantStopSpeakBtn" class="secondary">⏹️ Parar leitura</button>';
 controls.querySelector('#hlgbAssistantMicBtn').onclick=startVoice;
 controls.querySelector('#hlgbAssistantSpeakBtn').onclick=()=>{try{window.hlgbAssistantVoice?.speakAnswer?.()}catch(e){}};
 controls.querySelector('#hlgbAssistantStopSpeakBtn').onclick=()=>{try{window.speechSynthesis?.cancel?.()}catch(e){}};
 let box=document.getElementById('hlgbVoiceBox9255');
 if(!box){box=document.createElement('div');box.id='hlgbVoiceBox9255';box.className='panel';box.style.cssText='margin-top:8px;padding:12px;background:#fffafb;border:1px solid #d8bdca';
  box.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><b>🎙️ Mensagem completa entendida</b><span id="hlgbVoiceStatus9255" class="sub">Pronto</span></div><textarea id="hlgbVoiceFullPreview9255" rows="7" placeholder="Sua fala completa aparecerá aqui. Você pode corrigir qualquer palavra antes de enviar." style="width:100%;min-height:145px;max-height:260px;resize:vertical;overflow:auto;white-space:pre-wrap;margin-top:8px;padding:11px;border:1px solid #cfc3c9;border-radius:9px;font:inherit;line-height:1.45"></textarea><div id="hlgbVoiceEntities9255" style="margin-top:7px"></div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:9px"><button type="button" id="hlgbVoiceSend9255" class="primary">Usar texto e enviar</button><button type="button" id="hlgbVoiceClear9255" class="secondary">Limpar / falar novamente</button></div>';
  controls.insertAdjacentElement('afterend',box);
  box.querySelector('#hlgbVoiceSend9255').onclick=()=>{if(listening)stopVoice(true);else sendPreview()};
  box.querySelector('#hlgbVoiceClear9255').onclick=()=>{if(listening)stopVoice(false);finalText='';interimText='';preview().value='';document.getElementById('hlgbVoiceEntities9255').innerHTML='';setVoiceStatus('Pronto')};
  box.querySelector('#hlgbVoiceFullPreview9255').addEventListener('input',()=>{const s=document.getElementById('hlgbVoiceSend9255');if(s)s.disabled=!preview().value.trim()});
 }
}
function install(){
 installHub();ensureVoice9255();
 try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0').replace(/[^0-9.]/g,''))||0;if(cur<=92.55){const v=document.querySelector('#appShell .logo small');if(v)v.textContent='v92.55';window.HLGB_RELEASE_VERSION='92.55'}}catch(e){}
}
setTimeout(install,1400);setInterval(()=>{installHub();if(document.getElementById('hlgbAssistantInput'))ensureVoice9255()},1800);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(install,450),0)}catch(e){}
window.hlgbCriticalUi9255={renderHub:renderHubCore9255,changeHubWeek:changeHubWeek9255,ensureVoice:ensureVoice9255,startVoice,stopVoice,sendPreview,vocabulary,correctKnownEntities};
window.HLGB_CRITICAL_UI_9255=V;
console.info('[HLGB] '+V+' ativo');
})();