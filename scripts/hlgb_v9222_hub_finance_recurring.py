from pathlib import Path

src=Path('app9221.html')
out=Path('app9222.html')
s=src.read_text(encoding='utf-8')

addon=r'''<!-- HLGB_V9222_HUB_FINANCE_START -->
<style>
#hubLaunchFilter9222{display:flex;gap:9px;align-items:flex-end;flex-wrap:wrap;margin:8px 0 12px}
#hubLaunchFilter9222 .field{min-width:160px}
#hubLaunchFilter9222 .field.search9222{min-width:280px;flex:1}
#hubRecurring9222 .recurring9222-actions{display:flex;gap:6px;flex-wrap:wrap}
#hubRecurring9222 .badge.pause9222{background:#fff5df}
#hubRecurring9222 .badge.on9222{background:#e9f7ef}
</style>
<script>
(function(){
'use strict';
const V9222='92.22', REC_KIND9222='hub_recurring_expense_template_v9222';
const clone9222=v=>{try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}};
const num9222=v=>Math.max(0,+v||0);
const norm9222=v=>String(v??'').trim().toLowerCase();
const date9222=e=>String(e?.date||e?.dueDate||'').slice(0,10);
const esc9222=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money9222=v=>typeof money==='function'?money(v):(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmt9222=v=>typeof fmtDate==='function'?fmtDate(v):String(v||'');
const uid9222=()=>Date.now()+Math.floor(Math.random()*900000);
function hub9222(){db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return db.hubFinanceEntries}
function isTemplate9222(e){return e?.kind===REC_KIND9222}
function isDone9222(e){return norm9222(e?.status)==='realizado'}
function flow9222(e){return norm9222(e?.flow)==='entrada'?'Entrada':'Saída'}
function methods9222(e){try{return typeof hlgb916HubEntryMethods==='function'?hlgb916HubEntryMethods(e):Array.isArray(e?.acceptedMethods)?e.acceptedMethods:[]}catch(_){return Array.isArray(e?.acceptedMethods)?e.acceptedMethods:[]}}
function range9222(){let w=document.getElementById('hubFinanceWeek')?.value||new Date().toISOString().slice(0,10);try{return typeof hlgb916HubRange==='function'?hlgb916HubRange(w):{start:w,end:w}}catch(e){return {start:w,end:w}}}
function addMonths9222(ym,delta){let [y,m]=String(ym).split('-').map(Number);let d=new Date(y,m-1+delta,1,12);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function monthCmp9222(a,b){return String(a||'').localeCompare(String(b||''))}
function monthDate9222(ym,day){let [y,m]=String(ym).split('-').map(Number),last=new Date(y,m,0).getDate(),dd=Math.min(Math.max(1,+day||1),last);return `${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`}
async function save9222(row,deleted=false){
  if(!row||row.id==null)throw new Error('Registro sem id.');
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof hlgbEnsureRecordsOnlineAfterLogin==='function'&&typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady){let ok=await hlgbEnsureRecordsOnlineAfterLogin();if(!ok)throw new Error('A nuvem não ficou disponível.');}
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravador da nuvem indisponível.');
  let out=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',String(row.id),clone9222(row),!!deleted);
  if(!out||out.applied===false)throw new Error(out?.reason||'A nuvem não confirmou a alteração.');
  let arr=hub9222(),i=arr.findIndex(x=>String(x?.id)===String(row.id));
  if(deleted){if(i>=0)arr.splice(i,1)}else{let confirmed=clone9222(out.data||row);if(i>=0)arr[i]=confirmed;else arr.push(confirmed)}
  try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
  return out.data||row;
}

// Edição rápida do calendário: data + valor + status, confirmados na nuvem.
window.quickEditHub9185=function(id){
  let e=hub9222().find(x=>String(x.id)===String(id));if(!e)return;
  let entrada=flow9222(e)==='Entrada',done=isDone9222(e),oldDate=date9222(e),oldValue=num9222(e.value);
  openModal(`Editar rápido — ${esc9222(e.description||e.category||'Lançamento')}`,`<div class="sub" style="margin-bottom:12px">Altere a data, o valor e se já foi ${entrada?'recebido':'pago'} sem sair desta tela.</div><div class="grid"><div class="field"><label>Data</label><input id="hubQuickDate9222" type="date" value="${esc9222(oldDate||new Date().toISOString().slice(0,10))}"></div><div class="field"><label>Valor</label><input id="hubQuickValue9222" type="number" min="0" step="0.01" value="${oldValue.toFixed(2)}"></div><div class="field"><label>Status</label><select id="hubQuickStatus9222"><option value="Previsto" ${done?'':'selected'}>${entrada?'A receber':'Falta pagar'}</option><option value="Realizado" ${done?'selected':''}>${entrada?'Recebido':'Pago'}</option></select></div></div><button type="button" class="primary modalSave">☁️ Salvar alteração</button>`,async()=>{
    let date=document.getElementById('hubQuickDate9222')?.value||oldDate,value=num9222(document.getElementById('hubQuickValue9222')?.value),st=document.getElementById('hubQuickStatus9222')?.value||'Previsto';
    if(value<=0){alert('Informe um valor maior que zero.');return false}
    let next={...e,date,value,status:st,updatedAt:new Date().toISOString()};
    next.realizedAt=st==='Realizado'?(e.realizedAt||date||new Date().toISOString().slice(0,10)):'';
    if(e.recurringTemplateId&&(date!==oldDate||Math.abs(value-oldValue)>.0001))next.recurringCustomized=true;
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
    try{await save9222(next);closeModal();window.renderHubFinance?.();try{setCloudStatus('⚡ Online · lançamento atualizado','ok')}catch(_e){};return true}
    catch(err){console.error(err);if(btn){btn.disabled=false;btn.textContent='☁️ Salvar alteração'}alert('Não consegui confirmar essa alteração na nuvem. O lançamento foi mantido como estava.');return false}
  });
};

// Filtro da lista completa da semana.
let search9222='',type9222='',status9222='';
function renderWeeklyList9222(){
  const tbl=document.getElementById('hubFinanceEntriesTable');if(!tbl)return;
  let r=range9222(),q=norm9222(search9222),arr=hub9222().filter(e=>!isTemplate9222(e)&&date9222(e)>=r.start&&date9222(e)<=r.end);
  if(type9222)arr=arr.filter(e=>flow9222(e)===type9222);
  if(status9222)arr=arr.filter(e=>status9222==='Realizado'?isDone9222(e):!isDone9222(e));
  if(q)arr=arr.filter(e=>[e.description,e.category,e.subcategory,e.person,e.origin,e.note,e.value,flow9222(e),e.status].some(v=>norm9222(v).includes(q)));
  arr.sort((a,b)=>String(date9222(a)).localeCompare(String(date9222(b)))||String(a.description||'').localeCompare(String(b.description||''),'pt-BR'));
  const rows=arr.map(e=>{
    const sid=String(e.id).replace(/'/g,"\\'");
    return [fmt9222(date9222(e)),`<span class="badge ${flow9222(e)==='Entrada'?'ok':'warn'}">${esc9222(flow9222(e))}</span>`,esc9222(e.description||'-'),esc9222(e.category||'-'),esc9222(e.person||e.origin||'-'),money9222(e.value),esc9222(methods9222(e).join(' / ')),`<span class="badge ${isDone9222(e)?'ok':''}">${esc9222(e.status||'Previsto')}</span>`,`<button type="button" class="secondary" onclick="editHubFinanceEntry('${sid}')">Editar</button> <button type="button" class="primary" onclick="toggleHubFinanceEntry('${sid}')">${isDone9222(e)?'Reabrir':'✓ Realizado'}</button> <button type="button" class="danger" onclick="deleteHubFinanceEntry('${sid}')">Excluir</button>`];
  });
  tbl.innerHTML=arr.length?(typeof table==='function'?table(['Data','Tipo','Descrição','Categoria','Pessoa/Origem','Valor','Pagamento','Status','Ações'],rows):''):'<div class="empty">Nenhum lançamento corresponde ao filtro nesta semana.</div>';
}
function ensureWeekFilter9222(){
  const tbl=document.getElementById('hubFinanceEntriesTable');if(!tbl)return;
  let panel=tbl.closest('.panel');if(!panel)return;
  let f=document.getElementById('hubLaunchFilter9222');
  if(!f){f=document.createElement('div');f.id='hubLaunchFilter9222';f.innerHTML=`<div class="field search9222"><label>Buscar lançamento</label><input id="hubLaunchSearch9222" placeholder="Descrição, categoria, pessoa, fornecedor..." oninput="hlgbHubSearch9222(this.value)"></div><div class="field"><label>Tipo</label><select id="hubLaunchType9222" onchange="hlgbHubType9222(this.value)"><option value="">Todos</option><option>Entrada</option><option>Saída</option></select></div><div class="field"><label>Status</label><select id="hubLaunchStatus9222" onchange="hlgbHubStatus9222(this.value)"><option value="">Todos</option><option value="Previsto">Previstos</option><option value="Realizado">Realizados</option></select></div>`;tbl.insertAdjacentElement('beforebegin',f)}
  const si=document.getElementById('hubLaunchSearch9222');if(si&&si.value!==search9222)si.value=search9222;
  const ti=document.getElementById('hubLaunchType9222');if(ti&&ti.value!==type9222)ti.value=type9222;
  const sti=document.getElementById('hubLaunchStatus9222');if(sti&&sti.value!==status9222)sti.value=status9222;
  renderWeeklyList9222();
}
window.hlgbHubSearch9222=v=>{search9222=v||'';renderWeeklyList9222()};
window.hlgbHubType9222=v=>{type9222=v||'';renderWeeklyList9222()};
window.hlgbHubStatus9222=v=>{status9222=v||'';renderWeeklyList9222()};

// Despesas fixas mensais.
function templates9222(){return hub9222().filter(isTemplate9222)}
async function ensureTemplateThrough9222(t,targetMonth){
  if(t.active===false||!t.startMonth||monthCmp9222(targetMonth,t.startMonth)<0)return 0;
  let start=t.generatedThroughMonth?addMonths9222(t.generatedThroughMonth,1):t.startMonth,created=0;
  if(monthCmp9222(start,t.startMonth)<0)start=t.startMonth;
  for(let ym=start;monthCmp9222(ym,targetMonth)<=0;ym=addMonths9222(ym,1)){
    let exists=hub9222().some(e=>!isTemplate9222(e)&&String(e.recurringTemplateId||'')===String(t.id)&&String(e.recurringMonth||'')===ym);
    if(!exists){
      let row={id:uid9222(),flow:'Saída',description:t.description||'Despesa fixa',value:num9222(t.value),date:monthDate9222(ym,t.dayOfMonth),category:t.category||'Outros',subcategory:t.subcategory||'Despesa fixa mensal',origin:t.origin||'',person:'',status:'Previsto',acceptedMethods:Array.isArray(t.acceptedMethods)&&t.acceptedMethods.length?t.acceptedMethods:['Pix'],note:t.note||'Gerado automaticamente a partir de despesa fixa mensal.',sourceType:'hub_recurring_expense',recurringTemplateId:String(t.id),recurringMonth:ym,createdAt:new Date().toISOString()};
      await save9222(row,false);created++;
    }
  }
  if(monthCmp9222(t.generatedThroughMonth||'',targetMonth)<0){let next={...t,generatedThroughMonth:targetMonth,updatedAt:new Date().toISOString()};await save9222(next,false)}
  return created;
}
let recurringBusy9222=false;
async function ensureRecurringVisible9222(){
  if(recurringBusy9222)return 0;recurringBusy9222=true;
  try{
    let r=range9222(),base=(r.end||r.start||new Date().toISOString().slice(0,10)).slice(0,7),target=addMonths9222(base,2),made=0;
    for(const t of templates9222())made+=await ensureTemplateThrough9222(t,target);
    if(made){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){};setTimeout(()=>window.renderHubFinance?.(),20)}
    return made;
  }catch(e){console.warn('[HLGB 92.22] geração de despesas fixas',e);return 0}finally{recurringBusy9222=false}
}
function categoryOptions9222(current){let cats=(typeof HLGB916_OUT_CATEGORIES!=='undefined'&&Array.isArray(HLGB916_OUT_CATEGORIES)?HLGB916_OUT_CATEGORIES:['Fornecedores','Funcionários','Aluguel','Impostos','Transporte','Outros']);return cats.map(c=>`<option ${String(c)===String(current||cats[0])?'selected':''}>${esc9222(c)}</option>`).join('')}
function recurringForm9222(t={}){let m=Array.isArray(t.acceptedMethods)?t.acceptedMethods:['Pix'];return `<div class="grid"><div class="field"><label>Descrição</label><input id="recDesc9222" value="${esc9222(t.description||'')}"></div><div class="field"><label>Valor mensal</label><input id="recValue9222" type="number" min="0" step="0.01" value="${num9222(t.value).toFixed(2)}"></div><div class="field"><label>Dia do vencimento</label><input id="recDay9222" type="number" min="1" max="31" value="${Math.min(31,Math.max(1,+t.dayOfMonth||1))}"></div><div class="field"><label>A partir do mês</label><input id="recStart9222" type="month" value="${esc9222(t.startMonth||new Date().toISOString().slice(0,7))}"></div><div class="field"><label>Categoria</label><select id="recCat9222">${categoryOptions9222(t.category)}</select></div><div class="field"><label>Subcategoria</label><input id="recSub9222" value="${esc9222(t.subcategory||'Despesa fixa mensal')}"></div><div class="field"><label>Fornecedor / favorecido</label><input id="recOrigin9222" value="${esc9222(t.origin||'')}"></div></div><div class="panel"><h3>Pode ser paga com</h3><div class="toolbar"><label><input class="recMethod9222" type="checkbox" value="Pix" ${m.includes('Pix')?'checked':''}> Pix</label><label><input class="recMethod9222" type="checkbox" value="Dinheiro" ${m.includes('Dinheiro')?'checked':''}> Dinheiro</label><label><input class="recMethod9222" type="checkbox" value="Cheque" ${m.includes('Cheque')?'checked':''}> Cheque</label></div></div><div class="field"><label>Observação</label><textarea id="recNote9222">${esc9222(t.note||'')}</textarea></div>`}
window.openRecurringHub9222=function(id){
  let t=id!=null?templates9222().find(x=>String(x.id)===String(id)):null,oldStart=t?.startMonth||'';
  openModal(t?'Editar despesa fixa mensal':'Nova despesa fixa mensal',recurringForm9222(t||{})+`<button type="button" class="primary modalSave">☁️ Salvar despesa fixa</button>`,async()=>{
    let desc=(document.getElementById('recDesc9222')?.value||'').trim(),value=num9222(document.getElementById('recValue9222')?.value),start=document.getElementById('recStart9222')?.value||'',day=Math.min(31,Math.max(1,+document.getElementById('recDay9222')?.value||1)),methods=[...document.querySelectorAll('.recMethod9222:checked')].map(x=>x.value);
    if(!desc||value<=0||!start){alert('Preencha descrição, valor e mês inicial.');return false}if(!methods.length){alert('Marque ao menos uma forma de pagamento.');return false}
    let next={...(t||{}),id:t?.id??uid9222(),kind:REC_KIND9222,flow:'Config',date:'',description:desc,value,dayOfMonth:day,startMonth:start,category:document.getElementById('recCat9222')?.value||'Outros',subcategory:document.getElementById('recSub9222')?.value||'Despesa fixa mensal',origin:document.getElementById('recOrigin9222')?.value||'',acceptedMethods:methods,note:document.getElementById('recNote9222')?.value||'',status:'Configuração',active:t?.active!==false,createdAt:t?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(t&&oldStart!==start)next.generatedThroughMonth='';
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
    try{await save9222(next,false);closeModal();renderRecurringPanel9222();await ensureRecurringVisible9222();window.renderHubFinance?.();return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar despesa fixa'}alert('Não foi possível confirmar a despesa fixa na nuvem.');return false}
  });
};
window.toggleRecurringHub9222=async function(id){let t=templates9222().find(x=>String(x.id)===String(id));if(!t)return;try{await save9222({...t,active:t.active===false,updatedAt:new Date().toISOString()},false);renderRecurringPanel9222();await ensureRecurringVisible9222()}catch(e){alert('Não foi possível alterar esta despesa fixa.')}};
window.deleteRecurringHub9222=async function(id){let t=templates9222().find(x=>String(x.id)===String(id));if(!t||!confirm('Excluir esta regra de despesa fixa? Os lançamentos mensais já gerados serão mantidos.'))return;try{await save9222(t,true);renderRecurringPanel9222()}catch(e){alert('Não foi possível excluir a regra.')}};
function ensureRecurringPanel9222(){
  let p=document.getElementById('hubRecurring9222');if(p)return p;
  const anchor=document.getElementById('hubFinanceFutureTable')?.closest('.panel')||document.getElementById('hubFinanceEntriesTable')?.closest('.panel');if(!anchor)return null;
  p=document.createElement('div');p.id='hubRecurring9222';p.className='panel';p.innerHTML='<div id="hubRecurringBody9222"></div>';
  anchor.insertAdjacentElement('afterend',p);return p;
}
function renderRecurringPanel9222(){
  let p=ensureRecurringPanel9222();if(!p)return;let body=p.querySelector('#hubRecurringBody9222'),arr=templates9222().slice().sort((a,b)=>String(a.description||'').localeCompare(String(b.description||''),'pt-BR'));
  const rows=arr.map(t=>{let sid=String(t.id).replace(/'/g,"\\'");return [esc9222(t.description||'-'),money9222(t.value),`Dia ${Math.min(31,Math.max(1,+t.dayOfMonth||1))}`,esc9222(t.startMonth||'-'),esc9222(t.category||'-'),`<span class="badge ${t.active===false?'pause9222':'on9222'}">${t.active===false?'Pausada':'Ativa'}</span>`,`<div class="recurring9222-actions"><button type="button" class="secondary" onclick="openRecurringHub9222('${sid}')">Editar</button><button type="button" class="secondary" onclick="toggleRecurringHub9222('${sid}')">${t.active===false?'Ativar':'Pausar'}</button><button type="button" class="danger" onclick="deleteRecurringHub9222('${sid}')">Excluir</button></div>`]});
  body.innerHTML=`<div class="toolbar" style="justify-content:space-between;align-items:center"><div><h2 style="margin:0">🔁 Despesas fixas mensais</h2><div class="sub">Cadastre uma vez e o Hub cria os próximos meses automaticamente a partir do mês escolhido.</div></div><button type="button" class="primary" onclick="openRecurringHub9222()">+ Nova despesa fixa</button></div>${arr.length?(typeof table==='function'?table(['Descrição','Valor','Vencimento','A partir de','Categoria','Status','Ações'],rows):''):'<div class="empty">Nenhuma despesa fixa mensal cadastrada.</div>'}`;
}
window.renderRecurringPanel9222=renderRecurringPanel9222;

const oldRender9222=window.renderHubFinance;
if(typeof oldRender9222==='function')window.renderHubFinance=function(){let r=oldRender9222.apply(this,arguments);setTimeout(()=>{try{ensureWeekFilter9222();renderRecurringPanel9222();ensureRecurringVisible9222()}catch(e){console.warn('[HLGB 92.22] Hub',e)}},45);return r};
function stamp9222(){try{document.title='HLGB Confecções — Sistema de Gestão v92.22 Multiusuário'}catch(e){};let el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.22'}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{stamp9222();try{ensureWeekFilter9222();renderRecurringPanel9222();ensureRecurringVisible9222()}catch(e){}},250)},0);
setTimeout(stamp9222,800);
console.log('[HLGB] v92.22 Hub: edição rápida de valor/data, filtros e despesas fixas mensais');
})();
</script>
<!-- HLGB_V9222_HUB_FINANCE_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]

# Sincroniza todos os carimbos visuais da versão atual, inclusive observadores legados.
s=s.replace('v92.21','v92.22')
s=s.replace('app9221.html','app9222.html')

required=['HLGB_V9222_HUB_FINANCE_START','hubQuickValue9222','hubLaunchFilter9222','Despesas fixas mensais','openRecurringHub9222','recurringTemplateId','v92.22']
miss=[x for x in required if x not in s]
if miss: raise SystemExit('Itens v92.22 ausentes: '+repr(miss))

out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.22</title><script>(function(){window.location.replace('./app9222.html?v=92.22&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.22 preparada: Hub com edição rápida de valor/data, filtro semanal e despesas fixas mensais')
