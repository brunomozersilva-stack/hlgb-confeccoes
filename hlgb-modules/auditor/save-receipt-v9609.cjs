'use strict';
/* HLGB v96.09 — contrato PURO para rastrear evidências de salvamento.
 * Não escreve WAL, Supabase ou dados comerciais, não executa retry.
 * Persistir somente IDs técnicos; não incluir salários, pagamentos ou cliente.
 */
const STATES=Object.freeze(['received','local_durable','sent','remote_confirmed','uncertain']);
const clean=s=>String(s??'').trim();
function createReceipt({operationId,module,entityId}){
 if(!clean(operationId)||!clean(module)||!clean(entityId))
   throw new TypeError('IDs de operação, módulo e registro são obrigatórios');
 return Object.freeze({
   operationId:clean(operationId),module:clean(module),entityId:clean(entityId),
   status:'received',steps:Object.freeze(['received']),remoteConfirmed:false,
   safeToRetry:false,requiresReview:false
 });
}
function advance(receipt,event,{remoteReadback=false,sameEntity=false}={}){
 if(!receipt||!STATES.includes(receipt.status))throw new TypeError('recibo inválido');
 if(!STATES.includes(event))throw new TypeError('estado inválido');
 if(receipt.status==='remote_confirmed')
   return receipt;
 if(event==='remote_confirmed'&&!((receipt.status==='sent'||(receipt.status==='uncertain'&&receipt.steps.includes('sent')))&&remoteReadback===true&&sameEntity===true))
   throw new Error('Confirmação exige envio e releitura do mesmo registro');
 if(event==='uncertain'){
   return Object.freeze({...receipt,status:'uncertain',steps:Object.freeze([...receipt.steps,'uncertain']),
    remoteConfirmed:false,safeToRetry:false,requiresReview:true});
 }
 const transitions={
   received:['local_durable'],
   local_durable:['sent'],
   sent:['remote_confirmed'],
   uncertain:['remote_confirmed']
 };
 if(!transitions[receipt.status]?.includes(event))
   throw new Error('Transição de estado não autorizada');
 return Object.freeze({...receipt,status:event,steps:Object.freeze([...receipt.steps,event]),
   remoteConfirmed:event==='remote_confirmed',safeToRetry:false,
   requiresReview:false});
}
function status(receipt){
 if(!receipt||!STATES.includes(receipt.status))return 'invalid';
 if(receipt.remoteConfirmed&&receipt.status==='remote_confirmed')return 'confirmed';
 if(receipt.status==='uncertain')return 'needs_remote_check';
 return 'in_progress';
}
module.exports={STATES,createReceipt,advance,status};
