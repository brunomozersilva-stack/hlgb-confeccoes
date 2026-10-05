/* HLGB v92.81 — editor embutido do Hub Financeiro, sem modal e sem calendário nativo do Safari */
(function(){
'use strict';
const V='92.81';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return {...v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{if(window.db)return window.db}catch(e){}return null}
function hub(){try{const d=dbRef();return Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries:[]}catch(e){return []}}
function idOf(x){const direct=x?.id??x?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);try{const a=hub(),i=a.indexOf(x);if(i>=0&&typeof hlgbRecordId==='function'){const id=hlgbRecordId('hubFinanceEntries',x,i);if(id!=null&&sid(id).trim())return sid(id)}}catch(e){}return ''}
function find(id){return hub().find(x=>idOf(x)===sid(id))||null}
function okResult(out){return out===true||out?.applied===true||out?.ok===true||out?.success===true||out?.saved===true}
function css(){
 if(document.getElementById('hlgbHubEditor9281Css'))return;
 const s=document.createElement('style');s.id='hlgbHubEditor9281Css';s.textContent=`
 #hlgbHubEditor9270{display:block!important;position:relative!important;inset:auto!important;z-index:auto!important;width:auto!important;max-width:none!important;max-height:none!important;overflow:visible!important;margin:10px 0 14px!important;padding:0!important;background:#fff!important;border:1px solid #d9cfd5!important;border-radius:10px!important;box-shadow:none!important;contain:content!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
 #hlgbHubEditor9270 *{box-sizing:border-box}
 #hlgbHubEditor9270 .head{padding:10px 12px;background:#75435f;color:#fff;display:flex;justify-content:space-between;gap:10px;align-items:center;border-radius:9px 9px 0 0}
 #hlgbHubEditor9270 h2{margin:0;font-size:15px}.he-sub9281{font-size:10px;opacity:.82;margin-top:2px}.he-close9281{border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:7px;width:30px;height:30px;font-size:18px;cursor:pointer}
 #hlgbHubEditor9270 .body{padding:11px 12px}.he-grid9281{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.he-field9281{display:flex;flex-direction:column;gap:3px}.he-field9281.span2{grid-column:span 2}.he-field9281.full{grid-column:1/-1}.he-field9281 label{font-size:10px;font-weight:700;color:#604453}.he-field9281 input,.he-field9281 select{width:100%;border:1px solid #d8cdd3;border-radius:6px;padding:7px 8px;font:inherit;background:#fff;color:#30252b;min-height:34px}.he-methods9281{display:flex;gap:5px;flex-wrap:wrap}.he-method9281{display:flex;align-items:center;gap:4px;border:1px solid #ddd2d8;border-radius:6px;padding:5px 7px;font-size:11px}.he-method9281 input{width:auto;min-height:0;padding:0}.he-actions9281{display:flex;justify-content:flex-end;gap:7px;margin-top:10px;padding-top:9px;border-top:1px solid #eee5ea}.he-actions9281 button{border:0;border-radius:6px;padding:8px 11px;font-weight:700;cursor:pointer}.he-save9281{background:#75435f;color:#fff}.he-cancel9281{background:#f1ecef;color:#503b46}.he-error9281{display:none;margin-top:8px;padding:8px;border-radius:6px;background:#fff1f1;color:#8c3040;border:1px solid #efc7cf;font-size:12px}.he-note9281{font-size:10px;color:#7b6972;margin-top:6px}
 @media(max-width:900px){.he-grid9281{grid-template-columns:1fr 1fr}.he-field9281.span2{grid-column:1/-1}}
 @media(max-width:620px){.he-grid9281{grid-template-columns:1fr}.he-field9281.span2,.he-field9281.full{grid-column:auto}}
 `;document.head.appendChild(s)
}
function payHtml(e,flow){
 if(flow==='Entrada'){
  const cur=sid(e.method||'Pix'),opts=['Pix','Dinheiro','Cheque','Boleto','Transferência','Cartão','Outro'];
  return '<div class="he-field9281 span2" id="hePay9281"><label>Forma de recebimento</label><select id="heMethod9281">'+opts.map(x=>'<option '+(cur===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div>';
 }
 const cur=Array.isArray(e.acceptedMethods)&&e.acceptedMethods.length?e.acceptedMethods:['Pix'];
 return '<div class="he-field9281 full" id="hePay9281"><label>Formas aceitas</label><div class="he-methods9281">'+['Pix','Dinheiro','Cheque','Boleto','Transferência'].map(x=>'<label class="he-method9281"><input type="checkbox" value="'+esc(x)+'" '+(cur.includes(x)?'checked':'')+'> '+esc(x)+'</label>').join('')+'</div></div>';
}
function close(){document.getElementById('hlgbHubEditor9270')?.remove();window.HLGB_HUB_EDITING=false}
function showError(msg){const e=document.getElementById('heErr9281');if(e){e.textContent=msg;e.style.display='block'}}
function html(e){
 const party=sid(e.person||e.origin||e.supplier||e.client||''),flow=e.flow==='Entrada'?'Entrada':'Saída';
 return '<div id="hlgbHubEditor9270"><div class="head"><div><h2>Editar lançamento financeiro</h2><div class="he-sub9281">Editor simples do Hub · sem janela flutuante</div></div><button class="he-close9281" type="button" aria-label="Fechar">×</button></div><div class="body"><div class="he-grid9281">'+
 '<div class="he-field9281"><label>Tipo</label><select id="heFlow9281"><option '+(flow==='Entrada'?'selected':'')+'>Entrada</option><option '+(flow==='Saída'?'selected':'')+'>Saída</option></select></div>'+
 '<div class="he-field9281"><label>Data / vencimento</label><input id="heDate9281" type="text" inputmode="numeric" autocomplete="off" placeholder="AAAA-MM-DD" value="'+esc(sid(e.date).slice(0,10))+'"></div>'+
 '<div class="he-field9281 span2"><label>Descrição</label><input id="heDesc9281" value="'+esc(e.description||'')+'"></div>'+
 '<div class="he-field9281"><label>Categoria</label><input id="heCat9281" value="'+esc(e.category||'')+'"></div>'+
 '<div class="he-field9281"><label>Pessoa / origem</label><input id="heParty9281" value="'+esc(party)+'"></div>'+
 '<div class="he-field9281"><label>Valor (R$)</label><input id="heValue9281" type="number" min="0" step="0.01" value="'+esc(Number(e.value||0))+'"></div>'+
 '<div class="he-field9281"><label>Status</label><select id="heStatus9281"><option value="Previsto" '+(e.status!=='Realizado'?'selected':'')+'>Previsto</option><option value="Realizado" '+(e.status==='Realizado'?'selected':'')+'>Realizado</option></select></div>'+payHtml(e,flow)+'</div><div id="heErr9281" class="he-error9281"></div><div class="he-note9281">ID: '+esc(idOf(e))+'</div><div class="he-actions9281"><button class="he-cancel9281" type="button">Cancelar</button><button class="he-save9281" type="button">Salvar alterações</button></div></div></div>'
}
function replacePayment(e){const old=document.getElementById('hePay9281');if(!old)return;const tmp=document.createElement('div');tmp.innerHTML=payHtml(e,document.getElementById('heFlow9281')?.value||e.flow);old.replaceWith(tmp.firstElementChild)}
function equivalent(a,b){return sid(a?.date).slice(0,10)===sid(b?.date).slice(0,10)&&sid(a?.description)===sid(b?.description)&&sid(a?.category)===sid(b?.category)&&Number(a?.value||0)===Number(b?.value||0)&&sid(a?.status)===sid(b?.status)&&sid(a?.flow)===sid(b?.flow)}
function withTimeout(p,ms){let t;return Promise.race([Promise.resolve(p),new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error('A gravação demorou demais. Confira a conexão e tente novamente.')),ms)})]).finally(()=>clearTimeout(t))}
async function persist(existing,next){
 const rid=idOf(existing);if(!rid)throw new Error('Este lançamento não possui identificação segura.');if(next.id==null&&next.__hlgbId==null)next.__hlgbId=rid;
 let out=null;
 if(typeof window.hlgbHubSaveConfirmed==='function')out=await withTimeout(window.hlgbHubSaveConfirmed(next,false),18000);
 else if(typeof window.hlgbRecordSaveWithRetry==='function')out=await withTimeout(window.hlgbRecordSaveWithRetry('hubFinanceEntries',rid,next,false),18000);
 else throw new Error('A função de gravação do Hub não está disponível.');
 if(!okResult(out)){const current=find(rid);if(!current||!equivalent(current,next))throw new Error(out?.reason||out?.error||'A gravação não foi confirmada. Tente novamente.')}
 const a=hub(),i=a.findIndex(x=>idOf(x)===rid);if(i>=0&&out?.data)a[i]=out.data;else if(i>=0&&equivalent(a[i],existing))a[i]=next;return out
}
function readForm(existing){
 const date=sid(document.getElementById('heDate9281')?.value).trim(),description=sid(document.getElementById('heDesc9281')?.value).trim(),category=sid(document.getElementById('heCat9281')?.value).trim(),party=sid(document.getElementById('heParty9281')?.value).trim(),flow=sid(document.getElementById('heFlow9281')?.value),status=sid(document.getElementById('heStatus9281')?.value),value=Number(document.getElementById('heValue9281')?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Informe a data no formato AAAA-MM-DD.');if(!description)throw new Error('Informe a descrição.');if(!Number.isFinite(value)||value<0)throw new Error('Informe um valor válido.');
 const next={...clone(existing),flow,date,description,category,value,status,person:party,updatedAt:new Date().toISOString()};if('origin' in existing)next.origin=party;
 if(flow==='Entrada')next.method=sid(document.getElementById('heMethod9281')?.value||existing.method||'Pix');else{const checked=[...document.querySelectorAll('#hePay9281 input[type="checkbox"]:checked')].map(x=>x.value);next.acceptedMethods=checked.length?checked:['Pix']}
 if(status==='Realizado')next.realizedAt=existing.realizedAt||date;else next.realizedAt='';return next
}
function refreshLater(){
 const run=()=>{try{window.hlgbHubMaster9258?.renderAll?.()}catch(e){console.warn('[HLGB Hub Editor '+V+'] atualizar',e)}};
 setTimeout(()=>{if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1200});else run()},100);
}
function mount(e){
 const page=document.getElementById('hubFinanceiro');if(!page)return false;
 close();window.HLGB_HUB_EDITING=true;try{window.hlgbHubPerfGuard9281?.cancelHeavy?.();window.hlgbHubPerfGuard9280?.cancelHeavy?.()}catch(_){ }
 css();
 const anchor=document.getElementById('hubFinanceCards');
 if(anchor?.parentNode)anchor.insertAdjacentHTML('beforebegin',html(e));else page.insertAdjacentHTML('afterbegin',html(e));
 const root=document.getElementById('hlgbHubEditor9270'),btn=root?.querySelector('.he-save9281');if(!root||!btn){window.HLGB_HUB_EDITING=false;return false}
 root.querySelector('.he-close9281').onclick=close;root.querySelector('.he-cancel9281').onclick=close;root.querySelector('#heFlow9281').onchange=()=>replacePayment(e);
 btn.onclick=async()=>{btn.disabled=true;const old=btn.textContent;btn.textContent='Salvando…';try{const next=readForm(e);await persist(e,next);close();refreshLater()}catch(err){console.error('[HLGB Hub Editor '+V+']',err);showError(String(err?.message||err));btn.disabled=false;btn.textContent=old}};
 try{root.scrollIntoView({block:'start',behavior:'auto'})}catch(_){ }
 return true
}
function open(id){const e=find(id);if(!e){alert('Não encontrei esse lançamento no Hub. Atualize a tela e tente novamente.');return false}return mount(e)}
function install(){window.editHubFinanceEntry=open;window.quickEditHub9185=open;window.hlgbHubEditor9270={version:V,open,close,find,persist,okResult};window.hlgbHubEditor9275=window.hlgbHubEditor9270}
install();setTimeout(install,250);console.info('[HLGB] Hub Editor v'+V+' ativo — editor embutido sem modal');
})();
