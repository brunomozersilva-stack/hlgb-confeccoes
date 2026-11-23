/* HLGB Comercial v96.19 — índice de histórico de Acertos, puro e read-only.
 * NÃO é carregado no ERP comercial. Recebe apenas registros NORMALIZADOS
 * pelos adaptadores futuros; nunca acessa banco, DOM, WAL nem finanças.
 */
'use strict';
const sid=v=>String(v??'').trim();
const date=v=>{
 const s=sid(v); if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';
 const [y,m,d]=s.split('-').map(Number);
 const dt=new Date(Date.UTC(y,m-1,d));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===m&&dt.getUTCDate()===d?s:'';
};
const whole=v=>Number.isSafeInteger(v)&&v>=0;
const categories=new Set(['faccao','cliente','funcionario']);
function summarize(input,filters={}){
 if(!Array.isArray(input))throw Error('A fonte de histórico precisa ser uma lista.');
 if(filters===null||typeof filters!=='object'||Array.isArray(filters))throw Error('Filtros inválidos.');
 for(const key of ['from','to']){
  if(filters[key]!=null&&filters[key]!==''&&!date(filters[key]))throw Error('Data do filtro inválida: '+key);
 }
 if(filters.from&&filters.to&&filters.from>filters.to)throw Error('Período invertido.');
 if(filters.kind&&!categories.has(sid(filters.kind)))throw Error('Tipo de vínculo inválido.');
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
  if(!whole(r.totalCents)||!whole(r.paidCents)||!whole(r.creditCents)||
    !Number.isSafeInteger(r.paidCents+r.creditCents)||r.paidCents+r.creditCents>r.totalCents){
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
  const keys=['totalCents','paidCents','creditCents','balanceCents'];
  if(!Number.isSafeInteger(g.count+1)||keys.some(field=>!Number.isSafeInteger(g[field]+r[field]))){
   errors.push({entryId:r.entryId,reason:'total-do-grupo-excede-limite-seguro'});
   continue;
  }
  g.count++;
  for(const field of keys)g[field]+=r[field];
  groupMap.set(key,g);
 }
 const compare=(a,b)=>a.date.localeCompare(b.date)||a.kind.localeCompare(b.kind)||
  a.ownerId.localeCompare(b.ownerId)||sid(a.entryId).localeCompare(sid(b.entryId));
 const excluded=new Set(errors.filter(x=>x.reason==='total-do-grupo-excede-limite-seguro').map(x=>x.entryId));
 return {details:rows.filter(x=>!excluded.has(x.entryId)).sort(compare),
  groups:[...groupMap.values()].sort(compare),
  errors,complete:errors.length===0};
}
if(typeof module!=='undefined'&&module.exports)module.exports={summarize};
