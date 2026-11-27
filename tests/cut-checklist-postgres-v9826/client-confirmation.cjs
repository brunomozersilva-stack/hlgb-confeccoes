'use strict';
// Candidate client contract: dependency-injected transport; not loaded by commercial application.
// Never reports "saved" until exact independent readback; no localStorage or operational writes.
const equal=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b));
function canon(v){return Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v}
const clone=v=>JSON.parse(JSON.stringify(v));
function identity(x,y){return ['cutId','orderId','productId'].every(k=>typeof x?.[k]==='string'&&x[k]&&x[k]===y?.[k])}
function request(source,version,requestId,draft){
 if(!identity(source,source)||!source.revisions||!Array.isArray(source.lines)||!Number.isSafeInteger(version)||version<0||typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(requestId)||typeof draft?.responsible!=='string'||!draft.responsible.trim()||draft.responsible.length>120||typeof draft.note!=='string'||draft.note.length>500||!Array.isArray(draft.lines)||draft.lines.length!==source.lines.length)throw Error('invalid-request');
 const lines=new Map(draft.lines.map(l=>[l.key,l]));
 if(lines.size!==source.lines.length||new Set(source.lines.map(l=>l.key)).size!==source.lines.length)throw Error('line-count');
 const payload={responsible:draft.responsible,note:draft.note,lines:source.lines.map(s=>{
  const l=lines.get(s.key);
  if(!l||typeof l.checked!=='boolean'||typeof l.note!=='string'||l.note.length>250||!(l.actual===null||typeof l.actual==='number'&&Number.isFinite(l.actual)&&l.actual>=0&&l.actual<=1e8&&Math.abs(l.actual*1e6-Math.round(l.actual*1e6))<0.01)||l.checked&&(l.actual===null||s.required===null))throw Error('invalid-line');
  return {key:s.key,actual:l.actual,checked:l.checked,note:l.note};
 })};
 return clone({cutId:source.cutId,orderId:source.orderId,productId:source.productId,revisions:source.revisions,expectedVersion:version,requestId,payload});
}
function verify(ack,req,source){
 if(!identity(ack,req)||ack.requestId!==req.requestId||ack.version!==req.expectedVersion+1||!equal(ack.revisions,req.revisions)||ack.officialSeparationChanged!==false||ack.responsible!==req.payload.responsible||ack.note!==req.payload.note||!Array.isArray(ack.lines)||ack.lines.length!==req.payload.lines.length)return false;
 const keys=new Set();
 return ack.lines.every(l=>{
  const p=req.payload.lines.find(x=>x.key===l.key),s=source.lines.find(x=>x.key===l.key);
  if(keys.has(l.key)||!p||!s)return false;keys.add(l.key);
  const shortage=p.actual===null||s.required===null?null:Math.max(0,s.required-p.actual);
  return Object.entries(s).every(([k,v])=>equal(l[k],v))&&l.actual===p.actual&&l.checked===p.checked&&l.note===p.note&&(shortage===null?l.shortage===null:typeof l.shortage==='number'&&Math.abs(l.shortage-shortage)<1e-6);
 });
}
async function confirm({transport,source,req,stillCurrent}){
 // Caller owns a stable request ID for retry, and supplies auth/selection guard.
 if(!identity(source,req)||!equal(source.revisions,req.revisions)||typeof stillCurrent!=='function'||!stillCurrent())return {state:'stale'};
 const immutable=clone(req),snapshot=clone(source);
 try{
  const ack=await transport.save(clone(immutable));
  if(!stillCurrent())return {state:'stale'};
  if(!verify(ack,immutable,snapshot))return {state:'unconfirmed',reason:'ack-mismatch'};
  const read=await transport.read({cutId:immutable.cutId,orderId:immutable.orderId,productId:immutable.productId,version:ack.version});
  if(!stillCurrent())return {state:'stale'};
  if(!read||!equal(read.source,snapshot)||!equal(read.result,ack)||!verify(read.result,immutable,snapshot))return {state:'unconfirmed',reason:'readback-mismatch'};
  return {state:'confirmed',record:clone(read)};
 }catch(e){return {state:'unconfirmed',reason:'transport',retryRequest:immutable};}
}
const api={request,confirm,verify};if(typeof module==='object'&&module.exports)module.exports=api;else window.HLGBChecklistConfirmation9835=api;
