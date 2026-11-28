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
 const jointPage='hlgbJointCutPage9732',jointNav='hlgbJointCutNav9732';
 function clear(){root.hlgbJointWorkspaceEvidence9714={observed:false};for(const x of document.querySelectorAll('[data-planning9661]'))x.remove();document.getElementById(jointNav)?.remove();document.getElementById(jointPage)?.remove()}
 function ensureJointPage(){const cut=document.getElementById('corte');if(!cut?.parentNode)return null;let p=document.getElementById(jointPage);if(!p){p=el('section','',cut.parentNode);p.id=jointPage;p.className='page';el('h1','Corte Conjunto',p)}return p}
 function openJoint(){if(!cutAllowed()||!user())return;const p=ensureJointPage();if(!p)return;for(const x of document.querySelectorAll('.page'))x.classList.remove('active');p.classList.add('active');for(const x of document.querySelectorAll('#nav button'))x.classList.remove('active');const nav=document.getElementById(jointNav);if(nav){nav.classList.add('active');try{if(typeof openParentNavGroup==='function')openParentNavGroup(nav)}catch(_){}}mountCut();const host=document.getElementById('hlgbJointCut9661');if(host){host.setAttribute('tabindex','-1');host.focus?.({preventScroll:true});host.scrollIntoView?.({block:'start',behavior:'auto'})}}
 function hostFor(page,id,allowed){const area=document.getElementById(page),old=document.getElementById(id),actor=user();if(!allowed()||!actor||!area?.classList.contains('active')){old?.remove();return null}if(old&&old.dataset.planningActor!==actor)old.remove();else if(old)return null;if(!root.HLGBProductionPlanning9661)return null;const host=el('section','',area);host.id=id;host.className='panel';host.dataset.planning9661='1';host.dataset.planningActor=actor;return {host,active:()=>!document.hidden&&host.isConnected&&allowed()&&area.classList.contains('active')&&user()===actor}}

 function mountCut(){
  const context=hostFor(jointPage,'hlgbJointCut9661',cutAllowed);if(!context)return;const {host,active}=context,api=root.HLGBProductionPlanning9661;
  host.dataset.jointWorkspace9714='1';host.style.cssText='min-width:0;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere';
  const heading=el('header','',host);heading.style.cssText='border-bottom:1px solid #ddd;padding:6px 0 14px;margin-bottom:14px';
  el('h2','Corte Conjunto — planejamento por matéria-prima',heading);
  el('p','Planeje modelos que utilizam o mesmo material, confira grades e compare enfestos. Não cria corte nem baixa estoque.',heading);
  const quick=el('div','',heading);quick.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center';
  button('Simulação rápida / folhas de corte',quick,()=>{if(!active())return;const open=root.hlgbCutOrganization?.openJointSimulation9837;if(typeof open!=='function'){alert('Simulador rápido indisponível. Atualize a página.');return}open()});
  button('Consultar histórico real de combinações',quick,()=>{if(!active())return;historyPanel.open=true;historyPanel.scrollIntoView?.({block:'start',behavior:'auto'})});
  button('Ir à cesta de planejamento',quick,()=>{if(active())basket.scrollIntoView?.({block:'start',behavior:'auto'})});
  const historyPanel=el('details','',host);historyPanel.className='panel';el('summary','Histórico de cortes com grade real de vários modelos',historyPanel);
  const historyBody=el('div','',historyPanel);
  function drawJointHistory(){
   historyBody.replaceChildren();if(!active())return;
   const h=api.jointHistory9757(data(),active());
   el('p','Consulta somente de registros finalizados com grade efetivamente cortada de vários modelos. Não transforma simulações em cortes realizados; pesagem pertence ao corte inteiro.',historyBody);
   if(h.state!=='local-observation'){el('p','Fontes indisponíveis.',historyBody);return}
   el('p',h.rows.length+' corte(s) com grade real identificada · '+h.review+' registro(s) precisam de conferência. Cobertura local, não prova de sincronização.',historyBody);
   const comparison=el('details','',historyBody);el('summary','Combinações já cortadas e resultado de aproveitamento',comparison);
   el('p','Agrupa os mesmos modelos independentemente do pedido. Pesagem coletiva entra uma vez; peso médio é do conjunto, não de cada modelo. Sem pesagem não há percentual ou economia.',comparison);
   const comboFilter=el('div','',comparison);comboFilter.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px';
   const comboSearch=field('Buscar combinação, pedido ou material',comboFilter,'search'),comboFrom=field('De',comboFilter,'date'),comboTo=field('Até',comboFilter,'date'),comboOut=el('div','',comparison);let comboPage=0;
   function drawCombinations(){
    comboOut.replaceChildren();if(!active())return;
    const v=api.jointCombinationHistory(data(),{query:comboSearch.value,from:comboFrom.value,to:comboTo.value},active());
    if(v.state!=='local-combination-history'){el('p','Confira as datas e a disponibilidade do histórico.',comboOut);return}
    const s=v.summary,measure=x=>x===null?'Não registrado':fmt(x);
    el('p',v.groups.length+' combinações · '+fmt(s.cuts)+' cortes · '+fmt(s.pieces)+' peças · '+s.weighedCuts+' com pesagem · '+s.missingWeightCuts+' sem pesagem válida · '+s.review+' registros fora da análise a conferir.',comboOut);
    el('p','Peso total observado: '+measure(s.totalKg)+' kg · usado: '+measure(s.usedKg)+' kg · refugo: '+measure(s.wasteKg)+' kg · cobertura de pesagem: '+measure(s.weightCoveragePct)+'%.',comboOut);
    for(const g of v.groups.slice(comboPage,comboPage+15)){
     const row=el('details','',comboOut);el('summary',g.models.map(m=>m.productName).join(' + ')+' · '+g.cuts+' cortes · '+g.pieces+' pç',row);
     el('p','Materiais registrados: '+(g.materials.map(m=>m.name).join(' / ')||'Não registrados'),row);
     el('p','Pesagem em '+g.weighedCuts+' cortes · '+g.weighedPieces+' peças com medição · '+g.missingWeightCuts+' cortes sem medição.',row);
     if(g.totalKg!==null)el('p','Total '+fmt(g.totalKg)+' kg · usado '+fmt(g.usedKg)+' kg ('+fmt(g.usedPct)+'%) · refugo '+fmt(g.wasteKg)+' kg ('+fmt(g.wastePct)+'%) · sem classificação '+fmt(g.unclassifiedKg)+' kg · '+fmt(g.gramsPerPiece)+' g/peça no conjunto.',row);
     else el('p','Sem pesagem válida. Não é possível calcular aproveitamento.',row);
     for(const r of g.rows){const d=el('details','',row);el('summary','Corte '+r.cutId+' · '+(r.date||'sem data')+' · '+r.pieces+' pç',d);
      el('p',r.weights?'Total '+fmt(r.weights.totalKg)+' kg · usado '+fmt(r.weights.usedKg)+' kg · refugo '+fmt(r.weights.wasteKg)+' kg · sem classificação '+fmt(r.weights.unclassifiedKg)+' kg':'Pesagem ausente ou inconsistente.',d);
      el('p','Responsáveis: '+(r.people.join(' / ')||'Não registrados'),d);
      if(r.weights?.note)el('p','Observação da pesagem: '+r.weights.note,d);
      for(const material of r.materials)el('p','Material: '+material.name+' · '+(material.weight===null?'Peso não registrado':material.weight+' '+material.unit),d);
      for(const m of r.models)el('p',m.productName+' · pedido '+m.orderNumber+' · '+(m.client||'Cliente não registrado')+' · '+m.pieces+' pç · '+m.grade.map(x=>x.color+' '+x.size+': '+x.qty).join(' / '),d);
     }
    }
    if(comboPage>0)button('Anterior',comboOut,()=>{comboPage-=15;drawCombinations()});if(comboPage+15<v.groups.length)button('Mais combinações',comboOut,()=>{comboPage+=15;drawCombinations()});
   }
   for(const f of [comboSearch,comboFrom,comboTo])f.addEventListener('input',()=>{comboPage=0;drawCombinations()});
   comparison.addEventListener('toggle',()=>{if(comparison.open)drawCombinations()});
   const fieldSearch=field('Buscar modelo, pedido, material ou corte no histórico',historyBody,'search'),result=el('div','',historyBody);let offset=0;
   const drawRows=()=>{result.replaceChildren();const q=norm(fieldSearch.value).trim().split(/\s+/).filter(Boolean);const rows=h.rows.filter(r=>q.every(t=>norm([r.cutId,r.date,...r.models.flatMap(m=>[m.productName,m.orderNumber,m.client]),...r.materials.map(m=>m.name)].join(' ')).includes(t)));
    for(const r of rows.slice(0,offset+20)){const d=el('details','',result);el('summary','Corte '+r.cutId+' · '+(r.date||'Data não registrada')+' · '+r.pieces+' peças · '+r.models.map(m=>m.productName).join(' / '),d);
     el('p','Responsáveis: '+(r.people.join(' / ')||'Não registrados'),d);
     el('p',r.weights?'Pesagem coletiva: '+r.weights.totalKg+' kg total · '+r.weights.usedKg+' kg usado · '+r.weights.wasteKg+' kg refugo · '+r.weights.unclassifiedKg+' kg sem classificação · '+r.weights.usedPct.toFixed(1)+'% peso usado':'Pesagem completa não registrada ou inconsistente.',d);
     if(r.weights?.note)el('p',r.weights.note,d);
     for(const m of r.materials)el('p',m.name+' · '+(m.weight===null?'Não registrado':m.weight+' '+m.unit),d);
     for(const m of r.models){el('h4',m.productName+' · Pedido #'+m.orderNumber+' · '+m.pieces+' pç',d);el('p',m.client||'Cliente não registrado',d);el('p',m.grade.map(g=>g.color+' '+g.size+': '+g.qty).join(' · '),d)}
    }
    if(!rows.length)el('p','Nenhum corte com grade real de vários modelos encontrado neste filtro.',result);
    if(offset+20<rows.length)button('Mais cortes do histórico',result,()=>{offset+=20;drawRows()});
   };fieldSearch.addEventListener('input',()=>{offset=0;drawRows()});drawRows();
  }
  historyPanel.addEventListener('toggle',()=>{if(historyPanel.open)drawJointHistory()});
  const stats=el('div','',host);stats.dataset.jointOverview9714='1';stats.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:10px;margin:12px 0';
  const filters=el('section','',host);filters.className='panel';el('h3','1. Encontrar matéria-prima e modelos',filters);
  const filterGrid=el('div','',filters);filterGrid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:10px';
  const search=field('Buscar matéria-prima, pedido ou modelo',filterGrid,'search'),maxLayers=field('Limite de folhas para simulação (opcional)',filterGrid,'number');
  const select=(label,items)=>{const l=el('label',label,filterGrid);l.style.cssText='display:block;min-width:0';const s=el('select','',l);s.style.cssText='display:block;width:100%;max-width:100%;min-width:0';s.setAttribute('aria-label',label);for(const [v,t] of items){const o=el('option',t,s);o.value=v}return s};
  const focusModel=select('Escolher corte / modelo',[['','Todos os candidatos']]);
  const material=select('Matéria-prima',[['','Todas']]),orderBy=select('Ordenar grupos',[['','Ordem original'],['pieces','Mais peças'],['pairs','Mais modelos/pedidos'],['colors','Mais cores em comum'],['name','Nome do material']]);
  const commonLabel=el('label','',filters),common=el('input','',commonLabel);common.type='checkbox';el('span',' Mostrar somente grupos com pelo menos uma cor de grade em comum',commonLabel);
  const allPanel=el('details','',host);allPanel.className='panel';allPanel.open=true;el('summary','Todos os modelos em pedidos — compatibilidade por matéria-prima',allPanel);
  el('p','Escolha um modelo ou material para consultar os pares, mesmo com cores diferentes. Esta consulta inclui registros que ainda exigem revisão; não autoriza corte nem compra.',allPanel);
  const allFocus=el('select','',allPanel),allMat=el('select','',allPanel),allOut=el('div','',allPanel);
  for(const [s,label] of [[allFocus,'Todos os modelos em pedidos'],[allMat,'Matéria-prima da consulta completa']]){s.setAttribute('aria-label',label);s.style.cssText='display:block;width:100%;max-width:100%;margin:6px 0'}
  let allIndex=null,allSelection=new Set();
  function fillAll(s,items,first){const old=s.value;s.replaceChildren();const a=el('option',first,s);a.value='';for(const [v,t] of items){const o=el('option',t,s);o.value=v}s.value=items.some(([v])=>v===old)?old:''}
  function drawAll(d){
   if(!active())return;
   allIndex=api.orderMaterialCompatibility(data(),d,true);
   fillAll(allFocus,allIndex.models.map(m=>[m.key,'#'+m.orderNumber+' · '+m.productName+' · '+fmt(m.pieces)+' pç']),'Todos os modelos ('+allIndex.models.length+')');
   refreshAllMaterials();renderAll();
  }
  function refreshAllMaterials(){
   const g=allIndex?.groups||[];fillAll(allMat,g.filter(x=>!allFocus.value||x.models.some(m=>m.key===allFocus.value)).map(x=>[x.materialId,x.materialName+' · '+x.models.length+' pedido(s)/modelo(s)']),'Escolher matéria-prima');
   if(allFocus.value&&!allMat.value){const matches=g.filter(x=>x.models.some(m=>m.key===allFocus.value));if(matches.length===1)allMat.value=matches[0].materialId}
  }
  let desiredLayers='';
  function showAdjustment(group,area,active){
   const target=desiredLayers===''?null:Number(desiredLayers),v=api.gradeAdjustmentPreview(group,target,active());
   if(v.state!=='local-preview'){el('p','Não foi possível comparar. Informe um número inteiro de 1 a 10.000 folhas e confira as grades.',area);return}
   if(v.sameRatios.length){
    const ratios=el('details','',area);el('summary','Grades proporcionais, inclusive em cores diferentes ('+v.sameRatios.length+')',ratios);
    for(const r of v.sameRatios){el('p',r.ratio.map(s=>s.size+': '+s.perBlock).join(' / ')+(r.crossColor?' · repetir planejamento em enfestos separados por cor':''),ratios);for(const e of r.entries)el('p','#'+e.orderNumber+' · '+e.productName+' · '+e.color+' · '+e.blocks+' blocos',ratios)}
   }
   if(target===null){el('p','Informe as folhas desejadas para ver quais grades precisariam de ajuste.',area);return}
   for(const c of v.colors){
    const d=el('details','',area);d.open=true;el('summary',c.color+' · '+c.exactLayers+' folhas sem ajuste · '+c.models.filter(m=>m.requiresAdjustment).length+' modelo(s) com ajuste para '+target+' folhas',d);
    for(const m of c.models){
     el('strong','#'+m.orderNumber+' · '+m.productName+(m.requiresAdjustment?' — grade precisa de ajuste':' — grade exata'),d);
     if(!m.requiresAdjustment)continue;
     for(const x of m.changes.filter(x=>x.needsAdjustment))el('p',x.size+' · pedido '+x.ordered+' · '+x.lower+' no enfesto + '+x.missing+' complementares OU '+x.upper+' (+ '+x.extra+' excedentes)',d);
    }
    el('p','Manter pedido: '+c.complementary+' peças complementares. Arredondar para cima: '+c.extra+' peças excedentes (não autorizadas).',d);
   }
   el('p','Nenhuma grade será alterada. Quantidades complementares mantêm o pedido original; excedentes exigem autorização. A proporção não comprova encaixe físico.',area);
  }
  function renderAll(){
   allOut.replaceChildren();if(!active()||!allIndex)return;
   if(allIndex.state!=='local-compatibility'){el('p','Consulta completa indisponível.',allOut);return}
   el('p',allIndex.models.length+' pedido(s)/modelo(s) · '+allIndex.groups.length+' materiais · '+allIndex.review+' registros a conferir.',allOut);
   const focus=allIndex.models.find(m=>m.key===allFocus.value),g=allIndex.groups.find(x=>x.materialId===allMat.value);
   if(focus&&!focus.materialIds.length)el('p',focus.productName+' — material cortável não identificado no cadastro.',allOut);
   if(!g){if(focus)for(const x of allIndex.groups.filter(x=>x.models.some(m=>m.key===focus.key)))el('p',x.materialName+' · '+Math.max(0,x.models.length-1)+' outro(s) pedido(s)/modelo(s)',allOut);return}
   el('strong',g.materialName+' · '+g.models.length+' pedido(s)/modelo(s) com a mesma matéria-prima',allOut);
   const simulation=el('div','',allOut),list=el('div','',allOut);let shown=0;
   function simulate(){
    simulation.replaceChildren();const models=g.models.filter(m=>allSelection.has(m.key)&&!m.review&&m.pieces>0);
    if(models.length<2){el('p','Marque dois ou mais modelos para comparar as grades pedidas.',simulation);return}
    const cap=maxLayers.value===''?null:Number(maxLayers.value);
    const plans=api.gradeSuggestions({...g,models},cap);
    if(!plans.length){el('p','Não foi possível simular estas grades. Confira as quantidades e o limite de folhas.',simulation);return}
    for(const p of plans){el('p',p.color+' · '+p.total+' pç · '+p.modelCount+' modelo(s)/pedido(s) · '+p.layers+' folhas na opção exata'+(p.modelCount<2?' — enfesto separado por cor':''),simulation);const detail=el('details','',simulation);el('summary','Grade por modelo e tamanho',detail);for(const row of p.base)el('p',row.productName+' · '+row.size+' · '+row.qty+' pç · '+row.perLayer+' por folha',detail)}
    const adjust=el('details','',simulation);el('summary','Comparar proporções e ajustes de grade',adjust);adjust.open=true;
    const targetField=field('Folhas desejadas para comparação (opcional)',adjust,'number');targetField.min='1';targetField.max='10000';targetField.step='1';targetField.value=desiredLayers;
    const adjustments=el('div','',adjust);const refresh=()=>{adjustments.replaceChildren();if(!active())return;showAdjustment({...g,models},adjustments,active)};targetField.addEventListener('input',()=>{desiredLayers=targetField.value;refresh()});refresh();
    el('p','Simulação sobre quantidades pedidas, não saldo disponível. Cores diferentes permanecem em enfestos separados; encaixe físico não verificado.',simulation);
   }
   function append(){for(const m of g.models.slice(shown,shown+25)){const label=el('label','',list);label.style.cssText='display:block;padding:6px 0;overflow-wrap:anywhere';const c=el('input','',label);c.type='checkbox';c.checked=allSelection.has(m.key);c.disabled=m.review||!m.pieces;c.addEventListener('change',()=>{if(c.checked)allSelection.add(m.key);else allSelection.delete(m.key);simulate()});const shared=focus?m.grade.some(a=>focus.grade.some(b=>norm(a.color)===norm(b.color))):null;el('span',' #'+m.orderNumber+' · '+m.productName+' · '+fmt(m.pieces)+' pç · '+[...new Set(m.grade.map(x=>x.color))].join(', ')+' · Pedido: '+m.status+' · Corte: '+m.cutStatus+(m.planningEligible?' · candidato ao planejamento':' · apenas consulta/simulação; não liberar novo corte')+(focus&&m.key!==focus.key?(shared?' · cor em comum':' · cor diferente / enfesto separado'):'')+(m.review?' · grade/cadastro a revisar':''),label)}shown+=25;more.hidden=shown>=g.models.length}
   const more=button('Mais modelos deste material',allOut,append);append();simulate();
   button('Limpar seleção da consulta completa',allOut,()=>{allSelection.clear();renderAll()});
  }
  allFocus.addEventListener('change',()=>{allSelection.clear();allMat.value='';refreshAllMaterials();renderAll()});allMat.addEventListener('change',()=>{allSelection.clear();renderAll()});
  const flow=el('p','2. Selecionar modelos → 3. Comparar grades e enfestos → 4. Revisar a cesta e planejar compras',host);flow.style.cssText='font-weight:600;margin:12px 0';
  const basket=el('section','',host);maxLayers.min='1';maxLayers.max='10000';maxLayers.step='1';basket.className='panel';el('h3','4. Cesta única de planejamento',basket);
  el('p','A mesma combinação pedido/modelo aparece uma única vez na cesta, mesmo que utilize vários materiais. A seleção permanece ao mudar o filtro ou página.',basket);
  const basketOut=el('div','',basket),out=el('div','',host);out.style.cssText='display:grid;grid-template-columns:minmax(0,1fr);gap:12px';let offset=0,visible=[],selected=new Map(),scenarios=new Map();
  const scenarioPanel=el('details','',basket);el('summary','Comparar cenários A / B / C (nesta sessão)',scenarioPanel);const scenarioOut=el('div','',scenarioPanel);
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
  function drawBasket(x,selectionPreview){
   basketOut.replaceChildren();if(!active())return;
   el('p',selected.size+' combinações pedido/modelo selecionadas.',basketOut);
   if(!selected.size)return;
   const v=selectionPreview||plan(x);if(v.state!=='local-preview'){el('p','Há seleção alterada ou ambígua. Limpe a cesta e selecione novamente. Não será calculada nem enviada para Compras.',basketOut);return}
   el('h4',fmt(v.orderedPieces)+' peças únicas na cesta · '+v.byProduct.length+' modelos',basketOut);
   const models=el('details','',basketOut);el('summary','Modelos consolidados por quantidade',models);
   for(const m of v.byProduct)el('p',m.productName+' · '+fmt(m.pieces)+' peças · '+m.orderCount+' pedido(s)',models);
   const d=api.materialDemand(v,data(),active());if(!active()){basketOut.replaceChildren();return}
   if(d.state!=='local-estimate'){el('p','Fichas técnicas indisponíveis para estimativa.',basketOut);return}
   el('h4','Necessidade bruta de materiais',basketOut);el('p',d.partial?'Estimativa parcial: existem fichas, unidades ou materiais a revisar.':'Estimativa de consumo e perdas das fichas técnicas locais; sem abatimento de estoque.',basketOut);
   const materialList=el('details','',basketOut);materialList.open=false;el('summary',d.rows.length+' materiais/unidades/cores consolidados',materialList);
   for(const r of d.rows){const item=el('div','',materialList);el('strong',r.materialName+' · '+(r.color||'cor da ficha não informada')+' · '+fmt(r.needed)+' '+r.unit,item);const detail=el('details','',item);el('summary','Ver consumo por modelo',detail);for(const m of r.models)el('p',m.productName+' · '+fmt(m.needed)+' '+r.unit,detail)}
   if(d.issues.length){const detail=el('details','',basketOut);el('summary','Conferências necessárias ('+d.issues.length+')',detail);for(const m of d.models.filter(x=>x.issues.length))el('p',m.productName+' · '+m.issues.join(', '),detail)}
   if(purchaseAllowed()&&typeof root.hlgbWeeklyMaterialPlanner9583?.setSelection==='function')button('Enviar cesta para planejamento semanal de Compras',basketOut,transfer);
   else el('p','Envio para Compras requer acesso a compras, estoque e fornecedores.',basketOut);
  }
  function drawScenarios(x){
   scenarioOut.replaceChildren();if(!active())return;
   el('p','Rascunhos locais, mantidos ao mudar filtros. Não são cortes realizados; fechar a área ou sair encerra a sessão.',scenarioOut);
   for(const slot of ['A','B','C']){const s=scenarios.get(slot);if(!s)continue;const g=x.groups?.find(g=>g.materialId===s.materialId),valid=g&&s.keys.every(k=>g.models.some(m=>m.key===k.key&&api.modelSignature(m)===k.signature));
    const line=el('div','',scenarioOut);el('strong','Cenário '+slot+' · '+s.materialName+' · '+s.names.join(' / '),line);el('p',s.summary.total+' peças · '+s.summary.spreads+' enfestos · '+s.summary.combinedPieces+' juntas · '+s.summary.remaining+' complementares'+(valid?'':' · dados alterados — revise'),line);
    button('Remover cenário '+slot,line,()=>{scenarios.delete(slot);drawScenarios(fresh())});
   }
   if(!scenarios.size)el('p','Selecione modelos e guarde uma opção em A, B ou C.',scenarioOut);
  }
  function sync(x=fresh()){if(!active())return;const checked=plan(x);drawBasket(x,checked);drawScenarios(x);for(const fn of visible)fn(x,checked)}
  function addGroup(g,on){if(!active())return;const add=g.models.filter(m=>!selected.has(m.key));if(on&&selected.size+add.length>1000){el('p','Limite de 1000 combinações por cesta. Separe o planejamento.',basketOut);return}for(const m of g.models){if(on){if(!selected.has(m.key))selected.set(m.key,{key:m.key,signature:api.modelSignature(m)})}else selected.delete(m.key)}sync()}
  function overview9714(x){
   const o=api.workspaceOverview9714(x,active());stats.replaceChildren();
   const values=[['Matérias-primas',o.state==='unavailable'?null:o.materials],['Pedidos únicos',o.orders],['Modelos únicos',o.products],['Peças pedidas únicas',o.pieces]];
   for(const [label,value] of values){const item=el('div','',stats);item.className='card';item.style.cssText='min-width:0;padding:12px;border:1px solid #ddd;border-radius:10px';el('small',label,item);const n=el('strong',value==null?'Não confirmado':fmt(value),item);n.style.cssText='display:block;font-size:1.4rem;margin-top:5px'}
   if(o.ambiguous)el('p',o.ambiguous+' combinação(ões) divergentes não incluídas nos totais.',stats);
   return o;
  }
  function combinedMatrix9714(rows,host){
   const colors=[...new Set(rows.map(r=>r.color))],sizes=[...new Set(rows.map(r=>r.size))];
   if(!colors.length||!sizes.length)return;
   const order=['PP','P','M','G','GG','XG','EG','G1','G2','G3','G4'];sizes.sort((a,b)=>{const i=order.indexOf(a),j=order.indexOf(b);return (i<0?999:i)-(j<0?999:j)||a.localeCompare(b,'pt-BR',{numeric:true})});
   const grid=new Map();for(const r of rows){const k=JSON.stringify([r.color,r.size]);grid.set(k,(grid.get(k)||0)+r.qty)}
   const wrap=el('div','',host);wrap.style.cssText='overflow:auto;max-width:100%;min-width:0';wrap.dataset.jointMatrix9714='1';
   const table=el('table','',wrap),head=el('thead','',table),h=el('tr','',head);for(const name of ['Cor',...sizes,'Total'])el('th',name,h);
   const tbody=el('tbody','',table);for(const color of colors){const tr=el('tr','',tbody);el('th',color,tr);let total=0;for(const size of sizes){const v=grid.get(JSON.stringify([color,size]))||0;total+=v;el('td',fmt(v),tr)}el('td',fmt(total),tr)}
   const foot=el('tfoot','',table),tr=el('tr','',foot);el('th','Total',tr);let grand=0;for(const size of sizes){const v=colors.reduce((n,color)=>n+(grid.get(JSON.stringify([color,size]))||0),0);grand+=v;el('td',fmt(v),tr)}el('td',fmt(grand),tr);
  }
  function drawGradeSuggestions(g,card,open=false){
   const details=el('details','',card);details.open=open;el('summary','Sugestão automática de grade para encaixe',details);
   const limit=maxLayers.value===''?null:Number(maxLayers.value);if(limit!==null&&(!Number.isSafeInteger(limit)||limit<1||limit>10000)){el('p','Informe um limite inteiro de 1 a 10.000 folhas.',details);return}
   for(const group of api.compareGradeOptions(g,limit,active())){
    el('h4','Comparação matemática · '+group.color,details);
    const wrap=el('div','',details);wrap.style.cssText='overflow:auto;max-width:100%';
    const t=el('table','',wrap),h=el('tr','',el('thead','',t));
    for(const x of ['Opção','Enfestos','Peças em conjunto','Restantes','Máx. pç/folha'])el('th',x,h);
    const body=el('tbody','',t);
    for(const opt of group.options){const tr=el('tr','',body);for(const x of [opt.name,opt.spreads,opt.combinedPieces,opt.remaining,opt.peak])el('td',String(x),tr)}
   }
   for(const v of api.gradeSuggestions(g,limit)){
    const area=el('section','',details);el('h4',v.color+' · '+fmt(v.total)+' peças · '+fmt(v.layers)+' folhas (divisão matemática)',area);
    el('p',v.modelCount>=2?'Combinação de pedidos/modelos da mesma cor informada.':'Apenas um pedido/modelo nesta cor; não misturar cores sem conferir o tecido físico.',area);
    for(const r of v.base)el('p','Pedido #'+r.orderNumber+' · '+r.productName+' · '+r.size+' · '+r.perLayer+' por folha × '+v.layers+' = '+r.planned,area);
    if(v.alternative){const alt=el('details','',area);el('summary','Alternativa de '+v.alternative.layers+' folhas + grade restante',alt);for(const r of v.alternative.rows)el('p',r.productName+' · '+r.size+' · '+r.perLayer+' por folha · '+r.remainder+' restantes',alt)}
    if(v.multiSpreads?.length){const alternatives=el('details','',area);alternatives.open=false;el('summary','Planos com múltiplos enfestos',alternatives);el('p','Ordenação matemática: mais peças em enfestos conjuntos, menor quantidade de peças por folha e menos enfestos. Não é ranking de economia de tecido. '+(limit===null?'Informe o limite real de folhas antes de utilizar.':''),alternatives);
     for(const [i,p] of v.multiSpreads.entries()){const plan=el('details','',alternatives);plan.open=false;el('summary','Opção '+(i+1)+' · '+p.spreads.length+' enfestos · '+fmt(p.total)+' peças · '+fmt(p.remaining)+' restantes',plan);el('p',fmt(p.combinedPieces)+' peças em enfestos com dois ou mais pedidos/modelos · máximo '+fmt(p.peakPiecesPerLayer)+' peças por folha',plan);
      for(const [j,s] of p.spreads.entries()){const spread=el('section','',plan);el('h5','Enfesto '+(j+1)+' · '+fmt(s.layers)+' folhas · '+fmt(s.pieces)+' peças',spread);for(const r of s.rows)el('p','Pedido #'+r.orderNumber+' · '+r.productName+' · '+r.size+' · '+r.perLayer+' por folha × '+s.layers+' = '+r.planned,spread)}
     }
    }
   }
   el('p','Grade sugerida apenas por divisão das quantidades pedidas. Conferir saldo, lotes, largura, direção, limites do enfesto e moldes Audaces. Não comprova encaixe, consumo ou economia.',details);
  }
  function drawEvidence(g,card,history,materialHistory,existing){
   const d=api.groupEvidence(g,data(),history,active());if(d.state!=='local-observation')return;
   const box=existing||el('details','',card);if(!existing)el('summary','Histórico de pesagens e oportunidades de sobra',box);
   el('p','Pesagens locais do corte inteiro por modelo, sem atribuição ao tecido deste grupo. Descarte registrado não equivale à economia possível; saldo não classificado não é sobra reutilizável.',box);
   for(const m of d.models){const item=el('div','',box);el('strong',m.productName,item);el('p',m.valid?m.valid+' cortes com pesagem válida · '+fmt(m.totalKg)+' kg pesados · '+fmt(m.wasteKg)+' kg de descarte · '+fmt(m.wastePct)+'% descarte registrado · '+fmt(m.unclassifiedKg)+' kg não classificados':'Sem pesagem finalizada válida para análise.',item);if(m.review)el('p',m.review+' registros a conferir (não incluídos nos totais).',item)}
   const measured=api.materialEstimate(g,materialHistory,active());
   if(measured.state==='local-estimate'){el('h4','Consumo histórico desta matéria-prima',box);el('p','Média ponderada por peças de cortes finalizados; mistura histórica de tamanhos e cores, sem prova de economia ou saldo.',box);for(const m of measured.rows)el('p',m.productName+' · '+(m.estimatedKg===null?'Sem medição válida':fmt(m.gramsPerPiece)+' g/peça · '+m.cuts+' cortes · estimativa '+fmt(m.estimatedKg)+' kg para '+fmt(m.pieces)+' peças')+(m.review?' · '+m.review+' registros a conferir':''),box);el('p',measured.estimatedKg===null?'Sem previsão medida disponível.':(measured.uncoveredPieces?'Estimativa parcial: ':'Estimativa histórica: ')+fmt(measured.estimatedKg)+' kg · '+fmt(measured.coveredPieces)+' peças cobertas · '+fmt(measured.uncoveredPieces)+' sem medição.',box)}
   if(measured.state==='local-estimate'&&measured.estimatedKg!==null){
    const msg=el('p','',box);
    button('Exportar previsão do grupo (JSON)',box,()=>{
     if(!active())return;msg.textContent='';
     const now=fresh(),current=now.groups?.find(z=>z.materialId===g.materialId);
     if(now.state!=='discovery-only'||!current||JSON.stringify(current.models)!==JSON.stringify(g.models)){msg.textContent='Pedidos ou grades mudaram. Atualize a consulta antes de exportar.';return}
     const local=data(),draft=api.forecastDraft(current,local,api.materialHistory(local,true),new Date().toISOString(),active());
     if(draft.state!=='local-draft'||!active()){msg.textContent='Não há previsão válida para exportar.';return}
     try{const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='previsao-corte-'+draft.materialId.replace(/[^a-z0-9_-]/gi,'_')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);msg.textContent='Arquivo local de referência gerado para o grupo inteiro. Não salvo na nuvem; data do aparelho não comprova previsão anterior ao corte.'}catch(_){msg.textContent='Não foi possível exportar o arquivo.'}
    });
   }
   const backtest=api.materialBacktest(g,materialHistory,active());
   if(backtest.state==='local-observation'){const bt=el('details','',box);el('summary','Conferir precisão do histórico',bt);el('p','Teste retrospectivo: o último registro de medição é comparado com a média ponderada de pelo menos três medições anteriores. Não é previsão salva antes do corte; diferenças de grade, cor, lote e correções de registros podem afetar o resultado.',bt);for(const m of backtest.rows){el('p',m.productName+' · '+(m.state==='retrospective'?'Corte '+m.cutId+' · '+fmt(m.pieces)+' peças · '+m.priorCuts+' medições anteriores · referência '+fmt(m.expectedKg)+' kg · realizado '+fmt(m.actualKg)+' kg · diferença '+fmt(m.deltaKg)+' kg ('+fmt(m.deltaPct)+'%)':'Histórico datado insuficiente ou última data ambígua')+(m.undatedSamples?' · '+m.undatedSamples+' medições sem data válida':''),bt)}el('p','Diferença não comprova perda ou economia. O histórico não é alterado.',bt)}
   // Financial values are not exposed to operators without financial access.
   if(active()&&can('financeiro')){
    const cost=api.materialCostEstimate(g,measured,data()?.materials,true),brl=c=>Number(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    el('h4','Previsão financeira de consumo',box);
    if(cost.state==='local-estimate'&&cost.estimatedCents!==null){el('p','Preço de referência do cadastro local: '+brl(cost.referencePricePerKg*100)+'/kg. Não é preço efetivamente pago.',box);for(const r of cost.rows)el('p',r.productName+' · '+(r.estimatedCents===null?'Sem estimativa de custo':brl(r.estimatedCents)),box);el('p',(cost.uncoveredPieces?'Estimativa parcial: ':'Custo estimado: ')+brl(cost.estimatedCents)+' · '+fmt(cost.coveredPieces)+' peças cobertas · '+fmt(cost.uncoveredPieces)+' sem previsão.',box)}else el('p','Preço por peso ou histórico válido indisponível; não calcular custo zero.',box);
    el('p','Não representa compra, saldo disponível, economia comprovada nem custo total de fabricação.',box);
   }
   el('h4','Sugestões cadastradas de aproveitamento',box);if(!d.hints.length)el('p','Nenhuma regra válida de sobra cadastrada para este grupo.',box);
   for(const h of d.hints){
    const item=el('details','',box);el('summary',h.sourceName+' → '+h.targetName+' · '+(h.requested===null?'Demanda a conferir':h.requested?fmt(h.requested)+' peças pedidas nas condições cadastradas':'Sem demanda compatível neste grupo'),item);
    el('p',(h.size||'tamanho não limitado')+' · '+(h.color||'cor não limitada')+' · mínimo '+fmt(h.minWidthMm)+' × '+fmt(h.minLengthMm)+' mm · encaixe não confirmado.',item);
    if(h.demand?.length){el('p','Demanda por pedido, cor e tamanho (não é quantidade de peças que cabem na sobra).',item);for(const row of h.demand)el('p','Pedido #'+row.orderNumber+' · '+row.color+' · '+row.size+' · '+fmt(row.qty)+' peças',item)}
   }
  }
  function draw(){
   out.replaceChildren();visible=[];if(!active())return;const x=fresh();drawAll(x);
   if(x.state!=='discovery-only'){overview9714(x);root.hlgbJointWorkspaceEvidence9714={observed:false};drawBasket(x);el('p','Consulta indisponível. Confira pedidos, materiais, produção e baixas.',out);return}
   const overview=overview9714(x),byMaterial=new Map(overview.groups.map(g=>[g.materialId,g]));
   root.hlgbJointWorkspaceEvidence9714={observed:overview.state==='local-observation'||overview.state==='partial',materials:overview.materials,pairs:overview.pairs,products:overview.products,orders:overview.orders,ambiguous:overview.ambiguous,adjustedRows:Number.isSafeInteger(x.adjustedRows)?x.adjustedRows:null,duplicatePlannedPairs:Number.isSafeInteger(x.duplicatePlannedPairs)?x.duplicatePlannedPairs:null,blockedActivityPairs:Number.isSafeInteger(x.blockedActivityPairs)?x.blockedActivityPairs:null,source:'local-observation',remoteConfirmed:false,at:new Date().toISOString()};
   const optionsSignature=JSON.stringify(x.groups.map(g=>[g.materialId,g.materialName]));
   if(material.__options9714!==optionsSignature){
    const oldMaterial=material.value;material.replaceChildren();const all=el('option','Todas',material);all.value='';
    for(const g of x.groups){const o=el('option',g.materialName,material);o.value=g.materialId}
    material.value=x.groups.some(g=>g.materialId===oldMaterial)?oldMaterial:'';material.__options9714=optionsSignature;
   }
   const uniqueModels=new Map();
   for(const g of x.groups)for(const m of g.models)if(!uniqueModels.has(m.key))uniqueModels.set(m.key,m);
   const modelOptions=[...uniqueModels.values()].sort((a,b)=>a.productName.localeCompare(b.productName,'pt-BR')||a.orderNumber.localeCompare(b.orderNumber,'pt-BR',{numeric:true}));
   const focusSignature=JSON.stringify(modelOptions.map(m=>[m.key,m.productName,m.orderNumber,m.pieces]));
   if(focusModel.__signature9753!==focusSignature){
    const old=focusModel.value;focusModel.replaceChildren();const all=el('option','Todos os candidatos',focusModel);all.value='';
    for(const m of modelOptions){const o=el('option','Pedido #'+m.orderNumber+' · '+m.productName+' · '+fmt(m.pieces)+' pç',focusModel);o.value=m.key}
    focusModel.value=uniqueModels.has(old)?old:'';focusModel.__signature9753=focusSignature;
   }
   const q=norm(search.value).replace(/#/g,'').trim(),tokens=q.split(/\s+/).filter(Boolean);
   const groups=x.groups.filter(g=>{
    const text=norm([g.materialName,...g.models.flatMap(m=>['Pedido '+m.orderNumber,m.productName])].join(' '));
    return (!focusModel.value||g.models.some(m=>m.key===focusModel.value))&&(!material.value||g.materialId===material.value)&&(!common.checked||!!byMaterial.get(g.materialId)?.sharedColors.length)&&tokens.every(t=>text.includes(t))
   });
   if(orderBy.value)groups.sort((a,b)=>{const x=byMaterial.get(a.materialId),y=byMaterial.get(b.materialId);return orderBy.value==='name'?a.materialName.localeCompare(b.materialName,'pt-BR'):orderBy.value==='colors'?(y?.sharedColors.length||0)-(x?.sharedColors.length||0):((y?.[orderBy.value]||0)-(x?.[orderBy.value]||0))||a.materialName.localeCompare(b.materialName,'pt-BR')});
   el('h3','2. Modelos candidatos por material',out);
   if(focusModel.value)el('p','Exibindo materiais compartilhados pelo corte escolhido. Marque somente os modelos que deseja experimentar. A compatibilidade física ainda precisa ser conferida.',out);
   el('p',groups.length+' grupos de matéria-prima observados. Quantidades podem aparecer em mais de uma matéria-prima; a cesta elimina a duplicidade.',out);
   if(!groups.length)el('p','Nenhum grupo encontrado com os filtros atuais. Altere o material ou retire o filtro de cor em comum.',out);
   el('p',(x.plannedRows||0)+' registros planejados reconhecidos · '+(x.blockedActivityPairs||0)+' vínculos com atividade/estado a conferir.',out);
   if(x.adjustedRows||x.duplicatePlannedPairs)el('p',fmt(x.adjustedRows||0)+' cortes com ajuste de grade e '+fmt(x.duplicatePlannedPairs||0)+' vínculos planejados duplicados retirados da sugestão para conferência.',out);
   if(x.unlinkedActivity)el('p','Há atividade sem pedido vinculado; disponibilidade exige revisão.',out);
   const singles=api.unpairedModels(x,active());
   const unpaired=el('details','',out);el('summary','Sem combinação observada / precisam de revisão ('+singles.length+')',unpaired);
   el('p','Não são saldos confirmados. Ausência de par na consulta local não comprova incompatibilidade física.',unpaired);
   const reviewText={'no-canonical-material':'Material cortável não identificado','written-off-or-blocked':'Baixa ou bloqueio registrado','ambiguous-grade-or-product':'Grade ou produto ambíguo','invalid-grade':'Grade inválida','missing-grade':'Grade ausente','ambiguous-order':'Pedido ambíguo'};
   const singleList=el('div','',unpaired);let singleOffset=0;
   const filteredSingles=singles.filter(m=>tokens.every(t=>norm([m.orderId,m.productId,m.productName,...m.materials.map(z=>z.name)].join(' ')).includes(t)));
   const moreSingles=button('Mais registros sem combinação',unpaired,()=>appendSingles());
   function appendSingles(){for(const m of filteredSingles.slice(singleOffset,singleOffset+30))el('p','Pedido ID '+m.orderId+' · '+(m.productName||'Modelo ID '+(m.productId||'não identificado'))+' · '+(m.reason==='review'?(reviewText[m.reviewReason]||'Conferir cadastro'):'Nenhum outro pedido/modelo candidato com o mesmo material nesta consulta: '+m.materials.map(z=>z.name).join(', ')),singleList);singleOffset+=30;moreSingles.hidden=singleOffset>=filteredSingles.length}
   appendSingles();
   let history=null,materialHistory=null;
   for(const g of groups.slice(offset,offset+15)){
    const card=el('article','',out);card.className='panel';card.dataset.jointMaterial9714=g.materialId;card.style.cssText='min-width:0;max-width:100%;border:1px solid #ddd;border-radius:12px;padding:14px;box-sizing:border-box';el('h3',g.materialName+' · ID '+g.materialId,card);el('p',fmt(g.orderedPieces)+' peças pedidas em '+g.models.length+' modelos/pedidos candidatos.',card);const coverage=byMaterial.get(g.materialId);el('p',coverage?.sharedColors.length?'Cores de grade em comum: '+coverage.sharedColors.join(', '):'Não há cor de grade compartilhada por dois candidatos. Não comprova cor física do tecido.',card);
    const controls=el('div','',card),boxes=new Map();let shown=0;const result=el('div','',card);
    const compatible=api.gradeMatches9726(g,active()),matchPanel=el('details','',card);matchPanel.open=false;
    el('summary','Grades proporcionais da mesma cor e material',matchPanel);
    el('p','Sugestões por proporção de tamanhos, não por encaixe físico. Selecionar adiciona os modelos completos (todas as cores) à cesta sem duplicar os pedidos.',matchPanel);
    if(compatible.state!=='local-observation')el('p','Grades precisam de conferência.',matchPanel);
    else if(!compatible.matches.length)el('p','Nenhuma proporção de grade idêntica neste grupo. As outras simulações permanecem disponíveis.',matchPanel);
    else{
     let matchOffset=0;const list=el('div','',matchPanel),notice=el('p','',matchPanel);
     const appendMatches=()=>{for(const m of compatible.matches.slice(matchOffset,matchOffset+10)){
      const area=el('div','',list);area.style.cssText='padding:8px;border-bottom:1px solid #ddd;overflow-wrap:anywhere';
      el('strong',m.color+' · '+m.ratio.map(r=>r.size+' '+r.perBlock).join(' / ')+' · '+fmt(m.colorPieces)+' peças nesta cor',area);
      el('p',m.models.length+' pedidos/modelos · '+m.distinctProducts+' produtos distintos · divisor comum '+fmt(m.commonFactor),area);
      for(const item of m.models)el('p','Pedido #'+item.orderNumber+' · '+item.productName+' · '+fmt(item.colorPieces)+' peças nesta cor',area);
      button('Selecionar modelos desta sugestão',area,()=>{
       notice.textContent='';if(!active())return;
       const now=fresh(),current=now.groups?.find(x=>x.materialId===g.materialId);
       if(now.state!=='discovery-only'||!current||JSON.stringify(current.models)!==JSON.stringify(g.models)){notice.textContent='Grades ou baixas mudaram. Atualize a consulta.';return}
       const keys=new Set(m.models.map(x=>x.key)),models=current.models.filter(x=>keys.has(x.key));
       if(models.length!==keys.size){notice.textContent='Seleção não comprovada.';return}
       const proposed=new Map(selected);
       for(const x of models)if(!proposed.has(x.key))proposed.set(x.key,{key:x.key,signature:api.modelSignature(x)});
       if(proposed.size>1000||api.planSelection(now,[...proposed.values()]).state!=='local-preview'){notice.textContent='Cesta alterada, ambígua ou acima do limite. Confira a seleção.';return}
       addGroup({...current,models},true);notice.textContent='Modelos adicionados à cesta para simulação, sem alterar o corte.';
      });
     }matchOffset+=10;moreMatches.hidden=matchOffset>=compatible.matches.length};
     const moreMatches=button('Mais sugestões de grades proporcionais',matchPanel,appendMatches);appendMatches();
    }
    const allPreview=el('details','',card);el('summary','Consultar sugestões de todos os modelos (opcional)',allPreview);
    let allBuilt=false;allPreview.addEventListener('toggle',()=>{if(allPreview.open&&!allBuilt&&active()){allBuilt=true;drawGradeSuggestions(g,allPreview,true)}});
    const evidence=el('details','',card);el('summary','Histórico de pesagens e oportunidades de sobra',evidence);
    let loaded=false;evidence.addEventListener('toggle',()=>{if(!evidence.open||loaded||!active())return;
     const latest=fresh(),current=latest.groups?.find(z=>z.materialId===g.materialId);
     if(!current||JSON.stringify(current.models)!==JSON.stringify(g.models)){el('p','Dados alterados. Atualize os grupos antes de consultar o histórico.',evidence);loaded=true;return}
     history=history||api.cutEvidence(data(),active());materialHistory=materialHistory||api.materialHistory(data(),active());
     drawEvidence(g,card,history,materialHistory,evidence);loaded=true;
    });
    const update=(currentDiscovery,checked)=>{result.replaceChildren();if(!active())return;for(const [key,c] of boxes)c.checked=selected.has(key);const current=currentDiscovery.groups?.find(z=>z.materialId===g.materialId);if(!current||JSON.stringify(current.models)!==JSON.stringify(g.models)){el('p','Pedidos ou baixas mudaram. Atualize a consulta antes de combinar.',result);return}
     const keys=g.models.filter(m=>selected.has(m.key)).map(m=>m.key);if(!keys.length){el('p','Selecione os cortes acima para simular sua combinação.',result);return}if(keys.some(key=>api.modelSignature(current.models.find(m=>m.key===key))!==selected.get(key)?.signature)||checked?.state!=='local-preview'){el('p','Seleção alterada ou ambígua. Limpe e selecione novamente.',result);return}const v=api.combine(current,keys);el('h4',fmt(v.orderedPieces)+' peças selecionadas · '+v.models.length+' modelos/pedidos',result);const matrix=el('details','',result);el('summary','Conferir grade combinada por cor e tamanho',matrix);combinedMatrix9714(v.combinedGrade,matrix);if(v.models.length){const preview=el('details','',result);el('summary','3. Simular enfestos somente dos modelos selecionados',preview);let built=false;preview.addEventListener('toggle',()=>{if(preview.open&&!built&&active()){built=true;drawGradeSuggestions({...current,models:v.models},preview,true)}})}if(v.isCombined&&typeof api.jointPrintDraft==='function'&&typeof root.hlgbCutterSheetV9523?.previewOnPage9523==='function'){const print=el('details','',result);el('summary','Impressão compacta — rascunho',print);el('p','Escolha uma alternativa por cor. Imprime apenas a escolha, incluindo quantidades complementares. Não comprova saldo ou encaixe físico.',print);
     const choices=Object.create(null),cap=maxLayers.value===''?null:Number(maxLayers.value),group={...current,models:v.models};
     let options=[];try{options=api.selectedGradePlan(group,cap,choices,true)}catch(_){}
     const summary=el('p','',print);
     const refreshSummary=()=>{try{const s=api.scenarioSummary(group,cap,choices,true);summary.textContent=s.spreads+' enfestos · '+s.combinedPieces+' peças juntas · '+s.remaining+' complementares'}catch(_){summary.textContent='Revise a grade e o limite de folhas.'}};
     for(const p of options){const l=el('label','Alternativa '+p.color,print),select=el('select','',l);select.setAttribute('aria-label','Alternativa '+p.color);for(const option of p.options){const o=el('option',option.name,select);o.value=option.id}select.value='exact';select.onchange=()=>{choices[p.color]=select.value;refreshSummary()}}
     refreshSummary();
     for(const slot of ['A','B','C'])button('Guardar cenário '+slot,print,()=>{if(!active())return;const latest=fresh(),g=latest.groups?.find(z=>z.materialId===current.materialId);if(!g||JSON.stringify(g.models)!==JSON.stringify(current.models)||plan(latest).state!=='local-preview'||keys.some(k=>!selected.has(k)))return;try{const s=api.scenarioSummary(group,cap,choices,true);scenarios.set(slot,{materialId:g.materialId,materialName:g.materialName,keys:v.models.map(m=>({key:m.key,signature:api.modelSignature(m)})),names:v.models.map(m=>m.productName+' #'+m.orderNumber),summary:s});scenarioPanel.open=true;drawScenarios(latest)}catch(_){refreshSummary()}});
el('p','Pacote: 1 ficha conjunta + '+v.models.length+' fichas individuais = '+(1+v.models.length)+' fichas. Cada ficha individual inicia em nova página para acompanhar a separação; grades extensas podem ocupar páginas adicionais. Confira na prévia de impressão.',print);
     if(v.models.length+1>10)el('p','Atenção: mais de 10 fichas neste pacote. Use a ficha conjunta ou divida a seleção em grupos menores se necessário.',print);
for(const [mode,label] of [['combined','Prévia da ficha conjunta'],['individual','Prévia das fichas individuais'],['packet','Prévia do pacote completo']])button(label,print,()=>{if(!active())return;const latest=fresh(),g=latest.groups?.find(z=>z.materialId===current.materialId);if(!g||JSON.stringify(g.models)!==JSON.stringify(current.models)||plan(latest).state!=='local-preview'||keys.some(k=>!selected.has(k))){el('p','Seleção ou grade alterada; atualize antes de imprimir.',print);return}try{const cap=maxLayers.value===''?null:Number(maxLayers.value);root.hlgbCutterSheetV9523.previewOnPage9523(api.jointPrintDraft({...g,models:g.models.filter(m=>keys.includes(m.key))},cap,mode,true,choices))}catch(_){el('p','Não foi possível preparar a ficha. Confira a grade e o limite de folhas.',print)}})}el('p',v.isCombined?'Grupo candidato: conferir lote, largura, elasticidade, sentido, encaixe e grade antes de cortar.':'Selecione ao menos dois modelos/pedidos.',result)};
    function append(){for(const m of g.models.slice(shown,shown+50)){const label=el('label','',controls);label.style.cssText='display:flex;align-items:center;gap:8px;min-width:0;padding:8px;border-bottom:1px solid #ddd;overflow-wrap:anywhere';const c=el('input','',label);c.type='checkbox';c.checked=selected.has(m.key);boxes.set(m.key,c);el('span',' Pedido #'+m.orderNumber+' · '+m.productName+' · '+fmt(m.pieces)+' peças',label);c.onchange=()=>{if(!active())return;if(c.checked){if(selected.size>=1000&&!selected.has(m.key)){c.checked=false;return}if(!selected.has(m.key))selected.set(m.key,{key:m.key,signature:api.modelSignature(m)})}else selected.delete(m.key);sync()}}shown+=50;more.hidden=shown>=g.models.length}
    const more=button('Mais modelos deste grupo',card,append);append();button('Selecionar todos deste grupo',card,()=>addGroup(g,true));button('Limpar seleção',card,()=>addGroup(g,false));visible.push(update);
   }
   const catalog=el('details','',out);el('summary','Outros modelos cadastrados com matéria-prima em comum (sem ordem de corte)',catalog);
   const cg=api.catalogGroups(data(),active()).filter(g=>!q||norm([g.materialName,...g.products.map(p=>p.productName)].join(' ')).includes(q));el('p',cg.length+' grupos no catálogo. Não cria demanda nem acrescenta peças à cesta.',catalog);
   let shownCatalog=0;const list=el('div','',catalog);function moreCatalog(){for(const g of cg.slice(shownCatalog,shownCatalog+15)){const group=el('details','',list);el('summary',g.materialName+' · '+g.products.length+' modelos',group);for(const p of g.products)el('p',p.productName,group)}shownCatalog+=15;moreCatalogButton.hidden=shownCatalog>=cg.length}const moreCatalogButton=button('Mais grupos do catálogo',catalog,moreCatalog);moreCatalog();
   if(offset>0)button('Grupos anteriores',out,()=>{offset=Math.max(0,offset-15);draw()});if(offset+15<groups.length)button('Mais grupos',out,()=>{offset+=15;draw()});sync(x)
  }
  button('Limpar toda a cesta',basket,clearAll);button('Consultar / atualizar grupos',host,()=>{offset=0;draw()});search.addEventListener('input',()=>{offset=0;draw()});maxLayers.addEventListener('change',()=>{offset=0;draw()});for(const input of [focusModel,material,orderBy,common])input.addEventListener('change',()=>{offset=0;draw()});draw()
 }
 function mountRemnants(){
  const context=hostFor('produtos','hlgbRemnant9661',remAllowed);if(!context)return;const {host,active}=context,api=root.HLGBProductionPlanning9661;
  el('h2','Aproveitamento de sobras de tecido',host);el('p','Rascunho de política por modelo. Material compartilhado não garante encaixe; peso residual não comprova sobra reutilizável. Não altera cadastro, estoque ou corte.',host);
  const review=el('div','',host),policyFilter=el('select','',host);policyFilter.setAttribute('aria-label','Filtrar avaliação de sobras');
  const statusLabels={unknown:'Não avaliado',yes:'Pode aproveitar',no:'Não pode aproveitar',review:'Revisar cadastro'};
  for(const [k,label] of [['','Todas as avaliações'],...Object.entries(statusLabels)]){const o=el('option',label,policyFilter);o.value=k}
  const search=field('Buscar modelo de origem',host,'search'),source=el('select','',host);source.setAttribute('aria-label','Modelo de origem');source.style.maxWidth='100%';
  const note=field('Observações gerais',host),decision=el('select','',host);decision.setAttribute('aria-label','Possibilidade de aproveitar sobras');for(const [v,t] of [['unknown','Não avaliado'],['yes','Sim, pode aproveitar'],['no','Não pode aproveitar']]){const o=el('option',t,decision);o.value=v}
  const targetSearch=field('Buscar modelo que pode sair da sobra',host,'search'),choices=el('div','',host),selectedHost=el('div','',host),result=el('div','',host);let offset=0,sourceOffset=0,selected=new Map(),signature='',editingId='',initialDraft='',legacyBlocked=false;
  const draftSignature=()=>JSON.stringify([decision.value,note.value,[...selected.values()]]);
  const products=()=>Array.isArray(data()?.products)?data().products:[];
  const key=x=>JSON.stringify([x.productId,x.materialId]);
  function sourceOptions(){if(!active())return;const current=source.value,rows=products(),coverage=api.remnantCoverage9727(rows,data()?.materials,active()),byId=new Map(coverage.rows.map(x=>[x.productId,x])),counts=new Map();review.replaceChildren();if(coverage.counts)for(const [k,n] of Object.entries(coverage.counts))el('p',statusLabels[k]+': '+fmt(n)+' modelos',review);else el('p','Avaliação de cadastro indisponível.',review);for(const x of rows){if(x&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted)counts.set(String(x.id),(counts.get(String(x.id))||0)+1)}const matches=rows.filter(x=>x&&counts.get(String(x.id))===1&&x.active!==false&&(!policyFilter.value||byId.get(String(x.id))?.status===policyFilter.value)&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted&&norm([x.name,x.code,x.id].join(' ')).includes(norm(search.value))).sort((a,b)=>String(a.name).localeCompare(String(b.name)));source.replaceChildren();const empty=el('option','Selecione um modelo',source);empty.value='';for(const x of matches.slice(sourceOffset,sourceOffset+50)){const o=el('option',String(x.name)+' · '+(statusLabels[byId.get(String(x.id))?.status]||'Revisar cadastro')+' · ID '+x.id,source);o.value=String(x.id)}if(current&&![...source.options].some(o=>o.value===current)){const old=rows.find(x=>String(x?.id)===current);const o=el('option',(old?.name||current)+' · em edição',source);o.value=current}source.value=current;sourceMore.disabled=sourceOffset+50>=matches.length;sourcePrev.disabled=sourceOffset===0}
  function renderSelected(){selectedHost.replaceChildren();if(legacyBlocked){el('p','Política existente excede o limite de 50 destinos ou contém vínculos duplicados. Edição bloqueada para não perder dados. Confira o cadastro antes de alterar.',selectedHost);return}el('h4',selected.size+' destinos selecionados',selectedHost);for(const [k,v] of selected){const card=el('div','',selectedHost);card.className='panel';el('strong',v.productName+' · '+v.materialName,card);for(const [prop,label] of [['minWidthMm','Largura mínima (mm)'],['minLengthMm','Comprimento mínimo (mm)'],['size','Tamanho'],['color','Cor'],['notes','Observação']]){const x=field(label,card);x.value=v[prop]??'';x.oninput=()=>{v[prop]=x.value;result.replaceChildren()}}button('Remover destino',card,()=>{selected.delete(k);renderSelected();drawTargets()})}}
  function drawTargets(){choices.replaceChildren();if(!active()||legacyBlocked||!source.value||decision.value!=='yes')return;const x=api.candidates(products(),source.value,targetSearch.value,offset,data()?.materials);el('p',x.total+' combinações locais de material. Política cadastrada: '+(x.policyState||'desconhecida'),choices);for(const v of x.rows){const b=button(v.productName+' · '+v.materialName,choices,()=>{if(!active()||selected.size>=50)return;if([...selected.values()].some(z=>z.productId===v.productId&&key(z)!==key(v))){el('p','Selecione apenas um material por destino.',result);return}selected.set(key(v),{...v});renderSelected();drawTargets()});b.disabled=selected.has(key(v));b.style.cssText='display:block;max-width:100%;white-space:normal;margin:4px 0'}if(offset>0)button('Destinos anteriores',choices,()=>{offset=Math.max(0,offset-30);drawTargets()});if(offset+30<x.total)button('Mais destinos',choices,()=>{offset+=30;drawTargets()})}
  function reset(){editingId=source.value;legacyBlocked=false;selected=new Map();note.value='';decision.value='unknown';offset=0;signature='';result.replaceChildren();if(source.value){const rows=products().filter(x=>String(x.id)===source.value&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted);if(rows.length===1){const old=rows[0].fabricRemnantPolicyV9630;signature=JSON.stringify([rows[0].id,rows[0].materials,old]);if(old&&['yes','no','unknown'].includes(old.state)){decision.value=old.state;note.value=old.notes||'';if(old.state==='yes'&&Array.isArray(old.eligible)){legacyBlocked=old.eligible.length>50||new Set(old.eligible.map(v=>String(v?.productId))).size!==old.eligible.length;if(!legacyBlocked)for(const v of old.eligible)selected.set(key(v),{...v,productName:String(products().find(x=>String(x.id)===String(v.productId))?.name||v.productId),materialName:String(data()?.materials?.find(x=>String(x.id)===String(v.materialId))?.name||v.materialId)})}}}}note.disabled=legacyBlocked;decision.disabled=legacyBlocked;initialDraft=draftSignature();renderSelected();drawTargets()}
  const sourcePrev=button('Modelos anteriores',host,()=>{sourceOffset=Math.max(0,sourceOffset-50);sourceOptions()}),sourceMore=button('Mais modelos',host,()=>{sourceOffset+=50;sourceOptions()});
  search.addEventListener('input',()=>{sourceOffset=0;sourceOptions()});policyFilter.addEventListener('change',()=>{sourceOffset=0;sourceOptions()});source.onchange=()=>{if(editingId&&draftSignature()!==initialDraft&&!confirm('Trocar de modelo e descartar o rascunho não salvo?')){source.value=editingId;return}reset()};decision.onchange=()=>{result.replaceChildren();if(decision.value!=='yes'&&selected.size&&!confirm('Remover os destinos selecionados deste rascunho?')){decision.value='yes';return}if(decision.value!=='yes')selected.clear();renderSelected();drawTargets()};targetSearch.oninput=()=>{offset=0;drawTargets()};
  function preview(){if(!active()||legacyBlocked||!source.value||source.value!==editingId)throw Error('source');const rows=products(),s=rows.filter(x=>String(x.id)===source.value&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted);if(s.length!==1||JSON.stringify([s[0].id,s[0].materials,s[0].fabricRemnantPolicyV9630])!==signature)throw Error('stale');
   const dimension=v=>v==null||v===''?null:Number(String(v).replace(',','.'));return api.preview(source.value,{state:decision.value,notes:note.value,eligible:[...selected.values()].map(v=>({productId:v.productId,materialId:v.materialId,minWidthMm:dimension(v.minWidthMm),minLengthMm:dimension(v.minLengthMm),size:v.size||'',color:v.color||'',notes:v.notes||''}))},rows,data()?.materials)}
  button('Conferir política de sobra',host,()=>{result.replaceChildren();try{const x=preview();el('p','Rascunho validado · '+x.policy.eligible.length+' destinos. Encaixe físico e saldo ainda não confirmados.',result);if(can('corte')){const w=api.weights(data()?.cuts,source.value);el('h4','Pesagens registradas (resíduo não classificado)',result);for(const r of w.slice(-30))el('p','Corte '+r.cutId+' · '+fmt(r.unclassifiedKg)+' kg sem classificação · reutilizável não confirmado',result)}}catch(_){el('p','Confira o modelo, material compartilhado, dimensões, possíveis ciclos e alterações do cadastro.',result)}});
  let checking=false;
  const checkSave=button('Conferir segurança para salvar (sem gravar)',host,async()=>{
   if(checking||!active())return;checking=true;checkSave.disabled=true;result.replaceChildren();
   const pid=source.value,actor=user(),sameContext=()=>active()&&source.value===pid&&user()===actor;
   try{
    const draft=preview(),draftSignature=JSON.stringify(draft.policy),guard=root.hlgbWalIdbGuard9536,identity=root.hlgbRecordPendingIdentitySet9535;
    if(typeof guard?.probe!=='function'||typeof guard?.ids!=='function'||typeof guard?.status!=='function'||typeof identity!=='function'||typeof root.cloudRequest!=='function')throw Error('guard');
    const pending=()=>{
     const status=guard.status(),durable=guard.ids(),normal=identity();
     if(!status||status.readFailed!==false||status.unsupported===true||status.localReadFailed===true||!Number.isSafeInteger(status.probes)||status.probes<1||!durable||typeof durable.has!=='function'||!normal||typeof normal.has!=='function'||status.entryCount!==durable.size)return true;
     const all=new Set([...durable,...normal].map(String));
     for(const [key,field] of [['hlgb_durable_wal_v1','entries'],['hlgb_records_pending_v91','modules']]){
      const raw=localStorage.getItem(key);if(raw===null)continue;const items=JSON.parse(raw)?.[field];if(!items||typeof items!=='object'||Array.isArray(items))return true;
      if(field==='entries'){for(const [k,x] of Object.entries(items)){if(!x||typeof x!=='object')return true;all.add(k);if(x.module&&x.id!=null)all.add(x.module+'::'+x.id)}}
      else for(const [m,list] of Object.entries(items)){if(!Array.isArray(list))return true;for(const x of list){if(x?.id==null)return true;all.add(m+'::'+x.id)}}
     }
     return all.has('products::'+pid)||all.has('products|'+pid);
    };
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
  const area=document.getElementById('corte'),id='hlgbJointCutShortcut9673',actor=user();let bar=document.getElementById(id),nav=document.getElementById(jointNav);
  if(!actor||!can('corte')||!area){bar?.remove();nav?.remove();return}
  const p=ensureJointPage(),allowed=cutAllowed()&&!!p&&!!root.HLGBProductionPlanning9661;
  const menu=document.getElementById('nav'),group=menu&&[...menu.querySelectorAll('.nav-group')].find(x=>/Produção/i.test(x.querySelector('.nav-group-title span')?.textContent||'')),sub=group?.querySelector('.nav-submenu');
  if(sub){
   bar?.remove();
   if(!nav){nav=el('button','Corte Conjunto',sub);nav.type='button';nav.id=jointNav;nav.onclick=openJoint;const ordinary=[...sub.querySelectorAll('button')].find(b=>b.getAttribute('onclick')?.includes("page('corte',"));if(ordinary)sub.insertBefore(nav,ordinary.nextElementSibling)}
   nav.hidden=!cutAllowed();nav.disabled=!allowed;
   if(!allowed)nav.classList.remove('active');
   return;
  }
  if(bar&&bar.dataset.planningActor!==actor){bar.remove();bar=null}
  if(!area.classList.contains('active')&&!p?.classList.contains('active')){bar?.remove();return}
  if(!bar){bar=el('div','',area);bar.id=id;bar.dataset.planning9661='1';bar.dataset.planningActor=actor;
   if(area.firstChild!==bar)area.insertBefore(bar,area.firstChild);
   button('Corte Conjunto',bar,openJoint);el('p','',bar)}
  bar.children[0].disabled=!allowed;
  const note=allowed?'Abrir planejamento completo, simulação, impressões e histórico.':'O planejamento requer acesso a Corte, Pedidos, Produtos, Materiais e Produção.';
  if(bar.children[1].textContent!==note)bar.children[1].textContent=note;
 }

 // Connect the already-tested planning engines to the existing Metas page.
 // The observed history is not automatically promoted to verified capacity.
 function mountDeliveryPlanner9845(){
  const allowed=()=>['metas','pedidos','producao','corte','produtos','faccoes'].every(can);
  const ctx=hostFor('metas','hlgbDeliveryPlanner9845',allowed);if(!ctx)return;
  const {host,active}=ctx,api=root.HLGBProductionPlanning9661;
  if(!['observedThroughput','productionStageGoals','deliveryCapacityPlan'].every(k=>typeof api[k]==='function')){host.remove();return}
  el('h2','Planejamento de produção e entregas',host);
  el('p','Cenários de trabalho, sem alterar pedidos ou metas oficiais. Confira carteira restante e capacidade antes de assumir compromissos.',host);
  const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v=k=>p.find(x=>x.type===k)?.value;return v('year')+'-'+v('month')+'-'+v('day')};
  const numeric=(label,parent,defaultValue='',max=10000000)=>{const x=field(label,parent,'number');x.min='0';x.max=String(max);x.step='1';x.value=String(defaultValue);return x};
  const parse=x=>x.value.trim()!==''&&/^\d+$/.test(x.value)&&Number.isSafeInteger(Number(x.value))?Number(x.value):null;
  const closed=field('Feriados e dias fechados (AAAA-MM-DD, separados por vírgula)',host);
  const daysClosed=()=>closed.value.split(/[,;\s]+/).map(s=>s.trim()).filter(Boolean);
  const start=field('Início do planejamento',host,'date');start.value=today();
  const buffer=numeric('Margem de segurança (%)',host,10,90);
  const history=el('details','',host);el('summary','Histórico observado de produção — últimas 12 semanas completas',history);const hist=el('div','',history);
  button('Consultar produção observada',history,()=>{
   hist.replaceChildren();if(!active())return;
   const report=api.observedThroughput(data(),today(),true);
   if(report.state!=='local-observation'){el('p','Fontes indisponíveis. Confira o acesso e a sincronização.',hist);return}
   el('p','Semanas com registros não são capacidade garantida; períodos sem registro não são tratados como zero. '+report.issues.length+' ocorrências a conferir.',hist);
   const sources={cut:'Corte',external:'Retornos de facção',internal:'Produção interna'};
   for(const source of ['cut','external','internal']){
    const rows=report.weeks.filter(w=>w.source===source);el('h4',sources[source],hist);
    el('p',rows.length?rows.map(w=>w.week+': '+fmt(w.pieces)+' pç').join(' · '):'Sem dados datados suficientes.',hist);
    const samples=rows.map(w=>w.pieces).filter(n=>Number.isSafeInteger(n)&&n>0).sort((a,b)=>a-b);
    if(samples.length){
     const average=Math.round(samples.reduce((a,b)=>a+b,0)/samples.length);
     const reference=samples.length>=4?samples[Math.floor((samples.length-1)*.25)]:null;
     el('p','Média das '+samples.length+' semanas observadas: '+fmt(average)+' pç'+(reference===null?' · referência conservadora indisponível (mínimo de 4 semanas).':' · referência conservadora observada: '+fmt(reference)+' pç.')+' Não é capacidade confirmada.',hist);
    }
   }
   const details=el('details','',hist);el('summary','Por modelo e equipe (até 100 registros)',details);
   for(const r of report.rows.slice(0,100))el('p',sources[r.source]+' · '+r.productName+' · '+r.teamName+' · '+r.observedWeeks+' semanas observadas · média '+fmt(r.averageActiveWeek)+' pç',details);
  });
  const flow=el('details','',host);flow.open=true;el('summary','1. Definir objetivo semanal por etapa',flow);
  const goal=numeric('Objetivo de peças prontas na semana',flow),stageFields=[];
  for(const [key,name] of [['cut','Corte'],['sew','Costura / facções'],['finish','Acabamento e entrega']]){
   const row=el('fieldset','',flow);el('legend',name,row);
   const capacity=numeric('Capacidade informada de '+name+' (peças em 5 dias)',row);
   const wip=key==='cut'?null:numeric('Peças disponíveis no início — '+name,row,0);
   const check=wip?el('label','',row):null;let checked=null;if(check){checked=el('input','',check);checked.type='checkbox';el('span',' Conferi o saldo físico desta etapa',check)}
   stageFields.push({key,name,capacity,wip,checked});
  }
  const stageOut=el('div','',flow);
  const stageInput=()=>({start:start.value,goal:parse(goal),bufferPercent:parse(buffer),closedDates:daysClosed(),stages:stageFields.map(s=>({key:s.key,name:s.name,manualCapacity:parse(s.capacity),initialWip:s.wip?parse(s.wip):0,wipConfirmed:!!s.checked?.checked,history:[],teams:[]}))});
  button('Calcular divisão da produção',flow,()=>{
   stageOut.replaceChildren();if(!active())return;
   const input=stageInput(),stages=input.stages;
   const v=api.productionStageGoals(input,true);
   if(v.state!=='local-stage-goals'){el('p','Confira as datas, metas e capacidades inteiras.',stageOut);return}
   el('p','Dias de trabalho: '+v.workdays+' · Peças prontas simuladas: '+fmt(v.simulatedDeliveries)+' · Falta para a meta: '+fmt(v.goalGap),stageOut);
   for(const s of v.stages)el('p',s.name+' · capacidade no período '+fmt(s.periodCapacity)+' · peças simuladas '+fmt(s.simulatedPieces)+' · saldo em processo '+fmt(s.endingWip),stageOut);
   if(v.bottlenecks.length)el('p','Etapa(s) limitante(s): '+v.bottlenecks.map(s=>s.name).join(' / '),stageOut);
   const daily=el('details','',stageOut);el('summary','Divisão por dia',daily);
   for(const d of v.days)el('p',d.date+' · '+d.stages.map(s=>stages.find(x=>x.key===s.key).name+': '+fmt(s.pieces)).join(' / '),daily);
   if(v.partial)el('p','Cenário parcial: histórico não certificado e saldos não conferidos podem alterar o resultado.',stageOut);
  });
  const multi=el('details','',host);el('summary','Planejar várias semanas de produção',multi);
  el('p','Repete a meta semanal informada e transporta o saldo em processo para a semana seguinte. Não altera metas oficiais nem confirma capacidade.',multi);
  const multiWeeks=numeric('Semanas de produção',multi,4,13);multiWeeks.min='1';
  const multiOut=el('div','',multi);
  const invalidateStages=()=>{stageOut.replaceChildren();multiOut.replaceChildren()};
  for(const x of [start,buffer,closed,goal,multiWeeks,...stageFields.flatMap(s=>[s.capacity,s.wip,s.checked]).filter(Boolean)]){
   x.addEventListener('input',invalidateStages);x.addEventListener('change',invalidateStages);
  }
  button('Calcular produção de várias semanas',multi,()=>{
   multiOut.replaceChildren();if(!active())return;
   const input=stageInput(),count=parse(multiWeeks);
   if(typeof api.multiweekStageFlow!=='function'||!Number.isSafeInteger(count)||count<1||count>13||input.goal===null){el('p','Informe uma meta e de 1 a 13 semanas.',multiOut);return}
   const v=api.multiweekStageFlow({...input,asOf:today(),weeklyTargets:Array(count).fill(input.goal)},true);
   if(v.state!=='local-multiweek-flow'){el('p','Confira início (hoje ou depois), calendário e capacidades de todas as etapas.',multiOut);return}
   el('p','Meta total: '+fmt(v.totalTarget)+' pç · prontas simuladas: '+fmt(v.totalFinished)+' pç · faltam: '+fmt(v.remainingTarget)+' pç · saldo final em processo: '+fmt(v.endingWip)+' pç.',multiOut);
   for(const w of v.weeks){
    const week=el('details','',multiOut);el('summary',w.start+' a '+w.end+' · meta '+fmt(w.target)+' · prontas '+fmt(w.finished)+' · atraso acumulado '+fmt(w.backlog),week);
    for(const stage of w.stages)el('p',stage.name+' · capacidade '+fmt(stage.capacity)+' · executadas '+fmt(stage.pieces)+' · saldo final em processo '+fmt(stage.endWip)+' · capacidade não utilizada '+fmt(stage.unusedCapacity),week);
    for(const d of v.daily.filter(d=>d.date>=w.start&&d.date<=w.end))el('p',d.date+' · '+d.stages.map(x=>input.stages.find(s=>s.key===x.key).name+': '+fmt(x.pieces)).join(' / '),week);
   }
   if(v.partial)el('p','Cenário parcial: revise capacidade, histórico e saldos físicos. Não é promessa de entrega.',multiOut);
  });
  const delivery=el('details','',host);delivery.open=true;el('summary','2. Organizar pedidos, prazos e recebimentos',delivery);
  el('p','Informe apenas peças ainda pendentes. O valor e a condição de pagamento são referências informadas, não baixa de nota ou previsão bancária confirmada.',delivery);
  const horizon=numeric('Semanas a planejar',delivery,4,13);horizon.min='1';
  const weekly=numeric('Capacidade semanal de entregas (peças em 5 dias)',delivery);
  const proposal=numeric('Quantidade de peças do novo pedido a avaliar',delivery,0);
  const queue=el('div','',delivery),rows=[];let seq=0;
  const out=el('div','',delivery);
  let calculatedPlan=null,calculatedSignature='',cashOut=null;
  const money=x=>{const s=x.value.trim().replace(',','.');return /^-?\d{1,9}(?:\.\d{1,2})?$/.test(s)?Math.round(Number(s)*100):null};
  const orderInputs=()=>rows.filter(r=>r.client.value.trim()||r.model.value.trim()||r.due.value||r.pieces.value||r.value.value.trim()||r.pay.value!=='unknown'||(r.term.value.trim()!==''&&r.term.value.trim()!=='0')).map(r=>({key:r.key,client:r.client.value.trim(),model:r.model.value.trim(),dueDate:r.due.value,pieces:parse(r.pieces),paymentMode:r.pay.value,paymentDays:parse(r.term),amountCents:money(r.value)}));
  const planInput=()=>({start:start.value,asOf:today(),weeks:parse(horizon),weeklyGoal:parse(weekly),bufferPercent:parse(buffer),history:[],orders:orderInputs(),closedDates:daysClosed(),coverageConfirmed:false,newPieces:parse(proposal)});
  function invalidatePlan(){calculatedPlan=null;calculatedSignature='';out.replaceChildren();cashOut?.replaceChildren()}
  function addOrder(){
   if(!active()||rows.length>=100)return;
   invalidatePlan();
   const row=el('fieldset','',queue),key='scenario-'+(++seq);el('legend','Pedido '+seq,row);
   const client=field('Cliente',row),model=field('Modelo / número do pedido',row),due=field('Prazo de entrega',row,'date'),pieces=numeric('Peças ainda pendentes',row),value=field('Valor a receber (R$)',row);
   const label=el('label','Condição de pagamento ',row),pay=el('select','',label);for(const [k,t] of [['unknown','A conferir'],['cash','À vista'],['term','A prazo']]){const o=el('option',t,pay);o.value=k}
   const term=numeric('Prazo de pagamento em dias',row,0,365);
   const item={key,client,model,due,pieces,value,pay,term};rows.push(item);
   button('Remover pedido da simulação',row,()=>{const i=rows.indexOf(item);if(i>=0)rows.splice(i,1);row.remove();invalidatePlan()});
  }
  button('Adicionar pedido à carteira simulada',delivery,addOrder);addOrder();
  button('Calcular agenda de entregas',delivery,()=>{
   out.replaceChildren();if(!active())return;
   invalidatePlan();
   const input=planInput();
   if(rows.some(r=>r.value.value.trim()&&money(r.value)===null)){el('p','Confira o valor a receber: use reais com até duas casas decimais.',out);return}
   if(input.orders.some(r=>!r.client||!r.dueDate||!Number.isSafeInteger(r.pieces)||r.pieces<=0||r.amountCents!==null&&r.amountCents<0||r.paymentMode==='term'&&(!Number.isSafeInteger(r.paymentDays)||r.paymentDays<=0))){el('p','Complete todos os pedidos iniciados: cliente, prazo, peças e condição de pagamento.',out);return}
   const v=api.deliveryCapacityPlan(input,true);
   if(v.state!=='local-capacity-simulation'){el('p','Confira início, horizonte, capacidade e quantidades.',out);return}
   calculatedPlan=v;calculatedSignature=JSON.stringify(input);
   el('p','Capacidade semanal após margem: '+fmt(v.weeklyTarget)+' · Peças atrasadas / fora do prazo: '+fmt(v.late)+' · Não alocadas: '+fmt(v.unallocated),out);
   if(v.newPieces)el('p','Novo pedido de '+fmt(v.newPieces)+' peças: '+(v.firstAvailable?'data candidata '+v.firstAvailable:'não cabe no horizonte informado')+' · quantidade sem vaga '+fmt(v.unplacedNewPieces)+'. Não é promessa de entrega.',out);
   for(const w of v.weeks){const item=el('details','',out);el('summary',w.start+' a '+w.end+' · '+fmt(w.allocated)+' pç alocadas · '+fmt(w.free)+' vagas',item);
    el('p','À vista: '+fmt(w.cashAtDeliveryCents/100)+' R$ · A prazo: '+fmt(w.termReceiptsCents/100)+' R$ · Peças com condição/valor não confirmado: '+fmt(w.unknownPaymentPieces),item);
    for(const d of v.daily.filter(d=>d.date>=w.start&&d.date<=w.end&&d.assignments.length))el('p',d.date+' · '+d.assignments.map(a=>a.client+' / '+a.model+': '+fmt(a.pieces)).join(' · '),item);
   }
   for(const o of v.orders)el('p',o.client+' / '+o.model+' · entrega '+o.dueDate+' · conclusão simulada '+(o.lastWorkDate||'não alocada')+' · restante '+fmt(o.remaining)+' · recebimento candidato '+(o.receiptDate||'a conferir'),out);
   if(v.issues.length)el('p','Atenção: carteira e capacidade são manuais e parciais; registros inválidos ou sem confirmação não constituem compromissos. '+v.issues.join(' · '),out);
  });
  const factionPanel=el('details','',host);el('summary','Planejamento por facção e aprendizado de prazos',factionPanel);
  el('p','Consulte lotes realmente retornados, fila atual e capacidade informada. Nenhuma peça será atribuída automaticamente.',factionPanel);
  const leadOut=el('div','',factionPanel);
  button('Consultar histórico de prazos das facções',factionPanel,()=>{
   leadOut.replaceChildren();if(!active())return;
   const h=api.factionLeadTimes?.(data(),today(),true),b=api.factionForecastBacktest?.(data(),today(),true);
   if(h?.state!=='local-leadtime-observation'){el('p','Histórico indisponível. Confira os registros de facção e os locais de produção.',leadOut);return}
   el('p',h.rows.length+' grupos de modelo / facção / tamanho de lote · '+h.open.length+' lotes em aberto · '+h.issues.length+' registros a conferir.',leadOut);
   for(const r of h.rows.slice(0,100))el('p',r.productName+' · '+r.teamName+' · '+r.band+' pç · '+r.count+' lotes · média '+fmt(r.averageDays)+' dias · prazo conservador '+fmt(r.conservativeDays)+' dias.',leadOut);
   const open=el('details','',leadOut);el('summary','Lotes abertos e atrasos observados',open);
   for(const r of h.open.slice(0,100))el('p',r.teamName+' · '+r.productName+' · '+fmt(r.remaining)+' pç restantes · '+r.elapsedDays+' dias em aberto · referência '+(r.referenceDate||'histórico insuficiente')+(r.lateAgainstDue?' · prazo informado vencido':''),open);
   if(b?.state==='local-forecast-backtest'){const z=b.summary;el('p','Avaliação com lotes anteriores: '+z.evaluated+' previsões avaliadas · erro absoluto médio '+fmt(z.meanAbsoluteErrorDays)+' dias · dentro da referência '+fmt(z.onTimePercent)+'% · '+z.insufficient+' lotes sem histórico suficiente.',leadOut)}
  });
  const factionInputs=el('div','',factionPanel);
  const selectField=(label,parent)=>{const l=el('label',label,parent);const x=el('select','',l);x.setAttribute('aria-label',label);x.style.cssText='display:block;width:100%;max-width:100%;min-width:0';return x};
  const fillOptions=(select,list,label)=>{const previous=select.value;select.replaceChildren();const first=el('option',label,select);first.value='';for(const r of list){const o=el('option',String(r.name||r.id),select);o.value=String(r.id)}select.value=list.some(r=>String(r.id)===previous)?previous:''};
  const liveOptions=key=>{const list=Array.isArray(data()?.[key])?data()[key]:[];const counts=new Map();for(const r of list){const id=String(r?.id??'');counts.set(id,(counts.get(id)||0)+1)}return list.filter(r=>r&&r.id!=null&&String(r.id)!==''&&counts.get(String(r.id))===1&&r.active!==false&&!r.deleted&&!r.deletedAt&&!r.deleted_at&&!r._deleted)};
  const product=selectField('Modelo do pedido a distribuir',factionInputs);
  const lot=numeric('Peças do novo lote',factionInputs,0,1000000),due=field('Prazo final do novo lote',factionInputs,'date');
  const finishing=numeric('Dias de margem para acabamento',factionInputs,2,90),fqWeeks=numeric('Horizonte da fila da facção (semanas)',factionInputs,4,13);fqWeeks.min='1';
  const teamsHost=el('div','',factionPanel),teamRows=[],factionOut=el('div','',factionPanel);
  const tick=(label,parent)=>{const l=el('label','',parent),x=el('input','',l);x.type='checkbox';el('span',' '+label,l);return x};
  const invalidateFaction=()=>{factionOut.replaceChildren();for(const r of teamRows){r.coverage.checked=false;r.capacityConfirmed.checked=false;r.compatibility.checked=false}};
  function addTeam(){
   if(!active()||teamRows.length>=20)return;
   const row=el('fieldset','',teamsHost);el('legend','Facção / equipe',row);
   const team=selectField('Equipe para simular',row);fillOptions(team,liveOptions('productionLocations'),'Selecione a equipe');
   const capacity=numeric('Capacidade da equipe em 5 dias',row),extra=numeric('Outras peças comprometidas (não incluídas na fila)',row,0);
   const coverage=tick('Conferi toda a carteira e compromissos da equipe',row),capacityConfirmed=tick('Conferi a capacidade semanal da equipe',row),compatibility=tick('Conferi que esta equipe executa o modelo',row);
   const r={team,capacity,extra,coverage,capacityConfirmed,compatibility};teamRows.push(r);
   const reset=()=>{coverage.checked=false;capacityConfirmed.checked=false;compatibility.checked=false;factionOut.replaceChildren()};
   for(const x of [team,capacity,extra]){x.addEventListener('change',reset);x.addEventListener('input',reset)}
   for(const x of [coverage,capacityConfirmed,compatibility])x.addEventListener('change',()=>factionOut.replaceChildren());
   button('Remover equipe da simulação',row,()=>{if(!active())return;const i=teamRows.indexOf(r);if(i>=0)teamRows.splice(i,1);row.remove();factionOut.replaceChildren()});
  }
  button('Atualizar modelos e equipes',factionPanel,()=>{if(!active())return;fillOptions(product,liveOptions('products'),'Selecione o modelo');for(const r of teamRows)fillOptions(r.team,liveOptions('productionLocations'),'Selecione a equipe');invalidateFaction()});
  fillOptions(product,liveOptions('products'),'Selecione o modelo');addTeam();
  button('Adicionar equipe à comparação',factionPanel,()=>{addTeam();factionOut.replaceChildren()});
  for(const x of [start,buffer,closed,product,lot,due,finishing,fqWeeks]){x.addEventListener('input',invalidateFaction);x.addEventListener('change',invalidateFaction)}
  const teamInput=r=>({teamId:r.team.value,weeklyCapacity:parse(r.capacity),additionalCommitted:parse(r.extra),coverageConfirmed:r.coverage.checked,capacityConfirmed:r.capacityConfirmed.checked,compatibilityConfirmed:r.compatibility.checked});
  const queueInput=()=>({start:start.value,bufferPercent:parse(buffer),weeks:parse(fqWeeks),closedDates:daysClosed()});
  button('Simular filas e vagas por facção',factionPanel,()=>{
   factionOut.replaceChildren();if(!active())return;
   if(!teamRows.length||typeof api.factionQueueScenario!=='function'){el('p','Adicione ao menos uma equipe.',factionOut);return}
   if(start.value<today()){el('p','Use uma data de início a partir de hoje.',factionOut);return}
   for(const r of teamRows){
    const q=api.factionQueueScenario(data(),{...queueInput(),...teamInput(r),newPieces:parse(lot)},true);
    if(q?.state!=='local-queue-scenario'){el('p','Fila indisponível: confira equipe, datas e capacidade.',factionOut);continue}
    const d=el('details','',factionOut);d.open=true;el('summary',q.teamName+' · '+fmt(q.observedPieces)+' peças em lotes observados · '+fmt(q.pendingPieces)+' em atribuições a conferir',d);
    el('p','Capacidade semanal após margem '+fmt(q.weeklyTarget)+' · pendentes ao fim do horizonte '+fmt(q.existingRemaining)+' · primeira vaga '+(q.firstFree||'sem vaga')+' · conclusão simulada '+(q.newCompletion||'não alocada')+'.',d);
    for(const w of q.weeks)el('p',w.start+' a '+w.end+' · carteira '+fmt(w.existing)+' · novo lote '+fmt(w.newPieces)+' · livres '+fmt(w.free)+' pç',d);
    for(const issue of q.issues)el('p','Conferir '+issue.recordId+': '+issue.reason,d);
   }
   el('p','Simulações independentes por equipe; não some as peças do novo lote entre equipes.',factionOut);
  });
  button('Sugerir divisão do pedido entre facções',factionPanel,()=>{
   factionOut.replaceChildren();if(!active())return;
   const v=api.distributeFactionOrder?.(data(),{...queueInput(),asOf:today(),dueDate:due.value,pieces:parse(lot),productId:product.value,finishBufferDays:parse(finishing),teams:teamRows.map(teamInput)},true);
   if(v?.state!=='local-distribution-scenario'){el('p','Confira modelo, prazo, quantidade e capacidades antes de simular a divisão.',factionOut);return}
   el('p','Divisão candidata: '+fmt(v.allocated)+' de '+fmt(v.pieces)+' pç · sem alocação '+fmt(v.unallocated)+' · entrega de referência '+(v.referenceDelivery||'indisponível')+'.',factionOut);
   for(const a of v.allocations)el('p',a.teamName+' · '+fmt(a.pieces)+' pç · primeira vaga '+a.firstFree+' · retorno de referência '+a.referenceReturn+' · '+a.sampleCount+' lotes comparáveis.',factionOut);
   for(const a of v.teams.filter(t=>t.reason))el('p',a.teamName+' · '+a.reason,factionOut);
   el('p','Nenhum compromisso ou destino gravado. Confirme a carteira, ficha técnica e capacidade real antes de aceitar o pedido.',factionOut);
  });
  // Finance scenario is deliberately manual; no import that could duplicate recorded receivables.
  const cash=el('details','',host);el('summary','3. Avaliar novo pedido e impacto no caixa',cash);
  el('p','Requer a agenda calculada acima. Informe saldo e compromissos já conhecidos, separados do novo pedido. Não é conciliação bancária.',cash);
  const financialAllowed=()=>active()&&can('hubFinanceiro')&&can('financeiro');
  if(!financialAllowed()){el('p','Análise financeira requer acesso ao Hub Financeiro e Financeiro.',cash);return}
  const opening=field('Saldo disponível no início (R$)',cash),reserve=field('Reserva mínima desejada (R$)',cash);reserve.value='0';
  const delay=numeric('Atraso de recebimentos para cenário de risco (dias)',cash,14,91);
  const commitments=el('div','',cash),entries=[];let entrySeq=0;
  function addCommitment(){if(entries.length>=100)return;const row=el('fieldset','',commitments);el('legend','Compromisso '+(++entrySeq),row);const date=field('Data do compromisso',row,'date'),value=field('Valor do compromisso (R$)',row),l=el('label','Tipo ',row),direction=el('select','',l);for(const [k,t] of [['out','Saída'],['in','Entrada']]){const o=el('option',t,direction);o.value=k}const item={reference:'commitment-'+entrySeq,date,value,direction};entries.push(item);button('Remover compromisso',row,()=>{entries.splice(entries.indexOf(item),1);row.remove();cashOut.replaceChildren()})}
  button('Adicionar compromisso existente',cash,addCommitment);
  const proposedClient=field('Cliente do novo pedido',cash),proposedDue=field('Prazo solicitado do novo pedido',cash,'date'),receipt=field('Valor de venda do novo pedido (R$)',cash);
  const payLabel=el('label','Condição do novo pedido ',cash),pay=el('select','',payLabel);for(const [k,t] of [['cash','À vista'],['term','A prazo']]){const o=el('option',t,pay);o.value=k}
  const term=numeric('Prazo do novo pedido em dias',cash,0,365);
  const costs=el('div','',cash),costRows=[];let costSeq=0;
  function addCost(){if(costRows.length>=50)return;const row=el('fieldset','',costs);el('legend','Custo do novo pedido '+(++costSeq),row);const date=field('Data do custo novo',row,'date'),value=field('Valor do custo novo (R$)',row);const item={reference:'new-cost-'+costSeq,date,value};costRows.push(item);button('Remover custo',row,()=>{costRows.splice(costRows.indexOf(item),1);row.remove();cashOut.replaceChildren()})}
  button('Adicionar custo do novo pedido',cash,addCost);addCost();
  const confirmation=el('label','',cash),confirmed=el('input','',confirmation);confirmed.type='checkbox';el('span',' Conferi que os custos e o recebimento deste novo pedido não foram incluídos nos compromissos existentes.',confirmation);
  cashOut=el('div','',cash);
  const brl=n=>Number.isSafeInteger(n)?(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não confirmado';
  button('Comparar caixa com e sem novo pedido',cash,()=>{
   cashOut.replaceChildren();if(!financialAllowed())return;
   if(!calculatedPlan||JSON.stringify(planInput())!==calculatedSignature){el('p','Recalcule a agenda de entregas antes de analisar o caixa.',cashOut);return}
   const v=api.newOrderDecision(calculatedPlan,{start:start.value,openingCents:money(opening),reserveCents:money(reserve),delayDays:parse(delay),entries:entries.map(e=>({reference:e.reference,date:e.date.value,direction:e.direction.value,amountCents:money(e.value)})),reviewed:confirmed.checked,newCostsAndReceiptNotIncluded:confirmed.checked,proposal:{client:proposedClient.value,pieces:parse(proposal),dueDate:proposedDue.value,receiptCents:money(receipt),paymentMode:pay.value,paymentDays:parse(term),costs:costRows.map(e=>({reference:e.reference,date:e.date.value,amountCents:money(e.value)}))}},true);
   if(v.state!=='local-order-decision'){el('p','Confira capacidade, prazo, saldo, custos, recebimentos e confirmação de que não existem valores duplicados.',cashOut);return}
   el('p',v.withinDue?'Prazo comporta a capacidade informada.':'Prazo não comporta a capacidade informada.',cashOut);
   el('p','Conclusão candidata: '+(v.completion||'sem vaga')+' · Custo informado '+brl(v.costTotalCents)+' · Contribuição indicativa '+brl(v.indicativeContributionCents),cashOut);
   for(const [label,scenario] of [['Sem novo pedido',v.baseline],['Com novo pedido',v.withOrder],['Com novo pedido e atraso',v.withOrderStress]]){
    el('p',label+' · menor saldo '+brl(scenario.minimumCents)+' · necessidade adicional de reserva '+brl(scenario.maximumGapCents)+' · primeiro dia abaixo da reserva '+(scenario.firstGap||'nenhum no cenário'),cashOut);
   }
   el('p','Diferença de necessidade de reserva: '+brl(v.extraReserveGapCents)+' · no cenário de atraso '+brl(v.extraStressGapCents)+'. Não constitui autorização de venda ou garantia financeira.',cashOut);
  });
  for(const x of [start,buffer,closed,horizon,weekly,proposal])x.addEventListener('input',invalidatePlan);
  queue.addEventListener('input',invalidatePlan);queue.addEventListener('change',invalidatePlan);
  cash.addEventListener('input',e=>{cashOut.replaceChildren();if(e.target!==confirmed)confirmed.checked=false});
 }

 function refresh(){if(document.hidden)return;mountCutShortcut();mountCut();mountRemnants();mountDeliveryPlanner9845();observePlanningPages9895();if(!cutAllowed()||!document.getElementById('hlgbJointCut9661'))root.hlgbJointWorkspaceEvidence9714={observed:false}}
 let operationalPending9845=false,planningObserver9895=null;
const planningPages9895=new Map();
function observePlanningPages9895(){
 if(typeof MutationObserver!=='function')return;
 if(!planningObserver9895)planningObserver9895=new MutationObserver(entries=>{if(entries.some(e=>e.target.classList.contains('active')!==planningPages9895.get(e.target))){for(const e of entries)planningPages9895.set(e.target,e.target.classList.contains('active'));scheduleOperational9845()}});
 const pages=[...document.querySelectorAll('.page')];
 if([...planningPages9895.keys()].some(x=>!pages.includes(x))){planningObserver9895.disconnect();planningPages9895.clear()}
 for(const page of pages)if(!planningPages9895.has(page)){planningPages9895.set(page,page.classList.contains('active'));planningObserver9895.observe(page,{attributes:true,attributeFilter:['class']})}
}
function scheduleOperational9845(){
 if(operationalPending9845)return;
 operationalPending9845=true;
 setTimeout(()=>{operationalPending9845=false;refresh()},0);
}
document.addEventListener('click',scheduleOperational9845,true);document.addEventListener('visibilitychange',()=>{
 root.hlgbJointWorkspaceEvidence9714={observed:false};
 const actor=user();
 for(const x of document.querySelectorAll('[data-planning9661]')){
  if(x.id==='hlgbRemnant9661'&&actor&&x.dataset.planningActor===actor&&remAllowed()&&document.getElementById('produtos')?.classList.contains('active'))continue;
  x.remove();
 }
 if(!document.hidden)refresh();
});root.addEventListener?.('hlgb:logout',clear);root.addEventListener?.('hlgb:authenticated',()=>{clear();refresh()});setTimeout(refresh,1000);
})(typeof window!=='undefined'?window:null);


// Shared quick access to existing panels. No independent query, write or shadow copy.
(function installOperationalAccess9845(root){
 if(!root||root.hlgbOperationalAccess9845)return;
 const sections={
  folhaPagamento:[['hlgb-live-finance-9656-folhaPagamento','Prévia salarial e calendário'],['hlgbAttendance9658','Ponto e passagem'],['hlgbRHLive9667','Férias, provisões e desligamento'],['hlgbWorkers9659','Diaristas e mensalistas'],['hlgb-settlement-history-9654-funcionario','Histórico de acertos']],
  hubFinanceiro:[['hlgb-live-finance-9656-hubFinanceiro','Inteligência financeira e prévia salarial']],
  notas:[['hlgb-settlement-history-9654-cliente','Histórico de acertos por cliente']],
  pagamentosFaccoes:[['hlgb-settlement-history-9654-faccao','Histórico de acertos por facção']],
  produtos:[['hlgbRemnant9661','Aproveitamento de sobras']],
  metas:[['hlgbDeliveryPlanner9845','Planejamento de produção e entregas']]
 };
 const prefix='hlgb-operational-access-9845-';
 let timer=null,pending=false,observer=null;const watched=new Set();
 const auth=()=>root.__HLGB_AUTH_READY===true;
 const can=p=>{try{return auth()&&typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
 const actor=()=>{try{return String(typeof cloudUser!=='undefined'?cloudUser?.id||'':typeof currentUser==='function'?currentUser()?.id||'':'')}catch(_){return ''}};
 const access={
  'hlgb-live-finance-9656-folhaPagamento':['folhaPagamento'],
  'hlgb-live-finance-9656-hubFinanceiro':['hubFinanceiro','folhaPagamento'],
  'hlgbAttendance9658':['folhaPagamento'],
  'hlgbRHLive9667':['folhaPagamento','funcionarios'],
  'hlgbWorkers9659':['folhaPagamento','funcionarios'],
  'hlgb-settlement-history-9654-funcionario':['folhaPagamento'],
  'hlgb-settlement-history-9654-cliente':['notas','financeiro'],
  'hlgb-settlement-history-9654-faccao':['pagamentosFaccoes','faccoes'],
  'hlgbRemnant9661':['produtos','materiais'],
  'hlgbDeliveryPlanner9845':['metas','pedidos','producao','corte','produtos','faccoes']
 };
 const panel=(area,id)=>{const target=document.getElementById(id);return target&&area.contains(target)&&access[id]?.every(can)?target:null};
 function clear(){for(const page of Object.keys(sections))document.getElementById(prefix+page)?.remove()}
 function refresh(){
  const owner=actor();if(!auth()||!owner){clear();return}
  for(const [page,entries] of Object.entries(sections)){
   const area=document.getElementById(page);let bar=document.getElementById(prefix+page);
   if(!area?.classList.contains('active')||!can(page)||document.hidden){bar?.remove();continue}
   const available=entries.filter(([id])=>panel(area,id));
   const sig=JSON.stringify([owner,available.map(([id])=>id)]);
   if(!available.length){bar?.remove();continue}
   if(bar?.dataset.signature9845===sig)continue;
   if(!bar){bar=document.createElement('nav');bar.id=prefix+page;bar.setAttribute('aria-label','Atalhos de trabalho');bar.className='panel';bar.style.cssText='display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:8px;min-width:0;box-sizing:border-box';const h=area.querySelector('h1');if(h&&h.parentElement===area)h.insertAdjacentElement('afterend',bar);else area.prepend(bar)}
   bar.dataset.signature9845=sig;bar.replaceChildren();
   const title=document.createElement('strong');title.textContent='Acesso rápido:';bar.appendChild(title);
   for(const [id,label] of available){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.style.cssText='max-width:100%;white-space:normal';
    b.onclick=()=>{if(!auth()||actor()!==owner||!area.classList.contains('active')||!can(page))return;const target=panel(area,id);if(!target)return;target.setAttribute('tabindex','-1');target.focus?.({preventScroll:true});target.scrollIntoView?.({block:'start',behavior:'auto'})};bar.appendChild(b)}
  }
 }
 function schedule(){if(pending)return;pending=true;timer=setTimeout(()=>{pending=false;timer=null;refresh()},0)}
 function observe(){
  if(typeof MutationObserver!=='function')return;
  if(!observer)observer=new MutationObserver(schedule);
  for(const page of Object.keys(sections)){const area=document.getElementById(page);if(area&&!watched.has(area)){watched.add(area);observer.observe(area,{attributes:true,attributeFilter:['class'],childList:true})}}
 }
 root.hlgbOperationalAccess9845={refresh};
 function boot(){observe();schedule()}
 document.addEventListener('click',boot,true);document.addEventListener('visibilitychange',boot);
 root.addEventListener?.('hlgb:authenticated',boot);root.addEventListener?.('hlgb:logout',()=>{if(timer!==null&&typeof clearTimeout==='function')clearTimeout(timer);timer=null;pending=false;clear()});
 boot();setTimeout(boot,1000);
})(typeof window!=='undefined'?window:null);
