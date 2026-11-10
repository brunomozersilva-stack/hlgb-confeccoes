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
 const rows=(materials.length?materials:Array.from({length:6},()=>({name:'',unit:'',calculated:null,rule:''}))).map(m=>
  '<tr><td>'+esc(m.name)+'</td><td>'+esc(m.unit)+'</td><td>'+esc(m.rule||'')+'</td>'+
  '<td class="num">'+(m.calculated==null?'':fmt(m.calculated))+'</td>'+
  '<td class="write"></td><td class="write"></td><td class="write"></td></tr>').join('');
 return '<table><thead><tr><th>Matéria-prima</th><th>Un.</th><th>Base do cálculo</th><th>Previsto</th>'+
   '<th>Real usado</th><th>Diferença</th><th>Observações</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function renderSheet(o,c){
 const p=byId('products',c.productId),cut=byId('cutters',c.cutterId);
 const grade=gradeOf(o,c),pieces=grade.reduce((sum,g)=>sum+qty(g.qty),0);
 const mat=planMaterials(p,pieces);
 const when=sid(c.plannedCutDate||c.date||'').slice(0,10);
 const isFinal=sid(c.status).toLowerCase()==='finalizado';
 const title=esc(p&&p.name||c.product||'Modelo');
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>HLGB — folha do cortador</title>'+
 '<style>@page{size:A4 portrait;margin:11mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#222;margin:18px auto;max-width:850px}h1{font-size:21px;margin:0}h2{font-size:14px;margin:18px 0 7px;border-bottom:1px solid #bbb;padding-bottom:5px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;border:1px solid #bbb;padding:10px;margin:10px 0}.meta div{min-height:29px}.small{font-size:10px;color:#555}table{border-collapse:collapse;width:100%;font-size:11px;table-layout:auto}th,td{border:1px solid #888;padding:6px;text-align:left;vertical-align:middle}th{background:#f1f1f1}.num{text-align:right}.write{min-width:65px;height:30px}.lines{border-bottom:1px solid #999;height:30px}.footer{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin-top:24px}.tools{text-align:right;margin-bottom:20px}.tools button{padding:9px 18px;cursor:pointer}.warning{font-weight:bold}thead{display:table-header-group}tr{break-inside:avoid}@media print{body{margin:0;max-width:none}.tools{display:none}}</style></head><body>'+
 '<div class="tools"><button onclick="window.print()">Imprimir / salvar PDF</button></div>'+
 '<h1>HLGB Confecções — folha de grade do cortador</h1><p class="small">Documento de conferência · não realiza baixas nem lançamentos automáticos.</p>'+
 '<div class="meta">'+
 '<div><b>Pedido:</b> #'+esc(orderNo(o))+'</div><div><b>Corte:</b> '+esc(c.id||'-')+'</div><div><b>Data programada:</b> '+esc(when||'____/____/______')+'</div>'+
 '<div><b>Modelo:</b> '+title+'</div><div><b>Cliente:</b> '+esc(o.client||'-')+'</div><div><b>Cortador:</b> '+esc(cut&&cut.name||'________________')+'</div>'+
 '<div><b>Peças previstas:</b> '+fmt(pieces)+'</div><div><b>Tipo do corte:</b> '+esc(c.cutType||'____________')+'</div><div><b>Status:</b> '+(isFinal?'Finalizado':'Pendente / programado')+'</div>'+
 '</div><h2>1. Grade por cor e tamanho</h2><p class="small">'+(isFinal?'Grade registrada como realmente cortada.':'Grade vigente deste corte (pode ser alterada no sistema antes da finalização).')+'</p>'+gradeMatrix(grade)+
 '<h2>2. Conferência de matérias-primas</h2>'+
 '<p class="'+(mat.length?'small':'warning')+'">'+(mat.length?'Materiais e previsão da ficha técnica do modelo, calculados para '+fmt(pieces)+' peças. Anotar o consumo real e a diferença na mesma unidade.':
 'Sem ficha técnica com materiais cadastrados: preencher os materiais, unidades e quantidades manualmente.')+'</p>'+
 materialTable(mat)+
 '<h2>3. Pesagem / aproveitamento do corte</h2>'+
 '<table><tbody><tr><td>Peso total de materiais recebidos: __________ kg</td><td>Peso usado no corte: __________ kg</td></tr>'+
 '<tr><td>Sobras / retalhos: __________ kg</td><td>Quantidade realmente cortada: __________ peças</td></tr>'+
 '<tr><td>Lote / rolo do tecido: __________________________</td><td>Enfesto / camadas: __________________________</td></tr></tbody></table>'+
 '<h2>4. Observações e divergências</h2><div class="lines"></div><div class="lines"></div><div class="lines"></div>'+
 '<div class="footer"><div>Assinatura do cortador: _____________________</div><div>Conferência / data: _____________________</div></div>'+
 '</body></html>';
}
function printSheet(o,c){
 const popup=window.open('','_blank');
 if(!popup)throw Error('O navegador bloqueou a janela de impressão. Autorize pop-ups e tente novamente.');
 popup.document.open();popup.document.write(renderSheet(o,c));popup.document.close();
 popup.focus();return true;
}
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