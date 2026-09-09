from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9185_HUB_CUT_START -->'
END='<!-- HLGB_V9185_HUB_CUT_END -->'
if START in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

block=r'''<!-- HLGB_V9185_HUB_CUT_START -->
<style id="hlgb-v9185-style">
#hubDue9166 .hub9185-cards{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
#hubDue9166 .hub9185-headsum{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:5px;font-size:12px}
#hubDue9166 .hub9185-item{display:grid;grid-template-columns:92px minmax(180px,1fr) 120px 115px auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #f1eaee}
#hubDue9166 .hub9185-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
#hubDue9166 .hub9185-flow{font-weight:800}
#hubDue9166 .hub9185-day-empty{padding:9px 13px;color:var(--muted);font-size:12px}
.cut9185{display:inline-block;margin-top:5px;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800;line-height:1.2}
.cut9185.ok{background:#e7f7ec;color:#176b35}.cut9185.partial{background:#fff4d8;color:#8a5b00}.cut9185.pending{background:#eaf2ff;color:#2458a6}.cut9185.no{background:#f3f3f3;color:#666}
@media(max-width:900px){#hubDue9166 .hub9185-item{grid-template-columns:80px minmax(150px,1fr) 105px auto}.hub9185-item .hub9185-status{grid-column:3}.hub9185-item .hub9185-actions{grid-column:4}.hub9185-item .hub9185-value{grid-column:3;grid-row:2}}
@media(max-width:650px){#hubDue9166 .hub9185-item{grid-template-columns:1fr}.hub9185-item>*{grid-column:auto!important;grid-row:auto!important}.hub9185-actions{justify-content:flex-start!important}}
</style>
<script>
(function(){
'use strict';
const c9185=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}},q9185=v=>Math.max(0,+v||0),n9185=v=>String(v??'').trim().toLowerCase();
function due9185(e){return String(e?.date||e?.dueDate||'').slice(0,10)}
function isDone9185(e){return n9185(e?.status)==='realizado'}
function sum9185(a){return (a||[]).reduce((s,x)=>s+q9185(x?.value),0)}
function flow9185(e){return n9185(e?.flow)==='entrada'?'Entrada':'Saída'}
function statusLabel9185(e){let done=isDone9185(e);return flow9185(e)==='Entrada'?(done?'Recebido':'A receber'):(done?'Pago':'Falta pagar')}
function statusClass9185(e){return isDone9185(e)?'ok':(flow9185(e)==='Saída'?'warn':'')}
function hubRange9185(){let w=document.getElementById('hubFinanceWeek')?.value||weekValue(new Date());return typeof hlgb916HubRange==='function'?hlgb916HubRange(w):{start:w,end:w}}
function allHub9185(){return (db.hubFinanceEntries||[]).filter(e=>due9185(e))}
function period9185(arr,prefix){return arr.filter(e=>due9185(e).startsWith(prefix))}

async function saveHub9185(next){
  if(!next||next.id==null)throw new Error('Lançamento sem id.');
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(!hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function'){
    let ok=await hlgbEnsureRecordsOnlineAfterLogin();if(!ok)throw new Error('A nuvem não ficou disponível.');
  }
  if(typeof hlgbRecordSaveWithRetry!=='function'||!cloudAccessToken)throw new Error('Sincronização por registro indisponível.');
  let out=await hlgbRecordSaveWithRetry('hubFinanceEntries',String(next.id),c9185(next),false);
  if(!out?.applied)throw new Error('A nuvem não confirmou a alteração.');
  let confirmed=out.data||next,arr=db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[],i=arr.findIndex(x=>String(x?.id)===String(next.id));
  if(i>=0)arr[i]=c9185(confirmed);else arr.push(c9185(confirmed));
  try{localSaveOnly()}catch(e){}
  return confirmed;
}
window.quickEditHub9185=function(id){
  let e=(db.hubFinanceEntries||[]).find(x=>String(x.id)===String(id));if(!e)return;
  let entrada=flow9185(e)==='Entrada',done=isDone9185(e);
  openModal(`Editar rápido — ${esc(e.description||e.category||'Lançamento')}`,`<div class="sub" style="margin-bottom:12px">Altere somente a data e se já foi ${entrada?'recebido':'pago'}.</div><div class="grid"><div class="field"><label>Data</label><input id="hubQuickDate9185" type="date" value="${esc(due9185(e)||isoDate(new Date()))}"></div><div class="field"><label>Status</label><select id="hubQuickStatus9185"><option value="Previsto" ${done?'':'selected'}>${entrada?'A receber':'Falta pagar'}</option><option value="Realizado" ${done?'selected':''}>${entrada?'Recebido':'Pago'}</option></select></div></div><div class="cards"><div class="card"><small>Tipo</small><strong>${entrada?'Entrada':'Saída'}</strong></div><div class="card"><small>Valor</small><strong>${money(e.value)}</strong></div></div><button type="button" class="primary modalSave">☁️ Salvar alteração</button>`,async()=>{
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
    let st=document.getElementById('hubQuickStatus9185')?.value||'Previsto',date=document.getElementById('hubQuickDate9185')?.value||due9185(e),next={...e,date,status:st,updatedAt:new Date().toISOString()};
    next.realizedAt=st==='Realizado'?(e.realizedAt||isoDate(new Date())):'';
    try{await saveHub9185(next);closeModal();renderHubFinance();try{setCloudStatus('⚡ Online · lançamento atualizado','ok')}catch(x){}}
    catch(err){console.error(err);if(btn){btn.disabled=false;btn.textContent='☁️ Salvar alteração'}alert('Não consegui confirmar essa alteração na nuvem. O lançamento foi mantido como estava.');}
  });
};
window.toggleHubQuick9185=async function(id){
  let e=(db.hubFinanceEntries||[]).find(x=>String(x.id)===String(id));
  if(!e)return;
  let done=isDone9185(e),next={...e,status:done?'Previsto':'Realizado',updatedAt:new Date().toISOString()};
  next.realizedAt=next.status==='Realizado'?(e.realizedAt||isoDate(new Date())):'';
  try{await saveHub9185(next);renderHubFinance()}catch(err){console.error(err);alert('A mudança não foi confirmada na nuvem. Nada foi alterado.');}
};
function renderHubDue9185(){
  const anchor=document.getElementById('hubFinanceCards');if(!anchor)return;let panel=document.getElementById('hubDue9166');if(!panel){panel=document.createElement('div');panel.id='hubDue9166';panel.className='panel';anchor.insertAdjacentElement('afterend',panel)}
  let range=hubRange9185(),all=allHub9185(),week=all.filter(e=>{let d=due9185(e);return d>=range.start&&d<=range.end}),ins=week.filter(e=>flow9185(e)==='Entrada'),outs=week.filter(e=>flow9185(e)==='Saída'),rec=ins.filter(isDone9185),recv=ins.filter(e=>!isDone9185(e)),paid=outs.filter(isDone9185),open=outs.filter(e=>!isDone9185(e));
  let month=range.start.slice(0,7),year=range.start.slice(0,4),monthRows=period9185(all,month),yearRows=period9185(all,year),groups={};week.forEach(e=>(groups[due9185(e)]||(groups[due9185(e)]=[])).push(e));
  let base=new Date(range.start+'T12:00:00'),days=[];for(let i=0;i<7;i++){let d=new Date(base);d.setDate(base.getDate()+i);days.push(isoDate(d))}
  let dayHtml=days.map(d=>{let a=(groups[d]||[]).slice().sort((x,y)=>flow9185(x).localeCompare(flow9185(y))||q9185(y.value)-q9185(x.value)),di=a.filter(x=>flow9185(x)==='Entrada'),do_=a.filter(x=>flow9185(x)==='Saída'),dp=do_.filter(isDone9185),df=do_.filter(x=>!isDone9185(x));return `<div class="hub9166-day"><div class="hub9166-head"><div><b>${new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</b><div class="hub9185-headsum"><span>🟢 Entradas: <b>${money(sum9185(di))}</b></span><span>🔴 Saídas: <b>${money(sum9185(do_))}</b></span><span>✅ Pago: <b>${money(sum9185(dp))}</b></span><span>⏳ Falta: <b>${money(sum9185(df))}</b></span></div></div><strong>${a.length} lançamento(s)</strong></div>${a.length?`<div class="hub9166-items">${a.map(e=>`<div class="hub9185-item"><span class="badge ${flow9185(e)==='Entrada'?'ok':'warn'} hub9185-flow">${flow9185(e)}</span><div><b>${esc(e.description||e.category||'Lançamento')}</b>${e.origin||e.person?`<small style="display:block;margin-top:3px">${esc(e.person||e.origin)}</small>`:''}</div><span class="badge ${statusClass9185(e)} hub9185-status">${statusLabel9185(e)}</span><b class="hub9185-value">${money(e.value)}</b><div class="hub9185-actions"><button type="button" class="secondary" onclick="quickEditHub9185('${String(e.id).replace(/'/g,"\\'")}')">Editar</button><button type="button" class="${isDone9185(e)?'secondary':'primary'}" onclick="toggleHubQuick9185('${String(e.id).replace(/'/g,"\\'")}')">${isDone9185(e)?'Reabrir':(flow9185(e)==='Entrada'?'✓ Recebido':'✓ Pago')}</button></div></div>`).join('')}</div>`:`<div class="hub9185-day-empty">Nenhum lançamento neste dia.</div>`}</div>`}).join('');
  let monthIn=sum9185(monthRows.filter(e=>flow9185(e)==='Entrada')),monthOut=sum9185(monthRows.filter(e=>flow9185(e)==='Saída')),yearIn=sum9185(yearRows.filter(e=>flow9185(e)==='Entrada')),yearOut=sum9185(yearRows.filter(e=>flow9185(e)==='Saída'));
  panel.innerHTML=`<h2>📆 Entradas e saídas por vencimento</h2><div class="sub">Edite a data ou marque Pago/Recebido diretamente aqui. Mês: entradas ${money(monthIn)} · saídas ${money(monthOut)}. Ano: entradas ${money(yearIn)} · saídas ${money(yearOut)}.</div><div class="cards hub9185-cards"><div class="card"><small>Entradas na semana</small><strong>${money(sum9185(ins))}</strong></div><div class="card"><small>Recebido</small><strong>${money(sum9185(rec))}</strong></div><div class="card"><small>A receber</small><strong>${money(sum9185(recv))}</strong></div><div class="card"><small>Saídas na semana</small><strong>${money(sum9185(outs))}</strong></div><div class="card"><small>Pago</small><strong>${money(sum9185(paid))}</strong></div><div class="card"><small>Falta pagar</small><strong>${money(sum9185(open))}</strong></div></div>${dayHtml}`;
}

function orderItems9185(o){try{return typeof projectionItemsForOrder==='function'?projectionItemsForOrder(o):[]}catch(e){return []}}
function cutInfo9185(o,item){
  let pid=String(item?.productId||item?.key||''),total=q9185(item?.qty),finals=(db.cuts||[]).filter(c=>String(c.orderId)===String(o.id)&&n9185(c.status)==='finalizado'),finalIds=new Set(finals.map(c=>String(c.id))),seen=new Set(),cut=0;
  (db.production||[]).forEach(p=>{if(String(p.orderId)!==String(o.id))return;let match=String(p.productId||'')===pid||String(p.cutProductKey||'').split(':').pop()===pid;if(!match)return;if(p.cutId!=null&&finalIds.size&&!finalIds.has(String(p.cutId)))return;let k=String(p.id??`${p.cutId}:${pid}:${p.planned}`);if(seen.has(k))return;seen.add(k);cut+=q9185(p.planned)});
  if(cut<=0){let specific=finals.filter(c=>String(c.productId||'')===pid);if(specific.length)cut=specific.reduce((s,c)=>s+q9185(c.pieces),0);else if(orderItems9185(o).length<=1&&finals.length)cut=Math.max(...finals.map(c=>q9185(c.pieces)),0)}
  if(total<=0)total=q9185(item?.remainingQty)||cut;cut=Math.min(total||cut,cut);
  let pending=(db.cuts||[]).find(c=>String(c.orderId)===String(o.id)&&n9185(c.status)!=='finalizado'&&(!c.productId||String(c.productId)===pid));
  if(total>0&&cut>=total)return {cls:'ok',text:`✅ Já cortado · ${Math.round(cut).toLocaleString('pt-BR')} pç`};
  if(cut>0)return {cls:'partial',text:`🟡 Parcialmente cortado · ${Math.round(cut).toLocaleString('pt-BR')} de ${Math.round(total).toLocaleString('pt-BR')} pç`};
  if(pending)return {cls:'pending',text:pending.plannedCutDate?`✂️ Corte programado · ${fmtDate(pending.plannedCutDate)}`:'✂️ Corte em aberto'};
  return {cls:'no',text:'⚪ Não cortado'};
}
function enhanceUnassignedCut9185(){
  document.querySelectorAll('#capacity940Root .cap944-unassigned-row').forEach(row=>{if(row.querySelector('.cut9185'))return;let btn=row.querySelector('button[onclick*="openCapacityAssign940"]');if(!btn)return;let call=btn.getAttribute('onclick')||'',m=call.match(/openCapacityAssign940\(([^,]+),'([^']*)'/);if(!m)return;let oid=String(m[1]).replace(/["']/g,'').trim(),key=m[2].replace(/\\'/g,"'"),o=(db.orders||[]).find(x=>String(x.id)===oid);if(!o)return;let item=orderItems9185(o).find(x=>String(x.key||x.productId)===String(key)||String(x.productId)===String(key));if(!item)return;let info=cutInfo9185(o,item),target=row.children[1]||row.firstElementChild;if(target)target.insertAdjacentHTML('beforeend',`<div class="cut9185 ${info.cls}">${esc(info.text)}</div>`)});
}
const oldHub9185=window.renderHubFinance;if(typeof oldHub9185==='function')window.renderHubFinance=function(){let r=oldHub9185.apply(this,arguments);setTimeout(renderHubDue9185,35);return r};
const oldCap9185=window.renderCapacityPlanning;if(typeof oldCap9185==='function')window.renderCapacityPlanning=function(){let r=oldCap9185.apply(this,arguments);setTimeout(enhanceUnassignedCut9185,90);setTimeout(enhanceUnassignedCut9185,220);return r};
function setVersion9185(){let el=document.querySelector('#appShell .logo small');if(el&&el.textContent!=='v91.85')el.textContent='v91.85'}
function boot9185(){try{renderHubDue9185()}catch(e){console.warn('v91.85 hub',e)}try{enhanceUnassignedCut9185()}catch(e){console.warn('v91.85 cut',e)}setVersion9185()}
setTimeout(boot9185,250);setTimeout(boot9185,1800);document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(boot9185,120)});window.addEventListener('focus',()=>setTimeout(boot9185,120));
let ver=document.querySelector('#appShell .logo small');if(ver&&window.MutationObserver)new MutationObserver(setVersion9185).observe(ver,{childList:true,characterData:true,subtree:true});
})();
</script>
<!-- HLGB_V9185_HUB_CUT_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('ERRO: </body> nao encontrado')
s=s[:pos]+'\n'+block+'\n'+s[pos:]
# Atualiza referencias visuais diretas sem mexer nos identificadores internos antigos.
s=s.replace('>v91.84</small>','>v91.85</small>')
if s.count(START)!=1 or s.count(END)!=1: raise SystemExit('ERRO: bloco v91.85 duplicado')
if 'quickEditHub9185' not in s or 'cutInfo9185' not in s: raise SystemExit('ERRO: funcoes v91.85 ausentes')
if '329474 bytes omitted' in s: raise SystemExit('ERRO: truncamento detectado no index')
p.write_text(s,encoding='utf-8')
# valida apenas o JS novo
js=re.search(r'<!-- HLGB_V9185_HUB_CUT_START -->.*?<script>(.*?)</script>\s*<!-- HLGB_V9185_HUB_CUT_END -->',block,re.S).group(1)
t=Path(tempfile.gettempdir())/'hlgb_v9185.js';t.write_text(js,encoding='utf-8')
r=subprocess.run(['node','--check',str(t)],capture_output=True,text=True)
if r.returncode!=0:
    print(r.stderr);raise SystemExit('ERRO: JavaScript v91.85 invalido')
print('PASS v91.85: Hub com entradas/saidas/editar rapido e status de corte por modelo')
