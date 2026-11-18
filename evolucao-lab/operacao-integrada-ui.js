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
 return table(['Título','Tipo','Descrição','Valor','Estado','Comprovante'],s.finance.map(f=>[str(f.id),str(f.kind),
 str(f.description),fmt(f.amountCents),'<span class="chip '+(f.status==='aberto'?'wait':'')+'">'+str(f.status)+'</span>',receiptSummary(s,f.id)]));
}

function receiptPanel(s){
 const service=window.HLGBLabPaymentBatchV1;
 if(!service?.receiptTargets)return panel('Comprovantes','<p>Módulo indisponível.</p>',true);
 const metadata=service.receiptMetadata(s),targets=service.receiptTargets(s);
 const choices=targets.map(t=>{const bill=ref(s.finance,t.targetId),lot=ref(s.paymentBatches||[],t.targetId);
  return [t.targetId,t.targetId+' · '+(lot?.factionNameSnapshot||lot?.reference||bill?.description||'Pagamento')+' · '+fmt(t.amountCents)]});
 return panel('Comprovantes PDF de teste — títulos e fechamentos',
  '<p><strong>Use somente arquivo inteiramente fictício.</strong> O PDF fica neste navegador, não comprova pagamento bancário e não integra exportações gerais. Limite: 256 KiB por PDF e 2 MiB no total.</p>'+
  (choices.length?
  '<form data-command="finance.receipt.attach"><h3>Anexar ou substituir comprovante sem apagar versões</h3><div class="fields">'+
   field('targetId','Título ou fechamento já quitado','select','',choices)+
   '<div class="field"><label>PDF de exercício<input class="input" type="file" name="receiptFile" accept=".pdf,application/pdf" required></label></div>'+
   field('reason','Motivo / identificação da conferência','text','')+
   '<div class="field"><label><input type="checkbox" name="fictitious" required> Confirmo que o PDF não contém dados reais.</label></div>'+
   '</div><p id="receipt-current" class="caption" role="status"></p>'+
   '<button type="submit" class="btn primary">Salvar comprovante fictício</button></form>':
   '<p>Nenhum pagamento a pagar foi quitado neste exercício.</p>')+
   '<div class="field"><label>Buscar comprovantes<input class="input" type="search" data-filter-for="payment-receipt-history" placeholder="CPV, FIN, PAG ou nome do arquivo"></label></div>'+
 '<div id="payment-receipt-history">'+table(['Comprovante','Pagamento','Valor vinculado','Arquivo / tamanho','Versão','Motivo','Consultar'],
    metadata.slice().reverse().map(r=>[str(r.id),str(r.targetId)+' · '+str(r.financeIds.join(', ')),fmt(r.amountCents),
     str(r.fileName)+' · '+Math.ceil(r.size/1024)+' KiB',
     str(r.version)+' · '+(r.current?'Atual':'Anterior'),str(r.reason),
     '<button class="btn" type="button" data-receipt-download="'+str(r.id)+'">Baixar PDF</button>']))+'</div>',true);
}
function receiptSummary(s,financeId){
 const service=window.HLGBLabPaymentBatchV1;
 if(!service?.receiptMetadata)return '—';
 const lot=(s.paymentBatches||[]).find(b=>b.items?.some(i=>i.financeId===financeId));
 const r=service.receiptMetadata(s).find(x=>x.targetId===(lot?.id||financeId)&&x.current);
 return r?'<button type="button" class="btn" data-receipt-download="'+str(r.id)+'">'+str(r.id)+' · v'+str(r.version)+'</button>':'—';
}
function updateReceiptTarget(form){
 const targetId=form.elements.namedItem('targetId')?.value;
 const latest=window.HLGBLabPaymentBatchV1.receiptMetadata(doc).find(x=>x.targetId===targetId&&x.current);
 const el=$('receipt-current');
 if(el)el.textContent=latest?'Atual: '+latest.fileName+' · v'+latest.version+'. A nova versão preservará a anterior.':'Ainda não há comprovante para este pagamento.';
}
async function readReceiptPayload(form){
 const file=form.elements.namedItem('receiptFile')?.files?.[0],service=window.HLGBLabPaymentBatchV1;
 if(!form.elements.namedItem('fictitious')?.checked)throw Error('Confirme que o arquivo é fictício.');
 if(!file||file.size>service.MAX_PDF)throw Error('Selecione um PDF fictício de até 256 KiB.');
 if(file.type&&file.type!=='application/pdf')throw Error('Formato aceito: PDF.');
 const targetId=form.elements.namedItem('targetId')?.value;
 const previousId=service.receiptMetadata(doc).find(x=>x.targetId===targetId&&x.current)?.id||null;
 const reason=form.elements.namedItem('reason')?.value;
 const bytes=new Uint8Array(await file.arrayBuffer());
 let content='';for(let i=0;i<bytes.length;i+=8192)content+=String.fromCharCode(...bytes.slice(i,i+8192));
 return {targetId,previousId,fileName:file.name,contentBase64:btoa(content),reason,fictitious:true};
}
function factionClosingPanel(s){
 const comps=s.settlementCompensations||[];
 const groups=window.HLGBLabPaymentBatchV1?.groups?.(s)||[];
 const groupForms=groups.map(g=>
  '<div class="panel"><h3>'+str(g.name)+' · '+str(g.count)+' título(s)'+
  (g.ready?' · '+fmt(g.totalCents):' · bloqueado')+'</h3>'+
  (g.ready?
   '<form data-command="finance.faction.close" class="faction-close-form">'+
   '<input type="hidden" name="factionId" value="'+str(g.factionId)+'">'+
   g.financeIds.map(id=>'<input type="hidden" name="financeIds" value="'+str(id)+'">').join('')+
   '<input type="hidden" name="expectedTotalCents" value="'+g.totalCents+'">'+
   '<p class="caption">Composição completa da facção, com cada acerto individual preservado.</p>'+
   table(['Título','Acerto / modelo','Serviço','Valor'],g.financeIds.map(id=>{
    const title=s.finance.find(x=>x.id===id),
     settlement=s.settlements.find(x=>x.id===title?.sourceId),
     comp=comps.find(x=>x.id===title?.sourceId),
     original=comp?s.settlements.find(x=>x.id===comp.settlementId):settlement,
     product=ref(s.products,original?.productId||ref(s.orders,original?.orderId)?.productId);
    return [str(id),str((settlement?.id||comp?.id||'—')+' · '+(original?.serviceQuote?.model||product?.name||'Modelo não cadastrado')),
     str(comp?'Compensação':original?.serviceType||'costura'),fmt(title.amountCents)];
   }))+
   '<div class="fields">'+
   field('reference','Referência única do fechamento','text','FAC-'+g.factionId+'-R'+s.revision)+
   '<div class="field"><label>Data da baixa<input type="date" class="input" name="paidDate" value="2026-11-16" required></label></div>'+
   field('reason','Motivo da conferência','text','Acerto consolidado fictício da facção')+'</div>'+
   '<div class="actions"><button class="btn" type="button" data-preview-faction="true">Validar total sem pagar</button>'+
   '<button class="btn primary" type="submit">Fechar todos os acertos desta pessoa</button></div></form>':
   '<p class="error">'+str(g.error)+'</p>')+'</div>').join('');

 return panel('Fechamento automático por facção · sem misturar pessoas',
 '<p>Todos os títulos abertos da mesma pessoa (2 a 50) são conferidos e quitados juntos, com uma referência única. Créditos a receber ficam separados. A composição e o total serão revalidados antes da baixa.</p>'+
 (groupForms||'<div class="empty">Nenhuma facção tem dois ou mais acertos abertos para consolidar.</div>'),true);
}
function groupedAccountPanel(s){
 let report;try{report=window.HLGBLabPaymentBatchV1.groupedAccounts(s);}catch(e){return panel('Extrato consolidado por prestador','<div class="error">'+str(e.message)+'</div>',true);}
 return panel('Extrato consolidado por prestador','<p>Um resumo por pessoa, identificado pelo cadastro, não pelo nome. Todos os lançamentos permanecem individuais no Hub; a soma não cria outra dívida nem compensa créditos automaticamente.</p>'+
 '<div class="metrics">'+[['A pagar',report.totals.payablesCents],['Créditos a receber',report.totals.creditsCents],['Já pagos',report.totals.paidCents],['Créditos recebidos',report.totals.receivedCents]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+fmt(v)+'</strong></div>').join('')+'</div>'+
 (report.totals.blocked?'<p class="error">Há prestadores com divergências. Totais acima são parciais e não autorizam quitação.</p>':'')+
 '<div class="field"><label>Pesquisar prestador<input class="input" type="search" data-filter-for="grouped-accounts" placeholder="Nome ou ID"></label></div>'+
 '<div id="grouped-accounts">'+table(['Prestador','A pagar / linhas','Créditos em aberto','Pago','Créditos recebidos','Conferência'],report.groups.map(g=>[str(g.name)+' · '+str(g.factionId),fmt(g.payablesCents)+' · '+g.payables.length,fmt(g.creditsCents),fmt(g.paidCents),fmt(g.receivedCents),g.complete?(g.ready?'Pronto para conferir':g.payables.length===1?'Baixa individual':'Sem lote elegível'):str(g.issues.join('; '))]))+'</div>'+
 report.groups.map(g=>'<details class="panel"><summary><strong>'+str(g.name)+' · '+str(g.factionId)+'</strong> · '+fmt(g.payablesCents)+' a pagar</summary>'+
 table(['Título / acerto','Modelo / serviço','Peças','Valor','Situação','Fechamento / data'],[...g.payables,...g.credits,...g.paid,...g.received].map(x=>[str(x.financeId)+' · '+str(x.sourceId),str(x.model)+' · '+str(x.service),str(x.qty??'—'),fmt(x.amountCents),str(x.kind)+' · '+str(x.status),str([x.batchId,x.reference,x.paidDate].filter(Boolean).join(' · ')||'—')]))+'</details>').join('')+
 '<button class="btn" type="button" id="grouped-export">Exportar extrato consolidado JSON</button>',true);
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
 return groupedAccountPanel(s)+factionClosingPanel(s)+
 panel('Fechamento manual de títulos · Facções e Acertos fictícios',
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
   batches.map(b=>[str(b.id)+(b.scope==='faccao'?' · '+str(b.factionNameSnapshot):''),str(b.reference),str(b.count),
    fmt(b.totalCents),str(b.status),str(b.reason),
    (b.items||[]).map(i=>str(i.financeId)+' ('+str(i.sourceId)+')').join(' · ')]))+
  '<p class="caption">Lotes são imutáveis no laboratório; comprovantes fictícios são anexados separadamente. Autenticação real permanece pendente.</p>',true);
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

