/* HLGB v92.53 — correção autoritativa da navegação semanal do Hub Financeiro */
(function(){
'use strict';
const V='2026.10.03-hub-week-v9253';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(){try{return Array.isArray(db?.hubFinanceEntries)?db.hubFinanceEntries:[]}catch(e){return []}}
function localIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function parseDate(v){v=sid(v).trim();let m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return new Date(+m[1],+m[2]-1,+m[3],12);m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(m)return new Date(+m[3],+m[2]-1,+m[1],12);return null}
function br(iso){const m=sid(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:sid(iso)}
function weekRange(date){
 const d=new Date(date);d.setHours(12,0,0,0);const delta=(d.getDay()+6)%7;d.setDate(d.getDate()-delta);const e=new Date(d);e.setDate(e.getDate()+6);return {start:localIso(d),end:localIso(e),monday:d,sunday:e}
}
function isoWeek(d){
 const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const y=x.getFullYear(),w1=new Date(y,0,4,12),wk=1+Math.round(((x-w1)/86400000-3+((w1.getDay()+6)%7))/7);return y+'-W'+String(wk).padStart(2,'0')
}
let selected=new Date();selected.setHours(12,0,0,0);
function findCoreDateInput(){
 const page=document.getElementById('hubFinanceiro');if(!page)return null;
 const direct=document.getElementById('hubFinanceWeek');if(direct)return direct;
 const inputs=[...page.querySelectorAll('input')];
 return inputs.find(i=>{const p=i.closest('.panel,.field,.toolbar,div');const t=norm(p?.innerText||p?.textContent||'');return (i.type==='date'||/\d{2}\/\d{2}\/\d{4}/.test(i.value||''))&&(t.includes('escolher a semana')||t.includes('semana pelo calendario'))})||null;
}
function syncCoreInput(){
 const input=findCoreDateInput();if(input){const val=input.type==='date'?localIso(selected):br(localIso(selected));if(input.value!==val)input.value=val}
 const pw=document.getElementById('hlgbHubPeriodWeek');if(pw)pw.value=isoWeek(selected);
 const pm=document.getElementById('hlgbHubPeriodMode');if(pm&&pm.value!=='week'){pm.value='week';try{window.hlgbHubPeriodModeChange?.()}catch(e){}}
}
function rowsForWeek(){
 const r=weekRange(selected);return arr().filter(e=>{const d=sid(e?.date).slice(0,10);return d>=r.start&&d<=r.end&&!sid(e?.kind).startsWith('hub_settings')}).slice().sort((a,b)=>sid(a.date).localeCompare(sid(b.date))||sid(a.description).localeCompare(sid(b.description),'pt-BR'))
}
function summary(rows){
 let pin=0,pout=0,rin=0,rout=0;
 for(const e of rows){const v=q(e.value),real=sid(e.status||'Previsto')==='Realizado';if(e.flow==='Entrada'){pin+=v;if(real)rin+=v}else if(e.flow==='Saída'){pout+=v;if(real)rout+=v}}
 return {pin,pout,rin,rout,projected:pin-pout,realized:rin-rout}
}
function render9253(){
 const page=document.getElementById('hubFinanceiro');if(!page)return;
 let panel=document.getElementById('hlgbHubWeek9253');
 if(!panel){panel=document.createElement('div');panel.id='hlgbHubWeek9253';panel.className='panel';panel.style.cssText='border:2px solid #d9b9c9;background:#fff';
   panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap"><div><h2 style="margin:0">📅 Semana financeira selecionada</h2><div class="sub">Esta visão usa diretamente a data escolhida e não depende do navegador antigo do Hub.</div></div><div class="toolbar" style="align-items:end;flex-wrap:wrap"><button type="button" class="secondary" id="hlgbHubPrev9253">← Semana anterior</button><div class="field"><label>Escolher qualquer dia da semana</label><input type="date" id="hlgbHubDate9253"></div><button type="button" class="secondary" id="hlgbHubNext9253">Próxima semana →</button></div></div><div id="hlgbHubRange9253" style="font-weight:800;margin:10px 0"></div><div id="hlgbHubCards9253" class="cards"></div><div id="hlgbHubRows9253" style="margin-top:12px;overflow:auto"></div>';
   const old=document.getElementById('hubFinanceEntriesTable')?.closest?.('.panel');
   if(old?.parentNode)old.parentNode.insertBefore(panel,old);else page.insertBefore(panel,page.firstChild||null);
   panel.querySelector('#hlgbHubPrev9253').onclick=()=>shift(-7);
   panel.querySelector('#hlgbHubNext9253').onclick=()=>shift(7);
   panel.querySelector('#hlgbHubDate9253').onchange=e=>{const d=parseDate(e.target.value);if(d){selected=d;applySelection()}};
 }
 const r=weekRange(selected),rows=rowsForWeek(),s=summary(rows);
 document.getElementById('hlgbHubDate9253').value=localIso(selected);
 document.getElementById('hlgbHubRange9253').textContent='Semana de '+br(r.start)+' a '+br(r.end);
 document.getElementById('hlgbHubCards9253').innerHTML='<div class="card"><small>Entradas previstas</small><strong>'+money(s.pin)+'</strong></div><div class="card"><small>Saídas previstas</small><strong>'+money(s.pout)+'</strong></div><div class="card"><small>Saldo previsto</small><strong>'+money(s.projected)+'</strong></div><div class="card"><small>Entradas realizadas</small><strong>'+money(s.rin)+'</strong></div><div class="card"><small>Saídas realizadas</small><strong>'+money(s.rout)+'</strong></div><div class="card"><small>Saldo realizado</small><strong>'+money(s.realized)+'</strong></div>';
 const body=rows.map(e=>'<tr><td>'+esc(br(sid(e.date).slice(0,10)))+'</td><td>'+esc(e.flow||'-')+'</td><td>'+esc(e.description||e.subcategory||'-')+'</td><td>'+esc(e.category||'-')+'</td><td>'+esc(e.status||'Previsto')+'</td><td><b>'+money(e.value)+'</b></td></tr>').join('');
 document.getElementById('hlgbHubRows9253').innerHTML=body?'<table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Status</th><th>Valor</th></tr></thead><tbody>'+body+'</tbody></table>':'<div class="empty">Nenhum lançamento nesta semana.</div>';
}
function shift(days){selected=new Date(selected);selected.setDate(selected.getDate()+days);applySelection()}
function applySelection(){
 syncCoreInput();render9253();
 try{window.hlgbHubPeriodSummary?.render?.()}catch(e){}
 try{window.hlgbRenderHubFactionDetail?.()}catch(e){}
 try{window.renderConfExpenses?.()}catch(e){}
}
function adoptCoreInput(){
 const input=findCoreDateInput();if(!input)return;
 const d=parseDate(input.value);if(d&&Math.abs(d-selected)>1000){selected=d;applySelection()}
 if(!input.dataset.hlgbWeek9253){input.dataset.hlgbWeek9253='1';input.addEventListener('change',()=>{const x=parseDate(input.value);if(x){selected=x;applySelection()}},true)}
}
function interceptOldButtons(){
 const page=document.getElementById('hubFinanceiro');if(!page||page.dataset.weekCapture9253)return;page.dataset.weekCapture9253='1';
 page.addEventListener('click',ev=>{const b=ev.target?.closest?.('button');if(!b||b.closest('#hlgbHubWeek9253'))return;const t=norm(b.textContent);if(t.includes('semana anterior')){ev.preventDefault();ev.stopImmediatePropagation();shift(-7)}else if(t.includes('proxima semana')){ev.preventDefault();ev.stopImmediatePropagation();shift(7)}},true);
}
function boot(){const page=document.getElementById('hubFinanceiro');if(!page)return;adoptCoreInput();interceptOldButtons();render9253();syncCoreInput();try{const v=document.querySelector('#appShell .logo small');if(v)v.textContent='v92.53';window.HLGB_RELEASE_VERSION='92.53'}catch(e){}}
const old=window.renderHubFinance;if(typeof old==='function'&&!old.__week9253){const w=function(){const out=old.apply(this,arguments);setTimeout(()=>{adoptCoreInput();render9253()},30);return out};w.__week9253=true;w.__original=old;window.renderHubFinance=w}
setTimeout(boot,1800);setInterval(()=>{if(document.getElementById('hubFinanceiro')){adoptCoreInput();interceptOldButtons();render9253()}},2500);
window.hlgbHubWeek9253={shift,applySelection,render:render9253,range:()=>weekRange(selected),rows:rowsForWeek};
window.HLGB_HUB_WEEK_9253=V;
console.info('[HLGB] '+V+' ativo');
})();