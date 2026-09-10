from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9191_START -->'
END='<!-- HLGB_V9191_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

def matching_end(src, brace):
    depth=0; quote=None; esc=False; i=brace
    while i<len(src):
        ch=src[i]
        if quote:
            if esc: esc=False
            elif ch=='\\': esc=True
            elif ch==quote: quote=None
        else:
            if ch in ('"',"'",'`'): quote=ch
            elif ch=='{': depth+=1
            elif ch=='}':
                depth-=1
                if depth==0:return i+1
        i+=1
    raise SystemExit('Bloco sem fechamento')

def replace_function(src,name,new_text):
    m=re.search(r'(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',src)
    if not m: raise SystemExit('Função não encontrada: '+name)
    brace=src.find('{',m.end())
    end=matching_end(src,brace)
    return src[:m.start()]+new_text+src[end:]

def replace_window_assignment(src,name,new_text):
    m=re.search(r'window\.'+re.escape(name)+r'\s*=\s*(?:async\s*)?function\s*\(',src)
    if not m: raise SystemExit('Atribuição window não encontrada: '+name)
    brace=src.find('{',m.end())
    end=matching_end(src,brace)
    # preserva ; original se existir fora do bloco
    return src[:m.start()]+new_text+src[end:]

# 1) Planejamento de capacidade: reconhecer atribuições de corte e produção antiga sem productId.
new_exact=r'''function exactProduction940(o,item){
  let pid=String(item.productId||item.key||''),model=n940(item.name||prod940(item.productId)?.name||'');
  return (db.production||[]).filter(p=>{
    if(+p.orderId!==+o.id||q940(p.planned)<=0||['pronto','finalizado'].includes(n940(p.stage)))return false;
    let exact=String(p.productId||'')===pid||String(p.cutProductKey||'').split(':').pop()===pid;
    let legacy=!p.productId&&model&&n940(p.product||p.description||'').includes(model);
    return exact||legacy;
  });
}'''
s=replace_function(s,'exactProduction940',new_exact)

new_planned=r'''function plannedAssignments940(o,item){
  let pid=String(item.productId||item.key||'');
  return (db.capacityAssignments||[]).filter(a=>+a.orderId===+o.id&&String(a.itemKey)===pid&&a.active!==false&&q940(a.qty)>0&&(a.locationId||a.factionId));
}'''
s=replace_function(s,'plannedAssignments940',new_planned)

