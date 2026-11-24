'use strict';
(function(root,api){if(typeof module==='object'&&module.exports){module.exports=api;return}if(!root||root.HLGBSettlementHistoryView9654)return;root.HLGBSettlementHistoryView9654=api;
const can=p=>{try{return typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
const auth=()=>root.__HLGB_AUTH_READY===true;
const deps={auth,can,rows:k=>{try{const d=typeof db!=='undefined'?db:root.db;return Array.isArray(d?.[k])?d[k]:null}catch(_){return null}},manualGroups:()=>root.hlgbFactionManual9566?.receiptGroups?.()??null,notes:()=>root.hlgbNotesReceivables9564?.allNotes?.()??null,noteSources:()=>{if(!scopeOK('cliente')||typeof root.hlgbCanonicalProjectionInvoices!=='function')return null;const projections=root.hlgbCanonicalProjectionInvoices();if(!scopeOK('cliente')||!Array.isArray(projections))return null;const orders=typeof db!=='undefined'?db?.orders:root.db?.orders;if(!scopeOK('cliente')||!Array.isArray(orders))return null;return [...projections.filter(x=>x&&x.id!=null).map(record=>({key:'projection:'+String(record.id),record})),...orders.filter(x=>x&&x.id!=null).map(record=>({key:'order:'+String(record.id),record}))]},inspect:(ctx,filter)=>root.HLGBSettlementHistory9653.inspect(ctx,filter),inspectEvents:(ctx,filter)=>root.HLGBSettlementHistory9653.noteEvents(ctx,filter)};
const areas={faccao:'pagamentosFaccoes',cliente:'notas',funcionario:'folhaPagamento'};
const money=c=>c==null?'Não confirmado':(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const el=(tag,t,parent)=>{const e=document.createElement(tag);e.textContent=t;parent.appendChild(e);return e};
const prefix='hlgb-settlement-history-9654-';
const actor=()=>{try{return String(typeof cloudUser!=='undefined'?cloudUser?.id||'':typeof currentUser==='function'?currentUser()?.id||'':'')}catch(_){return ''}};
const eventLabels={'payment-recorded':'Recebimento registrado','material-offset':'Abatimento de matéria-prima','return-active':'Devolução ativa','return-reversed':'Devolução estornada (valor de referência)'};
const dateLabels={payment:'Pagamento registrado',scheduled:'Programação',service:'Serviço',record:'Registro',issue:'Emissão (não recebimento)',mixed:'Datas de naturezas diferentes'};
const scopeOK=kind=>auth()&&!!actor()&&api.scopes[kind].every(can);
function clear(){for(const e of document.querySelectorAll('[data-hlgb-history-view9654]'))e.remove()}
function closeUnauthorized(){for(const [kind,page] of Object.entries(areas)){const host=document.getElementById(prefix+kind);if(host&&(!scopeOK(kind)||host.dataset.actor!==actor()||!document.getElementById(page)?.classList.contains('active')))host.remove()}}
function install(){
 if(!root.HLGBSettlementHistory9653||!auth())return;
 for(const [kind,page] of Object.entries(areas)){
  const area=document.getElementById(page);
  if(!area||!area.classList.contains('active')||!scopeOK(kind)||document.getElementById(prefix+kind))continue;
  const host=document.createElement('section');host.id=prefix+kind;host.className='panel';host.dataset.hlgbHistoryView9654='1';host.dataset.actor=actor();area.appendChild(host);
  const active=()=>host.isConnected&&scopeOK(kind)&&host.dataset.actor===actor()&&area.classList.contains('active');
  el('h3','Histórico individual de acertos',host);el('p','Consulta local. Para clientes, a data é de emissão da nota, não necessariamente do recebimento. Não é confirmação bancária nem total oficial.',host);
  const controls=el('div','',host);controls.className='toolbar';controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;min-width:0';
  const field=(label,tag,type)=>{const wrap=el('label',label,controls);wrap.style.cssText='display:flex;flex-direction:column;min-width:0;max-width:100%';const e=el(tag,'',wrap);if(type)e.type=type;e.style.cssText='min-width:0;max-width:100%;box-sizing:border-box';return e};
  const q=field('Pessoa, modelo ou identificação','input','search'),from=field('De','input','date'),to=field('Até','input','date');
  const owner=field('Pessoa cadastrada','select'),status=field('Situação do acerto','select'),mode=field('Visualização do histórico','select'),eventType=kind==='cliente'?field('Tipo de evento','select'):null;
  const options=(input,rows)=>{const prior=input.value;input.replaceChildren();for(const [v,t] of rows){const o=el('option',t,input);o.value=v}input.value=rows.some(r=>r[0]===prior)?prior:rows[0][0]};
  options(owner,[['','Todas']]);options(status,[['all','Todos'],['open','Em aberto'],['paid','Liquidados sem crédito'],['compensated','Liquidados com crédito'],['review','A revisar']]);
  options(mode,[['groups','Resumo por pessoa e data'],['owners','Total por pessoa no período'],['rows','Acerto individual'],...(kind==='cliente'?[['events','Recebimentos e devoluções por data']]:[])]);if(eventType){options(eventType,[['all','Todos os eventos'],...Object.entries(eventLabels)]);eventType.disabled=true;}
  const button=(label,parent,fn)=>{const b=el('button',label,parent);b.type='button';b.className='secondary';b.style.cssText='max-width:100%;white-space:normal';b.onclick=fn;return b};
  const output=el('div','',host);output.dataset.historyOutput='1';output.setAttribute('aria-live','polite');let offset=0;
  const filter=()=>({query:q.value,ownerId:owner.value,from:from.value,to:to.value,status:status.value,eventMode:kind==='cliente'&&mode.value==='events',eventType:eventType?.value||'all',limit:30,offset});
  const read=extra=>api.read(deps,kind,{...filter(),...extra});
  const format=r=>'Lançado/observado: '+money(r.totalCents)+' · Pago informado: '+money(r.paidCents)+' · Crédito: '+money(r.creditCents)+' · Saldo: '+money(r.balanceCents);
  function draw(){
   output.replaceChildren();if(!active())return;
   const events=kind==='cliente'&&mode.value==='events';status.disabled=events;if(eventType)eventType.disabled=!events;
   const x=read();if(!active())return;if(events&&x.state==='local-events'){drawEvents(x);return}if(x.state!=='local-observation'){el('p',x.state==='invalid-filter'?'Confira o período e os filtros.':'Histórico indisponível para esta sessão.',output);return}
   const known=[['','Todas'],...(x.owners||[]).map(r=>[r.ownerId,(r.name||'Sem nome')+' · ID '+r.ownerId])];if(owner.value&&!known.some(r=>r[0]===owner.value))known.push([owner.value,'ID '+owner.value+' (sem registro)']);options(owner,known);
   const key=mode.value,rows=key==='groups'?x.groups:key==='owners'?x.ownerGroups:x.rows,total=key==='groups'?x.groupTotal:key==='owners'?x.ownerTotal:x.total;
   if(offset>=total&&offset>0){offset=Math.max(0,Math.floor((total-1)/30)*30);return draw()}
   el('p',total+' '+(key==='groups'?'grupo(s)':key==='owners'?'pessoa(s)':'acerto(s)')+' nos registros locais autorizados.',output);
   if(x.totals){el('h4','Totais do filtro completo (todas as páginas)',output);el('p',format(x.totals),output);el('p',x.totals.count+' registros com valores conferíveis na consulta · '+x.totals.reviewCount+' saldos inconsistentes.',output)}
   for(const row of rows){const item=el('article','',output);item.className='panel';el('h4',(row.name||'Sem nome')+' · ID '+row.ownerId+(row.date?' · '+row.date:''),item);el('p',format(row),item);
    if(key!=='rows'){el('p',row.count+' acerto(s)'+(row.dateBasis?' · '+(dateLabels[row.dateBasis]||row.dateBasis):''),item);button('Ver acertos desta pessoa',item,()=>{owner.value=row.ownerId;if(key==='groups'&&row.date){from.value=row.date;to.value=row.date}mode.value='rows';offset=0;draw()});continue}
    el('p','Origem '+row.id+' · '+(dateLabels[row.dateBasis]||'Data observada')+' · '+row.status+(row.document?' · Comprovante registrado':''),item);
    if(row.number)el('p','Nota '+row.number+' · Vencimento '+(row.due||'Não informado')+' · '+(row.source||'Nota'),item);
    if(row.competence)el('p','Competência '+row.competence,item);
    if(row.netOfAdjustments)el('p','Total líquido do grupo conforme módulo original. Ajustes já incorporados não são descontados outra vez.',item);
    const actions={
     factionPdf:id=>root.hlgbFactionManual9566.downloadSummaryPdfV9590(id),
     noteView:id=>root.hlgbViewNote9411(id),
     notePdf:id=>root.hlgbDownloadNotePdf9411(id),
     orderView:id=>root.viewOrderDetails(id)
    };
    function launch(action){if(!active())return;const result=api.originalAction(deps,kind,row,action,actions,active);if(!result.opened&&active())el('p','A origem mudou, está indisponível ou o acesso não foi confirmado. Atualize a consulta.',item)}
    if(kind==='faccao'&&row.id.startsWith('group:')&&typeof root.hlgbFactionManual9566?.downloadSummaryPdfV9590==='function')button('Baixar PDF detalhado do acerto original',item,()=>launch('factionPdf'));
    if(kind==='cliente'&&row.id.startsWith('note:projection:')){if(typeof root.hlgbViewNote9411==='function')button('Consultar nota original',item,()=>launch('noteView'));if(typeof root.hlgbDownloadNotePdf9411==='function')button('Baixar PDF da nota original',item,()=>launch('notePdf'))}
    if(kind==='cliente'&&row.id.startsWith('note:order:')&&typeof root.viewOrderDetails==='function')button('Consultar pedido original',item,()=>launch('orderView'));
    const detail=el('details','',item);el('summary','Referências e detalhes do acerto',detail);el('p','Linhas '+row.lines.join(', '),detail);
    for(const l of row.details||[]){el('h4',l.description+' · ID '+l.id,detail);el('p','Quantidade '+(l.quantity??'Não informada')+' · Valor unitário '+money(l.unitPriceCents)+' · Serviço '+money(l.serviceCents)+' · Pago '+money(l.paidCents)+' · Travetada descontada '+money(l.travetaCents),detail);if(l.note)el('p','Observação: '+l.note,detail)}
   }
   if(x.issues.length)el('p',x.issues.length+' lacuna(s) ou inconsistência(s) excluídas/sinalizadas na fonte. Revisar na origem. Os valores não são um total conciliado.',output);
   if(offset)button('Anterior',output,()=>{offset=Math.max(0,offset-30);draw()});
   if(offset+30<total)button('Próximo',output,()=>{offset+=30;draw()});
  }
  function drawEvents(x){
   const known=[['','Todas'],...(x.owners||[]).map(r=>[r.ownerId,(r.name||'Sem nome')+' · ID '+r.ownerId])];if(owner.value&&!known.some(r=>r[0]===owner.value))known.push([owner.value,'ID '+owner.value+' (sem registro)']);options(owner,known);
   if(offset>=x.eventTotal&&offset>0){offset=Math.max(0,Math.floor((x.eventTotal-1)/30)*30);return draw()}
   el('h4','Eventos por data registrada — '+x.eventTotal+' encontrados',output);
   el('p','Recebimentos registrados '+money(x.totals.paymentRecordedCents)+' · Abatimentos de matéria-prima '+money(x.totals.materialOffsetCents),output);
   el('p','Devoluções ainda ativas '+money(x.totals.activeReturnCents)+' · Devoluções estornadas (referência) '+money(x.totals.reversedReturnReferenceCents),output);
   el('p','Valores separados: abatimentos não são entrada de caixa; devolução estornada não reduz o saldo atual. O histórico exclui notas cuja soma não confere.',output);
   for(const r of x.events){const item=el('article','',output);item.className='panel';el('h4',r.name+' · '+r.date+' · Nota '+r.noteNumber,item);el('p',eventLabels[r.type]+' · '+money(r.amountCents),item);if(r.method)el('p','Forma registrada: '+r.method,item);if(r.description)el('p',r.description,item);if(r.reversedAt)el('p','Estorno registrado em '+r.reversedAt+' (a data do filtro é a devolução original)',item);el('p','Referência '+r.noteKey+' · '+r.id,item)}
   if(x.issues.length)el('p',x.issues.length+' nota(s) ou ocorrências a revisar na origem; o histórico é parcial.',output);
   if(offset)button('Anterior',output,()=>{offset=Math.max(0,offset-30);draw()});if(offset+30<x.eventTotal)button('Próximo',output,()=>{offset+=30;draw()});
  }
  button('Consultar histórico',controls,()=>{offset=0;draw()});
  for(const input of [owner,status,mode,from,to,eventType].filter(Boolean))input.onchange=()=>{offset=0;draw()};q.addEventListener('change',()=>{offset=0;draw()});
  button('Exportar histórico filtrado (CSV)',controls,()=>{
   if(!active())return;const x=read({export:true,offset:0});if(!active())return;
   try{const csv=kind==='cliente'&&mode.value==='events'?api.eventCsv(x):api.csv(x,kind);if(!active())return;const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='HLGB-historico-'+kind+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
   catch(_){output.replaceChildren();el('p',x.state==='export-limit'?'Limite de 5.000 registros por exportação. Reduza o período.':'Não foi possível exportar uma consulta completa. Confira filtros e permissões.',output)}
  });
  draw()
 }
}
function refresh(){closeUnauthorized();install()}
if(typeof document!=='undefined'){document.addEventListener('click',()=>setTimeout(refresh,0),true);document.addEventListener('visibilitychange',refresh);document.addEventListener('DOMContentLoaded',refresh,{once:true});root.addEventListener?.('hlgb:authenticated',()=>{clear();refresh()});root.addEventListener?.('hlgb:logout',clear);setTimeout(refresh,600)}
})(typeof window!=='undefined'?window:null,(function bridgeFactory(){
 const scopes={faccao:['pagamentosFaccoes','faccoes'],cliente:['notas','financeiro'],funcionario:['folhaPagamento']};
 function read(deps,kind,filters={}){
  if(!Object.hasOwn(scopes,kind)||deps.auth()!==true||!scopes[kind].every(p=>deps.can(p)===true))return {state:'forbidden',rows:[],groups:[],issues:[]};
  const ctx={authenticated:true,factionsAllowed:kind==='faccao',clientsAllowed:kind==='cliente',employeesAllowed:kind==='funcionario'};
  try{
   if(kind==='faccao'){ctx.payments=deps.rows('factionPayments');if(deps.auth()!==true||!scopes[kind].every(p=>deps.can(p)===true))return {state:'forbidden',rows:[],groups:[],issues:[]};ctx.manualGroups=deps.manualGroups()}
   if(kind==='cliente'){ctx.notes=deps.notes();if(filters.eventMode===true){if(deps.auth()!==true||!scopes[kind].every(p=>deps.can(p)===true))return {state:'forbidden',rows:[],groups:[],issues:[]};if(typeof deps.noteSources!=='function'||typeof deps.inspectEvents!=='function')return {state:'unavailable',rows:[],groups:[],issues:[]};ctx.noteSources=deps.noteSources()}}
   if(kind==='funcionario')ctx.payroll=deps.rows('payroll');
   if(deps.auth()!==true||!scopes[kind].every(p=>deps.can(p)===true))return {state:'forbidden',rows:[],groups:[],issues:[]};
   const out=kind==='cliente'&&filters.eventMode===true?deps.inspectEvents(ctx,{...filters,kind}):deps.inspect(ctx,{...filters,kind,eventMode:false});
   if(deps.auth()!==true||!scopes[kind].every(p=>deps.can(p)===true))return {state:'forbidden',rows:[],groups:[],issues:[]};
   return out;
  }catch(_){return {state:'unavailable',rows:[],groups:[],issues:['consulta-indisponivel']}}
 }
 function csv(result,kind){
  if(!Object.hasOwn(scopes,kind)||result?.state!=='local-observation'||!Array.isArray(result.rows)||!Number.isSafeInteger(result.total)||result.total!==result.rows.length||result.rows.length>5000||result.rows.some(x=>x.kind!==kind))throw Error('incomplete-export');
  const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
  const cash=n=>Number.isSafeInteger(n)?(n/100).toFixed(2).replace('.',','):'Não confirmado';
  const lines=[['HLGB — histórico local; não conciliado nem confirmação bancária'],['Tipo','ID pessoa','Pessoa','Data','Natureza da data','Origem','Situação','Lançado R$','Pago R$','Crédito R$','Saldo R$','Referências','Comprovante registrado']];
  for(const r of result.rows)lines.push([r.kind,r.ownerId,r.name,r.date,r.dateBasis,r.id,r.status,cash(r.totalCents),cash(r.paidCents),cash(r.creditCents),cash(r.balanceCents),r.lines.join(', '),r.document?'Sim':'Não informado']);
  if(result.totals)lines.push(['TOTAL OBSERVADO','','','','','','',cash(result.totals.totalCents),cash(result.totals.paidCents),cash(result.totals.creditCents),cash(result.totals.balanceCents)]);
  lines.push(['Lacunas ou inconsistências sinalizadas',result.issues?.length??0]);return '\uFEFF'+lines.map(r=>r.map(cell).join(';')).join('\r\n');
 }
 function eventCsv(result){
  if(result?.state!=='local-events'||!Array.isArray(result.events)||result.eventTotal!==result.events.length||result.events.length>5000||result.events.some(x=>x.kind!=='cliente'))throw Error('incomplete-export');
  const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
  const cash=n=>Number.isSafeInteger(n)?(n/100).toFixed(2).replace('.',','):'Não confirmado';
  const lines=[['HLGB — eventos locais de notas, não extrato bancário'],['Cliente','ID','Nota','Data do evento original','Tipo','Valor R$','Data de estorno','Método','Referência']];
  for(const e of result.events)lines.push([e.name,e.ownerId,e.noteNumber,e.date,e.type,cash(e.amountCents),e.reversedAt,e.method,e.id]);
  for(const [k,value] of Object.entries(result.totals||{}))lines.push([k,cash(value)]);
  lines.push(['Lacunas ou inconsistências',result.issues?.length??0]);return '\uFEFF'+lines.map(r=>r.map(cell).join(';')).join('\r\n');
 }
 function originalAction(deps,kind,row,action,actions,active){
  const fail=reason=>({opened:false,reason});try{
   if(typeof active!=='function'||active()!==true||!row||row.kind!==kind||typeof actions?.[action]!=='function')return fail('unavailable');
   const matches={factionPdf:['faccao','group:'],noteView:['cliente','note:projection:'],notePdf:['cliente','note:projection:'],orderView:['cliente','note:order:']};
   const spec=Object.hasOwn(matches,action)?matches[action]:null;
   if(!spec||spec[0]!==kind||typeof row.id!=='string'||!row.id.startsWith(spec[1])||!row.ownerId||!row.date)return fail('invalid-action');
   const id=row.id.slice(spec[1].length);if(!id||id.length>120)return fail('invalid-action');
   const latest=read(deps,kind,{ownerId:row.ownerId,from:row.date,to:row.date,export:true});
   if(latest.state!=='local-observation'||!Array.isArray(latest.rows)||active()!==true)return fail('unavailable');
   const current=latest.rows.filter(x=>x.id===row.id&&x.ownerId===row.ownerId);
   const sig=x=>JSON.stringify([x.kind,x.id,x.ownerId,x.date,x.status,x.totalCents,x.paidCents,x.creditCents,x.balanceCents,x.lines,x.details,x.document]);
   if(current.length!==1||sig(current[0])!==sig(row))return fail('stale');
   if(active()!==true||deps.auth()!==true||!scopes[kind].every(p=>deps.can(p)===true))return fail('forbidden');
   actions[action](id);return {opened:true,reason:'invoked-original-read-action'};
  }catch(_){return fail('unavailable')}
 }
 return {read,scopes,csv,eventCsv,originalAction};
})());
