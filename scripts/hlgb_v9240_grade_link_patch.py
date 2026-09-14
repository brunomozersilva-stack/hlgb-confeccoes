from pathlib import Path

p = Path('app9240.html')
s = p.read_text(encoding='utf-8')

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
const V='92.43-grade-link';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};

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
function normalizeAdjustedCut(c,current){
  if(!c||typeof c!=='object')return c;
  const actual=Array.isArray(c.actualCutGrade)?c.actualCutGrade:[];
  if(!actual.length)return c;
  const changed=!!c.gradeAdjustedAt||!sameJson(actual,c.originalGrade)||gradeQty(actual)!==(Number(c.pieces)||0);
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
    for(const c of (db?.cuts||[])){
      const fixed=normalizeAdjustedCut(c,c);
      if(fixed!==c&&fixed?.gradeLinkedV9243)Object.assign(c,fixed);
    }
  }catch(e){console.warn('[HLGB '+V+'] normalização local',e)}
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
      syncCutLocal(id,payload);
      try{localSaveOnly()}catch(e){}
    }
    return result;
  };
  wrapped.__hlgbGradeLinkV9243=true;
  wrapped.__originalGradeLink=original;
  window.hlgbRecordSaveWithRetry=wrapped;
  return true;
}

normalizeExistingLocalCuts();
let tries=0;
const timer=setInterval(()=>{
  tries++;
  normalizeExistingLocalCuts();
  if(patchSaver()||tries>40)clearInterval(timer);
},250);

console.info('[HLGB] grade ajustada vinculada a impressão/detalhes/quantidade '+V);
})();
</script>
<!-- HLGB_V9240_GRADE_LINK_V9243_END -->'''

if 'HLGB_V9240_GRADE_LINK_V9243_START' not in s:
    if '</body>' in s:
        head, tail = s.rsplit('</body>', 1)
        s = head + addon + '\n</body>' + tail
    else:
        s += '\n' + addon

p.write_text(s, encoding='utf-8')
print('grade-link patch aplicado', p, p.stat().st_size)
