/* HLGB v92.77 — editor leve do Hub Financeiro para Safari */
(function(){
'use strict';
const V='92.77';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return {...v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{if(window.db)return window.db}catch(e){}return null}
function hub(){try{const d=dbRef();return Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries:[]}catch(e){return []}}
function idOf(x){const direct=x?.id??x?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);try{const a=hub(),i=a.indexOf(x);if(i>=0&&typeof hlgbRecordId==='function'){const id=hlgbRecordId('hubFinanceEntries',x,i);if(id!=null&&sid(id).trim())return sid(id)}}catch(e){}return ''}
function find(id){return hub().find(x=>idOf(x)===sid(id))||null}
function okResult(out){return out===true||out?.applied===true||out?.ok===true||out?.success===true||out?.saved===true}
function css(){
 if(document.getElementById('hlgbHubEditor9277Css'))return;
 const s=document.createElement('style');s.id='hlgbHubEditor9277Css';s.textContent=`
 #hlgbHubEditor9270{position:fixed;inset:0;z-index:100000;background:rgba(25,18,23,.22);display:flex;align-items:center;justify-content:center;padding:12px;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
 #hlgbHubEditor9270 *{box-sizing:border-box}
 #hlgbHubEditor9270 .card{width:min(620px,94vw);max-height:80vh;overflow:auto;overscroll-behavior:contain;background:#fff;border-radius:14px;border:1px solid #ded3da;box-shadow:0 8px 22px rgba(45,28,39,.14);contain:layout paint}
 #hlgbHubEditor9270 .head{padding:13px 15px;background:#75435f;color:#fff;display:flex;justify-content:space-between;gap:10px;align-items:center;border-radius:14px 14px 0 0}
 #hlgbHubEditor9270 h2{margin:0;font-size:17px}.he-sub9277{font-size:11px;opacity:.82;margin-top:2px}.he-close9277{border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:8px;width:34px;height:34px;font-size:20px;cursor:pointer}
 #hlgbHubEditor9270 .body{padding:14px 15px}.he-grid9277{display:grid;grid-template-columns:1fr 1fr;gap:10px}.he-field9277{display:flex;flex-direction:column;gap:4px}.he-field9277.full{grid-column:1/-1}.he-field9277 label{font-size:11px;font-weight:700;color:#604453}.he-field9277 input,.he-field9277 select{width:100%;border:1px solid #d8cdd3;border-radius:8px;padding:9px 10px;font:inherit;background:#fff;color:#30252b;min-height:38px}.he-methods9277{display:flex;gap:6px;flex-wrap:wrap}.he-method9277{display:flex;align-items:center;gap:4px;border:1px solid #ddd2d8;border-radius:8px;padding:6px 8px;font-size:12px}.he-method9277 input{width:auto;min-height:0;padding:0}.he-actions9277{display:flex;justify-content:flex-end;gap:8px;margin-top:13px;padding-top:11px;border-top:1px solid #eee5ea}.he-actions9277 button{border:0;border-radius:8px;padding:9px 13px;font-weight:700;cursor:pointer}.he-save9277{background:#75435f;color:#fff}.he-cancel9277{background:#f1ecef;color:#503b46}.he-error9277{display:none;margin-top:9px;padding:9px;border-radius:8px;background:#fff1f1;color:#8c3040;border:1px solid #efc7cf;font-size:12px}.he-note9277{font-size:10px;color:#7b6972;margin-top:8px}
 @media(max-width:650px){#hlgbHubEditor9270{padding:6px;align-items:flex-end}#hlgbHubEditor9270 .card{width:100%;max-height:88vh;border-radius:12px 12px 0 0}.he-grid9277{grid-template-columns:1fr}.he-field9277.full{grid-column:auto}}
 `;document.head.appendChild(s)
}
function payHtml(e,flow){
 if(flow==='Entrada'){
  const cur=sid(e.method||'Pix'),opts=['Pix','Dinheiro','Cheque','Boleto','Transferência','Cartão','Outro'];
  return '<div class="he-field9277 full" id="hePay9277"><label>Forma de recebimento</label><select id="heMethod9277">'+opts.map(x=>'<option '+(cur===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div>';
 }
 const cur=Array.isArray(e.acceptedMethods)&&e.acceptedMethods.length?e.acceptedMethods:['Pix'];
 return '<div class="he-field9277 full" id="hePay9277"><label>Formas aceitas</label><div class="he-methods9277">'+['Pix','Dinheiro','Cheque','Boleto','Transferência'].map(x=>'<label class="he-method9277"><input type="checkbox" value="'+esc(x)+'" '+(cur.includes(x)?'checked':'')+'> '+esc(x)+'</label>').join('')+'</div></div>';
}
function close(){document.getElementById('hlgbHubEditor9270')?.remove()}
function showError(msg){const e=document.getElementById('heErr9277');if(e){e.textContent=msg;e.style.display='block'}}
function overlay(e){const party=sid(e.person||e.origin||e.supplier||e.client||''),flow=e.flow==='Entrada'?'Entrada':'Saída';return '<div id="hlgbHubEditor9270" role="dialog" aria-modal="true"><div class="card"><div class="head"><div><h2>Editar lançamento financeiro</h2><div class="he-sub9277">Edição leve · vínculos internos preservados</div></div><button class="he-close9277" type="button">×</button></div><div class="body"><div class="he-grid9277"><div class="he-field9277"><label>Tipo</label><select id="heFlow9277"><option '+(flow==='Entrada'?'selected':'')+'>Entrada</option><option '+(flow==='Saída'?'selected':'')+'>Saída</option></select></div><div class="he-field9277"><label>Data / vencimento</label><input id="heDate9277" type="date" value="'+esc(sid(e.date).slice(0,10))+'"></div><div class="he-field9277 full"><label>Descrição</label><input id="heDesc9277" value="'+esc(e.description||'')+'"></div><div class="he-field9277"><label>Categoria</label><input id="heCat9277" value="'+esc(e.category||'')+'"></div><div class="he-field9277"><label>Pessoa / origem</label><input id="heParty9277" value="'+esc(party)+'"></div><div class="he-field9277"><label>Valor (R$)</label><input id="heValue9277" type="number" min="0" step="0.01" value="'+esc(Number(e.value||0))+'"></div><div class="he-field9277"><label>Status</label><select id="heStatus9277"><option value="Previsto" '+(e.status!=='Realizado'?'selected':'')+'>Previsto</option><option value="Realizado" '+(e.status==='Realizado'?'selected':'')+'>Realizado</option></select></div>'+payHtml(e,flow)+'</div><div id="heErr9277" class="he-error9277"></div><div class="he-note9277">ID: '+esc(idOf(e))+'</div><div class="he-actions9277"><button class="he-cancel9277" type="button">Cancelar</button><button class="he-save9277" type="button">Salvar alterações</button></div></div></div></div>'}
function replacePayment(e){const old=document.getElementById('hePay9277');if(!old)return;const tmp=document.createElement('div');tmp.innerHTML=payHtml(e,document.getElementById('heFlow9277')?.value||e.flow);old.replaceWith(tmp.firstElementChild)}
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
async function save(existing){
 const date=sid(document.getElementById('heDate9277')?.value),description=sid(document.getElementById('heDesc9277')?.value).trim(),category=sid(document.getElementById('heCat9277')?.value).trim(),party=sid(document.getElementById('heParty9277')?.value).trim(),flow=sid(document.getElementById('heFlow9277')?.value),status=sid(document.getElementById('heStatus9277')?.value),value=Number(document.getElementById('heValue9277')?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Informe uma data válida.');if(!description)throw new Error('Informe a descrição.');if(!Number.isFinite(value)||value<0)throw new Error('Informe um valor válido.');
 const next={...clone(existing),flow,date,description,category,value,status,person:party,updatedAt:new Date().toISOString()};if('origin' in existing)next.origin=party;
 if(flow==='Entrada')next.method=sid(document.getElementById('heMethod9277')?.value||existing.method||'Pix');else{const checked=[...document.querySelectorAll('#hePay9277 input[type="checkbox"]:checked')].map(x=>x.value);next.acceptedMethods=checked.length?checked:['Pix']}
 if(status==='Realizado')next.realizedAt=existing.realizedAt||date;else next.realizedAt='';
 await persist(existing,next);
 try{window.hlgbHubMaster9258?.renderAll?.()}catch(e){}
 return true
}
function open(id){
 const e=find(id);if(!e){alert('Não encontrei esse lançamento no Hub. Atualize a tela e tente novamente.');return false}
 css();close();document.body.insertAdjacentHTML('beforeend',overlay(e));
 const root=document.getElementById('hlgbHubEditor9270'),btn=root.querySelector('.he-save9277');
 root.querySelector('.he-close9277').onclick=close;root.querySelector('.he-cancel9277').onclick=close;root.addEventListener('click',ev=>{if(ev.target===root)close()});root.querySelector('#heFlow9277').onchange=()=>replacePayment(e);
 btn.onclick=async()=>{btn.disabled=true;const old=btn.textContent;btn.textContent='Salvando…';try{await save(e);close()}catch(err){console.error('[HLGB Hub Editor '+V+']',err);showError(String(err?.message||err));btn.disabled=false;btn.textContent=old}};
 return true
}
function install(){window.editHubFinanceEntry=open;window.quickEditHub9185=open;window.hlgbHubEditor9270={version:V,open,close,find,save,persist,okResult};window.hlgbHubEditor9275=window.hlgbHubEditor9270}
install();setTimeout(install,250);console.info('[HLGB] Hub Editor v'+V+' ativo — modo leve para Safari');
})();