# 2) Projeção dos cortadores: modelo + quantidade + situação. Nunca despejar grade inteira.
new_cutter=r'''window.hlgbRenderCutterExcel9179=function(){
    const el=document.getElementById('hlgbCutterExcel9179');if(!el)return;if(!cutterWeek9179)cutterWeek9179=iso9179(monday9179());
    const mon=monday9179(cutterWeek9179),days=Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(d.getDate()+i);return d}),dayIds=days.map(iso9179);
    const cleanModel=c=>{
      let p=null,pid=c?.productId;
      if(pid)p=(db.products||[]).find(x=>String(x.id)===String(pid));
      let grade=[...(Array.isArray(c?.actualCutGrade)?c.actualCutGrade:[]),...(Array.isArray(c?.originalGrade)?c.originalGrade:[])],ids=[...new Set(grade.map(x=>String(x?.productId||'')).filter(Boolean))];
      if(!p&&ids.length===1)p=(db.products||[]).find(x=>String(x.id)===ids[0]);
      if(!p&&c?.orderId){let o=(db.orders||[]).find(x=>String(x.id)===String(c.orderId));if(o){let oids=[...new Set((o.grade||[]).map(x=>String(x?.productId||'')).filter(Boolean))];if(oids.length===1)p=(db.products||[]).find(x=>String(x.id)===oids[0])}}
      let raw=String(c?.product||'');
      if(!p&&raw){let found=(db.products||[]).filter(x=>x?.name&&norm(raw).includes(norm(x.name))).sort((a,b)=>String(b.name).length-String(a.name).length);p=found[0]||null}
      if(p?.name)return p.name;
      let first=raw.split('|')[0].trim().replace(/^\d+[\s×x-]*/,'');
      first=first.replace(/\s+(Preto|Branco|Rubi|Pantera|Odalisca|Fantastico|Fantástico|Frozen)\s+Tam\s+.*$/i,'').replace(/\s+Tam\s+[A-Z0-9]+.*$/i,'').trim();
      return first||'Modelo';
    };
    let cutters=(db.cutters||[]).filter(c=>c.active!==false).map(c=>({id:c.id,name:c.name||'Cortador'}));if((db.cuts||[]).some(c=>!c.cutterId&&dayIds.includes(asDate(c.plannedCutDate||c.finishedAt||c.date))))cutters.push({id:'',name:'⚠ Sem cortador'});
    const heads=days.map(d=>`<th>${d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</th>`).join('');
    const rows=cutters.map(ct=>{let weekTotal=0;const cells=dayIds.map(day=>{const cuts=cutsForDay9179(ct.id,day);const total=cuts.reduce((a,c)=>a+(+c.pieces||0),0);weekTotal+=total;const chips=cuts.map(c=>`<span class="hlgb9179-cut-chip hlgb9191-clean-chip"><strong>${esc9179(cleanModel(c))}</strong><span>${(+c.pieces||0).toLocaleString('pt-BR')} pç · ${norm(c.status)==='finalizado'?'✓ cortado':'a cortar'}</span></span>`).join('');return `<td>${chips||'<span class="sub">—</span>'}${total?`<div class="hlgb9179-week-total">${total.toLocaleString('pt-BR')} pç</div>`:''}</td>`}).join('');return `<tr><td class="cutter-name">${esc9179(ct.name)}</td>${cells}<td class="hlgb9179-week-total">${weekTotal.toLocaleString('pt-BR')} pç</td></tr>`}).join('');
    el.innerHTML=`<div class="toolbar" style="justify-content:space-between;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px"><div><button class="secondary" onclick="hlgbMoveCutterWeek9179(-1)">← Semana anterior</button> <button class="secondary" onclick="hlgbCurrentCutterWeek9179()">Esta semana</button> <button class="secondary" onclick="hlgbMoveCutterWeek9179(1)">Próxima semana →</button></div><div class="field"><label>Semana</label><input type="date" value="${cutterWeek9179}" onchange="hlgbSetCutterWeek9179(this.value)"></div><button class="secondary" onclick="hlgbPrintCutterExcel9179()">🖨️ Imprimir</button></div><div class="hlgb9179-excel-wrap"><table class="hlgb9179-excel"><thead><tr><th>Cortador</th>${heads}<th>Total semana</th></tr></thead><tbody>${rows||'<tr><td colspan="9">Nenhum cortador cadastrado.</td></tr>'}</tbody></table></div>`;
  }'''
s=replace_window_assignment(s,'hlgbRenderCutterExcel9179',new_cutter)

