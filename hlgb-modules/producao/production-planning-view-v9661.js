'use strict';
(function(root){
 if(!root||root.HLGBProductionPlanningView9661)return;root.HLGBProductionPlanningView9661=true;
 const auth=()=>root.__HLGB_AUTH_READY===true;
 const can=page=>{try{return auth()&&typeof canOpenPage==='function'&&canOpenPage(page)===true}catch(_){return false}};
 const user=()=>{try{return String(typeof cloudUser!=='undefined'?cloudUser?.id||'':typeof currentUser==='function'?currentUser()?.id||'':'')}catch(_){return ''}};
 const data=()=>typeof db!=='undefined'?db:root.db;
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const el=(tag,txt,host)=>{const x=document.createElement(tag);x.textContent=txt;host.appendChild(x);return x};
 const button=(txt,host,fn)=>{const b=el('button',txt,host);b.type='button';b.className='secondary';b.onclick=fn;return b};
 const field=(txt,host,type='text')=>{const l=el('label',txt,host);l.style.cssText='display:block;margin:8px 0;min-width:0';const x=el('input','',l);x.type=type;x.style.cssText='display:block;max-width:100%;min-width:0;width:100%;box-sizing:border-box';return x};
 const fmt=x=>x==null?'Não confirmado':Number(x).toLocaleString('pt-BR',{maximumFractionDigits:3});
 const cutAllowed=()=>['corte','pedidos','produtos','materiais','producao'].every(can);
 const remAllowed=()=>can('produtos')&&can('materiais');
 function clear(){for(const x of document.querySelectorAll('[data-planning9661]'))x.remove()}
 function hostFor(page,id,allowed){const area=document.getElementById(page),old=document.getElementById(id),actor=user();if(!allowed()||!actor||!area?.classList.contains('active')){old?.remove();return null}if(old&&old.dataset.planningActor!==actor)old.remove();else if(old)return null;if(!root.HLGBProductionPlanning9661)return null;const host=el('section','',area);host.id=id;host.className='panel';host.dataset.planning9661='1';host.dataset.planningActor=actor;return {host,active:()=>host.isConnected&&allowed()&&area.classList.contains('active')&&user()===actor}}

 function mountCut(){
  const context=hostFor('corte','hlgbJointCut9661',cutAllowed);if(!context)return;const {host,active}=context,api=root.HLGBProductionPlanning9661;
  el('h2','Corte Conjunto — planejamento por matéria-prima',host);el('p','Agrupamento de pedidos locais por ID de matéria-prima. Não confirma saldo, lote, cor física do tecido, encaixe Audaces ou economia. Não cria corte nem baixa estoque.',host);
  const search=field('Buscar matéria-prima, pedido ou modelo',host,'search'),maxLayers=field('Limite de folhas para simulação (opcional)',host,'number'),basket=el('section','',host);maxLayers.min='1';maxLayers.max='10000';maxLayers.step='1';basket.className='panel';el('h3','Cesta única de planejamento',basket);
  el('p','A mesma combinação pedido/modelo aparece uma única vez na cesta, mesmo que utilize vários materiais. A seleção permanece ao mudar o filtro ou página.',basket);
  const basketOut=el('div','',basket),out=el('div','',host);let offset=0,visible=[],selected=new Map();
  const fresh=()=>active()?api.discover(data(),root.hlgbWriteoffIntegrity9391,true):{state:'forbidden',groups:[]};
  const plan=x=>api.planSelection(x,[...selected.values()]);
  const clearAll=()=>{selected.clear();sync()};
  function purchasePage(){return document.getElementById('purchaseTable')?.closest?.('.page')?.id||(document.getElementById('compras')?'compras':document.getElementById('purchases')?'purchases':'')}
  function purchaseAllowed(){const p=purchasePage();return active()&&!!p&&can(p)&&can('estoque')&&can('fornecedores')}
  function transfer(){
   if(!purchaseAllowed())return;const current=fresh(),selection=plan(current),planner=root.hlgbWeeklyMaterialPlanner9583;
   if(selection.state!=='local-preview'||!selection.byProduct.length||typeof planner?.setSelection!=='function'||typeof planner?.selected!=='function'){basketOut.replaceChildren();el('p','Planejamento indisponível ou seleção alterada. Atualize antes de enviar.',basketOut);return}
   const prior=planner.selected();if(!Array.isArray(prior))return;
   if(prior.length&&!confirm('Substituir a seleção local atual de Compras por estes modelos e quantidades? Não será criada compra.'))return;
   if(!purchaseAllowed())return;const checked=plan(fresh());if(checked.state!=='local-preview'||JSON.stringify(checked.byProduct)!==JSON.stringify(selection.byProduct)){sync();return}
   try{
    const pageId=purchasePage();planner.setSelection(checked.byProduct.map(m=>({productId:m.productId,pieces:m.pieces})));
    if(!purchaseAllowed())return;el('p','Seleção enviada ao rascunho local de Compras. Confira fichas, estoque, preço e embalagens antes de comprar.',basketOut);
    if(typeof page==='function'&&can(pageId))page(pageId)
   }catch(_){el('p','Não foi possível confirmar a abertura do planejamento. Confira Compras antes de repetir.',basketOut)}
  }
  function drawBasket(x){
   basketOut.replaceChildren();if(!active())return;
   el('p',selected.size+' combinações pedido/modelo selecionadas.',basketOut);
   if(!selected.size)return;
   const v=plan(x);if(v.state!=='local-preview'){el('p','Há seleção alterada ou ambígua. Limpe a cesta e selecione novamente. Não será calculada nem enviada para Compras.',basketOut);return}
   el('h4',fmt(v.orderedPieces)+' peças únicas na cesta · '+v.byProduct.length+' modelos',basketOut);
   const models=el('details','',basketOut);el('summary','Modelos consolidados por quantidade',models);
   for(const m of v.byProduct)el('p',m.productName+' · '+fmt(m.pieces)+' peças · '+m.orderCount+' pedido(s)',models);
   const d=api.materialDemand(v,data(),active());if(!active()){basketOut.replaceChildren();return}
   if(d.state!=='local-estimate'){el('p','Fichas técnicas indisponíveis para estimativa.',basketOut);return}
   el('h4','Necessidade bruta de materiais',basketOut);el('p',d.partial?'Estimativa parcial: existem fichas, unidades ou materiais a revisar.':'Estimativa de consumo e perdas das fichas técnicas locais; sem abatimento de estoque.',basketOut);
   const materialList=el('details','',basketOut);materialList.open=true;el('summary',d.rows.length+' materiais/unidades/cores consolidados',materialList);
   for(const r of d.rows){const item=el('div','',materialList);el('strong',r.materialName+' · '+(r.color||'cor da ficha não informada')+' · '+fmt(r.needed)+' '+r.unit,item);const detail=el('details','',item);el('summary','Ver consumo por modelo',detail);for(const m of r.models)el('p',m.productName+' · '+fmt(m.needed)+' '+r.unit,detail)}
   if(d.issues.length){const detail=el('details','',basketOut);el('summary','Conferências necessárias ('+d.issues.length+')',detail);for(const m of d.models.filter(x=>x.issues.length))el('p',m.productName+' · '+m.issues.join(', '),detail)}
   if(purchaseAllowed()&&typeof root.hlgbWeeklyMaterialPlanner9583?.setSelection==='function')button('Enviar cesta para planejamento semanal de Compras',basketOut,transfer);
   else el('p','Envio para Compras requer acesso a compras, estoque e fornecedores.',basketOut);
  }
  function sync(x=fresh()){if(!active())return;drawBasket(x);for(const fn of visible)fn(x)}
  function addGroup(g,on){if(!active())return;const add=g.models.filter(m=>!selected.has(m.key));if(on&&selected.size+add.length>1000){el('p','Limite de 1000 combinações por cesta. Separe o planejamento.',basketOut);return}for(const m of g.models){if(on){if(!selected.has(m.key))selected.set(m.key,{key:m.key,signature:api.modelSignature(m)})}else selected.delete(m.key)}sync()}
  function drawGradeSuggestions(g,card){
   const details=el('details','',card);details.open=true;el('summary','Sugestão automática de grade para encaixe',details);
   const limit=maxLayers.value===''?null:Number(maxLayers.value);if(limit!==null&&(!Number.isSafeInteger(limit)||limit<1||limit>10000)){el('p','Informe um limite inteiro de 1 a 10.000 folhas.',details);return}
   for(const v of api.gradeSuggestions(g,limit)){
    const area=el('section','',details);el('h4',v.color+' · '+fmt(v.total)+' peças · '+fmt(v.layers)+' folhas (divisão matemática)',area);
    el('p',v.modelCount>=2?'Combinação de pedidos/modelos da mesma cor informada.':'Apenas um pedido/modelo nesta cor; não misturar cores sem conferir o tecido físico.',area);
    for(const r of v.base)el('p','Pedido #'+r.orderNumber+' · '+r.productName+' · '+r.size+' · '+r.perLayer+' por folha × '+v.layers+' = '+r.planned,area);
    if(v.alternative){const alt=el('details','',area);el('summary','Alternativa de '+v.alternative.layers+' folhas + grade restante',alt);for(const r of v.alternative.rows)el('p',r.productName+' · '+r.size+' · '+r.perLayer+' por folha · '+r.remainder+' restantes',alt)}
    if(v.multiSpreads?.length){const alternatives=el('details','',area);alternatives.open=true;el('summary','Planos com múltiplos enfestos',alternatives);el('p','Ordenação matemática: mais peças em enfestos conjuntos, menor quantidade de peças por folha e menos enfestos. Não é ranking de economia de tecido. '+(limit===null?'Informe o limite real de folhas antes de utilizar.':''),alternatives);
     for(const [i,p] of v.multiSpreads.entries()){const plan=el('details','',alternatives);plan.open=i===0;el('summary','Opção '+(i+1)+' · '+p.spreads.length+' enfestos · '+fmt(p.total)+' peças · '+fmt(p.remaining)+' restantes',plan);el('p',fmt(p.combinedPieces)+' peças em enfestos com dois ou mais pedidos/modelos · máximo '+fmt(p.peakPiecesPerLayer)+' peças por folha',plan);
      for(const [j,s] of p.spreads.entries()){const spread=el('section','',plan);el('h5','Enfesto '+(j+1)+' · '+fmt(s.layers)+' folhas · '+fmt(s.pieces)+' peças',spread);for(const r of s.rows)el('p','Pedido #'+r.orderNumber+' · '+r.productName+' · '+r.size+' · '+r.perLayer+' por folha × '+s.layers+' = '+r.planned,spread)}
     }
    }
   }
   el('p','Grade sugerida apenas por divisão das quantidades pedidas. Conferir saldo, lotes, largura, direção, limites do enfesto e moldes Audaces. Não comprova encaixe, consumo ou economia.',details);
  }
  function drawEvidence(g,card,history,materialHistory){
   const d=api.groupEvidence(g,data(),history,active());if(d.state!=='local-observation')return;
   const box=el('details','',card);el('summary','Histórico de pesagens e oportunidades de sobra',box);
   el('p','Pesagens locais do corte inteiro por modelo, sem atribuição ao tecido deste grupo. Descarte registrado não equivale à economia possível; saldo não classificado não é sobra reutilizável.',box);
   for(const m of d.models){const item=el('div','',box);el('strong',m.productName,item);el('p',m.valid?m.valid+' cortes com pesagem válida · '+fmt(m.totalKg)+' kg pesados · '+fmt(m.wasteKg)+' kg de descarte · '+fmt(m.wastePct)+'% descarte registrado · '+fmt(m.unclassifiedKg)+' kg não classificados':'Sem pesagem finalizada válida para análise.',item);if(m.review)el('p',m.review+' registros a conferir (não incluídos nos totais).',item)}
   const measured=api.materialEstimate(g,materialHistory,active());
   if(measured.state==='local-estimate'){el('h4','Consumo histórico desta matéria-prima',box);el('p','Média ponderada por peças de cortes finalizados; mistura histórica de tamanhos e cores, sem prova de economia ou saldo.',box);for(const m of measured.rows)el('p',m.productName+' · '+(m.estimatedKg===null?'Sem medição válida':fmt(m.gramsPerPiece)+' g/peça · '+m.cuts+' cortes · estimativa '+fmt(m.estimatedKg)+' kg para '+fmt(m.pieces)+' peças')+(m.review?' · '+m.review+' registros a conferir':''),box);el('p',measured.estimatedKg===null?'Sem previsão medida disponível.':(measured.uncoveredPieces?'Estimativa parcial: ':'Estimativa histórica: ')+fmt(measured.estimatedKg)+' kg · '+fmt(measured.coveredPieces)+' peças cobertas · '+fmt(measured.uncoveredPieces)+' sem medição.',box)}
   // Financial values are not exposed to operators without financial access.
   if(active()&&can('financeiro')){
    const cost=api.materialCostEstimate(g,measured,data()?.materials,true),brl=c=>Number(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    el('h4','Previsão financeira de consumo',box);
    if(cost.state==='local-estimate'&&cost.estimatedCents!==null){el('p','Preço de referência do cadastro local: '+brl(cost.referencePricePerKg*100)+'/kg. Não é preço efetivamente pago.',box);for(const r of cost.rows)el('p',r.productName+' · '+(r.estimatedCents===null?'Sem estimativa de custo':brl(r.estimatedCents)),box);el('p',(cost.uncoveredPieces?'Estimativa parcial: ':'Custo estimado: ')+brl(cost.estimatedCents)+' · '+fmt(cost.coveredPieces)+' peças cobertas · '+fmt(cost.uncoveredPieces)+' sem previsão.',box)}else el('p','Preço por peso ou histórico válido indisponível; não calcular custo zero.',box);
    el('p','Não representa compra, saldo disponível, economia comprovada nem custo total de fabricação.',box);
   }
   el('h4','Sugestões cadastradas de aproveitamento',box);if(!d.hints.length)el('p','Nenhuma regra válida de sobra cadastrada para este grupo.',box);
   for(const h of d.hints){el('p',h.sourceName+' → '+h.targetName+' · '+(h.requested?fmt(h.requested)+' peças pedidas nas condições cadastradas':'Sem demanda compatível neste grupo')+' · '+(h.size||'tamanho não limitado')+' · '+(h.color||'cor não limitada')+' · mínimo '+fmt(h.minWidthMm)+' × '+fmt(h.minLengthMm)+' mm · encaixe não confirmado.',box)}
  }
  function draw(){
   out.replaceChildren();visible=[];if(!active())return;const x=fresh();
   if(x.state!=='discovery-only'){drawBasket(x);el('p','Consulta indisponível. Confira pedidos, materiais, produção e baixas.',out);return}
   const q=norm(search.value),groups=x.groups.filter(g=>!q||norm([g.materialName,...g.models.flatMap(m=>[m.orderNumber,m.productName])].join(' ')).includes(q));el('p',groups.length+' grupos de matéria-prima observados. Quantidades podem aparecer em mais de uma matéria-prima; a cesta elimina a duplicidade.',out);
   el('p',(x.plannedRows||0)+' registros planejados reconhecidos · '+(x.blockedActivityPairs||0)+' vínculos com atividade/estado a conferir.',out);
   if(x.unlinkedActivity)el('p','Há atividade sem pedido vinculado; disponibilidade exige revisão.',out);
   const history=api.cutEvidence(data(),active()),materialHistory=api.materialHistory(data(),active());
   for(const g of groups.slice(offset,offset+15)){
    const card=el('article','',out);card.className='panel';el('h3',g.materialName+' · ID '+g.materialId,card);el('p',fmt(g.orderedPieces)+' peças pedidas em '+g.models.length+' modelos/pedidos candidatos.',card);
    drawGradeSuggestions(g,card);drawEvidence(g,card,history,materialHistory);const controls=el('div','',card),boxes=new Map();let shown=0;const result=el('div','',card);
    const update=(currentDiscovery)=>{result.replaceChildren();if(!active())return;for(const [key,c] of boxes)c.checked=selected.has(key);const current=currentDiscovery.groups?.find(z=>z.materialId===g.materialId);if(!current||JSON.stringify(current.models)!==JSON.stringify(g.models)){el('p','Pedidos ou baixas mudaram. Atualize a consulta antes de combinar.',result);return}
     const keys=g.models.filter(m=>selected.has(m.key)).map(m=>m.key),v=api.combine(current,keys);el('h4',fmt(v.orderedPieces)+' peças selecionadas · '+v.models.length+' modelos/pedidos',result);for(const l of v.combinedGrade)el('p',l.color+' · '+l.size+' · '+l.qty,result);el('p',v.isCombined?'Grupo candidato: conferir lote, largura, elasticidade, sentido, encaixe e grade antes de cortar.':'Selecione ao menos dois modelos/pedidos.',result)};
    function append(){for(const m of g.models.slice(shown,shown+50)){const label=el('label','',controls);label.style.cssText='display:block;overflow-wrap:anywhere';const c=el('input','',label);c.type='checkbox';c.checked=selected.has(m.key);boxes.set(m.key,c);el('span',' Pedido #'+m.orderNumber+' · '+m.productName+' · '+fmt(m.pieces)+' peças',label);c.onchange=()=>{if(!active())return;if(c.checked){if(selected.size>=1000&&!selected.has(m.key)){c.checked=false;return}if(!selected.has(m.key))selected.set(m.key,{key:m.key,signature:api.modelSignature(m)})}else selected.delete(m.key);sync()}}shown+=50;more.hidden=shown>=g.models.length}
    const more=button('Mais modelos deste grupo',card,append);append();button('Selecionar todos deste grupo',card,()=>addGroup(g,true));button('Limpar seleção',card,()=>addGroup(g,false));visible.push(update);
   }
   const catalog=el('details','',out);el('summary','Outros modelos cadastrados com matéria-prima em comum (sem ordem de corte)',catalog);
   const cg=api.catalogGroups(data(),active()).filter(g=>!q||norm([g.materialName,...g.products.map(p=>p.productName)].join(' ')).includes(q));el('p',cg.length+' grupos no catálogo. Não cria demanda nem acrescenta peças à cesta.',catalog);
   let shownCatalog=0;const list=el('div','',catalog);function moreCatalog(){for(const g of cg.slice(shownCatalog,shownCatalog+15)){const group=el('details','',list);el('summary',g.materialName+' · '+g.products.length+' modelos',group);for(const p of g.products)el('p',p.productName,group)}shownCatalog+=15;moreCatalogButton.hidden=shownCatalog>=cg.length}const moreCatalogButton=button('Mais grupos do catálogo',catalog,moreCatalog);moreCatalog();
   if(offset>0)button('Grupos anteriores',out,()=>{offset=Math.max(0,offset-15);draw()});if(offset+15<groups.length)button('Mais grupos',out,()=>{offset+=15;draw()});sync(x)
  }
  button('Limpar toda a cesta',basket,clearAll);button('Consultar / atualizar grupos',host,()=>{offset=0;draw()});search.addEventListener('input',()=>{offset=0;draw()});maxLayers.addEventListener('change',()=>{offset=0;draw()});draw()
 }
 function mountRemnants(){
  const context=hostFor('produtos','hlgbRemnant9661',remAllowed);if(!context)return;const {host,active}=context,api=root.HLGBProductionPlanning9661;
  el('h2','Aproveitamento de sobras de tecido',host);el('p','Rascunho de política por modelo. Material compartilhado não garante encaixe; peso residual não comprova sobra reutilizável. Não altera cadastro, estoque ou corte.',host);
  const search=field('Buscar modelo de origem',host,'search'),source=el('select','',host);source.setAttribute('aria-label','Modelo de origem');source.style.maxWidth='100%';
  const note=field('Observações gerais',host),decision=el('select','',host);decision.setAttribute('aria-label','Possibilidade de aproveitar sobras');for(const [v,t] of [['unknown','Não avaliado'],['yes','Sim, pode aproveitar'],['no','Não pode aproveitar']]){const o=el('option',t,decision);o.value=v}
  const targetSearch=field('Buscar modelo que pode sair da sobra',host,'search'),choices=el('div','',host),selectedHost=el('div','',host),result=el('div','',host);let offset=0,sourceOffset=0,selected=new Map(),signature='';
  const products=()=>Array.isArray(data()?.products)?data().products:[];
  const key=x=>JSON.stringify([x.productId,x.materialId]);
  function sourceOptions(){if(!active())return;const current=source.value,rows=products(),counts=new Map();for(const x of rows){if(x&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted)counts.set(String(x.id),(counts.get(String(x.id))||0)+1)}const matches=rows.filter(x=>x&&counts.get(String(x.id))===1&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted&&norm([x.name,x.code,x.id].join(' ')).includes(norm(search.value))).sort((a,b)=>String(a.name).localeCompare(String(b.name)));source.replaceChildren();const empty=el('option','Selecione um modelo',source);empty.value='';for(const x of matches.slice(sourceOffset,sourceOffset+50)){const o=el('option',String(x.name)+' · ID '+x.id,source);o.value=String(x.id)}source.value=[...source.options].some(o=>o.value===current)?current:'';sourceMore.disabled=sourceOffset+50>=matches.length;sourcePrev.disabled=sourceOffset===0}
  function renderSelected(){selectedHost.replaceChildren();el('h4',selected.size+' destinos selecionados',selectedHost);for(const [k,v] of selected){const card=el('div','',selectedHost);card.className='panel';el('strong',v.productName+' · '+v.materialName,card);for(const [prop,label] of [['minWidthMm','Largura mínima (mm)'],['minLengthMm','Comprimento mínimo (mm)'],['size','Tamanho'],['color','Cor'],['notes','Observação']]){const x=field(label,card);x.value=v[prop]??'';x.oninput=()=>{v[prop]=x.value;result.replaceChildren()}}button('Remover destino',card,()=>{selected.delete(k);renderSelected();drawTargets()})}}
  function drawTargets(){choices.replaceChildren();if(!active()||!source.value||decision.value!=='yes')return;const x=api.candidates(products(),source.value,targetSearch.value,offset,data()?.materials);el('p',x.total+' combinações locais de material. Política cadastrada: '+(x.policyState||'desconhecida'),choices);for(const v of x.rows){const b=button(v.productName+' · '+v.materialName,choices,()=>{if(!active()||selected.size>=50)return;if([...selected.values()].some(z=>z.productId===v.productId&&key(z)!==key(v))){el('p','Selecione apenas um material por destino.',result);return}selected.set(key(v),{...v});renderSelected();drawTargets()});b.disabled=selected.has(key(v));b.style.cssText='display:block;max-width:100%;white-space:normal;margin:4px 0'}if(offset>0)button('Destinos anteriores',choices,()=>{offset=Math.max(0,offset-30);drawTargets()});if(offset+30<x.total)button('Mais destinos',choices,()=>{offset+=30;drawTargets()})}
  function reset(){selected=new Map();note.value='';decision.value='unknown';offset=0;signature='';result.replaceChildren();if(source.value){const rows=products().filter(x=>String(x.id)===source.value&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted);if(rows.length===1){const old=rows[0].fabricRemnantPolicyV9630;signature=JSON.stringify([rows[0].id,rows[0].materials,old]);if(old&&['yes','no','unknown'].includes(old.state)){decision.value=old.state;note.value=old.notes||'';if(old.state==='yes'&&Array.isArray(old.eligible))for(const v of old.eligible.slice(0,50))selected.set(key(v),{...v,productName:String(products().find(x=>String(x.id)===String(v.productId))?.name||v.productId),materialName:String(v.materialId)})}}}renderSelected();drawTargets()}
  const sourcePrev=button('Modelos anteriores',host,()=>{sourceOffset=Math.max(0,sourceOffset-50);sourceOptions();reset()}),sourceMore=button('Mais modelos',host,()=>{sourceOffset+=50;sourceOptions();reset()});
  search.addEventListener('input',()=>{sourceOffset=0;sourceOptions();reset()});source.onchange=reset;decision.onchange=()=>{result.replaceChildren();if(decision.value!=='yes')selected.clear();renderSelected();drawTargets()};targetSearch.oninput=()=>{offset=0;drawTargets()};
  function preview(){if(!active()||!source.value)throw Error('source');const rows=products(),s=rows.filter(x=>String(x.id)===source.value&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted);if(s.length!==1||JSON.stringify([s[0].id,s[0].materials,s[0].fabricRemnantPolicyV9630])!==signature)throw Error('stale');
   const dimension=v=>v==null||v===''?null:Number(String(v).replace(',','.'));return api.preview(source.value,{state:decision.value,notes:note.value,eligible:[...selected.values()].map(v=>({productId:v.productId,materialId:v.materialId,minWidthMm:dimension(v.minWidthMm),minLengthMm:dimension(v.minLengthMm),size:v.size||'',color:v.color||'',notes:v.notes||''}))},rows,data()?.materials)}
  button('Conferir política de sobra',host,()=>{result.replaceChildren();try{const x=preview();el('p','Rascunho validado · '+x.policy.eligible.length+' destinos. Encaixe físico e saldo ainda não confirmados.',result);if(can('corte')){const w=api.weights(data()?.cuts,source.value);el('h4','Pesagens registradas (resíduo não classificado)',result);for(const r of w.slice(-30))el('p','Corte '+r.cutId+' · '+fmt(r.unclassifiedKg)+' kg sem classificação · reutilizável não confirmado',result)}}catch(_){el('p','Confira o modelo, material compartilhado, dimensões, possíveis ciclos e alterações do cadastro.',result)}});
  let checking=false;
  const checkSave=button('Conferir segurança para salvar (sem gravar)',host,async()=>{
   if(checking||!active())return;checking=true;checkSave.disabled=true;result.replaceChildren();
   const pid=source.value,actor=user(),sameContext=()=>active()&&source.value===pid&&user()===actor;
   try{
    const draft=preview(),draftSignature=JSON.stringify(draft.policy),guard=root.hlgbWalIdbGuard9536,identity=root.hlgbRecordPendingIdentitySet9535;
    if(typeof guard?.probe!=='function'||typeof guard?.ids!=='function'||typeof guard?.status!=='function'||typeof identity!=='function'||typeof root.cloudRequest!=='function')throw Error('guard');
    const pending=()=>{const all=new Set([...guard.ids(),...identity()].map(String));return guard.status().readFailed!==false||all.has('products::'+pid)||all.has('products|'+pid)};
    await guard.probe();if(!sameContext())return;if(pending()){el('p','Há pendência de sincronização ou a fila não pôde ser confirmada. Nenhuma gravação feita.',result);return}
    const remote=await root.cloudRequest('hlgb_records?select=module,entity_id,data,revision,deleted_at&module=eq.products&entity_id=eq.'+encodeURIComponent(pid)+'&limit=2',{method:'GET'});
    if(!sameContext())return;await guard.probe();if(!sameContext())return;
    if(JSON.stringify(preview().policy)!==draftSignature)throw Error('changed');
    const snapshots=typeof hlgbRecordSnapshots!=='undefined'?hlgbRecordSnapshots:root.hlgbRecordSnapshots;
    const prepared=api.prepareRemnantChange({productId:pid,input:draft.policy,products:products(),materials:data()?.materials,remote:Array.isArray(remote)&&remote.length===1?remote[0]:null,snapshot:snapshots?.products?.get(pid),pending:pending(),allowed:active()});
    const messages={'permission':'Acesso indisponível.','pending-or-unverified':'Fila de sincronização pendente ou não verificada.','missing-source':'Cadastro local indisponível.','remote-missing':'Produto remoto ausente, duplicado ou excluído.','revision-changed':'Revisão da nuvem não coincide com a local. Atualize antes de editar.','record-changed':'Cadastro foi alterado ou a cópia local está diferente da nuvem.','policy-limit':'Política acima do limite de destinos; não truncar.','material-or-target':'Material ou destino precisa de revisão.','invalid-policy':'Revise a política e os vínculos.'};
    result.replaceChildren();el('p',prepared.state==='prepared-only'?'Pré-conferência aprovada · revisão '+prepared.expectedRevision+' · '+(prepared.changed?'alteração preparada':'nenhuma mudança')+'. Nenhuma gravação feita. Permissão de escrita, destinos remotos e confirmação entre sessões ainda exigem validação.':(messages[prepared.reason]||'Pré-conferência indisponível.')+' Nenhuma gravação feita.',result);
   }catch(_){if(sameContext()){result.replaceChildren();el('p','Não foi possível conferir a segurança da alteração. Revise a conexão e o cadastro. Nenhuma gravação feita.',result)}}
   finally{checking=false;if(active())checkSave.disabled=false}
  });
  button('Exportar rascunho da política (JSON)',host,()=>{try{const x=preview();if(!active())return;const url=URL.createObjectURL(new Blob([JSON.stringify({...x,format:'hlgb-remnant-policy-draft-v1',uploaded:false},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='politica-sobra-'+source.value.replace(/[^a-z0-9_-]/gi,'_')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);result.replaceChildren();el('p','Arquivo local gerado. Não foi salvo no cadastro.',result)}catch(_){result.replaceChildren();el('p','Não foi possível exportar. Confira o rascunho.',result)}});
  sourceOptions();
 }
 function mountCutShortcut(){
  const area=document.getElementById('corte'),id='hlgbJointCutShortcut9673',actor=user();let bar=document.getElementById(id);
  if(!actor||!can('corte')||!area?.classList.contains('active')){bar?.remove();return}
  if(bar&&bar.dataset.planningActor!==actor){bar.remove();bar=null}
  if(!bar){
   bar=el('div','',area);bar.id=id;bar.className='panel';bar.dataset.planning9661='1';bar.dataset.planningActor=actor;
   const top=document.getElementById('cutSummaryCards');if(top?.parentNode===area)area.insertBefore(bar,top);else if(area.firstChild!==bar)area.insertBefore(bar,area.firstChild);
   button('Corte Conjunto',bar,()=>{if(!bar.isConnected||!area.classList.contains('active')||user()!==actor||!cutAllowed())return;mountCut();const target=document.getElementById('hlgbJointCut9661');if(!target||target.dataset.planningActor!==actor)return;target.setAttribute('tabindex','-1');target.focus?.({preventScroll:true});target.scrollIntoView?.({block:'start',behavior:'auto'})});
   el('p','',bar);
  }
  const allowed=cutAllowed(),target=document.getElementById('hlgbJointCut9661'),ready=allowed&&!!target&&target.dataset.planningActor===actor;
  const note=allowed?(ready?'Selecione pedidos e modelos que compartilham matéria-prima.':'Planejamento ainda indisponível. Confira o carregamento dos módulos.'):'O planejamento requer acesso a Corte, Pedidos, Produtos, Materiais e Produção.';
  bar.children[0].disabled=!ready;if(bar.children[1].textContent!==note)bar.children[1].textContent=note;
 }
 function refresh(){mountCut();mountRemnants();mountCutShortcut()}
 document.addEventListener('click',()=>setTimeout(refresh,0),true);document.addEventListener('visibilitychange',()=>{clear();if(!document.hidden)refresh()});root.addEventListener?.('hlgb:logout',clear);root.addEventListener?.('hlgb:authenticated',()=>{clear();refresh()});setTimeout(refresh,1000);
})(typeof window!=='undefined'?window:null);
