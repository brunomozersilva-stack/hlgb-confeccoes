/* HLGB — checklist da facção com grade no padrão da Folha dos Cortadores */
(function(){
'use strict';
const V='2026.10.01-faction-checklist-grade-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function sizes(){try{return typeof hlgbSortedSizes==='function'?hlgbSortedSizes(db.sizes):['P','M','G','GG']}catch(e){return ['P','M','G','GG']}}
function sourceGrade(c){
 const pid=sid(c?.productId),cut=arr('cuts').find(x=>sid(x?.id)===sid(c?.cutId)),o=arr('orders').find(x=>sid(x?.id)===sid(c?.orderId));let g=[];
 if(Array.isArray(c?.gradeV9198)&&c.gradeV9198.length)g=c.gradeV9198;
 else if(Array.isArray(c?.grade)&&c.grade.length)g=c.grade;
 else if(Array.isArray(cut?.actualCutGrade)&&cut.actualCutGrade.length)g=cut.actualCutGrade;
 else if(Array.isArray(cut?.originalGrade)&&cut.originalGrade.length)g=cut.originalGrade;
 else g=o?.grade||[];
 if(pid)g=g.filter(x=>sid(x.productId||pid)===pid);
 const rows=g.map(x=>({productId:x.productId||c?.productId,color:x.color||'-',size:x.size||'',qty:q(x.qty)})).filter(x=>x.qty>0);
 const target=q(c?.qty),total=rows.reduce((a,x)=>a+x.qty,0);
 if(!rows.length||!target||!total||target===total)return rows;
 let calc=rows.map((x,i)=>{const raw=x.qty*target/total,b=Math.floor(raw);return {...x,qty:b,_f:raw-b,_i:i}}),left=Math.round(target-calc.reduce((a,x)=>a+x.qty,0));
 calc.slice().sort((a,b)=>b._f-a._f||a._i-b._i).slice(0,Math.max(0,left)).forEach(x=>calc[x._i].qty++);
 return calc.map(({_f,_i,...x})=>x).filter(x=>x.qty>0);
}
function matrix(c){
 const g=sourceGrade(c);if(!g.length)return '<div class="empty">Sem grade detalhada.</div>';
 const ss=sizes(),groups={};
 for(const x of g){const color=x.color||'-';groups[color]=groups[color]||{};groups[color][x.size]=(groups[color][x.size]||0)+q(x.qty)}
 const rows=Object.entries(groups).map(([color,map])=>'<tr><td>'+escSafe(color)+'</td>'+ss.map(s=>'<td><b>'+q(map[s])+'</b></td>').join('')+'<td><b>'+ss.reduce((a,s)=>a+q(map[s]),0)+'</b></td></tr>').join('');
 const total=g.reduce((a,x)=>a+x.qty,0);
 return '<div class="hlgbChecklistMatrix" style="overflow:auto"><table><thead><tr><th>Cor</th>'+ss.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+rows+'<tr><td colspan="'+(ss.length+1)+'" style="text-align:right"><b>Total da grade</b></td><td><b>'+total.toLocaleString('pt-BR')+'</b></td></tr></tbody></table></div>';
}
function findChecklist(id){return arr('materialChecklists').find(x=>sid(x?.id)===sid(id))||null}
const oldOpen=window.openMaterialChecklist;
if(typeof oldOpen==='function'&&!oldOpen.__hlgbChecklistMatrixV1){
 const w=function(id){
  const r=oldOpen.apply(this,arguments);
  setTimeout(()=>{
   const c=findChecklist(id),modal=document.getElementById('modal');if(!c||!modal)return;
   const h=[...modal.querySelectorAll('h3,h2')].find(x=>/Grade do produto/i.test(x.textContent||''));if(!h)return;
   let el=h.nextElementSibling;
   if(el&&!el.classList.contains('hlgbChecklistMatrix')){
    const wrap=document.createElement('div');wrap.innerHTML=matrix(c);const node=wrap.firstElementChild;
    if(el)el.replaceWith(node);else h.insertAdjacentElement('afterend',node);
   }
  },0);
  return r;
 };w.__hlgbChecklistMatrixV1=true;w.__original=oldOpen;window.openMaterialChecklist=w;
}
const oldPrint=window.printMaterialChecklist;
window.printMaterialChecklist=function(id){
 const c=findChecklist(id);if(!c)return oldPrint?.apply(this,arguments);
 const mats=(c.materials||[]).map(m=>'<tr><td>☐</td><td>'+escSafe(m.name||'')+'</td><td>'+escSafe(m.cat||'-')+'</td><td>'+escSafe(m.color||'Total')+'</td><td>'+q(m.qty).toLocaleString('pt-BR',{maximumFractionDigits:3})+'</td><td>'+escSafe(m.unit||'')+'</td><td>'+(m.rolls!=null?q(m.rolls)+' rolo'+(q(m.rolls)===1?'':'s'):'-')+'</td></tr>').join('');
 const w=window.open('','_blank');if(!w)return alert('Permita pop-ups para imprimir.');
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Checklist — '+escSafe(c.destinationName||'')+'</title><style>body{font-family:Arial;padding:26px;color:#222}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #aaa;padding:7px;font-size:12px;text-align:center}th:first-child,td:first-child{text-align:left}h1{font-size:21px}h2{font-size:16px}</style></head><body><h1>HLGB Confecções — Checklist da facção</h1><p><b>Destino:</b> '+escSafe(c.destinationName||'-')+'<br><b>Modelo:</b> '+escSafe(c.productName||'-')+'<br><b>Quantidade:</b> '+q(c.qty).toLocaleString('pt-BR')+' peças</p><h2>Grade do produto enviado</h2>'+matrix(c)+'<h2>Matéria-prima / aviamentos</h2><table><tr><th>OK</th><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr>'+(mats||'<tr><td colspan="7">Sem materiais cadastrados.</td></tr>')+'</table><p>Conferido por: __________________________ Data: ____/____/________</p><p>Observação: ______________________________________________________________</p><script>window.onload=()=>window.print();<\/script></body></html>');
 w.document.close();
};
window.hlgbFactionChecklistGrade={sourceGrade,matrix};
window.HLGB_FACTION_CHECKLIST_GRADE_GUARD=V;
console.info('[HLGB] checklist da facção com grade em matriz');
})();