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
let active=ids.has(window.location.hash.slice(1))?window.location.hash.slice(1):'nucleo',db=null,doc=null,busy=false;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>escape(String(x??''));
const fmt=api.money;
const nr=c=>(c/100).toFixed(2).replace('.',',');
const sum=g=>Object.values(g).reduce((a,b)=>a+b,0);
function options(items,selected=null){return items.map(([value,label])=>'<option value="'+escape(value)+'"'+(selected===value?' selected':'')+'>'+escape(label)+'</option>').join('')}
function field(name,label,kind='text',value='',list=null){
 let input;
 if(kind==='select')input='<select class="input" name="'+name+'" required>'+options(list||[])+'</select>';
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
function refDocs(s){return '<div class="flow"><span>Pedido</span>→<span>Corte</span>→<span>Facção</span>→<span>Retorno</span>→<span>Acerto</span>→<span>Separação</span>→<span>Expedição</span>→<span>Financeiro</span></div>'+
 '<p>Todos os passos alteram o mesmo estado fictício, guardado no IndexedDB deste navegador. Cada operação tem revisão e histórico.</p>'}
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
 case 'nucleo':return panel('Como testar o fluxo completo',refDocs(s)+
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
 case 'produtos':return panel('Ficha técnica básica e SKU',
 form('product.add','Cadastrar modelo',[field('name','Nome do modelo'),field('sku','SKU único'),
 field('materialId','Material principal','select','',materials),
 field('gramsPerUnit','Consumo por unidade (g)','int','80'),
 field('priceCents','Preço de venda R$','money','39,90')],'Cadastrar modelo'))+
 panel('Referência dos materiais','<p>Este ensaio utiliza um material principal por modelo. A ficha técnica real terá múltiplos componentes, grade, perdas e tamanhos.</p>')+
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
  return panel('Grade editável do pedido',
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
 const pendingTransfer=selector(s.orders.filter(x=>x.allocated>0&&x.returned===0),
  x=>x.id+' · '+(ref(s.factions,x.factionId)?.name||'—')+' · '+x.allocated+' peças');
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
  field('orderId','Pedido','select','',o),field('factionId','Facção','select','',factions),
  field('qty','Quantidade a enviar','int','5')
 ],'Enviar peças')+
 form('faction.reassign','Transferir antes do primeiro retorno',[
  field('orderId','Pedido já enviado, sem retorno','select','',pendingTransfer),
  field('factionId','Nova facção','select','',factions),
  field('reason','Motivo obrigatório','text','Troca de facção no teste')
 ],'Registrar transferência com histórico')+
 form('faction.return','Registrar retorno parcial',[
  field('orderId','Pedido','select','',o),field('qty','Quantidade devolvida','int','3')
 ],'Confirmar retorno e gerar acerto')+
 '<p>A troca fica bloqueada se já existir retorno/acerto. Ela é um exemplo de transferência total antes do primeiro retorno, não uma redistribuição avançada entre várias facções.</p>')+
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
 const open=selector(s.settlements.filter(x=>x.status==='aberto'),
  x=>x.id+' · '+fmt(x.amountCents)+' · '+(ref(s.factions,x.factionId)?.name||'—'));
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
 panel('Ajustar apenas acerto em aberto',
 form('settlement.adjust','Abatimento ou acréscimo rastreado',[
  field('id','Acerto ainda não pago','select','',open),
  field('adjustmentCents','Ajuste total (R$), aceita negativo','signed-money','0,00'),
  field('reason','Motivo','text','Conferência do valor fictício')
 ],'Salvar ajuste e reconciliar Hub')+
 '<p>Se o título vinculado já estiver quitado, não é permitido alterar o pagamento original. A correção pós-pagamento exigirá uma rotina separada de compensação.</p>')+
 panel('Pesquisar acertos e histórico',
 '<div class="field"><label for="settlement-search">Pesquisar acerto, facção ou serviço</label>'+
 '<input id="settlement-search" class="input" type="search" data-filter-for="settlement-table" placeholder="Filtrar toda a lista local"></div>'+
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
  )),true);
 }
 case 'hub':return panel('Lançamento do Hub fictício',
 form('finance.add','Novo título',[field('description','Descrição'),field('kind','Tipo','select','',[['pagar','Pagar'],['receber','Receber']]),
 field('amountCents','Valor em R$','money','100,00')],'Cadastrar título')+
 form('finance.pay','Confirmar lançamento',[field('id','Título aberto','select','',finance)],'Marcar como quitado ficticiamente')+
 '<p class="caption">Esta ação não movimenta dinheiro. Confirme apenas valores fictícios.</p>')+
 panel('Conferência financeira','<p>Os pedidos geram contas a receber. Retornos geram acertos a pagar. Recebimento de compra gera outro título a pagar.</p>')+
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
 case 'compras':return panel('Compra com dupla conferência',
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
 const t=api.totals(s);
 return panel('Indicadores vinculados',table(['Indicador','Valor'],Object.entries(t).map(([k,v])=>[
 str(k),k.includes('Payables')||k.includes('Receivables')||k==='passage'||k==='salaryCash'?fmt(v):str(v)])))+
 panel('Como auditar o relatório','<p>Compare pedidos, corte, retorno, expedição e Hub. Exporte o JSON e confira que cada evento tem ID e revisão.</p>'+
 '<div class="actions"><button class="btn" type="button" data-goto="auditor">Executar integridade</button></div>')+
 panel('Pedidos × Financeiro',orderTable(s)+financeTable(s),true);
 }
 case 'auditor':{
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
 case 'bot':return panel('Recomendações baseadas em regras fixas',
 '<p>O assistente apenas lê indicadores locais para sugerir o próximo passo. Não usa IA treinada, não aprende, não faz ações sozinho.</p>'+
 '<ol class="tips">'+api.tips(s).map(x=>'<li>'+escape(x)+'</li>').join('')+'</ol>')+
 panel('Ações rápidas','<div class="actions"><button class="btn" data-goto="pedidos">Pedidos</button>'+
 '<button class="btn" data-goto="faccoes">Facções</button><button class="btn" data-goto="hub">Hub</button></div>');
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
const PRICES=['priceCents','unitCents','priceCentsKg','amountCents','salaryCents','passageCents','extrasCents','discountCents'];
function parseData(type,form){
 const raw=Object.fromEntries(new FormData(form).entries()),p={};
 for(const [k,v] of Object.entries(raw)){
  if(NUM.includes(k))p[k]=Number(v);
  else if(SIGNED.includes(k)){if(!/^[+-]?\d+$/.test(v))throw Error('Ajuste em gramas inválido.');p[k]=Number(v)}
  else if(PRICES.includes(k))p[k]=parseCents(v);
  else if(k==='adjustmentCents')p[k]=parseCents(v,true);
  else if(k==='traveta')p[k]=v==='true';
  else p[k]=String(v);
 }
 if(['order.add','order.grade.update','cut.plan','cut.plan.update'].includes(type)){
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
  checks:api.inspect(doc),totals:api.totals(doc),data:doc};
 download('HLGB-EVOLUCAO-OPERACAO-INTEGRADA-FICTICIA.json',JSON.stringify(report,null,2),'application/json');
}
function safeCell(x){let s=String(x??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function exportCsv(){
 if(!doc)return;
 const rows=[['Tipo','ID','Descrição','Status','Quantidade/valor'],...doc.orders.map(x=>['Pedido',x.id,
 ref(doc.products,x.productId)?.name||'', 'Enviadas: '+x.shipped,sum(x.grade)]),
 ...doc.finance.map(x=>['Financeiro',x.id,x.description,x.status,x.amountCents]),
 ...doc.purchaseOrders.map(x=>['Compra',x.id,ref(doc.materials,x.materialId)?.name||'',x.received?'Recebido':'Pendente',x.qtyGrams])];
 download('HLGB-EVOLUCAO-OPERACAO-INTEGRADA-FICTICIA.csv','\uFEFF'+rows.map(r=>r.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
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
document.addEventListener('input',event=>{
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
document.addEventListener('change',event=>{
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
