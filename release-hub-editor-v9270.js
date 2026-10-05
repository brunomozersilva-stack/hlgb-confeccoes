/* HLGB v92.80 — editor lateral do Hub Financeiro, otimizado para Safari */
(function(){
'use strict';
const V='92.80';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return {...v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{if(window.db)return window.db}catch(e){}return null}
function hub(){try{const d=dbRef();return Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries:[]}catch(e){return []}}
function idOf(x){const direct=x?.id??x?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);try{const a=hub(),i=a.indexOf(x);if(i>=0&&typeof hlgbRecordId==='function'){const id=hlgbRecordId('hubFinanceEntries',x,i);if(id!=null&&sid(id).trim())return sid(id)}}catch(e){}return ''}
function find(id){return hub().find(x=>idOf(x)===sid(id))||null}
function okResult(out){return out===true||out?.applied===true||out?.ok===true||out?.success===true||out?.saved===true}
function css(){
 if(document.getElementById('hlgbHubEditor9280Css'))return;
 const s=document.createElement('style');s.id='hlgbHubEditor9280Css';s.textContent=`
 #hlgbHubEditor9270{position:fixed;z-index:100000;right:12px;top:64px;width:min(500px,calc(100vw - 24px));max-height:calc(100vh - 76px);overflow:auto;background:#fff;border:1px solid #d9cfd5;border-radius:12px;box-shadow:0 8px 24px rgba(45,28,39,.16);box-sizing:border-box;contain:layout paint;background-clip:padding-box}
 #hlgbHubEditor9270 *{box-sizing:border-box}
 #hlgbHubEditor9270 .head{position:sticky;top:0;z-index:2;padding:12px 14px;background:#75435f;color:#fff;display:flex;justify-content:space-between;gap:10px;align-items:center;border-radius:11px 11px 0 0}
 #hlgbHubEditor9270 h2{margin:0;font-size:16px}.he-sub9280{font-size:10px;opacity:.82;margin-top:2px}.he-close9280{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:7px;width:32px;height:32px;font-size:20px;cursor:pointer}
 #hlgbHubEditor9270 .body{padding:13px 14px}.he-grid9280{display:grid;grid-template-columns:1fr 1fr;gap:9px}.he-field9280{display:flex;flex-direction:column;gap:4px}.he-field9280.full{grid-column:1/-1}.he-field9280 label{font-size:11px;font-weight:700;color:#604453}.he-field9280 input,.he-field9280 select{width:100%;border:1px solid #d8cdd3;border-radius:7px;padding:8px 9px;font:inherit;background:#fff;color:#30252b;min-height:36px}.he-methods9280{display:flex;gap:5px;flex-wrap:wrap}.he-method9280{display:flex;align-items:center;gap:4px;border:1px solid #ddd2d8;border-radius:7px;padding:5px 7px;font-size:11px}.he-method9280 input{width:auto;min-height:0;padding:0}.he-actions9280{display:flex;justify-content:flex-end;gap:7px;margin-top:12px;padding-top:10px;border-top:1px solid #eee5ea}.he-actions9280 button{border:0;border-radius:7px;padding:8px 12px;font-weight:700;cursor:pointer}.he-save9280{background:#75435f;color:#fff}.he-cancel9280{background:#f1ecef;color:#503b46}.he-error9280{display:none;margin-top:8px;padding:8px;border-radius:7px;background:#fff1f1;color:#8c3040;border:1px solid #efc7cf;font-size:12px}.he-note9280{font-size:10px;color:#7b6972;margin-top:7px}
 @media(max-width:650px){#hlgbHubEditor9270{left:6px;right:6px;top:56px;width:auto;max-height:calc(100vh - 62px)}.he-grid9280{grid-template-columns:1fr}.he-field9280.full{grid-column:auto}}
 `;document.head.appendChild(s)
}
function payHtml(e,flow){
 if(flow==='Entrada'){
  const cur=sid(e.method||'Pix'),opts=['Pix','Dinheiro','Cheque','Boleto','Transferência','Cartão','Outro'];
  return '<div class="he-field9280 full" id="hePay9280"><label>Forma de recebimento</label><select id="heMethod9280">'+opts.map(x=>'<option '+(cur===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div>';
 }
 const cur=Array.isArray(e.acceptedMethods)&&e.acceptedMethods.length?e.acceptedMethods:['Pix'];
 return '<div class="he-field9280 full" id="hePay9280"><label>Formas aceitas</label><div class="he-methods9280">'+['Pix','Dinheiro','Cheque','Boleto','Transferência'].map(x=>'<label class="he-method9280"><input type="checkbox" value="'+esc(x)+'" '+(cur.includes(x)?'checked':'')+'> '+esc(x)+'</label>').join('')+'</div></div>';
}
function close(){document.getElementById('hlgbHubEditor9270')?.remove();window.HLGB_HUB_EDITING=false}
function showError(msg){const e=document.getElementById('heErr9280');if(e){e.textContent=msg;e.style.display='block'}}
function panel(e){const party=sid(e.person||e.origin||e.supplier||e.client||''),flow=e.flow==='Entrada'?'Entrada':'Saída';return '<div id="hlgbHubEditor9270" role="dialog" aria-modal="false"><div class="head"><div><h2>Editar lançamento financeiro</h2><div class="he-sub9280">Painel leve · o Hub fica pausado enquanto você edita</div></div><button class="he-close9280" type="button" aria-label="Fechar">×</button></div><div class="body"><div class="he-grid9280"><div class="he-field9280"><label>Tipo</label><select id="heFlow9280"><option '+(flow==='Entrada'?'selected':'')+'>Entrada</option><option '+(flow==='Saída'?'selected':'')+'>Saída</option></select></div><div class="he-field9280"><label>Data / vencimento</label><input id="heDate9280" type="date" value="'+esc(sid(e.date).slice(0,10))+'"></div><div class="he-field9280 full"><label>Descrição</label><input id="heDesc9280" value="'+esc(e.description||'')+'"></div><div class="he-field9280"><label>Categoria</label><input id="heCat9280" value="'+esc(e.category||'')+'"></div><div class="he-field9280"><label>Pessoa / origem</label><input id="heParty9280" value="'+esc(party)+'"></div><div class="he-field9280"><label>Valor (R$)</label><input id="heValue9280" type="number" min="0" step="0.01" value="'+esc(Number(e.value||0))+'"></div><div class="he-field9280"><label>Status</label><select id="heStatus9280"><option value="Previsto" '+(e.status!=='Realizado'?'selected':'')+'>Previsto</option><option value="Realizado" '+(e.status==='Realizado'?'selected':'')+'>Realizado</option></select></div>'+payHtml(e,flow)+'</div><div id="heErr9280" class="he-error9280"></div><div class="he-note9280">ID: '+esc(idOf(e))+'</div><div class="he-actions9280"><button class="he-cancel9280" type="button">Cancelar</button><button class="he-save9280" type="button">Salvar alterações</button></div></div></div>'}
function replacePayment(e){const old=document.getElementById('hePay9280');if(!old)return;const tmp=document.createElement('div');tmp.innerHTML=payHtml(e,document.getElementById('heFlow9280')?.value||e.flow);old.replaceWith(tmp.firstElementChild)}
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
 const date=sid(document.getElementById('heDate9280')?.value),description=sid(document.getElementById('heDesc9280')?.value).trim(),category=sid(document.getElementById('heCat9280')?.value).trim(),party=sid(document.getElementById('heParty9280')?.value).trim(),flow=sid(document.getElementById('heFlow9280')?.value),status=sid(document.getElementById('heStatus9280')?.value),value=Number(document.getElementById('heValue9280')?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Informe uma data válida.');if(!description)throw new Error('Informe a descrição.');if(!Number.isFinite(value)||value<0)throw new Error('Informe um valor válido.');
 const next={...clone(existing),flow,date,description,category,value,status,person:party,updatedAt:new Date().toISOString()};if('origin' in existing)next.origin=party;
 if(flow==='Entrada')next.method=sid(document.getElementById('heMethod9280')?.value||existing.method||'Pix');else{const checked=[...document.querySelectorAll('#hePay9280 input[type="checkbox"]:checked')].map(x=>x.value);next.acceptedMethods=checked.length?checked:['Pix']}
 if(status==='Realizado')next.realizedAt=existing.realizedAt||date;else next.realizedAt='';return next
}
function refreshLater(){const run=()=>{try{window.hlgbHubMaster9258?.renderAll?.()}catch(e){console.warn('[HLGB Hub Editor '+V+'] atualizar',e)}};if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1200});else setTimeout(run,120)}
function open(id){
 const e=find(id);if(!e){alert('Não encontrei esse lançamento no Hub. Atualize a tela e tente novamente.');return false}
 window.HLGB_HUB_EDITING=true;try{window.hlgbHubPerfGuard9280?.cancelHeavy?.()}catch(_){ }
 css();close();window.HLGB_HUB_EDITING=true;document.body.insertAdjacentHTML('beforeend',panel(e));
 const root=document.getElementById('hlgbHubEditor9270'),btn=root?.querySelector('.he-save9280');if(!root||!btn){window.HLGB_HUB_EDITING=false;return false}
 root.querySelector('.he-close9280').onclick=close;root.querySelector('.he-cancel9280').onclick=close;root.querySelector('#heFlow9280').onchange=()=>replacePayment(e);
 btn.onclick=async()=>{btn.disabled=true;const old=btn.textContent;btn.textContent='Salvando…';try{const next=readForm(e);await persist(e,next);close();refreshLater()}catch(err){console.error('[HLGB Hub Editor '+V+']',err);showError(String(err?.message||err));btn.disabled=false;btn.textContent=old}};
 return true
}
function install(){window.editHubFinanceEntry=open;window.quickEditHub9185=open;window.hlgbHubEditor9270={version:V,open,close,find,persist,okResult};window.hlgbHubEditor9275=window.hlgbHubEditor9270}
install();setTimeout(install,250);console.info('[HLGB] Hub Editor v'+V+' ativo — painel lateral leve para Safari');
})();
