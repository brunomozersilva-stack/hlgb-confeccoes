from pathlib import Path

p = Path('app9240.html')
s = p.read_text(encoding='utf-8')

# Corrige os consumidores da grade, além da persistência. O pedido comercial
# permanece intacto; impressão e fila de corte usam a quantidade operacional.
def replace_once(old, new):
    global s
    if new in s:
        return
    if s.count(old) != 1:
        raise SystemExit('Trecho de corte inesperado: ' + old[:100])
    s = s.replace(old, new, 1)

replace_once('let firstPanel=pg.querySelector(".panel");', 'let firstPanel=pg.querySelector(":scope > .panel");')

replace_once("window.printCuttingSheet=function(orderId){", "window.printCuttingSheet=function(orderId,cutId){")
replace_once("    let groups=modelGroups936(o);", "    const cut=cutId!=null?(db.cuts||[]).find(c=>String(c.id)===String(cutId)):obterCorteDoPedido(o);\n    const effective=cut?cutActualGrade(cut,o):o.grade;\n    let groups=modelGroups936({...o,grade:effective});")
replace_once('onclick="printCuttingSheet(${o.id})">🖨️ Imprimir grade</button> <button class="secondary" onclick="viewOrderDetails', 'onclick="printCuttingSheet(${o.id},${c.id})">🖨️ Imprimir grade</button> <button class="secondary" onclick="viewOrderDetails')
replace_once("esc(orderProductSummary(o)),qtyOfOrder(o).toLocaleString('pt-BR'),priorityBadge", "esc(orderProductSummary(o)),hlgbCutQuantity9245(c,o).toLocaleString('pt-BR'),priorityBadge")
replace_once("let pp=orders.reduce((a,o)=>a+qtyOfOrder(o),0),pv=orders.reduce((a,o)=>a+(+o.total||0),0);", "let pp=orders.reduce((a,o)=>a+hlgbCutQuantity9245(obterCorteDoPedido(o),o),0),pv=orders.reduce((a,o)=>{const q=qtyOfOrder(o);return a+(q?hlgbCutQuantity9245(obterCorteDoPedido(o),o)*(+o.total||0)/q:0)},0);")
replace_once("function cutOriginalGrade(c,o){", "function cutOriginalGrade(c,o){\n  if(Array.isArray(c.plannedGradeBeforeAdjustmentV9243)&&c.plannedGradeBeforeAdjustmentV9243.length)return c.plannedGradeBeforeAdjustmentV9243;")
replace_once("let orig=Array.isArray(c.originalGrade)&&c.originalGrade.length?clone9191(c.originalGrade):clone9191(o?.grade||[]),actual=", "let orig=clone9191(cutOriginalGrade(c,o)),actual=")
replace_once('id="mpieces" type="number" value="${c.pieces??0}"', 'id="mpieces" type="number" ${cutActualGrade(c,cutOrderFor(c)).length?\'readonly title="Use Ajustar grade para alterar as quantidades por tamanho"\':\'\'} value="${hlgbCutQuantity9245(c,cutOrderFor(c))}"')
replace_once('id="editCutQty9189" type="number" min="1" step="1" value="${qty9189(c)}"', 'id="editCutQty9189" type="number" min="0" step="1" ${cutActualGrade(c,cutOrderFor(c)).length?\'readonly title="Use Ajustar grade para alterar as quantidades por tamanho"\':\'\'} value="${hlgbCutQuantity9245(c,cutOrderFor(c))}"')

# Evita a correção de integridade rodando a cada 500 ms por 30 segundos.
# Ela continua sendo aplicada na abertura e após os renders relevantes, sem
# provocar repinturas/reconciliações repetitivas na tela.
s = s.replace(
    "let tries=0;const t=setInterval(()=>{tries++;sessionBridge();patchRecordSaver();postRenderFix();if(tries>60)clearInterval(t)},500);",
    "let tries=0;const t=setInterval(()=>{tries++;sessionBridge();if(patchRecordSaver()||tries>40)clearInterval(t)},500);"
)

