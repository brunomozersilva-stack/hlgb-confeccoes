from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old9200 = """const mo9200=new MutationObserver(()=>{if(document.getElementById('orderNotesTable')||document.getElementById('allOrderNotesTable'))render9200()});
mo9200.observe(document.documentElement,{childList:true,subtree:true});"""
new9200 = """let mo9200Busy=false;
const mo9200=new MutationObserver((mutations)=>{
  if(mo9200Busy)return;
  const relevant=mutations.some(m=>{
    const t=(m.target instanceof Element)?m.target:m.target?.parentElement;
    if(!t)return false;
    if(t.closest?.('#projectionNotes9200'))return false;
    return !!(t.closest?.('#orderNotesTable,#allOrderNotesTable') || t.querySelector?.('#orderNotesTable,#allOrderNotesTable'));
  });
  if(!relevant)return;
  mo9200Busy=true;
  requestAnimationFrame(()=>{
    try{render9200()}finally{setTimeout(()=>{mo9200Busy=false},80)}
  });
});
mo9200.observe(document.documentElement,{childList:true,subtree:true});"""

old9202 = """const mo=new MutationObserver(()=>{decorateProjection();if(document.getElementById('projectionNotes9200')||document.getElementById('orderNotesTable'))renderQueue()});mo.observe(document.documentElement,{childList:true,subtree:true});"""
new9202 = """let mo9202Timer=null;
const mo=new MutationObserver((mutations)=>{
  const external=mutations.some(m=>{
    const t=(m.target instanceof Element)?m.target:m.target?.parentElement;
    if(!t)return false;
    return !t.closest?.('#noteQueue9202') && !t.closest?.('#projectionNotes9200');
  });
  if(!external || mo9202Timer)return;
  mo9202Timer=setTimeout(()=>{
    mo9202Timer=null;
    try{decorateProjection()}catch(e){console.warn('[HLGB 92.06] decorateProjection',e)}
    try{if(document.getElementById('projectionNotes9200')||document.getElementById('orderNotesTable'))renderQueue()}catch(e){console.warn('[HLGB 92.06] renderQueue',e)}
  },120);
});
mo.observe(document.documentElement,{childList:true,subtree:true});"""

if old9200 not in s:
    raise SystemExit('Trecho v92.00 do observer nao encontrado')
if old9202 not in s:
    raise SystemExit('Trecho v92.02 do observer nao encontrado')

s = s.replace(old9200, new9200, 1)
s = s.replace(old9202, new9202, 1)

# Atualiza somente identificacao visual, sem tocar em dados/regras de negocio.
s = re.sub(r'<title>HLGB Confecções — Sistema de Gestão v[0-9.]+ Multiusuário</title>',
           '<title>HLGB Confecções — Sistema de Gestão v92.06 Multiusuário</title>', s, count=1)
s = s.replace("console.log('[HLGB] v92.05 facção -> fila de notas carregado');",
              "console.log('[HLGB] v92.06 facção -> fila de notas carregado');", 1)
s = s.replace("console.log('[HLGB] v92.05 planejamento/fila/notas agrupadas carregado');",
              "console.log('[HLGB] v92.06 planejamento/fila/notas agrupadas carregado');", 1)

# Selo de correção para auditoria.
if 'HLGB_V9206_FREEZE_FIX' not in s:
    s = s.replace('</body>', "<!-- HLGB_V9206_FREEZE_FIX: observers de notas protegidos contra loop -->\n</body>", 1)

req = ['HLGB_V9200_START','HLGB_V9201_START','HLGB_V9202_START','HLGB_V9206_FREEZE_FIX',
       'openProjectionAcerto9200','sendFactionDeliveryToNotes9201','sendProjectionToNotes9202','groupNote9202']
miss=[x for x in req if x not in s]
if miss:
    raise SystemExit('Fluxos ausentes apos correcao: '+repr(miss))

p.write_text(s, encoding='utf-8')
print('v92.06 emergency freeze fix aplicado sem alterar dados')
