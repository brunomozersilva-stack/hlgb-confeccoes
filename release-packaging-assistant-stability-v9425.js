/* HLGB v94.25 — Embalagem interna + botão estável do Assistente */
(function(){
'use strict';
const V='94.25';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const arr=n=>{try{return Array.isArray(window.db?.[n])?window.db[n]:[]}catch(e){return []}};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const currentMonth=()=>today().slice(0,7);
function clone(v){try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}}
function employeeIsPacker(e){
 if(!e||e.active===false)return false;
 if(e.packagingRole===true||e.isPacker===true)return true;
 return [e.jobTitle,e.role,e.cargo,e.funcao,e['função'],e.function,e.position].some(v=>norm(v).includes('embalad'));
}
function upsertLocal(module,row){
 const a=arr(module),i=a.findIndex(x=>sid(x?.id)===sid(row?.id));
 if(i>=0)a[i]=clone(row);else a.push(clone(row));
 try{window.localSaveOnly?.()}catch(e){}
}
async function saveRecord(module,row){
 try{if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false)}catch(e){}
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('A gravação multiusuário não está disponível.');
 const out=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),false);
 if(!out||out.applied!==true)throw new Error(out?.reason||'A nuvem não confirmou a alteração.');
 const confirmed=out.data||row;upsertLocal(module,confirmed);return confirmed;
}
function monthRows(month){
 const key=sid(month||currentMonth()).slice(0,7);
 return arr('packagingAssignments').filter(x=>x&&x.packagingType==='internal'&&sid(x.date).slice(0,7)===key);
}
function monthlyTotals(month){
 const rows=monthRows(month);
 return {rows:rows.length,assigned:rows.reduce((a,x)=>a+q(x.qty),0),done:rows.reduce((a,x)=>a+q(x.doneQty),0)};
}
function ensureStyle(){
 if(document.getElementById('hlgbPackaging9425Style'))return;
 const s=document.createElement('style');s.id='hlgbPackaging9425Style';
 s.textContent='#hlgbPackSummary9425{margin:12px 0}.hlgb-pack-type9425{display:inline-block;margin-top:4px;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:800;background:#f3dbe5;color:#6f3f59}.hlgb-pack-type9425.external{background:#eef1f6;color:#555}.hlgb-assistant-input button[onclick*="hlgbAssistantAsk"]:not(#hlgbAssistantSend9425){display:none!important}';
 document.head.appendChild(s);
}
function decoratePackaging(){
 ensureStyle();
 const host=document.getElementById('embalagem9249Host');if(!host)return false;
 let bar=host.querySelector('.toolbar');
 if(bar&&!document.getElementById('hlgbPackManage9425')){
  const b=document.createElement('button');b.type='button';b.className='secondary';b.id='hlgbPackManage9425';b.textContent='👤 Cadastrar embaladeiras';b.onclick=openPackerManager;bar.appendChild(b);
 }
 let summary=document.getElementById('hlgbPackSummary9425');
 if(!summary){summary=document.createElement('div');summary.id='hlgbPackSummary9425';host.insertBefore(summary,host.querySelector('.ops-table')||host.firstChild)}
 const month=document.getElementById('hlgbPackMonth9425')?.value||currentMonth(),t=monthlyTotals(month);
 summary.innerHTML='<div class="toolbar" style="align-items:flex-end"><div class="field"><label>Mês</label><input id="hlgbPackMonth9425" type="month" value="'+esc(month)+'"></div></div><div class="cards"><div class="card"><small>Embalagem interna pronta no mês</small><strong>'+t.done.toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Peças atribuídas internamente</small><strong>'+t.assigned.toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Atribuições internas</small><strong>'+t.rows.toLocaleString('pt-BR')+'</strong></div></div>';
 const monthInput=document.getElementById('hlgbPackMonth9425');if(monthInput)monthInput.onchange=decoratePackaging;
 const records=arr('packagingAssignments').slice().sort((a,b)=>sid(b.date).localeCompare(sid(a.date)));
 const table=host.querySelector('.ops-table table');
 if(table){
  [...table.querySelectorAll('tbody tr')].forEach((tr,i)=>{
   const x=records[i],td=tr.querySelector('td');if(!x||!td||td.querySelector('.hlgb-pack-type9425'))return;
   const type=x.packagingType==='internal'?'Interno':x.packagingType==='external'?'Externo':'Não informado';
   const sp=document.createElement('span');sp.className='hlgb-pack-type9425'+(x.packagingType==='external'?' external':'');sp.textContent=type;td.appendChild(document.createElement('br'));td.appendChild(sp);
  });
 }
 return true;
}
async function openPackerManager(){
 const employees=arr('employees').filter(e=>e&&e.active!==false).slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 if(!employees.length){alert('Nenhum funcionário ativo cadastrado.');return}
 const rows=employees.map(e=>'<label style="display:flex;gap:9px;align-items:center;padding:8px 0;border-bottom:1px solid #eee"><input class="hlgbPackEmp9425" type="checkbox" value="'+esc(e.id)+'" '+(employeeIsPacker(e)?'checked':'')+'> <span><b>'+esc(e.name||'Funcionário')+'</b><br><small>'+esc(e.companyName||'')+'</small></span></label>').join('');
 window.openModal?.('Cadastrar embaladeiras','<div class="sub">Marque somente quem trabalha na embalagem. Esta marcação fica no cadastro real do funcionário e é usada no seletor da Embalagem.</div><div style="max-height:55vh;overflow:auto;margin:12px 0">'+rows+'</div><button type="button" class="primary modalSave">Salvar embaladeiras</button>',async()=>{
  const selected=new Set([...document.querySelectorAll('.hlgbPackEmp9425:checked')].map(x=>sid(x.value))),btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando…'}
  try{
   for(const e of employees){const desired=selected.has(sid(e.id));if(!!e.packagingRole===desired)continue;await saveRecord('employees',{...clone(e),packagingRole:desired,updatedAt:new Date().toISOString()})}
   window.closeModal?.();decoratePackaging();
  }catch(err){if(btn){btn.disabled=false;btn.textContent='Salvar embaladeiras'}alert('Não foi possível salvar todas as embaladeiras.\n\n'+sid(err?.message||err))}
 });
}
function packagingEditor(id){
 const cur=id?arr('packagingAssignments').find(x=>sid(x.id)===sid(id)):null;
 const packers=arr('employees').filter(employeeIsPacker).slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 if(!packers.length){alert('Nenhuma embaladeira está cadastrada. Use “Cadastrar embaladeiras” na tela de Embalagem e marque quem trabalha nessa função.');return}
 const clients=arr('clients').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 const products=arr('products').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 const eo=packers.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||'Embaladeira')+'</option>').join('');
 const co=clients.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||'Cliente')+'</option>').join('');
 const po=products.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||'Produto')+'</option>').join('');
 const oldType=cur?.packagingType==='internal'||cur?.packagingType==='external'?cur.packagingType:'';
 const typeOptions=(cur&&!oldType?'<option value="" selected>Não informado (registro antigo)</option>':'')+'<option value="internal" '+((!cur||oldType==='internal')?'selected':'')+'>Interno</option><option value="external" '+(oldType==='external'?'selected':'')+'>Externo</option>';
 window.openModal?.(cur?'Editar embalagem':'Atribuir para embaladeira','<div class="grid"><div class="field"><label>Tipo</label><select id="opsPackType9425">'+typeOptions+'</select></div><div class="field"><label>Data</label><input id="opsPackDate" type="date" value="'+esc(cur?.date||today())+'"></div><div class="field"><label>Embaladeira</label><select id="opsPackEmp">'+eo+'</select></div><div class="field"><label>Cliente</label><select id="opsPackClient">'+co+'</select></div><div class="field"><label>Modelo</label><select id="opsPackProduct">'+po+'</select></div><div class="field"><label>Tamanho / grade</label><input id="opsPackSize" value="'+esc(cur?.size||'')+'" placeholder="Ex.: M"></div><div class="field"><label>Quantidade enviada</label><input id="opsPackQty" type="number" min="0" value="'+q(cur?.qty)+'"></div><div class="field"><label>Quantidade pronta</label><input id="opsPackDone" type="number" min="0" value="'+q(cur?.doneQty)+'"></div><div class="field"><label>Quantidade de etiquetas</label><input id="opsPackLabelQty" type="number" min="0" value="'+q(cur?.labelQty||cur?.qty)+'"></div></div><div class="field"><label>Observações</label><textarea id="opsPackNotes">'+esc(cur?.notes||'')+'</textarea></div><button type="button" class="primary modalSave">Salvar atribuição</button>',async()=>{
  const type=document.getElementById('opsPackType9425')?.value||'';
  if(!type)return alert('Escolha Interno ou Externo para este registro.');
  const e=packers.find(x=>sid(x.id)===sid(document.getElementById('opsPackEmp')?.value)),c=clients.find(x=>sid(x.id)===sid(document.getElementById('opsPackClient')?.value)),p=products.find(x=>sid(x.id)===sid(document.getElementById('opsPackProduct')?.value));
  if(!e||!c||!p)return alert('Escolha embaladeira, cliente e modelo.');
  const qty=Math.floor(q(document.getElementById('opsPackQty')?.value)),done=Math.floor(q(document.getElementById('opsPackDone')?.value)),labelQty=Math.floor(q(document.getElementById('opsPackLabelQty')?.value)||qty);
  if(done>qty)return alert('Quantidade pronta não pode ser maior que a quantidade enviada.');
  const now=new Date().toISOString(),row={...(cur||{}),id:cur?.id||('pack-'+Date.now()),packagingType:type,date:document.getElementById('opsPackDate')?.value||today(),packerId:e.id,packerName:e.name,clientId:c.id,clientName:c.name,productId:p.id,productName:p.name,size:document.getElementById('opsPackSize')?.value?.trim()||'',qty,doneQty:done,labelQty,notes:document.getElementById('opsPackNotes')?.value?.trim()||'',status:done>=qty&&qty>0?'Concluído':done>0?'Parcial':'Aguardando',updatedAt:now,createdAt:cur?.createdAt||now};
  const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando…'}
  try{await saveRecord('packagingAssignments',row);window.closeModal?.();const nav=document.getElementById('opsPackagingNav9249');if(nav)nav.click();else decoratePackaging();setTimeout(decoratePackaging,0)}catch(err){if(btn){btn.disabled=false;btn.textContent='Salvar atribuição'}alert('Não foi possível salvar: '+sid(err?.message||err))}
 });
 if(cur){const emp=document.getElementById('opsPackEmp'),cli=document.getElementById('opsPackClient'),prod=document.getElementById('opsPackProduct');if(emp&&packers.some(x=>sid(x.id)===sid(cur.packerId)))emp.value=sid(cur.packerId);if(cli)cli.value=sid(cur.clientId);if(prod)prod.value=sid(cur.productId)}
}
function installPackaging(){
 window.editPackaging9249=packagingEditor;
 const nav=document.getElementById('opsPackagingNav9249');
 if(nav&&!nav.__hlgb9425){nav.__hlgb9425=true;nav.addEventListener('click',()=>setTimeout(decoratePackaging,0))}
 if(document.getElementById('embalagem9249')?.classList?.contains('active'))decoratePackaging();
}
function stabilizeAssistant(){
 ensureStyle();
 const input=document.getElementById('hlgbAssistantInput');if(!input)return false;
 const host=input.closest('.hlgb-assistant-input')||input.parentElement;if(!host)return false;
 let buttons=[...host.querySelectorAll('button')].filter(b=>sid(b.getAttribute('onclick')).includes('hlgbAssistantAsk')||['perguntar','enviar pergunta'].includes(norm(b.textContent)));
 let keep=buttons.find(b=>b.id==='hlgbAssistantSend9425')||buttons[0];
 if(!keep){keep=document.createElement('button');keep.type='button';keep.className='primary';keep.onclick=()=>window.hlgbAssistantAsk?.();host.appendChild(keep)}
 keep.id='hlgbAssistantSend9425';keep.textContent='Enviar pergunta';
 buttons=[...host.querySelectorAll('button')].filter(b=>b!==keep&&(sid(b.getAttribute('onclick')).includes('hlgbAssistantAsk')||['perguntar','enviar pergunta'].includes(norm(b.textContent))));
 buttons.forEach(b=>b.remove());
 return true;
}
function installAssistant(){
 const old=window.openHlgbAssistant;
 if(typeof old==='function'&&!old.__hlgb9425){
  const w=function(){const r=old.apply(this,arguments);queueMicrotask(stabilizeAssistant);setTimeout(stabilizeAssistant,60);setTimeout(stabilizeAssistant,250);return r};w.__hlgb9425=true;w.__original=old;window.openHlgbAssistant=w;
 }
 if(!document.__hlgbAssistantClick9425){
  document.__hlgbAssistantClick9425=true;
  document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAssistantNavBtn,#hlgbAssistantFloatingBtn,#hlgbAssistantMobileFab9250,[onclick*="openHlgbAssistant"]')){setTimeout(stabilizeAssistant,0);setTimeout(stabilizeAssistant,180)}},true);
 }
 stabilizeAssistant();
}
function boot(){ensureStyle();installPackaging();installAssistant();window.HLGB_PACKAGING_ASSISTANT_9425=V}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,250),0)}catch(e){}
window.hlgbPackagingAssistant9425={version:V,employeeIsPacker,monthRows,monthlyTotals,decoratePackaging,openPackerManager,packagingEditor,stabilizeAssistant,boot};
console.info('[HLGB] v94.25 Embalagem interna + Assistente estável ativo');
})();
