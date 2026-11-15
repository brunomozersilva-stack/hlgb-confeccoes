'use strict';
(function(){
 const $=id=>document.getElementById(id);
 let role=null,unresolved=null;
 const pinMap={finA:'demo-fin-a',finB:'demo-fin-b',other:'demo-other',
  viewer:'demo-viewer',operation:'demo-operation',inactive:'demo-inactive'};
 async function api(route,method='GET',body){
  const headers=method==='POST'?{'content-type':'application/json','x-hlgb-demo-request':'1'}:{};
  const result=await fetch(route,{method,credentials:'same-origin',headers,
   body:method==='POST'?JSON.stringify(body||{}):undefined});
  let data;
  try{data=await result.json()}catch{throw Error('Resposta inválida do servidor de teste')}
  return {...data,httpStatus:result.status};
 }
 function report(id,data){
  const el=$(id),status=data.status||'erro';
  const fail=data.httpStatus>=400||['denied','rejected','conflict','error','not_found'].includes(status);
  el.className='status'+(fail?' fail':status==='uncertain'?' warn':' ok');
  el.textContent=status+': '+(data.message||data.reason||data.label||(
   data.revision?'Revisão '+data.revision+'. ':''))+
   (data.state?' Situação: '+data.state+'.':'')+
   (data.amountCents?' Total do teste: R$ '+(Number(data.amountCents)/100).toFixed(2).replace('.',',')+'.':'');
 }
 function controls(){
  const canPay=!!role&&['finA','finB','other'].includes(role)&&!unresolved;
  $('upload').disabled=!canPay;
  $('pay').disabled=!canPay;
  $('reconcile').disabled=!unresolved;
  $('load').disabled=!role;
 }
 async function lookup(){
  const result=await api('/api/groups/'+encodeURIComponent($('group').value));
  report('group-status',result);
  if(result.status==='ok')$('revision').value=String(result.revision);
  return result;
 }
 $('role').addEventListener('change',()=>{$('pin').value=pinMap[$('role').value]||''});
 $('group').addEventListener('change',()=>{if(role)lookup().catch(e=>report('group-status',{status:'error',message:e.message}))});
 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  try{
   const selected=$('role').value;
   const result=await api('/api/login','POST',{role:selected,pin:$('pin').value});
   if(result.status==='ok'){role=selected;unresolved=null}
   else role=null;
   report('session-status',result);controls();
   if(role)await lookup();
  }catch(e){report('session-status',{status:'error',message:e.message})}
 });
 $('logout').addEventListener('click',async()=>{
  try{
   const result=await api('/api/logout','POST',{});
   role=null;unresolved=null;$('receipt-link').classList.add('hidden');
   report('session-status',{status:'ok',message:'Sessão fictícia encerrada.'});controls();
   report('group-status',{status:'ok',message:'Sessão encerrada.'});
   return result;
  }catch(e){report('session-status',{status:'error',message:e.message})}
 });
 $('load').addEventListener('click',()=>lookup().catch(e=>report('group-status',{status:'error',message:e.message})));
 $('upload').addEventListener('click',async()=>{
  const file=$('file').files[0];
  if(!file){report('upload-status',{status:'rejected',message:'Escolha um PDF fictício primeiro.'});return}
  if(file.size>512*1024){report('upload-status',{status:'rejected',message:'Arquivo maior que o limite do laboratório.'});return}
  $('upload').disabled=true;
  try{
   const base64=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');
    reader.onerror=()=>reject(Error('Não foi possível ler o PDF.'));
    reader.readAsDataURL(file);
   });
   const id=$('upload-id').value.trim();
   const result=await api('/api/upload','POST',{id,name:file.name,mime:file.type||'application/pdf',base64});
   report('upload-status',result);
   if(result.status==='staged'||result.status==='already_staged'){
    $('receipt-reference').value=id;
    $('receipt-link').href='/api/receipts/'+encodeURIComponent(id);
    $('receipt-link').classList.remove('hidden');
   }
  }catch(e){report('upload-status',{status:'error',message:e.message})}
  finally{controls()}
 });
 $('pay').addEventListener('click',async()=>{
  const commandId=$('command-id').value.trim();
  $('pay').disabled=true;
  try{
   const result=await api('/api/pay','POST',{
    commandId,groupId:$('group').value,revision:Number($('revision').value),
    method:$('method').value,uploadId:$('receipt-reference').value.trim()||null,
    simulateLostAck:$('lost-ack').checked
   });
   if(result.status==='uncertain')unresolved=commandId;
   report('pay-status',result);controls();
   if(result.status==='readback_confirmed'||result.status==='already_committed')await lookup();
  }catch(e){report('pay-status',{status:'error',message:e.message})}
  finally{controls()}
 });
 $('reconcile').addEventListener('click',async()=>{
  if(!unresolved)return;
  try{
   const result=await api('/api/commands/'+encodeURIComponent(unresolved));
   if(result.status==='readback_confirmed'){unresolved=null;await lookup()}
   report('pay-status',result);
  }catch(e){report('pay-status',{status:'error',message:e.message})}
  finally{controls()}
 });
 controls();
})();
