from pathlib import Path
import re

p=Path('app9240.html')
s=p.read_text()
pattern=r"window\.hlgbAdjustCutGrade9191=function\(id\)\{.*?\n\};"
m=re.search(pattern,s,re.S)
if not m:
    raise SystemExit('função hlgbAdjustCutGrade9191 não encontrada')
new=r'''window.hlgbAdjustCutGrade9191=function(id){
  let c=(db.cuts||[]).find(x=>String(x.id)===String(id));if(!c)return;let o=orderFor9191(c),backup=clone9191(c);
  let orig=clone9191(cutOriginalGrade(c,o)),actual=Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length?clone9191(c.actualCutGrade):clone9191(orig);
  if(orig.length&&!c.originalGrade)c.originalGrade=clone9191(orig);
  let body='';
  if(orig.length){
    let sizes=(typeof hlgbSortedSizes==='function'?hlgbSortedSizes(db.sizes||[]):[]).map(x=>String(x||'')).filter(Boolean);
    let present=[...new Set(orig.map(x=>String(x.size||'')).filter(Boolean))];
    present.forEach(s=>{if(!sizes.includes(s))sizes.push(s)});if(!sizes.length)sizes=present;
    let groups={};
    orig.forEach((it,i)=>{
      let p=(db.products||[]).find(x=>String(x.id)===String(it.productId)),color=String(it.color||'-'),size=String(it.size||''),key=String(it.productId||p?.name||'Produto')+'|'+color;
      if(!groups[key])groups[key]={product:p?.name||'Produto',color,cells:{},expectedTotal:0};
      let a=actual.find(x=>String(x.productId)===String(it.productId)&&String(x.color||'')===String(it.color||'')&&String(x.size||'')===String(it.size||''));
      (groups[key].cells[size]||(groups[key].cells[size]=[])).push({i,expected:+it.qty||0,actual:a?.qty??it.qty??0});
      groups[key].expectedTotal+=+it.qty||0;
    });
    let heads=sizes.map(s=>`<th>${esc9191(s)}</th>`).join('');
    let rows=Object.values(groups).map(g=>{
      let cells=sizes.map(s=>{
        let items=g.cells[s]||[];if(!items.length)return '<td style="text-align:center;color:#aaa">—</td>';
        return `<td style="text-align:center">${items.map(x=>`<div class="cut-grade-cell9421"><div class="sub" style="font-size:10px;margin-bottom:3px">Prev. ${(+x.expected||0).toLocaleString('pt-BR')}</div><input id="adj9191_${x.i}" type="number" min="0" step="1" value="${x.actual}" aria-label="${esc9191(g.product)} ${esc9191(g.color)} ${esc9191(s)}"></div>`).join('')}</td>`;
      }).join('');
      return `<tr><td><b>${esc9191(g.product)}</b></td><td>${esc9191(g.color)}</td>${cells}<td><b>${(+g.expectedTotal||0).toLocaleString('pt-BR')}</b></td></tr>`;
    }).join('');
    body=`<div class="sub" style="margin-bottom:8px">Mesma grade usada na folha dos cortadores: cores nas linhas e tamanhos nas colunas.</div><div class="sub" style="margin-bottom:10px">Em cada tamanho, <b>Prev.</b> é o pedido e o campo editável é o corte real. O pedido original fica preservado.</div><div class="order-matrix-wrap"><table class="order-matrix cut-grade-matrix9421"><thead><tr><th>Modelo</th><th>Cor</th>${heads}<th>Total previsto</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }else body=`<div class="field"><label>Quantidade real do corte</label><input id="adjPieces9191" type="number" min="0" step="1" value="${+c.pieces||0}"></div>`;
  body+=`<div class="field" style="margin-top:12px"><label>Motivo / observação</label><textarea id="adjNote9191" placeholder="Ex.: faltou material preto tamanho M">${esc9191(c.cutAdjustmentNote||'')}</textarea></div><button class="primary modalSave">☁️ Salvar ajuste da grade</button>`;
  openModal('Ajustar grade do corte',body,async()=>{
    if(orig.length){let next=orig.map((it,i)=>({...it,qty:Math.max(0,+document.getElementById('adj9191_'+i)?.value||0)}));c.actualCutGrade=next;c.pieces=next.reduce((s,x)=>s+(+x.qty||0),0)}else c.pieces=Math.max(0,+document.getElementById('adjPieces9191')?.value||0);
    c.cutAdjustmentNote=document.getElementById('adjNote9191')?.value||'';c.gradeAdjustedAt=new Date().toISOString();
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
    try{await saveCut9191(c,backup);if(isFinal9191(c)&&typeof syncFinalizedCutsToProduction==='function')syncFinalizedCutsToProduction();closeModal();try{renderCuts()}catch(e){}try{renderDailyCuts()}catch(e){}try{renderCutters()}catch(e){}try{renderProduction()}catch(e){};return true}catch(e){console.error(e);if(btn){btn.disabled=false;btn.textContent='☁️ Salvar ajuste da grade'}alert('Não foi possível confirmar o ajuste na nuvem. A grade anterior foi mantida.');return false}
  });
};'''
s=s[:m.start()]+new+s[m.end():]
p.write_text(s)
