'use strict';
(function(root,api){if(typeof module==='object'&&module.exports){module.exports=api;return}if(!root||root.HLGBSettlementHistoryView9654)return;root.HLGBSettlementHistoryView9654=api;
const can=p=>{try{return typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
const auth=()=>root.__HLGB_AUTH_READY===true;
const deps={auth,can,rows:k=>{try{const d=typeof db!=='undefined'?db:root.db;return Array.isArray(d?.[k])?d[k]:null}catch(_){return null}},manualGroups:()=>root.hlgbFactionManual9566?.receiptGroups?.()??null,notes:()=>root.hlgbNotesReceivables9564?.allNotes?.()??null,inspect:(ctx,filter)=>root.HLGBSettlementHistory9653.inspect(ctx,filter)};
const areas={faccao:'pagamentosFaccoes',cliente:'notas',funcionario:'folhaPagamento'};
const money=c=>c==null?'Não confirmado':(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const el=(tag,t,parent)=>{const e=document.createElement(tag);e.textContent=t;parent.appendChild(e);return e};
const prefix='hlgb-settlement-history-9654-';
function clear(){for(const e of document.querySelectorAll('[data-hlgb-history-view9654]'))e.remove()}
function closeUnauthorized(){for(const [kind,page] of Object.entries(areas)){const host=document.getElementById(prefix+kind);if(host&&(!auth()||!api.scopes[kind].every(can)||!document.getElementById(page)?.classList.contains('active')))host.querySelector('[data-history-output]')?.replaceChildren();}}
function install(){
 if(!root.HLGBSettlementHistory9653||!auth())return;
 for(const [kind,page] of Object.entries(areas)){
  const area=document.getElementById(page);
  if(!area||!area.classList.contains('active')||!api.scopes[kind].every(can)||document.getElementById(prefix+kind))continue;
  const host=document.createElement('section');host.id=prefix+kind;host.className='panel';host.dataset.hlgbHistoryView9654='1';area.appendChild(host);
  el('h3','Histórico individual de acertos',host);el('p','Consulta local dos registros carregados e valores apresentados pelos módulos existentes; não é confirmação bancária nem total oficial.',host);
  const controls=el('div','',host);controls.className='toolbar';
  const input=(label,type)=>{const wrap=el('label',label,controls);wrap.style.cssText='display:flex;flex-direction:column;min-width:0;max-width:100%';const e=el('input','',wrap);e.type=type;e.style.cssText='min-width:0;max-width:100%';return e};
  const q=input('Pessoa ou identificação','search'),from=input('De','date'),to=input('Até','date');
  const mode=el('select','',controls);mode.setAttribute('aria-label','Visualização do histórico');for(const [v,t] of [['groups','Resumo por pessoa e data'],['rows','Acerto individual']]){const o=el('option',t,mode);o.value=v}
  const btn=el('button','Consultar histórico',controls);btn.type='button';btn.className='secondary';
  const output=el('div','',host);output.dataset.historyOutput='1';let offset=0;
  function draw(){output.replaceChildren();if(!area.classList.contains('active'))return;if(from.value&&to.value&&from.value>to.value){el('p','Confira o período.',output);return}const x=api.read(deps,kind,{query:q.value,from:from.value,to:to.value,limit:30,offset});
   if(x.state!=='local-observation'){el('p','Histórico indisponível para esta sessão.',output);return}
   const groups=mode.value==='groups',rows=groups?x.groups:x.rows,total=groups?x.groupTotal:x.total;
   el('p',total+' '+(groups?'grupo(s)':'acerto(s)')+' nos registros locais autorizados.',output);
   for(const row of rows){const item=el('article','',output);item.className='panel';el('h4',row.name+' · '+row.date,item);el('p','Lançado/observado: '+money(row.totalCents)+' · Pago informado: '+money(row.paidCents)+' · Crédito: '+money(row.creditCents)+' · Saldo: '+money(row.balanceCents),item);el('p',groups?row.count+' acerto(s)':'Origem '+row.id+' · Linhas '+row.lines.join(', ')+(row.document?' · Comprovante registrado':''),item)}
   if(x.issues.length)el('p',x.issues.length+' lacuna(s) ou inconsistência(s) excluídas/sinalizadas. Revisar na origem. Os valores não são um total conciliado.',output);
   if(offset){const b=el('button','Anterior',output);b.type='button';b.onclick=()=>{offset=Math.max(0,offset-30);draw()}}
   if(offset+30<total){const b=el('button','Próximo',output);b.type='button';b.onclick=()=>{offset+=30;draw()}}
  }
  btn.onclick=()=>{offset=0;draw()};mode.onchange=()=>{offset=0;draw()};
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
   if(kind==='cliente')ctx.notes=deps.notes();
   if(kind==='funcionario')ctx.payroll=deps.rows('payroll');
   if(deps.auth()!==true||!scopes[kind].every(p=>deps.can(p)===true))return {state:'forbidden',rows:[],groups:[],issues:[]};
   const out=deps.inspect(ctx,{...filters,kind});
   if(deps.auth()!==true||!scopes[kind].every(p=>deps.can(p)===true))return {state:'forbidden',rows:[],groups:[],issues:[]};
   return out;
  }catch(_){return {state:'unavailable',rows:[],groups:[],issues:['consulta-indisponivel']}}
 }
 return {read,scopes};
})());
