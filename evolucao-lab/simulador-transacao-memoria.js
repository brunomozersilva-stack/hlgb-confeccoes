/* HLGB Evolução · simulador transacional em memória (NÃO grava no HLGB) */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.HLGBTxLabV1=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const cp=x=>JSON.parse(JSON.stringify(x));
const err=(code,message)=>({status:code,message});
function fixture(){
return {groups:{
 "AC-099":{id:"AC-099",factionId:"FAC-FICTICIA",status:"Pago",revision:7,
  lines:[{id:"L-OLD",valueCents:5000,status:"Pago",paidCents:5000,paymentHistory:[{id:"H-OLD",cents:5000}]}],
  adjustments:[],applications:[],corrections:[{id:"CORR-099",kind:"a_mais",amountCents:500,applications:[{id:"APP-ANTERIOR",targetGroupId:"AC-098",cents:200}]}],
  receipts:[{id:"PDF-ANTERIOR",name:"comprovante-antigo.pdf",mime:"application/pdf",size:1024}],history:[{kind:"pago",id:"H-OLD"}]},
 "AC-101":{id:"AC-101",factionId:"FAC-FICTICIA",status:"Pendente",revision:3,
  lines:[{id:"L-1",valueCents:2500,status:"Pendente",paidCents:0,paymentHistory:[]},
         {id:"L-2",valueCents:400,status:"Pendente",paidCents:0,paymentHistory:[]}],
  adjustments:[{id:"AJ-1",kind:"abater",cents:100,reason:"Ajuste fictício"}],
  applications:[],corrections:[],receipts:[],history:[]}
 },hub:[{id:"HUB-AC-099",sourceGroupId:"AC-099",valueCents:5000,status:"Realizado"}],events:[],commands:{}};
}
function total(g){
 let value=g.lines.reduce((a,b)=>a+b.valueCents,0);
 for(const x of g.adjustments)value+=x.kind==='abater'?-x.cents:x.cents;
 for(const x of g.applications)value+=x.kind==='a_mais'?-x.cents:x.cents;
 return value;
}
function validateEnvelope(c){
 if(!c||typeof c!=='object'||Array.isArray(c))throw Error('Comando inválido.');
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(String(c.commandId||'')))throw Error('Identificador de operação inválido.');
 if(c.moduleId!=='acertos'||!['compensate','pay'].includes(c.kind))throw Error('Operação não permitida.');
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(String(c.actorId||'')))throw Error('Responsável fictício inválido.');
 if(c.payloadSchemaVersion!==1||!c.payload||typeof c.payload!=='object')throw Error('Formato do comando inválido.');
}
function receipt(r){
 if(!r)return null;
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(String(r.id||''))||r.mime!=='application/pdf'||!/\.pdf$/i.test(String(r.name||''))||
    !Number.isSafeInteger(r.size)||r.size<=0||r.size>10*1024*1024)
   throw Error('Metadados do PDF inválidos. Nenhum arquivo foi enviado.');
 return {id:r.id,name:String(r.name).slice(0,120),mime:r.mime,size:r.size};
}
function createLab(){
 let state=fixture();
 function snapshot(){return cp(state)}
 function reconcile(commandId){
  const cmd=state.commands[commandId];
  if(!cmd)return {status:"not_found",message:"Não existe confirmação deste ID. Não reenviar automaticamente."};
  const ev=state.events.find(x=>x.commandId===commandId);
  return ev&&cmd.status==='committed'
   ?{status:"readback_confirmed",commandId,revision:cmd.revision,eventId:ev.eventId,kind:cmd.kind}
   :{status:"uncertain",message:"Falta evidência suficiente. Não reenviar."};
 }
 function submit(command,opts={}){
  let key;
  try{
   validateEnvelope(command);key=command.commandId;
   const hash=JSON.stringify(command);
   if(state.commands[key]){
    const saved=state.commands[key];
    if(saved.hash!==hash)return err("rejected","Mesmo ID com conteúdo diferente. Operação bloqueada.");
    return {status:"already_committed",commandId:key,revision:saved.revision,eventId:saved.eventId};
   }
   const p=command.payload,group=state.groups[p.groupId];
   if(!group)return err("rejected","Acerto fictício não encontrado.");
   if(!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision!==group.revision)
    return err("conflict","A revisão do acerto mudou. Releia antes de continuar.");
   const next=cp(state),target=next.groups[p.groupId];
   if(command.kind==='compensate'){
    const source=next.groups[p.sourceGroupId];
    if(!source||source.id===target.id)return err("rejected","Origem da compensação inválida.");
    if(!Number.isSafeInteger(p.expectedSourceRevision)||p.expectedSourceRevision!==source.revision)
      return err("conflict","A revisão da origem mudou. Atualização necessária.");
    if(source.status!=='Pago'||target.status!=='Pendente'||source.factionId!==target.factionId)
      return err("rejected","Origem paga, destino pendente e facção igual são obrigatórios.");
    const correction=source.corrections.find(x=>x.id===p.correctionId);
    if(!correction)return err("rejected","Correção não encontrada.");
    if(!Number.isSafeInteger(p.cents)||p.cents<=0||p.cents>100000000)
      return err("rejected","Valor inválido para compensação.");
    const appId="APP-"+source.id+"-"+correction.id+"-"+target.id;
    if(correction.applications.some(x=>x.id===appId)||target.applications.some(x=>x.id===appId))
      return err("rejected","Correção já aplicada neste destino. Não duplicar.");
    const used=correction.applications.reduce((sum,x)=>sum+x.cents,0);
    if(used+p.cents>correction.amountCents)return err("rejected","Compensação supera o saldo da origem.");
    if(correction.kind==='a_mais'&&p.cents>=total(target))
      return err("rejected","Compensação deixaria o acerto sem saldo positivo.");
    const app={id:appId,sourceGroupId:source.id,correctionId:correction.id,targetGroupId:target.id,kind:correction.kind,cents:p.cents};
    correction.applications.push({id:app.id,targetGroupId:target.id,cents:p.cents});
    target.applications.push(app);
    source.revision++;target.revision++;
    source.history.push({kind:"compensation_source",commandId:key,applicationId:app.id});
    target.history.push({kind:"compensation_target",commandId:key,applicationId:app.id});
   }else{
    if(target.status!=='Pendente')return err("rejected","Acerto já pago ou não elegível.");
    if(next.hub.some(x=>x.sourceGroupId===target.id))
      return err("rejected","Já existe lançamento correspondente no Hub.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date||''))||!["PIX","Transferência","Dinheiro"].includes(p.method))
      return err("rejected","Data ou forma de pagamento inválida.");
    const [yy,mm,dd]=p.date.split('-').map(Number),dt=new Date(Date.UTC(yy,mm-1,dd));
    if(dt.getUTCFullYear()!==yy||dt.getUTCMonth()!==mm-1||dt.getUTCDate()!==dd)
      return err("rejected","Data real inválida.");
    const value=total(target);
    if(!Number.isSafeInteger(value)||value<=0)return err("rejected","Total inválido.");
    let diff=value-target.lines.reduce((a,x)=>a+x.valueCents,0);
    const allocated=target.lines.map(x=>x.valueCents);
    if(diff>=0)allocated[0]+=diff;else{
      let left=-diff;
      for(let i=0;i<allocated.length&&left;i++){let taken=Math.min(allocated[i],left);allocated[i]-=taken;left-=taken;}
      if(left)return err("rejected","Saldo não permite rateio consistente.");
    }
    if(allocated.reduce((a,b)=>a+b,0)!==value)return err("rejected","Rateio inconsistente.");
    const proof=receipt(p.receipt);
    if(proof){
      if(target.receipts.some(x=>x.id===proof.id))return err("rejected","Comprovante já anexado.");
      target.receipts.push(proof);
    }
    for(let i=0;i<target.lines.length;i++){
      const line=target.lines[i];
      line.status="Pago";line.paidCents=allocated[i];
      line.paymentHistory.push({id:"PAID-"+target.id+"-"+line.id,cents:allocated[i],date:p.date,method:p.method});
    }
    target.status="Pago";target.revision++;
    target.history.push({kind:"paid",commandId:key,amountCents:value,method:p.method,date:p.date,receiptId:proof?.id||null});
    next.hub.push({id:"HUB-"+target.id,sourceGroupId:target.id,status:"Realizado",valueCents:value,date:p.date,method:p.method});
   }
   if(opts.failureAt==='before_commit')return err("rejected","Falha fictícia antes da transação: nada foi modificado.");
   const eventId="EVENT-"+key,revision=target.revision;
   next.events.push({eventId,commandId:key,kind:command.kind,groupId:target.id,actorId:command.actorId});
   next.commands[key]={hash,kind:command.kind,status:"committed",revision,eventId};
   state=next; // única troca de estado: nenhuma linha ou Hub fica parcialmente atualizado
   if(opts.failureAt==='after_commit_before_ack')
    return {status:"uncertain",commandId:key,message:"Gravação simulada ocorreu, mas o retorno foi perdido. Reconciliar antes de qualquer nova ação."};
   return {status:"readback_confirmed",commandId:key,revision,eventId};
  }catch(e){return err("rejected",String(e.message||e))}
 }
 return Object.freeze({snapshot,submit,reconcile});
}
return Object.freeze({createLab,fixture,total});
});
