from pathlib import Path
import re

src=Path('app9226.html')
out=Path('app9227.html')
s=src.read_text(encoding='utf-8')

pat=r"  window\.hlgbRenderCutterExcel9179=function\(\)\{.*?\n  \};\n  window\.hlgbPrintCutterExcel9179=function"
new=r'''  window.hlgbRenderCutterExcel9179=function(){
    const el=document.getElementById('hlgbCutterExcel9179');if(!el)return;if(!cutterWeek9179)cutterWeek9179=iso9179(monday9179());
    const mon=monday9179(cutterWeek9179),days=Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(d.getDate()+i);return d}),dayIds=days.map(iso9179);
    const cleanModel=c=>{
      let p=null,pid=c?.productId;
      if(pid)p=(db.products||[]).find(x=>String(x.id)===String(pid));
      if(p?.name)return p.name;
      let first=String(c?.product||'').split(/\n|,/)[0].trim();
      first=first.replace(/\s+(Preto|Branco|Rubi|Pantera|Odalisca|Fantastico|Fantástico|Frozen)\s+Tam\s+.*$/i,'').replace(/\s+Tam\s+[A-Z0-9]+.*$/i,'').trim();
      return first||'Modelo';
    };
    const locationName=c=>{
      const l=(db.productionLocations||[]).find(x=>String(x.id)===String(c?.productionLocationId||''));
      return l?.name||'Sem local';
    };
    const cutterOptions=current=>`<option value="">Sem cortador</option>${(db.cutters||[]).filter(x=>x.active!==false).map(x=>`<option value="${x.id}" ${String(x.id)===String(current||'')?'selected':''}>${esc9179(x.name||'Cortador')}</option>`).join('')}`;
    const cutDay=c=>asDate(c.plannedCutDate||c.finishedAt||c.date);
    const cutMoney=c=>{try{return typeof cutValue==='function'?(+cutValue(c)||0):0}catch(e){return 0}};
    const done=c=>norm(c?.status)==='finalizado';
    const fmt=v=>typeof money==='function'?money(+v||0):(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const stats=list=>({
      plannedPieces:(list||[]).reduce((a,c)=>a+(+c.pieces||0),0),
      plannedValue:(list||[]).reduce((a,c)=>a+cutMoney(c),0),
      producedPieces:(list||[]).filter(done).reduce((a,c)=>a+(+c.pieces||0),0),
      producedValue:(list||[]).filter(done).reduce((a,c)=>a+cutMoney(c),0)
    });
    const monthKey=String(window.hlgbCutterMonth9227||String(cutterWeek9179||'').slice(0,7));
    const allWeekCuts=(db.cuts||[]).filter(c=>dayIds.includes(cutDay(c)));
    const allMonthCuts=(db.cuts||[]).filter(c=>String(cutDay(c)||'').startsWith(monthKey));
    const weekStats=stats(allWeekCuts),monthStats=stats(allMonthCuts);
    let cutters=(db.cutters||[]).filter(c=>c.active!==false).map(c=>({id:c.id,name:c.name||'Cortador'}));
    if([...allWeekCuts,...allMonthCuts].some(c=>!c.cutterId))cutters.push({id:'',name:'⚠ Sem cortador'});
    const heads=days.map(d=>`<th>${d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</th>`).join('');
    const rows=cutters.map(ct=>{
      const cells=dayIds.map(day=>{
        const cuts=cutsForDay9179(ct.id,day),st=stats(cuts);
        const chips=cuts.map(c=>{
          const isDone=done(c),displayDate=cutDay(c)||day,cv=cutMoney(c);
          return `<div class="hlgb9179-cut-chip hlgb9191-clean-chip hlgb9221-edit-chip hlgb9227-edit-chip">
            <strong>${esc9179(cleanModel(c))}</strong>
            <span>${(+c.pieces||0).toLocaleString('pt-BR')} pç · ${isDone?'✓ cortado':'a cortar'}</span>
            <small class="hlgb9221-local">📍 ${esc9179(locationName(c))}</small>
            <small class="hlgb9227-chip-value">${isDone?'Produzido':'Programado'}: ${fmt(cv)}</small>
            <div class="hlgb9221-inline-edit hlgb9227-inline-edit">
              <label>Data<input type="date" value="${displayDate||''}" onchange="hlgbUpdateCutterExcel9227('${String(c.id).replace(/'/g,"\\'")}','date',this.value)"></label>
              <label>Cortador<select onchange="hlgbUpdateCutterExcel9227('${String(c.id).replace(/'/g,"\\'")}','cutterId',this.value)">${cutterOptions(c.cutterId)}</select></label>
            </div>
          </div>`;
        }).join('');
        return `<td>${chips||'<span class="sub">—</span>'}${st.plannedPieces?`<div class="hlgb9227-cell-total"><b>${st.plannedPieces.toLocaleString('pt-BR')} pç</b><small>Programado ${fmt(st.plannedValue)}</small><small class="produced">Produzido ${fmt(st.producedValue)}</small></div>`:''}</td>`;
      }).join('');
      const wk=stats(allWeekCuts.filter(c=>String(c.cutterId||'')===String(ct.id||'')));
      return `<tr><td class="cutter-name">${esc9179(ct.name)}</td>${cells}<td class="hlgb9227-week-cell"><b>${wk.plannedPieces.toLocaleString('pt-BR')} pç</b><small>Programado ${fmt(wk.plannedValue)}</small><small class="produced">Produzido ${fmt(wk.producedValue)}</small></td></tr>`;
    }).join('');
    const dayTotalCells=dayIds.map(day=>{
      const st=stats(allWeekCuts.filter(c=>cutDay(c)===day));
      return `<td class="hlgb9227-day-total-cell"><b>${st.plannedPieces.toLocaleString('pt-BR')} pç</b><small>Programado ${fmt(st.plannedValue)}</small><small class="produced">Produzido ${fmt(st.producedValue)}</small></td>`;
    }).join('');
    const cutterSummaryRows=cutters.map(ct=>{
      const wk=stats(allWeekCuts.filter(c=>String(c.cutterId||'')===String(ct.id||''))),mo=stats(allMonthCuts.filter(c=>String(c.cutterId||'')===String(ct.id||'')));
      return `<tr><td><b>${esc9179(ct.name)}</b></td><td>${wk.plannedPieces.toLocaleString('pt-BR')} pç<br><span>${fmt(wk.plannedValue)}</span></td><td>${wk.producedPieces.toLocaleString('pt-BR')} pç<br><b class="hlgb9227-produced-money">${fmt(wk.producedValue)}</b></td><td>${mo.plannedPieces.toLocaleString('pt-BR')} pç<br><span>${fmt(mo.plannedValue)}</span></td><td>${mo.producedPieces.toLocaleString('pt-BR')} pç<br><b class="hlgb9227-produced-money">${fmt(mo.producedValue)}</b></td></tr>`;
    }).join('');
    const monthLabel=(()=>{try{return new Date(monthKey+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}catch(e){return monthKey}})();

    const locIds=[...new Set(allWeekCuts.map(c=>String(c.productionLocationId||'')))];
    const locationRows=locIds.map(lid=>{
      const lname=lid?((db.productionLocations||[]).find(x=>String(x.id)===lid)?.name||'Local'):'Sem local';
      const cells=dayIds.map(day=>{
        const st=stats(allWeekCuts.filter(c=>String(c.productionLocationId||'')===lid&&cutDay(c)===day));
        return `<td>${st.plannedPieces?`<b>${st.plannedPieces.toLocaleString('pt-BR')} pç</b><br><span class="hlgb9221-location-value">${fmt(st.plannedValue)}</span><br><small>Produzido ${fmt(st.producedValue)}</small>`:'<span class="sub">—</span>'}</td>`;
      }).join('');
      const wk=stats(allWeekCuts.filter(c=>String(c.productionLocationId||'')===lid));
      return `<tr><td class="cutter-name">${esc9179(lname)}</td>${cells}<td><b>${wk.plannedPieces.toLocaleString('pt-BR')} pç</b><br><span class="hlgb9221-location-value">${fmt(wk.plannedValue)}</span><br><small>Produzido ${fmt(wk.producedValue)}</small></td></tr>`;
    }).join('');

    el.innerHTML=`<div class="toolbar hlgb9227-toolbar" style="justify-content:space-between;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px"><div><button class="secondary" onclick="hlgbMoveCutterWeek9179(-1)">← Semana anterior</button> <button class="secondary" onclick="hlgbCurrentCutterWeek9179()">Esta semana</button> <button class="secondary" onclick="hlgbMoveCutterWeek9179(1)">Próxima semana →</button></div><div class="field"><label>Semana</label><input type="date" value="${cutterWeek9179}" onchange="hlgbSetCutterWeek9179(this.value)"></div><div class="field"><label>Mês do resumo</label><input type="month" value="${monthKey}" onchange="hlgbSetCutterMonth9227(this.value)"></div><button class="secondary" onclick="hlgbPrintCutterExcel9179()">🖨️ Imprimir</button></div>
      <div class="hlgb9227-cards"><div class="hlgb9227-card"><small>Semana programada</small><b>${fmt(weekStats.plannedValue)}</b><span>${weekStats.plannedPieces.toLocaleString('pt-BR')} pç</span></div><div class="hlgb9227-card produced"><small>Semana produzida</small><b>${fmt(weekStats.producedValue)}</b><span>${weekStats.producedPieces.toLocaleString('pt-BR')} pç finalizadas</span></div><div class="hlgb9227-card"><small>${esc9179(monthLabel)} programado</small><b>${fmt(monthStats.plannedValue)}</b><span>${monthStats.plannedPieces.toLocaleString('pt-BR')} pç</span></div><div class="hlgb9227-card produced"><small>${esc9179(monthLabel)} produzido</small><b>${fmt(monthStats.producedValue)}</b><span>${monthStats.producedPieces.toLocaleString('pt-BR')} pç finalizadas</span></div></div>
      <div class="sub hlgb9227-help">Você pode alterar <b>a data e o cortador diretamente em cada modelo</b>. Ao salvar, o modelo muda de coluna/linha e a nuvem recalcula os valores.</div>
      <div class="hlgb9179-excel-wrap"><table class="hlgb9179-excel"><thead><tr><th>Cortador</th>${heads}<th>Total semana</th></tr></thead><tbody>${rows||'<tr><td colspan="9">Nenhum cortador cadastrado.</td></tr>'}<tr class="hlgb9227-day-total"><td>💰 TOTAL DO DIA</td>${dayTotalCells}<td class="hlgb9227-day-total-cell"><b>${weekStats.plannedPieces.toLocaleString('pt-BR')} pç</b><small>Programado ${fmt(weekStats.plannedValue)}</small><small class="produced">Produzido ${fmt(weekStats.producedValue)}</small></td></tr></tbody></table></div>
      <div class="hlgb9227-summary-title"><b>👤 Valor por cortador — semana e mês</b><span class="sub">O valor produzido considera somente cortes finalizados.</span></div>
      <div class="hlgb9179-excel-wrap"><table class="hlgb9179-excel hlgb9227-summary-table"><thead><tr><th>Cortador</th><th>Semana programada</th><th>Semana produzida</th><th>${esc9179(monthLabel)} programado</th><th>${esc9179(monthLabel)} produzido</th></tr></thead><tbody>${cutterSummaryRows||'<tr><td colspan="5">Nenhum cortador cadastrado.</td></tr>'}</tbody></table></div>
      <div class="hlgb9221-location-title"><b>💰 Valor por dia em cada local</b><span class="sub">Peças, valor programado e valor produzido por local.</span></div>
      <div class="hlgb9179-excel-wrap"><table class="hlgb9179-excel hlgb9221-location-table"><thead><tr><th>Local</th>${heads}<th>Total semana</th></tr></thead><tbody>${locationRows||'<tr><td colspan="9">Nenhum corte programado nesta semana.</td></tr>'}</tbody></table></div>`;
  };
  window.hlgbPrintCutterExcel9179=function'''