addon = r'''<!-- HLGB_V9240_GRADE_LINK_V9243_START -->
<script>
(function(){
'use strict';
const V='92.45-grade-consumers';
window.hlgbCutQuantity9245=function(c,o){
  if(!c)return typeof qtyOfOrder==='function'?qtyOfOrder(o||{}):0;
  if(Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length)return c.actualCutGrade.reduce((s,g)=>s+(Number(g.qty)||0),0);
  if(c.pieces!=null&&Number.isFinite(Number(c.pieces)))return Number(c.pieces);
  return typeof qtyOfOrder==='function'?qtyOfOrder(o||{}):0;
};
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

function effectiveGrade(c){
  if(Array.isArray(c?.actualCutGrade)&&c.actualCutGrade.length)return c.actualCutGrade;
  if(Array.isArray(c?.originalGrade)&&c.originalGrade.length)return c.originalGrade;
  if(Array.isArray(c?.grade)&&c.grade.length)return c.grade;
  return [];
}
function gradeQty(list){
  return (Array.isArray(list)?list:[]).reduce((sum,g)=>sum+(Number(g?.qty)||0),0);
}
function sameJson(a,b){
  try{return JSON.stringify(a)===JSON.stringify(b)}catch(e){return false}
}
function productName(pid){
  const p=(db?.products||[]).find(x=>sid(x?.id)===sid(pid));
  return String(p?.name||'').trim();
}
function gradeProductText(list,fallback){
  if(!Array.isArray(list)||!list.length)return fallback||'';
  const parts=[];
  for(const g of list){
    const name=productName(g?.productId);
    if(!name)return fallback||'';
    let part=String(Number(g?.qty)||0)+' '+name;
    const color=String(g?.color||'').trim();
    const size=String(g?.size||'').trim();
    if(color)part+=' '+color;
    if(size)part+=' Tam '+size;
    parts.push(part);
  }
  return parts.join(' | ')||fallback||'';
}
function isAdjustedCut(c){
  const actual=Array.isArray(c?.actualCutGrade)?c.actualCutGrade:[];
  return !!(actual.length&&(c?.gradeAdjustedAt||c?.gradeLinkedV9243||!sameJson(actual,c?.originalGrade)||gradeQty(actual)!==(Number(c?.pieces)||0)));
}
function normalizeAdjustedCut(c,current){
  if(!c||typeof c!=='object')return c;
  const actual=Array.isArray(c.actualCutGrade)?c.actualCutGrade:[];
  if(!actual.length)return c;
  const changed=isAdjustedCut(c);
  if(!changed)return c;
  const out=clone(c);
  const old=(current&&typeof current==='object')?current:c;
  if(!out.plannedGradeBeforeAdjustmentV9243&&Array.isArray(old?.originalGrade)&&old.originalGrade.length&&!sameJson(old.originalGrade,actual)){
    out.plannedGradeBeforeAdjustmentV9243=clone(old.originalGrade);
  }
  out.originalGrade=clone(actual);
  if(Object.prototype.hasOwnProperty.call(out,'grade'))out.grade=clone(actual);
  const total=gradeQty(actual);
  out.pieces=total;
  if(Object.prototype.hasOwnProperty.call(out,'qty'))out.qty=total;
  if(Object.prototype.hasOwnProperty.call(out,'quantity'))out.quantity=total;
  if(Object.prototype.hasOwnProperty.call(out,'totalPieces'))out.totalPieces=total;
  out.product=gradeProductText(actual,out.product);
  out.gradeLinkedV9243=true;
  return out;
}
function syncCutLocal(id,payload){
  try{
    const cut=(db?.cuts||[]).find(x=>sid(x?.id)===sid(id));
    if(cut&&payload&&typeof payload==='object')Object.assign(cut,clone(payload));
  }catch(e){}
}
function normalizeExistingLocalCuts(){
  try{
    let changed=false;
    for(const c of (db?.cuts||[])){
      if(!isAdjustedCut(c))continue;
      const before=JSON.stringify([c.pieces,c.product,c.originalGrade,c.grade,c.gradeLinkedV9243]);
      const fixed=normalizeAdjustedCut(c,c);
      Object.assign(c,fixed);
      const after=JSON.stringify([c.pieces,c.product,c.originalGrade,c.grade,c.gradeLinkedV9243]);
      if(before!==after)changed=true;
    }
    return changed;
  }catch(e){console.warn('[HLGB '+V+'] normalização local',e);return false}
}
function patchSaver(){
  const current=window.hlgbRecordSaveWithRetry;
  if(typeof current!=='function'||current.__hlgbGradeLinkV9243)return false;
  const original=current;
  const wrapped=async function(module,id,data,deleted){
    let payload=data;
    if(module==='cuts'&&!deleted&&payload){
      try{
        const cur=(db?.cuts||[]).find(x=>sid(x?.id)===sid(id));
        payload=normalizeAdjustedCut(payload,cur);
        if(data&&typeof data==='object'&&payload!==data)Object.assign(data,clone(payload));
        syncCutLocal(id,payload);
      }catch(e){console.warn('[HLGB '+V+'] ajuste de grade antes de salvar',e)}
    }
    const result=await original.call(this,module,id,payload,deleted);
    if(module==='cuts'&&!deleted&&payload){
      const confirmed=(result&&result.data&&typeof result.data==='object')?normalizeAdjustedCut(result.data,payload):payload;
      syncCutLocal(id,confirmed);
      try{localSaveOnly()}catch(e){}
    }
    return result;
  };
  wrapped.__hlgbGradeLinkV9243=true;
  wrapped.__originalGradeLink=original;
  window.hlgbRecordSaveWithRetry=wrapped;
  return true;
}

/*
 * A rotina antiga pedido -> corte atualizava pieces/product em TODO save().
 * Depois de Ajustar grade isso fazia 118 voltar para 120, a nuvem corrigia
 * novamente para 118 e o navegador entrava num ciclo infinito de pendências.
 * Aqui deixamos o pedido criar/sincronizar cortes normais, mas um corte que já
 * tem grade efetivamente ajustada passa a ser autoritativo para grade/quantidade.
 */
function terminalCut(c){
  const s=norm(c?.status);
  return !!(c&&(c.done===true||c.fulfilledAt||['finalizado','cancelado','concluido'].includes(s)||s.includes('atendido por producao')));
}
function protectedCutState(c){
  const keys=['pieces','product','productId','actualCutGrade','originalGrade','grade','qty','quantity','totalPieces','gradeAdjustedAt','cutAdjustmentNote','plannedGradeBeforeAdjustmentV9243','gradeLinkedV9243','updatedAt'];
  const out={};for(const k of keys)if(Object.prototype.hasOwnProperty.call(c||{},k))out[k]=clone(c[k]);
  return out;
}
function restoreProtectedCut(c,state){
  if(!c||!state)return;
  for(const [k,v] of Object.entries(state))c[k]=clone(v);
  const fixed=normalizeAdjustedCut(c,c);Object.assign(c,fixed);
}
function patchOrderCutSync(){
  const current=window.syncOrdersToCuts;
  if(typeof current!=='function'||current.__hlgbGradeLockV9244)return false;
  const original=current;
  const wrapped=function(){
    const cuts=Array.isArray(db?.cuts)?db.cuts:[];
    const protectedMap=new Map();
    const beforeIds=new Set(cuts.map(c=>sid(c?.id)));
    const beforeOrdinary=new Map();
    for(const c of cuts){
      const id=sid(c?.id);if(!id)continue;
      if(isAdjustedCut(c))protectedMap.set(id,{state:protectedCutState(c),client:c?.client});
      else if(c?.autoOrderCutV9199||c?.autoOrderCutV9203)beforeOrdinary.set(id,JSON.stringify([c?.pieces,c?.client,c?.product,c?.materialSeparationParallel,c?.updatedAt]));
    }
    let raw=false;
    try{raw=!!original.apply(this,arguments)}catch(e){console.warn('[HLGB '+V+'] sync pedido→corte legado',e);throw e}
    let net=false;
    for(const c of (db?.cuts||[])){
      const id=sid(c?.id);if(!id)continue;
      const keep=protectedMap.get(id);
      if(keep){
        const clientAfter=c?.client;
        restoreProtectedCut(c,keep.state);
        if(clientAfter!==keep.client){c.client=clientAfter;c.updatedAt=new Date().toISOString();net=true;}
        continue;
      }
      if(!beforeIds.has(id)){net=true;continue;}
      if(beforeOrdinary.has(id)){
        const after=JSON.stringify([c?.pieces,c?.client,c?.product,c?.materialSeparationParallel,c?.updatedAt]);
        if(after!==beforeOrdinary.get(id))net=true;
      }
    }
    return raw&&net;
  };
  wrapped.__hlgbGradeLockV9244=true;
  wrapped.__originalGradeLock=original;
  window.syncOrdersToCuts=wrapped;
  return true;
}
function patchGetOrderCut(){
  const current=window.obterCorteDoPedido;
  if(typeof current!=='function'||current.__hlgbGradeLockV9244)return false;
  const original=current;
  const wrapped=function(o){
    try{
      const adjusted=(db?.cuts||[]).find(c=>sid(c?.orderId)===sid(o?.id)&&!terminalCut(c)&&isAdjustedCut(c));
      if(adjusted){const fixed=normalizeAdjustedCut(adjusted,adjusted);Object.assign(adjusted,fixed);return adjusted;}
    }catch(e){}
    return original.apply(this,arguments);
  };
  wrapped.__hlgbGradeLockV9244=true;
  window.obterCorteDoPedido=wrapped;
  return true;
}
async function flushRepairedPending(){
  try{
    const changed=normalizeExistingLocalCuts();
    if(changed){try{localSaveOnly()}catch(e){}}
    try{if(typeof hlgbRecordPendingStore==='function')hlgbRecordPendingStore()}catch(e){}
    try{if(typeof hlgbCorePendingStore==='function')hlgbCorePendingStore()}catch(e){}
    if(typeof hlgbNormalizedSyncNow==='function'){
      const ok=await hlgbNormalizedSyncNow(false);
      if(ok!==false){
        try{if(typeof cloudDirty!=='undefined'&&cloudDirty&&typeof cloudSaveNow==='function')await cloudSaveNow(false)}catch(e){}
      }
    }
  }catch(e){console.warn('[HLGB '+V+'] descarga de pendências',e)}
}

normalizeExistingLocalCuts();
let tries=0;
const timer=setInterval(()=>{
  tries++;
  normalizeExistingLocalCuts();
  const a=patchSaver(),b=patchOrderCutSync(),c=patchGetOrderCut();
  if((a||window.hlgbRecordSaveWithRetry?.__hlgbGradeLinkV9243)&&(b||window.syncOrdersToCuts?.__hlgbGradeLockV9244)&&(c||window.obterCorteDoPedido?.__hlgbGradeLockV9244)||tries>60)clearInterval(timer);
},250);

try{
  if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(flushRepairedPending,1200);setTimeout(flushRepairedPending,3500)},0);
  else {setTimeout(flushRepairedPending,1800);setTimeout(flushRepairedPending,4200);}
}catch(e){}
window.addEventListener('online',()=>setTimeout(flushRepairedPending,300));

console.info('[HLGB] grade ajustada protegida contra ressincronização do pedido '+V);
})();
</script>
<!-- HLGB_V9240_GRADE_LINK_V9243_END -->'''

start_marker = '<!-- HLGB_V9240_GRADE_LINK_V9243_START -->'
end_marker = '<!-- HLGB_V9240_GRADE_LINK_V9243_END -->'
if start_marker in s:
    start = s.index(start_marker)
    end = s.index(end_marker, start) + len(end_marker)
    s = s[:start] + addon + s[end:]
else:
    if '</body>' in s:
        head, tail = s.rsplit('</body>', 1)
        s = head + addon + '\n</body>' + tail
    else:
        s += '\n' + addon

p.write_text(s, encoding='utf-8')
print('grade-link patch aplicado', p, p.stat().st_size)
