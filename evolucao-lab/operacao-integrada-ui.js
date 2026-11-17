/* HLGB Evolução: UI do laboratório integrado. Sem rede, sem dados da confecção. */
(function(){
'use strict';
const api=window.HLGBOperationalLab,$=id=>document.getElementById(id);
const modules=[
 ['nucleo','Salvamento e sincronização','Resumo do documento IndexedDB, revisão, trilha de eventos e proteção contra concorrência.'],
 ['autenticacao','Login e permissões','Papéis e limitações demonstrativas; nenhuma autenticação empresarial ou autorização real.'],
 ['pedidos','Pedidos','Cadastre encomendas fictícias por grade e acompanhe o histórico entre etapas.'],
 ['produtos','Produtos e ficha técnica','Cadastre modelo, SKU, preço e consumo de material para simular corte e custo.'],
 ['corte','Corte','Baixe parcialmente por tamanho com consumo material e bloqueio de estoque negativo.'],
 ['producao','Produção e PCP','Acompanhe as quantidades cortadas, enviadas, retornadas e ainda pendentes.'],
 ['separacao','Separação e expedição','Realize separação parcial e despacho sem ultrapassar o que retornou.'],
 ['faccoes','Facções e rotas','Cadastre facções, configure travetada, envie e registre retornos parciais.'],
 ['acertos','Acertos e pagamentos avulsos','Veja os acertos gerados pelos retornos e ajuste o valor com rastreabilidade.'],
 ['hub','Hub Financeiro','Cadastre conta fictícia, confira títulos vinculados e marque pagamento sem repetição.'],
 ['folha','Folha e provisões','Edite passagem por pessoa e confira os totais sem misturar salário e transporte.'],
 ['compras','Compras e fornecedores','Cadastre compra de material, conferência por duas pessoas e recebimento de estoque.'],
 ['estoque','Estoque e materiais','Consulte saldos, movimentações e ajustes documentados sem valores negativos.'],
 ['relatorios','Relatórios e análises','Conferência cruzada das quantidades, contas abertas e exportação de evidências.'],
 ['auditor','Auditor e autocorreção','Diagnóstico determinístico; nenhuma autocorreção em produção.'],
 ['bot','Assistente e aprendizado','Alertas gerados por regras verificáveis, sem IA autônoma nem mutação dos dados.'],
 ['central','Central de erros e saúde','Registro, acompanhamento e encerramento manual de ocorrências fictícias.'],
 ['impressora3d','Impressora 3D','Cadastro fictício de produtos 3D com preço, filamento e quantidade pronta.'],
 ['cadastros','Clientes e cadastros','Cadastros de clientes, fornecedores e insumos vinculados aos módulos.']
];
const ids=new Map(modules.map((m,i)=>[m[0],i]));
let active=ids.has(window.location.hash.slice(1))?window.location.hash.slice(1):'nucleo',db=null,doc=null,busy=false,journeyOrderId=null;
const settlementFilters={query:'',status:'todos',faction:'todas',service:'todos',compensation:'todos'};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>escape(String(x??''));
const fmt=api.money;
const nr=c=>(c/100).toFixed(2).replace('.',',');
const sum=g=>Object.values(g).reduce((a,b)=>a+b,0);
function options(items,selected=null){return items.map(([value,label])=>'<option value="'+escape(value)+'"'+(selected===value?' selected':'')+'>'+escape(label)+'</option>').join('')}
let selectFieldSerial=0;
function field(name,label,kind='text',value='',list=null){
 let input;
 if(kind==='select'){
  const id='lab-select-'+(++selectFieldSerial);
  return '<div class="field"><label for="'+id+'">'+escape(label)+'</label>'+
   '<select id="'+id+'" class="input" name="'+name+'" required>'+options(list||[])+'</select></div>';
 }
 else if(kind==='checkbox')input='<input name="'+name+'" type="checkbox" value="true">';
 else input='<input class="input" name="'+name+'" type="'+(kind==='int'?'number':'text')+'"'+(kind==='int'?' min="0" step="1" inputmode="numeric"':kind==='money'?' inputmode="decimal"':'')+' value="'+escape(value)+'" required maxlength="96">';
 return '<div class="field"><label>'+escape(label)+input+'</label></div>';
}
function form(type,title,fields,button='Registrar'){
 return '<form data-command="'+escape(type)+'"><h3>'+escape(title)+'</h3><div class="fields">'+fields.join('')+'</div><div class="actions"><button class="btn primary" type="submit">'+escape(button)+'</button></div></form>';
}
function panel(title,content,wide=false){return '<section class="panel'+(wide?' wide':'')+'"><h2>'+escape(title)+'</h2>'+content+'</section>'}
function table(headers,rows){
 if(!rows.length)return '<div class="empty">Nenhum registro fictício nesta área. Use o formulário para começar.</div>';
 return '<div class="table-wrap"><table><thead><tr>'+headers.map(h=>'<th>'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+
 rows.map(cells=>'<tr>'+cells.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
const selector=(list,text)=>list.map(x=>[x.id,text(x)]);
const ref=(list,id)=>list.find(x=>x.id===id);
const orderOptions=s=>selector(s.orders,o=>o.id+' · '+(ref(s.products,o.productId)?.name||'Modelo')+' · '+sum(o.grade)+' pç');
const blank='<p>Selecione um pedido ou cadastre um novo na guia Pedidos.</p>';
function status(msg,style='success'){$('flash').className=style;$('flash').textContent=msg}
function getGrade(order){return api.sizes.map(sz=>sz+': '+order.grade[sz]+' / cortadas '+order.cut[sz]).join(' · ')}
function orderTable(s){
 return table(['Pedido / modelo','Cliente','Grade e corte','Fluxo','Recebimento'],s.orders.map(o=>{
 const q=api.quantities(o);
 return ['<strong>'+str(o.id)+'</strong><div class="caption">'+str(ref(s.products,o.productId)?.name)+'</div>',
 str(ref(s.clients,o.clientId)?.name),str(getGrade(o)),
 'Corte '+q.cut+' · facção '+q.allocated+' · retorno '+q.returned+' · separado '+q.separated+' · enviado '+q.shipped,
 fmt(q.ordered*o.priceCents)];
 }));
}
function financeTable(s){
 return table(['Título','Tipo','Descrição','Valor','Estado'],s.finance.map(f=>[str(f.id),str(f.kind),
 str(f.description),fmt(f.amountCents),'<span class="chip '+(f.status==='aberto'?'wait':'')+'">'+str(f.status)+'</span>']));
}

function financialBatchPanel(s){
 const comps=s.settlementCompensations||[],batches=s.paymentBatches||[];
 const open=s.finance.filter(t=>t.kind==='pagar'&&t.status==='aberto').map(t=>{
  const settlement=s.settlements.find(x=>x.id===t.sourceId);
  const compensation=comps.find(x=>x.id===t.sourceId);
  const src=settlement||compensation;
  if(!src||src.status!=='aberto'||(settlement&&settlement.amountCents!==t.amountCents)||
   (compensation&&compensation.deltaCents!==t.amountCents))return null;
  return {title:t,source:src,faction:ref(s.factions,src.factionId)?.name||'—'};
 }).filter(Boolean);
 const checks=open.map(({title,source,faction})=>
  '<label class="batch-choice"><input type="checkbox" name="financeIds" value="'+str(title.id)+'" data-batch-cents="'+title.amountCents+'">'+
  '<span><strong>'+str(title.id)+'</strong> · '+str(source.id)+' · '+str(faction)+
  ' · '+fmt(title.amountCents)+'</span></label>').join('');
 return panel('Fechamento em lote · Facções e Acertos fictícios',
  '<p>Selecione de 2 a 50 títulos a pagar de acertos ou compensações. Antes da baixa, o núcleo confere todos os vínculos e valores. <strong>Se um falhar, o lote inteiro será recusado</strong>, sem pagamento parcial.</p>'+
  '<form data-command="finance.batch.pay" id="finance-batch-form">'+
  '<div class="batch-choices">'+(checks||'<div class="empty">Nenhum acerto elegível aberto para o lote.</div>')+'</div>'+
  '<p id="finance-batch-summary" class="caption" role="status">Nenhum título selecionado.</p>'+
  '<div class="fields">'+field('reference','Referência única do fechamento','text','LOTE-TESTE-001')+
  field('reason','Justificativa do fechamento','text','Conferência coletiva fictícia')+'</div>'+
  '<div class="actions"><button class="btn" type="button" id="preview-finance-batch">Validar sem pagar</button>'+
  '<button class="btn primary" type="submit">Conferir e quitar lote fictício</button></div></form>'+
  '<p class="caption">Pagamento somente demonstrativo: sem banco real, PIX, comprovante fiscal ou liquidação externa. O pagamento unitário anterior continua disponível.</p>',true)+
 panel('Histórico de lotes sem reescrever acertos',
  table(['Lote','Referência','Títulos','Total','Situação','Motivo','IDs vinculados'],
   batches.map(b=>[str(b.id),str(b.reference),str(b.count),
    fmt(b.totalCents),str(b.status),str(b.reason),
    (b.items||[]).map(i=>str(i.financeId)+' ('+str(i.sourceId)+')').join(' · ')]))+
  '<p class="caption">Lotes são imutáveis no laboratório; comprovantes e autenticação ainda estão pendentes.</p>',true);
}
function updateBatchPreview(){
 const form=document.querySelector('#finance-batch-form');
 if(!form||!doc)return;
 const selected=[...form.querySelectorAll('[name="financeIds"]:checked')];
 const total=selected.reduce((n,x)=>n+Number(x.dataset.batchCents||0),0);
 const summary=$('finance-batch-summary');
 if(summary)summary.textContent=selected.length+' título(s) selecionado(s) · '+fmt(total)+
  ' · conferência final do núcleo obrigatória (somente dados fictícios)';
}
function refDocs(s){return '<div class="flow"><span>Pedido</span>→<span>Corte</span>→<span>Facção</span>→<span>Retorno</span>→<span>Acerto</span>→<span>Separação</span>→<span>Expedição</span>→<span>Financeiro</span></div>'+
 '<p>Todos os passos alteram o mesmo estado fictício, guardado no IndexedDB deste navegador. Cada operação tem revisão e histórico.</p>'}
function guidedJourney(s){
 if(!s.orders.some(x=>x.id===journeyOrderId))journeyOrderId=s.orders[s.orders.length-1]?.id||null;
 const guide=api.journey(s,journeyOrderId);
 const choice=s.orders.length?'<div class="field"><label for="journey-order">Pedido fictício acompanhado</label>'+
  '<select class="input" id="journey-order">'+
  options(s.orders.map(o=>[o.id,o.id+' · '+(ref(s.products,o.productId)?.name||'Modelo')]),guide.orderId)+
  '</select></div>':'<p>Comece em Compras para testar o recebimento de material; depois cadastre um pedido fictício.</p>';
 const rows=guide.steps.map((step,i)=>
  '<li class="journey-step" data-step-id="'+str(step.id)+'" data-completed="'+String(step.completed)+'">'+
  '<div><strong>'+(i+1)+'. '+str(step.title)+'</strong>'+
  '<p class="caption">'+str(step.detail)+'</p></div>'+
  '<div class="journey-actions"><span class="chip '+(step.completed?'':'wait')+'">'+
  (step.completed?'Evidência local':'Pendente')+'</span>'+
  '<button type="button" class="btn" data-goto="'+str(step.module)+'">'+
  (step.completed?'Conferir':'Testar')+'</button></div></li>').join('');
 const optional=guide.optional;
 return '<p><strong>Jornada por pedido, sem lançamentos automáticos.</strong> Os indicadores são calculados a partir do IndexedDB fictício e não comprovam o sistema de produção. A compra deve se referir ao material do pedido escolhido.</p>'+
 choice+
 '<p id="journey-progress" class="caption" role="status" aria-live="polite"><strong>'+
 guide.completed+' de '+guide.total+' etapas com evidência local</strong> · Pedido '+
 str(guide.orderId||'a cadastrar')+'</p>'+
 '<ol class="journey-list" id="journey-steps">'+rows+'</ol>'+
 '<div class="journey-step" data-step-id="compensacao" data-completed="'+String(optional.completed)+'">'+
 '<div><strong>Etapa opcional: '+str(optional.title)+'</strong><p class="caption">'+str(optional.detail)+'</p></div>'+
 '<div class="journey-actions"><span class="chip '+(optional.completed?'':'wait')+'">'+
 (optional.completed?'Evidência local':'Não realizada')+'</span>'+
 '<button type="button" class="btn" data-goto="acertos">Abrir Acertos</button></div></div>'+
 '<p class="caption">Depois do teste, atualize a página, confira os mesmos IDs e exporte JSON/CSV. A atualização e a conferência humana não são marcadas automaticamente como concluídas.</p>';
}

/* Painéis observáveis como plug-in independente; erro ou desativação retorna às telas legadas. */
function observerResult(s){
 try{
  const reg=window.HLGBLabModules;
  const r=reg&&reg.call('observabilidade','analyze',s);
  return r&&r.ok?r.data:null;
 }catch(error){return null}
}


function bomCutPanels(s){
 const eligible=s.orders.filter(o=>Array.isArray(o.colorGrades)&&o.colorGrades.length&&
  (Object.values(o.cut).every(n=>n===0)||(s.bomCutRuns||[]).some(r=>r.orderId===o.id)));
 const colors=[...new Set(eligible.flatMap(o=>o.colorGrades.map(x=>x.color)))];
 const cuts=s.bomCutRuns||[];
 return panel('Corte BOM · vários materiais por cor/tamanho, somente laboratório',
  '<p>Antes de cortar, complete a grade por cor em Facções. A prévia é somente leitura. A conclusão desconta todos os materiais juntos, sem misturar com o Corte antigo.</p>'+
  form('cut.bom.execute','Conferir e concluir lote multimatéria',[
   field('orderId','Pedido ainda sem corte tradicional','select','',
    selector(eligible,o=>o.id+' · '+(ref(s.products,o.productId)?.name||'Modelo'))),
   field('color','Cor','select','',colors.map(c=>[c,c])),
   field('size','Tamanho','select','',api.sizes.map(z=>[z,z])),
   field('qty','Peças para cortar','int','1'),
   field('workMode','Origem do corte','select','',[['interno','Interno'],['externo','Externo']]),
   field('cutterOne','Cortador 1','text','Ana Cortadora'),
   field('cutterTwo','Cortador 2','text','Beto Cortador'),
   field('spreader','Enfestador','text','Carla Enfestadora'),
   ...s.materials.map(m=>field('waste_'+m.id,'Lixo de '+m.name+' (g)','int','0')),
   field('signatureOne','Conferência do cortador 1','text','Ana Cortadora'),
   field('signatureTwo','Conferência do cortador 2','text','Beto Cortador'),
   field('reason','Observação obrigatória','text','Corte BOM fictício')
  ],'Concluir e baixar estoque fictício')+
  '<div class="actions"><button class="btn" type="button" id="preview-bom-cut">Prévia de materiais e estoque (sem baixa)</button></div>'+
  '<p class="caption">Informe desperdício somente para materiais usados na ficha da variação. Conferências digitadas não equivalem a assinatura legal.</p>',true)+
 panel('Histórico de corte BOM — por cor e material',
  table(['Lote','Pedido','Cor','Tamanho','Qtd','Materiais','Total (g)','Comando'],
   cuts.map(x=>[str(x.id),str(x.orderId),str(x.color),str(x.size),
    str(x.qty),str(x.materials.length),str(x.totalGrams),str(x.commandId)]))+
  '<h3>Baixas auditáveis por material</h3>'+
  table(['Lote','Material','Útil (g)','Desperdício (g)','Total (g)','Regra congelada','Custo estimado'],
   cuts.flatMap(x=>x.materials.map(m=>[str(x.id),
    str(ref(s.materials,m.materialId)?.name||m.materialId),
    str(m.requiredGrams),str(m.scrapGrams),str(m.totalGrams),
    str(m.ruleId),fmt(m.theoreticalCostCents)]))),true);
}
function materialPlannerResult(s){
 try{return window.HLGBLabMaterialsPlannerV1?.preview(s)||null}
 catch(error){return {error:String(error.message||error)}}
}
function materialRecipePanels(s){
 const catalog=(s.colorCatalog||window.HLGBLabMaterialsPlannerV1?.seed?.()||[]),
   colorChoices=[['*','Todas as cores'],...catalog.map(x=>[x.name,x.name])],
   sizeChoices=[['*','Todos os tamanhos'],...api.sizes.map(sz=>[sz,sz])],
   materials=selector(s.materials,x=>x.name),products=selector(s.products,x=>x.name);
 const recipes=s.materialRecipeRules||[];
 return panel('Paleta central de cores — reaproveitar no pedido e na produção',
  '<p>Cadastre cada cor uma única vez. O cadastro não renomeia cores usadas em pedidos anteriores.</p>'+
  form('color.catalog.add','Incluir cor reutilizável',[
   field('name','Nome único da cor','text','Azul-marinho')
  ],'Cadastrar nova cor')+
  table(['Código','Cor','Origem'],catalog.map(x=>[
   str(x.id),str(x.name),str(x.origin)])),true)+
 panel('Ficha técnica de materiais por modelo, cor e tamanho',
  '<p>Defina consumo específico em gramas por peça. Para o material principal, a regra substitui <strong>apenas na previsão</strong> o consumo básico; materiais adicionais, como renda ou tule, são somados ao principal. Regras mais específicas prevalecem sobre regras gerais.</p>'+
  form('material.recipe.set','Nova versão da receita de planejamento',[
   field('productId','Modelo','select','',products),
   field('materialId','Material ou aviamento','select','',materials),
   field('color','Cor aplicável','select','',colorChoices),
   field('size','Tamanho aplicável','select','',sizeChoices),
   field('gramsPerUnit','Consumo deste componente por peça (g)','int','15'),
   field('reason','Justificativa da receita','text','Estimativa fictícia aprovada para previsão')
  ],'Registrar regra sem alterar corte')+
  table(['Versão','Modelo','Material','Cor','Tamanho','g/peça','Situação','Motivo'],
   recipes.map(r=>[str(r.id),str(ref(s.products,r.productId)?.name||r.productId),
    str(ref(s.materials,r.materialId)?.name||r.materialId),
    str(r.color==='*'?'Todas':r.color),str(r.size==='*'?'Todos':r.size),
    str(r.gramsPerUnit),r.active?'Atual':'Substituída',str(r.reason)]))+
  '<p class="caption">Nunca altera silenciosamente o estoque nem as folhas de corte concluídas. O consumo efetivo do Corte permanece na rotina antiga até homologação posterior.</p>',true);
}
function materialsPlanningPanels(s){
 const catalog=(s.colorCatalog||window.HLGBLabMaterialsPlannerV1?.seed?.()||[]),
  colors=catalog.map(x=>[x.name,x.name]),
  products=selector(s.products,x=>x.name+' · '+x.sku),
  current=(s.materialPlanLines||[]),active=current.filter(x=>x.active),
  result=materialPlannerResult(s);
 return panel('Planejador semanal de produção — várias peças e vários modelos',
  '<p>Monte um cenário fictício com a quantidade de cada modelo, cor e tamanho. Cada linha pode ser arquivada, mas o histórico é preservado. O cálculo <strong>não cria compra, não reserva material e não baixa estoque</strong>.</p>'+
  form('materials.plan.grade.add','Adicionar a grade P/M/G/GG de uma vez',[
   field('productId','Modelo','select','',products),
   field('color','Cor','select','',colors),
   ...api.sizes.map(sz=>field(sz,'Quantidade '+sz,'int',sz==='M'?'20':'0'))
  ],'Adicionar todos os tamanhos em uma única operação')+
  form('materials.plan.add','Adicionar uma quantidade ao cenário',[
   field('productId','Modelo','select','',products),
   field('color','Cor','select','',colors),
   field('size','Tamanho','select','',api.sizes.map(sz=>[sz,sz])),
   field('qty','Quantidade prevista de peças','int','50')
  ],'Adicionar ao planejamento')+
  form('materials.plan.archive','Arquivar linha sem excluir o histórico',[
   field('id','Linha ativa','select','',
    selector(active,x=>x.id+' · '+ref(s.products,x.productId)?.name+' · '+x.color+' '+x.size+' · '+x.qty+' peças')),
   field('reason','Motivo da alteração','text','Replanejamento da produção fictícia')
  ],'Arquivar linha e manter registro')+
  table(['Linha','Modelo','Cor','Tamanho','Peças','Situação'],
   current.map(x=>[str(x.id),str(ref(s.products,x.productId)?.name||x.productId),
    str(x.color),str(x.size),str(x.qty),x.active?'No cenário':'Arquivada'])),true)+
 panel('Lista consolidada de materiais e compra sugerida',
  result?.error?'<p class="error">'+str(result.error)+'</p>':
  (result?'<p>'+str(result.lines)+' linha(s), '+str(result.pieces)+' peça(s) planejadas · custo teórico '+fmt(result.estimatedCostCents)+' · compra faltante estimada '+fmt(result.missingCostCents)+'.</p>'+
  table(['Material','Necessidade (g)','Saldo fictício (g)','Falta comprar (g)','Custo teórico','Valor estimado da falta'],
   result.materials.map(x=>[str(x.name),str(x.requiredGrams),str(x.availableGrams),
    str(x.missingGrams),fmt(x.costCents),fmt(x.purchaseCents)]))+
  '<h3>Resumo por modelo</h3>'+
  table(['Modelo','Peças','Linhas','Material total (g)'],result.products.map(x=>[
   str(x.name)+' · '+str(x.sku),str(x.pieces),str(x.lines),str(x.requiredGrams)]))+
  '<h3>Detalhes da receita por cor e tamanho</h3>'+
  table(['Modelo','Cor','Tamanho','Qtd','Material','g/peça','Total (g)','Regra utilizada'],
   result.detail.map(x=>[str(x.productName),str(x.color),str(x.size),str(x.qty),
    str(x.materialName),str(x.gramsPerUnit),str(x.requiredGrams),
    str(x.ruleId==='ficha-basica'?'Ficha básica':x.ruleId)])):
  '<p>Planejador indisponível nesta versão de testes.</p>')+
  '<div class="actions"><button type="button" class="btn" id="export-shopping-csv">Baixar lista exclusiva de materiais CSV</button></div>'+
  '<p class="caption">A comparação considera uma nova produção hipotética e os saldos atuais do laboratório. Não desconta material de pedidos futuros já existentes nem calcula perdas por cor; confira o estoque físico, desperdício, unidade e preços antes de uma compra real.</p>',true);
}
function observationPanels(s,area){
 const o=observerResult(s);
 if(!o)return null;
 const f=o.findings,metric=[
  ['Eventos históricos',str(o.summary.events)],
  ['Ocorrências em aberto',str(o.summary.openIncidents)],
  ['Alertas críticos',str(o.summary.bySeverity.critica)],
  ['Revisão do documento',str(o.summary.lastRevision)]
 ];
 const summary=panel('Observabilidade 2.0 · dados locais de teste',
  '<p>Diagnóstico independente por módulo, sem autocorreção ou gravação. Não comprova ausência de bugs no HLGB real.</p>'+
  table(['Indicador','Resultado'],metric));
 if(area==='auditor'){
  return summary+panel('Inconsistências e origem provável',
   '<p><strong>'+str(f.length)+' alertas</strong> · '+str(o.status)+
   '. Cada linha indica o registro, a regra verificável e a orientação sem executar alterações.</p>'+
   table(['Gravidade','Regra','Módulo','Registro','Evidência','Próxima conferência'],
    f.slice(0,100).map(x=>[str(x.severity),str(x.code),str(x.module),
    str(x.recordId),str(x.message)+'<div class="caption">'+str(x.evidence)+'</div>',str(x.action)]))+
   (f.length>100?'<p class="caption">Exibidos 100 alertas; exporte JSON para todos os detalhes.</p>':'')+
   '<p class="caption">Sem alertas significa apenas que as regras cobertas não encontraram divergência.</p>',true)+
   panel('Cobertura e limitações',
    table(['Conferência','Escopo'],[
     ['Identificadores e eventos','Duplicidade de IDs, comandos e revisão'],
     ['Pedidos e financeiro','Conta a receber correspondente'],
     ['Compras e estoque','Entrada única e título de fornecedor'],
     ['Corte e materiais','Baixa única por folha concluída'],
     ['Corte BOM com múltiplos materiais','Baixa por material, lote, desperdício, versão e dupla conferência'],
     ['Acertos e compensações','Valor/status, pagamento original, referência e novo título'],
     ['Grade por cor e tamanho','Pedido ↔ corte por tamanho ↔ oficina ↔ retorno ↔ acerto'],
     ['Saúde do HLGB real','Não verificada (sem Supabase ou autenticação)']
    ]),true);
 }
 if(area==='bot'){
  return summary+panel('Assistente de triagem orientado por evidências',
   '<p>Em vez de mensagens genéricas, cada orientação informa o motivo, a quantidade de registros envolvidos e o módulo para conferir. Repetições são agrupadas por regra; <strong>não é IA autônoma</strong> e nenhuma correção é executada.</p>'+
   (o.recommendations.length?o.recommendations.map(x=>
    '<div class="journey-step"><div><strong>'+str(x.priority.toUpperCase())+
    ' · '+str(x.code)+'</strong><p class="caption">'+str(x.why)+
    ' · '+str(x.evidence)+'</p><p>'+str(x.action)+'</p></div>'+
    '<button class="btn" type="button" data-goto="'+str(x.module)+'">Conferir módulo</button></div>'
   ).join(''):'<div class="success">Nenhuma recomendação nas regras locais cobertas.</div>'),true)+
   panel('Aprendizado verificável do histórico (não autônomo)',
    table(['Operação','Vezes registrada'],o.repeatedOperations.map(x=>
     [str(x.type),str(x.count)]))+
    '<p class="caption">Contagens por tipo de evento; não inferem causas nem alteram código.</p>',true);
 }
 if(area==='relatorios'){
  return summary+panel('Histórico completo de operações fictícias',
   '<p>'+str(o.summary.historyExported)+' eventos registrados. Exiba as últimas 150 linhas na tela e exporte o histórico completo em CSV/JSON. Eventos anteriores não são apagados por este módulo.</p>'+
   '<div class="field"><label for="history-search">Pesquisar comando, revisão, módulo, pessoa ou descrição</label>'+
   '<input class="input" type="search" id="history-search" data-filter-for="audit-history-table" placeholder="Ex.: finance.pay, ACE-0001"></div>'+
   '<div id="audit-history-table">'+table(['Revisão','Comando','Área','Operação','Operador','Descrição'],
    o.history.slice(0,150).map(x=>[str(x.revision),str(x.commandId),
     str(x.module),str(x.type),str(x.actor),str(x.description)]))+'</div>'+
   '<div class="actions"><button type="button" class="btn primary" id="export-observer-csv">Exportar auditoria completa CSV</button></div>',true)+
   panel('Atividade por módulo',
    table(['Módulo','Ações registradas'],o.moduleActivity.map(x=>[str(x.module),str(x.count)])),true)+
   panel('Produção e pedidos por modelo',
    '<p>Quantidades do fluxo e <strong>valor previsto</strong> das encomendas, que não representa dinheiro recebido.</p>'+
    table(['Modelo','Pedidos','Pedidas','Cortadas','Retornadas','Expedidas','Valor previsto'],
     o.modelSummary.map(x=>[str(x.name)+' · '+str(x.sku),str(x.orders),
      str(x.ordered),str(x.cut),str(x.returned),str(x.shipped),
      fmt(x.plannedReceivablesCents)])),true)+
   panel('Corte BOM: materiais, custo teórico e desperdício conferidos',
    '<p>'+str(o.summary.bomCuts)+' lote(s) com baixa fictícia · '+
    str(o.summary.bomUsefulGrams)+' g úteis · '+str(o.summary.bomScrapGrams)+
    ' g de lixo. Cada componente possui um movimento de estoque vinculado ao lote.</p>'+
    table(['Lote','Pedido','Cor','Tamanho','Peças','Útil + lixo (g)','Custo teórico'],
     o.bomCutHistory.map(c=>[
      str(c.id),str(c.orderId),str(c.color),str(c.size),str(c.qty),
      str(c.totalGrams),fmt(c.estimatedCostCents)]))+
    table(['Lote','Insumo','Útil (g)','Lixo (g)','Movimentado (g)','Versão da receita'],
     o.bomCutHistory.flatMap(c=>c.materials.map(m=>[
      str(c.id),str(m.materialName),str(m.requiredGrams),
      str(m.scrapGrams),str(m.totalGrams),str(m.ruleId)]))),true)+
   panel('Grade por cor e tamanho — pedidos classificados',
    '<p>'+str(o.summary.ordersWithColorGrade)+' pedido(s) com cores e tamanhos · '+
    str(o.summary.gradePiecesOpen)+' peça(s) pendentes nas facções. Cada tamanho precisa bater com o pedido e com o corte.</p>'+
    table(['Pedido','Cor','P','M','G','GG','Situação'],
     o.colorGradeSummary.flatMap(o=>o.byColor.map(g=>[
      str(o.orderId),str(g.color),...api.sizes.map(sz=>str(g.sizes[sz])),
      o.ready?'Grade completa':'Faltam cores/tamanhos']))),true)+
   panel('Saldo real por facção, cor e tamanho (laboratório)',
    table(['Pedido','Envio','Oficina','Cor','Tamanho','Enviadas','Retornadas','Pendentes','Acertos'],
     o.gradeInventory.map(g=>[str(g.orderId),str(g.assignmentId),
      str(g.factionName),str(g.color),str(g.size),str(g.sent),
      str(g.returned),str(g.open),g.settlementIds.map(str).join(' · ')||'—'])),true)+
   panel('Distribuição e retorno por facção em cada pedido',
    '<p>'+str(o.summary.distributedOrders)+' pedido(s) dividido(s) entre várias facções · '+
    str(o.summary.openFactionPieces)+' peça(s) ainda não retornadas nos envios. Dados fictícios com rastreio por envio.</p>'+
    table(['Envio','Pedido','Produto','Facção','Enviadas','Retornadas','Pendentes','Acertos vinculados'],
     o.factionDispatches.map(x=>[
      str(x.id),str(x.orderId),str(x.productName),str(x.factionName),
      str(x.qtySent),str(x.qtyReturned),str(x.qtyOpen),
      x.settlementIds.map(str).join(' · ')||'—'])),true)+
   panel('Rastro de transferências entre facções · antes e depois',
    '<p>'+str(o.summary.partialFactionTransfers)+' transferência(s), '+
    str(o.summary.piecesTransferred)+' peça(s) redistribuídas. O histórico de acertos anteriores não é regravado.</p>'+
    table(['Transferência','Pedido','Origem → destino','Peças','Origem antes/depois','Destino antes/depois','Motivo'],
     o.factionTransferHistory.map(t=>[
      str(t.id),str(t.orderId),str(t.fromName)+' → '+str(t.toName),
      str(t.qty),str(t.fromBefore)+' → '+str(t.fromAfter),
      str(t.toBefore)+' → '+str(t.toAfter),str(t.reason)])),true)+
   panel('Acertos e pagamentos por facção',
    '<p>Os valores quitados são somente confirmações fictícias. Correções pós-pagamento aparecem à parte.</p>'+
    table(['Facção','Acertos','Peças','Total','Pago fictício','Em aberto','Compensações líquidas'],
     o.factionSummary.map(x=>[str(x.name),str(x.settlements),str(x.pieces),
      fmt(x.totalSettlementsCents),fmt(x.paidSettlementsCents),
      fmt(x.openSettlementsCents),(x.compensationNetCents<0?'−':x.compensationNetCents>0?'+':'')+
       fmt(Math.abs(x.compensationNetCents))])),true)+
   panel('Fechamentos coletivos por referência',
    '<p>Lotes de títulos de Acertos/Facções e compensações; verifique separadamente cada origem e sem reescrever valores quitados.</p>'+
    table(['Lote','Referência','Motivo','Quantidade','Total fictício','Títulos vinculados'],
     o.paymentBatchHistory.map(b=>[
      str(b.id),str(b.reference),str(b.reason),str(b.count),fmt(b.totalCents),
      b.items.map(i=>str(i.financeId)+' · '+str(i.sourceId)).join(' | ')])),true)+
   panel('Histórico de acertos: antes, depois e justificativas',
    table(['Acerto','Evento','ID do comando','Antes','Depois','Justificativa'],
     o.settlementHistory.slice().reverse().slice(0,120).map(x=>[
      str(x.settlementId),str(x.event),str(x.commandId),fmt(x.beforeCents),
      fmt(x.afterCents),str(x.reason)]))+
    (o.settlementHistory.length>120?'<p class="caption">Mostrados 120 eventos; o JSON preserva o histórico completo.</p>':''),true);
 }
 return null;
}
function moduleHtml(s){
 const o=orderOptions(s),openPlans=(s.cutPlans||[]).filter(p=>p.status==='aberto'),
  planOptions=selector(openPlans,p=>p.id+' · '+p.orderId+' · '+sum(p.grade)+' peças'),
  defaultOrder=s.orders[0],defaultPlan=openPlans[0],
  materials=selector(s.materials,m=>m.name+' · '+m.stockGrams+'g'),clients=selector(s.clients,x=>x.name),
 products=selector(s.products,x=>x.name+' · '+x.sku),factions=selector(s.factions,x=>x.name+' · '+fmt(x.unitCents)+'/peça'),
 suppliers=selector(s.suppliers,x=>x.name),settlements=selector(s.settlements,x=>x.id+' · '+fmt(x.amountCents)+' · '+x.status),
 purchases=selector(s.purchaseOrders.filter(x=>!x.received),x=>x.id+' · '+x.qtyGrams+'g'),
 finance=selector(s.finance.filter(x=>x.status==='aberto'),x=>x.id+' · '+fmt(x.amountCents)+' · '+x.description),
 employees=selector(s.employees,x=>x.name),incidents=selector(s.errors.filter(x=>x.status==='aberto'),x=>x.id+' · '+x.message);
 switch(active){
 case 'nucleo':return panel('Módulos opcionais com desativação segura',
 (window.HLGBLabModules?table(['Módulo','Versão','Ativo','Falhas isoladas'],window.HLGBLabModules.list().map(x=>[
 str(x.id),str(x.version),x.enabled?'Sim':'Não',str(x.failures)])):
 '<p>Registro modular indisponível; funções legadas permanecem acessíveis.</p>')+
 '<div class="actions"><button type="button" class="btn" data-toggle-observer="true">Alternar Observabilidade 2.0 (apenas nesta aba)</button></div>'+
 '<p class="caption">Uma falha no módulo de diagnóstico não bloqueia pedidos, acertos, títulos ou qualquer função anterior. Flag apenas em memória desta aba.</p>',true)+
 panel('Roteiro guiado do fluxo integrado',guidedJourney(s),true)+
 panel('Como testar o fluxo completo',refDocs(s)+
 '<ol class="tips"><li>Em <b>Pedidos</b>, crie uma encomenda P/M/G.</li><li>Em <b>Corte</b>, corte algumas peças; o material será consumido.</li>'+
 '<li>Em <b>Facções</b>, envie as peças cortadas e registre retorno parcial.</li><li>Em <b>Acertos</b>, verifique o título criado; em <b>Separação</b>, dê baixa e despache.</li>'+
 '<li>Em <b>Hub Financeiro</b>, confira a conta a receber do pedido e a conta a pagar do acerto.</li><li>Atualize a página e volte aos módulos. Os registros devem permanecer.</li></ol>',true)+
 panel('Saúde do documento',table(['Regra','Resultado'],Object.entries(api.inspect(s)).filter(([k,v])=>typeof v!=='object').map(([k,v])=>[str(k),str(v)])))+
 panel('Confiabilidade e limites','<p><b>O que funciona aqui:</b> transação local IndexedDB, revisão para evitar sobrescrita por outra aba, confirmação por releitura do comando, auditoria e validações de quantidade.</p>'+
 '<p><b>O que falta:</b> sincronização entre computadores, login real, WAL remoto, RLS empresarial, PDF e pagamentos efetivos. Use o simulador de duas sessões do laboratório para testes de falhas mais amplos.</p>');
 case 'autenticacao':return panel('Papéis de referência — não é login de verdade',
 '<p>Estas são propostas de organização para o futuro controle de permissões. <strong>Não há autenticação neste laboratório</strong>; todas as ações são apenas exercícios locais.</p>'+
 table(['Perfil','Escopo proposto','Validação real'],[['Supervisor','Cadastros, aprovações e relatórios','Pendente'],['Produção','Pedidos, corte, facções e separação','Pendente'],
 ['Financeiro','Acertos, Hub, compras e comprovantes','Pendente'],['Consulta','Visualização sem alterar','Pendente']]),true);
 case 'pedidos':return panel('Incluir pedido com grade',
 form('order.add','Novo pedido fictício',[
 field('clientId','Cliente','select','',clients),field('productId','Modelo','select','',products),
 ...api.sizes.map(z=>field(z,'Quantidade '+z,'int',z==='M'?10:0))],'Cadastrar pedido'))+
 panel('Fluxo e integridade',refDocs(s)+
 '<p>O pedido já gera uma conta fictícia a receber. Corte, produção e separação precisam respeitar a grade.</p>')+
 panel('Pedidos e seus saldos',orderTable(s),true);
 case 'produtos':return materialRecipePanels(s)+panel('Ficha técnica básica e SKU',
 form('product.add','Cadastrar modelo',[field('name','Nome do modelo'),field('sku','SKU único'),
 field('materialId','Material principal','select','',materials),
 field('gramsPerUnit','Consumo por unidade (g)','int','80'),
 field('priceCents','Preço de venda R$','money','39,90')],'Cadastrar modelo'))+
 panel('Referência dos materiais','<p>O corte fictício continua utilizando o consumo principal registrado ao cadastrar o modelo. A nova receita detalhada é usada somente na previsão de materiais, sem alterar baixas antigas.</p>')+
 panel('Modelos cadastrados',table(['SKU','Modelo','Material','Consumo','Preço'],s.products.map(x=>[
 str(x.sku),str(x.name),str(ref(s.materials,x.materialId)?.name),str(x.gramsPerUnit)+'g',fmt(x.priceCents)])),true);
 case 'corte':{
  const gradeFields=(g)=>api.sizes.map(z=>field(z,'Quantidade '+z,'int',g?.[z]||0));
  const planned=(s.cutPlans||[]),done=planned.filter(x=>x.status==='concluido');
  const rows=planned.map(p=>[
   str(p.id)+'<div class="caption">'+str(p.orderId)+'</div>',
   api.sizes.map(z=>z+': '+p.grade[z]).join(' / '),
   str(p.workMode)+'<div class="caption">'+str(p.cutterOne)+' / '+str(p.cutterTwo)+' / '+str(p.spreader)+'</div>',
   str(p.theoreticalGrams)+' g',
   p.status==='concluido'?str(p.usefulGrams)+' g útil + '+str(p.scrapGrams)+' g lixo':'—',
   '<span class="chip '+(p.status==='aberto'?'wait':'')+'">'+str(p.status)+'</span>',
   '<button type="button" class="btn" data-print-plan="'+str(p.id)+'">Imprimir folha</button>'
  ]);
  return bomCutPanels(s)+panel('Grade editável do pedido',
   form('order.grade.update','Ajustar quantidades por tamanho',[
    field('orderId','Pedido','select','',o),...gradeFields(defaultOrder?.grade)
   ],'Salvar grade e conferir valor do pedido')+
   '<p>O pedido não pode ser reduzido abaixo de cortes já executados nem das quantidades reservadas. O título a receber é recalculado apenas quando está aberto.</p>')+
  panel('Lotes de corte e equipe',
   form('cut.plan','Nova folha de corte',[
    field('orderId','Pedido','select','',o),...gradeFields(api.makeGrade()),
    field('workMode','Origem do serviço','select','',[['interno','Interno'],['externo','Externo']]),
    field('cutterOne','Cortador 1','text','Ana Cortadora'),
    field('cutterTwo','Cortador 2','text','Beto Cortador'),
    field('spreader','Enfestador','text','Carla Enfestadora')
   ],'Planejar lote')+
   '<p>Crie várias folhas para dividir a grade de um pedido. Uma folha aberta reserva quantidades, mas não consome material até a conclusão.</p>')+
  panel('Modificar ou cancelar folha em aberto',
   form('cut.plan.update','Alterar equipe e grade do lote',[
    field('id','Folha aberta','select','',planOptions),...gradeFields(defaultPlan?.grade),
    field('workMode','Origem do serviço','select','',[['interno','Interno'],['externo','Externo']]),
    field('cutterOne','Cortador 1','text',defaultPlan?.cutterOne||'Ana Cortadora'),
    field('cutterTwo','Cortador 2','text',defaultPlan?.cutterTwo||'Beto Cortador'),
    field('spreader','Enfestador','text',defaultPlan?.spreader||'Carla Enfestadora')
   ],'Atualizar planejamento')+
   form('cut.plan.cancel','Cancelar folha sem apagar histórico',[
    field('id','Folha aberta','select','',planOptions)
   ],'Cancelar folha aberta'))+
  panel('Conferir peso e concluir o corte',
   form('cut.plan.complete','Baixa auditada com duas conferências',[
    field('id','Folha em aberto','select','',planOptions),
    field('usefulGrams','Peso útil utilizado (g)','int',defaultPlan?.theoreticalGrams||0),
    field('scrapGrams','Peso do lixo/desperdício (g)','int',0),
    field('signatureOne','Conferência digitada do cortador 1','text',''),
    field('signatureTwo','Conferência digitada do cortador 2','text','')
   ],'Concluir lote e baixar estoque')+
   '<p>O sistema desconta <b>peso útil + lixo</b>. As duas conferências digitadas devem coincidir com os nomes dos cortadores, mas não representam assinatura legal.</p>')+
  panel('Corte simplificado — função preservada',
   form('cut.record','Corte avulso por tamanho',[
    field('orderId','Pedido','select','',o),
    field('size','Tamanho','select','',api.sizes.map(z=>[z,z])),
    field('qty','Quantidade','int','5')
   ],'Baixar corte manual')+
   '<p>Para preservar o exercício anterior, esta baixa continua disponível. Não consome peças reservadas por folhas abertas.</p>')+
  panel('Quantidade de pedidos e corte',orderTable(s),true)+
  panel('Folhas e indicadores de peso',
   table(['Folha','Grade','Equipe','Peso teórico','Baixa real','Status','Impressão'],rows)+
   '<div class="flow"><span>Peso útil: '+str(done.reduce((a,p)=>a+p.usefulGrams,0))+' g</span>'+
   '<span>Lixo: '+str(done.reduce((a,p)=>a+p.scrapGrams,0))+' g</span></div>'+
   '<p>Imprimir folha abre o diálogo de impressão do navegador para gerar papel ou salvar como PDF. Somente informações fictícias.</p>',true);
 }
 case 'producao':return panel('Acompanhamento PCP',refDocs(s)+
 '<p>Envio e retorno são registrados na guia <b>Facções</b>; não são permitidas baixas que excedam etapas anteriores.</p>'+
 table(['Pedido','Cortadas','Enviadas','Retornadas','Pendentes retorno'],s.orders.map(x=>[
 str(x.id),str(sum(x.cut)),str(x.allocated),str(x.returned),str(x.allocated-x.returned)])))+
 panel('Próximas operações','<div class="actions"><button class="btn primary" type="button" data-goto="faccoes">Gerenciar facções</button>'+
 '<button class="btn" type="button" data-goto="separacao">Separação</button></div>');
 case 'separacao':return panel('Baixa de separação / expedição',
 form('order.separate','Separar parcialmente',[field('orderId','Pedido','select','',o),
 field('qty','Quantidade para separar','int','5')],'Confirmar separação')+
 form('order.ship','Expedir peças separadas',[field('orderId','Pedido','select','',o),
 field('qty','Peças expedidas','int','5')],'Registrar despacho'))+
 panel('Validação da etapa','<p>Separação só pode usar quantidade já retornada. O despacho não pode ser maior que a separação registrada. Cada ação gera evento local.</p>')+
 panel('Saldo a separar e expedir',table(['Pedido','Retornado','Separado','Despachado'],s.orders.map(x=>[
 str(x.id),str(x.returned),str(x.separated),str(x.shipped)])),true);
 case 'faccoes':{
 const rows=s.factionAssignments||[];
 const unclassified=selector(s.orders.filter(x=>!x.colorGrades?.length),
  x=>x.id+' · '+(ref(s.products,x.productId)?.name||'Modelo')+' · '+sum(x.grade)+' peças');
 const classified=s.orders.filter(x=>x.colorGrades?.length);
 const colorOptions=[...new Set([
  ...(s.colorCatalog||window.HLGBLabMaterialsPlannerV1?.seed?.()||[]).map(x=>x.name),
  ...classified.flatMap(x=>x.colorGrades.map(g=>g.color))
 ])].map(x=>[x,x]);
 const sizeOptions=api.sizes.map(x=>[x,x]);
 const colorAssignmentOptions=selector(rows.filter(x=>classified.some(o=>o.id===x.orderId)),
  x=>x.id+' · '+x.orderId+' · '+(ref(s.factions,x.factionId)?.name||'—')+
   ' · '+(x.qtySent-x.qtyReturned)+' peças pendentes');
 const pendingTransfer=selector(s.orders.filter(x=>!x.colorGrades?.length&&x.allocated>0&&x.returned===0&&
  rows.filter(a=>a.orderId===x.id).length<=1),
  x=>x.id+' · '+(ref(s.factions,x.factionId)?.name||'—')+' · '+x.allocated+' peças');
 const pendingSimple=selector(s.orders.filter(x=>!x.colorGrades?.length&&x.allocated>x.returned&&
  rows.filter(a=>a.orderId===x.id).length<=1),
  x=>x.id+' · '+(ref(s.factions,x.factionId)?.name||'—')+' · '+(x.allocated-x.returned)+' peças');
 const pendingAssignments=selector(rows.filter(x=>!classified.some(o=>o.id===x.orderId)&&x.qtySent>x.qtyReturned),
  x=>x.id+' · '+x.orderId+' · '+(ref(s.factions,x.factionId)?.name||'—')+
  ' · '+(x.qtySent-x.qtyReturned)+' peças aguardando');
 const transferable=selector(rows.filter(x=>!classified.some(o=>o.id===x.orderId)&&x.qtySent>1&&x.qtySent>x.qtyReturned),
  x=>x.id+' · '+x.orderId+' · '+(ref(s.factions,x.factionId)?.name||'—')+
  ' · '+(x.qtySent-x.qtyReturned)+' peças disponíveis');
 return panel('Cadastro e regras por facção',
 form('faction.add','Cadastrar facção fictícia',[
  field('name','Nome da facção'),field('unitCents','Preço padrão por peça (R$)','money','6,00'),
  field('traveta','Faz travetada?','select','',[['true','Sim'],['false','Não']])
 ],'Cadastrar facção')+
 form('faction.rate.set','Definir preço específico por modelo',[
  field('factionId','Facção','select','',factions),
  field('productId','Modelo','select','',products),
  field('unitCents','Preço bruto por peça (R$)','money','6,00'),
  field('reason','Motivo da alteração','text','Preço específico fictício')
 ],'Salvar preço para próximos retornos')+
 form('faction.traveta.set','Alterar regra de travetada',[
  field('factionId','Facção','select','',factions),
  field('traveta','Faz travetada?','select','',[['true','Sim'],['false','Não']]),
  field('reason','Motivo','text','Nova regra para retornos futuros')
 ],'Salvar regra futura')+
 '<p>Preços e travetada alterados só valem para novos retornos. Acertos existentes mantêm os valores que tinham quando foram criados.</p>')+
 panel('Envio, troca controlada e retorno',
 form('faction.allocate','Enviar peças cortadas',[
  field('orderId','Pedido','select','',unclassified),field('factionId','Facção','select','',factions),
  field('qty','Quantidade a enviar','int','5')
 ],'Enviar peças')+
 form('faction.reassign','Transferir antes do primeiro retorno',[
  field('orderId','Pedido já enviado, sem retorno','select','',pendingTransfer),
  field('factionId','Nova facção','select','',factions),
  field('reason','Motivo obrigatório','text','Troca de facção no teste')
 ],'Registrar transferência com histórico')+
 form('faction.return','Registrar retorno parcial',[
  field('orderId','Pedido','select','',pendingSimple),field('qty','Quantidade devolvida','int','3')
 ],'Confirmar retorno e gerar acerto')+
 '<p>A troca fica bloqueada se já existir retorno/acerto. Ela é um exemplo de transferência total antes do primeiro retorno, não uma redistribuição avançada entre várias facções.</p>')+
 panel('Grade por cor e tamanho — cada facção recebe a quantidade certa',
 form('order.color.grade.set','Cadastrar ou corrigir uma cor antes do primeiro envio',[
  field('orderId','Pedido sem envios','select','',
   selector(s.orders.filter(x=>x.allocated===0),
    x=>x.id+' · '+(ref(s.products,x.productId)?.name||'Modelo'))),
  field('color','Cor cadastrada','select','',colorOptions),
  ...api.sizes.map(sz=>field(sz,sz+' — peças desta cor','int','0'))
 ],'Salvar quantidades da cor')+
 '<p class="caption">Cadastre uma linha para cada cor, usando P, M, G e GG. A soma de todas as cores deve corresponder à grade total do pedido antes de enviar. Digitar tudo zero remove uma cor já cadastrada, enquanto não houver envios. A grade geral do pedido permanece preservada.</p>'+
 table(['Pedido','Cor','P','M','G','GG','Total'],
  classified.flatMap(o=>o.colorGrades.map(g=>[str(o.id),str(g.color),
   ...api.sizes.map(sz=>str(g.grade[sz])),str(sum(g.grade))])))+
 '<h3>Conferência antes de alocar</h3>'+
 table(['Pedido','Situação','Falta P','Falta M','Falta G','Falta GG'],
  classified.map(o=>{
   const totals=Object.fromEntries(api.sizes.map(sz=>[sz,
    o.grade[sz]-o.colorGrades.reduce((n,g)=>n+g.grade[sz],0)]));
   const complete=api.sizes.every(sz=>totals[sz]===0);
   return [str(o.id),complete?'Completa para alocar':'Incompleta — finalize as cores',
    ...api.sizes.map(sz=>str(totals[sz]))];
  })),true)+
 panel('Distribuição, retornos e transferências por cor/tamanho',
 form('faction.grade.allocate','Enviar peças identificadas por cor/tamanho',[
  field('orderId','Pedido com cores cadastradas','select','',
   selector(classified,x=>x.id+' · '+(ref(s.products,x.productId)?.name||'Modelo'))),
  field('factionId','Facção de destino','select','',factions),
  field('color','Cor','select','',colorOptions),
  field('size','Tamanho','select','',sizeOptions),
  field('qty','Quantidade a enviar','int','1')
 ],'Enviar peças da grade')+
 form('faction.grade.return','Retornar peças com identificação exata',[
  field('assignmentId','Envio da facção','select','',colorAssignmentOptions),
  field('color','Cor retornada','select','',colorOptions),
  field('size','Tamanho retornado','select','',sizeOptions),
  field('qty','Quantidade retornada','int','1')
 ],'Gerar acerto da cor/tamanho')+
 form('faction.grade.transfer','Transferir saldo identificado para outra facção',[
  field('fromAssignmentId','Envio de origem','select','',colorAssignmentOptions),
  field('toFactionId','Facção que receberá','select','',factions),
  field('color','Cor','select','',colorOptions),
  field('size','Tamanho','select','',sizeOptions),
  field('qty','Quantidade a transferir','int','1'),
  field('reason','Justificativa','text','Redistribuição fictícia da grade')
 ],'Transferir com histórico por cor/tamanho')+
 '<p class="caption">Se uma facção recebeu 3 peças pretas M, ela não poderá devolver 4 peças pretas M nem substituir por outra cor. Valores de acertos já pagos continuam imutáveis. Os formulários simples anteriores não deixam enviar pedidos já classificados por cor.</p>'+
 '<h3>Saldo por oficina, cor e tamanho</h3>'+
 table(['Envio','Pedido','Facção','Cor','Tamanho','Enviadas','Retornadas','Pendentes'],
  rows.flatMap(row=>(row.gradeLines||[]).map(line=>[
   str(row.id),str(row.orderId),
   str(ref(s.factions,row.factionId)?.name||row.factionId),
   str(line.color),str(line.size),str(line.sent),str(line.returned),
   str(line.sent-line.returned)]))),true)+
 panel('Distribuir um pedido entre múltiplas facções',
 form('faction.multi.allocate','Enviar lote parcial a uma facção',[
  field('orderId','Pedido com peças cortadas','select','',unclassified),
  field('factionId','Facção que receberá o lote','select','',factions),
  field('qty','Peças desse envio','int','2')
 ],'Alocar peças sem sobrescrever outros destinos')+
 form('faction.multi.transfer','Transferir parte das peças ainda não retornadas',[
  field('fromAssignmentId','Envio da facção de origem','select','',transferable),
  field('toFactionId','Facção de destino','select','',factions),
  field('qty','Peças para transferir','int','1'),
  field('reason','Justificativa obrigatória','text','Redistribuição de saldo pendente fictício')
 ],'Registrar transferência parcial com histórico')+
 '<p class="caption">A transferência não altera acertos anteriores nem aumenta o total enviado do pedido. Não permite esvaziar completamente a origem nesta rotina parcial.</p>'+
 form('faction.multi.return','Registrar retorno da facção correta',[
  field('assignmentId','Envio específico e saldo a retornar','select','',pendingAssignments),
  field('qty','Quantidade que retornou','int','1')
 ],'Registrar retorno e gerar acerto dessa facção')+
 '<p class="caption">As quantidades de cada facção são independentes. O envio antigo continua disponível para pedidos com destino único. Para pedidos divididos, use o retorno pelo envio específico; assim o acerto e o título financeiro mostram a facção correta.</p>',true)+
 panel('Distribuição por pedido e facção — rastreabilidade',
 table(['Envio','Pedido','Facção','Peças enviadas','Retornadas','Faltam retornar','Origem'],
  rows.map(x=>[str(x.id),str(x.orderId),
   str(ref(s.factions,x.factionId)?.name||x.factionId),
   str(x.qtySent),str(x.qtyReturned),str(x.qtySent-x.qtyReturned),
   str(x.origin||'legado-local')]))+
 '<p class="caption">As peças devolvidas antes do pagamento ajustam o saldo da facção original, sem afetar as outras. Não é um extrato da base real.</p>',true)+
 panel('Histórico permanente de transferências parciais entre facções',
 table(['ID','Pedido','De','Para','Peças','Antes → depois (origem)','Antes → depois (destino)','Justificativa'],
  (s.factionPartialTransfers||[]).map(m=>[
   str(m.id),str(m.orderId),
   str(ref(s.factions,m.fromFactionId)?.name||m.fromFactionId),
   str(ref(s.factions,m.toFactionId)?.name||m.toFactionId),
   str(m.qty),str(m.fromBefore)+' → '+str(m.fromAfter),
   str(m.toBefore)+' → '+str(m.toAfter),str(m.reason)]))+
 '<p class="caption">Somente o saldo pendente muda de responsável; a trilha de cada transferência fica vinculada ao comando que a criou.</p>',true)+
 panel('Lista de facções e preços',
 '<div class="field"><label for="faction-search">Buscar facção</label>'+
 '<input id="faction-search" class="input" data-filter-for="faction-table" type="search" placeholder="Nome, modelo, preço..."></div>'+
 '<div id="faction-table">'+table(['Facção','Preço padrão','Travetada','Preços por modelo'],s.factions.map(x=>[
  str(x.name),fmt(x.unitCents),x.traveta?'Sim':'Não',
  Object.entries(x.productRates||{}).map(([productId,cents])=>
    str(ref(s.products,productId)?.name||productId)+': '+fmt(cents)).join(' · ')||'Padrão'
 ]))+'</div>'+
 '<p class="caption">A prévia usa, quando aplicável, um desconto ilustrativo de R$ 0,50/peça para facções que não travetam. Configure preço específico e confira o valor líquido no acerto. Não representa a tabela oficial.</p>')+
 panel('Pedidos, transferências e rastreabilidade',
 orderTable(s)+
 '<h3>Trocas registradas</h3>'+
 table(['ID','Pedido','De','Para','Peças','Motivo'],(s.factionTransfers||[]).map(x=>[
 str(x.id),str(x.orderId),str(ref(s.factions,x.fromFactionId)?.name),
 str(ref(s.factions,x.toFactionId)?.name),str(x.qty),str(x.reason)
 ])),true);
 }
 case 'acertos':{
 const open=selector(s.settlements.filter(x=>x.status==='aberto'&&!x.gradeTracked),
  x=>x.id+' · '+fmt(x.amountCents)+' · '+(ref(s.factions,x.factionId)?.name||'—'));
 const trackedOpen=selector(s.settlements.filter(x=>x.status==='aberto'&&x.gradeTracked&&x.qty>1),
  x=>x.id+' · '+x.color+' '+x.size+' · '+fmt(x.amountCents));
 const allOpen=selector(s.settlements.filter(x=>x.status==='aberto'),
  x=>x.id+' · '+fmt(x.amountCents)+' · '+(ref(s.factions,x.factionId)?.name||'—'));
 const paid=selector(s.settlements.filter(x=>x.status==='pago'),
  x=>x.id+' · Pago '+fmt(x.amountCents)+' · '+(ref(s.factions,x.factionId)?.name||'—'));
 const compensations=s.settlementCompensations||[];
 return panel('Serviços avulsos e embalagem',
 form('settlement.add','Novo acerto avulso fictício',[
  field('serviceType','Tipo de serviço','select','',[['costura','Costura avulsa'],['embalagem','Embalagem']]),
  field('factionId','Facção / embaladeira','select','',factions),
  field('productId','Modelo','select','',products),
  field('qty','Quantidade','int','20'),
  field('unitCents','Preço por peça (R$)','money','0,25'),
  field('travetaCents','Desconto de travetada por peça (R$)','money','0,00'),
  field('reason','Descrição / justificativa','text','Embalagem fictícia')
 ],'Gerar acerto e título a pagar')+
 '<p>O tipo <strong>Embalagem</strong> usa valor por peça independente da mão de obra de costura. As sugestões de R$ 0,25 para camisola/doll e R$ 0,15 para calcinha são exemplos editáveis, não preços confirmados da empresa.</p>')+
 panel('Devolver peças com motivo e histórico',
 form('settlement.pieces.return','Devolução parcial sem apagar o acerto',[
  field('id','Acerto em aberto','select','',open),
  field('qty','Quantidade devolvida','int','1'),
  field('reason','Justificativa obrigatória','text','Peças devolvidas na conferência fictícia')
 ],'Registrar devolução e recalcular Hub')+
 '<p>Somente antes do pagamento. O pedido não pode ficar com retorno abaixo das peças já separadas. A operação mantém o acerto original, o histórico de quantidade anterior e a nova quantia no Hub.</p>')+
 panel('Devolução detalhada antes de pagar — conserva a grade',
 form('settlement.grade.pieces.return','Devolver peças de um acerto com cor/tamanho',[
  field('id','Acerto identificado em aberto','select','',trackedOpen),
  field('qty','Peças devolvidas desta cor/tamanho','int','1'),
  field('reason','Justificativa obrigatória','text','Correção da grade antes da quitação')
 ],'Atualizar acerto, saldo da facção e Hub')+
 '<p class="caption">A devolução só pode usar o mesmo tamanho e cor do acerto. Acertos pagos são protegidos.</p>',true)+
 panel('Ajustar apenas acerto em aberto',
 form('settlement.adjust','Abatimento ou acréscimo rastreado',[
  field('id','Acerto ainda não pago','select','',allOpen),
  field('adjustmentCents','Ajuste total (R$), aceita negativo','signed-money','0,00'),
  field('reason','Motivo','text','Conferência do valor fictício')
 ],'Salvar ajuste e reconciliar Hub')+
 '<p>Se o título vinculado já estiver quitado, não é permitido alterar o pagamento original. A correção pós-pagamento exigirá uma rotina separada de compensação.</p>')+
 panel('Compensação separada de acertos pagos',
 form('settlement.compensate','Corrigir sem reescrever pagamento anterior',[
  field('id','Acerto original já pago','select','',paid),
  field('deltaCents','Diferença em R$ (positiva = pagar; negativa = receber)','signed-money','1,00'),
  field('reference','Referência única para evitar duplicidade','text','CORRECAO-TESTE-001'),
  field('reason','Justificativa obrigatória','text','Compensação fictícia após conferência')
 ],'Criar compensação separada e título novo')+
 '<p><strong>O pagamento original não muda.</strong> Uma diferença positiva gera título fictício a pagar; negativa gera título fictício a receber. A mesma referência não pode ser usada duas vezes no mesmo acerto. É apenas uma demonstração de compensação, não devolução bancária automática nem documento fiscal.</p>')+
 panel('Pesquisar acertos e histórico',
 '<div class="fields" id="settlement-filters">'+
 '<div class="field"><label for="settlement-search">Busca única: acerto, modelo, facção, referência ou motivo</label>'+
 '<input id="settlement-search" class="input" type="search" placeholder="Ex.: ACE-0004, embalagem, AJ-TESTE"></div>'+
 '<div class="field"><label for="settlement-status">Situação do acerto</label><select class="input" id="settlement-status" data-settlement-filter="status">'+
 options([['todos','Todos'],['aberto','Em aberto'],['pago','Pago']])+'</select></div>'+
 '<div class="field"><label for="settlement-faction">Facção ou embaladeira</label><select class="input" id="settlement-faction" data-settlement-filter="faction">'+
 options([['todas','Todas'],...s.factions.map(x=>[x.id,x.name])])+'</select></div>'+
 '<div class="field"><label for="settlement-service">Tipo de serviço</label><select class="input" id="settlement-service" data-settlement-filter="service">'+
 options([['todos','Todos'],['costura','Costura'],['embalagem','Embalagem']])+'</select></div>'+
 '<div class="field"><label for="settlement-compensation">Situação das compensações</label><select class="input" id="settlement-compensation" data-settlement-filter="compensation">'+
 options([['todos','Todas'],['aberto','Em aberto'],['pago','Quitadas']])+'</select></div></div>'+
 '<div class="actions"><button type="button" class="btn" id="settlement-clear-filters">Limpar filtros</button></div>'+
 '<p class="caption" role="status" aria-live="polite" id="settlement-query-summary">Calculando a consulta local...</p>'+
 '<div id="settlement-table">'+table(
 ['Acerto','Facção / serviço','Modelo','Peças','Bruto/peça','Travetada/peça','Ajuste total','Total','Situação'],
 s.settlements.map(x=>[
  str(x.id)+'<div class="caption">'+str(x.orderId||'Avulso')+'</div>',
  str(ref(s.factions,x.factionId)?.name)+'<div class="caption">'+str(x.serviceType||'costura')+'</div>',
  str(ref(s.products,x.productId)?.name||ref(s.products,ref(s.orders,x.orderId)?.productId)?.name||'—'),
  str(x.qty),fmt(x.listUnitCents??x.unitCents),fmt(x.travetaCents||0),
  fmt(x.adjustmentCents),fmt(x.amountCents),
  '<span class="chip '+(x.status==='aberto'?'wait':'')+'">'+str(x.status)+'</span>'
 ]))+'</div>'+
 '<h3>Alterações de valores</h3>'+
 table(['Acerto','Evento','Antes','Depois','Motivo'],s.settlements.flatMap(x=>
  (x.history||[]).map(e=>[str(x.id),str(e.commandId),fmt(e.beforeCents),fmt(e.afterCents),str(e.reason)])
  ))+
 '<h3>Devoluções de peças</h3>'+
 table(['Acerto','Comando','Devolvidas','Antes','Depois','Motivo'],s.settlements.flatMap(x=>
  (x.returns||[]).map(ev=>[str(x.id),str(ev.commandId),str(ev.qty),
   str(ev.beforeQty)+' pç / '+fmt(ev.beforeCents),str(ev.afterQty)+' pç / '+fmt(ev.afterCents),str(ev.reason)])
  ))+
 '<h3>Compensações após pagamento (sem alterar título original)</h3><div id="settlement-compensation-table">'+
 table(['Compensação','Acerto pago','Referência','Diferença','Novo título','Situação','Justificativa','Imprimir'],
 compensations.map(c=>[
  str(c.id),str(c.settlementId),str(c.reference),
  (c.deltaCents>0?'+':'−')+fmt(Math.abs(c.deltaCents)),
  str(c.kind)+' · '+fmt(Math.abs(c.deltaCents)),
  '<span class="chip '+(c.status==='aberto'?'wait':'')+'">'+str(c.status)+'</span>',
  str(c.reason),
  '<button type="button" class="btn" data-print-comp="'+str(c.id)+'">Conferência PDF</button>'
 ]))+'</div>'+
 '<p class="caption">Conferência PDF abre a impressão do navegador. O arquivo gerado não comprova uma transferência bancária real.</p>',true);
 }
 case 'hub':return panel('Lançamento do Hub fictício',
 form('finance.add','Novo título',[field('description','Descrição'),field('kind','Tipo','select','',[['pagar','Pagar'],['receber','Receber']]),
 field('amountCents','Valor em R$','money','100,00')],'Cadastrar título')+
 form('finance.pay','Confirmar lançamento',[field('id','Título aberto','select','',finance)],'Marcar como quitado ficticiamente')+
 '<p class="caption">Esta ação não movimenta dinheiro. Confirme apenas valores fictícios.</p>')+
 financialBatchPanel(s)+
 panel('Conferência financeira','<p>Pedidos geram contas a receber; retornos, acertos a pagar. Compensações de acertos pagos criam títulos separados a pagar ou receber, sem alterar o pagamento original. Nenhuma operação movimenta dinheiro real.</p>')+
 panel('Contas do laboratório',financeTable(s),true);
 case 'folha':return panel('Editar salário e passagem por pessoa',
 form('payroll.update','Alterar registro da folha',[field('id','Funcionário','select','',employees),
 field('salaryCents','Salário-base R$','money','2000,00'),
 field('passageCents','Passagem R$','money','120,00'),
 field('extrasCents','Extras R$','money','0,00'),
 field('discountCents','Descontos R$','money','0,00')],'Salvar valores individuais'))+
 panel('Não é cálculo trabalhista','<p>A passagem entra no desembolso separado do salário. Não calcula encargos, FGTS, INSS ou rescisão real. A Folha 2.0 separada possui testes adicionais de ordenação e conflitos.</p>'+
 '<a href="./folha-homologacao.html" class="btn link">Abrir Folha 2.0 detalhada</a>')+
 panel('Saldos da folha fictícia',table(['Funcionário','Base','Passagem','Extras','Descontos','Desembolso'],s.employees.map(e=>[
 str(e.name),fmt(e.salaryCents),fmt(e.passageCents),fmt(e.extrasCents),fmt(e.discountCents),
 fmt(e.salaryCents+e.extrasCents-e.discountCents+e.passageCents)])),true);
 case 'compras':return materialsPlanningPanels(s)+panel('Compra com dupla conferência',
 form('purchase.add','Planejar compra',[field('supplierId','Fornecedor','select','',suppliers),
 field('materialId','Material','select','',materials),
 field('qtyGrams','Quantidade (g)','int','3000'),
 field('checkerOne','Conferente 1','text','Aline Teste'),
 field('checkerTwo','Conferente 2','text','Beto Exemplo')],'Registrar compra')+
 form('purchase.receive','Receber compra',[field('id','Compra pendente','select','',purchases)],'Conferir e dar entrada no estoque'))+
 panel('Controle de compras','<p>O recebimento atualiza o estoque e cria uma única conta a pagar. Não é possível receber duas vezes o mesmo pedido de compras.</p>')+
 panel('Compras do laboratório',table(['Compra','Fornecedor','Material','Quantidade','Conferentes','Status'],s.purchaseOrders.map(x=>[
 str(x.id),str(ref(s.suppliers,x.supplierId)?.name),str(ref(s.materials,x.materialId)?.name),
 str(x.qtyGrams)+'g',str(x.checkerOne)+' / '+str(x.checkerTwo),x.received?'Recebida':'Pendente'])),true);
 case 'estoque':return panel('Ajuste controlado de materiais',
 form('stock.adjust','Ajustar saldo',[field('materialId','Material','select','',materials),
 field('deltaGrams','Entrada/saída em gramas (ex.: -500)','signed-int','500'),
 field('note','Justificativa','text','Conferência fictícia')],'Registrar ajuste')+
 '<p>Bloqueia saldo negativo. O ajuste exige justificativa e ID de evento.</p>')+
 panel('Saldos disponíveis',table(['Material','Saldo (g)','Custo/kg'],s.materials.map(x=>[
 str(x.name),str(x.stockGrams),fmt(x.priceCentsKg)])))+
 panel('Movimentação de material',table(['ID','Tipo','Material','Variação','Origem'],s.stockLedger.map(x=>[
 str(x.id),str(x.type),str(ref(s.materials,x.materialId)?.name),(x.deltaGrams>0?'+':'')+x.deltaGrams+'g',str(x.sourceId)])),true);
 case 'relatorios':{
 const planning=materialPlannerResult(s);
 const planPanel=planning&&!planning.error?panel('Planejamento teórico de compras por material',
  '<p>'+str(planning.pieces)+' peça(s) simuladas, '+fmt(planning.missingCostCents)+
  ' de falta estimada, sem compras ou baixas automáticas.</p>'+
  table(['Material','Previsto (g)','Faltante (g)','Valor da compra sugerida'],
   planning.materials.map(m=>[str(m.name),str(m.requiredGrams),str(m.missingGrams),
    fmt(m.purchaseCents)])),true):'';
 const advanced=observationPanels(s,'relatorios');if(advanced)return advanced+planPanel;
 const t=api.totals(s);
 return panel('Indicadores vinculados',table(['Indicador','Valor'],Object.entries(t).map(([k,v])=>[
 str(k),k.includes('Payables')||k.includes('Receivables')||k==='passage'||k==='salaryCash'?fmt(v):str(v)])))+
 panel('Como auditar o relatório','<p>Compare pedidos, corte, retorno, expedição e Hub. Exporte o JSON e confira que cada evento tem ID e revisão.</p>'+
 '<div class="actions"><button class="btn" type="button" data-goto="auditor">Executar integridade</button></div>')+
 panel('Pedidos × Financeiro',orderTable(s)+financeTable(s),true);
 }
 case 'auditor':{
 const advanced=observationPanels(s,'auditor');if(advanced)return advanced;
 const check=api.inspect(s),issues=check.problems;
 return panel('Diagnóstico determinístico',
 (check.ok?'<div class="success">Sem inconsistências nas regras simuladas.</div>':
 '<div class="error">Inconsistências detectadas: '+escape(issues.join('; '))+'</div>')+
 table(['Verificação','Estado'],[['Quantidade cortada ≤ pedida',check.ok?'Conforme':'Verificar'],
 ['Estoque nunca negativo',s.materials.every(x=>x.stockGrams>=0)?'Conforme':'Falha'],
 ['IDs dos eventos únicos',new Set(s.log.map(x=>x.commandId)).size===s.log.length?'Conforme':'Falha'],
 ['Provas de duas sessões empresariais','Não realizadas']]))+
 panel('Limites do auditor','<p>O diagnóstico não aplica autocorreção. Sem banco empresarial, não há prova de saúde do sistema atual, monitoramento remoto ou aprendizagem automática.</p>');
 }
 case 'bot':{
 const advanced=observationPanels(s,'bot');if(advanced)return advanced;
 return panel('Recomendações baseadas em regras fixas',
 '<p>O assistente apenas lê indicadores locais para sugerir o próximo passo. Não usa IA treinada, não aprende, não faz ações sozinho.</p>'+
 '<ol class="tips">'+api.tips(s).map(x=>'<li>'+escape(x)+'</li>').join('')+'</ol>')+
 panel('Ações rápidas','<div class="actions"><button class="btn" data-goto="pedidos">Pedidos</button>'+
 '<button class="btn" data-goto="faccoes">Facções</button><button class="btn" data-goto="hub">Hub</button></div>');}
 case 'central':return panel('Registrar e acompanhar ocorrência',
 form('error.add','Nova falha fictícia',[field('message','Descrição do problema')],'Registrar ocorrência')+
 form('error.resolve','Encerrar ocorrência fictícia',[field('id','Ocorrência em aberto','select','',incidents)],'Encerrar ocorrência'))+
 panel('Saúde do laboratório','<p>O monitor avalia apenas este estado local. Não consulta GitHub Actions, logs de produção ou integrações externas.</p>')+
 panel('Ocorrências',table(['ID','Descrição','Estado'],s.errors.map(x=>[
 str(x.id),str(x.message),str(x.status)])),true);
 case 'impressora3d':return panel('Catálogo 3D fictício',
 form('print.add','Novo item de impressão 3D',[field('name','Produto 3D'),
 field('grams','Filamento por unidade (g)','int','35'),field('priceCents','Preço (R$)','money','12,90'),
 field('stock','Estoque de peças','int','3')],'Cadastrar item 3D'))+
 panel('Estoque 3D fictício',table(['Item','Gramas/unidade','Valor','Estoque'],s.prints.map(x=>[
 str(x.name),str(x.grams)+'g',fmt(x.priceCents),str(x.stock)])),true);
 case 'cadastros':return panel('Clientes e fornecedores',
 form('client.add','Novo cliente fictício',[field('name','Nome do cliente')],'Cadastrar cliente')+
 form('supplier.add','Novo fornecedor fictício',[field('name','Nome do fornecedor')],'Cadastrar fornecedor')+
 form('material.add','Novo material fictício',[field('name','Nome do material'),
 field('priceCentsKg','Custo por kg (R$)','money','28,00')],'Cadastrar material'))+
 panel('Cadastros ativos',table(['Tipo','ID','Descrição'],[
 ...s.clients.map(x=>['Cliente',str(x.id),str(x.name)]),
 ...s.suppliers.map(x=>['Fornecedor',str(x.id),str(x.name)]),
 ...s.materials.map(x=>['Material',str(x.id),str(x.name)]),
 ...s.factions.map(x=>['Facção',str(x.id),str(x.name)])]),true);
 default:return panel('Área de demonstração ainda não selecionada',blank);
 }
}
function drawNav(){
 const host=$('module-nav');host.replaceChildren();
 modules.forEach((m,i)=>{
  const b=document.createElement('button');b.type='button';b.dataset.module=m[0];b.setAttribute('aria-current',active===m[0]?'page':'false');
  const num=document.createElement('span');num.className='n';num.textContent=String(i+1).padStart(2,'0');
  b.append(num,document.createTextNode(m[1]));host.append(b);
 });
}
function draw(){
 if(!doc)return;
 const mod=modules[ids.get(active)];$('module-title').textContent=mod[1];$('module-description').textContent=mod[2];
 $('top-revision').textContent='Revisão local '+doc.revision+' · '+doc.log.length+' evento(s) · Sem banco de produção';
 const t=api.totals(doc),metrics=[
 ['Pedidos fictícios',String(t.orders)],['Peças pedidas',String(t.pieces)],['Peças cortadas',String(t.cut)],
 ['Títulos a pagar abertos',fmt(t.openPayables)]];
 $('global-metrics').innerHTML=metrics.map(([label,value])=>'<div class="metric"><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>').join('');
 $('module-content').innerHTML=moduleHtml(doc);
 if(active==='acertos')applySettlementFilters();
 $('audit-trail').innerHTML=doc.log.length?doc.log.slice().reverse().slice(0,28).map(e=>
 '<div class="log-item"><strong>'+escape(e.type)+' · '+escape(e.commandId)+'</strong>'+
 'Revisão '+e.revision+' · '+escape(e.description)+'</div>').join(''):
 '<div class="empty">Sem operações na demonstração. Cadastre um pedido para iniciar.</div>';
 drawNav();
}
function parseCents(value,signed=false){
 let raw=String(value).trim();
 if(signed&&raw.startsWith('-'))return -parseCents(raw.slice(1),false);
 if(signed&&raw.startsWith('+'))raw=raw.slice(1);
 if(!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))
  throw Error('Informe reais com até duas casas decimais, ex.: 2.000,00.');
 const parts=raw.split(',');
 const val=Number(parts[0].replace(/\./g,''))*100+Number((parts[1]||'').padEnd(2,'0'));
 if(!Number.isSafeInteger(val))throw Error('Valor monetário inválido.');
 return val;
}
const NUM=['qty','gramsPerUnit','qtyGrams','grams','stock','P','M','G','GG','usefulGrams','scrapGrams'];
const SIGNED=['deltaGrams'];
const PRICES=['priceCents','unitCents','travetaCents','priceCentsKg','amountCents','salaryCents','passageCents','extrasCents','discountCents'];
function parseData(type,form){
 if(type==='finance.batch.pay'){
  const ids=[...form.querySelectorAll('input[name="financeIds"]:checked')].map(x=>x.value);
  return {financeIds:ids,reference:String(form.elements.namedItem('reference')?.value||''),
   reason:String(form.elements.namedItem('reason')?.value||'')};
 }
 const raw=Object.fromEntries(new FormData(form).entries()),p={};
 for(const [k,v] of Object.entries(raw)){
  if(NUM.includes(k)||k.startsWith('waste_'))p[k]=Number(v);
  else if(SIGNED.includes(k)){if(!/^[+-]?\d+$/.test(v))throw Error('Ajuste em gramas inválido.');p[k]=Number(v)}
  else if(PRICES.includes(k))p[k]=parseCents(v);
  else if(k==='adjustmentCents'||k==='deltaCents')p[k]=parseCents(v,true);
  else if(k==='traveta')p[k]=v==='true';
  else p[k]=String(v);
 }
 if(type==='cut.bom.execute'){
  p.scrapByMaterial={};
  for(const name of Object.keys(p)){
   if(name.startsWith('waste_')){
    p.scrapByMaterial[name.slice(6)]=p[name];
    delete p[name];
   }
  }
 }
 if(['order.add','order.grade.update','cut.plan','cut.plan.update','order.color.grade.set','materials.plan.grade.add'].includes(type)){
  p.grade={};for(const sz of api.sizes){p.grade[sz]=p[sz];delete p[sz]}
 }
 return p;
}
const DB='HLGB_EVOLUCAO_OPERACAO_INTEGRADA_FICTICIA_V1',STORE='documentos',KEY='operacao-ficticia';
function openDB(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))
   request.result.createObjectStore(STORE,{keyPath:'key'})};
  request.onerror=()=>reject(request.error||Error('IndexedDB indisponível.'));
  request.onblocked=()=>reject(Error('Armazenamento bloqueado por outra aba.'));
  request.onsuccess=()=>resolve(request.result);
 });
}
async function transact(edit){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),get=store.get(KEY);
  let output=null,err=null;
  get.onsuccess=()=>{
   try{const previous=get.result?.data||api.initial();
    output=edit(previous);
    if(output?.state)store.put({key:KEY,data:output.state});
    else if(!get.result)store.put({key:KEY,data:previous});
   }catch(e){err=e;tx.abort()}
  };
  get.onerror=()=>{err=get.error};
  tx.oncomplete=()=>resolve(output);
  tx.onabort=()=>reject(err||tx.error||Error('Transação local abortada.'));
  tx.onerror=()=>{if(!err)err=tx.error};
 });
}
async function read(){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(KEY);
  request.onsuccess=()=>resolve(request.result?.data||null);
  request.onerror=()=>reject(request.error||Error('Falha na releitura.'));
 });
}
async function submit(form,type){
 if(busy||!doc)return;
 if(type==='cut.plan.cancel'&&!confirm('Cancelar somente a folha aberta, preservando o histórico?'))return;
 busy=true;
 const button=form.querySelector('button[type=submit]');if(button)button.disabled=true;
 try{
  const payload=parseData(type,form),expectedRevision=doc.revision,
   id='OP-DEMO-'+crypto.randomUUID(),actor='Operador fictício';
  const tx=await transact(previous=>api.apply(previous,{type,payload,commandId:id,actor,expectedRevision}));
  const saved=await read();
  if(!saved||saved.revision!==expectedRevision+1||!saved.log.some(x=>x.commandId===id))
   throw Error('Gravação inconclusiva: não foi encontrada na releitura. Não repetir sem conferir.');
  const integrity=api.inspect(saved);
  if(!integrity.ok)throw Error('Gravação sem integridade comprovada: '+integrity.problems.join('; '));
  doc=saved;draw();
  if(type==='settlement.compensate'&&payload.id){
   const el=document.querySelector('form[data-command="settlement.compensate"] [name="id"]');
   if(el&&[...el.options].some(opt=>opt.value===payload.id))el.value=payload.id;
  }
  status('Salvo e confirmado por releitura local · '+tx.result+' · revisão '+saved.revision+'.');
 }catch(e){
  status(e.message,'error');
  // Não redesenhar o formulário em erro. O rascunho permanece visível.
 }finally{busy=false;if(button&&button.isConnected)button.disabled=false}
}
async function reload(){
 if(busy)return;busy=true;
 try{
  const latest=await read();if(!latest)throw Error('Documento local não encontrado.');
  const checked=api.inspect(latest);
  if(!checked.ok)throw Error('Integridade do documento local não aprovada: '+checked.problems.join('; '));
  doc=latest;draw();status('Documento fictício relido do IndexedDB · revisão '+doc.revision+'.');
 }catch(e){status(e.message,'error')}finally{busy=false}
}
async function reset(){
 if(busy||!confirm('Restaurar APENAS os cadastros e lançamentos fictícios deste navegador? Todos os exercícios desta prévia serão reiniciados.'))return;
 busy=true;
 try{
  const revised=await transact(current=>{
   if(current.revision!==doc.revision)throw Error('CONFLITO: outra aba alterou a prévia. Recarregue primeiro.');
   const next=api.initial();next.revision=current.revision+1;
   const id='OP-DEMO-'+crypto.randomUUID();
   next.revisionProof=id;next.log=[{commandId:id,revision:next.revision,type:'demo.reset',
    actor:'Operador fictício',description:'Dados fictícios restaurados com confirmação'}];
   return {state:next,result:'reset'};
  });
  const saved=await read();if(!saved.log.some(e=>e.commandId===revised.state.revisionProof))throw Error('Restauração não confirmada.');
  doc=saved;active='nucleo';draw();status('Exemplo fictício restaurado. Nenhum dado empresarial foi afetado.');
 }catch(e){status(e.message,'error')}finally{busy=false}
}
function download(name,content,type){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1400);
}
function exportReport(){
 if(!doc)return;const report={schema:'hlgb-evolucao-operacao-integrada-report-v1',environment:'indexeddb-local-fictitious',
  productionApproval:false,parityApproved:false,modulesVisited:19,exportedAt:new Date().toISOString(),
  journey:api.journey(doc,journeyOrderId),
  observability:observerResult(doc),materialPlanning:materialPlannerResult(doc),
  checks:api.inspect(doc),totals:api.totals(doc),data:doc};
 download('HLGB-EVOLUCAO-OPERACAO-INTEGRADA-FICTICIA.json',JSON.stringify(report,null,2),'application/json');
}
function safeCell(x){let s=String(x??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function exportCsv(){
 if(!doc)return;
 const rows=[['Tipo','ID','Descrição','Status','Quantidade/valor'],...doc.orders.map(x=>['Pedido',x.id,
 ref(doc.products,x.productId)?.name||'', 'Enviadas: '+x.shipped,sum(x.grade)]),
 ...doc.finance.map(x=>['Financeiro',x.id,x.description,x.status,x.amountCents]),
 ...(doc.settlementCompensations||[]).map(x=>['Compensação',x.id,x.settlementId+' · '+x.reference,x.status,x.deltaCents]),
 ...doc.purchaseOrders.map(x=>['Compra',x.id,ref(doc.materials,x.materialId)?.name||'',x.received?'Recebido':'Pendente',x.qtyGrams]),
 ...doc.orders.flatMap(o=>(o.colorGrades||[]).map(c=>
  ['Grade por cor',o.id,c.color,'P/M/G/GG',
   api.sizes.map(sz=>sz+': '+c.grade[sz]).join(' · ')])),
 ...(doc.factionAssignments||[]).flatMap(a=>(a.gradeLines||[]).map(g=>
  ['Peças por facção/cor',a.id,a.orderId+' · '+a.factionId+
   ' · '+g.color+' '+g.size,'Enviadas '+g.sent,g.returned])),
 ...(doc.bomCutRuns||[]).map(c=>['Corte BOM concluído',c.id,
  c.orderId+' · '+c.color+' '+c.size+' · '+c.qty+' pç',
  c.commandId,c.totalGrams]),
 ...(doc.bomCutRuns||[]).flatMap(c=>c.materials.map(m=>[
  'Material do corte BOM',c.id,m.materialId+' · '+m.ruleId,
  'Útil '+m.requiredGrams+'g · Lixo '+m.scrapGrams+'g',m.totalGrams])),
 ...(doc.colorCatalog||[]).map(c=>['Paleta de cores',c.id,c.name,c.origin,'']),
 ...(doc.materialRecipeRules||[]).map(r=>['Receita de planejamento',r.id,
  r.productId+' · '+r.materialId+' · '+r.color+' '+r.size,
  r.active?'Atual':'Substituída',r.gramsPerUnit]),
 ...(doc.materialPlanLines||[]).map(l=>['Cenário de produção',l.id,
  l.productId+' · '+l.color+' '+l.size,l.active?'Ativo':'Arquivado',l.qty]),
 ...(materialPlannerResult(doc)?.materials||[]).map(m=>['Necessidade de material',m.materialId,
  m.name+' · faltam '+m.missingGrams+' g','Previsto',m.requiredGrams]),
 ...(doc.factionPartialTransfers||[]).map(t=>['Transferência parcial',t.id,
  t.orderId+' · '+t.fromFactionId+' → '+t.toFactionId+' · '+t.reason,
  t.commandId,t.qty]),
 ...(doc.paymentBatches||[]).map(x=>['Pagamento em lote',x.id,x.reference+' · '+x.reason,x.status,x.totalCents]),
 ...(doc.paymentBatches||[]).flatMap(x=>x.items.map(i=>
  ['Título quitado no lote',i.financeId,x.id+' · '+i.sourceId,i.sourceType,i.amountCents]))];
 download('HLGB-EVOLUCAO-OPERACAO-INTEGRADA-FICTICIA.csv','\uFEFF'+rows.map(r=>r.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
}
function exportShoppingCsv(){
 if(!doc)return;
 const forecast=materialPlannerResult(doc);
 if(!forecast||forecast.error){status('Lista de materiais não disponível: revise a ficha técnica.','error');return}
 const rows=[
  ['LISTA DE MATERIAIS — PLANEJAMENTO FICTÍCIO, SEM COMPRA EFETIVA'],
  ['Material','Necessidade (g)','Saldo simulado (g)','Falta comprar (g)','Preço/kg (R$)','Custo da falta (R$)'],
  ...forecast.materials.map(x=>[x.name,x.requiredGrams,x.availableGrams,x.missingGrams,
   nr(x.priceCentsKg),nr(x.purchaseCents)]),
  [],
  ['DETALHAMENTO POR MODELO, COR E TAMANHO'],
  ['Modelo','SKU','Cor','Tamanho','Peças','Material','Gramas/peça','Necessidade (g)','Versão da receita'],
  ...forecast.detail.map(x=>[x.productName,x.sku,x.color,x.size,x.qty,
   x.materialName,x.gramsPerUnit,x.requiredGrams,x.ruleId])
 ];
 download('HLGB-LAB-LISTA-MATERIAIS-FICTICIA.csv',
  '\uFEFF'+rows.map(row=>row.map(safeCell).join(';')).join('\r\n'),
  'text/csv;charset=utf-8');
 status('Lista de materiais fictícia exportada. Não foi criada compra nem reserva.');
}
function exportObserverCsv(){
 const report=doc&&observerResult(doc);
 if(!report){status('Observabilidade indisponível ou desativada; exporte o JSON básico.','error');return}
 const rows=[['Tipo','Módulo','Revisão/ID','Regra/Operação','Gravidade','Descrição'],
  ...report.findings.map(x=>['Alerta',x.module,x.recordId,x.code,x.severity,x.message+' · '+x.action]),
  ...report.history.map(x=>['Evento',x.module,x.revision,x.type,'',x.commandId+' · '+x.description]),
  ...report.settlementHistory.map(x=>['Histórico do acerto','acertos',x.settlementId,
   x.event,'',x.commandId+' · antes '+x.beforeCents+' depois '+x.afterCents+' · '+x.reason]),
  ...report.modelSummary.map(x=>['Resumo por modelo','produtos',x.productId,
   x.sku,'',x.name+' · pedidas '+x.ordered+' · cortadas '+x.cut+' · expedidas '+x.shipped]),
  ...report.factionSummary.map(x=>['Resumo por facção','faccoes',x.factionId,
   x.name,'',x.settlements+' acertos · pago '+x.paidSettlementsCents]),
  ...report.colorGradeSummary.flatMap(o=>o.byColor.map(c=>
   ['Grade do pedido','pedidos',o.orderId,c.color,
    o.ready?'Completa':'Incompleta',
    api.sizes.map(sz=>sz+': '+c.sizes[sz]).join(' · ')])),
  ...report.bomCutHistory.map(c=>['Corte BOM','corte',c.id,c.orderId,
   c.color+' '+c.size,c.qty+' peças · '+c.totalGrams+'g · '+
    c.estimatedCostCents+' centavos · comando '+c.commandId]),
  ...report.bomCutHistory.flatMap(c=>c.materials.map(m=>[
   'Consumo e lixo BOM','estoque',c.id,m.materialId,m.ruleId,
   'Útil '+m.requiredGrams+'g · lixo '+m.scrapGrams+
    'g · baixa '+m.totalGrams+'g'])),
  ...report.gradeInventory.map(g=>['Saldo por cor e tamanho','faccoes',g.assignmentId,
   g.orderId,g.factionName,g.color+' '+g.size+' · enviado '+g.sent+
    ' · retornado '+g.returned+' · pendente '+g.open+
    ' · acertos '+g.settlementIds.join(' / ')]),
  ...report.factionDispatches.map(x=>['Envio para facção','faccoes',x.id,
   x.orderId,x.factionName,x.productName+' · enviadas '+x.qtySent+
    ' · retornadas '+x.qtyReturned+' · pendentes '+x.qtyOpen+
    ' · acertos '+x.settlementIds.join(' / ')]),
  ...report.factionTransferHistory.map(t=>
   ['Transferência parcial','faccoes',t.id,t.orderId,t.fromName+' → '+t.toName,
    t.qty+' peças · origem '+t.fromBefore+' → '+t.fromAfter+
    ' · destino '+t.toBefore+' → '+t.toAfter+' · '+t.reason+
    ' · comando '+t.commandId]),
  ...report.paymentBatchHistory.map(b=>['Fechamento em lote','hub',b.id,
   b.reference,b.status,b.reason+' · '+b.count+' títulos · '+b.totalCents+' centavos']),
  ...report.paymentBatchHistory.flatMap(b=>b.items.map(i=>
   ['Título vinculado ao lote','hub',i.financeId,b.id,i.sourceType,
    i.sourceId+' · '+i.amountCents+' centavos']))];
 download('HLGB-LAB-OBSERVABILIDADE-V2-FICTICIA.csv',
  '\uFEFF'+rows.map(row=>row.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
 status('Histórico fictício e alertas exportados sem alterações no documento.');
}
function renderCutSheet(planId){
 const plan=(doc.cutPlans||[]).find(p=>p.id===planId);
 if(!plan)throw Error('Folha não localizada nesta revisão.');
 const order=doc.orders.find(o=>o.id===plan.orderId);
 const product=doc.products.find(p=>p.id===order?.productId);
 const material=doc.materials.find(m=>m.id===plan.materialId);
 const client=doc.clients.find(c=>c.id===order?.clientId);
 const grades=api.sizes.map(sz=>'<tr><td>'+escape(sz)+'</td><td>'+plan.grade[sz]+'</td></tr>').join('');
 const status=plan.status==='concluido'?'Concluído e auditado':
  plan.status==='cancelado'?'Cancelado — não utilizar':'Aberto — ainda sem baixa';
 const box=$('cut-print');
 box.innerHTML='<h1>HLGB Evolução · Folha de Corte FICTÍCIA</h1>'+
  '<p><strong>Folha:</strong> '+escape(plan.id)+' · <strong>Pedido:</strong> '+escape(plan.orderId)+
  ' · <strong>Competência de teste:</strong> '+escape(doc.period)+'</p>'+
  '<p><strong>Cliente:</strong> '+escape(client?.name||'')+' · <strong>Modelo:</strong> '+escape(product?.name||'')+
  ' · <strong>SKU:</strong> '+escape(product?.sku||'')+'</p>'+
  '<p><strong>Material:</strong> '+escape(material?.name||'')+
  ' · <strong>Execução:</strong> '+(plan.workMode==='interno'?'Interna':'Externa')+
  ' · <strong>Estado:</strong> '+status+'</p>'+
  '<h2>Grade deste lote</h2><table><thead><tr><th>Tamanho</th><th>Peças</th></tr></thead><tbody>'+grades+
  '<tr><th>Total de peças</th><th>'+sum(plan.grade)+'</th></tr></tbody></table>'+
  '<h2>Pesos conferidos</h2><table><tbody><tr><td>Peso útil teórico</td><td>'+plan.theoreticalGrams+' g</td></tr>'+
  '<tr><td>Peso útil confirmado</td><td>'+(plan.usefulGrams??'Não concluído')+' g</td></tr>'+
  '<tr><td>Desperdício / lixo</td><td>'+(plan.scrapGrams??'Não concluído')+' g</td></tr>'+
  '<tr><td>Peso total debitado do estoque</td><td>'+(
   plan.status==='concluido'?plan.usefulGrams+plan.scrapGrams+' g':'Ainda sem baixa')+
  '</td></tr></tbody></table>'+
  '<p><strong>Cortador 1:</strong> '+escape(plan.cutterOne)+'</p>'+
  '<p><strong>Cortador 2:</strong> '+escape(plan.cutterTwo)+'</p>'+
  '<p><strong>Enfestador:</strong> '+escape(plan.spreader)+'</p>'+
  '<div class="signature"><div>Conferência digitada 1: '+escape(plan.signatureOne||'Pendente')+
  '</div><div>Conferência digitada 2: '+escape(plan.signatureTwo||'Pendente')+'</div></div>'+
  '<p class="print-note">DOCUMENTO DEMONSTRATIVO — não é ordem de produção válida, assinatura eletrônica legal, ou comprovante de estoque. Não contém dados da empresa.</p>';
 return box.textContent;
}
function suggestServicePrice(form){
 const service=form.elements.namedItem('serviceType')?.value;
 const price=form.elements.namedItem('unitCents');
 if(!price)return;
 const productId=form.elements.namedItem('productId')?.value;
 const product=doc.products.find(p=>p.id===productId);
 if(service==='embalagem'){
  const n=(product?.name||'').toLocaleLowerCase('pt-BR');
  price.value=n.includes('calcinha')?'0,15':'0,25';
 }else{
  const fac=doc.factions.find(f=>f.id===form.elements.namedItem('factionId')?.value);
  price.value=nr(fac?.productRates?.[productId]??fac?.unitCents??0);
 }
}
function applySettlementFilters(){
 if(active!=='acertos'||!doc||!$('settlement-filters'))return;
 const f=settlementFilters;
 const normal=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const text=normal(f.query.trim());
 $('settlement-search').value=f.query;
 for(const [id,key] of [['settlement-status','status'],['settlement-faction','faction'],
   ['settlement-service','service'],['settlement-compensation','compensation']]){
  const el=$(id);
  if(el&&[...el.options].some(o=>o.value===f[key]))el.value=f[key];
 }
 const matchesBase=x=>(f.status==='todos'||x.status===f.status)&&
  (f.faction==='todas'||x.factionId===f.faction)&&
  (f.service==='todos'||(x.serviceType||'costura')===f.service);
 const settlementText=x=>{
  const parts=[x.id,x.orderId,x.serviceType,x.status,x.reason,
   ref(doc.factions,x.factionId)?.name,ref(doc.products,x.productId)?.name,
   ref(doc.products,ref(doc.orders,x.orderId)?.productId)?.name,
   ...(x.history||[]).flatMap(h=>[h.reason,h.commandId]),
   ...(x.returns||[]).flatMap(h=>[h.reason,h.commandId])];
  return normal(parts.join(' '));
 };
 const compensationText=c=>normal([c.id,c.settlementId,c.reference,c.reason,c.kind,c.status,
  doc.finance.find(x=>x.sourceId===c.id)?.id,
  ref(doc.factions,c.factionId)?.name].join(' '));
 const comps=doc.settlementCompensations||[];
 const settlements=doc.settlements||[];
 const matchSettlement=x=>matchesBase(x)&&(!text||settlementText(x).includes(text)||
  comps.some(c=>c.settlementId===x.id&&compensationText(c).includes(text)));
 const visibleSet=settlements.map(matchSettlement);
 const visibleComp=comps.map(c=>{
  const original=settlements.find(x=>x.id===c.settlementId);
  return !!original&&matchesBase(original)&&
   (f.compensation==='todos'||c.status===f.compensation)&&
   (!text||compensationText(c).includes(text)||settlementText(original).includes(text));
 });
 for(const [id,flags] of [['settlement-table',visibleSet],['settlement-compensation-table',visibleComp]]){
  const rows=$(id)?.querySelectorAll('tbody tr')||[];
  rows.forEach((row,i)=>{row.hidden=!flags[i]});
 }
 const shown=settlements.filter((_,i)=>visibleSet[i]);
 const shownComp=comps.filter((_,i)=>visibleComp[i]);
 const settlementValue=shown.reduce((total,x)=>total+x.amountCents,0);
 const compValue=shownComp.reduce((total,x)=>total+x.deltaCents,0);
 $('settlement-query-summary').textContent=shown.length+' de '+settlements.length+
  ' acertos · total '+fmt(settlementValue)+' · '+shownComp.length+' de '+comps.length+
  ' compensações · diferença líquida '+(compValue>0?'+':compValue<0?'−':'')+fmt(Math.abs(compValue))+
  ' (valores fictícios; filtro local, sem alterar lançamentos)';
}
document.addEventListener('input',event=>{
 if(event.target.id==='settlement-search'){
  settlementFilters.query=event.target.value;applySettlementFilters();return;
 }
 const filter=event.target.closest('input[data-filter-for]');
 if(!filter)return;
 const target=$(filter.dataset.filterFor);
 if(!target)return;
 const term=filter.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 for(const row of target.querySelectorAll('tbody tr')){
  const text=row.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  row.hidden=!text.includes(term);
 }
});
function renderCompensationSheet(compId){
 const comp=(doc.settlementCompensations||[]).find(x=>x.id===compId);
 if(!comp)throw Error('Compensação não encontrada no documento fictício.');
 const original=doc.settlements.find(x=>x.id===comp.settlementId);
 const originalTitle=doc.finance.find(x=>x.id===comp.originalFinanceId);
 const newTitle=doc.finance.find(x=>x.sourceId===comp.id);
 const faction=doc.factions.find(x=>x.id===comp.factionId);
 if(!original||!originalTitle||!newTitle)throw Error('Vínculos da compensação incompletos.');
 const html='<h1>HLGB Evolução · Conferência de Compensação FICTÍCIA</h1>'+
  '<p><strong>Competência de teste:</strong> '+escape(doc.period)+
  ' · <strong>Revisão local:</strong> '+doc.revision+'</p>'+
  '<p><strong>Facção:</strong> '+escape(faction?.name||'—')+
  ' · <strong>Acerto original:</strong> '+escape(original.id)+'</p>'+
  '<h2>Pagamento original preservado</h2>'+
  '<table><thead><tr><th>Acerto</th><th>Título original</th><th>Valor</th><th>Status</th></tr></thead>'+
  '<tbody><tr><td>'+escape(original.id)+'</td><td>'+escape(originalTitle.id)+'</td>'+
  '<td>'+fmt(original.amountCents)+'</td><td>'+escape(originalTitle.status)+'</td></tr></tbody></table>'+
  '<h2>Correção criada como novo lançamento</h2>'+
  '<table><tbody>'+
  '<tr><th>Compensação</th><td>'+escape(comp.id)+'</td></tr>'+
  '<tr><th>Referência única</th><td>'+escape(comp.reference)+'</td></tr>'+
  '<tr><th>Justificativa</th><td>'+escape(comp.reason)+'</td></tr>'+
  '<tr><th>Diferença</th><td>'+(comp.deltaCents>0?'+':'−')+fmt(Math.abs(comp.deltaCents))+'</td></tr>'+
  '<tr><th>Novo título</th><td>'+escape(newTitle.id)+' · '+escape(newTitle.kind)+
  ' · '+fmt(newTitle.amountCents)+'</td></tr>'+
  '<tr><th>Situação</th><td>'+escape(newTitle.status)+'</td></tr>'+
  '<tr><th>Comando registrado</th><td>'+escape(comp.commandId)+'</td></tr></tbody></table>'+
  '<p class="print-note">DOCUMENTO DE TESTE — dados inventados. Não é comprovante de pagamento bancário, assinatura legal, documento fiscal ou prova de conciliação com a empresa. A impressão ou PDF não envia arquivos ao servidor.</p>';
 $('cut-print').innerHTML=html;
 return $('cut-print').textContent;
}
document.addEventListener('change',event=>{
 if(event.target.matches('#finance-batch-form [name="financeIds"]')){
  updateBatchPreview();return;
 }
 if(event.target.id==='journey-order'){
  journeyOrderId=event.target.value;draw();return;
 }
 if(event.target.matches('[data-settlement-filter]')){
  settlementFilters[event.target.dataset.settlementFilter]=event.target.value;
  applySettlementFilters();return;
 }
 const form=event.target.closest('form[data-command]');
 if(!form)return;
 const type=form.dataset.command;
 const selected=event.target.name;
 if(type==='settlement.add'&&['serviceType','productId','factionId'].includes(selected))suggestServicePrice(form);
 if(type==='order.grade.update'&&selected==='orderId'){
  const order=doc.orders.find(o=>o.id===event.target.value);if(!order)return;
  for(const sz of api.sizes)form.elements.namedItem(sz).value=order.grade[sz];
 }
 if(type==='cut.plan.update'&&selected==='id'){
  const plan=(doc.cutPlans||[]).find(p=>p.id===event.target.value);if(!plan)return;
  for(const sz of api.sizes)form.elements.namedItem(sz).value=plan.grade[sz];
  for(const key of ['workMode','cutterOne','cutterTwo','spreader'])
   form.elements.namedItem(key).value=plan[key];
 }
 if(type==='cut.plan.complete'&&selected==='id'){
  const plan=(doc.cutPlans||[]).find(p=>p.id===event.target.value);if(!plan)return;
  form.elements.namedItem('usefulGrams').value=plan.theoreticalGrams;
  form.elements.namedItem('scrapGrams').value=0;
  form.elements.namedItem('signatureOne').value='';
  form.elements.namedItem('signatureTwo').value='';
 }
});
document.addEventListener('click',e=>{
 if(e.target.closest('#preview-bom-cut')){
  const form=document.querySelector('form[data-command="cut.bom.execute"]');
  try{
   if(!form)throw Error('Formulário de Corte BOM indisponível.');
   const payload=parseData('cut.bom.execute',form);
   const pre=window.HLGBLabBomCutV1?.preview(doc,payload,window.HLGBLabMaterialsPlannerV1);
   if(!pre)throw Error('Simulador BOM indisponível.');
   status((pre.canExecute?'Prévia validada: ':'Falta estoque: ')+
    pre.qty+' peça(s) '+pre.color+' '+pre.size+' · '+
    pre.materials.map(x=>x.materialName+' '+x.totalGrams+
     'g (após '+x.afterGrams+'g)').join(' · ')+
    '. Nenhuma baixa executada.',pre.canExecute?'success':'error');
  }catch(error){status(error.message,'error')}
  return;
 }
 if(e.target.closest('#export-shopping-csv')){exportShoppingCsv();return}
 if(e.target.closest('#preview-finance-batch')){
  const form=$('finance-batch-form');
  try{
   const payload=parseData('finance.batch.pay',form),fn=window.HLGBLabPaymentBatchV1?.preview;
   if(typeof fn!=='function')throw Error('Validador de lote indisponível.');
   const result=fn(doc,payload);
   status('Prévia validada: '+result.count+' título(s), '+fmt(result.totalCents)+
    ', referência '+result.reference+'. Nenhuma baixa executada.');
  }catch(error){status(error.message,'error')}
  return;
 }
 if(e.target.closest('#export-observer-csv')){exportObserverCsv();return}
 if(e.target.closest('[data-toggle-observer]')){
  const registry=window.HLGBLabModules;
  const observer=registry?.list().find(x=>x.id==='observabilidade');
  if(observer){registry.setEnabled('observabilidade',!observer.enabled);draw();
   status('Módulo Observabilidade 2.0 '+(!observer.enabled?'ativado':'desativado')+
    ' somente nesta aba. Funções anteriores continuam disponíveis.');}
  else status('Módulo opcional indisponível. Sistema legado preservado.','error');
  return;
 }
 if(e.target.closest('#settlement-clear-filters')){
  Object.assign(settlementFilters,{query:'',status:'todos',faction:'todas',service:'todos',compensation:'todos'});
  applySettlementFilters();return;
 }
 const comp=e.target.closest('button[data-print-comp]');
 if(comp){try{renderCompensationSheet(comp.dataset.printComp);window.print()}catch(error){status(error.message,'error')}return}
 const print=e.target.closest('button[data-print-plan]');
 if(print){try{renderCutSheet(print.dataset.printPlan);window.print()}catch(error){status(error.message,'error')}return}
 const mod=e.target.closest('button[data-module]');
 if(mod){active=mod.dataset.module;window.location.hash=active;draw();window.scrollTo(0,0);return}
 const goto=e.target.closest('button[data-goto]');
 if(goto){active=goto.dataset.goto;window.location.hash=active;draw();window.scrollTo(0,0)}
});
document.addEventListener('submit',e=>{
 const form=e.target.closest('form[data-command]');if(!form)return;
 e.preventDefault();submit(form,form.dataset.command);
});
window.addEventListener('hashchange',()=>{
 const next=window.location.hash.slice(1);
 if(ids.has(next)&&doc&&next!==active){active=next;draw()}
});
$('export-json').addEventListener('click',exportReport);
$('export-csv').addEventListener('click',exportCsv);
$('refresh').addEventListener('click',reload);
$('reset').addEventListener('click',reset);
(async()=>{
 try{
  db=await openDB();
  await transact(()=>null);
  doc=await read();
  if(!doc)throw Error('Não foi possível iniciar a base fictícia.');
  if(!api.inspect(doc).ok)throw Error('Documento inicial inconsistente.');
  draw();status('Prévia iniciada. Faça suas operações com dados fictícios e confira as revisões.','success');
 }catch(err){
  status('Não foi possível abrir o armazenamento de teste neste navegador: '+err.message+
   '. Experimente pelo Chrome ou por uma URL HTTPS. Nenhum dado real foi acessado.','error');
 }
})();
})();
