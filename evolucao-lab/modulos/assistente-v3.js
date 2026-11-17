/* Assistente 3.0: consultas determinísticas, somente leitura e evidências locais. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabAssistantV3=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const sum=(rows,f)=>rows.reduce((n,x)=>n+f(x),0);
 const brl=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const topics=[
 ['prioridades','O que devo priorizar?', 'nucleo'],
 ['pedidos','Quais pedidos estão atrasados ou em risco?', 'producao'],
 ['faccoes','Quais facções têm peças pendentes?', 'faccoes'],
 ['financeiro','Quanto tenho a pagar e receber?', 'hub'],
 ['caixa','Quanto foi pago e recebido no período?', 'hub'],
 ['estoque','Quais materiais estão abaixo do limite?', 'estoque'],
 ['producao','Quantas peças foram produzidas no período?', 'relatorios'],
 ['auditoria','Quais erros precisam de atenção?', 'auditor'],
 ['aprendizado','Quais falhas são recorrentes?', 'bot'],
 ['pedido','Consultar pedido por ID ou nome do modelo', 'pedidos']
 ];
 function classify(q){const v=norm(q);if(!v)return 'prioridades';
 // Nunca interpretar operações de escrita como autorização para executá-las.
 if(/\b(exclua|excluir|apague|apagar|delete|pague|quite|altere|alterar|transfira|transfere|corrija|corrigir|lance|lancar|salve|salvar|remova|remover|execute|executar|ignore|invente)\b/.test(v))return 'unsupported_write';
 if(/\b(lucro|rentabilidade|margem|dre|saldo bancario|extrato bancario real|previsao de lucro)\b/.test(v))return 'unsupported_cost';
 if(/\bped-\d+\b/.test(v))return 'pedido';
 const rules=[['prioridades',/\b(priorizar|prioridade|urgente|atencao|comecar)\b/],['aprendizado',/\b(recorrentes?|recorrencia|persistentes?|aprendizado|bot)\b/],['auditoria',/\b(erros?|falhas?|auditor|auditoria|integridade)\b/],['faccoes',/\b(faccoes?|faccao|costureiras?|oficinas?)\b/],['caixa',/\b(pago|pagos|recebido|recebidos|recebi|paguei|caixa|receitas|despesas)\b/],['financeiro',/\b(pagar|receber|titulos?|financeiro|vencid[oa]s?)\b/],['estoque',/\b(estoque|materiais|insumos|malha|renda|tule)\b/],['pedidos',/\b(atrasad[oa]s?|atraso|prazo|gargalo|risco|entrega)\b/],['producao',/\b(producao|produzidas?|cortadas?|expedidas?|separadas?)\b/]];
 const matched=rules.filter(([,r])=>r.test(v));if(matched.length>1)return 'ambiguous';if(matched.length)return matched[0][0];return 'unknown';}
 function ask(s,d,{question='',topic='auto',reference='',from='2026-11-01',to='2026-11-30',asOf='2026-11-17',stockLimitGrams=5000}={}){
 if(s?.schema!=='hlgb-evolucao-operacao-ficticia-v1')throw Error('Documento fora do laboratório.');
 if(!validDate(from)||!validDate(to)||from>to||!validDate(asOf)||!Number.isSafeInteger(stockLimitGrams)||stockLimitGrams<0)throw Error('Filtros inválidos.');
 const chosen=topic==='auto'?classify(question):topic;
 const result={schema:'hlgb-lab-assistente-v3',revision:s.revision,environment:'ficticio',readOnly:true,topic:chosen,question,from,to,asOf,summary:[],rows:[],warnings:[],module:'bot',sources:[],status:'ok'};
 const warn=x=>result.warnings.push(x),metric=(label,value)=>result.summary.push({label,value}),row=(id,label,detail,module)=>result.rows.push({id,label,detail,module});
 const load=(key,fn)=>{try{if(typeof fn!=='function')throw Error('Módulo ausente');const a=fn();if(!a)throw Error('Resultado vazio');return a;}catch(e){warn(key+': consulta indisponível · '+e.message);result.status='partial';return null;}};
 const audit=load('Auditor',()=>d.audit.analyze(s));if(audit){result.sources.push('Auditor 3.0');if(audit.revision!==s.revision)throw Error('Auditoria desatualizada.');if(audit.bySeverity.critica)warn('Existem '+audit.bySeverity.critica+' alertas críticos. Não use números afetados para autorizar pagamentos ou baixas.');if(audit.status==='cobertura_parcial')warn('Cobertura de auditoria parcial.');}
 else warn('Integridade não confirmada.');
 const financial=()=>{result.sources.push('Hub Financeiro / títulos');return load('Financeiro',()=>d.finance.report(s,{from,to,asOf}));};
 const production=()=>{result.sources.push('PCP / pedidos e facções');return load('PCP',()=>d.pcp.report(s,{asOf}));};
 const blocked=modules=>!audit||audit.checks.some(x=>x.status==='erro_de_verificacao')||audit.findings.some(x=>x.severity==='critica'&&(modules.includes(x.module)||x.module==='nucleo'||x.module==='auditor'));
 const guard=modules=>{if(!blocked(modules))return true;warn('Indicadores desta área bloqueados por integridade não confirmada. Confira o Auditor.');result.status='blocked';return false;};
 const titleRows=rows=>rows.forEach(x=>row(x.id,x.description,brl(x.amountCents)+' · '+x.kind+' · '+(x.date||'Sem data')+' · '+x.status,'hub'));
 if(chosen==='unsupported_write'){result.status='unsupported';warn('O Assistente é somente consulta. Nenhum pagamento, alteração ou exclusão é executado.');return result;}
 if(chosen==='unsupported_cost'){result.status='unsupported';warn('Lucro, margem e saldo bancário real ainda não podem ser apurados com segurança: custos históricos, rateios e saldo inicial não foram homologados.');return result;}
 if(chosen==='ambiguous'||chosen==='unknown'){result.status='unsupported';warn('Selecione uma consulta específica. O texto não foi interpretado com segurança.');return result;}
 result.module=topics.find(x=>x[0]===chosen)?.[2]||'bot';
 switch(chosen){
 case 'prioridades':{
 if(audit){metric('Alertas críticos',audit.bySeverity.critica);metric('Alertas altos',audit.bySeverity.alta);audit.findings.slice(0,10).forEach(x=>row(x.recordId,x.severity+' · '+x.code,x.action,x.module));}
 if(guard(['producao','pedidos','faccoes','estoque'])){const p=production();if(p){metric('Pedidos atrasados',p.late);metric('Pedidos em risco',p.risk);p.rows.filter(x=>['Atrasado','Risco de atraso'].includes(x.status)).slice(0,10).forEach(x=>row(x.id,x.model,x.status+' · prazo '+x.due,'producao'));}}
 if(guard(['hub','acertos','compras'])){const f=financial();if(f){metric('Contas vencidas a pagar',brl(f.overdue.pagar));metric('Contas vencidas a receber',brl(f.overdue.receber));}}
 break;}
 case 'pedidos':case 'faccoes':case 'pedido':{
 if(!guard(['producao','pedidos','faccoes','estoque']))break;const p=production();if(!p)break;
 if(chosen==='pedidos'){metric('Pedidos atrasados',p.late);metric('Em risco estimado',p.risk);metric('Peças a expedir',p.remaining);metric('Gargalo estimado',p.bottleneck||'Sem carga');p.rows.filter(x=>x.remaining>0).forEach(x=>row(x.id,x.model,x.status+' · '+x.remaining+' peças · prazo '+(x.due||'não informado')+' · previsão '+(x.estimated||'—'),'producao'));warn('Previsões conservadoras em dias corridos; não são garantia de entrega.');}
 else if(chosen==='faccoes'){metric('Peças pendentes',sum(p.factions,x=>x.pending));p.factions.slice().sort((a,b)=>b.pending-a.pending).forEach(x=>row(x.id,x.name,x.pending+' pendentes · '+x.returned+' retornadas de '+x.sent+' enviadas','faccoes'));warn('Volume acumulado, não produtividade por hora.');}
 else {const id=norm(reference||question).match(/\bped-\d+\b/)?.[0],query=norm(reference);if(!id&&!query){warn('Informe ID do pedido ou nome do modelo.');result.status='unsupported';break;}const found=p.rows.filter(x=>id?norm(x.id)===id:norm(x.model).includes(query));metric('Pedidos encontrados',found.length);found.forEach(x=>row(x.id,x.model,x.client+' · '+x.ordered+' pedidas · '+x.shipped+' expedidas · '+x.remaining+' pendentes · '+x.status,'pedidos'));}break;}
 case 'financeiro':case 'caixa':{
 if(!guard(['hub','acertos','compras']))break;const f=financial();if(!f)break;
 if(chosen==='financeiro'){metric('Total aberto a pagar',brl(f.open.pagar));metric('Total aberto a receber',brl(f.open.receber));metric('A pagar vencido',brl(f.overdue.pagar));metric('A receber vencido',brl(f.overdue.receber));titleRows(arr(s,'finance').filter(x=>x.status==='aberto').map(x=>({...x,date:x.dueDate||null})));warn('Saldo em aberto e vencidos são globais; vencimento comparado à data de referência.');}
 else{metric('Recebido no período',brl(f.actual.receber));metric('Pago no período',brl(f.actual.pagar));metric('Movimento líquido realizado',brl(f.actual.net));metric('Previsão líquida em aberto',brl(f.forecast.net));titleRows(f.rows.filter(x=>x.status==='pago'&&x.date));warn('Movimento líquido não é lucro nem saldo bancário; títulos sem data não entram no período.');}
 metric('Títulos sem data',f.undated.count);break;}
 case 'estoque':{if(!guard(['estoque','compras']))break;result.sources.push('Cadastro de materiais / saldo atual');const m=arr(s,'materials').filter(x=>Number.isSafeInteger(x.stockGrams)&&x.stockGrams<stockLimitGrams).sort((a,b)=>a.stockGrams-b.stockGrams);metric('Materiais abaixo do limite',m.length);metric('Limite de referência',stockLimitGrams+' g');m.forEach(x=>row(x.id,x.name,x.stockGrams+' g disponíveis','estoque'));warn('Limite de consulta, não ponto de reposição calculado por consumo.');break;}
 case 'producao':{if(!guard(['producao','pedidos','relatorios','estoque','faccoes']))break;result.sources.push('Histórico gerencial / eventos datados');const m=load('Relatórios',()=>d.management.report(s,{from,to}));if(!m)break;for(const [k,label] of [['cut','Cortadas'],['returned','Retornadas'],['shipped','Expedidas']])metric(label+' (líquido)',m.totals[k]);metric('Eventos datados',m.datedEvents);m.models.forEach(x=>row(x.productId,x.name,x.cut+' cortadas · '+x.returned+' retornadas · '+x.shipped+' expedidas','relatorios'));warn(m.undated+' eventos sem data e '+m.withoutMetrics+' sem métricas; não são reconstruídos.');break;}
 case 'auditoria':{if(!audit)break;metric('Críticos',audit.bySeverity.critica);metric('Altos',audit.bySeverity.alta);metric('Regras avaliadas',audit.checks.length);audit.findings.forEach(x=>row(x.recordId,x.code,x.severity+' · '+x.evidence+' · '+x.action,x.module));warn('Ausência de alertas nas regras cobertas não certifica todo o programa.');break;}
 case 'aprendizado':{if(!audit)break;result.sources.push('Bot 3.0 / observações');const b=load('Bot',()=>d.bot.analyze(s,audit));if(!b)break;if(b.integrity.length){result.status='blocked';warn('Histórico de aprendizado inconsistente.');break;}metric('Observações',b.observations);metric('Falhas persistentes',b.persistent);b.recurring.forEach(x=>row(x.code,x.code,x.observations+' observações distintas · '+x.active+' ocorrências ativas','bot'));warn('Recorrência depende das observações registradas; não é prova de monitoramento remoto.');break;}
 default:result.status='unsupported';warn('Consulta não disponível.');
 }
 result.totalRows=result.rows.length;return result;
 }
 return {topics,classify,ask};
});
