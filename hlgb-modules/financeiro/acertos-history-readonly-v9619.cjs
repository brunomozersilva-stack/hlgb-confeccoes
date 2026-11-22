/* HLGB Comercial v96.19 — índice de histórico de Acertos, puro e read-only.
 * NÃO é carregado no ERP comercial. Recebe apenas registros NORMALIZADOS
 * pelos adaptadores futuros; nunca acessa banco, DOM, WAL nem finanças.
 */
'use strict';
const sid=v=>String(v??'').trim();
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(sid(v))?sid(v):'';
const whole=v=>Number.isSafeInteger(v)&&v>=0;
const categories=new Set(['faccao','cliente','funcionario']);
function summarize(input,filters={}){
 if(!Array.isArray(input))throw Error('A fonte de histórico precisa ser uma lista.');
 const seen=new Set(),errors=[],rows=[];
 for(const raw of input){
  const r=raw&&typeof raw==='object'?raw:{};
  const kind=sid(r.kind),ownerId=sid(r.ownerId),entryId=sid(r.entryId);
  const key=kind+':'+entryId;
  if(!categories.has(kind)||!ownerId||!entryId||!date(r.date)){
   errors.push({entryId,reason:'identidade-ou-data-incompleta'});continue;
  }
  if(seen.has(key)){errors.push({entryId,reason:'id-duplicado'});continue}
  seen.add(key);
  if(!whole(r.totalCents)||!whole(r.paidCents)||!whole(r.creditCents)||r.paidCents+r.creditCents>r.totalCents){
   errors.push({entryId,reason:'valores-inconsistentes'});continue;
  }
  const row={kind,ownerId,entryId,date:r.date,totalCents:r.totalCents,
   paidCents:r.paidCents,creditCents:r.creditCents,
   balanceCents:r.totalCents-r.paidCents-r.creditCents,
   status:sid(r.status),documentId:sid(r.documentId)};
  if(filters.kind&&row.kind!==filters.kind)continue;
  if(filters.ownerId&&row.ownerId!==sid(filters.ownerId))continue;
  if(filters.from&&row.date<filters.from)continue;
  if(filters.to&&row.date>filters.to)continue;
  rows.push(row);
 }
 const groupMap=new Map();
 for(const r of rows){
  const key=JSON.stringify([r.kind,r.ownerId,r.date]);
  const g=groupMap.get(key)||{kind:r.kind,ownerId:r.ownerId,date:r.date,
   count:0,totalCents:0,paidCents:0,creditCents:0,balanceCents:0};
  g.count++;
  for(const field of ['totalCents','paidCents','creditCents','balanceCents'])g[field]+=r[field];
  groupMap.set(key,g);
 }
 const compare=(a,b)=>a.date.localeCompare(b.date)||a.kind.localeCompare(b.kind)||
  a.ownerId.localeCompare(b.ownerId)||sid(a.entryId).localeCompare(sid(b.entryId));
 return {details:rows.sort(compare),groups:[...groupMap.values()].sort(compare),
  errors,complete:errors.length===0};
}
if(typeof module!=='undefined'&&module.exports)module.exports={summarize};
