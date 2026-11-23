/* HLGB Comercial v96.21 — triagem conservadora e exclusivamente em memória.
 * Dados de entrada devem vir de leitura autorizada do auditor. Este núcleo
 * NÃO busca ou modifica Supabase, IndexedDB, WAL, pedidos, notas ou pagamentos.
 */
'use strict';
const id=v=>v==null?'':String(v).trim();
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:null;
function snapshot(map,entityId){
 const m=obj(map)||{};return own(m,id(entityId))?obj(m[id(entityId)]):null;
}
function inspectCut(cut,order,products){
 const c=obj(cut),o=obj(order);
 if(!c||!id(c.id)||!id(c.orderId)||!o||id(c.orderId)!==id(o.id))
  return {state:'unverified',reason:'missing-cut-or-order-evidence',action:'review-only'};
 const grade=Array.isArray(o.grade)?o.grade:[];
 const candidateIds=[...new Set(grade.filter(g=>g&&Number(g.qty)>0&&id(g.productId)).map(g=>id(g.productId)))];
 const activeProducts=new Set((Array.isArray(products)?products:[]).filter(p=>p&&!p.deleted_at&&id(p.id)).map(p=>id(p.id)));
 const existing=id(c.productId);
 if(existing&&activeProducts.has(existing))
  return {state:'linked',productId:existing,action:'none'};
 const candidates=candidateIds.filter(v=>activeProducts.has(v));
 return {state:'needs-proof',reason:existing?'invalid-product-id':'missing-product-id',
  candidateProductIds:candidates,uniqueCandidate:candidates.length===1,
  action:'review-only',autoFixAllowed:false};
}
function inspectPaidInvoice(finance,invoiceSnapshots){
 const f=obj(finance);if(!f||!id(f.id)||!id(f.projectionInvoiceId))
  return {state:'unverified',action:'review-only'};
 const snap=snapshot(invoiceSnapshots,f.projectionInvoiceId);
 if(!snap)return {state:'invoice-not-in-snapshot',invoiceId:id(f.projectionInvoiceId),action:'review-only',autoRestoreAllowed:false};
 const deleted=!!(snap.deleted_at||snap.deletedAt);
 return {state:deleted?'invoice-archived':'invoice-active',invoiceId:id(f.projectionInvoiceId),
  revision:snap.revision??null,archivedAt:deleted?id(snap.deleted_at||snap.deletedAt):null,
  action:'review-only',autoRestoreAllowed:false,autoChargeAllowed:false};
}
function inspectWal(rows){
 if(!Array.isArray(rows))throw TypeError('WAL snapshots precisam ser lista');
 const issues=[],seen=new Set(),totals={matched:0,different:0,missing:0,unchecked:0,invalid:0};
 for(const row of rows){
  const r=obj(row);const key=id(r?.module)+'|'+id(r?.entityId)+'|'+id(r?.opId);
  if(!r||!id(r.module)||!id(r.entityId)||!id(r.opId)||seen.has(key)){
   totals.invalid++;issues.push({key,reason:seen.has(key)?'duplicate-identity':'missing-identity'});continue;
  }
  seen.add(key);
  const status=id(r.proofStatus);
  if(!['matched','different','missing','unchecked'].includes(status)){
   totals.invalid++;issues.push({key,reason:'unknown-proof'});continue;
  }
  totals[status]++;
  if(status!=='matched')issues.push({key,reason:status});
 }
 return {totals,issues,complete:totals.invalid===0&&totals.different===0&&
  totals.missing===0&&totals.unchecked===0,canClearAutomatically:false,
  canReplayAutomatically:false,action:'read-only-reconcile'};
}
function inspectScripts(scriptElements,resourceEntries,file){
 if(!Array.isArray(scriptElements)||!Array.isArray(resourceEntries))throw TypeError('Fontes de script inválidas');
 const name=id(file);if(!name)throw TypeError('Arquivo de script obrigatório');
 const filename=v=>id(v).split(/[?#]/)[0].split('/').pop();
 const dom=scriptElements.filter(x=>filename(x?.src)===name).map(x=>({src:id(x.src),injectedBy:id(x.injectedBy)}));
 const network=resourceEntries.filter(x=>filename(x?.name||x?.src)===name).length;
 return {file:name,domCount:dom.length,networkCount:network,dom,
  evidence:dom.length>1?'duplicate-script-tags':network>1?'network-repeat-without-second-tag':'single-or-unverified',
  removeScriptAutomatically:false,action:'trace-loader'};
}
module.exports={inspectCut,inspectPaidInvoice,inspectWal,inspectScripts};