function requestPanels(s){
 const mod=window.HLGBLabPurchaseRequestsV1,planner=window.HLGBLabMaterialsPlannerV1;
 let result,error='';
 try{result=mod?.preview(s,planner)}catch(e){error=String(e.message||e)}
 const requests=s.purchaseRequests||[],drafts=requests.filter(x=>x.status==='rascunho'),
  approved=requests.filter(x=>x.status==='aprovada'),
  cancelable=requests.filter(x=>['rascunho','aprovada'].includes(x.status)),
  issuedNotReceived=requests.filter(x=>x.status==='emitida'&&
   s.purchaseOrders.some(p=>p.id===x.purchaseId&&!p.received&&!p.cancelled)),
  choices=(items)=>selector(items,x=>x.id+' · '+
   (ref(s.materials,x.materialId)?.name||x.materialId)+' · '+x.qtyGrams+'g · '+x.status),
  missing=result?.pendingMaterials||[],
  materials=missing.map(m=>[m.materialId,m.name+' · falta '+m.missingGrams+
   'g · custo '+fmt(m.purchaseCents)]);
 return panel('Requisições de compra · origem e aprovação antes de emitir',
  '<p>O déficit vem do planejamento semanal de produção. Criar requisição apenas registra um rascunho. Aprovação por outra pessoa e emissão são etapas separadas; <b>nenhuma etapa baixa estoque ou gera título financeiro</b>. Só o recebimento da compra faz isso.</p>'+
  (error?'<p class="caption">Previsão indisponível: '+str(error)+'</p>':'')+
  form('purchase.request.create','1. Solicitar material faltante',[
   field('materialId','Material com déficit no cenário','select','',materials),
   field('requester','Solicitante fictício','text','Comprador Exemplo'),
   field('reason','Necessidade da produção','text','Reposição para a programação semanal fictícia')
  ],'Criar rascunho da requisição')+
  form('purchase.request.approve','2. Aprovar com responsável diferente',[
   field('id','Requisição em rascunho','select','',choices(drafts)),
   field('approver','Responsável pela aprovação','text','Supervisora Exemplo'),
   field('reason','Motivo da aprovação','text','Quantidade e necessidade conferidas no laboratório')
  ],'Aprovar requisição fictícia')+
  form('purchase.request.issue','3. Emitir compra após aprovação',[
   field('id','Requisição aprovada','select','',choices(approved)),
   field('supplierId','Fornecedor da compra','select','',selector(s.suppliers,x=>x.name)),
   field('checkerOne','Conferente 1','text','Aline Teste'),
   field('checkerTwo','Conferente 2','text','Beto Exemplo'),
   field('reason','Observação de emissão','text','Compra fictícia autorizada no laboratório')
  ],'Emitir compra sem receber estoque')+
  form('purchase.request.cancel','Cancelar rascunho ou requisição aprovada',[
   field('id','Requisição não emitida','select','',choices(cancelable)),
   field('reason','Justificativa para cancelamento','text','Revisão de programação ou estoque')
  ],'Cancelar e manter histórico')+
  form('purchase.request.cancelIssued','Cancelar formalmente compra emitida ainda não recebida',[
   field('id','Requisição emitida','select','',choices(issuedNotReceived)),
   field('reference','Referência única do cancelamento','text','CANCEL-EXEMPLO-001'),
   field('cancelledBy','Responsável fictício','text','Compradora Exemplo'),
   field('reviewedBy','Conferente independente','text','Supervisora Exemplo'),
   field('reason','Motivo formal da desistência','text','Fornecedor e produção reprogramados na simulação')
  ],'Cancelar emissão sem apagar a compra')+
  '<p class="caption">A requisição emitida só pode ser cancelada se não houver recebimento, entrada de material nem título financeiro. A compra é conservada como cancelada e deixa de aparecer no formulário de recebimento. Nomes digitados não comprovam identidade nem comunicação ao fornecedor.</p>',true)+
 panel('Histórico de requisições e compras vinculadas',
  table(['Requisição','Insumo','Necessidade (g)','Saldo na origem (g)','Falta (g)',
   'Valor estimado','Solicitante / aprovador','Situação','Compra'],
   requests.map(x=>[str(x.id),str(ref(s.materials,x.materialId)?.name||x.materialId),
    str(x.requiredGrams),str(x.availableGrams),str(x.qtyGrams),fmt(x.estimatedCents),
    str(x.requester)+' / '+str(x.approver||'—'),str(x.status),
    str(x.purchaseId||'—')+
    (x.cancelIssueReference?' · ref. '+str(x.cancelIssueReference):'')]))+
  '<p class="caption">Rascunhos, aprovações, cancelamentos, emissões e recebimentos mantêm seus IDs e eventos; exporte JSON/CSV para conferência.</p>',true);
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
const financeFilters={from:'2026-11-01',to:'2026-12-31',category:'todos'};
function financeAnalytics(s){
 const service=window.HLGBLabFinanceV1;
 if(!service)return panel('Hub analítico','<p>Módulo indisponível.</p>',true);
 const filter='<div class="fields"><div class="field"><label>De<input class="input" type="date" data-fin-filter="from" value="'+str(financeFilters.from)+'"></label></div><div class="field"><label>Até<input class="input" type="date" data-fin-filter="to" value="'+str(financeFilters.to)+'"></label></div><div class="field"><label>Categoria<select class="input" data-fin-filter="category">'+options([['todos','Todas'],...service.categories.map(x=>[x,x]),['Vínculo não identificado','Vínculo não identificado']],financeFilters.category)+'</select></label></div></div>';
 let r;try{r=service.report(s,financeFilters)}catch(e){return panel('Hub analítico',filter+'<div class="error">'+str(e.message)+'</div>',true)}
 const metrics=[['Entradas realizadas',r.actual.receber],['Saídas realizadas',r.actual.pagar],['A receber no período',r.forecast.receber],['A pagar no período',r.forecast.pagar],['Movimento líquido realizado',r.actual.net],['Movimento líquido projetado',r.projectedNet],['Vencidos a pagar (total)',r.overdue.pagar],['Vencidos a receber (total)',r.overdue.receber]];
 return panel('Hub Financeiro 2.0 · visão gerencial',filter+'<div class="metrics">'+metrics.map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+fmt(v)+'</strong></div>').join('')+'</div><p>Movimento líquido não é saldo bancário: saldo inicial não informado. Referência fictícia: 17/11/2026. Títulos sem data: '+fmt(r.undated.pagar)+' a pagar / '+fmt(r.undated.receber)+' a receber, fora dos totais datados.</p><p>Contas abertas em todos os períodos: '+fmt(r.open.pagar)+' a pagar / '+fmt(r.open.receber)+' a receber.</p>'+ (r.issues.length?'<div class="error">'+str(r.issues.join('; '))+'</div>':'')+'<button type="button" id="finance-report-export" class="btn">Exportar relatório filtrado CSV</button>',true)+
 panel('Fluxo de caixa por dia',table(['Data','Entradas realizadas','Saídas realizadas','Entradas previstas','Saídas previstas','Líquido previsto + realizado'],r.days.map(x=>[str(x.date),fmt(x.actual.receber),fmt(x.actual.pagar),fmt(x.forecast.receber),fmt(x.forecast.pagar),fmt(x.actual.net+x.forecast.net)])),true)+
 panel('Despesas e receitas por categoria',table(['Categoria','Recebido','Pago','A receber','A pagar'],r.categories.map(x=>[str(x.category),fmt(x.actual.receber),fmt(x.actual.pagar),fmt(x.forecast.receber),fmt(x.forecast.pagar)])),true)+
 panel('Relatório filtrado e conferência',table(['Título / descrição','Categoria','Data','Tipo','Valor','Estado','Conferência'],r.rows.map(x=>[str(x.id)+' · '+str(x.description),str(x.category),str(x.date||'Sem data'),str(x.kind),fmt(x.amountCents),str(x.status),str(x.reconciliation)])),true);
}
function financeRevisionPanels(s){
 const eligible=s.finance.filter(x=>!x.sourceId&&x.status==='aberto'&&!x.reconciliation&&!(s.costAllocations||[]).some(a=>a.financeId===x.id));
 const first=eligible[0],optionsFor=selector(eligible,x=>x.id+' · '+x.description+' · '+fmt(x.amountCents));
 const cats=window.HLGBLabFinanceV1.categories.map(x=>[x,x]);
 return panel('Editar lançamento manual aberto',
 form('finance.revise','Corrigir sem apagar o original',[field('id','Título','select',first?.id||'',optionsFor),
 field('description','Descrição','text',first?.description||''),field('amountCents','Valor','money',first?nr(first.amountCents):'0,00'),
 field('category','Categoria','select',first?window.HLGBLabFinanceV1.classify(first,s):'Outras despesas',cats),
 '<div class="field"><label>Vencimento (opcional)<input class="input" type="date" name="dueDate" value="'+str(first?.dueDate||'')+'"></label></div>',
 field('reason','Motivo da alteração','text','')],'Salvar correção')+
 '<p>Somente título manual aberto sem rateio. Não muda tipo, não reabre pagamento e não apaga registro. Títulos gerados por pedido, compra ou acerto exigem correção na origem.</p>'+
 table(['Título','Antes','Depois','Justificativa','Comando'],s.finance.flatMap(x=>(x.revisions||[]).map(v=>[str(x.id),str(v.before.description)+' · '+fmt(v.before.amountCents)+' · '+str(v.before.category||'—')+' · '+str(v.before.dueDate||'—'),str(v.after.description)+' · '+fmt(v.after.amountCents)+' · '+str(v.after.category||'—')+' · '+str(v.after.dueDate||'—'),str(v.reason),str(v.commandId)]))),true);
}
function fillFinanceRevision(f){const x=doc.finance.find(y=>y.id===f.elements.namedItem('id').value);if(!x)return;for(const [k,v] of Object.entries({description:x.description,amountCents:nr(x.amountCents),category:window.HLGBLabFinanceV1.classify(x,doc),dueDate:x.dueDate||'',reason:''}))f.elements.namedItem(k).value=v;}
function financeControlPanels(s){
 const dated=(id,label)=>'<div class="field"><label>'+str(label)+'<input class="input" type="date" name="'+id+'" value="2026-11-17" required></label></div>';
 const open=selector(s.finance.filter(x=>x.status==='aberto'),x=>x.id+' · '+x.description+' · '+fmt(x.amountCents));
 const paid=selector(s.finance.filter(x=>x.status==='pago'&&!x.reconciliation),x=>x.id+' · '+x.description+' · '+fmt(x.amountCents));
 return panel('Programar vencimento e conciliar manualmente',
 form('finance.schedule','Definir ou corrigir vencimento',[field('id','Título aberto','select','',open),dated('dueDate','Vencimento'),field('reason','Motivo','text','Programação fictícia')],'Salvar vencimento')+
 form('finance.reconcile','Conferir título quitado com extrato fictício',[field('id','Título pago sem conferência','select','',paid),field('reference','Referência única do extrato','text','EXT-TESTE-001'),field('amountCents','Valor do extrato R$','money','100,00'),dated('reconcileDate','Data de conferência')],'Conferir valor')+
 '<p>Conferência manual de valor, não integra banco, não paga novamente e não comprova transferência.</p>');
}


