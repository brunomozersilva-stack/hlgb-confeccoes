/* HLGB v95.23 — folha completa do cortador, somente leitura e impressão.
   Usa a grade deste corte e a ficha técnica cadastrada; não grava nem dá baixa. */
(function(){
'use strict';
const V='95.23-cutter-sheet-materials';
const sid=v=>String(v==null?'':v);
const qty=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:0};
const esc=v=>sid(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=v=>Number(qty(v).toFixed(4)).toLocaleString('pt-BR',{maximumFractionDigits:4});
const arr=k=>{try{return Array.isArray(db&&db[k])?db[k]:[]}catch(_){return []}};
const byId=(k,id)=>arr(k).find(x=>sid(x&&x.id)===sid(id))||null;
const orderNo=o=>{try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):o.orderNumber||o.id}catch(_){return o.orderNumber||o.id}};
function gradeOf(o,c){
 const pid=sid(c.productId);
 const chosen=Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length&&
   sid(c.status).toLowerCase()==='finalizado'?c.actualCutGrade:
   Array.isArray(c.originalGrade)&&c.originalGrade.length?c.originalGrade:
   Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length?c.actualCutGrade:o.grade||[];
 return chosen.filter(g=>g&&(!pid||!g.productId||sid(g.productId)===pid)&&qty(g.qty)>0);
}
function planMaterials(p,pieces){
 if(!p||!Array.isArray(p.materials)||!p.materials.length)return [];
 return p.materials.map(m=>{
   const catalog=byId('materials',m.materialId);
   const per=qty(m.qty),loss=qty(m.loss),mode=sid(m.calcMode||'consumption');
   const valid=per>0&&(mode==='yield'||mode==='consumption');
   const predicted=valid?(mode==='yield'?pieces/per:pieces*per)*(1+loss/100):null;
   const unit=sid(m.unit||catalog&&catalog.unit||'');
   return {name:sid(m.name||catalog&&catalog.name||''),unit,
     calculated:Number.isFinite(predicted)?predicted:null,
     rule:valid?(mode==='yield'?'Rend. '+fmt(per)+' pç/'+unit:'Cons. '+fmt(per)+' '+unit+'/pç')+(loss?' · perda '+fmt(loss)+'%':''):'',
     warning:!valid};
 });
}
function gradeMatrix(grade){
 const sizes=[...new Set(grade.map(g=>sid(g.size||'-')))];
 const colors=[...new Set(grade.map(g=>sid(g.color||'-')))];
 const sizeOrder=['PP','P','M','G','GG','XG','G1','G2','G3','G4'];
 sizes.sort((a,b)=>{const ai=sizeOrder.indexOf(a.toUpperCase()),bi=sizeOrder.indexOf(b.toUpperCase());return (ai<0?100:ai)-(bi<0?100:bi)||a.localeCompare(b,'pt-BR')});
 if(!sizes.length)return '<p>Sem grade cadastrada para este modelo.</p>';
 const rows=colors.map(color=>{
   const cells=sizes.map(sz=>grade.filter(g=>sid(g.color||'-')===color&&sid(g.size||'-')===sz).reduce((s,g)=>s+qty(g.qty),0));
   return '<tr><td>'+esc(color)+'</td>'+cells.map(v=>'<td class="num">'+fmt(v)+'</td>').join('')+
     '<td class="num"><b>'+fmt(cells.reduce((a,b)=>a+b,0))+'</b></td></tr>';
 }).join('');
 return '<table><thead><tr><th>Cor</th>'+sizes.map(sz=>'<th>'+esc(sz)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+rows+
   '<tr><th>Total</th>'+sizes.map(sz=>'<th class="num">'+fmt(grade.filter(g=>sid(g.size||'-')===sz).reduce((s,g)=>s+qty(g.qty),0))+'</th>').join('')+
   '<th class="num">'+fmt(grade.reduce((s,g)=>s+qty(g.qty),0))+'</th></tr></tbody></table>';
}
function materialTable(materials){
 const list=materials.length?materials:Array.from({length:6},()=>({name:'',unit:'',calculated:null,rule:''}));
 const rows=list.map(m=>
  '<tr><td>'+esc(m.name)+'</td><td>'+esc(m.unit)+'</td><td>'+esc(m.rule||'')+'</td>'+
  '<td class="num">'+(m.calculated==null?'':fmt(m.calculated))+'</td>'+
  '<td class="write"></td><td class="write"></td><td class="blank"></td><td class="write"></td></tr>').join('');
 return '<table class="materials-table"><thead><tr><th>Matéria-prima</th><th>Un.</th><th>Base do cálculo</th><th>Previsto</th>'+
  '<th>Real usado</th><th>Diferença</th><th>Aprov. %</th><th>Observações</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
// Materiais de corte: deduzir da ficha técnica, sem assumir que aviamentos
// (alças, ganchos etc.) precisam de uma linha de pesagem. Uma linha por material.
function cuttableMaterials(p,planned){
 const original=Array.isArray(p&&p.materials)?p.materials:[];
 const seen=new Set(),result=[];
 for(let i=0;i<planned.length;i++){
  const m=original[i]||{},entry=planned[i]||{},catalog=byId('materials',m.materialId);
  const name=sid(entry.name||m.name||catalog&&catalog.name||'').trim();
  const unit=sid(entry.unit||m.unit||catalog&&catalog.unit||'').trim();
  const cat=sid(m.cat||m.category||m.type||catalog&&catalog.category||catalog&&catalog.cat||'').trim();
  const hint=(name+' '+cat).toLowerCase();
  const textile=/(tule|tull|renda|malha|tecido|romantic|suplex|microfibra|lycra|viscose|cetim|canelado|veludo|crepe|tricoline|cotton)/i.test(hint);
  const trim=/(alça|alca|gancho|argola|bot[aã]o|el[aá]stico|etiqueta|vi[eé]s|aviamento|fita|la[cç]o|aro)/i.test(hint);
  const weight=/(^|\W)(kg|quilo|quilos)(\W|$)/i.test(unit);
  if(!textile&&(!weight||trim))continue;
  const key=name.toLowerCase()+'::'+unit.toLowerCase();
  if(!name||seen.has(key))continue;
  seen.add(key);result.push({name,unit});
 }
 return result;
}
function weightTable(p,materials){
 const cuttable=cuttableMaterials(p,materials);
 const rows=cuttable.length?cuttable:Array.from({length:3},()=>({name:'',unit:''}));
 const body=rows.map(m=>'<tr><td>'+esc(m.name)+'</td><td class="weight-fill"></td><td class="weight-fill"></td>'+
  '<td class="weight-fill"></td><td class="weight-fill"></td></tr>').join('');
 return '<table class="weigh-table"><thead><tr><th>Matéria-prima (cortável)</th>'+
  '<th>Peso total (kg)</th><th>Peso usado (kg)</th><th>Lixo / retalho (kg)</th><th>Aproveitamento (%)</th></tr></thead><tbody>'+
  body+'<tr class="total-row"><th>Total</th><td></td><td></td><td></td><td></td></tr></tbody></table>';
}
function extraColors(grade){
 const colors=[...new Set(grade.map(g=>sid(g.color||'').trim()).filter(Boolean))];
 return colors.length?colors:['Cor 1','Cor 2','Cor 3'];
}
function extraTable(p,c,grade,pieces){
 const colors=extraColors(grade),visibleColors=colors.slice(0,8),remaining=colors.slice(8);
 const ths=visibleColors.map(x=>'<th class="color-cell">'+esc(x)+'</th>').join('')+
   '<th class="color-cell">Outras</th>';
 const blanks=visibleColors.map(()=>'<td class="fill-color"></td>').join('')+'<td class="fill-color"></td>';
 const finalized=sid(c.status).trim().toLowerCase()==='finalizado';
 const actual=finalized?fmt(grade.reduce((a,g)=>a+qty(g.qty),0)):'';
 const main='<tr><td>'+esc(p&&p.name||c.product||'Peça principal')+'</td>'+
  '<td class="num">'+fmt(pieces)+'</td><td class="num">'+actual+'</td>'+
  '<td></td>'+blanks+'<td></td></tr>';
 const extras=Array.from({length:4},()=>'<tr><td class="model-write"></td><td></td><td></td><td></td>'+
  blanks+'<td></td></tr>').join('');
 return '<table class="extras-table"><thead><tr><th rowspan="2">Peça / modelo extra</th>'+
  '<th rowspan="2">Previsto<br>(principal)</th><th rowspan="2">Cortado<br>(principal)</th>'+
  '<th rowspan="2">Aproveitamento<br>(+/-)</th><th colspan="'+(visibleColors.length+1)+'">Quantidade de peças extras por cor</th>'+
  '<th rowspan="2">Total</th></tr><tr>'+ths+'</tr></thead><tbody>'+main+extras+'</tbody></table>'+
  (remaining.length?'<div class="tiny">Cores adicionais (anotar em “Outras”): '+esc(remaining.join(', '))+'</div>':'');
}
function renderSheet(o,c){
 const p=byId('products',c.productId),cut=byId('cutters',c.cutterId);
 const cutter2=byId('cutters',c.cutter2Id||c.secondCutterId);
 const grade=gradeOf(o,c);
 const plannedGrade=(Array.isArray(c.originalGrade)&&c.originalGrade.length?c.originalGrade:o.grade||[])
  .filter(g=>g&&(!c.productId||!g.productId||sid(g.productId)===sid(c.productId))&&qty(g.qty)>0);
 const plannedPieces=plannedGrade.reduce((sum,g)=>sum+qty(g.qty),0);
 const pieces=plannedPieces||grade.reduce((sum,g)=>sum+qty(g.qty),0);
 const materials=planMaterials(p,pieces);
 const dense=extraColors(grade).length>=5?' dense-sheet':'';
 const when=sid(c.plannedCutDate||c.date||'').slice(0,10);
 const finalized=sid(c.status).toLowerCase()==='finalizado';
 const title=esc(p&&p.name||c.product||'Modelo');
 const cutterName=esc(cut&&cut.name||'_____________________');
 const cutter2Name=esc(cutter2&&cutter2.name||c.cutter2Name||'_____________________');
 const infesterName=esc(c.infesterName||c.infestador||'_____________________');
 const css=
 '<style>'+
 '@page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html,body{margin:0;padding:0}'+
 'body{font:10px/1.18 Arial,Helvetica,sans-serif;color:#23132d;background:#fff}'+
 '.sheet{max-width:196mm;margin:auto}'+
 '.brandline{display:grid;grid-template-columns:1.04fr 3.7fr .62fr;gap:7px;align-items:stretch;margin-bottom:6px}'+
 '.brand{font:bold 17px/0.98 Arial;color:#3b1260;text-align:center;padding:0 4px;align-self:center}'+
 '.brand small{display:block;font-size:10px}'+
 '.doc-title{font:bold 16px/1.05 Arial;color:white;background:#531179;padding:10px 6px;text-align:center;border-radius:7px}'+
 '.doc-ref{border:1px solid #75389b;border-radius:6px;text-align:center;padding:9px 3px;font-weight:bold}'+
 '.meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #8852aa;border-radius:5px;margin-bottom:5px}'+
 '.meta-column{padding:3px 8px;min-width:0}'+
 '.meta-column+ .meta-column{border-left:1px solid #b18bc7}'+
 '.meta-field{min-height:16px;padding:3px 0;border-bottom:1px dotted #e5d7ec;overflow-wrap:anywhere}'+
 '.meta-field:last-child{border-bottom:none}'+
 '.operators{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:7px}'+
 '.operator{border:1px solid #8150a2;border-radius:5px;min-height:23px;padding:5px 6px;overflow-wrap:anywhere}'+
 '.section-title{background:#531179;color:white;border-radius:4px;padding:4px 7px;font-size:11.4px;line-height:1.08;margin:7px 0 4px;font-weight:700}'+
 '.tiny{font-size:8.6px;color:#543b61;margin:3px 0 4px}'+
 'table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9.2px}'+
 'th,td{border:1px solid #a07bb4;padding:2.5px 4px;vertical-align:middle;overflow-wrap:anywhere}'+
 'th{background:#e8d9f1;font-weight:700;text-align:center}'+
 'td{height:21px}'+
 '.num{text-align:right}.write,.blank,.weight-fill,.fill-color,.model-write{height:21px}'+
 '.total-row th,.total-row td{background:#f0e6f8;font-weight:700}'+
 '.grade-row{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr);gap:5px;align-items:start}'+
 '.grade-row table th:first-child{text-align:left;width:27%}'+
 '.main-grade{min-width:0}.extra-summary{min-width:0}'+
 '.extra-summary .mini-head{background:#eadbf6;border:1px solid #a07bb4;border-bottom:none;'+
 'font-weight:bold;text-align:center;padding:4px 3px;min-height:23px}'+
 '.extra-summary table td{height:23px}'+
 '.materials-table{font-size:9px}.materials-table th:nth-child(1){width:19%}'+
 '.materials-table th:nth-child(2){width:6%}.materials-table th:nth-child(3){width:21%}'+
 '.materials-table th:nth-child(4){width:10%}.materials-table th:nth-child(5){width:11%}'+
 '.materials-table th:nth-child(6){width:10%}.materials-table th:nth-child(7){width:10%}'+
 '.materials-table th:nth-child(8){width:13%}'+
 '.weigh-row{display:grid;grid-template-columns:minmax(0,2.6fr) minmax(0,.95fr);gap:6px;align-items:start}'+
 '.weigh-table{font-size:9px}.weigh-table th:first-child{width:27%}'+
 '.weigh-table td{height:23px}'+
 '.weigh-summary{border:1px solid #956bb0;border-radius:4px;font-size:9.3px}'+
 '.weigh-summary strong{display:block;background:#eadbf6;border-bottom:1px solid #956bb0;padding:4px 6px}'+
 '.weigh-summary div{padding:4.5px 6px;border-bottom:1px solid #e0d0ea;min-height:20px}'+
 '.weigh-summary div:last-child{border-bottom:none}'+
 '.extras-table{font-size:9px}.extras-table th:first-child{min-width:29mm}'+
 '.extras-table th[rowspan="2"]:first-child{width:19%}'+
 '.extras-table th[rowspan="2"]:nth-child(2),.extras-table th[rowspan="2"]:nth-child(3){width:9%}'+
 '.extras-table th[rowspan="2"]:nth-child(4){width:11%}'+
 '.extras-table th[rowspan="2"]:last-child{width:8%}'+
 '.extras-table td{height:23px}'+
 '.summary-row{display:grid;grid-template-columns:1.15fr 2.7fr;gap:6px}'+
 '.checklist,.notes{border:1px solid #a07bb4;border-radius:5px;padding:6px;min-height:76px}'+
 '.checklist strong,.notes strong{display:block;color:#48106c;font-size:10px;margin-bottom:3px}'+
 '.checkitem{display:block;white-space:nowrap;font-size:9.2px;line-height:1.4}'+
 '.box-check{display:inline-block;width:9px;height:9px;border:1px solid #8958aa;margin-right:6px}'+
 '.note-line{display:block;border-bottom:1px solid #8958aa;height:18px}'+
 '.signatures{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) .72fr;gap:11px;align-items:end;'+
 'margin-top:21px;text-align:center;font-size:9px}'+
 '.signature-line{border-top:1px solid #421264;padding:4px 2px 0;min-height:27px}'+
 '.date-line{border-bottom:1px solid #421264;text-align:center;min-height:11px}'+
 '.tools{margin:12px 0;text-align:right}.tools button{padding:8px 16px;border:1px solid #531179;'+
 'border-radius:5px;background:#531179;color:white;cursor:pointer}'+
 '@media screen{body{padding:13px;max-width:920px;margin:auto}}'+
 '@media print{body{width:100%;max-width:none;padding:0}.sheet{width:100%;max-width:none}'+
 '.tools{display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
 'h2,table,tr,.meta,.summary-row,.signatures{break-inside:avoid;page-break-inside:avoid}}'+
 '@media print{'+
 '.sheet.dense-sheet .section-title{margin:5px 0 3px;padding:3px 6px}'+
 '.sheet.dense-sheet .grade-row th,.sheet.dense-sheet .grade-row td{padding:1.5px 3px;height:16px}'+
 '.sheet.dense-sheet .extra-summary table td{height:17px}'+
 '.sheet.dense-sheet .materials-table th,.sheet.dense-sheet .materials-table td{padding:1.5px 3px}'+
 '.sheet.dense-sheet .materials-table td{height:18px}'+
 '.sheet.dense-sheet .weigh-table th,.sheet.dense-sheet .weigh-table td{padding:1.5px 3px}'+
 '.sheet.dense-sheet .weigh-table td{height:20px}'+
 '.sheet.dense-sheet .extras-table td{height:20px}'+
 '.sheet.dense-sheet .signatures{margin-top:12px}'+
 '.sheet.dense-sheet .note-line{height:15px}'+
 '}' +
 '</style>';
 const mini='<div class="extra-summary"><div class="mini-head">Aproveitamento do corte<br><span class="tiny">(peças extras)</span></div>'+
  '<table><thead><tr><th>Peça extra</th><th>Qtd.</th></tr></thead><tbody>'+
  '<tr><td></td><td></td></tr><tr><td></td><td></td></tr><tr><td></td><td></td></tr></tbody></table></div>';
 const checklist=['Grade conferida','Materiais conferidos','Pesagem realizada',
   'Aproveitamento conferido','Peças extras registradas']
  .map(x=>'<span class="checkitem"><i class="box-check"></i>'+esc(x)+'</span>').join('');
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>HLGB — folha de grade do cortador</title>'+
 css+'</head><body><div class="tools"><button onclick="window.print()">Imprimir / salvar PDF</button></div><main class="sheet'+dense+'">'+
 '<div class="brandline"><div class="brand">HLGB<small>Confecções</small></div>'+
 '<div class="doc-title">FOLHA DE GRADE DO CORTADOR</div><div class="doc-ref">Nº ______</div></div>'+
 '<div class="meta">'+
 '<div class="meta-column"><div class="meta-field"><b>Pedido:</b> #'+esc(orderNo(o))+'</div>'+
 '<div class="meta-field"><b>Modelo:</b> '+title+'</div>'+
 '<div class="meta-field"><b>Cliente:</b> '+esc(o.client||'-')+'</div></div>'+
 '<div class="meta-column"><div class="meta-field"><b>Peças previstas:</b> '+fmt(pieces)+'</div>'+
 '<div class="meta-field"><b>Corte:</b> '+esc(c.id||'-')+'</div>'+
 '<div class="meta-field"><b>Tipo do corte:</b> '+esc(c.cutType||'___________')+'</div></div>'+
 '<div class="meta-column"><div class="meta-field"><b>Data programada:</b> '+esc(when||'____/____/______')+'</div>'+
 '<div class="meta-field"><b>Status:</b> '+(finalized?'Finalizado':'Pendente / programado')+'</div>'+
 '<div class="meta-field"><b>Observação (geral):</b> ____________</div></div></div>'+
 '<div class="operators"><div class="operator"><b>✂ Cortador 1:</b> '+cutterName+'</div>'+
 '<div class="operator"><b>✂ Cortador 2:</b> '+cutter2Name+'</div>'+
 '<div class="operator"><b>Infestador:</b> '+infesterName+'</div></div>'+
 '<h2 class="section-title">1. Grade por cor e tamanho (peça principal)</h2>'+
 '<div class="grade-row"><div class="main-grade">'+gradeMatrix(grade)+'</div>'+mini+'</div>'+
 '<h2 class="section-title">2. Conferência de matérias-primas</h2>'+
 '<div class="tiny">'+(materials.length?
 'Materiais e previsão da ficha técnica do modelo, calculados para '+fmt(pieces)+' peças.':
 'Sem ficha técnica com materiais cadastrados: preencher os materiais, unidades e quantidades manualmente.')+'</div>'+
 materialTable(materials)+
 '<h2 class="section-title">3. Pesagem e aproveitamento do corte (materiais cortáveis)</h2>'+
 '<div class="weigh-row"><div>'+weightTable(p,materials)+'</div>'+
 '<div class="weigh-summary"><strong>Resumo do corte</strong>'+
 '<div>Peso total recebido: ______ kg</div><div>Peso usado no corte: ______ kg</div>'+
 '<div>Total de lixo / retalho: ______ kg</div><div>Aproveitamento geral: ______ %</div></div></div>'+
 '<h2 class="section-title">4. Aproveitamento de corte e peças extras</h2>'+
 '<div class="tiny">Peças obtidas além da quantidade prevista (ex.: calcinhas, fio, etc.). Registrar por cor.</div>'+
 extraTable(p,c,grade,pieces)+
 '<h2 class="section-title">5. Resumo final do corte</h2>'+
 '<div class="summary-row"><div class="checklist"><strong>☑ Conferências</strong>'+checklist+'</div>'+
 '<div class="notes"><strong>Observações e divergências</strong>'+
 '<span class="note-line"></span><span class="note-line"></span><span class="note-line"></span></div></div>'+
 '<div class="signatures"><div class="signature-line">Assinatura do Cortador 1</div>'+
 '<div class="signature-line">Assinatura do Cortador 2</div>'+
 '<div class="signature-line">Assinatura do Infestador / Conferência</div>'+
 '<div>Data: ____/____/______</div></div>'+
 '</main></body></html>';
}
function printSheet(o,c){
 const popup=window.open('','_blank');
 if(!popup)throw Error('O navegador bloqueou a janela de impressão. Autorize pop-ups e tente novamente.');
 popup.document.open();popup.document.write(renderSheet(o,c));popup.document.close();
 popup.focus();return true;
}
// A ação nova fica disponível também nas linhas dos cortes tradicionais.
function cutIdFromRow(tr){
 for(const b of tr.querySelectorAll('button[onclick]')){
   const raw=b.getAttribute('onclick')||'';
   const m=raw.match(/(?:hlgbEditCut9189|editCut|finishCut)\(([^)]+)\)/);
   if(m)return m[1].replace(/['"]/g,'').trim();
 }
 return '';
}
function addActionButtons(){
 for(const rootId of ['cutTable','dailyCutsTable']){
   const root=document.getElementById(rootId);if(!root)continue;
   root.querySelectorAll('tbody tr').forEach(tr=>{
     if(tr.querySelector('.hlgbSheetMaterials9523'))return;
     const c=byId('cuts',cutIdFromRow(tr));if(!c||!c.productId||!byId('orders',c.orderId))return;
     const cell=tr.lastElementChild;if(!cell)return;
     const b=document.createElement('button');b.type='button';b.className='secondary hlgbSheetMaterials9523';
     b.textContent='🖨️ Folha completa';b.onclick=()=>{try{printSheet(byId('orders',c.orderId),c)}catch(e){alert(sid(e.message||e))}};
     cell.appendChild(document.createTextNode(' '));cell.appendChild(b);
   });
 }
}
const beforeRender=window.renderCuts;
if(typeof beforeRender==='function'&&!beforeRender.__hlgbSheetMaterials9523){
 const patched=function(){const val=beforeRender.apply(this,arguments);setTimeout(addActionButtons,0);return val};
 patched.__hlgbSheetMaterials9523=true;window.renderCuts=patched;
}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(addActionButtons,1000),0)}catch(_){}
setTimeout(addActionButtons,1800);

const legacy=window.printCuttingSheet;
function wrapped(orderId,cutId){
 const c=cutId!=null?byId('cuts',cutId):null;
 const o=c?byId('orders',c.orderId):byId('orders',orderId);
 if(!o||!c||!c.productId){
   if(typeof legacy==='function')return legacy.apply(this,arguments);
   alert('Não foi possível localizar um corte por modelo para imprimir.');return false;
 }
 try{return printSheet(o,c)}catch(e){console.warn('[HLGB '+V+']',e);alert(sid(e.message||e));return false}
}
wrapped.__hlgbCutterSheetV9523=true;
if(typeof legacy==='function'&&!legacy.__hlgbCutterSheetV9523)window.printCuttingSheet=wrapped;
window.hlgbCutterSheetV9523={gradeOf,planMaterials,gradeMatrix,renderSheet,printSheet,original:legacy,version:V};
console.info('[HLGB] '+V+' folha com ficha técnica e preenchimento manual ativa');
})();