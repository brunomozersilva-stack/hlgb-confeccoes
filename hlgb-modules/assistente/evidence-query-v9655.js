'use strict';
(function(root,api){if(typeof module==='object'&&module.exports){module.exports=api;return}if(!root||root.HLGBEvidenceQuery9655)return;root.HLGBEvidenceQuery9655=api;
const actor=()=>{try{return String(typeof cloudUser!=='undefined'?cloudUser?.id||'':typeof currentUser==='function'?currentUser()?.id||'':'')}catch(_){return ''}};
const auth=()=>root.__HLGB_AUTH_READY===true&&!!actor(),can=p=>{try{return typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
const read=k=>{const d=typeof db!=='undefined'?db:root.db;return Array.isArray(d?.[k])?d[k]:null};
const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>p.find(x=>x.type===k)?.value;return v('year')+'-'+v('month')+'-'+v('day')};
const deps={auth,can,read,today,get productApi(){return root.HLGBProductHistory9652},
 settlement:(kind,filter)=>root.HLGBSettlementHistoryView9654?.read({auth,can,rows:read,manualGroups:()=>root.hlgbFactionManual9566?.receiptGroups?.()??null,notes:()=>root.hlgbNotesReceivables9564?.allNotes?.()??null,inspect:(ctx,f)=>root.HLGBSettlementHistory9653.inspect(ctx,f)},kind,filter),
 finance:opt=>root.HLGBLivePersonnelFinance9656?.finance({auth,can,read,financeApi:()=>root.HLGBHubIntelligenceAdapter9633,paidDateApi:()=>root.hlgbHubPayrollPaidDate9515},opt),
 weeklySummary:x=>root.HLGBLivePersonnelFinance9656?.weeklySummary(x)
};
function clear(){document.getElementById('hlgbEvidenceQuery9655')?.remove()}
function mount(){
 const input=document.getElementById('hlgbAssistantInput'),existing=document.getElementById('hlgbEvidenceQuery9655');
 if(!input||!auth()){clear();return}
 if(existing&&existing.dataset.actor===actor())return;clear();
 const host=document.createElement('section');host.id='hlgbEvidenceQuery9655';host.className='panel';host.dataset.actor=actor();host.style.cssText='max-width:100%;min-width:0;overflow-wrap:anywhere';
 const active=()=>host.isConnected&&input.isConnected&&auth()&&actor()===host.dataset.actor;
 const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Consulta com evidências';const out=document.createElement('div');out.setAttribute('aria-live','polite');
 const help=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Exemplos de consultas';help.appendChild(summary);
 for(const [label,query] of [['Andamento de pedido','pedido 125'],['Histórico de modelo','histórico produto Camisola'],['Matéria-prima','material malha'],['Acertos de facção','acertos facção Roseli'],['Notas de cliente','acertos cliente NOME'],['Folha paga','acertos funcionário NOME'],['Previsão semanal','financeiro semana']]){
  const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.style.cssText='max-width:100%;white-space:normal';btn.textContent=label;btn.onclick=()=>{if(active()){input.value=query;out.replaceChildren();input.focus()}};help.appendChild(btn)
 }
 host.append(b,help,out);input.closest('.hlgb-assistant-input')?.insertAdjacentElement('afterend',host);if(!host.isConnected)input.insertAdjacentElement('afterend',host);
 b.onclick=()=>{out.replaceChildren();if(!active())return;const x=api.ask(input.value,deps);if(!active())return;const p=document.createElement('p');p.textContent=x.message;out.appendChild(p);for(const row of x.rows){const item=document.createElement('p');item.textContent=row.label+' · '+row.detail+' · Origem: '+row.source+' / '+row.id;out.appendChild(item)}};
 input.addEventListener('input',()=>out.replaceChildren(),{passive:true});
}
if(typeof document!=='undefined'){document.addEventListener('click',()=>setTimeout(mount,0),true);document.addEventListener('focusin',mount);root.addEventListener?.('hlgb:logout',clear);root.addEventListener?.('hlgb:authenticated',()=>{clear();mount()});document.addEventListener('visibilitychange',()=>{clear();if(!document.hidden)mount()});}
})(typeof window!=='undefined'?window:null,(function engine(){
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const sid=x=>typeof x==='string'||typeof x==='number'?String(x).trim():'';
 const live=x=>x&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted;
 const result=(state,message,rows=[])=>({state,message,rows,canWrite:false,coverage:'local-only'});
 function ask(raw,deps){
  if(deps.auth()!==true)return result('forbidden','Entre no programa para consultar.');
  const q=String(raw??'').trim();if(!q||q.length>180)return result('unsupported','Informe uma consulta curta.');
  const m=q.match(/^(?:(?:status|andamento|situa[cç][aã]o)(?: do)? |como est[aá] (?:o )?)?pedido\s*#?\s*([A-Za-z0-9_-]{1,80})\??$/i),product=q.match(/^(?:hist[oó]rico(?: do)? produto|produto|modelo)\s+(.+)$/i),material=q.match(/^(?:material|mat[eé]ria.prima)\s+(.+)$/i),settlement=q.match(/^acertos?\s+(fac[cç][aã]o|cliente|funcion[aá]rio)\s+(.+)$/i),finance=/^(?:financeiro semana|previs[aã]o financeira semanal|como est[aá] o financeiro)\??$/i.test(q);
  const permitted=p=>deps.auth()===true&&deps.can(p)===true;
  try{
   if(material){
    if(!permitted('materiais'))return result('forbidden','Consulta de materiais não autorizada.');
    const data=deps.read('materials');if(!permitted('materiais'))return result('forbidden','Sessão alterada.');
    if(!Array.isArray(data))return result('unavailable','Cadastro de matérias-primas indisponível.');
    const counts=new Map();for(const r of data.filter(live)){const k=sid(r.id);counts.set(k,(counts.get(k)||0)+1)}
    const query=norm(material[1]),found=data.filter(x=>live(x)&&sid(x.id)&&counts.get(sid(x.id))===1&&[x.id,x.name,x.code,x.cat].map(norm).join(' ').includes(query));
    if(!permitted('materiais'))return result('forbidden','Sessão alterada.');
    return result(found.length?'observed':'empty',found.length?found.length+' material(is) cadastrado(s); até 30 exibidos. Estoque físico e preço não confirmados.':'Material não encontrado nos registros locais.',found.slice(0,30).map(x=>({source:'materials',id:sid(x.id),label:sid(x.name)||sid(x.id),detail:[sid(x.cat),sid(x.unit)].filter(Boolean).join(' · ')||'Unidade não informada'})))
   }
   if(settlement){
    const kind=norm(settlement[1]),scopes={faccao:['pagamentosFaccoes','faccoes'],cliente:['notas','financeiro'],funcionario:['folhaPagamento']},areas=scopes[kind];
    if(!areas||!areas.every(permitted))return result('forbidden','Consulta de acertos não autorizada.');
    if(typeof deps.settlement!=='function')return result('unavailable','Histórico indisponível.');
    const query=settlement[2].trim(),x=deps.settlement(kind,{query,limit:30});
    if(!areas.every(permitted))return result('forbidden','Sessão ou acesso alterado.');
    if(x?.state!=='local-observation'||!Array.isArray(x.rows)||!Array.isArray(x.owners))return result('unavailable','Histórico não confirmado.');
    const owners=x.owners.filter(r=>norm(r.name).includes(norm(query))||sid(r.ownerId)===query);
    if(owners.length!==1)return result(owners.length?'ambiguous':'empty',owners.length?'Há mais de uma pessoa com esta referência. Consulte o ID exato.':'Pessoa não localizada nos registros carregados.',owners.slice(0,20).map(r=>({source:'settlement-history',id:r.ownerId,label:r.name,detail:'ID '+r.ownerId})));
    const owner=owners[0],y=deps.settlement(kind,{ownerId:owner.ownerId,limit:30});
    if(!areas.every(permitted))return result('forbidden','Sessão ou acesso alterado.');
    if(y?.state!=='local-observation'||!Array.isArray(y.rows)||y.rows.some(r=>r.kind!==kind||r.ownerId!==owner.ownerId)||!y.totals)return result('unavailable','Histórico não confirmado.');
    const money=c=>Number.isSafeInteger(c)?(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não confirmado';
    return result('observed',owner.name+' · '+y.total+' registros locais. Pago informado '+money(y.totals.paidCents)+' · Crédito '+money(y.totals.creditCents)+' · Saldo '+money(y.totals.balanceCents)+'. '+(kind==='cliente'?'Data da nota é emissão, não recebimento. ':'')+'Não é conciliação bancária.',y.rows.map(r=>({source:'settlement-history',id:r.id,label:r.date,detail:r.status+' · '+money(r.totalCents)+' · Saldo '+money(r.balanceCents)})))
   }
   if(finance){
    const areas=['hubFinanceiro','folhaPagamento'];if(!areas.every(permitted))return result('forbidden','Consulta do Hub e Folha não autorizada.');
    if(typeof deps.finance!=='function'||typeof deps.weeklySummary!=='function'||typeof deps.today!=='function')return result('unavailable','Inteligência financeira indisponível.');
    const today=deps.today(),x=deps.finance({asOf:today,targetDate:today,historyWeeks:8,receiptDelayDays:14});
    if(!areas.every(permitted))return result('forbidden','Sessão ou acesso alterado.');
    const y=deps.weeklySummary(x);if(!areas.every(permitted))return result('forbidden','Sessão ou acesso alterado.');
    if(y?.state!=='observed')return result('unavailable','Não há cobertura local suficiente para resumir a semana. Consulte o Hub Financeiro.');
    const money=c=>Number.isSafeInteger(c)?(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não confirmado';
    return result('observed','Semana atual observada: entradas previstas '+money(y.plannedInCents)+' · saídas previstas '+money(y.plannedOutCents)+' · diferença prevista '+money(y.plannedDifferenceCents)+'. Não é saldo de caixa nem diagnóstico financeiro confirmado.',[{source:'hubFinanceEntries',id:today,label:'Realizados informados',detail:'Entradas '+money(y.paidInCents)+' · Saídas '+money(y.paidOutCents)},...(y.topExpense?[{source:'hubFinanceEntries',id:today,label:'Maior categoria observada',detail:y.topExpense.category+' · '+money(y.topExpense.totalCents)}]:[])])
   }
   if(m){
    if(!permitted('pedidos'))return result('forbidden','Consulta de pedidos não autorizada.');
    const data=deps.read('orders');if(!Array.isArray(data))return result('unavailable','Pedidos ainda não disponíveis.');
    const rows=data.filter(x=>live(x)&&(sid(x.id)===m[1]||sid(x.orderNumber)===m[1]||sid(x.number)===m[1]));
    if(!permitted('pedidos'))return result('forbidden','Consulta indisponível nesta sessão.');
    if(rows.length!==1)return result(rows.length?'ambiguous':'empty',rows.length?'Há mais de um pedido com esta referência. Confira os IDs na tela de Pedidos.':'Não encontrado nos registros carregados.');
    const o=rows[0],id=sid(o.id),grade=Array.isArray(o.grade)?o.grade:Array.isArray(o.items)?o.items:null;
    const quantities=grade?.map(g=>g.qty??g.quantity??g.pieces);
    const qty=quantities?.every(v=>(typeof v==='number'||typeof v==='string'&&/^\d+$/.test(v))&&Number.isSafeInteger(Number(v))&&Number(v)>=0)?quantities.reduce((sum,v)=>sum+Number(v),0):null;
    const answer=[{source:'orders',id,label:'Pedido #'+sid(o.orderNumber||o.number||id),detail:[sid(o.status),Number.isSafeInteger(qty)?qty+' peças':'Quantidade não comprovada'].filter(Boolean).join(' · ')}];
    for(const [page,key] of [['corte','cuts'],['producao','production']]){
     if(!permitted('pedidos'))return result('forbidden','Sessão alterada.');if(!permitted(page))continue;const items=deps.read(key);if(!permitted('pedidos'))return result('forbidden','Sessão alterada.');
     if(!Array.isArray(items))continue;
     const linked=items.filter(x=>live(x)&&sid(x.orderId)===id&&!x.hiddenByModelSplitV1);
     const counts=new Map();for(const x of linked){const k=sid(x.id);counts.set(k,(counts.get(k)||0)+1)}
     for(const x of linked){if(!sid(x.id)||counts.get(sid(x.id))!==1)continue;answer.push({source:key,id:sid(x.id),label:key==='cuts'?'Corte':'Produção',detail:sid(x.status||x.stage)||'Status não informado'})}
    }
    if(!permitted('pedidos'))return result('forbidden','Sessão alterada.');
    const visible=answer.filter(x=>x.source==='orders'||x.source==='cuts'&&permitted('corte')||x.source==='production'&&permitted('producao'));
    return result('observed','Registros locais vinculados por ID. Não confirma conclusão, saldo ou sincronização.',visible.slice(0,50));
   }
   if(product){
    if(!permitted('produtos'))return result('forbidden','Consulta de produtos não autorizada.');
    const db={products:deps.read('products')};if(!permitted('produtos'))return result('forbidden','Sessão alterada.');const p=deps.productApi;
    if(!p||!Array.isArray(db.products))return result('unavailable','Catálogo ainda não disponível.');
    const x=p.search(db,product[1],{allowed:true,limit:20});
    if(!permitted('produtos'))return result('forbidden','Sessão alterada.');
    if(x.total!==1)return result(x.total?'ambiguous':'empty',x.total?'Selecione a referência exata na busca de Produtos.':'Modelo não encontrado nos registros locais.',x.rows.map(r=>({source:'products',id:r.id,label:r.name,detail:r.code||r.id})));
    const row=x.rows[0],modules=[];for(const [page,key] of [['pedidos','orders'],['corte','cuts'],['producao','production'],['faccoes','factions']])if(permitted(page)){if(!permitted('produtos'))return result('forbidden','Sessão alterada.');modules.push(key);db[key]=deps.read(key);if(!permitted('produtos')||!permitted(page))return result('forbidden','Sessão alterada.')}
    const history=p.timeline(db,row.id,{allowed:true,modules,limit:30});
    if(!permitted('produtos')||modules.some(k=>!permitted(({orders:'pedidos',cuts:'corte',production:'producao',factions:'faccoes'})[k])))return result('forbidden','Sessão ou acesso alterado.');
    return result('observed','Modelo '+row.name+' · '+history.total+' eventos locais; até 30 exibidos. '+(history.issues.length?'Há lacunas de vínculo ou dados. ':'')+'Não confirma cobertura da nuvem.',[{source:'products',id:row.id,label:row.name,detail:row.code||''},...history.rows.map(e=>({source:e.source,id:e.sourceId,label:e.status||e.source,detail:[e.date,e.orderId?'Pedido '+e.orderId:'',e.quantity===null?'':e.quantity+' peças'].filter(Boolean).join(' · ')}))]);
   }
   return result('unsupported','Use “pedido 125”, “histórico produto Camisola”, “material malha”, “acertos facção Roseli” ou “financeiro semana”. Para as demais funções, utilize o Assistente original.');
  }catch(_){return result('unavailable','Não foi possível conferir a consulta. Nenhuma alteração foi feita.')}
 }
 return {ask};
})());
