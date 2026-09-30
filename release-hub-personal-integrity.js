/* HLGB — integridade de despesas pessoais no Hub
   Funcionários/rescisões podem ter campo person sem virarem "gasto pessoal". */
(function(){
'use strict';
const V='2026.09.30-hub-personal-v1';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function hub(){try{return Array.isArray(db?.hubFinanceEntries)?db.hubFinanceEntries:[]}catch(e){return []}}
function settings(){return hub().find(x=>x&&x.kind==='hub_settings_v9137')||null}
function isPersonal(name){
  const n=norm(name);
  const cfg=(Array.isArray(settings()?.categoriesOut)?settings().categoriesOut:[]).find(x=>norm(x?.name)===n);
  return !!cfg?.personal||n==='gasto pessoal'||n==='despesa pessoal'||n==='despesas pessoais';
}
function personalPeople(selected=''){
  const s=settings(),names=[];
  (Array.isArray(s?.people)?s.people:[]).filter(x=>x?.active!==false).forEach(x=>{const n=String(x?.name||x||'').trim();if(n)names.push(n)});
  hub().filter(e=>e?.flow==='Saída'&&e?.person&&isPersonal(e.category)).forEach(e=>names.push(String(e.person).trim()));
  if(selected)names.push(String(selected).trim());
  const seen=new Set();
  return names.filter(n=>{const k=norm(n);if(!k||seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function optionsHtml(selected=''){
  return '<option value="">Selecione a pessoa</option>'+personalPeople(selected).map(p=>'<option value="'+escSafe(p)+'" '+(norm(p)===norm(selected)?'selected':'')+'>'+escSafe(p)+'</option>').join('');
}
function patchForm(html,e={}){
  if(String(e.flow||'Saída')!=='Saída')return html;
  const personal=isPersonal(e.category||'');
  const selected=personal?String(e.person||''):'';
  let opts=optionsHtml(selected);
  if(!personal&&e.person)opts+='<option value="'+escSafe(e.person)+'" selected data-hlgb-nonpersonal="1">'+escSafe(e.person)+'</option>';
  html=String(html).replace(/<select id="hubEntryPerson">[\s\S]*?<\/select>/,'<select id="hubEntryPerson">'+opts+'</select>');
  html=html.replace(/(<div class="field" id="hubPersonWrap937" style=")[^"]*(")/,'$1'+(personal?'':'display:none')+'$2');
  return html;
}
function currentRange(){
  const w=document.getElementById('hubFinanceWeek');if(!w?.value)return null;
  if(typeof hlgb916HubRange==='function')return hlgb916HubRange(w.value);
  return null;
}
function personalEntriesForRange(range){
  if(!range)return [];
  return hub().filter(e=>e?.flow==='Saída'&&String(e.date||'').slice(0,10)>=range.start&&String(e.date||'').slice(0,10)<=range.end&&isPersonal(e.category));
}
function repairPersonalSummary(){
  const el=document.getElementById('hubPersonalTable937'),range=currentRange();if(!el||!range)return;
  const g={};
  personalEntriesForRange(range).forEach(e=>{const n=String(e.person||'Sem pessoa').trim()||'Sem pessoa';g[n]=(g[n]||0)+(Number(e.value)||0)});
  const rows=Object.entries(g).sort((a,b)=>b[1]-a[1]);
  el.innerHTML=rows.length?table(['Pessoa','Despesas na semana'],rows.map(([n,v])=>[escSafe(n),money(v)])):'<div class="empty">Nenhuma despesa pessoal nesta semana.</div>';
}
const oldForm=window.hlgb916HubForm;
if(typeof oldForm==='function'&&!oldForm.__hlgbHubPersonalV1){
  const wrapped=function(e={flow:'Saída'}){return patchForm(oldForm.apply(this,arguments),e)};
  wrapped.__hlgbHubPersonalV1=true;wrapped.__original=oldForm;window.hlgb916HubForm=wrapped;
}
const oldToggle=window.toggleHubPerson937;
window.toggleHubPerson937=function(){
  const wrap=document.getElementById('hubPersonWrap937'),sel=document.getElementById('hubEntryPerson'),cat=document.getElementById('hubEntryCategory')?.value||'';
  if(!wrap||!sel){if(typeof oldToggle==='function')return oldToggle.apply(this,arguments);return}
  const personal=isPersonal(cat);
  wrap.style.display=personal?'':'none';
  if(personal){
    const cur=personalPeople().some(x=>norm(x)===norm(sel.value))?sel.value:'';
    sel.innerHTML=optionsHtml(cur);
  }
};
const oldRender=window.renderHubFinance;
if(typeof oldRender==='function'&&!oldRender.__hlgbHubPersonalV1){
  const wrapped=function(){const out=oldRender.apply(this,arguments);try{repairPersonalSummary()}catch(e){console.error('[HLGB Hub pessoal]',e)};setTimeout(()=>{try{repairPersonalSummary()}catch(e){}},0);return out};
  wrapped.__hlgbHubPersonalV1=true;wrapped.__original=oldRender;window.renderHubFinance=wrapped;
}
window.hlgbHubPersonalIntegrity={isPersonal,personalPeople,personalEntriesForRange,patchForm,repairPersonalSummary};
window.HLGB_HUB_PERSONAL_INTEGRITY_GUARD=V;
console.info('[HLGB] Hub: despesas pessoais separadas de funcionários/rescisões');
})();