s,n=re.subn(pat,new,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'Função semanal dos cortadores não substituída: {n}')

addon=r'''<!-- HLGB_V9227_CUTTER_DAY_WEEK_MONTH_START -->
<style>
.hlgb9227-cards{display:grid;grid-template-columns:repeat(4,minmax(170px,1fr));gap:10px;margin:12px 0}
.hlgb9227-card{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff}
.hlgb9227-card small,.hlgb9227-card span{display:block;color:var(--muted);font-size:11px}.hlgb9227-card b{display:block;font-size:19px;margin:4px 0;color:#49333f}.hlgb9227-card.produced{background:#f2fbf5;border-color:#cfe8d7}.hlgb9227-card.produced b,.hlgb9227-produced-money{color:#147a42}
.hlgb9227-help{margin:7px 0 10px;padding:9px 11px;border-radius:9px;background:#fff8fb;border:1px solid #eadde4}
.hlgb9227-chip-value{display:block;margin-top:3px;font-weight:800;color:#147a42}
.hlgb9227-inline-edit{background:#fffafc;padding:7px;border-radius:8px}
.hlgb9227-cell-total,.hlgb9227-week-cell,.hlgb9227-day-total-cell{margin-top:6px;padding-top:6px;border-top:1px solid #eee;line-height:1.3}
.hlgb9227-cell-total small,.hlgb9227-week-cell small,.hlgb9227-day-total-cell small{display:block;font-size:10px;color:#6f3f59;white-space:nowrap}.hlgb9227-cell-total .produced,.hlgb9227-week-cell .produced,.hlgb9227-day-total-cell .produced{color:#147a42;font-weight:800}
.hlgb9227-day-total td{background:#fff8fb!important;border-top:2px solid #d9bdca;font-weight:700}
.hlgb9227-summary-title{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin:18px 0 8px;font-size:16px}
.hlgb9227-summary-table td{vertical-align:middle}.hlgb9227-summary-table span{color:#6f3f59;font-weight:700}
@media(max-width:950px){.hlgb9227-cards{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.hlgb9227-cards{grid-template-columns:1fr}}
@media print{.hlgb9227-inline-edit,.hlgb9227-toolbar .field{display:none!important}}
</style>
<script>
(function(){
'use strict';
function clone9227(x){try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}}
async function saveCut9227(next){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('A conexão com a nuvem não está pronta.');
  const r=await window.hlgbRecordSaveWithRetry('cuts',String(next.id),clone9227(next),false);
  if(!r||r.applied!==true)throw new Error(r?.reason||'A nuvem não confirmou a alteração.');
  return r.data||next;
}
window.hlgbSetCutterMonth9227=function(v){window.hlgbCutterMonth9227=String(v||'');if(typeof hlgbRenderCutterExcel9179==='function')hlgbRenderCutterExcel9179()};
window.hlgbUpdateCutterExcel9227=async function(id,field,value){
  const arr=db.cuts=Array.isArray(db.cuts)?db.cuts:[],idx=arr.findIndex(x=>String(x.id)===String(id));if(idx<0){alert('Corte não encontrado.');return}
  const current=arr[idx],next=clone9227(current);
  if(field==='cutterId'){
    const selected=(db.cutters||[]).find(x=>String(x.id)===String(value));
    next.cutterId=value&&selected?selected.id:null;
  }
  if(field==='date'){
    if(!value){alert('Escolha uma data.');if(typeof hlgbRenderCutterExcel9179==='function')hlgbRenderCutterExcel9179();return}
    next.plannedCutDate=value;
    if(String(next.status||'').toLowerCase()==='finalizado')next.finishedAt=value;
  }
  next.updatedAt=new Date().toISOString();
  try{
    const confirmed=await saveCut9227(next);
    arr[idx]=clone9227(confirmed);
    try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
    if(typeof hlgbRenderCutterExcel9179==='function')hlgbRenderCutterExcel9179();
    try{if(typeof renderCuts==='function')renderCuts()}catch(e){}
    try{if(typeof setCloudStatus==='function')setCloudStatus('⚡ Online · corte atualizado','ok')}catch(e){}
  }catch(e){
    if(typeof hlgbRenderCutterExcel9179==='function')hlgbRenderCutterExcel9179();
    alert('Não foi possível salvar a alteração na nuvem. O corte foi mantido como estava. '+String(e?.message||e));
  }
};
function stamp9227(){try{document.title='HLGB Confecções — Sistema de Gestão v92.27 Multiusuário'}catch(e){}const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.27'}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(stamp9227,300);setTimeout(stamp9227,1800);setTimeout(stamp9227,2600)},0);
setTimeout(stamp9227,900);
console.log('[HLGB] v92.27 cortadores: edição direta e valores por dia, semana, mês e cortador');
})();
</script>
<!-- HLGB_V9227_CUTTER_DAY_WEEK_MONTH_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]

s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.26 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.27 Multiusuário</title>',1)

required=['HLGB_V9227_CUTTER_DAY_WEEK_MONTH_START','hlgbUpdateCutterExcel9227','TOTAL DO DIA','Valor por cortador — semana e mês','Mês do resumo','Semana produzida','Mês programado']
missing=[x for x in required if x not in s]
if missing: raise SystemExit('Itens v92.27 ausentes: '+repr(missing))

out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.27</title><script>(function(){window.location.replace('./app9227.html?v=92.27&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.27 preparada: data/cortador editáveis e valores produzidos por dia, semana, mês e cortador')
