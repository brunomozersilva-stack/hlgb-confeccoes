/* HLGB v92.50 — dívidas e exposição com fornecedores */
(function(){
'use strict';
const V='2026.10.03-supplier-debts-v9250';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const clone=v=>{try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}};
function arr(n){try{db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}catch(e){return []}}
function upsert(module,row){const a=arr(module),i=a.findIndex(x=>sid(x?.id)===sid(row?.id));if(i>=0)a[i]=clone(row);else a.push(clone(row));try{localSaveOnly()}catch(e){}}
async function saveRow(module,row,deleted=false){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
 const r=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),!!deleted);
 if(!r||r.applied!==true)throw new Error(r?.reason||'A nuvem não confirmou a alteração.');
 if(deleted){const a=arr(module),i=a.findIndex(x=>sid(x.id)===sid(row.id));if(i>=0)a.splice(i,1);return true}
 const v=r.data||row;upsert(module,v);return v;
}
function balance(d){
 let b=q(d.originalValue);for(const t of arr('supplierDebtTransactions').filter(x=>sid(x.debtId)===sid(d.id)&&x.status!=='Cancelado')){if(t.type==='Pagamento'||t.type==='Abatimento')b-=q(t.value);else if(t.type==='Juros'||t.type==='Acréscimo')b+=q(t.value);else if(t.type==='Ajuste')b+=Number(t.signedValue??t.value??0)}return Math.max(0,b);
}
function openPurchase(p){if(String(p.status||'')==='Pago')return 0;return Math.max(0,q(p.total)-q(p.paid||p.paidAmount))}
function stats(){
 const debts=arr('supplierDebts').filter(x=>x.active!==false),debtBalance=debts.reduce((a,d)=>a+balance(d),0),openPurchases=arr('purchases').reduce((a,p)=>a+openPurchase(p),0),overdue=arr('purchases').filter(p=>openPurchase(p)>0&&p.dueDate&&p.dueDate<today()).reduce((a,p)=>a+openPurchase(p),0);
 return {debtBalance,openPurchases,overdue,current:Math.max(0,openPurchases-overdue),totalExposure:debtBalance+openPurchases};
}
function ensure(){
 const page=document.getElementById('hubFinanceiro');if(!page||document.getElementById('supplierDebtPanel9250'))return;
 const p=document.createElement('div');p.id='supplierDebtPanel9250';p.className='panel';
 p.innerHTML='<h2>📉 Dívidas e exposição com fornecedores</h2><div class="sub">Separe dívida antiga vencida de notas normais em aberto e acompanhe se o total está aumentando ou diminuindo.</div><div class="toolbar" style="margin-top:10px"><button class="primary" onclick="newSupplierDebt9250()">+ Cadastrar dívida</button><button class="secondary" onclick="newSupplierDebtTransaction9250()">+ Pagamento / juros / abatimento</button><span class="sub">Pagamento lançado aqui também entra no Financeiro como pago.</span></div><div id="supplierDebtCards9250" class="cards"></div><div id="supplierDebtTable9250"></div><div id="supplierDebtEvolution9250" style="margin-top:14px"></div>';
 page.insertBefore(p,page.children[2]||null);render();
}
window.newSupplierDebt9250=function(){
 const sups=arr('suppliers').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 openModal('Cadastrar dívida antiga com fornecedor','<div class="grid"><div class="field"><label>Fornecedor</label><select id="debtSup9250"><option value="">Selecione</option>'+sups.map(s=>'<option value="'+escSafe(s.id)+'">'+escSafe(s.name)+'</option>').join('')+'</select></div><div class="field"><label>Valor inicial</label><input id="debtValue9250" type="number" min="0" step=".01"></div><div class="field"><label>Data de referência</label><input id="debtDate9250" type="date" value="'+today()+'"></div></div><div class="field"><label>Observação</label><textarea id="debtNote9250"></textarea></div><button class="primary modalSave">Salvar dívida</button>',async()=>{
   const sup=sups.find(x=>sid(x.id)===sid(document.getElementById('debtSup9250')?.value)),value=q(document.getElementById('debtValue9250')?.value);if(!sup||value<=0)return alert('Escolha o fornecedor e informe o valor.');
   const row={id:'debt-'+Date.now(),supplierId:sup.id,supplierName:sup.name,originalValue:value,startDate:document.getElementById('debtDate9250')?.value||today(),notes:document.getElementById('debtNote9250')?.value?.trim()||'',active:true,createdAt:new Date().toISOString()};
   try{await saveRow('supplierDebts',row);closeModal();render()}catch(e){alert('Não foi possível salvar: '+(e?.message||e))}
 });
};
window.newSupplierDebtTransaction9250=function(debtId){
 const debts=arr('supplierDebts').filter(x=>x.active!==false);if(!debts.length)return alert('Cadastre uma dívida primeiro.');
 openModal('Movimentar dívida','<div class="grid"><div class="field"><label>Dívida</label><select id="debtTxDebt9250">'+debts.map(d=>'<option value="'+escSafe(d.id)+'" '+(sid(d.id)===sid(debtId)?'selected':'')+'>'+escSafe(d.supplierName)+' — '+moneySafe(balance(d))+'</option>').join('')+'</select></div><div class="field"><label>Tipo</label><select id="debtTxType9250"><option>Pagamento</option><option>Juros</option><option>Acréscimo</option><option>Abatimento</option></select></div><div class="field"><label>Valor</label><input id="debtTxValue9250" type="number" min="0" step=".01"></div><div class="field"><label>Data</label><input id="debtTxDate9250" type="date" value="'+today()+'"></div></div><div class="field"><label>Observação</label><input id="debtTxNote9250"></div><button class="primary modalSave">Salvar movimentação</button>',async()=>{
   const d=debts.find(x=>sid(x.id)===sid(document.getElementById('debtTxDebt9250')?.value)),value=q(document.getElementById('debtTxValue9250')?.value),type=document.getElementById('debtTxType9250')?.value;if(!d||value<=0)return alert('Informe a dívida e o valor.');
   const row={id:'debttx-'+Date.now(),debtId:d.id,supplierId:d.supplierId,supplierName:d.supplierName,type,value,date:document.getElementById('debtTxDate9250')?.value||today(),note:document.getElementById('debtTxNote9250')?.value?.trim()||'',createdAt:new Date().toISOString()};
   try{await saveRow('supplierDebtTransactions',row);if(type==='Pagamento'){await saveRow('finance',{id:'debtpay-'+Date.now(),type:'Pagar',desc:'Pagamento de dívida — '+d.supplierName,value,status:'Pago',paid:value,remaining:0,date:row.date,dueDate:row.date,paymentDate:row.date,supplierId:d.supplierId,supplierName:d.supplierName,sourceDebtId:d.id,sourceDebtTransactionId:row.id,createdAt:new Date().toISOString()})}closeModal();render();try{renderFinance?.()}catch(_){}}catch(e){alert('Não foi possível salvar: '+(e?.message||e))}
 });
};
function render(){
 const c=document.getElementById('supplierDebtCards9250'),t=document.getElementById('supplierDebtTable9250'),e=document.getElementById('supplierDebtEvolution9250');if(!c||!t)return;
 const st=stats(),month=today().slice(0,7),tx=arr('supplierDebtTransactions').filter(x=>sid(x.date).slice(0,7)===month),paid=tx.filter(x=>x.type==='Pagamento'||x.type==='Abatimento').reduce((a,x)=>a+q(x.value),0),inc=tx.filter(x=>x.type==='Juros'||x.type==='Acréscimo').reduce((a,x)=>a+q(x.value),0);
 const netDebtMonth=inc-paid,trend=netDebtMonth>0?'🔺 Aumentou':netDebtMonth<0?'🔻 Diminuiu':'➖ Estável';
 c.innerHTML='<div class="card"><small>Dívida antiga</small><strong>'+moneySafe(st.debtBalance)+'</strong></div><div class="card"><small>Notas abertas</small><strong>'+moneySafe(st.openPurchases)+'</strong></div><div class="card"><small>Total exposto</small><strong>'+moneySafe(st.totalExposure)+'</strong></div><div class="card"><small>Vencido em notas</small><strong>'+moneySafe(st.overdue)+'</strong></div><div class="card"><small>Pago/abatido no mês</small><strong>'+moneySafe(paid)+'</strong></div><div class="card"><small>Juros no mês</small><strong>'+moneySafe(inc)+'</strong></div><div class="card"><small>Movimento dívida antiga no mês</small><strong style="font-size:18px">'+trend+' '+moneySafe(Math.abs(netDebtMonth))+'</strong></div>';
 const rs=arr('supplierDebts').filter(x=>x.active!==false).map(d=>{const hist=arr('supplierDebtTransactions').filter(x=>sid(x.debtId)===sid(d.id)),pd=hist.filter(x=>x.type==='Pagamento'||x.type==='Abatimento').reduce((a,x)=>a+q(x.value),0),ac=hist.filter(x=>x.type==='Juros'||x.type==='Acréscimo').reduce((a,x)=>a+q(x.value),0);return [escSafe(d.supplierName),moneySafe(d.originalValue),moneySafe(ac),moneySafe(pd),'<b>'+moneySafe(balance(d))+'</b>',escSafe(d.startDate||'-'),'<button class="secondary" onclick="newSupplierDebtTransaction9250(\''+escSafe(d.id)+'\')">Movimentar</button>']});
 t.innerHTML=rs.length?table(['Fornecedor','Dívida inicial','Juros/acréscimos','Pago/abatido','Saldo atual','Desde','Ação'],rs):'<div class="empty">Nenhuma dívida antiga cadastrada.</div>';
 if(e){const months={};for(const x of arr('supplierDebtTransactions')){const m=sid(x.date).slice(0,7);if(!m)continue;if(!months[m])months[m]={paid:0,inc:0,purchases:0};if(x.type==='Pagamento'||x.type==='Abatimento')months[m].paid+=q(x.value);if(x.type==='Juros'||x.type==='Acréscimo')months[m].inc+=q(x.value)}for(const p of arr('purchases')){const m=sid(p.date).slice(0,7);if(!m)continue;if(!months[m])months[m]={paid:0,inc:0,purchases:0};months[m].purchases+=q(p.total)}const mr=Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12).map(([m,d])=>[m,moneySafe(d.purchases),moneySafe(d.paid),moneySafe(d.inc)]);e.innerHTML='<h3>Evolução mensal</h3>'+(mr.length?table(['Mês','Novas compras','Pagamento dívida','Juros/acréscimos'],mr):'<div class="empty">Sem movimentações.</div>')}
}
function install(){ensure();const h=window.renderHubFinance;if(typeof h==='function'&&!h.__debt9250){window.renderHubFinance=function(){const r=h.apply(this,arguments);setTimeout(render,0);return r};window.renderHubFinance.__debt9250=true}}
setTimeout(install,1800);setInterval(ensure,4000);
window.renderSupplierDebt9250=render;
window.hlgbSupplierDebts9250={stats,balance,render};
console.info('[HLGB] '+V+' ativo');
})();