block=r'''<!-- HLGB_V9191_START -->
<style id="hlgb-v9191-style">
.hlgb9191-clean-chip{padding:6px 7px!important;line-height:1.25!important}
.hlgb9191-clean-chip strong{white-space:normal;line-height:1.2;margin-bottom:2px}
.hlgb9191-clean-chip span{display:block;color:#71656c;font-size:11px}
.hlgb9191-cut-badge{display:inline-flex;margin-left:6px;margin-top:3px;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800;vertical-align:middle;white-space:nowrap}
.hlgb9191-cut-badge.ok{background:#e7f7ec;color:#176b35}.hlgb9191-cut-badge.partial{background:#fff4d8;color:#8a5b00}.hlgb9191-cut-badge.pending{background:#eaf2ff;color:#2458a6}.hlgb9191-cut-badge.no{background:#f1f1f1;color:#666}
.hlgb9191-grade-btn{margin-left:5px!important}
#hlgbCutterExcel9179 .hlgb9179-excel{font-size:11px}
#hlgbCutterExcel9179 .hlgb9179-excel td{min-width:100px}
</style>
<script id="hlgb-v9191-script">
(function(){
'use strict';
const clone9191=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const norm9191=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc9191=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const isFinal9191=c=>norm9191(c?.status)==='finalizado'||norm9191(c?.status)==='finalizada'||c?.done===true;

function orderFor9191(c){return (db.orders||[]).find(o=>String(o.id)===String(c?.orderId))||null}
function productForItem9191(item){let pid=item?.productId||item?.key;return (db.products||[]).find(p=>String(p.id)===String(pid))||null}
function cutMatchesItem9191(c,o,item){
  if(!c||!item)return false;let pid=String(item.productId||item.key||''),name=norm9191(item.name||productForItem9191(item)?.name||'');
  if(o&&c.orderId!=null&&String(c.orderId)!==String(o.id))return false;
  if(pid&&String(c.productId||'')===pid)return true;
  let grades=[...(Array.isArray(c.actualCutGrade)?c.actualCutGrade:[]),...(Array.isArray(c.originalGrade)?c.originalGrade:[])];if(pid&&grades.some(x=>String(x?.productId||'')===pid))return true;
  if(name&&norm9191(c.product||'').includes(name))return true;
  if(o){let pids=[...new Set((o.grade||[]).map(x=>String(x?.productId||'')).filter(Boolean))];if(pids.length===1&&pids[0]===pid)return true}
  return false;
}
function cutState9191(o,item){
  let exact=(db.cuts||[]).filter(c=>c.orderId!=null&&String(c.orderId)===String(o?.id)&&cutMatchesItem9191(c,o,item));
  let rows=exact;
  if(!rows.length&&item?.productId)rows=(db.cuts||[]).filter(c=>(c.orderId==null||c.isAdHoc||c.manual)&&cutMatchesItem9191(c,null,item));
  let target=Math.max(0,+item?.qty||+item?.remainingQty||0),done=rows.filter(isFinal9191).reduce((s,c)=>s+(+c.pieces||0),0),pending=rows.some(c=>!isFinal9191(c));
  if(done>0&&target>0&&done<target)return {text:`🟡 Parcial ${done.toLocaleString('pt-BR')}/${target.toLocaleString('pt-BR')}`,cls:'partial'};
  if(done>0)return {text:'✅ Já cortado',cls:'ok'};
  if(pending)return {text:'✂️ Corte programado',cls:'pending'};
  return {text:'⚪ Não cortado',cls:'no'};
}
function badge9191(o,item){let st=cutState9191(o,item);return `<span class="hlgb9191-cut-badge ${st.cls}">${st.text}</span>`}
window.hlgbCutStatusBadge9191=badge9191;

function findOrderByDisplay9191(txt){let n=String(txt||'').replace(/[^0-9]/g,'');if(!n)return null;return (db.orders||[]).find(o=>{try{return String(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id)===n}catch(e){return String(o.id)===n}})||null}
function enhanceCapacity9191(){
  document.querySelectorAll('#capacidadeProducao .cap940-row').forEach(row=>{if(row.querySelector('.hlgb9191-cut-badge'))return;let b=row.querySelector('div b');if(!b)return;let model=b.textContent?.trim()||'',m=(row.textContent||'').match(/Pedido\s*#\s*(\d+)/i),o=findOrderByDisplay9191(m?.[1]);if(!o)return;let item=(typeof projectionItemsForOrder==='function'?projectionItemsForOrder(o):[]).find(i=>norm9191(i.name)===norm9191(model));if(!item)return;b.insertAdjacentHTML('afterend',badge9191(o,item))});
  document.querySelectorAll('#capacidadeProducao .cap940-unassigned-row').forEach(row=>{if(row.querySelector('.hlgb9191-cut-badge'))return;let bs=row.querySelectorAll('b');if(bs.length<2)return;let o=findOrderByDisplay9191(bs[0].textContent),model=bs[1].textContent?.trim()||'';if(!o)return;let item=(typeof projectionItemsForOrder==='function'?projectionItemsForOrder(o):[]).find(i=>norm9191(i.name)===norm9191(model));if(!item)return;bs[1].insertAdjacentHTML('afterend',badge9191(o,item))});
}

async function saveCut9191(next,backup){
  try{
    if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
    if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')await hlgbEnsureRecordsOnlineAfterLogin();
    if(typeof hlgbRecordSaveWithRetry!=='function'||!cloudAccessToken)throw new Error('A nuvem ainda não está pronta.');
    let out=await hlgbRecordSaveWithRetry('cuts',String(next.id),clone9191(next),false);if(!out?.applied)throw new Error('A nuvem não confirmou o ajuste.');
    let i=(db.cuts||[]).findIndex(x=>String(x.id)===String(next.id));if(i>=0)db.cuts[i]=clone9191(out.data||next);try{localSaveOnly()}catch(e){}return out.data||next;
  }catch(e){if(backup){let i=(db.cuts||[]).findIndex(x=>String(x.id)===String(backup.id));if(i>=0)db.cuts[i]=backup}throw e}
}
window.hlgbAdjustCutGrade9191=function(id){
  let c=(db.cuts||[]).find(x=>String(x.id)===String(id));if(!c)return;let o=orderFor9191(c),backup=clone9191(c);
  let orig=Array.isArray(c.originalGrade)&&c.originalGrade.length?clone9191(c.originalGrade):clone9191(o?.grade||[]),actual=Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length?clone9191(c.actualCutGrade):clone9191(orig);
  if(orig.length&&!c.originalGrade)c.originalGrade=clone9191(orig);
  let body='';
  if(orig.length){body=`<div class="sub" style="margin-bottom:10px">Altere somente a quantidade que realmente será/foi cortada. O pedido original fica preservado.</div>${table(['Modelo','Cor','Tamanho','Previsto','Corte real'],orig.map((it,i)=>{let p=(db.products||[]).find(x=>String(x.id)===String(it.productId)),a=actual.find(x=>String(x.productId)===String(it.productId)&&String(x.color||'')===String(it.color||'')&&String(x.size||'')===String(it.size||''));return[esc9191(p?.name||'Produto'),esc9191(it.color||'-'),esc9191(it.size||'-'),(+it.qty||0).toLocaleString('pt-BR'),`<input id="adj9191_${i}" type="number" min="0" step="1" value="${a?.qty??it.qty??0}" style="width:85px">`] }))}`}
  else body=`<div class="field"><label>Quantidade real do corte</label><input id="adjPieces9191" type="number" min="0" step="1" value="${+c.pieces||0}"></div>`;
  body+=`<div class="field" style="margin-top:12px"><label>Motivo / observação</label><textarea id="adjNote9191" placeholder="Ex.: faltou material preto tamanho M">${esc9191(c.cutAdjustmentNote||'')}</textarea></div><button class="primary modalSave">☁️ Salvar ajuste da grade</button>`;
  openModal('Ajustar grade do corte',body,async()=>{
    if(orig.length){let next=orig.map((it,i)=>({...it,qty:Math.max(0,+document.getElementById('adj9191_'+i)?.value||0)}));c.actualCutGrade=next;c.pieces=next.reduce((s,x)=>s+(+x.qty||0),0)}else c.pieces=Math.max(0,+document.getElementById('adjPieces9191')?.value||0);
    c.cutAdjustmentNote=document.getElementById('adjNote9191')?.value||'';c.gradeAdjustedAt=new Date().toISOString();
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
    try{await saveCut9191(c,backup);if(isFinal9191(c)&&typeof syncFinalizedCutsToProduction==='function')syncFinalizedCutsToProduction();closeModal();try{renderCuts()}catch(e){}try{renderDailyCuts()}catch(e){}try{renderCutters()}catch(e){}try{renderProduction()}catch(e){};return true}catch(e){console.error(e);if(btn){btn.disabled=false;btn.textContent='☁️ Salvar ajuste da grade'}alert('Não foi possível confirmar o ajuste na nuvem. A grade anterior foi mantida.');return false}
  });
};

function enhanceGradeButtons9191(){
  document.querySelectorAll('#corte tr').forEach(tr=>{if(tr.querySelector('.hlgb9191-grade-btn'))return;let candidates=[...tr.querySelectorAll('button[onclick]')],id=null;for(const b of candidates){let m=String(b.getAttribute('onclick')||'').match(/(?:finishCut|editCut|hlgbEditCut9189|viewCutGradeComparison)\s*\(\s*['\"]?([0-9.]+)/);if(m){id=m[1];break}}if(!id)return;let td=tr.lastElementChild;if(!td)return;let b=document.createElement('button');b.type='button';b.className='secondary hlgb9191-grade-btn';b.textContent='Ajustar grade';b.onclick=()=>hlgbAdjustCutGrade9191(id);td.appendChild(b)});
}

try{const base=window.renderCapacityPlanning;window.renderCapacityPlanning=function(){let r=base?.apply(this,arguments);setTimeout(enhanceCapacity9191,0);return r}}catch(e){}
try{const base=window.renderCuts;window.renderCuts=function(){let r=base?.apply(this,arguments);setTimeout(enhanceGradeButtons9191,0);return r}}catch(e){}
try{const base=window.renderDailyCuts;window.renderDailyCuts=function(){let r=base?.apply(this,arguments);setTimeout(enhanceGradeButtons9191,0);return r}}catch(e){}
try{const base=window.renderCutters;window.renderCutters=function(){let r=base?.apply(this,arguments);setTimeout(()=>{try{window.hlgbRenderCutterExcel9179?.()}catch(e){}},0);return r}}catch(e){}

setTimeout(()=>{try{let x=document.querySelector('#appShell .logo small');if(x)x.textContent='v91.91';document.title='HLGB Confecções — Sistema de Gestão v91.91 Multiusuário'}catch(e){}},0);
console.log('HLGB v91.91: cortadores clean, ajuste de grade, status de corte na fila e capacidade por atribuição.');
})();
</script>
<!-- HLGB_V9191_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('</body> não encontrado')
s=s[:pos]+block+'\n'+s[pos:]

# Rótulos diretos mais comuns.
s=re.sub(r'<title>HLGB Confecções — Sistema de Gestão v91\.\d+ Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v91.91 Multiusuário</title>',s,count=1)
s=re.sub(r'(<div class="logo">HLGB <b>CONFECÇÕES</b> <small style="font-size:10px;opacity:.8">)v91\.\d+(</small>)',r'\1v91.91\2',s,count=1)

# Guardas.
for req in ['function exactProduction940(o,item)','function plannedAssignments940(o,item)','window.hlgbRenderCutterExcel9179=function()','hlgbAdjustCutGrade9191','hlgbCutStatusBadge9191',START,END,'function doLogin()']:
    if req not in s: raise SystemExit('Trecho obrigatório ausente: '+req)
if "String(a.source||'')!=='cut_assignment'" in s: raise SystemExit('Filtro antigo cut_assignment ainda presente')
if '329474 bytes omitted' in s: raise SystemExit('index truncado')

# Validação de sintaxe: scripts modificados e bloco novo.
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
checked=0
for i,m in enumerate(pat.finditer(s)):
    body=m.group(1)
    if not any(k in body for k in ['function exactProduction940(o,item)','window.hlgbRenderCutterExcel9179=function()','hlgbAdjustCutGrade9191']):continue
    tf=Path(tempfile.gettempdir())/f'hlgb9191_{i}.js';tf.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(tf)],capture_output=True,text=True)
    if r.returncode:
        print(r.stderr or r.stdout);raise SystemExit(f'Erro JS no script {i}')
    checked+=1
if checked<2: raise SystemExit('Poucos scripts validados: '+str(checked))

p.write_text(s,encoding='utf-8')
print('PASS v91.91: projeção clean, grade ajustável, fila com status de corte e capacidade reconhecendo atribuições. JS=',checked)
