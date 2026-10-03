/* HLGB v92.50 — compras de funcionários com desconto em folha e baixa de estoque */
(function(){
'use strict';
const V='2026.10.03-employee-purchases-v9250';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const clone=v=>{try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}};
function arr(n){try{db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}catch(e){return []}}
function upsert(module,row){const a=arr(module),i=a.findIndex(x=>sid(x.id)===sid(row.id));if(i>=0)a[i]=clone(row);else a.push(clone(row));try{localSaveOnly()}catch(e){}}
async function saveRow(module,row,deleted=false){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
 const r=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),!!deleted);
 if(!r||r.applied!==true)throw new Error(r?.reason||'A nuvem não confirmou a alteração.');
 if(deleted){const a=arr(module),i=a.findIndex(x=>sid(x.id)===sid(row.id));if(i>=0)a.splice(i,1);return true}
 const v=r.data||row;upsert(module,v);return v;
}
function productStock(product){
 const n=sid(product?.name).trim().toLowerCase(),rows=arr('stock').filter(s=>sid(s.item).trim().toLowerCase()===n&&/pronto|acabado/i.test(s.cat||''));return {rows,qty:rows.reduce((a,s)=>a+q(s.qty),0)};
}
function ensure(){
 const page=document.getElementById('folhaPagamento');if(!page||document.getElementById('employeePurchases9250'))return;
 const p=document.createElement('div');p.id='employeePurchases9250';p.className='panel';
 p.innerHTML='<h2>🛍️ Compras dos funcionários / desconto em folha</h2><div class="sub">Registre as peças retiradas. O estoque é baixado e o valor fica pendente para desconto na folha escolhida.</div><div class="toolbar" style="margin-top:10px"><button class="primary" onclick="newEmployeePurchase9250()">+ Registrar compra</button></div><div id="employeePurchaseCards9250" class="cards"></div><div id="employeePurchaseTable9250"></div>';
 const advance=document.getElementById('advanceSummaryCards')?.closest('.panel');if(advance)advance.insertAdjacentElement('afterend',p);else page.insertBefore(p,page.children[2]||null);render();
}
window.newEmployeePurchase9250=function(){
 const emps=arr('employees').filter(x=>x.active!==false),products=arr('products').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 openModal('Compra de funcionário','<div class="grid"><div class="field"><label>Funcionário</label><select id="empBuyEmp9250"><option value="">Selecione</option>'+emps.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name)+'</option>').join('')+'</select></div><div class="field"><label>Produto</label><select id="empBuyProd9250" onchange="updateEmployeePurchasePreview9250()"><option value="">Selecione</option>'+products.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name)+'</option>').join('')+'</select></div><div class="field"><label>Tamanho</label><input id="empBuySize9250" placeholder="P, M, G..."></div><div class="field"><label>Cor</label><input id="empBuyColor9250"></div><div class="field"><label>Quantidade</label><input id="empBuyQty9250" type="number" min="1" step="1" value="1" oninput="updateEmployeePurchasePreview9250()"></div><div class="field"><label>Preço normal por peça</label><input id="empBuyPrice9250" type="number" min="0" step=".01" oninput="updateEmployeePurchasePreview9250()"></div><div class="field"><label>Desconto concedido no total</label><input id="empBuyDiscount9250" type="number" min="0" step=".01" value="0" oninput="updateEmployeePurchasePreview9250()"></div><div class="field"><label>Valor final manual (opcional)</label><input id="empBuyFinal9250" type="number" min="0" step=".01" oninput="updateEmployeePurchasePreview9250()"></div><div class="field"><label>Folha para desconto</label><input id="empBuyMonth9250" type="month" value="'+today().slice(0,7)+'"></div></div><div id="empBuyPreview9250" class="panel"></div><div class="field"><label>Observação</label><input id="empBuyNote9250"></div><button class="primary modalSave">Confirmar compra e baixar estoque</button>',async()=>{
   const emp=emps.find(x=>sid(x.id)===sid(document.getElementById('empBuyEmp9250')?.value)),prod=products.find(x=>sid(x.id)===sid(document.getElementById('empBuyProd9250')?.value)),qtyv=Math.floor(q(document.getElementById('empBuyQty9250')?.value));if(!emp||!prod||qtyv<=0)return alert('Escolha funcionário, produto e quantidade.');
   const stock=productStock(prod);if(stock.qty<qtyv&&!confirm('O estoque cadastrado deste produto é '+stock.qty+' peça(s), menor que a retirada de '+qtyv+'. Continuar?'))return;
   const unit=q(document.getElementById('empBuyPrice9250')?.value),discount=q(document.getElementById('empBuyDiscount9250')?.value),manual=document.getElementById('empBuyFinal9250')?.value,final=manual!==''?q(manual):Math.max(0,unit*qtyv-discount);
   const row={id:'empbuy-'+Date.now(),employeeId:emp.id,employeeName:emp.name,productId:prod.id,productName:prod.name,size:document.getElementById('empBuySize9250')?.value?.trim()||'',color:document.getElementById('empBuyColor9250')?.value?.trim()||'',qty:qtyv,unitPrice:unit,discount,finalValue:final,remaining:final,payrollMonth:document.getElementById('empBuyMonth9250')?.value||today().slice(0,7),date:today(),status:'Pendente',note:document.getElementById('empBuyNote9250')?.value?.trim()||'',createdAt:new Date().toISOString()};
   try{
     await saveRow('employeePurchases',row);let left=qtyv;
     for(const st of stock.rows){if(left<=0)break;const take=Math.min(left,q(st.qty));await saveRow('stock',{...clone(st),qty:q(st.qty)-take,updatedAt:new Date().toISOString()});left-=take}
     closeModal();render();try{renderStock?.()}catch(e){};try{renderPayroll?.()}catch(e){}
   }catch(e){alert('Não foi possível concluir a compra: '+(e?.message||e))}
 });
 setTimeout(()=>window.updateEmployeePurchasePreview9250(),30);
};
window.updateEmployeePurchasePreview9250=function(){
 const prod=arr('products').find(x=>sid(x.id)===sid(document.getElementById('empBuyProd9250')?.value)),qtyv=Math.floor(q(document.getElementById('empBuyQty9250')?.value)||1),price=document.getElementById('empBuyPrice9250'),box=document.getElementById('empBuyPreview9250');
 if(prod&&price&&price.value==='')price.value=q(prod.price).toFixed(2);
 const unit=q(price?.value),disc=q(document.getElementById('empBuyDiscount9250')?.value),manual=document.getElementById('empBuyFinal9250')?.value,final=manual!==''?q(manual):Math.max(0,unit*qtyv-disc),stock=prod?productStock(prod):{qty:0};
 if(box)box.innerHTML='<b>Estoque disponível:</b> '+stock.qty.toLocaleString('pt-BR')+' peça(s) · <b>Valor normal:</b> '+moneySafe(unit*qtyv)+' · <b>Valor a descontar:</b> '+moneySafe(final);
};

