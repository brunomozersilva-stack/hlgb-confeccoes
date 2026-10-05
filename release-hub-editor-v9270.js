/* HLGB v92.86 — editor do Hub com calendário próprio, independente do navegador */
(function(){
'use strict';
const V='92.86';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return {...v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let calYear=null,calMonth=null;
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{if(window.db)return window.db}catch(e){}return null}
function hub(){try{const d=dbRef();return Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries:[]}catch(e){return []}}
function idOf(x){const direct=x?.id??x?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);try{const a=hub(),i=a.indexOf(x);if(i>=0&&typeof hlgbRecordId==='function'){const id=hlgbRecordId('hubFinanceEntries',x,i);if(id!=null&&sid(id).trim())return sid(id)}}catch(e){}return ''}
function find(id){return hub().find(x=>idOf(x)===sid(id))||null}
function okResult(out){return out===true||out?.applied===true||out?.ok===true||out?.success===true||out?.saved===true}
function parseIso(v){const m=sid(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function isoDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function css(){
 if(document.getElementById('hlgbHubEditor9286Css'))return;
 const s=document.createElement('style');s.id='hlgbHubEditor9286Css';s.textContent=`
 #hlgbHubEditor9270{position:fixed!important;right:10px!important;top:68px!important;left:auto!important;bottom:auto!important;z-index:100000!important;width:min(500px,calc(100vw - 20px))!important;max-height:calc(100vh - 78px)!important;overflow:auto!important;margin:0!important;padding:0!important;background:#fff!important;border:1px solid #d9cfd5!important;border-radius:10px!important;box-shadow:0 8px 22px rgba(45,28,39,.14)!important;contain:layout paint!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overscroll-behavior:contain!important}
 #hlgbHubEditor9270 *{box-sizing:border-box}#hlgbHubEditor9270 .head{position:sticky;top:0;z-index:5;padding:10px 12px;background:#75435f;color:#fff;display:flex;justify-content:space-between;gap:10px;align-items:center;border-radius:9px 9px 0 0}
 #hlgbHubEditor9270 h2{margin:0;font-size:15px}.he-sub9286{font-size:10px;opacity:.82;margin-top:2px}.he-close9286{border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:7px;width:30px;height:30px;font-size:18px;cursor:pointer}
 #hlgbHubEditor9270 .body{padding:11px 12px}.he-grid9286{display:grid;grid-template-columns:1fr 1fr;gap:8px}.he-field9286{display:flex;flex-direction:column;gap:3px}.he-field9286.full{grid-column:1/-1}.he-field9286 label{font-size:10px;font-weight:700;color:#604453}.he-field9286 input,.he-field9286 select{width:100%;border:1px solid #d8cdd3;border-radius:6px;padding:7px 8px;font:inherit;background:#fff;color:#30252b;min-height:34px}
 .he-date-wrap9286{position:relative;display:grid;grid-template-columns:1fr 38px;gap:4px}.he-date-btn9286{border:1px solid #d8cdd3;background:#f6f1f4;border-radius:6px;cursor:pointer;font-size:17px;min-height:34px}
 .he-calendar9286{display:none;position:absolute;right:0;top:39px;width:286px;background:#fff;border:1px solid #d8cdd3;border-radius:9px;box-shadow:0 10px 24px rgba(45,28,39,.18);padding:9px;z-index:30}
 .he-cal-head9286{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;gap:5px;margin-bottom:7px}.he-cal-head9286 button{border:1px solid #ddd2d8;background:#f7f2f5;border-radius:6px;height:30px;cursor:pointer}.he-cal-title9286{text-align:center;font-weight:800;font-size:12px;color:#513947}
 .he-cal-week9286,.he-cal-grid9286{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.he-cal-week9286 span{text-align:center;font-size:9px;color:#846d79;padding:3px 0}.he-cal-day9286{border:0;background:#f8f5f7;border-radius:5px;height:29px;cursor:pointer;font-size:11px}.he-cal-day9286:hover{background:#eadde5}.he-cal-day9286.sel{background:#75435f;color:#fff;font-weight:800}.he-cal-day9286.blank{visibility:hidden;pointer-events:none}
 .he-methods9286{display:flex;gap:5px;flex-wrap:wrap}.he-method9286{display:flex;align-items:center;gap:4px;border:1px solid #ddd2d8;border-radius:6px;padding:5px 7px;font-size:11px}.he-method9286 input{width:auto;min-height:0;padding:0}.he-actions9286{display:flex;justify-content:flex-end;gap:7px;margin-top:10px;padding-top:9px;border-top:1px solid #eee5ea}.he-actions9286 button{border:0;border-radius:6px;padding:8px 11px;font-weight:700;cursor:pointer}.he-save9286{background:#75435f;color:#fff}.he-cancel9286{background:#f1ecef;color:#503b46}.he-error9286{display:none;margin-top:8px;padding:8px;border-radius:6px;background:#fff1f1;color:#8c3040;border:1px solid #efc7cf;font-size:12px}.he-note9286{font-size:10px;color:#7b6972;margin-top:6px}
 @media(max-width:620px){#hlgbHubEditor9270{right:6px!important;left:6px!important;top:58px!important;width:auto!important;max-height:calc(100vh - 64px)!important}.he-grid9286{grid-template-columns:1fr}.he-field9286.full{grid-column:auto}.he-calendar9286{left:0;right:auto;width:min(286px,calc(100vw - 44px))}}
 `;document.head.appendChild(s)
}
function payHtml(e,flow){
 if(flow==='Entrada'){
  const cur=sid(e.method||'Pix'),opts=['Pix','Dinheiro','Cheque','Boleto','Transferência','Cartão','Outro'];
  return '<div class="he-field9286 full" id="hePay9286"><label>Forma de recebimento</label><select id="heMethod9286">'+opts.map(x=>'<option '+(cur===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div>';
 }
 const cur=Array.isArray(e.acceptedMethods)&&e.acceptedMethods.length?e.acceptedMethods:['Pix'];
 return '<div class="he-field9286 full" id="hePay9286"><label>Formas aceitas</label><div class="he-methods9286">'+['Pix','Dinheiro','Cheque','Boleto','Transferência'].map(x=>'<label class="he-method9286"><input type="checkbox" value="'+esc(x)+'" '+(cur.includes(x)?'checked':'')+'> '+esc(x)+'</label>').join('')+'</div></div>';
}
function close(){document.getElementById('hlgbHubEditor9270')?.remove();window.HLGB_HUB_EDITING=false;calYear=calMonth=null}
function showError(msg){const e=document.getElementById('heErr9286');if(e){e.textContent=msg;e.style.display='block'}}
function html(e){
 const party=sid(e.person||e.origin||e.supplier||e.client||''),flow=e.flow==='Entrada'?'Entrada':'Saída',date=sid(e.date).slice(0,10);
 return '<div id="hlgbHubEditor9270" role="dialog" aria-modal="false"><div class="head"><div><h2>Editar lançamento financeiro</h2><div class="he-sub9286">Editor leve · calendário HLGB · sem mover a página</div></div><button class="he-close9286" type="button" aria-label="Fechar">×</button></div><div class="body"><div class="he-grid9286">'+
 '<div class="he-field9286"><label>Tipo</label><select id="heFlow9286"><option '+(flow==='Entrada'?'selected':'')+'>Entrada</option><option '+(flow==='Saída'?'selected':'')+'>Saída</option></select></div>'+
 '<div class="he-field9286"><label>Data / vencimento</label><div class="he-date-wrap9286"><input id="heDate9286" type="text" readonly value="'+esc(date)+'"><button id="heDateBtn9286" class="he-date-btn9286" type="button" aria-label="Abrir calendário">📅</button><div id="heCalendar9286" class="he-calendar9286"></div></div></div>'+
 '<div class="he-field9286 full"><label>Descrição</label><input id="heDesc9286" value="'+esc(e.description||'')+'"></div>'+
 '<div class="he-field9286"><label>Categoria</label><input id="heCat9286" value="'+esc(e.category||'')+'"></div>'+
 '<div class="he-field9286"><label>Pessoa / origem</label><input id="heParty9286" value="'+esc(party)+'"></div>'+
 '<div class="he-field9286"><label>Valor (R$)</label><input id="heValue9286" type="number" min="0" step="0.01" value="'+esc(Number(e.value||0))+'"></div>'+
 '<div class="he-field9286"><label>Status</label><select id="heStatus9286"><option value="Previsto" '+(e.status!=='Realizado'?'selected':'')+'>Previsto</option><option value="Realizado" '+(e.status==='Realizado'?'selected':'')+'>Realizado</option></select></div>'+payHtml(e,flow)+'</div><div id="heErr9286" class="he-error9286"></div><div class="he-note9286">ID: '+esc(idOf(e))+'</div><div class="he-actions9286"><button class="he-cancel9286" type="button">Cancelar</button><button class="he-save9286" type="button">Salvar alterações</button></div></div></div>'
}
function renderCalendar(){
 const box=document.getElementById('heCalendar9286'),input=document.getElementById('heDate9286');if(!box||!input)return;
 const selected=parseIso(input.value)||new Date();if(calYear==null||calMonth==null){calYear=selected.getFullYear();calMonth=selected.getMonth()}
 const first=new Date(calYear,calMonth,1,12),days=new Date(calYear,calMonth+1,0,12).getDate(),start=first.getDay(),months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 let grid='';for(let i=0;i<start;i++)grid+='<button class="he-cal-day9286 blank" type="button"></button>';
 for(let d=1;d<=days;d++){const dt=new Date(calYear,calMonth,d,12),iso=isoDate(dt),sel=iso===input.value?' sel':'';grid+='<button class="he-cal-day9286'+sel+'" type="button" data-cal-date="'+iso+'">'+d+'</button>'}
 box.innerHTML='<div class="he-cal-head9286"><button type="button" data-cal-nav="-1">‹</button><div class="he-cal-title9286">'+months[calMonth]+' '+calYear+'</div><button type="button" data-cal-nav="1">›</button></div><div class="he-cal-week9286"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div><div class="he-cal-grid9286">'+grid+'</div>';
 box.style.display='block';
}
function toggleCalendar(){const box=document.getElementById('heCalendar9286'),input=document.getElementById('heDate9286');if(!box||!input)return;if(box.style.display==='block'){box.style.display='none';return}const d=parseIso(input.value)||new Date();calYear=d.getFullYear();calMonth=d.getMonth();renderCalendar()}
function calendarClick(ev){const nav=ev.target?.dataset?.calNav,date=ev.target?.dataset?.calDate;if(nav){calMonth+=Number(nav);if(calMonth<0){calMonth=11;calYear--}if(calMonth>11){calMonth=0;calYear++}renderCalendar();return}if(date){const input=document.getElementById('heDate9286'),box=document.getElementById('heCalendar9286');if(input)input.value=date;if(box)box.style.display='none'}}
function replacePayment(e){const old=document.getElementById('hePay9286');if(!old)return;const tmp=document.createElement('div');tmp.innerHTML=payHtml(e,document.getElementById('heFlow9286')?.value||e.flow);old.replaceWith(tmp.firstElementChild)}
function equivalent(a,b){return sid(a?.date).slice(0,10)===sid(b?.date).slice(0,10)&&sid(a?.description)===sid(b?.description)&&sid(a?.category)===sid(b?.category)&&Number(a?.value||0)===Number(b?.value||0)&&sid(a?.status)===sid(b?.status)&&sid(a?.flow)===sid(b?.flow)}
async function persist(existing,next){
 const rid=idOf(existing);if(!rid)throw new Error('Este lançamento não possui identificação segura.');if(next.id==null&&next.__hlgbId==null)next.__hlgbId=rid;
 let out=null;
 if(typeof window.hlgbHubSaveConfirmed==='function')out=await window.hlgbHubSaveConfirmed(next,false);
 else if(typeof window.hlgbRecordSaveWithRetry==='function')out=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',rid,next,false);
 else throw new Error('A função de gravação do Hub não está disponível.');
 if(!okResult(out)){const current=find(rid);if(!current||!equivalent(current,next))throw new Error(out?.reason||out?.error||'A gravação não foi confirmada. Tente novamente.')}
 const a=hub(),i=a.findIndex(x=>idOf(x)===rid);if(i>=0&&out?.data)a[i]=out.data;else if(i>=0&&equivalent(a[i],existing))a[i]=next;return out
}
function readForm(existing){
 const date=sid(document.getElementById('heDate9286')?.value).trim(),description=sid(document.getElementById('heDesc9286')?.value).trim(),category=sid(document.getElementById('heCat9286')?.value).trim(),party=sid(document.getElementById('heParty9286')?.value).trim(),flow=sid(document.getElementById('heFlow9286')?.value),status=sid(document.getElementById('heStatus9286')?.value),value=Number(document.getElementById('heValue9286')?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Informe uma data válida.');if(!description)throw new Error('Informe a descrição.');if(!Number.isFinite(value)||value<0)throw new Error('Informe um valor válido.');
 const next={...clone(existing),flow,date,description,category,value,status,person:party,updatedAt:new Date().toISOString()};if('origin' in existing)next.origin=party;
 if(flow==='Entrada')next.method=sid(document.getElementById('heMethod9286')?.value||existing.method||'Pix');else{const checked=[...document.querySelectorAll('#hePay9286 input[type="checkbox"]:checked')].map(x=>x.value);next.acceptedMethods=checked.length?checked:['Pix']}
 if(status==='Realizado')next.realizedAt=existing.realizedAt||date;else next.realizedAt='';return next
}
function refreshLater(){const run=()=>{try{window.hlgbHubMaster9258?.renderAll?.()}catch(e){console.warn('[HLGB Hub Editor '+V+'] atualizar',e)}};setTimeout(()=>{if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1200});else run()},120)}
function mount(e){
 const y=window.scrollY||document.documentElement.scrollTop||0,x=window.scrollX||document.documentElement.scrollLeft||0;
 close();window.HLGB_HUB_EDITING=true;try{window.hlgbHubPerfGuard9281?.cancelHeavy?.();window.hlgbHubPerfGuard9280?.cancelHeavy?.()}catch(_){ }
 css();document.body.insertAdjacentHTML('beforeend',html(e));
 const root=document.getElementById('hlgbHubEditor9270'),btn=root?.querySelector('.he-save9286');if(!root||!btn){window.HLGB_HUB_EDITING=false;return false}
 root.querySelector('.he-close9286').onclick=close;root.querySelector('.he-cancel9286').onclick=close;root.querySelector('#heFlow9286').onchange=()=>replacePayment(e);root.querySelector('#heDateBtn9286').onclick=toggleCalendar;root.querySelector('#heDate9286').onclick=toggleCalendar;root.querySelector('#heCalendar9286').onclick=calendarClick;
 btn.onclick=async()=>{btn.disabled=true;const old=btn.textContent;btn.textContent='Salvando…';const wait=setTimeout(()=>{if(btn.isConnected)btn.textContent='Ainda salvando…'},8000);try{const next=readForm(e);await persist(e,next);clearTimeout(wait);close();refreshLater()}catch(err){clearTimeout(wait);console.error('[HLGB Hub Editor '+V+']',err);showError(String(err?.message||err));btn.disabled=false;btn.textContent=old}};
 requestAnimationFrame(()=>{try{window.scrollTo(x,y)}catch(_){}});return true
}
function open(id){const e=find(id);if(!e){alert('Não encontrei esse lançamento no Hub. Atualize a tela e tente novamente.');return false}return mount(e)}
function install(){window.editHubFinanceEntry=open;window.quickEditHub9185=open;window.hlgbHubEditor9270={version:V,open,close,find,persist,okResult,toggleCalendar};window.hlgbHubEditor9275=window.hlgbHubEditor9270}
install();setTimeout(install,250);console.info('[HLGB] Hub Editor v'+V+' ativo — calendário próprio HLGB');
})();
