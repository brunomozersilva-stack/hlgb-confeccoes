/* HLGB v92.87 — exclusão segura de pagamentos de facção + escolha explícita de facção no Hub */
(function(){
'use strict';
const V='92.87';
const PENDING_KEY='hlgb_records_pending_v91';
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function arr(n){const d=dbRef();return Array.isArray(d?.[n])?d[n]:[]}
function idOf(module,row){
 const direct=row?.id??row?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);
 try{const a=arr(module),i=a.indexOf(row);if(i>=0&&typeof hlgbRecordId==='function'){const x=hlgbRecordId(module,row,i);if(x!=null&&sid(x).trim())return sid(x)}}catch(e){}
 return '';
}
function isoWeek(p){
 if(p?.scheduledPaymentWeek)return sid(p.scheduledPaymentWeek);
 const ds=sid(p?.scheduledPaymentDate||p?.serviceFinishedAt||p?.paymentDate).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(ds))return 'SEM-DATA';
 const d=new Date(ds+'T12:00:00'),x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const w1=new Date(x.getFullYear(),0,4),wk=1+Math.round(((x-w1)/86400000-3+((w1.getDay()+6)%7))/7);return x.getFullYear()+'-W'+String(wk).padStart(2,'0');
}
function paymentGroupKey(p){const name=sid(p?.factionName||'Sem facção').trim()||'Sem facção';return norm(name)+'||'+isoWeek(p)}
function activePayment(p){return p&&!['cancelado','cancelada'].includes(norm(p.status))}
function readPending(){try{const p=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');return p&&typeof p==='object'?p:null}catch(e){return null}}
function writePending(p){
 try{const mods=p?.modules&&typeof p.modules==='object'?p.modules:{};let any=false;for(const [k,v] of Object.entries(mods)){if(Array.isArray(v)&&v.length)any=true;else delete mods[k]}if(any)localStorage.setItem(PENDING_KEY,JSON.stringify({...p,modules:mods}));else localStorage.removeItem(PENDING_KEY);return true}catch(e){console.error('[HLGB Faction UX '+V+'] fila pendente',e);return false}
}
function queueDelete(row){
 const id=idOf('factionPayments',row);if(!id)throw new Error('Pagamento sem identificação segura.');
 const now=Date.now(),p=readPending()||{version:1,at:now,modules:{}};if(!p.modules||typeof p.modules!=='object')p.modules={};
 const a=Array.isArray(p.modules.factionPayments)?p.modules.factionPayments:[];
 const payload={...clone(row),__hlgb_explicit_delete:true};
 const op={id,data:payload,deleted:true,__hlgb_pending_at:now,queuedAt:now};
 const i=a.findIndex(x=>x&&sid(x.id)===id);if(i>=0)a[i]=op;else a.push(op);
 p.modules.factionPayments=a;p.at=now;if(!writePending(p))throw new Error('Não foi possível registrar a exclusão na fila local.');
 return {id,payload};
}
function clearDeletePending(id){
 const p=readPending();if(!p?.modules)return;const a=Array.isArray(p.modules.factionPayments)?p.modules.factionPayments:[];p.modules.factionPayments=a.filter(op=>!(op&&sid(op.id)===sid(id)&&op.deleted===true));writePending(p)
}
function removePaymentLocal(id){const d=dbRef(),a=arr('factionPayments'),i=a.findIndex((x,j)=>idOf('factionPayments',x)===sid(id));if(i>=0){a.splice(i,1);if(d)d.factionPayments=a;try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}}
function backgroundDelete(id,payload){
 setTimeout(async()=>{try{if(typeof window.hlgbRecordSaveWithRetry!=='function')return;const out=await window.hlgbRecordSaveWithRetry('factionPayments',sid(id),clone(payload),true);if(out?.applied===true&&out?.deleted_at){clearDeletePending(id);try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}}catch(e){console.info('[HLGB Faction UX '+V+'] exclusão ficou pendente para sincronizar:',id,String(e?.message||e))}},0)
}
function deleteRows(rows,label){
 const unique=[];const seen=new Set();for(const row of rows||[]){const id=idOf('factionPayments',row);if(id&&!seen.has(id)){seen.add(id);unique.push(row)}}if(!unique.length)return false;
 if(!confirm(label||('Excluir '+unique.length+' pagamento(s) de facção?')))return false;
 const queued=[];try{for(const row of unique)queued.push(queueDelete(row))}catch(e){alert('Não foi possível preparar a exclusão com segurança. Nenhum pagamento foi removido.\n\n'+String(e?.message||e));return false}
 for(const x of queued)removePaymentLocal(x.id);
 for(const x of queued)backgroundDelete(x.id,x.payload);
 try{window.renderFactionPayments?.()}catch(e){}
 try{window.hlgbRenderHubFactionDetail?.()}catch(e){}
 try{setCloudStatus('⚡ Exclusão salva no aparelho · sincronização pendente','warn')}catch(e){}
 return true;
}
function deletePayment(id){const row=arr('factionPayments').find((x,i)=>idOf('factionPayments',x)===sid(id));return row?deleteRows([row],'Excluir este pagamento de facção?'):false}
function deleteGroup(key){
 const rows=arr('factionPayments').filter(p=>activePayment(p)&&paymentGroupKey(p)===sid(key));if(!rows.length)return false;
 const name=rows[0]?.factionName||'esta facção',week=isoWeek(rows[0]);return deleteRows(rows,'Excluir '+rows.length+' lançamento(s) de '+name+' da semana '+week+'?')
}
function parseArg(text,fn){const m=sid(text).match(new RegExp(fn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\((.+?)\\)'));if(!m)return '';const raw=m[1].trim();try{return sid(JSON.parse(raw))}catch(e){return raw.replace(/^['"]|['"]$/g,'')}}
function paymentIdFromRow(tr){
 for(const b of tr?.querySelectorAll?.('button[onclick]')||[]){const s=b.getAttribute('onclick')||'';for(const n of ['payFactionPayment','editFactionPayment']){const id=parseArg(s,n);if(id)return id}}
 return ''
}
function groupKeyFromRow(tr){for(const b of tr?.querySelectorAll?.('button[onclick]')||[]){const k=parseArg(b.getAttribute('onclick')||'','hlgbPayFactionGroup9230');if(k)return k}return ''}
function bindDeleteButton(btn,handler,title){
 if(!btn)return;btn.type='button';btn.classList.add('danger');btn.textContent='Excluir';btn.title=title||'Excluir';btn.removeAttribute('onclick');btn.onclick=e=>{e.preventDefault();e.stopPropagation();handler()};btn.dataset.hlgbFactionDelete9287='1'
}
function repairPaymentDeletes(){
 const root=document.getElementById('factionPaymentTable');if(!root)return;
 root.querySelectorAll('tbody tr').forEach(tr=>{
  const key=groupKeyFromRow(tr),pid=paymentIdFromRow(tr);if(!key&&!pid)return;
  let btn=[...tr.querySelectorAll('button')].find(b=>norm(b.textContent).includes('excluir'));
  if(!btn){const cell=tr.lastElementChild;if(!cell)return;btn=document.createElement('button');cell.append(' ',btn)}
  if(key)bindDeleteButton(btn,()=>deleteGroup(key),'Excluir os lançamentos desta facção nesta semana');
  else bindDeleteButton(btn,()=>deletePayment(pid),'Excluir este pagamento de facção');
 })
}

/* ---------- Facção cadastrada ou nome novo em Saída do Hub ---------- */
function factionNames(){
 const out=[];for(const f of arr('factionMasters'))if(f&&f.active!==false&&sid(f.name).trim())out.push(sid(f.name).trim());
 for(const f of arr('factions'))if(f&&sid(f.name).trim())out.push(sid(f.name).trim());
 const seen=new Set();return out.filter(n=>{const k=norm(n);if(!k||seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.localeCompare(b,'pt-BR'))
}
function isFactionCategory(v){const n=norm(v);return n==='faccao'||n==='faccoes'||n.includes('faccao')||n.includes('faccoes')}
function factionChooserHtml(current){
 const names=factionNames(),hit=names.find(n=>norm(n)===norm(current)),mode=hit?'registered':'new';
 return '<div class="hlgb-faction-choice9287" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">'+
 '<div><label style="display:block;font-size:10px;font-weight:700;margin-bottom:3px">Facção cadastrada</label><select class="hlgb-faction-select9287" style="width:100%;min-height:34px"><option value="">Selecione uma facção</option>'+names.map(n=>'<option value="'+esc(n)+'" '+(hit===n?'selected':'')+'>'+esc(n)+'</option>').join('')+'<option value="__new__" '+(mode==='new'?'selected':'')+'>Outra / nome novo</option></select></div>'+
 '<div class="hlgb-faction-new-wrap9287" style="'+(mode==='new'?'':'display:none;')+'"><label style="display:block;font-size:10px;font-weight:700;margin-bottom:3px">Nome novo / não cadastrado</label><input class="hlgb-faction-new9287" value="'+esc(mode==='new'?current:'')+'" placeholder="Digite o nome"></div></div>'
}
function installChooser(container,partyInput,current){
 if(!container||!partyInput)return;let box=container.querySelector(':scope > .hlgb-faction-choice9287');if(!box){container.insertAdjacentHTML('beforeend',factionChooserHtml(current));box=container.querySelector(':scope > .hlgb-faction-choice9287')}
 const sel=box?.querySelector('.hlgb-faction-select9287'),nw=box?.querySelector('.hlgb-faction-new9287'),wrap=box?.querySelector('.hlgb-faction-new-wrap9287');if(!sel||!nw)return;
 const sync=()=>{if(sel.value==='__new__'||!sel.value){if(wrap)wrap.style.display='block';partyInput.value=nw.value}else{if(wrap)wrap.style.display='none';partyInput.value=sel.value}partyInput.dispatchEvent(new Event('input',{bubbles:true}))};
 sel.onchange=sync;nw.oninput=sync;partyInput.style.display='none';sync()
}
function removeChooser(container,partyInput){container?.querySelector?.(':scope > .hlgb-faction-choice9287')?.remove();if(partyInput)partyInput.style.display=''}
function updateCustomEditorChooser(){
 const root=document.getElementById('hlgbHubEditor9270');if(!root)return;const flow=root.querySelector('#heFlow9286'),cat=root.querySelector('#heCat9286'),party=root.querySelector('#heParty9286');if(!flow||!cat||!party)return;
 const field=party.closest('.he-field9286')||party.parentElement;if(!field)return;const on=norm(flow.value)==='saida'&&isFactionCategory(cat.value);
 if(on)installChooser(field,party,party.value);else removeChooser(field,party);
 if(!flow.dataset.faction9287){flow.dataset.faction9287='1';flow.addEventListener('change',()=>setTimeout(updateCustomEditorChooser,0))}
 if(!cat.dataset.faction9287){cat.dataset.faction9287='1';cat.addEventListener('input',()=>setTimeout(updateCustomEditorChooser,0));cat.addEventListener('change',()=>setTimeout(updateCustomEditorChooser,0))}
}
function findField(root,re){return [...root.querySelectorAll('.field')].find(f=>re.test(norm(f.querySelector('label')?.textContent||'')))||null}
function enhanceLegacyHubModal(){
 const modal=document.getElementById('modal');if(!modal||modal.style.display==='none')return;
 const flowField=findField(modal,/^(tipo|movimento|fluxo)$/),catField=findField(modal,/categoria/),partyField=findField(modal,/(pessoa|origem)/);if(!flowField||!catField||!partyField)return;
 const flow=flowField.querySelector('select,input'),cat=catField.querySelector('select,input'),party=partyField.querySelector('input');if(!flow||!cat||!party)return;
 const refresh=()=>{const on=norm(flow.value)==='saida'&&isFactionCategory(cat.value);if(on)installChooser(partyField,party,party.value);else removeChooser(partyField,party)};
 if(!flow.dataset.faction9287){flow.dataset.faction9287='1';flow.addEventListener('change',refresh)}if(!cat.dataset.faction9287){cat.dataset.faction9287='1';cat.addEventListener('change',refresh);cat.addEventListener('input',refresh)}refresh()
}
function refreshManualFactionList(){
 const input=document.getElementById('hlgbMfpFaction'),list=document.getElementById('hlgbMfpFactions');if(!input||!list)return;list.innerHTML=factionNames().map(n=>'<option value="'+esc(n)+'"></option>').join('');input.placeholder='Escolha uma facção cadastrada ou digite um nome novo'
}
function repair(){repairPaymentDeletes();updateCustomEditorChooser();enhanceLegacyHubModal();refreshManualFactionList()}
const oldRender=window.renderFactionPayments;if(typeof oldRender==='function'&&!oldRender.__hlgbFactionUx9287){const w=function(){const r=oldRender.apply(this,arguments);setTimeout(repairPaymentDeletes,0);setTimeout(repairPaymentDeletes,120);return r};w.__hlgbFactionUx9287=true;w.__original=oldRender;window.renderFactionPayments=w}
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b)return;if(b.dataset?.hubAction==='edit'||norm(b.textContent)==='editar')setTimeout(()=>{updateCustomEditorChooser();enhanceLegacyHubModal()},20)},true);
const obs=new MutationObserver(records=>{let relevant=false;for(const m of records){const el=m.target?.nodeType===1?m.target:m.target?.parentElement;if(el&&(el.closest?.('#modal,#hlgbHubEditor9270,#factionPaymentTable')||el.matches?.('#modal,#hlgbHubEditor9270,#factionPaymentTable'))){relevant=true;break}for(const n of m.addedNodes||[]){if(n?.nodeType===1&&(n.matches?.('#modal,#hlgbHubEditor9270,#factionPaymentTable')||n.querySelector?.('#modal,#hlgbHubEditor9270,#factionPaymentTable'))){relevant=true;break}}if(relevant)break}if(relevant)setTimeout(repair,0)});
try{obs.observe(document.body,{childList:true,subtree:true})}catch(e){}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(repair,300);setTimeout(repair,1200)},0)}catch(e){}
setTimeout(repair,500);
window.hlgbDeleteFactionPayment9287=deletePayment;window.hlgbDeleteFactionGroup9287=deleteGroup;window.hlgbFactionNames9287=factionNames;window.HLGB_FACTION_UX_GUARD=V;
console.info('[HLGB] Facções '+V+': exclusão local-first e escolha cadastrada/nome novo ativas');
})();
