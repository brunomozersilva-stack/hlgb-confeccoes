'use strict';
// Candidate client verification, never a write transport on its own.
function stable(v){return Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v}
const eq=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function verify(req,ack,read){
 if(!req||!ack||!read||!eq(ack,read.receipt)||read.clientId!==req.clientId||ack.ref!==req.ref||ack.noteId!==req.noteId||ack.titleId!==req.titleId||ack.forecastId!==req.forecastId)return 'unconfirmed';
 if(!['return','reverse'].includes(req.kind)||!Number.isSafeInteger(req.amountCents)||req.amountCents<=0||!Number.isSafeInteger(req.balanceBefore)||req.balanceBefore<0||!Number.isSafeInteger(req.cashCents)||req.cashCents<0||!Array.isArray(req.items)||!req.items.length)return 'unconfirmed';
 if(ack.amountCents!==req.amountCents||ack.cashCents!==req.cashCents||ack.remainingCents!==req.balanceBefore+(req.kind==='reverse'?req.amountCents:-req.amountCents)||ack.remainingCents<0||!eq(ack.items,req.items)||!eq(read.event?.itemsV9847,req.items)||!Number.isFinite(Number(read.event?.value))||Math.round(Number(read.event.value)*100)!==req.amountCents)return 'unconfirmed';
 const keys=['noteRevision','titleRevision','forecastRevision'];
 if(keys.some(k=>!Number.isSafeInteger(req[k])||req[k]<1||ack[k]!==req[k]+1))return 'unconfirmed';
 if(req.kind==='reverse'?(ack.reversedEvent!==req.eventId||read.event.id!==req.eventId||read.event.reversalReference9849!==req.ref||!read.event.reversedAt):(ack.reversedEvent!=null||read.event.id!=='item-return:'+req.ref))return 'unconfirmed';
 if(!Array.isArray(read.currentRevisions)||read.currentRevisions.length!==3||read.currentRevisions.some((v,i)=>!Number.isSafeInteger(v)||v<ack[keys[i]]))return 'unconfirmed';
 const same=keys.every((k,i)=>read.currentRevisions[i]===ack[k]);
 if(read.currentMatch===true&&same&&(req.kind==='reverse'||!read.event.reversedAt))return 'confirmed';
 if(read.currentMatch===false&&!same)return 'confirmed-history-refresh';
 return 'unconfirmed';
}
async function confirm(req,transport,stillCurrent){
 const pending=()=>({state:'unconfirmed',reference:req.ref,retrySameReference:true});
 try{if(stillCurrent()!==true)return pending();const ack=await transport.save(req);if(stillCurrent()!==true)return pending();const read=await transport.read(req.clientId,req.noteId,req.ref);if(stillCurrent()!==true)return pending();const state=verify(req,ack,read);return state==='unconfirmed'?pending():{state,reference:req.ref,receipt:ack,refreshRequired:true,retrySameReference:false}}catch(_){return pending()}
}
module.exports={verify,confirm};