window.postEmployeePurchaseToPayroll9250=async function(id){
 const r=arr('employeePurchases').find(x=>sid(x.id)===sid(id));if(!r||['Quitado','Cancelado'].includes(r.status))return;
 const emp=arr('employees').find(x=>sid(x.id)===sid(r.employeeId));if(!emp)return alert('Funcionário não encontrado.');
 const month=r.payrollMonth||today().slice(0,7),value=q(r.remaining??r.finalValue);if(value<=0)return;
 try{
   if(typeof ensureEmployeePayrollForMonth!=='function')throw new Error('Função da folha não disponível.');
   let payroll=ensureEmployeePayrollForMonth(emp,month);if(!payroll)throw new Error('Não foi possível criar/localizar a folha da competência '+month+'.');
   payroll={...clone(payroll)};payroll.purchaseIds=Array.isArray(payroll.purchaseIds)?payroll.purchaseIds.map(String):[];
   if(payroll.purchaseIds.includes(sid(r.id)))return alert('Esta compra já foi lançada nesta folha.');
   payroll.purchase=q(payroll.purchase)+value;payroll.purchaseIds.push(sid(r.id));payroll.updatedAt=new Date().toISOString();
   const confirmed=await saveRow('payroll',payroll);
   await saveRow('employeePurchases',{...clone(r),remaining:0,discountedValue:q(r.discountedValue)+value,status:'Quitado',postedToPayroll:true,payrollRowId:confirmed.id,payrollMonth:month,postedAt:new Date().toISOString()});
   render();try{renderPayroll?.()}catch(e){};alert('Compra lançada na folha '+month+' como desconto de Compra.');
 }catch(e){alert('Não foi possível lançar na folha: '+(e?.message||e))}
};

