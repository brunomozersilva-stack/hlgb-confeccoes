from pathlib import Path
import re

src=Path('app9220.html')
out=Path('app9221.html')
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
    let cutters=(db.cutters||[]).filter(c=>c.active!==false).map(c=>({id:c.id,name:c.name||'Cortador'}));
    if((db.cuts||[]).some(c=>!c.cutterId&&dayIds.includes(cutDay(c))))cutters.push({id:'',name:'⚠ Sem cortador'});
    const heads=days.map(d=>`<th>${d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</th>`).join('');
    const rows=cutters.map(ct=>{
      let weekTotal=0,weekValue=0;
      const cells=dayIds.map(day=>{
        const cuts=cutsForDay9179(ct.id,day),total=cuts.reduce((a,c)=>a+(+c.pieces||0),0),value=cuts.reduce((a,c)=>a+cutMoney(c),0);
        weekTotal+=total;weekValue+=value;
        const chips=cuts.map(c=>{
          const isDone=norm(c.status)==='finalizado';
          const displayDate=cutDay(c)||day;
          return `<div class="hlgb9179-cut-chip hlgb9191-clean-chip hlgb9221-edit-chip">
            <strong>${esc9179(cleanModel(c))}</strong>
            <span>${(+c.pieces||0).toLocaleString('pt-BR')} pç · ${isDone?'✓ cortado':'a cortar'}</span>
            <small class="hlgb9221-local">📍 ${esc9179(locationName(c))} · ${typeof money==='function'?money(cutMoney(c)):cutMoney(c).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</small>
            <div class="hlgb9221-inline-edit">
              <label>Data<input type="date" value="${displayDate||''}" onchange="hlgbUpdateCutterExcel9221('${String(c.id).replace(/'/g,"\\'")}','date',this.value)"></label>
              <label>Cortador<select onchange="hlgbUpdateCutterExcel9221('${String(c.id).replace(/'/g,"\\'")}','cutterId',this.value)">${cutterOptions(c.cutterId)}</select></label>
            </div>
          </div>`;
        }).join('');
        return `<td>${chips||'<span class="sub">—</span>'}${total?`<div class="hlgb9179-week-total">${total.toLocaleString('pt-BR')} pç</div><div class="hlgb9221-day-value">${typeof money==='function'?money(value):value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>`:''}</td>`;
      }).join('');
      return `<tr><td class="cutter-name">${esc9179(ct.name)}</td>${cells}<td class="hlgb9179-week-total">${weekTotal.toLocaleString('pt-BR')} pç<br><span class="hlgb9221-day-value">${typeof money==='function'?money(weekValue):weekValue.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></td></tr>`;
    }).join('');

    const allWeekCuts=(db.cuts||[]).filter(c=>dayIds.includes(cutDay(c)));
    const locIds=[...new Set(allWeekCuts.map(c=>String(c.productionLocationId||'')))];
    const locationRows=locIds.map(lid=>{
      const lname=lid?((db.productionLocations||[]).find(x=>String(x.id)===lid)?.name||'Local'):'Sem local';
      let weekPieces=0,weekVal=0;
      const cells=dayIds.map(day=>{
        const cuts=allWeekCuts.filter(c=>String(c.productionLocationId||'')===lid&&cutDay(c)===day);
        const pcs=cuts.reduce((a,c)=>a+(+c.pieces||0),0),val=cuts.reduce((a,c)=>a+cutMoney(c),0);
        weekPieces+=pcs;weekVal+=val;
        return `<td>${pcs?`<b>${pcs.toLocaleString('pt-BR')} pç</b><br><span class="hlgb9221-location-value">${typeof money==='function'?money(val):val.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>`:'<span class="sub">—</span>'}</td>`;
      }).join('');
      return `<tr><td class="cutter-name">${esc9179(lname)}</td>${cells}<td><b>${weekPieces.toLocaleString('pt-BR')} pç</b><br><span class="hlgb9221-location-value">${typeof money==='function'?money(weekVal):weekVal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></td></tr>`;
    }).join('');

    el.innerHTML=`<div class="toolbar" style="justify-content:space-between;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px"><div><button class="secondary" onclick="hlgbMoveCutterWeek9179(-1)">← Semana anterior</button> <button class="secondary" onclick="hlgbCurrentCutterWeek9179()">Esta semana</button> <button class="secondary" onclick="hlgbMoveCutterWeek9179(1)">Próxima semana →</button></div><div class="field"><label>Semana</label><input type="date" value="${cutterWeek9179}" onchange="hlgbSetCutterWeek9179(this.value)"></div><button class="secondary" onclick="hlgbPrintCutterExcel9179()">🖨️ Imprimir</button></div>
      <div class="hlgb9179-excel-wrap"><table class="hlgb9179-excel"><thead><tr><th>Cortador</th>${heads}<th>Total semana</th></tr></thead><tbody>${rows||'<tr><td colspan="9">Nenhum cortador cadastrado.</td></tr>'}</tbody></table></div>
      <div class="hlgb9221-location-title"><b>💰 Valor por dia em cada local</b><span class="sub">Peças e valor total dos cortes programados/finalizados por local.</span></div>
      <div class="hlgb9179-excel-wrap"><table class="hlgb9179-excel hlgb9221-location-table"><thead><tr><th>Local</th>${heads}<th>Total semana</th></tr></thead><tbody>${locationRows||'<tr><td colspan="9">Nenhum corte programado nesta semana.</td></tr>'}</tbody></table></div>`;
  };
  window.hlgbPrintCutterExcel9179=function'''
s,n=re.subn(pat,new,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'Função da projeção Excel não substituída: {n}')

addon=r'''<!-- HLGB_V9221_CUTTER_EXCEL_CONTROLS_START -->
<style>
.hlgb9221-edit-chip{min-width:180px}
.hlgb9221-local{display:block;margin-top:4px;color:#6f3f59;font-weight:700}
.hlgb9221-inline-edit{display:grid;grid-template-columns:1fr;gap:5px;margin-top:7px;padding-top:6px;border-top:1px dashed #ddced6}
.hlgb9221-inline-edit label{font-size:10px;color:#786b73;font-weight:700}
.hlgb9221-inline-edit input,.hlgb9221-inline-edit select{display:block;width:100%;margin-top:2px;padding:5px;border:1px solid #d9ccd3;border-radius:6px;background:#fff;font-size:11px}
.hlgb9221-day-value,.hlgb9221-location-value{color:#6f3f59;font-weight:800;white-space:nowrap}
.hlgb9221-location-title{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin:18px 0 8px;font-size:16px}
.hlgb9221-location-table .cutter-name{min-width:170px}
@media print{.hlgb9221-inline-edit{display:none!important}}
</style>
<script>
(function(){
'use strict';
function clone9221(x){try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}}
async function saveCut9221(c){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('A conexão com a nuvem não está pronta.');
  const r=await window.hlgbRecordSaveWithRetry('cuts',String(c.id),clone9221(c),false);
  if(!r||r.applied===false)throw new Error(r?.reason||'A nuvem não confirmou a alteração.');
  return r.data||c;
}
window.hlgbUpdateCutterExcel9221=async function(id,field,value){
  const c=(db.cuts||[]).find(x=>String(x.id)===String(id));if(!c){alert('Corte não encontrado.');return}
  const before=clone9221(c);
  if(field==='cutterId')c.cutterId=value?+value:null;
  if(field==='date'){
    if(String(c.status||'').toLowerCase()==='finalizado')c.finishedAt=value;
    else c.plannedCutDate=value;
  }
  try{
    if(typeof localSaveOnly==='function')localSaveOnly();
    await saveCut9221(c);
    if(typeof hlgbRenderCutterExcel9179==='function')hlgbRenderCutterExcel9179();
    try{if(typeof renderCuts==='function')renderCuts()}catch(e){}
  }catch(e){
    Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,before);
    try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(_e){}
    if(typeof hlgbRenderCutterExcel9179==='function')hlgbRenderCutterExcel9179();
    alert('Não foi possível salvar a alteração na nuvem: '+String(e?.message||e));
  }
};
function stamp9221(){
  try{document.title='HLGB Confecções — Sistema de Gestão v92.21 Multiusuário'}catch(e){}
  const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.21';
}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(stamp9221,120),0);
setTimeout(stamp9221,700);
console.log('[HLGB] v92.21 projeção semanal dos cortadores com valores por local e edição direta');
})();
</script>
<!-- HLGB_V9221_CUTTER_EXCEL_CONTROLS_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]

s=s.replace('v92.20','v92.21')
s=s.replace('app9220.html','app9221.html')

if 'HLGB_V9221_CUTTER_EXCEL_CONTROLS_START' not in s: raise SystemExit('Marcador v92.21 ausente')
if 'hlgbUpdateCutterExcel9221' not in s: raise SystemExit('Edição direta ausente')
if 'Valor por dia em cada local' not in s: raise SystemExit('Resumo por local ausente')

out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.21</title><script>(function(){window.location.replace('./app9221.html?v=92.21&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.21 preparada: valores por local/dia e edição direta de data/cortador')
