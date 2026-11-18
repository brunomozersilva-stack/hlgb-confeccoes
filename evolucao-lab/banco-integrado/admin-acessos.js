/* Administração local de identidades fictícias. Não publicar. */
(function(){
 'use strict';
 const byId=id=>document.getElementById(id);
 let running=false,rows=[];
 async function request(url,method='GET',data){
  const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',
   headers:method==='POST'?{'content-type':'application/json','x-hlgb-integrado':'1'}:{},
   ...(method==='POST'?{body:JSON.stringify(data)}:{})});
  const payload=await response.json();
  if(!response.ok||!payload||payload.status==='denied'||payload.status==='uncertain')
   throw Error(payload?.message||'Operação não autorizada. Não repita sem conferir.');
  return payload;
 }
 function notice(message,kind=''){const el=byId('notice');el.textContent=message;el.className=kind;}
 function render(accounts){
  rows=accounts;
  const body=byId('accounts-body');body.replaceChildren();
  for(const account of accounts){
   const tr=document.createElement('tr');
   for(const value of [account.employeeId+' · '+account.actor,account.label,account.active?'Ativa':'Desativada']){
    const td=document.createElement('td');td.textContent=value;tr.append(td);
   }
   const action=document.createElement('td');
   if(account.employeeId!=='LAB-FUN-001'&&account.active){
    const button=document.createElement('button');button.type='button';
    button.textContent='Desativar';button.setAttribute('aria-label','Desativar '+account.employeeId);
    button.dataset.employeeId=account.employeeId;button.disabled=running;action.append(button);
   }else{action.textContent=account.employeeId==='LAB-FUN-001'?'Conta protegida':'Sem acesso';}
   tr.append(action);body.append(tr);
  }
 }
 async function reload(){
  const result=await request('/api/admin/accounts');
  if(result.status!=='ok'||!Array.isArray(result.accounts))throw Error('Lista inválida do banco');
  render(result.accounts);notice('Contas confirmadas no PostgreSQL fictício.');
 }
 async function deactivate(employeeId){
  if(running)return;
  const account=rows.find(x=>x.employeeId===employeeId);
  if(!account||!account.active||employeeId==='LAB-FUN-001')return;
  if(!window.confirm('Desativar '+employeeId+'? Isso bloqueará imediatamente suas sessões fictícias e não pode ser revertido neste laboratório.'))return;
  running=true;render(rows);byId('refresh').disabled=true;
  try{
   const result=await request('/api/admin/deactivate','POST',{employeeId});
   if(!['disabled','already_disabled'].includes(result.status))throw Error('Desativação sem prova');
   await reload();notice('Acesso de '+employeeId+' desativado e conferido no servidor.','success');
  }catch(e){notice('Conferência necessária: '+e.message,'error');}
  finally{running=false;byId('refresh').disabled=false;render(rows);}
 }
 byId('refresh').addEventListener('click',()=>{void reload().catch(e=>notice(e.message,'error'));});
 byId('accounts-body').addEventListener('click',e=>{
  const target=e.target.closest('[data-employee-id]');if(target)void deactivate(target.dataset.employeeId);
 });
 void reload().catch(e=>{notice(e.message,'error');byId('refresh').disabled=true;});
})();