window.settleEmployeePurchase9250=async function(id){
 const r=arr('employeePurchases').find(x=>sid(x.id)===sid(id));if(!r)return;const v=prompt('Valor descontado agora:',String(r.remaining??r.finalValue));if(v===null)return;const paid=q(String(v).replace(',','.'));if(paid<=0)return;
 const next={...clone(r),remaining:Math.max(0,q(r.remaining??r.finalValue)-paid),discountedValue:q(r.discountedValue)+paid,updatedAt:new Date().toISOString()};next.status=next.remaining<=0?'Quitado':'Parcial';
 try{await saveRow('employeePurchases',next);render();try{renderPayroll?.()}catch(e){}}catch(e){alert('Falha ao registrar desconto: '+(e?.message||e))}
};
window.cancelEmployeePurchase9250=async function(id){
 const r=arr('employeePurchases').find(x=>sid(x.id)===sid(id));if(!r||!confirm('Cancelar esta compra e devolver as peças ao estoque?'))return;
 const prod=arr('products').find(x=>sid(x.id)===sid(r.productId)),stock=prod?productStock(prod):{rows:[]};
 try{
   await saveRow('employeePurchases',{...clone(r),status:'Cancelado',remaining:0,cancelledAt:new Date().toISOString()});
   if(stock.rows.length){const st=stock.rows[0];await saveRow('stock',{...clone(st),qty:q(st.qty)+q(r.qty),updatedAt:new Date().toISOString()})}
   else if(prod)await saveRow('stock',{id:'stock-'+Date.now(),item:prod.name,cat:'Peças prontas — Pronto para venda',qty:q(r.qty),unit:'un.',min:0,createdAt:new Date().toISOString()});
   render();try{renderStock?.()}catch(e){}
 }catch(e){alert('Falha ao cancelar: '+(e?.message||e))}
};
function render(){
 const c=document.getElementById('employeePurchaseCards9250'),t=document.getElementById('employeePurchaseTable9250');if(!c||!t)return;
 const a=arr('employeePurchases').filter(x=>x.status!=='Cancelado'),pending=a.reduce((s,x)=>s+q(x.remaining??x.finalValue),0),month=today().slice(0,7),monthValue=a.filter(x=>sid(x.payrollMonth)===month).reduce((s,x)=>s+q(x.remaining??x.finalValue),0);
 c.innerHTML='<div class="card"><small>Pendente total</small><strong>'+moneySafe(pending)+'</strong></div><div class="card"><small>Para a folha atual</small><strong>'+moneySafe(monthValue)+'</strong></div><div class="card"><small>Lançamentos</small><strong>'+a.length+'</strong></div>';
 const rs=a.slice().sort((x,y)=>sid(y.date).localeCompare(sid(x.date))).map(x=>[escSafe(x.employeeName),escSafe(x.productName)+(x.size?' · '+escSafe(x.size):'')+(x.color?' · '+escSafe(x.color):''),q(x.qty).toLocaleString('pt-BR'),moneySafe(x.unitPrice),moneySafe(x.discount),moneySafe(x.finalValue),moneySafe(x.remaining??x.finalValue),escSafe(x.payrollMonth||'-'),escSafe(x.status),'<button class="primary" onclick="postEmployeePurchaseToPayroll9250(\''+escSafe(x.id)+'\')">Lançar na folha</button> <button class="secondary" onclick="settleEmployeePurchase9250(\''+escSafe(x.id)+'\')">Abater parcial</button> <button class="danger" onclick="cancelEmployeePurchase9250(\''+escSafe(x.id)+'\')">Cancelar/estornar</button>']);
 t.innerHTML=rs.length?table(['Funcionário','Produto','Qtd.','Preço','Desconto','Valor final','Saldo','Folha','Status','Ações'],rs):'<div class="empty">Nenhuma compra de funcionário cadastrada.</div>';
}
function install(){ensure();const r=window.renderPayroll;if(typeof r==='function'&&!r.__empbuy9250){window.renderPayroll=function(){const x=r.apply(this,arguments);setTimeout(render,0);return x};window.renderPayroll.__empbuy9250=true}}
setTimeout(install,1800);setInterval(ensure,4000);
window.renderEmployeePurchases9250=render;
window.hlgbEmployeePurchases9250={productStock,render};
console.info('[HLGB] '+V+' ativo');
})();