let pcpFilter='todos',pcpDate='2026-11-17';
function pcpPanels(s){
 const service=window.HLGBLabPCPV1;if(!service)return '';
 const filters='<div class="fields"><div class="field"><label>Data de referência<input type="date" class="input" id="pcp-date" value="'+str(pcpDate)+'"></label></div><div class="field"><label>Filtrar situação<select class="input" id="pcp-filter">'+options(['todos','Atrasado','Risco de atraso','No prazo estimado','Sem prazo','Expedido'].map(x=>[x,x]),pcpFilter)+'</select></label></div></div>';
 let r;try{r=service.report(s,{asOf:pcpDate})}catch(e){return panel('PCP avançado',filters+'<div class="error">'+str(e.message)+'</div>',true);}
 const m=[['Peças a expedir',r.remaining],['Pedidos atrasados',r.late],['Risco de atraso',r.risk],['Gargalo estimado',r.bottleneck||'Sem carga']];
 const pending=selector(s.orders.filter(o=>o.shipped<sum(o.grade)),o=>o.id+' · '+(ref(s.products,o.productId)?.name||o.productId));
 return panel('PCP avançado · planejamento da produção',filters+'<div class="metrics">'+m.map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><p>Estimativa conservadora em dias corridos, com capacidade diária global e fila por prioridade e prazo. Soma as etapas em sequência; não representa promessa de entrega, feriados, jornada ou paralelismo real. Capacidades iniciais são fictícias e editáveis.</p><button class="btn" type="button" id="pcp-export">Exportar planejamento CSV</button>',true)+
 panel('Programar pedido e prazo',
 form('pcp.plan','Definir prioridade e prazo',[field('orderId','Pedido','select','',pending),'<div class="field"><label>Prazo combinado<input class="input" type="date" name="dueDate" value="2026-11-30" required></label></div>',field('priority','Prioridade','select','',[['normal','Normal'],['urgente','Urgente'],['alta','Alta'],['baixa','Baixa']]),field('reason','Justificativa','text','Planejamento fictício')],'Salvar planejamento'))+
 panel('Capacidade diária prevista',form('pcp.capacity','Peças por dia (capacidade total)',[...service.stages.map(k=>field(k,service.labels[k],'int',String(r.capacity[k]))),field('reason','Justificativa','text','Ajuste de capacidade fictícia')],'Salvar capacidades'))+
 panel('Mapa de carga e gargalos',table(['Etapa','Fila atual','Trabalho futuro total','Capacidade/dia','Dias estimados de carga'],r.loads.map(x=>[str(x.label),str(x.queue),str(x.required),str(x.capacity),str(x.days)]))+'<p>A fila atual distribui cada peça uma única vez; trabalho futuro conta todas as operações ainda necessárias.</p>',true)+
 panel('Pedidos por prioridade e prazo',table(['Pedido / modelo','Cliente','Prioridade','Prazo','Previsão','A expedir','Situação'],r.rows.filter(x=>pcpFilter==='todos'||x.status===pcpFilter).map(x=>[str(x.id)+' · '+str(x.model),str(x.client),str(x.priority),str(x.due||'Sem prazo'),str(x.estimated||'—'),str(x.remaining),str(x.status)])),true)+
 panel('Acompanhamento de facções',table(['Facção','Enviadas','Retornadas','Pendentes','% retorno acumulado','Pedidos'],r.factions.map(x=>[str(x.name),str(x.sent),str(x.returned),str(x.pending),x.returnPercent===null?'—':str(x.returnPercent)+'%',str(x.orders)]))+'<p>Volume acumulado e taxa de retorno, não produtividade por hora: tempos de execução ainda não registrados.</p>',true);
}


const managementFilters={from:'2026-11-01',to:'2026-11-30',module:'todos',query:'',page:1};
function managementPanels(s){
 const svc=window.HLGBLabManagementV1,finance=window.HLGBLabFinanceV1;if(!svc||!finance)return '';
 const filters='<div class="fields"><div class="field"><label>De<input class="input" type="date" data-mgmt-filter="from" value="'+str(managementFilters.from)+'"></label></div><div class="field"><label>Até<input class="input" type="date" data-mgmt-filter="to" value="'+str(managementFilters.to)+'"></label></div><div class="field"><label>Módulo (histórico)<select class="input" data-mgmt-filter="module">'+options([['todos','Todos'],...modules.map(m=>[m[0],m[1]])],managementFilters.module)+'</select></label></div><div class="field"><label>Buscar no histórico<input class="input" type="search" data-mgmt-filter="query" value="'+str(managementFilters.query)+'" placeholder="ID, operador, operação"></label></div></div>';
 let r,p,f,fp;try{r=svc.report(s,managementFilters);p=svc.report(s,svc.previousPeriod(r.from,r.to));f=finance.report(s,{from:r.from,to:r.to});fp=finance.report(s,{from:p.from,to:p.to});}catch(e){return panel('Central gerencial',filters+'<div class="error">'+str(e.message)+'</div>',true);}
 const kpis=[['Peças cortadas (líquido)',r.totals.cut],['Peças retornadas (líquido)',r.totals.returned],['Peças expedidas (líquido)',r.totals.shipped],['Movimento financeiro realizado',fmt(f.actual.net)]];
 const captions={ordered:'Pedidas',cut:'Cortadas',allocated:'Enviadas',returned:'Retornadas',separated:'Separadas',shipped:'Expedidas'};
 const compare=svc.fields.map(k=>[captions[k],str(r.totals[k]),str(p.totals[k]),str(r.totals[k]-p.totals[k])]);
 const hist=table(['Revisão','Data UTC','Módulo','Comando','Operador','Descrição'],r.history.map(x=>[str(x.revision),str(x.date||'Sem data'),str(x.module),str(x.commandId)+' · '+str(x.type),str(x.actor),str(x.description)]));
 return panel('Central de Relatórios Gerenciais · 2.0',filters+'<div class="metrics">'+kpis.map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><p>Período por registro UTC desta prévia. Quantidades são movimentos líquidos, incluindo devoluções e correções; não são saldos acumulados. '+str(r.undated)+' evento(s) sem data e '+str(r.withoutMetrics)+' sem métricas detalhadas não são reconstruídos nem usados como prova de produção por período. Financeiro usa a data de baixa do título, não a data do evento. Os filtros de módulo e texto se aplicam somente ao histórico.</p><div class="actions"><button type="button" class="btn" id="mgmt-export">Exportar relatório gerencial CSV</button><button type="button" class="btn" id="mgmt-json">Exportar relatório gerencial JSON</button></div>',true)+
 panel('Comparativo com período anterior de mesma duração', '<p>'+str(p.from)+' a '+str(p.to)+' · '+str(p.datedEvents)+' eventos datados anteriores. Sem dados não implica ausência de produção.</p>'+table(['Indicador','Período atual','Período anterior','Diferença'],[...compare,['Recebido',fmt(f.actual.receber),fmt(fp.actual.receber),fmt(f.actual.receber-fp.actual.receber)],['Pago',fmt(f.actual.pagar),fmt(fp.actual.pagar),fmt(f.actual.pagar-fp.actual.pagar)]]),true)+
 panel('Produção por dia',table(['Data','Eventos',...svc.fields.map(k=>captions[k])],r.days.map(x=>[str(x.date),str(x.events),...svc.fields.map(k=>str(x[k]))])),true)+
 panel('Produção por modelo no período',table(['Modelo',...svc.fields.map(k=>captions[k])],r.models.map(x=>[str(x.name),...svc.fields.map(k=>str(x[k]))])),true)+
 panel('Estoque movimentado no período',table(['Material','Entradas (g)','Saídas (g)','Variação (g)'],r.materials.map(x=>[str(x.name),str(x.inGrams),str(x.outGrams),str(x.inGrams-x.outGrams)]))+'<p>Não é custo contábil: preços históricos e rateios ainda não foram homologados.</p>',true)+
 panel('Histórico pesquisável · '+r.historyCount+' eventos',hist+'<div class="actions"><button type="button" class="btn" data-mgmt-page="-1" '+(r.page===1?'disabled':'')+'>Anterior</button><span>Página '+r.page+' de '+r.pages+'</span><button type="button" class="btn" data-mgmt-page="1" '+(r.page===r.pages?'disabled':'')+'>Próxima</button></div><p>Eventos sem data continuam pesquisáveis e aparecem identificados. Exportação inclui todas as páginas do filtro.</p>',true);
}
function exportManagement(json){
 const svc=window.HLGBLabManagementV1;try{const r=svc.report(doc,managementFilters),prev=svc.report(doc,svc.previousPeriod(r.from,r.to)),fin=window.HLGBLabFinanceV1.report(doc,{from:r.from,to:r.to}),finPrev=window.HLGBLabFinanceV1.report(doc,{from:prev.from,to:prev.to});
 if(json){download('HLGB-RELATORIO-GERENCIAL-FICTICIO.json',JSON.stringify({environment:'ficticio',revision:doc.revision,current:r,previous:prev,finance:fin,previousFinance:finPrev},null,2),'application/json');return;}
 const rows=[['Tipo','Data/ID','Descrição','Pedidas','Cortadas','Enviadas','Retornadas','Separadas','Expedidas','Entradas g','Saídas g','Recebido centavos','Pago centavos'],['Total',r.from+' a '+r.to,'Período atual',...svc.fields.map(k=>r.totals[k]),'','',fin.actual.receber,fin.actual.pagar],['Total',prev.from+' a '+prev.to,'Período anterior',...svc.fields.map(k=>prev.totals[k]),'','',finPrev.actual.receber,finPrev.actual.pagar],...r.days.map(x=>['Dia',x.date,'Eventos: '+x.events,...svc.fields.map(k=>x[k])]),...r.models.map(x=>['Modelo',x.productId,x.name,...svc.fields.map(k=>x[k])]),...r.materials.map(x=>['Material',x.materialId,x.name,'','','','','','',x.inGrams,x.outGrams]),...r.historyAll.map(x=>['Histórico',x.date||'Sem data',x.commandId+' · '+x.type+' · '+x.actor+' · '+x.description])];
 download('HLGB-RELATORIO-GERENCIAL-FICTICIO.csv','\uFEFF'+rows.map(x=>x.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');}catch(e){status(e.message,'error');}
}


let auditFilter='todos';
function auditorV3(s){try{return window.HLGBLabAuditorV3?.analyze(s)||null;}catch(e){return null;}}
function auditV3Panels(s){
 const r=auditorV3(s);if(!r)return panel('Auditor 3.0','<div class="error">Diagnóstico indisponível. Nenhuma aprovação pode ser inferida.</div>',true);
 const active=r.findings.filter(x=>x.code!=='AUDITOR_REGRA_FALHOU').map(x=>[x.key,x.key+' · '+x.message]);
 const ready=r.previously.filter(x=>x.state==='aguarda_verificacao'&&r.checks.find(c=>c.id===x.checkId)?.status==='conforme').map(x=>[x.key,x.key]);
 const rows=r.findings.filter(x=>auditFilter==='todos'||x.severity===auditFilter);
 return panel('Auditor 3.0 · diagnóstico e prevenção', '<div class="metrics">'+[['Críticas',r.bySeverity.critica],['Altas',r.bySeverity.alta],['Regras avaliadas',r.checks.length],['Estado',r.status==='sem_alertas_nas_regras_cobertas'?'Sem alertas nas regras cobertas':r.status==='cobertura_parcial'?'Cobertura parcial':'Investigar']].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><p>Revisão '+str(r.revision)+' · '+str(r.legacyEvents)+' eventos sem métricas · '+str(r.undatedEvents)+' sem data. Avalia somente a cópia local fictícia; não verifica disponibilidade do servidor, não corrige automaticamente nem aprova produção.</p><div class="actions"><button type="button" class="btn" id="audit-v3-run">Reexecutar diagnóstico local</button><button type="button" class="btn" id="audit-v3-export">Exportar evidência JSON</button></div>',true)+
 panel('Cobertura por regra',table(['Regra','Resultado','Ocorrências'],r.checks.map(x=>[str(x.label),str(x.status),str(x.findings)])),true)+
 panel('Ocorrências verificáveis','<div class="field"><label>Gravidade<select class="input" id="audit-v3-filter">'+options([['todos','Todas'],['critica','Crítica'],['alta','Alta'],['media','Média'],['informativa','Informativa']],auditFilter)+'</select></label></div>'+table(['Gravidade / regra','Registro','Evidência','Orientação','Investigação'],rows.map(x=>[str(x.severity)+' · '+str(x.code),str(x.recordId),str(x.message)+'<div class="caption">'+str(x.evidence)+'</div>',str(x.action)+(ids.has(x.module)?'<div class="actions"><button class="btn" type="button" data-goto="'+str(x.module)+'">Abrir módulo</button></div>':''),x.review?str(x.review.note)+' · revisão '+str(x.review.revision):'Não registrada'])),true)+
 panel('Investigar ocorrência sem ocultar alerta',form('audit.review','Registrar evidência da investigação',[field('key','Ocorrência ativa','select','',active),field('status','Ação','select','',[['investigado','Registrar investigação']]),field('note','Evidência / observação','text','Conferência fictícia')],'Registrar investigação')+'<p>Registrar uma nota nunca elimina a ocorrência ativa.</p>')+
 panel('Confirmar resolução somente após rechecagem',form('audit.review','Registrar verificação',[field('key','Ocorrência ausente com regra conforme','select','',ready),field('status','Ação','select','',[['verificado','Confirmar verificação']]),field('note','Evidência da rechecagem','text','Regra reexecutada')],'Confirmar verificação')+table(['Ocorrência anterior','Situação','Última evidência'],r.previously.map(x=>[str(x.key),str(x.state),str(x.note)])));
}


function botV3(s){try{const a=auditorV3(s);return a?window.HLGBLabBotV3?.analyze(s,a)||null:null;}catch(e){return null;}}
function botV3Panels(s){
 const r=botV3(s);if(!r)return panel('Bot 3.0','<div class="error">Aprendizado indisponível. Confira o Auditor.</div>',true);
 const active=r.active,choices=active.filter(x=>x.observationId).map(x=>[x.key,x.key+' · '+x.message]),first=active.find(x=>x.observationId);
 const obs=(s.botObservations||[]).slice().reverse().map(x=>[x.commandId,'Revisão '+x.operationalRevision+' · '+x.findings.length+' ocorrências']);
 return panel('Bot 3.0 · aprendizado baseado em evidências','<div class="metrics">'+[['Observações registradas',r.observations],['Erros persistentes',r.persistent],['Regras recorrentes',r.recurring.length],['Feedback útil',r.outcomes.util]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><p>Aprende por comparação de observações de revisões operacionais distintas. A prioridade começa pela gravidade do Auditor, depois pela persistência comprovada. Não é treinamento de IA; não executa pagamentos, alterações nem reparos. Feedback não encerra alertas.</p>'+(r.integrity.length?'<div class="error">'+str(r.integrity.join('; '))+'</div>':'')+(r.canObserve?form('bot.observe','Registrar diagnóstico desta revisão',[],'Registrar observação'):'<p>Nova observação indisponível: mesma revisão operacional, integridade ou diagnóstico incompleto.</p>')+'<div class="actions"><button type="button" class="btn" id="bot-v3-export">Exportar aprendizado JSON</button></div>',true)+
 panel('Fila de recomendações por gravidade e recorrência',table(['Regra / registro','Prioridade','Observações','Evidências / orientação','Feedback'],active.map(x=>[str(x.key),str(x.severity)+' · '+str(x.priorityReason),str(x.observations),str(x.evidence)+'<div class="caption">'+str(x.action)+'</div>'+(ids.has(x.module)?'<button class="btn" type="button" data-goto="'+str(x.module)+'">Conferir módulo</button>':''),str(x.feedback?.outcome||'Sem feedback')])),true)+
 panel('Registrar resultado da recomendação',form('bot.feedback','Avaliar orientação documentada',[field('observationId','Observação que contém a ocorrência','select','',obs),field('key','Ocorrência','select','',choices),field('outcome','Resultado','select','',[['investigando','Investigando'],['util','Útil'],['nao_util','Não útil']]),field('note','Evidência / motivo','text','Conferência fictícia')],'Registrar feedback')+'<p>Escolha uma observação que contenha a ocorrência. O sistema valida o vínculo.</p>')+
 panel('Padrões recorrentes',table(['Regra','Observações distintas','Ocorrências ativas'],r.recurring.map(x=>[str(x.code),str(x.observations),str(x.active)]))+table(['Ocorrência manual','Registros','Abertos'],r.incidentPatterns.map(x=>[str(x.message),str(x.count),str(x.open)])),true)+
 panel('Ocorrências não detectadas atualmente',table(['Registro','Última observação','Estado'],r.inactive.map(x=>[str(x.key),str(x.last),x.verified?'Verificado pelo Auditor':'Ausente agora; resolução não comprovada'])),true)+
 panel('Histórico de aprendizado',table(['Comando','Revisão operacional','Ocorrências'],r.history.slice().reverse().map(x=>[str(x.commandId),str(x.operationalRevision),str(x.findings)]))+table(['Ocorrência','Resultado','Evidência'],r.feedbackHistory.slice().reverse().map(x=>[str(x.key),str(x.outcome),str(x.note)])),true);
}


const assistantFilters={topic:'prioridades',question:'',reference:'',from:'2026-11-01',to:'2026-11-30',asOf:'2026-11-17',stockLimitGrams:5000};
let assistantRequested=false;
function assistantAsk(s){return window.HLGBLabAssistantV3?.ask(s,{audit:window.HLGBLabAuditorV3,bot:window.HLGBLabBotV3,finance:window.HLGBLabFinanceV1,pcp:window.HLGBLabPCPV1,management:window.HLGBLabManagementV1},assistantFilters);}
function assistantPanels(s){
 const svc=window.HLGBLabAssistantV3;if(!svc)return panel('Assistente HLGB 3.0','<p>Consulta indisponível.</p>',true);
 const input=(k,label,type='text')=>'<div class="field"><label>'+str(label)+'<input class="input" type="'+type+'" data-assistant-filter="'+k+'" value="'+str(assistantFilters[k])+'"></label></div>';
 const fields='<div class="fields"><div class="field"><label>Consulta<select class="input" data-assistant-filter="topic">'+options([['auto','Interpretar pergunta'],...svc.topics.map(x=>[x[0],x[1]])],assistantFilters.topic)+'</select></label></div>'+input('question','Pergunta curta (modo interpretar)')+input('reference','ID ou nome do modelo')+input('from','De','date')+input('to','Até','date')+input('asOf','Data de referência','date')+input('stockLimitGrams','Limite de estoque em gramas','number')+'</div>';
 let response='<p>Escolha uma consulta ou escreva uma pergunta curta. Clique em consultar para ler a revisão local atual.</p>';
 if(assistantRequested){try{const r=assistantAsk(s);response='<p>Revisão '+str(r.revision)+' · '+str(r.status)+' · somente leitura</p><div class="metrics">'+r.summary.map(x=>'<div class="metric"><span>'+str(x.label)+'</span><strong>'+str(x.value)+'</strong></div>').join('')+'</div>'+r.warnings.map(x=>'<p class="caption">'+str(x)+'</p>').join('')+table(['Registro','Descrição','Evidência / resultado','Origem'],r.rows.slice(0,100).map(x=>[str(x.id),str(x.label),str(x.detail),ids.has(x.module)?'<button class="btn" type="button" data-goto="'+str(x.module)+'">'+str(x.module)+'</button>':str(x.module)]))+'<p>Fontes: '+str(r.sources.join(', '))+' · '+str(r.rows.length)+' registros; até 100 exibidos. Exportação inclui todos.</p><button type="button" class="btn" id="assistant-export">Exportar resposta JSON</button>';}catch(e){response='<div class="error">'+str(e.message)+'</div>';}}
 return panel('Assistente HLGB 3.0 · consultas de gestão',fields+'<div class="actions"><button type="button" class="btn primary" id="assistant-query">Consultar dados</button></div><p>Consultas determinísticas na base fictícia, sem IA generativa, sem execução de comandos e sem acesso ao banco real. Perguntas desconhecidas não recebem respostas inventadas.</p>'+response,true);
}


function costsResult(s){return window.HLGBLabCostsV1?.report(s);}
function costsPanels(s){
 let r;try{r=costsResult(s);if(!r)throw Error('Módulo indisponível');}catch(e){return panel('Custos e rentabilidade','<div class="error">'+str(e.message)+'</div>',true);}
 const val=x=>x===null?'Não apurado':fmt(x),g=t=>table(['Grupo','Pedidos','Peças','Receita contratada','Custos conhecidos','Pedidos com resultado parcial','Diferença parcial (só estes pedidos)'],t.map(x=>[str(x.name),str(x.orders),str(x.pieces),fmt(x.revenue),fmt(x.knownCost),str(x.complete),x.complete?fmt(x.partialDifference):'Não apurado']));
 const available=r.manual.filter(x=>x.remaining>0).map(x=>[x.id,x.id+' · '+x.description+' · saldo '+fmt(x.remaining)]);
 return panel('Custos e rentabilidade · controle gerencial','<p>Valores acumulados por pedido, não DRE nem lucro líquido. Materiais são valorados pelo preço de referência registrado no corte (não custo médio contábil). Mão de obra usa acertos e compensações vinculados, pagos ou não. Não soma novamente o título financeiro do acerto. Receita contratada não significa recebimento. Margem parcial somente para pedido expedido, com consumo valorado e retorno integral; despesas não vinculadas, impostos e outros custos podem faltar.</p><div class="metrics">'+[['Receita contratada',fmt(r.totals.revenue)],['Custos conhecidos',fmt(r.totals.knownCost)],['Material sem preço histórico',r.totals.unknownGrams+' g'],['Despesas manuais não rateadas',fmt(r.totals.unallocated)]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><button type="button" class="btn" id="cost-export">Exportar custos e evidências JSON</button>',true)+
 panel('Custos por pedido',table(['Pedido / modelo','Expedidas / pedidas','Receita','Material de referência','Mão de obra','Rateio','Custo conhecido','Diferença parcial','Margem parcial','Base atual de material / peça'],r.rows.map(x=>[str(x.id)+' · '+str(x.model),str(x.shipped)+' / '+str(x.pieces),fmt(x.revenue),fmt(x.referenceCents)+(x.unknownGrams?' · '+str(x.unknownGrams)+' g sem preço':''),fmt(x.labor),fmt(x.overhead),fmt(x.knownCost),val(x.difference),x.partialMarginPercent===null?'Não apurada':str(x.partialMarginPercent)+'%',val(x.theoreticalMaterial)]))+'<p>Base atual de material por peça usa somente a ficha simples, não substitui BOM completo nem histórico.</p>',true)+
 panel('Custo agrupado por modelo',g(r.models),true)+panel('Custo agrupado por cliente',g(r.clients),true)+
 panel('Consumo e desperdício por pedido',table(['Pedido','Desperdício medido (g)','Consumo sem medição de desperdício (g)','Material sem preço (g)'],r.rows.map(x=>[str(x.id),str(x.wasteGrams),str(x.unknownWasteGrams),str(x.unknownGrams)])),true)+
 panel('Rateio de despesas manuais',form('cost.allocate','Vincular parte do título ao pedido',[field('financeId','Despesa com saldo','select','',available),field('orderId','Pedido','select','',orderOptions(s)),field('amountCents','Valor deste rateio','money','10,00'),field('reason','Critério / justificativa','text','Rateio fictício')],'Registrar rateio')+'<p>Não gera pagamento nem outro título. Limita a soma de rateios ao valor original. Compras e acertos já vinculados não são elegíveis.</p>'+table(['Título','Categoria','Valor','Rateado','Saldo'],r.manual.map(x=>[str(x.id)+' · '+str(x.description),str(x.category),fmt(x.total),fmt(x.allocated),fmt(x.remaining)])),true)+
 panel('Serviços avulsos sem pedido',table(['Acerto','Modelo','Serviço','Valor com ajustes'],r.loose.map(x=>[str(x.id),str(x.model),str(x.service),fmt(x.amountCents)]))+'<p>Total não apropriado: '+fmt(r.totals.looseCost)+'. Não é distribuído automaticamente entre pedidos.</p>',true);
}


let recoveryIntents=[],recoveryPlan=null;
function recoveryPanels(s){
 const svc=window.HLGBLabRecoveryV1;if(!svc)return panel('Recuperação segura','<p>Módulo indisponível.</p>',true);
 let plan;try{plan=svc.simulate(s,api.inspect,window.HLGBLabAuditorV3.analyze);}catch(e){return panel('Recuperação segura','<div class="error">'+str(e.message)+'</div>',true);}
 recoveryPlan=plan;
 const repairForm=plan.status==='ready'?form('recovery.repair','Aplicar somente reparo simulado de metadado',[field('before','Prova anterior','text',plan.before),field('expected','Prova derivada da trilha','text',plan.expected),field('revision','Revisão simulada','int',String(plan.revision)),field('reason','Justificativa','text','Conferência de trilha')],'Confirmar reparo'):'';
 return panel('Recuperação segura · autocorreção limitada','<p>Simulação de metadado de revisão: '+str(plan.status)+'. Nunca altera pedidos, estoque, pagamentos ou valores para resolver um diagnóstico. Sem reenvio automático de comandos.</p>'+table(['Antes','Prova esperada','Revisão'],[[str(plan.before),str(plan.expected),str(plan.revision)]])+plan.blocked.map(x=>'<p>'+str(x)+'</p>').join('')+repairForm+'<div class="actions"><button type="button" class="btn" id="recovery-check">Reler intenções locais</button><button type="button" class="btn" id="recovery-export">Exportar diagnóstico JSON</button></div>',true)+
 panel('Intenções pendentes de confirmação',table(['Comando','Operação','Revisão esperada','Diagnóstico'],recoveryIntents.map(x=>[str(x.commandId),str(x.type),str(x.expectedRevision),str(svc.classify(s,x,api.inspect).message)]))+'<p>Intenções gravadas antes da operação, sem dados de pagamento ou conteúdo do formulário. Não representam fila de envio; ausência de prova não autoriza repetir.</p>',true)+
 panel('Histórico de reparos autorizados',table(['Comando','Antes','Prova conferida','Motivo'],(s.repairHistory||[]).map(x=>[str(x.commandId),str(x.before),str(x.expected),str(x.reason)])),true);
}
function intentWrite(intent,remove=false){
 return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),key='intent:'+intent.commandId;if(remove)store.delete(key);else store.put({key,intent});tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Registro de intenção não confirmado.'));tx.onerror=()=>reject(tx.error||Error('Falha no registro de intenção.'));});
}
function intentRead(){
 return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result.filter(x=>String(x.key).startsWith('intent:')&&x.intent).map(x=>x.intent));req.onerror=()=>reject(req.error||Error('Falha ao reler intenções.'));});
}


const remoteLab=window.HLGBRemoteLab||null;
function remotePanel(){
 if(!remoteLab)return '';
 const v=remoteLab.info(),q=v.pending;
 return panel('Sincronização integrada · laboratório remoto','<p>'+str(v.actor||'Sessão fictícia')+' · PostgreSQL descartável. Nenhum dado real. '+(q?'Comando pendente: '+str(q.command.commandId)+' · '+str(q.stage):'Sem comando pendente nesta sessão.')+'</p><div class="actions"><button type="button" class="btn" id="remote-check">Conferir servidor / WAL</button><button type="button" class="btn" id="remote-retry" '+(q?.stage==='not_found'?'':'disabled')+'>Reenviar mesmo ID</button><button type="button" class="btn" id="remote-discard" '+(q&&['not_found','conflict','rejected'].includes(q.stage)?'':'disabled')+'>Descartar intenção após revisão</button></div>',true);
}
async function remoteAction(action){
 if(busy||!remoteLab)return;busy=true;
 try{const r=await action();if(r.state){doc=r.state;draw();}else{const banner=document.querySelector('#remote-check');if(banner)banner.closest('section').outerHTML=remotePanel();}status(r.status==='confirmed'?'Salvo e confirmado no PostgreSQL · '+str(r.result):'Sincronização: '+r.status+(r.message?' · '+r.message:''),r.status==='confirmed'?'success':'');}
 catch(e){status(e.message+' · Confira servidor / WAL antes de repetir.','error');}
 finally{busy=false;}
}


function servicePanels(s,area){
 const svc=window.HLGBLabServicesV1;if(!svc)return '';
 const roleOptions=svc.roles.map(x=>[x,x]),categories=svc.categories.map(x=>[x,x]),products=selector(s.products,x=>x.name+' · '+x.sku),factions=selector(s.factions,x=>x.name+' · '+(x.serviceRole||'não classificado')),r=svc.rates(s);
 if(area==='produtos')return panel('Ficha técnica · pontos de travetada',form('service.points.set','Definir pontos por peça',[field('productId','Modelo','select','',products),field('category','Categoria de serviço','select','',categories),field('points','Pontos de travetada por peça','int','0'),field('reason','Justificativa','text','Conferência da ficha')],'Salvar ficha')+table(['Modelo','Categoria','Pontos'],s.products.map(x=>[str(x.name),str(svc.cat(x)),str(x.travetaPoints??'Não cadastrado')])),true);
 if(area==='faccoes')return panel('Cadastro de atividades e tabela de serviços',form('service.profile.set','Classificar prestador',[field('factionId','Prestador','select','',factions),field('serviceRole','Atividade','select','',roleOptions),field('reason','Justificativa','text','Cadastro de atividade')],'Salvar atividade')+form('service.rates.set','Preços em R$ por peça ou por ponto',[...svc.categories.map(k=>field(k,'Embalagem '+k,'money',nr(r[k]||0))),field('pointCents','Travetada por ponto','money',nr(r.pointCents||0)),field('reason','Motivo','text','Tabela fictícia')],'Salvar tabela')+'<p>Preços das camisolas/dolls e calcinhas iniciam como sugestões de laboratório. Revise os valores. Zero não é preço de pagamento, deve ser informado manualmente.</p>'+table(['Prestador','Atividade','Faz travetada'],s.factions.map(x=>[str(x.name),str(x.serviceRole||'Não classificado'),x.traveta?'Sim':'Não'])),true);
 const formHtml=form('settlement.service.add','Novo serviço com preço e pontos calculados',[field('serviceType','Atividade','select','',roleOptions),field('factionId','Prestador classificado','select','',factions),field('productId','Modelo','select','',products.concat([['manual','Modelo não cadastrado (só embalagem)']])),field('manualName','Nome avulso (quando necessário)','text','—'),field('manualCategory','Categoria avulsa','select','',categories),field('qty','Peças','int','20'),field('priceMode','Preço','select','',[['auto','Tabela / ficha'],['manual','Informar preço manual']]),field('unitCents','Preço manual por peça ou ponto','money','0,00'),field('reason','Justificativa','text','Serviço fictício')],'Gerar acerto');
 return panel('Acerto por atividade · travetada por pontos',formHtml+'<p id="service-preview" role="status"></p><p>Travetada paga por ponto × pontos por peça × quantidade; costura de quem não traveta desconta os pontos da ficha. Embalagem usa categoria, inclusive modelo avulso. Acerto preserva tabela, quantidade e valores originais; não depende do preço de venda.</p>'+table(['Acerto','Modelo','Atividade','Peças','Pontos/peça','Tarifa/ponto','Total original'],s.settlements.filter(x=>x.serviceQuote).map(x=>{const q=x.serviceQuote;return [str(x.id),str(q.model),str(q.service),str(q.qty),str(q.pointCount??'—'),q.pointRate===null?'—':fmt(q.pointRate),fmt(q.amount)];})),true);
}
function refreshServicePreview(){const f=document.querySelector('form[data-command="settlement.service.add"]'),node=$('service-preview');if(!f||!node)return;const type=f.elements.namedItem('serviceType').value,select=f.elements.namedItem('factionId'),valid=doc.factions.filter(x=>x.serviceRole===type);const value=select.value;select.innerHTML=options(valid.map(x=>[x.id,x.name]),value);try{const q=window.HLGBLabServicesV1.quote(doc,parseData('settlement.service.add',f));node.textContent=q.model+' · '+q.qty+' peças · bruto '+fmt(q.gross)+' / peça · desconto '+fmt(q.discount)+' / peça · total '+fmt(q.amount);}catch(e){node.textContent=e.message;}}


let quoteQuery={materialId:'MAT-0001',qtyGrams:1000,asOf:'2026-11-17'};
function factionMaterialsPanel(s,area){
 const svc=window.HLGBLabComplementsV1;if(!svc)return '';
 const products=selector(s.products,x=>x.name),materials=selector(s.materials,x=>x.name);
 if(area==='produtos')return panel('Materiais destinados à facção',form('faction.material.scope','Selecionar aviamento da ficha',[field('productId','Modelo','select','',products),field('materialId','Material','select','',materials),field('action','Ação','select','',[['incluir','Incluir no checklist'],['excluir','Retirar dos próximos checklists']]),field('reason','Motivo','text','Conferência da ficha')],'Salvar escopo')+'<p>Cadastre o consumo na receita de materiais. Não inclua tecido já consumido no corte. O checklist é conferência logística e não nova baixa.</p>'+table(['Modelo','Material','Incluir'],(s.factionMaterialScopes||[]).filter(x=>x.active).map(x=>[str(ref(s.products,x.productId)?.name),str(ref(s.materials,x.materialId)?.name),x.include?'Sim':'Não'])),true);
 const rows=(s.factionAssignments||[]).filter(x=>x.qtySent>x.qtyReturned);
 return panel('Materiais das facções — conferir ficha atual',rows.map(a=>{let q;try{q=svc.materialPreview(s,a.id);}catch(e){return '<p>'+str(a.id)+' · '+str(e.message)+'</p>';}
 const old=(s.factionMaterialChecklists||[]).filter(x=>x.assignmentId===a.id).at(-1),same=old?.signature===q.signature;
 return '<details class="panel"><summary>'+str(a.id)+' · '+str(ref(s.factions,a.factionId)?.name)+' · '+q.pending+' pendentes</summary>'+
 table(['Material','Anterior (g)','Ficha atual (g)','Diferença (g)'],[...new Set([...(old?.materials||[]).map(x=>x.materialId),...q.materials.map(x=>x.materialId)])].map(id=>{const before=old?.materials.find(x=>x.materialId===id)?.grams||0,after=q.materials.find(x=>x.materialId===id)?.grams||0;return [str(ref(s.materials,id)?.name),str(before),str(after),str(after-before)];}))+
 (same?'<p>Checklist atual registrado.</p>':form('faction.material.checklist','Registrar versão conferida',['<input type="hidden" name="assignmentId" value="'+str(a.id)+'"><input type="hidden" name="signature" value="'+str(q.signature)+'">',field('reason','Motivo','text','Conferência do envio')],'Registrar checklist'))+
 (same?q.materials.map(m=>form('faction.material.confirm','Conferir '+m.name,['<input type="hidden" name="id" value="'+str(old.id)+'"><input type="hidden" name="materialId" value="'+str(m.materialId)+'">',field('actualGrams','Quantidade conferida (g)','int',String(m.grams)),field('reason','Observação','text','Conferência fictícia')],'Registrar quantidade')).join(''):'')+'</details>';}).join('')+
 '<p>Transferência ou mudança de ficha exige nova conferência. Não altera estoque nem pagamentos.</p>'+table(['Checklist','Envio','Versão anterior','Motivo'],(s.factionMaterialChecklists||[]).map(x=>[str(x.id),str(x.assignmentId),str(x.previousId||'—'),str(x.reason)]))+
 table(['Checklist','Material','Previsto','Conferido','Diferença','Motivo'],(s.factionMaterialChecks||[]).map(x=>[str(x.checklistId),str(ref(s.materials,x.materialId)?.name),str(x.expectedGrams),str(x.actualGrams),str(x.differenceGrams),str(x.reason)]))+
 '<button type="button" class="btn" id="faction-material-export">Exportar comparação CSV</button>',true);
}
function supplierQuotePanel(s){
 const svc=window.HLGBLabComplementsV1;if(!svc)return '';
 const materials=selector(s.materials,x=>x.name),suppliers=selector(s.suppliers,x=>x.name);
 let out;try{out=svc.compare(s,quoteQuery);}catch(e){out={rows:[],best:null,error:e.message};}
 return panel('Comprador inteligente · comparar fornecedores',form('supplier.quote.add','Registrar cotação',[field('supplierId','Fornecedor','select','',suppliers),field('materialId','Material','select','',materials),field('qtyGrams','Quantidade (g)','int','1000'),field('priceCentsKg','Preço por kg (R$)','money','28,00'),field('freightCents','Frete total (R$)','money','0,00'),'<div class="field"><label>Data da cotação<input class="input" name="quotedAt" type="date" value="2026-11-17" required></label></div><div class="field"><label>Validade<input class="input" name="validUntil" type="date" value="2026-11-30" required></label></div>',field('reference','Referência','text','COT-TESTE'),field('reason','Observação','text','Cotação fictícia')],'Salvar cotação')+
 '<div class="fields"><div class="field"><label>Material comparado<select class="input" id="quote-material">'+options(materials,quoteQuery.materialId)+'</select></label></div><div class="field"><label>Quantidade exata (g)<input class="input" type="number" id="quote-qty" value="'+str(quoteQuery.qtyGrams)+'"></label></div><div class="field"><label>Data de referência<input type="date" class="input" id="quote-date" value="'+str(quoteQuery.asOf)+'"></label></div></div><button class="btn" type="button" id="quote-compare">Comparar</button>'+
 (out.error?'<p class="error">'+str(out.error)+'</p>':'')+table(['Fornecedor','R$/kg','Frete','Total','Validade','Conferência'],out.rows.map(q=>[str(q.supplierName),fmt(q.priceCentsKg),fmt(q.freightCents),fmt(q.totalCents),str(q.validUntil),q.id===out.best?'Menor total válido':q.valid?'Válida':'Vencida']))+
 '<p>Compara mesma quantidade e material, incluindo frete. Não presume equivalência nem cria compras automaticamente.</p>'+
 table(['Fornecedor','A pagar aberto','Pago'],s.suppliers.map(f=>{const titles=s.finance.filter(t=>t.kind==='pagar'&&s.purchaseOrders.some(p=>p.supplierId===f.id&&p.id===t.sourceId));return [str(f.name),fmt(titles.filter(t=>t.status==='aberto').reduce((n,t)=>n+t.amountCents,0)),fmt(titles.filter(t=>t.status==='pago').reduce((n,t)=>n+t.amountCents,0))];})),true);
}
async function readPrintPhoto(form){
 const file=form.elements.namedItem('photoFile').files?.[0],id=form.elements.namedItem('productId').value;
 if(!form.elements.namedItem('fictitious').checked||!file||!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024)throw Error('Selecione JPEG/PNG fictício de até 5 MiB.');
 const url=URL.createObjectURL(file);try{
 const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Imagem inválida'));img.src=url;});
 if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>25000000)throw Error('Imagem excede limite de dimensões.');
 const canvas=document.createElement('canvas'),ratio=Math.min(1,600/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));const c=canvas.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0,canvas.width,canvas.height);
 let contentBase64=canvas.toDataURL('image/jpeg',0.72).split(',')[1];if(!window.HLGBLabComplementsV1.imageOK(contentBase64))contentBase64=canvas.toDataURL('image/jpeg',0.45).split(',')[1];
 if(!window.HLGBLabComplementsV1.imageOK(contentBase64))throw Error('Foto comprimida ultrapassa limite.');
 return {productId:id,contentBase64,previousId:(doc.printPhotos||[]).filter(x=>x.productId===id).at(-1)?.id||null,reason:form.elements.namedItem('reason').value,fictitious:true};
 }finally{URL.revokeObjectURL(url);}
}
function photoPanel(s){
 const svc=window.HLGBLabComplementsV1;if(!svc)return '';const choices=selector(s.prints,x=>x.name);
 return panel('Catálogo 3D · fotos de exercício','<form data-command="print.photo.attach"><h3>Adicionar ou substituir foto</h3><div class="fields">'+field('productId','Produto','select','',choices)+'<div class="field"><label>JPEG ou PNG<input class="input" type="file" name="photoFile" accept="image/jpeg,image/png" required></label></div>'+field('reason','Motivo','text','Foto de teste')+'<label><input type="checkbox" name="fictitious" required> Confirmo imagem fictícia sem dados pessoais.</label></div><button class="btn primary" type="submit">Salvar foto</button></form>'+
 '<div class="metrics">'+s.prints.map(x=>{const photo=(s.printPhotos||[]).filter(y=>y.productId===x.id).at(-1);return '<div class="metric">'+(photo?'<img alt="'+str(x.name)+'" src="data:image/jpeg;base64,'+str(photo.contentBase64)+'" style="width:100%;max-width:180px;aspect-ratio:1;object-fit:contain;border-radius:8px">':'<p>Sem foto</p>')+'<strong>'+str(x.name)+'</strong><span>'+fmt(x.priceCents)+' · '+x.stock+' peças</span></div>';}).join('')+'</div>'+
 table(['Foto','Produto','Versão','Motivo'],svc.photoMetadata(s).map(x=>[str(x.id),str(ref(s.prints,x.productId)?.name),x.current?'Atual':'Anterior',str(x.reason)]))+'<p>Fotos de laboratório comprimidas, histórico preservado; imagens reais exigirão armazenamento privado.</p>',true);
}

function moduleHtml(s){
 const o=orderOptions(s),openPlans=(s.cutPlans||[]).filter(p=>p.status==='aberto'),
  planOptions=selector(openPlans,p=>p.id+' · '+p.orderId+' · '+sum(p.grade)+' peças'),
  defaultOrder=s.orders[0],defaultPlan=openPlans[0],
  materials=selector(s.materials,m=>m.name+' · '+m.stockGrams+'g'),clients=selector(s.clients,x=>x.name),
 products=selector(s.products,x=>x.name+' · '+x.sku),factions=selector(s.factions,x=>x.name+' · '+fmt(x.unitCents)+'/peça'),
 suppliers=selector(s.suppliers,x=>x.name),settlements=selector(s.settlements,x=>x.id+' · '+fmt(x.amountCents)+' · '+x.status),
 purchases=selector(s.purchaseOrders.filter(x=>!x.received&&!x.cancelled),
  x=>x.id+' · '+x.qtyGrams+'g'),
 finance=selector(s.finance.filter(x=>x.status==='aberto'),x=>x.id+' · '+fmt(x.amountCents)+' · '+x.description),
 employees=selector(s.employees,x=>x.name),incidents=selector(s.errors.filter(x=>x.status==='aberto'),x=>x.id+' · '+x.message);
 switch(active){
 case 'nucleo':return panel('Assistente HLGB 3.0','<p>Consulte prioridades, produção, financeiro, estoque e auditoria com evidências.</p><button type="button" class="btn" data-goto="bot">Abrir Assistente</button>')+panel('Módulos opcionais com desativação segura',
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
 case 'produtos':return factionMaterialsPanel(s,'produtos')+servicePanels(s,'produtos')+materialRecipePanels(s)+panel('Ficha técnica básica e SKU',
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
 case 'producao':return pcpPanels(s)+panel('Acompanhamento PCP',refDocs(s)+
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
 return factionMaterialsPanel(s,'faccoes')+servicePanels(s,'faccoes')+panel('Preço específico das peças que já estão na facção',
   form('faction.assignment.rate.set','Negociar mão de obra por envio pendente',[
    field('assignmentId','Envio / pedido / facção','select','',selector(rows.filter(x=>x.qtySent>x.qtyReturned),x=>
      x.id+' · '+x.orderId+' · '+(ref(s.factions,x.factionId)?.name||'—')+
      ' · '+(x.qtySent-x.qtyReturned)+' pendentes')),
    field('unitCents','Preço bruto por peça (R$)','money','0,00'),
    field('travetaCents','Desconto de travetada por peça (R$)','money','0,00'),
    field('reason','Justificativa da negociação','text','')
   ],'Salvar tarifa deste envio')+
   '<p id="assignment-rate-preview" class="caption" role="status"></p>'+
   '<p>A tarifa vale apenas para os próximos retornos deste envio, incluindo devoluções e retornos por cor/tamanho. Não altera o preço geral do modelo nem os acertos existentes. A troca integral de facção desativa o acordo da origem, conservando o histórico.</p>'+
   table(['Envio','Facção','Bruto/peça','Travetada/peça','Peças pendentes na negociação','Justificativa'],
    rows.flatMap(x=>(x.rateAgreementHistory||[]).map(h=>[
     str(x.id),str(ref(s.factions,h.factionId)?.name||h.factionId),
     h.mode==='reset'?'Acordo encerrado':fmt(h.gross),h.mode==='reset'?'—':fmt(h.discount),
     str(h.pendingQty??'—'),str(h.reason)
    ]))),true)+
  panel('Cadastro e regras por facção',
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
 return groupedAccountPanel(s)+factionClosingPanel(s)+servicePanels(s,'acertos')+panel('Serviços avulsos e embalagem',
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
 panel('Corrigir facção e mão de obra de acerto em aberto',
   form('settlement.revise','Alterar sem criar outro pagamento',[
    field('id','Acerto em aberto','select','',allOpen),
    field('factionId','Facção / embaladeira do acerto','select','',factions),
    field('unitCents','Preço bruto por peça (R$)','money','0,00'),
    field('travetaCents','Desconto de travetada por peça (R$)','money','0,00'),
    field('reason','Justificativa da correção','text','')
   ],'Salvar correção e atualizar o mesmo título')+
   '<p id="settlement-revise-preview" class="caption" role="status"></p>'+
   '<p>Em serviço avulso, pode corrigir a pessoa e o preço. Em retorno vinculado ao pedido, o preço pode ser corrigido, mas a facção física não pode ser trocada aqui. O título existente é atualizado, nunca duplicado. Acertos pagos exigem compensação separada.</p>',true)+
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
 ['Acerto','Facção / serviço','Modelo','Peças','Bruto/peça','Travetada/peça','Ajuste total','Total','Situação','Comprovante'],
 s.settlements.map(x=>[
  str(x.id)+'<div class="caption">'+str(x.orderId||'Avulso')+'</div>',
  str(ref(s.factions,x.factionId)?.name)+'<div class="caption">'+str(x.serviceType||'costura')+'</div>',
  str(ref(s.products,x.productId)?.name||ref(s.products,ref(s.orders,x.orderId)?.productId)?.name||'—'),
  str(x.qty),fmt(x.listUnitCents??x.unitCents),fmt(x.travetaCents||0),
  fmt(x.adjustmentCents),fmt(x.amountCents),
  '<span class="chip '+(x.status==='aberto'?'wait':'')+'">'+str(x.status)+'</span>',
  receiptSummary(s,s.finance.find(f=>f.sourceId===x.id&&f.kind==='pagar')?.id)
 ]))+'</div>'+
 '<h3>Alterações de valores</h3>'+
 table(['Acerto','Evento','Antes','Depois','Motivo'],s.settlements.flatMap(x=>
  (x.history||[]).map(e=>[str(x.id),str(e.commandId),fmt(e.beforeCents),fmt(e.afterCents),str(e.reason)])
  ))+
 '<h3>Histórico de correções de facção e mão de obra</h3>'+
  table(['Acerto / título','Facção anterior → nova','Preço bruto anterior → novo','Travetada anterior → nova','Total anterior → novo','Motivo'],
   s.settlements.flatMap(x=>(x.rateHistory||[]).map(h=>[
    str(x.id)+' · '+str(h.financeId),str(h.fromFactionName)+' → '+str(h.toFactionName),
    fmt(h.before.listUnitCents)+' → '+fmt(h.after.listUnitCents),
    fmt(h.before.travetaCents)+' → '+fmt(h.after.travetaCents),
    fmt(h.before.amountCents)+' → '+fmt(h.after.amountCents),str(h.reason)
   ])))+
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
 case 'hub':return financeAnalytics(s)+panel('Lançamento do Hub fictício',
 form('finance.add','Novo título',[field('description','Descrição'),field('kind','Tipo','select','',[['pagar','Pagar'],['receber','Receber']]),
 field('amountCents','Valor em R$','money','100,00'),field('category','Categoria','select','',window.HLGBLabFinanceV1.categories.map(x=>[x,x])), '<div class="field"><label>Vencimento (opcional)<input class="input" type="date" name="dueDate"></label></div>'],'Cadastrar título')+
 form('finance.pay','Confirmar lançamento',[field('id','Título aberto','select','',finance),'<div class="field"><label>Data da baixa<input class="input" type="date" name="paidDate" value="2026-11-16" required></label></div>'],'Marcar como quitado ficticiamente')+
 '<p class="caption">Esta ação não movimenta dinheiro. Confirme apenas valores fictícios.</p>')+
 financeRevisionPanels(s)+financeControlPanels(s)+financialBatchPanel(s)+receiptPanel(s)+
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
 case 'compras':{
 const devolucoes=(s.purchaseReturns||[]),elegiveis=s.purchaseOrders.filter(x=>
  x.received&&!x.cancelled&&!x.returnId&&x.purchaseRequestId&&
  s.purchaseRequests.some(r=>r.id===x.purchaseRequestId&&r.status==='recebida')&&
  s.finance.some(f=>f.sourceId===x.id&&f.kind==='pagar'&&f.status==='aberto')&&
  s.materials.some(m=>m.id===x.materialId&&m.stockGrams>=x.qtyGrams));
 return supplierQuotePanel(s)+materialsPlanningPanels(s)+requestPanels(s)+panel('Compra com dupla conferência',
 form('purchase.add','Planejar compra',[field('supplierId','Fornecedor','select','',suppliers),
 field('materialId','Material','select','',materials),
 field('qtyGrams','Quantidade (g)','int','3000'),
 field('checkerOne','Conferente 1','text','Aline Teste'),
 field('checkerTwo','Conferente 2','text','Beto Exemplo')],'Registrar compra')+
 form('purchase.receive','Receber compra',[field('id','Compra pendente','select','',purchases)],'Conferir e dar entrada no estoque'))+
 panel('Controle de compras','<p>O recebimento atualiza o estoque e cria uma única conta a pagar. Não é possível receber duas vezes o mesmo pedido de compras. Compras avulsas antigas continuam disponíveis e não são transformadas em requisições sem autorização.</p>')+
 panel('Devolução integral após recebimento — fluxo formal de teste',
  '<p>Uma compra recebida não pode ser simplesmente cancelada. Nesta prévia, a devolução integral exige estoque disponível, documento original e título a pagar aberto. Ela cria uma saída separada de estoque e um crédito a receber do fornecedor, sem apagar a entrada e o título originais. Devolução parcial e compras já pagas continuam bloqueadas.</p>'+
  form('purchase.return.full','Registrar devolução total de uma compra recebida',[
   field('id','Compra recebida e apta à devolução','select','',selector(elegiveis,x=>
    x.id+' · '+str(ref(s.materials,x.materialId)?.name||x.materialId)+
    ' · '+x.qtyGrams+'g · '+fmt(Math.ceil(x.qtyGrams*x.priceCentsKg/1000)))),
   field('reference','Referência única do protocolo','text','DEV-EXEMPLO-001'),
   field('returnedBy','Responsável fictício pela devolução','text','Almoxarife Exemplo'),
   field('reviewedBy','Conferente independente','text','Supervisora Exemplo'),
   field('reason','Justificativa documentada','text','Material recebido com divergência na inspeção fictícia')
  ],'Registrar devolução com novo crédito')+
  '<p class="caption">Não libera movimentação bancária, Nota Fiscal, aprovação autenticada ou devolução física real. Se o estoque já foi consumido, a operação é recusada sem nenhum estorno.</p>',true)+
 panel('Histórico de devoluções e créditos fictícios',
  table(['Devolução','Compra original','Material','Quantidade devolvida','Crédito','Referência','Conferência','Situação'],
   devolucoes.map(x=>[
    str(x.id),str(x.purchaseId),str(ref(s.materials,x.materialId)?.name||x.materialId),
    str(x.qtyGrams)+' g',fmt(x.amountCents),str(x.reference),
    str(x.returnedBy)+' / '+str(x.reviewedBy),str(x.status)+' · '+str(x.creditFinanceId)
   ]))+
  '<p class="caption">Os movimentos de estoque, a conta original e o crédito de devolução continuam nos relatórios e no JSON de evidências.</p>',true)+
 panel('Compras do laboratório',table(['Compra','Fornecedor','Material','Quantidade','Conferentes','Status'],s.purchaseOrders.map(x=>[
 str(x.id),str(ref(s.suppliers,x.supplierId)?.name),str(ref(s.materials,x.materialId)?.name),
 str(x.qtyGrams)+'g',str(x.checkerOne)+' / '+str(x.checkerTwo),
  (x.cancelled?'Cancelada':x.returnId?'Devolvida integralmente':x.received?'Recebida':'Pendente')+
  (x.purchaseRequestId?' · '+str(x.purchaseRequestId):'') ])),true);
 }
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
 const requestReport=panel('Histórico de requisições, aprovações e compras vinculadas',
  '<p>Solicitações locais fictícias. A aprovação exige um nome diferente do solicitante; não representa login nem permissão empresarial.</p>'+
  table(['Requisição','Material','Falta na criação (g)','Valor estimado',
   'Solicitante','Aprovador','Status','Compra vinculada'],
   (s.purchaseRequests||[]).map(r=>[
    str(r.id),str(ref(s.materials,r.materialId)?.name||r.materialId),
    str(r.qtyGrams),fmt(r.estimatedCents),str(r.requester),
    str(r.approver||'—'),str(r.status),str(r.purchaseId||'—')])),true);
 const returnsReport=panel('Devoluções formais de compras recebidas',
  table(['Documento','Compra','Fornecedor','Material','Devolvido','Crédito a receber','Protocolo','Motivo'],
   (s.purchaseReturns||[]).map(x=>[
    str(x.id),str(x.purchaseId),str(ref(s.suppliers,x.supplierId)?.name||x.supplierId),
    str(ref(s.materials,x.materialId)?.name||x.materialId),
    str(x.qtyGrams)+' g',fmt(x.amountCents),str(x.reference),str(x.reason)
   ])),true);
 const advanced=observationPanels(s,'relatorios');if(advanced)return costsPanels(s)+managementPanels(s)+advanced+planPanel+requestReport+returnsReport;
 const t=api.totals(s);
 return costsPanels(s)+managementPanels(s)+panel('Indicadores vinculados',table(['Indicador','Valor'],Object.entries(t).map(([k,v])=>[
 str(k),k.includes('Payables')||k.includes('Receivables')||k==='passage'||k==='salaryCash'?fmt(v):str(v)])))+
 panel('Como auditar o relatório','<p>Compare pedidos, corte, retorno, expedição e Hub. Exporte o JSON e confira que cada evento tem ID e revisão.</p>'+
 '<div class="actions"><button class="btn" type="button" data-goto="auditor">Executar integridade</button></div>')+
 panel('Pedidos × Financeiro',orderTable(s)+financeTable(s),true)+requestReport+returnsReport;
 }
 case 'auditor':{
 const advanced=observationPanels(s,'auditor');if(advanced)return recoveryPanels(s)+auditV3Panels(s)+advanced;
 const check=api.inspect(s),issues=check.problems;
 return recoveryPanels(s)+auditV3Panels(s)+panel('Diagnóstico determinístico',
 (check.ok?'<div class="success">Sem inconsistências nas regras simuladas.</div>':
 '<div class="error">Inconsistências detectadas: '+escape(issues.join('; '))+'</div>')+
 table(['Verificação','Estado'],[['Quantidade cortada ≤ pedida',check.ok?'Conforme':'Verificar'],
 ['Estoque nunca negativo',s.materials.every(x=>x.stockGrams>=0)?'Conforme':'Falha'],
 ['IDs dos eventos únicos',new Set(s.log.map(x=>x.commandId)).size===s.log.length?'Conforme':'Falha'],
 ['Provas de duas sessões empresariais','Não realizadas']]))+
 panel('Limites do auditor','<p>O diagnóstico não aplica autocorreção. Sem banco empresarial, não há prova de saúde do sistema atual, monitoramento remoto ou aprendizagem automática.</p>');
 }
 case 'bot':{
 const advanced=observationPanels(s,'bot');if(advanced)return assistantPanels(s)+botV3Panels(s)+advanced;
 return assistantPanels(s)+botV3Panels(s)+panel('Recomendações baseadas em regras fixas',
 '<p>O assistente apenas lê indicadores locais para sugerir o próximo passo. Não usa IA treinada, não aprende, não faz ações sozinho.</p>'+
 '<ol class="tips">'+api.tips(s).map(x=>'<li>'+escape(x)+'</li>').join('')+'</ol>')+
 panel('Ações rápidas','<div class="actions"><button class="btn" data-goto="pedidos">Pedidos</button>'+
 '<button class="btn" data-goto="faccoes">Facções</button><button class="btn" data-goto="hub">Hub</button></div>');}
 case 'central':return panel('Auditor 3.0 e ocorrências','<p>Confira as verificações automáticas e as evidências sem encerrar alertas ativos.</p><button class="btn" type="button" data-goto="auditor">Abrir Auditor 3.0</button>')+panel('Registrar e acompanhar ocorrência',
 form('error.add','Nova falha fictícia',[field('message','Descrição do problema')],'Registrar ocorrência')+
 form('error.resolve','Encerrar ocorrência fictícia',[field('id','Ocorrência em aberto','select','',incidents)],'Encerrar ocorrência'))+
 panel('Saúde do laboratório','<p>O monitor avalia apenas este estado local. Não consulta GitHub Actions, logs de produção ou integrações externas.</p>')+
 panel('Ocorrências',table(['ID','Descrição','Estado'],s.errors.map(x=>[
 str(x.id),str(x.message),str(x.status)])),true);
 case 'impressora3d':return photoPanel(s)+panel('Catálogo 3D fictício',
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
const searchState={page:1,selected:null,snapshot:null,index:[],results:[]};
function renderGlobalSearch(){
 const service=window.HLGBLabGlobalSearchV1,host=$('global-search-results'),input=$('global-search-query'),filter=$('global-search-module');
 if(!host||!input||!filter||!doc)return;
 if(!service){host.textContent='Pesquisa global temporariamente indisponível. Os módulos continuam acessíveis.';return}
 try{
  if(searchState.snapshot!==doc){searchState.index=service.build(doc);searchState.snapshot=doc}
  if(filter.options.length===1)for(const [id,label] of Object.entries(service.labels))filter.add(new Option(label,id));
  if(!input.value.trim()){host.innerHTML='<p class="caption">Digite um termo ou código para localizar registros, inclusive finalizados.</p>';searchState.results=[];return}
  const r=service.search(searchState.index,input.value,{module:filter.value,page:searchState.page,limit:15});
  if(r.page>Math.max(1,Math.ceil(r.total/r.limit))){searchState.page=1;renderGlobalSearch();return}
  searchState.results=r.items;
  host.innerHTML='<p class="caption" id="global-search-count">'+r.total+' resultado(s) · somente leitura · revisão '+doc.revision+'</p>'+
  (r.items.length?r.items.map((x,i)=>'<div class="search-result"><div><strong>'+str(x.title)+'</strong>'+
    '<p>'+str(x.id)+' · '+str(service.labels[x.module])+' · '+str(x.status)+'</p><p>'+str(x.detail)+'</p></div>'+
    '<button class="btn" type="button" data-search-open="'+i+'">Localizar registro</button></div>').join(''):'<p>Nenhum registro encontrado nesta área.</p>')+
  (r.total>r.limit?'<div class="actions"><button type="button" class="btn" data-search-page="-1" '+(r.page===1?'disabled':'')+'>Anterior</button><span>Página '+r.page+' de '+Math.ceil(r.total/r.limit)+'</span><button type="button" class="btn" data-search-page="1" '+(r.page*r.limit>=r.total?'disabled':'')+'>Próxima</button></div>':'');
 }catch(e){host.textContent='Não foi possível consultar a busca. Os módulos originais continuam disponíveis.'}
}
function openGlobalResult(index){
 const result=searchState.results[index];
 if(!result||!ids.has(result.module)||busy)return;
 searchState.selected=result.key;
 if(result.orderId)journeyOrderId=result.orderId;
 active=result.module;window.location.hash=active;
 if(active==='acertos'){Object.assign(settlementFilters,{query:result.type==='acerto'?result.id:'',status:'todos',faction:'todas',service:'todos',compensation:'todos'})}
 draw();renderGlobalDetail();
}
function renderGlobalDetail(){
 const el=$('global-search-detail');if(!el)return;
 const row=searchState.index.find(x=>x.key===searchState.selected);
 if(!row){el.hidden=true;el.innerHTML='';return}
 el.hidden=false;el.className='search-detail';
 el.innerHTML='<h3>'+str(row.title)+' · '+str(row.id)+'</h3><p>'+str(row.status)+' · '+str(row.detail)+'</p>'+
  (row.orderId?'<p>Pedido vinculado: '+str(row.orderId)+'</p>':'')+
  '<p class="caption">Área aberta: '+str(window.HLGBLabGlobalSearchV1.labels[row.module])+'. Nenhum lançamento alterado.</p>'+
  '<button type="button" class="btn" id="global-search-close">Fechar localização</button>';
 // Destacar somente célula que contenha o ID exato; não selecionar formulários nem gravar.
 const candidates=[...$('module-content').querySelectorAll('tbody tr')];
 const target=candidates.find(tr=>[...tr.querySelectorAll('td')].some(td=>td.textContent.trim().split(/\s+|·/)[0]===row.id)&&!tr.hidden);
 if(target){target.classList.add('search-hit');target.scrollIntoView({block:'nearest'});}
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
 $('top-revision').textContent=(remoteLab?'Revisão servidor ':'Revisão local ')+doc.revision+' · '+doc.log.length+' evento(s) · Sem banco de produção';
 const t=api.totals(doc),metrics=[
 ['Pedidos fictícios',String(t.orders)],['Peças pedidas',String(t.pieces)],['Peças cortadas',String(t.cut)],
 ['Títulos a pagar abertos',fmt(t.openPayables)]];
 $('global-metrics').innerHTML=metrics.map(([label,value])=>'<div class="metric"><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>').join('');
 $('module-content').innerHTML=remotePanel()+moduleHtml(doc);
 if(active==='acertos'){refreshServicePreview();applySettlementFilters();const f=document.querySelector('form[data-command="settlement.revise"]');if(f)fillSettlementRevision(f);}
 if(active==='faccoes'){const f=document.querySelector('form[data-command="faction.assignment.rate.set"]');if(f)fillAssignmentRate(f);}
 if(active==='hub'){const f=document.querySelector('form[data-command="finance.receipt.attach"]');if(f)updateReceiptTarget(f);const g=document.querySelector('form[data-command="finance.revise"]');if(g)fillFinanceRevision(g);}
 $('audit-trail').innerHTML=doc.log.length?doc.log.slice().reverse().slice(0,28).map(e=>
 '<div class="log-item"><strong>'+escape(e.type)+' · '+escape(e.commandId)+'</strong>'+
 'Revisão '+e.revision+' · '+escape(e.description)+'</div>').join(''):
 '<div class="empty">Sem operações na demonstração. Cadastre um pedido para iniciar.</div>';
 drawNav();renderGlobalSearch();renderGlobalDetail();
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
const NUM=['actualGrams','points','revision','corte','envio','costura','separacao','expedicao','qty','gramsPerUnit','qtyGrams','grams','stock','P','M','G','GG','usefulGrams','scrapGrams'];
const SIGNED=['deltaGrams'];
const PRICES=['freightCents','camisola','doll','calcinha','outros','pointCents','priceCents','unitCents','travetaCents','priceCentsKg','amountCents','salaryCents','passageCents','extrasCents','discountCents'];
function parseData(type,form){
 if(type==='finance.faction.close'){
  return {factionId:String(form.querySelector('[name="factionId"]')?.value||''),
   financeIds:[...form.querySelectorAll('input[name="financeIds"]')].map(x=>x.value),
   paidDate:String(form.elements.namedItem('paidDate')?.value||''),expectedTotalCents:Number(form.elements.namedItem('expectedTotalCents')?.value),
   reference:String(form.querySelector('[name="reference"]')?.value||''),
   reason:String(form.querySelector('[name="reason"]')?.value||'')};
 }
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
 if(type==='finance.faction.close'&&!confirm('Confirmar somente a baixa fictícia de todos os títulos e o total conferido deste prestador?'))return;
 if(type==='recovery.repair'&&!confirm('Aplicar exclusivamente o reparo de metadado simulado?'))return;
 if(type==='cut.plan.cancel'&&!confirm('Cancelar somente a folha aberta, preservando o histórico?'))return;
 busy=true;
 const button=form.querySelector('button[type=submit]');if(button)button.disabled=true;
 try{
  const expectedRevision=doc.revision;
  if(remoteLab){
   const payload=type==='finance.receipt.attach'?await readReceiptPayload(form):type==='print.photo.attach'?await readPrintPhoto(form):parseData(type,form);
   const result=await remoteLab.submit(type,payload,expectedRevision);
   if(result.status!=='confirmed'){const banner=document.querySelector('#remote-check');if(banner){banner.closest('section').outerHTML=remotePanel();}throw Error('Servidor: '+result.status+' · '+(result.message||'Revise a intenção sem repetir.'));}
   doc=result.state;draw();status('Salvo e confirmado no PostgreSQL · '+result.result+' · revisão '+doc.revision+'.');return;
  }
  const pending=await intentRead();
  if(pending.length){const current=await read(),svc=window.HLGBLabRecoveryV1;for(const item of pending){const verdict=svc.classify(current,item,api.inspect);if(verdict.status==='confirmed'){await intentWrite(item,true);}else{recoveryIntents=pending;throw Error('Existe intenção anterior sem confirmação. Abra Auditor > Recuperação segura, releia e exporte a evidência antes de repetir.');}}}
  const payload=type==='finance.receipt.attach'?await readReceiptPayload(form):type==='print.photo.attach'?await readPrintPhoto(form):parseData(type,form),
   id='OP-DEMO-'+crypto.randomUUID(),actor='Operador fictício';
  const intent={commandId:id,type,expectedRevision,recordedAt:new Date().toISOString()};
  await intentWrite(intent);
  let tx;try{tx=await transact(previous=>api.apply(previous,{type,payload,commandId:id,actor,expectedRevision,recordedAt:intent.recordedAt}));}
  catch(e){try{await intentWrite(intent,true);}catch(ignore){}throw e;}
  const saved=await read();
  if(!saved||saved.revision!==expectedRevision+1||!saved.log.some(x=>x.commandId===id))
   throw Error('Gravação inconclusiva: não foi encontrada na releitura. Não repetir sem conferir.');
  const integrity=api.inspect(saved);
  if(!integrity.ok)throw Error('Gravação sem integridade comprovada: '+integrity.problems.join('; '));
  doc=saved;try{await intentWrite(intent,true);recoveryIntents=await intentRead();}catch(ignore){}draw();
  if(type==='settlement.compensate'&&payload.id){
   const el=document.querySelector('form[data-command="settlement.compensate"] [name="id"]');
   if(el&&[...el.options].some(opt=>opt.value===payload.id))el.value=payload.id;
  }
  status('Salvo e confirmado por releitura local · '+tx.result+' · revisão '+saved.revision+'.');
 }catch(e){
  if(remoteLab){const banner=document.querySelector('#remote-check');if(banner)banner.closest('section').outerHTML=remotePanel();}
  status(e.message,'error');
  // Não redesenhar o formulário em erro. O rascunho permanece visível.
 }finally{busy=false;if(button&&button.isConnected)button.disabled=false}
}
async function reload(){
 if(remoteLab)return remoteAction(()=>remoteLab.reconcile());
 if(busy)return;busy=true;
 try{
  const latest=await read();if(!latest)throw Error('Documento local não encontrado.');
  const checked=api.inspect(latest);
  if(!checked.ok)throw Error('Integridade do documento local não aprovada: '+checked.problems.join('; '));
  doc=latest;try{recoveryIntents=await intentRead();}catch(ignore){}draw();status('Documento fictício relido do IndexedDB · revisão '+doc.revision+'.');
 }catch(e){status(e.message,'error')}finally{busy=false}
}
async function reset(){
 if(remoteLab){status('Restauração indisponível no banco remoto compartilhado.','error');return;}
 if(busy||!confirm('Restaurar APENAS os cadastros e lançamentos fictícios deste navegador? Todos os exercícios desta prévia serão reiniciados.'))return;
 busy=true;
 try{
  if((await intentRead()).length)throw Error('Existem intenções pendentes. Não restaurar o exercício antes da conferência.');
  const revised=await transact(current=>{
   if(current.revision!==doc.revision)throw Error('CONFLITO: outra aba alterou a prévia. Recarregue primeiro.');
   const next=api.initial();next.revision=current.revision+1;
   const id='OP-DEMO-'+crypto.randomUUID();
   next.revisionProof=id;next.log=[{commandId:id,revision:next.revision,type:'demo.reset',
    actor:'Operador fictício',description:'Dados fictícios restaurados com confirmação'}];
   return {state:next,result:'reset'};
  });
  const saved=await read();if(!saved.log.some(e=>e.commandId===revised.state.revisionProof))throw Error('Restauração não confirmada.');
  doc=saved;recoveryIntents=await intentRead();active='nucleo';draw();status('Exemplo fictício restaurado. Nenhum dado empresarial foi afetado.');
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
  observability:observerResult(doc),auditorV3:auditorV3(doc),botV3:botV3(doc),materialPlanning:materialPlannerResult(doc),
  checks:api.inspect(doc),totals:api.totals(doc),data:{...doc,printPhotos:window.HLGBLabComplementsV1.photoMetadata(doc),paymentReceipts:window.HLGBLabPaymentBatchV1.receiptMetadata(doc)},receiptBinaryExported:false};
 download('HLGB-EVOLUCAO-OPERACAO-INTEGRADA-FICTICIA.json',JSON.stringify(report,null,2),'application/json');
}
function safeCell(x){let s=String(x??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function exportCsv(){
 if(!doc)return;
 const rows=[['Tipo','ID','Descrição','Status','Quantidade/valor'],...doc.orders.map(x=>['Pedido',x.id,
 ref(doc.products,x.productId)?.name||'', 'Enviadas: '+x.shipped,sum(x.grade)]),
 ...doc.finance.map(x=>['Financeiro',x.id,x.description,x.status,x.amountCents]),
 ...window.HLGBLabPaymentBatchV1.receiptMetadata(doc).map(x=>['Comprovante fictício',x.id,x.targetId+' · versão '+x.version,x.current?'Atual':'Anterior',x.amountCents]),
 ...(doc.settlementCompensations||[]).map(x=>['Compensação',x.id,x.settlementId+' · '+x.reference,x.status,x.deltaCents]),
 ...(doc.purchaseReturns||[]).map(x=>['Devolução integral',x.id,
  x.purchaseId+' · '+x.reference+' · '+x.reason,x.status,x.qtyGrams]),
 ...doc.purchaseOrders.map(x=>['Compra',x.id,ref(doc.materials,x.materialId)?.name||'',
  (x.cancelled?'Cancelada':x.received?'Recebido':'Pendente')+
   (x.purchaseRequestId?' · '+x.purchaseRequestId:''),x.qtyGrams]),
 ...(doc.purchaseRequests||[]).map(x=>['Requisição',x.id,
  (ref(doc.materials,x.materialId)?.name||x.materialId)+' · '+x.reason,
  x.status+' · '+(x.purchaseId||'sem compra')+
   (x.cancelIssueReference?' · cancelamento '+x.cancelIssueReference:''),x.qtyGrams]),
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
 ...(doc.paymentBatches||[]).map(x=>['Pagamento em lote',x.id,
  (x.scope==='faccao'?'Facção '+x.factionNameSnapshot+' · ':'')+x.reference+' · '+x.reason,
  x.status,x.totalCents]),
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
  ...(report.paymentReceiptHistory||[]).map(x=>['Comprovante fictício','hub',x.id,x.targetId,x.current?'Atual':'Anterior','Versão '+x.version+' · '+x.fileName+' · '+x.amountCents+' centavos']),
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
  ...report.purchaseRequestHistory.map(r=>[
   'Requisição de compra','compras',r.id,r.materialName,r.status,
   r.qtyGrams+'g · '+r.estimatedCents+' centavos · compra '+(r.purchaseId||'—')+
    ' · solicitante '+r.requester+' · aprovador '+(r.approver||'—')]),
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
function fillAssignmentRate(form){
 const row=doc?.factionAssignments?.find(x=>x.id===form.elements.namedItem('assignmentId')?.value);
 const order=row&&ref(doc.orders,row.orderId),fac=row&&ref(doc.factions,row.factionId),
  product=order&&ref(doc.products,order.productId);
 if(!row||!fac||!product)return;
 const rate=window.HLGBLabFactionRoutingV1.resolveRate(row,fac,product,doc);
 form.elements.namedItem('unitCents').value=nr(rate.gross);
 form.elements.namedItem('travetaCents').value=nr(rate.traveta);
 const preview=$('assignment-rate-preview');
 if(preview)preview.textContent=(row.qtySent-row.qtyReturned)+' peças pendentes · tarifa líquida atual '+fmt(rate.unit)+' por peça.';
}
function fillSettlementRevision(form){
 const x=doc?.settlements.find(a=>a.id===form.elements.namedItem('id')?.value);
 if(!x)return;
 form.elements.namedItem('factionId').value=x.factionId;
 form.elements.namedItem('unitCents').value=nr(x.listUnitCents??x.unitCents);
 form.elements.namedItem('travetaCents').value=nr(x.travetaCents||0);
 const only=x.kind!=='avulso'||!!x.orderId||!!x.assignmentId||!!x.gradeTracked;
 for(const option of form.elements.namedItem('factionId').options)
  option.disabled=only&&option.value!==x.factionId;
 previewSettlementRevision(form);
}
function previewSettlementRevision(form){
 const el=$('settlement-revise-preview'),x=doc?.settlements.find(a=>a.id===form.elements.namedItem('id')?.value);
 if(!el||!x)return;
 try{
  const gross=parseCents(form.elements.namedItem('unitCents').value),
   discount=parseCents(form.elements.namedItem('travetaCents').value),
   total=x.qty*(gross-discount)+(x.adjustmentCents||0);
  el.textContent=gross>discount&&total>0?
   x.qty+' peças · total atual '+fmt(x.amountCents)+' → novo total '+fmt(total)+' · mantém ajuste de '+fmt(x.adjustmentCents||0):
   'Informe valores válidos: o líquido e o total precisam ser positivos.';
 }catch(_){el.textContent='Informe preço e desconto válidos.'}
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
   ...(x.rateHistory||[]).flatMap(h=>[h.reason,h.commandId,h.fromFactionName,h.toFactionName,h.financeId]),
   ...(x.returns||[]).flatMap(h=>[h.reason,h.commandId]),
    ...window.HLGBLabPaymentBatchV1.receiptMetadata(doc).filter(r=>r.financeIds.includes(doc.finance.find(f=>f.sourceId===x.id&&f.kind==='pagar')?.id)).flatMap(r=>[r.id,r.fileName,r.targetId,r.reason])];
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
 if(event.target.id==='global-search-query'){searchState.page=1;searchState.selected=null;renderGlobalSearch();renderGlobalDetail();return;}
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
 if(event.target.closest('form[data-command="settlement.service.add"]')){refreshServicePreview();return;}
 const revisionForm=event.target.closest('form[data-command="finance.revise"]');if(revisionForm&&event.target.name==='id'){fillFinanceRevision(revisionForm);return;}
 if(event.target.matches('[data-assistant-filter]')){const k=event.target.dataset.assistantFilter;assistantFilters[k]=k==='stockLimitGrams'?Number(event.target.value):event.target.value;assistantRequested=false;return;}
 if(event.target.id==='audit-v3-filter'){auditFilter=event.target.value;draw();return;}
 if(event.target.matches('[data-mgmt-filter]')){managementFilters[event.target.dataset.mgmtFilter]=event.target.value;managementFilters.page=1;draw();return;}
 if(event.target.id==='pcp-date'){pcpDate=event.target.value;draw();return;}
 if(event.target.id==='pcp-filter'){pcpFilter=event.target.value;draw();return;}
 if(event.target.matches('[data-fin-filter]')){financeFilters[event.target.dataset.finFilter]=event.target.value;draw();return;}
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
 if(type==='finance.receipt.attach'&&selected==='targetId')updateReceiptTarget(form);
 if(type==='settlement.revise'&&selected==='id')fillSettlementRevision(form);
 if(type==='faction.assignment.rate.set'&&selected==='assignmentId')fillAssignmentRate(form);
 if(type==='settlement.revise'&&['unitCents','travetaCents','factionId'].includes(selected))previewSettlementRevision(form);
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
document.addEventListener('click',async e=>{
 if(e.target.closest('#remote-check')){await remoteAction(()=>remoteLab.reconcile());return;}
 if(e.target.closest('#remote-retry')){await remoteAction(()=>remoteLab.retry());return;}
 if(e.target.closest('#remote-discard')){if(confirm('Descartar somente a intenção local revisada, sem excluir registros do servidor?'))await remoteAction(()=>remoteLab.discard());return;}
 if(e.target.closest('#recovery-check')){if(remoteLab){await remoteAction(()=>remoteLab.reconcile());return;}if(busy)return;busy=true;try{recoveryIntents=await intentRead();const latest=await read();if(latest&&api.inspect(latest).ok)doc=latest;draw();status('Intenções locais relidas · '+recoveryIntents.length+' pendentes.');}catch(err){status(err.message,'error');}finally{busy=false;}return;}
 if(e.target.closest('#recovery-export')){try{download('HLGB-RECUPERACAO-FICTICIO.json',JSON.stringify({plan:recoveryPlan,intents:recoveryIntents.map(x=>({...x,diagnosis:window.HLGBLabRecoveryV1.classify(doc,x,api.inspect)})),history:doc.repairHistory||[]},null,2),'application/json');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#quote-compare')){quoteQuery={materialId:$('quote-material').value,qtyGrams:Number($('quote-qty').value),asOf:$('quote-date').value};draw();return;}
 if(e.target.closest('#faction-material-export')){const rows=[['Checklist','Envio','Material','Previsto (g)','Conferido (g)','Diferença (g)'],...(doc.factionMaterialChecklists||[]).flatMap(c=>c.materials.map(m=>{const x=(doc.factionMaterialChecks||[]).filter(y=>y.checklistId===c.id&&y.materialId===m.materialId).at(-1);return [c.id,c.assignmentId,m.name,m.grams,x?.actualGrams??'Não conferido',x?.differenceGrams??''];}))];download('HLGB-MATERIAIS-FACCOES-FICTICIO.csv','\uFEFF'+rows.map(r=>r.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');return;}
 if(e.target.closest('#grouped-export')){try{download('HLGB-ACERTOS-CONSOLIDADOS-FICTICIOS.json',JSON.stringify(window.HLGBLabPaymentBatchV1.groupedAccounts(doc),null,2),'application/json');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#cost-export')){try{download('HLGB-CUSTOS-FICTICIO.json',JSON.stringify(costsResult(doc),null,2),'application/json');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#assistant-query')){assistantRequested=true;draw();return;}
 if(e.target.closest('#assistant-export')){if(!assistantRequested){status('Faça uma nova consulta antes de exportar.','error');return;}try{download('HLGB-ASSISTENTE-V3-FICTICIO.json',JSON.stringify(assistantAsk(doc),null,2),'application/json');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#bot-v3-export')){const r=botV3(doc);if(!r){status('Aprendizado indisponível.','error');return;}download('HLGB-BOT-V3-FICTICIO.json',JSON.stringify(r,null,2),'application/json');return;}
 if(e.target.closest('#audit-v3-run')){draw();status('Diagnóstico local reexecutado. Confira as regras e evidências.');return;}
 if(e.target.closest('#audit-v3-export')){const r=auditorV3(doc);if(!r){status('Diagnóstico indisponível.','error');return;}download('HLGB-AUDITOR-V3-FICTICIO.json',JSON.stringify(r,null,2),'application/json');return;}
 if(e.target.closest('#mgmt-export')){exportManagement(false);return;}
 if(e.target.closest('#mgmt-json')){exportManagement(true);return;}
 const mgmtPage=e.target.closest('[data-mgmt-page]');if(mgmtPage){managementFilters.page=Math.max(1,managementFilters.page+Number(mgmtPage.dataset.mgmtPage));draw();return;}
 if(e.target.closest('#pcp-export')){try{const r=window.HLGBLabPCPV1.report(doc,{asOf:pcpDate});const rows=[['Pedido','Modelo','Cliente','Prioridade','Prazo','Previsão','A expedir','Situação'],...r.rows.filter(x=>pcpFilter==='todos'||x.status===pcpFilter).map(x=>[x.id,x.model,x.client,x.priority,x.due||'',x.estimated||'',x.remaining,x.status])];download('HLGB-PCP-FICTICIO.csv','\uFEFF'+rows.map(x=>x.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');}catch(err){status(err.message,'error')}return;}
 if(e.target.closest('#finance-report-export')){try{const r=window.HLGBLabFinanceV1.report(doc,financeFilters);const rows=[['Título','Descrição','Categoria','Tipo','Valor centavos','Data','Estado','Conferência'],...r.rows.map(x=>[x.id,x.description,x.category,x.kind,x.amountCents,x.date||'Sem data',x.status,x.reconciliation])];download('HLGB-HUB-FICTICIO.csv','\uFEFF'+rows.map(x=>x.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');}catch(err){status(err.message,'error')}return;}
 const searchOpen=e.target.closest('[data-search-open]');if(searchOpen){openGlobalResult(Number(searchOpen.dataset.searchOpen));return}
 const searchPage=e.target.closest('[data-search-page]');if(searchPage){searchState.page+=Number(searchPage.dataset.searchPage);renderGlobalSearch();return}
 if(e.target.closest('#global-search-close')){searchState.selected=null;renderGlobalDetail();$('module-content').querySelectorAll('.search-hit').forEach(x=>x.classList.remove('search-hit'));return}

 const receiptButton=e.target.closest('[data-receipt-download]');
 if(receiptButton){
  try{
   const r=(doc?.paymentReceipts||[]).find(x=>x.id===receiptButton.dataset.receiptDownload);
   if(!r)throw Error('Comprovante não encontrado na cópia local.');
   const service=window.HLGBLabPaymentBatchV1,file=service.decodePdf(r.contentBase64);
   if(file.size!==r.size||file.checksum!==r.checksum)throw Error('Arquivo divergente; não baixar.');
   download(r.id+'-FICTICIO-'+r.fileName,file.bytes,'application/pdf');
   status('Download local solicitado · '+r.id+' · versão '+r.version+'.');
  }catch(error){status(error.message,'error')}
  return;
 }
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
 if(e.target.closest('[data-preview-faction]')){
  const form=e.target.closest('form[data-command="finance.faction.close"]');
  try{
   if(!form)throw Error('Formulário de fechamento da facção indisponível.');
   const input=parseData('finance.faction.close',form);
   const result=window.HLGBLabPaymentBatchV1.previewFaction(doc,input);
   status('Prévia de '+result.factionName+': '+result.count+' título(s), '+fmt(result.totalCents)+
    '. Referência '+result.reference+'. Nenhum pagamento lançado.');
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
 if(mod){searchState.selected=null;active=mod.dataset.module;window.location.hash=active;draw();window.scrollTo(0,0);return}
 const goto=e.target.closest('button[data-goto]');
 if(goto){searchState.selected=null;active=goto.dataset.goto;window.location.hash=active;draw();window.scrollTo(0,0)}
});
document.addEventListener('submit',e=>{
 const form=e.target.closest('form[data-command]');if(!form)return;
 e.preventDefault();submit(form,form.dataset.command);
});
window.addEventListener('hashchange',()=>{
 const next=window.location.hash.slice(1);
 if(ids.has(next)&&doc&&next!==active){searchState.selected=null;active=next;draw()}
});
$('global-search-module').addEventListener('change',()=>{searchState.page=1;searchState.selected=null;renderGlobalSearch();renderGlobalDetail()});
$('export-json').addEventListener('click',exportReport);
$('export-csv').addEventListener('click',exportCsv);
$('refresh').addEventListener('click',reload);
$('reset').addEventListener('click',reset);
(async()=>{
 try{
  if(remoteLab){doc=await remoteLab.init();$('reset').disabled=true;draw();status('Laboratório compartilhado iniciado · banco fictício.','success');return;}
  db=await openDB();
  await transact(()=>null);
  doc=await read();
  if(!doc)throw Error('Não foi possível iniciar a base fictícia.');
  if(!api.inspect(doc).ok)throw Error('Documento inicial inconsistente.');
  recoveryIntents=await intentRead();
  draw();status('Prévia iniciada. Faça suas operações com dados fictícios e confira as revisões.','success');
 }catch(err){
  status('Não foi possível abrir o armazenamento de teste neste navegador: '+err.message+
   '. Experimente pelo Chrome ou por uma URL HTTPS. Nenhum dado real foi acessado.','error');
 }
})();
})();
