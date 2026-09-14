from pathlib import Path

p = Path('app9240.html')
s = p.read_text(encoding='utf-8')

START = '<!-- HLGB_V9240_CUT_PRODUCTION_QTY_START -->'
END = '<!-- HLGB_V9240_CUT_PRODUCTION_QTY_END -->'
if START in s and END in s:
    a = s.index(START)
    b = s.index(END, a) + len(END)
    s = s[:a] + s[b:]

addon = r'''<!-- HLGB_V9240_CUT_PRODUCTION_QTY_START -->
<script>
(function(){
'use strict';
const V='92.40-cut-production-qty';
const sid=v=>String(v??'');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const q=v=>Math.max(0,Number(v)||0);

function isFinalCut(c){return norm(c?.status)==='finalizado'}
function isFreeProduction(p){return !p?.productionLocationId&&!p?.factionId&&q(p?.done)===0&&!p?.finishedAt&&!p?.productionCompletedAt}
function product(pid){return (db?.products||[]).find(x=>sid(x?.id)===sid(pid))||null}
function orderFor(c){return (db?.orders||[]).find(x=>sid(x?.id)===sid(c?.orderId))||null}
function sumGrade(list){return (Array.isArray(list)?list:[]).reduce((a,g)=>a+q(g?.qty),0)}
function effectiveGrade(c,o){
  // A grade realmente cortada é a fonte autoritativa depois do ajuste.
  if(Array.isArray(c?.actualCutGrade)&&c.actualCutGrade.length)return c.actualCutGrade;
  if(Array.isArray(c?.originalGrade)&&c.originalGrade.length)return c.originalGrade;
  if(Array.isArray(c?.grade)&&c.grade.length)return c.grade;
  return Array.isArray(o?.grade)?o.grade:[];
}
function effectiveGroups(c,o){
  const list=effectiveGrade(c,o),map=new Map();
  for(const g of list){
    const pid=sid(g?.productId||c?.productId||o?.productId||'');
    const qty=q(g?.qty);
    if(!pid||qty<=0)continue;
    map.set(pid,(map.get(pid)||0)+qty);
  }
  if(!map.size){
    const pid=sid(c?.productId||o?.productId||'');
    const total=Array.isArray(c?.actualCutGrade)&&c.actualCutGrade.length?sumGrade(c.actualCutGrade):q(c?.pieces||o?.qty);
    if(pid&&total>0)map.set(pid,total);
  }
  return map;
}
function newProduction(c,o,pid,qty){
  const pr=product(pid);
  return {
    id:Date.now()+Math.floor(Math.random()*900000),
    cutId:c.id,
    orderId:c.orderId||o?.id||null,
    productId:pid,
    op:c.op||('CORTE-'+c.id),
    product:pr?.name||c.product||o?.items||'Produto',
    client:c.client||o?.client||'',
    color:'',size:'',planned:qty,done:0,
    stage:qty>0?'Aguardando atribuição':'Consolidado',
    productionLocationId:null,factionId:null,
    date:c.finishedAt||c.finishedAtTime||(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10)),
    assignmentSource:true,
    cutProductKey:`${c.id}:${pid}`,
    cutEffectiveQtyV9240:true
  };
}
function setv(row,key,value){
  if(String(row?.[key]??'')===String(value??''))return false;
  row[key]=value;return true;
}
function reconcileOneCut(c,changed){
  const o=orderFor(c),groups=effectiveGroups(c,o),all=(db.production||[]).filter(p=>sid(p?.cutId)===sid(c.id));
  if(!groups.size)return;

  // Compatibilidade: não redivide um corte histórico multigrade já movimentado em uma linha legada única.
  if(all.length===1&&groups.size>1&&!all[0]?.productId&&!all[0]?.cutProductKey&&!isFreeProduction(all[0]))return;

  const validKeys=new Set([...groups.keys()].map(pid=>`${sid(c.id)}:${pid}`));
  for(const [pid,total] of groups){
    let rows=all.filter(p=>sid(p?.productId)===pid||sid(p?.cutProductKey)===`${sid(c.id)}:${pid}`);
    if(groups.size===1&&!rows.length){
      const legacy=all.filter(p=>!p?.productId&&!p?.cutProductKey);
      if(legacy.length)rows=legacy;
    }
    const assigned=rows.filter(p=>!isFreeProduction(p));
    const used=assigned.reduce((a,p)=>a+q(p?.planned),0);
    const remaining=Math.max(0,total-used);
    const free=rows.filter(isFreeProduction);
    let row=free[0]||null;
    if(!row&&remaining>0){
      row=newProduction(c,o,pid,remaining);
      db.production.push(row);all.push(row);changed.push(row);
    }
    if(row){
      const pr=product(pid);let dirty=false;
      dirty=setv(row,'planned',remaining)||dirty;
      dirty=setv(row,'productId',pid)||dirty;
      dirty=setv(row,'product',pr?.name||row.product||c.product||'Produto')||dirty;
      dirty=setv(row,'cutProductKey',`${sid(c.id)}:${pid}`)||dirty;
      dirty=setv(row,'assignmentSource',true)||dirty;
      dirty=setv(row,'cutEffectiveQtyV9240',true)||dirty;
      dirty=setv(row,'stage',remaining>0?'Aguardando atribuição':'Totalmente atribuído')||dirty;
      if(dirty&&!changed.includes(row))changed.push(row);
    }
    free.slice(1).forEach(x=>{
      let dirty=false;
      dirty=setv(x,'planned',0)||dirty;
      dirty=setv(x,'stage','Consolidado')||dirty;
      dirty=setv(x,'cutEffectiveQtyV9240',true)||dirty;
      if(dirty&&!changed.includes(x))changed.push(x);
    });
  }

  // Se a grade ajustada retirou um modelo inteiro, linhas ainda livres desse modelo são zeradas.
  all.filter(isFreeProduction).forEach(p=>{
    const key=sid(p?.cutProductKey)||`${sid(c.id)}:${sid(p?.productId)}`;
    if(!key||validKeys.has(key))return;
    let dirty=false;
    dirty=setv(p,'planned',0)||dirty;
    dirty=setv(p,'stage','Consolidado')||dirty;
    dirty=setv(p,'cutEffectiveQtyV9240',true)||dirty;
    if(dirty&&!changed.includes(p))changed.push(p);
  });
}
function syncFromEffectiveCut(){
  try{
    if(typeof hlgb916EnsureData==='function')hlgb916EnsureData();
    db.cuts=Array.isArray(db.cuts)?db.cuts:[];
    db.production=Array.isArray(db.production)?db.production:[];
    const changed=[];
    db.cuts.filter(isFinalCut).forEach(c=>reconcileOneCut(c,changed));
    if(changed.length){
      try{localSaveOnly()}catch(e){}
      try{if(typeof hlgbRecordPendingStore==='function')hlgbRecordPendingStore()}catch(e){}
      try{if(typeof hlgbQueueNormalizedSync==='function')hlgbQueueNormalizedSync(80)}catch(e){}
      console.info('[HLGB '+V+'] produção reconciliada pela quantidade efetivamente cortada:',changed.length);
    }
    return changed.length>0;
  }catch(e){console.warn('[HLGB '+V+'] falha ao reconciliar produção do corte',e);return false}
}

// Substitui a rotina legada que reconstruía a produção pela grade ORIGINAL do pedido.
window.syncFinalizedCutsToProduction=syncFromEffectiveCut;
window.hlgbSyncFinalizedCutsToProductionV9240=syncFromEffectiveCut;

function run(){syncFromEffectiveCut();try{renderProduction?.()}catch(e){}}
try{
  if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(syncFromEffectiveCut,700);setTimeout(syncFromEffectiveCut,2200)},0);
  else {setTimeout(syncFromEffectiveCut,1000);setTimeout(syncFromEffectiveCut,2600);}
}catch(e){}
window.addEventListener('online',()=>setTimeout(syncFromEffectiveCut,300));
setTimeout(()=>{
  // Outros patches podem ter sido carregados depois; garante que esta versão fique por último.
  window.syncFinalizedCutsToProduction=syncFromEffectiveCut;
  syncFromEffectiveCut();
},4500);
console.info('[HLGB] quantidade da produção vinculada ao corte efetivo '+V);
})();
</script>
<!-- HLGB_V9240_CUT_PRODUCTION_QTY_END -->'''

if '</body>' not in s:
    raise SystemExit('Fechamento </body> não encontrado em app9240.html')
head, tail = s.rsplit('</body>', 1)
s = head + addon + '\n</body>' + tail
p.write_text(s, encoding='utf-8')
print('hotfix de quantidade corte -> produção aplicado em app9240.html')
