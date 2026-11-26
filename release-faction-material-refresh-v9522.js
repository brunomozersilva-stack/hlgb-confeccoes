/* HLGB v95.22 — atualizacao segura de materiais de envios ja criados.
 * Original continua imutavel ate usuario confirmar e RPC responder com readback.
 * As baixas/conferencias ja feitas nunca sao redefinidas automaticamente.
 */
(function(){
'use strict';
if(window.hlgbFactionMaterialRefresh9522)return;
const V='95.32',M='materialChecklists',WAL_DB='hlgb_durable_wal';
const state={version:V,lastError:'',lastSuccess:null,busy:false,installed:false,guardedPrints:0};
const sid=v=>String(v??''),qty=v=>Number(v)||0,
 esc=v=>sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
const clone=v=>JSON.parse(JSON.stringify(v));
const fmt=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:4});
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||{}}
function rows(module){const r=dbRef()[module];return Array.isArray(r)?r:[]}
function lookup(id){return rows(M).find(x=>sid(x?.id)===sid(id))||null}
function product(id){return rows('products').find(x=>sid(x?.id)===sid(id))||null}
function materialKey(m){const id=sid(m?.materialId);return id?'id:'+id:'name:'+norm(m?.name)+'|'+norm(m?.unit)}
function gradeRowsForChecklist(c,pieces){
 const target=Math.floor(Number(pieces)),data=dbRef(),pid=sid(c?.productId);
 let rows=[];
 // Usa a mesma grade impressa no cabeçalho do checklist (com corte real prioritário).
 try{
  if(typeof window.hlgbFactionChecklistGrade?.sourceGrade==='function'){
   rows=window.hlgbFactionChecklistGrade.sourceGrade(c)||[];
  }
 }catch(e){console.warn('[HLGB materiais '+V+'] grade oficial',e)}
 if(!rows.length){
  const cut=rowsFor(data,'cuts').find(x=>sid(x?.id)===sid(c?.cutId));
  const order=rowsFor(data,'orders').find(x=>sid(x?.id)===sid(c?.orderId));
  const raw=[c?.gradeV9198,c?.grade,cut?.actualCutGrade,cut?.originalGrade,order?.grade]
   .find(x=>Array.isArray(x)&&x.length)||[];
  rows=raw.filter(x=>!pid||sid(x?.productId||pid)===pid)
   .map(x=>({color:sid(x.color),qty:Number(x.qty)}))
   .filter(x=>Number.isFinite(x.qty)&&x.qty>0);
 }
 if(!rows.length)return [{color:'Total',qty:target}];
 rows=rows.map(x=>({color:sid(x.color||'Total').trim()||'Total',qty:Number(x.qty)}))
  .filter(x=>Number.isFinite(x.qty)&&x.qty>0);
 if(!rows.length)return [{color:'Total',qty:target}];
 const sum=rows.reduce((total,x)=>total+x.qty,0);
 if(sum<=0)return [{color:'Total',qty:target}];
 if(Math.round(sum)!==target){
  const scaled=rows.map((x,i)=>{
   const raw=x.qty*target/sum,qty=Math.floor(raw);
   return {...x,qty,remainder:raw-qty,index:i};
  });
  const left=target-scaled.reduce((total,x)=>total+x.qty,0);
  for(const x of scaled.slice().sort((x,y)=>y.remainder-x.remainder||x.index-y.index).slice(0,left))
   scaled[x.index].qty++;
  rows=scaled.filter(x=>x.qty>0).map(x=>({color:x.color,qty:x.qty}));
 }
 return rows;
}
function rowsFor(data,module){return Array.isArray(data?.[module])?data[module]:[]}
function rollDetails(master,need){
 if(!master)return {rolls:null,rollConversion:0,rollLabel:''};
 let conv=0;
 const unit=norm(master.purchaseUnit),mode=norm(master.purchaseMode),name=norm(master.packageName);
 if((unit.includes('rolo')||mode.includes('rolo'))&&Number(master.purchaseConversion)>0)
  conv=Number(master.purchaseConversion);
 else if(name.includes('rolo')&&Number(master.packageAvg)>0)
  conv=Number(master.packageAvg);
 if(!conv||!Number.isFinite(conv))return {rolls:null,rollConversion:0,rollLabel:''};
 return {rolls:Math.ceil(need/conv-1e-9),rollConversion:conv,rollLabel:'rolo'};
}
function buildMaterials(productRow,pieces,destinationType='F',checklist=null){
 if(!productRow||!Array.isArray(productRow.materials))return null;
 const amount=Number(pieces);
 if(!Number.isInteger(amount)||amount<=0)throw new Error('Quantidade de peças inválida para o envio.');
 const grade=gradeRowsForChecklist({...checklist,productId:checklist?.productId||productRow.id},amount);
 const byColor=new Map();
 for(const row of grade){const color=row.color||'Total';byColor.set(color,(byColor.get(color)||0)+Number(row.qty))}
 if([...byColor.values()].reduce((sum,n)=>sum+n,0)!==amount)
  throw new Error('A grade não corresponde à quantidade do checklist; confira o corte antes de gerar os materiais.');
 const out=[],keyMap=new Map();
 for(const [index,m] of productRow.materials.entries()){
  const master=rows('materials').find(x=>sid(x?.id)===sid(m?.materialId))||
   rows('materials').find(x=>norm(x?.name)===norm(m?.name))||null;
  const visible=destinationType==='F'?(master?.showFactionChecklist??m?.showFactionChecklist)!==false:
   (master?.showProductionChecklist??m?.showProductionChecklist)!==false;
  if(!visible)continue;
  const per=Number(m?.qty),loss=Number(m?.loss||0);
  if(!Number.isFinite(per)||per<0||!Number.isFinite(loss)||loss<0)
   throw new Error('Ficha técnica com consumo ou perda inválido. Corrija o produto.');
  const mode=sid(m?.calcMode||'consumption');
  if(mode!=='consumption'&&mode!=='yield')throw new Error('Modo de cálculo de material desconhecido.');
  const name=sid(m?.name||master?.name).trim(),unit=sid(m?.unit||master?.unit).trim(),
   cat=sid(m?.cat||master?.cat).trim();
  if(!name||!unit)throw new Error('Material com nome ou unidade ausente na ficha.');
  const aviamento=norm(cat).includes('aviamento');
  const splits=aviamento?[...byColor.entries()]:[['Total',amount]];
  for(const [color,count] of splits){
   const raw=per<=0?0:(mode==='yield'?count/per:count*per)*(1+loss/100);
   if(!Number.isFinite(raw)||raw<0)throw new Error('Resultado de consumo inválido.');
   const need=Number(raw.toFixed(6)),materialId=m?.materialId??master?.id??null;
   const key=sid(materialId)+'|'+norm(name)+'|'+norm(unit)+'|'+(aviamento?norm(color):'');
   const entry=keyMap.get(key);
   if(entry){entry.qty=Number((entry.qty+need).toFixed(6));entry.rolls=rollDetails(master,entry.qty).rolls;continue}
   const ri=rollDetails(master,need);
   const row={id:index+1,materialId,name,baseName:name,cat,unit,
    color:aviamento&&color!=='Total'?color:'',pieces:count,qty:need,
    perPiece:per,loss,checked:false,calcMode:mode,source:'product_technical_sheet_v9530',
    rolls:ri.rolls,rollConversion:ri.rollConversion,rollLabel:ri.rollLabel,
    key9199:[materialId||'',name,aviamento&&color!=='Total'?color:''].join('|')};
   row.key9198=row.key9199;
   keyMap.set(key,row);out.push(row);
  }
 }
 return out;
}
// Read-only preflight before the legacy assignment handler changes production.
function assignmentMaterials9730(productionId,pieces,destinationType){
 const fail=reason=>({ok:false,reason});
 const matches=rows('production').filter(x=>sid(x?.id)===sid(productionId)&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted);
 if(!productionId||matches.length!==1)return fail('Produção não identificada de forma única.');
 const p=matches[0],amount=Number(pieces);
 if(!Number.isSafeInteger(amount)||amount<=0||amount>Number(p.planned))return fail('Quantidade a atribuir inválida.');
 if(!['F','L'].includes(destinationType))return fail('Destino inválido.');
 let pid=sid(p.productId);
 if(!pid&&typeof hlgb916ProductForProduction==='function'){
  try{pid=sid(hlgb916ProductForProduction(p)?.id)}catch(_){}
 }
 const found=rows('products').filter(x=>sid(x?.id)===pid&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted);
 if(!pid||found.length!==1||found[0].active===false||!Array.isArray(found[0].materials))return fail('Ficha técnica não identificada ou ainda não carregada. Confira o modelo antes de atribuir.');
 try{
  const materials=buildMaterials(found[0],amount,destinationType,{...p,productId:pid,qty:amount});
  if(!Array.isArray(materials))return fail('Não foi possível calcular os materiais.');
  // A ficha expressamente vazia ou os materiais ocultados pelo cadastro são
  // permitidos, mas não se confundem com erro de cálculo ou ficha ausente.
  return {ok:true,productId:pid,count:materials.length,configured:found[0].materials.length,materials};
 }catch(e){return fail(sid(e?.message||e))}
}
function guardAssignment9730(e){
 const button=e.target?.closest?.('.modalSave'),modal=document.getElementById('modal');
 if(!button||!modal?.contains?.(button))return;
 const id=document.getElementById('assignProductionId'),amount=document.getElementById('assignQty'),dest=document.getElementById('assignDestination');
 if(!id||!amount||!dest||![id,amount,dest].every(x=>modal.contains(x)))return;
 // Keep existing destination/quantity validation and the original save authority.
 const type=sid(dest.value).split(':')[0];if(!['F','L'].includes(type))return;
 const result=assignmentMaterials9730(id.value,amount.value,type);
 if(result.ok)return;
 e.preventDefault();e.stopImmediatePropagation();alert('Atribuição não realizada: '+result.reason);
}
function compare(oldRows,newRows){
 const old=Array.isArray(oldRows)?oldRows:[],next=Array.isArray(newRows)?newRows:[];
 const signature=list=>list.map(m=>({key:materialKey(m),name:norm(m.name),unit:norm(m.unit),qty:Number((Number(m.qty)||0).toFixed(6))})).sort((a,b)=>a.key.localeCompare(b.key));
 // Checklists antigos nao continham materialId. Comparacao por nome/unidade evita falsos alertas.
 const comparable=list=>{
  const grouped=new Map();
  for(const m of list){
   const name=norm(m.name),unit=norm(m.unit),key=name+'|'+unit;
   const qty=Number(m.qty||0);
   // Linhas auxiliares com consumo zero não mudam o material efetivamente enviado.
   if(!Number.isFinite(qty)||Math.abs(qty)<1e-9)continue;
   grouped.set(key,{name,unit,qty:(grouped.get(key)?.qty||0)+qty});
  }
  // Aviamentos antigos podem estar divididos por cor; comparar o total agregado
  // evita marcar um checklist conferido como desatualizado quando o consumo e igual.
  return [...grouped.values()].map(m=>({...m,qty:Number(m.qty.toFixed(6))}))
   .sort((a,b)=>a.name.localeCompare(b.name)||a.unit.localeCompare(b.unit));
 };
 const structure=list=>list.map(m=>({
   key:norm(m.name)+'|'+norm(m.unit)+'|'+norm(m.color||'Total'),
   qty:Number((Number(m.qty)||0).toFixed(6))
  })).sort((a,b)=>a.key.localeCompare(b.key)||a.qty-b.qty);
 const detailDifferent=JSON.stringify(structure(old))!==JSON.stringify(structure(next));
 return {different:JSON.stringify(comparable(old))!==JSON.stringify(comparable(next)),
  detailDifferent,oldCount:old.length,newCount:next.length,
  oldSignature:signature(old),newSignature:signature(next)};
}
function analyze(c){
 const p=product(c?.productId);
 if(!c||!p||!Array.isArray(p.materials))return {status:'unavailable',reason:'A ficha técnica do modelo ainda não está carregada.'};
 let material;
 try{material=buildMaterials(p,c.qty,c.destinationType,c)}catch(e){return {status:'error',reason:String(e.message||e)}}
 const diff=compare(c.materials,material);
 const anyChecked=(c.materials||[]).some(m=>m.checked===true);
 const alreadyReceived=!!sid(c.receivedAt).trim()||!!sid(c.receivedBy).trim()||sid(c.status)==='Conferido';
 const locked=anyChecked||alreadyReceived;
 // O wrapper antigo da tela podia criar as linhas por cor só em memória,
 // enquanto o Supabase continuava com as 3 linhas somadas. Exigir prova
 // persistente antes de declarar uma ficha antiga como já separada.
 const unconfirmedLegacy=sid(c.materialsSourceV9522)==='product_technical_sheet'&&
   !sid(c.materialsSourceV9532)&&material.some(m=>!!sid(m.color));
 const detailNeeded=diff.detailDifferent||unconfirmedLegacy;
 return {...diff,detailDifferent:detailNeeded,materials:material,product:p,
    status:diff.different?'stale':detailNeeded?'detail-needed':'current',
    locked,lockedReason:locked?'Há item conferido ou recebimento registrado; não é seguro substituir automaticamente.':'',
    productName:p.name||c.productName};
}
function htmlRows(materials){
 return '<div style="overflow-x:auto"><table><thead><tr><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr></thead><tbody>'+
 (materials||[]).map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.cat||'-')+'</td><td>'+esc(m.color||'Total')+'</td>'+
 '<td>'+fmt(m.qty)+'</td><td>'+esc(m.unit)+'</td><td>'+(m.rolls==null?'-':fmt(m.rolls))+'</td></tr>').join('')+
 '</tbody></table></div>';
}
function decorateChecklistActions9728(table,checks){
 if(typeof table?.querySelectorAll!=='function')return;
 const map=new Map(checks.map(x=>[sid(x.c.id),x.check]));
 for(const btn of table.querySelectorAll('button[onclick]')){
  const m=sid(btn.getAttribute('onclick')).match(/^\s*(?:return\s+)?openMaterialChecklist\(\s*(['"]?)([^'")\s]+)\1\s*\)\s*;?\s*$/);if(!m)continue;
  const id=m[2],review=map.get(id),host=btn.parentElement;if(!host)continue;
  const old=[...host.querySelectorAll('[data-hlgb-checklist-recover9728]')].find(x=>x.dataset.hlgbChecklistRecover9728===id);
  const stale=review&&['stale','detail-needed','error','unavailable'].includes(review.status);
  if(!stale){old?.remove();continue}
  const label=review.status==='error'||review.status==='unavailable'?'Revisar ficha técnica':review.locked?'Conferir diferenças de materiais':review.oldCount===0&&review.newCount>0?'Recuperar materiais do checklist':'Atualizar materiais do checklist';
  const action=old||document.createElement('button');
  if(!old){action.type='button';action.className='secondary';action.dataset.hlgbChecklistRecover9728=id;action.style.cssText='margin:4px 0;white-space:normal;max-width:100%;overflow-wrap:anywhere';host.appendChild(action)}
  action.textContent=label;action.onclick=()=>{if(!action.isConnected)return;openReview(id)};
  action.title=review.reason||'Conferir a ficha atual antes de salvar; não cria outro envio.';
 }
}

/* v97.34 — separação agrupada dos envios reais de facção (somente leitura). */
function groupEligible9734(c){
 if(!c||!sid(c.id)||c.destinationType!=='F'||c.deletedAt||c.deleted_at||c.deleted===true)return false;
 if(c.receivedAt||c.receivedBy||/conferido|concluido|finalizado|cancelado/.test(norm(c.status)))return false;
 try{if(typeof checklistClosed9198==='function'&&checklistClosed9198(c))return false}catch(_){return false}
 try{const idx=window.hlgbWriteoffIntegrity9391?.pairIndex?.();if(c.orderId&&c.productId&&idx?.has(sid(c.orderId)+'|'+sid(c.productId)))return false}catch(_){return false}
 return true;
}
function groupCandidates9734(){return rows(M).filter(groupEligible9734).slice().sort((a,b)=>sid(b.createdAt).localeCompare(sid(a.createdAt)))}
function sewingMaterial9734(m){
 // Keep only non-cut checklist supplies. Explicit category or name identifies cut material.
 const cat=norm(m.cat),name=norm(m.name);
 return !/\b(tecido|tecidos|renda|rendas|malha|malhas|tule|tules|forro|forros)\b/.test(cat)&&
        !/^(tecido|renda|malha|tule|forro)(\s|$)/.test(name);
}
function groupPlan9734(ids){
 const selected=[...new Set((Array.isArray(ids)?ids:[]).map(sid))],all=rows(M),issues=[],models=[],totals=new Map(),shipmentKeys=new Set();
 const fail=(id,reason)=>issues.push({id,reason});
 for(const id of selected){
  const found=all.filter(c=>sid(c?.id)===id);
  if(found.length!==1||!groupEligible9734(found[0])){fail(id,'Envio ausente, duplicado, concluído ou baixado.');continue}
  const c=found[0],label=sid(c.productName||id);
  if(!Number.isSafeInteger(Number(c.qty))||Number(c.qty)<=0){fail(id,label+': quantidade inválida.');continue}
  const key=c.productionId?JSON.stringify([sid(c.productionId),sid(c.destinationId||c.destinationName),norm(c.serviceName),Number(c.qty)]):'';
  if(key&&shipmentKeys.has(key)){fail(id,label+': possível envio duplicado. Confira os checklists.');continue}
  if(key)shipmentKeys.add(key);
  if((c.materials||[]).some(m=>m.checked===true)){fail(id,label+': separação individual já iniciada; confira o saldo na folha.');continue}
  const ps=rows('products').filter(p=>sid(p?.id)===sid(c.productId)&&!p.deleted_at&&!p.deletedAt&&!p.deleted);
  if(ps.length!==1||!Array.isArray(ps[0].materials)){fail(id,label+': ficha técnica ausente ou ambígua.');continue}
  let review;try{review=analyze(c)}catch(_){fail(id,label+': não foi possível calcular a ficha.');continue}
  if(review.status!=='current'&&review.status!=='detail-needed'){fail(id,label+': '+(review.reason||'checklist desatualizado; revise o envio individual antes de separar.'));continue}
  if(review.locked){fail(id,label+': conferência individual iniciada.');continue}
  const items=review.materials.filter(m=>sewingMaterial9734(m)&&m.qty>0);
  if(items.some(m=>!sid(m.materialId)||!sid(m.unit)||!Number.isFinite(m.qty))){fail(id,label+': material sem código/unidade confiável. Revise a ficha.');continue}
  models.push({id,product:label,destination:sid(c.destinationName),orderId:sid(c.orderId),pieces:Number(c.qty),detailNeeded:review.status==='detail-needed',items});
  for(const m of items){
   const k=JSON.stringify([sid(m.materialId),norm(m.unit),norm(m.color)]),conv=Number(m.rollConversion)||0;
   let r=totals.get(k);
   if(!r){r={materialId:sid(m.materialId),name:m.name,unit:m.unit,color:m.color||'',qty:0,rollConversion:conv,rolls:null};totals.set(k,r)}
   if(r.rollConversion!==conv){fail(id,label+': conversão de rolo divergente para '+m.name);}
   r.qty=Number((r.qty+m.qty).toFixed(6));
   r.rolls=r.rollConversion>0?Math.ceil(r.qty/r.rollConversion-1e-9):null;
  }
 }
 return {ok:selected.length>0&&issues.length===0,selected:selected.length,pieces:models.reduce((a,m)=>a+m.pieces,0),models,issues,totals:[...totals.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.color.localeCompare(b.color,'pt-BR'))};
}
function groupTable9734(items){return '<div style="overflow:auto;max-width:100%"><table><thead><tr><th>Material</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos inteiros</th></tr></thead><tbody>'+items.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.color||'Não discriminada')+'</td><td>'+fmt(m.qty)+'</td><td>'+esc(m.unit)+'</td><td>'+(m.rolls==null?'—':fmt(m.rolls))+'</td></tr>').join('')+'</tbody></table></div>'}
function groupReport9734(result){
 if(!result.ok)return '<p class="sub">'+(result.selected?'Total bloqueado até resolver as pendências.':'Selecione os envios que deseja separar.')+'</p>'+result.issues.map(x=>'<p role="alert">'+esc(x.reason)+' (envio '+esc(x.id)+')</p>').join('');
 return '<h3>'+result.selected+' envios · '+fmt(result.pieces)+' peças</h3><h3>Separação total por material e cor</h3>'+
 (result.totals.length?groupTable9734(result.totals):'<p>Nenhum aviamento ou insumo de costura com consumo positivo nesta seleção.</p>')+
 '<p class="sub">Rolos inteiros arredondados após somar o consumo da mesma cor/unidade. Cor não discriminada não é uma cor confirmada. Tecidos e rendas ficam fora deste resumo.</p>'+
 (result.models.some(m=>m.detailNeeded)?'<p class="sub">Há envios cuja divisão por cor foi calculada pela ficha atual; confira a folha individual antes de distribuir.</p>':'')+
 '<h3>Distribuição por envio</h3>'+result.models.map(m=>'<details><summary>'+esc(m.product)+' · '+esc(m.destination)+' · '+fmt(m.pieces)+' peças · envio '+esc(m.id)+'</summary>'+groupTable9734(m.items)+'</details>').join('');
}
function groupAccess9734(){try{return window.__HLGB_AUTH_READY===true&&typeof canOpenPage==='function'&&canOpenPage('faccoes')&&canOpenPage('produtos')&&canOpenPage('materiais')}catch(_){return false}}
function groupActor9734(){try{return sid(typeof cloudUser!=='undefined'?cloudUser?.id:typeof currentUser==='function'?currentUser()?.id:'')}catch(_){return ''}}
function openGroup9734(){
 const actor=groupActor9734();if(!groupAccess9734()||!actor||typeof openModal!=='function')return;
 const selected=new Set();
 openModal('Separação em grupo — Facções','<div id="hlgbGroupMaterials9734" style="min-width:0;max-width:100%"><p class="sub">Marque os envios ainda não conferidos. Soma somente materiais do checklist de facção, sem tecido/renda de corte. Não registra baixa nem altera estoque.</p><label>Buscar modelo, facção ou pedido <input id="hlgbGroupSearch9734" type="search" style="width:100%;box-sizing:border-box"></label><div class="toolbar" style="flex-wrap:wrap"><button type="button" class="secondary" id="hlgbGroupAll9734">Selecionar visíveis</button><button type="button" class="secondary" id="hlgbGroupClear9734">Limpar seleção</button></div><div id="hlgbGroupChoices9734" style="max-height:260px;overflow:auto"></div><div id="hlgbGroupOutput9734" role="status"></div><button type="button" class="secondary" id="hlgbGroupPrint9734" disabled>Imprimir resumo</button> <button type="button" class="secondary" onclick="closeModal()">Fechar</button></div>',()=>{});
 const root=document.getElementById('hlgbGroupMaterials9734');if(!root)return;
 const search=root.querySelector('#hlgbGroupSearch9734'),choices=root.querySelector('#hlgbGroupChoices9734'),out=root.querySelector('#hlgbGroupOutput9734'),print=root.querySelector('#hlgbGroupPrint9734');
 const valid=()=>root.isConnected&&groupAccess9734()&&groupActor9734()===actor&&!!root.closest('#modal.show');
 const visible=()=>groupCandidates9734().filter(c=>norm([c.productName,c.destinationName,c.orderId,c.id].join(' ')).includes(norm(search.value)));
 const draw=()=>{if(!valid()){root.replaceChildren();return}choices.innerHTML=visible().map(c=>'<label style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #ddd;overflow-wrap:anywhere"><input type="checkbox" value="'+esc(c.id)+'" '+(selected.has(sid(c.id))?'checked':'')+'> <span>'+esc(c.productName)+' · '+esc(c.destinationName)+' · '+fmt(c.qty)+' peças · pedido '+esc(c.orderId||'—')+' · envio '+esc(c.id)+'</span></label>').join('')||'<p>Nenhum envio pendente encontrado.</p>';const result=groupPlan9734([...selected]);out.innerHTML=groupReport9734(result);print.disabled=!result.ok};
 search.oninput=draw;
 choices.onchange=e=>{const id=sid(e.target?.value);if(e.target?.type==='checkbox'){if(e.target.checked)selected.add(id);else selected.delete(id);draw()}};
 root.querySelector('#hlgbGroupAll9734').onclick=()=>{for(const c of visible())selected.add(sid(c.id));draw()};
 root.querySelector('#hlgbGroupClear9734').onclick=()=>{selected.clear();draw()};
 print.onclick=()=>{if(!valid())return;const result=groupPlan9734([...selected]);if(!result.ok){draw();return}const w=window.open('','_blank');if(!w)return alert('Permita pop-ups para imprimir.');w.document.write('<!doctype html><meta charset="utf-8"><title>Separação em grupo — Facções</title><style>body{font:14px Arial;margin:24px}table{border-collapse:collapse;width:100%}th,td{padding:5px;border:1px solid #aaa;text-align:left}details{margin:10px 0}</style><h1>HLGB — Separação em grupo</h1>'+groupReport9734(result).replace(/<details>/g,'<details open>')+'<p>Planejamento somente leitura · conferir fisicamente cada envio.</p>');w.document.close();w.print()};
 draw();
}
function ensureGroupButton9734(){
 const panel=document.getElementById('factionChecklistPanel9176'),toolbar=panel?.querySelector?.('.toolbar'),old=document.getElementById('hlgbGroupButton9734');
 if(!groupAccess9734()||!groupActor9734()||!toolbar){old?.remove?.();return}
 if(old)return;
 const button=document.createElement('button');button.id='hlgbGroupButton9734';button.type='button';button.className='secondary';button.textContent='Separação em grupo';button.onclick=openGroup9734;toolbar.appendChild(button);
}

function ensurePanel(){
 ensureGroupButton9734();
 const targets=[
  {table:'destinationChecklistTable',panel:'hlgbMaterialRevisions9522',factionOnly:false},
  {table:'factionChecklistTable9176',panel:'hlgbFactionMaterialRevisions9522',factionOnly:true}
 ];
 for(const target of targets){
  const table=document.getElementById(target.table);
  if(!table)continue;
  let panel=document.getElementById(target.panel);
  if(!panel){
   panel=document.createElement('section');panel.id=target.panel;
   panel.className='panel';panel.style.cssText='margin:10px 0;border:1px solid #e9dce4;background:#fffafd';
   table.insertAdjacentElement('afterend',panel);
  }
  const checked=rows(M).filter(c=>!target.factionOnly||c.destinationType==='F').map(c=>({c,check:analyze(c)}));
  decorateChecklistActions9728(table,checked);
  const stale=checked.filter(x=>['stale','detail-needed'].includes(x.check.status));
  const unavailable=checked.filter(x=>['unavailable','error'].includes(x.check.status)).length;
  // A divergência fica abaixo da lista normal de envios; não ocupa o topo.
  if(panel.previousElementSibling!==table)table.insertAdjacentElement('afterend',panel);
  const wasOpen=panel.querySelector('details')?.open||false;
  panel.innerHTML='<details class="hlgbMaterialReviewDetails9529"><summary style="cursor:pointer;font-weight:600">'+
   'Revisar materiais dos envios · '+stale.length+' pendência(s) de material/cor'+
   (unavailable?' · '+unavailable+' ficha(s) indisponível(is)':'')+'</summary>'+
   '<div class="sub" style="margin:9px 0">As quantidades do envio original e a ficha atual são comparadas antes de qualquer alteração. Recebimentos já lançados não serão substituídos.</div>'+
   (stale.length?stale.map(({c,check})=>
    '<div style="padding:8px 0;border-bottom:1px solid #e5e5e5"><b>'+esc(check.productName)+'</b> · '+esc(c.destinationName||'Destino')+
    ' · '+fmt(c.qty)+' peças · '+check.oldCount+' linha(s) no envio / '+check.newCount+' na ficha'+
    (check.locked?'<div class="sub">Revisão manual · '+(c.receivedAt?'Recebimento em '+esc(c.receivedAt):'Conferência já iniciada')+'</div>':'')+
    '<button type="button" class="secondary" data-material-revision9522="'+esc(c.id)+'">Comparar materiais</button></div>'
   ).join(''):'<div class="sub">Nenhuma divergência detectada nas fichas carregadas.</div>')+
   (unavailable?'<div class="sub">⚠️ '+unavailable+' ficha(s) não carregada(s). Não confirmar sem os dados.</div>':'')+
   '</details>';
  const details=panel.querySelector('details');if(details)details.open=wasOpen;
  panel.onclick=e=>{const btn=e.target?.closest?.('[data-material-revision9522]');if(btn)openReview(btn.getAttribute('data-material-revision9522'))};
 }
}
async function getRemote(module,id){
 if(typeof cloudRequest!=='function')throw new Error('A conexão com a nuvem não está disponível.');
 const uri='hlgb_records?select=module,entity_id,revision,updated_at,updated_by,data,deleted_at&module=eq.'+
  encodeURIComponent(module)+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const resp=await cloudRequest(uri,{method:'GET'});
 if(!Array.isArray(resp))throw new Error('A nuvem não confirmou a leitura.');
 const rec=resp.find(x=>sid(x.module)===module&&sid(x.entity_id)===sid(id)&&!x.deleted_at);
 if(!rec||!(Number(rec.revision)>0))throw new Error('Registro não encontrado ou sem revisão na nuvem.');
 return rec;
}
function isRelevantPending(op,c){
 const module=sid(op?.module),id=sid(op?.id);
 return (module===M&&id===sid(c.id))||
        (module==='products'&&id===sid(c.productId))||
        (module==='production'&&sid(c.productionId)&&id===sid(c.productionId));
}
async function assertNoPending(c){
 let raw;
 try{raw=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null')}catch(e){throw new Error('WAL local ilegível.')}
 if(raw&&!raw.entries)throw new Error('WAL local incompleta.');
 if(Object.values(raw?.entries||{}).some(op=>isRelevantPending(op,c)))throw new Error('Alteração pendente para este envio no armazenamento local.');
 let queue;
 try{queue=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null')}catch(e){throw new Error('Fila de sincronização ilegível.')}
 for(const [module,entries] of Object.entries(queue?.modules||{})){
  if(!Array.isArray(entries))throw new Error('Fila local inválida.');
  if(entries.some(op=>isRelevantPending({...op,module},c)))throw new Error('Sincronização pendente neste envio ou produto.');
 }
 if(typeof indexedDB==='undefined')throw new Error('IndexedDB indisponível para conferir pendências.');
 await new Promise((resolve,reject)=>{
  let req,created=false;
  try{req=indexedDB.open(WAL_DB)}catch(e){reject(new Error('WAL IndexedDB indisponível.'));return}
  req.onupgradeneeded=()=>{created=true;try{req.transaction.abort()}catch(_){}};
  req.onerror=()=>reject(new Error(created?'Diário local não inicializado.':'Falha ao conferir WAL IndexedDB.'));
  req.onsuccess=()=>{
   const database=req.result;
   if(!database.objectStoreNames.contains('entries')){database.close();reject(new Error('Estrutura WAL não localizada.'));return}
   let settled=false;
   const rejectOnce=e=>{if(!settled){settled=true;try{database.close()}catch(_){}reject(e)}};
   try{
    const tx=database.transaction('entries','readonly'),cursor=tx.objectStore('entries').openCursor();
    cursor.onsuccess=()=>{const p=cursor.result;if(p){if(isRelevantPending(p.value,c))return rejectOnce(new Error('Há alteração pendente neste envio no IndexedDB.'));p.continue()}};
    cursor.onerror=()=>rejectOnce(new Error('Não foi possível ler as pendências no IndexedDB.'));
    tx.onerror=()=>rejectOnce(new Error('Leitura do IndexedDB interrompida.'));
    tx.oncomplete=()=>{if(!settled){settled=true;database.close();resolve()}};
   }catch(e){rejectOnce(e)}
  };
 });
}
function syncSnapshot(module,rec){
 const id=sid(rec.entity_id),revision=Number(rec.revision);
 let map=null,lastSeen=null;
 try{if(typeof hlgbRecordSnapshots!=='undefined')map=hlgbRecordSnapshots?.[module]}catch(e){}
 if(!(map instanceof Map))map=window.hlgbRecordSnapshots?.[module];
 if(!(map instanceof Map))throw new Error('Cache de revisão do sistema não disponível. Reabra a tela.');
 const current=map.get(id);
 if(current&&Number(current.revision||0)>revision)throw new Error('Há revisão local mais recente.');
 map.set(id,{module,entity_id:id,data:clone(rec.data),revision,deleted_at:null,updated_at:sid(rec.updated_at),updated_by:rec.updated_by??null});
 try{if(typeof hlgbRecordLastSeen!=='undefined'&&sid(rec.updated_at)>sid(hlgbRecordLastSeen[module]||''))hlgbRecordLastSeen[module]=sid(rec.updated_at)}catch(e){}
}
async function reloadAndSave(id){
 if(state.busy)return false;
 const current=lookup(id),c=current?clone(current):null,local=analyze(c);
 if(!c||!['stale','detail-needed'].includes(local.status))return false;
 if(local.locked)throw new Error('O envio já tem conferência/recebimento. É necessária conciliação manual; nenhuma baixa foi alterada.');
 if(window.__HLGB_AUTH_READY!==true||navigator.onLine===false||typeof cloudRequest!=='function')
  throw new Error('Faça login e conecte-se à nuvem antes de atualizar.');
 state.busy=true;state.lastError='';
 try{
  await assertNoPending(c);
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  const [remoteCheck,remoteProd]=await Promise.all([getRemote(M,id),getRemote('products',c.productId)]);
  const check=remoteCheck.data,prod=remoteProd.data;
  if(!check||sid(check.id)!==sid(id)||!prod||sid(prod.id)!==sid(c.productId))throw Error('Identidade do checklist ou produto não confirmada.');
  const protectedKeys=['productId','orderId','productionId','cutId','destinationType','destinationId','destinationName','status'];
  if(protectedKeys.some(k=>sid(check[k]??'')!==sid(c[k]??''))||Number(check.qty)!==Number(c.qty))
   throw new Error('O envio mudou na nuvem. Reabra a página antes de prosseguir.');
  if((check.materials||[]).some(m=>m.checked)||sid(check.status)==='Conferido'||check.receivedAt||check.receivedBy)
   throw new Error('A conferência deste envio já foi iniciada. Não é possível substituir os materiais automaticamente.');
  const latest=buildMaterials(prod,check.qty,check.destinationType,check);
  const stillDifferent=compare(check.materials,latest);
  // Se a pessoa só pediu separar por cor, proibir mudança no consumo total.
  if(local.status==='detail-needed'&&stillDifferent.different)
   throw new Error('O consumo total no servidor mudou. Faça a conferência antes de alterar por cor.');
  if(!stillDifferent.different&&!stillDifferent.detailDifferent){
   // Se o servidor gravou mas a resposta HTTP se perdeu, apenas reconciliar o cache.
   // Nunca enviar um segundo POST para a mesma revisao de materiais.
   syncSnapshot(M,remoteCheck);
   const current=lookup(id);if(current)Object.assign(current,clone(check));
   try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
   ensurePanel();window.renderDestinationChecklists?.();window.renderFactionChecklists9198?.();window.renderFactionChecklists9198?.();
   return {alreadyCurrent:true,count:latest.length,revision:remoteCheck.revision};
  }
  if(JSON.stringify((local.product.materials||[]).map(x=>[x.materialId,x.name,x.qty,x.unit,x.loss,x.calcMode]))!==
     JSON.stringify((prod.materials||[]).map(x=>[x.materialId,x.name,x.qty,x.unit,x.loss,x.calcMode])))
   throw new Error('A ficha técnica foi alterada em outra sessão. Atualize o navegador antes de confirmar.');
  // Impede que o checklist use uma ficha alterada por outra pessoa durante a conferência.
  const productAtCommit=await getRemote('products',c.productId);
  if(Number(productAtCommit.revision)!==Number(remoteProd.revision)||
     JSON.stringify(productAtCommit.data?.materials||[])!==JSON.stringify(prod.materials||[]))
   throw new Error('Ficha técnica alterada na nuvem durante a conferência. Reabra para calcular os materiais atuais.');
  await assertNoPending(c);
  const fresh=lookup(id);if(window.__HLGB_AUTH_READY!==true||!fresh||JSON.stringify(fresh)!==JSON.stringify(c))throw Error('O envio mudou durante a conferência. Reabra antes de salvar.');
  const payload={...check,materials:latest,materialsSourceV9532:'per_color_confirmed',
   materialSheetRevisionV9522:Number(remoteProd.revision),
   materialsRefreshedAtV9522:new Date().toISOString(),materialsSourceV9522:'product_technical_sheet',
   materialsRevisionReasonV9522:'Conferência explícita após atualização da ficha técnica'};
  const out=await cloudRequest('rpc/hlgb_save_record',{method:'POST',headers:{Prefer:'return=representation'},
   body:JSON.stringify({p_module:M,p_entity_id:sid(id),p_data:payload,p_expected_revision:Number(remoteCheck.revision),p_deleted:false})});
  const applied=Array.isArray(out)?out[0]:out;
  if(applied?.applied!==true)throw new Error('Conflito de revisão. Nenhum material local foi substituído.');
  const confirmed=await getRemote(M,id),proof=compare(confirmed.data.materials,latest);
  const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  if(JSON.stringify(stable(confirmed.data))!==JSON.stringify(stable(payload))||proof.different||proof.detailDifferent||Number(confirmed.revision)<=Number(remoteCheck.revision)||
   sid(confirmed.data.materialsSourceV9522)!=='product_technical_sheet'||
   sid(confirmed.data.materialsSourceV9532)!=='per_color_confirmed')
    throw new Error('O servidor ainda não confirmou os materiais. Confira antes de repetir.');
  syncSnapshot(M,confirmed);
  const dbRow=lookup(id);
  if(dbRow)Object.assign(dbRow,clone(confirmed.data));
  try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){console.warn('[HLGB v95.22] cache local',e)}
  state.lastSuccess={id:sid(id),count:latest.length,revision:confirmed.revision,at:new Date().toISOString()};
  ensurePanel();window.renderDestinationChecklists?.();window.renderFactionChecklists9198?.();
  return state.lastSuccess;
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{state.busy=false}
}
function comparisonRows(oldItems,newItems){
 const group=list=>{
  const x=new Map();
  for(const item of Array.isArray(list)?list:[]){
   const key=norm(item.name)+'|'+norm(item.unit);
   const prior=x.get(key)||{name:sid(item.name),unit:sid(item.unit),qty:0};
   prior.qty+=Number(item.qty)||0;x.set(key,prior);
  }
  return x;
 };
 const old=group(oldItems),fresh=group(newItems),keys=[...new Set([...old.keys(),...fresh.keys()])];
 return keys.sort((a,b)=>a.localeCompare(b,'pt-BR')).map(key=>{
  const a=old.get(key),b=fresh.get(key),diff=(b?.qty||0)-(a?.qty||0);
  return {name:b?.name||a?.name||'',unit:b?.unit||a?.unit||'',
   original:a?a.qty:null,updated:b?b.qty:null,difference:diff,
   change:!a?'Novo na ficha':!b?'Somente no envio':Math.abs(diff)<0.000001?'Sem alteração':'Quantidade alterada'};
 });
}
function comparisonTable(current,review){
 const items=comparisonRows(current?.materials,review?.materials);
 return '<div style="overflow-x:auto"><table><thead><tr><th>Matéria-prima</th><th>Un.</th><th>No envio original</th><th>Ficha atual</th><th>Diferença</th><th>Situação</th></tr></thead><tbody>'+
 items.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.unit)+'</td>'+
  '<td>'+(m.original==null?'—':fmt(m.original))+'</td>'+
  '<td>'+(m.updated==null?'—':fmt(m.updated))+'</td>'+
  '<td>'+fmt(m.difference)+'</td><td>'+esc(m.change)+'</td></tr>').join('')+
 '</tbody></table></div>';
}
function printComparison(c,review){
 const pop=window.open('','_blank');
 if(!pop)throw new Error('O Safari bloqueou a impressão. Autorize a janela de impressão.');
 const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'+
  '<title>Conferência complementar de materiais</title>'+
  '<style>body{font:12px Arial,sans-serif;padding:22px;color:#222}table{width:100%;border-collapse:collapse}th,td{border:1px solid #777;padding:7px;text-align:left}th{background:#eee}@media print{button{display:none}}</style></head><body>'+
  '<h2>HLGB — conferência complementar (sem alteração de estoque)</h2>'+
  '<p><b>'+esc(review.productName)+'</b> · '+esc(c.destinationName)+' · '+fmt(c.qty)+' peças'+
  ' · recebimento: '+esc(c.receivedAt||'não registrado')+'</p>'+
  '<h3>Materiais separados por cor</h3>'+htmlRows(review.materials)+
  '<h3>Totais originais e atuais</h3>'+comparisonTable(c,review)+
  '<p>Este relatório compara o registro original e a ficha atual. Não comprova uma transferência física de materiais.</p>'+
  '<p>Conferido por: ______________________ Data: ____/____/______</p>'+
  '<button onclick="window.print()">Imprimir</button></body></html>';
 pop.document.open();pop.document.write(html);pop.document.close();pop.focus();
}

function openReview(id){
 const c=lookup(id);if(!c)return alert('Checklist não localizado.');
 const review=analyze(c);
 if(review.status==='error'||review.status==='unavailable')return alert(review.reason);
 if(review.status==='current')return window.__hlgbMaterialOriginalOpen9522?.(id);
 const locked=review.locked;
 const html='<div class="panel" style="background:#fff8fb"><b>'+esc(review.productName)+'</b><div>'+
  esc(c.destinationName)+' · '+fmt(c.qty)+' peça(s)</div>'+
  '<p>'+review.oldCount+' materiais registrados no envio; ficha atual possui <b>'+review.newCount+' materiais</b>.</p>'+
  (locked?'<p><b>Conferência manual necessária:</b> o envio já tem '+(c.receivedAt?'recebimento registrado em '+esc(c.receivedAt):'conferência iniciada')+'. O material original será preservado; confira fisicamente as diferenças.</p>':
   '<p>Os novos materiais serão calculados com o rendimento, consumo e perda atuais. A alteração somente será gravada após confirmação na nuvem.</p>')+
  '</div><h3>Materiais por cor na ficha atual</h3>'+htmlRows(review.materials)+
  '<h3>Comparativo dos totais</h3>'+comparisonTable(c,review)+
  '<p class="sub">Nenhuma baixa de material, pagamento, estoque ou entrega é realizada por esta atualização.</p>'+
  '<p id="hlgbMaterialRefreshError9522" role="alert" style="color:#a33"></p>'+
  (locked?'':'<button type="button" class="primary" id="hlgbMaterialRefreshConfirm9522">'+
    (review.status==='detail-needed'?'☁️ Salvar separação por cor na nuvem':'☁️ Atualizar checklist deste envio')+'</button>')+
  ' <button type="button" class="secondary" id="hlgbMaterialPrintReview9529">Imprimir conferência</button>'+
  ' <button type="button" class="secondary" onclick="closeModal()">Fechar</button>';
 if(typeof openModal!=='function')return alert('Janela do HLGB não está disponível.');
 openModal('📦 Materiais atualizados — conferência do envio',html,()=>{});
 setTimeout(()=>{
  const printButton=document.getElementById('hlgbMaterialPrintReview9529');
  if(printButton)printButton.onclick=()=>{try{printComparison(c,review)}catch(e){alert(sid(e.message||e))}};
  const button=document.getElementById('hlgbMaterialRefreshConfirm9522');
  if(button)button.onclick=async()=>{
   button.disabled=true;button.textContent='☁️ Conferindo e salvando…';
   try{
    const result=await reloadAndSave(id);
    if(!result)throw Error('Nenhuma alteração confirmada. Reabra o checklist.');
    closeModal();alert(result?.alreadyCurrent?'Materiais já estão atualizados.':
      '✅ Checklist separado por cor e confirmado na nuvem: '+result.count+' linha(s). Confira antes de separar.');
    window.__hlgbMaterialOriginalOpen9522?.(id);
   }catch(e){
    const el=document.getElementById('hlgbMaterialRefreshError9522');
    if(el)el.textContent=sid(e.message||e)+' Nenhum material foi alterado localmente sem confirmação.';
   }finally{button.disabled=false;button.textContent=review.status==='detail-needed'?'☁️ Salvar separação por cor na nuvem':'☁️ Atualizar checklist deste envio'}
  };
 },40);
}
function install(){
 if(state.installed)return;
 if(typeof window.renderDestinationChecklists!=='function'||typeof window.openMaterialChecklist!=='function')return;
 const previousRender=window.renderDestinationChecklists;
 window.renderDestinationChecklists=function(){const res=previousRender.apply(this,arguments);setTimeout(ensurePanel,0);return res};
 const previousOpen=window.openMaterialChecklist;
 window.__hlgbMaterialOriginalOpen9522=previousOpen;
 window.openMaterialChecklist=function(id){return openReview(id)};
 const oldFactionRender=window.renderFactionChecklists9198;
 if(typeof oldFactionRender==='function'&&!oldFactionRender.__hlgbMaterialRevision9522){
  const wrapped=function(){const r=oldFactionRender.apply(this,arguments);setTimeout(ensurePanel,0);return r};
  wrapped.__hlgbMaterialRevision9522=true;wrapped.__original=oldFactionRender;
  window.renderFactionChecklists9198=wrapped;
 }
 const oldPrint=window.printMaterialChecklist;
 if(typeof oldPrint==='function')window.printMaterialChecklist=function(id){
  const item=lookup(id),c=item?analyze(item):null;
  if(c&&['stale','error','unavailable'].includes(c.status)){
   state.guardedPrints++;
   alert(c.status==='stale'?'Este checklist está desatualizado em relação à ficha técnica. Confira os materiais antes de imprimir.':c.reason||'Ficha técnica não comprovada. Confira antes de imprimir.');
   return openReview(id);
  }
  return oldPrint.apply(this,arguments);
 };
 const oldCreate=window.hlgb916CreateMaterialChecklist;
 if(typeof oldCreate==='function')window.hlgb916CreateMaterialChecklist=function(prod,dest,unit,service){
  const record=oldCreate.apply(this,arguments);if(!record)return record;const p=product(record.productId);
  if(p&&Array.isArray(p.materials)){
   try{record.materials=buildMaterials(p,record.qty,record.destinationType,record);
    record.materialsSourceV9522='product_technical_sheet';}
   catch(e){console.warn('[HLGB v95.22] ficha nova indisponível',e)}
  }
  return record;
 };
 document.addEventListener('click',guardAssignment9730,true);
 // Atualiza o aviso ao voltar à aba dos envios após editar fichas ou sincronizar outra sessão.
 try{window.addEventListener('focus',()=>setTimeout(ensurePanel,120))}catch(e){}
 try{document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(ensurePanel,120)})}catch(e){}
 state.installed=true;setTimeout(ensurePanel,100);
}
window.hlgbFactionMaterialRefresh9522={version:V,state,install,analyze,buildMaterials,compare,openReview,reloadAndSave,ensurePanel,
 groupPlan:groupPlan9734,groupCandidates:groupCandidates9734,openGroup:openGroup9734,test:{materialKey,isRelevantPending,comparisonRows,comparisonTable,gradeRowsForChecklist,rollDetails,assignmentMaterials9730,sewingMaterial9734}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
try{window.hlgbAfterLogin?.(()=>setTimeout(install,200),0)}catch(e){}
setTimeout(install,1500);
})();