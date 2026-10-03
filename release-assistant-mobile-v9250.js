/* HLGB v92.50 — Assistente mobile + cálculos rápidos */
(function(){
'use strict';
const V='2026.10.03-assistant-mobile-v9250';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function injectStyle(){
 if(document.getElementById('hlgbAssistantMobile9250Style'))return;
 const st=document.createElement('style');st.id='hlgbAssistantMobile9250Style';
 st.textContent=[
 '#hlgbAssistantMobileFab9250{display:none}',
 '@media(max-width:700px){',
 '#hlgbAssistantMobileFab9250{display:flex!important;position:fixed;right:12px;bottom:18px;z-index:9996;border:0;border-radius:999px;background:#6f3f59;color:#fff;min-width:58px;height:58px;padding:0 16px;align-items:center;justify-content:center;gap:7px;font-size:17px;font-weight:800;box-shadow:0 10px 28px #0005}',
 '.hlgb-assistant-modal{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100vw!important;max-width:100vw!important;max-height:94vh!important;border-radius:22px 22px 0 0!important;padding:16px!important;resize:none!important}',
 '.hlgb-assistant-box{gap:9px!important}.hlgb-assistant-answer{max-height:43vh!important;min-height:110px!important}',
 '.hlgb-assistant-input{display:grid!important;grid-template-columns:1fr auto!important}.hlgb-assistant-input input{min-width:0!important;font-size:16px!important;min-height:44px}',
 '#hlgbAssistantVoiceControls{display:grid!important;grid-template-columns:1fr 1fr!important}#hlgbAssistantVoiceControls button{min-height:46px;font-size:15px}',
 '.hlgb-assistant-examples,.hlgb-assistant-quick9250{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px}.hlgb-assistant-examples button,.hlgb-assistant-quick9250 button{min-height:42px;font-size:13px!important}',
 '}'
 ].join('');
 document.head.appendChild(st);
}
function ensureFab(){
 if(document.getElementById('hlgbAssistantMobileFab9250'))return;
 const b=document.createElement('button');b.id='hlgbAssistantMobileFab9250';b.type='button';b.innerHTML='🤖 <span>Assistente</span>';b.onclick=()=>window.openHlgbAssistant?.();document.body.appendChild(b);
}
function decorate(){
 const input=document.getElementById('hlgbAssistantInput');if(!input)return;
 const modal=input.closest('.modalbox');if(modal)modal.classList.add('hlgb-assistant-modal');
 if(!document.getElementById('hlgbAssistantQuick9250')){
   const w=document.createElement('div');w.id='hlgbAssistantQuick9250';w.className='hlgb-assistant-quick9250';
   w.innerHTML='<button type="button" class="secondary" onclick="hlgbAssistantExample(\'O que está em produção?\')">🏭 Produção</button><button type="button" class="secondary" onclick="hlgbAssistantExample(\'O que entrega hoje?\')">📦 Entregas</button><button type="button" class="secondary" onclick="hlgbAssistantExample(\'Quais contas vencem hoje?\')">💰 Financeiro</button><button type="button" class="secondary" onclick="hlgbAssistantExample(\'Quais erros estão abertos?\')">⚠️ Erros</button>';
   const ex=document.querySelector('.hlgb-assistant-examples');if(ex)ex.insertAdjacentElement('beforebegin',w);
 }
}
function grade(raw){
 const txt=' '+sid(raw).toUpperCase().replace(/[,;+]/g,' ')+' ',sizes=['PP','P','M','G','GG','XG','EXG'],found=[];
 for(const size of sizes){
   let total=0;
   const rs=[new RegExp('(?:^|\\s)(\\d+)\\s*'+size+'(?=\\s|$)','g'),new RegExp('(?:^|\\s)'+size+'\\s*[:=\\-]?\\s*(\\d+)(?=\\s|$)','g')];
   for(const re of rs){let m;while((m=re.exec(txt)))total+=Number(m[1]||0)}
   if(total)found.push([size,total]);
 }
 if(!found.length)return null;return {found,total:found.reduce((a,x)=>a+x[1],0)};
}
function debtSummary(){
 const debts=arr('supplierDebts').filter(x=>x.active!==false),tx=arr('supplierDebtTransactions');
 const bal=debts.reduce((sum,d)=>{let b=q(d.originalValue);for(const t of tx.filter(x=>sid(x.debtId)===sid(d.id))){if(t.type==='Pagamento'||t.type==='Abatimento')b-=q(t.value);if(t.type==='Juros'||t.type==='Acréscimo')b+=q(t.value)}return sum+Math.max(0,b)},0);
 const open=arr('purchases').filter(p=>String(p.status||'')!=='Pago').reduce((a,p)=>a+Math.max(0,q(p.total)-q(p.paid||p.paidAmount)),0);
 return {bal,open,total:bal+open};
}
function smart(raw){
 const n=norm(raw),g=grade(raw);
 if(g&&/(soma|somar|total|grade|peca|peça|quantidade|quanto)/.test(n))return {title:'Soma da grade',text:g.found.map(x=>'<b>'+x[0]+'</b>: '+x[1].toLocaleString('pt-BR')).join(' · ')+'<br><br><b>Total: '+g.total.toLocaleString('pt-BR')+' peças</b>'};
 const m=n.match(/(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)(?:\s*\+\s*(\d+(?:[.,]\d+)?))?/);
 if(m){const v=m.slice(1).filter(Boolean).map(x=>Number(x.replace(',','.')));return {title:'Cálculo',text:v.join(' + ')+' = <b>'+v.reduce((a,b)=>a+b,0).toLocaleString('pt-BR')+'</b>'}}
 if(/divida|dívida|devendo|exposicao|exposição/.test(n)){const d=debtSummary();return {title:'Dívidas e fornecedores',text:'Dívida antiga: <b>'+moneySafe(d.bal)+'</b><br>Notas abertas: <b>'+moneySafe(d.open)+'</b><br>Total exposto: <b>'+moneySafe(d.total)+'</b>'}}
 if(/compra.*funcionario|funcionari.*comprou|desconto.*folha/.test(n)){const v=arr('employeePurchases').filter(x=>!['Quitado','Cancelado'].includes(x.status)).reduce((a,x)=>a+q(x.remaining??x.finalValue),0);return {title:'Compras dos funcionários',text:'Pendente para desconto: <b>'+moneySafe(v)+'</b>'}}
 return null;
}
function install(){
 const cur=window.hlgbAssistantAsk;if(typeof cur!=='function'||cur.__brain9250)return;
 const base=cur,w=function(){const raw=document.getElementById('hlgbAssistantInput')?.value||'',a=smart(raw);if(a){const out=document.getElementById('hlgbAssistantAnswer');if(out)out.innerHTML='<h3 style="margin-top:0">'+escSafe(a.title)+'</h3>'+a.text;return}return base.apply(this,arguments)};
 w.__brain9250=true;w.__original=base;window.hlgbAssistantAsk=w;
}
function boot(){injectStyle();ensureFab();decorate();install();try{window.HLGB_RELEASE_VERSION='92.50'}catch(e){}}
setTimeout(boot,1800);setInterval(()=>{ensureFab();if(document.getElementById('hlgbAssistantInput')){decorate();install()}},2400);
window.hlgbAssistantMobile9250={grade,smart};
console.info('[HLGB] '+V+' ativo');
})();