from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9189_START -->'
END='<!-- HLGB_V9189_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

# identificação visual atual
s=s.replace('v91.88','v91.89').replace('V91.88','V91.89')

block=r'''<!-- HLGB_V9189_START -->
<style id="hlgb-v9189-style">
#dailyCutsTable .hlgb9189-week{display:flex;flex-direction:column;gap:14px}
.hlgb9189-summary{display:grid;grid-template-columns:repeat(4,minmax(135px,1fr));gap:10px;margin:12px 0 16px}
.hlgb9189-card{background:#fff;border:1px solid #e7dce2;border-radius:12px;padding:12px}
.hlgb9189-card small{display:block;color:#74666e;margin-bottom:4px}.hlgb9189-card strong{font-size:20px}
.hlgb9189-day{border:1px solid #d9ccd3;border-radius:12px;overflow:hidden;background:#fff}
.hlgb9189-day-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;background:#f5edf1;border-bottom:1px solid #d9ccd3}
.hlgb9189-day-head.today{background:#fff3f7}.hlgb9189-day-head strong{font-size:15px}.hlgb9189-day-head span{font-weight:800}
.hlgb9189-table-wrap{overflow:auto}.hlgb9189-table{width:100%;border-collapse:collapse;min-width:900px;font-size:12px}
.hlgb9189-table th,.hlgb9189-table td{padding:8px 9px;border-bottom:1px solid #eee5e9;text-align:left;vertical-align:middle}
.hlgb9189-table th{background:#fcf8fa;font-weight:800}.hlgb9189-table tr:last-child td{border-bottom:0}
.hlgb9189-empty{padding:16px;color:#897b83;text-align:center}
.hlgb9189-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-weight:800;font-size:11px;white-space:nowrap}
.hlgb9189-badge.ok{background:#e9f8ef;color:#087443;border:1px solid #b9e4c9}.hlgb9189-badge.warn{background:#fff4d6;color:#865b00;border:1px solid #efd58b}.hlgb9189-badge.info{background:#f2eef7;color:#58456e;border:1px solid #d9cbea}
.hlgb9189-actions{display:flex;gap:5px;flex-wrap:wrap}.hlgb9189-actions button{padding:6px 9px!important;font-size:11px!important}
.hlgb9189-toptools{display:flex;gap:7px;align-items:end;flex-wrap:wrap;margin:10px 0}.hlgb9189-toptools .field{min-width:155px}
.hlgb9189-note{font-size:11px;color:#776b72;margin-top:3px}
@media(max-width:800px){.hlgb9189-summary{grid-template-columns:1fr 1fr}}
</style>
<script id="hlgb-v9189-script">
(function(){
'use strict';
const VERSION='91.89';
const clone9189=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
const norm9189=v=>String(v||'').trim().toLowerCase();
const esc9189=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money9189=v=>typeof money==='function'?money(+v||0):('R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}));
const iso9189=d=>{let x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
const date9189=v=>{if(!v)return '-';try{return new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR')}catch(e){return String(v)}};
const qty9189=c=>Math.max(0,+c?.pieces||0);
const product9189=c=>{let p=null;try{if(typeof cutProduct==='function')p=cutProduct(c)}catch(e){};if(!p&&c?.productId)p=(db.products||[]).find(x=>String(x.id)===String(c.productId));if(!p&&c?.product)p=(db.products||[]).find(x=>norm9189(x.name)===norm9189(c.product));return p||null};
const productName9189=c=>product9189(c)?.name||c?.product||'Modelo sem nome';
const unit9189=c=>{if(c?.unitValue!=null&&Number.isFinite(+c.unitValue))return +c.unitValue;return +(product9189(c)?.price||0)};
const cutter9189=c=>(db.cutters||[]).find(x=>String(x.id)===String(c?.cutterId))||null;
const isDone9189=c=>norm9189(c?.status)==='finalizado'||norm9189(c?.status)==='finalizada'||c?.done===true;
const appOpen9189=()=>document.getElementById('appShell')?.style.display==='block'&&!!(window.cloudUser||window.cloudAccessToken);
function monday9189(v){let d=new Date((v||iso9189(new Date()))+'T12:00:00'),n=d.getDay(),diff=n===0?-6:1-n;d.setDate(d.getDate()+diff);return d}

async function saveCloud9189(row,backup){
  try{
    if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
    if(typeof window.hlgbRecordReady!=='undefined'&&!window.hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')await hlgbEnsureRecordsOnlineAfterLogin();
    if(typeof window.hlgbRecordSaveWithRetry!=='function'||!window.cloudAccessToken)throw new Error('A conexão com a nuvem ainda não está pronta.');
    let out=await window.hlgbRecordSaveWithRetry('cuts',String(row.id),clone9189(row),false);
    if(!out||out.applied!==true)throw new Error('A nuvem não confirmou a gravação do corte.');
    let confirmed=out.data||row,idx=(db.cuts||[]).findIndex(x=>String(x.id)===String(row.id));
    if(idx>=0)db.cuts[idx]=confirmed;else{db.cuts=Array.isArray(db.cuts)?db.cuts:[];db.cuts.push(confirmed)}
    try{localSaveOnly()}catch(e){}
    try{setCloudStatus('⚡ Online · corte confirmado','ok')}catch(e){}
    return confirmed;
  }catch(e){
    if(backup){let idx=(db.cuts||[]).findIndex(x=>String(x.id)===String(row.id));if(idx>=0)db.cuts[idx]=backup}else db.cuts=(db.cuts||[]).filter(x=>String(x.id)!==String(row.id));
    try{localSaveOnly()}catch(_e){}
    throw e;
  }
}

function ensurePlannerUI9189(){
  if(!appOpen9189())return;
  let box=document.getElementById('dailyCutsTable');if(!box)return;
  let panel=box.closest('.panel');if(!panel)return;
  let heading=[...panel.querySelectorAll('h2,h3')].find(x=>/cortes do dia|planejamento de corte/i.test(x.textContent||''));if(heading)heading.textContent='📅 Planejamento de Corte';
  let primary=[...panel.querySelectorAll('button')].find(x=>/programar|ajustar cortes/i.test(x.textContent||''));
  if(primary){primary.textContent='+ Programar corte por modelo';primary.setAttribute('onclick','hlgbOpenModelCut9189()')}
  let dateInput=document.getElementById('cutDayDate');if(dateInput){let f=dateInput.closest('.field');if(f){let l=f.querySelector('label');if(l)l.textContent='Semana que contém a data'}}
  let oldStatus=document.getElementById('cutDayStatus'),oldCutter=document.getElementById('cutDayCutter');
  if(oldStatus){let f=oldStatus.closest('.field');if(f)f.style.display='none'}
  if(oldCutter){let f=oldCutter.closest('.field');if(f)f.style.display='none'}
  let sub=heading?.nextElementSibling;if(sub&&sub.classList.contains('sub'))sub.textContent='Organize os modelos por dia e cortador. O planejamento é independente do pedido e pode ser alterado a qualquer momento.';
}

window.hlgbMoveCutWeek9189=function(delta){let inp=document.getElementById('cutDayDate'),m=monday9189(inp?.value||iso9189(new Date()));m.setDate(m.getDate()+(+delta||0)*7);if(inp)inp.value=iso9189(m);renderDailyCuts()};
window.hlgbTodayCutWeek9189=function(){let inp=document.getElementById('cutDayDate');if(inp)inp.value=iso9189(new Date());renderDailyCuts()};

window.hlgbOpenModelCut9189=function(){
 if(!appOpen9189()){alert('Entre no sistema antes de programar o corte.');return}
 let products=(db.products||[]).slice().filter(p=>p.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
 let cutters=(db.cutters||[]).filter(c=>c.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
 let selected=document.getElementById('cutDayDate')?.value||iso9189(new Date());
 let html=`<div class="sub" style="margin-bottom:12px"><b>Independente do pedido:</b> escolha diretamente o modelo que precisa ser cortado. Depois você poderá trocar o dia ou o cortador sem alterar nenhum pedido.</div>
 <div class="grid">
  <div class="field"><label>Modelo *</label><select id="cutModel9189" onchange="hlgbModelPrice9189()"><option value="">Selecione o modelo</option>${products.map(p=>`<option value="${esc9189(p.id)}" data-price="${+p.price||0}">${esc9189(p.name)}</option>`).join('')}</select></div>
  <div class="field"><label>Quantidade *</label><input id="cutQty9189" type="number" min="1" step="1" placeholder="Peças"></div>
  <div class="field"><label>Dia do corte *</label><input id="cutDate9189" type="date" value="${selected}"></div>
  <div class="field"><label>Cortador</label><select id="cutCutter9189"><option value="">Definir depois</option>${cutters.map(c=>`<option value="${esc9189(c.id)}">${esc9189(c.name)}</option>`).join('')}</select></div>
  <div class="field"><label>Valor unitário</label><input id="cutUnit9189" type="number" step="0.01" min="0" placeholder="Preço do produto"></div>
  <div class="field"><label>Tipo de corte</label><select id="cutType9189"><option value="">Não definido</option><option value="Interno">Interno</option><option value="Externo">Externo</option></select></div>
  <div class="field"><label>Observação</label><input id="cutNote9189" placeholder="Opcional"></div>
 </div><button type="button" class="primary modalSave">☁️ Programar corte</button>`;
 openModal('Programar corte por modelo',html,async()=>{
   let pid=document.getElementById('cutModel9189')?.value,p=products.find(x=>String(x.id)===String(pid)),q=Math.floor(+document.getElementById('cutQty9189')?.value||0),day=document.getElementById('cutDate9189')?.value||'',cid=document.getElementById('cutCutter9189')?.value||'',unit=Math.max(0,+document.getElementById('cutUnit9189')?.value||+(p?.price||0));
   if(!p){alert('Escolha o modelo.');return false}if(q<=0){alert('Informe a quantidade de peças.');return false}if(!day){alert('Escolha o dia do corte.');return false}
   let row={id:Date.now()+Math.floor(Math.random()*100000),orderId:null,manual:true,isAdHoc:true,source:'model_planning',op:'AVULSO-'+Date.now(),productId:p.id,product:p.name,client:'',pieces:q,unitValue:unit,cutterId:cid?+cid:null,cutType:document.getElementById('cutType9189')?.value||'',plannedCutDate:day,date:iso9189(new Date()),status:'Planejado',note:document.getElementById('cutNote9189')?.value||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
   try{await saveCloud9189(row,null);closeModal();renderDailyCuts();try{renderCuts()}catch(e){};return true}catch(e){console.error(e);if(btn){btn.disabled=false;btn.textContent='☁️ Programar corte'}alert('Não foi possível confirmar este corte na nuvem. Nada foi gravado: '+String(e?.message||e));return false}
 });
};
window.hlgbModelPrice9189=function(){let s=document.getElementById('cutModel9189'),o=s?.selectedOptions?.[0],i=document.getElementById('cutUnit9189');if(i&&o)i.value=(+o.dataset.price||0).toFixed(2)};

window.hlgbEditCut9189=function(id){
 let c=(db.cuts||[]).find(x=>String(x.id)===String(id));if(!c)return;let backup=clone9189(c),cutters=(db.cutters||[]).filter(x=>x.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
 let html=`<div class="panel" style="margin:0 0 12px"><b>${esc9189(productName9189(c))}</b><div class="sub">Você pode mudar o dia e o cortador quantas vezes precisar.</div></div><div class="grid">
 <div class="field"><label>Dia do corte *</label><input id="editCutDate9189" type="date" value="${esc9189(c.plannedCutDate||iso9189(new Date()))}"></div>
 <div class="field"><label>Cortador</label><select id="editCutCutter9189"><option value="">Sem cortador definido</option>${cutters.map(x=>`<option value="${esc9189(x.id)}" ${String(x.id)===String(c.cutterId)?'selected':''}>${esc9189(x.name)}</option>`).join('')}</select></div>
 <div class="field"><label>Quantidade</label><input id="editCutQty9189" type="number" min="1" step="1" value="${qty9189(c)}"></div>
 <div class="field"><label>Valor unitário</label><input id="editCutUnit9189" type="number" min="0" step="0.01" value="${unit9189(c).toFixed(2)}"></div>
 <div class="field"><label>Tipo</label><select id="editCutType9189"><option value="" ${!c.cutType?'selected':''}>Não definido</option><option value="Interno" ${c.cutType==='Interno'?'selected':''}>Interno</option><option value="Externo" ${c.cutType==='Externo'?'selected':''}>Externo</option></select></div>
 <div class="field"><label>Observação</label><input id="editCutNote9189" value="${esc9189(c.note||'')}"></div></div><button type="button" class="primary modalSave">☁️ Salvar alteração</button>`;
 openModal('Editar planejamento de corte',html,async()=>{
   let day=document.getElementById('editCutDate9189')?.value||'',q=Math.floor(+document.getElementById('editCutQty9189')?.value||0);if(!day){alert('Escolha o dia.');return false}if(q<=0){alert('Informe a quantidade.');return false}
   c.plannedCutDate=day;c.cutterId=document.getElementById('editCutCutter9189')?.value?+document.getElementById('editCutCutter9189').value:null;c.pieces=q;c.unitValue=Math.max(0,+document.getElementById('editCutUnit9189')?.value||0);c.cutType=document.getElementById('editCutType9189')?.value||'';c.note=document.getElementById('editCutNote9189')?.value||'';c.updatedAt=new Date().toISOString();if(!isDone9189(c))c.status='Planejado';
   let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
   try{await saveCloud9189(c,backup);closeModal();renderDailyCuts();try{renderCuts()}catch(e){};return true}catch(e){console.error(e);c=backup;if(btn){btn.disabled=false;btn.textContent='☁️ Salvar alteração'}alert('A alteração não foi confirmada na nuvem e foi desfeita: '+String(e?.message||e));return false}
 });
};

window.hlgbFinishFromPlan9189=function(id){
 let c=(db.cuts||[]).find(x=>String(x.id)===String(id));if(!c||isDone9189(c))return;
 if(typeof window.finishCut==='function'){try{window.finishCut(id);setTimeout(()=>renderDailyCuts(),80);return}catch(e){console.error(e)}}
 alert('Abra o corte para finalizar.');
};

window.renderDailyCuts=function(){
 if(!appOpen9189())return;
 ensurePlannerUI9189();
 let box=document.getElementById('dailyCutsTable');if(!box)return;
 let inp=document.getElementById('cutDayDate');if(inp&&!inp.value)inp.value=iso9189(new Date());let start=monday9189(inp?.value||iso9189(new Date())),days=Array.from({length:7},(_,i)=>{let d=new Date(start);d.setDate(d.getDate()+i);return d}),ids=days.map(iso9189);
 let rows=(db.cuts||[]).filter(c=>c.plannedCutDate&&ids.includes(String(c.plannedCutDate).slice(0,10))).sort((a,b)=>String(a.plannedCutDate).localeCompare(String(b.plannedCutDate))||String(productName9189(a)).localeCompare(String(productName9189(b)),'pt-BR'));
 let totalPieces=rows.reduce((s,c)=>s+qty9189(c),0),totalValue=rows.reduce((s,c)=>s+qty9189(c)*unit9189(c),0),pending=rows.filter(c=>!isDone9189(c)).length,cutters=new Set(rows.map(c=>String(c.cutterId||'')).filter(Boolean)).size,today=iso9189(new Date());
 let summary=`<div class="hlgb9189-toptools"><button type="button" class="secondary" onclick="hlgbMoveCutWeek9189(-1)">← Semana anterior</button><button type="button" class="secondary" onclick="hlgbTodayCutWeek9189()">Esta semana</button><button type="button" class="secondary" onclick="hlgbMoveCutWeek9189(1)">Próxima semana →</button><button type="button" class="primary" onclick="hlgbOpenModelCut9189()">+ Programar corte por modelo</button></div><div class="hlgb9189-summary"><div class="hlgb9189-card"><small>Peças na semana</small><strong>${totalPieces.toLocaleString('pt-BR')}</strong></div><div class="hlgb9189-card"><small>Valor planejado</small><strong>${money9189(totalValue)}</strong></div><div class="hlgb9189-card"><small>Cortadores envolvidos</small><strong>${cutters}</strong></div><div class="hlgb9189-card"><small>Cortes pendentes</small><strong>${pending}</strong></div></div>`;
 let html=days.map((d,di)=>{let day=ids[di],arr=rows.filter(c=>String(c.plannedCutDate).slice(0,10)===day),pieces=arr.reduce((s,c)=>s+qty9189(c),0),value=arr.reduce((s,c)=>s+qty9189(c)*unit9189(c),0),title=d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}),body=arr.map(c=>{let ct=cutter9189(c),done=isDone9189(c),status=done?'<span class="hlgb9189-badge ok">✓ OK · cortado</span>':(ct?'<span class="hlgb9189-badge info">Programado</span>':'<span class="hlgb9189-badge warn">Falta cortador</span>');return `<tr><td><b>${esc9189(productName9189(c))}</b>${c.note?`<div class="hlgb9189-note">${esc9189(c.note)}</div>`:''}</td><td>${qty9189(c).toLocaleString('pt-BR')}</td><td>${money9189(unit9189(c))}</td><td><b>${money9189(qty9189(c)*unit9189(c))}</b></td><td>${ct?esc9189(ct.name):'<span class="hlgb9189-badge warn">Definir</span>'}</td><td>${status}</td><td><div class="hlgb9189-actions"><button type="button" class="secondary" onclick="hlgbEditCut9189('${esc9189(c.id)}')">Editar</button>${!done?`<button type="button" class="secondary" onclick="hlgbFinishFromPlan9189('${esc9189(c.id)}')">Finalizar</button>`:''}</div></td></tr>`}).join('');return `<section class="hlgb9189-day"><div class="hlgb9189-day-head ${day===today?'today':''}"><strong>${esc9189(title)}</strong><span>${pieces.toLocaleString('pt-BR')} pç · ${money9189(value)}</span></div>${body?`<div class="hlgb9189-table-wrap"><table class="hlgb9189-table"><thead><tr><th>Modelo</th><th>Quantidade</th><th>Valor</th><th>Total</th><th>Cortador</th><th>Status</th><th>Ações</th></tr></thead><tbody>${body}</tbody></table></div>`:'<div class="hlgb9189-empty">Nenhum corte programado neste dia.</div>'}</section>`}).join('');
 box.innerHTML=summary+`<div class="hlgb9189-week">${html}</div>`;
};

// O botão antigo de “Programar / ajustar cortes” passa a ser por MODELO, nunca preso ao pedido.
window.openDailyCutPlanner=window.hlgbOpenModelCut9189;

// Sem boot pesado no pré-login. Só acrescenta a melhoria quando a página de corte for renderizada após autenticação.
try{const base=window.renderCuts;if(typeof base==='function'&&!base.__hlgb9189){const w=function(){let r=base.apply(this,arguments);if(appOpen9189())setTimeout(()=>{try{ensurePlannerUI9189();renderDailyCuts()}catch(e){console.warn('HLGB v91.89 planejamento',e)}},0);return r};w.__hlgb9189=true;window.renderCuts=w}}catch(e){console.warn('HLGB v91.89 wrapper',e)}
try{document.title='HLGB Confecções — Sistema de Gestão v91.89 Multiusuário'}catch(e){}
console.log('HLGB v91.89 carregada: planejamento de corte por modelo.');
})();
</script>
<!-- HLGB_V9189_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('ERRO: </body> real não encontrado')
s=s[:pos]+block+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')

# Validação de todos os scripts inline sem src
text=p.read_text(encoding='utf-8')
pat=re.compile(r'<script(?![^>]*\bsrc\s*=)[^>]*>(.*?)</script\s*>',re.I|re.S)
checked=0
for i,m in enumerate(pat.finditer(text)):
    body=m.group(1)
    if not body.strip(): continue
    tf=Path(tempfile.gettempdir())/f'hlgb9189_{i}.js';tf.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(tf)],capture_output=True,text=True)
    if r.returncode:
        print(r.stderr);raise SystemExit(f'ERRO de sintaxe no script inline #{i}')
    checked+=1
assert text.count(START)==1 and text.count(END)==1
assert 'window.openDailyCutPlanner=window.hlgbOpenModelCut9189' in text
assert "hlgbRecordSaveWithRetry('cuts'" in text
print(f'OK v91.89: {checked} scripts inline validados')
