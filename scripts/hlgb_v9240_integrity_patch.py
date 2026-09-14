from pathlib import Path

src = Path('app9239.html')
out = Path('app9240.html')
s = src.read_text(encoding='utf-8').replace('v92.39', 'v92.40')

addon = r'''<!-- HLGB_V9240_WORKFLOW_INTEGRITY_START -->
<script>
(function(){
'use strict';
const V='92.40';
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const sid=v=>String(v??'');

function gradeProductIds(c){
  const ids=new Set();
  if(c?.productId!=null&&sid(c.productId))ids.add(sid(c.productId));
  for(const list of [c?.actualCutGrade,c?.originalGrade,c?.grade]){
    if(!Array.isArray(list))continue;
    for(const g of list){if(g?.productId!=null&&(+g?.qty||0)>0)ids.add(sid(g.productId));}
  }
  return ids;
}
function sameCutProduct(a,b){
  const aa=gradeProductIds(a),bb=gradeProductIds(b);
  if(aa.size&&bb.size){for(const x of aa)if(bb.has(x))return true;return false;}
  const ap=norm(a?.product),bp=norm(b?.product);
  return !!ap&&!!bp&&ap===bp;
}
function finalizedTwin(c){
  if(!c||!c.orderId)return null;
  return (db?.cuts||[]).find(x=>sid(x?.id)!==sid(c?.id)&&sid(x?.orderId)===sid(c.orderId)&&norm(x?.status)==='finalizado'&&sameCutProduct(x,c))||null;
}
function locationForOrder(o,pid){
  if(!o)return null;
  const item=o.projectionItems?.[sid(pid)]||o.projectionItems?.[pid]||{};
  let id=item?.locationId||o.productionLocationId||null;
  if(!id){
    const a=(db.capacityAssignments||[]).find(x=>sid(x?.orderId)===sid(o.id)&&(!pid||!x?.productId||sid(x?.productId)===sid(pid))&&x?.locationId);
    id=a?.locationId||null;
  }
  if(!id){
    const m=(db.materialChecklists||[]).find(x=>sid(x?.orderId)===sid(o.id)&&(x?.productionLocationId||x?.destinationId));
    id=m?.productionLocationId||m?.destinationId||null;
  }
  if(!id){
    const p=(db.production||[]).find(x=>sid(x?.orderId)===sid(o.id)&&(!pid||!x?.productId||sid(x.productId)===sid(pid))&&x?.productionLocationId);
    id=p?.productionLocationId||null;
  }
  return id||null;
}
function hydrateLocationsLocal(){
  try{
    for(const o of (db.orders||[])){
      if(!o||!o.projectionItems||typeof o.projectionItems!=='object')continue;
      for(const key of Object.keys(o.projectionItems)){
        const it=o.projectionItems[key];if(!it||typeof it!=='object'||it.locationId)continue;
        const loc=locationForOrder(o,key);if(loc)it.locationId=loc;
      }
      if(!o.productionLocationId){
        const first=Object.values(o.projectionItems||{}).find(it=>it&&typeof it==='object'&&it.locationId);
        const loc=first?.locationId||locationForOrder(o,null);if(loc)o.productionLocationId=loc;
      }
    }
    for(const p of (db.production||[])){
      if(p?.productionLocationId||!p?.orderId)continue;
      const o=(db.orders||[]).find(x=>sid(x?.id)===sid(p.orderId));
      const loc=locationForOrder(o,p?.productId);if(loc)p.productionLocationId=loc;
    }
  }catch(e){console.warn('[HLGB '+V+'] hydrate location',e)}
}
function removeLocalDuplicate(c){
  try{
    const arr=db.cuts||[];
    const i=arr.findIndex(x=>sid(x?.id)===sid(c?.id));
    if(i>=0)arr.splice(i,1);
    try{localSaveOnly()}catch(e){}
  }catch(e){}
}
function reconcileLocalCuts(){
  try{
    const pending=(db.cuts||[]).filter(c=>c?.autoOrderCutV9203===true&&norm(c?.status)!=='finalizado');
    let changed=false;
    for(const c of pending){if(finalizedTwin(c)){const i=(db.cuts||[]).findIndex(x=>sid(x?.id)===sid(c.id));if(i>=0){db.cuts.splice(i,1);changed=true;}}}
    if(changed){try{localSaveOnly()}catch(e){};try{renderCuts?.()}catch(e){}}
  }catch(e){console.warn('[HLGB '+V+'] reconcile cuts',e)}
}

/* Status da projeção: considera productId dentro das grades do corte. */
window.cutStatus9179=function(productId,orderId){
  const pid=sid(productId),oid=sid(orderId);
  const order=(db.orders||[]).find(o=>sid(o?.id)===oid);
  const pitems=order?.projectionItems||{},pmeta=pitems[pid]||pitems[productId]||{};
  const sourceOrderId=pmeta?.sourceOrderId||order?.workflowSourceOrderId||null;
  const isFinal=v=>norm(v).includes('finalizado');
  if(order&&(isFinal(order.cutStatus)||isFinal(order.status)||order.workflowStageReconciled===true))return {text:'✓ Já cortado',cls:'done'};
  const linked=new Set([oid,sid(sourceOrderId)].filter(Boolean));
  const cuts=(db.cuts||[]).filter(c=>linked.has(sid(c?.orderId))&&(!pid||gradeProductIds(c).has(pid)||sid(c?.productId)===pid));
  if(cuts.some(c=>norm(c.status)==='finalizado'))return {text:'✓ Já cortado',cls:'done'};
  if(sourceOrderId)return {text:'✓ Já cortado',cls:'done'};
  if(cuts.some(c=>c?.plannedCutDate||c?.cutterId||norm(c?.status)==='planejado'))return {text:'Programado / a cortar',cls:'pending'};
  return {text:'Ainda não cortado',cls:'none'};
};

function patchRecordSaver(){
  const current=window.hlgbRecordSaveWithRetry;
  if(typeof current!=='function'||current.__hlgb9240)return false;
  const original=current;
  const wrapped=async function(module,id,data,deleted){
    let payload=data;
    try{
      if(module==='cuts'&&!deleted&&payload&&payload.autoOrderCutV9203===true&&norm(payload.status)!=='finalizado'){
        const final=finalizedTwin(payload);
        if(final){
          console.warn('[HLGB '+V+'] corte duplicado bloqueado',id,'final existente',final.id);
          setTimeout(()=>removeLocalDuplicate(payload),0);
          return {applied:true,data:clone(payload),blockedDuplicate:true,finalCutId:final.id};
        }
      }
      if(module==='orders'&&!deleted&&payload){
        const cur=(db.orders||[]).find(x=>sid(x?.id)===sid(id));
        if(cur){
          payload=clone(payload);
          const oldItems=(cur.projectionItems&&typeof cur.projectionItems==='object')?cur.projectionItems:{};
          const newItems=(payload.projectionItems&&typeof payload.projectionItems==='object')?payload.projectionItems:{};
          const merged={...clone(oldItems)};
          for(const k of Object.keys(newItems))merged[k]={...(merged[k]||{}),...(newItems[k]||{})};
          payload.projectionItems=merged;
          for(const k of Object.keys(payload.projectionItems||{})){
            const it=payload.projectionItems[k];
            if(it&&typeof it==='object'&&!it.locationId){const loc=locationForOrder({...cur,...payload},k);if(loc)it.locationId=loc;}
          }
          if(!payload.productionLocationId){
            const first=Object.values(payload.projectionItems||{}).find(it=>it&&typeof it==='object'&&it.locationId);
            const loc=cur.productionLocationId||first?.locationId||locationForOrder({...cur,...payload},null);
            if(loc)payload.productionLocationId=loc;
          }
        }
      }
      if(module==='production'&&!deleted&&payload&&!payload.productionLocationId&&payload.orderId){
        payload=clone(payload);
        const o=(db.orders||[]).find(x=>sid(x?.id)===sid(payload.orderId));
        const loc=locationForOrder(o,payload.productId);if(loc)payload.productionLocationId=loc;
      }
    }catch(e){console.warn('[HLGB '+V+'] pre-save integrity',e)}
    const result=await original.call(this,module,id,payload,deleted);
    setTimeout(()=>{hydrateLocationsLocal();reconcileLocalCuts();},0);
    return result;
  };
  wrapped.__hlgb9240=true;
  wrapped.__original=original;
  window.hlgbRecordSaveWithRetry=wrapped;
  return true;
}

/* Reforça persistência de sessão já autenticada em refresh sem guardar senha. */
function sessionBridge(){
  try{
    const keys=['hlgbCurrentUser','hlgb_current_user','currentUser','loggedUser','hlgbUser'];
    for(const k of keys){
      const s=sessionStorage.getItem(k),l=localStorage.getItem(k);
      if(s&&!l)localStorage.setItem(k,s);
      else if(!s&&l)sessionStorage.setItem(k,l);
    }
  }catch(e){}
}

function postRenderFix(){hydrateLocationsLocal();reconcileLocalCuts();}
sessionBridge();postRenderFix();
let tries=0;const t=setInterval(()=>{tries++;sessionBridge();patchRecordSaver();postRenderFix();if(tries>60)clearInterval(t)},500);
for(const fn of ['renderProjection','renderCuts','renderProduction']){
  const old=window[fn];if(typeof old==='function'&&!old.__hlgb9240){const w=function(){hydrateLocationsLocal();const r=old.apply(this,arguments);setTimeout(postRenderFix,0);return r};w.__hlgb9240=true;window[fn]=w;}
}
console.info('[HLGB] integridade de fluxo v'+V+' ativa');
})();
</script>
<!-- HLGB_V9240_WORKFLOW_INTEGRITY_END -->'''

if 'HLGB_V9240_WORKFLOW_INTEGRITY_START' not in s:
    if '</body>' in s:
        # Printing templates also contain </body>; only the document's final
        # closing body may receive executable application scripts.
        head, tail = s.rsplit('</body>', 1)
        s = head + addon + '\n</body>' + tail
    else:
        s += '\n' + addon

out.write_text(s, encoding='utf-8')
print('generated', out, 'bytes', out.stat().st_size)
